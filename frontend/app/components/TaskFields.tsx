"use client";

import { useEffect, useRef } from "react";

import {
  MAX_CHECKLIST_ITEM_LENGTH,
  MAX_CHECKLIST_ITEMS,
  MAX_TASK_GOAL_LENGTH,
  MAX_TASK_RESOURCES,
  MAX_TASK_STEP_LENGTH,
  MAX_TASK_STEPS,
  MAX_TASK_TEXT_LENGTH,
  type CheckListItem,
  type RoomTask,
  toHttpsLink,
} from "@/types/breakout";

import GrowingField from "./GrowingField";
import { SectionLabel } from "./ui";

/**
 * The task fields, shared by the round's task page and the panel the host
 * opens mid-round. Nothing here knows where it is rendered.
 *
 * Saving happens at the edges rather than on every keystroke: `setTask` reports
 * each edit, and `save` is called when a field is done with.
 */
export default function TaskFields({
  task,
  setTask,
  save,
}: {
  task: RoomTask;
  setTask: (task: RoomTask) => void;
  save: (task: RoomTask) => void;
}) {
  /** Blank rows are working space while typing; they are dropped on save. */
  function commitSteps(lines: string[]) {
    const next = { ...task, instructions: lines.map((line) => line.trim()).filter(Boolean) };
    setTask(next);
    save(next);
  }

  /**
   * A link is written out in full ("docs.google.com" becomes "https://docs.google.com/")
   * and a repeat is dropped. A line that is not a link stays on screen with its error,
   * but is never saved.
   */
  function commitLinks(lines: string[]) {
    const shown = [...new Set(lines.map((line) => toHttpsLink(line) ?? line.trim()).filter(Boolean))];
    setTask({ ...task, resources: shown });
    save({ ...task, resources: shown.filter((line) => toHttpsLink(line) !== null) });
  }

  /** Items keep their ids across edits: ticks are stored per item id. */
  function editChecklist(labels: string[]) {
    const checklist = labels.map((label, at) => ({
      id: task.checklist[at]?.id ?? crypto.randomUUID(),
      label,
    }));
    setTask({ ...task, checklist });
  }

  function commitChecklist(checklist: CheckListItem[]) {
    const next = {
      ...task,
      checklist: checklist
        .map((item) => ({ ...item, label: item.label.trim() }))
        .filter((item) => item.label),
    };
    setTask(next);
    save(next);
  }

  return (
    <>
      <div className="bw-field">
        <SectionLabel>Goal shown to every room</SectionLabel>
        <GrowingField
          className="bw-input bw-goal-input bw-goal-input--area"
          reserveFull
          value={task.goal}
          placeholder="What should this room achieve?"
          ariaLabel="Goal shown to every room"
          maxLength={MAX_TASK_GOAL_LENGTH}
          onChange={(goal) => setTask({ ...task, goal })}
          onBlur={() => save(task)}
        />
      </div>

      <div className="bw-field">
        <SectionLabel>Instructions</SectionLabel>
        <LineList
          lines={task.instructions}
          marker="number"
          addLabel="+ Add step"
          fullLabel={`Max ${MAX_TASK_STEPS} steps`}
          maxLines={MAX_TASK_STEPS}
          placeholder="One step per line"
          maxLength={MAX_TASK_STEP_LENGTH}
          onChange={(instructions) => setTask({ ...task, instructions })}
          onCommit={commitSteps}
          onRemove={(index) => commitSteps(task.instructions.filter((_, at) => at !== index))}
        />
      </div>

      <div className="bw-field">
        <SectionLabel>Checklist</SectionLabel>
        <LineList
          lines={task.checklist.map((item) => item.label)}
          marker="checkbox"
          addLabel="+ Add item"
          fullLabel={`Max ${MAX_CHECKLIST_ITEMS} items`}
          maxLines={MAX_CHECKLIST_ITEMS}
          placeholder="Done when…"
          maxLength={MAX_CHECKLIST_ITEM_LENGTH}
          onChange={editChecklist}
          onCommit={() => commitChecklist(task.checklist)}
          onRemove={(index) =>
            commitChecklist(task.checklist.filter((_, at) => at !== index))
          }
        />
      </div>

      <div className="bw-field">
        <SectionLabel>Resources</SectionLabel>
        <LineList
          lines={task.resources}
          marker="none"
          addLabel="+ Attach link"
          fullLabel={`Max ${MAX_TASK_RESOURCES} links`}
          maxLines={MAX_TASK_RESOURCES}
          placeholder="https://…"
          maxLength={MAX_TASK_TEXT_LENGTH}
          onChange={(resources) => setTask({ ...task, resources })}
          check={(line) => (toHttpsLink(line) === null ? "Enter a web link, like https://docs.google.com/…" : null)}
          onCommit={commitLinks}
          onRemove={(index) => commitLinks(task.resources.filter((_, at) => at !== index))}
        />
      </div>
    </>
  );
}

/**
 * An editable list of lines, fully controlled by the caller.
 * Keeping a local copy here would fight the saved list on every keystroke, so
 * `onChange` reports each edit and `onCommit` marks the points worth saving.
 * Rows grow with their text; the list grows with its rows.
 */
function LineList({
  lines,
  marker,
  addLabel,
  fullLabel,
  maxLines,
  placeholder,
  maxLength,
  check,
  onChange,
  onCommit,
  onRemove,
}: {
  lines: string[];
  /** What leads each row: its step number, an empty tick box (as rooms see it), or nothing. */
  marker: "number" | "checkbox" | "none";
  addLabel: string;
  /** Replaces `addLabel` once the list holds `maxLines`. */
  fullLabel: string;
  maxLines: number;
  placeholder: string;
  maxLength: number;
  /** The error for a written line, or null when it is fine. Blank rows are never checked. */
  check?: (line: string) => string | null;
  /** Every keystroke. */
  onChange: (lines: string[]) => void;
  /** Leaving a row. */
  onCommit: (lines: string[]) => void;
  /** By position, so a caller holding ids beside the lines removes the right one. */
  onRemove: (index: number) => void;
}) {
  const list = useRef<HTMLDivElement>(null);
  // The row just added, focused and scrolled into view once it is on screen.
  const focusAt = useRef<number | null>(null);
  const full = lines.length >= maxLines;

  useEffect(() => {
    const at = focusAt.current;
    if (at === null) return;
    focusAt.current = null;
    const row = list.current?.querySelectorAll("textarea")[at];
    if (!row) return;
    row.focus();
    row.scrollIntoView({ block: "nearest" });
  }, [lines.length]);

  return (
    <div className="bw-line-list" ref={list}>
      {lines.map((line, index) => (
        <div className="bw-line-row bw-input--inset" key={index}>
          {marker === "number" ? <span className="bw-mono bw-line-row__number">{index + 1}</span> : null}
          {marker === "checkbox" ? <span className="bw-line-row__box" aria-hidden="true" /> : null}
          <GrowingField
            className="bw-line-row__input"
            value={line}
            placeholder={placeholder}
            ariaLabel={`${marker === "number" ? "Step" : "Line"} ${index + 1}`}
            maxLength={maxLength}
            finishOnEnter
            floatingCount
            error={check && line.trim() ? check(line) : null}
            onChange={(text) => onChange(lines.map((current, at) => (at === index ? text : current)))}
            onBlur={() => onCommit(lines)}
          />
          <button
            className="bw-icon-button bw-close"
            aria-label="Remove line"
            onClick={() => onRemove(index)}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        className="bw-line-add"
        disabled={full}
        onClick={() => {
          focusAt.current = lines.length;
          onChange([...lines, ""]);
        }}
      >
        {full ? fullLabel : addLabel}
      </button>
    </div>
  );
}
