import { appendIntakeAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function approveWaiver({ repository, waiver, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(waiver, "tenant_id");
  requiredString(waiver, "waiver_id");
  requiredString(waiver, "intake_request_id");
  requiredString(waiver, "conflict_check_id");
  requiredString(waiver, "consent_document_id");
  requiredString(waiver, "approver_id");
  const replay = repository.getIdempotency({ tenant_id: waiver.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const hitIds = Object.freeze(
      Array.isArray(waiver.conflict_hit_ids)
        ? waiver.conflict_hit_ids.filter((value) => typeof value === "string" && value.trim() !== "")
        : tx.list({ tenant_id: waiver.tenant_id, model_type: "ConflictHit", conflict_check_id: waiver.conflict_check_id })
          .map((hit) => hit.conflict_hit_id),
    );
    const record = tx.create({
      ...waiver,
      model_type: "Waiver",
      conflict_hit_ids: hitIds,
      status: "approved",
      approved_at: waiver.approved_at ?? new Date().toISOString(),
    });
    for (const conflict_hit_id of hitIds) {
      tx.update(
        { tenant_id: waiver.tenant_id, model_type: "ConflictHit", conflict_hit_id },
        {
          status: "cleared",
          waiver_id: record.waiver_id,
          waiver_approver_id: record.approver_id,
          updates_database_rows: true,
        },
      );
    }
    tx.update(
      { tenant_id: waiver.tenant_id, model_type: "ConflictCheck", conflict_check_id: waiver.conflict_check_id },
      {
        status: "cleared",
        waiver_id: record.waiver_id,
        waiver_approver_id: record.approver_id,
        waiver_approved_at: record.approved_at,
        updates_database_rows: true,
      },
    );
    const auditEvent = appendIntakeAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "waiver.approved",
        object_type: "Waiver",
        object_id: record.waiver_id,
        idempotency_key,
        metadata: {
          conflict_check_id: record.conflict_check_id,
          approved_hit_count: hitIds.length,
          consent_document_id: record.consent_document_id,
          clearance_link_ready: true,
        },
      },
    });
    const response = Object.freeze({
      outcome: "approved",
      waiver: record,
      audit_event: auditEvent,
      clearance_link_ready: true,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "waiver_approve", response });
    return response;
  });
}
