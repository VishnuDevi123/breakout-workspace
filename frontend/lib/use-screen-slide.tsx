"use client";

import { useState, type ReactNode } from "react";

/** Where a screen sits: [level, place within the level]. Deeper or later is forward. */
export type ScreenRank = [number, number];

function isBack(from: ScreenRank, to: ScreenRank): boolean {
  return to[0] !== from[0] ? to[0] < from[0] : to[1] < from[1];
}

/**
 * The slide between whole screens, for the host and participants alike: going
 * forward slides the new screen in from the right, going back from the left. The
 * first screen just fades, as does the first one after a loading spinner (key "").
 * Returns a wrapper to put round the screen on show; its key mounts the screen
 * again on a change, so the slide plays once.
 */
export function useScreenSlide(screen: { key: string; rank: ScreenRank }): (node: ReactNode) => ReactNode {
  const [lastScreen, setLastScreen] = useState(screen);
  const [nav, setNav] = useState<"next" | "back" | null>(null);
  if (lastScreen.key !== screen.key) {
    setLastScreen(screen);
    // An empty key is a loading spinner: the first real screen after it fades, not slides.
    setNav(lastScreen.key === "" ? null : isBack(lastScreen.rank, screen.rank) ? "back" : "next");
  }
  return function asScreen(node: ReactNode) {
    return (
      <div key={screen.key} className="bw-screen" data-nav={nav ?? undefined}>
        {node}
      </div>
    );
  };
}
