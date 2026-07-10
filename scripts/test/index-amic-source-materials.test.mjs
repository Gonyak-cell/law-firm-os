import assert from "node:assert/strict";
import test from "node:test";
import { classifySourcePath } from "../index-amic-source-materials.mjs";

test("flags official criminal identifiers even when a civil folder contains the material", () => {
  assert.equal(
    classifySourcePath("1. 민사/그래비티랩스/관악경찰서 2024-23796 수사기록.pdf", "1. 민사"),
    "criminal_litigation",
  );
});

test("keeps a lane classification when a path has no overriding identifier", () => {
  assert.equal(
    classifySourcePath("5. 기업 인수&합병/Alpha/회사 소개자료.pdf", "5. 기업 인수&합병"),
    "deal",
  );
});
