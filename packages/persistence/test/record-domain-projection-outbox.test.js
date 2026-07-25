import assert from "node:assert/strict";
import test from "node:test";
import {
  createDomainSnapshot,
} from "../src/domain-ledger.js";
import {
  flushDomainSnapshotToScopedLedger,
} from "../src/record-domain-adapter.js";

test("HRX domain outbox identifies only deterministically changed projection records", async () => {
  const tenantId = "tenant_projection_outbox_synthetic";
  const source = createDomainSnapshot({
    tenant_id: tenantId,
    domain_id: "hrx",
    records: [
      {
        tenant_id: tenantId,
        domain_id: "hrx",
        record_type: "hrx_employment_profiles",
        record_id: "profile-001",
        payload: {
          tenant_id: tenantId,
          employment_profile_id: "profile-001",
          employee_id: "employee-001",
        },
      },
      {
        tenant_id: tenantId,
        domain_id: "hrx",
        record_type: "hrx_employees",
        record_id: "employee-001",
        payload: {
          tenant_id: tenantId,
          employee_id: "employee-001",
          status: "active",
        },
      },
    ],
    idempotency_entries: [{
      tenant_id: tenantId,
      domain_id: "hrx",
      key: "projection-outbox-write-001",
      request_hash: "1".repeat(64),
      response: { outcome: "created" },
    }],
    audit_events: [{
      tenant_id: tenantId,
      domain_id: "hrx",
      event_id: "projection-outbox-audit-001",
      event_type: "hrx.synthetic.created",
      object_type: "SyntheticHrxAggregate",
      object_id: "aggregate-001",
      payload: { changed_count: 2 },
      created_at: "2026-07-25T00:00:00.000Z",
    }],
  });
  const records = [];
  const idempotency = [];
  const audit = [];
  const outbox = [];
  const tx = {
    list: async () => records,
    listIdempotency: async () => idempotency,
    listAudit: async () => audit,
    write: async (record) => {
      records.push({ ...record, state_version: 1 });
    },
    addReferences: async () => {},
    claimIdempotency: async (entry) => {
      idempotency.push(entry);
      return { replayed: false };
    },
    appendAudit: async (event) => {
      audit.push(event);
    },
    enqueueOutbox: async (event) => {
      outbox.push(event);
    },
  };
  const result = await flushDomainSnapshotToScopedLedger({
    tx,
    source,
    tenant_id: tenantId,
    domain_id: "hrx",
  });
  assert.equal(result.equal, true);
  assert.deepEqual(outbox[0].payload.projection_records, [
    {
      record_type: "hrx_employees",
      record_id: "employee-001",
    },
    {
      record_type: "hrx_employment_profiles",
      record_id: "profile-001",
    },
  ]);
  assert.equal(
    Object.values(outbox[0].payload).some((value) =>
      JSON.stringify(value).includes("status")),
    false,
  );
});
