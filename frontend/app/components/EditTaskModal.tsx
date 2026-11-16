"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { hasBadLinks, tidyTask, type useRoundTasks } from "@/lib/use-round-tasks";
import type { RoomTask } from "@/types/breakout";

import TaskFields from "./TaskFields";
import { Button, Modal } from "./ui";

/**
 * Editing the running round's task without leaving the live screen.
 *
 * The full task page is deliberately not reused here: its back and next buttons
 * lead into other rounds' drafts, which a host must not edit while a round is
 * running.
 *
 * Edits stay in this panel until Done sends them, so the rooms get one finished
 * task, not every keystroke. While there are unsent edits, Escape and a click
 * outside do nothing: Done sends them, and Discard, at the other end of the panel
 * so neither is pressed by mistake, drops them.
 */
export default function EditTaskModal({
  roundTitle,
  tasks,
  onClose,
}: {
  roundTitle: string;
  tasks: ReturnType<typeof useRoundTasks>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<RoomTask | null>(null);
  const [sending, setSending] = useState(false);
  // Set once the edits are sent or discarded, so the close that follows is let through.
  const settled = useRef(false);
  const shown = draft ?? tasks.task;
  // A line that is not a link counts as unsent too: tidying would drop it unseen.
  const unsent =
    draft !== null && (hasBadLinks(draft) || JSON.stringify(tidyTask(draft)) !== JSON.stringify(tidyTask(tasks.task)));

  /** Sends the edits; a failed send is reported by the hook and leaves the panel open. */
  async function done(close: () => void) {
    if (!unsent) return close();
    if (hasBadLinks(shown)) {
      toast.error("A resource is not a web link.", {
        description: "Fix it or remove it, then press Done again.",
      });
      return;
    }
    setSending(true);
    const next = tidyTask(shown);
    const saved = await tasks.save(next);
    setSending(false);
    if (!saved) return;
    tasks.setTask(next);
    settled.current = true;
    toast.success("Task sent to every room.", {
      description: "Participants now see the new goal, steps, checklist and links.",
    });
    close();
  }

  function discard(close: () => void) {
    settled.current = true;
    close();
  }

  return (
    <Modal
      label={`Task for ${roundTitle}`}
      placement="top"
      panelClassName="bw-task-panel"
      locked={sending}
      beforeClose={async () => settled.current || !unsent}
      onClose={onClose}
    >
      {(close) => (
        <>
          <header className="bw-overlay__header">
            <div className="bw-round-heading">
              <span className="bw-modal-title">Task - {roundTitle}</span>
            </div>
            <div className="bw-header-spacer" />
            <Button size="sm" busy={sending} disabled={tasks.state === "loading"} onClick={() => void done(close)}>
              Done
            </Button>
          </header>

          <div className="bw-overlay__body">
            {tasks.state === "loading" ? (
              <span style={{ fontSize: "var(--bw-fs-meta)", color: "var(--bw-muted-2)" }}>Loading the task…</span>
            ) : (
              // Nothing saves while typing: Done sends the whole task at once.
              <TaskFields task={shown} setTask={setDraft} save={() => {}} />
            )}
          </div>

          {/* Always there, so the panel does not grow when the first edit is made. */}
          <footer className="bw-overlay__footer">
            <Button
              variant="ghost"
              size="sm"
              className="bw-button--danger-text"
              disabled={!unsent || sending}
              onClick={() => discard(close)}
            >
              Discard changes
            </Button>
          </footer>
        </>
      )}
    </Modal>
  );
}
