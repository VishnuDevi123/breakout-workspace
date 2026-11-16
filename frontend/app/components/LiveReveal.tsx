"use client";

import { useState, type ReactNode } from "react";

interface Item<T> {
  key: string;
  value: T;
}

/**
 * Something that slides into the page and later slides away: the space opens and
 * the content below moves down; on leaving it closes again. A new key swaps it:
 * the old one closes while the new one opens, so the page moves smoothly from
 * one height to the other. A leaving item keeps the value it arrived with, so
 * give each look its own key.
 */
export default function LiveReveal<T>({
  item,
  render,
}: {
  /** What to show, or null for nothing. */
  item: Item<T> | null;
  render: (value: T) => ReactNode;
}) {
  const [shownKey, setShownKey] = useState(item?.key ?? null);
  const [shownValue, setShownValue] = useState(item?.value);
  const [leaving, setLeaving] = useState<Item<T>[]>([]);
  const key = item?.key ?? null;
  if (key !== shownKey) {
    const kept = leaving.filter((old) => old.key !== key);
    setLeaving(shownKey !== null ? [...kept, { key: shownKey, value: shownValue as T }] : kept);
    setShownKey(key);
    setShownValue(item?.value);
  }

  return (
    <>
      {leaving.map((old) => (
        <div
          key={old.key}
          className="bw-live-reveal bw-live-reveal--leaving"
          aria-hidden
          onAnimationEnd={(event) => {
            // Only the closing itself, not an animation inside (the Live dot's pulse).
            if (event.target === event.currentTarget) setLeaving((list) => list.filter((entry) => entry.key !== old.key));
          }}
        >
          <div className="bw-live-reveal__inner">{render(old.value)}</div>
        </div>
      ))}
      {item ? (
        <div key={item.key} className="bw-live-reveal">
          <div className="bw-live-reveal__inner">{render(item.value)}</div>
        </div>
      ) : null}
    </>
  );
}
