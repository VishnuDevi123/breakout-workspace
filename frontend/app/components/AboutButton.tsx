"use client";

import { useEffect, useRef, useState } from "react";

import { openExternalUrl } from "@/lib/zoom-sdk";

import { Button } from "./ui";

const WEBSITE_URL = "https://breakout-workspace.vercel.app/";
const WEBSITE_HOST = "breakout-workspace.vercel.app";

/**
 * A round button fixed at the bottom right of the home pages. It opens a small
 * card about the app with a link to the website.
 */
export default function AboutButton() {
  const [open, setOpen] = useState(false);
  // Set when Zoom refuses to open the page, so the address shows for copying.
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // A click outside the card or Escape closes it.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function visit() {
    try {
      await openExternalUrl(WEBSITE_URL);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div ref={root} className="bw-about">
      {open ? (
        <div id="bw-about-card" className="bw-about__card" role="dialog" aria-label="About Breakout Workspace">
          <span className="bw-about__title">About Breakout Workspace</span>
          <p className="bw-about__text">
            Guides, features and answers for hosts and participants.
          </p>
          <Button size="sm" onClick={visit}>
            Visit the website ↗
          </Button>
          {failed ? (
            <p className="bw-about__fallback">
              Zoom could not open the page. Visit <span className="bw-about__host">{WEBSITE_HOST}</span> in your browser.
            </p>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        className="bw-about__button"
        aria-label="About Breakout Workspace"
        aria-expanded={open}
        aria-controls={open ? "bw-about-card" : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5.75 5.75a2.25 2.25 0 1 1 3.4 1.95c-.7.42-1.15.95-1.15 1.75v.55" fill="none" />
          <circle cx="8" cy="12.6" r="1.05" stroke="none" />
        </svg>
      </button>
    </div>
  );
}
