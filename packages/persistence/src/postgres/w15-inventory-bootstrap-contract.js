import { createHash } from "node:crypto";
import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalBundle,
  validateRuntimeSafetyApprovalPayload,
} from "../../../runtime-auth/src/runtime-safety-approval-contract.js";
import {
  validateJsonPostgresExecutionTarget,
} from "./execution-contract.js";

export const JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_PACKET_VERSION =
  "law-firm-os.json-postgres-w15-inventory-bootstrap-packet.v1";
export const JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION =
  "lawos-json-postgres-w15-inventory-bootstrap";
export const JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ENVIRONMENT =
  "lawos-production-projection";
export const JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_PHASE =
  "w15-inventory-bootstrap";
export const JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_MODES = Object.freeze([
  "schema-bootstrap",
  "inventory-read",
]);
export const JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_DATA_SCOPE =
  "approved-tenant-safe-aggregate-read";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TOKEN = /^[A-Za-z0-9._:/+-]{1,240}$/u;
const BINDING_KEYS = Object.freeze([
  "artifact_sha256",
  "artifact_manifest_sha256",
  "lockfile_sha256",
  "migration_catalog_sha256",
  "infrastructure_template_sha256",
  "baseline_sha256",
  "predecessor_verification_sha256",
  "w12_terminal_receipt_sha256",
  "cut012_terminal_receipt_sha256",
  "go_live_receipt_sha256",
]);
const PACKET_KEYS = Object.freeze([
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
  "requirements",
  "stop_conditions",
  "current_state",
  "external_actions_authorized",
  "claims",
]);

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail(
      "JSON_POSTGRES_W15_BOOTSTRAP_SCHEMA",
      `${label} fields are invalid`,
    );
  }
}

function validateBindings(bindings) {
  exactKeys(bindings, BINDING_KEYS, "W15 bootstrap bindings");
  for (const key of BINDING_KEYS) {
    if (!SHA256.test(bindings[key] ?? "")
      || bindings[key] === "0".repeat(64)) {
      fail(
        "JSON_POSTGRES_W15_BOOTSTRAP_BINDING",
        `W15 bootstrap ${key} is invalid`,
      );
    }
  }
  return Object.freeze({ ...bindings });
}

function packetMaterial(packet) {
  return Object.fromEntries(PACKET_KEYS.map((key) => [key, packet[key]]));
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value)
      ? value
      : canonicalizeJson(value))
    .digest("hex");
}

export function createJsonPostgresW15InventoryBootstrapPacket({
  packetId,
  sourceSha,
  sourceTree,
  bindings,
  target,
} = {}) {
  if (!TOKEN.test(packetId ?? "")
    || !SHA1.test(sourceSha ?? "")
    || !SHA1.test(sourceTree ?? "")) {
    fail(
      "JSON_POSTGRES_W15_BOOTSTRAP_SOURCE",
      "W15 bootstrap packet identity is invalid",
    );
  }
  const packet = {
    schema_version:
      JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_PACKET_VERSION,
    packet_id: packetId,
    source_sha: sourceSha,
    source_tree: sourceTree,
    phase: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_PHASE,
    action: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
    environment: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ENVIRONMENT,
    data_scope: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_DATA_SCOPE,
    contact_scope: [],
    bindings: validateBindings(bindings),
    target: validateJsonPostgresExecutionTarget(target),
    operators: ["matter-prod-deploy-admin", "matter-readonly-auditor"],
    allowed_modes: [...JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_MODES],
    requirements: [
      "Create only the W15 schema, projection roles, and disabled audit infrastructure before inventory.",
      "Return only approved-tenant aggregate counts, hashes, ranges, and schema metadata.",
      "Keep the generic PostgreSQL ledger as the sole write authority.",
      "Keep projection row writes, worker scheduling, consumer rollout, and authority promotion disabled.",
    ],
    stop_conditions: [
      "Stop on source, tree, artifact, packet, baseline, predecessor, migration, infrastructure, or target drift.",
      "Stop on an invalid signature, unapproved tenant, public endpoint, TLS failure, RLS failure, or excess IAM authority.",
      "Stop on any projection data write, source-authority write, consumer route change, JSON fallback, or dual-write.",
      "Stop on raw value, PII, credential, secret, document byte, or private-key exposure.",
      "Stop when forecast or actual monthly cost exceeds KRW 300,000.",
    ],
    current_state: "PENDING_HUMAN_APPROVAL",
    external_actions_authorized: false,
    claims: {
      real_data_read: false,
      real_data_mutated: false,
      production_contacted: false,
      production_write: false,
      projection_data_write: false,
      consumer_rollout: false,
      authority_promotion: false,
    },
  };
  const validated = validateJsonPostgresW15InventoryBootstrapPacket(packet, {
    sourceSha,
    sourceTree,
  });
  return Object.freeze({
    packet: Object.freeze(packet),
    packet_sha256: validated.packet_sha256,
    canonical: validated.canonical,
  });
}

export function validateJsonPostgresW15InventoryBootstrapPacket(
  packet = {},
  expected = {},
) {
  exactKeys(packet, PACKET_KEYS, "W15 bootstrap packet");
  if (packet.schema_version
      !== JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_PACKET_VERSION
    || !TOKEN.test(packet.packet_id ?? "")
    || !SHA1.test(packet.source_sha ?? "")
    || !SHA1.test(packet.source_tree ?? "")
    || (expected.sourceSha && packet.source_sha !== expected.sourceSha)
    || (expected.sourceTree && packet.source_tree !== expected.sourceTree)
    || packet.phase !== JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_PHASE
    || packet.action !== JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION
    || packet.environment
      !== JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ENVIRONMENT
    || packet.data_scope
      !== JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_DATA_SCOPE
    || JSON.stringify(packet.contact_scope) !== "[]"
    || JSON.stringify(packet.operators)
      !== JSON.stringify([
        "matter-prod-deploy-admin",
        "matter-readonly-auditor",
      ])
    || JSON.stringify(packet.allowed_modes)
      !== JSON.stringify(JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_MODES)
    || !Array.isArray(packet.requirements)
    || packet.requirements.length !== 4
    || !Array.isArray(packet.stop_conditions)
    || packet.stop_conditions.length !== 5
    || packet.current_state !== "PENDING_HUMAN_APPROVAL"
    || packet.external_actions_authorized !== false) {
    fail(
      "JSON_POSTGRES_W15_BOOTSTRAP_CONTRACT",
      "W15 bootstrap packet is outside its closed authority boundary",
    );
  }
  validateBindings(packet.bindings);
  validateJsonPostgresExecutionTarget(packet.target);
  exactKeys(packet.claims, [
    "real_data_read",
    "real_data_mutated",
    "production_contacted",
    "production_write",
    "projection_data_write",
    "consumer_rollout",
    "authority_promotion",
  ], "W15 bootstrap claims");
  if (Object.values(packet.claims).some((value) => value !== false)) {
    fail(
      "JSON_POSTGRES_W15_BOOTSTRAP_CLAIM",
      "unsigned W15 bootstrap packet contains an execution claim",
    );
  }
  const canonical = canonicalizeJson(packetMaterial(packet));
  return Object.freeze({
    valid: true,
    packet_sha256: sha256(canonical),
    canonical,
  });
}

function allowedApprovalDataScope(packet) {
  return [
    JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_DATA_SCOPE,
    `baseline:${packet.bindings.baseline_sha256}`,
    `predecessors:${packet.bindings.predecessor_verification_sha256}`,
  ];
}

export function verifyJsonPostgresW15InventoryBootstrapApproval({
  packet,
  sourceSha,
  sourceTree,
  trustRegistryPath,
  trustRegistrySha256,
  approvalReceiptPath,
  now,
} = {}) {
  const validated = validateJsonPostgresW15InventoryBootstrapPacket(packet, {
    sourceSha,
    sourceTree,
  });
  const approval = validateRuntimeSafetyApprovalBundle({
    registryPath: trustRegistryPath,
    expectedRegistrySha256: trustRegistrySha256,
    receiptPath: approvalReceiptPath,
    expectedRole: "owner",
    expectedAction: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
    expectedEnvironment:
      JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ENVIRONMENT,
    expectedPacketSha256: validated.packet_sha256,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    allowedDataScope: allowedApprovalDataScope(packet),
    allowedContactScope: [],
    now,
  });
  if (approval.decision !== "approved") {
    fail(
      "JSON_POSTGRES_W15_BOOTSTRAP_REJECTED",
      "owner rejected the W15 inventory bootstrap packet",
    );
  }
  return Object.freeze({
    ...approval,
    packet_sha256: validated.packet_sha256,
  });
}

export function verifyJsonPostgresW15InventoryBootstrapApprovalPayload({
  packet,
  sourceSha,
  sourceTree,
  trustRegistryBytes,
  trustRegistrySha256,
  approvalReceiptBytes,
  approvalSignatureBytes,
  now,
} = {}) {
  const validated = validateJsonPostgresW15InventoryBootstrapPacket(packet, {
    sourceSha,
    sourceTree,
  });
  const approval = validateRuntimeSafetyApprovalPayload({
    registryBytes: trustRegistryBytes,
    receiptBytes: approvalReceiptBytes,
    signatureBytes: approvalSignatureBytes,
    expectedRegistrySha256: trustRegistrySha256,
    expectedRole: "owner",
    expectedAction: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
    expectedEnvironment:
      JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ENVIRONMENT,
    expectedPacketSha256: validated.packet_sha256,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    allowedDataScope: allowedApprovalDataScope(packet),
    allowedContactScope: [],
    now,
  });
  if (approval.decision !== "approved") {
    fail(
      "JSON_POSTGRES_W15_BOOTSTRAP_REJECTED",
      "owner rejected the W15 inventory bootstrap packet",
    );
  }
  return Object.freeze({
    ...approval,
    packet_sha256: validated.packet_sha256,
  });
}

export function createJsonPostgresW15InventoryProvenance({
  sourceSha,
  sourceTree,
  bootstrapPacketSha256,
  schemaBootstrapResultSha256,
} = {}) {
  if (!SHA1.test(sourceSha ?? "")
    || !SHA1.test(sourceTree ?? "")
    || !SHA256.test(bootstrapPacketSha256 ?? "")
    || !SHA256.test(schemaBootstrapResultSha256 ?? "")) {
    fail(
      "JSON_POSTGRES_W15_INVENTORY_PROVENANCE",
      "W15 inventory provenance binding is invalid",
    );
  }
  const material = {
    schema_version:
      "law-firm-os.json-postgres-w15-inventory-provenance.v1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    bootstrap_packet_sha256: bootstrapPacketSha256,
    schema_bootstrap_result_sha256: schemaBootstrapResultSha256,
    observation_role: "lawos_hrx_projection_auditor",
    aggregate_only: true,
    production_write: false,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  };
  return Object.freeze({
    ...material,
    provenance_sha256: sha256(material),
  });
}
