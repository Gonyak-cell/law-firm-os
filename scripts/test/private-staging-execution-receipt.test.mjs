import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import { canonicalizeJson } from "../lib/runtime-safety-approval-contract.mjs";
import {
  PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS,
  PRIVATE_STAGING_REQUIRED_RECEIPT_KINDS,
  privateStagingRequiredReceiptKinds,
  privateStagingReceiptSignerScope,
  projectPrivateStagingReceiptClaims,
  projectPrivateStagingReceiptSafeCounts,
  resolvePrivateStagingReceiptSigner,
  validatePrivateStagingExecutionReceipt,
  validatePrivateStagingReceiptSet,
  verifyPrivateStagingExecutionReceipt,
} from "../lib/private-staging-execution-receipt.mjs";

const sourceSha = "a".repeat(40);
const sourceTree = "b".repeat(40);
const artifactSha256 = "c".repeat(64);
const ownerInstructionSha256 = "d".repeat(64);

function receipt(kind = "cut-007") {
  return {
    schema_version: "law-firm-os.private-staging.execution-receipt.v1",
    receipt_id: `lawos-private-staging-${kind}-20260720`,
    receipt_kind: kind,
    key_id: "lawos-owner-ed25519-20260717",
    approval_id: "LAWOS-PRIVATE-STAGING-EXACT-HEAD-APPROVAL-20260720",
    owner_instruction_sha256: ownerInstructionSha256,
    execution_state: "PASS",
    started_at: "2026-07-20T00:00:00.000Z",
    finished_at: "2026-07-20T00:01:00.000Z",
    command: `node scripts/run-${kind}.mjs --redacted-private-inputs`,
    exit_code: 0,
    profile: "matter-staging-admin",
    environment: "lawos-staging",
    data_scope: "synthetic-only",
    contact_scope: "synthetic-mailbox-only",
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: artifactSha256,
    safe_counts: { assertion_count: 97, real_data_count: 0 },
    digests: { evidence_sha256: "e".repeat(64) },
    claims: {
      secret_material_returned: false,
      raw_pii_returned: false,
      production_contacted: false,
      real_data_contacted: false,
      synthetic_only_verified: true,
    },
    blockers: [],
  };
}

test("execution receipt enforces exact bindings and required evidence fields", () => {
  const value = receipt();
  const result = validatePrivateStagingExecutionReceipt(value, {
    sourceSha,
    sourceTree,
    artifactSha256,
    ownerInstructionSha256,
    approvalId: value.approval_id,
    executionState: "PASS",
  });
  assert.equal(result.valid, true);
  assert.equal(result.receipt_kind, "cut-007");
  assert.match(result.canonical_sha256, /^[0-9a-f]{64}$/u);
});

test("execution receipt rejects old free-form states, missing fields, and sensitive material", () => {
  const oldState = receipt();
  oldState.execution_state = "COMPLETE_CANDIDATE";
  assert.throws(() => validatePrivateStagingExecutionReceipt(oldState), /execution_state/u);

  const missing = receipt();
  delete missing.started_at;
  assert.throws(() => validatePrivateStagingExecutionReceipt(missing), /started_at/u);

  const secret = receipt();
  secret.claims.password = "do-not-store";
  assert.throws(() => validatePrivateStagingExecutionReceipt(secret), /sensitive material/u);

  const pii = receipt();
  pii.command = "node run.mjs --email person@amic.kr";
  assert.throws(() => validatePrivateStagingExecutionReceipt(pii), /non-synthetic email/u);

  for (const field of ["password", "token", "credential", "secret"]) {
    const sensitive = receipt();
    sensitive.digests = { evidence_sha256: "e".repeat(64) };
    sensitive.claims[field] = "material";
    assert.throws(() => validatePrivateStagingExecutionReceipt(sensitive), /sensitive material/u);
  }
});

test("receipt projection preserves numeric setup evidence under a non-sensitive count name", () => {
  assert.deepEqual(projectPrivateStagingReceiptSafeCounts({
    password_reset_count: 1,
    open_secret_alert_count: 0,
    real_data_count: 0,
  }), {
    credential_setup_count: 1,
    open_sensitive_material_alert_count: 0,
    real_data_count: 0,
  });
  assert.throws(() => projectPrivateStagingReceiptSafeCounts({
    password_reset_count: 1,
    credential_setup_count: 1,
  }), /collides/u);
  assert.throws(() => projectPrivateStagingReceiptSafeCounts({
    open_secret_alert_count: 0,
    open_sensitive_material_alert_count: 0,
  }), /collides/u);
  assert.throws(() => projectPrivateStagingReceiptSafeCounts({ password_reset_count: "1" }), /finite non-negative number/u);

  const legacyName = receipt();
  legacyName.safe_counts = { password_reset_count: 1, real_data_count: 0 };
  assert.throws(() => validatePrivateStagingExecutionReceipt(legacyName), /sensitive field name/u);

  const projected = receipt();
  projected.safe_counts = {
    credential_setup_count: 1,
    open_sensitive_material_alert_count: 0,
    real_data_count: 0,
  };
  assert.equal(validatePrivateStagingExecutionReceipt(projected).valid, true);

  const secretNamedAlertCount = receipt();
  secretNamedAlertCount.safe_counts = { open_secret_alert_count: 0, real_data_count: 0 };
  assert.throws(() => validatePrivateStagingExecutionReceipt(secretNamedAlertCount), /sensitive field name/u);
});

test("receipt claim projection preserves internal authority evidence under a non-sensitive boolean name", () => {
  assert.deepEqual(projectPrivateStagingReceiptClaims({
    ...receipt().claims,
    internal_password_authority_verified: true,
  }), {
    ...receipt().claims,
    internal_identity_authority_verified: true,
  });
  assert.throws(() => projectPrivateStagingReceiptClaims({
    ...receipt().claims,
    internal_password_authority_verified: true,
    internal_identity_authority_verified: true,
  }), /collides/u);

  const legacyName = receipt();
  legacyName.claims.internal_password_authority_verified = true;
  assert.throws(() => validatePrivateStagingExecutionReceipt(legacyName), /sensitive material/u);

  for (const field of ["password", "passphrase", "token", "authorization", "credential", "secret", "private_key"]) {
    assert.throws(() => projectPrivateStagingReceiptClaims({
      ...receipt().claims,
      [field]: "material",
    }), /sensitive material/u);
  }

  const projected = receipt();
  projected.claims.internal_identity_authority_verified = true;
  assert.equal(validatePrivateStagingExecutionReceipt(projected).valid, true);
});

test("execution receipt verifies detached Ed25519 signature", () => {
  const value = receipt();
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const signature = sign(null, Buffer.from(canonicalizeJson(value)), privateKey);
  assert.equal(verifyPrivateStagingExecutionReceipt({ receipt: value, signature, publicKey }).signature_valid, true);
  const tampered = structuredClone(value);
  tampered.safe_counts.assertion_count += 1;
  assert.throws(() => verifyPrivateStagingExecutionReceipt({ receipt: tampered, signature, publicKey }), /signature/u);
});

test("receipt set requires one unique receipt for every W11 kind", () => {
  const receipts = PRIVATE_STAGING_REQUIRED_RECEIPT_KINDS.map(receipt);
  assert.equal(validatePrivateStagingReceiptSet(receipts).receipt_count, PRIVATE_STAGING_REQUIRED_RECEIPT_KINDS.length);
  assert.throws(() => validatePrivateStagingReceiptSet(receipts.slice(1)), /missing required kinds/u);
  assert.throws(() => validatePrivateStagingReceiptSet([...receipts, receipt("cut-007")]), /duplicate/u);
});

test("receipt profiles separate nine pre-suite checkpoints from seven suite-derived receipts", () => {
  assert.deepEqual(privateStagingRequiredReceiptKinds("pre-suite"), PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS);
  assert.equal(PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS.length, 9);
  assert.equal(privateStagingRequiredReceiptKinds("complete").length, 16);
  assert.throws(() => privateStagingRequiredReceiptKinds("partial"), /profile/u);
  const receipts = PRIVATE_STAGING_PRE_SUITE_RECEIPT_KINDS.map(receipt);
  assert.equal(validatePrivateStagingReceiptSet(receipts, {
    requiredKinds: privateStagingRequiredReceiptKinds("pre-suite"),
  }).receipt_count, 9);
});

test("receipt signer must be a current registered Ed25519 owner key", () => {
  const { publicKey } = generateKeyPairSync("ed25519");
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    keys: [{
      key_id: "lawos-owner-ed25519-20260717",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: ["lawos-private-staging-exact-head-execution"],
      environments: ["lawos-staging"],
      valid_from: "2026-07-01T00:00:00.000Z",
      valid_until: "2027-07-01T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  const scope = privateStagingReceiptSignerScope("cut-007");
  const context = {
    expectedRole: scope.role,
    expectedAction: scope.action,
    expectedEnvironment: scope.environment,
    receiptEnvironment: "lawos-staging",
    receiptStartedAt: Date.parse("2026-07-20T00:00:00.000Z"),
    receiptFinishedAt: Date.parse("2026-07-20T00:01:00.000Z"),
  };
  assert.equal(resolvePrivateStagingReceiptSigner(registry, registry.keys[0].key_id, Date.parse("2026-07-20T00:00:30.000Z"), context).key_id, registry.keys[0].key_id);
  const wrongAction = structuredClone(registry);
  wrongAction.keys[0].actions = ["unrelated-action"];
  assert.throws(() => resolvePrivateStagingReceiptSigner(wrongAction, wrongAction.keys[0].key_id, Date.parse("2026-07-20T00:00:30.000Z"), context), /action/u);
  const wrongEnvironment = structuredClone(registry);
  wrongEnvironment.keys[0].environments = ["development"];
  assert.throws(() => resolvePrivateStagingReceiptSigner(wrongEnvironment, wrongEnvironment.keys[0].key_id, Date.parse("2026-07-20T00:00:30.000Z"), context), /environment/u);
  const revoked = structuredClone(registry);
  revoked.keys[0].revoked_at = "2026-07-19T00:00:00.000Z";
  assert.throws(() => resolvePrivateStagingReceiptSigner(revoked, revoked.keys[0].key_id, Date.parse("2026-07-20T00:00:30.000Z"), context), /revoked/u);
});
