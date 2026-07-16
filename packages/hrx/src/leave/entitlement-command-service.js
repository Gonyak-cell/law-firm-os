import { createHash, randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../../audit/src/hrx-event-store-sql.js";
import { createSqlLeaveBalanceLedger } from "./balance.js";
import { deriveLeaveEntitlementLifecycle } from "./entitlement-lifecycle.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function positiveInteger(input, field) {
  const value = input?.[field];
  if (!Number.isInteger(value) || value <= 0) throw new TypeError(`${field} must be a positive integer`);
  return value;
}

function guardedError(message, safeErrorCode, status = 409) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function requireStepUp(context) {
  if (context?.step_up_verified !== true) throw guardedError("Fresh MFA is required", "HRX_STEP_UP_REQUIRED", 403);
}

function entryEffect(entry) {
  if (!Number.isInteger(entry?.amount_minutes) || entry.amount_minutes <= 0) return 0;
  if (["earned", "carryover", "released"].includes(entry.entry_type)) return entry.amount_minutes;
  if (["used", "reserved", "expired"].includes(entry.entry_type)) return -entry.amount_minutes;
  if (entry.entry_type === "adjustment") return entry.adjustment_direction === "credit" ? entry.amount_minutes : -entry.amount_minutes;
  return 0;
}

function isGrantCredit(entry) {
  return !entry.reverses_entry_id && (
    ["earned", "carryover"].includes(entry.entry_type) ||
    (entry.entry_type === "adjustment" && entry.adjustment_direction === "credit")
  );
}

function entitlementEntries(store, tenantId, entitlementId) {
  return store.query("select", {
    table: "hrx_leave_balance_entries",
    where: { tenant_id: tenantId, entitlement_id: entitlementId },
  }).sort((left, right) => left.entry_id.localeCompare(right.entry_id));
}

function entitlement(store, tenantId, entitlementId) {
  const row = store.query("selectOne", {
    table: "hrx_leave_entitlements",
    where: { tenant_id: tenantId, entitlement_id: entitlementId },
  });
  if (!row) throw guardedError("Leave entitlement not found", "HRX_LEAVE_ENTITLEMENT_NOT_FOUND", 404);
  return row;
}

function policy(store, tenantId, policyVersionId) {
  const row = store.query("selectOne", {
    table: "hrx_leave_policy_versions",
    where: { tenant_id: tenantId, policy_version_id: policyVersionId },
  });
  if (!row) throw guardedError("Leave policy not found", "HRX_LEAVE_POLICY_NOT_FOUND", 404);
  return row;
}

function lifecycle(row, entries, input, clock) {
  return deriveLeaveEntitlementLifecycle({
    entitlement: row,
    ledger_entries: entries,
    as_of: input.as_of,
    at: input.as_of ? undefined : clock(),
    timezone: input.timezone ?? "Asia/Seoul",
  });
}

function requireExpectedVersion(input) {
  return positiveInteger(input, "expected_version");
}

function receiptResult(receipt, replayed = false) {
  return Object.freeze({ ...JSON.parse(receipt.result_json), replayed });
}

function existingReceipt(store, tenantId, idempotencyKey, inputHash) {
  const receipt = store.query("selectOne", {
    table: "hrx_leave_command_receipts",
    where: { tenant_id: tenantId, idempotency_key: idempotencyKey },
  });
  if (!receipt) return null;
  if (receipt.input_hash !== inputHash) {
    throw guardedError("Idempotency key was reused with different input", "HRX_LEAVE_IDEMPOTENCY_KEY_REUSED");
  }
  return receiptResult(receipt, true);
}

function insertReceipt(tx, { tenantId, idempotencyKey, commandType, inputHash, result, now, idFactory }) {
  return tx.query("insert", {
    table: "hrx_leave_command_receipts",
    row: {
      tenant_id: tenantId,
      command_receipt_id: idFactory("leave_entitlement_command"),
      idempotency_key: idempotencyKey,
      command_type: commandType,
      request_id: null,
      input_hash: inputHash,
      result_json: JSON.stringify(result),
      created_at: now,
    },
  });
}

function appendAudit(tx, { tenantId, actorId, entitlementId, action, reason, metadata, now, idFactory }) {
  createSqlHrxAuditEventStore({ store: tx }).append({
    event_id: idFactory("leave_audit_entitlement_command"),
    tenant_id: tenantId,
    actor_id: actorId,
    action,
    object_type: "LeaveEntitlement",
    object_id: entitlementId,
    decision: "allow",
    reason,
    occurred_at: now,
    metadata,
  });
}

function patchDates(input, current) {
  const supported = new Set(["entitlement_id", "expected_version", "idempotency_key", "valid_from", "expires_on", "as_of", "timezone"]);
  for (const field of Object.keys(input)) {
    if (!supported.has(field)) throw guardedError(`Unsupported entitlement patch field: ${field}`, "HRX_LEAVE_ENTITLEMENT_PATCH_FIELD_UNSUPPORTED", 400);
  }
  if (!Object.hasOwn(input, "valid_from") && !Object.hasOwn(input, "expires_on")) {
    throw guardedError("Scheduled entitlement patch requires valid_from or expires_on", "HRX_LEAVE_ENTITLEMENT_PATCH_EMPTY", 400);
  }
  return {
    valid_from: input.valid_from ?? current.valid_from,
    expires_on: Object.hasOwn(input, "expires_on") ? input.expires_on : current.expires_on,
  };
}

export function createLeaveEntitlementCommandService({
  store,
  clock = () => new Date().toISOString(),
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
} = {}) {
  if (!store || typeof store.query !== "function" || typeof store.transaction !== "function") {
    throw new TypeError("leave entitlement command service requires a transactional store");
  }

  function patchScheduled(context, input = {}) {
    requireStepUp(context);
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const entitlementId = requiredString(input, "entitlement_id");
    const expectedVersion = requireExpectedVersion(input);
    const idempotencyKey = requiredString(input, "idempotency_key");
    const inputHash = hash(input);
    const replay = existingReceipt(store, tenantId, idempotencyKey, inputHash);
    if (replay) return replay;
    const now = clock();
    return store.transaction((tx) => {
      const current = entitlement(tx, tenantId, entitlementId);
      const entries = entitlementEntries(tx, tenantId, entitlementId);
      const currentLifecycle = lifecycle(current, entries, input, clock);
      if (currentLifecycle.state !== "scheduled") {
        throw guardedError("Started entitlement is immutable; append an adjustment instead", "HRX_LEAVE_ENTITLEMENT_IMMUTABLE");
      }
      const dates = patchDates(input, current);
      const nextLifecycle = lifecycle({ ...current, ...dates }, entries, input, clock);
      if (nextLifecycle.state !== "scheduled") {
        throw guardedError("Scheduled entitlement patch must remain in the future", "HRX_LEAVE_ENTITLEMENT_PATCH_NOT_SCHEDULED");
      }
      const updated = tx.query("updateOne", {
        table: "hrx_leave_entitlements",
        where: { tenant_id: tenantId, entitlement_id: entitlementId },
        expected_version: expectedVersion,
        patch: { ...dates, state_version: expectedVersion + 1, updated_at: now },
      });
      const result = Object.freeze({
        command: "patch_scheduled",
        entitlement_id: entitlementId,
        state: nextLifecycle.state,
        state_version: updated.state_version,
        valid_from: updated.valid_from,
        expires_on: updated.expires_on,
      });
      const receipt = insertReceipt(tx, { tenantId, idempotencyKey, commandType: "leave_entitlement_patch_scheduled", inputHash, result, now, idFactory });
      appendAudit(tx, { tenantId, actorId, entitlementId, action: "hrx.leave.entitlement.patch", reason: "scheduled_leave_entitlement_dates_updated", metadata: { state_version: updated.state_version, valid_from: updated.valid_from, expires_on: updated.expires_on }, now, idFactory });
      return receiptResult(receipt);
    });
  }

  function cancelScheduled(context, input = {}) {
    requireStepUp(context);
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const entitlementId = requiredString(input, "entitlement_id");
    const expectedVersion = requireExpectedVersion(input);
    const idempotencyKey = requiredString(input, "idempotency_key");
    const reasonCode = requiredString(input, "reason_code");
    const inputHash = hash(input);
    const replay = existingReceipt(store, tenantId, idempotencyKey, inputHash);
    if (replay) return replay;
    const now = clock();
    return store.transaction((tx) => {
      const current = entitlement(tx, tenantId, entitlementId);
      const entries = entitlementEntries(tx, tenantId, entitlementId);
      const currentLifecycle = lifecycle(current, entries, input, clock);
      if (currentLifecycle.state !== "scheduled") {
        throw guardedError("Only a scheduled entitlement can be cancelled directly", "HRX_LEAVE_ENTITLEMENT_CANCEL_NOT_SCHEDULED");
      }
      const reversedIds = new Set(entries.map((entry) => entry.reverses_entry_id).filter(Boolean));
      const grantEntries = entries.filter((entry) => isGrantCredit(entry) && !reversedIds.has(entry.entry_id));
      const allowedIds = new Set([
        ...entries.filter(isGrantCredit).map((entry) => entry.entry_id),
        ...entries.filter((entry) => entry.reverses_entry_id).map((entry) => entry.entry_id),
      ]);
      if (grantEntries.length === 0 || entries.some((entry) => !allowedIds.has(entry.entry_id))) {
        throw guardedError("Scheduled entitlement contains use or adjustment activity", "HRX_LEAVE_ENTITLEMENT_CANCEL_NOT_PRISTINE");
      }
      const policyRow = policy(tx, tenantId, current.policy_version_id);
      const ledger = createSqlLeaveBalanceLedger({ store: tx });
      const reversals = grantEntries.map((source, index) => ledger.append({
        tenant_id: tenantId,
        entry_id: idFactory("leave_ledger_entitlement_cancel"),
        employee_id: current.employee_id,
        policy_id: policyRow.policy_code,
        group_id: current.group_id,
        policy_version_id: current.policy_version_id,
        entitlement_id: entitlementId,
        reverses_entry_id: source.entry_id,
        idempotency_key: `${idempotencyKey}:reversal:${index + 1}`,
        entry_type: "adjustment",
        adjustment_direction: "debit",
        amount_minutes: source.amount_minutes,
        occurred_on: currentLifecycle.as_of,
        source_ref: source.source_ref,
        metadata: { reason_code: reasonCode, command: "cancel_scheduled_entitlement" },
      }));
      const updated = tx.query("updateOne", {
        table: "hrx_leave_entitlements",
        where: { tenant_id: tenantId, entitlement_id: entitlementId },
        expected_version: expectedVersion,
        patch: { state_version: expectedVersion + 1, updated_at: now },
      });
      const cancelledLifecycle = lifecycle(updated, entitlementEntries(tx, tenantId, entitlementId), input, clock);
      const result = Object.freeze({
        command: "cancel_scheduled",
        entitlement_id: entitlementId,
        state: cancelledLifecycle.state,
        state_version: updated.state_version,
        reversed_minutes: reversals.reduce((total, entry) => total + entry.amount_minutes, 0),
        reversal_entry_ids: Object.freeze(reversals.map((entry) => entry.entry_id)),
      });
      const receipt = insertReceipt(tx, { tenantId, idempotencyKey, commandType: "leave_entitlement_cancel_scheduled", inputHash, result, now, idFactory });
      appendAudit(tx, { tenantId, actorId, entitlementId, action: "hrx.leave.entitlement.cancel", reason: "scheduled_leave_entitlement_cancelled", metadata: { state_version: updated.state_version, reversed_minutes: result.reversed_minutes, reason_code: reasonCode }, now, idFactory });
      return receiptResult(receipt);
    });
  }

  function adjustActive(context, input = {}) {
    requireStepUp(context);
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const entitlementId = requiredString(input, "entitlement_id");
    const expectedVersion = requireExpectedVersion(input);
    const idempotencyKey = requiredString(input, "idempotency_key");
    const reasonCode = requiredString(input, "reason_code");
    const amountMinutes = positiveInteger(input, "amount_minutes");
    const direction = requiredString(input, "direction");
    if (!["credit", "debit"].includes(direction)) throw new TypeError("direction must be credit or debit");
    const inputHash = hash(input);
    const replay = existingReceipt(store, tenantId, idempotencyKey, inputHash);
    if (replay) return replay;
    const now = clock();
    return store.transaction((tx) => {
      const current = entitlement(tx, tenantId, entitlementId);
      const entries = entitlementEntries(tx, tenantId, entitlementId);
      const currentLifecycle = lifecycle(current, entries, input, clock);
      if (currentLifecycle.state !== "active") {
        throw guardedError("Only an active entitlement can receive an adjustment", "HRX_LEAVE_ENTITLEMENT_ADJUST_NOT_ACTIVE");
      }
      const availableMinutes = entries
        .filter((entry) => !entry.occurred_on || entry.occurred_on <= currentLifecycle.as_of)
        .reduce((total, entry) => total + entryEffect(entry), 0);
      if (direction === "debit" && amountMinutes > availableMinutes) {
        throw guardedError("Entitlement adjustment exceeds available minutes", "HRX_LEAVE_ENTITLEMENT_ADJUSTMENT_EXCEEDS_BALANCE");
      }
      const policyRow = policy(tx, tenantId, current.policy_version_id);
      const adjustment = createSqlLeaveBalanceLedger({ store: tx }).append({
        tenant_id: tenantId,
        entry_id: idFactory("leave_ledger_entitlement_adjustment"),
        employee_id: current.employee_id,
        policy_id: policyRow.policy_code,
        group_id: current.group_id,
        policy_version_id: current.policy_version_id,
        entitlement_id: entitlementId,
        idempotency_key: `${idempotencyKey}:adjustment`,
        entry_type: "adjustment",
        adjustment_direction: direction,
        amount_minutes: amountMinutes,
        occurred_on: currentLifecycle.as_of,
        source_ref: `LeaveEntitlementAdjustment:${idempotencyKey}`,
        metadata: { reason_code: reasonCode, command: "adjust_active_entitlement" },
      });
      const updated = tx.query("updateOne", {
        table: "hrx_leave_entitlements",
        where: { tenant_id: tenantId, entitlement_id: entitlementId },
        expected_version: expectedVersion,
        patch: { state_version: expectedVersion + 1, updated_at: now },
      });
      const result = Object.freeze({
        command: "adjust_active",
        entitlement_id: entitlementId,
        state: "active",
        state_version: updated.state_version,
        adjustment_entry_id: adjustment.entry_id,
        direction,
        amount_minutes: amountMinutes,
        available_minutes_after: availableMinutes + entryEffect(adjustment),
      });
      const receipt = insertReceipt(tx, { tenantId, idempotencyKey, commandType: "leave_entitlement_adjust_active", inputHash, result, now, idFactory });
      appendAudit(tx, { tenantId, actorId, entitlementId, action: "hrx.leave.entitlement.adjust", reason: "active_leave_entitlement_adjusted", metadata: { state_version: updated.state_version, direction, amount_minutes: amountMinutes, reason_code: reasonCode }, now, idFactory });
      return receiptResult(receipt);
    });
  }

  return Object.freeze({ patchScheduled, cancelScheduled, adjustActive });
}
