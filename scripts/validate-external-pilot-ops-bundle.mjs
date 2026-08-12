#!/usr/bin/env node
import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  BUNDLE_SCHEMA_VERSION,
  DEFAULT_BUNDLE_PATH,
  DEFAULT_MARKDOWN_PATH,
  assertSafeOutputPath,
  sha256File,
  writeAtomicPrivate,
} from "./generate-external-pilot-ops-bundle.mjs";
import {
  ExternalReleaseTrustError,
  TRUST_REGISTRY_SCHEMA_VERSION,
  resolveTrustedRoot,
  verifyProductionTrustedRegistry,
  verifyDetachedReceipt,
} from "./lib/external-release-trust.mjs";

const CANONICAL_TMPDIR = realpathSync(tmpdir());
export const DEFAULT_VALIDATION_PATH = path.join(CANONICAL_TMPDIR, "lawos-external-pilot-ops", "external-pilot-ops-bundle-validation.json");
export const DEFAULT_VALIDATION_MARKDOWN_PATH = path.join(CANONICAL_TMPDIR, "lawos-external-pilot-ops", "external-pilot-ops-bundle-validation.md");

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PLACEHOLDER_PATTERN = /(?:^|\b)(?:pending|tbd|todo|placeholder|required|unknown|agent[-_ ]?inferred)(?:\b|$)|<[^>]+>|\[\s*[^\]]+\s*\]/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const SOURCE_SHA_PATTERN = /^[a-f0-9]{40,64}$/i;
const ENTRA_TENANT_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const EXTERNAL_REF_PATTERN = /^(?:external|approval|signature|email|ticket|meeting):[A-Za-z0-9][A-Za-z0-9 _./:@#-]{3,}$/i;
const LOCAL_REF_PREFIXES = ["docs/", "workbook/", "contracts/", ".omo/", "scripts/", "packages/", "apps/"];
const REQUIRED_ROLE_KEYS = [
  "support_contact",
  "on_call_primary",
  "on_call_secondary",
  "incident_commander",
  "security_privacy_contact",
  "rollback_owner",
];
const REQUIRED_HUMAN_APPROVAL_ROLES = ["pilot_owner", "support_owner", "rollback_owner"];
const REQUIRED_LEGAL_APPROVAL_ROLES = ["privacy_owner", "dpa_owner", "retention_owner"];
const REQUIRED_SEVERITIES = ["P0", "P1", "P2"];
const REQUIRED_TRUST_SCOPE = "external-pilot-ops";
const SIGNED_RECEIPT_SCHEMA = "law-firm-os.external-pilot-ops-signed-receipt.v0.1";
const SIGNED_RECEIPT_SOURCE = "pilot_operations";

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFilled(value) {
  if (typeof value !== "string") return value !== null && value !== undefined;
  const text = value.trim();
  return text.length > 0 && !PLACEHOLDER_PATTERN.test(text);
}

function addFinding(findings, severity, code, message, details = {}) {
  findings.push({ severity, code, message, details });
}

function severityForMode(mode) {
  return mode === "real_data" ? "P0" : "P2";
}

function normalizeReference(value) {
  if (typeof value === "string") return { ref: value, sha256: null };
  if (isObject(value)) return { ref: value.ref ?? value.path ?? null, sha256: value.sha256 ?? null };
  return { ref: null, sha256: null };
}

function isWithin(rootReal, candidateReal) {
  const root = path.resolve(rootReal);
  const candidate = path.resolve(candidateReal);
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function nearestExisting(pathname) {
  let current = pathname;
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return current;
}

/**
 * Resolve a local reference without trusting lexical containment. A local path
 * is only accepted when its existing ancestors and file realpath remain under
 * the real evidence root. Symlink ancestors, directory references, and escapes
 * are returned as explicit states for fail-closed findings.
 */
function resolveLocalReference(rootDir, ref) {
  if (typeof ref !== "string") return { kind: "not_local" };
  const normalized = ref.replaceAll("\\", "/");
  if (!LOCAL_REF_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return { kind: "not_local" };
  let rootReal;
  let absolutePath;
  try {
    rootReal = realpathSync(path.resolve(rootDir));
    absolutePath = path.resolve(rootDir, normalized);
  } catch (error) {
    return { kind: "invalid", error: error.message };
  }
  if (!isWithin(path.resolve(rootDir), absolutePath)) return { kind: "escape", absolutePath };
  const existingAncestor = nearestExisting(path.dirname(absolutePath));
  if (!existingAncestor) return { kind: "missing", absolutePath };
  let ancestorReal;
  try {
    ancestorReal = realpathSync(existingAncestor);
  } catch (error) {
    return { kind: "invalid", absolutePath, error: error.message };
  }
  if (!isWithin(rootReal, ancestorReal)) return { kind: "escape", absolutePath, ancestorReal };
  if (!existsSync(absolutePath)) return { kind: "missing", absolutePath, ancestorReal };
  let realPath;
  try {
    realPath = realpathSync(absolutePath);
  } catch (error) {
    return { kind: "invalid", absolutePath, error: error.message };
  }
  if (!isWithin(rootReal, realPath)) return { kind: "escape", absolutePath, realPath };
  try {
    if (!statSync(realPath).isFile()) return { kind: "directory", absolutePath, realPath };
  } catch (error) {
    return { kind: "invalid", absolutePath, realPath, error: error.message };
  }
  return { kind: "file", absolutePath, realPath };
}

function validateReference({ value, fieldPath, rootDir, findings, mode, required = true, requireHash = true, requireLocal = false }) {
  const { ref, sha256 } = normalizeReference(value);
  const severity = severityForMode(mode);
  if (!isFilled(ref)) {
    if (required) addFinding(findings, severity, "REFERENCE_MISSING", `${fieldPath} requires an exact evidence reference.`, { field: fieldPath });
    return { valid: false, ref: null, sha256: null, local: false };
  }
  if (String(ref).includes("\0") || PLACEHOLDER_PATTERN.test(String(ref))) {
    addFinding(findings, severity, "REFERENCE_PLACEHOLDER", `${fieldPath} contains a placeholder or invalid path.`, { field: fieldPath, ref });
    return { valid: false, ref, sha256: null, local: false };
  }
  const local = resolveLocalReference(rootDir, ref);
  if (local.kind === "escape") {
    addFinding(findings, "P0", "REFERENCE_SYMLINK_ESCAPE", `${fieldPath} resolves outside the evidence root.`, { field: fieldPath, ref });
    return { valid: false, ref, sha256: null, local: true };
  }
  if (local.kind === "directory") {
    addFinding(findings, severity, "REFERENCE_DIRECTORY", `${fieldPath} must reference a file, not a directory.`, { field: fieldPath, ref });
    return { valid: false, ref, sha256: null, local: true };
  }
  if (local.kind === "invalid") {
    addFinding(findings, "P0", "REFERENCE_PATH_INVALID", `${fieldPath} could not be resolved safely.`, { field: fieldPath, ref, error: local.error });
    return { valid: false, ref, sha256: null, local: true };
  }
  const isLocal = local.kind === "file" || local.kind === "missing";
  if (requireLocal && !isLocal) {
    addFinding(findings, severity, "REFERENCE_LOCAL_REQUIRED", `${fieldPath} must point to local evidence so the validator can rehash it.`, { field: fieldPath, ref });
    return { valid: false, ref, sha256: null, local: false };
  }
  if (!isLocal && !EXTERNAL_REF_PATTERN.test(ref)) {
    addFinding(findings, severity, "REFERENCE_FORMAT_INVALID", `${fieldPath} must be a local evidence path or a typed external record reference.`, { field: fieldPath, ref });
    return { valid: false, ref, sha256: null, local: false };
  }
  if (requireHash && !HASH_PATTERN.test(String(sha256 ?? ""))) {
    addFinding(findings, severity, "REFERENCE_HASH_INVALID", `${fieldPath} requires a 64-character SHA-256 binding.`, { field: fieldPath, ref });
    return { valid: false, ref, sha256: null, local: isLocal };
  }
  if (local.kind === "missing") {
    addFinding(findings, severity, "REFERENCE_LOCAL_MISSING", `${fieldPath} local evidence path does not exist.`, { field: fieldPath, ref });
    return { valid: false, ref, sha256: null, local: true };
  }
  if (local.kind === "file") {
    try {
      if (mode === "real_data") {
        const permissions = statSync(local.realPath).mode & 0o777;
        if ((permissions & 0o077) !== 0) {
          addFinding(findings, "P0", "REFERENCE_NOT_PRIVATE", `${fieldPath} real-data evidence must not be group- or world-readable.`, { field: fieldPath, ref, mode: permissions.toString(8) });
          return { valid: false, ref, sha256: null, local: true, realPath: local.realPath };
        }
      }
      const actualSha256 = sha256File(local.realPath).toLowerCase();
      if (requireHash && actualSha256 !== String(sha256).toLowerCase()) {
        addFinding(findings, "P0", "REFERENCE_HASH_MISMATCH", `${fieldPath} SHA-256 does not match the referenced local evidence.`, { field: fieldPath, ref });
        return { valid: false, ref, sha256: actualSha256, local: true, realPath: local.realPath };
      }
      return { valid: true, ref, sha256: actualSha256, local: true, realPath: local.realPath };
    } catch (error) {
      addFinding(findings, "P0", "REFERENCE_REHASH_FAILED", `${fieldPath} could not be rehashed locally.`, { field: fieldPath, ref, error: error.message });
      return { valid: false, ref, sha256: null, local: true };
    }
  }
  return { valid: true, ref, sha256: sha256 ?? null, local: false };
}

function parseTimestamp(value) {
  if (typeof value !== "string" || !ISO_PATTERN.test(value)) return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  const expected = new Date(parsed).toISOString();
  const canonical = value.endsWith("Z") && !value.includes(".") ? expected.replace(".000Z", "Z") : expected;
  return canonical === value ? parsed : null;
}

function deriveBindingSha256(binding) {
  return createHash("sha256").update(JSON.stringify({
    pilot_id: binding?.pilot_id ?? null,
    lawos_tenant_id: binding?.lawos_tenant_id ?? null,
    entra_tenant_id: binding?.entra_tenant_id ?? null,
    source_sha: binding?.source_sha ?? null,
    source_tree: binding?.source_tree ?? null,
    version: binding?.version ?? null,
  })).digest("hex");
}

function rejectBundleTrustInput(bundle, findings) {
  if (bundle?.trust != null && !isObject(bundle.trust)) {
    addFinding(findings, "P0", "TRUST_INPUT_NOT_ACCEPTED", "Registry, anchor, and trust-root selection are controlled by the canonical production policy, never by bundle input.");
    return;
  }
  if (isObject(bundle?.trust) && Object.values(bundle.trust).some((value) => isFilled(value))) {
    addFinding(findings, "P0", "TRUST_INPUT_NOT_ACCEPTED", "Registry, anchor, and trust-root selection are controlled by the canonical production policy, never by bundle input.");
  }
}

function validateTimestamp(value, fieldPath, findings, mode, { required = true, nowMs } = {}) {
  if (!isFilled(value)) {
    if (required) addFinding(findings, severityForMode(mode), "TIMESTAMP_MISSING", `${fieldPath} requires a UTC timestamp.`, { field: fieldPath });
    return null;
  }
  const parsed = parseTimestamp(String(value));
  if (parsed === null) {
    addFinding(findings, severityForMode(mode), "TIMESTAMP_INVALID", `${fieldPath} must be an ISO-8601 UTC timestamp.`, { field: fieldPath, value });
    return null;
  }
  if (nowMs !== undefined && parsed > nowMs) addFinding(findings, severityForMode(mode), "TIMESTAMP_FUTURE", `${fieldPath} cannot be in the future.`, { field: fieldPath, value });
  return parsed;
}

function loadTrustContext(bundle, findings, mode, rootDir, nowMs) {
  let productionTrust;
  try {
    productionTrust = verifyProductionTrustedRegistry();
  } catch (error) {
    addFinding(findings, "P0", error instanceof ExternalReleaseTrustError ? error.code : "TRUST_ROOT_NOT_CONFIGURED", error.message, error.details ?? {});
    return null;
  }
  if (!productionTrust) {
    addFinding(findings, "P0", "TRUST_ROOT_NOT_CONFIGURED", "The canonical production trust-root policy did not provide an installed registry/anchor.");
    return null;
  }
  const registryTrust = productionTrust.registryTrust ?? productionTrust.registry ?? productionTrust;
  const registryDocument = registryTrust?.registry ?? registryTrust;
  if (!isObject(registryDocument) || !Array.isArray(registryDocument.keys)) {
    addFinding(findings, "P0", "TRUST_ROOT_NOT_CONFIGURED", "The canonical production trust-root policy did not provide a usable trusted registry.");
    return null;
  }
  if (registryDocument.schema_version !== TRUST_REGISTRY_SCHEMA_VERSION) addFinding(findings, "P0", "TRUST_REGISTRY_SCHEMA_INVALID", "Trusted registry schema is not recognized.");
  validateTimestamp(registryDocument.generated_at, "trust.registry.generated_at", findings, mode, { nowMs });
  return {
    registryRef: registryTrust.registryPath ?? registryTrust.path ?? null,
    registrySha256: registryTrust.sha256 ?? null,
    anchorRef: productionTrust.anchorPath ?? null,
    anchorSha256: productionTrust.anchorSha256 ?? null,
    scope: productionTrust.scope ?? REQUIRED_TRUST_SCOPE,
    registry: registryDocument,
    registryTrust,
  };
}

function signatureReference(value) {
  const normalized = normalizeReference(value);
  return { path: normalized.ref, sha256: normalized.sha256 };
}

function validateSignedReceipt({
  entry,
  evidence,
  fieldPath,
  role,
  operation,
  bundle,
  trustContext,
  rootDir,
  findings,
  mode,
  nowMs,
}) {
  if (!evidence?.valid || !evidence.realPath || !trustContext) return false;
  const signature = signatureReference(entry.signature_ref);
  if (!isFilled(signature.path) || !HASH_PATTERN.test(String(signature.sha256 ?? ""))) {
    addFinding(findings, "P0", "DETACHED_SIGNATURE_MISSING", `${fieldPath}.signature_ref must include a local path and exact SHA-256.`);
    return false;
  }
  let signedReceipt;
  let receiptBytes;
  try {
    receiptBytes = readFileSync(evidence.realPath);
    signedReceipt = JSON.parse(receiptBytes.toString("utf8"));
  } catch (error) {
    addFinding(findings, "P0", "SIGNED_RECEIPT_JSON_INVALID", `${fieldPath} evidence must be a signed receipt JSON document.`, { error: error.message });
    return false;
  }
  const binding = bundle.pilot_binding ?? {};
  if (entry.scope !== trustContext.scope) addFinding(findings, "P0", "DETACHED_SIGNATURE_SCOPE_INVALID", `${fieldPath}.scope must match the configured trust scope.`, { expected: trustContext.scope, actual: entry.scope });
  const expected = {
    schema_version: SIGNED_RECEIPT_SCHEMA,
    receipt_type: operation,
    receipt_source: SIGNED_RECEIPT_SOURCE,
    scope: entry.scope,
    pilot_id: binding.pilot_id,
    lawos_tenant_id: binding.lawos_tenant_id,
    entra_tenant_id: binding.entra_tenant_id,
    source_sha: binding.source_sha,
    source_tree: binding.source_tree,
    version: binding.version,
    api_artifact_sha256: binding.api_artifact_sha256,
    desktop_artifact_sha256: binding.desktop_artifact_sha256,
    binding_sha256: binding.binding_sha256,
    role,
    operation,
    issued_at: entry.approved_at ?? entry.recorded_at,
    expires_at: entry.expires_at,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (signedReceipt[field] !== value) addFinding(findings, "P0", "SIGNED_RECEIPT_BINDING_MISMATCH", `${fieldPath} signed receipt does not bind ${field} to the bundle contract.`, { field, expected: value, actual: signedReceipt[field] });
  }
  const artifactShas = [binding.api_artifact_sha256, binding.desktop_artifact_sha256].filter((value) => HASH_PATTERN.test(String(value ?? "")));
  if (!artifactShas.includes(signedReceipt.artifact_sha256)) {
    addFinding(findings, "P0", "SIGNED_RECEIPT_BINDING_MISMATCH", `${fieldPath} signed receipt does not bind artifact_sha256 to an exact API or desktop artifact.`, { field: "artifact_sha256", expected: artifactShas, actual: signedReceipt.artifact_sha256 });
  }
  const issuedMs = validateTimestamp(signedReceipt.issued_at, `${fieldPath}.signed_receipt.issued_at`, findings, mode, { nowMs });
  const expiresMs = validateTimestamp(signedReceipt.expires_at, `${fieldPath}.signed_receipt.expires_at`, findings, mode, { nowMs: undefined });
  if (expiresMs !== null && expiresMs <= nowMs) addFinding(findings, "P0", "DETACHED_SIGNATURE_EXPIRED", `${fieldPath} signed receipt is expired.`);
  if (issuedMs !== null && expiresMs !== null && expiresMs <= issuedMs) addFinding(findings, "P0", "DETACHED_SIGNATURE_TIMESTAMP_ORDER_INVALID", `${fieldPath} signed receipt expiry must be after issued time.`);
  try {
    verifyDetachedReceipt({
      rootDir,
      receiptRef: {
        path: evidence.ref,
        sha256: evidence.sha256,
        signature_ref: signature,
      },
      receiptBytes,
      receipt: signedReceipt,
      registry: trustContext.registryTrust,
      expectedReceiptType: operation,
      expectedReceiptSource: SIGNED_RECEIPT_SOURCE,
      expectedPilotId: binding.pilot_id,
      expectedLawosTenantId: binding.lawos_tenant_id,
      expectedEntraTenantId: binding.entra_tenant_id,
      expectedSourceSha: binding.source_sha,
      expectedSourceTree: binding.source_tree,
      expectedVersion: binding.version,
      expectedRole: role,
      expectedOperation: operation,
      expectedArtifactSha256: artifactShas,
      expectedBindingSha256: binding.binding_sha256,
      now: nowMs,
    });
    return true;
  } catch (error) {
    addFinding(findings, "P0", error instanceof ExternalReleaseTrustError ? error.code : "DETACHED_SIGNATURE_VERIFY_FAILED", error.message, error.details ?? {});
    return false;
  }
}

function validateReceiptMetadata(receipt, fieldPath, findings, mode, rootDir, {
  requireLocal = false,
  bundle,
  trustContext,
  role,
  operation,
  nowMs,
} = {}) {
  if (!isObject(receipt)) {
    addFinding(findings, severityForMode(mode), "RECEIPT_MISSING", `${fieldPath} must be an object.`, { field: fieldPath });
    return { valid: false, evidence: null };
  }
  const evidence = validateReference({ value: receipt, fieldPath: `${fieldPath}.ref`, rootDir, findings, mode, requireLocal });
  if (!isFilled(receipt.scope)) addFinding(findings, severityForMode(mode), "RECEIPT_SCOPE_MISSING", `${fieldPath}.scope is required.`, { field: `${fieldPath}.scope` });
  if (mode === "real_data" && trustContext && receipt.scope !== trustContext.scope) addFinding(findings, "P0", "RECEIPT_SCOPE_INVALID", `${fieldPath}.scope must match the configured trust scope.`, { expected: trustContext.scope, actual: receipt.scope });
  if (!isFilled(receipt.signature_ref)) addFinding(findings, severityForMode(mode), "RECEIPT_SIGNATURE_MISSING", `${fieldPath}.signature_ref is required.`, { field: `${fieldPath}.signature_ref` });
  const issuedMs = validateTimestamp(receipt.recorded_at, `${fieldPath}.recorded_at`, findings, mode, { nowMs });
  const expiryMs = validateTimestamp(receipt.expires_at, `${fieldPath}.expires_at`, findings, mode, { nowMs: undefined });
  if (expiryMs !== null && expiryMs <= (nowMs ?? Date.now())) addFinding(findings, severityForMode(mode), "RECEIPT_EXPIRED", `${fieldPath}.expires_at is not in the future.`, { field: `${fieldPath}.expires_at`, expires_at: receipt.expires_at });
  if (issuedMs !== null && expiryMs !== null && expiryMs <= issuedMs) addFinding(findings, severityForMode(mode), "RECEIPT_TIMESTAMP_ORDER_INVALID", `${fieldPath}.expires_at must be after recorded_at.`);
  if (bundle && mode === "real_data") validateSignedReceipt({ entry: receipt, evidence, fieldPath, role, operation, bundle, trustContext, rootDir, findings, mode, nowMs });
  return { valid: evidence.valid, evidence };
}

function validateRoleSlots(bundle, findings, mode, rootDir, trustContext, nowMs) {
  for (const key of REQUIRED_ROLE_KEYS) {
    const slot = bundle.roles?.[key];
    if (!isObject(slot)) {
      addFinding(findings, severityForMode(mode), "ROLE_SLOT_MISSING", `roles.${key} must be an object slot.`, { field: `roles.${key}` });
      continue;
    }
    for (const field of ["role", "name", "team", "channel", "coverage", "timezone"]) {
      if (!isFilled(slot[field])) addFinding(findings, severityForMode(mode), "ROLE_FIELD_MISSING", `roles.${key}.${field} is required.`, { field: `roles.${key}.${field}` });
    }
    if (mode === "real_data") {
      const approvalEvidence = validateReference({ value: slot.approval_ref, fieldPath: `roles.${key}.approval_ref`, rootDir, findings, mode, requireLocal: true });
      const approvalRef = isObject(slot.approval_ref) ? slot.approval_ref : {};
      const approvalEntry = {
        scope: approvalRef.scope,
        signature_ref: approvalRef.signature_ref,
        approved_at: approvalRef.approved_at ?? approvalRef.issued_at,
        expires_at: approvalRef.expires_at,
      };
      validateSignedReceipt({ entry: approvalEntry, evidence: approvalEvidence, fieldPath: `roles.${key}.approval_ref`, role: key, operation: "role_assignment", bundle, trustContext, rootDir, findings, mode, nowMs });
      const receipt = slot.receipt;
      if (!isObject(receipt) || receipt.outcome !== "passed") addFinding(findings, "P0", `ROLE_RECEIPT_NOT_PASSED_${key}`, `roles.${key}.receipt must be a passed locally rehashed support/on-call receipt.`);
      else {
        validateReceiptMetadata(receipt, `roles.${key}.receipt`, findings, mode, rootDir, { requireLocal: true, bundle, trustContext, role: key, operation: "support_receipt", nowMs });
        if (!isFilled(receipt.recorded_by)) addFinding(findings, "P0", "ROLE_RECEIPT_RECORDER_MISSING", `roles.${key}.receipt.recorded_by is required.`, { field: `roles.${key}.receipt.recorded_by` });
      }
    } else if (slot.receipt?.outcome !== "pending") {
      addFinding(findings, "P1", "SYNTHETIC_ROLE_RECEIPT_PRESENT", `Synthetic-only bundle must not claim a support/on-call receipt for ${key}.`, { field: `roles.${key}.receipt` });
    }
  }
}

function validateApprovals(bundle, findings, mode, rootDir, trustContext, nowMs) {
  const validateGroup = (group, requiredRoles, label) => {
    if (!Array.isArray(group)) {
      addFinding(findings, severityForMode(mode), "APPROVAL_GROUP_MISSING", `approvals.${label} must be an array.`, { field: `approvals.${label}` });
      return;
    }
    const byRole = new Map(group.filter(isObject).map((entry) => [entry.role, entry]));
    for (const role of requiredRoles) {
      const entry = byRole.get(role);
      if (!entry) {
        addFinding(findings, severityForMode(mode), "APPROVAL_ROLE_MISSING", `approvals.${label} is missing ${role}.`, { role, group: label });
        continue;
      }
      if (mode === "real_data") {
        const evidence = validateReference({ value: entry, fieldPath: `approvals.${label}.${role}.ref`, rootDir, findings, mode, requireLocal: true });
        if (entry.outcome !== "approved" && entry.outcome !== "accepted") addFinding(findings, "P0", "APPROVAL_OUTCOME_INVALID", `approvals.${label}.${role}.outcome must be approved or accepted.`, { role, group: label, outcome: entry.outcome });
        if (!isFilled(entry.scope)) addFinding(findings, "P0", "APPROVAL_SCOPE_MISSING", `approvals.${label}.${role}.scope is required.`, { role, group: label });
        if (!isFilled(entry.signature_ref)) addFinding(findings, "P0", "APPROVAL_SIGNATURE_MISSING", `approvals.${label}.${role}.signature_ref is required.`, { role, group: label });
        validateTimestamp(entry.approved_at, `approvals.${label}.${role}.approved_at`, findings, mode, { nowMs });
        const expiryMs = validateTimestamp(entry.expires_at, `approvals.${label}.${role}.expires_at`, findings, mode, { nowMs: undefined });
        if (expiryMs !== null && expiryMs <= nowMs) addFinding(findings, "P0", "APPROVAL_EXPIRED", `approvals.${label}.${role}.expires_at is not in the future.`, { role, group: label });
        if (!isFilled(entry.approved_by)) addFinding(findings, "P0", "APPROVER_MISSING", `approvals.${label}.${role}.approved_by is required.`, { role, group: label });
        validateSignedReceipt({ entry, evidence, fieldPath: `approvals.${label}.${role}`, role, operation: "approval", bundle, trustContext, rootDir, findings, mode, nowMs });
      } else if (isFilled(entry.ref) || isFilled(entry.approved_by) || isFilled(entry.approved_at)) {
        addFinding(findings, "P1", "SYNTHETIC_APPROVAL_PRESENT", `Synthetic-only bundle must not claim an approval receipt in approvals.${label}.${role}.`, { role, group: label });
      }
    }
  };
  validateGroup(bundle.approvals?.human, REQUIRED_HUMAN_APPROVAL_ROLES, "human");
  validateGroup(bundle.approvals?.legal, REQUIRED_LEGAL_APPROVAL_ROLES, "legal");
}

function validateMonitoring(bundle, findings, mode, rootDir, trustContext, nowMs) {
  const monitoring = bundle.monitoring;
  if (!isObject(monitoring)) {
    addFinding(findings, severityForMode(mode), "MONITORING_MISSING", "monitoring section is required.");
    return;
  }
  for (const field of ["dashboard_ref", "threshold_basis_ref"]) {
    if (mode === "real_data") validateReference({ value: monitoring[field], fieldPath: `monitoring.${field}`, rootDir, findings, mode, requireLocal: true });
    else if (!isFilled(monitoring[field])) addFinding(findings, severityForMode(mode), "MONITORING_FIELD_MISSING", `monitoring.${field} is required.`, { field: `monitoring.${field}` });
  }
  if (!isFilled(monitoring.observation_window)) addFinding(findings, severityForMode(mode), "MONITORING_FIELD_MISSING", "monitoring.observation_window is required.");
  if (!Array.isArray(monitoring.alert_channels) || monitoring.alert_channels.length === 0) addFinding(findings, severityForMode(mode), "MONITORING_CHANNELS_MISSING", "monitoring.alert_channels must contain at least one channel.");
  else if (mode === "real_data") monitoring.alert_channels.forEach((channel, index) => validateReference({ value: channel, fieldPath: `monitoring.alert_channels[${index}]`, rootDir, findings, mode, requireLocal: true }));
  const thresholds = monitoring.thresholds;
  for (const field of ["error_rate_percent", "p95_latency_ms", "auth_failure_rate_percent", "backup_age_minutes", "critical_alert_count"]) {
    const value = thresholds?.[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) addFinding(findings, severityForMode(mode), "MONITORING_THRESHOLD_INVALID", `monitoring.thresholds.${field} must be a finite non-negative number.`, { field: `monitoring.thresholds.${field}`, value });
  }
  const receipt = monitoring.receipt;
  if (!isObject(receipt)) {
    addFinding(findings, severityForMode(mode), "MONITORING_RECEIPT_MISSING", "monitoring.receipt is required.");
    return;
  }
  if (mode === "real_data") {
    if (receipt.outcome !== "passed") addFinding(findings, "P0", "MONITORING_RECEIPT_NOT_PASSED", "monitoring.receipt.outcome must be passed before real-data mode.", { value: receipt.outcome });
    validateReceiptMetadata(receipt, "monitoring.receipt", findings, mode, rootDir, { requireLocal: true, bundle, trustContext, role: "monitoring", operation: "monitoring_receipt", nowMs });
    if (!isFilled(receipt.recorded_by)) addFinding(findings, "P0", "MONITORING_RECEIPT_RECORDER_MISSING", "monitoring.receipt.recorded_by is required.");
  } else if (receipt.outcome !== "pending" || isFilled(receipt.ref)) addFinding(findings, "P1", "SYNTHETIC_MONITORING_RECEIPT_PRESENT", "Synthetic-only bundle must not claim a monitoring receipt.");
}

function validateIncidentEscalation(bundle, findings, mode, rootDir, trustContext, nowMs) {
  const escalation = bundle.incident_escalation;
  if (!isObject(escalation)) {
    addFinding(findings, severityForMode(mode), "ESCALATION_MISSING", "incident_escalation section is required.");
    return;
  }
  if (mode === "real_data") {
    validateReference({ value: escalation.incident_channel, fieldPath: "incident_escalation.incident_channel", rootDir, findings, mode, requireLocal: true });
    validateReference({ value: escalation.escalation_policy_ref, fieldPath: "incident_escalation.escalation_policy_ref", rootDir, findings, mode, requireLocal: true });
  } else {
    for (const field of ["incident_channel", "escalation_policy_ref"]) if (!isFilled(escalation[field])) addFinding(findings, severityForMode(mode), "ESCALATION_FIELD_MISSING", `incident_escalation.${field} is required.`, { field: `incident_escalation.${field}` });
  }
  if (typeof escalation.acknowledgement_sla_minutes !== "number" || !Number.isFinite(escalation.acknowledgement_sla_minutes) || escalation.acknowledgement_sla_minutes < 0) addFinding(findings, severityForMode(mode), "ESCALATION_SLA_INVALID", "incident_escalation.acknowledgement_sla_minutes must be a finite non-negative number.");
  if (!Array.isArray(escalation.levels)) addFinding(findings, severityForMode(mode), "ESCALATION_LEVELS_MISSING", "incident_escalation.levels must include P0/P1/P2 routes.");
  else {
    const bySeverity = new Map(escalation.levels.filter(isObject).map((level) => [level.severity, level]));
    for (const severity of REQUIRED_SEVERITIES) {
      const level = bySeverity.get(severity);
      if (!level) {
        addFinding(findings, severityForMode(mode), "ESCALATION_LEVEL_MISSING", `incident_escalation.levels is missing ${severity}.`, { severity });
        continue;
      }
      if (!Array.isArray(level.notify_roles) || level.notify_roles.length === 0) addFinding(findings, severityForMode(mode), "ESCALATION_ROUTE_MISSING", `${severity} must name at least one notification role.`, { severity });
      if (typeof level.acknowledgement_minutes !== "number" || !Number.isFinite(level.acknowledgement_minutes) || level.acknowledgement_minutes < 0) addFinding(findings, severityForMode(mode), "ESCALATION_ACK_INVALID", `${severity}.acknowledgement_minutes must be a finite non-negative number.`, { severity });
      if (mode === "real_data") validateReference({ value: level.escalation_ref, fieldPath: `incident_escalation.levels.${severity}.escalation_ref`, rootDir, findings, mode, requireLocal: true });
    }
  }
  const receipt = escalation.tabletop_receipt;
  if (mode === "real_data") {
    if (!isObject(receipt) || receipt.outcome !== "passed") addFinding(findings, "P0", "ESCALATION_TABLETOP_NOT_PASSED", "incident_escalation.tabletop_receipt must be a passed receipt before real-data mode.");
    else validateReceiptMetadata(receipt, "incident_escalation.tabletop_receipt", findings, mode, rootDir, { requireLocal: true, bundle, trustContext, role: "incident_escalation", operation: "incident_escalation_tabletop", nowMs });
  } else if (receipt?.outcome !== "pending") addFinding(findings, "P1", "SYNTHETIC_ESCALATION_RECEIPT_PRESENT", "Synthetic-only bundle must not claim a tabletop receipt.");
}

function validatePrivacy(bundle, findings, mode, rootDir, trustContext, nowMs) {
  const privacy = bundle.privacy_dpa_retention;
  if (!isObject(privacy)) {
    addFinding(findings, severityForMode(mode), "PRIVACY_SECTION_MISSING", "privacy_dpa_retention section is required.");
    return;
  }
  if (privacy.no_legal_text_generated !== true) addFinding(findings, "P0", "LEGAL_TEXT_BOUNDARY_DRIFT", "Bundle must not generate or carry fabricated legal text.");
  if (isFilled(privacy.legal_text)) addFinding(findings, "P0", "LEGAL_TEXT_PRESENT", "No legal text may be supplied in this reference-only bundle.");
  const refs = ["privacy_acceptance_ref", "dpa_acceptance_ref", "retention_acceptance_ref", "subprocessor_decision_ref", "legal_hold_policy_ref", "deletion_exit_acceptance_ref"];
  if (mode === "real_data") {
    if (privacy.acceptance_status !== "accepted") addFinding(findings, "P0", "PRIVACY_ACCEPTANCE_NOT_ACCEPTED", "privacy_dpa_retention.acceptance_status must be accepted before real-data mode.");
    for (const field of refs) validateReference({ value: privacy[field], fieldPath: `privacy_dpa_retention.${field}`, rootDir, findings, mode, requireLocal: true });
    const receipt = privacy.legal_review_receipt;
    if (!isObject(receipt) || receipt.outcome !== "passed") addFinding(findings, "P0", "LEGAL_RECEIPT_NOT_PASSED", "privacy_dpa_retention.legal_review_receipt must be a passed receipt before real-data mode.");
    else {
      validateReceiptMetadata(receipt, "privacy_dpa_retention.legal_review_receipt", findings, mode, rootDir, { requireLocal: true, bundle, trustContext, role: "privacy_dpa_retention", operation: "privacy_dpa_retention", nowMs });
      if (!isFilled(receipt.recorded_by)) addFinding(findings, "P0", "LEGAL_RECEIPT_RECORDER_MISSING", "privacy_dpa_retention.legal_review_receipt.recorded_by is required.");
    }
  } else {
    if (privacy.acceptance_status !== "pending") addFinding(findings, "P1", "SYNTHETIC_PRIVACY_ACCEPTANCE_PRESENT", "Synthetic-only bundle must not claim privacy/DPA/retention acceptance.");
    for (const field of refs) if (isFilled(privacy[field])) addFinding(findings, "P1", "SYNTHETIC_LEGAL_REFERENCE_PRESENT", `Synthetic-only bundle must not claim ${field}.`, { field });
  }
}

function validateBackupRestore(bundle, findings, mode, rootDir, trustContext, nowMs) {
  const backup = bundle.backup_restore;
  if (!isObject(backup)) {
    addFinding(findings, severityForMode(mode), "BACKUP_SECTION_MISSING", "backup_restore section is required.");
    return;
  }
  if (backup.restore_target !== "isolated" || backup.isolated_restore_required !== true) addFinding(findings, "P0", "BACKUP_ISOLATION_BOUNDARY_DRIFT", "Backup/restore acceptance must target an isolated restore.");
  for (const field of ["rpo_minutes", "rto_minutes", "restored_object_count"]) {
    const value = backup[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) addFinding(findings, severityForMode(mode), "BACKUP_RECEIPT_METRIC_INVALID", `backup_restore.${field} must be a finite non-negative number.`, { field, value });
  }
  if (mode === "real_data") {
    if (backup.outcome !== "passed") addFinding(findings, "P0", "BACKUP_RECEIPT_NOT_PASSED", "backup_restore.outcome must be passed before real-data mode.");
    const backupReference = normalizeReference(backup.receipt_ref);
    const receipt = {
      ref: backupReference.ref,
      sha256: backup.receipt_sha256 ?? backupReference.sha256,
      scope: backup.scope,
      expires_at: backup.expires_at,
      signature_ref: backup.signature_ref,
      recorded_at: backup.recorded_at,
    };
    validateReceiptMetadata(receipt, "backup_restore.receipt", findings, mode, rootDir, { requireLocal: true, bundle, trustContext, role: "backup_restore", operation: "backup_restore", nowMs });
    if (!isFilled(backup.recorded_by)) addFinding(findings, "P0", "BACKUP_RECEIPT_RECORDER_MISSING", "backup_restore.recorded_by is required.");
    validateReference({ value: backup.backup_scope_ref, fieldPath: "backup_restore.backup_scope_ref", rootDir, findings, mode, requireLocal: true });
  } else if (backup.outcome !== "pending" || isFilled(backup.receipt_ref)) addFinding(findings, "P1", "SYNTHETIC_BACKUP_RECEIPT_PRESENT", "Synthetic-only bundle must not claim a backup/restore receipt.");
}

function validatePilotBinding(bundle, findings, mode, rootDir) {
  const binding = bundle.pilot_binding;
  const severity = severityForMode(mode);
  if (!isObject(binding)) {
    addFinding(findings, severity, "PILOT_BINDING_MISSING", "pilot_binding is required to bind the bundle to one exact pilot scope.");
    return;
  }
  for (const legacy of ["tenant_id", "tenant_ref", "tenant_sha256"]) if (Object.hasOwn(binding, legacy)) addFinding(findings, "P0", "LEGACY_TENANT_ALIAS_REJECTED", `pilot_binding.${legacy} is not accepted; LawOS and Entra tenant identifiers must be explicit and separate.`);
  if (!isFilled(binding.pilot_id)) addFinding(findings, severity, "PILOT_ID_MISSING", "pilot_binding.pilot_id is required and must be an exact human-selected identifier.");
  if (mode === "real_data") {
    if (!isFilled(binding.lawos_tenant_id)) addFinding(findings, "P0", "LAWOS_TENANT_ID_MISSING", "pilot_binding.lawos_tenant_id is required.");
    if (!isFilled(binding.entra_tenant_id)) addFinding(findings, "P0", "ENTRA_TENANT_ID_MISSING", "pilot_binding.entra_tenant_id is required.");
    if (isFilled(binding.lawos_tenant_id) && isFilled(binding.entra_tenant_id) && binding.lawos_tenant_id === binding.entra_tenant_id) addFinding(findings, "P0", "TENANT_IDENTIFIERS_NOT_DISTINCT", "LawOS and Entra tenant identifiers must be distinct; aliases and fallback are forbidden.");
    if (isFilled(binding.entra_tenant_id) && !ENTRA_TENANT_UUID_PATTERN.test(binding.entra_tenant_id)) addFinding(findings, "P0", "ENTRA_TENANT_ID_INVALID", "pilot_binding.entra_tenant_id must be a tenant UUID.");
  }
  const digestRefs = [
    ["lawos_tenant_ref", "lawos_tenant_sha256"],
    ["entra_tenant_ref", "entra_tenant_sha256"],
    ["entra_application_ref", "entra_application_sha256"],
    ["roster_ref", "roster_sha256"],
    ["api_artifact_ref", "api_artifact_sha256"],
    ["desktop_artifact_ref", "desktop_artifact_sha256"],
  ];
  for (const [refField, hashField] of digestRefs) {
    const normalized = normalizeReference(binding[refField]);
    const valid = validateReference({ value: { ref: normalized.ref, sha256: binding[hashField] ?? normalized.sha256 }, fieldPath: `pilot_binding.${refField}`, rootDir, findings, mode, requireLocal: mode === "real_data" });
    if (!valid.valid && mode === "synthetic_only" && (isFilled(binding[refField]) || isFilled(binding[hashField]))) addFinding(findings, "P1", "SYNTHETIC_PILOT_BINDING_PRESENT", `Synthetic-only bundle must not claim a ${refField} binding without the real-data gate.`, { field: `pilot_binding.${refField}` });
  }
  if (mode === "real_data") {
    const source = normalizeReference(binding.source_ref);
    if (!isFilled(source.ref)) addFinding(findings, "P0", "SOURCE_REF_MISSING", "pilot_binding.source_ref is required.");
    else validateReference({ value: { ref: source.ref, sha256: binding.source_ref_sha256 ?? source.sha256 }, fieldPath: "pilot_binding.source_ref", rootDir, findings, mode, requireLocal: true });
    if (!SOURCE_SHA_PATTERN.test(String(binding.source_sha ?? ""))) addFinding(findings, "P0", "SOURCE_SHA_INVALID", "pilot_binding.source_sha must be an exact source commit SHA.");
    if (!SOURCE_SHA_PATTERN.test(String(binding.source_tree ?? ""))) addFinding(findings, "P0", "SOURCE_TREE_INVALID", "pilot_binding.source_tree must be an exact source tree SHA.");
    if (!isFilled(binding.version)) addFinding(findings, "P0", "VERSION_MISSING", "pilot_binding.version is required for exact receipt binding.");
    if (!HASH_PATTERN.test(String(binding.binding_sha256 ?? ""))) addFinding(findings, "P0", "BINDING_SHA256_INVALID", "pilot_binding.binding_sha256 must be an exact SHA-256 binding.");
    const expectedBindingSha256 = deriveBindingSha256(binding);
    if (HASH_PATTERN.test(String(binding.binding_sha256 ?? "")) && binding.binding_sha256.toLowerCase() !== expectedBindingSha256) addFinding(findings, "P0", "BINDING_SHA256_MISMATCH", "pilot_binding.binding_sha256 must match the canonical pilot/tenant/source/version binding digest.", { expected: expectedBindingSha256, actual: binding.binding_sha256 });
  } else if (isFilled(binding.source_sha) || isFilled(binding.source_tree) || isFilled(binding.source_ref)) addFinding(findings, "P1", "SYNTHETIC_SOURCE_BINDING_PRESENT", "Synthetic-only bundle must not claim source SHA/tree binding.");
}

export function validateExternalPilotOpsBundle(bundle, options = {}) {
  const optionObject = isObject(options) ? options : {};
  const rootDir = optionObject.rootDir ?? ROOT;
  if (Object.hasOwn(optionObject, "now")) throw new Error("NOW_OVERRIDE_FORBIDDEN: deterministic clock injection is not part of the public validator API");
  resolveTrustedRoot(rootDir);
  const findings = [];
  const mode = bundle?.data_boundary?.requested_mode;
  const nowMs = Date.now();
  if (!isObject(bundle)) return { verdict: "FAIL", operational_status: "blocked", findings: [{ severity: "P0", code: "BUNDLE_INVALID", message: "Bundle must be a JSON object.", details: {} }] };
  if (bundle.schema_version !== BUNDLE_SCHEMA_VERSION) addFinding(findings, "P0", "SCHEMA_VERSION", "Unexpected external pilot ops bundle schema version.", { actual: bundle.schema_version });
  if (bundle.bundle_id !== "external-pilot-ops") addFinding(findings, "P0", "BUNDLE_ID", "Unexpected external pilot ops bundle ID.", { actual: bundle.bundle_id });
  rejectBundleTrustInput(bundle, findings);
  validateTimestamp(bundle.generated_at, "generated_at", findings, mode, { nowMs });
  if (bundle.status !== "TEMPLATE_ONLY" || bundle.operational_status !== "PENDING_EXTERNAL_APPROVAL") addFinding(findings, "P0", "STATUS_CLAIM_UNSUPPORTED", "Bundle status is derived by validation and must remain TEMPLATE_ONLY/PENDING_EXTERNAL_APPROVAL in source input.", { status: bundle.status, operational_status: bundle.operational_status });
  if (Object.values(bundle.claims ?? {}).some((value) => value === true) || bundle.external_pilot_ready === true || bundle.real_data_ready === true || bundle.go_live_ready === true || bundle.data_boundary?.real_data_authorized === true) addFinding(findings, "P0", "CLAIMS_NOT_ACCEPTED", "Readiness claims from input are ignored; remove true claims and let the validator derive status.");
  if (!["synthetic_only", "real_data"].includes(mode)) addFinding(findings, "P0", "DATA_MODE_INVALID", "data_boundary.requested_mode must be synthetic_only or real_data.", { actual: mode });
  const expectedFalseBoundaryFields = ["external_pilot_ops_bundle_only", "provider_calls_executed", "external_systems_contacted", "real_data_read", "real_data_written", "external_pilot_distribution_enabled", "go_live_approved_by_bundle", "production_cutover_approved_by_bundle", "legal_text_generated_by_bundle"];
  if (bundle.boundary?.external_pilot_ops_bundle_only !== true) addFinding(findings, "P0", "BUNDLE_BOUNDARY_IDENTITY", "Bundle boundary identity must be true.");
  for (const field of expectedFalseBoundaryFields.slice(1)) if (bundle.boundary?.[field] !== false) addFinding(findings, "P0", `BOUNDARY_${field}`, `${field} must remain false.`, { actual: bundle.boundary?.[field] });
  if (bundle.template_policy?.generated_offline !== true || bundle.template_policy?.contains_real_data !== false || bundle.template_policy?.contains_fabricated_legal_text !== false || bundle.template_policy?.blank_fields_require_human_completion !== true) addFinding(findings, "P0", "TEMPLATE_POLICY_BOUNDARY", "Template policy must remain offline, real-data-free, and require human completion for blank fields.");
  const requiredFields = bundle.required_fields;
  const requiredFieldShape = {
    roles: REQUIRED_ROLE_KEYS,
    human_approval_roles: REQUIRED_HUMAN_APPROVAL_ROLES,
    legal_approval_roles: REQUIRED_LEGAL_APPROVAL_ROLES,
    receipts: ["monitoring", "privacy_dpa_retention", "backup_restore"],
  };
  for (const [field, expected] of Object.entries(requiredFieldShape)) {
    if (!Array.isArray(requiredFields?.[field]) || JSON.stringify(requiredFields[field]) !== JSON.stringify(expected)) addFinding(findings, "P0", "REQUIRED_FIELDS_DRIFT", `required_fields.${field} must match the fixed operational contract.`, { field, expected, actual: requiredFields?.[field] });
  }
  const dataBoundary = bundle.data_boundary;
  if (mode === "synthetic_only") {
    if (dataBoundary.synthetic_only !== true || dataBoundary.real_data_present !== false || dataBoundary.real_data_authorized !== false) addFinding(findings, "P0", "SYNTHETIC_BOUNDARY_DRIFT", "Synthetic-only mode must keep real-data flags and authorization false.");
  } else if (mode === "real_data" && (dataBoundary.synthetic_only !== false || dataBoundary.real_data_present !== true)) addFinding(findings, "P0", "REAL_DATA_FLAG_INVALID", "Real-data mode requires synthetic_only=false and real_data_present=true.");
  if (dataBoundary?.real_data_execution !== "not_executed") addFinding(findings, "P0", "REAL_DATA_EXECUTION_FLAG_DRIFT", "real_data_execution must remain not_executed in this offline bundle.", { actual: dataBoundary?.real_data_execution });
  if (dataBoundary?.transition_gate?.provider_calls_performed_by_generator !== false) addFinding(findings, "P0", "GENERATOR_PROVIDER_BOUNDARY_DRIFT", "The generator provider-call attestation must remain false.");
  for (const field of ["exact_human_approval_refs_required", "exact_legal_approval_refs_required", "monitoring_receipt_required", "backup_restore_receipt_required"]) if (dataBoundary?.transition_gate?.[field] !== true) addFinding(findings, "P0", "TRANSITION_GATE_REQUIREMENT_DRIFT", `${field} must remain true.`, { field, actual: dataBoundary?.transition_gate?.[field] });

  const trustContext = mode === "real_data" ? loadTrustContext(bundle, findings, mode, rootDir, nowMs) : null;
  validatePilotBinding(bundle, findings, mode, rootDir);
  validateRoleSlots(bundle, findings, mode, rootDir, trustContext, nowMs);
  validateApprovals(bundle, findings, mode, rootDir, trustContext, nowMs);
  validateMonitoring(bundle, findings, mode, rootDir, trustContext, nowMs);
  validateIncidentEscalation(bundle, findings, mode, rootDir, trustContext, nowMs);
  validatePrivacy(bundle, findings, mode, rootDir, trustContext, nowMs);
  validateBackupRestore(bundle, findings, mode, rootDir, trustContext, nowMs);

  const gateFailed = findings.some((finding) => finding.severity === "P0" || finding.severity === "P1");
  if (mode === "real_data" && gateFailed) addFinding(findings, "P0", "REAL_DATA_NOT_AUTHORIZED", "Real-data authorization is derived only after every exact binding, approval, monitoring, escalation, privacy, and DR gate passes.");
  const p0Count = findings.filter((finding) => finding.severity === "P0").length;
  const p1Count = findings.filter((finding) => finding.severity === "P1").length;
  const p2Count = findings.filter((finding) => finding.severity === "P2").length;
  const verdict = p0Count + p1Count > 0 ? "FAIL" : "PASS";
  return {
    verdict,
    operational_status: verdict === "FAIL" ? "blocked" : p2Count > 0 ? "pending_required_fields" : "ready",
    findings,
    summary: {
      requested_data_mode: mode,
      synthetic_only: dataBoundary?.synthetic_only === true,
      real_data_present: dataBoundary?.real_data_present === true,
      real_data_authorized: mode === "real_data" && !gateFailed,
      finding_count: findings.length,
      p0_count: p0Count,
      p1_count: p1Count,
      p2_count: p2Count,
    },
    boundary: {
      provider_calls_executed: false,
      external_systems_contacted: false,
      real_data_read: false,
      real_data_written: false,
      external_pilot_distribution_enabled: false,
      go_live_approved_by_validation: false,
      production_cutover_approved_by_validation: false,
    },
  };
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

export function renderExternalPilotOpsValidationMarkdown(report) {
  const lines = [
    "# External Pilot Operations Bundle Validation",
    "",
    `Verdict: ${report.verdict}`,
    `Operational status: ${report.operational_status}`,
    `Bundle SHA-256: ${report.bundle_sha256}`,
    "",
    "## Boundary",
    "",
    "- Validation is offline and performs no provider calls.",
    "- It does not approve external-pilot distribution, production cutover, or go-live.",
    "- Real-data mode is fail-closed until exact signed human/legal approvals and monitoring/backup-restore receipts pass.",
    "- Legal/DPA/retention content is reference-only; no legal text is generated.",
    "",
    "## Summary",
    "",
  ];
  for (const [key, value] of Object.entries(report.summary ?? {})) lines.push(`- ${key}: ${Array.isArray(value) ? value.join(", ") : value}`);
  lines.push("", "## Findings", "");
  if (!report.findings?.length) lines.push("No findings.");
  else {
    lines.push("| Severity | Code | Message |", "| --- | --- | --- |");
    for (const finding of report.findings) lines.push(`| ${finding.severity} | ${finding.code} | ${markdownCell(finding.message)} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

export function validateExternalPilotOpsBundleFile(options = {}) {
  const optionObject = isObject(options) ? options : {};
  const rootDir = optionObject.rootDir ?? ROOT;
  const bundlePath = optionObject.bundlePath ?? DEFAULT_BUNDLE_PATH;
  const markdownPath = optionObject.markdownPath ?? DEFAULT_MARKDOWN_PATH;
  const validationPath = optionObject.validationPath ?? DEFAULT_VALIDATION_PATH;
  const validationMarkdownPath = optionObject.validationMarkdownPath ?? DEFAULT_VALIDATION_MARKDOWN_PATH;
  if (Object.hasOwn(optionObject, "now")) throw new Error("NOW_OVERRIDE_FORBIDDEN: deterministic clock injection is not part of the public validator API");
  resolveTrustedRoot(rootDir);
  const absoluteBundle = path.resolve(rootDir, bundlePath);
  const absoluteMarkdown = path.resolve(rootDir, markdownPath);
  const absoluteValidation = assertSafeOutputPath(rootDir, path.resolve(rootDir, validationPath));
  const absoluteValidationMarkdown = assertSafeOutputPath(rootDir, path.resolve(rootDir, validationMarkdownPath));
  let bundle;
  try {
    bundle = readJson(absoluteBundle);
  } catch (error) {
    const report = {
      schema_version: "law-firm-os.external-pilot-ops-bundle-validation.v0.1",
      verdict: "FAIL",
      operational_status: "blocked",
      bundle_sha256: null,
      summary: { requested_data_mode: null, finding_count: 1, p0_count: 1, p1_count: 0, p2_count: 0 },
      boundary: { provider_calls_executed: false, external_systems_contacted: false, real_data_read: false, real_data_written: false, external_pilot_distribution_enabled: false, go_live_approved_by_validation: false, production_cutover_approved_by_validation: false },
      findings: [{ severity: "P0", code: "BUNDLE_READ_FAILED", message: error.message, details: { path: bundlePath } }],
    };
    writeAtomicPrivate(absoluteValidation, `${JSON.stringify(report, null, 2)}\n`, 0o600, { rootDir });
    writeAtomicPrivate(absoluteValidationMarkdown, renderExternalPilotOpsValidationMarkdown(report), 0o600, { rootDir });
    return report;
  }
  const validation = validateExternalPilotOpsBundle(bundle, { rootDir });
  const report = {
    schema_version: "law-firm-os.external-pilot-ops-bundle-validation.v0.1",
    generated_at: new Date().toISOString(),
    source_bundle: bundlePath,
    source_markdown: existsSync(absoluteMarkdown) ? markdownPath : null,
    bundle_sha256: sha256File(absoluteBundle),
    ...validation,
  };
  writeAtomicPrivate(absoluteValidation, `${JSON.stringify(report, null, 2)}\n`, 0o600, { rootDir });
  writeAtomicPrivate(absoluteValidationMarkdown, renderExternalPilotOpsValidationMarkdown(report), 0o600, { rootDir });
  return report;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--bundle" || arg === "--input") options.bundlePath = argv[++index];
    else if (arg === "--markdown") options.markdownPath = argv[++index];
    else if (arg === "--output") options.validationPath = argv[++index];
    else if (arg === "--validation-markdown") options.validationMarkdownPath = argv[++index];
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log("Usage: node scripts/validate-external-pilot-ops-bundle.mjs [--bundle file] [--markdown file] [--output file] [--validation-markdown file]");
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      printHelp();
    } else {
      const report = validateExternalPilotOpsBundleFile(options);
      console.log(JSON.stringify({
        verdict: report.verdict,
        operational_status: report.operational_status,
        bundle_sha256: report.bundle_sha256,
        requested_data_mode: report.summary.requested_data_mode,
        real_data_authorized: report.summary.real_data_authorized,
        finding_count: report.summary.finding_count,
        p0_count: report.summary.p0_count,
        p1_count: report.summary.p1_count,
        p2_count: report.summary.p2_count,
      }, null, 2));
      if (report.verdict !== "PASS") process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
