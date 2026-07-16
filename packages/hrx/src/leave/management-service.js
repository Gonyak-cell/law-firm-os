import { createHash, randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../../audit/src/hrx-event-store-sql.js";
import { planEarliestExpiryAllocations } from "./allocation.js";
import { createSqlLeaveBalanceLedger } from "./balance.js";
import { calculateLeaveTypeEconomics } from "./type-economics.js";
import { createSqlWorkScheduleResolver } from "./work-schedule.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalText(input, field, maxLength = 2_000) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) throw new TypeError(`${field} must be ${maxLength} characters or fewer`);
  return normalized;
}

function evidenceRule(type) {
  let raw = {};
  try {
    raw = JSON.parse(type.evidence_rule_json ?? "{}");
  } catch {
    throw guardedError("Leave type evidence rule is invalid", "HRX_LEAVE_EVIDENCE_RULE_INVALID");
  }
  const allowedDocumentTypes = Array.isArray(raw.allowed_document_types)
    ? raw.allowed_document_types.filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim())
    : [];
  return Object.freeze({
    reason_required: type.code !== "ANNUAL" && raw.reason_required === true,
    attachment_required: raw.attachment_required === true,
    allowed_document_types: Object.freeze([...new Set(allowedDocumentTypes)]),
  });
}

function documentIds(input) {
  const values = Array.isArray(input.document_ids)
    ? [...new Set(input.document_ids.map((value) => typeof value === "string" ? value.trim() : "").filter(Boolean))]
    : [];
  if (values.length > 5) throw guardedError("At most five evidence documents may be attached", "HRX_LEAVE_EVIDENCE_LIMIT");
  return values;
}

function ownedEvidenceDocuments(tx, { tenantId, employeeId, type, ids }) {
  const rule = evidenceRule(type);
  return ids.map((documentId) => {
    const document = tx.query("selectOne", {
      table: "hrx_documents",
      where: { tenant_id: tenantId, document_id: documentId },
    });
    if (!document || document.employee_id !== employeeId) {
      throw guardedError("Evidence document is not owned by the applicant", "HRX_LEAVE_EVIDENCE_DOCUMENT_DENIED", 403);
    }
    if (rule.allowed_document_types.length > 0 && !rule.allowed_document_types.includes(document.document_type)) {
      throw guardedError("Evidence document type is not permitted", "HRX_LEAVE_EVIDENCE_DOCUMENT_TYPE_DENIED");
    }
    return document;
  });
}

function evidenceDocuments(tx, { tenantId, employeeId, type, input }) {
  const ids = documentIds(input);
  const rule = evidenceRule(type);
  const reasonText = optionalText(input, "reason_text");
  if (rule.reason_required && !reasonText) {
    throw guardedError("A reason is required by the selected leave type", "HRX_LEAVE_REASON_REQUIRED");
  }
  if (rule.attachment_required && ids.length === 0) {
    throw guardedError("An evidence document is required by the selected leave type", "HRX_LEAVE_ATTACHMENT_REQUIRED");
  }
  return Object.freeze({
    rule,
    reason_text: reasonText,
    handover_note: optionalText(input, "handover_note"),
    documents: Object.freeze(ownedEvidenceDocuments(tx, { tenantId, employeeId, type, ids })),
  });
}

function insertEvidenceAttachments({ tx, tenantId, requestId, documents, now, idFactory }) {
  for (const document of documents) {
    const existing = tx.query("selectOne", {
      table: "hrx_leave_request_attachments",
      where: { tenant_id: tenantId, request_id: requestId, document_id: document.document_id },
    });
    if (existing) continue;
    tx.query("insert", {
      table: "hrx_leave_request_attachments",
      row: {
        tenant_id: tenantId,
        attachment_id: idFrom(idFactory, "leave_attachment", `${requestId}:${document.document_id}`),
        request_id: requestId,
        document_id: document.document_id,
        access_level: "hr_and_assigned_approver",
        verification_state: document.source_status === "verified" ? "verified" : "pending",
        created_at: now,
      },
    });
  }
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
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function hash(value) {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function idempotencyReceipt(store, tenantId, idempotencyKey, inputHash) {
  const receipt = store.query("selectOne", {
    table: "hrx_leave_command_receipts",
    where: { tenant_id: tenantId, idempotency_key: idempotencyKey },
  });
  if (!receipt) return undefined;
  if (receipt.input_hash !== inputHash) {
    throw guardedError("Idempotency key was reused with different input", "HRX_LEAVE_IDEMPOTENCY_KEY_REUSED");
  }
  return clone(JSON.parse(receipt.result_json));
}

function isRequestOverlap(left, right) {
  return left.start_date <= right.end_date && right.start_date <= left.end_date;
}

function idFrom(factory, prefix, stableKey) {
  return factory(prefix, stableKey);
}

function defaultIdFactory(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function inferDurationMode(input, schedule) {
  if (input.duration_mode) return input.duration_mode;
  const totalScheduledMinutes = schedule.range_days.reduce((total, day) => total + day.scheduled_minutes, 0);
  if (schedule.requested_minutes === totalScheduledMinutes) return "full_day";
  if (schedule.segments.length === 1 && schedule.requested_minutes === Math.floor(totalScheduledMinutes / 2)) return "half_day";
  if (schedule.segments.length === 1 && schedule.requested_minutes === Math.floor(totalScheduledMinutes / 4)) return "quarter_day";
  return "hours";
}

function distributeMinutes(segments, totalMinutes) {
  const requestedTotal = segments.reduce((total, segment) => total + segment.requested_minutes, 0);
  let distributed = 0;
  return segments.map((segment, index) => {
    const amount = index === segments.length - 1
      ? totalMinutes - distributed
      : Math.floor((totalMinutes * segment.requested_minutes) / requestedTotal);
    distributed += amount;
    return amount;
  });
}

function planBalanceAllocations(input) {
  return input.requested_minutes === 0 ? Object.freeze([]) : planEarliestExpiryAllocations(input);
}

function modernRequestRow({ tenantId, input, type, policy, schedule, economics, policyRulesSnapshotHash, evidence, now }) {
  return {
    tenant_id: tenantId,
    request_id: requiredString(input, "request_id"),
    employee_id: requiredString(input, "employee_id"),
    policy_id: policy.policy_code,
    policy_version_id: policy.policy_version_id,
    leave_type: type.code,
    leave_type_id: type.leave_type_id,
    amount: input.requested_minutes / 60,
    requested_minutes: input.requested_minutes,
    duration_mode: economics.duration_mode,
    rounded_requested_minutes: economics.rounded_requested_minutes,
    paid_minutes: economics.paid_minutes,
    unpaid_minutes: economics.unpaid_minutes,
    deduction_minutes: economics.deduction_minutes,
    policy_rules_snapshot_hash: policyRulesSnapshotHash,
    start_date: requiredString(input, "start_date"),
    end_date: requiredString(input, "end_date"),
    timezone: schedule.timezone,
    schedule_snapshot_hash: schedule.schedule_snapshot_hash,
    state: "submitted",
    state_version: 1,
    submitted_at: now,
    approver_id: null,
    decided_at: null,
    decision_reason: null,
    handover_note: evidence.handover_note,
    reason_text: evidence.reason_text,
    evidence_rule_snapshot_json: JSON.stringify(evidence.rule),
    source_ref: `LeaveRequest:${input.request_id}`,
    created_at: now,
    updated_at: now,
  };
}

function appendReceipt({ tx, tenantId, idempotencyKey, commandType, requestId, inputHash, result, now, idFactory }) {
  tx.query("insert", {
    table: "hrx_leave_command_receipts",
    row: {
      tenant_id: tenantId,
      command_receipt_id: idFrom(idFactory, "leave_receipt", idempotencyKey),
      idempotency_key: idempotencyKey,
      command_type: commandType,
      request_id: requestId,
      input_hash: inputHash,
      result_json: JSON.stringify(result),
      created_at: now,
    },
  });
}

function appendOutbox({ tx, tenantId, requestId, eventType, payload, idempotencyKey, now, idFactory }) {
  tx.query("insert", {
    table: "hrx_leave_sync_outbox",
    row: {
      tenant_id: tenantId,
      outbox_event_id: idFrom(idFactory, "leave_outbox", idempotencyKey),
      aggregate_type: "LeaveRequest",
      aggregate_id: requestId,
      event_type: eventType,
      payload_json: JSON.stringify(payload),
      idempotency_key: idempotencyKey,
      state: "pending",
      attempt_count: 0,
      available_at: now,
      delivered_at: null,
      created_at: now,
    },
  });
}

async function inject(failureInjector, stage, details) {
  await failureInjector(stage, details);
}

function requireModernRequest(tx, tenantId, requestId) {
  const request = tx.query("selectOne", {
    table: "hrx_leave_requests",
    where: { tenant_id: tenantId, request_id: requestId },
  });
  if (!request) throw guardedError(`Leave request not found: ${requestId}`, "HRX_LEAVE_REQUEST_NOT_FOUND", 404);
  if (!Number.isInteger(request.requested_minutes)) {
    throw guardedError("Legacy leave request requires migration review", "HRX_LEAVE_LEGACY_REVIEW_REQUIRED");
  }
  return request;
}

export function createDurableLeaveManagementService({
  store,
  clock = () => new Date().toISOString(),
  idFactory = defaultIdFactory,
  approverResolver,
  holidayResolver,
  failureInjector = () => undefined,
  outboxDispatcher,
} = {}) {
  if (!store || typeof store.transaction !== "function" || typeof store.query !== "function") {
    throw new TypeError("durable leave management service requires a transactional store");
  }
  if (typeof approverResolver !== "function") throw new TypeError("durable leave management service requires approverResolver");

  async function executeIdempotent({ context, commandType, input, mutate }) {
    const tenantId = requiredString(context, "tenant_id");
    const actorId = requiredString(context, "actor_id");
    const idempotencyKey = requiredString(input, "idempotency_key");
    const inputHash = hash({ tenant_id: tenantId, actor_id: actorId, command_type: commandType, input });
    async function dispatch(result) {
      if (typeof outboxDispatcher === "function") {
        try {
          await outboxDispatcher({ ...context, tenant_id: tenantId, actor_id: actorId });
        } catch {}
      }
      return result;
    }
    const replay = idempotencyReceipt(store, tenantId, idempotencyKey, inputHash);
    if (replay) return dispatch(replay);
    try {
      const result = await store.transaction(async (tx) => {
        const replayInside = idempotencyReceipt(tx, tenantId, idempotencyKey, inputHash);
        if (replayInside) return replayInside;
        return mutate({ tx, tenantId, actorId, idempotencyKey, inputHash, now: clock() });
      });
      return dispatch(result);
    } catch (error) {
      if (error.safe_error_code === "HRX_TRANSACTION_CONFLICT") {
        const concurrentReplay = idempotencyReceipt(store, tenantId, idempotencyKey, inputHash);
        if (concurrentReplay) return dispatch(concurrentReplay);
      }
      throw error;
    }
  }

  async function releaseReservations({ tx, request, commandKey, now }) {
    const reserved = activeReservationAllocations(tx, request);
    const ledger = createSqlLeaveBalanceLedger({ store: tx });
    const released = [];
    for (const allocation of reserved) {
      const releaseAllocation = {
        tenant_id: request.tenant_id,
        allocation_id: idFrom(idFactory, "leave_allocation_released", `${commandKey}:${allocation.entitlement_id}`),
        request_id: request.request_id,
        entitlement_id: allocation.entitlement_id,
        allocation_phase: "released",
        allocation_round: allocation.allocation_round ?? 1,
        amount_minutes: allocation.amount_minutes,
        created_at: now,
      };
      tx.query("insert", { table: "hrx_leave_request_allocations", row: releaseAllocation });
      ledger.append({
        tenant_id: request.tenant_id,
        entry_id: idFrom(idFactory, "leave_released", `${commandKey}:${allocation.entitlement_id}`),
        employee_id: request.employee_id,
        policy_id: request.policy_id,
        policy_version_id: request.policy_version_id,
        group_id: allocation.group_id ?? tx.query("selectOne", {
          table: "hrx_leave_entitlements",
          where: { tenant_id: request.tenant_id, entitlement_id: allocation.entitlement_id },
        }).group_id,
        entitlement_id: allocation.entitlement_id,
        allocation_id: releaseAllocation.allocation_id,
        idempotency_key: `${commandKey}:released:${allocation.entitlement_id}`,
        entry_type: "released",
        amount_minutes: allocation.amount_minutes,
        occurred_on: now.slice(0, 10),
        source_ref: request.source_ref,
      });
      released.push(releaseAllocation);
    }
    return released;
  }

  function reverseApprovedUse({ tx, request, commandKey, now }) {
    const allocations = tx.query("select", {
      table: "hrx_leave_request_allocations",
      where: { tenant_id: request.tenant_id, request_id: request.request_id, allocation_phase: "used" },
    });
    const ledger = createSqlLeaveBalanceLedger({ store: tx });
    for (const allocation of allocations) {
      const original = tx.query("selectOne", {
        table: "hrx_leave_balance_entries",
        where: { tenant_id: request.tenant_id, allocation_id: allocation.allocation_id, entry_type: "used" },
      });
      if (!original) throw guardedError("Approved leave use ledger entry was not found", "HRX_LEAVE_USED_LEDGER_NOT_FOUND");
      ledger.append({
        tenant_id: request.tenant_id,
        entry_id: idFrom(idFactory, "leave_cancel_used_reversal", `${commandKey}:${allocation.entitlement_id}`),
        employee_id: request.employee_id,
        policy_id: request.policy_id,
        policy_version_id: request.policy_version_id,
        group_id: original.group_id,
        entitlement_id: allocation.entitlement_id,
        reverses_entry_id: original.entry_id,
        idempotency_key: `${commandKey}:used-reversal:${allocation.entitlement_id}`,
        entry_type: "adjustment",
        adjustment_direction: "credit",
        amount_minutes: allocation.amount_minutes,
        occurred_on: now.slice(0, 10),
        source_ref: original.source_ref,
        metadata: { cancellation_after_approval: true },
      });
    }
  }

  function activeReservationAllocations(tx, request) {
    const allocations = tx.query("select", {
      table: "hrx_leave_request_allocations",
      where: { tenant_id: request.tenant_id, request_id: request.request_id },
    });
    const released = new Set(
      allocations
        .filter((allocation) => allocation.allocation_phase === "released")
        .map((allocation) => `${allocation.entitlement_id}:${allocation.allocation_round ?? 1}`),
    );
    return allocations.filter(
      (allocation) =>
        allocation.allocation_phase === "reserved" &&
        !released.has(`${allocation.entitlement_id}:${allocation.allocation_round ?? 1}`),
    );
  }

  function reserveForDate({ tx, request, onDate, commandKey, now }) {
    const policy = tx.query("selectOne", {
      table: "hrx_leave_policy_versions",
      where: { tenant_id: request.tenant_id, policy_version_id: request.policy_version_id },
    });
    if (!policy) throw guardedError("Leave policy is required", "HRX_LEAVE_POLICY_REQUIRED");
    const entitlements = tx
      .query("select", { table: "hrx_leave_entitlements", where: { tenant_id: request.tenant_id, employee_id: request.employee_id } })
      .filter((entitlement) => entitlement.group_id === policy.group_id);
    const ledgerRows = tx.query("select", {
      table: "hrx_leave_balance_entries",
      where: { tenant_id: request.tenant_id, employee_id: request.employee_id, group_id: policy.group_id },
    });
    const plan = planBalanceAllocations({
      entitlements,
      ledger_entries: ledgerRows,
      requested_minutes: Number.isInteger(request.deduction_minutes) ? request.deduction_minutes : request.requested_minutes,
      on_date: onDate,
    });
    const existing = tx.query("select", {
      table: "hrx_leave_request_allocations",
      where: { tenant_id: request.tenant_id, request_id: request.request_id },
    });
    const allocationRound = Math.max(0, ...existing.map((allocation) => allocation.allocation_round ?? 1)) + 1;
    const ledger = createSqlLeaveBalanceLedger({ store: tx });
    for (const planned of plan) {
      const allocationId = idFrom(idFactory, "leave_allocation_reserved", `${commandKey}:${allocationRound}:${planned.entitlement_id}`);
      tx.query("insert", {
        table: "hrx_leave_request_allocations",
        row: {
          tenant_id: request.tenant_id,
          allocation_id: allocationId,
          request_id: request.request_id,
          entitlement_id: planned.entitlement_id,
          allocation_phase: "reserved",
          allocation_round: allocationRound,
          amount_minutes: planned.amount_minutes,
          created_at: now,
        },
      });
      ledger.append({
        tenant_id: request.tenant_id,
        entry_id: idFrom(idFactory, "leave_reserved", `${commandKey}:${allocationRound}:${planned.entitlement_id}`),
        employee_id: request.employee_id,
        policy_id: request.policy_id,
        policy_version_id: request.policy_version_id,
        group_id: policy.group_id,
        entitlement_id: planned.entitlement_id,
        allocation_id: allocationId,
        idempotency_key: `${commandKey}:reserved:${allocationRound}:${planned.entitlement_id}`,
        entry_type: "reserved",
        amount_minutes: planned.amount_minutes,
        occurred_on: now.slice(0, 10),
        source_ref: request.source_ref,
      });
    }
    return plan;
  }

  async function replaceReservations({ tx, request, onDate, commandKey, now }) {
    await releaseReservations({ tx, request, commandKey: `${commandKey}:replace`, now });
    return reserveForDate({ tx, request, onDate, commandKey, now });
  }

  function requireApplicant(request, actorId, applicantActorIds = []) {
    if (actorId !== request.employee_id && !applicantActorIds.includes(actorId)) {
      throw guardedError("Actor is not the leave request applicant", "HRX_LEAVE_APPLICANT_SCOPE_DENIED", 403);
    }
  }

  function requireAssignedApproval({ tx, tenantId, requestId, actorId, now }) {
    const approval = tx.query("selectOne", {
      table: "hrx_approval_requests",
      where: { tenant_id: tenantId, object_type: "LeaveRequest", object_id: requestId },
    });
    const step = approval && tx.query("selectOne", {
      table: "hrx_approval_steps",
      where: { tenant_id: tenantId, approval_id: approval.approval_id, step_order: approval.current_step },
    });
    const assignment = step && tx.query("selectOne", {
      table: "hrx_approval_assignments",
      where: { tenant_id: tenantId, approval_step_id: step.approval_step_id },
    });
    const delegated = assignment && tx.query("select", {
      table: "hrx_approval_delegations",
      where: { tenant_id: tenantId, delegator_actor_id: assignment.approver_actor_id, delegate_actor_id: actorId },
    }).some(
      (row) =>
        row.object_type === "LeaveRequest" &&
        !row.revoked_at &&
        !row.expired_at &&
        row.valid_from <= now &&
        row.valid_to >= now &&
        (!row.organization_scope_id || row.organization_scope_id === assignment.organization_scope_id),
    );
    const escalation = step && tx.query("select", {
      table: "hrx_approval_escalations",
      where: { tenant_id: tenantId, approval_step_id: step.approval_step_id, substitute_actor_id: actorId },
    }).find((row) => row.state === "active" && !row.resolved_at && row.due_at <= now);
    const assignmentActive = assignment && assignment.valid_from <= now && (!assignment.valid_to || assignment.valid_to >= now);
    const assigned = assignmentActive && (assignment.approver_actor_id === actorId || delegated);
    if (!approval || !step || !assignment || (!assigned && !escalation)) {
      throw guardedError("Actor is not assigned to this approval", "HRX_LEAVE_APPROVER_SCOPE_DENIED", 403);
    }
    return { approval, step, assignment, delegated: Boolean(delegated), escalation: escalation ?? null };
  }

  function resolveEscalations(tx, tenantId, approvalStepId, state, now) {
    const rows = tx.query("select", {
      table: "hrx_approval_escalations",
      where: { tenant_id: tenantId, approval_step_id: approvalStepId, state: "active" },
    });
    for (const row of rows) {
      tx.query("updateOne", {
        table: "hrx_approval_escalations",
        where: { tenant_id: tenantId, escalation_id: row.escalation_id },
        patch: { state, resolved_at: now },
      });
    }
  }

  function replaceScheduleSegments({ tx, request, schedule, now }) {
    const current = tx.query("select", {
      table: "hrx_leave_request_segments",
      where: { tenant_id: request.tenant_id, request_id: request.request_id },
    });
    for (const segment of current) {
      tx.query("deleteOne", {
        table: "hrx_leave_request_segments",
        where: { tenant_id: request.tenant_id, segment_id: segment.segment_id },
      });
    }
    const hasEconomicsSnapshot = typeof request.policy_rules_snapshot_hash === "string";
    const segmentPaidMinutes = hasEconomicsSnapshot ? distributeMinutes(schedule.segments, request.paid_minutes) : [];
    const segmentDeductionMinutes = hasEconomicsSnapshot ? distributeMinutes(schedule.segments, request.deduction_minutes) : [];
    for (const [index, segment] of schedule.segments.entries()) {
      tx.query("insert", {
        table: "hrx_leave_request_segments",
        row: {
          tenant_id: request.tenant_id,
          segment_id: idFrom(idFactory, "leave_segment", `${request.request_id}:${segment.date}`),
          request_id: request.request_id,
          segment_date: segment.date,
          scheduled_minutes: segment.scheduled_minutes,
          requested_minutes: segment.requested_minutes,
          ...(hasEconomicsSnapshot ? {
            paid_minutes: segmentPaidMinutes[index],
            deduction_minutes: segmentDeductionMinutes[index],
            policy_rules_snapshot_hash: request.policy_rules_snapshot_hash,
          } : {}),
          timezone: segment.timezone,
          schedule_profile_id: segment.schedule_profile_id,
          schedule_snapshot_hash: segment.schedule_snapshot_hash,
          work_periods_json: JSON.stringify(segment.work_periods ?? []),
          leave_periods_json: JSON.stringify(segment.leave_periods ?? []),
          created_at: now,
        },
      });
    }
  }

  return Object.freeze({
    async preview(context, input = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const employeeId = requiredString(input, "employee_id");
      const employee = store.query("selectOne", {
        table: "hrx_employees",
        where: { tenant_id: tenantId, employee_id: employeeId },
      });
      if (!employee || employee.status !== "active") {
        throw guardedError("Active employee is required", "HRX_LEAVE_ACTIVE_EMPLOYEE_REQUIRED");
      }
      const type = store.query("selectOne", {
        table: "hrx_leave_types",
        where: { tenant_id: tenantId, leave_type_id: requiredString(input, "leave_type_id") },
      });
      const policy = store.query("selectOne", {
        table: "hrx_leave_policy_versions",
        where: { tenant_id: tenantId, policy_version_id: requiredString(input, "policy_version_id") },
      });
      if (!type || type.status !== "active" || !policy || policy.status !== "active" || type.group_id !== policy.group_id) {
        throw guardedError("An active leave type and matching policy are required", "HRX_LEAVE_POLICY_REQUIRED");
      }
      const startDate = requiredString(input, "start_date");
      const endDate = requiredString(input, "end_date");
      if (!(policy.effective_from <= startDate && (!policy.effective_to || policy.effective_to >= endDate))) {
        throw guardedError("Leave policy is not effective for the request dates", "HRX_LEAVE_POLICY_NOT_EFFECTIVE");
      }
      const overlap = store
        .query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId, employee_id: employeeId } })
        .find(
          (request) =>
            !["rejected", "cancelled", "cancelled_after_approval", "review_required"].includes(request.state) &&
            isRequestOverlap(request, { start_date: startDate, end_date: endDate }),
        );
      if (overlap) throw guardedError("Leave request dates overlap an existing request", "HRX_LEAVE_REQUEST_OVERLAP");
      const schedule = createSqlWorkScheduleResolver({ store, holidayResolver }).preview({
        tenant_id: tenantId,
        employee_id: employeeId,
        organization_ids: input.organization_ids,
        start_date: startDate,
        end_date: endDate,
        duration_mode: input.duration_mode,
        requested_minutes: input.requested_minutes,
      });
      const policyRules = JSON.parse(policy.rules_json ?? "{}");
      const economics = calculateLeaveTypeEconomics({
        rules: policyRules,
        leave_type_id: type.leave_type_id,
        duration_mode: schedule.duration_mode,
        requested_minutes: schedule.requested_minutes,
      });
      const entitlements = store
        .query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId, employee_id: employeeId } })
        .filter((entitlement) => entitlement.group_id === policy.group_id);
      const ledgerRows = store.query("select", {
        table: "hrx_leave_balance_entries",
        where: { tenant_id: tenantId, employee_id: employeeId, group_id: policy.group_id },
      });
      const allocations = planBalanceAllocations({
        entitlements,
        ledger_entries: ledgerRows,
        requested_minutes: economics.deduction_minutes,
        on_date: startDate,
      }).map((allocation) => {
        const entitlement = entitlements.find((candidate) => candidate.entitlement_id === allocation.entitlement_id);
        return Object.freeze({ ...allocation, expires_on: entitlement?.expires_on ?? null });
      });
      const balance = createSqlLeaveBalanceLedger({ store }).balance({
        tenant_id: tenantId,
        employee_id: employeeId,
        group_id: policy.group_id,
      });
      const approver = await approverResolver({ tenant_id: tenantId, employee, input, policy, actor_id: context.actor_id ?? null });
      if (!approver || typeof approver.actor_id !== "string" || !approver.actor_id.trim()) {
        throw guardedError("A current approver assignment is required", "HRX_LEAVE_APPROVER_REQUIRED");
      }
      if (context.actor_id && approver.actor_id === context.actor_id) {
        throw guardedError("Applicant cannot be assigned as approver", "HRX_LEAVE_SELF_APPROVAL_FORBIDDEN", 403);
      }
      return Object.freeze({
        employee_id: employeeId,
        leave_type: clone(type),
        policy: Object.freeze({ ...clone(policy), rules: policyRules }),
        schedule,
        economics,
        allocations,
        balance,
        available_after_minutes: balance.available_minutes - economics.deduction_minutes,
        input_requirements: evidenceRule(type),
        approval_plan: Object.freeze({
          step_count: 1,
          current_step: 1,
          approver_actor_id: approver.actor_id,
          organization_scope_id: approver.organization_scope_id ?? null,
        }),
      });
    },

    async grantEntitlement(context, input = {}) {
      return executeIdempotent({
        context,
        commandType: "grant_entitlement",
        input,
        mutate: async ({ tx, tenantId, idempotencyKey, inputHash, now }) => {
          const employeeId = requiredString(input, "employee_id");
          const groupId = requiredString(input, "group_id");
          const policyVersionId = requiredString(input, "policy_version_id");
          if (!Number.isInteger(input.granted_minutes) || input.granted_minutes <= 0) {
            throw new TypeError("granted_minutes must be a positive integer");
          }
          const policy = tx.query("selectOne", {
            table: "hrx_leave_policy_versions",
            where: { tenant_id: tenantId, policy_version_id: policyVersionId },
          });
          if (!policy || policy.group_id !== groupId) {
            throw guardedError("Leave policy version is not available for the group", "HRX_LEAVE_POLICY_REQUIRED");
          }
          const entitlement = tx.query("insert", {
            table: "hrx_leave_entitlements",
            row: {
              tenant_id: tenantId,
              entitlement_id: requiredString(input, "entitlement_id"),
              employee_id: employeeId,
              group_id: groupId,
              policy_version_id: policyVersionId,
              granted_minutes: input.granted_minutes,
              valid_from: requiredString(input, "valid_from"),
              expires_on: input.expires_on ?? null,
              source_ref: requiredString(input, "source_ref"),
              idempotency_key: `${idempotencyKey}:entitlement`,
              state_version: 1,
              created_at: now,
            },
          });
          createSqlLeaveBalanceLedger({ store: tx }).append({
            tenant_id: tenantId,
            entry_id: idFrom(idFactory, "leave_earned", idempotencyKey),
            employee_id: employeeId,
            policy_id: policy.policy_code,
            policy_version_id: policyVersionId,
            group_id: groupId,
            entitlement_id: entitlement.entitlement_id,
            idempotency_key: `${idempotencyKey}:earned`,
            entry_type: "earned",
            amount_minutes: input.granted_minutes,
            occurred_on: input.valid_from,
            source_ref: input.source_ref,
          });
          const result = Object.freeze({ entitlement: clone(entitlement) });
          appendReceipt({
            tx,
            tenantId,
            idempotencyKey,
            commandType: "grant_entitlement",
            requestId: null,
            inputHash,
            result,
            now,
            idFactory,
          });
          return result;
        },
      });
    },

    async submit(context, input = {}) {
      return executeIdempotent({
        context,
        commandType: "submit",
        input,
        mutate: async ({ tx, tenantId, actorId, idempotencyKey, inputHash, now }) => {
          const employeeId = requiredString(input, "employee_id");
          const employee = tx.query("selectOne", {
            table: "hrx_employees",
            where: { tenant_id: tenantId, employee_id: employeeId },
          });
          if (!employee || employee.status !== "active") {
            throw guardedError("Active employee is required", "HRX_LEAVE_ACTIVE_EMPLOYEE_REQUIRED");
          }
          const type = tx.query("selectOne", {
            table: "hrx_leave_types",
            where: { tenant_id: tenantId, leave_type_id: requiredString(input, "leave_type_id") },
          });
          const policy = tx.query("selectOne", {
            table: "hrx_leave_policy_versions",
            where: { tenant_id: tenantId, policy_version_id: requiredString(input, "policy_version_id") },
          });
          if (!type || type.status !== "active" || !policy || policy.status !== "active" || type.group_id !== policy.group_id) {
            throw guardedError("An active leave type and matching policy are required", "HRX_LEAVE_POLICY_REQUIRED");
          }
          if (!(policy.effective_from <= input.start_date && (!policy.effective_to || policy.effective_to >= input.end_date))) {
            throw guardedError("Leave policy is not effective for the request dates", "HRX_LEAVE_POLICY_NOT_EFFECTIVE");
          }
          const overlap = tx
            .query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId, employee_id: employeeId } })
            .find(
              (request) =>
                !["rejected", "cancelled", "cancelled_after_approval", "review_required"].includes(request.state) &&
                isRequestOverlap(request, input),
            );
          if (overlap) throw guardedError("Leave request dates overlap an existing request", "HRX_LEAVE_REQUEST_OVERLAP");

          const scheduleResolver = createSqlWorkScheduleResolver({ store: tx, holidayResolver });
          const scheduleInput = {
            tenant_id: tenantId,
            employee_id: employeeId,
            organization_ids: input.organization_ids,
            start_date: input.start_date,
            end_date: input.end_date,
            requested_minutes: input.requested_minutes,
          };
          const schedule = input.duration_mode
            ? scheduleResolver.preview({ ...scheduleInput, duration_mode: input.duration_mode })
            : scheduleResolver.resolve(scheduleInput);
          if (schedule.requested_minutes !== input.requested_minutes) {
            throw guardedError("Requested minutes do not match the work schedule calculation", "HRX_LEAVE_DURATION_MISMATCH");
          }
          const policyRules = JSON.parse(policy.rules_json ?? "{}");
          const economics = calculateLeaveTypeEconomics({
            rules: policyRules,
            leave_type_id: type.leave_type_id,
            duration_mode: inferDurationMode(input, schedule),
            requested_minutes: schedule.requested_minutes,
          });
          const policyRulesSnapshotHash = hash(policyRules);
          const entitlements = tx
            .query("select", { table: "hrx_leave_entitlements", where: { tenant_id: tenantId, employee_id: employeeId } })
            .filter((entitlement) => entitlement.group_id === policy.group_id);
          const ledgerRows = tx.query("select", {
            table: "hrx_leave_balance_entries",
            where: { tenant_id: tenantId, employee_id: employeeId, group_id: policy.group_id },
          });
          const allocationPlan = planBalanceAllocations({
            entitlements,
            ledger_entries: ledgerRows,
            requested_minutes: economics.deduction_minutes,
            on_date: input.start_date,
          });
          const evidence = evidenceDocuments(tx, { tenantId, employeeId, type, input });
          const approver = await approverResolver({ tenant_id: tenantId, employee, input, policy, actor_id: actorId });
          if (!approver || typeof approver.actor_id !== "string" || !approver.actor_id.trim()) {
            throw guardedError("A current approver assignment is required", "HRX_LEAVE_APPROVER_REQUIRED");
          }
          if (approver.actor_id === actorId) {
            throw guardedError("Applicant cannot be assigned as approver", "HRX_LEAVE_SELF_APPROVAL_FORBIDDEN", 403);
          }

          const request = modernRequestRow({
            tenantId,
            input,
            type,
            policy,
            schedule,
            economics,
            policyRulesSnapshotHash,
            evidence,
            now,
          });
          tx.query("insert", { table: "hrx_leave_requests", row: request });
          insertEvidenceAttachments({ tx, tenantId, requestId: request.request_id, documents: evidence.documents, now, idFactory });
          await inject(failureInjector, "submit.after_request", { request_id: request.request_id });
          const segmentPaidMinutes = distributeMinutes(schedule.segments, economics.paid_minutes);
          const segmentDeductionMinutes = distributeMinutes(schedule.segments, economics.deduction_minutes);
          for (const [index, segment] of schedule.segments.entries()) {
            tx.query("insert", {
              table: "hrx_leave_request_segments",
              row: {
                tenant_id: tenantId,
                segment_id: idFrom(idFactory, "leave_segment", `${request.request_id}:${segment.date}`),
                request_id: request.request_id,
                segment_date: segment.date,
                scheduled_minutes: segment.scheduled_minutes,
                requested_minutes: segment.requested_minutes,
                paid_minutes: segmentPaidMinutes[index],
                deduction_minutes: segmentDeductionMinutes[index],
                policy_rules_snapshot_hash: policyRulesSnapshotHash,
                timezone: segment.timezone,
                schedule_profile_id: segment.schedule_profile_id,
                schedule_snapshot_hash: segment.schedule_snapshot_hash,
                work_periods_json: JSON.stringify(segment.work_periods ?? []),
                leave_periods_json: JSON.stringify(segment.leave_periods ?? []),
                created_at: now,
              },
            });
          }
          await inject(failureInjector, "submit.after_segments", { request_id: request.request_id });
          const ledger = createSqlLeaveBalanceLedger({ store: tx });
          for (const planned of allocationPlan) {
            const allocationId = idFrom(idFactory, "leave_allocation_reserved", `${request.request_id}:${planned.entitlement_id}`);
            tx.query("insert", {
              table: "hrx_leave_request_allocations",
              row: {
                tenant_id: tenantId,
                allocation_id: allocationId,
                request_id: request.request_id,
                entitlement_id: planned.entitlement_id,
                allocation_phase: "reserved",
                allocation_round: 1,
                amount_minutes: planned.amount_minutes,
                created_at: now,
              },
            });
            ledger.append({
              tenant_id: tenantId,
              entry_id: idFrom(idFactory, "leave_reserved", `${request.request_id}:${planned.entitlement_id}`),
              employee_id: employeeId,
              policy_id: policy.policy_code,
              policy_version_id: policy.policy_version_id,
              group_id: policy.group_id,
              entitlement_id: planned.entitlement_id,
              allocation_id: allocationId,
              idempotency_key: `${idempotencyKey}:reserved:${planned.entitlement_id}`,
              entry_type: "reserved",
              amount_minutes: planned.amount_minutes,
              occurred_on: now.slice(0, 10),
              source_ref: request.source_ref,
            });
          }
          await inject(failureInjector, "submit.after_reservation", { request_id: request.request_id });
          const approvalId = idFrom(idFactory, "leave_approval", request.request_id);
          const stepId = idFrom(idFactory, "leave_approval_step", `${request.request_id}:1`);
          tx.query("insert", {
            table: "hrx_approval_requests",
            row: {
              tenant_id: tenantId,
              approval_id: approvalId,
              object_type: "LeaveRequest",
              object_id: request.request_id,
              applicant_employee_id: employeeId,
              state: "pending",
              current_step: 1,
              state_version: 1,
              created_at: now,
              updated_at: now,
            },
          });
          tx.query("insert", {
            table: "hrx_approval_steps",
            row: {
              tenant_id: tenantId,
              approval_step_id: stepId,
              approval_id: approvalId,
              step_order: 1,
              state: "pending",
              decision_actor_id: null,
              decision_reason: null,
              decided_at: null,
              created_at: now,
              updated_at: now,
            },
          });
          tx.query("insert", {
            table: "hrx_approval_assignments",
            row: {
              tenant_id: tenantId,
              approval_assignment_id: idFrom(idFactory, "leave_approval_assignment", request.request_id),
              approval_step_id: stepId,
              approver_actor_id: approver.actor_id,
              organization_scope_id: approver.organization_scope_id ?? null,
              source_assignment_version: requiredString(approver, "source_assignment_version"),
              valid_from: approver.valid_from ?? now,
              valid_to: approver.valid_to ?? null,
              created_at: now,
            },
          });
          await inject(failureInjector, "submit.after_approval", { request_id: request.request_id });
          createSqlHrxAuditEventStore({ store: tx }).append({
            event_id: idFrom(idFactory, "leave_audit_submit", idempotencyKey),
            tenant_id: tenantId,
            actor_id: actorId,
            action: "hrx.leave.submit",
            object_type: "LeaveRequest",
            object_id: request.request_id,
            decision: "approval_required",
            reason: "leave_request_submitted_and_reserved",
            occurred_at: now,
            metadata: { employee_id: employeeId, policy_version_id: policy.policy_version_id },
          });
          await inject(failureInjector, "submit.after_audit", { request_id: request.request_id });
          appendOutbox({
            tx,
            tenantId,
            requestId: request.request_id,
            eventType: "leave.request.submitted",
            payload: { request_id: request.request_id, approval_id: approvalId },
            idempotencyKey: `${idempotencyKey}:outbox`,
            now,
            idFactory,
          });
          await inject(failureInjector, "submit.after_outbox", { request_id: request.request_id });
          const result = Object.freeze({ leave_request: clone(request), approval_id: approvalId });
          appendReceipt({
            tx,
            tenantId,
            idempotencyKey,
            commandType: "submit",
            requestId: request.request_id,
            inputHash,
            result,
            now,
            idFactory,
          });
          await inject(failureInjector, "submit.after_receipt", { request_id: request.request_id });
          return result;
        },
      });
    },

    async amendSubmitted(context, input = {}) {
      return executeIdempotent({
        context,
        commandType: "amend",
        input,
        mutate: async ({ tx, tenantId, actorId, idempotencyKey, inputHash, now }) => {
          const requestId = requiredString(input, "request_id");
          const request = requireModernRequest(tx, tenantId, requestId);
          if (request.state !== "submitted") throw guardedError("Leave request is not submitted", "HRX_LEAVE_STATE_CONFLICT");
          requireApplicant(request, actorId, input.applicant_actor_ids ?? []);
          const startDate = requiredString(input, "start_date");
          const endDate = requiredString(input, "end_date");
          const overlap = tx
            .query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId, employee_id: request.employee_id } })
            .find(
              (row) =>
                row.request_id !== requestId &&
                !["rejected", "cancelled", "cancelled_after_approval", "review_required"].includes(row.state) &&
                isRequestOverlap(row, { start_date: startDate, end_date: endDate }),
            );
          if (overlap) throw guardedError("Leave request dates overlap an existing request", "HRX_LEAVE_REQUEST_OVERLAP");
          const schedule = createSqlWorkScheduleResolver({ store: tx, holidayResolver }).resolve({
            tenant_id: tenantId,
            employee_id: request.employee_id,
            organization_ids: input.organization_ids,
            start_date: startDate,
            end_date: endDate,
            requested_minutes: request.requested_minutes,
          });
          await replaceReservations({ tx, request, onDate: startDate, commandKey: idempotencyKey, now });
          replaceScheduleSegments({ tx, request, schedule, now });
          const amended = tx.query("updateOne", {
            table: "hrx_leave_requests",
            where: { tenant_id: tenantId, request_id: requestId },
            expected_version: request.state_version,
            patch: {
              start_date: startDate,
              end_date: endDate,
              timezone: schedule.timezone,
              schedule_snapshot_hash: schedule.schedule_snapshot_hash,
              state_version: request.state_version + 1,
              updated_at: now,
            },
          });
          createSqlHrxAuditEventStore({ store: tx }).append({
            event_id: idFrom(idFactory, "leave_audit_amend", idempotencyKey),
            tenant_id: tenantId,
            actor_id: actorId,
            action: "hrx.leave.amend",
            object_type: "LeaveRequest",
            object_id: requestId,
            decision: "allow",
            reason: "submitted_leave_dates_amended",
            occurred_at: now,
            metadata: { previous_start_date: request.start_date, previous_end_date: request.end_date },
          });
          appendOutbox({
            tx,
            tenantId,
            requestId,
            eventType: "leave.request.amended",
            payload: { request_id: requestId, start_date: startDate, end_date: endDate },
            idempotencyKey: `${idempotencyKey}:outbox`,
            now,
            idFactory,
          });
          const result = Object.freeze({ leave_request: clone(amended) });
          appendReceipt({ tx, tenantId, idempotencyKey, commandType: "amend", requestId, inputHash, result, now, idFactory });
          return result;
        },
      });
    },

    async requestAdditionalInformation(context, input = {}) {
      return executeIdempotent({
        context,
        commandType: "request_additional_information",
        input,
        mutate: async ({ tx, tenantId, actorId, idempotencyKey, inputHash, now }) => {
          const requestId = requiredString(input, "request_id");
          const request = requireModernRequest(tx, tenantId, requestId);
          if (request.state !== "submitted") throw guardedError("Leave request is not submitted", "HRX_LEAVE_STATE_CONFLICT");
          if (request.leave_type === "ANNUAL") {
            throw guardedError("Additional information cannot be required for statutory annual leave", "HRX_LEAVE_INFORMATION_REQUEST_NOT_ALLOWED");
          }
          if ((input.applicant_actor_ids ?? []).includes(actorId) || actorId === request.employee_id) {
            throw guardedError("Applicant cannot request additional information from themselves", "HRX_LEAVE_SELF_APPROVAL_FORBIDDEN", 403);
          }
          const { step } = requireAssignedApproval({ tx, tenantId, requestId, actorId, now });
          if (request.information_requested_at && (!request.information_provided_at || request.information_provided_at < request.information_requested_at)) {
            throw guardedError("Additional information is already pending", "HRX_LEAVE_INFORMATION_ALREADY_PENDING");
          }
          const message = requiredString(input, "request_message");
          if (message.length > 1_000) throw new TypeError("request_message must be 1000 characters or fewer");
          const updated = tx.query("updateOne", {
            table: "hrx_leave_requests",
            where: { tenant_id: tenantId, request_id: requestId },
            expected_version: request.state_version,
            patch: {
              information_request_message: message,
              information_requested_at: now,
              information_requested_by: actorId,
              information_provided_at: null,
              state_version: request.state_version + 1,
              updated_at: now,
            },
          });
          tx.query("updateOne", {
            table: "hrx_approval_steps",
            where: { tenant_id: tenantId, approval_step_id: step.approval_step_id },
            patch: { decision_reason: "additional_information_requested", updated_at: now },
          });
          createSqlHrxAuditEventStore({ store: tx }).append({
            event_id: idFrom(idFactory, "leave_audit_information_request", idempotencyKey),
            tenant_id: tenantId,
            actor_id: actorId,
            action: "hrx.leave.information.request",
            object_type: "LeaveRequest",
            object_id: requestId,
            decision: "approval_required",
            reason: "assigned_approver_requested_additional_information",
            occurred_at: now,
            metadata: { message_included: false },
          });
          appendOutbox({
            tx,
            tenantId,
            requestId,
            eventType: "leave.request.additional_information_requested",
            payload: { request_id: requestId },
            idempotencyKey: `${idempotencyKey}:outbox`,
            now,
            idFactory,
          });
          const result = Object.freeze({ leave_request: clone(updated) });
          appendReceipt({ tx, tenantId, idempotencyKey, commandType: "request_additional_information", requestId, inputHash, result, now, idFactory });
          return result;
        },
      });
    },

    async provideAdditionalInformation(context, input = {}) {
      return executeIdempotent({
        context,
        commandType: "provide_additional_information",
        input,
        mutate: async ({ tx, tenantId, actorId, idempotencyKey, inputHash, now }) => {
          const requestId = requiredString(input, "request_id");
          const request = requireModernRequest(tx, tenantId, requestId);
          if (request.state !== "submitted") throw guardedError("Leave request is not submitted", "HRX_LEAVE_STATE_CONFLICT");
          requireApplicant(request, actorId, input.applicant_actor_ids ?? []);
          if (!request.information_requested_at || (request.information_provided_at && request.information_provided_at >= request.information_requested_at)) {
            throw guardedError("No additional information is pending", "HRX_LEAVE_INFORMATION_NOT_PENDING");
          }
          const type = tx.query("selectOne", {
            table: "hrx_leave_types",
            where: { tenant_id: tenantId, leave_type_id: request.leave_type_id },
          });
          if (!type) throw guardedError("Leave type not found", "HRX_LEAVE_TYPE_NOT_FOUND", 404);
          const ids = documentIds(input);
          const reasonText = optionalText(input, "reason_text") ?? request.reason_text ?? null;
          const handoverNote = optionalText(input, "handover_note") ?? request.handover_note ?? null;
          const documents = ownedEvidenceDocuments(tx, { tenantId, employeeId: request.employee_id, type, ids });
          if (!reasonText && !handoverNote && documents.length === 0) {
            throw guardedError("A reason, handover note, or evidence document is required", "HRX_LEAVE_INFORMATION_REQUIRED");
          }
          const rule = evidenceRule(type);
          const existingAttachmentCount = tx.query("select", {
            table: "hrx_leave_request_attachments",
            where: { tenant_id: tenantId, request_id: requestId },
          }).length;
          if (rule.reason_required && !reasonText) throw guardedError("A reason is required by the selected leave type", "HRX_LEAVE_REASON_REQUIRED");
          if (rule.attachment_required && existingAttachmentCount + documents.length === 0) {
            throw guardedError("An evidence document is required by the selected leave type", "HRX_LEAVE_ATTACHMENT_REQUIRED");
          }
          insertEvidenceAttachments({ tx, tenantId, requestId, documents, now, idFactory });
          const updated = tx.query("updateOne", {
            table: "hrx_leave_requests",
            where: { tenant_id: tenantId, request_id: requestId },
            expected_version: request.state_version,
            patch: {
              reason_text: reasonText,
              handover_note: handoverNote,
              information_provided_at: now,
              state_version: request.state_version + 1,
              updated_at: now,
            },
          });
          createSqlHrxAuditEventStore({ store: tx }).append({
            event_id: idFrom(idFactory, "leave_audit_information_provided", idempotencyKey),
            tenant_id: tenantId,
            actor_id: actorId,
            action: "hrx.leave.information.provide",
            object_type: "LeaveRequest",
            object_id: requestId,
            decision: "allow",
            reason: "applicant_provided_additional_information",
            occurred_at: now,
            metadata: { attachment_count: documents.length, reason_included: Boolean(reasonText), handover_included: Boolean(handoverNote) },
          });
          appendOutbox({
            tx,
            tenantId,
            requestId,
            eventType: "leave.request.additional_information_provided",
            payload: { request_id: requestId, attachment_count: documents.length },
            idempotencyKey: `${idempotencyKey}:outbox`,
            now,
            idFactory,
          });
          const result = Object.freeze({ leave_request: clone(updated) });
          appendReceipt({ tx, tenantId, idempotencyKey, commandType: "provide_additional_information", requestId, inputHash, result, now, idFactory });
          return result;
        },
      });
    },

    async proposeReschedule(context, input = {}) {
      return executeIdempotent({
        context,
        commandType: "propose_reschedule",
        input,
        mutate: async ({ tx, tenantId, actorId, idempotencyKey, inputHash, now }) => {
          const requestId = requiredString(input, "request_id");
          const request = requireModernRequest(tx, tenantId, requestId);
          if (request.state !== "submitted") throw guardedError("Leave request is not submitted", "HRX_LEAVE_STATE_CONFLICT");
          if ((input.applicant_actor_ids ?? []).includes(actorId) || actorId === request.employee_id) {
            throw guardedError("Applicant cannot propose their own manager reschedule", "HRX_LEAVE_SELF_APPROVAL_FORBIDDEN", 403);
          }
          requireAssignedApproval({ tx, tenantId, requestId, actorId, now });
          const proposedStartDate = requiredString(input, "proposed_start_date");
          const proposedEndDate = requiredString(input, "proposed_end_date");
          createSqlWorkScheduleResolver({ store: tx, holidayResolver }).resolve({
            tenant_id: tenantId,
            employee_id: request.employee_id,
            organization_ids: input.organization_ids,
            start_date: proposedStartDate,
            end_date: proposedEndDate,
            requested_minutes: request.requested_minutes,
          });
          const pendingProposal = tx.query("select", {
            table: "hrx_leave_reschedule_proposals",
            where: { tenant_id: tenantId, request_id: requestId, state: "proposed" },
          })[0];
          if (pendingProposal) throw guardedError("A reschedule proposal is already pending", "HRX_LEAVE_RESCHEDULE_ALREADY_PENDING");
          const proposal = tx.query("insert", {
            table: "hrx_leave_reschedule_proposals",
            row: {
              tenant_id: tenantId,
              proposal_id: input.proposal_id ?? idFrom(idFactory, "leave_reschedule", idempotencyKey),
              request_id: requestId,
              proposed_start_date: proposedStartDate,
              proposed_end_date: proposedEndDate,
              legal_reason: requiredString(input, "legal_reason"),
              state: "proposed",
              expires_at: requiredString(input, "expires_at"),
              responded_at: null,
              created_at: now,
            },
          });
          const pendingRequest = tx.query("updateOne", {
            table: "hrx_leave_requests",
            where: { tenant_id: tenantId, request_id: requestId },
            expected_version: request.state_version,
            patch: { state: "reschedule_pending", state_version: request.state_version + 1, updated_at: now },
          });
          createSqlHrxAuditEventStore({ store: tx }).append({
            event_id: idFrom(idFactory, "leave_audit_reschedule_proposed", idempotencyKey),
            tenant_id: tenantId,
            actor_id: actorId,
            action: "hrx.leave.reschedule.propose",
            object_type: "LeaveRequest",
            object_id: requestId,
            decision: "approval_required",
            reason: "manager_proposed_alternative_leave_dates",
            occurred_at: now,
            metadata: { proposal_id: proposal.proposal_id },
          });
          appendOutbox({
            tx,
            tenantId,
            requestId,
            eventType: "leave.request.reschedule_proposed",
            payload: { request_id: requestId, proposal_id: proposal.proposal_id },
            idempotencyKey: `${idempotencyKey}:outbox`,
            now,
            idFactory,
          });
          const result = Object.freeze({ leave_request: clone(pendingRequest), proposal: clone(proposal) });
          appendReceipt({ tx, tenantId, idempotencyKey, commandType: "propose_reschedule", requestId, inputHash, result, now, idFactory });
          return result;
        },
      });
    },

    async respondToReschedule(context, input = {}) {
      return executeIdempotent({
        context,
        commandType: "respond_reschedule",
        input,
        mutate: async ({ tx, tenantId, actorId, idempotencyKey, inputHash, now }) => {
          const requestId = requiredString(input, "request_id");
          const request = requireModernRequest(tx, tenantId, requestId);
          if (request.state !== "reschedule_pending") throw guardedError("Leave request is not awaiting a reschedule response", "HRX_LEAVE_STATE_CONFLICT");
          requireApplicant(request, actorId, input.applicant_actor_ids ?? []);
          const proposalId = requiredString(input, "proposal_id");
          const proposal = tx.query("selectOne", {
            table: "hrx_leave_reschedule_proposals",
            where: { tenant_id: tenantId, proposal_id: proposalId, request_id: requestId },
          });
          if (!proposal) throw guardedError("Reschedule proposal not found", "HRX_LEAVE_RESCHEDULE_NOT_FOUND", 404);
          if (proposal.state !== "proposed") throw guardedError("Reschedule proposal is already closed", "HRX_LEAVE_RESCHEDULE_STATE_CONFLICT");
          if (proposal.expires_at < now) throw guardedError("Reschedule proposal expired", "HRX_LEAVE_RESCHEDULE_EXPIRED");
          const decision = requiredString(input, "decision");
          if (!["accept", "decline"].includes(decision)) throw new TypeError("decision must be accept or decline");
          let updatedRequest = request;
          if (decision === "accept") {
            const overlap = tx
              .query("select", { table: "hrx_leave_requests", where: { tenant_id: tenantId, employee_id: request.employee_id } })
              .find(
                (row) =>
                  row.request_id !== requestId &&
                  !["rejected", "cancelled", "cancelled_after_approval", "review_required"].includes(row.state) &&
                  isRequestOverlap(row, { start_date: proposal.proposed_start_date, end_date: proposal.proposed_end_date }),
              );
            if (overlap) throw guardedError("Proposed leave dates overlap an existing request", "HRX_LEAVE_REQUEST_OVERLAP");
            const schedule = createSqlWorkScheduleResolver({ store: tx, holidayResolver }).resolve({
              tenant_id: tenantId,
              employee_id: request.employee_id,
              organization_ids: input.organization_ids,
              start_date: proposal.proposed_start_date,
              end_date: proposal.proposed_end_date,
              requested_minutes: request.requested_minutes,
            });
            await replaceReservations({ tx, request, onDate: proposal.proposed_start_date, commandKey: idempotencyKey, now });
            replaceScheduleSegments({ tx, request, schedule, now });
            updatedRequest = tx.query("updateOne", {
              table: "hrx_leave_requests",
              where: { tenant_id: tenantId, request_id: requestId },
              expected_version: request.state_version,
              patch: {
                start_date: proposal.proposed_start_date,
                end_date: proposal.proposed_end_date,
                timezone: schedule.timezone,
                schedule_snapshot_hash: schedule.schedule_snapshot_hash,
                state: "submitted",
                state_version: request.state_version + 1,
                updated_at: now,
              },
            });
          } else {
            updatedRequest = tx.query("updateOne", {
              table: "hrx_leave_requests",
              where: { tenant_id: tenantId, request_id: requestId },
              expected_version: request.state_version,
              patch: { state: "submitted", state_version: request.state_version + 1, updated_at: now },
            });
          }
          const updatedProposal = tx.query("updateOne", {
            table: "hrx_leave_reschedule_proposals",
            where: { tenant_id: tenantId, proposal_id: proposalId },
            patch: { state: decision === "accept" ? "accepted" : "declined", responded_at: now },
          });
          createSqlHrxAuditEventStore({ store: tx }).append({
            event_id: idFrom(idFactory, "leave_audit_reschedule_response", idempotencyKey),
            tenant_id: tenantId,
            actor_id: actorId,
            action: "hrx.leave.reschedule.respond",
            object_type: "LeaveRequest",
            object_id: requestId,
            decision: decision === "accept" ? "allow" : "deny",
            reason: "applicant_responded_to_reschedule_proposal",
            occurred_at: now,
            metadata: { proposal_id: proposalId },
          });
          appendOutbox({
            tx,
            tenantId,
            requestId,
            eventType: `leave.request.reschedule_${decision === "accept" ? "accepted" : "declined"}`,
            payload: { request_id: requestId, proposal_id: proposalId },
            idempotencyKey: `${idempotencyKey}:outbox`,
            now,
            idFactory,
          });
          const result = Object.freeze({ leave_request: clone(updatedRequest), proposal: clone(updatedProposal) });
          appendReceipt({ tx, tenantId, idempotencyKey, commandType: "respond_reschedule", requestId, inputHash, result, now, idFactory });
          return result;
        },
      });
    },

    async escalateApproval(context, input = {}) {
      return executeIdempotent({
        context,
        commandType: "escalate_approval",
        input,
        mutate: async ({ tx, tenantId, actorId, idempotencyKey, inputHash, now }) => {
          const requestId = requiredString(input, "request_id");
          const request = requireModernRequest(tx, tenantId, requestId);
          if (!["submitted", "reschedule_pending"].includes(request.state)) {
            throw guardedError("Leave request is not pending approval", "HRX_LEAVE_STATE_CONFLICT");
          }
          const substituteActorId = requiredString(input, "substitute_actor_id");
          if (substituteActorId === request.employee_id || (input.applicant_actor_ids ?? []).includes(substituteActorId)) {
            throw guardedError("Applicant cannot be an escalation approver", "HRX_LEAVE_SELF_APPROVAL_FORBIDDEN", 403);
          }
          const dueAt = requiredString(input, "due_at");
          if (dueAt > now) throw guardedError("Approval is not overdue", "HRX_LEAVE_ESCALATION_NOT_DUE");
          const approval = tx.query("selectOne", {
            table: "hrx_approval_requests",
            where: { tenant_id: tenantId, object_type: "LeaveRequest", object_id: requestId },
          });
          const step = approval && tx.query("selectOne", {
            table: "hrx_approval_steps",
            where: { tenant_id: tenantId, approval_id: approval.approval_id, step_order: approval.current_step },
          });
          if (!approval || approval.state !== "pending" || !step || step.state !== "pending") {
            throw guardedError("Pending approval step is required", "HRX_LEAVE_APPROVAL_STEP_REQUIRED");
          }
          const existing = tx.query("select", {
            table: "hrx_approval_escalations",
            where: { tenant_id: tenantId, approval_step_id: step.approval_step_id, state: "active" },
          })[0];
          if (existing) throw guardedError("Approval step already has an active escalation", "HRX_LEAVE_ESCALATION_ALREADY_ACTIVE");
          const escalation = tx.query("insert", {
            table: "hrx_approval_escalations",
            row: {
              tenant_id: tenantId,
              escalation_id: input.escalation_id ?? idFrom(idFactory, "leave_escalation", idempotencyKey),
              approval_step_id: step.approval_step_id,
              substitute_actor_id: substituteActorId,
              due_at: dueAt,
              state: "active",
              resolved_at: null,
              created_at: now,
            },
          });
          createSqlHrxAuditEventStore({ store: tx }).append({
            event_id: idFrom(idFactory, "leave_audit_escalate", idempotencyKey),
            tenant_id: tenantId,
            actor_id: actorId,
            action: "hrx.leave.approval.escalate",
            object_type: "LeaveRequest",
            object_id: requestId,
            decision: "approval_required",
            reason: "leave_approval_overdue_escalation",
            occurred_at: now,
            metadata: { escalation_id: escalation.escalation_id, substitute_actor_id: substituteActorId },
          });
          appendOutbox({
            tx,
            tenantId,
            requestId,
            eventType: "leave.approval.escalated",
            payload: { request_id: requestId, escalation_id: escalation.escalation_id },
            idempotencyKey: `${idempotencyKey}:outbox`,
            now,
            idFactory,
          });
          const result = Object.freeze({ escalation: clone(escalation), approval_id: approval.approval_id });
          appendReceipt({ tx, tenantId, idempotencyKey, commandType: "escalate_approval", requestId, inputHash, result, now, idFactory });
          return result;
        },
      });
    },

    async approve(context, input = {}) {
      return executeIdempotent({
        context,
        commandType: "approve",
        input,
        mutate: async ({ tx, tenantId, actorId, idempotencyKey, inputHash, now }) => {
          const requestId = requiredString(input, "request_id");
          const request = requireModernRequest(tx, tenantId, requestId);
          if (request.state !== "submitted") throw guardedError("Leave request is not submitted", "HRX_LEAVE_STATE_CONFLICT");
          if (actorId === request.employee_id || (input.applicant_actor_ids ?? []).includes(actorId)) {
            throw guardedError("Leave request cannot be approved by its applicant", "HRX_LEAVE_SELF_APPROVAL_FORBIDDEN", 403);
          }
          const { approval, step } = requireAssignedApproval({ tx, tenantId, requestId, actorId, now });
          const reserved = activeReservationAllocations(tx, request);
          await releaseReservations({ tx, request, commandKey: idempotencyKey, now });
          await inject(failureInjector, "approve.after_release", { request_id: requestId });
          const ledger = createSqlLeaveBalanceLedger({ store: tx });
          for (const allocation of reserved) {
            const entitlement = tx.query("selectOne", {
              table: "hrx_leave_entitlements",
              where: { tenant_id: tenantId, entitlement_id: allocation.entitlement_id },
            });
            const usedAllocationId = idFrom(idFactory, "leave_allocation_used", `${requestId}:${allocation.entitlement_id}`);
            tx.query("insert", {
              table: "hrx_leave_request_allocations",
              row: {
                tenant_id: tenantId,
                allocation_id: usedAllocationId,
                request_id: requestId,
                entitlement_id: allocation.entitlement_id,
                allocation_phase: "used",
                allocation_round: allocation.allocation_round ?? 1,
                amount_minutes: allocation.amount_minutes,
                created_at: now,
              },
            });
            ledger.append({
              tenant_id: tenantId,
              entry_id: idFrom(idFactory, "leave_used", `${requestId}:${allocation.entitlement_id}`),
              employee_id: request.employee_id,
              policy_id: request.policy_id,
              policy_version_id: request.policy_version_id,
              group_id: entitlement.group_id,
              entitlement_id: allocation.entitlement_id,
              allocation_id: usedAllocationId,
              idempotency_key: `${idempotencyKey}:used:${allocation.entitlement_id}`,
              entry_type: "used",
              amount_minutes: allocation.amount_minutes,
              occurred_on: now.slice(0, 10),
              source_ref: request.source_ref,
            });
          }
          await inject(failureInjector, "approve.after_use", { request_id: requestId });
          tx.query("updateOne", {
            table: "hrx_approval_steps",
            where: { tenant_id: tenantId, approval_step_id: step.approval_step_id },
            patch: {
              state: "approved",
              decision_actor_id: actorId,
              decision_reason: input.decision_reason ?? null,
              decided_at: now,
              updated_at: now,
            },
          });
          tx.query("updateOne", {
            table: "hrx_approval_requests",
            where: { tenant_id: tenantId, approval_id: approval.approval_id },
            expected_version: approval.state_version,
            patch: { state: "approved", state_version: approval.state_version + 1, updated_at: now },
          });
          resolveEscalations(tx, tenantId, step.approval_step_id, "resolved", now);
          const approvedRequest = tx.query("updateOne", {
            table: "hrx_leave_requests",
            where: { tenant_id: tenantId, request_id: requestId },
            expected_version: request.state_version,
            patch: {
              state: "approved",
              state_version: request.state_version + 1,
              approver_id: actorId,
              decided_at: now,
              decision_reason: input.decision_reason ?? null,
              updated_at: now,
            },
          });
          await inject(failureInjector, "approve.after_state", { request_id: requestId });
          createSqlHrxAuditEventStore({ store: tx }).append({
            event_id: idFrom(idFactory, "leave_audit_approve", idempotencyKey),
            tenant_id: tenantId,
            actor_id: actorId,
            action: "hrx.leave.approve",
            object_type: "LeaveRequest",
            object_id: requestId,
            decision: "allow",
            reason: "leave_request_approved",
            occurred_at: now,
            metadata: { approval_id: approval.approval_id },
          });
          appendOutbox({
            tx,
            tenantId,
            requestId,
            eventType: "leave.request.approved",
            payload: { request_id: requestId, employee_id: request.employee_id },
            idempotencyKey: `${idempotencyKey}:outbox`,
            now,
            idFactory,
          });
          const result = Object.freeze({ leave_request: clone(approvedRequest), approval_id: approval.approval_id });
          appendReceipt({
            tx,
            tenantId,
            idempotencyKey,
            commandType: "approve",
            requestId,
            inputHash,
            result,
            now,
            idFactory,
          });
          await inject(failureInjector, "approve.after_receipt", { request_id: requestId });
          return result;
        },
      });
    },

    async closeSubmitted(context, input = {}) {
      const commandType = input.state === "rejected" ? "reject" : "cancel";
      if (!["rejected", "cancelled"].includes(input.state)) throw new TypeError("state must be rejected or cancelled");
      return executeIdempotent({
        context,
        commandType,
        input,
        mutate: async ({ tx, tenantId, actorId, idempotencyKey, inputHash, now }) => {
          const requestId = requiredString(input, "request_id");
          const request = requireModernRequest(tx, tenantId, requestId);
          const approvedCancellation = input.state === "cancelled" && request.state === "approved";
          const cancellable = input.state === "cancelled" && ["submitted", "reschedule_pending", "approved"].includes(request.state);
          if (!cancellable && request.state !== "submitted") throw guardedError("Leave request is not submitted", "HRX_LEAVE_STATE_CONFLICT");
          let approvalContext;
          if (input.state === "cancelled") {
            requireApplicant(request, actorId, input.applicant_actor_ids ?? []);
          } else {
            if (actorId === request.employee_id || (input.applicant_actor_ids ?? []).includes(actorId)) {
              throw guardedError("Leave request cannot be rejected by its applicant", "HRX_LEAVE_SELF_APPROVAL_FORBIDDEN", 403);
            }
            approvalContext = requireAssignedApproval({ tx, tenantId, requestId, actorId, now });
          }
          if (approvedCancellation) reverseApprovedUse({ tx, request, commandKey: idempotencyKey, now });
          else await releaseReservations({ tx, request, commandKey: idempotencyKey, now });
          const nextState = approvedCancellation ? "cancelled_after_approval" : input.state;
          const next = tx.query("updateOne", {
            table: "hrx_leave_requests",
            where: { tenant_id: tenantId, request_id: requestId },
            expected_version: request.state_version,
            patch: {
              state: nextState,
              state_version: request.state_version + 1,
              decided_at: now,
              decision_reason: input.decision_reason ?? commandType,
              updated_at: now,
            },
          });
          const approval = approvalContext?.approval ?? tx.query("selectOne", {
            table: "hrx_approval_requests",
            where: { tenant_id: tenantId, object_type: "LeaveRequest", object_id: requestId },
          });
          const step = approvalContext?.step ?? (approval && tx.query("selectOne", {
            table: "hrx_approval_steps",
            where: { tenant_id: tenantId, approval_id: approval.approval_id, step_order: approval.current_step },
          }));
          if (step && !approvedCancellation) {
            tx.query("updateOne", {
              table: "hrx_approval_steps",
              where: { tenant_id: tenantId, approval_step_id: step.approval_step_id },
              patch: {
                state: nextState,
                decision_actor_id: actorId,
                decision_reason: input.decision_reason ?? commandType,
                decided_at: now,
                updated_at: now,
              },
            });
          }
          if (approval && !approvedCancellation) {
            tx.query("updateOne", {
              table: "hrx_approval_requests",
              where: { tenant_id: tenantId, approval_id: approval.approval_id },
              expected_version: approval.state_version,
              patch: { state: nextState, state_version: approval.state_version + 1, updated_at: now },
            });
          }
          if (step && !approvedCancellation) resolveEscalations(tx, tenantId, step.approval_step_id, nextState, now);
          if (request.state === "reschedule_pending") {
            for (const proposal of tx.query("select", {
              table: "hrx_leave_reschedule_proposals",
              where: { tenant_id: tenantId, request_id: requestId, state: "proposed" },
            })) {
              tx.query("updateOne", {
                table: "hrx_leave_reschedule_proposals",
                where: { tenant_id: tenantId, proposal_id: proposal.proposal_id },
                patch: { state: "cancelled", responded_at: now },
              });
            }
          }
          createSqlHrxAuditEventStore({ store: tx }).append({
            event_id: idFrom(idFactory, `leave_audit_${commandType}`, idempotencyKey),
            tenant_id: tenantId,
            actor_id: actorId,
            action: approvedCancellation ? "hrx.leave.cancel_after_approval" : `hrx.leave.${commandType}`,
            object_type: "LeaveRequest",
            object_id: requestId,
            decision: "allow",
            reason: `leave_request_${nextState}`,
            occurred_at: now,
            metadata: {},
          });
          appendOutbox({
            tx,
            tenantId,
            requestId,
            eventType: `leave.request.${nextState}`,
            payload: { request_id: requestId },
            idempotencyKey: `${idempotencyKey}:outbox`,
            now,
            idFactory,
          });
          const result = Object.freeze({ leave_request: clone(next) });
          appendReceipt({ tx, tenantId, idempotencyKey, commandType, requestId, inputHash, result, now, idFactory });
          return result;
        },
      });
    },
  });
}
