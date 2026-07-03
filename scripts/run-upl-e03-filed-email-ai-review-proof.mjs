#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileEmailThreadToMatter } from "../packages/email-dms/src/email-filing-service.js";
import { createFiledEmailAiMatterReviewService } from "../packages/matter/src/email-ai-matter-review-service.js";

const ROOT = process.cwd();
const JSON_PATH = "artifacts/manual-qa/upl-e03-filed-email-ai-review-proof.json";
const MD_PATH = "artifacts/manual-qa/upl-e03-filed-email-ai-review-proof.md";

function createRepository() {
  const rows = new Map();
  function key(row) {
    const id = row.email_thread_id ?? row.matter_id ?? row.task_id ?? row.event_id;
    return `${row.tenant_id}:${row.model_type}:${id}`;
  }
  return Object.freeze({
    get(query = {}) {
      const id = query.email_thread_id ?? query.matter_id ?? query.task_id ?? query.event_id;
      return rows.get(`${query.tenant_id}:${query.model_type}:${id}`) ?? null;
    },
    create(row) {
      rows.set(key(row), Object.freeze({ ...row }));
      return rows.get(key(row));
    },
    list() {
      return [...rows.values()];
    },
  });
}

function check(id, passed, evidence) {
  return Object.freeze({ id, passed: Boolean(passed), evidence });
}

const auditEvents = [];
const repository = createRepository();
const filed = fileEmailThreadToMatter({
  repository,
  actor_id: "email-filing-user",
  audit: { append: (event) => auditEvents.push(Object.freeze({ ...event })) },
  thread: {
    tenant_id: "tenant-e03-proof",
    matter_id: "matter-email-triage-inbox",
    email_thread_id: "email-thread-e03-proof-001",
    subject: "New advisory request for supply agreement",
    from: { name: "Acme Legal", email: "legal@example.com" },
    to: [{ email: "lawyer@example.com" }],
    body_ref: "body-ref:email-thread-e03-proof-001",
    body_preview: "Please prepare a review task and note the response deadline 2026-07-21.",
    received_at: "2026-07-03T00:00:00.000Z",
  },
});
assert.equal(filed.outcome, "created");

const service = createFiledEmailAiMatterReviewService({ now: () => "2026-07-03T00:00:00.000Z" });
const queued = service.analyzeFiledEmail({
  filed_email: {
    ...filed.thread,
    client_id: "client-e03-proof",
    client_display_name: "Acme Legal",
  },
  actor_id: "email-ai-reviewer",
  matter_candidate: {
    matter_id: "matter-e03-approved-from-email",
    client_id: "client-e03-proof",
    client_display_name: "Acme Legal",
  },
});
const beforeApproval = {
  review_status: queued.review_item.status,
  matter_count: service.listMatters().length,
  task_count: service.listTasks().length,
  deadline_count: service.listDeadlines().length,
  auto_create_matter_count: queued.auto_create_matter_count,
};

const approved = service.approveReview({ review_id: queued.review_item.review_id, lawyer_id: "lawyer-e03-001" });
const afterApproval = {
  review_status: approved.review_item.status,
  matter_count: service.listMatters().length,
  task_count: service.listTasks().length,
  deadline_count: service.listDeadlines().length,
  matter_id: approved.matter.matter_id,
  approval_ref: approved.matter.approval_ref,
};

const regressionService = createFiledEmailAiMatterReviewService({ now: () => "2026-07-03T00:00:00.000Z" });
const regressionQueued = regressionService.analyzeFiledEmail({
  filed_email: filed.thread,
  actor_id: "email-ai-reviewer",
});

const checks = [
  check("e03-filed-email-record-created", filed.outcome === "created" && filed.thread.raw_body_included === false, {
    email_thread_id: filed.thread.email_thread_id,
    audit_actions: auditEvents.map((event) => event.action),
  }),
  check("e03-ai-summary-and-candidates-created", queued.review_item.ai_summary.includes("New advisory request") && queued.review_item.task_candidates.length === 1 && queued.review_item.deadline_candidates.length === 1, {
    review_id: queued.review_item.review_id,
    deadline: queued.review_item.deadline_candidates[0]?.starts_on,
  }),
  check("e03-review-queue-requires-lawyer-approval", queued.review_item.status === "pending_lawyer_approval" && queued.review_item.lawyer_approval_required === true, {
    status: queued.review_item.status,
  }),
  check("e03-no-approval-zero-auto-create", beforeApproval.matter_count === 0 && beforeApproval.task_count === 0 && beforeApproval.deadline_count === 0 && beforeApproval.auto_create_matter_count === 0, beforeApproval),
  check("e03-lawyer-approval-creates-matter-task-deadline", approved.outcome === "approved_matter_created" && afterApproval.matter_count === 1 && afterApproval.task_count === 1 && afterApproval.deadline_count === 1, afterApproval),
  check("e03-approval-ref-bound-to-lawyer", approved.matter.approval_ref === `lawyer_approval:${queued.review_item.review_id}:lawyer-e03-001`, {
    approval_ref: approved.matter.approval_ref,
  }),
  check("e03-regression-unapproved-second-review-zero-matter", regressionQueued.matter_created === false && regressionService.listMatters().length === 0, {
    review_id: regressionQueued.review_item.review_id,
    matter_count: regressionService.listMatters().length,
  }),
  check("e03-no-raw-email-body-or-provider-payload", queued.review_item.raw_email_body_stored === false && queued.review_item.provider_payload_stored === false, {
    raw_email_body_stored: queued.review_item.raw_email_body_stored,
    provider_payload_stored: queued.review_item.provider_payload_stored,
  }),
];

const artifact = {
  schema_version: "lawos.upl_e03.filed_email_ai_review_proof.v1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["UPL-E-03"],
  pass: checks.every((item) => item.passed),
  production_ready_claim: false,
  go_live_claim: false,
  external_model_claim: false,
  source_trace: {
    email_filing: "packages/email-dms/src/email-filing-service.js#fileEmailThreadToMatter",
    ai_review_service: "packages/matter/src/email-ai-matter-review-service.js#createFiledEmailAiMatterReviewService",
    matter_model: "packages/matter/src/model.js#createMatter/createMatterTask/createMatterCalendarEvent",
  },
  filed_email: {
    outcome: filed.outcome,
    email_thread_id: filed.thread.email_thread_id,
    body_ref: filed.thread.body_ref,
    raw_body_included: filed.thread.raw_body_included,
    provider_payload_included: filed.thread.provider_payload_included,
  },
  review_queue: {
    review_id: queued.review_item.review_id,
    status: queued.review_item.status,
    ai_summary: queued.review_item.ai_summary,
    task_candidate_count: queued.review_item.task_candidates.length,
    deadline_candidate_count: queued.review_item.deadline_candidates.length,
  },
  before_approval: beforeApproval,
  after_approval: afterApproval,
  checks,
};

mkdirSync(resolve(ROOT, dirname(JSON_PATH)), { recursive: true });
writeFileSync(resolve(ROOT, JSON_PATH), `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(
  resolve(ROOT, MD_PATH),
  `# UPL-E-03 Filed Email AI Review Proof

Generated: ${artifact.generated_at}

Overall result: ${artifact.pass ? "PASS" : "FAIL"}

## Evidence

| Check | Result | Evidence |
|---|---|---|
${checks.map((item) => `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} | \`${JSON.stringify(item.evidence).replaceAll("|", "\\|")}\` |`).join("\n")}

## Boundary

- External model claim: false
- Production ready claim: false
- Go-live claim: false
- No-approval auto-create count: ${beforeApproval.auto_create_matter_count}
`,
);

console.log(JSON.stringify({
  pass: artifact.pass,
  artifact: JSON_PATH,
  review_id: artifact.review_queue.review_id,
  before_approval: artifact.before_approval,
  after_approval: artifact.after_approval,
}, null, 2));

if (!artifact.pass) process.exitCode = 1;
