function requirePort(port, name, methods) {
  if (!port || typeof port !== "object") throw new TypeError(`HRX service requires ${name} port`);
  for (const method of methods) {
    if (typeof port[method] !== "function") throw new TypeError(`HRX ${name} port missing ${method}`);
  }
}

function requireContext(context) {
  if (!context || typeof context !== "object") throw new TypeError("HRX service context is required");
  if (typeof context.tenant_id !== "string" || context.tenant_id.trim() === "") {
    throw new TypeError("HRX service context tenant_id is required");
  }
  if (typeof context.actor_id !== "string" || context.actor_id.trim() === "") {
    throw new TypeError("HRX service context actor_id is required");
  }
}

async function authorize(authz, context, action, resource) {
  const decision = await authz.evaluate({
    tenant_id: context.tenant_id,
    actor_id: context.actor_id,
    actor_role: context.actor_role ?? null,
    action,
    resource,
  });
  if (decision?.effect !== "allow") {
    const error = new Error(decision?.reason ?? "HRX_PERMISSION_DENIED");
    error.decision = decision;
    error.safe_error_code = "HRX_PERMISSION_DENIED";
    throw error;
  }
  return decision;
}

async function audit(auditPort, context, event) {
  return auditPort.append({
    event_id: event.event_id ?? `hrx_svc_evt_${randomUUID()}`,
    ...event,
    tenant_id: context.tenant_id,
    actor_id: context.actor_id,
    action: event.action ?? event.event_type,
    object_type: event.object_type,
    object_id: event.object_id,
    decision: event.decision ?? "allow",
    reason: event.reason ?? "hrx_service_action",
    source: "hrx-service",
  });
}

export function createHrxService({ repository, authz, audit: auditPort } = {}) {
  requirePort(repository, "repository", ["createEmployee", "getEmployee", "updateEmployee", "createEmploymentProfile"]);
  requirePort(authz, "authz", ["evaluate"]);
  requirePort(auditPort, "audit", ["append"]);

  return Object.freeze({
    async createEmployee(context, input) {
      requireContext(context);
      await authorize(authz, context, "hrx.employee.create", {
        tenant_id: context.tenant_id,
        resource_type: "hrx.employee",
        resource_id: input?.employee_id ?? null,
      });
      const employee = repository.createEmployee({ ...input, tenant_id: context.tenant_id });
      await audit(auditPort, context, {
        event_type: "hrx.employee.created",
        action: "hrx.employee.create",
        object_type: "Employee",
        object_id: employee.employee_id,
      });
      return employee;
    },

    async getEmployee(context, ref) {
      requireContext(context);
      await authorize(authz, context, "hrx.employee.read", {
        tenant_id: context.tenant_id,
        resource_type: "hrx.employee",
        resource_id: ref?.employee_id ?? null,
      });
      const employee = repository.getEmployee({ ...ref, tenant_id: context.tenant_id });
      await audit(auditPort, context, {
        event_type: "hrx.employee.read",
        action: "hrx.employee.read",
        object_type: "Employee",
        object_id: ref?.employee_id ?? null,
      });
      return employee;
    },

    async updateEmployee(context, ref, patch) {
      requireContext(context);
      await authorize(authz, context, "hrx.employee.update", {
        tenant_id: context.tenant_id,
        resource_type: "hrx.employee",
        resource_id: ref?.employee_id ?? null,
      });
      const employee = repository.updateEmployee({ ...ref, tenant_id: context.tenant_id }, patch);
      await audit(auditPort, context, {
        event_type: "hrx.employee.updated",
        action: "hrx.employee.update",
        object_type: "Employee",
        object_id: employee.employee_id,
      });
      return employee;
    },

    async createEmploymentProfile(context, input) {
      requireContext(context);
      await authorize(authz, context, "hrx.employment_profile.create", {
        tenant_id: context.tenant_id,
        resource_type: "hrx.employment_profile",
        resource_id: input?.profile_id ?? null,
      });
      const profile = repository.createEmploymentProfile({ ...input, tenant_id: context.tenant_id });
      await audit(auditPort, context, {
        event_type: "hrx.employment_profile.created",
        action: "hrx.employment_profile.create",
        object_type: "EmploymentProfile",
        object_id: profile.profile_id,
      });
      return profile;
    },
  });
}
import { randomUUID } from "node:crypto";
