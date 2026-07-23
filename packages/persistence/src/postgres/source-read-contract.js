import { createHash } from "node:crypto";
import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalBundle,
} from "../../../runtime-auth/src/runtime-safety-approval-contract.js";
import {
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "./source-authority-manifest.js";

export const JSON_POSTGRES_SOURCE_READ_PACKET_VERSION =
  "law-firm-os.json-postgres-source-read-packet.v1";
export const JSON_POSTGRES_SOURCE_READ_ACTION = "lawos-json-postgres-source-read";
export const JSON_POSTGRES_SOURCE_READ_ENVIRONMENT = "lawos-source-local";

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_REF = /^[A-Za-z0-9_.:-]{1,160}$/u;
const PACKET_KEYS = Object.freeze([
  "schema_version",
  "packet_id",
  "source_sha",
  "source_tree",
  "action",
  "environment",
  "inventory_content_sha256",
  "inventory_delta_policy_sha256",
  "approved_root_refs",
  "data_scope",
  "contact_scope",
  "requirements",
  "stop_conditions",
  "current_state",
  "external_actions_authorized",
  "claims",
]);

function closedObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length > 0) throw new TypeError(`${label} contains unsupported fields: ${extras.join(",")}`);
}

function packetMaterial(packet) {
  return Object.fromEntries(PACKET_KEYS.map((key) => [key, packet[key]]));
}

export function createJsonPostgresSourceReadPacket({
  packetId,
  sourceSha,
  sourceTree,
  inventoryContentSha256,
  approvedRootRefs = [],
} = {}) {
  const packet = {
    schema_version: JSON_POSTGRES_SOURCE_READ_PACKET_VERSION,
    packet_id: packetId,
    source_sha: sourceSha,
    source_tree: sourceTree,
    action: JSON_POSTGRES_SOURCE_READ_ACTION,
    environment: JSON_POSTGRES_SOURCE_READ_ENVIRONMENT,
    inventory_content_sha256: inventoryContentSha256,
    inventory_delta_policy_sha256: JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
    approved_root_refs: [...new Set(approvedRootRefs)].sort(),
    data_scope: [
      "approved-real-source-read",
      `inventory:${inventoryContentSha256}`,
      `inventory-delta-policy:${JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256}`,
    ],
    contact_scope: [],
    requirements: [
      "Read only the exact inventoried local source files under approved roots.",
      "Return paths only in private 0600 outputs outside the worktree.",
      "If inventory content changed under an approved root, emit a safe blocked delta candidate and require new owner adjudication before import.",
      "Do not mutate source files, PostgreSQL, AWS, email, production, release, or traffic.",
    ],
    stop_conditions: [
      "Stop before adjudication or import on inventory, source-byte, root, path, symlink, or signature drift.",
      "Stop before any unapproved external action or source mutation.",
      "Stop on secret, credential, raw PII, or document bytes in safe output.",
    ],
    current_state: "PENDING_HUMAN_APPROVAL",
    external_actions_authorized: false,
    claims: {
      real_data_read: false,
      source_mutated: false,
      postgres_mutated: false,
      aws_mutated: false,
      production_contacted: false,
    },
  };
  const validated = validateJsonPostgresSourceReadPacket(packet, {
    sourceSha,
    sourceTree,
    inventoryContentSha256,
  });
  return Object.freeze({
    packet: Object.freeze(packet),
    packet_sha256: validated.packet_sha256,
    canonical: validated.canonical,
  });
}

export function validateJsonPostgresSourceReadPacket(packet, expected = {}) {
  closedObject(packet, PACKET_KEYS, "source-read packet");
  if (packet.schema_version !== JSON_POSTGRES_SOURCE_READ_PACKET_VERSION
    || !SAFE_REF.test(packet.packet_id ?? "")
    || !SHA1.test(packet.source_sha ?? "")
    || !SHA1.test(packet.source_tree ?? "")
    || !SHA256.test(packet.inventory_content_sha256 ?? "")
    || packet.inventory_delta_policy_sha256 !== JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256) {
    throw new TypeError("source-read packet schema or binding is invalid");
  }
  if (packet.action !== JSON_POSTGRES_SOURCE_READ_ACTION
    || packet.environment !== JSON_POSTGRES_SOURCE_READ_ENVIRONMENT) {
    throw new TypeError("source-read packet action or environment is invalid");
  }
  if (expected.sourceSha && packet.source_sha !== expected.sourceSha) throw new TypeError("source-read source SHA drifted");
  if (expected.sourceTree && packet.source_tree !== expected.sourceTree) throw new TypeError("source-read source tree drifted");
  if (expected.inventoryContentSha256
    && packet.inventory_content_sha256 !== expected.inventoryContentSha256) {
    throw new TypeError("source-read inventory digest drifted");
  }
  if (!Array.isArray(packet.approved_root_refs)
    || packet.approved_root_refs.length === 0
    || new Set(packet.approved_root_refs).size !== packet.approved_root_refs.length
    || packet.approved_root_refs.some((ref) => !SAFE_REF.test(ref))) {
    throw new TypeError("source-read approved roots are invalid");
  }
  const expectedScope = [
    "approved-real-source-read",
    `inventory:${packet.inventory_content_sha256}`,
    `inventory-delta-policy:${JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256}`,
  ];
  if (JSON.stringify(packet.data_scope) !== JSON.stringify(expectedScope)
    || !Array.isArray(packet.contact_scope)
    || packet.contact_scope.length !== 0) {
    throw new TypeError("source-read data or contact scope is invalid");
  }
  if (!Array.isArray(packet.requirements) || packet.requirements.length === 0
    || !Array.isArray(packet.stop_conditions) || packet.stop_conditions.length === 0) {
    throw new TypeError("source-read requirements and stop conditions are required");
  }
  if (packet.current_state !== "PENDING_HUMAN_APPROVAL"
    || packet.external_actions_authorized !== false) {
    throw new TypeError("unsigned source-read packet must remain pending");
  }
  closedObject(packet.claims, [
    "real_data_read",
    "source_mutated",
    "postgres_mutated",
    "aws_mutated",
    "production_contacted",
  ], "source-read claims");
  if (Object.values(packet.claims).some((value) => value !== false)) {
    throw new TypeError("unsigned source-read packet contains an affirmative claim");
  }
  const canonical = canonicalizeJson(packetMaterial(packet));
  return Object.freeze({
    valid: true,
    canonical,
    packet_sha256: createHash("sha256").update(canonical).digest("hex"),
  });
}

export function classifyJsonPostgresSourceReadInventory(packet, observedInventoryContentSha256) {
  validateJsonPostgresSourceReadPacket(packet);
  if (!SHA256.test(observedInventoryContentSha256 ?? "")) {
    throw new TypeError("observed source inventory digest is invalid");
  }
  const inventoryDrifted =
    packet.inventory_content_sha256 !== observedInventoryContentSha256;
  return Object.freeze({
    verdict: inventoryDrifted
      ? "BLOCKED_SAFE_INVENTORY_DELTA_REQUIRES_OWNER_ADJUDICATION"
      : "PASS_SAFE_INVENTORY",
    inventory_drifted: inventoryDrifted,
    owner_adjudication_required: inventoryDrifted,
  });
}

export function verifyJsonPostgresSourceReadApproval({
  packet,
  sourceSha,
  sourceTree,
  inventoryContentSha256,
  trustRegistryPath,
  trustRegistrySha256,
  approvalReceiptPath,
  now,
} = {}) {
  const validated = validateJsonPostgresSourceReadPacket(packet, {
    sourceSha,
    sourceTree,
    inventoryContentSha256,
  });
  const approval = validateRuntimeSafetyApprovalBundle({
    registryPath: trustRegistryPath,
    expectedRegistrySha256: trustRegistrySha256,
    receiptPath: approvalReceiptPath,
    expectedRole: "owner",
    expectedAction: JSON_POSTGRES_SOURCE_READ_ACTION,
    expectedEnvironment: JSON_POSTGRES_SOURCE_READ_ENVIRONMENT,
    expectedPacketSha256: validated.packet_sha256,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    allowedDataScope: packet.data_scope,
    allowedContactScope: [],
    now,
  });
  if (approval.decision !== "approved") throw new TypeError("owner rejected the source-read packet");
  return Object.freeze({
    ...approval,
    packet_sha256: validated.packet_sha256,
  });
}
