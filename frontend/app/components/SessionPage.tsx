"use client";

import { useState, type ReactNode } from "react";

import { formatClock } from "@/lib/round-clock";
import { taskHasContent, useRoundTasks } from "@/lib/use-round-tasks";
import { roundLabel } from "@/lib/use-workspace";
import type { RoomTask, RoundMeta, RoundPlan, Workspace } from "@/types/breakout";

import ActivityList from "./ActivityList";
import EditTaskModal from "./EditTaskModal";
import RoundPages from "./RoundPages";
import RoundSettingsModal from "./RoundSettingsModal";
import { groupingOf } from "./screens/RoundsOverview";
import { Button, Card, ConfirmModal, Pill, SectionLabel } from "./ui";

type RoundPatch = Partial<Pick<RoundMeta, "title" | "durationSec">>;

/**
 * The live round's second page: what the running round asks of the rooms, and
 * the rounds still to come. Only rounds that have not run can be changed here.
 * Once the round closes, the next round's task and activities take its place.
 * Every handler reports its own errors.
 */
export default function SessionPage({
  workspace,
  plans,
  tasks,
  open,
  nextRound,
  canEditRounds,
  onEditTask,
  onAddRound,
  onUpdateRound,
  onDeleteRound,
  onSkipRound,
  onRoomCount,
  zoomBusy,
  challenges,
}: {
  workspace: Workspace;
  plans: Record<string, RoundPlan | null>;
  tasks: ReturnType<typeof useRoundTasks>;
  /** Whether the round is still running; activities can only change while it is. */
  open: boolean;
  /** The round the host launches next; null when every round has run. */
  nextRound: RoundMeta | null;
  /** Host only. A co-host edits the running round's task and activities, not the rounds. */
  canEditRounds: boolean;
  onEditTask: () => void;
  onAddRound: () => Promise<void>;
  onUpdateRound: (roundId: string, patch: RoundPatch) => Promise<void>;
  onDeleteRound: (roundId: string) => Promise<void>;
  onSkipRound: (roundId: string, skipped: boolean) => Promise<void>;
  /** Resolves false when the change was not saved; reports its own errors. */
  onRoomCount: (roundId: string, count: number) => Promise<boolean>;
  /** A Zoom launch or close is running; rooms cannot change until it ends. */
  zoomBusy: boolean;
  /** The poll and quiz cards; null when the round is closed and none ran. */
  challenges: ReactNode;
}) {
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const positionOf = (roundId: string) => workspace.rounds.findIndex((round) => round.roundId === roundId) + 1;
  const settingsRound = workspace.rounds.find((round) => round.roundId === settingsFor) ?? null;
  // The round that matters now: the live one, or the next to launch between rounds.
  const currentId =
    workspace.rounds.find((round) => round.status === "launched")?.roundId ?? nextRound?.roundId ?? null;
  const currentIndex = workspace.rounds.findIndex((round) => round.roundId === currentId);

  async function addRound() {
    setAdding(true);
    await onAddRound();
    setAdding(false);
  }

  return (
    <div className="bw-session">
      <section className="bw-session__column">
        <SectionLabel>Current Workflow</SectionLabel>
        <RoundPages
          className="bw-session-rounds"
          currentIndex={currentIndex === -1 ? null : currentIndex}
          items={workspace.rounds.map((round) => ({
            key: round.roundId,
            node: (
              <RoundCard
                round={round}
                label={roundLabel(workspace, round.roundId)}
                editable={canEditRounds}
                onSettings={() => setSettingsFor(round.roundId)}
                onDelete={() => setDeletingId(round.roundId)}
              />
            ),
          }))}
          footer={
            canEditRounds ? (
              <Button
                variant="secondary"
                className="bw-session-rounds__add"
                busy={adding}
                onClick={() => void addRound()}
              >
                + Add round
              </Button>
            ) : null
          }
        />
      </section>

      <section className="bw-session__column">
        {!open && nextRound ? (
          <NextRoundTasks
            parentUUID={workspace.parentUUID}
            round={nextRound}
            label={roundLabel(workspace, nextRound.roundId)}
          />
        ) : (
          <>
            <SectionLabel>This round</SectionLabel>
            <TaskSummary task={tasks.task} editable={open} onEdit={onEditTask} />
          </>
        )}
        {challenges ? (
          <>
            <SectionLabel>Polls and quizzes</SectionLabel>
            {challenges}
          </>
        ) : null}
        {open ? (
          <ActivityList
            activities={tasks.activities}
            live
            onSave={tasks.saveActivities}
          />
        ) : null}
      </section>

      {settingsRound ? (
        <RoundSettingsModal
          round={settingsRound}
          position={positionOf(settingsRound.roundId)}
          plan={plans[settingsRound.roundId] ?? null}
          grouping={groupingOf(workspace)}
          zoomBusy={zoomBusy}
          onUpdateRound={onUpdateRound}
          onSkipRound={onSkipRound}
          onRoomCount={(count) => onRoomCount(settingsRound.roundId, count)}
          onClose={() => setSettingsFor(null)}
        />
      ) : null}

      {deletingId ? (
        <ConfirmModal
          title={`Delete ${roundLabel(workspace, deletingId)}?`}
          message="Its rooms and placements are removed. This cannot be undone."
          confirmLabel="Delete round"
          onConfirm={() => onDeleteRound(deletingId)}
          onClose={() => setDeletingId(null)}
        />
      ) : null}
    </div>
  );
}

/** The task's goal and, while it can be changed, the action that opens the editor. */
function TaskSummary({ task, editable, onEdit }: { task: RoomTask; editable: boolean; onEdit: () => void }) {
  const hasTask = taskHasContent(task);
  return (
    <button className="bw-task-summary" disabled={!editable} onClick={onEdit}>
      <span className="bw-task-summary__goal">
        {task.goal || (hasTask ? "Task without a goal" : "No task set yet")}
      </span>
      {editable ? <span className="bw-task-summary__action">{hasTask ? "Edit task" : "Add a task"}</span> : null}
    </button>
  );
}

/** Between rounds: the next round's task and activities, to prepare before its launch. */
function NextRoundTasks({ parentUUID, round, label }: { parentUUID: string; round: RoundMeta; label: string }) {
  const tasks = useRoundTasks(parentUUID, round.roundId);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <SectionLabel>Next round · {label}</SectionLabel>
      <TaskSummary task={tasks.task} editable={tasks.state !== "loading"} onEdit={() => setEditing(true)} />
      <ActivityList activities={tasks.activities} live={false} onSave={tasks.saveActivities} />
      {editing ? <EditTaskModal roundTitle={label} tasks={tasks} onClose={() => setEditing(false)} /> : null}
    </>
  );
}

const STATUS_PILL: Record<RoundMeta["status"], { label: string; tone: "neutral" | "accent" | "amber" } | null> = {
  planned: null,
  launched: { label: "Live", tone: "accent" },
  closed: { label: "Done", tone: "neutral" },
  skipped: { label: "Skipped", tone: "amber" },
};

/** A round that already ran, or is running, has nothing left to change. */
function RoundCard({
  round,
  label,
  editable,
  onSettings,
  onDelete,
}: {
  round: RoundMeta;
  label: string;
  editable: boolean;
  onSettings: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_PILL[round.status];
  const upcoming = round.status === "planned" || round.status === "skipped";

  return (
    <Card className="bw-round-card" tone={upcoming ? "default" : "sunken"}>
      <div className="bw-round-card__top">
        <span className="bw-round-card__title" title={label}>{label}</span>
        {status ? <Pill tone={status.tone}>{status.label}</Pill> : null}
        <span className="bw-mono bw-round-card__time">{formatClock(round.durationSec)}</span>
      </div>
      {upcoming && editable ? (
        <div className="bw-round-card__actions">
          <Button variant="secondary" size="sm" onClick={onSettings}>
            Settings
          </Button>
          <Button variant="secondary" size="sm" className="bw-button--danger-text" onClick={onDelete}>
            Delete round
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
