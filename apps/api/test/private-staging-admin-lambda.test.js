import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  PRIVATE_STAGING_BOOTSTRAP_ACTION,
  PRIVATE_STAGING_CUT005_ACTION,
  PRIVATE_STAGING_CUT006_ACTION,
  PRIVATE_STAGING_CUT007_READBACK_ACTION,
  PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION,
  bootstrapPrivateStagingDatabase,
  executePrivateStagingCut005,
  executePrivateStagingCut006,
  executePrivateStagingCut007Readback,
  executePrivateStagingSyntheticBaseline,
  handler,
} from "../src/private-staging-admin-lambda.js";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const ARTIFACT_SHA = "c".repeat(64);
const INSTRUCTION_SHA = "d".repeat(64);
const MANIFEST = {
  schema_version: "law-firm-os.synthetic-staging-manifest.v2",
  data_scope: "synthetic-only",
  tenant_ids: [
    "tenant_lawos_staging_cut005_a",
    "tenant_lawos_staging_cut005_b",
    "tenant_lawos_staging_cut006_a",
    "tenant_lawos_staging_cut006_b",
    "tenant_lawos_staging_cut007_a",
    "tenant_lawos_staging_cut007_b",
  ],
  purpose_tenants: {
    cut005: ["tenant_lawos_staging_cut005_a", "tenant_lawos_staging_cut005_b"],
    cut006: ["tenant_lawos_staging_cut006_a", "tenant_lawos_staging_cut006_b"],
    cut007: ["tenant_lawos_staging_cut007_a", "tenant_lawos_staging_cut007_b"],
  },
  real_data_allowed: false,
};
const MANIFEST_SHA = createHash("sha256").update(JSON.stringify(MANIFEST)).digest("hex");
const BOOTSTRAP_APPROVAL_ID = "LAWOS-EXACT-HEAD-BOOTSTRAP-APPROVAL-TEST";
const CUT005_APPROVAL_ID = "LAWOS-EXACT-HEAD-CUT005-APPROVAL-TEST";
const CUT006_APPROVAL_ID = "LAWOS-EXACT-HEAD-CUT006-APPROVAL-TEST";
const CUT007_APPROVAL_ID = "LAWOS-EXACT-HEAD-CUT007-APPROVAL-TEST";

function env() {
  return {
    AWS_REGION: "ap-northeast-2",
    LAWOS_APPLICATION_DATABASE_SECRET_ID: "/lawos/private-staging/postgres/application",
    LAWOS_BOOTSTRAP_APPROVAL_ID: BOOTSTRAP_APPROVAL_ID,
    LAWOS_CUT005_APPROVAL_ID: CUT005_APPROVAL_ID,
    LAWOS_CUT006_APPROVAL_ID: CUT006_APPROVAL_ID,
    LAWOS_CUT007_APPROVAL_ID: CUT007_APPROVAL_ID,
    LAWOS_DATABASE_HOST: "lawos-private-staging.example.rds.amazonaws.com",
    LAWOS_DATABASE_NAME: "lawos",
    LAWOS_DATABASE_PORT: "5432",
    LAWOS_DEPLOYMENT_ARTIFACT_SHA256: ARTIFACT_SHA,
    LAWOS_DEPLOYMENT_COMMIT: SOURCE_SHA,
    LAWOS_DEPLOYMENT_TREE: SOURCE_TREE,
    LAWOS_MASTER_DATABASE_SECRET_ID: "/lawos/private-staging/postgres/master",
    LAWOS_OWNER_INSTRUCTION_SHA256: INSTRUCTION_SHA,
    LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
    LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "/lawos/private-staging/postgres/tenant-context",
    LAWOS_RUNTIME_PROFILE: "operational",
    LAWOS_STAFF_AUTHORITY: "internal-password",
    LAWOS_SYNTHETIC_MANIFEST_SECRET_ID: "/lawos/private-staging/synthetic/manifest",
  };
}

function event(overrides = {}) {
  return {
    action: PRIVATE_STAGING_BOOTSTRAP_ACTION,
    approval_id: BOOTSTRAP_APPROVAL_ID,
    data_scope: "synthetic-only",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    artifact_sha256: ARTIFACT_SHA,
    owner_instruction_sha256: INSTRUCTION_SHA,
    synthetic_manifest_sha256: MANIFEST_SHA,
    ...overrides,
  };
}

test("private staging bootstrap returns only safe exact-head counts", async () => {
  const secretWrites = [];
  let poolOptions;
  const pool = {
    query: async () => ({ rows: [] }),
    connect: async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release() {} }),
    end: async () => {},
  };
  const result = await bootstrapPrivateStagingDatabase({
    event: event(),
    env: env(),
    resolveSecret: async ({ secretId }) => {
      if (secretId.endsWith("/master")) return { username: "lawos_admin", password: "master-test-password" };
      if (secretId.endsWith("/application")) return { username: "lawos_app", password: "application-test-password" };
      if (secretId.endsWith("/tenant-context")) return { tenant_context_secret: "tenant-context-test-secret-material-32-bytes" };
      return MANIFEST;
    },
    createPool: (options) => { poolOptions = options; return pool; },
    runMigrations: async () => [{ id: "001", applied: true }, { id: "002", applied: false }],
    verifyMigrations: async () => [{ id: "001" }, { id: "002" }],
    putSecret: async (input) => { secretWrites.push(input); },
  });
  assert.equal(poolOptions.sslMode, "verify-full");
  assert.equal(result.outcome, "PASS");
  assert.equal(result.migration_count, 2);
  assert.equal(result.migration_applied_count, 1);
  assert.equal(result.tenant_authority_count, 6);
  assert.equal(result.json_fallback_count, 0);
  assert.equal(result.dual_write_count, 0);
  assert.equal(result.real_data_count, 0);
  assert.equal(result.secret_material_returned, false);
  assert.equal(secretWrites.length, 1);
  const stored = JSON.parse(secretWrites[0].secretString);
  assert.equal(stored.configuration_state, "ready");
  assert.equal(stored.host, "lawos-private-staging.example.rds.amazonaws.com");
  assert.equal(stored.password, "application-test-password");
  assert.equal(JSON.stringify(result).includes("application-test-password"), false);
  assert.equal(JSON.stringify(result).includes("master-test-password"), false);
});

test("private staging bootstrap rejects HTTP invocation and exact-head drift", async () => {
  await assert.rejects(
    bootstrapPrivateStagingDatabase({ event: event({ requestContext: {} }), env: env() }),
    /direct-invoke only/u,
  );
  await assert.rejects(
    bootstrapPrivateStagingDatabase({ event: event({ source_sha: "f".repeat(40) }), env: env() }),
    /exact head/u,
  );
});

test("private staging CUT-005 uses the ready application secret and returns safe counts", async () => {
  let poolOptions;
  const pool = { connect: async () => {}, end: async () => {} };
  const result = await executePrivateStagingCut005({
    event: event({ action: PRIVATE_STAGING_CUT005_ACTION, approval_id: CUT005_APPROVAL_ID }),
    env: env(),
    resolveSecret: async ({ secretId }) => {
      if (secretId.endsWith("/application")) {
        return {
          configuration_state: "ready",
          host: "lawos-private-staging.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos",
          username: "lawos_app",
          password: "application-test-password",
        };
      }
      if (secretId.endsWith("/tenant-context")) return { tenant_context_secret: "tenant-context-test-secret-material-32-bytes" };
      return MANIFEST;
    },
    createPool: (options) => { poolOptions = options; return pool; },
    verifyMigrations: async () => [{ id: "001" }],
    runCut005: async ({ tenantIds, runId }) => ({
      outcome: "PASS",
      domain_count: 13,
      immediate_replay_noop_count: 13,
      tenant_negative_visible_count: 0,
      rejected_row_count: 0,
      json_fallback_count: 0,
      json_writer_count: 0,
      dual_write_count: 0,
      real_data_count: 0,
      production_contacted: false,
      tenant_count: tenantIds.length,
      run_id: runId,
    }),
  });
  assert.equal(poolOptions.sslMode, "verify-full");
  assert.equal(result.outcome, "PASS");
  assert.equal(result.approval_id, CUT005_APPROVAL_ID);
  assert.equal(result.tenant_count, 2);
  assert.equal(result.run_id, `cut005-${SOURCE_SHA.slice(0, 12)}`);
  assert.equal(result.immediate_replay_noop_count, 13);
  assert.equal(result.dual_write_count, 0);
  assert.equal(result.secret_material_returned, false);
  assert.equal(JSON.stringify(result).includes("application-test-password"), false);
});

test("private staging CUT-006 binds deployed configuration, cold start, artifact entries, and PostgreSQL-only counters", async () => {
  let received;
  const pool = { connect: async () => {}, end: async () => {} };
  const result = await executePrivateStagingCut006({
    event: event({
      action: PRIVATE_STAGING_CUT006_ACTION,
      approval_id: CUT006_APPROVAL_ID,
      artifact_entry_manifest_sha256: "e".repeat(64),
      api_configuration_sha256: "f".repeat(64),
      api_cold_start_request_id: "synthetic-cold-start-request-id",
      api_cold_start_observed: true,
      artifact_runtime_store_entry_count: 0,
      artifact_real_json_store_count: 0,
      file_current_initialized_count: 0,
    }),
    env: env(),
    resolveSecret: async ({ secretId }) => {
      if (secretId.endsWith("/application")) {
        return {
          configuration_state: "ready",
          host: "lawos-private-staging.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos",
          username: "lawos_app",
          password: "application-test-password",
        };
      }
      if (secretId.endsWith("/tenant-context")) return { tenant_context_secret: "tenant-context-test-secret-material-32-bytes" };
      return MANIFEST;
    },
    createPool: () => pool,
    verifyMigrations: async () => [{ id: "001" }],
    runCut006: async (input) => {
      received = input;
      return {
        outcome: "PASS",
        domain_count: 13,
        json_fallback_count: 0,
        json_writer_count: 0,
        dual_write_count: 0,
        file_current_authority_count: 0,
        offline_mutation_count: 0,
        memory_fallback_count: 0,
        real_data_count: 0,
        production_contacted: false,
      };
    },
  });
  assert.equal(received.runId, `cut006-${SOURCE_SHA.slice(0, 12)}`);
  assert.equal(received.configuration.coldStartObserved, true);
  assert.equal(received.configuration.artifactRuntimeStoreEntryCount, 0);
  assert.equal(result.outcome, "PASS");
  assert.equal(result.approval_id, CUT006_APPROVAL_ID);
  assert.equal(result.api_configuration_sha256, "f".repeat(64));
  assert.match(result.api_cold_start_request_fingerprint, /^[a-f0-9]{64}$/u);
  assert.equal(result.secret_material_returned, false);
  assert.equal(JSON.stringify(result).includes("application-test-password"), false);
});

test("private staging CUT-007 baseline is exact-head bound and returns only safe PostgreSQL counts", async () => {
  let received;
  const pool = { connect: async () => {}, end: async () => {} };
  const result = await executePrivateStagingSyntheticBaseline({
    event: event({ action: PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION, approval_id: CUT007_APPROVAL_ID }),
    env: env(),
    resolveSecret: async ({ secretId }) => {
      if (secretId.endsWith("/application")) {
        return {
          configuration_state: "ready",
          host: "lawos-private-staging.example.rds.amazonaws.com",
          port: 5432,
          dbname: "lawos",
          username: "lawos_app",
          password: "application-test-password",
        };
      }
      if (secretId.endsWith("/tenant-context")) return { tenant_context_secret: "tenant-context-test-secret-material-32-bytes" };
      return MANIFEST;
    },
    createPool: () => pool,
    verifyMigrations: async () => [{ id: "001" }],
    runBaseline: async (input) => {
      received = input;
      return {
        outcome: "PASS",
        account_count: 2,
        employee_count: 2,
        wrong_tenant_visible_count: 0,
        json_fallback_count: 0,
        json_writer_count: 0,
        dual_write_count: 0,
        real_data_count: 0,
        secret_material_returned: false,
      };
    },
  });
  assert.deepEqual(received.tenantIds, MANIFEST.purpose_tenants.cut007);
  assert.equal(result.outcome, "PASS");
  assert.equal(result.action, PRIVATE_STAGING_SYNTHETIC_BASELINE_ACTION);
  assert.equal(result.approval_id, CUT007_APPROVAL_ID);
  assert.equal(result.source_sha, SOURCE_SHA);
  assert.equal(result.wrong_tenant_visible_count, 0);
  assert.equal(result.secret_material_returned, false);
  assert.equal(JSON.stringify(result).includes("application-test-password"), false);
});

test("private staging CUT-007 readback is exact-head bound and forwards only synthetic identifiers", async () => {
  let received;
  const pool = { connect: async () => {}, end: async () => {} };
  const expected = {
    user_ids: ["synthetic-lawos-staging-admin"],
    employee_ids: ["emp-lawos-staging-admin"],
    matter_id: "matter-cut007-test-001",
    document_ids: ["document-cut007-test-001"],
    finance_record_id: "time-cut007-test-001",
    portal_record_id: "dashboard-cut007-test-001",
  };
  const result = await executePrivateStagingCut007Readback({
    event: event({
      action: PRIVATE_STAGING_CUT007_READBACK_ACTION,
      approval_id: CUT007_APPROVAL_ID,
      run_id: "cut007-exact-head-test",
      expected,
    }),
    env: env(),
    resolveSecret: async ({ secretId }) => {
      if (secretId.endsWith("/application")) return {
        configuration_state: "ready",
        host: "lawos-private-staging.example.rds.amazonaws.com",
        port: 5432,
        dbname: "lawos",
        username: "lawos_app",
        password: "application-test-password",
      };
      if (secretId.endsWith("/tenant-context")) return { tenant_context_secret: "tenant-context-test-secret-material-32-bytes" };
      return MANIFEST;
    },
    createPool: () => pool,
    verifyMigrations: async () => [{ id: "001" }],
    runReadback: async (input) => {
      received = input;
      return { outcome: "PASS", safe_counts: { wrong_tenant_visible_count: 0 }, secret_material_returned: false };
    },
  });
  assert.equal(received.runId, "cut007-exact-head-test");
  assert.deepEqual(received.expected, expected);
  assert.deepEqual(received.tenantIds, MANIFEST.purpose_tenants.cut007);
  assert.equal(result.action, PRIVATE_STAGING_CUT007_READBACK_ACTION);
  assert.equal(result.approval_id, CUT007_APPROVAL_ID);
  assert.equal(JSON.stringify(result).includes("application-test-password"), false);
});

test("public handler blocks without returning underlying secret-bearing errors", async () => {
  const result = await handler({ action: "unsupported", database_url: "postgresql://user:secret@example/lawos" });
  assert.equal(result.outcome, "BLOCKED");
  assert.equal(result.secret_material_returned, false);
  assert.equal(JSON.stringify(result).includes("user:secret"), false);
});
