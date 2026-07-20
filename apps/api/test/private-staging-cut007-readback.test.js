import assert from "node:assert/strict";
import test from "node:test";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import { buildPrivateStagingSyntheticSources } from "../../../scripts/lib/private-staging-artifact.mjs";
import { runPrivateStagingCut007Readback } from "../src/private-staging-cut007-readback.js";
import { runPrivateStagingSyntheticBaseline } from "../src/private-staging-synthetic-baseline.js";

const PRIMARY = "tenant_lawos_staging_cut007_a";
const NEGATIVE = "tenant_lawos_staging_cut007_b";
const USER_IDS = ["synthetic-lawos-staging-admin", "synthetic-lawos-staging-attorney", "synthetic-lawos-staging-disabled"];
const EMPLOYEE_IDS = ["emp-lawos-staging-admin", "emp-lawos-staging-attorney", "emp-lawos-staging-disabled"];
const MATTER_ID = "matter-cut007-readback-001";
const DOCUMENT_IDS = ["document-cut007-readback-001", "document-cut007-readback-002"];
const FINANCE_ID = "time-cut007-readback-001";
const PORTAL_ID = "dashboard-cut007-readback-001";

function syntheticSources() {
  return buildPrivateStagingSyntheticSources({
    schema_version: "law-firm-os.private-staging.synthetic-account-directory.v1",
    data_scope: "synthetic-only",
    real_identity_count: 0,
    accounts_approved: true,
    tenant_id: PRIMARY,
    accounts: [
      { user_id: USER_IDS[0], employee_id: EMPLOYEE_IDS[0], email: "lawos-staging-admin@example.test", display_name: "LawOS Staging Pilot ADMIN", account_status: "active", role_ids: ["firm_admin", "matter_vault_admin"] },
      { user_id: USER_IDS[1], employee_id: EMPLOYEE_IDS[1], email: "lawos-staging-attorney@example.test", display_name: "LawOS Staging Pilot ATTORNEY", account_status: "active", role_ids: ["attorney", "matter_vault_user"] },
      { user_id: USER_IDS[2], employee_id: EMPLOYEE_IDS[2], email: "lawos-staging-disabled@example.test", display_name: "LawOS Staging Pilot DISABLED", account_status: "disabled", role_ids: ["matter_vault_user"] },
    ],
  });
}

async function writeDomainProbe(ledger, domainId, recordId, payload, recordType = `Cut007${domainId}`) {
  await ledger.transaction({ tenant_id: PRIMARY, domain_id: domainId }, async (tx) => {
    await tx.write({ expected_version: 0, record_type: recordType, record_id: recordId, payload: { ...payload, synthetic_only: true } });
    await tx.claimIdempotency({ key: `cut007:${domainId}:${recordId}`, request_hash: "a".repeat(64), response: { accepted: true } });
    await tx.appendAudit({ event_id: `audit:${domainId}:${recordId}`, event_type: "cut007.synthetic.created", object_type: "Cut007Probe", object_id: recordId, payload: { synthetic_only: true } });
    await tx.enqueueOutbox({ event_id: `outbox:${domainId}:${recordId}`, topic: `cut007.${domainId}.created`, aggregate_type: "Cut007Probe", aggregate_id: recordId, payload: { synthetic_only: true } });
  });
}

async function insertDmsReadbackFixture(pool) {
  await withPostgresTransaction(pool, { tenant_id: PRIMARY }, async (client) => {
    for (const [index, documentId] of DOCUMENT_IDS.entries()) {
      const versionId = `version-cut007-readback-00${index + 1}`;
      const fileObjectId = `file-cut007-readback-00${index + 1}`;
      const objectId = `object:${versionId}`;
      await client.query(
        `INSERT INTO lawos_dms.documents
           (tenant_id, document_id, matter_id, workspace_id, title, current_version_id, permission_envelope_id, audit_trace_id, legal_hold_status)
         VALUES ($1, $2, $3, 'workspace-cut007-readback', 'Synthetic CUT-007 document', $4, 'permission-cut007', 'audit-trace-cut007', $5)`,
        [PRIMARY, documentId, MATTER_ID, versionId, index === 0 ? "active" : "none"],
      );
      await client.query(
        `INSERT INTO lawos_dms.file_objects
           (tenant_id, file_object_id, object_id, adapter_id, storage_pointer_ref, sha256, byte_size, content_type, status)
         VALUES ($1, $2, $3, 's3-cut007', $4, $5, 32, 'text/plain', 'committed')`,
        [PRIMARY, fileObjectId, objectId, `provider-ref:${index + 1}`, String(index + 1).repeat(64)],
      );
      await client.query(
        `INSERT INTO lawos_dms.document_versions
           (tenant_id, version_id, document_id, version_number, file_object_id, sha256, created_by)
         VALUES ($1, $2, $3, 1, $4, $5, $6)`,
        [PRIMARY, versionId, documentId, fileObjectId, String(index + 1).repeat(64), USER_IDS[0]],
      );
      await client.query(
        `INSERT INTO lawos_dms.audit_events
           (tenant_id, event_id, event_type, actor_id, object_type, object_id, payload)
         VALUES ($1, $2, 'dms.document.metadata_committed', $3, 'DmsDocument', $4, '{"synthetic_only":true}'::jsonb)`,
        [PRIMARY, `audit-dms-cut007-${index + 1}`, USER_IDS[0], documentId],
      );
      await client.query(
        `INSERT INTO lawos_dms.outbox_events
           (tenant_id, event_id, event_type, aggregate_type, aggregate_id, payload)
         VALUES ($1, $2, 'dms.document.metadata_committed', 'DmsDocument', $3, '{"synthetic_only":true}'::jsonb)`,
        [PRIMARY, `outbox-dms-cut007-${index + 1}`, documentId],
      );
    }
    await client.query(
      `INSERT INTO lawos_dms.legal_holds
         (tenant_id, legal_hold_id, document_id, object_id, status, reason_hash, created_by)
       VALUES ($1, 'hold-cut007-readback-001', $2, 'object:version-cut007-readback-001', 'active', $3, $4)`,
      [PRIMARY, DOCUMENT_IDS[0], "b".repeat(64), USER_IDS[0]],
    );
    await client.query(
      `INSERT INTO lawos_dms.retention_policies
         (tenant_id, retention_policy_id, document_id, object_id, retain_until)
       VALUES ($1, 'retention-cut007-readback-001', $2, 'object:version-cut007-readback-001', '2026-08-31T00:00:00.000Z')`,
      [PRIMARY, DOCUMENT_IDS[0]],
    );
  });
}

test("CUT-007 readback proves PostgreSQL professional profiles, user linkage, product records, DMS governance, audit/outbox, and tenant isolation", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const sources = syntheticSources();
  await runPrivateStagingSyntheticBaseline({
    pool: fixture.appPool,
    tenantIds: [PRIMARY, NEGATIVE],
    accountSeed: sources.account_seed,
    roster: sources.roster,
  });
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  await writeDomainProbe(ledger, "matter", MATTER_ID, { matter_id: MATTER_ID, matter_code: "LawOS-Staging/Advisory/CUT007" }, "Matter");
  await writeDomainProbe(ledger, "finance", FINANCE_ID, { time_entry_id: FINANCE_ID, matter_id: MATTER_ID });
  await writeDomainProbe(ledger, "client-portal", PORTAL_ID, { dashboard_projection_id: PORTAL_ID, matter_id: MATTER_ID });
  await insertDmsReadbackFixture(fixture.appPool);

  const result = await runPrivateStagingCut007Readback({
    pool: fixture.appPool,
    tenantIds: [PRIMARY, NEGATIVE],
    runId: "cut007-readback-test",
    expected: {
      user_ids: USER_IDS,
      employee_ids: EMPLOYEE_IDS,
      matter_id: MATTER_ID,
      document_ids: DOCUMENT_IDS,
      finance_record_id: FINANCE_ID,
      portal_record_id: PORTAL_ID,
    },
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.safe_counts.professional_profile_count, 3);
  assert.equal(result.safe_counts.employee_user_link_count, 3);
  assert.equal(result.safe_counts.dms_committed_digest_match_count, 2);
  assert.equal(result.safe_counts.dms_active_legal_hold_count, 1);
  assert.equal(result.safe_counts.dms_retention_policy_count, 1);
  assert.equal(result.safe_counts.wrong_tenant_visible_count, 0);
  assert.equal(result.json_writer_count, 0);
  assert.equal(result.dual_write_count, 0);
  assert.equal(result.secret_material_returned, false);
});

test("CUT-007 readback rejects identifiers outside the approved synthetic namespace", async () => {
  await assert.rejects(
    runPrivateStagingCut007Readback({
      pool: { connect() {} },
      tenantIds: [PRIMARY, "tenant-real"],
      runId: "cut007-invalid-test",
      expected: {},
    }),
    /synthetic CUT-007 namespace/u,
  );
});
