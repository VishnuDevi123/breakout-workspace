import HomeBar from "../HomeBar";
import { SectionLabel } from "../ui";

/** A full page that says what this person is waiting for. Shared by participants and co-hosts. */
export default function WaitingScreen({
  people,
  label,
  headline,
  lede,
  children,
}: {
  /** People with this viewer (peopleWith), for the bar. */
  people: number | null;
  /** A line above the headline, such as "You are a co-host". */
  label?: string;
  headline: string;
  lede: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bw-shell bw-shell--fit">
      <HomeBar people={people} />
      <div className="bw-body">
        <main className="bw-main bw-participant-main">
          {label ? <SectionLabel>{label}</SectionLabel> : null}
          <h2 className="bw-landing-title">{headline}</h2>
          <p className="bw-landing-lede bw-waiting-lede">{lede}</p>
          {children}
        </main>
      </div>
    </div>
  );
}
