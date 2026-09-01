# Deep Azure

A deep navy color theme for **Visual Studio 2022**, tuned for JavaScript, TypeScript, JSX/TSX and CSS.

Cool blue-tinted neutrals around hue 210°, warm peach and tan for strings and numbers, italic
comments, keywords and parameters. Contrast is deliberately held in a soft band — bright enough to
read all day, never sharp. No pure black, no pure white; nothing is lighter than `#D6DEEB`.

Derived from [Night Owl](https://github.com/sdras/night-owl-vscode-theme) by Sarah Drasner (MIT) —
see [Credit](#credit).

---

## How it is built

VS 2022 loads themes from a compiled `.pkgdef` inside a VSIX. Nothing here hand-authors `.vstheme`
XML. The chain is:

```
theme/palette.json          the one place colors are defined
        |  scripts/build-theme.js
        v
theme/DeepAzure.json        complete VS Code theme JSON (561 workbench keys, all explicit)
        |  scripts/contrast-check.js   <- verification gate, build stops here on failure
        |  ThemeConverter.exe -i ... -o build/
        v
build/DeepAzure.pkgdef
        |  MSBuild vsix/DeepAzure.csproj
        v
vsix/bin/Release/DeepAzure.vsix
```

### Why the theme JSON is generated, not hand-written

ThemeConverter expects a **fully expanded** theme: every workbench color key present and explicitly
set. An omitted key does not fall back sensibly — it converts to a bad value, which is how converted
themes end up with black-on-black tool windows.

The usual way to get a complete baseline is to run `Developer: Generate Color Theme from Current
Settings` in VS Code and uncomment the result. This project takes a more reliable route:
`scripts/baseline-keys.json` is ThemeConverter's own `Complete_Dark.json` test fixture — the
converter's reference for what "complete" means. `build-theme.js` assigns a palette color to every
key in it and **fails the build** if even one is left unassigned. That is why the build prints
`561 required, 0 extra`.

---

## Prerequisites

| Tool | Needed for | Status on this machine |
|---|---|---|
| Node.js | building + verifying the theme JSON | **present** (v24.15.0) |
| Git | fetching ThemeConverter | **present** (2.54.0) |
| .NET SDK | building ThemeConverter -> `.pkgdef` | **present** (8.0.424, user-local) |
| VS 2022 + "Visual Studio extension development" workload | packaging the `.vsix`, and running the theme | **missing** - install from <https://visualstudio.microsoft.com/downloads/> |

### About the .NET SDK install

The SDK was installed **per-user** into `%USERPROFILE%\.dotnet` with Microsoft's official
`dotnet-install.ps1`, so it needed no administrator rights and touched nothing under
`Program Files`. It is not on your `PATH` permanently. Either prepend it per session:

```powershell
$env:PATH = "$env:USERPROFILE\.dotnet;$env:PATH"
```

or add it to your user `PATH` once via **System Properties -> Environment Variables**.
To remove it later, delete the `%USERPROFILE%\.dotnet` folder -- that is the whole install.

ThemeConverter targets `net6.0`, which is out of support, so the build script sets
`DOTNET_ROLL_FORWARD=Major` and runs it on the .NET 8 runtime. It also sets `DOTNET_ROOT` and
invokes the tool through `dotnet ThemeConverter.dll`, because the app host compiled into
`ThemeConverter.exe` does not look in a user-local SDK directory and would otherwise fail with
"You must install .NET to run this application."

The theme JSON, the contrast report and **`build/DeepAzure.pkgdef` all build today**. Only the
final `.vsix` packaging step needs VS 2022.

---

## Build

```powershell
npm run build      # theme JSON + contrast report
npm run vsix       # the whole chain: theme -> report -> pkgdef -> vsix

# if the user-local SDK is not on PATH for this session:
$env:PATH = "$env:USERPROFILE\.dotnet;$env:PATH"; npm run vsix
```

Stages 1-5 (through `build/DeepAzure.pkgdef`) complete on this machine now. Stage 6 stops with a
clear message until VS 2022 is installed.

`scripts/build-vsix.ps1` clones and builds ThemeConverter into `.tools/` on first run and caches it
after that. It refuses to continue if the contrast report fails.

### Fast iteration loop

Building a VSIX for every color tweak is slow. ThemeConverter's `-t` flag patches a VS installation
in place and launches it with the theme already applied:

```powershell
.\scripts\build-vsix.ps1 -LaunchVS "C:\Program Files\Microsoft Visual Studio\2022\Community"
```

Use that while tuning. Build the VSIX only at the end.

### ThemeConverter quirks the build works around

Three behaviours in ThemeConverter will bite anyone converting a theme, so the build handles all
three rather than leaving them to be discovered later:

1. **The theme's display name comes from the input FILENAME**, not the `name` field inside the JSON
   (`Converter.cs`: `Path.GetFileNameWithoutExtension(themeJsonFilePath)`). Converting
   `DeepAzure.json` registers a theme called "DeepAzure". The build stages a copy named
   `Deep Azure.json` in a temp folder and converts that instead, so it reads correctly under
   **Tools -> Theme**.

2. **The theme GUID is `Guid.NewGuid()` on every run** (`Converter.cs:116`). Left alone, every
   rebuild registers as a brand-new theme: duplicates accumulate under Tools -> Theme, and the
   user's selected theme resets on each update. `scripts/finalize-pkgdef.js` rewrites it to a GUID
   generated once and pinned (`{a94d99c4-...}`), leaving the built-in Dark `FallbackId` untouched.
   With that in place, two consecutive builds produce **byte-identical** pkgdefs.

3. **It resolves its own mapping files relative to the current working directory**, not to the
   assembly location, so it fails with `Could not find file '...TokenMappings.json'` unless invoked
   from its output folder. The build pushes into `.tools/converter-bin` around each call.

### One palette entry that does nothing in VS

`state.cursor` (`#7E57C2`) has no effect in Visual Studio. ThemeConverter maps
`editorCursor.foreground` to an **empty** VS token list, so the caret color is simply dropped. In VS
the caret follows the Plain Text foreground. The entry is kept because it is correct for the VS Code
JSON, but do not expect changing it to move anything in VS.

---

## Install

### From a GitHub release (no build required)

Grab the latest from the **[Releases](../../releases)** page:

| File | For | How |
|---|---|---|
| `DeepAzure.vsix` | Visual Studio 2022 | double-click it, restart VS, then **Tools -> Theme -> Deep Azure** |
| `DeepAzure-VSCode.vsix` | VS Code | `code --install-extension DeepAzure-VSCode.vsix`, or Extensions pane -> `...` -> *Install from VSIX* |
| `DeepAzure.pkgdef` | VS 2022, manual | for dropping straight into a VS install (see below) |

That is the normal way to use this: no toolchain, no build, same as any other theme you download.

Releases are produced by `.github/workflows/release.yml` on a `v*` tag. It runs on
`windows-latest`, which ships VS 2022 Enterprise **including the VSSDK build targets**, so the
`.vsix` is packaged by the real Microsoft toolchain rather than hand-assembled -- and nobody needs
VS 2022 installed locally to cut a release. Push a tag to publish:

```bash
git tag v1.0.1 && git push origin v1.0.1
```

The workflow also runs the contrast report and fails the build if any assertion regresses, and
regenerates the icon to confirm it still matches the palette.

### Without a VSIX

If you have the `.pkgdef` but not the VS extension development workload, copy it in by hand:

```powershell
copy build\DeepAzure.pkgdef "C:\Program Files\Microsoft Visual Studio2\Community\Common7\IDE\CommonExtensions\Platform\"
& "C:\Program Files\Microsoft Visual Studio2\Community\Common7\IDE\devenv.exe" /updateConfiguration
```

(Run that shell as Administrator -- it writes under `Program Files`.)

---

## Seeing it in VS Code

**The VS 2022 pipeline produces nothing VS Code can load** -- `.pkgdef` / VSSDK `.vsix` and a VS Code
extension are different package formats, so Deep Azure will never show up in the VS Code Extensions
pane just because the VS 2022 build succeeded. That is a separate install, built from the same
`theme/DeepAzure.json`:

```powershell
npm run vscode              # package a VS Code .vsix and install it
npm run vscode:uninstall    # remove it
```

Then **restart VS Code** and press <kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>Ctrl</kbd>+<kbd>T</kbd> ->
**Deep Azure**.

On a machine without VS 2022 this is also the only way to actually *look* at the theme.

Two implementation notes:

- The `.vsix` is assembled directly with `System.IO.Compression` rather than `@vscode/vsce`, keeping
  the project at zero npm dependencies. It uses `ZipFile::CreateFromDirectory` specifically because
  `Compress-Archive` on Windows PowerShell 5.1 can write `\` path separators, which the OPC reader
  rejects.
- It installs through `code --install-extension`, not by copying a folder into
  `~/.vscode/extensions`. VS Code registers extensions in `extensions.json` and reads that cache
  rather than rescanning the directory, so a folder drop is not reliably picked up -- it will sit
  there looking correct and never appear in the theme picker.

### Checking the rendering

`samples/` has the three files the brief's checklist calls for:

| File | What to look for |
|---|---|
| `sample.tsx` | italic comments, keywords and parameters; JSX intrinsic tags (teal) vs component tags (tan); template-literal `${}` punctuation; regex |
| `sample.css` | selector / property / value / unit each a different color |
| `package.json` | keys distinct from string values; numbers and booleans distinct again |

Nothing should render as unstyled default-foreground text.

## Tweaking a color

Every color in the theme traces back to `theme/palette.json`. Nothing else holds a literal hex.

1. Edit the hex in `theme/palette.json`.
2. `npm run build`.
3. Read the report. If an assertion fails it tells you the exact pair and the floor it missed.

Roles are grouped so a change lands everywhere it should — editing `state.accent` moves the focus
border, the active tab indicator, links, buttons, badges *and* the syntax color for function names
in one go, because they are all the same design decision.

Derived tints (hover washes, merge-conflict bands, bright ANSI variants) are computed from palette
entries by `mix()` in `build-theme.js`, so they follow along automatically.

### The contrast rules

`scripts/contrast-check.js` asserts this theme's **own** floors, not standard WCAG AA. Deep Azure
sits below AA in places on purpose — that softness is the design — so the checker encodes both
floors *and* ceilings:

| Rule | Bound |
|---|---|
| Primary editor text vs editor background | 10.0–14.0:1 (a ceiling, not just a floor) |
| Every syntax token vs editor background | ≥ 4.0:1 |
| Comments | ≥ 3.5:1 — recessive but readable |
| Secondary / muted UI text vs its own background | ≥ 3.5:1 |
| Borders, icons, indent guides vs adjacent surface | ≥ 1.6:1 |
| Surface tonal steps (panel vs chrome, line highlight) | ≥ 1.08:1 |
| Any token over the selection background | ≥ 4.0:1 |
| Error / warning / added / removed under deuteranopia | separated by lightness, not hue |
| Token HSL saturation | ≤ 0.78 |
| Any foreground's relative luminance | ≤ that of `#D6DEEB` |
| `#000000` / `#FFFFFF` | banned outright |

Current status: **113/113 assertions pass.**

Two notes on how those are scoped, both deliberate:

- **Error red is excluded from the find-match check.** Holding `editor.findMatchBackground` to
  4.0:1 against error red would have crushed the highlight to 1.3:1 against the editor — an
  invisible find match. Error red marks squiggled text; it never renders as the body of a match.
- **The tonal-step floor is 1.08, not 1.6.** Background washes are not edges. Contrast ratio badly
  understates perceptibility between two large adjacent fields, and the actual boundary is drawn by
  `panel.border` (1.8:1 against the panel), not by the tonal step.

---

## Colors changed from the original design

The brief's palette was treated as intent, not gospel. Twelve values had to move to satisfy the
rules above; each is a minimal adjustment that preserves hue and role.

| Role | From | To | Why |
|---|---|---|---|
| Accent / function name | `#82AAFF` | `#90AFF1` | HSL saturation was 1.000, over the 0.78 cap |
| Class / type / JSX component / CSS selector | `#FFCB8B` | `#F2CA98` | saturation 1.000 > 0.78 |
| Number / CSS unit | `#F78C6C` | `#ED9176` | saturation 0.897 > 0.78 |
| Error / git removed | `#EF5350` | `#EA5855` | saturation 0.832 > 0.78 |
| `invalid.illegal` | `#EF5350` | `#ED7370` | only 3.34:1 over the selection background; floor is 4.0:1 |
| Warning | `#FFEB95` | `#D9C46A` | luminance 0.834 exceeded `#D6DEEB` (0.725) — it was the brightest thing on screen |
| Border / separator | `#0E2A42` | `#194A74` | was **1.01:1** against the title bar — separators vanished entirely |
| Indent guide | `#12314A` | `#184264` | 1.25:1 against the sidebar; floor is 1.6:1 |
| Active indent guide | `#2A5177` | `#26669B` | keep a clear step above the raised inactive guide |
| Find match background | `#1B4B6B` | `#163C56` | keyword purple sat at 3.85:1 on it |
| Other find matches | `#153A54` | `#102C40` | kept one tonal step below the primary match |
| Muted text on chrome | `#5F7E97` | `#618099` | inactive tab labels were 3.49:1 against the title bar |

Two colors were also **split** because one value could not serve both jobs:

- **Scrollbar / minimap sliders** got their own ramp (`#20425D` → `#2C597D` → `#3973A2`). They had
  reused `inactiveSelBg`, and lifting that to the 1.6:1 visibility floor would have made the
  *inactive* selection lighter than the *active* one — inverting the selection hierarchy.
- **Muted foreground** split into `fg.muted` (on the editor and panels) and `fg.mutedOnChrome` (on
  the lighter title bar and tab strip), because a single tone could not clear 3.5:1 on both.

The saturation cap is the change you will notice most: it is what keeps the theme "muted-vivid" and
off the neon end, exactly as the brief asked, but it does pull the blues and oranges a step back
from Night Owl's originals.

---

## Layout

```
deep-azure/
  theme/
    palette.json          the one place colors are defined
    DeepAzure.json        generated - complete VS Code theme JSON
  scripts/
    build-theme.js        palette -> DeepAzure.json (fails if any key is unassigned)
    contrast-check.js     verification + printed report
    finalize-pkgdef.js    pins the theme GUID + verifies the display name
    install-vscode.ps1    packages + installs the VS Code extension
    make-vsix-zip.ps1     OPC-correct zip packer shared by script + CI
    make-icon.js          renders vsix/icon.png from the palette
    build-vsix.ps1        full chain: theme -> check -> pkgdef -> vsix
    baseline-keys.json    ThemeConverter's Complete_Dark.json - the required key set
  build/
    DeepAzure.pkgdef      generated - 145,689 bytes, 59 color categories
  vscode/                 VS Code extension manifest, icon, generated .vsix
  .github/workflows/      CI: build, verify, publish releases
  samples/                .tsx / .css / package.json for eyeballing the result
  vsix/                   VSIX project + built DeepAzure.vsix
  LICENSE.txt
  README.md
```

`theme/DeepAzure.json` is generated. Edit `palette.json` and rebuild rather than editing it directly.

---

## Uninstall

**If installed from the VSIX** — Extensions → Manage Extensions → Installed → Deep Azure →
Uninstall, then restart VS.

**If the pkgdef was copied in by hand** — delete it and refresh the configuration:

```powershell
del "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Platform\DeepAzure.pkgdef"
& "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\devenv.exe" /updateConfiguration
```

Adjust `Community` to `Professional` or `Enterprise` to match your install. Switch to another theme
under **Tools → Theme** first, or VS will start on a theme that no longer exists.

---

## Credit

Deep Azure is a derivative of **[Night Owl](https://github.com/sdras/night-owl-vscode-theme)** by
**Sarah Drasner**, used under the MIT License. The navy field, the warm/cool split, and many of the
syntax hues originate there. Full license text in `LICENSE.txt`.
