import { OGP_TIMING } from '@/config/ogpTheme';
import { ASSET_GROUPS } from '@/config/assetManifest';
import {
  CINEMATIC_STATES,
  DEFAULT_CONTENT_LAYER,
  EVENTS,
  IMMERSION_STATES,
  INTENTS,
  MOTION_PREFERENCES,
  ONCE_PER_SESSION_EVENTS,
  PACE_MODES,
  RESUME_CHECKPOINTS,
  STATES,
  STATE_ORDER,
  isCinematic,
  stateIndex,
} from '@/experience/states';
import {
  anyOf,
  assetsReady,
  contextFlag,
  minDwell,
  not,
  passes,
  readerIntent,
  sceneComplete,
} from '@/experience/guards';
import { AREAS, STORAGE_KEYS, mergeNamespaced, readNamespaced, removeRecord } from '@/services/storage';

const T = OGP_TIMING.states;

const PERSISTED_KEYS = [
  'state',
  'skipUsed',
  'motionPreference',
  'audioEnabled',
  'ageBand',
  'contentLayer',
];

const TABLE = {
  [STATES.S0_SITE_ARRIVAL]: {
    advance: {
      to: STATES.S1_DARKNESS,
      guards: [
        anyOf(
          assetsReady(ASSET_GROUPS.OPENING),
          minDwell(OGP_TIMING.arrivalCeilingMs.slow),
        ),
      ],
    },
  },

  [STATES.S1_DARKNESS]: {
    emits: [EVENTS.LANDING_STARTED],
    onEnter: () => ({ immersionState: null, paceMode: PACE_MODES.SLOW }),
    advance: {
      to: STATES.S2_DISTANT_SPECK,
      guards: [
        minDwell(T.S1.minDwellMs),
        anyOf(
          assetsReady(ASSET_GROUPS.OPENING),
          minDwell(T.S1.targetMs + OGP_TIMING.warmupCeilingMs),
        ),
        minDwell(T.S1.targetMs),
      ],
    },
  },

  [STATES.S2_DISTANT_SPECK]: {
    advance: {
      to: STATES.S3_LOGO_MANIFESTATION,
      guards: [minDwell(T.S2.minDwellMs), anyOf(sceneComplete(), minDwell(T.S2.targetMs))],
    },
  },

  [STATES.S3_LOGO_MANIFESTATION]: {
    emits: [EVENTS.LOGO_MANIFESTATION_STARTED],
    advance: {
      to: STATES.S4_LIVING_WEAVE,
      guards: [minDwell(T.S3.minDwellMs), anyOf(sceneComplete(), minDwell(T.S3.targetMs))],
    },
  },

  [STATES.S4_LIVING_WEAVE]: {
    advance: {
      to: STATES.S5_PORTAL_ENTRY,
      guards: [
        minDwell(T.S4.minDwellMs),
        anyOf(assetsReady(ASSET_GROUPS.EARTH), minDwell(T.S4.targetMs)),
        anyOf(sceneComplete(), minDwell(T.S4.targetMs)),
      ],
    },
  },

  [STATES.S5_PORTAL_ENTRY]: {
    advance: {
      to: STATES.S6_WEAVE_PASSAGE,
      guards: [readerIntent()],
    },
  },

  [STATES.S6_WEAVE_PASSAGE]: {
    emits: [EVENTS.PORTAL_ENTRY_STARTED],
    advance: {
      to: STATES.S7_EARTH_REVEAL,
      guards: [
        minDwell(T.S6.minDwellMs),
        anyOf(assetsReady(ASSET_GROUPS.EARTH), minDwell(OGP_TIMING.warmupCeilingMs)),
        anyOf(sceneComplete(), minDwell(T.S6.targetMs)),
      ],
    },
  },

  [STATES.S7_EARTH_REVEAL]: {
    advance: {
      to: STATES.S8_READING_ROOM_INVITATION,
      guards: [minDwell(T.S7.minDwellMs), anyOf(sceneComplete(), minDwell(T.S7.targetMs))],
    },
  },

  [STATES.S8_READING_ROOM_INVITATION]: {
    emits: [EVENTS.EARTH_REVEAL_COMPLETED],
    onEnter: () => ({ immersionState: IMMERSION_STATES.ENTRY }),
    advance: {
      to: STATES.S9_READING_ROOM_INIT,
      guards: [
        readerIntent(),
        anyOf(
          assetsReady(ASSET_GROUPS.READING_CORE),
          minDwell(OGP_TIMING.warmupCeilingMs),
        ),
      ],
    },
  },

  [STATES.S9_READING_ROOM_INIT]: {
    emits: [EVENTS.READING_ROOM_ENTERED],
    onEnter: () => ({ immersionState: IMMERSION_STATES.ORIENTATION }),
    advance: {
      to: STATES.S10_OPENING_ARC_READING,
      guards: [
        minDwell(T.S9.minDwellMs),
        anyOf(not(contextFlag('ageLayerEnabled')), readerIntent()),
        anyOf(sceneComplete(), minDwell(T.S9.targetMs)),
      ],
    },
  },

  [STATES.S10_OPENING_ARC_READING]: {
    onEnter: () => ({ immersionState: IMMERSION_STATES.READING, paceMode: PACE_MODES.NATURAL }),
    advance: {
      to: STATES.S11_SHARE_OPPORTUNITY,
      guards: [contextFlag('shareWindowOpen')],
    },
    complete: { to: STATES.S13_OPENING_ARC_COMPLETE, guards: [] },
  },

  [STATES.S11_SHARE_OPPORTUNITY]: {
    emits: [EVENTS.SHARE_PROMPT_DISPLAYED],
    onEnter: () => ({ immersionState: IMMERSION_STATES.SHARING_READY }),
    advance: { to: STATES.S12_CONTINUE_READING, guards: [] },
  },

  [STATES.S12_CONTINUE_READING]: {
    onEnter: () => ({ immersionState: IMMERSION_STATES.RETURN, paceMode: PACE_MODES.RETURNING }),
    advance: { to: STATES.S10_OPENING_ARC_READING, guards: [] },
    complete: { to: STATES.S13_OPENING_ARC_COMPLETE, guards: [] },
  },

  [STATES.S13_OPENING_ARC_COMPLETE]: {
    emits: [EVENTS.OPENING_ARC_COMPLETED],
    onEnter: () => ({ immersionState: IMMERSION_STATES.DECOMPRESSION, paceMode: PACE_MODES.PAUSED }),
    advance: {
      to: STATES.S14_CHOOSE_YOUR_PATH,
      guards: [minDwell(T.S13.minDwellMs), readerIntent()],
    },
  },

  [STATES.S14_CHOOSE_YOUR_PATH]: {
    onEnter: () => ({ immersionState: IMMERSION_STATES.CONVERGENCE }),
  },
};

const createInitialContext = () => ({
  state: STATES.S0_SITE_ARRIVAL,
  previousState: null,
  startedAt: Date.now(),
  stateEnteredAt: Date.now(),
  landingAt: null,

  pendingIntent: null,
  lastIntent: null,
  inputMethod: null,

  skipUsed: false,
  skipOfferedImmediately: false,
  resumed: false,
  entryVia: null,

  motionPreference: MOTION_PREFERENCES.FULL,
  systemReducedMotion: false,
  audioEnabled: false,

  ageBand: null,
  contentLayer: DEFAULT_CONTENT_LAYER,
  ageLayerEnabled: false,
  betaMode: false,

  immersionState: null,
  paceMode: PACE_MODES.NATURAL,

  assetsReady: {
    [ASSET_GROUPS.OPENING]: false,
    [ASSET_GROUPS.EARTH]: false,
    [ASSET_GROUPS.READING_CORE]: false,
    [ASSET_GROUPS.PATHWAYS]: false,
  },
  sceneComplete: {},
  shareWindowOpen: false,

  emitted: [],
});

export const readPersistedMachine = () =>
  readNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'machine');

export const clearPersistedMachine = () => removeRecord(AREAS.SESSION, STORAGE_KEYS.SESSION);

export const resolveResumeState = (saved) => {
  if (!saved || stateIndex(saved) < 0) {
    return { state: STATES.S0_SITE_ARRIVAL, skipOfferedImmediately: false };
  }
  if (RESUME_CHECKPOINTS.includes(saved)) {
    return { state: saved, skipOfferedImmediately: false };
  }
  if (isCinematic(saved)) {
    return { state: STATES.S1_DARKNESS, skipOfferedImmediately: true };
  }
  if (saved === STATES.S0_SITE_ARRIVAL) {
    return { state: STATES.S0_SITE_ARRIVAL, skipOfferedImmediately: false };
  }
  if (saved === STATES.S8_READING_ROOM_INVITATION) {
    return { state: STATES.S1_DARKNESS, skipOfferedImmediately: true };
  }
  return { state: STATES.S10_OPENING_ARC_READING, skipOfferedImmediately: false };
};

export const resolveRootEntry = (saved) => {
  const seenBefore = Boolean(saved) && stateIndex(saved) > stateIndex(STATES.S0_SITE_ARRIVAL);
  return {
    state: STATES.S0_SITE_ARRIVAL,
    skipOfferedImmediately: seenBefore,
  };
};

export const createExperienceMachine = ({
  initialState,
  rootEntry = false,
  context: contextPatch,
  onTransition,
  onEmit,
  autoTick = true,
} = {}) => {
  let context = { ...createInitialContext(), ...contextPatch };
  let destroyed = false;
  let hiddenAt =
    typeof document !== 'undefined' && document.hidden ? Date.now() : null;
  let tickHandle = null;

  const listeners = new Set();

  const persisted = readPersistedMachine();
  if (persisted && typeof persisted === 'object') {
    if (typeof persisted.skipUsed === 'boolean') context.skipUsed = persisted.skipUsed;
    if (persisted.motionPreference) context.motionPreference = persisted.motionPreference;
    if (typeof persisted.audioEnabled === 'boolean') context.audioEnabled = persisted.audioEnabled;
    if (persisted.ageBand) context.ageBand = persisted.ageBand;
    if (persisted.contentLayer) context.contentLayer = persisted.contentLayer;
    if (persisted.state) {
      const resume = resolveResumeState(persisted.state);
      context.state = resume.state;
      context.skipOfferedImmediately = resume.skipOfferedImmediately;
      context.resumed = true;
    }
  }
  if (rootEntry) {
    const entry = resolveRootEntry(persisted?.state);
    context.state = entry.state;
    context.skipOfferedImmediately = entry.skipOfferedImmediately;
    context.resumed = false;
  } else if (initialState && stateIndex(initialState) >= 0) {
    context.state = initialState;
    context.resumed = false;
  }
  context.stateEnteredAt = Date.now();

  const notify = () => {
    for (const listener of listeners) listener(context.state, context);
  };

  const persist = () => {
    const slice = {};
    for (const key of PERSISTED_KEYS) slice[key] = context[key];
    mergeNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'machine', slice);
  };

  const emit = (name, extra = {}) => {
    const onlyOnce = ONCE_PER_SESSION_EVENTS.includes(name);
    if (onlyOnce && context.emitted.includes(name)) return;
    if (onlyOnce) context = { ...context, emitted: [...context.emitted, name] };
    onEmit?.(
      name,
      {
        state: context.state,
        skipped: extra.skipped === true,
        msSinceLanding: context.landingAt ? Date.now() - context.landingAt : 0,
        inputMethod: context.inputMethod,
      },
      context,
    );
  };

  const enter = (next, intent, options = {}) => {
    const from = context.state;
    const entry = TABLE[next] ?? {};

    context = {
      ...context,
      previousState: from,
      state: next,
      stateEnteredAt: Date.now(),
      pendingIntent: null,
      lastIntent: intent,
      landingAt: next === STATES.S1_DARKNESS && !context.landingAt ? Date.now() : context.landingAt,
      ...(entry.onEnter ? entry.onEnter(context) : null),
    };

    for (const name of entry.emits ?? []) emit(name, { skipped: options.skipped === true });

    persist();
    onTransition?.({ from, to: next, intent, context });
    notify();
  };

  const attempt = (kind = 'advance') => {
    if (destroyed) return false;
    const transition = TABLE[context.state]?.[kind];
    if (!transition) return false;

    const evaluated = { ...context, now: Date.now() };
    if (!passes(transition.guards, evaluated)) return false;

    enter(transition.to, kind);
    return true;
  };

  const skip = () => {
    const target = STATES.S8_READING_ROOM_INVITATION;
    if (stateIndex(context.state) >= stateIndex(target)) return false;

    context = { ...context, skipUsed: true, skipOfferedImmediately: false };

    const upto = stateIndex(target);
    for (let index = 0; index <= upto; index += 1) {
      for (const name of TABLE[STATE_ORDER[index]]?.emits ?? []) {
        emit(name, { skipped: true });
      }
    }

    enter(target, INTENTS.SKIP, { skipped: true });
    return true;
  };

  const cross = () => {
    const target = STATES.S8_READING_ROOM_INVITATION;
    if (stateIndex(context.state) >= stateIndex(target)) return false;

    const upto = stateIndex(target);
    for (let index = 0; index <= upto; index += 1) {
      for (const name of TABLE[STATE_ORDER[index]]?.emits ?? []) {
        emit(name, { skipped: false });
      }
    }

    enter(target, INTENTS.CROSS, { skipped: false });
    return true;
  };

  const send = (intent, meta = {}) => {
    if (destroyed) return false;

    if (meta.inputMethod) context = { ...context, inputMethod: meta.inputMethod };

    switch (intent) {
      case INTENTS.SKIP:
        return skip();

      case INTENTS.CROSS:
        return cross();

      case INTENTS.COMPLETE: {
        context = {
          ...context,
          sceneComplete: { ...context.sceneComplete, [context.state]: true },
        };
        return TABLE[context.state]?.complete ? attempt('complete') : attempt('advance');
      }

      case INTENTS.BACK: {
        context = { ...context, pendingIntent: INTENTS.BACK };
        const moved = attempt('back');
        if (!moved) context = { ...context, pendingIntent: null };
        return moved;
      }

      case INTENTS.ADVANCE:
      case INTENTS.ENTER:
      default:
        context = { ...context, pendingIntent: intent };
        notify();
        return attempt('advance');
    }
  };

  const tick = () => {
    if (destroyed) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    attempt('advance');
  };

  const handleVisibility = () => {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      hiddenAt = Date.now();
      return;
    }
    if (hiddenAt != null) {
      context = { ...context, stateEnteredAt: context.stateEnteredAt + (Date.now() - hiddenAt) };
      hiddenAt = null;
    }
  };

  if (autoTick && typeof window !== 'undefined') {
    tickHandle = window.setInterval(tick, OGP_TIMING.machineTickMs);
    document.addEventListener('visibilitychange', handleVisibility);
  }

  attempt('advance');

  return {
    getState: () => context.state,
    getContext: () => context,
    send,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setContext: (patch) => {
      if (destroyed || !patch) return;
      context = { ...context, ...patch };
      if (PERSISTED_KEYS.some((key) => key in patch)) persist();
      notify();
      attempt('advance');
    },
    restart: () => {
      if (destroyed) return;

      context = {
        ...context,
        state: STATES.S0_SITE_ARRIVAL,
        stateEnteredAt: Date.now(),
        landingAt: null,
        pendingIntent: null,
        lastIntent: null,
        inputMethod: null,
        skipUsed: false,
        skipOfferedImmediately: false,
        resumed: false,
        immersionState: null,
        sceneComplete: {},
        shareWindowOpen: false,
      };

      persist();
      notify();
      attempt('advance');
    },
    destroy: () => {
      destroyed = true;
      if (tickHandle != null) window.clearInterval(tickHandle);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
      listeners.clear();
    },
  };
};

export const TRANSITION_TABLE = TABLE;

export { CINEMATIC_STATES };

export default createExperienceMachine;
