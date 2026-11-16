"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { memberStatus } from "@/lib/activity-kinds";
import { notice } from "@/lib/notice";
import { roomMembers } from "@/lib/participant-status";
import { useRemainingSec } from "@/lib/round-clock";
import { roomTheme } from "@/lib/room-theme";
import { useRoomChallenge } from "@/lib/use-challenges";
import type { ParticipantRound } from "@/lib/use-participant-round";
import { useRoomResponses } from "@/lib/use-room-responses";
import { useRoomStatus } from "@/lib/use-room-status";
import { useScreenSlide } from "@/lib/use-screen-slide";
import type { LiveState, PlannedRoom, RoomStatus } from "@/types/breakout";

import ActivityCards from "../ActivityCards";
import AnswerModal from "../AnswerModal";
import ChallengeBanner from "../ChallengeBanner";
import ChallengeOverlay from "../ChallengeOverlay";
import LiveReveal from "../LiveReveal";
import PageFrame from "../PageFrame";
import RoomBar from "../RoomBar";
import RoomPeople, { MEMBER_TONES } from "../RoomPeople";
import RoomStatusPicker from "../RoomStatusPicker";
import RoomStatusReminder from "../RoomStatusReminder";
import SharedChecklist from "../SharedChecklist";
import TaskDetails from "../TaskDetails";
import ActivityPage from "./ActivityPage";

/** In the round's last minute the room is reminded to tell the host if it needs more time. */
const REMINDER_SEC = 60;

/** What the toast after a status tap says. */
const STATUS_TOASTS: Record<Exclude<RoomStatus, "onTrack">, { icon: string; text: string }> = {
  moreTime: { icon: "⏳", text: "Your host knows you need more time" },
  done: { icon: "🙌", text: "Your host knows you're done" },
};

/**
 * The room a participant works in for one round, in the host's live frame with
 * a lighter bar: a running poll or quiz across the top, then the task and
 * activities on the left, and the shared checklist, the room's people and
 * "Tell your host" in a narrow column on the right. Opening an activity swaps the
 * whole page for that activity until the participant goes back.
 */
export default function ParticipantWorkspace({
  round,
  room,
  live,
  participantUUID,
  onBack,
}: {
  round: ParticipantRound;
  room: PlannedRoom;
  live: LiveState | null;
  participantUUID: string;
  onBack: () => void;
}) {
  const { task, activities } = round;
  const roundId = live?.round?.roundId ?? "";
  const [openActivityId, setOpenActivityId] = useState<string | null>(null);
  const responses = useRoomResponses({
    parentUUID: live?.parentUUID ?? "",
    roundId,
    roomId: room.id,
    participantUUID,
    roomRevision: live?.roomRevisions[room.id] ?? 0,
  });
  const { view, setTick } = responses;
  const openIndex = activities.findIndex((activity) => activity.id === openActivityId);

  // The host removed the open activity: the cards show again (no match below),
  // and the toast says why. The stale id is replaced on the next Open.
  const removedWhileOpen = openActivityId !== null && openIndex === -1;
  useEffect(() => {
    if (removedWhileOpen) toast("Your host removed that activity.");
  }, [removedWhileOpen]);
  const people = roomMembers({ room, live, participantUUID }).map(({ participantUUID: uuid, name, fullName }) => {
    const status = activities.length > 0 ? memberStatus(activities, view, uuid) : null;
    return { participantUUID: uuid, name, fullName, status, tone: status ? MEMBER_TONES[status] : "idle" } as const;
  });

  const openActivity = openIndex === -1 ? null : activities[openIndex];
  // The board is a page of its own: it slides in like a screen, and back out to the room.
  const onBoard = openActivity?.kind === "ideaBoard";
  const asScreen = useScreenSlide({ key: onBoard ? `board:${openActivity.id}` : "room", rank: [onBoard ? 1 : 0, 0] });

  // The host's latest poll or quiz. It opens by itself when launched and again when revealed;
  // closing it keeps a banner on the room page until the reveal.
  const { challenge, answer } = useRoomChallenge({
    parentUUID: live?.parentUUID ?? "",
    roundId,
    roomId: room.id,
    participantUUID,
    refreshKey: `${live?.challengeRevision ?? 0}:${live?.roomRevisions[room.id] ?? 0}`,
  });
  const [introDoneFor, setIntroDoneFor] = useState<string | null>(null);
  const [announcedFor, setAnnouncedFor] = useState<string | null>(null);
  const [seenRunning, setSeenRunning] = useState<string | null>(null);
  const [closedKey, setClosedKey] = useState<string | null>(null);
  if (challenge && !challenge.revealed && seenRunning !== challenge.id) setSeenRunning(challenge.id);
  const challengeKey = challenge ? `${challenge.id}:${challenge.revealed}` : null;
  // Results open by themselves only for a room that saw it running, not for someone arriving later.
  const challengeShown =
    challenge !== null && (!challenge.revealed || seenRunning === challenge.id) && closedKey !== challengeKey;
  const overlay =
    challenge?.room && challengeShown ? (
      <ChallengeOverlay
        challenge={challenge}
        answers={challenge.room}
        roomId={room.id}
        roomName={room.name}
        participants={live?.participants ?? []}
        participantUUID={participantUUID}
        intro={!challenge.revealed && introDoneFor !== challenge.id}
        onIntroDone={setIntroDoneFor}
        announce={announcedFor !== challenge.id}
        onAnnounceDone={setAnnouncedFor}
        onAnswer={answer}
        onClose={() => setClosedKey(challengeKey)}
      />
    ) : null;

  // The banner above the task while the poll or quiz runs: slim once the room has
  // locked every question, gone (sliding away) at the reveal or when time is up.
  const challengeSec = useRemainingSec(challenge?.endsAt ?? 0);
  const bannerDone = Boolean(challenge?.room?.locks.every((lock) => lock !== null));
  const banner =
    challenge?.room && !challenge.revealed && challengeSec !== 0
      ? { key: `${challenge.id}:${bannerDone ? "done" : "live"}`, value: { challenge, done: bannerDone } }
      : null;

  const roomStatus = useRoomStatus({ live, roomId: room.id, participantUUID });
  // A tap that sets a status says so, with Undo back to what it was.
  async function tellHost(status: RoomStatus) {
    const previous = roomStatus.current;
    if (!(await roomStatus.choose(status)) || status === "onTrack") return;
    const message = STATUS_TOASTS[status];
    notice(message.text, {
      icon: message.icon,
      action: { label: "Undo", onClick: () => void roomStatus.choose(previous) },
    });
  }
  const endsAt = live?.round?.endsAt ?? 0;
  const remainingSec = useRemainingSec(endsAt);
  // Once per end time, so time the host adds and a second last minute remind again.
  // A room already done needs no reminder; an open answer is never covered by a second modal.
  const reminderKey = `${roundId}:${endsAt}`;
  const reminderDue =
    remainingSec !== null && remainingSec > 0 && remainingSec <= REMINDER_SEC && roomStatus.current !== "done";
  const [reminding, setReminding] = useState(false);
  const [remindedKey, setRemindedKey] = useState<string | null>(null);
  if (reminderDue && remindedKey !== reminderKey && openActivity?.kind !== "individual" && !challengeShown && !reminding) {
    setRemindedKey(reminderKey);
    setReminding(true);
  }
  if (reminding && !live?.round) setReminding(false);
  const reminder = reminding ? (
    <RoomStatusReminder
      current={roomStatus.current}
      onChoose={(status) => void tellHost(status)}
      onClose={() => setReminding(false)}
    />
  ) : null;

  // The shared board is a page of its own; an individual answer opens as a modal over this page.
  if (openActivity?.kind === "ideaBoard") {
    return asScreen(
      <>
        <ActivityPage
          activity={openActivity}
          room={room}
          live={live}
          participantUUID={participantUUID}
          checklist={task?.checklist ?? []}
          responses={responses}
          onBack={() => setOpenActivityId(null)}
          onHome={onBack}
        />
        {reminder}
        {overlay}
      </>
    );
  }

  return asScreen(
    <>
      <PageFrame
        tone="participant"
        style={roomTheme(room.dot)}
        bar={<RoomBar room={room} live={live} onHome={onBack} />}
      >
        <div className="bw-room-page">
          <LiveReveal
            item={banner}
            render={(shown) => <ChallengeBanner {...shown} onOpen={() => setClosedKey(null)} />}
          />
          <div className="bw-room-layout">
            <section className="bw-session__column">
              <TaskDetails
                heading="Your task"
                task={task}
                emptyText="Your host has not written a task for this round. It appears here as soon as they do."
              />

              <ActivityCards
                activities={activities}
                view={view}
                participantUUID={participantUUID}
                onOpen={(activity) => setOpenActivityId(activity.id)}
              />
            </section>

            <div className="bw-session__column bw-room-layout__side">
              {/* As tall as the "Your task" label, so the first card lines up with the task card. */}
              <span className="bw-section-label bw-room-layout__spacer" aria-hidden>
                &nbsp;
              </span>
              {task && task.checklist.length > 0 ? (
                <SharedChecklist title="Checklist" items={task.checklist} ticks={view?.ticks} onTick={(itemId, done) => void setTick(itemId, done)} />
              ) : null}
              <RoomPeople heading="In this room" people={people} selfUUID={participantUUID} />
              {live?.round ? <RoomStatusPicker current={roomStatus.current} onChoose={(status) => void tellHost(status)} /> : null}
            </div>
          </div>
        </div>
      </PageFrame>
      {openActivity?.kind === "individual" ? (
        <AnswerModal activity={openActivity} responses={responses} onClose={() => setOpenActivityId(null)} />
      ) : null}
      {reminder}
      {overlay}
    </>
  );
}
