# Changelog

All notable changes to Violet Hour are documented here.
This project follows [Semantic Versioning](https://semver.org/).

## [2.3.1] - 2026-09-01

### Added
- `npm run upload` fetches the Marketplace package for the latest release into `upload/`,
  named with its version, so a stale file cannot be uploaded by mistake.


### Fixed
- CI converted only the dark variant to a pkgdef. The VS 2022 package still built, but
  only because a generated `VioletHour-Light.pkgdef` had been committed by mistake and
  MSBuild picked up that stale file instead of failing. CI now converts both variants and
  the generated pkgdefs are gitignored.

## [2.3.0] - 2026-09-01

### Added
- **Violet Hour Light.** The same hue plan solved against a bright ground, shipping in the
  same extension — both themes appear in the picker.
- A light theme is not an inverted dark one, and three constraints flip: the neutral ramp
  descends from the editor, edges solve against the *darkest* adjacent surface rather than
  the lightest, and the luminance rule becomes a floor instead of a ceiling. The selection
  background binds instead of the editor. Light passes the same 113 assertions.
- Visual Studio 2022 gets both themes too — two pkgdefs in one VSIX, each with its own
  pinned GUID, the light one falling back to VS's built-in Light theme.

### Changed
- `theme/palette.json` split into `palette.dark.json` and `palette.light.json`.
- `build-theme.js` and `contrast-check.js` take `--variant`; both build and verify all
  variants by default.

### Fixed
- The contrast report header still read "DEEP AZURE" — a leftover the rename missed
  because it was uppercase.

## [2.2.0] - 2026-09-01

### Changed
- **CSS value keywords moved off the string amber** to mint (`#5ECA9B`). Unquoted values
  (`solid`, `ease-in-out`, `var`) are constants rather than strings, and as strings they sat
  6° from the gold selector — the two most frequent tokens in a stylesheet were nearly the
  same colour. CSS is now selector 46° / property 206° / value 156° / unit 14°. Quoted
  strings in CSS still use the string amber, as they should.

### Added
- `npm run preview:markup` renders an HTML + CSS sample. The existing preview only covered
  TSX, which is why the CSS collision went unnoticed.

## [2.1.0] - 2026-09-01

### Changed
- **Cool family consolidated.** `type`, `tagIntrinsic` and `templatePunct` were three
  near-identical aquas within 16° of each other — in TSX, `PanelProps` and `<section>`
  were indistinguishable. Intrinsic tags now deliberately share the `type` color (an
  intrinsic element *is* a type-like thing), and template punctuation moved to mint
  (156°). The cool family is now spaced 136 → 156 → 172 → 206.
- Palette shrank by one distinct color as a result.

### Added
- `scripts/preview.ps1` renders the theme applied to real code with real glyphs, so
  the palette can be reviewed as text rather than as swatches.

## [2.0.1] - 2026-09-01

### Fixed
Five colors corrected after rendering the palette rather than only measuring it.
All had passed every contrast assertion:

- `cursor` `#E868E8` → `#D377EB` — a vivid magenta unrelated to any other hue.
- `gitModified` `#85B941` → `#4A9BDA` — an acid olive, and one of four greens. Blue
  also survives deuteranopia, lifting separation from `gitAdded` from 1.14 to 1.48.
- `attribute` `#A0C86C` → `#8FD5A1` — a fifth green at a fourth hue; now shares the
  regex hue, separated by lightness.
- `parameter` `#D2C9BB` → `#DBC8BC` — a dirty beige reading as dropped-out grey.
- `warning` `#D9B85E` → `#DEA45E` — sat on top of the string amber, and warning
  squiggles render directly beside strings.

### Added
- Opt-in Marketplace publishing via a `VSCE_PAT` repository secret.

## [2.0.0] - 2026-09-01

### Added
- **Violet Hour.** An original deep-violet palette. Every value solved against a
  contrast budget rather than picked by eye; 113 assertions, all passing.
- Neutral ramp derived from contrast targets between adjacent surfaces rather than
  luminance multipliers — at these luminances the `+0.05` term in the contrast
  formula dominates, and fixed multipliers collapse the steps.
- The four status colors solved *together*, because red and green converge under
  deuteranopia and must separate by simulated lightness rather than hue.

### Removed
- Deep Azure, which was a Night Owl derivative. No color in Violet Hour is taken or
  adapted from another theme.

### Fixed
- Attribution for `scripts/baseline-keys.json`, a verbatim copy of `Complete_Dark.json`
  from Microsoft's theme-converter-for-vs (MIT), which had never been credited.
