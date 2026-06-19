#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createAiLegalWorkflowsG6AIOutputExportDescriptor,
  createAiLegalWorkflowsG6ELegalWorkflowsCloseoutDescriptor,
  createAiLegalWorkflowsG6LegalWorkflowModelDescriptor,
  createAiLegalWorkflowsG6WorkflowBuilderUIDescriptor,
} from "../packages/ai-legal-workflows/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G6-W10-T009", "LFOS-G6-W10-T010", "LFOS-G6-W10-T011", "LFOS-G6-W10-T012"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"),
  path.join(ROOT, "52-g6-d-ai-output-review-controls-report.md"),
  path.join(ROOT, "53-g6-e-ai-legal-workflows-closeout-report.md"),
  path.resolve("contracts/ai-legal-workflows-core-contract.json"),
  path.resolve("packages/ai-legal-workflows/src/client-matter-g6.js"),
  path.resolve("packages/ai-legal-workflows/src/index.js"),
  path.resolve("packages/ai-legal-workflows/test/client-matter-g6-ai-legal-workflows-closeout.test.js"),
  path.resolve("scripts/validate-client-matter-os-g6-d.mjs"),
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

const tenant_id = "tenant_g6e_validator";
const matter_id = "matter_g6e_validator";
const workflow_id = "workflow_g6e_validator";
const ai_output_id = "ai_output_g6e_validator";

function legalWorkflow(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    workflow_id,
    steps: [
      { step_id: "draft", type: "draft" },
      { step_id: "human_review", type: "human_approval", requires_human_approval: true },
    ],
    ...overrides,
  };
}

function builderConfig(overrides = {}) {
  return {
    human_approval_step_locked: true,
    allows_auto_final_legal_decision: false,
    steps: [{ step_id: "human_review", type: "human_approval", requires_human_approval: true }],
    ...overrides,
  };
}

function aiOutput(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    ai_output_id,
    privilege_label: "attorney_client_privileged",
    ...overrides,
  };
}

function exportRequest(overrides = {}) {
  return {
    export_request_id: "export_g6e_validator",
    privilege_label_inherited: true,
    dms_acl_inherited: true,
    permission_inherited: true,
    external_share_boundary_checked: true,
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G6-E validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"));
  const g6dReport = await readText(path.join(ROOT, "52-g6-d-ai-output-review-controls-report.md"));
  const report = await readText(path.join(ROOT, "53-g6-e-ai-legal-workflows-closeout-report.md"));
  const source = await readText(path.resolve("packages/ai-legal-workflows/src/client-matter-g6.js"));
  const indexSource = await readText(path.resolve("packages/ai-legal-workflows/src/index.js"));
  const testSource = await readText(path.resolve("packages/ai-legal-workflows/test/client-matter-g6-ai-legal-workflows-closeout.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const aiLegalContract = await readJson(path.resolve("contracts/ai-legal-workflows-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G6-E TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G6-E TUW missing from G6 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G6-E TUW missing from G6-E report.");
  }

  requireIncludes(plan, "G6-E", "G6_PLAN_DEPENDENCY", "G6-E must build on G6 entry plan evidence.");
  requireIncludes(g6dReport, "G6-D AI Output Review Controls Report", "G6D_DEPENDENCY", "G6-E must depend on G6-D output review evidence.");
  requireIncludes(riskRegister, "R-005", "R005_DEPENDENCY", "G6-E must preserve AI DMS permission-bypass controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G6-E must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G6-E AI Legal Workflows Closeout Report",
    "This slice does not claim G6 runtime readiness",
    "human approval steps",
    "no-auto-final legal decision",
    "privilege-label and ACL inheritance",
    "AI Legal Workflows descriptor-only boundaries",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G6-E report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "AI_LEGAL_WORKFLOWS_G6E_TUW_COVERAGE",
    "createAiLegalWorkflowsG6LegalWorkflowModelDescriptor",
    "createAiLegalWorkflowsG6WorkflowBuilderUIDescriptor",
    "createAiLegalWorkflowsG6AIOutputExportDescriptor",
    "createAiLegalWorkflowsG6ELegalWorkflowsCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "AI_LEGAL_WORKFLOWS_G6E_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_SOURCE_EXPORT", "G6-E descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G6-E descriptor export missing test coverage.");
  }
  requireIncludes(indexSource, "export * from \"./client-matter-g6.js\";", "MISSING_INDEX_EXPORT", "G6-E helpers must be exported from package index.");

  for (const marker of [
    "legal_workflow_human_approval_step_required",
    "legal_workflow_auto_final_legal_decision_blocked",
    "workflow_builder_no_auto_final_legal_decision_required",
    "workflow_builder_runtime_ui_execution_blocked",
    "ai_output_export_privilege_label_inheritance_required",
    "ai_output_export_acl_bypass_blocked",
    "g6_ai_legal_workflows_closeout_evidence_required",
    "g6_ai_legal_requires_ai_output_review_handoff",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G6-E source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g6e:validate"] !== "node scripts/validate-client-matter-os-g6-e.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g6e:validate.");
  }

  if (
    aiLegalContract.program?.program_id !== "RP18" ||
    aiLegalContract.program?.descriptor_only !== true ||
    aiLegalContract.no_write_attestation?.dispatches_ai_legal_workflows_runtime !== false ||
    aiLegalContract.no_write_attestation?.dispatches_precedent_runtime !== false ||
    aiLegalContract.no_write_attestation?.dispatches_dd_extraction_runtime !== false ||
    aiLegalContract.no_write_attestation?.dispatches_clause_markup_runtime !== false ||
    aiLegalContract.no_write_attestation?.writes_product_state !== false
  ) {
    addFinding("AI_LEGAL_WORKFLOWS_CONTRACT_BOUNDARY", "RP18 AI Legal Workflows contract must remain descriptor-only no-runtime evidence.");
  }

  const workflow = createAiLegalWorkflowsG6LegalWorkflowModelDescriptor({
    tenant_id,
    matter_id,
    legal_workflow: legalWorkflow(),
  });
  const builder = createAiLegalWorkflowsG6WorkflowBuilderUIDescriptor({
    tenant_id,
    matter_id,
    workflow_id,
    builder_config: builderConfig(),
  });
  const outputExport = createAiLegalWorkflowsG6AIOutputExportDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    ai_output: aiOutput(),
    export_request: exportRequest(),
  });
  const closeout = createAiLegalWorkflowsG6ELegalWorkflowsCloseoutDescriptor({
    tenant_id,
    descriptors: [workflow, builder, outputExport, { tuw_id: "LFOS-G6-W10-T012", outcome: "review_required" }],
    ai_output_review_closed: true,
  });

  if (workflow.outcome !== "review_required" || workflow.legal_workflow_receipt.human_approval_step_tested !== true) {
    addFinding("LEGAL_WORKFLOW", "LegalWorkflow descriptor must require human approval step evidence.");
  }
  if (builder.outcome !== "review_required" || builder.workflow_builder_receipt.no_auto_final_legal_decision_tested !== true) {
    addFinding("WORKFLOW_BUILDER", "WorkflowBuilder descriptor must block auto-final legal decisions.");
  }
  if (outputExport.outcome !== "review_required" || outputExport.ai_output_export_receipt.privilege_label_inheritance_tested !== true) {
    addFinding("AI_OUTPUT_EXPORT", "AI output export descriptor must require privilege-label inheritance.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 4 ||
    closeout.ai_acl_bypass_blocked !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G6E_CLOSEOUT", "G6-E closeout must summarize four TUWs while keeping runtime readiness open and ACL bypass blocked.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G6-E validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G6-E validation passed.");
console.log("g6e_tuws: LFOS-G6-W10-T009/LFOS-G6-W10-T010/LFOS-G6-W10-T011/LFOS-G6-W10-T012");
console.log("legal_workflow: human_approval_step_required");
console.log("workflow_builder: no_auto_final_legal_decision_required");
console.log("ai_output_export: privilege_label_acl_inheritance_required");
console.log("g6_ai_closeout: ai_acl_bypass_blocked");
console.log("g6_runtime_readiness_claim: open");
