/**
 * WeavePassage — S6. The one dead itom file that was resurrected rather than deleted.
 *
 * `background/Tunnel.jsx` was an inverted cylinder with a paper texture fading into white
 * fog. The primitive is exactly right and the identity was entirely wrong: same back-side
 * cylinder, same axis, now carrying the weave shader and opening onto Earth instead of
 * onto paper.
 *
 * The five beats of §2.4.7, in order: one slightly stronger pulse (PortalEntry) -> the
 * centre opening brightens -> the camera moves slowly forward (`useGuidedCamera`) -> the
 * bands slowly part, bend and curve around the field of vision -> the central opening
 * expands to fill the screen.
 *
 * "Organic, ceremonial, never mechanical splitting" is a shader property here, not a
 * timing one. The bands' angular position is displaced by a noise field that evolves along
 * the tunnel, so they curve rather than translate; they part by NARROWING, so no band ever
 * has a seam down its middle; and there is no scrolling texture, because a repeating
 * pattern sliding past the camera is the definition of a mechanical tunnel.
 *
 * The far end is transparent. The reader is never inside a closed pipe — Earth is visible
 * through the opening from the first frame of the passage, which is what makes it a
 * passage rather than a transition.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { STATES } from '@/experience/states';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { STAGE } from '@/components/canvas/shared/stageStore';

/** Bands around the circumference. The weave has six; the passage carries them through. */
const BAND_COUNT = 6;

/** Band angular width, as a fraction of a band slot. Parting NARROWS, it never splits. */
const BAND_WIDTH = { closed: 0.66, open: 0.24 };

/** Fraction of the tunnel length over which each end dissolves. No caps, no edges. */
const END_FADE = { far: 0.34, near: 0.72 };

/** Peak angular displacement of the bands by the noise field, in band slots. */
const BEND_AMOUNT = 0.55;

/** Accumulated angular sweep from the near end to the far end, in band slots. */
const SWIRL_AMOUNT = 0.42;

/**
 * When the centre reaches full brightness, as a fraction of the S6 envelope. The scene
 * graphs crossfade across these frames, so no switch is perceptible (§2.4.7).
 */
const BRIGHT_ONSET = 0.55;

const VERTEX = /* glsl */ `
varying vec2 vTunnelUv;
void main() {
  vTunnelUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uGoldCore;
uniform vec3 uGoldPrimary;
uniform vec3 uGoldMuted;
uniform vec3 uGoldDeep;
uniform float uTime;
uniform float uPresence;
uniform float uPart;
uniform float uBright;
uniform float uBandCount;
uniform float uReduced;

varying vec2 vTunnelUv;

${GLSL_COMMON}

void main() {
  // v = 1 at the near end (behind the arriving camera), v = 0 at the far end (Earth).
  float axial = vTunnelUv.y;
  float depth = 1.0 - axial;

  // Bands bend and curve around the field of vision. The displacement is a noise field
  // sampled along the tunnel, so the curve is organic and never resolves into a helix.
  float bend = ogpSnoise(vec3(depth * 2.3, uTime * 0.06, 0.0)) * ${BEND_AMOUNT.toFixed(3)};
  float swirl = depth * ${SWIRL_AMOUNT.toFixed(3)};
  float slot = vTunnelUv.x * uBandCount + bend + swirl;

  // Distance from the centre-line of the nearest band, 0..1.
  float across = abs(fract(slot) - 0.5) * 2.0;
  float width = mix(${BAND_WIDTH.closed.toFixed(3)}, ${BAND_WIDTH.open.toFixed(3)}, uPart);
  float mask = 1.0 - smoothstep(width * 0.32, width, across);

  // Both ends dissolve. The far end is open onto Earth from the first frame.
  float ends = smoothstep(0.0, ${END_FADE.far.toFixed(3)}, axial)
             * (1.0 - smoothstep(${END_FADE.near.toFixed(3)}, 1.0, axial));

  // Living grain along the strands — the same restrained glinting as the weave itself.
  float grain = ogpFbm2(vec2(vTunnelUv.x * 9.0, depth * 6.0 + uTime * 0.04 * (1.0 - uReduced)));

  vec3 color = mix(uGoldDeep, uGoldMuted, smoothstep(0.0, 0.6, mask));
  color = mix(color, uGoldPrimary, smoothstep(0.45, 1.0, mask));
  color = mix(color, uGoldCore, pow(mask, 3.0) * (0.22 + uBright * 0.4));

  float amount = mask * ends * (0.55 + grain * 0.45);

  // The fully-bright centre frames: the far opening floods with gold-core so the scene
  // graphs can cross over inside the light rather than at a cut.
  float flood = (1.0 - smoothstep(0.0, 0.42, axial)) * uBright;
  color = mix(color, uGoldCore, clamp(flood, 0.0, 1.0));
  amount += flood * 0.45;

  amount *= uPresence;
  if (amount <= 0.0015) discard;

  gl_FragColor = vec4(ogpDeband(color * amount, gl_FragCoord.xy), amount);
}
`;

/**
 * @param {{
 *   state: string,
 *   reducedMotion: boolean,
 *   onSceneComplete?: () => void,
 * }} props
 */
export const WeavePassage = ({ state, reducedMotion, onSceneComplete }) => {
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const elapsed = useRef(0);
  const reported = useRef(false);

  const uniforms = useMemo(
    () => ({
      uGoldCore: { value: new THREE.Color(OGP_COLORS.goldCore) },
      uGoldPrimary: { value: new THREE.Color(OGP_COLORS.goldPrimary) },
      uGoldMuted: { value: new THREE.Color(OGP_COLORS.goldMuted) },
      uGoldDeep: { value: new THREE.Color(OGP_COLORS.goldDeep) },
      uTime: { value: 0 },
      uPresence: { value: 0 },
      uPart: { value: 0 },
      uBright: { value: 0 },
      uBandCount: { value: BAND_COUNT },
      uReduced: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    const material = materialRef.current;
    if (material) material.uniforms.uReduced.value = reducedMotion ? 1 : 0;
  }, [reducedMotion]);

  useEffect(() => {
    if (state !== STATES.S6_WEAVE_PASSAGE) reported.current = false;
  }, [state]);

  /** The passage occupies its whole score window: 2–4 s (§2.4.7), from `OGP_TIMING`. */
  const passageSeconds = useMemo(
    () => Math.max(OGP_MOTION.durations.scene, OGP_TIMING.S6.targetMs / 1000),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;
    uniforms.uTime.value = elapsed.current;

    const inPassage = state === STATES.S6_WEAVE_PASSAGE;
    const progress = inPassage
      ? Math.min(1, STAGE.stateElapsed / passageSeconds)
      : uniforms.uPart.value;

    if (inPassage) {
      uniforms.uPart.value = progress;
      uniforms.uBright.value = THREE.MathUtils.smoothstep(progress, BRIGHT_ONSET, 1);

      // The passage reports its own completion. Under reduced motion there is no travel
      // to finish, so the same clock releases the state — the still sequence must reach
      // Earth exactly as reliably as the animated one does.
      if (!reported.current && STAGE.stateElapsed >= passageSeconds) {
        reported.current = true;
        onSceneComplete?.();
      }
    }

    // Published for the S6 crossfade: Experience trades the weave for Earth across the
    // frames where the centre is brightest, so there is nothing to see the switch by.
    STAGE.passageBright = uniforms.uBright.value;

    const presence = STAGE.passage;
    uniforms.uPresence.value = presence;
    const mesh = meshRef.current;
    if (mesh) mesh.visible = presence > 0.0015;
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, SCENE.passage.centerZ]}
      rotation={[Math.PI / 2, 0, 0]}
      frustumCulled={false}
      renderOrder={1}
    >
      <cylinderGeometry
        args={[
          SCENE.passage.radius,
          SCENE.passage.radius,
          SCENE.passage.length,
          SCENE.passage.radialSegments,
          SCENE.passage.heightSegments,
          true,
        ]}
      />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
};

export default WeavePassage;
