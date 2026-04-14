<#
Stages the deterministic portable runtime layout used by the packaged controller/scoreboard app.

Usage (run in PowerShell):
  1) Optionally override the source directories:
       .\prepare-portable-from-xampp.ps1 -PhpSource 'C:\xampp\php' -MariaDbSource 'C:\xampp\mysql'
  2) Rebuild Electron after staging:
       cd electron-app
       npm run build:portable

The Electron prebuild path now invokes the shared Node runtime stager automatically.
This wrapper is still useful when you want to force a specific source.
#>

param(
  [string]$PhpSource = 'C:\xampp\php',
  [string]$MariaDbSource = 'C:\xampp\mysql'
)

$ErrorActionPreference = 'Stop'

$stageScript = Join-Path $PSScriptRoot 'scripts\stage-portable-runtime.mjs'
if (-not (Test-Path -LiteralPath $stageScript)) {
  throw "Missing runtime staging script: $stageScript"
}

$env:KTS_PHP_SOURCE = $PhpSource
$env:KTS_MARIADB_SOURCE = $MariaDbSource

Write-Host 'Staging deterministic portable runtime bundle via shared build script.'
Write-Host " - PHP source: $PhpSource"
Write-Host " - MariaDB source: $MariaDbSource"

node $stageScript
if ($LASTEXITCODE -ne 0) {
  throw "Portable runtime staging failed with exit code $LASTEXITCODE."
}
