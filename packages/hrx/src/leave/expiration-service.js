import { createHash, randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../../audit/src/hrx-event-store-sql.js";
import { createSqlLeaveBalanceLedger } from "./balance.js";
import { previewLeaveEntitlementExpirations } from "./entitlement-lifecycle.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
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

function parseResult(receipt) {
  try {
    return JSON.parse(receipt.result_json);
  } catch {
    throw guardedError("Expiration receipt is invalid", "HRX_LEAVE_EXPIRATION_RECEIPT_INVALID");
  }
}

function resultView(receipt, { replayed = false } = {}) {
  return Object.freeze({ ...parseResult(receipt), replayed });
}

function sourceSnapshot(store, tenantId) {
  const entitlements = store
    .query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId } })
    .sort((left, right) => left.entitlement_id.localeCompare(right.entitlement_id));
  const ledgerEntries = store
    .query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId } })
    .sort((left, right) => left.entry_id.localeCompare(right.entry_id));
  const policies = store
    .query("select", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId } })
    .sort((left, right) => left.policy_version_id.localeCompare(right.policy_version_id));
  const sourceVersion = hash({
    entitlements: entitlements.map((row) => [
      row.entitlement_id,
      row.employee_id,
      row.group_id,
      row.policy_version_id,
      row.granted_minutes,
      row.valid_from,
      row.expires_on,
      row.state_version,
    ]),
    ledger_entries: ledgerEntries.map((row) => [
      row.entry_id,
      row.entitlement_id,
      row.entry_type,
      row.adjustment_direction ?? null,
      row.amount_minutes,
      row.occurred_on,
      row.reverses_entry_id ?? null,
    ]),
    policies: policies.map((row) => [row.policy_version_id, row.group_id, row.policy_code, row.version, row.status]),
  });
  return Object.freeze({ entitlements, ledger_entries: ledgerEntries, policies, source_version: sourceVersion });
}

function expirationPreview(source, input = {}) {
  const preview = previewLeaveEntitlementExpirations({
    entitlements: source.entitlements,
    ledger_entries: source.ledger_entries,
    as_of: input.as_of,
    at: input.at,
    timezone: input.timezone ?? "Asia/Seoul",
  });
  const snapshotHash = hash({ source_version: source.source_version, preview });
  return Object.freeze({ ...preview, source_version: source.source_version, snapshot_hash: snapshotHash });
}

function requireStepUp(context) {
  const trustedSystemJob = context?.system_job_verified === true && /^system:/.test(context?.actor_id ?? "");
  if (context?.step_up_verified !== true && !trustedSystemJob) {
    throw guardedError("Fresh MFA is required", "HRX_STEP_UP_REQUIRED", 403);
  }
}

export function createLeaveExpirationService({
  store,
  clock = () => new Date().toISOString(),
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
} = {}) {
  if (!store || typeof store.query !== "function" || typeof store.transaction !== "function") {
    throw new TypeError("leave expiration service requires a transactional store");
  }

  function preview(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const source = sourceSnapshot(store, tenantId);
    const calculated = expirationPreview(source, { ...input, at: input.at ?? clock() });
    const idempotencyKey = `expiration-preview:${calculated.as_of}:${calculated.timezone}:${calculated.source_version}`;
    const existing = store.query("selectOne", {
      table: "hrx_leave_command_receipts",
      where: { tenant_id: tenantId, idempotency_key: idempotencyKey },
    });
    if (existing) return resultView(existing, { replayed: true });
    const previewId = idFactory("leave_expiration_preview");
    const result = Object.freeze({ ...calculated, preview_id: previewId });
    const now = clock();
    return store.transaction((tx) => {
      const receipt = tx.query("insert", {
        table: "hrx_leave_command_receipts",
        row: {
          tenant_id: tenantId,
          command_receipt_id: previewId,
          idempotency_key: idempotencyKey,
          command_type: "leave_entitlement_expiration_preview",
          request_id: null,
          input_hash: hash({ as_of: result.as_of, timezone: result.timezone, source_version: result.source_version }),
          result_json: JSON.stringify(result),
          created_at: now,
        },
      });
      createSqlHrxAuditEventStore({ store: tx }).append({
        event_id: idFactory("leave_audit_expiration_preview"),
        tenant_id: tenantId,
        actor_id: actorId,
        action: "hrx.leave.expiration.preview",
        object_type: "LeaveExpirationPreview",
        object_id: previewId,
        decision: "allow",
        reason: "leave_entitlement_expiration_previewed",
        occurred_at: now,
        metadata: {
          as_of: result.as_of,
          candidate_count: result.totals.candidate_count,
          expiration_minutes: result.totals.expiration_minutes,
          snapshot_hash: result.snapshot_hash,
        },
      });
      return resultView(receipt);
    });
  }

  function execute(context, input = {}) {
    requireStepUp(context);
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const previewId = requiredString(input, "preview_id");
    const previewReceipt = store.query("selectOne", {
      table: "hrx_leave_command_receipts",
      where: { tenant_id: tenantId, command_receipt_id: previewId },
    });
    if (!previewReceipt || previewReceipt.command_type !== "leave_entitlement_expiration_preview") {
      throw guardedError("Expiration preview not found", "HRX_LEAVE_EXPIRATION_PREVIEW_NOT_FOUND", 404);
    }
    const prior = parseResult(previewReceipt);
    const idempotencyKey = `expiration-execute:${previewId}`;
    const replay = store.query("selectOne", {
      table: "hrx_leave_command_receipts",
      where: { tenant_id: tenantId, idempotency_key: idempotencyKey },
    });
    if (replay) return resultView(replay, { replayed: true });
    const now = clock();
    return store.transaction((tx) => {
      const source = sourceSnapshot(tx, tenantId);
      const current = expirationPreview(source, { as_of: prior.as_of, timezone: prior.timezone });
      if (current.source_version !== prior.source_version || current.snapshot_hash !== prior.snapshot_hash) {
        throw guardedError("Expiration sources changed after preview", "HRX_LEAVE_EXPIRATION_PREVIEW_STALE");
      }
      const policies = new Map(source.policies.map((row) => [row.policy_version_id, row]));
      const ledger = createSqlLeaveBalanceLedger({ store: tx });
      const rows = current.rows.map((row) => {
        const policy = policies.get(row.policy_version_id);
        if (!policy || policy.group_id !== row.group_id) {
          throw guardedError("Expiration policy source changed", "HRX_LEAVE_EXPIRATION_POLICY_NOT_FOUND");
        }
        const entry = ledger.append({
          tenant_id: tenantId,
          entry_id: idFactory("leave_ledger_expired"),
          employee_id: row.employee_id,
          policy_id: policy.policy_code,
          group_id: row.group_id,
          policy_version_id: row.policy_version_id,
          entitlement_id: row.entitlement_id,
          idempotency_key: `expiration:${previewId}:${row.entitlement_id}`,
          entry_type: "expired",
          amount_minutes: row.remaining_minutes,
          occurred_on: current.as_of,
          source_ref: `LeaveExpirationPreview:${previewId}`,
          metadata: { expiration_preview_id: previewId, snapshot_hash: prior.snapshot_hash },
        });
        return Object.freeze({
          entitlement_id: row.entitlement_id,
          entry_id: entry.entry_id,
          expired_minutes: row.remaining_minutes,
          status: "expired",
        });
      });
      const result = Object.freeze({
        mode: "execute",
        preview_id: previewId,
        as_of: current.as_of,
        timezone: current.timezone,
        source_version: current.source_version,
        snapshot_hash: current.snapshot_hash,
        rows: Object.freeze(rows),
        totals: Object.freeze({
          expired_count: rows.length,
          expired_minutes: rows.reduce((total, row) => total + row.expired_minutes, 0),
        }),
      });
      const receipt = tx.query("insert", {
        table: "hrx_leave_command_receipts",
        row: {
          tenant_id: tenantId,
          command_receipt_id: idFactory("leave_expiration_execute"),
          idempotency_key: idempotencyKey,
          command_type: "leave_entitlement_expiration_execute",
          request_id: null,
          input_hash: hash({ preview_id: previewId, snapshot_hash: prior.snapshot_hash }),
          result_json: JSON.stringify(result),
          created_at: now,
        },
      });
      createSqlHrxAuditEventStore({ store: tx }).append({
        event_id: idFactory("leave_audit_expiration_execute"),
        tenant_id: tenantId,
        actor_id: actorId,
        action: "hrx.leave.expiration.execute",
        object_type: "LeaveExpirationPreview",
        object_id: previewId,
        decision: "allow",
        reason: "leave_entitlement_expiration_executed",
        occurred_at: now,
        metadata: {
          expired_count: result.totals.expired_count,
          expired_minutes: result.totals.expired_minutes,
          snapshot_hash: result.snapshot_hash,
        },
      });
      return resultView(receipt);
    });
  }

  return Object.freeze({ preview, execute });
}
