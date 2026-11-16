"use client";

import { useState } from "react";

import { roomProgress } from "@/lib/activity-kinds";
import { timeAgo, useNow } from "@/lib/round-clock";
import type { Activity, IdeaNote, IndividualAnswer, PlannedRoom, RoomResponsesHostView } from "@/types/breakout";

import PersonPill from "./PersonPill";
import { ProgressLine } from "./ActivityCard";
import IdeaCard, { IdeaAuthor } from "./IdeaCard";
import type { RoomPerson } from "./RoomResultsPage";
import RoomStepper from "./RoomStepper";
import { SectionLabel } from "./ui";

const TYPE_LABELS: Record<Activity["kind"], string> = {
  individual: "Individual response",
  ideaBoard: "Shared response · idea board",
};

/**
 * One activity in one room, for the host: a header tinted like the activity with the
 * room's progress, then the submitted answers or the board's ideas. The room stepper
 * shows the same activity in the other rooms.
 */
export default function ActivityResultsPage({
  activity,
  room,
  position,
  roomCount,
  onStep,
  people,
  results,
  onBack,
}: {
  activity: Activity;
  room: PlannedRoom;
  /** Zero-based place of this room in the round. */
  position: number;
  roomCount: number;
  onStep: (step: -1 | 1) => void;
  people: RoomPerson[];
  results: RoomResponsesHostView | null;
  onBack: () => void;
}) {
  const answers = results?.answers[activity.id] ?? {};
  const waiting = people.filter((person) => answers[person.participantUUID]?.status !== "submitted");

  return (
    <div className="bw-room-page">
      <div className="bw-room-nav">
        <button type="button" className="bw-room-nav__back" onClick={onBack} title={room.name}>
          ← {room.name}
        </button>
        <RoomStepper room={room} position={position} roomCount={roomCount} onStep={onStep} />
      </div>

      <section className={`bw-act-head bw-act-head--${activity.kind}`}>
        <span className="bw-act-head__type">{TYPE_LABELS[activity.kind]}</span>
        <h2 className="bw-act-head__question">{activity.title}</h2>
        {activity.description ? <p className="bw-act-head__details">{activity.description}</p> : null}
        <ProgressLine progress={roomProgress(activity, people.length, results, true)} />
        {activity.kind === "individual" && waiting.length > 0 ? (
          <div className="bw-act-head__waiting">
            <span>Waiting on</span>
            {waiting.map((person) => (
              <span className="bw-act-head__person" key={person.participantUUID}>
                <Avatar participantUUID={person.participantUUID} name={person.name} />
                <span className="bw-act-head__name" title={person.name}>
                  {person.name}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {activity.kind === "individual" ? (
        <Answers people={people} answers={answers} />
      ) : (
        <Ideas notes={results?.ideas[activity.id] ?? []} />
      )}
    </div>
  );
}

function Avatar({ participantUUID, name }: { participantUUID: string; name: string }) {
  return <PersonPill participantUUID={participantUUID} name={name} className="bw-avatar" />;
}

/** Submitted answers, newest or oldest first; the latest one is marked. */
function Answers({ people, answers }: { people: RoomPerson[]; answers: Record<string, IndividualAnswer> }) {
  const [newestFirst, setNewestFirst] = useState(true);
  const now = useNow(30_000);
  const nameOf = (uuid: string) => people.find((person) => person.participantUUID === uuid)?.name ?? "Participant";
  const submitted = Object.values(answers)
    .filter((answer) => answer.status === "submitted")
    .sort((a, b) => (a.savedAt ?? 0) - (b.savedAt ?? 0));
  const latestId = submitted.at(-1)?.participantUUID;
  const shown = newestFirst ? [...submitted].reverse() : submitted;

  return (
    <>
      <div className="bw-act-list__head">
        <SectionLabel>Answers</SectionLabel>
        <span className="bw-act-list__count">{submitted.length}</span>
        <select
          className="bw-act-list__control"
          aria-label="Order of answers"
          value={newestFirst ? "newest" : "oldest"}
          onChange={(event) => setNewestFirst(event.target.value === "newest")}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      {submitted.length === 0 ? <p className="bw-act-list__empty">No answers yet.</p> : null}
      {shown.map((answer) => {
        const name = nameOf(answer.participantUUID);
        return (
          <article
            key={answer.participantUUID}
            className={`bw-answer${answer.participantUUID === latestId ? " bw-answer--latest" : ""}`}
          >
            <div className="bw-answer__head">
              <Avatar participantUUID={answer.participantUUID} name={name} />
              <span className="bw-answer__name" title={name}>
                {name}
              </span>
              {answer.savedAt ? <span className="bw-answer__time">{timeAgo(answer.savedAt, now)}</span> : null}
            </div>
            <p className="bw-answer__text">{answer.text}</p>
          </article>
        );
      })}
    </>
  );
}

/** The board's notes, newest first, or grouped under each person. The newest is outlined. */
function Ideas({ notes }: { notes: IdeaNote[] }) {
  const [byPerson, setByPerson] = useState(false);
  // Notes are stored in the order they were added.
  const numbered = notes.map((note, index) => ({ note, number: index + 1 }));
  const newestFirst = [...numbered].reverse();
  const latestId = notes.at(-1)?.id;

  const groups: { participantUUID: string; name: string; items: typeof numbered }[] = [];
  for (const item of newestFirst) {
    const group = groups.find((entry) => entry.participantUUID === item.note.participantUUID);
    if (group) group.items.push(item);
    else groups.push({ participantUUID: item.note.participantUUID, name: item.note.authorName, items: [item] });
  }

  const grid = (items: typeof numbered) => (
    <div className="bw-ideas">
      {items.map(({ note, number }) => (
        <IdeaCard key={note.id} note={note} number={number} latest={note.id === latestId} />
      ))}
    </div>
  );

  return (
    <>
      <div className="bw-act-list__head">
        <SectionLabel>Ideas</SectionLabel>
        <span className="bw-act-list__count">{notes.length}</span>
        {notes.length > 0 ? (
          <button
            type="button"
            className="bw-act-list__control"
            aria-pressed={byPerson}
            onClick={() => setByPerson(!byPerson)}
          >
            {byPerson ? "Show all" : "Group by person"}
          </button>
        ) : null}
      </div>
      {notes.length === 0 ? <p className="bw-act-list__empty">No ideas yet.</p> : null}
      {byPerson
        ? groups.map((group) => (
            <section className="bw-ideas__group" key={group.participantUUID} aria-label={group.name}>
              <div className="bw-ideas__person">
                <IdeaAuthor participantUUID={group.participantUUID} name={group.name} />
                <span className="bw-act-list__count">{group.items.length}</span>
              </div>
              {grid(group.items)}
            </section>
          ))
        : grid(newestFirst)}
    </>
  );
}
