import { createLeaveRequestService } from "../../../../../packages/hrx/src/leave/request-service.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

export function createHrxLeaveRoute({ service = createLeaveRequestService() } = {}) {
  return Object.freeze({
    async handle(request = {}) {
      try {
        if (request.method !== "POST") return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
        const action = request.params?.action ?? request.body?.action ?? "submit";
        if (action === "submit") {
          const leave_request = await service.submit(request.context, request.body);
          return response(201, { outcome: "submitted", leave_request });
        }
        if (action === "approve") {
          const leave_request = await service.approve(request.context, {
            ...request.body,
            request_id: request.params?.request_id ?? request.body?.request_id,
          });
          return response(200, { outcome: "approved", leave_request });
        }
        if (action === "reject") {
          const leave_request = await service.reject(request.context, {
            ...request.body,
            request_id: request.params?.request_id ?? request.body?.request_id,
          });
          return response(200, { outcome: "rejected", leave_request });
        }
        if (action === "cancel") {
          const leave_request = await service.cancel(request.context, {
            ...request.body,
            request_id: request.params?.request_id ?? request.body?.request_id,
          });
          return response(200, { outcome: "cancelled", leave_request });
        }
        return response(400, { outcome: "blocked", safe_error_code: "HRX_LEAVE_ROUTE_ERROR", reason: `Unsupported action: ${action}` });
      } catch (error) {
        return response(400, { outcome: "blocked", safe_error_code: "HRX_LEAVE_ROUTE_ERROR", reason: error.message });
      }
    },
  });
}
