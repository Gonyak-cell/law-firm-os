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
    title: "Policy acknowledgement",
  });
  assert.equal(created.document_body_included, false);
  assert.equal(documents.get({ tenant_id: "tenant-a", document_id: "doc-001" }).source_ref, "DMS:doc-001");
  assert.equal(documents.list({ tenant_id: "tenant-a", employee_id: "emp-001" }).length, 1);
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
