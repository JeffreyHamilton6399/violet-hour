#!/usr/bin/env node
/**
 * Renders preview.png from theme/palette.json: a mock editor plus a labelled
 * swatch sheet.
 *
 * Contrast numbers say a palette is legible. They say nothing about whether it
 * is *pleasant* -- whether hues clash, whether one token screams, whether the
 * chrome separates. This exists so the palette can be looked at, not just
 * measured. Regenerate with `npm run preview` after any palette change.
 *
 * PNG is written by hand (zlib is stdlib) to keep the project dependency-free.
 */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'theme/palette.json'), 'utf8'));
const N = P.neutral, F = P.fg, S = P.state, X = P.syntax;

const W = 980, H = 660;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const px = new Uint8Array(W * H * 3);

const put = (x, y, c) => {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
};
const rect = (x, y, w, h, col) => {
  const c = rgb(col);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c);
};
/** a run of "characters" - the texture of code without needing glyph data */
const run = (x, y, chars, col, { cw = 5, gap = 1, h = 7 } = {}) => {
  const c = rgb(col);
  for (let n = 0; n < chars; n++)
    for (let j = 0; j < h; j++)
      for (let i = 0; i < cw - gap; i++) put(x + n * cw + i, y + j, c);
  return x + chars * cw;
};

rect(0, 0, W, H, N.well);

// ----------------------------------------------------------------- chrome
const TITLE_H = 26, TAB_H = 26, SIDE_W = 190, STATUS_H = 22;
rect(0, 0, W, TITLE_H, N.chromeBg);
rect(0, TITLE_H - 1, W, 1, N.border);

// window dots
[S.error, S.warning, S.gitAdded].forEach((col, i) => {
  const cx = 16 + i * 16, cy = 13, c = rgb(col);
  for (let y = cy - 4; y <= cy + 4; y++)
    for (let x = cx - 4; x <= cx + 4; x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= 16) put(x, y, c);
});
run(70, 10, 11, F.secondary, { cw: 5 });   // window title

// sidebar
rect(0, TITLE_H, SIDE_W, H - TITLE_H - STATUS_H, N.panelBg);
rect(SIDE_W - 1, TITLE_H, 1, H - TITLE_H - STATUS_H, N.border);
rect(0, TITLE_H, SIDE_W, 24, N.chromeBg);
run(12, TITLE_H + 8, 9, F.secondary);       // "EXPLORER"

const tree = [
  [16, 12, F.secondary], [28, 9, F.muted], [28, 11, S.gitModified],
  [28, 10, F.muted], [16, 8, F.secondary], [28, 13, S.gitAdded],
  [28, 7, F.muted], [28, 12, F.muted], [16, 10, F.secondary],
  [28, 9, F.muted], [28, 14, S.gitRemoved], [28, 8, F.muted],
];
let ty = TITLE_H + 36;
tree.forEach(([indent, len, col], i) => {
  if (i === 5) rect(4, ty - 3, SIDE_W - 9, 15, N.selectionBg);   // active file
  run(indent, ty, len, col, { cw: 5 });
  ty += 15;
});
// indent guides in the tree
for (let y = TITLE_H + 34; y < ty; y += 2) rect(22, y, 1, 1, N.indentGuide);

// tab strip
const EX = SIDE_W;
rect(EX, TITLE_H, W - EX, TAB_H, N.chromeBg);
rect(EX, TITLE_H + TAB_H - 1, W - EX, 1, N.border);
rect(EX, TITLE_H, 150, TAB_H, N.editorBg);                 // active tab
rect(EX, TITLE_H, 150, 2, S.accent);                       // active indicator
run(EX + 14, TITLE_H + 9, 13, F.primary);
run(EX + 164, TITLE_H + 9, 11, F.mutedOnChrome);           // inactive tab
run(EX + 300, TITLE_H + 9, 12, F.mutedOnChrome);
rect(EX + 155, TITLE_H + 4, 1, TAB_H - 8, N.border);
rect(EX + 291, TITLE_H + 4, 1, TAB_H - 8, N.border);

// ----------------------------------------------------------------- editor
const ETOP = TITLE_H + TAB_H;
const EH = H - ETOP - STATUS_H;
rect(EX, ETOP, W - EX, EH, N.editorBg);

// breadcrumb
run(EX + 14, ETOP + 8, 8, F.muted);
run(EX + 60, ETOP + 8, 6, F.muted);
run(EX + 96, ETOP + 8, 9, F.muted);

const GUT = EX + 12, CODE = EX + 58;
const LH = 17;
let y = ETOP + 30;

// [indentLevel, [ [chars, color], ... ]]
const lines = [
  [0, [[2, X.comment], [1, null], [22, X.comment]]],
  [0, []],
  [0, [[6, X.keyword], [1, null], [1, X.punctuation], [1, null], [8, X.property], [1, X.punctuation],
       [1, null], [10, X.property], [1, X.punctuation], [1, null], [8, X.property], [1, null],
       [1, X.punctuation], [1, null], [4, X.keyword], [1, null], [7, X.string]]],
  [0, [[6, X.keyword], [1, null], [4, X.keyword], [1, null], [1, X.punctuation], [1, null],
       [9, X.type], [1, null], [1, X.punctuation], [1, null], [4, X.keyword], [1, null], [7, X.string]]],
  [0, []],
  [0, [[5, X.keyword], [1, null], [11, X.number], [1, null], [1, X.operator], [1, null], [1, X.number]]],
  [0, [[5, X.keyword], [1, null], [8, X.number], [1, null], [1, X.operator], [1, null], [24, X.string]]],
  [0, [[5, X.keyword], [1, null], [7, X.number], [1, null], [1, X.operator], [1, null], [18, X.regex]]],
  [0, []],
  [0, [[6, X.keyword], [1, null], [9, X.keyword], [1, null], [10, X.type], [1, null], [1, X.punctuation]]],
  [1, [[5, X.property], [1, X.punctuation], [1, null], [6, X.type], [1, X.punctuation]]],
  [1, [[5, X.property], [1, X.punctuation], [1, null], [6, X.type], [1, X.punctuation]]],
  [1, [[8, X.property], [1, X.punctuation], [1, null], [1, X.punctuation], [3, X.parameter], [1, X.punctuation],
       [1, null], [6, X.type], [1, X.punctuation], [1, null], [1, X.punctuation], [1, null], [4, X.type], [1, X.punctuation]]],
  [0, [[1, X.punctuation]]],
  [0, []],
  [0, [[6, X.keyword], [1, null], [8, X.keyword], [1, null], [5, X.function], [1, X.punctuation],
       [1, X.punctuation], [1, null], [5, X.parameter], [1, X.punctuation], [1, null], [5, X.parameter],
       [1, null], [1, X.operator], [1, null], [1, X.number], [1, X.punctuation], [1, null], [1, X.punctuation], [1, null], [1, X.punctuation]]],
  [1, [[5, X.keyword], [1, null], [1, X.punctuation], [6, X.variable], [1, X.punctuation], [1, null],
       [8, X.function], [1, X.punctuation], [1, null], [1, X.operator], [1, null], [8, X.function], [1, X.punctuation],
       [6, X.type], [1, X.punctuation], [1, X.punctuation], [5, X.string], [1, X.punctuation], [1, X.punctuation], [1, X.punctuation]]],
  [1, [[5, X.keyword], [1, null], [5, X.variable], [1, null], [1, X.operator], [1, null], [8, X.function],
       [1, X.punctuation], [1, X.punctuation], [1, null], [1, X.templatePunct], [1, X.punctuation],
       [5, X.variable], [1, X.punctuation], [1, null], [1, X.templatePunct], [1, X.punctuation]]],
  [1, []],
  [1, [[6, X.keyword], [1, null], [1, X.punctuation]]],
  [2, [[1, X.punctuation], [7, X.tagIntrinsic], [1, null], [9, X.attribute], [1, X.operator],
       [1, X.punctuation], [8, X.string], [1, X.punctuation], [1, X.punctuation]]],
  [3, [[1, X.punctuation], [5, X.tagComponent], [1, null], [4, X.attribute], [1, X.operator],
       [1, X.punctuation], [5, X.variable], [1, X.punctuation], [1, null], [1, X.punctuation], [1, X.punctuation]]],
  [3, [[1, X.punctuation], [6, X.tagIntrinsic], [1, X.punctuation], [1, null], [12, X.variable],
       [1, null], [1, X.punctuation], [1, X.punctuation], [6, X.tagIntrinsic], [1, X.punctuation]]],
  [2, [[1, X.punctuation], [1, X.punctuation], [7, X.tagIntrinsic], [1, X.punctuation]]],
  [1, [[1, X.punctuation], [1, X.punctuation]]],
  [0, [[1, X.punctuation]]],
];

const CW = 6;
lines.forEach((L, i) => {
  const ln = i + 1;
  const rowY = y + i * LH;
  if (rowY > ETOP + EH - 20) return;

  // current line highlight
  if (ln === 17) rect(EX, rowY - 4, W - EX, LH, N.chromeBg);
  // a find match on line 7, a selection on line 18
  if (ln === 7) rect(CODE + 22 * CW, rowY - 3, 24 * CW, 11, S.findMatchBg);
  if (ln === 18) rect(CODE + 4 * CW, rowY - 3, 30 * CW, 11, N.selectionBg);

  // gutter
  const gcol = ln === 17 ? F.secondary : F.muted;
  run(GUT + (ln < 10 ? 6 : 0), rowY, ln < 10 ? 1 : 2, gcol, { cw: 5 });

  // git gutter marks
  if (ln === 6 || ln === 7) rect(CODE - 14, rowY - 4, 2, LH, S.gitAdded);
  if (ln === 17) rect(CODE - 14, rowY - 4, 2, LH, S.gitModified);

  const [indent, spans] = L;
  // indent guides
  for (let g = 0; g < indent; g++) {
    const gx = CODE + g * 4 * CW;
    for (let j = 0; j < LH; j += 2)
      rect(gx, rowY - 4 + j, 1, 1, g === indent - 1 ? N.indentGuideActive : N.indentGuide);
  }
  let x = CODE + indent * 4 * CW;
  for (const [chars, col] of spans) {
    if (col === null) { x += chars * CW; continue; }
    x = run(x, rowY, chars, col, { cw: CW, gap: 1 });
  }
});

// error squiggle + inline marker on a line
const sqY = y + 6 * LH + 9;
for (let i = 0; i < 24 * CW; i++) rect(CODE + 22 * CW + i, sqY + (i % 4 < 2 ? 0 : 1), 1, 1, S.error);

// minimap + scrollbar
const MM = W - 62;
rect(MM, ETOP, 50, EH, N.editorBg);
lines.forEach((L, i) => {
  const [indent, spans] = L;
  let mx = MM + 4 + indent * 3;
  for (const [chars, col] of spans) {
    if (col === null) { mx += chars; continue; }
    rect(mx, ETOP + 8 + i * 6, Math.max(1, chars), 2, col);
    mx += chars + 1;
  }
});
rect(W - 10, ETOP + 30, 6, 130, N.scrollSlider);

// ----------------------------------------------------------------- status bar
rect(0, H - STATUS_H, W, STATUS_H, N.chromeBg);
rect(0, H - STATUS_H, W, 1, N.border);
run(12, H - STATUS_H + 8, 8, F.secondary);
run(70, H - STATUS_H + 8, 5, S.gitAdded);
run(110, H - STATUS_H + 8, 4, S.error);
run(142, H - STATUS_H + 8, 4, S.warning);
run(W - 200, H - STATUS_H + 8, 10, F.secondary);
run(W - 110, H - STATUS_H + 8, 8, F.secondary);

// ----------------------------------------------------------------- swatches
// Drawn over the sidebar's lower half so the sheet is one image.
const SW_Y = H - STATUS_H - 250;
rect(6, SW_Y, SIDE_W - 12, 244, N.well);
rect(6, SW_Y, SIDE_W - 12, 1, N.border);
rect(6, SW_Y + 243, SIDE_W - 12, 1, N.border);

const swatches = [
  ['neutrals', [N.well, N.editorBg, N.panelBg, N.chromeBg, N.hoverBg, N.inactiveSelBg, N.selectionBg]],
  ['edges',    [N.border, N.indentGuide, N.indentGuideActive, N.scrollSlider, N.scrollSliderHover, N.scrollSliderActive]],
  ['text',     [F.primary, F.secondary, F.mutedOnChrome, F.muted, X.comment]],
  ['identity', [S.accent, X.function, X.keyword, X.operator, X.decorator]],
  ['warm',     [X.number, X.string, X.tagComponent, X.parameter]],
  ['cool',     [X.type, X.tagIntrinsic, X.templatePunct, X.property, X.regex, X.attribute, X.punctuation]],
  ['state',    [S.error, S.warning, S.gitAdded, S.gitModified, S.cursor, S.info]],
];
let sy = SW_Y + 10;
for (const [, cols] of swatches) {
  const bw = Math.floor((SIDE_W - 26) / cols.length);
  cols.forEach((c, i) => {
    rect(13 + i * bw, sy, bw - 2, 24, c);
    rect(13 + i * bw, sy + 24, bw - 2, 1, N.well);
  });
  sy += 33;
}

// ----------------------------------------------------------------- encode
const raw = Buffer.alloc(H * (W * 3 + 1));
for (let j = 0; j < H; j++) {
  raw[j * (W * 3 + 1)] = 0;
  Buffer.from(px.buffer, j * W * 3, W * 3).copy(raw, j * (W * 3 + 1) + 1);
}
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return buf => { let c = -1; for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
})();
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = path.join(ROOT, 'preview.png');
fs.writeFileSync(out, png);
console.log(`preview written: ${out} (${W}x${H}, ${png.length.toLocaleString()} bytes)`);
