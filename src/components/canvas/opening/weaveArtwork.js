/**
 * The Living Weave, driven by the canonical artwork.
 *
 * §2.5 governs this file: the weave "always [emerges] from energy relationships, never a placed
 * graphic", strictly "Energy → relationship → form". The obvious way to honour that is a
 * procedural particle field that happens to end up looking like the logo — and it is the wrong
 * way, because it ends up looking *approximately* like the logo. The mark is canon (§8.6); an
 * approximation of canon is not canon.
 *
 * So the points are sampled from the artwork itself. Each point owns a fixed UV on the mark;
 * the shader reads that pixel, keeps the point if the artwork is luminous there, and takes its
 * colour from the artwork's own gold. What converges over S3 is therefore literally the logo
 * assembling out of light — "innumerable living points beginning to reveal relationship" — and
 * the resolved form is exact rather than evocative.
 *
 * Three source assets, from the founder's logo set:
 *
 *   `weave-energy`  the Living Energy Weave — the same woven form rendered as luminous point
 *                   networks. This is what the field samples, so the emerging energy has the
 *                   artwork's own filament structure rather than an invented one.
 *   `weave-base`    the Canonical One Global Logo — the tightest weave with the clearest
 *                   central opening, which is exactly the variant §2.12 asks for ("the second
 *                   logo version, with the clearer central opening"). It resolves behind the
 *                   points across S3–S4 so the form becomes solid and dimensional.
 *   `weave-wide`    a softer, wider variant with a larger opening, used for portrait framing
 *                   where the 9:16 safe margins want a broader mark (§2.11).
 *
 * Vertex texture fetch is used to read the artwork in the vertex shader. It is core in WebGL2
 * and universally available on the tiers this experience targets; the LOW-tier path reduces the
 * point count rather than abandoning the technique, so every tier sees the same mark.
 */

/** The artwork, at the two sizes the pipeline ships. */
export const WEAVE_ARTWORK = Object.freeze({
  energy: { url: '/brand/weave-energy-1024.webp', low: '/brand/weave-energy-512.webp' },
  base: { url: '/brand/weave-base-1024.webp', low: '/brand/weave-base-512.webp' },
  wide: { url: '/brand/weave-wide-1024.webp', low: '/brand/weave-wide-512.webp' },
});

/**
 * Choose the artwork variant and resolution for a tier and viewport.
 *
 * @param {'HIGH'|'MEDIUM'|'LOW'} tier Device tier.
 * @param {boolean} [portrait] True when the viewport is taller than it is wide.
 * @returns {{ energy: string, base: string }} Asset URLs.
 */
export function weaveArtworkFor(tier, portrait = false) {
  const small = tier === 'LOW';
  const base = portrait ? WEAVE_ARTWORK.wide : WEAVE_ARTWORK.base;
  return {
    energy: small ? WEAVE_ARTWORK.energy.low : WEAVE_ARTWORK.energy.url,
    base: small ? base.low : base.url,
  };
}

/**
 * A square grid of sample points over the artwork.
 *
 * The grid is jittered by a deterministic hash rather than `Math.random()`: an identical field
 * every run means a visual regression is a real change rather than a reroll, and it keeps the
 * warm-up frame identical to the frame that follows it.
 *
 * Each point carries:
 *   `position`  its home position on the mark, in world units
 *   `aUv`       where to read the artwork
 *   `aSeed`     a stable per-point random, for drift phase and pulse offset
 *
 * @param {number} count Requested point count; the real count is the nearest square.
 * @param {number} radius World radius the mark spans.
 * @returns {{ positions: Float32Array, uvs: Float32Array, seeds: Float32Array, count: number }}
 */
export function buildWeaveField(count, radius) {
  const side = Math.max(8, Math.floor(Math.sqrt(count)));
  const total = side * side;

  const positions = new Float32Array(total * 3);
  const uvs = new Float32Array(total * 2);
  const seeds = new Float32Array(total);

  // A cheap deterministic hash. Two points that are neighbours on the grid get unrelated
  // seeds, which is what keeps the drift from reading as a wave.
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

      // Jitter inside the cell so the grid never reads as a grid.
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
