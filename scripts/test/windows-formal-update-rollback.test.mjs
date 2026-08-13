import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
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
  const approvalBundleBytes = Buffer.from("production-root-signed-approval-bundle-fixture");
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
  return { approvalBundleBytes, files, input, keyPair, receipt, verifyApprovalBundle };
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
      const raw = Buffer.from(input.files.get(path).toString("utf8").replace("{", '{\n  "version": "0.1.17",'));
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
    assert.match(`${run.stdout}\n${run.stderr}`, /requires a Windows host/u);
  }
});
