import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { validateFormalDeployedApiAuthorityBundle } from "./formal-deployed-api-authority.mjs";
import { FORMAL_DEPLOYED_API_QA_CREDENTIAL_SCHEMA, readFormalDeployedApiCredentialFile, validateFormalDeployedApiCredential, validatePrivateStagingEndpointContract } from "./formal-deployed-api-inputs.mjs";
import { FormalDeployedApiQaError, canonicalReceiptBytes, exactKeys, fail, privateRegularFile, privateReceiptTarget, sha256Bytes, writePrivateFile } from "./formal-deployed-api-io.mjs";

export { FormalDeployedApiQaError, FORMAL_DEPLOYED_API_QA_CREDENTIAL_SCHEMA, readFormalDeployedApiCredentialFile, sha256Bytes, validateFormalDeployedApiCredential, validatePrivateStagingEndpointContract };

export const FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA =
  "law-firm-os.formal-deployed-api-package-qa.v3";
export const FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA =
  "law-firm-os.formal-deployed-api-authority-capability.v1";
export const FORMAL_DEPLOYED_API_CHAIN_OUTPUT_SCHEMA =
  "law-firm-os.formal-deployed-api-canonical-chain-output.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_BLOCKER = /^[A-Z0-9_]{3,128}$/u;
const FORBIDDEN_KEY = /(?:^|_)(?:password|passphrase|token|authorization|credential|secret|email|api_key|private_key)(?:_|$)/iu;
const FORBIDDEN_TEXT = /(?:-----BEGIN (?:PRIVATE KEY|OPENSSH PRIVATE KEY)-----|\bBearer\s+[A-Za-z0-9._~+/=-]+|https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/iu;
const FORBIDDEN_OUTPUT_PATH_TEXT = /(?:^|[._/-])(?:password|passphrase|token|authorization|credential|secret|api[_-]?key|private[_-]?key)(?:[._/-]|$)/iu;
const TRUSTED_PASS_RECEIPTS = new WeakMap();
const TRUSTED_CAPABILITIES = new WeakSet();

function timestamp(value, label) {
  if (typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)
    || !Number.isFinite(Date.parse(value))) {
    fail("FORMAL_DEPLOYED_API_QA_TIMESTAMP", `${label} is invalid`);
  }
}

function digest(value, label, pattern = SHA256) {
  if (typeof value !== "string" || !pattern.test(value)) {
    fail("FORMAL_DEPLOYED_API_QA_DIGEST", `${label} is invalid`);
  }
}

function count(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    fail("FORMAL_DEPLOYED_API_QA_COUNT", `${label} must be a non-negative safe integer`);
  }
}

function scanSafe(value) {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) fail("FORMAL_DEPLOYED_API_QA_SECRET", "receipt contains an unsafe number");
    return;
  }
  if (typeof value === "string") {
    if (FORBIDDEN_TEXT.test(value)) fail("FORMAL_DEPLOYED_API_QA_SECRET", "receipt contains forbidden raw material");
    return;
  }
  if (Array.isArray(value)) return value.forEach(scanSafe);
  if (!value || typeof value !== "object") fail("FORMAL_DEPLOYED_API_QA_SECRET", "receipt contains an unsafe value");
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key) && child !== 0 && child !== false && child !== null) {
      fail("FORMAL_DEPLOYED_API_QA_SECRET", "receipt contains sensitive material");
    }
    scanSafe(child);
  }
}

function validateBoundaries(value, pass) {
  exactKeys(value, [
    "actual_deployment_pass", "credential_material_returned", "password_confirm_count",
    "password_reset_count", "production_contact_count", "production_write_count",
    "real_data_contact_count", "release_executed", "staging_synthetic_mutation_count",
  ], "receipt boundaries");
  for (const field of [
    "password_confirm_count", "password_reset_count", "production_contact_count",
    "production_write_count", "real_data_contact_count", "staging_synthetic_mutation_count",
  ]) count(value[field], `boundaries.${field}`);
  if (value.actual_deployment_pass !== pass
    || value.credential_material_returned !== false
    || value.password_confirm_count !== 0
    || value.password_reset_count !== 0
    || value.production_contact_count !== 0
    || value.production_write_count !== 0
    || value.real_data_contact_count !== 0
    || value.release_executed !== false
    || value.staging_synthetic_mutation_count !== (pass ? 4 : 0)) {
    fail("FORMAL_DEPLOYED_API_QA_BOUNDARY", "receipt boundary drifted");
  }
}

function validateCommon(receipt) {
  scanSafe(receipt);
  exactKeys(receipt, [
    "authority", "blockers", "boundaries", "code_readiness", "deployment", "execution",
    "generated_at", "observations", "package", "schema_version", "source", "verdict",
  ], "receipt");
  if (receipt.schema_version !== FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA) fail("FORMAL_DEPLOYED_API_QA_RECEIPT", "receipt schema is invalid");
  timestamp(receipt.generated_at, "generated_at");
  exactKeys(receipt.code_readiness, ["status"], "code readiness");
  if (receipt.code_readiness.status !== "PASS") fail("FORMAL_DEPLOYED_API_QA_RECEIPT", "code readiness is not PASS");
  exactKeys(receipt.source, ["api_artifact_sha256", "api_source_revision", "expected_revision", "source_tree"], "receipt source");
  digest(receipt.source.expected_revision, "expected source", SHA1);
  digest(receipt.source.source_tree, "source tree", SHA1);
  exactKeys(receipt.package, [
    "artifact_bytes", "artifact_sha256", "executable_path_sha256", "executed_package_bytes",
    "executed_package_sha256", "manifest_bytes", "manifest_sha256", "package_qa_receipt_bytes",
    "package_qa_receipt_sha256", "package_qa_transcript_bytes", "package_qa_transcript_sha256", "platform",
  ], "receipt package");
  if (!["macos", "windows"].includes(receipt.package.platform)) fail("FORMAL_DEPLOYED_API_QA_PACKAGE", "package platform is invalid");
  for (const field of ["artifact_bytes", "manifest_bytes", "executed_package_bytes", "package_qa_receipt_bytes", "package_qa_transcript_bytes"]) count(receipt.package[field], `package.${field}`);
  exactKeys(receipt.deployment, [
    "account_id", "api_endpoint_sha256", "api_id", "environment", "exact_head_receipt_set_sha256",
    "executed", "production_contact_count", "region", "status",
  ], "receipt deployment");
  if (receipt.deployment.environment !== "lawos-staging" || receipt.deployment.production_contact_count !== 0) {
    fail("FORMAL_DEPLOYED_API_QA_ENDPOINT", "receipt deployment boundary is invalid");
  }
  exactKeys(receipt.execution, ["classification", "transcript_bytes", "transcript_sha256"], "receipt execution");
  if (!Array.isArray(receipt.blockers) || receipt.blockers.some((item) => typeof item !== "string" || !SAFE_BLOCKER.test(item))) {
    fail("FORMAL_DEPLOYED_API_QA_RECEIPT", "receipt blockers are invalid");
  }
}

function validatePass(receipt, allowUntrustedPass) {
  if (!allowUntrustedPass && TRUSTED_PASS_RECEIPTS.get(receipt) !== sha256Bytes(canonicalReceiptBytes(receipt))) {
    fail("FORMAL_DEPLOYED_API_QA_AUTHORITY_REQUIRED", "PASS requires the canonical raw-authority reader");
  }
  digest(receipt.source.api_source_revision, "API source", SHA1);
  digest(receipt.source.api_artifact_sha256, "API artifact");
  if (receipt.source.api_source_revision !== receipt.source.expected_revision) fail("FORMAL_DEPLOYED_API_QA_SOURCE_MISMATCH", "API source does not match expected source");
  for (const field of ["artifact_sha256", "manifest_sha256", "executed_package_sha256", "package_qa_receipt_sha256", "package_qa_transcript_sha256", "executable_path_sha256"]) digest(receipt.package[field], `package.${field}`);
  for (const field of ["artifact_bytes", "manifest_bytes", "executed_package_bytes", "package_qa_receipt_bytes", "package_qa_transcript_bytes"]) {
    if (receipt.package[field] < 1) fail("FORMAL_DEPLOYED_API_QA_PACKAGE", `${field} must bind non-empty raw bytes`);
  }
  for (const field of ["api_endpoint_sha256", "exact_head_receipt_set_sha256"]) digest(receipt.deployment[field], `deployment.${field}`);
  if (receipt.deployment.account_id !== "770880870480"
    || receipt.deployment.region !== "ap-northeast-2"
    || receipt.deployment.status !== "PASS"
    || receipt.deployment.executed !== true
    || receipt.execution.classification !== "ACTUAL_PRIVATE_STAGING"
    || receipt.blockers.length !== 0
    || receipt.authority === null
    || receipt.observations === null) {
    fail("FORMAL_DEPLOYED_API_QA_DEPLOYMENT", "PASS receipt lacks deployed authority");
  }
  digest(receipt.execution.transcript_sha256, "execution transcript");
  if (receipt.execution.transcript_bytes < 1) fail("FORMAL_DEPLOYED_API_QA_DEPLOYMENT", "execution transcript is empty");
  validateBoundaries(receipt.boundaries, true);
}

function validateNonPass(receipt) {
  const testOnly = receipt.verdict === "TEST_ONLY";
  if (!testOnly && receipt.verdict !== "BLOCKED_BY_AUTHORITY") fail("FORMAL_DEPLOYED_API_QA_RECEIPT", "receipt verdict is invalid");
  if (receipt.source.api_source_revision !== null
    || receipt.source.api_artifact_sha256 !== null
    || receipt.deployment.api_endpoint_sha256 !== null
    || receipt.deployment.exact_head_receipt_set_sha256 !== null
    || receipt.deployment.executed !== false
    || receipt.deployment.status !== receipt.verdict
    || receipt.execution.classification !== (testOnly ? "TEST_ONLY" : "AUTHORITY_BLOCKED")
    || receipt.execution.transcript_sha256 !== null
    || receipt.execution.transcript_bytes !== 0
    || receipt.authority !== null
    || receipt.observations !== null
    || receipt.blockers.length < 1) {
    fail("FORMAL_DEPLOYED_API_QA_AUTHORITY", "non-PASS receipt overstates deployed evidence");
  }
  validateBoundaries(receipt.boundaries, false);
}

function validateReceipt(receipt, allowUntrustedPass = false) {
  validateCommon(receipt);
  if (receipt.verdict === "PASS") validatePass(receipt, allowUntrustedPass);
  else validateNonPass(receipt);
  return Object.freeze({
    valid: true,
    verdict: receipt.verdict,
    code_readiness: "PASS",
    actual_deployment_pass: receipt.verdict === "PASS",
    source_revision: receipt.source.expected_revision,
    source_tree: receipt.source.source_tree,
    artifact_sha256: receipt.package.artifact_sha256,
    manifest_sha256: receipt.package.manifest_sha256,
    api_endpoint_sha256: receipt.deployment.api_endpoint_sha256,
    execution_classification: receipt.execution.classification,
    receipt_sha256: sha256Bytes(canonicalReceiptBytes(receipt)),
  });
}

export function validateFormalDeployedApiPackageQaReceipt(receipt) {
  return validateReceipt(receipt, false);
}

export function buildFormalDeployedApiChainSuccessOutput({
  rfd015ReceiptPath,
  rfd015Receipt,
  rfd015Validation,
  rfd016ReceiptPath,
  rfd016Receipt,
  rootDir = process.cwd(),
} = {}) {
  const rfd015Path = privateRegularFile(rfd015ReceiptPath, rootDir, "RFD-TUW-015 receipt");
  const rfd016Path = privateRegularFile(rfd016ReceiptPath, rootDir, "RFD-TUW-016 receipt");
  if (rfd016Path !== resolve(dirname(rfd015Path), "rfd016-restart-receipt.json")) {
    fail("FORMAL_DEPLOYED_API_QA_CHAIN_OUTPUT_PATH", "RFD-TUW-016 receipt must be the canonical sibling of RFD-TUW-015");
  }
  if (FORBIDDEN_TEXT.test(rfd015Path)
    || FORBIDDEN_TEXT.test(rfd016Path)
    || FORBIDDEN_OUTPUT_PATH_TEXT.test(rfd015Path)
    || FORBIDDEN_OUTPUT_PATH_TEXT.test(rfd016Path)) {
    fail("FORMAL_DEPLOYED_API_QA_CHAIN_OUTPUT_SECRET", "receipt paths are not safe to emit");
  }
  if (rfd015Receipt?.verdict !== "PASS"
    || rfd015Validation?.valid !== true
    || rfd015Validation.verdict !== "PASS"
    || rfd015Validation.actual_deployment_pass !== true
    || !SHA256.test(rfd015Validation.receipt_sha256 ?? "")
    || sha256Bytes(readFileSync(rfd015Path)) !== rfd015Validation.receipt_sha256) {
    fail("FORMAL_DEPLOYED_API_QA_CHAIN_OUTPUT", "RFD-TUW-015 output authority is invalid");
  }
  const rfd015Boundaries = rfd015Receipt.boundaries;
  if (rfd015Boundaries?.production_contact_count !== 0
    || rfd015Boundaries?.production_write_count !== 0
    || rfd015Boundaries?.real_data_contact_count !== 0
    || rfd015Boundaries?.release_executed !== false) {
    fail("FORMAL_DEPLOYED_API_QA_CHAIN_OUTPUT", "RFD-TUW-015 external boundaries are invalid");
  }
  const rfd016ReceiptSha256 = sha256Bytes(canonicalReceiptBytes(rfd016Receipt));
  if (rfd016Receipt?.checkpoint_id !== "RFD-TUW-016"
    || rfd016Receipt.verdict !== "PASS"
    || rfd016Receipt.status !== "PASS"
    || sha256Bytes(readFileSync(rfd016Path)) !== rfd016ReceiptSha256
    || rfd016Receipt.boundaries?.production_runtime_used !== false
    || rfd016Receipt.boundaries?.operator_token_used !== false
    || rfd016Receipt.boundaries?.api_write_scope !== "synthetic-staging-only") {
    fail("FORMAL_DEPLOYED_API_QA_CHAIN_OUTPUT", "RFD-TUW-016 output authority is invalid");
  }
  const output = {
    schema_version: FORMAL_DEPLOYED_API_CHAIN_OUTPUT_SCHEMA,
    verdict: "PASS",
    status: "PASS",
    rfd015: {
      checkpoint_id: "RFD-TUW-015",
      status: "PASS",
      receipt_path: rfd015Path,
      receipt_sha256: rfd015Validation.receipt_sha256,
      actual_deployment_pass: true,
      production_contact_count: 0,
      production_write_count: 0,
      real_data_contact_count: 0,
      release_executed: false,
    },
    rfd016: {
      checkpoint_id: "RFD-TUW-016",
      status: "PASS",
      receipt_path: rfd016Path,
      receipt_sha256: rfd016ReceiptSha256,
      production_runtime_used: false,
      operator_token_used: false,
      api_write_scope: "synthetic-staging-only",
    },
  };
  scanSafe(output);
  return deepFreeze(output);
}

function noDeploymentBoundaries() {
  return { actual_deployment_pass: false, credential_material_returned: false, password_confirm_count: 0, password_reset_count: 0, production_contact_count: 0, production_write_count: 0, real_data_contact_count: 0, release_executed: false, staging_synthetic_mutation_count: 0 };
}

function buildNonPass(verdict, { generatedAt = new Date().toISOString(), expectedSourceSha, sourceTree, platform = "macos", artifactSha256 = "0".repeat(64), manifestSha256 = "0".repeat(64), blocker } = {}) {
  const receipt = {
    schema_version: FORMAL_DEPLOYED_API_QA_RECEIPT_SCHEMA,
    generated_at: generatedAt,
    verdict,
    code_readiness: { status: "PASS" },
    source: { expected_revision: expectedSourceSha, source_tree: sourceTree, api_source_revision: null, api_artifact_sha256: null },
    package: { platform, artifact_sha256: artifactSha256, artifact_bytes: 0, manifest_sha256: manifestSha256, manifest_bytes: 0, executed_package_sha256: null, executed_package_bytes: 0, executable_path_sha256: null, package_qa_receipt_sha256: null, package_qa_receipt_bytes: 0, package_qa_transcript_sha256: null, package_qa_transcript_bytes: 0 },
    deployment: { status: verdict, executed: false, environment: "lawos-staging", account_id: "770880870480", region: "ap-northeast-2", api_id: null, api_endpoint_sha256: null, exact_head_receipt_set_sha256: null, production_contact_count: 0 },
    execution: { classification: verdict === "TEST_ONLY" ? "TEST_ONLY" : "AUTHORITY_BLOCKED", transcript_sha256: null, transcript_bytes: 0 },
    observations: null,
    authority: null,
    boundaries: noDeploymentBoundaries(),
    blockers: [blocker],
  };
  validateFormalDeployedApiPackageQaReceipt(receipt);
  return Object.freeze(receipt);
}

export function buildFormalDeployedApiTestOnlyReceipt(options = {}) {
  return buildNonPass("TEST_ONLY", { ...options, blocker: "TEST_ADAPTER_NOT_DEPLOYMENT_EVIDENCE" });
}

export function buildFormalDeployedApiAuthorityBlockedReceipt(options = {}) {
  return buildNonPass("BLOCKED_BY_AUTHORITY", { ...options, blocker: options.blocker ?? "PRIVATE_STAGING_DEPLOYMENT_AUTHORITY_REQUIRED" });
}

export function writeFormalDeployedApiPackageQaReceipt(path, receipt, { rootDir = process.cwd() } = {}) {
  validateFormalDeployedApiPackageQaReceipt(receipt);
  return writePrivateFile(path, canonicalReceiptBytes(receipt), rootDir);
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export function readFormalDeployedApiPackageQaReceipt(path, { rootDir = process.cwd(), packageQaCapability } = {}) {
  const receiptPath = privateRegularFile(path, rootDir, "receipt file");
  const bytes = readFileSync(receiptPath);
  let receipt;
  try {
    receipt = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail("FORMAL_DEPLOYED_API_QA_RECEIPT", "receipt file is not valid JSON");
  }
  if (!bytes.equals(canonicalReceiptBytes(receipt))) fail("FORMAL_DEPLOYED_API_QA_RECEIPT_ENCODING", "receipt file is not canonical JSON");
  validateReceipt(receipt, true);
  let capability = null;
  if (receipt.verdict === "PASS") {
    const binding = validateFormalDeployedApiAuthorityBundle(receipt, dirname(receiptPath), { rootDir, packageQaCapability });
    deepFreeze(receipt);
    TRUSTED_PASS_RECEIPTS.set(receipt, sha256Bytes(bytes));
    capability = Object.freeze({ schema_version: FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA, receipt_sha256: sha256Bytes(bytes), ...binding });
    TRUSTED_CAPABILITIES.add(capability);
  } else {
    deepFreeze(receipt);
  }
  return Object.freeze({ receipt, validation: validateFormalDeployedApiPackageQaReceipt(receipt), capability });
}

export function validateFormalDeployedApiAuthorityCapability(capability, expected = {}) {
  if (!TRUSTED_CAPABILITIES.has(capability) || capability.schema_version !== FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA) {
    fail("FORMAL_DEPLOYED_API_QA_CAPABILITY", "authority capability was not issued by the canonical reader");
  }
  for (const [option, field] of Object.entries({ sourceSha: "source_sha", sourceTree: "source_tree", apiEndpointSha256: "api_endpoint_sha256", artifactSha256: "artifact_sha256", manifestSha256: "manifest_sha256", executedPackageSha256: "executed_package_sha256", packageQaTranscriptSha256: "package_qa_transcript_sha256", packageQaPrivacyCorpusSha256: "package_qa_privacy_corpus_sha256" })) {
    if (expected[option] !== undefined && capability[field] !== expected[option]) fail("FORMAL_DEPLOYED_API_QA_CAPABILITY", `${option} capability binding does not match`);
  }
  return capability;
}

export { canonicalReceiptBytes, privateReceiptTarget };
