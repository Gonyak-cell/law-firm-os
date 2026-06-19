export const HRX_LEAVE_LEDGER_ENTRY_TYPES = Object.freeze(["earned", "used", "adjustment", "carryover", "reserved", "released"]);

const POSITIVE_TYPES = new Set(["earned", "used", "carryover", "reserved", "released"]);

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createLeaveBalanceEntry(input = {}) {
  const entryType = requiredString(input, "entry_type");
  if (!HRX_LEAVE_LEDGER_ENTRY_TYPES.includes(entryType)) {
    throw new TypeError(`entry_type must be one of ${HRX_LEAVE_LEDGER_ENTRY_TYPES.join(", ")}`);
  }
  const amount = requiredAmount(input, "amount");
  if (POSITIVE_TYPES.has(entryType) && amount <= 0) throw new TypeError(`${entryType} amount must be greater than 0`);
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    entry_id: requiredString(input, "entry_id"),
    employee_id: requiredString(input, "employee_id"),
    policy_id: requiredString(input, "policy_id"),
    entry_type: entryType,
    amount,
    occurred_on: requiredString(input, "occurred_on"),
    source_ref: requiredString(input, "source_ref"),
    audit_ref: input.audit_ref ?? null,
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
  });
}

export function calculateLeaveBalance(entries = [], query = {}) {
  const tenantId = requiredString(query, "tenant_id");
  const employeeId = requiredString(query, "employee_id");
  const policyId = requiredString(query, "policy_id");
  const matchingEntries = entries.map(createLeaveBalanceEntry).filter((entry) => {
    return entry.tenant_id === tenantId && entry.employee_id === employeeId && entry.policy_id === policyId;
  });
  const totals = {
    earned: 0,
    used: 0,
    adjustment: 0,
    carryover: 0,
    reserved: 0,
    released: 0,
  };
  for (const entry of matchingEntries) totals[entry.entry_type] += entry.amount;
  const availableBalance =
    totals.earned + totals.carryover + totals.adjustment + totals.released - totals.used - totals.reserved;
  return Object.freeze({
    tenant_id: tenantId,
    employee_id: employeeId,
    policy_id: policyId,
    earned_balance: totals.earned,
    used_balance: totals.used,
    available_balance: availableBalance,
    reserved_balance: totals.reserved,
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
          .map((entry) => Object.freeze(clone(entry))),
      );
    },
    balance(query = {}) {
      return calculateLeaveBalance(entries, query);
    },
  });
}
