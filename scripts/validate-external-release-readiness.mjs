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
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  PRODUCTION_TRUST_ROOT_POLICY,
  TRUST_REGISTRY_SCHEMA_VERSION,
  assertStrictUtcTimestamp,
  resolveTrustedRoot,
  resolveTrustedFile,
  sha256Hex,
  verifyProductionTrustedRegistry,
  verifyDetachedReceipt,
  verifyTrustedRegistry,
} from "./lib/external-release-trust.mjs";

const DEFAULT_CONTRACT_PATH = "contracts/external-release-readiness-contract.json";
const DEFAULT_INPUT_PATH = "docs/launch/external-release/external-release-readiness-input.template.json";
const DEFAULT_REPORT_PATH = ".omo/evidence/external-release-readiness-validation.json";
const CONTRACT_SCHEMA_VERSION = "law-firm-os.external-release-readiness-contract.v0.2";
const INPUT_SCHEMA_VERSION = "law-firm-os.external-release-readiness-input.v0.2";
const RECEIPT_SCHEMA_VERSION = "law-firm-os.external-release-receipt.v0.2";
const REPORT_SCHEMA_VERSION = "law-firm-os.external-release-readiness-report.v0.2";
const TENANT_IDENTITY_SCHEMA_VERSION = "law-firm-os.external-tenant-identity.v1";
const INTERNAL_PROVISIONING_RECEIPT_SCHEMA_VERSION = "law-firm-os.external-tenant-provisioning-receipt.v1";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const SOURCE_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const LAWOS_TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const PLACEHOLDER_PATTERN = /^(?:<[^>]+>|(?:REQUIRED|TBD|TODO|PLACEHOLDER|PENDING|UNKNOWN|N\/A|null|none)(?:[_ -].*)?)$/iu;
const INFERENCE_PATTERN = /(?:agent[-_ ]?inferred|codex[-_ ]?(?:approved|approval)|synthetic approval|simulated owner|inferred approval)/iu;
const CANONICAL_GATE_ORDER = Object.freeze([
  "api_artifact_deployment",
  "tenant_provisioning",
  "m365_consent_deployment_visibility",
  "macos_distribution",
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
  "operations_support_rollback",
  "backup_restore_rehearsal",
  "legal_owner_approval",
]);
// Replaced with the exact hash after contract bytes are finalized.
const CANONICAL_CONTRACT_SHA256 = "3c7a65cc19b6e8a5b17b0f1f2c6932e8614dffa615181cfbf480dc1cec060e02";

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

function validSourceSha(value) {
  return SOURCE_SHA_PATTERN.test(asText(value));
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

function resolveRegularFile(rootDir, candidate, label, findings, details = {}) {
  if (typeof candidate !== "string" || candidate.trim() === "") {
    addFinding(findings, "P1", "FILE_REFERENCE_MISSING", `${label} must provide a relative file path.`, details);
    return null;
  }
  try {
    return resolveTrustedFile(rootDir, candidate);
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
  const target = resolveRegularFile(rootDir, ref.path, label, findings, details);
  if (!target) return { state: "invalid", path: ref.path ?? null, expected_sha256: expected, sha256: null, bytes: 0 };
  const bytes = readFileSync(target);
  const actual = sha256(bytes);
  if (actual !== expected) {
    addFinding(findings, "P0", "RECEIPT_SHA256_MISMATCH", `${label} bytes do not match the declared SHA-256.`, {
      ...details,
      path: relativeRef(path.resolve(rootDir), target),
      expected_sha256: expected,
      actual_sha256: actual,
    });
    return { state: "invalid", path: relativeRef(path.resolve(rootDir), target), expected_sha256: expected, sha256: actual, bytes: bytes.length };
  }
  return { state: "verified_bytes", path: relativeRef(path.resolve(rootDir), target), expected_sha256: expected, sha256: actual, bytes: bytes.length, target };
}

function parseJsonRef({ rootDir, ref, label, findings, details = {} }) {
  const file = inspectFileRef({ rootDir, ref, label, findings, details });
  if (!file.target || file.state !== "verified_bytes") return { ...file, value: null };
  try {
    return { ...file, value: JSON.parse(readFileSync(file.target, "utf8")) };
  } catch (error) {
    addFinding(findings, "P0", "RECEIPT_JSON_INVALID", `${label} is not valid JSON.`, { ...details, path: file.path, error: error.message });
    return { ...file, state: "invalid", value: null };
  }
}

function inspectTrustRegistry({ rootDir, registryPath, registrySha256, findings }) {
  try {
    return verifyTrustedRegistry({ rootDir, registryPath, registrySha256 });
  } catch (error) {
    addFinding(findings, "P0", error.code ?? "TRUST_REGISTRY_INVALID", error.message, error.details ?? {});
    return null;
  }
}

function inspectReceiptTrust({ rootDir, receiptRef, receiptFile, receipt, gate, expected, findings, trustRegistry, context }) {
  if (!trustRegistry) return false;
  try {
    verifyDetachedReceipt({
      rootDir,
      receiptRef,
      receiptBytes: readFileSync(receiptFile.target),
      receipt,
      registry: trustRegistry,
      expectedReceiptType: gate.receipt_type ?? (gate.runtime_receipt_types ?? []).find((type) => type === receipt.receipt_type),
      expectedReceiptSource: gate.required_source ?? (gate.runtime_receipt_sources ?? []).find((source) => source === receipt.receipt_source),
      expectedPilotId: expected.pilotId,
      expectedLawosTenantId: expected.lawosTenantId,
      expectedEntraTenantId: expected.entraTenantId,
      expectedSourceSha: expected.sourceSha,
      expectedSourceTree: expected.sourceTree,
      expectedVersion: expected.version,
      expectedRole: gate.required_role,
      expectedOperation: gate.required_operation,
      expectedArtifactSha256: receipt.artifact_sha256,
      expectedBindingSha256: expectedBindingSha256(expected),
    });
    return true;
  } catch (error) {
    addFinding(findings, "P0", error.code ?? "RECEIPT_TRUST_INVALID", error.message, { ...context, ...(error.details ?? {}) });
    return false;
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
  const commonValid = checkCommonReceipt({ receipt: parsed.value, contractGate: gate, expected, findings, context });
  const trustValid = inspectReceiptTrust({ rootDir, receiptRef, receiptFile: parsed, receipt: parsed.value, gate, expected, findings, trustRegistry, context });
  const valid = commonValid && trustValid;
  return { state: valid && parsed.state === "verified_bytes" ? "verified" : "invalid", receipt: parsed.value, bytes: parsed.bytes, path: parsed.path, sha256: parsed.sha256, expected_sha256: parsed.expected_sha256 };
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
    const runtimeReceipt = runtime.value;
    let valid = runtime.state === "verified_bytes";
    valid = inspectReceiptTrust({ rootDir, receiptRef: runtimeRef, receiptFile: runtime, receipt: runtimeReceipt, gate: { ...gate, required_role: gate.required_runtime_roles, required_operation: gate.required_runtime_operation }, expected, findings, trustRegistry, context: { gate_id: gateId, slot: "runtime_binding" } }) && valid;
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
    runtimeResult = { state: valid ? "verified" : "invalid", receipt: runtimeReceipt, bytes: runtime.bytes, path: runtime.path, sha256: runtime.sha256, expected_sha256: runtime.expected_sha256 };
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
  if (!String(packageRef?.kind ?? "").toLowerCase().includes("dmg") || !String(packageRef?.path ?? "").toLowerCase().endsWith(".dmg")) {
    addFinding(findings, "P0", "MAC_PACKAGE_KIND_INVALID", "macOS distribution receipt must reference a DMG package.", context);
    valid = false;
  }
  if (checksumsFile.target && packageFile.target) {
    const packageName = path.basename(packageFile.target);
    const checksumText = readFileSync(checksumsFile.target, "utf8");
    const checksumLine = checksumText.split(/\r?\n/u).find((line) => line.trim().endsWith(`  ${packageName}`) || line.trim().endsWith(` *${packageName}`));
    const checksumHash = checksumLine?.trim().split(/\s+/u)[0]?.toLowerCase();
    valid = checkExact(findings, checksumHash, packageFile.sha256, "MAC_CHECKSUM_PACKAGE_MISMATCH", "checksums.sha256 does not bind the package bytes.", context) && valid;
  }
  if (sbomFile.target) {
    try {
      const sbom = JSON.parse(readFileSync(sbomFile.target, "utf8"));
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
      || contract?.receipt_trust?.root_signed_registry_required !== true
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
  const target = resolveRegularFile(rootDir, candidate, label, findings);
  if (!target) return null;
  try {
    return JSON.parse(readFileSync(target, "utf8"));
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
  const contractTarget = resolveRegularFile(root, canonicalContractPath, "external release contract", findings);
  let contract = {};
  if (contractTarget) {
    const contractBytes = readFileSync(contractTarget);
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

  let trustRegistry = null;
  if (testOnlyTrustRoot && process.env.NODE_ENV === "test" && typeof testOnlyTrustRoot === "object" && testOnlyTrustRoot.test_only !== false) {
    trustRegistry = inspectTrustRegistry({ rootDir: root, registryPath: testOnlyTrustRoot.registryPath, registrySha256: testOnlyTrustRoot.registrySha256, findings });
  } else {
    try {
      verifyProductionTrustedRegistry();
    } catch (error) {
      addFinding(findings, "P0", error.code ?? "TRUST_ROOT_NOT_CONFIGURED", "The versioned production trust-root policy has no installed governance root; caller-supplied registry paths and hashes are never production authority.", {
        policy_schema_version: PRODUCTION_TRUST_ROOT_POLICY.schema_version,
        configured: PRODUCTION_TRUST_ROOT_POLICY.configured,
        registry_installation_path: PRODUCTION_TRUST_ROOT_POLICY.registry_installation_path,
        ...(error.details ?? {}),
      });
    }
  }

  const gateReports = {};
  for (const gateId of contract.gate_order ?? []) {
    const gate = contract.gates?.[gateId];
    if (!gate) continue;
    if (gateId === "tenant_provisioning") {
      gateReports[gateId] = inspectTenantGate({ rootDir: root, input, gate, expected, findings, gateId, trustRegistry });
      continue;
    }
    const receiptRef = getPathValue(input, gate.input_path);
    let result = inspectReceipt({ rootDir: root, receiptRef, gate, expected, findings, trustRegistry });
    if (gateId === "api_artifact_deployment") result = inspectApiReceipt({ result, gate, expected, findings, gateId });
    if (gateId === "m365_consent_deployment_visibility") result = inspectM365Receipt({ result, gate, expected, findings, gateId });
    if (gateId === "macos_distribution") result = inspectMacReceipt({ rootDir: root, result, gate, findings, gateId });
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
