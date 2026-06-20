import { createEmployee, createEmploymentProfile } from "./schema.js";

export const HRX_IN_MEMORY_REPOSITORY_SCOPE = "test_fixture_only";

function clone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : undefined;
}

function key(tenantId, id) {
  return `${tenantId}:${id}`;
}

function requireRef(ref, idField) {
  if (!ref || typeof ref !== "object") throw new TypeError("reference must be an object");
  if (typeof ref.tenant_id !== "string" || ref.tenant_id.trim() === "") {
    throw new TypeError("reference tenant_id is required");
  }
  if (typeof ref[idField] !== "string" || ref[idField].trim() === "") {
    throw new TypeError(`reference ${idField} is required`);
  }
}

function missing(entity, ref) {
  return new ReferenceError(`${entity} not found: ${JSON.stringify(ref)}`);
}

export function createInMemoryHrxRepository(seed = {}) {
  // This repository is retained for synthetic fixtures and focused unit tests.
  // Runtime durable persistence uses repository-sql.js through the HRX store port.
  const employees = new Map();
  const profiles = new Map();

  const repository = {
    createEmployee(input) {
      const employee = createEmployee(input);
      const employeeKey = key(employee.tenant_id, employee.employee_id);
      if (employees.has(employeeKey)) throw new Error(`Employee already exists: ${employee.employee_id}`);
      employees.set(employeeKey, clone(employee));
      return clone(employee);
    },

    getEmployee(ref) {
      requireRef(ref, "employee_id");
      return clone(employees.get(key(ref.tenant_id, ref.employee_id)));
    },

    listEmployees(query) {
      if (!query || typeof query.tenant_id !== "string" || query.tenant_id.trim() === "") {
        throw new TypeError("query tenant_id is required");
      }
      return [...employees.values()]
        .filter((employee) => employee.tenant_id === query.tenant_id)
        .map(clone);
    },

    updateEmployee(ref, patch) {
      requireRef(ref, "employee_id");
      const employeeKey = key(ref.tenant_id, ref.employee_id);
      const current = employees.get(employeeKey);
      if (!current) throw missing("Employee", ref);
      const next = createEmployee({
        ...current,
        ...patch,
        tenant_id: current.tenant_id,
        employee_id: current.employee_id,
      });
      employees.set(employeeKey, clone(next));
      return clone(next);
    },

    deleteEmployee(ref) {
      requireRef(ref, "employee_id");
      const employeeKey = key(ref.tenant_id, ref.employee_id);
      if (!employees.has(employeeKey)) return false;
      for (const profile of profiles.values()) {
        if (profile.tenant_id === ref.tenant_id && profile.employee_id === ref.employee_id) {
          throw new Error("Employee cannot be deleted while EmploymentProfile rows exist");
        }
      }
      return employees.delete(employeeKey);
    },

    createEmploymentProfile(input) {
      const profile = createEmploymentProfile(input);
      const employee = employees.get(key(profile.tenant_id, profile.employee_id));
      if (!employee) {
        throw new ReferenceError(`EmploymentProfile employee not found: ${profile.employee_id}`);
      }
      const profileKey = key(profile.tenant_id, profile.profile_id);
      if (profiles.has(profileKey)) throw new Error(`EmploymentProfile already exists: ${profile.profile_id}`);
      profiles.set(profileKey, clone(profile));
      return clone(profile);
    },

    getEmploymentProfile(ref) {
      requireRef(ref, "profile_id");
      return clone(profiles.get(key(ref.tenant_id, ref.profile_id)));
    },

    listEmploymentProfiles(query) {
      if (!query || typeof query.tenant_id !== "string" || query.tenant_id.trim() === "") {
        throw new TypeError("query tenant_id is required");
      }
      return [...profiles.values()]
        .filter((profile) => profile.tenant_id === query.tenant_id)
        .filter((profile) => !query.employee_id || profile.employee_id === query.employee_id)
        .map(clone);
    },

    updateEmploymentProfile(ref, patch) {
      requireRef(ref, "profile_id");
      const profileKey = key(ref.tenant_id, ref.profile_id);
      const current = profiles.get(profileKey);
      if (!current) throw missing("EmploymentProfile", ref);
      const next = createEmploymentProfile({
        ...current,
        ...patch,
        tenant_id: current.tenant_id,
        profile_id: current.profile_id,
        employee_id: current.employee_id,
      });
      profiles.set(profileKey, clone(next));
      return clone(next);
    },

    deleteEmploymentProfile(ref) {
      requireRef(ref, "profile_id");
      return profiles.delete(key(ref.tenant_id, ref.profile_id));
    },
  };

  for (const employee of seed.employees ?? []) repository.createEmployee(employee);
  for (const profile of seed.employment_profiles ?? []) repository.createEmploymentProfile(profile);
  return repository;
}
