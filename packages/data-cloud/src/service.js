import { createHash, randomUUID } from "node:crypto";

export const DATA_CLOUD_MODEL = Object.freeze({
  provider: "DataCloudProviderDescriptor",
  consent: "DataCloudConsentRecord",
  job: "DataCloudEnrichmentJob",
  result: "DataCloudEnrichmentResult",
  identity: "DataCloudIdentityResolution",
  profile: "DataCloudUnifiedProfile",
  segmentActivation: "DataCloudSegmentActivation",
});

const DEFAULT_PROVIDERS = Object.freeze([
  Object.freeze({
    provider_id: "provider_salesforce_data_cloud",
    label: "Salesforce Data Cloud",
    provider_kind: "salesforce_data_cloud",
    data_categories: Object.freeze(["firmographic", "relationship", "matter_context"]),
  }),
  Object.freeze({
    provider_id: "provider_fullcontact_enrichment",
    label: "FullContact enrichment",
    provider_kind: "third_party_enrichment",
    data_categories: Object.freeze(["firmographic", "contact_quality"]),
  }),
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function hashRef(value) {
  return createHash("sha256").update(String(value ?? "unknown")).digest("hex").slice(0, 12);
}

function assertTenant(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("tenant_id is required");
  return value.trim();
}

function assertActor(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("actor_id is required");
  return value.trim();
}

function assertId(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} is required`);
  return value.trim();
}

function assertCategories(value) {
  const categories = Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
  return categories.length > 0 ? categories.slice(0, 8) : ["firmographic"];
}

function recordRef(tenantId, modelType, resourceId) {
  return { tenant_id: tenantId, model_type: modelType, resource_id: resourceId };
}

function listRecords(repository, tenantId, modelType) {
  return repository.list({ tenant_id: tenantId, model_type: modelType });
}

function getRecord(repository, tenantId, modelType, resourceId) {
  return repository.get(recordRef(tenantId, modelType, resourceId));
}

function upsertRecord(repository, record) {
  return repository.upsert({ ...record, resource_id: record.resource_id ?? record.id });
}

function audit(repository, input = {}) {
  return repository.appendAudit({
    tenant_id: input.tenant_id,
    event_id: input.event_id ?? `data_cloud_audit_${randomUUID()}`,
    object_id: input.object_id ?? input.job_id ?? input.provider_id ?? input.profile_id ?? "data-cloud",
    actor_ref: `actor:${hashRef(input.actor_id)}`,
    action: input.action,
    permission_ref: input.permission_ref,
    audit_hint_ref: input.audit_hint_ref,
    metadata: {
      owner_decision_required: Boolean(input.owner_decision_required),
      provider_receipt_required: Boolean(input.provider_receipt_required),
      provider_payload_included: false,
      raw_identifiers_included: false,
      raw_contact_values_included: false,
      credentials_included: false,
      provider_tokens_included: false,
      product_record_mutation_allowed: false,
      production_ready_claim: false,
    },
    created_at: nowIso(),
  });
}

function seedTenant(repository, tenantId) {
  if (listRecords(repository, tenantId, DATA_CLOUD_MODEL.provider).length === 0) {
    for (const provider of DEFAULT_PROVIDERS) {
      upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: DATA_CLOUD_MODEL.provider,
        resource_id: provider.provider_id,
        provider_id: provider.provider_id,
        label: provider.label,
        provider_kind: provider.provider_kind,
        status: "disabled",
        ui_state: "provider_blocked",
        provider_configured: false,
        data_categories: [...provider.data_categories],
        owner_decision_ref: null,
        dpa_review_ref: null,
        retention_policy_ref: null,
        credential_material_ref_present: false,
        provider_call_performed: false,
        credentials_included: false,
        provider_tokens_included: false,
        provider_payload_included: false,
        production_ready_claim: false,
      });
    }
  }
  if (listRecords(repository, tenantId, DATA_CLOUD_MODEL.profile).length === 0) {
    upsertRecord(repository, {
      tenant_id: tenantId,
      model_type: DATA_CLOUD_MODEL.profile,
      resource_id: "unified_profile_client_seed",
      profile_id: "unified_profile_client_seed",
      label: "Client unified profile",
      linked_object_labels: ["Client", "Account", "Contact"],
      source_count: 3,
      confidence_band: "medium",
      consent_state: "owner_review_required",
      provenance_refs: ["crm_runtime", "matter_runtime"],
      provider_graph_included: false,
      direct_identifiers_included: false,
      raw_contact_values_included: false,
      production_ready_claim: false,
    });
  }
}

function safeAuditEvent(event = {}) {
  return Object.freeze({
    event_id: event.event_id,
    object_id: event.object_id,
    action: event.action,
    actor_ref_included: false,
    provider_payload_included: false,
    raw_identifiers_included: false,
    credentials_included: false,
    provider_tokens_included: false,
    production_ready_claim: false,
  });
}

function safeProvider(record = {}) {
  return Object.freeze({
    provider_id: record.provider_id,
    label: record.label,
    provider_kind: record.provider_kind,
    status: record.status,
    ui_state: record.ui_state ?? "provider_blocked",
    provider_configured: false,
    data_categories: Array.isArray(record.data_categories) ? [...record.data_categories] : [],
    owner_decision_required: true,
    dpa_review_required: true,
    retention_policy_required: true,
    credential_material_ref_present: false,
    provider_call_performed: false,
    credentials_included: false,
    provider_tokens_included: false,
    provider_payload_included: false,
    production_ready_claim: false,
  });
}

function safeConsent(record = {}) {
  return Object.freeze({
    consent_record_id: record.consent_record_id,
    subject_label: record.subject_label,
    data_categories: Array.isArray(record.data_categories) ? [...record.data_categories] : [],
    lawful_basis: record.lawful_basis,
    retention_policy_ref: record.retention_policy_ref,
    status: record.status,
    ui_state: record.ui_state ?? "owner_blocked",
    consent_applied: false,
    owner_decision_required: true,
    raw_consent_document_included: false,
    direct_identifiers_included: false,
    production_ready_claim: false,
  });
}

function safeJob(record = {}) {
  return Object.freeze({
    job_id: record.job_id,
    provider_id: record.provider_id,
    target_object: record.target_object,
    target_count: Array.isArray(record.target_refs) ? record.target_refs.length : 0,
    data_categories: Array.isArray(record.data_categories) ? [...record.data_categories] : [],
    status: record.status,
    ui_state: record.ui_state ?? "route_mounted",
    preview_ready: record.preview_ready === true,
    provider_call_performed: false,
    product_records_mutated: false,
    raw_identifiers_included: false,
    provider_payload_included: false,
    production_ready_claim: false,
  });
}

function safePreview(record = {}) {
  const categories = Array.isArray(record.data_categories) ? record.data_categories : ["firmographic"];
  return Object.freeze({
    job_id: record.job_id,
    provider_id: record.provider_id,
    target_object: record.target_object,
    target_count_bucket: record.target_count > 10 ? "10+" : String(record.target_count ?? 1),
    data_categories: [...categories],
    consent_coverage_state: "owner_review_required",
    missing_consent_categories: categories,
    match_strategy: "review_candidates_only",
    confidence_band: "medium",
    provider_call_performed: false,
    product_records_mutated: false,
    raw_identifiers_included: false,
    provider_payload_included: false,
    production_ready_claim: false,
  });
}

function safeResult(record = {}) {
  return Object.freeze({
    result_id: record.result_id,
    job_id: record.job_id,
    target_object: record.target_object,
    status: record.status,
    ui_state: record.ui_state ?? "provider_blocked",
    confidence_band: record.confidence_band ?? "medium",
    enriched_field_count: Number(record.enriched_field_count ?? 0),
    review_state: record.review_state ?? "provider_receipt_required",
    provenance_ref_count: Array.isArray(record.provenance_refs) ? record.provenance_refs.length : 0,
    provider_call_performed: false,
    provider_receipt_required: true,
    raw_provider_fields_included: false,
    raw_contact_values_included: false,
    direct_identifiers_included: false,
    production_ready_claim: false,
  });
}

function safeIdentity(record = {}) {
  return Object.freeze({
    identity_resolution_id: record.identity_resolution_id,
    status: record.status,
    ui_state: record.ui_state ?? "owner_blocked",
    candidate_count: Array.isArray(record.candidates) ? record.candidates.length : 0,
    candidates: (record.candidates ?? []).map((candidate) => Object.freeze({
      label: candidate.label,
      confidence_band: candidate.confidence_band,
      review_required: true,
      direct_identifiers_included: false,
    })),
    automatic_merge_performed: false,
    canonical_master_data_write_performed: false,
    direct_matter_creation_performed: false,
    production_ready_claim: false,
  });
}

function safeProfile(record = {}) {
  return Object.freeze({
    profile_id: record.profile_id,
    label: record.label,
    linked_object_labels: Array.isArray(record.linked_object_labels) ? [...record.linked_object_labels] : [],
    source_count: Number(record.source_count ?? 0),
    confidence_band: record.confidence_band ?? "medium",
    consent_state: record.consent_state ?? "owner_review_required",
    provenance_ref_count: Array.isArray(record.provenance_refs) ? record.provenance_refs.length : 0,
    provider_graph_included: false,
    direct_identifiers_included: false,
    raw_contact_values_included: false,
    production_ready_claim: false,
  });
}

function safeSegmentActivation(record = {}) {
  return Object.freeze({
    activation_id: record.activation_id,
    segment_label: record.segment_label,
    destination_label: record.destination_label,
    status: record.status,
    ui_state: record.ui_state ?? "provider_blocked",
    activation_submitted: false,
    provider_receipt_required: true,
    rollback_plan_required: true,
    audience_member_identifiers_included: false,
    provider_payload_included: false,
    production_ready_claim: false,
  });
}

function normalizeTargetRefs(value = []) {
  const refs = Array.isArray(value) && value.length > 0 ? value : [{ object_type: "Client", record_ref: "client-record" }];
  return refs.slice(0, 12).map((item, index) => Object.freeze({
    object_type: String(item?.object_type ?? "Client").slice(0, 80),
    record_ref_hash: hashRef(item?.record_ref ?? item?.id ?? `target-${index + 1}`),
    label: String(item?.label ?? `대상 ${index + 1}`).slice(0, 80),
  }));
}

export function createDataCloudEnrichmentService({ repository } = {}) {
  if (!repository) throw new TypeError("repository is required");

  return Object.freeze({
    listProviders({ tenant_id }) {
      const tenantId = assertTenant(tenant_id);
      seedTenant(repository, tenantId);
      return Object.freeze(listRecords(repository, tenantId, DATA_CLOUD_MODEL.provider).map(safeProvider));
    },

    registerProvider(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      seedTenant(repository, tenantId);
      const providerId = assertId(input.provider_id ?? `provider_${randomUUID()}`, "provider_id");
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: DATA_CLOUD_MODEL.provider,
        resource_id: providerId,
        provider_id: providerId,
        label: String(input.label ?? "Owner-reviewed enrichment provider").slice(0, 120),
        provider_kind: String(input.provider_kind ?? "third_party_enrichment").slice(0, 80),
        status: "disabled",
        ui_state: "provider_blocked",
        provider_configured: false,
        data_categories: assertCategories(input.data_categories),
        owner_decision_ref: null,
        dpa_review_ref: null,
        retention_policy_ref: null,
        credential_material_ref_present: false,
        provider_call_performed: false,
        credentials_included: false,
        provider_tokens_included: false,
        provider_payload_included: false,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "data_cloud.provider.register_provider_blocked",
        provider_id: providerId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        provider_receipt_required: true,
      });
      return Object.freeze({ provider: safeProvider(record), audit_event: safeAuditEvent(auditEvent) });
    },

    recordConsent(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      seedTenant(repository, tenantId);
      const consentId = assertId(input.consent_record_id ?? `data_cloud_consent_${randomUUID()}`, "consent_record_id");
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: DATA_CLOUD_MODEL.consent,
        resource_id: consentId,
        consent_record_id: consentId,
        subject_label: String(input.subject_label ?? "Client enrichment subject").slice(0, 120),
        data_categories: assertCategories(input.data_categories),
        lawful_basis: String(input.lawful_basis ?? "owner_review_required").slice(0, 80),
        retention_policy_ref: String(input.retention_policy_ref ?? "retention_owner_review").slice(0, 120),
        status: "owner_review_required",
        ui_state: "owner_blocked",
        consent_applied: false,
        owner_decision_required: true,
        raw_consent_document_included: false,
        direct_identifiers_included: false,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "data_cloud.consent.owner_blocked",
        object_id: consentId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        owner_decision_required: true,
      });
      return Object.freeze({ consent_record: safeConsent(record), audit_event: safeAuditEvent(auditEvent) });
    },

    createEnrichmentJob(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      seedTenant(repository, tenantId);
      const jobId = assertId(input.job_id ?? `data_cloud_job_${randomUUID()}`, "job_id");
      const targetRefs = normalizeTargetRefs(input.target_refs);
      const categories = assertCategories(input.data_categories);
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: DATA_CLOUD_MODEL.job,
        resource_id: jobId,
        job_id: jobId,
        provider_id: String(input.provider_id ?? "provider_salesforce_data_cloud").slice(0, 120),
        target_object: String(input.target_object ?? "Client").slice(0, 80),
        target_refs: targetRefs,
        target_count: targetRefs.length,
        data_categories: categories,
        status: "preview_ready",
        ui_state: "route_mounted",
        preview_ready: true,
        provider_call_performed: false,
        product_records_mutated: false,
        raw_identifiers_included: false,
        provider_payload_included: false,
        production_ready_claim: false,
        created_at: nowIso(),
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "data_cloud.enrichment_job.created",
        job_id: jobId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
      });
      return Object.freeze({ job: safeJob(record), audit_event: safeAuditEvent(auditEvent) });
    },

    previewEnrichmentJob(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const jobId = assertId(input.job_id, "job_id");
      seedTenant(repository, tenantId);
      const job = getRecord(repository, tenantId, DATA_CLOUD_MODEL.job, jobId);
      if (!job) throw new TypeError("enrichment job not found");
      return safePreview(job);
    },

    executeEnrichmentJob(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      const jobId = assertId(input.job_id, "job_id");
      seedTenant(repository, tenantId);
      const current = getRecord(repository, tenantId, DATA_CLOUD_MODEL.job, jobId);
      if (!current) throw new TypeError("enrichment job not found");
      const job = upsertRecord(repository, {
        ...current,
        status: "provider_receipt_required",
        ui_state: "provider_blocked",
        provider_call_performed: false,
        product_records_mutated: false,
        updated_at: nowIso(),
      });
      const resultId = `data_cloud_result_${jobId}`;
      const result = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: DATA_CLOUD_MODEL.result,
        resource_id: resultId,
        result_id: resultId,
        job_id: jobId,
        target_object: job.target_object,
        status: "provider_receipt_required",
        ui_state: "provider_blocked",
        confidence_band: "medium",
        enriched_field_count: 0,
        review_state: "provider_receipt_required",
        provenance_refs: [],
        provider_call_performed: false,
        provider_receipt_required: true,
        raw_provider_fields_included: false,
        raw_contact_values_included: false,
        direct_identifiers_included: false,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "data_cloud.enrichment_job.execute_provider_blocked",
        job_id: jobId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        provider_receipt_required: true,
      });
      return Object.freeze({ job: safeJob(job), result: safeResult(result), audit_event: safeAuditEvent(auditEvent) });
    },

    listEnrichmentResults({ tenant_id }) {
      const tenantId = assertTenant(tenant_id);
      seedTenant(repository, tenantId);
      return Object.freeze(listRecords(repository, tenantId, DATA_CLOUD_MODEL.result).map(safeResult));
    },

    runIdentityResolution(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      seedTenant(repository, tenantId);
      const identityId = assertId(input.identity_resolution_id ?? `identity_resolution_${randomUUID()}`, "identity_resolution_id");
      const candidates = [
        Object.freeze({ label: "Client 후보", confidence_band: "medium" }),
        Object.freeze({ label: "Account 후보", confidence_band: "low" }),
      ];
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: DATA_CLOUD_MODEL.identity,
        resource_id: identityId,
        identity_resolution_id: identityId,
        status: "owner_review_required",
        ui_state: "owner_blocked",
        candidates,
        automatic_merge_performed: false,
        canonical_master_data_write_performed: false,
        direct_matter_creation_performed: false,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "data_cloud.identity_resolution.owner_blocked",
        object_id: identityId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        owner_decision_required: true,
      });
      return Object.freeze({ identity_resolution: safeIdentity(record), audit_event: safeAuditEvent(auditEvent) });
    },

    getUnifiedProfile(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const profileId = assertId(input.profile_id, "profile_id");
      seedTenant(repository, tenantId);
      const profile = getRecord(repository, tenantId, DATA_CLOUD_MODEL.profile, profileId)
        ?? getRecord(repository, tenantId, DATA_CLOUD_MODEL.profile, "unified_profile_client_seed");
      return safeProfile(profile);
    },

    createSegmentActivation(input = {}) {
      const tenantId = assertTenant(input.tenant_id);
      const actorId = assertActor(input.actor_id);
      seedTenant(repository, tenantId);
      const activationId = assertId(input.activation_id ?? `segment_activation_${randomUUID()}`, "activation_id");
      const record = upsertRecord(repository, {
        tenant_id: tenantId,
        model_type: DATA_CLOUD_MODEL.segmentActivation,
        resource_id: activationId,
        activation_id: activationId,
        segment_label: String(input.segment_label ?? "Client review segment").slice(0, 120),
        destination_label: String(input.destination_label ?? "Provider destination").slice(0, 120),
        status: "provider_receipt_required",
        ui_state: "provider_blocked",
        activation_submitted: false,
        provider_receipt_required: true,
        rollback_plan_required: true,
        audience_member_identifiers_included: false,
        provider_payload_included: false,
        production_ready_claim: false,
      });
      const auditEvent = audit(repository, {
        tenant_id: tenantId,
        actor_id: actorId,
        action: "data_cloud.segment_activation.provider_blocked",
        object_id: activationId,
        permission_ref: input.permission_ref,
        audit_hint_ref: input.audit_hint_ref,
        provider_receipt_required: true,
      });
      return Object.freeze({ segment_activation: safeSegmentActivation(record), audit_event: safeAuditEvent(auditEvent) });
    },

    listAudit({ tenant_id }) {
      const tenantId = assertTenant(tenant_id);
      seedTenant(repository, tenantId);
      return Object.freeze(
        repository
          .listAudit({ tenant_id: tenantId })
          .filter((event) => String(event.action ?? "").startsWith("data_cloud."))
          .map(safeAuditEvent)
      );
    },
  });
}
