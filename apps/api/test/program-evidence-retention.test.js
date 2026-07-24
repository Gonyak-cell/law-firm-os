import assert from "node:assert/strict";
import test from "node:test";
import {
  LAWOS_PROGRAM_EVIDENCE_MINIMUM_RETENTION_DAYS,
  programEvidenceRetainUntil,
} from "../src/program-evidence-retention.js";

const DAY_MS = 24 * 60 * 60 * 1000;

test("program evidence retention always meets the 365-day minimum", () => {
  const now = Date.parse("2026-07-24T00:00:00.000Z");
  const result = programEvidenceRetainUntil({
    approvalExpiresAt: "2026-08-31T14:59:00.000Z",
    now,
  });
  assert.equal(
    result.toISOString(),
    new Date(
      now + LAWOS_PROGRAM_EVIDENCE_MINIMUM_RETENTION_DAYS * DAY_MS,
    ).toISOString(),
  );
});

test("program evidence retention preserves a later approval buffer", () => {
  const now = Date.parse("2026-07-24T00:00:00.000Z");
  const expiresAt = Date.parse("2027-09-01T00:00:00.000Z");
  assert.equal(programEvidenceRetainUntil({
    approvalExpiresAt: new Date(expiresAt).toISOString(),
    now,
  }).toISOString(), new Date(expiresAt + 30 * DAY_MS).toISOString());
  assert.throws(() => programEvidenceRetainUntil({
    approvalExpiresAt: "2026-07-23T00:00:00.000Z",
    now,
  }));
});
