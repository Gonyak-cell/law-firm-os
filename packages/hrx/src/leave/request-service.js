import { randomUUID } from "node:crypto";
import { createSqlHrxAuditEventStore } from "../../../audit/src/hrx-event-store-sql.js";
import { evaluateLeaveUsage } from "../rules/leave-policy.js";
import { createSqlLeaveBalanceLedger } from "./balance.js";

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

function guardedError(message, safeErrorCode, status = 400) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

async function resolveLeavePolicy(policyResolver, context, request) {
  if (typeof policyResolver !== "function") return null;
  return (await policyResolver({
    tenant_id: context.tenant_id,
    actor_id: context.actor_id,
    request,
    policy_id: request.policy_id,
    leave_type: request.leave_type,
    employee_id: request.employee_id,
  })) ?? null;
}

function approverIdsForGuard(existing, ref, context) {
  return new Set(
    [existing.employee_id, ...(Array.isArray(ref.applicant_actor_ids) ? ref.applicant_actor_ids : [])]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean),
  );
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

export function createSqlLeaveRequestStore({ store } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL leave request store requires store.query");

  function create(input) {
    const request = createLeaveRequest(input);
    return Object.freeze(
      store.query("insert", {
        table: "hrx_leave_requests",
        row: { ...request, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      }),
    );
  }

  function get(ref = {}) {
    const value = store.query("selectOne", {
      table: "hrx_leave_requests",
      where: { tenant_id: ref.tenant_id, request_id: ref.request_id },
    });
    return value ? Object.freeze(clone(value)) : undefined;
  }

  function update(ref = {}, change = {}) {
    const existing = get(ref);
    if (!existing) throw new Error(`Leave request not found: ${ref.request_id}`);
    const request = transitionLeaveRequest(existing, change);
    return Object.freeze(
      store.query("updateOne", {
        table: "hrx_leave_requests",
        where: { tenant_id: request.tenant_id, request_id: request.request_id },
        patch: { ...request, updated_at: new Date().toISOString() },
      }),
    );
  }

  return Object.freeze({
    create,
    update,
    get,
    list(query = {}) {
      const where = {};
      if (query.tenant_id) where.tenant_id = query.tenant_id;
      if (query.employee_id) where.employee_id = query.employee_id;
      return Object.freeze(
        store
          .query("select", { table: "hrx_leave_requests", where })
          .sort((left, right) => left.request_id.localeCompare(right.request_id))
          .map((request) => Object.freeze(clone(request))),
      );
    },
  });
}

export function createLeaveRequestService({
  store = createInMemoryLeaveRequestStore(),
  balanceLedger,
  audit,
  policyResolver,
  transactionStore,
  durableService,
  failureInjector = () => undefined,
} = {}) {
  function withPorts(callback) {
    if (!transactionStore) return callback({ requestStore: store, ledger: balanceLedger, auditStore: audit });
    return transactionStore.transaction((tx) => callback({
      requestStore: createSqlLeaveRequestStore({ store: tx }),
      ledger: createSqlLeaveBalanceLedger({ store: tx }),
      auditStore: createSqlHrxAuditEventStore({ store: tx }),
    }));
  }

  return Object.freeze({
    async submit(context, input = {}) {
      requireContext(context);
      if (durableService && Number.isInteger(input.requested_minutes)) {
        return (await durableService.submit(context, input)).leave_request;
      }
      return withPorts(async ({ requestStore, auditStore }) => {
        const request = requestStore.create({ ...input, tenant_id: context.tenant_id, state: "submitted" });
        await failureInjector("legacy.submit.after_request", { request_id: request.request_id });
        await appendAudit(auditStore, context, {
          action: "hrx.leave.submit",
          object_id: request.request_id,
          decision: "approval_required",
          reason: "leave_request_submitted",
          metadata: { employee_id: request.employee_id, policy_id: request.policy_id },
        });
        return request;
      });
    },

    async approve(context, ref = {}) {
      requireContext(context);
      const current = store.get({ tenant_id: context.tenant_id, request_id: ref.request_id });
      if (durableService && Number.isInteger(current?.requested_minutes)) {
        return (await durableService.approve(context, ref)).leave_request;
      }
      return withPorts(async ({ requestStore, ledger, auditStore }) => {
        const existing = requestStore.get({ tenant_id: context.tenant_id, request_id: ref.request_id });
        if (!existing) throw new Error(`Leave request not found: ${ref.request_id}`);
        requireSubmitted(existing, "approve");
        const approver_id = ref.approver_id ?? context.actor_id;
        if (approverIdsForGuard(existing, ref, context).has(approver_id)) {
          throw guardedError("Leave request cannot be approved by its applicant", "HRX_LEAVE_SELF_APPROVAL_FORBIDDEN", 403);
        }
        if (ledger && typeof ledger.balance === "function") {
          const balance = ledger.balance({
            tenant_id: context.tenant_id,
            employee_id: existing.employee_id,
            policy_id: existing.policy_id,
          });
          const policy = await resolveLeavePolicy(policyResolver, context, existing);
          const usage = policy
            ? evaluateLeaveUsage(policy, balance.available_balance, existing.amount)
            : Object.freeze({
                allowed: balance.available_balance >= existing.amount,
                available_after: balance.available_balance - existing.amount,
                reason: balance.available_balance >= existing.amount ? "within_balance" : "negative_balance_not_allowed",
              });
          if (!usage.allowed) {
            throw guardedError("Leave request amount exceeds available leave balance", "HRX_LEAVE_BALANCE_INSUFFICIENT", 409);
          }
        }
        const request = requestStore.update(
          { tenant_id: context.tenant_id, request_id: ref.request_id },
          {
            state: "approved",
            approver_id,
            decision_reason: ref.decision_reason ?? null,
          },
        );
        await failureInjector("legacy.approve.after_state", { request_id: request.request_id });
        ledger?.append?.({
          tenant_id: request.tenant_id,
          entry_id: ref.ledger_entry_id ?? `leave_used_${request.request_id}`,
          employee_id: request.employee_id,
          policy_id: request.policy_id,
          entry_type: "used",
          amount: request.amount,
          occurred_on: request.decided_at.slice(0, 10),
          source_ref: request.source_ref,
        });
        await failureInjector("legacy.approve.after_ledger", { request_id: request.request_id });
        await appendAudit(auditStore, context, {
          action: "hrx.leave.approve",
          object_id: request.request_id,
          reason: "leave_request_approved",
          metadata: { employee_id: request.employee_id, policy_id: request.policy_id },
        });
        return request;
      });
    },

    async reject(context, ref = {}) {
      requireContext(context);
      const current = store.get({ tenant_id: context.tenant_id, request_id: ref.request_id });
      if (durableService && Number.isInteger(current?.requested_minutes)) {
        return (await durableService.closeSubmitted(context, { ...ref, state: "rejected" })).leave_request;
      }
      return withPorts(async ({ requestStore, auditStore }) => {
        const existing = requestStore.get({ tenant_id: context.tenant_id, request_id: ref.request_id });
        if (!existing) throw new Error(`Leave request not found: ${ref.request_id}`);
        requireSubmitted(existing, "reject");
        const request = requestStore.update(
          { tenant_id: context.tenant_id, request_id: ref.request_id },
          { state: "rejected", decision_reason: ref.decision_reason ?? "rejected" },
        );
        await failureInjector("legacy.reject.after_state", { request_id: request.request_id });
        await appendAudit(auditStore, context, {
          action: "hrx.leave.reject",
          object_id: request.request_id,
          reason: "leave_request_rejected",
          metadata: { employee_id: request.employee_id, policy_id: request.policy_id },
        });
        return request;
      });
    },

    async cancel(context, ref = {}) {
      requireContext(context);
      const current = store.get({ tenant_id: context.tenant_id, request_id: ref.request_id });
      if (durableService && Number.isInteger(current?.requested_minutes)) {
        return (await durableService.closeSubmitted(context, { ...ref, state: "cancelled" })).leave_request;
      }
      return withPorts(async ({ requestStore, auditStore }) => {
        const existing = requestStore.get({ tenant_id: context.tenant_id, request_id: ref.request_id });
        if (!existing) throw new Error(`Leave request not found: ${ref.request_id}`);
        requireSubmitted(existing, "cancel");
        const request = requestStore.update(
          { tenant_id: context.tenant_id, request_id: ref.request_id },
          { state: "cancelled", decision_reason: ref.decision_reason ?? "cancelled" },
        );
        await failureInjector("legacy.cancel.after_state", { request_id: request.request_id });
        await appendAudit(auditStore, context, {
          action: "hrx.leave.cancel",
          object_id: request.request_id,
          reason: "leave_request_cancelled",
          metadata: { employee_id: request.employee_id, policy_id: request.policy_id },
        });
        return request;
      });
    },
  });
}
