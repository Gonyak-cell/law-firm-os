import assert from "node:assert/strict";
import test from "node:test";
import { createApprovalRequest, decideApprovalRequest } from "../src/data/approvalProviderRunKernel.js";
import {
  activateSegment,
  assertImportEnrichmentSafe,
  createConsentCoverage,
  createEnrichmentJob,
  createIdentityCandidates,
  dryRunImport,
  executeImportSynthetic,
  rollbackImport,
  stageImportSource,
  validateImportMapping
} from "../src/data/importEnrichmentKernel.js";

function ownerApproval(scope) {
  const request = createApprovalRequest({ actor_ref: "actor:import-test", object_ref: scope, reason_ref: "reason:import" });
  return decideApprovalRequest(request, {
    action: "approve",
    decided_by_ref: "owner:import-test",
    owner_receipt_ref: `owner-receipt:${scope}`
  });
}

test("LCX-FULL Matter import stages source hides raw rows and rejects disallowed fields", () => {
  const source = stageImportSource({
    domain: "matter",
    rows: [{ matter_title: "Alpha", storage_pointer: "s3://raw", forbidden_field: "no" }]
  });
  const invalid = validateImportMapping({
    domain: "matter",
    mappings: [{ source_field: "forbidden_field", target_field: "billing_account" }]
  });
  const valid = validateImportMapping({
    domain: "matter",
    mappings: [{ source_field: "matter_title", target_field: "matter_title" }]
  });
  assert.equal(source.raw_rows_included, false);
  assert.equal(assertImportEnrichmentSafe(source).valid, true);
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.rejected_fields, ["billing_account"]);
  assert.equal(dryRunImport({ domain: "matter", source, mapping: valid }).target_mutation_count, 0);
});

test("LCX-FULL Client import dry-run executes only as owner-approved synthetic run", () => {
  const source = stageImportSource({ domain: "client", rows: [{ company_name: "ACME", provider_url: "https://raw.example" }] });
  const mapping = validateImportMapping({ domain: "client", mappings: [{ source_field: "company_name", target_field: "company_name" }] });
  const blocked = executeImportSynthetic({ domain: "client", source, mapping });
  assert.equal(blocked.run_state, "execute_blocked");
  assert.equal(blocked.blocked_reason, "owner_approval_required");

  const registry = new Map();
  const executed = executeImportSynthetic({ domain: "client", source, mapping, approval: ownerApproval("client-import"), registry });
  assert.equal(executed.run_state, "executed");
  assert.equal(executed.external_mutation_performed, false);
  const duplicate = executeImportSynthetic({ domain: "client", source, mapping, approval: ownerApproval("client-import"), registry });
  assert.equal(duplicate.duplicate, true);
});

test("LCX-FULL import rollback report stays safe", () => {
  const rollback = rollbackImport({ domain: "matter", safeErrorCode: "mapping_rejected" });
  assert.equal(rollback.run_state, "rolled_back");
  assert.equal(rollback.rollback_report.safe_error_code, "mapping_rejected");
  assert.equal(assertImportEnrichmentSafe(rollback).valid, true);
});

test("LCX-FULL Client Data enrichment is consent and provider gated with review-only identity candidates", () => {
  const consent = createConsentCoverage({ basisRef: "consent:client-data", subjectRefs: ["client:1"] });
  const missingProviderJob = createEnrichmentJob({ consent });
  assert.equal(missingProviderJob.execute_state, "provider-blocked");
  const candidates = createIdentityCandidates({ job: missingProviderJob });
  assert.equal(candidates.candidate_state, "review_required");
  assert.equal(candidates.automatic_merge_performed, false);
  const blockedActivation = activateSegment({ job: missingProviderJob });
  assert.equal(blockedActivation.activation_state, "provider_blocked");

  const providerReadyJob = createEnrichmentJob({
    consent,
    providerReceipt: {
      environment: "production",
      production_receipt_ref: "prod:enrich",
      scopes: ["enrich"],
      expires_at: "2999-01-01T00:00:00.000Z"
    },
    rollbackPlanRef: "rollback:segment"
  });
  assert.equal(providerReadyJob.execute_state, "provider-ready");
  const activation = activateSegment({ job: providerReadyJob, rollbackPlanRef: "rollback:segment" });
  assert.equal(activation.activation_state, "request_ready");
  assert.equal(activation.activation_submitted, false);
});
