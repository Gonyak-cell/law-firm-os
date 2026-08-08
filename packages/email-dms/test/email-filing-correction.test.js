import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDmsRepository } from "../../dms/src/repository.js";
import { createEmailFilingCorrectionRepository } from "../src/email-filing-correction-repository.js";
import { createEmailFilingOriginalResolver } from "../src/email-filing-original-resolver.js";
import { createEmailFilingCorrectionService } from "../src/email-filing-correction-service.js";
import {
  CORRECTION_ACTOR_ID,
  DOCUMENT_ID,
  MATTER_A,
  MATTER_B,
  MIME_SHA256,
  SESSION,
  TENANT_ID,
  THREAD_ID,
  correctionInput,
  seedOriginalFiling,
  serviceDependencies,
} from "./helpers/email-filing-correction-fixture.js";

function deterministicService(repository, dmsRepository, overrides = {}) {
  const ids = ["correction-a-to-b", "correction-b-to-a"];
  const times = [
    new Date("2026-08-08T02:00:00.000Z"),
    new Date("2026-08-08T03:00:00.000Z"),
  ];
  return createEmailFilingCorrectionService({
    repository,
    original_filing_resolver: createEmailFilingOriginalResolver({
      repository: dmsRepository,
    }),
    id_factory: () => ids.shift(),
    clock: () => times.shift(),
    ...serviceDependencies(),
    ...overrides,
  });
}

test("OUTM-20 corrects, replays, restarts, and reverses without changing the original DMS filing", async (t) => {
  // Given: one durable original filing in Matter A and an empty correction store.
  const root = mkdtempSync(join(tmpdir(), "outm20-correction-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dmsPath = join(root, "dms.json");
  const correctionPath = join(root, "corrections.json");
  let dmsRepository = createDmsRepository({ filePath: dmsPath });
  seedOriginalFiling(dmsRepository);
  dmsRepository.close();
  dmsRepository = createDmsRepository({ filePath: dmsPath });
  const originalSnapshot = dmsRepository.snapshot();
  let repository = createEmailFilingCorrectionRepository({ filePath: correctionPath });
  let service = deterministicService(repository, dmsRepository);
  const initial = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });

  // When: A is corrected to B and the byte-identical command is replayed.
  const firstCommand = correctionInput({ prior_placement_id: initial.placement_id });
  const first = await service.correct(firstCommand);
  const replay = await service.correct(firstCommand);

  // Then: the canonical session actor is recorded and no DMS record is copied or changed.
  assert.equal(first.outcome, "created");
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(first.correction.actor_id, CORRECTION_ACTOR_ID);
  assert.equal(replay.correction.correction_id, first.correction.correction_id);
  assert.equal(first.current_placement.matter_id, MATTER_B);
  assert.equal(first.current_placement.document_reference.document_id, DOCUMENT_ID);
  assert.equal(first.current_placement.document_reference.mime_sha256, MIME_SHA256);
  assert.deepEqual(dmsRepository.snapshot(), originalSnapshot);
  assert.equal(dmsRepository.list({ tenant_id: TENANT_ID, model_type: "DmsDocument" }).length, 1);
  assert.equal(dmsRepository.list({ tenant_id: TENANT_ID, model_type: "DmsDocumentVersion" }).length, 1);

  // When: both stores restart and B is corrected back to A.
  repository.close();
  dmsRepository.close();
  repository = createEmailFilingCorrectionRepository({ filePath: correctionPath });
  dmsRepository = createDmsRepository({ filePath: dmsPath });
  service = deterministicService(repository, dmsRepository, {
    id_factory: () => "correction-b-to-a",
    clock: () => new Date("2026-08-08T03:00:00.000Z"),
  });
  const afterRestart = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });
  const reversed = await service.correct(correctionInput({
    source_matter_id: MATTER_B,
    target_matter_id: MATTER_A,
    reason: "원 Matter로 복원",
    idempotency_key: "outm20-correction-b-to-a",
    prior_placement_id: afterRestart.placement_id,
  }));

  // Then: the append-only history deterministically returns to A after restart.
  assert.equal(afterRestart.matter_id, MATTER_B);
  assert.equal(reversed.current_placement.matter_id, MATTER_A);
  assert.deepEqual(
    reversed.placement_history.map((placement) => placement.matter_id),
    [MATTER_A, MATTER_B, MATTER_A],
  );
  assert.equal(new Set(reversed.placement_history.map((value) => value.document_id)).size, 1);
  assert.equal(new Set(reversed.placement_history.map((value) => value.mime_sha256)).size, 1);
  assert.deepEqual(dmsRepository.snapshot(), originalSnapshot);
  repository.close();
  dmsRepository.close();
});
