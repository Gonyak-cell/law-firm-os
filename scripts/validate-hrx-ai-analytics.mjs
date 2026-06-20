#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHrxAnalyticsExport } from "../packages/hrx/src/analytics-export.js";
import { createHrxAnalyticsSnapshot } from "../packages/hrx/src/analytics-snapshot.js";
import { createHrxAiAnswer, groundHrxAiAnswer } from "../packages/hrx/src/ai/answer-schema.js";
import { validateHrxAiCitations } from "../packages/hrx/src/ai/citation-validator.js";
import { enforceHrxNoFinalDecisionGuard } from "../packages/hrx/src/ai/decision-guard.js";
import { createHrxModelGateway } from "../packages/hrx/src/ai/model-gateway.js";
import { ingestHrxAiSourceChunks } from "../packages/hrx/src/ai/source-ingestion.js";
import { createHrxPeopleAnalyticsReadModel } from "../packages/hrx/src/analytics.js";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

for (const file of [
  "packages/hrx/src/ai/source-ingestion.js",
  "packages/hrx/src/ai/citation-validator.js",
  "packages/hrx/src/ai/model-gateway.js",
  "packages/hrx/src/ai/decision-guard.js",
  "packages/hrx/src/ai/review-queue-sql.js",
  "packages/hrx/src/ai/audit.js",
  "packages/hrx/src/ai/rag.js",
  "packages/hrx/src/analytics-snapshot.js",
  "packages/hrx/src/analytics-export.js",
  "packages/hrx/src/analytics.js",
  "packages/matter/src/hrx-workload-projection.js",
  "apps/web/src/people/ai/HRAIAssistant.tsx",
  "apps/web/src/people/analytics/HRAnalytics.tsx",
  "packages/hrx/test/ai-source-ingestion.test.js",
  "packages/hrx/test/ai-citation-validator.test.js",
  "packages/hrx/test/ai-model-gateway.test.js",
  "packages/hrx/test/ai-review-queue-sql.test.js",
  "packages/hrx/test/analytics-snapshot.test.js",
  "packages/hrx/test/analytics-export.test.js",
]) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
}

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.scripts?.["hrx:ai:validate"] === "node scripts/validate-hrx-ai-analytics.mjs", "package script hrx:ai:validate missing");

const decisionGuard = read("packages/hrx/src/ai/decision-guard.js");
for (const domain of ["hire", "fire", "pay", "evaluation", "discipline", "termination"]) {
  assert(decisionGuard.includes(domain), `decision guard missing ${domain}`);
}

const rag = read("packages/hrx/src/ai/rag.js");
assert(rag.includes("authz.evaluate"), "RAG retriever must evaluate authz for every candidate source");
assert(rag.includes("metadata_only"), "RAG prompt context must stay metadata_only");

const audit = read("packages/hrx/src/ai/audit.js");
assert(audit.includes("prompt_hash") && audit.includes("output_hash"), "AI audit must hash prompt and output");
assert(audit.includes('payload_policy: "metadata_only"'), "AI audit must keep metadata-only payload policy");

const aiUi = read("apps/web/src/people/ai/HRAIAssistant.tsx");
assert(aiUi.includes("Citations:") && aiUi.includes("Review state:"), "AI assistant UI must show citations and review state");

const analyticsUi = read("apps/web/src/people/analytics/HRAnalytics.tsx");
assert(analyticsUi.includes("Aggregate only") && analyticsUi.includes("row_level_details_included"), "Analytics UI must show aggregate-only privacy state");

try {
  const chunks = ingestHrxAiSourceChunks({
    tenant_id: "tenant-a",
    source_ref: "Policy:leave:2026",
    chunks: [{ chunk_id: "chunk-001", text: "policy text hash input" }],
  });
  assert(chunks[0].chunk_hash.length === 64, "source ingestion must create chunk hash");
  assert(JSON.stringify(chunks).includes("policy text hash input") === false, "source ingestion must not store raw chunk text");

  const missingCitation = createHrxAiAnswer({ answer: "Uncited answer", citations: [] });
  assert(missingCitation.status === "insufficient_sources", "answers without citations must fail");
  const citationDecision = validateHrxAiCitations({
    answer: { status: "answered", answer: "ok", citations: [{ source_ref: "Policy:leave:2026" }] },
    allowed_source_refs: ["Policy:leave:2026"],
  });
  assert(citationDecision.ok === true, "allowed citation must pass");
  const grounded = groundHrxAiAnswer({
    answer: "ok",
    citations: [{ source_ref: "Forbidden:source" }],
    allowed_source_refs: ["Policy:leave:2026"],
  });
  assert(grounded.status === "insufficient_sources", "answers citing disallowed sources must fail");

  const guard = enforceHrxNoFinalDecisionGuard({ decision_domain: "discipline", final_decision: true });
  assert(guard.status === "blocked", "discipline final decision must be blocked");

  const gateway = createHrxModelGateway();
  const gatewayResult = await gateway.complete({ question: "test" });
  assert(gatewayResult.status === "blocked" && gatewayResult.external_call_made === false, "model gateway must be disabled by default");

  const analytics = createHrxPeopleAnalyticsReadModel({
    tenant_id: "tenant-a",
    employees: [{ tenant_id: "tenant-a", employee_id: "emp-001", status: "active" }],
    leave_requests: [],
    applications: [],
    workload_projection: [],
  });
  assert(analytics.metric_grain === "tenant_aggregate", "analytics must be tenant aggregate");
  const snapshot = createHrxAnalyticsSnapshot({
    tenant_id: "tenant-a",
    period_start: "2026-06-01",
    period_end: "2026-06-30",
    analytics,
  });
  assert(snapshot.snapshot_policy === "aggregate_only", "analytics snapshot must be aggregate_only");
  const exported = createHrxAnalyticsExport({
    analytics,
    principal: { hrx_scopes: ["hrx.analytics.read"] },
    classification: "aggregate",
  });
  assert(exported.status === "ready", "aggregate analytics export must be ready with read scope");
} catch (error) {
  errors.push(error.stack ?? error.message);
}

if (errors.length > 0) {
  console.error("HRX AI/analytics validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX AI/analytics validation passed.");
console.log("scope: source_grounded_ai_analytics");
