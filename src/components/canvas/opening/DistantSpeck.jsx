import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { STAGE } from '@/components/canvas/shared/stageStore';

const QUAD_HALF = 3.0;

const CORE_RADIUS = { from: 0.006, to: 0.05 };
const HALO_RADIUS = { from: 0.02, to: 0.3 };
const HALO_AMOUNT = 0.22;

const WANDER_UNITS = 0.05;

const PHASE = Object.freeze({ light: 0.38, movement: 0.72 });

const VERTEX =  `
varying vec2 vQuadUv;
void main() {
  vQuadUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT =  `
uniform vec3 uColor;
uniform float uPresence;
uniform float uCoreRadius;
uniform float uHaloRadius;
uniform float uHaloAmount;

varying vec2 vQuadUv;

${GLSL_COMMON}

void main() {
  float d = length(vQuadUv - 0.5) * 2.0;

  float core = exp(-pow(d / max(uCoreRadius, 1e-4), 2.0));
  float halo = exp(-pow(d / max(uHaloRadius, 1e-4), 1.35)) * uHaloAmount;

  float amount = (core + halo) * uPresence;
  if (amount <= 0.0015) discard;

  gl_FragColor = vec4(ogpDeband(uColor * amount, gl_FragCoord.xy), amount);
}
`;

const asStillSequence = (progress) => {
  const steps = 3;
  const scaled = progress * steps;
  const index = Math.min(steps - 1, Math.floor(scaled));
  const within = scaled - index;
  const blend = THREE.MathUtils.smoothstep(within, 0.66, 1.0);
  return (index + blend) / steps;
};

export const DistantSpeck = ({ running, reducedMotion, onSceneComplete }) => {
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const progress = useRef(0);
  const elapsed = useRef(0);
  const reported = useRef(false);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(OGP_COLORS.goldCore) },
      uPresence: { value: 0 },
      uCoreRadius: { value: CORE_RADIUS.from },
      uHaloRadius: { value: HALO_RADIUS.from },
      uHaloAmount: { value: 0 },
    }),
    [],
  );

  const duration = useMemo(
    () =>
      Math.max(
        OGP_MOTION.durations.scene,
        OGP_TIMING.S2.targetMs / 1000 - OGP_MOTION.durations.scene,
      ),
    [],
  );

  useEffect(() => {
    if (!running) reported.current = false;
  }, [running]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;

    if (running && progress.current < 1) {
      progress.current = Math.min(1, progress.current + dt / duration);
      if (progress.current >= 1 && !reported.current) {
        reported.current = true;
        onSceneComplete?.();
      }
    }

    const raw = progress.current;
    const p = reducedMotion ? asStillSequence(raw) : raw;
    const material = materialRef.current;

    const light = THREE.MathUtils.smoothstep(p, 0, PHASE.light);
    if (material) {
      material.uniforms.uCoreRadius.value = THREE.MathUtils.lerp(
        CORE_RADIUS.from,
        CORE_RADIUS.to,
        light,
      );
      material.uniforms.uHaloRadius.value = THREE.MathUtils.lerp(
        HALO_RADIUS.from,
        HALO_RADIUS.to,
        light,
      );
      material.uniforms.uHaloAmount.value = HALO_AMOUNT * light;
    }

    const structure = THREE.MathUtils.smoothstep(p, PHASE.movement, 1);
    STAGE.speckPhase = p;
    STAGE.speckStructure = structure;

    const presence = STAGE.speck * light * (1 - structure * 0.65);
    if (material) material.uniforms.uPresence.value = presence;

    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.visible = presence > 0.0015;
    if (!mesh.visible) return;

    mesh.quaternion.copy(state.camera.quaternion);

    if (!reducedMotion) {
      const wander = THREE.MathUtils.smoothstep(p, PHASE.light, PHASE.movement) * WANDER_UNITS;
      const t = elapsed.current;
      mesh.position.x = Math.sin(t * 0.11) * wander;
      mesh.position.y = Math.sin(t * 0.079 + 2.2) * wander;
    } else {
      mesh.position.set(0, 0, 0);
    }
  });

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <planeGeometry args={[QUAD_HALF * 2, QUAD_HALF * 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
};

export default DistantSpeck;
