import assert from "node:assert/strict";
import test from "node:test";
import { DOMAIN_IDS } from "../src/domain-ledger.js";
import { createPostgresDomainLedger } from "../src/postgres/domain-ledger.js";
import {
  JSON_POSTGRES_MIGRATION_SCHEMA_VERSION,
  runJsonPostgresMigration,
} from "../src/postgres/json-postgres-migration.js";
import { createMigratedPostgresFixture } from "./helpers/disposable-postgres.js";

const TENANT = "tenant_lawos_staging_migration_a";
const OTHER_TENANT = "tenant_lawos_staging_migration_b";
const ORDERED_DOMAINS = [
  "hrx",
  "master-data",
  "crm",
  "intake",
  "matter",
  "dms",
  "dms-auxiliary",
  "finance",
  "client-portal",
  "ai-governance",
  "analytics",
  "ui-readiness",
  "enterprise-readiness",
];

function syntheticCorpus() {
  const domains = ORDERED_DOMAINS.map((domainId, index) => {
    const recordType = `Synthetic${domainId.replaceAll(/[^a-z0-9]/gu, "_")}Record`;
    const recordId = `synthetic-${domainId}-001`;
    const previous = index > 0 ? ORDERED_DOMAINS[index - 1] : null;
    const previousType = previous ? `Synthetic${previous.replaceAll(/[^a-z0-9]/gu, "_")}Record` : null;
    return {
      domain_id: domainId,
      records: [{
        record_type: recordType,
        record_id: recordId,
        state_version: index + 1,
        unique_key: `${domainId}:synthetic:001`,
        payload: {
          synthetic_only: true,
          schema_family: domainId,
          stable_value: index + 1,
          ...(domainId === "hrx" ? {
            employee_id: "synthetic-employee-001",
            professional_profile: {
              experience: ["Synthetic prior role"],
              education: ["Synthetic law school"],
              qualifications: ["Synthetic qualification"],
              practice_areas: ["Synthetic client advisory"],
            },
          } : {}),
          ...(domainId === "master-data" ? { client_id: "synthetic-client-001", client_group_id: "synthetic-client-group-001" } : {}),
          ...(domainId === "matter" ? { matter_id: "synthetic-matter-001", matter_code: "SYN-2026-001" } : {}),
        },
        references: previous ? [{
          reference_name: "previous_foundation",
          target_domain_id: previous,
          target_record_type: previousType,
          target_record_id: `synthetic-${previous}-001`,
        }] : [],
      }],
      idempotency_entries: [{
        key: `synthetic-import:${domainId}`,
        operation: "json-postgres.synthetic-import",
        response: { accepted: true, synthetic_only: true },
      }],
      audit_events: [{
        event_id: `synthetic-import:${domainId}`,
        event_type: "json_postgres.synthetic_imported",
        actor_id: "synthetic-migration-operator",
        object_type: recordType,
        object_id: recordId,
        payload: { synthetic_only: true, imported_count: 1 },
      }],
    };
  });
  domains.find((domain) => domain.domain_id === "matter").records.push({
    record_type: "RejectedSyntheticMatter",
    record_id: "must-never-be-returned",
    payload: { api_key: "must-never-be-persisted-or-returned" },
  });
  return {
    schema_version: JSON_POSTGRES_MIGRATION_SCHEMA_VERSION,
    data_scope: "synthetic-only",
    tenant_id: TENANT,
    accounts: [{
      user_id: "synthetic-user-001",
      email: "synthetic.user@example.test",
      status: "active",
      profile: { display_name: "Synthetic User", source_title: "Synthetic Attorney", source_ref: "synthetic-corpus" },
      membership: {
        tenant_id: TENANT,
        status: "active",
        role_profile_id: "lawos_synthetic_staff",
        role_ids: ["lawos_staff"],
        group_ids: ["group_synthetic"],
        scopes: ["matter.read", "vault.read"],
        hrx_scopes: ["hrx.self.read"],
        source_ref: "synthetic-corpus-membership",
      },
    }],
    domains,
  };
}

test("JSON to PostgreSQL migration validates the full corpus without returning source values", async () => {
  const corpus = syntheticCorpus();
  const result = await runJsonPostgresMigration({ corpus, mode: "dry-run" });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.safe_counts.account_count, 1);
  assert.equal(result.safe_counts.domain_count, DOMAIN_IDS.length);
  assert.equal(result.safe_counts.source_record_count, DOMAIN_IDS.length + 1);
  assert.equal(result.safe_counts.accepted_record_count, DOMAIN_IDS.length);
  assert.equal(result.safe_counts.rejected_record_count, 1);
  assert.equal(result.safe_counts.rejected_item_count, 1);
  assert.deepEqual(result.rejected_reason_counts, { FORBIDDEN_SECRET_OR_RAW_BYTES: 1 });
  assert.equal(result.rejected_rows[0].record_type, "RejectedSyntheticMatter");
  assert.equal(result.rejected_rows[0].retryable, false);
  assert.equal(result.json_fallback_count, 0);
  assert.equal(result.json_writer_count, 0);
  assert.equal(result.dual_write_count, 0);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("must-never-be-persisted-or-returned"), false);
  assert.equal(serialized.includes("synthetic.user@example.test"), false);
  assert.equal(serialized.includes("Synthetic User"), false);
});

test("missing-reference rejection cascades and duplicate domain rows are rejected deterministically", async () => {
  const cascading = syntheticCorpus();
  cascading.domains[0].records[0].payload = { api_key: "forbidden-foundation" };
  const cascaded = await runJsonPostgresMigration({ corpus: cascading, mode: "dry-run" });
  assert.equal(cascaded.safe_counts.source_record_count, DOMAIN_IDS.length + 1);
  assert.equal(cascaded.safe_counts.accepted_record_count, 0);
  assert.equal(cascaded.safe_counts.rejected_record_count, DOMAIN_IDS.length + 1);
  assert.deepEqual(cascaded.rejected_reason_counts, {
    FORBIDDEN_SECRET_OR_RAW_BYTES: 2,
    MISSING_REFERENCE_TARGET: DOMAIN_IDS.length - 1,
  });

  const duplicate = syntheticCorpus();
  duplicate.domains.push({
    domain_id: "hrx",
    records: [{
      record_type: "DuplicateHrxDomainRecord",
      record_id: "duplicate-hrx-domain-001",
      payload: { synthetic_only: true },
    }],
  });
  const duplicated = await runJsonPostgresMigration({ corpus: duplicate, mode: "dry-run" });
  const hrx = duplicated.domains.find((domain) => domain.domain_id === "hrx");
  assert.equal(hrx.source_count, 2);
  assert.equal(hrx.accepted_count, 1);
  assert.equal(hrx.rejected_record_count, 1);
  assert.equal(duplicated.rejected_reason_counts.DUPLICATE_DOMAIN_ID, 1);
});

test("full synthetic import preserves versions, replays as no-op, and is hidden from another tenant", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const corpus = syntheticCorpus();
  const first = await runJsonPostgresMigration({
    pool: fixture.appPool,
    corpus,
    mode: "import",
    negativeTenantId: OTHER_TENANT,
  });
  assert.equal(first.outcome, "PASS");
  assert.equal(first.directory.replayed_noop_count, 1);
  assert.equal(first.directory.idempotency_count, 1);
  assert.equal(first.directory.audit_count, 1);
  assert.equal(first.directory.outbox_count, 1);
  assert.equal(first.directory.tenant_negative_visible_count, 0);
  assert.equal(first.safe_counts.tenant_negative_visible_count, 0);
  assert.equal(first.domains.every((domain) => domain.readback_equal === true), true);
  assert.equal(first.domains.every((domain) => domain.replayed_noop_count === domain.accepted_count), true);
  assert.deepEqual(first.domains.find((domain) => domain.domain_id === "matter").state_version_distribution, { "5": 1 });

  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const matter = await ledger.read({
    tenant_id: TENANT,
    domain_id: "matter",
    record_type: "SyntheticmatterRecord",
    record_id: "synthetic-matter-001",
  });
  assert.equal(matter.state_version, 5);
  assert.equal(matter.payload.matter_code, "SYN-2026-001");

  const hrx = await ledger.read({
    tenant_id: TENANT,
    domain_id: "hrx",
    record_type: "SynthetichrxRecord",
    record_id: "synthetic-hrx-001",
  });
  assert.deepEqual(hrx.payload.professional_profile, {
    experience: ["Synthetic prior role"],
    education: ["Synthetic law school"],
    qualifications: ["Synthetic qualification"],
    practice_areas: ["Synthetic client advisory"],
  });

  const repeated = await runJsonPostgresMigration({
    pool: fixture.appPool,
    corpus,
    mode: "import",
    negativeTenantId: OTHER_TENANT,
  });
  assert.equal(repeated.outcome, "PASS");
  assert.equal(repeated.invariant_hash, first.invariant_hash);
  assert.equal(repeated.directory.idempotency_count, first.directory.idempotency_count);
  assert.equal(repeated.directory.audit_count, first.directory.audit_count);
  assert.equal(repeated.directory.outbox_count, first.directory.outbox_count);
  assert.equal(repeated.domains.every((domain) => domain.replayed_noop_count === domain.accepted_count), true);
});

test("source-bound checkpoint resumes to the same invariant and rejects drift", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const corpus = syntheticCorpus();
  let checkpoint;
  await assert.rejects(
    runJsonPostgresMigration({
      pool: fixture.appPool,
      corpus,
      mode: "import",
      negativeTenantId: OTHER_TENANT,
      onCheckpoint: async (current) => {
        checkpoint = current;
        if (current.completed_steps.includes("domain:crm")) throw new Error("synthetic interruption");
      },
    }),
    /synthetic interruption/u,
  );
  assert.ok(checkpoint.completed_steps.includes("identity"));
  assert.ok(checkpoint.completed_steps.includes("domain:crm"));
  const resumed = await runJsonPostgresMigration({
    pool: fixture.appPool,
    corpus,
    mode: "resume",
    checkpoint,
    negativeTenantId: OTHER_TENANT,
  });
  assert.equal(resumed.outcome, "PASS");
  assert.equal(resumed.checkpoint.completed_steps.length, DOMAIN_IDS.length + 1);

  await assert.rejects(
    runJsonPostgresMigration({
      pool: fixture.appPool,
      corpus: { ...corpus, accounts: [...corpus.accounts, { user_id: "drift", email: "drift@example.test" }] },
      mode: "resume",
      checkpoint,
    }),
    (error) => error?.code === "LAWOS_MIGRATION_CHECKPOINT_DRIFT" && error?.status === 409,
  );
});

test("newer PostgreSQL state returns a safe 409 and is never overwritten", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const corpus = syntheticCorpus();
  await runJsonPostgresMigration({ pool: fixture.appPool, corpus, mode: "import", negativeTenantId: OTHER_TENANT });
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const current = await ledger.read({
    tenant_id: TENANT,
    domain_id: "matter",
    record_type: "SyntheticmatterRecord",
    record_id: "synthetic-matter-001",
  });
  await ledger.write({
    ...current,
    expected_version: current.state_version,
    payload: { ...current.payload, status: "newer-postgres-state" },
  });
  await assert.rejects(
    runJsonPostgresMigration({ pool: fixture.appPool, corpus, mode: "import", negativeTenantId: OTHER_TENANT }),
    (error) => error?.safe_error_code === "DOMAIN_IMPORT_CONFLICT" && error?.status === 409,
  );
  const preserved = await ledger.read({
    tenant_id: TENANT,
    domain_id: "matter",
    record_type: "SyntheticmatterRecord",
    record_id: "synthetic-matter-001",
  });
  assert.equal(preserved.payload.status, "newer-postgres-state");
  assert.equal(preserved.state_version, current.state_version + 1);
});
