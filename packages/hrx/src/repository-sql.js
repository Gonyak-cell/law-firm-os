import { createEmployee, createEmploymentProfile, createEmployeeUserLink } from "./schema.js";
import { createLoginMapping } from "./identity-link.js";
import { assertHrxStorePort } from "./store/port.js";

const EMPLOYEE_TABLE = "hrx_employees";
const PROFILE_TABLE = "hrx_employment_profiles";
const LINK_TABLE = "hrx_employee_user_links";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
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

function requireTenantQuery(query) {
  if (!query || typeof query.tenant_id !== "string" || query.tenant_id.trim() === "") {
    throw new TypeError("query tenant_id is required");
  }
}

function missing(entity, ref) {
  return new ReferenceError(`${entity} not found: ${JSON.stringify(ref)}`);
}

function rowWithTimestamps(row, now) {
  return {
    ...row,
    created_at: row.created_at ?? now,
    updated_at: row.updated_at ?? now,
  };
}

export function createSqlHrxRepository({ store, clock = () => new Date().toISOString() } = {}) {
  assertHrxStorePort(store);

  return Object.freeze({
    createEmployee(input) {
      const now = clock();
      const employee = rowWithTimestamps(createEmployee(input), now);
      return store.query("insert", { table: EMPLOYEE_TABLE, row: employee });
    },

    getEmployee(ref) {
      requireRef(ref, "employee_id");
      return clone(store.query("selectOne", { table: EMPLOYEE_TABLE, where: ref }));
    },

    listEmployees(query) {
      requireTenantQuery(query);
      return store
        .query("select", { table: EMPLOYEE_TABLE, where: { tenant_id: query.tenant_id } })
        .sort((left, right) => left.employee_id.localeCompare(right.employee_id))
        .map(clone);
    },

    updateEmployee(ref, patch) {
      requireRef(ref, "employee_id");
      const current = store.query("selectOne", { table: EMPLOYEE_TABLE, where: ref });
      if (!current) throw missing("Employee", ref);
      const next = createEmployee({
        ...current,
        ...patch,
        tenant_id: current.tenant_id,
        employee_id: current.employee_id,
      });
      return store.query("updateOne", {
        table: EMPLOYEE_TABLE,
        where: ref,
        patch: { ...next, updated_at: clock() },
      });
    },

    deleteEmployee(ref) {
      requireRef(ref, "employee_id");
      const profiles = store.query("select", {
        table: PROFILE_TABLE,
        where: { tenant_id: ref.tenant_id, employee_id: ref.employee_id },
      });
      if (profiles.length > 0) throw new Error("Employee cannot be deleted while EmploymentProfile rows exist");
      return store.query("deleteOne", { table: EMPLOYEE_TABLE, where: ref });
    },

    createEmploymentProfile(input) {
      const now = clock();
      const profile = rowWithTimestamps(createEmploymentProfile(input), now);
      const employee = store.query("selectOne", {
        table: EMPLOYEE_TABLE,
        where: { tenant_id: profile.tenant_id, employee_id: profile.employee_id },
      });
      if (!employee) throw new ReferenceError(`EmploymentProfile employee not found: ${profile.employee_id}`);
      return store.query("insert", { table: PROFILE_TABLE, row: profile });
    },

    getEmploymentProfile(ref) {
      requireRef(ref, "profile_id");
      return clone(store.query("selectOne", { table: PROFILE_TABLE, where: ref }));
    },

    listEmploymentProfiles(query) {
      requireTenantQuery(query);
      const where = { tenant_id: query.tenant_id };
      if (query.employee_id) where.employee_id = query.employee_id;
      return store
        .query("select", { table: PROFILE_TABLE, where })
        .sort((left, right) => left.profile_id.localeCompare(right.profile_id))
        .map(clone);
    },

    updateEmploymentProfile(ref, patch) {
      requireRef(ref, "profile_id");
      const current = store.query("selectOne", { table: PROFILE_TABLE, where: ref });
      if (!current) throw missing("EmploymentProfile", ref);
      const next = createEmploymentProfile({
        ...current,
        ...patch,
        tenant_id: current.tenant_id,
        profile_id: current.profile_id,
        employee_id: current.employee_id,
      });
      return store.query("updateOne", {
        table: PROFILE_TABLE,
        where: ref,
        patch: { ...next, updated_at: clock() },
      });
    },

    deleteEmploymentProfile(ref) {
      requireRef(ref, "profile_id");
      return store.query("deleteOne", { table: PROFILE_TABLE, where: ref });
    },

    createEmployeeUserLink(input) {
      const now = clock();
      const link = rowWithTimestamps(createLoginMapping(input), now);
      const employee = store.query("selectOne", {
        table: EMPLOYEE_TABLE,
        where: { tenant_id: link.tenant_id, employee_id: link.employee_id },
      });
      if (!employee) throw new ReferenceError(`EmployeeUserLink employee not found: ${link.employee_id}`);
      return store.query("insert", { table: LINK_TABLE, row: link });
    },

    getEmployeeUserLink(ref) {
      requireRef(ref, "link_id");
      return clone(store.query("selectOne", { table: LINK_TABLE, where: ref }));
    },

    listEmployeeUserLinks(query) {
      requireTenantQuery(query);
      const where = { tenant_id: query.tenant_id };
      if (query.employee_id) where.employee_id = query.employee_id;
      if (query.user_id) where.user_id = query.user_id;
      return store
        .query("select", { table: LINK_TABLE, where })
        .sort((left, right) => left.link_id.localeCompare(right.link_id))
        .map(clone);
    },

    revokeEmployeeUserLink(ref) {
      requireRef(ref, "link_id");
      return store.query("deleteOne", { table: LINK_TABLE, where: ref });
    },

    transaction(callback) {
      if (typeof callback !== "function") throw new TypeError("repository transaction callback is required");
      return store.transaction((transactionStore) => callback(createSqlHrxRepository({ store: transactionStore, clock })));
    },
  });
}

export { createEmployeeUserLink };
