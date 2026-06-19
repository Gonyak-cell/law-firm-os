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
    ...event,
    tenant_id: context.tenant_id,
    actor_id: context.actor_id,
    source: "hrx-service",
  });
}

export function createHrxService({ repository, authz, audit: auditPort } = {}) {
  requirePort(repository, "repository", ["createEmployee", "getEmployee", "createEmploymentProfile"]);
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
        object_type: "Employee",
        object_id: ref?.employee_id ?? null,
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
        object_type: "EmploymentProfile",
        object_id: profile.profile_id,
      });
      return profile;
    },
  });
}
