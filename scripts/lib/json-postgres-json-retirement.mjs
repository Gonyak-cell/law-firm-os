import { createHash } from "node:crypto";
import {
  createJsonPostgresStageProbe,
} from "../../packages/persistence/src/postgres/program-stage-observation.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";

const ZERO_COUNTERS = Object.freeze([
  "json_fallback_count",
  "json_writer_count",
  "dual_write_count",
  "file_current_authority_count",
  "offline_mutation_count",
  "memory_fallback_count",
]);
const STORE_PATH = /^LAWOS_[A-Z0-9_]*(?:STORE|OBJECT_STORE)_PATH$/u;

export function createJsonPostgresWorkerEvent() {
  return Object.freeze({ maintenance_action: "lawos_password_reset_worker" });
}

function fail(message) {
  throw new Error(message);
}

function validateRuntimeResult(value, startupKind, packet) {
  if (value?.schema_version !== "law-firm-os.json-postgres-json-retirement-smoke.v1"
    || value.outcome !== "PASS"
    || value.startup_kind !== startupKind
    || value.source_sha !== packet.source_sha
    || value.source_tree !== packet.source_tree
    || value.packet_sha256 !== packet.packet_sha256
    || !Number.isSafeInteger(value.runtime_generation)
    || value.runtime_generation < 1
    || !/^[0-9a-f]{64}$/u.test(value.runtime_log_stream_sha256 ?? "")
    || value.safe_counts?.postgres_record_count !== 1
    || value.safe_counts?.postgres_audit_event_count !== 1
    || value.safe_counts?.postgres_outbox_event_count !== 1
    || value.safe_counts?.tenant_negative_visible_count !== 0
    || value.safe_counts?.operational_json_path_count !== 0
    || ZERO_COUNTERS.some((key) => value.safe_counts?.[key] !== 0)
    || value.claims?.postgres_only_authority !== true
    || value.claims?.legacy_json_immutable_only !== true
    || value.claims?.raw_value_returned !== false
    || value.claims?.pii_returned !== false
    || value.claims?.secret_material_returned !== false) {
    fail(`CUT-011 ${startupKind} runtime result failed or drifted`);
  }
  return value;
}

export function validateJsonPostgresRetiredLambdaConfiguration(configurations = []) {
  if (!Array.isArray(configurations) || configurations.length !== 2) {
    fail("CUT-011 requires the API and admin Lambda configurations");
  }
  const generations = new Set();
  for (const configuration of configurations) {
    const env = configuration?.Environment?.Variables ?? {};
    if (configuration.State !== "Active"
      || configuration.LastUpdateStatus !== "Successful"
      || env.LAWOS_RUNTIME_PROFILE !== "operational"
      || env.LAWOS_PERSISTENCE_AUTHORITY !== "postgres-v2"
      || env.LAWOS_STAFF_AUTHORITY !== "internal-password"
      || Object.entries(env).some(([key, value]) => STORE_PATH.test(key) && String(value ?? "").trim())
      || !Number.isSafeInteger(Number(env.LAWOS_RUNTIME_GENERATION))
      || Number(env.LAWOS_RUNTIME_GENERATION) < 1) {
      fail("CUT-011 deployed Lambda configuration retains a legacy authority or is not active");
    }
    generations.add(Number(env.LAWOS_RUNTIME_GENERATION));
  }
  if (generations.size !== 1) fail("CUT-011 API/admin runtime generations differ");
  return Object.freeze({
    active_function_count: 2,
    operational_json_path_count: 0,
    runtime_generation: [...generations][0],
  });
}

export function createJsonPostgresCut011Probe({
  packet,
  warm,
  cold,
  lambdaConfigurations,
  backgroundWorker,
  immutableBackup,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
  probeId,
} = {}) {
  validateRuntimeResult(warm, "warm", packet);
  validateRuntimeResult(cold, "cold", packet);
  const deployed = validateJsonPostgresRetiredLambdaConfiguration(lambdaConfigurations);
  if (cold.runtime_generation <= warm.runtime_generation
    || cold.runtime_generation !== deployed.runtime_generation
    || cold.runtime_log_stream_sha256 === warm.runtime_log_stream_sha256) {
    fail("CUT-011 cold start did not use a new deployed runtime generation and log stream");
  }
  if (backgroundWorker?.outcome !== "PASS"
    || backgroundWorker.worker !== "lawos_password_reset_worker"
    || backgroundWorker.email_included !== false
    || backgroundWorker.token_material_returned !== false
    || !["claimed", "completed", "dropped", "retry"].every((key) =>
      Number.isSafeInteger(backgroundWorker[key]) && backgroundWorker[key] >= 0)
    || backgroundWorker.dropped !== 0
    || backgroundWorker.retry !== 0) {
    fail("CUT-011 production background worker smoke failed");
  }
  if (immutableBackup?.schema_version !== "law-firm-os.json-postgres-source-backup-result.v1"
    || !Number.isSafeInteger(immutableBackup.safe_counts?.source_count)
    || immutableBackup.safe_counts.source_count < 1
    || immutableBackup.safe_counts.uploaded_object_count !== immutableBackup.safe_counts.source_count
    || immutableBackup.safe_counts.restored_object_count !== immutableBackup.safe_counts.source_count
    || immutableBackup.safe_counts.digest_mismatch_count !== 0
    || immutableBackup.safe_counts.source_mutation_count !== 0
    || immutableBackup.claims?.source_mutated !== false
    || immutableBackup.claims?.postgres_mutated !== false) {
    fail("CUT-011 legacy JSON is not retained as immutable verified evidence");
  }
  const evidenceSha256 = createHash("sha256").update(JSON.stringify({
    warm: warm.result_sha256,
    cold: cold.result_sha256,
    generation: deployed.runtime_generation,
    background_worker: {
      claimed: backgroundWorker.claimed,
      completed: backgroundWorker.completed,
      dropped: backgroundWorker.dropped,
      retry: backgroundWorker.retry,
    },
    immutable_backup: immutableBackup.result_sha256,
  })).digest("hex");
  return createJsonPostgresStageProbe({
    probeId,
    stage: "cut-011",
    probeKind: "json-retirement-smoke",
    collectorRef: "run-json-postgres-json-retirement.mjs",
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    bindingsSha256: jsonPostgresProgramBindingsSha256(packet),
    startedAt,
    finishedAt,
    command: "node scripts/run-json-postgres-json-retirement.mjs --operation probe",
    checks: {
      operational_store_path_absent: true,
      missing_json_warm_start_passed: true,
      missing_json_cold_start_passed: true,
      representative_write_passed: true,
      representative_read_passed: true,
      background_jobs_passed: true,
      audit_passed: true,
      outbox_passed: true,
      legacy_json_immutable_only: true,
    },
    safeCounts: {
      json_fallback_count: 0,
      json_writer_count: 0,
      dual_write_count: 0,
      file_current_authority_count: 0,
      offline_mutation_count: 0,
      memory_fallback_count: 0,
      operational_json_path_count: 0,
      background_job_failure_count: 0,
      runtime_generation: deployed.runtime_generation,
      monthly_cost_forecast_krw: monthlyCostForecastKrw,
    },
    evidenceSha256,
  });
}
