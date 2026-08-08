import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDmsRepository } from "../../dms/src/repository.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createEmailFilingOriginalResolver } from "../src/email-filing-original-resolver.js";
import { createPostgresEmailFilingCorrectionRepository } from "../src/email-filing-correction-postgres-repository.js";
import { createEmailFilingCorrectionService } from "../src/email-filing-correction-service.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import {
  MATTER_A,
  MATTER_C,
  SESSION,
  TENANT_ID,
  THREAD_ID,
  correctionInput,
  seedOriginalFiling,
  serviceDependencies,
} from "./helpers/email-filing-correction-fixture.js";

async function prepareSchema(fixture) {
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[2].sql);
  await fixture.adminPool.query(
    `GRANT USAGE ON SCHEMA lawos_email_dms TO lawos_app;
     GRANT SELECT, INSERT, UPDATE, DELETE
       ON lawos_email_dms.email_filing_placements TO lawos_app;
     GRANT SELECT, INSERT, UPDATE, DELETE
       ON lawos_email_dms.email_filing_correction_audit_events TO lawos_app;
     GRANT SELECT
       ON lawos_email_dms.email_filing_current_placements TO lawos_app`,
  );
}

test("OUTM-20 PostgreSQL service persists a reversible chain and atomically rolls back its audit", async (t) => {
  // Given: a durable DMS authority and the actual PostgreSQL correction adapter.
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await prepareSchema(fixture);
  const root = mkdtempSync(join(tmpdir(), "outm20-postgres-service-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dmsPath = join(root, "dms.json");
  let dmsRepository = createDmsRepository({ filePath: dmsPath });
  seedOriginalFiling(dmsRepository);
  dmsRepository.close();
  dmsRepository = createDmsRepository({ filePath: dmsPath });
  const dmsSnapshot = dmsRepository.snapshot();
  const ids = ["correction-a-to-b", "correction-b-to-a", "correction-blocked"];
  const times = [
    "2026-08-08T02:00:00.000Z",
    "2026-08-08T03:00:00.000Z",
    "2026-08-08T04:00:00.000Z",
  ];
  const serviceFor = (repository) => createEmailFilingCorrectionService({
    repository,
    original_filing_resolver: createEmailFilingOriginalResolver({ repository: dmsRepository }),
    id_factory: () => ids.shift(),
    clock: () => new Date(times.shift()),
    ...serviceDependencies(),
  });
  let repository = createPostgresEmailFilingCorrectionRepository({ pool: fixture.appPool });
  let service = serviceFor(repository);
  const initial = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });

  // When: A is corrected to B, replayed, then read after adapter restart and reversed to A.
  const firstCommand = correctionInput({ prior_placement_id: initial.placement_id });
  const first = await service.correct(firstCommand);
  const replay = await service.correct(firstCommand);
  repository = createPostgresEmailFilingCorrectionRepository({ pool: fixture.appPool });
  service = serviceFor(repository);
  const afterRestart = await service.currentPlacement({ session: SESSION, email_thread_id: THREAD_ID });
  const reversed = await service.correct(correctionInput({
    source_matter_id: afterRestart.matter_id,
    target_matter_id: MATTER_A,
    reason: "원 Matter로 복원",
    idempotency_key: "outm20-correction-b-to-a",
    prior_placement_id: afterRestart.placement_id,
  }));

  // Then: PostgreSQL readback yields one deterministic append-only chain and two audits.
  assert.equal(first.outcome, "created");
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(afterRestart.matter_id, "matter-b");
  assert.equal(reversed.current_placement.matter_id, MATTER_A);
  const persisted = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT_ID },
    async (client) => ({
      placements: Number((await client.query(
        "SELECT count(*) AS count FROM lawos_email_dms.email_filing_placements",
      )).rows[0].count),
      audits: Number((await client.query(
        "SELECT count(*) AS count FROM lawos_email_dms.email_filing_correction_audit_events",
      )).rows[0].count),
      current: (await client.query(
        "SELECT target_matter_id FROM lawos_email_dms.email_filing_current_placements",
      )).rows,
    }),
    { readOnly: true },
  );
  assert.deepEqual(persisted, {
    placements: 3,
    audits: 2,
    current: [{ target_matter_id: MATTER_A }],
  });

  // When: the audit insert fails after the next placement insert in the same SQL transaction.
  await fixture.adminPool.query(
    `CREATE OR REPLACE FUNCTION lawos_email_dms.reject_blocked_correction_audit()
       RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         IF NEW.event_id LIKE '%correction-blocked' THEN
           RAISE EXCEPTION 'synthetic audit failure';
         END IF;
         RETURN NEW;
       END;
       $$;
     CREATE TRIGGER reject_blocked_correction_audit
       BEFORE INSERT ON lawos_email_dms.email_filing_correction_audit_events
       FOR EACH ROW EXECUTE FUNCTION lawos_email_dms.reject_blocked_correction_audit();`,
  );
  const blocked = service.correct(correctionInput({
    target_matter_id: MATTER_C,
    reason: "감사 실패 원자성 검증",
    idempotency_key: "outm20-correction-blocked",
    prior_placement_id: reversed.current_placement.placement_id,
  }));

  // Then: the failed transaction writes neither placement nor audit and never changes DMS originals.
  await assert.rejects(blocked);
  const afterFailure = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT_ID },
    async (client) => ({
      placements: Number((await client.query(
        "SELECT count(*) AS count FROM lawos_email_dms.email_filing_placements",
      )).rows[0].count),
      audits: Number((await client.query(
        "SELECT count(*) AS count FROM lawos_email_dms.email_filing_correction_audit_events",
      )).rows[0].count),
    }),
    { readOnly: true },
  );
  assert.deepEqual(afterFailure, { placements: 3, audits: 2 });
  assert.deepEqual(dmsRepository.snapshot(), dmsSnapshot);
  assert.equal(dmsRepository.list({ tenant_id: TENANT_ID, model_type: "DmsDocument" }).length, 1);
  assert.equal(dmsRepository.list({ tenant_id: TENANT_ID, model_type: "DmsDocumentVersion" }).length, 1);
  dmsRepository.close();
});
