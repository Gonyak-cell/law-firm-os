import { createMatter, createMatterCalendarEvent, createMatterTask } from "./model.js";

export const FILED_EMAIL_AI_REVIEW_BOUNDARY = Object.freeze({
  source: "filed_email_ai_summary_review_queue",
  auto_create_matter_before_lawyer_approval: false,
  lawyer_approval_required: true,
  raw_email_body_stored: false,
  provider_payload_stored: false,
  production_ready_claim: false,
  go_live_claim: false,
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field, fallback = null) {
  const value = input?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function clone(value) {
  return structuredClone(value);
}

function safeId(prefix, value) {
  return `${prefix}_${String(value ?? Date.now()).replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80)}`;
}

function normalizeSubject(value) {
  return String(value ?? "Filed email").replace(/^(re|fw):\s*/i, "").trim() || "Filed email";
}

function textSource(email) {
  return [email.subject, email.body_preview].filter(Boolean).join(" ").slice(0, 1000);
}

function extractDates(text) {
  return [...new Set(String(text ?? "").match(/\b20\d{2}-\d{2}-\d{2}\b/g) ?? [])];
}

function createSummary(email) {
  const subject = normalizeSubject(email.subject);
  const sender = email.from?.email ?? email.from?.name ?? "unknown sender";
  const preview = optionalString(email, "body_preview", "No preview supplied");
  return `Filed email from ${sender}: ${subject}. ${preview}`.slice(0, 500);
}

function createTaskCandidates(email) {
  const subject = normalizeSubject(email.subject);
  return Object.freeze([
    Object.freeze({
      candidate_id: safeId("task_candidate", email.email_thread_id),
      title: `Review filed email: ${subject}`.slice(0, 160),
      source_ref: `DmsEmailThread:${email.email_thread_id}`,
      confidence: 0.82,
    }),
  ]);
}

function createDeadlineCandidates(email) {
  return Object.freeze(extractDates(textSource(email)).map((date, index) => Object.freeze({
    candidate_id: safeId(`deadline_candidate_${index + 1}`, email.email_thread_id),
    title: `Deadline candidate from ${normalizeSubject(email.subject)}`.slice(0, 160),
    starts_on: date,
    source_ref: `DmsEmailThread:${email.email_thread_id}`,
    confidence: 0.78,
  })));
}

function createMatterCandidate(email, overrides = {}) {
  const subject = normalizeSubject(email.subject);
  return Object.freeze({
    tenant_id: requiredString(email, "tenant_id"),
    matter_id: overrides.matter_id ?? safeId("matter_from_email", email.email_thread_id),
    client_id: overrides.client_id ?? email.client_id ?? "client_from_filed_email",
    client_display_name: overrides.client_display_name ?? email.client_display_name ?? email.from?.name ?? "Filed email client",
    title: overrides.title ?? subject,
    matter_type_english: overrides.matter_type_english ?? "ADV",
    matter_detail_type_korean: overrides.matter_detail_type_korean ?? "이메일 검토",
    status: "opening",
    permission_envelope_id: overrides.permission_envelope_id ?? "perm:email-ai-review",
    audit_trace_id: overrides.audit_trace_id ?? `audit:email-ai-review:${email.email_thread_id}`,
  });
}

export function createInMemoryFiledEmailAiReviewStore() {
  const reviews = new Map();
  const matters = new Map();
  const tasks = new Map();
  const deadlines = new Map();
  return Object.freeze({
    saveReview(review) {
      reviews.set(review.review_id, clone(review));
      return Object.freeze(clone(review));
    },
    getReview(reviewId) {
      const review = reviews.get(reviewId);
      return review ? Object.freeze(clone(review)) : null;
    },
    listReviews() {
      return Object.freeze([...reviews.values()].map((review) => Object.freeze(clone(review))));
    },
    saveMatterBundle({ matter, task_rows = [], deadline_rows = [] } = {}) {
      matters.set(matter.matter_id, clone(matter));
      for (const task of task_rows) tasks.set(task.task_id, clone(task));
      for (const deadline of deadline_rows) deadlines.set(deadline.event_id, clone(deadline));
      return Object.freeze({
        matter: Object.freeze(clone(matter)),
        task_rows: Object.freeze(task_rows.map((task) => Object.freeze(clone(task)))),
        deadline_rows: Object.freeze(deadline_rows.map((deadline) => Object.freeze(clone(deadline)))),
      });
    },
    listMatters() {
      return Object.freeze([...matters.values()].map((matter) => Object.freeze(clone(matter))));
    },
    listTasks() {
      return Object.freeze([...tasks.values()].map((task) => Object.freeze(clone(task))));
    },
    listDeadlines() {
      return Object.freeze([...deadlines.values()].map((deadline) => Object.freeze(clone(deadline))));
    },
  });
}

export function createFiledEmailAiMatterReviewService({ store = createInMemoryFiledEmailAiReviewStore(), now = () => new Date().toISOString() } = {}) {
  return Object.freeze({
    analyzeFiledEmail({ filed_email, actor_id, matter_candidate = {} } = {}) {
      const email = {
        ...filed_email,
        tenant_id: requiredString(filed_email, "tenant_id"),
        email_thread_id: requiredString(filed_email, "email_thread_id"),
        subject: requiredString(filed_email, "subject"),
      };
      const reviewId = safeId("email_ai_review", email.email_thread_id);
      const review = {
        review_id: reviewId,
        tenant_id: email.tenant_id,
        source_email_thread_id: email.email_thread_id,
        source_body_ref: optionalString(email, "body_ref", `body-ref:${email.email_thread_id}`),
        ai_summary: createSummary(email),
        task_candidates: createTaskCandidates(email),
        deadline_candidates: createDeadlineCandidates(email),
        matter_candidate: createMatterCandidate(email, matter_candidate),
        status: "pending_lawyer_approval",
        created_by: requiredString({ actor_id }, "actor_id"),
        created_at: now(),
        lawyer_approval_required: true,
        auto_create_matter_count: 0,
        materialized_matter_count: 0,
        raw_email_body_stored: false,
        provider_payload_stored: false,
        production_ready_claim: false,
      };
      return Object.freeze({
        outcome: "queued_for_lawyer_review",
        review_item: store.saveReview(review),
        matter_created: false,
        auto_create_matter_count: 0,
      });
    },

    approveReview({ review_id, lawyer_id, decision = "approved" } = {}) {
      const review = store.getReview(requiredString({ review_id }, "review_id"));
      if (!review) throw new Error(`Email AI review not found: ${review_id}`);
      const decidedBy = requiredString({ lawyer_id }, "lawyer_id");
      if (review.status !== "pending_lawyer_approval") throw new Error("Email AI review must be pending before decision");
      if (!["approved", "rejected"].includes(decision)) throw new Error("Email AI review decision must be approved or rejected");
      if (decision === "rejected") {
        const rejected = {
          ...review,
          status: "rejected",
          decided_by: decidedBy,
          decided_at: now(),
          materialized_matter_count: 0,
        };
        return Object.freeze({ outcome: "rejected", review_item: store.saveReview(rejected), matter_created: false });
      }

      const candidate = review.matter_candidate;
      const matter = createMatter({
        ...candidate,
        created_by: decidedBy,
        created_at: now(),
        approval_ref: `lawyer_approval:${review.review_id}:${decidedBy}`,
      });
      const taskRows = review.task_candidates.map((candidateTask, index) => createMatterTask({
        task_id: safeId(`task_${index + 1}`, review.review_id),
        tenant_id: review.tenant_id,
        matter_id: matter.matter_id,
        title: candidateTask.title,
        status: "todo",
        created_by: decidedBy,
        due_at: review.deadline_candidates[index]?.starts_on ?? null,
        source_ref: candidateTask.source_ref,
        permission_envelope_id: matter.permission_envelope_id,
        audit_trace_id: matter.audit_trace_id,
      }));
      const deadlineRows = review.deadline_candidates.map((candidateDeadline, index) => createMatterCalendarEvent({
        event_id: safeId(`deadline_${index + 1}`, review.review_id),
        tenant_id: review.tenant_id,
        matter_id: matter.matter_id,
        title: candidateDeadline.title,
        status: "scheduled",
        starts_at: `${candidateDeadline.starts_on}T09:00:00.000Z`,
        source_ref: candidateDeadline.source_ref,
        permission_envelope_id: matter.permission_envelope_id,
        audit_trace_id: matter.audit_trace_id,
      }));
      const materialized = store.saveMatterBundle({ matter, task_rows: taskRows, deadline_rows: deadlineRows });
      const approved = store.saveReview({
        ...review,
        status: "approved",
        decided_by: decidedBy,
        decided_at: now(),
        materialized_matter_count: 1,
        materialized_task_count: materialized.task_rows.length,
        materialized_deadline_count: materialized.deadline_rows.length,
        materialized_matter_id: matter.matter_id,
      });
      return Object.freeze({
        outcome: "approved_matter_created",
        review_item: approved,
        matter_created: true,
        matter: materialized.matter,
        task_rows: materialized.task_rows,
        deadline_rows: materialized.deadline_rows,
      });
    },

    listReviews: store.listReviews,
    listMatters: store.listMatters,
    listTasks: store.listTasks,
    listDeadlines: store.listDeadlines,
  });
}
