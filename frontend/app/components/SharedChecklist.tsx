"use client";

import type { CheckListItem } from "@/types/breakout";

import { Card, SectionLabel } from "./ui";

/**
 * The task's checklist, shared by the room: a green bar for how much is done and a
 * green tick on each done item. With `onTick`, anyone in the room ticks or unticks
 * any item (room page and shared board page); without it, read-only (host's room page).
 */
export default function SharedChecklist({
  title,
  items,
  ticks,
  onTick,
}: {
  title: string;
  items: CheckListItem[];
  /** Truthy per done item id. */
  ticks: Record<string, unknown> | undefined;
  onTick?: (itemId: string, done: boolean) => void;
}) {
  if (items.length === 0) return null;
  const doneCount = items.filter((item) => ticks?.[item.id]).length;

  return (
    <Card className="bw-checklist">
      <div className="bw-checklist__header">
        <SectionLabel>{title}</SectionLabel>
        <span className="bw-checklist__track" aria-hidden>
          <span className="bw-checklist__bar" style={{ width: `${(doneCount / items.length) * 100}%` }} />
        </span>
        <span className="bw-checklist__count">
          {doneCount} of {items.length} done
        </span>
      </div>

      {items.map((item) => {
        const done = Boolean(ticks?.[item.id]);
        const className = `bw-checklist__row${done ? " bw-checklist__row--done" : ""}`;
        const content = (
          <>
            <span className="bw-checklist__box" aria-hidden />
            <span className="bw-checklist__label">{item.label}</span>
          </>
        );
        return onTick ? (
          <button className={className} key={item.id} aria-pressed={done} onClick={() => onTick(item.id, !done)}>
            {content}
          </button>
        ) : (
          <div className={className} key={item.id} aria-label={`${item.label}: ${done ? "done" : "not done"}`} role="group">
            {content}
          </div>
        );
      })}
    </Card>
  );
}
