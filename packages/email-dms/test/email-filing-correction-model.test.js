import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmailFilingCorrection,
  createOriginalEmailFilingPlacement,
  deriveEmailFilingPlacementChain,
  normalizeEmailFilingPlacementEvent,
} from "../src/email-filing-correction-model.js";
import {
  CORRECTION_ACTOR_ID,
  MATTER_A,
  MATTER_B,
  originalFiling,
} from "./helpers/email-filing-correction-fixture.js";

test("OUTM-20 rejects a durable chain with more than one origin", () => {
  // Given: corrupted durable state contains two origins for one logical chain.
  const original = originalFiling();
  const first = createOriginalEmailFilingPlacement(original);
  const second = createOriginalEmailFilingPlacement({
    ...original,
    document_id: "document-conflicting-origin",
  });

  // When/Then: derivation fails instead of silently selecting either origin.
  assert.throws(() => deriveEmailFilingPlacementChain({
    original_filing: original,
    placements: [first, second],
  }), (error) => error?.code === "EMAIL_FILING_CORRECTION_CHAIN_CONFLICT");
});

test("OUTM-20 rejects an unknown durable placement event kind", () => {
  // Given: a valid correction event whose persisted discriminator was corrupted.
  const original = originalFiling();
  const prior = createOriginalEmailFilingPlacement(original).placement_id;
  const correction = createEmailFilingCorrection({
    ...original,
    source_matter_id: MATTER_A,
    target_matter_id: MATTER_B,
    reason: "Matter 정정",
    actor_id: CORRECTION_ACTOR_ID,
    idempotency_key: "invalid-kind",
    prior_placement_id: prior,
    correction_id: "correction-invalid-kind",
    occurred_at: "2026-08-08T02:00:00.000Z",
  });

  // When/Then: readback fails rather than interpreting the unknown event as a correction.
  assert.throws(() => normalizeEmailFilingPlacementEvent({
    ...correction,
    event_kind: "replacement",
  }), (error) => error?.code === "EMAIL_FILING_CORRECTION_INVALID");
});
