import {
  HRX_LEAVE_ENTITLEMENT_STATES,
  deriveLeaveEntitlementLifecycle,
} from "./entitlement-lifecycle.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function guardedError(message, safeErrorCode, status = 400) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function optionalString(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).trim() || null;
}

function pageLimit(value) {
  if (value === undefined || value === null || value === "") return 50;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw guardedError("limit must be an integer between 1 and 100", "HRX_LEAVE_ENTITLEMENT_LIMIT_INVALID");
  }
  return limit;
}

function encodeCursor(entitlementId) {
  return Buffer.from(JSON.stringify({ version: 1, entitlement_id: entitlementId })).toString("base64url");
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"));
    if (parsed?.version !== 1 || typeof parsed.entitlement_id !== "string" || parsed.entitlement_id === "") throw new Error();
    return parsed.entitlement_id;
  } catch {
    throw guardedError("cursor is invalid", "HRX_LEAVE_ENTITLEMENT_CURSOR_INVALID");
  }
}

function ledgerEffect(entry) {
  if (!Number.isInteger(entry?.amount_minutes) || entry.amount_minutes <= 0) return 0;
  if (["earned", "carryover", "released"].includes(entry.entry_type)) return entry.amount_minutes;
  if (["used", "reserved", "expired"].includes(entry.entry_type)) return -entry.amount_minutes;
  if (entry.entry_type === "adjustment") return entry.adjustment_direction === "credit" ? entry.amount_minutes : -entry.amount_minutes;
  return 0;
}

function entitlementView(entitlement, entries, input) {
  const lifecycle = deriveLeaveEntitlementLifecycle({
    entitlement,
    ledger_entries: entries,
    as_of: input.as_of,
    at: input.at,
    timezone: input.timezone,
  });
  const availableMinutes = entries
    .filter((entry) => !entry.occurred_on || entry.occurred_on <= lifecycle.as_of)
    .reduce((total, entry) => total + ledgerEffect(entry), 0);
  return Object.freeze({
    entitlement_id: entitlement.entitlement_id,
    employee_id: entitlement.employee_id,
    group_id: entitlement.group_id,
    policy_version_id: entitlement.policy_version_id,
    granted_minutes: entitlement.granted_minutes,
    available_minutes: Math.max(0, availableMinutes),
    valid_from: entitlement.valid_from,
    expires_on: entitlement.expires_on,
    state_version: entitlement.state_version,
    lifecycle_state: lifecycle.state,
    as_of: lifecycle.as_of,
    timezone: lifecycle.timezone,
  });
}

export function createLeaveEntitlementReadService({ store, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("leave entitlement read service requires a store");

  function sourceRows(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const authorizedEmployeeIds = new Set(Array.isArray(context.authorized_employee_ids) ? context.authorized_employee_ids : []);
    const entriesByEntitlement = new Map();
    for (const entry of store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId } })) {
      const rows = entriesByEntitlement.get(entry.entitlement_id) ?? [];
      rows.push(entry);
      entriesByEntitlement.set(entry.entitlement_id, rows);
    }
    const lifecycleInput = {
      as_of: optionalString(input.as_of) ?? undefined,
      at: input.as_of ? undefined : clock(),
      timezone: optionalString(input.timezone) ?? "Asia/Seoul",
    };
    return store
      .query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId } })
      .filter((row) => authorizedEmployeeIds.has(row.employee_id))
      .map((row) => entitlementView(row, entriesByEntitlement.get(row.entitlement_id) ?? [], lifecycleInput));
  }

  function list(context, input = {}) {
    const employeeId = optionalString(input.employee_id);
    const groupId = optionalString(input.group_id);
    const policyVersionId = optionalString(input.policy_version_id);
    const state = optionalString(input.state);
    if (state && !HRX_LEAVE_ENTITLEMENT_STATES.includes(state)) {
      throw guardedError("state is invalid", "HRX_LEAVE_ENTITLEMENT_STATE_INVALID");
    }
    const limit = pageLimit(input.limit);
    const cursorId = decodeCursor(input.cursor);
    const rows = sourceRows(context, input)
      .filter((row) => !employeeId || row.employee_id === employeeId)
      .filter((row) => !groupId || row.group_id === groupId)
      .filter((row) => !policyVersionId || row.policy_version_id === policyVersionId)
      .filter((row) => !state || row.lifecycle_state === state)
      .sort((left, right) => left.entitlement_id.localeCompare(right.entitlement_id));
    let start = 0;
    if (cursorId) {
      const cursorIndex = rows.findIndex((row) => row.entitlement_id === cursorId);
      if (cursorIndex === -1) throw guardedError("cursor is outside the filtered result", "HRX_LEAVE_ENTITLEMENT_CURSOR_INVALID");
      start = cursorIndex + 1;
    }
    const page = rows.slice(start, start + limit);
    const hasMore = start + page.length < rows.length;
    return Object.freeze({
      rows: Object.freeze(page),
      total: rows.length,
      limit,
      next_cursor: hasMore && page.length ? encodeCursor(page.at(-1).entitlement_id) : null,
    });
  }

  function detail(context, entitlementId, input = {}) {
    const normalizedId = requiredString({ entitlement_id: entitlementId }, "entitlement_id");
    return sourceRows(context, input).find((row) => row.entitlement_id === normalizedId) ?? null;
  }

  return Object.freeze({ list, detail });
}
