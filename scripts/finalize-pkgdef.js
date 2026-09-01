#!/usr/bin/env node
/**
 * Post-processes the .pkgdef that ThemeConverter emits, and verifies it.
 *
 * Two things have to be corrected, both consequences of how ThemeConverter works:
 *
 *  1. It takes the theme's display name from the INPUT FILENAME
 *     (Converter.cs: `Path.GetFileNameWithoutExtension(themeJsonFilePath)`),
 *     ignoring the "name" field inside the JSON. The build works around that by
 *     staging a copy named "Deep Azure.json", so this script only asserts it.
 *
 *  2. It stamps a `Guid.NewGuid()` on every run (Converter.cs:116). A random
 *     theme GUID per build means each rebuild registers as a BRAND NEW theme:
 *     stale duplicates pile up under Tools > Theme and the user's selection
 *     resets on every update. So we pin it to a GUID generated once, below.
 *
 * Usage: node scripts/finalize-pkgdef.js <input.pkgdef> <output.pkgdef>
 */
'use strict';
const fs = require('fs');

// Generated once for this theme. Must never change across releases -- VS keys
// the installed theme off it.
const THEME_GUID = '{a94d99c4-5bde-4e9e-bb06-4ffa2cc54b28}';
const THEME_NAME = 'Deep Azure';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: node scripts/finalize-pkgdef.js <input.pkgdef> <output.pkgdef>');
  process.exit(2);
}

let text = fs.readFileSync(inPath, 'utf8');
const bom = text.charCodeAt(0) === 0xfeff;
if (bom) text = text.slice(1);

// --- verify the display name landed -----------------------------------------
const nameMatch = text.match(/^"Name"="(.*)"$/m);
if (!nameMatch) {
  console.error('FAILED: no "Name" value found in the pkgdef.');
  process.exit(1);
}
if (nameMatch[1] !== THEME_NAME) {
  console.error(`FAILED: theme registered as "${nameMatch[1]}", expected "${THEME_NAME}".`);
  console.error('        ThemeConverter names the theme after the input FILENAME -- stage the');
  console.error(`        JSON as "${THEME_NAME}.json" before converting.`);
  process.exit(1);
}

// --- pin the GUID -----------------------------------------------------------
const guidRe = /\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\}/g;
const found = text.match(guidRe) || [];

// The theme's own GUID is the one in the [$RootKey$\Themes\{...}] section
// headers. Fallback IDs (the built-in Dark/Light themes) must be left alone.
const headerRe = /^\[\$RootKey\$\\Themes\\(\{[0-9a-fA-F-]{36}\})/m;
const header = text.match(headerRe);
if (!header) {
  console.error('FAILED: could not locate the [$RootKey$\\Themes\\{guid}] section header.');
  process.exit(1);
}
const generated = header[1];

if (generated.toLowerCase() === THEME_GUID.toLowerCase()) {
  console.log(`  theme GUID already pinned: ${THEME_GUID}`);
} else {
  const before = text.split(generated).length - 1;
  text = text.split(generated).join(THEME_GUID);
  console.log(`  theme GUID pinned: ${generated} -> ${THEME_GUID} (${before} occurrence(s))`);
}

// --- report -----------------------------------------------------------------
const sections = (text.match(/^\[\$RootKey\$/gm) || []).length;
const categories = (text.match(/^\[\$RootKey\$\\Themes\\\{[0-9a-fA-F-]{36}\}\\/gm) || []).length;
const fallback = text.match(/^"FallbackId"="(.*)"$/m);
const otherGuids = [...new Set(found.map(g => g.toLowerCase()))]
  .filter(g => g !== generated.toLowerCase());

fs.writeFileSync(outPath, '﻿' + text, 'utf8');

console.log(`  name            : ${nameMatch[1]}`);
console.log(`  fallback theme  : ${fallback ? fallback[1] : '(none)'} (built-in Dark, left as-is)`);
console.log(`  color categories: ${categories}`);
console.log(`  pkgdef sections : ${sections}`);
if (otherGuids.length) console.log(`  other GUIDs kept: ${otherGuids.join(', ')}`);
console.log(`  written         : ${outPath} (${fs.statSync(outPath).size.toLocaleString()} bytes)`);
