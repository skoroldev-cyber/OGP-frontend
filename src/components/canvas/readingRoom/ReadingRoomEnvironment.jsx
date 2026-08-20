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

const ROOM_TEXTURE = '/textures/room/field_gradient.webp';

const ORBIT_PERIOD_SEC = OGP_MOTION.earthRotationPeriodSec * 2.5;

const FIELD_CEILING = 0.55;

const RESIDENCY_FRAMES = 4;

const FIELD_VERTEX =  `
varying vec3 vLocalPosition;
void main() {
  vLocalPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FIELD_FRAGMENT =  `
uniform vec3 uField;
uniform float uPresence;
uniform float uRadius;

varying vec3 vLocalPosition;

${GLSL_COMMON}

void main() {
  float latitude = vLocalPosition.y / max(uRadius, 1e-3);

  float below = 1.0 - smoothstep(-0.05, 0.55, latitude);
  float alpha = below * uPresence;
  if (alpha <= 0.003) discard;

  gl_FragColor = vec4(ogpDeband(uField, gl_FragCoord.xy), alpha);
}
`;

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

    const presence = stage.current.room * (1 - layers.current.recede * 0.45);
    group.visible = presence > 0.003;

    fieldUniforms.uPresence.value = presence * FIELD_CEILING;

    if (presence < 0.02) group.position.set(poseTarget[0], poseTarget[1], poseTarget[2]);

    if (dormantRef.current) {
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
