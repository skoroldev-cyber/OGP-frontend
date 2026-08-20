import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OGP_COLORS, PARTICLE_COUNTS, budgetForTier } from '@/config/ogpTheme';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { createRandom } from '@/components/canvas/opening/weaveGuides';

const _cameraPosition = new THREE.Vector3();

const STAR_SEED = 0x51a4;

const STAR_SIZE_PX = { min: 0.9, max: 1.9 };

const STAR_CEILING = 0.55;

const VERTEX =  `
attribute vec3 aSeed;

uniform float uPresence;
uniform float uSizeMin;
uniform float uSizeMax;
uniform float uPixelRatio;

varying float vAlpha;
varying float vHue;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);

  float magnitude = aSeed.z * aSeed.z;
  vAlpha = uPresence * mix(0.22, 1.0, magnitude);
  vHue = aSeed.x;

  gl_PointSize = mix(uSizeMin, uSizeMax, magnitude) * uPixelRatio;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAGMENT =  `
uniform vec3 uWarm;
uniform vec3 uCool;

varying float vAlpha;
varying float vHue;

${GLSL_COMMON}

void main() {
  float falloff = ogpSoftPoint(gl_PointCoord, 1.1);
  float alpha = falloff * vAlpha;
  if (alpha <= 0.002) discard;

  vec3 color = mix(uWarm, uCool, vHue);
  gl_FragColor = vec4(ogpDeband(color, gl_FragCoord.xy), alpha);
}
`;

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
