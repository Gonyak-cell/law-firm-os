import assert from "node:assert/strict";
import test from "node:test";

import { runPostgresMigrations } from "../../../packages/persistence/src/postgres/migration-runner.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  listClientOperationsPostgresMigrations,
  runClientOperationsPostgresMigrations,
  verifyClientOperationsPostgresMigrations,
} from "../src/client-operations-schema.js";

const CORRECTION = "302_client_email_filing_correction";
const OUTLOOK = "303_client_outlook_conversation_sync";

async function tableExists(pool, name) {
  const result = await pool.query(
    "SELECT to_regclass($1) AS relation",
    [`lawos_email_dms.${name}`],
  );
  return result.rows[0].relation !== null;
}

test("combined client catalog applies filing correction 302 before Outlook sync 303 on a fresh database", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;

  const result = await runClientOperationsPostgresMigrations(fixture.adminPool, {
    appliedBy: "outlook-combined-fresh-test",
  });

  assert.deepEqual(result.slice(-2).map(({ id, applied }) => ({ id, applied })), [
    { id: CORRECTION, applied: true },
    { id: OUTLOOK, applied: true },
  ]);
  assert.equal(await tableExists(fixture.adminPool, "email_filing_placements"), true);
  assert.equal(await tableExists(fixture.adminPool, "conversation_policies"), true);
  assert.equal((await verifyClientOperationsPostgresMigrations(fixture.adminPool)).at(-1).id, OUTLOOK);
});

test("combined client catalog upgrades a database already at filing correction 302 without replaying it", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const catalog = listClientOperationsPostgresMigrations();
  const correctionIndex = catalog.findIndex(({ id }) => id === CORRECTION);
  assert.ok(correctionIndex > 0);
  await runPostgresMigrations(fixture.adminPool, {
    migrations: catalog.slice(0, correctionIndex + 1),
    appliedBy: "outlook-combined-correction-prefix-test",
  });
  assert.equal(await tableExists(fixture.adminPool, "email_filing_placements"), true);
  assert.equal(await tableExists(fixture.adminPool, "conversation_policies"), false);

  const result = await runClientOperationsPostgresMigrations(fixture.adminPool, {
    appliedBy: "outlook-combined-upgrade-test",
  });

  assert.equal(result.find(({ id }) => id === CORRECTION).applied, false);
  assert.equal(result.find(({ id }) => id === OUTLOOK).applied, true);
  assert.equal(await tableExists(fixture.adminPool, "conversation_policies"), true);
  assert.equal((await verifyClientOperationsPostgresMigrations(fixture.adminPool)).at(-1).id, OUTLOOK);
});
