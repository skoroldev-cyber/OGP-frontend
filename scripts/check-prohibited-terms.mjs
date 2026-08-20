#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, relative, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const rules = JSON.parse(readFileSync(resolve(root, 'src/config/rules.json'), 'utf8'));
const TERMS = rules.prohibited_terms;

const SCAN_DIRS = ['src'];
const SCAN_FILES = ['index.html'];
const SCAN_EXT = new Set(['.js', '.jsx', '.scss', '.html']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

const TEXT_ATTRIBUTES = /(?:aria-label|aria-description|aria-placeholder|title|alt|placeholder|label|summary|content)\s*=\s*$/;

const escapeRe = (term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MULTI_WORD = TERMS.filter((term) => term.includes(' '));
const SINGLE_WORD = TERMS.filter((term) => !term.includes(' '));

const multiWordRe = MULTI_WORD.map((term) => ({
  term,
  re: new RegExp(`\\b${escapeRe(term)}\\b`, 'i'),
}));
const singleWordRe = SINGLE_WORD.map((term) => ({
  term,
  re: new RegExp(`\\b${escapeRe(term)}\\b`, 'i'),
}));

function stripComments(source) {
  let out = '';
  let index = 0;
  let quote = null;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (quote) {
      if (char === '\\') {
        out += source.slice(index, index + 2);
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      out += char;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      out += char;
      index += 1;
      continue;
    }

    if (char === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        if (source[index] === '\n') out += '\n';
        index += 1;
      }
      index += 2;
      continue;
    }

    if (char === '<' && source.startsWith('<!--', index)) {
      const close = source.indexOf('-->', index);
      const body = source.slice(index, close === -1 ? source.length : close);
      out += body.replace(/[^\n]/g, ' ');
      index = close === -1 ? source.length : close + 3;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

const lineAt = (source, offset) => source.slice(0, offset).split('\n').length;

function extractStrings(source, ext) {
  const found = [];

  if (ext === '.html') {
    for (const match of source.matchAll(/>([^<]{2,})</g)) {
      const text = match[1].trim();
      if (text) found.push({ text, offset: match.index, copyLike: true });
    }
    for (const match of source.matchAll(/(?:content|alt|title|aria-label)\s*=\s*"([^"]*)"/gi)) {
      found.push({ text: match[1], offset: match.index, copyLike: true });
    }
    return found;
  }

  if (ext === '.scss') {
    for (const match of source.matchAll(/content\s*:\s*['"]([^'"]*)['"]/g)) {
      found.push({ text: match[1], offset: match.index, copyLike: true });
    }
    return found;
  }

  for (const match of source.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    const text = match[1] ?? match[2] ?? match[3] ?? '';
    if (!text) continue;
    const before = source.slice(Math.max(0, match.index - 40), match.index);
    const isModulePath = /^[@./]|^node:/.test(text);
    const isImport = /\b(?:from|import|require\s*\()\s*$/.test(before);
    if (isModulePath || isImport) continue;
    found.push({
      text,
      offset: match.index,
      copyLike: TEXT_ATTRIBUTES.test(before) || looksLikeProse(text),
    });
  }

  for (const match of source.matchAll(/>\s*([^<>{}\n][^<>{}]*)</g)) {
    const text = match[1].trim();
    if (text.length > 1) found.push({ text, offset: match.index, copyLike: true });
  }

  return found;
}

const looksLikeProse = (text) => /\s/.test(text) && /[a-z]{2,}/.test(text);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (SCAN_EXT.has(extname(full))) out.push(full);
  }
  return out;
}

const files = [
  ...SCAN_DIRS.flatMap((dir) => walk(resolve(root, dir))),
  ...SCAN_FILES.map((file) => resolve(root, file)),
];

const hits = [];
let literalsScanned = 0;

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const source = stripComments(raw);
  const ext = extname(file);
  const isCopyModule = file.replace(/\\/g, '/').endsWith('src/config/copy.js');

  for (const { text, offset, copyLike } of extractStrings(source, ext)) {
    literalsScanned += 1;
    const treatAsCopy = copyLike || isCopyModule;

    for (const { term, re } of multiWordRe) {
      if (re.test(text)) {
        hits.push({ file, line: lineAt(source, offset), term, text });
      }
    }

    if (!treatAsCopy) continue;

    for (const { term, re } of singleWordRe) {
      if (re.test(text)) {
        hits.push({ file, line: lineAt(source, offset), term, text });
      }
    }
  }
}

if (hits.length > 0) {
  console.error('\nProhibited terms FOUND in user-facing copy.\n');
  console.error('rules.json bans these words from every string a reader can see (§14.4.1).');
  console.error('The one locked threshold phrase for the family pathway is "Become Family."\n');
  for (const hit of hits) {
    const where = `${relative(root, hit.file).replace(/\\/g, '/')}:${hit.line}`;
    const excerpt = hit.text.length > 90 ? `${hit.text.slice(0, 87)}…` : hit.text;
    console.error(`  ${where}\n    term: "${hit.term}"\n    in:   ${excerpt}\n`);
  }
  console.error(`${hits.length} violation(s).\n`);
  process.exit(1);
}

console.log(
  `Prohibited-terms check OK — ${literalsScanned} literals across ${files.length} files, ` +
    `zero occurrences of the ${TERMS.length} banned terms.`,
);
