import {
  advanceExecutionRun,
  createExecutionRun,
  evaluateProviderReceipt
} from "./approvalProviderRunKernel.js";
import { assertNoForbiddenProjection, redactLcxFullValue } from "./readinessModel.js";

export const IMPORT_FIELD_ALLOWLISTS = Object.freeze({
  matter: Object.freeze(["matter_title", "matter_status", "matter_owner_ref", "client_ref", "opened_on"]),
  client: Object.freeze(["company_name", "account_status", "primary_contact_ref", "opportunity_name", "client_group"])
});

export function stageImportSource({ domain, sourceId, rows = [] } = {}) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row ?? {})))).sort();
  return Object.freeze({
    source_id: sourceId ?? `${domain ?? "import"}:source`,
    domain,
    row_count: rows.length,
    columns,
    raw_rows_included: false,
    source_structure_visible: true,
    safe_sample: rows.slice(0, 2).map((row) => redactLcxFullValue(row))
  });
}

export function validateImportMapping({ domain, mappings = [] } = {}) {
  const allowlist = IMPORT_FIELD_ALLOWLISTS[domain] ?? [];
  const mapped = mappings.map((mapping) => ({
    source_field: mapping.source_field,
    target_field: mapping.target_field,
    allowed: allowlist.includes(mapping.target_field)
  }));
  return Object.freeze({
    domain,
    valid: mapped.every((mapping) => mapping.allowed),
    mapped: Object.freeze(mapped),
    rejected_fields: Object.freeze(mapped.filter((mapping) => !mapping.allowed).map((mapping) => mapping.target_field))
  });
}

export function dryRunImport({ domain, source, mapping } = {}) {
  const valid = mapping?.valid === true && source?.raw_rows_included === false;
  return Object.freeze({
    domain,
    dry_run_state: valid ? "passed" : "blocked",
    target_mutation_count: 0,
    safe_sample: redactLcxFullValue(source?.safe_sample ?? []),
    raw_rows_included: false,
    errors: valid ? [] : ["mapping_or_source_blocked"]
  });
}

export function executeImportSynthetic({ domain, source, mapping, approval, registry = new Map() } = {}) {
  const run = createExecutionRun({
    execution_run_id: `${domain}:import-run`,
    idempotency_key_ref: `${domain}:import-idem`,
    safe_input: { source, mapping }
  });
  const dry = dryRunImport({ domain, source, mapping });
  if (dry.dry_run_state !== "passed") return Object.freeze({ ...run, run_state: "execute_blocked", blocked_reason: "dry_run_required" });
  return advanceExecutionRun(
    run,
    {
      step: "execute",
      approval,
      allow_synthetic_execute: true,
      production_provider_required: false
    },
    registry
  );
}

export function rollbackImport({ domain, safeErrorCode = "operator_requested_rollback" } = {}) {
  const run = createExecutionRun({ execution_run_id: `${domain}:rollback`, idempotency_key_ref: `${domain}:rollback-idem` });
  return advanceExecutionRun(run, { step: "rollback", safe_error_code: safeErrorCode });
}

export function createConsentCoverage({ basisRef, subjectRefs = [] } = {}) {
  return Object.freeze({
    consent_basis_ref: basisRef ?? "",
    subject_count: subjectRefs.length,
    consent_covered: Boolean(basisRef) && subjectRefs.length > 0,
    raw_contact_values_included: false
  });
}

export function createEnrichmentJob({ consent, providerReceipt, rollbackPlanRef = "" } = {}) {
  const provider = evaluateProviderReceipt({ receipt: providerReceipt, requiredScope: "enrich" });
  return Object.freeze({
    job_state: consent?.consent_covered ? "created" : "blocked",
    execute_state: provider.allowed ? "provider-ready" : "provider-blocked",
    provider_reason: provider.reason,
    provider_payload_included: false,
    raw_identifiers_included: false,
    rollback_plan_ref: rollbackPlanRef,
    audit_required: true
  });
}

export function createIdentityCandidates({ job } = {}) {
  return Object.freeze({
    candidate_state: job?.job_state === "created" ? "review_required" : "blocked",
    automatic_merge_performed: false,
    canonical_master_data_write_performed: false,
    raw_identifiers_included: false
  });
}

export function activateSegment({ job, rollbackPlanRef = "" } = {}) {
  return Object.freeze({
    activation_state: job?.execute_state === "provider-ready" && rollbackPlanRef ? "request_ready" : "provider_blocked",
    activation_submitted: false,
    rollback_plan_ref: rollbackPlanRef,
    audience_member_identifiers_included: false
  });
}

export function assertImportEnrichmentSafe(value) {
  return assertNoForbiddenProjection(redactLcxFullValue(value));
}
