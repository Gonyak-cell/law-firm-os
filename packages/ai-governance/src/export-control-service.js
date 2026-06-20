import { appendAiAuditEvent } from "./audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createAiOutputExport({ repository, ai_output_export, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(ai_output_export, "tenant_id");
  requiredString(ai_output_export, "ai_output_id");
  if (ai_output_export.privilege_label_inherited !== true || ai_output_export.dms_acl_inherited !== true) {
    throw new Error("AI output export requires privilege and ACL inheritance");
  }
  if (ai_output_export.external_share_boundary_checked !== true) throw new Error("external share boundary check is required");
  const replay = repository.getIdempotency({ tenant_id: ai_output_export.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({ ...ai_output_export, model_type: "AiOutputExport", status: "ready_for_review", raw_output_included: false });
    const auditEvent = appendAiAuditEvent({ repository: tx, event: { tenant_id: record.tenant_id, actor_id, action: "ai.output.export", object_type: "AiOutputExport", object_id: record.ai_output_export_id, idempotency_key } });
    const response = Object.freeze({ outcome: "created", ai_output_export: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "ai_output_export", response });
    return response;
  });
}
