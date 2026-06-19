#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const REQUIRED_FILES = Object.freeze([
  "apps/api/src/ai-rag-governance-runtime-context.js",
  "apps/api/src/server.js",
  "apps/api/test/cmp-g9-ai-rag-governance-api.test.js",
  "docs/reorganization/client-matter-os/cmp-v1/11-cmp-g9-ai-rag-governance-runtime-report.md",
]);

const REQUIRED_ROUTES = Object.freeze([
  "/api/ai-rag-governance/runtime/evidence",
  "/api/ai-rag-governance/model-policies",
  "/api/ai-rag-governance/retrieval-requests",
  "/api/ai-rag-governance/permission-retrieval",
  "/api/ai-rag-governance/prompt-logs",
  "/api/ai-rag-governance/policy-retrieval-closeout",
  "/api/ai-rag-governance/ai-outputs",
  "/api/ai-rag-governance/citations",
  "/api/ai-rag-governance/human-review",
  "/api/ai-rag-governance/disable-switch",
  "/api/ai-rag-governance/ai-output-review-closeout",
  "/api/ai-rag-governance/legal-workflows",
  "/api/ai-rag-governance/workflow-builder",
  "/api/ai-rag-governance/ai-output-exports",
  "/api/ai-rag-governance/legal-workflows-closeout",
  "/api/ai-rag-governance/permission-before-ai",
  "/api/ai-rag-governance/rag-answer",
  "/api/ai-rag-governance/ui/review-console",
]);

const REQUIRED_RUNTIME_MARKERS = Object.freeze([
  "CMP_G9_TUW_IDS",
  "AI_RAG_GOVERNANCE_BOUNDED_CONTEXT",
  "createAiRagGovernanceRuntimeContext",
  "createAiRagGovernanceCmpG9RuntimeEvidence",
  "handleAiRagGovernanceApiRequest",
  "requireNoModelDispatch",
  "permission_before_ai_required",
  "retrieval_authorization_required",
  "citation_required_for_confirm",
  "human_review_required",
  "ai_model_dispatch_allowed: false",
  "auto_final_legal_decision_allowed: false",
  "createAiGovernanceG6PermissionAwareRetrievalDescriptor",
  "createAiGovernanceG6HumanReviewQueueDescriptor",
  "createAiLegalWorkflowsG6AIOutputExportDescriptor",
  "runtime_api_evidence_only__durable_persistence_open",
]);

const REQUIRED_TEST_MARKERS = Object.freeze([
  "health descriptor exposes AI/RAG governance after G1-G8",
  "blocks direct model dispatch and enforces permission-before-AI retrieval",
  "model policy, retrieval request, and prompt log remain review-only",
  "AI output requires candidate state, citations, human review, and disable switch evidence",
  "legal workflow and AI output export block auto-final and ACL bypass paths",
  "RAG answer, review console, and runtime evidence preserve no-R4 boundary",
]);

const CMP_G9_TUWS = Object.freeze(
  Array.from({ length: 18 }, (_, index) => `CMP-G9-W09-T${String(index + 1).padStart(3, "0")}`),
);

function addFinding(findings, code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(file) {
  try {
    await stat(path.resolve(file));
    return true;
  } catch {
    return false;
  }
}

async function readText(file) {
  return readFile(path.resolve(file), "utf8");
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}

const findings = [];

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding(findings, "MISSING_FILE", `Missing CMP-G9 runtime artifact: ${file}`);
}

if (findings.length === 0) {
  const runtime = await readText("apps/api/src/ai-rag-governance-runtime-context.js");
  const server = await readText("apps/api/src/server.js");
  const tests = await readText("apps/api/test/cmp-g9-ai-rag-governance-api.test.js");
  const report = await readText("docs/reorganization/client-matter-os/cmp-v1/11-cmp-g9-ai-rag-governance-runtime-report.md");
  const crosswalk = await readText("docs/reorganization/client-matter-os/cmp-v1/cmp-v1-tuw-crosswalk.csv");
  const pkg = await readJson("package.json");

  for (const tuwId of CMP_G9_TUWS) {
    if (!runtime.includes(tuwId)) {
      addFinding(findings, "MISSING_RUNTIME_TUW", "Runtime source must trace every CMP-G9 TUW.", { tuwId });
    }
    if (!report.includes(tuwId)) {
      addFinding(findings, "MISSING_REPORT_TUW", "Runtime report must trace every CMP-G9 TUW.", { tuwId });
    }
    if (!crosswalk.includes(tuwId)) {
      addFinding(findings, "MISSING_CROSSWALK_TUW", "CMP v1 crosswalk must contain every CMP-G9 TUW.", { tuwId });
    }
  }

  for (const route of REQUIRED_ROUTES) {
    if (!runtime.includes(route)) {
      addFinding(findings, "MISSING_RUNTIME_ROUTE", "CMP-G9 runtime missing required route.", { route });
    }
    if (!report.includes(route)) {
      addFinding(findings, "MISSING_REPORT_ROUTE", "CMP-G9 report missing required route.", { route });
    }
  }

  for (const marker of REQUIRED_RUNTIME_MARKERS) {
    if (!runtime.includes(marker)) {
      addFinding(findings, "MISSING_RUNTIME_MARKER", "CMP-G9 runtime source missing required marker.", { marker });
    }
  }

  for (const marker of REQUIRED_TEST_MARKERS) {
    if (!tests.includes(marker)) {
      addFinding(findings, "MISSING_TEST_MARKER", "CMP-G9 API test missing required behavior marker.", { marker });
    }
  }

  for (const phrase of ["AI_RAG_GOVERNANCE_BOUNDED_CONTEXT", "AI_RAG_GOVERNANCE_RUNTIME", "isAiRagGovernancePath", "handleAiRagGovernanceApiRequest"]) {
    if (!server.includes(phrase)) {
      addFinding(findings, "MISSING_SERVER_WIRING", "API server is not wired to the CMP-G9 runtime.", { phrase });
    }
  }

  if (
    !runtime.includes('"CMP-G8-W08"') ||
    !runtime.includes('"CMP-G1-W01"') ||
    !runtime.includes('"CMP-G6-W06"')
  ) {
    addFinding(findings, "DEPENDENCY_ORDER", "CMP-G9 runtime evidence must preserve G1-G8 dependencies.");
  }

  for (const phrase of ["Permission-before-AI", "Unauthorized retrieval is blocked", "Citation is required", "Human review is required", "Direct AI model dispatch"]) {
    if (!report.includes(phrase)) {
      addFinding(findings, "MISSING_REPORT_GUARDRAIL", "CMP-G9 report missing required guardrail text.", { phrase });
    }
  }

  const forbiddenReadinessClaims = ["R4-candidate", "runtime_readiness: \"R4", "runtime_readiness_claim: \"R4"];
  for (const claim of forbiddenReadinessClaims) {
    if (runtime.includes(claim) || report.includes(claim)) {
      addFinding(findings, "PREMATURE_R4_CLAIM", "CMP-G9 runtime evidence must not claim R4 before durable persistence.", {
        claim,
      });
    }
  }

  const readinessBoundary = "runtime_api_evidence_only__durable_persistence_open";
  if (!runtime.includes(readinessBoundary) || !report.includes(readinessBoundary)) {
    addFinding(findings, "READINESS_BOUNDARY", "CMP-G9 runtime and report must expose the durable-persistence-open boundary.");
  }

  if (!pkg.scripts?.["client-matter:cmp-g9:validate"]) {
    addFinding(findings, "MISSING_NPM_SCRIPT", "package.json missing client-matter:cmp-g9:validate.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS CMP-G9 runtime validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) console.error(`  ${JSON.stringify(finding.details)}`);
  }
  process.exit(1);
}

console.log("Client-Matter OS CMP-G9 runtime validation passed.");
console.log("cmp_g9_tuws: 18/18");
console.log("runtime_routes: ai/rag governance model-policy/retrieval/prompt/citation/human-review/legal-workflow/export/review-console");
console.log("behavior_tests: permission-before-ai/model-dispatch-negative/candidate-output/citation/human-review/acl-export");
console.log("runtime_readiness_claim: runtime_api_evidence_only__durable_persistence_open");
