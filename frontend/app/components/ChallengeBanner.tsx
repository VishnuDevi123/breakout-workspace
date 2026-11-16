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
 * the time left and the way in. Once the room has locked every question it is one
 * slim line ("done"). The room page slides it in and out (LiveReveal).
 */
export default function ChallengeBanner({
  challenge,
  done,
  onOpen,
}: {
  challenge: ChallengeView;
  /** The room has locked every question. */
  done: boolean;
  onOpen: () => void;
}) {
  const remainingSec = useRemainingSec(challenge.endsAt);
  const text = TEXT[challenge.kind];
  const className = `bw-live-banner bw-live-banner--${challenge.kind}`;

  if (done) {
    return (
      <div className={`${className} bw-live-banner--done`} role="status">
        <span className="bw-live-banner__tick" aria-hidden>
          ✓
        </span>
        <span className="bw-live-banner__done">{text.done} · waiting for results</span>
      </div>
    );
  }

  return (
    <section className={className} aria-label={text.badge}>
      <div className="bw-live-banner__text">
        <span className="bw-live-banner__badge">
          {/* The host's Live dot, pulsing the same way. */}
          <StatusDot color="var(--bw-red)" round pulse className="bw-live-banner__dot" />
          {text.badge}
        </span>
        <span className="bw-live-banner__title" title={challenge.title}>
          {challenge.title}
        </span>
        <span className="bw-live-banner__hint">{text.hint}</span>
      </div>
      {remainingSec !== null ? (
        <div className="bw-live-banner__clock">
          <span className="bw-live-banner__time">{formatClock(remainingSec)}</span>
          <span className="bw-live-banner__left">left to {challenge.kind === "poll" ? "vote" : "answer"}</span>
        </div>
      ) : null}
      <Button className="bw-live-banner__action" onClick={onOpen}>
        {text.action} ›
      </Button>
    </section>
  );
}
