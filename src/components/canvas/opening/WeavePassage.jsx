import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { STATES } from '@/experience/states';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { STAGE } from '@/components/canvas/shared/stageStore';

const BAND_COUNT = 6;

const BAND_WIDTH = { closed: 0.66, open: 0.24 };

const END_FADE = { far: 0.34, near: 0.72 };

const BEND_AMOUNT = 0.55;

const SWIRL_AMOUNT = 0.42;

const BRIGHT_ONSET = 0.55;

const VERTEX =  `
varying vec2 vTunnelUv;
void main() {
  vTunnelUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT =  `
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
  float axial = vTunnelUv.y;
  float depth = 1.0 - axial;

  float bend = ogpSnoise(vec3(depth * 2.3, uTime * 0.06, 0.0)) * ${BEND_AMOUNT.toFixed(3)};
  float swirl = depth * ${SWIRL_AMOUNT.toFixed(3)};
  float slot = vTunnelUv.x * uBandCount + bend + swirl;

  float across = abs(fract(slot) - 0.5) * 2.0;
  float width = mix(${BAND_WIDTH.closed.toFixed(3)}, ${BAND_WIDTH.open.toFixed(3)}, uPart);
  float mask = 1.0 - smoothstep(width * 0.32, width, across);

  float ends = smoothstep(0.0, ${END_FADE.far.toFixed(3)}, axial)
             * (1.0 - smoothstep(${END_FADE.near.toFixed(3)}, 1.0, axial));

  float grain = ogpFbm2(vec2(vTunnelUv.x * 9.0, depth * 6.0 + uTime * 0.04 * (1.0 - uReduced)));

  vec3 color = mix(uGoldDeep, uGoldMuted, smoothstep(0.0, 0.6, mask));
  color = mix(color, uGoldPrimary, smoothstep(0.45, 1.0, mask));
  color = mix(color, uGoldCore, pow(mask, 3.0) * (0.22 + uBright * 0.4));

  float amount = mask * ends * (0.55 + grain * 0.45);

  float flood = (1.0 - smoothstep(0.0, 0.42, axial)) * uBright;
  color = mix(color, uGoldCore, clamp(flood, 0.0, 1.0));
  amount += flood * 0.45;

  amount *= uPresence;
  if (amount <= 0.0015) discard;

  gl_FragColor = vec4(ogpDeband(color * amount, gl_FragCoord.xy), amount);
}
`;

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

      if (!reported.current && STAGE.stateElapsed >= passageSeconds) {
        reported.current = true;
        onSceneComplete?.();
      }
    }

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
