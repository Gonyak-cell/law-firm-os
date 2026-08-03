import { createHash, generateKeyPairSync, sign } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import {
  JSON_POSTGRES_EXECUTION_MODES,
  JSON_POSTGRES_EXECUTION_PACKET_VERSION,
  JSON_POSTGRES_W13_W14_AUTHORIZED_STAGES,
  validateJsonPostgresExecutionPacket,
} from "../../../packages/persistence/src/postgres/execution-contract.js";
import {
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "../../../packages/persistence/src/postgres/source-authority-manifest.js";
import {
  createJsonPostgresDrTarget,
} from "../../../packages/persistence/src/postgres/dr-recovery-contract.js";
import {
  createJsonPostgresRehearsalRestoreTarget,
} from "../../../packages/persistence/src/postgres/rehearsal-restore-contract.js";
import {
  createJsonPostgresPerformanceAcceptance,
} from "../../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  canonicalizeJsonPostgresProgramReceipt,
  JSON_POSTGRES_PROGRAM_RECEIPT_ACTION,
  JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
  jsonPostgresProgramReceiptMetadata,
} from "../../../packages/persistence/src/postgres/program-receipt.js";
import {
  createHrxRelationalMappingManifest,
  createHrxRelationalProductionInventory,
} from "../../../packages/hrx/src/relational-projection-contract.js";
import {
  HRX_STORE_TABLES,
  HRX_TABLE_PRIMARY_KEYS,
} from "../../../packages/hrx/src/store/file-store.js";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  assertJsonPostgresProgramDirectInvoke,
  claimJsonPostgresProgramInvocation,
  JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
  JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
  loadJsonPostgresDrRecoveryInputs,
  loadJsonPostgresMigrationInputs,
  loadJsonPostgresProjectionInputs,
  loadJsonPostgresProgramAuthorization,
  loadJsonPostgresRehearsalRestoreInputs,
  loadJsonPostgresRetirementInputs,
  loadJsonPostgresW15BootstrapInputs,
} from "../src/json-postgres-program-inputs.js";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const ARTIFACT_SHA = "c".repeat(64);
const ACCOUNT = "770880870480";
const REGION = "ap-northeast-2";
const INPUT_BUCKET = "lawos-prod-program-input-770880870480";
const INPUT_KMS = "arn:aws:kms:ap-northeast-2:770880870480:key/00000000-0000-0000-0000-000000000000";
const PROFILE_PHOTO_ARTIFACT_BINDING = Object.freeze({
  metadata_path: "apps/api/src/hrx-member-photo-artifact-metadata.json",
  metadata_schema_version: "law-firm-os.profile-photo-artifact-metadata.v1",
  metadata_sha256: "f".repeat(64),
  generation_ref: `profile_generation_${"d".repeat(32)}`,
  private_manifest_schema_version: "law-firm-os.profile-photo-replacement-manifest.v2",
  private_manifest_sha256: "d".repeat(64),
  private_manifest_entry_count: 10,
  injected_photo_entry_count: 10,
  git_source_photo_entry_count: 0,
});
const W15_TRANSFORM_TARGET_COLUMNS = Object.freeze({
  hrx_audit_events: ["metadata_json"],
  hrx_candidates: ["crm_party_linked"],
  hrx_compensation_records: ["raw_amount_included"],
  hrx_documents: ["document_body_included"],
  hrx_interviews: [
    "interviewer_employee_ids_json",
    "restricted_access",
  ],
  hrx_leave_balance_entries: ["metadata_json"],
  hrx_offboarding_cases: [
    "access_revocations_json",
    "document_returns_json",
    "legal_hold_checks_json",
    "matter_reassignments_json",
    "handover_items_json",
  ],
  hrx_onboarding_plans: [
    "tasks_json",
    "document_refs_json",
    "access_requests_json",
  ],
  hrx_offers: ["compensation_restricted"],
});

function packet() {
  const zero = "0".repeat(64);
  const bindings = Object.fromEntries([
    "artifact_sha256",
    "artifact_manifest_sha256",
    "lockfile_sha256",
    "migration_catalog_sha256",
    "record_type_catalog_sha256",
    "record_authority_sha256",
    "field_crosswalk_sha256",
    "authority_manifest_sha256",
    "authority_bundle_sha256",
    "migration_manifest_sha256",
    "dms_object_manifest_sha256",
    "inventory_content_sha256",
    "inventory_delta_policy_sha256",
    "transform_sha256",
    "infrastructure_template_sha256",
    "dms_provider_contract_sha256",
    "backup_retention_contract_sha256",
    "performance_acceptance_sha256",
    "post_write_runbook_sha256",
    "w12_terminal_receipt_sha256",
    "cut012_terminal_receipt_sha256",
    "go_live_receipt_sha256",
  ].map((key) => [key, key === "artifact_sha256" ? ARTIFACT_SHA
    : key === "inventory_delta_policy_sha256" ? JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256
      : key === "w12_terminal_receipt_sha256" ? "d".repeat(64)
        : ["cut012_terminal_receipt_sha256", "go_live_receipt_sha256"].includes(key)
          ? zero
          : "e".repeat(64)]));
  return {
    schema_version: JSON_POSTGRES_EXECUTION_PACKET_VERSION,
    packet_id: "lawos-production-program-001",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    phase: "w13-production-cutover",
    action: "lawos-json-postgres-production-cutover",
    environment: "lawos-production",
    data_scope: "approved-real-manifest",
    contact_scope: ["individual-active-user-request-only"],
    bindings,
    target: {
      target_ref: "lawos-production",
      aws_account: ACCOUNT,
      aws_region: REGION,
      artifact_bucket_ref: "bucket:lawos-prod-artifacts",
      artifact_bucket_name: "lawos-prod-artifacts-770880870480",
      artifact_expected_bucket_owner: ACCOUNT,
      artifact_kms_key_ref: "alias/lawos-prod-artifacts",
      artifact_object_lock_enabled: true,
      artifact_versioning_enabled: true,
      artifact_public_access_blocked: true,
      database_secret_ref: "secret:lawos-prod-db",
      tenant_context_secret_ref: "secret:lawos-prod-tenant-context",
      dms_bucket_ref: "bucket:lawos-prod-dms",
      dms_bucket_name: "lawos-prod-dms-770880870480",
      dms_prefix: "approved-real-migration",
      dms_kms_key_ref: "alias/lawos-prod-dms",
      dms_expected_bucket_owner: ACCOUNT,
      dms_default_retention_days: 365,
      dms_object_lock_enabled: true,
      dms_versioning_enabled: true,
      dms_public_access_blocked: true,
      program_input_bucket_ref: "bucket:lawos-prod-program-input",
      program_input_bucket_name: INPUT_BUCKET,
      program_input_expected_bucket_owner: ACCOUNT,
      program_input_kms_key_ref: "alias/lawos-prod-program-input",
      program_input_object_lock_enabled: true,
      program_input_versioning_enabled: true,
      program_input_public_access_blocked: true,
      approved_tenant_ids: ["tenant_amic"],
      backup_target_ref: "backup:lawos-prod",
      isolated: false,
      production: true,
      public_access: false,
      tls_mode: "verify-full",
      monthly_cost_ceiling_krw: 300000,
    },
    operators: ["matter-prod-deploy-admin", "matter-cutover-operator", "matter-readonly-auditor"],
    allowed_modes: [...JSON_POSTGRES_EXECUTION_MODES],
    authorized_stages: [...JSON_POSTGRES_W13_W14_AUTHORIZED_STAGES],
    requirements: ["Exact signed production inputs are required."],
    stop_conditions: ["Stop on binding drift."],
    current_state: "PENDING_HUMAN_APPROVAL",
    external_actions_authorized: false,
    claims: {
      real_data_read: false,
      real_data_mutated: false,
      production_contacted: false,
      production_write: false,
      json_authority_disabled: false,
      release: false,
      go_live: false,
    },
  };
}

function authorizationFixture() {
  const value = packet();
  const validated = validateJsonPostgresExecutionPacket(value);
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const registry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    generated_at: "2026-07-23T00:00:00.000Z",
    keys: [{
      key_id: "owner-key-1",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: ["lawos-json-postgres-production-cutover"],
      environments: ["lawos-production"],
      valid_from: "2026-07-23T00:00:00.000Z",
      valid_until: "2026-07-30T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  const receipt = {
    schema_version: "law-firm-os.runtime-safety.approval.v1",
    approval_id: "lawos-production-program-approval-001",
    key_id: "owner-key-1",
    role: "owner",
    decision: "approved",
    packet_sha256: validated.packet_sha256,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    action: "lawos-json-postgres-production-cutover",
    environment: "lawos-production",
    signed_at: "2026-07-23T01:00:00.000Z",
    expires_at: "2026-07-29T00:00:00.000Z",
    data_scope: [
      "approved-real-manifest",
      `authority-manifest:${value.bindings.authority_manifest_sha256}`,
      `inventory:${value.bindings.inventory_content_sha256}`,
      `inventory-delta-policy:${value.bindings.inventory_delta_policy_sha256}`,
    ],
    contact_scope: ["individual-active-user-request-only"],
  };
  const registryBytes = Buffer.from(JSON.stringify(registry));
  const receiptBytes = Buffer.from(JSON.stringify(receipt));
  return {
    value,
    packetSha256: validated.packet_sha256,
    registry,
    bytes: new Map([
      ["packet", Buffer.from(JSON.stringify(value))],
      ["registry", registryBytes],
      ["receipt", receiptBytes],
      ["signature", sign(null, Buffer.from(canonicalizeJson(receipt)), privateKey)],
    ]),
    registrySha256: createHash("sha256").update(registryBytes).digest("hex"),
  };
}

function env(registrySha256) {
  return {
    LAWOS_DEPLOYMENT_COMMIT: SOURCE_SHA,
    LAWOS_DEPLOYMENT_TREE: SOURCE_TREE,
    LAWOS_DEPLOYMENT_ARTIFACT_SHA256: ARTIFACT_SHA,
    LAWOS_AWS_ACCOUNT_ID: ACCOUNT,
    LAWOS_PROGRAM_INPUT_BUCKET: INPUT_BUCKET,
    LAWOS_PROGRAM_INPUT_KMS_KEY_ARN: INPUT_KMS,
    LAWOS_OWNER_TRUST_REGISTRY_SHA256: registrySha256,
    LAWOS_APPROVAL_AUDIT_BUCKET: INPUT_BUCKET,
    AWS_REGION: REGION,
  };
}

function event(packetSha256) {
  return {
    action: JSON_POSTGRES_PROGRAM_ADMIN_ACTION,
    attempt_ref: "cut009-attempt-001",
    phase: "w13-production-cutover",
    mode: "preflight",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    artifact_sha256: ARTIFACT_SHA,
    packet_sha256: packetSha256,
    authorization: {
      packet: { key: "packet" },
      trust_registry: { key: "registry" },
      approval_receipt: { key: "receipt" },
      approval_signature: { key: "signature" },
    },
  };
}

test("program authorization is direct-invoke, exact deployment, exact target and Ed25519 approval bound", async () => {
  const fixture = authorizationFixture();
  const request = event(fixture.packetSha256);
  const loaded = await loadJsonPostgresProgramAuthorization({
    event: request,
    env: env(fixture.registrySha256),
    s3Client: {},
    readBytes: async ({ locator }) => fixture.bytes.get(locator.key),
    now: Date.parse("2026-07-24T00:00:00.000Z"),
  });
  assert.equal(loaded.packet.packet_sha256, fixture.packetSha256);
  assert.equal(loaded.approval.decision, "approved");

  assert.throws(
    () => assertJsonPostgresProgramDirectInvoke({ ...request, requestContext: {} }),
    (error) => error?.code === "LAWOS_PROGRAM_DIRECT_INVOKE",
  );
  await assert.rejects(
    loadJsonPostgresProgramAuthorization({
      event: { ...request, artifact_sha256: "f".repeat(64) },
      env: env(fixture.registrySha256),
      s3Client: {},
      readBytes: async ({ locator }) => fixture.bytes.get(locator.key),
    }),
    (error) => error?.code === "LAWOS_PROGRAM_DEPLOYMENT_BINDING",
  );
});

test("program input loader binds corpus to the packet tenant and keeps preflight read-only", async () => {
  const fixture = authorizationFixture();
  const bindings = fixture.value.bindings;
  const objects = new Map([
    ["summary", {
      ready_for_owner_signature: true,
      bundle_sha256: bindings.authority_bundle_sha256,
      inventory_content_sha256: bindings.inventory_content_sha256,
      inventory_delta_policy_sha256: bindings.inventory_delta_policy_sha256,
      record_type_catalog_sha256: bindings.record_type_catalog_sha256,
      record_authority_sha256: bindings.record_authority_sha256,
      field_crosswalk_sha256: bindings.field_crosswalk_sha256,
      authority_manifest_sha256: bindings.authority_manifest_sha256,
      migration_manifest_sha256: bindings.migration_manifest_sha256,
      transform_sha256: bindings.transform_sha256,
    }],
    ["catalog", {
      schema_version: "catalog",
      catalog_sha256: bindings.record_type_catalog_sha256,
    }],
  ]);
  const locators = {
    authority_summary: { key: "summary" },
    record_type_catalog: { key: "catalog" },
  };
  const preflight = await loadJsonPostgresMigrationInputs({
    inputLocators: locators,
    mode: "preflight",
    trustRegistry: fixture.registry,
    packet: { ...fixture.value, packet_sha256: fixture.packetSha256 },
    env: env(fixture.registrySha256),
    s3Client: {},
    readJson: async ({ locator }) => objects.get(locator.key),
  });
  assert.equal(preflight.corpus, null);
  assert.deepEqual(preflight.predecessors, []);

  await assert.rejects(
    loadJsonPostgresMigrationInputs({
      inputLocators: {
        ...locators,
        base_manifest: { key: "base-manifest" },
        inventory: { key: "inventory" },
        authority_decisions: { key: "decisions" },
        record_authority: { key: "record-authority" },
        migration_corpus: { key: "corpus" },
        source_transform_result: { key: "transform" },
        dms_manifest: { key: "dms" },
      },
      mode: "dry-run",
      trustRegistry: fixture.registry,
      packet: { ...fixture.value, packet_sha256: fixture.packetSha256 },
      env: env(fixture.registrySha256),
      s3Client: {},
      readJson: async ({ locator }) => (
        locator.key === "corpus" ? { tenant_id: "tenant_other" } : objects.get(locator.key) ?? {}
      ),
    }),
    (error) => error?.code === "LAWOS_PROGRAM_TENANT_BINDING",
  );
});

test("program authorization claim is immutable, KMS encrypted, and contains safe fingerprints only", async () => {
  const fixture = authorizationFixture();
  const authorization = await loadJsonPostgresProgramAuthorization({
    event: event(fixture.packetSha256),
    env: env(fixture.registrySha256),
    s3Client: {},
    readBytes: async ({ locator }) => fixture.bytes.get(locator.key),
    now: Date.parse("2026-07-24T00:00:00.000Z"),
  });
  let command;
  const claimed = await claimJsonPostgresProgramInvocation({
    event: event(fixture.packetSha256),
    authorization,
    env: env(fixture.registrySha256),
    client: { async send(value) { command = value; return {}; } },
    now: Date.parse("2026-07-24T00:00:00.000Z"),
  });
  assert.match(claimed.claim_sha256, /^[0-9a-f]{64}$/u);
  assert.equal(command.input.IfNoneMatch, "*");
  assert.equal(command.input.ServerSideEncryption, "aws:kms");
  assert.equal(command.input.ObjectLockMode, "COMPLIANCE");
  const serialized = command.input.Body.toString("utf8");
  assert.equal(serialized.includes("PRIVATE KEY"), false);
  assert.equal(serialized.includes("approval_signature"), false);
});

test("CUT-010 inputs bind the isolated DR target and performance acceptance to the exact packet", async () => {
  const fixture = authorizationFixture();
  const performance = createJsonPostgresPerformanceAcceptance({
    record_count: 287,
    tenant_count: 1,
    batch_size: 50,
    pool_max: 4,
    statement_timeout_ms: 120_000,
    connection_timeout_ms: 10_000,
    migration_p95_ms: 5_000,
    outbox_lag_p95_ms: 1_000,
    dms_throughput_min_bytes_per_second: 1,
    rpo_target_ms: 60_000,
    rto_target_ms: 900_000,
    rehearsal_result_sha256: "4".repeat(64),
  });
  const exactPacket = {
    ...fixture.value,
    packet_sha256: fixture.packetSha256,
    bindings: {
      ...fixture.value.bindings,
      performance_acceptance_sha256: performance.acceptance_sha256,
    },
  };
  const drTarget = createJsonPostgresDrTarget({
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: fixture.packetSha256,
    cut009_receipt_sha256: "5".repeat(64),
    migration_result_sha256: "6".repeat(64),
    source_database_identifier: "lawos-production-postgres",
    restore_database_identifier: `lawos-production-dr-${SOURCE_SHA.slice(0, 10)}-001`,
    endpoint_address: `lawos-production-dr-${SOURCE_SHA.slice(0, 10)}-001.cluster.ap-northeast-2.rds.amazonaws.com`,
    endpoint_port: 5432,
    database_name: "lawos",
    aws_account: ACCOUNT,
    aws_region: REGION,
    source_latest_restorable_at: "2026-07-24T00:00:00.000Z",
    restore_started_at: "2026-07-24T00:00:30.000Z",
    restore_available_at: "2026-07-24T00:05:00.000Z",
    rpo_ms: 30_000,
    rto_ms: 270_000,
    vpc_sha256: "7".repeat(64),
    subnet_group_sha256: "8".repeat(64),
    security_group_set_sha256: "9".repeat(64),
    kms_key_arn_sha256: "a".repeat(64),
    isolated: true,
    public_access: false,
    deletion_protection: false,
  }, { performanceAcceptance: performance });
  const objects = new Map([
    ["dr-target", drTarget],
    ["performance", performance],
  ]);
  const result = await loadJsonPostgresDrRecoveryInputs({
    inputLocators: {
      dr_target: { key: "dr-target" },
      performance_acceptance: { key: "performance" },
    },
    packet: exactPacket,
    env: env(fixture.registrySha256),
    s3Client: {},
    readJson: async ({ locator }) => objects.get(locator.key),
  });
  assert.equal(result.target.dr_target_sha256, drTarget.dr_target_sha256);
  assert.equal(result.target.rpo_ms, 30_000);
  assert.equal(result.target.rto_ms, 270_000);

  await assert.rejects(
    loadJsonPostgresDrRecoveryInputs({
      inputLocators: {
        dr_target: { key: "dr-target" },
        performance_acceptance: { key: "performance" },
      },
      packet: {
        ...exactPacket,
        bindings: {
          ...exactPacket.bindings,
          performance_acceptance_sha256: "f".repeat(64),
        },
      },
      env: env(fixture.registrySha256),
      s3Client: {},
      readJson: async ({ locator }) => objects.get(locator.key),
    }),
    (error) => error?.code === "LAWOS_PROGRAM_DR_BINDING",
  );
});

test("W12 restore inputs bind the isolated target and performance acceptance to the exact packet", async () => {
  const fixture = authorizationFixture();
  const executionResultSha256 = [
    "1".repeat(64),
    "2".repeat(64),
  ];
  const performance = createJsonPostgresPerformanceAcceptance({
    record_count: 287,
    tenant_count: 1,
    batch_size: 287,
    pool_max: 2,
    statement_timeout_ms: 120_000,
    connection_timeout_ms: 10_000,
    migration_p95_ms: 5_000,
    outbox_lag_p95_ms: 0,
    dms_throughput_min_bytes_per_second: 0,
    rpo_target_ms: 60_000,
    rto_target_ms: 900_000,
    rehearsal_result_sha256: createHash("sha256")
      .update(canonicalizeJson(executionResultSha256))
      .digest("hex"),
  });
  const performanceBudgetSha256 = "4".repeat(64);
  const exactPacket = {
    ...fixture.value,
    phase: "w12-real-data-rehearsal",
    packet_sha256: fixture.packetSha256,
    bindings: {
      ...fixture.value.bindings,
      performance_acceptance_sha256: performanceBudgetSha256,
    },
  };
  const capacityMaterial = {
    schema_version:
      "law-firm-os.json-postgres-rehearsal-capacity-result.v1",
    outcome: "PASS",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: fixture.packetSha256,
    performance_budget_sha256: performanceBudgetSha256,
    execution_result_sha256: executionResultSha256,
    acceptance: performance,
    measured: {
      measurement_count: 2,
      records_per_tenant: 287,
      largest_domain_batch_size: 287,
      materialized_payload_bytes: 10_000,
      migration_p50_ms: 4_000,
      migration_p95_ms: 5_000,
      migration_p99_ms: 5_000,
      retry_count: 0,
      conflict_count: 0,
      pool_total_count: 2,
      pool_waiting_count: 0,
      outbox_lag_p95_ms: 0,
      dms_object_count: 0,
      dms_throughput_applicable: false,
    },
    checks: {
      records_per_tenant_measured: true,
      batch_sizes_measured: true,
      latency_percentiles_measured: true,
      retry_conflict_rate_measured: true,
      connection_pool_saturation_measured: true,
      outbox_lag_measured: true,
      production_limits_derived: true,
      capacity_acceptance_passed: true,
    },
    safe_counts: {
      capacity_acceptance_failure_count: 0,
      dms_unmeasured_object_count: 0,
    },
    claims: {
      production_limit_derived_from_w12: true,
      invented_dms_throughput: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const capacityResult = {
    ...capacityMaterial,
    result_sha256: createHash("sha256")
      .update(canonicalizeJson(capacityMaterial))
      .digest("hex"),
  };
  const restoreTarget = createJsonPostgresRehearsalRestoreTarget({
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: fixture.packetSha256,
    migration_result_sha256: "6".repeat(64),
    source_database_identifier: "lawos-private-staging-postgres",
    restore_database_identifier:
      `lawos-private-rehearsal-restore-${SOURCE_SHA.slice(0, 10)}-001`,
    endpoint_address:
      `lawos-private-rehearsal-restore-${SOURCE_SHA.slice(0, 10)}-001.cluster.ap-northeast-2.rds.amazonaws.com`,
    endpoint_port: 5432,
    database_name: "lawos_rehearsal",
    aws_account: ACCOUNT,
    aws_region: REGION,
    source_latest_restorable_at: "2026-07-24T00:00:00.000Z",
    restore_started_at: "2026-07-24T00:00:30.000Z",
    restore_available_at: "2026-07-24T00:05:00.000Z",
    rpo_ms: 30_000,
    rto_ms: 270_000,
    vpc_sha256: "7".repeat(64),
    subnet_group_sha256: "8".repeat(64),
    security_group_set_sha256: "9".repeat(64),
    kms_key_arn_sha256: "a".repeat(64),
    isolated: true,
    public_access: false,
    deletion_protection: false,
  }, { performanceAcceptance: performance });
  const objects = new Map([
    ["restore-target", restoreTarget],
    ["performance", performance],
    ["capacity", capacityResult],
  ]);
  const result = await loadJsonPostgresRehearsalRestoreInputs({
    inputLocators: {
      restore_target: { key: "restore-target" },
      performance_acceptance: { key: "performance" },
      capacity_result: { key: "capacity" },
    },
    packet: exactPacket,
    env: env(fixture.registrySha256),
    s3Client: {},
    readJson: async ({ locator }) => objects.get(locator.key),
  });
  assert.equal(
    result.target.restore_target_sha256,
    restoreTarget.restore_target_sha256,
  );
  assert.equal(result.target.rpo_ms, 30_000);
  assert.equal(result.target.rto_ms, 270_000);

  await assert.rejects(
    loadJsonPostgresRehearsalRestoreInputs({
      inputLocators: {
        restore_target: { key: "restore-target" },
        performance_acceptance: { key: "performance" },
        capacity_result: { key: "capacity" },
      },
      packet: {
        ...exactPacket,
        bindings: {
          ...exactPacket.bindings,
          performance_acceptance_sha256: "f".repeat(64),
        },
      },
      env: env(fixture.registrySha256),
      s3Client: {},
      readJson: async ({ locator }) => objects.get(locator.key),
    }),
    (error) => error?.code === "LAWOS_PROGRAM_DR_BINDING",
  );
});

test("CUT-011 inputs require only exact signed CUT-009 and CUT-010 PASS receipts", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const trustRegistry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    keys: [{
      key_id: "owner-key-1",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: [JSON_POSTGRES_PROGRAM_RECEIPT_ACTION],
      environments: ["lawos-production"],
      valid_from: "2026-07-23T00:00:00.000Z",
      valid_until: "2026-07-30T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  const packetSha256 = "7".repeat(64);
  const artifactManifestSha256 = "8".repeat(64);
  const claims = (productionWrite) => ({
    real_data_read: true,
    real_data_mutated: productionWrite,
    production_contacted: true,
    production_write: productionWrite,
    first_production_write_started: true,
    json_authority_disabled: false,
    external_email_sent: false,
    dms_bytes_in_evidence: false,
    release: false,
    go_live: false,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  });
  const objects = new Map([[
    "manifest",
    {
      schema_version: "law-firm-os.json-postgres-production-artifact.v2",
      operational_authority: "postgres-v2",
      json_fallback: false,
      json_writer: false,
      dual_write: false,
      file_current_authority: false,
      offline_mutation: false,
      memory_fallback: false,
      artifact_runtime_store_entry_count: 0,
      artifact_real_json_store_count: 0,
      packaged_private_profile_photo_count: 10,
      profile_photo_artifact: PROFILE_PHOTO_ARTIFACT_BINDING,
    },
  ]]);
  for (const [index, kind] of ["cut-009", "cut-010"].entries()) {
    const metadata = jsonPostgresProgramReceiptMetadata(kind);
    const receipt = {
      schema_version: JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
      receipt_id: `${kind}-receipt`,
      receipt_kind: kind,
      phase: metadata.phase,
      environment: metadata.environment,
      profile: metadata.profile,
      signer_key_id: "owner-key-1",
      execution_state: "PASS",
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      packet_sha256: packetSha256,
      bindings_sha256: "9".repeat(64),
      started_at: "2026-07-24T00:00:00.000Z",
      finished_at: "2026-07-24T00:01:00.000Z",
      command: `lawos-stage ${kind}`,
      exit_code: 0,
      predecessor_receipt_sha256: [],
      result_sha256: String(index + 4).repeat(64),
      safe_counts: { verified_item_count: 1 },
      claims: claims(kind === "cut-009"),
    };
    objects.set(`${kind}-receipt`, receipt);
    objects.set(
      `${kind}-signature`,
      sign(null, Buffer.from(canonicalizeJsonPostgresProgramReceipt(receipt)), privateKey),
    );
  }
  const loadRetirement = () => loadJsonPostgresRetirementInputs({
    inputLocators: {
      deployment_manifest: { key: "manifest", sha256: artifactManifestSha256 },
      predecessors: ["cut-009", "cut-010"].map((kind) => ({
        receipt: { key: `${kind}-receipt` },
        signature: { key: `${kind}-signature` },
      })),
    },
    trustRegistry,
    packet: {
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      packet_sha256: packetSha256,
      bindings: { artifact_manifest_sha256: artifactManifestSha256 },
    },
    env: env("e".repeat(64)),
    s3Client: {},
    readJson: async ({ locator }) => objects.get(locator.key),
    readBytes: async ({ locator }) => objects.get(locator.key),
    now: Date.parse("2026-07-24T00:30:00.000Z"),
  });
  const result = await loadRetirement();
  assert.deepEqual(
    result.predecessors.map((item) => item.receipt_kind),
    ["cut-009", "cut-010"],
  );
  assert.equal(result.deploymentManifest.operational_authority, "postgres-v2");
  objects.set("manifest", {
    ...result.deploymentManifest,
    schema_version: "law-firm-os.json-postgres-production-artifact.v1",
  });
  await assert.rejects(
    loadRetirement(),
    (error) => error?.code === "LAWOS_PROGRAM_RETIREMENT_MANIFEST",
  );
  objects.set("manifest", {
    ...result.deploymentManifest,
    profile_photo_artifact: {
      ...result.deploymentManifest.profile_photo_artifact,
      unsupported: "synthetic-only",
    },
  });
  await assert.rejects(
    loadRetirement(),
    (error) => error?.code === "LAWOS_PROGRAM_RETIREMENT_MANIFEST",
  );
});

test("W15 projection inputs require exact signed W12, CUT-012, and go-live predecessor receipts", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const trustRegistry = {
    schema_version: "law-firm-os.runtime-safety.approval-trust-registry.v1",
    keys: [{
      key_id: "owner-key-1",
      algorithm: "Ed25519",
      public_key_spki_pem: publicKey.export({ type: "spki", format: "pem" }),
      roles: ["owner"],
      actions: [JSON_POSTGRES_PROGRAM_RECEIPT_ACTION],
      environments: ["lawos-private-rehearsal", "lawos-production", "lawos-release"],
      valid_from: "2026-07-23T00:00:00.000Z",
      valid_until: "2026-07-30T00:00:00.000Z",
      revoked_at: null,
    }],
  };
  const claims = (kind) => ({
    real_data_read: true,
    real_data_mutated: kind !== "w12-terminal",
    production_contacted: kind !== "w12-terminal",
    production_write: false,
    first_production_write_started: kind !== "w12-terminal",
    json_authority_disabled: ["cut-012", "go-live"].includes(kind),
    external_email_sent: false,
    dms_bytes_in_evidence: false,
    release: kind === "go-live",
    go_live: kind === "go-live",
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  });
  const objects = new Map();
  const bindings = "2".repeat(64);
  const receiptDigests = {};
  for (const [index, kind] of ["w12-terminal", "cut-012", "go-live"].entries()) {
    const metadata = jsonPostgresProgramReceiptMetadata(kind);
    const receipt = {
      schema_version: JSON_POSTGRES_PROGRAM_RECEIPT_VERSION,
      receipt_id: `${kind}-receipt`,
      receipt_kind: kind,
      phase: metadata.phase,
      environment: metadata.environment,
      profile: metadata.profile,
      signer_key_id: "owner-key-1",
      execution_state: "PASS",
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      packet_sha256: String(index + 3).repeat(64),
      bindings_sha256: bindings,
      started_at: "2026-07-24T00:00:00.000Z",
      finished_at: "2026-07-24T00:01:00.000Z",
      command: `lawos-stage ${kind}`,
      exit_code: 0,
      predecessor_receipt_sha256: [],
      result_sha256: String(index + 6).repeat(64),
      safe_counts: { verified_item_count: 1 },
      claims: claims(kind),
    };
    const receiptKey = `${kind}-receipt`;
    const signatureKey = `${kind}-signature`;
    objects.set(receiptKey, receipt);
    objects.set(signatureKey, sign(
      null,
      Buffer.from(canonicalizeJsonPostgresProgramReceipt(receipt)),
      privateKey,
    ));
    receiptDigests[kind] = createHash("sha256")
      .update(canonicalizeJsonPostgresProgramReceipt(receipt))
      .digest("hex");
  }
  const emptyHash = createHash("sha256")
    .update(canonicalizeJson([]))
    .digest("hex");
  const productionInventory = createHrxRelationalProductionInventory({
    tenantCount: 1,
    inventoryProvenanceSha256: "9".repeat(64),
    outboxEventCount: 1,
    outboxLagMs: 0,
    referenceCount: 0,
    tables: HRX_STORE_TABLES.map((table) => ({
      table_name: table,
      source_count: table === "hrx_employees" ? 1 : 0,
      source_hash: table === "hrx_employees" ? "1".repeat(64) : emptyHash,
      state_version_min: table === "hrx_employees" ? 1 : 0,
      state_version_max: table === "hrx_employees" ? 1 : 0,
      payload_bytes_p50: table === "hrx_employees" ? 128 : 0,
      payload_bytes_p95: table === "hrx_employees" ? 128 : 0,
      payload_bytes_max: table === "hrx_employees" ? 128 : 0,
      soft_deleted_count: 0,
      append_only_count: 0,
      reference_count: 0,
      json_path_presence_sha256: emptyHash,
      json_path_null_ratio_sha256: emptyHash,
      unmapped_nonnull_field_count: 0,
      primary_key_conflict_count: 0,
      foreign_key_conflict_count: 0,
      inventory_classification:
        table === "hrx_employees" ? "populated" : "schema_only",
    })),
  });
  const performanceAcceptance = createJsonPostgresPerformanceAcceptance({
    record_count: 1,
    tenant_count: 1,
    batch_size: 1,
    pool_max: 2,
    statement_timeout_ms: 120_000,
    connection_timeout_ms: 10_000,
    migration_p95_ms: 120_000,
    outbox_lag_p95_ms: 120_000,
    dms_throughput_min_bytes_per_second: 0,
    rpo_target_ms: 300_000,
    rto_target_ms: 3_600_000,
    rehearsal_result_sha256: "2".repeat(64),
  });
  const mappingManifest = createHrxRelationalMappingManifest({
    schema: {
      columns: HRX_STORE_TABLES.flatMap((table) =>
        [...new Set([
          ...HRX_TABLE_PRIMARY_KEYS[table],
          ...(W15_TRANSFORM_TARGET_COLUMNS[table] ?? []),
          "lawos_projection_deleted_at",
        ])]
          .map((column, index) => ({
            table_name: table,
            column_name: column,
            ordinal_position: index + 1,
            is_nullable: column === "lawos_projection_deleted_at" ? "YES" : "NO",
            data_type: column === "lawos_projection_deleted_at"
              ? "timestamp with time zone"
              : "text",
            column_default: null,
          }))),
      foreign_keys: [],
    },
    inventory: productionInventory,
    performanceAcceptanceSha256: performanceAcceptance.acceptance_sha256,
  });
  objects.set("mapping-manifest", mappingManifest);
  objects.set("production-inventory", productionInventory);
  objects.set("performance-acceptance", performanceAcceptance);
  const validationMaterial = {
    schema_version: "law-firm-os.hrx-relational-projection-validation.v2",
    outcome: "PASS",
    source_authority: "postgres-v2-generic-ledger",
    projection_authority: "read-only",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: "9".repeat(64),
    mapping_manifest_sha256: mappingManifest.manifest_sha256,
    inventory_sha256: productionInventory.inventory_sha256,
    performance_acceptance_sha256:
      performanceAcceptance.acceptance_sha256,
    table_observations: HRX_STORE_TABLES.map((table_name) => ({
      table_name,
    })),
    safe_counts: {
      mapping_inventory_difference_count: 0,
      projection_state_difference_count: 0,
      shadow_difference_count: 0,
      logical_reference_failure_count: 0,
      unknown_nonnull_field_count: 0,
      tenant_negative_visible_count: 0,
      cursor_backlog_count: 0,
      cursor_regression_count: 0,
      transaction_rollback_failure_count: 0,
      append_only_guard_failure_count: 0,
      physical_delete_guard_failure_count: 0,
      source_authority_write_grant_count: 0,
      consumer_write_grant_count: 0,
      auditor_write_grant_count: 0,
      projection_authority_promotion_count: 0,
      receipt_verification_failure_count: 0,
    },
    claims: {
      observations_collected_by_read_only_auditor: true,
      selected_table_contract_verified: true,
      shadow_count_hash_ordering_passed: true,
      logical_reference_readback_passed: true,
      projection_performance_accepted: true,
      tenant_rls_passed: true,
      transaction_rollback_passed: true,
      append_only_conflict_guard_passed: true,
      physical_delete_guard_passed: true,
      projection_consumers_read_only: true,
      generic_ledger_authority_preserved: true,
      authority_promotion_not_granted: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const validationEvidence = {
    ...validationMaterial,
    result_sha256: createHash("sha256")
      .update(canonicalizeJson(validationMaterial))
      .digest("hex"),
  };
  objects.set("validation-evidence", validationEvidence);
  const locators = {
    predecessors: ["w12-terminal", "cut-012", "go-live"].map((kind) => ({
      receipt: { key: `${kind}-receipt` },
      signature: { key: `${kind}-signature` },
    })),
    mapping_manifest: { key: "mapping-manifest" },
    production_inventory: { key: "production-inventory" },
    performance_acceptance: { key: "performance-acceptance" },
    validation_evidence: { key: "validation-evidence" },
  };
  const projectionPacket = {
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: "9".repeat(64),
    bindings: {
      w12_terminal_receipt_sha256: receiptDigests["w12-terminal"],
      cut012_terminal_receipt_sha256: receiptDigests["cut-012"],
      go_live_receipt_sha256: receiptDigests["go-live"],
      field_crosswalk_sha256: mappingManifest.manifest_sha256,
      record_type_catalog_sha256:
        mappingManifest.record_type_catalog_sha256,
      migration_catalog_sha256: mappingManifest.migration_catalog_sha256,
      inventory_content_sha256: productionInventory.inventory_sha256,
      performance_acceptance_sha256:
        performanceAcceptance.acceptance_sha256,
    },
  };
  const result = await loadJsonPostgresProjectionInputs({
    inputLocators: locators,
    trustRegistry,
    packet: projectionPacket,
    env: env("e".repeat(64)),
    s3Client: {},
    readJson: async ({ locator }) => objects.get(locator.key),
    readBytes: async ({ locator }) => objects.get(locator.key),
    now: Date.parse("2026-07-24T00:30:00.000Z"),
  });
  assert.deepEqual(result.predecessors.map((item) => item.receipt_kind), [
    "w12-terminal",
    "cut-012",
    "go-live",
  ]);
  assert.equal(
    result.validationEvidence.result_sha256,
    validationEvidence.result_sha256,
  );
  const schemaBootstrapMaterial = {
    schema_version:
      "law-firm-os.json-postgres-w15-inventory-schema-bootstrap.v1",
    outcome: "PASS",
    action: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
    phase: "w15-inventory-bootstrap",
    mode: "schema-bootstrap",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: projectionPacket.packet_sha256,
    migration_catalog_sha256:
      projectionPacket.bindings.migration_catalog_sha256,
    predecessor_receipt_count: 3,
    safe_counts: {
      approved_tenant_count: 1,
      migration_count: 49,
      migration_applied_count: 38,
      projection_role_grant_count: 24,
      consumer_write_grant_count: 0,
      auditor_write_grant_count: 0,
      projection_data_write_count: 0,
      source_authority_write_count: 0,
      consumer_route_change_count: 0,
    },
    claims: {
      generic_ledger_authority_preserved: true,
      schema_and_role_bootstrap_only: true,
      projection_data_written: false,
      consumer_rollout_performed: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const schemaBootstrapResult = {
    ...schemaBootstrapMaterial,
    result_sha256: createHash("sha256")
      .update(canonicalizeJson(schemaBootstrapMaterial))
      .digest("hex"),
  };
  objects.set("schema-bootstrap-result", schemaBootstrapResult);
  const bootstrapInputs = await loadJsonPostgresW15BootstrapInputs({
    inputLocators: {
      predecessors: locators.predecessors,
      schema_bootstrap_result: { key: "schema-bootstrap-result" },
    },
    trustRegistry,
    packet: projectionPacket,
    mode: "inventory-read",
    schemaBootstrapResultSha256: schemaBootstrapResult.result_sha256,
    env: env("e".repeat(64)),
    s3Client: {},
    readJson: async ({ locator }) => objects.get(locator.key),
    readBytes: async ({ locator }) => objects.get(locator.key),
    now: Date.parse("2026-07-24T00:30:00.000Z"),
  });
  assert.equal(
    bootstrapInputs.schemaBootstrapResult.result_sha256,
    schemaBootstrapResult.result_sha256,
  );
  objects.set("schema-bootstrap-result", {
    ...schemaBootstrapResult,
    safe_counts: {
      ...schemaBootstrapResult.safe_counts,
      projection_data_write_count: 1,
    },
  });
  await assert.rejects(
    loadJsonPostgresW15BootstrapInputs({
      inputLocators: {
        predecessors: locators.predecessors,
        schema_bootstrap_result: { key: "schema-bootstrap-result" },
      },
      trustRegistry,
      packet: projectionPacket,
      mode: "inventory-read",
      schemaBootstrapResultSha256:
        schemaBootstrapResult.result_sha256,
      env: env("e".repeat(64)),
      s3Client: {},
      readJson: async ({ locator }) => objects.get(locator.key),
      readBytes: async ({ locator }) => objects.get(locator.key),
      now: Date.parse("2026-07-24T00:30:00.000Z"),
    }),
    (error) => error?.code === "LAWOS_PROGRAM_PREDECESSOR",
  );
  objects.set("schema-bootstrap-result", schemaBootstrapResult);
  const failedValidationMaterial = {
    ...validationMaterial,
    outcome: "FAIL",
  };
  objects.set("validation-evidence", {
    ...failedValidationMaterial,
    result_sha256: createHash("sha256")
      .update(canonicalizeJson(failedValidationMaterial))
      .digest("hex"),
  });
  await assert.rejects(
    loadJsonPostgresProjectionInputs({
      inputLocators: locators,
      trustRegistry,
      packet: projectionPacket,
      env: env("e".repeat(64)),
      s3Client: {},
      readJson: async ({ locator }) => objects.get(locator.key),
      readBytes: async ({ locator }) => objects.get(locator.key),
      now: Date.parse("2026-07-24T00:30:00.000Z"),
    }),
    (error) => error?.code === "LAWOS_PROGRAM_INPUT_BINDING",
  );
  objects.set("validation-evidence", validationEvidence);
  await assert.rejects(
    loadJsonPostgresProjectionInputs({
      inputLocators: locators,
      trustRegistry,
      packet: {
        bindings: {
          ...projectionPacket.bindings,
          go_live_receipt_sha256: "f".repeat(64),
        },
      },
      env: env("e".repeat(64)),
      s3Client: {},
      readJson: async ({ locator }) => objects.get(locator.key),
      readBytes: async ({ locator }) => objects.get(locator.key),
      now: Date.parse("2026-07-24T00:30:00.000Z"),
    }),
    (error) => error?.code === "LAWOS_PROGRAM_PREDECESSOR",
  );
});
