import { createHash } from "node:crypto";
import {
  validateHrxRelationalMappingManifest,
} from "../../packages/hrx/src/relational-projection-contract.js";
import {
  validateHrxRelationalProjectionValidation,
} from "../../packages/hrx/src/relational-projection-validation.js";
import {
  validateJsonPostgresPerformanceAcceptance,
} from "../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  jsonPostgresRelationalProjectionExecutionSha256,
} from "./json-postgres-relational-projection-closeout.mjs";
import {
  createJsonPostgresW15ComponentResult,
} from "./json-postgres-w15-receipts.mjs";

export const JSON_POSTGRES_W15_INCREMENTAL_OBSERVATION_VERSION =
  "law-firm-os.json-postgres-w15-incremental-observation.v1";

const SHA256 = /^[a-f0-9]{64}$/u;
const TOKEN = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const ZERO_EXECUTION_COUNTS = Object.freeze([
  "remaining_outbox_event_count",
  "tenant_negative_visible_count",
  "unmapped_nonnull_field_count",
  "physical_delete_count",
  "source_authority_write_count",
  "dual_write_count",
  "partial_commit_count",
  "consumer_write_grant_count",
  "auditor_write_grant_count",
  "authority_promotion_count",
]);
const ZERO_VALIDATION_COUNTS = Object.freeze([
  "mapping_inventory_difference_count",
  "projection_state_difference_count",
  "shadow_difference_count",
  "logical_reference_failure_count",
  "unknown_nonnull_field_count",
  "tenant_negative_visible_count",
  "cursor_backlog_count",
  "cursor_regression_count",
  "transaction_rollback_failure_count",
  "append_only_guard_failure_count",
  "physical_delete_guard_failure_count",
  "source_authority_write_grant_count",
  "consumer_write_grant_count",
  "auditor_write_grant_count",
  "projection_authority_promotion_count",
  "receipt_verification_failure_count",
]);

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value))
    .digest("hex");
}

function exactTime(value, label) {
  const text = String(value ?? "").trim();
  if (!Number.isFinite(Date.parse(text))) fail(`${label} is invalid`);
  return new Date(text).toISOString();
}

function safeCount(value, label) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    fail(`${label} must be a non-negative safe integer`);
  }
  return count;
}

function exactBinding(value, packet, mappingManifest, performanceAcceptance) {
  return value?.source_sha === packet.source_sha
    && value?.source_tree === packet.source_tree
    && value?.packet_sha256 === packet.packet_sha256
    && value?.mapping_manifest_sha256 === mappingManifest.manifest_sha256
    && value?.production_inventory_sha256
      === mappingManifest.inventory_sha256
    && value?.performance_acceptance_sha256
      === performanceAcceptance.acceptance_sha256;
}

function validateExecution(
  execution,
  { packet, mappingManifest, performanceAcceptance, requireEvents },
) {
  if (execution?.schema_version
      !== "law-firm-os.hrx-relational-projection-execution.v2"
    || execution.outcome !== "PASS"
    || execution.action !== "lawos-json-postgres-relational-projection"
    || execution.phase !== "w15-relational-projection"
    || execution.mode !== "incremental"
    || execution.backfill_wave !== null
    || execution.bootstrap_performed !== false
    || execution.predecessor_receipt_count !== 3
    || !exactBinding(
      execution,
      packet,
      mappingManifest,
      performanceAcceptance,
    )
    || execution.claims?.one_way_projection !== true
    || execution.claims?.bounded_checkpoint_resume !== true
    || execution.claims?.event_scoped_incremental_projection !== true
    || execution.claims?.physical_delete_prohibited !== true
    || execution.claims?.recurring_worker_uses_master_credentials !== false
    || execution.claims?.operational_request_dual_write !== false
    || execution.claims?.generic_ledger_authority_preserved !== true
    || execution.claims?.projection_write_authority !== false
    || execution.claims?.raw_value_returned !== false
    || execution.claims?.pii_returned !== false
    || execution.claims?.secret_material_returned !== false
    || !SHA256.test(execution.result_sha256 ?? "")
    || execution.result_sha256
      !== jsonPostgresRelationalProjectionExecutionSha256(execution)
    || ZERO_EXECUTION_COUNTS.some((key) =>
      safeCount(execution.safe_counts?.[key], key) !== 0)) {
    fail("W15 incremental execution evidence is incomplete or drifted");
  }
  const consumed = safeCount(
    execution.safe_counts.consumed_outbox_event_count,
    "consumed_outbox_event_count",
  );
  if ((requireEvents && consumed < 1) || (!requireEvents && consumed !== 0)) {
    fail("W15 event window contains an invalid event count");
  }
  const waveCounts = Object.freeze(Object.fromEntries(
    [1, 2, 3, 4, 5].map((wave) => [
      wave,
      safeCount(
        execution.safe_counts[`observed_event_wave_${wave}_count`],
        `observed_event_wave_${wave}_count`,
      ),
    ]),
  ));
  if (!requireEvents && Object.values(waveCounts).some((count) => count !== 0)) {
    fail("W15 replay evidence unexpectedly observed an event wave");
  }
  return Object.freeze({
    consumed,
    waveCounts,
    projectedWriteCount:
      safeCount(
        execution.safe_counts.projected_insert_count,
        "projected_insert_count",
      )
      + safeCount(
        execution.safe_counts.projected_update_count,
        "projected_update_count",
      ),
  });
}

function validateWindowValidation(
  validation,
  { packet, mappingManifest, performanceAcceptance },
) {
  validateHrxRelationalProjectionValidation(validation);
  if (validation.outcome !== "PASS"
    || validation.source_sha !== packet.source_sha
    || validation.source_tree !== packet.source_tree
    || validation.packet_sha256 !== packet.packet_sha256
    || validation.mapping_manifest_sha256 !== mappingManifest.manifest_sha256
    || validation.inventory_sha256 !== mappingManifest.inventory_sha256
    || validation.performance_acceptance_sha256
      !== performanceAcceptance.acceptance_sha256
    || ZERO_VALIDATION_COUNTS.some((key) =>
      safeCount(validation.safe_counts?.[key], key) !== 0)) {
    fail("W15 independent validation evidence is incomplete or drifted");
  }
  const lagMs = safeCount(
    validation.safe_counts.observed_outbox_lag_ms,
    "observed_outbox_lag_ms",
  );
  if (lagMs > performanceAcceptance.outbox_lag_p95_ms) {
    fail("W15 event window exceeded its signed outbox-lag budget");
  }
  return lagMs;
}

function validateWindow(
  window,
  { packet, mappingManifest, performanceAcceptance },
) {
  if (!TOKEN.test(window?.window_ref ?? "")) {
    fail("W15 event window reference is invalid");
  }
  const startedAt = exactTime(window.started_at, "event window started_at");
  const finishedAt = exactTime(window.finished_at, "event window finished_at");
  if (Date.parse(finishedAt) < Date.parse(startedAt)) {
    fail("W15 event window interval is invalid");
  }
  const execution = validateExecution(window.execution, {
    packet,
    mappingManifest,
    performanceAcceptance,
    requireEvents: true,
  });
  const lagMs = validateWindowValidation(window.validation, {
    packet,
    mappingManifest,
    performanceAcceptance,
  });
  return Object.freeze({
    window_ref: window.window_ref,
    started_at: startedAt,
    finished_at: finishedAt,
    execution_result_sha256: window.execution.result_sha256,
    validation_result_sha256: window.validation.result_sha256,
    consumed_outbox_event_count: execution.consumed,
    observed_event_wave_counts: execution.waveCounts,
    observed_outbox_lag_ms: lagMs,
  });
}

export function createJsonPostgresW15IncrementalObservation({
  packet,
  mappingManifest,
  performanceAcceptance,
  windows,
  replay,
} = {}) {
  if (packet?.phase !== "w15-relational-projection"
    || !SHA256.test(packet?.packet_sha256 ?? "")) {
    fail("W15 incremental observation packet binding is invalid");
  }
  validateHrxRelationalMappingManifest(mappingManifest);
  validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  if (packet.bindings?.field_crosswalk_sha256
      !== mappingManifest.manifest_sha256
    || packet.bindings?.inventory_content_sha256
      !== mappingManifest.inventory_sha256
    || packet.bindings?.performance_acceptance_sha256
      !== performanceAcceptance.acceptance_sha256
    || mappingManifest.performance_acceptance_sha256
      !== performanceAcceptance.acceptance_sha256
    || !Array.isArray(windows)
    || windows.length !== 2) {
    fail("W15 incremental observation inputs drifted from the packet");
  }
  const observedWindows = windows.map((window) => validateWindow(window, {
    packet,
    mappingManifest,
    performanceAcceptance,
  }));
  if (observedWindows[0].window_ref === observedWindows[1].window_ref
    || observedWindows[0].execution_result_sha256
      === observedWindows[1].execution_result_sha256
    || observedWindows[0].validation_result_sha256
      === observedWindows[1].validation_result_sha256
    || Date.parse(observedWindows[1].started_at)
      < Date.parse(observedWindows[0].finished_at)) {
    fail("W15 event windows are not distinct and consecutive");
  }
  const replayObservedAt = exactTime(
    replay?.observed_at,
    "incremental replay observed_at",
  );
  if (Date.parse(replayObservedAt)
      < Date.parse(observedWindows[1].finished_at)) {
    fail("W15 replay observation is not after the event windows");
  }
  const replayResult = validateExecution(replay?.execution, {
    packet,
    mappingManifest,
    performanceAcceptance,
    requireEvents: false,
  });
  if (replayResult.projectedWriteCount !== 0) {
    fail("W15 immediate incremental replay performed a projection write");
  }
  const populatedWaves = [...new Set(
    mappingManifest.tables
      .filter((table) => table.expected_source_count > 0)
      .map((table) => table.rollout_wave),
  )].sort((left, right) => left - right);
  const observedWaveCounts = Object.freeze(Object.fromEntries(
    [1, 2, 3, 4, 5].map((wave) => [
      wave,
      observedWindows.reduce(
        (total, window) =>
          total + window.observed_event_wave_counts[wave],
        0,
      ),
    ]),
  ));
  if (populatedWaves.some((wave) => observedWaveCounts[wave] < 1)) {
    fail("W15 event windows did not observe every populated rollout wave");
  }
  const material = {
    schema_version: JSON_POSTGRES_W15_INCREMENTAL_OBSERVATION_VERSION,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    mapping_manifest_sha256: mappingManifest.manifest_sha256,
    inventory_sha256: mappingManifest.inventory_sha256,
    performance_acceptance_sha256:
      performanceAcceptance.acceptance_sha256,
    event_window_count: observedWindows.length,
    populated_rollout_waves: populatedWaves,
    observed_event_wave_counts: observedWaveCounts,
    windows: observedWindows,
    replay: {
      observed_at: replayObservedAt,
      execution_result_sha256: replay.execution.result_sha256,
    },
    safe_counts: {
      remaining_outbox_event_count: 0,
      cursor_regression_count: 0,
      event_replay_write_count: 0,
      shadow_difference_count: 0,
      tenant_negative_visible_count: 0,
      source_authority_write_count: 0,
      dual_write_count: 0,
      partial_commit_count: 0,
      raw_value_count: 0,
    },
    claims: {
      two_consecutive_event_windows_verified: true,
      populated_rollout_waves_observed: true,
      immediate_replay_noop_verified: true,
      independent_read_only_validation_verified: true,
      generic_ledger_authority_preserved: true,
      projection_authority: "read-only",
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return Object.freeze({ ...material, result_sha256: sha256(material) });
}

export function validateJsonPostgresW15IncrementalObservation(
  value,
  {
    packet,
    mappingManifest,
    performanceAcceptance,
    windows,
    replay,
  } = {},
) {
  const recreated = createJsonPostgresW15IncrementalObservation({
    packet,
    mappingManifest,
    performanceAcceptance,
    windows,
    replay,
  });
  if (value?.result_sha256 !== recreated.result_sha256
    || canonicalizeJson(value) !== canonicalizeJson(recreated)) {
    fail("W15 incremental observation is invalid");
  }
  return Object.freeze({
    valid: true,
    result_sha256: value.result_sha256,
  });
}

export function createJsonPostgresW15IncrementalComponentResult({
  packet,
  observation,
} = {}) {
  if (observation?.schema_version
      !== JSON_POSTGRES_W15_INCREMENTAL_OBSERVATION_VERSION
    || observation.outcome !== "PASS"
    || observation.source_sha !== packet?.source_sha
    || observation.source_tree !== packet?.source_tree
    || observation.packet_sha256 !== packet?.packet_sha256
    || !SHA256.test(observation.result_sha256 ?? "")
    || observation.result_sha256 !== sha256((({
      result_sha256: ignored,
      ...material
    }) => material)(observation))) {
    fail("W15 incremental component observation is incomplete");
  }
  return createJsonPostgresW15ComponentResult({
    kind: "w15-incremental-catchup",
    packet,
    checks: {
      outbox_ordering_verified: true,
      event_scoped_projection_verified: true,
      cursor_readback_verified: true,
      two_event_windows_verified: true,
    },
    safeCounts: {
      ...observation.safe_counts,
      observed_event_window_count: observation.event_window_count,
      populated_rollout_wave_count:
        observation.populated_rollout_waves.length,
    },
    evidenceSha256: observation.result_sha256,
    startedAt: observation.windows[0].started_at,
    finishedAt: observation.replay.observed_at,
  });
}
