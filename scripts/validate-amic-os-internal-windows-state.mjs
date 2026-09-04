#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateWindowsInstalledTreeNativeSnapshot } from "./lib/windows-installed-tree-native-snapshot.mjs";

export const AMIC_INTERNAL_WINDOWS_STATE_SCHEMA =
  "law-firm-os.amic-os-internal-unsigned-windows-host-state.v1";

const EXPECTED_COMPUTER_NAME = "JWS-GALAXYBOOK";
const INSTALL_ROOT = "C:\\Program Files\\matter";
const STAGES = Object.freeze(["preinstall", "installed", "postuninstall"]);
const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/u;
const SAFE_CODE = /^[A-Z][A-Z0-9_]{2,95}$/u;

function fail(code, message = code) {
  throw Object.assign(new Error(message), { code });
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("WINDOWS_STATE_RECEIPT_INVALID", `${label} must be an object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  assert.deepEqual(
    Object.keys(object(value, label)),
    expected,
    `${label} fields differ`,
  );
}

function safeInteger(value, label, { positive = false } = {}) {
  assert.ok(Number.isSafeInteger(value), `${label} must be a safe integer`);
  assert.ok(positive ? value > 0 : value >= 0, `${label} is out of range`);
  return value;
}

function exactBoolean(value, expected, label) {
  assert.equal(typeof value, "boolean", `${label} must be boolean`);
  assert.equal(value, expected, `${label} differs`);
}

function validateExpected(expected, trusted) {
  exactKeys(expected, [
    "computer_name", "version", "source_sha", "source_tree", "installer_sha256",
    "install_root", "app_id", "distribution_profile",
  ], "expected");
  assert.equal(expected.computer_name, EXPECTED_COMPUTER_NAME);
  assert.equal(expected.install_root, INSTALL_ROOT);
  assert.equal(expected.app_id, "com.amic.matter.desktop.internal");
  assert.equal(expected.distribution_profile, "internal-unsigned");
  assert.match(expected.version, VERSION);
  assert.match(expected.source_sha, GIT_OBJECT);
  assert.match(expected.source_tree, GIT_OBJECT);
  assert.match(expected.installer_sha256, SHA256);
  assert.deepEqual(expected, {
    computer_name: EXPECTED_COMPUTER_NAME,
    version: trusted.version,
    source_sha: trusted.sourceSha,
    source_tree: trusted.sourceTree,
    installer_sha256: trusted.installerSha256,
    install_root: INSTALL_ROOT,
    app_id: "com.amic.matter.desktop.internal",
    distribution_profile: "internal-unsigned",
  });
}

function validateBoundaries(boundaries) {
  exactKeys(boundaries, [
    "host_state_read_only", "evidence_file_write_count", "registry_write_count",
    "network_request_count", "installer_launch_count", "uninstall_launch_count",
    "application_launch_count", "destructive_action_count", "private_data_read_count",
    "download_verified", "windows_warning_captured", "human_sign_in_checked",
    "hosted_data_checked", "outlook_action_checked", "update_checked",
    "rollback_checked", "hosted_data_preservation_checked", "g9_complete_claim",
  ], "boundaries");
  exactBoolean(boundaries.host_state_read_only, true, "host_state_read_only");
  assert.equal(boundaries.evidence_file_write_count, 1);
  for (const field of [
    "registry_write_count", "network_request_count", "installer_launch_count",
    "uninstall_launch_count", "application_launch_count", "destructive_action_count",
    "private_data_read_count",
  ]) assert.equal(boundaries[field], 0, `${field} must remain zero`);
  for (const field of [
    "download_verified", "windows_warning_captured", "human_sign_in_checked",
    "hosted_data_checked", "outlook_action_checked", "update_checked",
    "rollback_checked", "hosted_data_preservation_checked", "g9_complete_claim",
  ]) exactBoolean(boundaries[field], false, field);
}

function validateHost(host, { allowNull = false } = {}) {
  if (allowNull && host === null) return null;
  exactKeys(host, [
    "windows", "computer_name", "computer_name_exact", "host_fingerprint_sha256",
    "os_version", "os_build_number", "os_architecture", "process_architecture",
    "system_drive", "system_drive_total_bytes", "system_drive_free_bytes",
  ], "host");
  if (host.windows === false) {
    assert.equal(host.computer_name, null);
    assert.equal(host.computer_name_exact, false);
    assert.equal(host.host_fingerprint_sha256, null);
    assert.equal(host.os_version, null);
    assert.equal(host.os_build_number, null);
    assert.equal(host.system_drive, null);
    assert.equal(host.system_drive_total_bytes, null);
    assert.equal(host.system_drive_free_bytes, null);
    return null;
  }
  exactBoolean(host.windows, true, "host.windows");
  assert.equal(host.computer_name, EXPECTED_COMPUTER_NAME);
  exactBoolean(host.computer_name_exact, true, "host.computer_name_exact");
  assert.match(host.host_fingerprint_sha256, SHA256);
  assert.match(host.os_version, /^\d+(?:\.\d+){1,3}$/u);
  assert.match(host.os_build_number, /^\d{4,10}$/u);
  assert.equal(host.os_architecture, "x64");
  assert.equal(host.process_architecture, "x64");
  assert.equal(host.system_drive, "C:");
  safeInteger(host.system_drive_total_bytes, "system drive size", { positive: true });
  safeInteger(host.system_drive_free_bytes, "system drive free bytes");
  assert.ok(host.system_drive_free_bytes <= host.system_drive_total_bytes);
  return host.host_fingerprint_sha256;
}

function validateFileRecord(record, label) {
  exactKeys(record, [
    "present", "reparse_point", "bytes", "sha256", "file_version", "product_version",
  ], label);
  assert.equal(typeof record.present, "boolean");
  assert.equal(typeof record.reparse_point, "boolean");
  if (!record.present) {
    assert.deepEqual(record, {
      present: false,
      reparse_point: false,
      bytes: null,
      sha256: null,
      file_version: null,
      product_version: null,
    });
    return;
  }
  safeInteger(record.bytes, `${label}.bytes`, { positive: true });
  assert.match(record.sha256, SHA256);
  assert.equal(record.reparse_point, false);
  for (const field of ["file_version", "product_version"]) {
    assert.ok(record[field] === null || typeof record[field] === "string");
  }
}

function validatePackageMetadata(metadata, expected, zeroStage) {
  exactKeys(metadata, [
    "build_manifest", "internal_unsigned_marker", "update_trust",
  ], "package_metadata");
  if (zeroStage) {
    assert.deepEqual(metadata, {
      build_manifest: null,
      internal_unsigned_marker: null,
      update_trust: null,
    });
    return;
  }
  const manifest = metadata.build_manifest;
  exactKeys(manifest, [
    "sha256", "schema_version", "version", "source_sha", "source_tree",
    "renderer_sha256", "renderer_file_count", "channel", "platform",
    "architecture", "app_id", "source_clean", "public_release_claim",
    "production_go_live_claim", "exact",
  ], "build_manifest");
  assert.match(manifest.sha256, SHA256);
  assert.equal(manifest.schema_version, "law-firm-os.matter-desktop-build-provenance.v1");
  assert.equal(manifest.version, expected.version);
  assert.equal(manifest.source_sha, expected.source_sha);
  assert.equal(manifest.source_tree, expected.source_tree);
  assert.match(manifest.renderer_sha256, SHA256);
  safeInteger(manifest.renderer_file_count, "renderer_file_count", { positive: true });
  assert.equal(manifest.channel, "internal");
  assert.equal(manifest.platform, "win32");
  assert.equal(manifest.architecture, "x64");
  assert.equal(manifest.app_id, expected.app_id);
  exactBoolean(manifest.source_clean, true, "source_clean");
  exactBoolean(manifest.public_release_claim, false, "public_release_claim");
  exactBoolean(manifest.production_go_live_claim, false, "production_go_live_claim");
  exactBoolean(manifest.exact, true, "build_manifest.exact");

  const marker = metadata.internal_unsigned_marker;
  exactKeys(marker, [
    "sha256", "channel", "distribution_profile", "local_api_default",
    "bundled_local_api", "exact",
  ], "internal_unsigned_marker");
  assert.match(marker.sha256, SHA256);
  assert.equal(marker.channel, "internal");
  assert.equal(marker.distribution_profile, "internal-unsigned");
  assert.equal(marker.local_api_default, "disabled");
  exactBoolean(marker.bundled_local_api, false, "bundled_local_api");
  exactBoolean(marker.exact, true, "internal_unsigned_marker.exact");

  const trust = metadata.update_trust;
  exactKeys(trust, [
    "sha256", "schema_version", "key_id", "public_key_spki_sha256",
    "private_key_material_included", "public_release_allowed", "exact",
  ], "update_trust");
  assert.match(trust.sha256, SHA256);
  assert.equal(trust.schema_version, "law-firm-os.matter-desktop-internal-update-trust.v1");
  assert.equal(trust.key_id, "matter-internal-update-key-v1");
  assert.match(trust.public_key_spki_sha256, SHA256);
  exactBoolean(trust.private_key_material_included, false, "private_key_material_included");
  exactBoolean(trust.public_release_allowed, false, "public_release_allowed");
  exactBoolean(trust.exact, true, "update_trust.exact");
}

function expectedChecks(stage, observed, host) {
  const zeroStage = stage !== "installed";
  const registry = observed.registry;
  const shortcuts = observed.shortcuts;
  const metadata = observed.package_metadata;
  return {
    host_identity_exact: host.computer_name_exact === true,
    windows_x64: host.os_architecture === "x64" && host.process_architecture === "x64",
    install_root_exact: zeroStage ? !observed.install_root_present : observed.install_root_present,
    uninstall_entry_exact: zeroStage
      ? observed.uninstall_entry_count === 0
      : observed.uninstall_entry_count === 1 && observed.uninstall_exact_count === 1,
    process_state_exact: zeroStage ? observed.product_process_count === 0 : true,
    service_state_exact: observed.product_service_count === 0,
    scheduled_task_state_exact: observed.product_scheduled_task_count === 0,
    update_cache_state_exact: observed.update_cache_present === false,
    outlook_attachment_cache_state_exact: zeroStage
      ? observed.outlook_attachment_cache_present === false
      : true,
    desktop_registry_state_exact: zeroStage
      ? registry.desktop_entry_count === 0
      : registry.desktop_entry_count === 2 && registry.desktop_exact_count === 2,
    outlook_addin_registry_state_exact: zeroStage
      ? registry.outlook_addin_entry_count === 0
      : registry.outlook_addin_entry_count === 2 && registry.outlook_addin_exact_count === 2,
    outlook_com_registry_state_exact: zeroStage
      ? registry.outlook_com_entry_count === 0
      : registry.outlook_com_entry_count === 2 && registry.outlook_com_exact_count === 2,
    protocol_handler_state_exact: zeroStage
      ? registry.protocol_handler_count === 0
      : registry.protocol_handler_count >= 1
        && registry.protocol_handler_count === registry.protocol_handler_exact_count,
    shortcut_state_exact: zeroStage
      ? shortcuts.count === 0
      : shortcuts.count >= 1 && shortcuts.count === shortcuts.exact_target_count,
    build_identity_exact: zeroStage
      ? !observed.build_manifest_file.present && metadata.build_manifest === null
      : observed.build_manifest_file.present && metadata.build_manifest?.exact === true,
    internal_unsigned_marker_exact: zeroStage
      ? !observed.internal_unsigned_marker_file.present
        && metadata.internal_unsigned_marker === null
      : observed.internal_unsigned_marker_file.present
        && metadata.internal_unsigned_marker?.exact === true,
    update_trust_exact: zeroStage
      ? !observed.update_trust_file.present && metadata.update_trust === null
      : observed.update_trust_file.present && metadata.update_trust?.exact === true,
    classic_outlook_file_exact: zeroStage
      ? !observed.classic_outlook_addin_file.present
      : observed.classic_outlook_addin_file.present,
    native_installed_tree_exact: zeroStage
      ? observed.native_installed_tree === null
      : observed.native_installed_tree !== null,
  };
}

function validateObserved(receipt) {
  const { observed, expected, stage } = receipt;
  exactKeys(observed, [
    "install_root_present", "executable", "build_manifest_file",
    "internal_unsigned_marker_file", "update_trust_file", "classic_outlook_addin_file",
    "package_metadata", "uninstall_entry_count", "uninstall_exact_count",
    "product_process_count", "product_service_count", "product_scheduled_task_count",
    "update_cache_present", "outlook_attachment_cache_present", "registry", "shortcuts",
    "native_installed_tree",
  ], "observed");
  assert.equal(typeof observed.install_root_present, "boolean");
  for (const [name, record] of [
    ["executable", observed.executable],
    ["build_manifest_file", observed.build_manifest_file],
    ["internal_unsigned_marker_file", observed.internal_unsigned_marker_file],
    ["update_trust_file", observed.update_trust_file],
    ["classic_outlook_addin_file", observed.classic_outlook_addin_file],
  ]) validateFileRecord(record, name);
  for (const field of [
    "uninstall_entry_count", "uninstall_exact_count", "product_process_count",
    "product_service_count", "product_scheduled_task_count",
  ]) safeInteger(observed[field], field);
  assert.equal(typeof observed.update_cache_present, "boolean");
  assert.equal(typeof observed.outlook_attachment_cache_present, "boolean");
  exactKeys(observed.registry, [
    "desktop_entry_count", "desktop_exact_count", "outlook_addin_entry_count",
    "outlook_addin_exact_count", "outlook_com_entry_count", "outlook_com_exact_count",
    "protocol_handler_count", "protocol_handler_exact_count",
  ], "registry");
  for (const value of Object.values(observed.registry)) safeInteger(value, "registry count");
  exactKeys(observed.shortcuts, ["count", "exact_target_count", "aggregate_sha256"], "shortcuts");
  safeInteger(observed.shortcuts.count, "shortcut count");
  safeInteger(observed.shortcuts.exact_target_count, "exact shortcut count");
  assert.ok(observed.shortcuts.exact_target_count <= observed.shortcuts.count);
  if (observed.shortcuts.count === 0) assert.equal(observed.shortcuts.aggregate_sha256, null);
  else assert.match(observed.shortcuts.aggregate_sha256, SHA256);

  const zeroStage = stage !== "installed";
  validatePackageMetadata(observed.package_metadata, expected, zeroStage);
  let native = null;
  if (zeroStage) {
    assert.equal(observed.native_installed_tree, null);
    assert.equal(observed.install_root_present, false);
    for (const record of [
      observed.executable, observed.build_manifest_file, observed.internal_unsigned_marker_file,
      observed.update_trust_file, observed.classic_outlook_addin_file,
    ]) assert.equal(record.present, false);
  } else {
    native = validateWindowsInstalledTreeNativeSnapshot(observed.native_installed_tree);
    const files = new Map(native.files.map((entry) => [entry.path, entry]));
    const matches = [
      ["./matter.exe", observed.executable],
      ["./resources/matter-build-manifest.json", observed.build_manifest_file],
      ["./resources/matter-internal-unsigned-release.json", observed.internal_unsigned_marker_file],
      ["./resources/matter-internal-update-trust.json", observed.update_trust_file],
      ["./resources/classic-outlook/AMIC.OS.Vault.Outlook.dll", observed.classic_outlook_addin_file],
    ];
    for (const [filePath, record] of matches) {
      assert.equal(record.present, true, `${filePath} is absent`);
      assert.equal(files.get(filePath)?.sha256, record.sha256, `${filePath} hash differs from native tree`);
      assert.equal(files.get(filePath)?.bytes, record.bytes, `${filePath} size differs from native tree`);
    }
    assert.equal(observed.executable.file_version, expected.version);
    assert.match(observed.executable.product_version, new RegExp(
      `^${expected.version.replaceAll(".", "\\.")}(?:\\.0)?$`, "u",
    ));
  }
  return native;
}

function validateChecks(receipt) {
  exactKeys(receipt.checks, [
    "host_identity_exact", "windows_x64", "install_root_exact", "uninstall_entry_exact",
    "process_state_exact", "service_state_exact", "scheduled_task_state_exact",
    "update_cache_state_exact", "outlook_attachment_cache_state_exact",
    "desktop_registry_state_exact", "outlook_addin_registry_state_exact",
    "outlook_com_registry_state_exact", "protocol_handler_state_exact",
    "shortcut_state_exact", "build_identity_exact", "internal_unsigned_marker_exact",
    "update_trust_exact", "classic_outlook_file_exact", "native_installed_tree_exact",
    "stage_state_exact",
  ], "checks");
  const derived = expectedChecks(receipt.stage, receipt.observed, receipt.host);
  for (const [name, expected] of Object.entries(derived)) {
    exactBoolean(receipt.checks[name], expected, `checks.${name}`);
  }
  const stageExact = Object.values(derived).every(Boolean);
  exactBoolean(receipt.checks.stage_state_exact, stageExact, "checks.stage_state_exact");
  assert.equal(receipt.verdict, stageExact ? "PASS" : "BLOCKED");
}

function validateFailureReceipt(receipt) {
  assert.equal(receipt.verdict, "BLOCKED");
  assert.equal(receipt.observed, null);
  assert.deepEqual(receipt.checks, {
    host_identity_exact: false,
    windows_x64: false,
    stage_state_exact: false,
  });
  const expectedCode = receipt.host?.windows === false
    ? "WINDOWS_REQUIRED"
    : "WINDOWS_STATE_COLLECTION_FAILED";
  assert.deepEqual(receipt.safe_error_codes, [expectedCode]);
}

export function validateAmicOsInternalWindowsStateReceipt(input, trusted) {
  try {
    exactKeys(input, [
      "schema_version", "verdict", "stage", "canary_id", "captured_at_utc",
      "expected", "host", "checks", "observed", "safe_error_codes", "boundaries",
    ], "receipt");
    assert.equal(input.schema_version, AMIC_INTERNAL_WINDOWS_STATE_SCHEMA);
    assert.ok(["PASS", "BLOCKED"].includes(input.verdict));
    assert.ok(STAGES.includes(input.stage));
    assert.equal(input.stage, trusted.stage);
    assert.match(input.canary_id, SAFE_REF);
    assert.equal(input.canary_id, trusted.canaryId);
    assert.equal(new Date(input.captured_at_utc).toISOString(), input.captured_at_utc);
    validateExpected(input.expected, trusted);
    validateBoundaries(input.boundaries);
    const hostFingerprint = validateHost(input.host, { allowNull: true });
    assert.ok(Array.isArray(input.safe_error_codes));
    assert.equal(new Set(input.safe_error_codes).size, input.safe_error_codes.length);
    for (const code of input.safe_error_codes) assert.match(code, SAFE_CODE);

    if (input.observed === null) {
      validateFailureReceipt(input);
      return Object.freeze({
        valid: true,
        passed: false,
        stage: input.stage,
        host_fingerprint_sha256: hostFingerprint,
        native_installed_tree_sha256: null,
        safe_error_codes: Object.freeze([...input.safe_error_codes]),
      });
    }

    const native = validateObserved(input);
    validateChecks(input);
    assert.equal(input.safe_error_codes.length === 0, input.verdict === "PASS");
    return Object.freeze({
      valid: true,
      passed: input.verdict === "PASS",
      stage: input.stage,
      host_fingerprint_sha256: hostFingerprint,
      native_installed_tree_sha256: native?.sha256 ?? null,
      safe_error_codes: Object.freeze([...input.safe_error_codes]),
    });
  } catch (error) {
    if (error?.code === "WINDOWS_STATE_RECEIPT_INVALID") throw error;
    fail("WINDOWS_STATE_RECEIPT_INVALID", error?.message ?? "Windows state receipt is invalid");
  }
}

export function validateAmicOsInternalWindowsZeroOneZeroReceipts({
  preinstall,
  installed,
  postuninstall,
  trusted,
}) {
  const values = { preinstall, installed, postuninstall };
  const results = STAGES.map((stage) => validateAmicOsInternalWindowsStateReceipt(
    values[stage],
    { ...trusted, stage },
  ));
  assert.equal(results.every(({ passed }) => passed), true, "all three Windows state receipts must pass");
  assert.equal(new Set(results.map(({ host_fingerprint_sha256: value }) => value)).size, 1,
    "Windows state receipts must identify one exact host");
  const timestamps = STAGES.map((stage) => Date.parse(values[stage].captured_at_utc));
  assert.ok(timestamps[0] < timestamps[1] && timestamps[1] < timestamps[2],
    "Windows state receipts must be ordered 0 to 1 to 0");
  return Object.freeze({
    verdict: "PASS",
    schema_version: AMIC_INTERNAL_WINDOWS_STATE_SCHEMA,
    canary_id: trusted.canaryId,
    host_fingerprint_sha256: results[0].host_fingerprint_sha256,
    installed_tree_sha256: results[1].native_installed_tree_sha256,
    state_sequence: Object.freeze([0, 1, 0]),
    g9_complete_claim: false,
  });
}

function parse(argv) {
  const allowed = new Set([
    "preinstall", "installed", "postuninstall", "canary-id", "version",
    "source-sha", "source-tree", "installer-sha256",
  ]);
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--")) {
      fail("WINDOWS_STATE_OPTION_INVALID");
    }
    const name = flag.slice(2);
    if (!allowed.has(name) || options[name] !== undefined) {
      fail("WINDOWS_STATE_OPTION_INVALID");
    }
    options[name] = value;
  }
  if (Object.keys(options).length !== allowed.size) fail("WINDOWS_STATE_OPTION_REQUIRED");
  return options;
}

function readReceipt(filePath) {
  const absolute = path.resolve(filePath);
  if (!path.isAbsolute(filePath)) fail("WINDOWS_STATE_RECEIPT_PATH_INVALID");
  const stat = lstatSync(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > 16 * 1024 * 1024) {
    fail("WINDOWS_STATE_RECEIPT_PATH_INVALID");
  }
  const bytes = readFileSync(absolute);
  let value;
  try { value = JSON.parse(bytes); } catch { fail("WINDOWS_STATE_RECEIPT_JSON_INVALID"); }
  return { value, sha256: createHash("sha256").update(bytes).digest("hex") };
}

function main() {
  const options = parse(process.argv.slice(2));
  const trusted = {
    canaryId: options["canary-id"],
    version: options.version,
    sourceSha: options["source-sha"].toLowerCase(),
    sourceTree: options["source-tree"].toLowerCase(),
    installerSha256: options["installer-sha256"].toLowerCase(),
  };
  assert.match(trusted.canaryId, SAFE_REF);
  assert.match(trusted.version, VERSION);
  assert.match(trusted.sourceSha, GIT_OBJECT);
  assert.match(trusted.sourceTree, GIT_OBJECT);
  assert.match(trusted.installerSha256, SHA256);
  const receipts = Object.fromEntries(STAGES.map((stage) => {
    const record = readReceipt(options[stage]);
    return [stage, record];
  }));
  const result = validateAmicOsInternalWindowsZeroOneZeroReceipts({
    preinstall: receipts.preinstall.value,
    installed: receipts.installed.value,
    postuninstall: receipts.postuninstall.value,
    trusted,
  });
  process.stdout.write(`${JSON.stringify({
    ...result,
    receipt_sha256: Object.fromEntries(STAGES.map((stage) => [stage, receipts[stage].sha256])),
  }, null, 2)}\n`);
}

const invoked = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      verdict: "BLOCKED",
      code: SAFE_CODE.test(error?.code ?? "") ? error.code : "WINDOWS_STATE_RECEIPT_INVALID",
      g9_complete_claim: false,
    })}\n`);
    process.exitCode = 2;
  }
}
