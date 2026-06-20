import { randomUUID } from "node:crypto";
import { createPayrollExportPreview } from "./payroll-boundary.js";

export const HRX_PAYROLL_EXPORT_STATES = Object.freeze(["preview", "approved", "exported"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireContext(context = {}) {
  requiredString(context, "tenant_id");
  requiredString(context, "actor_id");
}

async function appendAudit(audit, context, event) {
  if (!audit || typeof audit.append !== "function") return undefined;
  return audit.append({
    event_id: event.event_id ?? `hrx_payroll_export_evt_${randomUUID()}`,
    tenant_id: context.tenant_id,
    actor_id: context.actor_id,
    action: event.action,
    object_type: event.object_type,
    object_id: event.object_id,
    decision: event.decision ?? "allow",
    reason: event.reason,
    metadata: Object.freeze({ ...(event.metadata ?? {}) }),
  });
}

function createPayrollExportWorkflowRecord(input = {}) {
  const preview = createPayrollExportPreview(input);
  const state = input.state ?? "preview";
  if (!HRX_PAYROLL_EXPORT_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_PAYROLL_EXPORT_STATES.join(", ")}`);
  if (state === "approved" && !input.approved_by) throw new TypeError("approved_by is required for approved payroll export");
  if (state === "exported" && !input.export_artifact_ref) throw new TypeError("export_artifact_ref is required for exported payroll export");
  return Object.freeze({
    ...preview,
    state,
    approved_by: input.approved_by ?? null,
    approved_at: input.approved_at ?? null,
    approval_ref: input.approval_ref ?? null,
    export_artifact_ref: input.export_artifact_ref ?? null,
    provider_payload_ref: input.provider_payload_ref ?? null,
    exported_at: input.exported_at ?? null,
  });
}

export function createInMemoryPayrollExportStore(seed = []) {
  const records = new Map();

  function write(record) {
    const current = createPayrollExportWorkflowRecord(record);
    if (!records.has(current.preview_id) && current.state !== "preview") {
      throw new Error(`Payroll export preview not found: ${current.preview_id}`);
    }
    records.set(current.preview_id, clone(current));
    return Object.freeze(clone(current));
  }

  for (const record of seed) write(record);

  return Object.freeze({
    create(input) {
      const record = createPayrollExportWorkflowRecord({ ...input, state: "preview" });
      if (records.has(record.preview_id)) throw new Error(`Duplicate payroll export preview: ${record.preview_id}`);
      records.set(record.preview_id, clone(record));
      return Object.freeze(clone(record));
    },
    get(previewId) {
      const record = records.get(previewId);
      return record ? Object.freeze(clone(record)) : undefined;
    },
    update(previewId, patch = {}) {
      const current = records.get(previewId);
      if (!current) throw new Error(`Payroll export preview not found: ${previewId}`);
      return write({ ...current, ...patch, preview_id: current.preview_id });
    },
    list() {
      return Object.freeze([...records.values()].map((record) => Object.freeze(clone(record))));
    },
  });
}

export function createPayrollExportArtifact(record = {}) {
  const current = createPayrollExportWorkflowRecord(record);
  if (current.state !== "exported") throw new TypeError("Payroll export must be exported before artifact creation");
  return Object.freeze({
    artifact_id: `payroll-export-artifact:${current.preview_id}`,
    preview_id: current.preview_id,
    tenant_id: current.tenant_id,
    payroll_period: current.payroll_period,
    employee_count: current.employee_ids.length,
    external_provider: current.external_provider,
    export_artifact_ref: current.export_artifact_ref,
    provider_payload_ref: current.provider_payload_ref,
    calculation_runtime: false,
    disbursement_instruction_included: false,
    human_review_required: true,
  });
}

export function createPayrollExportService({ store = createInMemoryPayrollExportStore(), audit } = {}) {
  return Object.freeze({
    async preview(context, input = {}) {
      requireContext(context);
      const record = store.create({ ...input, tenant_id: context.tenant_id });
      await appendAudit(audit, context, {
        action: "hrx.payroll.preview",
        object_type: "PayrollExportPreview",
        object_id: record.preview_id,
        reason: "payroll_export_preview_created",
        metadata: { payroll_period: record.payroll_period, employee_count: record.employee_ids.length },
      });
      return record;
    },

    async approve(context, ref = {}) {
      requireContext(context);
      const current = store.get(requiredString(ref, "preview_id"));
      if (!current) throw new Error(`Payroll export preview not found: ${ref.preview_id}`);
      if (current.state !== "preview") throw new TypeError("Payroll export must be in preview before approval");
      const record = store.update(current.preview_id, {
        state: "approved",
        approved_by: ref.approved_by ?? context.actor_id,
        approved_at: ref.approved_at ?? new Date().toISOString(),
        approval_ref: ref.approval_ref ?? null,
      });
      await appendAudit(audit, context, {
        action: "hrx.payroll.approve",
        object_type: "PayrollExportPreview",
        object_id: record.preview_id,
        reason: "payroll_export_preview_approved",
        metadata: { approval_ref: record.approval_ref },
      });
      return record;
    },

    async exportArtifact(context, ref = {}) {
      requireContext(context);
      const current = store.get(requiredString(ref, "preview_id"));
      if (!current) throw new Error(`Payroll export preview not found: ${ref.preview_id}`);
      if (current.state !== "approved") throw new TypeError("Payroll export must be approved before export");
      const record = store.update(current.preview_id, {
        state: "exported",
        export_artifact_ref: requiredString(ref, "export_artifact_ref"),
        provider_payload_ref: ref.provider_payload_ref ?? null,
        exported_at: ref.exported_at ?? new Date().toISOString(),
      });
      const artifact = createPayrollExportArtifact(record);
      await appendAudit(audit, context, {
        action: "hrx.payroll.export",
        object_type: "PayrollExportArtifact",
        object_id: artifact.artifact_id,
        reason: "payroll_export_artifact_created",
        metadata: {
          preview_id: record.preview_id,
          export_artifact_ref: artifact.export_artifact_ref,
          provider_payload_ref: artifact.provider_payload_ref,
        },
      });
      return artifact;
    },
  });
}
