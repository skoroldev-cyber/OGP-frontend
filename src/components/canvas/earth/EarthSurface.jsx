/**
 * EarthSurface — the planet itself.
 *
 * NASA Blue Marble Next Generation true-colour as the base texture. NO borders, NO labels,
 * NO political overlays, ever — not in the first reveal, not afterwards, not as an option.
 * The prohibition is absolute and is enforced by the simplest possible means: this shader
 * has no overlay input, so there is nothing to switch on.
 *
 * Two other prohibitions shape the code:
 *   "any hue applied to the Earth surface itself" is banned (§8.2.2) — the texture is
 *     multiplied by light, never tinted. There is no colour grade uniform.
 *   "no missing-texture checkerboard" — when the file is absent the sphere is shaded
 *     procedurally from `ocean-deep` and the reading neutrals. It is a stand-in, honestly
 *     coloured from the token palette, and it is never an error state the reader can see.
 *
 * Reveal participation: this layer owns steps (2) OCEAN — "because life came through
 * water" — and (4) LAND. Continents are last "because the first recognition must be
 * planetary, not national", so ocean pixels and land pixels have SEPARATE reveal amounts
 * and the split is per-pixel, from the ocean mask.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_TIERS, OGP_COLORS, OGP_MOTION } from '@/config/ogpTheme';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { useOptionalTexture } from '@/components/canvas/shared/useOptionalTexture';

/** Peak specular on water. "Subtle reflectivity so water feels alive" (§2.6), no more. */
const OCEAN_SPECULAR = 0.16;

/** Night-side city lights. "Earth as mother, not civilization as machinery." */
const NIGHT_AMOUNT = 0.1;

const VERTEX = /* glsl */ `
varying vec2 vSurfaceUv;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

void main() {
  vSurfaceUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vViewDirection = normalize(cameraPosition - worldPosition.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform sampler2D uOceanMask;
uniform sampler2D uNightMap;
uniform float uHasMap;
uniform float uHasOceanMask;
uniform float uHasNightMap;

uniform vec3 uSunDirection;
uniform vec3 uOceanDeep;
uniform vec3 uLandNeutral;
uniform vec3 uHighlight;

uniform float uOcean;
uniform float uLand;
uniform float uBody;
uniform float uPresence;
uniform float uFocus;
uniform float uOceanSpecular;
uniform float uNightAmount;

varying vec2 vSurfaceUv;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

${GLSL_COMMON}

void main() {
  vec3 normal = normalize(vWorldNormal);

  vec3 base;
  float oceanness;

  if (uHasMap > 0.5) {
    base = texture2D(uMap, vSurfaceUv).rgb;
    // Ocean is blue-dominant; land is not. When the produced mask is present it wins.
    oceanness = smoothstep(0.0, 0.10, base.b - max(base.r, base.g));
  } else {
    // ---- procedural stand-in: never an error, never a checkerboard ----
    // Continents from banded noise on the sphere; poles lifted; everything else water.
    float continents = ogpFbm3(normal * 1.7, 5) + ogpFbm3(normal * 4.3 + 11.0, 4) * 0.35;
    float land = smoothstep(0.02, 0.20, continents);
    float polar = smoothstep(0.72, 0.95, abs(normal.y));
    vec3 water = uOceanDeep;
    vec3 ground = mix(uLandNeutral * 0.72, uLandNeutral, smoothstep(0.0, 0.5, continents));
    base = mix(water, ground, land);
    base = mix(base, uHighlight, polar * 0.6);
    oceanness = 1.0 - land;
  }

  if (uHasOceanMask > 0.5) {
    oceanness = texture2D(uOceanMask, vSurfaceUv).r;
  }

  // ---- the locked reveal order, per pixel ----
  // (2) ocean, then (4) land, then (5) the full planetary body raises whatever is left.
  float appear = clamp(max(mix(uLand, uOcean, oceanness), uBody), 0.0, 1.0);

  // ---- light: solar, natural, sacred ----
  vec3 sunDirection = normalize(uSunDirection);
  float lambert = dot(normal, sunDirection);
  // A soft terminator. A hard one would read as a rendering, not as a planet.
  float lit = smoothstep(-0.18, 0.32, lambert);

  vec3 color = base * mix(0.02, 1.0, lit);

  // Subtle water specular, only where there is water and only where there is sun.
  vec3 halfway = normalize(sunDirection + normalize(vViewDirection));
  float specular = pow(max(dot(normal, halfway), 0.0), 34.0) * oceanness * uOceanSpecular * lit;
  color += vec3(specular);

  if (uHasNightMap > 0.5) {
    color += texture2D(uNightMap, vSurfaceUv).rgb * (1.0 - lit) * uNightAmount;
  }

  // ---- background memory ----
  // In the Reading Room, Earth dims and defocuses as the manuscript takes authority. It
  // recedes toward its own luminance: still present, no longer competing.
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luminance), color, mix(0.45, 1.0, uFocus));
  color *= mix(0.42, 1.0, uFocus);

  float alpha = appear * uPresence;
  if (alpha <= 0.002) discard;

  gl_FragColor = vec4(ogpDeband(color, gl_FragCoord.xy), alpha);
}
`;

/**
 * @param {{
 *   layers: { current: Record<string, number> },
 *   tier: 'HIGH'|'MEDIUM'|'LOW',
 * }} props
 */
export const EarthSurface = ({ layers, tier }) => {
  const meshRef = useRef(null);
  const spec = EARTH_TIERS[tier] ?? EARTH_TIERS.LOW;

  const surface = useOptionalTexture(`/textures/earth/surface_${spec.resolutionKey}.webp`, {
    anisotropy: spec.anisotropy,
  });
  const oceanMask = useOptionalTexture(
    `/textures/earth/ocean_mask_${spec.cloudResolutionKey}.webp`,
    { colorSpace: THREE.NoColorSpace, anisotropy: spec.anisotropy },
  );
  const night = useOptionalTexture(
    spec.useNightSide ? `/textures/earth/night_${spec.cloudResolutionKey}.webp` : null,
    { anisotropy: spec.anisotropy },
  );

  const uniforms = useMemo(
    () => ({
      uMap: { value: null },
      uOceanMask: { value: null },
      uNightMap: { value: null },
      uHasMap: { value: 0 },
      uHasOceanMask: { value: 0 },
      uHasNightMap: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(...SCENE.earth.sunDirection).normalize() },
      uOceanDeep: { value: new THREE.Color(OGP_COLORS.oceanDeep) },
      uLandNeutral: { value: new THREE.Color(OGP_COLORS.readTextDim) },
      uHighlight: { value: new THREE.Color(OGP_COLORS.readText) },
      uOcean: { value: 0 },
      uLand: { value: 0 },
      uBody: { value: 0 },
      uPresence: { value: 0 },
      uFocus: { value: 1 },
      uOceanSpecular: { value: OCEAN_SPECULAR },
      uNightAmount: { value: NIGHT_AMOUNT },
    }),
    [],
  );

  useEffect(() => {
    uniforms.uMap.value = surface.texture;
    uniforms.uHasMap.value = surface.texture ? 1 : 0;
  }, [uniforms, surface.texture]);

  useEffect(() => {
    uniforms.uOceanMask.value = oceanMask.texture;
    uniforms.uHasOceanMask.value = oceanMask.texture ? 1 : 0;
  }, [uniforms, oceanMask.texture]);

  useEffect(() => {
    uniforms.uNightMap.value = night.texture;
    uniforms.uHasNightMap.value = night.texture ? 1 : 0;
  }, [uniforms, night.texture]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    uniforms.uOcean.value = layers.current.ocean;
    uniforms.uLand.value = layers.current.land;
    uniforms.uBody.value = layers.current.body;
    uniforms.uPresence.value = layers.current.presence;
    uniforms.uFocus.value = layers.current.focus;

    mesh.visible = layers.current.presence > 0.002;
    if (!mesh.visible) return;

    // One revolution in at least eight minutes, slowed further as Earth becomes
    // background memory. "The Earth should never become a spinning toy."
    mesh.rotation.y +=
      ((Math.PI * 2) / OGP_MOTION.earthRotationPeriodSec) *
      layers.current.rotationScale *
      Math.min(delta, 0.1);
  });

  return (
    <mesh ref={meshRef} renderOrder={0}>
      <sphereGeometry args={[SCENE.earth.radius, ...spec.surfaceSegments]} />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite
        toneMapped={false}
      />
    </mesh>
  );
};

export default EarthSurface;
