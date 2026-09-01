<#
.SYNOPSIS
    Packages Violet Hour as a VS Code extension and installs it.

.DESCRIPTION
    The pkgdef/VSIX pipeline in build-vsix.ps1 targets Visual Studio 2022 and
    produces nothing VS Code can load -- they are different package formats.
    This builds the VS Code side from the same theme/VioletHour.json.

    A VS Code .vsix is an OPC zip:

        [Content_Types].xml
        extension.vsixmanifest
        extension/package.json
        extension/themes/VioletHour.json

    It is built here with System.IO.Compression rather than @vscode/vsce so the
    project keeps zero npm dependencies (see make-vsix-zip.ps1 for why the entry
    names need building by hand). It is then handed to `code
    --install-extension`, which is what makes VS Code write the entry into
    ~/.vscode/extensions/extensions.json -- dropping a folder in by hand does
    not register reliably, because VS Code reads that cache rather than
    rescanning the directory.

.PARAMETER Uninstall
    Remove the extension instead of installing it.

.PARAMETER CodeCli
    Path to the VS Code `code` CLI, if it is not on PATH and not in a standard
    install location.
#>
[CmdletBinding()]
param(
    [switch]$Uninstall,
    [string]$CodeCli
)

$ErrorActionPreference = 'Stop'
$Root      = Split-Path -Parent $PSScriptRoot
$ThemeJson = Join-Path $Root 'theme\VioletHour.json'
$ExtId     = 'jeffreyhamilton.violet-hour'

# ------------------------------------------------------------- locate code CLI
function Find-CodeCli {
    if ($CodeCli) {
        if (-not (Test-Path $CodeCli)) { throw "No code CLI at: $CodeCli" }
        return $CodeCli
    }
    $onPath = Get-Command 'code' -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }

    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Microsoft VS Code\bin\code.cmd'),
        (Join-Path $env:ProgramFiles 'Microsoft VS Code\bin\code.cmd'),
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft VS Code\bin\code.cmd')
    )
    # VS Code can live anywhere (this machine has it on E:), so also ask the
    # registry where the shell launches it from.
    foreach ($hive in 'HKCU:\SOFTWARE\Classes\Applications\Code.exe\shell\open\command',
                      'HKLM:\SOFTWARE\Classes\Applications\Code.exe\shell\open\command') {
        try {
            $cmd = (Get-ItemProperty -Path $hive -Name '(default)' -ErrorAction Stop).'(default)'
            if ($cmd -match '"([^"]+Code\.exe)"') {
                $candidates += (Join-Path (Split-Path $Matches[1]) 'bin\code.cmd')
            }
        } catch { }
    }
    foreach ($c in $candidates) { if ($c -and (Test-Path $c)) { return $c } }

    throw @'
Could not find the VS Code `code` CLI. Pass it explicitly:
    .\scripts\install-vscode.ps1 -CodeCli "<path>\Microsoft VS Code\bin\code.cmd"
'@
}

$Code = Find-CodeCli
Write-Host "code CLI: $Code"

if ($Uninstall) {
    & $Code --uninstall-extension $ExtId
    Write-Host "`nRemoved $ExtId. Restart VS Code to finish." -ForegroundColor Green
    return
}

# -------------------------------------------------------------- sanity checks
if (-not (Test-Path $ThemeJson)) { throw 'theme\VioletHour.json is missing. Run `npm run build` first.' }
$theme = Get-Content $ThemeJson -Raw | ConvertFrom-Json
$colorCount = ($theme.colors | Get-Member -MemberType NoteProperty).Count
if ($colorCount -lt 500) { throw "theme\VioletHour.json looks incomplete ($colorCount colors). Run `npm run build`." }
Write-Host "theme: $($theme.name), $colorCount workbench colors, $($theme.tokenColors.Count) token rules"

# ----------------------------------------------------------------- stage files
$Stage = Join-Path ([System.IO.Path]::GetTempPath()) ("VioletHourVsCode_" + [guid]::NewGuid().ToString('N'))
$ExtDir = Join-Path $Stage 'extension'
New-Item -ItemType Directory -Force -Path (Join-Path $ExtDir 'themes') | Out-Null

Copy-Item (Join-Path $Root 'vscode\package.json') (Join-Path $ExtDir 'package.json') -Force
Copy-Item $ThemeJson (Join-Path $ExtDir 'themes\VioletHour.json') -Force
Copy-Item (Join-Path $Root 'LICENSE.txt') (Join-Path $ExtDir 'LICENSE.txt') -Force

Copy-Item (Join-Path $Root 'vscode\icon.png')   (Join-Path $ExtDir 'icon.png') -Force
Copy-Item (Join-Path $Root 'README.md')        (Join-Path $ExtDir 'README.md') -Force

# The OPC metadata lives in vscode/ as real files so this script and the GitHub
# Actions workflow package byte-identical extensions from one source.
Copy-Item (Join-Path $Root 'vscode\extension.vsixmanifest') (Join-Path $Stage 'extension.vsixmanifest') -Force
# -LiteralPath is required: the brackets in [Content_Types].xml are wildcard
# syntax to PowerShell, so a plain -Path silently matches nothing.
Copy-Item -LiteralPath (Join-Path $Root 'vscode\[Content_Types].xml') `
          -Destination (Join-Path $Stage '[Content_Types].xml') -Force

# ------------------------------------------------------------------- zip it up
$Vsix = Join-Path $Root 'vscode\violet-hour-2.1.0.vsix'
& (Join-Path $PSScriptRoot 'make-vsix-zip.ps1') -Source $Stage -Destination $Vsix

Remove-Item $Stage -Recurse -Force -ErrorAction SilentlyContinue
# --------------------------------------------------------------------- install
Write-Host "`ninstalling ..."
& $Code --install-extension $Vsix --force
if ($LASTEXITCODE -ne 0) { throw 'code --install-extension failed.' }

Write-Host "`nInstalled." -ForegroundColor Green
Write-Host '  1. Restart VS Code (or run "Developer: Reload Window").'
Write-Host '  2. Ctrl+K Ctrl+T  ->  "Violet Hour".'
Write-Host '  3. Open samples\sample.tsx, sample.css and package.json to check the rendering.'
Write-Host "`nRe-run this after any palette change. Uninstall with: -Uninstall"
