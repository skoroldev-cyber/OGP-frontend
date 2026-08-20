export const WEAVE_ARTWORK = Object.freeze({
  energy: { url: '/brand/weave-energy-1024.webp', low: '/brand/weave-energy-512.webp' },
  base: { url: '/brand/weave-base-1024.webp', low: '/brand/weave-base-512.webp' },
  wide: { url: '/brand/weave-wide-1024.webp', low: '/brand/weave-wide-512.webp' },
});

export function weaveArtworkFor(tier, portrait = false) {
  const small = tier === 'LOW';
  const base = portrait ? WEAVE_ARTWORK.wide : WEAVE_ARTWORK.base;
  return {
    energy: small ? WEAVE_ARTWORK.energy.low : WEAVE_ARTWORK.energy.url,
    base: small ? base.low : base.url,
  };
}

export function buildWeaveField(count, radius) {
  const side = Math.max(8, Math.floor(Math.sqrt(count)));
  const total = side * side;

  const positions = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const seeds = new Float32Array(total);

  const hash = (i) => {
    let x = (i + 1) * 374761393;
    x = (x ^ (x >>> 13)) * 1274126177;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };

  let p = 0;
  let u = 0;

  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const index = y * side + x;

      const jx = (hash(index * 2) - 0.5) * 0.9;
      const jy = (hash(index * 2 + 1) - 0.5) * 0.9;

      const gu = (x + 0.5 + jx) / side;
      const gv = (y + 0.5 + jy) / side;

      uvs[u] = gu;
      uvs[u + 1] = gv;
      u += 2;

      positions[p] = (gu - 0.5) * 2 * radius;
      positions[p + 1] = (0.5 - gv) * 2 * radius;
      positions[p + 2] = 0;
      p += 3;

      seeds[index] = hash(index * 3 + 7);
    }
  }

  return { positions, uvs, seeds, count: total };
}
