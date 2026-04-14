# Stop packaged Kurash Scoreboard so electron-builder can delete win-unpacked (file locks).
$ErrorActionPreference = 'SilentlyContinue'

Write-Host '[stop-packaged-app] Stopping Kurash Scoreboard / portable PHP / portable mysqld...'

taskkill /IM "Kurash Scoreboard.exe" /F /T 2>$null | Out-Null

$pats = @(
  '*electron-app*dist*win-unpacked*',
  '*electron-app*build-output*win-unpacked*'
)

foreach ($name in @('php.exe', 'mysqld.exe')) {
  Get-CimInstance Win32_Process -Filter "Name = '$name'" | ForEach-Object {
    $exe = $_.ExecutablePath
    if (-not $exe) { return }
    foreach ($p in $pats) {
      if ($exe -like $p) {
        Stop-Process -Id $_.ProcessId -Force
        Write-Host "[stop-packaged-app] Stopped $name PID $($_.ProcessId)"
        break
      }
    }
  }
}

Write-Host '[stop-packaged-app] Waiting 2s for Windows to release file handles...'
Start-Sleep -Seconds 2
