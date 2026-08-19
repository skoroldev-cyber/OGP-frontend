/**
 * Starfield — "space dark, quiet, humble, not sci-fi" (D-006: "No stock-space appearance").
 *
 * Almost every decision here is a refusal:
 *
 *   no flares          the falloff is a plain Gaussian — no spikes, no cross, no rays
 *   no twinkle         nothing modulates a star's brightness; twinkle is spectacle
 *   no colour drama    hues sit between `read-text-dim` and `atmos-rim`, barely apart
 *   no depth theatre   stars are a shell that FOLLOWS the camera, so travelling 220 units
 *                      through the scene never turns them into a parallax effect
 *   no density         the field is sparse and dim enough to read as depth, not as decor
 *
 * What remains is the thing the score actually asks for: enough light that the void is
 * clearly space rather than an unlit room, and little enough that Earth is the only thing
 * in the frame the eye can hold.
 *
 * Sizes are in pixels and do not attenuate. Real stars are point sources; a star that grew
 * as the camera approached would be a lie the reader could feel.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, PARTICLE_COUNTS, budgetForTier } from '@/config/ogpTheme';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { createRandom } from '@/components/canvas/opening/weaveGuides';

const _cameraPosition = new THREE.Vector3();

/** Deterministic sky. The same stars are behind Earth in the still frame and the moving one. */
const STAR_SEED = 0x51a4;

/** Screen size in pixels, dimmest to brightest star. Small, because humility is the brief. */
const STAR_SIZE_PX = { min: 0.9, max: 1.9 };

/** Peak star opacity. The field is a texture of depth, never a subject. */
const STAR_CEILING = 0.55;

const VERTEX = /* glsl */ `
attribute vec3 aSeed;

uniform float uPresence;
uniform float uSizeMin;
uniform float uSizeMax;
uniform float uPixelRatio;

varying float vAlpha;
varying float vHue;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);

  // A magnitude distribution: many faint, a few less faint, none bright.
  float magnitude = aSeed.z * aSeed.z;
  vAlpha = uPresence * mix(0.22, 1.0, magnitude);
  vHue = aSeed.x;

  gl_PointSize = mix(uSizeMin, uSizeMax, magnitude) * uPixelRatio;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uWarm;
uniform vec3 uCool;

varying float vAlpha;
varying float vHue;

${GLSL_COMMON}

void main() {
  // One Gaussian. There is no second term that could become a flare.
  float falloff = ogpSoftPoint(gl_PointCoord, 1.1);
  float alpha = falloff * vAlpha;
  if (alpha <= 0.002) discard;

  vec3 color = mix(uWarm, uCool, vHue);
  gl_FragColor = vec4(ogpDeband(color, gl_FragCoord.xy), alpha);
}
`;

/**
 * @param {{
 *   stage: { current: Record<string, number> },
 *   tier: 'HIGH'|'MEDIUM'|'LOW',
 *   settings: { particleScale: number },
 * }} props
 */
export const Starfield = ({ stage, tier, settings }) => {
  const groupRef = useRef(null);
  const pointsRef = useRef(null);

  const [budget] = useState(() => ({
    count: budgetForTier(PARTICLE_COUNTS.stars, tier),
    scale: settings.particleScale,
  }));

  const geometry = useMemo(() => {
    const random = createRandom(STAR_SEED);
    const positions = new Float32Array(budget.count * 3);
    const seeds = new Float32Array(budget.count * 3);
    const radius = SCENE.stars.radius;

    for (let i = 0; i < budget.count; i += 1) {
      const i3 = i * 3;
      // Uniform on the sphere. Constellations are a human overlay, and overlays are the
      // one thing this build never puts on the sky.
      const u = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const planar = Math.sqrt(Math.max(0, 1 - u * u));
      positions[i3] = radius * planar * Math.cos(angle);
      positions[i3 + 1] = radius * u;
      positions[i3 + 2] = radius * planar * Math.sin(angle);
      seeds[i3] = random();
      seeds[i3 + 1] = random();
      seeds[i3 + 2] = random();
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    buffer.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * 1.2);
    return buffer;
  }, [budget.count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    const fraction = Math.min(1, settings.particleScale / budget.scale);
    geometry.setDrawRange(0, Math.max(1, Math.floor(budget.count * fraction)));
  }, [geometry, budget, settings.particleScale]);

  const uniforms = useMemo(
    () => ({
      uPresence: { value: 0 },
      uSizeMin: { value: STAR_SIZE_PX.min },
      uSizeMax: { value: STAR_SIZE_PX.max },
      uPixelRatio: { value: 1 },
      uWarm: { value: new THREE.Color(OGP_COLORS.readTextDim) },
      uCool: { value: new THREE.Color(OGP_COLORS.atmosRim) },
    }),
    [],
  );

  useFrame((frameState) => {
    const presence = stage.current.stars * STAR_CEILING;
    uniforms.uPresence.value = presence;
    uniforms.uPixelRatio.value = frameState.viewport.dpr ?? 1;

    const points = pointsRef.current;
    if (points) points.visible = presence > 0.002;

    // The shell rides the camera exactly. Stars must not parallax: they are at infinity,
    // and the reader crosses 220 units of the scene between the weave and Earth.
    const group = groupRef.current;
    if (!group) return;
    frameState.camera.getWorldPosition(_cameraPosition);
    group.position.copy(_cameraPosition);
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} frustumCulled={false} renderOrder={-500}>
        <shaderMaterial
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
};

export default Starfield;
