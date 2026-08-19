import { createHash } from "node:crypto";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  assignmentExactKeys,
  assignmentIdentifier,
  normalizeAssignmentPrincipal,
  normalizeOutlookDesktopActivationAuthorizationReceipt,
  normalizeOutlookDesktopActivationAuthorizationRequest,
  normalizeOutlookDesktopActivationChallengeReceipt,
  normalizeOutlookDesktopActivationChallengeRequest,
  normalizeOutlookDesktopActivationEvidenceAttachmentResult,
  normalizeOutlookDesktopActivationEvidenceRequest,
  normalizeOutlookDesktopActivationIssueAuthorityLoadRequest,
  normalizeOutlookDesktopActivationIssueAuthorityLoadResult,
  normalizeOutlookDesktopActivationOperatorPacketEvidence,
  normalizeOutlookDesktopActivationProofSeed,
  normalizeOutlookDesktopActivationReservation,
} from "./outlook-desktop-assignment-contract.js";

export const OUTLOOK_DESKTOP_ACTIVATION_CONTROL_AUTHORITY_SCHEMA_VERSION =
  "lawos.outlook-desktop-activation-control-authority.v1";
export const OUTLOOK_DESKTOP_ACTIVATION_CONTROL_AUTHORITY_FUNCTIONS =
  Object.freeze({
    attachActivationEvidence: "attach_outlook_desktop_activation_evidence",
    authorizeActivation: "authorize_outlook_desktop_activation",
    issueActivationChallenge: "issue_outlook_desktop_activation_challenge",
    loadCurrentIssueAuthority:
      "load_current_outlook_desktop_activation_issue_authority",
    loadActivationReservation: "load_outlook_desktop_activation_reservation",
    readActivationProofSeed: "read_outlook_desktop_activation_proof_seed",
  });

const ACTIVATION_REFERENCE = /^oda_[A-Za-z0-9_-]{24}$/u;
const INSTANCES = new WeakSet();
const ERROR_BY_POSTGRES_CODE = new Map([
  ["LAC01", Object.freeze({
    code: "LAWOS_OUTLOOK_DESKTOP_ACTIVATION_REPLAY_CONFLICT",
    safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_REPLAY_CONFLICT",
    status: 409,
  })],
  ["LAC02", Object.freeze({
    code: "LAWOS_OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_MISMATCH",
    safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_MISMATCH",
    status: 403,
  })],
  ["LAC03", Object.freeze({
    code: "LAWOS_OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_EXPIRED",
    safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_EXPIRED",
    status: 409,
  })],
]);

function mapAuthorityError(error) {
  const mapped = ERROR_BY_POSTGRES_CODE.get(error?.postgres_code);
  if (!mapped) return error;
  return Object.assign(new Error(mapped.safe_error_code.toLowerCase()), mapped);
}

function activationReference(value) {
  if (typeof value !== "string" || !ACTIVATION_REFERENCE.test(value)) {
    throw new TypeError("activation_reference is invalid");
  }
  return value;
}

function mismatch() {
  throw Object.assign(new Error("outlook_desktop_activation_binding_mismatch"), {
    code: "LAWOS_OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_MISMATCH",
    safe_error_code: "OUTLOOK_DESKTOP_ACTIVATION_REFERENCE_MISMATCH",
    status: 403,
  });
}

function boundPrincipal(value, tenantId) {
  const principal = normalizeAssignmentPrincipal(value);
  if (principal.tenant_id !== tenantId) mismatch();
  return principal;
}

export function assertPostgresOutlookDesktopActivationControlAuthority(value) {
  if (!INSTANCES.has(value) || !Object.isFrozen(value)) {
    throw new TypeError("PostgreSQL Outlook activation control authority is required");
  }
  return value;
}

export function createPostgresOutlookDesktopActivationControlAuthority(
  options = {},
) {
  assignmentExactKeys(
    options,
    [
      "app_pool", "assert_operator_packet_evidence", "control_pool",
      "tenant_id",
    ],
    "activation authority options",
  );
  if (!options.app_pool?.connect) {
    throw new TypeError("PostgreSQL application pool is required");
  }
  if (!options.control_pool?.connect) {
    throw new TypeError("PostgreSQL control pool is required");
  }
  if (typeof options.assert_operator_packet_evidence !== "function") {
    throw new TypeError("Activation operator packet evidence assertor is required");
  }
  const tenantId = assignmentIdentifier(options.tenant_id, "tenant_id");
  const transact = (pool, readOnly, callback) => withPostgresTransaction(
    pool,
    { tenant_id: tenantId, isolationLevel: "serializable", readOnly },
    callback,
  );
  const invoke = async ({
    pool, readOnly = false, jsonPayload = true, name, values, normalize,
    normalizeAfterTransaction = false,
  }) => {
    try {
      const result = await transact(pool, readOnly, async (client) => {
        const value = (await client.query(
          `SELECT lawos_email_dms.${name}($1,$2${jsonPayload
            ? "::jsonb" : ""}) AS value`,
          values,
        )).rows[0]?.value;
        return normalizeAfterTransaction ? value : normalize(value);
      });
      return normalizeAfterTransaction ? normalize(result) : result;
    } catch (error) {
      throw mapAuthorityError(error);
    }
  };

  const issueActivationChallenge = (request = {}) => {
    const normalized = normalizeOutlookDesktopActivationChallengeRequest(request);
    if (normalized.issued_challenge.authenticated_principal.lawos_tenant_id !==
        tenantId) mismatch();
    return invoke({
      pool: options.control_pool,
      name: OUTLOOK_DESKTOP_ACTIVATION_CONTROL_AUTHORITY_FUNCTIONS
        .issueActivationChallenge,
      values: [tenantId, JSON.stringify(normalized)],
      normalize: normalizeOutlookDesktopActivationChallengeReceipt,
    });
  };
  const loadCurrentIssueAuthority = (request = {}) => {
    const normalized = normalizeOutlookDesktopActivationIssueAuthorityLoadRequest(
      request,
      { tenant_id: tenantId },
    );
    return invoke({
      pool: options.control_pool,
      readOnly: true,
      name: OUTLOOK_DESKTOP_ACTIVATION_CONTROL_AUTHORITY_FUNCTIONS
        .loadCurrentIssueAuthority,
      values: [tenantId, JSON.stringify(normalized)],
      normalize: normalizeOutlookDesktopActivationIssueAuthorityLoadResult,
      normalizeAfterTransaction: true,
    });
  };
  const attachActivationEvidence = async (input = {}) => {
    assignmentExactKeys(
      input,
      ["core_request", "operator_packet_evidence"],
      "activation evidence attachment input",
    );
    const request = normalizeOutlookDesktopActivationEvidenceRequest(
      input.core_request,
    );
    const asserted = options.assert_operator_packet_evidence(
      input.operator_packet_evidence,
    );
    const packet = normalizeOutlookDesktopActivationOperatorPacketEvidence(
      asserted,
    );
    const receiptSha = createHash("sha256")
      .update(packet.operator_receipt_bytes).digest("hex");
    const signatureSha = createHash("sha256")
      .update(packet.operator_receipt_signature_bytes).digest("hex");
    if (packet.authenticated_principal.lawos_tenant_id !== tenantId
        || packet.activation_reference !== request.activation_reference
        || packet.request_id !== request.request_id
        || packet.local_measurement_evidence_sha256 !==
          request.local_measurement_evidence_sha256
        || receiptSha !== request.operator_receipt_sha256
        || signatureSha !== request.operator_signature_sha256
        || packet.operator_receipt_bytes.toString("base64") !==
          request.operator_receipt_base64
        || packet.operator_receipt_signature_bytes.toString("base64") !==
          request.operator_signature_base64) {
      packet.operator_receipt_bytes.fill(0);
      packet.operator_receipt_signature_bytes.fill(0);
      mismatch();
    }
    const internalEvidence = Object.freeze({
      activation_reference: packet.activation_reference,
      authenticated_principal: packet.authenticated_principal,
      local_measurement_evidence_sha256:
        packet.local_measurement_evidence_sha256,
      operator_receipt_base64:
        packet.operator_receipt_bytes.toString("base64"),
      operator_receipt_signature_base64:
        packet.operator_receipt_signature_bytes.toString("base64"),
      owner_operator_packet_sha256: packet.owner_operator_packet_sha256,
      request_id: packet.request_id,
    });
    try {
      const result = await invoke({
        pool: options.control_pool,
        name: OUTLOOK_DESKTOP_ACTIVATION_CONTROL_AUTHORITY_FUNCTIONS
          .attachActivationEvidence,
        values: [tenantId, JSON.stringify(Object.freeze({
          core_request: request,
          operator_packet_evidence: internalEvidence,
        }))],
        normalize: normalizeOutlookDesktopActivationEvidenceAttachmentResult,
      });
      if (result.owner_operator_packet_sha256 !==
          packet.owner_operator_packet_sha256) mismatch();
      return result;
    } finally {
      packet.operator_receipt_bytes.fill(0);
      packet.operator_receipt_signature_bytes.fill(0);
    }
  };
  const authorizeActivation = (request = {}) => {
    const normalized = normalizeOutlookDesktopActivationAuthorizationRequest(request);
    return invoke({
      pool: options.control_pool,
      name: OUTLOOK_DESKTOP_ACTIVATION_CONTROL_AUTHORITY_FUNCTIONS
        .authorizeActivation,
      values: [tenantId, JSON.stringify(normalized)],
      normalize: normalizeOutlookDesktopActivationAuthorizationReceipt,
    });
  };
  const loadActivationReservation = (input = {}) => {
    assignmentExactKeys(
      input,
      ["activation_reference"],
      "activation reservation input",
    );
    const reference = activationReference(input.activation_reference);
    return invoke({
      pool: options.control_pool,
      readOnly: true,
      jsonPayload: false,
      name: OUTLOOK_DESKTOP_ACTIVATION_CONTROL_AUTHORITY_FUNCTIONS
        .loadActivationReservation,
      values: [tenantId, reference],
      normalize: normalizeOutlookDesktopActivationReservation,
    });
  };
  const readActivationProofSeed = (input = {}) => {
    assignmentExactKeys(
      input,
      ["activation_reference", "authenticated_principal"],
      "activation proof seed input",
    );
    const principal = boundPrincipal(input.authenticated_principal, tenantId);
    const request = Object.freeze({
      activation_reference: activationReference(input.activation_reference),
      entra_subject_id: principal.entra_subject_id,
      user_id: principal.user_id,
    });
    return invoke({
      pool: options.app_pool,
      readOnly: true,
      name: OUTLOOK_DESKTOP_ACTIVATION_CONTROL_AUTHORITY_FUNCTIONS
        .readActivationProofSeed,
      values: [tenantId, JSON.stringify(request)],
      normalize: normalizeOutlookDesktopActivationProofSeed,
    });
  };

  const authority = Object.freeze({
    authority: "postgres-outlook-desktop-activation-control-authority",
    schema_version: OUTLOOK_DESKTOP_ACTIVATION_CONTROL_AUTHORITY_SCHEMA_VERSION,
    attachActivationEvidence,
    authorizeActivation,
    issueActivationChallenge,
    loadCurrentIssueAuthority,
    loadActivationReservation,
    readActivationProofSeed,
  });
  INSTANCES.add(authority);
  return authority;
}
