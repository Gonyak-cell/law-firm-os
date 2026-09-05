import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { createMigratedPostgresFixture, startDisposablePostgres } from "../../persistence/test/helpers/disposable-postgres.js";
import { createPostgresPool } from "../../persistence/src/postgres/pool.js";
import { listPostgresFoundationMigrations } from "../../persistence/src/postgres/migration-catalog.js";
import { runPostgresMigrations } from "../../persistence/src/postgres/migration-runner.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { stableJsonStringify } from "../../persistence/src/durable-file.js";
import { createPostgresDmsUploadRuntime } from "../src/postgres-upload-runtime.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";

const TENANT = "tenant-corporate-upload-test";
const OWNER = "owner-corporate-upload-test";
const NOW = "2026-09-05T08:00:00.000Z";
const EXPIRY = "2026-09-05T08:15:00.000Z";
const BYTES = Buffer.from("synthetic corporate registration evidence");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const hash = (value) => digest(stableJsonStringify(value));
const workspace = (overrides = {}) => ({
  model_type: "DmsWorkspace", tenant_id: TENANT, workspace_id: "workspace-corporate-upload",
  scope_type: "legal_entity_administration", matter_id: null, legal_entity_id: "entity-corporate-upload",
  organization_id: "organization-corporate-upload", party_id: "party-corporate-upload", owner_user_id: OWNER,
  permission_envelope_id: "envelope-corporate-upload", permission_ref: "permission-corporate-upload",
  synthetic_only: false, client_visible_by_default: false, status: "pending_anchor", name: "Synthetic corporate documents",
  ...overrides,
});
const document = (overrides = {}) => ({
  tenant_id: TENANT, document_id: "document-corporate-upload", current_version_id: "version-corporate-upload",
  matter_id: null, workspace_id: workspace().workspace_id, title: "Synthetic corporate document",
  permission_envelope_id: workspace().permission_envelope_id, audit_trace_id: "trace-corporate-upload",
  owner_user_id: OWNER, mime_type: "application/octet-stream", ...overrides,
});
const tx = (fixture, work) => withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, work);
async function insertWorkspace(fixture, value = workspace()) {
  await tx(fixture, (client) => client.query(
    `INSERT INTO lawos_domain.records (tenant_id,domain_id,record_type,record_id,state_version,payload,payload_hash)
     VALUES ($1,'dms-auxiliary','DmsWorkspace',$2,1,$3::jsonb,$4)`,
    [TENANT, value.workspace_id, JSON.stringify(value), hash(value)],
  ));
  return value;
}
async function updateWorkspace(fixture, value) {
  await tx(fixture, (client) => client.query(
    `UPDATE lawos_domain.records SET payload=$3::jsonb,payload_hash=$4,state_version=state_version+1
     WHERE tenant_id=$1 AND domain_id='dms-auxiliary' AND record_type='DmsWorkspace' AND record_id=$2`,
    [TENANT, value.workspace_id, JSON.stringify(value), hash(value)],
  ));
}
function runtime(fixture, storage, overrides = {}) {
  return createPostgresDmsUploadRuntime({ pool: fixture.appPool, storage, clock: () => new Date(NOW), ...overrides });
}
function upload(api, value = document(), overrides = {}) {
  return api.uploadDocument({ document: value, bytes: BYTES, actor_id: OWNER,
    idempotency_key: "corporate-upload-idempotency", session_id: "session-corporate-upload",
    object_id: "object-corporate-upload", expires_at: EXPIRY, ...overrides });
}
function createSession(api, overrides = {}) {
  return api.createUploadSession({ ...document(), version_id: document().current_version_id,
    session_id: "session-corporate-upload", idempotency_key: "corporate-upload-idempotency",
    object_id: "object-corporate-upload", content_type: "application/octet-stream", actor_id: OWNER,
    expected_sha256: digest(BYTES), expected_byte_size: BYTES.length, expires_at: EXPIRY, ...overrides });
}
const target = { tenant_id: TENANT, session_id: "session-corporate-upload", object_id: "object-corporate-upload" };
const rejected = (error) => error.safe_error_code === "DMS_CORPORATE_WORKSPACE_AUTHORITY_REJECTED";

test("bridge runtime keeps matter uploads working before corporate foundation 016 exists", async (t) => {
  const instance = await startDisposablePostgres(t); if (!instance) return;
  const tenantContextSecret = randomBytes(32);
  const pool = createPostgresPool({ connectionString: instance.connection_string, sslMode: "disable",
    allowInsecureLocal: true, tenantContextSecret });
  t.after(async () => { await pool.end(); await instance.stop(); });
  await runPostgresMigrations(pool, { migrations: listPostgresFoundationMigrations().filter((entry) => entry.id < "016_") });
  await pool.query(`INSERT INTO lawos_security.tenant_context_authorities (database_role,tenant_id,context_secret)
    VALUES ($1,$2,$3)`, [instance.username, TENANT, tenantContextSecret]);
  const columns = await pool.query(`SELECT column_name FROM information_schema.columns
    WHERE table_schema='lawos_dms' AND table_name='upload_sessions' AND column_name='workspace_authority_sha256'`);
  assert.equal(columns.rowCount, 0);
  const api = runtime({ appPool: pool }, createLocalStorageAdapter({ adapter_id: "pre-corporate-bridge" }));
  const value = document({ matter_id: "real-legacy-matter", workspace_id: "real-legacy-workspace" });
  assert.equal((await upload(api, value)).outcome, "created");
  assert.equal((await upload(api, value)).idempotent_replay, true);
  assert.equal((await api.getUploadSession(target)).workspace_authority_sha256, undefined);
});

test("corporate upload derives canonical authority, commits once, and preserves finalized replay after activation", async (t) => {
  const fixture = await createMigratedPostgresFixture(t); if (!fixture) return;
  const canonical = await insertWorkspace(fixture);
  const storage = createLocalStorageAdapter({ adapter_id: "corporate-success" });
  const api = runtime(fixture, storage);
  const first = await upload(api);
  assert.equal(first.document.matter_id, null);
  assert.equal(first.document.owner_user_id, OWNER);
  assert.equal(first.independent_digest_readback, true);
  assert.equal((await api.getUploadSession(target)).workspace_authority_sha256, hash(canonical));
  const before = await tx(fixture, (client) => client.query(
    "SELECT (SELECT count(*) FROM lawos_dms.audit_events) AS audit, (SELECT count(*) FROM lawos_dms.outbox_events) AS outbox"));
  await tx(fixture, async (client) => {
    for (const [type, id, fields] of [
      ["Entity", canonical.legal_entity_id, { entity_kind: "organization" }],
      ["Party", canonical.party_id, { party_type: "organization", canonical_entity_id: canonical.legal_entity_id }],
      ["Organization", canonical.organization_id, { entity_id: canonical.legal_entity_id, party_id: canonical.party_id }],
    ]) {
      const payload = { model_type: type, tenant_id: TENANT, owner_user_id: OWNER,
        [{ Entity: "entity_id", Party: "party_id", Organization: "organization_id" }[type]]: id,
        permission_ref: canonical.permission_ref, matter_id: null, status: "active", ...fields };
      await client.query(`INSERT INTO lawos_domain.records
        (tenant_id,domain_id,record_type,record_id,state_version,payload,payload_hash)
        VALUES ($1,'master-data',$2,$3,1,$4::jsonb,$5)`, [TENANT, type, id, JSON.stringify(payload), hash(payload)]);
    }
  });
  await updateWorkspace(fixture, { ...canonical, status: "active" });
  const replay = await upload(runtime(fixture, storage));
  assert.equal(replay.idempotent_replay, true);
  const after = await tx(fixture, (client) => client.query(
    "SELECT (SELECT count(*) FROM lawos_dms.audit_events) AS audit, (SELECT count(*) FROM lawos_dms.outbox_events) AS outbox"));
  assert.deepEqual(after.rows, before.rows);
  assert.equal(after.rows[0].outbox, "1");
  const events = await api.listAuditEvents({ tenant_id: TENANT });
  assert.equal(events.every((entry) => entry.authorization_workspace_id === canonical.workspace_id), true);
  await api.listDocuments({ tenant_id: TENANT, actor_id: OWNER });
  const listAudit = (await api.listAuditEvents({ tenant_id: TENANT })).find((entry) => entry.event_type === "dms.document.listed");
  assert.equal(listAudit.payload.returned_count, null);
  assert.equal(listAudit.payload.permission_filter_pending, true);
});

test("corporate upload rejects forged scope, matter, owner, tenant and envelope before storage; real matters stay compatible", async (t) => {
  const fixture = await createMigratedPostgresFixture(t); if (!fixture) return;
  await insertWorkspace(fixture);
  const storage = createLocalStorageAdapter({ adapter_id: "corporate-rejection" });
  let writes = 0;
  const api = runtime(fixture, { ...storage, stageObject: async (input) => { writes++; return storage.stageObject(input); } });
  for (const overrides of [
    { matter_id: "forged-matter" }, { owner_user_id: "forged-owner" }, { scope_type: "matter" },
    { permission_envelope_id: "forged-envelope" }, { tenant_id: "another-tenant" },
    { workspace_id: "missing-workspace" }, { legal_entity_id: "forged-entity" },
  ]) await assert.rejects(upload(api, document(overrides)), rejected);
  await assert.rejects(upload(api, document(), { actor_id: "forged-actor" }), rejected);
  await assert.rejects(createSession(api, { completion_authority: {
    schema_version: "law-firm-os.dms-completion-authority-contract.v1", provider: "docusign",
    tenant_id: TENANT, matter_id: "forged-matter", workspace_id: workspace().workspace_id,
    request_id: "synthetic-request", envelope_id: "synthetic-envelope", kind: "signed",
    sha256: digest(BYTES), object_id: target.object_id, idempotency_key: "corporate-upload-idempotency",
    permission_envelope_id: workspace().permission_envelope_id, audit_trace_id: document().audit_trace_id,
    fencing_generation: 1,
  } }), rejected);
  assert.equal(writes, 0);
  const legacy = await upload(api, document({ matter_id: "real-matter", workspace_id: "legacy-matter-workspace" }));
  assert.equal(legacy.document.matter_id, "real-matter");
  assert.equal((await api.getUploadSession(target)).workspace_authority_sha256, null);
});

test("stale corporate workspace pin blocks provider finalize and durably preserves staged bytes", async (t) => {
  const fixture = await createMigratedPostgresFixture(t); if (!fixture) return;
  const canonical = await insertWorkspace(fixture);
  const storage = createLocalStorageAdapter({ adapter_id: "corporate-stale" });
  const api = runtime(fixture, storage);
  const created = await createSession(api, { workspace_authority_sha256: "f".repeat(64) });
  assert.equal(created.session.workspace_authority_sha256, hash(canonical));
  await api.stageUpload({ ...target, bytes: BYTES });
  await updateWorkspace(fixture, { ...canonical, name: "Changed canonical name" });
  await assert.rejects(api.finalizeUpload(target), rejected);
  const failed = await api.getUploadSession(target);
  assert.equal(failed.state, "failed_terminal");
  assert.equal(failed.dead_letter_receipt.automatic_cleanup_allowed, false);
  assert.equal(storage.statStagedObject(target).sha256, digest(BYTES));
  assert.equal(storage.statObject(target), null);
  await assert.rejects(api.cleanupOrphan(target), (error) => error.safe_error_code === "DMS_CORPORATE_UPLOAD_CLEANUP_BLOCKED");
  assert.deepEqual(await api.reconcileUploadSessions({ tenant_id: TENANT }), []);
  assert.equal(storage.statStagedObject(target).sha256, digest(BYTES));
});

test("corporate staging failure preserves provider bytes and expired reconciliation never deletes them", async (t) => {
  const fixture = await createMigratedPostgresFixture(t); if (!fixture) return;
  await insertWorkspace(fixture);
  const storage = createLocalStorageAdapter({ adapter_id: "corporate-stage-failure" });
  const api = runtime(fixture, storage, { faultInjector: (phase) => {
    if (phase === "after_storage_stage_before_db_update") throw new Error("synthetic stage database failure");
  } });
  await createSession(api);
  await assert.rejects(api.stageUpload({ ...target, bytes: BYTES }), /synthetic stage database failure/u);
  assert.equal(storage.statStagedObject(target).sha256, digest(BYTES));
  const later = runtime(fixture, storage, { clock: () => new Date("2026-09-05T09:00:00.000Z") });
  assert.deepEqual(await later.reconcileUploadSessions({ tenant_id: TENANT }), []);
  assert.equal((await later.getUploadSession(target)).dead_letter_receipt.uploaded_bytes_preserved, true);
  assert.equal(storage.statStagedObject(target).sha256, digest(BYTES));
});

test("corporate metadata outbox failure rolls back document metadata while finalized bytes survive", async (t) => {
  const fixture = await createMigratedPostgresFixture(t); if (!fixture) return;
  await insertWorkspace(fixture);
  await fixture.adminPool.query(`CREATE FUNCTION lawos_dms.reject_corporate_test_outbox() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN RAISE EXCEPTION 'synthetic corporate outbox failure'; END; $$;
    CREATE TRIGGER reject_corporate_test_outbox BEFORE INSERT ON lawos_dms.outbox_events
    FOR EACH ROW EXECUTE FUNCTION lawos_dms.reject_corporate_test_outbox()`);
  const storage = createLocalStorageAdapter({ adapter_id: "corporate-metadata-failure" });
  const api = runtime(fixture, storage);
  await assert.rejects(upload(api), (error) => error.postgres_code === "P0001");
  assert.equal(storage.statObject(target).sha256, digest(BYTES));
  assert.equal(await api.getDocumentState({ tenant_id: TENANT, document_id: document().document_id }), null);
  const rows = await tx(fixture, (client) => client.query(
    "SELECT (SELECT count(*) FROM lawos_dms.file_objects) AS objects, (SELECT count(*) FROM lawos_dms.outbox_events) AS outbox"));
  assert.deepEqual(rows.rows[0], { objects: "0", outbox: "0" });
  const failed = await api.getUploadSession(target);
  assert.equal(failed.dead_letter_receipt.provider_bytes_committed, true);
  assert.equal(failed.dead_letter_receipt.recovery_state, "manual_recovery_required");
  assert.deepEqual(await api.reconcileUploadSessions({ tenant_id: TENANT }), []);
  assert.equal(storage.statObject(target).sha256, digest(BYTES));
});

test("corporate pending sessions cannot be reassigned or automatically reconciled", async (t) => {
  const fixture = await createMigratedPostgresFixture(t); if (!fixture) return;
  await insertWorkspace(fixture);
  const storage = createLocalStorageAdapter({ adapter_id: "corporate-pending" });
  const api = runtime(fixture, storage);
  await createSession(api);
  await assert.rejects(tx(fixture, (client) => client.query(
    "UPDATE lawos_dms.upload_sessions SET workspace_authority_sha256=$3 WHERE tenant_id=$1 AND session_id=$2",
    [TENANT, target.session_id, "f".repeat(64)],
  )), (error) => error.postgres_code === "55000");
  assert.deepEqual(await api.reconcileUploadSessions({ tenant_id: TENANT }), []);
  const later = runtime(fixture, storage, { clock: () => new Date("2026-09-05T09:00:00.000Z") });
  const reconciled = await later.reconcileUploadSessions({ tenant_id: TENANT });
  assert.equal(reconciled[0].action, "corporate_manual_recovery");
  assert.deepEqual(await api.reconcileUploadSessions({ tenant_id: TENANT }), []);
  assert.equal((await api.getUploadSession(target)).dead_letter_receipt.recovery_state, "manual_recovery_required");
});
