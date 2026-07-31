import assert from "node:assert/strict";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createLeaveReportingService } from "../src/leave/reporting-service.js";
import { parseXlsxBuffer } from "../src/leave/xlsx-export.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-leave-report-synthetic";
const NOW = "2026-07-13T01:00:00.000Z";

function fixture() {
  const store = createFileHrxStore();
  for (const [employee_id, display_name] of [["emp-001", "김하늘"], ["emp-002", "이바다"]]) {
    store.query("insert", { table: "hrx_employees", row: { tenant_id: TENANT, employee_id, display_name, status: "active" } });
  }
  store.query("insert", { table: "hrx_leave_groups", row: { tenant_id: TENANT, group_id: "annual", code: "ANNUAL", display_name: "연차", status: "active", state_version: 1 } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: { tenant_id: TENANT, policy_version_id: "annual-v1", group_id: "annual", policy_code: "ANNUAL-2026", version: 1, effective_from: "2026-01-01", effective_to: null, status: "active", rules_json: "{}" } });
  const ledger = createSqlLeaveBalanceLedger({ store });
  for (const employeeId of ["emp-001", "emp-002"]) {
    const entitlementId = `entitlement-${employeeId}`;
    store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: entitlementId, employee_id: employeeId, group_id: "annual", policy_version_id: "annual-v1", granted_minutes: 960, valid_from: "2026-01-01", expires_on: "2026-12-31", source_ref: "LeaveAccrualRun:synthetic", idempotency_key: `entitlement-${employeeId}`, state_version: 1 } });
    ledger.append({ tenant_id: TENANT, entry_id: `earned-${employeeId}`, employee_id: employeeId, policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: entitlementId, idempotency_key: `earned-${employeeId}`, entry_type: "earned", amount_minutes: 960, occurred_on: "2026-01-01", source_ref: "LeaveAccrualRun:synthetic", metadata: employeeId === "emp-002" ? { reason: "내보내면 안 되는 사유", attachment_id: "secret-doc" } : {} });
  }
  let sequence = 0;
  const service = createLeaveReportingService({
    store,
    clock: () => NOW,
    idFactory: (prefix) => `${prefix}-${++sequence}`,
    employeeDirectory: () => [
      { employee_id: "emp-001", display_name: "김하늘", org_unit_id: "org-legal", org_unit_label: "법률" },
      { employee_id: "emp-002", display_name: "이바다", org_unit_id: "org-finance", org_unit_label: "재무" },
    ],
  });
  return { store, service, ledger };
}

function context(ids = ["emp-001", "emp-002"]) {
  return { tenant_id: TENANT, actor_id: "hr-operator", authorized_employee_ids: ids };
}

test("leave reporting filters before counting and exports the exact visible totals without private fields", () => {
  const { service } = fixture();
  const visible = service.query(context(["emp-001"]), { employee_id: "emp-001", entry_type: "earned" });
  assert.equal(visible.rows.length, 1);
  assert.equal(visible.totals.row_count, 1);
  assert.equal(visible.totals.earned, 960);
  assert.equal(visible.rows[0].employee_display_name, "김하늘");

  const unauthorized = service.query(context(["emp-001"]), { employee_id: "emp-002" });
  assert.equal(unauthorized.rows.length, 0);
  assert.equal(unauthorized.totals.row_count, 0);
  assert.equal(JSON.stringify(unauthorized).includes("이바다"), false);

  const csv = service.exportReport(context(), { format: "csv" });
  const csvText = Buffer.from(csv.content_base64, "base64").toString("utf8");
  assert.equal(csv.row_count, 2);
  assert.equal(csv.totals.earned, 1920);
  assert.match(csvText, /김하늘/);
  assert.doesNotMatch(csvText, /내보내면 안 되는 사유|secret-doc/);

  const xlsx = service.exportReport(context(), { format: "xlsx" });
  const xlsxBuffer = Buffer.from(xlsx.content_base64, "base64");
  assert.equal(xlsxBuffer.subarray(0, 2).toString("ascii"), "PK");
  assert.equal(xlsx.row_count, visible.totals.row_count + 1);
  assert.equal(xlsx.privacy_boundary, "reason_and_attachment_excluded");
});

test("leave reporting projections fail closed when group, policy, or employee names are missing", () => {
  const { store, service, ledger } = fixture();
  const missingGroupId = "group-missing-name";
  const policyOnlyId = "POLICY-ONLY-001";
  store.query("insert", { table: "hrx_leave_groups", row: {
    tenant_id: TENANT,
    group_id: missingGroupId,
    code: "MISSING_NAME",
    display_name: null,
    status: "active",
    state_version: 1,
  } });
  store.query("insert", { table: "hrx_leave_policy_versions", row: {
    tenant_id: TENANT,
    policy_version_id: "missing-name-v1",
    group_id: missingGroupId,
    policy_code: "MISSING_NAME-2026",
    version: 1,
    effective_from: "2026-01-01",
    effective_to: null,
    status: "active",
    rules_json: "{}",
  } });
  store.query("insert", { table: "hrx_leave_entitlements", row: {
    tenant_id: TENANT,
    entitlement_id: "entitlement-missing-group-name",
    employee_id: "emp-001",
    group_id: missingGroupId,
    policy_version_id: "missing-name-v1",
    granted_minutes: 120,
    valid_from: "2026-01-02",
    expires_on: "2026-12-31",
    source_ref: "LeaveAccrualRun:missing-name",
    idempotency_key: "entitlement-missing-group-name",
    state_version: 1,
  } });
  ledger.append({
    tenant_id: TENANT,
    entry_id: "earned-missing-group-name",
    employee_id: "emp-001",
    policy_id: "MISSING_NAME-2026",
    group_id: missingGroupId,
    policy_version_id: "missing-name-v1",
    entitlement_id: "entitlement-missing-group-name",
    idempotency_key: "earned-missing-group-name",
    entry_type: "earned",
    amount_minutes: 120,
    occurred_on: "2026-01-02",
    source_ref: "LeaveAccrualRun:missing-name",
  });
  ledger.append({
    tenant_id: TENANT,
    entry_id: "legacy-policy-only",
    employee_id: "emp-001",
    policy_id: policyOnlyId,
    entry_type: "earned",
    amount: 1,
    occurred_on: "2026-01-03",
    source_ref: "LegacyLedger:policy-only",
  });

  const report = service.query(context(["emp-001"]), { employee_id: "emp-001" });
  const missingGroupRow = report.rows.find((row) => row.entry_id === "earned-missing-group-name");
  const policyOnlyRow = report.rows.find((row) => row.entry_id === "legacy-policy-only");
  assert.equal(missingGroupRow.group_id, missingGroupId);
  assert.equal(missingGroupRow.group_display_name, "휴가 기준 이름 확인 필요");
  assert.notEqual(missingGroupRow.group_display_name, missingGroupId);
  assert.equal(missingGroupRow.group_display_name.includes(missingGroupId), false);
  assert.equal(policyOnlyRow.group_id, null);
  assert.equal(policyOnlyRow.group_display_name, "휴가 기준 이름 확인 필요");
  assert.notEqual(policyOnlyRow.group_display_name, policyOnlyId);
  assert.equal(policyOnlyRow.group_display_name.includes(policyOnlyId), false);

  const missingGroupBalance = report.current_balances.find((row) => row.group_id === missingGroupId);
  const policyOnlyBalance = report.current_balances.find((row) => row.policy_id === policyOnlyId);
  assert.equal(missingGroupBalance.group_display_name, "휴가 그룹 이름 확인 필요");
  assert.notEqual(missingGroupBalance.group_display_name, missingGroupId);
  assert.equal(missingGroupBalance.group_display_name.includes(missingGroupId), false);
  assert.equal(policyOnlyBalance.group_display_name, "휴가 기준 이름 확인 필요");
  assert.notEqual(policyOnlyBalance.group_display_name, policyOnlyId);
  assert.equal(policyOnlyBalance.group_display_name.includes(policyOnlyId), false);

  const occurrence = service.queryOccurrences(context(["emp-001"]), { as_of: "2026-07-13" });
  const missingGroupOccurrence = occurrence.rows.find((row) => row.entitlement_id === "entitlement-missing-group-name");
  assert.equal(missingGroupOccurrence.group_id, missingGroupId);
  assert.equal(missingGroupOccurrence.group_display_name, "휴가 그룹 이름 확인 필요");
  assert.notEqual(missingGroupOccurrence.group_display_name, missingGroupId);
  assert.equal(missingGroupOccurrence.group_display_name.includes(missingGroupId), false);
  const byType = service.occurrenceProjections(context(["emp-001"]), { as_of: "2026-07-13" }).by_type;
  const missingGroupType = byType.find((row) => row.key === missingGroupId);
  assert.equal(missingGroupType.label, "휴가 그룹 이름 확인 필요");
  assert.notEqual(missingGroupType.label, missingGroupId);
  assert.equal(missingGroupType.label.includes(missingGroupId), false);

  const missingEmployeeService = createLeaveReportingService({
    store,
    clock: () => NOW,
    employeeDirectory: () => [{ employee_id: "emp-001", display_name: null }],
  });
  const missingEmployeeRow = missingEmployeeService.query(context(["emp-001"]), { employee_id: "emp-001" }).rows[0];
  assert.equal(missingEmployeeRow.employee_display_name, "구성원 이름 확인 필요");
  assert.notEqual(missingEmployeeRow.employee_display_name, missingEmployeeRow.employee_id);
  assert.equal(missingEmployeeRow.employee_display_name.includes(missingEmployeeRow.employee_id), false);
});

test("leave reporting never promotes opaque employee or group references into query, projection, or export labels", () => {
  const { store } = fixture();
  const unsafeEmployeeNames = [
    "prefixEMP-001post",
    "lawyer@example.com",
    "550e8400-e29b-41d4-a716-446655440000",
    "0123456789abcdef0123456789abcdef",
    "opaque-9f2a4c7b8d1e",
  ];
  store.query("updateOne", {
    table: "hrx_leave_groups",
    where: { tenant_id: TENANT, group_id: "annual" },
    expected_version: 1,
    patch: { display_name: "ANNUAL", state_version: 2 },
  });
  for (const display_name of unsafeEmployeeNames) {
    const service = createLeaveReportingService({
      store,
      clock: () => NOW,
      employeeDirectory: () => [{ employee_id: "emp-001", display_name }],
    });
    const scoped = context(["emp-001"]);
    const query = service.query(scoped, { employee_id: "emp-001" });
    const queryRow = query.rows[0];
    assert.equal(queryRow.employee_display_name, "구성원 이름 확인 필요");
    assert.equal(queryRow.group_display_name, "휴가 기준 이름 확인 필요");
    assert.equal(queryRow.employee_display_name.includes("emp-001"), false);
    assert.equal(queryRow.group_display_name.includes("annual"), false);

    const occurrences = service.queryOccurrences(scoped, { employee_id: "emp-001" });
    assert.equal(occurrences.rows[0].employee_display_name, "구성원 이름 확인 필요");
    assert.equal(occurrences.rows[0].group_display_name, "휴가 그룹 이름 확인 필요");
    const projections = service.occurrenceProjections(scoped, { employee_id: "emp-001" });
    assert.equal(projections.list.rows[0].employee_display_name, "구성원 이름 확인 필요");
    assert.equal(projections.by_type[0].label, "휴가 그룹 이름 확인 필요");

    const reportCsv = Buffer.from(service.exportReport(scoped, { format: "csv" }).content_base64, "base64").toString("utf8");
    const occurrenceCsv = Buffer.from(service.exportOccurrences(scoped, { format: "csv", view: "list" }).content_base64, "base64").toString("utf8");
    assert.equal(reportCsv.includes(display_name), false);
    assert.equal(occurrenceCsv.includes(display_name), false);
    assert.equal(reportCsv.includes("emp-001"), true);
    assert.equal(reportCsv.includes("구성원 이름 확인 필요"), true);
    assert.equal(occurrenceCsv.includes("휴가 그룹 이름 확인 필요"), true);
  }
});

test("leave occurrence DTOs and exports sanitize org unit labels without changing natural names", () => {
  const orgUnitLabels = [
    ["법률", "법률"],
    ["Legal Operations", "Legal Operations"],
    ["org-legal", "조직 이름 확인 필요"],
    ["lawyer@example.com", "조직 이름 확인 필요"],
    ["550e8400-e29b-41d4-a716-446655440000", "조직 이름 확인 필요"],
    ["0123456789abcdef0123456789abcdef", "조직 이름 확인 필요"],
    ["opaque-org-9f2a4c7b8d1e", "조직 이름 확인 필요"],
    ["prefixORG-LEGALpost", "조직 이름 확인 필요"],
  ];

  for (const [org_unit_label, expectedLabel] of orgUnitLabels) {
    const { store } = fixture();
    const service = createLeaveReportingService({
      store,
      clock: () => NOW,
      employeeDirectory: () => [{ employee_id: "emp-001", display_name: "김하늘", org_unit_id: "org-legal", org_unit_label }],
    });
    const scoped = context(["emp-001"]);
    const occurrence = service.queryOccurrences(scoped, { as_of: "2026-07-13" });
    assert.equal(occurrence.rows[0].org_unit_label, expectedLabel);
    assert.equal(service.occurrenceProjections(scoped, { as_of: "2026-07-13" }).list.rows[0].org_unit_label, expectedLabel);

    const csvText = Buffer.from(service.exportOccurrences(scoped, { format: "csv", view: "list" }).content_base64, "base64").toString("utf8");
    assert.equal(csvText.includes(org_unit_label), org_unit_label === expectedLabel);
    assert.equal(csvText.includes(expectedLabel), true);

    const xlsxRows = parseXlsxBuffer(Buffer.from(service.exportOccurrences(scoped, { format: "xlsx", view: "list" }).content_base64, "base64"));
    assert.equal(xlsxRows[1][3], expectedLabel);
  }
});

test("balance snapshot validator distinguishes match, mismatch, and missing", () => {
  const { service, store, ledger } = fixture();
  const scoped = context(["emp-001"]);
  const missing = service.validateBalances(scoped, { as_of: "2026-07-13" });
  assert.deepEqual(missing.counts, { match: 0, mismatch: 0, missing: 1 });

  service.captureSnapshots(scoped, { as_of: "2026-07-13" });
  assert.deepEqual(service.validateBalances(scoped, { as_of: "2026-07-13" }).counts, { match: 1, mismatch: 0, missing: 0 });

  store.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: TENANT, entitlement_id: "adjustment-entitlement", employee_id: "emp-001", group_id: "annual", policy_version_id: "annual-v1", granted_minutes: 60, valid_from: "2026-07-13", expires_on: "2026-12-31", source_ref: "HRDocument:synthetic", idempotency_key: "adjustment-entitlement", state_version: 1 } });
  ledger.append({ tenant_id: TENANT, entry_id: "adjustment-credit", employee_id: "emp-001", policy_id: "ANNUAL-2026", group_id: "annual", policy_version_id: "annual-v1", entitlement_id: "adjustment-entitlement", idempotency_key: "adjustment-credit", entry_type: "adjustment", adjustment_direction: "credit", amount_minutes: 60, occurred_on: "2026-07-13", source_ref: "HRDocument:synthetic" });
  const mismatch = service.validateBalances(scoped, { as_of: "2026-07-13" });
  assert.deepEqual(mismatch.counts, { match: 0, mismatch: 1, missing: 0 });
  assert.equal(mismatch.rows[0].delta_minutes, 60);
});

test("LV-OCC-001 queries lifecycle occurrences with org filters, totals, pagination, and tenant isolation", () => {
  const { service, store, ledger } = fixture();
  ledger.append({
    tenant_id: TENANT,
    entry_id: "used-emp-001",
    employee_id: "emp-001",
    policy_id: "ANNUAL-2026",
    group_id: "annual",
    policy_version_id: "annual-v1",
    entitlement_id: "entitlement-emp-001",
    idempotency_key: "used-emp-001",
    entry_type: "used",
    amount_minutes: 120,
    occurred_on: "2026-06-01",
    source_ref: "LeaveRequest:synthetic",
  });
  store.query("insert", { table: "hrx_leave_entitlements", row: {
    tenant_id: TENANT,
    entitlement_id: "entitlement-future",
    employee_id: "emp-001",
    group_id: "annual",
    policy_version_id: "annual-v1",
    granted_minutes: 240,
    valid_from: "2026-08-01",
    expires_on: "2026-12-31",
    source_ref: "HRDocument:private-source",
    idempotency_key: "entitlement-future",
    state_version: 1,
  } });
  ledger.append({
    tenant_id: TENANT,
    entry_id: "earned-future",
    employee_id: "emp-001",
    policy_id: "ANNUAL-2026",
    group_id: "annual",
    policy_version_id: "annual-v1",
    entitlement_id: "entitlement-future",
    idempotency_key: "earned-future",
    entry_type: "earned",
    amount_minutes: 240,
    occurred_on: "2026-08-01",
    source_ref: "HRDocument:private-source",
    metadata: { reason: "비공개", attachment_id: "secret" },
  });

  const first = service.queryOccurrences(context(), { as_of: "2026-07-13", limit: 1 });
  assert.equal(first.rows.length, 1);
  assert.equal(first.totals.row_count, 3);
  assert.equal(first.totals.total_minutes, 2160);
  assert.equal(first.totals.used_minutes, 120);
  assert.equal(first.totals.remaining_minutes, 1800);
  assert.ok(first.next_cursor);
  const second = service.queryOccurrences(context(), { as_of: "2026-07-13", limit: 1, cursor: first.next_cursor });
  assert.notEqual(second.rows[0].entitlement_id, first.rows[0].entitlement_id);

  const scheduled = service.queryOccurrences(context(), { as_of: "2026-07-13", state: "scheduled" });
  assert.equal(scheduled.rows.length, 1);
  assert.equal(scheduled.rows[0].total_minutes, 240);
  assert.equal(scheduled.rows[0].remaining_minutes, 0);
  assert.equal(JSON.stringify(scheduled).includes("private-source"), false);
  assert.equal(JSON.stringify(scheduled).includes("비공개"), false);

  const legal = service.queryOccurrences(context(), { as_of: "2026-07-13", org_unit_id: "org-legal" });
  assert.deepEqual(legal.rows.map((row) => row.employee_id), ["emp-001", "emp-001"]);
  const unauthorized = service.queryOccurrences(context(["emp-001"]), { employee_id: "emp-002" });
  assert.equal(unauthorized.totals.row_count, 0);
  assert.throws(() => service.queryOccurrences(context(), { state: "unknown" }), /state must be one of/);
});

test("LV-OCC-002 derives list, month, and type projections from one occurrence source", () => {
  const { service } = fixture();
  const projections = service.occurrenceProjections(context(), { as_of: "2026-07-13" });
  assert.deepEqual(projections.list.totals, projections.totals);
  assert.equal(projections.by_month.reduce((sum, row) => sum + row.totals.total_minutes, 0), projections.totals.total_minutes);
  assert.equal(projections.by_type.reduce((sum, row) => sum + row.totals.total_minutes, 0), projections.totals.total_minutes);
  assert.equal(projections.source_version, service.queryOccurrences(context(), { as_of: "2026-07-13" }).source_version);
  assert.deepEqual(projections.by_month.map((row) => row.key), ["2026-01"]);
  assert.deepEqual(projections.by_type.map((row) => row.label), ["연차"]);
});

test("LV-OCC-008 exports filtered list, month, and type views from the occurrence query source", () => {
  const { service } = fixture();
  const filters = { as_of: "2026-07-13", limit: 1 };
  const queried = service.queryOccurrences(context(), filters);

  const listCsv = service.exportOccurrences(context(), { ...filters, format: "csv", view: "list" });
  const listText = Buffer.from(listCsv.content_base64, "base64").toString("utf8");
  const listLines = listText.trim().split(/\r?\n/);
  const listValues = listLines.slice(1).map((line) => line.split(",").map((value) => value.replace(/^\ufeff/, "")));
  assert.equal(queried.rows.length, 1);
  assert.equal(listCsv.row_count, queried.totals.row_count);
  assert.deepEqual(listCsv.totals, queried.totals);
  assert.equal(listCsv.source_version, queried.source_version);
  assert.equal(listValues.reduce((sum, row) => sum + Number(row[8]), 0), queried.totals.total_minutes);
  assert.equal(listValues.reduce((sum, row) => sum + Number(row[12]), 0), queried.totals.remaining_minutes);
  assert.doesNotMatch(listText, /내보내면 안 되는 사유|secret-doc|source_ref|원천 참조/);

  for (const view of ["month", "type"]) {
    const exported = service.exportOccurrences(context(), { ...filters, format: "csv", view });
    assert.deepEqual(exported.totals, queried.totals);
    assert.equal(exported.source_version, queried.source_version);
    assert.equal(exported.occurrence_count, queried.totals.row_count);
  }

  const xlsx = service.exportOccurrences(context(), { ...filters, format: "xlsx", view: "type" });
  const xlsxBuffer = Buffer.from(xlsx.content_base64, "base64");
  assert.equal(xlsxBuffer.subarray(0, 2).toString("ascii"), "PK");
  assert.equal(xlsxBuffer.includes(Buffer.from("휴가 발생 내역")), true);
  assert.deepEqual(xlsx.totals, queried.totals);
  assert.throws(() => service.exportOccurrences(context(), { format: "json" }), /format must be csv or xlsx/);
  assert.throws(() => service.exportOccurrences(context(), { view: "calendar" }), /view must be list, month, or type/);
});
