#requires -Version 7.2

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$checks = [ordered]@{
  windows = [bool]$IsWindows
  powershell_7_2 = $PSVersionTable.PSVersion -ge [Version]'7.2'
  os_architecture = [Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
  process_architecture = [Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString().ToLowerInvariant()
  dotnet_sdk = $false
  dotnet_framework_48_runtime = $false
  outlook_installed = $false
  outlook_bitness = $null
  outlook_version = $null
}
$versions = [ordered]@{
  dotnet_sdk = $null
}
$readOnlyDiscoveryProcessCount = 0

function Get-ExistingFile {
  param([string[]]$Candidates)
  foreach ($candidate in $Candidates) {
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
      return $candidate
    }
  }
  return $null
}

function Get-RegistryValue {
  param(
    [string[]]$Paths,
    [string]$Name
  )
  foreach ($path in $Paths) {
    $item = Get-ItemProperty -LiteralPath $path -ErrorAction SilentlyContinue
    $property = if ($null -ne $item) { $item.PSObject.Properties[$Name] } else { $null }
    if ($null -ne $property -and $null -ne $property.Value) {
      return $property.Value
    }
  }
  return $null
}

function Get-DefaultRegistryValue {
  param([string[]]$Paths)
  foreach ($path in $Paths) {
    $key = Get-Item -LiteralPath $path -ErrorAction SilentlyContinue
    if ($null -ne $key) {
      $value = $key.GetValue('')
      if (-not [string]::IsNullOrWhiteSpace([string]$value)) {
        return [string]$value
      }
    }
  }
  return $null
}

function Add-FailedCheck {
  param(
    [System.Collections.Generic.List[string]]$Codes,
    [bool]$Passed,
    [string]$Code
  )
  if (-not $Passed) {
    $Codes.Add($Code)
  }
}

function Write-PreflightReceipt {
  param([System.Collections.Generic.List[string]]$Codes)
  $buildReady = $checks.windows `
    -and $checks.powershell_7_2 `
    -and $checks.dotnet_sdk
  $hostReady = $checks.windows `
    -and $checks.dotnet_framework_48_runtime `
    -and $checks.outlook_installed `
    -and @('x86', 'x64').Contains([string]$checks.outlook_bitness)
  $receipt = [ordered]@{
    schema_version = 'law-firm-os.outlook-classic-windows-toolchain-preflight.v2'
    verdict = if ($buildReady -and $hostReady) { 'PASS' } else { 'BLOCKED' }
    build_toolchain_ready = [bool]$buildReady
    classic_outlook_host_ready = [bool]$hostReady
    checks = $checks
    versions = $versions
    safe_error_codes = @($Codes)
    boundaries = [ordered]@{
      read_only = $true
      registry_write_count = 0
      mutation_process_start_count = 0
      read_only_discovery_process_count = $readOnlyDiscoveryProcessCount
      network_request_count = 0
      outlook_launch_count = 0
      custom_signature_system_required = $false
      vsto_required = $false
      m365_assignment_checked = $false
      production_ready_claim = $false
    }
  }
  Write-Output ($receipt | ConvertTo-Json -Depth 8)
  if ($receipt.verdict -eq 'PASS') { exit 0 }
  exit 2
}

$failed = [System.Collections.Generic.List[string]]::new()
Add-FailedCheck $failed $checks.windows 'WINDOWS_REQUIRED'
Add-FailedCheck $failed $checks.powershell_7_2 'POWERSHELL_7_2_REQUIRED'
if (-not $checks.windows) {
  Write-PreflightReceipt $failed
}

$dotnet = Get-Command 'dotnet' -ErrorAction SilentlyContinue
if ($null -ne $dotnet) {
  $readOnlyDiscoveryProcessCount += 1
  $dotnetVersion = (& $dotnet.Source --version 2>$null | Select-Object -First 1)
  if (-not [string]::IsNullOrWhiteSpace([string]$dotnetVersion)) {
    $versions.dotnet_sdk = ([string]$dotnetVersion).Trim()
    $checks.dotnet_sdk = $true
  }
}

$frameworkRelease = Get-RegistryValue @(
  'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full',
  'HKLM:\SOFTWARE\WOW6432Node\Microsoft\NET Framework Setup\NDP\v4\Full'
) 'Release'
$checks.dotnet_framework_48_runtime = ([int64]($frameworkRelease ?? 0)) -ge 528040

$clickToRunPath = 'HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration'
$clickToRun = Get-ItemProperty -LiteralPath $clickToRunPath -ErrorAction SilentlyContinue
$outlookPath = $null
if ($null -ne $clickToRun) {
  $installationProperty = $clickToRun.PSObject.Properties['InstallationPath']
  $platformProperty = $clickToRun.PSObject.Properties['Platform']
  $candidateRoot = if ($null -ne $installationProperty) { [string]$installationProperty.Value } else { '' }
  if (-not [string]::IsNullOrWhiteSpace($candidateRoot)) {
    $outlookPath = Get-ExistingFile @(
      (Join-Path $candidateRoot 'root\Office16\OUTLOOK.EXE'),
      (Join-Path $candidateRoot 'Office16\OUTLOOK.EXE')
    )
  }
  $platform = if ($null -ne $platformProperty) {
    ([string]$platformProperty.Value).Trim().ToLowerInvariant()
  } else {
    ''
  }
  if (@('x86', 'x64').Contains($platform)) {
    $checks.outlook_bitness = $platform
  }
}
if ($null -eq $outlookPath) {
  $outlookPath = Get-ExistingFile @(
    (Get-DefaultRegistryValue @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\OUTLOOK.EXE')),
    (Get-DefaultRegistryValue @('HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\OUTLOOK.EXE'))
  )
}
$checks.outlook_installed = $null -ne $outlookPath
if ($checks.outlook_installed) {
  $checks.outlook_version = [Diagnostics.FileVersionInfo]::GetVersionInfo($outlookPath).FileVersion
}

Add-FailedCheck $failed $checks.dotnet_sdk 'DOTNET_SDK_REQUIRED'
Add-FailedCheck $failed $checks.dotnet_framework_48_runtime 'DOTNET_FRAMEWORK_48_RUNTIME_REQUIRED'
Add-FailedCheck $failed $checks.outlook_installed 'OUTLOOK_REQUIRED'
Add-FailedCheck $failed (@('x86', 'x64').Contains([string]$checks.outlook_bitness)) 'OUTLOOK_BITNESS_UNRESOLVED'
Write-PreflightReceipt $failed
