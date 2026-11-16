"use client";

import type { DragEvent } from "react";

import { ACTIVITY_KINDS, type RoomProgress } from "@/lib/activity-kinds";
import type { Activity } from "@/types/breakout";

type Props = {
  activity: Activity;
  /** Zero-based place in the round's list; shown from 1. */
  index: number;
} & (
  | {
      /** Session page and round setup: reorder, edit, remove. */
      mode: "edit";
      onEdit: () => void;
      onRemove: () => void;
      onDragStart: () => void;
      onDrop: () => void;
    }
  | {
      /** The host's live room page: how far the room is, and a way into its answers. */
      mode: "monitor";
      progress: RoomProgress;
      onOpen: () => void;
    }
);

const OPEN_LABELS: Record<Activity["kind"], string> = {
  individual: "View answers",
  ideaBoard: "Open board",
};

/**
 * One activity as the host sees it, tinted by kind: its place, its kind and its question.
 * Long text ends in "…" rather than leaving the card.
 */
export default function ActivityCard(props: Props) {
  const { activity, index } = props;
  const kindLabel = ACTIVITY_KINDS[activity.kind].label;
  const className = `bw-act-card bw-act-card--${activity.kind}`;

  const header = (
    <>
      <span className="bw-act-card__number">{index + 1}</span>
      <span className="bw-act-card__kind">{kindLabel}</span>
    </>
  );
  const question = (
    <span className="bw-act-card__question" title={activity.title}>
      {activity.title}
    </span>
  );

  if (props.mode === "monitor") {
    return (
      <button type="button" className={`${className} bw-act-card--monitor`} onClick={props.onOpen}>
        <span className="bw-act-card__header">
          {header}
          <span className="bw-act-card__link">{OPEN_LABELS[activity.kind]} ›</span>
        </span>
        {question}
        <ProgressLine progress={props.progress} />
      </button>
    );
  }

  return (
    <div
      className={className}
      draggable
      onDragStart={props.onDragStart}
      onDragOver={(event: DragEvent) => event.preventDefault()}
      onDrop={props.onDrop}
    >
      <span className="bw-act-card__header">
        <span className="bw-act-card__grip" aria-hidden>
          ⠿
        </span>
        {header}
        <button type="button" className="bw-act-card__link" onClick={props.onEdit}>
          Edit
        </button>
        <button
          type="button"
          className="bw-icon-button bw-close"
          aria-label={`Remove activity ${index + 1}`}
          onClick={props.onRemove}
        >
          ✕
        </button>
      </span>
      {question}
      {activity.description ? (
        <span className="bw-act-card__description" title={activity.description}>
          {activity.description}
        </span>
      ) : null}
    </div>
  );
}

/** The kind-coloured bar and its count; inside an element that sets the kind's tint. */
export function ProgressLine({ progress }: { progress: RoomProgress }) {
  const share = progress.total > 0 ? Math.min(1, progress.done / progress.total) : 0;
  return (
    <span className="bw-act-card__progress">
      <span className="bw-act-card__track" aria-hidden>
        <span className="bw-act-card__bar" style={{ width: `${share * 100}%` }} />
      </span>
      <span className="bw-act-card__count">{progress.text}</span>
    </span>
  );
}
