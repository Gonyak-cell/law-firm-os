#!/usr/bin/env node

/**
 * Verify the evidence boundary for VC-CL-PKG-001.
 *
 * This verifier intentionally does not build, deploy, open a browser, or make
 * network calls. It only reads the manifest and the explicitly referenced
 * files. A local run proves local build/test receipts but remains
 * BLOCKED_EXTERNAL. A release run proves an exact-main package only when every
 * external receipt is present and all of the SHA bindings agree.
 */

import { execFileSync } from "node:child_process";
import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";

export const CLIENT_OPERATIONS_PACKAGE_SCHEMA =
  "law-firm-os.client-operations-package-evidence.v1";
export const CLIENT_OPERATIONS_PACKAGE_SCENARIO = "VC-CL-PKG-001";
export const CLIENT_OPERATIONS_PACKAGE_MODES = Object.freeze(["local", "release"]);
export const CLIENT_OPERATIONS_PACKAGE_COMPONENTS = Object.freeze([
  "web_build",
  "addin_build",
  "migration_receipt",
  "api_signed_session_receipt",
  "package_artifact",
  "logged_in_screen_receipt",
  "deploy_receipt",
]);
export const CLIENT_OPERATIONS_TRUST_ANCHOR_ENV =
  "LAWOS_CLIENT_OPERATIONS_TRUST_ANCHOR_FILE";
const TRUST_ANCHOR_SCHEMA = "law-firm-os.client-operations.trust-anchor.v1";
const TRUST_ANCHOR_FIELDS = new Set(["schema_version", "key_id", "public_key_der_base64"]);

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_SHA = /^[0-9a-f]{40}$/u;
const BRANCH = /^[A-Za-z0-9._/-]{1,256}$/u;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_PNG_BYTES = 25 * 1024 * 1024;
const MAX_PNG_DIMENSION = 8192;
const MAX_PNG_DECODED_BYTES = 128 * 1024 * 1024;
const RECEIPT_ATTESTATION_SCHEMA = "law-firm-os.client-operations.receipt-attestation.v1";
const ARTIFACT_MANIFEST_SCHEMA = "law-firm-os.client-operations.artifact-manifest.v1";
const SCREEN_METADATA_SCHEMA = "law-firm-os.client-operations.screen-runtime-metadata.v1";
const API_RESPONSE_SCHEMA = "law-firm-os.client-operations.api-response.v1";
const RUNTIME_CAPTURE_SCHEMA = "law-firm-os.client-operations.runtime-capture-receipt.v1";
const ALLOWED_ATTESTATION_ISSUERS = new Set(["ci", "github-actions", "release-operator", "browser-runner"]);
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const RECEIPT_ATTESTATION_FIELDS = new Set([
  "schema_version", "issuer", "public_key_id", "independently_generated", "signed",
  "signature_algorithm", "signature", "provenance_type", "run_id", "workflow_run_id", "generated_by",
  "generated_at", "git_object_exists", "receipt_sha256", "source_sha", "artifact_sha256",
  "artifact_manifest_sha256", "artifact_kind", "screen_sha256", "runtime_metadata_sha256",
  "api_response_sha256", "fixture_values_sha256", "capture_receipt_sha256",
]);
const ARTIFACT_MANIFEST_FIELDS = new Set([
  "schema_version", "artifact_kind", "commit_sha", "run_id", "artifact_sha256", "manifest_digest",
]);
const API_RESPONSE_FIELDS = new Set([
  "schema_version", "run_id", "source_sha", "api_artifact_sha256", "status",
  "signed_session_observed", "session_principal_source", "fixture_values",
]);
const FIXTURE_VALUE_FIELDS = new Set(["client_ref", "matter_ref", "phase", "open_balance_cents", "currency"]);
const SCREEN_METADATA_FIELDS = new Set([
  "schema_version", "run_id", "screenshot_sha256", "source_sha", "package_artifact_sha256",
  "api_artifact_sha256", "api_response_sha256", "fixture_values_sha256", "displayed_fixture_values",
  "non_placeholder", "content_marker_count", "app", "runtime", "screenshot",
]);
const SCREEN_APP_FIELDS = new Set(["name", "version", "build_sha"]);
const SCREEN_RUNTIME_FIELDS = new Set(["name", "version", "authenticated", "session_principal_source", "route"]);
const SCREENSHOT_FIELDS = new Set(["format", "width", "height", "markers", "captured_at"]);
const CAPTURE_FIELDS = new Set([
  "schema_version", "public_key_id", "issuer", "signature_algorithm", "signature", "run_id",
  "source_sha", "package_artifact_sha256", "api_artifact_sha256", "api_response_sha256",
  "fixture_values_sha256", "screenshot_sha256", "runtime_metadata_sha256", "authenticated",
  "session_principal_source", "route", "browser", "browser_run_id", "captured_at",
  "displayed_fixture_values",
]);
const MANIFEST_FIELDS = new Set([
  "schema_version", "verification", "source", "web_build", "addin_build", "migration_receipt",
  "api_signed_session_receipt", "package_artifact", "logged_in_screen_receipt", "deploy_receipt",
]);
const VERIFICATION_FIELDS = new Set(["mode", "scenario_id", "run_id", "claims"]);
const CLAIM_FIELDS = new Set(["exact_main", "logged_in_screen", "deployed", "source_api_package_screen_sha_bound"]);
const SOURCE_FIELDS = new Set(["sha", "branch", "main_sha", "worktree_dirty"]);
const BUILD_ENTRY_FIELDS = new Set(["receipt_path", "receipt_sha256", "attestation_path", "attestation_sha256", "artifact_path", "artifact_sha256", "embedded_manifest_path", "embedded_manifest_sha256", "source_sha"]);
const MIGRATION_ENTRY_FIELDS = new Set(["receipt_path", "receipt_sha256", "attestation_path", "attestation_sha256", "migration_sha256"]);
const API_ENTRY_FIELDS = new Set(["receipt_path", "receipt_sha256", "attestation_path", "attestation_sha256", "api_artifact_path", "api_artifact_sha256", "api_embedded_manifest_path", "api_embedded_manifest_sha256", "api_response_path", "api_response_sha256", "fixture_values_sha256"]);
const PACKAGE_ENTRY_FIELDS = new Set(["artifact_path", "artifact_sha256", "embedded_manifest_path", "embedded_manifest_sha256", "receipt_path", "receipt_sha256", "attestation_path", "attestation_sha256", "source_sha", "web_artifact_sha256", "addin_artifact_sha256", "migration_sha256", "api_artifact_sha256"]);
const SCREEN_ENTRY_FIELDS = new Set(["receipt_path", "receipt_sha256", "attestation_path", "attestation_sha256", "screen_path", "screen_sha256", "package_artifact_sha256", "runtime_metadata_path", "runtime_metadata_sha256", "capture_receipt_path", "capture_receipt_sha256"]);
const DEPLOY_ENTRY_FIELDS = new Set(["receipt_path", "receipt_sha256", "attestation_path", "attestation_sha256"]);
const DEPLOY_REQUEST_FIELDS = new Set(["method", "url", "body_sha256", "request_sha256"]);
const DEPLOY_RESPONSE_FIELDS = new Set(["status", "url", "body_sha256", "response_sha256", "package_artifact_sha256", "source_sha"]);
const EXTERNAL_GATE_FIELDS = new Set(["status", "authoritative", "gate_id", "provider"]);
const RECEIPT_FIELDS = Object.freeze({
  web: new Set(["schema_version", "status", "run_id", "source_sha", "artifact_sha256", "embedded_manifest_sha256", "embedded_commit_sha", "tests_passed", "test_status", "tests"]),
  addin: new Set(["schema_version", "status", "run_id", "source_sha", "artifact_sha256", "embedded_manifest_sha256", "embedded_commit_sha", "tests_passed", "test_status", "tests"]),
  migration: new Set(["schema_version", "status", "run_id", "source_sha", "migration_sha256", "artifact_sha256"]),
  api: new Set(["schema_version", "status", "run_id", "source_sha", "signed_session_observed", "session_principal_source", "api_artifact_sha256", "api_embedded_manifest_sha256", "api_response_path", "api_response_sha256", "fixture_values_sha256"]),
  package: new Set(["schema_version", "status", "run_id", "source_sha", "artifact_sha256", "embedded_manifest_sha256", "embedded_commit_sha", "web_artifact_sha256", "addin_artifact_sha256", "migration_sha256", "api_artifact_sha256"]),
  screen: new Set(["schema_version", "status", "run_id", "source_sha", "package_artifact_sha256", "api_artifact_sha256", "logged_in", "login_state", "signed_session_observed", "screen_sha256", "runtime_metadata_sha256", "api_response_sha256", "fixture_values_sha256", "capture_receipt_sha256", "capture_receipt_path"]),
  deploy: new Set(["schema_version", "status", "run_id", "source_sha", "package_artifact_sha256", "deployed", "environment", "authoritative_url", "request", "response", "external_gate"]),
});

function normalizeSecurityKey(value) {
  return String(value)
    .normalize("NFKC")
    .replace(/[АВСЕНКМНОРТХавсенкмнортыхΥΖυζαβϵηικμνορτχ]/gu, (character) => ({
      А: "A", В: "B", С: "C", Е: "E", Н: "H", К: "K", М: "M", Н: "H", О: "O", Р: "P", Т: "T", Х: "X", Υ: "Y", Ζ: "Z",
      а: "a", в: "b", с: "c", е: "e", н: "h", к: "k", м: "m", о: "o", р: "p", т: "t", х: "x", у: "y", ы: "y", υ: "y", ζ: "z",
      α: "a", β: "b", ϵ: "e", η: "h", ι: "i", κ: "k", μ: "m", ν: "n", ο: "o", ρ: "p", τ: "t", χ: "x",
    }[character] ?? character))
    .replace(/[\u0000-\u001f\u007f]/gu, "")
    .replace(/[^a-z0-9]+/giu, "")
    .toLowerCase();
}

const FORBIDDEN_NORMALIZED_KEYS = Object.freeze([
  /(?:session|access|refresh)?token(?:value|material)?/u,
  /(?:api|private|secret|signing)key(?:value|material)?/u,
  /(?:client)?secret/u,
  /password/u,
  /credential/u,
  /authorization/u,
  /bearer/u,
  /(?:oauth|jwt|cookie)/u,
  /(?:raw)?(?:mime|body|payload|content)(?!marker|sha(?:256)?|hash|digest)/u,
  /(?:mailbox|email|phone|telephone|postal|street|home|personal)?address/u,
  /(?:email|phone|telephone)(?:number)?/u,
  /(?:person|client|contact|full|display)name/u,
  /(?:dateofbirth|birthdate|dob|ssn|socialsecurity|nationalid|taxid)/u,
  /(?:bank|account|routing|transit|sort|iban|swift|card|credit)account?(?:number|name)?/u,
  /(?:bankaccount|account|routing|transit|sortcode|iban|swift|card|creditcard)(?:number|name)?/u,
  /(?:rawmessage|messagebody|mailbox|party(?:name|id|address)|client(?:name|id|address)|matter(?:name|id|address))/u,
]);
const ALLOWED_HASHED_PII_SUFFIX = /hash$/u;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function requireRecord(value, label) {
  if (!isRecord(value)) throw new TypeError(`${label} must be an object`);
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function assertAllowedKeys(value, label, allowedKeys) {
  if (!isRecord(value)) throw new TypeError(`${label} must be an object`);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new TypeError(`${label} contains unknown field ${normalizeSecurityKey(key)}`);
    }
  }
}

function requireRunId(value, label = "verification.run_id") {
  if (typeof value !== "string" || !RUN_ID.test(value)) {
    throw new TypeError(`${label} must be a safe run identifier`);
  }
  return value;
}

function parseJsonErrorPosition(error) {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/position\s+(\d+)/iu);
  return match ? match[1] : "unknown";
}

function requireSha(value, label, pattern = SHA256) {
  if (typeof value !== "string" || !pattern.test(value)) {
    const expected = pattern === GIT_SHA ? "full 40-character Git SHA" : "64-character lowercase SHA-256";
    throw new TypeError(`${label} must be a ${expected}`);
  }
  return value;
}

function canonicalRelativePath(root, relativePath, label) {
  requireString(relativePath, label);
  if (path.isAbsolute(relativePath) || relativePath.startsWith("~")) {
    throw new TypeError(`${label} must be a relative path inside the repository`);
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, resolved);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new TypeError(`${label} must stay inside the repository`);
  }
  return resolved;
}

function assertInsideRoot(root, candidate, label) {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(candidate);
  const relative = path.relative(resolvedRoot, resolved);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new TypeError(`${label} must stay inside the repository`);
  }
  return resolved;
}

function assertNoSecretKeys(value, label, pathSegments = [], seen = new Set()) {
  if (!isRecord(value) && !Array.isArray(value)) return;
  if (seen.has(value)) throw new TypeError(`${label} contains a cyclic value`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoSecretKeys(entry, `${label}[${index}]`, [...pathSegments, String(index)], seen));
    seen.delete(value);
    return;
  }
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = normalizeSecurityKey(key);
    const normalizedPath = [...pathSegments, key].map(normalizeSecurityKey).join(".");
    const forbidden = !ALLOWED_HASHED_PII_SUFFIX.test(normalizedKey)
      && FORBIDDEN_NORMALIZED_KEYS.some((pattern) => pattern.test(normalizedKey) || pattern.test(normalizedPath));
    if (forbidden) {
      throw new TypeError(`${label} contains forbidden secret or PII key path ${normalizedPath}`);
    }
    if (normalizedKey.includes("path") && typeof entry === "string") {
      const candidate = entry.normalize("NFKC");
      if (candidate.includes("\u0000") || candidate.startsWith("~") || path.isAbsolute(candidate)
          || /(?:^|[\\/])\.\.(?:[\\/]|$)/u.test(candidate)
          || /^(?:file|data|javascript):/iu.test(candidate)) {
        throw new TypeError(`${label} contains forbidden path value at ${normalizedPath}`);
      }
    }
    assertNoSecretKeys(entry, `${label}.${key}`, [...pathSegments, key], seen);
  }
  seen.delete(value);
}

function assertRegularPath(root, candidate, label) {
  const resolved = assertInsideRoot(root, candidate, label);
  if (!existsSync(resolved)) throw new Error(`missing ${label}: ${path.relative(root, resolved)}`);
  const stat = lstatSync(resolved);
  if (stat.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link`);
  const realRoot = canonicalFilesystemPath(root);
  const realCandidate = canonicalFilesystemPath(resolved);
  const realRelative = path.relative(realRoot, realCandidate);
  if (!realRelative || realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
    throw new Error(`${label} must resolve inside the repository`);
  }
  return resolved;
}

function digestFile(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function digestDirectory(directoryPath) {
  const hash = createHash("sha256");
  const files = [];

  function collect(current, relativeRoot) {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((left, right) => (
      left.name.localeCompare(right.name, "en")
    ))) {
      const absolute = path.join(current, entry.name);
      const relative = relativeRoot ? path.join(relativeRoot, entry.name) : entry.name;
      if (entry.isSymbolicLink()) throw new Error(`directory artifact contains symbolic link: ${relative}`);
      if (entry.isDirectory()) collect(absolute, relative);
      else if (entry.isFile()) files.push({ absolute, relative });
      else throw new Error(`directory artifact contains unsupported entry: ${relative}`);
    }
  }

  collect(directoryPath, "");
  for (const file of files) {
    hash.update(file.relative.replaceAll(path.sep, "/"));
    hash.update("\0");
    hash.update(digestFile(file.absolute));
    hash.update("\n");
  }
  return hash.digest("hex");
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function canonicalJson(value) {
  return JSON.stringify(stableValue(value));
}

function canonicalDigest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function attestationPayload(attestation) {
  const payload = { ...attestation };
  delete payload.signature;
  return canonicalJson(payload);
}

const KEY_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

function createAttestationVerifier({ keyId, publicKey, source }) {
  if (typeof keyId !== "string" || !KEY_ID.test(keyId)) {
    throw new TypeError("attestation trust anchor key_id must be a safe identifier");
  }
  let normalizedKey;
  try {
    if (publicKey?.type === "private") throw new TypeError("private keys are not valid trust anchors");
    normalizedKey = publicKey?.type === "public" && typeof publicKey.export === "function"
      ? publicKey
      : createPublicKey(publicKey);
  } catch {
    throw new TypeError("attestation trust anchor public key is invalid");
  }
  if (normalizedKey.type !== "public" || normalizedKey.asymmetricKeyType !== "ed25519") {
    throw new TypeError("attestation trust anchor must be an Ed25519 public key");
  }
  return Object.freeze({
    key_id: keyId,
    source,
    verify(attestation) {
      if (attestation.public_key_id !== keyId
          || attestation.signature_algorithm !== "ed25519"
          || typeof attestation.signature !== "string") return false;
      try {
        return verifySignature(
          null,
          Buffer.from(attestationPayload(attestation)),
          normalizedKey,
          Buffer.from(attestation.signature, "base64"),
        );
      } catch {
        return false;
      }
    },
  });
}

function isPathWithin(root, candidate) {
  const relative = path.relative(path.normalize(root), path.normalize(candidate));
  return relative === ""
    || (!path.isAbsolute(relative)
      && relative !== ".."
      && !relative.startsWith(`..${path.sep}`));
}

const nativeRealpathSync = typeof realpathSync.native === "function"
  ? realpathSync.native.bind(realpathSync)
  : realpathSync;

function lexicalFilesystemPath(candidate) {
  return path.normalize(path.resolve(candidate));
}

function canonicalFilesystemPath(candidate) {
  return path.normalize(nativeRealpathSync(lexicalFilesystemPath(candidate)));
}

function canonicalLexicalFilesystemPath(candidate) {
  const lexical = lexicalFilesystemPath(candidate);
  const suffix = [path.basename(lexical)];
  let current = path.dirname(lexical);
  while (true) {
    try {
      return path.normalize(path.join(nativeRealpathSync(current), ...suffix));
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
      const parent = path.dirname(current);
      if (parent === current) throw error;
      suffix.unshift(path.basename(current));
      current = parent;
    }
  }
}

const PLATFORM_ROOT_SYMLINK_TARGETS = process.platform === "darwin"
  ? new Map([
    [path.resolve("/var"), path.resolve("/private/var")],
    [path.resolve("/tmp"), path.resolve("/private/tmp")],
    [path.resolve("/etc"), path.resolve("/private/etc")],
  ])
  : new Map();

function isAllowedPlatformRootAlias(candidate, root) {
  if (path.dirname(candidate) !== root) return false;
  const expectedTarget = PLATFORM_ROOT_SYMLINK_TARGETS.get(candidate);
  if (!expectedTarget) return false;
  try {
    return path.normalize(nativeRealpathSync(candidate)) === path.normalize(expectedTarget);
  } catch {
    return false;
  }
}

function assertNoSymlinkComponents(candidate, label) {
  const lexical = lexicalFilesystemPath(candidate);
  const parsed = path.parse(lexical);
  // Inspect the configured path itself before any realpath call. This keeps a
  // symlinked trust-anchor file visible instead of silently canonicalizing to
  // its external target.
  try {
    const directStat = lstatSync(lexical);
    if (directStat.isSymbolicLink() && !isAllowedPlatformRootAlias(lexical, parsed.root)) {
      throw new TypeError(`${label} must not use a symbolic link`);
    }
  } catch (error) {
    if (error instanceof TypeError) throw error;
    if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") {
      throw new TypeError(`${label} path cannot be inspected`);
    }
  }
  let current = parsed.root;
  for (const component of lexical.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    let stat;
    try {
      stat = lstatSync(current);
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === "ENOTDIR") break;
      throw new TypeError(`${label} path cannot be inspected`);
    }
    if (stat.isSymbolicLink()) {
      // Native realpath normalization removes only the explicit OS aliases
      // above. Every other symlink, including an arbitrary root-level link,
      // is a repository/operator-controlled path and is rejected.
      if (!isAllowedPlatformRootAlias(current, parsed.root)) {
        throw new TypeError(`${label} must not use a symbolic link`);
      }
    }
  }
}

function loadExternalAttestationVerifier(root) {
  const configuredPath = process.env[CLIENT_OPERATIONS_TRUST_ANCHOR_ENV];
  if (!configuredPath) {
    return {
      status: "BLOCKED_EXTERNAL",
      reason: `release verification requires an externally managed trust anchor via ${CLIENT_OPERATIONS_TRUST_ANCHOR_ENV}`,
      verifier: null,
    };
  }
  if (!path.isAbsolute(configuredPath)) {
    return {
      status: "FAIL",
      reason: `${CLIENT_OPERATIONS_TRUST_ANCHOR_ENV} must be an absolute path outside the repository`,
      verifier: null,
    };
  }
  const lexicalRoot = lexicalFilesystemPath(root);
  const lexicalTrustAnchor = lexicalFilesystemPath(configuredPath);
  if (isPathWithin(lexicalRoot, lexicalTrustAnchor)) {
    return {
      status: "FAIL",
      reason: "external attestation trust anchor must be outside the repository",
      verifier: null,
    };
  }
  try {
    // Reject the configured path and every existing parent component before
    // canonicalizing anything; otherwise a symlink can hide its identity.
    assertNoSymlinkComponents(configuredPath, "external attestation trust anchor");
  } catch (error) {
    return {
      status: "FAIL",
      reason: `external attestation trust anchor is invalid: ${errorMessage(error)}`,
      verifier: null,
    };
  }
  let resolvedRoot;
  try {
    resolvedRoot = canonicalFilesystemPath(root);
  } catch {
    resolvedRoot = lexicalRoot;
  }
  let canonicalLexicalTrustAnchor;
  try {
    canonicalLexicalTrustAnchor = canonicalLexicalFilesystemPath(configuredPath);
  } catch {
    canonicalLexicalTrustAnchor = lexicalTrustAnchor;
  }
  if (isPathWithin(resolvedRoot, canonicalLexicalTrustAnchor)) {
    return {
      status: "FAIL",
      reason: "external attestation trust anchor must be outside the repository",
      verifier: null,
    };
  }
  let trustAnchorPath;
  try {
    trustAnchorPath = canonicalFilesystemPath(configuredPath);
  } catch {
    return {
      status: "FAIL",
      reason: "external attestation trust anchor is missing or unreadable",
      verifier: null,
    };
  }
  if (isPathWithin(resolvedRoot, trustAnchorPath)) {
    return {
      status: "FAIL",
      reason: "external attestation trust anchor must be outside the repository",
      verifier: null,
    };
  }
  try {
    if (!lstatSync(trustAnchorPath).isFile()) throw new TypeError("trust anchor must be a regular file");
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(trustAnchorPath, "utf8"));
    } catch (error) {
      throw new TypeError(`trust anchor is not valid JSON at position ${parseJsonErrorPosition(error)}`);
    }
    requireRecord(parsed, "external attestation trust anchor JSON");
    assertAllowedKeys(parsed, "external attestation trust anchor", TRUST_ANCHOR_FIELDS);
    if (parsed.schema_version !== TRUST_ANCHOR_SCHEMA) {
      throw new TypeError("external attestation trust anchor schema mismatch");
    }
    if (typeof parsed.public_key_der_base64 !== "string"
        || !/^[A-Za-z0-9+/]+={0,2}$/u.test(parsed.public_key_der_base64)) {
      throw new TypeError("external attestation trust anchor public_key_der_base64 is invalid");
    }
    const publicKey = createPublicKey({
      key: Buffer.from(parsed.public_key_der_base64, "base64"),
      format: "der",
      type: "spki",
    });
    return {
      status: "OK",
      reason: null,
      verifier: createAttestationVerifier({
        keyId: parsed.key_id,
        publicKey,
        source: "external",
      }),
    };
  } catch (error) {
    return {
      status: "FAIL",
      reason: `external attestation trust anchor is invalid: ${errorMessage(error)}`,
      verifier: null,
    };
  }
}

function resolveAttestationVerifier({ root, mode }) {
  if (mode !== "release") return { status: "SKIP", reason: null, verifier: null };
  return loadExternalAttestationVerifier(root);
}

function verifyTrustedAttestationSignature(attestation, verifier) {
  return verifier?.verify(attestation) === true;
}

function nonPlaceholderSha(value, label, pattern = SHA256) {
  const sha = requireSha(value, label, pattern);
  if (/^(.)\1+$/u.test(sha)) throw new TypeError(`${label} must not be a placeholder SHA`);
  return sha;
}

function nonPlaceholderString(value, label) {
  requireString(value, label);
  if (/(?:placeholder|fake|dummy|synthetic|example|test)/iu.test(value)) {
    throw new TypeError(`${label} must not be a placeholder value`);
  }
  return value;
}

function gitObjectExists(root, sha, objectType = "commit") {
  if (!GIT_SHA.test(sha)) return false;
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{${objectType}}`], {
      cwd: root,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function artifactMarker(bytes) {
  const text = Buffer.from(bytes).toString("utf8");
  const commit = text.match(/LAWOS_ARTIFACT_COMMIT_SHA=([0-9a-f]{40})/u)?.[1] ?? null;
  const manifest = text.match(/LAWOS_ARTIFACT_MANIFEST_DIGEST=([0-9a-f]{64})/u)?.[1] ?? null;
  const run = text.match(/LAWOS_ARTIFACT_RUN_ID=([A-Za-z0-9._-]{1,128})/u)?.[1] ?? null;
  return { commit_sha: commit, manifest_digest: manifest, run_id: run };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parsePng(filePath) {
  const bytes = readFileSync(filePath);
  if (bytes.length < 64 || bytes.length > MAX_PNG_BYTES || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("screenshot must contain a real PNG signature");
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = null;
  let sawIhdr = false;
  let sawIdat = false;
  let sawIend = false;
  const idat = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcEnd = dataEnd + 4;
    if (dataEnd > bytes.length || crcEnd > bytes.length) throw new Error("screenshot PNG chunk is truncated");
    const data = bytes.subarray(dataStart, dataEnd);
    const expectedCrc = bytes.readUInt32BE(dataEnd);
    if (crc32(Buffer.concat([bytes.subarray(offset + 4, offset + 8), data])) !== expectedCrc) {
      throw new Error("screenshot PNG chunk CRC is invalid");
    }
    if (type === "IHDR") {
      if (length !== 13 || sawIhdr) throw new Error("screenshot PNG IHDR is invalid");
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9];
      if (bitDepth !== 8 || ![2, 3, 6].includes(colorType)
          || width > MAX_PNG_DIMENSION || height > MAX_PNG_DIMENSION) {
        throw new Error("screenshot PNG color format or dimensions are unsupported");
      }
      sawIhdr = true;
    } else if (type === "IDAT") {
      sawIdat = true;
      idat.push(data);
    } else if (type === "IEND") {
      if (length !== 0) throw new Error("screenshot PNG IEND is invalid");
      sawIend = true;
      break;
    }
    offset = crcEnd;
  }
  if (!sawIhdr || !sawIdat || !sawIend || width < 320 || height < 180) {
    throw new Error("screenshot PNG must have a non-placeholder viewport of at least 320x180");
  }
  let decoded;
  try {
    decoded = inflateSync(Buffer.concat(idat), { maxOutputLength: MAX_PNG_DECODED_BYTES });
  } catch (error) {
    throw new Error(`screenshot PNG pixel data is invalid: ${errorMessage(error)}`);
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const minimumDecodedBytes = height * (1 + width * channels);
  if (minimumDecodedBytes > MAX_PNG_DECODED_BYTES
      || decoded.length < minimumDecodedBytes
      || decoded.length > MAX_PNG_DECODED_BYTES
      || new Set(decoded).size < 4) {
    throw new Error("screenshot PNG pixel data is empty or placeholder-like");
  }
  return { width, height, bytes: bytes.length };
}

function validateScreenMetadata({ root, entry, sourceSha, runId, packageArtifact, api, screenSha, png, errors }) {
  const metadataPath = valueOrAlias(entry, ["runtime_metadata_path", "screen_metadata_path"]);
  let expectedMetadataSha;
  try {
    expectedMetadataSha = nonPlaceholderSha(
      valueOrAlias(entry, ["runtime_metadata_sha256", "screen_metadata_sha256"]),
      "logged_in_screen_receipt.runtime_metadata_sha256",
    );
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (!metadataPath || !expectedMetadataSha) return null;
  let loaded;
  try {
    loaded = readJsonFile(root, metadataPath, "logged_in_screen runtime metadata");
  } catch (error) {
    errors.push(errorMessage(error));
    return null;
  }
  const actualMetadataSha = digestFile(loaded.filePath);
  if (actualMetadataSha !== expectedMetadataSha) errors.push("logged_in_screen runtime metadata SHA mismatch/tampered");
  const metadata = loaded.parsed;
  try {
    assertNoSecretKeys(metadata, "logged_in_screen runtime metadata");
    assertAllowedKeys(metadata, "logged_in_screen runtime metadata", SCREEN_METADATA_FIELDS);
    assertAllowedKeys(metadata.app, "logged_in_screen app metadata", SCREEN_APP_FIELDS);
    assertAllowedKeys(metadata.runtime, "logged_in_screen runtime metadata.runtime", SCREEN_RUNTIME_FIELDS);
    assertAllowedKeys(metadata.screenshot, "logged_in_screen screenshot metadata", SCREENSHOT_FIELDS);
    assertAllowedKeys(metadata.displayed_fixture_values, "logged_in_screen displayed fixture values", FIXTURE_VALUE_FIELDS);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (metadata.schema_version !== SCREEN_METADATA_SCHEMA) errors.push("logged_in_screen runtime metadata schema mismatch");
  if (metadata.run_id !== runId) errors.push("logged_in_screen runtime metadata run ID mismatch");
  if (metadata.screenshot_sha256 !== screenSha) errors.push("logged_in_screen runtime metadata screenshot SHA mismatch");
  if (metadata.source_sha !== sourceSha) errors.push("logged_in_screen runtime metadata source SHA mismatch");
  if (metadata.package_artifact_sha256 !== packageArtifact?.artifact_sha256) errors.push("logged_in_screen runtime metadata package SHA mismatch");
  if (metadata.api_artifact_sha256 !== api?.api_artifact_sha256) errors.push("logged_in_screen runtime metadata API SHA mismatch");
  if (metadata.api_response_sha256 !== api?.api_response?.actual_sha256) errors.push("logged_in_screen runtime metadata API response SHA mismatch");
  if (metadata.fixture_values_sha256 !== api?.api_response?.fixture_values_sha256) errors.push("logged_in_screen runtime metadata fixture digest mismatch");
  if (!isRecord(metadata.displayed_fixture_values)
      || canonicalDigest(metadata.displayed_fixture_values) !== api?.api_response?.fixture_values_sha256) {
    errors.push("logged_in_screen displayed fixture values do not match signed API values");
  }
  if (metadata.non_placeholder !== true
      || !Number.isInteger(metadata.content_marker_count)
      || metadata.content_marker_count < 2) {
    errors.push("logged_in_screen runtime metadata must record non-placeholder screen checks");
  }
  const app = metadata.app;
  const runtime = metadata.runtime;
  const screenshot = metadata.screenshot;
  if (!isRecord(app) || app.name !== "Law Firm OS" || !/^\d+\.\d+\.\d+$/u.test(app.version ?? "") || app.build_sha !== sourceSha) {
    errors.push("logged_in_screen app metadata is not provenance-bound");
  }
  if (!isRecord(runtime)
      || runtime.authenticated !== true
      || runtime.session_principal_source !== "api_signed_session"
      || typeof runtime.route !== "string"
      || !runtime.route.startsWith("/")
      || !/^\d+\.\d+\.\d+$/u.test(runtime.version ?? "")) {
    errors.push("logged_in_screen runtime metadata is not an authenticated signed-session runtime");
  }
  if (!isRecord(screenshot)
      || screenshot.format !== "png"
      || screenshot.width !== png.width
      || screenshot.height !== png.height
      || !Array.isArray(screenshot.markers)
      || !screenshot.markers.includes("client_operations")
      || !screenshot.markers.includes("signed_in")
      || !Number.isFinite(Date.parse(screenshot.captured_at))) {
    errors.push("logged_in_screen screenshot metadata is incomplete or placeholder-like");
  }
  return Object.freeze({
    runtime_metadata_path: metadataPath,
    runtime_metadata_sha256: expectedMetadataSha,
    runtime_route: isRecord(runtime) ? runtime.route : null,
  });
}

/** Return the SHA-256 of a referenced file or deterministic directory tree. */
export function sha256Path(filePath) {
  const stat = lstatSync(filePath);
  if (stat.isSymbolicLink()) throw new Error("SHA-256 cannot be calculated for a symbolic link");
  if (stat.isFile()) return digestFile(filePath);
  if (stat.isDirectory()) return digestDirectory(filePath);
  throw new Error("SHA-256 can only be calculated for a regular file or directory");
}

function readJsonFile(root, relativePath, label) {
  const filePath = assertRegularPath(
    root,
    canonicalRelativePath(root, relativePath, `${label} path`),
    label,
  );
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON at position ${parseJsonErrorPosition(error)}`);
  }
  return { filePath, parsed: requireRecord(parsed, `${label} JSON`) };
}

function validateReceiptAttestation({
  root,
  entry,
  key,
  receipt,
  receiptSha,
  sourceSha,
  artifactSha,
  artifactManifestSha,
  artifactKind,
  runId,
  screenSha,
  runtimeMetadataSha,
  apiResponseSha,
  fixtureValuesSha,
  captureReceiptSha,
  verifier,
  errors,
  required,
}) {
  const attestationPath = valueOrAlias(entry, ["attestation_path", "independent_receipt_path"]);
  const attestationExpectedSha = valueOrAlias(entry, ["attestation_sha256", "independent_receipt_sha256"]);
  if (!required && attestationPath === undefined && attestationExpectedSha === undefined) return null;
  if (!attestationPath || !attestationExpectedSha) {
    errors.push(`${key} requires an independently generated signed attestation`);
    return null;
  }
  let attestationSha;
  try {
    attestationSha = nonPlaceholderSha(attestationExpectedSha, `${key}.attestation_sha256`);
  } catch (error) {
    errors.push(errorMessage(error));
    return null;
  }
  let loaded;
  try {
    loaded = readJsonFile(root, attestationPath, `${key} attestation`);
  } catch (error) {
    errors.push(errorMessage(error));
    return null;
  }
  const actualSha = digestFile(loaded.filePath);
  if (actualSha !== attestationSha) {
    errors.push(`${key} attestation SHA mismatch/tampered: expected ${attestationSha}, got ${actualSha}`);
  }
  const attestation = loaded.parsed;
  try {
    assertNoSecretKeys(attestation, `${key} attestation`);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  try {
    assertAllowedKeys(attestation, `${key} attestation`, RECEIPT_ATTESTATION_FIELDS);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (attestation.schema_version !== RECEIPT_ATTESTATION_SCHEMA) {
    errors.push(`${key} attestation schema mismatch`);
  }
  if (!ALLOWED_ATTESTATION_ISSUERS.has(attestation.issuer)) {
    errors.push(`${key} attestation issuer is not an approved independent issuer`);
  }
  if (attestation.independently_generated !== true
      || attestation.signed !== true
      || attestation.signature_algorithm !== "ed25519"
      || attestation.provenance_type !== "trusted-ci-build"
      || attestation.git_object_exists !== true) {
    errors.push(`${key} attestation must be a trusted-ci-build, independently signed, git-object-bound statement`);
  }
  try {
    requireRunId(attestation.run_id, `${key} attestation.run_id`);
    if (attestation.run_id !== runId) errors.push(`${key} attestation run ID binding mismatch`);
    nonPlaceholderString(attestation.workflow_run_id, `${key} attestation.workflow_run_id`);
    nonPlaceholderString(attestation.generated_by, `${key} attestation.generated_by`);
    if (!/^[A-Za-z0-9+/=_-]{86,}$/u.test(attestation.signature ?? "")) {
      throw new TypeError(`${key} attestation.signature must be a detached signature value`);
    }
  } catch (error) {
    errors.push(errorMessage(error));
  }
  try {
    requireSha(attestation.receipt_sha256, `${key} attestation.receipt_sha256`);
    if (attestation.receipt_sha256 !== receiptSha) errors.push(`${key} attestation receipt SHA binding mismatch`);
    requireSha(attestation.source_sha, `${key} attestation.source_sha`, GIT_SHA);
    if (attestation.source_sha !== sourceSha) errors.push(`${key} attestation source SHA binding mismatch`);
    if (artifactSha !== undefined) {
      requireSha(attestation.artifact_sha256, `${key} attestation.artifact_sha256`);
      if (attestation.artifact_sha256 !== artifactSha) errors.push(`${key} attestation artifact SHA binding mismatch`);
    }
    if (artifactManifestSha !== undefined) {
      requireSha(attestation.artifact_manifest_sha256, `${key} attestation.artifact_manifest_sha256`);
      if (attestation.artifact_manifest_sha256 !== artifactManifestSha) errors.push(`${key} attestation artifact manifest SHA binding mismatch`);
    }
    if (artifactKind !== undefined && attestation.artifact_kind !== artifactKind) {
      errors.push(`${key} attestation artifact kind binding mismatch`);
    }
    for (const [name, expected] of [
      ["screen_sha256", screenSha],
      ["runtime_metadata_sha256", runtimeMetadataSha],
      ["api_response_sha256", apiResponseSha],
      ["fixture_values_sha256", fixtureValuesSha],
      ["capture_receipt_sha256", captureReceiptSha],
    ]) {
      if (expected !== undefined) {
        requireSha(attestation[name], `${key} attestation.${name}`);
        if (attestation[name] !== expected) errors.push(`${key} attestation ${name} binding mismatch`);
      }
    }
  } catch (error) {
    errors.push(errorMessage(error));
  }
  const generatedAt = Date.parse(attestation.generated_at);
  if (!Number.isFinite(generatedAt) || generatedAt > Date.now() + 5 * 60 * 1000) {
    errors.push(`${key} attestation.generated_at must be a valid timestamp`);
  }
  if (verifier && !verifyTrustedAttestationSignature(attestation, verifier)) {
    errors.push(`${key} attestation signature is not valid for the trusted independent signer`);
  }
  return Object.freeze({
    attestation_path: attestationPath,
    attestation_sha256: attestationSha,
    actual_attestation_sha256: actualSha,
  });
}

function git(root, ...args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 16 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}

/** Read only the small Git identity needed by the gate. */
export function readClientOperationsGitIdentity(root) {
  const topLevel = git(root, "rev-parse", "--show-toplevel");
  if (!topLevel) return null;
  try {
    if (canonicalFilesystemPath(topLevel) !== canonicalFilesystemPath(root)) return null;
  } catch {
    return null;
  }
  const headSha = git(root, "rev-parse", "HEAD^{commit}");
  if (!headSha || !GIT_SHA.test(headSha)) return null;
  const branch = git(root, "symbolic-ref", "--short", "-q", "HEAD") || "DETACHED";
  const status = git(root, "status", "--porcelain=v1", "--untracked-files=all");
  const remoteMainSha = git(root, "rev-parse", "--verify", "refs/remotes/origin/main");
  const localMainSha = git(root, "rev-parse", "--verify", "refs/heads/main");
  const mainSha = remoteMainSha && GIT_SHA.test(remoteMainSha)
    ? remoteMainSha
    : (localMainSha && GIT_SHA.test(localMainSha) ? localMainSha : null);
  if (!gitObjectExists(root, headSha, "commit")
      || !gitObjectExists(root, headSha, "tree")
      || !mainSha
      || !gitObjectExists(root, mainSha, "commit")
      || !gitObjectExists(root, mainSha, "tree")) return null;
  if (!git(root, "ls-tree", "-r", "--full-tree", "--name-only", headSha)
      || !git(root, "ls-tree", "-r", "--full-tree", "--name-only", mainSha)) return null;
  return Object.freeze({
    head_sha: headSha,
    branch,
    worktree_dirty: Boolean(status),
    main_sha: mainSha,
    object_shas: Object.freeze([headSha, ...(mainSha && mainSha !== headSha ? [mainSha] : [])]),
  });
}

function receiptEntry(manifest, key) {
  const aliases = {
    web_build: ["web_build", "web"],
    addin_build: ["addin_build", "addin"],
    migration_receipt: ["migration_receipt", "migration"],
    api_signed_session_receipt: ["api_signed_session_receipt", "api_signed_session", "api"],
    package_artifact: ["package_artifact", "package"],
    logged_in_screen_receipt: ["logged_in_screen_receipt", "logged_in_screen", "screen"],
    deploy_receipt: ["deploy_receipt", "deploy"],
  }[key] ?? [key];
  for (const alias of aliases) {
    if (manifest[alias] !== undefined) return manifest[alias];
    if (manifest.receipts?.[alias] !== undefined) return manifest.receipts[alias];
  }
  return undefined;
}

function valueOrAlias(record, names) {
  for (const name of names) {
    if (record?.[name] !== undefined) return record[name];
  }
  return undefined;
}

function receiptFieldSet(expectedSchema) {
  if (expectedSchema.includes("web-build")) return RECEIPT_FIELDS.web;
  if (expectedSchema.includes("addin-build")) return RECEIPT_FIELDS.addin;
  if (expectedSchema.includes("migration")) return RECEIPT_FIELDS.migration;
  if (expectedSchema.includes("api-signed-session")) return RECEIPT_FIELDS.api;
  if (expectedSchema.includes("package-build")) return RECEIPT_FIELDS.package;
  if (expectedSchema.includes("logged-in-screen")) return RECEIPT_FIELDS.screen;
  if (expectedSchema.includes("deploy")) return RECEIPT_FIELDS.deploy;
  return new Set();
}

function validateReceipt({ root, entry, key, expectedSchema, sourceSha, runId, errors, requireAttestation = false }) {
  if (!isRecord(entry)) {
    errors.push(`missing ${key} manifest entry`);
    return null;
  }
  const receiptPath = valueOrAlias(entry, ["receipt_path", "receipt"]);
  let receiptSha;
  try {
    receiptSha = requireSha(valueOrAlias(entry, ["receipt_sha256", "receipt_sha"]), `${key}.receipt_sha256`);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (!receiptPath || !receiptSha) return null;

  let loaded;
  try {
    loaded = readJsonFile(root, receiptPath, `${key} receipt`);
  } catch (error) {
    errors.push(errorMessage(error));
    return null;
  }
  const actualReceiptSha = digestFile(loaded.filePath);
  if (actualReceiptSha !== receiptSha) {
    errors.push(`${key} receipt SHA mismatch/tampered: expected ${receiptSha}, got ${actualReceiptSha}`);
  }
  const receipt = loaded.parsed;
  try {
    assertNoSecretKeys(receipt, `${key} receipt`);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  try {
    assertAllowedKeys(receipt, `${key} receipt`, receiptFieldSet(expectedSchema));
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (receipt.schema_version !== expectedSchema) {
    errors.push(`${key} receipt schema mismatch`);
  }
  const status = valueOrAlias(receipt, ["status", "build_status", "verification_status"]);
  if (status !== "PASS") errors.push(`${key} receipt status must be PASS`);
  if (receipt.source_sha !== sourceSha) {
    errors.push(`${key} receipt source SHA is stale/mismatched`);
  }
  try {
    requireRunId(receipt.run_id, `${key} receipt.run_id`);
    if (receipt.run_id !== runId) errors.push(`${key} receipt run ID binding mismatch`);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  return Object.freeze({
    receipt_path: receiptPath,
    receipt_sha256: receiptSha,
    actual_receipt_sha256: actualReceiptSha,
    receipt,
    require_attestation: requireAttestation,
  });
}

function validateArtifact({
  root,
  entry,
  key,
  sourceSha,
  runId,
  errors,
  required = true,
  requireProvenance = false,
  expectedArtifactKind,
}) {
  if (!isRecord(entry)) {
    if (required) errors.push(`missing ${key} manifest entry`);
    return null;
  }
  const artifactPath = valueOrAlias(entry, ["artifact_path", "path"]);
  let expectedSha;
  try {
    expectedSha = requireSha(valueOrAlias(entry, ["artifact_sha256", "sha256"]), `${key}.artifact_sha256`);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (!artifactPath || !expectedSha) return null;
  let resolved;
  try {
    resolved = assertRegularPath(
      root,
      canonicalRelativePath(root, artifactPath, `${key}.artifact_path`),
      `${key} artifact`,
    );
  } catch (error) {
    errors.push(errorMessage(error));
    return null;
  }
  let actualSha;
  try {
    actualSha = sha256Path(resolved);
  } catch (error) {
    errors.push(`${key} artifact SHA calculation failed: ${errorMessage(error)}`);
    return null;
  }
  if (actualSha !== expectedSha) {
    errors.push(`${key} artifact SHA mismatch/tampered: expected ${expectedSha}, got ${actualSha}`);
  }
  if (entry.source_sha !== undefined && entry.source_sha !== sourceSha) {
    errors.push(`${key} artifact source SHA is stale/mismatched`);
  }
  const embeddedManifestPath = valueOrAlias(entry, ["embedded_manifest_path", "artifact_manifest_path"]);
  const embeddedManifestSha = valueOrAlias(entry, ["embedded_manifest_sha256", "artifact_manifest_sha256"]);
  if (requireProvenance || embeddedManifestPath !== undefined || embeddedManifestSha !== undefined) {
    if (!embeddedManifestPath || !embeddedManifestSha) {
      errors.push(`${key} requires an embedded artifact manifest and commit provenance`);
    } else {
      try {
        const manifestSha = nonPlaceholderSha(embeddedManifestSha, `${key}.embedded_manifest_sha256`);
        const loadedManifest = readJsonFile(root, embeddedManifestPath, `${key} embedded artifact manifest`);
        const actualManifestSha = digestFile(loadedManifest.filePath);
        if (actualManifestSha !== manifestSha) {
          errors.push(`${key} embedded artifact manifest SHA mismatch/tampered`);
        }
        const embeddedManifest = loadedManifest.parsed;
        assertNoSecretKeys(embeddedManifest, `${key} embedded artifact manifest`);
        assertAllowedKeys(embeddedManifest, `${key} embedded artifact manifest`, ARTIFACT_MANIFEST_FIELDS);
        if (embeddedManifest.schema_version !== ARTIFACT_MANIFEST_SCHEMA) {
          errors.push(`${key} embedded artifact manifest schema mismatch`);
        }
        if (expectedArtifactKind && embeddedManifest.artifact_kind !== expectedArtifactKind) {
          errors.push(`${key} embedded artifact kind mismatch`);
        }
        if (embeddedManifest.commit_sha !== sourceSha) {
          errors.push(`${key} embedded artifact commit SHA is stale/mismatched`);
        }
        if (embeddedManifest.run_id !== runId) {
          errors.push(`${key} embedded artifact run ID is stale/mismatched`);
        }
        if (embeddedManifest.artifact_sha256 !== actualSha) {
          errors.push(`${key} embedded artifact SHA binding mismatch`);
        }
        const digestPayload = { ...embeddedManifest };
        delete digestPayload.manifest_digest;
        delete digestPayload.artifact_sha256;
        if (embeddedManifest.manifest_digest !== canonicalDigest(digestPayload)) {
          errors.push(`${key} embedded artifact manifest digest mismatch`);
        }
        if (lstatSync(resolved).isFile()) {
          const marker = artifactMarker(readFileSync(resolved));
          if (marker.commit_sha !== sourceSha
              || marker.manifest_digest !== embeddedManifest.manifest_digest
              || marker.run_id !== runId) {
            errors.push(`${key} artifact is missing the embedded commit/manifest provenance marker`);
          }
        } else {
          errors.push(`${key} artifact provenance requires a file with an embedded marker`);
        }
      } catch (error) {
        errors.push(errorMessage(error));
      }
    }
  }
  return Object.freeze({
    artifact_path: artifactPath,
    artifact_sha256: expectedSha,
    actual_artifact_sha256: actualSha,
    embedded_manifest_sha256: embeddedManifestSha,
  });
}

function validateBuild({ root, manifest, key, expectedSchema, sourceSha, runId, errors, mode, verifier }) {
  const entry = receiptEntry(manifest, key);
  const receipt = validateReceipt({
    root,
    entry,
    key,
    expectedSchema,
    sourceSha,
    runId,
    errors,
    requireAttestation: mode === "release",
  });
  const artifact = validateArtifact({
    root,
    entry,
    key,
    sourceSha,
    runId,
    errors,
    requireProvenance: mode === "release",
    expectedArtifactKind: key,
  });
  if (!receipt || !artifact) return null;
  const receiptArtifactSha = valueOrAlias(receipt.receipt, ["artifact_sha256", "build_artifact_sha256"]);
  try {
    requireSha(receiptArtifactSha, `${key} receipt artifact_sha256`);
    if (receiptArtifactSha !== artifact.artifact_sha256) {
      errors.push(`${key} artifact SHA binding mismatch between receipt and manifest`);
    }
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (receipt.receipt.embedded_commit_sha !== undefined && receipt.receipt.embedded_commit_sha !== sourceSha) {
    errors.push(`${key} embedded commit SHA binding mismatch`);
  }
  if (mode === "release" || receipt.require_attestation) {
    validateReceiptAttestation({
      root,
      entry,
      key,
      receipt: receipt.receipt,
      receiptSha: receipt.actual_receipt_sha256,
      sourceSha,
      artifactSha: artifact.artifact_sha256,
      artifactManifestSha: artifact.embedded_manifest_sha256,
      artifactKind: key,
      runId,
      verifier,
      errors,
      required: mode === "release",
    });
  }
  const receiptManifestSha = valueOrAlias(receipt.receipt, ["embedded_manifest_sha256", "artifact_manifest_sha256"]);
  if (artifact.embedded_manifest_sha256 !== undefined
      && receiptManifestSha !== artifact.embedded_manifest_sha256) {
    errors.push(`${key} embedded manifest SHA binding mismatch between receipt and manifest`);
  }
  const testsPassed = receipt.receipt.tests_passed === true
    || receipt.receipt.test_status === "PASS"
    || receipt.receipt.tests === "PASS";
  if (!testsPassed) errors.push(`${key} receipt must record tests_passed=true or test_status=PASS`);
  return Object.freeze({ ...artifact, ...receipt, tests_passed: testsPassed });
}

function validateMigration({ root, manifest, sourceSha, runId, errors, mode, verifier }) {
  const key = "migration_receipt";
  const entry = receiptEntry(manifest, key);
  const receipt = validateReceipt({
    root,
    entry,
    key,
    expectedSchema: "law-firm-os.client-operations.migration-receipt.v1",
    sourceSha,
    runId,
    errors,
    requireAttestation: mode === "release",
  });
  if (!receipt || !isRecord(entry)) return null;
  const expected = valueOrAlias(entry, ["migration_sha256", "artifact_sha256"]);
  const actual = valueOrAlias(receipt.receipt, ["migration_sha256", "artifact_sha256"]);
  try {
    requireSha(expected, `${key}.migration_sha256`);
    requireSha(actual, `${key} receipt migration_sha256`);
    if (expected !== actual) errors.push(`${key} SHA binding mismatch between receipt and manifest`);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (mode === "release" || receipt.require_attestation) {
    validateReceiptAttestation({
      root,
      entry,
      key,
      receipt: receipt.receipt,
      receiptSha: receipt.actual_receipt_sha256,
      sourceSha,
      artifactSha: expected,
      runId,
      verifier,
      errors,
      required: mode === "release",
    });
  }
  return Object.freeze({ ...receipt, migration_sha256: expected });
}

function validateApiResponse({ root, receipt, entry, sourceSha, apiArtifactSha, runId, errors }) {
  const responsePath = valueOrAlias(receipt, ["api_response_path"])
    ?? valueOrAlias(entry, ["api_response_path"]);
  const expectedSha = valueOrAlias(receipt, ["api_response_sha256"])
    ?? valueOrAlias(entry, ["api_response_sha256"]);
  if (!responsePath || !expectedSha) {
    errors.push("api_signed_session_receipt requires a signed API response path and SHA");
    return null;
  }
  let expected;
  try {
    expected = nonPlaceholderSha(expectedSha, "api_signed_session_receipt.api_response_sha256");
  } catch (error) {
    errors.push(errorMessage(error));
    return null;
  }
  let loaded;
  try {
    loaded = readJsonFile(root, responsePath, "api signed-session response");
    assertNoSecretKeys(loaded.parsed, "api signed-session response");
    assertAllowedKeys(loaded.parsed, "api signed-session response", API_RESPONSE_FIELDS);
  } catch (error) {
    errors.push(errorMessage(error));
    return null;
  }
  const response = loaded.parsed;
  const actualSha = digestFile(loaded.filePath);
  if (actualSha !== expected) errors.push("api signed-session response SHA mismatch/tampered");
  if (response.schema_version !== API_RESPONSE_SCHEMA) errors.push("api signed-session response schema mismatch");
  if (response.run_id !== runId) errors.push("api signed-session response run ID binding mismatch");
  if (response.source_sha !== sourceSha) errors.push("api signed-session response source SHA mismatch");
  if (response.api_artifact_sha256 !== apiArtifactSha) errors.push("api signed-session response API artifact SHA mismatch");
  if (response.status !== 200 || response.signed_session_observed !== true
      || response.session_principal_source !== "api_signed_session") {
    errors.push("api signed-session response must be an authenticated 200 response");
  }
  if (!isRecord(response.fixture_values)) {
    errors.push("api signed-session response fixture_values are required");
  } else {
    try {
      assertAllowedKeys(response.fixture_values, "api signed-session response fixture_values", FIXTURE_VALUE_FIELDS);
    } catch (error) {
      errors.push(errorMessage(error));
    }
    if (typeof response.fixture_values.client_ref !== "string"
        || typeof response.fixture_values.matter_ref !== "string"
        || typeof response.fixture_values.phase !== "string"
        || typeof response.fixture_values.currency !== "string"
        || !Number.isInteger(response.fixture_values.open_balance_cents)) {
      errors.push("api signed-session response fixture_values have invalid types");
    }
  }
  const fixtureSha = isRecord(response.fixture_values) ? canonicalDigest(response.fixture_values) : null;
  if (fixtureSha === null || receipt.fixture_values_sha256 !== fixtureSha) errors.push("api signed-session fixture values digest mismatch");
  return Object.freeze({
    path: responsePath,
    sha256: expected,
    actual_sha256: actualSha,
    fixture_values: response.fixture_values,
    fixture_values_sha256: fixtureSha,
  });
}

function validateApiSignedSession({ root, manifest, sourceSha, runId, errors, mode, verifier }) {
  const key = "api_signed_session_receipt";
  const entry = receiptEntry(manifest, key);
  const receipt = validateReceipt({
    root,
    entry,
    key,
    expectedSchema: "law-firm-os.client-operations.api-signed-session-receipt.v1",
    sourceSha,
    runId,
    errors,
    requireAttestation: mode === "release",
  });
  if (!receipt || !isRecord(entry)) return null;
  if (receipt.receipt.signed_session_observed !== true
      || receipt.receipt.session_principal_source !== "api_signed_session") {
    errors.push(`${key} must prove an observed api_signed_session without exposing a token`);
  }
  const expected = valueOrAlias(entry, ["api_artifact_sha256", "artifact_sha256"]);
  const actual = valueOrAlias(receipt.receipt, ["api_artifact_sha256", "artifact_sha256"]);
  try {
    requireSha(expected, `${key}.api_artifact_sha256`);
    requireSha(actual, `${key} receipt api_artifact_sha256`);
    if (expected !== actual) errors.push(`${key} SHA binding mismatch between receipt and manifest`);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  let apiArtifact = null;
  if (mode === "release" || valueOrAlias(entry, ["api_artifact_path", "api_embedded_manifest_path"]) !== undefined) {
    apiArtifact = validateArtifact({
      root,
      entry: {
        ...entry,
        artifact_path: valueOrAlias(entry, ["api_artifact_path"]),
        artifact_sha256: expected,
        embedded_manifest_path: valueOrAlias(entry, ["api_embedded_manifest_path"]),
        embedded_manifest_sha256: valueOrAlias(entry, ["api_embedded_manifest_sha256"]),
      },
      key: `${key}.api_artifact`,
      sourceSha,
      runId,
      errors,
      requireProvenance: mode === "release",
      expectedArtifactKind: "api_package",
    });
  if (apiArtifact && apiArtifact.artifact_sha256 !== expected) {
      errors.push(`${key} API artifact SHA binding mismatch`);
    }
    const apiManifestSha = valueOrAlias(receipt.receipt, ["api_embedded_manifest_sha256"]);
    if (apiManifestSha !== undefined && apiManifestSha !== apiArtifact?.embedded_manifest_sha256) {
      errors.push(`${key} API embedded manifest SHA binding mismatch`);
    }
  }
  const apiResponse = validateApiResponse({
    root,
    receipt: receipt.receipt,
    entry,
    sourceSha,
    apiArtifactSha: expected,
    runId,
    errors,
  });
  if (mode === "release" || receipt.require_attestation) {
    validateReceiptAttestation({
      root,
      entry,
      key,
      receipt: receipt.receipt,
      receiptSha: receipt.actual_receipt_sha256,
      sourceSha,
      artifactSha: expected,
      artifactManifestSha: apiArtifact?.embedded_manifest_sha256,
      artifactKind: "api_package",
      runId,
      apiResponseSha: apiResponse?.actual_sha256,
      fixtureValuesSha: apiResponse?.fixture_values_sha256,
      verifier,
      errors,
      required: mode === "release",
    });
  }
  return Object.freeze({ ...receipt, api_artifact_sha256: expected, api_artifact: apiArtifact, api_response: apiResponse });
}

function validatePackageArtifact({ root, manifest, sourceSha, runId, build, migration, api, errors, mode, verifier }) {
  const key = "package_artifact";
  const entry = receiptEntry(manifest, key);
  const artifact = validateArtifact({
    root,
    entry,
    key,
    sourceSha,
    runId,
    errors,
    requireProvenance: mode === "release",
    expectedArtifactKind: "package_artifact",
  });
  if (!artifact || !isRecord(entry)) return null;
  try {
    requireSha(entry.source_sha, `${key}.source_sha`, GIT_SHA);
    if (entry.source_sha !== sourceSha) errors.push(`${key} source SHA is stale/mismatched`);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  for (const [name, expected] of [
    ["web_artifact_sha256", build?.web_build?.artifact_sha256],
    ["addin_artifact_sha256", build?.addin_build?.artifact_sha256],
    ["migration_sha256", migration?.migration_sha256],
    ["api_artifact_sha256", api?.api_artifact_sha256],
  ]) {
    if (expected === undefined) continue;
    try {
      requireSha(entry[name], `${key}.${name}`);
      if (entry[name] !== expected) errors.push(`${key} ${name} binding mismatch`);
    } catch (error) {
      errors.push(errorMessage(error));
    }
  }
  const receipt = validateReceipt({
    root,
    entry,
    key,
    expectedSchema: "law-firm-os.client-operations.package-build-receipt.v1",
    sourceSha,
    runId,
    errors,
    requireAttestation: mode === "release",
  });
  if (mode === "release" && !receipt) return null;
  if (receipt) {
    const receiptArtifactSha = valueOrAlias(receipt.receipt, ["artifact_sha256", "package_artifact_sha256"]);
    if (receiptArtifactSha !== artifact.artifact_sha256) errors.push(`${key} receipt artifact SHA binding mismatch`);
    if (valueOrAlias(receipt.receipt, ["embedded_commit_sha"]) !== undefined
        && valueOrAlias(receipt.receipt, ["embedded_commit_sha"]) !== sourceSha) {
      errors.push(`${key} receipt embedded commit SHA binding mismatch`);
    }
    for (const [name, expected] of [
      ["web_artifact_sha256", build?.web_build?.artifact_sha256],
      ["addin_artifact_sha256", build?.addin_build?.artifact_sha256],
      ["migration_sha256", migration?.migration_sha256],
      ["api_artifact_sha256", api?.api_artifact_sha256],
    ]) {
      if (expected !== undefined && valueOrAlias(receipt.receipt, [name]) !== expected) {
        errors.push(`${key} receipt ${name} binding mismatch`);
      }
    }
    if (mode === "release" || receipt.require_attestation) {
      validateReceiptAttestation({
        root,
        entry,
        key,
        receipt: receipt.receipt,
        receiptSha: receipt.actual_receipt_sha256,
        sourceSha,
        artifactSha: artifact.artifact_sha256,
        artifactManifestSha: artifact.embedded_manifest_sha256,
        artifactKind: "package_artifact",
        runId,
        verifier,
        errors,
        required: mode === "release",
      });
    }
  }
  return Object.freeze({ ...artifact, package_receipt: receipt });
}

function validateCaptureReceipt({ root, entry, sourceSha, runId, packageArtifact, api, screenSha, runtimeMetadataSha, runtimeRoute, verifier, errors }) {
  const capturePath = valueOrAlias(entry, ["capture_receipt_path"]);
  const expectedCaptureSha = valueOrAlias(entry, ["capture_receipt_sha256"]);
  if (!capturePath || !expectedCaptureSha) {
    errors.push("logged_in_screen_receipt requires an independently signed runtime capture receipt");
    return null;
  }
  let expectedSha;
  try {
    expectedSha = nonPlaceholderSha(expectedCaptureSha, "logged_in_screen_receipt.capture_receipt_sha256");
  } catch (error) {
    errors.push(errorMessage(error));
    return null;
  }
  let loaded;
  try {
    loaded = readJsonFile(root, capturePath, "runtime capture receipt");
    assertNoSecretKeys(loaded.parsed, "runtime capture receipt");
    assertAllowedKeys(loaded.parsed, "runtime capture receipt", CAPTURE_FIELDS);
  } catch (error) {
    errors.push(errorMessage(error));
    return null;
  }
  const capture = loaded.parsed;
  const actualSha = digestFile(loaded.filePath);
  if (actualSha !== expectedSha) errors.push("runtime capture receipt SHA mismatch/tampered");
  if (capture.schema_version !== RUNTIME_CAPTURE_SCHEMA) errors.push("runtime capture receipt schema mismatch");
  if (!ALLOWED_ATTESTATION_ISSUERS.has(capture.issuer) || capture.signature_algorithm !== "ed25519"
      || (verifier && !verifyTrustedAttestationSignature(capture, verifier))) {
    errors.push("runtime capture receipt is not signed by the trusted independent browser runner");
  }
  if (capture.run_id !== runId) errors.push("runtime capture receipt run ID mismatch");
  if (capture.source_sha !== sourceSha) errors.push("runtime capture receipt source SHA mismatch");
  if (capture.package_artifact_sha256 !== packageArtifact?.artifact_sha256) errors.push("runtime capture receipt package SHA mismatch");
  if (capture.api_artifact_sha256 !== api?.api_artifact_sha256) errors.push("runtime capture receipt API SHA mismatch");
  if (capture.api_response_sha256 !== api?.api_response?.actual_sha256) errors.push("runtime capture receipt API response SHA mismatch");
  if (capture.fixture_values_sha256 !== api?.api_response?.fixture_values_sha256) errors.push("runtime capture receipt fixture digest mismatch");
  if (capture.screenshot_sha256 !== screenSha) errors.push("runtime capture receipt screenshot SHA mismatch");
  if (capture.runtime_metadata_sha256 !== runtimeMetadataSha) errors.push("runtime capture receipt metadata SHA mismatch");
  if (capture.authenticated !== true || capture.session_principal_source !== "api_signed_session"
      || typeof capture.route !== "string" || !capture.route.startsWith("/")
      || capture.browser !== "playwright") {
    errors.push("runtime capture receipt must prove an authenticated browser capture");
  }
  if (capture.route !== runtimeRoute) errors.push("runtime capture route does not match runtime metadata route");
  try {
    nonPlaceholderString(capture.browser_run_id, "runtime capture receipt.browser_run_id");
  } catch (error) {
    errors.push(errorMessage(error));
  }
  try {
    assertAllowedKeys(capture.displayed_fixture_values, "runtime capture displayed fixture values", FIXTURE_VALUE_FIELDS);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (!isRecord(capture.displayed_fixture_values)
      || canonicalDigest(capture.displayed_fixture_values) !== api?.api_response?.fixture_values_sha256) {
    errors.push("runtime capture displayed fixture values do not match signed API values");
  }
  if (!Number.isFinite(Date.parse(capture.captured_at)) || Date.parse(capture.captured_at) > Date.now() + 5 * 60 * 1000) {
    errors.push("runtime capture receipt timestamp is invalid or in the future");
  }
  return Object.freeze({ capture_path: capturePath, capture_sha256: expectedSha, actual_capture_sha256: actualSha });
}

function validateScreenReceipt({ root, manifest, sourceSha, runId, packageArtifact, api, errors, mode, verifier }) {
  const key = "logged_in_screen_receipt";
  const entry = receiptEntry(manifest, key);
  const receipt = validateReceipt({
    root,
    entry,
    key,
    expectedSchema: "law-firm-os.client-operations.logged-in-screen-receipt.v1",
    sourceSha,
    runId,
    errors,
    requireAttestation: mode === "release",
  });
  if (!receipt || !isRecord(entry)) return null;
  const screenPath = valueOrAlias(entry, ["screen_path", "screenshot_path"]);
  let expectedScreenSha;
  try {
    expectedScreenSha = requireSha(
      valueOrAlias(entry, ["screen_sha256", "screenshot_sha256"]),
      `${key}.screen_sha256`,
    );
  } catch (error) {
    errors.push(errorMessage(error));
  }
  let actualScreenSha;
  let png;
  if (screenPath && expectedScreenSha) {
    try {
      const screen = assertRegularPath(
        root,
        canonicalRelativePath(root, screenPath, `${key}.screen_path`),
        `${key} screenshot`,
      );
      actualScreenSha = sha256Path(screen);
      png = parsePng(screen);
      if (actualScreenSha !== expectedScreenSha) {
        errors.push(`${key} screen SHA mismatch/tampered: expected ${expectedScreenSha}, got ${actualScreenSha}`);
      }
    } catch (error) {
      errors.push(errorMessage(error));
    }
  }
  const receiptPackageSha = valueOrAlias(receipt.receipt, ["package_artifact_sha256", "artifact_sha256"]);
  if (packageArtifact) {
    if (receiptPackageSha !== packageArtifact.artifact_sha256) {
      errors.push(`${key} package artifact SHA binding mismatch`);
    }
    if (entry.package_artifact_sha256 !== packageArtifact.artifact_sha256) {
      errors.push(`${key} manifest package artifact SHA binding mismatch`);
    }
  }
  if (api && valueOrAlias(receipt.receipt, ["api_artifact_sha256"]) !== api.api_artifact_sha256) {
    errors.push(`${key} API artifact SHA binding mismatch`);
  }
  const loggedIn = receipt.receipt.logged_in === true || receipt.receipt.login_state === "signed_in";
  if (!loggedIn || receipt.receipt.signed_session_observed !== true) {
    errors.push(`${key} must record a signed-in screen observed through a signed session`);
  }
  if (!png) errors.push(`${key} requires a real non-placeholder PNG screenshot`);
  const metadata = png
    ? validateScreenMetadata({
        root,
        entry,
        sourceSha,
        runId,
        packageArtifact,
        api,
        screenSha: actualScreenSha,
        png,
        errors,
      })
    : null;
  const capture = png
    ? validateCaptureReceipt({
        root,
        entry,
        sourceSha,
        runId,
        packageArtifact,
        api,
        screenSha: actualScreenSha,
        runtimeMetadataSha: metadata?.runtime_metadata_sha256,
        runtimeRoute: metadata?.runtime_route,
        verifier,
        errors,
      })
    : null;
  if (mode === "release" || receipt.require_attestation) {
    validateReceiptAttestation({
      root,
      entry,
      key,
      receipt: receipt.receipt,
      receiptSha: receipt.actual_receipt_sha256,
      sourceSha,
      artifactSha: packageArtifact?.artifact_sha256,
      runId,
      screenSha: actualScreenSha,
      runtimeMetadataSha: metadata?.runtime_metadata_sha256,
      apiResponseSha: api?.api_response?.actual_sha256,
      fixtureValuesSha: api?.api_response?.fixture_values_sha256,
      captureReceiptSha: capture?.actual_capture_sha256,
      verifier,
      errors,
      required: mode === "release",
    });
  }
  return Object.freeze({
    ...receipt,
    screen_path: screenPath,
    screen_sha256: expectedScreenSha,
    actual_screen_sha256: actualScreenSha,
    logged_in: loggedIn,
    runtime_metadata: metadata,
    capture_receipt: capture,
  });
}

function validateDeployReceipt({ root, manifest, sourceSha, runId, packageArtifact, verifier, errors }) {
  const key = "deploy_receipt";
  const entry = receiptEntry(manifest, key);
  const receipt = validateReceipt({
    root,
    entry,
    key,
    expectedSchema: "law-firm-os.client-operations.deploy-receipt.v1",
    sourceSha,
    runId,
    errors,
    requireAttestation: true,
  });
  if (!receipt || !isRecord(entry)) return null;
  const packageSha = valueOrAlias(receipt.receipt, ["package_artifact_sha256", "artifact_sha256"]);
  if (!packageArtifact || packageSha !== packageArtifact.artifact_sha256) {
    errors.push(`${key} package artifact SHA binding mismatch`);
  }
  if (receipt.receipt.deployed !== true
      || typeof receipt.receipt.environment !== "string"
      || receipt.receipt.environment.length === 0) {
    errors.push(`${key} must record deployed=true and a non-empty environment`);
  }
  try {
    nonPlaceholderString(receipt.receipt.environment, `${key}.environment`);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  const authoritativeUrl = receipt.receipt.authoritative_url;
  try {
    const parsedUrl = new URL(nonPlaceholderString(authoritativeUrl, `${key}.authoritative_url`));
    if (parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password || parsedUrl.hostname === "localhost"
        || parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "[::1]"
        || parsedUrl.hostname === "0.0.0.0" || parsedUrl.hostname === "example.com"
        || parsedUrl.hostname.endsWith(".localhost") || parsedUrl.hostname.endsWith(".invalid")
        || parsedUrl.hostname.endsWith(".example.com")) {
      throw new TypeError(`${key}.authoritative_url must be an external HTTPS URL`);
    }
  } catch (error) {
    errors.push(errorMessage(error));
  }
  const request = receipt.receipt.request;
  const response = receipt.receipt.response;
  const externalGate = receipt.receipt.external_gate;
  if (!isRecord(request) || !isRecord(response) || !isRecord(externalGate)) {
    errors.push(`${key} requires authoritative request, response, and external-gate records`);
  } else {
    try {
      assertAllowedKeys(request, `${key}.request`, DEPLOY_REQUEST_FIELDS);
      assertAllowedKeys(response, `${key}.response`, DEPLOY_RESPONSE_FIELDS);
      assertAllowedKeys(externalGate, `${key}.external_gate`, EXTERNAL_GATE_FIELDS);
    } catch (error) {
      errors.push(errorMessage(error));
    }
    if (request.method !== "GET" && request.method !== "POST") errors.push(`${key} request method is not supported`);
    if (request.url !== authoritativeUrl || response.url !== authoritativeUrl) {
      errors.push(`${key} request/response URL is not bound to the authoritative URL`);
    }
    try {
      nonPlaceholderSha(request.body_sha256, `${key}.request.body_sha256`);
      nonPlaceholderSha(request.request_sha256, `${key}.request.request_sha256`);
      const requestPayload = { method: request.method, url: request.url, body_sha256: request.body_sha256 };
      if (request.request_sha256 !== canonicalDigest(requestPayload)) errors.push(`${key} request digest binding mismatch`);
      nonPlaceholderSha(response.body_sha256, `${key}.response.body_sha256`);
      nonPlaceholderSha(response.response_sha256, `${key}.response.response_sha256`);
      requireSha(response.package_artifact_sha256, `${key}.response.package_artifact_sha256`);
      if (response.package_artifact_sha256 !== packageArtifact?.artifact_sha256) errors.push(`${key} response package SHA binding mismatch`);
      requireSha(response.source_sha, `${key}.response.source_sha`, GIT_SHA);
      if (response.source_sha !== sourceSha) errors.push(`${key} response source SHA binding mismatch`);
      const responsePayload = {
        status: response.status,
        url: response.url,
        body_sha256: response.body_sha256,
        package_artifact_sha256: response.package_artifact_sha256,
        source_sha: response.source_sha,
      };
      if (response.response_sha256 !== canonicalDigest(responsePayload)) errors.push(`${key} response digest binding mismatch`);
    } catch (error) {
      errors.push(errorMessage(error));
    }
    if (response.status !== 200) errors.push(`${key} authoritative response status must be 200`);
    if (externalGate.status !== "PASS" || externalGate.authoritative !== true) {
      errors.push(`${key} requires explicit external_gate status PASS and authoritative=true`);
    }
    try {
      nonPlaceholderString(externalGate.gate_id, `${key}.external_gate.gate_id`);
      nonPlaceholderString(externalGate.provider, `${key}.external_gate.provider`);
    } catch (error) {
      errors.push(errorMessage(error));
    }
  }
  validateReceiptAttestation({
    root,
    entry,
    key,
    receipt: receipt.receipt,
    receiptSha: receipt.actual_receipt_sha256,
    sourceSha,
    artifactSha: packageArtifact?.artifact_sha256,
    runId,
    verifier,
    errors,
    required: true,
  });
  return Object.freeze({ ...receipt, deployed: receipt.receipt.deployed === true });
}

function validateSource({ root, manifest, mode, errors, gitIdentity }) {
  const effectiveGitIdentity = mode === "release" ? readClientOperationsGitIdentity(root) : gitIdentity;
  const source = manifest.source ?? {
    sha: manifest.source_sha,
    branch: manifest.branch,
    main_sha: manifest.main_sha ?? manifest.branch_main_sha,
    worktree_dirty: manifest.worktree_dirty,
  };
  if (!isRecord(source)) {
    errors.push("missing source manifest entry");
    return null;
  }
  let sha;
  let mainSha;
  try {
    sha = requireSha(source.sha, "source.sha", GIT_SHA);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  try {
    mainSha = requireSha(source.main_sha, "source.main_sha", GIT_SHA);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (typeof source.branch !== "string" || !BRANCH.test(source.branch)) {
    errors.push("source.branch must be a safe non-empty branch name");
  }
  if (typeof source.worktree_dirty !== "boolean") errors.push("source.worktree_dirty must be boolean");
  if (effectiveGitIdentity) {
    if (sha && sha !== effectiveGitIdentity.head_sha) errors.push(`source SHA is stale/mismatched with current HEAD: ${sha} != ${effectiveGitIdentity.head_sha}`);
    if (source.branch && source.branch !== effectiveGitIdentity.branch) errors.push(`source branch is stale/mismatched with current branch: ${source.branch} != ${effectiveGitIdentity.branch}`);
    if (mainSha && effectiveGitIdentity.main_sha && mainSha !== effectiveGitIdentity.main_sha) errors.push(`source main SHA is stale/mismatched: ${mainSha} != ${effectiveGitIdentity.main_sha}`);
    if (source.worktree_dirty !== effectiveGitIdentity.worktree_dirty) errors.push("source worktree_dirty does not match current Git worktree");
  }
  if (sha) {
    const sourceObjectExists = gitObjectExists(root, sha, "commit")
      || (mode !== "release" && gitIdentity?.object_shas?.includes(sha) === true);
    if (!sourceObjectExists) errors.push("source SHA does not resolve to an existing Git commit object");
  }
  if (mainSha) {
    const mainObjectExists = gitObjectExists(root, mainSha, "commit")
      || (mode !== "release" && gitIdentity?.object_shas?.includes(mainSha) === true);
    if (!mainObjectExists) errors.push("branch/main SHA does not resolve to an existing Git commit object");
  }
  if (mode === "release") {
    if (!["main", "DETACHED"].includes(source.branch)) {
      errors.push("release source must be on the main branch or detached at the exact main SHA");
    }
    if (sha && mainSha && sha !== mainSha) errors.push("release source SHA and branch/main SHA must match exactly");
    if (source.worktree_dirty !== false) errors.push("release source worktree must be clean");
    if (!effectiveGitIdentity) errors.push("release mode requires a readable Git source identity");
    if (effectiveGitIdentity && !effectiveGitIdentity.main_sha) errors.push("release mode requires a readable branch/main SHA");
  }
  return Object.freeze({
    sha,
    branch: source.branch,
    main_sha: mainSha,
    worktree_dirty: source.worktree_dirty,
    current_head_sha: effectiveGitIdentity?.head_sha ?? null,
    current_main_sha: effectiveGitIdentity?.main_sha ?? null,
  });
}

function localClaimGuard(manifest, errors) {
  const claims = isRecord(manifest.verification?.claims) ? manifest.verification.claims : {};
  for (const [key, value] of Object.entries({
    exact_main: claims.exact_main,
    deployed: claims.deployed,
    logged_in_screen: claims.logged_in_screen,
    source_api_package_screen_sha_bound: claims.source_api_package_screen_sha_bound,
  })) {
    if (value === true) errors.push(`local mode cannot claim ${key} proof`);
  }
  for (const key of ["logged_in_screen_receipt", "deploy_receipt"]) {
    const entry = receiptEntry(manifest, key);
    if (entry !== undefined) {
      errors.push(`local mode cannot claim ${key} proof`);
    }
  }
}

function validateManifestShape(manifest, runId, errors) {
  try {
    assertAllowedKeys(manifest, "client-operations manifest", MANIFEST_FIELDS);
    assertAllowedKeys(manifest.verification, "client-operations verification", VERIFICATION_FIELDS);
    assertAllowedKeys(manifest.verification.claims, "client-operations claims", CLAIM_FIELDS);
    assertAllowedKeys(manifest.source, "client-operations source", SOURCE_FIELDS);
    const entries = [
      ["web_build", BUILD_ENTRY_FIELDS], ["addin_build", BUILD_ENTRY_FIELDS],
      ["migration_receipt", MIGRATION_ENTRY_FIELDS], ["api_signed_session_receipt", API_ENTRY_FIELDS],
      ["package_artifact", PACKAGE_ENTRY_FIELDS], ["logged_in_screen_receipt", SCREEN_ENTRY_FIELDS],
      ["deploy_receipt", DEPLOY_ENTRY_FIELDS],
    ];
    for (const [key, fields] of entries) {
      const entry = receiptEntry(manifest, key);
      if (entry !== undefined) assertAllowedKeys(entry, `${key} manifest entry`, fields);
    }
    const pathPrefix = `runs/${runId}/`;
    const docsPathPrefix = `docs/qa/client-operations/${pathPrefix}`;
    for (const [key, fields] of entries) {
      const entry = receiptEntry(manifest, key);
      if (!isRecord(entry)) continue;
      for (const field of fields) {
        if (field.endsWith("_path") && typeof entry[field] === "string"
            && !entry[field].startsWith(pathPrefix) && !entry[field].startsWith(docsPathPrefix)) {
          throw new TypeError(`${key}.${field} must be namespaced under the verification run`);
        }
      }
    }
  } catch (error) {
    errors.push(errorMessage(error));
  }
}

/**
 * Validate a client-operations evidence manifest without mutating the repo.
 * `gitIdentity` is injectable for deterministic tests; omit it to inspect the
 * current repository. The returned object never includes receipt contents.
 */
export function validateClientOperationsPackage(options = {}) {
  const {
    root = process.cwd(),
    manifest,
    mode = manifest?.verification?.mode ?? "local",
    gitIdentity = readClientOperationsGitIdentity(root),
  } = options;
  const errors = [];
  for (const optionName of ["testVerifier", "verifier", "trustVerifier", "trustAnchor"]) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      errors.push(`validateClientOperationsPackage does not accept injected ${optionName}`);
    }
  }
  const resolvedRoot = path.resolve(root);
  if (!CLIENT_OPERATIONS_PACKAGE_MODES.includes(mode)) {
    errors.push(`mode must be one of ${CLIENT_OPERATIONS_PACKAGE_MODES.join(", ")}`);
  }
  if (!isRecord(manifest)) {
    return Object.freeze({
      verdict: "FAIL",
      verification_level: "client-operations-package",
      mode,
      scenario_id: CLIENT_OPERATIONS_PACKAGE_SCENARIO,
      claims: Object.freeze({ local_builds: false, exact_main: false, logged_in_screen: false, deployed: false }),
      source_api_package_screen_sha_bound: false,
      errors: Object.freeze([...errors, "manifest must be an object"]),
    });
  }
  if (manifest.schema_version !== CLIENT_OPERATIONS_PACKAGE_SCHEMA) errors.push("manifest schema_version mismatch");
  if (manifest.verification?.scenario_id !== CLIENT_OPERATIONS_PACKAGE_SCENARIO) errors.push("manifest scenario_id must be VC-CL-PKG-001");
  if (manifest.verification?.mode !== mode) errors.push("manifest verification.mode does not match requested mode");
  let runId;
  try {
    runId = requireRunId(manifest.verification?.run_id);
  } catch (error) {
    errors.push(errorMessage(error));
  }
  try {
    assertNoSecretKeys(manifest, "client-operations manifest");
  } catch (error) {
    errors.push(errorMessage(error));
  }
  if (runId) validateManifestShape(manifest, runId, errors);
  if (mode === "local") localClaimGuard(manifest, errors);

  const verifierResolution = resolveAttestationVerifier({
    root: resolvedRoot,
    mode,
  });
  if (verifierResolution.status === "FAIL") errors.push(verifierResolution.reason);
  const verifier = verifierResolution.verifier;

  const source = validateSource({ root: resolvedRoot, manifest, mode, errors, gitIdentity });
  const sourceSha = source?.sha;
  const build = { web_build: null, addin_build: null };
  if (sourceSha) {
    build.web_build = validateBuild({
      root: resolvedRoot,
      manifest,
      key: "web_build",
      expectedSchema: "law-firm-os.client-operations.web-build-receipt.v1",
      sourceSha,
      runId,
      errors,
      mode,
      verifier,
    });
    build.addin_build = validateBuild({
      root: resolvedRoot,
      manifest,
      key: "addin_build",
      expectedSchema: "law-firm-os.client-operations.addin-build-receipt.v1",
      sourceSha,
      runId,
      errors,
      mode,
      verifier,
    });
  }

  let migration = null;
  let api = null;
  let packageArtifact = null;
  let screen = null;
  let deploy = null;
  if (sourceSha) {
    const releaseOrPresent = (key) => mode === "release" || receiptEntry(manifest, key) !== undefined;
    if (releaseOrPresent("migration_receipt")) {
      migration = validateMigration({ root: resolvedRoot, manifest, sourceSha, runId, errors, mode, verifier });
    }
    if (releaseOrPresent("api_signed_session_receipt")) {
      api = validateApiSignedSession({ root: resolvedRoot, manifest, sourceSha, runId, errors, mode, verifier });
    }
    if (releaseOrPresent("package_artifact")) {
      packageArtifact = validatePackageArtifact({
        root: resolvedRoot,
        manifest,
        sourceSha,
        runId,
        build,
        migration,
        api,
        errors,
        mode,
        verifier,
      });
    }
    if (mode === "release") {
      screen = validateScreenReceipt({ root: resolvedRoot, manifest, sourceSha, runId, packageArtifact, api, errors, mode, verifier });
      deploy = validateDeployReceipt({ root: resolvedRoot, manifest, sourceSha, runId, packageArtifact, verifier, errors });
    }
  }

  const localBuildsPass = Boolean(
    build.web_build
      && build.addin_build
      && build.web_build.tests_passed
      && build.addin_build.tests_passed
      && errors.length === 0,
  );
  const externalEvidencePresent = CLIENT_OPERATIONS_PACKAGE_COMPONENTS
    .filter((key) => !["web_build", "addin_build"].includes(key))
    .some((key) => receiptEntry(manifest, key) !== undefined);
  const trustReady = mode !== "release" || verifierResolution.status === "OK";
  const pass = errors.length === 0 && trustReady;
  const verdict = !pass
    ? (mode === "release" && verifierResolution.status === "BLOCKED_EXTERNAL" && errors.length === 0
      ? "BLOCKED_EXTERNAL"
      : "FAIL")
    : mode === "local" ? "BLOCKED_EXTERNAL" : "PASS";
  const blockedReasons = [];
  if (mode === "release" && verifierResolution.status === "BLOCKED_EXTERNAL") {
    blockedReasons.push(verifierResolution.reason);
  }
  if (mode === "local" && pass) {
    blockedReasons.push(externalEvidencePresent
      ? "local mode cannot assert external exact-main, logged-in, or deployed evidence"
      : "external migration, API, package, screen, and deploy evidence is absent");
  }
  return Object.freeze({
    verdict,
    verification_level: `client-operations-package-${mode}`,
    mode,
    scenario_id: CLIENT_OPERATIONS_PACKAGE_SCENARIO,
    claims: Object.freeze({
      local_builds: localBuildsPass,
      exact_main: mode === "release" && pass,
      logged_in_screen: mode === "release" && Boolean(screen && pass),
      deployed: mode === "release" && Boolean(deploy && pass),
    }),
    source_api_package_screen_sha_bound: mode === "release" && pass,
    blocked_reasons: Object.freeze(blockedReasons),
    source,
    components: Object.freeze({
      web_build: build.web_build && Object.freeze({
        artifact_path: build.web_build.artifact_path,
        artifact_sha256: build.web_build.artifact_sha256,
        receipt_path: build.web_build.receipt_path,
        receipt_sha256: build.web_build.receipt_sha256,
      }),
      addin_build: build.addin_build && Object.freeze({
        artifact_path: build.addin_build.artifact_path,
        artifact_sha256: build.addin_build.artifact_sha256,
        receipt_path: build.addin_build.receipt_path,
        receipt_sha256: build.addin_build.receipt_sha256,
      }),
      migration_receipt: migration && Object.freeze({
        receipt_path: migration.receipt_path,
        receipt_sha256: migration.receipt_sha256,
        migration_sha256: migration.migration_sha256,
      }),
      api_signed_session_receipt: api && Object.freeze({
        receipt_path: api.receipt_path,
        receipt_sha256: api.receipt_sha256,
        api_artifact_sha256: api.api_artifact_sha256,
      }),
      package_artifact: packageArtifact && Object.freeze({
        artifact_path: packageArtifact.artifact_path,
        artifact_sha256: packageArtifact.artifact_sha256,
        embedded_manifest_sha256: packageArtifact.embedded_manifest_sha256,
        receipt_path: packageArtifact.package_receipt?.receipt_path,
        receipt_sha256: packageArtifact.package_receipt?.receipt_sha256,
      }),
      logged_in_screen_receipt: screen && Object.freeze({
        receipt_path: screen.receipt_path,
        receipt_sha256: screen.receipt_sha256,
        screen_path: screen.screen_path,
        screen_sha256: screen.screen_sha256,
      }),
      deploy_receipt: deploy && Object.freeze({
        receipt_path: deploy.receipt_path,
        receipt_sha256: deploy.receipt_sha256,
      }),
    }),
    errors: Object.freeze(errors),
  });
}

export function loadClientOperationsPackageManifest(root, relativePath) {
  return readJsonFile(root, relativePath, "client-operations evidence manifest").parsed;
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function usage() {
  return "usage: node scripts/verify-client-operations-package.mjs --manifest <relative-json> [--mode local|release]";
}

const directExecution = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (directExecution) {
  const manifestPath = option("--manifest");
  const mode = option("--mode") ?? "local";
  if (process.argv.includes("--help")) {
    console.log(usage());
    console.log("Local mode validates only local web/add-in build/test and source bindings; release mode requires exact-main, migration, API signed-session, package, logged-in screen, and deploy receipts.");
    process.exit(0);
  }
  if (!manifestPath || !CLIENT_OPERATIONS_PACKAGE_MODES.includes(mode)) {
    console.error(usage());
    process.exitCode = 2;
  } else {
    try {
      const root = path.resolve(process.cwd());
      const manifest = loadClientOperationsPackageManifest(root, manifestPath);
      const runId = requireRunId(manifest.verification?.run_id);
      const manifestRelative = path.relative(root, path.resolve(root, manifestPath)).replaceAll(path.sep, "/");
      const runPrefix = `runs/${runId}/`;
      const docsRunPrefix = `docs/qa/client-operations/${runPrefix}`;
      if (!manifestRelative.startsWith(runPrefix) && !manifestRelative.startsWith(docsRunPrefix)) {
        throw new Error("manifest path must be namespaced under the verification run");
      }
      const result = validateClientOperationsPackage({ root, manifest, mode });
      console.log(JSON.stringify(result, null, 2));
      if (result.verdict !== "PASS") process.exitCode = 1;
    } catch (error) {
      console.error(JSON.stringify({
        verdict: "FAIL",
        verification_level: "client-operations-package",
        mode,
        scenario_id: CLIENT_OPERATIONS_PACKAGE_SCENARIO,
        claims: { local_builds: false, exact_main: false, logged_in_screen: false, deployed: false },
        source_api_package_screen_sha_bound: false,
        errors: [errorMessage(error)],
      }, null, 2));
      process.exitCode = 1;
    }
  }
}
