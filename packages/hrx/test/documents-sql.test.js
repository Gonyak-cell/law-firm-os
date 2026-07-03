import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqlHrxDocumentStore } from "../src/documents.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

function setup() {
  const store = createFileHrxStore({ filePath: join(mkdtempSync(join(tmpdir(), "hrx-documents-sql-")), "store.json") });
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store });
  repository.createEmployee({ tenant_id: "tenant-a", employee_id: "emp-001", display_name: "Ari Kim", status: "active" });
  return { store, documents: createSqlHrxDocumentStore({ store }) };
}

test("SQL HR document store persists metadata only", () => {
  const { store, documents } = setup();
  const created = documents.create({
    tenant_id: "tenant-a",
    document_id: "doc-001",
    employee_id: "emp-001",
    document_type: "policy_ack",
    source_ref: "DMS:doc-001",
    source_provider: "dms",
    source_status: "verified",
    source_verified_at: "2026-06-20T00:00:00.000Z",
    source_version_ref: "DMS:v1",
    source_metadata: { provider_document_id: "doc-001", etag_present: true },
    title: "Policy acknowledgement",
  });
  assert.equal(created.document_body_included, false);
  assert.equal(created.source_status, "verified");
  assert.equal(created.source_metadata.provider_document_id, "doc-001");
  assert.equal(documents.get({ tenant_id: "tenant-a", document_id: "doc-001" }).source_ref, "DMS:doc-001");
  assert.equal(documents.list({ tenant_id: "tenant-a", employee_id: "emp-001" }).length, 1);

  const contract = documents.create({
    tenant_id: "tenant-a",
    document_id: "doc-contract-001",
    employee_id: "emp-001",
    document_type: "employment_contract",
    source_ref: "DMS:contract-001",
    source_provider: "dms",
    source_status: "verified",
    source_metadata: { provider_document_id: "contract-001" },
    contract_id: "contract-001",
    profile_id: "profile-001",
    expires_on: "2026-07-20",
  });
  assert.equal(contract.contract_state, "draft");
  const signed = documents.transitionContract(
    { tenant_id: "tenant-a", document_id: "doc-contract-001" },
    { state: "signed", signature_ref: "signature:contract-001", signed_at: "2026-07-02T00:00:00.000Z" },
  );
  assert.equal(signed.contract_state, "signed");
  assert.equal(signed.signature_ref, "signature:contract-001");
  assert.equal(documents.listExpiring({ tenant_id: "tenant-a", as_of: "2026-07-02", days: 30 }).length, 1);
  const expired = documents.transitionContract(
    { tenant_id: "tenant-a", document_id: "doc-contract-001" },
    { state: "expired", expired_at: "2026-07-21T00:00:00.000Z" },
  );
  assert.equal(expired.contract_state, "expired");
  assert.equal(documents.listExpiring({ tenant_id: "tenant-a", as_of: "2026-07-02", days: 30 }).length, 0);
  assert.throws(
    () =>
      documents.create({
        tenant_id: "tenant-a",
        document_id: "doc-002",
        employee_id: "emp-001",
        document_type: "contract",
        source_ref: "DMS:doc-002",
        body: "blocked",
      }),
    /must not include body/,
  );
  store.close();
});
