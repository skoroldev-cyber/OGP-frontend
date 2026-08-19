#!/usr/bin/env node
/**
 * Derive the Living Weave guide seeds from the canonical logo artwork.
 *
 * §7.4.1 requires the particle system's guide input to be **data, not hardcoded geometry**, so
 * that Phase 2 can swap in the Living Origin Field without touching the choreography. The
 * runtime already honours that: `weaveGuides.js` fetches `/brand/logo2/weave_guides.json` and
 * falls back to a procedural approximation when it is absent.
 *
 * Until now only the fallback existed, which meant the mark the reader saw resolve was an
 * approximation of the logo rather than the logo. §8.6 makes the Canonical One Global Logo
 * canon; an approximation of canon is not canon. This script closes that gap by sampling the
 * founder's artwork directly, so the points converge onto the real mark — including the clear
 * central opening §2.12 specifically asks for.
 *
 * Method:
 *   1. Decode the artwork and read its luminance.
 *   2. Keep pixels where the weave actually is, with a floor that rejects the black field.
 *   3. Weight the sampling by luminance so the bright band faces carry more points than the
 *      shadow sides — the field inherits the artwork's own dimensionality.
 *   4. Classify each point as band or opening by its radius, so the runtime can recede the
 *      centre without splitting anything (`radial` > 0 means band).
 *   5. Emit unit-space seeds in the `{ seeds: [[x, y, z, radial], ...] }` shape the runtime
 *      prefers, which it scales by `SCENE.weave.outerRadius`.
 *
 * Deterministic: the same artwork always produces the same file, so a visual change is a real
 * change rather than a reroll.
 *
 * Usage:
 *   node scripts/build-weave-guides.mjs [--source=<png|jpg|webp>] [--count=9000]
 *
 * @module scripts/build-weave-guides
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const REPO = path.resolve(FRONTEND, '..');

/** sharp lives in the reference codebase; this script is a design-time tool, not a dependency. */
let sharp;
try {
  sharp = require(path.join(REPO, 'portfolio-itom-main', 'node_modules', 'sharp'));
} catch {
  try {
    sharp = require('sharp');
  } catch {
    console.error(
      '\nThis script needs `sharp` to decode the artwork.\n' +
        '  It is a design-time tool: install sharp, or run it from a checkout that has it.\n',
    );
    process.exit(2);
  }
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

if (args.help) {
  console.log(
    'build-weave-guides — derive Living Weave guide seeds from the canonical logo\n\n' +
      '  --source=<path>  artwork to sample (default: public/brand/weave-base-1024.webp)\n' +
      '  --count=<n>      target seed count (default 9000)\n' +
      '  --out=<path>     output JSON (default: public/brand/logo2/weave_guides.json)\n',
  );
  process.exit(0);
}

const SOURCE = args.source
  ? path.resolve(process.cwd(), String(args.source))
  : path.join(FRONTEND, 'public', 'brand', 'weave-base-1024.webp');
const OUT = args.out
  ? path.resolve(process.cwd(), String(args.out))
  : path.join(FRONTEND, 'public', 'brand', 'logo2', 'weave_guides.json');
const TARGET_COUNT = Number(args.count ?? 9000);

/** Below this luminance the pixel is the black field, not the mark. */
const LUMINANCE_FLOOR = 0.08;
/** Radius (in unit space) inside which a point belongs to the opening rather than a band. */
const OPENING_RADIUS = 0.3;

if (!fs.existsSync(SOURCE)) {
  console.error(`\nNo artwork at ${SOURCE}\n`);
  process.exit(2);
}

const SAMPLE_SIZE = 512;

const { data, info } = await sharp(SOURCE)
  .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 1 } })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;

/* -------------------------------------------------------------------------- */
/* Collect candidate pixels                                                    */
/* -------------------------------------------------------------------------- */

/** @type {{ x: number, y: number, lum: number }[]} */
const candidates = [];
let maxLum = 0;

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const i = (y * width + x) * channels;
    const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    if (lum < LUMINANCE_FLOOR) continue;

    // Unit space, centred, y up.
    const ux = (x + 0.5) / width - 0.5;
    const uy = 0.5 - (y + 0.5) / height;
    // The artwork is a disc; anything outside it is padding from the contain-fit.
    if (Math.hypot(ux, uy) > 0.5) continue;

    candidates.push({ x: ux * 2, y: uy * 2, lum });
    if (lum > maxLum) maxLum = lum;
  }
}

if (candidates.length === 0) {
  console.error('\nThe artwork yielded no luminous pixels. Is it the right image?\n');
  process.exit(3);
}

/* -------------------------------------------------------------------------- */
/* Weighted, deterministic selection                                           */
/* -------------------------------------------------------------------------- */

// A deterministic hash keyed on position: the same artwork always selects the same points,
// and neighbouring pixels get unrelated draws so the selection never reads as a pattern.
const hash = (a, b) => {
  let h = Math.imul(a * 73856093, 1) ^ Math.imul(b * 19349663, 1);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const stride = Math.max(1, candidates.length / TARGET_COUNT);
const seeds = [];

for (let i = 0; i < candidates.length; i += 1) {
  const c = candidates[i];
  // Luminance-weighted acceptance: the lit faces of the bands carry more points than the
  // shadow sides, so the resolved field has the artwork's own depth rather than a flat mask.
  const weight = c.lum / maxLum;
  const draw = hash(Math.round(c.x * 10000), Math.round(c.y * 10000));
  if (draw > (1 / stride) * (0.45 + 0.55 * weight)) continue;

  const radius = Math.hypot(c.x, c.y);
  // `radial > 0` marks a band point; 0 marks the opening. The runtime uses this to recede the
  // centre into depth rather than splitting the bands apart (§2.4.5, C-001).
  const radial = radius > OPENING_RADIUS ? radius : 0;

  // A little dimensional spread, weighted by luminance: brighter faces sit nearer the viewer.
  const z = (weight - 0.5) * 0.22;

  seeds.push([
    Number(c.x.toFixed(4)),
    Number(c.y.toFixed(4)),
    Number(z.toFixed(4)),
    Number(radial.toFixed(4)),
  ]);
}

/* -------------------------------------------------------------------------- */

const bandCount = seeds.filter((s) => s[3] > 0).length;
const payload = {
  $comment:
    'Generated by scripts/build-weave-guides.mjs from the canonical One Global Logo artwork. ' +
    'Do not hand-edit — regenerate from the source image so the mark stays canonical.',
  source: path.relative(FRONTEND, SOURCE).replace(/\\/g, '/'),
  generatedFrom: 'Canonical One Global Logo (Logo 2) — the variant with the clearer central opening',
  seedCount: seeds.length,
  seeds,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(payload), 'utf8');

const size = fs.statSync(OUT).size;
console.log(`
Living Weave guides
  source     ${path.relative(FRONTEND, SOURCE).replace(/\\/g, '/')}
  candidates ${candidates.length.toLocaleString()} luminous pixels
  seeds      ${seeds.length.toLocaleString()}  (${bandCount.toLocaleString()} band, ${(seeds.length - bandCount).toLocaleString()} opening)
  written    ${path.relative(FRONTEND, OUT).replace(/\\/g, '/')}  ${(size / 1024).toFixed(0)} KB
`);
