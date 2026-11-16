import PersonPill from "./PersonPill";
import { Card, SectionLabel } from "./ui";

/** A status pill's colour: green when done, blue while working, grey before anything. */
export type PersonTone = "done" | "working" | "idle";

/** `memberStatus` lines and their tones. */
export const MEMBER_TONES: Record<"Submitted" | "Working" | "Not started", PersonTone> = {
  Submitted: "done",
  Working: "working",
  "Not started": "idle",
};

export interface RoomPerson {
  participantUUID: string;
  /** "You" for the caller. */
  name: string;
  /** The person's own name, shown for the caller with "(you)". */
  fullName?: string;
  /** Short progress text, or null when there is nothing to track. */
  status: string | null;
  tone: PersonTone;
}

/**
 * A participant screen's people card: initials, name, and a status pill on the right.
 * Each person keeps their own colour, the same as on every other screen.
 */
export default function RoomPeople({
  heading,
  people,
  selfUUID,
}: {
  heading: string;
  people: RoomPerson[];
  selfUUID: string;
}) {
  return (
    <Card className="bw-people" aria-label={heading}>
      <div className="bw-people__header">
        <SectionLabel>{heading}</SectionLabel>
        <span className="bw-people__count">
          {people.length} {people.length === 1 ? "person" : "people"}
        </span>
      </div>
      {people.map((person) => {
        const name = person.fullName ?? person.name;
        const self = person.participantUUID === selfUUID;
        return (
          <div className="bw-people__row" key={person.participantUUID}>
            <PersonPill participantUUID={person.participantUUID} name={name} className="bw-initials" />
            <span className="bw-people__name" title={name}>
              {name}
            </span>
            {self ? <span className="bw-people__you">(you)</span> : null}
            {person.status ? (
              <span className={`bw-people__status bw-people__status--${person.tone}`}>{person.status}</span>
            ) : null}
          </div>
        );
      })}
    </Card>
  );
}
