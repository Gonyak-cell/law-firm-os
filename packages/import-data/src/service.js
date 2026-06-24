import { createHash, randomUUID } from "node:crypto";

export const CLIENT_MATTER_IMPORT_TARGETS = Object.freeze([
  Object.freeze({
    target_object: "crm_account_facade",
    label: "CRM Account",
    route_scope: "client",
    required_fields: Object.freeze(["display_name"]),
    fields: Object.freeze([
      Object.freeze({ field: "display_name", label: "Account name", input_type: "text", required: true }),
      Object.freeze({ field: "status", label: "Account status", input_type: "select", required: false, options: Object.freeze(["active", "review_required", "inactive"]) }),
      Object.freeze({ field: "account_number", label: "Account number", input_type: "text", required: false }),
    ]),
  }),
  Object.freeze({
    target_object: "crm_contact_facade",
    label: "CRM Contact",
    route_scope: "client",
    required_fields: Object.freeze(["display_name"]),
    fields: Object.freeze([
      Object.freeze({ field: "display_name", label: "Contact name", input_type: "text", required: true }),
      Object.freeze({ field: "status", label: "Contact status", input_type: "select", required: false, options: Object.freeze(["active", "review_required", "inactive"]) }),
      Object.freeze({ field: "account_id", label: "Account link", input_type: "reference", required: false }),
    ]),
  }),
  Object.freeze({
    target_object: "matter_runtime_patch",
    label: "Matter patch",
    route_scope: "matter",
    required_fields: Object.freeze(["title"]),
    fields: Object.freeze([
      Object.freeze({ field: "title", label: "Matter title", input_type: "text", required: true }),
      Object.freeze({ field: "wip_status", label: "WIP status", input_type: "select", required: false, options: Object.freeze(["not_started", "opening_wip_clear", "review_required", "completed"]) }),
      Object.freeze({ field: "risk_level", label: "Risk level", input_type: "select", required: false, options: Object.freeze(["standard", "elevated", "high"]) }),
    ]),
  }),
  Object.freeze({
    target_object: "finance_payment",
    label: "Finance payment",
    route_scope: "matter",
    required_fields: Object.freeze(["matter_id", "amount"]),
    fields: Object.freeze([
      Object.freeze({ field: "matter_id", label: "Matter", input_type: "reference", required: true }),
      Object.freeze({ field: "amount", label: "Amount", input_type: "number", required: true }),
      Object.freeze({ field: "currency", label: "Currency", input_type: "select", required: false, options: Object.freeze(["KRW", "USD"]) }),
      Object.freeze({ field: "payment_date", label: "Payment date", input_type: "date", required: false }),
    ]),
  }),
]);

const BLOCKED_TARGETS = Object.freeze([
  "canonical_master_data_person",
  "canonical_master_data_organization",
  "matter_opening",
  "dms_document_bytes",
]);

const IMPORT_MODEL = Object.freeze({
  job: "ClientMatterImportJob",
  source: "ClientMatterImportSource",
  mapping: "ClientMatterImportMapping",
  dryRun: "ClientMatterImportDryRun",
  execution: "ClientMatterImportExecutionReceipt",
  rollback: "ClientMatterImportRollbackReceipt",
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function hashValue(value) {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex").slice(0, 16);
}

function assertTenant(tenantId) {
  if (typeof tenantId !== "string" || tenantId.trim() === "") throw new TypeError("tenant_id is required");
  return tenantId.trim();
}

function assertActor(actorId) {
  if (typeof actorId !== "string" || actorId.trim() === "") throw new TypeError("actor_id is required");
  return actorId.trim();
}

function assertJobId(jobId) {
  if (typeof jobId !== "string" || jobId.trim() === "") throw new TypeError("import job id is required");
  return jobId.trim();
}

function targetConfig(targetObject) {
  return CLIENT_MATTER_IMPORT_TARGETS.find((target) => target.target_object === targetObject) ?? null;
}

function assertTargetObject(targetObject) {
  const normalized = String(targetObject ?? "").trim();
  if (BLOCKED_TARGETS.includes(normalized)) throw new TypeError("blocked import target");
  const config = targetConfig(normalized);
  if (!config) throw new TypeError("unsupported import target");
  return config;
}

function recordRef(tenantId, modelType, resourceId) {
  return { tenant_id: tenantId, model_type: modelType, resource_id: resourceId };
}

function getRecord(repository, tenantId, modelType, resourceId) {
  return repository?.get?.(recordRef(tenantId, modelType, resourceId));
}

function upsertRecord(repository, record) {
  if (!repository?.upsert) throw new TypeError("import repository is required");
  return repository.upsert(record);
}

function listRecords(repository, tenantId, modelType) {
  return repository?.list?.({ tenant_id: tenantId, model_type: modelType }) ?? [];
}

function audit(repository, input = {}) {
  if (!repository?.appendAudit) return null;
  return repository.appendAudit({
    event_id: input.event_id ?? `import_audit_${randomUUID()}`,
    tenant_id: input.tenant_id,
    actor_id: input.actor_id,
    action: input.action,
    object_type: "ClientMatterImportJob",
    object_id: input.job_id,
    reason: input.reason ?? "client_matter_import",
    occurred_at: input.occurred_at ?? nowIso(),
    metadata: {
      permission_ref: input.permission_ref ?? null,
      audit_hint_ref: input.audit_hint_ref ?? null,
      target_object: input.target_object ?? null,
      raw_file_bytes_included: false,
      raw_rows_included: false,
      raw_personal_identifiers_included: false,
      storage_pointer_included: false,
    },
  });
}

function safeAuditEvent(event = {}) {
  if (!event) return null;
  return Object.freeze({
    event_id: event.event_id,
    action: event.action,
    object_type: event.object_type,
    object_id: event.object_id,
    actor_ref_included: false,
    raw_values_included: false,
  });
}

function sourceResourceId(jobId) {
  return `import_source:${jobId}`;
}

function mappingResourceId(jobId) {
  return `import_mapping:${jobId}`;
}

function dryRunResourceId(jobId) {
  return `import_dry_run:${jobId}`;
}

function executionResourceId(jobId) {
  return `import_execution:${jobId}`;
}

function rollbackResourceId(jobId) {
  return `import_rollback:${jobId}`;
}

function safeTarget(target) {
  return Object.freeze({
    target_object: target.target_object,
    label: target.label,
    route_scope: target.route_scope,
    required_fields: [...target.required_fields],
    fields: target.fields.map((field) => Object.freeze({
      field: field.field,
      label: field.label,
      input_type: field.input_type,
      required: Boolean(field.required),
      options: field.options ? [...field.options] : undefined,
    })),
    raw_schema_mutation_allowed: false,
    direct_matter_creation_allowed: false,
    document_bytes_import_allowed: false,
  });
}

function safeJob(job = {}) {
  return Object.freeze({
    job_id: job.job_id,
    target_object: job.target_object,
    target_label: targetConfig(job.target_object)?.label ?? "Import target",
    source_type: job.source_type ?? "csv_manifest",
    status: job.status ?? "created",
    created_at: job.created_at,
    updated_at: job.updated_at,
    source_file_staged: Boolean(job.source_manifest_ref),
    mapping_saved: Boolean(job.mapping_ref),
    dry_run_status: job.dry_run_status ?? "not_started",
    execution_state: job.execution_state ?? "not_started",
    rollback_state: job.rollback_state ?? "not_started",
    safe_counts_only: true,
    raw_file_bytes_included: false,
    raw_rows_included: false,
    direct_personal_contact_identifier_included: false,
    storage_pointer_included: false,
    production_ready_claim: false,
  });
}

function normalizeColumns(columns = []) {
  const items = Array.isArray(columns) ? columns : [];
  const normalized = items
    .map((column, index) => ({
      source_field: String(column?.source_field ?? column?.field ?? column ?? "").trim(),
      label: String(column?.label ?? column?.source_field ?? column?.field ?? column ?? `Column ${index + 1}`).trim(),
      ordinal: Number.isFinite(Number(column?.ordinal)) ? Number(column.ordinal) : index + 1,
    }))
    .filter((column) => column.source_field);
  if (normalized.length === 0) throw new TypeError("source columns are required");
  return normalized.slice(0, 24).map((column) => Object.freeze(column));
}

function rowBucket(rowCount) {
  const count = Number(rowCount ?? 0);
  if (!Number.isFinite(count) || count <= 0) return "0";
  if (count <= 10) return "1-10";
  if (count <= 100) return "11-100";
  if (count <= 1000) return "101-1000";
  return "1000+";
}

function safeSource(source = {}) {
  return Object.freeze({
    job_id: source.job_id,
    source_id: source.source_id,
    file_name: source.file_name,
    mime_type: source.mime_type,
    row_count_bucket: rowBucket(source.row_count),
    column_count: source.columns?.length ?? 0,
    columns: (source.columns ?? []).map((column) => Object.freeze({
      source_field: column.source_field,
      label: column.label,
      ordinal: column.ordinal,
      sample_value_state: "redacted",
    })),
    source_profile_hash: source.source_profile_hash,
    source_manifest_ref: source.source_manifest_ref,
    raw_file_bytes_included: false,
    raw_rows_included: false,
    raw_personal_identifiers_included: false,
    storage_pointer_included: false,
  });
}

function safePreview({ job, source, mapping }) {
  const mappedTargetFields = new Set((mapping?.field_mappings ?? []).map((item) => item.target_field));
  const required = targetConfig(job.target_object)?.required_fields ?? [];
  const missingRequired = required.filter((field) => !mappedTargetFields.has(field));
  const sampleRows = Array.from({ length: Math.min(3, Math.max(1, Number(source?.row_count ?? 1))) }, (_, index) => Object.freeze({
    row_label: `Row ${index + 1}`,
    cells: (source?.columns ?? []).slice(0, 5).map((column) => Object.freeze({
      source_field: column.source_field,
      value_state: "redacted",
    })),
    raw_row_included: false,
  }));
  return Object.freeze({
    job_id: job.job_id,
    target_object: job.target_object,
    row_count_bucket: rowBucket(source?.row_count),
    sampled_row_count: sampleRows.length,
    sample_rows: sampleRows,
    validation_summary: Object.freeze({
      mapped_field_count: mappedTargetFields.size,
      missing_required_fields: missingRequired,
      issue_count: missingRequired.length,
      duplicate_policy: "review_required",
      count_leak_prevented: true,
    }),
    raw_rows_included: false,
    raw_personal_identifiers_included: false,
    storage_pointer_included: false,
  });
}

function normalizeMappings(config, source, fieldMappings = []) {
  const mappings = Array.isArray(fieldMappings) ? fieldMappings : [];
  const sourceFields = new Set((source?.columns ?? []).map((column) => column.source_field));
  const targetFields = new Set(config.fields.map((field) => field.field));
  const normalized = mappings.map((mapping) => {
    const sourceField = String(mapping?.source_field ?? "").trim();
    const targetField = String(mapping?.target_field ?? "").trim();
    if (!sourceFields.has(sourceField)) throw new TypeError(`unsupported source field ${sourceField}`);
    if (!targetFields.has(targetField)) throw new TypeError(`unsupported target field ${targetField}`);
    return Object.freeze({
      source_field: sourceField,
      target_field: targetField,
      transform: String(mapping?.transform ?? "copy").trim() || "copy",
      validation_state: "mapped",
      raw_value_included: false,
    });
  });
  if (normalized.length === 0) throw new TypeError("field mappings are required");
  return normalized;
}

function safeMapping(mapping = {}) {
  return Object.freeze({
    job_id: mapping.job_id,
    mapping_id: mapping.mapping_id,
    target_object: mapping.target_object,
    field_mappings: (mapping.field_mappings ?? []).map((item) => Object.freeze({
      source_field: item.source_field,
      target_field: item.target_field,
      transform: item.transform,
      validation_state: item.validation_state,
      raw_value_included: false,
    })),
    required_fields_satisfied: Boolean(mapping.required_fields_satisfied),
    blocked_target_rejected: true,
    raw_values_included: false,
  });
}

function safeDryRun(record = {}) {
  return Object.freeze({
    job_id: record.job_id,
    dry_run_id: record.dry_run_id,
    outcome: record.outcome,
    ui_state: record.ui_state,
    mutation_count: 0,
    planned_create_count: record.planned_create_count ?? 0,
    planned_update_count: record.planned_update_count ?? 0,
    warning_count: record.warning_count ?? 0,
    rollback_plan_ref: record.rollback_plan_ref,
    duplicate_policy: "review_required",
    raw_rows_included: false,
    raw_personal_identifiers_included: false,
    production_ready_claim: false,
  });
}

function safeExecution(record = {}) {
  return Object.freeze({
    job_id: record.job_id,
    execution_id: record.execution_id,
    outcome: record.outcome,
    ui_state: record.ui_state,
    owner_approval_required: true,
    target_records_mutated: false,
    created_count: 0,
    updated_count: 0,
    audit_event_ids: record.audit_event_ids ?? [],
    idempotent_replay: Boolean(record.idempotent_replay),
    raw_rows_included: false,
    raw_personal_identifiers_included: false,
    production_ready_claim: false,
  });
}

function safeRollback(record = {}) {
  return Object.freeze({
    job_id: record.job_id,
    rollback_id: record.rollback_id,
    outcome: record.outcome,
    ui_state: record.ui_state,
    rollback_state: record.rollback_state,
    target_records_reverted: 0,
    compensation_receipt_required: Boolean(record.compensation_receipt_required),
    raw_rows_included: false,
    raw_personal_identifiers_included: false,
    production_ready_claim: false,
  });
}

function getJob(repository, tenantId, jobId) {
  const job = getRecord(repository, tenantId, IMPORT_MODEL.job, jobId);
  if (!job) throw new TypeError("import job not found");
  return job;
}

function getSource(repository, tenantId, jobId) {
  return getRecord(repository, tenantId, IMPORT_MODEL.source, sourceResourceId(jobId));
}

function getMapping(repository, tenantId, jobId) {
  return getRecord(repository, tenantId, IMPORT_MODEL.mapping, mappingResourceId(jobId));
}

function getDryRun(repository, tenantId, jobId) {
  return getRecord(repository, tenantId, IMPORT_MODEL.dryRun, dryRunResourceId(jobId));
}

export function createClientMatterImportJobService({ repository } = {}) {
  if (!repository) throw new TypeError("repository is required");
  return Object.freeze({
    listJobs({ tenant_id }) {
      const tenantId = assertTenant(tenant_id);
      return Object.freeze(listRecords(repository, tenantId, IMPORT_MODEL.job).map(safeJob));
    },

    listTargets() {
      return Object.freeze({
        items: CLIENT_MATTER_IMPORT_TARGETS.map(safeTarget),
        blocked_targets: BLOCKED_TARGETS.map((target) => Object.freeze({ target_object: target, owner_decision_required: true })),
        raw_schema_mutation_allowed: false,
      });
    },

    createJob(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const config = assertTargetObject(input.target_object);
      const jobId = String(input.job_id ?? `import_job_${randomUUID()}`).trim();
      const createdAt = nowIso();
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: IMPORT_MODEL.job,
        resource_id: jobId,
        job_id: jobId,
        target_object: config.target_object,
        source_type: input.source_type ?? "csv_manifest",
        status: "created",
        created_at: createdAt,
        updated_at: createdAt,
        created_by_actor_ref: `actor:${hashValue(actorId)}`,
        raw_actor_id_included: false,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        job_id: jobId,
        action: "import.job.created",
        target_object: config.target_object,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
      });
      return Object.freeze({ job: safeJob(record), audit_event: safeAuditEvent(auditEvent) });
    },

    stageSourceFile(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const jobId = assertJobId(input.job_id);
      const job = getJob(repository, tenantId, jobId);
      const columns = normalizeColumns(input.source_file?.columns ?? input.columns);
      const rowCount = Math.max(0, Number(input.source_file?.row_count ?? input.row_count ?? 0));
      const sourceHash = hashValue({ columns, rowCount, target: job.target_object });
      const sourceId = sourceResourceId(jobId);
      const source = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: IMPORT_MODEL.source,
        resource_id: sourceId,
        source_id: sourceId,
        job_id: jobId,
        file_name: String(input.source_file?.file_name ?? input.file_name ?? "client-matter-import.csv").slice(0, 120),
        mime_type: String(input.source_file?.mime_type ?? input.mime_type ?? "text/csv").slice(0, 80),
        row_count: rowCount,
        columns,
        source_profile_hash: sourceHash,
        source_manifest_ref: `source_manifest:${jobId}:${sourceHash}`,
        raw_rows_hash: hashValue(input.source_file?.sample_rows ?? input.sample_rows ?? []),
        raw_file_bytes_included: false,
        raw_rows_included: false,
        storage_pointer_included: false,
      });
      upsertRecord(repository, {
        ...job,
        status: "source_staged",
        source_manifest_ref: source.source_manifest_ref,
        updated_at: nowIso(),
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        job_id: jobId,
        action: "import.source.staged",
        target_object: job.target_object,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
      });
      return Object.freeze({ source: safeSource(source), preview: safePreview({ job, source }), audit_event: safeAuditEvent(auditEvent) });
    },

    readPreview(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const jobId = assertJobId(input.job_id);
      const job = getJob(repository, tenantId, jobId);
      const source = getSource(repository, tenantId, jobId);
      if (!source) throw new TypeError("source file not staged");
      return safePreview({ job, source, mapping: getMapping(repository, tenantId, jobId) });
    },

    saveFieldMappings(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const jobId = assertJobId(input.job_id);
      const job = getJob(repository, tenantId, jobId);
      const config = assertTargetObject(job.target_object);
      const source = getSource(repository, tenantId, jobId);
      if (!source) throw new TypeError("source file not staged");
      const fieldMappings = normalizeMappings(config, source, input.field_mappings);
      const mappedFields = new Set(fieldMappings.map((mapping) => mapping.target_field));
      const missingRequired = config.required_fields.filter((field) => !mappedFields.has(field));
      const mapping = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: IMPORT_MODEL.mapping,
        resource_id: mappingResourceId(jobId),
        mapping_id: mappingResourceId(jobId),
        job_id: jobId,
        target_object: job.target_object,
        field_mappings: fieldMappings,
        required_fields_satisfied: missingRequired.length === 0,
        missing_required_fields: missingRequired,
        updated_at: nowIso(),
        raw_values_included: false,
      });
      upsertRecord(repository, {
        ...job,
        status: "mapping_saved",
        mapping_ref: mapping.mapping_id,
        updated_at: nowIso(),
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        job_id: jobId,
        action: "import.mapping.saved",
        target_object: job.target_object,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
      });
      return Object.freeze({ mapping: safeMapping(mapping), preview: safePreview({ job, source, mapping }), audit_event: safeAuditEvent(auditEvent) });
    },

    dryRun(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const jobId = assertJobId(input.job_id);
      const job = getJob(repository, tenantId, jobId);
      const source = getSource(repository, tenantId, jobId);
      const mapping = getMapping(repository, tenantId, jobId);
      if (!source || !mapping) throw new TypeError("source and mapping are required");
      const outcome = mapping.required_fields_satisfied ? "passed" : "blocked";
      const dryRun = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: IMPORT_MODEL.dryRun,
        resource_id: dryRunResourceId(jobId),
        dry_run_id: dryRunResourceId(jobId),
        job_id: jobId,
        outcome,
        ui_state: outcome === "passed" ? "ready_for_owner_approval" : "blocked",
        planned_create_count: outcome === "passed" ? Math.min(Number(source.row_count ?? 0), 25) : 0,
        planned_update_count: 0,
        warning_count: mapping.missing_required_fields?.length ?? 0,
        rollback_plan_ref: `rollback_plan:${jobId}:${hashValue(mapping.field_mappings)}`,
        raw_rows_included: false,
        raw_personal_identifiers_included: false,
        created_at: nowIso(),
      });
      upsertRecord(repository, {
        ...job,
        status: outcome === "passed" ? "dry_run_passed" : "dry_run_blocked",
        dry_run_status: outcome,
        updated_at: nowIso(),
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        job_id: jobId,
        action: "import.dry_run.completed",
        target_object: job.target_object,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
      });
      return Object.freeze({ dry_run: safeDryRun(dryRun), audit_event: safeAuditEvent(auditEvent) });
    },

    execute(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const jobId = assertJobId(input.job_id);
      const job = getJob(repository, tenantId, jobId);
      const dryRun = getDryRun(repository, tenantId, jobId);
      if (!dryRun || dryRun.outcome !== "passed") throw new TypeError("passed dry-run is required");
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        job_id: jobId,
        action: "import.execution.owner_blocked",
        target_object: job.target_object,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
      });
      const execution = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: IMPORT_MODEL.execution,
        resource_id: executionResourceId(jobId),
        execution_id: executionResourceId(jobId),
        job_id: jobId,
        outcome: "owner_blocked",
        ui_state: "owner_blocked",
        owner_approval_required: true,
        target_records_mutated: false,
        audit_event_ids: auditEvent?.event_id ? [auditEvent.event_id] : [],
        raw_rows_included: false,
        raw_personal_identifiers_included: false,
        created_at: nowIso(),
      });
      upsertRecord(repository, {
        ...job,
        status: "execution_owner_blocked",
        execution_state: "owner_blocked",
        updated_at: nowIso(),
      });
      return Object.freeze({ execution: safeExecution(execution), audit_event: safeAuditEvent(auditEvent) });
    },

    rollback(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const jobId = assertJobId(input.job_id);
      const job = getJob(repository, tenantId, jobId);
      const execution = getRecord(repository, tenantId, IMPORT_MODEL.execution, executionResourceId(jobId));
      const outcome = execution?.outcome === "executed" ? "owner_blocked" : "blocked";
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        job_id: jobId,
        action: "import.rollback.blocked",
        target_object: job.target_object,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
      });
      const rollback = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: IMPORT_MODEL.rollback,
        resource_id: rollbackResourceId(jobId),
        rollback_id: rollbackResourceId(jobId),
        job_id: jobId,
        outcome,
        ui_state: outcome === "owner_blocked" ? "owner_blocked" : "blocked",
        rollback_state: execution ? "execution_not_applied" : "execution_receipt_required",
        compensation_receipt_required: false,
        raw_rows_included: false,
        raw_personal_identifiers_included: false,
        created_at: nowIso(),
      });
      upsertRecord(repository, {
        ...job,
        status: "rollback_blocked",
        rollback_state: rollback.rollback_state,
        updated_at: nowIso(),
      });
      return Object.freeze({ rollback: safeRollback(rollback), audit_event: safeAuditEvent(auditEvent) });
    },

    errorReport(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const jobId = assertJobId(input.job_id);
      const job = getJob(repository, tenantId, jobId);
      const source = getSource(repository, tenantId, jobId);
      const mapping = getMapping(repository, tenantId, jobId);
      const preview = source ? safePreview({ job, source, mapping }) : null;
      const missing = preview?.validation_summary?.missing_required_fields ?? [];
      return Object.freeze({
        job_id: jobId,
        status: job.status,
        items: missing.length > 0
          ? missing.map((field, index) => Object.freeze({
              row_label: `Rule ${index + 1}`,
              issue_category: "missing_required_mapping",
              target_field: field,
              remediation_hint: "Map an allowlisted source field before dry-run.",
              raw_row_included: false,
              raw_personal_identifier_included: false,
            }))
          : [Object.freeze({
              row_label: "Validation summary",
              issue_category: "no_blocking_errors",
              target_field: null,
              remediation_hint: "Dry-run can be reviewed by an owner before execution.",
              raw_row_included: false,
              raw_personal_identifier_included: false,
            })],
        raw_rows_included: false,
        raw_personal_identifiers_included: false,
        storage_pointer_included: false,
      });
    },
  });
}
