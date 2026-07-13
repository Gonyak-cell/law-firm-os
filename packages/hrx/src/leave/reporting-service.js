import { createHash, randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../../audit/src/hrx-event-store-sql.js";
import { calculateLeaveBalance } from "./balance.js";
import { createXlsxBuffer } from "./xlsx-export.js";

const EXPORT_HEADERS = Object.freeze([
  "구성원 ID",
  "구성원",
  "휴가 그룹",
  "원장 종류",
  "발생일",
  "분",
  "잔액 영향(분)",
  "만료일",
  "요청 상태",
  "요청 시작일",
  "요청 종료일",
  "원천 참조",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalDate(value, field) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return text;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function ledgerEffect(row) {
  const minutes = Number(row.amount_minutes ?? 0);
  if (row.entry_type === "adjustment") return row.adjustment_direction === "debit" ? -minutes : minutes;
  if (["earned", "carryover", "released"].includes(row.entry_type)) return minutes;
  if (["used", "reserved", "expired"].includes(row.entry_type)) return -minutes;
  return 0;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function createCsv(headers, rows) {
  return `\ufeff${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function allowedEmployeeIds(context) {
  if (!Array.isArray(context?.authorized_employee_ids)) {
    const error = new TypeError("Trusted leave report employee scope is required");
    error.safe_error_code = "HRX_LEAVE_REPORT_SCOPE_REQUIRED";
    error.status = 403;
    throw error;
  }
  return new Set(context.authorized_employee_ids.filter((value) => typeof value === "string" && value.trim()));
}

function requestIdFromSource(row, allocationById) {
  const direct = /^LeaveRequest:(.+)$/.exec(row.source_ref ?? "")?.[1];
  return direct ?? allocationById.get(row.allocation_id)?.request_id ?? null;
}

function summarize(rows) {
  const totals = { earned: 0, carryover: 0, adjustment: 0, reserved: 0, released: 0, used: 0, expired: 0 };
  for (const row of rows) {
    const minutes = Number(row.amount_minutes ?? 0);
    if (row.entry_type === "adjustment") totals.adjustment += row.adjustment_direction === "debit" ? -minutes : minutes;
    else if (Object.hasOwn(totals, row.entry_type)) totals[row.entry_type] += minutes;
  }
  return Object.freeze({
    row_count: rows.length,
    ...totals,
    net_minutes: totals.earned + totals.carryover + totals.adjustment + totals.released - totals.used - totals.reserved - totals.expired,
  });
}

function exportRows(rows) {
  return rows.map((row) => [
    row.employee_id,
    row.employee_display_name,
    row.group_display_name,
    row.entry_type,
    row.occurred_on,
    row.amount_minutes,
    row.balance_effect_minutes,
    row.expires_on ?? "",
    row.request_state ?? "",
    row.request_start_date ?? "",
    row.request_end_date ?? "",
    row.source_ref,
  ]);
}

export function createLeaveReportingService({ store, employeeDirectory = () => [], clock = () => new Date().toISOString(), idFactory = (prefix) => `${prefix}_${randomUUID()}` } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("leave reporting service requires a store");

  function calculateBalances({ tenantId, allowed, employees, groups, asOf }) {
    const balanceGroups = new Map();
    const ledgerRows = store
      .query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId } })
      .filter((row) => allowed.has(row.employee_id) && row.occurred_on <= asOf);
    for (const row of ledgerRows) {
      const scope = row.group_id ? { kind: "group", id: row.group_id } : { kind: "policy", id: row.policy_id };
      if (!scope.id) continue;
      const key = JSON.stringify([row.employee_id, scope.kind, scope.id]);
      if (!balanceGroups.has(key)) balanceGroups.set(key, { scope, entries: [] });
      balanceGroups.get(key).entries.push(row);
    }
    const rows = [...balanceGroups.entries()].map(([key, bucket]) => {
      const [rowEmployeeId] = JSON.parse(key);
      const queryScope = bucket.scope.kind === "group" ? { group_id: bucket.scope.id } : { policy_id: bucket.scope.id };
      const balance = calculateLeaveBalance(bucket.entries, { tenant_id: tenantId, employee_id: rowEmployeeId, ...queryScope });
      return Object.freeze({
        employee_id: rowEmployeeId,
        employee_display_name: employees.get(rowEmployeeId)?.display_name ?? "구성원",
        group_id: bucket.scope.kind === "group" ? bucket.scope.id : null,
        group_display_name: bucket.scope.kind === "group" ? groups.get(bucket.scope.id)?.display_name ?? bucket.scope.id : bucket.scope.id,
        ...balance,
      });
    }).sort((left, right) => left.employee_display_name.localeCompare(right.employee_display_name, "ko") || left.group_display_name.localeCompare(right.group_display_name, "ko"));
    return Object.freeze({ rows: Object.freeze(rows), source_version: hash(ledgerRows.map((row) => [row.entry_id, ledgerEffect(row), row.occurred_on])) });
  }

  function query(context, filters = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const allowed = allowedEmployeeIds(context);
    const from = optionalDate(filters.from, "from");
    const to = optionalDate(filters.to, "to");
    if (from && to && to < from) throw new TypeError("to must be on or after from");
    const employeeId = typeof filters.employee_id === "string" && filters.employee_id.trim() ? filters.employee_id.trim() : null;
    const groupId = typeof filters.group_id === "string" && filters.group_id.trim() ? filters.group_id.trim() : null;
    const entryType = typeof filters.entry_type === "string" && filters.entry_type.trim() ? filters.entry_type.trim() : null;
    const requestState = typeof filters.state === "string" && filters.state.trim() ? filters.state.trim() : null;
    const leaveTypeId = typeof filters.leave_type_id === "string" && filters.leave_type_id.trim() ? filters.leave_type_id.trim() : null;
    const expiryFrom = optionalDate(filters.expiry_from, "expiry_from");
    const expiryTo = optionalDate(filters.expiry_to, "expiry_to");

    const employees = new Map(employeeDirectory({ tenant_id: tenantId }).filter((row) => allowed.has(row.employee_id)).map((row) => [row.employee_id, row]));
    const groups = new Map(store.query("select", { table: "hrx_leave_groups", where: { tenant_id: tenantId } }).map((row) => [row.group_id, row]));
    const entitlements = new Map(store.query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId } }).map((row) => [row.entitlement_id, row]));
    const requests = new Map(store.query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId } }).map((row) => [row.request_id, row]));
    const allocations = store.query("select", { table: "hrx_leave_request_allocations", where: { tenant_id: tenantId } });
    const allocationById = new Map(allocations.map((row) => [row.allocation_id, row]));

    const rows = store
      .query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId } })
      .filter((row) => allowed.has(row.employee_id))
      .map((row) => {
        const entitlement = entitlements.get(row.entitlement_id) ?? null;
        const requestId = requestIdFromSource(row, allocationById);
        const request = requestId ? requests.get(requestId) ?? null : null;
        return Object.freeze({
          entry_id: row.entry_id,
          employee_id: row.employee_id,
          employee_display_name: employees.get(row.employee_id)?.display_name ?? "구성원",
          group_id: row.group_id ?? null,
          group_display_name: groups.get(row.group_id)?.display_name ?? row.policy_id ?? "이전 원장",
          entry_type: row.entry_type,
          adjustment_direction: row.adjustment_direction ?? null,
          amount_minutes: Number(row.amount_minutes ?? Math.round(Number(row.amount ?? 0) * 60)),
          balance_effect_minutes: ledgerEffect(row),
          occurred_on: row.occurred_on,
          expires_on: entitlement?.expires_on ?? null,
          policy_version_id: row.policy_version_id ?? null,
          entitlement_id: row.entitlement_id ?? null,
          request_id: requestId,
          request_state: request?.state ?? null,
          request_start_date: request?.start_date ?? null,
          request_end_date: request?.end_date ?? null,
          leave_type_id: request?.leave_type_id ?? null,
          source_ref: row.source_ref,
        });
      })
      .filter((row) => !employeeId || (allowed.has(employeeId) && row.employee_id === employeeId))
      .filter((row) => !groupId || row.group_id === groupId)
      .filter((row) => !entryType || row.entry_type === entryType)
      .filter((row) => !requestState || row.request_state === requestState)
      .filter((row) => !leaveTypeId || row.leave_type_id === leaveTypeId)
      .filter((row) => !from || row.occurred_on >= from)
      .filter((row) => !to || row.occurred_on <= to)
      .filter((row) => !expiryFrom || (row.expires_on && row.expires_on >= expiryFrom))
      .filter((row) => !expiryTo || (row.expires_on && row.expires_on <= expiryTo))
      .sort((left, right) => right.occurred_on.localeCompare(left.occurred_on) || left.entry_id.localeCompare(right.entry_id));

    const currentBalance = calculateBalances({ tenantId, allowed, employees, groups, asOf: clock().slice(0, 10) });

    const sourceVersion = hash(rows.map((row) => [row.entry_id, row.balance_effect_minutes, row.occurred_on]));
    return Object.freeze({
      filters: Object.freeze({ from, to, employee_id: employeeId, group_id: groupId, entry_type: entryType, state: requestState, leave_type_id: leaveTypeId, expiry_from: expiryFrom, expiry_to: expiryTo }),
      rows: Object.freeze(rows),
      totals: summarize(rows),
      current_balances: currentBalance.rows,
      source_version: sourceVersion,
      privacy_boundary: "reason_and_attachment_excluded",
      authorized_employee_count: employees.size,
    });
  }

  function exportReport(context, filters = {}) {
    const format = String(filters.format ?? "csv").toLowerCase();
    if (!['csv', 'xlsx'].includes(format)) throw new TypeError("format must be csv or xlsx");
    const result = query(context, filters);
    const rows = exportRows(result.rows);
    const buffer = format === "xlsx"
      ? createXlsxBuffer({ headers: EXPORT_HEADERS, rows })
      : Buffer.from(createCsv(EXPORT_HEADERS, rows), "utf8");
    const now = clock();
    createSqlHrxAuditEventStore({ store }).append({
      event_id: idFactory("leave_audit_report_export"),
      tenant_id: requiredString(context, "tenant_id"),
      actor_id: requiredString(context, "actor_id"),
      action: "hrx.leave.report.export",
      object_type: "LeaveLedgerReport",
      object_id: result.source_version,
      decision: "allow",
      reason: "filtered_leave_ledger_exported",
      occurred_at: now,
      metadata: { format, row_count: result.totals.row_count, source_version: result.source_version, privacy_boundary: result.privacy_boundary },
    });
    return Object.freeze({
      format,
      file_name: `leave-usage-${now.slice(0, 10)}.${format}`,
      mime_type: format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv;charset=utf-8",
      content_base64: buffer.toString("base64"),
      byte_length: buffer.length,
      row_count: result.totals.row_count,
      totals: result.totals,
      source_version: result.source_version,
      privacy_boundary: result.privacy_boundary,
    });
  }

  function captureSnapshots(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const asOf = optionalDate(input.as_of, "as_of") ?? clock().slice(0, 10);
    const allowed = allowedEmployeeIds(context);
    const employees = new Map(employeeDirectory({ tenant_id: tenantId }).filter((row) => allowed.has(row.employee_id)).map((row) => [row.employee_id, row]));
    const groups = new Map(store.query("select", { table: "hrx_leave_groups", where: { tenant_id: tenantId } }).map((row) => [row.group_id, row]));
    const result = calculateBalances({ tenantId, allowed, employees, groups, asOf });
    const rows = result.rows.filter((balance) => balance.group_id).map((balance) => {
      const existing = store.query("selectOne", { table: "hrx_leave_balance_snapshots", where: { tenant_id: tenantId, employee_id: balance.employee_id, group_id: balance.group_id, as_of: asOf } });
      if (existing) return existing;
      return store.query("insert", { table: "hrx_leave_balance_snapshots", row: {
        tenant_id: tenantId,
        snapshot_id: idFactory("leave_balance_snapshot"),
        employee_id: balance.employee_id,
        group_id: balance.group_id,
        as_of: asOf,
        available_minutes: balance.available_minutes,
        source_version: result.source_version,
        created_at: clock(),
      } });
    });
    return Object.freeze({ as_of: asOf, rows: Object.freeze(rows), count: rows.length, source_version: result.source_version });
  }

  function validateBalances(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const asOf = optionalDate(input.as_of, "as_of") ?? clock().slice(0, 10);
    const allowed = allowedEmployeeIds(context);
    const employees = new Map(employeeDirectory({ tenant_id: tenantId }).filter((row) => allowed.has(row.employee_id)).map((row) => [row.employee_id, row]));
    const groups = new Map(store.query("select", { table: "hrx_leave_groups", where: { tenant_id: tenantId } }).map((row) => [row.group_id, row]));
    const result = calculateBalances({ tenantId, allowed, employees, groups, asOf });
    const snapshots = store.query("select", { table: "hrx_leave_balance_snapshots", where: { tenant_id: tenantId } });
    const rows = result.rows.filter((balance) => balance.group_id).map((balance) => {
      const snapshot = snapshots
        .filter((candidate) => candidate.employee_id === balance.employee_id && candidate.group_id === balance.group_id && candidate.as_of <= asOf)
        .sort((left, right) => right.as_of.localeCompare(left.as_of))[0] ?? null;
      const delta = snapshot ? balance.available_minutes - snapshot.available_minutes : null;
      return Object.freeze({
        employee_id: balance.employee_id,
        employee_display_name: balance.employee_display_name,
        group_id: balance.group_id,
        group_display_name: balance.group_display_name,
        ledger_available_minutes: balance.available_minutes,
        snapshot_available_minutes: snapshot?.available_minutes ?? null,
        snapshot_as_of: snapshot?.as_of ?? null,
        delta_minutes: delta,
        state: !snapshot ? "missing" : delta === 0 ? "match" : "mismatch",
      });
    });
    return Object.freeze({
      as_of: asOf,
      rows: Object.freeze(rows),
      counts: Object.freeze({ match: rows.filter((row) => row.state === "match").length, mismatch: rows.filter((row) => row.state === "mismatch").length, missing: rows.filter((row) => row.state === "missing").length }),
      source_version: result.source_version,
    });
  }

  return Object.freeze({ query, exportReport, captureSnapshots, validateBalances });
}
