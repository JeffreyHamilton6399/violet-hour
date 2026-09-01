<#
.SYNOPSIS
    Builds Violet Hour end to end: theme JSON -> contrast report -> .pkgdef -> .vsix

.DESCRIPTION
    Stages:
      1. node scripts/build-theme.js      - expand palette.json into VioletHour.json
      2. node scripts/contrast-check.js   - verify the contrast rules (build stops on failure)
      3. ThemeConverter                   - VioletHour.json -> build/VioletHour.pkgdef
      4. MSBuild vsix/VioletHour.csproj    - package the pkgdef into VioletHour.vsix

    The converter is cloned and built on first run into .tools/theme-converter.

.PARAMETER LaunchVS
    Skip the VSIX and instead use ThemeConverter's -t flag to patch the given VS
    installation and launch it with the theme applied. This is the fast iteration
    loop -- use it while tuning colors, and build the VSIX only at the end.
    Pass the VS install root, e.g.
      -LaunchVS "C:\Program Files\Microsoft Visual Studio\2022\Community"

.EXAMPLE
    .\scripts\build-vsix.ps1
.EXAMPLE
    .\scripts\build-vsix.ps1 -LaunchVS "C:\Program Files\Microsoft Visual Studio\2022\Community"
#>
[CmdletBinding()]
param(
    [string]$LaunchVS,
    [string]$Configuration = 'Release'
)

$ErrorActionPreference = 'Stop'
$Root      = Split-Path -Parent $PSScriptRoot
$ToolsDir  = Join-Path $Root '.tools'
$ConvDir   = Join-Path $ToolsDir 'theme-converter'
$ThemeJson = Join-Path $Root 'theme\VioletHour.json'
$BuildDir  = Join-Path $Root 'build'
$VsixDir   = Join-Path $Root 'vsix'

function Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Need($exe, $hint) {
    if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) {
        throw "'$exe' was not found on PATH. $hint"
    }
}

# ---------------------------------------------------------------- prerequisites
Step 0 'Checking prerequisites'
Need 'node' 'Install Node.js from https://nodejs.org (needed to build and verify the theme JSON).'
Need 'git'  'Install Git from https://git-scm.com (needed to fetch ThemeConverter).'
Need 'dotnet' @'
Install the .NET SDK from https://dotnet.microsoft.com/download (needed to build
ThemeConverter, which produces the .pkgdef). Without it the theme JSON and the
contrast report still build, but the .pkgdef and .vsix cannot be produced.
'@
Write-Host '  node, git, dotnet: OK' -ForegroundColor Green

# ------------------------------------------------------- 1 & 2: theme + report
Step 1 'Building theme JSON from palette'
& node (Join-Path $Root 'scripts\build-theme.js')
if ($LASTEXITCODE -ne 0) { throw 'build-theme.js failed.' }

Step 2 'Verifying contrast rules'
& node (Join-Path $Root 'scripts\contrast-check.js')
if ($LASTEXITCODE -ne 0) { throw 'Contrast verification failed. Fix theme/palette.json and re-run.' }

# ------------------------------------------------------------- 3: ThemeConverter
Step 3 'Preparing ThemeConverter'
if (-not (Test-Path $ConvDir)) {
    New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null
    Write-Host '  cloning microsoft/theme-converter-for-vs ...'
    & git clone --depth 1 https://github.com/microsoft/theme-converter-for-vs.git $ConvDir
    if ($LASTEXITCODE -ne 0) { throw 'Failed to clone theme-converter-for-vs.' }
} else {
    Write-Host '  using cached clone at .tools\theme-converter'
}

$ConvProj = Join-Path $ConvDir 'ThemeConverter\ThemeConverter\ThemeConverter.csproj'
$ConvOut  = Join-Path $ToolsDir 'converter-bin'
if (-not (Test-Path (Join-Path $ConvOut 'ThemeConverter.exe'))) {
    Write-Host '  building ThemeConverter ...'
    & dotnet build $ConvProj -c Release -o $ConvOut
    if ($LASTEXITCODE -ne 0) { throw 'Failed to build ThemeConverter.' }
} else {
    Write-Host '  using cached ThemeConverter.exe'
}
$ConvExe = Join-Path $ConvOut 'ThemeConverter.exe'

# A user-local SDK install (%USERPROFILE%\.dotnet) is invisible to the app host
# baked into ThemeConverter.exe, and the tool targets the now-EOL net6.0, so it
# also needs permission to roll forward onto a newer runtime.
#
# ThemeConverter additionally resolves its own mapping files (TokenMappings.json,
# VSTokens.json, ...) relative to the CURRENT WORKING DIRECTORY, not to the
# assembly location -- so every invocation has to run from converter-bin.
$DotnetRoot = Split-Path (Get-Command dotnet).Source
if (-not $env:DOTNET_ROOT) { $env:DOTNET_ROOT = $DotnetRoot }
$env:DOTNET_ROLL_FORWARD = 'Major'
$Net6 = Get-ChildItem (Join-Path $DotnetRoot 'shared\Microsoft.NETCore.App') -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like '6.*' }
if (-not $Net6) {
    Write-Host '  no .NET 6 runtime present; invoking through the SDK host with roll-forward'
    $ConvArgs = @((Join-Path $ConvOut 'ThemeConverter.dll'))
    $ConvExe  = 'dotnet'
} else {
    $ConvArgs = @()
}

# Fast iteration path: patch and launch VS directly, no VSIX.
if ($LaunchVS) {
    Step 4 "Applying theme directly to $LaunchVS"
    if (-not (Test-Path $LaunchVS)) { throw "VS install path not found: $LaunchVS" }
    Push-Location $ConvOut
    try   { & $ConvExe @ConvArgs -i $ThemeJson -t $LaunchVS }
    finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw 'ThemeConverter failed to patch the VS install.' }
    Write-Host "`nVisual Studio launched with Violet Hour applied. Tools > Theme to switch." -ForegroundColor Green
    return
}

Step 4 'Converting theme JSON to .pkgdef'
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null

# ThemeConverter takes the theme's DISPLAY NAME from the input filename, not
# from the "name" field in the JSON, so each variant is staged under the name it
# should show as under Tools > Theme.
$variants = @(
    @{ Json = 'theme\VioletHour.json';       Name = 'Violet Hour';       Pkgdef = 'VioletHour.pkgdef' },
    @{ Json = 'theme\VioletHour-Light.json'; Name = 'Violet Hour Light'; Pkgdef = 'VioletHour-Light.pkgdef' }
)

$Staged = Join-Path ([System.IO.Path]::GetTempPath()) 'VioletHourStage'
Remove-Item $Staged -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $Staged | Out-Null

foreach ($v in $variants) {
    $src = Join-Path $Root $v.Json
    if (-not (Test-Path $src)) { throw "$($v.Json) is missing. Run `npm run build` first." }
    $StagedJson = Join-Path $Staged "$($v.Name).json"
    Copy-Item $src $StagedJson -Force

    Push-Location $ConvOut
    try   { & $ConvExe @ConvArgs -i $StagedJson -o $Staged }
    finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw "ThemeConverter failed for $($v.Name)." }

    $Raw = Join-Path $Staged "$($v.Name).pkgdef"
    if (-not (Test-Path $Raw)) { throw "ThemeConverter produced no .pkgdef for $($v.Name)." }

    # Pin the theme GUID: the converter stamps a fresh Guid.NewGuid() every run,
    # so without this each rebuild registers as a whole new theme.
    $Pkgdef = Join-Path $BuildDir $v.Pkgdef
    Write-Host "`n  finalizing $($v.Name)" -ForegroundColor Cyan
    & node (Join-Path $Root 'scripts\finalize-pkgdef.js') $Raw $Pkgdef $v.Name
    if ($LASTEXITCODE -ne 0) { throw "finalize-pkgdef.js failed for $($v.Name)." }
    Copy-Item $Pkgdef (Join-Path $VsixDir $v.Pkgdef) -Force
}
Remove-Item $Staged -Recurse -Force -ErrorAction SilentlyContinue

# ------------------------------------------------------------------ 5: the VSIX
Step 6 'Packaging the VSIX'
$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$msbuild = $null
if (Test-Path $vswhere) {
    $msbuild = & $vswhere -latest -requires Microsoft.Component.MSBuild `
                          -find 'MSBuild\**\Bin\MSBuild.exe' | Select-Object -First 1
}
if (-not $msbuild) {
    throw @'
MSBuild from a Visual Studio 2022 install was not found. Packaging a VSIX needs
VS 2022 with the "Visual Studio extension development" workload (which supplies
the VSSDK build targets). The .pkgdef in build\ is already usable on its own --
see "Install without building a VSIX" in README.md.
'@
}

Write-Host "  msbuild: $msbuild"
& $msbuild (Join-Path $VsixDir 'VioletHour.csproj') /t:Rebuild /p:Configuration=$Configuration /v:minimal /restore
if ($LASTEXITCODE -ne 0) { throw 'MSBuild failed to package the VSIX.' }

$Vsix = Get-ChildItem -Path (Join-Path $VsixDir "bin\$Configuration") -Filter '*.vsix' -Recurse |
        Select-Object -First 1
if (-not $Vsix) { throw 'Build succeeded but no .vsix was produced.' }

Write-Host "`nDone. Double-click to install:" -ForegroundColor Green
Write-Host "  $($Vsix.FullName)"
