function normalizeSourceRefs(value) {
  if (value === undefined || value === null) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError("allowed source refs must be an array");
  return Object.freeze(
    [...new Set(value.map((item) => {
      const sourceRef = typeof item === "string" ? item : item?.source_ref;
      if (typeof sourceRef !== "string" || sourceRef.trim() === "") throw new TypeError("source_ref is required");
      return sourceRef.trim();
    }))],
  );
}

function answerCitations(answer = {}) {
  if (!Array.isArray(answer.citations)) return Object.freeze([]);
  return Object.freeze(
    [...new Set(answer.citations.map((citation) => {
      if (typeof citation?.source_ref !== "string" || citation.source_ref.trim() === "") {
        throw new TypeError("citation.source_ref is required");
      }
      return citation.source_ref.trim();
    }))],
  );
}

export function validateHrxAiCitations({ answer = {}, allowed_sources = [], allowed_source_refs = [] } = {}) {
  const allowedRefs = new Set([
    ...normalizeSourceRefs(allowed_sources),
    ...normalizeSourceRefs(allowed_source_refs),
  ]);
  const citedRefs = answerCitations(answer);
  const requiresCitations = answer.status === "answered" || (typeof answer.answer === "string" && answer.answer.trim() !== "");

  if (requiresCitations && citedRefs.length === 0) {
    return Object.freeze({
      ok: false,
      reason: "hrx_ai_citations_required",
      rejected_source_refs: Object.freeze([]),
    });
  }

  const rejected = citedRefs.filter((sourceRef) => !allowedRefs.has(sourceRef));
  if (rejected.length > 0) {
    return Object.freeze({
      ok: false,
      reason: "hrx_ai_citation_not_in_allowed_sources",
      rejected_source_refs: Object.freeze(rejected),
    });
  }

  return Object.freeze({
    ok: true,
    reason: "hrx_ai_citations_allowed",
    source_refs: Object.freeze(citedRefs),
  });
}

export function assertHrxAiCitations(input = {}) {
  const result = validateHrxAiCitations(input);
  if (!result.ok) {
    const error = new Error(result.reason);
    error.safe_error_code = "HRX_AI_CITATION_VALIDATION_FAILED";
    error.rejected_source_refs = result.rejected_source_refs;
    throw error;
  }
  return result;
}
