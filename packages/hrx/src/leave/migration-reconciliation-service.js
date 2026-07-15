import { createHash } from "node:crypto";

export const LEAVE_RULE_SNAPSHOT_BACKFILL_APPROVAL_SCHEMA_VERSION = "law-firm-os.hrx.leave-rule-snapshot-backfill-approval.v0.1";

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value, prefixed = false) {
  const digest = createHash("sha256").update(stableStringify(value)).digest("hex");
  return prefixed ? `sha256:${digest}` : digest;
}

function policyRules(row) {
  try {
    const rules = JSON.parse(row?.rules_json ?? "{}");
    if (!rules || typeof rules !== "object" || Array.isArray(rules)) throw new Error();
    return rules;
  } catch {
    const error = new TypeError("leave policy rules_json must be an object");
    error.safe_error_code = "HRX_LEAVE_POLICY_RULES_INVALID";
    throw error;
  }
}

function guardedError(message, safeErrorCode) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = 409;
  return error;
}

function sourceRefHash(row) {
  return hash({ source_ref: requiredString(row.source_ref, "source_ref") }, true);
}

export function createLeaveRuleSnapshotBackfillService({ store, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.query !== "function" || typeof store.transaction !== "function") {
    throw new TypeError("leave rule snapshot backfill requires a transactional store");
  }

  function preview(context = {}) {
    const tenantId = requiredString(context.tenant_id, "tenant_id");
    const policies = new Map(store.query("select", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId } }).map((row) => [row.policy_version_id, row]));
    const entitlements = store.query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId } });
    const requests = store.query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId } });
    const segments = store.query("select", { table: "hrx_leave_request_segments", where: { tenant_id: tenantId } });
    const actions = [];
    const errors = [];
    let preservedCount = 0;

    const planRow = (kind, row, rowId) => {
      if (typeof row.policy_rules_snapshot_hash === "string" && row.policy_rules_snapshot_hash) {
        preservedCount += 1;
        return;
      }
      const policy = policies.get(row.policy_version_id);
      if (!policy) {
        errors.push(Object.freeze({ kind, row_id: rowId, error_code: "HRX_LEAVE_POLICY_VERSION_NOT_FOUND" }));
        return;
      }
      const snapshotHash = hash(policyRules(policy));
      const requestSegments = kind === "request" ? segments.filter((segment) => segment.request_id === rowId) : [];
      if (requestSegments.some((segment) => segment.policy_rules_snapshot_hash && segment.policy_rules_snapshot_hash !== snapshotHash)) {
        errors.push(Object.freeze({ kind, row_id: rowId, error_code: "HRX_LEAVE_SEGMENT_RULE_SNAPSHOT_CONFLICT" }));
        return;
      }
      actions.push(Object.freeze({
        kind,
        row_id: rowId,
        state_version: row.state_version,
        policy_version_id: row.policy_version_id,
        policy_rules_snapshot_hash: snapshotHash,
        source_ref_hash: sourceRefHash(row),
        segment_ids: Object.freeze(requestSegments.filter((segment) => !segment.policy_rules_snapshot_hash).map((segment) => segment.segment_id).sort()),
      }));
    };

    entitlements.sort((left, right) => left.entitlement_id.localeCompare(right.entitlement_id)).forEach((row) => planRow("entitlement", row, row.entitlement_id));
    requests
      .filter((row) => Number.isInteger(row.requested_minutes))
      .sort((left, right) => left.request_id.localeCompare(right.request_id))
      .forEach((row) => planRow("request", row, row.request_id));

    const receipt = Object.freeze({
      schema_version: "law-firm-os.hrx.leave-rule-snapshot-backfill-preview.v0.1",
      tenant_id: tenantId,
      action_count: actions.length,
      entitlement_action_count: actions.filter((row) => row.kind === "entitlement").length,
      request_action_count: actions.filter((row) => row.kind === "request").length,
      segment_action_count: actions.reduce((count, row) => count + row.segment_ids.length, 0),
      preserved_count: preservedCount,
      error_count: errors.length,
      immutable_source_refs_hash: hash(actions.map((row) => [row.kind, row.row_id, row.source_ref_hash]), true),
      actions: Object.freeze(actions),
      errors: Object.freeze(errors),
    });
    return Object.freeze({ ...receipt, preview_hash: hash(receipt, true) });
  }

  function execute(context = {}, input = {}) {
    const tenantId = requiredString(context.tenant_id, "tenant_id");
    const current = preview(context);
    if (current.error_count > 0) throw guardedError("leave rule snapshot backfill contains unresolved rows", "HRX_LEAVE_RULE_SNAPSHOT_BACKFILL_NOT_READY");
    const approval = input.approval_manifest;
    if (
      approval?.schema_version !== LEAVE_RULE_SNAPSHOT_BACKFILL_APPROVAL_SCHEMA_VERSION ||
      approval.tenant_id !== tenantId ||
      approval.preview_hash !== current.preview_hash ||
      approval.decision !== "approved" ||
      typeof approval.approved_by_actor_id !== "string" || !approval.approved_by_actor_id.trim()
    ) {
      throw guardedError("matching owner approval manifest is required", "HRX_LEAVE_RULE_SNAPSHOT_BACKFILL_APPROVAL_REQUIRED");
    }
    const completedAt = clock();
    const results = store.transaction((tx) => current.actions.map((action) => {
      const table = action.kind === "entitlement" ? "hrx_leave_entitlements" : "hrx_leave_requests";
      const idField = action.kind === "entitlement" ? "entitlement_id" : "request_id";
      const row = tx.query("selectOne", { table, where: { tenant_id: tenantId, [idField]: action.row_id } });
      if (!row || row.state_version !== action.state_version || sourceRefHash(row) !== action.source_ref_hash || row.policy_version_id !== action.policy_version_id || row.policy_rules_snapshot_hash) {
        throw guardedError("leave rule snapshot source changed after preview", "HRX_LEAVE_RULE_SNAPSHOT_BACKFILL_STALE");
      }
      tx.query("updateOne", {
        table,
        where: { tenant_id: tenantId, [idField]: action.row_id },
        expected_version: row.state_version,
        patch: { policy_rules_snapshot_hash: action.policy_rules_snapshot_hash, state_version: row.state_version + 1 },
      });
      for (const segmentId of action.segment_ids) {
        const segment = tx.query("selectOne", { table: "hrx_leave_request_segments", where: { tenant_id: tenantId, segment_id: segmentId } });
        if (!segment || segment.request_id !== action.row_id || segment.policy_rules_snapshot_hash) {
          throw guardedError("leave request segment changed after preview", "HRX_LEAVE_RULE_SNAPSHOT_BACKFILL_STALE");
        }
        tx.query("updateOne", {
          table: "hrx_leave_request_segments",
          where: { tenant_id: tenantId, segment_id: segmentId },
          patch: { policy_rules_snapshot_hash: action.policy_rules_snapshot_hash },
        });
      }
      const updated = tx.query("selectOne", { table, where: { tenant_id: tenantId, [idField]: action.row_id } });
      if (sourceRefHash(updated) !== action.source_ref_hash) throw guardedError("leave source reference changed during backfill", "HRX_LEAVE_SOURCE_REFERENCE_MUTATED");
      return Object.freeze({ kind: action.kind, row_id: action.row_id, snapshot_hash: action.policy_rules_snapshot_hash, segment_count: action.segment_ids.length });
    }));
    return Object.freeze({
      outcome: "backfilled",
      preview_hash: current.preview_hash,
      immutable_source_refs_hash: current.immutable_source_refs_hash,
      updated_count: results.length,
      entitlement_count: results.filter((row) => row.kind === "entitlement").length,
      request_count: results.filter((row) => row.kind === "request").length,
      segment_count: results.reduce((count, row) => count + row.segment_count, 0),
      approved_by_actor_id: approval.approved_by_actor_id.trim(),
      approved_at: approval.approved_at ?? completedAt,
      completed_at: completedAt,
      results: Object.freeze(results),
    });
  }

  return Object.freeze({ preview, execute });
}

function ledgerEffect(row) {
  const minutes = Number(row.amount_minutes ?? Math.round(Number(row.amount ?? 0) * 60));
  if (row.entry_type === "adjustment") return row.adjustment_direction === "debit" ? -minutes : minutes;
  return ["earned", "carryover", "released"].includes(row.entry_type) ? minutes : -minutes;
}

export function createLeaveLedgerReconciliationService({ store, clock = () => new Date().toISOString() } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("leave ledger reconciliation requires a store");

  function reconcile(context = {}, input = {}) {
    const tenantId = requiredString(context.tenant_id, "tenant_id");
    const asOf = input.as_of ?? clock().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || Number.isNaN(Date.parse(`${asOf}T00:00:00Z`))) throw new TypeError("as_of must be an ISO date");
    const entries = store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId } }).filter((row) => row.occurred_on <= asOf);
    const snapshots = store.query("select", { table: "hrx_leave_balance_snapshots", where: { tenant_id: tenantId } }).filter((row) => row.as_of <= asOf);
    const keys = new Set([
      ...entries.filter((row) => row.group_id).map((row) => JSON.stringify([row.employee_id, row.group_id])),
      ...snapshots.map((row) => JSON.stringify([row.employee_id, row.group_id])),
    ]);
    const rows = [...keys].sort().map((key) => {
      const [employeeId, groupId] = JSON.parse(key);
      const groupEntries = entries.filter((row) => row.employee_id === employeeId && row.group_id === groupId);
      const recomputedMinutes = groupEntries.reduce((total, row) => total + ledgerEffect(row), 0);
      const snapshot = snapshots
        .filter((row) => row.employee_id === employeeId && row.group_id === groupId)
        .sort((left, right) => right.as_of.localeCompare(left.as_of) || right.created_at.localeCompare(left.created_at))[0] ?? null;
      if (!snapshot) {
        return Object.freeze({ employee_id: employeeId, group_id: groupId, snapshot_as_of: null, current_minutes: null, recomputed_minutes: recomputedMinutes, variance_minutes: null, state: "baseline_missing" });
      }
      const postSnapshotMinutes = groupEntries.filter((row) => row.occurred_on > snapshot.as_of).reduce((total, row) => total + ledgerEffect(row), 0);
      const currentMinutes = snapshot.available_minutes + postSnapshotMinutes;
      const varianceMinutes = currentMinutes - recomputedMinutes;
      return Object.freeze({
        employee_id: employeeId,
        group_id: groupId,
        snapshot_as_of: snapshot.as_of,
        current_minutes: currentMinutes,
        recomputed_minutes: recomputedMinutes,
        variance_minutes: varianceMinutes,
        state: varianceMinutes === 0 ? "reconciled" : "unexplained_variance",
      });
    });
    const receipt = {
      schema_version: "law-firm-os.hrx.leave-ledger-reconciliation.v0.1",
      tenant_id: tenantId,
      as_of: asOf,
      row_count: rows.length,
      reconciled_count: rows.filter((row) => row.state === "reconciled").length,
      baseline_missing_count: rows.filter((row) => row.state === "baseline_missing").length,
      unexplained_variance_count: rows.filter((row) => row.state === "unexplained_variance").length,
      unexplained_variance_minutes: rows.filter((row) => row.state === "unexplained_variance").reduce((total, row) => total + Math.abs(row.variance_minutes), 0),
      rows: Object.freeze(rows),
      source_hash: hash({ entries: entries.map((row) => [row.entry_id, ledgerEffect(row), row.occurred_on]), snapshots: snapshots.map((row) => [row.snapshot_id, row.available_minutes, row.as_of]) }, true),
    };
    return Object.freeze(receipt);
  }

  return Object.freeze({ reconcile });
}
