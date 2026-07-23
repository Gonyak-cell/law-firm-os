import { randomUUID } from "node:crypto";
import { createDurableJsonStateController } from "../../../packages/persistence/src/durable-file.js";

export const LAWOS_AUTH_PASSWORD_RESET_QUEUE_SCHEMA_VERSION = "law-firm-os.auth-password-reset-queue.v1";

function normalizedState(input = {}) {
  return {
    schema_version: LAWOS_AUTH_PASSWORD_RESET_QUEUE_SCHEMA_VERSION,
    jobs: Array.isArray(input.jobs) ? input.jobs : [],
  };
}

export function createAuthPasswordResetQueue({ filePath, now = () => Date.now() } = {}) {
  const controller = createDurableJsonStateController({
    filePath,
    defaultValue: normalizedState(),
    normalizeValue: normalizedState,
  });

  function commit(jobs) {
    controller.commit({ ...controller.value, jobs });
  }

  function currentJobs() {
    return filePath ? controller.reload().value.jobs : controller.value.jobs;
  }

  async function enqueue({ tenant_id, email, request_id } = {}) {
    const job = {
      tenant_id: String(tenant_id),
      job_id: `password-reset:${randomUUID()}`,
      email: String(email).trim().toLowerCase(),
      request_id: String(request_id),
      state: "pending",
      attempt_count: 0,
      available_at: new Date(now()).toISOString(),
      lease_owner: null,
      lease_expires_at: null,
      last_error_code: null,
      created_at: new Date(now()).toISOString(),
      updated_at: new Date(now()).toISOString(),
    };
    commit([...currentJobs(), job]);
    return Object.freeze({ ...job });
  }

  async function claim({ tenant_id, worker_id, limit = 10, lease_ms = 60_000 } = {}) {
    const timestamp = now();
    const jobs = currentJobs();
    const claimedIds = new Set(jobs
      .filter((job) => job.tenant_id === tenant_id)
      .filter((job) => (job.state === "pending" && Date.parse(job.available_at) <= timestamp)
        || (job.state === "processing" && Date.parse(job.lease_expires_at ?? 0) <= timestamp))
      .slice(0, limit)
      .map((job) => job.job_id));
    const claimed = [];
    const next = jobs.map((job) => {
      if (!claimedIds.has(job.job_id)) return job;
      const value = {
        ...job,
        state: "processing",
        attempt_count: Number(job.attempt_count) + 1,
        lease_owner: worker_id,
        lease_expires_at: new Date(timestamp + lease_ms).toISOString(),
        updated_at: new Date(timestamp).toISOString(),
      };
      claimed.push(value);
      return value;
    });
    commit(next);
    return Object.freeze(claimed.map((job) => Object.freeze({ ...job })));
  }

  async function finish({ tenant_id, job_id, worker_id, outcome, last_error_code = null, retry_delay_ms = 60_000 } = {}) {
    const timestamp = now();
    let result = null;
    const next = currentJobs().map((job) => {
      if (job.tenant_id !== tenant_id || job.job_id !== job_id || job.lease_owner !== worker_id || job.state !== "processing") return job;
      const retry = outcome === "retry" && Number(job.attempt_count) < 3;
      result = {
        ...job,
        state: retry ? "pending" : outcome === "retry" ? "failed" : outcome,
        available_at: retry ? new Date(timestamp + retry_delay_ms).toISOString() : job.available_at,
        lease_owner: null,
        lease_expires_at: null,
        last_error_code,
        updated_at: new Date(timestamp).toISOString(),
      };
      return result;
    });
    if (!result) throw new Error("password reset queue lease is not owned by this worker");
    commit(next);
    return Object.freeze({ ...result });
  }

  return Object.freeze({ enqueue, claim, finish });
}
