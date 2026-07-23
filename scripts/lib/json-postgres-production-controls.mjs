import { createHash } from "node:crypto";
import {
  validateJsonPostgresPerformanceAcceptance,
} from "../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  createJsonPostgresStageProbe,
} from "../../packages/persistence/src/postgres/program-stage-observation.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";

const SHA256 = /^[0-9a-f]{64}$/u;
const STORE_PATH = /^LAWOS_[A-Z0-9_]*(?:STORE|OBJECT_STORE)_PATH$/u;

function fail(message) {
  throw new Error(message);
}

function exact(value, packet, label) {
  if (value?.source_sha !== packet.source_sha
    || value.source_tree !== packet.source_tree
    || value.packet_sha256 !== packet.packet_sha256
    || value.outcome !== "PASS") {
    fail(`${label} exact binding or outcome drifted`);
  }
  return value;
}

function cost(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 300_000) {
    fail("production controls monthly cost is invalid");
  }
  return value;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : stableJson(value))
    .digest("hex");
}

export function createJsonPostgresSourceFreezeControl({
  packet,
  confirmation,
  lambdaConfigurations,
} = {}) {
  const live = validateJsonPostgresFrozenLambdaConfigurations(lambdaConfigurations);
  if (confirmation?.schema_version !== "law-firm-os.json-postgres-source-freeze-confirmation.v1"
    || confirmation.inventory_content_sha256 !== packet?.bindings?.inventory_content_sha256
    || confirmation.transform_sha256 !== packet?.bindings?.transform_sha256
    || confirmation.source_content_unchanged !== true
    || confirmation.json_writers_frozen !== true
    || confirmation.competing_imports_frozen !== true
    || confirmation.operational_json_writer_count !== 0
    || confirmation.competing_import_count !== 0
    || confirmation.unexpected_source_count !== 0
    || confirmation.external_email_send_count !== 0
    || confirmation.raw_pii_evidence_count !== 0
    || confirmation.source_mutation_count !== 0) {
    fail("source-freeze confirmation is incomplete or drifted");
  }
  const material = {
    schema_version: "law-firm-os.json-postgres-source-freeze-control.v1",
    outcome: "PASS",
    freeze_state: "FROZEN",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    inventory_content_sha256: packet.bindings.inventory_content_sha256,
    transform_sha256: packet.bindings.transform_sha256,
    safe_counts: {
      operational_json_writer_count: 0,
      competing_import_count: 0,
      unexpected_source_count: 0,
      external_email_send_count: 0,
      raw_pii_evidence_count: 0,
      source_mutation_count: 0,
      active_lambda_count: live.active_lambda_count,
    },
    claims: {
      source_content_unchanged: true,
      json_writers_frozen: true,
      competing_imports_frozen: true,
      production_write: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const control = Object.freeze({
    ...material,
    freeze_marker_sha256: sha256(material),
  });
  return validateJsonPostgresSourceFreezeControl(control, packet);
}

export function createJsonPostgresFirstWriteBoundary({
  packet,
  sourceFreezeReceipt,
  confirmation,
} = {}) {
  if (sourceFreezeReceipt?.valid !== true
    || sourceFreezeReceipt.signature_valid !== true
    || sourceFreezeReceipt.execution_state !== "PASS"
    || sourceFreezeReceipt.receipt_kind !== "source-freeze"
    || sourceFreezeReceipt.source_sha !== packet?.source_sha
    || sourceFreezeReceipt.source_tree !== packet?.source_tree
    || sourceFreezeReceipt.packet_sha256 !== packet?.packet_sha256) {
    fail("first-write boundary requires the exact signed source-freeze PASS");
  }
  if (confirmation?.schema_version !== "law-firm-os.json-postgres-first-write-confirmation.v1"
    || confirmation.state !== "FIRST_PRODUCTION_WRITE_NOT_STARTED"
    || confirmation.post_write_runbook_sha256 !== packet.bindings.post_write_runbook_sha256
    || confirmation.production_write_count !== 0
    || confirmation.pre_write_rollback_available !== true
    || confirmation.json_writers_frozen !== true) {
    fail("first-write boundary confirmation is incomplete or drifted");
  }
  const material = {
    schema_version: "law-firm-os.json-postgres-first-write-boundary.v1",
    state: "FIRST_PRODUCTION_WRITE_NOT_STARTED",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    source_freeze_receipt_sha256: sourceFreezeReceipt.canonical_sha256,
    post_write_runbook_sha256: packet.bindings.post_write_runbook_sha256,
    safe_counts: { production_write_count: 0 },
    claims: {
      pre_write_rollback_available: true,
      json_writers_frozen: true,
      production_write: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return Object.freeze({
    ...material,
    boundary_marker_sha256: sha256(material),
  });
}

export function validateJsonPostgresSourceFreezeControl(control = {}, packet = {}) {
  exact(control, packet, "source-freeze control");
  if (control.schema_version !== "law-firm-os.json-postgres-source-freeze-control.v1"
    || control.freeze_state !== "FROZEN"
    || control.inventory_content_sha256 !== packet.bindings.inventory_content_sha256
    || control.transform_sha256 !== packet.bindings.transform_sha256
    || !SHA256.test(control.freeze_marker_sha256 ?? "")
    || control.safe_counts?.operational_json_writer_count !== 0
    || control.safe_counts?.competing_import_count !== 0
    || control.safe_counts?.unexpected_source_count !== 0
    || control.safe_counts?.external_email_send_count !== 0
    || control.safe_counts?.raw_pii_evidence_count !== 0
    || control.safe_counts?.source_mutation_count !== 0
    || control.safe_counts?.active_lambda_count !== 2
    || control.claims?.source_content_unchanged !== true
    || control.claims?.json_writers_frozen !== true
    || control.claims?.competing_imports_frozen !== true
    || control.claims?.production_write !== false
    || control.claims?.raw_value_returned !== false
    || control.claims?.pii_returned !== false
    || control.claims?.secret_material_returned !== false) {
    fail("source-freeze control is incomplete or unsafe");
  }
  return control;
}

export function validateJsonPostgresFrozenLambdaConfigurations(configurations = []) {
  if (!Array.isArray(configurations) || configurations.length !== 2) {
    fail("source freeze requires API and admin Lambda configurations");
  }
  for (const configuration of configurations) {
    const env = configuration?.Environment?.Variables ?? {};
    if (configuration.State !== "Active"
      || configuration.LastUpdateStatus !== "Successful"
      || env.LAWOS_RUNTIME_PROFILE !== "operational"
      || env.LAWOS_PERSISTENCE_AUTHORITY !== "postgres-v2"
      || env.LAWOS_STAFF_AUTHORITY !== "internal-password"
      || Object.entries(env).some(([key, value]) => STORE_PATH.test(key) && String(value ?? "").trim())) {
      fail("production Lambda retains a JSON authority or is not active");
    }
  }
  return Object.freeze({ active_lambda_count: 2, operational_json_writer_count: 0 });
}

export function createJsonPostgresSourceFreezeProbes({
  packet,
  immutableBackup,
  control,
  finalDryRun,
  performanceAcceptance,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
  probeRef,
} = {}) {
  const acceptance = validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  exact(finalDryRun, packet, "final dry-run");
  validateJsonPostgresSourceFreezeControl(control, packet);
  if (immutableBackup?.schema_version !== "law-firm-os.json-postgres-source-backup-result.v1"
    || immutableBackup.source_sha !== packet.source_sha
    || immutableBackup.source_tree !== packet.source_tree
    || immutableBackup.packet_sha256 !== packet.packet_sha256
    || immutableBackup.inventory_content_sha256 !== packet.bindings.inventory_content_sha256
    || immutableBackup.transform_sha256 !== packet.bindings.transform_sha256
    || immutableBackup.safe_counts?.source_count < 1
    || immutableBackup.safe_counts?.uploaded_object_count !== immutableBackup.safe_counts.source_count
    || immutableBackup.safe_counts?.restored_object_count !== immutableBackup.safe_counts.source_count
    || immutableBackup.safe_counts?.digest_mismatch_count !== 0
    || immutableBackup.safe_counts?.source_mutation_count !== 0
    || immutableBackup.claims?.source_mutated !== false
    || immutableBackup.claims?.postgres_mutated !== false) {
    fail("immutable source backup is incomplete or drifted");
  }
  const totalRecords = Number(finalDryRun.safe_counts?.accepted_record_count ?? -1)
    + Number(finalDryRun.safe_counts?.account_count ?? -1);
  if (finalDryRun.mode !== "dry-run"
    || finalDryRun.first_write_state !== "FIRST_PRODUCTION_WRITE_NOT_STARTED"
    || finalDryRun.claims?.production_write !== false
    || finalDryRun.claims?.real_data_mutated !== false
    || finalDryRun.claims?.authority_activated !== false
    || finalDryRun.safe_counts?.unexpected_rejection_count !== 0
    || finalDryRun.safe_counts?.tenant_negative_visible_count !== 0
    || finalDryRun.migration_manifest_sha256 !== packet.bindings.migration_manifest_sha256
    || totalRecords !== performanceAcceptance.record_count
    || acceptance.acceptance_sha256 !== packet.bindings.performance_acceptance_sha256) {
    fail("final production dry-run does not match W12 acceptance");
  }
  const monthly = cost(monthlyCostForecastKrw);
  const bindingsSha256 = jsonPostgresProgramBindingsSha256(packet);
  const common = {
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    bindingsSha256,
    startedAt,
    finishedAt,
  };
  return Object.freeze([
    createJsonPostgresStageProbe({
      ...common,
      probeId: `${probeRef}-backup`,
      stage: "source-freeze",
      probeKind: "immutable-backup",
      collectorRef: "run-json-postgres-production-controls.mjs",
      command: "node scripts/run-json-postgres-production-controls.mjs --operation source-freeze",
      checks: {
        immutable_source_backup_created: true,
        off_device_backup_uploaded: true,
        isolated_backup_restore_passed: true,
      },
      safeCounts: {
        immutable_backup_source_count: immutableBackup.safe_counts.source_count,
        source_mutation_count: 0,
        monthly_cost_forecast_krw: monthly,
      },
      evidenceSha256: immutableBackup.result_sha256,
    }),
    createJsonPostgresStageProbe({
      ...common,
      probeId: `${probeRef}-control`,
      stage: "source-freeze",
      probeKind: "source-freeze-control",
      collectorRef: "run-json-postgres-production-controls.mjs",
      command: "node scripts/run-json-postgres-production-controls.mjs --operation source-freeze",
      checks: {
        operational_json_writers_frozen: true,
        competing_imports_frozen: true,
        base_delta_inventory_verified: true,
        source_content_unchanged: true,
      },
      safeCounts: {
        operational_json_writer_count: 0,
        competing_import_count: 0,
        unexpected_source_count: 0,
        external_email_send_count: 0,
        raw_pii_evidence_count: 0,
        active_lambda_count: 2,
        monthly_cost_forecast_krw: monthly,
      },
      evidenceSha256: control.freeze_marker_sha256,
    }),
    createJsonPostgresStageProbe({
      ...common,
      probeId: `${probeRef}-dry-run`,
      stage: "source-freeze",
      probeKind: "final-dry-run",
      collectorRef: "run-json-postgres-production-controls.mjs",
      command: "node scripts/run-json-postgres-production-controls.mjs --operation source-freeze",
      checks: {
        final_dry_run_passed: true,
        w12_capacity_acceptance_matched: true,
      },
      safeCounts: {
        accepted_record_count: totalRecords,
        unexpected_rejection_count: 0,
        monthly_cost_forecast_krw: monthly,
      },
      evidenceSha256: finalDryRun.result_sha256,
    }),
  ]);
}

export function createJsonPostgresFirstWriteBoundaryProbe({
  packet,
  sourceFreezeReceipt,
  boundary,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
  probeId,
} = {}) {
  if (sourceFreezeReceipt?.valid !== true
    || sourceFreezeReceipt.signature_valid !== true
    || sourceFreezeReceipt.execution_state !== "PASS"
    || sourceFreezeReceipt.receipt_kind !== "source-freeze"
    || sourceFreezeReceipt.source_sha !== packet.source_sha
    || sourceFreezeReceipt.source_tree !== packet.source_tree
    || sourceFreezeReceipt.packet_sha256 !== packet.packet_sha256) {
    fail("first-write boundary requires the exact signed source-freeze PASS");
  }
  if (boundary?.schema_version !== "law-firm-os.json-postgres-first-write-boundary.v1"
    || boundary.state !== "FIRST_PRODUCTION_WRITE_NOT_STARTED"
    || boundary.source_sha !== packet.source_sha
    || boundary.source_tree !== packet.source_tree
    || boundary.packet_sha256 !== packet.packet_sha256
    || boundary.source_freeze_receipt_sha256 !== sourceFreezeReceipt.canonical_sha256
    || boundary.post_write_runbook_sha256 !== packet.bindings.post_write_runbook_sha256
    || !SHA256.test(boundary.boundary_marker_sha256 ?? "")
    || boundary.safe_counts?.production_write_count !== 0
    || boundary.claims?.pre_write_rollback_available !== true
    || boundary.claims?.json_writers_frozen !== true
    || boundary.claims?.production_write !== false
    || boundary.claims?.raw_value_returned !== false
    || boundary.claims?.pii_returned !== false
    || boundary.claims?.secret_material_returned !== false) {
    fail("first-write boundary marker is incomplete or drifted");
  }
  return createJsonPostgresStageProbe({
    probeId,
    stage: "first-write-boundary",
    probeKind: "first-write-control",
    collectorRef: "run-json-postgres-production-controls.mjs",
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    bindingsSha256: jsonPostgresProgramBindingsSha256(packet),
    startedAt,
    finishedAt,
    command: "node scripts/run-json-postgres-production-controls.mjs --operation first-write-boundary",
    checks: {
      first_production_write_not_started: true,
      pre_write_rollback_available: true,
      post_write_runbook_verified: true,
      json_writers_frozen: true,
    },
    safeCounts: {
      production_write_count: 0,
      monthly_cost_forecast_krw: cost(monthlyCostForecastKrw),
    },
    evidenceSha256: boundary.boundary_marker_sha256,
  });
}
