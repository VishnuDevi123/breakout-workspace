"use client";

import { useState, type ReactNode } from "react";

import { activityProgress } from "@/lib/activity-kinds";
import type { Activity, RoomResponsesView } from "@/types/breakout";

import ActivityCard from "./ActivityCard";
import { Card, SectionLabel } from "./ui";

/**
 * The participant's activities for this round, in the host's order. Each card
 * shows the host's question only - the extra description belongs on the
 * activity's own page - with the caller's progress and the way in.
 */
export default function ActivityCards({
  activities,
  view,
  participantUUID,
  onOpen,
}: {
  activities: Activity[];
  view: RoomResponsesView | null;
  participantUUID: string;
  onOpen: (activity: Activity) => void;
}) {
  // Cards already here when the page opened show at once; ones the host adds later slide in.
  const [firstIds] = useState(() => new Set(activities.map((activity) => activity.id)));
  const progress = activities.map((activity) => activityProgress(activity, view, participantUUID));
  const completed = progress.filter((step) => step === "completed").length;

  return (
    <>
      <div className="bw-activities-heading">
        <SectionLabel>Activities</SectionLabel>
        {activities.length > 0 ? (
          <span className="bw-activity-count">
            {completed} of {activities.length} done
          </span>
        ) : null}
      </div>

      {activities.length === 0 ? (
        <Card tone="dashed" className="bw-activities-empty">
          Nothing to submit this round.
        </Card>
      ) : null}

      {activities.map((activity, index) => {
        const card = (
          <ActivityCard
            mode="participant"
            activity={activity}
            index={index}
            progress={progress[index]}
            roomIdeas={activity.kind === "ideaBoard" ? (view?.ideas[activity.id]?.length ?? 0) : undefined}
            onOpen={() => onOpen(activity)}
          />
        );
        return firstIds.has(activity.id) ? <div key={activity.id} className="bw-reveal-done">{card}</div> : <SlideIn key={activity.id}>{card}</SlideIn>;
      })}
    </>
  );
}

/**
 * A card the host added while the page was open: its space opens and it fades in,
 * as the poll banner does (bwLiveReveal). Once in, the wrappers step aside, so
 * nothing clips the card's focus ring.
 */
function SlideIn({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false);
  return (
    <div
      className={done ? "bw-reveal-done" : "bw-live-reveal bw-live-reveal--card"}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setDone(true);
      }}
    >
      <div className={done ? "bw-reveal-done" : "bw-live-reveal__inner"}>{children}</div>
    </div>
  );
}
