"use client";

import { useEffect, useRef, useState } from "react";

import { initialsFrom, personColor } from "@/lib/participant-status";
import type { Activity, CheckListItem, PlannedRoom, RoomResponsesHostView } from "@/types/breakout";

import ActivityCard, { type ActivityProgressBar } from "./ActivityCard";
import SharedChecklist from "./SharedChecklist";
import { Card, SectionLabel, StatusDot } from "./ui";

/** Where a planned person is while rooms are open. */
export type RoomPresence = "room" | "main" | "elsewhere" | "left";

const PRESENCE_LABELS: Record<RoomPresence, string> = {
  room: "In room",
  main: "In main meeting",
  elsewhere: "In another room",
  left: "Not joined",
};

export interface RoomPerson {
  participantUUID: string;
  name: string;
  /** Null once the rooms are closed: everyone is back in the main room. */
  presence: RoomPresence | null;
}

/**
 * One room's work for the host. A bar to step between rooms on top; then the room's
 * people on the left, and its checklist and activities on the right. Submissions
 * open from an activity card, so this page stays readable however much a room wrote.
 */
export default function RoomResultsPage({
  room,
  position,
  roomCount,
  onStep,
  people,
  presentCount,
  otherRooms,
  onMove,
  checklist,
  activities,
  results,
  onBack,
  onOpenActivity,
}: {
  room: PlannedRoom;
  /** Zero-based place of this room in the round. */
  position: number;
  roomCount: number;
  /** -1 for the room before, 1 for the one after. */
  onStep: (step: -1 | 1) => void;
  /** Everyone the plan puts in this room; names are for information only. */
  people: RoomPerson[];
  presentCount: number;
  /** Rooms someone can be moved to; empty once the rooms are closed. */
  otherRooms: PlannedRoom[];
  /** `roomName` null sends the person back to the main meeting. */
  onMove: (person: RoomPerson, roomName: string | null) => void;
  checklist: CheckListItem[];
  activities: Activity[];
  results: RoomResponsesHostView | null;
  onBack: () => void;
  onOpenActivity: (activityId: string) => void;
}) {
  // One menu open at a time, by person.
  const [movingId, setMovingId] = useState<string | null>(null);

  return (
    <div className="bw-room-page">
      <div className="bw-room-nav">
        <div className="bw-room-nav__pager">
          <button
            type="button"
            className="bw-room-nav__step"
            aria-label="Previous room"
            disabled={position <= 0}
            onClick={() => onStep(-1)}
          >
            ‹
          </button>
          <StatusDot color={room.dot} />
          <span className="bw-room-nav__name" title={room.name}>
            {room.name}
          </span>
          <span className="bw-room-nav__of">of {roomCount}</span>
          <button
            type="button"
            className="bw-room-nav__step"
            aria-label="Next room"
            disabled={position >= roomCount - 1}
            onClick={() => onStep(1)}
          >
            ›
          </button>
        </div>
        <button type="button" className="bw-room-nav__all" onClick={onBack}>
          All rooms
        </button>
      </div>

      <div className="bw-results__split">
        <Card className="bw-room-people" aria-label="People in this room">
          <div className="bw-room-people__header">
            <SectionLabel>People</SectionLabel>
            <span className="bw-room-people__count">
              {presentCount} of {people.length} here
            </span>
          </div>
          {people.length === 0 ? <span className="bw-results__meta">Nobody planned here</span> : null}
          {people.map((person) => (
            <PersonRow
              key={person.participantUUID}
              person={person}
              otherRooms={otherRooms}
              menuOpen={movingId === person.participantUUID}
              onMenu={(open) => setMovingId(open ? person.participantUUID : null)}
              onMove={(roomName) => {
                setMovingId(null);
                onMove(person, roomName);
              }}
            />
          ))}
        </Card>

        <section className="bw-results__work">
          <SharedChecklist title="Checklist" items={checklist} ticks={results?.ticks} />
          <SectionLabel>Activities</SectionLabel>
          {activities.length === 0 ? (
            <Card tone="dashed" className="bw-activity-empty">No activities in this round.</Card>
          ) : null}
          {activities.map((activity, index) => (
            <ActivityCard
              key={activity.id}
              mode="monitor"
              activity={activity}
              index={index}
              progress={progressOf(activity, people.length, results)}
              onOpen={() => onOpenActivity(activity.id)}
            />
          ))}
        </section>
      </div>
    </div>
  );
}

/** One planned person: avatar, name, where they are, and the move menu while rooms are open. */
function PersonRow({
  person,
  otherRooms,
  menuOpen,
  onMenu,
  onMove,
}: {
  person: RoomPerson;
  otherRooms: PlannedRoom[];
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onMove: (roomName: string | null) => void;
}) {
  const color = personColor(person.participantUUID);
  const away = person.presence === "left";
  // Someone who left the meeting cannot be moved; nobody can be moved once rooms close.
  const movable = otherRooms.length > 0 && person.presence !== null && !away;

  return (
    <div className={`bw-room-person${away ? " bw-room-person--away" : ""}`}>
      <span className="bw-initials bw-room-person__avatar" style={{ color, background: `${color}1f` }} aria-hidden>
        {initialsFrom(person.name)}
      </span>
      <span className="bw-room-person__text">
        <span className="bw-room-person__name" title={person.name}>
          {person.name}
        </span>
        {person.presence ? (
          <span className={`bw-room-person__status${person.presence === "room" ? " bw-room-person__status--in" : ""}`}>
            {PRESENCE_LABELS[person.presence]}
          </span>
        ) : null}
      </span>
      {movable ? (
        <MoveMenu
          person={person}
          otherRooms={otherRooms}
          open={menuOpen}
          onOpenChange={onMenu}
          onMove={onMove}
        />
      ) : null}
    </div>
  );
}

/** The ⇄ button and its menu: every other room, then the main meeting. Closes on a pick, Escape or a click outside. */
function MoveMenu({
  person,
  otherRooms,
  open,
  onOpenChange,
  onMove,
}: {
  person: RoomPerson;
  otherRooms: PlannedRoom[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (roomName: string | null) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const firstName = person.name.trim().split(/\s+/)[0] || person.name;
  // The latest callback, so live updates re-rendering the page do not re-run the effect below.
  const change = useRef(onOpenChange);
  useEffect(() => {
    change.current = onOpenChange;
  });

  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    function onPointer(event: PointerEvent) {
      if (!wrap.current?.contains(event.target as Node)) change.current(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      change.current(false);
      button.current?.focus();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="bw-move" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="bw-move__button"
        aria-label={`Move ${person.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        ⇄
      </button>
      {open ? (
        <div className="bw-move__menu" role="menu" aria-label={`Move ${firstName} to`}>
          <span className="bw-move__title" title={`Move ${firstName} to`}>
            Move {firstName} to
          </span>
          {otherRooms.map((other) => (
            <button
              key={other.id}
              type="button"
              role="menuitem"
              className="bw-move__item"
              onClick={() => onMove(other.name)}
            >
              <StatusDot color={other.dot} />
              <span className="bw-move__room" title={other.name}>
                {other.name}
              </span>
              <span className="bw-move__count">
                {other.participantUUIDs.length} {other.participantUUIDs.length === 1 ? "person" : "people"}
              </span>
            </button>
          ))}
          {person.presence !== "main" ? (
            <>
              <span className="bw-move__divider" aria-hidden />
              <button type="button" role="menuitem" className="bw-move__item" onClick={() => onMove(null)}>
                <span className="bw-move__icon" aria-hidden>
                  ↩
                </span>
                <span className="bw-move__room">Main meeting</span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** How far the room is on one activity: submitted answers, or people who added an idea. */
function progressOf(
  activity: Activity,
  peopleCount: number,
  results: RoomResponsesHostView | null,
): ActivityProgressBar {
  if (activity.kind === "individual") {
    const answers = Object.values(results?.answers[activity.id] ?? {});
    const submitted = answers.filter((answer) => answer.status === "submitted").length;
    return { done: submitted, total: peopleCount, text: `${submitted} of ${peopleCount} submitted` };
  }
  const notes = results?.ideas[activity.id] ?? [];
  const authors = new Set(notes.map((note) => note.participantUUID)).size;
  return {
    done: authors,
    total: peopleCount,
    text: `${notes.length} ${notes.length === 1 ? "idea" : "ideas"} from ${authors} ${authors === 1 ? "person" : "people"}`,
  };
}
