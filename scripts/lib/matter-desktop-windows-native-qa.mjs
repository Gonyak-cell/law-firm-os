import { execFileSync as nodeExecFileSync } from "node:child_process";
import path from "node:path";

export const WINDOWS_UNINSTALL_INVENTORY_SCHEMA = "law-firm-os.rfd-tuw-013.windows-uninstall-inventory.v1";
export const WINDOWS_UNINSTALL_CONTRACT = Object.freeze({
  schema_version: "law-firm-os.rfd-tuw-013.windows-uninstall-contract.v1",
  product_name: "matter",
  app_id: "com.amic.matter.desktop",
  shortcut_names: Object.freeze(["matter.lnk"]),
  shortcut_scopes: Object.freeze([
    "current_user_desktop",
    "common_desktop",
    "current_user_programs",
    "common_programs",
  ]),
  service_names: Object.freeze([]),
  update_residue_locations: Object.freeze([
    Object.freeze({ id: "local_app_data_updater", relative_path: "matter-updater" }),
    Object.freeze({ id: "local_app_data_program", relative_path: "Programs/matter" }),
  ]),
  install_directory_must_be_absent: true,
  user_data_policy: "isolated_qa_user_data_outside_installer_cleanup_scope",
});

export class WindowsNativeQaValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WindowsNativeQaValidationError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new WindowsNativeQaValidationError(code, message, details);
}

const AUTHENTICODE_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$signature = Get-AuthenticodeSignature -LiteralPath $env:MATTER_WINDOWS_QA_FILE
$certificate = $signature.SignerCertificate
$subject = if ($null -ne $certificate) { [string]$certificate.Subject } else { $null }
$teamEquivalent = $null
if ($null -ne $subject) {
  $organizationIdentifier = [regex]::Match($subject, '(?:^|,\s*)(?:OID\.)?2\.5\.4\.97=([^,]+)')
  $organization = [regex]::Match($subject, '(?:^|,\s*)O=([^,]+)')
  if ($organizationIdentifier.Success) { $teamEquivalent = $organizationIdentifier.Groups[1].Value.Trim() }
  elseif ($organization.Success) { $teamEquivalent = $organization.Groups[1].Value.Trim() }
}
[pscustomobject]@{
  status = [string]$signature.Status
  status_message = if ($signature.Status -eq 'Valid') { 'Signature verified.' } elseif ($signature.Status -eq 'NotSigned') { 'No signature present.' } else { 'Signature verification failed.' }
  signature_type = [string]$signature.SignatureType
  signer_certificate_present = ($null -ne $certificate)
  time_stamper_certificate_present = ($null -ne $signature.TimeStamperCertificate)
  signer_thumbprint = if ($null -ne $certificate) { [string]$certificate.Thumbprint } else { $null }
  signer_subject = $subject
  signer_issuer = if ($null -ne $certificate) { [string]$certificate.Issuer } else { $null }
  signer_team_equivalent = $teamEquivalent
  artifact_sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $env:MATTER_WINDOWS_QA_FILE).Hash.ToLowerInvariant()
} | ConvertTo-Json -Compress
`;

const UNINSTALL_STATE_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$config = $env:MATTER_WINDOWS_QA_RESIDUE_CONFIG | ConvertFrom-Json
$installDir = [IO.Path]::GetFullPath([string]$config.install_dir).TrimEnd('\')
$inspectionErrors = [System.Collections.Generic.List[string]]::new()

$files = @()
$installDirectoryPresent = Test-Path -LiteralPath $installDir -PathType Container
if ($installDirectoryPresent) {
  $files = @(Get-ChildItem -LiteralPath $installDir -File -Recurse -Force | ForEach-Object {
    $relative = $_.FullName.Substring($installDir.Length).TrimStart('\').Replace('\', '/')
    [pscustomobject]@{
      relative_path = $relative
      bytes = [long]$_.Length
      sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName).Hash.ToLowerInvariant()
    }
  } | Sort-Object relative_path)
}

$shortcutRoots = [ordered]@{
  current_user_desktop = [Environment]::GetFolderPath('Desktop')
  common_desktop = [Environment]::GetFolderPath('CommonDesktopDirectory')
  current_user_programs = [Environment]::GetFolderPath('Programs')
  common_programs = [Environment]::GetFolderPath('CommonPrograms')
}
$shortcuts = @()
foreach ($scope in @($config.shortcut_scopes)) {
  foreach ($name in @($config.shortcut_names)) {
    $shortcutExists = $null
    $targetInInstallDirectory = $false
    try {
      $shortcutRoot = [string]$shortcutRoots[$scope]
      if ([string]::IsNullOrWhiteSpace($shortcutRoot)) { throw 'shortcut root unavailable' }
      $shortcutPath = Join-Path $shortcutRoot ([string]$name)
      $shortcutExists = Test-Path -LiteralPath $shortcutPath -PathType Leaf -ErrorAction Stop
      if ($shortcutExists) {
        $shell = New-Object -ComObject WScript.Shell
        $target = [IO.Path]::GetFullPath([string]$shell.CreateShortcut($shortcutPath).TargetPath)
        $targetInInstallDirectory = $target.StartsWith($installDir, [StringComparison]::OrdinalIgnoreCase)
      }
    } catch { $inspectionErrors.Add('shortcut_inspection_failed') }
    $shortcuts += [pscustomobject]@{
      scope = [string]$scope
      name = [string]$name
      present = $shortcutExists
      target_in_install_directory = $targetInInstallDirectory
    }
  }
}

$services = @()
try {
  $declaredServiceNames = @($config.service_names)
  $services = @(Get-CimInstance Win32_Service -ErrorAction Stop | Where-Object {
    $servicePath = [string]$_.PathName
    ($declaredServiceNames -contains [string]$_.Name) -or
      ($declaredServiceNames -contains [string]$_.DisplayName) -or
      ($servicePath.IndexOf($installDir, [StringComparison]::OrdinalIgnoreCase) -ge 0)
  } | ForEach-Object {
    [pscustomobject]@{
      name = [string]$_.Name
      display_name = [string]$_.DisplayName
      path_in_install_directory = ([string]$_.PathName).IndexOf($installDir, [StringComparison]::OrdinalIgnoreCase) -ge 0
    }
  } | Sort-Object name)
} catch { $inspectionErrors.Add('service_inspection_failed') }

$registry = @()
$registryRoots = [ordered]@{
  hkcu = 'Registry::HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Uninstall'
  hklm = 'Registry::HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Uninstall'
  hklm_wow6432 = 'Registry::HKEY_LOCAL_MACHINE\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'
}
foreach ($rootId in $registryRoots.Keys) {
  $rootPath = [string]$registryRoots[$rootId]
  try {
    if (!(Test-Path -LiteralPath $rootPath -ErrorAction Stop)) { continue }
    $registryKeys = @(Get-ChildItem -LiteralPath $rootPath -ErrorAction Stop)
  } catch {
    $inspectionErrors.Add('registry_enumeration_failed')
    continue
  }
  foreach ($key in $registryKeys) {
    try {
      $properties = Get-ItemProperty -LiteralPath $key.PSPath -ErrorAction Stop
      if ($null -eq $properties) { throw 'registry properties unavailable' }
    } catch {
      $inspectionErrors.Add('registry_property_inspection_failed')
      continue
    }
    $displayName = [string]$properties.DisplayName
    $installLocation = [string]$properties.InstallLocation
    $uninstallString = [string]$properties.UninstallString
    $matches = $displayName -eq [string]$config.product_name -or
      [string]$key.PSChildName -eq [string]$config.app_id -or
      $installLocation.StartsWith($installDir, [StringComparison]::OrdinalIgnoreCase) -or
      $uninstallString.IndexOf($installDir, [StringComparison]::OrdinalIgnoreCase) -ge 0
    if ($matches) {
      $registry += [pscustomobject]@{
        hive = [string]$rootId
        key = [string]$key.PSChildName
        display_name_matches = $displayName -eq [string]$config.product_name
        install_location_matches = $installLocation.StartsWith($installDir, [StringComparison]::OrdinalIgnoreCase)
      }
    }
  }
}
$registry = @($registry | Sort-Object hive, key)

$localAppData = [Environment]::GetFolderPath('LocalApplicationData')
$updateResidue = @($config.update_residue_locations | ForEach-Object {
  $present = $null
  try {
    if ([string]::IsNullOrWhiteSpace($localAppData)) { throw 'local app data unavailable' }
    $candidate = Join-Path $localAppData ([string]$_.relative_path)
    $present = Test-Path -LiteralPath $candidate -ErrorAction Stop
  } catch { $inspectionErrors.Add('update_residue_inspection_failed') }
  [pscustomobject]@{
    id = [string]$_.id
    present = $present
  }
} | Sort-Object id)

[pscustomobject]@{
  schema_version = [string]$config.schema_version
  contract_schema_version = [string]$config.contract_schema_version
  phase = [string]$config.phase
  install_directory = [pscustomobject]@{
    present = $installDirectoryPresent
    file_count = @($files).Count
    files = @($files)
  }
  shortcuts = @($shortcuts)
  services = @($services)
  registry = @($registry)
  update_residue = @($updateResidue)
  inspection_errors = @($inspectionErrors)
} | ConvertTo-Json -Depth 8 -Compress
`;

function parseOutput(output, label) {
  try {
    return JSON.parse(String(output).trim());
  } catch {
    fail("POWERSHELL_OUTPUT_INVALID", `${label} returned invalid JSON`);
  }
}

export function createWindowsNativeQaPowerShellAdapter({ execFileSync = nodeExecFileSync } = {}) {
  function invoke(script, env) {
    return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      env: { ...process.env, ...env },
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    });
  }
  return Object.freeze({
    inspectAuthenticode(filePath, role) {
      const result = parseOutput(invoke(AUTHENTICODE_SCRIPT, {
        MATTER_WINDOWS_QA_FILE: path.resolve(filePath),
      }), "Authenticode adapter");
      return Object.freeze({ ...result, role });
    },
    collectUninstallState({ installDir, phase, contract = WINDOWS_UNINSTALL_CONTRACT }) {
      if (!["before", "after"].includes(phase)) fail("INVALID_UNINSTALL_PHASE", "uninstall inventory phase must be before or after");
      const config = {
        schema_version: WINDOWS_UNINSTALL_INVENTORY_SCHEMA,
        contract_schema_version: contract.schema_version,
        phase,
        install_dir: path.resolve(installDir),
        product_name: contract.product_name,
        app_id: contract.app_id,
        shortcut_names: [...contract.shortcut_names],
        shortcut_scopes: [...contract.shortcut_scopes],
        service_names: [...contract.service_names],
        update_residue_locations: contract.update_residue_locations.map((entry) => ({ ...entry })),
      };
      return parseOutput(invoke(UNINSTALL_STATE_SCRIPT, {
        MATTER_WINDOWS_QA_RESIDUE_CONFIG: JSON.stringify(config),
      }), "uninstall residue adapter");
    },
  });
}

function array(value, label) {
  if (!Array.isArray(value)) fail("INVALID_INVENTORY", `${label} must be an array`);
  return value;
}

function validateState(state, phase, contract) {
  if (state?.schema_version !== WINDOWS_UNINSTALL_INVENTORY_SCHEMA
    || state?.contract_schema_version !== contract.schema_version
    || state?.phase !== phase) {
    fail("INVENTORY_BINDING_MISMATCH", `uninstall ${phase} inventory is stale or contract-mismatched`);
  }
  const files = array(state.install_directory?.files, `${phase} install files`);
  if (array(state.inspection_errors, `${phase} inspection errors`).length > 0) {
    fail("NATIVE_INSPECTION_FAILED", `${phase} Windows residue inspection reported errors`);
  }
  if (typeof state.install_directory.present !== "boolean"
    || !Number.isSafeInteger(state.install_directory.file_count)
    || state.install_directory.file_count !== files.length) {
    fail("FILE_COUNT_MISMATCH", `${phase} install inventory file count is inconsistent`);
  }
  const shortcuts = array(state.shortcuts, `${phase} shortcuts`);
  const expectedShortcuts = contract.shortcut_scopes.flatMap((scope) => (
    contract.shortcut_names.map((name) => `${scope}\u0000${name}`)
  )).sort();
  const observedShortcuts = shortcuts.map((entry) => `${entry?.scope}\u0000${entry?.name}`).sort();
  if (JSON.stringify(observedShortcuts) !== JSON.stringify(expectedShortcuts)
    || shortcuts.some((entry) => typeof entry.present !== "boolean"
      || typeof entry.target_in_install_directory !== "boolean")) {
    fail("SHORTCUT_INVENTORY_MISMATCH", `${phase} shortcut inventory does not cover the canonical declared scopes`);
  }
  array(state.services, `${phase} services`);
  array(state.registry, `${phase} registry records`);
  const updateResidue = array(state.update_residue, `${phase} update residue`);
  const expectedUpdateIds = contract.update_residue_locations.map(({ id }) => id).sort();
  const observedUpdateIds = updateResidue.map(({ id }) => id).sort();
  if (JSON.stringify(observedUpdateIds) !== JSON.stringify(expectedUpdateIds)
    || updateResidue.some((entry) => typeof entry.present !== "boolean")) {
    fail("UPDATE_INVENTORY_MISMATCH", `${phase} update inventory does not cover the canonical declared locations`);
  }
  return files;
}

export function validateWindowsUninstallEvidence({ before, after, contract = WINDOWS_UNINSTALL_CONTRACT } = {}) {
  if (JSON.stringify(contract) !== JSON.stringify(WINDOWS_UNINSTALL_CONTRACT)) {
    fail("UNINSTALL_CONTRACT_MISMATCH", "uninstall evidence must use the canonical declared residue contract");
  }
  const beforeFiles = validateState(before, "before", contract);
  const afterFiles = validateState(after, "after", contract);
  if (before.install_directory.present !== true || beforeFiles.length === 0) {
    fail("INSTALL_INVENTORY_MISSING", "pre-uninstall inventory must contain the installed payload");
  }
  const beforePaths = beforeFiles.map(({ relative_path: relativePath }) => relativePath);
  for (const required of [
    (value) => value.toLowerCase() === "matter.exe",
    (value) => /^uninstall.*\.exe$/iu.test(value),
    (value) => value.toLowerCase() === "resources/matter-build-manifest.json",
  ]) {
    if (!beforePaths.some(required)) fail("REQUIRED_INSTALLED_PAYLOAD_MISSING", "pre-uninstall inventory is missing required installer payload");
  }
  for (const file of beforeFiles) {
    if (typeof file.relative_path !== "string"
      || file.relative_path.startsWith("/")
      || file.relative_path.split("/").includes("..")
      || !Number.isSafeInteger(file.bytes)
      || file.bytes < 0
      || !/^[0-9a-f]{64}$/u.test(file.sha256 ?? "")) {
      fail("INVALID_INSTALLED_FILE_RECORD", "installed payload inventory contains an invalid file record");
    }
  }
  if (contract.install_directory_must_be_absent !== true
    || after.install_directory.present !== false
    || afterFiles.length !== 0) {
    fail("INSTALL_DIRECTORY_RESIDUE", "Windows uninstall left installed payload or its install directory behind");
  }
  const expectedShortcutCount = contract.shortcut_names.length * contract.shortcut_scopes.length;
  if (after.shortcuts.length !== expectedShortcutCount || after.shortcuts.some(({ present }) => present !== false)) {
    fail("SHORTCUT_RESIDUE", "Windows uninstall left a declared shortcut behind");
  }
  if (after.services.length !== 0) fail("SERVICE_RESIDUE", "Windows uninstall left a declared or install-bound service behind");
  if (after.registry.length !== 0) fail("REGISTRY_RESIDUE", "Windows uninstall left an installer registry entry behind");
  const updateIds = [...contract.update_residue_locations].map(({ id }) => id).sort();
  const observedUpdateIds = after.update_residue.map(({ id }) => id).sort();
  if (JSON.stringify(updateIds) !== JSON.stringify(observedUpdateIds)
    || after.update_residue.some(({ present }) => present !== false)) {
    fail("UPDATE_RESIDUE", "Windows uninstall left a declared update location behind");
  }
  return Object.freeze({
    contract_schema_version: contract.schema_version,
    installed_file_count: beforeFiles.length,
    install_directory_removed: true,
    shortcuts_removed: true,
    services_removed: true,
    registry_removed: true,
    update_residue_removed: true,
    user_data_policy: contract.user_data_policy,
  });
}
