#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const JS_PATH = resolve(root, 'src/config/ogpTheme.js');
const SCSS_PATH = resolve(root, 'src/styles/_ogp-tokens.scss');

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

function normaliseHex(value) {
  const hex = value.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(hex);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return hex;
}

function readJsColorTokens(source, exportName) {
  const start = source.indexOf(`export const ${exportName}`);
  if (start === -1) throw new Error(`${exportName} not found in ${JS_PATH}`);
  const open = source.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = source.slice(open, end + 1);
  const tokens = new Map();
  for (const match of body.matchAll(/(\w+)\s*:\s*'(#[0-9a-fA-F]{3,8})'/g)) {
    tokens.set(match[1], normaliseHex(match[2]));
  }
  return tokens;
}

function readScssColorTokens(source) {
  const tokens = new Map();
  for (const match of source.matchAll(/^\$ogp-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/gm)) {
    tokens.set(match[1], normaliseHex(match[2]));
  }
  return tokens;
}

function readScssDurations(source) {
  const tokens = new Map();
  for (const match of source.matchAll(/^\$ogp-duration-([a-z0-9-]+)\s*:\s*(\d+)ms\s*;/gm)) {
    tokens.set(match[1], Number(match[2]));
  }
  return tokens;
}

function readJsDurations(source) {
  const block = /durations\s*:\s*\{([^}]*)\}/s.exec(source);
  if (!block) return new Map();
  const tokens = new Map();
  for (const match of block[1].matchAll(/(\w+)\s*:\s*([\d.]+)/g)) {
    tokens.set(match[1], Math.round(Number(match[2]) * 1000));
  }
  return tokens;
}

const jsSource = readFileSync(JS_PATH, 'utf8');
const scssSource = readFileSync(SCSS_PATH, 'utf8');

const jsColors = readJsColorTokens(jsSource, 'OGP_COLORS');
const scssColors = readScssColorTokens(scssSource);
const jsDurations = readJsDurations(jsSource);
const scssDurations = readScssDurations(scssSource);

const CANVAS_ONLY = new Set(['fog-near', 'fog-far']);

const problems = [];

for (const [name, hex] of jsColors) {
  const scssName = kebab(name);
  if (CANVAS_ONLY.has(scssName)) continue;
  if (!scssColors.has(scssName)) {
    problems.push(`missing in SCSS: $ogp-${scssName} (OGP_COLORS.${name} = ${hex})`);
    continue;
  }
  const scssHex = scssColors.get(scssName);
  if (scssHex !== hex) {
    problems.push(`mismatch: OGP_COLORS.${name} = ${hex} but $ogp-${scssName} = ${scssHex}`);
  }
}

const jsColorNames = new Set([...jsColors.keys()].map(kebab));
for (const name of scssColors.keys()) {
  if (!jsColorNames.has(name)) {
    problems.push(`missing in JS: OGP_COLORS.${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())} ($ogp-${name})`);
  }
}

for (const [name, ms] of jsDurations) {
  const scssName = kebab(name);
  if (!scssDurations.has(scssName)) continue;
  if (scssDurations.get(scssName) !== ms) {
    problems.push(
      `mismatch: OGP_MOTION.durations.${name} = ${ms}ms but $ogp-duration-${scssName} = ${scssDurations.get(scssName)}ms`,
    );
  }
}

if (problems.length > 0) {
  console.error('\nToken parity FAILED — the canvas and the DOM would render different values.\n');
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`\n${problems.length} problem(s). Fix both files, then re-run.\n`);
  process.exit(1);
}

console.log(
  `Token parity OK — ${jsColors.size} colour tokens and ${jsDurations.size} durations agree ` +
    'between ogpTheme.js and _ogp-tokens.scss.',
);
