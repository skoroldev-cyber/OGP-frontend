/**
 * CloudSphere — "cloud systems, moving slowly, like breath."
 *
 * Step (3) of the locked reveal order: after the atmosphere and the ocean, before land.
 * A slightly larger transparent sphere with its OWN rotation, independent of the surface.
 * That independence is the whole point — a cloud layer welded to the ground reads as a
 * painted globe, and "plastic globe" and "cartoon Earth" are named prohibitions (§2.6).
 *
 * Independent, but never faster: the differential is a fraction of an already
 * sub-perceptual rate, so over a reading session the weather moves relative to the
 * continents and at no moment can either be seen to turn.
 *
 * Missing texture: procedural fbm cloud systems, banded by latitude so they read as
 * weather rather than as noise. Same law as the surface — a 404 degrades the picture, it
 * never produces an error or a checkerboard.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_TIERS, OGP_COLORS, OGP_MOTION } from '@/config/ogpTheme';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { useOptionalTexture } from '@/components/canvas/shared/useOptionalTexture';

/**
 * How much faster the clouds turn than the surface. The surface already takes eight
 * minutes per revolution; this makes the weather drift across it over roughly an hour.
 */
const CLOUD_ROTATION_RATIO = 1.18;

/** Peak cloud opacity. Clouds veil the planet; they never replace it. */
const CLOUD_OPACITY = 0.72;

const VERTEX = /* glsl */ `
varying vec2 vCloudUv;
varying vec3 vWorldNormal;

void main() {
  vCloudUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uSunDirection;
uniform vec3 uCloudColor;
uniform float uAmount;
uniform float uPresence;
uniform float uOpacity;
uniform float uFocus;
uniform float uDrift;

varying vec2 vCloudUv;
varying vec3 vWorldNormal;

${GLSL_COMMON}

void main() {
  vec3 normal = normalize(vWorldNormal);

  float coverage;
  if (uHasMap > 0.5) {
    // Blue Marble cloud plates are luminance masks: white is cloud, black is clear sky.
    coverage = texture2D(uMap, vCloudUv).r;
  } else {
    // ---- procedural stand-in ----
    // Latitude banding gives the systems a circulation to belong to, so the fallback
    // reads as weather rather than as an even scatter of noise.
    vec3 p = normal * 2.6 + vec3(uDrift, 0.0, 0.0);
    float systems = ogpFbm3(p, 5) * 0.5 + 0.5;
    float bands = 0.5 + 0.5 * sin(normal.y * 7.0 + ogpFbm3(p * 0.8, 3) * 2.2);
    coverage = smoothstep(0.42, 0.86, systems * (0.55 + bands * 0.45));
  }

  // Clouds are lit by the same sun as the ground, with a softer terminator: cloud tops
  // catch light past the line the surface has already lost.
  float lit = smoothstep(-0.28, 0.38, dot(normal, normalize(uSunDirection)));

  float alpha = coverage * uAmount * uPresence * uOpacity * mix(0.35, 1.0, uFocus);
  if (alpha <= 0.002) discard;

  vec3 color = uCloudColor * mix(0.03, 1.0, lit) * mix(0.5, 1.0, uFocus);
  gl_FragColor = vec4(ogpDeband(color, gl_FragCoord.xy), alpha);
}
`;

/**
 * @param {{
 *   layers: { current: Record<string, number> },
 *   tier: 'HIGH'|'MEDIUM'|'LOW',
 *   reducedMotion: boolean,
 * }} props
 */
export const CloudSphere = ({ layers, tier, reducedMotion }) => {
  const meshRef = useRef(null);
  const elapsed = useRef(0);
  const spec = EARTH_TIERS[tier] ?? EARTH_TIERS.LOW;

  const clouds = useOptionalTexture(`/textures/earth/clouds_${spec.cloudResolutionKey}.webp`, {
    anisotropy: spec.anisotropy,
  });

  const uniforms = useMemo(
    () => ({
      uMap: { value: null },
      uHasMap: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(...SCENE.earth.sunDirection).normalize() },
      uCloudColor: { value: new THREE.Color(OGP_COLORS.readText) },
      uAmount: { value: 0 },
      uPresence: { value: 0 },
      uOpacity: { value: CLOUD_OPACITY },
      uFocus: { value: 1 },
      uDrift: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    uniforms.uMap.value = clouds.texture;
    uniforms.uHasMap.value = clouds.texture ? 1 : 0;
  }, [uniforms, clouds.texture]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;

    uniforms.uAmount.value = layers.current.clouds;
    uniforms.uPresence.value = layers.current.presence;
    uniforms.uFocus.value = layers.current.focus;

    mesh.visible = layers.current.clouds * layers.current.presence > 0.002;
    if (!mesh.visible) return;

    // Independent rotation. Same law as the surface, a different rate — which is exactly
    // what makes the layer read as atmosphere rather than as paint.
    const rate =
      ((Math.PI * 2) / OGP_MOTION.earthRotationPeriodSec) *
      CLOUD_ROTATION_RATIO *
      layers.current.rotationScale;
    mesh.rotation.y += rate * dt;

    // The procedural systems also evolve, at the same sub-perceptual budget as every
    // other drift in the build. Held still under reduced motion.
    if (!reducedMotion) {
      uniforms.uDrift.value += OGP_MOTION.driftMaxUnitsPerSec * dt;
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={2}>
      <sphereGeometry
        args={[SCENE.earth.radius * SCENE.earth.cloudScale, ...spec.cloudSegments]}
      />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

export default CloudSphere;
