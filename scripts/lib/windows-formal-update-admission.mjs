import { createHash, verify as verifySignature } from "node:crypto";
import path from "node:path";
import {
  EXTERNAL_PILOT_UPDATE_CHANNEL,
  EXTERNAL_PILOT_UPDATE_SCHEMA,
} from "../../apps/desktop/src/main/updates.js";
import { validateMatterDesktopAuthenticodeSignatures } from "./matter-desktop-authenticode.mjs";
import { assertVerifiedWindowsFormalUpdateApproval } from "./windows-formal-update-approval.mjs";

export const WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA =
  "law-firm-os.windows-operator-update-rollback-input.v2";
export const WINDOWS_UPDATE_EXECUTION_MODE =
  "independently-approved-operator-signed-nsis";

const INPUT_FIELDS = ["automatic_update", "baseline", "execution_mode", "schema_version", "target"];
const LOCATOR_FIELDS = ["installer_path", "metadata_path", "signature_path"];
const METADATA_FIELDS = [
  "appId", "approvalExpiresAt", "approvalId", "artifactBytes", "artifactFilename",
  "artifactSha256", "channel", "entraTenantId", "expiresAt", "generatedAt", "keyId",
  "lawosTenantId", "pilotId", "releaseManifestSha256", "schemaVersion", "sourceSha",
  "sourceTree", "tenantConfigSha256", "version",
];

function exactKeys(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join("\0") !== [...fields].sort().join("\0")) {
    throw new TypeError(`${label} shape is invalid`);
  }
}

function safeRelativeFile(value, label, suffix) {
  if (typeof value !== "string" || value.length < 1 || value.length > 256) {
    throw new TypeError(`${label} is required`);
  }
  const normalized = value.replaceAll("\\", "/");
  if (path.posix.isAbsolute(normalized) || !normalized.toLowerCase().endsWith(suffix)
    || !/^[0-9A-Za-z._/-]+$/u.test(normalized)
    || normalized.split("/").some((segment) => ["", ".", ".."].includes(segment))) {
    throw new TypeError(`${label} must be a safe relative ${suffix} path`);
  }
  return normalized;
}

function validateExecutionInput(input) {
  exactKeys(input, INPUT_FIELDS, "Windows execution input");
  if (input.schema_version !== WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA
    || input.execution_mode !== WINDOWS_UPDATE_EXECUTION_MODE
    || input.automatic_update !== false) {
    throw new TypeError("Windows execution input must remain nonautomatic and independently approved");
  }
  for (const role of ["baseline", "target"]) {
    exactKeys(input[role], LOCATOR_FIELDS, `input.${role}`);
    safeRelativeFile(input[role].installer_path, `input.${role}.installer_path`, ".exe");
    safeRelativeFile(input[role].metadata_path, `input.${role}.metadata_path`, ".json");
    safeRelativeFile(input[role].signature_path, `input.${role}.signature_path`, ".sig");
  }
  return input;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function iso(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function assertUniqueMetadataFields(rawText) {
  for (const field of METADATA_FIELDS) {
    const escaped = field.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const matches = rawText.match(new RegExp(`"${escaped}"\\s*:`, "gu")) ?? [];
    if (matches.length !== 1) throw new Error(`raw update metadata field ${field} must occur exactly once`);
  }
}

function assertMetadataBindings(metadata, rawText, candidate, approval, locator, now) {
  exactKeys(metadata, METADATA_FIELDS, "raw signed update metadata");
  assertUniqueMetadataFields(rawText);
  if (metadata.schemaVersion !== EXTERNAL_PILOT_UPDATE_SCHEMA
    || metadata.channel !== EXTERNAL_PILOT_UPDATE_CHANNEL
    || metadata.keyId !== approval.update_key.key_id
    || metadata.pilotId !== approval.pilot_id
    || metadata.lawosTenantId !== approval.lawos_tenant_id
    || metadata.entraTenantId !== approval.entra_tenant_id
    || metadata.appId !== approval.app_id
    || metadata.approvalId !== approval.metadata_approval_id
    || metadata.approvalExpiresAt !== approval.expires_at
    || metadata.tenantConfigSha256 !== approval.tenant_config_sha256
    || metadata.version !== candidate.version
    || metadata.sourceSha !== candidate.source_sha
    || metadata.sourceTree !== candidate.source_tree
    || metadata.artifactSha256 !== candidate.artifact_sha256
    || metadata.artifactBytes !== candidate.artifact_bytes
    || metadata.releaseManifestSha256 !== candidate.release_manifest_sha256
    || metadata.artifactFilename !== path.posix.basename(locator.installer_path.replaceAll("\\", "/"))) {
    throw new Error("raw signed metadata does not match the production-root approval bindings");
  }
  if (!iso(metadata.generatedAt) || !iso(metadata.expiresAt)
    || Date.parse(metadata.generatedAt) > now || Date.parse(metadata.expiresAt) <= now
    || Date.parse(metadata.expiresAt) > Date.parse(approval.expires_at)) {
    throw new Error("raw signed update metadata is not currently active");
  }
}

async function admitRole({ role, locator, approval, readFile, readAuthenticode, now }) {
  const candidate = approval.candidates[role];
  const [artifactInput, metadataInput, signatureInput] = await Promise.all([
    readFile(locator.installer_path),
    readFile(locator.metadata_path),
    readFile(locator.signature_path),
  ]);
  const artifactBytes = Buffer.from(artifactInput);
  const metadataBytes = Buffer.from(metadataInput);
  const signatureBytes = Buffer.from(signatureInput);
  if (artifactBytes.length !== candidate.artifact_bytes
    || sha256(artifactBytes) !== candidate.artifact_sha256) {
    throw new Error(`${role} installer bytes do not match the production-root approval`);
  }
  if (signatureBytes.length !== 64
    || !verifySignature(null, metadataBytes, approval.update_public_key, signatureBytes)) {
    throw new Error(`${role} raw metadata Ed25519 signature is invalid`);
  }
  const rawText = metadataBytes.toString("utf8");
  let metadata;
  try {
    metadata = JSON.parse(rawText);
  } catch {
    throw new Error(`${role} raw signed metadata is not valid JSON`);
  }
  assertMetadataBindings(metadata, rawText, candidate, approval, locator, now);
  return Object.freeze({
    role,
    locator,
    candidate,
    metadata,
    artifact_sha256: sha256(artifactBytes),
    metadata_raw_sha256: sha256(metadataBytes),
    signature_raw_sha256: sha256(signatureBytes),
    authenticode: await readAuthenticode(locator.installer_path),
  });
}

export async function admitWindowsFormalUpdateCandidates({
  executionInput,
  verifiedApproval,
  readFile,
  readAuthenticode,
  now = Date.now(),
} = {}) {
  const approval = assertVerifiedWindowsFormalUpdateApproval(verifiedApproval);
  const input = validateExecutionInput(executionInput);
  if (typeof readFile !== "function" || typeof readAuthenticode !== "function") {
    throw new TypeError("readFile and readAuthenticode adapters are required");
  }
  const [baseline, target] = await Promise.all(["baseline", "target"].map((role) => admitRole({
    role,
    locator: input[role],
    approval,
    readFile,
    readAuthenticode,
    now: Number(now),
  })));
  const authenticode = validateMatterDesktopAuthenticodeSignatures(
    [baseline.authenticode, target.authenticode],
    { expectedCertificateSha1: approval.authenticode_signer_certificate_sha1 },
  );
  return Object.freeze({ input, approval, baseline, target, authenticode });
}
