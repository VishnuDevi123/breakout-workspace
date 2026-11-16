"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import { useScrollReveal } from "@/lib/use-scroll-reveal";

/** Sets a text box's height to its text's (where CSS `field-sizing` is missing). */
function fitHeight(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  const border = element.offsetHeight - element.clientHeight;
  element.style.height = `${element.scrollHeight + border}px`;
}

/** Ordinary prose, so a full-length sample wraps the way a real goal does. */
const SAMPLE_TEXT = "Agree on the three ideas your room likes best, then pick one to share with everyone. ";

/** The height a text box needs to show `length` characters of prose at its current width, plus a line. */
function fullHeight(element: HTMLTextAreaElement, length: number): number {
  const probe = element.cloneNode() as HTMLTextAreaElement;
  probe.value = SAMPLE_TEXT.repeat(Math.ceil(length / SAMPLE_TEXT.length)).slice(0, length);
  Object.assign(probe.style, {
    position: "absolute",
    visibility: "hidden",
    width: `${element.offsetWidth}px`,
    height: "auto",
    minHeight: "0",
    fieldSizing: "fixed",
  });
  element.after(probe);
  const height = probe.scrollHeight + probe.offsetHeight - probe.clientHeight;
  probe.remove();
  // One line spare: real text wraps a little differently from the sample.
  return height + parseFloat(getComputedStyle(element).lineHeight);
}

/** Share of the limit from which the "n / max" counter shows without focus too. */
const COUNT_FROM = 0.8;

/**
 * A text box that grows with its text and never scrolls. CSS `field-sizing` does it
 * where the browser has it; elsewhere the height is set to the text's.
 *
 * `reserveFull` (the goal): the box is as tall as a full-length text from the start,
 * so typing never moves what is below it.
 *
 * Under the box is one line kept free, so nothing moves when it fills: the
 * "n / max" counter while the box is focused or close to the limit, and the error
 * (if any) once the host has left it. `floatingCount` (list rows) keeps no line:
 * the counter floats in the row's bottom padding, so a row is only as tall as its
 * text, and an error line appears only for a line that has one.
 */
export default function GrowingField({
  className,
  minRows = 1,
  grow = true,
  reserveFull = false,
  floatingCount = false,
  value,
  placeholder,
  ariaLabel,
  maxLength,
  finishOnEnter = false,
  autoFocus = false,
  error = null,
  onChange,
  onBlur,
}: {
  className: string;
  /** Lines the box shows at least (exactly, with `grow={false}`). */
  minRows?: number;
  /** False: the box stays `minRows` tall and longer text scrolls inside it. */
  grow?: boolean;
  reserveFull?: boolean;
  floatingCount?: boolean;
  value: string;
  placeholder: string;
  ariaLabel: string;
  maxLength: number;
  /** One-line entries: Enter leaves the field instead of starting a new line. */
  finishOnEnter?: boolean;
  autoFocus?: boolean;
  /** Shown under the field once it is left; while it is edited the counter shows instead. */
  error?: string | null;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const scrollReveal = useScrollReveal();

  // Fallback: fit on every change of text...
  useLayoutEffect(() => {
    if (grow && field.current && !CSS.supports("field-sizing", "content")) fitHeight(field.current);
  }, [grow, value]);
  // ...and on every change of width, which also changes the full-length height.
  useEffect(() => {
    const element = field.current;
    if (!element) return;
    const sized = !grow || CSS.supports("field-sizing", "content");
    if (sized && !reserveFull) return;
    let width = -1;
    const observer = new ResizeObserver(() => {
      if (element.offsetWidth === width) return;
      width = element.offsetWidth;
      if (reserveFull) element.style.minHeight = `${fullHeight(element, maxLength)}px`;
      if (!sized) fitHeight(element);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [grow, reserveFull, maxLength]);

  const showError = Boolean(error) && !focused;
  const showCount = !showError && (focused || value.length >= maxLength * COUNT_FROM);
  return (
    <div className="bw-grow">
      <textarea
        ref={field}
        className={`${className} ${grow ? "bw-grow__field" : "bw-grow__field--fixed"}`}
        {...(grow ? {} : scrollReveal)}
        style={{ "--bw-field-rows": minRows } as CSSProperties}
        rows={minRows}
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur();
        }}
        onKeyDown={(event) => {
          if (finishOnEnter && event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
      {floatingCount ? (
        <>
          {showError ? (
            <span className="bw-field__error" role="alert">
              {error}
            </span>
          ) : null}
          {showCount ? (
            <span className="bw-field__count bw-field__count--float" data-full={value.length >= maxLength || undefined}>
              {value.length} / {maxLength}
            </span>
          ) : null}
        </>
      ) : (
        <div className="bw-field__meta">
          {showError ? (
            <span className="bw-field__error" role="alert">
              {error}
            </span>
          ) : null}
          {showCount ? (
            <span className="bw-field__count" data-full={value.length >= maxLength || undefined}>
              {value.length} / {maxLength}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
