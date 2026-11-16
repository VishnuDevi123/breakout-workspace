"use client";

import { useState } from "react";

import { ACTIVITY_KINDS } from "@/lib/activity-kinds";
import { MAX_ACTIVITY_DESCRIPTION_LENGTH, MAX_ACTIVITY_TITLE_LENGTH, type Activity } from "@/types/breakout";

import GrowingField from "./GrowingField";
import { Button, Modal, SectionLabel } from "./ui";

/**
 * Add or edit one activity. Nothing is saved until Done, so cancelling a new
 * activity leaves nothing behind. Opened from the activity list only, never from
 * inside another panel, so two overlays never stack.
 */
export default function ActivityModal({
  activity,
  onSave,
  onClose,
}: {
  activity: Activity;
  /** Resolves false when the save failed; the modal then stays open. */
  onSave: (activity: Activity) => Promise<boolean>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(activity.title);
  const [description, setDescription] = useState(activity.description);
  const [saving, setSaving] = useState(false);
  const kind = ACTIVITY_KINDS[activity.kind];

  async function done(close: () => void) {
    setSaving(true);
    const saved = await onSave({ ...activity, title: title.trim(), description: description.trim() });
    setSaving(false);
    if (saved) close();
  }

  return (
    // Tinted by kind, like the poll and quiz windows: yellow for individual, teal for shared.
    <Modal label={kind.label} locked={saving} panelClassName={`bw-activity-panel bw-activity-panel--${activity.kind}`} onClose={onClose}>
      {(close) => (
        <>
          <header className="bw-overlay__header">
            <span className="bw-activity-panel__title">{kind.label}</span>
            <div className="bw-header-spacer" />
            <Button size="sm" disabled={!title.trim()} busy={saving} onClick={() => void done(close)}>
              Done
            </Button>
          </header>

          <div className="bw-overlay__body">
            <div className="bw-field">
              <SectionLabel>{kind.titleLabel}</SectionLabel>
              {/* One line that wraps if long; Enter finishes it. Counter as in the description. */}
              <GrowingField
                className="bw-goal-input bw-activity-question"
                value={title}
                autoFocus
                finishOnEnter
                placeholder={kind.titlePlaceholder}
                ariaLabel={kind.titleLabel}
                maxLength={MAX_ACTIVITY_TITLE_LENGTH}
                onChange={setTitle}
                onBlur={() => {}}
              />
            </div>
            <div className="bw-field">
              <SectionLabel>Additional Information</SectionLabel>
              <GrowingField
                className="bw-activity-description"
                minRows={4}
                grow={false}
                value={description}
                placeholder="Write any additional instructions here"
                ariaLabel="Additional information"
                maxLength={MAX_ACTIVITY_DESCRIPTION_LENGTH}
                onChange={setDescription}
                onBlur={() => {}}
              />
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
