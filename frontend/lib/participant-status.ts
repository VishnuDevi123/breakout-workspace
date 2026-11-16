import type { LiveState, MeetingRole, PlannedRoom } from "@/types/breakout";

/** Where a participant is from the draft editor's point of view. */
export type ParticipantStatus = "in-room" | "unassigned" | "left";

/** Roster row the draft editor renders; built from LiveState by the host workspace. */
export interface Participant {
  participantUUID: string;
  /** False when this row has only an observation key and cannot be saved safely. */
  assignmentEligible: boolean;
  displayName: string;
  /** Uppercase initials rendered in the avatar chip. */
  initials: string;
  status: ParticipantStatus;
  /** Internal id of the room the person sits in, or null when unassigned. */
  roomId: string | null;
  role: MeetingRole;
}

/** " · host" or " · co-host" after a name; nothing for an attendee. */
export function roleSuffix(role: MeetingRole): string {
  return role === "host" ? " · host" : role === "coHost" ? " · co-host" : "";
}

/** "Ada Lovelace" -> "AL". Falls back to the first character for single words. */
export function initialsFrom(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? [words[0][0]] : [words[0][0], words.at(-1)![0]];
  return letters.join("").toUpperCase();
}

/** Live Zoom fact shown beside somebody already placed in the round draft. */
export const DRAFT_MEMBER_STATUS_LABEL: Record<ParticipantStatus, string> = {
  "in-room": "planned · in room",
  unassigned: "planned · in main",
  left: "planned · left meeting",
};

/**
 * Each person's pill colours: a light background with darker text of the same hue.
 * Light backgrounds only, so initials read on every screen and over every tint.
 */
const PERSON_TINTS = [
  { background: "#e0e7ff", color: "#4338ca" },
  { background: "#ccfbf1", color: "#0f766e" },
  { background: "#fce7f3", color: "#be185d" },
  { background: "#ffedd5", color: "#c2410c" },
  { background: "#dcfce7", color: "#15803d" },
  { background: "#f3e8ff", color: "#7e22ce" },
  { background: "#dbeafe", color: "#1d4ed8" },
  { background: "#ffe4e6", color: "#be123c" },
  { background: "#fef3c7", color: "#b45309" },
] as const;

/**
 * One pill colour per person, picked from their participantUUID, so the same person has
 * the same colour on every screen, for the host and for every participant.
 */
export function personTint(participantUUID: string): { background: string; color: string } {
  let hash = 0;
  for (const char of participantUUID) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PERSON_TINTS[hash % PERSON_TINTS.length];
}

/**
 * The people a participant shares a breakout room with, from the host's draft.
 * Once Zoom has reported which breakout room this is, only members actually in
 * it are kept, plus anyone webhooks report inside it whom the caller's copy of
 * the draft does not list yet: the host can place people mid-round, and the
 * caller only re-reads the draft when their own location changes.
 * Names come from the webhook-fed live store; the caller is "You", with their own
 * name kept in `fullName` for their initials.
 */
export function roomMembers({
  room,
  live,
  participantUUID,
}: {
  room: PlannedRoom;
  live: LiveState | null;
  participantUUID: string;
}): { participantUUID: string; name: string; fullName: string }[] {
  const roomUUID = live?.round?.roomUUIDs[room.id] ?? null;
  const known = new Map((live?.participants ?? []).map((p) => [p.participantUUID, p]));
  const placedLater = (live?.participants ?? [])
    .filter((p) => roomUUID && p.location === roomUUID && !room.participantUUIDs.includes(p.participantUUID))
    .map((p) => p.participantUUID);
  return [...room.participantUUIDs, ...placedLater]
    .filter((uuid) => uuid === participantUUID || !roomUUID || known.get(uuid)?.location === roomUUID)
    .map((uuid) => {
      const fullName = known.get(uuid)?.name || "Participant";
      return { participantUUID: uuid, name: uuid === participantUUID ? "You" : fullName, fullName };
    });
}
