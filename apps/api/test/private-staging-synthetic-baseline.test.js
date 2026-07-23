import assert from "node:assert/strict";
import test from "node:test";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createPostgresIdentityLedger } from "../../../packages/runtime-auth/src/postgres-identity-ledger.js";
import { buildPrivateStagingSyntheticSources } from "../../../scripts/lib/private-staging-artifact.mjs";
import {
  runPrivateStagingSyntheticBaseline,
  validatePrivateStagingSyntheticBaseline,
} from "../src/private-staging-synthetic-baseline.js";

const TENANTS = ["tenant_lawos_staging_cut007_a", "tenant_lawos_staging_cut007_b"];

function sources() {
  return buildPrivateStagingSyntheticSources({
    schema_version: "law-firm-os.private-staging.synthetic-account-directory.v1",
    data_scope: "synthetic-only",
    real_identity_count: 0,
    accounts_approved: true,
    tenant_id: TENANTS[0],
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
}

test("synthetic baseline validation rejects non-synthetic identity drift", () => {
  const value = sources();
  assert.throws(() => validatePrivateStagingSyntheticBaseline({
    accountSeed: {
      ...value.account_seed,
      users: value.account_seed.users.map((user, index) => index === 0 ? { ...user, email: "real.person@example.com" } : user),
    },
    roster: value.roster,
    tenantIds: TENANTS,
  }), /synthetic baseline identifiers/u);
});

test("CUT-007 synthetic baseline provisions PostgreSQL identity and HRX with replay and tenant isolation", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const value = sources();
  const first = await runPrivateStagingSyntheticBaseline({
    pool: fixture.appPool,
    tenantIds: TENANTS,
    accountSeed: value.account_seed,
    roster: value.roster,
  });
  assert.equal(first.outcome, "PASS");
  assert.equal(first.account_count, 3);
  assert.equal(first.employee_count, 3);
  assert.equal(first.employment_profile_count, 3);
  assert.equal(first.professional_profile_count, 3);
  assert.equal(first.employee_user_link_count, 3);
  assert.equal(first.master_data_record_count, 10);
  assert.equal(first.crm_record_count, 1);
  assert.equal(first.first_run_changed_count, 3);
  assert.equal(first.immediate_replay_noop_count, 9);
  assert.equal(first.wrong_tenant_visible_count, 0);
  assert.equal(first.identity_audit_count, 3);
  assert.equal(first.identity_outbox_count, 3);
  assert.equal(first.json_fallback_count, 0);
  assert.equal(first.real_data_count, 0);
  assert.equal(first.synthetic_email_value_returned, false);
  assert.match(first.source_fingerprint, /^[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(first).includes("@example.test"), false);

  const second = await runPrivateStagingSyntheticBaseline({
    pool: fixture.appPool,
    tenantIds: TENANTS,
    accountSeed: value.account_seed,
    roster: value.roster,
  });
  assert.equal(second.outcome, "PASS");
  assert.equal(second.first_run_changed_count, 0);
  assert.equal(second.primary_import_replayed, true);
  assert.equal(second.negative_import_replayed, true);
  assert.equal(second.source_fingerprint, first.source_fingerprint);

  const directory = createPostgresIdentityLedger({ pool: fixture.appPool });
  const users = await directory.listDirectoryUsers({ tenant_id: TENANTS[0] });
  assert.equal(users.length, 3);
  assert.equal(users.filter((user) => user.credential_status === "reset_required").length, 2);
  assert.equal(users.filter((user) => user.credential_status === "disabled").length, 1);
  assert.ok(users.every((user) => user.scopes.length >= user.hrx_scopes.length && user.hrx_scopes.length > 0));
  assert.ok(users.every((user) => !Object.hasOwn(user, "password_hash")));
  assert.deepEqual(await directory.listDirectoryUsers({ tenant_id: TENANTS[1] }), []);
});

test("CUT-007 synthetic baseline rejects additional CRM records outside the synthetic boundary", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const value = sources();
  await runPrivateStagingSyntheticBaseline({
    pool: fixture.appPool,
    tenantIds: TENANTS,
    accountSeed: value.account_seed,
    roster: value.roster,
  });
  await createPostgresDomainLedger({ pool: fixture.appPool }).write({
    tenant_id: TENANTS[0],
    domain_id: "crm",
    record_type: "Opportunity",
    record_id: "opportunity-outside-synthetic-boundary",
    expected_version: 0,
    payload: { synthetic_only: false },
  });
  await assert.rejects(runPrivateStagingSyntheticBaseline({
    pool: fixture.appPool,
    tenantIds: TENANTS,
    accountSeed: value.account_seed,
    roster: value.roster,
  }), (error) => error?.safe_error_code === "PRIVATE_STAGING_SYNTHETIC_BASELINE_FAILED"
    && error?.safe_counts?.crm_total_record_count === 2);

  await createPostgresDomainLedger({ pool: fixture.appPool }).write({
    tenant_id: TENANTS[0],
    domain_id: "crm",
    record_type: "Opportunity",
    record_id: "opportunity-outside-synthetic-boundary",
    expected_version: 1,
    payload: { synthetic_only: true },
  });
  await assert.rejects(runPrivateStagingSyntheticBaseline({
    pool: fixture.appPool,
    tenantIds: TENANTS,
    accountSeed: value.account_seed,
    roster: value.roster,
  }), (error) => error?.safe_error_code === "PRIVATE_STAGING_SYNTHETIC_BASELINE_FAILED"
    && error?.safe_counts?.crm_boundary_violation_count === 1);
});
