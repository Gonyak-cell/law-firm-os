import {
  validateRuntimeSafetyApprovalBundle,
} from "./runtime-safety-approval-contract.mjs";
import {
  canonicalSha256,
  describeFile,
  exactKeys,
  fail,
  validateFileDescriptor,
} from "./matter-rollback-io.mjs";
import {
  MATTER_ROLLBACK_ACTION,
  MATTER_ROLLBACK_EXECUTION_ACTION,
  MATTER_ROLLBACK_PRODUCTION_AUTHORITY_ACTION,
} from "./matter-rollback-release-evidence.mjs";

const PRODUCTION_PROFILE = "matter-prod-deploy-admin";
const STAGING_PROFILE = "matter-staging-admin";

export function matterRollbackProductionIntent(currentRef, targetRef, environment = "production") {
  return {
    environment,
    current_manifest_sha256: currentRef.sha256,
    target_manifest_sha256: targetRef.sha256,
    current_source_sha: currentRef.manifest.source.sha,
    current_source_tree: currentRef.manifest.source.tree,
    target_source_sha: targetRef.manifest.source.sha,
    target_source_tree: targetRef.manifest.source.tree,
    required_profile: environment === "production" ? PRODUCTION_PROFILE : STAGING_PROFILE,
  };
}

function mapApprovalFailure(error) {
  const suffix = String(error?.code ?? "").replace(/^APPROVAL_/, "");
  const known = new Set(["SIGNATURE", "SOURCE", "PACKET", "ROLE", "ACTION", "ENVIRONMENT", "EXPIRED", "REGISTRY_DIGEST", "SCOPE", "KEY", "KEY_TIME"]);
  fail(`MATTER_ROLLBACK_APPROVAL_${known.has(suffix) ? suffix : "INVALID"}`, "signed rollback authority was rejected");
}

function signedReference({ receiptPath, signaturePath, approval, action, repoRoot }) {
  const receipt = validateFileDescriptor(describeFile(receiptPath, "authority receipt"), "authority receipt", { privateFile: true, repoRoot });
  const signature = validateFileDescriptor(describeFile(signaturePath, "authority signature"), "authority signature", { privateFile: true, repoRoot });
  return Object.freeze({
    action,
    approval_id: approval.approval_id,
    signed_at: approval.signed_at,
    expires_at: approval.expires_at,
    receipt,
    signature,
  });
}

export function validateMatterRollbackSignedStatement({
  packet,
  statementSha256,
  source,
  action,
  role,
  receiptPath,
  signaturePath,
  repoRoot = process.cwd(),
  now = Date.now(),
}) {
  try {
    const approval = validateRuntimeSafetyApprovalBundle({
      registryPath: packet.approval.trust_registry.path,
      expectedRegistrySha256: packet.approval.trust_registry.sha256,
      receiptPath,
      signaturePath,
      expectedRole: role,
      expectedAction: action,
      expectedEnvironment: packet.environment,
      expectedPacketSha256: statementSha256,
      expectedSourceSha: source.sha,
      expectedSourceTree: source.tree,
      allowedDataScope: ["none"],
      allowedContactScope: ["none"],
      now,
    });
    if (!approval.valid || approval.decision !== "approved") fail("MATTER_ROLLBACK_APPROVAL_DECISION", "signed rollback authority is not approved");
    return signedReference({ receiptPath, signaturePath, approval, action, repoRoot });
  } catch (error) {
    if (String(error?.code ?? "").startsWith("MATTER_ROLLBACK_")) throw error;
    mapApprovalFailure(error);
  }
}

export function validateMatterRollbackProductionAuthority({
  currentRef,
  targetRef,
  receiptPath,
  signaturePath,
  repoRoot = process.cwd(),
  now = Date.now(),
}) {
  const intent = matterRollbackProductionIntent(currentRef, targetRef);
  const packet = {
    environment: "production",
    approval: { trust_registry: targetRef.manifest.rollback_authority.trust_registry },
  };
  const reference = validateMatterRollbackSignedStatement({
    packet,
    statementSha256: canonicalSha256(intent),
    source: targetRef.manifest.source,
    action: MATTER_ROLLBACK_PRODUCTION_AUTHORITY_ACTION,
    role: targetRef.manifest.rollback_authority.owner_role,
    receiptPath,
    signaturePath,
    repoRoot,
    now,
  });
  return Object.freeze({ intent_sha256: canonicalSha256(intent), required_profile: PRODUCTION_PROFILE, ...reference });
}

export function validateMatterRollbackAuthorityReference(reference, {
  packet,
  action,
  role,
  statementSha256,
  source,
  repoRoot = process.cwd(),
  now = Date.now(),
  production = false,
}) {
  const expected = production
    ? ["intent_sha256", "required_profile", "action", "approval_id", "signed_at", "expires_at", "receipt", "signature"]
    : ["action", "approval_id", "signed_at", "expires_at", "receipt", "signature"];
  exactKeys(reference, expected, "authority reference");
  if (reference.action !== action) fail("MATTER_ROLLBACK_APPROVAL_ACTION", "authority action differs");
  validateFileDescriptor(reference.receipt, "authority receipt", { privateFile: true, repoRoot });
  validateFileDescriptor(reference.signature, "authority signature", { privateFile: true, repoRoot });
  const actual = validateMatterRollbackSignedStatement({
    packet,
    statementSha256,
    source,
    action,
    role,
    receiptPath: reference.receipt.path,
    signaturePath: reference.signature.path,
    repoRoot,
    now,
  });
  if (actual.approval_id !== reference.approval_id || actual.signed_at !== reference.signed_at || actual.expires_at !== reference.expires_at) {
    fail("MATTER_ROLLBACK_APPROVAL_MISMATCH", "authority reference differs from signed receipt");
  }
  return actual;
}

export function validateMatterRollbackApproval({ packet, receiptPath, signaturePath, repoRoot = process.cwd(), now = Date.now() }) {
  return validateMatterRollbackSignedStatement({
    packet,
    statementSha256: packet.packet_sha256,
    source: packet.target_a.manifest.source,
    action: MATTER_ROLLBACK_ACTION,
    role: packet.approval.owner_role,
    receiptPath,
    signaturePath,
    repoRoot,
    now,
  });
}

export function validateMatterRollbackExecutionCheckpoint({ packet, receiptPath, signaturePath, repoRoot = process.cwd(), now = Date.now() }) {
  return validateMatterRollbackSignedStatement({
    packet,
    statementSha256: packet.packet_sha256,
    source: packet.target_a.manifest.source,
    action: MATTER_ROLLBACK_EXECUTION_ACTION,
    role: packet.approval.owner_role,
    receiptPath,
    signaturePath,
    repoRoot,
    now,
  });
}
