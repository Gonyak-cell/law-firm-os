import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const FORMAL_DEPLOYED_API_TRANSCRIPT_SCHEMA =
  "law-firm-os.formal-deployed-api-raw-transcript.v2";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const KINDS = Object.freeze(["task", "time", "wip", "billing"]);

export function opaqueSha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function keys(value, expected, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} fields drifted`);
}

function timestamp(value, label) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u, `${label} is invalid`);
  assert.ok(Number.isFinite(Date.parse(value)), `${label} is invalid`);
}

function digest(value, label, pattern = SHA256) {
  assert.match(value, pattern, `${label} is invalid`);
}

function sequence(rows, label) {
  assert.ok(Array.isArray(rows), `${label} must be an array`);
  rows.forEach((row, index) => assert.equal(row.sequence, index + 1, `${label} sequence drifted`));
}

function validateProcess(transcript, expected) {
  sequence(transcript.process_events, "process events");
  assert.equal(transcript.process_events.length, 2, "launch and shutdown process events are required");
  const [launch, exit] = transcript.process_events;
  keys(launch, ["artifact_sha256", "executable_sha256", "kind", "manifest_sha256", "phase", "pid_fingerprint_sha256", "sequence", "spawnfile_sha256"], "launch event");
  assert.equal(launch.kind, "launch");
  assert.equal(launch.phase, "startup");
  assert.equal(launch.artifact_sha256, expected.artifactSha256);
  assert.equal(launch.manifest_sha256, expected.manifestSha256);
  assert.equal(launch.executable_sha256, expected.executedPackageSha256);
  assert.equal(launch.spawnfile_sha256, expected.executablePathSha256);
  digest(launch.pid_fingerprint_sha256, "PID fingerprint");
  keys(exit, ["exit_code", "kind", "phase", "sequence"], "shutdown event");
  assert.equal(exit.kind, "exit");
  assert.equal(exit.phase, "shutdown");
  assert.equal(exit.exit_code, 0);
}

function validateTelemetry(transcript, expected) {
  sequence(transcript.telemetry_boundary_events, "telemetry boundary events");
  assert.deepEqual(
    transcript.telemetry_boundary_events.map(({ kind }) => kind),
    ["configured_before_launch", "process_spawn_observed", "shutdown_observed", "telemetry_flushed_after_shutdown"],
  );
  for (const row of transcript.telemetry_boundary_events) keys(row, ["kind", "sequence"], "telemetry boundary event");
  sequence(transcript.network_events, "network events");
  for (const row of transcript.network_events) {
    keys(row, ["failed", "method", "operator_header_count", "origin_sha256", "phase", "sequence", "status"], "network event");
    assert.equal(row.origin_sha256, expected.endpointSha256, "network event escaped the signed endpoint allowlist");
    assert.match(row.method, /^[A-Z]{3,12}$/u);
    assert.ok(row.status === null || (Number.isInteger(row.status) && row.status >= 100 && row.status <= 599));
    assert.equal(row.failed, false);
    assert.equal(row.operator_header_count, 0);
  }
  assert.ok(transcript.network_events.length > 0, "deployed API network evidence is empty");
  sequence(transcript.console_events, "console events");
  sequence(transcript.process_error_events, "process error events");
  assert.deepEqual(transcript.console_events, []);
  assert.deepEqual(transcript.process_error_events, []);
}

function validateIdentity(transcript, expectedUsers, expectedTenantId) {
  assert.equal(expectedUsers.length, 10, "authority manifest must contain exactly ten synthetic users");
  const expected = new Map(expectedUsers.map((entry) => [opaqueSha256(entry.userId), opaqueSha256(entry.employeeId)]));
  sequence(transcript.identity_rows, "identity rows");
  assert.equal(transcript.identity_rows.length, 10, "exactly ten identity rows are required");
  const observed = new Set();
  for (const row of transcript.identity_rows) {
    keys(row, ["classification", "employee_id_sha256", "initials_sha256", "photo_sha256", "sequence", "user_id_sha256"], "identity row");
    digest(row.user_id_sha256, "opaque user id");
    digest(row.employee_id_sha256, "opaque employee id");
    assert.equal(row.classification, "approved-synthetic");
    assert.equal(expected.get(row.user_id_sha256), row.employee_id_sha256, "unclassified synthetic identity row");
    assert.ok(row.photo_sha256 !== null || row.initials_sha256 !== null, "profile photo or initials evidence is required");
    if (row.photo_sha256 !== null) digest(row.photo_sha256, "profile photo");
    if (row.initials_sha256 !== null) digest(row.initials_sha256, "profile initials");
    assert.equal(observed.has(row.user_id_sha256), false, "duplicate synthetic identity row");
    observed.add(row.user_id_sha256);
  }
  assert.deepEqual([...observed].sort(), [...expected.keys()].sort(), "synthetic identity set does not match authority manifest");
  keys(transcript.other_tenant_observation, ["employees_field_present", "forbidden_query_keys", "outcome", "requested_tenant_sha256", "response_sha256", "safe_error_code", "signed_tenant_sha256", "status", "visible_count"], "other tenant observation");
  digest(transcript.other_tenant_observation.signed_tenant_sha256, "signed tenant");
  digest(transcript.other_tenant_observation.requested_tenant_sha256, "requested tenant");
  digest(transcript.other_tenant_observation.response_sha256, "other tenant response");
  assert.equal(transcript.other_tenant_observation.signed_tenant_sha256, opaqueSha256(expectedTenantId), "signed tenant is not the exact-head synthetic tenant");
  assert.notEqual(transcript.other_tenant_observation.requested_tenant_sha256, transcript.other_tenant_observation.signed_tenant_sha256, "negative tenant must differ from the signed tenant");
  assert.equal(transcript.other_tenant_observation.status, 400);
  assert.equal(transcript.other_tenant_observation.outcome, "blocked");
  assert.equal(transcript.other_tenant_observation.safe_error_code, "HRX_QUERY_CONTEXT_FORBIDDEN");
  assert.deepEqual(transcript.other_tenant_observation.forbidden_query_keys, ["tenant_id"]);
  assert.equal(transcript.other_tenant_observation.employees_field_present, false);
  assert.equal(transcript.other_tenant_observation.visible_count, 0);
  sequence(transcript.other_tenant_rows, "other tenant rows");
  assert.deepEqual(transcript.other_tenant_rows, [], "other-tenant query returned visible data");
}

function validateScenarios(transcript) {
  sequence(transcript.matter_today_rows, "Matter Today rows");
  assert.ok(transcript.matter_today_rows.length > 0, "Matter Today returned no rows");
  for (const row of transcript.matter_today_rows) {
    keys(row, ["row_sha256", "sequence"], "Matter Today row");
    digest(row.row_sha256, "Matter Today row");
  }
  sequence(transcript.mutation_events, "mutation events");
  sequence(transcript.readback_events, "readback events");
  const durableWrites = {};
  for (const kind of KINDS) {
    const attempts = transcript.mutation_events.filter((row) => row.kind === kind);
    assert.equal(attempts.length, 2, `${kind} requires two raw mutation attempts`);
    attempts.forEach((row, index) => {
      keys(row, ["attempt", "idempotency_key_sha256", "kind", "replay", "resource_id_sha256", "response_sha256", "sequence", "status"], `${kind} mutation`);
      assert.equal(row.attempt, index + 1);
      assert.equal(row.replay, index === 1);
      assert.ok(Number.isInteger(row.status) && row.status >= 200 && row.status < 300);
      for (const field of ["idempotency_key_sha256", "resource_id_sha256", "response_sha256"]) digest(row[field], `${kind}.${field}`);
    });
    assert.equal(attempts[0].idempotency_key_sha256, attempts[1].idempotency_key_sha256);
    assert.equal(attempts[0].resource_id_sha256, attempts[1].resource_id_sha256);
    const readbacks = transcript.readback_events.filter((row) => row.kind === kind);
    assert.equal(readbacks.length, 1, `${kind} requires one raw readback`);
    const readback = readbacks[0];
    keys(readback, ["kind", "occurrence_count", "resource_id_sha256", "response_sha256", "sequence"], `${kind} readback`);
    assert.equal(readback.resource_id_sha256, attempts[0].resource_id_sha256);
    assert.equal(readback.occurrence_count, 1, `${kind} readback must contain exactly one resource`);
    digest(readback.response_sha256, `${kind} readback response`);
    durableWrites[kind] = Object.freeze({ mutation_attempt_count: 2, replay_count: 1, durable_readback_count: 1, duplicate_count: 0 });
  }
  return Object.freeze(durableWrites);
}

export function validateFormalDeployedApiRawTranscript(transcript, expected = {}) {
  keys(transcript, ["console_events", "finished_at", "health_response", "identity_rows", "matter_today_rows", "mutation_events", "network_events", "other_tenant_observation", "other_tenant_rows", "platform", "process_error_events", "process_events", "readback_events", "run_id", "runtime_observation", "schema_version", "started_at", "telemetry_boundary_events"], "raw transcript");
  assert.equal(transcript.schema_version, FORMAL_DEPLOYED_API_TRANSCRIPT_SCHEMA);
  assert.equal(transcript.platform, expected.platform);
  assert.match(transcript.run_id, /^[a-z0-9-]{12,128}$/u);
  timestamp(transcript.started_at, "transcript started_at");
  timestamp(transcript.finished_at, "transcript finished_at");
  assert.ok(Date.parse(transcript.finished_at) >= Date.parse(transcript.started_at));
  keys(transcript.health_response, ["body_sha256", "persistence_authority", "runtime_profile", "source_revision", "status", "synthetic_only", "uses_real_client_data"], "health response");
  assert.equal(transcript.health_response.status, 200);
  assert.equal(transcript.health_response.source_revision, expected.sourceSha);
  assert.equal(transcript.health_response.persistence_authority, "postgres-v2");
  assert.equal(transcript.health_response.runtime_profile, "operational");
  assert.equal(transcript.health_response.synthetic_only, true);
  assert.equal(transcript.health_response.uses_real_client_data, false);
  digest(transcript.health_response.body_sha256, "health body");
  keys(transcript.runtime_observation, ["base_url_sha256", "mode", "operator_runtime_configured"], "runtime observation");
  assert.equal(transcript.runtime_observation.base_url_sha256, expected.endpointSha256);
  assert.equal(transcript.runtime_observation.mode, "production-auth-http");
  assert.equal(transcript.runtime_observation.operator_runtime_configured, false);
  validateProcess(transcript, expected);
  validateTelemetry(transcript, expected);
  validateIdentity(transcript, expected.expectedUsers, expected.expectedTenantId);
  const durableWrites = validateScenarios(transcript);
  return Object.freeze({
    network_request_count: transcript.network_events.length,
    loopback_request_count: 0,
    operator_token_count: 0,
    unexpected_endpoint_count: 0,
    production_contact_count: 0,
    console_error_count: 0,
    synthetic_user_count: 10,
    photo_or_initials_count: 10,
    other_tenant_visible_count: 0,
    matter_today_visible_count: transcript.matter_today_rows.length,
    durable_writes: durableWrites,
  });
}
