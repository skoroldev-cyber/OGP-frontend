/**
 * AtmosphereShell — the thin, luminous, fragile blue rim.
 *
 * This is the FIRST visible Earth signal. The locked reveal order opens with it because
 * "Life exists because this planet holds breath" (§2.4.5b) — before ocean, before clouds,
 * before land, the reader sees the layer that makes life possible at all.
 *
 * Restraint is the entire brief here. D-002 says "Avoid exaggerated glow"; §8.2.2 prohibits
 * "neon anything" and "corporate stock-photo glow". The shell is only 6% larger than the
 * planet, so the rim's WIDTH is geometric — it cannot be dialled up into a halo. Its
 * brightness is gated by the sun direction, so it behaves like air on a limb rather than
 * like a ring of light, and the material's own defaults (`AtmosphereMaterial`) carry the
 * ceilings.
 *
 * The shell also carries "the atmosphere breathes" (§2.6 aliveness): an extremely slow
 * intensity respiration on the same period as the weave's heartbeat, at an amplitude
 * inside `OGP_MOTION.pulseGlowAmplitude`. Under reduced motion it holds perfectly still.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_TIERS, OGP_MOTION } from '@/config/ogpTheme';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import '@/components/canvas/shaders/AtmosphereMaterial';

/** Breath period, seconds. The midpoint of the canonical heartbeat window. */
const BREATH_PERIOD = (OGP_MOTION.pulsePeriodSec[0] + OGP_MOTION.pulsePeriodSec[1]) / 2;

/**
 * @param {{
 *   layers: { current: Record<string, number> },
 *   tier: 'HIGH'|'MEDIUM'|'LOW',
 *   reducedMotion: boolean,
 * }} props
 */
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

    // The rim leads the reveal: it is already fully present while the ocean is still
    // arriving, which is what makes the first recognition atmospheric rather than
    // cartographic.
    const rim = layers.current.rim;

    // The atmosphere breathes. Amplitude is the emissive pulse ceiling, so the rim can
    // never breathe harder than the weave pulses.
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
