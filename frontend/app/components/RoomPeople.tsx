import PersonPill from "./PersonPill";
import { SectionLabel } from "./ui";

export interface RoomPerson {
  participantUUID: string;
  name: string;
  /** The person's own name when `name` is "You", for their initials. */
  fullName?: string;
  /** Short progress text, or null when there is nothing to track. */
  status: string | null;
  done: boolean;
}

/**
 * A participant screen's people list, laid out like the host's People column:
 * initials, full name, and progress on the right. Each person keeps their own
 * colour, the same as on every other screen.
 */
export default function RoomPeople({ heading, people }: { heading: string; people: RoomPerson[] }) {
  return (
    <section className="bw-session__column" aria-label={heading}>
      <SectionLabel>{heading}</SectionLabel>
      {people.map((person) => (
        <div className="bw-results__person" key={person.participantUUID}>
          <PersonPill participantUUID={person.participantUUID} name={person.fullName ?? person.name} className="bw-initials" />
          <span className="bw-results__person-name" title={person.name}>
            {person.name}
          </span>
          {person.status ? (
            <span className={`bw-room-member__status bw-room-member__status--${person.done ? "done" : "open"}`}>
              {person.status}
            </span>
          ) : null}
        </div>
      ))}
    </section>
  );
}
