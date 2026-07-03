#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "packages/crm/src/runtime-repository.js",
  "packages/crm/src/lead-service.js",
  "packages/crm/src/opportunity-service.js",
  "packages/crm/src/activity-service.js",
  "packages/crm/src/proposal-service.js",
  "packages/crm/src/referral-service.js",
  "packages/crm/src/campaign-service.js",
  "packages/crm/src/intake-handoff-service.js",
  "packages/intake/src/runtime-repository.js",
  "packages/intake/src/intake-request-service.js",
  "packages/intake/src/conflict-check-service.js",
  "packages/intake/src/conflict-hit-service.js",
  "packages/intake/src/conflict-search-service.js",
  "packages/intake/src/conflict-decision-service.js",
  "packages/intake/src/waiver-service.js",
  "packages/intake/src/engagement-service.js",
  "packages/intake/src/fee-terms-service.js",
  "packages/intake/src/risk-approval-service.js",
  "packages/intake/src/clearance-token-service.js",
  "packages/intake/src/conflict-memo-acl.js",
  "packages/matter/src/opening-service.js",
  "apps/api/src/routes/crm.js",
  "apps/api/src/crm-intake-runtime-context.js",
  "apps/api/src/server.js",
  "apps/web/src/components/IntakeSurface.jsx",
  "scripts/validate-cmp-r4-g6.mjs",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g6-closeout.md",
];

const REQUIRED_TESTS = [
  "packages/intake/test/runtime-services.test.js",
  "apps/api/test/cmp-r4-g6-crm-intake.test.js",
  "apps/web/test/ui-regression.test.mjs",
];

const REQUIRED_EVIDENCE = Array.from({ length: 22 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g6-${String(index + 1).padStart(3, "0")}.md`,
);

const failures = [];

for (const file of [...REQUIRED_FILES, ...REQUIRED_TESTS, ...REQUIRED_EVIDENCE]) {
  if (!existsSync(path.join(ROOT, file))) failures.push(`missing:${file}`);
}

function requirePatterns(file, patterns) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) {
    if (!pattern.test(source)) failures.push(`missing marker:${file}:${pattern.source}`);
  }
}

function rejectPatterns(file, patterns) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  for (const pattern of patterns) {
    if (pattern.test(source)) failures.push(`forbidden marker:${file}:${pattern.source}`);
  }
}

requirePatterns("packages/crm/src/runtime-repository.js", [/filePath/, /recordIdempotency/, /appendAudit/, /transaction\(fn\)/]);
requirePatterns("packages/crm/src/opportunity-service.js", [/Opportunity cannot convert directly to Matter/, /transitionOpportunityStage/]);
requirePatterns("packages/crm/src/activity-service.js", [/Confidential CRMActivity requires permission_ref/]);
requirePatterns("packages/crm/src/campaign-service.js", [/opted-out contact/]);
requirePatterns("packages/crm/src/intake-handoff-service.js", [/handoffOpportunityToIntake/, /IntakeRequest/, /forbidden direct Matter reference/]);
requirePatterns("packages/intake/src/conflict-check-service.js", [/hashConflictSnapshot/, /snapshot_hash/, /conflict.check.create/]);
requirePatterns("packages/intake/src/conflict-hit-service.js", [/audit_hint_ref/, /conflict.hit.create/]);
requirePatterns("packages/intake/src/conflict-search-service.js", [
  /normalizeConflictName/,
  /scoreConflictNameMatch/,
  /caller_supplied_hit_count_ignored/,
  /conflict.search.executed/,
]);
requirePatterns("packages/intake/src/conflict-decision-service.js", [/reviewer_id/, /conflict.decision.record/]);
requirePatterns("packages/intake/src/conflict-decision-service.js", [/conflict_hit_ids/, /clearance_link_ready/]);
requirePatterns("packages/intake/src/waiver-service.js", [/consent_document_id/, /waiver.approved/, /clearance_link_ready/]);
requirePatterns("packages/intake/src/engagement-service.js", [/engagement_id/, /intake_request_id/, /signed_document_id/, /signature_ref/, /engagement.approved/]);
requirePatterns("packages/intake/src/fee-terms-service.js", [/billing_profile_id/, /rate_card_ref/]);
requirePatterns("packages/intake/src/risk-approval-service.js", [/risk.approved/, /approver_id/]);
requirePatterns("packages/intake/src/clearance-token-service.js", [/validateClearanceToken/, /expired/, /stale_snapshot/]);
requirePatterns("packages/intake/src/clearance-token-service.js", [/conflictReviewLedgerState/, /missing_clear_decision_or_waiver/]);
requirePatterns("packages/intake/src/clearance-token-service.js", [/engagementLedgerState/, /missing_approved_engagement/, /approved_engagement_recorded/]);
requirePatterns("packages/intake/src/conflict-memo-acl.js", [/body_included: false/, /count_leak_prevented: true/]);
requirePatterns("packages/matter/src/opening-service.js", [/ledgerClearanceToken/, /clearance_repository/, /Matter opening clearance token was not issued by Intake ledger/]);
requirePatterns("apps/api/src/crm-intake-runtime-context.js", [
  /CRM_INTAKE_BOUNDED_CONTEXT/,
  /runtime_write_ready: true/,
  /production_ready_claim: false/,
  /canReadContactValue/,
  /normalizeRawContactValue/,
  /raw_contact_value_stored/,
  /contact_point_value/,
  /handleOpportunityHandoff/,
  /executeConflictSearch/,
  /handleConflictDecisionRecord/,
  /handleWaiverApprove/,
  /handleEngagementApprove/,
  /conflict_hits/,
  /conflict_review/,
  /engagement_ready/,
  /engagement_review/,
  /clearanceTokenPayload/,
  /direct_matter_reference_included: false/,
]);
requirePatterns("apps/api/src/server.js", [/clearanceRepository: crmIntakeRuntime\.intakeRepository/]);
requirePatterns("apps/api/src/routes/crm.js", [/CRM_INTAKE_ROUTE_POLICIES/, /handoff/, /conflict-decisions/, /waivers/, /engagements/, /clearance-tokens/]);
requirePatterns("apps/web/src/components/IntakeSurface.jsx", [
  /data-cmp-g6-intake-surface="true"/,
  /fetchCrmOpportunities/,
  /fetchIntakeRequests/,
  /Matter 생성 보류/,
]);
requirePatterns("apps/api/test/cmp-r4-g6-crm-intake.test.js", [/persists Intake across restart/, /blocks direct Matter/, /clearance token/, /caller_supplied_hit_count_ignored/, /api-conflict-decision-1/, /api-waiver-1/, /api-engagement-unsigned/, /api-clearance-token-no-engagement/, /api-engagement-1/, /api-matter-open-c04-missing/, /engagement:forged-by-client/]);
requirePatterns("apps/api/test/cmp-r4-g6-crm-intake.test.js", [/CONTACT_VALUE_QUERY/, /api-contact-create-raw-email-stored-1/, /patched@example\.invalid/]);
requirePatterns("packages/intake/test/runtime-services.test.js", [/handoffOpportunityToIntake/, /validateClearanceToken/, /serializeConflictMemo/, /ignores caller hit_count/, /Clearance requires conflict review ledger proof/, /Clearance requires approved engagement ledger proof/]);
requirePatterns("apps/web/src/components/ClientsSurface.jsx", [/data-intake-conflict-review-flow="true"/, /data-intake-conflict-hit-list="true"/, /data-intake-engagement-approval-flow="true"/, /recordIntakeConflictDecision/, /approveIntakeConflictWaiver/, /approveIntakeEngagement/]);
requirePatterns("apps/web/src/components/ClientsSurface.jsx", [/data-intake-matter-opening-flow="true"/, /openMatterFromIntakeClearance/, /Matter 개설/]);
requirePatterns("apps/web/src/components/ClientsSurface.jsx", [/data-upl-c07-contact-raw-value-flow="true"/, /contact_point_value_included === true/]);
requirePatterns("apps/web/src/data/apiClient.js", [/\/api\/intake\/engagements/, /engagementReady/, /engagementReview/, /openMatterFromIntakeClearance/, /\/api\/matters\/openings/, /ui_cmp_g6_intake_matter_open/]);
requirePatterns("apps/web/src/data/apiClient.js", [/crm_contact_value_reader/, /ui_upl_c07_contact_value_read/, /ui_upl_c07_contact_value_write/]);

rejectPatterns("apps/web/src/components/IntakeSurface.jsx", [/mockData|from "\.\.\/data\/mockData/]);
rejectPatterns("apps/web/src/data/apiClient.js", [/engagement:\$\{clearanceId\}/]);
rejectPatterns("apps/api/src/crm-intake-runtime-context.js", [/engagement:\$\{clearanceTokenId\}/]);

if (failures.length > 0) {
  console.error("CMP R4 G6 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G6 validation passed.");
console.log("g6_runtime_tuws_with_evidence: 22/22");
console.log("remaining_g6_tuw: none");
