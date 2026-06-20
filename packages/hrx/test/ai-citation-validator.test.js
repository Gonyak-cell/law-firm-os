import assert from "node:assert/strict";
import test from "node:test";
import { assertHrxAiCitations, validateHrxAiCitations } from "../src/ai/citation-validator.js";

test("HRX AI citation validator fails answered output without citations", () => {
  const result = validateHrxAiCitations({
    answer: { status: "answered", answer: "Policy says yes.", citations: [] },
    allowed_source_refs: ["Policy:leave:2026"],
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "hrx_ai_citations_required");
});

test("HRX AI citation validator rejects citations outside allowed sources", () => {
  assert.throws(
    () =>
      assertHrxAiCitations({
        answer: { status: "answered", answer: "Salary is approved.", citations: [{ source_ref: "HRDoc:salary" }] },
        allowed_sources: [{ source_ref: "Policy:leave:2026" }],
      }),
    /hrx_ai_citation_not_in_allowed_sources/,
  );
});
