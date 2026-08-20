import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, OGP_MOTION } from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { useReading } from '@/context/ReadingProvider';
import { SCENE } from '@/components/canvas/shared/sceneLayout';

const MEMORY_FLOOR = Object.freeze({
  dim: 0.42,
  focus: 0.3,
  rotationScale: 0.45,
});

const VEIL_CEILING = 0.34;

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

    invalidate();
  }, [targets, active, unitIndex, unitCount, invalidate]);

  return null;
};

export const EarthPresence = ({ layers, state, poseTarget }) => {
  const veilRef = useRef(null);
  const groupRef = useRef(null);

  const targets = useRef({ dim: 1, focus: 1, rotationScale: 1, recede: 0 });
  const veilColor = useMemo(() => new THREE.Color(OGP_COLORS.readField), []);

  const reading = stateIndex(state) >= stateIndex(STATES.S10_OPENING_ARC_READING);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

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
