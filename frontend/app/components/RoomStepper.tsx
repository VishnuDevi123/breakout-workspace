"use client";

import type { PlannedRoom } from "@/types/breakout";

import { StatusDot } from "./ui";

/** ‹ [dot] Room N of M ›: steps to the room before or after. The ends disable their button. */
export default function RoomStepper({
  room,
  position,
  roomCount,
  onStep,
}: {
  room: PlannedRoom;
  /** Zero-based place of this room in the round. */
  position: number;
  roomCount: number;
  /** -1 for the room before, 1 for the one after. */
  onStep: (step: -1 | 1) => void;
}) {
  return (
    <div className="bw-room-nav__pager">
      <button
        type="button"
        className="bw-room-nav__step"
        aria-label="Previous room"
        disabled={position <= 0}
        onClick={() => onStep(-1)}
      >
        ‹
      </button>
      <StatusDot color={room.dot} />
      <span className="bw-room-nav__name" title={room.name}>
        {room.name}
      </span>
      <span className="bw-room-nav__of">of {roomCount}</span>
      <button
        type="button"
        className="bw-room-nav__step"
        aria-label="Next room"
        disabled={position >= roomCount - 1}
        onClick={() => onStep(1)}
      >
        ›
      </button>
    </div>
  );
}
