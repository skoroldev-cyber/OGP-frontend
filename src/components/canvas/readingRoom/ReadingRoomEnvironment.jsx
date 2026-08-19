/**
 * ReadingRoomEnvironment — the room forms AROUND Earth and orbits it.
 *
 * "The Reading Room is not the destination. Earth is the destination." (§2.4.8) So the
 * room is not a place the reader is taken to; it is a quiet enclosure that assembles
 * around what they are already looking at, centred on Earth and turning slowly about it.
 *
 * "Quieter, not more elaborate" (§2.2, min 1.5–3) is the whole specification, and it is
 * expressed as a subtraction: one hazed field below the horizon, one hairline ring, and
 * nothing else. The room has no furniture, no architecture and no detail to notice —
 * because §8.1.8 says the environment "gradually removes everything unnecessary until the
 * words, the reader, and the truth remain", and the only way to end there is to start
 * close to it.
 *
 * The room's arrival uses the re-themed itom reveal: a DORMANT surface in front of a
 * LUMINOUS twin (`X.webp` + `X_glow.webp`, §8.9), the front one discarding along a noisy
 * boundary with a warm edge. It is the same machinery that revealed painted doors in a
 * paper-white portfolio, doing the only thing this build ever asks of it — dark becoming
 * light.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, OGP_MOTION } from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { useOptionalTexture } from '@/components/canvas/shared/useOptionalTexture';
import { glowTwin } from '@/components/canvas/shaders/LuminousRevealMaterial';
import '@/components/canvas/shaders/LuminousRevealMaterial';

/** The dormant room surface. Its `_glow` twin is derived, never listed twice. */
const ROOM_TEXTURE = '/textures/room/field_gradient.webp';

/**
 * The room orbits Earth more slowly than Earth turns. Earth is the centre of the system
 * in every sense, including this one.
 */
const ORBIT_PERIOD_SEC = OGP_MOTION.earthRotationPeriodSec * 2.5;

/** Peak haze below the horizon. The field is a suggestion of ground, not a floor. */
const FIELD_CEILING = 0.55;

/** Frames of successful rendering before the room declares its materials resident. */
const RESIDENCY_FRAMES = 4;

const FIELD_VERTEX = /* glsl */ `
varying vec3 vLocalPosition;
void main() {
  vLocalPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FIELD_FRAGMENT = /* glsl */ `
uniform vec3 uField;
uniform float uPresence;
uniform float uRadius;

varying vec3 vLocalPosition;

${GLSL_COMMON}

void main() {
  // Latitude on the shell: +1 overhead, -1 underfoot.
  float latitude = vLocalPosition.y / max(uRadius, 1e-3);

  // The field gathers below the horizon and releases entirely above it, so the stars
  // overhead are never veiled. A room with a lid would be a set; this is an enclosure.
  float below = 1.0 - smoothstep(-0.05, 0.55, latitude);
  float alpha = below * uPresence;
  if (alpha <= 0.003) discard;

  gl_FragColor = vec4(ogpDeband(uField, gl_FragCoord.xy), alpha);
}
`;

/**
 * @param {{
 *   stage: { current: Record<string, number> },
 *   layers: { current: Record<string, number> },
 *   state: string,
 *   poseTarget: readonly number[],
 *   reducedMotion: boolean,
 *   onReady?: () => void,
 * }} props
 */
export const ReadingRoomEnvironment = ({
  stage,
  layers,
  state,
  poseTarget,
  reducedMotion,
  onReady,
}) => {
  const groupRef = useRef(null);
  const orbitRef = useRef(null);
  const fieldRef = useRef(null);
  const dormantRef = useRef(null);
  const ringRef = useRef(null);
  const elapsed = useRef(0);
  const residency = useRef(0);
  const readyReported = useRef(false);

  const dormant = useOptionalTexture(ROOM_TEXTURE);
  const luminous = useOptionalTexture(glowTwin(ROOM_TEXTURE));

  const fieldUniforms = useMemo(
    () => ({
      uField: { value: new THREE.Color(OGP_COLORS.readField) },
      uPresence: { value: 0 },
      uRadius: { value: SCENE.room.radius },
    }),
    [],
  );

  const surfaceColor = useMemo(() => new THREE.Color(OGP_COLORS.readSurface), []);
  const ruleColor = useMemo(() => new THREE.Color(OGP_COLORS.readRule), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;

    // The room quietens further as the manuscript takes authority — it is already the
    // least elaborate thing in the scene, and it keeps giving ground.
    const presence = stage.current.room * (1 - layers.current.recede * 0.45);
    group.visible = presence > 0.003;

    fieldUniforms.uPresence.value = presence * FIELD_CEILING;

    // The room encloses Earth. It is placed, never flown: at S9 the veil is closed, and
    // after that the pose never changes.
    if (presence < 0.02) group.position.set(poseTarget[0], poseTarget[1], poseTarget[2]);

    if (dormantRef.current) {
      // The room "forms": the dormant surface discards to expose its luminous twin.
      // Under reduced motion the same reveal happens as a slow dissolve — the boundary
      // still travels, it simply has nothing beside it that moves.
      const seconds = reducedMotion
        ? OGP_MOTION.durations.threshold
        : OGP_MOTION.durations.passage;
      const wanted = stateIndex(state) >= stateIndex(STATES.S9_READING_ROOM_INIT) ? 1 : 0;
      dormantRef.current.progress = THREE.MathUtils.damp(
        dormantRef.current.progress,
        wanted,
        3 / seconds,
        dt,
      );
    }

    if (ringRef.current) {
      ringRef.current.material.opacity = presence * 0.5;
    }

    if (!group.visible) return;

    // One slow orbit about Earth. Under reduced motion it holds still: the room is a
    // still composition too, not merely a slower one.
    const orbit = orbitRef.current;
    if (orbit && !reducedMotion) {
      orbit.rotation.y += ((Math.PI * 2) / ORBIT_PERIOD_SEC) * dt;
    }

    if (!readyReported.current) {
      residency.current += 1;
      if (residency.current >= RESIDENCY_FRAMES) {
        readyReported.current = true;
        onReady?.();
      }
    }
  });

  useEffect(() => {
    const field = fieldRef.current;
    return () => field?.geometry?.dispose?.();
  }, []);

  return (
    <group ref={groupRef} position={[SCENE.earth.world[0], SCENE.earth.world[1], SCENE.earth.world[2]]}>
      {/* The hazed field below the horizon. */}
      <mesh ref={fieldRef} renderOrder={-400}>
        <sphereGeometry args={[SCENE.room.radius, 48, 32]} />
        <shaderMaterial
          vertexShader={FIELD_VERTEX}
          fragmentShader={FIELD_FRAGMENT}
          uniforms={fieldUniforms}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <group ref={orbitRef}>
        {/* The luminous twin, waiting behind. */}
        <mesh renderOrder={-360}>
          <cylinderGeometry
            args={[SCENE.room.radius, SCENE.room.radius, SCENE.room.height, 64, 1, true]}
          />
          <meshBasicMaterial
            map={luminous.texture ?? undefined}
            color={surfaceColor}
            side={THREE.BackSide}
            transparent
            opacity={0.5}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>

        {/* The dormant surface in front of it, discarding along a noisy, warm-edged
            boundary. `X.webp` -> `X_glow.webp`: the itom convention, re-pointed. */}
        <mesh renderOrder={-350}>
          <cylinderGeometry
            args={[
              SCENE.room.radius * 0.995,
              SCENE.room.radius * 0.995,
              SCENE.room.height,
              64,
              1,
              true,
            ]}
          />
          <luminousRevealMaterial
            ref={dormantRef}
            map={dormant.texture ?? undefined}
            color={surfaceColor}
            side={THREE.BackSide}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>

        {/* One hairline. A landmark, not a decoration. */}
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-340}>
          <ringGeometry args={[SCENE.room.horizonRadius, SCENE.room.horizonRadius * 1.002, 128]} />
          <meshBasicMaterial
            color={ruleColor}
            side={THREE.DoubleSide}
            transparent
            opacity={0}
            depthWrite={false}
            fog={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
};

export default ReadingRoomEnvironment;
