#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const REPO = path.resolve(FRONTEND, '..');

let sharp;
try {
  sharp = require(path.join(REPO, 'portfolio-itom-main', 'node_modules', 'sharp'));
} catch {
  try {
    sharp = require('sharp');
  } catch {
    console.error('\nThis design-time script needs `sharp`.\n');
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
  console.log('build-textures — generate the opening sprites from the token palette\n');
  process.exit(0);
}

const OUT = path.resolve(FRONTEND, String(args.out ?? 'public/textures'));

const themeSource = fs.readFileSync(path.join(FRONTEND, 'src/config/ogpTheme.js'), 'utf8');

function token(name, fallback) {
  const match = new RegExp(`${name}\\s*:\\s*'(#[0-9a-fA-F]{6})'`).exec(themeSource);
  if (!match) {
    console.warn(`  ! token ${name} not found; using ${fallback}`);
    return fallback;
  }
  return match[1];
}

const rgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const GOLD_CORE = rgb(token('goldCore', '#ffe9c2'));
const GOLD_PRIMARY = rgb(token('goldPrimary', '#d9a64a'));
const GOLD_DEEP = rgb(token('goldDeep', '#6e5320'));
const VOID_PARTICLE = rgb(token('voidParticle', '#1a1a26'));
const VOID_DEEP = rgb(token('voidDeep', '#030307'));
const READ_FIELD = rgb(token('readField', '#0e0d0b'));

const lerp = (a, b, t) => a + (b - a) * t;
const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const clamp01 = (v) => Math.min(1, Math.max(0, v));

async function write(file, size, shade) {
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = shade(x, y);
      const i = (y * size + x) * 4;
      data[i] = Math.round(clamp01(r / 255) * 255);
      data[i + 1] = Math.round(clamp01(g / 255) * 255);
      data[i + 2] = Math.round(clamp01(b / 255) * 255);
      data[i + 3] = Math.round(clamp01(a) * 255);
    }
  }
  const target = path.join(OUT, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await sharp(data, { raw: { width: size, height: size, channels: 4 } })
    .webp({ quality: 92, alphaQuality: 100 })
    .toFile(target);
  return fs.statSync(target).size;
}

const radial = (x, y, size) => {
  const c = (size - 1) / 2;
  return Math.hypot(x - c, y - c) / c;
};

const falloff = (d, softness = 1) => {
  const v = clamp01(1 - d);
  return Math.pow(v, 2 + softness * 2);
};

const jobs = [];

jobs.push(['opening/speck_soft.webp', 128, (x, y, s = 128) => {
  const d = radial(x, y, s);
  const a = falloff(d, 1.6);
  const c = mixRgb(GOLD_CORE, GOLD_PRIMARY, clamp01(d * 1.4));
  return [c[0], c[1], c[2], a];
}]);

jobs.push(['opening/depth_mote.webp', 64, (x, y, s = 64) => {
  const d = radial(x, y, s);
  const a = falloff(d, 2.2) * 0.85;
  const c = mixRgb(VOID_PARTICLE, GOLD_DEEP, 0.25);
  return [c[0], c[1], c[2], a];
}]);

const strand = (lit) => (x, y, s) => {
  const u = x / (s - 1);
  const v = y / (s - 1);
  const across = Math.abs(v - 0.5) * 2;
  const body = Math.pow(clamp01(1 - across), 2.4);
  const along = 0.82 + 0.18 * Math.sin(u * Math.PI * 2.0);
  const t = clamp01(across * 1.15);
  const base = lit ? mixRgb(GOLD_CORE, GOLD_PRIMARY, t) : mixRgb(GOLD_PRIMARY, GOLD_DEEP, t);
  const gain = lit ? 1 : 0.72;
  return [base[0] * gain, base[1] * gain, base[2] * gain, body * along * (lit ? 1 : 0.9)];
};

jobs.push(['opening/weave_strand.webp', 256, (x, y) => strand(false)(x, y, 256)]);
jobs.push(['opening/weave_strand_glow.webp', 256, (x, y) => strand(true)(x, y, 256)]);

jobs.push(['opening/passage_bands.webp', 512, (x, y, s = 512) => {
  const u = x / (s - 1);
  const v = y / (s - 1);
  const band = Math.abs(Math.sin(u * Math.PI * 6 + v * 1.2));
  const edge = Math.pow(band, 3.0);
  const depth = 0.35 + 0.65 * Math.pow(1 - Math.abs(v - 0.5) * 2, 0.7);
  const c = mixRgb(GOLD_DEEP, GOLD_PRIMARY, edge);
  return [c[0] * depth, c[1] * depth, c[2] * depth, edge * depth * 0.9];
}]);

jobs.push(['space/starfield_soft.webp', 64, (x, y, s = 64) => {
  const d = radial(x, y, s);
  const a = falloff(d, 3.0);
  return [235, 238, 245, a * 0.9];
}]);

jobs.push(['room/field_gradient.webp', 512, (x, y, s = 512) => {
  const v = y / (s - 1);
  const d = radial(x, y, s);
  const c = mixRgb(READ_FIELD, VOID_DEEP, clamp01(v * 0.85));
  const vignette = 1 - Math.pow(clamp01(d), 2.2) * 0.55;
  return [c[0] * vignette, c[1] * vignette, c[2] * vignette, 1];
}]);

jobs.push(['room/manuscript_artifact.webp', 256, (x, y, s = 256) => {
  const v = y / (s - 1);
  const u = x / (s - 1);
  const grain = 0.94 + 0.06 * Math.sin(u * 90) * Math.sin(v * 70);
  const c = mixRgb(GOLD_DEEP, READ_FIELD, clamp01(v * 0.7 + 0.2));
  const edge = Math.pow(clamp01(1 - Math.abs(u - 0.5) * 2), 0.35);
  return [c[0] * grain, c[1] * grain, c[2] * grain, edge];
}]);

jobs.push(['pathways/panel_field.webp', 512, (x, y, s = 512) => {
  const d = radial(x, y, s);
  const c = mixRgb(READ_FIELD, VOID_DEEP, clamp01(d * 0.8));
  const a = 0.85 - Math.pow(clamp01(d), 2.0) * 0.5;
  return [c[0], c[1], c[2], clamp01(a)];
}]);

console.log(`\nGenerating opening sprites into ${path.relative(FRONTEND, OUT).replace(/\\/g, '/')}\n`);

let total = 0;
for (const [file, size, shade] of jobs) {
  const bytes = await write(file, size, (x, y) => shade(x, y, size));
  total += bytes;
  console.log(`  ${file.padEnd(34)} ${String(size).padStart(4)}px  ${(bytes / 1024).toFixed(1).padStart(6)} KB`);
}

console.log(`\n  ${jobs.length} sprites, ${(total / 1024).toFixed(0)} KB total.`);
console.log(
  '  Earth textures are NOT generated: they are NASA Blue Marble imagery and must be\n' +
    '  sourced with provenance recorded (public/textures/README.md).\n',
);
