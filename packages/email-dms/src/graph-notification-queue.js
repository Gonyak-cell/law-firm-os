import { createHash } from "node:crypto";
import { GRAPH_MESSAGE_RESOURCES, requiredSyncString, syncDigest } from "./conversation-sync-model.js";

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${field} must be positive`);
  return value;
}

function notificationPayloadHash(input) {
  return createHash("sha256").update(JSON.stringify({
    tenant_id: input.tenant_id,
    subscription_id: input.subscription_id,
    provider_subscription_id: input.provider_subscription_id,
    resource: input.resource,
    message_id: input.message_id,
    change_type: input.change_type,
  })).digest("hex");
}

export function createGraphNotificationQueue({
  repository,
  clock = () => new Date(),
  lease_ms = 30_000,
  max_attempts = 5,
  base_delay_ms = 1_000,
} = {}) {
  if (!repository) throw new TypeError("conversation sync repository is required");
  positiveInteger(lease_ms, "lease_ms");
  positiveInteger(max_attempts, "max_attempts");
  positiveInteger(base_delay_ms, "base_delay_ms");

  function now() {
    const value = clock();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError("clock must return a valid Date");
    return value;
  }

  function enqueue(input = {}) {
    for (const field of ["tenant_id", "subscription_id", "provider_subscription_id", "resource", "message_id", "change_type", "received_at"]) requiredSyncString(input, field);
    const source = requiredSyncString(input, "source");
    if (!["webhook", "delta_reconciliation"].includes(source)) throw new TypeError("source must be webhook or delta_reconciliation");
    if (input.change_type !== "created") throw new TypeError("change_type must be created");
    if (!GRAPH_MESSAGE_RESOURCES.includes(input.resource)) throw new TypeError("resource must be Inbox or Sent Items messages");
    const payloadHash = notificationPayloadHash(input);
    const identity = {
      tenant_id: input.tenant_id,
      subscription_id: input.subscription_id,
      resource: input.resource,
      message_id: input.message_id,
    };
    const receiptId = syncDigest("graph_receipt", identity);
    const jobId = syncDigest("graph_job", identity);
    return repository.transaction((state) => {
      const existingReceipt = state.receipts.find(({ receipt_id: id }) => id === receiptId);
      if (existingReceipt) {
        if (existingReceipt.payload_sha256 !== payloadHash || existingReceipt.provider_subscription_id !== input.provider_subscription_id) {
          throw new Error("Graph notification receipt conflicts with an existing identity");
        }
        return { outcome: "duplicate", receipt: existingReceipt, job: state.jobs.find(({ job_id: id }) => id === jobId) };
      }
      const receipt = Object.freeze({
        ...identity,
        receipt_id: receiptId,
        provider_subscription_id: input.provider_subscription_id,
        source,
        change_type: input.change_type,
        payload_sha256: payloadHash,
        received_at: input.received_at,
      });
      const job = Object.freeze({
        ...identity,
        job_id: jobId,
        status: "pending",
        available_at: input.received_at,
        lease_owner: null,
        lease_expires_at: null,
        attempt_count: 0,
        last_error_code: null,
        result_code: null,
        created_at: input.received_at,
        updated_at: input.received_at,
      });
      state.receipts.push(receipt);
      state.jobs.push(job);
      state.audit_events.push(Object.freeze({
        event_id: syncDigest("graph_notification_audit", identity),
        tenant_id: input.tenant_id,
        event_type: `graph_notification.${source}_enqueued`,
        object_id: jobId,
        actor_id: "graph-notification-intake",
        occurred_at: input.received_at,
      }));
      return { outcome: "enqueued", receipt, job };
    });
  }

  function claim({ worker_id, limit = 10 } = {}) {
    const workerId = requiredSyncString({ worker_id }, "worker_id");
    positiveInteger(limit, "limit");
    const claimedAt = now();
    return repository.transaction((state) => state.jobs
      .filter((job) => (
        ["pending", "retry"].includes(job.status)
        || (job.status === "leased" && Date.parse(job.lease_expires_at) <= claimedAt.getTime())
      ))
      .filter((job) => Date.parse(job.available_at) <= claimedAt.getTime())
      .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at) || left.job_id.localeCompare(right.job_id))
      .slice(0, Math.min(limit, 100))
      .map((job) => {
        Object.assign(job, {
          status: "leased",
          lease_owner: workerId,
          lease_expires_at: new Date(claimedAt.getTime() + lease_ms).toISOString(),
          attempt_count: job.attempt_count + 1,
          updated_at: claimedAt.toISOString(),
        });
        return job;
      }));
  }

  function ownedJob(state, { worker_id, job_id }) {
    const job = state.jobs.find(({ job_id: id }) => id === requiredSyncString({ job_id }, "job_id"));
    if (!job || job.status !== "leased" || job.lease_owner !== requiredSyncString({ worker_id }, "worker_id")) {
      throw new Error("Graph notification job lease was lost");
    }
    return job;
  }

  function complete(input = {}) {
    return repository.transaction((state) => {
      const job = ownedJob(state, input);
      Object.assign(job, { status: "completed", result_code: requiredSyncString(input, "result_code"), lease_owner: null, lease_expires_at: null, last_error_code: null, updated_at: now().toISOString() });
      return job;
    });
  }

  function extendLease(input = {}) {
    return repository.transaction((state) => {
      const job = ownedJob(state, input);
      const extendedAt = now();
      Object.assign(job, {
        lease_expires_at: new Date(extendedAt.getTime() + lease_ms).toISOString(),
        updated_at: extendedAt.toISOString(),
      });
      return job;
    });
  }

  function fail(input = {}) {
    return repository.transaction((state) => {
      const job = ownedJob(state, input);
      const failedAt = now();
      const dead = input.permanent === true || job.attempt_count >= max_attempts;
      Object.assign(job, {
        status: dead ? "dead_letter" : "retry",
        available_at: dead ? job.available_at : new Date(failedAt.getTime() + Math.min(15 * 60_000, base_delay_ms * (2 ** (job.attempt_count - 1)))).toISOString(),
        lease_owner: null,
        lease_expires_at: null,
        last_error_code: requiredSyncString(input, "error_code", 100),
        updated_at: failedAt.toISOString(),
      });
      return job;
    });
  }

  return Object.freeze({ enqueue, claim, extendLease, complete, fail });
}
