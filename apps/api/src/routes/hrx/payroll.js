import { randomUUID } from "node:crypto";
import { createPayrollExportPreview } from "../../../../../packages/hrx/src/payroll-boundary.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

export function createHrxPayrollRoute({ audit } = {}) {
  return Object.freeze({
    async handle(request = {}) {
      try {
        if (request.method !== "POST") return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
        const preview = createPayrollExportPreview({ ...request.body, tenant_id: request.context?.tenant_id });
        await audit?.append?.({
          event_id: `hrx_payroll_evt_${randomUUID()}`,
          tenant_id: request.context.tenant_id,
          actor_id: request.context.actor_id,
          action: "hrx.payroll.preview",
          object_type: "PayrollExportPreview",
          object_id: preview.preview_id,
          decision: "allow",
          reason: "hrx_payroll_export_preview_created",
        });
        return response(201, { outcome: "preview_created", preview });
      } catch (error) {
        return response(400, { outcome: "blocked", safe_error_code: "HRX_PAYROLL_BOUNDARY_ERROR", reason: error.message });
      }
    },
  });
}
