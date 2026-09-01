#!/usr/bin/env node
/**
 * Generates vsix/icon.png (128x128) from theme/palette.json.
 *
 * The Extensions manager and the Marketplace both show this icon, so a theme
 * without one looks unfinished next to everything else in the list. It is drawn
 * from the palette rather than shipped as a binary blob, so it can never drift
 * out of sync with the colors it is advertising.
 *
 * PNG is written by hand (zlib is in Node's stdlib) to keep the project at zero
 * npm dependencies.
 */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'theme/palette.json'), 'utf8'));

const SIZE = 128;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

const bg     = rgb(P.neutral.editorBg);
const chrome = rgb(P.neutral.chromeBg);
const border = rgb(P.neutral.border);

// "Code lines" in the palette's own syntax colors -- reads instantly as a theme.
const lines = [
  { y: 30, x: 22, w: 44, c: rgb(P.syntax.keyword) },
  { y: 30, x: 72, w: 34, c: rgb(P.syntax.type) },
  { y: 47, x: 34, w: 30, c: rgb(P.syntax.function) },
  { y: 47, x: 70, w: 24, c: rgb(P.syntax.string) },
  { y: 64, x: 34, w: 22, c: rgb(P.syntax.property) },
  { y: 64, x: 62, w: 40, c: rgb(P.syntax.string) },
  { y: 81, x: 34, w: 26, c: rgb(P.syntax.number) },
  { y: 81, x: 66, w: 18, c: rgb(P.syntax.comment) },
  { y: 98, x: 22, w: 30, c: rgb(P.state.accent) },
];
const BAR_H = 9;
const RADIUS = 3;

// --- raster -----------------------------------------------------------------
const px = new Uint8Array(SIZE * SIZE * 3);
const put = (x, y, c) => {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const o = (y * SIZE + x) * 3;
  px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
};

for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) put(x, y, bg);

// A title-bar band across the top, so it reads as an editor window.
for (let y = 0; y < 16; y++) for (let x = 0; x < SIZE; x++) put(x, y, chrome);
for (let x = 0; x < SIZE; x++) put(x, 16, border);

// Three "window dot" marks in the band.
const dots = [rgb(P.state.error), rgb(P.state.warning), rgb(P.state.gitAdded)];
dots.forEach((c, i) => {
  const cx = 14 + i * 15, cy = 8, r = 3.4;
  for (let y = cy - 4; y <= cy + 4; y++)
    for (let x = cx - 4; x <= cx + 4; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(x, y, c);
});

// Rounded code bars.
for (const { y, x, w, c } of lines) {
  for (let dy = 0; dy < BAR_H; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const nearL = dx < RADIUS, nearR = dx >= w - RADIUS;
      const nearT = dy < RADIUS, nearB = dy >= BAR_H - RADIUS;
      if ((nearL || nearR) && (nearT || nearB)) {
        const cx = nearL ? RADIUS - 0.5 : w - RADIUS - 0.5;
        const cy = nearT ? RADIUS - 0.5 : BAR_H - RADIUS - 0.5;
        if ((dx - cx) ** 2 + (dy - cy) ** 2 > RADIUS * RADIUS) continue;
      }
      put(x + dx, y + dy, c);
    }
  }
}

// --- encode -----------------------------------------------------------------
const raw = Buffer.alloc(SIZE * (SIZE * 3 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 3 + 1)] = 0; // filter type 0 (None)
  Buffer.from(px.buffer, y * SIZE * 3, SIZE * 3).copy(raw, y * (SIZE * 3 + 1) + 1);
}

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return buf => {
    let c = -1;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 2;  // color type: truecolor
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = path.join(ROOT, 'vsix', 'icon.png');
fs.writeFileSync(out, png);
fs.writeFileSync(path.join(ROOT, 'vscode', 'icon.png'), png);
console.log(`icon written: ${out} (${SIZE}x${SIZE}, ${png.length.toLocaleString()} bytes)`);
console.log('  also copied to vscode/icon.png');
