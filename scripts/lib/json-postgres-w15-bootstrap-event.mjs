import {
  JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
  JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_PHASE,
  validateJsonPostgresW15InventoryBootstrapPacket,
} from "../../packages/persistence/src/postgres/w15-inventory-bootstrap-contract.js";

export const JSON_POSTGRES_W15_BOOTSTRAP_EVENT_VERSION =
  "law-firm-os.json-postgres-w15-inventory-bootstrap-event.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const SHA1 = /^[0-9a-f]{40}$/u;
const TOKEN = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const AUTHORIZATION_KEYS = Object.freeze([
  "packet",
  "trust_registry",
  "approval_receipt",
  "approval_signature",
]);

function fail(message) {
  throw new TypeError(message);
}

export function assertJsonPostgresW15SourcePublished({
  sourceSha,
  sourceTree,
  originMainSha,
  originMainTree,
  sourceIsAncestor,
} = {}) {
  if (![sourceSha, sourceTree, originMainSha, originMainTree]
    .every((value) => SHA1.test(value ?? ""))
    || originMainTree !== sourceTree
    || (originMainSha !== sourceSha && sourceIsAncestor !== true)) {
    fail(
      "W15 source is not published at origin/main with its exact approved tree",
    );
  }
  return Object.freeze({
    valid: true,
    publication_mode:
      originMainSha === sourceSha ? "exact-main" : "merge-commit-same-tree",
    source_sha: sourceSha,
    source_tree: sourceTree,
    origin_main_sha: originMainSha,
    origin_main_tree: originMainTree,
  });
}

function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail(`${label} is incomplete or contains unsupported fields`);
  }
  return Object.freeze(structuredClone(value));
}

export function createJsonPostgresW15BootstrapEvent({
  packet,
  artifactSha256,
  mode,
  attemptRef,
  authorization,
  inputs,
  schemaBootstrapResultSha256 = null,
} = {}) {
  const validated =
    validateJsonPostgresW15InventoryBootstrapPacket(packet);
  if (packet.bindings.artifact_sha256 !== artifactSha256
    || !TOKEN.test(attemptRef ?? "")
    || !packet.allowed_modes.includes(mode)) {
    fail("W15 bootstrap event exact binding is invalid");
  }
  const approvedAuthorization = exactObject(
    authorization,
    AUTHORIZATION_KEYS,
    "W15 bootstrap authorization locators",
  );
  const approvedInputs = exactObject(
    inputs,
    mode === "inventory-read"
      ? ["predecessors", "schema_bootstrap_result"]
      : ["predecessors"],
    "W15 bootstrap input locators",
  );
  if (!Array.isArray(approvedInputs.predecessors)
    || approvedInputs.predecessors.length !== 3) {
    fail("W15 bootstrap requires exactly three predecessor locators");
  }
  if (mode === "inventory-read"
    && (!approvedInputs.schema_bootstrap_result
      || typeof approvedInputs.schema_bootstrap_result !== "object"
      || Array.isArray(approvedInputs.schema_bootstrap_result))) {
    fail("W15 inventory read requires an immutable schema bootstrap result locator");
  }
  if ((mode === "schema-bootstrap"
      && schemaBootstrapResultSha256 != null)
    || (mode === "inventory-read"
      && !SHA256.test(schemaBootstrapResultSha256 ?? ""))) {
    fail("W15 bootstrap predecessor result binding is invalid");
  }
  return Object.freeze({
    schema_version: JSON_POSTGRES_W15_BOOTSTRAP_EVENT_VERSION,
    action: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_ACTION,
    phase: JSON_POSTGRES_W15_INVENTORY_BOOTSTRAP_PHASE,
    mode,
    attempt_ref: attemptRef,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    artifact_sha256: artifactSha256,
    packet_sha256: validated.packet_sha256,
    ...(schemaBootstrapResultSha256 == null
      ? {}
      : { schema_bootstrap_result_sha256: schemaBootstrapResultSha256 }),
    authorization: approvedAuthorization,
    inputs: approvedInputs,
  });
}

export function validateJsonPostgresW15BootstrapEvent(event, {
  packet,
  artifactSha256,
} = {}) {
  const recreated = createJsonPostgresW15BootstrapEvent({
    packet,
    artifactSha256,
    mode: event?.mode,
    attemptRef: event?.attempt_ref,
    authorization: event?.authorization,
    inputs: event?.inputs,
    schemaBootstrapResultSha256:
      event?.schema_bootstrap_result_sha256 ?? null,
  });
  if (JSON.stringify(event) !== JSON.stringify(recreated)) {
    fail("W15 bootstrap event is not canonical");
  }
  return Object.freeze({
    valid: true,
    mode: event.mode,
    packet_sha256: event.packet_sha256,
  });
}
