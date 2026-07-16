import { createHash } from "node:crypto";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function rawMinutes(row) {
  if (Number.isInteger(row.amount_minutes)) return row.amount_minutes;
  const hours = Number(row.amount ?? 0);
  return Number.isFinite(hours) ? Math.round(hours * 60) : 0;
}

function effectMinutes(row) {
  const amount = rawMinutes(row);
  if (!Number.isInteger(amount) || amount === 0) return 0;
  if (row.entry_type === "adjustment") {
    if (!Number.isInteger(row.amount_minutes)) return amount;
    return row.adjustment_direction === "debit" ? -Math.abs(amount) : Math.abs(amount);
  }
  if (["earned", "carryover", "released"].includes(row.entry_type)) return Math.abs(amount);
  if (["used", "reserved", "expired"].includes(row.entry_type)) return -Math.abs(amount);
  return 0;
}

export function calculateLeavePromotionBalances(input = {}) {
  const tenantId = requiredString(input, "tenant_id");
  const asOf = requiredString(input, "as_of");
  const groupId = typeof input.group_id === "string" && input.group_id.trim() ? input.group_id.trim() : null;
  const policyId = typeof input.policy_id === "string" && input.policy_id.trim() ? input.policy_id.trim() : null;
  if (!groupId && !policyId) throw new TypeError("group_id or policy_id is required");
  const dayMinutes = Number(input.standard_day_minutes);
  if (!Number.isInteger(dayMinutes) || dayMinutes <= 0) throw new TypeError("standard_day_minutes must be a positive integer");
  const allowed = input.employee_ids ? new Set(input.employee_ids) : null;
  const rowsByEmployee = new Map();
  for (const row of input.entries ?? []) {
    if (row.tenant_id !== tenantId) continue;
    if (allowed && !allowed.has(row.employee_id)) continue;
    if (groupId ? row.group_id !== groupId : row.policy_id !== policyId) continue;
    if (typeof row.occurred_on !== "string" || row.occurred_on > asOf) continue;
    if (!rowsByEmployee.has(row.employee_id)) rowsByEmployee.set(row.employee_id, []);
    rowsByEmployee.get(row.employee_id).push(row);
  }
  const rows = [...rowsByEmployee.entries()].map(([employeeId, entries]) => {
    const totals = { earned: 0, carryover: 0, adjustment: 0, reserved: 0, released: 0, used: 0, expired: 0 };
    for (const entry of entries) {
      if (entry.entry_type === "adjustment") totals.adjustment += effectMinutes(entry);
      else if (Object.hasOwn(totals, entry.entry_type)) totals[entry.entry_type] += Math.abs(rawMinutes(entry));
    }
    const availableMinutes = entries.reduce((total, entry) => total + effectMinutes(entry), 0);
    const sourceRows = entries
      .map((entry) => [entry.entry_id, entry.entry_type, entry.amount_minutes ?? entry.amount, entry.adjustment_direction ?? null, entry.occurred_on])
      .sort((left, right) => String(left[0]).localeCompare(String(right[0])));
    return Object.freeze({
      employee_id: employeeId,
      group_id: groupId,
      policy_id: policyId,
      standard_day_minutes: dayMinutes,
      available_minutes: availableMinutes,
      unused_days: Number((availableMinutes / dayMinutes).toFixed(4)),
      earned_minutes: totals.earned,
      carryover_minutes: totals.carryover,
      adjustment_minutes: totals.adjustment,
      reserved_minutes: Math.max(0, totals.reserved - totals.released),
      released_minutes: totals.released,
      used_minutes: totals.used,
      expired_minutes: totals.expired,
      source_version: hash(sourceRows),
      entry_ids: Object.freeze(sourceRows.map((row) => row[0])),
    });
  }).sort((left, right) => left.employee_id.localeCompare(right.employee_id));
  return Object.freeze({
    rows: Object.freeze(rows),
    source_version: hash(rows.map((row) => [row.employee_id, row.available_minutes, row.source_version])),
    calculation_contract: "earned+carryover+adjustment+released-used-reserved-expired",
  });
}
