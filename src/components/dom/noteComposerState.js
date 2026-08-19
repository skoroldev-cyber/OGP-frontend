/**
 * Whether the reader currently has the note composer open.
 *
 * One boolean, shared by two components that are siblings rather than relatives:
 * `FeedbackForm` renders inside `ArcComplete` (App.jsx), while `NavigationMinimal` is mounted
 * beside it and sits above it — fixed, at `$z-chrome`, over the form's `$z-reading-surface`.
 *
 * That layering is why this exists. The persistent nav offers "Choose Your Path" from S13
 * onward, and its button was reachable straight through the open composer. One click sent
 * `advance`, both S13 guards passed immediately (the minimum dwell has necessarily elapsed —
 * the "Leave a note" button that opens the composer is itself gated behind the same floor),
 * the machine moved to S14 and `ArcComplete` unmounted with it. Everything the reader had
 * typed left the screen mid-sentence, with no confirmation and no control on the next screen
 * that brings it back: S14 declares no transitions, so S13 is not returned to.
 *
 * The composer already has two deliberate ways out — send it, or close without sending — and
 * closing returns the reader to S13 with the pathways one click away. The nav button was a
 * third exit nobody designed, which happened to be the one that discarded the writing.
 *
 * A module-level store rather than a context: this is one boolean read by one component, and
 * threading a provider through `App` to carry it would be more machinery than the fact
 * deserves. `useSyncExternalStore` keeps it correct under concurrent rendering.
 */

import { useSyncExternalStore } from 'react';

let noteOpen = false;

/** @type {Set<() => void>} */
const listeners = new Set();

/**
 * @param {() => void} listener
 * @returns {() => void} the unsubscribe function
 */
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => noteOpen;

/** The composer never exists during server rendering, so it is closed there by definition. */
const getServerSnapshot = () => false;

/**
 * Record that the composer opened or closed.
 *
 * @param {boolean} open
 * @returns {void}
 */
export const setNoteComposerOpen = (open) => {
  const next = open === true;
  if (next === noteOpen) return;
  noteOpen = next;
  for (const listener of listeners) listener();
};

/**
 * @returns {boolean} whether the note composer is open.
 */
export const useNoteComposerOpen = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
