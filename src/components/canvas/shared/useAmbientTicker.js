import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export const useAmbientTicker = ({ active = true, fps = 0 } = {}) => {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!active || !fps || fps <= 0) return undefined;

    invalidate();
    const interval = window.setInterval(invalidate, Math.max(1, Math.round(1000 / fps)));
    return () => window.clearInterval(interval);
  }, [active, fps, invalidate]);

  return invalidate;
};

export default useAmbientTicker;
