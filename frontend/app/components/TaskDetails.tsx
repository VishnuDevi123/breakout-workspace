"use client";

import { useState } from "react";

import { notice } from "@/lib/notice";
import type { RoomTask } from "@/types/breakout";

import { Card, SectionLabel } from "./ui";

/**
 * A room's task as participants read it: one card with the goal, the instructions
 * as numbered steps, and the host's links as tiles when there are any.
 */
export default function TaskDetails({
  heading,
  task,
  emptyText,
}: {
  heading: string;
  task: RoomTask | null;
  emptyText: string;
}) {
  return (
    <>
      <SectionLabel>{heading}</SectionLabel>
      <Card className="bw-room-task">
        {!task ? <p className="bw-task-empty">{emptyText}</p> : null}
        {task?.goal ? <h2 className="bw-task-goal">{task.goal}</h2> : null}

        {task && task.instructions.length > 0 ? (
          <ol className="bw-steps">
            {task.instructions.map((line, index) => (
              <li className="bw-steps__item" key={`${index}:${line}`}>
                <span className="bw-steps__number" aria-hidden>
                  {index + 1}
                </span>
                <span className="bw-steps__text">{line}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {task && task.resources.length > 0 ? (
          <div className="bw-links">
            <SectionLabel>Resources</SectionLabel>
            <div className="bw-links__grid">
              {/* By position too: a task saved before links were checked may repeat one. */}
              {task.resources.map((resource, index) => (
                <ResourceTile key={`${index}:${resource}`} resource={resource} />
              ))}
            </div>
          </div>
        ) : null}
      </Card>
    </>
  );
}

/**
 * One host-supplied link: the site's icon, a readable title from the address and
 * the domain. A tap copies the link: Zoom's app panel opens no browser tabs, so the
 * participant pastes it into their browser. Anything that is not a URL shows as text.
 */
function ResourceTile({ resource }: { resource: string }) {
  const url = parseLink(resource);
  if (!url) {
    return (
      <div className="bw-link">
        <span className="bw-link__icon" aria-hidden>
          🔗
        </span>
        <span className="bw-link__text">
          <span className="bw-link__title" title={resource}>
            {resource}
          </span>
        </span>
      </div>
    );
  }

  const domain = url.hostname.replace(/^www\./, "");
  const title = linkTitle(url);
  return (
    <button
      type="button"
      className="bw-link bw-card-interactive"
      title={`Copy ${url.href}`}
      onClick={async () => {
        const copied = await copyText(url.href);
        notice(copied ? "Link copied. Paste it in your browser." : "Couldn't copy the link.", { icon: copied ? "🔗" : "⚠️" });
      }}
    >
      <Favicon origin={url.origin} />
      <span className="bw-link__text">
        <span className="bw-link__title">{title ?? domain}</span>
        {title ? <span className="bw-link__domain">{domain}</span> : null}
      </span>
      <span className="bw-link__open">Copy</span>
    </button>
  );
}

/** Puts text on the clipboard; the old copy command where the Clipboard API is missing or refused. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  }
}

/** The site's own icon; the link emoji when it has none or it cannot load. */
function Favicon({ origin }: { origin: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="bw-link__icon" aria-hidden>
        🔗
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a tiny icon from another site, nothing to optimise
    <img className="bw-link__icon" src={`${origin}/favicon.ico`} alt="" onError={() => setFailed(true)} />
  );
}

function parseLink(resource: string): URL | null {
  if (!/^https?:\/\//i.test(resource)) return null;
  try {
    return new URL(resource);
  } catch {
    return null;
  }
}

/** Path ends that name a page type, not the page ("…/d/1abc/edit"). */
const GENERIC_SEGMENTS = new Set(["edit", "view", "preview", "index", "watch", "home", "open", "share"]);

/** The last part of the path, as words ("team-goals.pdf" is "team goals"); null when it names nothing. */
function linkTitle(url: URL): string | null {
  const last = url.pathname.split("/").filter(Boolean).at(-1);
  if (!last || GENERIC_SEGMENTS.has(last.toLowerCase().replace(/\.[a-z]+$/, ""))) return null;
  let words = last;
  try {
    words = decodeURIComponent(last);
  } catch {
    // Keep the raw segment.
  }
  words = words.replace(/\.[a-z0-9]{1,5}$/i, "").replace(/[-_+]+/g, " ").trim();
  // Ids ("1aBcD9xYz…") read as noise; the domain is clearer.
  return /[a-z]{3}/i.test(words) && !/^[A-Za-z0-9]{16,}$/.test(words) ? words : null;
}
