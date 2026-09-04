import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  AMIC_INTERNAL_WINDOWS_STATE_SCHEMA,
  validateAmicOsInternalWindowsStateReceipt,
  validateAmicOsInternalWindowsZeroOneZeroReceipts,
} from "../validate-amic-os-internal-windows-state.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const COLLECTOR = path.join(ROOT, "scripts/collect-amic-os-internal-windows-state.ps1");
const VALIDATOR = path.join(ROOT, "scripts/validate-amic-os-internal-windows-state.mjs");
const trusted = Object.freeze({
  canaryId: "amic-os-canary-20260904-001",
  version: "0.1.32",
  sourceSha: "1".repeat(40),
  sourceTree: "2".repeat(40),
  installerSha256: "3".repeat(64),
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function absentFile() {
  return {
    present: false,
    reparse_point: false,
    bytes: null,
    sha256: null,
    file_version: null,
    product_version: null,
  };
}

function presentFile(value, version = false) {
  return {
    present: true,
    reparse_point: false,
    bytes: Buffer.byteLength(value),
    sha256: sha256(value),
    file_version: version ? trusted.version : null,
    product_version: version ? `${trusted.version}.0` : null,
  };
}

function boundaries() {
  return {
    host_state_read_only: true,
    evidence_file_write_count: 1,
    registry_write_count: 0,
    network_request_count: 0,
    installer_launch_count: 0,
    uninstall_launch_count: 0,
    application_launch_count: 0,
    destructive_action_count: 0,
    private_data_read_count: 0,
    download_verified: false,
    windows_warning_captured: false,
    human_sign_in_checked: false,
    hosted_data_checked: false,
    outlook_action_checked: false,
    update_checked: false,
    rollback_checked: false,
    hosted_data_preservation_checked: false,
    g9_complete_claim: false,
  };
}

function expected() {
  return {
    computer_name: "JWS-GALAXYBOOK",
    version: trusted.version,
    source_sha: trusted.sourceSha,
    source_tree: trusted.sourceTree,
    installer_sha256: trusted.installerSha256,
    install_root: "C:\\Program Files\\matter",
    app_id: "com.amic.matter.desktop.internal",
    distribution_profile: "internal-unsigned",
  };
}

function host(fingerprint = "4".repeat(64)) {
  return {
    windows: true,
    computer_name: "JWS-GALAXYBOOK",
    computer_name_exact: true,
    host_fingerprint_sha256: fingerprint,
    os_version: "10.0.26100",
    os_build_number: "26100",
    os_architecture: "x64",
    process_architecture: "x64",
    system_drive: "C:",
    system_drive_total_bytes: 512_000_000_000,
    system_drive_free_bytes: 256_000_000_000,
  };
}

function nativeSnapshot(files) {
  const rows = Object.entries(files).map(([filePath, value]) => ({
    path: filePath,
    bytes: Buffer.byteLength(value),
    sha256: sha256(value),
  })).sort((left, right) => Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)));
  const contentSha256 = sha256(rows.map(({ path: filePath, bytes, sha256: digest }) => (
    `${digest} ${bytes} ${filePath}\n`
  )).join(""));
  const identitySha256 = "5".repeat(64);
  return {
    schema_version: "law-firm-os.windows-installed-tree-native-snapshot.v1",
    platform: "win32",
    powershell_version: "7.5.2",
    filesystem: "NTFS",
    fixed_point_sequence: ["B0", "I1", "B1", "I2", "B2"],
    fixed_point_exact: true,
    content_sha256: contentSha256,
    identity_sha256: identitySha256,
    file_count: rows.length,
    directory_count: 3,
    bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    reparse_point_count: 0,
    alternate_data_stream_count: 0,
    hard_link_count: 0,
    files: rows,
    phases: ["B0", "I1", "B1", "I2", "B2"].map((name) => ({
      name,
      content_sha256: contentSha256,
      identity_sha256: identitySha256,
      file_count: rows.length,
      directory_count: 3,
      bytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    })),
  };
}

function observed(stage) {
  const zero = stage !== "installed";
  const values = {
    "./matter.exe": "executable",
    "./resources/matter-build-manifest.json": "build-manifest",
    "./resources/matter-internal-unsigned-release.json": "release-marker",
    "./resources/matter-internal-update-trust.json": "update-trust",
    "./resources/classic-outlook/AMIC.OS.Vault.Outlook.dll": "outlook-addin",
  };
  return {
    install_root_present: !zero,
    executable: zero ? absentFile() : presentFile(values["./matter.exe"], true),
    build_manifest_file: zero
      ? absentFile()
      : presentFile(values["./resources/matter-build-manifest.json"]),
    internal_unsigned_marker_file: zero
      ? absentFile()
      : presentFile(values["./resources/matter-internal-unsigned-release.json"]),
    update_trust_file: zero
      ? absentFile()
      : presentFile(values["./resources/matter-internal-update-trust.json"]),
    classic_outlook_addin_file: zero
      ? absentFile()
      : presentFile(values["./resources/classic-outlook/AMIC.OS.Vault.Outlook.dll"]),
    package_metadata: zero ? {
      build_manifest: null,
      internal_unsigned_marker: null,
      update_trust: null,
    } : {
      build_manifest: {
        sha256: sha256(values["./resources/matter-build-manifest.json"]),
        schema_version: "law-firm-os.matter-desktop-build-provenance.v1",
        version: trusted.version,
        source_sha: trusted.sourceSha,
        source_tree: trusted.sourceTree,
        renderer_sha256: "6".repeat(64),
        renderer_file_count: 20,
        channel: "internal",
        platform: "win32",
        architecture: "x64",
        app_id: "com.amic.matter.desktop.internal",
        source_clean: true,
        public_release_claim: false,
        production_go_live_claim: false,
        exact: true,
      },
      internal_unsigned_marker: {
        sha256: sha256(values["./resources/matter-internal-unsigned-release.json"]),
        channel: "internal",
        distribution_profile: "internal-unsigned",
        local_api_default: "disabled",
        bundled_local_api: false,
        exact: true,
      },
      update_trust: {
        sha256: sha256(values["./resources/matter-internal-update-trust.json"]),
        schema_version: "law-firm-os.matter-desktop-internal-update-trust.v1",
        key_id: "matter-internal-update-key-v1",
        public_key_spki_sha256: "7".repeat(64),
        private_key_material_included: false,
        public_release_allowed: false,
        exact: true,
      },
    },
    uninstall_entry_count: zero ? 0 : 1,
    uninstall_exact_count: zero ? 0 : 1,
    product_process_count: 0,
    product_service_count: 0,
    product_scheduled_task_count: 0,
    update_cache_present: false,
    outlook_attachment_cache_present: false,
    registry: {
      desktop_entry_count: zero ? 0 : 2,
      desktop_exact_count: zero ? 0 : 2,
      outlook_addin_entry_count: zero ? 0 : 2,
      outlook_addin_exact_count: zero ? 0 : 2,
      outlook_com_entry_count: zero ? 0 : 2,
      outlook_com_exact_count: zero ? 0 : 2,
      protocol_handler_count: zero ? 0 : 2,
      protocol_handler_exact_count: zero ? 0 : 2,
    },
    shortcuts: {
      count: zero ? 0 : 2,
      exact_target_count: zero ? 0 : 2,
      aggregate_sha256: zero ? null : "8".repeat(64),
    },
    native_installed_tree: zero ? null : nativeSnapshot(values),
  };
}

function checks() {
  return {
    host_identity_exact: true,
    windows_x64: true,
    install_root_exact: true,
    uninstall_entry_exact: true,
    process_state_exact: true,
    service_state_exact: true,
    scheduled_task_state_exact: true,
    update_cache_state_exact: true,
    outlook_attachment_cache_state_exact: true,
    desktop_registry_state_exact: true,
    outlook_addin_registry_state_exact: true,
    outlook_com_registry_state_exact: true,
    protocol_handler_state_exact: true,
    shortcut_state_exact: true,
    build_identity_exact: true,
    internal_unsigned_marker_exact: true,
    update_trust_exact: true,
    classic_outlook_file_exact: true,
    native_installed_tree_exact: true,
    stage_state_exact: true,
  };
}

function receipt(stage, capturedAt) {
  return {
    schema_version: AMIC_INTERNAL_WINDOWS_STATE_SCHEMA,
    verdict: "PASS",
    stage,
    canary_id: trusted.canaryId,
    captured_at_utc: capturedAt,
    expected: expected(),
    host: host(),
    checks: checks(),
    observed: observed(stage),
    safe_error_codes: [],
    boundaries: boundaries(),
  };
}

function sequence() {
  return {
    preinstall: receipt("preinstall", "2026-09-04T01:00:00.000Z"),
    installed: receipt("installed", "2026-09-04T02:00:00.000Z"),
    postuninstall: receipt("postuninstall", "2026-09-04T03:00:00.000Z"),
  };
}

test("Windows state receipts prove only exact host state 0 to 1 to 0", () => {
  const values = sequence();
  const result = validateAmicOsInternalWindowsZeroOneZeroReceipts({ ...values, trusted });
  assert.equal(result.verdict, "PASS");
  assert.deepEqual(result.state_sequence, [0, 1, 0]);
  assert.equal(result.host_fingerprint_sha256, "4".repeat(64));
  assert.equal(result.installed_tree_sha256, values.installed.observed.native_installed_tree.content_sha256);
  assert.equal(result.g9_complete_claim, false);
});

test("Windows state receipt validation rejects boundary, lineage, host, and native-tree drift", () => {
  const mutations = [
    ["write boundary", (value) => { value.boundaries.registry_write_count = 1; }],
    ["lineage", (value) => { value.expected.source_tree = "9".repeat(40); }],
    ["host", (value) => { value.host.computer_name = "OTHER-HOST"; }],
    ["native bytes", (value) => { value.observed.native_installed_tree.files[0].bytes += 1; }],
    ["extra field", (value) => { value.observed.raw_user_name = "forbidden"; }],
    ["false check", (value) => { value.checks.shortcut_state_exact = false; }],
  ];
  for (const [label, mutate] of mutations) {
    const value = structuredClone(sequence().installed);
    mutate(value);
    assert.throws(
      () => validateAmicOsInternalWindowsStateReceipt(value, { ...trusted, stage: "installed" }),
      (error) => error?.code === "WINDOWS_STATE_RECEIPT_INVALID",
      label,
    );
  }
  const values = sequence();
  values.postuninstall.host.host_fingerprint_sha256 = "a".repeat(64);
  assert.throws(
    () => validateAmicOsInternalWindowsZeroOneZeroReceipts({ ...values, trusted }),
    /one exact host/u,
  );
});

test("Windows state collector is read-only apart from one create-new evidence receipt", async (t) => {
  const source = await readFile(COLLECTOR, "utf8");
  assert.match(source, /#requires -Version 7\.2/u);
  assert.match(source, /JWS-GALAXYBOOK/u);
  assert.match(source, /C:\\Program Files\\matter/u);
  assert.match(source, /windows-installed-tree-native-snapshot\.ps1/u);
  assert.match(source, /FileMode\]::CreateNew/u);
  assert.match(source, /evidence_file_write_count = 1/u);
  assert.doesNotMatch(source, /\b(?:Set|New|Remove|Clear|Rename|Move|Copy)-Item(?:Property)?\b/iu);
  assert.doesNotMatch(source, /\bStart-Process\b|\bInvoke-(?:WebRequest|RestMethod)\b/iu);
  assert.doesNotMatch(source, /\b(?:Start|Stop|Restart)-Service\b|\bStop-Process\b/iu);
  assert.doesNotMatch(source, /\breg(?:\.exe)?\s+(?:add|delete)\b|\bmsiexec(?:\.exe)?\b/iu);
  assert.doesNotMatch(source, /Get-Secret|Get-Content[^\n]*(?:registration|roster|contact|photo)/iu);
  assert.doesNotMatch(source, /logged_in_user|user_name|user_profile|preserved_hosted_targets/iu);
  assert.equal((source.match(/\[IO\.File\]::Open\(/gu) ?? []).length, 1);

  const version = spawnSync("pwsh", ["-NoLogo", "-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"], {
    encoding: "utf8",
  });
  if (version.error?.code === "ENOENT") {
    t.skip("PowerShell is unavailable on this test host");
    return;
  }
  assert.equal(version.status, 0, version.stderr);

  const root = await mkdtemp(path.join(tmpdir(), "amic-windows-state-"));
  const output = path.join(root, "preinstall.json");
  const args = [
    "-NoLogo", "-NoProfile", "-File", COLLECTOR,
    "-Stage", "preinstall",
    "-CanaryId", trusted.canaryId,
    "-ExpectedVersion", trusted.version,
    "-ExpectedSourceSha", trusted.sourceSha,
    "-ExpectedSourceTree", trusted.sourceTree,
    "-ExpectedInstallerSha256", trusted.installerSha256,
    "-OutputPath", output,
  ];
  const result = spawnSync("pwsh", args, { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, process.platform === "win32" ? result.status : 2, result.stderr);
  const summary = JSON.parse(result.stdout);
  const bytes = await readFile(output);
  assert.equal(summary.receipt_sha256, sha256(bytes));
  assert.equal(summary.evidence_file_write_count, 1);
  const value = JSON.parse(bytes);
  if (process.platform !== "win32") {
    assert.equal(value.verdict, "BLOCKED");
    assert.deepEqual(value.safe_error_codes, ["WINDOWS_REQUIRED"]);
    assert.equal(value.host.computer_name, null);
    const validation = validateAmicOsInternalWindowsStateReceipt(value, {
      ...trusted,
      stage: "preinstall",
    });
    assert.equal(validation.valid, true);
    assert.equal(validation.passed, false);
  }
  const before = sha256(bytes);
  const overwrite = spawnSync("pwsh", args, { cwd: ROOT, encoding: "utf8" });
  assert.notEqual(overwrite.status, 0);
  assert.equal(sha256(await readFile(output)), before);
});

test("Windows zero-one-zero CLI emits only hashes and a bounded claim", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-windows-state-cli-"));
  const values = sequence();
  for (const [stage, value] of Object.entries(values)) {
    await writeFile(path.join(root, `${stage}.json`), `${JSON.stringify(value, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
  }
  const result = spawnSync(process.execPath, [
    VALIDATOR,
    "--preinstall", path.join(root, "preinstall.json"),
    "--installed", path.join(root, "installed.json"),
    "--postuninstall", path.join(root, "postuninstall.json"),
    "--canary-id", trusted.canaryId,
    "--version", trusted.version,
    "--source-sha", trusted.sourceSha,
    "--source-tree", trusted.sourceTree,
    "--installer-sha256", trusted.installerSha256,
  ], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.verdict, "PASS");
  assert.equal(output.g9_complete_claim, false);
  assert.deepEqual(Object.keys(output.receipt_sha256), ["preinstall", "installed", "postuninstall"]);
  assert.equal(JSON.stringify(output).includes(root), false);
});
