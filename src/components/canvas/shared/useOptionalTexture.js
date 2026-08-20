import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { assetUrl } from '@/config/env';

const loader = new THREE.TextureLoader();

export const useOptionalTexture = (url, options = {}) => {
  const { colorSpace = THREE.SRGBColorSpace, anisotropy = 1 } = options;
  const repeatX = options.repeat?.[0] ?? 0;
  const repeatY = options.repeat?.[1] ?? 0;

  const [result, setResult] = useState({ texture: null, settled: !url });

  useEffect(() => {
    if (!url) return undefined;

    let cancelled = false;
    let owned = null;

    loader.load(
      assetUrl(url),
      (texture) => {
        if (cancelled) {
          texture.dispose();
          return;
        }
        texture.colorSpace = colorSpace;
        texture.anisotropy = anisotropy;
        if (repeatX > 0 && repeatY > 0) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(repeatX, repeatY);
        }
        owned = texture;
        setResult({ texture, settled: true });
      },
      undefined,
      () => {
        if (!cancelled) setResult({ texture: null, settled: true });
      },
    );

    return () => {
      cancelled = true;
      if (owned) owned.dispose();
    };
  }, [url, colorSpace, anisotropy, repeatX, repeatY]);

  return result;
};

export default useOptionalTexture;
