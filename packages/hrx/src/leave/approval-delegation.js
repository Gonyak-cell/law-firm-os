import { randomUUID } from "node:crypto";

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

function overlaps(left, right) {
  return left.valid_from <= right.valid_to && right.valid_from <= left.valid_to;
}

function active(row) {
  return !row.revoked_at && !row.expired_at;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function withState(row, now) {
  return Object.freeze({
    ...clone(row),
    state: row.revoked_at ? "revoked" : row.expired_at || row.valid_to < now ? "expired" : row.valid_from > now ? "scheduled" : "active",
  });
}

export function createLeaveApprovalDelegationService({
  store,
  clock = () => new Date().toISOString(),
  idFactory = () => `leave_delegation_${randomUUID()}`,
} = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("leave approval delegation service requires store.query");

  function listRows(tenantId) {
    return store.query("select", { table: "hrx_approval_delegations", where: { tenant_id: tenantId } });
  }

  return Object.freeze({
    list(context = {}, { include_all: includeAll = false } = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const actorId = requiredString(context, "actor_id");
      const now = clock();
      return Object.freeze(
        listRows(tenantId)
          .filter((row) => includeAll || row.delegator_actor_id === actorId || row.delegate_actor_id === actorId)
          .sort((left, right) => right.created_at.localeCompare(left.created_at))
          .map((row) => withState(row, now)),
      );
    },

    create(context = {}, input = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const delegatorActorId = requiredString(context, "actor_id");
      const delegateActorId = requiredString(input, "delegate_actor_id");
      const validFrom = requiredString(input, "valid_from");
      const validTo = requiredString(input, "valid_to");
      if (delegatorActorId === delegateActorId) {
        throw guardedError("An approver cannot delegate to themselves", "HRX_LEAVE_DELEGATION_SELF_FORBIDDEN");
      }
      if (validTo <= validFrom) throw new TypeError("valid_to must be after valid_from");
      const candidate = {
        delegator_actor_id: delegatorActorId,
        delegate_actor_id: delegateActorId,
        object_type: "LeaveRequest",
        organization_scope_id: input.organization_scope_id ?? null,
        valid_from: validFrom,
        valid_to: validTo,
      };
      const rows = listRows(tenantId).filter(active);
      if (rows.some((row) => row.delegator_actor_id === delegatorActorId && overlaps(row, candidate))) {
        throw guardedError("Delegation periods for an approver cannot overlap", "HRX_LEAVE_DELEGATION_PERIOD_OVERLAP");
      }
      if (rows.some((row) => row.delegator_actor_id === delegateActorId && row.delegate_actor_id === delegatorActorId && overlaps(row, candidate))) {
        throw guardedError("Circular leave approval delegation is forbidden", "HRX_LEAVE_DELEGATION_CYCLE_FORBIDDEN");
      }
      const inbound = rows.find((row) => row.delegate_actor_id === delegatorActorId && overlaps(row, candidate));
      if (inbound) {
        throw guardedError("Delegated approval authority cannot be re-delegated", "HRX_LEAVE_DELEGATION_SCOPE_EXPANSION_FORBIDDEN", 403);
      }
      const now = clock();
      const row = store.query("insert", {
        table: "hrx_approval_delegations",
        row: {
          tenant_id: tenantId,
          delegation_id: input.delegation_id ?? idFactory(),
          ...candidate,
          revoked_at: null,
          expired_at: null,
          created_at: now,
        },
      });
      return withState(row, now);
    },

    revoke(context = {}, delegationId, { can_admin: canAdmin = false } = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const actorId = requiredString(context, "actor_id");
      const id = requiredString({ delegation_id: delegationId }, "delegation_id");
      const row = store.query("selectOne", { table: "hrx_approval_delegations", where: { tenant_id: tenantId, delegation_id: id } });
      if (!row) throw guardedError("Leave approval delegation not found", "HRX_LEAVE_DELEGATION_NOT_FOUND", 404);
      if (!canAdmin && row.delegator_actor_id !== actorId) {
        throw guardedError("Only the delegator can revoke this assignment", "HRX_LEAVE_DELEGATION_SCOPE_DENIED", 403);
      }
      if (!active(row)) throw guardedError("Leave approval delegation is already closed", "HRX_LEAVE_DELEGATION_STATE_CONFLICT");
      return withState(store.query("updateOne", {
        table: "hrx_approval_delegations",
        where: { tenant_id: tenantId, delegation_id: id },
        patch: { revoked_at: clock() },
      }), clock());
    },

    expire(context = {}, delegationId, { can_admin: canAdmin = false } = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const actorId = requiredString(context, "actor_id");
      const id = requiredString({ delegation_id: delegationId }, "delegation_id");
      const row = store.query("selectOne", { table: "hrx_approval_delegations", where: { tenant_id: tenantId, delegation_id: id } });
      if (!row) throw guardedError("Leave approval delegation not found", "HRX_LEAVE_DELEGATION_NOT_FOUND", 404);
      if (!canAdmin && row.delegator_actor_id !== actorId) {
        throw guardedError("Only the delegator can expire this assignment", "HRX_LEAVE_DELEGATION_SCOPE_DENIED", 403);
      }
      const now = clock();
      if (row.valid_to >= now) throw guardedError("Delegation validity has not ended", "HRX_LEAVE_DELEGATION_NOT_EXPIRED");
      if (!active(row)) throw guardedError("Leave approval delegation is already closed", "HRX_LEAVE_DELEGATION_STATE_CONFLICT");
      return withState(store.query("updateOne", {
        table: "hrx_approval_delegations",
        where: { tenant_id: tenantId, delegation_id: id },
        patch: { expired_at: now },
      }), now);
    },
  });
}
