import {
  validateJsonPostgresExecutionPacket,
} from "../../packages/persistence/src/postgres/execution-contract.js";

export const JSON_POSTGRES_W15_EVENT_VERSION =
  "law-firm-os.json-postgres-w15-projection-event.v1";

const TOKEN = /^[a-z0-9][a-z0-9-]{0,63}$/u;
const QUERY_FAMILY_BY_WAVE = Object.freeze({
  1: "core-employee-roster",
  2: "recruiting-lifecycle",
  3: "leave-attendance",
  4: "payroll-compensation",
});
const REQUIRED_AUTHORIZATION_KEYS = Object.freeze([
  "packet",
  "trust_registry",
  "approval_receipt",
  "approval_signature",
]);
const REQUIRED_INPUT_KEYS = Object.freeze([
  "predecessors",
  "mapping_manifest",
  "production_inventory",
  "performance_acceptance",
]);

function fail(message) {
  throw new TypeError(message);
}

function exactObject(value, requiredKeys, optionalKeys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  if (Object.keys(value).some((key) => !allowed.has(key))
    || requiredKeys.some((key) => !value[key])) {
    fail(`${label} is incomplete or contains unsupported fields`);
  }
  return Object.freeze(structuredClone(value));
}

export function createJsonPostgresW15ProjectionEvent({
  packet,
  artifactSha256,
  mode,
  attemptRef,
  authorization,
  inputs,
  backfillWave = null,
  rolloutAction = null,
  queryFamily = null,
  maxStalenessMs = null,
} = {}) {
  const packetValidation = validateJsonPostgresExecutionPacket(packet, {
    phase: "w15-relational-projection",
  });
  if (packet.bindings.artifact_sha256 !== artifactSha256
    || !TOKEN.test(attemptRef ?? "")
    || !packet.allowed_modes.includes(mode)) {
    fail("W15 event exact packet, artifact, mode, or attempt binding is invalid");
  }
  const approvedAuthorization = exactObject(
    authorization,
    REQUIRED_AUTHORIZATION_KEYS,
    [],
    "W15 authorization locators",
  );
  const approvedInputs = exactObject(
    inputs,
    REQUIRED_INPUT_KEYS,
    ["validation_evidence"],
    "W15 input locators",
  );
  const wave = backfillWave == null ? null : Number(backfillWave);
  if ((mode === "commit" && wave !== 1)
    || (mode === "resume"
      && wave != null
      && (!Number.isSafeInteger(wave) || wave < 1 || wave > 5))
    || (!["commit", "resume", "rollout"].includes(mode) && wave != null)) {
    fail("W15 backfill wave is invalid for the requested mode");
  }
  let rollout = {};
  if (mode === "rollout") {
    if (rolloutAction === "disable") {
      if (queryFamily != null || maxStalenessMs != null) {
        fail("W15 rollout rollback cannot contain an activation binding");
      }
      rollout = { rollout_action: "disable" };
    } else {
      const rolloutWave = Number(backfillWave);
      const staleness = Number(maxStalenessMs);
      if (rolloutAction !== "enable"
        || QUERY_FAMILY_BY_WAVE[rolloutWave] !== queryFamily
        || !Number.isSafeInteger(staleness)
        || staleness < 1
        || staleness > 3_600_000
        || !approvedInputs.validation_evidence) {
        fail("W15 consumer activation binding is invalid");
      }
      rollout = {
        rollout_action: "enable",
        query_family: queryFamily,
        rollout_wave: rolloutWave,
        max_staleness_ms: staleness,
      };
    }
  } else if (rolloutAction != null
    || queryFamily != null
    || maxStalenessMs != null) {
    fail("W15 non-rollout event contains rollout fields");
  }
  return Object.freeze({
    schema_version: JSON_POSTGRES_W15_EVENT_VERSION,
    action: "lawos-json-postgres-relational-projection",
    phase: "w15-relational-projection",
    mode,
    attempt_ref: attemptRef,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    artifact_sha256: artifactSha256,
    packet_sha256: packetValidation.packet_sha256,
    ...(wave == null || mode === "rollout" ? {} : {
      backfill_wave: wave,
    }),
    ...rollout,
    authorization: approvedAuthorization,
    inputs: approvedInputs,
  });
}

export function validateJsonPostgresW15ProjectionEvent(event, {
  packet,
  artifactSha256,
} = {}) {
  const recreated = createJsonPostgresW15ProjectionEvent({
    packet,
    artifactSha256,
    mode: event?.mode,
    attemptRef: event?.attempt_ref,
    authorization: event?.authorization,
    inputs: event?.inputs,
    backfillWave: event?.rollout_wave ?? event?.backfill_wave ?? null,
    rolloutAction: event?.rollout_action ?? null,
    queryFamily: event?.query_family ?? null,
    maxStalenessMs: event?.max_staleness_ms ?? null,
  });
  if (JSON.stringify(event) !== JSON.stringify(recreated)) {
    fail("W15 projection event is not canonical");
  }
  return Object.freeze({
    valid: true,
    mode: recreated.mode,
    attempt_ref: recreated.attempt_ref,
    packet_sha256: recreated.packet_sha256,
  });
}
