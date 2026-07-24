import { createHash, verify as verifySignature } from "node:crypto";
import { canonicalizeJson } from "../../../runtime-auth/src/runtime-safety-approval-contract.js";

export const JSON_POSTGRES_PROGRAM_RECEIPT_VERSION = "law-firm-os.json-postgres-program-receipt.v2";
export const JSON_POSTGRES_PROGRAM_RECEIPT_ACTION = "lawos-json-postgres-program-receipt";
export const JSON_POSTGRES_PROGRAM_RECEIPT_KINDS = Object.freeze([
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
  "w15-relational-projection",
]);
export const JSON_POSTGRES_W12_RECEIPTS = Object.freeze(JSON_POSTGRES_PROGRAM_RECEIPT_KINDS.slice(0, 14));
export const JSON_POSTGRES_W13_RECEIPTS = Object.freeze([
  "cut-008",
  "source-freeze",
  "first-write-boundary",
  "cut-009",
  "cut-010",
  "cut-011",
  "cut-012",
]);
export const JSON_POSTGRES_W14_RECEIPTS = Object.freeze([
  "macos-signing",
  "windows-signing",
  "formal-release",
  "go-live",
]);

const KIND_SET = new Set(JSON_POSTGRES_PROGRAM_RECEIPT_KINDS);
const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const TOKEN = /^[A-Za-z0-9._:-]{1,200}$/u;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const SENSITIVE_KEY = /(^|_)(?:password|passwd|passphrase|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;
const CLOSED_KEYS = Object.freeze([
  "schema_version",
  "receipt_id",
  "receipt_kind",
  "phase",
  "environment",
  "profile",
  "signer_key_id",
  "execution_state",
  "source_sha",
  "source_tree",
  "packet_sha256",
  "bindings_sha256",
  "started_at",
  "finished_at",
  "command",
  "exit_code",
  "predecessor_receipt_sha256",
  "result_sha256",
  "safe_counts",
  "claims",
]);
const CLAIM_KEYS = Object.freeze([
  "real_data_read",
  "real_data_mutated",
  "production_contacted",
  "production_write",
  "first_production_write_started",
  "json_authority_disabled",
  "external_email_sent",
  "dms_bytes_in_evidence",
  "release",
  "go_live",
  "raw_value_returned",
  "pii_returned",
  "secret_material_returned",
]);

function isCommandWhitespace(character) {
  return character !== "" && character.trim() === "";
}

function isAsciiWordCharacter(character) {
  const code = character.charCodeAt(0);
  return (code >= 48 && code <= 57)
    || (code >= 65 && code <= 90)
    || (code >= 97 && code <= 122)
    || character === "_";
}

function containsCredentialedPostgresUrl(command) {
  for (const scheme of ["postgres://", "postgresql://"]) {
    let offset = 0;
    while (offset < command.length) {
      const schemeIndex = command.indexOf(scheme, offset);
      if (schemeIndex === -1) break;
      const authorityStart = schemeIndex + scheme.length;
      let cursor = authorityStart;
      while (cursor < command.length && !isCommandWhitespace(command[cursor])) {
        if (command[cursor] === "@") return cursor > authorityStart;
        cursor += 1;
      }
      offset = authorityStart;
    }
  }
  return false;
}

export function commandContainsSensitiveMaterial(value) {
  if (typeof value !== "string") return false;
  const command = value.toLowerCase();
  if (containsCredentialedPostgresUrl(command)) return true;
  let bearerIndex = command.indexOf("bearer");
  while (bearerIndex !== -1) {
    if (isCommandWhitespace(command[bearerIndex + "bearer".length] ?? "")) return true;
    bearerIndex = command.indexOf("bearer", bearerIndex + "bearer".length);
  }
  let passwordIndex = command.indexOf("--password");
  while (passwordIndex !== -1) {
    const next = command[passwordIndex + "--password".length] ?? "";
    if (!next || !isAsciiWordCharacter(next)) return true;
    passwordIndex = command.indexOf("--password", passwordIndex + "--password".length);
  }
  return false;
}
const KIND_ENVIRONMENT = Object.freeze(Object.fromEntries(JSON_POSTGRES_PROGRAM_RECEIPT_KINDS.map((kind) => [
  kind,
  kind.startsWith("w12-") ? "lawos-private-rehearsal"
    : ["source-inventory-adjudication", "record-type-and-reference"].includes(kind) ? "source-local"
      : ["macos-signing", "windows-signing", "formal-release", "go-live"].includes(kind) ? "lawos-release"
        : kind === "w15-relational-projection" ? "lawos-production-projection"
          : "lawos-production",
])));
const KIND_PHASE = Object.freeze(Object.fromEntries(JSON_POSTGRES_PROGRAM_RECEIPT_KINDS.map((kind) => [
  kind,
  kind.startsWith("w12-") || ["source-inventory-adjudication", "record-type-and-reference"].includes(kind)
    ? "w12-real-data-rehearsal"
    : ["macos-signing", "windows-signing", "formal-release", "go-live"].includes(kind)
      ? "w14-release-go-live"
      : kind === "w15-relational-projection"
        ? "w15-relational-projection"
        : "w13-production-cutover",
])));
const KIND_PROFILE = Object.freeze(Object.fromEntries(JSON_POSTGRES_PROGRAM_RECEIPT_KINDS.map((kind) => [
  kind,
  kind.startsWith("w12-") ? "private-rehearsal-postgres-v2"
    : ["source-inventory-adjudication", "record-type-and-reference"].includes(kind)
      ? "approved-real-data-source-read"
      : ["macos-signing", "windows-signing", "formal-release", "go-live"].includes(kind)
        ? "exact-main-release"
        : kind === "w15-relational-projection"
          ? "relational-read-projection"
          : "production-postgres-v2",
])));

function fail(message) {
  throw new Error(message);
}

function closedObject(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length > 0) fail(`${label} contains unsupported fields: ${extras.join(",")}`);
}

function timestamp(value, label) {
  if (!TIME.test(value ?? "") || !Number.isFinite(Date.parse(value))) fail(`${label} must be an RFC 3339 UTC timestamp`);
  return Date.parse(value);
}

function assertSafeCounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("safe_counts must be an object");
  for (const [key, count] of Object.entries(value)) {
    if (!/^[a-z][a-z0-9_]{1,95}$/u.test(key) || SENSITIVE_KEY.test(key)) fail(`safe_counts key is unsafe: ${key}`);
    if (!Number.isSafeInteger(count) || count < 0) fail(`safe_counts value must be a non-negative safe integer: ${key}`);
  }
}

export function canonicalizeJsonPostgresProgramReceipt(receipt) {
  return canonicalizeJson(Object.fromEntries(CLOSED_KEYS.map((key) => [key, receipt[key]])));
}

export function sha256JsonPostgresProgramReceipt(receipt) {
  return createHash("sha256").update(canonicalizeJsonPostgresProgramReceipt(receipt)).digest("hex");
}

export function jsonPostgresProgramReceiptMetadata(kind) {
  if (!KIND_SET.has(kind)) fail("program receipt kind is invalid");
  return Object.freeze({
    phase: KIND_PHASE[kind],
    environment: KIND_ENVIRONMENT[kind],
    profile: KIND_PROFILE[kind],
  });
}

export function validateJsonPostgresProgramReceipt(receipt = {}, expected = {}) {
  closedObject(receipt, CLOSED_KEYS, "program receipt");
  if (receipt.schema_version !== JSON_POSTGRES_PROGRAM_RECEIPT_VERSION) fail("program receipt schema is invalid");
  if (!TOKEN.test(receipt.receipt_id ?? "") || !KIND_SET.has(receipt.receipt_kind)) fail("program receipt identity is invalid");
  if (receipt.phase !== KIND_PHASE[receipt.receipt_kind]
    || receipt.environment !== KIND_ENVIRONMENT[receipt.receipt_kind]
    || receipt.profile !== KIND_PROFILE[receipt.receipt_kind]) {
    fail("program receipt phase/environment/profile does not match its kind");
  }
  if (!TOKEN.test(receipt.signer_key_id ?? "")) fail("program receipt signer key id is invalid");
  if (!["PASS", "FAIL", "BLOCKED", "APPROVAL_REQUIRED"].includes(receipt.execution_state)) fail("program receipt execution state is invalid");
  if (!SHA1.test(receipt.source_sha ?? "") || !SHA1.test(receipt.source_tree ?? "")) fail("program receipt source binding is invalid");
  for (const key of ["packet_sha256", "bindings_sha256", "result_sha256"]) {
    if (!SHA256.test(receipt[key] ?? "")) fail(`program receipt ${key} is invalid`);
  }
  const startedAt = timestamp(receipt.started_at, "started_at");
  const finishedAt = timestamp(receipt.finished_at, "finished_at");
  if (finishedAt < startedAt) fail("program receipt time interval is invalid");
  if (typeof receipt.command !== "string"
    || !receipt.command.trim()
    || commandContainsSensitiveMaterial(receipt.command)) {
    fail("program receipt command is missing or contains sensitive material");
  }
  if (!Number.isSafeInteger(receipt.exit_code)) fail("program receipt exit_code is invalid");
  if (receipt.execution_state === "PASS" && receipt.exit_code !== 0) fail("PASS receipt must have exit_code 0");
  if (receipt.execution_state === "FAIL" && receipt.exit_code === 0) fail("FAIL receipt must have non-zero exit_code");
  if (!Array.isArray(receipt.predecessor_receipt_sha256)
    || receipt.predecessor_receipt_sha256.some((digest) => !SHA256.test(digest))
    || new Set(receipt.predecessor_receipt_sha256).size !== receipt.predecessor_receipt_sha256.length) {
    fail("program receipt predecessor digests are invalid");
  }
  assertSafeCounts(receipt.safe_counts);
  closedObject(receipt.claims, CLAIM_KEYS, "program receipt claims");
  if (CLAIM_KEYS.some((key) => typeof receipt.claims[key] !== "boolean")) fail("program receipt claims must be boolean");
  if (receipt.claims.raw_value_returned || receipt.claims.pii_returned || receipt.claims.secret_material_returned || receipt.claims.dms_bytes_in_evidence) {
    fail("program receipt contains a prohibited evidence claim");
  }
  if (receipt.claims.production_write && receipt.receipt_kind !== "cut-009") fail("only CUT-009 may claim the production migration write");
  if (receipt.receipt_kind === "first-write-boundary" && receipt.claims.first_production_write_started !== false) {
    fail("first-write boundary must prove the write has not started");
  }
  if (receipt.claims.json_authority_disabled
    && !["cut-011", "cut-012", "go-live", "w15-relational-projection"].includes(receipt.receipt_kind)) {
    fail("JSON authority disablement claim is out of phase");
  }
  if (receipt.claims.release && !["formal-release", "go-live"].includes(receipt.receipt_kind)) fail("release claim is out of phase");
  if (receipt.claims.go_live && receipt.receipt_kind !== "go-live") fail("go-live claim is out of phase");
  if (expected.sourceSha && receipt.source_sha !== expected.sourceSha) fail("program receipt source SHA drifted");
  if (expected.sourceTree && receipt.source_tree !== expected.sourceTree) fail("program receipt source tree drifted");
  if (expected.packetSha256 && receipt.packet_sha256 !== expected.packetSha256) fail("program receipt packet binding drifted");
  if (expected.bindingsSha256 && receipt.bindings_sha256 !== expected.bindingsSha256) fail("program receipt bindings drifted");
  const canonicalSha256 = sha256JsonPostgresProgramReceipt(receipt);
  return Object.freeze({
    valid: true,
    receipt_id: receipt.receipt_id,
    receipt_kind: receipt.receipt_kind,
    phase: receipt.phase,
    environment: receipt.environment,
    profile: receipt.profile,
    execution_state: receipt.execution_state,
    source_sha: receipt.source_sha,
    source_tree: receipt.source_tree,
    packet_sha256: receipt.packet_sha256,
    bindings_sha256: receipt.bindings_sha256,
    predecessor_receipt_sha256: Object.freeze([...receipt.predecessor_receipt_sha256]),
    canonical_sha256: canonicalSha256,
    result_sha256: receipt.result_sha256,
    safe_counts: Object.freeze({ ...receipt.safe_counts }),
    claims: Object.freeze({ ...receipt.claims }),
  });
}

export function verifyJsonPostgresProgramReceipt({
  receipt,
  signature,
  trustRegistry,
  now = Date.now(),
  expected = {},
} = {}) {
  const validated = validateJsonPostgresProgramReceipt(receipt, expected);
  if (trustRegistry?.schema_version !== "law-firm-os.runtime-safety.approval-trust-registry.v1" || !Array.isArray(trustRegistry.keys)) {
    fail("program receipt trust registry is invalid");
  }
  const key = trustRegistry.keys.find((candidate) => candidate.key_id === receipt.signer_key_id);
  if (!key || key.algorithm !== "Ed25519" || key.revoked_at != null
    || !key.roles?.includes("owner")
    || !key.actions?.includes(JSON_POSTGRES_PROGRAM_RECEIPT_ACTION)
    || !key.environments?.includes(receipt.environment)) {
    fail("program receipt signer is not authorized");
  }
  const validFrom = timestamp(key.valid_from, "key.valid_from");
  const validUntil = timestamp(key.valid_until, "key.valid_until");
  if (now < validFrom || now > validUntil
    || Date.parse(receipt.started_at) < validFrom
    || Date.parse(receipt.finished_at) > validUntil) fail("program receipt signer is outside its validity interval");
  const bytes = Buffer.isBuffer(signature) ? signature : Buffer.from(signature ?? "", "base64");
  if (bytes.length !== 64 || !verifySignature(null, Buffer.from(canonicalizeJsonPostgresProgramReceipt(receipt)), key.public_key_spki_pem, bytes)) {
    fail("program receipt signature is invalid");
  }
  return Object.freeze({ ...validated, signature_valid: true, signer_key_id: key.key_id });
}

function requirePredecessor(receipt, kinds, byKind) {
  const expectedDigests = kinds.map((kind) => byKind.get(kind)?.canonical_sha256);
  if (expectedDigests.some((digest) => !digest)) fail(`${receipt.receipt_kind} receipt set predecessor is missing`);
  for (const digest of expectedDigests) {
    if (!receipt.predecessor_receipt_sha256.includes(digest)) fail(`${receipt.receipt_kind} receipt lacks a required predecessor`);
  }
}

export function validateJsonPostgresProgramReceiptSet(receipts, {
  requiredKinds,
  sourceSha,
  sourceTree,
  packetSha256,
  bindingsSha256,
  externalReceipts = [],
  w12TerminalReceiptSha256 = null,
} = {}) {
  if (!Array.isArray(receipts)) fail("program receipt set must be an array");
  const validated = receipts.map((receipt) => validateJsonPostgresProgramReceipt(receipt, {
    sourceSha,
    sourceTree,
    packetSha256,
    bindingsSha256,
  }));
  if (!Array.isArray(externalReceipts)) fail("external program receipt set must be an array");
  const externalValidated = externalReceipts.map((receipt) => validateJsonPostgresProgramReceipt(receipt));
  const currentKinds = new Set(validated.map((receipt) => receipt.receipt_kind));
  const byKind = new Map();
  for (const receipt of [...externalValidated, ...validated]) {
    if (byKind.has(receipt.receipt_kind)) fail("program receipt set contains duplicate kinds");
    if (receipt.execution_state !== "PASS") fail("program receipt set contains a non-PASS receipt");
    byKind.set(receipt.receipt_kind, receipt);
  }
  const missing = (requiredKinds ?? []).filter((kind) => !byKind.has(kind));
  if (missing.length > 0) fail(`program receipt set is missing required kinds: ${missing.join(",")}`);
  if (w12TerminalReceiptSha256 != null) {
    if (!SHA256.test(w12TerminalReceiptSha256)
      || byKind.get("w12-terminal")?.canonical_sha256 !== w12TerminalReceiptSha256) {
      fail("program receipt set W12 terminal binding drifted");
    }
  }
  if (currentKinds.has("w12-terminal")) {
    requirePredecessor(byKind.get("w12-terminal"), JSON_POSTGRES_W12_RECEIPTS.filter((kind) => kind !== "w12-terminal"), byKind);
  } else if (byKind.has("w12-terminal")
    && byKind.get("w12-terminal").predecessor_receipt_sha256.length !== JSON_POSTGRES_W12_RECEIPTS.length - 1) {
    fail("external W12 terminal receipt does not bind the complete component receipt set");
  }
  if (byKind.has("cut-009")) requirePredecessor(byKind.get("cut-009"), ["w12-terminal", "cut-008", "source-freeze", "first-write-boundary"], byKind);
  if (byKind.has("cut-010")) requirePredecessor(byKind.get("cut-010"), ["cut-009"], byKind);
  if (byKind.has("cut-011")) requirePredecessor(byKind.get("cut-011"), ["cut-010"], byKind);
  if (byKind.has("cut-012")) requirePredecessor(byKind.get("cut-012"), ["cut-008", "cut-009", "cut-010", "cut-011"], byKind);
  if (byKind.has("formal-release")) requirePredecessor(byKind.get("formal-release"), ["cut-012", "macos-signing", "windows-signing"], byKind);
  if (byKind.has("go-live")) requirePredecessor(byKind.get("go-live"), ["cut-012", "formal-release"], byKind);
  if (byKind.has("w15-relational-projection")) {
    requirePredecessor(byKind.get("w15-relational-projection"), ["w12-terminal", "cut-012", "go-live"], byKind);
  }
  return Object.freeze({
    valid: true,
    receipt_count: validated.length + externalValidated.length,
    current_receipt_count: validated.length,
    external_receipt_count: externalValidated.length,
    pass_count: validated.length + externalValidated.length,
    missing_kind_count: 0,
  });
}
