import assert from "node:assert/strict";
import test from "node:test";
import { createCompensationRecordMetadata, createInMemoryCompensationRecordStore, createSqlCompensationRecordStore } from "../src/compensation.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

test("compensation metadata stores encrypted amount refs only", () => {
  const record = createCompensationRecordMetadata({
    tenant_id: "tenant-a",
    compensation_id: "comp-001",
    employee_id: "emp-001",
    encrypted_amount_ref: "vault://amount-001",
    effective_from: "2026-06-19",
    source_ref: "hris://comp-001",
    employment_contract_id: "contract-001",
    contract_document_ref: "DMS:contract-001",
  });
  assert.equal(record.encrypted_amount_ref, "vault://amount-001");
  assert.equal(record.employment_contract_id, "contract-001");
  assert.equal(record.contract_document_ref, "DMS:contract-001");
  assert.equal(record.raw_amount_included, false);
});

test("compensation metadata rejects raw amount fields", () => {
  assert.throws(
    () =>
      createCompensationRecordMetadata({
        tenant_id: "tenant-a",
        compensation_id: "comp-001",
        employee_id: "emp-001",
        encrypted_amount_ref: "vault://amount-001",
        amount: 100,
        effective_from: "2026-06-19",
        source_ref: "hris://comp-001",
        employment_contract_id: "contract-001",
        contract_document_ref: "DMS:contract-001",
      }),
    /must not include raw amount/,
  );
});

test("compensation stores expose masked refs and preserve latest effective record", () => {
  const store = createInMemoryCompensationRecordStore([
    {
      tenant_id: "tenant-a",
      compensation_id: "comp-001",
      employee_id: "emp-001",
      encrypted_amount_ref: "local-kms://comp/001",
      effective_from: "2026-01-01",
      source_ref: "HRX:comp:001",
      employment_contract_id: "contract-001",
      contract_document_ref: "DMS:contract-001",
    },
    {
      tenant_id: "tenant-a",
      compensation_id: "comp-002",
      employee_id: "emp-001",
      encrypted_amount_ref: "local-kms://comp/002",
      effective_from: "2026-07-01",
      source_ref: "HRX:comp:002",
      employment_contract_id: "contract-002",
      contract_document_ref: "DMS:contract-002",
    },
  ]);
  assert.equal(store.latest({ tenant_id: "tenant-a", employee_id: "emp-001" }).compensation_id, "comp-002");
  const [visible] = store.visible({ tenant_id: "tenant-a", employee_id: "emp-001" });
  assert.equal(visible.masked_compensation_ref, "local-kms://comp/002");
  assert.equal(Object.hasOwn(visible, "encrypted_amount_ref"), false);
  assert.equal(visible.raw_amount_included, false);
});

test("SQL compensation store persists encrypted refs without raw amounts", () => {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store });
  repository.createEmployee({ tenant_id: "tenant-a", employee_id: "emp-001", display_name: "Ari Kim", status: "active" });
  const compensation = createSqlCompensationRecordStore({ store });
  compensation.create({
    tenant_id: "tenant-a",
    compensation_id: "comp-sql-001",
    employee_id: "emp-001",
    encrypted_amount_ref: "local-kms://comp/sql-001",
    effective_from: "2026-07-01",
    source_ref: "HRX:comp:sql-001",
    employment_contract_id: "contract-sql-001",
    contract_document_ref: "DMS:contract-sql-001",
  });
  assert.equal(compensation.latest({ tenant_id: "tenant-a", employee_id: "emp-001" }).encrypted_amount_ref, "local-kms://comp/sql-001");
  assert.equal(compensation.visible({ tenant_id: "tenant-a", employee_id: "emp-001" })[0].masked_compensation_ref, "local-kms://comp/sql-001");
  assert.throws(
    () =>
      compensation.create({
        tenant_id: "tenant-a",
        compensation_id: "comp-sql-raw",
        employee_id: "emp-001",
        encrypted_amount_ref: "local-kms://comp/raw",
        effective_from: "2026-07-01",
        source_ref: "HRX:comp:raw",
        employment_contract_id: "contract-sql-raw",
        contract_document_ref: "DMS:contract-sql-raw",
        salary: 100,
      }),
    /must not include raw salary/,
  );
  store.close();
});
