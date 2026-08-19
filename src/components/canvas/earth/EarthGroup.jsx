/**
 * EarthGroup — the layered planetary asset, and the owner of the LOCKED reveal order.
 *
 * §2.4.8, non-negotiable:
 *
 *   1. blue atmosphere — the thin, luminous, fragile rim is ALWAYS the first Earth signal
 *   2. ocean           — "because life came through water"
 *   3. cloud systems   — moving slowly, like breath
 *   4. land
 *   5. full planetary body
 *
 * Continents are LAST "because the first recognition must be planetary, not national."
 * That sentence is the reason this component exists as a separate thing from the spheres
 * it contains: the order is a single monotonic progress value here, in one table, where it
 * can be read and audited — not five independent fades that could drift out of sequence.
 *
 * The progress NEVER decreases and never restarts. Earth is discovered far inside the
 * weave opening during S4, held through S5 and S6, and completed in S7. One continuous
 * unfolding across four states — "no cuts, remounts, or flashes; each state morphs from
 * the previous state's final frame."
 *
 * Prohibited motions, and why they cannot occur here:
 *   flying at the viewer     Earth's world position is a constant. The CAMERA approaches.
 *   dramatic rotation        one revolution >= 8 minutes, from `OGP_MOTION`, always.
 *   theatrical spin / rush   there is no rotation input other than that constant rate.
 *   heroic climax            the reveal ends in a hold, and the hold is the longest beat.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { AtmosphereShell } from '@/components/canvas/earth/AtmosphereShell';
import { CloudSphere } from '@/components/canvas/earth/CloudSphere';
import { EarthSurface } from '@/components/canvas/earth/EarthSurface';

/**
 * The locked reveal order, as overlapping windows on one progress value.
 *
 * The windows overlap deliberately: a strict sequence of five fades would read as five
 * events. Overlapping them makes one arrival that happens to be layered — but the ORDER
 * of onset is exact, and `land` cannot begin before `clouds`, which cannot begin before
 * `ocean`, which cannot begin before `rim`.
 *
 * This is STRUCTURE (binding, §2.4.8), not timing. Every duration below comes from
 * `OGP_TIMING`; these fractions say only what comes before what, and by how much.
 */
export const EARTH_REVEAL_ORDER = Object.freeze([
  Object.freeze({ key: 'rim', from: 0.0, to: 0.22 }),
  Object.freeze({ key: 'ocean', from: 0.16, to: 0.48 }),
  Object.freeze({ key: 'clouds', from: 0.42, to: 0.72 }),
  Object.freeze({ key: 'land', from: 0.66, to: 0.92 }),
  Object.freeze({ key: 'body', from: 0.88, to: 1.0 }),
]);

/**
 * How far the reveal gets while Earth is still being discovered THROUGH the weave opening.
 * Whole, quiet and unmistakably alive — but not yet in full presence, which is S7's.
 */
const DISCOVERY_CEILING = 0.85;

/** The passage carries it a little further; the centre is bright and Earth is ahead. */
const PASSAGE_CEILING = 0.92;

/**
 * The S4 "Earth is discovered" beat as a fraction of the S4 envelope. From the §2.2 score:
 * discovery runs 30–50 s of the 16–70 s arc, i.e. roughly a third of it.
 */
const S4_DISCOVERY_FRACTION = 0.32;

/** Frames of successful rendering before the group declares itself resident on the GPU. */
const RESIDENCY_FRAMES = 4;

/** Below this presence the pose may be re-staged with nothing visible to re-stage. */
const POSE_SWAP_EPSILON = 0.015;

/**
 * @param {number} progress
 * @param {{ from: number, to: number }} window
 * @returns {number}
 */
const amountFor = (progress, window) =>
  THREE.MathUtils.smoothstep(progress, window.from, window.to);

/**
 * The reveal's destination and pace for a state. Returning a DURATION rather than a rate
 * keeps every number in this file a token from `OGP_TIMING`.
 *
 * @param {string} state
 * @returns {{ target: number, seconds: number }}
 */
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
    // Reveal, THEN hold. The approach curve occupies the same window (`useGuidedCamera`),
    // so the last layer settles as the camera comes to rest.
    return {
      target: 1,
      seconds: Math.max(durations.scene, OGP_TIMING.S7.targetMs / 1000 - durations.threshold),
    };
  }
  return { target: 1, seconds: durations.scene };
};

/**
 * @param {{
 *   stage: { current: Record<string, number> },
 *   layers: { current: Record<string, number> },
 *   state: string,
 *   tier: 'HIGH'|'MEDIUM'|'LOW',
 *   reducedMotion: boolean,
 *   poseTarget: readonly number[],
 *   onReady?: () => void,
 *   onRevealComplete?: () => void,
 * }} props
 */
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
    // Re-arm only when the reveal state is left behind; the signal is once per arrival.
    revealReported.current = revealReported.current && true;
  }, [state]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.1);
    const phase = revealPhaseFor(state);

    /* ---- the locked order, advanced monotonically ---- */
    // Nothing here can run backwards. A reveal that could reverse would let the reader see
    // continents before oceans on the way back, and the order is the whole point.
    if (reveal.current < phase.target) {
      reveal.current = Math.min(phase.target, reveal.current + dt / phase.seconds);
    }

    const progress = reveal.current;
    for (const window of EARTH_REVEAL_ORDER) {
      layers.current[window.key] = amountFor(progress, window);
    }

    /* ---- presence, dimming, recession ---- */
    // `dim`, `focus`, `rotationScale` and `recede` belong to `EarthPresence`: this group
    // renders Earth, the Reading Room decides how much of Earth the reader is given.
    const presence = stage.current.earth * layers.current.dim;
    layers.current.presence = presence;

    group.visible = presence > 0.002;

    /* ---- pose ---- */
    // Under reduced motion the camera never travels, so the hero framing is achieved by
    // placing Earth in front of the static camera instead. The swap is only ever performed
    // while presence is effectively zero — during the S6 crossfade — so it is a still
    // sequence changing stills, never a planet crossing the sky.
    if (presence < POSE_SWAP_EPSILON) {
      pose.set(poseTarget[0], poseTarget[1], poseTarget[2]);
      group.position.copy(pose);
    }

    // Earth recedes into background memory across the reading arc. It becomes smaller
    // because it is further away in the reader's attention, not because it is leaving.
    const scale = THREE.MathUtils.lerp(1, SCENE.earth.presenceScaleFloor, layers.current.recede);
    group.scale.setScalar(scale);

    /* ---- readiness ---- */
    if (!readyReported.current && group.visible) {
      residency.current += 1;
      if (residency.current >= RESIDENCY_FRAMES) {
        readyReported.current = true;
        onReady?.();
      }
    }

    /* ---- reveal-and-hold ---- */
    if (state === STATES.S7_EARTH_REVEAL && !revealReported.current) {
      if (progress >= 1) {
        holdElapsed.current += dt;
        // "The opening's first fermata" applies here too: the reveal is not complete until
        // the reader has been allowed to simply look at it.
        if (holdElapsed.current >= OGP_MOTION.durations.threshold) {
          revealReported.current = true;
          onRevealComplete?.();
        }
      }
    }
  });

  return (
    <group ref={groupRef} position={[SCENE.earth.world[0], SCENE.earth.world[1], SCENE.earth.world[2]]}>
      {/* Render order is the reveal order: rim behind, surface, clouds above. */}
      <AtmosphereShell layers={layers} tier={tier} reducedMotion={reducedMotion} />
      <EarthSurface layers={layers} tier={tier} />
      <CloudSphere layers={layers} tier={tier} reducedMotion={reducedMotion} />
    </group>
  );
};

export default EarthGroup;
