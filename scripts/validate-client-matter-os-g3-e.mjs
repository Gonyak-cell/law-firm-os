#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createIntakeConflictMemoBoundaryDescriptor,
  createIntakeEngagementApprovalUiStateDescriptor,
  createIntakeG3CloseoutDescriptor,
  createIntakeWaiverApprovalUiStateDescriptor,
  INTAKE_G3E_CONFLICT_MEMO_HIDDEN_FIELDS,
} from "../packages/intake/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G3-W04-T011", "LFOS-G3-W04-T012", "LFOS-G3-W04-T013", "LFOS-G3-W04-T014"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "28-g3-crm-intake-entry-plan.md"),
  path.join(ROOT, "32-g3-d-conflict-engagement-workflow-report.md"),
  path.join(ROOT, "33-g3-e-intake-ui-closeout-report.md"),
  path.resolve("packages/intake/src/client-matter-g3.js"),
  path.resolve("packages/intake/src/index.js"),
  path.resolve("packages/intake/test/client-matter-g3-ui-closeout.test.js"),
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
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G3-E validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "28-g3-crm-intake-entry-plan.md"));
  const g3dReport = await readText(path.join(ROOT, "32-g3-d-conflict-engagement-workflow-report.md"));
  const report = await readText(path.join(ROOT, "33-g3-e-intake-ui-closeout-report.md"));
  const serviceSource = await readText(path.resolve("packages/intake/src/client-matter-g3.js"));
  const indexSource = await readText(path.resolve("packages/intake/src/index.js"));
  const testSource = await readText(path.resolve("packages/intake/test/client-matter-g3-ui-closeout.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/intake-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G3-E TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G3-E TUW missing from G3 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G3-E TUW missing from G3-E report.");
  }

  for (const phrase of [
    "G3-E Intake UI Closeout Report",
    "This slice does not claim G3 runtime readiness",
    "conflict memo permission boundary",
    "waiver approval UI",
    "engagement approval UI",
    "CRM user memo denial",
    "denied/review states",
    "signed/approved states",
    "Opportunity-to-Matter bypass",
    "runtime writes, audit appends, and Matter creation closed",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G3-E report missing required boundary or scope phrase.");
  }

  requireIncludes(g3dReport, "G3-D Conflict Engagement Workflow Report", "G3D_DEPENDENCY", "G3-E must build on G3-D workflow evidence.");
  requireIncludes(indexSource, `export * from "./client-matter-g3.js";`, "MISSING_INDEX_EXPORT", "Intake package must export G3 UI descriptor layer.");

  for (const symbol of [
    "createIntakeConflictMemoBoundaryDescriptor",
    "createIntakeWaiverApprovalUiStateDescriptor",
    "createIntakeEngagementApprovalUiStateDescriptor",
    "createIntakeG3CloseoutDescriptor",
  ]) {
    requireIncludes(serviceSource, `export function ${symbol}`, "MISSING_SERVICE_EXPORT", "G3-E descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G3-E descriptor export missing test coverage.");
  }

  for (const marker of [
    "INTAKE_G3E_CONFLICT_MEMO_HIDDEN_FIELDS",
    "crm_user_conflict_memo_denied",
    "waiver_ui_denied_state",
    "waiver_ui_review_required_state",
    "engagement_ui_signed_or_approved_state",
    "opportunity_cannot_bypass_intake",
    "unauthorized_count_visible",
    "g3_runtime_readiness_claim",
  ]) {
    requireIncludes(serviceSource, marker, "MISSING_SERVICE_MARKER", "G3-E source missing required risk marker.");
  }

  if (pkg.scripts?.["client-matter:g3e:validate"] !== "node scripts/validate-client-matter-os-g3-e.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g3e:validate.");
  }

  if (contract.program?.program_id !== "RP10" || contract.program?.descriptor_only !== true) {
    addFinding("INTAKE_CONTRACT_BOUNDARY", "Intake contract must remain RP10 descriptor-only evidence.");
  }

  const tenant_id = "tenant_g3e_validator";
  const actor_id = "actor_g3e_validator";

  const memo = createIntakeConflictMemoBoundaryDescriptor({
    tenant_id,
    actor_id,
    actor_module: "crm",
    conflict_check_id: "conflict_check_g3e_validator",
    source_payload: {
      conflict_memo_body: "hidden",
      conflict_hit_detail: "hidden",
      unauthorized_count: 3,
    },
  });
  if (
    memo.outcome !== "denied" ||
    memo.customer_visible_memo !== null ||
    !memo.blocked_claims.includes("crm_user_conflict_memo_denied") ||
    memo.leak_guard.unauthorized_count_visible !== false ||
    memo.leak_guard.source_payload_contains_hidden_fields !== true
  ) {
    addFinding("CONFLICT_MEMO_BOUNDARY", "CRM user must be denied conflict memo without hidden-field leaks.");
  }

  if (!INTAKE_G3E_CONFLICT_MEMO_HIDDEN_FIELDS.includes("unauthorized_count")) {
    addFinding("CONFLICT_MEMO_HIDDEN_FIELDS", "Conflict memo hidden fields must include unauthorized_count.");
  }

  const waiverDenied = createIntakeWaiverApprovalUiStateDescriptor({
    tenant_id,
    actor_id,
    waiver: { waiver_id: "waiver_g3e_validator", tenant_id, approval_state: "review_required" },
    permission_outcome: "denied",
  });
  const waiverReview = createIntakeWaiverApprovalUiStateDescriptor({
    tenant_id,
    actor_id,
    waiver: { waiver_id: "waiver_g3e_validator", tenant_id, approval_state: "review_required" },
    permission_outcome: "review_required",
  });
  if (
    waiverDenied.ui_state !== "denied" ||
    waiverDenied.customer_visible_waiver !== null ||
    !waiverDenied.blocked_claims.includes("waiver_ui_denied_state") ||
    waiverReview.ui_state !== "review_required" ||
    !waiverReview.review_required_claims.includes("waiver_ui_review_required_state")
  ) {
    addFinding("WAIVER_UI", "Waiver UI must handle denied and review-required states.");
  }

  const engagementApproved = createIntakeEngagementApprovalUiStateDescriptor({
    tenant_id,
    actor_id,
    engagement: {
      engagement_id: "engagement_g3e_approved",
      tenant_id,
      legal_client_party_id: "party_g3e_client",
      approval_state: "approved",
    },
  });
  const engagementSigned = createIntakeEngagementApprovalUiStateDescriptor({
    tenant_id,
    actor_id,
    engagement: {
      engagement_id: "engagement_g3e_signed",
      tenant_id,
      legal_client_party_id: "party_g3e_client",
      approval_state: "signed",
    },
  });
  if (
    engagementApproved.customer_visible_engagement.approved_state_visible !== true ||
    engagementApproved.customer_visible_engagement.signed_state_visible !== false ||
    engagementSigned.customer_visible_engagement.approved_state_visible !== true ||
    engagementSigned.customer_visible_engagement.signed_state_visible !== true ||
    engagementSigned.leak_guard.signed_document_body_visible !== false
  ) {
    addFinding("ENGAGEMENT_UI", "Engagement UI must expose approved/signed state without raw document body.");
  }

  const closeout = createIntakeG3CloseoutDescriptor({
    crm_evidence: ["G3-A/G3-B evidence"],
    intake_schema_evidence: ["G3-C evidence"],
    workflow_evidence: ["G3-D evidence"],
    ui_boundary_evidence: ["G3-E evidence"],
    command_evidence: ["npm run client-matter:g3e:validate"],
    pr_state: {
      branch: "codex/lawos-g3-intake-ui-closeout",
      base_branch: "codex/lawos-g3-conflict-engagement-workflow",
      draft: true,
      clean: true,
      merge_authority: "human_only",
    },
    g1_g2_evidence_disposition: "draft_stack_pending_human_review",
    human_review_disposition: "pending",
  });
  const bypass = createIntakeG3CloseoutDescriptor({
    crm_evidence: ["G3-A/G3-B evidence"],
    intake_schema_evidence: ["G3-C evidence"],
    workflow_evidence: ["G3-D evidence"],
    ui_boundary_evidence: ["G3-E evidence"],
    command_evidence: ["npm run client-matter:g3e:validate"],
    pr_state: { draft: true, merge_authority: "human_only" },
    g1_g2_evidence_disposition: "draft_stack_pending_human_review",
    human_review_disposition: "pending",
    opportunity_to_matter_bypass_attempt: true,
    create_matter: true,
  });
  if (
    closeout.outcome !== "review_required" ||
    closeout.missing_evidence.length !== 0 ||
    closeout.opportunity_to_matter_shortcut_prohibited !== true ||
    !bypass.blocked_claims.includes("opportunity_cannot_bypass_intake")
  ) {
    addFinding("G3E_CLOSEOUT", "G3 closeout must record evidence and block Opportunity-to-Matter bypass.");
  }

  for (const descriptor of [memo, waiverDenied, waiverReview, engagementApproved, engagementSigned, closeout, bypass]) {
    if (descriptor.writes_product_state !== false) addFinding("WRITE_BOUNDARY", "G3-E descriptor must remain no-write.");
    if (descriptor.renders_ui !== false) addFinding("UI_RUNTIME_BOUNDARY", "G3-E descriptor must not render runtime UI.");
    if (descriptor.dispatches_intake_runtime !== false) addFinding("RUNTIME_BOUNDARY", "G3-E descriptor must not dispatch Intake runtime.");
    if (descriptor.creates_matter !== false) addFinding("MATTER_BOUNDARY", "G3-E descriptor must not create Matter.");
    if (descriptor.g3_runtime_readiness_claim !== "open") addFinding("G3_READINESS_BOUNDARY", "G3 readiness must remain open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G3-E validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS G3-E validation passed.");
console.log("g3e_tuws: LFOS-G3-W04-T011/LFOS-G3-W04-T012/LFOS-G3-W04-T013/LFOS-G3-W04-T014");
console.log("conflict_memo_boundary: crm_user_denied");
console.log("waiver_ui: denied_and_review_required");
console.log("engagement_ui: signed_and_approved");
console.log("g3_closeout: opportunity_bypass_blocked");
console.log("g3_runtime_readiness_claim: open");
