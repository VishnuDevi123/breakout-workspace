import { Router } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import dotenv from "dotenv";
import { deleteAiUsage } from "../services/ai.ts";
import { deleteItems } from "../services/dynamo.ts";
import { applyEvent } from "../store/live.ts";
import { followRejoin } from "../store/rejoin.ts";
import { deleteTemplatesOf } from "../store/templates.ts";

dotenv.config();
const router = Router();

function hmacHex(message: string): string {
  return createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET!).update(message).digest("hex");
}

// Longer than Zoom's last retry (85 minutes after the first try), whose timestamp Zoom's docs do not describe.
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

// A signed request recorded and sent again later is refused. Seconds in Zoom's examples; milliseconds accepted too.
function isRecent(timestamp: string): boolean {
  const value = Number(timestamp);
  const ms = value < 1e12 ? value * 1000 : value;
  return Math.abs(Date.now() - ms) <= MAX_AGE_MS;
}

// Zoom signs every request: x-zm-signature = "v0=" + HMAC-SHA256("v0:{timestamp}:{raw body}").
function signedByZoom(rawBody: Buffer, timestamp: string | undefined, signature: string | undefined): boolean {
  if (!timestamp || !signature || !isRecent(timestamp)) return false;
  const expected = Buffer.from(`v0=${hmacHex(`v0:${timestamp}:${rawBody.toString("utf8")}`)}`);
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

// Mounted with express.raw in server.ts, so req.body is the unparsed Buffer.
router.post("/zoom", async (req, res) => {
  const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!signedByZoom(rawBody, req.get("x-zm-request-timestamp"), req.get("x-zm-signature"))) {
    console.warn("webhook: rejected unsigned request");
    res.sendStatus(401);
    return;
  }

  const event = JSON.parse(rawBody.toString("utf8"));
  if (event.event === "endpoint.url_validation") {
    const plainToken = event.payload.plainToken;
    res.json({ plainToken, encryptedToken: hmacHex(plainToken) });
    return;
  }
  // The event name only: ids and names stay out of the logs.
  console.log("webhook:", event.event);
  // The meeting is over for everyone: its data goes (saved templates stay).
  if (event.event === "meeting.ended" && event.payload?.object?.uuid) {
    await deleteItems(event.payload.object.uuid, "");
  } else if (event.event === "app_deauthorized") {
    // The user removed the app: their own data goes now; meeting data goes with the meeting.
    // Deleted before the 200, so a failure gets a 500 and Zoom sends the event again.
    const uid = event.payload?.user_id;
    if (!uid) {
      console.warn("webhook: app_deauthorized without a user_id, nothing deleted");
    } else {
      await Promise.all([deleteTemplatesOf(String(uid)), deleteAiUsage(String(uid))]);
      console.log("webhook: app_deauthorized, saved templates and AI usage deleted");
    }
  } else {
    // A rejoin's work moves over before the 200, so a failure gets a 500 and Zoom sends it again.
    const rejoin = await applyEvent(event);
    if (rejoin) await followRejoin(rejoin);
  }
  res.sendStatus(200);
});

export default router;
