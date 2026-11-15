"use client";

import { useEffect, useRef, useState } from "react";

import {
  addQuestion,
  ANSWER_STEP_SEC,
  CHALLENGE_KINDS,
  clampAnswerSec,
  draftProblem,
  launchableDraft,
  MAX_OPTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_ANSWER_SEC,
  MAX_TITLE_LENGTH,
  MIN_ANSWER_SEC,
  optionLetter,
  removeOption,
  removeQuestion,
  setQuestion,
} from "@/lib/challenges";
import { formatClock, parseClock } from "@/lib/round-clock";
import { MAX_CHALLENGE_OPTIONS, MAX_QUIZ_QUESTIONS, type ChallengeDraft, type ChallengeQuestion } from "@/types/breakout";

import ChallengeScrollBody from "./ChallengeScrollBody";
import ExpandingField from "./ExpandingField";
import { Button, Modal } from "./ui";

/**
 * Write a poll or a quiz and launch it to every room. The draft lives in the
 * live page, so closing this keeps it until it is launched. A poll is one
 * question; a quiz has a title, up to 10 questions and a right answer for each.
 */
export default function ChallengeEditor({
  draft,
  roomCount,
  onChange,
  onLaunch,
  onClose,
}: {
  draft: ChallengeDraft;
  /** Rooms it goes to, for the Launch button. */
  roomCount: number;
  onChange: (draft: ChallengeDraft) => void;
  /** Resolves false when the launch failed; the editor then stays open. */
  onLaunch: (draft: ChallengeDraft) => Promise<boolean>;
  onClose: () => void;
}) {
  const [launching, setLaunching] = useState(false);
  const questionRefs = useRef<(HTMLElement | null)[]>([]);
  // The question just added: once it renders, it glides into view and takes the cursor.
  const scrollToQuestion = useRef<number | null>(null);
  const questionCount = draft.questions.length;

  useEffect(() => {
    const index = scrollToQuestion.current;
    const added = index === null ? null : questionRefs.current[index];
    if (!added) return;
    scrollToQuestion.current = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    added.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    added.querySelector("textarea")?.focus({ preventScroll: true });
  }, [questionCount]);

  const kind = CHALLENGE_KINDS[draft.kind];
  const problem = draftProblem(draft);
  const isQuiz = draft.kind === "quiz";

  async function launch(close: () => void) {
    setLaunching(true);
    const launched = await onLaunch(launchableDraft(draft));
    setLaunching(false);
    if (launched) close();
  }

  return (
    <Modal
      label={`New ${kind.label.toLowerCase()}`}
      size="lg"
      panelClassName={`bw-challenge-panel bw-challenge-panel--${draft.kind}`}
      locked={launching}
      onClose={onClose}
    >
      {(close) => (
        <>
          <header className="bw-overlay__header bw-challenge-bar">
            <span className="bw-challenge-editor__title">New {kind.label.toLowerCase()}</span>
            <div className="bw-header-spacer" />
            <button className="bw-back-button bw-close" aria-label="Close" title="Close" onClick={close}>
              ✕
            </button>
          </header>

          <ChallengeScrollBody>
            {isQuiz ? (
              <div className="bw-challenge-editor__intro">
                <input
                  className="bw-challenge-editor__name"
                  value={draft.title}
                  autoFocus
                  maxLength={MAX_TITLE_LENGTH}
                  placeholder="Quiz title"
                  aria-label="Quiz title"
                  onChange={(event) => onChange({ ...draft, title: event.target.value })}
                />
                <LimitWarning text={draft.title} max={MAX_TITLE_LENGTH} />
                <span className="bw-challenge-editor__hint">Tick the right answer to each question.</span>
              </div>
            ) : null}

            {draft.questions.map((question, index) => (
              <QuestionCard
                key={index}
                ref={(element) => {
                  questionRefs.current[index] = element;
                }}
                draft={draft}
                index={index}
                question={question}
                onChange={onChange}
              />
            ))}

            {isQuiz && draft.questions.length < MAX_QUIZ_QUESTIONS ? (
              <button
                className="bw-challenge-add"
                onClick={() => {
                  scrollToQuestion.current = questionCount;
                  onChange(addQuestion(draft));
                }}
              >
                + Add question
              </button>
            ) : null}
          </ChallengeScrollBody>

          <footer className="bw-challenge-actionbar">
            <div className="bw-answer-time">
              <span className="bw-answer-time__label" id="bw-answer-time-label">
                Time to answer
              </span>
              <AnswerTime
                seconds={draft.durationSec}
                labelledBy="bw-answer-time-label"
                onChange={(durationSec) => onChange({ ...draft, durationSec })}
              />
            </div>
            {/* What is missing shows as the button's tooltip; nothing repeats it here. */}
            <Button
              size="sm"
              className="bw-challenge-actionbar__launch"
              disabled={problem !== null}
              title={problem ?? undefined}
              busy={launching}
              onClick={() => void launch(close)}
            >
              Launch to {roomCount} {roomCount === 1 ? "room" : "rooms"}
            </Button>
          </footer>
        </>
      )}
    </Modal>
  );
}

/**
 * One question: its text, always shown in full, then its options stacked. An
 * option shows one line until it is edited. In a quiz, an option's mark sets the right answer.
 */
function QuestionCard({
  ref,
  draft,
  index,
  question,
  onChange,
}: {
  ref: (element: HTMLElement | null) => void;
  draft: ChallengeDraft;
  index: number;
  question: ChallengeQuestion;
  onChange: (draft: ChallengeDraft) => void;
}) {
  const isQuiz = draft.kind === "quiz";
  const edit = (next: ChallengeQuestion) => onChange(setQuestion(draft, index, next));

  return (
    <section className="bw-challenge-question" ref={ref}>
      {isQuiz ? (
        <div className="bw-challenge-question__head">
          <span className="bw-challenge-question__number">Question {index + 1}</span>
          <button
            className="bw-icon-button bw-close bw-challenge-question__remove"
            aria-label={`Remove question ${index + 1}`}
            title={draft.questions.length > 1 ? "Remove question" : "A quiz needs at least one question"}
            disabled={draft.questions.length <= 1}
            onClick={() => onChange(removeQuestion(draft, index))}
          >
            ✕
          </button>
        </div>
      ) : null}
      <ExpandingField
        className="bw-challenge-field"
        value={question.text}
        autoFocus={!isQuiz}
        collapseOnBlur={false}
        maxLength={MAX_QUESTION_LENGTH}
        ariaLabel={isQuiz ? `Question ${index + 1}` : "Question"}
        placeholder={isQuiz ? "Ask a question" : "Ask the rooms a question"}
        onChange={(text) => edit({ ...question, text })}
      />
      <LimitWarning text={question.text} max={MAX_QUESTION_LENGTH} />
      <div className="bw-challenge-options" role={isQuiz ? "radiogroup" : undefined} aria-label={isQuiz ? "Right answer" : undefined}>
        {question.options.map((option, optionIndex) => {
          const letter = optionLetter(optionIndex);
          const isRight = draft.kind === "quiz" && draft.answerKey[index] === optionIndex;
          return (
            <div className="bw-challenge-option" data-right={isRight || undefined} key={optionIndex}>
              {draft.kind === "quiz" ? (
                <button
                  className="bw-challenge-option__mark"
                  role="radio"
                  aria-checked={isRight}
                  aria-label={`${letter} is the right answer`}
                  title={isRight ? "The right answer" : "Mark as the right answer"}
                  onClick={() =>
                    onChange({ ...draft, answerKey: draft.answerKey.map((key, at) => (at === index ? optionIndex : key)) })
                  }
                >
                  {isRight ? (
                    <svg viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M4 8.5l2.5 2.5L12 5.5" />
                    </svg>
                  ) : (
                    letter
                  )}
                </button>
              ) : (
                <span className="bw-challenge-option__mark">{letter}</span>
              )}
              <div className="bw-challenge-option__body">
                <ExpandingField
                  className="bw-challenge-option__input"
                  value={option}
                  maxLength={MAX_OPTION_LENGTH}
                  ariaLabel={`Option ${letter}`}
                  placeholder={`Option ${letter}`}
                  onChange={(text) => edit({ ...question, options: question.options.map((current, at) => (at === optionIndex ? text : current)) })}
                />
                <LimitWarning text={option} max={MAX_OPTION_LENGTH} />
              </div>
              {question.options.length > 2 ? (
                <button
                  className="bw-icon-button bw-close"
                  aria-label={`Remove option ${letter}`}
                  title="Remove option"
                  onClick={() => onChange(removeOption(draft, index, optionIndex))}
                >
                  ✕
                </button>
              ) : null}
            </div>
          );
        })}
        {question.options.length < MAX_CHALLENGE_OPTIONS ? (
          <button className="bw-challenge-option-add" onClick={() => edit({ ...question, options: [...question.options, ""] })}>
            + Add option
          </button>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Time to answer as − / time / +, in 15 second steps from 0:15 to 10:00. Tapping
 * the time turns it into a field for typing m:ss; Enter or leaving it saves,
 * Escape keeps the old time. A time outside the range is pulled into it.
 */
function AnswerTime({
  seconds,
  labelledBy,
  onChange,
}: {
  seconds: number;
  labelledBy: string;
  onChange: (seconds: number) => void;
}) {
  // The typed text while editing, or null when the time shows as a button.
  const [typed, setTyped] = useState<string | null>(null);

  function commit() {
    if (typed === null) return;
    const parsed = parseClock(typed);
    if (parsed !== null) onChange(clampAnswerSec(parsed));
    setTyped(null);
  }

  return (
    <div className="bw-stepper bw-answer-time__stepper" role="group" aria-labelledby={labelledBy}>
      <button
        type="button"
        aria-label="15 seconds less"
        disabled={seconds <= MIN_ANSWER_SEC}
        onClick={() => onChange(clampAnswerSec(seconds - ANSWER_STEP_SEC))}
      >
        −
      </button>
      {typed === null ? (
        <button
          type="button"
          className="bw-answer-time__value bw-mono"
          aria-label={`${formatClock(seconds)}, change time`}
          onClick={() => setTyped(formatClock(seconds))}
        >
          {formatClock(seconds)}
        </button>
      ) : (
        <input
          className="bw-answer-time__value bw-answer-time__input bw-mono"
          value={typed}
          autoFocus
          inputMode="numeric"
          maxLength={5}
          aria-label="Time to answer, m:ss"
          onFocus={(event) => event.target.select()}
          onChange={(event) => setTyped(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") {
              // Escape keeps the old time and must not close the modal.
              event.stopPropagation();
              setTyped(null);
            }
          }}
        />
      )}
      <button
        type="button"
        aria-label="15 seconds more"
        disabled={seconds >= MAX_ANSWER_SEC}
        onClick={() => onChange(clampAnswerSec(seconds + ANSWER_STEP_SEC))}
      >
        +
      </button>
    </div>
  );
}

/** Shown once a field holds its most characters; the field itself stops further typing. */
function LimitWarning({ text, max }: { text: string; max: number }) {
  if (text.length < max) return null;
  return (
    <span className="bw-challenge-limit" role="status">
      {max} character limit reached
    </span>
  );
}
