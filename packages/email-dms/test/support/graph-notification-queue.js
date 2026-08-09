import { requiredSyncString, syncDigest } from "../../src/conversation-sync-model.js";
import {
  graphNotificationIdentity,
  graphNotificationPayloadHash,
  normalizeGraphNotification,
} from "../../src/graph-notification-model.js";

// Deterministic test double only. Operational queue authority is PostgreSQL.

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${field} must be positive`);
  return value;
}

function appendAudit(state, job, event, occurredAt, details = {}) {
  const transition = (state.audit_events.filter(({ object_id: id }) => id === job.job_id).length + 1);
  state.audit_events.push({
    event_id: syncDigest("graph_job_audit", { tenant_id: job.tenant_id, job_id: job.job_id, event, transition }),
    tenant_id: job.tenant_id,
    event_type: `graph_job.${event}`,
    object_id: job.job_id,
    actor_id: "graph-notification-runtime",
    details,
    occurred_at: occurredAt,
  });
}

function applyLifecycle(state, input) {
  if (input.kind !== "lifecycle") return;
  const subscription = state.subscriptions.find((entry) => entry.tenant_id === input.tenant_id
    && entry.subscription_id === input.subscription_id
    && entry.provider_subscription_id === input.provider_subscription_id
    && entry.resource === input.resource);
  if (!subscription) throw new Error("Graph lifecycle subscription ownership is invalid");
  if (input.lifecycle_event === "missed") {
    const cursor = state.cursors.find((entry) => entry.tenant_id === input.tenant_id
      && entry.m365_connection_id === subscription.m365_connection_id && entry.resource === subscription.resource);
    if (cursor) cursor.reconciliation_required_at = input.received_at;
    else state.cursors.push({ tenant_id: input.tenant_id, m365_connection_id: subscription.m365_connection_id, resource: subscription.resource, cursor_ref: null, reconciliation_required_at: input.received_at, last_reconciled_at: null, version: 1 });
  } else {
    subscription.status = input.lifecycle_event === "reauthorizationRequired" ? "reauthorization_required" : "expired";
    subscription.next_attempt_at = input.received_at;
    subscription.updated_at = input.received_at;
  }
}

export function createGraphNotificationQueue({ repository, clock = () => new Date(), lease_ms = 30_000, max_attempts = 5, base_delay_ms = 1_000 } = {}) {
  if (!repository) throw new TypeError("conversation sync repository is required");
  positiveInteger(lease_ms, "lease_ms");
  positiveInteger(max_attempts, "max_attempts");
  positiveInteger(base_delay_ms, "base_delay_ms");

  function now() {
    const value = clock();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError("clock must return a valid Date");
    return value;
  }

  function enqueue(raw = {}) {
    const input = normalizeGraphNotification(raw);
    const identity = graphNotificationIdentity(input);
    const hash = graphNotificationPayloadHash(input);
    const receiptId = syncDigest("graph_receipt", identity);
    const jobId = syncDigest("graph_job", identity);
    return repository.transaction((state) => {
      const existingReceipt = state.receipts.find(({ receipt_id: id }) => id === receiptId);
      if (existingReceipt) {
        if (existingReceipt.payload_sha256 !== hash || existingReceipt.provider_subscription_id !== input.provider_subscription_id) throw new Error("Graph notification receipt conflicts with an existing identity");
        return { outcome: "duplicate", receipt: existingReceipt, job: state.jobs.find(({ job_id: id }) => id === jobId) };
      }
      applyLifecycle(state, input);
      const common = { tenant_id: input.tenant_id, subscription_id: input.subscription_id, resource: input.resource, message_id: input.message_id, lifecycle_event: input.lifecycle_event, notification_kind: input.kind, subscription_expiration_at: input.subscription_expiration_at };
      const receipt = { ...common, receipt_id: receiptId, provider_subscription_id: input.provider_subscription_id, source: input.source, change_type: input.change_type, payload_sha256: hash, received_at: input.received_at };
      const jobKind = input.kind === "message" ? "message_notification" : input.lifecycle_event === "missed" ? "delta_reconciliation" : "subscription_reconcile";
      const job = { ...common, job_id: jobId, job_kind: jobKind, dedupe_key: syncDigest("graph_job_dedupe", identity), status: "pending", available_at: input.received_at, lease_owner: null, lease_expires_at: null, attempt_count: 0, last_error_code: null, result_code: null, created_at: input.received_at, updated_at: input.received_at };
      state.receipts.push(receipt);
      state.jobs.push(job);
      appendAudit(state, job, "enqueued", input.received_at, { source: input.source, job_kind: jobKind });
      return { outcome: "enqueued", receipt, job };
    });
  }

  function claim({ worker_id, limit = 10 } = {}) {
    const workerId = requiredSyncString({ worker_id }, "worker_id");
    positiveInteger(limit, "limit");
    const claimedAt = now();
    return repository.transaction((state) => state.jobs.filter((job) => ["pending", "retry"].includes(job.status)
      || (job.status === "leased" && Date.parse(job.lease_expires_at) <= claimedAt.getTime()))
      .filter((job) => Date.parse(job.available_at) <= claimedAt.getTime())
      .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at) || left.job_id.localeCompare(right.job_id))
      .slice(0, Math.min(limit, 100)).map((job) => {
        Object.assign(job, { status: "leased", lease_owner: workerId, lease_expires_at: new Date(claimedAt.getTime() + lease_ms).toISOString(), attempt_count: job.attempt_count + 1, updated_at: claimedAt.toISOString() });
        appendAudit(state, job, "leased", claimedAt.toISOString(), { attempt_count: job.attempt_count });
        return job;
      }));
  }

  function ownedJob(state, input) {
    const job = state.jobs.find(({ job_id: id }) => id === requiredSyncString(input, "job_id"));
    if (!job || job.status !== "leased" || job.lease_owner !== requiredSyncString(input, "worker_id")) throw new Error("Graph notification job lease was lost");
    return job;
  }

  function transition(input, event, apply) {
    return repository.transaction((state) => {
      const job = ownedJob(state, input);
      const at = now().toISOString();
      apply(job, at);
      appendAudit(state, job, event(job), at, { attempt_count: job.attempt_count, result_code: job.result_code, safe_error_code: job.last_error_code });
      return job;
    });
  }

  const complete = (input = {}) => transition(input, () => "completed", (job, at) => Object.assign(job, { status: "completed", result_code: requiredSyncString(input, "result_code"), lease_owner: null, lease_expires_at: null, last_error_code: null, updated_at: at }));
  const extendLease = (input = {}) => transition(input, () => "lease_extended", (job, at) => Object.assign(job, { lease_expires_at: new Date(Date.parse(at) + lease_ms).toISOString(), updated_at: at }));
  const fail = (input = {}) => transition(input, (job) => job.status === "dead_letter" ? "dead_lettered" : "retry_scheduled", (job, at) => {
    const dead = input.permanent === true || job.attempt_count >= max_attempts;
    Object.assign(job, { status: dead ? "dead_letter" : "retry", available_at: dead ? job.available_at : new Date(Date.parse(at) + Math.min(15 * 60_000, base_delay_ms * (2 ** (job.attempt_count - 1)))).toISOString(), lease_owner: null, lease_expires_at: null, last_error_code: requiredSyncString(input, "error_code", 100), updated_at: at });
  });

  return Object.freeze({ enqueue, claim, extendLease, complete, fail });
}
