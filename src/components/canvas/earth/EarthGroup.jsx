import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { AtmosphereShell } from '@/components/canvas/earth/AtmosphereShell';
import { CloudSphere } from '@/components/canvas/earth/CloudSphere';
import { EarthSurface } from '@/components/canvas/earth/EarthSurface';

export const EARTH_REVEAL_ORDER = Object.freeze([
  Object.freeze({ key: 'rim', from: 0.0, to: 0.22 }),
  Object.freeze({ key: 'ocean', from: 0.16, to: 0.48 }),
  Object.freeze({ key: 'clouds', from: 0.42, to: 0.72 }),
  Object.freeze({ key: 'land', from: 0.66, to: 0.92 }),
  Object.freeze({ key: 'body', from: 0.88, to: 1.0 }),
]);

const DISCOVERY_CEILING = 0.85;

const PASSAGE_CEILING = 0.92;

const S4_DISCOVERY_FRACTION = 0.32;

const RESIDENCY_FRAMES = 4;

const POSE_SWAP_EPSILON = 0.015;

const amountFor = (progress, window) =>
  THREE.MathUtils.smoothstep(progress, window.from, window.to);

const revealPhaseFor = (state) => {
  const index = stateIndex(state);
  const { durations } = OGP_MOTION;

  if (index < stateIndex(STATES.S4_LIVING_WEAVE)) {
    return { target: 0, seconds: durations.scene };
  }
  if (state === STATES.S4_LIVING_WEAVE) {
    return {
      target: DISCOVERY_CEILING,
      seconds: Math.max(
        durations.scene,
        (OGP_TIMING.S4.targetMs / 1000) * S4_DISCOVERY_FRACTION,
      ),
    };
  }
  if (state === STATES.S5_PORTAL_ENTRY) {
    return { target: DISCOVERY_CEILING, seconds: durations.threshold };
  }
  if (state === STATES.S6_WEAVE_PASSAGE) {
    return { target: PASSAGE_CEILING, seconds: Math.max(durations.scene, OGP_TIMING.S6.targetMs / 1000) };
  }
  if (state === STATES.S7_EARTH_REVEAL) {
    return {
      target: 1,
      seconds: Math.max(durations.scene, OGP_TIMING.S7.targetMs / 1000 - durations.threshold),
    };
  }
  return { target: 1, seconds: durations.scene };
};

export const EarthGroup = ({
  stage,
  layers,
  state,
  tier,
  reducedMotion,
  poseTarget,
  onReady,
  onRevealComplete,
}) => {
  const groupRef = useRef(null);
  const reveal = useRef(0);
  const holdElapsed = useRef(0);
  const revealReported = useRef(false);
  const residency = useRef(0);
  const readyReported = useRef(false);

  const pose = useMemo(() => new THREE.Vector3(...SCENE.earth.world), []);

  useEffect(() => {
    if (state === STATES.S7_EARTH_REVEAL) return;
    revealReported.current = revealReported.current && true;
  }, [state]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.1);
    const phase = revealPhaseFor(state);

    if (reveal.current < phase.target) {
      reveal.current = Math.min(phase.target, reveal.current + dt / phase.seconds);
    }

    const progress = reveal.current;
    for (const window of EARTH_REVEAL_ORDER) {
      layers.current[window.key] = amountFor(progress, window);
    }

    const presence = stage.current.earth * layers.current.dim;
    layers.current.presence = presence;

    group.visible = presence > 0.002;

    if (presence < POSE_SWAP_EPSILON) {
      pose.set(poseTarget[0], poseTarget[1], poseTarget[2]);
      group.position.copy(pose);
    }

    const scale = THREE.MathUtils.lerp(1, SCENE.earth.presenceScaleFloor, layers.current.recede);
    group.scale.setScalar(scale);

    if (!readyReported.current && group.visible) {
      residency.current += 1;
      if (residency.current >= RESIDENCY_FRAMES) {
        readyReported.current = true;
        onReady?.();
      }
    }

    if (state === STATES.S7_EARTH_REVEAL && !revealReported.current) {
      if (progress >= 1) {
        holdElapsed.current += dt;
        if (holdElapsed.current >= OGP_MOTION.durations.threshold) {
          revealReported.current = true;
          onRevealComplete?.();
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={[SCENE.earth.world[0], SCENE.earth.world[1], SCENE.earth.world[2]]}>
      <AtmosphereShell layers={layers} tier={tier} reducedMotion={reducedMotion} />
      <EarthSurface layers={layers} tier={tier} />
      <CloudSphere layers={layers} tier={tier} reducedMotion={reducedMotion} />
    </group>
  );
};

export default EarthGroup;
