import { useCallback, useMemo, useState } from 'react';

import { FEEDBACK_LIMITS } from '@/services/api';
import { readPassageMarks, writePassageMarks } from '@/services/storage';

export const passageMarkKey = (mark) => `${mark?.unitId ?? ''}#${mark?.markedAt ?? ''}`;

export const hasRange = (mark) =>
  Number.isInteger(mark?.charStart) && Number.isInteger(mark?.charEnd);

const toExcerpt = (text) =>
  String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, FEEDBACK_LIMITS.excerptMaxLength);

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
    return null;
  }
};

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

const sectionName = (unit) => {
  if (unit?.canonicalTitle) return String(unit.canonicalTitle);
  const blocks = Array.isArray(unit?.blocks) ? unit.blocks : [];
  return blocks.find((block) => block?.type === 'heading')?.text ?? '';
};

export const unitRootIn = (container, unitId) => {
  if (!container || !unitId) return null;
  const escaped = window.CSS?.escape ? window.CSS.escape(unitId) : unitId;
  return container.querySelector(`[data-unit-id="${escaped}"]`);
};

export function usePassageMarks({ unit = null } = {}) {
  const unitId = unit?.unitId ?? null;
  const componentIndex = Number.isInteger(unit?.componentIndex) ? unit.componentIndex : null;

  const [marks, setMarks] = useState(() => readPassageMarks());
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
