import { isDeepStrictEqual } from "node:util";

import {
  validateActivationRequest,
  validateIssuedChallenge,
} from "./outlook-desktop-activation-challenge.js";
import { verifyActivationOperatorReceipt } from "./outlook-desktop-activation-operator-receipt.js";
import {
  OutlookDesktopActivationContractError,
  assertExactKeys,
  assertPrivacyTree,
  canonicalBytes,
  deepFreeze,
  fail,
  isRecord,
  pureObject,
  sha256,
} from "./outlook-desktop-activation-primitives.js";
import {
  validateActivationRegistryTrust,
  verifyActivationReleaseTicket,
} from "./outlook-desktop-activation-release.js";
import {
  OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
  snapshotOutlookDesktopBytes,
} from "./outlook-desktop-release-ticket-verifier.js";
import {
  BLOCKED_DOWNSTREAM,
  CONSUMPTION_KEYS,
  OUTLOOK_DESKTOP_ACTIVATION_MODE,
  OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
  VERIFICATION_KEYS,
} from "./outlook-desktop-activation-schema.js";

export function verifyOperatorActivation(input, now, registryResolver) {
  assertExactKeys(
    input,
    VERIFICATION_KEYS,
    "OUTLOOK_ACTIVATION_INPUT_INVALID",
    "activation verification input",
  );
  const ownedInput = {
    operator_receipt_bytes: snapshotOutlookDesktopBytes(input.operator_receipt_bytes, {
      code: "OUTLOOK_ACTIVATION_OPERATOR_RECEIPT_BYTES_REQUIRED",
      fail,
      maxBytes: OUTLOOK_DESKTOP_OPERATOR_RECEIPT_MAX_BYTES,
      message: "operator receipt must contain bounded raw bytes",
    }),
    operator_receipt_signature_bytes: snapshotOutlookDesktopBytes(
      input.operator_receipt_signature_bytes,
      {
        code: "OUTLOOK_ACTIVATION_OPERATOR_SIGNATURE_FORMAT",
        fail,
        maxBytes: 64,
        message: "operator receipt signature must contain exactly 64 raw Ed25519 bytes",
        minBytes: 64,
      },
    ),
    release_ticket_bytes: snapshotOutlookDesktopBytes(input.release_ticket_bytes, {
      code: "OUTLOOK_ACTIVATION_RELEASE_TICKET_BYTES_REQUIRED",
      fail,
      maxBytes: OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
      message: "release ticket must contain bounded raw bytes",
    }),
    release_ticket_signature_bytes: snapshotOutlookDesktopBytes(
      input.release_ticket_signature_bytes,
      {
        code: "OUTLOOK_ACTIVATION_RELEASE_TICKET_SIGNATURE_FORMAT",
        fail,
        maxBytes: 64,
        message: "release ticket signature must contain exactly 64 raw Ed25519 bytes",
        minBytes: 64,
      },
    ),
    activation_request: input.activation_request,
    issued_challenge: input.issued_challenge,
  };
  assertPrivacyTree(ownedInput);
  const challenge = validateIssuedChallenge(ownedInput.issued_challenge, now);
  const request = validateActivationRequest(ownedInput.activation_request, challenge);
  let registryTrust;
  try {
    registryTrust = registryResolver();
  } catch (error) {
    if (error instanceof OutlookDesktopActivationContractError) throw error;
    fail(
      "OUTLOOK_ACTIVATION_TRUST_REGISTRY_INVALID",
      "production trust registry verification failed",
      { cause: error?.code ?? "unknown" },
    );
  }
  validateActivationRegistryTrust(registryTrust, request.bindings.approved_release);
  const release = verifyActivationReleaseTicket({
    approvedRelease: request.bindings.approved_release,
    challengeExpiresAt: challenge.expiresAt,
    now,
    principal: request.bindings.authenticated_principal,
    registryTrust,
    signatureBytes: ownedInput.release_ticket_signature_bytes,
    ticketBytes: ownedInput.release_ticket_bytes,
  });
  const operator = verifyActivationOperatorReceipt({
    challenge,
    now,
    receiptBytes: ownedInput.operator_receipt_bytes,
    registryTrust,
    release,
    request,
    signatureBytes: ownedInput.operator_receipt_signature_bytes,
  });
  const replayMaterial = pureObject({
    activation_binding_sha256: challenge.activationBindingSha256,
    activation_id: challenge.challenge.activation_id,
    challenge_nonce_sha256: challenge.nonceSha256,
    device_key_fingerprint_sha256:
      request.bindings.candidate_device.continuity_key_fingerprint_sha256,
    entra_subject: request.bindings.authenticated_principal.entra_subject,
    lawos_tenant_id: request.bindings.authenticated_principal.lawos_tenant_id,
    lawos_user_id: request.bindings.authenticated_principal.lawos_user_id,
    local_measurement_evidence_sha256:
      request.bindings.local_measurement_evidence_sha256,
    operator_receipt_sha256: operator.receiptSha256,
    operator_receipt_signature_sha256: operator.signatureSha256,
    policy_revision: request.bindings.pilot_policy.policy_revision,
    release_ticket_sha256: release.ticketSha256,
    roster_sha256: request.bindings.pilot_policy.roster_sha256,
  });
  const singleUseConsumption = pureObject({
    activation_binding_sha256: challenge.activationBindingSha256,
    activation_id: challenge.challenge.activation_id,
    challenge_nonce_sha256: challenge.nonceSha256,
    replay_identity_sha256: sha256(canonicalBytes(replayMaterial)),
  });
  return deepFreeze(pureObject({
    activation_id: challenge.challenge.activation_id,
    activation_mode: OUTLOOK_DESKTOP_ACTIVATION_MODE,
    bindings: request.bindings,
    challenge: {
      activation_binding_sha256: challenge.activationBindingSha256,
      challenge_nonce_sha256: challenge.nonceSha256,
      expires_at: challenge.challenge.expires_at,
      issued_at: challenge.challenge.issued_at,
    },
    downstream_gates: {
      atomic_single_use_consumption: BLOCKED_DOWNSTREAM,
      current_release_authority: BLOCKED_DOWNSTREAM,
      server_challenge_provenance: BLOCKED_DOWNSTREAM,
    },
    operator: {
      expires_at: operator.receipt.expires_at,
      issued_at: operator.receipt.issued_at,
      key_id: operator.receipt.key_id,
      local_measurement_evidence_sha256:
        operator.receipt.local_measurement_evidence_sha256,
      operator_local_package_verified: true,
      production_ready_claim: false,
      receipt_sha256: operator.receiptSha256,
      receipt_signature_sha256: operator.signatureSha256,
      signer_role: operator.receipt.signer_role,
      signer_scope: operator.receipt.signer_scope,
    },
    production_ready: false,
    release: {
      key_id: release.ticket.key_id,
      release_ticket_id: release.ticket.ticket_id,
      release_ticket_sha256: release.ticketSha256,
      release_ticket_signature_sha256: release.signatureSha256,
      valid_until: release.ticket.expires_at,
    },
    single_use_consumption: singleUseConsumption,
    valid: true,
  }));
}

export function assertActivationReplayIdentity({
  stored_consumption: storedConsumption,
  verified_activation: verifiedActivation,
} = {}) {
  assertPrivacyTree(storedConsumption);
  assertExactKeys(
    storedConsumption,
    CONSUMPTION_KEYS,
    "OUTLOOK_ACTIVATION_REPLAY_IDENTITY_MISMATCH",
    "stored activation consumption identity",
  );
  const expected = verifiedActivation?.single_use_consumption;
  if (verifiedActivation?.valid !== true
      || !isRecord(expected)
      || !isDeepStrictEqual(storedConsumption, expected)) {
    fail(
      "OUTLOOK_ACTIVATION_REPLAY_IDENTITY_MISMATCH",
      "stored activation consumption does not match the verified one-time identity",
    );
  }
  return deepFreeze({
    activation_id: expected.activation_id,
    replay_identity_sha256: expected.replay_identity_sha256,
    valid: true,
  });
}
