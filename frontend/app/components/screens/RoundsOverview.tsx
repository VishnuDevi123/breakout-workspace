"use client";

import { useId, useRef, useState } from "react";
import { toast } from "sonner";

import { ApiError, readRoundTasks, readSavedRoundPlan, saveRoundPlan } from "@/lib/execution-api";
import { formatClock } from "@/lib/round-clock";
import { shuffleEvenly } from "@/lib/room-plan-assignments";
import { copyRooms } from "@/lib/room-plan-copy";
import { useLiveRoomController } from "@/lib/use-live-room-controller";
import { withRoomCount } from "@/lib/use-room-plan";
import { MAX_ROOMS } from "@/types/breakout";
import { roundLabel } from "@/lib/use-workspace";
import type {
  LiveState,
  RoundMeta,
  RoundPlan,
  RoundPlanDraft,
  Workspace,
  ZoomRole,
} from "@/types/breakout";

import RoundPages from "../RoundPages";
import SaveTemplateModal from "../SaveTemplateModal";
import ZoomActionOverlay from "../ZoomActionOverlay";
import { Button, Card, ConfirmModal, EditableName, SectionLabel } from "../ui";

const DURATION_STEP_SEC = 30;
/** The rooms counter saves once the host stops clicking, not on every click. */
const ROOMS_SAVE_DELAY_MS = 400;
const MIN_DURATION_SEC = 30;

/** How rounds get their groups. Stored as the workspace's two existing flags. */
export type Grouping = "same" | "new" | "each";

/** The workflow page's bulk edits; one runs at a time, only its button spins, and the others ignore clicks without fading. */
type BulkAction = "rooms" | "assign";

/** `label` names the choice in full (AI proposals); the workflow page's cards show `short`. */
export const GROUPING_OPTIONS: { id: Grouping; label: string; short: string; hint: string }[] = [
  { id: "same", label: "Same groups every round", short: "Same groups", hint: "Set rooms and people once, in Round 1." },
  { id: "new", label: "New groups each round", short: "New each round", hint: "Same rooms, people mixed up each round." },
  { id: "each", label: "I'll set up each round", short: "Set each round", hint: "Every round has its own rooms and people. Set them up now by clicking the Round card or during the meeting." },
];

/** 16px line icons for the grouping cards, drawn in the text colour. */
const GROUPING_ICONS: Record<Grouping, React.ReactNode> = {
  same: (
    <>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 2.5h-6a2 2 0 0 0-2 2v6" />
    </>
  ),
  new: <path d="M2.5 5.5h10l-2.5-2.5M13.5 10.5h-10l2.5 2.5" />,
  each: <path d="M10.5 2.5l3 3-8 8h-3v-3z" />,
};

const GROUPING_FLAGS: Record<Grouping, Pick<Workspace, "sameRoomsEveryRound" | "samePeopleEveryRound">> = {
  same: { sameRoomsEveryRound: true, samePeopleEveryRound: true },
  new: { sameRoomsEveryRound: true, samePeopleEveryRound: false },
  each: { sameRoomsEveryRound: false, samePeopleEveryRound: false },
};

/** Same people without the same rooms has no meaning, so it reads as "each round". */
export function groupingOf(workspace: Pick<Workspace, "sameRoomsEveryRound" | "samePeopleEveryRound">): Grouping {
  if (!workspace.sameRoomsEveryRound) return "each";
  return workspace.samePeopleEveryRound ? "same" : "new";
}

/** Grow or shrink a draft to exactly `count` rooms. Shrinking unassigns whoever was in the last rooms. */
/** Rounds overview: order, titles and timing. Rooms are planned per round in the editor. */
export default function RoundsOverview({
  workspace,
  parentUUID,
  plans,
  onPlansChanged,
  live,
  role,
  onLaunched,
  onHome,
  onAddRound,
  onDeleteRound,
  onUpdateRound,
  onUpdateWorkspace,
  onEditRound,
  prepareLaunch,
  onSaveTemplate,
}: {
  workspace: Workspace;
  parentUUID: string;
  /** Saved draft per round, fetched by HostWorkspace. Null means never configured. */
  plans: Record<string, RoundPlan | null>;
  onPlansChanged: () => void;
  live: LiveState | null;
  role: ZoomRole | null;
  onLaunched: (roundId: string, saved: Workspace | null) => void;
  onHome: () => void;
  onAddRound: () => Promise<void>;
  onDeleteRound: (roundId: string) => Promise<void>;
  onUpdateRound: (roundId: string, patch: Partial<Pick<RoundMeta, "title" | "durationSec">>) => Promise<void>;
  onUpdateWorkspace: (
    patch: Partial<
      Pick<Workspace, "title" | "sameRoomsEveryRound" | "samePeopleEveryRound" | "autoStartNextRound">
    >,
  ) => Promise<void>;
  onEditRound: (roundId: string) => void;
  /** Saves this workflow, without people, to the host's templates. Reports its own errors. */
  onSaveTemplate: () => Promise<void>;
  /** Writes a round's plan just before launch ("Same groups" copies the last round's groups). */
  prepareLaunch: (roundId: string) => Promise<void>;
}) {
  const totalSec = workspace.rounds.reduce((sum, round) => sum + round.durationSec, 0);
  const anyLaunched = workspace.rounds.some((round) => round.status === "launched");
  // The round the host would start now: the first one Zoom has not run yet.
  // A skipped round is one the host chose not to run, so the rail steps over it.
  const target =
    workspace.rounds.find((round) => round.status !== "closed" && round.status !== "skipped") ??
    null;

  const [applying, setApplying] = useState<BulkAction | null>(null);
  // The same, for the rooms counter's delayed save: its callback holds an older render.
  const applyingRef = useRef(false);
  const grouping = groupingOf(workspace);
  const hintId = useId();
  // Everyone Zoom still reports in the meeting. The host is never placed in a room.
  const eligibleUUIDs = (live?.participants ?? [])
    .filter((participant) => participant.location !== "left" && participant.role === "attendee")
    .map((participant) => participant.participantUUID);

  /** First draft for a round nobody has configured: seeded from round 1 when the grouping asks for that. */
  function startingDraft(round: RoundMeta, flags: Pick<Workspace, "sameRoomsEveryRound" | "samePeopleEveryRound">): RoundPlanDraft {
    const empty: RoundPlanDraft = {
      parentUUID,
      roundId: round.roundId,
      title: roundLabel(workspace, round.roundId),
      rooms: [],
      stayInMainParticipantUUIDs: [],
    };
    const first = workspace.rounds[0];
    const source = first && first.roundId !== round.roundId ? plans[first.roundId] : null;
    if (!source || !flags.sameRoomsEveryRound) return empty;
    return copyRooms(source, empty, { withPeople: flags.samePeopleEveryRound });
  }

  /**
   * Write one round's draft. The editor may have saved since this page loaded: on a
   * stale revision (409) the change is applied once more to the saved plan. Any
   * other failure is reported as it is.
   */
  async function writePlan(round: RoundMeta, change: (draft: RoundPlanDraft) => RoundPlanDraft, mode: Grouping) {
    const known = plans[round.roundId] ?? null;
    try {
      await saveRoundPlan(parentUUID, change(known ?? startingDraft(round, GROUPING_FLAGS[mode])), known?.revision ?? 0);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 409)) throw error;
      const fresh = await readSavedRoundPlan(parentUUID, round.roundId).catch(() => null);
      if (!fresh) throw error;
      await saveRoundPlan(parentUUID, change(fresh), fresh.revision);
    }
  }

  /**
   * Apply one change to every round that has not run. A launched round's rooms are
   * open in Zoom, and a closed round's plan decides who may read its submissions.
   */
  async function applyToAllRounds(
    action: BulkAction,
    change: (draft: RoundPlanDraft) => RoundPlanDraft,
    /** Success toast; null when the control already shows the result. */
    done: string | null,
    mode: Grouping = grouping,
  ): Promise<boolean> {
    if (applyingRef.current) return false;
    applyingRef.current = true;
    setApplying(action);
    try {
      const editable = workspace.rounds.filter((round) => round.status === "planned" || round.status === "skipped");
      // Each round is its own saved plan, so they save side by side.
      await Promise.all(editable.map((round) => writePlan(round, change, mode)));
      onPlansChanged();
      if (done) toast.success(done);
      return true;
    } catch (error) {
      onPlansChanged();
      toast.error(error instanceof Error ? error.message : "Could not save the rooms.");
      return false;
    } finally {
      applyingRef.current = false;
      setApplying(null);
    }
  }

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Workspace update failed.");
    }
  }

  /** Assign evenly: a fresh random mix of everyone here in every round that has not run. */
  function assignEveryRound(mode: Grouping = grouping) {
    return applyToAllRounds(
      "assign",
      (draft) => shuffleEvenly(draft.rooms.length === 0 ? withRoomCount(draft, 1) : draft, eligibleUUIDs),
      "People spread evenly across every round.",
      mode,
    );
  }

  /** Picking "New groups" shows its groups at once, so the host sees the mix before launch. */
  async function chooseGrouping(choice: Grouping) {
    await onUpdateWorkspace(GROUPING_FLAGS[choice]);
    if (choice === "new" && grouping !== "new" && eligibleUUIDs.length > 0) await assignEveryRound(choice);
  }

  const firstRoundId = workspace.rounds[0]?.roundId ?? null;
  // "Same groups": a later round launches with the groups of the round before it,
  // so readiness looks at the last round that ran, or Round 1.
  function groupsSourceFor(roundId: string): string {
    if (grouping !== "same" || roundId === firstRoundId) return roundId;
    const index = workspace.rounds.findIndex((round) => round.roundId === roundId);
    const ran = workspace.rounds
      .slice(0, index)
      .reverse()
      .find((round) => round.status === "closed" || round.status === "launched");
    return (ran ?? workspace.rounds[0]).roundId;
  }

  // Every round: the rooms and people of the round that launches next.
  const nextPlan = target ? (plans[target.roundId] ?? plans[groupsSourceFor(target.roundId)] ?? null) : null;
  const savedRooms = nextPlan?.rooms.length ?? 0;
  // The count just asked for, shown until the saved plans catch up (or the save fails).
  const [pendingRooms, setPendingRooms] = useState<number | null>(null);
  if (pendingRooms !== null && pendingRooms === savedRooms && applying === null) setPendingRooms(null);
  const roomCount = pendingRooms ?? savedRooms;
  const placed = new Set(nextPlan?.rooms.flatMap((room) => room.participantUUIDs) ?? []);
  const unplaced = eligibleUUIDs.filter((uuid) => !placed.has(uuid)).length;

  /**
   * "New groups" deals everyone here into the new rooms, as the live page's round
   * settings do; launch keeps a round's groups, so an added room would stay empty.
   * "Same groups" keeps the host's groups; Assign evenly is there to mix them.
   */
  async function setEveryRoundRooms(count: number) {
    setPendingRooms(count);
    const resize = (draft: RoundPlanDraft) => withRoomCount(draft, count);
    const saved = await applyToAllRounds(
      "rooms",
      grouping === "new" ? (draft) => shuffleEvenly(resize(draft), eligibleUUIDs) : resize,
      null,
    );
    if (!saved) setPendingRooms(null);
  }

  const roomsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomsSaving = useRef(false);
  /** The count asked for while a save was running; saved right after it. */
  const roomsQueued = useRef<number | null>(null);

  /**
   * The counter shows each click at once and saves the count the host settles on.
   * Saving every click would hold the counter for one save per round each time.
   */
  function askRooms(count: number) {
    if (roomsTimer.current) clearTimeout(roomsTimer.current);
    if (count === savedRooms && !roomsSaving.current) {
      // Back where it started: nothing to save.
      setPendingRooms(null);
      return;
    }
    setPendingRooms(count);
    roomsTimer.current = setTimeout(() => void saveRooms(count), ROOMS_SAVE_DELAY_MS);
  }

  async function saveRooms(count: number) {
    if (roomsSaving.current) {
      roomsQueued.current = count;
      return;
    }
    roomsSaving.current = true;
    await setEveryRoundRooms(count);
    roomsSaving.current = false;
    const queued = roomsQueued.current;
    roomsQueued.current = null;
    if (queued !== null && queued !== count) await saveRooms(queued);
  }

  return (
    <div className="bw-shell bw-shell--fit">
      <header className="bw-header">
        <button
          type="button"
          className="bw-back"
          aria-label="Back to start"
          onClick={onHome}
        >
          ←
        </button>
        <div className="bw-round-heading">
          <EditableName
            value={workspace.title}
            placeholder="Sample Workflow"
            className="bw-workspace-title"
            onSave={(title) =>
              void run(() =>
                onUpdateWorkspace({ title: title ?? "Sample Workflow" }),
              )
            }
          />
          <span className="bw-header-subtitle">
            {anyLaunched
              ? "A round is live"
              : `Draft · ${workspace.rounds.length} ${workspace.rounds.length === 1 ? "round" : "rounds"} · ${formatClock(totalSec)}`}
          </span>
        </div>
        <div className="bw-header-spacer" />
      </header>

      <div className="bw-body bw-workflow">
        <main className="bw-main">
          <p className="bw-round-list__hint">Click a round to edit its rooms and tasks</p>
          <RoundPages
            className="bw-round-list"
            fill
            items={workspace.rounds.map((round, index) => ({
              key: round.roundId,
              node: (
                <RoundRow
                  round={round}
                  position={index + 1}
                  plan={plans[round.roundId] ?? null}
                  groupsFromPrevious={
                    grouping === "same" && round.roundId !== firstRoundId
                  }
                  onRename={(title) =>
                    run(() => onUpdateRound(round.roundId, { title }))
                  }
                  onDuration={(durationSec) =>
                    run(() => onUpdateRound(round.roundId, { durationSec }))
                  }
                  onDelete={() => run(() => onDeleteRound(round.roundId))}
                  onOpen={() => onEditRound(round.roundId)}
                />
              ),
            }))}
            footer={
              <button
                type="button"
                className="bw-add-round"
                onClick={() => void run(onAddRound)}
              >
                + Add round
              </button>
            }
          />
        </main>

        <aside className="bw-rail bw-workflow__settings">
          <SectionLabel>How should groups work?</SectionLabel>
          <div
            className="bw-choice-list"
            role="radiogroup"
            aria-label="How should groups work?"
          >
            {GROUPING_OPTIONS.map((option) => (
              <label className="bw-choice" key={option.id}>
                <input
                  type="radio"
                  name="grouping"
                  className="bw-choice__input"
                  checked={grouping === option.id}
                  aria-describedby={`${hintId}-${option.id}`}
                  onChange={() => void run(() => chooseGrouping(option.id))}
                />
                <svg className="bw-choice__icon" viewBox="0 0 16 16" aria-hidden="true">
                  {GROUPING_ICONS[option.id]}
                </svg>
                <span className="bw-choice__label">{option.short}</span>
              </label>
            ))}
          </div>
          {/* Every hint sits in one cell, so the slot is as tall as the longest and nothing below moves. */}
          <div className="bw-choice-hints">
            {GROUPING_OPTIONS.map((option) => (
              <p
                key={option.id}
                id={`${hintId}-${option.id}`}
                className="bw-choice__hint"
                data-shown={grouping === option.id ? "" : undefined}
              >
                {option.hint}
              </p>
            ))}
          </div>

          {grouping === "each" ? null : (
            <>
              <SectionLabel>Every round</SectionLabel>
              <div className="bw-every-round">
                <div className="bw-every-round__row">
                  <span className="bw-every-round__text">
                    <span className="bw-every-round__title" id={`${hintId}-rooms`}>Rooms per round</span>
                    <span className="bw-every-round__hint">{roomsHint(roomCount, eligibleUUIDs.length)}</span>
                  </span>
                  <div className="bw-count" role="group" aria-labelledby={`${hintId}-rooms`}>
                    <button
                      type="button"
                      aria-label="Fewer rooms"
                      disabled={roomCount <= 1 || applying === "assign"}
                      onClick={() => askRooms(roomCount - 1)}
                    >
                      −
                    </button>
                    <span className="bw-count__value" aria-live="polite">{roomCount}</span>
                    <button
                      type="button"
                      aria-label="More rooms"
                      disabled={roomCount >= MAX_ROOMS || applying === "assign"}
                      onClick={() => askRooms(roomCount + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="bw-every-round__row">
                  <span className="bw-every-round__text">
                    <span className="bw-every-round__title">People</span>
                    <span className="bw-every-round__hint">{peopleHint(unplaced, eligibleUUIDs.length)}</span>
                  </span>
                  <Button
                    variant="ghost"
                    className="bw-every-round__action"
                    busy={applying === "assign"}
                    disabled={eligibleUUIDs.length === 0}
                    onClick={() => void assignEveryRound()}
                  >
                    Assign evenly
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="bw-workflow__actions">
            <label className="bw-switch-row">
              <input
                type="checkbox"
                checked={workspace.autoStartNextRound}
                onChange={(event) =>
                  void run(() =>
                    onUpdateWorkspace({
                      autoStartNextRound: event.target.checked,
                    }),
                  )
                }
              />
              <span>Start the next round when the timer ends</span>
            </label>
            <LaunchWorkflow
              workspace={workspace}
              parentUUID={parentUUID}
              role={role}
              target={target}
              plan={
                target ? (plans[groupsSourceFor(target.roundId)] ?? null) : null
              }
              presentUUIDs={eligibleUUIDs}
              settledAtLaunch={grouping === "new"}
              prepareLaunch={prepareLaunch}
              onLaunched={onLaunched}
            >
              <SaveAsTemplate
                workspace={workspace}
                parentUUID={parentUUID}
                plans={plans}
                grouping={grouping}
                onSave={onSaveTemplate}
              />
            </LaunchWorkflow>
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * What a template needs before it can be saved: rooms in every round that
 * launches with its own. In "Same groups" later rounds copy Round 1 at launch.
 */
function templateBlocker(workspace: Workspace, plans: Record<string, RoundPlan | null>, grouping: Grouping) {
  if (workspace.rounds.length === 0) return "Add a round to save a template.";
  const needRooms = grouping === "same" ? workspace.rounds.slice(0, 1) : workspace.rounds;
  const missing = needRooms.find((round) => (plans[round.roundId]?.rooms.length ?? 0) === 0);
  return missing ? `${roundLabel(workspace, missing.roundId)} has no rooms yet.` : null;
}

/** Saves the workflow being built as a template, after the same confirmation a past workflow gets. */
function SaveAsTemplate({
  workspace,
  parentUUID,
  plans,
  grouping,
  onSave,
}: {
  workspace: Workspace;
  parentUUID: string;
  plans: Record<string, RoundPlan | null>;
  grouping: Grouping;
  onSave: () => Promise<void>;
}) {
  // Activities live in each round's task, which this page does not load; count them on open.
  const [activities, setActivities] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const blocker = templateBlocker(workspace, plans, grouping);
  const rooms = workspace.rounds.reduce((sum, round) => sum + (plans[round.roundId]?.rooms.length ?? 0), 0);

  async function open() {
    setCounting(true);
    try {
      const tasks = await Promise.all(workspace.rounds.map((round) => readRoundTasks(parentUUID, round.roundId)));
      setActivities(tasks.reduce((sum, task) => sum + (task?.activities.length ?? 0), 0));
    } catch (error) {
      toast.error("Could not read the rounds' tasks.", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setCounting(false);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        disabled={Boolean(blocker)}
        busy={counting}
        title={blocker ?? undefined}
        onClick={() => void open()}
      >
        Save as template
      </Button>

      {activities !== null ? (
        <SaveTemplateModal
          title={workspace.title}
          rounds={workspace.rounds.length}
          rooms={rooms}
          activities={activities}
          onConfirm={onSave}
          onClose={() => setActivities(null)}
        />
      ) : null}
    </>
  );
}

/** What stops a launch, or only deserves a warning. */
function readiness(
  workspace: Workspace,
  target: RoundMeta | null,
  plan: RoundPlan | null,
  presentUUIDs: string[],
  settledAtLaunch: boolean,
) {
  if (workspace.rounds.length === 0 || !target) return { blocker: "Add a round to launch.", unplaced: 0 };
  const label = roundLabel(workspace, target.roundId);
  if (target.status === "launched") return { blocker: `${label} is already running.`, unplaced: 0 };
  if (!plan || plan.rooms.length === 0) return { blocker: `${label} has no rooms yet.`, unplaced: 0 };
  // "New groups" places latecomers at launch, so nobody is left unplaced.
  if (settledAtLaunch) return { blocker: null, unplaced: 0 };
  const planned = new Set([...plan.rooms.flatMap((room) => room.participantUUIDs), ...plan.stayInMainParticipantUUIDs]);
  return { blocker: null, unplaced: presentUUIDs.filter((uuid) => !planned.has(uuid)).length };
}

/**
 * Starts the first round that has not run yet, after a confirmation. Always
 * visible; disabled with the reason shown until the round can actually launch.
 */
function LaunchWorkflow({
  workspace,
  parentUUID,
  role,
  target,
  plan,
  presentUUIDs,
  settledAtLaunch,
  prepareLaunch,
  onLaunched,
  children,
}: {
  workspace: Workspace;
  parentUUID: string;
  role: ZoomRole | null;
  target: RoundMeta | null;
  /** The plan the round will launch with: its own, or in "Same groups" the one it copies. */
  plan: RoundPlan | null;
  presentUUIDs: string[];
  /** "New groups": at launch, people who left are dropped and everyone present gets a room. */
  settledAtLaunch: boolean;
  prepareLaunch: (roundId: string) => Promise<void>;
  onLaunched: (roundId: string, saved: Workspace | null) => void;
  /** Shown above the Launch button (Save as template). */
  children: React.ReactNode;
}) {
  const [confirming, setConfirming] = useState(false);
  const label = target ? roundLabel(workspace, target.roundId) : "";
  const controller = useLiveRoomController({
    parentUUID,
    role,
    round: plan ?? { parentUUID, roundId: target?.roundId ?? "", title: label, rooms: [], stayInMainParticipantUUIDs: [] },
    // Drafts are saved by the editor; the overview has no pending edits to flush.
    flushSave: () => Promise.resolve(true),
    prepareLaunch,
    onLaunched,
  });
  const { blocker, unplaced } = readiness(workspace, target, plan, presentUUIDs, settledAtLaunch);
  const keptInMain = new Set(plan?.stayInMainParticipantUUIDs);
  const placed = settledAtLaunch
    ? presentUUIDs.filter((uuid) => !keptInMain.has(uuid)).length
    : (plan?.rooms.reduce((sum, room) => sum + room.participantUUIDs.length, 0) ?? 0);
  const peopleWarning =
    placed === 0
      ? "No one is placed yet!"
      : unplaced > 0
        ? `${unplaced} ${unplaced === 1 ? "person is" : "people are"} not placed and will stay in the main room.`
        : null;
  const position = target ? workspace.rounds.findIndex((round) => round.roundId === target.roundId) + 1 : 0;
  // "Round 2 of 3", plus the host's own name for it when it has one.
  const which = `Round ${position} of ${workspace.rounds.length}${label === `Round ${position}` ? "" : ` (${label})`}`;

  return (
    <div className="bw-launch">
      {children}
      <Button
        variant="primary"
        disabled={Boolean(blocker)}
        busy={controller.operation.kind === "running"}
        title={blocker ?? undefined}
        onClick={() => setConfirming(true)}
      >
        Launch workflow
      </Button>

      {confirming && target ? (
        <ConfirmModal
          title="Launch this workflow?"
          message={`${which} starts now and runs for ${formatClock(target.durationSec)}.`}
          details={peopleWarning ? <p className="bw-confirm-warning">{peopleWarning}</p> : undefined}
          confirmLabel="Launch"
          confirmVariant="primary"
          onConfirm={async () => controller.launch()}
          onClose={() => setConfirming(false)}
        />
      ) : null}
      <ZoomActionOverlay operation={controller.operation} />
    </div>
  );
}

/** "About 4 people each": how big the rooms come out with everyone here. */
function roomsHint(rooms: number, people: number): string {
  if (rooms === 0) return "No rooms yet";
  if (people === 0) return "No one here yet";
  if (people < rooms) return "More rooms than people";
  const each = Math.round(people / rooms);
  return `About ${each} ${each === 1 ? "person" : "people"} each`;
}

function peopleHint(unplaced: number, people: number): string {
  if (people === 0) return "Waiting for people to join";
  if (unplaced === 0) return "Everyone is assigned";
  return `${unplaced} not assigned yet`;
}

function RoundRow({
  round,
  position,
  plan,
  groupsFromPrevious,
  onRename,
  onDuration,
  onDelete,
  onOpen,
}: {
  round: RoundMeta;
  position: number;
  plan: RoundPlan | null;
  /** "Same groups": this round launches with the previous round's rooms and people. */
  groupsFromPrevious: boolean;
  onRename: (title: string | null) => void;
  onDuration: (durationSec: number) => void;
  onDelete: () => Promise<void>;
  onOpen: () => void;
}) {
  const roomCount = plan?.rooms.length ?? 0;
  const placedCount = plan?.rooms.reduce((sum, room) => sum + room.participantUUIDs.length, 0) ?? 0;
  const summary = groupsFromPrevious
    ? "Groups from the previous round"
    : roomCount === 0
      ? "No rooms yet"
      : `${roomCount} ${roomCount === 1 ? "room" : "rooms"} · ${placedCount} placed`;

  const name = round.title ?? `Round ${position}`;
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  return (
    <Card className="bw-round-row bw-card-interactive" style={{ borderLeftColor: round.dot }}>
      <EditableName value={round.title} placeholder={`Round ${position}`} onSave={onRename} />
      <div className="bw-round-row__controls">
        <div className="bw-stepper">
          <button
            type="button"
            aria-label="Shorter"
            disabled={round.durationSec <= MIN_DURATION_SEC}
            onClick={() => onDuration(round.durationSec - DURATION_STEP_SEC)}
          >
            −
          </button>
          <span className="bw-room-count bw-mono">{formatClock(round.durationSec)}</span>
          <button type="button" aria-label="Longer" onClick={() => onDuration(round.durationSec + DURATION_STEP_SEC)}>
            +
          </button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="bw-button--danger-text"
          disabled={round.status === "launched" || round.status === "closed"}
          title={
            round.status === "launched"
              ? "Close the round before removing it"
              : round.status === "closed"
                ? "A round that has run keeps its results"
                : undefined
          }
          onClick={() => setConfirmingRemove(true)}
        >
          Remove
        </Button>
      </div>
      <button type="button" className="bw-round-row__summary bw-card-open" aria-label={`Edit rooms and tasks for ${name}`} onClick={onOpen}>
        {summary}
      </button>

      {confirmingRemove ? (
        <ConfirmModal
          title={`Remove ${name}?`}
          message="Its room assignments, tasks and activities will be deleted."
          confirmLabel="Remove"
          onConfirm={onDelete}
          onClose={() => setConfirmingRemove(false)}
        />
      ) : null}
    </Card>
  );
}
