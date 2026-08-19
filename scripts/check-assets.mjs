#!/usr/bin/env node
/**
 * Assert that every asset the manifest promises actually exists.
 *
 * This check exists because of a real failure. Every sprite in the opening was missing, and
 * nothing complained: `useOptionalTexture` returns null on a 404 by design, the warm-up settles
 * rather than rejects by design, and the readiness guards release by design. Each of those is
 * individually correct — §2.14 requires that a missing asset degrade the picture rather than
 * block the pipeline — but together they meant the entire opening rendered as an empty black
 * screen and reported itself healthy. A reader waited eighty seconds in the dark and concluded
 * the site was broken, which it effectively was.
 *
 * Graceful degradation must not be silent degradation. The runtime still degrades; this makes
 * the degradation visible at build time, where someone can do something about it.
 *
 * Earth textures are reported separately and never fail the build: they are NASA Blue Marble
 * imagery that must be sourced with provenance recorded (§2.6, §7.7), the Earth components fall
 * back to procedural shading without them, and blocking a build on an asset that is legitimately
 * pending is how a check gets disabled.
 *
 * Usage:
 *   node scripts/check-assets.mjs [--strict]
 *
 * @module scripts/check-assets
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const PUBLIC = path.join(FRONTEND, 'public');

const strict = process.argv.includes('--strict');

const manifestSource = fs.readFileSync(path.join(FRONTEND, 'src/config/assetManifest.js'), 'utf8');

// Read the declared URLs out of the manifest source rather than importing it: the module uses
// the `@` alias and `import.meta.env`, neither of which resolves outside Vite.
const declared = [...manifestSource.matchAll(/url:\s*'([^']+)'/g)].map((m) => m[1]);

/**
 * Assets that must be *sourced* rather than generated, with the reason and the authority.
 *
 * These never fail the build. Fabricating any of them would be worse than their absence:
 * §8.9 permits Earth imagery only from NASA ("Reality is already sacred when shown correctly"),
 * §8.5.2 makes natural field recordings the controlling source for audio and rejects synthetic
 * substitutes outright, and a font is a licence rather than a file we may invent. Each has a
 * documented runtime fallback, so their absence degrades the picture and nothing else.
 */
const PENDING = [
  {
    match: (url) => url.startsWith('/textures/earth/'),
    why: 'NASA Blue Marble imagery — source with provenance (public/textures/README.md, §2.6)',
    fallback: 'Earth renders with procedural shading',
  },
  {
    match: (url) => url.startsWith('/video/') || url.startsWith('/images/earth_'),
    why: 'NASA-derived Earth hero frame and cinematic fallback (§2.6, §7.4.2)',
    fallback: 'reduced-motion and LOW-tier paths fall back to the live scene',
  },
  {
    match: (url) => url.startsWith('/fonts/'),
    why: 'licensed faces — Literata and Inter (public/fonts/README.md, §8.4)',
    fallback: '_base.scss falls back to a system serif and sans stack',
  },
  {
    match: (url) => url.startsWith('/sounds/'),
    why: 'licensed natural field recordings; synthetic substitutes are prohibited (§8.5.2)',
    fallback: 'silence — and silent entry is a complete experience (§2.9)',
  },
];

/** @returns {{ why: string, fallback: string }|null} */
const pendingReason = (url) => PENDING.find((entry) => entry.match(url)) ?? null;

const seen = new Set();
const missing = [];
/** @type {{ url: string, why: string, fallback: string }[]} */
const pending = [];
let present = 0;

for (const url of declared) {
  if (seen.has(url)) continue;
  seen.add(url);

  // Only same-origin public assets are checkable here.
  if (!url.startsWith('/')) continue;

  if (fs.existsSync(path.join(PUBLIC, url))) {
    present += 1;
    continue;
  }
  const reason = pendingReason(url);
  if (reason) pending.push({ url, ...reason });
  else missing.push(url);
}

// The Earth tier tables name their files separately from the manifest's `url:` entries.
const themeSource = fs.readFileSync(path.join(FRONTEND, 'src/config/ogpTheme.js'), 'utf8');
for (const match of themeSource.matchAll(/'(\/textures\/earth\/[^']+)'/g)) {
  const url = match[1];
  if (seen.has(url)) continue;
  seen.add(url);
  if (fs.existsSync(path.join(PUBLIC, url))) present += 1;
  else pending.push({ url, ...(pendingReason(url) ?? { why: 'unclassified', fallback: 'unknown' }) });
}

console.log(`\nAsset check — ${seen.size} declared, ${present} present\n`);

if (pending.length > 0) {
  console.log(`  ${pending.length} asset(s) awaiting sourcing — reported, never a failure:`);

  /** @type {Map<string, { fallback: string, urls: string[] }>} */
  const byReason = new Map();
  for (const item of pending) {
    if (!byReason.has(item.why)) byReason.set(item.why, { fallback: item.fallback, urls: [] });
    byReason.get(item.why).urls.push(item.url);
  }

  for (const [why, group] of byReason) {
    console.log(`\n    ${why}`);
    for (const url of group.urls.slice(0, 6)) console.log(`      ${url}`);
    if (group.urls.length > 6) console.log(`      … and ${group.urls.length - 6} more`);
    console.log(`      fallback: ${group.fallback}`);
  }
  console.log('');
}

if (missing.length > 0) {
  console.error(`  ${missing.length} generated asset(s) MISSING:`);
  for (const url of missing) console.error(`    ${url}`);
  console.error('\n  Run: npm run assets\n');
  process.exit(1);
}

if (strict && pending.length > 0) {
  console.error(`  --strict: ${pending.length} sourced asset(s) are required for a production build.\n`);
  process.exit(1);
}

console.log('  Every generated asset is present.\n');
