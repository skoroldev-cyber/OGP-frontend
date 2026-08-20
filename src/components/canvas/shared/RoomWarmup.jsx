import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OGP_TIMING } from '@/config/ogpTheme';
import { SCENE } from '@/components/canvas/shared/sceneLayout';

const TARGET_FRAMES = { standard: 3, low: 1 };

export const RoomWarmup = ({ onComplete, isLowTier = false, children }) => {
  const { gl, scene, camera } = useThree();
  const [done, setDone] = useState(false);

  const frameCount = useRef(0);
  const fired = useRef(false);
  const completed = useRef(false);

  const release = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    setDone(true);
    onComplete?.();
  }, [onComplete]);

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

    if (isLowTier || typeof gl.compileAsync !== 'function') {
      if (!isLowTier && typeof gl.compile === 'function') gl.compile(scene, camera);
      requestAnimationFrame(release);
      return;
    }

    gl.compileAsync(scene, camera, scene)
      .then(() => requestAnimationFrame(release))
      .catch(() => {
        try {
          gl.compile(scene, camera);
        } catch {
          void 0;
        }
        requestAnimationFrame(release);
      });
  });

  if (done || isLowTier) return null;

  return <group position={[0, SCENE.warmupY, 0]}>{children}</group>;
};

export default RoomWarmup;
