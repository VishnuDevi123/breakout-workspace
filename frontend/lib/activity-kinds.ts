import type { CSSProperties } from "react";

import type { Activity, RoomResponsesHostView, RoomResponsesView } from "@/types/breakout";

/** Display text and tints per activity kind, shared by the host editor and (later) the room page. */
export const ACTIVITY_KINDS: Record<
  Activity["kind"],
  { label: string; hint: string; tint: string; ink: string; titleLabel: string; titlePlaceholder: string }
> = {
  individual: {
    label: "Individual response",
    hint: "private",
    tint: "#fff4c4",
    ink: "#746019",
    titleLabel: "Question",
    titlePlaceholder: "What should each person answer?",
  },
  ideaBoard: {
    label: "Shared response",
    hint: "idea board",
    tint: "#c3faf5",
    ink: "#187574",
    titleLabel: "Prompt for the board",
    titlePlaceholder: "What should the room add ideas about?",
  },
};

type ActivityProgress = "notStarted" | "working" | "completed";

export const PROGRESS_LABELS: Record<ActivityProgress, string> = {
  notStarted: "Not started",
  working: "Working",
  completed: "Completed",
};

/**
 * One person's progress on one activity. An answer is completed once submitted;
 * a board once the person has added at least one note (boards have no working step).
 */
export function activityProgress(
  activity: Activity,
  view: RoomResponsesView | null,
  participantUUID: string,
): ActivityProgress {
  if (!view) return "notStarted";
  switch (activity.kind) {
    case "individual": {
      const status = view.statuses[activity.id]?.[participantUUID];
      if (status === "submitted") return "completed";
      return status === "working" ? "working" : "notStarted";
    }
    case "ideaBoard": {
      const wroteNote = view.ideas[activity.id]?.some((note) => note.participantUUID === participantUUID);
      return wroteNote ? "completed" : "notStarted";
    }
    default:
      return assertNever(activity);
  }
}

/** A room member's line in the people list: Submitted once every activity is completed. */
export function memberStatus(
  activities: Activity[],
  view: RoomResponsesView | null,
  participantUUID: string,
): "Submitted" | "Working" | "Not started" {
  const progress = activities.map((activity) => activityProgress(activity, view, participantUUID));
  if (progress.length > 0 && progress.every((step) => step === "completed")) return "Submitted";
  return progress.some((step) => step !== "notStarted") ? "Working" : "Not started";
}

/** How far a room is on one activity: the bar's share and the line beside it. */
export interface RoomProgress {
  done: number;
  total: number;
  text: string;
}

/**
 * For the host: submitted answers, or people who added an idea, out of the room's people.
 * `detailed` names the total on a board ("from 2 of 3 people"), for the activity's own page.
 */
export function roomProgress(
  activity: Activity,
  peopleCount: number,
  results: RoomResponsesHostView | null,
  detailed = false,
): RoomProgress {
  if (activity.kind === "individual") {
    const answers = Object.values(results?.answers[activity.id] ?? {});
    const submitted = answers.filter((answer) => answer.status === "submitted").length;
    return { done: submitted, total: peopleCount, text: `${submitted} of ${peopleCount} submitted` };
  }
  const notes = results?.ideas[activity.id] ?? [];
  const authors = new Set(notes.map((note) => note.participantUUID)).size;
  const ideas = `${notes.length} ${notes.length === 1 ? "idea" : "ideas"}`;
  const people = detailed
    ? `${authors} of ${peopleCount} ${peopleCount === 1 ? "person" : "people"}`
    : `${authors} ${authors === 1 ? "person" : "people"}`;
  return { done: authors, total: peopleCount, text: `${ideas} from ${people}` };
}

/**
 * A note as every screen shows it: a light tint of its hue on white, with a border in
 * a stronger tint. Only ever lighter than the hue. Older notes may carry an alpha
 * suffix ("#fccf0687"); the first six digits are the hue.
 */
export function noteTint(color: string): CSSProperties {
  const hex = color.slice(0, 7);
  return { background: `linear-gradient(${hex}47, ${hex}47), var(--bw-surface)`, borderColor: `${hex}99` };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled activity: ${JSON.stringify(value)}`);
}
