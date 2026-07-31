export const HRX_LEAVE_LEDGER_ENTRY_TYPES = Object.freeze([
  "earned",
  "used",
  "adjustment",
  "carryover",
  "reserved",
  "released",
  "expired",
]);

const POSITIVE_TYPES = new Set(["earned", "used", "carryover", "reserved", "released", "expired"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredAmount(input, field) {
  const value = input?.[field];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${field} must be a finite number`);
  if (value === 0) throw new TypeError(`${field} must not be 0`);
  return value;
}

function requiredPositiveInteger(input, field) {
  const value = input?.[field];
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${field} must be a positive integer`);
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createLeaveBalanceEntry(input = {}) {
  const entryType = requiredString(input, "entry_type");
  if (!HRX_LEAVE_LEDGER_ENTRY_TYPES.includes(entryType)) {
    throw new TypeError(`entry_type must be one of ${HRX_LEAVE_LEDGER_ENTRY_TYPES.join(", ")}`);
  }
  const modern = input.amount_minutes !== undefined && input.amount_minutes !== null;
  const amountMinutes = modern ? requiredPositiveInteger(input, "amount_minutes") : null;
  const amount = modern
    ? input.amount === undefined
      ? amountMinutes / 60
      : requiredAmount(input, "amount")
    : requiredAmount(input, "amount");
  if (POSITIVE_TYPES.has(entryType) && amount <= 0) throw new TypeError(`${entryType} amount must be greater than 0`);
  const adjustmentDirection = input.adjustment_direction ?? null;
  if (modern && entryType === "adjustment" && !["credit", "debit"].includes(adjustmentDirection)) {
    throw new TypeError("adjustment_direction must be credit or debit for a minute ledger adjustment");
  }
  if (modern && entryType !== "adjustment" && adjustmentDirection !== null) {
    throw new TypeError("adjustment_direction is only valid for adjustment entries");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    entry_id: requiredString(input, "entry_id"),
    employee_id: requiredString(input, "employee_id"),
    policy_id: requiredString(input, "policy_id"),
    group_id: modern ? requiredString(input, "group_id") : input.group_id ?? null,
    policy_version_id: modern ? requiredString(input, "policy_version_id") : input.policy_version_id ?? null,
    entitlement_id: modern ? requiredString(input, "entitlement_id") : input.entitlement_id ?? null,
    allocation_id: input.allocation_id ?? null,
    reverses_entry_id: input.reverses_entry_id ?? null,
    idempotency_key: modern ? requiredString(input, "idempotency_key") : input.idempotency_key ?? null,
    entry_type: entryType,
    amount,
    amount_minutes: amountMinutes,
    adjustment_direction: adjustmentDirection,
    occurred_on: requiredString(input, "occurred_on"),
    source_ref: requiredString(input, "source_ref"),
    audit_ref: input.audit_ref ?? null,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

export function calculateLeaveBalance(entries = [], query = {}) {
  const tenantId = requiredString(query, "tenant_id");
  const employeeId = requiredString(query, "employee_id");
  const groupId = query.group_id ? requiredString(query, "group_id") : null;
  const policyId = groupId ? query.policy_id ?? null : requiredString(query, "policy_id");
  const matchingEntries = entries.map(createLeaveBalanceEntry).filter((entry) => {
    return (
      entry.tenant_id === tenantId &&
      entry.employee_id === employeeId &&
      (groupId ? entry.group_id === groupId : entry.policy_id === policyId)
    );
  });
  const totals = {
    earned: 0,
    used: 0,
    adjustment: 0,
    carryover: 0,
    reserved: 0,
    released: 0,
    expired: 0,
  };
  const usesMinutes = matchingEntries.some((entry) => Number.isInteger(entry.amount_minutes));
  for (const entry of matchingEntries) {
    const value = usesMinutes ? entry.amount_minutes ?? Math.round(entry.amount * 60) : entry.amount;
    if (entry.entry_type === "adjustment" && usesMinutes) {
      totals.adjustment += entry.adjustment_direction === "debit" ? -value : value;
    } else {
      totals[entry.entry_type] += value;
    }
  }
  const availableBalance =
    totals.earned + totals.carryover + totals.adjustment + totals.released - totals.used - totals.reserved - totals.expired;
  const reservedBalance = totals.reserved - totals.released;
  return Object.freeze({
    tenant_id: tenantId,
    employee_id: employeeId,
    policy_id: policyId,
    group_id: groupId,
    earned_balance: totals.earned,
    used_balance: totals.used,
    available_balance: availableBalance,
    reserved_balance: reservedBalance,
    expired_balance: totals.expired,
    ...(usesMinutes
      ? {
          earned_minutes: totals.earned,
          used_minutes: totals.used,
          available_minutes: availableBalance,
          reserved_minutes: reservedBalance,
          expired_minutes: totals.expired,
        }
      : {}),
    entry_ids: Object.freeze(matchingEntries.map((entry) => entry.entry_id)),
  });
}

export function createInMemoryLeaveBalanceLedger(seed = []) {
  const entries = [];
  const entryIds = new Set();

  function append(input) {
    const entry = createLeaveBalanceEntry(input);
    if (entryIds.has(entry.entry_id)) throw new Error(`Duplicate leave ledger entry: ${entry.entry_id}`);
    entryIds.add(entry.entry_id);
    entries.push(clone(entry));
    return Object.freeze(clone(entry));
  }

  for (const entry of seed) append(entry);

  return Object.freeze({
    append,
    list(query = {}) {
      return Object.freeze(
        entries
          .filter((entry) => !query.tenant_id || entry.tenant_id === query.tenant_id)
          .filter((entry) => !query.employee_id || entry.employee_id === query.employee_id)
          .filter((entry) => !query.policy_id || entry.policy_id === query.policy_id)
          .filter((entry) => !query.group_id || entry.group_id === query.group_id)
          .map((entry) => Object.freeze(clone(entry))),
      );
    },
    balance(query = {}) {
      return calculateLeaveBalance(entries, query);
    },
  });
}

export function createSqlLeaveBalanceLedger({ store, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL leave balance ledger requires store.query");

  function list(query = {}) {
    const where = {};
    if (query.tenant_id) where.tenant_id = query.tenant_id;
    if (query.employee_id) where.employee_id = query.employee_id;
    if (query.policy_id) where.policy_id = query.policy_id;
    if (query.group_id) where.group_id = query.group_id;
    return Object.freeze(
      store
        .query("select", { table: "hrx_leave_balance_entries", where })
        .sort((left, right) => left.entry_id.localeCompare(right.entry_id))
        .map((row) =>
          Object.freeze({
            ...row,
            metadata: Object.freeze(row.metadata ?? JSON.parse(row.metadata_json ?? "{}")),
          }),
        ),
    );
  }

  return Object.freeze({
    append(input) {
      const entry = createLeaveBalanceEntry(input);
      const row = {
        ...entry,
        metadata_json: JSON.stringify(entry.metadata ?? {}),
        created_at: clock(),
      };
      return Object.freeze(store.query("insert", { table: "hrx_leave_balance_entries", row }));
    },
    list,
    balance(query = {}) {
      return calculateLeaveBalance(list(query), query);
    },
  });
}
