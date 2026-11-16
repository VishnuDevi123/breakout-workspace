"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Rows on a page when the window has no room for more: four cards, two by two. */
const MIN_ROWS = 2;

/** The element that scrolls the list, or the page itself. */
function scrollerOf(element: HTMLElement): HTMLElement {
  for (let at = element.parentElement; at; at = at.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(at).overflowY)) return at;
  }
  return document.documentElement;
}

/**
 * A list of round cards that a narrow layout shows a page at a time, two cards
 * per row, with a pager under them. The page's CSS turns the paging on; a wide
 * layout hides the pager and shows every card.
 *
 * A page holds two rows, or with `fill`, as many rows as the window has room for.
 */
export default function RoundPages({
  className,
  items,
  currentIndex = null,
  fill = false,
  footer,
}: {
  className: string;
  /** One keyed card per round, in order. */
  items: { key: string; node: ReactNode }[];
  /** A card to bring into view whenever it changes, such as the live round. */
  currentIndex?: number | null;
  /** Grow the page into the free space under it, and shrink it before the page would scroll. */
  fill?: boolean;
  /** Under the pager, such as + Add round. */
  footer?: ReactNode;
}) {
  const list = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ columns: 2, rows: MIN_ROWS });
  const perPage = layout.columns * layout.rows;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  // A card on the wanted page, not a page number, so the same cards stay in view when a page grows.
  const [anchor, setAnchor] = useState(() => currentIndex ?? 0);
  // Null until the page changes, so cards do not slide in when the list first shows.
  const [direction, setDirection] = useState<"next" | "back" | null>(null);
  const [seen, setSeen] = useState({ count: items.length, current: currentIndex, perPage });
  if (seen.count !== items.length || seen.current !== currentIndex || seen.perPage !== perPage) {
    setSeen({ count: items.length, current: currentIndex, perPage });
    // Cards shown by a resize are not a page turn: no slide.
    if (perPage !== seen.perPage) setDirection(null);
    if (items.length > seen.count) {
      // A round was added: show the page it landed on.
      setDirection("next");
      setAnchor(items.length - 1);
    } else if (currentIndex !== null && currentIndex !== seen.current) {
      setAnchor(currentIndex);
    }
  }
  // Deleting rounds can leave the anchor past the end.
  const page = Math.floor(Math.max(0, Math.min(anchor, items.length - 1)) / perPage);

  useEffect(() => {
    const element = list.current;
    if (!fill || !element) return;
    const scroller = scrollerOf(element);

    // Rows that fit: grow into the space left under the list, shrink by what the page overflows.
    function measure() {
      if (!element) return;
      const style = getComputedStyle(element);
      const columns = style.gridTemplateColumns.split(" ").length;
      const card = element.querySelector<HTMLElement>(".bw-round-pages__item:not([data-off]) > *");
      if (style.display !== "grid" || columns < 2 || !card) return;

      const step = card.getBoundingClientRect().height + parseFloat(style.rowGap);
      const parent = element.parentElement!;
      const parentBottom = parent.getBoundingClientRect().bottom - parseFloat(getComputedStyle(parent).paddingBottom);
      const free = parentBottom - element.getBoundingClientRect().bottom;
      const overflow = scroller.scrollHeight - scroller.clientHeight;

      const shown = Math.ceil(element.querySelectorAll(".bw-round-pages__item:not([data-off])").length / columns);

      setLayout((current) => {
        // A paged list keeps every row of a page, even on a short last page.
        const rendered = element.dataset.paged === undefined ? shown : current.rows;
        const rows = Math.max(
          MIN_ROWS,
          overflow > 0 ? rendered - Math.ceil(overflow / step) : rendered + Math.floor(free / step),
        );
        return rows === current.rows && columns === current.columns ? current : { columns, rows };
      });
    }

    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fill]);

  function go(to: number) {
    setDirection(to > page ? "next" : "back");
    setAnchor(to * perPage);
  }

  return (
    <div
      ref={list}
      className={`bw-round-pages ${className}`}
      style={{ "--bw-page-rows": layout.rows } as CSSProperties}
      data-direction={direction ?? undefined}
      data-paged={pages > 1 || undefined}
    >
      {items.map(({ key, node }, index) => (
        <div key={key} className="bw-round-pages__item" data-off={Math.floor(index / perPage) !== page || undefined}>
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
