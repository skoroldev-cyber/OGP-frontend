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

const _drawingSize = new THREE.Vector2();

const POINT_SIZE_REFERENCE_DISTANCE = 28;

const ENERGY_REACH = 3.2;

const FLOW_SCALE = 0.11;

const ZONE_REACH = 0.35;

const S4_BEATS = Object.freeze({ thresholdEnd: 0.3, discoveryEnd: 0.62 });

const GUIDE_SWAP_EPSILON = 0.01;

const breathEnvelope = (u) => {
  if (u < 0.18) return THREE.MathUtils.smoothstep(u, 0, 0.18);
  if (u < 0.42) return 1;
  if (u < 0.64) return 1 - THREE.MathUtils.smoothstep(u, 0.42, 0.64);
  return 0;
};

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

  const still = useRef({ shown: 0, wanted: 0, blend: 1 });

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

  useEffect(() => {
    if (!controlRef) return undefined;
    const pulse = pulseRef.current;
    controlRef.current = {
      get material() {
        return materialRef.current;
      },
      setAperture: (travel) => {
        const material = materialRef.current;
        if (material) material.aperture = travel;
      },
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

    if (inS3 && converge.current < 1) {
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

    if (inS4) {
      const beatSeconds = Math.max(
        OGP_MOTION.durations.scene,
        (OGP_TIMING.S4.targetMs / 1000) * S4_BEATS.thresholdEnd,
      );
      throat.current = Math.min(1, throat.current + dt / beatSeconds);
    }
    material.throat = throat.current * SCENE.weave.throatDepth;

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

    material.zonePhase =
      (elapsed.current * Math.PI * 2) / ORIGIN_FIELD.densityZones.migrationPeriodSec;
    material.zoneStrength = ZONE_REACH * converge.current * (reducedMotion ? 0 : 1);

    material.time = elapsed.current;

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
