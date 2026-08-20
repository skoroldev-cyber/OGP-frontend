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

export const useReading = () => {
  const context = useContext(ReadingContext);
  if (!context) throw new Error('useReading must be used within a ReadingProvider');
  return context;
};

const defaultSettings = () => ({
  textSizeIndex: OGP_TYPE.textSizeDefaultIndex,
  theme: READING_THEMES.DARK,
  motion: MOTION_PREFERENCES.FULL,
  audio: 'off',
  experienceDepth: null,
  rememberPlace: true,
  language: null,
  positionIndicator: false,
});

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

export const ReadingProvider = ({ children }) => {
  const { state, send, setImmersionState, contentLayer, motionPreference } = useExperience();

  const [manifest, setManifest] = useState(null);
  const [unitIndex, setUnitIndex] = useState(0);
  const [unit, setUnit] = useState(null);
  const [neighbours, setNeighbours] = useState({ previous: null, next: null });
  const [loading, setLoading] = useState(false);
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

  const unitCache = useRef(new Map());
  const readingSessionEmitted = useRef(false);
  const unitEnteredAt = useRef(0);
  const lastProgressWrite = useRef(0);
  const slowTimer = useRef(null);

  const progressRef = useRef(progress);
  const settingsRef = useRef(settings);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const units = useMemo(
    () => (manifest?.units ?? []).filter((unit) => unit.isReadingUnit !== false),
    [manifest],
  );

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

  useEffect(() => {
    if (!manifest || !progressRef.current.currentUnitId) return;
    const index = units.findIndex((entry) => entry.unitId === progressRef.current.currentUnitId);
    if (index >= 0) setUnitIndex(index);
  }, [manifest, units]);

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

  useEffect(() => {
    if (unit && state === STATES.S9_READING_ROOM_INIT) send(INTENTS.COMPLETE);
  }, [unit, state, send]);

  useEffect(() => {
    if (!unit || readingSessionEmitted.current) return;
    if (stateIndex(state) < stateIndex(STATES.S10_OPENING_ARC_READING)) return;
    readingSessionEmitted.current = true;
    emitEvent(EVENTS.READING_SESSION_STARTED, {
      resume: resumeAvailable,
      lastUnitId: resumeAvailable ? progressRef.current.currentUnitId : undefined,
    });
  }, [unit, state, resumeAvailable]);

  const writeProgress = useCallback((patch, options = {}) => {
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
      });
  }, []);

  const saveScroll = useCallback(
    (fraction) => {
      const clamped = Math.max(0, Math.min(1, fraction));
      writeProgress({ scrollFraction: clamped });
    },
    [writeProgress],
  );

  const markUnitComplete = useCallback(() => {
    const current = units[unitIndex];
    if (!current) return;

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

  const advance = useCallback(() => {
    markUnitComplete();
    if (unitIndex >= units.length - 1) {
      send(INTENTS.COMPLETE);
      return;
    }
    setUnitIndex((index) => index + 1);
    const nextEntry = units[unitIndex + 1];
    if (nextEntry) writeProgress({ currentUnitId: nextEntry.unitId }, { force: true });
  }, [markUnitComplete, unitIndex, units, send, writeProgress]);

  const goBack = useCallback(() => {
    if (unitIndex <= 0) return;
    setUnitIndex((index) => index - 1);
    const previousEntry = units[unitIndex - 1];
    if (previousEntry) writeProgress({ currentUnitId: previousEntry.unitId }, { force: true });
  }, [unitIndex, units, writeProgress]);

  const resume = useCallback(() => {
    const saved = readReadingSession();
    if (!saved.current_unit_id || !manifest) return;
    const index = units.findIndex((entry) => entry.unitId === saved.current_unit_id);
    if (index >= 0) setUnitIndex(index);
  }, [manifest, units]);

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

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      if (document.hidden) writeProgress({}, { force: true, keepalive: true });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [writeProgress]);

  const setSetting = useCallback(
    (key, value) => {
      setSettings((previous) => {
        const next = { ...previous, [key]: value };
        settingsRef.current = next;
        writePreferences({ reading: next });
        if (next.rememberPlace) writeReadingSession({ settings: next });
        if (key === 'rememberPlace' && value === false) {
          clearReadingSession();
          clearPassageMarks();
        }
        return next;
      });
    },
    [],
  );

  const effectiveSettings = useMemo(() => {
    const merged = { ...settings, motion: motionPreference };
    if (FLAGS.ageLayerEnabled && contentLayer) merged.experienceDepth = contentLayer;
    return merged;
  }, [settings, motionPreference, contentLayer]);

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
