/**
 * A texture that is allowed to be missing.
 *
 * drei's `useTexture` suspends and then THROWS on a 404, which would surface as an error
 * boundary — the one thing the opening may never do. The whole asset pipeline is built on
 * "MISSING ASSETS ARE NON-FATAL ... a 404 must degrade the picture, never block the
 * pipeline or surface an error to a reader" (`assetManifest.js`), and §2.4.4's fallback
 * says a missing asset means the experience proceeds with what it has.
 *
 * So: no Suspense, no throw, no checkerboard. The hook reports `settled` when the network
 * has finished having an opinion, and `texture` is simply `null` when the file is absent.
 * Every consumer branches on that and draws a procedurally shaded alternative honouring
 * the colour law.
 */

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { assetUrl } from '@/config/env';

/** One loader for the whole canvas: three's loaders are stateless and cheap to share. */
const loader = new THREE.TextureLoader();

/**
 * @typedef {Object} OptionalTexture
 * @property {THREE.Texture|null} texture
 * @property {boolean} settled true once the request has resolved OR failed
 */

/**
 * @param {string|null|undefined} url absolute `/public` path; CDN prefix applied here
 * @param {{ colorSpace?: string, anisotropy?: number, repeat?: [number, number] }} [options]
 * @returns {OptionalTexture}
 */
export const useOptionalTexture = (url, options = {}) => {
  const { colorSpace = THREE.SRGBColorSpace, anisotropy = 1 } = options;
  const repeatX = options.repeat?.[0] ?? 0;
  const repeatY = options.repeat?.[1] ?? 0;

  const [result, setResult] = useState({ texture: null, settled: !url });

  useEffect(() => {
    if (!url) return undefined;

    let cancelled = false;
    /** @type {THREE.Texture|null} */
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
        // Deliberately swallowed. The picture degrades; the reader is never told.
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
