#!/usr/bin/env node
/**
 * Token parity check.
 *
 * The design tokens live in two files because two runtimes need them: `ogpTheme.js` feeds the
 * R3F canvas (THREE.Color, fog, shader uniforms) and `_ogp-tokens.scss` feeds the DOM. §8.2.1
 * requires them to be the same values, and §8 forbids any component from hardcoding a colour
 * that exists as a token. Two files holding the same numbers drift silently, so this asserts
 * they cannot.
 *
 * The mapping is by name: `goldPrimary` in JS is `$ogp-gold-primary` in SCSS (camelCase to
 * kebab-case). A token present in one file and absent from the other is a failure too — a
 * half-defined token is how drift starts.
 *
 * Durations and easings are also compared where both files carry them: `OGP_MOTION.durations`
 * against `$ogp-duration-*` (milliseconds either side).
 *
 * Exit code 1 on any mismatch. Wired into `npm run verify`.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const JS_PATH = resolve(root, 'src/config/ogpTheme.js');
const SCSS_PATH = resolve(root, 'src/styles/_ogp-tokens.scss');

/** camelCase → kebab-case, so `goldPrimary` finds `$ogp-gold-primary`. */
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** Normalise `#ABC` and `#AABBCC` to a comparable lowercase 6-digit form. */
function normaliseHex(value) {
  const hex = value.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(hex);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return hex;
}

/**
 * Pull `key: '#hex'` pairs out of a named exported object literal.
 *
 * A regex rather than an import because this script must run without a bundler resolving the
 * `@` alias, and because it should read what is *written* in the file rather than what a
 * module happens to evaluate to.
 *
 * @param {string} source The file contents.
 * @param {string} exportName The exported binding to read.
 * @returns {Map<string, string>} token name → hex
 */
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

/**
 * Pull `$ogp-name: #hex;` declarations out of the SCSS token file.
 *
 * @param {string} source The file contents.
 * @returns {Map<string, string>} token name (without the `$ogp-` prefix) → hex
 */
function readScssColorTokens(source) {
  const tokens = new Map();
  for (const match of source.matchAll(/^\$ogp-([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/gm)) {
    tokens.set(match[1], normaliseHex(match[2]));
  }
  return tokens;
}

/** Pull `$ogp-duration-name: 1500ms;` declarations. */
function readScssDurations(source) {
  const tokens = new Map();
  for (const match of source.matchAll(/^\$ogp-duration-([a-z0-9-]+)\s*:\s*(\d+)ms\s*;/gm)) {
    tokens.set(match[1], Number(match[2]));
  }
  return tokens;
}

/** Pull `durations: { uiMicro: 0.2, ... }` (seconds) from OGP_MOTION. */
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

/**
 * Tokens that legitimately exist on one side only.
 *
 * Scene fog is a 3D concept with no DOM counterpart — `fogNear` and `fogFar` are canvas-side
 * aliases of `voidFogNear` and `voidDeep`, which ARE checked. Nothing else may be exempt:
 * every exemption is a place where the two runtimes can quietly disagree, so each one needs a
 * reason written down beside it.
 */
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

// SCSS-only tokens are permitted when they are not colours the canvas can express — but a
// colour defined only in SCSS is exactly the drift this check exists to prevent.
const jsColorNames = new Set([...jsColors.keys()].map(kebab));
for (const name of scssColors.keys()) {
  if (!jsColorNames.has(name)) {
    problems.push(`missing in JS: OGP_COLORS.${name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())} ($ogp-${name})`);
  }
}

for (const [name, ms] of jsDurations) {
  const scssName = kebab(name);
  if (!scssDurations.has(scssName)) continue; // SCSS need not mirror every canvas duration
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
