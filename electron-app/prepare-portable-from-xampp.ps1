<#
Stages the deterministic portable runtime layout used by the packaged controller/scoreboard app.

Usage (run in PowerShell):
  1) Verify the local XAMPP PHP / MySQL paths below.
  2) Run: .\prepare-portable-from-xampp.ps1
  3) Rebuild Electron: npm run build:electron
#>

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

$phpSrc = 'C:\xampp\php'
$mysqlSrc = 'C:\xampp\mysql'

$phpDest = Join-Path $repoRoot 'portable\runtime\php'
$mysqlDest = Join-Path $repoRoot 'portable\runtime\mariadb'

function Assert-Exists([string]$path, [string]$label) {
  if (-not (Test-Path $path)) {
    throw "$label not found: $path"
  }
}

Assert-Exists $phpSrc 'XAMPP PHP directory'
Assert-Exists $mysqlSrc 'XAMPP MySQL directory'
Assert-Exists (Join-Path $phpSrc 'php.exe') 'XAMPP php.exe'
Assert-Exists (Join-Path $phpSrc 'php.ini') 'XAMPP php.ini'
Assert-Exists (Join-Path $mysqlSrc 'bin\mysqld.exe') 'XAMPP mysqld.exe'
Assert-Exists (Join-Path $mysqlSrc 'bin\mysql.exe') 'XAMPP mysql.exe'
Assert-Exists (Join-Path $mysqlSrc 'bin\mysqladmin.exe') 'XAMPP mysqladmin.exe'

Write-Host 'Copying PHP runtime from:' $phpSrc
Write-Host 'to:' $phpDest
New-Item -ItemType Directory -Force -Path $phpDest | Out-Null
robocopy $phpSrc $phpDest /E /R:2 /W:2 /COPY:DAT /NFL /NDL | Out-Null

Write-Host 'Copying MariaDB runtime from:' $mysqlSrc
Write-Host 'to:' $mysqlDest
New-Item -ItemType Directory -Force -Path $mysqlDest | Out-Null
robocopy $mysqlSrc $mysqlDest /E /XD data data-old backup tmp logs /R:2 /W:2 /COPY:DAT /NFL /NDL | Out-Null

Write-Host 'Deterministic portable runtime staged successfully.'
Write-Host 'Expected packaged runtime paths:'
Write-Host " - $(Join-Path $phpDest 'php.exe')"
Write-Host " - $(Join-Path $phpDest 'php.ini')"
Write-Host " - $(Join-Path $mysqlDest 'bin\mysqld.exe')"
Write-Host " - $(Join-Path $mysqlDest 'bin\mysql.exe')"
Write-Host " - $(Join-Path $mysqlDest 'bin\mysqladmin.exe')"

