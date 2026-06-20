export const HRX_AI_REVIEW_STATES = Object.freeze(["pending_review", "approved_for_response", "rejected"]);
export const HRX_AI_REVIEW_RISK_LEVELS = Object.freeze(["medium", "high", "critical"]);

const BLOCKED_REVIEW_FIELDS = Object.freeze(["prompt", "answer", "raw_answer", "model_output", "document_body", "content", "text"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim();
}

function normalizeSourceRefs(value) {
  if (value === undefined || value === null) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError("source_refs must be an array");
  return Object.freeze([...new Set(value.map((item) => {
    if (typeof item !== "string" || item.trim() === "") throw new TypeError("source_refs must contain non-empty strings");
    return item.trim();
  }))]);
}

function rejectBlockedFields(input) {
  for (const field of BLOCKED_REVIEW_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`HRX AI review item must not include ${field}`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createHrxAiReviewItem(input = {}) {
  rejectBlockedFields(input);
  const state = input.state ?? "pending_review";
  if (!HRX_AI_REVIEW_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_AI_REVIEW_STATES.join(", ")}`);
  const riskLevel = input.risk_level ?? "high";
  if (!HRX_AI_REVIEW_RISK_LEVELS.includes(riskLevel)) {
    throw new TypeError(`risk_level must be one of ${HRX_AI_REVIEW_RISK_LEVELS.join(", ")}`);
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    review_id: requiredString(input, "review_id"),
    interaction_id: requiredString(input, "interaction_id"),
    state,
    risk_level: riskLevel,
    reason: requiredString(input, "reason"),
    answer_status: optionalString(input, "answer_status") ?? "review_required",
    decision_domain: optionalString(input, "decision_domain"),
    source_refs: normalizeSourceRefs(input.source_refs),
    created_by: requiredString(input, "created_by"),
    resolved_by: optionalString(input, "resolved_by"),
  });
}

export function createInMemoryHrxAiReviewQueue(seed = []) {
  const items = new Map();
  const key = (tenantId, reviewId) => `${tenantId}:${reviewId}`;

  const queue = {
    enqueue(input) {
      const item = createHrxAiReviewItem(input);
      items.set(key(item.tenant_id, item.review_id), clone(item));
      return Object.freeze(clone(item));
    },
    list(query = {}) {
      return Object.freeze(
        [...items.values()]
          .filter((item) => !query.tenant_id || item.tenant_id === query.tenant_id)
          .filter((item) => !query.state || item.state === query.state)
          .map((item) => Object.freeze(clone(item))),
      );
    },
    resolve(ref = {}, input = {}) {
      const current = items.get(key(ref.tenant_id, ref.review_id));
      if (!current) throw new Error("HRX_AI_REVIEW_NOT_FOUND");
      if (current.state !== "pending_review") throw new TypeError("AI review item must be pending_review before resolution");
      const state = requiredString(input, "state");
      if (!["approved_for_response", "rejected"].includes(state)) throw new TypeError("AI review resolution must approve or reject");
      const next = createHrxAiReviewItem({
        ...current,
        state,
        resolved_by: requiredString(input, "resolved_by"),
      });
      items.set(key(next.tenant_id, next.review_id), clone(next));
      return Object.freeze(clone(next));
    },
  };

  for (const item of seed) queue.enqueue(item);

  return Object.freeze(queue);
}

export function routeHrxAiAnswerToReview({ queue, context = {}, interaction_id, answer = {}, guard = {}, reason } = {}) {
  if (!queue || typeof queue.enqueue !== "function") throw new TypeError("HRX AI review queue enqueue port is required");
  const status = answer.status ?? (guard.status === "blocked" ? "blocked" : "review_required");
  const shouldReview = guard.status === "blocked" || ["blocked", "review_required", "insufficient_sources"].includes(status);
  if (!shouldReview) return null;
  const reviewId = `review-${interaction_id}`;
  return queue.enqueue({
    tenant_id: requiredString(context, "tenant_id"),
    review_id: reviewId,
    interaction_id: requiredString({ interaction_id }, "interaction_id"),
    risk_level: guard.status === "blocked" ? "critical" : "high",
    reason: reason ?? guard.reason ?? answer.reason ?? "hrx_ai_high_risk_answer",
    answer_status: status,
    decision_domain: guard.decision_domain ?? null,
    source_refs: answer.source_refs ?? [],
    created_by: requiredString(context, "actor_id"),
  });
}
