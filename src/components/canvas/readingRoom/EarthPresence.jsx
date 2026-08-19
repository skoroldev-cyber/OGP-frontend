/**
 * EarthPresence — Earth as "background memory".
 *
 * "Earth recedes into the Reading Room's background memory; the environment becomes
 * quieter, not more elaborate; the first manuscript page appears with complete typographic
 * authority" (§2.2, min 1.5–3). Across the arc Earth is dimmed, slowed, defocused and
 * allowed to recede — it never leaves, and it never competes. §8.1.8: "Visuals surrender
 * to the manuscript."
 *
 * THE REF BRIDGE. Reading position must never drive per-frame React state: "via a DOM ->
 * context -> useFrame-ref bridge, never per-scroll React state" (§7.4.4). The subscription
 * to `useReading` is therefore isolated in `ReadingBridge`, a component that renders
 * `null`, holds no scene graph, and writes numbers into a ref inside an effect keyed on
 * the UNIT index alone. React may re-render that leaf when the reading context changes;
 * it costs one function call and reconciles nothing, and the effect body runs only at unit
 * boundaries. Everything the canvas actually does with the value happens in `useFrame`,
 * reading a ref.
 *
 * Nothing here is a progress indicator. There is no percentage, no bar and no goal —
 * the recession is the only feedback the environment gives, and the reader is not
 * supposed to notice it happening.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, OGP_MOTION } from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { useReading } from '@/context/ReadingProvider';
import { SCENE } from '@/components/canvas/shared/sceneLayout';

/**
 * Where Earth ends up when the manuscript has full authority. None of these reach zero:
 * Earth is background MEMORY, and a memory that fades to nothing was not one.
 */
const MEMORY_FLOOR = Object.freeze({
  /** Overall presence multiplier. */
  dim: 0.42,
  /** Contrast and saturation. Below 1 the surface desaturates toward its own luminance. */
  focus: 0.3,
  /** Rotation rate multiplier — one revolution in eight minutes becomes one in eighteen. */
  rotationScale: 0.45,
});

/** Peak opacity of the veil that carries the recession. Air between reader and planet. */
const VEIL_CEILING = 0.34;

/**
 * The isolated subscription. Renders nothing, owns nothing, and writes only at unit
 * boundaries — `unitIndex` and `unitCount` change once per unit, never per scroll event.
 *
 * @param {{ targets: { current: Record<string, number> }, active: boolean }} props
 */
const ReadingBridge = ({ targets, active }) => {
  const { unitIndex, unitCount } = useReading();
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const span = Math.max(1, unitCount - 1);
    const arc = active ? THREE.MathUtils.clamp(unitIndex / span, 0, 1) : 0;

    targets.current.dim = THREE.MathUtils.lerp(1, MEMORY_FLOOR.dim, arc);
    targets.current.focus = THREE.MathUtils.lerp(1, MEMORY_FLOOR.focus, arc);
    targets.current.rotationScale = THREE.MathUtils.lerp(1, MEMORY_FLOOR.rotationScale, arc);
    targets.current.recede = arc;

    // Under `frameloop="demand"` with the ambient ticker at zero, this boundary would
    // otherwise never be drawn. One frame, requested exactly when something changed.
    invalidate();
  }, [targets, active, unitIndex, unitCount, invalidate]);

  return null;
};

/**
 * @param {{
 *   layers: { current: Record<string, number> },
 *   state: string,
 *   poseTarget: readonly number[],
 * }} props
 */
export const EarthPresence = ({ layers, state, poseTarget }) => {
  const veilRef = useRef(null);
  const groupRef = useRef(null);

  const targets = useRef({ dim: 1, focus: 1, rotationScale: 1, recede: 0 });
  const veilColor = useMemo(() => new THREE.Color(OGP_COLORS.readField), []);

  const reading = stateIndex(state) >= stateIndex(STATES.S10_OPENING_ARC_READING);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Every transition is a slow ease, never a step. A reader who moves between units
    // must not be able to see the environment respond to them — that would make the
    // environment a scoreboard, which §3.1 forbids in every form.
    const lambda = 3 / OGP_MOTION.durations.threshold;
    layers.current.dim = THREE.MathUtils.damp(layers.current.dim, targets.current.dim, lambda, dt);
    layers.current.focus = THREE.MathUtils.damp(
      layers.current.focus,
      targets.current.focus,
      lambda,
      dt,
    );
    layers.current.rotationScale = THREE.MathUtils.damp(
      layers.current.rotationScale,
      targets.current.rotationScale,
      lambda,
      dt,
    );
    layers.current.recede = THREE.MathUtils.damp(
      layers.current.recede,
      targets.current.recede,
      lambda,
      dt,
    );

    const group = groupRef.current;
    const veil = veilRef.current;
    if (!group || !veil) return;

    const opacity = layers.current.recede * layers.current.presence * VEIL_CEILING;
    veil.material.opacity = opacity;
    group.visible = opacity > 0.003;

    // The veil travels with Earth, including across the reduced-motion pose swap, which
    // only ever happens while nothing is visible.
    if (layers.current.presence < 0.015) {
      group.position.set(poseTarget[0], poseTarget[1], poseTarget[2]);
    }
  });

  return (
    <>
      <ReadingBridge targets={targets} active={reading} />
      <group
        ref={groupRef}
        position={[SCENE.earth.world[0], SCENE.earth.world[1], SCENE.earth.world[2]]}
      >
        <mesh ref={veilRef} renderOrder={3}>
          <sphereGeometry args={[SCENE.earth.radius * SCENE.earth.atmosphereScale * 1.02, 48, 32]} />
          <meshBasicMaterial
            color={veilColor}
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.FrontSide}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </>
  );
};

export default EarthPresence;
