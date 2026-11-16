"use client";

import type { ReactNode } from "react";

import { noteTint } from "@/lib/activity-kinds";
import type { IdeaNote } from "@/types/breakout";

import PersonPill from "./PersonPill";

/** A default note title ("Idea 3") says nothing the note's number does not. */
const DEFAULT_NOTE_TITLE = /^Idea \d+$/;

/**
 * One idea, as both the room's board and the host's page show it: a light tint of the
 * note's colour, its own title if the author gave one, the text (six lines at most,
 * the rest on hover), then the author, any actions and (for the host) the note's number.
 */
export default function IdeaCard({
  note,
  number,
  authorLabel,
  latest = false,
  actions,
}: {
  note: IdeaNote;
  /** Its place in the order the room added notes, from 1. Shown on the host's page only. */
  number?: number;
  /** "You" for the caller's own notes. */
  authorLabel?: string;
  /** Outlined: the newest note on the host's page. */
  latest?: boolean;
  /** Edit and Remove on the author's own note. */
  actions?: ReactNode;
}) {
  const titled = !DEFAULT_NOTE_TITLE.test(note.title);
  const author = authorLabel ?? note.authorName;

  return (
    <article className={`bw-idea${latest ? " bw-idea--latest" : ""}`} style={noteTint(note.color)}>
      {titled ? (
        <span className="bw-idea__title" title={note.title}>
          {note.title}
        </span>
      ) : null}
      <p className="bw-idea__text" title={note.description}>
        {note.description || note.title}
      </p>
      <div className="bw-idea__footer">
        <IdeaAuthor participantUUID={note.participantUUID} name={note.authorName} label={author} />
        {actions ? <span className="bw-idea__actions">{actions}</span> : null}
        {number ? <span className="bw-idea__number">#{number}</span> : null}
      </div>
    </article>
  );
}

/** Initials in the person's colour, then their name. */
export function IdeaAuthor({ participantUUID, name, label }: { participantUUID: string; name: string; label?: string }) {
  return (
    <>
      <PersonPill participantUUID={participantUUID} name={name} className="bw-avatar" />
      <span className="bw-idea__author" title={label ?? name}>
        {label ?? name}
      </span>
    </>
  );
}
