param(
  [string]$ExePath = (Join-Path $PSScriptRoot '..\build-output\win-unpacked\Kurash Scoreboard.exe'),
  [string]$ResultsPath = (Join-Path $PSScriptRoot '..\build-output\portable-validation-results.json'),
  [int]$FirstRunTimeoutSeconds = 210,
  [int]$WarmRunTimeoutSeconds = 150,
  [switch]$InteractiveMode
)

$ErrorActionPreference = 'Stop'

function Wait-ForRuntimeState {
  param(
    [string]$DebugPath,
    [int]$TimeoutSeconds
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Path -LiteralPath $DebugPath) {
      try {
        $debug = Get-Content -Raw -LiteralPath $DebugPath | ConvertFrom-Json
        if ($debug.finalStatus -eq 'ready') {
          return [pscustomobject]@{ status = 'ready'; debug = $debug }
        }
        if ($debug.finalStatus -eq 'failed') {
          return [pscustomobject]@{ status = 'failed'; debug = $debug }
        }
      } catch {
      }
    }

    Start-Sleep -Seconds 3
  }

  if (Test-Path -LiteralPath $DebugPath) {
    try {
      $debug = Get-Content -Raw -LiteralPath $DebugPath | ConvertFrom-Json
      return [pscustomobject]@{ status = 'timeout'; debug = $debug }
    } catch {
    }
  }

  return [pscustomobject]@{ status = 'timeout'; debug = $null }
}

function Invoke-Probe {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 10
    $statusCode = [int]$response.StatusCode
    return [pscustomobject]@{
      url = $Url
      ok = ($statusCode -ge 200 -and $statusCode -lt 300)
      statusCode = $statusCode
      expected = '2xx'
    }
  } catch {
    $statusCode = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    return [pscustomobject]@{
      url = $Url
      ok = $false
      statusCode = $statusCode
      expected = '2xx'
      error = $_.Exception.Message
    }
  }
}

function Get-IterationValidationFailures {
  param($Result)

  $failures = @()

  if ($Result.state -ne 'ready') {
    $failures += [pscustomobject]@{
      reason = 'Runtime did not reach ready state'
      stage = if ($Result.failure) { $Result.failure.stage } else { $null }
      failure = if ($Result.failure) { $Result.failure.reason } else { $null }
    }
  }

  foreach ($probeName in @('probeUp', 'probeController', 'probeScoreboard')) {
    $probe = $Result.$probeName
    if ($probe -and -not $probe.ok) {
      $failures += [pscustomobject]@{
        reason = "$probeName returned a non-2xx result"
        url = $probe.url
        statusCode = $probe.statusCode
        error = $probe.error
        expected = '2xx'
      }
    }
  }

  return $failures
}

function Test-ProbeHealthyAcrossRuns {
  param(
    [hashtable]$Results,
    [string]$ProbeProperty
  )

  foreach ($runName in @('firstRun', 'secondRun', 'recoveryRun')) {
    $run = $Results[$runName]
    if ($null -eq $run) {
      return $false
    }

    $probe = $run.$ProbeProperty
    if ($null -eq $probe -or -not $probe.ok) {
      return $false
    }
  }

  return $true
}

function Test-PortOpen {
  param(
    [int]$Port,
    [string]$TargetHost = '127.0.0.1'
  )

  $client = New-Object System.Net.Sockets.TcpClient

  try {
    $async = $client.BeginConnect($TargetHost, $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne(1000, $false)) {
      return $false
    }

    $client.EndConnect($async)
    return $true
  }
  catch {
    return $false
  }
  finally {
    $client.Close()
  }
}

function Wait-ForRuntimePortsReleased {
  param([int]$TimeoutSeconds = 20)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $ports = @(3406, 18000, 18080)

  while ((Get-Date) -lt $deadline) {
    $openPorts = @($ports | Where-Object { Test-PortOpen -Port $_ })
    if ($openPorts.Count -eq 0) {
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Stop-Tree {
  param([int]$ProcessIdToStop)

  if ($ProcessIdToStop -gt 0) {
    try {
      & taskkill /pid $ProcessIdToStop /f /t | Out-Null
    } catch {
    }
    Start-Sleep -Seconds 2
    Wait-ForRuntimePortsReleased -TimeoutSeconds 20 | Out-Null
  }
}

function Get-ControllerWindowState {
  param([string]$MainLogPath)

  $state = [ordered]@{
    readyToShow = $false
    shown = $false
    finishedLoading = $false
    appeared = $false
    recentMatches = @()
  }

  if (-not (Test-Path -LiteralPath $MainLogPath)) {
    return [pscustomobject]$state
  }

  $matches = @(
    Get-Content -LiteralPath $MainLogPath | Where-Object {
      $_ -match 'Gilam Controller' -and (
        $_ -match 'BrowserWindow ready to show.' -or
        $_ -match 'BrowserWindow shown.' -or
        $_ -match 'BrowserWindow finished loading.'
      )
    }
  )

  $state.readyToShow = [bool]($matches | Where-Object { $_ -match 'BrowserWindow ready to show.' } | Select-Object -First 1)
  $state.shown = [bool]($matches | Where-Object { $_ -match 'BrowserWindow shown.' } | Select-Object -First 1)
  $state.finishedLoading = [bool]($matches | Where-Object { $_ -match 'BrowserWindow finished loading.' } | Select-Object -First 1)
  $state.appeared = $state.readyToShow -or $state.shown -or $state.finishedLoading
  $state.recentMatches = @($matches | Select-Object -Last 20)

  return [pscustomobject]$state
}

function Wait-ForControllerWindowAppearance {
  param(
    [string]$MainLogPath,
    [int]$TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  do {
    $state = Get-ControllerWindowState -MainLogPath $MainLogPath
    if ($state.appeared) {
      return $state
    }

    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)

  return (Get-ControllerWindowState -MainLogPath $MainLogPath)
}

function Run-Iteration {
  param(
    [string]$Label,
    [string]$BinaryPath,
    [string]$DebugPath,
    [string]$MainLogPath,
    [int]$TimeoutSeconds,
    [bool]$Interactive = $false
  )

  $process = $null
  try {
    Wait-ForRuntimePortsReleased -TimeoutSeconds 20 | Out-Null
    $process = Start-Process -FilePath $BinaryPath -WorkingDirectory (Split-Path -Parent $BinaryPath) -PassThru
    $state = Wait-ForRuntimeState -DebugPath $DebugPath -TimeoutSeconds $TimeoutSeconds
    $controllerWindow = if ($Interactive -and $state.status -eq 'ready') {
      Wait-ForControllerWindowAppearance -MainLogPath $MainLogPath -TimeoutSeconds 30
    } else {
      [pscustomobject]@{
        readyToShow = $false
        shown = $false
        finishedLoading = $false
        appeared = $false
        recentMatches = @()
      }
    }
    $hasExited = $false
    $exitCode = $null
    if ($process) {
      try {
        $hasExited = $process.HasExited
        if ($hasExited) {
          $exitCode = $process.ExitCode
        }
      } catch {
      }
    }
    $probeUp = Invoke-Probe -Url 'http://127.0.0.1:18000/up'
    $probeController = Invoke-Probe -Url 'http://127.0.0.1:18000/refereeController'
    $probeScoreboard = Invoke-Probe -Url 'http://127.0.0.1:18000/kurashScoreBoard'

    $result = [pscustomobject]@{
      label = $Label
      pid = if ($process) { $process.Id } else { $null }
      hasExited = $hasExited
      exitCode = $exitCode
      state = $state.status
      failure = if ($state.debug) { $state.debug.failure } else { $null }
      readyAt = if ($state.debug) { $state.debug.readyAt } else { $null }
      controllerWindow = $controllerWindow
      probeUp = $probeUp
      probeController = $probeController
      probeScoreboard = $probeScoreboard
      validationFailures = @()
      validationPassed = $false
    }

    $result.validationFailures = @(Get-IterationValidationFailures -Result $result)
    $result.validationPassed = $result.validationFailures.Count -eq 0

    return $result
  }
  finally {
    if ($process) {
      Stop-Tree -ProcessIdToStop $process.Id
    }
  }
}

$resolvedExePath = (Resolve-Path -LiteralPath $ExePath).Path
$runRoot = Join-Path $env:TEMP ('Kurash WinUnpacked Validation ' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$roamingPath = Join-Path $runRoot 'Roaming Profile With Spaces'
$localPath = Join-Path $runRoot 'Local Profile With Spaces'
$logsDir = Join-Path $roamingPath 'Kurash Scoreboard\logs'
$debugPath = Join-Path $logsDir 'portable-env-debug.json'
$mainLogPath = Join-Path $logsDir 'main.log'
if ([System.IO.Path]::IsPathRooted($ResultsPath)) {
  $resultsFullPath = $ResultsPath
} else {
  $resultsFullPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $ResultsPath))
}
$resultsDir = Split-Path -Parent $resultsFullPath
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

New-Item -ItemType Directory -Force -Path $roamingPath | Out-Null
New-Item -ItemType Directory -Force -Path $localPath | Out-Null
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

$originalAppData = $env:APPDATA
$originalLocalAppData = $env:LOCALAPPDATA
$originalBootstrapOnly = $env:KURASH_BOOTSTRAP_ONLY
$originalBootstrapOnlyHoldMs = $env:KURASH_BOOTSTRAP_ONLY_HOLD_MS
$env:APPDATA = $roamingPath
$env:LOCALAPPDATA = $localPath
if ($InteractiveMode) {
  Remove-Item Env:KURASH_BOOTSTRAP_ONLY -ErrorAction SilentlyContinue
  Remove-Item Env:KURASH_BOOTSTRAP_ONLY_HOLD_MS -ErrorAction SilentlyContinue
} else {
  $env:KURASH_BOOTSTRAP_ONLY = '1'
  $env:KURASH_BOOTSTRAP_ONLY_HOLD_MS = '15000'
}

try {
  $results = [ordered]@{
    binary = $resolvedExePath
    mode = if ($InteractiveMode) { 'interactive' } else { 'bootstrap-only' }
    runRoot = $runRoot
    appData = $roamingPath
    localAppData = $localPath
    logsDir = $logsDir
    isAdmin = [bool](([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))
    xamppDetected = [bool]((Test-Path 'C:\xampp\mysql\bin\mysqld.exe') -or (Test-Path 'C:\xampp\mysql\bin\mysql.exe'))
    firstRun = Run-Iteration -Label 'firstRun' -BinaryPath $resolvedExePath -DebugPath $debugPath -MainLogPath $mainLogPath -TimeoutSeconds $FirstRunTimeoutSeconds -Interactive:$InteractiveMode
    secondRun = Run-Iteration -Label 'secondRun' -BinaryPath $resolvedExePath -DebugPath $debugPath -MainLogPath $mainLogPath -TimeoutSeconds $WarmRunTimeoutSeconds -Interactive:$InteractiveMode
    recoveryRun = Run-Iteration -Label 'recoveryRun' -BinaryPath $resolvedExePath -DebugPath $debugPath -MainLogPath $mainLogPath -TimeoutSeconds $WarmRunTimeoutSeconds -Interactive:$InteractiveMode
    logFiles = @()
    mainLogTail = @()
    finalDebugState = $null
  }

  if (Test-Path -LiteralPath $logsDir) {
    $results.logFiles = Get-ChildItem -LiteralPath $logsDir -File | Select-Object Name,Length,LastWriteTime
  }

  if (Test-Path -LiteralPath $mainLogPath) {
    $results.mainLogTail = Get-Content -LiteralPath $mainLogPath -Tail 80
  }

  if (Test-Path -LiteralPath $debugPath) {
    $results.finalDebugState = Get-Content -Raw -LiteralPath $debugPath | ConvertFrom-Json
  }

  $results.validationFailures = @(
    foreach ($runName in @('firstRun', 'secondRun', 'recoveryRun')) {
      $run = $results[$runName]
      if ($null -eq $run) {
        continue
      }

      foreach ($failure in @($run.validationFailures)) {
        [pscustomobject]@{
          run = $runName
          reason = $failure.reason
          stage = $failure.stage
          failure = $failure.failure
          url = $failure.url
          statusCode = $failure.statusCode
          error = $failure.error
          expected = $failure.expected
        }
      }
    }
  )
  $results.validationPassed = $results.validationFailures.Count -eq 0
  $results.validationSummary = [ordered]@{
    upHealthy = Test-ProbeHealthyAcrossRuns -Results $results -ProbeProperty 'probeUp'
    refereeControllerHealthy = Test-ProbeHealthyAcrossRuns -Results $results -ProbeProperty 'probeController'
    kurashScoreBoardHealthy = Test-ProbeHealthyAcrossRuns -Results $results -ProbeProperty 'probeScoreboard'
    controllerWindowAppeared = @('firstRun', 'secondRun', 'recoveryRun') | ForEach-Object {
      $results[$_].controllerWindow.appeared
    } | Where-Object { -not $_ } | Measure-Object | Select-Object -ExpandProperty Count | ForEach-Object { $_ -eq 0 }
    secondLaunchPassed = ($results.secondRun.state -eq 'ready' -and $results.secondRun.validationPassed)
    recoveryPassed = ($results.recoveryRun.state -eq 'ready' -and $results.recoveryRun.validationPassed)
  }

  $json = $results | ConvertTo-Json -Depth 8
  [System.IO.File]::WriteAllText($resultsFullPath, $json, $utf8NoBom)
  Write-Output $resultsFullPath

  if (-not $results.validationPassed) {
    $failureSummary = ($results.validationFailures | ForEach-Object {
      if ($_.url) {
        "$($_.run): $($_.reason) [$($_.url)]"
      } else {
        "$($_.run): $($_.reason)"
      }
    }) -join '; '
    throw "Packaged runtime validation failed: $failureSummary"
  }
}
finally {
  $env:APPDATA = $originalAppData
  $env:LOCALAPPDATA = $originalLocalAppData
  $env:KURASH_BOOTSTRAP_ONLY = $originalBootstrapOnly
  $env:KURASH_BOOTSTRAP_ONLY_HOLD_MS = $originalBootstrapOnlyHoldMs
}
