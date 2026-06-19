import {
  CORE_DOMAIN_ENTITY_DEFINITIONS,
  MATTER_TRACEABLE_ENTITY_TYPES,
  PRE_MATTER_ENTITY_TYPES,
  assertOwnerModule,
  getCoreDomainEntityDefinition,
} from "./ownership.js";

export function missingRequiredFields(entityType, record) {
  const definition = getCoreDomainEntityDefinition(entityType);
  return definition.required_fields.filter((field) => record?.[field] === undefined || record?.[field] === null || record?.[field] === "");
}

export function assertRequiredFieldsForEntity(entityType, record) {
  const missing = missingRequiredFields(entityType, record);
  if (missing.length > 0) throw new Error(`${entityType} missing required fields: ${missing.join(", ")}`);
  return true;
}

export function assertMatterTraceForEntity(entityType, record) {
  const definition = getCoreDomainEntityDefinition(entityType);
  if (definition.matter_trace_required && !record?.matter_id) {
    throw new Error(`${entityType} must be traceable to matter_id`);
  }
  return true;
}

export function assertPreMatterAllowed(entityType, record) {
  const definition = getCoreDomainEntityDefinition(entityType);
  if (!definition.pre_matter_allowed && !record?.matter_id && entityType !== "Matter") {
    throw new Error(`${entityType} cannot exist before Matter trace is established`);
  }
  return true;
}

export function validateCoreDomainRecord(entityType, record, options = {}) {
  const errors = [];
  const blocked_claims = [];
  try {
    assertRequiredFieldsForEntity(entityType, record);
  } catch (error) {
    errors.push(error.message);
    blocked_claims.push("missing_required_fields");
  }
  try {
    assertMatterTraceForEntity(entityType, record);
  } catch (error) {
    errors.push(error.message);
    blocked_claims.push("missing_matter_trace");
  }
  try {
    assertPreMatterAllowed(entityType, record);
  } catch (error) {
    errors.push(error.message);
    blocked_claims.push("prematter_misuse");
  }
  if (options.owner_module) {
    try {
      assertOwnerModule(entityType, options.owner_module);
    } catch (error) {
      errors.push(error.message);
      blocked_claims.push("owner_module_drift");
    }
  }
  return Object.freeze({
    valid: errors.length === 0,
    entity_type: entityType,
    checked: Object.freeze(["required_fields", "matter_trace", "prematter_exception", "owner_module"]),
    errors: Object.freeze(errors),
    warnings: Object.freeze([]),
    blocked_claims: Object.freeze(blocked_claims),
  });
}

export function validateCoreDomainRegistry(registry = CORE_DOMAIN_ENTITY_DEFINITIONS) {
  const errors = [];
  for (const [entityType, definition] of Object.entries(registry)) {
    if (!definition.primary_id) errors.push(`${entityType} missing primary_id`);
    if (!definition.owner_module) errors.push(`${entityType} missing owner_module`);
    if (!Array.isArray(definition.required_fields) || definition.required_fields.length === 0) {
      errors.push(`${entityType} missing required_fields`);
    }
  }
  return Object.freeze({
    valid: errors.length === 0,
    entity_count: Object.keys(registry).length,
    matter_traceable_entity_types: MATTER_TRACEABLE_ENTITY_TYPES,
    pre_matter_entity_types: PRE_MATTER_ENTITY_TYPES,
    errors: Object.freeze(errors),
  });
}
