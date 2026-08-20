import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FLAGS } from '@/config/env';
import { ASSET_GROUPS, groupsForTier, warmGroup } from '@/config/assetManifest';
import { usePerformance } from '@/context/PerformanceContext';
import { EVENTS, INTENTS, MOTION_PREFERENCES, contentLayerForAgeBand } from '@/experience/states';
import { createExperienceMachine } from '@/experience/stateMachine';
import { emit as emitEvent, flush as flushEvents, initEvents } from '@/services/events';
import { ensureSession, patchSessionQuietly } from '@/services/session';
import {
  AREAS,
  STORAGE_KEYS,
  readPreferences,
  readReadingSession,
  writePreferences,
  writeRecord,
} from '@/services/storage';
import { referrerDomain, supportsHover } from '@/utils/deviceDetect';

const ExperienceContext = createContext(null);

export const useExperience = () => {
  const context = useContext(ExperienceContext);
  if (!context) throw new Error('useExperience must be used within an ExperienceProvider');
  return context;
};

const MOTION = MOTION_PREFERENCES.FULL;

const dropStoredMotion = (prefs) => {
  if (!prefs || !('motionPreference' in prefs)) return;
  const { motionPreference: _discarded, ...rest } = prefs;
  writeRecord(AREAS.LOCAL, STORAGE_KEYS.PREFS, rest);
};

const buildEventPayload = (name, emission, context, device) => {
  const reduced = false;

  switch (name) {
    case EVENTS.LANDING_STARTED:
      return {
        entryPath: typeof window !== 'undefined' ? window.location.pathname : '/',
        referrerDomain: referrerDomain(),
        reducedMotion: reduced,
        deviceTier: device.tier,
        locale: typeof navigator !== 'undefined' ? navigator.language : 'en',
        isReturnVisit: context.isReturnVisit === true,
      };
    case EVENTS.LOGO_MANIFESTATION_STARTED:
      return { msSinceLanding: emission.msSinceLanding, skippedIntro: emission.skipped };
    case EVENTS.PORTAL_ENTRY_STARTED:
      return {
        msSinceLanding: emission.msSinceLanding,
        inputMethod: emission.inputMethod || 'pointer',
        skippedCinematic: emission.skipped,
        silentMode: context.audioEnabled !== true,
        motionMode: reduced ? 'reduced' : 'full',
      };
    case EVENTS.EARTH_REVEAL_COMPLETED:
      return {
        msSinceLanding: emission.msSinceLanding,
        mode: emission.skipped ? 'skipped' : reduced ? 'reduced' : 'full',
        audioEnabled: context.audioEnabled === true,
      };
    case EVENTS.READING_ROOM_ENTERED:
      return {
        msSinceLanding: emission.msSinceLanding,
        entryType: emission.skipped ? 'skip_cinematic' : context.entryVia || 'full',
      };
    case EVENTS.SHARE_PROMPT_DISPLAYED:
      return { promptId: context.sharePromptId, unitId: context.currentUnitId };
    case EVENTS.OPENING_ARC_COMPLETED:
      return {
        totalMsReading: context.totalMsReading ?? 0,
        componentsCompleted: context.componentsCompleted ?? 0,
        sharesCompleted: context.sharesCompleted ?? 0,
      };
    default:
      return {};
  }
};

export const ExperienceProvider = ({ children, initialState, entryVia, rootEntry = false }) => {
  const { tier, settings } = usePerformance();

  const machineRef = useRef(null);
  const deviceRef = useRef({ tier, settings });
  useEffect(() => {
    deviceRef.current = { tier, settings };
  }, [tier, settings]);

  const cameraOverrideRef = useRef(false);
  const [isCameraOverridden, setIsCameraOverridden] = useState(false);

  const preferences = useRef(null);
  if (preferences.current === null) preferences.current = readPreferences();

  const [snapshot, setSnapshot] = useState(() => ({ state: null, context: null }));

  const getMachine = useCallback(() => {
    if (machineRef.current) return machineRef.current;

    const prefs = preferences.current ?? {};
    const savedReading = readReadingSession();

    machineRef.current = createExperienceMachine({
      initialState,
      rootEntry,
      context: {
        motionPreference: MOTION,
        systemReducedMotion: false,
        audioEnabled: prefs.audioEnabled === true,
        ageLayerEnabled: FLAGS.ageLayerEnabled,
        betaMode: FLAGS.betaMode,
        entryVia: entryVia || null,
        isReturnVisit: Boolean(savedReading?.current_unit_id),
      },
      onEmit: (name, emission, context) => {
        emitEvent(name, buildEventPayload(name, emission, context ?? {}, deviceRef.current));
      },
      onTransition: ({ to, context }) => {
        void patchSessionQuietly({
          currentState: to,
          immersionState: context.immersionState ?? undefined,
          paceMode: context.paceMode ?? undefined,
          motionPreference: context.motionPreference,
          audioEnabled: context.audioEnabled === true,
        });
      },
    });
    return machineRef.current;
  }, [initialState, entryVia, rootEntry]);

  useEffect(() => {
    const machine = getMachine();
    const unsubscribe = machine.subscribe((state, context) => setSnapshot({ state, context }));
    setSnapshot({ state: machine.getState(), context: machine.getContext() });

    const teardownEvents = initEvents();

    void ensureSession({
      motionPreference: machine.getContext().motionPreference,
      entryVia: entryVia || undefined,
    }).then(() => flushEvents());

    writePreferences({ hasVisited: true });

    return () => {
      unsubscribe();
      machine.destroy();
      machineRef.current = null;
      teardownEvents();
    };
  }, [getMachine, entryVia]);

  useEffect(() => {
    dropStoredMotion(preferences.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const machine = getMachine();
    const allowed = groupsForTier(tier);
    const options = { tier, supportsHover: supportsHover() };

    for (const group of Object.values(ASSET_GROUPS)) {
      if (!allowed.includes(group)) {
        machine.setContext({
          assetsReady: { ...machine.getContext().assetsReady, [group]: true },
        });
      }
    }

    (async () => {
      for (const group of allowed) {
        await warmGroup(group, options);
        if (cancelled) return;
        machine.setContext({
          assetsReady: { ...machine.getContext().assetsReady, [group]: true },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getMachine, tier]);

  const send = useCallback((intent, meta) => getMachine().send(intent, meta), [getMachine]);

  const advance = useCallback((meta) => send(INTENTS.ADVANCE, meta), [send]);
  const skip = useCallback((meta) => send(INTENTS.SKIP, meta), [send]);

  const restart = useCallback(() => getMachine().restart(), [getMachine]);

  const setAudioEnabled = useCallback(
    (value) => {
      writePreferences({ audioEnabled: value === true });
      getMachine().setContext({ audioEnabled: value === true });
    },
    [getMachine],
  );

  const setAgeBand = useCallback(
    (band) => {
      getMachine().setContext({ ageBand: band, contentLayer: contentLayerForAgeBand(band) });
    },
    [getMachine],
  );

  const markAssetsReady = useCallback(
    (group) => {
      const machine = getMachine();
      machine.setContext({ assetsReady: { ...machine.getContext().assetsReady, [group]: true } });
    },
    [getMachine],
  );

  const assetsReady = useCallback(
    (group) => snapshot.context?.assetsReady?.[group] === true,
    [snapshot.context],
  );

  const setCameraOverride = useCallback((owned) => {
    cameraOverrideRef.current = owned === true;
    setIsCameraOverridden(owned === true);
  }, []);

  const setImmersionState = useCallback(
    (immersionState) => getMachine().setContext({ immersionState }),
    [getMachine],
  );

  const is = useCallback((state) => snapshot.state === state, [snapshot.state]);

  const context = snapshot.context;
  const motionPreference = MOTION;
  const reducedMotion = false;

  const value = useMemo(
    () => ({
      state: snapshot.state,
      context,
      send,
      is,
      advance,
      skip,
      restart,
      motionPreference,
      reducedMotion,
      audioEnabled: context?.audioEnabled === true,
      setAudioEnabled,
      setAgeBand,
      markAssetsReady,
      assetsReady,
      setCameraOverride,
      isCameraOverridden,
      cameraOverrideRef,
      setImmersionState,
      immersionState: context?.immersionState ?? null,
      skipUsed: context?.skipUsed === true,
      skipOfferedImmediately: context?.skipOfferedImmediately === true,
      contentLayer: context?.contentLayer,
      ageBand: context?.ageBand ?? null,
    }),
    [
      snapshot.state,
      context,
      send,
      is,
      advance,
      skip,
      restart,
      motionPreference,
      reducedMotion,
      setAudioEnabled,
      setAgeBand,
      markAssetsReady,
      assetsReady,
      setCameraOverride,
      isCameraOverridden,
      setImmersionState,
    ],
  );

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
};

export default ExperienceProvider;
