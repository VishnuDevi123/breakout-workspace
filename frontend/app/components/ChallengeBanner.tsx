"use client";

import { formatClock, useRemainingSec } from "@/lib/round-clock";
import type { ChallengeView } from "@/types/breakout";

import { Button, StatusDot } from "./ui";

const TEXT: Record<
  ChallengeView["kind"],
  { badge: string; hint: string; action: string; done: string }
> = {
  poll: {
    badge: "Live poll from your host",
    hint: "Your room votes once, together.",
    action: "Vote now",
    done: "Poll submitted",
  },
  quiz: {
    badge: "Live quiz from your host",
    hint: "Your room answers together.",
    action: "Start quiz",
    done: "Quiz submitted",
  },
};

/**
 * The host's running poll or quiz across the top of the room page: the question,
 * the time left and the way in. Once the room has locked every question it shrinks
 * to one line; it is gone when the time runs out.
 */
export default function ChallengeBanner({
  challenge,
  onOpen,
}: {
  challenge: ChallengeView;
  onOpen: () => void;
}) {
  const remainingSec = useRemainingSec(challenge.endsAt);
  if (remainingSec === 0) return null;

  const text = TEXT[challenge.kind];
  const submitted = Boolean(
    challenge.room?.locks.every((lock) => lock !== null),
  );
  const className = `bw-live-banner bw-live-banner--${challenge.kind}`;

  // The wrapper opens the space slowly on launch (keyed by challenge, so once each);
  // the slim line after the room submits fades in place.
  if (submitted) {
    return (
      <div className="bw-live-reveal">
        <div
          className={`${className} bw-live-banner--done bw-swap-in`}
          role="status"
        >
          <span className="bw-live-banner__tick" aria-hidden>
            ✓
          </span>
          <span className="bw-live-banner__done">
            {text.done} · waiting for results
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bw-live-reveal">
      <section className={className} aria-label={text.badge}>
        <div className="bw-live-banner__text">
          <span className="bw-live-banner__badge">
            {/* The host's Live dot, pulsing the same way. */}
            <StatusDot
              color="var(--bw-red)"
              round
              pulse
              className="bw-live-banner__dot"
            />
            {text.badge}
          </span>
          <span className="bw-live-banner__title" title={challenge.title}>
            {challenge.title}
          </span>
          <span className="bw-live-banner__hint">{text.hint}</span>
        </div>
        {remainingSec !== null ? (
          <div className="bw-live-banner__clock">
            <span className="bw-live-banner__time">
              {formatClock(remainingSec)}
            </span>
            <span className="bw-live-banner__left">
              left to {challenge.kind === "poll" ? "vote" : "answer"}
            </span>
          </div>
        ) : null}
        <Button className="bw-live-banner__action" onClick={onOpen}>
          {text.action} ›
        </Button>
      </section>
    </div>
  );
}
