import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import {
  bootstrapJsonPostgresRehearsalDatabase,
  bootstrapJsonPostgresProductionDatabase,
  ensureJsonPostgresRehearsalDatabase,
  executeJsonPostgresRelationalProjection,
  executeJsonPostgresProgram,
  executeJsonPostgresRetirementSmoke,
  handler,
  loadApprovedDmsSourceObject,
  safeJsonPostgresProgramErrorCode,
  writeJsonPostgresProgramEvidence,
} from "../src/json-postgres-program-admin-lambda.js";
import {
  JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
  JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
  JSON_POSTGRES_JSON_RETIREMENT_ACTION,
  JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
  JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
} from "../src/json-postgres-program-inputs.js";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);
const ARTIFACT_SHA = "d".repeat(64);
const KMS = "arn:aws:kms:ap-northeast-2:770880870480:key/00000000-0000-0000-0000-000000000000";

function packet() {
  return {
    phase: "w13-production-cutover",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    bindings: {
      artifact_sha256: ARTIFACT_SHA,
      dms_object_manifest_sha256: "e".repeat(64),
    },
    target: {
      approved_tenant_ids: ["tenant_amic"],
      program_input_bucket_name: "lawos-prod-program-input-770880870480",
      program_input_expected_bucket_owner: "770880870480",
      aws_account: "770880870480",
      aws_region: "ap-northeast-2",
      dms_bucket_name: "lawos-prod-dms-770880870480",
      dms_expected_bucket_owner: "770880870480",
      dms_prefix: "approved-real-migration",
      dms_kms_key_ref: "alias/lawos-prod-dms",
      dms_default_retention_days: 365,
    },
  };
}

function authorization() {
  return {
    exact: { sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE, artifactSha256: ARTIFACT_SHA },
    packet: packet(),
    approval: {
      valid: true,
      decision: "approved",
      approval_id: "approval-001",
      key_id: "owner-key-1",
      receipt_sha256: "f".repeat(64),
      registry_sha256: "1".repeat(64),
      expires_at: "2026-07-30T00:00:00.000Z",
      phase: "w13-production-cutover",
      packet_sha256: PACKET_SHA,
    },
    trustRegistry: { schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1", keys: [] },
    authorization_input_sha256: "2".repeat(64),
  };
}

function env() {
  return {
    AWS_REGION: "ap-northeast-2",
    LAWOS_DATABASE_HOST: "lawos-private.example.rds.amazonaws.com",
    LAWOS_DATABASE_PORT: "5432",
    LAWOS_DATABASE_NAME: "lawos",
    LAWOS_MASTER_DATABASE_SECRET_ID: "lawos/master",
    LAWOS_APPLICATION_DATABASE_SECRET_ID: "lawos/application",
    LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "lawos/tenant-context",
    LAWOS_PROJECTION_DATABASE_SECRET_ID: "lawos/hrx-projection",
    LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID: "lawos/hrx-projection-auditor",
    LAWOS_APPROVAL_AUDIT_BUCKET: "lawos-prod-program-input-770880870480",
    LAWOS_PROGRAM_INPUT_KMS_KEY_ARN: KMS,
  };
}

test("production bootstrap configures only approved tenants and returns no secret material", async () => {
  const queries = [];
  const pool = {
    async connect() {
      return {
        async query(statement) { queries.push(statement); return { rows: [], rowCount: 0 }; },
        release() {},
      };
    },
    async end() {},
  };
  let writtenSecret;
  const result = await bootstrapJsonPostgresProductionDatabase({
    event: {
      action: JSON_POSTGRES_PRODUCTION_BOOTSTRAP_ACTION,
      mode: "preflight",
    },
    env: env(),
    authorize: async () => authorization(),
    claim: async () => ({ approval_receipt_sha256: "f".repeat(64), claim_sha256: "3".repeat(64) }),
    resolveSecret: async ({ secretId }) => {
      if (secretId === "lawos/master") return { username: "master", password: "master-value" };
      if (secretId === "lawos/application") return { username: "lawos_app", password: "application-value" };
      return { tenant_context_secret: "tenant-context-value-at-least-32-bytes" };
    },
    putSecret: async (value) => { writtenSecret = JSON.parse(value.secretString); },
    createPool: () => pool,
    runMigrations: async () => [{ id: "001", applied: true }],
    verifyMigrations: async () => [],
    configureRole: async (_client, input) => {
      assert.deepEqual(input.approvedTenantIds, ["tenant_amic"]);
      return {
        grant_statement_count: 41,
        tenant_authority_count: 1,
        synthetic_wildcard_count: 0,
      };
    },
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.approved_tenant_count, 1);
  assert.equal(result.production_data_write_count, 0);
  assert.equal(result.secret_material_returned, false);
  assert.equal(JSON.stringify(result).includes("application-value"), false);
  assert.equal(writtenSecret.configuration_state, "ready");
});

test("private rehearsal bootstrap creates only the isolated database and distinct app role", async () => {
  const pools = [];
  let writtenSecret;
  const result = await bootstrapJsonPostgresRehearsalDatabase({
    event: {
      action: JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
      mode: "preflight",
    },
    env: {
      ...env(),
      LAWOS_ADMIN_DATABASE_NAME: "lawos",
      LAWOS_DATABASE_NAME: "lawos_rehearsal",
    },
    authorize: async () => ({
      ...authorization(),
      packet: {
        ...packet(),
        phase: "w12-real-data-rehearsal",
      },
    }),
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    resolveSecret: async ({ secretId }) => {
      if (secretId === "lawos/master") {
        return { username: "master", password: "master-value" };
      }
      if (secretId === "lawos/application") {
        return {
          username: "lawos_rehearsal_app",
          password: "rehearsal-application-value",
        };
      }
      return { tenant_context_secret: "tenant-context-value-at-least-32-bytes" };
    },
    putSecret: async (value) => {
      writtenSecret = JSON.parse(value.secretString);
    },
    createPool: (options) => {
      const pool = {
        options,
        async connect() {
          return { async query() { return { rows: [], rowCount: 0 }; }, release() {} };
        },
        async end() {},
      };
      pools.push(pool);
      return pool;
    },
    ensureDatabase: async (_client, input) => {
      assert.equal(input.databaseName, "lawos_rehearsal");
      return { database_name: "lawos_rehearsal", database_created: true };
    },
    runMigrations: async () => [{ id: "001", applied: true }],
    verifyMigrations: async () => [],
    configureRole: async (_client, input) => {
      assert.deepEqual(input.approvedTenantIds, ["tenant_amic"]);
      return {
        role_name: "lawos_rehearsal_app",
        grant_statement_count: 41,
        tenant_authority_count: 1,
        synthetic_wildcard_count: 0,
      };
    },
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.phase, "w12-real-data-rehearsal");
  assert.equal(result.rehearsal_database_created_count, 1);
  assert.equal(result.production_data_write_count, 0);
  assert.equal(result.external_email_send_count, 0);
  for (const key of [
    "json_fallback_count",
    "json_writer_count",
    "dual_write_count",
    "file_current_authority_count",
    "offline_mutation_count",
    "memory_fallback_count",
  ]) {
    assert.equal(result[key], 0);
  }
  assert.equal(pools.length, 2);
  assert.match(pools[0].options.connectionString, /\/lawos$/u);
  assert.match(pools[1].options.connectionString, /\/lawos_rehearsal$/u);
  assert.equal(writtenSecret.dbname, "lawos_rehearsal");
  assert.equal(writtenSecret.username, "lawos_rehearsal_app");
  assert.equal(JSON.stringify(result).includes("rehearsal-application-value"), false);
});

test("private rehearsal bootstrap identifies AWS access denial at each early protected boundary", async () => {
  const rehearsalAuthorization = {
    ...authorization(),
    packet: {
      ...packet(),
      phase: "w12-real-data-rehearsal",
    },
  };
  const rehearsalEvent = {
    action: JSON_POSTGRES_REHEARSAL_BOOTSTRAP_ACTION,
    mode: "preflight",
  };
  const rehearsalEnv = {
    ...env(),
    LAWOS_ADMIN_DATABASE_NAME: "lawos",
    LAWOS_DATABASE_NAME: "lawos_rehearsal",
  };
  const denied = () => Object.assign(
    new Error("must-not-return"),
    { name: "AccessDeniedException" },
  );
  const assertStage = async (options, code) => assert.rejects(
    bootstrapJsonPostgresRehearsalDatabase({
      event: rehearsalEvent,
      env: rehearsalEnv,
      authorize: async () => rehearsalAuthorization,
      claim: async () => ({
        approval_receipt_sha256: "f".repeat(64),
        claim_sha256: "3".repeat(64),
      }),
      ...options,
    }),
    (error) => error?.code === code
      && error.message.includes("must-not-return") === false,
  );

  await assertStage({
    authorize: async () => { throw denied(); },
  }, "LAWOS_PROGRAM_AUTHORIZATION_READ_ACCESS_DENIED");
  await assertStage({
    claim: async () => { throw denied(); },
  }, "LAWOS_PROGRAM_AUTHORIZATION_CLAIM_ACCESS_DENIED");

  const secretValues = new Map([
    ["lawos/master", { username: "master", password: "master-value" }],
    ["lawos/application", {
      username: "lawos_rehearsal_app",
      password: "rehearsal-application-value",
    }],
    ["lawos/tenant-context", {
      tenant_context_secret: "tenant-context-value-at-least-32-bytes",
    }],
  ]);
  for (const [secretId, code] of [
    ["lawos/master", "LAWOS_PROGRAM_MASTER_SECRET_READ_ACCESS_DENIED"],
    ["lawos/application", "LAWOS_PROGRAM_APPLICATION_SECRET_READ_ACCESS_DENIED"],
    ["lawos/tenant-context", "LAWOS_PROGRAM_TENANT_CONTEXT_SECRET_READ_ACCESS_DENIED"],
  ]) {
    await assertStage({
      resolveSecret: async ({ secretId: requested }) => {
        if (requested === secretId) throw denied();
        return secretValues.get(requested);
      },
    }, code);
  }
});

test("private rehearsal database creation is exact-name and idempotent", async () => {
  const queries = [];
  const client = {
    async query(statement, parameters = []) {
      queries.push({ statement, parameters });
      if (/FROM pg_database/u.test(statement)) return { rowCount: 0, rows: [] };
      return { rowCount: 0, rows: [] };
    },
  };
  const result = await ensureJsonPostgresRehearsalDatabase(client);
  assert.equal(result.database_created, true);
  assert.deepEqual(queries[0].parameters, ["lawos_rehearsal"]);
  assert.equal(queries[1].statement, "CREATE DATABASE lawos_rehearsal");
  await assert.rejects(
    ensureJsonPostgresRehearsalDatabase(client, { databaseName: "lawos" }),
    (error) => error?.code === "LAWOS_PROGRAM_DATABASE",
  );
});

test("program executor preserves the approval boundary in preflight and writes only safe evidence", async () => {
  const execution = {
    outcome: "PASS",
    phase: "w13-production-cutover",
    mode: "preflight",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    result_sha256: "4".repeat(64),
    first_write_state: "FIRST_PRODUCTION_WRITE_NOT_STARTED",
    safe_counts: { reviewed_item_count: 1 },
    claims: {
      real_data_read: false,
      real_data_mutated: false,
      database_write: false,
      production_contacted: false,
      production_write: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const result = await executeJsonPostgresProgram({
    event: {
      action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
      mode: "preflight",
      inputs: {},
    },
    env: env(),
    authorize: async () => authorization(),
    claim: async () => ({ approval_receipt_sha256: "f".repeat(64), claim_sha256: "3".repeat(64) }),
    loadInputs: async () => ({
      authorityBundle: { summary: { ready_for_owner_signature: true }, record_type_catalog: {} },
      corpus: null,
      predecessors: [],
    }),
    runExecution: async (input) => {
      assert.equal(input.mode, "preflight");
      assert.equal(input.dmsRunner, null);
      return execution;
    },
    writeEvidence: async ({ value }) => {
      assert.equal(value, execution);
      return { sha256: "5".repeat(64), byte_size: 100 };
    },
    s3Client: {},
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.execution_evidence_sha256, "5".repeat(64));
  assert.equal(result.secret_material_returned, false);
});

test("W12 readback runs only the requested bounded rehearsal validation", async () => {
  const approved = authorization();
  approved.packet = {
    ...approved.packet,
    phase: "w12-real-data-rehearsal",
  };
  approved.approval.phase = "w12-real-data-rehearsal";
  const writes = [];
  let failureInput;
  let authorityBundleInput;
  const baseManifest = { manifest_sha256: "6".repeat(64) };
  const result = await executeJsonPostgresProgram({
    event: {
      action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
      attempt_ref: "w12-failure-001",
      stage: "w12-failure-injection",
      rehearsal_validation_kind: "failure-injection",
      mode: "readback",
      negative_tenant_id: "tenant_negative",
      inputs: {},
    },
    env: env(),
    authorize: async () => approved,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      authorityBundle: { summary: {}, record_type_catalog: {} },
      baseManifest,
      inventory: {},
      decisions: {},
      recordTypeCatalog: {},
      recordAuthority: {},
      corpus: {
        tenant_id: "tenant_amic",
      },
      sourceTransformResult: {},
      dmsManifest: {},
      predecessors: [],
      checkpoint: null,
      dmsCheckpoint: null,
    }),
    resolveSecret: async ({ secretId }) => secretId === "lawos/application"
      ? {
          configuration_state: "ready",
          username: "lawos_rehearsal_app",
          password: "application-value",
          host: "rehearsal.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos_rehearsal",
        }
      : { tenant_context_secret: "tenant-context-value-at-least-32-bytes" },
    createPool: () => ({ async end() {} }),
    verifyMigrations: async () => [],
    createAuthorityBundle: async (input) => {
      authorityBundleInput = input;
      return {
        summary: { authority_manifest_sha256: "7".repeat(64) },
      };
    },
    prepareDmsManifest: () => ({
      manifest_sha256: approved.packet.bindings.dms_object_manifest_sha256,
      authority_manifest_sha256: "7".repeat(64),
    }),
    createDmsStorage: () => ({}),
    createDmsRuntime: () => ({}),
    runExecution: async () => ({
      outcome: "PASS",
      phase: "w12-real-data-rehearsal",
      mode: "readback",
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      packet_sha256: PACKET_SHA,
      result_sha256: "8".repeat(64),
      first_write_state: "NOT_PRODUCTION",
      safe_counts: {
        json_fallback_count: 0,
        json_writer_count: 0,
        dual_write_count: 0,
        file_current_authority_count: 0,
        offline_mutation_count: 0,
        memory_fallback_count: 0,
      },
      claims: {
        real_data_read: true,
        real_data_mutated: false,
        database_write: false,
        production_contacted: false,
        production_write: false,
        authority_activated: false,
        json_authority_disabled: false,
        dms_bytes_in_evidence: false,
        release: false,
        go_live: false,
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      },
    }),
    runFailureInjection: async (input) => {
      failureInput = input;
      return {
        outcome: "PASS",
        result_sha256: "a".repeat(64),
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      };
    },
    writeEvidence: async ({ kind }) => {
      writes.push(kind);
      return {
        sha256: kind === "execution-result"
          ? "9".repeat(64)
          : "b".repeat(64),
        byte_size: 100,
      };
    },
    s3Client: {},
  });
  assert.equal(failureInput.tenantId, "tenant_amic");
  assert.equal(failureInput.negativeTenantId, "tenant_negative");
  assert.deepEqual(writes, ["execution-result", "w12-failure-injection"]);
  assert.equal(authorityBundleInput.baseManifest, baseManifest);
  assert.equal(result.rehearsal_validation_kind, "failure-injection");
  assert.equal(
    result.rehearsal_validation_evidence_sha256,
    "b".repeat(64),
  );
});

test("deployed DMS source loader accepts only exact immutable KMS and Object Lock versions", async () => {
  const bytes = Buffer.from("approved object bytes");
  const object = {
    source_path: null,
    source_object: {
      bucket: "lawos-prod-program-input-770880870480",
      key: "dms/document-001",
      version_id: "version-001",
      expected_bucket_owner: "770880870480",
    },
    byte_size: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  const client = {
    async send() {
      return {
        VersionId: "version-001",
        ContentLength: bytes.byteLength,
        ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: KMS,
        ObjectLockMode: "COMPLIANCE",
        ObjectLockRetainUntilDate: new Date("2027-07-23T00:00:00.000Z"),
        Body: { async transformToByteArray() { return bytes; } },
      };
    },
  };
  assert.deepEqual(await loadApprovedDmsSourceObject({
    object,
    packet: packet(),
    env: env(),
    client,
    now: Date.parse("2026-07-23T00:00:00.000Z"),
  }), bytes);
  await assert.rejects(
    loadApprovedDmsSourceObject({
      object: { ...object, source_path: "/private/source" },
      packet: packet(),
      env: env(),
      client,
    }),
    (error) => error?.code === "LAWOS_PROGRAM_DMS_SOURCE",
  );
});

test("program evidence writer rejects sensitive keys and handler returns a non-oracular safe block", async () => {
  const safeWrites = [];
  await writeJsonPostgresProgramEvidence({
    kind: "safe-negative-claims",
    value: {
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      dms_bytes_in_evidence: false,
    },
    event: { attempt_ref: "attempt-safe-negative" },
    authorization: authorization(),
    env: env(),
    client: { async send(command) { safeWrites.push(command); } },
  });
  assert.equal(safeWrites.length, 1);
  await assert.rejects(
    writeJsonPostgresProgramEvidence({
      kind: "unsafe",
      value: { api_key: "must-not-persist" },
      event: { attempt_ref: "attempt-001" },
      authorization: authorization(),
      env: env(),
      client: { async send() {} },
    }),
    (error) => error?.code === "LAWOS_PROGRAM_EVIDENCE",
  );
  const blocked = await handler({ action: "unknown" });
  assert.equal(blocked.outcome, "BLOCKED");
  assert.equal(blocked.secret_material_returned, false);
  assert.equal(Object.hasOwn(blocked, "message"), false);
});

test("program error classification safely preserves AWS service error names without raw details", () => {
  assert.equal(
    safeJsonPostgresProgramErrorCode({
      name: "AccessDeniedException",
      message: "must-not-return",
      $metadata: { requestId: "must-not-return" },
    }),
    "ACCESSDENIEDEXCEPTION",
  );
  assert.equal(
    safeJsonPostgresProgramErrorCode({
      code: "LAWOS_PROGRAM_INPUT",
      name: "Error",
    }),
    "LAWOS_PROGRAM_INPUT",
  );
});

test("W15 projection uses a separate least-privilege writer and preserves the generic ledger authority", async () => {
  const w15Authorization = authorization();
  w15Authorization.packet = {
    ...w15Authorization.packet,
    phase: "w15-relational-projection",
    bindings: {
      ...w15Authorization.packet.bindings,
      w12_terminal_receipt_sha256: "6".repeat(64),
      cut012_terminal_receipt_sha256: "7".repeat(64),
      go_live_receipt_sha256: "8".repeat(64),
    },
  };
  w15Authorization.approval.phase = "w15-relational-projection";
  const pools = [];
  const masterPool = {
    async connect() {
      return { async query() { return { rowCount: 0, rows: [] }; }, release() {} };
    },
    async end() {},
  };
  const projectionPool = { async end() {} };
  const writtenSecrets = [];
  let projectedTenant;
  const mappingManifest = {
    manifest_sha256: "4".repeat(64),
  };
  const productionInventory = {
    inventory_sha256: "5".repeat(64),
  };
  const performanceAcceptance = {
    acceptance_sha256: "a".repeat(64),
    connection_timeout_ms: 10_000,
    statement_timeout_ms: 120_000,
    pool_max: 2,
  };
  const result = await executeJsonPostgresRelationalProjection({
    event: {
      action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
      mode: "commit",
      backfill_wave: 1,
      attempt_ref: "w15-test-attempt",
      inputs: { predecessors: [] },
    },
    env: {
      ...env(),
      LAWOS_PROGRAM_EXECUTION_ROLE: "projection-admin",
    },
    authorize: async () => w15Authorization,
    claim: async () => ({ approval_receipt_sha256: "f".repeat(64), claim_sha256: "3".repeat(64) }),
    loadInputs: async () => ({
      predecessors: [{}, {}, {}],
      mappingManifest,
      productionInventory,
      performanceAcceptance,
    }),
    resolveSecret: async ({ secretId }) => {
      if (secretId === "lawos/master") return { username: "master", password: "master-value" };
      if (secretId === "lawos/hrx-projection") {
        return { username: "lawos_hrx_projection_writer", password: "projection-value" };
      }
      if (secretId === "lawos/hrx-projection-auditor") {
        return { username: "lawos_hrx_projection_auditor", password: "auditor-value" };
      }
      return { tenant_context_secret: "tenant-context-value-at-least-32-bytes" };
    },
    putSecret: async (value) => {
      writtenSecrets.push(JSON.parse(value.secretString));
    },
    createPool: (options) => {
      pools.push(options);
      return pools.length === 1 ? masterPool : projectionPool;
    },
    runMigrations: async () => [{ id: "202_hrx_projection_state", applied: true }],
    configureRole: async (_client, input) => {
      assert.deepEqual(input.approvedTenantIds, ["tenant_amic"]);
      assert.equal(input.auditorPassword, "auditor-value");
      return {
        grant_statement_count: 24,
        consumer_write_grant_count: 0,
        auditor_write_grant_count: 0,
      };
    },
    verifyMigrations: async () => [],
    collectInventory: async () => productionInventory,
    project: async (input) => {
      projectedTenant = input;
      return {
        outcome: "PASS",
        backfill_wave: input.backfillWave,
        safe_counts: {
          source_record_count: 4,
          projected_insert_count: 4,
          projected_update_count: 0,
          projected_noop_count: 0,
          committed_batch_count: 1,
          completed_backfill_wave_count: 1,
          consumed_outbox_event_count: 2,
          observed_event_wave_1_count: 2,
          observed_event_wave_2_count: 0,
          observed_event_wave_3_count: 0,
          observed_event_wave_4_count: 0,
          observed_event_wave_5_count: 0,
          remaining_outbox_event_count: 0,
          tenant_negative_visible_count: 0,
          negative_tenant_context_denied_count: 1,
          unmapped_nonnull_field_count: 0,
          physical_delete_count: 0,
          source_authority_write_count: 0,
          dual_write_count: 0,
          partial_commit_count: 0,
        },
        claims: {
          one_way_projection: true,
          bounded_checkpoint_resume: true,
          event_scoped_incremental_projection: true,
          physical_delete_prohibited: true,
          operational_request_dual_write: false,
          generic_ledger_authority_preserved: true,
          projection_write_authority: false,
        },
      };
    },
    writeEvidence: async ({ value }) => {
      assert.equal(value.claims.secret_material_returned, false);
      return { sha256: "9".repeat(64), byte_size: 200 };
    },
    s3Client: {},
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.mode, "backfill");
  assert.equal(result.safe_counts.projected_insert_count, 4);
  assert.equal(result.safe_counts.completed_backfill_wave_count, 1);
  assert.equal(result.safe_counts.observed_event_wave_1_count, 2);
  assert.equal(result.safe_counts.observed_event_wave_5_count, 0);
  assert.equal(result.safe_counts.source_authority_write_count, 0);
  assert.equal(result.safe_counts.consumer_write_grant_count, 0);
  assert.equal(result.safe_counts.authority_promotion_count, 0);
  assert.equal(result.execution_evidence_sha256, "9".repeat(64));
  assert.equal(writtenSecrets.length, 2);
  assert.deepEqual(
    writtenSecrets.map((secret) => secret.username).sort(),
    ["lawos_hrx_projection_auditor", "lawos_hrx_projection_writer"],
  );
  assert.equal(writtenSecrets.every((secret) => secret.configuration_state === "ready"), true);
  assert.equal(projectedTenant.tenant_id, "tenant_amic");
  assert.equal(projectedTenant.mode, "backfill");
  assert.equal(projectedTenant.backfillWave, 1);
  assert.equal(projectedTenant.workerRef, "w15-test-attempt");
  assert.equal(projectedTenant.mappingManifest, mappingManifest);
  assert.notEqual(projectedTenant.negativeTenantId, "tenant_amic");
  assert.equal(pools[0].applicationName, "lawos-hrx-projection-admin");
  assert.equal(pools[1].applicationName, "lawos-hrx-relational-projection");
  assert.equal(JSON.stringify(result).includes("projection-value"), false);
});

test("W15 readback uses only the projection auditor credential and independently observed evidence", async () => {
  const w15Authorization = authorization();
  w15Authorization.packet = {
    ...w15Authorization.packet,
    phase: "w15-relational-projection",
  };
  w15Authorization.approval.phase = "w15-relational-projection";
  const resolved = [];
  let poolOptions;
  const validation = {
    schema_version: "law-firm-os.hrx-relational-projection-validation.v2",
    outcome: "PASS",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    result_sha256: "d".repeat(64),
    safe_counts: { shadow_difference_count: 0 },
    claims: {
      observations_collected_by_read_only_auditor: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const result = await executeJsonPostgresRelationalProjection({
    event: {
      action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
      mode: "readback",
      attempt_ref: "w15-auditor-readback",
      inputs: {},
    },
    env: {
      ...env(),
      LAWOS_PROGRAM_EXECUTION_ROLE: "projection-auditor",
    },
    authorize: async () => w15Authorization,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      predecessors: [{}, {}, {}],
      mappingManifest: { manifest_sha256: "4".repeat(64) },
      productionInventory: { inventory_sha256: "5".repeat(64) },
      performanceAcceptance: {
        acceptance_sha256: "a".repeat(64),
        connection_timeout_ms: 10_000,
        statement_timeout_ms: 120_000,
        pool_max: 2,
      },
    }),
    resolveSecret: async ({ secretId }) => {
      resolved.push(secretId);
      if (secretId === "lawos/hrx-projection-auditor") {
        return {
          username: "lawos_hrx_projection_auditor",
          password: "auditor-value",
        };
      }
      if (secretId === "lawos/tenant-context") {
        return {
          tenant_context_secret:
            "tenant-context-value-at-least-32-bytes",
        };
      }
      throw new Error(`unexpected secret: ${secretId}`);
    },
    createPool: (options) => {
      poolOptions = options;
      return { async end() {} };
    },
    verifyMigrations: async () => [],
    validateProjection: async (input) => {
      assert.equal(input.mappingManifest.manifest_sha256, "4".repeat(64));
      assert.equal(input.sourceSha, SOURCE_SHA);
      return validation;
    },
    writeEvidence: async ({ kind, value }) => {
      assert.equal(kind, "w15-relational-projection-validation");
      assert.equal(value, validation);
      return { sha256: "9".repeat(64) };
    },
    s3Client: {},
  });
  assert.deepEqual(resolved.sort(), [
    "lawos/hrx-projection-auditor",
    "lawos/tenant-context",
  ]);
  assert.equal(poolOptions.applicationName, "lawos-hrx-relational-auditor");
  assert.equal(result.outcome, "PASS");
  assert.equal(result.validation_evidence_sha256, "9".repeat(64));
});

test("W15 projection auditor Lambda refuses bootstrap and projection writes", async () => {
  let authorizeCount = 0;
  await assert.rejects(
    executeJsonPostgresRelationalProjection({
      event: {
        action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
        mode: "commit",
        attempt_ref: "w15-auditor-write-denial",
        inputs: {},
      },
      env: {
        ...env(),
        LAWOS_PROGRAM_EXECUTION_ROLE: "projection-auditor",
      },
      authorize: async () => {
        authorizeCount += 1;
        return authorization();
      },
      s3Client: {},
    }),
    (error) => error?.code === "LAWOS_HRX_PROJECTION_EXECUTION_ROLE",
  );
  assert.equal(authorizeCount, 0);
});

test("W15 recurring projection writer accepts only bounded resume mode", async () => {
  let authorizeCount = 0;
  for (const mode of ["commit", "readback", "reconcile", "rollout"]) {
    await assert.rejects(
      executeJsonPostgresRelationalProjection({
        event: {
          action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
          mode,
          attempt_ref: `w15-writer-${mode}-denial`,
          inputs: {},
        },
        env: {
          ...env(),
          LAWOS_PROGRAM_EXECUTION_ROLE: "projection-writer",
        },
        authorize: async () => {
          authorizeCount += 1;
          return authorization();
        },
        s3Client: {},
      }),
      (error) => error?.code === "LAWOS_HRX_PROJECTION_EXECUTION_ROLE",
    );
  }
  assert.equal(authorizeCount, 0);
  const boundary = new Error("authorized resume boundary reached");
  await assert.rejects(
    executeJsonPostgresRelationalProjection({
      event: {
        action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
        mode: "resume",
        attempt_ref: "w15-writer-resume",
        inputs: {},
      },
      env: {
        ...env(),
        LAWOS_PROGRAM_EXECUTION_ROLE: "projection-writer",
      },
      authorize: async () => {
        authorizeCount += 1;
        throw boundary;
      },
      s3Client: {},
    }),
    (error) => error === boundary,
  );
  assert.equal(authorizeCount, 1);
});

test("W15 consumer rollout is sequential, read-only, and rolls back to the generic PostgreSQL ledger", async () => {
  const w15Authorization = authorization();
  w15Authorization.packet = {
    ...w15Authorization.packet,
    phase: "w15-relational-projection",
  };
  w15Authorization.approval.phase = "w15-relational-projection";
  const mappingManifest = { manifest_sha256: "4".repeat(64) };
  const performanceAcceptance = {
    acceptance_sha256: "a".repeat(64),
    connection_timeout_ms: 10_000,
    statement_timeout_ms: 120_000,
    pool_max: 2,
  };
  const validationEvidence = {
    result_sha256: "d".repeat(64),
  };
  const execute = async (rolloutAction) => {
    const resolved = [];
    let ended = false;
    let transactionTenant;
    let activation;
    let disabled;
    const result = await executeJsonPostgresRelationalProjection({
      event: {
        action: JSON_POSTGRES_RELATIONAL_PROJECTION_ACTION,
        mode: "rollout",
        rollout_action: rolloutAction,
        ...(rolloutAction === "enable" ? {
          query_family: "core-employee-roster",
          rollout_wave: 1,
          max_staleness_ms: 60_000,
        } : {}),
        attempt_ref: `w15-consumer-${rolloutAction}`,
        inputs: {},
      },
      env: {
        ...env(),
        LAWOS_PROGRAM_EXECUTION_ROLE: "projection-admin",
      },
      authorize: async () => w15Authorization,
      claim: async () => ({
        approval_receipt_sha256: "f".repeat(64),
        claim_sha256: "3".repeat(64),
      }),
      loadInputs: async () => ({
        predecessors: [{}, {}, {}],
        mappingManifest,
        productionInventory: { inventory_sha256: "5".repeat(64) },
        performanceAcceptance,
        validationEvidence: rolloutAction === "enable"
          ? validationEvidence
          : null,
      }),
      resolveSecret: async ({ secretId }) => {
        resolved.push(secretId);
        if (secretId === "lawos/hrx-projection") {
          return {
            username: "lawos_hrx_projection_writer",
            password: "projection-value",
          };
        }
        if (secretId === "lawos/tenant-context") {
          return {
            tenant_context_secret:
              "tenant-context-value-at-least-32-bytes",
          };
        }
        throw new Error(`unexpected secret: ${secretId}`);
      },
      createPool: () => ({
        async end() {
          ended = true;
        },
      }),
      verifyMigrations: async () => [],
      transaction: async (_pool, options, callback) => {
        transactionTenant = options.tenant_id;
        assert.equal(options.maxAttempts, 1);
        return callback({ query() {} });
      },
      activateConsumerRoute: async (_client, input) => {
        activation = input;
        return {
          enabled: true,
          authority_promoted: false,
          mapping_sha256: mappingManifest.manifest_sha256,
          validation_result_sha256: validationEvidence.result_sha256,
        };
      },
      disableConsumerRoutes: async (_client, input) => {
        disabled = input;
        return {
          disabled_route_count: 1,
          generic_ledger_fallback: true,
          projection_rows_deleted: false,
        };
      },
      writeEvidence: async ({ kind, value }) => {
        assert.equal(kind, "w15-consumer-rollout-result");
        assert.equal(value.claims.generic_ledger_authority_preserved, true);
        assert.equal(value.claims.projection_consumers_read_only, true);
        return { sha256: "9".repeat(64) };
      },
      s3Client: {},
    });
    assert.deepEqual(resolved.sort(), [
      "lawos/hrx-projection",
      "lawos/tenant-context",
    ]);
    assert.equal(transactionTenant, "tenant_amic");
    assert.equal(ended, true);
    assert.equal(result.outcome, "PASS");
    assert.equal(result.rollout_action, rolloutAction);
    assert.equal(result.safe_counts.source_authority_write_count, 0);
    assert.equal(result.safe_counts.projection_authority_promotion_count, 0);
    assert.equal(result.safe_counts.json_fallback_count, 0);
    assert.equal(result.execution_evidence_sha256, "9".repeat(64));
    return { result, activation, disabled };
  };

  const enabled = await execute("enable");
  assert.equal(enabled.activation.queryFamily, "core-employee-roster");
  assert.equal(enabled.activation.rolloutWave, 1);
  assert.equal(enabled.activation.validationEvidence, validationEvidence);
  assert.equal(enabled.result.safe_counts.consumer_route_enabled_count, 1);

  const rolledBack = await execute("disable");
  assert.deepEqual(rolledBack.disabled, { tenantId: "tenant_amic" });
  assert.equal(rolledBack.result.safe_counts.consumer_route_disabled_count, 1);
  assert.equal(rolledBack.result.claims.fallback_authority, "postgres-v2-generic-ledger");
  assert.equal(rolledBack.result.claims.rollback_deletes_projection_rows, false);
});

test("CUT-010 readback binds the database pool to the approved isolated DR endpoint", async () => {
  const approved = authorization();
  const cut009 = {
    receipt_kind: "cut-009",
    execution_state: "PASS",
    canonical_sha256: "6".repeat(64),
  };
  let poolOptions;
  let executionInput;
  const result = await executeJsonPostgresProgram({
    event: {
      action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
      stage: "cut-010",
      phase: "w13-production-cutover",
      mode: "readback",
      inputs: {},
      dr_recovery: {},
    },
    env: env(),
    authorize: async () => approved,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      authorityBundle: { summary: {}, record_type_catalog: {} },
      inventory: {},
      decisions: {},
      recordTypeCatalog: {},
      corpus: {},
      sourceTransformResult: {},
      dmsManifest: {},
      predecessors: [cut009],
      checkpoint: null,
      dmsCheckpoint: null,
    }),
    loadDrInputs: async () => ({
      drTarget: {
        endpoint_address: "lawos-production-dr-a123456789-1.example.ap-northeast-2.rds.amazonaws.com",
        endpoint_port: 5432,
        database_name: "lawos",
        cut009_receipt_sha256: cut009.canonical_sha256,
        migration_result_sha256: "5".repeat(64),
      },
      target: {
        dr_target_sha256: "a".repeat(64),
        rpo_ms: 1_000,
        rto_ms: 2_000,
      },
      acceptance: { acceptance_sha256: "b".repeat(64) },
    }),
    resolveSecret: async ({ secretId }) => secretId === "lawos/application"
      ? {
          configuration_state: "ready",
          username: "lawos_app",
          password: "application-value",
          host: "production.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos",
        }
      : { tenant_context_secret: "tenant-context-value-at-least-32-bytes" },
    createPool: (options) => {
      poolOptions = options;
      return { async end() {} };
    },
    verifyMigrations: async () => [],
    createAuthorityBundle: async () => ({ summary: {
      authority_manifest_sha256: "7".repeat(64),
    } }),
    prepareDmsManifest: () => ({
      manifest_sha256: approved.packet.bindings.dms_object_manifest_sha256,
      authority_manifest_sha256: "7".repeat(64),
    }),
    createDmsStorage: () => ({}),
    createDmsRuntime: () => ({}),
    runExecution: async (input) => {
      executionInput = input;
      return {
        outcome: "PASS",
        phase: "w13-production-cutover",
        mode: "readback",
        source_sha: SOURCE_SHA,
        source_tree: SOURCE_TREE,
        packet_sha256: PACKET_SHA,
        result_sha256: "8".repeat(64),
        first_write_state: "FIRST_PRODUCTION_WRITE_COMMITTED",
        safe_counts: { reviewed_item_count: 1 },
        claims: {
          real_data_read: true,
          real_data_mutated: false,
          database_write: false,
          production_contacted: true,
          production_write: false,
          raw_value_returned: false,
          pii_returned: false,
          secret_material_returned: false,
        },
      };
    },
    writeEvidence: async () => ({ sha256: "9".repeat(64), byte_size: 100 }),
    s3Client: {},
  });
  assert.match(poolOptions.connectionString, /lawos-production-dr-a123456789-1/u);
  assert.equal(executionInput.mode, "readback");
  assert.equal(result.execution_evidence_sha256, "9".repeat(64));
});

test("W12 restore readback binds the database pool to the approved isolated rehearsal endpoint", async () => {
  const approved = authorization();
  approved.packet = {
    ...approved.packet,
    phase: "w12-real-data-rehearsal",
  };
  approved.approval.phase = "w12-real-data-rehearsal";
  let poolOptions;
  const result = await executeJsonPostgresProgram({
    event: {
      action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
      stage: "w12-restore",
      phase: "w12-real-data-rehearsal",
      mode: "readback",
      inputs: {},
      rehearsal_restore: {},
    },
    env: env(),
    authorize: async () => approved,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      authorityBundle: { summary: {}, record_type_catalog: {} },
      inventory: {},
      decisions: {},
      recordTypeCatalog: {},
      corpus: {},
      sourceTransformResult: {},
      dmsManifest: {},
      predecessors: [],
      checkpoint: null,
      dmsCheckpoint: null,
    }),
    loadRehearsalRestoreInputs: async () => ({
      restoreTarget: {
        endpoint_address:
          "lawos-private-rehearsal-restore-a123456789-1.example.ap-northeast-2.rds.amazonaws.com",
        endpoint_port: 5432,
        database_name: "lawos_rehearsal",
        migration_result_sha256: "5".repeat(64),
      },
      target: {
        restore_target_sha256: "a".repeat(64),
        rpo_ms: 1_000,
        rto_ms: 2_000,
      },
      acceptance: { acceptance_sha256: "b".repeat(64) },
    }),
    resolveSecret: async ({ secretId }) => secretId === "lawos/application"
      ? {
          configuration_state: "ready",
          username: "lawos_rehearsal_app",
          password: "application-value",
          host: "rehearsal.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos_rehearsal",
        }
      : { tenant_context_secret: "tenant-context-value-at-least-32-bytes" },
    createPool: (options) => {
      poolOptions = options;
      return { async end() {} };
    },
    verifyMigrations: async () => [],
    createAuthorityBundle: async () => ({
      summary: { authority_manifest_sha256: "7".repeat(64) },
    }),
    prepareDmsManifest: () => ({
      manifest_sha256: approved.packet.bindings.dms_object_manifest_sha256,
      authority_manifest_sha256: "7".repeat(64),
    }),
    createDmsStorage: () => ({}),
    createDmsRuntime: () => ({}),
    runExecution: async () => ({
      outcome: "PASS",
      phase: "w12-real-data-rehearsal",
      mode: "readback",
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      packet_sha256: PACKET_SHA,
      result_sha256: "8".repeat(64),
      first_write_state: "NOT_PRODUCTION",
      safe_counts: {
        json_fallback_count: 0,
        json_writer_count: 0,
        dual_write_count: 0,
        file_current_authority_count: 0,
        offline_mutation_count: 0,
        memory_fallback_count: 0,
      },
      claims: {
        real_data_read: true,
        real_data_mutated: false,
        database_write: false,
        production_contacted: false,
        production_write: false,
        authority_activated: false,
        json_authority_disabled: false,
        dms_bytes_in_evidence: false,
        release: false,
        go_live: false,
        raw_value_returned: false,
        pii_returned: false,
        secret_material_returned: false,
      },
    }),
    writeEvidence: async ({ kind }) => ({
      sha256: kind === "execution-result"
        ? "9".repeat(64)
        : "b".repeat(64),
      byte_size: 100,
    }),
    s3Client: {},
  });
  assert.match(
    poolOptions.connectionString,
    /lawos-private-rehearsal-restore-a123456789-1/u,
  );
  assert.equal(
    poolOptions.applicationName,
    "lawos-json-postgres-w12-restore-readback",
  );
  assert.equal(
    result.rehearsal_restore_target_sha256,
    "a".repeat(64),
  );
  assert.equal(
    result.rehearsal_restore_evidence_sha256,
    "b".repeat(64),
  );
});

test("CUT-011 warm and cold smoke proves PostgreSQL write/read/audit/outbox without JSON paths", async () => {
  const approved = authorization();
  const ledger = {
    async transaction(context, callback) {
      if (context.tenant_id !== "tenant_amic") {
        throw Object.assign(new Error("PostgreSQL operation failed"), {
          code: "LAWOS_POSTGRES_ACCESS_DENIED",
          status: 403,
        });
      }
      return callback({
        async claimIdempotency() { return { replayed: false }; },
        async write() { return { state_version: 1 }; },
        async appendAudit() { return { event_id: "audit-1" }; },
        async enqueueOutbox() { return { event: { event_id: "outbox-1" } }; },
      });
    },
  };
  const result = await executeJsonPostgresRetirementSmoke({
    event: {
      action: JSON_POSTGRES_JSON_RETIREMENT_ACTION,
      stage: "cut-011",
      mode: "commit",
      startup_kind: "cold",
      runtime_generation: 2,
      retirement: {},
    },
    env: {
      ...env(),
      LAWOS_RUNTIME_GENERATION: "2",
      AWS_LAMBDA_LOG_STREAM_NAME: "2026/07/23/[$LATEST]safe",
      LAWOS_RUNTIME_PROFILE: "operational",
      LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
      LAWOS_STAFF_AUTHORITY: "internal-password",
    },
    authorize: async () => approved,
    claim: async () => ({
      approval_receipt_sha256: "f".repeat(64),
      claim_sha256: "3".repeat(64),
    }),
    loadInputs: async () => ({
      deploymentManifest: {
        artifact_runtime_store_entry_count: 0,
        artifact_real_json_store_count: 0,
      },
      predecessors: [{}, {}],
    }),
    resolveSecret: async ({ secretId }) => secretId === "lawos/application"
      ? {
          configuration_state: "ready",
          username: "lawos_app",
          password: "application-value",
          host: "production.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos",
        }
      : { tenant_context_secret: "tenant-context-value-at-least-32-bytes" },
    createPool: () => ({ async end() {} }),
    createLedger: () => ledger,
    verifyMigrations: async () => [],
    writeEvidence: async () => ({ sha256: "4".repeat(64), byte_size: 100 }),
    s3Client: {},
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.safe_counts.operational_json_path_count, 0);
  assert.equal(result.safe_counts.json_fallback_count, 0);
  assert.equal(result.safe_counts.postgres_audit_event_count, 1);
  assert.equal(result.safe_counts.postgres_outbox_event_count, 1);
  assert.equal(JSON.stringify(result).includes("application-value"), false);
});
