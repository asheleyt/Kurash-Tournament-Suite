param(
  [string]$InstallerPath = '',
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\build-output\distribution-baseline.local.json')
)

$ErrorActionPreference = 'Stop'

function Get-JsonFile {
  param([string]$Path)

  return Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
}

function Get-DirectorySizeBytes {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return [int64]0
  }

  $sum = Get-ChildItem -LiteralPath $Path -Recurse -File -Force -ErrorAction SilentlyContinue |
    Measure-Object -Property Length -Sum |
    Select-Object -ExpandProperty Sum

  if ($null -eq $sum) {
    return [int64]0
  }

  return [int64]$sum
}

function Get-RelativePathSafe {
  param(
    [string]$BasePath,
    [string]$TargetPath
  )

  $baseUri = New-Object System.Uri(([System.IO.Path]::GetFullPath($BasePath).TrimEnd('\') + '\'))
  $targetUri = New-Object System.Uri([System.IO.Path]::GetFullPath($TargetPath))
  $relative = $baseUri.MakeRelativeUri($targetUri).ToString()
  return ([System.Uri]::UnescapeDataString($relative) -replace '\\', '/')
}

function Test-IsolatedPathCleaned {
  param([string]$Path)

  return -not (Test-Path -LiteralPath $Path)
}

function Get-IcoMetadata {
  param([byte[]]$Bytes)

  if ($Bytes.Length -lt 6) {
    throw 'ICO payload is too small to be valid.'
  }

  $reserved = [BitConverter]::ToUInt16($Bytes, 0)
  $iconType = [BitConverter]::ToUInt16($Bytes, 2)
  $imageCount = [BitConverter]::ToUInt16($Bytes, 4)

  if ($reserved -ne 0 -or $iconType -ne 1 -or $imageCount -lt 1) {
    throw 'ICO payload is not a valid Windows icon.'
  }

  $sizes = @()
  for ($index = 0; $index -lt $imageCount; $index++) {
    $entryOffset = 6 + ($index * 16)
    if ($entryOffset + 15 -ge $Bytes.Length) {
      throw 'ICO payload ended before all image directory entries could be read.'
    }

    $width = $Bytes[$entryOffset]
    $height = $Bytes[$entryOffset + 1]
    $actualWidth = if ($width -eq 0) { 256 } else { [int]$width }
    $actualHeight = if ($height -eq 0) { 256 } else { [int]$height }
    $sizes += ('{0}x{1}' -f $actualWidth, $actualHeight)
  }

  return [pscustomobject]@{
    isWindowsIco = $true
    imageCount = [int]$imageCount
    imageSizes = @($sizes | Select-Object -Unique)
    isMultiSize = ([int]$imageCount -gt 1)
  }
}

function Get-TopLevelFolderSizes {
  param([string]$InstallRoot)

  return @(
    Get-ChildItem -LiteralPath $InstallRoot -Directory -Force |
      ForEach-Object {
        [pscustomobject]@{
          path = Get-RelativePathSafe -BasePath $InstallRoot -TargetPath $_.FullName
          sizeBytes = Get-DirectorySizeBytes -Path $_.FullName
        }
      } |
      Sort-Object sizeBytes -Descending
  )
}

function Get-TopLargestFiles {
  param(
    [string]$InstallRoot,
    [int]$Limit = 10
  )

  return @(
    Get-ChildItem -LiteralPath $InstallRoot -Recurse -File -Force |
      Sort-Object Length -Descending |
      Select-Object -First $Limit |
      ForEach-Object {
        [pscustomobject]@{
          path = Get-RelativePathSafe -BasePath $InstallRoot -TargetPath $_.FullName
          sizeBytes = [int64]$_.Length
        }
      }
  )
}

function Get-GroupedTotals {
  param([string]$InstallRoot)

  $groups = [ordered]@{
    appCode = [int64]0
    phpRuntime = [int64]0
    mariaDbRuntime = [int64]0
    bundledAssets = [int64]0
  }

  $appCodePrefixes = @(
    'resources/app.asar',
    'resources/laravel/app/',
    'resources/laravel/bootstrap/',
    'resources/laravel/config/',
    'resources/laravel/database/',
    'resources/laravel/routes/',
    'resources/laravel/vendor/',
    'resources/laravel/artisan'
  )

  Get-ChildItem -LiteralPath $InstallRoot -Recurse -File -Force | ForEach-Object {
    $relativePath = Get-RelativePathSafe -BasePath $InstallRoot -TargetPath $_.FullName
    $normalizedPath = $relativePath.ToLowerInvariant()
    $length = [int64]$_.Length

    if ($normalizedPath.StartsWith('resources/portable/runtime/php/')) {
      $groups.phpRuntime += $length
      return
    }

    if ($normalizedPath.StartsWith('resources/portable/runtime/mariadb/')) {
      $groups.mariaDbRuntime += $length
      return
    }

    foreach ($prefix in $appCodePrefixes) {
      if ($normalizedPath -eq $prefix -or $normalizedPath.StartsWith($prefix)) {
        $groups.appCode += $length
        return
      }
    }

    $groups.bundledAssets += $length
  }

  return [pscustomobject]$groups
}

function Get-InstallerPath {
  param([string]$PreferredPath)

  if ($PreferredPath) {
    return (Resolve-Path -LiteralPath $PreferredPath).Path
  }

  $packageJsonPath = Join-Path $PSScriptRoot '..\package.json'
  $packageJson = Get-JsonFile -Path $packageJsonPath
  $version = $packageJson.version
  $artifactName = 'KTS-Setup-{0}.exe' -f $version
  return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\build-output\$artifactName") -ErrorAction Stop).Path
}

function Find-InstalledExecutable {
  param(
    [string]$InstallDir,
    [string]$InstalledExeName
  )

  $directPath = Join-Path $InstallDir $InstalledExeName
  if (Test-Path -LiteralPath $directPath) {
    return $directPath
  }

  $fallbackExe = Get-ChildItem -LiteralPath $InstallDir -Recurse -Filter '*.exe' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq $InstalledExeName } |
    Select-Object -First 1
  if ($fallbackExe) {
    return $fallbackExe.FullName
  }

  return $null
}

function Find-DetectedInstalledExecutable {
  param(
    [string]$InstalledExeName,
    [datetime]$NotOlderThanUtc
  )

  $searchRoots = @(
    (Join-Path $env:LOCALAPPDATA 'Programs'),
    ${env:ProgramFiles},
    ${env:ProgramFiles(x86)}
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

  $candidates = @()
  foreach ($root in $searchRoots) {
    $matches = Get-ChildItem -LiteralPath $root -Recurse -Filter $InstalledExeName -File -ErrorAction SilentlyContinue |
      Where-Object { $_.LastWriteTimeUtc -ge $NotOlderThanUtc } |
      Sort-Object LastWriteTimeUtc -Descending

    if ($matches) {
      $candidates += $matches
    }
  }

  return $candidates |
    Sort-Object LastWriteTimeUtc -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}

function Wait-ForInstalledExecutable {
  param(
    [string]$InstallDir,
    [string]$InstalledExeName,
    [int]$TimeoutSeconds = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $resolvedPath = Find-InstalledExecutable -InstallDir $InstallDir -InstalledExeName $InstalledExeName
    if ($resolvedPath) {
      return $resolvedPath
    }

    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)

  return $null
}

function Invoke-SilentInstall {
  param(
    [string]$InstallerExe,
    [string]$InstallDir
  )

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  $process = Start-Process -FilePath $InstallerExe -ArgumentList @('/S', '/currentuser', "/D=$InstallDir") -PassThru -Wait
  $stopwatch.Stop()

  return [pscustomobject]@{
    exitCode = $process.ExitCode
    durationMs = [int][math]::Round($stopwatch.Elapsed.TotalMilliseconds)
  }
}

function Invoke-OrchestratorHarnessCapture {
  param(
    [string]$ResourcesPath,
    [string]$ResultsPath
  )

  $scriptPath = Join-Path $PSScriptRoot 'validate-runtime-orchestrator.cjs'
  $result = $null
  $errorMessage = $null
  $commandOutput = @()

  try {
    $commandOutput = & node $scriptPath '--resources-path' $ResourcesPath '--results-path' $ResultsPath 2>&1
    if ($LASTEXITCODE -ne 0) {
      $errorMessage = ($commandOutput | Out-String).Trim()
    }
  }
  catch {
    $errorMessage = $_.Exception.Message
  }

  if (Test-Path -LiteralPath $ResultsPath) {
    $result = Get-JsonFile -Path $ResultsPath
  }

  return [pscustomobject]@{
    success = [bool]($result -and $result.validationPassed -eq $true)
    errorMessage = $errorMessage
    result = $result
    resultsPath = $ResultsPath
  }
}

$resolvedInstallerPath = Get-InstallerPath -PreferredPath $InstallerPath
if ([System.IO.Path]::IsPathRooted($OutputPath)) {
  $outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
} else {
  $outputFullPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $OutputPath))
}
$outputDirectory = Split-Path -Parent $outputFullPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$electronAppRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$buildOutputRoot = Join-Path $electronAppRoot 'build-output'
$packageJson = Get-JsonFile -Path (Join-Path $electronAppRoot 'package.json')
$selectedIconPath = Join-Path $electronAppRoot 'build-resources\KTS_Icon.ico'
$portableValidationResultsPath = Join-Path $buildOutputRoot 'portable-validation-results.json'

if (-not (Test-Path -LiteralPath $portableValidationResultsPath)) {
  throw 'Missing portable-validation-results.json. Run the packaged bootstrap verification first.'
}
$portableValidation = Get-JsonFile -Path $portableValidationResultsPath

if (-not (Test-Path -LiteralPath $selectedIconPath)) {
  throw "Missing selected Windows icon file at $selectedIconPath"
}
$iconMetadata = Get-IcoMetadata -Bytes ([System.IO.File]::ReadAllBytes($selectedIconPath))

$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$measurementRoot = Join-Path $env:TEMP ('KTSBL_' + $timestamp)
$installDir = $measurementRoot
$installedValidationResultsPath = Join-Path $env:TEMP ('KTSBLVAL_' + $timestamp + '.json')
$defaultUserDataPath = Join-Path $env:APPDATA 'Kurash Scoreboard'
$defaultUserDataExistedBefore = Test-Path -LiteralPath $defaultUserDataPath
$defaultUserDataLastWriteBefore = if ($defaultUserDataExistedBefore) { (Get-Item -LiteralPath $defaultUserDataPath).LastWriteTimeUtc.ToString('o') } else { $null }

$installedExeName = '{0}.exe' -f $packageJson.build.executableName
$installSearchStartUtc = (Get-Date).ToUniversalTime().AddSeconds(-5)
$installStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$installerInfo = Get-Item -LiteralPath $resolvedInstallerPath
$installResult = Invoke-SilentInstall -InstallerExe $resolvedInstallerPath -InstallDir $installDir

$isolatedInstalledExePath = Wait-ForInstalledExecutable -InstallDir $installDir -InstalledExeName $installedExeName -TimeoutSeconds 120
$detectedInstalledExePath = $null
if (-not $isolatedInstalledExePath) {
  $detectedInstalledExePath = Find-DetectedInstalledExecutable -InstalledExeName $installedExeName -NotOlderThanUtc $installSearchStartUtc
}
$installedExePath = if ($isolatedInstalledExePath) { $isolatedInstalledExePath } else { $detectedInstalledExePath }
$installStopwatch.Stop()
$installAttemptDurationMs = [int][math]::Round($installStopwatch.Elapsed.TotalMilliseconds)
$tempInstallMaterialized = [bool]$isolatedInstalledExePath
$detectedSystemInstallMaterialized = [bool]$detectedInstalledExePath
$installExitCodeTolerated = ($installResult.exitCode -eq 2 -and $tempInstallMaterialized)
$winUnpackedRoot = Join-Path $buildOutputRoot 'win-unpacked'
if (-not (Test-Path -LiteralPath $winUnpackedRoot)) {
  throw "Missing fallback packaged root at $winUnpackedRoot"
}
$effectiveInstalledRoot = if ($tempInstallMaterialized) {
  $installDir
} elseif ($detectedSystemInstallMaterialized) {
  Split-Path -Parent $detectedInstalledExePath
} else {
  $winUnpackedRoot
}
$installedPayloadSource = if ($tempInstallMaterialized) {
  'temp-install'
} elseif ($detectedSystemInstallMaterialized) {
  'detected-system-install'
} else {
  'win-unpacked-fallback'
}
$installDurationMs = if ($tempInstallMaterialized -or $detectedSystemInstallMaterialized) { $installAttemptDurationMs } else { $null }
$installMetricAvailable = ($tempInstallMaterialized -or $detectedSystemInstallMaterialized)
$tempInstallWarning = if ($tempInstallMaterialized) {
  $null
} elseif ($detectedSystemInstallMaterialized) {
  'The one-click installer did not materialize the requested isolated temp directory, so installed metrics were captured from the detected current-user install location instead.'
} else {
  'Installed executable did not materialize in the isolated temp install path; installed size and breakdown are using win-unpacked as a local fallback.'
}

$installedSizeBytes = Get-DirectorySizeBytes -Path $effectiveInstalledRoot
$topLevelFolderSizes = Get-TopLevelFolderSizes -InstallRoot $effectiveInstalledRoot
$topLargestFiles = Get-TopLargestFiles -InstallRoot $effectiveInstalledRoot -Limit 10
$groupedTotals = Get-GroupedTotals -InstallRoot $effectiveInstalledRoot

$installedPayloadResourcesPath = if ($tempInstallMaterialized -or $detectedSystemInstallMaterialized) {
  Join-Path $effectiveInstalledRoot 'resources'
} else {
  $null
}
$installedValidation = if ($installedPayloadResourcesPath -and (Test-Path -LiteralPath $installedPayloadResourcesPath)) {
  Invoke-OrchestratorHarnessCapture -ResourcesPath $installedPayloadResourcesPath -ResultsPath $installedValidationResultsPath
} else {
  [pscustomobject]@{
    success = $false
    errorMessage = 'Installed payload resources were not available for harness validation.'
    result = $null
    resultsPath = $installedValidationResultsPath
  }
}
$launchMetricsSource = if ($installedValidation.success) { 'installed-payload-harness' } else { 'win-unpacked-build-output' }
$selectedValidation = if ($installedValidation.success) { $installedValidation.result } else { $portableValidation }

$defaultUserDataExistedAfter = Test-Path -LiteralPath $defaultUserDataPath
$defaultUserDataLastWriteAfter = if ($defaultUserDataExistedAfter) { (Get-Item -LiteralPath $defaultUserDataPath).LastWriteTimeUtc.ToString('o') } else { $null }
$defaultUserDataCreatedByMeasurement = (-not $defaultUserDataExistedBefore) -and $defaultUserDataExistedAfter
$defaultUserDataLastWriteChanged = ($defaultUserDataLastWriteBefore -ne $defaultUserDataLastWriteAfter)
$defaultUserDataUntouched = (-not $defaultUserDataCreatedByMeasurement) -and (-not $defaultUserDataLastWriteChanged)
$installedValidationRunRoot = if ($installedValidation.result) { $installedValidation.result.runRoot } else { $null }
$installedValidationUserData = if ($installedValidation.result) {
  if ($installedValidation.result.userData) {
    $installedValidation.result.userData
  } else {
    $installedValidation.result.userDataPath
  }
} else {
  $null
}

$cleanupVerification = [ordered]@{
  attempted = $true
  measurementRootPath = $measurementRoot
  installDirectoryPath = $installDir
  installedValidationRunRootPath = $installedValidationRunRoot
  installedValidationResultsPath = $installedValidationResultsPath
  installDirectoryExistedBeforeCleanup = (Test-Path -LiteralPath $installDir)
  installedValidationRunRootExistedBeforeCleanup = [bool]($installedValidationRunRoot -and (Test-Path -LiteralPath $installedValidationRunRoot))
  measurementRootExistedBeforeCleanup = (Test-Path -LiteralPath $measurementRoot)
  installedValidationResultsExistedBeforeCleanup = (Test-Path -LiteralPath $installedValidationResultsPath)
  installDirectoryRemoved = $false
  installedValidationRunRootRemoved = $false
  measurementRootRemoved = $false
  installedValidationResultsRemoved = $false
  installDirectoryExistsAfterCleanup = $true
  installedValidationRunRootExistsAfterCleanup = $false
  measurementRootExistsAfterCleanup = $true
}

if (Test-Path -LiteralPath $installDir) {
  Remove-Item -LiteralPath $installDir -Recurse -Force
}
$cleanupVerification.installDirectoryRemoved = Test-IsolatedPathCleaned -Path $installDir
$cleanupVerification.installDirectoryExistsAfterCleanup = -not $cleanupVerification.installDirectoryRemoved

if ($installedValidationRunRoot -and (Test-Path -LiteralPath $installedValidationRunRoot)) {
  Remove-Item -LiteralPath $installedValidationRunRoot -Recurse -Force
}
$cleanupVerification.installedValidationRunRootRemoved = if ($installedValidationRunRoot) { Test-IsolatedPathCleaned -Path $installedValidationRunRoot } else { $true }
$cleanupVerification.installedValidationRunRootExistsAfterCleanup = if ($installedValidationRunRoot) { -not $cleanupVerification.installedValidationRunRootRemoved } else { $false }

if (Test-Path -LiteralPath $installedValidationResultsPath) {
  Remove-Item -LiteralPath $installedValidationResultsPath -Force
}
$cleanupVerification.installedValidationResultsRemoved = Test-IsolatedPathCleaned -Path $installedValidationResultsPath
$cleanupVerification.installedValidationResultsExistAfterCleanup = -not $cleanupVerification.installedValidationResultsRemoved

if (Test-Path -LiteralPath $measurementRoot) {
  Remove-Item -LiteralPath $measurementRoot -Recurse -Force
}
$cleanupVerification.measurementRootRemoved = Test-IsolatedPathCleaned -Path $measurementRoot
$cleanupVerification.measurementRootExistsAfterCleanup = -not $cleanupVerification.measurementRootRemoved

$baseline = [ordered]@{
  metricScope = 'local-baseline'
  generatedAt = (Get-Date).ToUniversalTime().ToString('o')
  repositoryRoot = $repoRoot
  installerPath = $resolvedInstallerPath
  installedExePath = $installedExePath
  installedPayloadSource = $installedPayloadSource
  installedPayloadRoot = $effectiveInstalledRoot
  installedPayloadResourcesPath = $installedPayloadResourcesPath
  installerSizeBytes = [int64]$installerInfo.Length
  installedSizeBytes = $installedSizeBytes
  installExitCode = $installResult.exitCode
  installExitCodeTolerated = $installExitCodeTolerated
  installerProcessExitDurationMs = $installResult.durationMs
  installAttemptDurationMs = $installAttemptDurationMs
  installMetricAvailable = $installMetricAvailable
  installDurationMs = $installDurationMs
  tempInstallMaterialized = $tempInstallMaterialized
  detectedSystemInstallMaterialized = $detectedSystemInstallMaterialized
  tempInstallWarning = $tempInstallWarning
  firstLaunchDurationMs = $selectedValidation.firstRun.launchDurationMs
  relaunchDurationMs = $selectedValidation.secondRun.launchDurationMs
  launchMetricsSource = $launchMetricsSource
  cleanupVerification = [pscustomobject]$cleanupVerification
  userDataIsolation = [pscustomobject]@{
    defaultUserDataPath = $defaultUserDataPath
    existedBefore = $defaultUserDataExistedBefore
    existedAfter = $defaultUserDataExistedAfter
    createdByMeasurement = $defaultUserDataCreatedByMeasurement
    lastWriteTimeBefore = $defaultUserDataLastWriteBefore
    lastWriteTimeAfter = $defaultUserDataLastWriteAfter
    lastWriteTimeChanged = $defaultUserDataLastWriteChanged
    defaultUserDataUntouched = $defaultUserDataUntouched
    installedValidationRunRoot = $installedValidationRunRoot
    installedValidationUserData = $installedValidationUserData
  }
  iconSelection = [pscustomobject]@{
    selectedIcoPath = $selectedIconPath
    isWindowsIco = $iconMetadata.isWindowsIco
    isMultiSizeWindowsIco = $iconMetadata.isMultiSize
    imageCount = $iconMetadata.imageCount
    imageSizes = $iconMetadata.imageSizes
  }
  sizeBreakdown = [pscustomobject]@{
    source = $installedPayloadSource
    sourceRoot = $effectiveInstalledRoot
    topLevelFolderSizes = $topLevelFolderSizes
    top10LargestFiles = $topLargestFiles
    groupedTotals = $groupedTotals
  }
  validation = [pscustomobject]@{
    selectedLaunchMetricsSource = $launchMetricsSource
    installedPayloadHarness = [pscustomobject]@{
      attempted = [bool]$installedPayloadResourcesPath
      resourcesPath = $installedPayloadResourcesPath
      validationPassed = if ($installedValidation.result) { $installedValidation.result.validationPassed } else { $false }
      errorMessage = $installedValidation.errorMessage
      summary = if ($installedValidation.result) { $installedValidation.result.validationSummary } else { $null }
      firstRun = if ($installedValidation.result) { $installedValidation.result.firstRun } else { $null }
      secondRun = if ($installedValidation.result) { $installedValidation.result.secondRun } else { $null }
      recoveryRun = if ($installedValidation.result) { $installedValidation.result.recoveryRun } else { $null }
    }
    winUnpackedBuildOutput = [pscustomobject]@{
      validationPassed = $portableValidation.validationPassed
      summary = $portableValidation.validationSummary
      firstRun = $portableValidation.firstRun
      secondRun = $portableValidation.secondRun
      recoveryRun = $portableValidation.recoveryRun
    }
  }
}

$json = $baseline | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($outputFullPath, $json, $utf8NoBom)
Write-Output $outputFullPath
