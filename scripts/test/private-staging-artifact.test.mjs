import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPrivateStagingSyntheticSources,
  privateStagingArtifactSourcePathAllowed,
  validatePrivateStagingArtifactEntries,
  validateRdsCaBundle,
} from "../lib/private-staging-artifact.mjs";

test("artifact source allowlist includes runtime inputs and excludes evidence and secrets", () => {
  assert.equal(privateStagingArtifactSourcePathAllowed("apps/api/src/lambda.js"), true);
  assert.equal(privateStagingArtifactSourcePathAllowed("packages/persistence/src/postgres/pool.js"), true);
  assert.equal(privateStagingArtifactSourcePathAllowed("apps/api/test/lambda-session-secret.test.js"), false);
  assert.equal(privateStagingArtifactSourcePathAllowed("workbook/receipt.json"), false);
  assert.equal(privateStagingArtifactSourcePathAllowed(".env.production"), false);
  assert.equal(privateStagingArtifactSourcePathAllowed("private-key.pem"), false);
  assert.equal(privateStagingArtifactSourcePathAllowed("docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json"), false);
});

test("artifact entry contract requires both Lambda handlers and RDS trust bundle", () => {
  const result = validatePrivateStagingArtifactEntries([
    "apps/api/src/lambda.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/private-staging-admin-lambda.js",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/persistence/src/postgres/migration-runner.js",
    "node_modules/pg/package.json",
    "node_modules/retry/test/common.js",
  ]);
  assert.equal(result.forbidden_entry_count, 0);
  assert.throws(() => validatePrivateStagingArtifactEntries([
    "apps/api/src/lambda.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/private-staging-admin-lambda.js",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/persistence/src/postgres/migration-runner.js",
    "apps/api/test/secret.test.js",
  ]), /forbidden entries/u);
});

test("artifact builder creates only synthetic packaged account and HRX sources", () => {
  const result = buildPrivateStagingSyntheticSources({
    schema_version: "law-firm-os.private-staging.synthetic-identities.v1",
    data_scope: "synthetic-only",
    real_identity_count: 0,
    accounts_provisioned: true,
    tenant_id: "tenant_lawos_staging_a",
    accounts: [
      {
        user_id: "synthetic-lawos-staging-admin",
        employee_id: "emp-lawos-staging-admin",
        email: "lawos-staging-admin@example.invalid",
        display_name: "LawOS Staging Pilot ADMIN",
        role_ids: ["firm_admin", "matter_vault_admin"],
      },
      {
        user_id: "synthetic-lawos-staging-attorney",
        employee_id: "emp-lawos-staging-attorney",
        email: "lawos-staging-attorney@example.invalid",
        display_name: "LawOS Staging Pilot ATTORNEY",
        role_ids: ["attorney", "matter_vault_user"],
      },
    ],
  });
  assert.deepEqual(result.safe_counts, { account_count: 2, employee_count: 2, real_identity_count: 0 });
  assert.equal(result.account_seed.users.every((user) => user.qa_tenant_scope === "synthetic_only"), true);
  assert.equal(result.roster.members.every((member) => member.employment_type === "synthetic"), true);
  assert.doesNotMatch(JSON.stringify(result), /@amic\.law|emp_amic_|tenant_amic/u);
});

test("artifact builder rejects unprovisioned or credential-bearing identity manifests", () => {
  const base = {
    schema_version: "law-firm-os.private-staging.synthetic-identities.v1",
    data_scope: "synthetic-only",
    real_identity_count: 0,
    accounts_provisioned: false,
    tenant_id: "tenant_lawos_staging_a",
    accounts: [],
  };
  assert.throws(() => buildPrivateStagingSyntheticSources(base), /provisioned synthetic-only/u);
  const credential = structuredClone(base);
  credential.accounts_provisioned = true;
  credential.client_secret = "forbidden";
  assert.throws(() => buildPrivateStagingSyntheticSources(credential), /forbidden credential field/u);
});

test("RDS trust bundle validation rejects truncated certificate data", () => {
  assert.throws(() => validateRdsCaBundle("-----BEGIN CERTIFICATE-----\nshort\n"), /incomplete/u);
  const certificate = "-----BEGIN CERTIFICATE-----\n" + "A".repeat(2100) + "\n-----END CERTIFICATE-----\n";
  const valid = validateRdsCaBundle(certificate.repeat(5));
  assert.equal(valid.certificate_count, 5);
  assert.ok(valid.byte_size > 10000);
});
