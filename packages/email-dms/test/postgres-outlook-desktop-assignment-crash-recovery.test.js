import assert from "node:assert/strict";
import test from "node:test";

import {
  OUTLOOK_DESKTOP_ASSIGNMENT_REMOTE_COMMIT_STATES,
  OUTLOOK_DESKTOP_ASSIGNMENT_STATUSES,
} from "../src/outlook-desktop-assignment-model.js";
import {
  createPostgresOutlookDesktopAssignmentOutbox,
} from "../src/postgres-outlook-desktop-assignment-outbox.js";

const TENANT = "tenant-outlook-assignment-a";
const RECEIPT = "a".repeat(64);

function portFixture() {
  const calls = [];
  const responses = new Map([
    ["claim_outlook_desktop_assignment_jobs", [{ outbox_id: "outbox-1" }]],
    ["begin_outlook_desktop_assignment_dispatch", {
      outcome: "dispatch_ready",
      dispatch_mode: "readback_only",
      provider_call_allowed: false,
      payload: { operation_id: "outbox-1" },
    }],
    ["complete_outlook_desktop_assignment_job", {
      outcome: "completed",
      job: { outbox_id: "outbox-1", remote_commit_state: "confirmed" },
    }],
    ["fail_outlook_desktop_assignment_job", {
      outcome: "ambiguous",
      job: { outbox_id: "outbox-1", remote_commit_state: "unknown" },
    }],
    ["extend_outlook_desktop_assignment_lease", {
      outcome: "lease_extended",
      job: { outbox_id: "outbox-1" },
    }],
    ["recover_outlook_desktop_assignment_removals", [{ outbox_id: "outbox-2" }]],
  ]);
  const client = {
    async query(statement, values) {
      const sql = String(statement);
      if (sql.includes("lawos_security.current_tenant_id()")) {
        return { rows: [{ tenant_id: TENANT }] };
      }
      const name = [...responses.keys()].find((candidate) => sql.includes(candidate));
      if (name) {
        calls.push({ name, values });
        return { rows: [{ value: responses.get(name) }] };
      }
      return { rows: [] };
    },
    release() {},
  };
  const pool = {
    [Symbol.for("lawos.postgres.tenant-context-secret")]: Buffer.alloc(32, 7),
    async connect() { return client; },
  };
  return {
    calls,
    outbox: createPostgresOutlookDesktopAssignmentOutbox({
      pool,
      tenant_id: TENANT,
    }),
  };
}

const lease = Object.freeze({
  outbox_id: "outbox-1",
  worker_id: "worker-1",
  lease_token: "lease-1",
});
const readback = Object.freeze({
  schema_version: "lawos.outlook-assignment-authoritative-readback.v1",
  request_terminal: true,
  propagation_stabilized: true,
  receipt_sha256: RECEIPT,
});

test("assignment outbox state contract includes terminal reconciliation", () => {
  assert.deepEqual(OUTLOOK_DESKTOP_ASSIGNMENT_REMOTE_COMMIT_STATES, [
    "not_sent", "unknown", "confirmed", "reconciled",
  ]);
  assert.deepEqual(OUTLOOK_DESKTOP_ASSIGNMENT_STATUSES, [
    "pending", "leased", "retry", "ambiguous", "completed",
    "superseded", "dead_letter",
  ]);
});

test("worker client delegates every transition to the exact protected SQL port", async () => {
  const { calls, outbox } = portFixture();
  assert.deepEqual(await outbox.claim({ worker_id: lease.worker_id }), [
    { outbox_id: "outbox-1" },
  ]);
  assert.equal((await outbox.beginDispatch(lease)).provider_call_allowed, false);
  const completion = {
    ...lease,
    observed_assigned: true,
    result_code: "membership-confirmed",
    readback,
  };
  const first = await outbox.complete(completion);
  assert.deepEqual(await outbox.complete(completion), first);
  assert.equal((await outbox.fail({
    ...lease,
    error_code: "REMOTE_COMMIT_UNKNOWN",
    failure_certainty: "ambiguous",
    permanent: false,
    non_commit_proof: null,
  })).outcome, "ambiguous");
  assert.equal((await outbox.extendLease(lease)).outcome, "lease_extended");
  assert.deepEqual(await outbox.recover(), [{ outbox_id: "outbox-2" }]);
  assert.deepEqual(calls.map(({ name }) => name), [
    "claim_outlook_desktop_assignment_jobs",
    "begin_outlook_desktop_assignment_dispatch",
    "complete_outlook_desktop_assignment_job",
    "complete_outlook_desktop_assignment_job",
    "fail_outlook_desktop_assignment_job",
    "extend_outlook_desktop_assignment_lease",
    "recover_outlook_desktop_assignment_removals",
  ]);
});

test("worker client rejects unclosed or unproved provider outcomes", async () => {
  const { outbox } = portFixture();
  assert.throws(() => outbox.complete({
    ...lease,
    observed_assigned: true,
    result_code: "membership-confirmed",
    readback: { ...readback, propagation_stabilized: false },
  }));
  assert.throws(() => outbox.fail({
    ...lease,
    error_code: "REMOTE_COMMIT_UNKNOWN",
    failure_certainty: "ambiguous",
    permanent: false,
    non_commit_proof: {
      ...readback,
      schema_version: "lawos.outlook-assignment-non-commit-proof.v1",
    },
  }));
  assert.throws(() => outbox.claim({
    worker_id: lease.worker_id,
    access_token: "secret",
  }));
});
