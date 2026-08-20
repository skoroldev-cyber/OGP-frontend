import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_TIERS, OGP_MOTION } from '@/config/ogpTheme';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import '@/components/canvas/shaders/AtmosphereMaterial';

const BREATH_PERIOD = (OGP_MOTION.pulsePeriodSec[0] + OGP_MOTION.pulsePeriodSec[1]) / 2;

export const AtmosphereShell = ({ layers, tier, reducedMotion }) => {
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const elapsed = useRef(0);

  const spec = EARTH_TIERS[tier] ?? EARTH_TIERS.LOW;

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.sunDirection = SCENE.earth.sunDirection;
  }, []);

  useFrame((_, delta) => {
    const material = materialRef.current;
    const mesh = meshRef.current;
    if (!material || !mesh) return;

    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;

    const rim = layers.current.rim;

    const breath = reducedMotion
      ? 0
      : Math.sin((elapsed.current / BREATH_PERIOD) * Math.PI * 2) * OGP_MOTION.pulseGlowAmplitude;

    material.presence = rim * layers.current.presence;
    material.intensity = (1 + breath) * THREE.MathUtils.lerp(0.55, 1, layers.current.focus);

    mesh.visible = material.presence > 0.002;
  });

  return (
    <mesh ref={meshRef} renderOrder={1}>
      <sphereGeometry
        args={[SCENE.earth.radius * SCENE.earth.atmosphereScale, ...spec.atmosphereSegments]}
      />
      <atmosphereMaterial ref={materialRef} />
    </mesh>
  );
};

export default AtmosphereShell;
