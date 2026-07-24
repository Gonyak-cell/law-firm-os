import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createJsonPostgresRecordTypeCatalog,
} from "../../packages/persistence/src/postgres/record-type-catalog.js";
import {
  createJsonPostgresAdjudicationRecommendations,
  createJsonPostgresRecordAuthority,
} from "../../packages/persistence/src/postgres/source-adjudication.js";
import {
  createJsonPostgresFieldCrosswalk,
} from "../../packages/persistence/src/postgres/source-authority-manifest.js";
import {
  inventoryJsonPostgresSources,
} from "../../packages/persistence/src/postgres/source-inventory.js";
import {
  reconcileJsonPostgresMigrationCorpus,
} from "../../packages/persistence/src/postgres/migration-reconciliation.js";
import {
  deriveJsonPostgresW12StageEvidence,
} from "../lib/json-postgres-w12-stage-evidence.mjs";
import {
  jsonPostgresRehearsalResultSha256,
} from "../lib/json-postgres-rehearsal-execution.mjs";
import {
  createJsonPostgresRehearsalSinkResult,
} from "../lib/json-postgres-rehearsal-sink.mjs";
import {
  prepareJsonPostgresDmsObjectManifest,
} from "../../packages/dms/src/json-postgres-dms-migration.js";
import {
  createJsonPostgresRehearsalDmsControlResult,
} from "../lib/json-postgres-rehearsal-dms-controls.mjs";
import {
  JSON_POSTGRES_W12_RECEIPTS,
} from "../../packages/persistence/src/postgres/program-receipt.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";
import {
  createJsonPostgresW12ComponentReceiptSet,
} from "../lib/json-postgres-w12-component-receipt-set.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : canonical(value))
    .digest("hex");
}

function bytes(value) {
  return Buffer.from(`${JSON.stringify(value)}\n`);
}

function basePacket(stages, bindings) {
  return {
    phase: "w12-real-data-rehearsal",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    authorized_stages: stages,
    operators: ["matter-staging-admin", "matter-readonly-auditor"],
    bindings,
    target: { monthly_cost_ceiling_krw: 300_000 },
  };
}

function derive(packet, stage, sourceArtifacts) {
  return deriveJsonPostgresW12StageEvidence({
    packet,
    stage,
    evidenceId: `w12-${stage}-test`,
    startedAt: "2026-07-24T00:00:00.000Z",
    finishedAt: "2026-07-24T00:00:01.000Z",
    commandSha256: "d".repeat(64),
    sourceArtifacts,
  });
}

async function sourceFixture(t) {
  const root = await mkdtemp(join(tmpdir(), "lawos-w12-evidence-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "analytics-store.json"), `${JSON.stringify({
    records: [{
      tenant_id: "tenant-never-return",
      record_type: "Metric",
      record_id: "metric-never-return",
      state_version: 1,
      payload: { count: 1 },
    }],
  })}\n`);
  const inventory = await inventoryJsonPostgresSources({
    roots: [{ ref: "runtime-primary", path: root }],
    clock: () => new Date("2026-07-24T00:00:00.000Z"),
  });
  const recommendations =
    createJsonPostgresAdjudicationRecommendations({
      inventory,
      approvedInventoryContentSha256:
        inventory.inventory_content_sha256,
    });
  const authority = createJsonPostgresRecordAuthority({
    inventory,
    recommendations,
    decisionSetRef: "w12-source-stage-test",
    ownerDecisionRef: "owner-w12-source-stage-test",
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    rootPriority: ["runtime-primary"],
  });
  return { inventory, authority };
}

function authoritySummary({ inventory, authority, bindings }) {
  const material = {
    schema_version: "law-firm-os.json-postgres-authority-bundle.v2",
    decision_set_ref: "w12-source-stage-test",
    outcome: "READY_FOR_OWNER_SIGNATURE",
    ready_for_owner_signature: true,
    inventory_content_sha256: inventory.inventory_content_sha256,
    record_type_catalog_sha256:
      bindings.record_type_catalog_sha256 ?? "e".repeat(64),
    record_authority_sha256: authority.authority_sha256,
    field_crosswalk_sha256:
      bindings.field_crosswalk_sha256 ?? "f".repeat(64),
    authority_manifest_sha256: "1".repeat(64),
    migration_manifest_sha256:
      bindings.migration_manifest_sha256 ?? "2".repeat(64),
    transform_sha256: null,
    source_transform_plan_sha256: null,
    migration_invariant_hash: "3".repeat(64),
    reconciliation_sha256: "4".repeat(64),
    inventory_delta_policy_sha256: "5".repeat(64),
    inventory_delta_sha256: null,
    safe_counts: {
      source_count: authority.safe_counts.source_count,
      authoritative_source_count:
        authority.safe_counts.authoritative_source_count,
      superseded_source_count:
        authority.safe_counts.superseded_source_count,
      duplicate_source_count:
        authority.safe_counts.duplicate_source_count,
      synthetic_source_count:
        authority.safe_counts.synthetic_source_count,
      corrupt_source_count: authority.safe_counts.corrupt_source_count,
      unresolved_source_count: 0,
      record_decision_count:
        authority.safe_counts.record_decision_count,
      identity_decision_count:
        authority.safe_counts.identity_decision_count,
      field_count: 1,
      accepted_record_count: 1,
      expected_rejected_count: 0,
      unexpected_rejected_count: 0,
      missing_expected_rejected_count: 0,
      logical_reference_missing_count: 0,
      reconciliation_blocking_count: 0,
      inventory_delta_review_count: 0,
    },
    claims: {
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      real_data_mutated: false,
      production_contacted: false,
      owner_approval_created: false,
    },
  };
  return {
    ...material,
    bundle_sha256: digest(material),
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
  };
}

test("W12 source evidence derives checks and counts from fixed artifacts", async (t) => {
  const fixture = await sourceFixture(t);
  const bindings = {
    inventory_content_sha256:
      fixture.inventory.inventory_content_sha256,
    record_authority_sha256: fixture.authority.authority_sha256,
  };
  const summary = authoritySummary({
    ...fixture,
    bindings,
  });
  bindings.authority_bundle_sha256 = summary.bundle_sha256;
  const packet = basePacket(
    ["source-inventory-adjudication"],
    bindings,
  );
  const evidence = derive(
    packet,
    "source-inventory-adjudication",
    [
      { kind: "source-inventory", bytes: bytes(fixture.inventory) },
      { kind: "authority-decisions", bytes: bytes(fixture.authority) },
      { kind: "authority-bundle", bytes: bytes(summary) },
    ],
  );
  assert.equal(evidence.checks.every_candidate_dispositioned, true);
  assert.equal(evidence.safe_counts.unresolved_candidate_count, 0);
  assert.equal(evidence.safe_counts.source_count, 1);
  assert.throws(() => derive(
    packet,
    "source-inventory-adjudication",
    [
      { kind: "source-inventory", bytes: bytes(fixture.inventory) },
      { kind: "authority-decisions", bytes: bytes(fixture.authority) },
    ],
  ), /incomplete or out of order/u);
});

test("W12 record-type evidence rejects transformed count drift", async (t) => {
  const fixture = await sourceFixture(t);
  const corpus = {
    schema_version: "law-firm-os.json-postgres-migration-corpus.v1",
    data_scope: "approved-real-manifest",
    tenant_id: "tenant-never-return",
    accounts: [],
    domains: [{
      domain_id: "analytics",
      records: [{
        record_type: "Metric",
        record_id: "metric-never-return",
        state_version: 1,
        unique_key: "metric:never-return",
        append_only: false,
        payload: { count: 1 },
        references: [],
      }],
    }],
  };
  const catalog = createJsonPostgresRecordTypeCatalog({ corpus });
  const crosswalk = createJsonPostgresFieldCrosswalk({
    inventory: fixture.inventory,
    recordTypeCatalog: catalog,
  });
  const migrationManifestSha256 = "6".repeat(64);
  const transformBase = {
    schema_version: "law-firm-os.json-postgres-source-transform-result.v2",
    inventory_content_sha256:
      fixture.inventory.inventory_content_sha256,
    locator_manifest_sha256: "7".repeat(64),
    source_transform_plan_sha256: "8".repeat(64),
    migration_manifest_sha256: migrationManifestSha256,
    safe_counts: {
      inventory_source_count: 1,
      verified_source_count: 1,
      authoritative_source_count: 1,
      parsed_authoritative_source_count: 1,
      record_decision_count: 0,
      archive_only_record_copy_count: 0,
      hrx_primary_key_resolution_count: 0,
      hrx_unique_resolution_count: 0,
      roster_authority_resolution_count: 0,
      identity_decision_count: 0,
      account_count: 0,
      domain_count: 12,
      record_count: 1,
      idempotency_count: 0,
      audit_event_count: 0,
      roster_gap_count: 0,
      duplicate_email_count: 0,
      duplicate_matter_code_count: 0,
      missing_required_reference_count: 0,
      optional_missing_reference_count: 0,
      rejected_item_count: 0,
      excluded_secret_field_count: 0,
      excluded_secret_field_name_count: 0,
    },
    claims: {
      source_mutated: false,
      postgres_mutated: false,
      production_contacted: false,
      external_email_sent: false,
      raw_value_returned: false,
      raw_path_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      document_bytes_returned: false,
    },
  };
  const transformMaterial = Object.fromEntries(Object.entries(
    transformBase,
  ).filter(([key]) => ![
    "source_sha",
    "source_tree",
    "source_read_packet_sha256",
  ].includes(key)));
  const transform = {
    ...transformBase,
    result_sha256: digest(transformMaterial),
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    source_read_packet_sha256: "9".repeat(64),
  };
  const reconciliation =
    reconcileJsonPostgresMigrationCorpus({
      corpus,
      recordTypeCatalog: catalog,
    });
  const packet = basePacket(
    ["record-type-and-reference"],
    {
      record_type_catalog_sha256: catalog.catalog_sha256,
      field_crosswalk_sha256: crosswalk.field_crosswalk_sha256,
      migration_manifest_sha256: migrationManifestSha256,
    },
  );
  const artifacts = [
    { kind: "record-type-catalog", bytes: bytes(catalog) },
    { kind: "field-crosswalk", bytes: bytes(crosswalk) },
    { kind: "source-transform", bytes: bytes(transform) },
    {
      kind: "logical-reference-reconciliation",
      bytes: bytes(reconciliation),
    },
  ];
  const evidence = derive(packet, "record-type-and-reference", artifacts);
  assert.equal(evidence.safe_counts.product_domain_count, 12);
  const drifted = structuredClone(transform);
  drifted.safe_counts.domain_count = 11;
  drifted.result_sha256 = digest(Object.fromEntries(Object.entries(
    drifted,
  ).filter(([key]) => ![
    "result_sha256",
    "source_sha",
    "source_tree",
    "source_read_packet_sha256",
  ].includes(key))));
  assert.throws(() => derive(
    packet,
    "record-type-and-reference",
    artifacts.map((artifact) => artifact.kind === "source-transform"
      ? { ...artifact, bytes: bytes(drifted) }
      : artifact),
  ), /incomplete/u);
});

function infrastructureResult(packet, operation, source) {
  const value = {
    schema_version:
      "law-firm-os.json-postgres-rehearsal-infrastructure-result.v1",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    approval_receipt_sha256: "1".repeat(64),
    registry_sha256: "2".repeat(64),
    generated_at: "2026-07-24T00:00:00.000Z",
    operation,
    outcome: "PASS",
    ...source,
    raw_pii_evidence_count: 0,
    secret_material_recorded: false,
  };
  return {
    ...value,
    result_sha256: jsonPostgresRehearsalResultSha256(value),
  };
}

test("W12 infrastructure evidence binds private state and unchanged protected resources", () => {
  const packet = basePacket(["w12-infrastructure"], {});
  const fingerprint = "3".repeat(64);
  const preflight = infrastructureResult(packet, "preflight", {
    protected_resource_fingerprint: fingerprint,
    rds: {
      private_rds_count: 1,
      public_rds_count: 0,
      pitr_enabled_count: 1,
    },
  });
  const deploy = infrastructureResult(packet, "deploy", {
    protected_resource_fingerprint: fingerprint,
    host_stack_status: "UPDATE_COMPLETE",
    lambda: {
      active_successful_count: 1,
      vpc_attached_count: 1,
      external_email_authority_count: 0,
      legacy_environment_key_count: 0,
    },
    program_input_bucket: {
      versioning_enabled: true,
      public_access_blocked: true,
      object_lock_enabled: true,
      sse_kms_enabled: true,
    },
    dms_bucket: {
      versioning_enabled: true,
      public_access_blocked: true,
      object_lock_enabled: true,
      sse_kms_enabled: true,
    },
    temporary_eni_allow_count: 0,
    source_function_explicit_deny_count: 3,
    postgres_mutation_count: 0,
    real_data_read_count: 0,
    real_data_mutation_count: 0,
    external_email_send_count: 0,
    monthly_forecast_krw: 162_630,
    monthly_cost_ceiling_krw: 300_000,
  });
  const evidence = derive(packet, "w12-infrastructure", [
    { kind: "rehearsal-target-state", bytes: bytes(deploy) },
    { kind: "database-security-state", bytes: bytes(preflight) },
    { kind: "backup-target-state", bytes: bytes(deploy) },
  ]);
  assert.equal(evidence.safe_counts.public_resource_count, 0);
  assert.equal(
    evidence.safe_counts.monthly_cost_forecast_krw,
    162_630,
  );
  const drifted = {
    ...deploy,
    temporary_eni_allow_count: 1,
  };
  drifted.result_sha256 =
    jsonPostgresRehearsalResultSha256(drifted);
  assert.throws(() => derive(packet, "w12-infrastructure", [
    { kind: "rehearsal-target-state", bytes: bytes(drifted) },
    { kind: "database-security-state", bytes: bytes(preflight) },
    { kind: "backup-target-state", bytes: bytes(drifted) },
  ]), /controls failed/u);
});

test("W12 sink evidence is derived from no-SES authority and denied simulation", () => {
  const packet = basePacket(["w12-sink"], {});
  const result = createJsonPostgresRehearsalSinkResult({
    packet,
    lambdaConfiguration: {
      FunctionName: "lawos-private-staging-w12-admin",
      State: "Active",
      LastUpdateStatus: "Successful",
      Role: "arn:aws:iam::770880870480:role/lawos-private-staging-w12-admin-role",
      Environment: {
        Variables: {
          LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
        },
      },
    },
    rolePolicySet: [{
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Action: ["s3:GetObject"],
        Resource: "arn:aws:s3:::example/*",
      }],
    }],
    simulationResults: [
      {
        EvalActionName: "ses:SendEmail",
        EvalDecision: "implicitDeny",
      },
      {
        EvalActionName: "ses:SendRawEmail",
        EvalDecision: "implicitDeny",
      },
    ],
  });
  const evidence = derive(packet, "w12-sink", [
    { kind: "sink-policy", bytes: bytes(result) },
    { kind: "negative-recipient-probe", bytes: bytes(result) },
    { kind: "sink-audit", bytes: bytes(result) },
  ]);
  assert.equal(evidence.safe_counts.external_email_send_count, 0);
  assert.equal(evidence.safe_counts.denied_action_count, 2);
  assert.throws(() => createJsonPostgresRehearsalSinkResult({
    packet,
    lambdaConfiguration: {
      FunctionName: "lawos-private-staging-w12-admin",
      State: "Active",
      LastUpdateStatus: "Successful",
      Role: "arn:aws:iam::770880870480:role/unapproved-role",
      Environment: { Variables: {} },
    },
    rolePolicySet: [{}],
    simulationResults: [
      {
        EvalActionName: "ses:SendEmail",
        EvalDecision: "implicitDeny",
      },
      {
        EvalActionName: "ses:SendRawEmail",
        EvalDecision: "implicitDeny",
      },
    ],
  }), /inspection failed/u);
  assert.throws(() => createJsonPostgresRehearsalSinkResult({
    packet,
    lambdaConfiguration: {
      FunctionName: "lawos-private-staging-w12-admin",
      State: "Active",
      LastUpdateStatus: "Successful",
      Role: "arn:aws:iam::770880870480:role/lawos-private-staging-w12-admin-role",
      Environment: { Variables: { SES_FROM_ADDRESS: "blocked" } },
    },
    rolePolicySet: [{}],
    simulationResults: [
      {
        EvalActionName: "ses:SendEmail",
        EvalDecision: "implicitDeny",
      },
      {
        EvalActionName: "ses:SendRawEmail",
        EvalDecision: "implicitDeny",
      },
    ],
  }), /inspection failed/u);
});

function executionEvidence(packet, mode, overrides = {}) {
  const writes = ["commit", "resume"].includes(mode);
  const safeCounts = {
    account_count: 12,
    domain_count: 12,
    source_record_count: 1_676,
    accepted_record_count: 1_676,
    rejected_record_count: 0,
    rejected_item_count: 0,
    record_type_catalog_entry_count: 31,
    logical_reference_missing_count: 0,
    tenant_negative_visible_count: 0,
    json_fallback_count: 0,
    json_writer_count: 0,
    dual_write_count: 0,
    file_current_authority_count: 0,
    offline_mutation_count: 0,
    memory_fallback_count: 0,
    directory_replayed_noop_count: 0,
    directory_idempotency_count: 12,
    directory_audit_count: 12,
    directory_outbox_count: 12,
    domain_replayed_noop_count: 0,
    domain_idempotency_count: 1_676,
    domain_audit_count: 1_676,
    domain_outbox_count: 1_676,
    dms_source_object_count: 0,
    dms_verified_object_count: 0,
    dms_completed_object_count: 0,
    dms_replayed_object_count: 0,
    dms_provider_version_count: 0,
    dms_retention_verified_count: 0,
    dms_legal_hold_verified_count: 0,
    dms_tenant_negative_visible_count: 0,
    dms_unexpected_rejection_count: 0,
    ...(mode === "reconcile" ? {
      blocking_count: 0,
      missing_logical_reference_count: 0,
      unexpected_rejected_count: 0,
      missing_expected_rejected_count: 0,
      employee_user_link_count: 10,
    } : {}),
    ...(overrides.safe_counts ?? {}),
  };
  const material = {
    schema_version: "law-firm-os.json-postgres-execution-result.v1",
    phase: "w12-real-data-rehearsal",
    mode,
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    authority_bundle_sha256: "1".repeat(64),
    migration_manifest_sha256: "2".repeat(64),
    first_write_state: "NOT_PRODUCTION",
    predecessor_receipt_sha256: [],
    checkpoint: writes ? { completed_steps: ["all"] } : null,
    dms_checkpoint: { completed_object_refs: [] },
    invariant_hash: "3".repeat(64),
    ledger_invariant_hash: "4".repeat(64),
    dms_invariant_hash: "5".repeat(64),
    dms_result_sha256: "6".repeat(64),
    safe_counts: safeCounts,
    performance: {
      measurement_count: 13,
      elapsed_ms: 100,
      operation_p50_ms: 5,
      operation_p95_ms: 10,
      operation_p99_ms: 12,
      records_per_tenant: 1_688,
      largest_domain_batch_size: 1_000,
      materialized_payload_bytes: 10_000,
      retry_count: 0,
      conflict_count: 0,
      pool_total_count: 4,
      pool_idle_count: 4,
      pool_waiting_count: 0,
      outbox_lag_p95_ms: 10,
    },
    rejected_reason_counts: {},
    rejected_rows: [],
    claims: {
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
    },
    ...Object.fromEntries(Object.entries(overrides).filter(
      ([key]) => key !== "safe_counts",
    )),
  };
  return {
    ...material,
    result_sha256: digest(material),
  };
}

function failureEvidence() {
  const material = {
    schema_version:
      "law-firm-os.json-postgres-rehearsal-failure-injection.v1",
    outcome: "PASS",
    probe_ref_sha256: "7".repeat(64),
    checks: {
      transaction_rollback_verified: true,
      partial_commit_prevented: true,
      optimistic_conflict_verified: true,
      outbox_atomicity_verified: true,
      retry_rollback_verified: true,
      statement_timeout_verified: true,
      cross_tenant_transaction_denied: true,
    },
    safe_counts: {
      injected_fault_count: 6,
      retry_attempt_count: 3,
      partial_commit_count: 0,
      residual_probe_record_count: 0,
      residual_probe_audit_count: 0,
      residual_probe_outbox_count: 0,
      cross_tenant_write_count: 0,
    },
    claims: {
      durable_probe_write: false,
      source_mutated: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return { ...material, result_sha256: digest(material) };
}

test("W12 migration, replay, tenant, and reconciliation evidence reuse exact checkpoints", () => {
  const packet = basePacket([
    "w12-migration",
    "w12-replay",
    "w12-tenant-rls",
    "w12-reconciliation",
  ], {
    record_type_catalog_sha256: "8".repeat(64),
  });
  const committed = executionEvidence(packet, "commit");
  const replay = executionEvidence(packet, "resume");
  const readback = executionEvidence(packet, "readback");
  const reconciled = executionEvidence(packet, "reconcile");
  const migration = derive(packet, "w12-migration", [
    { kind: "execution-result", bytes: bytes(committed) },
    { kind: "database-readback", bytes: bytes(readback) },
    { kind: "dms-migration-result", bytes: bytes(committed) },
  ]);
  assert.equal(migration.safe_counts.unexplained_variance_count, 0);
  const replayEvidence = derive(packet, "w12-replay", [
    { kind: "first-execution-result", bytes: bytes(committed) },
    { kind: "replay-execution-result", bytes: bytes(replay) },
    { kind: "stability-readback", bytes: bytes(readback) },
  ]);
  assert.equal(replayEvidence.safe_counts.replay_new_record_count, 0);
  const failure = failureEvidence();
  const tenant = derive(packet, "w12-tenant-rls", [
    { kind: "rls-negative-read", bytes: bytes(readback) },
    { kind: "rls-negative-write", bytes: bytes(failure) },
    { kind: "cross-tenant-transaction", bytes: bytes(failure) },
  ]);
  assert.equal(tenant.safe_counts.cross_tenant_write_count, 0);
  const logicalMaterial = {
    schema_version: "law-firm-os.json-postgres-reconciliation.v1",
    outcome: "PASS",
    catalog_sha256: packet.bindings.record_type_catalog_sha256,
    safe_counts: {
      blocking_count: 0,
      missing_logical_reference_count: 0,
      employee_without_link_count: 0,
      link_without_employee_count: 0,
      link_without_account_count: 0,
      unexpected_rejected_count: 0,
      missing_expected_rejected_count: 0,
      employee_user_link_count: 10,
    },
    blocking_refs: {},
    rejection_refs: {},
    claims: {
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      real_data_mutated: false,
      production_contacted: false,
    },
  };
  const logical = {
    ...logicalMaterial,
    reconciliation_sha256: digest(logicalMaterial),
  };
  const reconciliation = derive(packet, "w12-reconciliation", [
    {
      kind: "source-target-reconciliation",
      bytes: bytes(reconciled),
    },
    {
      kind: "logical-reference-validation",
      bytes: bytes(logical),
    },
    {
      kind: "identity-hrx-reconciliation",
      bytes: bytes(reconciled),
    },
  ]);
  assert.equal(reconciliation.safe_counts.unexplained_variance_count, 0);
  const drifted = executionEvidence(packet, "readback", {
    invariant_hash: "9".repeat(64),
  });
  assert.throws(() => derive(packet, "w12-replay", [
    { kind: "first-execution-result", bytes: bytes(committed) },
    { kind: "replay-execution-result", bytes: bytes(replay) },
    { kind: "stability-readback", bytes: bytes(drifted) },
  ]), /durable PostgreSQL state/u);
});

test("W12 zero-object DMS and failure injection evidence do not invent byte migration", () => {
  const manifest = prepareJsonPostgresDmsObjectManifest({
    schema_version:
      "law-firm-os.json-postgres-dms-object-manifest.v1",
    data_scope: "approved-real-manifest",
    tenant_id: "tenant-never-return",
    authority_manifest_sha256: "a".repeat(64),
    retention_contract_sha256: "b".repeat(64),
    objects: [],
    manifest_sha256: null,
  });
  const packet = basePacket([
    "w12-failure-injection",
    "w12-dms",
  ], {
    dms_object_manifest_sha256: manifest.manifest_sha256,
  });
  const execution = executionEvidence(packet, "commit");
  const infrastructure = infrastructureResult(packet, "deploy", {
    dms_bucket: {
      versioning_enabled: true,
      public_access_blocked: true,
      object_lock_enabled: true,
      sse_kms_enabled: true,
    },
    temporary_eni_allow_count: 0,
  });
  const dmsControl = createJsonPostgresRehearsalDmsControlResult({
    packet,
    dmsManifest: manifest,
    execution,
    infrastructure,
    testCommand:
      "node --test "
      + "packages/dms/test/postgres-security-regressions.test.js "
      + "packages/dms/test/json-postgres-dms-migration.test.js",
    testOutput: Buffer.from("tests passed"),
    testExitCode: 0,
  });
  const dms = derive(packet, "w12-dms", [
    { kind: "dms-migration-result", bytes: bytes(execution) },
    { kind: "dms-governance-readback", bytes: bytes(dmsControl) },
    { kind: "dms-delete-negative", bytes: bytes(dmsControl) },
  ]);
  assert.equal(dms.safe_counts.dms_source_object_count, 0);
  assert.equal(dms.checks.object_lock_verified, true);
  const failure = failureEvidence();
  const injected = derive(packet, "w12-failure-injection", [
    { kind: "transaction-faults", bytes: bytes(failure) },
    { kind: "checkpoint-resume", bytes: bytes(execution) },
    { kind: "dms-provider-fault", bytes: bytes(dmsControl) },
    { kind: "outbox-fault", bytes: bytes(failure) },
  ]);
  assert.equal(injected.safe_counts.partial_commit_count, 0);
  assert.equal(injected.safe_counts.source_mutation_count, 0);
  assert.equal(dmsControl.claims.provider_write, false);
});

test("W12 terminal evidence requires every signed component receipt", () => {
  const packet = basePacket(["w12-terminal"], {});
  const bindingsSha256 = jsonPostgresProgramBindingsSha256(packet);
  const kinds = JSON_POSTGRES_W12_RECEIPTS.filter(
    (kind) => kind !== "w12-terminal",
  );
  const verifiedReceipts = kinds.map((kind, index) => ({
    valid: true,
    signature_valid: true,
    execution_state: "PASS",
    receipt_kind: kind,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    bindings_sha256: bindingsSha256,
    canonical_sha256: index.toString(16).padStart(64, "0"),
    result_sha256: (index + 20).toString(16).padStart(64, "0"),
    safe_counts: {
      monthly_cost_forecast_krw:
        kind === "w12-infrastructure" ? 162_630 : 0,
      json_fallback_count: 0,
      json_writer_count: 0,
      dual_write_count: 0,
      file_current_authority_count: 0,
      offline_mutation_count: 0,
      memory_fallback_count: 0,
      receipt_verification_failure_count: 0,
      unresolved_candidate_count: 0,
      unexplained_variance_count: 0,
      unexpected_rejection_count: 0,
      production_write_count: 0,
      external_email_send_count: 0,
    },
    claims: {
      production_write: false,
      production_contacted: false,
      external_email_sent: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      dms_bytes_in_evidence: false,
    },
  }));
  const componentSet = createJsonPostgresW12ComponentReceiptSet({
    packet,
    verifiedReceipts,
  });
  const terminal = derive(packet, "w12-terminal", [{
    kind: "component-receipt-set",
    bytes: bytes(componentSet),
  }]);
  assert.equal(terminal.safe_counts.component_receipt_count, 13);
  assert.equal(
    terminal.safe_counts.monthly_cost_forecast_krw,
    162_630,
  );
  assert.throws(() => createJsonPostgresW12ComponentReceiptSet({
    packet,
    verifiedReceipts: verifiedReceipts.slice(1),
  }), /incomplete or out of order/u);
});

test("W12 evidence derivation fails closed for an unimplemented stage", () => {
  const packet = basePacket(["cut-008"], {});
  assert.throws(() => derive(
    packet,
    "cut-008",
    [],
  ), /derivation is missing/u);
});
