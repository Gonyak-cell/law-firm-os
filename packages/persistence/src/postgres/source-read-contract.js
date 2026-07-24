import { createHash } from "node:crypto";
import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalBundle,
} from "../../../runtime-auth/src/runtime-safety-approval-contract.js";
import {
  JSON_POSTGRES_INVENTORY_DELTA_POLICY_SHA256,
} from "./source-authority-manifest.js";

export const JSON_POSTGRES_SOURCE_READ_PACKET_VERSION =
  "law-firm-os.json-postgres-source-read-packet.v2";
export const JSON_POSTGRES_SOURCE_READ_DELTA_VERSION =
  "law-firm-os.json-postgres-source-read-delta.v1";
export const JSON_POSTGRES_SOURCE_READ_ACTION = "lawos-json-postgres-source-read";
export const JSON_POSTGRES_SOURCE_READ_ENVIRONMENT = "lawos-source-local";

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const SOURCE_REF = /^[a-f0-9]{32}$/u;
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
const SOURCE_READ_REQUIREMENTS = Object.freeze([
  "Read only the exact inventoried local source files under approved roots.",
  "Return paths only in private 0600 outputs outside the worktree.",
  "On an exact inventory match, emit PII-safe per-record lineage, state-version, audit-chronology, and authority recommendations in the same inventory execution.",
  "Bind the approved safe inventory as the delta baseline.",
  "If inventory content changed under an approved root, emit only a closed PII-safe blocked delta candidate and require new owner adjudication before lineage analysis or import.",
  "Do not mutate source files, PostgreSQL, AWS, email, production, release, or traffic.",
]);
const SOURCE_READ_STOP_CONDITIONS = Object.freeze([
  "Stop before adjudication or import on inventory, source-byte, root, path, symlink, or signature drift.",
  "Stop before any unapproved external action or source mutation.",
  "Stop on secret, credential, raw PII, or document bytes in safe output.",
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

function sourceReadDeltaMaterial(delta) {
  return {
    schema_version: delta.schema_version,
    approved_inventory_content_sha256:
      delta.approved_inventory_content_sha256,
    observed_inventory_content_sha256:
      delta.observed_inventory_content_sha256,
    approved_root_refs: delta.approved_root_refs,
    changes: delta.changes,
    safe_counts: delta.safe_counts,
    claims: delta.claims,
  };
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
    requirements: [...SOURCE_READ_REQUIREMENTS],
    stop_conditions: [...SOURCE_READ_STOP_CONDITIONS],
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
  if (JSON.stringify(packet.requirements)
      !== JSON.stringify(SOURCE_READ_REQUIREMENTS)
    || JSON.stringify(packet.stop_conditions)
      !== JSON.stringify(SOURCE_READ_STOP_CONDITIONS)) {
    throw new TypeError("source-read requirements or stop conditions drifted");
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

export function createJsonPostgresSourceReadDelta({
  packet,
  approvedInventory,
  observedInventory,
} = {}) {
  validateJsonPostgresSourceReadPacket(packet);
  if (approvedInventory?.inventory_content_sha256
      !== packet.inventory_content_sha256
    || !Array.isArray(approvedInventory?.sources)
    || !Array.isArray(observedInventory?.sources)
    || !SHA256.test(observedInventory?.inventory_content_sha256 ?? "")
    || observedInventory.inventory_content_sha256
      === packet.inventory_content_sha256) {
    throw new TypeError("source-read delta inventory binding is invalid");
  }
  const approvedByRef = new Map();
  const observedByRef = new Map();
  for (const [inventory, target] of [
    [approvedInventory, approvedByRef],
    [observedInventory, observedByRef],
  ]) {
    for (const source of inventory.sources) {
      if (!SOURCE_REF.test(source?.source_ref ?? "")
        || !SAFE_REF.test(source?.root_ref ?? "")
        || !SHA256.test(source?.sha256 ?? "")
        || target.has(source.source_ref)) {
        throw new TypeError("source-read delta source binding is invalid");
      }
      target.set(source.source_ref, source);
    }
  }
  const approvedRoots = new Set(packet.approved_root_refs);
  const changes = [];
  for (const source of observedInventory.sources) {
    const prior = approvedByRef.get(source.source_ref);
    if (prior?.sha256 === source.sha256
      && prior.root_ref === source.root_ref) continue;
    changes.push(Object.freeze({
      change: prior ? "changed" : "added",
      source_ref: source.source_ref,
      root_ref: source.root_ref,
      prior_sha256: prior?.sha256 ?? null,
      observed_sha256: source.sha256,
      approved_root: approvedRoots.has(source.root_ref),
    }));
  }
  for (const source of approvedInventory.sources) {
    if (observedByRef.has(source.source_ref)) continue;
    changes.push(Object.freeze({
      change: "removed",
      source_ref: source.source_ref,
      root_ref: source.root_ref,
      prior_sha256: source.sha256,
      observed_sha256: null,
      approved_root: approvedRoots.has(source.root_ref),
    }));
  }
  changes.sort((left, right) =>
    left.source_ref.localeCompare(right.source_ref));
  const inventoryContractChangeCount = changes.length === 0 ? 1 : 0;
  const value = Object.freeze({
    schema_version: JSON_POSTGRES_SOURCE_READ_DELTA_VERSION,
    approved_inventory_content_sha256:
      packet.inventory_content_sha256,
    observed_inventory_content_sha256:
      observedInventory.inventory_content_sha256,
    approved_root_refs: Object.freeze([...packet.approved_root_refs]),
    changes: Object.freeze(changes),
    safe_counts: Object.freeze({
      added_count: changes.filter((row) => row.change === "added").length,
      changed_count: changes.filter((row) => row.change === "changed").length,
      removed_count: changes.filter((row) => row.change === "removed").length,
      unapproved_root_count:
        changes.filter((row) => !row.approved_root).length,
      inventory_contract_change_count: inventoryContractChangeCount,
      owner_review_required_count:
        changes.length + inventoryContractChangeCount,
    }),
    claims: Object.freeze({
      auto_authorized: false,
      authority_decision_final: false,
      raw_value_returned: false,
      raw_path_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      source_mutated: false,
      postgres_mutated: false,
      aws_mutated: false,
      production_contacted: false,
    }),
  });
  return Object.freeze({
    ...value,
    delta_sha256: createHash("sha256")
      .update(canonicalizeJson(sourceReadDeltaMaterial(value)))
      .digest("hex"),
  });
}

export function validateJsonPostgresSourceReadDelta(
  delta,
  { packet, approvedInventory, observedInventory } = {},
) {
  if (delta?.schema_version !== JSON_POSTGRES_SOURCE_READ_DELTA_VERSION
    || !SHA256.test(delta?.delta_sha256 ?? "")) {
    throw new TypeError("source-read delta is invalid");
  }
  const rebuilt = createJsonPostgresSourceReadDelta({
    packet,
    approvedInventory,
    observedInventory,
  });
  if (canonicalizeJson(rebuilt) !== canonicalizeJson(delta)) {
    throw new TypeError("source-read delta drifted");
  }
  return Object.freeze({
    valid: true,
    delta_sha256: delta.delta_sha256,
    owner_review_required_count:
      delta.safe_counts.owner_review_required_count,
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
