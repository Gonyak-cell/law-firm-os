import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import * as FORMAL_DEPLOYED_API_INPUTS from "./formal-deployed-api-inputs.mjs";
import {
  FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA,
  FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA,
  canonicalReceiptBytes,
  readFormalDeployedApiPackageQaReceipt,
  sha256Bytes,
  validateFormalDeployedApiAuthorityCapability,
  validateFormalDeployedApiPackageQaReceipt,
} from "./formal-deployed-api-package-qa.mjs";
import { writePrivateFile } from "./formal-deployed-api-io.mjs";
import {
  createFormalDeployedApiRestartAdapter,
  isFormalDeployedApiRestartAdapter,
} from "./formal-deployed-api-restart-adapter.mjs";

export const SCHEMA_VERSION = "law-firm-os.formal-deployed-api-restart-qa.v2";
export const CHECKPOINT_ID = "RFD-TUW-016";
export const ADAPTER_FIXTURE_SCHEMA = "law-firm-os.formal-deployed-api-restart-adapter-fixture.v1";
export const FORMAL_DEPLOYED_API_RESTART_CAPABILITY_SCHEMA =
  "law-firm-os.formal-deployed-api-restart-capability.v1";
export const PASS_VERDICT = "PASS";
export const BLOCKED_BY_DEPLOYED_API = "BLOCKED_BY_DEPLOYED_API";
export const BLOCKED_BY_ARTIFACT = "BLOCKED_BY_ARTIFACT";
export const FAIL_VERDICT = "FAIL";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_CODE = /^[A-Z][A-Z0-9_]*$/u;
const SECRET_KEY = /(?:^|[_-])(?:access[_-]?token|refresh[_-]?token|id[_-]?token|session[_-]?token|operator[_-]?token|password|secret|credential|authorization|private[_-]?key|api[_-]?key)(?:$|[_-])/iu;
const SECRET_VALUE = /(?:lawos_(?:session|operator|access|refresh|id)[A-Za-z0-9_.-]*|(?:access|refresh|id|session|operator)[_-]?token\s*[:=]\s*\S+|(?:password|secret|credential)\s*[:=]\s*\S+|-----BEGIN [^-\n]*PRIVATE KEY-----)/iu;

const REQUIRED_SCENARIOS = Object.freeze([
  "first_login_once",
  "full_app_exit",
  "second_launch_session_restored_without_login",
  "matter_state_durable",
  "task_state_durable",
  "time_state_durable",
  "exact_source_api_artifact_binding",
  "isolated_user_data",
  "isolated_tenant",
  "duplicate_state_zero",
  "console_errors_zero",
]);

const REQUIRED_BINDINGS = Object.freeze(["source_sha", "source_tree", "api_endpoint_sha256", "artifact_sha256"]);
const AUTHORITATIVE_KEYS = Object.freeze([
  "rfd015_receipt_present",
  "rfd015_receipt_sha256",
  "rfd015_receipt_schema_version",
  "rfd015_capability_schema_version",
  "rfd015_authority_sha256",
  "rfd015_api_artifact_sha256",
  "rfd015_manifest_sha256",
  "rfd015_executed_package_sha256",
  "rfd015_transcript_sha256",
  "rfd015_package_qa_receipt_sha256",
  "rfd015_package_qa_transcript_sha256",
  "rfd015_package_qa_privacy_corpus_sha256",
]);
const TRUSTED_REAL_ADAPTERS = new WeakSet();
const TRUSTED_RESTART_CAPABILITIES = new WeakSet();
const RESTART_CAPABILITY_BY_RECEIPT = new WeakMap();
const CANONICAL_CHAIN_TOKEN = Symbol("law-firm-os.rfd016-canonical-chain");
const TEST_ONLY_EVALUATOR_TOKEN = Symbol("law-firm-os.rfd016-test-only-evaluator");

function registerFormalDeployedApiRestartAdapter(adapter) {
  if (!isFormalDeployedApiRestartAdapter(adapter)) {
    fail("RESTART_ADAPTER_UNTRUSTED", "only the tracked built-in installed-app adapter can authorize restart QA");
  }
  TRUSTED_REAL_ADAPTERS.add(adapter);
  return adapter;
}

function readTrustedFormalDeployedApiPackageQaReceipt(path, options = {}) {
  return readFormalDeployedApiPackageQaReceipt(path, options);
}

export class FormalRestartQaError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "FormalRestartQaError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new FormalRestartQaError(code, message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function canonical(value) {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonical(item)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

export function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : canonical(value)).digest("hex");
}

function assertSha(value, pattern, code, field) {
  if (typeof value !== "string" || !pattern.test(value)) fail(code, `${field} must be a lowercase hexadecimal digest`, { field });
}

function assertSafeCode(value, field) {
  if (typeof value !== "string" || !SAFE_CODE.test(value)) fail("INVALID_CODE", `${field} must be a safe diagnostic code`, { field });
}

function sanitizeErrorMessage() {
  // Adapter messages are intentionally not copied into evidence. A thrown
  // message may contain a session token, password, path, or provider payload.
  return "restart QA adapter failure (details redacted)";
}

function safeError(error, fallbackCode = "ADAPTER_FAILURE") {
  const code = typeof error?.code === "string" && SAFE_CODE.test(error.code) ? error.code : fallbackCode;
  return { code, message: sanitizeErrorMessage() };
}

function scanSecrets(value, seen = new WeakSet()) {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) fail("SECRET_MATERIAL", "receipt contains secret-like value material", { category: "secret_like_value" });
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) fail("INVALID_SHAPE", "receipt contains a cyclic value");
  seen.add(value);
  if (Array.isArray(value)) {
    for (const child of value) scanSecrets(child, seen);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    // This boolean boundary flag is an explicit negative assertion, not
    // secret material. All token-bearing fields remain forbidden.
    if (SECRET_KEY.test(key) && !(key === "operator_token_used" && typeof child === "boolean")) {
      fail("SECRET_KEY", "receipt contains a secret-like key", { category: "secret_like_key" });
    }
    scanSecrets(child, seen);
  }
}

function safeHashIdentifier(value) {
  return sha256(String(value ?? ""));
}

function findNestedString(value, keyPattern, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return undefined;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedString(item, keyPattern, seen);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (keyPattern.test(key) && typeof nested === "string" && nested.trim()) return nested;
    const found = findNestedString(nested, keyPattern, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

function extractRfd015Binding(receipt, { requireTrusted = false, capability } = {}) {
  if (!isRecord(receipt)) fail("DEPLOYED_API_RECEIPT_MISSING", "RFD-TUW-015 authoritative receipt is required");
  if (receipt._test_only === true || receipt.synthetic_only === true) fail("DEPLOYED_API_RECEIPT_TEST_ONLY", "test-only receipt cannot authorize deployed API QA");
  if (requireTrusted && !capability) fail("DEPLOYED_API_CAPABILITY_UNTRUSTED", "RFD-TUW-015 capability must come from the canonical private reader");
  if (receipt.schema_version !== FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA) fail("DEPLOYED_API_RECEIPT_SCHEMA_INVALID", "RFD-TUW-015 receipt schema is not authoritative");
  let validated;
  try {
    validated = validateFormalDeployedApiPackageQaReceipt(receipt);
  } catch {
    fail("DEPLOYED_API_RECEIPT_INVALID", "RFD-TUW-015 receipt failed its authoritative validator");
  }
  if (receipt.verdict !== PASS_VERDICT || validated.actual_deployment_pass !== true) fail("DEPLOYED_API_RECEIPT_NOT_PASS", "RFD-TUW-015 receipt is not an authoritative deployed PASS");
  let checkedCapability = capability;
  if (checkedCapability) {
    try {
      checkedCapability = validateFormalDeployedApiAuthorityCapability(checkedCapability);
    } catch {
      fail("DEPLOYED_API_CAPABILITY_INVALID", "RFD-TUW-015 capability failed its canonical validator");
    }
    if (checkedCapability.schema_version !== FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA) {
      fail("DEPLOYED_API_CAPABILITY_SCHEMA_INVALID", "RFD-TUW-015 capability schema is not authoritative");
    }
  }
  const sourceSha = checkedCapability?.source_sha ?? receipt.source?.expected_revision;
  const sourceTree = checkedCapability?.source_tree ?? receipt.source?.source_tree;
  const apiSourceRevision = checkedCapability?.api_source_revision ?? receipt.source?.api_source_revision;
  const apiEndpointSha256 = checkedCapability?.api_endpoint_sha256 ?? receipt.deployment?.api_endpoint_sha256;
  const artifactSha256 = checkedCapability?.artifact_sha256 ?? receipt.package?.artifact_sha256;
  if (!SHA1.test(sourceSha ?? "") || apiSourceRevision !== sourceSha) fail("DEPLOYED_API_SOURCE_MISSING", "RFD-TUW-015 receipt has no exact API source binding");
  if (!SHA1.test(sourceTree ?? "")) fail("DEPLOYED_API_SOURCE_TREE_INVALID", "RFD-TUW-015 receipt source tree is invalid");
  if (!SHA256.test(artifactSha256 ?? "")) fail("DEPLOYED_API_ARTIFACT_MISSING", "RFD-TUW-015 receipt has no valid artifact SHA");
  if (!SHA256.test(apiEndpointSha256 ?? "")) fail("DEPLOYED_API_ENDPOINT_INVALID", "RFD-TUW-015 receipt has no endpoint digest binding");
  const capabilityFields = {
    api_artifact_sha256: checkedCapability?.api_artifact_sha256 ?? receipt.source?.api_artifact_sha256,
    manifest_sha256: checkedCapability?.manifest_sha256 ?? receipt.package?.manifest_sha256,
    executed_package_sha256: checkedCapability?.executed_package_sha256 ?? receipt.package?.executed_package_sha256,
    transcript_sha256: checkedCapability?.transcript_sha256 ?? receipt.execution?.transcript_sha256,
    package_qa_receipt_sha256: checkedCapability?.package_qa_receipt_sha256 ?? receipt.package?.package_qa_receipt_sha256,
    package_qa_transcript_sha256: checkedCapability?.package_qa_transcript_sha256,
    package_qa_privacy_corpus_sha256: checkedCapability?.package_qa_privacy_corpus_sha256,
    authority_sha256: checkedCapability?.authority_sha256,
  };
  for (const [field, value] of Object.entries(capabilityFields)) {
    if (!SHA256.test(value ?? "")) fail("DEPLOYED_API_CAPABILITY_BINDING_INVALID", `RFD-TUW-015 capability ${field} is invalid`);
  }
  if (checkedCapability) {
    if (checkedCapability.receipt_sha256 !== validated.receipt_sha256
      || checkedCapability.source_sha !== sourceSha
      || checkedCapability.source_tree !== sourceTree
      || checkedCapability.api_source_revision !== apiSourceRevision
      || checkedCapability.api_endpoint_sha256 !== apiEndpointSha256
      || checkedCapability.artifact_sha256 !== artifactSha256) {
      fail("DEPLOYED_API_CAPABILITY_MISMATCH", "RFD-TUW-015 capability does not match its receipt");
    }
  }
  return Object.freeze({
    source_sha: sourceSha,
    source_tree: sourceTree,
    api_endpoint_sha256: apiEndpointSha256,
    artifact_sha256: artifactSha256,
    receipt_sha256: validated.receipt_sha256,
    receipt_schema_version: receipt.schema_version,
    capability_schema_version: checkedCapability?.schema_version ?? null,
    ...capabilityFields,
  });
}

export function validateRfd015Receipt(receipt, expected = {}, options = {}) {
  const binding = extractRfd015Binding(receipt, options);
  if (expected.sourceSha !== undefined) {
    assertSha(expected.sourceSha, SHA1, "INVALID_SOURCE_SHA", "expected source SHA");
    if (binding.source_sha !== expected.sourceSha) fail("SOURCE_SHA_MISMATCH", "RFD-TUW-015 source SHA does not match expected source", { category: "source_sha_mismatch" });
  }
  if (expected.sourceTree !== undefined && expected.sourceTree !== null) {
    assertSha(expected.sourceTree, SHA1, "INVALID_SOURCE_TREE", "expected source tree");
    if (binding.source_tree !== expected.sourceTree) fail("SOURCE_TREE_MISMATCH", "RFD-TUW-015 source tree does not match expected source", { category: "source_tree_mismatch" });
  }
  if (expected.artifactSha256 !== undefined) {
    assertSha(expected.artifactSha256, SHA256, "INVALID_ARTIFACT_SHA", "expected artifact SHA");
    if (binding.artifact_sha256 !== expected.artifactSha256) fail("ARTIFACT_SHA_MISMATCH", "RFD-TUW-015 artifact SHA does not match expected artifact", { category: "artifact_sha_mismatch" });
  }
  const expectedEndpointSha256 = expected.apiEndpointSha256
    ?? (expected.apiEndpoint === undefined ? undefined : (SHA256.test(String(expected.apiEndpoint)) ? String(expected.apiEndpoint) : sha256Bytes(new URL(expected.apiEndpoint).origin)));
  if (expectedEndpointSha256 !== undefined) {
    assertSha(expectedEndpointSha256, SHA256, "INVALID_API_ENDPOINT_SHA", "expected API endpoint SHA");
    if (binding.api_endpoint_sha256 !== expectedEndpointSha256) fail("API_ENDPOINT_MISMATCH", "RFD-TUW-015 API endpoint does not match expected endpoint", { category: "api_endpoint_mismatch" });
  }
  return binding;
}

function normalizeBinding(value, fallback = {}) {
  const sourceSha = value?.source_sha ?? value?.sourceSha ?? fallback.source_sha ?? fallback.sourceSha;
  const sourceTree = value?.source_tree ?? value?.sourceTree ?? fallback.source_tree ?? fallback.sourceTree;
  const rawApiEndpoint = value?.api_endpoint ?? value?.apiEndpoint ?? value?.base_url ?? value?.baseUrl ?? fallback.api_endpoint ?? fallback.apiEndpoint;
  const apiEndpointSha256 = value?.api_endpoint_sha256 ?? value?.apiEndpointSha256 ?? fallback.api_endpoint_sha256 ?? fallback.apiEndpointSha256
    ?? (rawApiEndpoint === undefined ? undefined : (SHA256.test(String(rawApiEndpoint)) ? String(rawApiEndpoint) : sha256Bytes(new URL(rawApiEndpoint).origin)));
  const artifactSha256 = value?.artifact_sha256 ?? value?.artifact_sha ?? value?.artifactSha256 ?? fallback.artifact_sha256 ?? fallback.artifact_sha ?? fallback.artifactSha256;
  return { source_sha: sourceSha, source_tree: sourceTree ?? null, api_endpoint_sha256: apiEndpointSha256, artifact_sha256: artifactSha256 };
}

function assertBindingEqual(actual, expected, label) {
  for (const field of REQUIRED_BINDINGS) {
    if (actual[field] !== expected[field]) fail("RUNTIME_BINDING_MISMATCH", `${label} runtime binding does not match RFD-TUW-015`, { field, category: "exact_binding_mismatch" });
  }
}

function normalizeState(value) {
  if (!isRecord(value)) fail("DURABLE_STATE_MISSING", "Matter/task/time durable state is missing");
  const state = {
    matter: clone(value.matter),
    task: clone(value.task),
    time: clone(value.time),
  };
  for (const key of ["matter", "task", "time"]) {
    if (!isRecord(state[key])) fail("DURABLE_STATE_MISSING", `durable ${key} state is missing`, { field: key });
    if (typeof state[key].id !== "string" || !state[key].id) fail("DURABLE_STATE_ID_MISSING", `durable ${key} state has no id`, { field: key });
  }
  const ids = Object.values(state).map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) fail("DUPLICATE_DURABLE_STATE", "Matter/task/time state contains duplicate ids");
  return state;
}

function normalizeConsoleErrors(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail("CONSOLE_ERRORS_INVALID", "console error collection must be an array");
  return value;
}

function readHandleBinding(handle) {
  if (typeof handle?.runtimeBinding === "function") return handle.runtimeBinding();
  if (handle?.runtime_binding) return handle.runtime_binding;
  if (handle?.binding) return handle.binding;
  return undefined;
}

async function readHandleValue(handle, methodNames, fallback) {
  for (const method of methodNames) {
    if (typeof handle?.[method] === "function") return handle[method]();
  }
  return handle?.[methodNames[0]] ?? fallback;
}

function allScenarioValues() {
  return Object.fromEntries(REQUIRED_SCENARIOS.map((key) => [key, false]));
}

function nullableDigest(value, pattern) {
  return typeof value === "string" && pattern.test(value) ? value : null;
}

function blockedReceipt({ verdict, code, binding = null, expected = {}, generatedAt, message = "external prerequisite is unavailable" }) {
  const scenarios = allScenarioValues();
  return {
    schema_version: SCHEMA_VERSION,
    checkpoint_id: CHECKPOINT_ID,
    generated_at: generatedAt,
    verdict,
    status: verdict,
    blocked_code: code,
    blocked_message: message,
    authoritative: {
      rfd015_receipt_present: false,
      rfd015_receipt_sha256: null,
      rfd015_receipt_schema_version: null,
      rfd015_capability_schema_version: null,
      rfd015_authority_sha256: null,
      rfd015_api_artifact_sha256: null,
      rfd015_manifest_sha256: null,
      rfd015_executed_package_sha256: null,
      rfd015_transcript_sha256: null,
      rfd015_package_qa_receipt_sha256: null,
      rfd015_package_qa_transcript_sha256: null,
      rfd015_package_qa_privacy_corpus_sha256: null,
    },
    source: {
      revision: nullableDigest(expected.sourceSha ?? binding?.source_sha, SHA1),
      source_tree: nullableDigest(expected.sourceTree ?? binding?.source_tree, SHA1),
    },
    deployed_api: {
      endpoint_sha256: nullableDigest(expected.apiEndpointSha256 ?? binding?.api_endpoint_sha256, SHA256),
      endpoint_kind: "private-staging-deployed-api",
    },
    artifact: {
      sha256: nullableDigest(expected.artifactSha256 ?? binding?.artifact_sha256, SHA256),
    },
    identity: { user_id: null, tenant_id: null, user_data_hash: null, user_data_fresh: null },
    scenarios,
    durable_state: null,
    diagnostics: {
      console_error_count: null,
      first_launch_console_error_count: null,
      second_launch_console_error_count: null,
      login_call_count: null,
      second_launch_login_call_count: null,
      adapter_error: { code, message: "external prerequisite is unavailable" },
    },
    boundaries: {
      production_runtime_used: false,
      operator_token_used: false,
      api_write_scope: "none",
    },
  };
}

function failedReceipt({ code, error, binding, expected, generatedAt, identity = {} }) {
  return {
    ...blockedReceipt({
      verdict: FAIL_VERDICT,
      code,
      binding,
      expected,
      generatedAt,
      message: "local restart scenario failed",
    }),
    authoritative: {
      rfd015_receipt_present: false,
      rfd015_receipt_sha256: null,
      rfd015_receipt_schema_version: null,
      rfd015_capability_schema_version: null,
      rfd015_authority_sha256: null,
      rfd015_api_artifact_sha256: null,
      rfd015_manifest_sha256: null,
      rfd015_executed_package_sha256: null,
      rfd015_transcript_sha256: null,
      rfd015_package_qa_receipt_sha256: null,
      rfd015_package_qa_transcript_sha256: null,
      rfd015_package_qa_privacy_corpus_sha256: null,
    },
    identity: {
      user_id: null,
      tenant_id: null,
      user_data_hash: null,
      user_data_fresh: null,
    },
    diagnostics: {
      console_error_count: null,
      first_launch_console_error_count: null,
      second_launch_console_error_count: null,
      login_call_count: null,
      second_launch_login_call_count: null,
      adapter_error: error,
    },
  };
}

function assertSession(session, expectedUserId, expectedTenantId, label, { requireRestoreProof = false } = {}) {
  if (!isRecord(session) || session.state !== "signed_in") fail("SESSION_NOT_RESTORED", `${label} session is not signed in`);
  if (typeof session.user_id !== "string" || (expectedUserId !== undefined && session.user_id !== expectedUserId)) fail("SESSION_USER_MISMATCH", `${label} session user is not the expected synthetic user`);
  if (typeof session.tenant_id !== "string" || session.tenant_id !== expectedTenantId) fail("SESSION_TENANT_MISMATCH", `${label} session tenant is not the expected synthetic tenant`);
  const sessionProof = session.session_fingerprint ?? session.session_proof_sha256 ?? session.session_proof;
  if (sessionProof !== undefined) assertSha(sessionProof, SHA256, "SESSION_PROOF_INVALID", `${label} session proof`);
  if (requireRestoreProof && session.session_restored !== true && session.restored !== true) fail("SESSION_RESTORE_UNPROVEN", `${label} did not prove session restoration`);
  return { state: "signed_in", user_id: session.user_id, tenant_id: session.tenant_id, session_proof: sessionProof ?? null };
}

function safeBindingFromReceipt(binding) {
  return {
    source_sha: binding.source_sha,
    source_tree: binding.source_tree,
    api_endpoint_sha256: binding.api_endpoint_sha256,
    artifact_sha256: binding.artifact_sha256,
    api_artifact_sha256: binding.api_artifact_sha256,
    manifest_sha256: binding.manifest_sha256,
    executed_package_sha256: binding.executed_package_sha256,
    transcript_sha256: binding.transcript_sha256,
    package_qa_receipt_sha256: binding.package_qa_receipt_sha256,
    package_qa_transcript_sha256: binding.package_qa_transcript_sha256,
    package_qa_privacy_corpus_sha256: binding.package_qa_privacy_corpus_sha256,
  };
}

const RESTART_CAPABILITY_KEYS = Object.freeze([
  "schema_version",
  "restart_receipt_sha256",
  "source_sha",
  "source_tree",
  "api_endpoint_sha256",
  "artifact_sha256",
  "rfd015_receipt_sha256",
  "rfd015_capability_schema_version",
  "rfd015_authority_sha256",
  "rfd015_api_artifact_sha256",
  "rfd015_manifest_sha256",
  "rfd015_executed_package_sha256",
  "rfd015_transcript_sha256",
  "rfd015_package_qa_receipt_sha256",
  "rfd015_package_qa_transcript_sha256",
  "rfd015_package_qa_privacy_corpus_sha256",
]);

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  return Object.freeze(value);
}

function assertRestartCapabilityTrusted(capability) {
  if (!isRecord(capability) || !TRUSTED_RESTART_CAPABILITIES.has(capability)) {
    fail("RESTART_CAPABILITY_REQUIRED", "PASS validation requires the opaque same-process RFD-TUW-016 restart capability");
  }
  return capability;
}

function assertRestartCapabilityShape(capability) {
  assertExactKeys(capability, RESTART_CAPABILITY_KEYS, "restart capability");
  if (capability.schema_version !== FORMAL_DEPLOYED_API_RESTART_CAPABILITY_SCHEMA) {
    fail("RESTART_CAPABILITY_SCHEMA_INVALID", "RFD-TUW-016 restart capability schema is invalid");
  }
  assertSha(capability.restart_receipt_sha256, SHA256, "RESTART_CAPABILITY_INVALID", "restart_receipt_sha256");
  assertSha(capability.source_sha, SHA1, "RESTART_CAPABILITY_INVALID", "source_sha");
  assertSha(capability.source_tree, SHA1, "RESTART_CAPABILITY_INVALID", "source_tree");
  for (const field of [
    "api_endpoint_sha256", "artifact_sha256", "rfd015_receipt_sha256", "rfd015_authority_sha256",
    "rfd015_api_artifact_sha256", "rfd015_manifest_sha256", "rfd015_executed_package_sha256",
    "rfd015_transcript_sha256", "rfd015_package_qa_receipt_sha256", "rfd015_package_qa_transcript_sha256",
    "rfd015_package_qa_privacy_corpus_sha256",
  ]) assertSha(capability[field], SHA256, "RESTART_CAPABILITY_INVALID", field);
  if (capability.rfd015_capability_schema_version !== FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA) {
    fail("RESTART_CAPABILITY_INVALID", "restart capability is not bound to the v3 RFD-TUW-015 capability");
  }
  return capability;
}

/**
 * Return the opaque restart authority minted by a real in-process run.
 * JSON serialization, structuredClone, and hand-authored lookalikes are
 * intentionally unable to recreate the WeakMap/WeakSet identity.
 */
export function getFormalDeployedApiRestartCapability(receipt) {
  const capability = RESTART_CAPABILITY_BY_RECEIPT.get(receipt);
  assertRestartCapabilityTrusted(capability);
  return assertRestartCapabilityShape(capability);
}

/**
 * Consumer assertion for downstream exact-SHA gates (RFD-TUW-018).
 * `expected` values are optional individually but, when supplied, must bind
 * this capability to the exact upstream receipt/runtime projection.
 */
export function assertFormalDeployedApiRestartCapability(capability, expected = {}) {
  assertRestartCapabilityTrusted(capability);
  assertRestartCapabilityShape(capability);
  const bindings = {
    sourceSha: "source_sha",
    sourceTree: "source_tree",
    apiEndpointSha256: "api_endpoint_sha256",
    artifactSha256: "artifact_sha256",
    restartReceiptSha256: "restart_receipt_sha256",
    rfd015ReceiptSha256: "rfd015_receipt_sha256",
    rfd015CapabilitySchemaVersion: "rfd015_capability_schema_version",
    rfd015AuthoritySha256: "rfd015_authority_sha256",
    rfd015ApiArtifactSha256: "rfd015_api_artifact_sha256",
    rfd015ManifestSha256: "rfd015_manifest_sha256",
    rfd015ExecutedPackageSha256: "rfd015_executed_package_sha256",
    rfd015TranscriptSha256: "rfd015_transcript_sha256",
    rfd015PackageQaReceiptSha256: "rfd015_package_qa_receipt_sha256",
    rfd015PackageQaTranscriptSha256: "rfd015_package_qa_transcript_sha256",
    rfd015PackageQaPrivacyCorpusSha256: "rfd015_package_qa_privacy_corpus_sha256",
  };
  for (const [option, field] of Object.entries(bindings)) {
    if (expected[option] !== undefined && capability[field] !== expected[option]) {
      fail("RESTART_CAPABILITY_MISMATCH", `${option} does not match the exact restart authority binding`, { field });
    }
  }
  return capability;
}

function mintFormalDeployedApiRestartCapability(receipt, binding) {
  if (receipt?.verdict !== PASS_VERDICT) fail("RESTART_CAPABILITY_MINT_INVALID", "restart capability can only be minted for a PASS receipt");
  const capability = deepFreeze({
    schema_version: FORMAL_DEPLOYED_API_RESTART_CAPABILITY_SCHEMA,
    restart_receipt_sha256: sha256Bytes(canonicalReceiptBytes(receipt)),
    source_sha: binding.source_sha,
    source_tree: binding.source_tree,
    api_endpoint_sha256: binding.api_endpoint_sha256,
    artifact_sha256: binding.artifact_sha256,
    rfd015_receipt_sha256: binding.receipt_sha256,
    rfd015_capability_schema_version: binding.capability_schema_version,
    rfd015_authority_sha256: binding.authority_sha256,
    rfd015_api_artifact_sha256: binding.api_artifact_sha256,
    rfd015_manifest_sha256: binding.manifest_sha256,
    rfd015_executed_package_sha256: binding.executed_package_sha256,
    rfd015_transcript_sha256: binding.transcript_sha256,
    rfd015_package_qa_receipt_sha256: binding.package_qa_receipt_sha256,
    rfd015_package_qa_transcript_sha256: binding.package_qa_transcript_sha256,
    rfd015_package_qa_privacy_corpus_sha256: binding.package_qa_privacy_corpus_sha256,
  });
  assertRestartCapabilityShape(capability);
  TRUSTED_RESTART_CAPABILITIES.add(capability);
  RESTART_CAPABILITY_BY_RECEIPT.set(receipt, capability);
  return capability;
}

const PROCESS_EXIT_TIMEOUT_MS = 10_000;

async function withProcessTimeout(operation, label, timeoutMs = PROCESS_EXIT_TIMEOUT_MS) {
  const timeout = Number.isSafeInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : PROCESS_EXIT_TIMEOUT_MS;
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new FormalRestartQaError("FULL_EXIT_UNPROVEN", `${label} did not complete before the process-exit timeout`)), timeout);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function observeFormalDeployedApiRestartProcessExit(handle, label = "process", timeoutMs) {
  if (typeof handle?.waitForProcessExit !== "function") fail("FULL_EXIT_UNPROVEN", `${label} launch has no OS process-exit observer`);
  const state = await withProcessTimeout(() => handle.waitForProcessExit(), `${label} process exit`, timeoutMs ?? handle.processExitTimeoutMs);
  if (!isRecord(state) || state.exited !== true) fail("FULL_EXIT_UNPROVEN", `${label} launch did not prove an observed process exit`);
  return state;
}

export async function closeFormalDeployedApiRestartProcess(handle, label = "process", timeoutMs) {
  if (typeof handle?.exit !== "function") fail("FULL_EXIT_UNPROVEN", `${label} launch has no full-exit operation`);
  await withProcessTimeout(() => handle.exit(), `${label} process close`, timeoutMs ?? handle.processExitTimeoutMs);
  return observeFormalDeployedApiRestartProcessExit(handle, label, timeoutMs);
}

export function assertFormalDeployedApiRestartProcessExit(state, label = "process") {
  if (!isRecord(state) || state.exited !== true || !Number.isInteger(state.exit_code)) {
    fail("FULL_EXIT_UNPROVEN", `${label} launch did not return an observed OS exit code`);
  }
  if (state.exit_code !== 0) fail("FULL_EXIT_UNPROVEN", `${label} launch exited with a non-zero code`);
  return state;
}

async function cleanupProcess(handle, label, observed = false) {
  if (!handle || observed) return null;
  let cleanupError = null;
  try {
    if (typeof handle.exit !== "function") fail("PROCESS_CLEANUP_FAILED", `${label} process has no cleanup operation`);
    await withProcessTimeout(() => handle.exit(), `${label} cleanup`, handle.processExitTimeoutMs);
  } catch (error) {
    cleanupError = error;
  }
  try {
    if (typeof handle.waitForProcessExit !== "function") fail("PROCESS_CLEANUP_FAILED", `${label} cleanup has no process-exit observer`);
    const state = await observeFormalDeployedApiRestartProcessExit(handle, `${label} cleanup`);
    if (state.exit_code !== 0) fail("PROCESS_CLEANUP_FAILED", `${label} cleanup observed a non-zero process exit`);
  } catch (error) {
    cleanupError ??= error;
  }
  return cleanupError;
}

export async function cleanupFormalDeployedApiRestartProcess(handle, label = "process") {
  const error = await cleanupProcess(handle, label, false);
  if (error) throw error;
  return { cleaned: true };
}

async function cleanupProcesses(handles) {
  let firstError = null;
  for (const { handle, label, observed } of handles) {
    const error = await cleanupProcess(handle, label, observed);
    firstError ??= error;
  }
  return firstError;
}

async function cleanupTrackedRestartAdapter(adapter) {
  if (!adapter) return null;
  if (typeof adapter.cleanup !== "function") {
    return new FormalRestartQaError("PROCESS_CLEANUP_FAILED", "tracked restart adapter has no residue cleanup operation");
  }
  try {
    await withProcessTimeout(() => adapter.cleanup(), "restart adapter cleanup", adapter.processExitTimeoutMs);
    return null;
  } catch (error) {
    return error;
  }
}

/**
 * Drive the two-launch contract through the private built-in installed-app
 * adapter.  The `adapter` option remains only as a negative-test sentinel and
 * is rejected before any caller method can run; test adapters are never
 * registered and cannot claim deployed execution.
 *
 * Required adapter methods:
 *   launch({ phase, userDataId, tenantId, binding }) -> handle
 *   handle.login() / createMatterState() / restoreSession() / readMatterState()
 *   handle.exit() / waitForProcessExit() / durableStateEvidence()
 * The adapter must set actual_execution=true and test_adapter_used=false.
 * Optional methods: runtimeBinding(), consoleErrors(), isolationProbe(), metrics().
 * When loading an RFD-TUW-015 receipt by path, `packageQaCapability` must be
 * the opaque in-process RFD-TUW-014 capability accepted by its canonical
 * reader; a serialized receipt alone is never restart authority.
 */
export async function runFormalDeployedApiRestartQa({
  adapter,
  syntheticMode = false,
  rfd015Receipt,
  rfd015ReceiptPath,
  rfd015Capability,
  packageQaCapability,
  launcherCapability,
  packageLauncherCapability,
  authoritativeCapability,
  rootDir = process.cwd(),
  authoritativeReceipt,
  expectedSourceSha,
  sourceSha,
  expectedSourceTree,
  sourceTree,
  expectedArtifactSha256,
  artifactSha256,
  expectedApiEndpoint,
  apiEndpoint,
  expectedApiEndpointSha256,
  apiEndpointSha256,
  credentialAccount,
  chainToken,
  testOnlyMode,
  userDataId,
  tenantId = "tenant_lawos_staging_cut007_a",
  generatedAt = new Date().toISOString(),
} = {}) {
  expectedSourceSha ??= sourceSha;
  expectedSourceTree ??= sourceTree;
  expectedArtifactSha256 ??= artifactSha256;
  expectedApiEndpoint ??= apiEndpoint;
  expectedApiEndpointSha256 ??= apiEndpointSha256;
  rfd015Receipt ??= authoritativeReceipt;
  rfd015Capability ??= authoritativeCapability;
  launcherCapability ??= packageLauncherCapability;
  const testOnlyRun = testOnlyMode === TEST_ONLY_EVALUATOR_TOKEN;
  const expected = {
    sourceSha: expectedSourceSha,
    sourceTree: expectedSourceTree,
    artifactSha256: expectedArtifactSha256,
    apiEndpoint: expectedApiEndpoint,
    apiEndpointSha256: expectedApiEndpointSha256,
  };
  const effectiveUserDataId = userDataId ?? `rfd016-synthetic-user-data-${randomUUID()}`;
  if (syntheticMode === true) {
    return blockedReceipt({
      verdict: BLOCKED_BY_DEPLOYED_API,
      code: "SYNTHETIC_MODE_TEST_ONLY",
      expected,
      generatedAt,
      message: "synthetic adapter mode cannot authorize deployed API QA",
    });
  }
  if (testOnlyRun && (!isRecord(adapter) || adapter.actual_execution !== false || adapter.test_adapter_used !== true)) {
    return blockedReceipt({
      verdict: BLOCKED_BY_ARTIFACT,
      code: "TEST_ONLY_ADAPTER_REQUIRED",
      expected,
      generatedAt,
      message: "the non-authoritative evaluator accepts only a marked TEST_ONLY adapter",
    });
  }
  // A caller-supplied adapter is never an operational input.  Preserve the
  // canonical test-only receipt diagnostic for legacy fixtures, but reject
  // every non-test authority before any adapter method can run.
  if (!testOnlyRun && adapter !== undefined && rfd015Receipt
    && !(rfd015Receipt?._test_only === true || rfd015Receipt?.synthetic_only === true)) {
    return blockedReceipt({
      verdict: BLOCKED_BY_ARTIFACT,
      code: "RESTART_ADAPTER_INJECTION_REJECTED",
      expected,
      generatedAt,
      message: "caller-provided restart adapters are not accepted",
    });
  }
  if (!testOnlyRun && rfd015ReceiptPath && !packageQaCapability) {
    return blockedReceipt({
      verdict: BLOCKED_BY_ARTIFACT,
      code: "RESTART_PACKAGE_QA_CAPABILITY_MISSING",
      expected,
      generatedAt,
      message: "RFD-TUW-014 package QA capability is required before restart adapter registration",
    });
  }
  if (!testOnlyRun && !rfd015Receipt && rfd015ReceiptPath) {
    try {
      const loaded = readTrustedFormalDeployedApiPackageQaReceipt(rfd015ReceiptPath, { rootDir, packageQaCapability });
      rfd015Receipt = loaded.receipt;
      rfd015Capability = loaded.capability;
      if (!loaded.capability || typeof loaded.capability !== "object") {
        return blockedReceipt({ verdict: BLOCKED_BY_DEPLOYED_API, code: "DEPLOYED_API_CAPABILITY_MISSING", expected, generatedAt, message: "RFD-TUW-015 opaque authority capability is required" });
      }
    } catch (error) {
      const code = typeof error?.code === "string" && SAFE_CODE.test(error.code) ? error.code : "DEPLOYED_API_RECEIPT_READ_FAILED";
      return blockedReceipt({ verdict: BLOCKED_BY_DEPLOYED_API, code, expected, generatedAt, message: "canonical RFD-TUW-015 receipt could not be read" });
    }
  }
  if (!testOnlyRun && adapter !== undefined && rfd015Receipt
    && !(rfd015Receipt?._test_only === true || rfd015Receipt?.synthetic_only === true)) {
    return blockedReceipt({
      verdict: BLOCKED_BY_ARTIFACT,
      code: "RESTART_ADAPTER_INJECTION_REJECTED",
      expected,
      generatedAt,
      message: "caller-provided restart adapters are not accepted",
    });
  }
  if (!testOnlyRun && rfd015Receipt && !(rfd015Receipt?._test_only === true || rfd015Receipt?.synthetic_only === true)
    && chainToken !== CANONICAL_CHAIN_TOKEN) {
    return blockedReceipt({
      verdict: BLOCKED_BY_ARTIFACT,
      code: "RFD016_CHAIN_REQUIRED",
      expected,
      generatedAt,
      message: "RFD-TUW-016 must be invoked by the canonical in-process RFD-TUW-015 chain",
    });
  }
  let binding;
  if (testOnlyRun) {
    binding = Object.freeze({
      source_sha: expected.sourceSha,
      source_tree: expected.sourceTree,
      artifact_sha256: expected.artifactSha256,
      api_endpoint_sha256: expected.apiEndpointSha256,
      api_artifact_sha256: "1".repeat(64),
      manifest_sha256: "f".repeat(64),
      executed_package_sha256: "e".repeat(64),
      transcript_sha256: "2".repeat(64),
      package_qa_receipt_sha256: "3".repeat(64),
      package_qa_transcript_sha256: "4".repeat(64),
      package_qa_privacy_corpus_sha256: "5".repeat(64),
      receipt_sha256: sha256Bytes(canonicalReceiptBytes(rfd015Receipt)),
      receipt_schema_version: FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA,
      capability_schema_version: FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA,
      authority_sha256: "6".repeat(64),
    });
  } else {
    try {
      binding = validateRfd015Receipt(rfd015Receipt, expected, { requireTrusted: true, capability: rfd015Capability });
    } catch (error) {
      const code = new Set([
        "INVALID_SOURCE_SHA", "INVALID_SOURCE_TREE", "INVALID_ARTIFACT_SHA", "INVALID_API_ENDPOINT_SHA",
        "SOURCE_SHA_MISMATCH", "SOURCE_TREE_MISMATCH", "ARTIFACT_SHA_MISMATCH", "API_ENDPOINT_MISMATCH",
        "DEPLOYED_API_SOURCE_MISSING", "DEPLOYED_API_SOURCE_TREE_INVALID", "DEPLOYED_API_ARTIFACT_MISSING", "DEPLOYED_API_ENDPOINT_INVALID",
      ]).has(error.code)
        ? BLOCKED_BY_ARTIFACT
        : BLOCKED_BY_DEPLOYED_API;
      return blockedReceipt({ verdict: code, code: error.code ?? code, expected, generatedAt });
    }
  }
  if (!testOnlyRun && (!rfd015ReceiptPath || !rfd015Capability || !packageQaCapability || !launcherCapability)) {
    return blockedReceipt({
      verdict: BLOCKED_BY_ARTIFACT,
      code: "RESTART_EXECUTABLE_AUTHORITY_MISSING",
      binding,
      expected,
      generatedAt,
      message: "validated package, executable, package-QA, and OS-launcher authority are required",
    });
  }
  let realAdapter;
  try {
    if (testOnlyRun) {
      realAdapter = adapter;
    } else {
    realAdapter = registerFormalDeployedApiRestartAdapter(createFormalDeployedApiRestartAdapter({
      receiptPath: rfd015ReceiptPath,
      receipt: rfd015Receipt,
      rfd015Capability,
      packageQaCapability,
      launcherCapability,
      expectedSourceSha: binding.source_sha,
      expectedSourceTree: binding.source_tree,
      expectedArtifactSha256: binding.artifact_sha256,
      expectedApiEndpointSha256: binding.api_endpoint_sha256,
      credentialAccount,
      rootDir,
      tenantId,
    }));
    }
  } catch (error) {
    const code = typeof error?.code === "string" && SAFE_CODE.test(error.code)
      ? error.code
      : "RESTART_EXECUTABLE_AUTHORITY_MISSING";
    return blockedReceipt({
      verdict: BLOCKED_BY_ARTIFACT,
      code,
      binding,
      expected,
      generatedAt,
      message: "validated package/executable authority could not create the built-in restart adapter",
    });
  }
  const identity = { user_id: null, tenant_id: tenantId, user_data_hash: safeHashIdentifier(effectiveUserDataId) };
  let first;
  let second;
  let firstState;
  let restoredState;
  let firstSession;
  let restoredSession;
  let firstConsoleErrors;
  let secondConsoleErrors;
  let firstExitObserved = false;
  let secondExitObserved = false;
  try {
    first = await realAdapter.launch({ phase: "first", userDataId: effectiveUserDataId, tenantId, binding: safeBindingFromReceipt(binding) });
    if (!first || typeof first !== "object") fail("FIRST_LAUNCH_INVALID", "first launch did not return a handle");
    const firstBinding = readHandleBinding(first);
    if (!firstBinding) fail("RUNTIME_BINDING_MISSING", "first launch did not prove source/API/artifact binding");
    assertBindingEqual(normalizeBinding(firstBinding), binding, "first launch");
    if (typeof first.userDataPathHash !== "string" || !SHA256.test(first.userDataPathHash)) {
      fail("RESTART_USER_DATA_UNPROVEN", "first launch did not report its canonical isolated userData path");
    }
    identity.user_data_hash = first.userDataPathHash;
    firstSession = assertSession(await readHandleValue(first, ["login"], null), undefined, tenantId, "first login");
  } catch (error) {
    // The first-login contract accepts a synthetic adapter's user id from the
    // login response; assertSession's undefined user id is handled below after
    // the raw response is captured. This branch only reports safe diagnostics.
    const safe = safeError(error, "FIRST_LOGIN_FAILED");
    // The launch handle exists before login can fail. Close it on this early
    // path as well; otherwise a credential or session error leaks a live app
    // process outside the scenario boundary.
    const cleanupError = await cleanupProcesses([{ handle: first, label: "first", observed: firstExitObserved }]);
    const adapterCleanupError = await cleanupTrackedRestartAdapter(realAdapter);
    const finalError = cleanupError || adapterCleanupError
      ? { code: "PROCESS_CLEANUP_FAILED", message: sanitizeErrorMessage() }
      : safe;
    return failedReceipt({ code: finalError.code, error: finalError, binding, expected, generatedAt, identity });
  }
  try {
    const firstRawSession = await readHandleValue(first, ["lastLoginSession", "session"], firstSession);
    const firstUserId = firstRawSession?.user_id ?? firstSession?.user_id;
    if (!firstUserId) fail("FIRST_LOGIN_USER_MISSING", "first login did not return a user id");
    firstSession = assertSession(firstRawSession, firstUserId, tenantId, "first login");
    if (!firstSession.session_proof) fail("SESSION_PROOF_UNPROVEN", "first login did not return a non-secret session proof");
    identity.user_id = firstSession.user_id;
    firstState = normalizeState(await readHandleValue(first, ["createMatterState"], null));
    if (typeof first.consoleErrors !== "function") fail("CONSOLE_ERRORS_UNPROVEN", "first launch has no console error collector");
    firstConsoleErrors = normalizeConsoleErrors(await first.consoleErrors());
    if (firstConsoleErrors.length) fail("CONSOLE_ERRORS_PRESENT", "first launch emitted console errors");
    // A handle-controlled `closed` flag is not process evidence. A reviewed
    // adapter must wait on the launched OS process and return an observed
    // zero exit code before the second launch is permitted.
    const firstExitState = await closeFormalDeployedApiRestartProcess(first, "first");
    firstExitObserved = true;
    assertFormalDeployedApiRestartProcessExit(firstExitState, "first");
    second = await realAdapter.launch({ phase: "second", userDataId: effectiveUserDataId, tenantId, binding: safeBindingFromReceipt(binding) });
    if (!second || typeof second !== "object") fail("SECOND_LAUNCH_INVALID", "second launch did not return a handle");
    const secondBinding = readHandleBinding(second);
    if (!secondBinding) fail("RUNTIME_BINDING_MISSING", "second launch did not prove source/API/artifact binding");
    assertBindingEqual(normalizeBinding(secondBinding), binding, "second launch");
    const secondUserDataId = second.userDataId ?? second.user_data_id ?? effectiveUserDataId;
    const secondTenantId = second.tenantId ?? second.tenant_id ?? tenantId;
    if (secondUserDataId !== effectiveUserDataId) fail("USER_DATA_MIX", "second launch used a different isolated userData");
    if (secondTenantId !== tenantId) fail("TENANT_MIX", "second launch used a different tenant");
    if (typeof second.restoreSession !== "function") fail("SESSION_RESTORE_UNPROVEN", "second launch has no session restore operation");
    const restoredRawSession = await second.restoreSession();
    restoredSession = assertSession(restoredRawSession, firstSession.user_id, tenantId, "second launch", { requireRestoreProof: true });
    if (!restoredSession.session_proof || restoredSession.session_proof !== firstSession.session_proof) fail("SESSION_PROOF_MISMATCH", "second launch restored a different or unproven session");
    restoredState = normalizeState(await readHandleValue(second, ["readMatterState"], null));
    if (typeof second.consoleErrors !== "function") fail("CONSOLE_ERRORS_UNPROVEN", "second launch has no console error collector");
    secondConsoleErrors = normalizeConsoleErrors(await second.consoleErrors());
    if (secondConsoleErrors.length) fail("CONSOLE_ERRORS_PRESENT", "second launch emitted console errors");
    if (canonical(restoredState) !== canonical(firstState)) fail("DURABLE_STATE_MISMATCH", "Matter/task/time state changed across restart");
    if (typeof second.durableStateEvidence !== "function") fail("DURABLE_STATE_EVIDENCE_UNPROVEN", "restart scenario has no independent durable-row/duplicate evidence");
    const durableEvidence = await second.durableStateEvidence({ beforeRestart: firstState, afterRestart: restoredState });
    const beforeDurableEvidence = validateDurableStateEvidence(durableEvidence?.before_restart, "durableStateEvidence.before_restart");
    const afterDurableEvidence = validateDurableStateEvidence(durableEvidence?.after_restart, "durableStateEvidence.after_restart");
    const isolation = typeof second.isolationProbe === "function"
      ? await second.isolationProbe({ userDataId: effectiveUserDataId, tenantId, state: restoredState })
      : typeof realAdapter.isolationProbe === "function"
        ? await realAdapter.isolationProbe({ userDataId: effectiveUserDataId, tenantId, state: restoredState })
        : null;
    if (!isRecord(isolation)) fail("ISOLATION_UNPROVEN", "restart scenario has no userData/tenant isolation probe");
    assertExactKeys(isolation, ["cross_mix", "user_data_match", "fresh_user_data", "tenant_match", "foreign_state_ids", "user_data_hash"], "isolation probe");
    if (isolation.cross_mix !== false
      || isolation.user_data_match !== true
      || isolation.fresh_user_data !== true
      || isolation.tenant_match !== true
      || !Array.isArray(isolation.foreign_state_ids)
      || isolation.foreign_state_ids.length !== 0
      || isolation.user_data_hash !== identity.user_data_hash) {
      fail("ISOLATION_MIX", "restart readback crossed userData or tenant boundaries");
    }
    if (typeof realAdapter.metrics !== "function") fail("LOGIN_COUNT_UNPROVEN", "restart scenario has no login call metrics");
    const metrics = await realAdapter.metrics();
    const loginCalls = Number(metrics?.login_calls ?? metrics?.loginCallCount ?? NaN);
    const secondLaunchLoginCalls = Number(metrics?.second_launch_login_calls ?? metrics?.secondLaunchLoginCalls ?? NaN);
    if (loginCalls !== 1) fail("LOGIN_COUNT_MISMATCH", "restart scenario must perform exactly one login");
    if (secondLaunchLoginCalls !== 0) fail("SECOND_LOGIN_USED", "second launch must restore without login");
    const secondExitState = await closeFormalDeployedApiRestartProcess(second, "second");
    secondExitObserved = true;
    assertFormalDeployedApiRestartProcessExit(secondExitState, "second");
    const adapterCleanupError = await cleanupTrackedRestartAdapter(realAdapter);
    if (adapterCleanupError) fail("PROCESS_CLEANUP_FAILED", "restart adapter cleanup did not prove zero residue");
    if (testOnlyRun) {
      return blockedReceipt({
        verdict: BLOCKED_BY_DEPLOYED_API,
        code: "SYNTHETIC_MODE_TEST_ONLY",
        binding,
        expected,
        generatedAt,
        message: "test-only fixture completed the restart state machine without deployment authority",
      });
    }
    const receipt = {
      schema_version: SCHEMA_VERSION,
      checkpoint_id: CHECKPOINT_ID,
      generated_at: generatedAt,
      verdict: PASS_VERDICT,
      status: PASS_VERDICT,
      authoritative: {
        rfd015_receipt_present: true,
        rfd015_receipt_sha256: binding.receipt_sha256,
        rfd015_receipt_schema_version: binding.receipt_schema_version,
        rfd015_capability_schema_version: binding.capability_schema_version,
        rfd015_authority_sha256: binding.authority_sha256,
        rfd015_api_artifact_sha256: binding.api_artifact_sha256,
        rfd015_manifest_sha256: binding.manifest_sha256,
        rfd015_executed_package_sha256: binding.executed_package_sha256,
        rfd015_transcript_sha256: binding.transcript_sha256,
        rfd015_package_qa_receipt_sha256: binding.package_qa_receipt_sha256,
        rfd015_package_qa_transcript_sha256: binding.package_qa_transcript_sha256,
        rfd015_package_qa_privacy_corpus_sha256: binding.package_qa_privacy_corpus_sha256,
      },
      source: {
        revision: binding.source_sha,
        source_tree: binding.source_tree,
      },
      deployed_api: {
        endpoint_sha256: binding.api_endpoint_sha256,
        endpoint_kind: "private-staging-deployed-api",
      },
      artifact: { sha256: binding.artifact_sha256 },
      identity: {
        user_id: identity.user_id,
        tenant_id: tenantId,
        user_data_hash: identity.user_data_hash,
        user_data_fresh: true,
      },
      scenarios: Object.fromEntries(REQUIRED_SCENARIOS.map((key) => [key, true])),
      durable_state: {
        before_restart: firstState,
        after_restart: restoredState,
        state_sha256_before_restart: sha256(firstState),
        state_sha256_after_restart: sha256(restoredState),
        before_restart_evidence: beforeDurableEvidence,
        after_restart_evidence: afterDurableEvidence,
      },
      diagnostics: {
        console_error_count: firstConsoleErrors.length + secondConsoleErrors.length,
        first_launch_console_error_count: firstConsoleErrors.length,
        second_launch_console_error_count: secondConsoleErrors.length,
        login_call_count: loginCalls,
        second_launch_login_call_count: secondLaunchLoginCalls,
        adapter_error: null,
      },
      boundaries: {
        production_runtime_used: false,
        operator_token_used: false,
        api_write_scope: "synthetic-staging-only",
      },
    };
    scanSecrets(receipt);
    const trustedReceipt = deepFreeze(receipt);
    mintFormalDeployedApiRestartCapability(trustedReceipt, binding);
    return trustedReceipt;
  } catch (error) {
    const safe = safeError(error);
    const cleanupError = await cleanupProcesses([
      { handle: first, label: "first", observed: firstExitObserved },
      { handle: second, label: "second", observed: secondExitObserved },
    ]);
    const adapterCleanupError = await cleanupTrackedRestartAdapter(realAdapter);
    const cleanupFailed = cleanupError || adapterCleanupError;
    const finalError = cleanupFailed && safe.code !== "FULL_EXIT_UNPROVEN"
      ? { code: "PROCESS_CLEANUP_FAILED", message: sanitizeErrorMessage() }
      : safe;
    return failedReceipt({ code: finalError.code, error: finalError, binding, expected, generatedAt, identity });
  }
}

/**
 * Canonical same-process RFD-TUW-015 -> RFD-TUW-016 seam.  The upstream
 * runner calls this while its opaque RFD-TUW-014 launcher/package capability,
 * RFD-TUW-015 authority capability, and loader-bound credential capability
 * are still alive.  No adapter, executable path, module path, or output path
 * is accepted from callers; the restart sidecar is derived beside the
 * canonical RFD-TUW-015 receipt and written atomically here.
 */
export async function runFormalDeployedApiRestartQaFromCanonicalChain({
  rfd015ReceiptPath,
  rfd015Receipt,
  rfd015Capability,
  packageQaCapability,
  launcherCapability,
  credentialAccountCapability,
  rootDir = process.cwd(),
  generatedAt,
} = {}) {
  const restartReceiptPath = rfd015ReceiptPath
    ? resolve(dirname(resolve(rfd015ReceiptPath)), "rfd016-restart-receipt.json")
    : null;
  const expected = {
    sourceSha: rfd015Receipt?.source?.expected_revision,
    sourceTree: rfd015Receipt?.source?.source_tree,
    artifactSha256: rfd015Receipt?.package?.artifact_sha256,
    apiEndpointSha256: rfd015Receipt?.deployment?.api_endpoint_sha256,
  };
  if (!rfd015ReceiptPath || !rfd015Receipt || !rfd015Capability || !packageQaCapability || !launcherCapability || !credentialAccountCapability) {
    const receipt = blockedReceipt({
      verdict: BLOCKED_BY_ARTIFACT,
      code: "RFD016_CHAIN_REQUIRED",
      expected,
      generatedAt: generatedAt ?? new Date().toISOString(),
      message: "RFD-TUW-016 requires the live in-process RFD-TUW-015 chain capabilities",
    });
    return Object.freeze({ receipt, capability: null, receiptPath: null });
  }
  const credentialValidator = FORMAL_DEPLOYED_API_INPUTS.validateFormalDeployedApiCredentialAccountCapability;
  if (typeof credentialValidator !== "function") {
    throw new FormalRestartQaError("RFD016_CHAIN_REQUIRED", "RFD-TUW-015 credential-account capability validator is unavailable");
  }
  let credentialBinding;
  try {
    credentialBinding = credentialValidator(credentialAccountCapability);
  } catch {
    throw new FormalRestartQaError("RFD016_CHAIN_REQUIRED", "RFD-TUW-015 credential-account capability is not canonical");
  }
  const credentialAccount = isRecord(credentialBinding?.account)
    ? credentialBinding.account
    : credentialBinding;
  if (!isRecord(credentialAccount)) {
    throw new FormalRestartQaError("RFD016_CHAIN_REQUIRED", "RFD-TUW-015 credential-account capability returned no account authority");
  }
  const receipt = await runFormalDeployedApiRestartQa({
    rfd015ReceiptPath,
    rfd015Receipt,
    rfd015Capability,
    packageQaCapability,
    launcherCapability,
    credentialAccount,
    rootDir,
    tenantId: credentialAccount.tenant_id,
    generatedAt,
    chainToken: CANONICAL_CHAIN_TOKEN,
  });
  let capability = null;
  if (receipt.verdict === PASS_VERDICT) {
    capability = getFormalDeployedApiRestartCapability(receipt);
    validateFormalDeployedApiRestartReceipt(receipt, {
      authoritativeReceipt: rfd015Receipt,
      authoritativeCapability: rfd015Capability,
      restartCapability: capability,
      expectedSourceSha: expected.sourceSha,
      expectedSourceTree: expected.sourceTree,
      expectedArtifactSha256: expected.artifactSha256,
      expectedApiEndpointSha256: expected.apiEndpointSha256,
    });
  } else {
    validateFormalDeployedApiRestartReceipt(receipt, {});
  }
  if (!restartReceiptPath) throw new FormalRestartQaError("RFD016_CHAIN_REQUIRED", "restart receipt output path could not be derived");
  writePrivateFile(restartReceiptPath, canonicalReceiptBytes(receipt), rootDir);
  return Object.freeze({ receipt, capability, receiptPath: restartReceiptPath });
}

function assertExactKeys(value, keys, field) {
  if (!isRecord(value)) fail("INVALID_SHAPE", `${field} must be an object`, { field });
  const expected = new Set(keys);
  const missing = keys.filter((key) => !(key in value));
  const unknown = Object.keys(value).filter((key) => !expected.has(key));
  if (missing.length) fail("MISSING_KEY", `${field} is missing required keys`, { field });
  if (unknown.length) fail("UNKNOWN_KEY", `${field} contains unknown keys`, { field });
}

function validateStateSnapshot(value, field) {
  const state = normalizeState(value);
  if (field === "before_restart" || field === "after_restart") return state;
  return state;
}

function validateDurableStateEvidence(value, field) {
  assertExactKeys(value, ["matter_count", "task_count", "time_count", "duplicate_state_count"], field);
  for (const key of ["matter_count", "task_count", "time_count", "duplicate_state_count"]) {
    if (!Number.isSafeInteger(value[key]) || value[key] < 0) fail("DURABLE_STATE_EVIDENCE_INVALID", `${field}.${key} must be a non-negative safe integer`);
  }
  if (value.matter_count !== 1 || value.task_count !== 1 || value.time_count !== 1 || value.duplicate_state_count !== 0) {
    fail("DUPLICATE_DURABLE_STATE", `${field} did not prove exactly one Matter/task/time row and zero duplicates`);
  }
  return value;
}

function assertNullableSha(value, pattern, code, field) {
  if (value !== null) assertSha(value, pattern, code, field);
}

function validateNonPassReceipt(receipt) {
  assertExactKeys(receipt.authoritative, AUTHORITATIVE_KEYS, "authoritative");
  if (receipt.authoritative.rfd015_receipt_present !== false
    || receipt.authoritative.rfd015_receipt_sha256 !== null
    || receipt.authoritative.rfd015_receipt_schema_version !== null
    || AUTHORITATIVE_KEYS.slice(3).some((key) => receipt.authoritative[key] !== null)) {
    fail("AUTHORITATIVE_RECEIPT_OVERSTATED", "blocked or failed restart receipt cannot claim RFD-TUW-015 authority");
  }
  assertExactKeys(receipt.source, ["revision", "source_tree"], "source");
  assertNullableSha(receipt.source.revision, SHA1, "INVALID_SOURCE_SHA", "source.revision");
  assertNullableSha(receipt.source.source_tree, SHA1, "INVALID_SOURCE_TREE", "source.source_tree");
  assertExactKeys(receipt.deployed_api, ["endpoint_sha256", "endpoint_kind"], "deployed_api");
  assertNullableSha(receipt.deployed_api.endpoint_sha256, SHA256, "INVALID_API_ENDPOINT_SHA", "deployed_api.endpoint_sha256");
  if (receipt.deployed_api.endpoint_kind !== "private-staging-deployed-api") fail("API_BOUNDARY_INVALID", "blocked or failed restart receipt API boundary drifted");
  assertExactKeys(receipt.artifact, ["sha256"], "artifact");
  assertNullableSha(receipt.artifact.sha256, SHA256, "INVALID_ARTIFACT_SHA", "artifact.sha256");
  assertExactKeys(receipt.identity, ["user_id", "tenant_id", "user_data_hash", "user_data_fresh"], "identity");
  if (receipt.identity.user_id !== null || receipt.identity.tenant_id !== null || receipt.identity.user_data_hash !== null || receipt.identity.user_data_fresh !== null) {
    fail("IDENTITY_OVERSTATED", "blocked or failed restart receipt cannot claim restored identity");
  }
  assertExactKeys(receipt.scenarios, REQUIRED_SCENARIOS, "scenarios");
  if (REQUIRED_SCENARIOS.some((key) => receipt.scenarios[key] !== false)) fail("SCENARIO_OVERSTATED", "blocked or failed restart receipt cannot claim proven scenarios");
  if (receipt.durable_state !== null) fail("DURABLE_STATE_OVERSTATED", "blocked or failed restart receipt cannot include durable state");
  assertExactKeys(receipt.diagnostics, [
    "console_error_count", "first_launch_console_error_count", "second_launch_console_error_count",
    "login_call_count", "second_launch_login_call_count", "adapter_error",
  ], "diagnostics");
  for (const field of ["console_error_count", "first_launch_console_error_count", "second_launch_console_error_count", "login_call_count", "second_launch_login_call_count"]) {
    if (receipt.diagnostics[field] !== null) fail("DIAGNOSTIC_OVERSTATED", `blocked or failed restart receipt cannot claim ${field}`);
  }
  assertExactKeys(receipt.diagnostics.adapter_error, ["code", "message"], "diagnostics.adapter_error");
  assertSafeCode(receipt.blocked_code, "blocked_code");
  if (receipt.diagnostics.adapter_error.code !== receipt.blocked_code) fail("DIAGNOSTIC_CODE_MISMATCH", "adapter error code does not match blocked_code");
  const expectedErrorMessage = receipt.verdict === FAIL_VERDICT
    ? "restart QA adapter failure (details redacted)"
    : "external prerequisite is unavailable";
  if (receipt.diagnostics.adapter_error.message !== expectedErrorMessage) fail("DIAGNOSTIC_MESSAGE_INVALID", "adapter error message is not the redacted diagnostic form");
  if (typeof receipt.blocked_message !== "string" || !receipt.blocked_message.trim() || receipt.blocked_message.length > 256) fail("BLOCKED_MESSAGE_INVALID", "blocked_message is invalid");
  if (receipt.verdict === FAIL_VERDICT && receipt.blocked_message !== "local restart scenario failed") {
    fail("BLOCKED_MESSAGE_INVALID", "failed restart receipt has an invalid blocked_message");
  }
  assertExactKeys(receipt.boundaries, ["production_runtime_used", "operator_token_used", "api_write_scope"], "boundaries");
  if (receipt.boundaries.production_runtime_used !== false
    || receipt.boundaries.operator_token_used !== false
    || receipt.boundaries.api_write_scope !== "none") {
    fail("BOUNDARY_VIOLATION", "blocked or failed restart receipt exceeds the no-write boundary");
  }
  return Object.freeze({ verdict: receipt.verdict, status: receipt.status, blocked_code: receipt.blocked_code });
}

export function validateFormalDeployedApiRestartReceipt(receipt, {
  authoritativeReceipt,
  rfd015Receipt,
  expectedSourceSha,
  sourceSha,
  expectedSourceTree,
  sourceTree,
  expectedArtifactSha256,
  artifactSha256,
  expectedApiEndpoint,
  apiEndpoint,
  expectedApiEndpointSha256,
  apiEndpointSha256,
  authoritativeCapability,
  restartCapability,
} = {}) {
  authoritativeReceipt ??= rfd015Receipt;
  expectedSourceSha ??= sourceSha;
  expectedSourceTree ??= sourceTree;
  expectedArtifactSha256 ??= artifactSha256;
  expectedApiEndpoint ??= apiEndpoint;
  expectedApiEndpointSha256 ??= apiEndpointSha256;
  if (!isRecord(receipt)) fail("INVALID_SHAPE", "restart receipt must be an object");
  scanSecrets(receipt);
  const topLevelKeys = [
    "schema_version", "checkpoint_id", "generated_at", "verdict", "status", "authoritative", "source",
    "deployed_api", "artifact", "identity", "scenarios", "durable_state", "diagnostics", "boundaries",
  ];
  if (receipt.verdict !== PASS_VERDICT) topLevelKeys.push("blocked_code", "blocked_message");
  assertExactKeys(receipt, topLevelKeys, "restart receipt");
  if (receipt.schema_version !== SCHEMA_VERSION) fail("SCHEMA_VERSION_MISMATCH", "restart receipt schema version is invalid");
  if (receipt.checkpoint_id !== CHECKPOINT_ID) fail("CHECKPOINT_ID_MISMATCH", "restart receipt checkpoint id is invalid");
  if (receipt.status !== receipt.verdict) fail("STATUS_VERDICT_MISMATCH", "restart receipt status and verdict differ");
  if (![PASS_VERDICT, BLOCKED_BY_DEPLOYED_API, BLOCKED_BY_ARTIFACT, FAIL_VERDICT].includes(receipt.verdict)) fail("INVALID_VERDICT", "restart receipt verdict is invalid");
  if (typeof receipt.generated_at !== "string" || !receipt.generated_at) fail("GENERATED_AT_INVALID", "restart receipt generated_at is invalid");
  if (receipt.verdict !== PASS_VERDICT) {
    return validateNonPassReceipt(receipt);
  }
  if (!authoritativeCapability) fail("AUTHORITATIVE_CAPABILITY_REQUIRED", "PASS validation requires the opaque RFD-TUW-015 capability");
  try {
    validateFormalDeployedApiAuthorityCapability(authoritativeCapability);
  } catch {
    fail("AUTHORITATIVE_CAPABILITY_REQUIRED", "PASS validation requires the opaque RFD-TUW-015 capability issued by its canonical reader");
  }
  assertExactKeys(receipt.authoritative, AUTHORITATIVE_KEYS, "authoritative");
  if (receipt.authoritative.rfd015_receipt_present !== true) fail("AUTHORITATIVE_RECEIPT_REQUIRED", "PASS requires an actual RFD-TUW-015 authoritative receipt");
  assertSha(receipt.authoritative.rfd015_receipt_sha256, SHA256, "INVALID_RECEIPT_SHA", "rfd015_receipt_sha256");
  if (!/^law-firm-os\.formal-deployed-api-package-qa\./u.test(receipt.authoritative.rfd015_receipt_schema_version ?? "")) fail("AUTHORITATIVE_RECEIPT_SCHEMA_INVALID", "PASS requires an RFD-TUW-015 package-QA receipt");
  if (receipt.authoritative.rfd015_capability_schema_version !== FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA) fail("AUTHORITATIVE_CAPABILITY_SCHEMA_INVALID", "PASS requires the v3 RFD-TUW-015 capability");
  for (const field of AUTHORITATIVE_KEYS.slice(4)) assertSha(receipt.authoritative[field], SHA256, "INVALID_AUTHORITY_BINDING", `authoritative.${field}`);
  if (!authoritativeReceipt) fail("AUTHORITATIVE_RECEIPT_REQUIRED", "PASS validation requires the RFD-TUW-015 receipt input");
  const binding = validateRfd015Receipt(authoritativeReceipt, { sourceSha: expectedSourceSha, sourceTree: expectedSourceTree, artifactSha256: expectedArtifactSha256, apiEndpoint: expectedApiEndpoint, apiEndpointSha256: expectedApiEndpointSha256 }, { requireTrusted: true, capability: authoritativeCapability });
  if (receipt.authoritative.rfd015_receipt_sha256 !== binding.receipt_sha256) fail("AUTHORITATIVE_RECEIPT_MISMATCH", "restart receipt is bound to a different RFD-TUW-015 receipt");
  for (const [receiptField, bindingField] of [
    ["rfd015_capability_schema_version", "capability_schema_version"],
    ["rfd015_authority_sha256", "authority_sha256"],
    ["rfd015_api_artifact_sha256", "api_artifact_sha256"],
    ["rfd015_manifest_sha256", "manifest_sha256"],
    ["rfd015_executed_package_sha256", "executed_package_sha256"],
    ["rfd015_transcript_sha256", "transcript_sha256"],
    ["rfd015_package_qa_receipt_sha256", "package_qa_receipt_sha256"],
    ["rfd015_package_qa_transcript_sha256", "package_qa_transcript_sha256"],
    ["rfd015_package_qa_privacy_corpus_sha256", "package_qa_privacy_corpus_sha256"],
  ]) {
    if (receipt.authoritative[receiptField] !== binding[bindingField]) fail("AUTHORITATIVE_CAPABILITY_MISMATCH", `restart receipt ${receiptField} differs from RFD-TUW-015 capability`);
  }
  if (!restartCapability) fail("RESTART_CAPABILITY_REQUIRED", "PASS validation requires the opaque same-process RFD-TUW-016 restart capability");
  assertFormalDeployedApiRestartCapability(restartCapability, {
    sourceSha: binding.source_sha,
    sourceTree: binding.source_tree,
    apiEndpointSha256: binding.api_endpoint_sha256,
    artifactSha256: binding.artifact_sha256,
    restartReceiptSha256: sha256Bytes(canonicalReceiptBytes(receipt)),
    rfd015ReceiptSha256: binding.receipt_sha256,
    rfd015AuthoritySha256: binding.authority_sha256,
    rfd015ApiArtifactSha256: binding.api_artifact_sha256,
    rfd015ManifestSha256: binding.manifest_sha256,
    rfd015ExecutedPackageSha256: binding.executed_package_sha256,
    rfd015TranscriptSha256: binding.transcript_sha256,
    rfd015PackageQaReceiptSha256: binding.package_qa_receipt_sha256,
    rfd015PackageQaTranscriptSha256: binding.package_qa_transcript_sha256,
    rfd015PackageQaPrivacyCorpusSha256: binding.package_qa_privacy_corpus_sha256,
  });
  assertExactKeys(receipt.source, ["revision", "source_tree"], "source");
  assertExactKeys(receipt.deployed_api, ["endpoint_sha256", "endpoint_kind"], "deployed_api");
  assertExactKeys(receipt.artifact, ["sha256"], "artifact");
  assertExactKeys(receipt.identity, ["user_id", "tenant_id", "user_data_hash", "user_data_fresh"], "identity");
  assertExactKeys(receipt.durable_state, [
    "before_restart", "after_restart", "state_sha256_before_restart", "state_sha256_after_restart",
    "before_restart_evidence", "after_restart_evidence",
  ], "durable_state");
  assertExactKeys(receipt.diagnostics, ["console_error_count", "first_launch_console_error_count", "second_launch_console_error_count", "login_call_count", "second_launch_login_call_count", "adapter_error"], "diagnostics");
  assertExactKeys(receipt.boundaries, ["production_runtime_used", "operator_token_used", "api_write_scope"], "boundaries");
  if (receipt.source.revision !== binding.source_sha || receipt.source.source_tree !== binding.source_tree) fail("SOURCE_BINDING_MISMATCH", "restart source binding differs from RFD-TUW-015");
  if (receipt.deployed_api.endpoint_sha256 !== binding.api_endpoint_sha256 || receipt.deployed_api.endpoint_kind !== "private-staging-deployed-api") fail("API_BINDING_MISMATCH", "restart API binding differs from RFD-TUW-015");
  if (receipt.artifact.sha256 !== binding.artifact_sha256) fail("ARTIFACT_BINDING_MISMATCH", "restart artifact binding differs from RFD-TUW-015");
  for (const key of REQUIRED_SCENARIOS) {
    if (receipt.scenarios?.[key] !== true) fail("SCENARIO_NOT_PROVEN", `restart scenario ${key} is not proven`, { field: key });
  }
  const before = validateStateSnapshot(receipt.durable_state.before_restart, "before_restart");
  const after = validateStateSnapshot(receipt.durable_state.after_restart, "after_restart");
  assertSha(receipt.identity.user_data_hash, SHA256, "INVALID_USER_DATA_HASH", "identity.user_data_hash");
  if (receipt.identity.user_data_fresh !== true) fail("USER_DATA_FRESHNESS_UNPROVEN", "PASS requires a fresh isolated userData proof");
  if (typeof receipt.identity.user_id !== "string" || !receipt.identity.user_id) fail("IDENTITY_USER_MISSING", "PASS requires a safe restored user id");
  if (typeof receipt.identity.tenant_id !== "string" || !receipt.identity.tenant_id) fail("IDENTITY_TENANT_MISSING", "PASS requires a safe restored tenant id");
  if (before.matter.tenant_id !== receipt.identity.tenant_id || after.matter.tenant_id !== receipt.identity.tenant_id) fail("DURABLE_STATE_TENANT_MISMATCH", "durable state tenant differs from restored session tenant");
  if (before.task.matter_id !== before.matter.id || before.time.matter_id !== before.matter.id || after.task.matter_id !== after.matter.id || after.time.matter_id !== after.matter.id) fail("DURABLE_STATE_RELATIONSHIP_MISMATCH", "durable task/time state is not linked to the Matter");
  if (canonical(before) !== canonical(after)) fail("DURABLE_STATE_MISMATCH", "Matter/task/time state differs across restart");
  if (receipt.durable_state.state_sha256_before_restart !== sha256(before) || receipt.durable_state.state_sha256_after_restart !== sha256(after)) fail("DURABLE_STATE_DIGEST_MISMATCH", "durable state digest is invalid");
  validateDurableStateEvidence(receipt.durable_state.before_restart_evidence, "durable_state.before_restart_evidence");
  validateDurableStateEvidence(receipt.durable_state.after_restart_evidence, "durable_state.after_restart_evidence");
  if (receipt.diagnostics.console_error_count !== 0 || receipt.diagnostics.first_launch_console_error_count !== 0 || receipt.diagnostics.second_launch_console_error_count !== 0) fail("CONSOLE_ERRORS_PRESENT", "PASS requires zero console errors");
  if (receipt.diagnostics.login_call_count !== 1 || receipt.diagnostics.second_launch_login_call_count !== 0) fail("LOGIN_COUNT_MISMATCH", "PASS requires one initial login and no restart login");
  if (receipt.diagnostics.adapter_error !== null) fail("ADAPTER_ERROR_PRESENT", "PASS cannot contain an adapter error");
  if (receipt.boundaries.production_runtime_used !== false || receipt.boundaries.operator_token_used !== false || receipt.boundaries.api_write_scope !== "synthetic-staging-only") fail("BOUNDARY_VIOLATION", "PASS exceeds the synthetic staging boundary");
  return Object.freeze({ verdict: PASS_VERDICT, status: PASS_VERDICT, source_sha: binding.source_sha, artifact_sha256: binding.artifact_sha256, rfd015_receipt_sha256: binding.receipt_sha256 });
}

/** A deterministic local adapter used only for negative/test-only probes. */
export function createSyntheticRestartAdapter({
  binding,
  userDataId = "rfd016-synthetic-user-data",
  tenantId = "tenant_lawos_staging_cut007_a",
  userId = "synthetic-lawos-staging-desktop-qa-01",
  staleSession = false,
  changedUserData = false,
  changedTenant = false,
  missingDurableState = false,
  duplicateState = false,
  consoleErrors = [],
  sourceMismatch = false,
  noOpExit = false,
  nonZeroExit = false,
  rejectExit = false,
  changedActualUserData = false,
  foreignRows = false,
} = {}) {
  const expectedBinding = normalizeBinding(binding);
  const state = {
    matter: { id: "matter-rfd016-synthetic-001", tenant_id: tenantId, title: "RFD016 restart matter", status: "open" },
    task: { id: "task-rfd016-synthetic-001", matter_id: "matter-rfd016-synthetic-001", status: "open", title: "RFD016 restart task" },
    time: { id: "time-rfd016-synthetic-001", matter_id: "matter-rfd016-synthetic-001", minutes: 60, status: "posted" },
  };
  if (duplicateState) state.task.id = state.matter.id;
  let loginCalls = 0;
  let secondLaunchLoginCalls = 0;
  let launchCount = 0;
  const handles = [];
  const runtimeBinding = () => ({ ...expectedBinding, ...(sourceMismatch ? { source_sha: "f".repeat(40) } : {}) });
  return {
    actual_execution: false,
    test_adapter_used: true,
    async launch({ phase, userDataId: requestedUserDataId, tenantId: requestedTenantId }) {
      launchCount += 1;
      const second = phase === "second";
      const handleUserDataId = second && changedUserData ? `${requestedUserDataId}-changed` : requestedUserDataId;
      const handleTenantId = second && changedTenant ? `${requestedTenantId}-changed` : requestedTenantId;
      const actualUserDataPath = second && changedActualUserData
        ? `/tmp/rfd016-test-only-profile-changed`
        : `/tmp/rfd016-test-only-profile-canonical`;
      const handle = {
        userDataId: handleUserDataId,
        tenantId: handleTenantId,
        userDataPath: actualUserDataPath,
        userDataPathHash: safeHashIdentifier(actualUserDataPath),
        runtimeBinding,
        async login() {
          if (second) secondLaunchLoginCalls += 1;
          loginCalls += 1;
          return {
            state: "signed_in",
            user_id: userId,
            tenant_id: tenantId,
            session_fingerprint: sha256(`${userId}:${tenantId}:rfd016-session`),
          };
        },
        async createMatterState() {
          return clone(state);
        },
        async restoreSession() {
          if (staleSession) return { state: "signed_out", reason: "auth_session_invalid" };
          return {
            state: "signed_in",
            user_id: userId,
            tenant_id: handleTenantId,
            session_restored: true,
            session_fingerprint: staleSession
              ? sha256(`${userId}:${tenantId}:stale-session`)
              : sha256(`${userId}:${tenantId}:rfd016-session`),
          };
        },
        async readMatterState() {
          return missingDurableState ? null : clone(state);
        },
        async durableStateEvidence() {
          if (missingDurableState) return { before_restart: null, after_restart: null };
          const evidence = {
            matter_count: duplicateState ? 1 : 1,
            task_count: 1,
            time_count: 1,
            duplicate_state_count: duplicateState ? 1 : 0,
          };
          return { before_restart: clone(evidence), after_restart: clone(evidence) };
        },
        async consoleErrors() {
          return clone(consoleErrors);
        },
        async isolationProbe() {
          return {
            cross_mix: changedUserData || changedTenant || changedActualUserData || foreignRows,
            user_data_match: !changedUserData && !changedActualUserData,
            fresh_user_data: !changedUserData && !changedActualUserData,
            tenant_match: !changedTenant,
            foreign_state_ids: foreignRows || changedUserData || changedTenant ? ["foreign-rfd016-state"] : [],
            user_data_hash: safeHashIdentifier(actualUserDataPath),
          };
        },
        async exit() {
          if (!noOpExit) handle.closed = true;
          return noOpExit ? undefined : { closed: true };
        },
        waitForProcessExit() {
          if (rejectExit) return Promise.reject(Object.assign(new Error("test-only exit observer rejected"), { code: "FULL_EXIT_UNPROVEN" }));
          return Promise.resolve({ exited: true, exit_code: nonZeroExit ? 17 : 0 });
        },
        closed: false,
      };
      handles.push(handle);
      return handle;
    },
    async metrics() {
      return { login_calls: loginCalls, second_launch_login_calls: secondLaunchLoginCalls, launch_count: launchCount };
    },
    processExitTimeoutMs: 100,
    async cleanup() {},
    handles,
  };
}

export function buildSyntheticRfd015Receipt({ sourceSha = "a".repeat(40), sourceTree = "b".repeat(40), artifactSha256 = "c".repeat(64), apiEndpoint = "https://lawos-staging.example.invalid/api" } = {}) {
  return {
    _test_only: true,
    synthetic_only: true,
    schema_version: FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA,
    verdict: "TEST_ONLY",
    source: { expected_revision: sourceSha, source_tree: sourceTree },
    package: { artifact_sha256: artifactSha256 },
    runtime: { base_url: apiEndpoint },
  };
}

/**
 * Non-authoritative state-machine evaluator for local behavioral probes.  It
 * accepts only a marked TEST_ONLY adapter and returns a blocked/failed
 * receipt; this path never registers an operational adapter or mints a
 * restart capability.
 */
export async function runFormalDeployedApiRestartQaTestOnly({
  adapter,
  sourceSha = "a".repeat(40),
  sourceTree = "b".repeat(40),
  artifactSha256 = "c".repeat(64),
  apiEndpointSha256 = "d".repeat(64),
  tenantId = "tenant_lawos_staging_cut007_a",
  otherTenantId = "tenant_lawos_staging_negative_b",
  matterId = "matter-rfd016-test-only-001",
  userId = "synthetic-rfd016-test-only-user",
  userDataId,
  generatedAt = new Date().toISOString(),
} = {}) {
  const rfd015Receipt = {
    ...buildSyntheticRfd015Receipt({ sourceSha, sourceTree, artifactSha256 }),
    package: { artifact_sha256: artifactSha256, executed_package_sha256: "e".repeat(64), manifest_sha256: "f".repeat(64) },
    deployment: { api_endpoint_sha256: apiEndpointSha256 },
  };
  return runFormalDeployedApiRestartQa({
    adapter,
    rfd015Receipt,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    expectedArtifactSha256: artifactSha256,
    expectedApiEndpointSha256: apiEndpointSha256,
    credentialAccount: {
      email: "rfd016-test-only@example.invalid",
      password: "test-only-fixture-password",
      tenant_id: tenantId,
      other_tenant_id: otherTenantId,
      matter_id: matterId,
      user_id: userId,
    },
    tenantId,
    userDataId,
    generatedAt,
    chainToken: CANONICAL_CHAIN_TOKEN,
    testOnlyMode: TEST_ONLY_EVALUATOR_TOKEN,
  });
}
