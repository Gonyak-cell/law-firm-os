#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createAiGovernanceG6AIOutputDescriptor,
  createAiGovernanceG6CitationDescriptor,
  createAiGovernanceG6DAIOutputReviewCloseoutDescriptor,
  createAiGovernanceG6DisableSwitchDescriptor,
  createAiGovernanceG6HumanReviewQueueDescriptor,
} from "../packages/ai-governance/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G6-W10-T005", "LFOS-G6-W10-T006", "LFOS-G6-W10-T007", "LFOS-G6-W10-T008"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"),
  path.join(ROOT, "51-g6-c-ai-policy-retrieval-audit-report.md"),
  path.join(ROOT, "52-g6-d-ai-output-review-controls-report.md"),
  path.resolve("contracts/ai-governance-core-contract.json"),
  path.resolve("packages/ai-governance/src/client-matter-g6.js"),
  path.resolve("packages/ai-governance/test/client-matter-g6-ai-output-review-controls.test.js"),
  path.resolve("scripts/validate-client-matter-os-g6-c.mjs"),
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

const tenant_id = "tenant_g6d_validator";
const matter_id = "matter_g6d_validator";
const actor_id = "actor_g6d_validator";
const ai_output_id = "ai_output_g6d_validator";

function aiOutput(overrides = {}) {
  return {
    ai_output_id,
    tenant_id,
    matter_id,
    actor_id,
    prompt_log_id: "prompt_g6d_validator",
    retrieval_request_id: "retrieval_g6d_validator",
    state: "candidate",
    ...overrides,
  };
}

function citation(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    document_id: "doc_g6d_validator",
    span_ref: "p3:12-14",
    permission_inherited: true,
    privilege_label_inherited: true,
    ...overrides,
  };
}

function reviewAction(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    reviewer_id: "reviewer_g6d_validator",
    action: "confirm",
    audit_receipt_id: "audit_g6d_validator",
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G6-D validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"));
  const g6cReport = await readText(path.join(ROOT, "51-g6-c-ai-policy-retrieval-audit-report.md"));
  const report = await readText(path.join(ROOT, "52-g6-d-ai-output-review-controls-report.md"));
  const source = await readText(path.resolve("packages/ai-governance/src/client-matter-g6.js"));
  const testSource = await readText(path.resolve("packages/ai-governance/test/client-matter-g6-ai-output-review-controls.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const aiContract = await readJson(path.resolve("contracts/ai-governance-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G6-D TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G6-D TUW missing from G6 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G6-D TUW missing from G6-D report.");
  }

  requireIncludes(plan, "G6-D", "G6_PLAN_DEPENDENCY", "G6-D must build on G6 entry plan evidence.");
  requireIncludes(g6cReport, "G6-C AI Policy Retrieval Audit Report", "G6C_DEPENDENCY", "G6-D must depend on G6-C policy/retrieval/audit evidence.");
  requireIncludes(riskRegister, "R-005", "R005_DEPENDENCY", "G6-D must preserve AI DMS permission-bypass controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G6-D must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G6-D AI Output Review Controls Report",
    "This slice does not claim G6 runtime readiness",
    "candidate default state",
    "citation-required confirmation",
    "human review audit",
    "dark-launch/disable switch controls",
    "AI Governance descriptor-only boundaries",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G6-D report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "AI_GOVERNANCE_G6D_TUW_COVERAGE",
    "createAiGovernanceG6AIOutputDescriptor",
    "createAiGovernanceG6CitationDescriptor",
    "createAiGovernanceG6HumanReviewQueueDescriptor",
    "createAiGovernanceG6DisableSwitchDescriptor",
    "createAiGovernanceG6DAIOutputReviewCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "AI_GOVERNANCE_G6D_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_SOURCE_EXPORT", "G6-D descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G6-D descriptor export missing test coverage.");
  }

  for (const marker of [
    "ai_output_candidate_default_state_required",
    "ai_output_final_state_blocked",
    "citation_required_for_confirm",
    "citation_acl_privilege_inheritance_required",
    "human_review_confirm_reject_audit_required",
    "human_review_direct_final_approval_blocked",
    "ai_disable_switch_dark_launch_off_required",
    "ai_disable_switch_runtime_dispatch_blocked",
    "g6_ai_output_review_closeout_evidence_required",
    "g6_ai_output_requires_policy_retrieval_audit_handoff",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G6-D source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g6d:validate"] !== "node scripts/validate-client-matter-os-g6-d.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g6d:validate.");
  }

  if (
    aiContract.program?.program_id !== "RP17" ||
    aiContract.program?.descriptor_only !== true ||
    aiContract.no_write_attestation?.dispatches_ai_governance_runtime !== false ||
    aiContract.no_write_attestation?.dispatches_model_policy_runtime !== false ||
    aiContract.no_write_attestation?.writes_product_state !== false
  ) {
    addFinding("AI_GOVERNANCE_CONTRACT_BOUNDARY", "RP17 AI Governance contract must remain descriptor-only no-runtime evidence.");
  }

  const output = createAiGovernanceG6AIOutputDescriptor({ tenant_id, matter_id, actor_id, ai_output: aiOutput() });
  const citationDescriptor = createAiGovernanceG6CitationDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    citations: [citation()],
    confirm_requested: true,
  });
  const review = createAiGovernanceG6HumanReviewQueueDescriptor({
    tenant_id,
    matter_id,
    ai_output_id,
    review_actions: [reviewAction(), reviewAction({ action: "reject", audit_receipt_id: "audit_reject_g6d_validator" })],
  });
  const disable = createAiGovernanceG6DisableSwitchDescriptor({
    tenant_id,
    switch_state: { tenant_id, switch_id: "switch_g6d_validator", dark_launch_enabled: false, ai_disabled: true },
  });
  const closeout = createAiGovernanceG6DAIOutputReviewCloseoutDescriptor({
    tenant_id,
    descriptors: [output, citationDescriptor, review, disable],
    policy_retrieval_audit_closed: true,
  });

  if (output.outcome !== "review_required" || output.ai_output_receipt.candidate_default_state_tested !== true) {
    addFinding("AI_OUTPUT", "AIOutput descriptor must require candidate default state evidence.");
  }
  if (citationDescriptor.outcome !== "review_required" || citationDescriptor.citation_receipt.citation_required_for_confirm_tested !== true) {
    addFinding("CITATION", "Citation descriptor must require citations before confirm.");
  }
  if (review.outcome !== "review_required" || review.human_review_receipt.confirm_reject_audit_tested !== true) {
    addFinding("HUMAN_REVIEW", "HumanReview descriptor must require confirm/reject audit evidence.");
  }
  if (disable.outcome !== "review_required" || disable.disable_switch_receipt.dark_launch_off_tested !== true) {
    addFinding("DISABLE_SWITCH", "DisableSwitch descriptor must require dark launch off evidence.");
  }
  if (closeout.outcome !== "review_required" || closeout.tuw_coverage.length !== 4 || closeout.closeout_receipt.runtime_readiness_claim !== "open") {
    addFinding("G6D_CLOSEOUT", "G6-D closeout must summarize four TUWs while keeping runtime readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G6-D validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G6-D validation passed.");
console.log("g6d_tuws: LFOS-G6-W10-T005/LFOS-G6-W10-T006/LFOS-G6-W10-T007/LFOS-G6-W10-T008");
console.log("ai_output: candidate_default_state_required");
console.log("citation: required_for_confirm");
console.log("human_review: confirm_reject_audit_required");
console.log("disable_switch: dark_launch_off_required");
console.log("g6_runtime_readiness_claim: open");
