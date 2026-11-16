import { renameInResponses } from "./activity_responses.ts";
import { renameInChallenges } from "./challenges.ts";
import { retireParticipantIds, type Rejoin } from "./live.ts";
import { renameInPlan } from "./round-plans.ts";
import { getWorkspace } from "./workspace.ts";

// Zoom gives a rejoining person a new participantUUID; their Zoom user id stays.
// Everything the meeting filed under the old id moves to the new one, in every
// round, so they keep their rooms and their work. A module of its own because
// the response and challenge stores import the live store.

/** Moves a rejoined person's plans and work to their new id. Safe to run again. */
export async function followRejoin(rejoin: Rejoin): Promise<void> {
  const { parentUUID, retired, participantUUID } = rejoin;
  const rounds = (await getWorkspace(parentUUID))?.rounds ?? [];
  const rooms = new Set<string>();
  for (const { roundId } of rounds) {
    await renameInPlan(parentUUID, roundId, retired, participantUUID);
    for (const roomId of await renameInResponses(parentUUID, roundId, retired, participantUUID)) rooms.add(roomId);
    for (const roomId of await renameInChallenges(parentUUID, roundId, retired, participantUUID)) rooms.add(roomId);
  }
  await retireParticipantIds(rejoin, [...rooms]);
}
