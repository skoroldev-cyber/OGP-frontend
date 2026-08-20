import { assetUrl } from '@/config/env';
import { ORIGIN_FIELD } from '@/config/ogpTheme';

export const WEAVE_GUIDE_URL = '/brand/logo2/weave_guides.json';

export const DEFAULT_GUIDE_SPEC = Object.freeze({
  bandCount: 6,
  openingRadius: 0.3,
  bandWidth: 0.13,
  weaveDepth: 0.62,
  weaveCycles: 2,
});

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

export const DEFAULT_SEED = 0x0617;

export const proceduralGuideSource = (spec = DEFAULT_GUIDE_SPEC) => ({
  kind: 'spec',
  spec: { ...DEFAULT_GUIDE_SPEC, ...spec },
  provenance: 'generated:ogp-weave-v1',
});

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

export const loadWeaveGuides = async (url = WEAVE_GUIDE_URL) => {
  try {
    const response = await fetch(assetUrl(url), { credentials: 'omit', cache: 'default' });
    if (!response.ok) return null;
    return guideSourceFromData(await response.json());
  } catch {
    return null;
  }
};

const bandPoint = (spec, bandIndex, theta, across, depthJitter) => {
  const centreDistance = (1 + spec.openingRadius) / 2;
  const bandRadius = (1 - spec.openingRadius) / 2;
  const phi = (bandIndex / spec.bandCount) * Math.PI * 2;

  const cx = centreDistance * Math.cos(phi);
  const cy = centreDistance * Math.sin(phi);
  const r = bandRadius + across * spec.bandWidth;

  const x = cx + r * Math.cos(theta);
  const y = cy + r * Math.sin(theta);

  const weave = Math.sin(spec.weaveCycles * theta + bandIndex * Math.PI);
  const z = weave * spec.weaveDepth * (1 - Math.abs(across) * 0.5) + depthJitter * 0.12;

  const distance = Math.hypot(x, y);
  const radial = Math.min(
    1,
    Math.max(0, (distance - spec.openingRadius) / Math.max(1e-3, 1 - spec.openingRadius)),
  );

  return { x, y, z, radial };
};

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
      const openingAngle = random() * Math.PI * 2;
      const openingRadius = Math.sqrt(random()) * spec.openingRadius * 0.92;
      targets[i3] = Math.cos(openingAngle) * openingRadius;
      targets[i3 + 1] = Math.sin(openingAngle) * openingRadius;
      targets[i3 + 2] = -1 - random() * 2.4;
      band[i] = 0;
      radial[i] = 0;
    }
  }

  return { scatter, targets, seeds, phase, band, radial, provenance: source.provenance };
};

export default sampleGuidePoints;
