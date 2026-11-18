"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { noteEditTint } from "@/lib/activity-kinds";
import type { useRoomResponses } from "@/lib/use-room-responses";
import { MAX_IDEA_LENGTH, type CheckListItem, type IdeaBoardActivity, type IdeaNote } from "@/types/breakout";

import IdeaCard from "./IdeaCard";
import RoomPeople from "./RoomPeople";
import SharedChecklist from "./SharedChecklist";
import { Button, SectionLabel } from "./ui";


/**
 * The room's shared board: "← All activities", the prompt in a card tinted like the
 * activity, the box to add an idea, then everyone's notes newest first, with an
 * All / Mine filter. Only a note's author can edit or remove it. The right column
 * shows how many ideas each person has added, then the task's shared checklist.
 */
export default function IdeaBoardPanel({
  activity,
  members,
  participantUUID,
  checklist,
  responses,
  onBack,
}: {
  activity: IdeaBoardActivity;
  members: { participantUUID: string; name: string; fullName?: string }[];
  participantUUID: string;
  checklist: CheckListItem[];
  responses: ReturnType<typeof useRoomResponses>;
  onBack: () => void;
}) {
  const { view, addIdea, editIdea, removeIdea, setTick } = responses;
  const [onlyMine, setOnlyMine] = useState(false);
  const notes = view?.ideas[activity.id] ?? [];
  // Notes are stored oldest first; the newest leads here.
  const shown = [...notes].reverse().filter((note) => !onlyMine || note.participantUUID === participantUUID);
  // A board counts as done for someone once they have added a note.
  const people = members.map((member) => {
    const count = notes.filter((note) => note.participantUUID === member.participantUUID).length;
    return { ...member, status: count > 0 ? `${count} ${count === 1 ? "idea" : "ideas"}` : "No ideas yet", tone: count > 0 ? "done" : "idle" } as const;
  });

  return (
    <>
      <section className="bw-session__column">
        {/* Same back link as the host's room results ("← All rooms"). */}
        <button type="button" className="bw-results__back" onClick={onBack}>
          ← All activities
        </button>
        <header className="bw-board__prompt">
          <span className="bw-board__kind">Shared response · idea board</span>
          <h2 className="bw-board__question">{activity.title}</h2>
          {activity.description ? <p className="bw-board__details">{activity.description}</p> : null}
        </header>

        <AddIdea onAdd={(text) => addIdea(activity.id, text)} />

        <div className="bw-board__head">
          <SectionLabel>Ideas</SectionLabel>
          <span className="bw-activity-count">{notes.length}</span>
          <div className="bw-segmented" role="group" aria-label="Which ideas to show">
            <button type="button" className="bw-segmented__option" aria-pressed={!onlyMine} onClick={() => setOnlyMine(false)}>
              All
            </button>
            <button type="button" className="bw-segmented__option" aria-pressed={onlyMine} onClick={() => setOnlyMine(true)}>
              Mine
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="bw-act-list__empty">{onlyMine ? "You have not added an idea yet." : "No ideas yet. Add the first one."}</p>
        ) : null}
        <div className="bw-ideas">
          {shown.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              own={note.participantUUID === participantUUID}
              onSave={(title, description) => editIdea(activity.id, note.id, title, description)}
              onRemove={() => removeIdea(activity.id, note.id)}
            />
          ))}
        </div>

      </section>

      <div className="bw-session__column bw-room-layout__side">
        {/* As tall as "← All activities", so the people card starts level with the prompt. */}
        <span className="bw-results__back bw-room-layout__spacer" aria-hidden>
          &nbsp;
        </span>
        <RoomPeople heading="Working on this board" people={people} selfUUID={participantUUID} />
        <SharedChecklist title="Checklist" items={checklist} ticks={view?.ticks} onTick={(itemId, done) => void setTick(itemId, done)} />
      </div>
    </>
  );
}

/**
 * The box to add an idea, above the notes: it grows with the text, Enter adds,
 * Shift + Enter starts a new line. The text stays if the add fails.
 */
function AddIdea({ onAdd }: { onAdd: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);

  // One line to start, taller as the idea wraps; measured again when the box narrows or widens.
  useLayoutEffect(() => {
    const box = field.current;
    if (!box) return;
    const fit = () => {
      box.style.height = "auto";
      box.style.height = `${box.scrollHeight}px`;
    };
    fit();
    let width = box.clientWidth;
    const observer = new ResizeObserver(() => {
      if (box.clientWidth === width) return;
      width = box.clientWidth;
      fit();
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [text]);

  async function add() {
    if (!text.trim() || adding) return;
    setAdding(true);
    if (await onAdd(text.trim())) setText("");
    setAdding(false);
    field.current?.focus();
  }

  return (
    <div className="bw-board__new">
      <div className="bw-input bw-input--within bw-board__add">
        <textarea
          ref={field}
          className="bw-board__field"
          rows={1}
          value={text}
          maxLength={MAX_IDEA_LENGTH}
          placeholder="Add an idea…"
          aria-label="New idea"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            void add();
          }}
        />
        <span className="bw-board__count">
          {text.length} / {MAX_IDEA_LENGTH}
        </span>
        <Button size="sm" disabled={!text.trim()} busy={adding} onClick={() => void add()}>
          Add idea
        </Button>
      </div>
    </div>
  );
}

/** One sticky note. Editing happens in place; removing asks for a second click. */
function NoteCard({
  note,
  own,
  onSave,
  onRemove,
}: {
  note: IdeaNote;
  own: boolean;
  onSave: (title: string, description: string) => Promise<boolean>;
  onRemove: () => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [description, setDescription] = useState(note.description);
  const [saving, setSaving] = useState(false);

  // Only the idea's text is edited; its title stays as it is.
  async function save() {
    if (!description.trim() || saving) return;
    setSaving(true);
    if (await onSave(note.title, description.trim())) setEditing(false);
    setSaving(false);
  }

  if (editing) {
    return (
      // The note itself becomes the text box: white, an accent edge, the text in place.
      <div className="bw-idea bw-idea--editing" style={noteEditTint(note.color)}>
        <textarea
          className="bw-idea__edit"
          aria-label="Edit idea"
          autoFocus
          maxLength={MAX_IDEA_LENGTH}
          value={description}
          onFocus={(event) => event.currentTarget.setSelectionRange(description.length, description.length)}
          onChange={(event) => setDescription(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setEditing(false);
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            void save();
          }}
        />
        <div className="bw-idea__edit-actions">
          <Button size="sm" disabled={!description.trim()} busy={saving} onClick={() => void save()}>
            Save
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <IdeaCard
      note={note}
      authorLabel={own ? "You" : undefined}
      actions={
        own ? (
          confirming ? (
            <>
              <button className="bw-note__action" onClick={() => setConfirming(false)}>
                Keep
              </button>
              <button className="bw-note__action bw-note__action--danger" onClick={() => void onRemove()}>
                Remove?
              </button>
            </>
          ) : (
            <>
              <button
                className="bw-note__action"
                onClick={() => {
                  setDescription(note.description);
                  setEditing(true);
                }}
              >
                Edit
              </button>
              <button className="bw-note__action" onClick={() => setConfirming(true)}>
                Remove
              </button>
            </>
          )
        ) : null
      }
    />
  );
}
