import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPENSATION_ENVELOPE_PREFIX,
  createCompensationRecordMetadata,
  createInMemoryCompensationRecordStore,
  createSqlCompensationRecordStore,
  decryptCompensationAmountRef,
  encryptCompensationAmount,
  maskCompensationRef,
} from "../src/compensation.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TEST_KEY = "hrx-compensation-test-key";

function encryptedRef(overrides = {}, options = {}) {
  return encryptCompensationAmount(
    {
      tenant_id: "tenant-a",
      compensation_id: "comp-001",
      employee_id: "emp-001",
      amount_minor: 12345678,
      currency_ref: "Currency:KRW",
      ...overrides,
    },
    { keyMaterial: TEST_KEY, iv: options.iv ?? Buffer.alloc(12, 1) },
  );
}

test("compensation metadata stores encrypted amount refs only", () => {
  const encrypted_amount_ref = encryptedRef();
  const record = createCompensationRecordMetadata({
    tenant_id: "tenant-a",
    compensation_id: "comp-001",
    employee_id: "emp-001",
    encrypted_amount_ref,
    effective_from: "2026-06-19",
    source_ref: "hris://comp-001",
    employment_contract_id: "contract-001",
    contract_document_ref: "DMS:contract-001",
  });
  assert.match(record.encrypted_amount_ref, new RegExp(`^${COMPENSATION_ENVELOPE_PREFIX}`));
  assert.equal(record.employment_contract_id, "contract-001");
  assert.equal(record.contract_document_ref, "DMS:contract-001");
  assert.equal(record.raw_amount_included, false);
});

test("compensation amount envelopes decrypt only with the bound record context", () => {
  const encrypted_amount_ref = encryptedRef();
  const decrypted = decryptCompensationAmountRef(
    encrypted_amount_ref,
    { tenant_id: "tenant-a", compensation_id: "comp-001", employee_id: "emp-001" },
    { keyMaterial: TEST_KEY },
  );
  assert.equal(decrypted.amount_minor, 12345678);
  assert.equal(decrypted.currency_ref, "Currency:KRW");
  assert.match(decrypted.key_ref, /^lawos-key:/);
  assert.throws(
    () =>
      decryptCompensationAmountRef(
        encrypted_amount_ref,
        { tenant_id: "tenant-a", compensation_id: "comp-001", employee_id: "emp-other" },
        { keyMaterial: TEST_KEY },
      ),
    /context mismatch/,
  );
});

test("compensation encryption has no implicit default key", () => {
  const previous = process.env.LAWOS_HRX_COMPENSATION_ENCRYPTION_KEY;
  delete process.env.LAWOS_HRX_COMPENSATION_ENCRYPTION_KEY;
  try {
    assert.throws(
      () => encryptCompensationAmount({
        tenant_id: "tenant-a",
        compensation_id: "comp-no-key",
        employee_id: "emp-001",
        amount_minor: 1,
      }),
      /requires injected key material/,
    );
    assert.match(
      encryptCompensationAmount({
        tenant_id: "tenant-a",
        compensation_id: "comp-synthetic",
        employee_id: "emp-001",
        amount_minor: 1,
      }, { allowSyntheticKey: true, iv: Buffer.alloc(12, 9) }),
      new RegExp(`^${COMPENSATION_ENVELOPE_PREFIX}`),
    );
  } finally {
    if (previous === undefined) delete process.env.LAWOS_HRX_COMPENSATION_ENCRYPTION_KEY;
    else process.env.LAWOS_HRX_COMPENSATION_ENCRYPTION_KEY = previous;
  }
});

test("compensation metadata rejects raw amount fields", () => {
  assert.throws(
    () =>
      createCompensationRecordMetadata({
        tenant_id: "tenant-a",
        compensation_id: "comp-001",
        employee_id: "emp-001",
        encrypted_amount_ref: encryptedRef(),
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
  const encryptedAmountRef1 = encryptedRef({ compensation_id: "comp-001" }, { iv: Buffer.alloc(12, 1) });
  const encryptedAmountRef2 = encryptedRef({ compensation_id: "comp-002" }, { iv: Buffer.alloc(12, 2) });
  const store = createInMemoryCompensationRecordStore([
    {
      tenant_id: "tenant-a",
      compensation_id: "comp-001",
      employee_id: "emp-001",
      encrypted_amount_ref: encryptedAmountRef1,
      effective_from: "2026-01-01",
      source_ref: "HRX:comp:001",
      employment_contract_id: "contract-001",
      contract_document_ref: "DMS:contract-001",
    },
    {
      tenant_id: "tenant-a",
      compensation_id: "comp-002",
      employee_id: "emp-001",
      encrypted_amount_ref: encryptedAmountRef2,
      effective_from: "2026-07-01",
      source_ref: "HRX:comp:002",
      employment_contract_id: "contract-002",
      contract_document_ref: "DMS:contract-002",
    },
  ]);
  assert.equal(store.latest({ tenant_id: "tenant-a", employee_id: "emp-001" }).compensation_id, "comp-002");
  const [visible] = store.visible({ tenant_id: "tenant-a", employee_id: "emp-001" });
  assert.equal(visible.masked_compensation_ref, maskCompensationRef(encryptedAmountRef2));
  assert.equal(Object.hasOwn(visible, "encrypted_amount_ref"), false);
  assert.equal(visible.encrypted_amount_ref_included, false);
  assert.equal(JSON.stringify(visible).includes(COMPENSATION_ENVELOPE_PREFIX), false);
  assert.equal(visible.raw_amount_included, false);
});

test("SQL compensation store persists encrypted refs without raw amounts", () => {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store });
  repository.createEmployee({ tenant_id: "tenant-a", employee_id: "emp-001", display_name: "Ari Kim", status: "active" });
  const compensation = createSqlCompensationRecordStore({ store });
  const encryptedAmountRef = encryptedRef({ compensation_id: "comp-sql-001" }, { iv: Buffer.alloc(12, 3) });
  compensation.create({
    tenant_id: "tenant-a",
    compensation_id: "comp-sql-001",
    employee_id: "emp-001",
    encrypted_amount_ref: encryptedAmountRef,
    effective_from: "2026-07-01",
    source_ref: "HRX:comp:sql-001",
    employment_contract_id: "contract-sql-001",
    contract_document_ref: "DMS:contract-sql-001",
  });
  assert.equal(compensation.latest({ tenant_id: "tenant-a", employee_id: "emp-001" }).encrypted_amount_ref, encryptedAmountRef);
  assert.equal(compensation.visible({ tenant_id: "tenant-a", employee_id: "emp-001" })[0].masked_compensation_ref, maskCompensationRef(encryptedAmountRef));
  assert.throws(
    () =>
      compensation.create({
        tenant_id: "tenant-a",
        compensation_id: "comp-sql-raw",
        employee_id: "emp-001",
        encrypted_amount_ref: encryptedRef({ compensation_id: "comp-sql-raw" }, { iv: Buffer.alloc(12, 4) }),
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
