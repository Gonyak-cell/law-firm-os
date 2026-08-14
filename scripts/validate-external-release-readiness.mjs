#!/usr/bin/env node

import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { createPublicKey, verify as verifySignature } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  PRODUCTION_TRUST_ROOT_POLICY,
  TRUST_REGISTRY_SCHEMA_VERSION,
  assertStrictUtcTimestamp,
  readTrustedFileSnapshot,
  resolveTrustedRoot,
  sha256Hex,
  verifyProductionTrustedRegistry,
  verifyDetachedReceipt,
} from "./lib/external-release-trust.mjs";
import { validateWindowsFormalUpdateRunnerPassReceipt } from "./lib/windows-formal-update-runner.mjs";

const DEFAULT_CONTRACT_PATH = "contracts/external-release-readiness-contract.json";
const DEFAULT_INPUT_PATH = "docs/launch/external-release/external-release-readiness-input.template.json";
const DEFAULT_REPORT_PATH = ".omo/evidence/external-release-readiness-validation.json";
const CONTRACT_SCHEMA_VERSION = "law-firm-os.external-release-readiness-contract.v0.3";
const INPUT_SCHEMA_VERSION = "law-firm-os.external-release-readiness-input.v0.3";
const RECEIPT_SCHEMA_VERSION = "law-firm-os.external-release-receipt.v0.2";
const REPORT_SCHEMA_VERSION = "law-firm-os.external-release-readiness-report.v0.3";
const TENANT_IDENTITY_SCHEMA_VERSION = "law-firm-os.external-tenant-identity.v1";
const INTERNAL_PROVISIONING_RECEIPT_SCHEMA_VERSION = "law-firm-os.external-tenant-provisioning-receipt.v1";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SOURCE_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LAWOS_TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const CERTIFICATE_SHA1_PATTERN = /^[0-9A-F]{40}$/u;
const CERTIFICATE_SHA256_PATTERN = /^[0-9A-F]{64}$/u;
const KMS_KEY_ARN_PATTERN = /^arn:aws(?:-[a-z]+)?:kms:[a-z0-9-]+:\d{12}:key\/[0-9a-f-]+$/iu;
const PLACEHOLDER_PATTERN = /^(?:<[^>]+>|(?:REQUIRED|TBD|TODO|PLACEHOLDER|PENDING|UNKNOWN|N\/A|null|none)(?:[_ -].*)?)$/iu;
const INFERENCE_PATTERN = /(?:agent[-_ ]?inferred|codex[-_ ]?(?:approved|approval)|synthetic approval|simulated owner|inferred approval)/iu;
const WINDOWS_UPDATE_METADATA_FIELDS = Object.freeze([
  "appId", "approvalExpiresAt", "approvalId", "artifactBytes", "artifactFilename",
  "artifactSha256", "channel", "entraTenantId", "expiresAt", "generatedAt", "keyId",
  "lawosTenantId", "pilotId", "releaseManifestSha256", "schemaVersion", "sourceSha",
  "sourceTree", "tenantConfigSha256", "version",
]);
const CANONICAL_GATE_ORDER = Object.freeze([
  "api_artifact_deployment",
  "tenant_provisioning",
  "m365_consent_deployment_visibility",
  "macos_distribution",
  "windows_distribution_update_rollback",
  "operations_support_rollback",
  "backup_restore_rehearsal",
  "legal_owner_approval",
]);
const CANONICAL_EXECUTION_ORDER = Object.freeze([
  "api_artifact_deployment",
  "internal_provisioning_adapter",
  "tenant_pinned_runtime_binding_or_multi_tenant_review",
  "m365_consent_deployment_visibility",
  "macos_distribution",
  "windows_distribution_update_rollback",
  "operations_support_rollback",
  "backup_restore_rehearsal",
  "legal_owner_approval",
]);
export const CANONICAL_CONTRACT_SHA256 = "cf2bba0162fa48f978d40007abd9acf9fa56ccec309ce97166c02453c9a0c646";

function asText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function nonPlaceholder(value) {
  const text = asText(value);
  return Boolean(text) && !PLACEHOLDER_PATTERN.test(text) && !INFERENCE_PATTERN.test(text);
}

function validUtc(value) {
  try {
    assertStrictUtcTimestamp(value);
    return true;
  } catch {
    return false;
  }
}

function validSha256(value) {
  return SHA256_PATTERN.test(asText(value));
}

function validProviderSha256(value) {
  const text = asText(value);
  if (!/^[A-Za-z0-9+/]{43}=$/u.test(text)) return false;
  const decoded = Buffer.from(text, "base64");
  return decoded.length === 32 && decoded.toString("base64") === text;
}

function validSourceSha(value) {
  return SOURCE_SHA_PATTERN.test(asText(value));
}

function validVersion(value) {
  return VERSION_PATTERN.test(asText(value));
}

function validSafeRelativePath(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 512 || value.includes("\\") || value !== value.normalize("NFC") || path.posix.isAbsolute(value)) return false;
  const segments = value.split("/");
  return !/[\0\r\n]/u.test(value)
    && segments.every((segment) => segment && segment !== "." && segment !== "..")
    && path.posix.normalize(value) === value;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function newerVersion(target, baseline) {
  if (!validVersion(target) || !validVersion(baseline)) return false;
  const targetParts = target.split(".").map(Number);
  const baselineParts = baseline.split(".").map(Number);
  return targetParts.some((value, index) => (
    value > baselineParts[index]
    && targetParts.slice(0, index).every((part, prior) => part === baselineParts[prior])
  ));
}

function validLawosTenantId(value) {
  return LAWOS_TENANT_ID_PATTERN.test(asText(value));
}

function validEntraTenantId(value) {
  return UUID_PATTERN.test(asText(value));
}

function sha256(bytes) {
  return sha256Hex(bytes);
}

function expectedBindingSha256(expected) {
  return sha256(Buffer.from(JSON.stringify({
    pilot_id: expected.pilotId,
    lawos_tenant_id: expected.lawosTenantId,
    entra_tenant_id: expected.entraTenantId,
    source_sha: expected.sourceSha,
    source_tree: expected.sourceTree,
    version: expected.version,
  }), "utf8"));
}

function relativeRef(rootDir, target) {
  const relative = path.relative(rootDir, target);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? relative : target;
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function getPathValue(value, dotPath) {
  return String(dotPath ?? "").split(".").filter(Boolean).reduce((current, key) => current == null ? undefined : current[key], value);
}

function readRegularFileSnapshot(rootDir, candidate, label, findings, details = {}) {
  if (typeof candidate !== "string" || candidate.trim() === "") {
    addFinding(findings, "P1", "FILE_REFERENCE_MISSING", `${label} must provide a relative file path.`, details);
    return null;
  }
  try {
    return readTrustedFileSnapshot(rootDir, candidate);
  } catch (error) {
    const codeMap = {
      TRUST_PATH_ESCAPE: "FILE_REFERENCE_ESCAPES_ROOT",
      TRUST_SYMLINK_FORBIDDEN: "FILE_REFERENCE_SYMLINK",
      TRUST_FILE_INVALID: "FILE_REFERENCE_NOT_FILE",
      TRUST_PATH_INVALID: "FILE_REFERENCE_INVALID",
    };
    const code = codeMap[error.code] ?? error.code ?? "FILE_REFERENCE_INVALID";
    const severity = code === "FILE_REFERENCE_MISSING" ? "P1" : "P0";
    addFinding(findings, severity, code, `${label} cannot resolve to a protected regular file.`, { ...details, path: candidate, cause: error.message });
    return null;
  }
}

function inspectFileRef({ rootDir, ref, label, findings, details = {} }) {
  if (!ref || typeof ref !== "object") {
    addFinding(findings, "P1", "FILE_REFERENCE_MISSING", `${label} receipt must include a path and SHA-256.`, details);
    return { state: "pending", path: null, expected_sha256: null, sha256: null, bytes: 0 };
  }
  const expected = asText(ref.sha256).toLowerCase();
  if (!validSha256(expected)) {
    addFinding(findings, "P0", "FILE_REFERENCE_SHA256_INVALID", `${label} SHA-256 is missing or malformed.`, { ...details, path: ref.path });
    return { state: "invalid", path: ref.path ?? null, expected_sha256: expected || null, sha256: null, bytes: 0 };
  }
  const snapshot = readRegularFileSnapshot(rootDir, ref.path, label, findings, details);
  if (!snapshot) return { state: "invalid", path: ref.path ?? null, expected_sha256: expected, sha256: null, bytes: 0 };
  const actual = sha256(snapshot.bytes);
  if (actual !== expected) {
    addFinding(findings, "P0", "RECEIPT_SHA256_MISMATCH", `${label} bytes do not match the declared SHA-256.`, {
      ...details,
      path: relativeRef(path.resolve(rootDir), snapshot.target),
      expected_sha256: expected,
      actual_sha256: actual,
    });
    return { state: "invalid", path: relativeRef(path.resolve(rootDir), snapshot.target), expected_sha256: expected, sha256: actual, bytes: snapshot.bytes.length };
  }
  return { state: "verified_bytes", path: relativeRef(path.resolve(rootDir), snapshot.target), expected_sha256: expected, sha256: actual, bytes: snapshot.bytes.length, target: snapshot.target, snapshot: snapshot.bytes };
}

function parseJsonRef({ rootDir, ref, label, findings, details = {} }) {
  const file = inspectFileRef({ rootDir, ref, label, findings, details });
  if (!file.target || file.state !== "verified_bytes") return { ...file, value: null };
  try {
    return { ...file, value: JSON.parse(file.snapshot.toString("utf8")) };
  } catch (error) {
    addFinding(findings, "P0", "RECEIPT_JSON_INVALID", `${label} is not valid JSON.`, { ...details, path: file.path, error: error.message });
    return { ...file, state: "invalid", value: null };
  }
}

function inspectProductionTrustRegistry({ testOnlyPolicy, findings }) {
  try {
    const productionTrust = testOnlyPolicy == null
      ? verifyProductionTrustedRegistry()
      : verifyProductionTrustedRegistry({ testOnlyPolicy });
    return productionTrust.registryTrust;
  } catch (error) {
    addFinding(findings, "P0", error.code ?? "TRUST_ROOT_NOT_CONFIGURED", error.message, {
      policy_schema_version: PRODUCTION_TRUST_ROOT_POLICY.schema_version,
      configured: PRODUCTION_TRUST_ROOT_POLICY.configured,
      registry_installation_path: PRODUCTION_TRUST_ROOT_POLICY.registry_installation_path,
      ...(error.details ?? {}),
    });
    return null;
  }
}

function inspectReceiptTrust({ rootDir, receiptRef, gate, expected, findings, trustRegistry, context }) {
  if (!trustRegistry) return null;
  try {
    return verifyDetachedReceipt({
      rootDir,
      receiptRef,
      registry: trustRegistry,
      expectedReceiptType: gate.receipt_type ?? gate.runtime_receipt_types,
      expectedReceiptSource: gate.required_source ?? gate.runtime_receipt_sources,
      expectedPilotId: expected.pilotId,
      expectedLawosTenantId: expected.lawosTenantId,
      expectedEntraTenantId: expected.entraTenantId,
      expectedSourceSha: expected.sourceSha,
      expectedSourceTree: expected.sourceTree,
      expectedVersion: expected.version,
      expectedRole: gate.required_role,
      expectedOperation: gate.required_operation,
      expectedBindingSha256: expectedBindingSha256(expected),
    });
  } catch (error) {
    addFinding(findings, "P0", error.code ?? "RECEIPT_TRUST_INVALID", error.message, { ...context, ...(error.details ?? {}) });
    return null;
  }
}

function requiredFields(value, fields, findings, context) {
  const missing = [];
  for (const field of fields ?? []) {
    const fieldValue = value?.[field];
    if (fieldValue == null || (typeof fieldValue === "string" && !nonPlaceholder(fieldValue))) {
      missing.push(field);
      continue;
    }
    if (typeof fieldValue === "string" && INFERENCE_PATTERN.test(fieldValue)) {
      addFinding(findings, "P0", "AGENT_INFERRED_RECEIPT_FIELD", `Receipt field ${field} contains inferred approval language.`, { ...context, field });
    }
  }
  if (missing.length > 0) addFinding(findings, "P1", "RECEIPT_REQUIRED_FIELDS_MISSING", "Receipt is missing required semantic fields.", { ...context, fields: missing });
  return missing.length === 0;
}

function checkExact(findings, actual, expected, code, message, details = {}, severity = "P0") {
  if (actual !== expected) addFinding(findings, severity, code, message, { ...details, expected, actual });
  return actual === expected;
}

function checkCommonReceipt({ receipt, contractGate, expected, findings, context }) {
  let valid = true;
  valid = requiredFields(receipt, contractGate.required_fields, findings, context) && valid;
  if (Object.prototype.hasOwnProperty.call(receipt, "tenant_id")) {
    addFinding(findings, "P0", "LEGACY_TENANT_ID_FIELD_FORBIDDEN", "Legacy tenant_id is forbidden; receipt namespaces must use explicit LawOS or Entra tenant IDs.", context);
    valid = false;
  }
  valid = checkExact(findings, receipt.schema_version, RECEIPT_SCHEMA_VERSION, "RECEIPT_SCHEMA_VERSION", "Receipt schema version is not the external release receipt schema.", context) && valid;
  valid = checkExact(findings, receipt.receipt_type, contractGate.receipt_type, "RECEIPT_TYPE", "Receipt type does not match the gate.", context) && valid;
  if (contractGate.required_source) valid = checkExact(findings, receipt.receipt_source, contractGate.required_source, "RECEIPT_SOURCE", "Receipt source does not identify the required authority.", context) && valid;
  const tenantFields = contractGate.tenant_binding_fields ?? (contractGate.tenant_binding_field ? [contractGate.tenant_binding_field] : []);
  for (const tenantField of tenantFields) {
    const expectedTenantId = tenantField === "lawos_tenant_id" ? expected.lawosTenantId : expected.entraTenantId;
    const validFormat = tenantField === "lawos_tenant_id" ? validLawosTenantId(receipt[tenantField]) : validEntraTenantId(receipt[tenantField]);
    valid = validFormat && valid;
    if (!validFormat) addFinding(findings, "P0", "TENANT_ID_NAMESPACE_INVALID", `${tenantField} is missing or has the wrong namespace format.`, { ...context, field: tenantField, actual: receipt[tenantField] });
    valid = checkExact(findings, receipt[tenantField], expectedTenantId, "TENANT_ID_NAMESPACE_MISMATCH", `${tenantField} does not match the named pilot identity namespace.`, { ...context, field: tenantField }) && valid;
  }
  if (expected.pilotId) valid = checkExact(findings, receipt.pilot_id, expected.pilotId, "PILOT_ID_MISMATCH", "Receipt is not bound to the named pilot.", context) && valid;
  valid = checkExact(findings, receipt.source_sha, expected.sourceSha, "SOURCE_SHA_MISMATCH", "Receipt is not bound to the exact release source SHA.", context) && valid;
  valid = checkExact(findings, receipt.source_tree, expected.sourceTree, "SOURCE_TREE_MISMATCH", "Receipt is not bound to the exact release source-tree digest.", context) && valid;
  valid = checkExact(findings, receipt.version, expected.version, "RELEASE_VERSION_MISMATCH", "Receipt is not bound to the exact release version.", context) && valid;
  if (contractGate.required_role) valid = checkExact(findings, receipt.role, contractGate.required_role, "RECEIPT_ROLE_MISMATCH", "Receipt role does not match the contracted authority role.", context) && valid;
  if (contractGate.required_operation) valid = checkExact(findings, receipt.operation, contractGate.required_operation, "RECEIPT_OPERATION_MISMATCH", "Receipt operation does not match the contracted authority operation.", context) && valid;
  const binding = expectedBindingSha256(expected);
  if (Object.prototype.hasOwnProperty.call(receipt, "binding_sha256") || (contractGate.required_fields ?? []).includes("binding_sha256")) {
    valid = checkExact(findings, receipt.binding_sha256, binding, "BINDING_SHA256_MISMATCH", "Receipt binding SHA-256 does not match the exact pilot/source/version namespace tuple.", context) && valid;
  }
  if (receipt.source_sha != null && !validSourceSha(receipt.source_sha)) {
    addFinding(findings, "P0", "SOURCE_SHA_INVALID", "Receipt source_sha must be a 40-character source commit digest.", context);
    valid = false;
  }
  if (receipt.source_tree != null && !validSourceSha(receipt.source_tree)) {
    addFinding(findings, "P0", "SOURCE_TREE_INVALID", "Receipt source_tree must be a 40-character source-tree digest.", context);
    valid = false;
  }
  if (!validSha256(receipt.artifact_sha256)) {
    addFinding(findings, "P0", "ARTIFACT_SHA256_INVALID", "Receipt artifact_sha256 must be a 64-character SHA-256 digest.", context);
    valid = false;
  }
  if (!validSha256(receipt.binding_sha256)) {
    addFinding(findings, "P0", "BINDING_SHA256_INVALID", "Receipt binding_sha256 must be a 64-character SHA-256 digest.", context);
    valid = false;
  }
  const acceptedVerdicts = contractGate.accepted_verdicts ?? ["PASS", "APPROVED"];
  if (!acceptedVerdicts.includes(asText(receipt.verdict).toUpperCase())) {
    addFinding(findings, "P1", "RECEIPT_VERDICT_NOT_PASS", "Receipt verdict is not an accepted positive result for this gate.", { ...context, actual: receipt.verdict, accepted: acceptedVerdicts });
    valid = false;
  }
  return valid;
}

function inspectReceipt({ rootDir, receiptRef, gateId, gate, expected, findings, trustRegistry }) {
  const context = { gate_id: gateId, evidence_class: gate.evidence_class };
  if (!receiptRef) {
    addFinding(findings, gate.evidence_class === "human_legal" ? "P1" : "P1", "REQUIRED_EXTERNAL_RECEIPT_MISSING", "Required external receipt is not available; no claim is inferred from local files.", context);
    return { state: "pending_external", receipt: null, bytes: null, path: null, sha256: null, expected_sha256: null };
  }
  const parsed = parseJsonRef({ rootDir, ref: receiptRef, label: `${gateId} receipt`, findings, details: context });
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return { state: "invalid", receipt: null, bytes: parsed.bytes, path: parsed.path, sha256: parsed.sha256 ?? null, expected_sha256: parsed.expected_sha256 ?? null };
  }
  const trustVerification = inspectReceiptTrust({ rootDir, receiptRef, gate, expected, findings, trustRegistry, context });
  const receipt = trustVerification?.receipt ?? parsed.value;
  const commonValid = checkCommonReceipt({ receipt, contractGate: gate, expected, findings, context });
  const valid = commonValid && Boolean(trustVerification);
  return {
    state: valid && parsed.state === "verified_bytes" ? "verified" : "invalid",
    receipt,
    bytes: trustVerification?.receipt_bytes.length ?? parsed.bytes,
    path: parsed.path,
    sha256: trustVerification?.receipt_sha256 ?? parsed.sha256,
    expected_sha256: parsed.expected_sha256,
  };
}

function checkDate(findings, value, code, message, context) {
  if (!validUtc(value)) {
    addFinding(findings, "P1", code, message, { ...context, actual: value });
    return false;
  }
  return true;
}

function inspectApiReceipt({ result, gate, expected, findings, gateId }) {
  const receipt = result.receipt;
  if (!receipt) return result;
  const context = { gate_id: gateId };
  let valid = result.state === "verified";
  const deployment = receipt.deployment;
  valid = requiredFields(deployment, gate.deployment_required_fields, findings, context) && valid;
  valid = checkExact(findings, asText(deployment?.status).toUpperCase(), "DEPLOYED", "API_DEPLOYMENT_STATUS", "API deployment receipt is not a positive deployment result.", context) && valid;
  valid = checkExact(findings, deployment?.source_sha, expected.sourceSha, "DEPLOYMENT_SOURCE_SHA_MISMATCH", "API deployment source SHA differs from the release candidate.", context) && valid;
  valid = checkExact(findings, deployment?.source_tree, expected.sourceTree, "DEPLOYMENT_SOURCE_TREE_MISMATCH", "API deployment source-tree digest differs from the release candidate.", context) && valid;
  valid = checkExact(findings, deployment?.artifact_sha256, receipt.artifact_sha256, "DEPLOYMENT_ARTIFACT_SHA_MISMATCH", "API deployment artifact SHA differs from the artifact receipt.", context) && valid;
  valid = checkExact(findings, deployment?.version, expected.version, "DEPLOYMENT_VERSION_MISMATCH", "API deployment version differs from the release candidate.", context) && valid;
  valid = checkExact(findings, deployment?.binding_sha256, expectedBindingSha256(expected), "DEPLOYMENT_BINDING_SHA256_MISMATCH", "API deployment binding SHA-256 is not bound to the exact pilot/source/version tuple.", context) && valid;
  valid = validSha256(receipt.artifact_sha256) && valid;
  if (!validSha256(receipt.artifact_sha256)) addFinding(findings, "P0", "API_ARTIFACT_SHA256_INVALID", "API artifact SHA-256 is malformed.", context);
  valid = checkDate(findings, deployment?.deployed_at, "DEPLOYMENT_TIMESTAMP_INVALID", "API deployment receipt must include a UTC deployment timestamp.", context) && valid;
  return { ...result, state: valid ? "verified" : "invalid" };
}

function expectedIssuer(entraTenantId) {
  return `https://login.microsoftonline.com/${entraTenantId}/v2.0`;
}

function checkInternalProvisioningReceipt({ rootDir, adapter, expected, findings, gateId }) {
  const context = { gate_id: gateId, slot: "provisioning", adapter: true };
  if (adapter.internal_receipt_schema_version !== INTERNAL_PROVISIONING_RECEIPT_SCHEMA_VERSION) {
    addFinding(findings, "P0", "INTERNAL_PROVISIONING_SCHEMA_VERSION", "Provisioning adapter must identify the internal producer receipt schema explicitly.", { ...context, actual: adapter.internal_receipt_schema_version });
    return false;
  }
  const internal = parseJsonRef({ rootDir, ref: adapter.internal_receipt_ref, label: `${gateId}.provisioning internal receipt`, findings, details: context });
  let valid = internal.state === "verified_bytes" && internal.value && typeof internal.value === "object" && !Array.isArray(internal.value);
  const receipt = internal.value ?? {};
  if (receipt.schema_version !== INTERNAL_PROVISIONING_RECEIPT_SCHEMA_VERSION) {
    addFinding(findings, "P0", "INTERNAL_PROVISIONING_RECEIPT_SCHEMA", "Provisioning adapter does not point to the expected internal producer receipt schema.", { ...context, actual: receipt.schema_version });
    valid = false;
  }
  valid = checkExact(findings, receipt.outcome, "completed", "INTERNAL_PROVISIONING_OUTCOME", "Internal provisioning producer receipt is not a completed result.", context) && valid;
  valid = checkExact(findings, receipt.tenant_ref, `tenant_sha256:${sha256(Buffer.from(expected.lawosTenantId, "utf8"))}`, "INTERNAL_PROVISIONING_TENANT_REF", "Internal provisioning producer receipt is not bound to the pilot LawOS tenant hash.", context) && valid;
  valid = checkExact(findings, receipt.deployment_mode, "tenant-pinned", "INTERNAL_PROVISIONING_DEPLOYMENT_MODE", "Internal provisioning producer receipt is not tenant-pinned.", context) && valid;
  const runtimeBinding = receipt.runtime_binding ?? {};
  for (const field of ["separate_deployment_required", "identity_authority_pinned", "database_authority_pinned"]) {
    valid = checkExact(findings, runtimeBinding[field], true, "INTERNAL_PROVISIONING_RUNTIME_BINDING", "Internal provisioning receipt does not prove the required pinned runtime authority.", { ...context, field }) && valid;
  }
  valid = checkExact(findings, runtimeBinding.shared_multi_tenant_runtime, false, "INTERNAL_PROVISIONING_RUNTIME_BINDING", "Internal provisioning receipt must not claim a shared multi-tenant runtime.", { ...context, field: "shared_multi_tenant_runtime" }) && valid;
  const manifest = parseJsonRef({ rootDir, ref: adapter.manifest_ref, label: `${gateId}.provisioning manifest`, findings, details: { ...context, slot: "manifest" } });
  valid = manifest.state === "verified_bytes" && manifest.value && typeof manifest.value === "object" && !Array.isArray(manifest.value) && valid;
  valid = checkExact(findings, adapter.manifest_ref?.sha256, manifest.sha256, "INTERNAL_PROVISIONING_MANIFEST_REF_HASH", "Provisioning adapter manifest_ref must carry the exact verified manifest byte SHA-256.", context) && valid;
  valid = checkExact(findings, receipt.manifest_ref, `manifest_sha256:${manifest.sha256}`, "INTERNAL_PROVISIONING_MANIFEST_REF_MISMATCH", "Internal producer receipt manifest_ref must identify the exact protected manifest bytes loaded by the adapter.", context) && valid;
  valid = checkExact(findings, adapter.manifest_schema_version, "law-firm-os.external-tenant-provisioning.v1", "INTERNAL_PROVISIONING_MANIFEST_SCHEMA", "Provisioning adapter must declare the exact protected manifest schema.", context) && valid;
  valid = checkExact(findings, manifest.value?.schema_version, "law-firm-os.external-tenant-provisioning.v1", "INTERNAL_PROVISIONING_MANIFEST_SCHEMA", "Provisioning adapter manifest bytes do not carry the exact producer manifest schema.", context) && valid;
  valid = checkExact(findings, manifest.value?.tenant?.tenant_id, expected.lawosTenantId, "INTERNAL_PROVISIONING_MANIFEST_LAWOS_ID", "Provisioning manifest LawOS tenant ID does not match the named pilot.", context) && valid;
  valid = checkExact(findings, manifest.value?.tenant?.tenant_id, adapter.lawos_tenant_id, "INTERNAL_PROVISIONING_MANIFEST_LAWOS_ID", "Provisioning manifest LawOS tenant ID does not match the signed adapter receipt.", context) && valid;
  const manifestDeployment = manifest.value?.tenant?.deployment ?? {};
  valid = checkExact(findings, manifestDeployment.identity_tenant_id, expected.lawosTenantId, "INTERNAL_PROVISIONING_MANIFEST_IDENTITY_ID", "Provisioning manifest identity authority is not pinned to the pilot LawOS tenant.", context) && valid;
  valid = checkExact(findings, manifestDeployment.database_tenant_id, expected.lawosTenantId, "INTERNAL_PROVISIONING_MANIFEST_DATABASE_ID", "Provisioning manifest database authority is not pinned to the pilot LawOS tenant.", context) && valid;
  valid = checkExact(findings, manifestDeployment.federated_tenant_id, expected.entraTenantId, "INTERNAL_PROVISIONING_MANIFEST_ENTRA_ID", "Provisioning manifest federated tenant is not the pilot Entra UUID.", context) && valid;
  valid = checkExact(findings, manifestDeployment.federated_tenant_id, adapter.entra_tenant_id, "INTERNAL_PROVISIONING_MANIFEST_ENTRA_ID", "Provisioning manifest federated tenant does not match the signed adapter receipt.", context) && valid;
  if (Object.prototype.hasOwnProperty.call(receipt, "tenant_id")) {
    addFinding(findings, "P0", "LEGACY_TENANT_ID_FIELD_FORBIDDEN", "Legacy tenant_id is forbidden in internal provisioning producer evidence.", context);
    valid = false;
  }
  return valid;
}

function inspectTenantGate({ rootDir, input, gate, expected, findings, gateId, trustRegistry }) {
  const provisioningRef = getPathValue(input, gate.input_paths.provisioning);
  const runtimeRef = getPathValue(input, gate.input_paths.runtime_binding);
  const provisioning = inspectReceipt({ rootDir, receiptRef: provisioningRef, gate: { ...gate, receipt_type: gate.provisioning_receipt_type, required_fields: gate.required_provisioning_fields, required_source: gate.provisioning_receipt_source, tenant_binding_fields: gate.provisioning_tenant_binding_fields, required_role: gate.required_provisioning_role, required_operation: gate.required_provisioning_operation }, gateId: `${gateId}.provisioning`, expected, findings, trustRegistry });
  if (provisioning.receipt) {
    let valid = provisioning.state === "verified";
    const provisioningBody = provisioning.receipt.provisioning;
    valid = requiredFields(provisioningBody, gate.provisioning_required_fields, findings, { gate_id: gateId, slot: "provisioning" }) && valid;
    valid = checkExact(findings, asText(provisioningBody?.status).toUpperCase(), "PROVISIONED", "Tenant provisioning receipt is not a positive provisioning result.", { gate_id: gateId, slot: "provisioning" }) && valid;
    valid = checkDate(findings, provisioningBody?.provisioned_at, "TENANT_PROVISIONING_TIMESTAMP_INVALID", "Tenant provisioning receipt must include a UTC provisioning timestamp.", { gate_id: gateId, slot: "provisioning" }) && valid;
    valid = checkInternalProvisioningReceipt({ rootDir, adapter: provisioning.receipt, expected, findings, gateId }) && valid;
    provisioning.state = valid ? "verified" : "invalid";
  }

  const runtime = runtimeRef ? parseJsonRef({ rootDir, ref: runtimeRef, label: `${gateId}.runtime_binding receipt`, findings, details: { gate_id: gateId, slot: "runtime_binding" } }) : null;
  let runtimeResult = { state: "pending_external", receipt: null, bytes: null, path: null, sha256: null, expected_sha256: null };
  if (!runtimeRef) {
    addFinding(findings, "P0", "TENANT_RUNTIME_BINDING_REQUIRED", "Tenant provisioning alone cannot pass: an exact tenant-pinned runtime/config receipt or separately reviewed multi-tenant runtime receipt is required.", {
      gate_id: gateId,
      current_runtime_mode: input.runtime_assumptions?.current_runtime_mode,
      tenant_environment_variable: input.runtime_assumptions?.tenant_environment_variable,
      provisioning_receipt_alone_passes: false,
    });
  } else if (!runtime?.value || typeof runtime.value !== "object" || Array.isArray(runtime.value)) {
    runtimeResult = { state: "invalid", receipt: null, bytes: runtime?.bytes ?? null, path: runtime?.path ?? null, sha256: runtime?.sha256 ?? null, expected_sha256: runtime?.expected_sha256 ?? null };
  } else {
    const trustVerification = inspectReceiptTrust({ rootDir, receiptRef: runtimeRef, gate: { ...gate, required_role: gate.required_runtime_roles, required_operation: gate.required_runtime_operation }, expected, findings, trustRegistry, context: { gate_id: gateId, slot: "runtime_binding" } });
    const runtimeReceipt = trustVerification?.receipt ?? runtime.value;
    let valid = runtime.state === "verified_bytes";
    valid = Boolean(trustVerification) && valid;
    valid = requiredFields(runtimeReceipt, gate.required_runtime_fields, findings, { gate_id: gateId, slot: "runtime_binding" }) && valid;
    valid = checkExact(findings, runtimeReceipt.schema_version, RECEIPT_SCHEMA_VERSION, "RECEIPT_SCHEMA_VERSION", "Runtime binding receipt schema is invalid.", { gate_id: gateId, slot: "runtime_binding" }) && valid;
    valid = gate.runtime_receipt_types.includes(runtimeReceipt.receipt_type) && valid;
    if (!gate.runtime_receipt_types.includes(runtimeReceipt.receipt_type)) addFinding(findings, "P0", "TENANT_RUNTIME_RECEIPT_TYPE_INVALID", "Runtime binding receipt must be tenant-pinned or separately reviewed multi-tenant evidence.", { gate_id: gateId, actual: runtimeReceipt.receipt_type });
    const runtimeSources = gate.runtime_receipt_sources ?? ["external_provider"];
    valid = runtimeSources.includes(runtimeReceipt.receipt_source) && valid;
    if (!runtimeSources.includes(runtimeReceipt.receipt_source)) addFinding(findings, "P0", "TENANT_RUNTIME_RECEIPT_SOURCE_INVALID", "Runtime binding receipt must come from an external provider or independent review, not local file presence.", { gate_id: gateId, slot: "runtime_binding", actual: runtimeReceipt.receipt_source, allowed: runtimeSources });
    if (Object.prototype.hasOwnProperty.call(runtimeReceipt, "tenant_id")) {
      addFinding(findings, "P0", "LEGACY_TENANT_ID_FIELD_FORBIDDEN", "Legacy tenant_id is forbidden in runtime receipts.", { gate_id: gateId, slot: "runtime_binding" });
      valid = false;
    }
    valid = checkExact(findings, runtimeReceipt.pilot_id, expected.pilotId, "PILOT_ID_MISMATCH", "Runtime binding receipt is not bound to the named pilot.", { gate_id: gateId, slot: "runtime_binding" }) && valid;
    valid = checkExact(findings, runtimeReceipt.lawos_tenant_id, expected.lawosTenantId, "LAWOS_TENANT_ID_MISMATCH", "Runtime binding receipt is not bound to the named LawOS tenant.", { gate_id: gateId, slot: "runtime_binding" }) && valid;
    valid = checkExact(findings, runtimeReceipt.entra_tenant_id, expected.entraTenantId, "ENTRA_TENANT_ID_MISMATCH", "Runtime binding receipt is not bound to the named Entra tenant.", { gate_id: gateId, slot: "runtime_binding" }) && valid;
    valid = validLawosTenantId(runtimeReceipt.lawos_tenant_id) && valid;
    valid = validEntraTenantId(runtimeReceipt.entra_tenant_id) && valid;
    valid = checkExact(findings, runtimeReceipt.source_sha, expected.sourceSha, "SOURCE_SHA_MISMATCH", "Runtime binding receipt is not bound to the release source SHA.", { gate_id: gateId, slot: "runtime_binding" }) && valid;
    valid = checkExact(findings, runtimeReceipt.source_tree, expected.sourceTree, "SOURCE_TREE_MISMATCH", "Runtime binding receipt is not bound to the release source-tree digest.", { gate_id: gateId, slot: "runtime_binding" }) && valid;
    valid = checkExact(findings, runtimeReceipt.version, expected.version, "RELEASE_VERSION_MISMATCH", "Runtime binding receipt is not bound to the release version.", { gate_id: gateId, slot: "runtime_binding" }) && valid;
    const runtimeRoles = gate.required_runtime_roles ?? (gate.required_runtime_role ? [gate.required_runtime_role] : []);
    if (runtimeRoles.length > 0 && !runtimeRoles.includes(runtimeReceipt.role)) {
      addFinding(findings, "P0", "RECEIPT_ROLE_MISMATCH", "Runtime binding receipt role does not match the contracted external or independently reviewed authority.", { gate_id: gateId, slot: "runtime_binding", expected: runtimeRoles, actual: runtimeReceipt.role });
      valid = false;
    }
    valid = checkExact(findings, runtimeReceipt.operation, gate.required_runtime_operation, "RECEIPT_OPERATION_MISMATCH", "Runtime binding receipt operation does not match the contracted runtime operation.", { gate_id: gateId, slot: "runtime_binding" }) && valid;
    valid = checkExact(findings, runtimeReceipt.binding_sha256, expectedBindingSha256(expected), "BINDING_SHA256_MISMATCH", "Runtime binding receipt binding SHA-256 is not bound to the exact pilot/source/version tuple.", { gate_id: gateId, slot: "runtime_binding" }) && valid;
    const runtimeAcceptedVerdicts = gate.runtime_accepted_verdicts ?? ["PASS", "APPROVED"];
    if (!runtimeAcceptedVerdicts.includes(asText(runtimeReceipt.verdict).toUpperCase())) {
      addFinding(findings, "P1", "RECEIPT_VERDICT_NOT_PASS", "Runtime binding receipt verdict is not an accepted positive result.", { gate_id: gateId, slot: "runtime_binding", actual: runtimeReceipt.verdict, accepted: runtimeAcceptedVerdicts });
      valid = false;
    }
    const runtimeBody = runtimeReceipt.runtime;
    if (runtimeReceipt.receipt_type === "tenant_pinned_runtime_binding") {
      valid = requiredFields(runtimeBody, gate.required_tenant_pinned_runtime_fields, findings, { gate_id: gateId, slot: "runtime_binding" }) && valid;
      valid = checkExact(findings, runtimeBody?.binding_mode, "tenant_pinned", "Tenant-pinned runtime receipt must explicitly declare tenant_pinned binding.", { gate_id: gateId, slot: "runtime_binding" }) && valid;
      if (Object.prototype.hasOwnProperty.call(runtimeBody ?? {}, "tenant_id")) {
        addFinding(findings, "P0", "LEGACY_TENANT_ID_FIELD_FORBIDDEN", "Legacy tenant_id is forbidden in tenant-pinned runtime evidence.", { gate_id: gateId, slot: "runtime_binding" });
        valid = false;
      }
      valid = checkExact(findings, runtimeBody?.identity_tenant_id, expected.lawosTenantId, "TENANT_RUNTIME_IDENTITY_LAWOS_MISMATCH", "Tenant-pinned runtime identity tenant must equal the pilot LawOS tenant ID.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, runtimeBody?.database_tenant_id, expected.lawosTenantId, "TENANT_RUNTIME_DATABASE_LAWOS_MISMATCH", "Tenant-pinned runtime database tenant must equal the pilot LawOS tenant ID.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, runtimeBody?.federated_tenant_id, expected.entraTenantId, "TENANT_RUNTIME_FEDERATED_ENTRA_MISMATCH", "Tenant-pinned runtime federated tenant must equal the pilot Entra tenant UUID.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, runtimeBody?.issuer, expectedIssuer(expected.entraTenantId), "TENANT_RUNTIME_ISSUER_MISMATCH", "Tenant-pinned runtime issuer is not the exact Entra issuer for the pilot tenant UUID.", { gate_id: gateId }) && valid;
      valid = checkDate(findings, runtimeBody?.deployed_at, "TENANT_RUNTIME_DEPLOYMENT_TIMESTAMP_INVALID", "Tenant-pinned runtime receipt must include a UTC deployment timestamp.", { gate_id: gateId }) && valid;
      const config = parseJsonRef({ rootDir, ref: runtimeBody?.config_ref, label: `${gateId}.runtime_binding config`, findings, details: { gate_id: gateId, slot: "runtime_binding" } });
      valid = config.state === "verified_bytes" && config.value && typeof config.value === "object" && !Array.isArray(config.value) && valid;
      valid = checkExact(findings, config.value?.LAWOS_IDENTITY_TENANT_ID, expected.lawosTenantId, "TENANT_CONFIG_ID_MISMATCH", "Tenant-pinned config does not bind LAWOS_IDENTITY_TENANT_ID to the pilot LawOS tenant.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, config.value?.LAWOS_DATABASE_TENANT_ID, expected.lawosTenantId, "TENANT_CONFIG_DATABASE_ID_MISMATCH", "Tenant-pinned config does not bind LAWOS_DATABASE_TENANT_ID to the pilot LawOS tenant.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, runtimeBody?.resolved_oidc_config_version, config.value?.config_version, "TENANT_CONFIG_VERSION_MISMATCH", "Tenant-pinned runtime does not bind the resolved OIDC config version.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, runtimeBody?.resolved_oidc_config_sha256, runtimeBody?.config_ref?.sha256, "TENANT_CONFIG_DIGEST_MISMATCH", "Tenant-pinned runtime does not bind the resolved OIDC config byte digest.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, runtimeBody?.resolved_oidc_config_protected, true, "TENANT_CONFIG_PROTECTION_MISSING", "Tenant-pinned runtime does not prove the resolved OIDC config is protected.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, config.value?.resolved_oidc?.tenant_id, expected.entraTenantId, "TENANT_CONFIG_FEDERATED_ID_MISMATCH", "Resolved OIDC config tenant does not match the pilot Entra tenant UUID.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, config.value?.resolved_oidc?.issuer, expectedIssuer(expected.entraTenantId), "TENANT_CONFIG_ISSUER_MISMATCH", "Resolved OIDC config issuer does not match the pilot Entra tenant UUID.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, config.value?.resolved_oidc?.protected, true, "TENANT_CONFIG_PROTECTION_MISSING", "Resolved OIDC config does not prove protected resolution.", { gate_id: gateId }) && valid;
      const tenantProjection = runtimeBody?.safe_tenant_projection;
      for (const [field, expectedValue] of [["lawos_tenant_id", expected.lawosTenantId], ["entra_tenant_id", expected.entraTenantId], ["deployment_mode", "tenant-pinned"], ["staff_auth_authority", "entra-oidc"]]) {
        valid = checkExact(findings, tenantProjection?.[field], expectedValue, "TENANT_SAFE_PROJECTION_MISMATCH", "Tenant-pinned runtime safe tenant projection is missing or mismatched.", { gate_id: gateId, field }) && valid;
      }
    } else if (runtimeReceipt.receipt_type === "multi_tenant_runtime_review") {
      const body = runtimeBody ?? {};
      valid = checkExact(findings, body.binding_mode, "multi_tenant", "Multi-tenant runtime receipt must declare multi_tenant binding.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, body.review_status, "APPROVED", "Multi-tenant runtime receipt requires a separately reviewed APPROVED status.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, body.issuer_validation_strategy, "per_request_tenant_and_issuer_validation", "Multi-tenant runtime receipt must prove per-request tenant and issuer validation.", { gate_id: gateId }) && valid;
      valid = checkExact(findings, body.isolation_negative_tests, "PASS", "Multi-tenant runtime receipt must include passing isolation negative tests.", { gate_id: gateId }) && valid;
      valid = nonPlaceholder(body.independent_review_ref) && valid;
      if (!nonPlaceholder(body.independent_review_ref)) addFinding(findings, "P1", "MULTI_TENANT_REVIEW_REF_MISSING", "Multi-tenant runtime receipt is missing its independent review reference.", { gate_id: gateId });
      valid = nonPlaceholder(body.reviewed_by) && valid;
      if (!nonPlaceholder(body.reviewed_by)) addFinding(findings, "P1", "MULTI_TENANT_REVIEWER_MISSING", "Multi-tenant runtime receipt is missing a reviewer identity.", { gate_id: gateId });
      valid = checkDate(findings, body.reviewed_at, "MULTI_TENANT_REVIEW_TIMESTAMP_INVALID", "Multi-tenant runtime receipt must include a UTC review timestamp.", { gate_id: gateId }) && valid;
    }
    runtimeResult = { state: valid ? "verified" : "invalid", receipt: runtimeReceipt, bytes: trustVerification?.receipt_bytes.length ?? runtime.bytes, path: runtime.path, sha256: trustVerification?.receipt_sha256 ?? runtime.sha256, expected_sha256: runtime.expected_sha256 };
  }

  const state = [provisioning, runtimeResult].some((item) => item.state === "invalid") ? "invalid" : [provisioning, runtimeResult].every((item) => item.state === "verified") ? "verified" : "pending_external";
  return { state, slots: { provisioning, runtime_binding: runtimeResult } };
}

function inspectM365Receipt({ result, gate, expected, findings, gateId }) {
  const receipt = result.receipt;
  if (!receipt) return result;
  const context = { gate_id: gateId };
  let valid = result.state === "verified";
  valid = validSha256(receipt.consent?.scope_sha256) && valid;
  if (!validSha256(receipt.consent?.scope_sha256)) addFinding(findings, "P0", "M365_SCOPE_SHA256_INVALID", "M365 consent receipt must include a scope-list SHA-256.", context);
  valid = checkExact(findings, receipt.consent?.status, "GRANTED", "M365 admin consent is not recorded as GRANTED.", context) && valid;
  valid = checkExact(findings, receipt.consent?.scopes_match, true, "M365 admin consent scope reconciliation did not pass.", context) && valid;
  valid = checkExact(findings, receipt.deployment?.status, "ENABLED", "M365 deployment is not recorded as ENABLED.", context) && valid;
  valid = validSha256(receipt.deployment?.assignment_fingerprint_sha256) && valid;
  if (!validSha256(receipt.deployment?.assignment_fingerprint_sha256)) addFinding(findings, "P0", "M365_ASSIGNMENT_FINGERPRINT_INVALID", "M365 deployment receipt must include an assignment fingerprint SHA-256.", context);
  for (const [kind, expectedStatus, expectedPopulation] of [["positive", "VISIBLE", "included"], ["negative", "NOT_VISIBLE", "excluded"]]) {
    const observation = receipt.visibility?.[kind];
    valid = checkExact(findings, observation?.status, expectedStatus, `M365_${kind.toUpperCase()}_VISIBILITY_STATUS`, `M365 ${kind} visibility observation is not ${expectedStatus}.`, context) && valid;
    valid = checkExact(findings, observation?.population, expectedPopulation, `M365_${kind.toUpperCase()}_VISIBILITY_POPULATION`, `M365 ${kind} visibility observation has the wrong population class.`, context) && valid;
    valid = nonPlaceholder(observation?.principal_ref) && valid;
    if (!nonPlaceholder(observation?.principal_ref)) addFinding(findings, "P1", "M365_VISIBILITY_PRINCIPAL_REF_MISSING", `M365 ${kind} visibility observation is missing its principal reference.`, context);
    valid = checkDate(findings, observation?.observed_at, "M365_VISIBILITY_TIMESTAMP_INVALID", `M365 ${kind} visibility observation must include a UTC timestamp.`, context) && valid;
  }
  return { ...result, state: valid ? "verified" : "invalid" };
}

function inspectMacReceipt({ rootDir, result, gate, findings, gateId }) {
  const receipt = result.receipt;
  if (!receipt) return result;
  const context = { gate_id: gateId };
  let valid = result.state === "verified";
  for (const field of ["developer_id", "notarized", "stapled", "gatekeeper_accepted"]) {
    valid = checkExact(findings, receipt.signing?.[field], true, `MAC_SIGNING_${field.toUpperCase()}`, `macOS ${field} proof is not true.`, context) && valid;
  }
  valid = nonPlaceholder(receipt.signing?.notarization_ticket_ref) && valid;
  if (!nonPlaceholder(receipt.signing?.notarization_ticket_ref)) addFinding(findings, "P0", "MAC_NOTARIZATION_TICKET_MISSING", "macOS receipt is missing a notarization ticket reference.", context);
  const packageRef = receipt.artifacts?.package;
  const checksumsRef = receipt.artifacts?.checksums;
  const sbomRef = receipt.artifacts?.sbom;
  const packageFile = inspectFileRef({ rootDir, ref: packageRef, label: `${gateId} package`, findings, details: context });
  const checksumsFile = inspectFileRef({ rootDir, ref: checksumsRef, label: `${gateId} checksums`, findings, details: context });
  const sbomFile = inspectFileRef({ rootDir, ref: sbomRef, label: `${gateId} SBOM`, findings, details: context });
  valid = packageFile.state === "verified_bytes" && checksumsFile.state === "verified_bytes" && sbomFile.state === "verified_bytes" && valid;
  valid = checkExact(findings, receipt.artifact_sha256, packageFile.sha256, "MAC_RECEIPT_ARTIFACT_SHA256_MISMATCH", "Signed macOS receipt artifact_sha256 does not match the exact DMG package bytes.", context) && valid;
  if (!String(packageRef?.kind ?? "").toLowerCase().includes("dmg") || !String(packageRef?.path ?? "").toLowerCase().endsWith(".dmg")) {
    addFinding(findings, "P0", "MAC_PACKAGE_KIND_INVALID", "macOS distribution receipt must reference a DMG package.", context);
    valid = false;
  }
  if (checksumsFile.target && packageFile.target) {
    const packageName = path.basename(packageFile.target);
    const checksumText = checksumsFile.snapshot.toString("utf8");
    const checksumLine = checksumText.split(/\r?\n/u).find((line) => line.trim().endsWith(`  ${packageName}`) || line.trim().endsWith(` *${packageName}`));
    const checksumHash = checksumLine?.trim().split(/\s+/u)[0]?.toLowerCase();
    valid = checkExact(findings, checksumHash, packageFile.sha256, "MAC_CHECKSUM_PACKAGE_MISMATCH", "checksums.sha256 does not bind the package bytes.", context) && valid;
  }
  if (sbomFile.target) {
    try {
      const sbom = JSON.parse(sbomFile.snapshot.toString("utf8"));
      valid = checkExact(findings, String(sbom.bomFormat ?? "").toLowerCase(), "cyclonedx", "MAC_SBOM_FORMAT_INVALID", "SBOM must be a CycloneDX document.", context) && valid;
      if (!Array.isArray(sbom.components) || sbom.components.length === 0) {
        addFinding(findings, "P0", "MAC_SBOM_COMPONENTS_MISSING", "SBOM must contain at least one component.", context);
        valid = false;
      }
    } catch (error) {
      addFinding(findings, "P0", "MAC_SBOM_JSON_INVALID", "SBOM is not valid JSON.", { ...context, error: error.message });
      valid = false;
    }
  }
  return { ...result, state: valid ? "verified" : "invalid", artifacts: { package: packageFile, checksums: checksumsFile, sbom: sbomFile } };
}

function exactArray(findings, actual, expected, code, message, context) {
  const valid = JSON.stringify(actual) === JSON.stringify(expected);
  if (!valid) addFinding(findings, "P0", code, message, { ...context, expected, actual });
  return valid;
}

function sbomPropertyMap(sbom) {
  const properties = sbom?.metadata?.component?.properties;
  return Array.isArray(properties)
    ? Object.fromEntries(properties.filter((entry) => typeof entry?.name === "string").map((entry) => [entry.name, entry.value]))
    : {};
}

function inspectWindowsSbom({ parsed, candidate, signerCertificateSha1, gate, findings, context }) {
  const sbom = parsed.value;
  let valid = parsed.state === "verified_bytes" && sbom && typeof sbom === "object" && !Array.isArray(sbom);
  valid = checkExact(findings, sbom?.bomFormat, "CycloneDX", "WINDOWS_SBOM_FORMAT_INVALID", "Windows installed-tree SBOM must be CycloneDX.", context) && valid;
  valid = checkExact(findings, sbom?.specVersion, "1.5", "WINDOWS_SBOM_SPEC_VERSION_INVALID", "Windows installed-tree SBOM must use CycloneDX 1.5.", context) && valid;
  valid = checkExact(findings, sbom?.metadata?.component?.version, candidate.version, "WINDOWS_SBOM_VERSION_MISMATCH", "Windows SBOM application version differs from its candidate.", context) && valid;
  const propertyEntries = sbom?.metadata?.component?.properties;
  const properties = sbomPropertyMap(sbom);
  if (!Array.isArray(propertyEntries)
      || new Set(propertyEntries.map((entry) => entry?.name)).size !== propertyEntries.length) {
    addFinding(findings, "P0", "WINDOWS_SBOM_PROPERTIES_INVALID", "Windows installed-tree SBOM metadata properties must have unique names.", context);
    valid = false;
  }
  for (const [property, expected] of [
    ["law-firm-os:schema-version", gate.installed_tree_sbom_schema_version],
    ["law-firm-os:source-sha", candidate.source_sha],
    ["law-firm-os:source-tree", candidate.source_tree],
    ["law-firm-os:installer-sha256", candidate.artifact_sha256],
    ["law-firm-os:installed-file-content-complete", "true"],
    ["law-firm-os:installed-directory-identity-complete", "true"],
    ["law-firm-os:native-snapshot-schema-version", gate.native_snapshot_schema_version],
    ["law-firm-os:native-filesystem", "NTFS"],
    ["law-firm-os:native-fixed-point-sequence", (gate.required_native_fixed_point_sequence ?? []).join("->")],
    ["law-firm-os:native-fixed-point-exact", "true"],
    ["law-firm-os:dependency-inventory-complete", "false"],
    ["law-firm-os:dependency-inventory-scope", "direct-runtime-declarations"],
    ["law-firm-os:reparse-point-count", "0"],
    ["law-firm-os:alternate-data-stream-count", "0"],
    ["law-firm-os:authenticode-valid", "true"],
    ["law-firm-os:signer-certificate-sha1", signerCertificateSha1],
  ]) {
    valid = checkExact(findings, properties[property], expected, "WINDOWS_SBOM_BINDING_MISMATCH", "Windows installed-tree SBOM property is not bound to the exact signed candidate.", { ...context, property }) && valid;
  }
  for (const property of [
    "law-firm-os:installed-tree-sha256",
    "law-firm-os:packaged-executable-sha256",
    "law-firm-os:installed-executable-sha256",
    "law-firm-os:native-identity-sha256",
  ]) {
    if (!validSha256(properties[property])) {
      addFinding(findings, "P0", "WINDOWS_SBOM_SHA256_INVALID", "Windows installed-tree SBOM contains a malformed digest property.", { ...context, property, actual: properties[property] });
      valid = false;
    }
  }
  valid = checkExact(
    findings,
    properties["law-firm-os:installed-executable-sha256"],
    properties["law-firm-os:packaged-executable-sha256"],
    "WINDOWS_SBOM_EXECUTABLE_BYTE_MISMATCH",
    "Installed executable bytes differ from the packaged executable bytes.",
    context,
  ) && valid;
  const nativeDirectoryCount = Number(properties["law-firm-os:native-directory-count"]);
  if (!Number.isSafeInteger(nativeDirectoryCount) || nativeDirectoryCount < 1) {
    addFinding(findings, "P0", "WINDOWS_SBOM_NATIVE_DIRECTORY_COUNT_INVALID", "Windows installed-tree SBOM must record a positive native directory count.", { ...context, actual: properties["law-firm-os:native-directory-count"] });
    valid = false;
  }
  const fileCount = Number(properties["law-firm-os:installed-tree-file-count"]);
  const installedBytes = Number(properties["law-firm-os:installed-tree-bytes"]);
  const fileComponents = Array.isArray(sbom?.components) ? sbom.components.filter((component) => component?.type === "file") : [];
  if (!Number.isSafeInteger(fileCount) || fileCount < 1 || fileComponents.length !== fileCount || !Number.isSafeInteger(installedBytes) || installedBytes < 1) {
    addFinding(findings, "P0", "WINDOWS_SBOM_INSTALLED_TREE_INCOMPLETE", "Windows SBOM must enumerate every installed-tree file and positive total bytes.", { ...context, file_count: fileCount, components: fileComponents.length, bytes: installedBytes });
    valid = false;
  }
  const names = fileComponents.map((component) => component?.name);
  const caseFoldedNames = names.map((name) => asText(name).toLocaleLowerCase("en-US"));
  if (new Set(names).size !== names.length || new Set(caseFoldedNames).size !== caseFoldedNames.length) {
    addFinding(findings, "P0", "WINDOWS_SBOM_FILE_PATH_DUPLICATE", "Windows installed-tree SBOM file paths must be unique without Windows case-fold aliases.", context);
    valid = false;
  }
  const manifestRows = [];
  let summedFileBytes = 0;
  for (const component of fileComponents) {
    const componentPath = asText(component?.name);
    const hashes = component?.hashes;
    const componentProperties = component?.properties;
    const byteProperties = Array.isArray(componentProperties)
      ? componentProperties.filter((entry) => entry?.name === "law-firm-os:file-bytes")
      : [];
    const sha256Hashes = Array.isArray(hashes) ? hashes.filter((entry) => entry?.alg === "SHA-256") : [];
    const fileHash = asText(sha256Hashes[0]?.content).toLowerCase();
    const fileBytes = Number(byteProperties?.[0]?.value);
    const relativePath = componentPath.startsWith("./") ? componentPath.slice(2) : "";
    const pathSegments = relativePath.split("/");
    const canonicalPath = relativePath.length > 0
      && !/[\0\r\n\\]/u.test(relativePath)
      && pathSegments.every((segment) => segment && segment !== "." && segment !== "..")
      && componentPath === componentPath.normalize("NFC");
    const uniqueHashAlgorithms = Array.isArray(hashes) && new Set(hashes.map((entry) => entry?.alg)).size === hashes.length;
    const uniquePropertyNames = Array.isArray(componentProperties) && new Set(componentProperties.map((entry) => entry?.name)).size === componentProperties.length;
    if (!canonicalPath || !uniqueHashAlgorithms || !uniquePropertyNames || sha256Hashes.length !== 1 || byteProperties?.length !== 1 || !validSha256(fileHash) || !Number.isSafeInteger(fileBytes) || fileBytes < 0) {
      addFinding(findings, "P0", "WINDOWS_SBOM_FILE_COMPONENT_INVALID", "Every installed-tree file component must carry a unique canonical ./ path, one SHA-256, and a non-negative byte count.", { ...context, component: componentPath || null });
      valid = false;
      continue;
    }
    summedFileBytes += fileBytes;
    manifestRows.push({ path: componentPath, sha256: fileHash, bytes: fileBytes });
  }
  const sortedRows = manifestRows.sort((left, right) => Buffer.compare(Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8")));
  const reconstructedTreeSha256 = sha256(Buffer.from(sortedRows.map((entry) => `${entry.sha256} ${entry.bytes} ${entry.path}\n`).join(""), "utf8"));
  if (summedFileBytes !== installedBytes || reconstructedTreeSha256 !== properties["law-firm-os:installed-tree-sha256"]) {
    addFinding(findings, "P0", "WINDOWS_SBOM_INSTALLED_TREE_DIGEST_MISMATCH", "Windows SBOM file components do not reconstruct the declared installed-tree bytes and digest.", { ...context, summed_file_bytes: summedFileBytes, declared_bytes: installedBytes, reconstructed_sha256: reconstructedTreeSha256, declared_sha256: properties["law-firm-os:installed-tree-sha256"] });
    valid = false;
  }
  const installedExecutablePath = asText(properties["law-firm-os:installed-executable-path"]);
  const executableComponent = fileComponents.find((component) => component?.name === installedExecutablePath);
  const executableHashes = Array.isArray(executableComponent?.hashes)
    ? executableComponent.hashes.filter((entry) => entry?.alg === "SHA-256")
    : [];
  if (!/^\.\/(?:[^\0\r\n\\/]+\/)*matter\.exe$/iu.test(installedExecutablePath)
      || executableHashes.length !== 1
      || asText(executableHashes[0]?.content).toLowerCase() !== properties["law-firm-os:installed-executable-sha256"]) {
    addFinding(findings, "P0", "WINDOWS_SBOM_EXECUTABLE_BINDING_INVALID", "Windows installed executable path and exact component digest are not bound to installed-executable-sha256.", context);
    valid = false;
  }
  return { valid, properties, installedTreeEntries: manifestRows };
}

function inspectWindowsNativeSnapshot({ snapshot, summary, gate, findings, context, code = "WINDOWS_QA_NATIVE_SNAPSHOT_INVALID" }) {
  let valid = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot);
  valid = exactArray(findings, Object.keys(snapshot ?? {}).sort(), [...(gate.native_snapshot_required_fields ?? [])].sort(), code, "Windows native fixed-point snapshot fields are incomplete or unexpected.", context) && valid;
  for (const [actual, expected, field] of [
    [snapshot?.schema_version, gate.native_snapshot_schema_version, "schema_version"],
    [snapshot?.filesystem, "NTFS", "filesystem"],
    [snapshot?.fixed_point_exact, true, "fixed_point_exact"],
    [snapshot?.equality_proof, gate.native_fixed_point_equality_proof, "equality_proof"],
  ]) valid = checkExact(findings, actual, expected, code, "Windows native fixed-point snapshot differs from the mandatory native evidence contract.", { ...context, field }) && valid;
  valid = exactArray(findings, snapshot?.fixed_point_sequence, gate.required_native_fixed_point_sequence, code, "Windows native fixed-point snapshot sequence is incomplete or reordered.", context) && valid;
  if (!validSha256(snapshot?.content_sha256)
      || !validSha256(snapshot?.identity_sha256)
      || !Number.isSafeInteger(snapshot?.file_count) || snapshot.file_count < 1
      || !Number.isSafeInteger(snapshot?.directory_count) || snapshot.directory_count < 1
      || !Number.isSafeInteger(snapshot?.bytes) || snapshot.bytes < 1) {
    addFinding(findings, "P0", code, "Windows native fixed-point snapshot digests, counts, or byte total are malformed.", context);
    valid = false;
  }
  for (const [field, expected] of Object.entries(summary ?? {})) {
    valid = (Array.isArray(expected)
      ? exactArray(findings, snapshot?.[field], expected, code, "Windows native fixed-point snapshot differs from the exact installed-tree QA/SBOM summary.", { ...context, field })
      : checkExact(findings, snapshot?.[field], expected, code, "Windows native fixed-point snapshot differs from the exact installed-tree QA/SBOM summary.", { ...context, field })) && valid;
  }
  const phases = Array.isArray(snapshot?.phases) ? snapshot.phases : [];
  valid = checkExact(findings, phases.length, (gate.required_native_fixed_point_sequence ?? []).length, code, "Windows native fixed-point snapshot must contain all five phase records.", context) && valid;
  for (const [index, phase] of phases.entries()) {
    const phaseContext = { ...context, phase_index: index, phase: phase?.name ?? null };
    valid = exactArray(findings, Object.keys(phase ?? {}).sort(), [...(gate.native_snapshot_phase_required_fields ?? [])].sort(), code, "Windows native fixed-point phase fields are incomplete or unexpected.", phaseContext) && valid;
    for (const [actual, expected, field] of [
      [phase?.name, gate.required_native_fixed_point_sequence?.[index], "name"],
      [phase?.content_sha256, snapshot?.content_sha256, "content_sha256"],
      [phase?.identity_sha256, snapshot?.identity_sha256, "identity_sha256"],
      [phase?.file_count, snapshot?.file_count, "file_count"],
      [phase?.directory_count, snapshot?.directory_count, "directory_count"],
      [phase?.bytes, snapshot?.bytes, "bytes"],
    ]) valid = checkExact(findings, actual, expected, code, "Windows native fixed-point phase does not exactly match the public/private manifest aggregate.", { ...phaseContext, field }) && valid;
  }
  return { valid, snapshot };
}

function inspectWindowsInstalledTreeSummary({ value, expected = null, includeIdentity = true, gate, findings, context, code, message }) {
  let valid = value && typeof value === "object" && !Array.isArray(value);
  valid = exactArray(
    findings,
    Object.keys(value ?? {}).sort(),
    [...(gate.installed_tree_summary_required_fields ?? [])].sort(),
    code,
    message,
    context,
  ) && valid;
  const executablePath = value?.installed_executable_path;
  const executableBody = typeof executablePath === "string" && executablePath.startsWith("./")
    ? executablePath.slice(2)
    : "";
  if (value?.schema_version !== gate.native_snapshot_schema_version
      || !validSha256(value?.content_sha256)
      || !validSha256(value?.identity_sha256)
      || !validSha256(value?.installed_executable_sha256)
      || !Number.isInteger(value?.file_count) || value.file_count < 1
      || !Number.isInteger(value?.directory_count) || value.directory_count < 1
      || !Number.isSafeInteger(value?.bytes) || value.bytes < 1
      || !Number.isSafeInteger(value?.installed_executable_bytes) || value.installed_executable_bytes < 1
      || value.installed_executable_bytes > value.bytes
      || !/^\.\/(?!\.\.\/)[^\\:\0\r\n]+\.exe$/iu.test(executablePath ?? "")
      || path.posix.normalize(executableBody) !== executableBody
      || executablePath !== executablePath?.normalize("NFC")) {
    addFinding(findings, "P0", code, message, context);
    valid = false;
  }
  if (expected) {
    const fields = includeIdentity
      ? gate.installed_tree_summary_required_fields
      : gate.installed_tree_portable_fields;
    for (const field of fields ?? []) {
      valid = checkExact(findings, value?.[field], expected?.[field], code, message, { ...context, field }) && valid;
    }
  }
  return valid;
}

function inspectWindowsQaUninstaller({ qa, installedTreeEntries, signerCertificateSha1, gate, findings, context }) {
  const uninstaller = qa?.package?.uninstaller;
  let valid = uninstaller && typeof uninstaller === "object" && !Array.isArray(uninstaller);
  valid = exactArray(findings, Object.keys(uninstaller ?? {}).sort(), [...(gate.native_qa_uninstaller_required_fields ?? [])].sort(), "WINDOWS_QA_UNINSTALLER_FIELDS_INVALID", "Windows native QA locked-uninstaller fields are incomplete or unexpected.", context) && valid;
  valid = exactArray(findings, Object.keys(uninstaller?.process ?? {}).sort(), [...(gate.native_qa_uninstaller_process_fields ?? [])].sort(), "WINDOWS_QA_UNINSTALLER_PROCESS_FIELDS_INVALID", "Windows native QA locked-uninstaller process fields are incomplete or unexpected.", context) && valid;
  const installedTreePath = asText(uninstaller?.installed_tree_path);
  const pathBody = installedTreePath.startsWith("./") ? installedTreePath.slice(2) : "";
  const canonicalPath = /^\.\/(?!\.\.\/)[^\\:\0\r\n]+\.exe$/iu.test(installedTreePath)
    && path.posix.normalize(pathBody) === pathBody
    && installedTreePath === installedTreePath.normalize("NFC");
  for (const [actual, expected, code, message] of [
    [uninstaller?.path, installedTreePath, "WINDOWS_QA_UNINSTALLER_PATH_MISMATCH", "Windows native QA uninstaller path differs from its installed-tree path."],
    [uninstaller?.sha256, uninstaller?.installed_tree_sha256, "WINDOWS_QA_UNINSTALLER_DIGEST_MISMATCH", "Windows native QA uninstaller digest differs from its installed-tree digest."],
    [uninstaller?.bytes, uninstaller?.uninstaller_bytes, "WINDOWS_QA_UNINSTALLER_BYTES_MISMATCH", "Windows native QA uninstaller byte count differs from its locked receipt."],
    [uninstaller?.authenticode_valid, true, "WINDOWS_QA_UNINSTALLER_AUTHENTICODE_INVALID", "Windows native QA uninstaller Authenticode verification did not PASS."],
    [uninstaller?.authenticode?.status, "Valid", "WINDOWS_QA_UNINSTALLER_AUTHENTICODE_INVALID", "Windows native QA uninstaller Authenticode status is invalid."],
    [uninstaller?.authenticode?.signature_type, "Authenticode", "WINDOWS_QA_UNINSTALLER_AUTHENTICODE_INVALID", "Windows native QA uninstaller signature type is invalid."],
    [uninstaller?.authenticode?.signer_thumbprint, signerCertificateSha1, "WINDOWS_QA_UNINSTALLER_SIGNER_MISMATCH", "Windows native QA uninstaller signer differs from the signed installer."],
    [uninstaller?.authenticode?.time_stamper_certificate_present, true, "WINDOWS_QA_UNINSTALLER_TIMESTAMP_INVALID", "Windows native QA uninstaller lacks a timestamp certificate."],
    [uninstaller?.lock_mode, "FileShare.Read", "WINDOWS_QA_UNINSTALLER_LOCK_INVALID", "Windows native QA uninstaller was not held under FileShare.Read."],
    [uninstaller?.denies_write_delete, true, "WINDOWS_QA_UNINSTALLER_LOCK_INVALID", "Windows native QA uninstaller lock did not deny write/delete replacement."],
    [uninstaller?.process?.path_identity, "pid_executable_path", "WINDOWS_QA_UNINSTALLER_PROCESS_INVALID", "Windows native QA uninstaller process did not bind the exact locked path."],
    [uninstaller?.exit_code, 0, "WINDOWS_QA_UNINSTALLER_EXIT_INVALID", "Windows native QA locked uninstaller did not exit successfully."],
  ]) valid = checkExact(findings, actual, expected, code, message, context) && valid;
  if (!canonicalPath
      || !validSha256(uninstaller?.sha256)
      || !validSha256(uninstaller?.installed_tree_sha256)
      || !Number.isSafeInteger(uninstaller?.bytes) || uninstaller.bytes < 1
      || !Number.isSafeInteger(uninstaller?.uninstaller_bytes) || uninstaller.uninstaller_bytes < 1
      || !Number.isSafeInteger(uninstaller?.process?.pid) || uninstaller.process.pid < 1
      || !CERTIFICATE_SHA256_PATTERN.test(asText(uninstaller?.authenticode?.signer_certificate_sha256))
      || !CERTIFICATE_SHA256_PATTERN.test(asText(uninstaller?.authenticode?.timestamp_certificate_sha256))
      || !CERTIFICATE_SHA1_PATTERN.test(asText(uninstaller?.authenticode?.timestamp_thumbprint))
      || !Array.isArray(uninstaller?.authenticode?.signer_eku_oids)
      || !uninstaller.authenticode.signer_eku_oids.includes("1.3.6.1.5.5.7.3.3")
      || !Array.isArray(uninstaller?.authenticode?.timestamp_eku_oids)
      || !uninstaller.authenticode.timestamp_eku_oids.includes("1.3.6.1.5.5.7.3.8")) {
    addFinding(findings, "P0", "WINDOWS_QA_UNINSTALLER_EVIDENCE_INVALID", "Windows native QA uninstaller path, digest, bytes, signature, lock, or process evidence is malformed.", context);
    valid = false;
  }
  const matchingEntries = Array.isArray(installedTreeEntries)
    ? installedTreeEntries.filter((entry) => entry.path === installedTreePath)
    : [];
  if (matchingEntries.length !== 1
      || matchingEntries[0]?.sha256 !== uninstaller?.installed_tree_sha256
      || matchingEntries[0]?.bytes !== uninstaller?.uninstaller_bytes) {
    addFinding(findings, "P0", "WINDOWS_QA_UNINSTALLER_SBOM_BINDING_INVALID", "Windows native QA uninstaller path, digest, and byte count must match exactly one verified SBOM file component.", { ...context, matching_components: matchingEntries.length });
    valid = false;
  }
  return {
    valid,
    evidence: {
      installed_tree_path: installedTreePath,
      installed_tree_sha256: uninstaller?.installed_tree_sha256,
      uninstaller_sha256: uninstaller?.sha256,
      uninstaller_bytes: uninstaller?.uninstaller_bytes,
      authenticode_sha256: sha256(Buffer.from(canonicalJson(uninstaller?.authenticode ?? null), "utf8")),
      authenticode_valid: uninstaller?.authenticode_valid,
      lock_mode: uninstaller?.lock_mode,
      denies_write_delete: uninstaller?.denies_write_delete,
      process_path_identity: uninstaller?.process?.path_identity,
      exit_code: uninstaller?.exit_code,
    },
  };
}

function inspectWindowsQa({ parsed, candidate, sbomFile, sbomProperties, installedTreeEntries, signerCertificateSha1, evidenceIssuedAt, gate, findings, context }) {
  const qa = parsed.value;
  let valid = parsed.state === "verified_bytes" && qa && typeof qa === "object" && !Array.isArray(qa);
  for (const [actual, expectedValue, code, message] of [
    [qa?.schema_version, gate.native_qa_schema_version, "WINDOWS_QA_SCHEMA_INVALID", "Windows native package QA receipt schema is invalid."],
    [validUtc(qa?.generated_at), true, "WINDOWS_QA_TIMESTAMP_INVALID", "Windows native package QA generated_at must be a canonical UTC timestamp."],
    [qa?.verdict, "PASS", "WINDOWS_QA_VERDICT_INVALID", "Windows native package QA did not PASS."],
    [qa?.native_verdict, "PASS", "WINDOWS_QA_NATIVE_VERDICT_INVALID", "Windows native package scenarios did not PASS."],
    [qa?.source?.revision, candidate.source_sha, "WINDOWS_QA_SOURCE_SHA_MISMATCH", "Windows native package QA source SHA differs from its candidate."],
    [qa?.source?.source_tree, candidate.source_tree, "WINDOWS_QA_SOURCE_TREE_MISMATCH", "Windows native package QA source tree differs from its candidate."],
    [qa?.source?.source_dirty, false, "WINDOWS_QA_SOURCE_DIRTY", "Windows native package QA must use a clean source tree."],
    [qa?.package?.channel, "formal", "WINDOWS_QA_CHANNEL_INVALID", "Windows native package QA must use the formal channel."],
    [qa?.package?.app_id, "com.amic.matter.desktop", "WINDOWS_QA_APP_ID_INVALID", "Windows native package QA app identity is invalid."],
    [qa?.package?.installer?.sha256, candidate.artifact_sha256, "WINDOWS_QA_INSTALLER_SHA256_MISMATCH", "Windows native package QA installer digest differs from its candidate."],
    [qa?.authenticode?.valid, true, "WINDOWS_QA_AUTHENTICODE_INVALID", "Windows native package QA did not verify Authenticode."],
    [qa?.authenticode?.expected_signer_certificate_sha1, signerCertificateSha1, "WINDOWS_QA_SIGNER_MISMATCH", "Windows native package QA expected signer differs from the release signer."],
    [qa?.authenticode?.signer?.thumbprint, signerCertificateSha1, "WINDOWS_QA_SIGNER_MISMATCH", "Windows native package QA observed signer differs from the release signer."],
    [qa?.authenticode?.signer_code_signing_eku_verified, true, "WINDOWS_QA_SIGNER_EKU_INVALID", "Windows native package QA did not verify the code-signing EKU."],
    [qa?.authenticode?.timestamp_eku_verified, true, "WINDOWS_QA_TIMESTAMP_EKU_INVALID", "Windows native package QA did not verify the timestamp EKU."],
    [qa?.sbom?.schema_version, gate.installed_tree_sbom_schema_version, "WINDOWS_QA_SBOM_SCHEMA_INVALID", "Windows QA receipt identifies the wrong installed-tree SBOM schema."],
    [qa?.sbom?.format, "CycloneDX", "WINDOWS_QA_SBOM_FORMAT_INVALID", "Windows QA receipt identifies the wrong SBOM format."],
    [qa?.sbom?.spec_version, "1.5", "WINDOWS_QA_SBOM_SPEC_INVALID", "Windows QA receipt identifies the wrong SBOM version."],
    [qa?.sbom?.sha256, sbomFile.sha256, "WINDOWS_QA_SBOM_SHA256_MISMATCH", "Windows QA receipt is not bound to the exact installed-tree SBOM bytes."],
    [qa?.sbom?.installed_tree_sha256, sbomProperties["law-firm-os:installed-tree-sha256"], "WINDOWS_QA_INSTALLED_TREE_SHA256_MISMATCH", "Windows QA and SBOM installed-tree digests differ."],
    [qa?.sbom?.installed_tree_file_count, Number(sbomProperties["law-firm-os:installed-tree-file-count"]), "WINDOWS_QA_INSTALLED_TREE_COUNT_MISMATCH", "Windows QA and SBOM installed-tree file counts differ."],
    [qa?.sbom?.installed_tree_bytes, Number(sbomProperties["law-firm-os:installed-tree-bytes"]), "WINDOWS_QA_INSTALLED_TREE_BYTES_MISMATCH", "Windows QA and SBOM installed-tree byte counts differ."],
    [qa?.sbom?.post_runtime_tree_sha256, sbomProperties["law-firm-os:installed-tree-sha256"], "WINDOWS_QA_POST_RUNTIME_TREE_MISMATCH", "Windows post-runtime installed tree differs from the prelaunch SBOM aggregate."],
    [qa?.sbom?.post_runtime_native_identity_sha256, sbomProperties["law-firm-os:native-identity-sha256"], "WINDOWS_QA_POST_RUNTIME_IDENTITY_MISMATCH", "Windows post-runtime native identity differs from the prelaunch SBOM identity."],
    [qa?.sbom?.post_runtime_byte_identical, true, "WINDOWS_QA_POST_RUNTIME_TREE_MISMATCH", "Windows post-runtime installed tree is not byte-identical to the prelaunch tree."],
    [qa?.sbom?.installed_binary_complete, true, "WINDOWS_QA_INSTALLED_TREE_INCOMPLETE", "Windows QA did not assert binary-complete installed-tree evidence."],
    [qa?.sbom?.installed_file_content_complete, true, "WINDOWS_QA_INSTALLED_FILE_CONTENT_INCOMPLETE", "Windows QA did not assert complete installed file-content evidence."],
    [qa?.sbom?.installed_directory_identity_complete, true, "WINDOWS_QA_INSTALLED_DIRECTORY_IDENTITY_INCOMPLETE", "Windows QA did not assert complete installed directory-identity evidence."],
    [qa?.sbom?.native_snapshot_schema_version, gate.native_snapshot_schema_version, "WINDOWS_QA_NATIVE_SNAPSHOT_SCHEMA_INVALID", "Windows QA native snapshot schema is invalid."],
    [qa?.sbom?.native_filesystem, "NTFS", "WINDOWS_QA_NATIVE_FILESYSTEM_INVALID", "Windows QA native snapshot must use NTFS."],
    [qa?.sbom?.native_directory_count, Number(sbomProperties["law-firm-os:native-directory-count"]), "WINDOWS_QA_NATIVE_DIRECTORY_COUNT_MISMATCH", "Windows QA native directory count differs from the installed-tree SBOM."],
    [qa?.sbom?.native_identity_sha256, sbomProperties["law-firm-os:native-identity-sha256"], "WINDOWS_QA_NATIVE_IDENTITY_MISMATCH", "Windows QA native identity digest differs from the installed-tree SBOM."],
    [JSON.stringify(qa?.sbom?.native_fixed_point_sequence), JSON.stringify(gate.required_native_fixed_point_sequence), "WINDOWS_QA_NATIVE_FIXED_POINT_SEQUENCE_INVALID", "Windows QA native fixed-point sequence is incomplete or reordered."],
    [qa?.sbom?.native_fixed_point_exact, true, "WINDOWS_QA_NATIVE_FIXED_POINT_NOT_EXACT", "Windows QA native fixed point was not exact."],
    [qa?.sbom?.reparse_point_count, 0, "WINDOWS_QA_REPARSE_POINT_INVALID", "Windows QA installed tree contains a reparse point."],
    [qa?.sbom?.alternate_data_stream_count, 0, "WINDOWS_QA_ALTERNATE_DATA_STREAM_INVALID", "Windows QA installed tree contains an alternate data stream."],
    [qa?.sbom?.hard_link_count, 0, "WINDOWS_QA_HARD_LINK_INVALID", "Windows QA installed tree contains an extra hard link."],
    [qa?.sbom?.authenticode_bound, true, "WINDOWS_QA_SBOM_AUTHENTICODE_UNBOUND", "Windows QA SBOM is not bound to valid Authenticode evidence."],
  ]) valid = checkExact(findings, actual, expectedValue, code, message, context) && valid;
  const timestamps = qa?.authenticode?.timestamps;
  if (!Array.isArray(timestamps) || timestamps.length < 1 || timestamps.some((entry) => !CERTIFICATE_SHA1_PATTERN.test(asText(entry?.thumbprint)))) {
    addFinding(findings, "P0", "WINDOWS_QA_TIMESTAMP_CERTIFICATE_INVALID", "Windows native package QA must identify at least one valid timestamp certificate.", context);
    valid = false;
  }
  if (validUtc(qa?.generated_at) && (Date.parse(qa.generated_at) > Date.now() || Date.parse(qa.generated_at) > evidenceIssuedAt)) {
    addFinding(findings, "P0", "WINDOWS_QA_TIMESTAMP_FUTURE", "Windows native package QA cannot postdate the outer signed evidence receipt or current time.", context);
    valid = false;
  }
  for (const scenario of gate.required_native_qa_scenarios ?? []) {
    valid = checkExact(findings, qa?.scenarios?.[scenario], true, "WINDOWS_QA_SCENARIO_NOT_PASS", "A required Windows native package QA scenario did not PASS.", { ...context, scenario }) && valid;
  }
  for (const [field, expected] of [
    ["build_manifest_embedded", true],
    ["formal_marker_embedded", true],
    ["formal_local_api_default_disabled", true],
  ]) valid = checkExact(findings, qa?.package?.[field], expected, "WINDOWS_QA_PACKAGE_BOUNDARY_INVALID", "Windows QA package boundary is incomplete.", { ...context, field }) && valid;
  for (const [field, expected] of [
    ["real_employee_write", false],
    ["production_runtime_used", false],
    ["aws_write", false],
    ["public_release_claim", false],
    ["production_go_live_claim", false],
    ["authenticode_claim", true],
  ]) valid = checkExact(findings, qa?.boundaries?.[field], expected, "WINDOWS_QA_BOUNDARY_INVALID", "Windows native package QA boundary is invalid.", { ...context, field }) && valid;
  const nativeInspection = inspectWindowsNativeSnapshot({
    snapshot: qa?.sbom?.native_snapshot,
    summary: {
      content_sha256: sbomProperties["law-firm-os:installed-tree-sha256"],
      identity_sha256: sbomProperties["law-firm-os:native-identity-sha256"],
      file_count: Number(sbomProperties["law-firm-os:installed-tree-file-count"]),
      directory_count: Number(sbomProperties["law-firm-os:native-directory-count"]),
      bytes: Number(sbomProperties["law-firm-os:installed-tree-bytes"]),
      fixed_point_sequence: gate.required_native_fixed_point_sequence,
      fixed_point_exact: true,
    },
    gate,
    findings,
    context,
  });
  const uninstallerInspection = inspectWindowsQaUninstaller({ qa, installedTreeEntries, signerCertificateSha1, gate, findings, context });
  return {
    valid: nativeInspection.valid && uninstallerInspection.valid && valid,
    nativeSnapshot: nativeInspection.snapshot,
    uninstaller: uninstallerInspection.evidence,
  };
}

function inspectWindowsHandoffObject({ kind, proof, file, kmsKeyArn, retainUntil, findings, context }) {
  const objectContext = { ...context, artifact: kind };
  let valid = proof && typeof proof === "object" && !Array.isArray(proof);
  for (const [actual, expectedValue, code, message] of [
    [proof?.sha256, file.sha256, "WINDOWS_HANDOFF_ARTIFACT_DIGEST_MISMATCH", "Windows handoff artifact digest differs from the exact local bytes."],
    [proof?.bytes, file.bytes, "WINDOWS_HANDOFF_ARTIFACT_BYTES_MISMATCH", "Windows handoff artifact byte count differs from the exact local bytes."],
    [proof?.upload?.status, "PASS", "WINDOWS_HANDOFF_UPLOAD_INVALID", "Windows private handoff upload did not PASS."],
    [proof?.upload?.artifact_sha256, file.sha256, "WINDOWS_HANDOFF_UPLOAD_DIGEST_MISMATCH", "Windows private handoff upload digest differs from the exact artifact."],
    [proof?.upload?.bytes, file.bytes, "WINDOWS_HANDOFF_UPLOAD_BYTES_MISMATCH", "Windows private handoff upload byte count differs from the exact artifact."],
    [proof?.upload?.digest_verified, true, "WINDOWS_HANDOFF_DIGEST_NOT_VERIFIED", "Windows private handoff did not verify the uploaded digest."],
    [proof?.head_readback?.status, "PASS", "WINDOWS_HANDOFF_HEAD_READBACK_INVALID", "Windows private handoff HEAD readback did not PASS."],
    [proof?.head_readback?.version_id, proof?.version_id, "WINDOWS_HANDOFF_VERSION_ID_MISMATCH", "Windows private handoff HEAD readback VersionId differs from the uploaded object."],
    [proof?.head_readback?.content_length, file.bytes, "WINDOWS_HANDOFF_CONTENT_LENGTH_MISMATCH", "Windows private handoff HEAD content length differs from the exact artifact."],
    [proof?.head_readback?.artifact_sha256_metadata, file.sha256, "WINDOWS_HANDOFF_HEAD_DIGEST_MISMATCH", "Windows private handoff HEAD metadata digest differs from the exact artifact."],
    [proof?.head_readback?.server_side_encryption, "aws:kms", "WINDOWS_HANDOFF_HEAD_ENCRYPTION_INVALID", "Windows private handoff HEAD readback did not prove SSE-KMS."],
    [proof?.head_readback?.kms_key_arn, kmsKeyArn, "WINDOWS_HANDOFF_KMS_KEY_MISMATCH", "Windows private handoff HEAD readback KMS key differs from governance."],
    [proof?.get_readback?.status, "PASS", "WINDOWS_HANDOFF_GET_READBACK_INVALID", "Windows private handoff exact-VersionId GET readback did not PASS."],
    [proof?.get_readback?.version_id, proof?.version_id, "WINDOWS_HANDOFF_GET_VERSION_ID_MISMATCH", "Windows private handoff GET readback used a different VersionId."],
    [proof?.get_readback?.content_length, file.bytes, "WINDOWS_HANDOFF_GET_BYTES_MISMATCH", "Windows private handoff GET byte count differs from the exact artifact."],
    [proof?.get_readback?.sha256, file.sha256, "WINDOWS_HANDOFF_GET_DIGEST_MISMATCH", "Windows private handoff GET bytes differ from the exact artifact digest."],
    [proof?.get_readback?.digest_verified, true, "WINDOWS_HANDOFF_GET_DIGEST_UNVERIFIED", "Windows private handoff GET digest was not verified."],
    [proof?.get_readback?.server_side_encryption, "aws:kms", "WINDOWS_HANDOFF_GET_ENCRYPTION_INVALID", "Windows private handoff GET readback did not prove SSE-KMS."],
    [proof?.get_readback?.kms_key_arn, kmsKeyArn, "WINDOWS_HANDOFF_GET_KMS_KEY_MISMATCH", "Windows private handoff GET readback KMS key differs from governance."],
  ]) valid = checkExact(findings, actual, expectedValue, code, message, objectContext) && valid;
  for (const [label, readback] of [["HEAD", proof?.head_readback], ["GET", proof?.get_readback]]) {
    for (const [actual, expected, code] of [
      [readback?.provider_checksum_sha256, proof?.upload?.provider_checksum_sha256, "WINDOWS_HANDOFF_PROVIDER_CHECKSUM_MISMATCH"],
      [readback?.object_lock_mode, "COMPLIANCE", "WINDOWS_HANDOFF_READBACK_LOCK_INVALID"],
      [readback?.retain_until, retainUntil, "WINDOWS_HANDOFF_READBACK_RETENTION_MISMATCH"],
    ]) valid = checkExact(findings, actual, expected, code, `Windows private handoff ${label} readback does not match upload retention/checksum evidence.`, objectContext) && valid;
  }
  if (!nonPlaceholder(proof?.key)
      || !asText(proof.key).includes(`/sha256/${file.sha256}/`)
      || !nonPlaceholder(proof?.version_id)) {
    addFinding(findings, "P0", "WINDOWS_HANDOFF_STORAGE_REFERENCE_INVALID", "Windows private handoff artifact must use a digest-addressed key and exact VersionId.", objectContext);
    valid = false;
  }
  if (!validProviderSha256(proof?.upload?.provider_checksum_sha256)) {
    addFinding(findings, "P0", "WINDOWS_HANDOFF_PROVIDER_CHECKSUM_INVALID", "Windows private handoff upload must include a valid base64 SHA-256 provider checksum.", objectContext);
    valid = false;
  }
  if (!Buffer.isBuffer(file?.snapshot)) {
    addFinding(findings, "P0", "WINDOWS_HANDOFF_LOCAL_ARTIFACT_BYTES_UNAVAILABLE", "Windows private handoff checksum verification requires the exact verified local artifact bytes.", objectContext);
    valid = false;
  } else {
    const expectedProviderChecksum = Buffer.from(sha256(file.snapshot), "hex").toString("base64");
    valid = checkExact(findings, proof?.upload?.provider_checksum_sha256, expectedProviderChecksum, "WINDOWS_HANDOFF_PROVIDER_CHECKSUM_CONTENT_MISMATCH", "Windows private handoff provider checksum is not SHA-256 of the exact artifact bytes.", objectContext) && valid;
  }
  return valid;
}

function inspectWindowsHandoff({ parsed, candidate, installerFile, buildManifestFile, sbomFile, qaFile, evidenceIssuedAt, gate, findings, context }) {
  const handoff = parsed.value;
  let valid = parsed.state === "verified_bytes" && handoff && typeof handoff === "object" && !Array.isArray(handoff);
  for (const [actual, expectedValue, code, message] of [
    [handoff?.schema_version, gate.private_handoff_schema_version, "WINDOWS_HANDOFF_SCHEMA_INVALID", "Windows private handoff receipt schema is invalid."],
    [validUtc(handoff?.generated_at), true, "WINDOWS_HANDOFF_TIMESTAMP_INVALID", "Windows private handoff receipt generated_at must be a canonical UTC timestamp."],
    [handoff?.verdict, "PASS", "WINDOWS_HANDOFF_VERDICT_INVALID", "Windows private handoff upload did not PASS."],
    [handoff?.candidate_role, candidate.role, "WINDOWS_HANDOFF_ROLE_MISMATCH", "Windows private handoff candidate role differs from the outer receipt."],
    [handoff?.source_sha, candidate.source_sha, "WINDOWS_HANDOFF_SOURCE_SHA_MISMATCH", "Windows private handoff source SHA differs from its candidate."],
    [handoff?.source_tree, candidate.source_tree, "WINDOWS_HANDOFF_SOURCE_TREE_MISMATCH", "Windows private handoff source tree differs from its candidate."],
    [handoff?.version, candidate.version, "WINDOWS_HANDOFF_VERSION_MISMATCH", "Windows private handoff version differs from its candidate."],
    [handoff?.installer_sha256, candidate.artifact_sha256, "WINDOWS_HANDOFF_INSTALLER_SHA256_MISMATCH", "Windows private handoff installer digest differs from its candidate."],
    [handoff?.installer_bytes, candidate.artifact_bytes, "WINDOWS_HANDOFF_INSTALLER_BYTES_MISMATCH", "Windows private handoff installer byte count differs from its candidate."],
    [handoff?.build_manifest_sha256, buildManifestFile.sha256, "WINDOWS_HANDOFF_BUILD_MANIFEST_SHA256_MISMATCH", "Windows private handoff is not bound to the exact build manifest bytes."],
    [handoff?.installed_tree_sbom_sha256, sbomFile.sha256, "WINDOWS_HANDOFF_SBOM_SHA256_MISMATCH", "Windows private handoff is not bound to the exact SBOM bytes."],
    [handoff?.native_package_qa_sha256, qaFile.sha256, "WINDOWS_HANDOFF_QA_SHA256_MISMATCH", "Windows private handoff is not bound to the exact native QA receipt bytes."],
    [handoff?.storage?.provider, "aws_s3", "WINDOWS_HANDOFF_STORAGE_INVALID", "Windows private handoff must use private AWS S3 storage."],
    [handoff?.storage?.account_id, "770880870480", "WINDOWS_HANDOFF_AWS_ACCOUNT_INVALID", "Windows private handoff uses the wrong AWS account."],
    [handoff?.storage?.region, "ap-northeast-2", "WINDOWS_HANDOFF_AWS_REGION_INVALID", "Windows private handoff uses the wrong AWS region."],
    [handoff?.storage?.versioning_enabled, true, "WINDOWS_HANDOFF_VERSIONING_DISABLED", "Windows private handoff bucket versioning must be enabled."],
    [handoff?.storage?.ownership, "BucketOwnerEnforced", "WINDOWS_HANDOFF_OWNERSHIP_INVALID", "Windows private handoff must use bucket-owner-enforced object ownership."],
    [handoff?.storage?.encryption?.mode, "aws:kms", "WINDOWS_HANDOFF_ENCRYPTION_INVALID", "Windows private handoff must use SSE-KMS."],
    [handoff?.claim_policy?.private_distribution, true, "WINDOWS_HANDOFF_PRIVACY_INVALID", "Windows signed installer handoff is not private."],
    [handoff?.claim_policy?.public_distribution, false, "WINDOWS_HANDOFF_PUBLIC_CLAIM_INVALID", "Windows private handoff claims public distribution."],
    [handoff?.claim_policy?.external_distribution, false, "WINDOWS_HANDOFF_EXTERNAL_CLAIM_INVALID", "Windows private handoff claims external distribution."],
    [handoff?.claim_policy?.production_go_live, false, "WINDOWS_HANDOFF_GO_LIVE_CLAIM_INVALID", "Windows private handoff claims production go-live."],
  ]) valid = checkExact(findings, actual, expectedValue, code, message, context) && valid;
  for (const [field, value] of [["bucket", handoff?.storage?.bucket], ["key", handoff?.storage?.key], ["version_id", handoff?.storage?.version_id]]) {
    if (!nonPlaceholder(value)) {
      addFinding(findings, "P0", "WINDOWS_HANDOFF_STORAGE_REFERENCE_INVALID", "Windows private handoff storage reference is missing or placeholder text.", { ...context, field });
      valid = false;
    }
  }
  const kmsKeyArn = asText(handoff?.storage?.encryption?.kms_key_arn);
  if (!KMS_KEY_ARN_PATTERN.test(kmsKeyArn)
      || !kmsKeyArn.startsWith("arn:aws:kms:ap-northeast-2:770880870480:key/")) {
    addFinding(findings, "P0", "WINDOWS_HANDOFF_KMS_KEY_INVALID", "Windows private handoff must identify an exact AWS KMS key ARN.", context);
    valid = false;
  }
  const retentionUntil = handoff?.storage?.immutability?.retain_until;
  const unexpiredRetention = validUtc(retentionUntil) && Date.parse(retentionUntil) > Date.now();
  if (handoff?.storage?.immutability?.object_lock_mode !== "COMPLIANCE" || !unexpiredRetention) {
    addFinding(findings, "P0", "WINDOWS_HANDOFF_IMMUTABILITY_INVALID", "Windows private handoff must prove Object Lock COMPLIANCE with an explicit unexpired canonical retention timestamp.", context);
    valid = false;
  }
  const minimumRetentionMs = Number(gate.private_handoff_minimum_retention_days) * 24 * 60 * 60 * 1000;
  const maximumRetentionMs = Number(gate.private_handoff_maximum_retention_days) * 24 * 60 * 60 * 1000;
  const retentionDurationMs = Date.parse(retentionUntil) - Date.parse(handoff?.generated_at ?? "");
  if (!Number.isSafeInteger(gate.private_handoff_minimum_retention_days)
      || gate.private_handoff_minimum_retention_days < 1
      || !validUtc(handoff?.generated_at)
      || !validUtc(retentionUntil)
      || retentionDurationMs < minimumRetentionMs) {
    addFinding(findings, "P0", "WINDOWS_HANDOFF_RETENTION_TOO_SHORT", "Windows private handoff retention must be at least the contracted minimum from receipt generation.", { ...context, minimum_days: gate.private_handoff_minimum_retention_days });
    valid = false;
  }
  if (!Number.isSafeInteger(gate.private_handoff_maximum_retention_days)
      || gate.private_handoff_maximum_retention_days < gate.private_handoff_minimum_retention_days
      || retentionDurationMs > maximumRetentionMs) {
    addFinding(findings, "P0", "WINDOWS_HANDOFF_RETENTION_TOO_LONG", "Windows private handoff retention exceeds the contracted maximum.", { ...context, maximum_days: gate.private_handoff_maximum_retention_days });
    valid = false;
  }
  if (validUtc(handoff?.generated_at) && (Date.parse(handoff.generated_at) > Date.now() || Date.parse(handoff.generated_at) > evidenceIssuedAt)) {
    addFinding(findings, "P0", "WINDOWS_HANDOFF_TIMESTAMP_FUTURE", "Windows private handoff cannot postdate the outer signed evidence receipt or current time.", context);
    valid = false;
  }
  const handoffArtifacts = handoff?.artifacts ?? {};
  const expectedArtifacts = {
    installer: installerFile,
    build_manifest: buildManifestFile,
    native_package_qa: qaFile,
    installed_tree_sbom: sbomFile,
  };
  valid = exactArray(findings, Object.keys(handoffArtifacts), Object.keys(expectedArtifacts), "WINDOWS_HANDOFF_ARTIFACT_SET_INVALID", "Windows private handoff must contain exact immutable proofs for all four artifacts.", context) && valid;
  for (const [kind, file] of Object.entries(expectedArtifacts)) {
    valid = inspectWindowsHandoffObject({ kind, proof: handoffArtifacts[kind], file, kmsKeyArn, retainUntil: retentionUntil, findings, context }) && valid;
  }
  valid = checkExact(findings, handoff?.storage?.key, handoffArtifacts.installer?.key, "WINDOWS_HANDOFF_INSTALLER_STORAGE_MISMATCH", "Top-level Windows handoff storage key must mirror the installer proof.", context) && valid;
  valid = checkExact(findings, handoff?.storage?.version_id, handoffArtifacts.installer?.version_id, "WINDOWS_HANDOFF_INSTALLER_STORAGE_MISMATCH", "Top-level Windows handoff VersionId must mirror the installer proof.", context) && valid;
  for (const field of ["upload", "head_readback", "get_readback"]) {
    valid = checkExact(findings, JSON.stringify(handoff?.storage?.[field]), JSON.stringify(handoffArtifacts.installer?.[field]), "WINDOWS_HANDOFF_INSTALLER_STORAGE_MISMATCH", "Top-level Windows handoff storage proof must mirror the installer proof.", { ...context, field }) && valid;
  }
  return valid;
}

function inspectWindowsCandidate({ rootDir, candidate, role, signerCertificateSha1, evidenceIssuedAt, gate, findings, gateId }) {
  const context = { gate_id: gateId, candidate_role: role };
  let valid = candidate && typeof candidate === "object" && !Array.isArray(candidate);
  valid = requiredFields(candidate, gate.candidate_required_fields, findings, context) && valid;
  valid = checkExact(findings, candidate?.role, role, "WINDOWS_CANDIDATE_ROLE_MISMATCH", "Windows candidate role is invalid.", context) && valid;
  if (!validSourceSha(candidate?.source_sha) || !validSourceSha(candidate?.source_tree) || !validVersion(candidate?.version) || !validSha256(candidate?.artifact_sha256) || !Number.isSafeInteger(candidate?.artifact_bytes) || candidate.artifact_bytes < 1) {
    addFinding(findings, "P0", "WINDOWS_CANDIDATE_IDENTITY_INVALID", "Windows candidate source, version, artifact digest, or byte count is malformed.", context);
    valid = false;
  }
  const refs = candidate?.artifacts ?? {};
  valid = exactArray(findings, Object.keys(refs), gate.candidate_artifact_ref_names, "WINDOWS_CANDIDATE_ARTIFACT_SET_INVALID", "Windows candidate artifact references are incomplete, unexpected, or reordered.", context) && valid;
  for (const name of gate.candidate_artifact_ref_names ?? []) {
    if (!refs[name]) {
      addFinding(findings, "P1", "WINDOWS_CANDIDATE_ARTIFACT_MISSING", "Windows candidate is missing a required artifact reference.", { ...context, artifact: name });
      valid = false;
    }
  }
  const installer = inspectFileRef({ rootDir, ref: refs.installer, label: `${gateId} ${role} signed installer`, findings, details: context });
  const buildManifest = parseJsonRef({ rootDir, ref: refs.build_manifest, label: `${gateId} ${role} build manifest`, findings, details: context });
  const sbom = parseJsonRef({ rootDir, ref: refs.installed_tree_sbom, label: `${gateId} ${role} installed-tree SBOM`, findings, details: context });
  const qa = parseJsonRef({ rootDir, ref: refs.native_package_qa, label: `${gateId} ${role} native package QA`, findings, details: context });
  const handoff = parseJsonRef({ rootDir, ref: refs.private_handoff, label: `${gateId} ${role} private handoff`, findings, details: context });
  const releaseManifest = parseJsonRef({ rootDir, ref: refs.release_manifest, label: `${gateId} ${role} release manifest`, findings, details: context });
  const updateMetadata = parseJsonRef({ rootDir, ref: refs.update_metadata, label: `${gateId} ${role} raw update metadata`, findings, details: context });
  const updateMetadataSignature = inspectFileRef({ rootDir, ref: refs.update_metadata_signature, label: `${gateId} ${role} raw update metadata signature`, findings, details: context });
  valid = [installer, buildManifest, sbom, qa, handoff, releaseManifest, updateMetadata, updateMetadataSignature].every(({ state }) => state === "verified_bytes") && valid;
  valid = checkExact(findings, installer.sha256, candidate?.artifact_sha256, "WINDOWS_INSTALLER_SHA256_MISMATCH", "Windows signed installer bytes differ from the candidate digest.", context) && valid;
  valid = checkExact(findings, installer.bytes, candidate?.artifact_bytes, "WINDOWS_INSTALLER_BYTES_MISMATCH", "Windows signed installer byte count differs from the candidate.", context) && valid;
  valid = checkExact(findings, buildManifest.sha256, candidate?.build_manifest_sha256, "WINDOWS_BUILD_MANIFEST_SHA256_MISMATCH", "Windows build manifest bytes differ from the candidate digest.", context) && valid;
  valid = checkExact(findings, releaseManifest.sha256, candidate?.release_manifest_sha256, "WINDOWS_RELEASE_MANIFEST_SHA256_MISMATCH", "Windows release manifest bytes differ from the candidate digest.", context) && valid;
  valid = checkExact(findings, updateMetadata.sha256, candidate?.update_metadata_sha256, "WINDOWS_UPDATE_METADATA_SHA256_MISMATCH", "Windows raw update metadata bytes differ from the candidate digest.", context) && valid;
  valid = checkExact(findings, updateMetadataSignature.sha256, candidate?.update_metadata_signature_sha256, "WINDOWS_UPDATE_METADATA_SIGNATURE_SHA256_MISMATCH", "Windows raw update metadata signature bytes differ from the candidate digest.", context) && valid;
  valid = requiredFields(releaseManifest.value, ["version", "sourceSha", "sourceTree", "artifactSha256", "artifactBytes"], findings, context) && valid;
  for (const [actual, expected, code, message] of [
    [releaseManifest.value?.version, candidate?.version, "WINDOWS_RELEASE_MANIFEST_VERSION_MISMATCH", "Windows release manifest version differs from its candidate."],
    [releaseManifest.value?.sourceSha, candidate?.source_sha, "WINDOWS_RELEASE_MANIFEST_SOURCE_SHA_MISMATCH", "Windows release manifest source SHA differs from its candidate."],
    [releaseManifest.value?.sourceTree, candidate?.source_tree, "WINDOWS_RELEASE_MANIFEST_SOURCE_TREE_MISMATCH", "Windows release manifest source tree differs from its candidate."],
    [releaseManifest.value?.artifactSha256, candidate?.artifact_sha256, "WINDOWS_RELEASE_MANIFEST_ARTIFACT_SHA256_MISMATCH", "Windows release manifest installer digest differs from its candidate."],
    [releaseManifest.value?.artifactBytes, candidate?.artifact_bytes, "WINDOWS_RELEASE_MANIFEST_ARTIFACT_BYTES_MISMATCH", "Windows release manifest installer byte count differs from its candidate."],
  ]) valid = checkExact(findings, actual, expected, code, message, context) && valid;
  const canonicalReleaseManifestBytes = Buffer.from(`${JSON.stringify(releaseManifest.value, null, 2)}\n`, "utf8");
  if (releaseManifest.state !== "verified_bytes" || !releaseManifest.snapshot.equals(canonicalReleaseManifestBytes)) {
    addFinding(findings, "P0", "WINDOWS_RELEASE_MANIFEST_CANONICAL_BYTES_INVALID", "Windows release manifest must use exact canonical JSON bytes.", context);
    valid = false;
  }
  for (const [actual, expected, code, message] of [
    [buildManifest.value?.schema_version, "law-firm-os.matter-desktop-build-provenance.v1", "WINDOWS_BUILD_MANIFEST_SCHEMA_INVALID", "Windows build manifest schema is invalid."],
    [buildManifest.value?.source_sha, candidate?.source_sha, "WINDOWS_BUILD_MANIFEST_SOURCE_SHA_MISMATCH", "Windows build manifest source SHA differs from its candidate."],
    [buildManifest.value?.source_tree, candidate?.source_tree, "WINDOWS_BUILD_MANIFEST_SOURCE_TREE_MISMATCH", "Windows build manifest source tree differs from its candidate."],
    [buildManifest.value?.version, candidate?.version, "WINDOWS_BUILD_MANIFEST_VERSION_MISMATCH", "Windows build manifest version differs from its candidate."],
    [buildManifest.value?.source_dirty, false, "WINDOWS_BUILD_MANIFEST_DIRTY", "Windows build manifest must record a clean source tree."],
    [buildManifest.value?.channel, "formal", "WINDOWS_BUILD_MANIFEST_CHANNEL_INVALID", "Windows build manifest must use the formal channel."],
    [buildManifest.value?.platform, "win32", "WINDOWS_BUILD_MANIFEST_PLATFORM_INVALID", "Windows build manifest platform must be win32."],
    [buildManifest.value?.arch, "x64", "WINDOWS_BUILD_MANIFEST_ARCH_INVALID", "Windows build manifest architecture must be x64."],
    [buildManifest.value?.app_id, "com.amic.matter.desktop", "WINDOWS_BUILD_MANIFEST_APP_ID_INVALID", "Windows build manifest app identity is invalid."],
    [buildManifest.value?.public_release_claim, false, "WINDOWS_BUILD_MANIFEST_CLAIM_INVALID", "Windows build manifest claims public release."],
    [buildManifest.value?.production_go_live_claim, false, "WINDOWS_BUILD_MANIFEST_CLAIM_INVALID", "Windows build manifest claims production go-live."],
  ]) valid = checkExact(findings, actual, expected, code, message, context) && valid;
  if (!String(refs.installer?.path ?? "").toLowerCase().endsWith(".exe")) {
    addFinding(findings, "P0", "WINDOWS_INSTALLER_KIND_INVALID", "Windows candidate installer must be an EXE.", context);
    valid = false;
  }
  const sbomInspection = inspectWindowsSbom({ parsed: sbom, candidate, signerCertificateSha1, gate, findings, context });
  valid = sbomInspection.valid && valid;
  valid = checkExact(findings, candidate?.runner_installed_executable_sha256, sbomInspection.properties["law-firm-os:installed-executable-sha256"], "WINDOWS_CANDIDATE_RUNNER_EXECUTABLE_MISMATCH", "Windows candidate runner executable digest differs from its installed-tree SBOM.", context) && valid;
  const qaInspection = inspectWindowsQa({ parsed: qa, candidate, sbomFile: sbom, sbomProperties: sbomInspection.properties, installedTreeEntries: sbomInspection.installedTreeEntries, signerCertificateSha1, evidenceIssuedAt, gate, findings, context });
  valid = qaInspection.valid && valid;
  const installedExecutablePath = sbomInspection.properties["law-firm-os:installed-executable-path"];
  const installedExecutableSha256 = sbomInspection.properties["law-firm-os:installed-executable-sha256"];
  const installedExecutableRows = (sbomInspection.installedTreeEntries ?? []).filter((entry) => entry.path === installedExecutablePath);
  const installedTree = {
    schema_version: qaInspection.nativeSnapshot?.schema_version,
    content_sha256: qaInspection.nativeSnapshot?.content_sha256,
    identity_sha256: qaInspection.nativeSnapshot?.identity_sha256,
    file_count: qaInspection.nativeSnapshot?.file_count,
    directory_count: qaInspection.nativeSnapshot?.directory_count,
    bytes: qaInspection.nativeSnapshot?.bytes,
    installed_executable_path: installedExecutablePath,
    installed_executable_sha256: installedExecutableSha256,
    installed_executable_bytes: installedExecutableRows[0]?.bytes,
  };
  if (installedExecutableRows.length !== 1
      || installedExecutableRows[0]?.sha256 !== installedExecutableSha256
      || installedExecutableRows[0]?.bytes < 1
      || asText(installedExecutablePath).toLowerCase() === asText(qaInspection.uninstaller?.installed_tree_path).toLowerCase()) {
    addFinding(findings, "P0", "WINDOWS_CANDIDATE_INSTALLED_TREE_INVALID", "Windows candidate must derive its main executable path, digest, and positive byte count from one unique installed-tree SBOM row distinct from the uninstaller.", context);
    valid = false;
  }
  valid = inspectWindowsInstalledTreeSummary({
    value: installedTree,
    gate,
    findings,
    context,
    code: "WINDOWS_CANDIDATE_INSTALLED_TREE_INVALID",
    message: "Windows candidate installed-tree summary is not exactly derived from the native QA and installed-tree SBOM.",
  }) && valid;
  valid = inspectWindowsHandoff({ parsed: handoff, candidate, installerFile: installer, buildManifestFile: buildManifest, sbomFile: sbom, qaFile: qa, evidenceIssuedAt, gate, findings, context }) && valid;
  return {
    valid,
    candidate,
    installedExecutableSha256: sbomInspection.properties["law-firm-os:installed-executable-sha256"],
    installedTreeEntries: sbomInspection.installedTreeEntries,
    installedTree,
    nativeSnapshot: qaInspection.nativeSnapshot,
    uninstaller: qaInspection.uninstaller,
    files: {
      [`${role}_installer`]: installer,
      [`${role}_build_manifest`]: buildManifest,
      [`${role}_installed_tree_sbom`]: sbom,
      [`${role}_native_package_qa`]: qa,
      [`${role}_private_handoff`]: handoff,
      [`${role}_release_manifest`]: releaseManifest,
      [`${role}_update_metadata`]: updateMetadata,
      [`${role}_update_metadata_signature`]: updateMetadataSignature,
    },
    releaseManifest,
    updateMetadata,
    updateMetadataSignature,
  };
}

function inspectWindowsExecutionInput({ parsed, consumer, gate, findings, context }) {
  const input = parsed.value;
  let valid = parsed.state === "verified_bytes" && input && typeof input === "object" && !Array.isArray(input);
  valid = exactArray(findings, Object.keys(input ?? {}).sort(), ["automatic_update", "baseline", "execution_mode", "schema_version", "target"], "WINDOWS_UPDATE_EXECUTION_INPUT_FIELDS_INVALID", "Windows update execution input fields are incomplete or unexpected.", context) && valid;
  for (const [actual, expected, code, message] of [
    [input?.schema_version, gate.update_execution_input_schema_version, "WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA_INVALID", "Windows update execution input schema is invalid."],
    [input?.execution_mode, gate.update_execution_mode, "WINDOWS_UPDATE_EXECUTION_MODE_INVALID", "Windows update execution mode is invalid."],
    [input?.automatic_update, false, "WINDOWS_UPDATE_EXECUTION_AUTOMATIC_FORBIDDEN", "Windows update execution input cannot enable automatic updates."],
  ]) valid = checkExact(findings, actual, expected, code, message, context) && valid;
  for (const role of ["baseline", "target"]) {
    const locator = input?.[role];
    valid = exactArray(findings, Object.keys(locator ?? {}).sort(), ["installer_path", "metadata_path", "signature_path"], "WINDOWS_UPDATE_EXECUTION_LOCATOR_FIELDS_INVALID", "Windows update execution candidate locator fields are incomplete or unexpected.", { ...context, candidate_role: role }) && valid;
    const materialized = consumer?.candidates?.[role]?.materialized;
    for (const [field, kind] of [["installer_path", "installer"], ["metadata_path", "update_metadata"], ["signature_path", "update_metadata_signature"]]) {
      if (!validSafeRelativePath(locator?.[field])) {
        addFinding(findings, "P0", "WINDOWS_UPDATE_EXECUTION_PATH_INVALID", "Windows update execution input contains an unsafe candidate path.", { ...context, candidate_role: role, field, actual: locator?.[field] });
        valid = false;
      }
      valid = checkExact(findings, locator?.[field], materialized?.[kind]?.relative_path, "WINDOWS_UPDATE_EXECUTION_PATH_MISMATCH", "Windows update execution input path differs from the exact materialized private-consumer artifact.", { ...context, candidate_role: role, field }) && valid;
    }
  }
  const canonicalBytes = Buffer.from(`${JSON.stringify(input, null, 2)}\n`, "utf8");
  if (parsed.state !== "verified_bytes" || !parsed.snapshot.equals(canonicalBytes)) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_EXECUTION_INPUT_CANONICAL_BYTES_INVALID", "Windows update execution input must use exact canonical JSON bytes.", context);
    valid = false;
  }
  return valid;
}

function inspectWindowsPrivateConsumerLocator({ consumer, scope, runnerSource, gate, findings, context }) {
  const locatorSource = consumer?.locator_source;
  const producer = locatorSource?.producer;
  const artifact = locatorSource?.artifact;
  const verification = locatorSource?.verification;
  const preflightCleanup = locatorSource?.preflight_cleanup;
  const decryption = consumer?.locator_decryption;
  const reader = consumer?.reader;
  let valid = true;
  for (const [value, expectedFields, code, message] of [
    [locatorSource, gate.private_consumer_locator_source_fields, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_SOURCE_FIELDS_INVALID", "Windows private-consumer aggregate locator source fields are incomplete or unexpected."],
    [producer, gate.private_consumer_locator_source_producer_fields, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_PRODUCER_FIELDS_INVALID", "Windows private-consumer aggregate locator producer fields are incomplete or unexpected."],
    [artifact, gate.private_consumer_locator_source_artifact_fields, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_ARTIFACT_FIELDS_INVALID", "Windows private-consumer aggregate locator artifact fields are incomplete or unexpected."],
    [verification, gate.private_consumer_locator_source_verification_fields, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_VERIFICATION_FIELDS_INVALID", "Windows private-consumer aggregate locator verification fields are incomplete or unexpected."],
    [preflightCleanup, gate.private_consumer_locator_source_cleanup_fields, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_CLEANUP_FIELDS_INVALID", "Windows private-consumer aggregate locator preflight cleanup fields are incomplete or unexpected."],
    [decryption, gate.private_consumer_locator_decryption_fields, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_DECRYPTION_FIELDS_INVALID", "Windows private-consumer aggregate locator decryption fields are incomplete or unexpected."],
  ]) valid = exactArray(findings, Object.keys(value ?? {}).sort(), [...(expectedFields ?? [])].sort(), code, message, context) && valid;

  const artifactRef = {
    schema_version: gate.private_consumer_locator_artifact_ref_schema_version,
    producer_repository: producer?.repository,
    producer_workflow_ref: producer?.workflow_ref,
    producer_job: producer?.job,
    producer_run_id: producer?.run_id,
    producer_run_attempt: producer?.run_attempt,
    source_sha: producer?.source_sha,
    source_tree: producer?.source_tree,
    artifact_name: artifact?.name,
    artifact_id: artifact?.id,
    artifact_digest: artifact?.digest,
    envelope_sha256: artifact?.envelope_sha256,
    private_locator_sha256: artifact?.private_locator_sha256,
    wrapping_public_key_sha256: artifact?.wrapping_public_key_sha256,
  };
  const artifactRefSha256 = sha256(Buffer.from(canonicalJson(artifactRef), "utf8"));
  const runBindingSha256 = sha256(Buffer.from(`${gate.private_consumer_locator_repository}:${producer?.run_id}:${producer?.run_attempt}:${producer?.source_sha}:${producer?.source_tree}`, "utf8"));
  for (const [actual, expected, field] of [
    [producer?.repository, gate.private_consumer_locator_repository, "producer.repository"],
    [producer?.workflow_ref, gate.private_consumer_locator_workflow_ref, "producer.workflow_ref"],
    [producer?.job, gate.private_consumer_locator_job, "producer.job"],
    [producer?.source_sha, runnerSource?.source_sha, "producer.source_sha"],
    [producer?.source_tree, runnerSource?.source_tree, "producer.source_tree"],
    [artifact?.name, `windows-formal-update-private-locator-${producer?.run_id}-${producer?.run_attempt}`, "artifact.name"],
    [artifact?.private_locator_sha256, consumer?.locator_sha256, "artifact.private_locator_sha256"],
    [locatorSource?.artifact_ref_sha256, artifactRefSha256, "artifact_ref_sha256"],
    [consumer?.run_binding_sha256, runBindingSha256, "run_binding_sha256"],
    [scope?.locator_source_artifact_ref_sha256, locatorSource?.artifact_ref_sha256, "scope.artifact_ref_sha256"],
    [scope?.locator_source_run_id, producer?.run_id, "scope.run_id"],
    [scope?.locator_source_run_attempt, producer?.run_attempt, "scope.run_attempt"],
    [scope?.locator_source_artifact_name, artifact?.name, "scope.artifact_name"],
    [scope?.locator_source_artifact_id, artifact?.id, "scope.artifact_id"],
    [scope?.locator_source_artifact_digest, artifact?.digest, "scope.artifact_digest"],
    [scope?.locator_source_envelope_sha256, artifact?.envelope_sha256, "scope.envelope_sha256"],
    [scope?.locator_source_wrapping_public_key_sha256, artifact?.wrapping_public_key_sha256, "scope.wrapping_public_key_sha256"],
    [scope?.locator_unwrap_kms_key_arn, decryption?.wrapping_key_arn, "scope.locator_unwrap_kms_key_arn"],
    [decryption?.wrapping_key_arn, reader?.locator_unwrap_kms_key_arn, "reader.locator_unwrap_kms_key_arn"],
    [decryption?.key_wrap_algorithm, gate.private_consumer_locator_key_wrap_algorithm, "key_wrap_algorithm"],
    [decryption?.content_encryption_algorithm, gate.private_consumer_locator_content_encryption_algorithm, "content_encryption_algorithm"],
  ]) valid = checkExact(findings, actual, expected, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_BINDING_INVALID", "Windows private-consumer aggregate locator source/decryption evidence is not bound to the exact signed workflow artifact.", { ...context, field }) && valid;
  if (!/^[1-9][0-9]{0,19}$/u.test(asText(producer?.run_id))
      || !/^[1-9][0-9]{0,9}$/u.test(asText(producer?.run_attempt))
      || !/^[1-9][0-9]*$/u.test(asText(artifact?.id))
      || !/^sha256:[0-9a-f]{64}$/u.test(asText(artifact?.digest))
      || ![locatorSource?.artifact_ref_sha256, artifact?.envelope_sha256, artifact?.private_locator_sha256, artifact?.wrapping_public_key_sha256].every(validSha256)) {
    addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_LOCATOR_IDENTITY_INVALID", "Windows private-consumer aggregate locator run/artifact identity or digest is malformed.", context);
    valid = false;
  }
  if (verification?.token_permission !== "actions:read"
      || (gate.private_consumer_locator_source_verification_fields ?? []).some((field) => field !== "token_permission" && verification?.[field] !== true)) {
    addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_LOCATOR_VERIFICATION_INVALID", "Windows private-consumer did not verify the exact protected aggregate locator artifact and ciphertext.", context);
    valid = false;
  }
  if ((gate.private_consumer_locator_source_cleanup_fields ?? []).some((field) => preflightCleanup?.[field] !== true)) {
    addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_LOCATOR_PREFLIGHT_CLEANUP_INVALID", "Windows private-consumer aggregate locator preflight did not clear its token, credentials, and source root.", context);
    valid = false;
  }
  for (const field of ["envelope_aad_verified", "ciphertext_sha256_verified", "kms_key_id_verified", "aes_gcm_authenticated", "private_locator_sha256_verified", "private_locator_bytes_verified"]) {
    valid = checkExact(findings, decryption?.[field], true, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_DECRYPTION_INVALID", "Windows private-consumer aggregate locator decryption proof is incomplete.", { ...context, field }) && valid;
  }
  valid = checkExact(findings, decryption?.plaintext_persisted, false, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_PLAINTEXT_PERSISTED", "Windows private-consumer persisted decrypted private locator plaintext.", context) && valid;
  if (!/^arn:aws:kms:ap-northeast-2:770880870480:key\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(asText(decryption?.wrapping_key_arn))) {
    addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_LOCATOR_KMS_KEY_INVALID", "Windows private-consumer aggregate locator must use the exact-account ap-northeast-2 KMS unwrap key.", context);
    valid = false;
  }
  return valid;
}

function inspectWindowsPrivateConsumer({ parsed, scope, runnerFile, runnerSource, executionInputFile, approvalFile, approvalSignatureFile, baselineInspection, targetInspection, evidenceIssuedAt, gate, findings, context }) {
  const consumer = parsed.value;
  let valid = parsed.state === "verified_bytes" && consumer && typeof consumer === "object" && !Array.isArray(consumer);
  valid = exactArray(findings, Object.keys(scope ?? {}).sort(), [...(gate.private_consumer_scope_required_fields ?? [])].sort(), "WINDOWS_PRIVATE_CONSUMER_SCOPE_FIELDS_INVALID", "The signed Windows private-consumer scope is incomplete or unexpected.", context) && valid;
  valid = requiredFields(scope, gate.private_consumer_scope_required_fields, findings, context) && valid;
  valid = exactArray(findings, Object.keys(consumer ?? {}), gate.private_consumer_top_level_fields, "WINDOWS_PRIVATE_CONSUMER_FIELDS_INVALID", "Windows private-consumer receipt fields are incomplete, unexpected, or reordered.", context) && valid;
  const canonicalBytes = Buffer.from(`${JSON.stringify(consumer, null, 2)}\n`, "utf8");
  if (parsed.state !== "verified_bytes" || !parsed.snapshot.equals(canonicalBytes)) {
    addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_CANONICAL_BYTES_INVALID", "Windows private-consumer receipt must use exact canonical JSON bytes.", context);
    valid = false;
  }
  for (const [actual, expected, code, message] of [
    [consumer?.schema_version, gate.private_consumer_schema_version, "WINDOWS_PRIVATE_CONSUMER_SCHEMA_INVALID", "Windows private-consumer receipt schema is invalid."],
    [validUtc(consumer?.generated_at), true, "WINDOWS_PRIVATE_CONSUMER_TIMESTAMP_INVALID", "Windows private-consumer receipt generated_at must be a canonical UTC timestamp."],
    [consumer?.verdict, "PASS", "WINDOWS_PRIVATE_CONSUMER_VERDICT_INVALID", "Windows private-consumer receipt did not PASS."],
    [consumer?.state, "PASS", "WINDOWS_PRIVATE_CONSUMER_STATE_INVALID", "Windows private-consumer final state did not PASS."],
    [scope?.receipt_sha256, parsed.sha256, "WINDOWS_PRIVATE_CONSUMER_SCOPE_MISMATCH", "The signed outer receipt does not bind the exact private-consumer receipt bytes."],
    [scope?.locator_sha256, consumer?.locator_sha256, "WINDOWS_PRIVATE_CONSUMER_SCOPE_MISMATCH", "The signed outer receipt private locator digest differs from the consumer."],
    [scope?.expanded_locator_sha256, consumer?.expanded_locator_sha256, "WINDOWS_PRIVATE_CONSUMER_SCOPE_MISMATCH", "The signed outer receipt expanded-locator digest differs from the consumer."],
    [scope?.run_binding_sha256, consumer?.run_binding_sha256, "WINDOWS_PRIVATE_CONSUMER_SCOPE_MISMATCH", "The signed outer receipt workflow-run binding differs from the consumer."],
    [scope?.reader_role_arn, consumer?.reader?.role_arn, "WINDOWS_PRIVATE_CONSUMER_SCOPE_MISMATCH", "The signed outer receipt reader role differs from the consumer."],
    [scope?.bridge_envelope_sha256, consumer?.bridge?.envelope_sha256, "WINDOWS_PRIVATE_CONSUMER_SCOPE_MISMATCH", "The signed outer receipt bridge digest differs from the consumer."],
    [consumer?.runner_receipt_sha256, runnerFile.sha256, "WINDOWS_PRIVATE_CONSUMER_RUNNER_MISMATCH", "Windows private-consumer receipt is not bound to the exact operator runner receipt bytes."],
  ]) valid = checkExact(findings, actual, expected, code, message, context) && valid;
  for (const field of ["receipt_sha256", "locator_sha256", "expanded_locator_sha256", "run_binding_sha256", "locator_source_artifact_ref_sha256", "locator_source_envelope_sha256", "locator_source_wrapping_public_key_sha256", "bridge_envelope_sha256"]) {
    if (!validSha256(scope?.[field])) {
      addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_SCOPE_DIGEST_INVALID", "The signed Windows private-consumer scope contains a malformed digest.", { ...context, field });
      valid = false;
    }
  }
  if (validUtc(consumer?.generated_at) && (Date.parse(consumer.generated_at) > Date.now() || Date.parse(consumer.generated_at) > evidenceIssuedAt)) {
    addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_TIMESTAMP_FUTURE", "Windows private-consumer receipt cannot postdate the outer signed receipt or current time.", context);
    valid = false;
  }
  if (consumer?.locator_sha256 === consumer?.expanded_locator_sha256
      || ![consumer?.locator_sha256, consumer?.expanded_locator_sha256, consumer?.run_binding_sha256, consumer?.bridge?.envelope_sha256, consumer?.runner_receipt_sha256].every(validSha256)) {
    addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_DIGEST_INVALID", "Windows private-consumer receipt must contain distinct valid locator and exact run, bridge, and runner digests.", context);
    valid = false;
  }

  valid = exactArray(findings, Object.keys(consumer?.reader ?? {}), gate.private_consumer_reader_fields, "WINDOWS_PRIVATE_CONSUMER_READER_FIELDS_INVALID", "Windows private-consumer reader fields are incomplete, unexpected, or reordered.", context) && valid;
  for (const [actual, expected, code, message] of [
    [consumer?.reader?.isolated_oidc_job, true, "WINDOWS_PRIVATE_CONSUMER_READER_INVALID", "Windows private-consumer retrieval did not run in the isolated OIDC reader job."],
    [consumer?.reader?.aws_account_id, "770880870480", "WINDOWS_PRIVATE_CONSUMER_READER_INVALID", "Windows private-consumer reader used the wrong AWS account."],
    [consumer?.reader?.aws_region, "ap-northeast-2", "WINDOWS_PRIVATE_CONSUMER_READER_INVALID", "Windows private-consumer reader used the wrong AWS region."],
  ]) valid = checkExact(findings, actual, expected, code, message, context) && valid;
  if (!/^arn:aws:iam::770880870480:role\/[A-Za-z0-9+=,.@_/-]{1,512}$/u.test(asText(consumer?.reader?.role_arn))) {
    addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_READER_ROLE_INVALID", "Windows private-consumer receipt must identify the exact reviewed reader role ARN.", context);
    valid = false;
  }
  valid = inspectWindowsPrivateConsumerLocator({ consumer, scope, runnerSource, gate, findings, context }) && valid;

  const materializedKinds = gate.private_consumer_materialized_ref_names ?? [];
  valid = exactArray(findings, Object.keys(consumer?.candidates ?? {}), gate.candidate_roles, "WINDOWS_PRIVATE_CONSUMER_CANDIDATE_SET_INVALID", "Windows private-consumer receipt must contain exactly baseline and target.", context) && valid;
  for (const role of gate.candidate_roles ?? []) {
    const outerCandidate = role === "baseline" ? baselineInspection : targetInspection;
    const candidate = consumer?.candidates?.[role];
    const candidateContext = { ...context, candidate_role: role };
    valid = exactArray(findings, Object.keys(candidate ?? {}).sort(), [...(gate.private_consumer_candidate_fields ?? [])].sort(), "WINDOWS_PRIVATE_CONSUMER_CANDIDATE_FIELDS_INVALID", "Windows private-consumer candidate fields are incomplete or unexpected.", candidateContext) && valid;
    const signedCandidate = outerCandidate?.candidate;
    for (const [actual, expected, field] of [
      [candidate?.source_sha, signedCandidate?.source_sha, "source_sha"],
      [candidate?.source_tree, signedCandidate?.source_tree, "source_tree"],
      [candidate?.version, signedCandidate?.version, "version"],
      [candidate?.installer_sha256, signedCandidate?.artifact_sha256, "installer_sha256"],
      [candidate?.installer_bytes, signedCandidate?.artifact_bytes, "installer_bytes"],
      [candidate?.build_manifest_sha256, signedCandidate?.build_manifest_sha256, "build_manifest_sha256"],
      [candidate?.release_manifest_sha256, signedCandidate?.release_manifest_sha256, "release_manifest_sha256"],
      [candidate?.update_metadata_sha256, signedCandidate?.update_metadata_sha256, "update_metadata_sha256"],
      [candidate?.update_metadata_signature_sha256, signedCandidate?.update_metadata_signature_sha256, "update_metadata_signature_sha256"],
    ]) valid = checkExact(findings, actual, expected, "WINDOWS_PRIVATE_CONSUMER_CANDIDATE_MISMATCH", "Windows private-consumer candidate differs from the exact signed candidate.", { ...candidateContext, field }) && valid;
    const consumerNativeInspection = inspectWindowsNativeSnapshot({
      snapshot: candidate?.native_snapshot,
      summary: outerCandidate?.nativeSnapshot ? {
        content_sha256: outerCandidate.nativeSnapshot.content_sha256,
        identity_sha256: outerCandidate.nativeSnapshot.identity_sha256,
        file_count: outerCandidate.nativeSnapshot.file_count,
        directory_count: outerCandidate.nativeSnapshot.directory_count,
        bytes: outerCandidate.nativeSnapshot.bytes,
        fixed_point_sequence: outerCandidate.nativeSnapshot.fixed_point_sequence,
        fixed_point_exact: outerCandidate.nativeSnapshot.fixed_point_exact,
      } : {},
      gate,
      findings,
      context: candidateContext,
      code: "WINDOWS_PRIVATE_CONSUMER_NATIVE_SNAPSHOT_INVALID",
    });
    valid = consumerNativeInspection.valid && valid;
    valid = inspectWindowsInstalledTreeSummary({
      value: candidate?.installed_tree,
      expected: outerCandidate?.installedTree,
      includeIdentity: true,
      gate,
      findings,
      context: candidateContext,
      code: "WINDOWS_PRIVATE_CONSUMER_INSTALLED_TREE_MISMATCH",
      message: "Windows private-consumer installed-tree summary differs from the exact native QA and unique installed-executable SBOM row.",
    }) && valid;
    valid = exactArray(findings, Object.keys(candidate?.uninstaller ?? {}).sort(), [...(gate.private_consumer_uninstaller_fields ?? [])].sort(), "WINDOWS_PRIVATE_CONSUMER_UNINSTALLER_FIELDS_INVALID", "Windows private-consumer locked-uninstaller fields are incomplete or unexpected.", candidateContext) && valid;
    for (const field of gate.private_consumer_uninstaller_fields ?? []) {
      valid = checkExact(findings, candidate?.uninstaller?.[field], outerCandidate?.uninstaller?.[field], "WINDOWS_PRIVATE_CONSUMER_UNINSTALLER_MISMATCH", "Windows private-consumer locked-uninstaller evidence differs from the exact immutable native QA bytes.", { ...candidateContext, field }) && valid;
    }
    if (!validSha256(candidate?.uninstaller?.installed_tree_sha256)
        || candidate?.uninstaller?.installed_tree_sha256 !== candidate?.uninstaller?.uninstaller_sha256
        || !Number.isSafeInteger(candidate?.uninstaller?.uninstaller_bytes) || candidate.uninstaller.uninstaller_bytes < 1
        || !validSha256(candidate?.uninstaller?.authenticode_sha256)) {
      addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_UNINSTALLER_INVALID", "Windows private-consumer locked-uninstaller digest, byte count, or Authenticode binding is malformed.", candidateContext);
      valid = false;
    }
    valid = exactArray(findings, Object.keys(candidate?.materialized ?? {}).sort(), [...materializedKinds].sort(), "WINDOWS_PRIVATE_CONSUMER_MATERIALIZED_SET_INVALID", "Windows private-consumer materialized artifact set is incomplete or unexpected.", { ...context, candidate_role: role }) && valid;
    for (const kind of materializedKinds) {
      const ref = candidate?.materialized?.[kind];
      const file = outerCandidate?.files?.[`${role}_${kind}`];
      valid = exactArray(findings, Object.keys(ref ?? {}), gate.private_consumer_materialized_ref_fields, "WINDOWS_PRIVATE_CONSUMER_MATERIALIZED_FIELDS_INVALID", "Windows private-consumer materialized reference fields are incomplete, unexpected, or reordered.", { ...context, candidate_role: role, artifact: kind }) && valid;
      for (const [actual, expected, field] of [[ref?.relative_path, file?.path, "relative_path"], [ref?.sha256, file?.sha256, "sha256"], [ref?.bytes, file?.bytes, "bytes"]]) {
        valid = checkExact(findings, actual, expected, "WINDOWS_PRIVATE_CONSUMER_MATERIALIZED_MISMATCH", "Windows private-consumer materialized artifact differs from the exact readiness artifact bytes.", { ...context, candidate_role: role, artifact: kind, field }) && valid;
      }
      if (!validSafeRelativePath(ref?.relative_path) || !validSha256(ref?.sha256) || !Number.isSafeInteger(ref?.bytes) || ref.bytes < 1) {
        addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_MATERIALIZED_INVALID", "Windows private-consumer materialized artifact reference is malformed.", { ...context, candidate_role: role, artifact: kind });
        valid = false;
      }
    }
    for (const [field, kind] of [["release_manifest_bytes", "release_manifest"], ["update_metadata_bytes", "update_metadata"], ["update_metadata_signature_bytes", "update_metadata_signature"], ["build_manifest_bytes", "build_manifest"]]) {
      valid = checkExact(findings, candidate?.[field], outerCandidate?.files?.[`${role}_${kind}`]?.bytes, "WINDOWS_PRIVATE_CONSUMER_CANDIDATE_BYTES_MISMATCH", "Windows private-consumer candidate byte count differs from the exact artifact.", { ...context, candidate_role: role, field }) && valid;
    }
  }

  const expectedObjectFiles = {
    baseline_private_handoff_receipt: baselineInspection?.files?.baseline_private_handoff,
    baseline_installer: baselineInspection?.files?.baseline_installer,
    baseline_build_manifest: baselineInspection?.files?.baseline_build_manifest,
    baseline_native_package_qa: baselineInspection?.files?.baseline_native_package_qa,
    baseline_installed_tree_sbom: baselineInspection?.files?.baseline_installed_tree_sbom,
    baseline_release_manifest: baselineInspection?.files?.baseline_release_manifest,
    baseline_update_metadata: baselineInspection?.files?.baseline_update_metadata,
    baseline_update_metadata_signature: baselineInspection?.files?.baseline_update_metadata_signature,
    target_private_handoff_receipt: targetInspection?.files?.target_private_handoff,
    target_installer: targetInspection?.files?.target_installer,
    target_build_manifest: targetInspection?.files?.target_build_manifest,
    target_native_package_qa: targetInspection?.files?.target_native_package_qa,
    target_installed_tree_sbom: targetInspection?.files?.target_installed_tree_sbom,
    target_release_manifest: targetInspection?.files?.target_release_manifest,
    target_update_metadata: targetInspection?.files?.target_update_metadata,
    target_update_metadata_signature: targetInspection?.files?.target_update_metadata_signature,
    execution_input: executionInputFile,
    approval_receipt: approvalFile,
    approval_signature: approvalSignatureFile,
  };
  const objects = Array.isArray(consumer?.objects) ? consumer.objects : [];
  valid = exactArray(findings, objects.map((object) => object?.id).sort(), [...(gate.private_consumer_object_ids ?? [])].sort(), "WINDOWS_PRIVATE_CONSUMER_OBJECT_SET_INVALID", "Windows private-consumer receipt must prove the exact 19-object set.", context) && valid;
  for (const object of objects) {
    const file = expectedObjectFiles[object?.id];
    valid = exactArray(findings, Object.keys(object ?? {}), gate.private_consumer_object_fields, "WINDOWS_PRIVATE_CONSUMER_OBJECT_FIELDS_INVALID", "Windows private-consumer object evidence fields are incomplete, unexpected, or reordered.", { ...context, object_id: object?.id }) && valid;
    for (const [actual, expected, field] of [[object?.relative_path, file?.path, "relative_path"], [object?.sha256, file?.sha256, "sha256"], [object?.bytes, file?.bytes, "bytes"]]) {
      valid = checkExact(findings, actual, expected, "WINDOWS_PRIVATE_CONSUMER_OBJECT_MISMATCH", "Windows private-consumer object evidence differs from the exact readiness artifact.", { ...context, object_id: object?.id, field }) && valid;
    }
    for (const field of ["exact_version_head_verified", "exact_version_get_verified", "full_body_sha256_verified", "object_lock_compliance_verified", "retention_verified"]) {
      valid = checkExact(findings, object?.[field], true, "WINDOWS_PRIVATE_CONSUMER_OBJECT_VERIFICATION_INVALID", "Windows private-consumer object did not prove exact-VersionId retrieval, full-body digest, and retention.", { ...context, object_id: object?.id, field }) && valid;
    }
    if (!validSafeRelativePath(object?.relative_path) || !validSha256(object?.sha256) || !Number.isSafeInteger(object?.bytes) || object.bytes < 1) {
      addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_OBJECT_INVALID", "Windows private-consumer object evidence is malformed.", { ...context, object_id: object?.id });
      valid = false;
    }
  }
  const objectPaths = objects.map((object) => asText(object?.relative_path).toLowerCase());
  if (objects.length !== gate.private_consumer_expected_object_count || objectPaths.some((value) => !value) || new Set(objectPaths).size !== objects.length) {
    addFinding(findings, "P0", "WINDOWS_PRIVATE_CONSUMER_OBJECT_COUNT_INVALID", "Windows private-consumer receipt must contain 19 uniquely materialized immutable objects.", { ...context, expected: gate.private_consumer_expected_object_count, actual: objects.length });
    valid = false;
  }

  valid = exactArray(findings, Object.keys(consumer?.retrieval ?? {}), gate.private_consumer_retrieval_fields, "WINDOWS_PRIVATE_CONSUMER_RETRIEVAL_FIELDS_INVALID", "Windows private-consumer retrieval counts are incomplete, unexpected, or reordered.", context) && valid;
  for (const field of gate.private_consumer_retrieval_fields ?? []) valid = checkExact(findings, consumer?.retrieval?.[field], gate.private_consumer_expected_object_count, "WINDOWS_PRIVATE_CONSUMER_RETRIEVAL_INCOMPLETE", "Windows private-consumer did not verify all 19 exact-version objects.", { ...context, field }) && valid;
  valid = exactArray(findings, Object.keys(consumer?.cleanup ?? {}), gate.private_consumer_cleanup_fields, "WINDOWS_PRIVATE_CONSUMER_CLEANUP_FIELDS_INVALID", "Windows private-consumer cleanup fields are incomplete, unexpected, or reordered.", context) && valid;
  for (const field of gate.private_consumer_cleanup_fields ?? []) valid = checkExact(findings, consumer?.cleanup?.[field], true, "WINDOWS_PRIVATE_CONSUMER_CLEANUP_INVALID", "Windows private-consumer did not clear credentials or private roots.", { ...context, field }) && valid;
  valid = exactArray(findings, Object.keys(consumer?.bridge ?? {}), gate.private_consumer_bridge_fields, "WINDOWS_PRIVATE_CONSUMER_BRIDGE_FIELDS_INVALID", "Windows private-consumer bridge fields are incomplete, unexpected, or reordered.", context) && valid;
  valid = checkExact(findings, consumer?.bridge?.object_count, gate.private_consumer_expected_object_count, "WINDOWS_PRIVATE_CONSUMER_BRIDGE_COUNT_INVALID", "Windows private-consumer bridge did not carry all 19 objects.", context) && valid;
  valid = checkExact(findings, consumer?.bridge?.current_run_bound, true, "WINDOWS_PRIVATE_CONSUMER_BRIDGE_BINDING_INVALID", "Windows private-consumer bridge is not bound to the current workflow run.", context) && valid;
  valid = exactArray(findings, Object.keys(consumer?.boundaries ?? {}), gate.private_consumer_boundary_fields, "WINDOWS_PRIVATE_CONSUMER_BOUNDARY_FIELDS_INVALID", "Windows private-consumer boundary fields are incomplete, unexpected, or reordered.", context) && valid;
  for (const [field, expected] of [["provider_call_performed", true], ["exact_s3_locator_recorded", false], ["plaintext_uploaded_to_github", false], ["automatic_update", false], ["public_release_claim", false], ["external_distribution_claim", false], ["production_go_live_claim", false]]) {
    valid = checkExact(findings, consumer?.boundaries?.[field], expected, "WINDOWS_PRIVATE_CONSUMER_BOUNDARY_INVALID", "Windows private-consumer boundary is invalid.", { ...context, field }) && valid;
  }
  valid = inspectWindowsExecutionInput({ parsed: executionInputFile, consumer, gate, findings, context }) && valid;
  return { valid, value: consumer };
}

function inspectWindowsUpdateApproval({ parsed, signatureFile, runner, baseline, target, baselineInspection, targetInspection, consumer, signerCertificateSha1, expected, evidenceIssuedAt, trustRegistry, gate, findings, context }) {
  const approval = parsed.value;
  let valid = parsed.state === "verified_bytes" && signatureFile.state === "verified_bytes" && approval && typeof approval === "object" && !Array.isArray(approval);
  const canonicalApprovalBytes = Buffer.from(`${JSON.stringify(approval, null, 2)}\n`, "utf8");
  if (parsed.state !== "verified_bytes" || !parsed.snapshot.equals(canonicalApprovalBytes)) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_CANONICAL_BYTES_INVALID", "Windows update/rollback approval must use exact canonical JSON bytes.", context);
    valid = false;
  }
  valid = exactArray(findings, Object.keys(approval ?? {}).sort(), [...(gate.update_approval_required_fields ?? [])].sort(), "WINDOWS_UPDATE_APPROVAL_FIELDS_INVALID", "Windows update/rollback approval receipt fields are incomplete or unexpected.", context) && valid;
  for (const [actual, expectedValue, code, message] of [
    [approval?.schema_version, gate.update_approval_schema_version, "WINDOWS_UPDATE_APPROVAL_SCHEMA_INVALID", "Windows update/rollback approval schema is invalid."],
    [approval?.receipt_type, gate.update_approval_receipt_type, "WINDOWS_UPDATE_APPROVAL_TYPE_INVALID", "Windows update/rollback approval receipt type is invalid."],
    [approval?.verdict, "APPROVED", "WINDOWS_UPDATE_APPROVAL_VERDICT_INVALID", "Windows update/rollback approval is not APPROVED."],
    [approval?.app_id, "com.amic.matter.desktop", "WINDOWS_UPDATE_APPROVAL_APP_ID_INVALID", "Windows update/rollback approval app identity is invalid."],
    [approval?.pilot_id, expected.pilotId, "WINDOWS_UPDATE_APPROVAL_SCOPE_MISMATCH", "Windows update/rollback approval pilot differs from the signed readiness scope."],
    [approval?.lawos_tenant_id, expected.lawosTenantId, "WINDOWS_UPDATE_APPROVAL_SCOPE_MISMATCH", "Windows update/rollback approval LawOS tenant differs from the signed readiness scope."],
    [approval?.entra_tenant_id, expected.entraTenantId, "WINDOWS_UPDATE_APPROVAL_SCOPE_MISMATCH", "Windows update/rollback approval Entra tenant differs from the signed readiness scope."],
    [approval?.authenticode_signer_certificate_sha1, signerCertificateSha1, "WINDOWS_UPDATE_APPROVAL_SIGNER_MISMATCH", "Windows update/rollback approval signer differs from the candidates."],
    [parsed.sha256, runner?.approval_bundle_sha256, "WINDOWS_UPDATE_APPROVAL_DIGEST_MISMATCH", "Windows update/rollback runner approval-bundle digest differs from the exact approval bytes."],
    [signatureFile.sha256, runner?.approval_signature_sha256, "WINDOWS_UPDATE_APPROVAL_SIGNATURE_DIGEST_MISMATCH", "Windows update/rollback runner approval-signature digest differs from the exact signature bytes."],
  ]) valid = checkExact(findings, actual, expectedValue, code, message, context) && valid;

  const issuedAt = Date.parse(approval?.issued_at ?? "");
  const expiresAt = Date.parse(approval?.expires_at ?? "");
  if (!validUtc(approval?.issued_at) || !validUtc(approval?.expires_at)
      || !(issuedAt <= evidenceIssuedAt && expiresAt > issuedAt && expiresAt >= Date.parse(runner?.generated_at ?? ""))) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_TIME_INVALID", "Windows update/rollback approval must be canonical, issued before the signed evidence, and active through runner completion.", context);
    valid = false;
  }
  if (!/^[A-Z0-9][A-Z0-9._-]{7,127}$/u.test(asText(approval?.metadata_approval_id)) || !validSha256(approval?.tenant_config_sha256)) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_BINDING_INVALID", "Windows update/rollback approval metadata and tenant-config bindings are invalid.", context);
    valid = false;
  }
  valid = exactArray(findings, Object.keys(approval?.candidates ?? {}).sort(), ["baseline", "target"], "WINDOWS_UPDATE_APPROVAL_CANDIDATE_SET_INVALID", "Windows update/rollback approval must contain exactly baseline and target candidates.", context) && valid;

  for (const [role, candidate] of [["baseline", baseline], ["target", target]]) {
    const approved = approval?.candidates?.[role];
    valid = exactArray(findings, Object.keys(approved ?? {}).sort(), [...(gate.update_approval_candidate_required_fields ?? [])].sort(), "WINDOWS_UPDATE_APPROVAL_CANDIDATE_FIELDS_INVALID", "Windows update/rollback approval candidate fields are incomplete or unexpected.", { ...context, candidate_role: role }) && valid;
    for (const field of ["source_sha", "source_tree", "version", "artifact_sha256", "artifact_bytes"]) {
      valid = checkExact(findings, approved?.[field], candidate[field], "WINDOWS_UPDATE_APPROVAL_CANDIDATE_MISMATCH", "Windows update/rollback approval candidate differs from the signed readiness candidate.", { ...context, candidate_role: role, field }) && valid;
    }
    if (!validSha256(approved?.release_manifest_sha256)) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_MANIFEST_DIGEST_INVALID", "Windows update/rollback approval candidate release-manifest digest is malformed.", { ...context, candidate_role: role });
      valid = false;
    }
  }

  const approvedOperationNames = Object.keys(approval?.authorizations ?? {});
  valid = exactArray(findings, approvedOperationNames.sort(), [...(gate.required_approved_operations ?? [])].sort(), "WINDOWS_UPDATE_APPROVAL_OPERATION_SET_INVALID", "Windows update/rollback approval authorization set is incomplete or unexpected.", context) && valid;
  const approvalIds = [];
  for (const operationName of gate.required_approved_operations ?? []) {
    const authorization = approval?.authorizations?.[operationName];
    valid = exactArray(findings, Object.keys(authorization ?? {}).sort(), [...(gate.update_approval_authorization_required_fields ?? [])].sort(), "WINDOWS_UPDATE_AUTHORIZATION_FIELDS_INVALID", "Windows update authorization fields are incomplete or unexpected.", { ...context, operation: operationName }) && valid;
    approvalIds.push(asText(authorization?.approval_id));
    for (const [actual, expectedValue, code, message] of [
      [authorization?.operation, operationName, "WINDOWS_UPDATE_AUTHORIZATION_OPERATION_MISMATCH", "Windows update authorization operation is invalid."],
      [authorization?.approved, true, "WINDOWS_UPDATE_AUTHORIZATION_NOT_APPROVED", "Windows update authorization is not approved."],
      [validUtc(authorization?.expires_at), true, "WINDOWS_UPDATE_AUTHORIZATION_EXPIRY_INVALID", "Windows update authorization expiry must be canonical UTC."],
    ]) valid = checkExact(findings, actual, expectedValue, code, message, { ...context, operation: operationName }) && valid;
    if (!/^[A-Z0-9][A-Z0-9._-]{7,127}$/u.test(asText(authorization?.approval_id))
        || (validUtc(authorization?.expires_at) && (Date.parse(authorization.expires_at) > expiresAt || Date.parse(authorization.expires_at) <= issuedAt))) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_AUTHORIZATION_INVALID", "Windows update authorization identifier or validity interval is invalid.", { ...context, operation: operationName });
      valid = false;
    }
  }
  if (new Set(approvalIds).size !== approvalIds.length) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_AUTHORIZATION_ID_REUSED", "Every approved Windows mutation must use a distinct approval identifier.", context);
    valid = false;
  }

  const operations = Array.isArray(runner?.operations) ? runner.operations : [];
  for (const [index, operation] of operations.entries()) {
    const authorization = approval?.authorizations?.[operation?.operation];
    for (const [actual, expected, code, message] of [
      [authorization?.operation, operation?.operation, "WINDOWS_UPDATE_AUTHORIZATION_OPERATION_MISMATCH", "Windows update authorization operation is invalid."],
      [authorization?.approved, true, "WINDOWS_UPDATE_AUTHORIZATION_NOT_APPROVED", "Windows update authorization is not approved."],
      [validUtc(authorization?.expires_at), true, "WINDOWS_UPDATE_AUTHORIZATION_EXPIRY_INVALID", "Windows update authorization expiry must be canonical UTC."],
      [sha256(Buffer.from(asText(authorization?.approval_id))), operation?.approval_id_sha256, "WINDOWS_UPDATE_AUTHORIZATION_ID_MISMATCH", "Windows update runner operation is not bound to the exact authorization ID."],
    ]) valid = checkExact(findings, actual, expected, code, message, { ...context, operation: operation?.operation, index }) && valid;
    if ((validUtc(operation?.initiated_at) && Date.parse(operation.initiated_at) < issuedAt)
        || (validUtc(authorization?.expires_at) && Date.parse(authorization.expires_at) <= Date.parse(operation?.initiated_at ?? ""))) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_AUTHORIZATION_TIME_INVALID", "Windows update approval and operation authorization must be active when the operation is initiated.", { ...context, operation: operation?.operation });
      valid = false;
    }
  }

  const updateKey = approval?.update_key;
  valid = exactArray(findings, Object.keys(updateKey ?? {}).sort(), ["key_id", "public_key_spki_sha256"], "WINDOWS_UPDATE_APPROVAL_KEY_FIELDS_INVALID", "Windows update approval key binding fields are incomplete or unexpected.", context) && valid;
  const trustedKey = trustRegistry?.registry?.keys?.find((key) => key.key_id === updateKey?.key_id);
  const scopedValues = [
    ["allowed_receipt_sources", ["windows_operator"]],
    ["allowed_receipt_types", [gate.update_approval_receipt_type]],
    ["allowed_pilot_ids", [expected.pilotId]],
    ["allowed_lawos_tenant_ids", [expected.lawosTenantId]],
    ["allowed_entra_tenant_ids", [expected.entraTenantId]],
    ["allowed_source_shas", [baseline.source_sha, target.source_sha]],
    ["allowed_source_trees", [baseline.source_tree, target.source_tree]],
    ["allowed_versions", [baseline.version, target.version]],
    ["allowed_roles", ["baseline", "target"]],
    ["allowed_operations", gate.required_approved_operations],
    ["allowed_artifact_sha256s", [baseline.artifact_sha256, target.artifact_sha256]],
    ["allowed_binding_sha256s", [approval?.tenant_config_sha256, approval?.candidates?.baseline?.release_manifest_sha256, approval?.candidates?.target?.release_manifest_sha256]],
  ];
  if (!trustedKey || trustedKey.revoked_at != null || scopedValues.some(([field, values]) => values.some((value) => !trustedKey[field]?.includes(value)))) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_TRUST_SCOPE_INVALID", "The production-root update key does not authorize the exact approval scope.", context);
    valid = false;
  }
  if (!updateKey || !/^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/u.test(asText(updateKey.key_id)) || !validSha256(updateKey.public_key_spki_sha256)) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_KEY_INVALID", "Windows update approval does not bind a valid production-root update key.", context);
    valid = false;
  }
  let detachedSignature = signatureFile.snapshot;
  if (signatureFile.state === "verified_bytes" && signatureFile.bytes !== 64) {
    const encoded = signatureFile.snapshot.toString("utf8").trim();
    if (/^[0-9a-f]{128}$/iu.test(encoded)) detachedSignature = Buffer.from(encoded, "hex");
    else if (/^[A-Za-z0-9+/]{86}==$/u.test(encoded)) detachedSignature = Buffer.from(encoded, "base64");
    else detachedSignature = null;
  }
  let updatePublicKey = null;
  try {
    updatePublicKey = createPublicKey(trustedKey?.public_key_spki_pem ?? "");
    const publicKeySha256 = sha256(updatePublicKey.export({ type: "spki", format: "der" }));
    const keyActiveAtApproval = Date.parse(trustedKey.valid_from) <= issuedAt && Date.parse(trustedKey.valid_until) >= issuedAt;
    if (updatePublicKey.asymmetricKeyType !== "ed25519"
        || publicKeySha256 !== updateKey?.public_key_spki_sha256
        || !keyActiveAtApproval
        || !Buffer.isBuffer(detachedSignature)
        || detachedSignature.length !== 64
        || !verifySignature(null, parsed.snapshot, updatePublicKey, detachedSignature)) {
      throw new Error("signature or update-key binding mismatch");
    }
  } catch (error) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_SIGNATURE_INVALID", "Windows update/rollback approval signature does not verify against the production-root update key and exact approval bytes.", { ...context, cause: error.message });
    valid = false;
  }
  const inspections = { baseline: baselineInspection, target: targetInspection };
  for (const [role, candidate] of [["baseline", baseline], ["target", target]]) {
    const roleContext = { ...context, candidate_role: role };
    const inspection = inspections[role];
    const releaseManifestFile = inspection?.releaseManifest;
    const metadataFile = inspection?.updateMetadata;
    const metadataSignatureFile = inspection?.updateMetadataSignature;
    const metadata = metadataFile?.value;
    const approved = approval?.candidates?.[role];
    const runnerCandidate = runner?.candidates?.[role];
    const consumed = consumer?.candidates?.[role];
    valid = exactArray(findings, Object.keys(metadata ?? {}).sort(), [...WINDOWS_UPDATE_METADATA_FIELDS].sort(), "WINDOWS_UPDATE_METADATA_FIELDS_INVALID", "Windows raw signed update metadata fields are incomplete or unexpected.", roleContext) && valid;
    const metadataText = Buffer.isBuffer(metadataFile?.snapshot) ? metadataFile.snapshot.toString("utf8") : "";
    if (WINDOWS_UPDATE_METADATA_FIELDS.some((field) => (metadataText.match(new RegExp(`"${field}"\\s*:`, "gu")) ?? []).length !== 1)) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_METADATA_DUPLICATE_FIELD", "Every raw signed Windows update metadata field must occur exactly once.", roleContext);
      valid = false;
    }
    for (const [actual, expectedValue, code, message] of [
      [approved?.release_manifest_sha256, releaseManifestFile?.sha256, "WINDOWS_UPDATE_APPROVAL_MANIFEST_DIGEST_MISMATCH", "Windows update approval release-manifest digest differs from the exact manifest bytes."],
      [runnerCandidate?.release_manifest_sha256, releaseManifestFile?.sha256, "WINDOWS_UPDATE_RUNNER_MANIFEST_DIGEST_MISMATCH", "Windows update runner release-manifest digest differs from the exact manifest bytes."],
      [runnerCandidate?.metadata_raw_sha256, metadataFile?.sha256, "WINDOWS_UPDATE_METADATA_DIGEST_MISMATCH", "Windows update runner metadata digest differs from the exact raw signed metadata bytes."],
      [runnerCandidate?.signature_raw_sha256, metadataSignatureFile?.sha256, "WINDOWS_UPDATE_METADATA_SIGNATURE_DIGEST_MISMATCH", "Windows update runner signature digest differs from the exact raw signature bytes."],
      [consumed?.release_manifest_sha256, releaseManifestFile?.sha256, "WINDOWS_PRIVATE_CONSUMER_MANIFEST_DIGEST_MISMATCH", "Windows private consumer release-manifest digest differs from the exact manifest bytes."],
      [consumed?.update_metadata_sha256, metadataFile?.sha256, "WINDOWS_PRIVATE_CONSUMER_METADATA_DIGEST_MISMATCH", "Windows private consumer metadata digest differs from the exact raw metadata bytes."],
      [consumed?.update_metadata_signature_sha256, metadataSignatureFile?.sha256, "WINDOWS_PRIVATE_CONSUMER_METADATA_SIGNATURE_DIGEST_MISMATCH", "Windows private consumer signature digest differs from the exact raw signature bytes."],
      [metadata?.schemaVersion, gate.update_metadata_schema_version, "WINDOWS_UPDATE_METADATA_SCHEMA_INVALID", "Windows raw update metadata schema is invalid."],
      [metadata?.channel, gate.update_metadata_channel, "WINDOWS_UPDATE_METADATA_CHANNEL_INVALID", "Windows raw update metadata channel is invalid."],
      [metadata?.keyId, updateKey?.key_id, "WINDOWS_UPDATE_METADATA_KEY_MISMATCH", "Windows raw update metadata key differs from the approved update key."],
      [metadata?.pilotId, expected.pilotId, "WINDOWS_UPDATE_METADATA_SCOPE_MISMATCH", "Windows raw update metadata pilot differs from the signed readiness scope."],
      [metadata?.lawosTenantId, expected.lawosTenantId, "WINDOWS_UPDATE_METADATA_SCOPE_MISMATCH", "Windows raw update metadata LawOS tenant differs from the signed readiness scope."],
      [metadata?.entraTenantId, expected.entraTenantId, "WINDOWS_UPDATE_METADATA_SCOPE_MISMATCH", "Windows raw update metadata Entra tenant differs from the signed readiness scope."],
      [metadata?.appId, approval?.app_id, "WINDOWS_UPDATE_METADATA_APP_ID_MISMATCH", "Windows raw update metadata app identity differs from the approval."],
      [metadata?.approvalId, approval?.metadata_approval_id, "WINDOWS_UPDATE_METADATA_APPROVAL_ID_MISMATCH", "Windows raw update metadata approval ID differs from the independent approval."],
      [metadata?.approvalExpiresAt, approval?.expires_at, "WINDOWS_UPDATE_METADATA_APPROVAL_EXPIRY_MISMATCH", "Windows raw update metadata approval expiry differs from the independent approval."],
      [metadata?.tenantConfigSha256, approval?.tenant_config_sha256, "WINDOWS_UPDATE_METADATA_TENANT_CONFIG_MISMATCH", "Windows raw update metadata tenant configuration differs from the approval."],
      [metadata?.version, candidate.version, "WINDOWS_UPDATE_METADATA_CANDIDATE_MISMATCH", "Windows raw update metadata version differs from the signed candidate."],
      [metadata?.sourceSha, candidate.source_sha, "WINDOWS_UPDATE_METADATA_CANDIDATE_MISMATCH", "Windows raw update metadata source SHA differs from the signed candidate."],
      [metadata?.sourceTree, candidate.source_tree, "WINDOWS_UPDATE_METADATA_CANDIDATE_MISMATCH", "Windows raw update metadata source tree differs from the signed candidate."],
      [metadata?.artifactSha256, candidate.artifact_sha256, "WINDOWS_UPDATE_METADATA_CANDIDATE_MISMATCH", "Windows raw update metadata installer digest differs from the signed candidate."],
      [metadata?.artifactBytes, candidate.artifact_bytes, "WINDOWS_UPDATE_METADATA_CANDIDATE_MISMATCH", "Windows raw update metadata installer byte count differs from the signed candidate."],
      [metadata?.releaseManifestSha256, releaseManifestFile?.sha256, "WINDOWS_UPDATE_METADATA_MANIFEST_DIGEST_MISMATCH", "Windows raw update metadata does not bind the exact release-manifest bytes."],
      [metadata?.artifactFilename, path.posix.basename(asText(consumed?.materialized?.installer?.relative_path)), "WINDOWS_UPDATE_METADATA_FILENAME_MISMATCH", "Windows raw update metadata installer filename differs from the exact admitted installer path."],
    ]) valid = checkExact(findings, actual, expectedValue, code, message, roleContext) && valid;
    const metadataGeneratedAt = Date.parse(metadata?.generatedAt ?? "");
    const metadataExpiresAt = Date.parse(metadata?.expiresAt ?? "");
    if (!validUtc(metadata?.generatedAt) || !validUtc(metadata?.expiresAt)
        || metadataGeneratedAt > Date.now()
        || metadataGeneratedAt > Date.parse(runner?.generated_at ?? "")
        || metadataExpiresAt <= Date.parse(runner?.generated_at ?? "")
        || metadataExpiresAt > expiresAt) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_METADATA_TIME_INVALID", "Windows raw update metadata must be canonical, issued before admission, and active through the runner without outliving approval.", roleContext);
      valid = false;
    }
    if (metadataSignatureFile?.state !== "verified_bytes" || metadataSignatureFile.bytes !== 64 || !updatePublicKey
        || !Buffer.isBuffer(metadataFile?.snapshot)
        || !verifySignature(null, metadataFile.snapshot, updatePublicKey, metadataSignatureFile.snapshot)) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_METADATA_SIGNATURE_INVALID", "Windows raw update metadata signature does not verify against the exact metadata bytes and approved production-root key.", roleContext);
      valid = false;
    }
  }
  return valid;
}

function inspectWindowsUpdateRunner({ parsed, approvalFile, approvalSignatureFile, approvalScope, runnerSource, baseline, target, baselineInspection, targetInspection, consumer, baselineInstalledExecutableSha256, targetInstalledExecutableSha256, signerCertificateSha1, expected, evidenceIssuedAt, trustRegistry, gate, findings, context }) {
  const runner = parsed.value;
  let valid = parsed.state === "verified_bytes" && runner && typeof runner === "object" && !Array.isArray(runner);
  const canonicalRunnerBytes = Buffer.from(`${JSON.stringify(runner, null, 2)}\n`, "utf8");
  if (parsed.state !== "verified_bytes" || !parsed.snapshot.equals(canonicalRunnerBytes)) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_RUNNER_CANONICAL_BYTES_INVALID", "Windows update/rollback runner receipt must use exact canonical JSON bytes.", context);
    valid = false;
  }
  try {
    const commonExpected = {
      approval_bundle_sha256: approvalFile.sha256,
      signer_certificate_sha1: signerCertificateSha1,
      candidates: Object.fromEntries([["baseline", baseline], ["target", target]].map(([role, candidate]) => [role, {
        artifact_sha256: candidate.artifact_sha256,
        installed_tree: (role === "baseline" ? baselineInspection : targetInspection)?.installedTree,
        metadata_raw_sha256: candidate.update_metadata_sha256,
        release_manifest_sha256: candidate.release_manifest_sha256,
        signature_raw_sha256: candidate.update_metadata_signature_sha256,
        source_sha: candidate.source_sha,
        version: candidate.version,
      }])),
    };
    if (validateWindowsFormalUpdateRunnerPassReceipt(runner, commonExpected) !== true) throw new Error("common PASS validator returned false");
  } catch (error) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_COMMON_PASS_INVALID", "Windows update/rollback receipt failed the shared closed-schema PASS validator.", { ...context, cause: error.message });
    valid = false;
  }
  for (const [actual, expected, code, message] of [
    [runner?.schema_version, gate.update_runner_schema_version, "WINDOWS_UPDATE_SCHEMA_INVALID", "Windows update/rollback runner receipt schema is invalid."],
    [validUtc(runner?.generated_at), true, "WINDOWS_UPDATE_TIMESTAMP_INVALID", "Windows update/rollback receipt generated_at must be a canonical UTC timestamp."],
    [runner?.verdict, "PASS", "WINDOWS_UPDATE_VERDICT_INVALID", "Windows update/rollback runner did not PASS."],
    [runner?.automatic_update, false, "WINDOWS_UPDATE_AUTOMATIC_FORBIDDEN", "Windows update/rollback must be separately operator initiated."],
    [runner?.signer_certificate_sha1, signerCertificateSha1, "WINDOWS_UPDATE_SIGNER_MISMATCH", "Windows update/rollback signer differs from the release signer."],
    [runner?.source_runner?.source_sha, runnerSource?.source_sha, "WINDOWS_UPDATE_RUNNER_SOURCE_MISMATCH", "Windows update/rollback runner source SHA differs from the signed expected runner source."],
    [runner?.source_runner?.source_tree, runnerSource?.source_tree, "WINDOWS_UPDATE_RUNNER_SOURCE_MISMATCH", "Windows update/rollback runner source tree differs from the signed expected runner source."],
    [runnerSource?.source_dirty, false, "WINDOWS_UPDATE_RUNNER_SOURCE_DIRTY", "Windows update/rollback runner source must be clean."],
    [runner?.approval_bundle_sha256, approvalScope?.bundle_sha256, "WINDOWS_UPDATE_APPROVAL_SCOPE_MISMATCH", "Windows update/rollback runner approval bundle differs from the signed outer approval scope."],
    [runner?.approval_signature_sha256, approvalScope?.signature_sha256, "WINDOWS_UPDATE_APPROVAL_SCOPE_MISMATCH", "Windows update/rollback runner approval signature differs from the signed outer approval scope."],
    [runner?.candidates?.baseline?.version, baseline.version, "WINDOWS_UPDATE_BASELINE_MISMATCH", "Windows update runner baseline version differs from the candidate."],
    [runner?.candidates?.baseline?.source_sha, baseline.source_sha, "WINDOWS_UPDATE_BASELINE_MISMATCH", "Windows update runner baseline source differs from the candidate."],
    [runner?.candidates?.baseline?.artifact_sha256, baseline.artifact_sha256, "WINDOWS_UPDATE_BASELINE_MISMATCH", "Windows update runner baseline artifact differs from the candidate."],
    [runner?.candidates?.target?.version, target.version, "WINDOWS_UPDATE_TARGET_MISMATCH", "Windows update runner target version differs from the release."],
    [runner?.candidates?.target?.source_sha, target.source_sha, "WINDOWS_UPDATE_TARGET_MISMATCH", "Windows update runner target source differs from the release."],
    [runner?.candidates?.target?.artifact_sha256, target.artifact_sha256, "WINDOWS_UPDATE_TARGET_MISMATCH", "Windows update runner target artifact differs from the release."],
    [runner?.failure_cleanup?.required, false, "WINDOWS_UPDATE_CLEANUP_INVALID", "Successful Windows update/rollback unexpectedly requires failure cleanup."],
    [runner?.failure_cleanup?.initiated, false, "WINDOWS_UPDATE_CLEANUP_INVALID", "Successful Windows update/rollback initiated failure cleanup."],
    [runner?.failure_cleanup?.completed, true, "WINDOWS_UPDATE_CLEANUP_INVALID", "Windows update/rollback cleanup boundary is incomplete."],
    [runner?.boundaries?.provider_call_performed, false, "WINDOWS_UPDATE_BOUNDARY_INVALID", "Windows update/rollback receipt claims a provider call."],
    [runner?.boundaries?.automatic_update, false, "WINDOWS_UPDATE_BOUNDARY_INVALID", "Windows update/rollback receipt claims automatic update."],
    [runner?.boundaries?.public_release_claim, false, "WINDOWS_UPDATE_BOUNDARY_INVALID", "Windows update/rollback receipt claims public release."],
    [runner?.boundaries?.production_go_live_claim, false, "WINDOWS_UPDATE_BOUNDARY_INVALID", "Windows update/rollback receipt claims production go-live."],
  ]) valid = checkExact(findings, actual, expected, code, message, context) && valid;
  if (!validSha256(runner?.approval_bundle_sha256)) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_DIGEST_INVALID", "Windows update/rollback receipt lacks a valid approval-bundle digest.", context);
    valid = false;
  }
  if (!validSha256(runner?.approval_signature_sha256)) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_SIGNATURE_DIGEST_INVALID", "Windows update/rollback receipt lacks a valid approval-signature digest.", context);
    valid = false;
  }
  if (!validSourceSha(runner?.source_runner?.source_sha) || !validSourceSha(runner?.source_runner?.source_tree)) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_RUNNER_SOURCE_INVALID", "Windows update/rollback receipt must bind the exact clean runner source SHA and tree.", context);
    valid = false;
  }
  for (const role of ["baseline", "target"]) {
    const runnerCandidate = runner?.candidates?.[role];
    const candidateInspection = role === "baseline" ? baselineInspection : targetInspection;
    valid = exactArray(findings, Object.keys(runnerCandidate ?? {}).sort(), [...(gate.update_runner_candidate_required_fields ?? [])].sort(), "WINDOWS_UPDATE_RUNNER_CANDIDATE_FIELDS_INVALID", "Windows update/rollback runner candidate fields are incomplete or unexpected.", { ...context, candidate_role: role }) && valid;
    if (![runnerCandidate?.release_manifest_sha256, runnerCandidate?.metadata_raw_sha256, runnerCandidate?.signature_raw_sha256].every(validSha256)) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_METADATA_DIGEST_INVALID", "Windows update/rollback candidate manifest, metadata, or signature digest is malformed.", { ...context, candidate_role: role });
      valid = false;
    }
    valid = inspectWindowsInstalledTreeSummary({
      value: runnerCandidate?.installed_tree,
      expected: candidateInspection?.installedTree,
      includeIdentity: true,
      gate,
      findings,
      context: { ...context, candidate_role: role },
      code: "WINDOWS_UPDATE_RUNNER_INSTALLED_TREE_MISMATCH",
      message: "Windows update/rollback runner candidate installed tree differs from the exact private-consumer, native QA, or installed-executable SBOM evidence.",
    }) && valid;
  }
  valid = exactArray(findings, runner?.approved_operations, gate.required_approved_operations, "WINDOWS_UPDATE_APPROVED_OPERATIONS_INVALID", "Windows update/rollback approved operations are incomplete or reordered.", context) && valid;
  const operations = Array.isArray(runner?.operations) ? runner.operations : [];
  valid = exactArray(findings, operations.map((entry) => entry?.operation), gate.required_update_operations, "WINDOWS_UPDATE_OPERATION_SEQUENCE_INVALID", "Windows update/rollback operations did not execute in the contracted order.", context) && valid;
  let previousInitiatedAt = Number.NEGATIVE_INFINITY;
  const approvalDigests = operations.map((operation) => operation?.approval_id_sha256);
  if (new Set(approvalDigests).size !== approvalDigests.length) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_ID_REUSED", "Windows update/rollback operations must use distinct approval IDs.", context);
    valid = false;
  }
  const generatedAt = Date.parse(runner?.generated_at ?? "");
  for (const operation of operations) {
    const initiatedAt = Date.parse(operation?.initiated_at ?? "");
    if (!validSha256(operation?.approval_id_sha256) || !validUtc(operation?.initiated_at)) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_OPERATION_EVIDENCE_INVALID", "Every Windows update/rollback operation must have an approval digest and UTC initiation timestamp.", { ...context, operation: operation?.operation });
      valid = false;
    }
    if (!(initiatedAt > previousInitiatedAt && initiatedAt <= generatedAt && initiatedAt <= Date.now())) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_OPERATION_TIME_INVALID", "Windows update/rollback operation timestamps must be strictly increasing, not future-dated, and no later than receipt generation.", { ...context, operation: operation?.operation });
      valid = false;
    }
    previousInitiatedAt = initiatedAt;
  }
  if (!(generatedAt <= Date.now() && generatedAt <= evidenceIssuedAt)) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_TIMESTAMP_FUTURE", "Windows update/rollback receipt cannot postdate the outer signed evidence receipt or current time.", context);
    valid = false;
  }
  const launches = Array.isArray(runner?.launches) ? runner.launches : [];
  valid = exactArray(findings, launches.map((entry) => entry?.role), gate.required_launch_roles, "WINDOWS_UPDATE_LAUNCH_SEQUENCE_INVALID", "Windows update/rollback launches did not execute baseline, target, baseline.", context) && valid;
  launches.forEach((launch, index) => {
    const role = index === 1 ? "target" : "baseline";
    const candidate = role === "target" ? target : baseline;
    const candidateInspection = role === "target" ? targetInspection : baselineInspection;
    const expectedInstalledTree = candidateInspection?.installedTree;
    const expectedExecutableSha256 = role === "target" ? targetInstalledExecutableSha256 : baselineInstalledExecutableSha256;
    const launchContext = { ...context, launch_index: index, candidate_role: role };
    valid = exactArray(findings, Object.keys(launch ?? {}).sort(), [...(gate.update_runner_launch_required_fields ?? [])].sort(), "WINDOWS_UPDATE_LAUNCH_FIELDS_INVALID", "Windows update/rollback launch installed-tree fields are incomplete or unexpected.", launchContext) && valid;
    for (const [actual, expected, code, message] of [
      [launch?.version, candidate.version, "WINDOWS_UPDATE_LAUNCH_VERSION_MISMATCH", "Windows launched version differs from the signed candidate."],
      [launch?.source_sha, candidate.source_sha, "WINDOWS_UPDATE_LAUNCH_SOURCE_MISMATCH", "Windows launched source differs from the signed candidate."],
      [launch?.executable_sha256, expectedExecutableSha256, "WINDOWS_UPDATE_LAUNCH_EXECUTABLE_MISMATCH", "Windows launched executable bytes differ from the candidate installed-tree SBOM."],
      [launch?.authenticode_valid, true, "WINDOWS_UPDATE_LAUNCH_AUTHENTICODE_INVALID", "Windows launch did not verify Authenticode."],
      [launch?.exact_bytes_verified, true, "WINDOWS_UPDATE_LAUNCH_BYTES_UNVERIFIED", "Windows launch did not verify exact executable bytes."],
      [launch?.session_started, true, "WINDOWS_UPDATE_LAUNCH_SESSION_INVALID", "Windows candidate session did not start."],
      [launch?.session_stopped, true, "WINDOWS_UPDATE_LAUNCH_SESSION_INVALID", "Windows candidate session did not stop."],
    ]) valid = checkExact(findings, actual, expected, code, message, launchContext) && valid;
    if (!validSha256(launch?.executable_sha256)) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_EXECUTABLE_SHA256_INVALID", "Windows launch executable digest is malformed.", launchContext);
      valid = false;
    }
    valid = inspectWindowsInstalledTreeSummary({
      value: launch?.post_install_installed_tree,
      expected: expectedInstalledTree,
      includeIdentity: false,
      gate,
      findings,
      context: { ...launchContext, checkpoint: "post_install" },
      code: "WINDOWS_UPDATE_LAUNCH_INSTALLED_TREE_MISMATCH",
      message: "Windows post-install tree portable fields differ from the exact admitted candidate tree.",
    }) && valid;
    valid = inspectWindowsInstalledTreeSummary({
      value: launch?.prelaunch_installed_tree,
      expected: expectedInstalledTree,
      includeIdentity: false,
      gate,
      findings,
      context: { ...launchContext, checkpoint: "prelaunch" },
      code: "WINDOWS_UPDATE_LAUNCH_INSTALLED_TREE_MISMATCH",
      message: "Windows prelaunch tree portable fields differ from the exact admitted candidate tree.",
    }) && valid;
    valid = checkExact(
      findings,
      launch?.post_install_installed_tree?.identity_sha256,
      launch?.prelaunch_installed_tree?.identity_sha256,
      "WINDOWS_UPDATE_LAUNCH_INSTALLED_TREE_IDENTITY_MISMATCH",
      "Windows operator NTFS identity changed between post-install and prelaunch for the same installation.",
      launchContext,
    ) && valid;
    valid = checkExact(findings, launch?.executable_sha256, expectedInstalledTree?.installed_executable_sha256, "WINDOWS_UPDATE_LAUNCH_EXECUTABLE_MISMATCH", "Windows launch executable digest differs from the unique admitted installed-executable SBOM row.", launchContext) && valid;
  });
  if (launches.length === 3) valid = checkExact(findings, launches[2]?.executable_sha256, launches[0]?.executable_sha256, "WINDOWS_ROLLBACK_EXECUTABLE_BYTE_MISMATCH", "Rollback baseline executable bytes differ from the original baseline installation.", context) && valid;
  const uninstalls = Array.isArray(runner?.uninstalls) ? runner.uninstalls : [];
  valid = exactArray(findings, uninstalls.map((entry) => entry?.role), gate.required_uninstall_roles, "WINDOWS_UPDATE_UNINSTALL_SEQUENCE_INVALID", "Windows update/rollback uninstallers did not execute target then rollback baseline.", context) && valid;
  for (const [index, uninstall] of uninstalls.entries()) {
    const role = gate.required_uninstall_roles?.[index];
    const candidate = role === "target" ? target : baseline;
    const inspection = role === "target" ? targetInspection : baselineInspection;
    const runnerCandidate = runner?.candidates?.[role];
    const consumerUninstaller = consumer?.candidates?.[role]?.uninstaller;
    const expectedOperation = role === "target" ? "target_uninstall_for_rollback" : "final_uninstall";
    const operationEvidence = operations.find((operation) => operation?.operation === expectedOperation);
    const uninstallContext = { ...context, candidate_role: role, uninstall_index: index };
    valid = exactArray(findings, Object.keys(uninstall ?? {}).sort(), [...(gate.update_uninstall_required_fields ?? [])].sort(), "WINDOWS_UPDATE_UNINSTALL_FIELDS_INVALID", "Windows locked-uninstaller evidence fields are incomplete or unexpected.", uninstallContext) && valid;
    for (const [actual, expectedValue, code, message] of [
      [uninstall?.version, candidate?.version, "WINDOWS_UPDATE_UNINSTALL_CANDIDATE_MISMATCH", "Windows locked uninstaller version differs from the signed candidate."],
      [uninstall?.source_sha, candidate?.source_sha, "WINDOWS_UPDATE_UNINSTALL_CANDIDATE_MISMATCH", "Windows locked uninstaller source differs from the signed candidate."],
      [uninstall?.artifact_sha256, candidate?.artifact_sha256, "WINDOWS_UPDATE_UNINSTALL_CANDIDATE_MISMATCH", "Windows locked uninstaller artifact differs from the signed candidate."],
      [uninstall?.metadata_raw_sha256, runnerCandidate?.metadata_raw_sha256, "WINDOWS_UPDATE_UNINSTALL_METADATA_MISMATCH", "Windows locked uninstaller metadata digest differs from the admitted metadata."],
      [uninstall?.signature_raw_sha256, runnerCandidate?.signature_raw_sha256, "WINDOWS_UPDATE_UNINSTALL_SIGNATURE_MISMATCH", "Windows locked uninstaller signature digest differs from the admitted signature."],
      [uninstall?.release_manifest_sha256, runnerCandidate?.release_manifest_sha256, "WINDOWS_UPDATE_UNINSTALL_MANIFEST_MISMATCH", "Windows locked uninstaller release-manifest digest differs from the admitted manifest."],
      [uninstall?.operation, expectedOperation, "WINDOWS_UPDATE_UNINSTALL_OPERATION_MISMATCH", "Windows locked uninstaller operation differs from the mandatory target/rollback uninstall sequence."],
      [uninstall?.approval_id_sha256, operationEvidence?.approval_id_sha256, "WINDOWS_UPDATE_UNINSTALL_APPROVAL_MISMATCH", "Windows locked uninstaller is not bound to the exact operation approval ID."],
      [uninstall?.installed_tree_sha256, uninstall?.uninstaller_sha256, "WINDOWS_UPDATE_UNINSTALLER_TREE_DIGEST_MISMATCH", "Windows locked uninstaller digest differs from its installed-tree inventory entry."],
      [uninstall?.installed_tree_path, consumerUninstaller?.installed_tree_path, "WINDOWS_UPDATE_UNINSTALLER_CONSUMER_MISMATCH", "Windows locked uninstaller path differs from the immutable consumer/native QA evidence."],
      [uninstall?.installed_tree_sha256, consumerUninstaller?.installed_tree_sha256, "WINDOWS_UPDATE_UNINSTALLER_CONSUMER_MISMATCH", "Windows locked uninstaller digest differs from the immutable consumer/native QA evidence."],
      [uninstall?.uninstaller_bytes, consumerUninstaller?.uninstaller_bytes, "WINDOWS_UPDATE_UNINSTALLER_CONSUMER_MISMATCH", "Windows locked uninstaller byte count differs from the immutable consumer/native QA evidence."],
      [uninstall?.authenticode_valid, true, "WINDOWS_UPDATE_UNINSTALLER_AUTHENTICODE_INVALID", "Windows uninstaller Authenticode verification did not PASS."],
      [uninstall?.authenticode?.status, "Valid", "WINDOWS_UPDATE_UNINSTALLER_AUTHENTICODE_INVALID", "Windows uninstaller Authenticode status is invalid."],
      [uninstall?.authenticode?.signature_type, "Authenticode", "WINDOWS_UPDATE_UNINSTALLER_AUTHENTICODE_INVALID", "Windows uninstaller signature type is invalid."],
      [uninstall?.authenticode?.signer_thumbprint, signerCertificateSha1, "WINDOWS_UPDATE_UNINSTALLER_SIGNER_MISMATCH", "Windows uninstaller signer differs from the signed installer candidates."],
      [uninstall?.authenticode?.time_stamper_certificate_present, true, "WINDOWS_UPDATE_UNINSTALLER_TIMESTAMP_INVALID", "Windows uninstaller lacks a timestamp certificate."],
      [uninstall?.lock_mode, "FileShare.Read", "WINDOWS_UPDATE_UNINSTALLER_LOCK_INVALID", "Windows uninstaller was not executed under the required FileShare.Read lock."],
      [uninstall?.denies_write_delete, true, "WINDOWS_UPDATE_UNINSTALLER_LOCK_INVALID", "Windows uninstaller lock did not deny write and delete replacement."],
      [uninstall?.process?.path_identity, "pid_executable_path", "WINDOWS_UPDATE_UNINSTALLER_PROCESS_IDENTITY_INVALID", "Windows uninstaller PID did not resolve to the exact locked executable path."],
      [uninstall?.exit_code, 0, "WINDOWS_UPDATE_UNINSTALLER_EXIT_INVALID", "Windows locked uninstaller did not exit successfully."],
    ]) valid = checkExact(findings, actual, expectedValue, code, message, uninstallContext) && valid;
    valid = checkExact(findings, sha256(Buffer.from(canonicalJson(uninstall?.authenticode ?? null), "utf8")), consumerUninstaller?.authenticode_sha256, "WINDOWS_UPDATE_UNINSTALLER_AUTHENTICODE_BINDING_INVALID", "Windows locked uninstaller Authenticode record differs from the exact immutable native QA evidence.", uninstallContext) && valid;
    valid = exactArray(findings, Object.keys(uninstall?.process ?? {}).sort(), [...(gate.update_uninstall_process_fields ?? [])].sort(), "WINDOWS_UPDATE_UNINSTALLER_PROCESS_FIELDS_INVALID", "Windows locked-uninstaller process evidence fields are incomplete or unexpected.", uninstallContext) && valid;
    if (!/^\.\/(?:[^\0\r\n\\/]+\/)*uninstall[^\0\r\n\\/]*\.exe$/iu.test(asText(uninstall?.installed_tree_path))
        || !validSha256(uninstall?.installed_tree_sha256)
        || !validSha256(uninstall?.uninstaller_sha256)
        || !validSha256(uninstall?.approval_id_sha256)
        || !Number.isSafeInteger(uninstall?.uninstaller_bytes)
        || uninstall.uninstaller_bytes < 1
        || !CERTIFICATE_SHA256_PATTERN.test(asText(uninstall?.authenticode?.signer_certificate_sha256))
        || !CERTIFICATE_SHA256_PATTERN.test(asText(uninstall?.authenticode?.timestamp_certificate_sha256))
        || !CERTIFICATE_SHA1_PATTERN.test(asText(uninstall?.authenticode?.timestamp_thumbprint))
        || !Array.isArray(uninstall?.authenticode?.signer_eku_oids)
        || !uninstall.authenticode.signer_eku_oids.includes("1.3.6.1.5.5.7.3.3")
        || !Array.isArray(uninstall?.authenticode?.timestamp_eku_oids)
        || !uninstall.authenticode.timestamp_eku_oids.includes("1.3.6.1.5.5.7.3.8")
        || !Number.isSafeInteger(uninstall?.process?.pid)
        || uninstall.process.pid < 1) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_UNINSTALLER_EVIDENCE_INVALID", "Windows locked-uninstaller path, digests, EKUs, timestamp, or process evidence is malformed.", uninstallContext);
      valid = false;
    }
    const installedTreePath = asText(uninstall?.installed_tree_path);
    const installedTreeMatches = Array.isArray(inspection?.installedTreeEntries)
      ? inspection.installedTreeEntries.filter((entry) => entry.path === installedTreePath)
      : [];
    if (inspection?.files?.[`${role}_installed_tree_sbom`]?.state !== "verified_bytes") {
      addFinding(findings, "P0", "WINDOWS_UPDATE_UNINSTALLER_SBOM_UNAVAILABLE", "Windows locked-uninstaller evidence lacks the exact candidate installed-tree SBOM boundary.", uninstallContext);
      valid = false;
    }
    if (installedTreeMatches.length !== 1
        || installedTreeMatches[0]?.sha256 !== uninstall?.uninstaller_sha256
        || installedTreeMatches[0]?.sha256 !== uninstall?.installed_tree_sha256
        || installedTreeMatches[0]?.bytes !== uninstall?.uninstaller_bytes) {
      addFinding(findings, "P0", "WINDOWS_UPDATE_UNINSTALLER_SBOM_BINDING_INVALID", "Windows locked-uninstaller path and digest must match exactly one file in the verified candidate installed-tree SBOM.", { ...uninstallContext, installed_tree_path: installedTreePath, matching_components: installedTreeMatches.length });
      valid = false;
    }
  }
  const residueChecks = Array.isArray(runner?.residue_checks) ? runner.residue_checks : [];
  valid = exactArray(findings, residueChecks.map((entry) => entry?.checkpoint), gate.required_residue_checkpoints, "WINDOWS_UPDATE_RESIDUE_SEQUENCE_INVALID", "Windows residue checks are incomplete or reordered.", context) && valid;
  for (const residue of residueChecks) {
    for (const [field, expected] of [["executable_present", false], ["uninstaller_count", 0], ["entry_count", 0], ["active_session_count", 0]]) {
      valid = checkExact(findings, residue?.[field], expected, "WINDOWS_UPDATE_RESIDUE_PRESENT", "Windows update/rollback left installation or session residue.", { ...context, checkpoint: residue?.checkpoint, field }) && valid;
    }
  }
  valid = inspectWindowsUpdateApproval({ parsed: approvalFile, signatureFile: approvalSignatureFile, runner, baseline, target, baselineInspection, targetInspection, consumer, signerCertificateSha1, expected, evidenceIssuedAt, trustRegistry, gate, findings, context }) && valid;
  return valid;
}

function inspectWindowsReceipt({ rootDir, result, gate, expected, findings, gateId, trustRegistry }) {
  const receipt = result.receipt;
  if (!receipt) return result;
  const context = { gate_id: gateId };
  let valid = result.state === "verified";
  const signerCertificateSha1 = asText(receipt.signing?.signer_certificate_sha1);
  for (const [actual, expectedValue, code, message] of [
    [receipt.signing?.authenticode_valid, true, "WINDOWS_SIGNING_INVALID", "Windows release signing is not valid."],
    [receipt.signing?.same_signer_required, true, "WINDOWS_SIGNER_POLICY_INVALID", "Windows baseline and target must use the same signer."],
    [receipt.signing?.signer_code_signing_eku_verified, true, "WINDOWS_SIGNER_EKU_INVALID", "Windows release signer code-signing EKU was not verified."],
    [receipt.signing?.timestamp_eku_verified, true, "WINDOWS_TIMESTAMP_EKU_INVALID", "Windows release timestamp EKU was not verified."],
    [receipt.claim_policy?.provider_calls_made_by_validator, false, "WINDOWS_CLAIM_POLICY_INVALID", "Windows readiness validation cannot make provider calls."],
    [receipt.claim_policy?.public_release_claim, false, "WINDOWS_CLAIM_POLICY_INVALID", "Windows readiness receipt claims public release."],
    [receipt.claim_policy?.external_distribution_claim, false, "WINDOWS_CLAIM_POLICY_INVALID", "Windows readiness receipt claims external distribution."],
    [receipt.claim_policy?.production_go_live_claim, false, "WINDOWS_CLAIM_POLICY_INVALID", "Windows readiness receipt claims production go-live."],
  ]) valid = checkExact(findings, actual, expectedValue, code, message, context) && valid;
  valid = requiredFields(receipt.runner_source, gate.runner_source_required_fields, findings, context) && valid;
  valid = exactArray(findings, Object.keys(receipt.runner_source ?? {}).sort(), [...(gate.runner_source_required_fields ?? [])].sort(), "WINDOWS_UPDATE_RUNNER_SOURCE_FIELDS_INVALID", "The signed Windows receipt runner-source scope is incomplete or unexpected.", context) && valid;
  valid = requiredFields(receipt.update_approval, gate.update_approval_scope_required_fields, findings, context) && valid;
  valid = exactArray(findings, Object.keys(receipt.update_approval ?? {}).sort(), [...(gate.update_approval_scope_required_fields ?? [])].sort(), "WINDOWS_UPDATE_APPROVAL_SCOPE_FIELDS_INVALID", "The signed Windows receipt approval scope is incomplete or unexpected.", context) && valid;
  valid = requiredFields(receipt.private_consumer, gate.private_consumer_scope_required_fields, findings, context) && valid;
  valid = exactArray(findings, Object.keys(receipt.private_consumer ?? {}).sort(), [...(gate.private_consumer_scope_required_fields ?? [])].sort(), "WINDOWS_PRIVATE_CONSUMER_SCOPE_FIELDS_INVALID", "The signed Windows receipt private-consumer scope is incomplete or unexpected.", context) && valid;
  if (!validSourceSha(receipt.runner_source?.source_sha)
      || !validSourceSha(receipt.runner_source?.source_tree)
      || receipt.runner_source?.source_dirty !== false) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_RUNNER_SOURCE_INVALID", "The signed Windows receipt must bind an exact clean runner source SHA and tree.", context);
    valid = false;
  }
  if (!validSha256(receipt.update_approval?.bundle_sha256)
      || !validSha256(receipt.update_approval?.signature_sha256)) {
    addFinding(findings, "P0", "WINDOWS_UPDATE_APPROVAL_SCOPE_INVALID", "The signed Windows receipt must bind exact approval bundle and signature digests.", context);
    valid = false;
  }
  if (!CERTIFICATE_SHA1_PATTERN.test(signerCertificateSha1)) {
    addFinding(findings, "P0", "WINDOWS_SIGNER_CERTIFICATE_INVALID", "Windows readiness receipt must identify the exact signer certificate SHA-1.", context);
    valid = false;
  }
  const candidateKeys = Object.keys(receipt.candidates ?? {});
  valid = exactArray(findings, candidateKeys, gate.candidate_roles, "WINDOWS_CANDIDATE_SET_INVALID", "Windows readiness receipt must contain exactly baseline and target candidates.", context) && valid;
  const baseline = receipt.candidates?.baseline ?? {};
  const target = receipt.candidates?.target ?? {};
  const evidenceIssuedAt = Date.parse(receipt.issued_at ?? "");
  const trustedKey = trustRegistry?.registry?.keys?.find((key) => key.key_id === receipt.key_id);
  for (const [field, values] of [
    ["allowed_source_shas", [baseline.source_sha, target.source_sha, receipt.runner_source?.source_sha]],
    ["allowed_source_trees", [baseline.source_tree, target.source_tree, receipt.runner_source?.source_tree]],
    ["allowed_versions", [baseline.version, target.version]],
    ["allowed_artifact_sha256s", [baseline.artifact_sha256, target.artifact_sha256]],
  ]) {
    if (!trustedKey || values.some((value) => !trustedKey[field]?.includes(value))) {
      addFinding(findings, "P0", "WINDOWS_CANDIDATE_TRUST_SCOPE_MISMATCH", "The trusted receipt key does not authorize both nested Windows candidates and the governance runner source.", { ...context, field, values });
      valid = false;
    }
  }
  const baselineInspection = inspectWindowsCandidate({ rootDir, candidate: baseline, role: "baseline", signerCertificateSha1, evidenceIssuedAt, gate, findings, gateId });
  const targetInspection = inspectWindowsCandidate({ rootDir, candidate: target, role: "target", signerCertificateSha1, evidenceIssuedAt, gate, findings, gateId });
  valid = baselineInspection.valid && targetInspection.valid && valid;
  for (const [actual, expectedValue, code, message] of [
    [target.source_sha, expected.sourceSha, "WINDOWS_TARGET_SOURCE_SHA_MISMATCH", "Windows target source SHA differs from the release."],
    [target.source_tree, expected.sourceTree, "WINDOWS_TARGET_SOURCE_TREE_MISMATCH", "Windows target source tree differs from the release."],
    [target.version, expected.version, "WINDOWS_TARGET_VERSION_MISMATCH", "Windows target version differs from the release."],
    [target.artifact_sha256, receipt.artifact_sha256, "WINDOWS_TARGET_ARTIFACT_SHA256_MISMATCH", "Windows target artifact differs from the signed outer receipt."],
  ]) valid = checkExact(findings, actual, expectedValue, code, message, context) && valid;
  if (!newerVersion(target.version, baseline.version)
      || target.source_sha === baseline.source_sha
      || target.source_tree === baseline.source_tree
      || target.artifact_sha256 === baseline.artifact_sha256) {
    addFinding(findings, "P0", "WINDOWS_TARGET_NOT_NEWER_DISTINCT", "Windows target must be a newer release with distinct source, tree, and signed installer bytes.", context);
    valid = false;
  }
  valid = exactArray(findings, Object.keys(receipt.artifacts ?? {}), gate.update_artifact_ref_names, "WINDOWS_UPDATE_ARTIFACT_SET_INVALID", "Windows readiness receipt must contain exact private-consumer, execution-input, runner, approval, and approval-signature references.", context) && valid;
  const privateConsumer = parseJsonRef({ rootDir, ref: receipt.artifacts?.private_handoff_consumer, label: `${gateId} final private-consumer receipt`, findings, details: context });
  const updateExecutionInput = parseJsonRef({ rootDir, ref: receipt.artifacts?.update_rollback_execution_input, label: `${gateId} update/rollback execution input`, findings, details: context });
  const updateRunner = parseJsonRef({ rootDir, ref: receipt.artifacts?.update_rollback_runner, label: `${gateId} update/rollback runner receipt`, findings, details: context });
  const updateApproval = parseJsonRef({ rootDir, ref: receipt.artifacts?.update_rollback_approval, label: `${gateId} update/rollback approval receipt`, findings, details: context });
  const updateApprovalSignature = inspectFileRef({ rootDir, ref: receipt.artifacts?.update_rollback_approval_signature, label: `${gateId} update/rollback approval signature`, findings, details: context });
  for (const [actual, expectedValue, code, message] of [
    [receipt.private_consumer?.receipt_sha256, receipt.artifacts?.private_handoff_consumer?.sha256, "WINDOWS_PRIVATE_CONSUMER_SCOPE_MISMATCH", "The signed Windows private-consumer digest differs from its signed artifact reference."],
    [receipt.private_consumer?.receipt_sha256, privateConsumer.sha256, "WINDOWS_PRIVATE_CONSUMER_SCOPE_MISMATCH", "The signed Windows private-consumer digest differs from the exact receipt bytes."],
    [receipt.update_approval?.bundle_sha256, receipt.artifacts?.update_rollback_approval?.sha256, "WINDOWS_UPDATE_APPROVAL_SCOPE_MISMATCH", "The signed Windows approval-bundle digest differs from its signed artifact reference."],
    [receipt.update_approval?.bundle_sha256, updateApproval.sha256, "WINDOWS_UPDATE_APPROVAL_SCOPE_MISMATCH", "The signed Windows approval-bundle digest differs from the exact approval bytes."],
    [receipt.update_approval?.signature_sha256, receipt.artifacts?.update_rollback_approval_signature?.sha256, "WINDOWS_UPDATE_APPROVAL_SCOPE_MISMATCH", "The signed Windows approval-signature digest differs from its signed artifact reference."],
    [receipt.update_approval?.signature_sha256, updateApprovalSignature.sha256, "WINDOWS_UPDATE_APPROVAL_SCOPE_MISMATCH", "The signed Windows approval-signature digest differs from the exact signature bytes."],
  ]) valid = checkExact(findings, actual, expectedValue, code, message, context) && valid;
  const consumerInspection = inspectWindowsPrivateConsumer({
    parsed: privateConsumer,
    scope: receipt.private_consumer,
    runnerFile: updateRunner,
    runnerSource: receipt.runner_source,
    executionInputFile: updateExecutionInput,
    approvalFile: updateApproval,
    approvalSignatureFile: updateApprovalSignature,
    baselineInspection,
    targetInspection,
    evidenceIssuedAt,
    gate,
    findings,
    context,
  });
  valid = consumerInspection.valid && valid;
  valid = inspectWindowsUpdateRunner({
    parsed: updateRunner,
    approvalFile: updateApproval,
    approvalSignatureFile: updateApprovalSignature,
    approvalScope: receipt.update_approval,
    runnerSource: receipt.runner_source,
    baseline,
    target,
    baselineInspection,
    targetInspection,
    consumer: consumerInspection.value,
    baselineInstalledExecutableSha256: baselineInspection.installedExecutableSha256,
    targetInstalledExecutableSha256: targetInspection.installedExecutableSha256,
    signerCertificateSha1,
    expected,
    evidenceIssuedAt,
    trustRegistry,
    gate,
    findings,
    context,
  }) && valid;
  return {
    ...result,
    state: valid ? "verified" : "invalid",
    artifacts: {
      ...baselineInspection.files,
      ...targetInspection.files,
      private_handoff_consumer: privateConsumer,
      update_rollback_execution_input: updateExecutionInput,
      update_rollback_runner: updateRunner,
      update_rollback_approval: updateApproval,
      update_rollback_approval_signature: updateApprovalSignature,
    },
  };
}

function inspectOperationsReceipt({ result, gate, findings, gateId }) {
  const receipt = result.receipt;
  if (!receipt) return result;
  const context = { gate_id: gateId };
  let valid = result.state === "verified";
  valid = requiredFields(receipt.owners, gate.required_owner_fields, findings, context) && valid;
  valid = requiredFields(receipt.runbooks, gate.required_runbook_fields, findings, context) && valid;
  valid = nonPlaceholder(receipt.incident_channel) && valid;
  if (!nonPlaceholder(receipt.incident_channel)) addFinding(findings, "P1", "OPERATIONS_INCIDENT_CHANNEL_MISSING", "Operations receipt is missing an incident/support channel.", context);
  valid = checkDate(findings, receipt.observed_at, "OPERATIONS_TIMESTAMP_INVALID", "Operations receipt must include a UTC observation timestamp.", context) && valid;
  return { ...result, state: valid ? "verified" : "invalid" };
}

function inspectBackupReceipt({ result, gate, expected, findings, gateId }) {
  const receipt = result.receipt;
  if (!receipt) return result;
  const rehearsal = receipt.rehearsal;
  const context = { gate_id: gateId };
  let valid = result.state === "verified";
  valid = requiredFields(rehearsal, gate.required_rehearsal_fields, findings, context) && valid;
  valid = checkExact(findings, asText(rehearsal?.status).toUpperCase(), "PASS", "Backup restore rehearsal is not a PASS result.", context) && valid;
  valid = checkExact(findings, rehearsal?.exact_restore, true, "BACKUP_RESTORE_NOT_EXACT", "Backup restore rehearsal did not prove exact restoration.", context) && valid;
  valid = validSha256(rehearsal?.expected_state_sha256) && validSha256(rehearsal?.restored_state_sha256) && valid;
  if (!validSha256(rehearsal?.expected_state_sha256) || !validSha256(rehearsal?.restored_state_sha256)) addFinding(findings, "P0", "BACKUP_STATE_SHA256_INVALID", "Backup restore rehearsal state hashes are malformed.", context);
  valid = checkExact(findings, rehearsal?.expected_state_sha256, rehearsal?.restored_state_sha256, "BACKUP_STATE_HASH_MISMATCH", "Backup restore rehearsal restored state hash does not match expected state hash.", context) && valid;
  for (const field of ["rpo_seconds", "rto_seconds"]) {
    if (!Number.isFinite(rehearsal?.[field]) || rehearsal[field] < 0) {
      addFinding(findings, "P1", "BACKUP_RPO_RTO_INVALID", `Backup restore rehearsal ${field} must be a non-negative number.`, { ...context, field, actual: rehearsal?.[field] });
      valid = false;
    }
  }
  valid = checkDate(findings, rehearsal?.started_at, "BACKUP_START_TIMESTAMP_INVALID", "Backup restore rehearsal must include a UTC start timestamp.", context) && valid;
  valid = checkDate(findings, rehearsal?.finished_at, "BACKUP_FINISH_TIMESTAMP_INVALID", "Backup restore rehearsal must include a UTC finish timestamp.", context) && valid;
  valid = nonPlaceholder(rehearsal?.approved_threshold_ref) && valid;
  if (!nonPlaceholder(rehearsal?.approved_threshold_ref)) addFinding(findings, "P1", "BACKUP_THRESHOLD_REF_MISSING", "Backup restore rehearsal must reference an approved RPO/RTO threshold without inventing one.", context);
  valid = expected.sourceSha === receipt.source_sha && valid;
  return { ...result, state: valid ? "verified" : "invalid" };
}

function inspectLegalReceipt({ result, gate, findings, gateId }) {
  const receipt = result.receipt;
  if (!receipt) return result;
  const approval = receipt.approval;
  const context = { gate_id: gateId };
  let valid = result.state === "verified";
  valid = requiredFields(approval, gate.required_approval_fields, findings, context) && valid;
  valid = checkExact(findings, approval?.decision, "APPROVED", "LEGAL_OWNER_DECISION_NOT_APPROVED", "Legal owner approval receipt is not explicitly APPROVED.", context) && valid;
  valid = checkDate(findings, approval?.received_at, "LEGAL_OWNER_TIMESTAMP_INVALID", "Legal owner approval must include a UTC receipt timestamp.", context) && valid;
  return { ...result, state: valid ? "verified" : "invalid" };
}

function contractShapeErrors(contract) {
  const errors = [];
  if (contract?.schema_version !== CONTRACT_SCHEMA_VERSION) errors.push("schema_version mismatch");
  if (contract?.receipt_schema_version !== RECEIPT_SCHEMA_VERSION) errors.push("receipt_schema_version mismatch");
  if (contract?.tenant_identity_schema_version !== TENANT_IDENTITY_SCHEMA_VERSION) errors.push("tenant_identity_schema_version mismatch");
  if (contract?.tenant_identity_namespace?.legacy_tenant_id_fallback_allowed !== false) errors.push("legacy tenant_id fallback must be disabled");
  if (contract?.receipt_trust?.registry_schema_version !== TRUST_REGISTRY_SCHEMA_VERSION
      || contract?.receipt_trust?.signature_algorithm !== "Ed25519"
      || contract?.receipt_trust?.detached_signature_required !== true
      || contract?.receipt_trust?.registry_path_cli_required !== false
      || contract?.receipt_trust?.registry_sha256_cli_required !== false
      || contract?.receipt_trust?.caller_supplied_registry_authority !== false
      || contract?.receipt_trust?.production_root_configured !== false
      || contract?.receipt_trust?.production_root_installation_required !== true
      || contract?.receipt_trust?.registry_sha256 !== null
      || contract?.receipt_trust?.registry_signature_sha256 !== null
      || contract?.receipt_trust?.registry_serial !== null
      || contract?.receipt_trust?.root_signed_registry_required !== true
      || contract?.receipt_trust?.production_installation_paths_import_meta_rooted !== true
      || contract?.receipt_trust?.production_installation_paths?.root_public_key !== "config/external-release/root-public-key.spki.pem"
      || contract?.receipt_trust?.production_installation_paths?.registry !== "config/external-release/trust-registry.json"
      || contract?.receipt_trust?.production_installation_paths?.registry_signature !== "config/external-release/trust-registry.json.sig"
      || contract?.receipt_trust?.root_public_key_input_format !== "ed25519_public_spki_pem"
      || contract?.receipt_trust?.root_public_key_digest_basis !== "canonical_spki_der"
      || contract?.receipt_trust?.registry_sha256_policy_pinned !== true
      || contract?.receipt_trust?.registry_signature_sha256_policy_pinned !== true
      || contract?.receipt_trust?.registry_signature_format !== "raw_64_byte_ed25519"
      || contract?.receipt_trust?.registry_serial_policy_pinned !== true
      || contract?.receipt_trust?.registry_exact_signed_bytes_parsed !== true
      || contract?.receipt_trust?.receipt_exact_signed_bytes_parsed !== true
      || contract?.receipt_trust?.stable_regular_file_snapshots_required !== true
      || contract?.receipt_trust?.hardlinked_trust_files_forbidden !== true
      || contract?.receipt_trust?.portable_no_follow_strategy !== "native_o_nofollow_or_lstat_realpath_fd_identity"
      || contract?.receipt_trust?.root_key_as_receipt_leaf_forbidden !== true
      || contract?.receipt_trust?.duplicate_leaf_spki_forbidden !== true
      || contract?.receipt_trust?.test_only_injected_registry_allowed !== true
      || contract?.receipt_trust?.root_public_key_spki_sha256 !== null) errors.push("receipt trust boundary is incomplete");
  const signedScopeFields = ["receipt_source", "receipt_type", "key_id", "pilot_id", "lawos_tenant_id", "entra_tenant_id", "source_sha", "source_tree", "version", "artifact_sha256", "binding_sha256", "role", "operation"];
  if (JSON.stringify(contract?.receipt_trust?.signed_scope_fields) !== JSON.stringify(signedScopeFields)) errors.push("receipt signed scope fields are incomplete or reordered");
  const registryScopes = ["allowed_receipt_sources", "allowed_receipt_types", "allowed_pilot_ids", "allowed_lawos_tenant_ids", "allowed_entra_tenant_ids", "allowed_source_shas", "allowed_source_trees", "allowed_versions", "allowed_roles", "allowed_operations", "allowed_artifact_sha256s", "allowed_binding_sha256s"];
  if (JSON.stringify(contract?.receipt_trust?.registry_key_required_scopes) !== JSON.stringify(registryScopes)) errors.push("trusted registry key scopes are incomplete or reordered");
  if (contract?.scope?.provider_calls_allowed !== false) errors.push("provider_calls_allowed must be false");
  if (contract?.claim_policy?.file_presence_is_evidence !== false) errors.push("file_presence_is_evidence must be false");
  if (contract?.runtime_admission?.provisioning_receipt_alone_satisfies_runtime_binding !== false) errors.push("provisioning-only runtime admission must be false");
  if (contract?.runtime_admission?.issuer_strategy !== "https://login.microsoftonline.com/{entra_tenant_id}/v2.0") errors.push("issuer strategy must be Entra-tenant namespaced");
  if (contract?.runtime_admission?.federated_tenant_source !== "resolved_oidc_protected_config") errors.push("federated tenant source must be resolved protected OIDC config");
  const order = contract?.gate_order;
  if (JSON.stringify(order) !== JSON.stringify(CANONICAL_GATE_ORDER)) errors.push("gate_order is not the canonical ordered gate list");
  if (JSON.stringify(Object.keys(contract?.gates ?? {})) !== JSON.stringify(CANONICAL_GATE_ORDER)) errors.push("gates keys are not the canonical exact gate set/order");
  const executionOrder = contract?.execution_order;
  if (JSON.stringify(executionOrder) !== JSON.stringify(CANONICAL_EXECUTION_ORDER)) errors.push("execution_order must separate internal provisioning from runtime deployment/review");
  for (const gateId of order ?? []) {
    const gate = contract.gates?.[gateId];
    if (!gate?.evidence_class) errors.push(`${gateId}: evidence_class missing`);
    if (!gate?.input_path && !gate?.input_paths) errors.push(`${gateId}: input path missing`);
    if (!gate?.receipt_type && !gate?.provisioning_receipt_type) errors.push(`${gateId}: receipt type missing`);
  }
  return errors;
}

function readJsonFile(rootDir, candidate, label, findings) {
  const snapshot = readRegularFileSnapshot(rootDir, candidate, label, findings);
  if (!snapshot) return null;
  try {
    return JSON.parse(snapshot.bytes.toString("utf8"));
  } catch (error) {
    addFinding(findings, "P0", "INPUT_JSON_INVALID", `${label} is not valid JSON.`, { path: candidate, error: error.message });
    return null;
  }
}

export function validateExternalReleaseReadiness({ rootDir = process.cwd(), inputPath = DEFAULT_INPUT_PATH, contractPath = DEFAULT_CONTRACT_PATH, testOnlyTrustRoot = null } = {}) {
  const root = resolveTrustedRoot(rootDir);
  const findings = [];
  const requestedContractPath = contractPath || DEFAULT_CONTRACT_PATH;
  if (requestedContractPath !== DEFAULT_CONTRACT_PATH) {
    addFinding(findings, "P0", "CONTRACT_PATH_FORBIDDEN", "The external release contract is canonical and cannot be selected by the input bundle.", { requested: requestedContractPath, canonical: DEFAULT_CONTRACT_PATH });
  }
  const canonicalContractPath = DEFAULT_CONTRACT_PATH;
  const contractSnapshot = readRegularFileSnapshot(root, canonicalContractPath, "external release contract", findings);
  let contract = {};
  if (contractSnapshot) {
    const contractBytes = contractSnapshot.bytes;
    const actualContractSha256 = sha256(contractBytes);
    if (actualContractSha256 !== CANONICAL_CONTRACT_SHA256) {
      addFinding(findings, "P0", "CANONICAL_CONTRACT_HASH_MISMATCH", "The external release contract bytes do not match the built-in canonical contract hash.", { expected: CANONICAL_CONTRACT_SHA256, actual: actualContractSha256 });
    }
    try {
      contract = JSON.parse(contractBytes.toString("utf8"));
    } catch (error) {
      addFinding(findings, "P0", "INPUT_JSON_INVALID", "external release contract is not valid JSON.", { path: canonicalContractPath, error: error.message });
    }
  }
  const input = readJsonFile(root, inputPath, "external release input", findings) ?? {};
  const contractErrors = contractShapeErrors(contract);
  for (const error of contractErrors) addFinding(findings, "P0", "CONTRACT_SHAPE_INVALID", "External release contract shape is invalid.", { error });
  if (input.schema_version !== INPUT_SCHEMA_VERSION) {
    addFinding(findings, "P0", "INPUT_SCHEMA_VERSION", "External release input schema version is invalid.", { actual: input.schema_version });
  }
  if (input.tenant_identity_schema_version !== TENANT_IDENTITY_SCHEMA_VERSION) {
    addFinding(findings, "P0", "INPUT_TENANT_IDENTITY_SCHEMA_VERSION", "External release input must declare the explicit LawOS/Entra tenant identity schema version.", { actual: input.tenant_identity_schema_version });
  }

  const release = input.release ?? {};
  const pilot = input.pilot ?? {};
  const expected = {
    sourceSha: asText(release.source_sha),
    sourceTree: asText(release.source_tree),
    version: asText(release.version),
    pilotId: asText(pilot.pilot_id),
    lawosTenantId: asText(pilot.lawos_tenant_id),
    entraTenantId: asText(pilot.entra_tenant_id),
  };
  if (Object.prototype.hasOwnProperty.call(pilot, "tenant_id")) {
    addFinding(findings, "P0", "LEGACY_TENANT_ID_FIELD_FORBIDDEN", "Pilot input must not use the ambiguous legacy tenant_id field.", { field: "pilot.tenant_id" });
  }
  for (const [field, value, valid] of [
    ["release.source_sha", expected.sourceSha, validSourceSha(expected.sourceSha)],
    ["release.source_tree", expected.sourceTree, validSourceSha(expected.sourceTree)],
    ["release.version", expected.version, nonPlaceholder(expected.version)],
    ["pilot.pilot_id", expected.pilotId, nonPlaceholder(expected.pilotId)],
    ["pilot.law_firm_name", pilot.law_firm_name, nonPlaceholder(pilot.law_firm_name)],
    ["pilot.lawos_tenant_id", expected.lawosTenantId, validLawosTenantId(expected.lawosTenantId)],
    ["pilot.entra_tenant_id", expected.entraTenantId, validEntraTenantId(expected.entraTenantId)],
    ["pilot.environment", pilot.environment, pilot.environment === "external_pilot"],
  ]) {
    if (!valid) addFinding(findings, "P1", "NAMED_PILOT_FIELD_INVALID", "Named external pilot input is missing or malformed.", { field, actual: value });
  }
  if (expected.lawosTenantId && expected.lawosTenantId === expected.entraTenantId) {
    addFinding(findings, "P0", "TENANT_ID_NAMESPACE_COLLISION", "LawOS and Entra tenant IDs must be distinct values in the named pilot input.", {});
  }
  if (input.status !== "BLOCKED_PENDING_EXTERNAL_INPUTS" && input.status !== "READY_FOR_EXTERNAL_PILOT_REVIEW") {
    addFinding(findings, "P1", "INPUT_STATUS_INVALID", "External release input status must be BLOCKED_PENDING_EXTERNAL_INPUTS or READY_FOR_EXTERNAL_PILOT_REVIEW.", { actual: input.status });
  }
  const runtimeAssumptions = input.runtime_assumptions ?? {};
  for (const [field, expectedValue] of [
    ["current_runtime_mode", contract.runtime_admission?.current_runtime_mode],
    ["tenant_environment_variable", contract.runtime_admission?.tenant_environment_variable],
    ["database_tenant_environment_variable", contract.runtime_admission?.database_tenant_environment_variable],
    ["federated_tenant_source", contract.runtime_admission?.federated_tenant_source],
    ["issuer_strategy", contract.runtime_admission?.issuer_strategy],
  ]) {
    if (runtimeAssumptions[field] !== expectedValue) addFinding(findings, "P0", "RUNTIME_ASSUMPTION_DRIFT", "Current single-tenant runtime assumption changed or is not recorded.", { field, expected: expectedValue, actual: runtimeAssumptions[field] });
  }
  if (runtimeAssumptions.provisioning_receipt_alone_satisfies_runtime_binding !== false) {
    addFinding(findings, "P0", "RUNTIME_PROVISIONING_ONLY_POLICY_DRIFT", "Provisioning receipt alone must remain insufficient for an external tenant runtime claim.", { actual: runtimeAssumptions.provisioning_receipt_alone_satisfies_runtime_binding });
  }

  const trustRegistry = inspectProductionTrustRegistry({ testOnlyPolicy: testOnlyTrustRoot, findings });

  const gateReports = {};
  for (const gateId of contract.gate_order ?? []) {
    const gate = contract.gates?.[gateId];
    if (!gate) continue;
    if (gateId === "tenant_provisioning") {
      gateReports[gateId] = inspectTenantGate({ rootDir: root, input, gate, expected, findings, gateId, trustRegistry });
      continue;
    }
    const receiptRef = getPathValue(input, gate.input_path);
    let result = inspectReceipt({ rootDir: root, receiptRef, gate, gateId, expected, findings, trustRegistry });
    if (gateId === "api_artifact_deployment") result = inspectApiReceipt({ result, gate, expected, findings, gateId });
    if (gateId === "m365_consent_deployment_visibility") result = inspectM365Receipt({ result, gate, expected, findings, gateId });
    if (gateId === "macos_distribution") result = inspectMacReceipt({ rootDir: root, result, gate, findings, gateId });
    if (gateId === "windows_distribution_update_rollback") result = inspectWindowsReceipt({ rootDir: root, result, gate, expected, findings, gateId, trustRegistry });
    if (gateId === "operations_support_rollback") result = inspectOperationsReceipt({ result, gate, findings, gateId });
    if (gateId === "backup_restore_rehearsal") result = inspectBackupReceipt({ result, gate, expected, findings, gateId });
    if (gateId === "legal_owner_approval") result = inspectLegalReceipt({ result, gate, findings, gateId });
    gateReports[gateId] = result;
  }

  const gateSummary = (gateId, result) => {
    const slots = result.slots ? Object.entries(result.slots).map(([slot, value]) => ({ slot, state: value.state, path: value.path, sha256: value.sha256 ?? null, expected_sha256: value.expected_sha256 ?? null, bytes: value.bytes ?? null })) : [{ slot: "receipt", state: result.state, path: result.path, sha256: result.sha256 ?? null, expected_sha256: result.expected_sha256 ?? null, bytes: result.bytes ?? null }];
    return {
      gate_id: gateId,
      evidence_class: contract.gates?.[gateId]?.evidence_class ?? null,
      state: result.state,
      slots,
      artifacts: result.artifacts ? Object.fromEntries(Object.entries(result.artifacts).map(([name, value]) => [name, { state: value.state, path: value.path, sha256: value.sha256 ?? null, expected_sha256: value.expected_sha256 ?? null, bytes: value.bytes ?? null }])) : undefined,
    };
  };
  const gates = Object.entries(gateReports).map(([gateId, result]) => gateSummary(gateId, result));
  if (input.status === "BLOCKED_PENDING_EXTERNAL_INPUTS" && gates.length > 0 && gates.every((gate) => gate.state === "verified")) {
    addFinding(findings, "P1", "INPUT_STATUS_STALE_BLOCKED", "Input status remains BLOCKED_PENDING_EXTERNAL_INPUTS after all receipts became verified; update the external receipt intake explicitly.", {});
  }
  const allVerified = gates.length === (contract.gate_order ?? []).length && gates.every((gate) => gate.state === "verified") && contractErrors.length === 0 && findings.length === 0;
  const technicalClasses = new Set(["technical"]);
  const humanClasses = new Set(["human_operations", "human_legal"]);
  const providerClasses = new Set(["external_provider"]);
  const countClass = (classes) => {
    const selected = gates.filter((gate) => classes.has(gate.evidence_class));
    return {
      required_gate_count: selected.length,
      verified_gate_count: selected.filter((gate) => gate.state === "verified").length,
      pending_gate_count: selected.filter((gate) => gate.state === "pending_external").length,
      invalid_gate_count: selected.filter((gate) => gate.state === "invalid").length,
    };
  };
  const report = {
    schema_version: REPORT_SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    contract_ref: canonicalContractPath,
    input_ref: inputPath,
    pilot: {
      pilot_id: expected.pilotId || null,
      law_firm_name: nonPlaceholder(pilot.law_firm_name) ? pilot.law_firm_name : null,
      lawos_tenant_id: expected.lawosTenantId || null,
      entra_tenant_id: expected.entraTenantId || null,
      environment: pilot.environment ?? null,
      source_sha: expected.sourceSha || null,
      source_tree: expected.sourceTree || null,
      version: expected.version || null,
    },
    verdict: allVerified ? "PASS" : "FAIL",
    readiness: allVerified ? "READY_FOR_EXTERNAL_PILOT_REVIEW" : "BLOCKED_PENDING_EXTERNAL_INPUTS",
    technical_proof: countClass(technicalClasses),
    external_provider_inputs: countClass(providerClasses),
    human_operations_inputs: countClass(new Set(["human_operations"])),
    human_legal_inputs: countClass(new Set(["human_legal"])),
    gates,
    boundary: {
      provider_calls_made_by_validator: false,
      tenant_identity_schema_version: TENANT_IDENTITY_SCHEMA_VERSION,
      legacy_tenant_id_fallback_allowed: false,
      detached_receipt_signatures_required: true,
      trusted_receipt_registry_supplied: Boolean(trustRegistry),
      test_only_trust_root_injected: Boolean(testOnlyTrustRoot && trustRegistry),
      trusted_receipt_registry_sha256: trustRegistry?.sha256 ?? null,
      external_pilot_distribution_approved_by_validator: false,
      production_cutover_executed_by_validator: false,
      go_live_claim_by_validator: false,
      file_presence_counted_as_proof: false,
      pending_external_inputs_count_as_proof: false,
      provisioning_receipt_alone_passes_runtime: false,
    },
    findings,
  };
  return report;
}

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT_PATH, report: DEFAULT_REPORT_PATH, reportMd: null, root: process.cwd(), help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") args.help = true;
    else if (token === "--input") args.input = argv[++index];
    else if (token === "--report") args.report = argv[++index];
    else if (token === "--report-md") args.reportMd = argv[++index];
    else if (token === "--root") args.root = argv[++index];
    else throw new Error(`unknown argument: ${token}`);
  }
  return args;
}

function renderMarkdown(report) {
  const lines = [
    "# External Release Readiness Validation",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    `Readiness: ${report.readiness}`,
    "",
    "This evidence matrix is fail-closed. It does not call providers, approve external pilot distribution, execute production cutover, or claim go-live.",
    "",
    "## Named Pilot",
    "",
    `- pilot_id: ${report.pilot.pilot_id ?? "(missing)"}`,
    `- law_firm_name: ${report.pilot.law_firm_name ?? "(missing)"}`,
    `- lawos_tenant_id: ${report.pilot.lawos_tenant_id ?? "(missing)"}`,
    `- entra_tenant_id: ${report.pilot.entra_tenant_id ?? "(missing)"}`,
    `- source_sha: ${report.pilot.source_sha ?? "(missing)"}`,
    `- source_tree: ${report.pilot.source_tree ?? "(missing)"}`,
    `- version: ${report.pilot.version ?? "(missing)"}`,
    "",
    "## Evidence Class Summary",
    "",
    `- technical_proof: ${report.technical_proof.verified_gate_count}/${report.technical_proof.required_gate_count} verified; ${report.technical_proof.pending_gate_count} pending; ${report.technical_proof.invalid_gate_count} invalid`,
    `- external_provider_inputs: ${report.external_provider_inputs.verified_gate_count}/${report.external_provider_inputs.required_gate_count} verified; ${report.external_provider_inputs.pending_gate_count} pending; ${report.external_provider_inputs.invalid_gate_count} invalid`,
    `- human_operations_inputs: ${report.human_operations_inputs.verified_gate_count}/${report.human_operations_inputs.required_gate_count} verified; ${report.human_operations_inputs.pending_gate_count} pending; ${report.human_operations_inputs.invalid_gate_count} invalid`,
    `- human_legal_inputs: ${report.human_legal_inputs.verified_gate_count}/${report.human_legal_inputs.required_gate_count} verified; ${report.human_legal_inputs.pending_gate_count} pending; ${report.human_legal_inputs.invalid_gate_count} invalid`,
    "",
    "## Gates",
    "",
    "| Gate | Evidence class | State | Slots |",
    "| --- | --- | --- | --- |",
    ...report.gates.map((gate) => `| ${gate.gate_id} | ${gate.evidence_class} | ${gate.state} | ${gate.slots.map((slot) => `${slot.slot}:${slot.state}`).join(", ")} |`),
    "",
    "## Boundary",
    "",
    "- File presence is not proof; receipt bytes, declared hashes, and semantic fields are checked.",
    "- Tenant provisioning alone cannot pass the runtime binding gate.",
    "- A single-tenant LAWOS_IDENTITY_TENANT_ID runtime requires an exact tenant-pinned config/deployment receipt, unless a separately reviewed multi-tenant runtime receipt satisfies the alternative.",
    "- Technical proof is reported separately from unavailable external-provider, human-operations, and legal-owner inputs.",
    "",
    "## Findings",
    "",
    report.findings.length === 0 ? "No findings." : "| Severity | Code | Message |\n| --- | --- | --- |\n" + report.findings.map((finding) => `| ${finding.severity} | ${finding.code} | ${String(finding.message).replaceAll("|", "\\|")} |`).join("\n"),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function resolveReportPath(rootDir, candidate) {
  const root = resolveTrustedRoot(rootDir);
  const target = path.resolve(root, candidate);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("report path escapes the evidence root");
  let cursor = root;
  for (const part of relative.split(path.sep).filter(Boolean).slice(0, -1)) {
    cursor = path.join(cursor, part);
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error("report path traverses a symbolic-link directory");
  }
  return target;
}

function writeAtomicPrivate(filePath, bytes) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporaryPath, bytes, { mode: 0o600 });
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, filePath);
  chmodSync(filePath, 0o600);
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log("Usage: node scripts/validate-external-release-readiness.mjs [--input <path>] [--report <path>] [--report-md <path>] [--root <path>]");
    return 0;
  }
  resolveTrustedRoot(args.root);
  const report = validateExternalReleaseReadiness({ rootDir: args.root, inputPath: args.input });
  const reportPath = resolveReportPath(args.root, args.report);
  const reportMdPath = args.reportMd
    ? resolveReportPath(args.root, args.reportMd)
    : reportPath.toLowerCase().endsWith(".json")
      ? `${reportPath.slice(0, -5)}.md`
      : `${reportPath}.md`;
  const reportDir = path.dirname(reportPath);
  const reportMdDir = path.dirname(reportMdPath);
  // The validator only writes the explicitly requested local evidence report.
  // It never writes provider, tenant, M365, package, or approval state.
  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }
  if (!existsSync(reportMdDir)) {
    mkdirSync(reportMdDir, { recursive: true });
  }
  writeAtomicPrivate(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeAtomicPrivate(reportMdPath, renderMarkdown(report));
  const reportRoot = resolveTrustedRoot(args.root);
  console.log(JSON.stringify({ report_json: path.relative(reportRoot, reportPath), report_markdown: path.relative(reportRoot, reportMdPath), verdict: report.verdict, readiness: report.readiness, finding_count: report.findings.length }, null, 2));
  return report.verdict === "PASS" ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = main();
}
