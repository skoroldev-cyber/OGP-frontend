/**
 * The experience state machine — the application spine (master §7.2).
 *
 * Dependency-free. No XState, no reducer library: the whole point of the machine is that
 * the transition table can be read as a score, beside the §2.2 timing document, by someone
 * who does not write JavaScript.
 *
 * Two laws are encoded here and nowhere else:
 *
 *   1. A transition fires only when EVERY guard passes. Otherwise the machine WAITS and
 *      re-evaluates on the next intent or tick. Progression is driven by readiness and
 *      reader intent, never a rigid film timeline (§2.2, locked).
 *   2. `skip` from any cinematic state lands on S8 — the invitation over the still Earth
 *      composition — records `skipUsed`, and back-emits every bypassed canonical event with
 *      `{ skipped: true }` so the funnel stays coherent (§2.10). "Skip must preserve
 *      continuity": the reader lands in the same world, not on a different page.
 *
 * The machine owns no DOM, no canvas and no network. It emits; `ExperienceProvider` wires
 * those emissions to the event pipeline, and canvas systems report back with `complete`.
 */

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

/** Fields persisted to `ogp_session_v1`. Nothing else about the reader is written. */
const PERSISTED_KEYS = [
  'state',
  'skipUsed',
  'motionPreference',
  'audioEnabled',
  'ageBand',
  'contentLayer',
];

/* -------------------------------------------------------------------------- */
/* The transition table — the §2.2 score, executable                           */
/* -------------------------------------------------------------------------- */

/**
 * Each entry may declare:
 *   `onEnter(context)` -> partial context applied on entry (immersion state, pace)
 *   `emits`            -> canonical event names fired on entry
 *   `advance`          -> { to, guards[] } the forward transition
 *   `complete`         -> { to, guards[] } an explicit scene/reading completion transition
 *   `back`             -> { to, guards[] } (unit-level "back" belongs to ReadingProvider,
 *                          so the machine declares none; the intent is supported generically)
 *
 * The per-state template fields (Purpose, Visuals, Interaction, Triggers, Frontend Actions,
 * Backend Events, Data Updates, Fallback) live in master §2.4 and §3; the comments below
 * carry only the clause each transition implements.
 */
const TABLE = {
  /** S0 Site Arrival — technical arrival, never perceptible as distinct from S1 (§2.4.1). */
  [STATES.S0_SITE_ARRIVAL]: {
    advance: {
      to: STATES.S1_DARKNESS,
      // Session + capability detection + S1–S2 assets resident, with the §2.4.1 ceiling:
      // enter S1 anyway and stream behind the darkness.
      guards: [
        anyOf(
          assetsReady(ASSET_GROUPS.OPENING),
          minDwell(OGP_TIMING.arrivalCeilingMs.slow),
        ),
      ],
    },
  },

  /** S1 Darkness — "The ordinary world disappears." S1 doubles as the loading window. */
  [STATES.S1_DARKNESS]: {
    emits: [EVENTS.LANDING_STARTED],
    onEnter: () => ({ immersionState: null, paceMode: PACE_MODES.SLOW }),
    advance: {
      to: STATES.S2_DISTANT_SPECK,
      // Dwell floor 2 s (§7.2.1); leave at the 0–5 s score target once OPENING is warm;
      // if the assets never arrive, the ceiling releases the reader rather than stranding them.
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

  /** S2 Distant Speck — "Life appears before identity." Recognition 1. */
  [STATES.S2_DISTANT_SPECK]: {
    advance: {
      to: STATES.S3_LOGO_MANIFESTATION,
      // Exits on the energy field reaching relational coherence (~16 s cumulative),
      // extendable while S3 assets finish (§2.4.3).
      guards: [minDwell(T.S2.minDwellMs), anyOf(sceneComplete(), minDwell(T.S2.targetMs))],
    },
  },

  /** S3 Logo Manifestation — "Energy → relationship → form." Recognition 2 begins. */
  [STATES.S3_LOGO_MANIFESTATION]: {
    emits: [EVENTS.LOGO_MANIFESTATION_STARTED],
    advance: {
      to: STATES.S4_LIVING_WEAVE,
      // Exits when the weave is fully resolved, pulsing stably, centre depth cue ready.
      guards: [minDwell(T.S3.minDwellMs), anyOf(sceneComplete(), minDwell(T.S3.targetMs))],
    },
  },

  /** S4 Living Weave — threshold, Earth discovered through the opening, breath (§2.4.5). */
  [STATES.S4_LIVING_WEAVE]: {
    advance: {
      to: STATES.S5_PORTAL_ENTRY,
      // Sub-beat (a) extends until the Earth textures arrive — "never a loader" (§2.4.5
      // fallback). Then the breath hold completes at ~70 s cumulative.
      guards: [
        minDwell(T.S4.minDwellMs),
        anyOf(assetsReady(ASSET_GROUPS.EARTH), minDwell(T.S4.targetMs)),
        anyOf(sceneComplete(), minDwell(T.S4.targetMs)),
      ],
    },
  },

  /**
   * S5 Portal Entry — "The first human truth."
   * The landing's single meaningful choice. The state holds INDEFINITELY: no timeout,
   * no auto-advance, no attention-recapture (§2.4.6).
   */
  [STATES.S5_PORTAL_ENTRY]: {
    advance: {
      to: STATES.S6_WEAVE_PASSAGE,
      guards: [readerIntent()],
    },
  },

  /**
   * S6 Weave Passage — 2–4 s. `PortalEntryStarted` fires here because entering S6 IS the
   * S5→S6 commit: "the event marks chosen entry, not invitation display" (§2.4.6).
   */
  [STATES.S6_WEAVE_PASSAGE]: {
    emits: [EVENTS.PORTAL_ENTRY_STARTED],
    advance: {
      to: STATES.S7_EARTH_REVEAL,
      // S7 assets not resident → hold the bright-centre frame (it reads as light, not
      // loading), with the 8 s ceiling then still-frame arrival (§2.4.7 fallback).
      guards: [
        minDwell(T.S6.minDwellMs),
        anyOf(assetsReady(ASSET_GROUPS.EARTH), minDwell(OGP_TIMING.warmupCeilingMs)),
        anyOf(sceneComplete(), minDwell(T.S6.targetMs)),
      ],
    },
  },

  /** S7 Earth Reveal — full planetary presence; the opening's primary funnel milestone. */
  [STATES.S7_EARTH_REVEAL]: {
    advance: {
      to: STATES.S8_READING_ROOM_INVITATION,
      // Reveal-and-hold complete, or the reduced-motion equivalent, which has no timeline
      // to complete and therefore relies on the score target (§2.4.8 fallback).
      guards: [minDwell(T.S7.minDwellMs), anyOf(sceneComplete(), minDwell(T.S7.targetMs))],
    },
  },

  /**
   * S8 Reading Room Invitation — `EarthRevealCompleted` fires on entry, which is exactly
   * the moment the reveal-and-hold completed (§2.4.8 / BUILD_CONTRACT §3).
   * Holds indefinitely: "The experience stops and waits. It does not force the visitor
   * onward." (§3.2)
   */
  [STATES.S8_READING_ROOM_INVITATION]: {
    emits: [EVENTS.EARTH_REVEAL_COMPLETED],
    onEnter: () => ({ immersionState: IMMERSION_STATES.ENTRY }),
    advance: {
      to: STATES.S9_READING_ROOM_INIT,
      // The reader activates "Enter". Their intent is latched, so if the reading core is
      // still warming the transition fires the instant it is ready — never a dropped press.
      guards: [
        readerIntent(),
        anyOf(
          assetsReady(ASSET_GROUPS.READING_CORE),
          minDwell(OGP_TIMING.warmupCeilingMs),
        ),
      ],
    },
  },

  /** S9 Reading Room Initialization — calibration (Phase 1B) and hand-off to the manuscript. */
  [STATES.S9_READING_ROOM_INIT]: {
    emits: [EVENTS.READING_ROOM_ENTERED],
    onEnter: () => ({ immersionState: IMMERSION_STATES.ORIENTATION }),
    advance: {
      to: STATES.S10_OPENING_ARC_READING,
      guards: [
        minDwell(T.S9.minDwellMs),
        // With the age layer OFF (the launch default) S9 settles straight into S10 with
        // contentLayer = full_manuscript. With it ON, a reader choice is required (§3.3).
        anyOf(not(contextFlag('ageLayerEnabled')), readerIntent()),
        // ReadingProvider reports `complete` once the first unit is ready; the target acts
        // as the ceiling so a slow manifest shows the calm notice rather than a dead end.
        anyOf(sceneComplete(), minDwell(T.S9.targetMs)),
      ],
    },
  },

  /**
   * S10 Opening Arc Reading. Its exits are not linear:
   *   `advance`  -> S11, only when the server has opened a share window (§3.7)
   *   `complete` -> S13, when the final unit is completed
   */
  [STATES.S10_OPENING_ARC_READING]: {
    onEnter: () => ({ immersionState: IMMERSION_STATES.READING, paceMode: PACE_MODES.NATURAL }),
    advance: {
      to: STATES.S11_SHARE_OPPORTUNITY,
      // Never a client decision: the flag is set only after `GET /sharing/eligibility`
      // returns an open, allowed window. Sharing is human continuity transfer only after
      // recognition, reflection, decompression and regulation (rules.json sharing rule).
      guards: [contextFlag('shareWindowOpen')],
    },
    complete: { to: STATES.S13_OPENING_ARC_COMPLETE, guards: [] },
  },

  /** S11 Share Opportunity — returns via S12 whether the reader shared or declined (§3.7). */
  [STATES.S11_SHARE_OPPORTUNITY]: {
    emits: [EVENTS.SHARE_PROMPT_DISPLAYED],
    onEnter: () => ({ immersionState: IMMERSION_STATES.SHARING_READY }),
    advance: { to: STATES.S12_CONTINUE_READING, guards: [] },
  },

  /** S12 Continue Reading — the "return" seam; no confirming animation after sharing. */
  [STATES.S12_CONTINUE_READING]: {
    onEnter: () => ({ immersionState: IMMERSION_STATES.RETURN, paceMode: PACE_MODES.RETURNING }),
    advance: { to: STATES.S10_OPENING_ARC_READING, guards: [] },
    complete: { to: STATES.S13_OPENING_ARC_COMPLETE, guards: [] },
  },

  /** S13 Opening Arc Complete — decompression, then one quiet affordance (§3.13). */
  [STATES.S13_OPENING_ARC_COMPLETE]: {
    emits: [EVENTS.OPENING_ARC_COMPLETED],
    onEnter: () => ({ immersionState: IMMERSION_STATES.DECOMPRESSION, paceMode: PACE_MODES.PAUSED }),
    advance: {
      to: STATES.S14_CHOOSE_YOUR_PATH,
      // The decompression hold is a floor, not a countdown: nothing is displayed about it.
      guards: [minDwell(T.S13.minDwellMs), readerIntent()],
    },
  },

  /** S14 Choose Your Path — terminal. Equal choices; leaving is never punished. */
  [STATES.S14_CHOOSE_YOUR_PATH]: {
    onEnter: () => ({ immersionState: IMMERSION_STATES.CONVERGENCE }),
  },
};

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * @returns {import('@/experience/guards').ExperienceContext}
 */
const createInitialContext = () => ({
  state: STATES.S0_SITE_ARRIVAL,
  previousState: null,
  startedAt: Date.now(),
  stateEnteredAt: Date.now(),
  /** Stamped when S1 is entered — the origin for every `msSinceLanding` payload. */
  landingAt: null,

  /** Latched reader intent. Survives failing guards until the transition fires. */
  pendingIntent: null,
  lastIntent: null,
  /** pointer | touch | keyboard | assistive — for the PortalEntryStarted payload. */
  inputMethod: null,

  skipUsed: false,
  /** A resumed cinematic offers skip immediately rather than replaying the reveal (§7.2.1). */
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

  /** Emit-once ledger. Array rather than Set so the context stays serialisable. */
  emitted: [],
});

/* -------------------------------------------------------------------------- */
/* Persistence and resume                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Read the persisted machine slice of `ogp_session_v1`.
 * Session-scoped by privacy policy: the record dies with the tab (§7.2.1).
 *
 * @returns {Object}
 */
export const readPersistedMachine = () =>
  readNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'machine');

/** Erase the persisted machine slice (used by "Begin again from the start"). */
export const clearPersistedMachine = () => removeRecord(AREAS.SESSION, STORAGE_KEYS.SESSION);

/**
 * Where a reload resumes.
 *
 * Checkpoints are S1 / S8 / S9 / S10 / S14. Everything else resolves to the nearest one:
 * a reader dropped mid-cinematic (S2–S7) restarts the opening at S1 with skip offered
 * immediately — reader intent overrides the film (§3.8.2) — and a reader dropped inside
 * the reading loop (S11–S13) returns to reading, which is where their place is kept.
 *
 * @param {string|null|undefined} saved
 * @returns {{ state: string, skipOfferedImmediately: boolean }}
 */
export const resolveResumeState = (saved) => {
  if (!saved || stateIndex(saved) < 0) {
    return { state: STATES.S0_SITE_ARRIVAL, skipOfferedImmediately: false };
  }
  if (RESUME_CHECKPOINTS.includes(saved)) {
    return { state: saved, skipOfferedImmediately: false };
  }
  // S2–S7: dropped mid-reveal. Restart the opening, with skip offered immediately so a
  // reader who has already seen it is never made to sit through it again (§3.8.2).
  if (isCinematic(saved)) {
    return { state: STATES.S1_DARKNESS, skipOfferedImmediately: true };
  }
  if (saved === STATES.S0_SITE_ARRIVAL) {
    return { state: STATES.S0_SITE_ARRIVAL, skipOfferedImmediately: false };
  }
  // S8: the reader reached the invitation but never entered. They have no place in the
  // manuscript to keep, so there is nothing to return them to — and dropping them straight
  // back onto a bare "Enter" strips the arrival that gives the word its meaning. Play the
  // threshold again; skip is offered immediately, so choosing to pass it costs one click.
  if (saved === STATES.S8_READING_ROOM_INVITATION) {
    return { state: STATES.S1_DARKNESS, skipOfferedImmediately: true };
  }
  // S9–S13 — the reader was in the room. Return them to reading.
  return { state: STATES.S10_OPENING_ARC_READING, skipOfferedImmediately: false };
};

/**
 * Where an arrival at the bare site address begins.
 *
 * `/` is the front door, and the opening is what is behind it. Resolving it through
 * `resolveResumeState` sent a returning reader straight into the room: the persisted
 * checkpoint said S10, so the darkness, the gathering light and the threshold — the ninety
 * seconds the whole work is built to arrive through — were skipped without anyone choosing
 * to skip them. That is right for a *reload*, which is why `/reading-room` still resolves
 * that way; it is wrong for someone typing the address in.
 *
 * So the opening always plays here, and a reader who has been before is offered skip from
 * the first frame — one click past it, exactly as §3.8.2 requires ("reader intent overrides
 * the film"). Their place in the manuscript is untouched either way: it lives in
 * `ogp_reading_session`, not in this machine, and `ReadingProvider` restores it when they
 * reach the room by whichever route.
 *
 * @param {string|null|undefined} saved The persisted machine state, if any.
 * @returns {{ state: string, skipOfferedImmediately: boolean }}
 */
export const resolveRootEntry = (saved) => {
  const seenBefore = Boolean(saved) && stateIndex(saved) > stateIndex(STATES.S0_SITE_ARRIVAL);
  return {
    state: STATES.S0_SITE_ARRIVAL,
    skipOfferedImmediately: seenBefore,
  };
};

/* -------------------------------------------------------------------------- */
/* Factory                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * @param {Object} [options]
 * @param {string} [options.initialState] overrides the persisted checkpoint (routing entry)
 * @param {boolean} [options.rootEntry] the arrival is at the bare site address, where the
 *   opening always plays — see `resolveRootEntry`
 * @param {Object} [options.context] initial context patch (flags, preferences)
 * @param {(transition: {from: string, to: string, intent: string, context: Object}) => void} [options.onTransition]
 * @param {(name: string, emission: Object, context: Object) => void} [options.onEmit]
 * @param {boolean} [options.autoTick] set false in tests to drive the machine manually
 * @returns {{
 *   getState: () => string,
 *   getContext: () => Object,
 *   send: (intent: string, meta?: Object) => boolean,
 *   subscribe: (listener: Function) => (() => void),
 *   setContext: (patch: Object) => void,
 *   destroy: () => void,
 * }}
 */
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
  // Seeded from the document's *initial* visibility, not from null.
  //
  // Opening a link in a background tab is ordinary behaviour, and in that case no
  // `visibilitychange` ever fires — the page is simply born hidden. Starting this at null meant
  // the machine banked dwell it never showed anyone, and the reader who finally switched to the
  // tab arrived to find every floor already satisfied: the opening fast-forwarded through
  // darkness, speck and manifestation on a single tick. §2.11 requires the render loop to halt
  // while hidden and resume "with no visible reset", and §2.2 makes dwell a minimum of
  // *attention* rather than of wall-clock. Both are only true if hidden time is discounted from
  // the first frame onward.
  let hiddenAt =
    typeof document !== 'undefined' && document.hidden ? Date.now() : null;
  let tickHandle = null;

  const listeners = new Set();

  // ---- resume -----------------------------------------------------------
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
    // The front door. The opening plays whatever the checkpoint says, with skip offered from
    // the first frame to anyone who has been here before.
    const entry = resolveRootEntry(persisted?.state);
    context.state = entry.state;
    context.skipOfferedImmediately = entry.skipOfferedImmediately;
    context.resumed = false;
  } else if (initialState && stateIndex(initialState) >= 0) {
    // A route selects the entry checkpoint; routes are never separate pages (§7.11).
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

  /**
   * Emit a canonical event through the emit-once ledger.
   *
   * @param {string} name
   * @param {{skipped?: boolean}} [extra]
   */
  const emit = (name, extra = {}) => {
    const onlyOnce = ONCE_PER_SESSION_EVENTS.includes(name);
    if (onlyOnce && context.emitted.includes(name)) return;
    // Only milestones enter the ledger; repeatable events (share prompts, chapter
    // completions) would otherwise grow it without bound.
    if (onlyOnce) context = { ...context, emitted: [...context.emitted, name] };
    onEmit?.(
      name,
      {
        state: context.state,
        skipped: extra.skipped === true,
        msSinceLanding: context.landingAt ? Date.now() - context.landingAt : 0,
        inputMethod: context.inputMethod,
      },
      // The context is handed over explicitly rather than read back from the machine:
      // the first emission can happen while the factory is still constructing, before any
      // caller holds a reference to it.
      context,
    );
  };

  /**
   * Enter a state: stamp the clock, apply `onEnter`, emit, persist, notify.
   *
   * @param {string} next
   * @param {string} intent
   * @param {{skipped?: boolean}} [options]
   */
  const enter = (next, intent, options = {}) => {
    const from = context.state;
    const entry = TABLE[next] ?? {};

    context = {
      ...context,
      previousState: from,
      state: next,
      stateEnteredAt: Date.now(),
      // The latch is consumed by the transition it caused; it never leaks into the next state.
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

  /**
   * Try the named transition of the current state.
   *
   * @param {'advance'|'complete'|'back'} kind
   * @returns {boolean} whether a transition fired
   */
  const attempt = (kind = 'advance') => {
    if (destroyed) return false;
    const transition = TABLE[context.state]?.[kind];
    if (!transition) return false;

    // One consistent instant per evaluation pass.
    const evaluated = { ...context, now: Date.now() };
    if (!passes(transition.guards, evaluated)) return false;

    enter(transition.to, kind);
    return true;
  };

  /**
   * Skip the cinematic. Lands on S8 — the invitation over the still Earth composition —
   * preserving continuity, and back-emits every bypassed canonical event with
   * `{ skipped: true }` so the §10 funnel remains coherent (§2.10, BUILD_CONTRACT §2).
   *
   * @returns {boolean}
   */
  const skip = () => {
    const target = STATES.S8_READING_ROOM_INVITATION;
    if (stateIndex(context.state) >= stateIndex(target)) return false;

    context = { ...context, skipUsed: true, skipOfferedImmediately: false };

    // Back-emit the milestones the reader passed over, in canonical order, before the
    // landing event of the state they are about to enter.
    const upto = stateIndex(target);
    for (let index = 0; index <= upto; index += 1) {
      for (const name of TABLE[STATE_ORDER[index]]?.emits ?? []) {
        emit(name, { skipped: true });
      }
    }

    enter(target, INTENTS.SKIP, { skipped: true });
    return true;
  };

  /**
   * Cross the threshold in one movement.
   *
   * This exists for entrances that are a single authored scene rather than the canonical
   * S2–S7 sub-beats. When the whole threshold is one continuous piece, there is no speck to
   * leave, no weave to resolve and no passage to travel — there is only the reader deciding
   * they are ready, and the score's per-beat dwells describe beats that are not being played.
   *
   * It lands where `skip` lands, and that is the only thing the two have in common. A skip is
   * a bypass: it sets `skipUsed` and stamps every back-emitted milestone `skipped: true`, and
   * §10.4 counts those to learn how many readers declined the opening. Routing an ordinary
   * crossing through it would report every single reader as having skipped, and the one metric
   * that tells the founder whether the threshold is working would read zero forever.
   *
   * So the milestones are emitted as what they were — reached, not passed over — and
   * `skipUsed` stays false.
   *
   * @param {string} [inputMethod] How the reader expressed it.
   * @returns {boolean} Whether the crossing fired.
   */
  const cross = () => {
    const target = STATES.S8_READING_ROOM_INVITATION;
    if (stateIndex(context.state) >= stateIndex(target)) return false;

    // Emit the milestones the reader has now reached, in canonical order. No dedupe guard is
    // needed or wanted here: `emit` already refuses to repeat a once-per-session milestone,
    // and it is the only thing that knows which events those are.
    const upto = stateIndex(target);
    for (let index = 0; index <= upto; index += 1) {
      for (const name of TABLE[STATE_ORDER[index]]?.emits ?? []) {
        emit(name, { skipped: false });
      }
    }

    enter(target, INTENTS.CROSS, { skipped: false });
    return true;
  };

  /**
   * Deliver an intent.
   *
   * `advance` / `enter` / `back` are reader-originated and latch, so a press made while
   * the machine is still waiting on readiness is honoured the moment readiness arrives.
   * `complete` is scene-originated: it records the completion signal and never satisfies
   * `readerIntent()`, which is what stops a timeline from walking a reader past an
   * invitation that is supposed to wait for them.
   *
   * @param {string} intent one of `INTENTS`
   * @param {{inputMethod?: string}} [meta]
   * @returns {boolean} whether a transition fired
   */
  const send = (intent, meta = {}) => {
    if (destroyed) return false;

    if (meta.inputMethod) context = { ...context, inputMethod: meta.inputMethod };

    switch (intent) {
      case INTENTS.SKIP:
        return skip();

      // `meta.inputMethod` is already on the context by this point — `send` records it above,
      // and `emit` reads it from there.
      case INTENTS.CROSS:
        return cross();

      case INTENTS.COMPLETE: {
        context = {
          ...context,
          sceneComplete: { ...context.sceneComplete, [context.state]: true },
        };
        // A state may declare an explicit completion transition (S10/S12 -> S13);
        // otherwise the signal simply unblocks the ordinary forward guard.
        return TABLE[context.state]?.complete ? attempt('complete') : attempt('advance');
      }

      case INTENTS.BACK: {
        context = { ...context, pendingIntent: INTENTS.BACK };
        const moved = attempt('back');
        // The machine declares no `back` transitions — unit-level "back" belongs to
        // ReadingProvider. Release the latch so an unconsumed back press can never be
        // mistaken for forward intent by a `readerIntent()` guard on the next tick.
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

  // ---- ticking ----------------------------------------------------------
  // Re-evaluation, not animation. Guards are cheap predicates over the context; this is
  // what lets a readiness signal that arrives with no accompanying intent move the reader on.
  const tick = () => {
    if (destroyed) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    attempt('advance');
  };

  /**
   * Time spent in a hidden tab is not time the reader experienced. Roll the state clock
   * forward by the hidden duration so a minimum dwell is a minimum of *attention*, and so
   * a reader who returns to the tab does not find the opening already over (§2.11).
   */
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

  // S0 is never perceptible as a distinct state; evaluate it immediately.
  attempt('advance');

  return {
    getState: () => context.state,
    getContext: () => context,
    send,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /**
     * Merge a context patch and re-evaluate. This is how readiness signals arrive
     * (`markAssetsReady`), how preferences land, and how the share gate opens.
     *
     * @param {Object} patch
     */
    setContext: (patch) => {
      if (destroyed || !patch) return;
      context = { ...context, ...patch };
      if (PERSISTED_KEYS.some((key) => key in patch)) persist();
      notify();
      attempt('advance');
    },
    /**
     * Begin the whole experience again, from darkness.
     *
     * S14 declares no transitions — it is where the arc ends, and that is correct. It also
     * meant there was no way back into the work from the last screen of it: a reader who had
     * finished had no route to read it a second time, and a reload landed them on S14 again
     * because it is a resume checkpoint. The way out of a terminal state is not a transition
     * out of it; it is starting over, which is what this does.
     *
     * What is deliberately NOT reset:
     *
     *   · `emitted`, the once-per-session milestone ledger. Re-emitting `OpeningArcCompleted`
     *     would record a second first-completion in the funnel and quietly corrupt §10.4's
     *     numbers. The reader is reading again; they did not arrive again.
     *   · Preferences — motion, audio, pace, age band and the content layer it selected. They
     *     are the reader's settings, not their position, and re-asking would be a worse
     *     welcome than the one they just chose to repeat.
     *
     * The reading *position* is not this module's to clear: it lives in `ogp_reading_session`
     * and is cleared by `ReadingProvider.restart`. Callers do both — the two records are
     * separate on purpose (§3.9), and so is undoing them.
     */
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
        // The opening plays again in full, because being taken back through it is the point.
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

/** Exposed for tests and for the admin funnel documentation. Do not mutate. */
export const TRANSITION_TABLE = TABLE;

/** Cinematic states, re-exported so callers can gate the skip affordance in one import. */
export { CINEMATIC_STATES };

export default createExperienceMachine;
