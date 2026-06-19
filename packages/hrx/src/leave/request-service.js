import { randomUUID } from "node:crypto";

export const HRX_LEAVE_REQUEST_STATES = Object.freeze(["submitted", "approved", "rejected", "cancelled"]);

const LEAVE_REQUEST_TRANSITIONS = Object.freeze({
  submitted: Object.freeze(["approved", "rejected", "cancelled"]),
  approved: Object.freeze([]),
  rejected: Object.freeze([]),
  cancelled: Object.freeze([]),
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredAmount(input, field) {
  const value = input?.[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${field} must be a finite number greater than 0`);
  }
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireContext(context) {
  requiredString(context, "tenant_id");
  requiredString(context, "actor_id");
}

function requireSubmitted(request, action) {
  if (request.state !== "submitted") {
    throw new TypeError(`LeaveRequest must be submitted before ${action}`);
  }
}

async function appendAudit(audit, context, event) {
  if (!audit || typeof audit.append !== "function") return undefined;
  return audit.append({
    event_id: event.event_id ?? `hrx_leave_evt_${randomUUID()}`,
    tenant_id: context.tenant_id,
    actor_id: context.actor_id,
    action: event.action,
    object_type: "LeaveRequest",
    object_id: event.object_id,
    decision: event.decision ?? "allow",
    reason: event.reason,
    metadata: Object.freeze({ ...(event.metadata ?? {}) }),
  });
}

export function createLeaveRequest(input = {}) {
  const state = input.state ?? "submitted";
  if (!HRX_LEAVE_REQUEST_STATES.includes(state)) {
    throw new TypeError(`state must be one of ${HRX_LEAVE_REQUEST_STATES.join(", ")}`);
  }
  if (state === "approved" && !input.approver_id) throw new TypeError("approver_id is required for approved leave request");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    request_id: requiredString(input, "request_id"),
    employee_id: requiredString(input, "employee_id"),
    policy_id: requiredString(input, "policy_id"),
    leave_type: requiredString(input, "leave_type"),
    amount: requiredAmount(input, "amount"),
    start_date: requiredString(input, "start_date"),
    end_date: requiredString(input, "end_date"),
    state,
    submitted_at: input.submitted_at ?? new Date().toISOString(),
    approver_id: input.approver_id ?? null,
    decided_at: input.decided_at ?? null,
    decision_reason: input.decision_reason ?? null,
    source_ref: input.source_ref ?? `LeaveRequest:${requiredString(input, "request_id")}`,
  });
}

export function transitionLeaveRequest(request = {}, change = {}) {
  const current = createLeaveRequest(request);
  const nextState = change.state ?? current.state;
  if (nextState !== current.state && !(LEAVE_REQUEST_TRANSITIONS[current.state] ?? []).includes(nextState)) {
    throw new TypeError(`LeaveRequest cannot transition from ${current.state} to ${nextState}`);
  }
  if (nextState === "approved" && !change.approver_id && !current.approver_id) {
    throw new TypeError("approver_id is required for approved leave request");
  }
  return createLeaveRequest({
    ...current,
    ...change,
    decided_at: ["approved", "rejected", "cancelled"].includes(nextState)
      ? change.decided_at ?? new Date().toISOString()
      : current.decided_at,
  });
}

export function createInMemoryLeaveRequestStore(seed = []) {
  const requests = new Map();
  const key = (tenantId, requestId) => `${tenantId}:${requestId}`;

  function create(input) {
    const request = createLeaveRequest(input);
    const requestKey = key(request.tenant_id, request.request_id);
    if (requests.has(requestKey)) throw new Error(`Duplicate leave request: ${request.request_id}`);
    requests.set(requestKey, clone(request));
    return Object.freeze(clone(request));
  }

  function update(ref = {}, change = {}) {
    const existing = get(ref);
    if (!existing) throw new Error(`Leave request not found: ${ref.request_id}`);
    const request = transitionLeaveRequest(existing, change);
    requests.set(key(request.tenant_id, request.request_id), clone(request));
    return Object.freeze(clone(request));
  }

  function get(ref = {}) {
    const value = requests.get(key(ref.tenant_id, ref.request_id));
    return value ? Object.freeze(clone(value)) : undefined;
  }

  for (const request of seed) create(request);

  return Object.freeze({
    create,
    update,
    get,
    list(query = {}) {
      return Object.freeze(
        [...requests.values()]
          .filter((request) => !query.tenant_id || request.tenant_id === query.tenant_id)
          .filter((request) => !query.employee_id || request.employee_id === query.employee_id)
          .map((request) => Object.freeze(clone(request))),
      );
    },
  });
}

export function createLeaveRequestService({ store = createInMemoryLeaveRequestStore(), balanceLedger, audit } = {}) {
  return Object.freeze({
    async submit(context, input = {}) {
      requireContext(context);
      const request = store.create({ ...input, tenant_id: context.tenant_id, state: "submitted" });
      await appendAudit(audit, context, {
        action: "hrx.leave.submit",
        object_id: request.request_id,
        decision: "approval_required",
        reason: "leave_request_submitted",
        metadata: { employee_id: request.employee_id, policy_id: request.policy_id },
      });
      return request;
    },

    async approve(context, ref = {}) {
      requireContext(context);
      const existing = store.get({ tenant_id: context.tenant_id, request_id: ref.request_id });
      if (!existing) throw new Error(`Leave request not found: ${ref.request_id}`);
      requireSubmitted(existing, "approve");
      const request = store.update(
        { tenant_id: context.tenant_id, request_id: ref.request_id },
        {
          state: "approved",
          approver_id: ref.approver_id ?? context.actor_id,
          decision_reason: ref.decision_reason ?? null,
        },
      );
      balanceLedger?.append?.({
        tenant_id: request.tenant_id,
        entry_id: ref.ledger_entry_id ?? `leave_used_${request.request_id}`,
        employee_id: request.employee_id,
        policy_id: request.policy_id,
        entry_type: "used",
        amount: request.amount,
        occurred_on: request.decided_at.slice(0, 10),
        source_ref: request.source_ref,
      });
      await appendAudit(audit, context, {
        action: "hrx.leave.approve",
        object_id: request.request_id,
        reason: "leave_request_approved",
        metadata: { employee_id: request.employee_id, policy_id: request.policy_id },
      });
      return request;
    },

    async reject(context, ref = {}) {
      requireContext(context);
      const existing = store.get({ tenant_id: context.tenant_id, request_id: ref.request_id });
      if (!existing) throw new Error(`Leave request not found: ${ref.request_id}`);
      requireSubmitted(existing, "reject");
      const request = store.update(
        { tenant_id: context.tenant_id, request_id: ref.request_id },
        { state: "rejected", decision_reason: ref.decision_reason ?? "rejected" },
      );
      await appendAudit(audit, context, {
        action: "hrx.leave.reject",
        object_id: request.request_id,
        reason: "leave_request_rejected",
        metadata: { employee_id: request.employee_id, policy_id: request.policy_id },
      });
      return request;
    },

    async cancel(context, ref = {}) {
      requireContext(context);
      const existing = store.get({ tenant_id: context.tenant_id, request_id: ref.request_id });
      if (!existing) throw new Error(`Leave request not found: ${ref.request_id}`);
      requireSubmitted(existing, "cancel");
      const request = store.update(
        { tenant_id: context.tenant_id, request_id: ref.request_id },
        { state: "cancelled", decision_reason: ref.decision_reason ?? "cancelled" },
      );
      await appendAudit(audit, context, {
        action: "hrx.leave.cancel",
        object_id: request.request_id,
        reason: "leave_request_cancelled",
        metadata: { employee_id: request.employee_id, policy_id: request.policy_id },
      });
      return request;
    },
  });
}
