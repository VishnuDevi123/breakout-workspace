"use client";

import { useState, type ReactNode } from "react";

import { CHALLENGE_KINDS, type ChallengeKind } from "@/lib/challenges";
import { formatClock, useRemainingSec } from "@/lib/round-clock";
import type { ChallengeView } from "@/types/breakout";

import { Button, Card } from "./ui";

/** What each card says before anything runs. */
const BLURBS: Record<ChallengeKind, string> = {
  poll: "One question. Each room talks it over and votes once, together.",
  quiz: "Up to 10 questions with right answers. Each room talks it over and submits once, together.",
};

const KINDS: ChallengeKind[] = ["poll", "quiz"];

/**
 * Poll and quiz, one card each, on the live Session page. A card starts a new
 * one while the round is open. While one runs, its card shows rooms done, time
 * left, Results and Reveal, and the other card waits: one at a time.
 */
export default function ChallengeCards({
  latest,
  open,
  answeringRoomIds,
  onNew,
  onResults,
  onReveal,
}: {
  latest: ChallengeView | null;
  /** The round is running, so a new one can launch. */
  open: boolean;
  /** Rooms with people planned in; empty rooms never answer, so they are not counted. */
  answeringRoomIds: string[];
  onNew: (kind: ChallengeKind) => void;
  onResults: () => void;
  onReveal: () => Promise<void>;
}) {
  const running = latest && !latest.revealed ? latest : null;

  return (
    <div className="bw-challenge-cards">
      {KINDS.map((kind) =>
        running?.kind === kind ? (
          <RunningCard
            key={kind}
            challenge={running}
            answeringRoomIds={answeringRoomIds}
            onResults={onResults}
            onReveal={onReveal}
          />
        ) : (
          <Card key={kind} className="bw-challenge-card">
            <div className="bw-challenge-card__top">
              <span className={`bw-challenge-badge bw-challenge-badge--${kind}`}>{CHALLENGE_KINDS[kind].label}</span>
              {latest?.revealed && latest.kind === kind ? (
                <Button variant="ghost" onClick={onResults}>
                  Last results
                </Button>
              ) : null}
            </div>
            <p className="bw-challenge-card__text">
              {running ? `Reveal the running ${CHALLENGE_KINDS[running.kind].label.toLowerCase()} first.` : BLURBS[kind]}
            </p>
            <ClosedHint
              id={`bw-closed-hint-${kind}`}
              hint={open ? null : `A new ${CHALLENGE_KINDS[kind].label.toLowerCase()} cannot be launched while no round is running.`}
            >
              <Button
                variant="secondary"
                size="sm"
                disabled={!open || running !== null}
                aria-describedby={open ? undefined : `bw-closed-hint-${kind}`}
                onClick={() => onNew(kind)}
              >
                New {CHALLENGE_KINDS[kind].label.toLowerCase()}
              </Button>
            </ClosedHint>
          </Card>
        ),
      )}
    </div>
  );
}

/**
 * Holds the card's button and, while the round is closed, the reason it is off, shown on hover.
 * The wrapper takes the hover: a disabled button gets no pointer events in every browser.
 */
function ClosedHint({ id, hint, children }: { id: string; hint: string | null; children: ReactNode }) {
  return (
    <span className="bw-challenge-card__action">
      {children}
      {hint ? (
        <span id={id} role="tooltip" className="bw-hover-hint">
          {hint}
        </span>
      ) : null}
    </span>
  );
}

/** The running poll or quiz: how many rooms are done, time left, Results and Reveal. */
function RunningCard({
  challenge,
  answeringRoomIds,
  onResults,
  onReveal,
}: {
  challenge: ChallengeView;
  answeringRoomIds: string[];
  onResults: () => void;
  onReveal: () => Promise<void>;
}) {
  const [revealing, setRevealing] = useState(false);
  const remainingSec = useRemainingSec(challenge.endsAt);
  const done = (challenge.results?.rooms ?? []).filter(
    (room) => room.finishedAt !== null && answeringRoomIds.includes(room.roomId),
  ).length;
  const total = answeringRoomIds.length;

  return (
    <Card className="bw-challenge-card bw-challenge-card--running bw-swap-in">
      <div className="bw-challenge-card__top">
        <span className={`bw-challenge-badge bw-challenge-badge--${challenge.kind}`}>
          {CHALLENGE_KINDS[challenge.kind].label}
        </span>
        <span className="bw-challenge-card__clock bw-mono">
          {remainingSec ? formatClock(remainingSec) : "Time's up"}
        </span>
      </div>
      <span className="bw-challenge-card__title" title={challenge.title}>{challenge.title}</span>
      <div className="bw-challenge-card__meter" aria-hidden="true">
        <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <span className="bw-challenge-card__text">
        {done} of {total} {total === 1 ? "room" : "rooms"} done
      </span>
      <div className="bw-challenge-card__actions">
        <Button variant="secondary" size="sm" onClick={onResults}>
          Results
        </Button>
        <Button
          size="sm"
          busy={revealing}
          onClick={async () => {
            setRevealing(true);
            await onReveal();
            setRevealing(false);
          }}
        >
          Reveal now
        </Button>
      </div>
    </Card>
  );
}
