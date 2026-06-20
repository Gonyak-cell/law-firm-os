import { createHrxService } from "../../../../../packages/hrx/src/service.js";

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

function mapError(error) {
  if (error?.safe_error_code === "HRX_PERMISSION_DENIED") {
    return response(403, { outcome: "blocked", safe_error_code: "HRX_PERMISSION_DENIED", reason: error.message });
  }
  return response(400, { outcome: "blocked", safe_error_code: "HRX_EMPLOYEE_ROUTE_ERROR", reason: error.message });
}

export function createHrxEmployeesRoute({ repository, authz, audit }) {
  const service = createHrxService({ repository, authz, audit });
  return Object.freeze({
    async handle(request = {}) {
      try {
        if (request.method === "POST") {
          const employee = await service.createEmployee(request.context, request.body);
          return response(201, { outcome: "created", employee });
        }
        if (request.method === "GET") {
          const employee = await service.getEmployee(request.context, { employee_id: request.params?.employee_id });
          if (!employee) return response(404, { outcome: "not_found" });
          return response(200, { outcome: "ok", employee });
        }
        if (request.method === "PATCH") {
          const employee = await service.updateEmployee(request.context, { employee_id: request.params?.employee_id }, request.body);
          return response(200, { outcome: "updated", employee });
        }
        return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
      } catch (error) {
        return mapError(error);
      }
    },
  });
}

export function createHrxEmployeeUserLinksRoute({ repository, authz, audit }) {
  const service = createHrxService({ repository, authz, audit });
  return Object.freeze({
    async handle(request = {}) {
      try {
        if (request.method === "POST" && request.params?.link_id) {
          const revoked = await service.revokeEmployeeUserLink(request.context, { link_id: request.params.link_id });
          if (!revoked) return response(404, { outcome: "not_found", safe_error_code: "HRX_EMPLOYEE_USER_LINK_NOT_FOUND" });
          return response(200, { outcome: "revoked", revoked });
        }
        if (request.method === "POST") {
          const link = await service.createEmployeeUserLink(request.context, request.body);
          return response(201, { outcome: "created", link });
        }
        if (request.method === "GET") {
          const links = await service.listEmployeeUserLinks(request.context, request.query);
          return response(200, { outcome: "ok", links });
        }
        return response(405, { outcome: "blocked", safe_error_code: "METHOD_NOT_ALLOWED" });
      } catch (error) {
        return mapError(error);
      }
    },
  });
}
