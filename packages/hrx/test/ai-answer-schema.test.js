import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAiAnswer, groundHrxAiAnswer } from "../src/ai/answer-schema.js";

test("source-grounded answer returns insufficient_sources without citations", () => {
  const answer = createHrxAiAnswer({ answer: "The policy says this is allowed.", citations: [] });
  assert.equal(answer.status, "insufficient_sources");
  assert.equal(answer.answer, null);
  assert.equal(answer.reason, "hrx_ai_citations_required");
});

test("source-grounded answer requires cited source refs from allowed retrieval set", () => {
  const allowed = [{ source_ref: "Policy:leave:2026" }];
  const answer = groundHrxAiAnswer({
    answer: "Leave requests follow the current policy.",
    citations: [{ source_ref: "Policy:leave:2026", label: "Leave policy" }],
    allowed_sources: allowed,
  });
  assert.equal(answer.status, "answered");
  assert.deepEqual(answer.source_refs, ["Policy:leave:2026"]);

  const rejected = groundHrxAiAnswer({
    answer: "Salary is approved.",
    citations: [{ source_ref: "HRDoc:emp-001:salary" }],
    allowed_sources: allowed,
  });
  assert.equal(rejected.status, "insufficient_sources");
  assert.equal(rejected.reason, "hrx_ai_citation_not_in_allowed_sources");
  assert.deepEqual(rejected.rejected_source_refs, ["HRDoc:emp-001:salary"]);
});

test("source-grounded answer rejects raw prompt and model trace fields", () => {
  assert.throws(
    () => createHrxAiAnswer({ answer: "ok", citations: [{ source_ref: "Policy:001" }], raw_model_output: "raw" }),
    /must not include raw_model_output/,
  );
});
