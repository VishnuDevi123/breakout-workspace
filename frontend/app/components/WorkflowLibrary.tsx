"use client";

import { useEffect, useRef, useState } from "react";

import { formatClock } from "@/lib/round-clock";
import { ROUND_TEMPLATES, sampleSnapshot } from "@/lib/round-templates";
import { useScrollReveal } from "@/lib/use-scroll-reveal";
import type { PastWorkflow, SavedTemplate, WorkflowSnapshot } from "@/types/breakout";

import SaveTemplateModal, { plural } from "./SaveTemplateModal";
import { Button, ConfirmModal } from "./ui";

function roomCount(workflow: WorkflowSnapshot): number {
  return workflow.rounds.reduce((sum, round) => sum + round.roomNames.length, 0);
}

function activityCount(workflow: WorkflowSnapshot): number {
  return workflow.rounds.reduce((sum, round) => sum + round.activities.length, 0);
}

/**
 * One workflow in a list: name, a summary line, its actions. With `onOpen` the whole
 * card is clickable: the name is a button stretched over the card, under `action`.
 */
function LibraryRow({
  title,
  meta,
  action,
  onOpen,
  busy,
}: {
  title: string;
  meta: string;
  action?: React.ReactNode;
  onOpen?: () => void;
  busy?: boolean;
}) {
  return (
    <div className={`bw-card bw-library-row${onOpen ? " bw-card-interactive" : ""}`}>
      <div className="bw-library-row__text">
        {onOpen ? (
          <button type="button" className="bw-library-row__title bw-card-open" disabled={busy} aria-label={`Use ${title}`} onClick={onOpen}>
            {title}
          </button>
        ) : (
          <span className="bw-library-row__title">{title}</span>
        )}
        <span className="bw-library-row__meta">{meta}</span>
      </div>
      {action}
    </div>
  );
}

type LibraryTab = "templates" | "saved" | "past";

function tabLabel(label: string, count: number): string {
  return count > 0 ? `${label} · ${count}` : label;
}

/**
 * Landing lists as tabs: samples and saved templates (use), past workflows
 * (save as template). Using one over an existing workflow asks first.
 */
export default function WorkflowLibrary({
  past,
  savedPastIds,
  templates,
  hasWorkflow,
  busy,
  onSavePast,
  onDeleteTemplate,
  onUse,
}: {
  past: PastWorkflow[];
  savedPastIds: string[];
  templates: SavedTemplate[];
  /** True when a workflow is being built, so using a template replaces it. */
  hasWorkflow: boolean;
  busy: boolean;
  onSavePast: (pastWorkflowId: string) => Promise<void>;
  /** Reports its own errors. */
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onUse: (snapshot: WorkflowSnapshot) => Promise<void>;
}) {
  const [saving, setSaving] = useState<PastWorkflow | null>(null);
  const [replacing, setReplacing] = useState<WorkflowSnapshot | null>(null);
  const [deleting, setDeleting] = useState<SavedTemplate | null>(null);
  const [tab, setTab] = useState<LibraryTab>("templates");
  const scrollReveal = useScrollReveal();
  const slotRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // The box sits in a fixed slot, so the centred page above never moves with the tab.
  // A longer list grows the box down into the free space under the slot, to the bottom
  // of the scrolling page, and scrolls inside from there.
  useEffect(() => {
    const slot = slotRef.current;
    const box = boxRef.current;
    const page = slot?.closest(".bw-main");
    if (!slot || !box || !(page instanceof HTMLElement)) return;
    const fit = () => {
      const top = slot.getBoundingClientRect().top - page.getBoundingClientRect().top + page.scrollTop;
      const bottom = page.clientHeight - parseFloat(getComputedStyle(page).paddingBottom);
      box.style.maxHeight = `${Math.max(slot.offsetHeight, Math.floor(bottom - top))}px`;
    };
    // Fires once on observe, then whenever the window or anything above the slot changes size.
    const observer = new ResizeObserver(fit);
    observer.observe(page);
    // The whole centred group: anything above the slot changing height moves the slot.
    observer.observe(slot.closest(".bw-landing") ?? slot);
    return () => observer.disconnect();
  }, []);
  const tabs: { id: LibraryTab; label: string }[] = [
    { id: "templates", label: "Templates" },
    { id: "saved", label: tabLabel("Saved", templates.length) },
    { id: "past", label: tabLabel("Past", past.length) },
  ];

  function use(snapshot: WorkflowSnapshot) {
    if (hasWorkflow) setReplacing(snapshot);
    else void onUse(snapshot);
  }

  return (
    <>
      <div ref={slotRef} className="bw-library-slot">
      <div ref={boxRef} className="bw-library">
        <div className="bw-tabs" role="tablist" aria-label="Workflow library">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className="bw-tabs__tab"
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Keyed by tab so a new list starts at its top. */}
        <div
          key={tab}
          className={tab === "templates" ? "bw-library-list bw-library-list--grid" : "bw-library-list"}
          role="tabpanel"
          {...scrollReveal}
        >
          {tab === "templates"
            ? ROUND_TEMPLATES.map((template) => (
                <LibraryRow
                  key={template.name}
                  title={template.name}
                  meta={`${plural(template.rounds.length, "round")} · ${formatClock(template.rounds.reduce((sum, round) => sum + round.durationSec, 0))}`}
                  busy={busy}
                  onOpen={() => use(sampleSnapshot(template))}
                />
              ))
            : null}

          {tab === "saved" && templates.length === 0 ? <p className="bw-library-empty">Saved workflows appear here.</p> : null}
          {tab === "saved"
            ? templates.map((template) => (
                <LibraryRow
                  key={template.id}
                  title={template.title}
                  meta={`${plural(template.rounds.length, "round")} · ${plural(roomCount(template), "room")} · ${plural(activityCount(template), "activity", "activities")}`}
                  busy={busy}
                  onOpen={() => use(template)}
                  action={
                    <div className="bw-library-row__actions">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="bw-button--danger-text"
                        disabled={busy}
                        onClick={() => setDeleting(template)}
                      >
                        Delete
                      </Button>
                    </div>
                  }
                />
              ))
            : null}

          {tab === "past" && past.length === 0 ? <p className="bw-library-empty">Workflows you end appear here.</p> : null}
          {tab === "past"
            ? past.map((workflow) => {
                const saved = savedPastIds.includes(workflow.id);
                return (
                  <LibraryRow
                    key={workflow.id}
                    title={workflow.title}
                    meta={`${plural(workflow.rounds.length, "round")} · ended ${new Date(workflow.endedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    action={
                      <Button variant="secondary" size="sm" disabled={saved} onClick={() => setSaving(workflow)}>
                        {saved ? "Saved" : "Save Workflow"}
                      </Button>
                    }
                  />
                );
              })
            : null}
        </div>
      </div>
      </div>

      {saving ? (
        <SaveTemplateModal
          title={saving.title}
          rounds={saving.rounds.length}
          rooms={roomCount(saving)}
          activities={activityCount(saving)}
          onConfirm={() => onSavePast(saving.id)}
          onClose={() => setSaving(null)}
        />
      ) : null}

      {deleting ? (
        <ConfirmModal
          title={`Delete ${deleting.title}?`}
          message="This saved template is removed and cannot be brought back."
          confirmLabel="Delete"
          onConfirm={() => onDeleteTemplate(deleting.id)}
          onClose={() => setDeleting(null)}
        />
      ) : null}

      {replacing ? (
        <ConfirmModal
          title="Replace your workflow?"
          message="The workflow you are building is replaced: its rounds, rooms, tasks and activities are removed."
          confirmLabel="Replace"
          onConfirm={() => onUse(replacing)}
          onClose={() => setReplacing(null)}
        />
      ) : null}
    </>
  );
}
