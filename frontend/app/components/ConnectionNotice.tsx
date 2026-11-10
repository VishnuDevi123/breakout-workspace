"use client";

import { useEffect, useState } from "react";

import { useLiveConnection } from "@/lib/use-live-state";

import { Spinner } from "./ui";

/** A normal connect or a quick reconnect finishes within this, so the notice never flashes. */
const SHOW_AFTER_MS = 3000;

/**
 * Shown while the live stream is down for more than a few seconds: on a cold start of
 * the free-tier backend, or while it restarts. The stream reconnects by itself and the
 * notice fades out once the first state arrives.
 */
export default function ConnectionNotice() {
  const { status, since } = useLiveConnection();
  const down = status === "connecting" || status === "lost";
  // The outage (by `since`) that has lasted SHOW_AFTER_MS.
  const [waitedFor, setWaitedFor] = useState(-1);

  useEffect(() => {
    if (!down) return;
    const timer = setTimeout(() => setWaitedFor(since), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [down, since]);

  const shown = down && waitedFor === since;
  return (
    <div className={`bw-connection${shown ? " bw-connection--shown" : ""}`} role="status" aria-hidden={!shown}>
      <span className="bw-connection__title">
        <Spinner /> {status === "connecting" ? "Connecting…" : "Reconnecting…"}
      </span>
      <span className="bw-connection__text">
        Breakout Workspace runs on free-tier hosting, so it can pause for a few seconds. Saved work is safe, and
        this page updates once the connection is back.
      </span>
    </div>
  );
}
