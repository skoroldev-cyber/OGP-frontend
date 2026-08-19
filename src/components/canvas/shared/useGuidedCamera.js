/**
 * useGuidedCamera — the §7.6 camera choreography table, executable.
 *
 * | States  | Behaviour                                                                  |
 * |---------|----------------------------------------------------------------------------|
 * | S0–S4   | Static. Micro-drift only (+/-0.02 units, slow noise) for a quiet sense of depth |
 * | S5      | Slow dolly through the aperture                                            |
 * | S6      | Axis dolly through the resurrected tunnel, pointer parallax at 0.15        |
 * | S7      | ONE slow approach curve. "Like a soul approaching home, not a drone flying |
 * |         | toward a planet." Earth stays whole. No orbiting.                          |
 * | S8–S9   | Veil closes -> instant reposition -> veil opens. Never a hard cut.          |
 * | S10–S13 | Static + slow parallax observation. "The reader is not manipulating Earth." |
 * | S14     | Static + slow parallax                                                     |
 *
 * ARCHITECTURE. GSAP never writes the camera. It tweens a plain pose object, and a single
 * `useFrame` composes pose + drift + parallax into the camera every frame. That is what
 * makes "pointer parallax at 0.15 DURING the S6 dolly" expressible at all, and it removes
 * the entire class of bug where two systems write `camera.position` in one frame — which
 * is how a hard cut gets into an experience that forbids them.
 *
 * OWNERSHIP. The itom handshake is law and runs in both directions: this hook calls
 * `setCameraOverride(true)` before the first write of a guided travel and `(false)` after
 * the last, and it early-returns its own writes whenever another owner holds the camera.
 * When a foreign owner releases, the hook re-syncs its pose from the PHYSICAL camera and
 * blends the rotation in over a short window — itom's soft resume, so there is no snap.
 *
 * REDUCED MOTION. Every path collapses to one still composition. The camera never moves,
 * there is no drift and no parallax; the scene changes around a fixed frame instead. That
 * is a complete alternative, not a degradation (§8.3.4, B-006).
 *
 * GYROSCOPE. Deliberately not implemented. Gyro parallax is post-S7 only and the iOS
 * motion-permission prompt "must never appear during S0–S7" (§2.11); a prompt needs a user
 * gesture the opening does not have, so the quiet choice is to not ask.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { SCENE } from '@/components/canvas/shared/sceneLayout';

/* -------------------------------------------------------------------------- */
/* Module scope — nothing below is ever allocated inside useFrame              */
/* -------------------------------------------------------------------------- */

const _position = new THREE.Vector3();
const _target = new THREE.Vector3();
const _releaseQuaternion = new THREE.Quaternion();
const _blendQuaternion = new THREE.Quaternion();

const EARTH = SCENE.earth.world;

/**
 * The pose table. Each entry is where the camera rests at the END of that segment, and
 * what it is looking at. Framing consequences are documented in `sceneLayout.js`.
 */
const POSES = Object.freeze({
  /** S0–S4: the arriving pose. The weave fills the frame; Earth is a speck inside it. */
  opening: { position: [0, 0.2, 28], target: [0, 0, 0] },
  /** S5: dollied into the widening aperture, still outside the weave plane. */
  aperture: { position: [0, 0.2, 18], target: [0, 0, -24] },
  /** S6: deep inside the passage, Earth ahead. */
  passage: { position: [0, 0.2, -162], target: [EARTH[0], EARTH[1], EARTH[2]] },
  /** S7: arrived. Earth whole, ~45 deg of a 60 deg frame, with space around it. */
  earth: { position: [0, 1.0, -166], target: [EARTH[0], EARTH[1], EARTH[2]] },
  /** S9+: eased back a little so the manuscript surface has room. Set behind the veil. */
  room: { position: [0, 1.6, -160], target: [EARTH[0], EARTH[1], EARTH[2]] },
});

/** The approach curve's control point — the arc that keeps S7 from being a straight line. */
const APPROACH_CONTROL = [1.3, 0.7, -164.4];

/** Frames over which a released foreign override is blended back in (itom used 30). */
const SOFT_RESUME_FRAMES = 30;

/**
 * Which pose a state rests at, and how it gets there.
 *
 * @param {string} state
 * @returns {{ pose: string, motion: 'hold'|'dolly'|'approach'|'instant' }}
 */
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

/**
 * Seconds a guided travel takes. All four numbers are `OGP_TIMING`/`OGP_MOTION` tokens:
 * "Animation timings are CONFIGURATION, not constants" (`ogpTheme.js`).
 *
 * @param {string} state
 * @returns {number}
 */
const travelSeconds = (state) => {
  if (state === STATES.S5_PORTAL_ENTRY) return OGP_MOTION.durations.threshold;
  if (state === STATES.S6_WEAVE_PASSAGE) return OGP_TIMING.S6.targetMs / 1000;
  // S7's approach occupies the reveal, leaving the threshold duration as the fermata that
  // follows it: reveal-and-HOLD, in that order (§2.4.8).
  if (state === STATES.S7_EARTH_REVEAL) {
    return Math.max(
      OGP_MOTION.durations.scene,
      OGP_TIMING.S7.targetMs / 1000 - OGP_MOTION.durations.threshold,
    );
  }
  return OGP_MOTION.durations.scene;
};

/**
 * Parallax intensity for a state. Never during the first reveal: "The first reveal must be
 * guided — no user control at first."
 *
 * @param {string} state
 * @returns {number}
 */
const parallaxFor = (state) => {
  if (state === STATES.S6_WEAVE_PASSAGE) return OGP_MOTION.passageParallaxIntensity;
  if (stateIndex(state) >= stateIndex(STATES.S10_OPENING_ARC_READING)) {
    return OGP_MOTION.parallaxIntensity;
  }
  return 0;
};

/**
 * Micro-drift amplitude. S0–S4 only: a "quiet sense of depth" while nothing else moves.
 *
 * @param {string} state
 * @returns {number}
 */
const driftFor = (state) => {
  const index = stateIndex(state);
  return index >= 0 && index <= stateIndex(STATES.S4_LIVING_WEAVE)
    ? OGP_MOTION.cameraDriftUnits
    : 0;
};

/**
 * @param {{
 *   state: string,
 *   reducedMotion: boolean,
 *   setCameraOverride: (owned: boolean) => void,
 *   cameraOverrideRef: { current: boolean },
 *   enabled?: boolean,
 * }} options
 */
export const useGuidedCamera = ({
  state,
  reducedMotion,
  setCameraOverride,
  cameraOverrideRef,
  enabled = true,
}) => {
  const { camera, invalidate } = useThree();

  /** The tweened pose. GSAP writes here and nowhere else. */
  const pose = useRef({
    px: POSES.opening.position[0],
    py: POSES.opening.position[1],
    pz: POSES.opening.position[2],
    tx: POSES.opening.target[0],
    ty: POSES.opening.target[1],
    tz: POSES.opening.target[2],
  });

  /** S7 only: a quadratic arc rather than a straight dolly. */
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

  /** Copy the PHYSICAL camera into the pose — the first half of itom's soft resume. */
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

  /* ---- pointer ------------------------------------------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    /** @param {PointerEvent} event */
    const onPointerMove = (event) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
      // Under `frameloop="demand"` nothing would redraw for a pointer move; ask for one
      // frame, but only while parallax is actually wanted.
      if (targets.current.parallax > 0) invalidate();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [invalidate]);

  /* ---- choreography --------------------------------------------------- */
  useEffect(() => {
    if (!enabled || !state) return undefined;

    const segment = segmentFor(state);

    // Reduced motion: one still composition for the whole session. No travel, ever.
    const destination = reducedMotion ? POSES.opening : POSES[segment.pose];
    const motion = reducedMotion ? 'instant' : segment.motion;

    // Nothing to do when the pose is unchanged — a `hold` that re-runs would restage the
    // camera mid-state, and restaging is exactly the visible machinery that is forbidden.
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

    // A first mount, a veil reposition (S8->S9), or reduced motion: place, do not travel.
    // The veil is closed across the S9 reposition, so the reader sees a fade, not a cut.
    if (first || motion === 'instant' || motion === 'hold') {
      settle();
      return undefined;
    }

    // ---- a guided travel: claim the camera before the first write ----
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
      // ONE slow approach curve. `easeEnter` (power1.out) arrives and settles; it never
      // accelerates into the planet, which is what separates a soul from a drone.
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

    // A dolly along the axis. `sine.inOut` leaves rest and returns to rest, so S6 hands
    // the camera to S7 with zero velocity and the approach begins from stillness.
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

  /* ---- composition ---------------------------------------------------- */
  useFrame((_, delta) => {
    if (!enabled) return;

    const foreign = cameraOverrideRef?.current === true && !weOwn.current;

    // Another owner holds the camera: write nothing (itom law).
    if (foreign) {
      foreignOwner.current = true;
      return;
    }

    // ...and when they release it, resume from where they left the camera, not from where
    // we last thought it was. Soft resume: no snap.
    if (foreignOwner.current) {
      foreignOwner.current = false;
      syncFromCamera();
      _releaseQuaternion.copy(camera.quaternion);
      blendFrames.current = SOFT_RESUME_FRAMES;
    }

    const dt = Math.min(delta, 0.1);
    elapsed.current += dt;

    // Amplitudes are damped, never switched: parallax and drift fade in and out rather
    // than appearing and disappearing at a state boundary.
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

    // Two incommensurable sine terms: continuous, never periodic enough to read as a loop.
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
      // Compute what lookAt WOULD do, then ease into it from the rotation the previous
      // owner left behind — itom's blend-in, transplanted.
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
