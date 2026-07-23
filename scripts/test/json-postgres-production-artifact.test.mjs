import assert from "node:assert/strict";
import test from "node:test";
import {
  JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
  emptyJsonPostgresProductionSources,
  parseJsonPostgresProductionGitTree,
  redactJsonPostgresProductionRuntimeSource,
  validateJsonPostgresProductionArtifactEntries,
  validateJsonPostgresProductionDeploymentManifest,
  validateJsonPostgresProductionSourceBoundary,
  validateJsonPostgresProductionSourceOverrides,
} from "../lib/json-postgres-production-artifact.mjs";

function oid(character) {
  return character.repeat(40);
}

test("production Git tree excludes private-staging source", () => {
  const tree = Buffer.from([
    `100644 blob ${oid("a")}\tapps/api/src/lambda.js`,
    `100644 blob ${oid("b")}\tapps/api/src/private-staging-admin-lambda.js`,
    `100644 blob ${oid("c")}\tpackages/runtime-auth/src/private-staging-synthetic-email.js`,
    `100644 blob ${oid("d")}\tpackages/persistence/src/postgres/execution-contract.js`,
    "",
  ].join("\0"));
  assert.deepEqual(
    parseJsonPostgresProductionGitTree(tree).map((entry) => entry.path),
    [
      "apps/api/src/lambda.js",
      "packages/persistence/src/postgres/execution-contract.js",
    ],
  );
});

test("production empty sources contain no accounts or roster rows", () => {
  const sources = emptyJsonPostgresProductionSources();
  assert.equal(sources.account_seed.tenant_id, "");
  assert.deepEqual(sources.account_seed.users, []);
  assert.equal(sources.roster.tenant_id, "");
  assert.deepEqual(sources.roster.members, []);
  assert.doesNotMatch(JSON.stringify(sources), /@amic\.|user_amic_|emp_amic_/iu);
});

test("production redaction removes all real identity markers", () => {
  const fixtures = [
    ["apps/api/src/hrx-member-roster-registry.js",
      'const MEMBER_PHOTO_FILE_BY_EMPLOYEE_ID = new Map([["emp_amic_owner_fixture", "a.png"]]);'],
    ["apps/api/src/lambda.js",
      'const x = "lawos-owner-fixture@amic.kr user_amic_owner_fixture emp_amic_owner_fixture assumed-role/lawos-private-staging-api-role/";'],
    ["apps/api/src/outlook-addin-runtime-context.js", 'const x = "someone@amic.law";'],
    ["packages/matter/src/worktree-template-model.js", 'const x = "someone@amic.kr";'],
  ];
  const redacted = fixtures.map(([targetPath, text]) => ({
    path: targetPath,
    text: redactJsonPostgresProductionRuntimeSource({ targetPath, text }).text,
  }));
  assert.equal(
    validateJsonPostgresProductionSourceBoundary(redacted).real_identity_marker_count,
    0,
  );
  assert.doesNotMatch(JSON.stringify(redacted), /lawos-private-staging/iu);
});

test("production overrides are empty and PostgreSQL membership backed", () => {
  const overrides = [
    {
      source_path: "packages/master-data/src/production-client-candidates.js",
      target_path: "packages/master-data/src/amic-client-candidates.js",
      purpose: "real-clients-loaded-from-approved-postgres-migration-only",
      sha256: "a".repeat(64),
      byte_size: 67,
      text: "export const AMIC_CURRENT_CLIENT_CANDIDATES = Object.freeze([]);\n",
    },
    {
      source_path: "apps/api/src/production-lawos-role-registry.js",
      target_path: "apps/api/src/lawos-role-registry.js",
      purpose: "roles-loaded-from-postgres-identity-membership-only",
      sha256: "b".repeat(64),
      byte_size: 147,
      text: [
        'export const LAWOS_ROLE_REGISTRY_SOURCE = "postgres-v2-account-membership";',
        "export const LAWOS_INTERNAL_ROLE_ASSIGNMENTS = Object.freeze([]);",
        "",
      ].join("\n"),
    },
  ];
  for (const item of overrides) item.byte_size = Buffer.byteLength(item.text);
  assert.equal(
    validateJsonPostgresProductionSourceOverrides(overrides).override_count,
    2,
  );
  assert.throws(
    () => validateJsonPostgresProductionSourceOverrides([
      { ...overrides[0], text: "const email = 'real@amic.kr';", byte_size: 29 },
      overrides[1],
    ]),
    /real identity material/u,
  );
});

test("production artifact entry and deployment manifest contracts fail closed", () => {
  const entries = [
    "apps/api/src/lambda.js",
    "apps/api/src/json-postgres-program-admin-lambda.js",
    "apps/api/src/immutable-program-input.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/dms/src/json-postgres-dms-migration.js",
    "packages/persistence/src/postgres/execution-contract.js",
    "packages/persistence/src/postgres/migration-runner.js",
    "packages/persistence/src/postgres/program-receipt.js",
  ];
  assert.equal(validateJsonPostgresProductionArtifactEntries(entries).entry_count, 12);
  assert.equal(validateJsonPostgresProductionArtifactEntries([
    ...entries,
    "node_modules/pg-types/test/index.js",
  ]).entry_count, 13);
  assert.throws(
    () => validateJsonPostgresProductionArtifactEntries([
      ...entries,
      "apps/api/src/private-staging-admin-lambda.js",
    ]),
    /forbidden entries/u,
  );
  assert.throws(
    () => validateJsonPostgresProductionArtifactEntries([
      ...entries,
      "apps/api/test/server.test.js",
    ]),
    /forbidden entries/u,
  );
  assert.throws(
    () => validateJsonPostgresProductionArtifactEntries([
      ...entries,
      "node_modules/example/private.key",
    ]),
    /forbidden entries/u,
  );
  const manifest = {
    schema_version: JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA,
    data_scope: "approved-immutable-inputs-only",
    operational_authority: "postgres-v2",
    json_fallback: false,
    json_writer: false,
    dual_write: false,
    file_current_authority: false,
    offline_mutation: false,
    memory_fallback: false,
    packaged_real_identity_count: 0,
    packaged_real_client_count: 0,
    packaged_static_role_assignment_count: 0,
    secrets_in_environment: false,
    production_ready_claim: false,
  };
  assert.equal(
    validateJsonPostgresProductionDeploymentManifest(manifest)
      .legacy_authority_counter_total,
    0,
  );
  assert.throws(
    () => validateJsonPostgresProductionDeploymentManifest({
      ...manifest,
      json_fallback: true,
    }),
    /authority boundary drifted/u,
  );
});
