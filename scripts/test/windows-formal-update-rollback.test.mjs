import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  WINDOWS_UPDATE_APPROVAL_RECEIPT_TYPE,
  WINDOWS_UPDATE_APPROVAL_SCHEMA,
  WINDOWS_UPDATE_OPERATIONS,
  requireConfiguredWindowsUpdateRollbackRunner,
  verifyWindowsFormalUpdateApproval,
} from "../lib/windows-formal-update-approval.mjs";
import {
  WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA,
  WINDOWS_UPDATE_EXECUTION_MODE,
  admitWindowsFormalUpdateCandidates,
} from "../lib/windows-formal-update-admission.mjs";
import {
  WINDOWS_UPDATE_APPROVAL_RECEIPT_SOURCE,
  createProductionWindowsApprovalVerifier,
  runWindowsFormalUpdateRollback,
  validateWindowsFormalUpdateRunnerPassReceipt,
} from "../lib/windows-formal-update-runner.mjs";

const NOW = Date.parse("2026-08-13T00:00:00.000Z");
const CERTIFICATE_SHA1 = "A".repeat(40);
const isInvalidPassReceipt = (error) => error instanceof TypeError
  && error.code === "WINDOWS_UPDATE_RUNNER_PASS_RECEIPT_INVALID";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function authenticode() {
  return {
    status: "Valid", status_message: "Signature verified.", signature_type: "Authenticode",
    time_stamper_certificate_present: true,
    signer_subject: "CN=AMIC Law", signer_issuer: "CN=SSL.com Code Signing CA",
    signer_serial_number: "01AB", signer_thumbprint: CERTIFICATE_SHA1,
    signer_certificate_sha256: "C".repeat(64),
    signer_not_before: "2026-01-01T00:00:00.000Z", signer_not_after: "2027-01-01T00:00:00.000Z",
    signer_public_key_algorithm_oid: "1.2.840.113549.1.1.1",
    signer_signature_algorithm_oid: "1.2.840.113549.1.1.11", signer_eku_oids: ["1.3.6.1.5.5.7.3.3"],
    timestamp_subject: "CN=SSL.com Timestamp Responder", timestamp_issuer: "CN=SSL.com Timestamp CA",
    timestamp_serial_number: "02CD", timestamp_thumbprint: "B".repeat(40),
    timestamp_certificate_sha256: "D".repeat(64),
    timestamp_not_before: "2026-01-01T00:00:00.000Z", timestamp_not_after: "2030-01-01T00:00:00.000Z",
    timestamp_public_key_algorithm_oid: "1.2.840.113549.1.1.1",
    timestamp_signature_algorithm_oid: "1.2.840.113549.1.1.11", timestamp_eku_oids: ["1.3.6.1.5.5.7.3.8"],
  };
}

function installedTreeBinding(role, executableBytes) {
  const executableSha256 = sha256(executableBytes);
  return Object.freeze({
    schema_version: "law-firm-os.windows-installed-tree-native-snapshot.v1",
    content_sha256: sha256(`${executableSha256} ${executableBytes.length} ./matter.exe\n`),
    identity_sha256: (role === "baseline" ? "7" : "8").repeat(64),
    file_count: 1,
    directory_count: 1,
    bytes: executableBytes.length,
    installed_executable_path: "./matter.exe",
    installed_executable_sha256: executableSha256,
    installed_executable_bytes: executableBytes.length,
  });
}

function fixture() {
  const keyPair = generateKeyPairSync("ed25519");
  const publicKeySha256 = sha256(keyPair.publicKey.export({ type: "spki", format: "der" }));
  const candidate = (version, source, artifact) => ({
    version, source_sha: source.repeat(40), source_tree: (source === "1" ? "3" : "4").repeat(40),
    artifact_sha256: sha256(artifact), artifact_bytes: artifact.length,
    release_manifest_sha256: source.repeat(64),
  });
  const baselineArtifact = Buffer.from("signed-baseline-installer");
  const targetArtifact = Buffer.from("signed-target-installer");
  const candidates = {
    baseline: candidate("0.1.16", "1", baselineArtifact),
    target: candidate("0.1.17", "2", targetArtifact),
  };
  const installedExecutableBytes = {
    baseline: Buffer.from("installed-baseline-executable"),
    target: Buffer.from("installed-target-executable"),
  };
  const installedTreeBindings = Object.freeze(Object.fromEntries(["baseline", "target"].map((role) => [
    role,
    installedTreeBinding(role, installedExecutableBytes[role]),
  ])));
  const authorizations = Object.fromEntries(WINDOWS_UPDATE_OPERATIONS.map((operation, index) => [operation, {
    operation,
    approval_id: `AMIC-WIN-${String(index + 1).padStart(3, "0")}`,
    approved: true,
    expires_at: "2026-08-14T00:00:00.000Z",
  }]));
  const receipt = {
    schema_version: WINDOWS_UPDATE_APPROVAL_SCHEMA,
    receipt_type: WINDOWS_UPDATE_APPROVAL_RECEIPT_TYPE,
    verdict: "APPROVED",
    issued_at: "2026-08-12T00:00:00.000Z",
    expires_at: "2026-08-14T00:00:00.000Z",
    pilot_id: "amic-law-external-pilot-20260813",
    lawos_tenant_id: "tenant_amic_matter_vault",
    entra_tenant_id: "2f10d109-c2ad-43a4-a813-4dea28119e52",
    app_id: "com.amic.matter.desktop",
    metadata_approval_id: "AMIC-WIN-METADATA-001",
    tenant_config_sha256: "5".repeat(64),
    authenticode_signer_certificate_sha1: CERTIFICATE_SHA1,
    update_key: { key_id: "amic-law-update-key-v1", public_key_spki_sha256: publicKeySha256 },
    candidates,
    authorizations,
  };
  const approvalBundleBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  const approvalSignatureBytes = sign(null, approvalBundleBytes, keyPair.privateKey);
  const files = new Map();
  const input = {
    schema_version: WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA,
    execution_mode: WINDOWS_UPDATE_EXECUTION_MODE,
    automatic_update: false,
    baseline: { installer_path: "baseline/matter.exe", metadata_path: "baseline/update.json", signature_path: "baseline/update.sig" },
    target: { installer_path: "target/matter.exe", metadata_path: "target/update.json", signature_path: "target/update.sig" },
  };
  for (const [role, artifact] of [["baseline", baselineArtifact], ["target", targetArtifact]]) {
    const candidateValue = candidates[role];
    const locator = input[role];
    const metadata = {
      schemaVersion: "law-firm-os.matter-desktop-external-pilot-update.v2", channel: "external-pilot",
      keyId: receipt.update_key.key_id, pilotId: receipt.pilot_id, lawosTenantId: receipt.lawos_tenant_id,
      entraTenantId: receipt.entra_tenant_id, appId: receipt.app_id, approvalId: receipt.metadata_approval_id,
      approvalExpiresAt: receipt.expires_at, tenantConfigSha256: receipt.tenant_config_sha256,
      version: candidateValue.version, sourceSha: candidateValue.source_sha, sourceTree: candidateValue.source_tree,
      artifactSha256: candidateValue.artifact_sha256, artifactBytes: candidateValue.artifact_bytes,
      artifactFilename: locator.installer_path.split("/").at(-1),
      releaseManifestSha256: candidateValue.release_manifest_sha256,
      generatedAt: "2026-08-12T00:00:00.000Z", expiresAt: "2026-08-14T00:00:00.000Z",
    };
    const raw = Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`);
    files.set(locator.installer_path, artifact);
    files.set(locator.metadata_path, raw);
    files.set(locator.signature_path, sign(null, raw, keyPair.privateKey));
  }
  const verifyApprovalBundle = async () => ({
    receipt,
    registry_root_verified: true,
    trust_verified: true,
    update_public_key: keyPair.publicKey,
  });
  return {
    approvalBundleBytes,
    approvalSignatureBytes,
    files,
    input,
    installedExecutableBytes,
    installedTreeBindings,
    keyPair,
    receipt,
    verifyApprovalBundle,
  };
}

function trustedRegistry(input, overrides = {}) {
  const candidates = input.receipt.candidates;
  return {
    registry: {
      keys: [{
        key_id: input.receipt.update_key.key_id,
        algorithm: "Ed25519",
        public_key_spki_pem: input.keyPair.publicKey.export({ type: "spki", format: "pem" }),
        valid_from: "2026-08-01T00:00:00.000Z",
        valid_until: "2026-08-31T00:00:00.000Z",
        revoked_at: null,
        allowed_receipt_sources: [WINDOWS_UPDATE_APPROVAL_RECEIPT_SOURCE],
        allowed_receipt_types: [WINDOWS_UPDATE_APPROVAL_RECEIPT_TYPE],
        allowed_pilot_ids: [input.receipt.pilot_id],
        allowed_lawos_tenant_ids: [input.receipt.lawos_tenant_id],
        allowed_entra_tenant_ids: [input.receipt.entra_tenant_id],
        allowed_source_shas: [candidates.baseline.source_sha, candidates.target.source_sha],
        allowed_source_trees: [candidates.baseline.source_tree, candidates.target.source_tree],
        allowed_versions: [candidates.baseline.version, candidates.target.version],
        allowed_roles: ["baseline", "target"],
        allowed_operations: [...WINDOWS_UPDATE_OPERATIONS],
        allowed_artifact_sha256s: [candidates.baseline.artifact_sha256, candidates.target.artifact_sha256],
        allowed_binding_sha256s: [
          input.receipt.tenant_config_sha256,
          candidates.baseline.release_manifest_sha256,
          candidates.target.release_manifest_sha256,
        ],
        ...overrides,
      }],
    },
  };
}

function nativeAdapters(input, {
  confirmOperation = null,
  failLaunchRole = null,
  installerDriftRole = null,
  launchDriftRole = null,
  rollbackDrift = false,
  treeContentDriftRole = null,
  treeIdentityDriftRole = null,
  wrongExecutableRole = null,
} = {}) {
  const calls = [];
  const executableBytes = input.installedExecutableBytes;
  let installedRole = null;
  let baselineInstallCount = 0;
  let nextSessionPid = 1000;
  const installerReads = { baseline: 0, target: 0 };
  const executableReads = { baseline: 0, target: 0 };
  const sessions = new Set();
  const executablePath = "C:\\MatterUpdate\\matter.exe";
  const uninstallerPath = "C:\\MatterUpdate\\Uninstall matter.exe";
  const lockedUninstallerEvidence = () => {
    const uninstallerSha256 = "a".repeat(64);
    const uninstallerBytes = 1234;
    return {
      path: "./Uninstall matter.exe",
      installed_tree_path: "./Uninstall matter.exe",
      installed_tree_sha256: uninstallerSha256,
      sha256: uninstallerSha256,
      uninstaller_bytes: uninstallerBytes,
      bytes: uninstallerBytes,
      authenticode: authenticode(),
      authenticode_valid: true,
      lock_mode: "FileShare.Read",
      denies_write_delete: true,
      process: { pid: 9001, path_identity: "pid_executable_path" },
      exit_code: 0,
    };
  };
  const adapters = {
    installDir: "C:\\MatterUpdate",
    calls,
    async confirmOperation({ operation, approvalIdSha256 }) {
      calls.push(`confirm:${operation}`);
      if (confirmOperation) return confirmOperation({ operation, approvalIdSha256, calls });
      return true;
    },
    async readFile(filePath) {
      if (input.files.has(filePath)) {
        const role = filePath === input.input.baseline.installer_path ? "baseline"
          : filePath === input.input.target.installer_path ? "target" : null;
        if (role) {
          installerReads[role] += 1;
          if (installerDriftRole === role && installerReads[role] > 1) {
            return Buffer.from(`drifted-${role}-installer`);
          }
        }
        return input.files.get(filePath);
      }
      if (filePath === executablePath && installedRole) {
        executableReads[installedRole] += 1;
        if (wrongExecutableRole === installedRole) {
          return Buffer.from(`wrong-${installedRole}-executable`);
        }
        if (launchDriftRole === installedRole && executableReads[installedRole] % 2 === 0) {
          return Buffer.from(`drifted-${installedRole}-executable`);
        }
        if (rollbackDrift && installedRole === "baseline" && baselineInstallCount > 1) {
          return Buffer.from("drifted-baseline-executable");
        }
        return executableBytes[installedRole];
      }
      throw new Error(`unexpected fixture path: ${filePath}`);
    },
    async readAuthenticode() { return authenticode(); },
    async captureInstalledTree({ role, checkpoint }) {
      calls.push(`snapshot:${role}:${checkpoint}`);
      const expected = input.installedTreeBindings[role];
      const identity = (role === "baseline" ? String(4 + baselineInstallCount) : "6").repeat(64);
      return {
        sha256: treeContentDriftRole === role && checkpoint === "prelaunch"
          ? "f".repeat(64)
          : expected.content_sha256,
        file_count: expected.file_count,
        bytes: expected.bytes,
        files: [{
          path: expected.installed_executable_path,
          sha256: expected.installed_executable_sha256,
          bytes: expected.installed_executable_bytes,
        }],
        native: {
          schema_version: expected.schema_version,
          filesystem: "NTFS",
          directory_count: expected.directory_count,
          identity_sha256: treeIdentityDriftRole === role && checkpoint === "prelaunch"
            ? "f".repeat(64)
            : identity,
          fixed_point_sequence: ["B0", "I1", "B1", "I2", "B2"],
          fixed_point_exact: true,
          equality_proof: "B0_I1_B1_I2_B2_PUBLIC_AND_PRIVATE_MANIFEST_EXACT_EQUALITY",
          reparse_point_count: 0,
          alternate_data_stream_count: 0,
          hard_link_count: 0,
        },
      };
    },
    async install({ role }) {
      calls.push(`install:${role}`);
      installedRole = role;
      if (role === "baseline") baselineInstallCount += 1;
    },
    async inspectInstallation({ role }) {
      calls.push(`inspect:${role}`);
      const candidate = input.receipt.candidates[role];
      return {
        executable_path: executablePath,
        uninstaller_path: uninstallerPath,
        version: candidate.version,
        source_sha: candidate.source_sha,
        source_tree: candidate.source_tree,
      };
    },
    async launch({ role }) {
      calls.push(`launch:${role}`);
      if (role === failLaunchRole) throw Object.assign(new Error("primary launch failure"), { code: "PRIMARY_LAUNCH_FAILURE" });
      const session = { active: true, pid: nextSessionPid++, role };
      sessions.add(session);
      return session;
    },
    async closeSession(session) {
      calls.push(`close:${session.role}`);
      session.active = false;
      return {
        exit_code: 1,
        lock_released: true,
        pid: session.pid,
        process_exited: true,
      };
    },
    async isSessionActive(session) { return session.active; },
    async closeAllSessions() {
      calls.push("close-all");
      for (const session of sessions) session.active = false;
    },
    async uninstall({ role }) {
      calls.push(`uninstall:${role}`);
      installedRole = null;
      return lockedUninstallerEvidence();
    },
    async waitForUninstalled({ role }) { calls.push(`wait-uninstalled:${role}`); },
    async residue() {
      return {
        executable_present: installedRole !== null,
        uninstaller_count: installedRole === null ? 0 : 1,
        entry_count: installedRole === null ? 0 : 3,
        active_session_count: [...sessions].filter((session) => session.active).length,
      };
    },
    exists(filePath) { return filePath.endsWith("matter.exe") && installedRole !== null; },
    list() { return installedRole === null ? [] : ["Uninstall matter.exe"]; },
    async executeCleanupLocked() {
      calls.push("failure-cleanup");
      installedRole = null;
      return lockedUninstallerEvidence();
    },
    waitForRemoval() {},
    warn() {},
  };
  return adapters;
}

async function verified(input) {
  return verifyWindowsFormalUpdateApproval({
    approvalBundleBytes: input.approvalBundleBytes,
    verifyApprovalBundle: input.verifyApprovalBundle,
    now: NOW,
  });
}

test("raw metadata bytes and artifacts are admitted only through independently verified approval", async () => {
  const input = fixture();
  const approval = await verified(input);
  const result = await admitWindowsFormalUpdateCandidates({
    executionInput: input.input,
    verifiedApproval: approval,
    readFile: async (filePath) => input.files.get(filePath),
    readAuthenticode: async () => authenticode(),
    now: NOW,
  });
  assert.equal(result.authenticode.signature_count, 2);
  assert.equal(result.baseline.metadata_raw_sha256, sha256(input.files.get(input.input.baseline.metadata_path)));
  assert.equal(result.target.metadata_raw_sha256, sha256(input.files.get(input.input.target.metadata_path)));
  assert.equal(result.baseline.signature_raw_sha256, sha256(input.files.get(input.input.baseline.signature_path)));
  assert.equal(result.target.signature_raw_sha256, sha256(input.files.get(input.input.target.signature_path)));
  assert.notEqual(result.baseline.metadata_raw_sha256, result.target.metadata_raw_sha256);
  assert.equal(Object.keys(approval.authorizations).length, WINDOWS_UPDATE_OPERATIONS.length);
});

test("self-selected approval, raw-byte changes, duplicate fields, and artifact drift fail closed", async (t) => {
  const cases = [
    ["plain object", async (input) => ({ approval: structuredClone(input.receipt) }), /verified production-root approval/u],
    ["untrusted root", async (input) => {
      input.verifyApprovalBundle = async () => ({ receipt: input.receipt, registry_root_verified: false, trust_verified: true, update_public_key: input.keyPair.publicKey });
      return { approval: await verified(input) };
    }, /production-root approval/u],
    ["raw whitespace", async (input) => {
      const approval = await verified(input);
      const path = input.input.target.metadata_path;
      input.files.set(path, Buffer.concat([input.files.get(path), Buffer.from(" ")]));
      return { approval };
    }, /signature is invalid/u],
    ["duplicate field", async (input) => {
      const approval = await verified(input);
      const path = input.input.target.metadata_path;
      const raw = Buffer.from(`{\n  "version": "0.1.17",${input.files.get(path).toString("utf8").slice(1)}`);
      input.files.set(path, raw);
      input.files.set(input.input.target.signature_path, sign(null, raw, input.keyPair.privateKey));
      return { approval };
    }, /field version must occur exactly once/u],
    ["artifact", async (input) => {
      const approval = await verified(input);
      input.files.set(input.input.target.installer_path, Buffer.from("tampered"));
      return { approval };
    }, /installer bytes/u],
  ];
  for (const [name, prepare, expected] of cases) {
    await t.test(name, async () => {
      const input = fixture();
      let prepared;
      try { prepared = await prepare(input); } catch (error) { assert.match(String(error), expected); return; }
      await assert.rejects(() => admitWindowsFormalUpdateCandidates({
        executionInput: input.input,
        verifiedApproval: prepared.approval,
        readFile: async (filePath) => input.files.get(filePath),
        readAuthenticode: async () => authenticode(),
        now: NOW,
      }), expected);
    });
  }
});

test("production adapter authenticates the existing raw approval through the independent root registry", async () => {
  const input = fixture();
  const verifyApprovalBundle = createProductionWindowsApprovalVerifier({
    approvalSignatureBytes: input.approvalSignatureBytes,
    verifyProductionRegistry: () => trustedRegistry(input),
    now: () => NOW,
  });
  const approval = await verifyWindowsFormalUpdateApproval({
    approvalBundleBytes: input.approvalBundleBytes,
    verifyApprovalBundle,
    now: NOW,
  });
  assert.equal(approval.update_key.key_id, input.receipt.update_key.key_id);
  assert.equal(approval.approval_bundle_sha256, sha256(input.approvalBundleBytes));
});

test("production approval fails closed on unconfigured root, scope drift, signature drift, and noncanonical bytes", async (t) => {
  const cases = [
    ["unconfigured root", (input) => ({
      bytes: input.approvalBundleBytes,
      signature: input.approvalSignatureBytes,
      registry: () => { throw Object.assign(new Error("unconfigured"), { code: "TRUST_ROOT_NOT_CONFIGURED" }); },
      expected: /unconfigured/u,
    })],
    ["registry scope", (input) => ({
      bytes: input.approvalBundleBytes,
      signature: input.approvalSignatureBytes,
      registry: () => trustedRegistry(input, { allowed_operations: ["baseline_install"] }),
      expected: /allowed_operations/u,
    })],
    ["signature drift", (input) => ({
      bytes: input.approvalBundleBytes,
      signature: Buffer.alloc(64),
      registry: () => trustedRegistry(input),
      expected: /signature or update-key binding/u,
    })],
    ["noncanonical raw bytes", (input) => {
      const bytes = Buffer.concat([input.approvalBundleBytes, Buffer.from(" ")]);
      return {
        bytes,
        signature: sign(null, bytes, input.keyPair.privateKey),
        registry: () => trustedRegistry(input),
        expected: /canonical JSON bytes/u,
      };
    }],
  ];
  for (const [name, createCase] of cases) {
    await t.test(name, async () => {
      const input = fixture();
      const value = createCase(input);
      const verifier = createProductionWindowsApprovalVerifier({
        approvalSignatureBytes: value.signature,
        verifyProductionRegistry: value.registry,
        now: () => NOW,
      });
      await assert.rejects(() => verifyWindowsFormalUpdateApproval({
        approvalBundleBytes: value.bytes,
        verifyApprovalBundle: verifier,
        now: NOW,
      }), value.expected);
    });
  }
});

test("operator runner performs baseline, target, uninstall, rollback, and final uninstall in exact order", async () => {
  const input = fixture();
  const approval = await verified(input);
  const adapters = nativeAdapters(input);
  const result = await runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
    installedTreeBindings: input.installedTreeBindings,
    adapters,
    now: () => NOW,
  });

  assert.equal(result.verdict, "PASS");
  assert.equal(result.automatic_update, false);
  assert.deepEqual(adapters.calls, [
    "confirm:baseline_install",
    "install:baseline", "inspect:baseline", "snapshot:baseline:post_install", "snapshot:baseline:prelaunch", "launch:baseline", "close:baseline",
    "confirm:target_update",
    "install:target", "inspect:target", "snapshot:target:post_install", "snapshot:target:prelaunch", "launch:target", "close:target",
    "confirm:target_uninstall_for_rollback",
    "uninstall:target", "wait-uninstalled:target",
    "confirm:baseline_rollback",
    "install:baseline", "inspect:baseline", "snapshot:baseline:post_install", "snapshot:baseline:prelaunch", "launch:baseline", "close:baseline",
    "confirm:final_uninstall",
    "uninstall:baseline", "wait-uninstalled:baseline",
  ]);
  assert.deepEqual(result.operations.map(({ operation }) => operation), [
    "baseline_install",
    "target_update",
    "target_uninstall_for_rollback",
    "baseline_rollback",
    "final_uninstall",
  ]);
  assert.deepEqual(result.launches.map(({ role }) => role), ["baseline", "target", "baseline"]);
  assert.equal(result.launches[0].executable_sha256, result.launches[2].executable_sha256);
  assert.ok(result.launches.every((launch) => (
    launch.authenticode_valid && launch.exact_bytes_verified && launch.session_stopped
      && launch.executable_sha256 === result.candidates[launch.role].installed_tree.installed_executable_sha256
      && launch.post_install_installed_tree.content_sha256
        === result.candidates[launch.role].installed_tree.content_sha256
      && launch.prelaunch_installed_tree.content_sha256
        === result.candidates[launch.role].installed_tree.content_sha256
      && launch.post_install_installed_tree.identity_sha256
        === launch.prelaunch_installed_tree.identity_sha256
  )));
  assert.notEqual(
    result.launches[0].post_install_installed_tree.identity_sha256,
    result.candidates.baseline.installed_tree.identity_sha256,
    "host-bound NTFS identity evidence must not be treated as a cross-install expected digest",
  );
  assert.equal(result.residue_checks.length, 2);
  assert.deepEqual(result.uninstalls.map(({ role }) => role), ["target", "baseline"]);
  assert.deepEqual(result.uninstalls.map(({ operation }) => operation), [
    "target_uninstall_for_rollback",
    "final_uninstall",
  ]);
  assert.deepEqual(
    result.uninstalls.map(({ approval_id_sha256 }) => approval_id_sha256),
    result.operations
      .filter(({ operation }) => operation.endsWith("uninstall") || operation === "target_uninstall_for_rollback")
      .map(({ approval_id_sha256 }) => approval_id_sha256),
  );
  assert.ok(result.uninstalls.every((uninstall) => (
    uninstall.authenticode_valid
      && uninstall.lock_mode === "FileShare.Read"
      && uninstall.denies_write_delete
      && uninstall.process.path_identity === "pid_executable_path"
      && uninstall.exit_code === 0
  )));
  assert.equal(result.failure_cleanup.initiated, false);

  const expectedBinding = {
    approval_bundle_sha256: approval.approval_bundle_sha256,
    signer_certificate_sha1: approval.authenticode_signer_certificate_sha1,
    candidates: Object.fromEntries(["baseline", "target"].map((role) => [role, {
      artifact_sha256: result.candidates[role].artifact_sha256,
      installed_tree: result.candidates[role].installed_tree,
      metadata_raw_sha256: result.candidates[role].metadata_raw_sha256,
      release_manifest_sha256: result.candidates[role].release_manifest_sha256,
      signature_raw_sha256: result.candidates[role].signature_raw_sha256,
      source_sha: result.candidates[role].source_sha,
      version: result.candidates[role].version,
    }])),
  };
  const passReceipt = {
    ...structuredClone(result),
    approval_signature_sha256: "c".repeat(64),
    generated_at: "2026-08-13T00:01:00.000Z",
    source_runner: { source_sha: "d".repeat(40), source_tree: "e".repeat(40) },
  };
  assert.equal(validateWindowsFormalUpdateRunnerPassReceipt(passReceipt, expectedBinding), true);
  const forgedMinimal = { schema_version: passReceipt.schema_version, verdict: "PASS" };
  assert.throws(
    () => validateWindowsFormalUpdateRunnerPassReceipt(forgedMinimal, expectedBinding),
    isInvalidPassReceipt,
  );
  const missingUninstallOperation = structuredClone(passReceipt);
  delete missingUninstallOperation.uninstalls[0].operation;
  assert.throws(
    () => validateWindowsFormalUpdateRunnerPassReceipt(missingUninstallOperation, expectedBinding),
    isInvalidPassReceipt,
  );
  const extraOperation = structuredClone(passReceipt);
  extraOperation.operations.push(structuredClone(extraOperation.operations[0]));
  assert.throws(
    () => validateWindowsFormalUpdateRunnerPassReceipt(extraOperation, expectedBinding),
    isInvalidPassReceipt,
  );
  const mismatchedApproval = structuredClone(passReceipt);
  mismatchedApproval.uninstalls[0].approval_id_sha256 = "f".repeat(64);
  assert.throws(
    () => validateWindowsFormalUpdateRunnerPassReceipt(mismatchedApproval, expectedBinding),
    isInvalidPassReceipt,
  );
  const selfBaselinedExecutable = structuredClone(passReceipt);
  selfBaselinedExecutable.candidates.baseline.installed_tree.installed_executable_sha256 = "a".repeat(64);
  selfBaselinedExecutable.launches[0].executable_sha256 = "a".repeat(64);
  selfBaselinedExecutable.launches[0].post_install_installed_tree.installed_executable_sha256 = "a".repeat(64);
  selfBaselinedExecutable.launches[0].prelaunch_installed_tree.installed_executable_sha256 = "a".repeat(64);
  assert.throws(
    () => validateWindowsFormalUpdateRunnerPassReceipt(selfBaselinedExecutable, expectedBinding),
    isInvalidPassReceipt,
  );
  const changedNativeIdentity = structuredClone(passReceipt);
  changedNativeIdentity.launches[1].prelaunch_installed_tree.identity_sha256 = "b".repeat(64);
  assert.throws(
    () => validateWindowsFormalUpdateRunnerPassReceipt(changedNativeIdentity, expectedBinding),
    isInvalidPassReceipt,
  );

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /tenant_amic|2f10d109|AMIC-WIN-|MatterUpdate/u);
  assert.equal(result.boundaries.provider_call_performed, false);
});

test("operator PASS requires observed session liveness, PID exit, and lock release", async (t) => {
  await t.test("session must remain observably alive after launch", async () => {
    const input = fixture();
    const approval = await verified(input);
    const adapters = nativeAdapters(input);
    adapters.isSessionActive = async () => false;
    await assert.rejects(() => runWindowsFormalUpdateRollback({
      platform: "win32",
      executionInput: input.input,
      verifiedApproval: approval,
      installedTreeBindings: input.installedTreeBindings,
      adapters,
      now: () => NOW,
    }), /application session did not remain active/u);
    assert.equal(adapters.calls.includes("confirm:failure_cleanup"), true);
  });

  await t.test("session_stopped requires exact close evidence for the launched PID", async () => {
    const input = fixture();
    const approval = await verified(input);
    const adapters = nativeAdapters(input);
    const closeSession = adapters.closeSession;
    adapters.closeSession = async (session) => ({
      ...await closeSession(session),
      pid: session.pid + 1,
    });
    await assert.rejects(() => runWindowsFormalUpdateRollback({
      platform: "win32",
      executionInput: input.input,
      verifiedApproval: approval,
      installedTreeBindings: input.installedTreeBindings,
      adapters,
      now: () => NOW,
    }), (error) => {
      assert.equal(error.code, "WINDOWS_SESSION_CLOSE_UNVERIFIED");
      assert.equal(error.windows_update_rollback.launches[0].session_stopped, false);
      return true;
    });
  });

  await t.test("session cleanup failure is retained and cannot produce PASS", async () => {
    const input = fixture();
    const approval = await verified(input);
    const adapters = nativeAdapters(input);
    adapters.closeSession = async (session) => {
      session.active = false;
      throw Object.assign(new Error("lock release failed"), { code: "WINDOWS_SESSION_LOCK_RELEASE_UNVERIFIED" });
    };
    adapters.closeAllSessions = async () => {
      adapters.calls.push("close-all");
      throw Object.assign(new Error("session cleanup failed"), { code: "WINDOWS_SESSION_CLEANUP_FAILED" });
    };
    await assert.rejects(() => runWindowsFormalUpdateRollback({
      platform: "win32",
      executionInput: input.input,
      verifiedApproval: approval,
      installedTreeBindings: input.installedTreeBindings,
      adapters,
      now: () => NOW,
    }), (error) => {
      assert.equal(error.code, "WINDOWS_SESSION_LOCK_RELEASE_UNVERIFIED");
      assert.equal(error.windows_update_rollback.failure_cleanup.completed, false);
      assert.equal(error.windows_update_rollback.failure_cleanup.error_code, "WINDOWS_SESSION_CLEANUP_FAILED");
      return true;
    });
  });
});

test("operator runner rejects legacy naked cleanup execution adapters", async () => {
  const input = fixture();
  const approval = await verified(input);
  const adapters = nativeAdapters(input);
  delete adapters.executeCleanupLocked;
  await assert.rejects(() => runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
    installedTreeBindings: input.installedTreeBindings,
    adapters,
    now: () => NOW,
  }), /complete Windows update\/rollback native adapters/u);
});

test("operator runner rejects missing admitted installed-tree bindings before confirmation", async () => {
  const input = fixture();
  const approval = await verified(input);
  const adapters = nativeAdapters(input);
  await assert.rejects(() => runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
    adapters,
    now: () => NOW,
  }), /exact baseline and target installed-tree bindings are required/u);
  assert.deepEqual(adapters.calls, []);
});

test("operator confirmation is required before the first mutation", async () => {
  const input = fixture();
  const approval = await verified(input);
  const adapters = nativeAdapters(input, { confirmOperation: () => false });
  await assert.rejects(() => runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
    installedTreeBindings: input.installedTreeBindings,
    adapters,
    now: () => NOW,
  }), /did not separately initiate baseline_install/u);
  assert.deepEqual(adapters.calls, ["confirm:baseline_install"]);
});

test("an approval that expires while the operator confirms cannot authorize mutation", async () => {
  const input = fixture();
  const approval = await verified(input);
  let clock = NOW;
  const adapters = nativeAdapters(input, {
    confirmOperation: () => { clock = Date.parse(input.receipt.expires_at); return true; },
  });
  await assert.rejects(() => runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
    installedTreeBindings: input.installedTreeBindings,
    adapters,
    now: () => clock,
  }), /expired before execution/u);
  assert.deepEqual(adapters.calls, ["confirm:baseline_install"]);
});

test("each operation is confirmed only when its step is reached", async () => {
  const input = fixture();
  const approval = await verified(input);
  const adapters = nativeAdapters(input, {
    confirmOperation: ({ operation }) => operation !== "target_update",
  });
  await assert.rejects(() => runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
    installedTreeBindings: input.installedTreeBindings,
    adapters,
    now: () => NOW,
  }), /separately initiate target_update/u);
  assert.ok(adapters.calls.indexOf("close:baseline") < adapters.calls.indexOf("confirm:target_update"));
  assert.equal(adapters.calls.includes("install:target"), false);
  assert.ok(adapters.calls.indexOf("confirm:target_update") < adapters.calls.indexOf("confirm:failure_cleanup"));
  assert.equal(adapters.calls.includes("failure-cleanup"), true);
});

test("installer and installed executable drift are caught at the last pre-mutation boundary", async (t) => {
  await t.test("installer drift before first NSIS execution", async () => {
    const input = fixture();
    const approval = await verified(input);
    const adapters = nativeAdapters(input, { installerDriftRole: "baseline" });
    await assert.rejects(() => runWindowsFormalUpdateRollback({
      platform: "win32",
      executionInput: input.input,
      verifiedApproval: approval,
      installedTreeBindings: input.installedTreeBindings,
      adapters,
      now: () => NOW,
    }), (error) => {
      assert.equal(error.windows_update_rollback.failure_cleanup.required, false);
      return /changed after admission/u.test(String(error));
    });
    assert.equal(adapters.calls.includes("install:baseline"), false);
    assert.equal(adapters.calls.includes("failure-cleanup"), false);
  });

  await t.test("first installed same-signer executable cannot establish its own expected baseline", async () => {
    const input = fixture();
    const approval = await verified(input);
    const adapters = nativeAdapters(input, { wrongExecutableRole: "baseline" });
    await assert.rejects(() => runWindowsFormalUpdateRollback({
      platform: "win32",
      executionInput: input.input,
      verifiedApproval: approval,
      installedTreeBindings: input.installedTreeBindings,
      adapters,
      now: () => NOW,
    }), /main executable bytes differ from the admitted candidate/u);
    assert.equal(adapters.calls.includes("launch:baseline"), false);
    assert.equal(adapters.calls.includes("failure-cleanup"), true);
  });

  await t.test("installed executable drift immediately before launch", async () => {
    const input = fixture();
    const approval = await verified(input);
    const adapters = nativeAdapters(input, { launchDriftRole: "baseline" });
    await assert.rejects(() => runWindowsFormalUpdateRollback({
      platform: "win32",
      executionInput: input.input,
      verifiedApproval: approval,
      installedTreeBindings: input.installedTreeBindings,
      adapters,
      now: () => NOW,
    }), /changed after verification and before launch/u);
    assert.equal(adapters.calls.includes("launch:baseline"), false);
    assert.equal(adapters.calls.includes("failure-cleanup"), true);
  });

  for (const [label, options, expected] of [
    ["portable tree", { treeContentDriftRole: "baseline" }, /content, counts, bytes, or main executable differ/u],
    ["native identity", { treeIdentityDriftRole: "baseline" }, /native content or identity changed/u],
  ]) {
    await t.test(`${label} drift between install and launch`, async () => {
      const input = fixture();
      const approval = await verified(input);
      const adapters = nativeAdapters(input, options);
      await assert.rejects(() => runWindowsFormalUpdateRollback({
        platform: "win32",
        executionInput: input.input,
        verifiedApproval: approval,
        installedTreeBindings: input.installedTreeBindings,
        adapters,
        now: () => NOW,
      }), expected);
      assert.equal(adapters.calls.includes("launch:baseline"), false);
      assert.equal(adapters.calls.includes("failure-cleanup"), true);
    });
  }
});

test("automatic update and installed Authenticode drift fail before the affected launch", async (t) => {
  await t.test("automatic update", async () => {
    const input = fixture();
    input.input.automatic_update = true;
    const approval = await verified(input);
    const adapters = nativeAdapters(input);
    await assert.rejects(() => runWindowsFormalUpdateRollback({
      platform: "win32",
      executionInput: input.input,
      verifiedApproval: approval,
      installedTreeBindings: input.installedTreeBindings,
      adapters,
      now: () => NOW,
    }), /must remain nonautomatic/u);
    assert.deepEqual(adapters.calls, []);
  });

  await t.test("installed signer", async () => {
    const input = fixture();
    const approval = await verified(input);
    const adapters = nativeAdapters(input);
    let installedProbe = 0;
    const original = adapters.readAuthenticode;
    adapters.readAuthenticode = async (filePath) => {
      const record = await original(filePath);
      if (filePath.startsWith("C:\\")) {
        installedProbe += 1;
        if (installedProbe === 2) record.signer_thumbprint = "F".repeat(40);
      }
      return record;
    };
    await assert.rejects(() => runWindowsFormalUpdateRollback({
      platform: "win32",
      executionInput: input.input,
      verifiedApproval: approval,
      installedTreeBindings: input.installedTreeBindings,
      adapters,
      now: () => NOW,
    }), /expected certificate/u);
    assert.equal(adapters.calls.includes("launch:target"), false);
    assert.equal(adapters.calls.includes("failure-cleanup"), true);
  });
});

test("rollback requires the exact admitted baseline executable bytes", async () => {
  const input = fixture();
  const approval = await verified(input);
  const adapters = nativeAdapters(input, { rollbackDrift: true });
  await assert.rejects(() => runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
    installedTreeBindings: input.installedTreeBindings,
    adapters,
    now: () => NOW,
  }), /main executable bytes differ from the admitted candidate/u);
  assert.ok(adapters.calls.indexOf("uninstall:target") < adapters.calls.lastIndexOf("install:baseline"));
  assert.equal(adapters.calls.includes("launch:baseline", adapters.calls.lastIndexOf("install:baseline")), false);
  assert.equal(adapters.calls.includes("failure-cleanup"), true);
});

test("failure cleanup uses its distinct approval, preserves the primary error, and records clear residue", async () => {
  const input = fixture();
  const approval = await verified(input);
  const adapters = nativeAdapters(input, { failLaunchRole: "target" });
  await assert.rejects(() => runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
    installedTreeBindings: input.installedTreeBindings,
    adapters,
    now: () => NOW,
  }), (error) => {
    assert.equal(error.code, "PRIMARY_LAUNCH_FAILURE");
    assert.equal(error.windows_update_rollback.primary_error_preserved, true);
    assert.equal(error.windows_update_rollback.primary_error_code, "PRIMARY_LAUNCH_FAILURE");
    assert.equal(error.windows_update_rollback.failure_cleanup.initiated, true);
    assert.equal(error.windows_update_rollback.failure_cleanup.completed, true);
    assert.equal(error.windows_update_rollback.operations.at(-1).operation, "failure_cleanup");
    return true;
  });
  assert.equal(adapters.calls.includes("close-all"), true);
  assert.equal(adapters.calls.includes("failure-cleanup"), true);
});

test("expired failure-cleanup approval cannot authorize cleanup and the primary error survives", async () => {
  const input = fixture();
  input.receipt.authorizations.failure_cleanup.expires_at = "2026-08-13T00:00:00.500Z";
  const approval = await verified(input);
  let clock = NOW;
  const adapters = nativeAdapters(input, {
    failLaunchRole: "target",
    confirmOperation: ({ operation }) => {
      if (operation === "failure_cleanup") clock = NOW + 1_000;
      return true;
    },
  });
  await assert.rejects(() => runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
    installedTreeBindings: input.installedTreeBindings,
    adapters,
    now: () => clock,
  }), (error) => {
    assert.equal(error.code, "PRIMARY_LAUNCH_FAILURE");
    assert.equal(error.windows_update_rollback.primary_error_preserved, true);
    assert.equal(error.windows_update_rollback.failure_cleanup.required, true);
    assert.equal(error.windows_update_rollback.failure_cleanup.initiated, false);
    assert.equal(error.windows_update_rollback.failure_cleanup.completed, false);
    return true;
  });
  assert.equal(adapters.calls.includes("confirm:failure_cleanup"), true);
  assert.equal(adapters.calls.includes("failure-cleanup"), false);
});

test("approval rejects duplicate operation IDs, expired operations, and non-newer target candidates", async (t) => {
  const cases = [
    ["duplicate", (input) => {
      input.receipt.authorizations.target_update.approval_id =
        input.receipt.authorizations.baseline_install.approval_id;
    }, /distinct approval identifier/u],
    ["expired", (input) => {
      input.receipt.authorizations.target_update.expires_at = "2026-08-12T12:00:00.000Z";
    }, /invalid or expired/u],
    ["not newer", (input) => {
      input.receipt.candidates.target.version = input.receipt.candidates.baseline.version;
    }, /newer distinct release/u],
  ];
  for (const [name, mutate, expected] of cases) {
    await t.test(name, async () => {
      const input = fixture();
      mutate(input);
      await assert.rejects(() => verified(input), expected);
    });
  }
});

test("CLI has no mutation path until production trust integration exists", () => {
  assert.throws(() => requireConfiguredWindowsUpdateRollbackRunner({
    platform: "win32",
    productionApprovalVerifier: null,
  }), /NOT_CONFIGURED_INDEPENDENT_APPROVAL/u);
  if (process.platform !== "win32") {
    const run = spawnSync(process.execPath, ["scripts/run-formal-windows-update-rollback-qa.mjs"], {
      cwd: new URL("../..", import.meta.url), encoding: "utf8",
    });
    assert.notEqual(run.status, 0);
    assert.match(`${run.stdout}\n${run.stderr}`, /WINDOWS_HOST_REQUIRED/u);
  }
});

test("manual workflow is protected, source-pinned, and exposes only the formal package alias", () => {
  const root = new URL("../..", import.meta.url);
  const workflow = readFileSync(new URL(".github/workflows/windows-formal-update-rollback-qa.yml", root), "utf8");
  const oidcWorkflow = readFileSync(new URL(".github/workflows/windows-formal-update-private-reader-oidc.yml", root), "utf8");
  const runnerSource = readFileSync(new URL("scripts/lib/windows-formal-update-runner.mjs", root), "utf8");
  const cliSource = readFileSync(new URL("scripts/run-formal-windows-update-rollback-qa.mjs", root), "utf8");
  const packageJson = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  assert.doesNotMatch(runnerSource, /executableSha256\.get\(role\) \?\? observedSha256/u);
  assert.match(runnerSource, /captureInstalledTree\(role, "post_install"\)/u);
  assert.match(runnerSource, /captureInstalledTree\(role, "prelaunch"\)/u);
  assert.match(cliSource, /captureWindowsInstalledTreeNativeSnapshot/u);
  assert.match(cliSource, /windows-installed-tree-sbom\.cdx\.json/u);
  assert.doesNotMatch(cliSource, /directoryFileInventory/u);
  assert.match(cliSource, /lockedSession\.status\(session\.pid\)/u);
  assert.match(cliSource, /lockedSession\.stop\(session\.pid\)/u);
  assert.match(cliSource, /sessions\.add\(session\)/u);
  assert.match(cliSource, /smokeDeadline/u);
  assert.match(cliSource, /process_exited: true/u);
  assert.match(cliSource, /lock_released: true/u);
  assert.doesNotMatch(cliSource, /process\.kill\(|taskkill\.exe|session\.active\s*=|abort\(\)\.catch|release\(\)\.catch|closeSession\(session\)\.catch/u);
  assert.match(workflow, /^on:\n  workflow_dispatch:/mu);
  assert.doesNotMatch(workflow, /\n\s+(?:push|pull_request|schedule):/u);
  assert.match(workflow, /environment:\n\s+name: \$\{\{ needs\.protected-environment-preflight\.outputs\.environment_name \}\}/u);
  assert.doesNotMatch(workflow, /^\s+environment: windows-formal-update-rollback$/mu);
  assert.match(workflow, /prevent_self_review/u);
  assert.match(workflow, /can_admins_bypass/u);
  assert.match(workflow, /WINDOWS_UPDATE_ENVIRONMENT_READ_TOKEN/u);
  assert.doesNotMatch(workflow, /GH_TOKEN: \$\{\{ github\.token \}\}|ENVIRONMENT_READ_TOKEN: \$\{\{ github\.token \}\}/u);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/u);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/u);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/u);
  assert.match(workflow, /actions\/download-artifact@[0-9a-f]{40}/u);
  assert.match(oidcWorkflow, /^name: Windows Formal Update Private Reader OIDC$/mu);
  assert.match(oidcWorkflow, /^on:\n  workflow_call:/mu);
  assert.match(oidcWorkflow, /environment:\n\s+name: windows-formal-update-rollback/u);
  assert.match(oidcWorkflow, /id-token: write/u);
  assert.match(oidcWorkflow, /aws-actions\/configure-aws-credentials@61815dcd50bd041e203e49132bacad1fd04d2708/u);
  assert.match(oidcWorkflow, /actions\/download-artifact@[0-9a-f]{40}/u);
  assert.match(oidcWorkflow, /actions\/checkout@[0-9a-f]{40}/u);
  assert.match(oidcWorkflow, /actions\/setup-node@[0-9a-f]{40}/u);
  assert.match(oidcWorkflow, /actions\/upload-artifact@[0-9a-f]{40}/u);
  const sourceJob = workflow.slice(workflow.indexOf("  private-locator-source-auth:"), workflow.indexOf("  private-artifact-reader:"));
  const readerJob = workflow.slice(workflow.indexOf("  private-artifact-reader:"), workflow.indexOf("  operator-update-rollback:"));
  const operatorJob = workflow.slice(workflow.indexOf("  operator-update-rollback:"));
  assert.match(sourceJob, /id-token: none/u);
  assert.doesNotMatch(sourceJob, /id-token: write/u);
  assert.match(readerJob, /uses: \.\/\.github\/workflows\/windows-formal-update-private-reader-oidc\.yml/u);
  assert.match(readerJob, /permissions:\n\s+actions: read\n\s+contents: read\n\s+id-token: write/u);
  assert.match(operatorJob, /id-token: none/u);
  assert.doesNotMatch(operatorJob, /configure-aws-credentials|MATTER_WINDOWS_UPDATE_PRIVATE_LOCATOR_JSON/u);
  assert.match(oidcWorkflow, /ACTIONS_ID_TOKEN_REQUEST_TOKEN/u);
  assert.match(oidcWorkflow, /ACTIONS_ID_TOKEN_REQUEST_URL/u);
  assert.ok(oidcWorkflow.indexOf("Clear AWS and OIDC credentials before bridge encryption") < oidcWorkflow.indexOf("Encrypt the private bytes for this exact run and operator key"));
  assert.match(oidcWorkflow, /allowed-account-ids: "770880870480"/u);
  assert.match(oidcWorkflow, /handoff_bucket/u);
  assert.match(oidcWorkflow, /handoff_kms_key_arn/u);
  assert.match(oidcWorkflow, /role-to-assume: \$\{\{ inputs\.reader_role_arn \}\}/u);
  assert.match(sourceJob, /MATTER_WINDOWS_UPDATE_PRIVATE_LOCATOR_ARTIFACT_REF_JSON: \$\{\{ inputs\.private_locator_artifact_ref_json \}\}/u);
  assert.match(readerJob, /locator_artifact_id: \$\{\{ needs\.private-locator-source-auth\.outputs\.locator_artifact_id \}\}/u);
  assert.match(oidcWorkflow, /encrypted_bridge_artifact_id: \$\{\{ steps\.encrypted-bridge-upload\.outputs\.artifact-id \}\}/u);
  assert.match(workflow, /artifact-ids: \$\{\{ needs\.private-artifact-reader\.outputs\.encrypted_bridge_artifact_id \}\}/u);
  assert.doesNotMatch(workflow, /WINDOWS_UPDATE_PRIVATE_LOCATOR_JSON:\s*\$\{\{\s*secrets\./u);
  assert.match(workflow, /lawos-update-private-handoff-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/u);
  assert.match(workflow, /lawos-update-rollback-operator-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/u);
  assert.doesNotMatch(workflow, /^      artifact_root:|^      execution_input:|^      approval_receipt:|^      approval_signature:/mu);
  assert.match(sourceJob, /zipfile\.ZipFile/u);
  assert.match(sourceJob, /infolist\(\)/u);
  assert.match(sourceJob, /unicodedata\.normalize\("NFC"/u);
  assert.match(sourceJob, /casefold\(\)/u);
  assert.match(sourceJob, /os\.O_EXCL/u);
  assert.match(sourceJob, /os\.O_NOFOLLOW/u);
  assert.match(sourceJob, /testzip\(\)/u);
  assert.doesNotMatch(oidcWorkflow, /WINDOWS_UPDATE_LOCATOR_ARTIFACT_READ_TOKEN|producer_run_id|aggregate\.zip/u);
  assert.ok(oidcWorkflow.indexOf("Authenticate exact current-run aggregate artifact metadata before checkout") < oidcWorkflow.indexOf("Download authenticated aggregate and source receipt artifacts by immutable IDs"));
  assert.ok(oidcWorkflow.indexOf("Verify current-run artifact file sets and receipt before repo code") < oidcWorkflow.indexOf("Checkout exact reviewed reader source without persisted credentials"));
  assert.ok(oidcWorkflow.indexOf("Verify exact clean reader source before AWS authority") < oidcWorkflow.indexOf("Assume exact read-only private artifact role only after authenticated inputs"));
  const publicPreflight = workflow.indexOf("Verify public dispatch bindings before any environment-read token");
  const protectedPreflight = workflow.indexOf("Verify exact protected environment variables and secret names through GitHub API");
  const sourceAuthentication = workflow.indexOf("Authenticate producer run, job, artifact metadata, and raw ZIP before extraction");
  const sourceCleanup = workflow.indexOf("Copy ciphertext-only artifact and finalize source receipt before OIDC");
  const oidc = workflow.indexOf("uses: ./.github/workflows/windows-formal-update-private-reader-oidc.yml");
  const operator = workflow.indexOf("Run independently approved operator sequence");
  assert.ok(publicPreflight >= 0 && publicPreflight < protectedPreflight);
  assert.ok(sourceAuthentication >= 0 && sourceAuthentication < sourceCleanup && sourceCleanup < oidc && oidc < operator);
  assert.match(sourceJob, /run-windows-formal-update-handoff-consumer\.mjs"? --purge/u);
  assert.match(oidcWorkflow, /node scripts\/run-windows-formal-update-handoff-consumer\.mjs --encrypt/u);
  assert.match(workflow, /node scripts\/run-windows-formal-update-handoff-consumer\.mjs --decrypt/u);
  assert.match(oidcWorkflow, /node scripts\/run-windows-formal-update-handoff-consumer\.mjs --cleanup/u);
  assert.match(workflow, /node scripts\/run-windows-formal-update-handoff-consumer\.mjs --verify-source/u);
  assert.match(workflow, /node scripts\/run-windows-formal-update-handoff-consumer\.mjs --cleanup-source/u);
  assert.match(workflow, /governance\/execution-input\.json/u);
  assert.match(workflow, /governance\/approval-receipt\.json\.sig/u);
  assert.doesNotMatch(workflow, /s3api (?:list|delete|put)|aws s3 /u);
  for (const variable of [
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
    "AWS_SECURITY_TOKEN", "AWS_REGION", "AWS_DEFAULT_REGION",
  ]) assert.match(workflow, new RegExp(variable, "u"));
  assert.match(oidcWorkflow, /steps\.materialize\.outputs\.receipt_written == 'true'/u);
  assert.match(operatorJob, /consumer_receipt_artifact_id/u);
  assert.match(operatorJob, /consumer_receipt_artifact_digest/u);
  assert.match(operatorJob, /consumer_receipt_sha256/u);
  assert.match(workflow, /if \(\$status -eq 0 -or \$status -eq 2\)/u);
  assert.match(workflow, /if \(\$status -eq 2\) \{ exit 1 \}/u);
  assert.equal(
    packageJson.scripts["matter-desktop:windows-update-rollback:qa"],
    "node scripts/run-formal-windows-update-rollback-qa.mjs",
  );
});
