import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  assignmentBoolean,
  assignmentDigest,
  assignmentExactKeys,
  assignmentIdentifier,
  assignmentInteger,
} from "./outlook-desktop-assignment-contract.js";

const OPTIONS = Object.freeze([
  "base_delay_ms", "lease_ms", "max_attempts", "pool", "tenant_id",
]);

function boundedInteger(value, field, minimum, maximum) {
  assignmentInteger(value, field);
  if (value < minimum || value > maximum) {
    throw new TypeError(`outlook assignment ${field} is invalid`);
  }
  return value;
}

function exact(input, keys, field) {
  assignmentExactKeys(input, [...keys].sort(), field);
  return input;
}

function proof(value, schema, field) {
  exact(value, [
    "propagation_stabilized", "receipt_sha256", "request_terminal",
    "schema_version",
  ], field);
  if (value.schema_version !== schema
      || assignmentBoolean(value.request_terminal, `${field} request_terminal`) !== true
      || assignmentBoolean(
        value.propagation_stabilized,
        `${field} propagation_stabilized`,
      ) !== true) {
    throw new TypeError(`outlook assignment ${field} is invalid`);
  }
  assignmentDigest(value.receipt_sha256, `${field} receipt_sha256`);
  return value;
}

export function createPostgresOutlookDesktopAssignmentOutbox(options = {}) {
  exact(options, Object.keys(options), "outbox options");
  for (const key of Object.keys(options)) {
    if (!OPTIONS.includes(key)) throw new TypeError(`unknown option: ${key}`);
  }
  if (!options.pool?.connect) throw new TypeError("PostgreSQL pool is required");
  const tenantId = assignmentIdentifier(options.tenant_id, "tenant_id");
  const leaseMs = boundedInteger(
    options.lease_ms ?? 30_000,
    "lease_ms",
    1_000,
    300_000,
  );
  const maxAttempts = boundedInteger(
    options.max_attempts ?? 5,
    "max_attempts",
    1,
    100,
  );
  const baseDelayMs = boundedInteger(
    options.base_delay_ms ?? 1_000,
    "base_delay_ms",
    100,
    900_000,
  );
  const call = (statement, values) => withPostgresTransaction(
    options.pool,
    { tenant_id: tenantId, isolationLevel: "serializable" },
    async (client) => (await client.query(statement, values)).rows[0]?.value,
  );

  function claim(input = {}) {
    exact(
      input,
      input.limit === undefined ? ["worker_id"] : ["limit", "worker_id"],
      "claim",
    );
    const workerId = assignmentIdentifier(input.worker_id, "worker_id");
    const limit = boundedInteger(input.limit ?? 10, "limit", 1, 100);
    return call(
      "SELECT lawos_email_dms.claim_outlook_desktop_assignment_jobs($1,$2,$3,$4,$5) AS value",
      [tenantId, workerId, limit, leaseMs, maxAttempts],
    );
  }

  function beginDispatch(input = {}) {
    exact(input, ["lease_token", "outbox_id", "worker_id"], "begin dispatch");
    return call(
      "SELECT lawos_email_dms.begin_outlook_desktop_assignment_dispatch($1,$2,$3,$4) AS value",
      [tenantId, assignmentIdentifier(input.outbox_id, "outbox_id"),
        assignmentIdentifier(input.worker_id, "worker_id"),
        assignmentIdentifier(input.lease_token, "lease_token")],
    );
  }

  function complete(input = {}) {
    exact(input, [
      "lease_token", "observed_assigned", "outbox_id", "readback",
      "result_code", "worker_id",
    ], "completion");
    assignmentIdentifier(input.outbox_id, "outbox_id");
    assignmentIdentifier(input.worker_id, "worker_id");
    assignmentIdentifier(input.lease_token, "lease_token");
    assignmentBoolean(input.observed_assigned, "observed_assigned");
    assignmentIdentifier(input.result_code, "result_code");
    proof(
      input.readback,
      "lawos.outlook-assignment-authoritative-readback.v1",
      "readback",
    );
    return call(
      "SELECT lawos_email_dms.complete_outlook_desktop_assignment_job($1,$2::jsonb) AS value",
      [tenantId, JSON.stringify(input)],
    );
  }

  function fail(input = {}) {
    exact(input, [
      "error_code", "failure_certainty", "lease_token", "non_commit_proof",
      "outbox_id", "permanent", "worker_id",
    ], "failure");
    assignmentIdentifier(input.outbox_id, "outbox_id");
    assignmentIdentifier(input.worker_id, "worker_id");
    assignmentIdentifier(input.lease_token, "lease_token");
    assignmentIdentifier(input.error_code, "error_code");
    assignmentBoolean(input.permanent, "permanent");
    if (!new Set(["ambiguous", "definitive_not_committed"])
      .has(input.failure_certainty)) {
      throw new TypeError("outlook assignment failure_certainty is invalid");
    }
    if (input.failure_certainty === "ambiguous") {
      if (input.non_commit_proof !== null) {
        throw new TypeError("outlook assignment non_commit_proof is invalid");
      }
    } else if (input.non_commit_proof !== null) {
      proof(
        input.non_commit_proof,
        "lawos.outlook-assignment-non-commit-proof.v1",
        "non_commit_proof",
      );
    }
    return call(
      "SELECT lawos_email_dms.fail_outlook_desktop_assignment_job($1,$2::jsonb,$3,$4) AS value",
      [tenantId, JSON.stringify(input), maxAttempts, baseDelayMs],
    );
  }

  function extendLease(input = {}) {
    exact(input, ["lease_token", "outbox_id", "worker_id"], "lease extension");
    return call(
      "SELECT lawos_email_dms.extend_outlook_desktop_assignment_lease($1,$2,$3,$4,$5) AS value",
      [tenantId, assignmentIdentifier(input.outbox_id, "outbox_id"),
        assignmentIdentifier(input.worker_id, "worker_id"),
        assignmentIdentifier(input.lease_token, "lease_token"), leaseMs],
    );
  }

  function recover(input = {}) {
    exact(
      input,
      input.limit === undefined ? [] : ["limit"],
      "removal recovery",
    );
    const limit = boundedInteger(input.limit ?? 10, "limit", 1, 100);
    return call(
      "SELECT lawos_email_dms.recover_outlook_desktop_assignment_removals($1,$2) AS value",
      [tenantId, limit],
    );
  }

  return Object.freeze({
    authority: "postgres-outlook-desktop-assignment-outbox",
    beginDispatch,
    claim,
    complete,
    extendLease,
    fail,
    recover,
  });
}
