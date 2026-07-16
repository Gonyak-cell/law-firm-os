function guardedError(message, safeErrorCode, status = 409) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function ledgerConsumption(entries) {
  return entries.reduce((total, entry) => {
    if (["reserved", "used", "expired"].includes(entry.entry_type)) return total + entry.amount_minutes;
    if (entry.entry_type === "released") return total - entry.amount_minutes;
    if (entry.entry_type === "adjustment") {
      return total + (entry.adjustment_direction === "debit" ? entry.amount_minutes : -entry.amount_minutes);
    }
    if (entry.reverses_entry_id && ["earned", "carryover"].includes(entry.entry_type)) return total - entry.amount_minutes;
    return total;
  }, 0);
}

function expiryRank(value) {
  return value || "9999-12-31";
}

export function planEarliestExpiryAllocations({ entitlements = [], ledger_entries = [], requested_minutes, on_date } = {}) {
  if (!Number.isInteger(requested_minutes) || requested_minutes <= 0) {
    throw new TypeError("requested_minutes must be a positive integer");
  }
  if (typeof on_date !== "string" || on_date.trim() === "") throw new TypeError("on_date is required");
  const ordered = entitlements
    .filter((entitlement) => entitlement.valid_from <= on_date && (!entitlement.expires_on || entitlement.expires_on >= on_date))
    .map((entitlement) => {
      const entries = ledger_entries.filter(
        (entry) => entry.tenant_id === entitlement.tenant_id && entry.entitlement_id === entitlement.entitlement_id,
      );
      return { ...entitlement, available_minutes: entitlement.granted_minutes - ledgerConsumption(entries) };
    })
    .filter((entitlement) => entitlement.available_minutes > 0)
    .sort(
      (left, right) =>
        expiryRank(left.expires_on).localeCompare(expiryRank(right.expires_on)) ||
        left.valid_from.localeCompare(right.valid_from) ||
        left.entitlement_id.localeCompare(right.entitlement_id),
    );

  let remaining = requested_minutes;
  const allocations = [];
  for (const entitlement of ordered) {
    const amount = Math.min(remaining, entitlement.available_minutes);
    if (amount > 0) allocations.push(Object.freeze({ entitlement_id: entitlement.entitlement_id, amount_minutes: amount }));
    remaining -= amount;
    if (remaining === 0) break;
  }
  if (remaining > 0) {
    throw guardedError("Leave request amount exceeds available entitlement", "HRX_LEAVE_BALANCE_INSUFFICIENT");
  }
  return Object.freeze(allocations);
}
