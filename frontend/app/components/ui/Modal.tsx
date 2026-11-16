"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Matches --bw-motion-fast, the closing animation in globals.css. */
const CLOSE_MS = 150;

/**
 * Centred dialog over the whole dimmed screen. Escape or a click on the dimmed
 * area closes it, unless `locked` (an action is still running).
 *
 * `children` receives `close`, so a Done button plays the same exit animation.
 * `beforeClose` may refuse, for example when a save fails and the edit must stay.
 *
 * Rendered into <body>: a container-query or animated ancestor would otherwise
 * become the box `position: fixed` measures from, leaving the header and navbar bright.
 */
export default function Modal({
  label,
  size = "md",
  placement = "center",
  panelClassName,
  panelStyle,
  locked = false,
  beforeClose,
  onClose,
  children,
}: {
  label: string;
  size?: "sm" | "md" | "lg";
  /** "top" for a panel whose height changes while it is open, so it grows downwards. */
  placement?: "center" | "top";
  /** Extra class on the panel, for a modal with its own look (the participant's poll and quiz card). */
  panelClassName?: string;
  /** CSS variables for the panel, e.g. a room's colour. The panel is portalled, so it inherits none from the page. */
  panelStyle?: CSSProperties;
  locked?: boolean;
  beforeClose?: () => Promise<boolean>;
  /** Called once the exit animation has finished; the caller unmounts the modal. */
  onClose: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [closing, setClosing] = useState(false);
  const pressStartedOnBackdrop = useRef(false);

  async function close() {
    if (locked || closing) return;
    if (beforeClose && !(await beforeClose())) return;
    setClosing(true);
    setTimeout(onClose, CLOSE_MS);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") void close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return createPortal(
    <div
      className={`bw-overlay${placement === "top" ? " bw-overlay--top" : ""}${closing ? " bw-overlay--closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      // Only a press that starts and ends on the backdrop closes the modal, so a
      // text selection dragged out of a field does not dismiss it.
      onMouseDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressStartedOnBackdrop.current && event.target === event.currentTarget) void close();
      }}
    >
      <div className={`bw-overlay__panel bw-overlay__panel--${size}${panelClassName ? ` ${panelClassName}` : ""}`} style={panelStyle}>{children(() => void close())}</div>
    </div>,
    document.body,
  );
}
