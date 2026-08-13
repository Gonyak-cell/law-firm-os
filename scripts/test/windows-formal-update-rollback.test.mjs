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
} from "../lib/windows-formal-update-runner.mjs";

const NOW = Date.parse("2026-08-13T00:00:00.000Z");
const CERTIFICATE_SHA1 = "A".repeat(40);

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
} = {}) {
  const calls = [];
  const executableBytes = {
    baseline: Buffer.from("installed-baseline-executable"),
    target: Buffer.from("installed-target-executable"),
  };
  let installedRole = null;
  let baselineInstallCount = 0;
  const installerReads = { baseline: 0, target: 0 };
  const executableReads = { baseline: 0, target: 0 };
  const sessions = new Set();
  const executablePath = "C:\\MatterUpdate\\matter.exe";
  const uninstallerPath = "C:\\MatterUpdate\\Uninstall matter.exe";
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
      const session = { active: true, role };
      sessions.add(session);
      return session;
    },
    async closeSession(session) {
      calls.push(`close:${session.role}`);
      session.active = false;
    },
    async isSessionActive(session) { return session.active; },
    async closeAllSessions() {
      calls.push("close-all");
      for (const session of sessions) session.active = false;
    },
    async uninstall({ role }) {
      calls.push(`uninstall:${role}`);
      installedRole = null;
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
    executeCleanup() {
      calls.push("failure-cleanup");
      installedRole = null;
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
    adapters,
    now: () => NOW,
  });

  assert.equal(result.verdict, "PASS");
  assert.equal(result.automatic_update, false);
  assert.deepEqual(adapters.calls, [
    "confirm:baseline_install",
    "install:baseline", "inspect:baseline", "launch:baseline", "close:baseline",
    "confirm:target_update",
    "install:target", "inspect:target", "launch:target", "close:target",
    "confirm:target_uninstall_for_rollback",
    "uninstall:target", "wait-uninstalled:target",
    "confirm:baseline_rollback",
    "install:baseline", "inspect:baseline", "launch:baseline", "close:baseline",
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
  )));
  assert.equal(result.residue_checks.length, 2);
  assert.equal(result.failure_cleanup.initiated, false);

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /tenant_amic|2f10d109|AMIC-WIN-|MatterUpdate/u);
  assert.equal(result.boundaries.provider_call_performed, false);
});

test("operator confirmation is required before the first mutation", async () => {
  const input = fixture();
  const approval = await verified(input);
  const adapters = nativeAdapters(input, { confirmOperation: () => false });
  await assert.rejects(() => runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
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
      adapters,
      now: () => NOW,
    }), (error) => {
      assert.equal(error.windows_update_rollback.failure_cleanup.required, false);
      return /changed after admission/u.test(String(error));
    });
    assert.equal(adapters.calls.includes("install:baseline"), false);
    assert.equal(adapters.calls.includes("failure-cleanup"), false);
  });

  await t.test("installed executable drift immediately before launch", async () => {
    const input = fixture();
    const approval = await verified(input);
    const adapters = nativeAdapters(input, { launchDriftRole: "baseline" });
    await assert.rejects(() => runWindowsFormalUpdateRollback({
      platform: "win32",
      executionInput: input.input,
      verifiedApproval: approval,
      adapters,
      now: () => NOW,
    }), /changed after verification and before launch/u);
    assert.equal(adapters.calls.includes("launch:baseline"), false);
    assert.equal(adapters.calls.includes("failure-cleanup"), true);
  });
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
      adapters,
      now: () => NOW,
    }), /expected certificate/u);
    assert.equal(adapters.calls.includes("launch:target"), false);
    assert.equal(adapters.calls.includes("failure-cleanup"), true);
  });
});

test("rollback requires the exact original baseline executable bytes", async () => {
  const input = fixture();
  const approval = await verified(input);
  const adapters = nativeAdapters(input, { rollbackDrift: true });
  await assert.rejects(() => runWindowsFormalUpdateRollback({
    platform: "win32",
    executionInput: input.input,
    verifiedApproval: approval,
    adapters,
    now: () => NOW,
  }), /differ from the original baseline/u);
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
  const packageJson = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  assert.match(workflow, /^on:\n  workflow_dispatch:/mu);
  assert.doesNotMatch(workflow, /\n\s+(?:push|pull_request|schedule):/u);
  assert.match(workflow, /environment: \$\{\{ needs\.protected-environment-preflight\.outputs\.environment_name \}\}/u);
  assert.doesNotMatch(workflow, /^\s+environment: windows-formal-update-rollback$/mu);
  assert.match(workflow, /prevent_self_review/u);
  assert.match(workflow, /can_admins_bypass/u);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/u);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}/u);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/u);
  assert.match(workflow, /lawos-update-rollback-evidence-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/u);
  assert.match(workflow, /steps\.operator\.outputs\.receipt_written == 'true'/u);
  assert.match(workflow, /if \(\$status -eq 0 -or \$status -eq 2\)/u);
  assert.match(workflow, /if \(\$status -eq 2\) \{ exit 1 \}/u);
  assert.equal(
    packageJson.scripts["matter-desktop:windows-update-rollback:qa"],
    "node scripts/run-formal-windows-update-rollback-qa.mjs",
  );
});
