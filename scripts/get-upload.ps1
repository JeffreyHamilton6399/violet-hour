<#
.SYNOPSIS
    Downloads the Marketplace .vsix for a release, named with its version.

.DESCRIPTION
    The Marketplace rejects re-uploading a version that already exists, so
    uploading a stale file fails with "The version X already exists and cannot
    be modified" - which reads like a Marketplace problem but just means the
    wrong file was picked. Writing the version into the filename makes that
    impossible to do by accident.

    Defaults to the latest release.

.EXAMPLE
    .\scripts\get-upload.ps1
.EXAMPLE
    .\scripts\get-upload.ps1 -Tag v2.3.1
#>
[CmdletBinding()]
param([string]$Tag)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Dest = Join-Path $Root 'upload'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "The GitHub CLI (gh) is not on PATH. Download the asset from the Releases page instead."
}
if (-not $Tag) {
    $Tag = (& gh release view --json tagName --jq '.tagName')
    if (-not $Tag) { throw 'Could not determine the latest release tag.' }
}

New-Item -ItemType Directory -Force -Path $Dest | Out-Null
Get-ChildItem $Dest -Filter 'VioletHour-Marketplace-*.vsix' | Remove-Item -Force

Write-Host "fetching $Tag ..."
& gh release download $Tag --pattern 'VioletHour-Marketplace.vsix' --dir $Dest --clobber
if ($LASTEXITCODE -ne 0) { throw "Could not download the Marketplace asset from $Tag." }

$raw = Join-Path $Dest 'VioletHour-Marketplace.vsix'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($raw)
try {
    $entry  = $zip.GetEntry('extension.vsixmanifest')
    $reader = New-Object System.IO.StreamReader($entry.Open())
    $manifest = $reader.ReadToEnd(); $reader.Dispose()
} finally { $zip.Dispose() }

$version = [regex]::Match($manifest, 'Identity[^>]*Version="([^"]+)"').Groups[1].Value
$final   = Join-Path $Dest "VioletHour-Marketplace-$version.vsix"
Move-Item $raw $final -Force

Write-Host ''
Write-Host 'Upload this file:' -ForegroundColor Green
Write-Host "  $final"
Write-Host ("  version {0}, publisher {1}, {2:N0} bytes" -f `
    $version,
    [regex]::Match($manifest, 'Publisher="([^"]+)"').Groups[1].Value,
    (Get-Item $final).Length)
Write-Host ''
Write-Host '  marketplace.visualstudio.com/manage  ->  Violet Hour  ->  Update'
