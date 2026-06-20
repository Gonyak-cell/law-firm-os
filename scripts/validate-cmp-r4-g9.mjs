#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const REQUIRED_FILES = [
  "packages/ai-governance/src/runtime-repository.js",
  "packages/ai-governance/src/policy-service.js",
  "packages/ai-governance/src/retrieval-service.js",
  "packages/ai-governance/src/prompt-log-service.js",
  "packages/ai-governance/src/output-service.js",
  "packages/ai-governance/src/citation-ledger-service.js",
  "packages/ai-governance/src/export-control-service.js",
  "packages/ai-governance/src/model-gateway.js",
  "packages/ai-governance/src/audit.js",
  "packages/ai-legal-workflows/src/legal-workflow-service.js",
  "apps/api/src/ai-runtime-context.js",
  "apps/web/src/components/AskSurface.jsx",
  "scripts/validate-cmp-r4-g9.mjs",
  "docs/reorganization/client-matter-os/cmp-v1/r4-g9-closeout.md",
];
const REQUIRED_TESTS = [
  "packages/ai-governance/test/runtime-services.test.js",
  "apps/api/test/cmp-r4-g9-ai.test.js",
  "apps/web/test/ui-regression.test.mjs",
];
const REQUIRED_EVIDENCE = Array.from({ length: 18 }, (_, index) =>
  `docs/reorganization/client-matter-os/cmp-v1/evidence/cmp-g9-${String(index + 1).padStart(3, "0")}.md`,
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

requirePatterns("packages/ai-governance/src/runtime-repository.js", [/filePath/, /recordIdempotency/, /appendAudit/, /promotes_ai_output_to_final: false/]);
requirePatterns("packages/ai-governance/src/policy-service.js", [/createAiPolicy/, /setAiDisableSwitch/, /matter sensitivity routes/, /privilege label routes/]);
requirePatterns("packages/ai-governance/src/retrieval-service.js", [/assertPermissionBeforeAi/, /unauthorized_doc_excluded: true/, /privilege label inheritance required/]);
requirePatterns("packages/ai-governance/src/prompt-log-service.js", [/hashPrompt/, /raw_prompt_included: false/]);
requirePatterns("packages/ai-governance/src/output-service.js", [/createAiOutput/, /HumanReviewTask/, /needs_human_review/, /adjudicateAiOutput/]);
requirePatterns("packages/ai-governance/src/citation-ledger-service.js", [/createCitationLedger/, /citation_source_validation: true/]);
requirePatterns("packages/ai-governance/src/export-control-service.js", [/createAiOutputExport/, /privilege and ACL inheritance/, /external share boundary check/]);
requirePatterns("packages/ai-governance/src/model-gateway.js", [/invokeModelGateway/, /policy-checked retrieval/]);
requirePatterns("packages/ai-legal-workflows/src/legal-workflow-service.js", [/human approval step/, /auto final legal decision is blocked/]);
requirePatterns("apps/api/src/ai-runtime-context.js", [/AI_BOUNDED_CONTEXT/, /runtime_write_ready: true/, /production_ready_claim: false/, /handleAiRetrievalCreate/, /handleAiOutputCreate/]);
requirePatterns("apps/web/src/components/AskSurface.jsx", [/data-cmp-g9-ai-runtime/, /fetchAiReviewQueue/, /Permission-before-AI is enforced/]);
requirePatterns("packages/ai-governance/test/runtime-services.test.js", [/persists AI write chain/, /blocks unsafe retrieval/, /disable switch/]);
requirePatterns("apps/api/test/cmp-r4-g9-ai.test.js", [/permission-before-AI/, /persists audit across restart/, /inherited privilege/]);
rejectPatterns("packages/ai-governance/src/runtime-repository.js", [/production_ready_claim: true/]);
rejectPatterns("apps/api/src/ai-runtime-context.js", [/production_ready_claim: true/]);

if (failures.length > 0) {
  console.error("CMP R4 G9 validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CMP R4 G9 validation passed.");
console.log("g9_runtime_tuws_with_evidence: 18/18");
console.log("remaining_g9_tuw: none");
