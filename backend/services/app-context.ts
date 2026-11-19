import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import type { MeetingRole } from "../types/breakout.ts";
import { personOf } from "../store/live.ts";
import { HttpError } from "./http-error.ts";

/** The decrypted X-Zoom-App-Context payload; only the fields we use are typed. */
interface AppContext {
  /** Zoom user id; absent for guests, who get `iid` instead. */
  uid?: string;
  iid?: string;
  exp: number;
  ts: number;
  typ: string;
  /** The main meeting's UUID, also inside a breakout room (verified 2026-11-04). */
  mid?: string;
  /** "host", "co-host" or "participant". Not in Zoom's docs; verified 2026-11-04. */
  attendrole?: string;
  /** The app's client id. */
  aud?: string;
}

/** One Zoom app's credentials: the client id the token names in `aud`, and the secret that seals it. */
interface ZoomApp {
  clientId: string;
  secret: string;
}

/**
 * The apps whose tokens this server accepts. Zoom gives the published app (production) and
 * the build page's test app (development) different client ids and secrets, and both can
 * open the same deployment. Read per call, not at import: server.ts loads .env after its imports.
 */
function zoomApps(): ZoomApp[] {
  const apps = [
    { clientId: process.env.ZOOM_CLIENT_ID, secret: process.env.ZOOM_CLIENT_SECRET },
    { clientId: process.env.ZOOM_DEV_CLIENT_ID, secret: process.env.ZOOM_DEV_CLIENT_SECRET },
  ].filter((app): app is ZoomApp => Boolean(app.clientId && app.secret));
  if (apps.length === 0) throw new Error("ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET are not set.");
  return apps;
}

/**
 * Decrypts the token from `getAppContext()` / the X-Zoom-App-Context header with one app's secret.
 * Layout and algorithm from Zoom's docs (developers.zoom.us/docs/zoom-apps/zoom-app-context):
 * AES-256-GCM with key = sha256(client secret). Null when this secret did not seal the token.
 */
function decryptWith(token: string, secret: string): AppContext | null {
  try {
    const buf = Buffer.from(token, "base64");
    const ivLength = buf.readUInt8(0);
    const iv = buf.subarray(1, 1 + ivLength);
    const aadLength = buf.readUInt16LE(1 + ivLength);
    const aadStart = 3 + ivLength;
    const aad = buf.subarray(aadStart, aadStart + aadLength);
    const cipherLength = buf.readUInt32LE(aadStart + aadLength);
    const cipherStart = aadStart + aadLength + 4;
    const cipherText = buf.subarray(cipherStart, cipherStart + cipherLength);
    const tag = buf.subarray(cipherStart + cipherLength);

    const key = crypto.createHash("sha256").update(secret).digest();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(cipherText), decipher.final()]).toString("utf8");
    return JSON.parse(json) as AppContext;
  } catch {
    // A wrong secret, a cut token or a tampered one all fail the GCM tag check here.
    return null;
  }
}

/**
 * Tries each accepted app's secret. A token that opens was sealed by Zoom for that app,
 * and its `aud` must be that app's client id.
 */
function decryptAppContext(token: string): AppContext {
  for (const app of zoomApps()) {
    const context = decryptWith(token, app.secret);
    if (!context) continue;
    if (context.aud !== app.clientId) throw new HttpError("Zoom app context is for another app.", 401);
    return context;
  }
  throw new HttpError("Zoom app context could not be read.", 401);
}

/** Decrypt and check exp: a token that passes is Zoom's and still current. */
function currentAppContext(header: string | undefined): AppContext {
  if (!header) throw new HttpError("Missing Zoom app context.", 401);

  const context = decryptAppContext(header);
  // Without a numeric exp the check below would compare NaN and let the token through.
  if (typeof context.exp !== "number") throw new HttpError("Zoom app context has no expiry.", 401);
  // Zoom documents exp only as a "long": treat 10-digit values as seconds, 13-digit as milliseconds.
  const expiresAtMs = context.exp < 1e12 ? context.exp * 1000 : context.exp;
  if (expiresAtMs <= Date.now()) throw new HttpError("Zoom app context expired.", 401);
  return context;
}

/** The template owner for one request: decrypt, check exp, require uid. */
export function ownerUidFrom(header: string | undefined): string {
  const context = currentAppContext(header);
  if (!context.uid) throw new HttpError("Sign in to Zoom to save templates.", 403);

  return context.uid;
}

/** Who sent a request, as Zoom sealed it in the token. */
export interface Caller {
  meetingUUID: string;
  role: MeetingRole;
  uid: string;
  /** Token creation time (ms), checked against the caller's last role change. */
  issuedAt: number;
}

const ROLES: Record<string, MeetingRole> = { host: "host", "co-host": "coHost", participant: "attendee" };

export function callerFrom(header: string | undefined): Caller {
  const context = currentAppContext(header);
  if (!context.mid) throw new HttpError("Open the app inside a Zoom meeting.", 403);
  // The beta admits signed-in users only; guests carry iid and no uid.
  if (!context.uid) throw new HttpError("Sign in to Zoom to use this app.", 403);
  const role = ROLES[context.attendrole ?? ""];
  if (!role) throw new HttpError("This Zoom role cannot use the app.", 403);

  return { meetingUUID: context.mid, role, uid: context.uid, issuedAt: context.ts };
}

const ROLE_REFUSALS: Record<string, string> = {
  host: "Only the host can do this.",
  "host,coHost": "Only the host or a co-host can do this.",
};

// Routes read the checked caller as res.locals.caller.
declare global {
  namespace Express {
    interface Locals {
      caller: Caller;
    }
  }
}

/**
 * Route guard: the token must be current, from this meeting, and carry one of
 * `roles`. Every meeting id the request names (body or query) must be the token's,
 * so a request cannot pass with one meeting and act on another, and a
 * participantUUID it names must be one the caller joined with. Puts the caller
 * on `res.locals.caller`; routes use its `meetingUUID` as the meeting.
 */
// Generic over route params, so a guard in front of a handler keeps the handler's typed req.params.
type Guard = <Params>(req: Request<Params>, res: Response, next: NextFunction) => Promise<void>;

export function requireCaller(...roles: MeetingRole[]): Guard {
  return async (req, res, next) => {
    const caller = callerFrom(req.get("X-Zoom-App-Context"));
    const named = [req.body?.parentUUID, req.query.parentUUID].filter((value) => value !== undefined);
    if (named.length === 0) throw new HttpError("parentUUID is required.", 400);
    if (named.some((value) => value !== caller.meetingUUID)) {
      throw new HttpError("This request is for another meeting.", 403);
    }
    if (!roles.includes(caller.role)) {
      throw new HttpError(ROLE_REFUSALS[roles.join(",")] ?? "Your role cannot do this.", 403);
    }
    // Who the caller is in this meeting, from webhooks keyed by the token's uid.
    const person = await personOf(caller.meetingUUID, caller.uid);
    // A token made before the caller's last role change may carry the old role; the app reads a fresh one on 401.
    if (caller.issuedAt < (person?.roleChangedAt ?? 0)) throw new HttpError("Your role changed. Try again.", 401);
    const participantUUID: unknown = req.body?.participantUUID ?? req.query.participantUUID;
    if (participantUUID !== undefined && !person?.participantUUIDs.includes(String(participantUUID))) {
      throw new HttpError("This request names someone else.", 403);
    }

    res.locals.caller = caller;
    next();
  };
}

export const hostOnly = requireCaller("host");
export const hostOrCoHost = requireCaller("host", "coHost");
export const anyoneInMeeting = requireCaller("host", "coHost", "attendee");
