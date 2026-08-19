/**
 * Passage marks — the only thing a reader may record while reading (master §3.13).
 *
 * **There is no feedback UI mid-read, and this is not one.** §3.13 places the instrument
 * after completion, in the instrument's own words: "Please read the Opening Arc without
 * stopping to edit." So while reading, a reader may mark a passage and nothing else. A mark
 * captures a reference — where they were, and what the words were — and asks no question,
 * opens no form, and interrupts nothing. The reader writes about it afterwards, if they want
 * to, with the reference already attached.
 *
 * A mark is `{ unitId, componentIndex, excerpt, charStart, charEnd, markedAt }`.
 *
 *  - `charStart`/`charEnd` are character offsets into the unit's rendered text, so a mark
 *    survives a text-size change, a theme change and a reflow: nothing about it is geometric.
 *  - They are **null** for a mark made from the reading controls, because a reader who cannot
 *    drag-select did not select characters — they marked the section they were in. A mark
 *    with no range is still a complete reference: the unit identifies the section exactly.
 *  - `excerpt` is a human-readable label, whitespace-collapsed and capped at the server's
 *    excerpt length. It is not a rendering of the manuscript and is never displayed in place
 *    of one; the manuscript itself is immutable and untouched by any of this (§0.3).
 *
 * Marks live on the device, in their own storage record, and are sent nowhere until the
 * reader chooses to send a note with them attached. Nothing here counts them, ranks them,
 * displays a total, or rewards making one (§14.4.1).
 */

import { useCallback, useMemo, useState } from 'react';

import { FEEDBACK_LIMITS } from '@/services/api';
import { readPassageMarks, writePassageMarks } from '@/services/storage';

/**
 * Identity of a mark, for React keys and for removal.
 *
 * Composite rather than a generated id: the tuple that identifies a mark is already stored,
 * and adding an id field would put a synthetic value into a record whose shape the server's
 * passage schema mirrors. Two marks cannot collide — `markedAt` is stamped per reader action.
 *
 * @param {Object} mark
 * @returns {string}
 */
export const passageMarkKey = (mark) => `${mark?.unitId ?? ''}#${mark?.markedAt ?? ''}`;

/**
 * A mark made by selecting text carries a character range; a whole-section mark does not.
 *
 * @param {Object} mark
 * @returns {boolean}
 */
export const hasRange = (mark) =>
  Number.isInteger(mark?.charStart) && Number.isInteger(mark?.charEnd);

/**
 * @param {string} text
 * @returns {string} a single-line label within the server's excerpt cap
 */
const toExcerpt = (text) =>
  String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, FEEDBACK_LIMITS.excerptMaxLength);

/**
 * Character offsets of a DOM range within a unit's rendered text.
 *
 * Measured with a probe range rather than by walking nodes, because a selection's boundary
 * may land on an element rather than a text node — dragging across a paragraph break does
 * exactly that — and `Range.toString()` concatenates the same text `textContent` does, so the
 * two agree by construction.
 *
 * @param {Element|null} root the unit's `<article>`
 * @param {Range|null} range
 * @returns {{ charStart: number, charEnd: number }|null} null when the range is degenerate
 *   or reaches outside the unit
 */
export const offsetsForRange = (root, range) => {
  if (!root || !range) return null;
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  try {
    const probe = range.cloneRange();
    probe.selectNodeContents(root);
    probe.setEnd(range.startContainer, range.startOffset);
    const charStart = probe.toString().length;
    probe.setEnd(range.endContainer, range.endOffset);
    const charEnd = probe.toString().length;
    return charEnd > charStart ? { charStart, charEnd } : null;
  } catch {
    // A range whose containers moved between selection and measurement. A mark is not worth
    // an exception thrown into the reading path.
    return null;
  }
};

/**
 * Rebuild a DOM range from stored offsets, so a mark can be painted again on a unit that has
 * just been re-rendered.
 *
 * @param {Element|null} root the unit's `<article>`
 * @param {number} charStart
 * @param {number} charEnd
 * @returns {Range|null} null when the offsets fall outside the text (a mark from an earlier
 *   release, which is dropped quietly rather than reported — §3.12)
 */
export const rangeForOffsets = (root, charStart, charEnd) => {
  if (!root || typeof document === 'undefined') return null;
  if (!Number.isInteger(charStart) || !Number.isInteger(charEnd) || charEnd <= charStart) {
    return null;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let consumed = 0;
  let started = false;

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.nodeValue?.length ?? 0;
    if (!started && consumed + length > charStart) {
      range.setStart(node, charStart - consumed);
      started = true;
    }
    if (started && consumed + length >= charEnd) {
      range.setEnd(node, charEnd - consumed);
      return range;
    }
    consumed += length;
  }

  return null;
};

/**
 * The name of a section, taken from the unit itself rather than from the rendered page.
 *
 * §3.4.2 requires every unit to be addressable because the instrument asks readers to "name
 * the section, page, or passage". The authored title is that name, and reading it from the
 * unit means a section mark needs no DOM at all — it can be made before the page has settled,
 * and it says what the reader marked rather than quoting the first paragraph of it.
 *
 * @param {Object|null} unit
 * @returns {string}
 */
const sectionName = (unit) => {
  if (unit?.canonicalTitle) return String(unit.canonicalTitle);
  const blocks = Array.isArray(unit?.blocks) ? unit.blocks : [];
  return blocks.find((block) => block?.type === 'heading')?.text ?? '';
};

/**
 * The `<article>` a unit is rendered into, inside the reading surface's scroller.
 *
 * A free function rather than a memoised callback on purpose: a hook that returned a
 * memoised getter would be returning a value derived from a ref, which nothing downstream
 * could safely cache. Callers pass the container and the unit id, both of which they already
 * hold, and the effects that need the element depend on those two stable values instead.
 *
 * @param {Element|null} container the scroller
 * @param {string|null} unitId
 * @returns {Element|null}
 */
export const unitRootIn = (container, unitId) => {
  if (!container || !unitId) return null;
  const escaped = window.CSS?.escape ? window.CSS.escape(unitId) : unitId;
  return container.querySelector(`[data-unit-id="${escaped}"]`);
};

/**
 * The reader's marks, and the four things that can be done to them.
 *
 * One instance owns the list for the whole reading surface: `PassageMarks` paints and offers
 * the inline action, `ReadingControls` carries the keyboard equivalent, and both read the
 * same state. `FeedbackForm` instantiates its own later, when the reading surface is gone.
 *
 * Nothing here touches the DOM. Marking is described entirely by the unit and by character
 * offsets the caller measured, which is what lets the same hook serve the reading surface and
 * the feedback form without either of them knowing about the other.
 *
 * @param {{ unit?: Object|null }} [options] `unit` is omitted after reading ends, where the
 *   list is read and pruned but no new mark can be made.
 * @returns {{
 *   marks: Array<Object>,
 *   unitMarks: Array<Object>,
 *   rangedMarks: Array<Object>,
 *   sectionMark: Object|null,
 *   atCapacity: boolean,
 *   lastAction: { kind: string|null, seq: number },
 *   findOverlapping: (charStart: number, charEnd: number) => Object|null,
 *   markSelection: (selection: { charStart: number, charEnd: number, excerpt: string }) => void,
 *   toggleSectionMark: () => void,
 *   removeMark: (mark: Object) => void,
 *   clearMarks: () => void,
 * }}
 */
export function usePassageMarks({ unit = null } = {}) {
  const unitId = unit?.unitId ?? null;
  const componentIndex = Number.isInteger(unit?.componentIndex) ? unit.componentIndex : null;

  const [marks, setMarks] = useState(() => readPassageMarks());
  // `seq` exists so a repeated action still announces. A live region reacts to a DOM change,
  // and marking two passages in a row produces identical text; the sequence lets the status
  // node be replaced rather than left alone.
  const [lastAction, setLastAction] = useState({ kind: null, seq: 0 });

  const note = useCallback((kind) => {
    setLastAction((previous) => ({ kind, seq: previous.seq + 1 }));
  }, []);

  const commit = useCallback(
    (next, kind) => {
      setMarks(next);
      writePassageMarks(next);
      note(kind);
    },
    [note],
  );

  const unitMarks = useMemo(
    () => marks.filter((mark) => mark.unitId === unitId),
    [marks, unitId],
  );

  const rangedMarks = useMemo(() => unitMarks.filter(hasRange), [unitMarks]);

  const sectionMark = useMemo(
    () => unitMarks.find((mark) => !hasRange(mark)) ?? null,
    [unitMarks],
  );

  const atCapacity = marks.length >= FEEDBACK_LIMITS.maxPassages;

  /**
   * The mark a new selection lands on, if any.
   *
   * Overlap rather than exact equality: "select the same passage again" is how a mark is
   * removed, and no reader reproduces a drag character-for-character. The cost is that a
   * longer passage containing an existing mark removes it instead of nesting — which is the
   * safer of the two surprises, because it is immediately visible and immediately undone.
   */
  const findOverlapping = useCallback(
    (charStart, charEnd) =>
      marks.find(
        (mark) =>
          mark.unitId === unitId &&
          hasRange(mark) &&
          mark.charStart < charEnd &&
          charStart < mark.charEnd,
      ) ?? null,
    [marks, unitId],
  );

  const removeMark = useCallback(
    (mark) => {
      const key = passageMarkKey(mark);
      commit(
        marks.filter((entry) => passageMarkKey(entry) !== key),
        'removed',
      );
    },
    [marks, commit],
  );

  const markSelection = useCallback(
    ({ charStart, charEnd, excerpt }) => {
      if (!unitId) return;

      const existing = findOverlapping(charStart, charEnd);
      if (existing) {
        removeMark(existing);
        return;
      }
      if (atCapacity) {
        note('full');
        return;
      }

      commit(
        [
          ...marks,
          {
            unitId,
            componentIndex,
            excerpt: toExcerpt(excerpt),
            charStart,
            charEnd,
            markedAt: new Date().toISOString(),
          },
        ],
        'added',
      );
    },
    [unitId, componentIndex, marks, atCapacity, commit, note, findOverlapping, removeMark],
  );

  /**
   * The keyboard equivalent: mark the section being read.
   *
   * It records no character range, because none was chosen — the label is the authored name
   * of the section, which is exactly what §3.4.2 makes every unit carry so that a reader can
   * "name the section, page, or passage". Nothing is underlined for a section mark either: an
   * underline across a whole chapter section would be an intervention in the reading surface
   * rather than the quiet cue §14.4.1 leaves room for.
   */
  const toggleSectionMark = useCallback(() => {
    if (!unitId) return;

    if (sectionMark) {
      removeMark(sectionMark);
      return;
    }
    if (atCapacity) {
      note('full');
      return;
    }

    commit(
      [
        ...marks,
        {
          unitId,
          componentIndex,
          excerpt: toExcerpt(sectionName(unit)),
          charStart: null,
          charEnd: null,
          markedAt: new Date().toISOString(),
        },
      ],
      'added',
    );
  }, [unitId, componentIndex, unit, marks, sectionMark, atCapacity, commit, note, removeMark]);

  /** Called once a note has been sent: the marks went with it and are no longer pending. */
  const clearMarks = useCallback(() => {
    setMarks([]);
    writePassageMarks([]);
  }, []);

  return {
    marks,
    unitMarks,
    rangedMarks,
    sectionMark,
    atCapacity,
    lastAction,
    findOverlapping,
    markSelection,
    toggleSectionMark,
    removeMark,
    clearMarks,
  };
}

export default usePassageMarks;
