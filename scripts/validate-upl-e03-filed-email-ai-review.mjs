#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createFiledEmailAiMatterReviewService,
  FILED_EMAIL_AI_REVIEW_BOUNDARY,
} from "../packages/matter/src/email-ai-matter-review-service.js";

const ROOT = process.cwd();
const requiredFiles = [
  "packages/matter/src/email-ai-matter-review-service.js",
  "packages/matter/test/email-ai-matter-review-service.test.js",
  "packages/matter/src/index.js",
  "packages/email-dms/src/email-filing-service.js",
  "scripts/run-upl-e03-filed-email-ai-review-proof.mjs",
  "artifacts/manual-qa/upl-e03-filed-email-ai-review-proof.json",
  "artifacts/manual-qa/upl-e03-filed-email-ai-review-proof.md",
];

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

for (const file of requiredFiles) {
  assert.equal(existsSync(resolve(ROOT, file)), true, `missing required file: ${file}`);
}

const serviceSource = read("packages/matter/src/email-ai-matter-review-service.js");
const serviceTest = read("packages/matter/test/email-ai-matter-review-service.test.js");
const matterIndex = read("packages/matter/src/index.js");
const proofScript = read("scripts/run-upl-e03-filed-email-ai-review-proof.mjs");
const artifact = JSON.parse(read("artifacts/manual-qa/upl-e03-filed-email-ai-review-proof.json"));

for (const marker of [
  "FILED_EMAIL_AI_REVIEW_BOUNDARY",
  "auto_create_matter_before_lawyer_approval: false",
  "pending_lawyer_approval",
  "createMatter(",
  "createMatterTask",
  "createMatterCalendarEvent",
  "raw_email_body_stored: false",
  "provider_payload_stored: false",
]) {
  assert.ok(serviceSource.includes(marker), `service missing marker: ${marker}`);
}

for (const marker of [
  "without auto-creating matter",
  "lawyer approval materializes matter",
  "missing approval do not create matter",
  "FILED_EMAIL_AI_REVIEW_BOUNDARY",
]) {
  assert.ok(serviceTest.includes(marker), `test missing marker: ${marker}`);
}

assert.ok(matterIndex.includes("email-ai-matter-review-service.js"), "matter index must export E03 service");
assert.ok(proofScript.includes("fileEmailThreadToMatter"), "proof must start from filed email service");
assert.ok(proofScript.includes("e03-no-approval-zero-auto-create"), "proof must include no-approval regression");

const service = createFiledEmailAiMatterReviewService({ now: () => "2026-07-03T00:00:00.000Z" });
const queued = service.analyzeFiledEmail({
  actor_id: "validator",
  filed_email: {
    tenant_id: "tenant-e03-validator",
    email_thread_id: "email-thread-e03-validator",
    subject: "Validator email",
    body_preview: "Deadline 2026-07-31",
  },
});
assert.equal(service.listMatters().length, 0);
const approved = service.approveReview({ review_id: queued.review_item.review_id, lawyer_id: "lawyer-validator" });
assert.equal(approved.matter_created, true);
assert.equal(service.listMatters().length, 1);
assert.equal(service.listTasks().length, 1);
assert.equal(service.listDeadlines().length, 1);
assert.equal(FILED_EMAIL_AI_REVIEW_BOUNDARY.auto_create_matter_before_lawyer_approval, false);
assert.equal(FILED_EMAIL_AI_REVIEW_BOUNDARY.lawyer_approval_required, true);
assert.equal(FILED_EMAIL_AI_REVIEW_BOUNDARY.production_ready_claim, false);

assert.equal(artifact.pass, true, "proof artifact must pass");
assert.deepEqual(artifact.tuw_ids, ["UPL-E-03"]);
assert.equal(artifact.production_ready_claim, false);
assert.equal(artifact.go_live_claim, false);
assert.equal(artifact.external_model_claim, false);
assert.equal(artifact.before_approval.matter_count, 0);
assert.equal(artifact.before_approval.task_count, 0);
assert.equal(artifact.before_approval.deadline_count, 0);
assert.equal(artifact.after_approval.matter_count, 1);
assert.equal(artifact.after_approval.task_count, 1);
assert.equal(artifact.after_approval.deadline_count, 1);
assert.equal(artifact.filed_email.raw_body_included, false);
assert.equal(artifact.filed_email.provider_payload_included, false);

for (const id of [
  "e03-filed-email-record-created",
  "e03-ai-summary-and-candidates-created",
  "e03-review-queue-requires-lawyer-approval",
  "e03-no-approval-zero-auto-create",
  "e03-lawyer-approval-creates-matter-task-deadline",
  "e03-approval-ref-bound-to-lawyer",
  "e03-regression-unapproved-second-review-zero-matter",
  "e03-no-raw-email-body-or-provider-payload",
]) {
  assert.equal(artifact.checks.find((check) => check.id === id)?.passed, true, `artifact check failed: ${id}`);
}

console.log(JSON.stringify({
  pass: true,
  validator: "validate-upl-e03-filed-email-ai-review",
  artifact: "artifacts/manual-qa/upl-e03-filed-email-ai-review-proof.json",
  review_id: artifact.review_queue.review_id,
}, null, 2));
