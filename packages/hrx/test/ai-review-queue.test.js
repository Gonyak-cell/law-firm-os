import assert from "node:assert/strict";
import test from "node:test";
import {
  createHrxAiReviewItem,
  createInMemoryHrxAiReviewQueue,
  routeHrxAiAnswerToReview,
} from "../src/ai/review-queue.js";

test("AI review queue stores high-risk metadata without prompt or answer payload", () => {
  const item = createHrxAiReviewItem({
    tenant_id: "tenant-a",
    review_id: "review-ai-001",
    interaction_id: "ai-001",
    risk_level: "high",
    reason: "insufficient_sources",
    answer_status: "insufficient_sources",
    source_refs: ["Policy:leave:2026"],
    created_by: "hr-001",
  });

  assert.equal(item.state, "pending_review");
  assert.deepEqual(item.source_refs, ["Policy:leave:2026"]);
  assert.equal(Object.hasOwn(item, "answer"), false);
  assert.equal(Object.hasOwn(item, "prompt"), false);
  assert.throws(() => createHrxAiReviewItem({ ...item, answer: "raw answer" }), /must not include answer/);
});

test("AI review queue routes blocked final decisions to critical pending review", () => {
  const queue = createInMemoryHrxAiReviewQueue();
  const review = routeHrxAiAnswerToReview({
    queue,
    context: { tenant_id: "tenant-a", actor_id: "hr-001" },
    interaction_id: "ai-002",
    answer: { status: "blocked", source_refs: ["HRX:decision-guard"] },
    guard: { status: "blocked", decision_domain: "hire", reason: "hrx_ai_must_not_make_final_people_decisions" },
  });

  assert.equal(review.review_id, "review-ai-002");
  assert.equal(review.risk_level, "critical");
  assert.equal(review.decision_domain, "hire");
  assert.equal(queue.list({ tenant_id: "tenant-a" }).length, 1);
});

test("AI review queue resolves pending reviews only", () => {
  const queue = createInMemoryHrxAiReviewQueue([
    {
      tenant_id: "tenant-a",
      review_id: "review-ai-003",
      interaction_id: "ai-003",
      risk_level: "high",
      reason: "review_required",
      created_by: "hr-001",
    },
  ]);
  const approved = queue.resolve(
    { tenant_id: "tenant-a", review_id: "review-ai-003" },
    { state: "approved_for_response", resolved_by: "reviewer-001" },
  );
  assert.equal(approved.state, "approved_for_response");
  assert.throws(
    () => queue.resolve({ tenant_id: "tenant-a", review_id: "review-ai-003" }, { state: "rejected", resolved_by: "reviewer-002" }),
    /must be pending_review/,
  );
});
