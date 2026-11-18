"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export type WidthTier = "large" | "medium" | "small" | "mobile";
export type HeightTier = "h1" | "h2" | "h3" | "h4";

interface RoundLayout {
  /** Narrowest panel this layout is used at. */
  minWidth: number;
  columns: number;
  /** Fits everything a card shows at this layout's card widths. */
  cardHeight: number;
  /** Cards on a page at each height tier; a multiple of `columns`, so a page has no empty slots. */
  perPage: Record<HeightTier, number>;
}

/**
 * The workflow page's round grid, picked from the panel's size: the width picks the
 * layout, the height picks how many cards a page holds. Each width starts where the
 * wider layout's cards would get too narrow for their content (globals.css lays a
 * card out from its own width: timer on the right from 380px, tighter under 240px).
 *
 * - large: rounds beside the settings, one column of cards with the timer on the right.
 * - medium: rounds above the settings, two columns of stacked cards.
 * - small: as medium, with the tighter cards.
 * - mobile: one column of cards.
 *
 * The stacked layouts show one row at h1 (a 13" panel), so the settings under the
 * rounds stay in view. The height tiers and page sizes are tuned on real Zoom panels.
 */
export const ROUND_LAYOUTS: Record<WidthTier, RoundLayout> = {
  large: { minWidth: 760, columns: 1, cardHeight: 96, perPage: { h1: 4, h2: 5, h3: 7, h4: 8 } },
  medium: { minWidth: 560, columns: 2, cardHeight: 132, perPage: { h1: 2, h2: 4, h3: 6, h4: 8 } },
  small: { minWidth: 470, columns: 2, cardHeight: 132, perPage: { h1: 2, h2: 4, h3: 6, h4: 6 } },
  mobile: { minWidth: 0, columns: 1, cardHeight: 132, perPage: { h1: 1, h2: 3, h3: 4, h4: 4 } },
};

/** Shortest panel each height tier is used at. */
export const HEIGHT_TIERS: Record<HeightTier, number> = { h1: 0, h2: 760, h3: 900, h4: 1100 };

/** A panel must pass a tier's edge by this much to leave it, so it does not flip on the line. */
const HYSTERESIS_PX = 16;

const WIDTHS = Object.entries(ROUND_LAYOUTS).map(([tier, layout]) => [tier, layout.minWidth]) as [WidthTier, number][];
const HEIGHTS = Object.entries(HEIGHT_TIERS) as [HeightTier, number][];

/** The tier `value` falls in, widest first, keeping `current` while within its buffered edges. */
function tierFor<T extends string>(tiers: [T, number][], value: number, current: T | null): T {
  const sorted = [...tiers].sort((a, b) => b[1] - a[1]);
  const at = sorted.findIndex(([tier]) => tier === current);
  if (at !== -1) {
    const low = sorted[at][1];
    const high = at === 0 ? Infinity : sorted[at - 1][1];
    if (value >= low - HYSTERESIS_PX && value < high + HYSTERESIS_PX) return sorted[at][0];
  }
  return (sorted.find(([, min]) => value >= min) ?? sorted[sorted.length - 1])[0];
}

/**
 * The round grid for the panel `ref` fills (the page's own box, never the screen).
 * Re-renders only when the width or height tier changes, not on every pixel of a resize.
 */
export function usePanelLayout(ref: RefObject<HTMLElement | null>) {
  const [tiers, setTiers] = useState<{ width: WidthTier; height: HeightTier } | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    function measure(width: number, height: number) {
      setTiers((current) => {
        const next = { width: tierFor(WIDTHS, width, current?.width ?? null), height: tierFor(HEIGHTS, height, current?.height ?? null) };
        return current && current.width === next.width && current.height === next.height ? current : next;
      });
    }
    const box = element.getBoundingClientRect();
    measure(box.width, box.height);
    const observer = new ResizeObserver(([entry]) => measure(entry.contentRect.width, entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  const width = tiers?.width ?? "large";
  const layout = ROUND_LAYOUTS[width];
  return { width, columns: layout.columns, cardHeight: layout.cardHeight, perPage: layout.perPage[tiers?.height ?? "h1"] };
}
