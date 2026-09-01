<#
.SYNOPSIS
    Zips a staging directory into an OPC package (.vsix) with correct entry names.

.DESCRIPTION
    Shared by scripts/install-vscode.ps1 and the GitHub Actions workflow so both
    produce identical packages.

    Why this exists rather than a one-line Compress-Archive or
    ZipFile::CreateFromDirectory:

      * Compress-Archive (Windows PowerShell 5.1) writes '\' separators.
      * ZipFile::CreateFromDirectory writes '\' too when running on .NET
        Framework, which is what Windows PowerShell 5.1 uses. It only
        normalises to '/' on .NET Core / PowerShell 7.

    The OPC spec requires '/'. A package with '\' entries happens to install in
    VS Code, whose reader is lenient, but it is malformed and is rejected by
    stricter readers including the Marketplace publishing tools.

    This creates each entry explicitly with a forward-slash name, so the result
    is correct regardless of which PowerShell edition runs it.

.PARAMETER Source
    Staging directory whose contents become the package root.

.PARAMETER Destination
    Path of the .vsix to write. Overwritten if present.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Source,
    [Parameter(Mandatory)][string]$Destination
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$Source = (Resolve-Path -LiteralPath $Source).Path.TrimEnd('\', '/')
if (Test-Path -LiteralPath $Destination) { Remove-Item -LiteralPath $Destination -Force }

$zip = [System.IO.Compression.ZipFile]::Open($Destination, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    # -Force so nothing is skipped if a staged file is hidden.
    $files = Get-ChildItem -LiteralPath $Source -Recurse -File -Force
    foreach ($f in $files) {
        $rel = $f.FullName.Substring($Source.Length + 1) -replace '\\', '/'
        $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)

        $in  = [System.IO.File]::OpenRead($f.FullName)
        try {
            $out = $entry.Open()
            try { $in.CopyTo($out) } finally { $out.Dispose() }
        } finally { $in.Dispose() }
    }
}
finally { $zip.Dispose() }

# Verify: any '\' in an entry name means the package is malformed.
$check = [System.IO.Compression.ZipFile]::OpenRead($Destination)
try {
    $bad = $check.Entries | Where-Object { $_.FullName -like '*\*' }
    $count = $check.Entries.Count
} finally { $check.Dispose() }

if ($bad) {
    Remove-Item -LiteralPath $Destination -Force
    throw "Package had backslash entry names: $($bad.FullName -join ', ')"
}

Write-Host ("  packaged {0} entries -> {1} ({2:N0} bytes)" -f `
    $count, $Destination, (Get-Item -LiteralPath $Destination).Length)
