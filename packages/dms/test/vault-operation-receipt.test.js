import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNoClientSuppliedVaultAuthority,
  assertNoVaultBoundarySecrets,
  assertVaultOperationBinding,
  assertVaultOperationReceipt,
  classifyVaultOperationReceiptTransition,
  classifyVaultOperationReplay,
  createVaultOperationAuditEvent,
  createVaultOperationBinding,
  createVaultOperationReceipt,
} from "../src/vault-operation-receipt.js";

const DIGEST = Object.freeze({
  nonce: "1".repeat(64),
  source: "2".repeat(64),
  target: "3".repeat(64),
  installation: "4".repeat(64),
  compose: "5".repeat(64),
  content: "6".repeat(64),
});

const EXACT_VERSION = Object.freeze({
  document_id: "document_018f",
  version_id: "version_01",
  file_object_id: "file_object_01",
  sha256: DIGEST.content,
  byte_size: 42,
  mime_type: "application/pdf",
});

function binding({
  kind = "save_local_file",
  nonce = DIGEST.nonce,
  target = DIGEST.target,
  exactVersion = kind === "attach_outlook" || kind === "export_exact_version"
    ? EXACT_VERSION
    : null,
} = {}) {
  return createVaultOperationBinding({
    principal: {
      tenant_id: "tenant_amic",
      user_id: "user_amic",
      role_ids: ["must-not-project"],
      scopes: ["must-not-project"],
    },
    operation_kind: kind,
    server_nonce_sha256: nonce,
    source_ref_sha256: DIGEST.source,
    target_ref_sha256: target,
    resolved_resource: {
      matter_id: "matter_amic",
      exact_version: exactVersion,
      installation_ref_sha256: kind === "attach_outlook" ? DIGEST.installation : null,
      compose_target_sha256: kind === "attach_outlook" ? DIGEST.compose : null,
    },
  });
}

function receipt(operation, stage, index, extra = {}) {
  const authorityStage = new Set([
    "authorized", "quarantined", "scanning", "promoted", "readback_verified", "downloaded", "delivered", "attached",
  ]).has(stage);
  return createVaultOperationReceipt({
    binding: operation,
    stage,
    occurred_at: `2026-08-28T01:00:${String(index).padStart(2, "0")}.000Z`,
    lawos_event_id: `lawos_event_${index}`,
    authority_ref: authorityStage ? `vault_authority_${index}` : null,
    vault_event_id: authorityStage ? `vault_event_${index}` : null,
    ...extra,
  });
}

test("server binding derives stable operation and idempotency identities without role or e-mail fallback", () => {
  const first = binding();
  const second = binding();
  assert.deepEqual(first, second);
  assert.match(first.operation_id, /^vaultop_[a-f0-9]{32}$/u);
  assert.match(first.correlation_id, /^vaultcorr_[a-f0-9]{32}$/u);
  assert.match(first.request_fingerprint, /^[a-f0-9]{64}$/u);
  assert.match(first.idempotency_key_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(first.tenant_id, "tenant_amic");
  assert.equal(first.actor_id, "user_amic");
  assert.equal(JSON.stringify(first).includes("must-not-project"), false);
  assert.equal(assertVaultOperationBinding(first), true);

  const projected = receipt(first, "requested", 0);
  assert.equal("tenant_id" in projected, false);
  assert.equal("actor_id" in projected, false);
  assert.equal("idempotency_key" in projected, false);
  assert.equal(projected.raw_path_included, false);
  assert.equal(projected.token_material_included, false);
  assert.equal(projected.production_ready_claim, false);
});

test("exact-version export and attachment fail closed without all immutable bindings", () => {
  assert.throws(
    () => createVaultOperationBinding({
      principal: { tenant_id: "tenant_amic", user_id: "user_amic" },
      operation_kind: "export_exact_version",
      server_nonce_sha256: DIGEST.nonce,
      source_ref_sha256: DIGEST.source,
      target_ref_sha256: DIGEST.target,
      resolved_resource: {
        matter_id: "matter_amic",
        exact_version: null,
        installation_ref_sha256: null,
        compose_target_sha256: null,
      },
    }),
    (error) => error?.safe_error_code === "VAULT_OPERATION_EXACT_VERSION_REQUIRED",
  );
  assert.throws(
    () => createVaultOperationBinding({
      principal: { tenant_id: "tenant_amic", user_id: "user_amic" },
      operation_kind: "attach_outlook",
      server_nonce_sha256: DIGEST.nonce,
      source_ref_sha256: DIGEST.source,
      target_ref_sha256: DIGEST.target,
      resolved_resource: {
        matter_id: "matter_amic",
        exact_version: EXACT_VERSION,
        installation_ref_sha256: null,
        compose_target_sha256: DIGEST.compose,
      },
    }),
    (error) => error?.safe_error_code === "VAULT_OPERATION_EXACT_VERSION_REQUIRED",
  );
});

test("cross-process and receipt guards reject raw paths, credentials, URLs, bytes, and mail PII", () => {
  const publicAttacks = [
    { file_path: "C:\\Users\\amic\\secret.pdf" },
    { nested: { access_token: "secret" } },
    { download: "https://storage.example.invalid/object?signature=secret" },
    { payload: Buffer.from("secret") },
    { handoff: "/private/var/folders/amic.pdf" },
    { token: "opaque-secret" },
    { url: "relative-storage-link" },
  ];
  for (const attack of publicAttacks) {
    assert.throws(
      () => assertNoVaultBoundarySecrets(attack),
      (error) => error?.safe_error_code === "VAULT_BOUNDARY_SECRET_FORBIDDEN",
    );
  }
  assert.throws(
    () => assertNoVaultBoundarySecrets({ email: "client@example.invalid" }, { profile: "receipt" }),
    (error) => error?.safe_error_code === "VAULT_BOUNDARY_SECRET_FORBIDDEN",
  );
  assert.equal(assertNoVaultBoundarySecrets({
    opaque_file_handle: "file_handle_01",
    mime_type: "application/pdf",
    size_bytes: 42,
  }), true);
});

test("client requests cannot smuggle tenant, actor, role, scope, or permission authority", () => {
  for (const attack of [
    { tenant_id: "tenant_foreign" },
    { nested: { actorId: "user_foreign" } },
    { roles: ["admin"] },
    { policy: { permission_decision: "allow" } },
    { scopes: ["vault.write"] },
  ]) {
    assert.throws(
      () => assertNoClientSuppliedVaultAuthority(attack),
      (error) => error?.safe_error_code === "VAULT_CLIENT_AUTHORITY_FIELD_FORBIDDEN",
    );
  }
  assert.equal(assertNoClientSuppliedVaultAuthority({
    matter_id: "matter_selector_untrusted",
    document_id: "document_selector_untrusted",
  }), true);
});

test("save receipts advance through quarantine and acquire one exact version only at promotion", () => {
  const operation = binding();
  const requested = receipt(operation, "requested", 0);
  const authorized = receipt(operation, "authorized", 1, { authority_ref: "vault-decision-01" });
  const transferring = receipt(operation, "transferring", 2);
  const quarantined = receipt(operation, "quarantined", 3, {
    vault_event_id: "vault_event_quarantine_01",
  });
  const scanning = receipt(operation, "scanning", 4, {
    vault_event_id: "vault_event_scan_01",
  });
  const promoted = receipt(operation, "promoted", 5, {
    exact_version: EXACT_VERSION,
    vault_event_id: "vault_event_promote_01",
  });
  const verified = receipt(operation, "readback_verified", 6, {
    exact_version: EXACT_VERSION,
    vault_event_id: "vault_event_readback_01",
  });
  const cleaned = receipt(operation, "cleaned", 7, { exact_version: EXACT_VERSION });

  assert.deepEqual(classifyVaultOperationReceiptTransition({ next: requested }), {
    outcome: "append",
    should_append: true,
  });
  for (const [previous, next] of [
    [requested, authorized],
    [authorized, transferring],
    [transferring, quarantined],
    [quarantined, scanning],
    [scanning, promoted],
    [promoted, verified],
    [verified, cleaned],
  ]) {
    assert.equal(classifyVaultOperationReceiptTransition({ previous, next }).should_append, true);
  }
  assert.equal(quarantined.exact_version, null);
  assert.equal(scanning.exact_version, null);
  assert.equal(promoted.exact_version.version_id, EXACT_VERSION.version_id);
  assert.equal(promoted.authority_ref_sha256?.length, 64);
  assert.equal(authorized.authority_ref_sha256?.length, 64);
});

test("receipt transitions reject premature identity, skipped stages, regression, cleanup before terminal, and version substitution", () => {
  const operation = binding();
  const requested = receipt(operation, "requested", 0);
  const authorized = receipt(operation, "authorized", 1);
  const transferring = receipt(operation, "transferring", 2);
  const quarantined = receipt(operation, "quarantined", 3);
  const scanning = receipt(operation, "scanning", 4);
  const promoted = receipt(operation, "promoted", 5, { exact_version: EXACT_VERSION });
  assert.throws(
    () => receipt(operation, "quarantined", 3, { exact_version: EXACT_VERSION }),
    (error) => error?.safe_error_code === "VAULT_OPERATION_EXACT_VERSION_PREMATURE",
  );
  assert.throws(
    () => classifyVaultOperationReceiptTransition({ previous: requested, next: transferring }),
    (error) => error?.safe_error_code === "VAULT_OPERATION_TRANSITION_INVALID",
  );
  assert.throws(
    () => classifyVaultOperationReceiptTransition({ previous: authorized, next: requested }),
    (error) => error?.safe_error_code === "VAULT_OPERATION_TRANSITION_INVALID",
  );
  assert.throws(
    () => classifyVaultOperationReceiptTransition({
      previous: authorized,
      next: receipt(operation, "cleaned", 3),
    }),
    (error) => error?.safe_error_code === "VAULT_OPERATION_TRANSITION_INVALID",
  );
  assert.throws(
    () => classifyVaultOperationReceiptTransition({
      previous: promoted,
      next: receipt(operation, "readback_verified", 6, {
        exact_version: { ...EXACT_VERSION, version_id: "version_latest_wrong" },
      }),
    }),
    (error) => error?.safe_error_code === "VAULT_OPERATION_EXACT_VERSION_MISMATCH",
  );
  assert.equal(quarantined.exact_version, null);
  assert.equal(scanning.exact_version, null);
  assert.equal(promoted.exact_version.version_id, "version_01");
});

test("same fingerprint is a non-executing replay and reused nonce with changed material conflicts", () => {
  const original = binding();
  const finalReceipt = receipt(original, "readback_verified", 4, { exact_version: EXACT_VERSION });
  const replay = classifyVaultOperationReplay({
    binding: original,
    existing: {
      idempotency_key_sha256: original.idempotency_key_sha256,
      request_fingerprint: original.request_fingerprint,
      receipt: finalReceipt,
    },
  });
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(replay.should_execute, false);
  assert.equal(replay.receipt.receipt_id, finalReceipt.receipt_id);

  const changedMaterial = binding({ target: "9".repeat(64) });
  assert.equal(changedMaterial.idempotency_key_sha256, original.idempotency_key_sha256);
  assert.notEqual(changedMaterial.request_fingerprint, original.request_fingerprint);
  assert.throws(
    () => classifyVaultOperationReplay({
      binding: changedMaterial,
      existing: {
        idempotency_key_sha256: original.idempotency_key_sha256,
        request_fingerprint: original.request_fingerprint,
        receipt: finalReceipt,
      },
    }),
    (error) => error?.safe_error_code === "VAULT_OPERATION_IDEMPOTENCY_CONFLICT",
  );
});

test("identical receipt append is a no-op while conflicting receipt material fails", () => {
  const operation = binding();
  const requested = receipt(operation, "requested", 0);
  assert.deepEqual(classifyVaultOperationReceiptTransition({ previous: requested, next: requested }), {
    outcome: "exact_replay",
    should_append: false,
  });
  const changed = structuredClone(requested);
  changed.raw_path_included = true;
  assert.throws(
    () => assertVaultOperationReceipt(changed),
    (error) => error?.safe_error_code === "VAULT_OPERATION_RECEIPT_INVALID",
  );
  const forgedIdentity = structuredClone(requested);
  forgedIdentity.receipt_id = "vaultreceipt_00000000000000000000000000000000";
  assert.throws(
    () => assertVaultOperationReceipt(forgedIdentity),
    (error) => error?.safe_error_code === "VAULT_OPERATION_RECEIPT_INVALID",
  );
  const forgedBinding = structuredClone(operation);
  forgedBinding.correlation_id = "vaultcorr_00000000000000000000000000000000";
  assert.throws(
    () => assertVaultOperationBinding(forgedBinding),
    (error) => error?.safe_error_code === "VAULT_OPERATION_BINDING_INVALID",
  );
});

test("negative outcomes require a safe code and may append cleanup only", () => {
  const operation = binding();
  assert.throws(
    () => receipt(operation, "blocked", 1),
    (error) => error?.safe_error_code === "VAULT_OPERATION_INPUT_INVALID",
  );
  const requested = receipt(operation, "requested", 0);
  const blocked = receipt(operation, "blocked", 1, { safe_reason_code: "VAULT_PERMISSION_DENIED" });
  const cleaned = receipt(operation, "cleaned", 2);
  assert.equal(classifyVaultOperationReceiptTransition({ previous: requested, next: blocked }).should_append, true);
  assert.equal(classifyVaultOperationReceiptTransition({ previous: blocked, next: cleaned }).should_append, true);
  assert.throws(
    () => classifyVaultOperationReceiptTransition({
      previous: blocked,
      next: receipt(operation, "authorized", 3),
    }),
    (error) => error?.safe_error_code === "VAULT_OPERATION_TRANSITION_INVALID",
  );
});

test("LawOS audit keeps native actor authority internally and only PII-safe trace material in metadata", () => {
  const operation = binding({ kind: "attach_outlook" });
  const attached = receipt(operation, "attached", 7, {
    vault_event_id: "vault_event_attach_01",
    authority_ref: "vault-authorization-readback-01",
  });
  const audit = createVaultOperationAuditEvent({ binding: operation, receipt: attached });
  assert.equal(audit.tenant_id, "tenant_amic");
  assert.equal(audit.actor_id, "user_amic");
  assert.equal(audit.action, "amic_os_vault.attach_outlook.attached");
  assert.equal(audit.object_id, operation.operation_id);
  assert.equal(audit.metadata.correlation_id, operation.correlation_id);
  assert.equal(audit.after.exact_version.version_id, EXACT_VERSION.version_id);
  assert.equal(audit.metadata.vault_event_id, "vault_event_attach_01");
  assert.equal(JSON.stringify(audit.metadata).includes(operation.idempotency_key), false);
  assert.equal(JSON.stringify(audit).includes("@"), false);
});
