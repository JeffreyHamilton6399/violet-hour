#!/usr/bin/env node
/**
 * Violet Hour contrast verification.
 *
 * Violet Hour deliberately sits below the usual WCAG AA targets in places -- that
 * softness is the design. So this asserts the theme's OWN floors and ceilings,
 * not standard accessibility floors. Run after every build:
 *
 *   node scripts/build-theme.js && node scripts/contrast-check.js
 *
 * Exits non-zero if any assertion fails.
 *
 * Usage:
 *   node scripts/contrast-check.js                  both variants
 *   node scripts/contrast-check.js --variant light  just one
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VARIANTS = {
  dark:  { palette: 'theme/palette.dark.json',  theme: 'theme/VioletHour.json' },
  light: { palette: 'theme/palette.light.json', theme: 'theme/VioletHour-Light.json' },
};
const argIdx = process.argv.indexOf('--variant');
const wanted = argIdx > -1 ? [process.argv[argIdx + 1]] : Object.keys(VARIANTS);

let grandFail = 0, grandTotal = 0;
for (const key of wanted) { audit(key, VARIANTS[key]); }
process.exit(grandFail ? 1 : 0);

function audit(variantName, V) {
const P = JSON.parse(fs.readFileSync(path.join(ROOT, V.palette), 'utf8'));
const T = JSON.parse(fs.readFileSync(path.join(ROOT, V.theme), 'utf8'));
const N = P.neutral, F = P.fg, S = P.state, X = P.syntax;
const isLight = T.type === 'light';

// ------------------------------------------------------------------ color math
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const lum = h => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

function hsl(h) {
  const [r, g, b] = rgb(h);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (d !== 0) {
    if (mx === r) hue = 60 * (((g - b) / d) % 6);
    else if (mx === g) hue = 60 * ((b - r) / d + 2);
    else hue = 60 * ((r - g) / d + 4);
  }
  return { h: (hue + 360) % 360, s, l };
}

/** Brettel/Vienot-style deuteranope simulation (LMS, deutan matrix). Enough to
 *  answer the only question we ask of it: do red and green still separate? */
function deuter(h) {
  const [r, g, b] = rgb(h).map(lin);
  const L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
  const M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
  const Sc = 0.0299566 * r + 0.184309 * g + 1.46709 * b;
  const L2 = L, M2 = 0.494207 * L + 1.24827 * Sc, S2 = Sc;
  const clamp = v => Math.min(1, Math.max(0, v));
  const r2 = clamp(0.080944 * L2 - 0.130504 * M2 + 0.116721 * S2);
  const g2 = clamp(-0.0102485 * L2 + 0.0540194 * M2 - 0.113615 * S2);
  const b2 = clamp(-0.000365294 * L2 - 0.00412163 * M2 + 0.693513 * S2);
  return 0.2126 * r2 + 0.7152 * g2 + 0.0722 * b2; // simulated relative luminance
}

// ------------------------------------------------------------------- reporting
let failures = 0, checks = 0;
const rows = [];
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

function check(section, label, value, test, expectation) {
  checks++;
  const ok = test(value);
  if (!ok) failures++;
  rows.push({ section, label, value, expectation, ok });
  return ok;
}

const contrast = (section, label, fg, bg, test, expectation) =>
  check(section, `${label}  ${fg} on ${bg}`, ratio(fg, bg).toFixed(2) + ':1', v => test(parseFloat(v)), expectation);

const EDITOR = N.editorBg;
const LUM_CAP = lum(F.primary);

// ------------------------------------------------------- 1. primary body text
contrast('Primary text', 'editor.foreground', F.primary, EDITOR,
  v => v >= 10 && v <= 14, '10.0-14.0:1');

// ------------------------------------------------------------- 2. syntax tokens
const SYNTAX_FLOOR = 4.0;
for (const [name, color] of Object.entries(X)) {
  if (name === 'comment') continue; // has its own, lower floor
  contrast('Syntax vs editor bg', name, color, EDITOR, v => v >= SYNTAX_FLOOR, `>= ${SYNTAX_FLOOR.toFixed(1)}:1`);
}

// ------------------------------------------------------------------ 3. comments
contrast('Comments', 'comment', X.comment, EDITOR, v => v >= 3.5, '>= 3.5:1');

// ------------------------------------- 4. secondary / muted text on ITS own bg
// Values are read back out of the BUILT theme, not re-derived from the palette,
// so the report always describes what actually ships.
const K = k => T.colors[k];
const uiText = [
  ['sideBar.foreground', K('sideBar.foreground'), K('sideBar.background')],
  ['titleBar.activeForeground', K('titleBar.activeForeground'), K('titleBar.activeBackground')],
  ['titleBar.inactiveForeground', K('titleBar.inactiveForeground'), K('titleBar.inactiveBackground')],
  ['statusBar.foreground', K('statusBar.foreground'), K('statusBar.background')],
  ['tab.inactiveForeground', K('tab.inactiveForeground'), K('tab.inactiveBackground')],
  ['tab.unfocusedInactiveForeground', K('tab.unfocusedInactiveForeground'), K('tab.unfocusedInactiveBackground')],
  ['editorLineNumber.foreground', K('editorLineNumber.foreground'), K('editor.background')],
  ['breadcrumb.foreground', K('breadcrumb.foreground'), K('breadcrumb.background')],
  ['descriptionForeground', K('descriptionForeground'), K('sideBar.background')],
  ['list.deemphasizedForeground', K('list.deemphasizedForeground'), K('sideBar.background')],
  ['panelTitle.inactiveForeground', K('panelTitle.inactiveForeground'), K('panel.background')],
  ['editorCodeLens.foreground', K('editorCodeLens.foreground'), K('editor.background')],
  ['editorInlayHint.foreground', K('editorInlayHint.foreground'), K('editorInlayHint.background')],
];
for (const [label, fg, bg] of uiText) {
  contrast('Secondary / muted UI text', label, fg, bg, v => v >= 3.5, '>= 3.5:1');
}

// ------------------------------------ 5. borders / guides vs adjacent surface
const edges = [
  ['panel.border vs editor', K('panel.border'), K('editor.background')],
  ['panel.border vs panel', K('panel.border'), K('panel.background')],
  ['titleBar.border vs title bar', K('titleBar.border'), K('titleBar.activeBackground')],
  ['statusBar.border vs status bar', K('statusBar.border'), K('statusBar.background')],
  ['tab.border vs inactive tab', K('tab.border'), K('tab.inactiveBackground')],
  ['editorIndentGuide vs editor', K('editorIndentGuide.background'), K('editor.background')],
  ['editorIndentGuide.active vs editor', K('editorIndentGuide.activeBackground'), K('editor.background')],
  ['active vs inactive indent guide', K('editorIndentGuide.activeBackground'), K('editorIndentGuide.background')],
  ['editorRuler vs editor', K('editorRuler.foreground'), K('editor.background')],
  ['tree.indentGuidesStroke vs sidebar', K('tree.indentGuidesStroke'), K('sideBar.background')],
  ['scrollbarSlider vs panel', K('scrollbarSlider.background'), K('panel.background')],
  ['scrollbarSlider vs editor', K('scrollbarSlider.background'), K('editor.background')],
  ['minimapSlider vs editor', K('minimapSlider.background'), K('editor.background')],
  ['input.border vs input bg', K('input.border'), K('input.background')],
  ['icon.foreground vs sidebar', K('icon.foreground'), K('sideBar.background')],
  ['editorBracketMatch.border vs editor', K('editorBracketMatch.border'), K('editor.background')],
  ['editorGutter fold control vs editor', K('editorGutter.foldingControlForeground'), K('editor.background')],
];
for (const [label, a, b] of edges) {
  contrast('Borders / guides / icons', label, a, b, v => v >= 1.6, '>= 1.6:1');
}

// --------------------------------- 5b. surface separation (subtle tonal steps)
// These are background washes, not edges: the brief wants panels "separated by
// subtle tonal steps, not bright borders", so they get a perceptibility floor
// rather than the 1.6:1 edge floor. The floor is 1.08 because contrast ratio
// badly understates perceptibility for two large adjacent fields, and because
// the actual boundary is drawn by panel.border (1.8:1 against panel), not by
// the tonal step. The chrome ramp is deliberately at the low end of this.
const steps = [
  ['editor vs panel', K('editor.background'), K('panel.background')],
  ['panel vs chrome (title bar)', K('panel.background'), K('titleBar.activeBackground')],
  ['editor vs current-line highlight', K('editor.background'), K('editor.lineHighlightBackground')],
  ['editor vs find match', K('editor.background'), K('editor.findMatchBackground')],
  ['editor vs selection', K('editor.background'), K('editor.selectionBackground')],
  ['inactive vs active selection', K('editor.inactiveSelectionBackground'), K('editor.selectionBackground')],
  ['find match vs other matches', K('editor.findMatchBackground'), K('editor.findMatchHighlightBackground')],
  ['active tab vs inactive tab', K('tab.activeBackground'), K('tab.inactiveBackground')],
  ['panel vs hover', K('panel.background'), K('list.hoverBackground')],
];
for (const [label, a, b] of steps) {
  contrast('Surface tonal steps', label, a, b, v => v >= 1.08, '>= 1.08:1');
}

// ------------------------------------------------- 6. text over selection bg
const overSelection = [
  ['editor.foreground', F.primary],
  ['string', X.string],
  ['keyword', X.keyword],
  ['function', X.function],
  ['type', X.type],
  ['property', X.property],
  ['number', X.number],
  ['punctuation', X.punctuation],
  ['parameter', X.parameter],
  ['regex', X.regex],
  ['invalid', X.invalid],
];
for (const [label, fg] of overSelection) {
  contrast('Text on selection', label, fg, N.selectionBg, v => v >= 4.0, '>= 4.0:1');
}
// Error-red is excluded here: it marks squiggled text, and never renders as the
// body of a find match. Holding findMatchBg to it would crush the highlight to
// 1.3:1 against the editor -- invisible.
for (const [label, fg] of overSelection.filter(([l]) => l !== 'invalid')) {
  contrast('Text on find match', label, fg, S.findMatchBg, v => v >= 4.0, '>= 4.0:1');
}

// --------------------------------------------- 7. deuteranopia separation
// Under deuteranopia red and green collapse toward the same hue, so they must
// separate by LIGHTNESS instead. Assert a meaningful simulated-luminance gap.
const pairs = [
  ['error vs gitAdded', S.error, S.gitAdded],
  ['gitRemoved vs gitAdded', S.gitRemoved, S.gitAdded],
  ['error vs warning', S.error, S.warning],
  ['gitAdded vs gitModified', S.gitAdded, S.gitModified],
];
for (const [label, a, b] of pairs) {
  const la = deuter(a), lb = deuter(b);
  const r = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  const min = label === 'gitAdded vs gitModified' ? 1.10 : 1.45;
  check('Deuteranopia separation', `${label}  ${a} / ${b}`, r.toFixed(2) + ':1',
    v => parseFloat(v) >= min, `>= ${min.toFixed(2)}:1 simulated`);
}

// ------------------------------------------- 8. saturation & luminance ceilings
for (const [name, color] of Object.entries(X)) {
  check('Saturation ceiling', `${name}  ${color}`, hsl(color).s.toFixed(3),
    v => parseFloat(v) <= 0.78, '<= 0.780');
}

// Every foreground color used anywhere in the theme must not out-shine #D6DEEB.
const fgKeys = Object.keys(T.colors).filter(k =>
  /[Ff]oreground$/.test(k) || k === 'foreground');
const allFg = new Map();
for (const k of fgKeys) allFg.set(T.colors[k], k);
for (const r of T.tokenColors) allFg.set(r.settings.foreground, `tokenColors: ${r.name}`);
for (const [k, v] of Object.entries(T.semanticTokenColors)) allFg.set(v.foreground, `semantic: ${k}`);

// On a dark theme nothing may out-shine the body text; on a light theme the
// rule inverts - nothing may be DARKER than it, or it out-weights the prose.
const offenders = [];
for (const [color, where] of allFg) {
  const bad = isLight ? lum(color) < LUM_CAP - 1e-9 : lum(color) > LUM_CAP + 1e-9;
  if (bad) offenders.push(`${color} (${where})`);
}
check(isLight ? 'Luminance floor' : 'Luminance ceiling',
  `all ${allFg.size} distinct foreground colors ${isLight ? '>=' : '<='} luminance of ${F.primary}`,
  offenders.length ? offenders.join(', ') : (isLight ? 'none below' : 'none exceed'),
  v => v === (isLight ? 'none below' : 'none exceed'),
  `${isLight ? '>=' : '<='} ${LUM_CAP.toFixed(4)}`);

// Hard bans from the brief.
const allColors = [...new Set([...Object.values(T.colors), ...allFg.keys()])];
const banned = allColors.filter(h => /^#(000000|FFFFFF)/i.test(h));
check('Hard bans', 'no #000000 / #FFFFFF anywhere in the theme',
  banned.length ? banned.join(', ') : 'none present', v => v === 'none present', 'none');

// ----------------------------------------------------------------- print table
const W = { sec: 26, lab: 52, val: 12, exp: 22 };
let current = null;
console.log('\n' + '='.repeat(122));
console.log(`  VIOLET HOUR - CONTRAST REPORT  (${variantName})`);
console.log('='.repeat(122));
for (const r of rows) {
  if (r.section !== current) {
    current = r.section;
    console.log('\n' + r.section);
    console.log('-'.repeat(122));
  }
  console.log(
    '  ' + pad(r.label, W.lab + W.sec - 2) +
    padL(r.value, W.val) + '   ' +
    pad(r.expectation, W.exp) +
    (r.ok ? 'PASS' : 'FAIL')
  );
}
console.log('\n' + '='.repeat(122));
console.log(`  ${variantName}: ${checks - failures}/${checks} assertions passed` + (failures ? `  --  ${failures} FAILED` : '  --  all clear'));
console.log('='.repeat(122) + '\n');

grandFail += failures; grandTotal += checks;
}
