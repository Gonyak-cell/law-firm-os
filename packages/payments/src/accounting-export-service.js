import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createAccountingExport({ repository, accounting_export, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(accounting_export, "tenant_id");
  const refs = accounting_export.journal_entry_refs ?? [];
  if (!Array.isArray(refs) || refs.length === 0) throw new Error("accounting export requires journal_entry_refs");
  const replay = repository.getIdempotency({ tenant_id: accounting_export.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...accounting_export,
      model_type: "AccountingExport",
      status: "ready_for_review",
      credential_material_included: false,
      generated_at: accounting_export.generated_at ?? new Date().toISOString(),
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "accounting.export.create",
        object_type: "AccountingExport",
        object_id: record.accounting_export_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", accounting_export: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "accounting_export_create", response });
    return response;
  });
}
