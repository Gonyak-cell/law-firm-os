import { validateHrxAiCitations } from "./citation-validator.js";

export const HRX_AI_ANSWER_STATUSES = Object.freeze(["answered", "insufficient_sources", "blocked", "review_required"]);

const BLOCKED_ANSWER_FIELDS = Object.freeze(["prompt", "raw_prompt", "raw_model_output", "trace", "retrieved_payloads"]);

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

function rejectBlockedFields(input) {
  for (const field of BLOCKED_ANSWER_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`HRX AI answer must not include ${field}`);
  }
}

function normalizeCitations(citations) {
  if (citations === undefined || citations === null) return Object.freeze([]);
  if (!Array.isArray(citations)) throw new TypeError("citations must be an array");
  return Object.freeze(citations.map((citation) => {
    const sourceRef = requiredString(citation, "source_ref");
    return Object.freeze({
      source_ref: sourceRef,
      label: optionalString(citation, "label") ?? sourceRef,
    });
  }));
}

export function createHrxAiAnswer(input = {}) {
  rejectBlockedFields(input);
  const citations = normalizeCitations(input.citations);
  const sourceRefs = Object.freeze([...new Set(citations.map((citation) => citation.source_ref))]);
  if (citations.length === 0) {
    return Object.freeze({
      status: "insufficient_sources",
      answer: null,
      citations,
      source_refs: sourceRefs,
      reason: "hrx_ai_citations_required",
    });
  }
  const status = input.status ?? "answered";
  if (!HRX_AI_ANSWER_STATUSES.includes(status)) {
    throw new TypeError(`status must be one of ${HRX_AI_ANSWER_STATUSES.join(", ")}`);
  }
  return Object.freeze({
    status,
    answer: requiredString(input, "answer"),
    citations,
    source_refs: sourceRefs,
    reason: optionalString(input, "reason"),
  });
}

export function createHrxInsufficientSourcesAnswer(reason = "hrx_ai_no_allowed_sources") {
  return Object.freeze({
    status: "insufficient_sources",
    answer: null,
    citations: Object.freeze([]),
    source_refs: Object.freeze([]),
    reason,
  });
}

export function groundHrxAiAnswer(input = {}) {
  const answer = createHrxAiAnswer(input);
  if (answer.status === "insufficient_sources") return answer;
  const citationDecision = validateHrxAiCitations({
    answer,
    allowed_sources: input.allowed_sources ?? [],
    allowed_source_refs: input.allowed_source_refs ?? [],
  });
  if (!citationDecision.ok) {
    return Object.freeze({
      status: "insufficient_sources",
      answer: null,
      citations: Object.freeze([]),
      source_refs: Object.freeze([]),
      reason: citationDecision.reason,
      rejected_source_refs: citationDecision.rejected_source_refs,
    });
  }
  return answer;
}
