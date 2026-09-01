<#
.SYNOPSIS
    Renders preview.png: the theme applied to real code, with real glyphs.

.DESCRIPTION
    scripts/preview.js draws token *texture* as coloured runs, which is enough to
    judge hue harmony. It cannot show how the palette reads as actual text --
    whether italics work, whether two colours that pass a contrast check still
    blur into each other at 13px, whether the comment colour recedes too far.

    This renders the same palette through GDI+ with a real monospace face, so
    the result is what a person actually sees. Run after any palette change:

        npm run preview

    Windows-only by nature (System.Drawing + Consolas). The Node renderer stays
    as the portable fallback.
#>
[CmdletBinding()]
param(
    [string]$Out,
    # tsx    - TypeScript + JSX
    # markup - HTML, CSS and JSON, where tags, attributes and strings collide
    #          most densely and are easiest to get wrong
    [ValidateSet('tsx', 'markup')][string]$Sample = 'tsx',
    [ValidateSet('dark', 'light')][string]$Variant = 'dark'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

# $PSScriptRoot is not populated inside a param default block, so resolve here.
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Out) {
    $stem = if ($Variant -eq 'dark') { 'preview' } else { "preview-$Variant" }
    $name = if ($Sample -eq 'tsx') { "$stem.png" } else { "$stem-$Sample.png" }
    $Out = Join-Path $Root $name
}
$P = Get-Content (Join-Path $Root "theme/palette.$Variant.json") -Raw | ConvertFrom-Json
$N = $P.neutral; $F = $P.fg; $S = $P.state; $X = $P.syntax

function C([string]$hex) {
    [System.Drawing.ColorTranslator]::FromHtml($hex)
}

$W = 1120; $H = 720
$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$FONT = 'Consolas'
$sz = 13.5
$fRegular = New-Object System.Drawing.Font($FONT, $sz, [System.Drawing.FontStyle]::Regular, 'Pixel')
$fItalic  = New-Object System.Drawing.Font($FONT, $sz, [System.Drawing.FontStyle]::Italic,  'Pixel')
$fUi      = New-Object System.Drawing.Font('Segoe UI', 12, [System.Drawing.FontStyle]::Regular, 'Pixel')
$fUiSmall = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Regular, 'Pixel')

function Fill($x, $y, $w, $h, $hex) {
    $b = New-Object System.Drawing.SolidBrush(C $hex)
    $g.FillRectangle($b, $x, $y, $w, $h); $b.Dispose()
}
function Text($x, $y, $s, $hex, $italic = $false, $font = $null) {
    if (-not $font) { $font = if ($italic) { $fItalic } else { $fRegular } }
    $b = New-Object System.Drawing.SolidBrush(C $hex)
    $g.DrawString($s, $font, $b, [float]$x, [float]$y,
        [System.Drawing.StringFormat]::GenericTypographic)
    $b.Dispose()
}
# monospace advance, measured once
$CW = $g.MeasureString('MMMMMMMMMM', $fRegular, 1000, [System.Drawing.StringFormat]::GenericTypographic).Width / 10

Fill 0 0 $W $H $N.editorBg

# ------------------------------------------------------------------- chrome
$TITLE = 30; $TAB = 30; $SIDE = 210; $STATUS = 24
Fill 0 0 $W $TITLE $N.chromeBg
Fill 0 ($TITLE - 1) $W 1 $N.border
$dots = @($S.error, $S.warning, $S.gitAdded)
for ($i = 0; $i -lt 3; $i++) {
    $b = New-Object System.Drawing.SolidBrush(C $dots[$i])
    $g.FillEllipse($b, (14 + $i * 18), 11, 9, 9); $b.Dispose()
}
Text 78 7 'panel.tsx - violet-hour - Visual Studio Code' $F.secondary $false $fUi

# sidebar
Fill 0 $TITLE $SIDE ($H - $TITLE - $STATUS) $N.panelBg
Fill ($SIDE - 1) $TITLE 1 ($H - $TITLE - $STATUS) $N.border
Fill 0 $TITLE $SIDE 28 $N.chromeBg
Text 14 ($TITLE + 6) 'EXPLORER' $F.mutedOnChrome $false $fUiSmall

$tree = @(
    @(14, 'violet-hour', $F.secondary, $null),
    @(28, 'src', $F.secondary, $null),
    @(42, 'Panel.tsx', $F.primary, 'M'),
    @(42, 'hooks.ts', $F.secondary, $null),
    @(42, 'theme.css', $F.secondary, 'A'),
    @(28, 'scripts', $F.secondary, $null),
    @(42, 'build-theme.js', $F.secondary, $null),
    @(42, 'contrast-check.js', $F.secondary, $null),
    @(28, 'package.json', $F.secondary, $null),
    @(28, 'README.md', $F.secondary, 'D')
)
$ty = $TITLE + 38
foreach ($row in $tree) {
    if ($row[1] -eq 'Panel.tsx') { Fill 4 ($ty - 3) ($SIDE - 10) 22 $N.selectionBg }
    $col = $row[2]
    if ($row[3] -eq 'M') { $col = $S.gitModified }
    if ($row[3] -eq 'A') { $col = $S.gitAdded }
    if ($row[3] -eq 'D') { $col = $S.gitRemoved }
    Text $row[0] $ty $row[1] $col $false $fUi
    if ($row[3]) { Text ($SIDE - 22) $ty $row[3] $col $false $fUiSmall }
    $ty += 22
}

# tabs
$EX = $SIDE
Fill $EX $TITLE ($W - $EX) $TAB $N.chromeBg
Fill $EX ($TITLE + $TAB - 1) ($W - $EX) 1 $N.border
Fill $EX $TITLE 118 $TAB $N.editorBg
Fill $EX $TITLE 118 2 $S.accent
Text ($EX + 14) ($TITLE + 6) 'Panel.tsx' $F.primary $false $fUi
Text ($EX + 146) ($TITLE + 6) 'theme.css' $F.mutedOnChrome $false $fUi
Text ($EX + 258) ($TITLE + 6) 'package.json' $F.mutedOnChrome $false $fUi

# ------------------------------------------------------------------- editor
$ETOP = $TITLE + $TAB
$EH = $H - $ETOP - $STATUS
Fill $EX $ETOP ($W - $EX) $EH $N.editorBg
Text ($EX + 16) ($ETOP + 6) 'src  >  Panel.tsx  >  Panel' $F.muted $false $fUiSmall

$GUT = $EX + 14; $CODE = $EX + 64; $LH = 22
$y0 = $ETOP + 32

# PowerShell flattens nested arrays, which silently turned single-span lines
# into a bare $true and collapsed the swatch rows. Spans are encoded as
# "text<US>key<US>italic" strings instead - nothing to flatten.
$US = [char]31
$K = @{
  kw = $X.keyword; op = $X.operator; st = $X.string; nu = $X.number; fn = $X.function
  ty = $X.type; va = $X.variable; pa = $X.parameter; pr = $X.property; pu = $X.punctuation
  cm = $X.comment; re = $X.regex; ti = $X.tagIntrinsic; tc = $X.tagComponent
  at = $X.attribute; tp = $X.templatePunct; de = $X.decorator
  cs = $X.cssSelector; cp = $X.cssProperty; cv = $X.cssValue; cu = $X.cssUnit
}
function S([string]$text, [string]$key = '', [bool]$italic = $false) {
  "$text$US$key$US$(if ($italic) { '1' } else { '' })"
}

$lines = @(
  @((S '// the violet hour - the half hour after sunset' 'cm' $true)),
  @((S 'import' 'kw' $true), (S ' React, ' 'va'), (S '{' 'pu'), (S ' useCallback, useMemo, useState ' 'va'), (S '}' 'pu'), (S ' from ' 'kw' $true), (S "'react'" 'st')),
  @((S 'import' 'kw' $true), (S ' type ' 'kw' $true), (S '{' 'pu'), (S ' ReactNode ' 'ty'), (S '}' 'pu'), (S ' from ' 'kw' $true), (S "'react'" 'st')),
  @(),
  @((S 'const' 'kw' $true), (S ' MAX_RETRIES ' 'nu'), (S '=' 'op'), (S ' 3' 'nu'), (S ';' 'pu')),
  @((S 'const' 'kw' $true), (S ' SLUG ' 'nu'), (S '=' 'op'), (S ' /^[a-z0-9]+(?:-[a-z0-9]+)*$/i' 're'), (S ';' 'pu')),
  @(),
  @((S 'export' 'kw' $true), (S ' interface ' 'kw' $true), (S 'PanelProps' 'ty'), (S ' {' 'pu')),
  @((S '  title' 'pr'), (S ': ' 'pu'), (S 'string' 'ty'), (S ';' 'pu')),
  @((S '  count' 'pr'), (S '?: ' 'pu'), (S 'number' 'ty'), (S ';' 'pu')),
  @((S '  onSelect' 'pr'), (S '(' 'pu'), (S 'id' 'pa' $true), (S ': ' 'pu'), (S 'string' 'ty'), (S '): ' 'pu'), (S 'void' 'ty'), (S ';' 'pu')),
  @((S '}' 'pu')),
  @(),
  @((S '@memo' 'de' $true)),
  @((S 'export' 'kw' $true), (S ' function ' 'kw' $true), (S 'Panel' 'fn'), (S '(' 'pu'), (S '{ title, count = ' 'pa' $true), (S '0' 'nu'), (S ' }' 'pa' $true), (S ': ' 'pu'), (S 'PanelProps' 'ty'), (S ') {' 'pu')),
  @((S '  const' 'kw' $true), (S ' [' 'pu'), (S 'status' 'va'), (S ', ' 'pu'), (S 'setStatus' 'fn'), (S '] ' 'pu'), (S '=' 'op'), (S ' useState' 'fn'), (S '<' 'pu'), (S 'Status' 'ty'), (S '>(' 'pu'), (S "'idle'" 'st'), (S ');' 'pu')),
  @((S '  const' 'kw' $true), (S ' label ' 'va'), (S '=' 'op'), (S ' useMemo' 'fn'), (S '(() ' 'pu'), (S '=>' 'op'), (S ' `' 'st'), (S '${' 'tp'), (S 'title' 'va'), (S '}' 'tp'), (S ' (' 'st'), (S '${' 'tp'), (S 'count' 'va'), (S '}' 'tp'), (S ')`' 'st'), (S ', [' 'pu'), (S 'title' 'va'), (S ']);' 'pu')),
  @(),
  @((S '  return' 'kw' $true), (S ' (' 'pu')),
  @((S '    <' 'pu'), (S 'section' 'ti'), (S ' className' 'at'), (S '=' 'op'), (S '"panel"' 'st'), (S '>' 'pu')),
  @((S '      <' 'pu'), (S 'Badge' 'tc'), (S ' tone' 'at'), (S '=' 'op'), (S '{' 'pu'), (S 'status' 'va'), (S '}' 'pu'), (S ' />' 'pu')),
  @((S '      <' 'pu'), (S 'h2' 'ti'), (S '>' 'pu'), (S '{label}' 'va'), (S '</' 'pu'), (S 'h2' 'ti'), (S '>' 'pu')),
  @((S '    </' 'pu'), (S 'section' 'ti'), (S '>' 'pu')),
  @((S '  );' 'pu')),
  @((S '}' 'pu'))
)


$markup = @(
  @((S '<!-- the violet hour -->' 'cm' $true)),
  @((S '<' 'pu'), (S '!DOCTYPE' 'ti'), (S ' html' 'at'), (S '>' 'pu')),
  @((S '<' 'pu'), (S 'html' 'ti'), (S ' lang' 'at'), (S '=' 'op'), (S '"en"' 'st'), (S '>' 'pu')),
  @((S '  <' 'pu'), (S 'head' 'ti'), (S '>' 'pu')),
  @((S '    <' 'pu'), (S 'meta' 'ti'), (S ' charset' 'at'), (S '=' 'op'), (S '"utf-8"' 'st'), (S ' />' 'pu')),
  @((S '    <' 'pu'), (S 'link' 'ti'), (S ' rel' 'at'), (S '=' 'op'), (S '"stylesheet"' 'st'), (S ' href' 'at'), (S '=' 'op'), (S '"/theme.css"' 'st'), (S ' />' 'pu')),
  @((S '    <' 'pu'), (S 'title' 'ti'), (S '>' 'pu'), (S 'Violet Hour' 'va'), (S '</' 'pu'), (S 'title' 'ti'), (S '>' 'pu')),
  @((S '  </' 'pu'), (S 'head' 'ti'), (S '>' 'pu')),
  @((S '  <' 'pu'), (S 'body' 'ti'), (S ' class' 'at'), (S '=' 'op'), (S '"panel panel--dark"' 'st'), (S ' data-theme' 'at'), (S '=' 'op'), (S '"violet"' 'st'), (S '>' 'pu')),
  @((S '    <' 'pu'), (S 'button' 'ti'), (S ' type' 'at'), (S '=' 'op'), (S '"submit"' 'st'), (S ' disabled' 'at'), (S '>' 'pu'), (S 'Reload' 'va'), (S '</' 'pu'), (S 'button' 'ti'), (S '>' 'pu')),
  @((S '  </' 'pu'), (S 'body' 'ti'), (S '>' 'pu')),
  @((S '</' 'pu'), (S 'html' 'ti'), (S '>' 'pu')),
  @(),
  @((S '/* selector / property / value / unit must all differ */' 'cm' $true)),
  @((S ':root' 'cs'), (S ' {' 'pu')),
  @((S '  --bg' 'cp'), (S ': ' 'pu'), (S '#16111f' 'cu'), (S ';' 'pu')),
  @((S '  --gap' 'cp'), (S ': ' 'pu'), (S '1.25' 'cu'), (S 'rem' 'cu'), (S ';' 'pu')),
  @((S '}' 'pu')),
  @((S '.panel' 'cs'), (S ', ' 'pu'), (S '.panel--compact' 'cs'), (S ':hover' 'cs'), (S ' {' 'pu')),
  @((S '  background-color' 'cp'), (S ': ' 'pu'), (S 'var' 'cv'), (S '(' 'pu'), (S '--bg' 'cp'), (S ');' 'pu')),
  @((S '  padding' 'cp'), (S ': ' 'pu'), (S '0' 'cu'), (S ' ' 'pu'), (S '2' 'cu'), (S 'rem' 'cu'), (S ';' 'pu')),
  @((S '  content' 'cp'), (S ': ' 'pu'), (S '"->"' 'st'), (S ';' 'pu')),
  @((S '  border' 'cp'), (S ': ' 'pu'), (S '1' 'cu'), (S 'px' 'cu'), (S ' ' 'pu'), (S 'solid' 'cv'), (S ' ' 'pu'), (S 'rgba' 'cv'), (S '(' 'pu'), (S '93, 63, 129, 0.9' 'cu'), (S ');' 'pu')),
  @((S '  transition' 'cp'), (S ': ' 'pu'), (S 'background-color' 'cv'), (S ' ' 'pu'), (S '160' 'cu'), (S 'ms' 'cu'), (S ' ' 'pu'), (S 'ease-in-out' 'cv'), (S ';' 'pu')),
  @((S '}' 'pu'))
)

if ($Sample -eq 'markup') { $lines = $markup }

for ($i = 0; $i -lt $lines.Count; $i++) {
    $ln = $i + 1
    $ry = $y0 + $i * $LH
    if ($ry -gt $ETOP + $EH - 26) { break }

    if ($ln -eq 17) { Fill $EX ($ry - 3) ($W - $EX) $LH $N.chromeBg }
    if ($ln -eq 6)  { Fill ($CODE + 15 * $CW) ($ry - 2) (29 * $CW) 19 $S.findMatchBg }
    if ($ln -eq 16) { Fill ($CODE + 8 * $CW) ($ry - 2) (17 * $CW) 19 $N.selectionBg }

    $gcol = if ($ln -eq 17) { $F.secondary } else { $F.muted }
    $lnStr = "$ln".PadLeft(2)
    Text $GUT $ry $lnStr $gcol

    if ($ln -eq 5 -or $ln -eq 6) { Fill ($CODE - 16) ($ry - 3) 3 $LH $S.gitAdded }
    if ($ln -eq 17) { Fill ($CODE - 16) ($ry - 3) 3 $LH $S.gitModified }

    $x = $CODE
    foreach ($span in @($lines[$i])) {
        if (-not $span) { continue }
        $parts = $span -split $US
        $txt = $parts[0]
        $col = if ($parts[1]) { $K[$parts[1]] } else { $F.primary }
        $ital = ($parts.Count -gt 2 -and $parts[2] -eq '1')
        Text $x $ry $txt $col $ital
        $x += $txt.Length * $CW
    }
}

# an error squiggle under the regex
$pen = New-Object System.Drawing.Pen((C $S.error), 1.4)
$sy = $y0 + 5 * $LH + 19
for ($i = 0; $i -lt 29 * $CW; $i += 4) {
    $g.DrawLine($pen, ($CODE + 15 * $CW + $i), $sy, ($CODE + 15 * $CW + $i + 2), ($sy + 2.5))
    $g.DrawLine($pen, ($CODE + 15 * $CW + $i + 2), ($sy + 2.5), ($CODE + 15 * $CW + $i + 4), $sy)
}
$pen.Dispose()

# scrollbar
Fill ($W - 12) ($ETOP + 40) 8 150 $N.scrollSlider

# ------------------------------------------------------------------ status bar
Fill 0 ($H - $STATUS) $W $STATUS $N.chromeBg
Fill 0 ($H - $STATUS) $W 1 $N.border
Text 12 ($H - $STATUS + 4) 'main*' $F.secondary $false $fUiSmall
Text 66 ($H - $STATUS + 4) '2' $S.error $false $fUiSmall
Text 80 ($H - $STATUS + 4) 'errors' $F.secondary $false $fUiSmall
Text 130 ($H - $STATUS + 4) '1' $S.warning $false $fUiSmall
Text 142 ($H - $STATUS + 4) 'warning' $F.secondary $false $fUiSmall
Text ($W - 250) ($H - $STATUS + 4) 'Ln 17, Col 24    TypeScript React    UTF-8' $F.secondary $false $fUiSmall

# ------------------------------------------------------------------ swatches
$SWY = $H - $STATUS - 214
Fill 8 $SWY ($SIDE - 16) 206 $N.well
$rows = @(
    "surfaces$US$($N.well),$($N.editorBg),$($N.panelBg),$($N.chromeBg),$($N.hoverBg),$($N.selectionBg)",
    "edges$US$($N.border),$($N.indentGuide),$($N.indentGuideActive),$($N.scrollSlider),$($N.scrollSliderActive)",
    "text$US$($F.primary),$($F.secondary),$($F.mutedOnChrome),$($F.muted),$($X.comment)",
    "violet$US$($S.accent),$($X.function),$($S.cursor),$($X.punctuation)",
    "rose$US$($X.keyword),$($X.operator),$($S.error)",
    "warm$US$($X.number),$($S.warning),$($X.string),$($X.tagComponent),$($X.parameter)",
    "cool$US$($X.type),$($X.tagIntrinsic),$($X.templatePunct),$($X.property),$($S.gitModified)",
    "green$US$($X.regex),$($S.gitAdded),$($X.attribute)"
)
$sy2 = $SWY + 6
foreach ($r in $rows) {
    $parts = $r -split $US
    Text 14 $sy2 $parts[0] $F.muted $false $fUiSmall
    $cols = $parts[1] -split ','
    $bw = [int](($SIDE - 100) / $cols.Count)
    for ($i = 0; $i -lt $cols.Count; $i++) { Fill (76 + $i * $bw) ($sy2 + 2) ($bw - 2) 14 $cols[$i] }
    $sy2 += 24
}

$g.Dispose()
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host ("preview written: {0} ({1}x{2}, {3:N0} bytes)" -f $Out, $W, $H, (Get-Item $Out).Length)
