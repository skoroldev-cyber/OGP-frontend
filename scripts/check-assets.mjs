#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const PUBLIC = path.join(FRONTEND, 'public');

const strict = process.argv.includes('--strict');

const manifestSource = fs.readFileSync(path.join(FRONTEND, 'src/config/assetManifest.js'), 'utf8');

const declared = [...manifestSource.matchAll(/url:\s*'([^']+)'/g)].map((m) => m[1]);

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

const pendingReason = (url) => PENDING.find((entry) => entry.match(url)) ?? null;

const seen = new Set();
const missing = [];
const pending = [];
let present = 0;

for (const url of declared) {
  if (seen.has(url)) continue;
  seen.add(url);

  if (!url.startsWith('/')) continue;

  if (fs.existsSync(path.join(PUBLIC, url))) {
    present += 1;
    continue;
  }
  const reason = pendingReason(url);
  if (reason) pending.push({ url, ...reason });
  else missing.push(url);
}

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
