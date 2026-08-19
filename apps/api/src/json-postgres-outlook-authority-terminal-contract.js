import {
  assertOutlookAuthorityMigrationFailureReceipt,
  assertOutlookAuthorityMigrationRunReceipt,
} from "../../../packages/persistence/src/postgres/migration-runner.js";

export const TERMINAL_SCHEMA_VERSION =
  "law-firm-os.json-postgres-outlook-authority-terminal.v1";
export const SHA256 = /^[0-9a-f]{64}$/u;
export const MAX_TERMINAL_BYTES = 64 * 1024;
export const BINDING_KEYS = Object.freeze([
  "operation_binding_sha256", "claim_sha256", "packet_sha256",
  "approval_receipt_sha256", "registry_sha256",
  "database_target_receipt_sha256",
  "authority_catalog_sha256", "migration_catalog_sha256",
  "role_bootstrap_sha256",
]);
export const COUNT_KEYS = Object.freeze([
  "authorization_claim_write_attempt_count",
  "authorization_claim_write_committed_count",
  "postgres_mutation_attempt_count", "postgres_mutation_committed_count",
  "secretsmanager_put_secret_value_attempt_count",
  "secretsmanager_put_secret_value_committed_count", "production_write_count",
]);
export const WRITE_SURFACES = Object.freeze([
  Object.freeze({ attempted: COUNT_KEYS[0], committed: COUNT_KEYS[1],
    code: "LAWOS_OUTLOOK_AUTHORIZATION_CLAIM_COMMIT_UNKNOWN" }),
  Object.freeze({ attempted: COUNT_KEYS[2], committed: COUNT_KEYS[3],
    code: "LAWOS_OUTLOOK_POSTGRES_COMMIT_UNKNOWN" }),
  Object.freeze({ attempted: COUNT_KEYS[4], committed: COUNT_KEYS[5],
    code: "LAWOS_OUTLOOK_SECRET_COMMIT_UNKNOWN" }),
]);

const PRE_DATABASE_PHASES = new Set([
  "authorization-claim", "credential-input", "terminal-read",
]);
const POST_RUN_PHASES = new Set(["secret-publication", "terminal-evidence"]);

export function bindingFailure(message) {
  const error = new Error(message);
  error.code = "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_BINDING";
  throw error;
}

export function conflict(message) {
  const error = new Error(message);
  error.code = "LAWOS_OUTLOOK_AUTHORITY_TERMINAL_CONFLICT";
  throw error;
}

export function exactRecord(value, keys, label) {
  const actual = value && typeof value === "object" && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype
    ? Object.keys(value).sort() : [];
  const expected = [...keys].sort();
  if (actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])) {
    bindingFailure(`${label} keys are not exact`);
  }
}

export function exactDigest(value, label, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || !SHA256.test(value)) {
    bindingFailure(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function exactCount(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    bindingFailure(`${label} must be a non-negative safe integer`);
  }
  return value;
}

export function unknownCommittedCounter(errorCode) {
  return WRITE_SURFACES.find(({ code }) => code === errorCode)?.committed ?? null;
}

export function normalizeBindings(value, allowNullRole = false) {
  exactRecord(value, BINDING_KEYS, "terminal bindings");
  return Object.freeze(Object.fromEntries(BINDING_KEYS.map((key) => [
    key, exactDigest(value[key], key,
      allowNullRole && key === "role_bootstrap_sha256"),
  ])));
}

export function normalizeExpectedBindings(value) {
  const keys = Object.hasOwn(value ?? {}, "role_bootstrap_sha256")
    ? BINDING_KEYS : BINDING_KEYS.slice(0, -1);
  exactRecord(value, keys, "expected terminal bindings");
  return Object.freeze(Object.fromEntries(keys.map((key) => [
    key, exactDigest(value[key], key,
      key === "role_bootstrap_sha256" && value[key] === null),
  ])));
}

export function normalizeCounts(value, unknownCounter = null) {
  if (unknownCounter !== null
    && !WRITE_SURFACES.some(({ committed }) => committed === unknownCounter)) {
    bindingFailure("unknown committed write surface is invalid");
  }
  const counts = {};
  for (const { attempted, committed } of WRITE_SURFACES) {
    counts[attempted] = exactCount(value[attempted], attempted);
    if (value[committed] === null) {
      if (committed !== unknownCounter || counts[attempted] < 1) {
        bindingFailure(`${committed} cannot be unknown for this outcome`);
      }
      counts[committed] = null;
    } else {
      counts[committed] = exactCount(value[committed], committed);
      if (counts[committed] > counts[attempted]) {
        bindingFailure("committed write counts cannot exceed attempted write counts");
      }
    }
  }
  const total = WRITE_SURFACES.reduce((sum, { committed }) =>
    sum + (counts[committed] ?? 0), 0);
  counts.production_write_count = value.production_write_count === null
    ? null : exactCount(value.production_write_count, "production_write_count");
  if ((unknownCounter === null && counts.production_write_count !== total)
    || (unknownCounter !== null
      && (counts[unknownCounter] !== null
        || counts.production_write_count !== null))) {
    bindingFailure("production_write_count does not match committed writes");
  }
  return Object.freeze(counts);
}

export function normalizePostgresReceipt(value, {
  status, bindings, counts, failurePhase,
} = {}) {
  const expectedKind = status === "PASS" || POST_RUN_PHASES.has(failurePhase)
    ? "run" : PRE_DATABASE_PHASES.has(failurePhase) ? null : "failure";
  if (expectedKind === null) {
    if (value !== null) bindingFailure("pre-database terminal cannot bind PostgreSQL");
    return null;
  }
  exactRecord(value, ["kind", "receipt"], "terminal PostgreSQL receipt");
  if (value.kind !== expectedKind) {
    bindingFailure("terminal PostgreSQL receipt kind does not match its phase");
  }
  const expected = {
    authority_manifest_sha256: bindings.authority_catalog_sha256,
    database_target_receipt_sha256: bindings.database_target_receipt_sha256,
    migration_catalog_sha256: bindings.migration_catalog_sha256,
    role_bootstrap_sha256: bindings.role_bootstrap_sha256,
  };
  let receipt;
  try {
    receipt = value.kind === "run"
      ? assertOutlookAuthorityMigrationRunReceipt(value.receipt, expected)
      : assertOutlookAuthorityMigrationFailureReceipt(value.receipt, expected);
  } catch {
    bindingFailure("terminal PostgreSQL receipt is invalid or unbound");
  }
  if (receipt.postgres_mutation_attempt_count !==
        counts.postgres_mutation_attempt_count
      || receipt.postgres_mutation_committed_count !==
        counts.postgres_mutation_committed_count) {
    bindingFailure("terminal PostgreSQL receipt counts drifted");
  }
  return Object.freeze({ kind: value.kind, receipt });
}

export function assertExpectedBindings(actual, expected) {
  if (Object.entries(expected).some(([key, value]) => actual[key] !== value)) {
    conflict("immutable terminal evidence bindings drifted");
  }
}
