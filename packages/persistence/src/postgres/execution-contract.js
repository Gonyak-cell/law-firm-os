import { createHash } from "node:crypto";
import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalBundle,
  validateRuntimeSafetyApprovalPayload,
} from "../../../runtime-auth/src/runtime-safety-approval-contract.js";
import {
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "./source-authority-manifest.js";

export const JSON_POSTGRES_EXECUTION_PACKET_VERSION = "law-firm-os.json-postgres-execution-packet.v2";
export const JSON_POSTGRES_EXECUTION_PHASES = Object.freeze([
  "w12-real-data-rehearsal",
  "w13-production-cutover",
  "w15-relational-projection",
]);
export const JSON_POSTGRES_EXECUTION_MODES = Object.freeze([
  "preflight",
  "dry-run",
  "stage",
  "commit",
  "resume",
  "readback",
  "reconcile",
]);
export const JSON_POSTGRES_W12_AUTHORIZED_STAGES = Object.freeze([
  "source-inventory-adjudication",
  "record-type-and-reference",
  "w12-infrastructure",
  "w12-sink",
  "w12-migration",
  "w12-replay",
  "w12-tenant-rls",
  "w12-failure-injection",
  "w12-capacity",
  "w12-dms",
  "w12-reconciliation",
  "w12-restore",
  "w12-owner-sampling",
  "w12-terminal",
]);
export const JSON_POSTGRES_W13_W14_AUTHORIZED_STAGES = Object.freeze([
  "cut-008",
  "source-freeze",
  "first-write-boundary",
  "cut-009",
  "cut-010",
  "cut-011",
  "cut-012",
  "macos-signing",
  "windows-signing",
  "formal-release",
  "go-live",
]);
export const JSON_POSTGRES_W15_AUTHORIZED_STAGES = Object.freeze([
  "w15-relational-projection",
]);

const PHASE_CONTRACT = Object.freeze({
  "w12-real-data-rehearsal": Object.freeze({
    action: "lawos-json-postgres-real-data-rehearsal",
    environment: "lawos-private-rehearsal",
    isolated: true,
    production: false,
    contact_scope: Object.freeze(["non-delivery-sink"]),
    operator_roles: Object.freeze(["matter-staging-admin", "matter-readonly-auditor"]),
    authorized_stages: JSON_POSTGRES_W12_AUTHORIZED_STAGES,
  }),
  "w13-production-cutover": Object.freeze({
    action: "lawos-json-postgres-production-cutover",
    environment: "lawos-production",
    isolated: false,
    production: true,
    contact_scope: Object.freeze(["individual-active-user-request-only"]),
    operator_roles: Object.freeze(["matter-prod-deploy-admin", "matter-cutover-operator", "matter-readonly-auditor"]),
    authorized_stages: JSON_POSTGRES_W13_W14_AUTHORIZED_STAGES,
  }),
  "w15-relational-projection": Object.freeze({
    action: "lawos-json-postgres-relational-projection",
    environment: "lawos-production-projection",
    isolated: false,
    production: true,
    contact_scope: Object.freeze([]),
    operator_roles: Object.freeze(["matter-prod-deploy-admin", "matter-readonly-auditor"]),
    authorized_stages: JSON_POSTGRES_W15_AUTHORIZED_STAGES,
  }),
});
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TOKEN = /^[A-Za-z0-9._:/+-]{1,240}$/u;
const AWS_ACCOUNT = /^\d{12}$/u;
const REQUIRED_BINDING_KEYS = Object.freeze([
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
]);
const TERMINAL_BINDING_KEYS = Object.freeze([
  "w12_terminal_receipt_sha256",
  "cut012_terminal_receipt_sha256",
  "go_live_receipt_sha256",
]);
export const JSON_POSTGRES_EXECUTION_REQUIRED_BINDINGS = REQUIRED_BINDING_KEYS;
const CLOSED_PACKET_KEYS = Object.freeze([
  "schema_version",
  "packet_id",
  "source_sha",
  "source_tree",
  "phase",
  "action",
  "environment",
  "data_scope",
  "contact_scope",
  "bindings",
  "target",
  "operators",
  "allowed_modes",
  "authorized_stages",
  "requirements",
  "stop_conditions",
  "current_state",
  "external_actions_authorized",
  "claims",
]);

function fail(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  throw error;
}

function closedObject(value, allowedKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("JSON_POSTGRES_EXECUTION_SCHEMA", `${label} must be an object`);
  const extras = Object.keys(value).filter((key) => !allowedKeys.includes(key));
  if (extras.length > 0) fail("JSON_POSTGRES_EXECUTION_SCHEMA", `${label} contains unsupported fields`, { extras });
}

function exactStringArray(value, expected, label) {
  if (!Array.isArray(value) || JSON.stringify(value) !== JSON.stringify(expected)) {
    fail("JSON_POSTGRES_EXECUTION_SCOPE", `${label} does not match the closed phase contract`);
  }
}

function nonEmptyStrings(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== "string" || !item.trim())) {
    fail("JSON_POSTGRES_EXECUTION_SCHEMA", `${label} must be a non-empty string array`);
  }
  if (new Set(value).size !== value.length) fail("JSON_POSTGRES_EXECUTION_SCHEMA", `${label} contains duplicates`);
}

function digestBindings(value) {
  closedObject(value, REQUIRED_BINDING_KEYS, "execution bindings");
  if (JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...REQUIRED_BINDING_KEYS].sort())) {
    fail("JSON_POSTGRES_EXECUTION_BINDING", "execution binding set is incomplete");
  }
  for (const key of REQUIRED_BINDING_KEYS) {
    if (!SHA256.test(value[key] ?? "")) fail("JSON_POSTGRES_EXECUTION_BINDING", `${key} is not a SHA-256 digest`);
  }
}

function validateTarget(value, contract) {
  const keys = [
    "target_ref",
    "aws_account",
    "aws_region",
    "artifact_bucket_ref",
    "artifact_bucket_name",
    "artifact_expected_bucket_owner",
    "artifact_kms_key_ref",
    "artifact_object_lock_enabled",
    "artifact_versioning_enabled",
    "artifact_public_access_blocked",
    "database_secret_ref",
    "tenant_context_secret_ref",
    "dms_bucket_ref",
    "dms_bucket_name",
    "dms_prefix",
    "dms_kms_key_ref",
    "dms_expected_bucket_owner",
    "dms_default_retention_days",
    "dms_object_lock_enabled",
    "dms_versioning_enabled",
    "dms_public_access_blocked",
    "program_input_bucket_ref",
    "program_input_bucket_name",
    "program_input_expected_bucket_owner",
    "program_input_kms_key_ref",
    "program_input_object_lock_enabled",
    "program_input_versioning_enabled",
    "program_input_public_access_blocked",
    "approved_tenant_ids",
    "backup_target_ref",
    "isolated",
    "production",
    "public_access",
    "tls_mode",
    "monthly_cost_ceiling_krw",
  ];
  closedObject(value, keys, "execution target");
  for (const key of [
    "target_ref",
    "aws_region",
    "artifact_bucket_ref",
    "artifact_kms_key_ref",
    "database_secret_ref",
    "tenant_context_secret_ref",
    "dms_bucket_ref",
    "dms_prefix",
    "dms_kms_key_ref",
    "program_input_bucket_ref",
    "program_input_kms_key_ref",
    "backup_target_ref",
  ]) {
    if (!TOKEN.test(value[key] ?? "")) fail("JSON_POSTGRES_EXECUTION_TARGET", `${key} is invalid`);
  }
  if (!AWS_ACCOUNT.test(value.aws_account ?? "")) fail("JSON_POSTGRES_EXECUTION_TARGET", "AWS account is invalid");
  if (!/^(?!xn--)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u.test(value.artifact_bucket_name ?? "")
    || value.artifact_expected_bucket_owner !== value.aws_account
    || value.artifact_object_lock_enabled !== true
    || value.artifact_versioning_enabled !== true
    || value.artifact_public_access_blocked !== true) {
    fail("JSON_POSTGRES_EXECUTION_TARGET", "artifact target must bind a private versioned S3 Object Lock bucket");
  }
  if (!/^(?!xn--)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u.test(value.dms_bucket_name ?? "")
    || value.dms_expected_bucket_owner !== value.aws_account
    || !Number.isSafeInteger(value.dms_default_retention_days)
    || value.dms_default_retention_days < 1
    || value.dms_default_retention_days > 36_500
    || value.dms_object_lock_enabled !== true
    || value.dms_versioning_enabled !== true
    || value.dms_public_access_blocked !== true) {
    fail("JSON_POSTGRES_EXECUTION_TARGET", "DMS target must bind a private versioned S3 Object Lock bucket and retention");
  }
  if (!/^(?!xn--)[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/u.test(value.program_input_bucket_name ?? "")
    || value.program_input_expected_bucket_owner !== value.aws_account
    || value.program_input_object_lock_enabled !== true
    || value.program_input_versioning_enabled !== true
    || value.program_input_public_access_blocked !== true) {
    fail("JSON_POSTGRES_EXECUTION_TARGET", "program input target must bind a private versioned S3 Object Lock bucket");
  }
  if (!Array.isArray(value.approved_tenant_ids)
    || value.approved_tenant_ids.length < 1
    || new Set(value.approved_tenant_ids).size !== value.approved_tenant_ids.length
    || value.approved_tenant_ids.some((tenantId) => (
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(tenantId)
      || /^tenant_lawos_staging_/u.test(tenantId)
      || tenantId === "*"
    ))) {
    fail("JSON_POSTGRES_EXECUTION_TARGET", "target must bind exact approved non-synthetic tenant ids");
  }
  if (value.isolated !== contract.isolated || value.production !== contract.production) {
    fail("JSON_POSTGRES_EXECUTION_TARGET", "target isolation/production flags do not match the phase");
  }
  if (value.public_access !== false || value.tls_mode !== "verify-full") {
    fail("JSON_POSTGRES_EXECUTION_TARGET", "target must be private and TLS verify-full");
  }
  if (!Number.isSafeInteger(value.monthly_cost_ceiling_krw) || value.monthly_cost_ceiling_krw !== 300_000) {
    fail("JSON_POSTGRES_EXECUTION_TARGET", "monthly cost ceiling must remain KRW 300,000");
  }
}

function packetMaterial(packet) {
  return Object.fromEntries(CLOSED_PACKET_KEYS.map((key) => [key, packet[key]]));
}

const REQUIREMENTS = Object.freeze({
  "w12-real-data-rehearsal": Object.freeze([
    "Every discovered source candidate has one signed final disposition.",
    "The isolated rehearsal imports only the exact approved immutable inventory.",
    "Reconciliation, replay no-op, tenant isolation, failure injection, capacity, DMS, and restore all pass.",
    "Production writes and external email delivery remain zero.",
  ]),
  "w13-production-cutover": Object.freeze([
    "The exact W12 terminal receipt is verified before any production mutation.",
    "CUT-008 passes before the first production write and CUT-009 starts only at the signed first-write boundary.",
    "CUT-010 proves isolated DR before operational JSON is retired by CUT-011.",
    "CUT-012 closes only after exact reconciliation, zero legacy authority counters, and all component receipts pass.",
    "Signing, release, and go-live remain ordered after CUT-012.",
  ]),
  "w15-relational-projection": Object.freeze([
    "The generic PostgreSQL ledger remains the only write authority.",
    "The projection is one-way, replayable, tenant-isolated, and read-only to consumers.",
    "Shadow count, hash, ordering, reference, rollback, performance, and receipt gates all pass.",
  ]),
});

const STOP_CONDITIONS = Object.freeze([
  "Stop on source, tree, artifact, packet, inventory, schema, migration, infrastructure, or target drift.",
  "Stop on missing or invalid approval, signature, predecessor receipt, operator role, or immutable input version.",
  "Stop on public RDS or S3, TLS verify-full failure, forced-RLS failure, tenant isolation failure, or excess IAM authority.",
  "Stop on any JSON fallback, JSON writer, dual-write, file-current authority, offline mutation, or memory fallback.",
  "Stop on DMS digest, tenant namespace, Object Lock, legal hold, retention, backup, restore, or reconciliation failure.",
  "Stop on secret, credential, raw PII, document bytes, or unapproved real-data exposure in evidence.",
  "Stop when forecast or actual monthly cost exceeds KRW 300,000.",
]);

export function createJsonPostgresExecutionPacket({
  packetId,
  sourceSha,
  sourceTree,
  phase,
  bindings,
  target,
} = {}) {
  const contract = PHASE_CONTRACT[phase];
  if (!contract) fail("JSON_POSTGRES_EXECUTION_PHASE", "execution phase is invalid");
  const packet = {
    schema_version: JSON_POSTGRES_EXECUTION_PACKET_VERSION,
    packet_id: packetId,
    source_sha: sourceSha,
    source_tree: sourceTree,
    phase,
    action: contract.action,
    environment: contract.environment,
    data_scope: "approved-real-manifest",
    contact_scope: [...contract.contact_scope],
    bindings: { ...bindings },
    target: { ...target },
    operators: [...contract.operator_roles],
    allowed_modes: [...JSON_POSTGRES_EXECUTION_MODES],
    authorized_stages: [...contract.authorized_stages],
    requirements: [...REQUIREMENTS[phase]],
    stop_conditions: [...STOP_CONDITIONS],
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
  const validated = validateJsonPostgresExecutionPacket(packet, {
    sourceSha,
    sourceTree,
    phase,
  });
  return Object.freeze({
    packet: Object.freeze(packet),
    packet_sha256: validated.packet_sha256,
    canonical: validated.canonical,
  });
}

export function validateJsonPostgresExecutionPacket(packet = {}, expected = {}) {
  closedObject(packet, CLOSED_PACKET_KEYS, "execution packet");
  if (packet.schema_version !== JSON_POSTGRES_EXECUTION_PACKET_VERSION) fail("JSON_POSTGRES_EXECUTION_SCHEMA", "unsupported execution packet schema");
  const contract = PHASE_CONTRACT[packet.phase];
  if (!contract) fail("JSON_POSTGRES_EXECUTION_PHASE", "execution phase is invalid");
  if (!TOKEN.test(packet.packet_id ?? "")) fail("JSON_POSTGRES_EXECUTION_SCHEMA", "packet_id is invalid");
  if (!SHA1.test(packet.source_sha ?? "") || !SHA1.test(packet.source_tree ?? "")) {
    fail("JSON_POSTGRES_EXECUTION_SOURCE", "source SHA/tree binding is invalid");
  }
  if (expected.sourceSha && packet.source_sha !== expected.sourceSha) fail("JSON_POSTGRES_EXECUTION_SOURCE", "packet source SHA drifted");
  if (expected.sourceTree && packet.source_tree !== expected.sourceTree) fail("JSON_POSTGRES_EXECUTION_SOURCE", "packet source tree drifted");
  if (expected.phase && packet.phase !== expected.phase) fail("JSON_POSTGRES_EXECUTION_PHASE", "packet phase drifted");
  if (packet.action !== contract.action || packet.environment !== contract.environment) {
    fail("JSON_POSTGRES_EXECUTION_SCOPE", "packet action/environment does not match the phase");
  }
  if (packet.data_scope !== "approved-real-manifest") fail("JSON_POSTGRES_EXECUTION_SCOPE", "execution data scope is invalid");
  exactStringArray(packet.contact_scope, contract.contact_scope, "contact_scope");
  digestBindings(packet.bindings);
  if (packet.bindings.inventory_delta_policy_sha256
    !== JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256) {
    fail("JSON_POSTGRES_EXECUTION_BINDING", "inventory delta policy binding drifted");
  }
  const zero = "0".repeat(64);
  const unboundRequired = REQUIRED_BINDING_KEYS
    .filter((key) => !TERMINAL_BINDING_KEYS.includes(key))
    .filter((key) => packet.bindings[key] === zero);
  if (unboundRequired.length > 0) {
    fail("JSON_POSTGRES_EXECUTION_BINDING", "execution packet contains unbound required digests", {
      unbound: unboundRequired,
    });
  }
  if (packet.phase === "w12-real-data-rehearsal"
    && [packet.bindings.w12_terminal_receipt_sha256, packet.bindings.cut012_terminal_receipt_sha256, packet.bindings.go_live_receipt_sha256]
      .some((value) => value !== zero)) {
    fail("JSON_POSTGRES_EXECUTION_BINDING", "W12 packet must not pre-claim later terminal receipts");
  }
  if (packet.phase === "w13-production-cutover"
    && (packet.bindings.w12_terminal_receipt_sha256 === zero
      || packet.bindings.cut012_terminal_receipt_sha256 !== zero
      || packet.bindings.go_live_receipt_sha256 !== zero)) {
    fail("JSON_POSTGRES_EXECUTION_BINDING", "W13 packet must bind W12 and must not pre-claim CUT-012 or go-live");
  }
  if (packet.phase === "w15-relational-projection"
    && [packet.bindings.w12_terminal_receipt_sha256, packet.bindings.cut012_terminal_receipt_sha256, packet.bindings.go_live_receipt_sha256]
      .some((value) => value === zero)) {
    fail("JSON_POSTGRES_EXECUTION_BINDING", "W15 packet must bind W12, CUT-012, and go-live terminal receipts");
  }
  validateTarget(packet.target, contract);
  exactStringArray(packet.operators, contract.operator_roles, "operators");
  exactStringArray(packet.allowed_modes, JSON_POSTGRES_EXECUTION_MODES, "allowed_modes");
  exactStringArray(packet.authorized_stages, contract.authorized_stages, "authorized_stages");
  nonEmptyStrings(packet.requirements, "requirements");
  nonEmptyStrings(packet.stop_conditions, "stop_conditions");
  if (packet.current_state !== "PENDING_HUMAN_APPROVAL" || packet.external_actions_authorized !== false) {
    fail("JSON_POSTGRES_EXECUTION_APPROVAL", "unsigned packet must remain pending and non-authorizing");
  }
  closedObject(packet.claims, [
    "real_data_read",
    "real_data_mutated",
    "production_contacted",
    "production_write",
    "json_authority_disabled",
    "release",
    "go_live",
  ], "execution packet claims");
  if (Object.values(packet.claims).some((value) => value !== false)) {
    fail("JSON_POSTGRES_EXECUTION_CLAIM", "unsigned packet contains an affirmative execution claim");
  }
  const canonical = canonicalizeJson(packetMaterial(packet));
  const packetSha256 = createHash("sha256").update(canonical).digest("hex");
  return Object.freeze({
    valid: true,
    phase: packet.phase,
    action: contract.action,
    environment: contract.environment,
    packet_sha256: packetSha256,
    canonical,
  });
}

export function verifyJsonPostgresExecutionApproval({
  packet,
  sourceSha,
  sourceTree,
  trustRegistryPath,
  trustRegistrySha256,
  approvalReceiptPath,
  now,
} = {}) {
  const validated = validateJsonPostgresExecutionPacket(packet, { sourceSha, sourceTree });
  const allowedDataScope = [
    "approved-real-manifest",
    `authority-manifest:${packet.bindings.authority_manifest_sha256}`,
    `inventory:${packet.bindings.inventory_content_sha256}`,
    `inventory-delta-policy:${packet.bindings.inventory_delta_policy_sha256}`,
  ];
  const approval = validateRuntimeSafetyApprovalBundle({
    registryPath: trustRegistryPath,
    expectedRegistrySha256: trustRegistrySha256,
    receiptPath: approvalReceiptPath,
    expectedRole: "owner",
    expectedAction: validated.action,
    expectedEnvironment: validated.environment,
    expectedPacketSha256: validated.packet_sha256,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    allowedDataScope,
    allowedContactScope: packet.contact_scope,
    now,
  });
  if (approval.decision !== "approved") fail("JSON_POSTGRES_EXECUTION_REJECTED", "owner rejected the execution packet");
  return Object.freeze({
    ...approval,
    phase: packet.phase,
    action: validated.action,
    environment: validated.environment,
    packet_sha256: validated.packet_sha256,
  });
}

export function verifyJsonPostgresExecutionApprovalPayload({
  packet,
  sourceSha,
  sourceTree,
  trustRegistryBytes,
  trustRegistrySha256,
  approvalReceiptBytes,
  approvalSignatureBytes,
  now,
} = {}) {
  const validated = validateJsonPostgresExecutionPacket(packet, { sourceSha, sourceTree });
  const approval = validateRuntimeSafetyApprovalPayload({
    registryBytes: trustRegistryBytes,
    receiptBytes: approvalReceiptBytes,
    signatureBytes: approvalSignatureBytes,
    expectedRegistrySha256: trustRegistrySha256,
    expectedRole: "owner",
    expectedAction: validated.action,
    expectedEnvironment: validated.environment,
    expectedPacketSha256: validated.packet_sha256,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    allowedDataScope: [
      "approved-real-manifest",
      `authority-manifest:${packet.bindings.authority_manifest_sha256}`,
      `inventory:${packet.bindings.inventory_content_sha256}`,
      `inventory-delta-policy:${packet.bindings.inventory_delta_policy_sha256}`,
    ],
    allowedContactScope: packet.contact_scope,
    now,
  });
  if (approval.decision !== "approved") fail("JSON_POSTGRES_EXECUTION_REJECTED", "owner rejected the execution packet");
  return Object.freeze({
    ...approval,
    phase: packet.phase,
    action: validated.action,
    environment: validated.environment,
    packet_sha256: validated.packet_sha256,
  });
}
