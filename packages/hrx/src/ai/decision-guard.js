export const HRX_AI_FINAL_DECISION_DOMAINS = Object.freeze(["hire", "fire", "pay", "evaluation"]);

const DOMAIN_KEYWORDS = Object.freeze({
  hire: Object.freeze(["hire", "hiring", "make offer", "extend offer", "reject candidate", "select candidate"]),
  fire: Object.freeze(["fire", "terminate", "dismiss", "lay off", "offboard for cause"]),
  pay: Object.freeze(["pay", "salary", "compensation", "bonus", "raise", "equity"]),
  evaluation: Object.freeze(["performance rating", "rate performance", "evaluation score", "promotion rating", "discipline"]),
});

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function inferDomain(input = {}) {
  const explicit = normalizeText(input.decision_domain);
  if (HRX_AI_FINAL_DECISION_DOMAINS.includes(explicit)) return explicit;
  const text = [input.intent, input.action, input.question, input.request, input.output].map(normalizeText).join(" ");
  return HRX_AI_FINAL_DECISION_DOMAINS.find((domain) => DOMAIN_KEYWORDS[domain].some((keyword) => text.includes(keyword))) ?? null;
}

function isFinal(input = {}) {
  if (input.final_decision === true) return true;
  const decisionMode = normalizeText(input.decision_mode);
  if (["final", "auto_final", "automated_final"].includes(decisionMode)) return true;
  const action = normalizeText(input.action);
  return action.includes("final") || action.startsWith("decide_") || action.startsWith("approve_");
}

export function enforceHrxNoFinalDecisionGuard(input = {}) {
  const domain = inferDomain(input);
  if (domain && isFinal(input)) {
    return Object.freeze({
      status: "blocked",
      safe_error_code: "HRX_AI_FINAL_DECISION_BLOCKED",
      decision_domain: domain,
      human_review_required: true,
      reason: "hrx_ai_must_not_make_final_people_decisions",
    });
  }
  return Object.freeze({
    status: "allow",
    decision_domain: domain,
    human_review_required: false,
    reason: "hrx_ai_advisory_or_non_decision_request",
  });
}

export function assertHrxNoFinalDecision(input = {}) {
  const guard = enforceHrxNoFinalDecisionGuard(input);
  if (guard.status === "blocked") {
    const error = new Error(guard.reason);
    error.safe_error_code = guard.safe_error_code;
    error.guard = guard;
    throw error;
  }
  return guard;
}
