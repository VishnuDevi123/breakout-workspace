"use client";

import { useState, type ReactNode } from "react";

const PER_PAGE = 4;

function pageOf(index: number): number {
  return Math.floor(index / PER_PAGE);
}

/**
 * A list of round cards that a narrow layout shows four at a time, two by two,
 * with a pager under them. The page's CSS turns the paging on; a wide layout
 * hides the pager and shows every card.
 */
export default function RoundPages({
  className,
  items,
  currentIndex = null,
  footer,
}: {
  className: string;
  /** One keyed card per round, in order. */
  items: { key: string; node: ReactNode }[];
  /** A card to bring into view whenever it changes, such as the live round. */
  currentIndex?: number | null;
  /** Under the pager, such as + Add round. */
  footer?: ReactNode;
}) {
  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const [wanted, setWanted] = useState(() => (currentIndex === null ? 0 : pageOf(currentIndex)));
  // Null until the page changes, so cards do not slide in when the list first shows.
  const [direction, setDirection] = useState<"next" | "back" | null>(null);
  const [seen, setSeen] = useState({ count: items.length, current: currentIndex });
  if (seen.count !== items.length || seen.current !== currentIndex) {
    setSeen({ count: items.length, current: currentIndex });
    if (items.length > seen.count) {
      // A round was added: show the page it landed on.
      setDirection("next");
      setWanted(pages - 1);
    } else if (currentIndex !== null && currentIndex !== seen.current) {
      setWanted(pageOf(currentIndex));
    }
  }
  // Deleting rounds can leave fewer pages than the one asked for.
  const page = Math.min(wanted, pages - 1);

  function go(to: number) {
    setDirection(to > page ? "next" : "back");
    setWanted(to);
  }

  return (
    <div className={`bw-round-pages ${className}`} data-direction={direction ?? undefined} data-paged={pages > 1 || undefined}>
      {items.map(({ key, node }, index) => (
        <div key={key} className="bw-round-pages__item" data-off={pageOf(index) !== page || undefined}>
          {node}
        </div>
      ))}
      {pages > 1 ? (
        <div className="bw-pager" role="group" aria-label="Round pages">
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
