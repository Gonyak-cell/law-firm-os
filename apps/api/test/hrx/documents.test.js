import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createHrxDocumentsRoute } from "../../src/routes/hrx/documents.js";
import { createInMemoryHrxDocumentSourceAdapter } from "../../../../packages/hrx/src/documents/source-adapter.js";

function sourceAdapter() {
  return createInMemoryHrxDocumentSourceAdapter([
    {
      tenant_id: "tenant-a",
      source_ref: "dms://doc-001",
      source_provider: "dms",
      source_verified_at: "2026-06-20T00:00:00.000Z",
      source_version_ref: "dms-version-001",
      source_metadata: { provider_document_id: "doc-001", etag_present: true },
    },
  ]);
}

test("HRX documents route stores source_ref metadata without body", async () => {
  const audit = createHrxAuditEventStore();
  const route = createHrxDocumentsRoute({ audit, sourceAdapter: sourceAdapter() });
  const context = { tenant_id: "tenant-a", actor_id: "user-a" };
  const created = await route.handle({
    method: "POST",
    context,
    body: {
      document_id: "doc-001",
      employee_id: "emp-001",
      document_type: "employment_contract",
      source_ref: "dms://doc-001",
      title: "Employment Contract",
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.document.source_ref, "dms://doc-001");
  assert.equal(created.body.document.source_provider, "dms");
  assert.equal(created.body.document.source_status, "verified");
  assert.equal(created.body.document.source_version_ref, "dms-version-001");
  assert.equal(created.body.document.document_body_included, false);
  assert.equal(Object.hasOwn(created.body.document, "body"), false);
  assert.equal(audit.list({ tenant_id: "tenant-a" }).length, 1);

  const read = await route.handle({ method: "GET", context, params: { document_id: "doc-001" } });
  assert.equal(read.status, 200);
  assert.equal(read.body.document.document_id, "doc-001");
});

test("HRX documents route rejects document body leakage", async () => {
  const route = createHrxDocumentsRoute({ audit: createHrxAuditEventStore(), sourceAdapter: sourceAdapter() });
  const response = await route.handle({
    method: "POST",
    context: { tenant_id: "tenant-a", actor_id: "user-a" },
    body: {
      document_id: "doc-001",
      employee_id: "emp-001",
      document_type: "employment_contract",
      source_ref: "dms://doc-001",
      body: "secret",
    },
  });
  assert.equal(response.status, 400);
  assert.match(response.body.reason, /must not include body/);
});

test("HRX documents route rejects unverified source refs", async () => {
  const route = createHrxDocumentsRoute({ audit: createHrxAuditEventStore(), sourceAdapter: sourceAdapter() });
  const response = await route.handle({
    method: "POST",
    context: { tenant_id: "tenant-a", actor_id: "user-a" },
    body: {
      document_id: "doc-missing",
      employee_id: "emp-001",
      document_type: "employment_contract",
      source_ref: "dms://missing",
    },
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.safe_error_code, "HRX_DOCUMENT_SOURCE_UNVERIFIED");
  assert.match(response.body.reason, /not verified/);
});
