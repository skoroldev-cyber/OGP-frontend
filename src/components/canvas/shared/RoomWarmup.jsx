/**
 * RoomWarmup — itom's warm-up idiom, preserved.
 *
 * Heavy materials are mounted 500 units below the scene, rendered for a few frames to
 * force program compilation and texture upload, compiled with `gl.compileAsync`, then
 * unmounted. The reader never sees them; what the reader gets is the S3 resolve, the S6
 * passage and the S7 reveal arriving with "no frame > 50 ms" (§2.14 budget).
 *
 * Three departures from itom, each required by OGP law:
 *
 *   1. **The gate is ALWAYS released.** A hard 8 s ceiling (`OGP_TIMING.warmupCeilingMs`)
 *      fires regardless of what the GPU is doing. A slow device breathes longer in the
 *      darkness — which the score explicitly permits — but it never hangs, and there is
 *      no loading machinery for it to hang behind (§0.6, §2.14).
 *   2. **LOW tier mounts nothing and compiles nothing.** itom bypassed `compileAsync` on
 *      low-end devices to avoid WebGL Context Lost; here the duplicate materials are not
 *      mounted either, because the OGP scene is one continuous graph whose materials are
 *      already resident — a second copy would buy nothing and risk the context.
 *   3. **Contents are injected.** itom hard-coded four rooms. This component knows nothing
 *      about what it is warming; `Experience` decides, which is what lets the warm-up set
 *      track the scene instead of drifting from it.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OGP_TIMING } from '@/config/ogpTheme';
import { SCENE } from '@/components/canvas/shared/sceneLayout';

/** itom's frame counts: compile at frame 3, or after a single frame on LOW. */
const TARGET_FRAMES = { standard: 3, low: 1 };

/**
 * @param {{
 *   onComplete?: () => void,
 *   isLowTier?: boolean,
 *   children?: React.ReactNode,
 * }} props
 */
export const RoomWarmup = ({ onComplete, isLowTier = false, children }) => {
  const { gl, scene, camera } = useThree();
  const [done, setDone] = useState(false);

  const frameCount = useRef(0);
  const fired = useRef(false);
  const completed = useRef(false);

  /** Idempotent: the ceiling and the compile can both arrive; only the first counts. */
  const release = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    setDone(true);
    onComplete?.();
  }, [onComplete]);

  // The gate that never sticks. Mounted before the first frame is even counted, so a
  // device that cannot render at all still reaches S2.
  useEffect(() => {
    const timer = window.setTimeout(release, OGP_TIMING.warmupCeilingMs);
    return () => window.clearTimeout(timer);
  }, [release]);

  useFrame(() => {
    if (fired.current || completed.current) return;

    frameCount.current += 1;
    const target = isLowTier ? TARGET_FRAMES.low : TARGET_FRAMES.standard;
    if (frameCount.current < target) return;

    fired.current = true;

    // LOW: skip compilation entirely. A context loss here would cost the whole
    // experience; a first-frame hitch costs one frame.
    if (isLowTier || typeof gl.compileAsync !== 'function') {
      if (!isLowTier && typeof gl.compile === 'function') gl.compile(scene, camera);
      // One more frame before unmounting, so the compiled programs are actually used once.
      requestAnimationFrame(release);
      return;
    }

    gl.compileAsync(scene, camera, scene)
      .then(() => requestAnimationFrame(release))
      .catch(() => {
        // Async compilation is an optimisation, not a contract. Fall back to the
        // synchronous path rather than letting a rejected promise strand the gate.
        try {
          gl.compile(scene, camera);
        } catch {
          // Nothing further to try; the ceiling would have released us anyway.
        }
        requestAnimationFrame(release);
      });
  });

  if (done || isLowTier) return null;

  return <group position={[0, SCENE.warmupY, 0]}>{children}</group>;
};

export default RoomWarmup;
