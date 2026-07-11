import assert from "node:assert/strict";
import test from "node:test";
import {
  MATTER_PRACTICE_AREAS,
  MATTER_PRACTICE_AREA_SOURCE_FIELDS,
  classifyMatterPracticeArea,
} from "../src/practice-area.js";

test("WT-01-01 classifies every existing Matter board alias without changing category IDs", () => {
  // Given
  const cases = [
    ["LIT", "litigation"],
    ["Litigation", "litigation"],
    ["송무", "litigation"],
    ["ADV", "corporate-advisory"],
    ["Advisory", "corporate-advisory"],
    ["Corporate_Advisory", "corporate-advisory"],
    ["기업 자문", "corporate-advisory"],
    ["Dispute", "dispute"],
    ["분쟁", "dispute"],
    ["DEAL", "transaction"],
    ["Transaction", "transaction"],
    ["트랜잭션", "transaction"],
  ];

  // When
  const actual = cases.map(([matter_type_english]) => classifyMatterPracticeArea({ matter_type_english }));

  // Then
  assert.deepEqual(actual, cases.map(([, expected]) => expected));
  assert.deepEqual(MATTER_PRACTICE_AREAS.map(({ id }) => id), ["litigation", "corporate-advisory", "dispute", "transaction"]);
});

test("WT-01-01 preserves Matter board source-field precedence and unclassified behavior", () => {
  // Given
  const conflicting = { matter_type_english: "LIT", matter_axis: "Advisory", matter_profile_kind: "dispute" };
  const fallback = { matter_type_english: "unknown", matter_axis: "Transaction" };

  // When
  const sourceFields = MATTER_PRACTICE_AREA_SOURCE_FIELDS;

  // Then
  assert.deepEqual(sourceFields, ["matter_type_english", "matter_axis", "matter_profile_kind", "profile_kind"]);
  assert.equal(classifyMatterPracticeArea(conflicting), "litigation");
  assert.equal(classifyMatterPracticeArea(fallback), "transaction");
  assert.equal(classifyMatterPracticeArea({ matter_type_english: "" }), "unclassified");
  assert.equal(classifyMatterPracticeArea(null), "unclassified");
});

test("WT-01-01 normalizes case, whitespace, hyphen, and underscore variants", () => {
  // Given
  const matters = [
    { matter_type_english: "  litigation  " },
    { matter_type_english: "CORPORATE-ADVISORY" },
    { matter_type_english: "corporate_advisory" },
  ];

  // When
  const actual = matters.map(classifyMatterPracticeArea);

  // Then
  assert.deepEqual(actual, ["litigation", "corporate-advisory", "corporate-advisory"]);
});
