import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  attachPostgresTenantContextSecret,
  createPostgresPool,
} from "../../persistence/src/postgres/pool.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import {
  readOutlookDesktopReleaseArtifactSnapshot,
} from "../src/outlook-desktop-release-artifact-snapshot.js";
import {
  createPostgresOutlookDesktopReleaseArtifactImporter,
  OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS,
} from "../src/postgres-outlook-desktop-release-artifact-importer.js";
import {
  releaseArtifact,
} from "./helpers/outlook-desktop-release-trust-migration-fixture.js";

const TENANT = "tenant-release-import-a";
const TENANT_CONTEXT_SECRET = "release-import-tenant-context-secret-0001";

function packet(suffix, bytes, overrides = {}) {
  const at = Date.now();
  const row = releaseArtifact(String(suffix), {
    tenant_id: TENANT,
    final_artifact_sha256: createHash("sha256").update(bytes).digest("hex"),
    final_artifact_bytes: bytes.length,
    macos_certificate_valid_from: new Date(at - 86_400_000).toISOString(),
    macos_certificate_valid_until: new Date(at + 3 * 86_400_000).toISOString(),
    macos_evidence_observed_at: new Date(at - 60_000).toISOString(),
    macos_evidence_expires_at: new Date(at + 2 * 86_400_000).toISOString(),
    ticket_issued_at: new Date(at - 86_400_000).toISOString(),
    ticket_expires_at: new Date(at + 2 * 86_400_000).toISOString(),
    valid_from: new Date(at + 60_000).toISOString(),
    valid_until: new Date(at + 86_400_000).toISOString(),
    ...overrides,
  });
  return Object.freeze(Object.fromEntries(
    OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS.map((key) => [
      key,
      key === "approval_audit_event_id"
        ? `release-import-approval-${suffix}`
        : row[key],
    ]),
  ));
}

function snapshot(t, bytes) {
  const root = mkdtempSync(join(tmpdir(), "lawos-final-dmg-"));
  const name = "formal-macos.dmg";
  writeFileSync(join(root, name), bytes, { mode: 0o600 });
  const metadata = statSync(join(root, name));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return readOutlookDesktopReleaseArtifactSnapshot({
    rootDir: root,
    artifactPath: name,
    expectedUid: metadata.uid,
    expectedGid: metadata.gid,
    expectedMode: 0o600,
  });
}

function receipt(artifact, approvedAt = new Date().toISOString()) {
  return Object.freeze({
    authority: "postgres-outlook-desktop-release-artifact-importer",
    outcome: "imported",
    tenant_id: TENANT,
    release_artifact_id: artifact.release_artifact_id,
    release_ticket_sha256: artifact.embedded_release_ticket_sha256,
    final_artifact_sha256: artifact.final_artifact_sha256,
    final_artifact_bytes: artifact.final_artifact_bytes,
    approval_sha256: artifact.approval_sha256,
    approval_audit_event_id: artifact.approval_audit_event_id,
    approval_audit_event_binding_sha256: "a".repeat(64),
    release_authority_sha256: "b".repeat(64),
    approved_at: approvedAt,
    valid_until: artifact.valid_until,
    revoked: false,
    production_ready_claim: false,
  });
}

function fakeControlPool({ importErrorCount = 0, now, responseText, tenantId = TENANT }) {
  const queries = [];
  let remainingImportErrors = importErrorCount;
  const client = {
    async query(statement, values) {
      const sql = String(statement);
      queries.push(Object.freeze({ sql, values }));
      if (sql.includes("lawos_security.current_tenant_id()")) {
        return { rows: [{ tenant_id: tenantId }] };
      }
      if (sql.includes("clock_timestamp()")) return { rows: [{ now }] };
      if (sql.includes("replay_outlook_desktop_release_import")) {
        return { rows: [{ response_text: responseText?.replay ?? null }] };
      }
      if (sql.includes("import_outlook_desktop_release_artifact")) {
        if (remainingImportErrors > 0) {
          remainingImportErrors -= 1;
          throw Object.assign(new Error("forced serialization retry"), { code: "40001" });
        }
        return { rows: [{ response_text: responseText?.execute ?? null }] };
      }
      return { rows: [], rowCount: 0 };
    },
    release() {},
  };
  return Object.freeze(attachPostgresTenantContextSecret({
    queries,
    async connect() { return client; },
  }, TENANT_CONTEXT_SECRET));
}

function importerOptions(controlPool, authorizeImport) {
  return {
    authorize_import: authorizeImport,
    control_pool: controlPool,
    tenant_id: TENANT,
  };
}

test("release importer requires the dedicated control pool and external authority", () => {
  const controlPool = { connect() {} };
  assert.throws(
    () => createPostgresOutlookDesktopReleaseArtifactImporter({
      authorize_import: async () => true,
      pool: controlPool,
      tenant_id: TENANT,
    }),
    /unknown option: pool/u,
  );
  assert.throws(
    () => createPostgresOutlookDesktopReleaseArtifactImporter({
      control_pool: controlPool,
      tenant_id: TENANT,
    }),
    (error) => error?.safe_error_code === "OUTLOOK_RELEASE_IMPORT_AUTHORITY_REQUIRED",
  );
  assert.throws(
    () => createPostgresOutlookDesktopReleaseArtifactImporter({
      ...importerOptions(controlPool, async () => true),
      fault_injector() {},
    }),
    /unknown option: fault_injector/u,
  );
});

test("same-descriptor authorization calls only the exact import and replay functions", async (t) => {
  const bytes = Buffer.from("formal macOS final DMG importer boundary\n".repeat(8));
  const artifact = packet(1, bytes);
  const artifactSnapshot = snapshot(t, bytes);
  const expected = receipt(artifact);
  const pool = fakeControlPool({
    now: expected.approved_at,
    responseText: {
      execute: JSON.stringify(expected),
      replay: JSON.stringify(expected),
    },
  });
  const authorizations = [];
  const importer = createPostgresOutlookDesktopReleaseArtifactImporter(
    importerOptions(pool, async (authorization) => {
      authorizations.push(Object.freeze({
        authorityQueryCount: pool.queries.filter(({ sql }) =>
          sql.includes("lawos_email_dms.")).length,
        request: authorization,
      }));
      return true;
    }),
  );
  const command = Object.freeze({
    artifact,
    artifact_snapshot: artifactSnapshot,
    request_id: "release-import-request-1",
  });

  const validated = await importer.validate(command);
  assert.deepEqual(validated, {
    authority: "postgres-outlook-desktop-release-artifact-importer",
    outcome: "validated",
    tenant_id: TENANT,
    request_id: command.request_id,
    release_artifact_id: artifact.release_artifact_id,
    final_artifact_sha256: artifact.final_artifact_sha256,
    validated_at: expected.approved_at,
    writes: 0,
    production_ready_claim: false,
  });
  assert.deepEqual(await importer.execute(command), expected);
  assert.deepEqual(await importer.replay(command), expected);
  assert.equal(authorizations.length, 2);
  assert.deepEqual(
    authorizations.map(({ authorityQueryCount }) => authorityQueryCount),
    [0, 0],
  );
  for (const { request: authorization } of authorizations) {
    assert.equal(Object.isFrozen(authorization), true);
    assert.equal(Object.isFrozen(authorization.artifact), true);
    assert.equal(Object.isFrozen(authorization.final_artifact_measurement), true);
    assert.equal(authorization.operation, "import");
    assert.equal(authorization.request_id, command.request_id);
    assert.equal(authorization.tenant_id, TENANT);
    assert.deepEqual(authorization.artifact, artifact);
    assert.deepEqual(authorization.final_artifact_measurement, {
      gid: artifactSnapshot.gid,
      identity: artifactSnapshot.identity,
      mode: artifactSnapshot.mode,
      nlink: artifactSnapshot.nlink,
      sha256: artifactSnapshot.sha256,
      size: artifactSnapshot.size,
      uid: artifactSnapshot.uid,
    });
  }
  const authorityQueries = pool.queries.filter(({ sql }) =>
    sql.includes("lawos_email_dms."));
  assert.equal(authorityQueries.length, 2);
  assert.match(
    authorityQueries[0].sql,
    /^SELECT lawos_email_dms\.import_outlook_desktop_release_artifact\(\$1,\$2,\$3::jsonb\) AS response_text$/u,
  );
  assert.match(
    authorityQueries[1].sql,
    /^SELECT lawos_email_dms\.replay_outlook_desktop_release_import\(\$1,\$2,\$3::jsonb\) AS response_text$/u,
  );
  assert.deepEqual(authorityQueries[0].values, [
    TENANT, command.request_id, JSON.stringify(artifact),
  ]);
  assert.doesNotMatch(
    pool.queries.map(({ sql }) => sql).join("\n"),
    /\b(?:INSERT|UPDATE|DELETE|MERGE)\b|\bFROM\s+lawos_email_dms\.outlook_desktop_release_/iu,
  );
});

test("stored replay survives expired trust windows without local measurement or authorization", async () => {
  const at = Date.now();
  const bytes = Buffer.from("expired release import replay boundary");
  const artifact = packet(7, bytes, {
    macos_certificate_valid_from: new Date(at - 120_000).toISOString(),
    macos_certificate_valid_until: new Date(at - 60_000).toISOString(),
    valid_from: new Date(at - 120_000).toISOString(),
    valid_until: new Date(at - 60_000).toISOString(),
  });
  const expected = receipt(artifact, new Date(at - 90_000).toISOString());
  const pool = fakeControlPool({
    now: new Date(at).toISOString(),
    responseText: { replay: JSON.stringify(expected) },
  });
  let authorizationCount = 0;
  let snapshotReadCount = 0;
  const importer = createPostgresOutlookDesktopReleaseArtifactImporter(
    importerOptions(pool, async () => {
      authorizationCount += 1;
      return true;
    }),
  );
  const command = {
    artifact,
    get artifact_snapshot() {
      snapshotReadCount += 1;
      throw new Error("expired replay must not inspect local artifact bytes");
    },
    request_id: "release-import-expired-replay-7",
  };

  assert.deepEqual(await importer.replay(command), expected);
  assert.equal(snapshotReadCount, 0);
  assert.equal(authorizationCount, 0);
  assert.equal(pool.queries.filter(({ sql }) =>
    sql.includes("clock_timestamp()")).length, 0);
  assert.equal(pool.queries.filter(({ sql }) =>
    sql.includes("replay_outlook_desktop_release_import")).length, 1);
});

test("serialization retries only the idempotent control function after one authorization", async (t) => {
  const bytes = Buffer.from("serializable release import retry boundary");
  const artifact = packet(5, bytes);
  const expected = receipt(artifact);
  const pool = fakeControlPool({
    importErrorCount: 1,
    now: expected.approved_at,
    responseText: { execute: JSON.stringify(expected) },
  });
  let authorizationCount = 0;
  const importer = createPostgresOutlookDesktopReleaseArtifactImporter(
    importerOptions(pool, async () => {
      authorizationCount += 1;
      return true;
    }),
  );

  assert.deepEqual(await importer.execute({
    artifact,
    artifact_snapshot: snapshot(t, bytes),
    request_id: "release-import-serialization-retry-5",
  }), expected);
  assert.equal(authorizationCount, 1);
  assert.equal(pool.queries.filter(({ sql }) =>
    sql.includes("import_outlook_desktop_release_artifact")).length, 2);
});

test("artifact fields are captured once before validation and authorization", async (t) => {
  const bytes = Buffer.from("single-read release artifact boundary");
  const artifact = packet(6, bytes);
  const changingArtifact = { ...artifact };
  let platformReads = 0;
  Object.defineProperty(changingArtifact, "platform", {
    enumerable: true,
    get() {
      platformReads += 1;
      return platformReads < 3 ? "darwin" : "win32";
    },
  });
  const expected = receipt(artifact);
  const pool = fakeControlPool({
    now: expected.approved_at,
    responseText: { execute: JSON.stringify(expected) },
  });
  let authorizedArtifact;
  const importer = createPostgresOutlookDesktopReleaseArtifactImporter(
    importerOptions(pool, async ({ artifact: value }) => {
      authorizedArtifact = value;
      return true;
    }),
  );

  assert.deepEqual(await importer.execute({
    artifact: changingArtifact,
    artifact_snapshot: snapshot(t, bytes),
    request_id: "release-import-single-read-6",
  }), expected);
  assert.equal(platformReads, 1);
  assert.equal(authorizedArtifact.platform, "darwin");
  const importedArtifact = JSON.parse(pool.queries.find(({ sql }) =>
    sql.includes("import_outlook_desktop_release_artifact")).values[2]);
  assert.equal(importedArtifact.platform, "darwin");
});

test("invalid snapshots and denied authorization never reach release SQL", async (t) => {
  const bytes = Buffer.from("denied release importer fixture");
  const artifact = packet(2, bytes);
  const pool = fakeControlPool({ now: new Date().toISOString() });
  const importer = createPostgresOutlookDesktopReleaseArtifactImporter(
    importerOptions(pool, async () => false),
  );
  await assert.rejects(
    importer.execute({
      artifact,
      artifact_snapshot: snapshot(t, bytes),
      request_id: "release-import-request-2",
    }),
    (error) => error?.safe_error_code === "OUTLOOK_RELEASE_IMPORT_NOT_AUTHORIZED"
      && error?.status === 403,
  );
  await assert.rejects(
    importer.execute({
      artifact,
      artifact_snapshot: JSON.parse(JSON.stringify(snapshot(t, bytes))),
      request_id: "release-import-request-3",
    }),
    (error) => error?.safe_error_code
      === "OUTLOOK_RELEASE_IMPORT_FINAL_ARTIFACT_SNAPSHOT_INVALID",
  );
  assert.equal(
    pool.queries.filter(({ sql }) => sql.includes("lawos_email_dms.")).length,
    0,
  );

  const wrongTypePool = fakeControlPool({ now: new Date().toISOString() });
  let wrongTypeAuthorizationCount = 0;
  const wrongTypeImporter = createPostgresOutlookDesktopReleaseArtifactImporter(
    importerOptions(wrongTypePool, async () => {
      wrongTypeAuthorizationCount += 1;
      return true;
    }),
  );
  let coercionCount = 0;
  const invalidTeamIds = [
    [artifact.macos_team_id],
    { toString() { coercionCount += 1; return artifact.macos_team_id; } },
  ];
  for (const [index, macosTeamId] of invalidTeamIds.entries()) {
    await assert.rejects(
      wrongTypeImporter.validate({
        artifact: { ...artifact, macos_team_id: macosTeamId },
        artifact_snapshot: snapshot(t, bytes),
        request_id: `release-import-team-id-wrong-type-${index}`,
      }),
      (error) => error?.safe_error_code === "OUTLOOK_RELEASE_IMPORT_INVALID",
    );
  }
  assert.equal(coercionCount, 0);
  assert.equal(wrongTypeAuthorizationCount, 0);
  assert.equal(wrongTypePool.queries.length, 0);

  const validReceipt = receipt(artifact);
  const invalidReceipts = [
    { ...validReceipt, tenant_id: "tenant-release-import-confused-deputy" },
    Object.fromEntries(Object.entries(validReceipt).filter(
      ([key]) => key !== "release_authority_sha256",
    )),
    { ...validReceipt, release_authority_sha256: "not-a-sha256" },
    { ...validReceipt, release_authority_sha256: ["b".repeat(64)] },
    { ...validReceipt, approval_audit_event_binding_sha256: ["a".repeat(64)] },
    { ...validReceipt, approved_at: Date.parse(validReceipt.approved_at) },
    { ...validReceipt, valid_until: Date.parse(validReceipt.valid_until) },
    { ...validReceipt, unexpected_key: true },
  ];
  for (const [index, invalidReceipt] of invalidReceipts.entries()) {
    const invalidResponsePool = fakeControlPool({
      now: new Date().toISOString(),
      responseText: { execute: JSON.stringify(invalidReceipt) },
    });
    const responseImporter = createPostgresOutlookDesktopReleaseArtifactImporter(
      importerOptions(invalidResponsePool, async () => true),
    );
    await assert.rejects(
      responseImporter.execute({
        artifact,
        artifact_snapshot: snapshot(t, bytes),
        request_id: `release-import-response-invalid-${index}`,
      }),
      (error) => error?.safe_error_code === "OUTLOOK_RELEASE_IMPORT_RESPONSE_INVALID"
        && error?.status === 500,
    );
  }
  await assert.rejects(
    importer.validate({
      artifact: { ...artifact, platform: "win32" },
      artifact_snapshot: snapshot(t, bytes),
      request_id: "release-import-windows-unsigned-2",
    }),
    (error) => error?.safe_error_code === "WINDOWS_AUTHENTICODE_REQUIRED"
      && error?.status === 403,
  );
});

test("legacy 001-006 prefix keeps protected tables closed while the control function works on PostgreSQL 16", async (t) => {
  let controlPool;
  let wrongContextPool;
  t.after(async () => {
    await controlPool?.end();
    await wrongContextPool?.end();
  });
  const priorTmpdir = process.env.TMPDIR;
  process.env.TMPDIR = "/tmp";
  t.after(() => {
    if (priorTmpdir === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = priorTmpdir;
  });
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const version = Number((await fixture.adminPool.query(
    "SELECT current_setting('server_version_num')::int AS version",
  )).rows[0].version);
  assert.equal(Math.trunc(version / 10_000), 16);
  const migrations = listEmailDmsPostgresMigrations();
  const releaseTrustIndex = migrations.findIndex(
    ({ id }) => id === "006_outlook_desktop_release_trust",
  );
  assert.notEqual(releaseTrustIndex, -1);
  const prefix = migrations.slice(0, releaseTrustIndex + 1);
  assert.equal(prefix.at(-1).id, "006_outlook_desktop_release_trust");
  for (const migration of prefix) await fixture.adminPool.query(migration.sql);
  const adminRole = (await fixture.adminPool.query(
    "SELECT session_user::text AS role",
  )).rows[0].role;
  await fixture.adminPool.query(`
    CREATE ROLE lawos_outlook_authority_owner
      NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOREPLICATION NOBYPASSRLS;
    CREATE ROLE lawos_outlook_control_operator
      LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE
      NOREPLICATION NOBYPASSRLS;
    INSERT INTO lawos_security.tenant_context_authorities
      (database_role,tenant_id,context_secret,synthetic_wildcard)
    VALUES
      ('lawos_outlook_control_operator','${TENANT}',convert_to('${TENANT_CONTEXT_SECRET}','UTF8'),false),
      ('${adminRole}','${TENANT}',convert_to('${TENANT_CONTEXT_SECRET}','UTF8'),false);
    REVOKE ALL ON lawos_email_dms.outlook_desktop_release_artifacts
      FROM PUBLIC,lawos_outlook_control_operator;
    REVOKE ALL ON lawos_email_dms.outlook_desktop_release_trust_audit_events
      FROM PUBLIC,lawos_outlook_control_operator;
    CREATE TABLE lawos_email_dms.outlook_release_importer_prefix_receipts (
      tenant_id text NOT NULL,
      request_id text NOT NULL,
      artifact jsonb NOT NULL,
      response_text text NOT NULL,
      PRIMARY KEY (tenant_id,request_id)
    );
    ALTER TABLE lawos_email_dms.outlook_release_importer_prefix_receipts
      OWNER TO lawos_outlook_authority_owner;
    CREATE OR REPLACE FUNCTION lawos_email_dms.import_outlook_desktop_release_artifact(
      bound_tenant_id text,bound_request_id text,bound_artifact jsonb
    ) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path=pg_catalog,lawos_email_dms,lawos_security
    AS $function$
    DECLARE stored lawos_email_dms.outlook_release_importer_prefix_receipts%ROWTYPE;
    DECLARE response_text_value text;
    DECLARE now_at timestamptz := date_trunc('milliseconds',clock_timestamp());
    BEGIN
      IF session_user<>'lawos_outlook_control_operator' THEN
        RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
      END IF;
      IF lawos_security.current_tenant_id()<>bound_tenant_id THEN
        RAISE EXCEPTION 'outlook desktop tenant mismatch' USING ERRCODE='42501';
      END IF;
      SELECT * INTO stored
        FROM lawos_email_dms.outlook_release_importer_prefix_receipts
       WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id;
      IF FOUND THEN
        IF stored.artifact<>bound_artifact THEN
          RAISE EXCEPTION 'outlook desktop release import replay conflict';
        END IF;
        RETURN stored.response_text;
      END IF;
      response_text_value := jsonb_build_object(
        'authority','postgres-outlook-desktop-release-artifact-importer',
        'outcome','imported','tenant_id',bound_tenant_id,
        'release_artifact_id',bound_artifact->>'release_artifact_id',
        'release_ticket_sha256',bound_artifact->>'embedded_release_ticket_sha256',
        'final_artifact_sha256',bound_artifact->>'final_artifact_sha256',
        'final_artifact_bytes',(bound_artifact->>'final_artifact_bytes')::bigint,
        'approval_sha256',bound_artifact->>'approval_sha256',
        'approval_audit_event_id',bound_artifact->>'approval_audit_event_id',
        'approval_audit_event_binding_sha256',repeat('a',64),
        'release_authority_sha256',repeat('b',64),
        'approved_at',now_at,'valid_until',bound_artifact->>'valid_until',
        'revoked',false,'production_ready_claim',false
      )::text;
      INSERT INTO lawos_email_dms.outlook_release_importer_prefix_receipts
        (tenant_id,request_id,artifact,response_text)
      VALUES (bound_tenant_id,bound_request_id,bound_artifact,response_text_value);
      RETURN response_text_value;
    END
    $function$;
    ALTER FUNCTION lawos_email_dms.import_outlook_desktop_release_artifact(text,text,jsonb)
      OWNER TO lawos_outlook_authority_owner;
    CREATE OR REPLACE FUNCTION lawos_email_dms.replay_outlook_desktop_release_import(
      bound_tenant_id text,bound_request_id text,bound_artifact jsonb
    ) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path=pg_catalog,lawos_email_dms,lawos_security
    AS $function$
    DECLARE stored lawos_email_dms.outlook_release_importer_prefix_receipts%ROWTYPE;
    BEGIN
      IF session_user<>'lawos_outlook_control_operator' THEN
        RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
      END IF;
      IF lawos_security.current_tenant_id()<>bound_tenant_id THEN
        RAISE EXCEPTION 'outlook desktop tenant mismatch' USING ERRCODE='42501';
      END IF;
      SELECT * INTO stored
        FROM lawos_email_dms.outlook_release_importer_prefix_receipts
       WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id;
      IF NOT FOUND THEN RETURN NULL; END IF;
      IF stored.artifact<>bound_artifact THEN
        RAISE EXCEPTION 'outlook desktop release import replay conflict';
      END IF;
      RETURN stored.response_text;
    END
    $function$;
    ALTER FUNCTION lawos_email_dms.replay_outlook_desktop_release_import(text,text,jsonb)
      OWNER TO lawos_outlook_authority_owner;
    REVOKE ALL ON FUNCTION
      lawos_email_dms.import_outlook_desktop_release_artifact(text,text,jsonb),
      lawos_email_dms.replay_outlook_desktop_release_import(text,text,jsonb)
      FROM PUBLIC;
    GRANT USAGE ON SCHEMA lawos_email_dms TO
      lawos_outlook_authority_owner,lawos_outlook_control_operator;
    GRANT EXECUTE ON FUNCTION
      lawos_email_dms.import_outlook_desktop_release_artifact(text,text,jsonb),
      lawos_email_dms.replay_outlook_desktop_release_import(text,text,jsonb)
      TO lawos_outlook_control_operator;
  `);
  const controlUrl = new URL(fixture.instance.connection_string);
  controlUrl.username = "lawos_outlook_control_operator";
  controlPool = createPostgresPool({
    connectionString: controlUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-release-import-control-test",
    tenantContextSecret: TENANT_CONTEXT_SECRET,
  });
  const role = (await controlPool.query(`
    SELECT session_user::text AS session_user,rolsuper,rolcreatedb,
           rolcreaterole,rolinherit,rolreplication,rolbypassrls,
           has_table_privilege(session_user,
             'lawos_email_dms.outlook_desktop_release_artifacts','SELECT') AS artifact_select,
           has_table_privilege(session_user,
             'lawos_email_dms.outlook_desktop_release_artifacts','INSERT') AS artifact_insert,
           has_table_privilege(session_user,
             'lawos_email_dms.outlook_desktop_release_trust_audit_events','INSERT') AS audit_insert,
           has_function_privilege(session_user,
             'lawos_email_dms.import_outlook_desktop_release_artifact(text,text,jsonb)',
             'EXECUTE') AS function_execute
      FROM pg_roles WHERE rolname=session_user
  `)).rows[0];
  assert.deepEqual(role, {
    session_user: "lawos_outlook_control_operator",
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolinherit: false,
    rolreplication: false,
    rolbypassrls: false,
    artifact_select: false,
    artifact_insert: false,
    audit_insert: false,
    function_execute: true,
  });
  await assert.rejects(
    controlPool.query(
      "DELETE FROM lawos_email_dms.outlook_desktop_release_artifacts WHERE false",
    ),
    (error) => error?.code === "42501",
  );

  const bytes = Buffer.from("PostgreSQL 16 importer control boundary fixture");
  const artifact = packet(4, bytes);
  const command = {
    artifact,
    artifact_snapshot: snapshot(t, bytes),
    request_id: "release-import-pg16-4",
  };
  const importer = createPostgresOutlookDesktopReleaseArtifactImporter(
    importerOptions(controlPool, async () => true),
  );
  assert.equal(await importer.replay(command), null);
  const imported = await importer.execute(command);
  assert.equal(imported.outcome, "imported");
  assert.equal(imported.release_artifact_id, artifact.release_artifact_id);
  assert.deepEqual(await importer.execute(command), imported);
  assert.deepEqual(await importer.replay(command), imported);

  attachPostgresTenantContextSecret(fixture.adminPool, TENANT_CONTEXT_SECRET);
  const adminImporter = createPostgresOutlookDesktopReleaseArtifactImporter(
    importerOptions(fixture.adminPool, async () => true),
  );
  await assert.rejects(
    adminImporter.execute({ ...command, request_id: "release-import-admin-4" }),
    (error) => error?.code === "LAWOS_POSTGRES_ACCESS_DENIED"
      && error?.postgres_code === "42501" && error?.status === 403,
  );
  wrongContextPool = createPostgresPool({
    connectionString: controlUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-release-import-wrong-context-test",
    tenantContextSecret: "wrong-release-import-context-secret-0001",
  });
  const wrongContextImporter = createPostgresOutlookDesktopReleaseArtifactImporter(
    importerOptions(wrongContextPool, async () => true),
  );
  await assert.rejects(
    wrongContextImporter.execute({ ...command, request_id: "release-import-wrong-context-4" }),
    (error) => error?.code ===
        "LAWOS_POSTGRES_TENANT_CONTEXT_AUTHENTICATION_FAILED"
      && error?.safe_error_code ===
        "POSTGRES_TENANT_CONTEXT_AUTHENTICATION_FAILED"
      && error?.status === 403,
  );
});
