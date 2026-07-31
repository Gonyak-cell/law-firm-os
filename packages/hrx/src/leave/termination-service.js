import { createHash, randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../../audit/src/hrx-event-store-sql.js";
import { assertHrxProviderReceiptSucceeded } from "../provider-receipt-contract.js";
import { publicEmployeeDisplayName } from "../people-presentation.js";
import { planEarliestExpiryAllocations } from "./allocation.js";
import { createSqlLeaveBalanceLedger } from "./balance.js";

const LEAVE_GROUP_NAME_FALLBACK = "휴가 그룹 이름 확인 필요";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function isoDate(value, field) {
  const text = requiredString({ [field]: value }, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return text;
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

function parseJson(value, fallback = {}) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function ledgerEffect(row) {
  const minutes = Number(row.amount_minutes ?? 0);
  if (row.entry_type === "adjustment") return row.adjustment_direction === "debit" ? -minutes : minutes;
  if (["earned", "carryover", "released"].includes(row.entry_type)) return minutes;
  if (["used", "reserved", "expired"].includes(row.entry_type)) return -minutes;
  return 0;
}

function summarizeGroup(rows) {
  const totals = { earned: 0, carryover: 0, adjustment: 0, reserved: 0, released: 0, used: 0, expired: 0 };
  for (const row of rows) {
    const minutes = Number(row.amount_minutes ?? 0);
    if (row.entry_type === "adjustment") totals.adjustment += row.adjustment_direction === "debit" ? -minutes : minutes;
    else if (Object.hasOwn(totals, row.entry_type)) totals[row.entry_type] += minutes;
  }
  const available = totals.earned + totals.carryover + totals.adjustment + totals.released - totals.used - totals.reserved - totals.expired;
  return Object.freeze({
    ...totals,
    final_accrued_minutes: totals.earned + totals.carryover + Math.max(0, totals.adjustment),
    reserved_minutes: Math.max(0, totals.reserved - totals.released),
    used_minutes: totals.used,
    unused_minutes: Math.max(0, available),
    negative_minutes: Math.max(0, -available),
    available_minutes: available,
  });
}

function requireStepUp(context) {
  if (context?.step_up_verified !== true || context?.step_up_purpose !== "leave_termination_settlement") {
    throw guardedError("Termination settlement requires a matching fresh step-up session", "HRX_STEP_UP_REQUIRED", 403);
  }
}

function reconciliationView(row) {
  return Object.freeze({ ...row, result: Object.freeze(parseJson(row.result_json, {})), result_json: undefined });
}

function approvalReceiptView(row) {
  return Object.freeze({
    approval_receipt_id: row.command_receipt_id,
    ...parseJson(row.result_json, {}),
  });
}

function requireAuthorizedEmployee(context, employeeId) {
  const authorized = new Set(Array.isArray(context?.authorized_employee_ids) ? context.authorized_employee_ids : []);
  if (!authorized.has(employeeId)) {
    throw guardedError("Termination employee is outside the approved organization scope", "HRX_LEAVE_TERMINATION_SCOPE_DENIED", 403);
  }
}

function aggregateTotals(groups) {
  const fields = ["final_accrued_minutes", "reserved_minutes", "used_minutes", "unused_minutes", "negative_minutes", "future_request_reversal_minutes"];
  return Object.freeze(Object.fromEntries(fields.map((field) => [field, groups.reduce((total, group) => total + Number(group[field] ?? 0), 0)])));
}

export function createLeaveTerminationService({
  store,
  clock = () => new Date().toISOString(),
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
  approverAuthorizer = () => false,
  payrollReceiptAuthorizer = () => false,
} = {}) {
  if (!store || typeof store.transaction !== "function" || typeof store.query !== "function") {
    throw new TypeError("leave termination service requires a transactional store");
  }

  function sourceSnapshot(tenantId, employeeId, terminationDate) {
    const employee = store.query("selectOne", { table: "hrx_employees", where: { tenant_id: tenantId, employee_id: employeeId } });
    if (!employee) throw guardedError("Employee not found", "HRX_LEAVE_TERMINATION_EMPLOYEE_NOT_FOUND", 404);
    const offboarding = store
      .query("select", { table: "hrx_offboarding_cases", where: { tenant_id: tenantId, employee_id: employeeId } })
      .find((row) => row.separation_date === terminationDate);
    if (!offboarding) throw guardedError("Matching offboarding case is required", "HRX_LEAVE_TERMINATION_OFFBOARDING_REQUIRED", 404);
    const profiles = store.query("select", { table: "hrx_employment_profiles", where: { tenant_id: tenantId, employee_id: employeeId } });
    const ledger = store.query("select", { table: "hrx_leave_balance_entries", where: { tenant_id: tenantId, employee_id: employeeId } });
    const entitlements = store.query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId, employee_id: employeeId } });
    const requests = store.query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId, employee_id: employeeId } }).filter((row) => Number.isInteger(row.requested_minutes));
    const requestIds = new Set(requests.map((row) => row.request_id));
    const allocations = store.query("select", { table: "hrx_leave_request_allocations", where: { tenant_id: tenantId } }).filter((row) => requestIds.has(row.request_id));
    const policies = store.query("select", { table: "hrx_leave_policy_versions", where: { tenant_id: tenantId } });
    const groups = store.query("select", { table: "hrx_leave_groups", where: { tenant_id: tenantId } });
    const normalizedOffboarding = { offboarding_id: offboarding.offboarding_id, employee_id: offboarding.employee_id, separation_date: offboarding.separation_date };
    const sourceVersion = hash({ employee, profiles, ledger, entitlements, requests, allocations, policies, groups, offboarding: normalizedOffboarding, termination_date: terminationDate });
    return Object.freeze({ employee, offboarding, profiles, ledger, entitlements, requests, allocations, policies, groups, source_version: sourceVersion });
  }

  function calculate(snapshot, terminationDate) {
    const requestById = new Map(snapshot.requests.map((row) => [row.request_id, row]));
    const allocationById = new Map(snapshot.allocations.map((row) => [row.allocation_id, row]));
    const requestForEntry = (entry) => {
      const requestId = /^LeaveRequest:(.+)$/.exec(entry.source_ref ?? "")?.[1] ?? allocationById.get(entry.allocation_id)?.request_id;
      return requestId ? requestById.get(requestId) ?? null : null;
    };
    const futureRequests = snapshot.requests.filter((request) => request.start_date > terminationDate && ["submitted", "reschedule_pending", "approved", "cancel_pending"].includes(request.state));
    const futureIds = new Set(futureRequests.map((request) => request.request_id));
    const relevantLedger = snapshot.ledger.filter((entry) => {
      const request = requestForEntry(entry);
      if (request && futureIds.has(request.request_id)) return false;
      return (request?.start_date ?? entry.occurred_on) <= terminationDate;
    });
    const validationErrors = snapshot.ledger
      .filter((entry) => entry.occurred_on <= terminationDate && (!entry.group_id || !Number.isInteger(entry.amount_minutes)))
      .map((entry) => ({ entry_id: entry.entry_id, error_code: "HRX_LEAVE_TERMINATION_LEGACY_LEDGER_REVIEW_REQUIRED" }));
    const groupIds = new Set([
      ...snapshot.entitlements.map((row) => row.group_id),
      ...relevantLedger.map((row) => row.group_id),
    ].filter(Boolean));
    const groups = [...groupIds].map((groupId) => {
      const group = snapshot.groups.find((row) => row.group_id === groupId);
      const policies = snapshot.policies.filter((row) => row.group_id === groupId && row.effective_from <= terminationDate && (!row.effective_to || row.effective_to >= terminationDate));
      const policy = policies.sort((left, right) => right.version - left.version)[0] ?? null;
      const rules = parseJson(policy?.rules_json, {});
      const rows = relevantLedger.filter((row) => row.group_id === groupId);
      const totals = summarizeGroup(rows);
      const futureRequestIds = new Set(futureRequests.map((row) => row.request_id));
      const futureEntries = snapshot.ledger.filter((entry) => {
        const request = requestForEntry(entry);
        return request && futureRequestIds.has(request.request_id) && ["reserved", "used"].includes(entry.entry_type);
      });
      const futureReversalMinutes = futureEntries.filter((row) => row.group_id === groupId).reduce((total, row) => total + Number(row.amount_minutes ?? 0), 0);
      const payoutAllowed = rules.termination_unused_payout === true;
      return Object.freeze({
        group_id: groupId,
        group_display_name: group?.display_name ?? LEAVE_GROUP_NAME_FALLBACK,
        policy_version_id: policy?.policy_version_id ?? null,
        policy_code: policy?.policy_code ?? null,
        ...totals,
        future_request_reversal_minutes: futureReversalMinutes,
        payroll_boundary: Object.freeze({
          payable_unused_minutes: payoutAllowed ? totals.unused_minutes : 0,
          recoverable_negative_minutes: totals.negative_minutes,
          requires_payroll_rate_review: totals.unused_minutes > 0 || totals.negative_minutes > 0,
          requires_policy_review: totals.unused_minutes > 0 && !payoutAllowed,
          raw_compensation_amount_included: false,
        }),
      });
    }).sort((left, right) => left.group_display_name.localeCompare(right.group_display_name, "ko"));
    validationErrors.push(...groups
      .filter((group) => !group.policy_version_id && (group.unused_minutes > 0 || group.negative_minutes > 0 || group.future_request_reversal_minutes > 0))
      .map((group) => ({ group_id: group.group_id, error_code: "HRX_LEAVE_TERMINATION_POLICY_REQUIRED" })));
    return Object.freeze({
      employee_id: snapshot.employee.employee_id,
      employee_display_name: publicEmployeeDisplayName(snapshot.employee),
      offboarding_id: snapshot.offboarding.offboarding_id,
      termination_date: terminationDate,
      groups: Object.freeze(groups),
      totals: aggregateTotals(groups),
      validation_errors: Object.freeze(validationErrors),
      future_requests: Object.freeze(futureRequests.map((row) => ({ request_id: row.request_id, state: row.state, start_date: row.start_date, end_date: row.end_date, requested_minutes: row.requested_minutes }))),
      payroll_boundary: "minutes_only_requires_payroll_rate_review",
    });
  }

  function view(row) {
    const base = reconciliationView(row);
    if (row.mode !== "preview") return base;
    const receipt = store.query("selectOne", { table: "hrx_leave_command_receipts", where: { tenant_id: row.tenant_id, idempotency_key: `termination-approval:${row.reconciliation_id}` } });
    if (!receipt || receipt.command_type !== "leave_termination_approval") return Object.freeze({ ...base, approval_receipt_id: null });
    const approval = parseJson(receipt.result_json, {});
    if (approval.preview_reconciliation_id !== row.reconciliation_id || approval.snapshot_hash !== row.snapshot_hash) return Object.freeze({ ...base, approval_receipt_id: null });
    return Object.freeze({ ...base, approval_receipt_id: receipt.command_receipt_id, approved_by_actor_id: approval.approved_by_actor_id ?? null });
  }

  function list(context) {
    const tenantId = requiredString(context, "tenant_id");
    const authorized = new Set(Array.isArray(context.authorized_employee_ids) ? context.authorized_employee_ids : []);
    return Object.freeze(store
      .query("select", { table: "hrx_leave_termination_reconciliations", where: { tenant_id: tenantId } })
      .filter((row) => authorized.has(row.employee_id))
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .map(view));
  }

  function candidates(context) {
    const tenantId = requiredString(context, "tenant_id");
    const authorized = new Set(Array.isArray(context.authorized_employee_ids) ? context.authorized_employee_ids : []);
    return Object.freeze(store
      .query("select", { table: "hrx_offboarding_cases", where: { tenant_id: tenantId } })
      .filter((row) => authorized.has(row.employee_id))
      .map((row) => {
        const employee = store.query("selectOne", { table: "hrx_employees", where: { tenant_id: tenantId, employee_id: row.employee_id } });
        return Object.freeze({ offboarding_id: row.offboarding_id, employee_id: row.employee_id, employee_display_name: publicEmployeeDisplayName(employee), termination_date: row.separation_date, leave_reconciliation_status: row.leave_reconciliation_status ?? "pending" });
      })
      .sort((left, right) => left.termination_date.localeCompare(right.termination_date)));
  }

  function preview(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const employeeId = requiredString(input, "employee_id");
    const terminationDate = isoDate(input.termination_date, "termination_date");
    requireAuthorizedEmployee(context, employeeId);
    const source = sourceSnapshot(tenantId, employeeId, terminationDate);
    const result = calculate(source, terminationDate);
    const snapshotHash = hash({ source_version: source.source_version, result });
    const idempotencyKey = `termination-preview:${source.offboarding.offboarding_id}:${source.source_version}`;
    const existing = store.query("selectOne", { table: "hrx_leave_termination_reconciliations", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
    if (existing) return view(existing);
    const now = clock();
    return store.transaction((tx) => {
      const row = tx.query("insert", { table: "hrx_leave_termination_reconciliations", row: {
        tenant_id: tenantId,
        reconciliation_id: idFactory("leave_termination_preview"),
        employee_id: employeeId,
        termination_date: terminationDate,
        mode: "preview",
        source_version: source.source_version,
        snapshot_hash: snapshotHash,
        preview_reconciliation_id: null,
        state: result.validation_errors.length > 0 ? "needs_review" : "previewed",
        result_json: JSON.stringify(result),
        idempotency_key: idempotencyKey,
        created_at: now,
        approved_at: null,
        approved_by_actor_id: null,
        executed_by_actor_id: actorId,
        completed_at: null,
      } });
      tx.query("updateOne", { table: "hrx_offboarding_cases", where: { tenant_id: tenantId, offboarding_id: source.offboarding.offboarding_id }, patch: { leave_reconciliation_status: "previewed" } });
      createSqlHrxAuditEventStore({ store: tx }).append({ event_id: idFactory("leave_audit_termination_preview"), tenant_id: tenantId, actor_id: actorId, action: "hrx.leave.termination.preview", object_type: "LeaveTerminationReconciliation", object_id: row.reconciliation_id, decision: "allow", reason: "termination_leave_balance_previewed", occurred_at: now, metadata: { validation_error_count: result.validation_errors.length, source_version: source.source_version } });
      return view(row);
    });
  }

  function approve(context, input = {}) {
    requireStepUp(context);
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const previewId = requiredString(input, "preview_reconciliation_id");
    const previewRow = store.query("selectOne", { table: "hrx_leave_termination_reconciliations", where: { tenant_id: tenantId, reconciliation_id: previewId } });
    if (!previewRow || previewRow.mode !== "preview") throw guardedError("Termination preview not found", "HRX_LEAVE_TERMINATION_PREVIEW_NOT_FOUND", 404);
    requireAuthorizedEmployee(context, previewRow.employee_id);
    const previewedBy = typeof previewRow.executed_by_actor_id === "string" ? previewRow.executed_by_actor_id.trim() : "";
    if (!previewedBy) throw guardedError("Termination preview does not contain authenticated initiator evidence", "HRX_LEAVE_TERMINATION_PREVIEW_ACTOR_REQUIRED");
    if (previewedBy === actorId) throw guardedError("Termination settlement requires a different HR approver", "HRX_LEAVE_TERMINATION_DUAL_CONTROL_REQUIRED", 403);
    if (!approverAuthorizer({ tenant_id: tenantId, actor_id: actorId, required_scope: "hrx.leave.termination.settle" })) {
      throw guardedError("Termination settlement approver is not authorized", "HRX_LEAVE_TERMINATION_APPROVER_DENIED", 403);
    }
    const previousResult = parseJson(previewRow.result_json, {});
    if ((previousResult.validation_errors ?? []).length > 0) throw guardedError("Termination preview contains unresolved ledger errors", "HRX_LEAVE_TERMINATION_REVIEW_REQUIRED");
    const source = sourceSnapshot(tenantId, previewRow.employee_id, previewRow.termination_date);
    const currentResult = calculate(source, previewRow.termination_date);
    const currentHash = hash({ source_version: source.source_version, result: currentResult });
    if (source.source_version !== previewRow.source_version || currentHash !== previewRow.snapshot_hash) {
      throw guardedError("Termination sources changed after preview", "HRX_LEAVE_TERMINATION_PREVIEW_STALE");
    }
    const idempotencyKey = `termination-approval:${previewId}`;
    const inputHash = hash({
      preview_reconciliation_id: previewId,
      employee_id: previewRow.employee_id,
      source_version: previewRow.source_version,
      snapshot_hash: previewRow.snapshot_hash,
      previewed_by_actor_id: previewedBy,
      approved_by_actor_id: actorId,
    });
    const existing = store.query("selectOne", { table: "hrx_leave_command_receipts", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
    if (existing) {
      if (existing.command_type !== "leave_termination_approval" || existing.input_hash !== inputHash) {
        throw guardedError("Termination preview already has a different approval decision", "HRX_LEAVE_TERMINATION_APPROVAL_CONFLICT");
      }
      return approvalReceiptView(existing);
    }
    const now = clock();
    return store.transaction((tx) => {
      const result = Object.freeze({
        preview_reconciliation_id: previewId,
        employee_id: previewRow.employee_id,
        source_version: previewRow.source_version,
        snapshot_hash: previewRow.snapshot_hash,
        previewed_by_actor_id: previewedBy,
        approved_by_actor_id: actorId,
        approved_at: now,
      });
      const receipt = tx.query("insert", { table: "hrx_leave_command_receipts", row: {
        tenant_id: tenantId,
        command_receipt_id: idFactory("leave_termination_approval"),
        idempotency_key: idempotencyKey,
        command_type: "leave_termination_approval",
        request_id: null,
        input_hash: inputHash,
        result_json: JSON.stringify(result),
        created_at: now,
      } });
      createSqlHrxAuditEventStore({ store: tx }).append({
        event_id: idFactory("leave_audit_termination_approval"),
        tenant_id: tenantId,
        actor_id: actorId,
        action: "hrx.leave.termination.approve",
        object_type: "LeaveTerminationReconciliation",
        object_id: previewId,
        decision: "allow",
        reason: "independent_termination_leave_settlement_approved",
        occurred_at: now,
        metadata: { approval_receipt_id: receipt.command_receipt_id, snapshot_hash: previewRow.snapshot_hash },
      });
      return approvalReceiptView(receipt);
    });
  }

  function reverseFutureRequests(tx, source, previewId, now) {
    const ledger = createSqlLeaveBalanceLedger({ store: tx });
    const changes = [];
    for (const request of source.requests.filter((row) => row.start_date > source.offboarding.separation_date && ["submitted", "reschedule_pending", "approved", "cancel_pending"].includes(row.state))) {
      const allocations = source.allocations.filter((row) => row.request_id === request.request_id);
      const releasedKeys = new Set(allocations.filter((row) => row.allocation_phase === "released").map((row) => `${row.entitlement_id}:${row.allocation_round ?? 1}`));
      if (["submitted", "reschedule_pending"].includes(request.state)) {
        for (const allocation of allocations.filter((row) => row.allocation_phase === "reserved" && !releasedKeys.has(`${row.entitlement_id}:${row.allocation_round ?? 1}`))) {
          const original = source.ledger.find((row) => row.allocation_id === allocation.allocation_id && row.entry_type === "reserved");
          const releaseAllocationId = idFactory("leave_termination_release_allocation");
          tx.query("insert", { table: "hrx_leave_request_allocations", row: { tenant_id: request.tenant_id, allocation_id: releaseAllocationId, request_id: request.request_id, entitlement_id: allocation.entitlement_id, allocation_phase: "released", allocation_round: allocation.allocation_round ?? 1, amount_minutes: allocation.amount_minutes, created_at: now } });
          ledger.append({ tenant_id: request.tenant_id, entry_id: idFactory("leave_termination_released"), employee_id: request.employee_id, policy_id: request.policy_id, group_id: original.group_id, policy_version_id: request.policy_version_id, entitlement_id: allocation.entitlement_id, allocation_id: releaseAllocationId, reverses_entry_id: original.entry_id, idempotency_key: `termination:${previewId}:release:${allocation.allocation_id}`, entry_type: "released", amount_minutes: allocation.amount_minutes, occurred_on: source.offboarding.separation_date, source_ref: original.source_ref, metadata: { termination_reconciliation_id: previewId } });
        }
        tx.query("updateOne", { table: "hrx_leave_requests", where: { tenant_id: request.tenant_id, request_id: request.request_id }, expected_version: request.state_version, patch: { state: "cancelled", state_version: request.state_version + 1, updated_at: now } });
      } else {
        for (const allocation of allocations.filter((row) => row.allocation_phase === "used")) {
          const original = source.ledger.find((row) => row.allocation_id === allocation.allocation_id && row.entry_type === "used");
          if (!original) continue;
          ledger.append({ tenant_id: request.tenant_id, entry_id: idFactory("leave_termination_used_reversal"), employee_id: request.employee_id, policy_id: request.policy_id, group_id: original.group_id, policy_version_id: request.policy_version_id, entitlement_id: allocation.entitlement_id, reverses_entry_id: original.entry_id, idempotency_key: `termination:${previewId}:used-reversal:${allocation.allocation_id}`, entry_type: "adjustment", adjustment_direction: "credit", amount_minutes: allocation.amount_minutes, occurred_on: source.offboarding.separation_date, source_ref: original.source_ref, metadata: { termination_reconciliation_id: previewId } });
        }
        tx.query("updateOne", { table: "hrx_leave_requests", where: { tenant_id: request.tenant_id, request_id: request.request_id }, expected_version: request.state_version, patch: { state: "cancelled_after_approval", state_version: request.state_version + 1, updated_at: now } });
      }
      const eventType = ["approved", "cancel_pending"].includes(request.state)
        ? "leave.request.cancelled_after_approval"
        : "leave.request.cancelled";
      tx.query("insert", { table: "hrx_leave_sync_outbox", row: {
        tenant_id: request.tenant_id,
        outbox_event_id: idFactory("leave_termination_request_outbox"),
        aggregate_type: "LeaveRequest",
        aggregate_id: request.request_id,
        event_type: eventType,
        payload_json: JSON.stringify({ request_id: request.request_id, termination_reconciliation_id: previewId }),
        idempotency_key: `termination:${previewId}:request:${request.request_id}:sync`,
        state: "pending",
        attempt_count: 0,
        available_at: now,
        delivered_at: null,
        provider_receipt_ref: null,
        last_error_code: null,
        updated_at: now,
        created_at: now,
      } });
      changes.push({ request_id: request.request_id, previous_state: request.state });
    }
    return changes;
  }

  function settleGroup(tx, tenantId, employeeId, group, previewId, terminationDate, now) {
    const ledger = createSqlLeaveBalanceLedger({ store: tx });
    const entries = ledger.list({ tenant_id: tenantId, employee_id: employeeId, group_id: group.group_id });
    const entitlements = tx.query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId, employee_id: employeeId, group_id: group.group_id } });
    const actions = [];
    if (group.unused_minutes > 0) {
      const allocations = planEarliestExpiryAllocations({ entitlements, ledger_entries: entries, requested_minutes: group.unused_minutes, on_date: terminationDate });
      for (const allocation of allocations) {
        ledger.append({ tenant_id: tenantId, entry_id: idFactory("leave_termination_expired"), employee_id: employeeId, policy_id: group.policy_code, group_id: group.group_id, policy_version_id: group.policy_version_id, entitlement_id: allocation.entitlement_id, idempotency_key: `termination:${previewId}:expiry:${allocation.entitlement_id}`, entry_type: "expired", amount_minutes: allocation.amount_minutes, occurred_on: terminationDate, source_ref: `TerminationReconciliation:${previewId}`, metadata: { payroll_boundary: "minutes_only" } });
        actions.push({ type: "expired", entitlement_id: allocation.entitlement_id, amount_minutes: allocation.amount_minutes });
      }
    }
    if (group.negative_minutes > 0) {
      if (!group.policy_version_id || !group.policy_code) throw guardedError("Termination deficit requires an active policy version", "HRX_LEAVE_TERMINATION_POLICY_REQUIRED");
      const entitlementId = idFactory("leave_termination_deficit_entitlement");
      tx.query("insert", { table: "hrx_leave_entitlements", row: { tenant_id: tenantId, entitlement_id: entitlementId, employee_id: employeeId, group_id: group.group_id, policy_version_id: group.policy_version_id, granted_minutes: group.negative_minutes, valid_from: terminationDate, expires_on: terminationDate, source_ref: `TerminationReconciliation:${previewId}`, idempotency_key: `termination:${previewId}:deficit-entitlement:${group.group_id}`, state_version: 1, created_at: now } });
      ledger.append({ tenant_id: tenantId, entry_id: idFactory("leave_termination_deficit_adjustment"), employee_id: employeeId, policy_id: group.policy_code, group_id: group.group_id, policy_version_id: group.policy_version_id, entitlement_id: entitlementId, idempotency_key: `termination:${previewId}:deficit-adjustment:${group.group_id}`, entry_type: "adjustment", adjustment_direction: "credit", amount_minutes: group.negative_minutes, occurred_on: terminationDate, source_ref: `TerminationReconciliation:${previewId}`, metadata: { payroll_recovery_required: true } });
      actions.push({ type: "adjustment_credit", entitlement_id: entitlementId, amount_minutes: group.negative_minutes });
    }
    return actions;
  }

  function execute(context, input = {}) {
    requireStepUp(context);
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const previewId = requiredString(input, "preview_reconciliation_id");
    const approvalReceiptId = requiredString(input, "approval_receipt_id");
    const idempotencyKey = requiredString(input, "idempotency_key");
    const approvalReceipt = store.query("selectOne", { table: "hrx_leave_command_receipts", where: { tenant_id: tenantId, command_receipt_id: approvalReceiptId } });
    if (!approvalReceipt || approvalReceipt.command_type !== "leave_termination_approval") {
      throw guardedError("Termination approval receipt not found", "HRX_LEAVE_TERMINATION_APPROVAL_REQUIRED", 403);
    }
    const approval = parseJson(approvalReceipt.result_json, {});
    const approvedBy = requiredString(approval, "approved_by_actor_id");
    if (approvedBy === actorId) throw guardedError("Termination settlement requires a different HR approver", "HRX_LEAVE_TERMINATION_DUAL_CONTROL_REQUIRED", 403);
    if (!approverAuthorizer({ tenant_id: tenantId, actor_id: approvedBy, required_scope: "hrx.leave.termination.settle" })) {
      throw guardedError("Termination settlement approver is not authorized", "HRX_LEAVE_TERMINATION_APPROVER_DENIED", 403);
    }
    const replay = store.query("selectOne", { table: "hrx_leave_termination_reconciliations", where: { tenant_id: tenantId, idempotency_key: idempotencyKey } });
    if (replay) {
      const replayResult = parseJson(replay.result_json, {});
      if (replay.preview_reconciliation_id !== previewId || replay.approved_by_actor_id !== approvedBy || replayResult.approval_receipt_id !== approvalReceiptId) {
        throw guardedError("Termination idempotency key was reused with different input", "HRX_LEAVE_IDEMPOTENCY_KEY_REUSED");
      }
      return view(replay);
    }
    const previewRow = store.query("selectOne", { table: "hrx_leave_termination_reconciliations", where: { tenant_id: tenantId, reconciliation_id: previewId } });
    if (!previewRow || previewRow.mode !== "preview") throw guardedError("Termination preview not found", "HRX_LEAVE_TERMINATION_PREVIEW_NOT_FOUND", 404);
    requireAuthorizedEmployee(context, previewRow.employee_id);
    if (approval.preview_reconciliation_id !== previewId
      || approval.employee_id !== previewRow.employee_id
      || approval.source_version !== previewRow.source_version
      || approval.snapshot_hash !== previewRow.snapshot_hash
      || approval.previewed_by_actor_id !== previewRow.executed_by_actor_id) {
      throw guardedError("Termination approval receipt does not match the preview", "HRX_LEAVE_TERMINATION_APPROVAL_MISMATCH", 403);
    }
    const previousResult = parseJson(previewRow.result_json, {});
    if ((previousResult.validation_errors ?? []).length > 0) throw guardedError("Termination preview contains unresolved ledger errors", "HRX_LEAVE_TERMINATION_REVIEW_REQUIRED");
    const source = sourceSnapshot(tenantId, previewRow.employee_id, previewRow.termination_date);
    const currentResult = calculate(source, previewRow.termination_date);
    const currentHash = hash({ source_version: source.source_version, result: currentResult });
    if (source.source_version !== previewRow.source_version || currentHash !== previewRow.snapshot_hash) {
      throw guardedError("Termination sources changed after preview", "HRX_LEAVE_TERMINATION_PREVIEW_STALE");
    }
    const now = clock();
    return store.transaction((tx) => {
      const reversedRequests = reverseFutureRequests(tx, source, previewId, now);
      const settlementActions = currentResult.groups.flatMap((group) => settleGroup(tx, tenantId, previewRow.employee_id, group, previewId, previewRow.termination_date, now).map((action) => ({ group_id: group.group_id, ...action })));
      const outboxEventId = idFactory("leave_termination_payroll_outbox");
      tx.query("insert", { table: "hrx_leave_sync_outbox", row: {
        tenant_id: tenantId,
        outbox_event_id: outboxEventId,
        aggregate_type: "LeaveTerminationReconciliation",
        aggregate_id: previewId,
        event_type: "leave.termination.payroll_reconciliation_requested",
        payload_json: JSON.stringify({ employee_id: previewRow.employee_id, termination_date: previewRow.termination_date, totals: currentResult.totals, groups: currentResult.groups.map((group) => ({ group_id: group.group_id, payroll_boundary: group.payroll_boundary })), raw_compensation_amount_included: false }),
        idempotency_key: `termination:${previewId}:payroll-outbox`,
        state: "pending",
        attempt_count: 0,
        available_at: now,
        delivered_at: null,
        provider_receipt_ref: null,
        created_at: now,
      } });
      const result = Object.freeze({ ...currentResult, reversed_requests: Object.freeze(reversedRequests), settlement_actions: Object.freeze(settlementActions), approval_receipt_id: approvalReceiptId, payroll_outbox_event_id: outboxEventId, sync_state: "pending" });
      const row = tx.query("insert", { table: "hrx_leave_termination_reconciliations", row: {
        tenant_id: tenantId,
        reconciliation_id: idFactory("leave_termination_execute"),
        employee_id: previewRow.employee_id,
        termination_date: previewRow.termination_date,
        mode: "execute",
        source_version: source.source_version,
        snapshot_hash: previewRow.snapshot_hash,
        preview_reconciliation_id: previewId,
        state: "approved_pending_sync",
        result_json: JSON.stringify(result),
        idempotency_key: idempotencyKey,
        created_at: now,
        approved_at: now,
        approved_by_actor_id: approvedBy,
        executed_by_actor_id: actorId,
        completed_at: null,
      } });
      tx.query("updateOne", { table: "hrx_offboarding_cases", where: { tenant_id: tenantId, offboarding_id: currentResult.offboarding_id }, patch: { leave_reconciliation_status: "approved_pending_sync" } });
      createSqlHrxAuditEventStore({ store: tx }).append({ event_id: idFactory("leave_audit_termination_execute"), tenant_id: tenantId, actor_id: actorId, action: "hrx.leave.termination.execute", object_type: "LeaveTerminationReconciliation", object_id: row.reconciliation_id, decision: "allow", reason: "dual_control_termination_leave_settlement_executed", occurred_at: now, metadata: { approved_by_actor_id: approvedBy, approval_receipt_id: approvalReceiptId, group_count: result.groups.length, unused_minutes: result.totals.unused_minutes, negative_minutes: result.totals.negative_minutes, payroll_outbox_event_id: outboxEventId } });
      return view(row);
    });
  }

  function recordPayrollDelivery(context, input = {}) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const outboxEventId = requiredString(input, "outbox_event_id");
    const providerReceipt = assertHrxProviderReceiptSucceeded(input.provider_receipt);
    const providerReceiptRef = providerReceipt.provider_receipt_ref;
    const now = clock();
    return store.transaction((tx) => {
      const outbox = tx.query("selectOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: tenantId, outbox_event_id: outboxEventId } });
      if (!outbox || outbox.event_type !== "leave.termination.payroll_reconciliation_requested") throw guardedError("Termination payroll outbox event not found", "HRX_LEAVE_TERMINATION_OUTBOX_NOT_FOUND", 404);
      const expectedPayloadHash = `sha256:${hash(parseJson(outbox.payload_json, {}))}`;
      const expectedIdempotencyKey = `${outbox.idempotency_key}:payroll`;
      if (providerReceipt.tenant_id !== tenantId
        || providerReceipt.provider_kind !== "payroll"
        || providerReceipt.idempotency_key !== expectedIdempotencyKey
        || providerReceipt.payload_hash !== expectedPayloadHash
        || !payrollReceiptAuthorizer({ tenant_id: tenantId, provider_id: providerReceipt.provider_id, operation: providerReceipt.operation })) {
        throw guardedError("Termination payroll receipt is not bound to this delivery", "HRX_LEAVE_TERMINATION_RECEIPT_MISMATCH", 403);
      }
      if (outbox.state === "delivered") {
        if (outbox.provider_receipt_ref !== providerReceiptRef) {
          throw guardedError("Termination payroll receipt does not match the recorded delivery", "HRX_LEAVE_TERMINATION_RECEIPT_CONFLICT");
        }
      } else {
        tx.query("updateOne", { table: "hrx_leave_sync_outbox", where: { tenant_id: tenantId, outbox_event_id: outboxEventId }, patch: { state: "delivered", delivered_at: now, provider_receipt_ref: providerReceiptRef, attempt_count: Number(outbox.attempt_count ?? 0) + 1, last_error_code: null, updated_at: now } });
      }
      const reconciliation = tx.query("selectOne", { table: "hrx_leave_termination_reconciliations", where: { tenant_id: tenantId, preview_reconciliation_id: outbox.aggregate_id } });
      if (!reconciliation) throw guardedError("Executed termination reconciliation not found", "HRX_LEAVE_TERMINATION_EXECUTION_NOT_FOUND", 404);
      const result = { ...parseJson(reconciliation.result_json, {}), sync_state: "delivered", provider_receipt_ref: providerReceiptRef, provider_receipt_id: providerReceipt.receipt_id, provider_id: providerReceipt.provider_id, provider_payload_hash: providerReceipt.payload_hash };
      const offboardingId = requiredString(result, "offboarding_id");
      const offboarding = tx.query("selectOne", {
        table: "hrx_offboarding_cases",
        where: { tenant_id: tenantId, offboarding_id: offboardingId },
      });
      if (!offboarding) {
        throw guardedError(
          "Termination offboarding case not found",
          "HRX_LEAVE_TERMINATION_OFFBOARDING_NOT_FOUND",
          404,
        );
      }
      if (
        offboarding.leave_reconciliation_evidence_ref &&
        offboarding.leave_reconciliation_evidence_ref !== providerReceiptRef
      ) {
        throw guardedError(
          "Termination payroll evidence conflicts with the offboarding case",
          "HRX_LEAVE_TERMINATION_EVIDENCE_CONFLICT",
        );
      }
      if (reconciliation.state === "approved_and_synced") {
        if (
          offboarding.leave_reconciliation_status !== "approved_and_synced" ||
          offboarding.leave_reconciliation_evidence_ref !== providerReceiptRef
        ) {
          throw guardedError(
            "Termination completion is missing its bound payroll evidence",
            "HRX_LEAVE_TERMINATION_EVIDENCE_MISSING",
          );
        }
        return view(reconciliation);
      }
      const updated = tx.query("updateOne", { table: "hrx_leave_termination_reconciliations", where: { tenant_id: tenantId, reconciliation_id: reconciliation.reconciliation_id }, patch: { state: "approved_and_synced", result_json: JSON.stringify(result), completed_at: now } });
      tx.query("updateOne", {
        table: "hrx_offboarding_cases",
        where: { tenant_id: tenantId, offboarding_id: offboardingId },
        patch: {
          leave_reconciliation_status: "approved_and_synced",
          leave_reconciliation_evidence_ref: providerReceiptRef,
        },
      });
      createSqlHrxAuditEventStore({ store: tx }).append({ event_id: idFactory("leave_audit_termination_synced"), tenant_id: tenantId, actor_id: actorId, action: "hrx.leave.termination.payroll_synced", object_type: "LeaveTerminationReconciliation", object_id: updated.reconciliation_id, decision: "allow", reason: "termination_payroll_handoff_receipt_recorded", occurred_at: now, metadata: { outbox_event_id: outboxEventId, provider_receipt_ref: providerReceiptRef, provider_receipt_id: providerReceipt.receipt_id, provider_id: providerReceipt.provider_id, provider_payload_hash: providerReceipt.payload_hash } });
      return view(updated);
    });
  }

  return Object.freeze({ list, candidates, preview, approve, execute, recordPayrollDelivery });
}
