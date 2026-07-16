import assert from "node:assert/strict";
import test from "node:test";
import { createLeavePolicyService } from "../src/leave/policy-service.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const NOW = "2026-07-13T00:00:00.000Z";

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store, clock: () => NOW });
  for (const tenantId of ["tenant-a", "tenant-b"]) {
    repository.createEmployee({ tenant_id: tenantId, employee_id: "emp-001", display_name: "Ari", status: "active" });
  }
  return { store, service: createLeavePolicyService({ store, clock: () => NOW }) };
}

function createGroupAndType(service, tenantId) {
  const context = { tenant_id: tenantId };
  service.createGroup(context, {
    group_id: "group-paid",
    code: "paid_time",
    display_name: "유급 휴가",
  });
  service.createType(context, {
    leave_type_id: "type-annual",
    group_id: "group-paid",
    code: "annual",
    display_name: "연차",
    request_unit: "minutes",
  });
}

function policyInput(overrides = {}) {
  return {
    policy_version_id: "policy-v1",
    group_id: "group-paid",
    policy_code: "annual-kr",
    version: 1,
    effective_from: "2026-01-01",
    effective_to: null,
    rules: { calculation_unit: "minutes", reserve_on_submit: true },
    ...overrides,
  };
}

test("leave group, type, and policy configuration is tenant isolated with tenant-scoped codes", () => {
  const { store, service } = setup();
  createGroupAndType(service, "tenant-a");
  createGroupAndType(service, "tenant-b");
  service.createPolicyVersion({ tenant_id: "tenant-a" }, policyInput());
  service.createPolicyVersion({ tenant_id: "tenant-b" }, policyInput());

  assert.deepEqual(service.listConfiguration({ tenant_id: "tenant-a" }).groups.map((row) => row.tenant_id), ["tenant-a"]);
  assert.deepEqual(service.listConfiguration({ tenant_id: "tenant-b" }).types.map((row) => row.tenant_id), ["tenant-b"]);
  assert.throws(
    () => service.createGroup({ tenant_id: "tenant-a" }, { group_id: "group-other", code: "PAID_TIME", display_name: "중복" }),
    /unique constraint failed.*code/,
  );
  store.close();
});

test("published policy is immutable and controlled publication closes its predecessor", () => {
  const { store, service } = setup();
  createGroupAndType(service, "tenant-a");
  const context = { tenant_id: "tenant-a" };
  service.createPolicyVersion(context, policyInput());
  assert.equal(service.publishPolicyVersion(context, "policy-v1").status, "active");
  assert.throws(
    () => service.updatePolicyDraft(context, "policy-v1", { rules: { reserve_on_submit: false } }),
    (error) => error.safe_error_code === "HRX_LEAVE_POLICY_VERSION_IMMUTABLE",
  );

  service.createNextPolicyVersion(context, "policy-v1", {
    policy_version_id: "policy-v2",
    effective_from: "2027-01-01",
    rules: { calculation_unit: "minutes", reserve_on_submit: true, carryover: 480 },
  });
  assert.equal(service.publishPolicyVersion(context, "policy-v2").status, "active");
  const policies = service.listConfiguration(context).policies;
  assert.equal(policies.find((row) => row.policy_version_id === "policy-v1").status, "retired");
  assert.equal(policies.find((row) => row.policy_version_id === "policy-v1").effective_to, "2026-12-31");
  store.close();
});

test("policy publication rejects a version that begins before an active version", () => {
  const { store, service } = setup();
  createGroupAndType(service, "tenant-a");
  const context = { tenant_id: "tenant-a" };
  service.createPolicyVersion(context, policyInput({ effective_from: "2026-06-01" }));
  service.publishPolicyVersion(context, "policy-v1");
  service.createPolicyVersion(context, policyInput({
    policy_version_id: "policy-v2",
    version: 2,
    effective_from: "2026-01-01",
  }));
  assert.throws(
    () => service.publishPolicyVersion(context, "policy-v2"),
    (error) => error.safe_error_code === "HRX_LEAVE_POLICY_EFFECTIVE_OVERLAP",
  );
  store.close();
});

test("inactive leave type is excluded from new requests but remains available to historical rows", () => {
  const { store, service } = setup();
  createGroupAndType(service, "tenant-a");
  const context = { tenant_id: "tenant-a" };
  service.createPolicyVersion(context, policyInput());
  service.publishPolicyVersion(context, "policy-v1");
  store.query("insert", {
    table: "hrx_leave_requests",
    row: {
      tenant_id: "tenant-a",
      request_id: "legacy-leave-001",
      employee_id: "emp-001",
      policy_id: "annual-kr",
      leave_type: "ANNUAL",
      leave_type_id: "type-annual",
      amount: 8,
      start_date: "2026-06-01",
      end_date: "2026-06-01",
      state: "approved",
      submitted_at: NOW,
      approver_id: "manager-001",
      decided_at: NOW,
      decision_reason: null,
      source_ref: "LeaveRequest:legacy-leave-001",
    },
  });
  service.updateType(context, "type-annual", { status: "inactive", display_name: "연차 (사용 중지)" });
  assert.deepEqual(service.listActiveTypes(context), []);
  assert.equal(service.listConfiguration(context).types[0].display_name, "연차 (사용 중지)");
  assert.equal(store.query("selectOne", { table: "hrx_leave_requests", where: { tenant_id: "tenant-a", request_id: "legacy-leave-001" } }).leave_type_id, "type-annual");
  assert.throws(
    () => service.updateType(context, "type-annual", { code: "ANNUAL_V2" }),
    (error) => error.safe_error_code === "HRX_LEAVE_TYPE_HISTORY_IMMUTABLE",
  );
  store.close();
});
