import {
  createObjectAclStore,
} from "../../../packages/authz/src/object-acl-store.js";

export const SESSION_OBJECT_ACL_DOMAIN_ID = "authz";
export const SESSION_OBJECT_ACL_RECORD_TYPE = "ObjectAcl";
export const FILE_SESSION_OBJECT_ACL_SOURCE_REF =
  "file-current:ObjectAcl";
export const POSTGRES_SESSION_OBJECT_ACL_SOURCE_REF =
  "postgres-v2:lawos_domain.authz/ObjectAcl";

const RUNTIME_ACL_FIELDS = Object.freeze([
  "effect",
  "principal_id",
  "action",
  "actions",
  "action_prefix",
  "action_prefixes",
  "action_suffix",
  "action_suffixes",
  "action_access",
  "resource_id",
  "resource_type",
  "client_group_id",
]);

function requiredText(value, field) {
  return strictCanonicalText(value, field, `${field} is required`);
}

function strictCanonicalText(value, field, message = `${field} is invalid`) {
  if (
    typeof value !== "string"
    || value === ""
    || value.trim() !== value
  ) {
    throw new TypeError(message);
  }
  return value;
}

const SCALAR_ACTION_FIELDS = Object.freeze([
  "action",
  "action_prefix",
  "action_suffix",
]);
const ARRAY_ACTION_FIELDS = Object.freeze([
  "actions",
  "action_prefixes",
  "action_suffixes",
]);

function assertCanonicalAclFields(record) {
  for (const field of SCALAR_ACTION_FIELDS) {
    if (record[field] != null) strictCanonicalText(record[field], `ObjectAcl.${field}`);
  }
  for (const field of ARRAY_ACTION_FIELDS) {
    if (record[field] == null) continue;
    if (!Array.isArray(record[field]) || record[field].length === 0) {
      throw new TypeError(`ObjectAcl.${field} is invalid`);
    }
    for (const value of record[field]) {
      strictCanonicalText(value, `ObjectAcl.${field}`);
    }
  }
  for (const field of ["resource_id", "client_group_id", "resource_type"]) {
    if (record[field] != null) strictCanonicalText(record[field], `ObjectAcl.${field}`);
  }
}

function runtimeObjectAcl(record, {
  tenantId,
  recordId,
} = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("ObjectAcl record is invalid");
  }
  const recordTenantId = requiredText(
    record.tenant_id ?? tenantId,
    "ObjectAcl.tenant_id",
  );
  if (recordTenantId !== tenantId) {
    throw new TypeError("ObjectAcl record tenant scope mismatch");
  }
  const acl = {
    id: requiredText(
      record.id
      ?? record.acl_id
      ?? record.record_id
      ?? recordId,
      "ObjectAcl.id",
    ),
    tenant_id: recordTenantId,
    principal_id: strictCanonicalText(
      record.principal_id,
      "ObjectAcl.principal_id",
    ),
  };
  assertCanonicalAclFields(record);
  for (const field of RUNTIME_ACL_FIELDS) {
    if (
      field !== "principal_id"
      && record[field] !== undefined
    ) {
      acl[field] = structuredClone(record[field]);
    }
  }
  return Object.freeze(acl);
}

function resolverWithSource(resolver, sourceRef) {
  Object.defineProperty(resolver, "source_ref", {
    value: sourceRef,
    enumerable: true,
  });
  return Object.freeze(resolver);
}

export function createFileSessionObjectAclResolver({
  storePath,
  createStore = createObjectAclStore,
} = {}) {
  const filePath = requiredText(storePath, "ObjectAcl storePath");
  if (typeof createStore !== "function") {
    throw new TypeError("ObjectAcl store factory is required");
  }
  return resolverWithSource(async ({ tenant_id, user_id } = {}) => {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const userId = strictCanonicalText(user_id, "user_id");
    const store = createStore({ filePath });
    const records = store.list({
      tenant_id: tenantId,
      record_type: SESSION_OBJECT_ACL_RECORD_TYPE,
    }).map((record) => (
      runtimeObjectAcl(record, {
        tenantId,
        recordId: record.record_id,
      })
    ));
    return Object.freeze({
      authoritative: true,
      source_ref: FILE_SESSION_OBJECT_ACL_SOURCE_REF,
      object_acl: Object.freeze(records.filter(
        (record) => record.principal_id === userId,
      )),
    });
  }, FILE_SESSION_OBJECT_ACL_SOURCE_REF);
}

export function createPostgresSessionObjectAclResolver({
  ledger,
} = {}) {
  if (typeof ledger?.list !== "function") {
    throw new TypeError("PostgreSQL domain ledger is required");
  }
  return resolverWithSource(async ({ tenant_id, user_id } = {}) => {
    const tenantId = requiredText(tenant_id, "tenant_id");
    const userId = strictCanonicalText(user_id, "user_id");
    const records = (await ledger.list({
      tenant_id: tenantId,
      domain_id: SESSION_OBJECT_ACL_DOMAIN_ID,
      record_type: SESSION_OBJECT_ACL_RECORD_TYPE,
    })).map((record) => (
      runtimeObjectAcl(record.payload, {
        tenantId,
        recordId: record.record_id,
      })
    ));
    return Object.freeze({
      authoritative: true,
      source_ref: POSTGRES_SESSION_OBJECT_ACL_SOURCE_REF,
      object_acl: Object.freeze(records.filter(
        (record) => record.principal_id === userId,
      )),
    });
  }, POSTGRES_SESSION_OBJECT_ACL_SOURCE_REF);
}
