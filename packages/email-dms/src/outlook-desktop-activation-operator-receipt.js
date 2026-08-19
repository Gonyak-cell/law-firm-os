import { verify as verifySignature } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { validateBindings } from "./outlook-desktop-activation-bindings.js";
import { snapshotOutlookDesktopBytes } from "./outlook-desktop-release-ticket-verifier.js";
import {
  assertExactKeys,
  fail,
  parseCanonicalObject,
  parseTime,
  pureObject,
  requireScope,
  sha256,
  validateSelectedKey,
} from "./outlook-desktop-activation-primitives.js";
import {
  IDENTIFIER,
  OPERATOR_OPERATION,
  OPERATOR_RECEIPT_SOURCE,
  OPERATOR_RECEIPT_TYPE,
  OPERATOR_ROLE,
  OPERATOR_SCOPE,
  OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
  OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_LIFETIME_MS,
  OUTLOOK_DESKTOP_OPERATOR_RECEIPT_SCHEMA,
  RECEIPT_KEYS,
  SHA256,
} from "./outlook-desktop-activation-schema.js";

function validateReceiptIdentity(receipt) {
  assertExactKeys(
    receipt,
    RECEIPT_KEYS,
    "OUTLOOK_ACTIVATION_OPERATOR_RECEIPT_INVALID",
    "operator receipt",
  );
  if (receipt.schema_version !== OUTLOOK_DESKTOP_OPERATOR_RECEIPT_SCHEMA
      || receipt.receipt_source !== OPERATOR_RECEIPT_SOURCE
      || receipt.receipt_type !== OPERATOR_RECEIPT_TYPE
      || receipt.signer_role !== OPERATOR_ROLE
      || receipt.operation !== OPERATOR_OPERATION
      || receipt.signer_scope !== OPERATOR_SCOPE
      || !IDENTIFIER.test(receipt.key_id ?? "")
      || !SHA256.test(receipt.challenge_nonce_sha256 ?? "")
      || !SHA256.test(receipt.local_measurement_evidence_sha256 ?? "")
      || !SHA256.test(receipt.activation_binding_sha256 ?? "")) {
    fail(
      "OUTLOOK_ACTIVATION_OPERATOR_SCOPE_MISMATCH",
      "operator receipt identity, role, operation, or scope is invalid",
    );
  }
  if (receipt.operator_local_package_verified !== true
      || receipt.production_ready_claim !== false) {
    fail(
      "OUTLOOK_ACTIVATION_OPERATOR_CLAIM_INVALID",
      "operator receipt must verify the local package and must not claim production readiness",
    );
  }
}

function validateOperatorScope(key, receipt, request) {
  const approvedRelease = request.bindings.approved_release;
  const principal = request.bindings.authenticated_principal;
  const policy = request.bindings.pilot_policy;
  for (const [field, value] of [
    ["allowed_receipt_sources", receipt.receipt_source],
    ["allowed_receipt_types", receipt.receipt_type],
    ["allowed_pilot_ids", policy.pilot_id],
    ["allowed_lawos_tenant_ids", principal.lawos_tenant_id],
    ["allowed_entra_tenant_ids", principal.entra_tenant_id],
    ["allowed_source_shas", approvedRelease.source_sha],
    ["allowed_source_trees", approvedRelease.source_tree],
    ["allowed_versions", approvedRelease.app_version],
    ["allowed_roles", receipt.signer_role],
    ["allowed_operations", receipt.operation],
    ["allowed_artifact_sha256s", approvedRelease.registered_final_artifact_sha256],
    ["allowed_binding_sha256s", approvedRelease.embedded_build_manifest_sha256],
    ["allowed_activation_modes", request.bindings.activation_mode],
    ["allowed_activation_operator_scopes", receipt.signer_scope],
    ["allowed_entra_subjects", principal.entra_subject],
    ["allowed_lawos_user_ids", principal.lawos_user_id],
    ["allowed_policy_revisions", policy.policy_revision],
    ["allowed_release_artifact_ids", approvedRelease.release_artifact_id],
    ["allowed_release_ticket_ids", approvedRelease.release_ticket_id],
    ["allowed_release_ticket_sha256s", approvedRelease.release_ticket_sha256],
    ["allowed_release_ticket_signature_sha256s", approvedRelease.release_ticket_signature_sha256],
    ["allowed_roster_sha256s", policy.roster_sha256],
    ["allowed_owner_principal_ids", policy.owner_principal_id],
  ]) {
    requireScope(key, field, value, "OUTLOOK_ACTIVATION_OPERATOR_SCOPE_MISMATCH");
  }
}

export function verifyActivationOperatorReceipt({
  challenge,
  now,
  receiptBytes,
  registryTrust,
  release,
  request,
  signatureBytes,
}) {
  const ownedReceiptBytes = snapshotOutlookDesktopBytes(receiptBytes, {
    code: "OUTLOOK_ACTIVATION_OPERATOR_RECEIPT_BYTES_REQUIRED",
    fail,
    maxBytes: OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
    message: "operator receipt must contain bounded raw bytes",
  });
  const ownedSignatureBytes = snapshotOutlookDesktopBytes(signatureBytes, {
    code: "OUTLOOK_ACTIVATION_OPERATOR_SIGNATURE_FORMAT",
    fail,
    maxBytes: 64,
    message: "operator receipt signature must contain exactly 64 raw Ed25519 bytes",
    minBytes: 64,
  });
  const receipt = parseCanonicalObject(
    ownedReceiptBytes,
    OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
    "OUTLOOK_ACTIVATION_OPERATOR_RECEIPT",
    "operator receipt",
  );
  validateReceiptIdentity(receipt);
  const bindings = validateBindings(receipt.bindings, now);
  if (!isDeepStrictEqual(bindings, request.bindings)
      || receipt.challenge_nonce_sha256 !== challenge.nonceSha256
      || receipt.local_measurement_evidence_sha256
        !== request.bindings.local_measurement_evidence_sha256
      || receipt.activation_binding_sha256 !== challenge.activationBindingSha256) {
    fail(
      "OUTLOOK_ACTIVATION_OPERATOR_BINDING_MISMATCH",
      "operator receipt does not bind the exact challenge and activation request",
    );
  }
  const issuedAt = parseTime(
    receipt.issued_at,
    "OUTLOOK_ACTIVATION_OPERATOR_TIME_INVALID",
    "operator_receipt.issued_at",
  );
  const expiresAt = parseTime(
    receipt.expires_at,
    "OUTLOOK_ACTIVATION_OPERATOR_TIME_INVALID",
    "operator_receipt.expires_at",
  );
  if (issuedAt < challenge.issuedAt || issuedAt > now
      || expiresAt <= now || expiresAt <= issuedAt
      || expiresAt - issuedAt > OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_LIFETIME_MS
      || expiresAt > challenge.expiresAt || expiresAt > release.expiresAt
      || expiresAt > Date.parse(request.bindings.approved_release.valid_until)) {
    fail(
      "OUTLOOK_ACTIVATION_OPERATOR_TIME_INVALID",
      "operator receipt must be current, at most ten minutes, and inside the challenge and release windows",
    );
  }
  if (receipt.key_id === release.ticket.key_id) {
    fail(
      "OUTLOOK_ACTIVATION_OPERATOR_SIGNER_NOT_DISTINCT",
      "operator receipt signer must be distinct from the release signer",
    );
  }
  const key = registryTrust.registry.keys.find(({ key_id: keyId }) => keyId === receipt.key_id);
  if (!key) {
    fail(
      "OUTLOOK_ACTIVATION_OPERATOR_SIGNER_UNKNOWN",
      "operator receipt signer is absent from the verified trust registry",
    );
  }
  validateSelectedKey(key, {
    issuedAt,
    keyId: receipt.key_id,
    now,
    prefix: "OUTLOOK_ACTIVATION_OPERATOR",
  });
  if (key.public_key_spki_pem === release.key.public_key_spki_pem) {
    fail(
      "OUTLOOK_ACTIVATION_OPERATOR_SIGNER_NOT_DISTINCT",
      "operator and release signers cannot reuse an Ed25519 public key",
    );
  }
  validateOperatorScope(key, receipt, request);
  let signatureValid = false;
  try {
    signatureValid = verifySignature(
      null,
      ownedReceiptBytes,
      key.public_key_spki_pem,
      ownedSignatureBytes,
    );
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    fail(
      "OUTLOOK_ACTIVATION_OPERATOR_SIGNATURE_INVALID",
      "operator signature does not verify over the exact canonical receipt bytes",
    );
  }
  return {
    expiresAt,
    issuedAt,
    key,
    receipt: pureObject(receipt),
    receiptSha256: sha256(ownedReceiptBytes),
    signatureSha256: sha256(ownedSignatureBytes),
  };
}
