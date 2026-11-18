import PresencePill from "./PresencePill";
import { BrandMark } from "./ui";

/** The app's own top bar, for the host's landing and every participant page outside a room. */
export default function HomeBar({ people }: { people: number | null }) {
  return (
    <header className="bw-header bw-header--landing">
      <BrandMark />
      <span className="bw-header-title">Breakout Workspace</span>
      <PresencePill count={people} />
    </header>
  );
}
