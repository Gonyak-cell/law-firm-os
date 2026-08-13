import { createHash, createPublicKey } from "node:crypto";

export const WINDOWS_UPDATE_APPROVAL_RECEIPT_TYPE =
  "windows_operator_update_rollback_approval";
export const WINDOWS_UPDATE_APPROVAL_SCHEMA =
  "law-firm-os.windows-operator-update-rollback-approval.v1";
export const WINDOWS_UPDATE_OPERATIONS = Object.freeze([
  "baseline_install",
  "target_update",
  "target_uninstall_for_rollback",
  "baseline_rollback",
  "final_uninstall",
  "failure_cleanup",
]);

const VERIFIED_APPROVALS = new WeakSet();
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const THUMBPRINT = /^[0-9A-F]{40}$/u;
const VERSION = /^\d+\.\d+\.\d+$/u;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SCOPE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/u;
const APPROVAL_ID = /^[A-Z0-9][A-Z0-9._-]{7,127}$/u;
const RECEIPT_FIELDS = [
  "app_id", "authenticode_signer_certificate_sha1", "authorizations", "candidates",
  "entra_tenant_id", "expires_at", "issued_at", "lawos_tenant_id",
  "metadata_approval_id", "pilot_id", "receipt_type", "schema_version",
  "tenant_config_sha256", "update_key", "verdict",
];
const CANDIDATE_FIELDS = [
  "artifact_bytes", "artifact_sha256", "release_manifest_sha256", "source_sha",
  "source_tree", "version",
];

function exactKeys(value, fields, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join("\0") !== [...fields].sort().join("\0")) {
    throw new TypeError(`${label} shape is invalid`);
  }
}

function iso(value, label) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))
    || new Date(value).toISOString() !== value) {
    throw new TypeError(`${label} must be a canonical ISO timestamp`);
  }
  return Date.parse(value);
}

function candidate(value, label) {
  exactKeys(value, CANDIDATE_FIELDS, label);
  if (!VERSION.test(value.version ?? "") || !GIT_OBJECT.test(value.source_sha ?? "")
    || !GIT_OBJECT.test(value.source_tree ?? "") || !SHA256.test(value.artifact_sha256 ?? "")
    || !SHA256.test(value.release_manifest_sha256 ?? "")
    || !Number.isSafeInteger(value.artifact_bytes) || value.artifact_bytes < 1) {
    throw new TypeError(`${label} exact source and artifact binding is invalid`);
  }
}

function versionTuple(version) {
  return version.split(".").map(Number);
}

function newer(target, baseline) {
  const left = versionTuple(target);
  const right = versionTuple(baseline);
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index];
  }
  return false;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function validateReceipt(receipt, now) {
  exactKeys(receipt, RECEIPT_FIELDS, "trusted Windows approval receipt");
  if (receipt.schema_version !== WINDOWS_UPDATE_APPROVAL_SCHEMA
    || receipt.receipt_type !== WINDOWS_UPDATE_APPROVAL_RECEIPT_TYPE
    || receipt.verdict !== "APPROVED" || !SCOPE_ID.test(receipt.pilot_id ?? "")
    || !SCOPE_ID.test(receipt.lawos_tenant_id ?? "") || !UUID.test(receipt.entra_tenant_id ?? "")
    || receipt.app_id !== "com.amic.matter.desktop"
    || !APPROVAL_ID.test(receipt.metadata_approval_id ?? "")
    || !SHA256.test(receipt.tenant_config_sha256 ?? "")
    || !THUMBPRINT.test(receipt.authenticode_signer_certificate_sha1 ?? "")) {
    throw new TypeError("trusted Windows approval receipt identity or verdict is invalid");
  }
  const issuedAt = iso(receipt.issued_at, "receipt.issued_at");
  const expiresAt = iso(receipt.expires_at, "receipt.expires_at");
  if (issuedAt > now || expiresAt <= now || expiresAt <= issuedAt) {
    throw new TypeError("trusted Windows approval receipt is not active");
  }
  exactKeys(receipt.update_key, ["key_id", "public_key_spki_sha256"], "receipt.update_key");
  if (!SCOPE_ID.test(receipt.update_key.key_id ?? "")
    || !SHA256.test(receipt.update_key.public_key_spki_sha256 ?? "")) {
    throw new TypeError("trusted Windows update key binding is invalid");
  }
  exactKeys(receipt.candidates, ["baseline", "target"], "receipt.candidates");
  candidate(receipt.candidates.baseline, "receipt.candidates.baseline");
  candidate(receipt.candidates.target, "receipt.candidates.target");
  if (!newer(receipt.candidates.target.version, receipt.candidates.baseline.version)
    || receipt.candidates.target.source_sha === receipt.candidates.baseline.source_sha
    || receipt.candidates.target.artifact_sha256 === receipt.candidates.baseline.artifact_sha256) {
    throw new TypeError("trusted target must be a newer distinct release candidate");
  }
  exactKeys(receipt.authorizations, WINDOWS_UPDATE_OPERATIONS, "receipt.authorizations");
  const approvalIds = [];
  for (const operation of WINDOWS_UPDATE_OPERATIONS) {
    const authorization = receipt.authorizations[operation];
    exactKeys(authorization, ["approval_id", "approved", "expires_at", "operation"], `authorization.${operation}`);
    const authorizationExpiry = iso(authorization.expires_at, `authorization.${operation}.expires_at`);
    if (authorization.operation !== operation || authorization.approved !== true
      || !APPROVAL_ID.test(authorization.approval_id ?? "")
      || authorizationExpiry <= now || authorizationExpiry > expiresAt) {
      throw new TypeError(`authorization.${operation} is invalid or expired`);
    }
    approvalIds.push(authorization.approval_id);
  }
  if (new Set(approvalIds).size !== WINDOWS_UPDATE_OPERATIONS.length) {
    throw new TypeError("every Windows mutation requires a distinct approval identifier");
  }
}

export async function verifyWindowsFormalUpdateApproval({
  approvalBundleBytes,
  verifyApprovalBundle,
  now = Date.now(),
} = {}) {
  if (typeof verifyApprovalBundle !== "function") {
    throw new Error("NOT_CONFIGURED_INDEPENDENT_APPROVAL: a production trust verifier is required");
  }
  const bytes = Buffer.from(approvalBundleBytes ?? []);
  if (bytes.length < 1) throw new TypeError("raw approval bundle bytes are required");
  const verified = await verifyApprovalBundle({
    raw_bytes: bytes,
    required_receipt_type: WINDOWS_UPDATE_APPROVAL_RECEIPT_TYPE,
  });
  exactKeys(verified, ["receipt", "registry_root_verified", "trust_verified", "update_public_key"], "approval verifier result");
  if (verified.trust_verified !== true || verified.registry_root_verified !== true) {
    throw new Error("independent production-root approval verification failed");
  }
  const receipt = structuredClone(verified.receipt);
  validateReceipt(receipt, Number(now));
  const key = verified.update_public_key?.type === "public"
    ? verified.update_public_key
    : createPublicKey(verified.update_public_key);
  if (key.asymmetricKeyType !== "ed25519") throw new TypeError("trusted update public key must be Ed25519");
  const keySha256 = createHash("sha256").update(key.export({ type: "spki", format: "der" })).digest("hex");
  if (keySha256 !== receipt.update_key.public_key_spki_sha256) {
    throw new Error("production-root update public key digest mismatch");
  }
  const approval = {
    ...receipt,
    approval_bundle_sha256: createHash("sha256").update(bytes).digest("hex"),
    update_public_key: key,
  };
  VERIFIED_APPROVALS.add(approval);
  deepFreeze(approval);
  return approval;
}

export function assertVerifiedWindowsFormalUpdateApproval(value) {
  if (!VERIFIED_APPROVALS.has(value)) {
    throw new Error("NOT_CONFIGURED_INDEPENDENT_APPROVAL: verified production-root approval is required");
  }
  return value;
}

export function requireConfiguredWindowsUpdateRollbackRunner({ platform, productionApprovalVerifier } = {}) {
  if (platform !== "win32") throw new Error("formal Windows update/rollback executor requires a Windows host");
  if (typeof productionApprovalVerifier !== "function") {
    throw new Error("NOT_CONFIGURED_INDEPENDENT_APPROVAL: CLI mutation is disabled until production trust integration exists");
  }
  return productionApprovalVerifier;
}
