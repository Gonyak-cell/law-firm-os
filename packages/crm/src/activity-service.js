import { hashEventBody } from "../../audit/src/events.js";
import { appendCrmAuditEvent } from "./audit.js";
import {
  normalizeCrmActivityFields,
  normalizeCrmLeadInquiryFields,
} from "./model.js";

export const CRM_CONSULTATION_ERROR_CODES = Object.freeze({
  active_consultation_exists: "CRM_CONSULTATION_ACTIVE_EXISTS",
  activity_not_found: "CRM_CONSULTATION_NOT_FOUND",
  idempotency_conflict: "CRM_CONSULTATION_IDEMPOTENCY_CONFLICT",
  inquiry_not_found: "CRM_INQUIRY_NOT_FOUND",
  inquiry_state_invalid: "CRM_CONSULTATION_INQUIRY_STATE_INVALID",
  inquiry_version_conflict: "CRM_INQUIRY_VERSION_CONFLICT",
  update_invalid: "CRM_CONSULTATION_UPDATE_INVALID",
  version_conflict: "CRM_CONSULTATION_VERSION_CONFLICT",
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

function occurredAt(clock) {
  const value = clock();
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function assertReplayMatches(replay, operation, fingerprint) {
  if (
    replay.operation !== operation
    || replay.request_fingerprint !== fingerprint
  ) {
    throw commandError(
      CRM_CONSULTATION_ERROR_CODES.idempotency_conflict,
      "Idempotency key is already bound to another consultation request",
    );
  }
}

function safeConsultationSnapshot(activity) {
  return Object.freeze({
    activity_kind: activity.activity_kind,
    scheduled_start: activity.scheduled_start,
    scheduled_end: activity.scheduled_end,
    timezone: activity.timezone,
    completed_at: activity.completed_at,
    version: activity.version,
    confidential: activity.confidential === true,
    subject_sha256: hashEventBody({ subject: activity.subject }),
    outcome_sha256: activity.outcome
      ? hashEventBody({ outcome: activity.outcome })
      : null,
    next_action_sha256: activity.next_action
      ? hashEventBody({ next_action: activity.next_action })
      : null,
    raw_consultation_content_included: false,
  });
}

function isOpenConsultation(activity, lead, opportunityIds) {
  const consultation =
    activity.activity_kind === "consultation"
    || activity.consultation === true
    || (
      activity.activity_type === "meeting"
      && Boolean(activity.scheduled_start ?? activity.scheduled_at)
    );
  return consultation
    && activity.completed_at == null
    && !["archived", "cancelled"].includes(activity.status)
    && (
      activity.lead_id === lead.lead_id
      || opportunityIds.has(activity.opportunity_id)
    );
}

function deterministicConsultationId({
  tenantId,
  leadId,
  idempotencyKey,
}) {
  return `consultation_${hashEventBody({
    tenant_id: tenantId,
    lead_id: leadId,
    idempotency_key: idempotencyKey,
  }).slice(0, 32)}`;
}

function scheduleFingerprint(input) {
  return hashEventBody({
    operation: "crm_consultation_schedule_v1",
    tenant_id: input.tenant_id,
    lead_id: input.lead_id,
    expected_inquiry_version: input.expected_inquiry_version,
    subject: input.subject,
    confidential: input.confidential,
    assigned_user_id: input.assigned_user_id,
    fields: input.fields,
    reason: input.reason,
    actor_id: input.actor_id,
  });
}

export function scheduleCrmConsultation({
  repository,
  tenant_id,
  lead_id,
  consultation = {},
  expected_inquiry_version,
  reason,
  actor_id,
  idempotency_key,
  permission_ref = null,
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
  const expectedInquiryVersion = positiveInteger(
    expected_inquiry_version,
    "expected_inquiry_version",
  );
  const subject = consultation.subject == null || consultation.subject === ""
    ? "의뢰인 상담"
    : requiredString(consultation, "subject", 160);
  const confidential = consultation.confidential === true;
  if (
    consultation.confidential !== undefined
    && typeof consultation.confidential !== "boolean"
  ) {
    throw new TypeError("consultation.confidential must be boolean");
  }
  if (confidential && !permission_ref) {
    throw new TypeError(
      "Confidential consultation requires permission_ref",
    );
  }
  const assignedUserId = consultation.assigned_user_id == null
    ? requiredString({ actor_id }, "actor_id")
    : requiredString(
        consultation,
        "assigned_user_id",
        240,
      );
  const changeReason = requiredString({ reason }, "reason");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString(
    { idempotency_key },
    "idempotency_key",
  );
  const fields = normalizeCrmActivityFields({
    activity_kind: "consultation",
    activity_type: "meeting",
    lead_id: leadId,
    scheduled_start: consultation.scheduled_start,
    scheduled_end: consultation.scheduled_end,
    timezone: consultation.timezone,
    completed_at: null,
    outcome: null,
    next_action: consultation.next_action ?? "상담 준비",
    version: 1,
  });
  const fingerprint = scheduleFingerprint({
    tenant_id: tenantId,
    lead_id: leadId,
    expected_inquiry_version: expectedInquiryVersion,
    subject,
    confidential,
    assigned_user_id: assignedUserId,
    fields,
    reason: changeReason,
    actor_id: actorId,
  });
  const replay = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (replay) {
    assertReplayMatches(
      replay,
      "crm_consultation_schedule",
      fingerprint,
    );
    return Object.freeze({ ...replay.response, idempotent_replay: true });
  }

  return repository.transaction((tx) => {
    const storedLead = tx.get({
      tenant_id: tenantId,
      model_type: "Lead",
      lead_id: leadId,
    });
    if (!storedLead) {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.inquiry_not_found,
        "CRM inquiry was not found",
        404,
      );
    }
    const lead = Object.freeze({
      ...storedLead,
      ...normalizeCrmLeadInquiryFields(storedLead),
    });
    if (lead.version !== expectedInquiryVersion) {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.inquiry_version_conflict,
        "CRM inquiry version is stale",
      );
    }
    if (lead.inquiry_status !== "reviewing") {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.inquiry_state_invalid,
        "Consultation can only be scheduled for an inquiry under review",
      );
    }
    const opportunityIds = new Set(
      tx.list({
        tenant_id: tenantId,
        model_type: "Opportunity",
      })
        .filter((opportunity) => (
          opportunity.lead_id === leadId
          || opportunity.opportunity_id === lead.opportunity_id
        ))
        .map(({ opportunity_id }) => opportunity_id),
    );
    if (opportunityIds.size > 0) {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.inquiry_state_invalid,
        "Consultation cannot be scheduled after engagement review starts",
      );
    }
    const activeConsultation = tx.list({
      tenant_id: tenantId,
      model_type: "CRMActivity",
    }).find((activity) => (
      isOpenConsultation(activity, lead, opportunityIds)
    ));
    if (activeConsultation) {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.active_consultation_exists,
        "Inquiry already has an incomplete consultation",
      );
    }
    const createdAt = occurredAt(clock);
    const activityId = deterministicConsultationId({
      tenantId,
      leadId,
      idempotencyKey,
    });
    const activity = tx.create({
      model_type: "CRMActivity",
      crm_activity_id: activityId,
      tenant_id: tenantId,
      party_id: lead.party_id,
      lead_id: leadId,
      opportunity_id: lead.opportunity_id ?? null,
      activity_type: "meeting",
      subject,
      confidential,
      status: "active",
      owner_user_id: assignedUserId,
      permission_ref,
      created_by: actorId,
      created_at: createdAt,
      ...fields,
    });
    const updatedLead = tx.update(
      {
        tenant_id: tenantId,
        model_type: "Lead",
        lead_id: leadId,
      },
      {
        ...normalizeCrmLeadInquiryFields(lead),
        next_action: "상담 준비",
        version: expectedInquiryVersion + 1,
        updated_by: actorId,
        updated_at: createdAt,
        updates_database_rows: true,
      },
    );
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "crm.consultation.scheduled",
        object_type: "CRMActivity",
        object_id: activityId,
        idempotency_key: idempotencyKey,
        reason: confidential
          ? "confidential_consultation_scheduled"
          : changeReason,
        occurred_at: createdAt,
        metadata: {
          lead_id: leadId,
          lead_version_before: expectedInquiryVersion,
          lead_version_after: updatedLead.version,
          change_reason_sha256: hashEventBody({
            reason: changeReason,
          }),
          consultation: safeConsultationSnapshot(activity),
          direct_matter_reference_included: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: "scheduled",
      activity,
      lead: updatedLead,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "crm_consultation_schedule",
      request_fingerprint: fingerprint,
      response,
      created_at: createdAt,
    });
    return response;
  });
}

const CONSULTATION_UPDATE_FIELDS = Object.freeze([
  "scheduled_start",
  "scheduled_end",
  "timezone",
  "completed_at",
  "outcome",
  "next_action",
  "subject",
  "confidential",
]);

function updateFingerprint(input) {
  return hashEventBody({
    operation: "crm_consultation_update_v1",
    tenant_id: input.tenant_id,
    activity_id: input.activity_id,
    expected_version: input.expected_version,
    field_updates: input.field_updates,
    reason: input.reason,
    actor_id: input.actor_id,
  });
}

function changedConsultationFields(current, candidate, requestedFields) {
  return requestedFields.filter((field) => (
    JSON.stringify(current[field] ?? null)
      !== JSON.stringify(candidate[field] ?? null)
  ));
}

export function updateCrmConsultation({
  repository,
  tenant_id,
  activity_id,
  expected_version,
  field_updates = {},
  reason,
  actor_id,
  idempotency_key,
  permission_ref = null,
  clock = () => new Date(),
} = {}) {
  if (
    typeof repository?.transaction !== "function"
    || typeof repository?.getIdempotency !== "function"
  ) {
    throw new TypeError("CRM repository is required");
  }
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const activityId = requiredString({ activity_id }, "activity_id");
  const expectedVersion = positiveInteger(
    expected_version,
    "expected_version",
  );
  if (
    !field_updates
    || typeof field_updates !== "object"
    || Array.isArray(field_updates)
  ) {
    throw new TypeError("field_updates must be an object");
  }
  const requestedFields = Object.keys(field_updates);
  if (
    requestedFields.length === 0
    || requestedFields.some(
      (field) => !CONSULTATION_UPDATE_FIELDS.includes(field),
    )
  ) {
    throw commandError(
      CRM_CONSULTATION_ERROR_CODES.update_invalid,
      "Consultation update fields are invalid",
      400,
    );
  }
  if (
    Object.hasOwn(field_updates, "confidential")
    && typeof field_updates.confidential !== "boolean"
  ) {
    throw new TypeError("field_updates.confidential must be boolean");
  }
  const changeReason = requiredString({ reason }, "reason");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString(
    { idempotency_key },
    "idempotency_key",
  );
  const fingerprint = updateFingerprint({
    tenant_id: tenantId,
    activity_id: activityId,
    expected_version: expectedVersion,
    field_updates,
    reason: changeReason,
    actor_id: actorId,
  });
  const replay = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (replay) {
    assertReplayMatches(
      replay,
      "crm_consultation_update",
      fingerprint,
    );
    return Object.freeze({ ...replay.response, idempotent_replay: true });
  }

  return repository.transaction((tx) => {
    const current = tx.get({
      tenant_id: tenantId,
      model_type: "CRMActivity",
      crm_activity_id: activityId,
    });
    if (!current || current.activity_kind !== "consultation") {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.activity_not_found,
        "CRM consultation was not found",
        404,
      );
    }
    if (current.version !== expectedVersion) {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.version_conflict,
        "CRM consultation version is stale",
      );
    }
    if (
      current.completed_at
      && requestedFields.some((field) => (
        ["scheduled_start", "scheduled_end", "timezone", "completed_at"]
          .includes(field)
      ))
    ) {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.update_invalid,
        "Completed consultation schedule is immutable",
      );
    }
    const completing =
      current.completed_at == null
      && field_updates.completed_at != null
      && field_updates.completed_at !== "";
    if (completing && !Object.hasOwn(field_updates, "next_action")) {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.update_invalid,
        "Completing a consultation requires next_action",
        400,
      );
    }
    const candidateFields = normalizeCrmActivityFields({
      ...current,
      ...field_updates,
      version: expectedVersion + 1,
    });
    const subject = Object.hasOwn(field_updates, "subject")
      ? requiredString(field_updates, "subject", 160)
      : current.subject;
    const candidate = {
      ...current,
      ...candidateFields,
      subject,
      confidential: Object.hasOwn(field_updates, "confidential")
        ? field_updates.confidential
        : current.confidential,
    };
    const effectivePermissionRef = current.permission_ref ?? permission_ref;
    if (
      candidate.confidential
      && (
        typeof effectivePermissionRef !== "string"
        || effectivePermissionRef.trim() === ""
      )
    ) {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.update_invalid,
        "Confidential consultation requires permission_ref",
        400,
      );
    }
    const changedFields = changedConsultationFields(
      current,
      candidate,
      requestedFields,
    );
    if (changedFields.length === 0) {
      throw commandError(
        CRM_CONSULTATION_ERROR_CODES.update_invalid,
        "Consultation update has no effect",
        400,
      );
    }
    const updatedAt = occurredAt(clock);
    const activity = tx.update(
      {
        tenant_id: tenantId,
        model_type: "CRMActivity",
        crm_activity_id: activityId,
      },
      {
        ...candidateFields,
        subject,
        confidential: candidate.confidential,
        permission_ref: effectivePermissionRef,
        version: expectedVersion + 1,
        updated_by: actorId,
        updated_at: updatedAt,
        updates_database_rows: true,
      },
    );
    let lead = null;
    const completedNow =
      current.completed_at == null && activity.completed_at != null;
    if (completedNow) {
      const storedLead = tx.get({
        tenant_id: tenantId,
        model_type: "Lead",
        lead_id: current.lead_id,
      });
      if (storedLead) {
        const canonicalLead = {
          ...storedLead,
          ...normalizeCrmLeadInquiryFields(storedLead),
        };
        if (
          canonicalLead.inquiry_status === "reviewing"
          && canonicalLead.next_action === "상담 준비"
        ) {
          lead = tx.update(
            {
              tenant_id: tenantId,
              model_type: "Lead",
              lead_id: canonicalLead.lead_id,
            },
            {
              ...normalizeCrmLeadInquiryFields(canonicalLead),
              next_action: activity.confidential
                ? "수임 여부 검토"
                : (
                    activity.next_action === "상담 준비"
                      ? "수임 여부 검토"
                      : activity.next_action ?? "수임 여부 검토"
                  ),
              version: canonicalLead.version + 1,
              updated_by: actorId,
              updated_at: updatedAt,
              updates_database_rows: true,
            },
          );
        }
      }
    }
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: tenantId,
        actor_id: actorId,
        action: completedNow
          ? "crm.consultation.completed"
          : "crm.consultation.updated",
        object_type: "CRMActivity",
        object_id: activityId,
        idempotency_key: idempotencyKey,
        reason: current.confidential || activity.confidential
          ? "confidential_consultation_changed"
          : changeReason,
        occurred_at: updatedAt,
        metadata: {
          changed_fields: changedFields,
          change_reason_sha256: hashEventBody({
            reason: changeReason,
          }),
          before: safeConsultationSnapshot(current),
          after: safeConsultationSnapshot(activity),
          linked_lead_updated: Boolean(lead),
          raw_consultation_content_included: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: completedNow ? "completed" : "updated",
      activity,
      lead,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "crm_consultation_update",
      request_fingerprint: fingerprint,
      response,
      created_at: updatedAt,
    });
    return response;
  });
}

export function createCrmActivity({ repository, activity, actor_id, idempotency_key, permission_ref } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(activity, "tenant_id");
  if (activity.confidential === true && !permission_ref && !activity.permission_ref) {
    throw new Error("Confidential CRMActivity requires permission_ref");
  }
  const replay = repository.getIdempotency({ tenant_id: activity.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const record = tx.create({
      ...activity,
      model_type: "CRMActivity",
      status: activity.status ?? "active",
      owner_user_id: activity.owner_user_id ?? actor_id,
      permission_ref: activity.permission_ref ?? permission_ref,
    });
    const auditEvent = appendCrmAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "crm.activity.create",
        object_type: "CRMActivity",
        object_id: record.crm_activity_id,
        idempotency_key,
        metadata: { confidential: record.confidential },
      },
    });
    const response = Object.freeze({ outcome: "created", activity: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "crm_activity_create", response });
    return response;
  });
}
