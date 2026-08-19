/**
 * PortalEntry — S5. "The reader does not click 'enter' like a normal button.
 * The reader crosses a threshold."
 *
 * Two movements, one gesture: the strand spline radii ease OUTWARD while the camera
 * dollies in (§7.4.1). Because the aperture is a uniform on the shared weave material, the
 * whole band travels — nothing splits, nothing stretches, nothing hinges. The opening
 * widens the way a pupil widens.
 *
 * Plus "one slightly stronger pulse" and "the centre brightens" — the brightening is a
 * broad Gaussian at the weave centre, wide enough that it never has an edge and never
 * reads as an object. It is the light on the other side becoming visible through an
 * opening that was always there.
 *
 * The camera is NOT written here. `useGuidedCamera` owns it for the whole session, which
 * is why the dolly and the aperture can be simultaneous without either one fighting the
 * other for `camera.position` (§7.6 ownership law).
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { OGP_COLORS, OGP_MOTION } from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';
import { SCENE } from '@/components/canvas/shared/sceneLayout';
import { STAGE } from '@/components/canvas/shared/stageStore';

/** The glow quad spans the opening with room to spare, so its edge is never on screen. */
const GLOW_HALF = SCENE.weave.openingRadius * 2.6;

/** Gaussian radius as a fraction of `GLOW_HALF`, from dormant to fully open. */
const GLOW_RADIUS = { from: 0.14, to: 0.62 };

/** Peak brightness. Restrained: "the centre brightens", not "the centre flashes". */
const GLOW_CEILING = 0.4;

/** How much stronger the S5 heartbeat is than an idle one. */
const PULSE_BOOST = 0.55;

const VERTEX = /* glsl */ `
varying vec2 vQuadUv;
void main() {
  vQuadUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uAmount;
uniform float uRadius;

varying vec2 vQuadUv;

${GLSL_COMMON}

void main() {
  float d = length(vQuadUv - 0.5) * 2.0;
  float glow = exp(-pow(d / max(uRadius, 1e-4), 1.8));
  float amount = glow * uAmount;
  if (amount <= 0.0015) discard;
  gl_FragColor = vec4(ogpDeband(uColor * amount, gl_FragCoord.xy), amount);
}
`;

/**
 * @param {{
 *   state: string,
 *   reducedMotion: boolean,
 *   controlRef: { current: any },
 * }} props
 */
export const PortalEntry = ({ state, reducedMotion, controlRef }) => {
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  const aperture = useRef({ value: 0 });
  const tween = useRef(null);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(OGP_COLORS.goldCore) },
      uAmount: { value: 0 },
      uRadius: { value: GLOW_RADIUS.from },
    }),
    [],
  );

  useEffect(() => {
    const index = stateIndex(state);
    if (index < stateIndex(STATES.S5_PORTAL_ENTRY)) return undefined;
    if (state !== STATES.S5_PORTAL_ENTRY) return undefined;

    // One slightly stronger pulse marks the threshold. It is a beat of the same heart,
    // not a new sound: the envelope, the colour and the ceiling are unchanged.
    controlRef?.current?.pulseOnce?.(reducedMotion ? PULSE_BOOST * 0.5 : PULSE_BOOST);

    // Reduced motion keeps this state "nearly still" (§2.4.6 fallback): the aperture still
    // opens, but over the long threshold duration and with no camera travel beside it.
    tween.current?.kill();
    tween.current = gsap.to(aperture.current, {
      value: 1,
      duration: reducedMotion
        ? OGP_MOTION.durations.threshold * 1.5
        : OGP_MOTION.durations.threshold,
      ease: OGP_MOTION.ease,
      overwrite: 'auto',
    });

    return () => {
      tween.current?.kill();
      tween.current = null;
    };
  }, [state, reducedMotion, controlRef]);

  useFrame((frameState) => {
    const open = aperture.current.value;

    // The aperture lives on the weave material: one field, one opening, no second copy of
    // the geometry that could drift out of register with the first.
    controlRef?.current?.setAperture?.(open * SCENE.weave.apertureTravel);

    STAGE.portalOpen = open;

    const amount = STAGE.portal * GLOW_CEILING * THREE.MathUtils.smoothstep(open, 0, 0.85);
    const material = materialRef.current;
    if (material) {
      material.uniforms.uAmount.value = amount;
      material.uniforms.uRadius.value = THREE.MathUtils.lerp(
        GLOW_RADIUS.from,
        GLOW_RADIUS.to,
        open,
      );
    }

    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.visible = amount > 0.0015;
    if (mesh.visible) mesh.quaternion.copy(frameState.camera.quaternion);
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={2}>
      <planeGeometry args={[GLOW_HALF * 2, GLOW_HALF * 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
};

export default PortalEntry;
