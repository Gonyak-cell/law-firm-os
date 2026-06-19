#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createCrmActivityPermissionTrimDescriptor,
  createCrmCoreCRMActivity,
  createCrmCoreOpportunity,
  createCrmG3PartialCloseoutDescriptor,
  createCrmKeyClientPlanUiStateDescriptor,
  createCrmOpportunityPipelineDescriptor,
  createCrmOpportunityToIntakeCommandDescriptor,
  createCrmSummaryUiStateDescriptor,
} from "../packages/crm/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G3-W03-T007",
  "LFOS-G3-W03-T008",
  "LFOS-G3-W03-T009",
  "LFOS-G3-W03-T010",
  "LFOS-G3-W03-T011",
  "LFOS-G3-W03-T012",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "28-g3-crm-intake-entry-plan.md"),
  path.join(ROOT, "29-g3-a-crm-schema-report.md"),
  path.join(ROOT, "30-g3-b-crm-service-ui-closeout-report.md"),
  path.resolve("packages/crm/src/client-matter-g3.js"),
  path.resolve("packages/crm/src/index.js"),
  path.resolve("packages/crm/test/client-matter-g3-service-ui.test.js"),
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
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G3-B validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "28-g3-crm-intake-entry-plan.md"));
  const g3aReport = await readText(path.join(ROOT, "29-g3-a-crm-schema-report.md"));
  const report = await readText(path.join(ROOT, "30-g3-b-crm-service-ui-closeout-report.md"));
  const serviceSource = await readText(path.resolve("packages/crm/src/client-matter-g3.js"));
  const indexSource = await readText(path.resolve("packages/crm/src/index.js"));
  const testSource = await readText(path.resolve("packages/crm/test/client-matter-g3-service-ui.test.js"));
  const pkg = await readJson(path.resolve("package.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G3-B TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G3-B TUW missing from G3 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G3-B TUW missing from G3-B report.");
  }

  for (const phrase of [
    "G3-B CRM Service UI Closeout Report",
    "This slice does not claim G3 runtime readiness",
    "Opportunity pipeline transitions",
    "confidential activity trimming",
    "Opportunity-to-Intake",
    "KeyClientPlan masking",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G3-B report missing required boundary or scope phrase.");
  }

  requireIncludes(g3aReport, "G3-A CRM Schema Report", "G3A_DEPENDENCY", "G3-B must build on G3-A schema evidence.");

  for (const symbol of [
    "createCrmOpportunityPipelineDescriptor",
    "createCrmActivityPermissionTrimDescriptor",
    "createCrmSummaryUiStateDescriptor",
    "createCrmOpportunityToIntakeCommandDescriptor",
    "createCrmKeyClientPlanUiStateDescriptor",
    "createCrmG3PartialCloseoutDescriptor",
  ]) {
    requireIncludes(serviceSource, `export function ${symbol}`, "MISSING_SERVICE_EXPORT", "G3-B service helper missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G3-B service helper missing test coverage.");
  }

  requireIncludes(indexSource, `export * from "./client-matter-g3.js";`, "MISSING_INDEX_EXPORT", "CRM package must export G3-B descriptor layer.");

  for (const marker of [
    "opportunity_stage_transition_invalid",
    "confidential_crm_activity_denied",
    "CRM_G3B_SUMMARY_PROHIBITED_FIELDS",
    "opportunity_to_matter_shortcut_blocked",
    "CRM_G3B_KEY_CLIENT_PLAN_MASKED_FIELDS",
    "g3_crm_partial_closeout_evidence_missing",
  ]) {
    requireIncludes(serviceSource, marker, "MISSING_SERVICE_MARKER", "G3-B source missing required risk marker.");
  }

  if (pkg.scripts?.["client-matter:g3b:validate"] !== "node scripts/validate-client-matter-os-g3-b.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g3b:validate.");
  }

  const tenant_id = "tenant_g3b_validator";
  const actor_id = "actor_g3b_validator";
  const owner_user_id = "user_g3b_validator";
  const party_id = "party_g3b_client";
  const opportunity = createCrmCoreOpportunity({
    opportunity_id: "opportunity_g3b_validator",
    tenant_id,
    party_id,
    display_name: "Validator Opportunity",
    stage: "qualified",
    status: "active",
    owner_user_id,
  });

  const pipeline = createCrmOpportunityPipelineDescriptor({
    tenant_id,
    actor_id,
    opportunity,
    requested_stage: "intake_requested",
  });
  if (
    pipeline.outcome !== "review_required" ||
    pipeline.stage_transition?.executed !== false ||
    pipeline.writes_product_state !== false ||
    pipeline.g3_runtime_readiness_claim !== "open"
  ) {
    addFinding("PIPELINE_DESCRIPTOR", "Opportunity pipeline descriptor must model stage transition without writes.", {
      outcome: pipeline.outcome,
      readiness: pipeline.g3_runtime_readiness_claim,
    });
  }

  const blockedPipeline = createCrmOpportunityPipelineDescriptor({
    tenant_id,
    actor_id,
    opportunity,
    requested_stage: "closed_won",
    matter_id: "matter_forbidden",
  });
  if (
    !blockedPipeline.blocked_claims.includes("opportunity_stage_transition_invalid") ||
    !blockedPipeline.blocked_claims.includes("opportunity_to_matter_shortcut_blocked")
  ) {
    addFinding("PIPELINE_NEGATIVE", "Opportunity pipeline must block invalid transition and direct Matter shortcut.");
  }

  const activity = createCrmCoreCRMActivity({
    crm_activity_id: "activity_g3b_validator",
    tenant_id,
    party_id,
    opportunity_id: opportunity.opportunity_id,
    activity_type: "meeting",
    subject: "Confidential validator activity",
    confidential: true,
    status: "active",
    owner_user_id,
  });
  const trim = createCrmActivityPermissionTrimDescriptor({
    tenant_id,
    actor_id,
    activity,
    permission_outcome: "denied",
  });
  if (trim.customer_visible_activity !== null || trim.safe_error_code !== "CRM_ACTIVITY_CONFIDENTIAL_DENIED") {
    addFinding("ACTIVITY_TRIM", "Confidential CRM activity must be hidden for denied actors.");
  }

  const summary = createCrmSummaryUiStateDescriptor({
    tenant_id,
    actor_id,
    party: { party_id, display_name: "Validator Client", party_type: "organization", status: "active" },
    opportunities: [opportunity],
    source_payload: { conflict_memo: "hidden", billing_detail: "hidden" },
  });
  const summaryPayload = JSON.stringify(summary.customer_visible_summary);
  if (summaryPayload.includes("conflict_memo") || summaryPayload.includes("billing_detail") || summary.renders_ui !== false) {
    addFinding("SUMMARY_UI_LEAK", "CRM summary UI state must hide conflict memo and billing detail fields.");
  }

  const command = createCrmOpportunityToIntakeCommandDescriptor({
    tenant_id,
    actor_id,
    opportunity_id: opportunity.opportunity_id,
    party_id,
    intake_request_id: "intake_g3b_validator",
  });
  const blockedCommand = createCrmOpportunityToIntakeCommandDescriptor({
    tenant_id,
    actor_id,
    opportunity_id: opportunity.opportunity_id,
    party_id,
    intake_request_id: "intake_g3b_validator",
    create_matter: true,
  });
  if (
    command.allowed_conversion_target !== "IntakeRequest" ||
    command.command_receipt?.creates_matter !== false ||
    !blockedCommand.blocked_claims.includes("opportunity_to_matter_shortcut_blocked")
  ) {
    addFinding("OPPORTUNITY_TO_INTAKE", "Opportunity-to-Intake command must allow IntakeRequest only and block Matter creation.");
  }

  const keyClientPlan = createCrmKeyClientPlanUiStateDescriptor({
    tenant_id,
    actor_id,
    party: { party_id, display_name: "Validator Key Client", party_type: "organization", status: "active" },
    opportunities: [opportunity],
    source_payload: { ar_balance: 123456, invoice_detail: "hidden" },
  });
  if (
    keyClientPlan.masked_finance_summary?.ar_balance !== "masked" ||
    keyClientPlan.masked_finance_summary?.invoice_detail_visible !== false ||
    JSON.stringify(keyClientPlan).includes("123456")
  ) {
    addFinding("KEY_CLIENT_MASK", "KeyClientPlan descriptor must mask AR and invoice detail.");
  }

  const closeout = createCrmG3PartialCloseoutDescriptor({
    pipeline_evidence: ["pipeline descriptor test"],
    permission_trim_evidence: ["confidential denied test"],
    summary_ui_evidence: ["summary leak guard test"],
    opportunity_to_intake_evidence: ["Opportunity-to-Intake only evidence"],
    key_client_plan_evidence: ["AR masking test"],
    command_evidence: ["npm run client-matter:g3b:validate"],
    pr_state: {
      branch: "codex/lawos-g3-crm-service-ui-closeout",
      base_branch: "codex/lawos-g3-crm-schema",
      draft: true,
      clean: true,
      merge_authority: "human_only",
    },
    g1_g2_evidence_disposition: "draft_stack_pending_human_review",
    human_review_disposition: "pending",
  });
  if (
    closeout.outcome !== "review_required" ||
    closeout.missing_evidence.length !== 0 ||
    closeout.opportunity_to_intake_only_evidence !== true ||
    closeout.g3_runtime_readiness_claim !== "open"
  ) {
    addFinding("G3B_CLOSEOUT", "G3-B closeout must preserve evidence and keep G3 readiness open.", {
      outcome: closeout.outcome,
      missing_evidence: closeout.missing_evidence,
    });
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G3-B validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS G3-B validation passed.");
console.log("g3b_tuws: LFOS-G3-W03-T007/LFOS-G3-W03-T008/LFOS-G3-W03-T009/LFOS-G3-W03-T010/LFOS-G3-W03-T011/LFOS-G3-W03-T012");
console.log("crm_service_descriptors: pipeline/permission_trim/summary_ui/opportunity_to_intake/key_client_plan/partial_closeout");
console.log("shortcut_boundary: opportunity_to_intake_only_matter_creation_blocked");
console.log("ui_leak_guards: conflict_memo/billing_detail/ar_detail_masked");
console.log("g3_runtime_readiness_claim: open");
