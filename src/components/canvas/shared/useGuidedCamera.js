import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { SCENE } from '@/components/canvas/shared/sceneLayout';

const _position = new THREE.Vector3();
const _target = new THREE.Vector3();
const _releaseQuaternion = new THREE.Quaternion();
const _blendQuaternion = new THREE.Quaternion();

const EARTH = SCENE.earth.world;

const POSES = Object.freeze({
  opening: { position: [0, 0.2, 28], target: [0, 0, 0] },
  aperture: { position: [0, 0.2, 18], target: [0, 0, -24] },
  passage: { position: [0, 0.2, -162], target: [EARTH[0], EARTH[1], EARTH[2]] },
  earth: { position: [0, 1.0, -166], target: [EARTH[0], EARTH[1], EARTH[2]] },
  room: { position: [0, 1.6, -160], target: [EARTH[0], EARTH[1], EARTH[2]] },
});

const APPROACH_CONTROL = [1.3, 0.7, -164.4];

const SOFT_RESUME_FRAMES = 30;

const segmentFor = (state) => {
  const index = stateIndex(state);
  if (index < 0) return { pose: 'opening', motion: 'hold' };
  if (index <= stateIndex(STATES.S4_LIVING_WEAVE)) return { pose: 'opening', motion: 'hold' };
  if (state === STATES.S5_PORTAL_ENTRY) return { pose: 'aperture', motion: 'dolly' };
  if (state === STATES.S6_WEAVE_PASSAGE) return { pose: 'passage', motion: 'dolly' };
  if (state === STATES.S7_EARTH_REVEAL) return { pose: 'earth', motion: 'approach' };
  if (state === STATES.S8_READING_ROOM_INVITATION) return { pose: 'earth', motion: 'hold' };
  return { pose: 'room', motion: 'instant' };
};

const travelSeconds = (state) => {
  if (state === STATES.S5_PORTAL_ENTRY) return OGP_MOTION.durations.threshold;
  if (state === STATES.S6_WEAVE_PASSAGE) return OGP_TIMING.S6.targetMs / 1000;
  if (state === STATES.S7_EARTH_REVEAL) {
    return Math.max(
      OGP_MOTION.durations.scene,
      OGP_TIMING.S7.targetMs / 1000 - OGP_MOTION.durations.threshold,
    );
  }
  return OGP_MOTION.durations.scene;
};

const parallaxFor = (state) => {
  if (state === STATES.S6_WEAVE_PASSAGE) return OGP_MOTION.passageParallaxIntensity;
  if (stateIndex(state) >= stateIndex(STATES.S10_OPENING_ARC_READING)) {
    return OGP_MOTION.parallaxIntensity;
  }
  return 0;
};

const driftFor = (state) => {
  const index = stateIndex(state);
  return index >= 0 && index <= stateIndex(STATES.S4_LIVING_WEAVE)
    ? OGP_MOTION.cameraDriftUnits
    : 0;
};

export const useGuidedCamera = ({
  state,
  reducedMotion,
  setCameraOverride,
  cameraOverrideRef,
  enabled = true,
}) => {
  const { camera, invalidate } = useThree();

  const pose = useRef({
    px: POSES.opening.position[0],
    py: POSES.opening.position[1],
    pz: POSES.opening.position[2],
    tx: POSES.opening.target[0],
    ty: POSES.opening.target[1],
    tz: POSES.opening.target[2],
  });

  const approach = useRef({ u: 0, active: false });
  const approachCurve = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...POSES.passage.position),
        new THREE.Vector3(...APPROACH_CONTROL),
        new THREE.Vector3(...POSES.earth.position),
      ),
    [],
  );

  const timeline = useRef(null);
  const weOwn = useRef(false);
  const lastPose = useRef(null);

  const pointer = useRef({ x: 0, y: 0 });
  const parallax = useRef({ x: 0, y: 0 });
  const amplitude = useRef({ parallax: 0, drift: 0 });
  const targets = useRef({ parallax: 0, drift: 0 });

  const elapsed = useRef(0);
  const foreignOwner = useRef(false);
  const blendFrames = useRef(0);

  targets.current.parallax = reducedMotion || !enabled ? 0 : parallaxFor(state);
  targets.current.drift = reducedMotion || !enabled ? 0 : driftFor(state);

  const syncFromCamera = useCallback(() => {
    pose.current.px = camera.position.x - parallax.current.x - amplitude.current.drift;
    pose.current.py = camera.position.y - parallax.current.y;
    pose.current.pz = camera.position.z;
    camera.getWorldDirection(_target);
    _target.multiplyScalar(20).add(camera.position);
    pose.current.tx = _target.x;
    pose.current.ty = _target.y;
    pose.current.tz = _target.z;
  }, [camera]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onPointerMove = (event) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
      if (targets.current.parallax > 0) invalidate();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [invalidate]);

  useEffect(() => {
    if (!enabled || !state) return undefined;

    const segment = segmentFor(state);

    const destination = reducedMotion ? POSES.opening : POSES[segment.pose];
    const motion = reducedMotion ? 'instant' : segment.motion;

    const poseKey = reducedMotion ? 'opening' : segment.pose;
    const first = lastPose.current === null;
    if (!first && lastPose.current === poseKey) return undefined;
    lastPose.current = poseKey;

    timeline.current?.kill();
    timeline.current = null;
    approach.current.active = false;

    const settle = () => {
      pose.current.px = destination.position[0];
      pose.current.py = destination.position[1];
      pose.current.pz = destination.position[2];
      pose.current.tx = destination.target[0];
      pose.current.ty = destination.target[1];
      pose.current.tz = destination.target[2];
      invalidate();
    };

    if (first || motion === 'instant' || motion === 'hold') {
      settle();
      return undefined;
    }

    weOwn.current = true;
    setCameraOverride(true);

    const duration = travelSeconds(state);
    const release = () => {
      weOwn.current = false;
      setCameraOverride(false);
      approach.current.active = false;
      timeline.current = null;
    };

    if (motion === 'approach') {
      approach.current.u = 0;
      approach.current.active = true;
      timeline.current = gsap.timeline({ onComplete: release });
      timeline.current
        .to(approach.current, {
          u: 1,
          duration,
          ease: OGP_MOTION.easeEnter,
          onUpdate: invalidate,
        })
        .to(
          pose.current,
          {
            tx: destination.target[0],
            ty: destination.target[1],
            tz: destination.target[2],
            duration,
            ease: OGP_MOTION.ease,
          },
          0,
        );
      return () => {
        timeline.current?.kill();
        timeline.current = null;
        if (weOwn.current) release();
      };
    }

    timeline.current = gsap.timeline({ onComplete: release });
    timeline.current.to(pose.current, {
      px: destination.position[0],
      py: destination.position[1],
      pz: destination.position[2],
      tx: destination.target[0],
      ty: destination.target[1],
      tz: destination.target[2],
      duration,
      ease: OGP_MOTION.ease,
      onUpdate: invalidate,
    });

    return () => {
      timeline.current?.kill();
      timeline.current = null;
      if (weOwn.current) release();
    };
  }, [state, reducedMotion, enabled, setCameraOverride, invalidate]);

  useEffect(
    () => () => {
      timeline.current?.kill();
      timeline.current = null;
      if (weOwn.current) {
        weOwn.current = false;
        setCameraOverride(false);
      }
    },
    [setCameraOverride],
  );

  useFrame((_, delta) => {
    if (!enabled) return;

    const foreign = cameraOverrideRef?.current === true && !weOwn.current;

    if (foreign) {
      foreignOwner.current = true;
      return;
    }

    if (foreignOwner.current) {
      foreignOwner.current = false;
      syncFromCamera();
      _releaseQuaternion.copy(camera.quaternion);
      blendFrames.current = SOFT_RESUME_FRAMES;
    }

    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;

    const lambda = 3 / OGP_MOTION.durations.scene;
    amplitude.current.parallax = THREE.MathUtils.damp(
      amplitude.current.parallax,
      targets.current.parallax,
      lambda,
      dt,
    );
    amplitude.current.drift = THREE.MathUtils.damp(
      amplitude.current.drift,
      targets.current.drift,
      lambda,
      dt,
    );

    parallax.current.x = THREE.MathUtils.damp(
      parallax.current.x,
      pointer.current.x * amplitude.current.parallax,
      lambda,
      dt,
    );
    parallax.current.y = THREE.MathUtils.damp(
      parallax.current.y,
      -pointer.current.y * amplitude.current.parallax * 0.5,
      lambda,
      dt,
    );

    const t = elapsed.current;
    const driftX = (Math.sin(t * 0.17) + Math.sin(t * 0.29 + 1.7)) * 0.5;
    const driftY = (Math.sin(t * 0.13 + 0.6) + Math.sin(t * 0.23 + 3.1)) * 0.5;
    const drift = amplitude.current.drift;

    if (approach.current.active) {
      approachCurve.getPoint(approach.current.u, _position);
    } else {
      _position.set(pose.current.px, pose.current.py, pose.current.pz);
    }
    _position.x += driftX * drift + parallax.current.x;
    _position.y += driftY * drift + parallax.current.y;
    camera.position.copy(_position);

    _target.set(pose.current.tx, pose.current.ty, pose.current.tz);
    _target.x += parallax.current.x * 0.35;
    _target.y += parallax.current.y * 0.35;

    if (blendFrames.current > 0) {
      camera.lookAt(_target);
      _blendQuaternion.copy(camera.quaternion);
      const factor = 1 - blendFrames.current / SOFT_RESUME_FRAMES;
      camera.quaternion.copy(_releaseQuaternion).slerp(_blendQuaternion, factor);
      blendFrames.current -= 1;
    } else {
      camera.lookAt(_target);
    }
  });
};

export default useGuidedCamera;
