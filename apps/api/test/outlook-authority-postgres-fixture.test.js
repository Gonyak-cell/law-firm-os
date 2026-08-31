import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  startDisposablePostgres,
} from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  createOutlookAuthorityPostgresFixture,
  runOutlookAuthorityPostgresMigrations,
} from "./support/outlook-authority-postgres-fixture.js";

test("generic disposable PostgreSQL keeps caller-owned cleanup and root socket", async (t) => {
  const originalTmpdir = process.env.TMPDIR;
  const cleanupHooks = [];
  let generic;
  try {
    process.env.TMPDIR = "/tmp";
    generic = await startDisposablePostgres({
      after(cleanup) {
        cleanupHooks.push(cleanup);
      },
      skip(reason) {
        t.skip(reason);
      },
    });
  } finally {
    if (originalTmpdir === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = originalTmpdir;
  }
  if (!generic) return;
  try {
    assert.equal(cleanupHooks.length, 0);
    assert.deepEqual(Object.keys(generic).sort(), [
      "connection_string",
      "data_dir",
      "port",
      "root",
      "stop",
      "username",
    ]);
    assert.ok(readFileSync(join(generic.data_dir, "postmaster.opts"), "utf8")
      .includes(`"-k" "${join(generic.root, "socket")}"`));
  } finally {
    await generic.stop();
  }
});

test("terminal Client migrations use one direct Outlook authority cleanup", async (t) => {
  const cleanupHooks = [];
  const fixture = await createOutlookAuthorityPostgresFixture({
    after(cleanup) {
      cleanupHooks.push(cleanup);
    },
    skip(reason) {
      t.skip(reason);
    },
  });
  if (!fixture) return;
  assert.equal(cleanupHooks.length, 1);
  try {
    assert.deepEqual(Object.keys(fixture.instance).sort(), [
      "connection_string",
      "data_dir",
      "port",
      "root",
      "stop",
      "username",
    ]);
    const outlookOptions = readFileSync(
      join(fixture.instance.data_dir, "postmaster.opts"),
      "utf8",
    );
    assert.match(outlookOptions, /"-k" "\/tmp\/lawos-pg-socket-[^"]+"/);
    assert.ok(!outlookOptions.includes(
      `"-k" "${join(fixture.instance.root, "socket")}"`,
    ));
    const identity = (await fixture.adminPool.query(
      "SELECT session_user,current_user,current_database() AS database_name",
    )).rows[0];
    assert.deepEqual(identity, {
      session_user: "lawos_admin",
      current_user: "lawos_admin",
      database_name: "lawos",
    });

    const applied = await runOutlookAuthorityPostgresMigrations(fixture, {
      appliedBy: "outlook-authority-fixture-apply",
    });
    assert.equal(applied.outcome, "committed");
    assert.equal(applied.migrations.find(
      ({ id }) => id === "306_client_outlook_desktop_assignment",
    )?.applied, true);
    assert.equal(applied.migrations.find(
      ({ id }) => id ===
        "307_client_outlook_desktop_trusted_current_read",
    )?.applied, true);
    assert.equal(applied.migrations.find(
      ({ id }) => id ===
        "308_client_outlook_desktop_legacy_windows_compatibility",
    )?.applied, true);
    assert.equal(applied.role_configuration_transaction_committed_count, 1);
    assert.equal(applied.outlook_assignment_transaction_committed, true);

    const replay = await runOutlookAuthorityPostgresMigrations(fixture, {
      appliedBy: "outlook-authority-fixture-replay",
    });
    assert.equal(replay.outcome, "verified");
    assert.equal(replay.migration_applied_count, 0);
    assert.equal(replay.postgres_mutation_committed_count, 0);
    assert.equal(replay.role_bootstrap_sha256, applied.role_bootstrap_sha256);

    const adminAttributes = (await fixture.adminPool.query(
      `SELECT rolinherit, rolbypassrls
         FROM pg_roles WHERE rolname = current_user`,
    )).rows[0];
    assert.deepEqual(adminAttributes, {
      rolinherit: false,
      rolbypassrls: false,
    });
    const seed = [
      "tenant_outlook_fixture_seed",
      "Outlook fixture seed",
    ];
    await assert.rejects(
      fixture.adminPool.query(
        `INSERT INTO lawos_identity.tenants
           (tenant_id, display_name, deployment_mode, staff_auth_authority)
         VALUES ($1, $2, 'tenant-pinned', 'internal-password')`,
        seed,
      ),
      (error) => error?.code === "42501",
    );
    await fixture.bootstrapPool.query(
      `INSERT INTO lawos_identity.tenants
         (tenant_id, display_name, deployment_mode, staff_auth_authority)
       VALUES ($1, $2, 'tenant-pinned', 'internal-password')`,
      seed,
    );
    assert.equal((await fixture.adminPool.query(
      `SELECT count(*)::integer AS count FROM lawos_identity.tenants
        WHERE tenant_id = $1`,
      [seed[0]],
    )).rows[0].count, 0);
    assert.equal((await fixture.bootstrapPool.query(
      `SELECT count(*)::integer AS count FROM lawos_identity.tenants
        WHERE tenant_id = $1`,
      [seed[0]],
    )).rows[0].count, 1);
  } finally {
    await cleanupHooks[0]();
  }
});
