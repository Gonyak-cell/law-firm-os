import assert from "node:assert/strict";
import test from "node:test";
import { comparisonSourceKey, flattenSourceRef, isReviewableFieldValue } from "../project-amic-evidence-to-matter-profiles.mjs";

test("normalizes NFD paths and flattened Matter source references to one key", () => {
  assert.equal(
    flattenSourceRef("1. 민사/그래비티랩스/소송기록.pdf".normalize("NFD")),
    flattenSourceRef("1. 민사-그래비티랩스-소송기록.pdf"),
  );
});

test("removes known intermediate folders before review-only path comparison", () => {
  assert.equal(
    comparisonSourceKey("1. 민사/0. 종료사건/금홍/소장.pdf"),
    comparisonSourceKey("1. 민사-금홍-소장.pdf"),
  );
});

test("sends oversized extracted prose to review-only evidence instead of a profile-field candidate", () => {
  assert.equal(isReviewableFieldValue("x".repeat(160)), true);
  assert.equal(isReviewableFieldValue("x".repeat(161)), false);
  assert.equal(isReviewableFieldValue("x".repeat(80), "delivery_reference"), true);
  assert.equal(isReviewableFieldValue("x".repeat(81), "delivery_reference"), false);
});
