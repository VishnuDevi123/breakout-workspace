"use client";

import { useState } from "react";

import { formatClock } from "@/lib/round-clock";
import { MAX_ROOMS, type RoundMeta, type RoundPlan } from "@/types/breakout";

import type { Grouping } from "./screens/RoundsOverview";
import { Button, EditableName, Modal, Pill, SectionLabel } from "./ui";

const DURATION_STEP_SEC = 30;
const MIN_DURATION_SEC = 30;

/**
 * One upcoming round, changed from the live page: name, time, room count and
 * whether it is skipped. "Same groups" copies the last round's groups at launch,
 * so its rooms are not changed here. People are settled at launch.
 */
export default function RoundSettingsModal({
  round,
  position,
  plan,
  grouping,
  zoomBusy,
  onUpdateRound,
  onSkipRound,
  onRoomCount,
  onClose,
}: {
  round: RoundMeta;
  /** 1-based place in the session, for the "Round N" fallback name. */
  position: number;
  plan: RoundPlan | null;
  grouping: Grouping;
  /** A Zoom launch or close is running; rooms cannot change until it ends. */
  zoomBusy: boolean;
  onUpdateRound: (roundId: string, patch: Partial<Pick<RoundMeta, "title" | "durationSec">>) => Promise<void>;
  onSkipRound: (roundId: string, skipped: boolean) => Promise<void>;
  /** Resolves false when the change was not saved; reports its own errors. */
  onRoomCount: (count: number) => Promise<boolean>;
  onClose: () => void;
}) {
  const [skipping, setSkipping] = useState(false);
  const skipped = round.status === "skipped";
  const savedRooms = plan?.rooms.length ?? 0;
  // The count just asked for, shown until the saved plan catches up (or the save fails).
  const [pendingRooms, setPendingRooms] = useState<number | null>(null);
  const [savingRooms, setSavingRooms] = useState(false);
  if (pendingRooms !== null && !savingRooms && pendingRooms === savedRooms) setPendingRooms(null);
  const roomCount = pendingRooms ?? savedRooms;

  async function changeRooms(count: number) {
    setPendingRooms(count);
    setSavingRooms(true);
    if (!(await onRoomCount(count))) setPendingRooms(null);
    setSavingRooms(false);
  }

  async function toggleSkipped() {
    setSkipping(true);
    await onSkipRound(round.roundId, !skipped);
    setSkipping(false);
  }

  return (
    <Modal label={`Round ${position} settings`} locked={skipping} onClose={onClose}>
      {(close) => (
        <>
          <header className="bw-overlay__header">
            <EditableName
              value={round.title}
              placeholder={`Round ${position}`}
              className="bw-round-settings__name"
              onSave={(title) => void onUpdateRound(round.roundId, { title })}
            />
            <div className="bw-header-spacer" />
            <Pill tone={skipped ? "amber" : "neutral"}>{skipped ? "Skipped" : "Planned"}</Pill>
          </header>

          <div className="bw-overlay__body">
            <div className="bw-field">
              <SectionLabel>Time</SectionLabel>
              <div className="bw-stepper bw-stepper--inline">
                <button
                  type="button"
                  aria-label="Shorter"
                  disabled={round.durationSec <= MIN_DURATION_SEC}
                  onClick={() => void onUpdateRound(round.roundId, { durationSec: round.durationSec - DURATION_STEP_SEC })}
                >
                  −
                </button>
                <span className="bw-room-count bw-mono">{formatClock(round.durationSec)}</span>
                <button
                  type="button"
                  aria-label="Longer"
                  onClick={() => void onUpdateRound(round.roundId, { durationSec: round.durationSec + DURATION_STEP_SEC })}
                >
                  +
                </button>
              </div>
            </div>

            <div className="bw-field">
              <SectionLabel>Rooms</SectionLabel>
              {grouping === "same" ? (
                <span className="bw-round-settings__rooms">Same groups as the round before</span>
              ) : (
                <>
                  <div className="bw-stepper bw-stepper--inline">
                    <button
                      type="button"
                      aria-label="Fewer rooms"
                      disabled={roomCount <= 1 || savingRooms || zoomBusy}
                      onClick={() => void changeRooms(roomCount - 1)}
                    >
                      −
                    </button>
                    <span className="bw-room-count">
                      {roomCount} {roomCount === 1 ? "room" : "rooms"}
                    </span>
                    <button
                      type="button"
                      aria-label="More rooms"
                      disabled={roomCount >= MAX_ROOMS || savingRooms || zoomBusy}
                      onClick={() => void changeRooms(roomCount + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className="bw-round-settings__hint">
                    {grouping === "new"
                      ? "Changes this round and the rounds after it. Everyone here is mixed again."
                      : "Changes this round only. People in a removed room go back to Not yet placed."}
                  </span>
                </>
              )}
            </div>
          </div>

          <footer className="bw-overlay__footer">
            <Button variant="secondary" size="sm" busy={skipping} onClick={() => void toggleSkipped()}>
              {skipped ? "Put this round back" : "Skip this round"}
            </Button>
            <Button size="sm" disabled={skipping} onClick={close}>
              Done
            </Button>
          </footer>
        </>
      )}
    </Modal>
  );
}
