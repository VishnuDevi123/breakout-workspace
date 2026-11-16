"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { setRoomStatus } from "@/lib/execution-api";
import type { LiveState, RoomStatus } from "@/types/breakout";

/**
 * The room's status as the host sees it, and one tap to change it. The value
 * comes from the live state, so every person in the room sees the same choice;
 * a tap's new state arrives back over SSE.
 */
export function useRoomStatus({
  live,
  roomId,
  participantUUID,
}: {
  live: LiveState | null;
  roomId: string;
  participantUUID: string;
}): { current: RoomStatus; choose: (status: RoomStatus) => Promise<boolean> } {
  const round = live?.round ?? null;
  const current: RoomStatus = round?.roomStatus[roomId] ?? "onTrack";
  // The latest status, for a call kept from an earlier render (a toast's Undo).
  const latest = useRef(current);
  useEffect(() => {
    latest.current = current;
  });

  /** True once the server has the new status. */
  async function choose(status: RoomStatus): Promise<boolean> {
    if (!live || !round || status === latest.current) return false;
    try {
      await setRoomStatus({ parentUUID: live.parentUUID, roundId: round.roundId, roomId, participantUUID, status });
      // The server has it before the stream says so; an Undo right away must see it.
      latest.current = status;
      return true;
    } catch (error) {
      toast.error("Could not update the room status.", {
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    }
  }

  return { current, choose };
}
