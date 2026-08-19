/**
 * The reading model for S10–S13.
 *
 * Owns the manifest, the current unit, the neighbour prefetch, progress persistence,
 * completion detection and the §3.9 settings model. It owns no markup: `ReadingSurface`
 * renders what this provider holds.
 *
 * Load discipline (§3.12, binding): **only the current unit and its immediate neighbours
 * are ever mounted.** Full-arc DOM mounting is prohibited — the arc is ~15,540 words and
 * mounting all of it would cost exactly the scroll performance that long-form reading needs.
 * Completed units unmount; the manifest keeps the spine addressable.
 *
 * Progress discipline (§3.8.1): written at least every 15 s of activity, at every unit
 * boundary, and on `visibilitychange`. The device-local record alone satisfies
 * "preservation of progress without requiring an account"; the server copy is a mirror.
 *
 * Failure discipline (§3.3): the reader never sees a technical error. A failed fetch
 * retries quietly; after the configured wait, one calm line appears and nothing else.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { OGP_TIMING, OGP_TYPE } from '@/config/ogpTheme';
import { FLAGS } from '@/config/env';
import {
  EVENTS,
  IMMERSION_STATES,
  INTENTS,
  MOTION_PREFERENCES,
  READING_THEMES,
  STATES,
  stateIndex,
} from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';
import { api } from '@/services/api';
import { emit as emitEvent } from '@/services/events';
import {
  clearPassageMarks,
  clearReadingSession,
  readPreferences,
  readReadingSession,
  writePreferences,
  writeReadingSession,
} from '@/services/storage';

const ReadingContext = createContext(null);

/** @returns {Object} the reading API */
export const useReading = () => {
  const context = useContext(ReadingContext);
  if (!context) throw new Error('useReading must be used within a ReadingProvider');
  return context;
};

/**
 * §3.9 defaults. Every control is honoured instantly, persisted, and never account-gated.
 * There are no streaks, reading goals or progress celebrations anywhere in this model.
 */
const defaultSettings = () => ({
  /** 5 steps, 0.875x–1.5x, default 1x. OS/browser zoom is respected independently. */
  textSizeIndex: OGP_TYPE.textSizeDefaultIndex,
  /** Deep field is canonical; light page is an opt-in reading surface only (§8.8). */
  theme: READING_THEMES.DARK,
  /** Mirrors the experience-wide motion preference; the machine remains the source of truth. */
  motion: MOTION_PREFERENCES.FULL,
  /** Off by default and always. Strictly opt-in (§3.9). */
  audio: 'off',
  /** Visible only when the age flag is on (§3.9 "switch experience depth"). */
  experienceDepth: null,
  /** On (device). Off clears local progress after confirmation. */
  rememberPlace: true,
  /** Reserved — Multilingual Resonance Layer, later phase. */
  language: null,
  /** A hairline position mark, off by default (§3.9). Never a percentage or a goal. */
  positionIndicator: false,
});

/**
 * Immersion state implied by a unit's authored content role (§3.6.1). Unit-driven, never
 * inferred from the reader's behaviour: reader-state inference exists only to suppress
 * prompts, never to target (§3.1).
 *
 * @param {Object|null} unit
 * @returns {string}
 */
const immersionForUnit = (unit) => {
  switch (unit?.contentRole) {
    case 'orientation':
      return IMMERSION_STATES.ORIENTATION;
    case 'recognition':
      return IMMERSION_STATES.RECOGNITION;
    case 'decompression':
      return IMMERSION_STATES.DECOMPRESSION;
    case 'convergence':
      return IMMERSION_STATES.CONVERGENCE;
    case 'transition':
      return IMMERSION_STATES.REFLECTION;
    default:
      return IMMERSION_STATES.READING;
  }
};

/**
 * @param {{ children: React.ReactNode }} props
 */
export const ReadingProvider = ({ children }) => {
  const { state, send, setImmersionState, contentLayer, motionPreference } = useExperience();

  const [manifest, setManifest] = useState(null);
  const [unitIndex, setUnitIndex] = useState(0);
  const [unit, setUnit] = useState(null);
  const [neighbours, setNeighbours] = useState({ previous: null, next: null });
  const [loading, setLoading] = useState(false);
  /** `null` | `'slow'` — the only failure state the reader can ever perceive. */
  const [error, setError] = useState(null);

  const [settings, setSettings] = useState(() => ({
    ...defaultSettings(),
    ...(readPreferences().reading ?? {}),
    ...(readReadingSession().settings ?? {}),
  }));

  const [progress, setProgress] = useState(() => {
    const saved = readReadingSession();
    return {
      currentUnitId: saved.current_unit_id ?? null,
      scrollFraction: saved.scroll_fraction ?? 0,
      completedUnitIds: Array.isArray(saved.completed_unit_ids) ? saved.completed_unit_ids : [],
      chaptersCompleted: saved.chapters_completed ?? 0,
      totalReadingMs: saved.total_reading_ms ?? 0,
    };
  });

  const [resumeAvailable] = useState(() => Boolean(readReadingSession().current_unit_id));

  /** Immutable unit cache. Releases never mutate, so a fetched unit is good forever. */
  const unitCache = useRef(new Map());
  const readingSessionEmitted = useRef(false);
  // Stamped in an effect, not in the initialiser: reading a clock during render is impure,
  // and under StrictMode's double render the second stamp would silently win.
  const unitEnteredAt = useRef(0);
  const lastProgressWrite = useRef(0);
  const slowTimer = useRef(null);

  // Latest-refs, written in an effect rather than during render. Effects flush before any
  // reader gesture or timer callback can read them, so neither can observe a stale value.
  const progressRef = useRef(progress);
  const settingsRef = useRef(settings);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Memoised so the identity is stable across renders: several effects and callbacks key
  // off it, and a fresh `[]` every render would churn them for no reason.
  // The manifest carries both the twelve protected components and the section-level units
  // inside Chapters 0, 00 and 1. The components are the addressable spine — `ChapterCompleted`
  // is emitted per component, and the resonance map hangs off them — while the sections are
  // the render granularity (§3.4.2: "one section-level unit renders at a time"). Walking every
  // row would render Chapter 1 once whole and then again in eight pieces, so the reading path
  // follows `isReadingUnit`, which the server sets on exactly the units a reader passes
  // through. Those units sum to the full 15,540 words of the arc: nothing is read twice, and
  // nothing is skipped.
  const units = useMemo(
    () => (manifest?.units ?? []).filter((unit) => unit.isReadingUnit !== false),
    [manifest],
  );

  /* ---------------------------------------------------------------- */
  /* Fetching                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * One unit, cached. Returns null on failure — the caller decides whether that failure
   * is worth a calm line or is merely a prefetch that did not matter.
   *
   * @param {string} unitId
   * @returns {Promise<Object|null>}
   */
  const fetchUnit = useCallback(async (unitId) => {
    if (!unitId) return null;
    if (unitCache.current.has(unitId)) return unitCache.current.get(unitId);
    try {
      const result = await api.getUnit(unitId);
      const fetched = result?.unit ?? null;
      if (fetched) unitCache.current.set(unitId, fetched);
      return fetched;
    } catch {
      return null;
    }
  }, []);

  // Manifest: fetched as soon as the invitation is on screen, so S9 never waits on it
  // (§3.2 frontend actions). Retried quietly; after the configured wait, one calm line.
  useEffect(() => {
    if (manifest || stateIndex(state) < stateIndex(STATES.S8_READING_ROOM_INVITATION)) return undefined;

    let cancelled = false;
    slowTimer.current = window.setTimeout(() => {
      if (!cancelled) setError('slow');
    }, OGP_TIMING.roomSlowNoticeMs);

    (async () => {
      setLoading(true);
      try {
        const result = await api.getManifest('opening');
        if (cancelled) return;
        setManifest(result ?? null);
        setError(null);
      } catch {
        if (!cancelled) setError('slow');
      } finally {
        if (!cancelled) setLoading(false);
        if (slowTimer.current) window.clearTimeout(slowTimer.current);
      }
    })();

    return () => {
      cancelled = true;
      if (slowTimer.current) window.clearTimeout(slowTimer.current);
    };
  }, [state, manifest]);

  // Restore the saved position once the manifest arrives. A returning reader does not
  // start over (§3.8.2).
  useEffect(() => {
    if (!manifest || !progressRef.current.currentUnitId) return;
    const index = units.findIndex((entry) => entry.unitId === progressRef.current.currentUnitId);
    if (index >= 0) setUnitIndex(index);
  }, [manifest, units]);

  // Current unit plus its immediate neighbours. Nothing else is ever held in the DOM.
  useEffect(() => {
    if (!manifest || units.length === 0) return undefined;
    let cancelled = false;

    const current = units[Math.min(unitIndex, units.length - 1)];
    if (!current) return undefined;

    (async () => {
      const fetched = await fetchUnit(current.unitId);
      if (cancelled) return;
      if (fetched) {
        setUnit(fetched);
        setError(null);
        setImmersionState(immersionForUnit(fetched));
      } else {
        setError('slow');
      }
      unitEnteredAt.current = Date.now();

      // Prefetch the neighbours so progression latency is effectively zero (§3.12).
      const previousEntry = units[unitIndex - 1];
      const nextEntry = units[unitIndex + 1];
      const [previous, next] = await Promise.all([
        previousEntry ? fetchUnit(previousEntry.unitId) : Promise.resolve(null),
        nextEntry ? fetchUnit(nextEntry.unitId) : Promise.resolve(null),
      ]);
      if (!cancelled) setNeighbours({ previous, next });
    })();

    return () => {
      cancelled = true;
    };
  }, [manifest, units, unitIndex, fetchUnit, setImmersionState]);

  /* ---------------------------------------------------------------- */
  /* Machine handshake                                                 */
  /* ---------------------------------------------------------------- */

  // The first unit being ready is what releases S9 into S10. `complete` is a scene signal,
  // never a reader intent, so it can never walk a reader past the age prompt.
  useEffect(() => {
    if (unit && state === STATES.S9_READING_ROOM_INIT) send(INTENTS.COMPLETE);
  }, [unit, state, send]);

  // `ReadingSessionStarted` fires when the first ManuscriptUnit renders, and is explicitly
  // NOT re-emitted on resume (BUILD_CONTRACT §3, §3.8.4).
  useEffect(() => {
    if (!unit || readingSessionEmitted.current) return;
    if (stateIndex(state) < stateIndex(STATES.S10_OPENING_ARC_READING)) return;
    readingSessionEmitted.current = true;
    emitEvent(EVENTS.READING_SESSION_STARTED, {
      resume: resumeAvailable,
      lastUnitId: resumeAvailable ? progressRef.current.currentUnitId : undefined,
    });
  }, [unit, state, resumeAvailable]);

  /* ---------------------------------------------------------------- */
  /* Progress                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * Persist locally, and mirror to the server when a session exists. Local first, always:
   * the device copy is what makes progress survive without an account.
   *
   * @param {Object} patch
   * @param {{ force?: boolean, keepalive?: boolean }} [options]
   */
  const writeProgress = useCallback((patch, options = {}) => {
    // `completedUnitId` and `readingMsDelta` are wire-only fields: they describe this
    // write, not the reader's position, and must not accumulate in the stored record.
    const { completedUnitId, readingMsDelta, ...positional } = patch;
    const next = { ...progressRef.current, ...positional };
    progressRef.current = next;
    setProgress(next);

    const now = Date.now();
    const due = now - lastProgressWrite.current >= OGP_TIMING.progressWriteIntervalMs;
    if (!options.force && !due) return;
    lastProgressWrite.current = now;

    if (settingsRef.current.rememberPlace) {
      writeReadingSession({
        current_unit_id: next.currentUnitId,
        scroll_fraction: next.scrollFraction,
        completed_unit_ids: next.completedUnitIds,
        chapters_completed: next.chaptersCompleted,
        total_reading_ms: next.totalReadingMs,
        settings: settingsRef.current,
      });
    }

    void api
      .postProgress(
        {
          savedPassageUnitId: next.currentUnitId ?? undefined,
          scrollFraction: next.scrollFraction,
          readingMsDelta: readingMsDelta ?? undefined,
          completedUnitId: completedUnitId ?? undefined,
        },
        { keepalive: options.keepalive === true },
      )
      .catch(() => {
        // Queued by the caller's local write; the server copy catches up on the next call.
      });
  }, []);

  /**
   * Record the reader's scroll position within the current unit.
   *
   * @param {number} fraction 0–1
   */
  const saveScroll = useCallback(
    (fraction) => {
      const clamped = Math.max(0, Math.min(1, fraction));
      writeProgress({ scrollFraction: clamped });
    },
    [writeProgress],
  );

  /** Complete the current unit: a boundary write, an event, and the next unit. */
  const markUnitComplete = useCallback(() => {
    const current = units[unitIndex];
    if (!current) return;

    // 0 until the unit has actually been mounted; report 0 rather than "since the epoch".
    const msReading = unitEnteredAt.current ? Date.now() - unitEnteredAt.current : 0;
    const completed = progressRef.current.completedUnitIds.includes(current.unitId)
      ? progressRef.current.completedUnitIds
      : [...progressRef.current.completedUnitIds, current.unitId];

    emitEvent(EVENTS.CHAPTER_COMPLETED, {
      unitId: current.unitId,
      componentIndex: current.componentIndex ?? current.sequenceIndex ?? unitIndex,
      msReading,
    });

    writeProgress(
      {
        completedUnitIds: completed,
        chaptersCompleted: completed.length,
        totalReadingMs: progressRef.current.totalReadingMs + msReading,
        completedUnitId: current.unitId,
        readingMsDelta: msReading,
        scrollFraction: 0,
      },
      { force: true },
    );
  }, [units, unitIndex, writeProgress]);

  /** Advance to the next unit, or complete the arc. Always an explicit reader action. */
  const advance = useCallback(() => {
    markUnitComplete();
    if (unitIndex >= units.length - 1) {
      // Final unit completed -> S13. The arc closes with decompression, not a celebration.
      send(INTENTS.COMPLETE);
      return;
    }
    setUnitIndex((index) => index + 1);
    const nextEntry = units[unitIndex + 1];
    if (nextEntry) writeProgress({ currentUnitId: nextEntry.unitId }, { force: true });
  }, [markUnitComplete, unitIndex, units, send, writeProgress]);

  /** Return to the previous unit. Returning is never penalised and never re-emits events. */
  const goBack = useCallback(() => {
    if (unitIndex <= 0) return;
    setUnitIndex((index) => index - 1);
    const previousEntry = units[unitIndex - 1];
    if (previousEntry) writeProgress({ currentUnitId: previousEntry.unitId }, { force: true });
  }, [unitIndex, units, writeProgress]);

  /** Continue from the kept place (§3.8.2). Bypasses the opening entirely. */
  const resume = useCallback(() => {
    const saved = readReadingSession();
    if (!saved.current_unit_id || !manifest) return;
    const index = units.findIndex((entry) => entry.unitId === saved.current_unit_id);
    if (index >= 0) setUnitIndex(index);
  }, [manifest, units]);

  /** Begin again from the start. Clears the kept place; nothing is retained silently. */
  const restart = useCallback(() => {
    clearReadingSession();
    unitCache.current.clear();
    readingSessionEmitted.current = false;
    setUnitIndex(0);
    const cleared = {
      currentUnitId: units[0]?.unitId ?? null,
      scrollFraction: 0,
      completedUnitIds: [],
      chaptersCompleted: 0,
      totalReadingMs: 0,
    };
    progressRef.current = cleared;
    setProgress(cleared);
  }, [units]);

  // Boundary and periodic writes, plus the visibilitychange write (§3.8.1).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      if (document.hidden) writeProgress({}, { force: true, keepalive: true });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [writeProgress]);

  /* ---------------------------------------------------------------- */
  /* Settings                                                          */
  /* ---------------------------------------------------------------- */

  /**
   * @param {string} key
   * @param {any} value
   */
  const setSetting = useCallback(
    (key, value) => {
      setSettings((previous) => {
        const next = { ...previous, [key]: value };
        settingsRef.current = next;
        writePreferences({ reading: next });
        if (next.rememberPlace) writeReadingSession({ settings: next });
        // Turning device memory off means device memory off. The marked passages are the
        // reader's own words about the manuscript held on this machine (§3.13), so they go
        // with the saved place rather than outliving the decision to stop keeping things.
        if (key === 'rememberPlace' && value === false) {
          clearReadingSession();
          clearPassageMarks();
        }
        return next;
      });
    },
    [],
  );

  // The experience-wide motion preference and the session's content layer are the sources of
  // truth; the reading panel shows and edits the same values rather than keeping a second,
  // divergent copy. They are DERIVED here rather than mirrored into state by an effect, so
  // there is never a frame in which the panel disagrees with the experience.
  const effectiveSettings = useMemo(() => {
    const merged = { ...settings, motion: motionPreference };
    if (FLAGS.ageLayerEnabled && contentLayer) merged.experienceDepth = contentLayer;
    return merged;
  }, [settings, motionPreference, contentLayer]);

  /* ---------------------------------------------------------------- */
  /* Gates                                                             */
  /* ---------------------------------------------------------------- */

  /**
   * Phase 1 gates, computed conservatively from position and authored flags only (§3.6.4).
   * No behavioural inference from scroll speed or dwell time. The server gates every
   * prompt again; these gates exist to SUPPRESS, never to target.
   */
  const gates = useMemo(() => {
    const entry = units[unitIndex] ?? null;
    const previousEntry = units[unitIndex - 1] ?? null;
    const inNoShareZone = Boolean(entry?.isHighImpact) || Boolean(entry?.isNoShareZone);
    const decompressionPending = Boolean(previousEntry?.requiresDecompressionAfter);
    return {
      allowPrompting: !inNoShareZone,
      allowSharing: !inNoShareZone && !decompressionPending,
      allowBecomeFamily: unitIndex >= units.length - 1,
      contentNoticeKey: entry?.contentNoticeKey ?? null,
    };
  }, [units, unitIndex]);

  const value = useMemo(
    () => ({
      manifest,
      unit,
      /** The mounted window: never more than the current unit and its two neighbours. */
      neighbours,
      unitIndex,
      unitCount: units.length,
      loading,
      error,
      settings: effectiveSettings,
      setSetting,
      progress,
      advance,
      goBack,
      markUnitComplete,
      saveScroll,
      gates,
      immersionState: immersionForUnit(unit),
      resumeAvailable,
      resume,
      restart,
    }),
    [
      manifest,
      unit,
      neighbours,
      unitIndex,
      units.length,
      loading,
      error,
      effectiveSettings,
      setSetting,
      progress,
      advance,
      goBack,
      markUnitComplete,
      saveScroll,
      gates,
      resumeAvailable,
      resume,
      restart,
    ],
  );

  return <ReadingContext.Provider value={value}>{children}</ReadingContext.Provider>;
};

export default ReadingProvider;
