import assert from "node:assert/strict";
import test from "node:test";
import {
  PRIVATE_STAGING_BOOTSTRAP_ACTION,
  PRIVATE_STAGING_BOOTSTRAP_APPROVAL_ID,
  PRIVATE_STAGING_CUT005_ACTION,
  PRIVATE_STAGING_CUT005_APPROVAL_ID,
  bootstrapPrivateStagingDatabase,
  executePrivateStagingCut005,
  handler,
} from "../src/private-staging-admin-lambda.js";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const ARTIFACT_SHA = "c".repeat(64);
const INSTRUCTION_SHA = "d".repeat(64);
const MANIFEST = {
  schema_version: "law-firm-os.synthetic-staging-manifest.v1",
  data_scope: "synthetic-only",
  tenant_ids: ["tenant_lawos_staging_a", "tenant_lawos_staging_b"],
  real_data_allowed: false,
};
const MANIFEST_SHA = "7fa2371b4fdf0676478f3f2f48864a3e8c17ff24b96db3b5d2b7990fe17a016f";

function env() {
  return {
    AWS_REGION: "ap-northeast-2",
    LAWOS_APPLICATION_DATABASE_SECRET_ID: "/lawos/private-staging/postgres/application",
    LAWOS_DATABASE_HOST: "lawos-private-staging.example.rds.amazonaws.com",
    LAWOS_DATABASE_NAME: "lawos",
    LAWOS_DATABASE_PORT: "5432",
    LAWOS_DEPLOYMENT_ARTIFACT_SHA256: ARTIFACT_SHA,
    LAWOS_DEPLOYMENT_COMMIT: SOURCE_SHA,
    LAWOS_DEPLOYMENT_TREE: SOURCE_TREE,
    LAWOS_MASTER_DATABASE_SECRET_ID: "/lawos/private-staging/postgres/master",
    LAWOS_OWNER_INSTRUCTION_SHA256: INSTRUCTION_SHA,
    LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: "/lawos/private-staging/postgres/tenant-context",
    LAWOS_SYNTHETIC_MANIFEST_SECRET_ID: "/lawos/private-staging/synthetic/manifest",
  };
}

function event(overrides = {}) {
  return {
    action: PRIVATE_STAGING_BOOTSTRAP_ACTION,
    approval_id: PRIVATE_STAGING_BOOTSTRAP_APPROVAL_ID,
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
  assert.equal(result.tenant_authority_count, 2);
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
    event: event({ action: PRIVATE_STAGING_CUT005_ACTION, approval_id: PRIVATE_STAGING_CUT005_APPROVAL_ID }),
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
  assert.equal(result.approval_id, PRIVATE_STAGING_CUT005_APPROVAL_ID);
  assert.equal(result.tenant_count, 2);
  assert.equal(result.run_id, `cut005-${SOURCE_SHA.slice(0, 12)}`);
  assert.equal(result.immediate_replay_noop_count, 13);
  assert.equal(result.dual_write_count, 0);
  assert.equal(result.secret_material_returned, false);
  assert.equal(JSON.stringify(result).includes("application-test-password"), false);
});

test("public handler blocks without returning underlying secret-bearing errors", async () => {
  const result = await handler({ action: "unsupported", database_url: "postgresql://user:secret@example/lawos" });
  assert.equal(result.outcome, "BLOCKED");
  assert.equal(result.secret_material_returned, false);
  assert.equal(JSON.stringify(result).includes("user:secret"), false);
});
