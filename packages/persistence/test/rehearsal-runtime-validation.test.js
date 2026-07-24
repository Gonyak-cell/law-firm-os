import assert from "node:assert/strict";
import test from "node:test";
import { hashDomainValue } from "../src/domain-ledger.js";
import {
  runJsonPostgresRehearsalFailureInjection,
  runJsonPostgresRehearsalOwnerSampling,
} from "../src/postgres/rehearsal-runtime-validation.js";
import {
  createMigratedPostgresFixture,
} from "./helpers/disposable-postgres.js";

test("W12 failure injection leaves no durable probe rows", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const result = await runJsonPostgresRehearsalFailureInjection({
    pool: fixture.appPool,
    tenantId: "tenant-w12-failure",
    negativeTenantId: "tenant-w12-negative",
    probeRef: "w12-failure-test",
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.checks.transaction_rollback_verified, true);
  assert.equal(result.checks.optimistic_conflict_verified, true);
  assert.equal(result.checks.outbox_atomicity_verified, true);
  assert.equal(result.checks.retry_rollback_verified, true);
  assert.equal(result.checks.statement_timeout_verified, true);
  assert.equal(result.checks.cross_tenant_transaction_denied, true);
  assert.equal(result.safe_counts.partial_commit_count, 0);
  assert.equal(result.safe_counts.retry_attempt_count, 3);
  assert.equal(result.claims.durable_probe_write, false);
});

test("W12 owner sampling selects deterministic pseudonymous records and fails on variance", async () => {
  const target = new Map();
  const records = [
    ["hrx", "hrx_employees", "employee-1"],
    ["matter", "MatterClient", "client-1"],
    ["matter", "Matter", "matter-1"],
    ["dms-auxiliary", "DmsDocument", "document-1"],
  ].map(([domain_id, record_type, record_id]) => ({
    tenant_id: "tenant-w12",
    domain_id,
    record_type,
    record_id,
    state_version: 1,
    unique_key: null,
    payload: { state: "approved" },
    payload_hash: hashDomainValue({ state: "approved" }),
    append_only: false,
    references: [],
  }));
  for (const record of records) {
    target.set(
      `${record.domain_id}:${record.record_type}:${record.record_id}`,
      record,
    );
  }
  const corpus = {
    schema_version: "law-firm-os.json-postgres-migration-corpus.v1",
    data_scope: "approved-real-manifest",
    tenant_id: "tenant-w12",
    accounts: [{
      user_id: "account-1",
      email: "registered@example.test",
      account_status: "active",
      credential_provider: "lawos-internal-password-provider-v1",
      credential_status: "reset_required",
      profile: { display_name: "Registered User" },
      membership: {
        tenant_id: "tenant-w12",
        status: "active",
        role_ids: [],
        group_ids: [],
        scopes: [],
        hrx_scopes: [],
      },
    }],
    domains: [...new Set(records.map((record) => record.domain_id))]
      .map((domainId) => ({
        domain_id: domainId,
        records: records.filter((record) => record.domain_id === domainId),
      })),
  };
  const targetAccount = {
    tenant_id: "tenant-w12",
    user_id: "account-1",
    email: "registered@example.test",
    status: "active",
    account_status: "active",
    credential_provider: "lawos-internal-password-provider-v1",
    credential_status: "reset_required",
    profile: { display_name: "Registered User" },
    tenant_memberships: [{
      tenant_id: "tenant-w12",
      status: "active",
      role_profile_id: null,
      role_ids: [],
      group_ids: [],
      scopes: [],
      hrx_scopes: [],
      source_ref: null,
      state_version: 1,
    }],
    directory_state_version: 1,
  };
  const options = {
    pool: { async connect() {} },
    corpus,
    packetSha256: "a".repeat(64),
    createDomainLedger: () => ({
      async read(input) {
        return target.get(
          `${input.domain_id}:${input.record_type}:${input.record_id}`,
        );
      },
    }),
    createIdentityLedger: () => ({
      async findDirectoryUserByUserId() {
        return targetAccount;
      },
    }),
  };
  const first = await runJsonPostgresRehearsalOwnerSampling(options);
  const second = await runJsonPostgresRehearsalOwnerSampling(options);
  assert.equal(first.outcome, "PASS");
  assert.equal(first.sample_set_sha256, second.sample_set_sha256);
  assert.equal(first.samples.length, 5);
  assert.equal(
    first.samples.every((sample) =>
      /^[0-9a-f]{64}$/u.test(sample.sample_ref)),
    true,
  );
  assert.equal(first.safe_counts.owner_sample_variance_count, 0);
  target.set("matter:Matter:matter-1", {
    ...target.get("matter:Matter:matter-1"),
    payload_hash: "f".repeat(64),
  });
  await assert.rejects(
    runJsonPostgresRehearsalOwnerSampling(options),
    (error) => error?.code === "LAWOS_REHEARSAL_OWNER_SAMPLE_VARIANCE",
  );
});
