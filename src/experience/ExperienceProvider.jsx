/**
 * React binding for the experience machine.
 *
 * This provider is the single seam between the pure machine and everything that has side
 * effects: the session, the event pipeline, the asset warm-up sequence, and the camera
 * ownership handshake.
 *
 * **The camera-override handshake is itom law, preserved verbatim in intent** (§7.6):
 * any component that writes the camera calls `setCameraOverride(true)` before its first
 * write and `setCameraOverride(false)` after its last, and early-returns its `useFrame`
 * writes while another owner holds it. Two systems writing the camera in the same frame is
 * how a "hard cut" gets into an experience that forbids them.
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

/**
 * @returns {Object} the experience API
 */
export const useExperience = () => {
  const context = useContext(ExperienceContext);
  if (!context) throw new Error('useExperience must be used within an ExperienceProvider');
  return context;
};

/**
 * Motion is Full, for everyone, always.
 *
 * The Motion setting is gone by decision of the project owner, and this constant is what
 * replaces it. It is deliberately not a variable: the whole failure mode it removes was a value
 * that could quietly become something else and stay that way. A single click on an affordance
 * during the opening wrote `reduced` to `ogp_prefs_v1`, every visit afterwards rendered the
 * authored scenes as one settled frame and stopped, and nothing on screen said why — the
 * threshold simply looked broken, on a device where it had worked the day before.
 *
 * The still-frame branches downstream (`reducedMotion` in the scene components, the guards'
 * `reducedMotion()`) are now unreachable rather than deleted. They are the canonical Living
 * Weave's still variants, and removing them means editing shaders, camera sequencing and scene
 * completion signals across some twenty files for no change in what anyone sees. Left as they
 * are, they cost nothing and stay available if the setting is ever wanted back.
 *
 * Note what is NOT affected: the `@media (prefers-reduced-motion: reduce)` rules in the
 * stylesheets. Those shorten CSS transitions for a reader whose operating system asks for it,
 * they never freeze a scene, and they are the browser-standard courtesy rather than a setting
 * this app owns.
 */
const MOTION = MOTION_PREFERENCES.FULL;

/**
 * Discard a Motion value stored by an earlier build.
 *
 * Nothing reads it any more, so a leftover `reduced` is already inert — but leaving it in
 * `ogp_prefs_v1` would have the record claim a setting the app no longer honours, and anyone
 * who went looking for why their scenes froze would find it and reasonably conclude it was
 * still in force.
 *
 * @param {Object} prefs the stored preferences record
 * @returns {void}
 */
const dropStoredMotion = (prefs) => {
  if (!prefs || !('motionPreference' in prefs)) return;
  const { motionPreference: _discarded, ...rest } = prefs;
  writeRecord(AREAS.LOCAL, STORAGE_KEYS.PREFS, rest);
};

/**
 * Map the machine's emission into the event's whitelisted payload shape
 * (BUILD_CONTRACT §3). `events.js` enforces the whitelist again; this function's job is
 * to translate machine vocabulary (`skipped`) into contract vocabulary
 * (`skippedIntro`, `skippedCinematic`, `mode`).
 *
 * `ageRange` is deliberately absent from every branch and can never be added: the
 * whitelist has no slot for it.
 *
 * @param {string} name
 * @param {Object} emission `{ skipped, msSinceLanding, inputMethod }`
 * @param {Object} context machine context
 * @param {{ tier: string }} device
 * @returns {Object}
 */
const buildEventPayload = (name, emission, context, device) => {
  // Every reader now watches the full opening, so the field is constant. It stays in the
  // payload because the event schema is contractual (BUILD_CONTRACT §3) and a measurement that
  // silently changes shape is worse than one that reports the same answer every time.
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

/**
 * @param {{
 *   children: React.ReactNode,
 *   initialState?: string,
 *   entryVia?: string,
 *   rootEntry?: boolean,
 * }} props
 */
export const ExperienceProvider = ({ children, initialState, entryVia, rootEntry = false }) => {
  const { tier, settings } = usePerformance();

  const machineRef = useRef(null);
  // Latest-ref, written in an effect rather than during render. The machine reads the device
  // tier only when a guard is evaluated, which always happens after an effect has flushed.
  const deviceRef = useRef({ tier, settings });
  useEffect(() => {
    deviceRef.current = { tier, settings };
  }, [tier, settings]);

  /** Ref, not state: `useFrame` consumers must read ownership without a re-render. */
  const cameraOverrideRef = useRef(false);
  const [isCameraOverridden, setIsCameraOverridden] = useState(false);

  const preferences = useRef(null);
  if (preferences.current === null) preferences.current = readPreferences();

  const [snapshot, setSnapshot] = useState(() => ({ state: null, context: null }));

  /**
   * Lazily construct the machine. Constructed on first use rather than during render so
   * that React StrictMode's double-invoked render can never leave an orphaned interval.
   *
   * @returns {ReturnType<typeof createExperienceMachine>}
   */
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
        // Mirror to the session document. Best-effort: a failed PATCH never blocks a
        // transition, and the device-local record is already authoritative for reading.
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

  // ---- lifecycle --------------------------------------------------------
  useEffect(() => {
    const machine = getMachine();
    const unsubscribe = machine.subscribe((state, context) => setSnapshot({ state, context }));
    setSnapshot({ state: machine.getState(), context: machine.getContext() });

    const teardownEvents = initEvents();

    // Session first, so the very first event batch carries a bearer token. An unreachable
    // API is a supported mode: the reader continues device-local and events queue.
    void ensureSession({
      motionPreference: machine.getContext().motionPreference,
      entryVia: entryVia || undefined,
    }).then(() => flushEvents());

    // Record that this device has been here, for `isReturnVisit` on the next arrival.
    // A boolean. Not an identifier, not a timestamp trail.
    writePreferences({ hasVisited: true });

    return () => {
      unsubscribe();
      machine.destroy();
      machineRef.current = null;
      teardownEvents();
    };
  }, [getMachine, entryVia]);

  // Retire the Motion value an earlier build may have left on this device.
  useEffect(() => {
    dropStoredMotion(preferences.current);
  }, []);

  // ---- asset warm-up ----------------------------------------------------
  // Sequenced ahead of need and hidden entirely behind the darkness. Groups a tier is not
  // allowed to preload are marked ready immediately so a readiness guard can never stall a
  // reader on assets that were never going to be fetched in advance (§7.7 OOM guard).
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
      // Sequential on purpose: the groups are ordered by when they are needed, and
      // fetching them all at once would contend with the group the reader is waiting on.
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

  // ---- API --------------------------------------------------------------
  const send = useCallback((intent, meta) => getMachine().send(intent, meta), [getMachine]);

  const advance = useCallback((meta) => send(INTENTS.ADVANCE, meta), [send]);
  const skip = useCallback((meta) => send(INTENTS.SKIP, meta), [send]);

  /**
   * Begin the experience again from darkness (S14 → S0).
   *
   * The address follows from `useCoarseUrlSync`, which owns every path change and now
   * recognises `/pathways` as a route to leave when the state falls back below S14.
   */
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
      // Session state only. The band is never sent in an event and never joined to a
      // profile; only the derived content layer leaves this device (§3.3).
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

  /**
   * Claim or release the camera. Called by every component that writes the camera,
   * `true` before its first write and `false` after its last (§7.6, itom law).
   *
   * @param {boolean} owned
   */
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
  // Constants, not derivations. Both are still published because a good deal of the scene
  // graph reads them; neither can be anything else.
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
      /** Frame-loop consumers read this instead of `isCameraOverridden` to avoid re-renders. */
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
