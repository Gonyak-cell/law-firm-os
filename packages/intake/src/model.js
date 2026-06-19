export const INTAKE_CORE_LIFECYCLE_STATUSES = Object.freeze(["draft", "open", "review_required", "blocked", "cleared", "closed"]);

export const INTAKE_CORE_CONFLICT_CHECK_STATUSES = Object.freeze([
  "draft",
  "snapshot_recorded",
  "review_required",
  "cleared",
  "blocked",
]);

export const INTAKE_CORE_CONFLICT_HIT_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);

export const INTAKE_CORE_CONFLICT_HIT_SOURCES = Object.freeze([
  "party_master",
  "relationship_graph",
  "former_matter",
  "manual_entry",
  "external_conflict_source",
]);

export const INTAKE_CORE_MODEL_DEFINITIONS = Object.freeze({
  IntakeRequest: Object.freeze({
    model_type: "IntakeRequest",
    id_field: "intake_request_id",
    required_fields: Object.freeze([
      "intake_request_id",
      "tenant_id",
      "opportunity_id",
      "requesting_party_id",
      "party_ids",
      "status",
      "owner_user_id",
    ]),
    party_reference_fields: Object.freeze(["requesting_party_id", "party_ids"]),
    tuw_id: "LFOS-G3-W04-T001",
    prohibits_matter_creation: true,
  }),
  ConflictCheck: Object.freeze({
    model_type: "ConflictCheck",
    id_field: "conflict_check_id",
    required_fields: Object.freeze([
      "conflict_check_id",
      "tenant_id",
      "intake_request_id",
      "party_snapshot",
      "snapshot_recorded_at",
      "status",
      "owner_user_id",
    ]),
    party_reference_fields: Object.freeze(["party_snapshot.party_ids"]),
    tuw_id: "LFOS-G3-W04-T002",
    immutable_snapshot_required: true,
  }),
  ConflictHit: Object.freeze({
    model_type: "ConflictHit",
    id_field: "conflict_hit_id",
    required_fields: Object.freeze([
      "conflict_hit_id",
      "tenant_id",
      "conflict_check_id",
      "matched_party_id",
      "hit_source",
      "source_record_ref",
      "severity",
      "audit_hint_ref",
      "status",
      "owner_user_id",
    ]),
    party_reference_fields: Object.freeze(["matched_party_id"]),
    tuw_id: "LFOS-G3-W04-T003",
    hit_source_audit_required: true,
  }),
});

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function deepClone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function getIntakeCoreModelDefinition(modelType) {
  const definition = INTAKE_CORE_MODEL_DEFINITIONS[modelType];
  if (!definition) throw new Error(`Unknown Intake Core model type ${modelType}`);
  return definition;
}

function missingRequiredFields(modelType, input) {
  const definition = getIntakeCoreModelDefinition(modelType);
  return definition.required_fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function assertRequiredFields(modelType, input) {
  const missing = missingRequiredFields(modelType, input);
  if (missing.length > 0) throw new Error(`${modelType} missing required fields: ${missing.join(", ")}`);
}

function assertLifecycleStatus(modelType, status) {
  if (!INTAKE_CORE_LIFECYCLE_STATUSES.includes(status)) {
    throw new Error(`${modelType} status must be one of ${INTAKE_CORE_LIFECYCLE_STATUSES.join(", ")}`);
  }
}

function assertConflictCheckStatus(status) {
  if (!INTAKE_CORE_CONFLICT_CHECK_STATUSES.includes(status)) {
    throw new Error(`ConflictCheck status must be one of ${INTAKE_CORE_CONFLICT_CHECK_STATUSES.join(", ")}`);
  }
}

function assertConflictHitSeverity(severity) {
  if (!INTAKE_CORE_CONFLICT_HIT_SEVERITIES.includes(severity)) {
    throw new Error(`ConflictHit severity must be one of ${INTAKE_CORE_CONFLICT_HIT_SEVERITIES.join(", ")}`);
  }
}

function assertConflictHitSource(hitSource) {
  if (!INTAKE_CORE_CONFLICT_HIT_SOURCES.includes(hitSource)) {
    throw new Error(`ConflictHit hit_source must be one of ${INTAKE_CORE_CONFLICT_HIT_SOURCES.join(", ")}`);
  }
}

function assertNoMatterCreation(modelType, input) {
  if (
    input?.matter_id ||
    input?.matter_ref ||
    input?.matter_number ||
    input?.create_matter === true ||
    input?.matter_creation_requested === true
  ) {
    throw new Error(`${modelType} cannot create or reference Matter before Intake clearance`);
  }
}

function assertPartyIds(modelType, partyIds) {
  if (!Array.isArray(partyIds) || partyIds.length === 0) {
    throw new Error(`${modelType} party_ids must include at least one Party reference`);
  }
}

function baseIntakeRecord(modelType, input) {
  assertRequiredFields(modelType, input);
  assertNoMatterCreation(modelType, input);
  const definition = getIntakeCoreModelDefinition(modelType);
  return {
    model_type: modelType,
    tenant_id: input.tenant_id,
    status: input.status,
    owner_module: "intake",
    owner_user_id: input.owner_user_id,
    permission_ref: input.permission_ref ?? null,
    audit_hint_ref: input.audit_hint_ref ?? null,
    synthetic_only: input.synthetic_only ?? true,
    no_real_data: true,
    writes_product_state: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    dispatches_intake_runtime: false,
    executes_api_handler: false,
    creates_matter: false,
    g3_runtime_readiness_claim: "open",
    party_reference_fields: definition.party_reference_fields,
  };
}

export function createIntakeCoreIntakeRequest(input) {
  assertLifecycleStatus("IntakeRequest", input.status);
  assertPartyIds("IntakeRequest", input.party_ids);
  return freezeRecord({
    ...baseIntakeRecord("IntakeRequest", input),
    intake_request_id: input.intake_request_id,
    opportunity_id: input.opportunity_id,
    requesting_party_id: input.requesting_party_id,
    party_ids: freezeArray(input.party_ids),
    requested_scope_summary: input.requested_scope_summary ?? null,
    conflict_check_required: input.conflict_check_required ?? true,
    matter_id: null,
  });
}

export function createIntakeCoreConflictCheck(input) {
  assertConflictCheckStatus(input.status);
  assertPartyIds("ConflictCheck", input.party_snapshot?.party_ids);
  const immutableSnapshot = deepFreeze(deepClone(input.party_snapshot));
  return freezeRecord({
    ...baseIntakeRecord("ConflictCheck", input),
    conflict_check_id: input.conflict_check_id,
    intake_request_id: input.intake_request_id,
    party_snapshot: immutableSnapshot,
    snapshot_recorded_at: input.snapshot_recorded_at,
    snapshot_hash: input.snapshot_hash ?? `${input.tenant_id}:${input.conflict_check_id}:${input.snapshot_recorded_at}`,
    immutable_snapshot: true,
  });
}

export function createIntakeCoreConflictHit(input) {
  assertLifecycleStatus("ConflictHit", input.status);
  assertConflictHitSeverity(input.severity);
  assertConflictHitSource(input.hit_source);
  return freezeRecord({
    ...baseIntakeRecord("ConflictHit", input),
    conflict_hit_id: input.conflict_hit_id,
    conflict_check_id: input.conflict_check_id,
    matched_party_id: input.matched_party_id,
    hit_source: input.hit_source,
    source_record_ref: input.source_record_ref,
    severity: input.severity,
    audit_hint_ref: input.audit_hint_ref,
    hit_summary: input.hit_summary ?? null,
    raw_hit_payload_visible: false,
    hit_source_audit_required: true,
  });
}

const FACTORIES = Object.freeze({
  IntakeRequest: createIntakeCoreIntakeRequest,
  ConflictCheck: createIntakeCoreConflictCheck,
  ConflictHit: createIntakeCoreConflictHit,
});

export function createIntakeCoreRecord(modelType, input) {
  const factory = FACTORIES[modelType];
  if (!factory) throw new Error(`Unknown Intake Core model type ${modelType}`);
  return factory(input);
}

export function listIntakeCoreModelTypes() {
  return Object.freeze(Object.keys(INTAKE_CORE_MODEL_DEFINITIONS));
}

export function validateIntakeCoreRecord(modelType, record) {
  const errors = [];
  const review_required_claims = [];
  const blocked_claims = [];
  const definition = INTAKE_CORE_MODEL_DEFINITIONS[modelType];

  if (!definition) {
    errors.push(`unknown_model_type:${modelType}`);
  } else {
    for (const field of definition.required_fields) {
      if (record?.[field] === undefined || record?.[field] === null || record?.[field] === "") {
        errors.push(`missing_required_field:${field}`);
      }
    }
  }

  if (record?.matter_id || record?.matter_ref || record?.matter_number || record?.creates_matter !== false) {
    errors.push("matter_creation_before_clearance_prohibited");
    blocked_claims.push("intake_to_matter_clearance_required");
  }

  if (record?.writes_product_state !== false) errors.push("writes_product_state_must_be_false");
  if (record?.creates_database_rows !== false) errors.push("creates_database_rows_must_be_false");
  if (record?.updates_database_rows !== false) errors.push("updates_database_rows_must_be_false");
  if (record?.writes_audit_event !== false) errors.push("writes_audit_event_must_be_false");
  if (record?.dispatches_intake_runtime !== false) errors.push("dispatches_intake_runtime_must_be_false");
  if (record?.g3_runtime_readiness_claim !== "open") errors.push("g3_runtime_readiness_claim_must_remain_open");

  if (modelType === "IntakeRequest") {
    if (!Array.isArray(record?.party_ids) || record.party_ids.length === 0) errors.push("party_ids_required");
    if (record?.requesting_party_id && !record.party_ids?.includes(record.requesting_party_id)) {
      errors.push("requesting_party_must_be_in_party_ids");
    }
  }

  if (modelType === "ConflictCheck") {
    if (record?.immutable_snapshot !== true || !Object.isFrozen(record?.party_snapshot)) {
      errors.push("conflict_snapshot_must_be_immutable");
    }
    review_required_claims.push("conflict_snapshot_review_required");
  }

  if (modelType === "ConflictHit") {
    if (!INTAKE_CORE_CONFLICT_HIT_SOURCES.includes(record?.hit_source)) {
      errors.push(`invalid_hit_source:${record?.hit_source}`);
    }
    if (!record?.audit_hint_ref) {
      errors.push("hit_source_audit_hint_required");
    }
    review_required_claims.push("conflict_hit_source_audit_required");
  }

  return freezeRecord({
    valid: errors.length === 0,
    errors: freezeArray(errors),
    review_required_claims: freezeArray([...new Set(review_required_claims)]),
    blocked_claims: freezeArray([...new Set(blocked_claims)]),
  });
}
