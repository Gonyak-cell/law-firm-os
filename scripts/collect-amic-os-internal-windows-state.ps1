#requires -Version 7.2

[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [ValidateSet('preinstall', 'installed', 'postuninstall')]
  [string]$Stage,

  [Parameter(Mandatory)]
  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$')]
  [string]$CanaryId,

  [Parameter(Mandatory)]
  [ValidatePattern('^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$')]
  [string]$ExpectedVersion,

  [Parameter(Mandatory)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$ExpectedSourceSha,

  [Parameter(Mandatory)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$ExpectedSourceTree,

  [Parameter(Mandatory)]
  [ValidatePattern('^[0-9a-fA-F]{64}$')]
  [string]$ExpectedInstallerSha256,

  [Parameter(Mandatory)]
  [ValidateNotNullOrEmpty()]
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$SchemaVersion = 'law-firm-os.amic-os-internal-unsigned-windows-host-state.v1'
$ExpectedComputerName = 'JWS-GALAXYBOOK'
$InstallRoot = 'C:\Program Files\matter'
$ExecutablePath = "$InstallRoot\matter.exe"
$BuildManifestPath = "$InstallRoot\resources\matter-build-manifest.json"
$InternalMarkerPath = "$InstallRoot\resources\matter-internal-unsigned-release.json"
$UpdateTrustPath = "$InstallRoot\resources\matter-internal-update-trust.json"
$OutlookAddinPath = "$InstallRoot\resources\classic-outlook\AMIC.OS.Vault.Outlook.dll"
$OutlookAddinRegistryPath = 'Software\Microsoft\Office\Outlook\Addins\AMIC.OS.Vault.Outlook'
$OutlookComRegistryPath = 'Software\Classes\CLSID\{F6C72FE5-325E-49D6-9D1A-1D15122F6D88}\InprocServer32'
$DesktopRegistryPath = 'Software\AMIC\AMIC OS'
$ProtocolRegistryPath = 'Software\Classes\matter'
$ExpectedAppId = 'com.amic.matter.desktop.internal'
$ExpectedDistributionProfile = 'internal-unsigned'
$ExpectedSourceSha = $ExpectedSourceSha.ToLowerInvariant()
$ExpectedSourceTree = $ExpectedSourceTree.ToLowerInvariant()
$ExpectedInstallerSha256 = $ExpectedInstallerSha256.ToLowerInvariant()

function Get-Sha256Text {
  param([AllowEmptyString()][string]$Value)
  $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
  return [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}

function Test-ExactPropertyNames {
  param(
    [object]$Value,
    [string[]]$ExpectedNames
  )
  if ($null -eq $Value) { return $false }
  $actual = @($Value.PSObject.Properties.Name)
  if ($actual.Count -ne $ExpectedNames.Count) { return $false }
  for ($index = 0; $index -lt $ExpectedNames.Count; $index += 1) {
    if ($actual[$index] -cne $ExpectedNames[$index]) { return $false }
  }
  return $true
}

function Get-FileRecord {
  param(
    [string]$Path,
    [switch]$IncludeVersion
  )
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
    return [ordered]@{
      present = $false
      reparse_point = $false
      bytes = $null
      sha256 = $null
      file_version = $null
      product_version = $null
    }
  }
  $item = Get-Item -LiteralPath $Path -Force
  $record = [ordered]@{
    present = $true
    reparse_point = [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
    bytes = [int64]$item.Length
    sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
    file_version = $null
    product_version = $null
  }
  if ($IncludeVersion) {
    $version = [Diagnostics.FileVersionInfo]::GetVersionInfo($Path)
    $record.file_version = [string]$version.FileVersion
    $record.product_version = [string]$version.ProductVersion
  }
  return $record
}

function Open-RegistryKey {
  param(
    [Microsoft.Win32.RegistryHive]$Hive,
    [Microsoft.Win32.RegistryView]$View,
    [string]$Path
  )
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($Hive, $View)
  try {
    $key = $base.OpenSubKey($Path, $false)
    if ($null -eq $key) { return $null }
    try {
      $values = [ordered]@{}
      foreach ($name in $key.GetValueNames()) {
        $values[$name] = $key.GetValue(
          $name,
          $null,
          [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
        )
      }
      return [pscustomobject]@{ Values = $values }
    } finally {
      $key.Dispose()
    }
  } finally {
    $base.Dispose()
  }
}

function Get-ProductUninstallEntries {
  $matches = @()
  $uninstallPath = 'Software\Microsoft\Windows\CurrentVersion\Uninstall'
  foreach ($hive in @(
    [Microsoft.Win32.RegistryHive]::LocalMachine,
    [Microsoft.Win32.RegistryHive]::CurrentUser
  )) {
    foreach ($view in @(
      [Microsoft.Win32.RegistryView]::Registry64,
      [Microsoft.Win32.RegistryView]::Registry32
    )) {
      $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($hive, $view)
      try {
        $root = $base.OpenSubKey($uninstallPath, $false)
        if ($null -eq $root) { continue }
        try {
          foreach ($subkeyName in $root.GetSubKeyNames()) {
            $key = $root.OpenSubKey($subkeyName, $false)
            if ($null -eq $key) { continue }
            try {
              $displayName = [string]$key.GetValue('DisplayName', '')
              if ($displayName -notmatch '^AMIC OS(?: [0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?)?$') {
                continue
              }
              $displayVersion = [string]$key.GetValue('DisplayVersion', '')
              $installLocation = [string]$key.GetValue('InstallLocation', '')
              $uninstallString = [string]$key.GetValue(
                'UninstallString',
                '',
                [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames
              )
              $expectedUninstall = '"' + (Join-Path $InstallRoot 'Uninstall matter.exe') + '" /allusers'
              $matches += [ordered]@{
                display_name_exact = $displayName -ceq "AMIC OS $ExpectedVersion"
                display_version_exact = $displayVersion -ceq $ExpectedVersion
                install_location_exact = [string]::IsNullOrEmpty($installLocation) `
                  -or $installLocation.TrimEnd('\') -ieq $InstallRoot
                uninstall_command_exact = $uninstallString -ieq $expectedUninstall
              }
            } finally {
              $key.Dispose()
            }
          }
        } finally {
          $root.Dispose()
        }
      } finally {
        $base.Dispose()
      }
    }
  }
  return @($matches)
}

function Test-ProductPathReference {
  param([AllowNull()][string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
  $candidate = $Value.ToLowerInvariant()
  $root = $InstallRoot.ToLowerInvariant()
  $executable = $ExecutablePath.ToLowerInvariant()
  if ($candidate.Contains($executable)) { return $true }
  $offset = $candidate.IndexOf($root, [StringComparison]::OrdinalIgnoreCase)
  while ($offset -ge 0) {
    $end = $offset + $root.Length
    if ($end -eq $candidate.Length -or @('\', '"', "'", ' ', "`t").Contains([string]$candidate[$end])) {
      return $true
    }
    $offset = $candidate.IndexOf($root, $offset + 1, [StringComparison]::OrdinalIgnoreCase)
  }
  return $false
}

function Test-ExactOutlookCodeBase {
  param([AllowNull()][string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
  try {
    $uri = [Uri]$Value
    if ($uri.IsFile) {
      return [IO.Path]::GetFullPath($uri.LocalPath) -ieq $OutlookAddinPath
    }
  } catch {
    return $false
  }
  return $false
}

function Get-RegistryState {
  $desktopCount = 0
  $desktopExactCount = 0
  $addinCount = 0
  $addinExactCount = 0
  $comCount = 0
  $comExactCount = 0
  $protocolCount = 0
  $protocolExactCount = 0
  foreach ($view in @(
    [Microsoft.Win32.RegistryView]::Registry64,
    [Microsoft.Win32.RegistryView]::Registry32
  )) {
    $desktop = Open-RegistryKey -Hive CurrentUser -View $view -Path $DesktopRegistryPath
    if ($null -ne $desktop) {
      $desktopCount += 1
      if ([string]$desktop.Values['DesktopExecutable'] -ieq $ExecutablePath) {
        $desktopExactCount += 1
      }
    }

    $addin = Open-RegistryKey -Hive CurrentUser -View $view -Path $OutlookAddinRegistryPath
    if ($null -ne $addin) {
      $addinCount += 1
      if ([string]$addin.Values['FriendlyName'] -ceq 'AMIC OS Vault' `
          -and [int64]($addin.Values['LoadBehavior'] ?? -1) -eq 3 `
          -and [int64]($addin.Values['CommandLineSafe'] ?? -1) -eq 0 `
          -and [int64]($addin.Values['RequireShutdownNotification'] ?? -1) -eq 1) {
        $addinExactCount += 1
      }
    }

    $com = Open-RegistryKey -Hive LocalMachine -View $view -Path $OutlookComRegistryPath
    if ($null -ne $com) {
      $comCount += 1
      if (Test-ExactOutlookCodeBase ([string]$com.Values['CodeBase'])) {
        $comExactCount += 1
      }
    }

    $protocolRoot = Open-RegistryKey -Hive CurrentUser -View $view -Path $ProtocolRegistryPath
    $protocol = Open-RegistryKey -Hive CurrentUser -View $view -Path "$ProtocolRegistryPath\shell\open\command"
    if ($null -ne $protocolRoot -or $null -ne $protocol) {
      $protocolCount += 1
      $command = if ($null -ne $protocol) { [string]$protocol.Values[''] } else { '' }
      if ($null -ne $protocolRoot `
          -and $protocolRoot.Values.Contains('URL Protocol') `
          -and (Test-ProductPathReference $command) `
          -and $command.Contains('%1')) {
        $protocolExactCount += 1
      }
    }
  }
  return [ordered]@{
    desktop_entry_count = $desktopCount
    desktop_exact_count = $desktopExactCount
    outlook_addin_entry_count = $addinCount
    outlook_addin_exact_count = $addinExactCount
    outlook_com_entry_count = $comCount
    outlook_com_exact_count = $comExactCount
    protocol_handler_count = $protocolCount
    protocol_handler_exact_count = $protocolExactCount
  }
}

function Get-ShortcutState {
  $candidatePaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($specialFolder in @(
    [Environment+SpecialFolder]::CommonDesktopDirectory,
    [Environment+SpecialFolder]::DesktopDirectory,
    [Environment+SpecialFolder]::CommonPrograms,
    [Environment+SpecialFolder]::Programs
  )) {
    $root = [Environment]::GetFolderPath($specialFolder)
    if ([string]::IsNullOrWhiteSpace($root) -or -not (Test-Path -LiteralPath $root -PathType Container)) {
      continue
    }
    foreach ($item in @(Get-ChildItem -LiteralPath $root -Filter 'AMIC OS.lnk' -File -Recurse -ErrorAction SilentlyContinue)) {
      [void]$candidatePaths.Add($item.FullName)
    }
  }
  $records = @()
  $shell = $null
  try {
    if ($candidatePaths.Count -gt 0) {
      $shell = New-Object -ComObject WScript.Shell
    }
    foreach ($path in @($candidatePaths | Sort-Object)) {
      $shortcut = $shell.CreateShortcut($path)
      try {
        $target = [Environment]::ExpandEnvironmentVariables([string]$shortcut.TargetPath)
        $records += [ordered]@{
          sha256 = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
          target_exact = -not [string]::IsNullOrWhiteSpace($target) `
            -and [IO.Path]::GetFullPath($target) -ieq $ExecutablePath
        }
      } finally {
        if ($null -ne $shortcut) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shortcut) }
      }
    }
  } finally {
    if ($null -ne $shell) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
  }
  $aggregate = if ($records.Count -eq 0) {
    $null
  } else {
    Get-Sha256Text (($records | ForEach-Object { "$($_.sha256):$($_.target_exact)" }) -join "`n")
  }
  return [ordered]@{
    count = $records.Count
    exact_target_count = @($records | Where-Object { $_.target_exact }).Count
    aggregate_sha256 = $aggregate
  }
}

function Get-PackageMetadata {
  $manifest = $null
  $marker = $null
  $trust = $null
  if (Test-Path -LiteralPath $BuildManifestPath -PathType Leaf) {
    $value = Get-Content -LiteralPath $BuildManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $manifestExact = (Test-ExactPropertyNames $value @(
      'schema_version', 'product_name', 'package_name', 'version', 'source_sha',
      'source_tree', 'source_dirty', 'renderer', 'channel', 'platform', 'arch',
      'app_id', 'built_at', 'public_release_claim', 'production_go_live_claim'
    )) -and (Test-ExactPropertyNames $value.renderer @('sha256', 'file_count', 'algorithm')) `
      -and [string]$value.schema_version -ceq 'law-firm-os.matter-desktop-build-provenance.v1' `
      -and [string]$value.product_name -ceq 'matter' `
      -and [string]$value.package_name -ceq '@law-firm-os/desktop' `
      -and [string]$value.version -ceq $ExpectedVersion `
      -and [string]$value.source_sha -ceq $ExpectedSourceSha `
      -and [string]$value.source_tree -ceq $ExpectedSourceTree `
      -and $value.source_dirty -eq $false `
      -and [string]$value.renderer.sha256 -match '^[0-9a-f]{64}$' `
      -and [int64]$value.renderer.file_count -gt 0 `
      -and [string]$value.channel -ceq 'internal' `
      -and [string]$value.platform -ceq 'win32' `
      -and [string]$value.arch -ceq 'x64' `
      -and [string]$value.app_id -ceq $ExpectedAppId `
      -and $value.public_release_claim -eq $false `
      -and $value.production_go_live_claim -eq $false
    $manifest = [ordered]@{
      sha256 = (Get-FileHash -LiteralPath $BuildManifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
      schema_version = [string]$value.schema_version
      version = [string]$value.version
      source_sha = [string]$value.source_sha
      source_tree = [string]$value.source_tree
      renderer_sha256 = [string]$value.renderer.sha256
      renderer_file_count = [int64]$value.renderer.file_count
      channel = [string]$value.channel
      platform = [string]$value.platform
      architecture = [string]$value.arch
      app_id = [string]$value.app_id
      source_clean = $value.source_dirty -eq $false
      public_release_claim = [bool]$value.public_release_claim
      production_go_live_claim = [bool]$value.production_go_live_claim
      exact = [bool]$manifestExact
    }
  }
  if (Test-Path -LiteralPath $InternalMarkerPath -PathType Leaf) {
    $value = Get-Content -LiteralPath $InternalMarkerPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $markerExact = (Test-ExactPropertyNames $value @(
      'channel', 'distribution_profile', 'local_api_default', 'bundled_local_api'
    )) -and [string]$value.channel -ceq 'internal' `
      -and [string]$value.distribution_profile -ceq $ExpectedDistributionProfile `
      -and [string]$value.local_api_default -ceq 'disabled' `
      -and $value.bundled_local_api -eq $false
    $marker = [ordered]@{
      sha256 = (Get-FileHash -LiteralPath $InternalMarkerPath -Algorithm SHA256).Hash.ToLowerInvariant()
      channel = [string]$value.channel
      distribution_profile = [string]$value.distribution_profile
      local_api_default = [string]$value.local_api_default
      bundled_local_api = [bool]$value.bundled_local_api
      exact = [bool]$markerExact
    }
  }
  if (Test-Path -LiteralPath $UpdateTrustPath -PathType Leaf) {
    $value = Get-Content -LiteralPath $UpdateTrustPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $spki = $null
    try { $spki = [Convert]::FromBase64String([string]$value.public_key_spki_base64) } catch { $spki = $null }
    $spkiPrefix = if ($null -ne $spki) { [Convert]::ToHexString($spki).ToLowerInvariant() } else { '' }
    $trustExact = (Test-ExactPropertyNames $value @(
      'schema_version', 'key_id', 'public_key_spki_base64',
      'private_key_material_included', 'public_release_allowed'
    )) -and [string]$value.schema_version -ceq 'law-firm-os.matter-desktop-internal-update-trust.v1' `
      -and [string]$value.key_id -ceq 'matter-internal-update-key-v1' `
      -and $null -ne $spki `
      -and $spki.Length -eq 44 `
      -and $spkiPrefix.StartsWith('302a300506032b6570032100') `
      -and $value.private_key_material_included -eq $false `
      -and $value.public_release_allowed -eq $false
    $trust = [ordered]@{
      sha256 = (Get-FileHash -LiteralPath $UpdateTrustPath -Algorithm SHA256).Hash.ToLowerInvariant()
      schema_version = [string]$value.schema_version
      key_id = [string]$value.key_id
      public_key_spki_sha256 = if ($null -ne $spki) {
        [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($spki)).ToLowerInvariant()
      } else { $null }
      private_key_material_included = [bool]$value.private_key_material_included
      public_release_allowed = [bool]$value.public_release_allowed
      exact = [bool]$trustExact
    }
  }
  return [ordered]@{
    build_manifest = $manifest
    internal_unsigned_marker = $marker
    update_trust = $trust
  }
}

function Write-Receipt {
  param(
    [Collections.IDictionary]$Receipt,
    [int]$ExitCode
  )
  $json = ($Receipt | ConvertTo-Json -Depth 20) + "`n"
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes($json)
  $stream = [IO.File]::Open(
    $script:ResolvedOutputPath,
    [IO.FileMode]::CreateNew,
    [IO.FileAccess]::Write,
    [IO.FileShare]::None
  )
  try {
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush($true)
  } finally {
    $stream.Dispose()
  }
  $receiptSha256 = [Convert]::ToHexString(
    [Security.Cryptography.SHA256]::HashData($bytes)
  ).ToLowerInvariant()
  Write-Output ([ordered]@{
    schema_version = $SchemaVersion
    verdict = $Receipt.verdict
    stage = $Stage
    receipt_sha256 = $receiptSha256
    evidence_file_write_count = 1
  } | ConvertTo-Json -Compress)
  exit $ExitCode
}

$ResolvedOutputPath = [IO.Path]::GetFullPath($OutputPath)
if (-not [IO.Path]::IsPathFullyQualified($OutputPath) `
    -or [IO.Path]::GetExtension($ResolvedOutputPath) -cne '.json') {
  throw 'OutputPath must be an absolute .json path'
}
$outputParent = Split-Path -Parent $ResolvedOutputPath
if (-not (Test-Path -LiteralPath $outputParent -PathType Container) `
    -or (Test-Path -LiteralPath $ResolvedOutputPath)) {
  throw 'OutputPath must name a new file in an existing directory'
}
$parentItem = Get-Item -LiteralPath $outputParent -Force
if ($parentItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
  throw 'OutputPath parent cannot be a reparse point'
}
if ($IsWindows) {
  $outputComparison = $ResolvedOutputPath.ToLowerInvariant()
  foreach ($forbiddenRoot in @(
    $InstallRoot,
    (Join-Path $env:TEMP 'amic-os-internal-update-cache'),
    (Join-Path $env:LOCALAPPDATA 'AMIC OS\OutlookAttachments')
  )) {
    $forbidden = [IO.Path]::GetFullPath($forbiddenRoot).TrimEnd('\')
    if ($outputComparison.StartsWith(($forbidden + '\').ToLowerInvariant(), [StringComparison]::Ordinal)) {
      throw 'OutputPath cannot be inside an AMIC OS product or cache directory'
    }
  }
}

$expected = [ordered]@{
  computer_name = $ExpectedComputerName
  version = $ExpectedVersion
  source_sha = $ExpectedSourceSha
  source_tree = $ExpectedSourceTree
  installer_sha256 = $ExpectedInstallerSha256
  install_root = $InstallRoot
  app_id = $ExpectedAppId
  distribution_profile = $ExpectedDistributionProfile
}
$boundaries = [ordered]@{
  host_state_read_only = $true
  evidence_file_write_count = 1
  registry_write_count = 0
  network_request_count = 0
  installer_launch_count = 0
  uninstall_launch_count = 0
  application_launch_count = 0
  destructive_action_count = 0
  private_data_read_count = 0
  download_verified = $false
  windows_warning_captured = $false
  human_sign_in_checked = $false
  hosted_data_checked = $false
  outlook_action_checked = $false
  update_checked = $false
  rollback_checked = $false
  hosted_data_preservation_checked = $false
  g9_complete_claim = $false
}

if (-not $IsWindows) {
  Write-Receipt ([ordered]@{
    schema_version = $SchemaVersion
    verdict = 'BLOCKED'
    stage = $Stage
    canary_id = $CanaryId
    captured_at_utc = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    expected = $expected
    host = [ordered]@{
      windows = $false
      computer_name = $null
      computer_name_exact = $false
      host_fingerprint_sha256 = $null
      os_version = $null
      os_build_number = $null
      os_architecture = [Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
      process_architecture = [Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString().ToLowerInvariant()
      system_drive = $null
      system_drive_total_bytes = $null
      system_drive_free_bytes = $null
    }
    checks = [ordered]@{
      host_identity_exact = $false
      windows_x64 = $false
      stage_state_exact = $false
    }
    observed = $null
    safe_error_codes = @('WINDOWS_REQUIRED')
    boundaries = $boundaries
  }) 2
}

try {
  $computerName = ([string]$env:COMPUTERNAME).ToUpperInvariant()
  $os = Get-CimInstance Win32_OperatingSystem
  $systemDrive = ([string]$env:SystemDrive).ToUpperInvariant()
  $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$systemDrive'"
  if ($null -eq $os -or $null -eq $disk) { throw 'host inventory unavailable' }
  $hostState = [ordered]@{
    windows = $true
    computer_name = $computerName
    computer_name_exact = $computerName -ceq $ExpectedComputerName
    host_fingerprint_sha256 = Get-Sha256Text (
      "$computerName|$($os.Version)|$($os.BuildNumber)|$([Runtime.InteropServices.RuntimeInformation]::OSArchitecture)"
    )
    os_version = [string]$os.Version
    os_build_number = [string]$os.BuildNumber
    os_architecture = [Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
    process_architecture = [Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString().ToLowerInvariant()
    system_drive = $systemDrive
    system_drive_total_bytes = [int64]$disk.Size
    system_drive_free_bytes = [int64]$disk.FreeSpace
  }

  $installRootPresent = Test-Path -LiteralPath $InstallRoot -PathType Container
  $executable = Get-FileRecord -Path $ExecutablePath -IncludeVersion
  $buildManifestFile = Get-FileRecord -Path $BuildManifestPath
  $internalMarkerFile = Get-FileRecord -Path $InternalMarkerPath
  $updateTrustFile = Get-FileRecord -Path $UpdateTrustPath
  $outlookAddinFile = Get-FileRecord -Path $OutlookAddinPath
  $metadata = Get-PackageMetadata
  $uninstallEntries = @(Get-ProductUninstallEntries)
  $uninstallExactCount = @($uninstallEntries | Where-Object {
    $_.display_name_exact -and $_.display_version_exact `
      -and $_.install_location_exact -and $_.uninstall_command_exact
  }).Count
  $registry = Get-RegistryState
  $shortcuts = Get-ShortcutState
  $productProcesses = @(Get-CimInstance Win32_Process -Filter "Name='matter.exe'" | Where-Object {
    [string]$_.ExecutablePath -ieq $ExecutablePath
  })
  $productServices = @(Get-CimInstance Win32_Service | Where-Object {
    Test-ProductPathReference ([string]$_.PathName)
  })
  $productTasks = @(Get-ScheduledTask | Where-Object {
    @($_.Actions | Where-Object {
      (Test-ProductPathReference ([string]$_.Execute)) `
        -or (Test-ProductPathReference ([string]$_.Arguments)
      )
    }).Count -gt 0
  })
  $updateCachePresent = Test-Path -LiteralPath (Join-Path $env:TEMP 'amic-os-internal-update-cache')
  $outlookAttachmentCachePresent = Test-Path -LiteralPath (
    Join-Path $env:LOCALAPPDATA 'AMIC OS\OutlookAttachments'
  )

  $nativeSnapshot = $null
  if ($Stage -eq 'installed' -and $installRootPresent) {
    $nativeScript = Join-Path $PSScriptRoot 'windows-installed-tree-native-snapshot.ps1'
    if (-not (Test-Path -LiteralPath $nativeScript -PathType Leaf)) {
      throw 'native installed-tree snapshot script is unavailable'
    }
    $priorRoot = $env:MATTER_INSTALLED_TREE_ROOT
    try {
      $env:MATTER_INSTALLED_TREE_ROOT = $InstallRoot
      $nativeSnapshot = (& $nativeScript | ConvertFrom-Json)
    } finally {
      $env:MATTER_INSTALLED_TREE_ROOT = $priorRoot
    }
  }

  $zeroStage = @('preinstall', 'postuninstall').Contains($Stage)
  $checks = [ordered]@{
    host_identity_exact = [bool]$hostState.computer_name_exact
    windows_x64 = $hostState.os_architecture -eq 'x64' -and $hostState.process_architecture -eq 'x64'
    install_root_exact = if ($zeroStage) { -not $installRootPresent } else { $installRootPresent }
    uninstall_entry_exact = if ($zeroStage) {
      $uninstallEntries.Count -eq 0
    } else {
      $uninstallEntries.Count -eq 1 -and $uninstallExactCount -eq 1
    }
    process_state_exact = if ($zeroStage) { $productProcesses.Count -eq 0 } else { $true }
    service_state_exact = $productServices.Count -eq 0
    scheduled_task_state_exact = $productTasks.Count -eq 0
    update_cache_state_exact = -not $updateCachePresent
    outlook_attachment_cache_state_exact = if ($zeroStage) {
      -not $outlookAttachmentCachePresent
    } else { $true }
    desktop_registry_state_exact = if ($zeroStage) {
      $registry.desktop_entry_count -eq 0
    } else {
      $registry.desktop_entry_count -eq 2 -and $registry.desktop_exact_count -eq 2
    }
    outlook_addin_registry_state_exact = if ($zeroStage) {
      $registry.outlook_addin_entry_count -eq 0
    } else {
      $registry.outlook_addin_entry_count -eq 2 -and $registry.outlook_addin_exact_count -eq 2
    }
    outlook_com_registry_state_exact = if ($zeroStage) {
      $registry.outlook_com_entry_count -eq 0
    } else {
      $registry.outlook_com_entry_count -eq 2 -and $registry.outlook_com_exact_count -eq 2
    }
    protocol_handler_state_exact = if ($zeroStage) {
      $registry.protocol_handler_count -eq 0
    } else {
      $registry.protocol_handler_count -ge 1 `
        -and $registry.protocol_handler_count -eq $registry.protocol_handler_exact_count
    }
    shortcut_state_exact = if ($zeroStage) {
      $shortcuts.count -eq 0
    } else {
      $shortcuts.count -ge 1 -and $shortcuts.count -eq $shortcuts.exact_target_count
    }
    build_identity_exact = if ($zeroStage) {
      -not $buildManifestFile.present -and $null -eq $metadata.build_manifest
    } else {
      $buildManifestFile.present -and -not $buildManifestFile.reparse_point `
        -and $metadata.build_manifest.exact
    }
    internal_unsigned_marker_exact = if ($zeroStage) {
      -not $internalMarkerFile.present -and $null -eq $metadata.internal_unsigned_marker
    } else {
      $internalMarkerFile.present -and -not $internalMarkerFile.reparse_point `
        -and $metadata.internal_unsigned_marker.exact
    }
    update_trust_exact = if ($zeroStage) {
      -not $updateTrustFile.present -and $null -eq $metadata.update_trust
    } else {
      $updateTrustFile.present -and -not $updateTrustFile.reparse_point `
        -and $metadata.update_trust.exact
    }
    classic_outlook_file_exact = if ($zeroStage) {
      -not $outlookAddinFile.present
    } else {
      $outlookAddinFile.present -and -not $outlookAddinFile.reparse_point
    }
    native_installed_tree_exact = if ($zeroStage) {
      $null -eq $nativeSnapshot
    } else {
      $null -ne $nativeSnapshot `
        -and [string]$nativeSnapshot.schema_version -ceq 'law-firm-os.windows-installed-tree-native-snapshot.v1' `
        -and [string]$nativeSnapshot.platform -ceq 'win32' `
        -and [string]$nativeSnapshot.filesystem -ceq 'NTFS' `
        -and $nativeSnapshot.fixed_point_exact -eq $true `
        -and [int64]$nativeSnapshot.reparse_point_count -eq 0 `
        -and [int64]$nativeSnapshot.alternate_data_stream_count -eq 0 `
        -and [int64]$nativeSnapshot.hard_link_count -eq 0
    }
    stage_state_exact = $false
  }
  $checks.stage_state_exact = @(
    $checks.GetEnumerator() | Where-Object {
      $_.Key -ne 'stage_state_exact' -and $_.Value -ne $true
    }
  ).Count -eq 0

  $errorCodes = [Collections.Generic.List[string]]::new()
  $codeByCheck = [ordered]@{
    host_identity_exact = 'WINDOWS_HOST_IDENTITY_MISMATCH'
    windows_x64 = 'WINDOWS_X64_REQUIRED'
    install_root_exact = 'WINDOWS_INSTALL_ROOT_STATE_MISMATCH'
    uninstall_entry_exact = 'WINDOWS_UNINSTALL_ENTRY_STATE_MISMATCH'
    process_state_exact = 'WINDOWS_PRODUCT_PROCESS_STATE_MISMATCH'
    service_state_exact = 'WINDOWS_PRODUCT_SERVICE_STATE_MISMATCH'
    scheduled_task_state_exact = 'WINDOWS_PRODUCT_TASK_STATE_MISMATCH'
    update_cache_state_exact = 'WINDOWS_UPDATE_CACHE_STATE_MISMATCH'
    outlook_attachment_cache_state_exact = 'WINDOWS_OUTLOOK_CACHE_STATE_MISMATCH'
    desktop_registry_state_exact = 'WINDOWS_DESKTOP_REGISTRY_STATE_MISMATCH'
    outlook_addin_registry_state_exact = 'WINDOWS_OUTLOOK_ADDIN_STATE_MISMATCH'
    outlook_com_registry_state_exact = 'WINDOWS_OUTLOOK_COM_STATE_MISMATCH'
    protocol_handler_state_exact = 'WINDOWS_PROTOCOL_HANDLER_STATE_MISMATCH'
    shortcut_state_exact = 'WINDOWS_SHORTCUT_STATE_MISMATCH'
    build_identity_exact = 'WINDOWS_BUILD_IDENTITY_MISMATCH'
    internal_unsigned_marker_exact = 'WINDOWS_INTERNAL_MARKER_MISMATCH'
    update_trust_exact = 'WINDOWS_UPDATE_TRUST_MISMATCH'
    classic_outlook_file_exact = 'WINDOWS_OUTLOOK_FILE_STATE_MISMATCH'
    native_installed_tree_exact = 'WINDOWS_NATIVE_TREE_STATE_MISMATCH'
  }
  foreach ($entry in $codeByCheck.GetEnumerator()) {
    if ($checks[$entry.Key] -ne $true) { $errorCodes.Add($entry.Value) }
  }

  $receipt = [ordered]@{
    schema_version = $SchemaVersion
    verdict = if ($checks.stage_state_exact) { 'PASS' } else { 'BLOCKED' }
    stage = $Stage
    canary_id = $CanaryId
    captured_at_utc = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    expected = $expected
    host = $hostState
    checks = $checks
    observed = [ordered]@{
      install_root_present = [bool]$installRootPresent
      executable = $executable
      build_manifest_file = $buildManifestFile
      internal_unsigned_marker_file = $internalMarkerFile
      update_trust_file = $updateTrustFile
      classic_outlook_addin_file = $outlookAddinFile
      package_metadata = $metadata
      uninstall_entry_count = $uninstallEntries.Count
      uninstall_exact_count = $uninstallExactCount
      product_process_count = $productProcesses.Count
      product_service_count = $productServices.Count
      product_scheduled_task_count = $productTasks.Count
      update_cache_present = [bool]$updateCachePresent
      outlook_attachment_cache_present = [bool]$outlookAttachmentCachePresent
      registry = $registry
      shortcuts = $shortcuts
      native_installed_tree = $nativeSnapshot
    }
    safe_error_codes = @($errorCodes)
    boundaries = $boundaries
  }
  Write-Receipt $receipt $(if ($checks.stage_state_exact) { 0 } else { 2 })
} catch {
  Write-Receipt ([ordered]@{
    schema_version = $SchemaVersion
    verdict = 'BLOCKED'
    stage = $Stage
    canary_id = $CanaryId
    captured_at_utc = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
    expected = $expected
    host = $null
    checks = [ordered]@{
      host_identity_exact = $false
      windows_x64 = $false
      stage_state_exact = $false
    }
    observed = $null
    safe_error_codes = @('WINDOWS_STATE_COLLECTION_FAILED')
    boundaries = $boundaries
  }) 2
}
