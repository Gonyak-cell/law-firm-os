import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  COUNT_KEYS, MAX_TERMINAL_BYTES, TERMINAL_SCHEMA_VERSION,
  bindingFailure, exactDigest, exactRecord, normalizeBindings, normalizeCounts,
  normalizePostgresReceipt, unknownCommittedCounter,
} from "./json-postgres-outlook-authority-terminal-contract.js";

export const REPLAY_SCHEMA_VERSION =
  "law-firm-os.json-postgres-outlook-authority-replay-receipt.v1";
const REPLAY_DOMAIN =
  "law-firm-os.json-postgres-outlook-authority-replay-receipt.sha256.v1";
const TERMINAL_KEYS = Object.freeze([
  "schema_version", "status", "bindings", "recorded_at", ...COUNT_KEYS,
  "result", "failure", "postgres_receipt",
]);
const PASS_KEYS = Object.freeze([
  "outcome", "migration_applied_count",
  "role_configuration_transaction_committed_count",
  "outlook_database_role_count", "outlook_login_role_count",
  "outlook_tenant_authority_count", "outlook_membership_edge_count",
  "synthetic_wildcard_count", "migration_run_receipt_sha256",
  "authority_postflight_sha256", "password_returned",
  "secret_material_returned",
]);
const FAILURE_KEYS = Object.freeze([
  "error_code", "failure_phase", "post_state_sha256",
]);
const FAILURE_PHASES = new Set([
  "authorization-claim", "credential-input", "terminal-read",
  "postgres-precondition", "postgres-bootstrap-before-observation",
  "postgres-bootstrap", "postgres-postflight", "secret-publication",
  "terminal-evidence",
]);
const PUBLIC_KEYS = Object.freeze([
  "outcome", "operation_binding_sha256", "terminal_state",
  "terminal_sha256", "postgres_receipt", "replay_receipt_sha256",
  ...COUNT_KEYS,
]);

function count(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    bindingFailure(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function canonicalTime(value) {
  if (typeof value !== "string") return false;
  try { return new Date(Date.parse(value)).toISOString() === value; }
  catch { return false; }
}

function normalizePass(value, postgres) {
  exactRecord(value, PASS_KEYS, "terminal PASS result");
  if (value.outcome !== "PASS" || value.password_returned !== false
      || value.secret_material_returned !== false
      || value.role_configuration_transaction_committed_count !== 1
      || value.outlook_database_role_count !== 4
      || value.outlook_login_role_count !== 3
      || count(value.outlook_tenant_authority_count,
        "outlook_tenant_authority_count") < 3
      || value.outlook_tenant_authority_count % 3 !== 0
      || ![4, 5].includes(value.outlook_membership_edge_count)
      || value.synthetic_wildcard_count !== 0
      || count(value.migration_applied_count, "migration_applied_count")
        !== postgres.receipt.migration_applied_count
      || value.role_configuration_transaction_committed_count
        !== postgres.receipt.role_configuration_transaction_committed_count
      || exactDigest(value.migration_run_receipt_sha256,
        "migration run receipt digest")
        !== postgres.receipt.migration_run_receipt_sha256
      || exactDigest(value.authority_postflight_sha256,
        "authority postflight digest")
        !== postgres.receipt.authority_postflight_sha256) {
    bindingFailure("terminal PASS result is invalid or unbound");
  }
  return Object.freeze(Object.fromEntries(PASS_KEYS.map((key) => [key, value[key]])));
}

function normalizeFailure(value, postgres) {
  exactRecord(value, FAILURE_KEYS, "terminal failure");
  if (typeof value.error_code !== "string"
      || !/^LAWOS_OUTLOOK_[A-Z0-9_]{1,95}$/u.test(value.error_code)
      || !FAILURE_PHASES.has(value.failure_phase)) {
    bindingFailure("terminal failure is invalid");
  }
  const postState = exactDigest(value.post_state_sha256,
    "terminal failure post-state digest", true);
  if (postgres?.kind === "failure"
      && postState !== postgres.receipt.failure_receipt_sha256) {
    bindingFailure("terminal failure is not bound to its PostgreSQL receipt");
  }
  if (postgres?.kind === "run"
      && postState !== postgres.receipt.authority_postflight_sha256) {
    bindingFailure("terminal failure is not bound to its postflight state");
  }
  return Object.freeze({ error_code: value.error_code,
    failure_phase: value.failure_phase, post_state_sha256: postState });
}

export function createTerminal(value) {
  exactRecord(value, TERMINAL_KEYS, "Outlook authority terminal");
  if (!["PASS", "PARTIAL"].includes(value.status)
      || value.schema_version !== TERMINAL_SCHEMA_VERSION
      || !canonicalTime(value.recorded_at)) {
    bindingFailure("Outlook authority terminal identity is invalid");
  }
  const partial = value.status === "PARTIAL";
  if ((value.failure === null) !== !partial || (value.result === null) !== partial) {
    bindingFailure("Outlook authority terminal outcome is invalid");
  }
  const failureCode = partial ? value.failure?.error_code : null;
  const unknown = partial ? unknownCommittedCounter(failureCode) : null;
  const bindings = normalizeBindings(value.bindings, partial);
  const counts = normalizeCounts(value, unknown);
  const postgres = normalizePostgresReceipt(value.postgres_receipt, {
    status: value.status, bindings, counts,
    failurePhase: partial ? value.failure?.failure_phase : null,
  });
  if (postgres === null
      && (counts.postgres_mutation_attempt_count !== 0
        || counts.postgres_mutation_committed_count !== 0
        || counts.secretsmanager_put_secret_value_attempt_count !== 0
        || counts.secretsmanager_put_secret_value_committed_count !== 0)) {
    bindingFailure("pre-database terminal has downstream mutation counts");
  }
  const result = partial ? null : normalizePass(value.result, postgres);
  const failure = partial ? normalizeFailure(value.failure, postgres) : null;
  if (!partial && (counts.authorization_claim_write_attempt_count !== 1
      || counts.authorization_claim_write_committed_count !== 1
      || counts.postgres_mutation_attempt_count < 1
      || counts.postgres_mutation_attempt_count
        !== counts.postgres_mutation_committed_count
      || counts.secretsmanager_put_secret_value_attempt_count !== 3
      || counts.secretsmanager_put_secret_value_committed_count !== 3)) {
    bindingFailure("terminal PASS write counts are invalid");
  }
  const terminal = Object.freeze({ schema_version: TERMINAL_SCHEMA_VERSION,
    status: value.status, bindings, recorded_at: value.recorded_at, ...counts,
    result, failure, postgres_receipt: postgres });
  if (Buffer.byteLength(canonicalizeJson(terminal)) > MAX_TERMINAL_BYTES) {
    bindingFailure("Outlook authority terminal exceeds its bounded size");
  }
  return terminal;
}

export function terminalBytes(value) {
  return Buffer.from(canonicalizeJson(createTerminal(value)), "utf8");
}

export function terminalSha256(value) {
  return createHash("sha256").update(terminalBytes(value)).digest("hex");
}

function publicPostgresReceipt(value) {
  if (value === null) return null;
  exactRecord(value, ["kind", "receipt_sha256"], "public PostgreSQL receipt");
  if (!["run", "failure"].includes(value.kind)) {
    bindingFailure("Outlook authority public PostgreSQL receipt is invalid");
  }
  return Object.freeze({ kind: value.kind,
    receipt_sha256: exactDigest(value.receipt_sha256,
      "public PostgreSQL receipt digest") });
}

function postgresReceiptSha(value) {
  if (value === null) return null;
  return value.kind === "run" ? value.receipt.migration_run_receipt_sha256
    : value.receipt.failure_receipt_sha256;
}

export function createPublicResult(value, { terminal: supplied = null } = {}) {
  exactRecord(value, PUBLIC_KEYS, "Outlook authority public result");
  const terminal = supplied === null ? null : createTerminal(supplied);
  const unknown = terminal?.status === "PARTIAL"
    ? unknownCommittedCounter(terminal.failure.error_code) : null;
  const counts = normalizeCounts(value, unknown);
  if (!["PASS", "BLOCKED"].includes(value.outcome)
      || !["PASS", "PARTIAL", "ABSENT"].includes(value.terminal_state)) {
    bindingFailure("Outlook authority public result state is invalid");
  }
  const terminalSha = exactDigest(value.terminal_sha256,
    "public terminal_sha256", value.terminal_state === "ABSENT");
  const postgres = publicPostgresReceipt(value.postgres_receipt);
  const replay = exactDigest(value.replay_receipt_sha256,
    "public replay_receipt_sha256", true);
  const stateMatches = value.terminal_state === "ABSENT" ? terminal === null
    : terminal !== null && value.terminal_state === terminal.status
      && terminalSha === terminalSha256(terminal)
      && value.operation_binding_sha256
        === terminal.bindings.operation_binding_sha256
      && postgres?.kind === terminal.postgres_receipt?.kind
      && postgres?.receipt_sha256 === postgresReceiptSha(terminal.postgres_receipt);
  if (!stateMatches || (value.outcome === "PASS") !== (value.terminal_state === "PASS")
      || (value.terminal_state === "ABSENT" && (terminalSha !== null || postgres !== null))
      || (replay !== null && value.outcome !== "PASS")) {
    bindingFailure("Outlook authority public evidence is incomplete");
  }
  if (replay !== null) {
    if (counts[COUNT_KEYS[1]] !== 0 || ![0, 1].includes(counts[COUNT_KEYS[0]])
        || COUNT_KEYS.slice(2, 6).some((key) => counts[key] !== 0)
        || counts.production_write_count !== 0) {
      bindingFailure("Outlook authority public replay counts are invalid");
    }
  } else if (terminal && COUNT_KEYS.some((key) => counts[key] !== terminal[key])) {
    bindingFailure("Outlook authority public counts drifted from terminal evidence");
  }
  return Object.freeze({ outcome: value.outcome,
    operation_binding_sha256: exactDigest(value.operation_binding_sha256,
      "public operation_binding_sha256"), terminal_state: value.terminal_state,
    terminal_sha256: terminalSha, postgres_receipt: postgres,
    replay_receipt_sha256: replay, ...counts });
}

export function createReplayReceipt({ operationBindingSha256, claimSha256,
  claimWriteAttempted, claimWriteCommitted, terminal: supplied } = {}) {
  const terminal = createTerminal(supplied);
  const operation = exactDigest(operationBindingSha256,
    "replay operation_binding_sha256");
  const claim = exactDigest(claimSha256, "replay claim_sha256");
  if (terminal.status !== "PASS"
      || terminal.bindings.operation_binding_sha256 !== operation
      || terminal.bindings.claim_sha256 !== claim
      || typeof claimWriteAttempted !== "boolean" || claimWriteCommitted !== false) {
    bindingFailure("Outlook authority replay receipt is invalid or unbound");
  }
  const material = Object.freeze({ schema_version: REPLAY_SCHEMA_VERSION,
    digest_domain: REPLAY_DOMAIN, operation_binding_sha256: operation,
    claim_sha256: claim, terminal_sha256: terminalSha256(terminal),
    authorization_claim_write_attempt_count: Number(claimWriteAttempted),
    authorization_claim_write_committed_count: 0,
    postgres_mutation_attempt_count: 0, postgres_mutation_committed_count: 0,
    secretsmanager_put_secret_value_attempt_count: 0,
    secretsmanager_put_secret_value_committed_count: 0,
    production_write_count: 0 });
  return Object.freeze({ ...material, replay_receipt_sha256: createHash("sha256")
    .update(canonicalizeJson(material)).digest("hex") });
}
