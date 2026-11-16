"use client";

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

      {activities.map((activity, index) => (
        <ActivityCard
          key={activity.id}
          mode="participant"
          activity={activity}
          index={index}
          progress={progress[index]}
          roomIdeas={activity.kind === "ideaBoard" ? (view?.ideas[activity.id]?.length ?? 0) : undefined}
          onOpen={() => onOpen(activity)}
        />
      ))}
    </>
  );
}
