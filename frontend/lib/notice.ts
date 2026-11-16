import { toast } from "sonner";

/**
 * A short white note at the bottom middle, for a participant's own tap: a status
 * sent to the host, a link copied. Styled inline, so it wins over the Toaster's
 * rich colours.
 */
export function notice(text: string, options: { icon: string; action?: { label: string; onClick: () => void } }) {
  toast(text, {
    icon: options.icon,
    position: "bottom-center",
    duration: 4000,
    closeButton: false,
    style: { background: "var(--bw-surface)", borderColor: "var(--bw-border)", color: "var(--bw-ink)", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)" },
    actionButtonStyle: { background: "none", fontWeight: 600, color: "var(--bw-accent)" },
    action: options.action,
  });
}
