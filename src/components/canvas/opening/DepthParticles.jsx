/**
 * DepthParticles — S1 Darkness. "The ordinary world disappears."
 *
 * The controlling sentence is a negative one: "Deep black, NOT flat black — layered
 * gradients, atmospheric fog, soft vignette, subtle depth particles" (§2.4.2). A flat fill
 * is a wall; the reader has to be able to feel that there is somewhere to go before there
 * is anything to see. Four layers do that:
 *
 *   1. A full-screen gradient pass: `void-deep` lifted by `void-fog-near` toward the
 *      centre, plus one off-axis lobe so the field is not a symmetrical target.
 *   2. A soft vignette toward `void-vignette` — the ONLY place pure black appears.
 *   3. Per-pixel dither. At these luminances 8-bit quantisation bands visibly across the
 *      whole viewport; B-001 forbids that, so the dither is not optional.
 *   4. Depth motes in `void-particle`, drifting below conscious tracking speed and
 *      trailing the camera, which is what turns the S6 dolly into perceived travel.
 *
 * "Do not brighten the darkness for usability" (§2.3 quality 4): the gradient's whole
 * dynamic range is between #030307 and #06060c.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, OGP_MOTION, PARTICLE_COUNTS, budgetForTier } from '@/config/ogpTheme';
import { GLSL_COMMON, GLSL_CURL } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { STAGE } from '@/components/canvas/shared/stageStore';
import { createRandom } from '@/components/canvas/opening/weaveGuides';

/* -------------------------------------------------------------------------- */
/* Module scope                                                                */
/* -------------------------------------------------------------------------- */

const _cameraPosition = new THREE.Vector3();

/** Seed for the mote distribution. Deterministic, so the reduced-motion still matches. */
const MOTE_SEED = 0x1d0a;

/**
 * How far a mote may wander from its seeded position, in world units. Paired with
 * `driftRate` below so that peak speed never exceeds `OGP_MOTION.driftMaxUnitsPerSec` —
 * amplitude is spatial, the SPEED is the token.
 */
const MOTE_DRIFT_AMPLITUDE = 1.4;

const BACKDROP_VERTEX = /* glsl */ `
varying vec2 vScreenUv;
void main() {
  vScreenUv = uv;
  // A full-screen quad in clip space. The backdrop must be independent of where the
  // camera is, because the camera travels 220 units across the session and the darkness
  // does not travel with it — the darkness IS the room.
  gl_Position = vec4(position.xy * 2.0, 1.0, 1.0);
}
`;

const BACKDROP_FRAGMENT = /* glsl */ `
uniform vec3 uVoidDeep;
uniform vec3 uFogNear;
uniform vec3 uVignette;
uniform float uPresence;
uniform float uAspect;

varying vec2 vScreenUv;

${GLSL_COMMON}

void main() {
  vec2 centred = (vScreenUv - 0.5) * vec2(uAspect, 1.0);
  float radius = length(centred);

  // Layer 1 — the near fog, gathered a little above the optical centre so the frame has
  // a horizon rather than a bullseye.
  float core = 1.0 - smoothstep(0.04, 0.62, length(centred - vec2(0.0, 0.06)));
  // Layer 2 — one quiet off-axis lobe. Asymmetry is what stops the void reading as a lens.
  float lobe = 1.0 - smoothstep(0.1, 0.78, length(centred - vec2(-0.26, -0.2)));

  vec3 color = uVoidDeep;
  color = mix(color, uFogNear, core * 0.85 * uPresence);
  color = mix(color, uFogNear, lobe * 0.3 * uPresence);

  // Layer 3 — the vignette. The only pure black in the experience lives at the edge.
  float vignette = smoothstep(0.42, 0.95, radius);
  color = mix(color, uVignette, vignette * 0.9);

  // Layer 4 — de-band. Sub-LSB noise: invisible as grain, decisive against banding.
  gl_FragColor = vec4(ogpDeband(color, gl_FragCoord.xy), 1.0);
}
`;

const MOTE_VERTEX = /* glsl */ `
attribute vec3 aSeed;

uniform float uTime;
uniform float uPresence;
uniform float uDriftAmplitude;
uniform float uDriftRate;
uniform float uSizeMin;
uniform float uSizeMax;
uniform float uFadeNear;
uniform float uFadeFar;
uniform float uReduced;

varying float vAlpha;

${GLSL_COMMON}
${GLSL_CURL}

void main() {
  vec3 p = position;
  vec3 flow = ogpCurl(p * 0.045 + vec3(aSeed.xy * 6.0, uTime * uDriftRate));
  p += flow * uDriftAmplitude * (1.0 - uReduced);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float depth = -mv.z;

  vAlpha = uPresence
    * mix(0.2, 1.0, aSeed.z)
    * smoothstep(uFadeNear * 0.35, uFadeNear, depth)
    * (1.0 - smoothstep(uFadeNear, uFadeFar, depth));

  gl_PointSize = mix(uSizeMin, uSizeMax, aSeed.x) * (260.0 / max(depth, 1.0));
  gl_Position = projectionMatrix * mv;
}
`;

const MOTE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

${GLSL_COMMON}

void main() {
  float falloff = ogpSoftPoint(gl_PointCoord, 1.4);
  float alpha = falloff * vAlpha;
  if (alpha <= 0.0015) discard;
  gl_FragColor = vec4(ogpDeband(uColor, gl_FragCoord.xy), alpha);
}
`;

/**
 * @param {{
 *   tier: 'HIGH'|'MEDIUM'|'LOW',
 *   settings: { particleScale: number },
 *   reducedMotion: boolean,
 *   aspect: number,
 * }} props
 */
export const DepthParticles = ({ tier, settings, reducedMotion, aspect }) => {
  const backdropRef = useRef(null);
  const backdropMaterialRef = useRef(null);
  const motesRef = useRef(null);
  const motesMaterialRef = useRef(null);
  const followRef = useRef(null);
  const elapsed = useRef(0);

  // Allocated ONCE at the tier detected on first render. `particleScale` thins the field
  // through the draw range instead, so a mid-session downgrade never re-allocates a
  // buffer in front of the reader (`PerformanceContext`: "without re-allocating a buffer").
  const [budget] = useState(() => ({
    count: budgetForTier(PARTICLE_COUNTS.depth, tier),
    scale: settings.particleScale,
  }));

  const geometry = useMemo(() => {
    const random = createRandom(MOTE_SEED);
    const positions = new Float32Array(budget.count * 3);
    const seeds = new Float32Array(budget.count * 3);
    const { innerRadius, outerRadius } = SCENE.depthField;

    for (let i = 0; i < budget.count; i += 1) {
      const i3 = i * 3;
      const u = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const planar = Math.sqrt(Math.max(0, 1 - u * u));
      const radius = innerRadius + Math.cbrt(random()) * (outerRadius - innerRadius);
      positions[i3] = radius * planar * Math.cos(angle);
      positions[i3 + 1] = radius * planar * Math.sin(angle);
      positions[i3 + 2] = radius * u;
      seeds[i3] = random();
      seeds[i3 + 1] = random();
      seeds[i3 + 2] = random();
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    buffer.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3));
    buffer.boundingSphere = new THREE.Sphere(new THREE.Vector3(), outerRadius * 3);
    return buffer;
  }, [budget.count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const backdropUniforms = useMemo(
    () => ({
      uVoidDeep: { value: new THREE.Color(OGP_COLORS.voidDeep) },
      uFogNear: { value: new THREE.Color(OGP_COLORS.voidFogNear) },
      uVignette: { value: new THREE.Color(OGP_COLORS.voidVignette) },
      uPresence: { value: 0 },
      uAspect: { value: 1 },
    }),
    [],
  );

  const moteUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPresence: { value: 0 },
      uColor: { value: new THREE.Color(OGP_COLORS.voidParticle) },
      uDriftAmplitude: { value: MOTE_DRIFT_AMPLITUDE },
      uDriftRate: { value: OGP_MOTION.driftMaxUnitsPerSec / MOTE_DRIFT_AMPLITUDE },
      uSizeMin: { value: 0.6 },
      uSizeMax: { value: 2.0 },
      uFadeNear: { value: SCENE.depthField.innerRadius },
      uFadeFar: { value: SCENE.depthField.outerRadius },
      uReduced: { value: 0 },
    }),
    [],
  );

  // Uniform values are written through the MATERIAL, never through the object that
  // constructed it: the constructed object belongs to the render, the material belongs to
  // the frame loop, and only one of those two is allowed to change after render.
  useEffect(() => {
    const material = motesMaterialRef.current;
    if (material) material.uniforms.uReduced.value = reducedMotion ? 1 : 0;
  }, [reducedMotion]);

  useEffect(() => {
    const material = backdropMaterialRef.current;
    if (material) material.uniforms.uAspect.value = aspect || 1;
  }, [aspect]);

  useEffect(() => {
    const fraction = Math.min(1, settings.particleScale / budget.scale);
    geometry.setDrawRange(0, Math.max(1, Math.floor(budget.count * fraction)));
  }, [geometry, budget, settings.particleScale]);

  useFrame((state, delta) => {
    const presence = STAGE.depth;
    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;

    const backdropMaterial = backdropMaterialRef.current;
    if (backdropMaterial) backdropMaterial.uniforms.uPresence.value = presence;

    const moteMaterial = motesMaterialRef.current;
    if (moteMaterial) {
      moteMaterial.uniforms.uPresence.value = presence;
      moteMaterial.uniforms.uTime.value = elapsed.current;
    }

    if (backdropRef.current) backdropRef.current.visible = presence > 0.001;

    const motes = followRef.current;
    if (!motes) return;
    motes.visible = presence > 0.002;
    if (!motes.visible) return;

    // The field TRAILS the camera rather than riding it. During the S6 dolly the lag is
    // what the reader reads as speed; at rest the field settles and the lag vanishes.
    state.camera.getWorldPosition(_cameraPosition);
    const lambda = reducedMotion ? 1e3 : SCENE.depthField.followLambda;
    motes.position.x = THREE.MathUtils.damp(motes.position.x, _cameraPosition.x, lambda, dt);
    motes.position.y = THREE.MathUtils.damp(motes.position.y, _cameraPosition.y, lambda, dt);
    motes.position.z = THREE.MathUtils.damp(motes.position.z, _cameraPosition.z, lambda, dt);
  });

  return (
    <group>
      <mesh ref={backdropRef} renderOrder={-1000} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={backdropMaterialRef}
          vertexShader={BACKDROP_VERTEX}
          fragmentShader={BACKDROP_FRAGMENT}
          uniforms={backdropUniforms}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <group ref={followRef}>
        <points ref={motesRef} geometry={geometry} frustumCulled={false}>
          <shaderMaterial
            ref={motesMaterialRef}
            vertexShader={MOTE_VERTEX}
            fragmentShader={MOTE_FRAGMENT}
            uniforms={moteUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
      </group>
    </group>
  );
};

export default DepthParticles;
