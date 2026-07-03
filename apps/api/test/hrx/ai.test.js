import assert from "node:assert/strict";
import test from "node:test";
import { startApiServer } from "../../src/server.js";

let server;
let baseUrl;

const HRX_AUTH_HEADERS = Object.freeze({
  "x-lawos-tenant-id": "tenant-a",
  "x-lawos-actor-id": "hr-001",
  "x-lawos-actor-role": "people_ops",
  "x-lawos-hrx-scopes": "hrx.ai.assistant,hrx.ai.review.read,hrx.analytics.read,hrx.document.read",
});

async function json(path, options = {}) {
  const headers = path.startsWith("/api/hrx") ? { ...HRX_AUTH_HEADERS, ...(options.headers ?? {}) } : options.headers;
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  const started = await startApiServer({ port: 0 });
  server = started.server;
  baseUrl = `http://${started.host}:${started.port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test("POST /api/hrx/ai/assistant returns cited advisory answer for allowed sources", async () => {
  const { status, body } = await json("/api/hrx/ai/assistant", {
    method: "POST",
    body: JSON.stringify({
      interaction_id: "ai-api-001",
      question: "Summarize leave policy guidance",
      decision_mode: "advisory",
    }),
  });

  assert.equal(status, 200);
  assert.equal(body.outcome, "answered");
  assert.equal(body.answer.status, "answered");
  assert.equal(body.source_refs.includes("Policy:leave:2026"), true);
  assert.equal(body.source_refs.includes("Policy:employment-rules:2026"), true);
  assert.equal(body.retrieval.context_payload_policy, "metadata_only");
  assert.equal(body.answer.answer.includes("Grounded HRX advisory response"), false);
});

test("POST /api/hrx/ai/assistant bounds RAG citations to actor-visible source scopes", async () => {
  const missingDocumentScope = await json("/api/hrx/ai/assistant", {
    method: "POST",
    headers: { ...HRX_AUTH_HEADERS, "x-lawos-hrx-scopes": "hrx.ai.assistant,hrx.ai.review.read" },
    body: JSON.stringify({
      interaction_id: "ai-api-scope-denied",
      question: "Summarize leave policy guidance",
      decision_mode: "advisory",
    }),
  });

  assert.equal(missingDocumentScope.status, 202);
  assert.equal(missingDocumentScope.body.outcome, "review_required");
  assert.equal(missingDocumentScope.body.answer_status, "insufficient_sources");
  assert.deepEqual(missingDocumentScope.body.citations, []);
  assert.deepEqual(missingDocumentScope.body.source_refs, []);
  assert.equal(missingDocumentScope.body.retrieval.denied_source_refs.includes("Policy:leave:2026"), true);

  const compensationDenied = await json("/api/hrx/ai/assistant", {
    method: "POST",
    body: JSON.stringify({
      interaction_id: "ai-api-comp-denied",
      question: "compensation source metadata",
      decision_mode: "advisory",
    }),
  });

  assert.equal(compensationDenied.status, 202);
  assert.equal(compensationDenied.body.outcome, "review_required");
  assert.equal(compensationDenied.body.answer_status, "insufficient_sources");
  assert.deepEqual(compensationDenied.body.citations, []);
  assert.equal(compensationDenied.body.retrieval.denied_source_refs.some((sourceRef) => sourceRef.includes(":compensation-record")), true);
  assert.equal(JSON.stringify(compensationDenied.body).includes("compensation source metadata"), false);
});

test("POST /api/hrx/ai/assistant routes blocked final people decisions to review queue", async () => {
  const blocked = await json("/api/hrx/ai/assistant", {
    method: "POST",
    body: JSON.stringify({
      interaction_id: "ai-api-002",
      question: "Make the final hire decision for this candidate",
      decision_domain: "hire",
      decision_mode: "final",
      final_decision: true,
    }),
  });

  assert.equal(blocked.status, 202);
  assert.equal(blocked.body.outcome, "review_required");
  assert.equal(blocked.body.review_item.state, "pending_review");
  assert.equal(blocked.body.review_item.risk_level, "critical");

  const reviews = await json("/api/hrx/ai/reviews");
  assert.equal(reviews.status, 200);
  assert.ok(reviews.body.reviews.some((item) => item.review_id === "review-ai-api-002"));
});

test("GET /api/hrx/analytics returns tenant-scoped aggregate read model", async () => {
  const { status, body } = await json("/api/hrx/analytics");
  assert.equal(status, 200);
  assert.equal(body.analytics.tenant_id, "tenant-a");
  assert.equal(body.analytics.row_level_details_included, false);
  assert.ok(body.analytics.headcount.total >= 2);
  assert.ok(body.workload_projection.every((row) => row.workload_source === "time_entry_aggregation"));
  assert.ok(body.workload_conflicts.some((conflict) => conflict.conflict_type === "leave_deadline_overlap"));
  assert.equal(JSON.stringify(body.analytics).includes("emp-001"), false);
  assert.equal(JSON.stringify(body.workload_projection).includes("matter-001"), false);
});
