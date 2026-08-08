import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createEmailFilingCorrectionRepository,
} from "../src/email-filing-correction-repository.js";
import {
  createEmailFilingCorrectionService,
} from "../src/email-filing-correction-service.js";
import {
  DOCUMENT_ID,
  MATTER_A,
  MATTER_B,
  MIME_SHA256,
  correctionInput,
  originalFiling,
} from "./helpers/email-filing-correction-fixture.js";

function deterministicService(repository) {
  const ids = ["correction-a-to-b", "correction-b-to-a"];
  const times = [
    new Date("2026-08-08T02:00:00.000Z"),
    new Date("2026-08-08T03:00:00.000Z"),
  ];
  return createEmailFilingCorrectionService({
    repository,
    id_factory: () => ids.shift(),
    clock: () => times.shift(),
  });
}

test("OUTM-20 creates, replays, restarts, and reverses an append-only placement chain", (t) => {
  // Given: one immutable original filing in Matter A.
  const root = mkdtempSync(join(tmpdir(), "outm20-correction-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "email-filing-corrections.json");
  const original = { ...originalFiling() };
  const originalSnapshot = structuredClone(original);
  let repository = createEmailFilingCorrectionRepository({ filePath });
  let service = deterministicService(repository);
  const initial = service.currentPlacement({ original_filing: original });

  // When: A is corrected to B and the byte-identical request is replayed.
  const first = service.correct({
    ...correctionInput({ original_filing: original }),
    prior_placement_id: initial.placement_id,
  });
  const replay = service.correct({
    ...correctionInput({ original_filing: original }),
    prior_placement_id: initial.placement_id,
  });

  // Then: replay adds nothing and the same immutable document is referenced in B.
  assert.equal(first.outcome, "created");
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(replay.correction.correction_id, first.correction.correction_id);
  assert.equal(repository.listPlacements({ tenant_id: original.tenant_id }).length, 2);
  assert.equal(repository.listAudit({ tenant_id: original.tenant_id }).length, 1);
  assert.deepEqual(original, originalSnapshot);
  assert.equal(first.placement_history[0].actor_id, original.actor_id);
  assert.equal(first.placement_history[0].occurred_at, original.occurred_at);
  assert.equal(first.placement_history[0].matter_id, MATTER_A);
  assert.equal(first.current_placement.matter_id, MATTER_B);
  assert.equal(first.current_placement.document_reference.document_id, DOCUMENT_ID);
  assert.equal(first.current_placement.document_reference.mime_sha256, MIME_SHA256);

  // When: the durable repository restarts and B is corrected back to A.
  repository.close();
  repository = createEmailFilingCorrectionRepository({ filePath });
  service = createEmailFilingCorrectionService({
    repository,
    id_factory: () => "correction-b-to-a",
    clock: () => new Date("2026-08-08T03:00:00.000Z"),
  });
  const afterRestart = service.currentPlacement({ original_filing: original });
  const reversed = service.correct({
    ...correctionInput({
      original_filing: original,
      source_matter_id: MATTER_B,
      target_matter_id: MATTER_A,
      reason: "원 Matter로 복원",
      idempotency_key: "outm20-correction-b-to-a",
      prior_placement_id: afterRestart.placement_id,
    }),
  });

  // Then: all three placements remain and one deterministic current placement is A.
  assert.equal(afterRestart.matter_id, MATTER_B);
  assert.equal(reversed.current_placement.matter_id, MATTER_A);
  assert.equal(reversed.placement_history.length, 3);
  assert.deepEqual(
    reversed.placement_history.map((placement) => placement.matter_id),
    [MATTER_A, MATTER_B, MATTER_A],
  );
  assert.equal(new Set(reversed.placement_history.map((value) => value.document_id)).size, 1);
  assert.equal(new Set(reversed.placement_history.map((value) => value.mime_sha256)).size, 1);
  assert.equal(repository.listAudit({ tenant_id: original.tenant_id }).length, 2);
  assert.deepEqual(original, originalSnapshot);
  repository.close();
});
