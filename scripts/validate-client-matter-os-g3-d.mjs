#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createIntakeClearanceTokenDescriptor,
  createIntakeConflictDecisionWorkflowDescriptor,
  createIntakeConflictSearchDescriptor,
  createIntakeCoreConflictCheck,
  createIntakeCoreConflictHit,
  createIntakeEngagementDescriptor,
  createIntakeFeeTermsDescriptor,
  createIntakeG3DWorkflowCloseoutDescriptor,
  createIntakeRiskApprovalQueueDescriptor,
  createIntakeWaiverDescriptor,
  INTAKE_G3D_FEE_TERM_TYPES,
} from "../packages/intake/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G3-W04-T004",
  "LFOS-G3-W04-T005",
  "LFOS-G3-W04-T006",
  "LFOS-G3-W04-T007",
  "LFOS-G3-W04-T008",
  "LFOS-G3-W04-T009",
  "LFOS-G3-W04-T010",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "28-g3-crm-intake-entry-plan.md"),
  path.join(ROOT, "31-g3-c-intake-conflict-schema-report.md"),
  path.join(ROOT, "32-g3-d-conflict-engagement-workflow-report.md"),
  path.resolve("packages/intake/src/client-matter-g3.js"),
  path.resolve("packages/intake/src/index.js"),
  path.resolve("packages/intake/test/client-matter-g3-workflow.test.js"),
  path.resolve("contracts/intake-core-contract.json"),
];

const findings = [];

function addFinding(code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function requireIncludes(text, value, code, message) {
  if (!text.includes(value)) addFinding(code, message, { value });
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G3-D validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "28-g3-crm-intake-entry-plan.md"));
  const g3cReport = await readText(path.join(ROOT, "31-g3-c-intake-conflict-schema-report.md"));
  const report = await readText(path.join(ROOT, "32-g3-d-conflict-engagement-workflow-report.md"));
  const serviceSource = await readText(path.resolve("packages/intake/src/client-matter-g3.js"));
  const indexSource = await readText(path.resolve("packages/intake/src/index.js"));
  const testSource = await readText(path.resolve("packages/intake/test/client-matter-g3-workflow.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/intake-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G3-D TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G3-D TUW missing from G3 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G3-D TUW missing from G3-D report.");
  }

  for (const phrase of [
    "G3-D Conflict Engagement Workflow Report",
    "This slice does not claim G3 runtime readiness",
    "alias, relationship, and former matter",
    "reviewer required",
    "consent document",
    "legal client and scope",
    "hourly, fixed, cap, and retainer",
    "approval audit",
    "expired or stale clearance token",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G3-D report missing required boundary or scope phrase.");
  }

  requireIncludes(g3cReport, "G3-C Intake Conflict Schema Report", "G3C_DEPENDENCY", "G3-D must build on G3-C schema evidence.");
  requireIncludes(indexSource, `export * from "./client-matter-g3.js";`, "MISSING_INDEX_EXPORT", "Intake package must export G3-D descriptor layer.");

  for (const symbol of [
    "createIntakeConflictSearchDescriptor",
    "createIntakeConflictDecisionWorkflowDescriptor",
    "createIntakeWaiverDescriptor",
    "createIntakeEngagementDescriptor",
    "createIntakeFeeTermsDescriptor",
    "createIntakeRiskApprovalQueueDescriptor",
    "createIntakeClearanceTokenDescriptor",
    "createIntakeG3DWorkflowCloseoutDescriptor",
  ]) {
    requireIncludes(serviceSource, `export function ${symbol}`, "MISSING_SERVICE_EXPORT", "G3-D descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G3-D descriptor export missing test coverage.");
  }

  for (const marker of [
    "INTAKE_G3D_CONFLICT_SEARCH_SOURCES",
    "conflict_search_former_matter_source_missing",
    "conflict_decision_reviewer_required",
    "waiver_consent_document_required",
    "engagement_legal_client_required",
    "fee_terms_retainer_amount_required",
    "risk_approval_audit_required",
    "clearance_token_expired",
    "clearance_token_stale_snapshot",
    "intake_to_matter_runtime_still_closed",
    "g3_runtime_readiness_claim",
  ]) {
    requireIncludes(serviceSource, marker, "MISSING_SERVICE_MARKER", "G3-D source missing required risk marker.");
  }

  if (pkg.scripts?.["client-matter:g3d:validate"] !== "node scripts/validate-client-matter-os-g3-d.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g3d:validate.");
  }

  if (contract.program?.program_id !== "RP10" || contract.program?.descriptor_only !== true) {
    addFinding("INTAKE_CONTRACT_BOUNDARY", "Intake contract must remain RP10 descriptor-only evidence.");
  }

  const tenant_id = "tenant_g3d_validator";
  const actor_id = "actor_g3d_validator";
  const owner_user_id = "user_g3d_validator";
  const party_ids = ["party_g3d_client", "party_g3d_counterparty"];
  const conflictCheck = createIntakeCoreConflictCheck({
    conflict_check_id: "conflict_check_g3d_validator",
    tenant_id,
    intake_request_id: "intake_g3d_validator",
    party_snapshot: {
      party_ids,
      aliases: [{ party_id: party_ids[0], alias_value: "Validator Client" }],
      relationships: [{ from_party_id: party_ids[0], to_party_id: party_ids[1], relationship_type: "adverse" }],
      former_matters: [{ matter_ref: "former_matter:g3d_validator", party_id: party_ids[1] }],
    },
    snapshot_recorded_at: "2026-06-19T00:00:00.000Z",
    status: "snapshot_recorded",
    owner_user_id,
  });
  const conflictHit = createIntakeCoreConflictHit({
    conflict_hit_id: "conflict_hit_g3d_validator",
    tenant_id,
    conflict_check_id: conflictCheck.conflict_check_id,
    matched_party_id: party_ids[1],
    hit_source: "former_matter",
    source_record_ref: "former_matter:g3d_validator",
    severity: "high",
    audit_hint_ref: "audit_hint_g3d_validator",
    status: "review_required",
    owner_user_id,
  });

  const search = createIntakeConflictSearchDescriptor({
    tenant_id,
    actor_id,
    conflict_check: conflictCheck,
    party_snapshot: conflictCheck.party_snapshot,
    search_sources: {
      alias_index: [{ alias_ref: "alias:g3d_validator" }],
      relationship_graph: [{ relationship_ref: "relationship:g3d_validator" }],
      former_matter: [{ matter_ref: "former_matter:g3d_validator" }],
    },
  });
  if (
    search.outcome !== "review_required" ||
    search.source_coverage.alias_index !== true ||
    search.source_coverage.relationship_graph !== true ||
    search.source_coverage.former_matter !== true ||
    search.search_receipt.executed !== false
  ) {
    addFinding("CONFLICT_SEARCH", "Conflict search must cover alias, relationship, and former matter sources without execution.");
  }

  const decisionBlocked = createIntakeConflictDecisionWorkflowDescriptor({
    tenant_id,
    actor_id,
    conflict_check: conflictCheck,
    conflict_hits: [conflictHit],
    requested_decision: "waiver_required",
  });
  const decision = createIntakeConflictDecisionWorkflowDescriptor({
    tenant_id,
    actor_id,
    conflict_check: conflictCheck,
    conflict_hits: [conflictHit],
    requested_decision: "waiver_required",
    reviewer_user_id: "reviewer_g3d_validator",
  });
  if (
    !decisionBlocked.blocked_claims.includes("conflict_decision_reviewer_required") ||
    decision.outcome !== "review_required" ||
    decision.decision_receipt.decision_persisted !== false
  ) {
    addFinding("CONFLICT_DECISION", "Conflict decision workflow must require reviewer and avoid persistence.");
  }

  const waiver = createIntakeWaiverDescriptor({
    tenant_id,
    actor_id,
    waiver_id: "waiver_g3d_validator",
    intake_request_id: conflictCheck.intake_request_id,
    conflict_hit_ids: [conflictHit.conflict_hit_id],
    consent_document_ref: "dms:consent:g3d_validator",
    approver_user_id: "approver_g3d_validator",
  });
  if (waiver.outcome !== "review_required" || waiver.consent_document_evidence_required !== true) {
    addFinding("WAIVER", "Waiver descriptor must require consent document evidence.");
  }

  const engagement = createIntakeEngagementDescriptor({
    tenant_id,
    actor_id,
    engagement_id: "engagement_g3d_validator",
    intake_request_id: conflictCheck.intake_request_id,
    legal_client_party_id: party_ids[0],
    scope_summary: "Validator engagement scope.",
    fee_terms_id: "fee_terms_g3d_validator",
    approval_state: "approved",
  });
  if (engagement.outcome !== "review_required" || engagement.matter_id !== null || engagement.creates_matter !== false) {
    addFinding("ENGAGEMENT", "Engagement descriptor must require legal client/scope and keep Matter closed.");
  }

  const feeVariants = [
    createIntakeFeeTermsDescriptor({
      tenant_id,
      actor_id,
      fee_terms_id: "fee_terms_g3d_hourly",
      intake_request_id: conflictCheck.intake_request_id,
      fee_type: "hourly",
      currency: "KRW",
      rate_card_ref: "rate:g3d",
    }),
    createIntakeFeeTermsDescriptor({
      tenant_id,
      actor_id,
      fee_terms_id: "fee_terms_g3d_fixed",
      intake_request_id: conflictCheck.intake_request_id,
      fee_type: "fixed",
      currency: "KRW",
      fixed_fee_amount: 5000000,
    }),
    createIntakeFeeTermsDescriptor({
      tenant_id,
      actor_id,
      fee_terms_id: "fee_terms_g3d_cap",
      intake_request_id: conflictCheck.intake_request_id,
      fee_type: "cap",
      currency: "KRW",
      cap_amount: 10000000,
    }),
    createIntakeFeeTermsDescriptor({
      tenant_id,
      actor_id,
      fee_terms_id: "fee_terms_g3d_retainer",
      intake_request_id: conflictCheck.intake_request_id,
      fee_type: "retainer",
      currency: "KRW",
      retainer_amount: 3000000,
    }),
  ];
  if (INTAKE_G3D_FEE_TERM_TYPES.join("/") !== "hourly/fixed/cap/retainer" || feeVariants.some((variant) => variant.outcome !== "review_required")) {
    addFinding("FEE_TERMS", "FeeTerms descriptor must support hourly, fixed, cap, and retainer variants.");
  }

  const approval = createIntakeRiskApprovalQueueDescriptor({
    tenant_id,
    actor_id,
    risk_approval_id: "risk_approval_g3d_validator",
    intake_request_id: conflictCheck.intake_request_id,
    conflict_check_id: conflictCheck.conflict_check_id,
    reviewer_user_id: "risk_reviewer_g3d_validator",
    approval_audit_ref: "audit:risk:g3d_validator",
  });
  if (approval.outcome !== "review_required" || approval.queue_receipt.enqueued !== false || approval.queue_receipt.approval_audit_required !== true) {
    addFinding("RISK_APPROVAL", "Risk approval queue must require approval audit evidence and avoid runtime enqueue.");
  }

  const expired = createIntakeClearanceTokenDescriptor({
    tenant_id,
    actor_id,
    clearance_token_id: "clearance_g3d_expired",
    intake_request_id: conflictCheck.intake_request_id,
    conflict_check_id: conflictCheck.conflict_check_id,
    engagement_id: engagement.engagement_id,
    issued_at: "2026-06-18T00:00:00.000Z",
    expires_at: "2026-06-18T01:00:00.000Z",
    current_time: "2026-06-19T00:00:00.000Z",
    snapshot_hash: "snapshot:old",
    current_snapshot_hash: "snapshot:old",
  });
  const stale = createIntakeClearanceTokenDescriptor({
    tenant_id,
    actor_id,
    clearance_token_id: "clearance_g3d_stale",
    intake_request_id: conflictCheck.intake_request_id,
    conflict_check_id: conflictCheck.conflict_check_id,
    engagement_id: engagement.engagement_id,
    issued_at: "2026-06-19T00:00:00.000Z",
    expires_at: "2026-06-20T00:00:00.000Z",
    current_time: "2026-06-19T01:00:00.000Z",
    snapshot_hash: "snapshot:old",
    current_snapshot_hash: "snapshot:new",
    create_matter: true,
  });
  if (
    !expired.blocked_claims.includes("clearance_token_expired") ||
    !stale.blocked_claims.includes("clearance_token_stale_snapshot") ||
    !stale.blocked_claims.includes("intake_to_matter_runtime_still_closed")
  ) {
    addFinding("CLEARANCE_TOKEN", "Clearance token descriptor must block expired, stale, and runtime Matter-opening claims.");
  }

  const closeout = createIntakeG3DWorkflowCloseoutDescriptor({
    conflict_search_evidence: ["alias/relationship/former matter search"],
    decision_workflow_evidence: ["reviewer required"],
    waiver_evidence: ["consent document required"],
    engagement_evidence: ["legal client and scope required"],
    fee_terms_evidence: ["hourly/fixed/cap/retainer"],
    risk_approval_evidence: ["approval audit"],
    clearance_token_evidence: ["expired/stale token blocked"],
    command_evidence: ["npm run client-matter:g3d:validate"],
    pr_state: {
      branch: "codex/lawos-g3-conflict-engagement-workflow",
      base_branch: "codex/lawos-g3-intake-conflict-schema",
      draft: true,
      clean: true,
      merge_authority: "human_only",
    },
    human_review_disposition: "pending",
  });
  if (closeout.outcome !== "review_required" || closeout.missing_evidence.length !== 0 || closeout.g3_runtime_readiness_claim !== "open") {
    addFinding("G3D_CLOSEOUT", "G3-D closeout must preserve evidence and keep readiness open.", {
      outcome: closeout.outcome,
      missing_evidence: closeout.missing_evidence,
    });
  }

  for (const descriptor of [search, decision, waiver, engagement, ...feeVariants, approval, expired, stale, closeout]) {
    if (descriptor.writes_product_state !== false) addFinding("WRITE_BOUNDARY", "G3-D descriptor must remain no-write.");
    if (descriptor.dispatches_intake_runtime !== false) addFinding("RUNTIME_BOUNDARY", "G3-D descriptor must not dispatch Intake runtime.");
    if (descriptor.creates_matter !== false) addFinding("MATTER_BOUNDARY", "G3-D descriptor must not create Matter.");
    if (descriptor.g3_runtime_readiness_claim !== "open") addFinding("G3_READINESS_BOUNDARY", "G3 readiness must remain open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G3-D validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS G3-D validation passed.");
console.log("g3d_tuws: LFOS-G3-W04-T004/LFOS-G3-W04-T005/LFOS-G3-W04-T006/LFOS-G3-W04-T007/LFOS-G3-W04-T008/LFOS-G3-W04-T009/LFOS-G3-W04-T010");
console.log("conflict_search: alias_relationship_former_matter");
console.log("conflict_decision: reviewer_required");
console.log("waiver_engagement_fee_terms: consent_scope_fee_variants");
console.log("risk_approval: approval_audit_required");
console.log("clearance_token: expired_or_stale_blocked");
console.log("g3_runtime_readiness_claim: open");
