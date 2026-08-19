/**
 * PathwayField — S14 ambience, and nothing else.
 *
 * The pathways are "quiet, equal-weight choices ... as serif titles with one-line Inter
 * descriptions" (§8.10.3) and they live entirely in the DOM. That is not an implementation
 * convenience: the canvas is `aria-hidden` decoration, and a choice a screen reader cannot
 * reach is not an equal choice. So this component renders no geometry that corresponds to a
 * pathway, no count of anything, and nothing selectable.
 *
 * What it contributes is air: a sparse drift of gold motes around the reader so the
 * decision is made somewhere rather than on a blank field. §8.10.3 also rules out
 * everything that would make one choice louder — "no highlighted 'recommended' option, no
 * urgency" — and the field is uniform in every direction, so it cannot point anywhere.
 *
 * The ambience behind any one choice is the same ambience behind every other, which is the
 * canvas's entire contribution to that promise.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, OGP_MOTION, ORIGIN_FIELD, budgetForTier } from '@/config/ogpTheme';
import { GLSL_COMMON, GLSL_CURL } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { createRandom } from '@/components/canvas/opening/weaveGuides';

const _cameraPosition = new THREE.Vector3();

const PATHWAY_SEED = 0x7a71;

/** Reach of a mote's wander, world units. Paired with the drift-speed token below. */
const MOTE_REACH = 2.2;

/** Peak opacity. Ambience is felt, not seen. */
const FIELD_CEILING = 0.42;

const VERTEX = /* glsl */ `
attribute vec3 aSeed;

uniform float uTime;
uniform float uPresence;
uniform float uReach;
uniform float uRate;
uniform float uSizeMin;
uniform float uSizeMax;
uniform float uFadeNear;
uniform float uFadeFar;
uniform float uReduced;

varying float vAlpha;
varying float vTone;

${GLSL_COMMON}
${GLSL_CURL}

void main() {
  vec3 p = position;
  vec3 flow = ogpCurl(p * 0.06 + vec3(aSeed.xy * 5.0, uTime * uRate));
  p += flow * uReach * (1.0 - uReduced);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float depth = -mv.z;

  vTone = aSeed.z;
  vAlpha = uPresence
    * mix(0.25, 1.0, aSeed.z)
    * smoothstep(uFadeNear * 0.4, uFadeNear, depth)
    * (1.0 - smoothstep(uFadeNear, uFadeFar, depth));

  gl_PointSize = mix(uSizeMin, uSizeMax, aSeed.x) * (240.0 / max(depth, 1.0));
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uGoldMuted;
uniform vec3 uGoldDeep;

varying float vAlpha;
varying float vTone;

${GLSL_COMMON}

void main() {
  float falloff = ogpSoftPoint(gl_PointCoord, 1.5);
  float alpha = falloff * vAlpha;
  if (alpha <= 0.0015) discard;

  // The deep end of the gold family only. Nothing here glints; a glint would be an
  // emphasis, and there is nothing in this state that may be emphasised.
  vec3 color = mix(uGoldDeep, uGoldMuted, vTone);
  gl_FragColor = vec4(ogpDeband(color, gl_FragCoord.xy), alpha);
}
`;

/**
 * @param {{
 *   stage: { current: Record<string, number> },
 *   tier: 'HIGH'|'MEDIUM'|'LOW',
 *   settings: { particleScale: number },
 *   reducedMotion: boolean,
 * }} props
 */
export const PathwayField = ({ stage, tier, settings, reducedMotion }) => {
  const groupRef = useRef(null);
  const pointsRef = useRef(null);
  const elapsed = useRef(0);

  const [budget] = useState(() => ({
    count: budgetForTier(ORIGIN_FIELD.particleCount, tier),
    scale: settings.particleScale,
  }));

  const geometry = useMemo(() => {
    const random = createRandom(PATHWAY_SEED);
    const positions = new Float32Array(budget.count * 3);
    const seeds = new Float32Array(budget.count * 3);
    const { innerRadius, outerRadius } = SCENE.pathways;

    for (let i = 0; i < budget.count; i += 1) {
      const i3 = i * 3;
      const u = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const planar = Math.sqrt(Math.max(0, 1 - u * u));
      const radius = innerRadius + Math.cbrt(random()) * (outerRadius - innerRadius);
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
    buffer.boundingSphere = new THREE.Sphere(new THREE.Vector3(), outerRadius * 2);
    return buffer;
  }, [budget.count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(() => {
    const fraction = Math.min(1, settings.particleScale / budget.scale);
    geometry.setDrawRange(0, Math.max(1, Math.floor(budget.count * fraction)));
  }, [geometry, budget, settings.particleScale]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPresence: { value: 0 },
      uReach: { value: MOTE_REACH },
      // Peak speed = reach x rate = the token. The ambience obeys the same drift law as
      // everything else in the build.
      uRate: { value: ORIGIN_FIELD.driftMaxUnitsPerSec / MOTE_REACH },
      uSizeMin: { value: ORIGIN_FIELD.pointSizePx[0] },
      uSizeMax: { value: ORIGIN_FIELD.pointSizePx[1] },
      uFadeNear: { value: SCENE.pathways.innerRadius },
      uFadeFar: { value: SCENE.pathways.outerRadius },
      uReduced: { value: 0 },
      uGoldMuted: { value: new THREE.Color(OGP_COLORS.goldMuted) },
      uGoldDeep: { value: new THREE.Color(OGP_COLORS.goldDeep) },
    }),
    [],
  );

  useEffect(() => {
    uniforms.uReduced.value = reducedMotion ? 1 : 0;
  }, [uniforms, reducedMotion]);

  useFrame((frameState, delta) => {
    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;

    const presence = stage.current.pathways * FIELD_CEILING;
    uniforms.uTime.value = elapsed.current;
    uniforms.uPresence.value = presence;

    const points = pointsRef.current;
    if (points) points.visible = presence > 0.002;

    const group = groupRef.current;
    if (!group || !points?.visible) return;

    // The field surrounds the reader wherever they are standing. It follows the camera
    // exactly: there is no travel in S14, and nothing to give a sense of travel to.
    frameState.camera.getWorldPosition(_cameraPosition);
    const lambda = reducedMotion ? 1e3 : 3 / OGP_MOTION.durations.scene;
    group.position.x = THREE.MathUtils.damp(group.position.x, _cameraPosition.x, lambda, dt);
    group.position.y = THREE.MathUtils.damp(group.position.y, _cameraPosition.y, lambda, dt);
    group.position.z = THREE.MathUtils.damp(group.position.z, _cameraPosition.z, lambda, dt);
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
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

export default PathwayField;
