export const HRX_LEAVE_ENTITLEMENT_STATES = Object.freeze([
  "scheduled",
  "active",
  "expired",
  "cancelled",
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function requiredDate(value, field) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) throw new TypeError(`${field} must be an ISO date`);
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TypeError(`${field} must be a valid ISO date`);
  }
  return value;
}

function localDate(at, timezone) {
  const instant = at === undefined ? new Date() : new Date(at);
  if (Number.isNaN(instant.getTime())) throw new TypeError("at must be a valid date or instant");
  let parts;
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
  } catch {
    throw new TypeError("timezone must be a valid IANA timezone");
  }
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function ledgerEffect(entry) {
  if (!Number.isInteger(entry?.amount_minutes) || entry.amount_minutes <= 0) return null;
  if (["earned", "carryover", "released"].includes(entry.entry_type)) return entry.amount_minutes;
  if (["used", "reserved", "expired"].includes(entry.entry_type)) return -entry.amount_minutes;
  if (entry.entry_type === "adjustment") {
    if (entry.adjustment_direction === "credit") return entry.amount_minutes;
    if (entry.adjustment_direction === "debit") return -entry.amount_minutes;
  }
  return null;
}

function isGrantCredit(entry) {
  return (
    !entry.reverses_entry_id &&
    (["earned", "carryover"].includes(entry.entry_type) ||
      (entry.entry_type === "adjustment" && entry.adjustment_direction === "credit"))
  );
}

function cancellationEntry(entitlement, entries, asOf) {
  const allMatching = entries.filter(
    (entry) =>
      entry?.tenant_id === entitlement.tenant_id &&
      entry?.entitlement_id === entitlement.entitlement_id,
  );
  const sources = new Map(
    allMatching
      .filter((entry) => isGrantCredit(entry) && ledgerEffect(entry) > 0)
      .map((entry) => [entry.entry_id, entry]),
  );
  return (
    allMatching
      .filter((entry) => {
        if (entry.occurred_on && requiredDate(entry.occurred_on, "ledger entry occurred_on") > asOf) return false;
        const source = sources.get(entry.reverses_entry_id);
        return source && ledgerEffect(entry) === -ledgerEffect(source);
      })
      .sort(
        (left, right) =>
          String(left.occurred_on ?? "").localeCompare(String(right.occurred_on ?? "")) ||
          String(left.entry_id).localeCompare(String(right.entry_id)),
      )[0] ?? null
  );
}

export function deriveLeaveEntitlementLifecycle({
  entitlement,
  ledger_entries = [],
  as_of,
  at,
  timezone = "Asia/Seoul",
} = {}) {
  if (!entitlement || typeof entitlement !== "object") throw new TypeError("entitlement is required");
  if (typeof entitlement.tenant_id !== "string" || entitlement.tenant_id.trim() === "") {
    throw new TypeError("entitlement.tenant_id is required");
  }
  if (typeof entitlement.entitlement_id !== "string" || entitlement.entitlement_id.trim() === "") {
    throw new TypeError("entitlement.entitlement_id is required");
  }
  if (!Array.isArray(ledger_entries)) throw new TypeError("ledger_entries must be an array");
  if (typeof timezone !== "string" || timezone.trim() === "") throw new TypeError("timezone is required");
  const normalizedTimezone = timezone.trim();

  const validFrom = requiredDate(entitlement.valid_from, "entitlement.valid_from");
  const expiresOn = entitlement.expires_on
    ? requiredDate(entitlement.expires_on, "entitlement.expires_on")
    : null;
  if (expiresOn && expiresOn < validFrom) throw new TypeError("entitlement.expires_on must not precede valid_from");
  localDate("2000-01-01T00:00:00.000Z", normalizedTimezone);
  const asOf = as_of === undefined ? localDate(at, normalizedTimezone) : requiredDate(as_of, "as_of");
  const cancellation = cancellationEntry(entitlement, ledger_entries, asOf);
  const state = cancellation
    ? "cancelled"
    : asOf < validFrom
      ? "scheduled"
      : expiresOn && asOf > expiresOn
        ? "expired"
        : "active";

  return Object.freeze({
    entitlement_id: entitlement.entitlement_id,
    state,
    as_of: asOf,
    timezone: normalizedTimezone,
    valid_from: validFrom,
    expires_on: expiresOn,
    cancelled_by_entry_id: cancellation?.entry_id ?? null,
  });
}

export function previewLeaveEntitlementExpirations({
  entitlements = [],
  ledger_entries = [],
  as_of,
  at,
  timezone = "Asia/Seoul",
} = {}) {
  if (!Array.isArray(entitlements)) throw new TypeError("entitlements must be an array");
  if (!Array.isArray(ledger_entries)) throw new TypeError("ledger_entries must be an array");
  if (typeof timezone !== "string" || timezone.trim() === "") throw new TypeError("timezone is required");
  const normalizedTimezone = timezone.trim();
  const asOf = as_of === undefined
    ? localDate(at, normalizedTimezone)
    : requiredDate(as_of, "as_of");
  localDate("2000-01-01T00:00:00.000Z", normalizedTimezone);

  const rows = entitlements
    .map((entitlement) => {
      const lifecycle = deriveLeaveEntitlementLifecycle({
        entitlement,
        ledger_entries,
        as_of: asOf,
        timezone: normalizedTimezone,
      });
      if (lifecycle.state !== "expired") return null;
      const remainingMinutes = Math.max(
        0,
        ledger_entries
          .filter(
            (entry) =>
              entry?.tenant_id === entitlement.tenant_id &&
              entry?.entitlement_id === entitlement.entitlement_id &&
              (!entry.occurred_on || requiredDate(entry.occurred_on, "ledger entry occurred_on") <= asOf),
          )
          .reduce((total, entry) => total + (ledgerEffect(entry) ?? 0), 0),
      );
      if (remainingMinutes === 0) return null;
      return Object.freeze({
        tenant_id: entitlement.tenant_id,
        entitlement_id: entitlement.entitlement_id,
        employee_id: entitlement.employee_id ?? null,
        group_id: entitlement.group_id ?? null,
        policy_version_id: entitlement.policy_version_id ?? null,
        expires_on: lifecycle.expires_on,
        remaining_minutes: remainingMinutes,
      });
    })
    .filter(Boolean)
    .sort(
      (left, right) =>
        left.expires_on.localeCompare(right.expires_on) ||
        String(left.employee_id ?? "").localeCompare(String(right.employee_id ?? "")) ||
        left.entitlement_id.localeCompare(right.entitlement_id),
    );

  return Object.freeze({
    as_of: asOf,
    timezone: normalizedTimezone,
    rows: Object.freeze(rows),
    totals: Object.freeze({
      candidate_count: rows.length,
      expiration_minutes: rows.reduce((total, row) => total + row.remaining_minutes, 0),
    }),
  });
}
