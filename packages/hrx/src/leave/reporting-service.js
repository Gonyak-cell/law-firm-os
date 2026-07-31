import { createHash, randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../../audit/src/hrx-event-store-sql.js";
import { calculateLeaveBalance } from "./balance.js";
import {
  HRX_LEAVE_ENTITLEMENT_STATES,
  deriveLeaveEntitlementLifecycle,
} from "./entitlement-lifecycle.js";
import { publicEmployeeDisplayName, publicPeopleLabel } from "../people-presentation.js";
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

const OCCURRENCE_EXPORT_HEADERS = Object.freeze({
  list: Object.freeze([
    "발생 ID",
    "구성원 ID",
    "구성원",
    "조직",
    "휴가 유형",
    "유효 시작일",
    "만료일",
    "상태",
    "발생(분)",
    "사용(분)",
    "예약(분)",
    "소멸(분)",
    "잔여(분)",
  ]),
  month: Object.freeze(["월", "발생 건수", "발생(분)", "사용(분)", "예약(분)", "소멸(분)", "잔여(분)"]),
  type: Object.freeze(["휴가 유형 ID", "휴가 유형", "발생 건수", "발생(분)", "사용(분)", "예약(분)", "소멸(분)", "잔여(분)"]),
});

const LEAVE_GROUP_NAME_FALLBACK = "휴가 그룹 이름 확인 필요";
const LEAVE_POLICY_NAME_FALLBACK = "휴가 기준 이름 확인 필요";
const EMPLOYEE_NAME_FALLBACK = "구성원 이름 확인 필요";
const ORG_UNIT_NAME_FALLBACK = "조직 이름 확인 필요";

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

function optionalString(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim() || null;
}

function occurrenceLimit(value) {
  if (value === undefined || value === null || value === "") return 50;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new TypeError("limit must be an integer between 1 and 100");
  return limit;
}

function encodeOccurrenceCursor(entitlementId) {
  return Buffer.from(JSON.stringify({ version: 1, entitlement_id: entitlementId })).toString("base64url");
}

function decodeOccurrenceCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"));
    if (parsed?.version !== 1 || typeof parsed.entitlement_id !== "string" || parsed.entitlement_id === "") throw new Error();
    return parsed.entitlement_id;
  } catch {
    throw new TypeError("cursor is invalid");
  }
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

function summarizeOccurrences(rows) {
  return Object.freeze(rows.reduce((totals, row) => {
    totals.row_count += 1;
    totals.total_minutes += row.total_minutes;
    totals.used_minutes += row.used_minutes;
    totals.reserved_minutes += row.reserved_minutes;
    totals.expired_minutes += row.expired_minutes;
    totals.remaining_minutes += row.remaining_minutes;
    return totals;
  }, {
    row_count: 0,
    total_minutes: 0,
    used_minutes: 0,
    reserved_minutes: 0,
    expired_minutes: 0,
    remaining_minutes: 0,
  }));
}

function occurrenceSourceVersion(rows) {
  return hash(rows.map((row) => [
    row.entitlement_id,
    row.state_version,
    row.lifecycle_state,
    row.total_minutes,
    row.used_minutes,
    row.reserved_minutes,
    row.expired_minutes,
    row.remaining_minutes,
  ]));
}

function projectOccurrences(rows, keyFor, labelFor) {
  const buckets = new Map();
  for (const row of rows) {
    const key = keyFor(row);
    const bucket = buckets.get(key) ?? { key, label: labelFor(row), rows: [] };
    bucket.rows.push(row);
    buckets.set(key, bucket);
  }
  return Object.freeze([...buckets.values()]
    .map((bucket) => Object.freeze({
      key: bucket.key,
      label: bucket.label,
      totals: summarizeOccurrences(bucket.rows),
    }))
    .sort((left, right) => left.key.localeCompare(right.key)));
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

function occurrenceExportView(value) {
  const view = String(value ?? "list").toLowerCase();
  if (!Object.hasOwn(OCCURRENCE_EXPORT_HEADERS, view)) throw new TypeError("view must be list, month, or type");
  return view;
}

function occurrenceExportRows(projections, view) {
  if (view === "month") {
    return projections.by_month.map((row) => [
      row.key,
      row.totals.row_count,
      row.totals.total_minutes,
      row.totals.used_minutes,
      row.totals.reserved_minutes,
      row.totals.expired_minutes,
      row.totals.remaining_minutes,
    ]);
  }
  if (view === "type") {
    return projections.by_type.map((row) => [
      row.key,
      row.label,
      row.totals.row_count,
      row.totals.total_minutes,
      row.totals.used_minutes,
      row.totals.reserved_minutes,
      row.totals.expired_minutes,
      row.totals.remaining_minutes,
    ]);
  }
  return projections.list.rows.map((row) => [
    row.entitlement_id,
    row.employee_id,
    row.employee_display_name,
    row.org_unit_label ?? "",
    row.group_display_name,
    row.valid_from,
    row.expires_on ?? "",
    row.lifecycle_state,
    row.total_minutes,
    row.used_minutes,
    row.reserved_minutes,
    row.expired_minutes,
    row.remaining_minutes,
  ]);
}

export function createLeaveReportingService({ store, employeeDirectory = () => [], clock = () => new Date().toISOString(), idFactory = (prefix) => `${prefix}_${randomUUID()}` } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("leave reporting service requires a store");

  function occurrenceRows(context, filters = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const allowed = allowedEmployeeIds(context);
    const from = optionalDate(filters.from, "from");
    const to = optionalDate(filters.to, "to");
    if (from && to && to < from) throw new TypeError("to must be on or after from");
    const asOf = optionalDate(filters.as_of, "as_of") ?? clock().slice(0, 10);
    const timezone = optionalString(filters.timezone) ?? "Asia/Seoul";
    const employeeId = optionalString(filters.employee_id);
    const orgUnitId = optionalString(filters.org_unit_id);
    const groupId = optionalString(filters.group_id);
    const state = optionalString(filters.state);
    if (state && !HRX_LEAVE_ENTITLEMENT_STATES.includes(state)) {
      throw new TypeError(`state must be one of ${HRX_LEAVE_ENTITLEMENT_STATES.join(", ")}`);
    }

    const employees = new Map(employeeDirectory({ tenant_id: tenantId })
      .filter((row) => allowed.has(row.employee_id))
      .map((row) => [row.employee_id, row]));
    const groups = new Map(store.query("select", { table: "hrx_leave_groups", where: { tenant_id: tenantId } })
      .map((row) => [row.group_id, row]));
    const entriesByEntitlement = new Map();
    for (const entry of store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId } })) {
      if (!allowed.has(entry.employee_id)) continue;
      const rows = entriesByEntitlement.get(entry.entitlement_id) ?? [];
      rows.push(entry);
      entriesByEntitlement.set(entry.entitlement_id, rows);
    }

    return store.query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId } })
      .filter((entitlement) => allowed.has(entitlement.employee_id))
      .map((entitlement) => {
        const employee = employees.get(entitlement.employee_id) ?? null;
        const entries = entriesByEntitlement.get(entitlement.entitlement_id) ?? [];
        const lifecycle = deriveLeaveEntitlementLifecycle({
          entitlement,
          ledger_entries: entries,
          as_of: asOf,
          timezone,
        });
        const effectiveEntries = entries.filter((entry) => !entry.occurred_on || entry.occurred_on <= asOf);
        const balance = calculateLeaveBalance(effectiveEntries, {
          tenant_id: tenantId,
          employee_id: entitlement.employee_id,
          group_id: entitlement.group_id,
        });
        return Object.freeze({
          entitlement_id: entitlement.entitlement_id,
          employee_id: entitlement.employee_id,
          employee_display_name: publicEmployeeDisplayName(employee, EMPLOYEE_NAME_FALLBACK),
          org_unit_id: employee?.org_unit_id ?? null,
          org_unit_label: publicPeopleLabel(employee?.org_unit_label, {
            references: [employee?.org_unit_id],
            fallback: ORG_UNIT_NAME_FALLBACK,
          }),
          group_id: entitlement.group_id,
          group_display_name: publicPeopleLabel(groups.get(entitlement.group_id)?.display_name, {
            references: [entitlement.group_id, entitlement.policy_version_id],
            fallback: LEAVE_GROUP_NAME_FALLBACK,
          }),
          policy_version_id: entitlement.policy_version_id,
          valid_from: entitlement.valid_from,
          expires_on: entitlement.expires_on ?? null,
          lifecycle_state: lifecycle.state,
          state_version: entitlement.state_version,
          total_minutes: Number(entitlement.granted_minutes),
          used_minutes: balance.used_minutes ?? 0,
          reserved_minutes: Math.max(0, balance.reserved_minutes ?? 0),
          expired_minutes: balance.expired_minutes ?? 0,
          remaining_minutes: Math.max(0, balance.available_minutes ?? 0),
        });
      })
      .filter((row) => !employeeId || (allowed.has(employeeId) && row.employee_id === employeeId))
      .filter((row) => !orgUnitId || row.org_unit_id === orgUnitId)
      .filter((row) => !groupId || row.group_id === groupId)
      .filter((row) => !state || row.lifecycle_state === state)
      .filter((row) => !from || !row.expires_on || row.expires_on >= from)
      .filter((row) => !to || row.valid_from <= to)
      .sort((left, right) => right.valid_from.localeCompare(left.valid_from)
        || left.employee_display_name.localeCompare(right.employee_display_name, "ko")
        || left.entitlement_id.localeCompare(right.entitlement_id));
  }

  function queryOccurrences(context, filters = {}) {
    const rows = occurrenceRows(context, filters);
    const limit = occurrenceLimit(filters.limit);
    const cursorId = decodeOccurrenceCursor(filters.cursor);
    let start = 0;
    if (cursorId) {
      const cursorIndex = rows.findIndex((row) => row.entitlement_id === cursorId);
      if (cursorIndex === -1) throw new TypeError("cursor is outside the filtered result");
      start = cursorIndex + 1;
    }
    const page = rows.slice(start, start + limit);
    const hasMore = start + page.length < rows.length;
    const sourceVersion = occurrenceSourceVersion(rows);
    return Object.freeze({
      rows: Object.freeze(page),
      totals: summarizeOccurrences(rows),
      limit,
      next_cursor: hasMore && page.length ? encodeOccurrenceCursor(page.at(-1).entitlement_id) : null,
      source_version: sourceVersion,
      privacy_boundary: "reason_attachment_and_source_reference_excluded",
    });
  }

  function occurrenceProjections(context, filters = {}) {
    const rows = occurrenceRows(context, filters);
    const totals = summarizeOccurrences(rows);
    const sourceVersion = occurrenceSourceVersion(rows);
    return Object.freeze({
      list: Object.freeze({ rows: Object.freeze(rows), totals }),
      by_month: projectOccurrences(rows, (row) => row.valid_from.slice(0, 7), (row) => row.valid_from.slice(0, 7)),
      by_type: projectOccurrences(rows, (row) => row.group_id, (row) => row.group_display_name),
      totals,
      source_version: sourceVersion,
      privacy_boundary: "reason_attachment_and_source_reference_excluded",
    });
  }

  function exportOccurrences(context, filters = {}) {
    const format = String(filters.format ?? "csv").toLowerCase();
    if (!["csv", "xlsx"].includes(format)) throw new TypeError("format must be csv or xlsx");
    const view = occurrenceExportView(filters.view);
    const projections = occurrenceProjections(context, filters);
    const headers = OCCURRENCE_EXPORT_HEADERS[view];
    const rows = occurrenceExportRows(projections, view);
    const buffer = format === "xlsx"
      ? createXlsxBuffer({ headers, rows, sheetName: "휴가 발생 내역" })
      : Buffer.from(createCsv(headers, rows), "utf8");
    const now = clock();
    createSqlHrxAuditEventStore({ store }).append({
      event_id: idFactory("leave_occurrence_export"),
      tenant_id: requiredString(context, "tenant_id"),
      actor_id: requiredString(context, "actor_id"),
      action: "hrx.leave.occurrence.export",
      object_type: "LeaveEntitlementExport",
      object_id: projections.source_version,
      decision: "allow",
      reason: "filtered_leave_occurrences_exported",
      occurred_at: now,
      metadata: {
        format,
        view,
        exported_row_count: rows.length,
        occurrence_count: projections.totals.row_count,
        source_version: projections.source_version,
        privacy_boundary: projections.privacy_boundary,
      },
    });
    return Object.freeze({
      format,
      view,
      file_name: `leave-occurrences-${view}-${now.slice(0, 10)}.${format}`,
      mime_type: format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv;charset=utf-8",
      content_base64: buffer.toString("base64"),
      byte_length: buffer.length,
      row_count: rows.length,
      occurrence_count: projections.totals.row_count,
      totals: projections.totals,
      source_version: projections.source_version,
      privacy_boundary: projections.privacy_boundary,
    });
  }

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
        employee_display_name: publicEmployeeDisplayName(employees.get(rowEmployeeId), EMPLOYEE_NAME_FALLBACK),
        group_id: bucket.scope.kind === "group" ? bucket.scope.id : null,
        group_display_name: bucket.scope.kind === "group"
          ? publicPeopleLabel(groups.get(bucket.scope.id)?.display_name, {
            references: [bucket.scope.id],
            fallback: LEAVE_GROUP_NAME_FALLBACK,
          })
          : LEAVE_POLICY_NAME_FALLBACK,
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
          employee_display_name: publicEmployeeDisplayName(employees.get(row.employee_id), EMPLOYEE_NAME_FALLBACK),
          group_id: row.group_id ?? null,
          group_display_name: publicPeopleLabel(groups.get(row.group_id)?.display_name, {
            references: [row.group_id, row.policy_id, row.policy_version_id],
            fallback: row.policy_id ? LEAVE_POLICY_NAME_FALLBACK : LEAVE_GROUP_NAME_FALLBACK,
          }),
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

  return Object.freeze({ query, queryOccurrences, occurrenceProjections, exportOccurrences, exportReport, captureSnapshots, validateBalances });
}
