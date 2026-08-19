/**
 * DistantSpeck — S2. "Life appears before identity." Recognition 1: "Something is here."
 *
 * ONE warm point in the centre distance. The prohibitions are sharper than the
 * requirements: it "must not behave like a logo animation" (B-003) and, on low tiers,
 * "never a scaling bitmap (reads as logo animation)" (§2.4.3 fallback).
 *
 * So there is no sprite. The point is a Gaussian core plus one soft halo evaluated
 * analytically in the fragment shader on a camera-facing quad. Nothing is being scaled;
 * a falloff radius is growing, which is what light does when it becomes perceptible. There
 * is no resolution at which it resolves into an image, and no pixel grid to betray it.
 *
 * The perceptual order is enforced structurally, not by timing alone (§2.4.3, §8.1.2 —
 * "Order of noticing is always: light -> movement -> structure"):
 *
 *   light      brightness and the falloff radius grow. The point does not move.
 *   movement   a sub-pixel wander begins. Brightness holds.
 *   structure  `speckStructure` rises, which is the ONLY thing that lets the Living Weave
 *              field begin. Structure cannot precede movement because nothing else writes
 *              that value.
 *
 * Prohibited and absent: impacts, flashes, countdowns, glitter, exploding particles,
 * lens flares. The halo has no spikes, no rings and no chromatic separation.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { STAGE } from '@/components/canvas/shared/stageStore';

/** Half-width of the billboard, in world units. The quad is a canvas, not the point. */
const QUAD_HALF = 3.0;

/**
 * Falloff radii as a fraction of `QUAD_HALF`. From the S0–S4 camera pose the core begins
 * at roughly half a pixel and ends at roughly four — sub-pixel growth, literally.
 */
const CORE_RADIUS = { from: 0.006, to: 0.05 };
const HALO_RADIUS = { from: 0.02, to: 0.3 };
const HALO_AMOUNT = 0.22;

/** Peak lateral wander, world units. About one and a half pixels at the arriving pose. */
const WANDER_UNITS = 0.05;

/** Phase boundaries of the locked perceptual order. */
const PHASE = Object.freeze({ light: 0.38, movement: 0.72 });

const VERTEX = /* glsl */ `
varying vec2 vQuadUv;
void main() {
  vQuadUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uPresence;
uniform float uCoreRadius;
uniform float uHaloRadius;
uniform float uHaloAmount;

varying vec2 vQuadUv;

${GLSL_COMMON}

void main() {
  float d = length(vQuadUv - 0.5) * 2.0;

  // A Gaussian core and one wide, gentle shoulder. Two terms, both monotonic: there is no
  // parameter here that could produce a ring, a spike or a starburst.
  float core = exp(-pow(d / max(uCoreRadius, 1e-4), 2.0));
  float halo = exp(-pow(d / max(uHaloRadius, 1e-4), 1.35)) * uHaloAmount;

  float amount = (core + halo) * uPresence;
  if (amount <= 0.0015) discard;

  gl_FragColor = vec4(ogpDeband(uColor * amount, gl_FragCoord.xy), amount);
}
`;

/**
 * Reduced motion renders the same arc as "a crossfade of three stills (point -> faint
 * field -> coherent field)" (§2.4.3 fallback): three plateaus joined by slow dissolves,
 * rather than a continuous ramp. Same destination, no continuous motion to track.
 *
 * @param {number} progress 0..1
 * @returns {number}
 */
const asStillSequence = (progress) => {
  const steps = 3;
  const scaled = progress * steps;
  const index = Math.min(steps - 1, Math.floor(scaled));
  const within = scaled - index;
  // Each still holds, then dissolves across the last third of its slot.
  const blend = THREE.MathUtils.smoothstep(within, 0.66, 1.0);
  return (index + blend) / steps;
};

/**
 * @param {{
 *   running: boolean,
 *   reducedMotion: boolean,
 *   onSceneComplete?: () => void,
 * }} props
 */
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

  // The emergence occupies the S2 window, finishing one scene-duration before the score's
  // ceiling so the machine leaves on the scene's signal rather than on its escape guard.
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

    // ---- light ----
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

    // ---- structure ----
    // The field cannot begin before this rises, and nothing else raises it.
    const structure = THREE.MathUtils.smoothstep(p, PHASE.movement, 1);
    STAGE.speckPhase = p;
    STAGE.speckStructure = structure;

    // The point does not vanish when the weave arrives; it is absorbed by it, which is
    // why the transformation chain reads as one thing becoming another.
    const presence = STAGE.speck * light * (1 - structure * 0.65);
    if (material) material.uniforms.uPresence.value = presence;

    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.visible = presence > 0.0015;
    if (!mesh.visible) return;

    // A true billboard: the quad is never seen edge-on, whatever the camera is doing.
    mesh.quaternion.copy(state.camera.quaternion);

    // ---- movement ----
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
