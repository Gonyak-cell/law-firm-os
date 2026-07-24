import { createHash } from "node:crypto";
import {
  isVersionedCloudFormationS3TemplateUrl,
} from "./cloudformation-template-transport.mjs";

export const JSON_POSTGRES_PRODUCTION_ACCOUNT = "770880870480";
export const JSON_POSTGRES_PRODUCTION_REGION = "ap-northeast-2";
export const JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE = "matter-prod-deploy-admin";
export const JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE = "matter-cutover-operator";
export const JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE = "matter-readonly-auditor";
export const JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK = "lawos-production-artifact-store";
export const JSON_POSTGRES_PRODUCTION_STACK = "lawos-production";

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_CONDITIONAL_REPLACEMENT = new Set([
  "HttpApiIntegration",
  "HttpApiInvokePermission",
  "PasswordResetWorkerInvokePermission",
  "PasswordResetWorkerSchedule",
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function fail(message) {
  throw new Error(message);
}

export function assertJsonPostgresProductionCaller(identity, {
  role = JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE,
} = {}) {
  if (identity?.Account !== JSON_POSTGRES_PRODUCTION_ACCOUNT
    || !new RegExp(
      `^arn:aws:sts::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:assumed-role/${role}/[^/]+$`,
      "u",
    ).test(identity?.Arn ?? "")) {
    fail(`AWS caller must be exact assumed role ${role} in account ${JSON_POSTGRES_PRODUCTION_ACCOUNT}`);
  }
  return Object.freeze({
    account: identity.Account,
    role,
    caller_arn_sha256: sha256(identity.Arn),
  });
}

export function buildJsonPostgresArtifactStoreParameters({
  packet,
  owner,
  reviewDate,
} = {}) {
  return Object.freeze({
    ArtifactBucketName: packet.target.artifact_bucket_name,
    SourceSha: packet.source_sha,
    SourceTree: packet.source_tree,
    ExecutionPacketSha256: packet.packet_sha256,
    Owner: owner,
    ReviewDate: reviewDate,
  });
}

export function buildJsonPostgresProductionStackParameters({
  packet,
  artifactVersion,
  trustRegistrySha256,
  approvalId,
  owner,
  reviewDate,
  expirationDate,
  allowedOrigins,
  passwordResetSesIdentityArn,
  passwordResetFromEmail,
  primaryTenantId,
  runtimeGeneration,
  enableLambdaEniBootstrap,
  enableProductionTraffic = false,
} = {}) {
  if (!packet?.target?.approved_tenant_ids?.includes(primaryTenantId)) {
    fail("primary tenant is not in the exact approved tenant set");
  }
  if (!artifactVersion || !SHA256.test(trustRegistrySha256 ?? "")
    || !approvalId || !owner || !reviewDate || !expirationDate
    || !Array.isArray(allowedOrigins) || allowedOrigins.length < 1
    || !passwordResetSesIdentityArn || !passwordResetFromEmail
    || !Number.isSafeInteger(runtimeGeneration) || runtimeGeneration < 1) {
    fail("production stack parameter input is incomplete");
  }
  return Object.freeze({
    ArtifactBucket: packet.target.artifact_bucket_name,
    ArtifactKey: `lawos-production/${packet.source_sha}/${packet.bindings.artifact_sha256}.zip`,
    ArtifactVersion: artifactVersion,
    SourceSha: packet.source_sha,
    SourceTree: packet.source_tree,
    ArtifactSha256: packet.bindings.artifact_sha256,
    OwnerTrustRegistrySha256: trustRegistrySha256,
    BootstrapApprovalId: approvalId,
    Owner: owner,
    ReviewDate: reviewDate,
    ExpirationDate: expirationDate,
    AllowedOrigins: allowedOrigins.join(","),
    PasswordResetSesIdentityArn: passwordResetSesIdentityArn,
    PasswordResetFromEmail: passwordResetFromEmail,
    EnableLambdaEniBootstrap: enableLambdaEniBootstrap ? "true" : "false",
    RuntimeGeneration: String(runtimeGeneration),
    ExecutionPacketSha256: packet.packet_sha256,
    ProgramInputBucketName: packet.target.program_input_bucket_name,
    DmsBucketName: packet.target.dms_bucket_name,
    PrimaryTenantId: primaryTenantId,
    EnableProductionTraffic: enableProductionTraffic ? "true" : "false",
    MonthlyCostCeilingKrw: "300000",
  });
}

function normalizedChanges(changeSet = {}) {
  return (changeSet.Changes ?? []).map((entry) => {
    const change = entry.ResourceChange ?? {};
    return {
      action: change.Action,
      logical_resource_id: change.LogicalResourceId,
      physical_resource_id: change.PhysicalResourceId ?? null,
      resource_type: change.ResourceType,
      replacement: change.Replacement ?? "False",
      scope: [...(change.Scope ?? [])].sort(),
    };
  }).sort((left, right) =>
    left.logical_resource_id.localeCompare(right.logical_resource_id, "en"));
}

export function validateJsonPostgresProductionChangeSet(changeSet, {
  stackName,
  changeSetType,
  template,
  parametersSha256,
  templateSha256,
  templateUrl = null,
} = {}) {
  if (![JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK, JSON_POSTGRES_PRODUCTION_STACK].includes(stackName)
    || changeSet?.StackName !== stackName
    || (changeSet?.ChangeSetType != null
      && changeSet.ChangeSetType !== changeSetType)
    || typeof changeSet?.ChangeSetId !== "string"
    || changeSet.ChangeSetId.length === 0
    || !["CREATE", "UPDATE"].includes(changeSetType)
    || !SHA256.test(parametersSha256 ?? "")
    || !SHA256.test(templateSha256 ?? "")
    || (templateUrl !== null
      && !isVersionedCloudFormationS3TemplateUrl(templateUrl))) {
    fail("production change set binding is invalid");
  }
  const allowedIds = new Set(Object.keys(template?.Resources ?? {}));
  const changes = normalizedChanges(changeSet);
  if (changes.length < 1) fail("production change set is empty");
  for (const change of changes) {
    if (!allowedIds.has(change.logical_resource_id)) fail("production change set contains an unknown logical resource");
    if (changeSetType === "CREATE" && change.action !== "Add") {
      fail("production CREATE change set may only add exact template resources");
    }
    if (changeSetType === "UPDATE" && change.action !== "Modify") {
      fail("production UPDATE change set may not add or remove resources");
    }
    if (change.replacement === "True"
      || (change.replacement === "Conditional"
        && !SAFE_CONDITIONAL_REPLACEMENT.has(change.logical_resource_id))) {
      fail("production change set contains an unapproved replacement");
    }
  }
  const reviewMaterial = {
    stack_name: stackName,
    change_set_type: changeSetType,
    change_set_id: changeSet.ChangeSetId,
    template_sha256: templateSha256,
    parameters_sha256: parametersSha256,
    ...(templateUrl === null ? {} : { template_url: templateUrl }),
    changes,
  };
  return Object.freeze({
    verdict: "PASS",
    ...reviewMaterial,
    change_count: changes.length,
    replacement_true_count: 0,
    reviewed_change_set_sha256: sha256(reviewMaterial),
  });
}

export function assertJsonPostgresArtifactBucketState({
  packet,
  expectedKmsKeyArn,
  versioning,
  publicAccess,
  objectLock,
  encryption,
} = {}) {
  const blocked = publicAccess?.PublicAccessBlockConfiguration ?? {};
  const rule = encryption?.ServerSideEncryptionConfiguration
    ?.Rules?.[0]?.ApplyServerSideEncryptionByDefault;
  if (versioning?.Status !== "Enabled"
    || !Object.values(blocked).every(Boolean)
    || Object.keys(blocked).length !== 4
    || objectLock?.ObjectLockConfiguration?.ObjectLockEnabled !== "Enabled"
    || objectLock?.ObjectLockConfiguration?.Rule?.DefaultRetention?.Mode !== "COMPLIANCE"
    || rule?.SSEAlgorithm !== "aws:kms"
    || !expectedKmsKeyArn
    || rule?.KMSMasterKeyID !== expectedKmsKeyArn) {
    fail("production artifact bucket state drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    versioning_enabled: true,
    public_access_blocked: true,
    object_lock_enabled: true,
    object_lock_mode: "COMPLIANCE",
    kms_key_ref_sha256: sha256(packet.target.artifact_kms_key_ref),
    kms_key_arn_sha256: sha256(rule.KMSMasterKeyID),
  });
}

export function assertJsonPostgresProductionStack(stack, {
  packet,
  artifactVersion,
  trustRegistrySha256,
  trafficEnabled = false,
  eniBootstrapEnabled = false,
} = {}) {
  const parameters = Object.fromEntries(
    (stack?.Parameters ?? []).map((entry) => [entry.ParameterKey, entry.ParameterValue]),
  );
  for (const [key, expected] of Object.entries({
    SourceSha: packet.source_sha,
    SourceTree: packet.source_tree,
    ArtifactSha256: packet.bindings.artifact_sha256,
    ArtifactVersion: artifactVersion,
    OwnerTrustRegistrySha256: trustRegistrySha256,
    ExecutionPacketSha256: packet.packet_sha256,
    ProgramInputBucketName: packet.target.program_input_bucket_name,
    DmsBucketName: packet.target.dms_bucket_name,
    EnableProductionTraffic: trafficEnabled ? "true" : "false",
    EnableLambdaEniBootstrap: eniBootstrapEnabled ? "true" : "false",
    MonthlyCostCeilingKrw: "300000",
  })) {
    if (parameters[key] !== expected) fail(`production stack parameter ${key} drifted`);
  }
  if (!/^(?:CREATE|UPDATE)_COMPLETE$/u.test(stack?.StackStatus ?? "")) {
    fail("production stack is not complete");
  }
  return Object.freeze({
    verdict: "PASS",
    stack_status: stack.StackStatus,
    traffic_enabled: trafficEnabled,
    temporary_eni_allow_expected: eniBootstrapEnabled ? 2 : 0,
  });
}

export function jsonPostgresProductionCombinedTemplateSha256({
  artifactStoreTemplate,
  productionTemplate,
} = {}) {
  return sha256({
    artifact_store: artifactStoreTemplate,
    production: productionTemplate,
  });
}

export function jsonPostgresProductionParametersSha256(parameters = {}) {
  return sha256(parameters);
}

export function jsonPostgresProductionInfrastructureResultSha256(value = {}) {
  const { result_sha256: ignored, ...material } = value;
  return sha256(material);
}
