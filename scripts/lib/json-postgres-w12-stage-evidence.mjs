import { createHash } from "node:crypto";
import {
  validateJsonPostgresSourceTransformResult,
} from "../../apps/api/src/json-postgres-source-transform.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  createJsonPostgresProgramStageEvidence,
  jsonPostgresProgramStageEvidenceRequirements,
} from "../../packages/persistence/src/postgres/program-stage-evidence.js";
import {
  validateJsonPostgresRehearsalCapacityResult,
} from "../../packages/persistence/src/postgres/rehearsal-capacity-result.js";
import {
  validateJsonPostgresRecordTypeCatalog,
} from "../../packages/persistence/src/postgres/record-type-catalog.js";
import {
  validateJsonPostgresRecordAuthorityBinding,
} from "../../packages/persistence/src/postgres/source-adjudication.js";
import {
  deriveJsonPostgresInventoryContentSha256,
} from "../../packages/persistence/src/postgres/source-inventory.js";
import {
  jsonPostgresRehearsalResultSha256,
} from "./json-postgres-rehearsal-execution.mjs";
import {
  validateJsonPostgresRehearsalExecutionEvidence,
  validateJsonPostgresRehearsalValidationEvidence,
} from "./json-postgres-rehearsal-program.mjs";
import {
  validateJsonPostgresRehearsalSinkResult,
} from "./json-postgres-rehearsal-sink.mjs";
import {
  validateJsonPostgresRehearsalDmsControlResult,
} from "./json-postgres-rehearsal-dms-controls.mjs";
import {
  validateJsonPostgresW12ComponentReceiptSet,
} from "./json-postgres-w12-component-receipt-set.mjs";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const EXPECTED_PRODUCT_DOMAIN_COUNT = 12;

function fail(message) {
  throw new Error(message);
}

function digest(value) {
  return createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : canonicalizeJson(value))
    .digest("hex");
}

function exactInteger(value, label, { minimum = 0 } = {}) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    fail(`${label} is invalid`);
  }
  return value;
}

function exactDigest(value, label) {
  if (!SHA256.test(value ?? "")) fail(`${label} is invalid`);
  return value;
}

function exactSource(value, label) {
  if (!SHA1.test(value ?? "")) fail(`${label} is invalid`);
  return value;
}

function parseArtifacts(sourceArtifacts, requirements) {
  if (!Array.isArray(sourceArtifacts)
    || JSON.stringify(sourceArtifacts.map((item) => item?.kind))
      !== JSON.stringify(requirements.artifact_kinds)) {
    fail("W12 stage source artifacts are incomplete or out of order");
  }
  const parsed = new Map();
  const bindings = [];
  for (const artifact of sourceArtifacts) {
    if (!Buffer.isBuffer(artifact.bytes)
      || artifact.bytes.byteLength < 2
      || artifact.bytes.byteLength > 128 * 1024 * 1024) {
      fail(`W12 ${artifact.kind} source artifact bytes are invalid`);
    }
    let value;
    try {
      value = JSON.parse(artifact.bytes);
    } catch {
      fail(`W12 ${artifact.kind} source artifact is not JSON`);
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail(`W12 ${artifact.kind} source artifact must be an object`);
    }
    parsed.set(artifact.kind, value);
    bindings.push(Object.freeze({
      kind: artifact.kind,
      sha256: digest(artifact.bytes),
    }));
  }
  return Object.freeze({
    parsed,
    bindings: Object.freeze(bindings),
  });
}

function exactPacketBinding(packet, key, value) {
  if (packet?.bindings?.[key] !== value) {
    fail(`W12 ${key} binding drifted`);
  }
}

function assertNoSensitiveClaims(value, label) {
  const claims = value?.claims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)
    || claims.raw_value_returned !== false
    || claims.pii_returned !== false
    || claims.secret_material_returned !== false) {
    fail(`${label} safety claims failed`);
  }
}

function authorityBundleMaterial(summary) {
  const keys = [
    "schema_version",
    "decision_set_ref",
    "outcome",
    "ready_for_owner_signature",
    "inventory_content_sha256",
    "record_type_catalog_sha256",
    "record_authority_sha256",
    "field_crosswalk_sha256",
    "authority_manifest_sha256",
    "migration_manifest_sha256",
    "transform_sha256",
    "source_transform_plan_sha256",
    "migration_invariant_hash",
    "reconciliation_sha256",
    "inventory_delta_policy_sha256",
    "inventory_delta_sha256",
    "safe_counts",
    "claims",
  ];
  return Object.fromEntries(keys.map((key) => [key, summary[key]]));
}

function crosswalkMaterial(crosswalk) {
  return {
    schema_version: crosswalk.schema_version,
    inventory_content_sha256: crosswalk.inventory_content_sha256,
    record_type_catalog_sha256: crosswalk.record_type_catalog_sha256,
    fields: crosswalk.fields,
    counts: crosswalk.counts,
    claims: crosswalk.claims,
  };
}

function reconciliationMaterial(reconciliation) {
  const {
    reconciliation_sha256: ignored,
    ...material
  } = reconciliation;
  return material;
}

function allChecks(requirements) {
  return Object.freeze(Object.fromEntries(
    requirements.check_keys.map((key) => [key, true]),
  ));
}

function zeroCounts(requirements, additions = {}) {
  return Object.freeze({
    ...Object.fromEntries(
      requirements.zero_count_keys.map((key) => [key, 0]),
    ),
    monthly_cost_forecast_krw: 0,
    ...additions,
  });
}

function deriveSourceInventoryStage({ packet, artifacts, requirements }) {
  const inventory = artifacts.get("source-inventory");
  const authority = artifacts.get("authority-decisions");
  const summary = artifacts.get("authority-bundle");
  const inventoryDigest =
    deriveJsonPostgresInventoryContentSha256(inventory);
  if (inventory.inventory_content_sha256 !== inventoryDigest) {
    fail("W12 normalized source inventory digest drifted");
  }
  exactPacketBinding(
    packet,
    "inventory_content_sha256",
    inventory.inventory_content_sha256,
  );
  validateJsonPostgresRecordAuthorityBinding(authority, { inventory });
  exactPacketBinding(
    packet,
    "record_authority_sha256",
    authority.authority_sha256,
  );
  if (summary?.schema_version
      !== "law-firm-os.json-postgres-authority-bundle.v2"
    || summary.outcome !== "READY_FOR_OWNER_SIGNATURE"
    || summary.ready_for_owner_signature !== true
    || summary.source_sha !== packet.source_sha
    || summary.source_tree !== packet.source_tree
    || summary.inventory_content_sha256
      !== inventory.inventory_content_sha256
    || summary.record_authority_sha256 !== authority.authority_sha256
    || digest(authorityBundleMaterial(summary)) !== summary.bundle_sha256) {
    fail("W12 authority bundle summary failed or drifted");
  }
  exactPacketBinding(
    packet,
    "authority_bundle_sha256",
    summary.bundle_sha256,
  );
  const authorityCounts = authority.safe_counts ?? {};
  const summaryCounts = summary.safe_counts ?? {};
  const unsafeIdentityDecisionCount = (authority.identity_decisions ?? [])
    .filter((decision) => (
      decision.account_status !== "disabled"
      || decision.roster_link_status !== "pending-roster-link"
      || decision.login_allowed !== false
      || decision.password_setup_allowed !== false
      || decision.authorization_allowed !== false
    ))
    .length;
  const requiredZeros = [
    summaryCounts.unresolved_source_count,
    authorityCounts.residual_record_count,
    authorityCounts.duplicate_email_count,
    authorityCounts.duplicate_matter_code_count,
    summaryCounts.inventory_delta_review_count,
    unsafeIdentityDecisionCount,
  ];
  if (requiredZeros.some((value) => value !== 0)
    || inventory.sources?.length !== authorityCounts.source_count
    || authorityCounts.source_count !== summaryCounts.source_count
    || authority.claims?.authority_decision_final !== true
    || authority.claims?.authority_selected_by_mtime !== false
    || authority.claims?.source_mutated !== false
    || summary.claims?.real_data_mutated !== false
    || summary.claims?.production_contacted !== false) {
    fail("W12 source authority adjudication is incomplete");
  }
  assertNoSensitiveClaims(authority, "W12 record authority");
  assertNoSensitiveClaims(summary, "W12 authority bundle");
  return Object.freeze({
    checks: allChecks(requirements),
    safeCounts: zeroCounts(requirements, {
      source_count: authorityCounts.source_count,
      authoritative_source_count:
        authorityCounts.authoritative_source_count,
      superseded_source_count:
        authorityCounts.superseded_source_count,
      duplicate_source_count: authorityCounts.duplicate_source_count,
      preserved_disabled_identity_count:
        authorityCounts.identity_decision_count,
    }),
  });
}

function deriveRecordTypeStage({ packet, artifacts, requirements }) {
  const catalog = artifacts.get("record-type-catalog");
  const crosswalk = artifacts.get("field-crosswalk");
  const transform = artifacts.get("source-transform");
  const reconciliation =
    artifacts.get("logical-reference-reconciliation");
  const catalogValidation = validateJsonPostgresRecordTypeCatalog(catalog);
  exactPacketBinding(packet, "record_type_catalog_sha256",
    catalogValidation.catalog_sha256);
  if (crosswalk?.schema_version
      !== "law-firm-os.json-postgres-field-crosswalk.v1"
    || !Array.isArray(crosswalk.fields)
    || digest(crosswalkMaterial(crosswalk))
      !== crosswalk.field_crosswalk_sha256
    || crosswalk.record_type_catalog_sha256 !== catalog.catalog_sha256
    || crosswalk.claims?.silent_drop_count !== 0) {
    fail("W12 field crosswalk failed or drifted");
  }
  assertNoSensitiveClaims(crosswalk, "W12 field crosswalk");
  exactPacketBinding(
    packet,
    "field_crosswalk_sha256",
    crosswalk.field_crosswalk_sha256,
  );
  validateJsonPostgresSourceTransformResult(transform);
  if (transform.source_sha !== packet.source_sha
    || transform.source_tree !== packet.source_tree
    || transform.inventory_content_sha256
      !== crosswalk.inventory_content_sha256) {
    fail("W12 source transform exact binding drifted");
  }
  exactPacketBinding(packet, "migration_manifest_sha256",
    transform.migration_manifest_sha256);
  if (reconciliation?.schema_version
      !== "law-firm-os.json-postgres-reconciliation.v1"
    || reconciliation.outcome !== "PASS"
    || reconciliation.catalog_sha256 !== catalog.catalog_sha256
    || digest(reconciliationMaterial(reconciliation))
      !== reconciliation.reconciliation_sha256) {
    fail("W12 logical-reference reconciliation failed or drifted");
  }
  assertNoSensitiveClaims(reconciliation, "W12 reconciliation");
  const transformCounts = transform.safe_counts ?? {};
  const reconciliationCounts = reconciliation.safe_counts ?? {};
  const mappedFieldCount = Object.values(crosswalk.counts ?? {})
    .reduce((total, value) => total + exactInteger(
      value,
      "W12 crosswalk disposition count",
    ), 0);
  if (mappedFieldCount !== crosswalk.fields.length
    || transformCounts.verified_source_count
      !== transformCounts.inventory_source_count
    || transformCounts.parsed_authoritative_source_count
      !== transformCounts.authoritative_source_count
    || transformCounts.domain_count !== EXPECTED_PRODUCT_DOMAIN_COUNT
    || transformCounts.roster_gap_count !== 0
    || transformCounts.duplicate_email_count !== 0
    || transformCounts.duplicate_matter_code_count !== 0
    || transformCounts.missing_required_reference_count !== 0
    || transformCounts.rejected_item_count !== 0
    || reconciliationCounts.blocking_count !== 0
    || reconciliationCounts.unapproved_record_type_count !== 0
    || reconciliationCounts.field_type_drift_count !== 0
    || reconciliationCounts.reference_rule_drift_count !== 0
    || reconciliationCounts.unique_key_drift_count !== 0
    || reconciliationCounts.employee_without_link_count !== 0
    || reconciliationCounts.link_without_employee_count !== 0
    || reconciliationCounts.link_without_account_count !== 0) {
    fail("W12 record-type or logical-reference contract is incomplete");
  }
  return Object.freeze({
    checks: allChecks(requirements),
    safeCounts: zeroCounts(requirements, {
      record_type_count: catalog.entries.length,
      mapped_field_count: mappedFieldCount,
      selected_source_count: transformCounts.authoritative_source_count,
      transformed_record_count: transformCounts.record_count,
      product_domain_count: transformCounts.domain_count,
    }),
  });
}

function validateInfrastructureResult(value, packet, operation) {
  if (value?.schema_version
      !== "law-firm-os.json-postgres-rehearsal-infrastructure-result.v1"
    || value.operation !== operation
    || value.outcome !== "PASS"
    || value.source_sha !== packet.source_sha
    || value.source_tree !== packet.source_tree
    || value.packet_sha256 !== packet.packet_sha256
    || jsonPostgresRehearsalResultSha256(value) !== value.result_sha256
    || value.raw_pii_evidence_count !== 0
    || value.secret_material_recorded !== false) {
    fail(`W12 ${operation} infrastructure result failed or drifted`);
  }
  return value;
}

function deriveInfrastructureStage({ packet, artifacts, requirements }) {
  const target = validateInfrastructureResult(
    artifacts.get("rehearsal-target-state"),
    packet,
    "deploy",
  );
  const database = validateInfrastructureResult(
    artifacts.get("database-security-state"),
    packet,
    "preflight",
  );
  const backup = validateInfrastructureResult(
    artifacts.get("backup-target-state"),
    packet,
    "deploy",
  );
  if (target.result_sha256 !== backup.result_sha256
    || database.protected_resource_fingerprint
      !== target.protected_resource_fingerprint
    || database.rds?.private_rds_count !== 1
    || database.rds?.public_rds_count !== 0
    || database.rds?.pitr_enabled_count !== 1
    || target.host_stack_status !== "UPDATE_COMPLETE"
    || target.lambda?.active_successful_count !== 1
    || target.lambda?.vpc_attached_count !== 1
    || target.lambda?.external_email_authority_count !== 0
    || target.lambda?.legacy_environment_key_count !== 0
    || target.program_input_bucket?.versioning_enabled !== true
    || target.program_input_bucket?.public_access_blocked !== true
    || target.program_input_bucket?.object_lock_enabled !== true
    || target.program_input_bucket?.sse_kms_enabled !== true
    || target.dms_bucket?.versioning_enabled !== true
    || target.dms_bucket?.public_access_blocked !== true
    || target.dms_bucket?.object_lock_enabled !== true
    || target.dms_bucket?.sse_kms_enabled !== true
    || target.temporary_eni_allow_count !== 0
    || target.source_function_explicit_deny_count !== 3
    || target.postgres_mutation_count !== 0
    || target.real_data_read_count !== 0
    || target.real_data_mutation_count !== 0
    || target.external_email_send_count !== 0) {
    fail("W12 isolated infrastructure controls failed");
  }
  const forecast = exactInteger(
    target.monthly_forecast_krw,
    "W12 infrastructure monthly forecast",
  );
  if (forecast > packet.target.monthly_cost_ceiling_krw
    || target.monthly_cost_ceiling_krw
      !== packet.target.monthly_cost_ceiling_krw) {
    fail("W12 infrastructure forecast exceeds the approved ceiling");
  }
  return Object.freeze({
    checks: allChecks(requirements),
    safeCounts: zeroCounts(requirements, {
      monthly_cost_forecast_krw: forecast,
      private_rds_count: database.rds.private_rds_count,
      immutable_bucket_count: 2,
      source_function_explicit_deny_count:
        target.source_function_explicit_deny_count,
    }),
  });
}

function deriveSinkStage({ packet, artifacts, requirements }) {
  const values = requirements.artifact_kinds.map((kind) =>
    artifacts.get(kind));
  const [result] = values;
  if (values.some((value) =>
    value.result_sha256 !== result.result_sha256)) {
    fail("W12 sink artifacts do not bind the same inspected state");
  }
  validateJsonPostgresRehearsalSinkResult(result, { packet });
  return Object.freeze({
    checks: Object.freeze({ ...result.checks }),
    safeCounts: zeroCounts(requirements, {
      inspected_policy_count:
        result.safe_counts.inspected_policy_count,
      denied_action_count: result.safe_counts.denied_action_count,
    }),
  });
}

const LEGACY_AUTHORITY_COUNT_KEYS = Object.freeze([
  "json_fallback_count",
  "json_writer_count",
  "dual_write_count",
  "file_current_authority_count",
  "offline_mutation_count",
  "memory_fallback_count",
]);

function validateExecutionEvidence(value, packet, mode) {
  validateJsonPostgresRehearsalExecutionEvidence(value, {
    packet,
    mode,
    response: { result_sha256: value?.result_sha256 },
  });
  if (value.safe_counts?.source_record_count
      !== value.safe_counts?.accepted_record_count
        + value.safe_counts?.rejected_record_count
    || value.safe_counts?.rejected_item_count
      !== value.safe_counts?.rejected_record_count
    || value.safe_counts?.logical_reference_missing_count !== 0
    || value.safe_counts?.tenant_negative_visible_count !== 0
    || LEGACY_AUTHORITY_COUNT_KEYS.some((key) =>
      value.safe_counts?.[key] !== 0)
    || value.safe_counts?.dms_unexpected_rejection_count !== 0
    || value.safe_counts?.dms_tenant_negative_visible_count !== 0
    || !SHA256.test(value.invariant_hash ?? "")
    || !SHA256.test(value.ledger_invariant_hash ?? "")
    || !SHA256.test(value.dms_invariant_hash ?? "")
    || !SHA256.test(value.dms_result_sha256 ?? "")) {
    fail(`W12 ${mode} execution evidence invariants failed`);
  }
  return value;
}

function equalExecutionCounts(left, right, keys) {
  return keys.every((key) =>
    left.safe_counts?.[key] === right.safe_counts?.[key]);
}

const STABLE_EXECUTION_COUNTS = Object.freeze([
  "account_count",
  "domain_count",
  "source_record_count",
  "accepted_record_count",
  "rejected_record_count",
  "rejected_item_count",
  "directory_idempotency_count",
  "directory_audit_count",
  "directory_outbox_count",
  "domain_idempotency_count",
  "domain_audit_count",
  "domain_outbox_count",
  "dms_source_object_count",
  "dms_verified_object_count",
  "dms_provider_version_count",
  "dms_retention_verified_count",
  "dms_legal_hold_verified_count",
]);

function deriveMigrationStage({ packet, artifacts, requirements }) {
  const committed = validateExecutionEvidence(
    artifacts.get("execution-result"),
    packet,
    "commit",
  );
  const readback = validateExecutionEvidence(
    artifacts.get("database-readback"),
    packet,
    "readback",
  );
  const dms = validateExecutionEvidence(
    artifacts.get("dms-migration-result"),
    packet,
    "commit",
  );
  if (committed.result_sha256 !== dms.result_sha256
    || committed.claims.database_write !== true
    || committed.claims.production_write !== false
    || readback.claims.database_write !== false
    || readback.claims.production_write !== false
    || committed.first_write_state !== "NOT_PRODUCTION"
    || readback.first_write_state !== "NOT_PRODUCTION"
    || !committed.checkpoint
    || committed.invariant_hash !== readback.invariant_hash
    || committed.ledger_invariant_hash
      !== readback.ledger_invariant_hash
    || committed.dms_invariant_hash !== readback.dms_invariant_hash
    || !equalExecutionCounts(
      committed,
      readback,
      STABLE_EXECUTION_COUNTS,
    )
    || committed.safe_counts.domain_count
      !== EXPECTED_PRODUCT_DOMAIN_COUNT
    || committed.safe_counts.account_count < 1
    || committed.safe_counts.accepted_record_count < 1
    || committed.safe_counts.unexpected_rejection_count > 0
    || committed.safe_counts.dms_source_object_count !== 0
    || committed.safe_counts.dms_verified_object_count !== 0) {
    fail("W12 migration and complete readback evidence diverged");
  }
  return Object.freeze({
    checks: allChecks(requirements),
    safeCounts: zeroCounts(requirements, {
      accepted_record_count:
        committed.safe_counts.accepted_record_count,
      account_count: committed.safe_counts.account_count,
      product_domain_count: committed.safe_counts.domain_count,
      expected_rejection_count:
        committed.safe_counts.rejected_item_count,
      dms_metadata_domain_count: 1,
      dms_source_object_count:
        committed.safe_counts.dms_source_object_count,
    }),
  });
}

function deriveReplayStage({ packet, artifacts, requirements }) {
  const first = validateExecutionEvidence(
    artifacts.get("first-execution-result"),
    packet,
    "commit",
  );
  const replayValue = artifacts.get("replay-execution-result");
  if (!["commit", "resume"].includes(replayValue?.mode)) {
    fail("W12 replay execution mode is invalid");
  }
  const replay = validateExecutionEvidence(
    replayValue,
    packet,
    replayValue.mode,
  );
  const readback = validateExecutionEvidence(
    artifacts.get("stability-readback"),
    packet,
    "readback",
  );
  if (first.invariant_hash !== replay.invariant_hash
    || first.invariant_hash !== readback.invariant_hash
    || first.ledger_invariant_hash !== replay.ledger_invariant_hash
    || first.ledger_invariant_hash !== readback.ledger_invariant_hash
    || first.dms_invariant_hash !== replay.dms_invariant_hash
    || first.dms_invariant_hash !== readback.dms_invariant_hash
    || !equalExecutionCounts(first, replay, STABLE_EXECUTION_COUNTS)
    || !equalExecutionCounts(first, readback, STABLE_EXECUTION_COUNTS)
    || replay.claims.database_write !== true
    || readback.claims.database_write !== false
    || replay.safe_counts.directory_audit_count
      !== first.safe_counts.directory_audit_count
    || replay.safe_counts.domain_audit_count
      !== first.safe_counts.domain_audit_count
    || replay.safe_counts.directory_outbox_count
      !== first.safe_counts.directory_outbox_count
    || replay.safe_counts.domain_outbox_count
      !== first.safe_counts.domain_outbox_count) {
    fail("W12 replay changed durable PostgreSQL state");
  }
  return Object.freeze({
    checks: allChecks(requirements),
    safeCounts: zeroCounts(requirements, {
      stable_record_count: first.safe_counts.accepted_record_count,
      stable_audit_count:
        first.safe_counts.directory_audit_count
        + first.safe_counts.domain_audit_count,
      stable_outbox_count:
        first.safe_counts.directory_outbox_count
        + first.safe_counts.domain_outbox_count,
      stable_idempotency_count:
        first.safe_counts.directory_idempotency_count
        + first.safe_counts.domain_idempotency_count,
    }),
  });
}

function validateFailureEvidence(value, packet) {
  validateJsonPostgresRehearsalValidationEvidence(value, {
    packet,
    validationKind: "failure-injection",
    response: {
      rehearsal_validation_result_sha256: value?.result_sha256,
    },
  });
  return value;
}

function deriveTenantRlsStage({ packet, artifacts, requirements }) {
  const readback = validateExecutionEvidence(
    artifacts.get("rls-negative-read"),
    packet,
    "readback",
  );
  const write = validateFailureEvidence(
    artifacts.get("rls-negative-write"),
    packet,
  );
  const transaction = validateFailureEvidence(
    artifacts.get("cross-tenant-transaction"),
    packet,
  );
  if (write.result_sha256 !== transaction.result_sha256
    || readback.safe_counts.tenant_negative_visible_count !== 0
    || write.safe_counts.cross_tenant_write_count !== 0
    || write.checks.cross_tenant_transaction_denied !== true
    || write.checks.transaction_rollback_verified !== true) {
    fail("W12 tenant RLS negative evidence failed");
  }
  return Object.freeze({
    checks: allChecks(requirements),
    safeCounts: zeroCounts(requirements, {
      denied_read_probe_count: 1,
      denied_write_probe_count: 1,
      denied_cross_tenant_transaction_count: 1,
    }),
  });
}

function deriveFailureInjectionStage({
  packet,
  artifacts,
  requirements,
}) {
  const transaction = validateFailureEvidence(
    artifacts.get("transaction-faults"),
    packet,
  );
  const checkpoint = artifacts.get("checkpoint-resume");
  if (!["commit", "resume"].includes(checkpoint?.mode)) {
    fail("W12 checkpoint-resume evidence mode is invalid");
  }
  const resumed = validateExecutionEvidence(
    checkpoint,
    packet,
    checkpoint.mode,
  );
  const dms = artifacts.get("dms-provider-fault");
  validateJsonPostgresRehearsalDmsControlResult(dms, { packet });
  const outbox = validateFailureEvidence(
    artifacts.get("outbox-fault"),
    packet,
  );
  if (transaction.result_sha256 !== outbox.result_sha256
    || transaction.checks.transaction_rollback_verified !== true
    || transaction.checks.partial_commit_prevented !== true
    || transaction.checks.optimistic_conflict_verified !== true
    || transaction.checks.outbox_atomicity_verified !== true
    || transaction.safe_counts.partial_commit_count !== 0
    || transaction.safe_counts.residual_probe_record_count !== 0
    || transaction.safe_counts.residual_probe_audit_count !== 0
    || transaction.safe_counts.residual_probe_outbox_count !== 0
    || transaction.claims.source_mutated !== false
    || !resumed.checkpoint
    || dms.checks.provider_failure_atomicity_verified !== true) {
    fail("W12 failure-injection evidence failed");
  }
  return Object.freeze({
    checks: allChecks(requirements),
    safeCounts: zeroCounts(requirements, {
      injected_fault_count:
        transaction.safe_counts.injected_fault_count,
      retry_attempt_count:
        transaction.safe_counts.retry_attempt_count,
      checkpoint_completed_step_count:
        resumed.checkpoint.completed_steps?.length ?? 0,
      dms_governance_test_file_count:
        dms.safe_counts.dms_governance_test_file_count,
    }),
  });
}

function deriveDmsStage({ packet, artifacts, requirements }) {
  const execution = validateExecutionEvidence(
    artifacts.get("dms-migration-result"),
    packet,
    artifacts.get("dms-migration-result")?.mode,
  );
  const governance = artifacts.get("dms-governance-readback");
  const negative = artifacts.get("dms-delete-negative");
  validateJsonPostgresRehearsalDmsControlResult(governance, { packet });
  validateJsonPostgresRehearsalDmsControlResult(negative, { packet });
  if (governance.result_sha256 !== negative.result_sha256
    || governance.migration_result_sha256
      !== execution.dms_result_sha256
    || execution.safe_counts.dms_source_object_count !== 0
    || execution.safe_counts.dms_verified_object_count !== 0
    || execution.safe_counts.dms_tenant_negative_visible_count !== 0) {
    fail("W12 DMS migration and governance evidence diverged");
  }
  const checks = Object.fromEntries(
    requirements.check_keys.map((key) => [
      key,
      governance.checks[key],
    ]),
  );
  if (Object.values(checks).some((value) => value !== true)) {
    fail("W12 DMS governance check set is incomplete");
  }
  return Object.freeze({
    checks: Object.freeze(checks),
    safeCounts: zeroCounts(requirements, {
      dms_source_object_count: 0,
      dms_verified_object_count: 0,
      dms_governance_test_file_count:
        governance.safe_counts.dms_governance_test_file_count,
    }),
  });
}

function deriveReconciliationStage({
  packet,
  artifacts,
  requirements,
}) {
  const sourceTarget = validateExecutionEvidence(
    artifacts.get("source-target-reconciliation"),
    packet,
    "reconcile",
  );
  const logical =
    artifacts.get("logical-reference-validation");
  const identityHrx = validateExecutionEvidence(
    artifacts.get("identity-hrx-reconciliation"),
    packet,
    "reconcile",
  );
  const invariants = {
    execution_result_binding:
      sourceTarget.result_sha256 === identityHrx.result_sha256,
    logical_schema:
      logical?.schema_version
        === "law-firm-os.json-postgres-reconciliation.v1",
    logical_outcome: logical?.outcome === "PASS",
    logical_digest:
      digest(reconciliationMaterial(logical))
        === logical?.reconciliation_sha256,
    catalog_binding:
      logical?.catalog_sha256
        === packet.bindings.record_type_catalog_sha256,
    logical_blocking_count: logical?.safe_counts?.blocking_count === 0,
    logical_reference_count:
      logical?.safe_counts?.missing_logical_reference_count === 0,
    employee_link_count:
      logical?.safe_counts?.employee_without_link_count === 0,
    link_employee_count:
      logical?.safe_counts?.link_without_employee_count === 0,
    link_account_count:
      logical?.safe_counts?.link_without_account_count === 0,
    unexpected_rejected_count:
      logical?.safe_counts?.unexpected_rejected_count === 0,
    missing_expected_rejected_count:
      logical?.safe_counts?.missing_expected_rejected_count === 0,
    target_blocking_count:
      sourceTarget.safe_counts?.blocking_count === 0,
    target_logical_reference_count:
      sourceTarget.safe_counts?.missing_logical_reference_count === 0,
    target_unexpected_rejected_count:
      sourceTarget.safe_counts?.unexpected_rejected_count === 0,
    target_tenant_visibility:
      sourceTarget.safe_counts?.tenant_negative_visible_count === 0,
  };
  const failedInvariant = Object.entries(invariants)
    .find(([, passed]) => !passed)?.[0];
  if (failedInvariant) {
    fail(
      `W12 source-target reconciliation evidence failed: `
      + failedInvariant,
    );
  }
  assertNoSensitiveClaims(logical, "W12 logical reconciliation");
  return Object.freeze({
    checks: allChecks(requirements),
    safeCounts: zeroCounts(requirements, {
      reconciled_record_count:
        sourceTarget.safe_counts.accepted_record_count,
      reconciled_account_count:
        sourceTarget.safe_counts.account_count,
      logical_reference_count:
        logical.safe_counts.employee_user_link_count,
    }),
  });
}

function deriveCapacityStage({ packet, artifacts, requirements }) {
  const result = artifacts.get("performance-acceptance");
  validateJsonPostgresRehearsalCapacityResult(result, { packet });
  if (JSON.stringify(Object.keys(result.checks).sort())
      !== JSON.stringify([...requirements.check_keys].sort())
    || Object.values(result.checks).some((value) => value !== true)
    || result.safe_counts.capacity_acceptance_failure_count !== 0) {
    fail("W12 capacity evidence checks failed");
  }
  return Object.freeze({
    checks: Object.freeze({ ...result.checks }),
    safeCounts: zeroCounts(requirements, {
      measurement_count: result.measured.measurement_count,
      records_per_tenant: result.measured.records_per_tenant,
      largest_domain_batch_size:
        result.measured.largest_domain_batch_size,
      migration_p95_ms: result.measured.migration_p95_ms,
      outbox_lag_p95_ms: result.measured.outbox_lag_p95_ms,
      dms_source_object_count: result.measured.dms_object_count,
    }),
  });
}

function restoreResultMaterial(value) {
  const { result_sha256: ignored, ...material } = value;
  return material;
}

function deriveRestoreStage({ packet, artifacts, requirements }) {
  const values = requirements.artifact_kinds.map((kind) =>
    artifacts.get(kind));
  const [result] = values;
  if (values.some((value) =>
    value.result_sha256 !== result.result_sha256)
    || result.schema_version
      !== "law-firm-os.json-postgres-rehearsal-restore-result.v1"
    || result.outcome !== "PASS"
    || result.source_sha !== packet.source_sha
    || result.source_tree !== packet.source_tree
    || result.packet_sha256 !== packet.packet_sha256
    || digest(restoreResultMaterial(result)) !== result.result_sha256
    || JSON.stringify(Object.keys(result.checks).sort())
      !== JSON.stringify([...requirements.check_keys].sort())
    || Object.values(result.checks).some((value) => value !== true)
    || result.safe_counts?.restore_variance_count !== 0
    || result.safe_counts?.dms_restore_mismatch_count !== 0
    || result.claims?.source_database_mutated !== false
    || result.claims?.production_contacted !== false
    || result.claims?.production_write !== false
    || result.claims?.document_bytes_returned !== false) {
    fail("W12 isolated restore evidence failed or drifted");
  }
  assertNoSensitiveClaims(result, "W12 isolated restore");
  const cost = exactInteger(
    result.safe_counts.monthly_cost_forecast_krw,
    "W12 restore monthly cost forecast",
  );
  if (cost > packet.target.monthly_cost_ceiling_krw) {
    fail("W12 restore monthly cost forecast exceeds the approved ceiling");
  }
  return Object.freeze({
    checks: Object.freeze({ ...result.checks }),
    safeCounts: zeroCounts(requirements, {
      restored_record_count: exactInteger(
        result.safe_counts.restored_record_count,
        "W12 restored record count",
      ),
      dms_source_object_count: exactInteger(
        result.safe_counts.dms_source_object_count,
        "W12 restored DMS source object count",
      ),
      rpo_ms: exactInteger(result.safe_counts.rpo_ms, "W12 restore RPO"),
      rto_ms: exactInteger(result.safe_counts.rto_ms, "W12 restore RTO"),
      monthly_cost_forecast_krw: cost,
    }),
  });
}

function ownerSamplingMaterial(value) {
  const { result_sha256: ignored, ...material } = value;
  return material;
}

function deriveOwnerSamplingStage({ packet, artifacts, requirements }) {
  const values = requirements.artifact_kinds.map((kind) =>
    artifacts.get(kind));
  const [result] = values;
  const sampleKinds = new Set((result.samples ?? []).map((sample) =>
    sample?.sample_kind));
  if (values.some((value) =>
    value.result_sha256 !== result.result_sha256)
    || result.schema_version
      !== "law-firm-os.json-postgres-rehearsal-owner-sampling.v1"
    || result.outcome !== "PASS"
    || result.packet_sha256 !== packet.packet_sha256
    || digest(ownerSamplingMaterial(result)) !== result.result_sha256
    || !SHA256.test(result.sample_set_sha256 ?? "")
    || !Array.isArray(result.samples)
    || result.samples.length < 5
    || ["employee", "client", "matter", "document"].some((kind) =>
      !sampleKinds.has(kind))
    || result.safe_counts?.owner_sample_variance_count !== 0
    || result.claims?.read_only !== true) {
    fail("W12 owner sampling evidence failed or drifted");
  }
  assertNoSensitiveClaims(result, "W12 owner sampling");
  return Object.freeze({
    checks: allChecks(requirements),
    safeCounts: zeroCounts(requirements, {
      owner_sample_count: result.samples.length,
    }),
  });
}

function deriveTerminalStage({ packet, artifacts, requirements }) {
  const result = artifacts.get("component-receipt-set");
  validateJsonPostgresW12ComponentReceiptSet(result, { packet });
  if (JSON.stringify(Object.keys(result.checks).sort())
      !== JSON.stringify([...requirements.check_keys].sort())) {
    fail("W12 terminal component check set drifted");
  }
  return Object.freeze({
    checks: Object.freeze({ ...result.checks }),
    safeCounts: Object.freeze({ ...result.safe_counts }),
  });
}

const DERIVERS = Object.freeze({
  "source-inventory-adjudication": deriveSourceInventoryStage,
  "record-type-and-reference": deriveRecordTypeStage,
  "w12-infrastructure": deriveInfrastructureStage,
  "w12-sink": deriveSinkStage,
  "w12-migration": deriveMigrationStage,
  "w12-replay": deriveReplayStage,
  "w12-tenant-rls": deriveTenantRlsStage,
  "w12-failure-injection": deriveFailureInjectionStage,
  "w12-capacity": deriveCapacityStage,
  "w12-dms": deriveDmsStage,
  "w12-reconciliation": deriveReconciliationStage,
  "w12-restore": deriveRestoreStage,
  "w12-owner-sampling": deriveOwnerSamplingStage,
  "w12-terminal": deriveTerminalStage,
});

export function deriveJsonPostgresW12StageEvidence({
  packet,
  stage,
  evidenceId,
  startedAt,
  finishedAt,
  commandSha256,
  sourceArtifacts,
} = {}) {
  exactSource(packet?.source_sha, "W12 packet source SHA");
  exactSource(packet?.source_tree, "W12 packet source tree");
  exactDigest(packet?.packet_sha256, "W12 packet digest");
  if (packet.phase !== "w12-real-data-rehearsal") {
    fail("W12 stage evidence requires a W12 execution packet");
  }
  const deriver = DERIVERS[stage];
  if (!deriver) {
    fail(`W12 repository-owned evidence derivation is missing for ${stage}`);
  }
  const requirements =
    jsonPostgresProgramStageEvidenceRequirements(stage, stage);
  const parsed = parseArtifacts(sourceArtifacts, requirements);
  const derived = deriver({
    packet,
    artifacts: parsed.parsed,
    requirements,
  });
  return createJsonPostgresProgramStageEvidence({
    evidenceId,
    stage,
    probeKind: stage,
    packet,
    operatorRole: requirements.operator_role,
    startedAt,
    finishedAt,
    commandSha256,
    sourceArtifacts: parsed.bindings,
    checks: derived.checks,
    safeCounts: derived.safeCounts,
  });
}
