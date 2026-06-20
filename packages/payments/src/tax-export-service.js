import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createTaxExport({ repository, tax_export, actor_id, idempotency_key } = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  requiredString(tax_export, "tenant_id");
  const refs = tax_export.tax_invoice_refs ?? [];
  if (!Array.isArray(refs) || refs.length === 0) throw new Error("tax export requires tax_invoice_refs");
  const replay = repository.getIdempotency({ tenant_id: tax_export.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  return repository.transaction((tx) => {
    const record = tx.create({
      ...tax_export,
      model_type: "TaxExport",
      status: "ready_for_review",
      credential_material_included: false,
      generated_at: tax_export.generated_at ?? new Date().toISOString(),
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id,
        action: "tax.export.create",
        object_type: "TaxExport",
        object_id: record.tax_export_id,
        idempotency_key,
      },
    });
    const response = Object.freeze({ outcome: "created", tax_export: record, audit_event: auditEvent, idempotent_replay: false });
    tx.recordIdempotency({ tenant_id: record.tenant_id, idempotency_key, operation: "tax_export_create", response });
    return response;
  });
}
