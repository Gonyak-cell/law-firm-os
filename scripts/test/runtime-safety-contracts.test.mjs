import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  EVIDENCE_SCHEMA_VERSION,
  hashRuntimeSafetyOutput,
  validateRuntimeSafetyEvidence,
} from "../lib/runtime-safety-evidence-contract.mjs";
import {
  canonicalizeJson,
  sha256Hex,
  validateRuntimeSafetyApprovalBundle,
} from "../lib/runtime-safety-approval-contract.mjs";

const OUTPUT = Buffer.from("runtime-safety-output\n");

function validEvidence() {
  return {
    schema_version: EVIDENCE_SCHEMA_VERSION,
    tuw_id: "RS-GOV-001",
    implementation_state: "VERIFIED",
    execution_state: "NOT_APPLICABLE",
    target_source_sha: "a".repeat(40),
    target_tree: "b".repeat(40),
    toolchain_sha: "c".repeat(40),
    profile: "source-local",
    commands: [{
      ordinal: 1,
      argv: ["node", "scripts/validate-runtime-safety-governance.mjs"],
      cwd: "/workspace",
      env_keys: ["CI", "TZ"],
      parser: "json-v1",
      timeout_ms: 30_000,
      result_slice: "isolated:RS-GOV-001:all",
    }],
    results: [{
      ordinal: 1,
      exit_code: 0,
      started_at: "2026-07-17T00:00:00.000Z",
      finished_at: "2026-07-17T00:00:01.000Z",
      output_sha256: hashRuntimeSafetyOutput(OUTPUT),
      result_slice: "isolated:RS-GOV-001:all",
      passed: true,
      skipped: 0,
    }],
    started_at: "2026-07-17T00:00:00.000Z",
    finished_at: "2026-07-17T00:00:02.000Z",
    safe_counts: { passed: 1, failed: 0 },
    skip_count: 0,
    output_path: "RS-GOV-001/output.log",
    output_sha256: hashRuntimeSafetyOutput(OUTPUT),
    claims: { verified: true, production_ready: false, go_live: false },
    external_actions: [],
  };
}

function expectEvidenceCode(code, mutate, options) {
  const receipt = validEvidence();
  mutate(receipt);
  assert.throws(() => validateRuntimeSafetyEvidence(receipt, options), (error) => error.code === code);
}

test("v0.2 evidence contract accepts a complete isolated receipt", () => {
  const result = validateRuntimeSafetyEvidence(validEvidence(), { outputBytes: OUTPUT });
  assert.equal(result.valid, true);
  assert.equal(result.command_count, 1);
});

test("v0.2 evidence contract rejects missing fields and bad closed vocabulary", () => {
  expectEvidenceCode("EVIDENCE_MISSING_FIELD", (receipt) => { delete receipt.started_at; });
  expectEvidenceCode("EVIDENCE_IMPLEMENTATION_STATE", (receipt) => { receipt.implementation_state = "MERGE_READY"; });
  expectEvidenceCode("EVIDENCE_EXECUTION_STATE", (receipt) => { receipt.execution_state = "LOCAL_ONLY"; });
  expectEvidenceCode("EVIDENCE_PROFILE", (receipt) => { receipt.profile = "whatever"; });
  expectEvidenceCode("EVIDENCE_TARGET_SHA", (receipt) => { receipt.target_source_sha = "abc"; });
  expectEvidenceCode("EVIDENCE_TARGET_TREE", (receipt) => { receipt.target_tree = "ABC".repeat(13); });
  expectEvidenceCode("EVIDENCE_TOOLCHAIN_SHA", (receipt) => { receipt.toolchain_sha = "f".repeat(39); });
});

test("v0.2 evidence contract rejects timestamp, ordinal, and slice violations", () => {
  expectEvidenceCode("EVIDENCE_TIMESTAMP_ORDER", (receipt) => { receipt.finished_at = receipt.started_at; });
  expectEvidenceCode("EVIDENCE_TIMESTAMP_ORDER", (receipt) => {
    receipt.results[0].finished_at = receipt.results[0].started_at;
  });
  expectEvidenceCode("EVIDENCE_ORDINAL", (receipt) => { receipt.results[0].ordinal = 2; });
  expectEvidenceCode("EVIDENCE_RESULT_SLICE", (receipt) => { receipt.results[0].result_slice = "isolated:RS-GOV-002:all"; });
  expectEvidenceCode("EVIDENCE_RESULT_SLICE_OVERLAP", (receipt) => {
    receipt.commands.push({ ...receipt.commands[0], ordinal: 2 });
    receipt.results.push({ ...receipt.results[0], ordinal: 2 });
  });
});

test("v0.2 evidence contract rejects unsafe counts, output drift, and false verified claims", () => {
  expectEvidenceCode("EVIDENCE_SAFE_COUNTS", (receipt) => { receipt.safe_counts.failed = -1; });
  expectEvidenceCode("EVIDENCE_SAFE_COUNTS", (receipt) => { receipt.safe_counts.passed = 1.5; });
  expectEvidenceCode("EVIDENCE_OUTPUT_HASH_DRIFT", () => {}, { outputBytes: Buffer.from("drift") });
  expectEvidenceCode("EVIDENCE_VERIFIED_INCONSISTENT", (receipt) => { receipt.skip_count = 1; });
  expectEvidenceCode("EVIDENCE_CLAIMS", (receipt) => { receipt.claims.unbounded_claim = true; });
});

test("v0.2 evidence contract rejects secret material in recorded argv", () => {
  expectEvidenceCode("EVIDENCE_SECRET_ARGV", (receipt) => {
    receipt.commands[0].argv = ["node", "script.mjs", "--client-secret", "do-not-record-this"];
  });
  expectEvidenceCode("EVIDENCE_SECRET_ARGV", (receipt) => {
    receipt.commands[0].argv = ["node", "script.mjs", "postgresql://user:password@db.internal/lawos"];
  });
});

function approvalFixture() {
  const root = mkdtempSync(join(tmpdir(), "lawos-approval-contract-"));
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registryPath = join(root, "registry.v1.json");
  const receiptPath = join(root, "approval.json");
  const signaturePath = `${receiptPath}.sig`;
  const baseRegistry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-07-17T00:00:00.000Z",
    keys: [{
      key_id: "owner-key-1",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ format: "pem", type: "spki" }).toString(),
      roles: ["owner"],
      actions: ["source-readiness-decision"],
      environments: ["source-local"],
      valid_from: "2026-07-01T00:00:00.000Z",
      valid_until: "2026-08-01T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  const baseReceipt = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: "approval-1",
    key_id: "owner-key-1",
    role: "owner",
    decision: "approved",
    packet_sha256: "d".repeat(64),
    source_sha: "a".repeat(40),
    source_tree: "b".repeat(40),
    action: "source-readiness-decision",
    environment: "source-local",
    signed_at: "2026-07-17T00:00:00.000Z",
    expires_at: "2026-07-18T00:00:00.000Z",
    data_scope: [],
    contact_scope: [],
  };

  const write = ({ registry = structuredClone(baseRegistry), receipt = structuredClone(baseReceipt), resign = true } = {}) => {
    const registryBytes = Buffer.from(`${JSON.stringify(registry, null, 2)}\n`);
    writeFileSync(registryPath, registryBytes);
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    if (resign) writeFileSync(signaturePath, sign(null, Buffer.from(canonicalizeJson(receipt)), privateKey));
    return {
      fixtureRoot: root,
      registryPath,
      expectedRegistrySha256: sha256Hex(registryBytes),
      receiptPath,
      signaturePath,
      expectedRole: "owner",
      expectedAction: "source-readiness-decision",
      expectedEnvironment: "source-local",
      expectedPacketSha256: "d".repeat(64),
      expectedSourceSha: "a".repeat(40),
      expectedSourceTree: "b".repeat(40),
      allowedDataScope: [],
      allowedContactScope: [],
      now: Date.parse("2026-07-17T01:00:00.000Z"),
    };
  };
  return { root, baseRegistry, baseReceipt, write };
}

function expectApprovalCode(code, options) {
  assert.throws(() => validateRuntimeSafetyApprovalBundle(options), (error) => error.code === code);
}

test("approval contract validates an RFC-8785-canonical detached Ed25519 receipt", () => {
  const fixture = approvalFixture();
  const result = validateRuntimeSafetyApprovalBundle(fixture.write());
  assert.equal(result.valid, true);
  assert.equal(result.decision, "approved");
});

test("approval contract fails closed on missing or drifted registry authority", () => {
  const fixture = approvalFixture();
  const options = fixture.write();
  expectApprovalCode("APPROVAL_REQUIRED", { ...options, expectedRegistrySha256: undefined });
  expectApprovalCode("APPROVAL_REGISTRY_DIGEST", { ...options, expectedRegistrySha256: "0".repeat(64) });
});

test("approval contract rejects self-signing, expired, revoked, role, action, and environment drift", () => {
  const selfSigned = approvalFixture();
  const selfSignedReceipt = { ...selfSigned.baseReceipt, public_key: "untrusted" };
  expectApprovalCode("APPROVAL_SELF_SIGNING", selfSigned.write({ receipt: selfSignedReceipt }));

  const expired = approvalFixture();
  const expiredOptions = expired.write();
  expectApprovalCode("APPROVAL_EXPIRED", { ...expiredOptions, now: Date.parse("2026-07-19T00:00:00.000Z") });

  const revoked = approvalFixture();
  const revokedRegistry = structuredClone(revoked.baseRegistry);
  revokedRegistry.keys[0].revoked_at = "2026-07-16T00:00:00.000Z";
  expectApprovalCode("APPROVAL_REVOKED", revoked.write({ registry: revokedRegistry }));

  const wrongRole = approvalFixture();
  expectApprovalCode("APPROVAL_ROLE", wrongRole.write({ receipt: { ...wrongRole.baseReceipt, role: "reviewer" } }));
  const wrongAction = approvalFixture();
  expectApprovalCode("APPROVAL_ACTION", wrongAction.write({ receipt: { ...wrongAction.baseReceipt, action: "deploy" } }));
  const wrongEnvironment = approvalFixture();
  expectApprovalCode("APPROVAL_ENVIRONMENT", wrongEnvironment.write({ receipt: { ...wrongEnvironment.baseReceipt, environment: "production" } }));
});

test("approval contract rejects symlink and fixture-root escape paths", () => {
  const fixture = approvalFixture();
  const options = fixture.write();
  const link = join(fixture.root, "approval-link.json");
  symlinkSync(options.receiptPath, link);
  expectApprovalCode("APPROVAL_SYMLINK", { ...options, receiptPath: link });
  expectApprovalCode("APPROVAL_PATH_ESCAPE", { ...options, receiptPath: join(fixture.root, "..", "outside.json") });
});
