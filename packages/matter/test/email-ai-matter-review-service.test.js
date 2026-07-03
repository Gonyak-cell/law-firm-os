import assert from "node:assert/strict";
import test from "node:test";

import {
  createFiledEmailAiMatterReviewService,
  FILED_EMAIL_AI_REVIEW_BOUNDARY,
} from "../src/email-ai-matter-review-service.js";

const filedEmail = Object.freeze({
  tenant_id: "tenant-e03",
  email_thread_id: "email-thread-e03-001",
  subject: "New advisory request for supply agreement",
  from: { name: "Acme Legal", email: "legal@example.com" },
  body_ref: "body-ref:email-thread-e03-001",
  body_preview: "Please review the supply agreement and respond before 2026-07-21.",
});

test("UPL-E-03 filed email AI analysis queues summary, task, and deadline candidates without auto-creating matter", () => {
  const service = createFiledEmailAiMatterReviewService({ now: () => "2026-07-03T00:00:00.000Z" });
  const queued = service.analyzeFiledEmail({ filed_email: filedEmail, actor_id: "email-filing-user" });

  assert.equal(queued.outcome, "queued_for_lawyer_review");
  assert.equal(queued.matter_created, false);
  assert.equal(queued.auto_create_matter_count, 0);
  assert.equal(service.listMatters().length, 0);
  assert.equal(queued.review_item.status, "pending_lawyer_approval");
  assert.equal(queued.review_item.lawyer_approval_required, true);
  assert.match(queued.review_item.ai_summary, /New advisory request/);
  assert.equal(queued.review_item.task_candidates.length, 1);
  assert.equal(queued.review_item.deadline_candidates.length, 1);
  assert.equal(queued.review_item.deadline_candidates[0].starts_on, "2026-07-21");
  assert.equal(queued.review_item.raw_email_body_stored, false);
  assert.equal(queued.review_item.provider_payload_stored, false);
});

test("UPL-E-03 lawyer approval materializes matter, task, and deadline candidates", () => {
  const service = createFiledEmailAiMatterReviewService({ now: () => "2026-07-03T00:00:00.000Z" });
  const queued = service.analyzeFiledEmail({ filed_email: filedEmail, actor_id: "email-filing-user" });
  const approved = service.approveReview({ review_id: queued.review_item.review_id, lawyer_id: "lawyer-001" });

  assert.equal(approved.outcome, "approved_matter_created");
  assert.equal(approved.matter_created, true);
  assert.equal(service.listMatters().length, 1);
  assert.equal(service.listTasks().length, 1);
  assert.equal(service.listDeadlines().length, 1);
  assert.equal(approved.matter.approval_ref, `lawyer_approval:${queued.review_item.review_id}:lawyer-001`);
  assert.equal(approved.task_rows[0].source_ref, "DmsEmailThread:email-thread-e03-001");
  assert.equal(approved.deadline_rows[0].starts_at, "2026-07-21T09:00:00.000Z");
  assert.equal(approved.review_item.materialized_matter_count, 1);
  assert.equal(approved.review_item.materialized_task_count, 1);
  assert.equal(approved.review_item.materialized_deadline_count, 1);
});

test("UPL-E-03 rejection and missing approval do not create matter", () => {
  const service = createFiledEmailAiMatterReviewService({ now: () => "2026-07-03T00:00:00.000Z" });
  const queued = service.analyzeFiledEmail({ filed_email: filedEmail, actor_id: "email-filing-user" });

  assert.throws(() => service.approveReview({ review_id: queued.review_item.review_id, decision: "approved" }), /lawyer_id is required/);
  assert.equal(service.listMatters().length, 0);

  const rejected = service.approveReview({ review_id: queued.review_item.review_id, lawyer_id: "lawyer-001", decision: "rejected" });
  assert.equal(rejected.outcome, "rejected");
  assert.equal(rejected.matter_created, false);
  assert.equal(service.listMatters().length, 0);
});

test("UPL-E-03 boundary forbids auto-create and production claim", () => {
  assert.equal(FILED_EMAIL_AI_REVIEW_BOUNDARY.auto_create_matter_before_lawyer_approval, false);
  assert.equal(FILED_EMAIL_AI_REVIEW_BOUNDARY.analysis_mode, "rule_based_triage");
  assert.equal(FILED_EMAIL_AI_REVIEW_BOUNDARY.external_model_claim, false);
  assert.equal(FILED_EMAIL_AI_REVIEW_BOUNDARY.lawyer_approval_required, true);
  assert.equal(FILED_EMAIL_AI_REVIEW_BOUNDARY.raw_email_body_stored, false);
  assert.equal(FILED_EMAIL_AI_REVIEW_BOUNDARY.production_ready_claim, false);
});
