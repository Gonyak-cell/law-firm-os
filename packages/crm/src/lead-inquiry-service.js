import { hashEventBody } from "../../audit/src/events.js";
import { appendCrmAuditEvent } from "./audit.js";
import {
  CRM_INQUIRY_STATUSES,
  CRM_INQUIRY_STATUS_TRANSITIONS,
  normalizeCrmLeadInquiryFields,
} from "./model.js";

export const CRM_LEAD_INQUIRY_ERROR_CODES = Object.freeze({
  idempotency_conflict: "CRM_INQUIRY_IDEMPOTENCY_CONFLICT",
  invalid_transition: "CRM_INQUIRY_TRANSITION_INVALID",
  not_found: "CRM_INQUIRY_NOT_FOUND",
  version_conflict: "CRM_INQUIRY_VERSION_CONFLICT",
});

function commandError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function requiredString(input, field, maxLength = 500) {
  const value = input?.[field];
  if (
    typeof value !== "string"
    || value.trim() === ""
    || value.trim().length > maxLength
  ) {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${field} must be a positive integer`);
  }
  return value;
}

function nextActionForStatus(value, inquiryStatus) {
  const normalized = value === undefined || value === null || value === ""
    ? null
    : requiredString({ next_action: value }, "next_action", 240);
  if (inquiryStatus === "closed") {
    if (normalized !== null) {
      throw new TypeError("Closed Lead cannot have next_action");
    }
    return null;
  }
  if (normalized === null) throw new TypeError("next_action is required for an open inquiry");
  return normalized;
}

function transitionFingerprint(input) {
  return hashEventBody({
    operation: "crm_lead_inquiry_transition_v1",
    tenant_id: input.tenant_id,
    lead_id: input.lead_id,
    next_inquiry_status: input.next_inquiry_status,
    expected_version: input.expected_version,
    next_action: input.next_action,
    reason: input.reason,
    actor_id: input.actor_id,
  });
}

function assertReplayMatches(replay, fingerprint) {
  if (
    replay.operation !== "crm_lead_inquiry_transition"
    || replay.request_fingerprint !== fingerprint
  ) {
    throw commandError(
      CRM_LEAD_INQUIRY_ERROR_CODES.idempotency_conflict,
      "Idempotency key is already bound to another CRM inquiry request",
    );
  }
}

function safeActionSnapshot(lead) {
  return Object.freeze({
    inquiry_status: lead.inquiry_status,
    version: lead.version,
    next_action_present: lead.next_action !== null,
    next_action_sha256: lead.next_action === null
      ? null
      : hashEventBody({ next_action: lead.next_action }),
  });
}

export function transitionLeadInquiryStatus({
  repository,
  tenant_id,
  lead_id,
  next_inquiry_status,
  expected_version,
  next_action,
  reason,
  actor_id,
  idempotency_key,
  clock = () => new Date(),
} = {}) {
  if (
    typeof repository?.transaction !== "function"
    || typeof repository?.getIdempotency !== "function"
  ) {
    throw new TypeError("CRM repository is required");
  }
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const leadId = requiredString({ lead_id }, "lead_id");
  const nextInquiryStatus = requiredString(
    { next_inquiry_status },
    "next_inquiry_status",
    32,
  );
  if (!CRM_INQUIRY_STATUSES.includes(nextInquiryStatus)) {
    throw new TypeError(`next_inquiry_status must be one of ${CRM_INQUIRY_STATUSES.join(", ")}`);
  }
  const expectedVersion = positiveInteger(expected_version, "expected_version");
  const normalizedNextAction = nextActionForStatus(next_action, nextInquiryStatus);
  const changeReason = requiredString({ reason }, "reason");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const fingerprint = transitionFingerprint({
    tenant_id: tenantId,
    lead_id: leadId,
    next_inquiry_status: nextInquiryStatus,
    expected_version: expectedVersion,
    next_action: normalizedNextAction,
    reason: changeReason,
    actor_id: actorId,
  });
  const replay = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (replay) {
    assertReplayMatches(replay, fingerprint);
    return Object.freeze({ ...replay.response, idempotent_replay: true });
  }

  return repository.transaction((tx) => {
    const current = tx.get({
      tenant_id: tenantId,
      model_type: "Lead",
      lead_id: leadId,
    });
    if (!current) {
      throw commandError(
        CRM_LEAD_INQUIRY_ERROR_CODES.not_found,
        "CRM inquiry was not found",
        404,
      );
    }
    const canonicalCurrent = Object.freeze({
      ...current,
      ...normalizeCrmLeadInquiryFields(current),
    });
    if (canonicalCurrent.version !== expectedVersion) {
      throw commandError(
        CRM_LEAD_INQUIRY_ERROR_CODES.version_conflict,
        "CRM inquiry version is stale",
      );
    }
    if (!CRM_INQUIRY_STATUS_TRANSITIONS[canonicalCurrent.inquiry_status]?.includes(nextInquiryStatus)) {
      throw commandError(
        CRM_LEAD_INQUIRY_ERROR_CODES.invalid_transition,
        `CRM inquiry transition ${canonicalCurrent.inquiry_status}->${nextInquiryStatus} is not allowed`,
      );
    }
    const occurredAtValue = clock();
    const occurredAt = occurredAtValue instanceof Date
      ? occurredAtValue.toISOString()
      : new Date(occurredAtValue).toISOString();
    const updated = tx.update(
      {
        tenant_id: tenantId,
        model_type: "Lead",
        lead_id: leadId,
      },
      {
        ...normalizeCrmLeadInquiryFields(canonicalCurrent),
        inquiry_status: nextInquiryStatus,
        next_action: normalizedNextAction,
        version: expectedVersion + 1,
        updated_by: actorId,
        updated_at: occurredAt,
        updates_database_rows: true,
      },
    );
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: canonicalCurrent.inquiry_status === "closed"
          ? "crm.inquiry.reopen"
          : "crm.inquiry.transition",
        object_type: "Lead",
        object_id: leadId,
        idempotency_key: idempotencyKey,
        reason: changeReason,
        occurred_at: occurredAt,
        metadata: {
          changed_fields: ["inquiry_status", "next_action", "version"],
          before: safeActionSnapshot(canonicalCurrent),
          after: safeActionSnapshot(updated),
          source_unchanged: canonicalCurrent.source === updated.source,
          received_at_unchanged: canonicalCurrent.received_at === updated.received_at,
          raw_next_action_included: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: canonicalCurrent.inquiry_status === "closed" ? "reopened" : "updated",
      lead: updated,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "crm_lead_inquiry_transition",
      request_fingerprint: fingerprint,
      response,
      created_at: occurredAt,
    });
    return response;
  });
}
