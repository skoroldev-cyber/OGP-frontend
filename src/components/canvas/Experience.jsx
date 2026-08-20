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

const PLOT_REDUCED = Object.freeze({
  ...PLOT_FULL,
  [STATES.S3_LOGO_MANIFESTATION]: { depth: 1, speck: 1, weave: 1 },
  [STATES.S4_LIVING_WEAVE]: { depth: 0.85, weave: 1, earth: 1, stars: 0.15 },
  [STATES.S5_PORTAL_ENTRY]: { depth: 0.8, weave: 1, portal: 1, earth: 1, stars: 0.2 },
  [STATES.S6_WEAVE_PASSAGE]: { depth: 0.6, portal: 1, stars: 0.5 },
  [STATES.S7_EARTH_REVEAL]: { depth: 0.1, earth: 1, stars: 1 },
});

const MOUNT_FROM = Object.freeze({
  passage: STATES.S2_DISTANT_SPECK,
  earth: STATES.S2_DISTANT_SPECK,
  room: STATES.S6_WEAVE_PASSAGE,
  pathways: STATES.S12_CONTINUE_READING,
});

const atOrAfter = (state, threshold) => stateIndex(state) >= stateIndex(threshold);

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

  const stage = useRef({
    ...REST,
    speckPhase: 0,
    speckStructure: 0,
    portalOpen: 0,
    passageBright: 0,
    stateElapsed: 0,
    stateProgress: 0,
  });

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

  const weaveControl = useRef(null);

  const stateElapsed = useRef(0);
  const warmed = useRef(false);
  const marked = useRef({});

  const isLowTier = tier === TIERS.LOW;
  const plot = reducedMotion ? PLOT_REDUCED : PLOT_FULL;

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

  useGuidedCamera({ state, reducedMotion, setCameraOverride, cameraOverrideRef });

  const inRoom = atOrAfter(state, STATES.S9_READING_ROOM_INIT);
  const invalidate = useAmbientTicker({
    active: inRoom,
    fps: motionPreference === MOTION_PREFERENCES.OFF ? 0 : settings.ambientFps,
  });

  useEffect(() => {
    stateElapsed.current = 0;
    stage.current.stateElapsed = 0;
    stage.current.stateProgress = 0;
    invalidate();
  }, [state, invalidate]);

  const earthPose = useMemo(
    () =>
      reducedMotion && atOrAfter(state, STATES.S6_WEAVE_PASSAGE)
        ? SCENE.earth.still
        : SCENE.earth.world,
    [reducedMotion, state],
  );

  const aspect = size.height > 0 ? size.width / size.height : 1;

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

    const bright = live.passageBright;
    let weaveTarget = targets.weave ?? 0;
    if (state === STATES.S2_DISTANT_SPECK) {
      weaveTarget = Math.max(weaveTarget, live.speckStructure * 0.4);
    }
    if (atOrAfter(state, STATES.S6_WEAVE_PASSAGE)) {
      weaveTarget *= 1 - bright;
    }

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
