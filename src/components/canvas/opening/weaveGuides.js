/**
 * Weave guide splines — DATA, never geometry.
 *
 * §7.4.1 is explicit: "the particle system's guide-spline input must be data, not
 * hardcoded", because Phase 2 replaces the Canonical One Global Logo (Logo 2) with the
 * Living Origin Field (Logo 1) and that must be "an asset/behavior swap, not a
 * re-choreography" (§2.12). So this module is the ONLY place that knows what shape the
 * points converge onto, and it has two inputs of equal standing:
 *
 *   1. `/brand/logo2/weave_guides.json` — the produced asset, when it exists.
 *   2. A deterministic generator, when it does not.
 *
 * The generator is not a placeholder. The corpus does not contain the Design Bible, and
 * "[OPEN QUESTION] which asset file this is" is unresolved at §7.4.1 — so a form is
 * generated that satisfies every stated constraint of Logo 2 (interlaced bands, a clear
 * central opening, over/under weave depth) and can be replaced by the real asset without
 * touching a single component.
 *
 * Everything here is normalised: xy inside the unit disc, z in [-1, 1]. The consumer
 * scales by `SCENE.weave.outerRadius` and `SCENE.weave.bandDepth`, so the guide data
 * carries proportion and the scene carries scale.
 *
 * Determinism is a requirement, not a convenience: reduced motion renders the SAME field
 * as a still, and a still that differs from the animated frame is a visible seam.
 */

import { assetUrl } from '@/config/env';
import { ORIGIN_FIELD } from '@/config/ogpTheme';

/** The produced asset, as listed in `assetManifest.js` OPENING group. */
export const WEAVE_GUIDE_URL = '/brand/logo2/weave_guides.json';

/**
 * The generated form.
 *
 * `bandCount` circles of radius `(1 - openingRadius) / 2`, centred at distance
 * `(1 + openingRadius) / 2` from the origin. Their union is an interlaced rosette whose
 * centre is empty by construction — the opening cannot be closed by a parameter change,
 * which is the point: "the second logo version, with the clearer central opening."
 */
export const DEFAULT_GUIDE_SPEC = Object.freeze({
  bandCount: 6,
  /** Radius of the clear central opening, as a fraction of the outer radius. */
  openingRadius: 0.3,
  /** Strand-cloud thickness across each band. */
  bandWidth: 0.13,
  /** Over/under amplitude, in normalised z. This is what makes it woven, not stacked. */
  weaveDepth: 0.62,
  /** Over/under cycles per band loop. Each band crosses two neighbours, twice each. */
  weaveCycles: 2,
});

/* -------------------------------------------------------------------------- */
/* Determinism                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * mulberry32. Small, fast, and good enough for point seeding — and, unlike `Math.random`,
 * reproducible, so the reduced-motion still and the animated field are the same field.
 *
 * @param {number} seed
 * @returns {() => number} uniform in [0, 1)
 */
export const createRandom = (seed) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Default seed. Changing it re-draws the field; it is a look, so it lives here. */
export const DEFAULT_SEED = 0x0617;

/* -------------------------------------------------------------------------- */
/* Guide sources                                                               */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} GuideSource
 * @property {'spec'|'points'} kind
 * @property {Object} [spec]              generator parameters, for `kind: 'spec'`
 * @property {Float32Array} [points]      flat [x, y, z, radial] quads, for `kind: 'points'`
 * @property {number} [pointCount]
 * @property {string} provenance          where the form came from, for the asset register
 */

/**
 * The generated form as a guide source.
 *
 * @param {Object} [spec]
 * @returns {GuideSource}
 */
export const proceduralGuideSource = (spec = DEFAULT_GUIDE_SPEC) => ({
  kind: 'spec',
  spec: { ...DEFAULT_GUIDE_SPEC, ...spec },
  provenance: 'generated:ogp-weave-v1',
});

/**
 * Interpret a `weave_guides.json` payload. Three accepted shapes, in priority order:
 *
 *   { seeds:   [[x, y, z, radial], ...] }     explicit point seeds (preferred)
 *   { splines: [[[x, y, z], ...], ...] }      polylines, resampled into seeds
 *   { spec:    { bandCount, ... } }           parameters for the generator
 *
 * Anything unrecognised returns `null` and the caller falls back to the generator. A
 * malformed brand asset degrades the picture; it never breaks the opening.
 *
 * @param {any} data
 * @returns {GuideSource|null}
 */
export const guideSourceFromData = (data) => {
  if (!data || typeof data !== 'object') return null;

  if (Array.isArray(data.seeds) && data.seeds.length > 0) {
    const count = data.seeds.length;
    const points = new Float32Array(count * 4);
    for (let i = 0; i < count; i += 1) {
      const entry = data.seeds[i];
      if (!Array.isArray(entry) || entry.length < 3) return null;
      points[i * 4] = Number(entry[0]) || 0;
      points[i * 4 + 1] = Number(entry[1]) || 0;
      points[i * 4 + 2] = Number(entry[2]) || 0;
      points[i * 4 + 3] =
        entry.length > 3 ? Number(entry[3]) || 0 : Math.hypot(Number(entry[0]), Number(entry[1]));
    }
    return { kind: 'points', points, pointCount: count, provenance: `asset:${WEAVE_GUIDE_URL}` };
  }

  if (Array.isArray(data.splines) && data.splines.length > 0) {
    /** @type {number[]} */
    const flat = [];
    for (const spline of data.splines) {
      if (!Array.isArray(spline)) return null;
      for (const point of spline) {
        if (!Array.isArray(point) || point.length < 3) return null;
        const x = Number(point[0]) || 0;
        const y = Number(point[1]) || 0;
        flat.push(x, y, Number(point[2]) || 0, Math.hypot(x, y));
      }
    }
    if (flat.length === 0) return null;
    return {
      kind: 'points',
      points: Float32Array.from(flat),
      pointCount: flat.length / 4,
      provenance: `asset:${WEAVE_GUIDE_URL}`,
    };
  }

  if (data.spec && typeof data.spec === 'object') {
    return { ...proceduralGuideSource(data.spec), provenance: `asset:${WEAVE_GUIDE_URL}` };
  }

  return null;
};

/**
 * Fetch the brand asset. Resolves to `null` on any failure — a 404 here is expected until
 * the Design Bible assets are packaged at Gate 1, and it must cost the reader nothing.
 *
 * @param {string} [url]
 * @returns {Promise<GuideSource|null>}
 */
export const loadWeaveGuides = async (url = WEAVE_GUIDE_URL) => {
  try {
    // `cache: 'default'`, deliberately not `force-cache`.
    //
    // This asset is expected to 404 until the Design Bible artwork is packaged, and
    // `force-cache` treats a cached 404 as a perfectly good answer — so the first visit before
    // the mark shipped would pin the fallback in that browser indefinitely, and the reader
    // would keep seeing the approximation long after the canonical logo was deployed. Normal
    // HTTP caching still avoids the refetch; it just does not make a negative answer permanent.
    const response = await fetch(assetUrl(url), { credentials: 'omit', cache: 'default' });
    if (!response.ok) return null;
    return guideSourceFromData(await response.json());
  } catch {
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/* Sampling                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} WeaveSeeds
 * @property {Float32Array} scatter  initial free-energy positions, 3 per point
 * @property {Float32Array} targets  resolved positions on the guides, 3 per point
 * @property {Float32Array} seeds    per-point randoms, 3 per point
 * @property {Float32Array} phase    convergence stagger, 1 per point
 * @property {Float32Array} band     band index (normalised), 1 per point
 * @property {Float32Array} radial   0 at the opening edge, 1 at the outer edge
 * @property {string} provenance
 */

/**
 * One point on the generated form.
 *
 * @param {Object} spec
 * @param {number} bandIndex
 * @param {number} theta
 * @param {number} across -0.5..0.5 across the band
 * @param {number} depthJitter -0.5..0.5
 * @returns {{ x: number, y: number, z: number, radial: number }}
 */
const bandPoint = (spec, bandIndex, theta, across, depthJitter) => {
  const centreDistance = (1 + spec.openingRadius) / 2;
  const bandRadius = (1 - spec.openingRadius) / 2;
  const phi = (bandIndex / spec.bandCount) * Math.PI * 2;

  const cx = centreDistance * Math.cos(phi);
  const cy = centreDistance * Math.sin(phi);
  const r = bandRadius + across * spec.bandWidth;

  const x = cx + r * Math.cos(theta);
  const y = cy + r * Math.sin(theta);

  // Over/under: adjacent bands are in antiphase, so where two bands meet one is always in
  // front of the other. That alternation is the entire difference between "woven" and
  // "overlapping circles".
  const weave = Math.sin(spec.weaveCycles * theta + bandIndex * Math.PI);
  const z = weave * spec.weaveDepth * (1 - Math.abs(across) * 0.5) + depthJitter * 0.12;

  const distance = Math.hypot(x, y);
  const radial = Math.min(
    1,
    Math.max(0, (distance - spec.openingRadius) / Math.max(1e-3, 1 - spec.openingRadius)),
  );

  return { x, y, z, radial };
};

/**
 * Build the full seed set for a point field.
 *
 * `ORIGIN_FIELD.coherence` (0.85) of the points resolve onto the guides — "at least 85% of
 * particles within emblem silhouette bounds" (§8.6.3). The remainder are seeded INSIDE the
 * opening at receding depth: they are the faint field beyond, and they are the reason the
 * centre can imply "something on the other side" without anything being drawn there
 * (§2.4.5a: "a soft distant light/horizon may show through").
 *
 * @param {GuideSource} source
 * @param {number} count
 * @param {{ seed?: number, coherence?: number }} [options]
 * @returns {WeaveSeeds}
 */
export const sampleGuidePoints = (source, count, options = {}) => {
  const seedValue = options.seed ?? DEFAULT_SEED;
  const coherence = options.coherence ?? ORIGIN_FIELD.coherence;
  const random = createRandom(seedValue);

  const scatter = new Float32Array(count * 3);
  const targets = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const band = new Float32Array(count);
  const radial = new Float32Array(count);

  const spec = source.kind === 'spec' ? source.spec : DEFAULT_GUIDE_SPEC;
  const bound = Math.max(1, Math.floor(count * coherence));

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;

    // ---- free golden energy: where the point begins ----
    // A flattened spheroid a little larger than the form, so the field is already present
    // before it is legible. Energy, then relationship, then form — never the reverse.
    const u = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const shell = Math.cbrt(random()) * 1.75;
    const planar = Math.sqrt(Math.max(0, 1 - u * u));
    scatter[i3] = shell * planar * Math.cos(angle);
    scatter[i3 + 1] = shell * planar * Math.sin(angle);
    scatter[i3 + 2] = shell * u * 0.55;

    seeds[i3] = random();
    seeds[i3 + 1] = random();
    seeds[i3 + 2] = random();
    phase[i] = random();

    if (i < bound) {
      if (source.kind === 'points' && source.points && source.pointCount) {
        // Deterministic stride keeps the asset's own distribution instead of clumping.
        const index = (i * 2654435761) % source.pointCount;
        const p4 = index * 4;
        targets[i3] = source.points[p4];
        targets[i3 + 1] = source.points[p4 + 1];
        targets[i3 + 2] = source.points[p4 + 2];
        band[i] = (index % 8) / 8;
        radial[i] = Math.min(1, Math.max(0, source.points[p4 + 3]));
      } else {
        const bandIndex = i % spec.bandCount;
        const theta = random() * Math.PI * 2;
        const across = random() - 0.5;
        const point = bandPoint(spec, bandIndex, theta, across, random() - 0.5);
        targets[i3] = point.x;
        targets[i3 + 1] = point.y;
        targets[i3 + 2] = point.z;
        band[i] = bandIndex / spec.bandCount;
        radial[i] = point.radial;
      }
    } else {
      // ---- the field beyond the opening ----
      const openingAngle = random() * Math.PI * 2;
      const openingRadius = Math.sqrt(random()) * spec.openingRadius * 0.92;
      targets[i3] = Math.cos(openingAngle) * openingRadius;
      targets[i3 + 1] = Math.sin(openingAngle) * openingRadius;
      // Behind the band plane, receding. Depth is what the centre acquires (§2.4.5a).
      targets[i3 + 2] = -1 - random() * 2.4;
      band[i] = 0;
      // radial 0 marks these for the shader: dimmer, smaller, further away.
      radial[i] = 0;
    }
  }

  return { scatter, targets, seeds, phase, band, radial, provenance: source.provenance };
};

export default sampleGuidePoints;
