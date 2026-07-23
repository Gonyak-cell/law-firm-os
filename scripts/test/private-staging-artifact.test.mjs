import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPrivateStagingGitBlobMaterialization,
  buildPrivateStagingSyntheticSources,
  PRIVATE_STAGING_SOURCE_OVERRIDES,
  PRIVATE_STAGING_SOURCE_REDACTION_TARGETS,
  parsePrivateStagingGitTree,
  privateStagingArtifactSourcePathAllowed,
  redactPrivateStagingRuntimeSource,
  validatePrivateStagingArtifactEntries,
  validatePrivateStagingSourceIdentityBoundary,
  validatePrivateStagingSourceOverrides,
  validatePrivateStagingSyntheticIdentityManifestBinding,
  validateRdsCaBundle,
} from "../lib/private-staging-artifact.mjs";
import { PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN } from "../../packages/runtime-auth/src/private-staging-synthetic-email.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

test("artifact source allowlist includes runtime inputs and excludes evidence and secrets", () => {
  assert.equal(privateStagingArtifactSourcePathAllowed("apps/api/src/lambda.js"), true);
  assert.equal(privateStagingArtifactSourcePathAllowed("packages/persistence/src/postgres/pool.js"), true);
  assert.equal(privateStagingArtifactSourcePathAllowed("packages/runtime-auth/src/runtime-safety-approval-contract.js"), true);
  assert.equal(privateStagingArtifactSourcePathAllowed("apps/api/test/lambda-session-secret.test.js"), false);
  assert.equal(privateStagingArtifactSourcePathAllowed("workbook/receipt.json"), false);
  assert.equal(privateStagingArtifactSourcePathAllowed(".env.production"), false);
  assert.equal(privateStagingArtifactSourcePathAllowed("private-key.pem"), false);
  assert.equal(privateStagingArtifactSourcePathAllowed("docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json"), false);
});

test("artifact source inventory accepts only exact regular Git blobs", () => {
  const inventory = Buffer.from([
    `100644 blob ${"a".repeat(40)}\tapps/api/src/lambda.js`,
    `100755 blob ${"b".repeat(40)}\tpackages/persistence/src/postgres/pool.js`,
    `100644 blob ${"c".repeat(40)}\tworkbook/ignored.json`,
    "",
  ].join("\0"));
  assert.deepEqual(parsePrivateStagingGitTree(inventory), [
    { mode: "100644", type: "blob", oid: "a".repeat(40), path: "apps/api/src/lambda.js" },
    { mode: "100755", type: "blob", oid: "b".repeat(40), path: "packages/persistence/src/postgres/pool.js" },
  ]);

  const symlink = Buffer.from(`120000 blob ${"d".repeat(40)}\tapps/api/src/lambda.js\0`);
  assert.throws(() => parsePrivateStagingGitTree(symlink), /regular Git blob/u);

  const submodule = Buffer.from(`160000 commit ${"e".repeat(40)}\tpackages/persistence/src/postgres/pool.js\0`);
  assert.throws(() => parsePrivateStagingGitTree(submodule), /regular Git blob/u);

  const entry = parsePrivateStagingGitTree(Buffer.from(`100644 blob ${"f".repeat(40)}\tapps/api/src/lambda.js\0`))[0];
  assert.equal(assertPrivateStagingGitBlobMaterialization(entry, Buffer.from("exact"), Buffer.from("exact")).byte_size, 5);
  assert.throws(
    () => assertPrivateStagingGitBlobMaterialization(entry, Buffer.from("exact"), Buffer.from("host-substitution")),
    /differ from the exact Git blob/u,
  );
});

test("artifact entry contract requires both Lambda handlers and RDS trust bundle", () => {
  const result = validatePrivateStagingArtifactEntries([
    "apps/api/src/lambda.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/private-staging-admin-lambda.js",
    "apps/api/src/private-staging-cut006.js",
    "apps/api/src/private-staging-cut007-readback.js",
    "apps/api/src/private-staging-synthetic-baseline.js",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/persistence/src/postgres/migration-runner.js",
    "packages/runtime-auth/src/runtime-safety-approval-contract.js",
    "node_modules/pg/package.json",
    "node_modules/retry/test/common.js",
  ]);
  assert.equal(result.forbidden_entry_count, 0);
  assert.equal(result.runtime_store_entry_count, 0);
  assert.equal(result.real_json_store_count, 0);
  assert.throws(() => validatePrivateStagingArtifactEntries([
    "apps/api/src/lambda.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/private-staging-admin-lambda.js",
    "apps/api/src/private-staging-cut006.js",
    "apps/api/src/private-staging-cut007-readback.js",
    "apps/api/src/private-staging-synthetic-baseline.js",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/persistence/src/postgres/migration-runner.js",
    "packages/runtime-auth/src/runtime-safety-approval-contract.js",
    "apps/api/test/secret.test.js",
  ]), /forbidden entries/u);
  const valid = [
    "apps/api/src/lambda.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/private-staging-admin-lambda.js",
    "apps/api/src/private-staging-cut006.js",
    "apps/api/src/private-staging-cut007-readback.js",
    "apps/api/src/private-staging-synthetic-baseline.js",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/persistence/src/postgres/migration-runner.js",
    "packages/runtime-auth/src/runtime-safety-approval-contract.js",
  ];
  assert.throws(() => validatePrivateStagingArtifactEntries([...valid, valid[0]]), /duplicate entry/u);
  assert.throws(() => validatePrivateStagingArtifactEntries([...valid, "../package.json"]), /unsafe archive path/u);
});

test("artifact builder creates only synthetic packaged account and HRX sources", () => {
  const result = buildPrivateStagingSyntheticSources({
    schema_version: "law-firm-os.private-staging.synthetic-account-directory.v1",
    data_scope: "synthetic-only",
    real_identity_count: 0,
    accounts_approved: true,
    tenant_id: "tenant_lawos_staging_cut007_a",
    accounts: [
      {
        user_id: "synthetic-lawos-staging-admin",
        employee_id: "emp-lawos-staging-admin",
        email: "jwsuh+lawos-staging-admin@amic.kr",
        display_name: "LawOS Staging Pilot ADMIN",
        role_ids: ["firm_admin", "matter_vault_admin"],
      },
      {
        user_id: "synthetic-lawos-staging-attorney",
        employee_id: "emp-lawos-staging-attorney",
        email: "jwsuh+lawos-staging-attorney@amic.kr",
        display_name: "LawOS Staging Pilot ATTORNEY",
        role_ids: ["attorney", "matter_vault_user"],
      },
      {
        user_id: "synthetic-lawos-staging-disabled",
        employee_id: "emp-lawos-staging-disabled",
        email: "jwsuh+lawos-staging-disabled@amic.kr",
        display_name: "LawOS Staging Pilot DISABLED",
        role_ids: ["attorney", "matter_vault_user"],
        account_status: "disabled",
      },
    ],
  });
  assert.deepEqual(result.safe_counts, { account_count: 3, employee_count: 3, real_identity_count: 0 });
  assert.equal(result.account_seed.users.every((user) => user.qa_tenant_scope === "synthetic_only"), true);
  assert.equal(result.account_seed.users.filter((user) => user.credential_status === "reset_required").length, 2);
  assert.equal(result.account_seed.users.filter((user) => user.credential_status === "disabled").length, 1);
  assert.equal(result.account_seed.users.filter((user) => user.password_setup_required === true).length, 2);
  assert.equal(result.account_seed.users.every((user) => user.hrx_scopes.length > 0 && user.hrx_scopes.every((scope) => user.scopes.includes(scope))), true);
  assert.equal(result.account_seed.users[0].scopes.includes("finance.time.write"), true);
  assert.equal(result.account_seed.users[0].scopes.includes("finance.billing.write"), true);
  assert.equal(result.account_seed.users[0].role_ids.includes("lawos_admin"), true);
  assert.equal(result.account_seed.users[1].role_ids.includes("lawos_attorney"), true);
  assert.equal(result.roster.members.every((member) => member.employment_type === "full_time"), true);
  assert.equal(result.roster.members.every((member) => member.professional_profile?.experience?.length > 0), true);
  assert.doesNotMatch(JSON.stringify(result), /@amic\.law|emp_amic_|tenant_amic/u);
});

test("artifact builder rejects unapproved or credential-bearing account manifests", () => {
  const base = {
    schema_version: "law-firm-os.private-staging.synthetic-account-directory.v1",
    data_scope: "synthetic-only",
    real_identity_count: 0,
    accounts_approved: false,
    tenant_id: "tenant_lawos_staging_cut007_a",
    accounts: [],
  };
  assert.throws(() => buildPrivateStagingSyntheticSources(base), /approved synthetic-only/u);
  const credential = structuredClone(base);
  credential.accounts_approved = true;
  credential.client_secret = "forbidden";
  assert.throws(() => buildPrivateStagingSyntheticSources(credential), /forbidden credential field/u);
});

test("synthetic email contract accepts only the approved plus-address role tags", () => {
  assert.equal(PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN.test("jwsuh+lawos-staging-admin@amic.kr"), true);
  assert.equal(PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN.test("jwsuh+lawos-staging-attorney@amic.kr"), true);
  assert.equal(PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN.test("jwsuh+lawos-staging-disabled@amic.kr"), true);
  assert.equal(PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN.test("jwsuh+lawos-staging-owner@amic.kr"), false);
  assert.equal(PRIVATE_STAGING_SYNTHETIC_EMAIL_PATTERN.test("jwsuh+lawos-staging-admin@example.com"), false);
});

test("synthetic identity approval is bound to the exact source SHA and tree", () => {
  const sourceSha = "a".repeat(40);
  const sourceTree = "b".repeat(40);
  const manifest = { source_sha: sourceSha, source_tree: sourceTree, accounts_approved: true };
  assert.deepEqual(validatePrivateStagingSyntheticIdentityManifestBinding(manifest, { sourceSha, sourceTree }), {
    source_sha: sourceSha,
    source_tree: sourceTree,
    accounts_approved: true,
  });
  assert.throws(
    () => validatePrivateStagingSyntheticIdentityManifestBinding(manifest, { sourceSha: "c".repeat(40), sourceTree }),
    /source SHA\/tree drifted/u,
  );
});

test("artifact source overrides remove real client candidates and user role assignments", () => {
  const overrides = PRIVATE_STAGING_SOURCE_OVERRIDES.map((entry) => {
    const bytes = readFileSync(entry.source_path);
    return {
      ...entry,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      byte_size: bytes.byteLength,
      text: bytes.toString("utf8"),
    };
  });
  assert.deepEqual(validatePrivateStagingSourceOverrides(overrides), {
    override_count: 2,
    real_identity_match_count: 0,
    real_client_candidate_count: 0,
  });
  const drifted = structuredClone(overrides);
  drifted[0].text = 'export const AMIC_CURRENT_CLIENT_CANDIDATES = [{ display_name: "real" }];\n';
  drifted[0].byte_size = Buffer.byteLength(drifted[0].text);
  assert.throws(() => validatePrivateStagingSourceOverrides(drifted), /must be empty/u);
});

test("artifact runtime-source redactions remove every known real identity marker", () => {
  const syntheticSources = buildPrivateStagingSyntheticSources({
    schema_version: "law-firm-os.private-staging.synthetic-account-directory.v1",
    data_scope: "synthetic-only",
    real_identity_count: 0,
    accounts_approved: true,
    tenant_id: "tenant_lawos_staging_cut007_a",
    accounts: [
      { user_id: "synthetic-lawos-staging-admin", employee_id: "emp-lawos-staging-admin", email: "lawos-staging-admin@example.invalid", display_name: "LawOS Staging Pilot ADMIN", role_ids: ["firm_admin"] },
      { user_id: "synthetic-lawos-staging-attorney", employee_id: "emp-lawos-staging-attorney", email: "lawos-staging-attorney@example.invalid", display_name: "LawOS Staging Pilot ATTORNEY", role_ids: ["attorney"] },
      { user_id: "synthetic-lawos-staging-disabled", employee_id: "emp-lawos-staging-disabled", email: "lawos-staging-disabled@example.invalid", display_name: "LawOS Staging Pilot DISABLED", role_ids: ["attorney"], account_status: "disabled" },
    ],
  });
  const redacted = PRIVATE_STAGING_SOURCE_REDACTION_TARGETS.map((targetPath) => redactPrivateStagingRuntimeSource({
    targetPath,
    text: readFileSync(targetPath, "utf8"),
    syntheticSources,
  }));
  assert.equal(redacted.length, 4);
  assert.deepEqual(validatePrivateStagingSourceIdentityBoundary(redacted.map((entry) => ({ path: entry.target_path, text: entry.text }))), {
    scanned_source_count: 4,
    real_identity_marker_count: 0,
  });
  assert.equal(validatePrivateStagingSourceIdentityBoundary([
    { path: "synthetic-account.json", text: '{"email":"lawos-staging-admin@amic.kr"}' },
  ]).real_identity_marker_count, 0);
  assert.equal(validatePrivateStagingSourceIdentityBoundary([
    { path: "synthetic-account.json", text: '{"email":"jwsuh+lawos-staging-admin@amic.kr"}' },
  ]).real_identity_marker_count, 0);
  assert.throws(() => validatePrivateStagingSourceIdentityBoundary([
    { path: "synthetic-account.json", text: '{"email":"jwsuh+lawos-staging-owner@amic.kr"}' },
  ]), /real identity markers/u);
  assert.throws(() => validatePrivateStagingSourceIdentityBoundary([{ path: "leak.js", text: "legacy-user@amic.kr" }]), /real identity markers/u);
});

test("RDS trust bundle validation rejects truncated certificate data", () => {
  assert.throws(() => validateRdsCaBundle("-----BEGIN CERTIFICATE-----\nshort\n"), /incomplete/u);
  const certificate = "-----BEGIN CERTIFICATE-----\n" + "A".repeat(2100) + "\n-----END CERTIFICATE-----\n";
  const valid = validateRdsCaBundle(certificate.repeat(5));
  assert.equal(valid.certificate_count, 5);
  assert.ok(valid.byte_size > 10000);
});
