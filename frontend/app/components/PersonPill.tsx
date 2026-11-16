import { initialsFrom, personTint } from "@/lib/participant-status";

/**
 * A person's initials in their own colours (personTint), the same on every screen.
 * `className` sets the size: bw-initials, bw-avatar or bw-play__initials.
 * With `label`, the pill names the person to hover and screen readers; without, it is decoration.
 */
export default function PersonPill({
  participantUUID,
  name,
  className,
  label,
}: {
  participantUUID: string;
  /** The name the initials come from: the person's own, never "You". */
  name: string;
  className: string;
  label?: string;
}) {
  return (
    <span
      className={className}
      style={personTint(participantUUID)}
      {...(label ? { role: "img", "aria-label": label, title: label } : { "aria-hidden": true })}
    >
      {initialsFrom(name)}
    </span>
  );
}
