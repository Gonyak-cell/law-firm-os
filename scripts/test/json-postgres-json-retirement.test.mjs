import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresCut011Probe,
  validateJsonPostgresRetiredLambdaConfiguration,
} from "../lib/json-postgres-json-retirement.mjs";

const packet = {
  source_sha: "a".repeat(40),
  source_tree: "b".repeat(40),
  packet_sha256: "c".repeat(64),
  bindings: { artifact_sha256: "d".repeat(64) },
  target: { monthly_cost_ceiling_krw: 300_000 },
};

function runtime(startupKind, generation, stream) {
  return {
    schema_version: "law-firm-os.json-postgres-json-retirement-smoke.v1",
    outcome: "PASS",
    startup_kind: startupKind,
    runtime_generation: generation,
    runtime_log_stream_sha256: stream.repeat(64),
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    result_sha256: (startupKind === "warm" ? "e" : "f").repeat(64),
    safe_counts: {
      postgres_record_count: 1,
      postgres_audit_event_count: 1,
      postgres_outbox_event_count: 1,
      tenant_negative_visible_count: 0,
      operational_json_path_count: 0,
      json_fallback_count: 0,
      json_writer_count: 0,
      dual_write_count: 0,
      file_current_authority_count: 0,
      offline_mutation_count: 0,
      memory_fallback_count: 0,
    },
    claims: {
      postgres_only_authority: true,
      legacy_json_immutable_only: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
}

function lambda(generation) {
  return {
    State: "Active",
    LastUpdateStatus: "Successful",
    Environment: {
      Variables: {
        LAWOS_RUNTIME_PROFILE: "operational",
        LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
        LAWOS_STAFF_AUTHORITY: "internal-password",
        LAWOS_RUNTIME_GENERATION: String(generation),
      },
    },
  };
}

test("CUT-011 requires distinct warm/cold generations and zero legacy authority counters", () => {
  const probe = createJsonPostgresCut011Probe({
    packet,
    warm: runtime("warm", 4, "1"),
    cold: runtime("cold", 5, "2"),
    lambdaConfigurations: [lambda(5), lambda(5)],
    backgroundWorker: {
      outcome: "PASS",
      worker: "lawos_password_reset_worker",
      claimed: 0,
      completed: 0,
      dropped: 0,
      retry: 0,
      email_included: false,
      token_material_returned: false,
    },
    immutableBackup: {
      schema_version: "law-firm-os.json-postgres-source-backup-result.v1",
      result_sha256: "3".repeat(64),
      safe_counts: {
        source_count: 287,
        uploaded_object_count: 287,
        restored_object_count: 287,
        digest_mismatch_count: 0,
        source_mutation_count: 0,
      },
      claims: { source_mutated: false, postgres_mutated: false },
    },
    monthlyCostForecastKrw: 269_100,
    startedAt: "2026-07-23T01:00:00.000Z",
    finishedAt: "2026-07-23T01:10:00.000Z",
    probeId: "cut011-attempt1",
  });
  assert.equal(probe.outcome, "PASS");
  assert.equal(probe.safe_counts.operational_json_path_count, 0);
});

test("CUT-011 rejects a store path and reused warm Lambda runtime", () => {
  assert.throws(() => validateJsonPostgresRetiredLambdaConfiguration([
    lambda(5),
    {
      ...lambda(5),
      Environment: {
        Variables: {
          ...lambda(5).Environment.Variables,
          LAWOS_MATTER_STORE_PATH: "/tmp/matter.json",
        },
      },
    },
  ]), /legacy authority/u);
  assert.throws(() => createJsonPostgresCut011Probe({
    packet,
    warm: runtime("warm", 5, "1"),
    cold: runtime("cold", 5, "1"),
    lambdaConfigurations: [lambda(5), lambda(5)],
    backgroundWorker: {
      outcome: "PASS",
      worker: "lawos_password_reset_worker",
      claimed: 0,
      completed: 0,
      dropped: 0,
      retry: 0,
      email_included: false,
      token_material_returned: false,
    },
    immutableBackup: {
      schema_version: "law-firm-os.json-postgres-source-backup-result.v1",
      result_sha256: "3".repeat(64),
      safe_counts: {
        source_count: 287,
        uploaded_object_count: 287,
        restored_object_count: 287,
        digest_mismatch_count: 0,
        source_mutation_count: 0,
      },
      claims: { source_mutated: false, postgres_mutated: false },
    },
    monthlyCostForecastKrw: 269_100,
    startedAt: "2026-07-23T01:00:00.000Z",
    finishedAt: "2026-07-23T01:10:00.000Z",
    probeId: "cut011-attempt1",
  }), /cold start/u);
});
