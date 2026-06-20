import { createPayrollExportService } from "../../../../../packages/hrx/src/payroll-export-service.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

export function createHrxPayrollRoute({ audit, service = createPayrollExportService({ audit }) } = {}) {
  return Object.freeze({
    async handle(request = {}) {
      try {
        if (request.method !== "POST") return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
        const action = request.params?.action ?? request.body?.action ?? "preview";
        if (action === "approve") {
          const preview = await service.approve(request.context, {
            ...request.body,
            preview_id: request.params?.preview_id ?? request.body?.preview_id,
          });
          return response(200, { outcome: "approved", preview });
        }
        if (action === "export") {
          const artifact = await service.exportArtifact(request.context, {
            ...request.body,
            preview_id: request.params?.preview_id ?? request.body?.preview_id,
          });
          return response(200, { outcome: "exported", artifact });
        }
        const preview = await service.preview(request.context, request.body);
        return response(201, { outcome: "preview_created", preview });
      } catch (error) {
        return response(400, { outcome: "blocked", safe_error_code: "HRX_PAYROLL_BOUNDARY_ERROR", reason: error.message });
      }
    },
  });
}
