import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { encryptCompensationAmount } from "../src/compensation.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlPayrollItemCatalog } from "../src/payroll-item-catalog.js";
import { createSqlPayrollProfileService } from "../src/payroll-profile-service.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const NOW = "2026-07-14T00:00:00.000Z";

function createFixture(filePath) {
  const store = createFileHrxStore(filePath ? { filePath } : undefined);
  runHrxMigrations(store);
  createSqlHrxRepository({ store, clock: () => NOW }).createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-a",
    display_name: "Synthetic employee",
    status: "active",
  });
  store.query("insert", {
    table: "hrx_compensation_records",
    row: {
      tenant_id: "tenant-a",
      compensation_id: "profile-a",
      employee_id: "emp-a",
      encrypted_amount_ref: encryptCompensationAmount({ tenant_id: "tenant-a", employee_id: "emp-a", compensation_id: "profile-a", amount_minor: 3_000_000, currency_ref: "KRW" }, { keyMaterial: "synthetic-payroll-profile-key" }),
      currency_ref: "KRW",
      raw_amount_included: false,
      effective_from: "2026-01-01",
      effective_to: null,
      source_ref: "artifact:synthetic-compensation/profile-a",
      employment_contract_id: "contract-profile-a",
      contract_document_ref: "artifact:contract/profile-a",
      created_at: NOW,
      updated_at: NOW,
    },
  });
  createSqlPayrollItemCatalog({ store, clock: () => NOW }).create(
    { tenant_id: "tenant-a", actor_id: "hr-001" },
    {
      item_id: "base-a",
      code: "BASE_SALARY",
      display_name: "기본급",
      kind: "earning",
      tax_treatment: "taxable",
      value_mode: "fixed",
      calculation_order: 10,
      effective_from: "2026-01-01",
    },
  );
  const service = createSqlPayrollProfileService({
    store,
    clock: () => NOW,
    encryptionOptions: { keyMaterial: "synthetic-payroll-profile-key" },
  });
  const actor = { tenant_id: "tenant-a", actor_id: "hr-001" };
  service.createProfile(actor, {
    payroll_profile_id: "profile-a",
    employee_id: "emp-a",
    employment_type: "monthly",
    pay_group_code: "KR-MONTHLY",
    compensation_ref: "compensation:profile-a",
    deduction_input: {
      dependent_count: 0,
      income_tax_exempt: false,
      withholding_category: null,
      pension: { enrolled: false },
      health: { enrolled: false },
      employment_insurance: { enrolled: false },
    },
    effective_from: "2026-01-01",
  });
  return { store, service, actor };
}

test("Forest payroll profile stays mutable while item assignments are append-only and masked", () => {
  const { store, service, actor } = createFixture();
  const updated = service.updateProfile(actor, {
    payroll_profile_id: "profile-a",
    expected_version: 1,
    pay_group_code: "KR-MONTHLY-UPDATED",
  });
  assert.equal(updated.state_version, 2);
  const assignment = service.createAssignment(actor, "profile-a", {
    assignment_id: "assignment-a-v1",
    item_id: "base-a",
    version: 1,
    amount_minor: 12_345_678,
    effective_from: "2026-01-01",
    source_ref: "HRX:payroll-assignment:a:v1",
  });
  assert.match(assignment.masked_compensation_ref, /^compensation_ref_hash:[a-f0-9]{24}$/);
  assert.equal(Object.hasOwn(assignment, "encrypted_amount_ref"), false);
  assert.equal(assignment.raw_amount_included, false);
  assert.throws(
    () => store.query("updateOne", {
      table: "hrx_payroll_item_assignments",
      where: { tenant_id: "tenant-a", assignment_id: "assignment-a-v1" },
      patch: { status: "inactive" },
    }),
    /append-only/,
  );
  store.close();
});

test("assignment periods, currency, tenant, and raw amount boundaries fail closed", () => {
  const { store, service, actor } = createFixture();
  service.createAssignment(actor, "profile-a", {
    assignment_id: "assignment-a-v1",
    item_id: "base-a",
    version: 1,
    amount_minor: 1_000_000,
    effective_from: "2026-01-01",
    effective_to: "2026-06-30",
    source_ref: "HRX:payroll-assignment:a:v1",
  });
  assert.throws(
    () => service.createAssignment(actor, "profile-a", {
      assignment_id: "overlap",
      item_id: "base-a",
      version: 2,
      amount_minor: 2_000_000,
      effective_from: "2026-06-30",
      source_ref: "HRX:payroll-assignment:a:v2",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_ASSIGNMENT_PERIOD_OVERLAP",
  );
  assert.throws(
    () => service.createAssignment(actor, "profile-a", {
      assignment_id: "wrong-currency",
      item_id: "base-a",
      version: 3,
      amount_minor: 2_000_000,
      currency_ref: "Currency:USD",
      effective_from: "2026-07-01",
      source_ref: "HRX:payroll-assignment:a:v3",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_ASSIGNMENT_CURRENCY_MISMATCH",
  );
  assert.throws(
    () => service.getProfile({ tenant_id: "tenant-b", actor_id: "hr-b" }, "profile-a"),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROFILE_NOT_FOUND",
  );
  store.close();
});

test("profile creation requires an existing same-employee compensation record and explicit deduction input", () => {
  const { store, service, actor } = createFixture();
  createSqlHrxRepository({ store, clock: () => NOW }).createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-b",
    display_name: "Other synthetic employee",
    status: "active",
  });
  store.query("insert", {
    table: "hrx_compensation_records",
    row: {
      tenant_id: "tenant-a",
      compensation_id: "other-employee",
      employee_id: "emp-b",
      encrypted_amount_ref: encryptCompensationAmount({ tenant_id: "tenant-a", employee_id: "emp-b", compensation_id: "other-employee", amount_minor: 3_200_000, currency_ref: "KRW" }, { keyMaterial: "synthetic-payroll-profile-key" }),
      currency_ref: "KRW",
      raw_amount_included: false,
      effective_from: "2026-01-01",
      effective_to: null,
      source_ref: "artifact:synthetic-compensation/other-employee",
      employment_contract_id: "contract-other-employee",
      contract_document_ref: "artifact:contract/other-employee",
      created_at: NOW,
      updated_at: NOW,
    },
  });
  const base = {
    employment_type: "monthly",
    pay_group_code: "KR-MONTHLY",
    effective_from: "2026-02-01",
    deduction_input: {
      dependent_count: 0,
      income_tax_exempt: false,
      withholding_category: null,
      pension: { enrolled: false },
      health: { enrolled: false },
      employment_insurance: { enrolled: false },
    },
  };
  assert.throws(
    () => service.createProfile(actor, { ...base, payroll_profile_id: "profile-missing", employee_id: "emp-a", compensation_ref: "compensation:not-found" }),
    (error) => error.safe_error_code === "HRX_PAYROLL_COMPENSATION_RECORD_MISSING",
  );
  assert.throws(
    () => service.createProfile(actor, { ...base, payroll_profile_id: "profile-invalid-employee", employee_id: "emp-a", compensation_ref: "compensation:other-employee" }),
    (error) => error.safe_error_code === "HRX_PAYROLL_COMPENSATION_EMPLOYEE_MISMATCH",
  );
  assert.throws(
    () => service.createProfile(actor, { ...base, payroll_profile_id: "profile-no-deductions", employee_id: "emp-a", compensation_ref: "compensation:profile-a", deduction_input: undefined }),
    (error) => error.safe_error_code === "HRX_PAYROLL_DEDUCTION_INPUT_REQUIRED",
  );
  assert.throws(
    () => service.createProfile(actor, { ...base, payroll_profile_id: "profile-incomplete-deductions", employee_id: "emp-a", compensation_ref: "compensation:profile-a", deduction_input: { dependent_count: 0 } }),
    (error) => error.safe_error_code === "HRX_PAYROLL_DEDUCTION_INPUT_INVALID",
  );
  store.close();
});

test("profile compensation binding must cover the complete effective payroll period", () => {
  const { store, service, actor } = createFixture();
  const base = {
    employment_type: "monthly",
    pay_group_code: "KR-MONTHLY",
    compensation_ref: "compensation:profile-a",
    deduction_input: {
      dependent_count: 0,
      income_tax_exempt: false,
      withholding_category: null,
      pension: { enrolled: false },
      health: { enrolled: false },
      employment_insurance: { enrolled: false },
    },
  };
  store.query("insert", {
    table: "hrx_compensation_records",
    row: {
      tenant_id: "tenant-a",
      compensation_id: "expired-profile-a",
      employee_id: "emp-a",
      encrypted_amount_ref: encryptCompensationAmount({ tenant_id: "tenant-a", employee_id: "emp-a", compensation_id: "expired-profile-a", amount_minor: 3_400_000, currency_ref: "KRW" }, { keyMaterial: "synthetic-payroll-profile-key" }),
      currency_ref: "KRW",
      raw_amount_included: false,
      effective_from: "2025-01-01",
      effective_to: "2026-12-31",
      source_ref: "artifact:synthetic-compensation/expired-profile-a",
      employment_contract_id: "contract-expired-profile-a",
      contract_document_ref: "artifact:contract/expired-profile-a",
      created_at: NOW,
      updated_at: NOW,
    },
  });
  assert.throws(
    () => service.createProfile(actor, {
      ...base,
      payroll_profile_id: "profile-before-compensation",
      employee_id: "emp-a",
      compensation_ref: "compensation:expired-profile-a",
      effective_from: "2027-01-01",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_COMPENSATION_PERIOD_MISMATCH",
  );

  service.createProfile(actor, {
    ...base,
    payroll_profile_id: "profile-period-update",
    employee_id: "emp-a",
    effective_from: "2026-02-01",
  });
  assert.throws(
    () => service.updateProfile(actor, {
      payroll_profile_id: "profile-period-update",
      expected_version: 1,
      effective_to: "2025-12-31",
    }),
    /effective_to must not precede effective_from/,
  );
  store.query("insert", {
    table: "hrx_compensation_records",
    row: {
      tenant_id: "tenant-a",
      compensation_id: "future-profile-a",
      employee_id: "emp-a",
      encrypted_amount_ref: encryptCompensationAmount({ tenant_id: "tenant-a", employee_id: "emp-a", compensation_id: "future-profile-a", amount_minor: 3_500_000, currency_ref: "KRW" }, { keyMaterial: "synthetic-payroll-profile-key" }),
      currency_ref: "KRW",
      raw_amount_included: false,
      effective_from: "2027-01-01",
      effective_to: null,
      source_ref: "artifact:synthetic-compensation/future-profile-a",
      employment_contract_id: "contract-future-profile-a",
      contract_document_ref: "artifact:contract/future-profile-a",
      created_at: NOW,
      updated_at: NOW,
    },
  });
  assert.throws(
    () => service.updateProfile(actor, {
      payroll_profile_id: "profile-period-update",
      expected_version: 1,
      effective_to: "2026-12-31",
      compensation_ref: "compensation:future-profile-a",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_COMPENSATION_PERIOD_MISMATCH",
  );
  store.close();
});

test("profile compensation coverage rejects late starts, early ends, and bounded records for open profiles", () => {
  const { store, service, actor } = createFixture();
  createSqlHrxRepository({ store, clock: () => NOW }).createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-b",
    display_name: "Coverage employee",
    status: "active",
  });
  const addCompensation = (compensationId, effective_from, effective_to) => store.query("insert", {
    table: "hrx_compensation_records",
    row: {
      tenant_id: "tenant-a",
      compensation_id: compensationId,
      employee_id: "emp-b",
      encrypted_amount_ref: encryptCompensationAmount({ tenant_id: "tenant-a", employee_id: "emp-b", compensation_id: compensationId, amount_minor: 3_000_000, currency_ref: "KRW" }, { keyMaterial: "synthetic-payroll-profile-key" }),
      currency_ref: "KRW",
      raw_amount_included: false,
      effective_from,
      effective_to,
      source_ref: `artifact:synthetic-compensation/${compensationId}`,
      employment_contract_id: `contract-${compensationId}`,
      contract_document_ref: `artifact:contract/${compensationId}`,
      created_at: NOW,
      updated_at: NOW,
    },
  });
  addCompensation("coverage-late", "2026-06-01", null);
  addCompensation("coverage-early", "2026-01-01", "2026-06-30");
  addCompensation("coverage-bounded", "2026-01-01", "2026-12-31");
  const base = {
    employee_id: "emp-b",
    employment_type: "monthly",
    pay_group_code: "KR-MONTHLY",
    effective_from: "2026-01-01",
    effective_to: "2026-12-31",
    deduction_input: {
      dependent_count: 0,
      income_tax_exempt: false,
      withholding_category: null,
      pension: { enrolled: false },
      health: { enrolled: false },
      employment_insurance: { enrolled: false },
    },
  };
  for (const [payroll_profile_id, compensation_ref] of [
    ["coverage-late-profile", "compensation:coverage-late"],
    ["coverage-early-profile", "compensation:coverage-early"],
  ]) {
    assert.throws(
      () => service.createProfile(actor, { ...base, payroll_profile_id, compensation_ref }),
      (error) => error.safe_error_code === "HRX_PAYROLL_COMPENSATION_PERIOD_MISMATCH",
    );
  }
  assert.throws(
    () => service.createProfile(actor, {
      ...base,
      payroll_profile_id: "coverage-open-profile",
      effective_to: null,
      compensation_ref: "compensation:coverage-bounded",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_COMPENSATION_PERIOD_MISMATCH",
  );
  store.close();
});

test("assignment retirement appends an inactive version and allows a later active version", () => {
  const { service, actor, store } = createFixture();
  const active = service.createAssignment(actor, "profile-a", {
    assignment_id: "assignment-retire-v1",
    item_id: "base-a",
    version: 1,
    amount_minor: 1_000_000,
    effective_from: "2026-01-01",
    source_ref: "HRX:payroll-assignment:retire:v1",
  });
  const retired = service.retireAssignment(actor, "profile-a", active.assignment_id, { expected_version: active.version });
  assert.equal(retired.status, "inactive");
  assert.equal(service.getProfile(actor, "profile-a").assignments.length, 0);
  assert.deepEqual(
    service.getProfile(actor, "profile-a", { on_date: "2026-01-15" }).assignments.map((row) => row.assignment_id),
    [active.assignment_id],
  );
  assert.equal(retired.effective_from, "2026-07-14");
  assert.deepEqual(service.getProfile(actor, "profile-a", { on_date: "2026-07-14" }).assignments, []);
  const history = service.getProfile(actor, "profile-a", { include_history: true }).assignments;
  assert.deepEqual(history.map((row) => row.status), ["inactive", "active"]);
  const replacement = service.createAssignment(actor, "profile-a", {
    assignment_id: "assignment-retire-v3",
    item_id: "base-a",
    version: 3,
    amount_minor: 1_100_000,
    effective_from: "2026-01-01",
    source_ref: "HRX:payroll-assignment:retire:v3",
  });
  assert.equal(replacement.status, "active");
  assert.equal(service.getProfile(actor, "profile-a").assignments[0].version, 3);
  store.close();
});

test("assignment reads resolve the highest active version at any as-of date", () => {
  const { service, actor, store } = createFixture();
  service.createAssignment(actor, "profile-a", {
    assignment_id: "assignment-future-v1",
    item_id: "base-a",
    version: 1,
    amount_minor: 1_000_000,
    effective_from: "2026-01-01",
    effective_to: "2026-12-31",
    source_ref: "HRX:payroll-assignment:future:v1",
  });
  service.createAssignment(actor, "profile-a", {
    assignment_id: "assignment-future-v2",
    item_id: "base-a",
    version: 2,
    amount_minor: 1_100_000,
    effective_from: "2027-01-01",
    source_ref: "HRX:payroll-assignment:future:v2",
  });
  service.createAssignment(actor, "profile-a", {
    assignment_id: "assignment-future-v3",
    item_id: "base-a",
    version: 3,
    amount_minor: 1_200_000,
    effective_from: "2026-03-01",
    effective_to: "2026-04-30",
    source_ref: "HRX:payroll-assignment:future:v3",
  });
  const asOf = (on_date) => service.getProfile(actor, "profile-a", { on_date }).assignments.map((row) => row.assignment_id);
  assert.deepEqual(asOf("2026-02-01"), ["assignment-future-v1"]);
  assert.deepEqual(asOf("2026-03-15"), ["assignment-future-v3"]);
  assert.deepEqual(asOf("2026-08-01"), ["assignment-future-v1"]);
  assert.deepEqual(asOf("2027-02-01"), ["assignment-future-v2"]);
  const history = service.getProfile(actor, "profile-a", { on_date: "2026-01-15", include_history: true }).assignments;
  assert.deepEqual(history.map((row) => row.assignment_id), ["assignment-future-v3", "assignment-future-v2", "assignment-future-v1"]);
  store.close();
});

test("assignment retirement rejects expired history and preserves an independent future version", () => {
  const first = createFixture();
  first.service.createAssignment(first.actor, "profile-a", {
    assignment_id: "assignment-expired-v1",
    item_id: "base-a",
    version: 1,
    amount_minor: 1_000_000,
    effective_from: "2026-01-01",
    effective_to: "2026-06-30",
    source_ref: "HRX:payroll-assignment:expired:v1",
  });
  first.service.createAssignment(first.actor, "profile-a", {
    assignment_id: "assignment-future-v2",
    item_id: "base-a",
    version: 2,
    amount_minor: 1_100_000,
    effective_from: "2027-01-01",
    source_ref: "HRX:payroll-assignment:expired:v2",
  });
  assert.throws(
    () => first.service.retireAssignment(first.actor, "profile-a", "assignment-expired-v1", { expected_version: 1 }),
    (error) => error.safe_error_code === "HRX_PAYROLL_ASSIGNMENT_NOT_CURRENT",
  );
  assert.deepEqual(first.service.getProfile(first.actor, "profile-a", { on_date: "2026-07-14" }).assignments, []);
  assert.deepEqual(
    first.service.getProfile(first.actor, "profile-a", { on_date: "2027-02-01" }).assignments.map((row) => row.assignment_id),
    ["assignment-future-v2"],
  );
  first.store.close();

  const second = createFixture();
  const active = second.service.createAssignment(second.actor, "profile-a", {
    assignment_id: "assignment-open-v1",
    item_id: "base-a",
    version: 1,
    amount_minor: 1_000_000,
    effective_from: "2026-01-01",
    source_ref: "HRX:payroll-assignment:open:v1",
  });
  second.store.query("insert", {
    table: "hrx_payroll_item_assignments",
    row: {
      tenant_id: "tenant-a",
      assignment_id: "assignment-open-future-v2",
      payroll_profile_id: "profile-a",
      employee_id: "emp-a",
      item_id: "base-a",
      version: 2,
      encrypted_amount_ref: encryptCompensationAmount({
        tenant_id: "tenant-a",
        employee_id: "emp-a",
        compensation_id: "assignment-open-future-v2",
        amount_minor: 1_200_000,
        currency_ref: "Currency:KRW",
      }, { keyMaterial: "synthetic-payroll-profile-key" }),
      currency_ref: "Currency:KRW",
      effective_from: "2027-01-01",
      effective_to: null,
      status: "active",
      source_ref: "HRX:payroll-assignment:open:v2",
      raw_amount_included: false,
      created_at: NOW,
    },
  });
  const retired = second.service.retireAssignment(second.actor, "profile-a", active.assignment_id, { expected_version: 1 });
  assert.equal(retired.status, "inactive");
  assert.equal(retired.effective_to, null);
  assert.deepEqual(
    second.service.getProfile(second.actor, "profile-a", { on_date: "2026-01-15" }).assignments.map((row) => row.assignment_id),
    ["assignment-open-v1"],
  );
  assert.deepEqual(second.service.getProfile(second.actor, "profile-a", { on_date: "2026-07-14" }).assignments, []);
  assert.deepEqual(
    second.service.getProfile(second.actor, "profile-a", { on_date: "2027-02-01" }).assignments.map((row) => row.assignment_id),
    ["assignment-open-future-v2"],
  );
  assert.throws(
    () => second.service.retireAssignment(second.actor, "profile-a", active.assignment_id, { expected_version: 1 }),
    (error) => error.safe_error_code === "HRX_PAYROLL_ASSIGNMENT_NOT_CURRENT",
  );
  second.store.close();
});

test("assignment ciphertext survives restart without serializing raw amount", () => {
  const directory = mkdtempSync(join(tmpdir(), "lawos-payroll-profile-"));
  const filePath = join(directory, "hrx.json");
  try {
    const { store, service, actor } = createFixture(filePath);
    service.createAssignment(actor, "profile-a", {
      assignment_id: "assignment-a-v1",
      item_id: "base-a",
      version: 1,
      amount_minor: 12_345_678,
      effective_from: "2026-01-01",
      source_ref: "HRX:payroll-assignment:a:v1",
    });
    store.close();
    const serialized = readFileSync(filePath, "utf8");
    assert.match(serialized, /lawos-comp-v1\./);
    assert.doesNotMatch(serialized, /12345678|amount_minor/);
    const reopened = createFileHrxStore({ filePath });
    const visible = createSqlPayrollProfileService({ store: reopened, clock: () => NOW })
      .getProfile(actor, "profile-a", { include_history: true });
    assert.equal(visible.assignments.length, 1);
    assert.doesNotMatch(JSON.stringify(visible), /lawos-comp-v1|12345678/);
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
