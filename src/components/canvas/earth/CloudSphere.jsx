import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_TIERS, OGP_COLORS, OGP_MOTION } from '@/config/ogpTheme';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { useOptionalTexture } from '@/components/canvas/shared/useOptionalTexture';

const CLOUD_ROTATION_RATIO = 1.18;

const CLOUD_OPACITY = 0.72;

const VERTEX =  `
varying vec2 vCloudUv;
varying vec3 vWorldNormal;

void main() {
  vCloudUv = uv;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT =  `
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uSunDirection;
uniform vec3 uCloudColor;
uniform float uAmount;
uniform float uPresence;
uniform float uOpacity;
uniform float uFocus;
uniform float uDrift;

varying vec2 vCloudUv;
varying vec3 vWorldNormal;

${GLSL_COMMON}

void main() {
  vec3 normal = normalize(vWorldNormal);

  float coverage;
  if (uHasMap > 0.5) {
    coverage = texture2D(uMap, vCloudUv).r;
  } else {
    vec3 p = normal * 2.6 + vec3(uDrift, 0.0, 0.0);
    float systems = ogpFbm3(p, 5) * 0.5 + 0.5;
    float bands = 0.5 + 0.5 * sin(normal.y * 7.0 + ogpFbm3(p * 0.8, 3) * 2.2);
    coverage = smoothstep(0.42, 0.86, systems * (0.55 + bands * 0.45));
  }

  float lit = smoothstep(-0.28, 0.38, dot(normal, normalize(uSunDirection)));

  float alpha = coverage * uAmount * uPresence * uOpacity * mix(0.35, 1.0, uFocus);
  if (alpha <= 0.002) discard;

  vec3 color = uCloudColor * mix(0.03, 1.0, lit) * mix(0.5, 1.0, uFocus);
  gl_FragColor = vec4(ogpDeband(color, gl_FragCoord.xy), alpha);
}
`;

export const CloudSphere = ({ layers, tier, reducedMotion }) => {
  const meshRef = useRef(null);
  const elapsed = useRef(0);
  const spec = EARTH_TIERS[tier] ?? EARTH_TIERS.LOW;

  const clouds = useOptionalTexture(`/textures/earth/clouds_${spec.cloudResolutionKey}.webp`, {
    anisotropy: spec.anisotropy,
  });

  const uniforms = useMemo(
    () => ({
      uMap: { value: null },
      uHasMap: { value: 0 },
      uSunDirection: { value: new THREE.Vector3(...SCENE.earth.sunDirection).normalize() },
      uCloudColor: { value: new THREE.Color(OGP_COLORS.readText) },
      uAmount: { value: 0 },
      uPresence: { value: 0 },
      uOpacity: { value: CLOUD_OPACITY },
      uFocus: { value: 1 },
      uDrift: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    uniforms.uMap.value = clouds.texture;
    uniforms.uHasMap.value = clouds.texture ? 1 : 0;
  }, [uniforms, clouds.texture]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;

    uniforms.uAmount.value = layers.current.clouds;
    uniforms.uPresence.value = layers.current.presence;
    uniforms.uFocus.value = layers.current.focus;

    mesh.visible = layers.current.clouds * layers.current.presence > 0.002;
    if (!mesh.visible) return;

    const rate =
      ((Math.PI * 2) / OGP_MOTION.earthRotationPeriodSec) *
      CLOUD_ROTATION_RATIO *
      layers.current.rotationScale;
    mesh.rotation.y += rate * dt;

    if (!reducedMotion) {
      uniforms.uDrift.value += OGP_MOTION.driftMaxUnitsPerSec * dt;
    }
  });

  return (
    <mesh ref={meshRef} renderOrder={2}>
      <sphereGeometry
        args={[SCENE.earth.radius * SCENE.earth.cloudScale, ...spec.cloudSegments]}
      />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

export default CloudSphere;
