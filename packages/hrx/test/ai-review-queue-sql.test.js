import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqlHrxAiReviewQueue } from "../src/ai/review-queue-sql.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

test("SQL HRX AI review queue persists review items across store reopen", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "hrx-ai-review-")), "store.json");
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  const queue = createSqlHrxAiReviewQueue({ store, clock: () => "2026-06-20T00:00:00.000Z" });
  queue.enqueue({
    tenant_id: "tenant-a",
    review_id: "review-ai-001",
    interaction_id: "ai-001",
    risk_level: "critical",
    reason: "hrx_ai_must_not_make_final_people_decisions",
    answer_status: "blocked",
    decision_domain: "hire",
    source_refs: ["HRX:decision-guard"],
    created_by: "hr-001",
  });
  store.close();

  const reopenedStore = createFileHrxStore({ filePath });
  const reopenedQueue = createSqlHrxAiReviewQueue({ store: reopenedStore, clock: () => "2026-06-20T00:01:00.000Z" });
  const [review] = reopenedQueue.list({ tenant_id: "tenant-a" });
  assert.equal(review.review_id, "review-ai-001");
  assert.equal(review.state, "pending_review");
  assert.deepEqual(review.source_refs, ["HRX:decision-guard"]);

  const resolved = reopenedQueue.resolve(
    { tenant_id: "tenant-a", review_id: "review-ai-001" },
    { state: "rejected", resolved_by: "reviewer-001" },
  );
  assert.equal(resolved.state, "rejected");
  reopenedStore.close();
});
