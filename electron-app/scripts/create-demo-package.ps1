param(
  [string]$SourceRoot = (Join-Path $PSScriptRoot '..\build-output\win-unpacked'),
  [string]$StagingRoot = (Join-Path $PSScriptRoot '..\build-output\demo-package'),
  [string]$PackageName = 'Kurash Scoreboard',
  [string]$ZipName = 'Kurash-Scoreboard-Demo.zip'
)

$ErrorActionPreference = 'Stop'

function Resolve-NormalizedPath {
  param([string]$PathValue)

  return [System.IO.Path]::GetFullPath($PathValue)
}

function Assert-ChildPath {
  param(
    [string]$BasePath,
    [string]$TargetPath
  )

  $normalizedBase = (Resolve-NormalizedPath $BasePath).TrimEnd([char[]]@('\', '/'))
  $normalizedTarget = Resolve-NormalizedPath $TargetPath

  if (-not $normalizedTarget.StartsWith($normalizedBase, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to operate outside the build output root: $normalizedTarget"
  }

  return $normalizedTarget
}

$buildOutputRoot = Resolve-NormalizedPath (Join-Path $PSScriptRoot '..\build-output')
$sourceRoot = Resolve-NormalizedPath $SourceRoot
$stagingRoot = Assert-ChildPath $buildOutputRoot $StagingRoot
$packageRoot = Assert-ChildPath $buildOutputRoot (Join-Path $stagingRoot $PackageName)
$zipPath = Assert-ChildPath $buildOutputRoot (Join-Path $buildOutputRoot $ZipName)
$folderExePath = Join-Path $sourceRoot 'Kurash Scoreboard.exe'
$portableExe = Get-ChildItem -LiteralPath $buildOutputRoot -Filter 'Kurash Scoreboard*.exe' -File |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 1
$readmePath = Join-Path $packageRoot 'README_FIRST.txt'

if (-not (Test-Path -LiteralPath $sourceRoot)) {
  throw "Missing packaged app folder: $sourceRoot`nRun npm run build:electron first."
}

$packageMode = $null
$packagedEntrySource = $null

if (Test-Path -LiteralPath $folderExePath) {
  $packageMode = 'folder'
  $packagedEntrySource = $folderExePath
} elseif ($portableExe) {
  $packageMode = 'portable-exe'
  $packagedEntrySource = $portableExe.FullName
} else {
  throw "Missing packaged app executable under $buildOutputRoot`nRun npm run build:electron first."
}

if (Test-Path -LiteralPath $packageRoot) {
  Remove-Item -LiteralPath $packageRoot -Recurse -Force
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null

if ($packageMode -eq 'folder') {
  Get-ChildItem -LiteralPath $sourceRoot -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $packageRoot -Recurse -Force
  }
} else {
  Copy-Item -LiteralPath $packagedEntrySource -Destination (Join-Path $packageRoot 'Kurash Scoreboard.exe') -Force
}

$readmeContent = @'
KURASH SCOREBOARD DEMO PACKAGE

1. Extract this zip fully to Desktop, Documents, or another normal folder.
2. Open the extracted "Kurash Scoreboard" folder.
3. Double-click "Kurash Scoreboard.exe".
4. Wait for the controller window to finish opening.

IMPORTANT
- Do not run the app from inside the zip file.
- Do not move only the .exe out of this folder.
- Keep the whole extracted folder together because the runtime files live beside the app.

IF WINDOWS SHOWS A WARNING
- SmartScreen: click "More info" then "Run anyway".
- Firewall: allow the app on Private networks if prompted.
'@

Set-Content -LiteralPath $readmePath -Value $readmeContent -Encoding ASCII

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
  $packageRoot,
  $zipPath,
  [System.IO.Compression.CompressionLevel]::Fastest,
  $true
)

Write-Host '[create-demo-package] Demo package created successfully.'
Write-Host "[create-demo-package] Package mode: $packageMode"
Write-Host "[create-demo-package] App source: $packagedEntrySource"
Write-Host "[create-demo-package] Staged folder: $packageRoot"
Write-Host "[create-demo-package] Zip file: $zipPath"
