import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmailFilingCorrectionRepository,
} from "../src/email-filing-correction-repository.js";
import {
  createEmailFilingCorrectionService,
} from "../src/email-filing-correction-service.js";
import {
  createEmailFilingCorrection,
  createOriginalEmailFilingPlacement,
  deriveEmailFilingPlacementChain,
  normalizeEmailFilingPlacementEvent,
} from "../src/email-filing-correction-model.js";
import {
  MATTER_A,
  MATTER_B,
  MATTER_C,
  correctionInput,
  originalFiling,
} from "./helpers/email-filing-correction-fixture.js";

function serviceFor(repository, overrides = {}) {
  let counter = 0;
  return createEmailFilingCorrectionService({
    repository,
    id_factory: () => `correction-${counter += 1}`,
    clock: () => new Date(`2026-08-08T0${counter + 1}:00:00.000Z`),
    ...overrides,
  });
}

function assertCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code);
}

test("OUTM-20 rejects invalid immutable identity, actor, and same-Matter corrections", () => {
  // Given: an empty correction repository and its original placement.
  const repository = createEmailFilingCorrectionRepository();
  const service = serviceFor(repository);
  const original = originalFiling();
  const prior = service.currentPlacement({ original_filing: original }).placement_id;

  // When/Then: invalid requests fail before any append.
  assertCode(() => service.correct(correctionInput({
    original_filing: original,
    prior_placement_id: prior,
    target_matter_id: MATTER_A,
  })), "EMAIL_FILING_CORRECTION_SAME_MATTER");
  assertCode(() => service.correct(correctionInput({
    original_filing: original,
    prior_placement_id: prior,
    original_receipt_id: "wrong-receipt",
  })), "EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT");
  assertCode(() => service.correct(correctionInput({
    original_filing: original,
    prior_placement_id: prior,
    mime_sha256: "b".repeat(64),
  })), "EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT");
  assertCode(() => service.correct(correctionInput({
    original_filing: original,
    prior_placement_id: prior,
    actor_id: "",
  })), "EMAIL_FILING_CORRECTION_ACTOR_REQUIRED");
  const deniedService = serviceFor(repository, { authorize_actor: () => false });
  assertCode(() => deniedService.correct(correctionInput({
    original_filing: original,
    prior_placement_id: prior,
  })), "EMAIL_FILING_CORRECTION_ACTOR_DENIED");
  assertCode(() => repository.appendAudit({
    tenant_id: original.tenant_id,
    event_id: "unsafe-audit",
    raw_bytes: Buffer.alloc(64),
  }), "LAWOS_DMS_PERSISTED_SECRET_REJECTED");
  assert.deepEqual(repository.snapshot(), {
    placements: [],
    idempotency: [],
    audit_events: [],
  });
});

test("OUTM-20 rejects stale placement and changed-payload idempotency conflicts", () => {
  // Given: A has already been corrected to B.
  const repository = createEmailFilingCorrectionRepository();
  const service = serviceFor(repository);
  const original = originalFiling();
  const prior = service.currentPlacement({ original_filing: original }).placement_id;
  service.correct(correctionInput({ original_filing: original, prior_placement_id: prior }));

  // When/Then: a stale prior and a changed replay cannot fork or overwrite the chain.
  assertCode(() => service.correct(correctionInput({
    original_filing: original,
    source_matter_id: MATTER_B,
    target_matter_id: MATTER_C,
    idempotency_key: "outm20-stale",
    prior_placement_id: prior,
  })), "EMAIL_FILING_CORRECTION_STALE_PLACEMENT");
  assertCode(() => service.correct(correctionInput({
    original_filing: original,
    target_matter_id: MATTER_C,
    reason: "다른 정정 사유",
    prior_placement_id: prior,
  })), "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT");
  assertCode(() => service.correct(correctionInput({
    original_filing: original,
    actor_id: "different-corrector",
    prior_placement_id: prior,
  })), "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT");
  assert.equal(repository.listPlacements({ tenant_id: original.tenant_id }).length, 2);
  assert.equal(repository.listAudit({ tenant_id: original.tenant_id }).length, 1);
});

test("OUTM-20 rejects a durable chain with more than one origin", () => {
  // Given: corrupted durable state contains two origins for one logical chain.
  const original = originalFiling();
  const first = createOriginalEmailFilingPlacement(original);
  const second = createOriginalEmailFilingPlacement({
    ...original,
    document_id: "document-conflicting-origin",
  });

  // When/Then: derivation fails instead of silently selecting either origin.
  assertCode(() => deriveEmailFilingPlacementChain({
    original_filing: original,
    placements: [first, second],
  }), "EMAIL_FILING_CORRECTION_CHAIN_CONFLICT");
});

test("OUTM-20 rejects an unknown durable placement event kind", () => {
  // Given: a valid correction event whose persisted discriminator was corrupted.
  const original = originalFiling();
  const prior = createOriginalEmailFilingPlacement(original).placement_id;
  const correction = createEmailFilingCorrection({
    ...correctionInput({ original_filing: original, prior_placement_id: prior }),
    correction_id: "correction-invalid-kind",
    occurred_at: "2026-08-08T02:00:00.000Z",
  });

  // When/Then: readback fails rather than interpreting the unknown event as a correction.
  assertCode(() => normalizeEmailFilingPlacementEvent({
    ...correction,
    event_kind: "replacement",
  }), "EMAIL_FILING_CORRECTION_INVALID");
});

test("OUTM-20 persistence failure rolls back origin, correction, audit, and idempotency together", () => {
  // Given: a durable adapter that crashes before its first commit.
  const emptyValue = { placements: [], idempotency: [], audit_events: [] };
  const repository = createEmailFilingCorrectionRepository({
    filePath: "/virtual/outm20-correction-store.json",
    read_state: () => ({ exists: false, value: emptyValue, generation: 0 }),
    write_state: () => {
      throw Object.assign(new Error("synthetic persistence crash"), { code: "OUTM20_STORE_CRASH" });
    },
  });
  const service = serviceFor(repository);
  const original = originalFiling();
  const prior = service.currentPlacement({ original_filing: original }).placement_id;

  // When: the atomic append reaches persistence.
  assertCode(
    () => service.correct(correctionInput({ original_filing: original, prior_placement_id: prior })),
    "OUTM20_STORE_CRASH",
  );

  // Then: no in-memory partial target reference or receipt remains.
  assert.deepEqual(repository.snapshot(), emptyValue);
});

test("OUTM-20 reloads one complete committed transaction when the writer response fails", () => {
  // Given: a writer that durably commits every collection, then loses its acknowledgement.
  const emptyValue = { placements: [], idempotency: [], audit_events: [] };
  let durableValue = structuredClone(emptyValue);
  let generation = 0;
  const repository = createEmailFilingCorrectionRepository({
    filePath: "/virtual/outm20-after-commit-store.json",
    read_state: () => ({
      exists: generation > 0,
      value: structuredClone(durableValue),
      generation,
    }),
    write_state: ({ value }) => {
      durableValue = structuredClone(value);
      generation += 1;
      throw Object.assign(new Error("synthetic acknowledgement loss"), {
        code: "OUTM20_AFTER_COMMIT",
      });
    },
  });
  const service = serviceFor(repository);
  const original = originalFiling();
  const prior = service.currentPlacement({ original_filing: original }).placement_id;

  // When: persistence succeeds but the writer cannot return its receipt.
  assertCode(
    () => service.correct(correctionInput({ original_filing: original, prior_placement_id: prior })),
    "OUTM20_AFTER_COMMIT",
  );

  // Then: reload exposes all four transaction effects, never a partial target link.
  const snapshot = repository.snapshot();
  assert.equal(snapshot.placements.length, 2);
  assert.equal(snapshot.idempotency.length, 1);
  assert.equal(snapshot.audit_events.length, 1);
  assert.deepEqual(snapshot, durableValue);
});
