import { Pill, StatusDot } from "./ui";

/** How many people are with the viewer, behind a green dot; null while the live stream connects. */
export default function PresencePill({ count }: { count: number | null }) {
  const text = count === null ? "connecting…" : `${count} ${count === 1 ? "person" : "people"}`;
  return (
    <Pill tone="outline" className="bw-presence">
      <StatusDot color="var(--bw-green)" round /> {text}
    </Pill>
  );
}
