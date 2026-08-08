import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createEmailFilingCorrectionRepository } from "../src/email-filing-correction-repository.js";
import { createEmailFilingOriginalResolver } from "../src/email-filing-original-resolver.js";
import { createEmailFilingCorrectionService } from "../src/email-filing-correction-service.js";
import {
  MATTER_B,
  MATTER_C,
  SESSION,
  TENANT_ID,
  THREAD_ID,
  correctionInput,
  createOriginalFilingRepository,
  serviceDependencies,
} from "./helpers/email-filing-correction-fixture.js";

function serviceFor(repository, dmsRepository) {
  let sequence = 0;
  return createEmailFilingCorrectionService({
    repository,
    original_filing_resolver: createEmailFilingOriginalResolver({ repository: dmsRepository }),
    id_factory: () => `concurrent-correction-${sequence += 1}`,
    clock: () => new Date(`2026-08-08T0${sequence + 1}:00:00.000Z`),
    ...serviceDependencies(),
  });
}

test("OUTM-20 JSON repository serializes same-prior corrections through durable commit", async (t) => {
  // Given: two corrections are based on the same durable original placement.
  const root = mkdtempSync(join(tmpdir(), "outm20-json-concurrency-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "corrections.json");
  const dmsRepository = createOriginalFilingRepository();
  let repository = createEmailFilingCorrectionRepository({ filePath });
  let service = serviceFor(repository, dmsRepository);
  const prior = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });

  // When: A-to-B and A-to-C execute in the same Promise.all turn.
  const outcomes = await Promise.all([
    correctionInput({ prior_placement_id: prior.placement_id }),
    correctionInput({
      target_matter_id: MATTER_C,
      reason: "동시 정정 C",
      idempotency_key: "outm20-concurrent-a-to-c",
      prior_placement_id: prior.placement_id,
    }),
  ].map((command) => service.correct(command).then(
    (value) => ({ kind: value.outcome, value, snapshot_at_return: repository.snapshot() }),
    (error) => ({ kind: error?.code, error }),
  )));

  // Then: one complete commit wins and the loser is a domain stale-placement conflict.
  assert.deepEqual(outcomes.map(({ kind }) => kind).sort(), [
    "EMAIL_FILING_CORRECTION_STALE_PLACEMENT",
    "created",
  ]);
  const winner = outcomes.find(({ kind }) => kind === "created");
  assert.equal(winner.snapshot_at_return.placements.length, 2);
  assert.equal(winner.snapshot_at_return.audit_events.length, 1);
  const beforeRestart = repository.snapshot();
  assert.equal(beforeRestart.placements.length, 2);
  assert.equal(beforeRestart.audit_events.length, 1);
  assert.ok([MATTER_B, MATTER_C].includes(winner.value.current_placement.matter_id));

  // And: reopening the file yields the same single leaf and complete history.
  repository.close();
  repository = createEmailFilingCorrectionRepository({ filePath });
  service = serviceFor(repository, dmsRepository);
  const current = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });
  const history = await service.history({ session: SESSION, email_thread_id: THREAD_ID });
  assert.equal(current.placement_id, winner.value.current_placement.placement_id);
  assert.equal(current.matter_id, winner.value.current_placement.matter_id);
  assert.equal(history.length, 2);
  assert.deepEqual(repository.snapshot(), beforeRestart);
  repository.close();
});

test("OUTM-20 JSON repository preserves nested savepoint behavior inside the queue owner", async () => {
  // Given: one top-level transaction owns the repository queue.
  const repository = createEmailFilingCorrectionRepository();
  const audit = (eventId) => ({ tenant_id: TENANT_ID, event_id: eventId });

  // When: one nested transaction rolls back and a later nested transaction succeeds.
  await repository.transaction({ tenant_id: TENANT_ID }, async (tx) => {
    tx.appendAudit(audit("outer"));
    await assert.rejects(repository.transaction({ tenant_id: TENANT_ID }, async (inner) => {
      inner.appendAudit(audit("inner-rolled-back"));
      throw new Error("nested rollback");
    }), /nested rollback/u);
    await repository.transaction({ tenant_id: TENANT_ID }, async (inner) => {
      inner.appendAudit(audit("inner-committed"));
    });
  });

  // Then: nested rollback does not erase the outer write or leak its own write.
  assert.deepEqual(
    repository.snapshot().audit_events.map(({ event_id: eventId }) => eventId),
    ["outer", "inner-committed"],
  );
});
