/**
 * LivingWeave — S3 Logo Manifestation and S4 Living Weave.
 *
 * "Fine golden energy ... innumerable living points beginning to reveal relationship."
 * A GPU point field of `PARTICLE_COUNTS.weave` points per tier, moved by a curl-noise flow
 * field in the vertex shader, converging over S3 onto spline guides sampled from the
 * canonical logo band geometry — which arrives as DATA from `weaveGuides.js`, never as
 * geometry, so the Phase 2 Living Origin Field is an asset swap (§7.4.1, §2.12).
 *
 * The three things this component must never do, and the mechanisms that prevent them:
 *
 *   NO LOGO REVEAL. Points converge on individually staggered schedules, so the form
 *     assembles out of relationships. There is no moment at which a shape appears; there
 *     is a stretch of time across which one becomes legible. ("Energy -> relationship ->
 *     form", never "Logo -> brand name -> message".)
 *   NO MECHANICAL OPENING. The centre is never split, stretched or parted. It gains DEPTH:
 *     points near the axis recede, and the field beyond the opening — seeded inside it, far
 *     back — becomes perceptible. The reader gradually understands the centre has always
 *     been an opening, because it always was (C-001).
 *   NO LOOP. The heartbeat's period is re-drawn every cycle inside `OGP_MOTION.pulsePeriodSec`,
 *     and the flow field is aperiodic, so nothing in the idle state is ever recognisable
 *     as a repeat (§2.5 "randomized — no perceptible loops or resets").
 *
 * Prohibited and absent: impacts, flashes, countdowns, glitter, exploding particles,
 * conventional logo-reveal behaviour, lens flares.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  OGP_MOTION,
  OGP_TIMING,
  ORIGIN_FIELD,
  PARTICLE_COUNTS,
  budgetForTier,
} from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { STAGE } from '@/components/canvas/shared/stageStore';
import {
  DEFAULT_SEED,
  createRandom,
  loadWeaveGuides,
  proceduralGuideSource,
  sampleGuidePoints,
} from '@/components/canvas/opening/weaveGuides';
import '@/components/canvas/shaders/WeaveMaterial';

/* -------------------------------------------------------------------------- */
/* Module scope                                                                */
/* -------------------------------------------------------------------------- */

const _drawingSize = new THREE.Vector2();

/**
 * The distance at which `ORIGIN_FIELD.pointSizePx` is literally true. Points attenuate
 * with depth from there, so the token describes the field as the reader first meets it.
 */
const POINT_SIZE_REFERENCE_DISTANCE = 28;

/** Free-energy displacement amplitude, world units. SPEED is the token; this is reach. */
const ENERGY_REACH = 3.2;

/** Spatial frequency of the flow field. Lower = broader, calmer eddies. */
const FLOW_SCALE = 0.11;

/** Peak density-zone displacement, world units. Brighter and quieter regions, not clumps. */
const ZONE_REACH = 0.35;

/**
 * The three S4 sub-beats of the §2.2 score, as fractions of the `OGP_TIMING.S4` envelope.
 * This is the ORDER and relative weight of the beats — structure, which is binding. The
 * absolute seconds come from `OGP_TIMING`, which is where a Creative Director tunes them.
 *
 *   [0, thresholdEnd)        (a) Threshold — the centre acquires depth
 *   [thresholdEnd, discoveryEnd) (b) Earth discovered, far inside the opening
 *   [discoveryEnd, 1]        (c) Breath — "the opening's first fermata"
 */
const S4_BEATS = Object.freeze({ thresholdEnd: 0.3, discoveryEnd: 0.62 });

/** A guide swap after the field is visible would be a seam. This is "not yet visible". */
const GUIDE_SWAP_EPSILON = 0.01;

/**
 * The `ogpBreath` shape: slow in, long hold, slow out, then stillness. Expressed
 * analytically rather than as a GSAP timeline so the cycle can never restart visibly —
 * "no perceptible loops or resets" is a requirement about seams, and a seamless
 * oscillator has no seam to hide.
 *
 * @param {number} u 0..1 through one heartbeat period
 * @returns {number} 0..1
 */
const breathEnvelope = (u) => {
  if (u < 0.18) return THREE.MathUtils.smoothstep(u, 0, 0.18);
  if (u < 0.42) return 1;
  if (u < 0.64) return 1 - THREE.MathUtils.smoothstep(u, 0.42, 0.64);
  return 0;
};

/**
 * @param {{
 *   state: string,
 *   tier: 'HIGH'|'MEDIUM'|'LOW',
 *   settings: { particleScale: number },
 *   reducedMotion: boolean,
 *   controlRef: { current: any },
 *   onConverged?: () => void,
 *   onBreathComplete?: () => void,
 * }} props
 */
export const LivingWeave = ({
  state,
  tier,
  settings,
  reducedMotion,
  controlRef,
  onConverged,
  onBreathComplete,
}) => {
  const pointsRef = useRef(null);
  const materialRef = useRef(null);

  const converge = useRef(0);
  const throat = useRef(0);
  const elapsed = useRef(0);
  const convergedReported = useRef(false);
  const breathReported = useRef(false);

  /** Reduced-motion still crossfade: dip to nothing, swap the still, come back. */
  const still = useRef({ shown: 0, wanted: 0, blend: 1 });

  // A ref, initialised once with the documented null-check pattern: the heartbeat's phase
  // is mutated every frame, so it must live somewhere React is not entitled to freeze.
  const pulseRef = useRef(null);
  if (pulseRef.current === null) {
    pulseRef.current = {
      elapsed: 0,
      period: OGP_MOTION.pulsePeriodSec[0],
      boost: 0,
      random: createRandom(DEFAULT_SEED ^ 0x5eed),
      started: false,
    };
  }

  const [budget] = useState(() => ({
    count: budgetForTier(PARTICLE_COUNTS.weave, tier),
    scale: settings.particleScale,
  }));

  // The generated form is available from the first frame — the field is never absent while
  // a fetch decides. The produced asset replaces it only if it arrives before the field is
  // visible; after that a swap would be a perceptible scene change, which is prohibited.
  const [guideSource, setGuideSource] = useState(() => proceduralGuideSource());

  useEffect(() => {
    let cancelled = false;
    loadWeaveGuides().then((source) => {
      if (cancelled || !source) return;
      if (STAGE.weave > GUIDE_SWAP_EPSILON) return;
      setGuideSource(source);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const geometry = useMemo(() => {
    const seeds = sampleGuidePoints(guideSource, budget.count, { seed: DEFAULT_SEED });
    const { outerRadius, bandDepth, throatDepth } = SCENE.weave;

    const positions = new Float32Array(budget.count * 3);
    const targets = new Float32Array(budget.count * 3);

    for (let i = 0; i < budget.count; i += 1) {
      const i3 = i * 3;
      positions[i3] = seeds.scatter[i3] * outerRadius;
      positions[i3 + 1] = seeds.scatter[i3 + 1] * outerRadius;
      positions[i3 + 2] = seeds.scatter[i3 + 2] * outerRadius;

      targets[i3] = seeds.targets[i3] * outerRadius;
      targets[i3 + 1] = seeds.targets[i3 + 1] * outerRadius;
      // Band points are dimensional but shallow; the field BEYOND the opening recedes far
      // enough to read as distance rather than as a back layer of the same object.
      targets[i3 + 2] =
        seeds.targets[i3 + 2] * (seeds.radial[i] > 0 ? bandDepth : throatDepth);
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
    buffer.setAttribute('aSeed', new THREE.BufferAttribute(seeds.seeds, 3));
    buffer.setAttribute('aPhase', new THREE.BufferAttribute(seeds.phase, 1));
    buffer.setAttribute('aBand', new THREE.BufferAttribute(seeds.band, 1));
    buffer.setAttribute('aRadial', new THREE.BufferAttribute(seeds.radial, 1));
    buffer.boundingSphere = new THREE.Sphere(new THREE.Vector3(), outerRadius * 3);
    return buffer;
  }, [guideSource, budget.count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    const fraction = Math.min(1, settings.particleScale / budget.scale);
    geometry.setDrawRange(0, Math.max(1, Math.floor(budget.count * fraction)));
  }, [geometry, budget, settings.particleScale]);

  // The control surface PortalEntry and WeavePassage drive. Assigned in an effect, never
  // during render, so the ref is never written while React is deciding what to draw.
  useEffect(() => {
    if (!controlRef) return undefined;
    const pulse = pulseRef.current;
    controlRef.current = {
      get material() {
        return materialRef.current;
      },
      /**
       * S5 aperture expansion. Exposed as a method rather than as a writable field so the
       * weave material stays this component's to mutate — PortalEntry asks for an
       * aperture, it does not reach in and set one.
       *
       * @param {number} travel outward strand travel, in world units
       */
      setAperture: (travel) => {
        const material = materialRef.current;
        if (material) material.aperture = travel;
      },
      /**
       * "One slightly stronger pulse" (§2.4.7). Restarts the cycle so the stronger beat
       * arrives now rather than whenever the current cycle happens to come round.
       *
       * @param {number} [strength] additional amplitude, as a fraction of the base pulse
       */
      pulseOnce: (strength = 0.5) => {
        pulse.elapsed = 0;
        pulse.boost = strength;
        pulse.started = true;
      },
    };
    return () => {
      controlRef.current = null;
    };
  }, [controlRef]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.reduced = reducedMotion;
    material.curlScale = FLOW_SCALE;
    material.drift = ENERGY_REACH;
    // Peak speed = reach x rate, and the rate is derived so the product is exactly the
    // token: "drift ... below conscious tracking speed" holds by construction.
    material.curlSpeed = ORIGIN_FIELD.driftMaxUnitsPerSec / ENERGY_REACH;
    material.openingRadius = SCENE.weave.openingRadius;
    material.sizeMin = ORIGIN_FIELD.pointSizePx[0];
    material.sizeMax = ORIGIN_FIELD.pointSizePx[1];
    material.activity = ORIGIN_FIELD.activity;
  }, [reducedMotion]);

  useEffect(() => {
    convergedReported.current = false;
    breathReported.current = false;
  }, [state]);

  const convergeSeconds = useMemo(
    () =>
      Math.max(
        OGP_MOTION.durations.scene,
        OGP_TIMING.S3.targetMs / 1000 - OGP_MOTION.durations.scene,
      ),
    [],
  );

  useFrame((frameState, delta) => {
    const material = materialRef.current;
    const points = pointsRef.current;
    const pulse = pulseRef.current;
    if (!material || !points || !pulse) return;

    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;

    const index = stateIndex(state);
    const inS3 = index >= stateIndex(STATES.S3_LOGO_MANIFESTATION);
    const inS4 = index >= stateIndex(STATES.S4_LIVING_WEAVE);

    /* ---- convergence: energy -> relationship -> form ---- */
    if (inS3 && converge.current < 1) {
      // Reduced motion has no assembling animation to watch; it gets the resolved still,
      // swapped behind a crossfade below.
      converge.current = reducedMotion
        ? 1
        : Math.min(1, converge.current + dt / convergeSeconds);
      if (converge.current >= 1 && !convergedReported.current) {
        convergedReported.current = true;
        pulse.started = true;
        if (state === STATES.S3_LOGO_MANIFESTATION) onConverged?.();
      }
    }
    material.converge = converge.current;

    /* ---- the centre acquires depth ---- */
    if (inS4) {
      const beatSeconds = Math.max(
        OGP_MOTION.durations.scene,
        (OGP_TIMING.S4.targetMs / 1000) * S4_BEATS.thresholdEnd,
      );
      throat.current = Math.min(1, throat.current + dt / beatSeconds);
    }
    material.throat = throat.current * SCENE.weave.throatDepth;

    /* ---- the breath, and the fermata that ends S4 ---- */
    if (state === STATES.S4_LIVING_WEAVE && !breathReported.current) {
      const holdSeconds = Math.max(
        OGP_MOTION.durations.scene,
        OGP_TIMING.S4.targetMs / 1000 - OGP_MOTION.durations.scene,
      );
      if (STAGE.stateElapsed >= holdSeconds) {
        breathReported.current = true;
        onBreathComplete?.();
      }
    }

    /* ---- heartbeat ---- */
    if (pulse.started) {
      pulse.elapsed += dt;
      if (pulse.elapsed >= pulse.period) {
        pulse.elapsed -= pulse.period;
        pulse.boost = 0;
        const [minPeriod, maxPeriod] = OGP_MOTION.pulsePeriodSec;
        pulse.period = THREE.MathUtils.lerp(minPeriod, maxPeriod, pulse.random());
      }
      material.pulse = breathEnvelope(pulse.elapsed / pulse.period) * (1 + pulse.boost);
    } else {
      material.pulse = 0;
    }

    /* ---- density zones: slow cluster emergence, silhouette preserved ---- */
    material.zonePhase =
      (elapsed.current * Math.PI * 2) / ORIGIN_FIELD.densityZones.migrationPeriodSec;
    material.zoneStrength = ZONE_REACH * converge.current * (reducedMotion ? 0 : 1);

    material.time = elapsed.current;

    /* ---- reduced-motion still crossfade ---- */
    // Reduced motion is a SEQUENCE OF STILLS. When the still should change, the field
    // fades out, the new still is placed while nothing is on screen, and it fades back.
    let blend = 1;
    if (reducedMotion) {
      still.current.wanted = inS4 ? 2 : inS3 ? 1 : 0;
      const lambda = 3 / OGP_MOTION.durations.threshold;
      if (still.current.wanted !== still.current.shown) {
        still.current.blend = THREE.MathUtils.damp(still.current.blend, 0, lambda, dt);
        if (still.current.blend < 0.01) still.current.shown = still.current.wanted;
      } else {
        still.current.blend = THREE.MathUtils.damp(still.current.blend, 1, lambda, dt);
      }
      blend = still.current.blend;
    } else {
      still.current.blend = 1;
    }

    const presence = STAGE.weave * blend;
    material.presence = presence;
    points.visible = presence > 0.0015;
    if (!points.visible) return;

    // `ORIGIN_FIELD.pointSizePx` is a SCREEN measure; three attenuates by
    // `drawingBufferHeight / 2 / viewZ`, so the world-space size that makes the token
    // literally true at the reference distance is derived, never guessed.
    const drawingHeight = frameState.gl.getDrawingBufferSize(_drawingSize).y;
    material.size = POINT_SIZE_REFERENCE_DISTANCE / Math.max(1, drawingHeight * 0.5);
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <weaveMaterial ref={materialRef} />
    </points>
  );
};

export default LivingWeave;
