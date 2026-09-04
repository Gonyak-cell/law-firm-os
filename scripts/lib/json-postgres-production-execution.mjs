import { createHash, createPublicKey } from "node:crypto";
import {
  isVersionedCloudFormationS3TemplateUrl,
} from "./cloudformation-template-transport.mjs";
import {
  JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_BUCKET,
  JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_VALUE,
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
  JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
  JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
  JSON_POSTGRES_OUTLOOK_WORKER_RESOURCE_IDS,
} from "./json-postgres-production-infrastructure.mjs";

export const JSON_POSTGRES_PRODUCTION_ACCOUNT = "770880870480";
export const JSON_POSTGRES_PRODUCTION_REGION = "ap-northeast-2";
export const JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE = "matter-prod-deploy-admin";
export const JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE = "matter-cutover-operator";
export const JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE = "matter-readonly-auditor";
export const JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK = "lawos-production-artifact-store";
export const JSON_POSTGRES_PRODUCTION_STACK = "lawos-production";
export const JSON_POSTGRES_AMIC_INTERNAL_UPDATE_BINDING_SCHEMA =
  "law-firm-os.amic-internal-unsigned-runtime-binding.v1";
export const JSON_POSTGRES_AMIC_INTERNAL_DISTRIBUTION_STACK =
  "amic-os-internal-unsigned-distribution";
export const JSON_POSTGRES_IMMUTABLE_PROGRAM_INPUT_LOCATOR_VERSION =
  "law-firm-os.immutable-program-input-locator.v1";
export const JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY =
  "disabled/hrx-projection-mapping.json";
export const JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY =
  "disabled/hrx-projection-validation.json";
export const JSON_POSTGRES_DISABLED_AMIC_INTERNAL_UPDATE_PARAMETERS =
  Object.freeze({
    EnableAmicInternalUnsignedUpdateBroker: "false",
    AmicInternalUnsignedArtifactBucketName:
      JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_BUCKET,
    AmicInternalUnsignedArtifactKmsKeyArn:
      JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_VALUE,
    AmicInternalUnsignedCloudFrontDomain:
      JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_VALUE,
    AmicInternalUnsignedCloudFrontKeyPairId:
      JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_VALUE,
    AmicInternalUnsignedCloudFrontPrivateKeySecretArn:
      JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_VALUE,
    AmicInternalUnsignedMetadataPublicKeySpkiBase64:
      JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_VALUE,
  });

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const AMIC_INTERNAL_UPDATE_BINDING_FIELDS = Object.freeze([
  "artifact_bucket_name",
  "artifact_kms_key_arn",
  "aws_account_id",
  "aws_region",
  "cloudfront_distribution_id",
  "cloudfront_domain",
  "cloudfront_key_group_id",
  "cloudfront_key_pair_id",
  "cloudfront_private_key_secret_arn",
  "distribution_stack_id",
  "distribution_stack_name",
  "metadata_public_key_sha256",
  "metadata_public_key_spki_base64",
  "runtime_download_broker_policy_arn",
  "schema_version",
]);
const SAFE_CONDITIONAL_REPLACEMENT = new Set([
  "HttpApiIntegration",
  "HttpApiInvokePermission",
  "PasswordResetWorkerInvokePermission",
  "PasswordResetWorkerSchedule",
  "OutlookConversationWorkerInvokePermission",
  "OutlookConversationWorkerSchedule",
]);
export const JSON_POSTGRES_W15_ALLOWED_ADDED_RESOURCES = Object.freeze([
  "ProjectionAuditorDatabaseSecret",
  "ProjectionAuditorExecutionRole",
  "ProjectionAuditorFunction",
  "ProjectionAuditorLogGroup",
  "ProjectionDatabaseSecret",
  "ProjectionWorkerExecutionRole",
  "ProjectionWorkerDeadLetterAlarm",
  "ProjectionWorkerDeadLetterQueue",
  "ProjectionWorkerDeadLetterQueuePolicy",
  "ProjectionWorkerDeliveryFailureAlarm",
  "ProjectionWorkerErrorAlarm",
  "ProjectionWorkerEventInvokeConfig",
  "ProjectionWorkerFunction",
  "ProjectionWorkerInvokePermission",
  "ProjectionWorkerLagAlarm",
  "ProjectionWorkerLogGroup",
  "ProjectionWorkerSchedule",
]);
export const JSON_POSTGRES_W15_ALLOWED_MODIFIED_RESOURCES = Object.freeze([
  "AdminExecutionRole",
  "AdminFunction",
  "ApiExecutionRole",
  "ApiFunction",
  "HttpApiIntegration",
  "ProductionKey",
  "ProjectionAuditorDatabaseSecret",
  "ProjectionAuditorExecutionRole",
  "ProjectionAuditorFunction",
  "ProjectionAuditorLogGroup",
  "ProjectionDatabaseSecret",
  "ProjectionWorkerExecutionRole",
  "ProjectionWorkerDeadLetterAlarm",
  "ProjectionWorkerDeadLetterQueue",
  "ProjectionWorkerDeadLetterQueuePolicy",
  "ProjectionWorkerDeliveryFailureAlarm",
  "ProjectionWorkerErrorAlarm",
  "ProjectionWorkerEventInvokeConfig",
  "ProjectionWorkerFunction",
  "ProjectionWorkerInvokePermission",
  "ProjectionWorkerLagAlarm",
  "ProjectionWorkerLogGroup",
  "ProjectionWorkerSchedule",
  "S3GatewayEndpoint",
  "SecretsManagerEndpoint",
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

export function validateJsonPostgresAmicInternalUpdateBinding(binding) {
  if (!binding || typeof binding !== "object" || Array.isArray(binding)
    || JSON.stringify(Object.keys(binding).sort())
      !== JSON.stringify(AMIC_INTERNAL_UPDATE_BINDING_FIELDS)
    || binding.schema_version
      !== JSON_POSTGRES_AMIC_INTERNAL_UPDATE_BINDING_SCHEMA
    || binding.aws_account_id !== JSON_POSTGRES_PRODUCTION_ACCOUNT
    || binding.aws_region !== JSON_POSTGRES_PRODUCTION_REGION
    || binding.distribution_stack_name
      !== JSON_POSTGRES_AMIC_INTERNAL_DISTRIBUTION_STACK
    || !new RegExp(
      `^arn:aws:cloudformation:${JSON_POSTGRES_PRODUCTION_REGION}:`
        + `${JSON_POSTGRES_PRODUCTION_ACCOUNT}:stack/`
        + `${JSON_POSTGRES_AMIC_INTERNAL_DISTRIBUTION_STACK}/[0-9a-f-]{36}$`,
      "u",
    ).test(binding.distribution_stack_id ?? "")
    || !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/u
      .test(binding.artifact_bucket_name ?? "")
    || !new RegExp(
      `^arn:aws:kms:${JSON_POSTGRES_PRODUCTION_REGION}:`
        + `${JSON_POSTGRES_PRODUCTION_ACCOUNT}:key/[0-9a-f-]{36}$`,
      "u",
    ).test(binding.artifact_kms_key_arn ?? "")
    || !/^d[a-z0-9]{3,62}\.cloudfront\.net$/u
      .test(binding.cloudfront_domain ?? "")
    || !/^[A-Z0-9]{8,128}$/u.test(binding.cloudfront_distribution_id ?? "")
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u
      .test(binding.cloudfront_key_group_id ?? "")
    || !/^[A-Z0-9]{8,128}$/u.test(binding.cloudfront_key_pair_id ?? "")
    || !new RegExp(
      `^arn:aws:secretsmanager:${JSON_POSTGRES_PRODUCTION_REGION}:`
        + `${JSON_POSTGRES_PRODUCTION_ACCOUNT}:secret:[A-Za-z0-9/_+=.@-]+$`,
      "u",
    ).test(binding.cloudfront_private_key_secret_arn ?? "")
    || binding.runtime_download_broker_policy_arn
      !== `arn:aws:iam::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:policy/`
        + "amic-os-internal-unsigned-download-broker"
    || !SHA256.test(binding.metadata_public_key_sha256 ?? "")) {
    fail("AMIC internal update runtime binding is invalid");
  }
  let publicKey;
  try {
    const der = Buffer.from(binding.metadata_public_key_spki_base64, "base64");
    if (!der.byteLength
      || der.toString("base64") !== binding.metadata_public_key_spki_base64
      || createHash("sha256").update(der).digest("hex")
        !== binding.metadata_public_key_sha256) {
      fail("AMIC internal update metadata public key binding differs");
    }
    publicKey = createPublicKey({ key: der, format: "der", type: "spki" });
  } catch {
    fail("AMIC internal update metadata public key binding is invalid");
  }
  if (publicKey.asymmetricKeyType !== "ed25519") {
    fail("AMIC internal update metadata public key must be Ed25519");
  }
  return Object.freeze({ ...binding });
}

export function buildJsonPostgresAmicInternalUpdateBrokerParameters(binding) {
  if (binding == null) {
    return JSON_POSTGRES_DISABLED_AMIC_INTERNAL_UPDATE_PARAMETERS;
  }
  const value = validateJsonPostgresAmicInternalUpdateBinding(binding);
  return Object.freeze({
    EnableAmicInternalUnsignedUpdateBroker: "true",
    AmicInternalUnsignedArtifactBucketName: value.artifact_bucket_name,
    AmicInternalUnsignedArtifactKmsKeyArn: value.artifact_kms_key_arn,
    AmicInternalUnsignedCloudFrontDomain: value.cloudfront_domain,
    AmicInternalUnsignedCloudFrontKeyPairId: value.cloudfront_key_pair_id,
    AmicInternalUnsignedCloudFrontPrivateKeySecretArn:
      value.cloudfront_private_key_secret_arn,
    AmicInternalUnsignedMetadataPublicKeySpkiBase64:
      value.metadata_public_key_spki_base64,
  });
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
  enableProjectionWorker = false,
  projectionWorkerEventJson = "{}",
  hrxProjectionMappingObjectKey =
    JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY,
  hrxProjectionValidationObjectKey =
    JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY,
} = {}) {
  if (!packet?.target?.approved_tenant_ids?.includes(primaryTenantId)) {
    fail("primary tenant is not in the exact approved tenant set");
  }
  if (!artifactVersion || !SHA256.test(trustRegistrySha256 ?? "")
    || !approvalId || !owner || !reviewDate || !expirationDate
    || !Array.isArray(allowedOrigins) || allowedOrigins.length < 1
    || !passwordResetSesIdentityArn || !passwordResetFromEmail
    || typeof projectionWorkerEventJson !== "string"
    || projectionWorkerEventJson.length < 2
    || Buffer.byteLength(projectionWorkerEventJson) > 1024
    || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$/u
      .test(hrxProjectionMappingObjectKey)
    || !/^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$/u
      .test(hrxProjectionValidationObjectKey)
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
    EnableExternalReadProviders: "false",
    ExternalReadProviderPackSecretName:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
    ExternalReadProviderPackSha256:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
    ...JSON_POSTGRES_DISABLED_AMIC_INTERNAL_UPDATE_PARAMETERS,
    EnableOutlookConversationWorker: "false",
    ClientOutlookM365ConfigSecretName:
      JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
    ClientOutlookCredentialSecretPrefix:
      JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
    EnableProjectionWorker: enableProjectionWorker ? "true" : "false",
    ProjectionWorkerEventJson: projectionWorkerEventJson,
    HrxProjectionMappingObjectKey: hrxProjectionMappingObjectKey,
    HrxProjectionValidationObjectKey:
      hrxProjectionValidationObjectKey,
    ProjectionWorkerLagThresholdMs: "24",
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

function exactChangeSetParameter(changeSet, key) {
  const matches = (changeSet?.Parameters ?? []).filter(
    (entry) => entry?.ParameterKey === key,
  );
  if (matches.length !== 1
      || matches[0].UsePreviousValue === true
      || typeof matches[0].ParameterValue !== "string") {
    fail("W15 production change set safety parameters are ambiguous");
  }
  return matches[0].ParameterValue;
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

export function validateJsonPostgresW15ProductionChangeSet(changeSet, {
  template,
  parametersSha256,
  templateSha256,
  templateUrl = null,
  internalUpdateBinding = null,
} = {}) {
  if (changeSet?.StackName !== JSON_POSTGRES_PRODUCTION_STACK
    || (changeSet?.ChangeSetType != null
      && changeSet.ChangeSetType !== "UPDATE")
    || typeof changeSet?.ChangeSetId !== "string"
    || changeSet.ChangeSetId.length === 0
    || !SHA256.test(parametersSha256 ?? "")
    || !SHA256.test(templateSha256 ?? "")
    || (templateUrl !== null
      && !isVersionedCloudFormationS3TemplateUrl(templateUrl))) {
    fail("W15 production change set binding is invalid");
  }
  if (exactChangeSetParameter(changeSet, "EnableExternalReadProviders")
      !== "false"
    || exactChangeSetParameter(
      changeSet,
      "ExternalReadProviderPackSecretName",
    ) !== JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME
    || exactChangeSetParameter(
      changeSet,
      "ExternalReadProviderPackSha256",
    ) !== JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256) {
    fail("W15 production change set must keep external providers disabled");
  }
  for (const [key, expected] of Object.entries(
    buildJsonPostgresAmicInternalUpdateBrokerParameters(
      internalUpdateBinding,
    ),
  )) {
    if (exactChangeSetParameter(changeSet, key) !== expected) {
      fail("W15 production change set must preserve the internal update broker binding");
    }
  }
  if (exactChangeSetParameter(changeSet, "EnableOutlookConversationWorker")
      !== "false"
    || exactChangeSetParameter(
      changeSet,
      "ClientOutlookM365ConfigSecretName",
    ) !== JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME
    || exactChangeSetParameter(
      changeSet,
      "ClientOutlookCredentialSecretPrefix",
    ) !== JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX) {
    fail("W15 production change set must keep Outlook resources disabled");
  }
  const templateResources = new Set(Object.keys(template?.Resources ?? {}));
  const allowedAdds = new Set(JSON_POSTGRES_W15_ALLOWED_ADDED_RESOURCES);
  const allowedModifies =
    new Set(JSON_POSTGRES_W15_ALLOWED_MODIFIED_RESOURCES);
  const changes = normalizedChanges(changeSet);
  if (changes.length < 1) fail("W15 production change set is empty");
  const disabledResourceIds = new Set([
    "ExternalReadSecretsPolicy",
    "MicrosoftEgressBrokerLambdaEndpoint",
    ...JSON_POSTGRES_OUTLOOK_WORKER_RESOURCE_IDS,
  ]);
  for (const change of changes) {
    if (disabledResourceIds.has(change.logical_resource_id)) {
      fail("W15 production change set contains a disabled provider resource change");
    }
    if (!templateResources.has(change.logical_resource_id)
      || (change.action === "Add"
        && !allowedAdds.has(change.logical_resource_id))
      || (change.action === "Modify"
        && !allowedModifies.has(change.logical_resource_id))
      || !["Add", "Modify"].includes(change.action)
      || change.replacement === "True"
      || (change.replacement === "Conditional"
        && !SAFE_CONDITIONAL_REPLACEMENT.has(change.logical_resource_id)
        && change.logical_resource_id !== "ProjectionWorkerInvokePermission"
        && change.logical_resource_id !== "ProjectionWorkerSchedule")) {
      fail("W15 production change set contains an unapproved resource change");
    }
  }
  const reviewMaterial = {
    purpose: "w15-relational-projection-rebind",
    stack_name: JSON_POSTGRES_PRODUCTION_STACK,
    change_set_type: "UPDATE",
    change_set_id: changeSet.ChangeSetId,
    template_sha256: templateSha256,
    parameters_sha256: parametersSha256,
    external_read_providers_enabled: false,
    outlook_resources_enabled: false,
    internal_update_broker_enabled: internalUpdateBinding != null,
    ...(templateUrl === null ? {} : { template_url: templateUrl }),
    changes,
  };
  return Object.freeze({
    verdict: "PASS",
    ...reviewMaterial,
    change_count: changes.length,
    add_count: changes.filter((change) => change.action === "Add").length,
    modify_count: changes.filter((change) => change.action === "Modify").length,
    replacement_true_count: 0,
    reviewed_change_set_sha256: sha256(reviewMaterial),
  });
}

export function validateJsonPostgresAmicInternalUpdateBrokerChangeSet(
  changeSet,
  {
    binding,
    template,
    parametersSha256,
    templateSha256,
    templateUrl = null,
  } = {},
) {
  const exactBinding = validateJsonPostgresAmicInternalUpdateBinding(binding);
  if (changeSet?.StackName !== JSON_POSTGRES_PRODUCTION_STACK
    || (changeSet?.ChangeSetType != null
      && changeSet.ChangeSetType !== "UPDATE")
    || typeof changeSet?.ChangeSetId !== "string"
    || changeSet.ChangeSetId.length === 0
    || !SHA256.test(parametersSha256 ?? "")
    || !SHA256.test(templateSha256 ?? "")
    || (templateUrl !== null
      && !isVersionedCloudFormationS3TemplateUrl(templateUrl))) {
    fail("AMIC internal update broker change set binding is invalid");
  }
  for (const [key, expected] of Object.entries(
    buildJsonPostgresAmicInternalUpdateBrokerParameters(exactBinding),
  )) {
    if (exactChangeSetParameter(changeSet, key) !== expected) {
      fail("AMIC internal update broker change set parameters differ");
    }
  }
  for (const [key, expected] of Object.entries({
    EnableExternalReadProviders: "false",
    ExternalReadProviderPackSecretName:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
    ExternalReadProviderPackSha256:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
    EnableOutlookConversationWorker: "false",
    ClientOutlookM365ConfigSecretName:
      JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
    ClientOutlookCredentialSecretPrefix:
      JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
  })) {
    if (exactChangeSetParameter(changeSet, key) !== expected) {
      fail("AMIC internal update broker change set altered a disabled provider");
    }
  }
  const expectedChanges = [
    "ApiFunction",
    "S3GatewayEndpoint",
    "SecretsManagerEndpoint",
  ];
  const templateResources = new Set(Object.keys(template?.Resources ?? {}));
  const changes = normalizedChanges(changeSet);
  if (JSON.stringify(changes.map(({ logical_resource_id }) =>
    logical_resource_id)) !== JSON.stringify(expectedChanges)
    || changes.some((change) =>
      !templateResources.has(change.logical_resource_id)
      || change.action !== "Modify"
      || change.replacement !== "False")) {
    fail("AMIC internal update broker change set exceeded its exact scope");
  }
  const reviewMaterial = {
    purpose: "amic-internal-update-broker-activation",
    stack_name: JSON_POSTGRES_PRODUCTION_STACK,
    change_set_type: "UPDATE",
    change_set_id: changeSet.ChangeSetId,
    template_sha256: templateSha256,
    parameters_sha256: parametersSha256,
    internal_update_binding_sha256: sha256(exactBinding),
    internal_update_broker_enabled: true,
    external_read_providers_enabled: false,
    outlook_resources_enabled: false,
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

export function assertJsonPostgresArtifactStoreBinding({
  packet,
  outputs,
  sourceIsAncestor = false,
  sourceTreeMatches = false,
} = {}) {
  const exactPacketBinding =
    outputs?.SourceSha === packet?.source_sha
    && outputs?.SourceTree === packet?.source_tree
    && outputs?.ExecutionPacketSha256 === packet?.packet_sha256;
  const currentSource = outputs?.SourceSha === packet?.source_sha;
  if (outputs?.ArtifactBucketName !== packet?.target?.artifact_bucket_name
    || !outputs?.ArtifactKmsKeyArn
    || !SHA1.test(outputs?.SourceSha ?? "")
    || !SHA1.test(outputs?.SourceTree ?? "")
    || !SHA256.test(outputs?.ExecutionPacketSha256 ?? "")
    || sourceTreeMatches !== true
    || (currentSource && !exactPacketBinding)
    || (!currentSource && sourceIsAncestor !== true)) {
    fail("production artifact-store stack binding drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    exact_packet_binding: exactPacketBinding,
    reused_ancestor_store: !exactPacketBinding,
    store_source_sha: outputs.SourceSha,
    store_source_tree: outputs.SourceTree,
    store_packet_sha256: outputs.ExecutionPacketSha256,
  });
}

export function assertJsonPostgresProductionStack(stack, {
  packet,
  artifactVersion,
  trustRegistrySha256,
  trafficEnabled = false,
  eniBootstrapEnabled = false,
  projectionWorkerEnabled = false,
  internalUpdateBrokerBinding = null,
} = {}) {
  const parameters = Object.fromEntries(
    (stack?.Parameters ?? []).map((entry) => [entry.ParameterKey, entry.ParameterValue]),
  );
  const outputs = Object.fromEntries(
    (stack?.Outputs ?? []).map((entry) => [entry.OutputKey, entry.OutputValue]),
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
    EnableExternalReadProviders: "false",
    ExternalReadProviderPackSecretName:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
    ExternalReadProviderPackSha256:
      JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
    ...buildJsonPostgresAmicInternalUpdateBrokerParameters(
      internalUpdateBrokerBinding,
    ),
    EnableOutlookConversationWorker: "false",
    ClientOutlookM365ConfigSecretName:
      JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
    ClientOutlookCredentialSecretPrefix:
      JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
    EnableProjectionWorker: projectionWorkerEnabled ? "true" : "false",
    ProjectionWorkerLagThresholdMs: "24",
    MonthlyCostCeilingKrw: "300000",
  })) {
    if (parameters[key] !== expected) fail(`production stack parameter ${key} drifted`);
  }
  if (!/^(?:CREATE|UPDATE)_COMPLETE$/u.test(stack?.StackStatus ?? "")) {
    fail("production stack is not complete");
  }
  if (outputs.ExternalReadProvidersEnabled !== "false") {
    fail("production stack external provider output drifted");
  }
  if (outputs.AmicInternalUnsignedUpdateBrokerEnabled
      !== (internalUpdateBrokerBinding ? "true" : "false")) {
    fail("production stack internal update broker output drifted");
  }
  const projectionRuntimeEnabled =
    parameters.EnableProjectionWorker === "true";
  let workerEventLocator = null;
  try {
    workerEventLocator = JSON.parse(
      parameters.ProjectionWorkerEventJson ?? "",
    );
  } catch {
    fail("production HRX projection worker locator is invalid");
  }
  let exactWorkerEventLocator = false;
  if (projectionRuntimeEnabled) {
    try {
      exactWorkerEventLocator = JSON.stringify(
        createJsonPostgresProductionWorkerEventLocator({
          packet,
          key: workerEventLocator?.key,
          versionId: workerEventLocator?.version_id,
          sha256: workerEventLocator?.sha256,
          byteSize: workerEventLocator?.byte_size,
        }),
      ) === JSON.stringify(workerEventLocator);
    } catch {
      exactWorkerEventLocator = false;
    }
  }
  if (projectionRuntimeEnabled
    ? exactWorkerEventLocator !== true
      || parameters.HrxProjectionMappingObjectKey
        === JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY
      || parameters.HrxProjectionValidationObjectKey
        === JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY
    : JSON.stringify(workerEventLocator) !== "{}"
      || parameters.HrxProjectionMappingObjectKey
        !== JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY
      || parameters.HrxProjectionValidationObjectKey
        !== JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY) {
    fail("production HRX projection runtime input binding drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    stack_status: stack.StackStatus,
    traffic_enabled: trafficEnabled,
    external_read_providers_enabled: false,
    internal_update_broker_enabled: internalUpdateBrokerBinding != null,
    temporary_eni_allow_expected: eniBootstrapEnabled ? 2 : 0,
  });
}

export function validateJsonPostgresW15WorkerObservability({
  rule,
  targets,
  invokeConfig,
  queueUrl,
  queueAttributes,
  alarms,
} = {}) {
  const ruleArn =
    `arn:aws:events:${JSON_POSTGRES_PRODUCTION_REGION}:`
    + `${JSON_POSTGRES_PRODUCTION_ACCOUNT}:rule/`
    + "lawos-production-projection-worker";
  const functionArn =
    `arn:aws:lambda:${JSON_POSTGRES_PRODUCTION_REGION}:`
    + `${JSON_POSTGRES_PRODUCTION_ACCOUNT}:function:`
    + "lawos-production-projection-worker";
  const queueArn =
    `arn:aws:sqs:${JSON_POSTGRES_PRODUCTION_REGION}:`
    + `${JSON_POSTGRES_PRODUCTION_ACCOUNT}:`
    + "lawos-production-projection-worker-dead-letter";
  const queueName = "lawos-production-projection-worker-dead-letter";
  const target = targets?.Targets?.find((item) =>
    item.Id === "lawos-production-projection-worker");
  const attributes = queueAttributes?.Attributes ?? {};
  let queuePolicy;
  try {
    queuePolicy = JSON.parse(attributes.Policy);
  } catch {
    fail("W15 projection worker dead-letter queue policy is unreadable");
  }
  const queueStatement = queuePolicy?.Statement?.find((item) =>
    item.Sid === "AllowExactProjectionWorkerScheduleDeliveryFailures");
  if (rule?.Name !== "lawos-production-projection-worker"
    || rule.Arn !== ruleArn
    || target?.Arn !== functionArn
    || target?.RetryPolicy?.MaximumEventAgeInSeconds !== 900
    || target?.RetryPolicy?.MaximumRetryAttempts !== 2
    || target?.DeadLetterConfig?.Arn !== queueArn
    || invokeConfig?.FunctionArn !== `${functionArn}:$LATEST`
    || invokeConfig?.MaximumEventAgeInSeconds !== 900
    || invokeConfig?.MaximumRetryAttempts !== 2
    || invokeConfig?.DestinationConfig?.OnFailure?.Destination !== queueArn
    || queueUrl !== `https://sqs.${JSON_POSTGRES_PRODUCTION_REGION}.amazonaws.com/${JSON_POSTGRES_PRODUCTION_ACCOUNT}/${queueName}`
    || attributes.QueueArn !== queueArn
    || attributes.SqsManagedSseEnabled !== "true"
    || attributes.MessageRetentionPeriod !== "1209600"
    || Number(attributes.ApproximateNumberOfMessages ?? -1) !== 0
    || Number(attributes.ApproximateNumberOfMessagesNotVisible ?? -1) !== 0
    || queueStatement?.Effect !== "Allow"
    || queueStatement?.Principal?.Service !== "events.amazonaws.com"
    || queueStatement?.Action !== "sqs:SendMessage"
    || queueStatement?.Resource !== queueArn
    || queueStatement?.Condition?.ArnEquals?.["aws:SourceArn"] !== ruleArn
    || queueStatement?.Condition?.StringEquals?.["aws:SourceAccount"]
      !== JSON_POSTGRES_PRODUCTION_ACCOUNT) {
    fail("W15 projection worker retry or dead-letter runtime drifted");
  }
  const expectedAlarms = new Map([
    ["lawos-production-projection-worker-errors", {
      namespace: "AWS/Lambda",
      metric: "Errors",
      dimension: { Name: "FunctionName", Value: "lawos-production-projection-worker" },
      threshold: 1,
    }],
    ["lawos-production-projection-worker-delivery-failures", {
      namespace: "AWS/Events",
      metric: "FailedInvocations",
      dimension: { Name: "RuleName", Value: "lawos-production-projection-worker" },
      threshold: 1,
    }],
    ["lawos-production-projection-worker-dead-letter", {
      namespace: "AWS/SQS",
      metric: "ApproximateNumberOfMessagesVisible",
      dimension: { Name: "QueueName", Value: queueName },
      threshold: 1,
    }],
    ["lawos-production-projection-worker-lag", {
      namespace: "LawOS/W15",
      metric: "OutboxLagMilliseconds",
      dimension: { Name: "Worker", Value: "relational-projection" },
      threshold: 24,
    }],
  ]);
  const observedAlarms = alarms?.MetricAlarms ?? [];
  if (observedAlarms.length !== expectedAlarms.size) {
    fail("W15 projection worker alarm inventory drifted");
  }
  for (const alarm of observedAlarms) {
    const expected = expectedAlarms.get(alarm.AlarmName);
    if (!expected
      || alarm.Namespace !== expected.namespace
      || alarm.MetricName !== expected.metric
      || alarm.Threshold !== expected.threshold
      || JSON.stringify(alarm.Dimensions)
        !== JSON.stringify([expected.dimension])
      || alarm.StateValue === "ALARM") {
      fail("W15 projection worker alarm state or contract drifted");
    }
  }
  return Object.freeze({
    verdict: "PASS",
    delivery_retry_maximum_attempts: 2,
    execution_retry_maximum_attempts: 2,
    dead_letter_queue_message_count: 0,
    worker_alarm_count: expectedAlarms.size,
    worker_alarm_state_count: observedAlarms.length,
    observed_outbox_lag_threshold_ms: 24,
  });
}

export function createJsonPostgresProductionWorkerEventLocator({
  packet,
  key,
  versionId,
  sha256: digest,
  byteSize,
} = {}) {
  const expectedPrefix =
    `program-input/${packet?.packet_sha256}/w15-worker-event/`
    + `${packet?.source_sha}/`;
  if (packet?.target?.program_input_bucket_name
      !== `lawos-prod-program-input-${JSON_POSTGRES_PRODUCTION_ACCOUNT}`
    || packet?.target?.program_input_expected_bucket_owner
      !== JSON_POSTGRES_PRODUCTION_ACCOUNT
    || !key?.startsWith(expectedPrefix)
    || key !== `${expectedPrefix}${digest}.json`
    || key.split("/").includes("..")
    || !versionId
    || versionId === "null"
    || !SHA256.test(digest ?? "")
    || !Number.isSafeInteger(byteSize)
    || byteSize < 1) {
    fail("production W15 worker event locator is invalid");
  }
  return Object.freeze({
    schema_version: JSON_POSTGRES_IMMUTABLE_PROGRAM_INPUT_LOCATOR_VERSION,
    bucket: packet.target.program_input_bucket_name,
    key,
    version_id: versionId,
    expected_bucket_owner:
      packet.target.program_input_expected_bucket_owner,
    sha256: digest,
    byte_size: byteSize,
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
