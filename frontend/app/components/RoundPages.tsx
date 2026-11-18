"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/** A fixed page of cards: how many, in how many columns, each how tall. */
export interface PageLayout {
  columns: number;
  perPage: number;
  cardHeight: number;
}

/** Cards on a page without a `layout`: four. The page's CSS decides whether it pages at all. */
const DEFAULT_PER_PAGE = 4;

/**
 * A list of round cards shown a page at a time, with a pager under them.
 *
 * With a `layout` (the workflow page), the grid is that page exactly: its columns,
 * rows and card height come from the same numbers as the paging, so they always
 * agree, and the pager keeps its space on a single page.
 *
 * Without one (the session page), a page is four cards and the page's CSS turns
 * paging on only on a narrow panel.
 *
 * A new card on the current page fades in on its own; a new card past the page
 * turns to its page with a slide. Cards already shown never move or replay.
 */
export default function RoundPages({
  className,
  items,
  currentIndex = null,
  layout,
  footer,
}: {
  className: string;
  /** One card per round, keyed by round id, in order. */
  items: { key: string; node: ReactNode }[];
  /** A card to bring into view whenever it changes, such as the live round. */
  currentIndex?: number | null;
  /** A fixed page of cards. */
  layout?: PageLayout;
  /** Under the pager, such as + Add round. */
  footer?: ReactNode;
}) {
  const perPage = layout?.perPage ?? DEFAULT_PER_PAGE;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  // A card on the wanted page, not a page number, so the same cards stay in view when the page size changes.
  const [anchor, setAnchor] = useState(() => currentIndex ?? 0);
  const pageOf = (index: number) => Math.floor(Math.max(0, Math.min(index, items.length - 1)) / perPage);
  const page = pageOf(anchor);
  // Set only by a page turn, so cards already in view never slide.
  const [direction, setDirection] = useState<"next" | "back" | null>(null);
  // The card just added; only it plays the enter animation.
  const [added, setAdded] = useState<string | null>(null);

  const [seen, setSeen] = useState({ count: items.length, current: currentIndex, perPage });
  if (seen.count !== items.length || seen.current !== currentIndex || seen.perPage !== perPage) {
    setSeen({ count: items.length, current: currentIndex, perPage });
    // A new page size shows other cards without animating them.
    if (perPage !== seen.perPage) {
      setDirection(null);
      setAdded(null);
    }
    if (items.length > seen.count) {
      const last = items.length - 1;
      // Past this page: turn to it. On this page: only the new card animates.
      setDirection(pageOf(last) !== page ? "next" : null);
      setAdded(items[last].key);
      setAnchor(last);
    } else if (currentIndex !== null && currentIndex !== seen.current) {
      setAnchor(currentIndex);
    }
  }

  function go(to: number) {
    setDirection(to > page ? "next" : "back");
    setAnchor(to * perPage);
  }

  // With a layout the pager keeps its space on a single page, so + Add round never moves.
  const showPager = pages > 1 || layout !== undefined;

  return (
    <div className={`bw-round-pages ${className}`} data-paged={pages > 1 || undefined}>
      <div
        className="bw-round-pages__grid"
        style={
          layout
            ? ({
                "--bw-page-columns": layout.columns,
                "--bw-page-rows": Math.ceil(layout.perPage / layout.columns),
                "--bw-round-h": `${layout.cardHeight}px`,
              } as CSSProperties)
            : undefined
        }
        data-direction={direction ?? undefined}
      >
        {items.map(({ key, node }, index) => (
          <div
            key={key}
            className="bw-round-pages__item"
            data-off={Math.floor(index / perPage) !== page || undefined}
            data-added={key === added || undefined}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && key === added) setAdded(null);
            }}
          >
            {node}
          </div>
        ))}
      </div>
      {showPager ? (
        <div
          className="bw-pager"
          role="group"
          aria-label="Round pages"
          aria-hidden={pages === 1 || undefined}
          data-single={pages === 1 || undefined}
        >
          <button
            type="button"
            className="bw-pager__button"
            aria-label="Previous rounds"
            disabled={page === 0}
            onClick={() => go(page - 1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M10 3.5 5.5 8l4.5 4.5" />
            </svg>
          </button>
          <span className="bw-pager__count" aria-live="polite">
            {page + 1} / {pages}
          </span>
          <button
            type="button"
            className="bw-pager__button"
            aria-label="Next rounds"
            disabled={page === pages - 1}
            onClick={() => go(page + 1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" />
            </svg>
          </button>
        </div>
      ) : null}
      {footer}
    </div>
  );
}
