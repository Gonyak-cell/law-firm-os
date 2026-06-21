import {
  CANONICAL_OBJECT_DEFINITIONS,
  RUNTIME_CANONICAL_MODEL_SCHEMA_VERSION,
  getCanonicalObjectDefinition,
  requiredCanonicalObjectTypes
} from "./schema-registry.js";

const CLASSIFICATIONS = Object.freeze(["public", "internal", "confidential", "privileged", "restricted"]);

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function isMissing(value) {
  return value === undefined || value === null || value === "";
}

function validateRequiredFields(definition, input, errors) {
  for (const field of definition.required_fields ?? []) {
    if (isMissing(input?.[field])) errors.push(`${field} is required`);
  }
}

function validateOneOf(definition, input, errors) {
  for (const group of definition.one_of ?? []) {
    if (!group.some((field) => !isMissing(input?.[field]))) errors.push(`one of ${group.join(", ")} is required`);
  }
}

function validateBlockedFields(definition, input, errors) {
  for (const field of definition.blocked_fields ?? []) {
    if (Object.hasOwn(input ?? {}, field)) errors.push(`${field} is blocked for ${input.object_type ?? "canonical object"}`);
  }
}

function validateArrayFields(definition, input, errors) {
  for (const field of definition.array_fields ?? []) {
    if (!Array.isArray(input?.[field])) errors.push(`${field} must be an array`);
  }
}

function normalizeValue(objectType, definition, input) {
  const value = {
    schema_version: input.schema_version ?? RUNTIME_CANONICAL_MODEL_SCHEMA_VERSION,
    object_type: objectType,
    owner_module: definition.owner_module,
    tenant_scoped: definition.tenant_scoped !== false,
    synthetic_only: input.synthetic_only ?? true,
    writes_product_state: false,
    creates_database_rows: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    ...input,
    schema_version: input.schema_version ?? RUNTIME_CANONICAL_MODEL_SCHEMA_VERSION,
    object_type: objectType
  };
  for (const field of definition.array_fields ?? []) value[field] = Object.freeze([...(input[field] ?? [])]);
  return deepFreeze(value);
}

export function validateCanonicalRecord(objectType, input = {}) {
  const errors = [];
  const definition = getCanonicalObjectDefinition(objectType);
  if (!definition) errors.push(`unknown canonical object type ${objectType}`);
  if (!input || typeof input !== "object" || Array.isArray(input)) errors.push(`${objectType} must be a plain object`);
  if (errors.length > 0) return { ok: false, errors: Object.freeze(errors), value: undefined };

  if (input.object_type && input.object_type !== objectType) errors.push(`object_type must be ${objectType}`);
  if (input.schema_version && input.schema_version !== RUNTIME_CANONICAL_MODEL_SCHEMA_VERSION) {
    errors.push(`schema_version must be ${RUNTIME_CANONICAL_MODEL_SCHEMA_VERSION}`);
  }
  if (definition.tenant_scoped !== false && isMissing(input.tenant_id)) errors.push("tenant_id is required for tenant-scoped canonical objects");
  validateRequiredFields(definition, input, errors);
  validateOneOf(definition, input, errors);
  validateBlockedFields(definition, input, errors);
  validateArrayFields(definition, input, errors);

  if (objectType === "ClassificationEnvelope") {
    if (!CLASSIFICATIONS.includes(input.classification)) errors.push(`classification must be one of ${CLASSIFICATIONS.join(", ")}`);
    if (typeof input.privilege !== "boolean") errors.push("privilege must be boolean");
    if (typeof input.legal_hold !== "boolean") errors.push("legal_hold must be boolean");
  }

  return {
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    value: errors.length === 0 ? normalizeValue(objectType, definition, input) : undefined
  };
}

export function createCanonicalRecord(objectType, input = {}) {
  const validation = validateCanonicalRecord(objectType, input);
  if (!validation.ok) throw new TypeError(`Invalid ${objectType}: ${validation.errors.join("; ")}`);
  return validation.value;
}

export function validateCanonicalDataset(records = [], { require_all_object_types = true } = {}) {
  const errors = [];
  if (!Array.isArray(records)) errors.push("canonical dataset must be an array");
  const rows = Array.isArray(records) ? records : [];
  const objectTypes = new Set();
  const tenants = new Set();

  for (const [index, record] of rows.entries()) {
    const objectType = record?.object_type;
    const validation = validateCanonicalRecord(objectType, record);
    if (!validation.ok) errors.push(`records[${index}] ${objectType ?? "unknown"}: ${validation.errors.join("; ")}`);
    if (objectType) objectTypes.add(objectType);
    if (record?.tenant_id) tenants.add(record.tenant_id);
    if (record?.writes_product_state === true || record?.creates_database_rows === true) {
      errors.push(`records[${index}] ${objectType}: canonical fixtures must not claim runtime writes`);
    }
  }

  if (require_all_object_types) {
    for (const objectType of requiredCanonicalObjectTypes()) {
      if (!objectTypes.has(objectType)) errors.push(`${objectType}: missing from canonical dataset`);
    }
  }

  return deepFreeze({
    ok: errors.length === 0,
    errors,
    object_type_count: objectTypes.size,
    tenant_count: tenants.size,
    required_object_type_count: Object.keys(CANONICAL_OBJECT_DEFINITIONS).length
  });
}
