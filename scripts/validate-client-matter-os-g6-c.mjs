#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createAiGovernanceG6CPolicyRetrievalAuditCloseoutDescriptor,
  createAiGovernanceG6ModelPolicyDescriptor,
  createAiGovernanceG6PermissionAwareRetrievalDescriptor,
  createAiGovernanceG6PromptLogDescriptor,
  createAiGovernanceG6RetrievalRequestDescriptor,
} from "../packages/ai-governance/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G6-W10-T001", "LFOS-G6-W10-T002", "LFOS-G6-W10-T003", "LFOS-G6-W10-T004"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"),
  path.join(ROOT, "50-g6-b-analytics-dashboard-export-closeout-report.md"),
  path.join(ROOT, "51-g6-c-ai-policy-retrieval-audit-report.md"),
  path.resolve("contracts/ai-governance-core-contract.json"),
  path.resolve("packages/ai-governance/src/client-matter-g6.js"),
  path.resolve("packages/ai-governance/test/client-matter-g6-ai-policy-retrieval-audit.test.js"),
  path.resolve("scripts/validate-client-matter-os-g6-b.mjs"),
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

const tenant_id = "tenant_g6c_validator";
const matter_id = "matter_g6c_validator";
const actor_id = "actor_g6c_validator";

function modelPolicy(overrides = {}) {
  return {
    model_policy_id: "model_policy_g6c_validator",
    tenant_id,
    matter_id,
    matter_sensitivity_routes: ["public", "confidential", "privileged"],
    privilege_label_routes: ["attorney_client", "work_product", "legal_hold"],
    disable_states: ["dark_launch_off", "disable_switch_on"],
    ...overrides,
  };
}

function retrievalRequest(overrides = {}) {
  return {
    retrieval_request_id: "retrieval_g6c_validator",
    tenant_id,
    matter_id,
    source_refs: [{ source_type: "document", source_id: "doc_g6c_authorized" }],
    ...overrides,
  };
}

function document(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    document_id: "doc_g6c_authorized",
    privilege_label: "attorney_client",
    privilege_label_inherited: true,
    ...overrides,
  };
}

function promptLog(overrides = {}) {
  return {
    prompt_log_id: "prompt_g6c_validator",
    tenant_id,
    matter_id,
    actor_id,
    retrieval_request_id: "retrieval_g6c_validator",
    prompt_hash: "sha256:g6c",
    created_at: "2026-06-19T08:00:00Z",
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G6-C validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"));
  const g6bReport = await readText(path.join(ROOT, "50-g6-b-analytics-dashboard-export-closeout-report.md"));
  const report = await readText(path.join(ROOT, "51-g6-c-ai-policy-retrieval-audit-report.md"));
  const source = await readText(path.resolve("packages/ai-governance/src/client-matter-g6.js"));
  const indexSource = await readText(path.resolve("packages/ai-governance/src/index.js"));
  const testSource = await readText(path.resolve("packages/ai-governance/test/client-matter-g6-ai-policy-retrieval-audit.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const aiContract = await readJson(path.resolve("contracts/ai-governance-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G6-C TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G6-C TUW missing from G6 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G6-C TUW missing from G6-C report.");
  }

  requireIncludes(plan, "G6-C", "G6_PLAN_DEPENDENCY", "G6-C must build on G6 entry plan evidence.");
  requireIncludes(g6bReport, "G6-B Analytics Dashboard Export Closeout Report", "G6B_DEPENDENCY", "G6-C must depend on G6-B analytics closeout evidence.");
  requireIncludes(riskRegister, "R-005", "R005_DEPENDENCY", "G6-C must preserve AI DMS permission-bypass controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G6-C must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G6-C AI Policy Retrieval Audit Report",
    "This slice does not claim G6 runtime readiness",
    "Matter sensitivity routing",
    "Matter-required retrieval",
    "unauthorized document exclusion",
    "prompt audit evidence",
    "AI Governance descriptor-only boundaries",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G6-C report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "AI_GOVERNANCE_G6C_TUW_COVERAGE",
    "createAiGovernanceG6ModelPolicyDescriptor",
    "createAiGovernanceG6RetrievalRequestDescriptor",
    "createAiGovernanceG6PermissionAwareRetrievalDescriptor",
    "createAiGovernanceG6PromptLogDescriptor",
    "createAiGovernanceG6CPolicyRetrievalAuditCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "AI_GOVERNANCE_G6C_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_SOURCE_EXPORT", "G6-C descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G6-C descriptor export missing test coverage.");
  }

  requireIncludes(indexSource, "client-matter-g6.js", "MISSING_INDEX_EXPORT", "AI Governance index must export G6 Client-Matter descriptors.");

  for (const marker of [
    "model_policy_matter_sensitivity_routing_required",
    "model_policy_privilege_label_routing_required",
    "model_policy_dark_launch_or_disable_switch_required",
    "retrieval_request_matter_required",
    "retrieval_request_source_refs_required",
    "permission_retrieval_acl_evidence_required",
    "permission_retrieval_unauthorized_doc_not_retrieved",
    "permission_retrieval_privilege_label_inheritance_required",
    "prompt_log_prompt_audit_required",
    "prompt_log_raw_prompt_exposure_blocked",
    "prompt_log_runtime_persist_blocked",
    "g6_ai_policy_retrieval_audit_closeout_evidence_required",
    "g6_ai_requires_analytics_closeout_handoff",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G6-C source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g6c:validate"] !== "node scripts/validate-client-matter-os-g6-c.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g6c:validate.");
  }

  if (
    aiContract.program?.program_id !== "RP17" ||
    aiContract.program?.descriptor_only !== true ||
    aiContract.no_write_attestation?.dispatches_ai_governance_runtime !== false ||
    aiContract.no_write_attestation?.dispatches_retrieval_scope_runtime !== false ||
    aiContract.no_write_attestation?.writes_product_state !== false
  ) {
    addFinding("AI_GOVERNANCE_CONTRACT_BOUNDARY", "RP17 AI Governance contract must remain descriptor-only no-runtime evidence.");
  }

  const policy = createAiGovernanceG6ModelPolicyDescriptor({ tenant_id, matter_id, model_policy: modelPolicy() });
  const request = createAiGovernanceG6RetrievalRequestDescriptor({ tenant_id, matter_id, retrieval_request: retrievalRequest() });
  const retrieval = createAiGovernanceG6PermissionAwareRetrievalDescriptor({
    tenant_id,
    matter_id,
    candidate_docs: [document()],
    authorized_doc_ids: ["doc_g6c_authorized"],
    retrieved_doc_ids: ["doc_g6c_authorized"],
    acl_evidence: [{ actor_id, document_id: "doc_g6c_authorized", permission: "read" }],
  });
  const prompt = createAiGovernanceG6PromptLogDescriptor({ tenant_id, matter_id, actor_id, prompt_log: promptLog() });
  const closeout = createAiGovernanceG6CPolicyRetrievalAuditCloseoutDescriptor({
    tenant_id,
    descriptors: [policy, request, retrieval, prompt],
    analytics_g6b_closed: true,
  });

  if (policy.outcome !== "review_required" || policy.model_policy_receipt.matter_sensitivity_routing_tested !== true) {
    addFinding("MODEL_POLICY", "ModelPolicy descriptor must require Matter sensitivity routing evidence.");
  }
  if (request.outcome !== "review_required" || request.retrieval_request_receipt.matter_required_tested !== true) {
    addFinding("RETRIEVAL_REQUEST", "RetrievalRequest descriptor must require Matter context evidence.");
  }
  if (retrieval.outcome !== "review_required" || retrieval.permission_retrieval_receipt.unauthorized_doc_excluded !== true) {
    addFinding("PERMISSION_RETRIEVAL", "Permission-aware retrieval descriptor must exclude unauthorized documents.");
  }
  if (prompt.outcome !== "review_required" || prompt.prompt_log_receipt.prompt_audit_tested !== true) {
    addFinding("PROMPT_LOG", "PromptLog descriptor must require prompt audit evidence.");
  }
  if (closeout.outcome !== "review_required" || closeout.tuw_coverage.length !== 4 || closeout.closeout_receipt.runtime_readiness_claim !== "open") {
    addFinding("G6C_CLOSEOUT", "G6-C closeout must summarize four TUWs while keeping runtime readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G6-C validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G6-C validation passed.");
console.log("g6c_tuws: LFOS-G6-W10-T001/LFOS-G6-W10-T002/LFOS-G6-W10-T003/LFOS-G6-W10-T004");
console.log("model_policy: matter_sensitivity_privilege_routing_required");
console.log("retrieval_request: matter_required");
console.log("permission_retrieval: unauthorized_doc_not_retrieved");
console.log("prompt_log: prompt_audit_required");
console.log("g6_runtime_readiness_claim: open");
