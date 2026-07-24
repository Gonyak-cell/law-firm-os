import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  assertJsonPostgresRehearsalProgramCaller,
  createJsonPostgresRehearsalLocatorSet,
  createJsonPostgresRehearsalProgramEvent,
  jsonPostgresRehearsalProfileForMode,
  validateJsonPostgresRehearsalExecutionEvidence,
  validateJsonPostgresRehearsalProgramResponse,
  validateJsonPostgresRehearsalRestoreEvidence,
  validateJsonPostgresRehearsalValidationEvidence,
} from "../lib/json-postgres-rehearsal-program.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);
const DIGEST = "d".repeat(64);
const BUCKET = "lawos-private-rehearsal-input-770880870480";

function packet() {
  return {
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    phase: "w12-real-data-rehearsal",
    allowed_modes: [
      "preflight", "dry-run", "stage", "commit", "resume", "readback",
      "reconcile",
    ],
    bindings: { artifact_sha256: "e".repeat(64) },
    target: {
      program_input_bucket_name: BUCKET,
      program_input_expected_bucket_owner: "770880870480",
      approved_tenant_ids: ["tenant_amic"],
    },
  };
}

function locator(name) {
  return {
    schema_version: "law-firm-os.immutable-program-input-locator.v1",
    bucket: BUCKET,
    key: `program-input/${PACKET_SHA}/migration/${name}/${DIGEST}`,
    version_id: `version-${name}`,
    expected_bucket_owner: "770880870480",
    sha256: DIGEST,
    byte_size: 42,
  };
}

function locatorSet() {
  return createJsonPostgresRehearsalLocatorSet({
    packet: packet(),
    authorization: {
      packet: locator("packet"),
      trust_registry: locator("trust-registry"),
      approval_receipt: locator("approval-receipt"),
      approval_signature: locator("approval-signature"),
    },
    inputs: {
      authority_summary: locator("authority-summary"),
      base_manifest: locator("base-manifest"),
      record_type_catalog: locator("record-type-catalog"),
      inventory: locator("inventory"),
      authority_decisions: locator("authority-decisions"),
      record_authority: locator("record-authority"),
      migration_corpus: locator("migration-corpus"),
      source_transform_result: locator("source-transform-result"),
      dms_manifest: locator("dms-manifest"),
    },
    predecessors: [{
      receipt: locator("predecessor-receipt"),
      signature: locator("predecessor-signature"),
    }],
  });
}

function claims(writes = false) {
  return {
    real_data_read: true,
    real_data_mutated: writes,
    database_write: writes,
    production_contacted: false,
    production_write: false,
    authority_activated: false,
    json_authority_disabled: false,
    dms_bytes_in_evidence: false,
    release: false,
    go_live: false,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  };
}

function safeCounts() {
  return {
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: 0,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
  };
}

function performance() {
  return {
    measurement_count: 3,
    elapsed_ms: 30,
    operation_p50_ms: 5,
    operation_p95_ms: 10,
    operation_p99_ms: 10,
    records_per_tenant: 100,
    largest_domain_batch_size: 50,
    materialized_payload_bytes: 4_096,
    retry_count: 0,
    conflict_count: 0,
    pool_total_count: 2,
    pool_idle_count: 2,
    pool_waiting_count: 0,
    outbox_lag_p95_ms: 20,
  };
}

test("W12 locator set and Lambda event remain exact-packet and immutable", () => {
  const value = locatorSet();
  assert.match(value.locator_set_sha256, /^[0-9a-f]{64}$/u);
  const event = createJsonPostgresRehearsalProgramEvent({
    packet: packet(),
    locatorSet: value,
    mode: "commit",
    attemptRef: "w12-commit-001",
    negativeTenantId: "tenant_wrong",
  });
  assert.equal(event.action, "lawos-json-postgres-program-execution");
  assert.equal(event.inputs.predecessors.length, 1);
  assert.equal(event.negative_tenant_id, "tenant_wrong");
  const drifted = structuredClone(value);
  drifted.inputs.inventory.key =
    `program-input/${"f".repeat(64)}/migration/inventory/${DIGEST}`;
  assert.throws(() => createJsonPostgresRehearsalProgramEvent({
    packet: packet(),
    locatorSet: drifted,
    mode: "commit",
    attemptRef: "w12-commit-002",
    negativeTenantId: "tenant_wrong",
  }));
  assert.throws(() => createJsonPostgresRehearsalProgramEvent({
    packet: packet(),
    locatorSet: value,
    mode: "readback",
    attemptRef: "w12-readback-001",
  }));
});

test("W12 mode selects staging mutator and independent read-only profiles", () => {
  assert.equal(
    jsonPostgresRehearsalProfileForMode("commit"),
    "matter-staging-admin",
  );
  assert.equal(
    jsonPostgresRehearsalProfileForMode("readback"),
    "matter-readonly-auditor",
  );
  assert.equal(
    jsonPostgresRehearsalProfileForMode("readback", {
      inspection: true,
    }),
    "matter-staging-admin",
  );
  assert.equal(assertJsonPostgresRehearsalProgramCaller({
    Account: "770880870480",
    Arn:
      "arn:aws:sts::770880870480:assumed-role/matter-readonly-auditor/session",
  }, {
    profile: "matter-readonly-auditor",
    mode: "readback",
  }).role, "matter-readonly-auditor");
  assert.throws(() => assertJsonPostgresRehearsalProgramCaller({
    Account: "770880870480",
    Arn:
      "arn:aws:sts::770880870480:assumed-role/matter-staging-admin/session",
  }, {
    profile: "matter-staging-admin",
    mode: "readback",
  }));
});

test("W12 Lambda response and full immutable evidence require zero legacy authority", () => {
  const response = {
    outcome: "PASS",
    action: "lawos-json-postgres-program-execution",
    phase: "w12-real-data-rehearsal",
    mode: "commit",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    result_sha256: "1".repeat(64),
    execution_evidence_sha256: "2".repeat(64),
    first_write_state: "NOT_PRODUCTION",
    safe_counts: safeCounts(),
    performance: performance(),
    claims: claims(true),
    approval_receipt_sha256: "3".repeat(64),
    authorization_claim_sha256: "4".repeat(64),
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  };
  assert.equal(validateJsonPostgresRehearsalProgramResponse(response, {
    packet: packet(),
    mode: "commit",
  }).valid, true);
  const material = {
    schema_version: "law-firm-os.json-postgres-execution-result.v1",
    phase: "w12-real-data-rehearsal",
    mode: "commit",
    outcome: "PASS",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    first_write_state: "NOT_PRODUCTION",
    safe_counts: safeCounts(),
    performance: performance(),
    claims: claims(true),
  };
  material.result_sha256 = createHash("sha256")
    .update(canonicalizeJson(material))
    .digest("hex");
  response.result_sha256 = material.result_sha256;
  assert.equal(validateJsonPostgresRehearsalExecutionEvidence(material, {
    packet: packet(),
    mode: "commit",
    response,
  }).valid, true);
  const unsafe = structuredClone(response);
  unsafe.safe_counts.json_writer_count = 1;
  assert.throws(() => validateJsonPostgresRehearsalProgramResponse(unsafe, {
    packet: packet(),
    mode: "commit",
  }));
});

test("W12 validation events and immutable evidence are exact readback-only", () => {
  const event = createJsonPostgresRehearsalProgramEvent({
    packet: packet(),
    locatorSet: locatorSet(),
    mode: "readback",
    attemptRef: "w12-owner-sampling-001",
    negativeTenantId: "tenant_wrong",
    validationKind: "owner-sampling",
  });
  assert.equal(event.stage, "w12-owner-sampling");
  assert.equal(event.rehearsal_validation_kind, "owner-sampling");
  assert.throws(() => createJsonPostgresRehearsalProgramEvent({
    packet: packet(),
    locatorSet: locatorSet(),
    mode: "commit",
    attemptRef: "w12-owner-sampling-002",
    negativeTenantId: "tenant_wrong",
    validationKind: "owner-sampling",
  }));
  const material = {
    schema_version:
      "law-firm-os.json-postgres-rehearsal-owner-sampling.v1",
    outcome: "PASS",
    packet_sha256: PACKET_SHA,
    sample_set_sha256: "1".repeat(64),
    samples: [
      ["account", "2"],
      ["employee", "3"],
      ["client", "4"],
      ["matter", "5"],
      ["document", "6"],
    ].map(([sample_kind, value]) => ({
      sample_kind,
      sample_ref: value.repeat(64),
      state_version: 1,
      content_sha256: "7".repeat(64),
    })),
    safe_counts: {
      owner_sample_variance_count: 0,
    },
    claims: {
      read_only: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  material.result_sha256 = createHash("sha256")
    .update(canonicalizeJson(material))
    .digest("hex");
  assert.equal(validateJsonPostgresRehearsalValidationEvidence(material, {
    packet: packet(),
    validationKind: "owner-sampling",
    response: {
      rehearsal_validation_result_sha256: material.result_sha256,
    },
  }).valid, true);
});

test("W12 restore event and evidence bind the exact capacity lineage and target", () => {
  const target = {
    restore_target_sha256: "1".repeat(64),
    migration_result_sha256: "2".repeat(64),
    rpo_ms: 30_000,
    rto_ms: 270_000,
  };
  const acceptance = {
    acceptance_sha256: "3".repeat(64),
  };
  const event = createJsonPostgresRehearsalProgramEvent({
    packet: packet(),
    locatorSet: locatorSet(),
    mode: "readback",
    attemptRef: "w12-restore-readback-001",
    negativeTenantId: "tenant_wrong",
    rehearsalRestore: {
      restore_target: locator("restore-target"),
      performance_acceptance: locator("performance-acceptance"),
      capacity_result: locator("capacity-result"),
    },
  });
  assert.equal(event.stage, "w12-restore");
  assert.equal(
    event.rehearsal_restore.restore_target.version_id,
    "version-restore-target",
  );
  const response = {
    outcome: "PASS",
    action: "lawos-json-postgres-program-execution",
    phase: "w12-real-data-rehearsal",
    mode: "readback",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    result_sha256: "4".repeat(64),
    execution_evidence_sha256: "5".repeat(64),
    rehearsal_restore_target_sha256: target.restore_target_sha256,
    rehearsal_restore_evidence_sha256: "6".repeat(64),
    rpo_ms: target.rpo_ms,
    rto_ms: target.rto_ms,
    first_write_state: "NOT_PRODUCTION",
    safe_counts: safeCounts(),
    performance: performance(),
    claims: claims(false),
    approval_receipt_sha256: "7".repeat(64),
    authorization_claim_sha256: "8".repeat(64),
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  };
  assert.equal(validateJsonPostgresRehearsalProgramResponse(response, {
    packet: packet(),
    mode: "readback",
    rehearsalRestore: true,
  }).valid, true);
  const restoreEvidence = {
    schema_version:
      "law-firm-os.json-postgres-rehearsal-restore-readback-result.v1",
    outcome: "PASS",
    mode: "readback",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    restore_target_sha256: target.restore_target_sha256,
    performance_acceptance_sha256: acceptance.acceptance_sha256,
    migration_result_sha256: target.migration_result_sha256,
    rpo_ms: target.rpo_ms,
    rto_ms: target.rto_ms,
    rpo_target_met: true,
    rto_target_met: true,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  };
  assert.equal(validateJsonPostgresRehearsalRestoreEvidence(
    restoreEvidence,
    {
      packet: packet(),
      mode: "readback",
      response,
      restoreTarget: target,
      performanceAcceptance: acceptance,
    },
  ).valid, true);
  assert.throws(() => createJsonPostgresRehearsalProgramEvent({
    packet: packet(),
    locatorSet: locatorSet(),
    mode: "commit",
    attemptRef: "w12-restore-commit-001",
    negativeTenantId: "tenant_wrong",
    rehearsalRestore: {
      restore_target: locator("restore-target"),
      performance_acceptance: locator("performance-acceptance"),
      capacity_result: locator("capacity-result"),
    },
  }));
});
