#!/usr/bin/env node
/**
 * Derive the reading-room logo mark from the commissioned source artwork.
 *
 * `public/logo/main-logo.png` is the delivered master: 1272x1236 and 2.1 MB. The mark is worn
 * in the reading-room chrome at about 34 CSS pixels, so shipping the master would spend two
 * megabytes to paint a thumbnail — on the one screen §8.1 asks to be quietest, and against the
 * §7.7 budget the manuscript itself has to fit inside. §8.9 permits a commissioned image to be
 * carried into the pipeline; it does not permit carrying it at sixty times the size it is shown.
 *
 * So the master stays the master and this derives the worn sizes from it. Nothing here makes a
 * design decision: it trims the transparent margin the master ships with, so the mark can be
 * optically aligned against the wordmark rather than against its own padding, and it box-filters
 * down to 1x and 2x. Re-run it when the master is redrawn.
 *
 * `sharp` is deliberately not used. It is the right tool and `build-textures.mjs` reaches for it,
 * but it is absent from this project's dependency tree and borrowed from a sibling checkout when
 * that script runs. A one-off resize of an 8-bit RGBA PNG is small enough to do against `zlib`
 * directly, and a design-time script that always runs is worth more than one that needs a
 * neighbouring `node_modules` to exist.
 *
 * Alpha is premultiplied before averaging and unpremultiplied after. Averaging straight RGBA
 * blends the colour of fully transparent pixels into the edge, which on gold over a dark field
 * shows up as a grey fringe around every strand.
 *
 * Usage:
 *   node scripts/build-logo-mark.mjs [--src=public/logo/main-logo.png] [--sizes=64,128]
 *
 * @module scripts/build-logo-mark
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

if (args.help) {
  console.log('build-logo-mark — derive the worn logo sizes from the master artwork\n');
  process.exit(0);
}

const SRC = path.resolve(FRONTEND, String(args.src ?? 'public/logo/main-logo.png'));
const SIZES = String(args.sizes ?? '64,128')
  .split(',')
  .map((n) => Number.parseInt(n, 10))
  .filter((n) => Number.isFinite(n) && n > 0);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* -------------------------------------------------------------------------- */
/* Decode                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Read an 8-bit RGBA, non-interlaced PNG into a flat pixel buffer.
 *
 * Only the one shape the master is authored in is supported. Anything else throws rather than
 * guessing, because a silently misread logo is harder to notice than a failed build.
 *
 * @param {Buffer} file
 * @returns {{ width: number, height: number, data: Buffer }}
 */
function decodePng(file) {
  if (!file.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('not a PNG');

  let width = 0;
  let height = 0;
  const idat = [];
  let offset = 8;

  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.toString('ascii', offset + 4, offset + 8);
    const body = file.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, colourType, , , interlace] = [body[8], body[9], body[10], body[11], body[12]];
      if (depth !== 8) throw new Error(`bit depth ${depth} unsupported — expected 8`);
      if (colourType !== 6) throw new Error(`colour type ${colourType} unsupported — expected 6 (RGBA)`);
      if (interlace !== 0) throw new Error('interlaced PNGs are unsupported');
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const data = Buffer.alloc(stride * height);

  // Undo the per-scanline filters. Each byte is predicted from its left (a), its neighbour on
  // the row above (b) and that neighbour's left (c); the filter byte says which prediction.
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = data.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? data.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x += 1) {
      const a = x >= 4 ? out[x - 4] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= 4 ? prev[x - 4] : 0;
      let value = line[x];

      switch (filter) {
        case 0:
          break;
        case 1:
          value += a;
          break;
        case 2:
          value += b;
          break;
        case 3:
          value += (a + b) >> 1;
          break;
        case 4:
          value += paeth(a, b, c);
          break;
        default:
          throw new Error(`unknown filter ${filter} on row ${y}`);
      }
      out[x] = value & 0xff;
    }
  }

  return { width, height, data };
}

/** The PNG Paeth predictor: whichever of a, b or c is nearest to a + b - c. */
function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/* -------------------------------------------------------------------------- */
/* Trim and resample                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The bounding box of everything meaningfully opaque, squared off around the artwork's centre.
 *
 * Squared rather than tight: the mark is a disc, and a tight box on a hand-drawn disc is a few
 * pixels off round, which would land as a mark that sits crooked next to the wordmark.
 *
 * @param {{ width: number, height: number, data: Buffer }} image
 * @param {number} threshold Alpha at or below which a pixel counts as empty.
 */
function contentBox(image, threshold = 8) {
  const { width, height, data } = image;
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= threshold) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < 0) return { x: 0, y: 0, size: Math.min(width, height) };

  const centreX = (left + right) / 2;
  const centreY = (top + bottom) / 2;
  const size = Math.max(right - left + 1, bottom - top + 1);

  return {
    x: Math.max(0, Math.round(centreX - size / 2)),
    y: Math.max(0, Math.round(centreY - size / 2)),
    size: Math.min(size, width, height),
  };
}

/**
 * Box-filter a square region down to `target` pixels a side, averaging in premultiplied alpha.
 *
 * @param {{ width: number, data: Buffer }} image
 * @param {{ x: number, y: number, size: number }} box
 * @param {number} target
 * @returns {{ width: number, height: number, data: Buffer }}
 */
function resample(image, box, target) {
  const out = Buffer.alloc(target * target * 4);
  const step = box.size / target;

  for (let ty = 0; ty < target; ty += 1) {
    const y0 = box.y + Math.floor(ty * step);
    const y1 = box.y + Math.floor((ty + 1) * step);

    for (let tx = 0; tx < target; tx += 1) {
      const x0 = box.x + Math.floor(tx * step);
      const x1 = box.x + Math.floor((tx + 1) * step);

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let n = 0;

      for (let y = y0; y < Math.max(y1, y0 + 1); y += 1) {
        for (let x = x0; x < Math.max(x1, x0 + 1); x += 1) {
          const i = (y * image.width + x) * 4;
          const alpha = image.data[i + 3] / 255;
          r += image.data[i] * alpha;
          g += image.data[i + 1] * alpha;
          b += image.data[i + 2] * alpha;
          a += alpha;
          n += 1;
        }
      }

      const o = (ty * target + tx) * 4;
      // Unpremultiply against the accumulated coverage, not the sample count: a pixel that is
      // one-tenth covered keeps its full colour at one-tenth alpha rather than fading to black.
      out[o] = a > 0 ? Math.round(r / a) : 0;
      out[o + 1] = a > 0 ? Math.round(g / a) : 0;
      out[o + 2] = a > 0 ? Math.round(b / a) : 0;
      out[o + 3] = Math.round((a / n) * 255);
    }
  }

  return { width: target, height: target, data: out };
}

/* -------------------------------------------------------------------------- */
/* Encode                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Write an 8-bit RGBA PNG, choosing a filter per scanline by the minimum-sum-of-absolute-
 * differences heuristic the specification recommends.
 *
 * @param {{ width: number, height: number, data: Buffer }} image
 * @returns {Buffer}
 */
function encodePng(image) {
  const { width, height, data } = image;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  const candidate = Buffer.alloc(stride);
  const best = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const line = data.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? data.subarray((y - 1) * stride, y * stride) : null;

    let bestFilter = 0;
    let bestScore = Infinity;

    for (let filter = 0; filter <= 4; filter += 1) {
      let score = 0;
      for (let x = 0; x < stride; x += 1) {
        const a = x >= 4 ? line[x - 4] : 0;
        const b = prev ? prev[x] : 0;
        const c = prev && x >= 4 ? prev[x - 4] : 0;
        let value;
        switch (filter) {
          case 0:
            value = line[x];
            break;
          case 1:
            value = line[x] - a;
            break;
          case 2:
            value = line[x] - b;
            break;
          case 3:
            value = line[x] - ((a + b) >> 1);
            break;
          default:
            value = line[x] - paeth(a, b, c);
        }
        candidate[x] = value & 0xff;
        // Signed magnitude: a byte of 0xfe is a delta of -2, which compresses like a 2.
        score += candidate[x] < 128 ? candidate[x] : 256 - candidate[x];
      }
      if (score < bestScore) {
        bestScore = score;
        bestFilter = filter;
        candidate.copy(best);
      }
    }

    raw[y * (stride + 1)] = bestFilter;
    best.copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9, memLevel: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Length-prefixed, CRC-suffixed PNG chunk. */
function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, tail]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* -------------------------------------------------------------------------- */

if (!fs.existsSync(SRC)) {
  console.error(`\n  Source artwork not found: ${path.relative(FRONTEND, SRC)}\n`);
  process.exit(1);
}

const source = decodePng(fs.readFileSync(SRC));
const box = contentBox(source);
const sourceBytes = fs.statSync(SRC).size;

console.log(
  `\nDeriving the logo mark from ${path.relative(FRONTEND, SRC).replace(/\\/g, '/')}` +
    ` — ${source.width}x${source.height}, ${(sourceBytes / 1024 / 1024).toFixed(2)} MB\n`,
);
console.log(`  artwork occupies ${box.size}x${box.size} at ${box.x},${box.y}\n`);

for (const size of SIZES) {
  const target = path.join(path.dirname(SRC), `main-logo-${size}.png`);
  fs.writeFileSync(target, encodePng(resample(source, box, size)));
  const bytes = fs.statSync(target).size;
  console.log(
    `  ${path.basename(target).padEnd(22)} ${String(size).padStart(4)}px  ` +
      `${(bytes / 1024).toFixed(1).padStart(6)} KB  ` +
      `(${(sourceBytes / bytes).toFixed(0)}x smaller)`,
  );
}

console.log('\n  The master is unchanged. Re-run this when it is redrawn.\n');
