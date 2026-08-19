/**
 * Experience — the scene root.
 *
 * There is ONE scene for S0–S14. Nothing here mounts a "page", switches a "screen", or
 * tears down what came before: "The experience is one continuous application with state
 * transitions rather than disconnected web pages" (§2.1, locked), and "one continuous
 * unfolding, not seven pages" (§2.3 quality 2). Every state morphs from the previous
 * state's final frame.
 *
 * HOW THAT IS ENFORCED. State does not choose what EXISTS; it chooses a set of target
 * PRESENCES. A single `useFrame` damps the live presences toward those targets, and each
 * sub-scene reads its own number out of a ref. Consequences:
 *
 *   - No sub-scene is ever unmounted in response to a state change, so there is no
 *     remount, no re-upload and no first-frame flash.
 *   - No presence can step. Every visual change is a ramp of at least `durations.scene`
 *     (or `durations.threshold` under reduced motion), which satisfies §8.3.1's "opacity
 *     ramps >= 1.5 s in canvas" everywhere at once rather than component by component.
 *   - The state table can be read as a lighting plot, because that is what it is.
 *
 * Heavy scenes are mounted with a generous lead — Earth and the passage from S2, the room
 * from S6 — so their first frame is always drawn behind a presence of zero. Combined with
 * `RoomWarmup`'s `gl.compileAsync` pass, nothing is ever compiled or uploaded on a frame
 * the reader is looking at.
 *
 * REDUCED MOTION is a separate, complete lighting plot — not the same plot with the
 * animation removed. It sequences the stills the score names (dark frame -> field stills ->
 * weave still -> Earth-in-opening stills -> hero frame) and drops Earth's presence to zero
 * across S6 so the hero composition can be staged in front of a camera that never moves.
 *
 * The canvas renders NO text and is `aria-hidden` (owned by `App.jsx`). For S8–S13 the
 * accessible DOM tree is the experience.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_MOTION, OGP_TIMING, envelopeFor } from '@/config/ogpTheme';
import { ASSET_GROUPS } from '@/config/assetManifest';
import { usePerformance } from '@/context/PerformanceContext';
import { useExperience } from '@/experience/ExperienceProvider';
import { INTENTS, MOTION_PREFERENCES, STATES, stateIndex } from '@/experience/states';
import { TIERS } from '@/utils/deviceDetect';

import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { RoomWarmup } from '@/components/canvas/shared/RoomWarmup';
import { useGuidedCamera } from '@/components/canvas/shared/useGuidedCamera';
import { useAmbientTicker } from '@/components/canvas/shared/useAmbientTicker';

import { DepthParticles } from '@/components/canvas/opening/DepthParticles';
import { DistantSpeck } from '@/components/canvas/opening/DistantSpeck';
import { LivingWeave } from '@/components/canvas/opening/LivingWeave';
import { PortalEntry } from '@/components/canvas/opening/PortalEntry';
import { WeavePassage } from '@/components/canvas/opening/WeavePassage';

import { EarthGroup } from '@/components/canvas/earth/EarthGroup';
import { Starfield } from '@/components/canvas/earth/Starfield';

import { ReadingRoomEnvironment } from '@/components/canvas/readingRoom/ReadingRoomEnvironment';
import { EarthPresence } from '@/components/canvas/readingRoom/EarthPresence';
import { PathwayField } from '@/components/canvas/pathways/PathwayField';

import '@/components/canvas/shaders/WeaveMaterial';
import '@/components/canvas/shaders/AtmosphereMaterial';
import '@/components/canvas/shaders/LuminousRevealMaterial';

/* -------------------------------------------------------------------------- */
/* The lighting plot                                                           */
/* -------------------------------------------------------------------------- */

/** Every presence the scene tracks. Absent keys inherit 0, so a row states only what is on. */
const REST = Object.freeze({
  depth: 0,
  speck: 0,
  weave: 0,
  portal: 0,
  passage: 0,
  earth: 0,
  room: 0,
  pathways: 0,
  stars: 0,
});

/**
 * Full-motion plot. S0 and S1 are deliberately identical — S0 "must never be perceptible
 * as distinct from S1" (§2.4.1), and the surest way to achieve that is for there to be
 * nothing to perceive between them.
 *
 * The depth field never reaches zero after S1: it thins as the reader travels, but the
 * void keeps its layered gradient the whole way, because flat black is a wall at every
 * point of the arc, not only at the start.
 */
const PLOT_FULL = Object.freeze({
  [STATES.S0_SITE_ARRIVAL]: { depth: 1 },
  [STATES.S1_DARKNESS]: { depth: 1 },
  [STATES.S2_DISTANT_SPECK]: { depth: 1, speck: 1 },
  [STATES.S3_LOGO_MANIFESTATION]: { depth: 0.85, speck: 1, weave: 1 },
  [STATES.S4_LIVING_WEAVE]: { depth: 0.7, weave: 1, earth: 1, stars: 0.15 },
  [STATES.S5_PORTAL_ENTRY]: { depth: 0.55, weave: 1, portal: 1, earth: 1, stars: 0.2 },
  [STATES.S6_WEAVE_PASSAGE]: {
    depth: 0.35,
    weave: 0.4,
    portal: 0.6,
    passage: 1,
    earth: 1,
    stars: 0.35,
  },
  [STATES.S7_EARTH_REVEAL]: { depth: 0.12, passage: 0.25, earth: 1, stars: 1 },
  [STATES.S8_READING_ROOM_INVITATION]: { depth: 0.08, earth: 1, stars: 1 },
  [STATES.S9_READING_ROOM_INIT]: { depth: 0.06, earth: 1, stars: 0.9, room: 0.7 },
  [STATES.S10_OPENING_ARC_READING]: { depth: 0.05, earth: 1, stars: 0.75, room: 1 },
  [STATES.S11_SHARE_OPPORTUNITY]: { depth: 0.05, earth: 1, stars: 0.75, room: 1 },
  [STATES.S12_CONTINUE_READING]: { depth: 0.05, earth: 1, stars: 0.75, room: 1 },
  [STATES.S13_OPENING_ARC_COMPLETE]: { depth: 0.05, earth: 1, stars: 0.75, room: 1 },
  [STATES.S14_CHOOSE_YOUR_PATH]: {
    depth: 0.05,
    earth: 1,
    stars: 0.6,
    room: 0.7,
    pathways: 1,
  },
});

/**
 * Reduced-motion plot — the per-state STILL SEQUENCE, first-class and complete.
 *
 * Two rows differ in kind rather than degree:
 *   S6  the passage is absent entirely ("no camera travel: opening brightens, slow
 *       crossfade to the S7 still composition", §2.4.7 fallback) and Earth's presence goes
 *       to ZERO — which is what lets `EarthGroup` re-stage its pose behind nothing at all,
 *       so the hero frame can be composed in front of a camera that never moved.
 *   S7  the hero frame arrives as a dissolve onto that re-staged Earth.
 */
const PLOT_REDUCED = Object.freeze({
  ...PLOT_FULL,
  [STATES.S3_LOGO_MANIFESTATION]: { depth: 1, speck: 1, weave: 1 },
  [STATES.S4_LIVING_WEAVE]: { depth: 0.85, weave: 1, earth: 1, stars: 0.15 },
  [STATES.S5_PORTAL_ENTRY]: { depth: 0.8, weave: 1, portal: 1, earth: 1, stars: 0.2 },
  [STATES.S6_WEAVE_PASSAGE]: { depth: 0.6, portal: 1, stars: 0.5 },
  [STATES.S7_EARTH_REVEAL]: { depth: 0.1, earth: 1, stars: 1 },
});

/** Sub-scenes mount this far ahead of the state that needs them. */
const MOUNT_FROM = Object.freeze({
  passage: STATES.S2_DISTANT_SPECK,
  earth: STATES.S2_DISTANT_SPECK,
  room: STATES.S6_WEAVE_PASSAGE,
  pathways: STATES.S12_CONTINUE_READING,
});

/**
 * @param {string} state
 * @param {string} threshold
 * @returns {boolean}
 */
const atOrAfter = (state, threshold) => stateIndex(state) >= stateIndex(threshold);

/* -------------------------------------------------------------------------- */
/* Root                                                                        */
/* -------------------------------------------------------------------------- */

const Experience = () => {
  const {
    state,
    reducedMotion,
    motionPreference,
    markAssetsReady,
    send,
    setCameraOverride,
    cameraOverrideRef,
  } = useExperience();
  const { tier, settings } = usePerformance();
  const size = useThree((frameState) => frameState.size);

  /** Live presences, read by every sub-scene inside its own `useFrame`. Never state. */
  const stage = useRef({
    ...REST,
    /** Published by `DistantSpeck`: the S2 perceptual order, light -> movement -> structure. */
    speckPhase: 0,
    speckStructure: 0,
    /** Published by `PortalEntry`: how far the aperture has eased outward. */
    portalOpen: 0,
    /** Published by `WeavePassage`: the fully-bright centre frames used for the crossfade. */
    passageBright: 0,
    /** Seconds in the current state, and that as a fraction of the score's envelope. */
    stateElapsed: 0,
    stateProgress: 0,
  });

  /**
   * Earth's layer amounts. `EarthGroup` writes the locked reveal order into it;
   * `EarthPresence` writes the Reading Room's dimming, defocus and recession. One object,
   * two authors, no shared writes — which is why neither needs to know about the other.
   */
  const layers = useRef({
    rim: 0,
    ocean: 0,
    clouds: 0,
    land: 0,
    body: 0,
    presence: 0,
    dim: 1,
    focus: 1,
    rotationScale: 1,
    recede: 0,
  });

  /** The Living Weave's control surface, shared with `PortalEntry`. */
  const weaveControl = useRef(null);

  const stateElapsed = useRef(0);
  const warmed = useRef(false);
  const marked = useRef({});

  const isLowTier = tier === TIERS.LOW;
  const plot = reducedMotion ? PLOT_REDUCED : PLOT_FULL;

  /* ---- readiness ------------------------------------------------------- */
  // The provider warms the NETWORK; this marks the GPU. A group is only truly ready when
  // its programs are compiled and its first frame has been drawn, and only the canvas
  // knows that. Idempotent: each group is announced exactly once.
  const announce = useCallback(
    (group) => {
      if (marked.current[group]) return;
      marked.current[group] = true;
      markAssetsReady(group);
    },
    [markAssetsReady],
  );

  const onWarmupComplete = useCallback(() => {
    warmed.current = true;
    announce(ASSET_GROUPS.OPENING);
  }, [announce]);

  const onEarthReady = useCallback(() => announce(ASSET_GROUPS.EARTH), [announce]);
  const onRoomReady = useCallback(() => announce(ASSET_GROUPS.READING_CORE), [announce]);

  /* ---- scene completion ------------------------------------------------ */
  // `complete` is a SCENE signal, never a reader intent: it can unblock a forward guard,
  // and it can never walk a reader past a state that is waiting for them (S5, S8, S13).
  // Guarded on the current state so a late callback from a state already left is dropped.
  const reportComplete = useCallback(
    (forState) => {
      if (state !== forState) return;
      send(INTENTS.COMPLETE);
    },
    [send, state],
  );

  const onSpeckComplete = useCallback(
    () => reportComplete(STATES.S2_DISTANT_SPECK),
    [reportComplete],
  );
  const onWeaveConverged = useCallback(
    () => reportComplete(STATES.S3_LOGO_MANIFESTATION),
    [reportComplete],
  );
  const onBreathComplete = useCallback(
    () => reportComplete(STATES.S4_LIVING_WEAVE),
    [reportComplete],
  );
  const onPassageComplete = useCallback(
    () => reportComplete(STATES.S6_WEAVE_PASSAGE),
    [reportComplete],
  );
  const onRevealComplete = useCallback(
    () => reportComplete(STATES.S7_EARTH_REVEAL),
    [reportComplete],
  );

  /* ---- camera and frame budget ----------------------------------------- */
  useGuidedCamera({ state, reducedMotion, setCameraOverride, cameraOverrideRef });

  const inRoom = atOrAfter(state, STATES.S9_READING_ROOM_INIT);
  const invalidate = useAmbientTicker({
    active: inRoom,
    fps: motionPreference === MOTION_PREFERENCES.OFF ? 0 : settings.ambientFps,
  });

  // The state clock restarts with the state, and a boundary always gets one frame even
  // when the ambient ticker is at zero.
  useEffect(() => {
    stateElapsed.current = 0;
    stage.current.stateElapsed = 0;
    stage.current.stateProgress = 0;
    invalidate();
  }, [state, invalidate]);

  /**
   * Earth's pose. Fixed in the world under full motion — the reader approaches Earth, and
   * Earth never approaches the reader. Under reduced motion the hero framing is achieved
   * by placing Earth in front of the static camera instead; `EarthGroup` only ever adopts
   * the change while its presence is zero, so the swap is a still replacing a still.
   */
  const earthPose = useMemo(
    () =>
      reducedMotion && atOrAfter(state, STATES.S6_WEAVE_PASSAGE)
        ? SCENE.earth.still
        : SCENE.earth.world,
    [reducedMotion, state],
  );

  const aspect = size.height > 0 ? size.width / size.height : 1;

  /* ---- the one place presence changes ---------------------------------- */
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const live = stage.current;

    stateElapsed.current += dt;
    live.stateElapsed = stateElapsed.current;
    const envelope = envelopeFor(state);
    live.stateProgress = envelope.targetMs
      ? Math.min(1, (stateElapsed.current * 1000) / envelope.targetMs)
      : 0;

    const targets = plot[state] ?? REST;

    // Two adjustments layered onto the plot, both of them crossfades rather than cuts:
    //
    //   weave    the field is traded away across the passage's fully-bright centre frames,
    //            so the scene graphs cross over inside the light and there is nothing to
    //            see the switch by (§2.4.7).
    //   weave    during S2 the field is admitted ONLY by the speck's structure phase, so
    //            structure can never precede light and movement.
    const bright = live.passageBright;
    let weaveTarget = targets.weave ?? 0;
    if (state === STATES.S2_DISTANT_SPECK) {
      weaveTarget = Math.max(weaveTarget, live.speckStructure * 0.4);
    }
    if (atOrAfter(state, STATES.S6_WEAVE_PASSAGE)) {
      weaveTarget *= 1 - bright;
    }

    // Reduced motion crossfades slowly by design: "slow fades only".
    const lambda =
      3 / (reducedMotion ? OGP_MOTION.durations.threshold : OGP_MOTION.durations.scene);

    for (const key of Object.keys(REST)) {
      const wanted = key === 'weave' ? weaveTarget : (targets[key] ?? 0);
      live[key] = THREE.MathUtils.damp(live[key], wanted, lambda, dt);
    }
  });

  const mountPassage = atOrAfter(state, MOUNT_FROM.passage);
  const mountEarth = atOrAfter(state, MOUNT_FROM.earth);
  const mountRoom = atOrAfter(state, MOUNT_FROM.room);
  const mountPathways = atOrAfter(state, MOUNT_FROM.pathways);

  useEffect(() => {
    if (mountPathways) announce(ASSET_GROUPS.PATHWAYS);
  }, [mountPathways, announce]);

  return (
    <group>
      {/* The darkness. Present from the first frame and never fully withdrawn — it is the
          loading veil, and afterwards it is the room the whole journey happens inside. */}
      <DepthParticles
        stage={stage}
        tier={tier}
        settings={settings}
        reducedMotion={reducedMotion}
        aspect={aspect}
      />

      <Starfield stage={stage} tier={tier} settings={settings} />

      <DistantSpeck
        stage={stage}
        running={state === STATES.S2_DISTANT_SPECK}
        reducedMotion={reducedMotion}
        onSceneComplete={onSpeckComplete}
      />

      <LivingWeave
        stage={stage}
        state={state}
        tier={tier}
        settings={settings}
        reducedMotion={reducedMotion}
        controlRef={weaveControl}
        onConverged={onWeaveConverged}
        onBreathComplete={onBreathComplete}
      />

      <PortalEntry
        stage={stage}
        state={state}
        reducedMotion={reducedMotion}
        controlRef={weaveControl}
      />

      {mountPassage && (
        <WeavePassage
          stage={stage}
          state={state}
          reducedMotion={reducedMotion}
          onSceneComplete={onPassageComplete}
        />
      )}

      {mountEarth && (
        <EarthGroup
          stage={stage}
          layers={layers}
          state={state}
          tier={tier}
          reducedMotion={reducedMotion}
          poseTarget={earthPose}
          onReady={onEarthReady}
          onRevealComplete={onRevealComplete}
        />
      )}

      {mountRoom && (
        <>
          <ReadingRoomEnvironment
            stage={stage}
            layers={layers}
            state={state}
            poseTarget={earthPose}
            reducedMotion={reducedMotion}
            onReady={onRoomReady}
          />
          <EarthPresence layers={layers} state={state} poseTarget={earthPose} />
        </>
      )}

      {mountPathways && (
        <PathwayField
          stage={stage}
          tier={tier}
          settings={settings}
          reducedMotion={reducedMotion}
        />
      )}

      {/* itom's warm-up idiom: the injected-program materials are compiled 500 units below
          the scene, then this unmounts itself. The 8 s ceiling inside `RoomWarmup` ALWAYS
          releases the gate — a slow device breathes longer in darkness, it never hangs. */}
      {!warmed.current && (
        <RoomWarmup onComplete={onWarmupComplete} isLowTier={isLowTier}>
          <points frustumCulled={false}>
            <bufferGeometry />
            <weaveMaterial />
          </points>
          <mesh>
            <sphereGeometry args={[1, 8, 6]} />
            <atmosphereMaterial />
          </mesh>
          <mesh>
            <planeGeometry args={[1, 1]} />
            <luminousRevealMaterial transparent />
          </mesh>
        </RoomWarmup>
      )}
    </group>
  );
};

export default Experience;
