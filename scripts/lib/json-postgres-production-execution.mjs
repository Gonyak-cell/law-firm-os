import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";
import {
  isVersionedCloudFormationS3TemplateUrl,
} from "./cloudformation-template-transport.mjs";
import {
  validateJsonPostgresProductionDeploymentManifest,
} from "./json-postgres-production-artifact.mjs";

export const JSON_POSTGRES_PRODUCTION_ACCOUNT = "770880870480";
export const JSON_POSTGRES_PRODUCTION_REGION = "ap-northeast-2";
export const JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE = "matter-prod-deploy-admin";
export const JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE = "matter-cutover-operator";
export const JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE = "matter-readonly-auditor";
export const JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK = "lawos-production-artifact-store";
export const JSON_POSTGRES_PRODUCTION_STACK = "lawos-production";
export const JSON_POSTGRES_IMMUTABLE_PROGRAM_INPUT_LOCATOR_VERSION =
  "law-firm-os.immutable-program-input-locator.v1";
export const JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY =
  "disabled/hrx-projection-mapping.json";
export const JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY =
  "disabled/hrx-projection-validation.json";

const SHA1 = /^[a-f0-9]{40}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const IMMUTABLE_ARTIFACT_VERSION = /^[A-Za-z0-9._~+/=-]{1,1024}$/u;
const SAFE_CONDITIONAL_REPLACEMENT = new Set([
  "HttpApiIntegration",
  "HttpApiInvokePermission",
  "PasswordResetWorkerInvokePermission",
  "PasswordResetWorkerSchedule",
]);
export const JSON_POSTGRES_PROFILE_ARTIFACT_PURPOSE =
  "profile-artifact-rebind";
export const JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_VERSION =
  "law-firm-os.json-postgres-profile-artifact-promote-receipt-authority.v1";
export const JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION =
  "lawos-json-postgres-profile-artifact-promote-receipt";
export const JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ROLE =
  "profile-artifact-receipt-attestor";
export const JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT =
  "lawos-production";
const JSON_POSTGRES_PROFILE_ARTIFACT_ACTIONS = new Set([
  "promote",
  "rollback",
]);
const JSON_POSTGRES_PROFILE_ARTIFACT_CHANGED_PARAMETERS = new Set([
  "ArtifactKey",
  "ArtifactVersion",
  "ArtifactSha256",
  "OwnerTrustRegistrySha256",
  "BootstrapApprovalId",
  "Owner",
  "ReviewDate",
  "ExpirationDate",
  "RuntimeGeneration",
  "ExecutionPacketSha256",
]);
const JSON_POSTGRES_PRODUCTION_PARAMETER_KEYS = new Set([
  "ArtifactBucket",
  "ArtifactKey",
  "ArtifactVersion",
  "SourceSha",
  "SourceTree",
  "ArtifactSha256",
  "OwnerTrustRegistrySha256",
  "BootstrapApprovalId",
  "Owner",
  "ReviewDate",
  "ExpirationDate",
  "AllowedOrigins",
  "PasswordResetSesIdentityArn",
  "PasswordResetFromEmail",
  "EnableLambdaEniBootstrap",
  "RuntimeGeneration",
  "ExecutionPacketSha256",
  "ProgramInputBucketName",
  "DmsBucketName",
  "PrimaryTenantId",
  "EnableProductionTraffic",
  "EnableProjectionWorker",
  "ProjectionWorkerEventJson",
  "HrxProjectionMappingObjectKey",
  "HrxProjectionValidationObjectKey",
  "ProjectionWorkerLagThresholdMs",
  "MonthlyCostCeilingKrw",
]);
const JSON_POSTGRES_PROFILE_ARTIFACT_RESOURCE_TYPES = new Map([
  ["ApiFunction", "AWS::Lambda::Function"],
  ["AdminFunction", "AWS::Lambda::Function"],
  ["ProjectionAuditorFunction", "AWS::Lambda::Function"],
  ["ProjectionWorkerFunction", "AWS::Lambda::Function"],
  ["HttpApiIntegration", "AWS::ApiGatewayV2::Integration"],
  ["PasswordResetWorkerSchedule", "AWS::Events::Rule"],
  ["PasswordResetWorkerInvokePermission", "AWS::Lambda::Permission"],
  ["ProjectionWorkerSchedule", "AWS::Events::Rule"],
  ["ProjectionWorkerInvokePermission", "AWS::Lambda::Permission"],
]);
const JSON_POSTGRES_PROFILE_ARTIFACT_REQUIRED_FUNCTIONS = new Set([
  "ApiFunction",
  "AdminFunction",
  "ProjectionAuditorFunction",
  "ProjectionWorkerFunction",
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
  "PasswordResetWorkerInvokePermission",
  "PasswordResetWorkerSchedule",
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

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(message) {
  throw new Error(message);
}

const PROFILE_ARTIFACT_PROMOTE_AUTHORITY_KEYS = Object.freeze([
  "schema_version",
  "action",
  "environment",
  "receipt_bytes_sha256",
  "receipt_result_sha256",
  "trust_registry_sha256",
  "source_sha",
  "source_tree",
  "signer_key_id",
  "signer_fingerprint_sha256",
  "signed_at",
]);
const PROFILE_ARTIFACT_TRUST_REGISTRY_KEYS = Object.freeze([
  "schema_version",
  "generated_at",
  "keys",
]);
const PROFILE_ARTIFACT_TRUST_KEY_KEYS = Object.freeze([
  "key_id",
  "algorithm",
  "public_key_spki_pem",
  "roles",
  "actions",
  "environments",
  "valid_from",
  "valid_until",
  "revoked_at",
]);

function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || stableJson(Object.keys(value).sort())
      !== stableJson([...expected].sort())) {
    fail(`${label} is invalid`);
  }
}

function authorityTimestamp(value, label) {
  if (typeof value !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(value)
    || !Number.isFinite(Date.parse(value))) {
    fail(`${label} is invalid`);
  }
  return Date.parse(value);
}

function authorityJson(bytes, label) {
  if (!Buffer.isBuffer(bytes) || bytes.byteLength < 2) {
    fail(`${label} bytes are invalid`);
  }
  try {
    return JSON.parse(bytes);
  } catch {
    fail(`${label} JSON is invalid`);
  }
}

export function verifyJsonPostgresProfileArtifactPromoteReceiptAuthority({
  receiptBytes,
  authorityBytes,
  signatureBytes,
  trustRegistryBytes,
  expectedTrustRegistrySha256,
  expectedSourceSha,
  expectedSourceTree,
  now = Date.now(),
} = {}) {
  const receipt = authorityJson(
    receiptBytes,
    "prior profile artifact promote receipt",
  );
  const authority = authorityJson(
    authorityBytes,
    "prior profile artifact promote receipt authority",
  );
  const registry = authorityJson(
    trustRegistryBytes,
    "prior profile artifact promote trust registry",
  );
  exactKeys(
    authority,
    PROFILE_ARTIFACT_PROMOTE_AUTHORITY_KEYS,
    "prior profile artifact promote receipt authority",
  );
  exactKeys(
    registry,
    PROFILE_ARTIFACT_TRUST_REGISTRY_KEYS,
    "prior profile artifact promote trust registry",
  );
  const registrySha256 = sha256Bytes(trustRegistryBytes);
  const receiptBytesSha256 = sha256Bytes(receiptBytes);
  if (!SHA256.test(expectedTrustRegistrySha256 ?? "")
    || registrySha256 !== expectedTrustRegistrySha256
    || registry.schema_version
      !== "law-firm-os.runtime-safety.approval-trust-registry.v1"
    || !Array.isArray(registry.keys)
    || registry.keys.length < 1
    || new Set(registry.keys.map((key) => key?.key_id)).size
      !== registry.keys.length
    || authority.schema_version
      !== JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_VERSION
    || authority.action
      !== JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION
    || authority.environment
      !== JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT
    || authority.receipt_bytes_sha256 !== receiptBytesSha256
    || authority.receipt_result_sha256 !== receipt?.result_sha256
    || authority.trust_registry_sha256 !== registrySha256
    || authority.source_sha !== expectedSourceSha
    || authority.source_tree !== expectedSourceTree
    || receipt?.source_sha !== expectedSourceSha
    || receipt?.source_tree !== expectedSourceTree
    || !SHA1.test(expectedSourceSha ?? "")
    || !SHA1.test(expectedSourceTree ?? "")
    || !SHA256.test(authority.receipt_result_sha256 ?? "")
    || !SHA256.test(authority.signer_fingerprint_sha256 ?? "")
    || !/^[A-Za-z0-9._-]{1,200}$/u.test(authority.signer_key_id ?? "")) {
    fail("prior profile artifact promote receipt authority binding is invalid");
  }
  const key = registry.keys.find(
    (candidate) => candidate?.key_id === authority.signer_key_id,
  );
  if (!key) {
    fail("prior profile artifact promote receipt authority key is invalid");
  }
  exactKeys(
    key,
    PROFILE_ARTIFACT_TRUST_KEY_KEYS,
    "prior profile artifact promote receipt authority key",
  );
  if (key.algorithm !== "Ed25519"
    || key.revoked_at != null
    || stableJson(key.roles)
      !== stableJson([JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ROLE])
    || stableJson(key.actions)
      !== stableJson([JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ACTION])
    || stableJson(key.environments)
      !== stableJson([
        JSON_POSTGRES_PROFILE_ARTIFACT_PROMOTE_AUTHORITY_ENVIRONMENT,
      ])) {
    fail("prior profile artifact promote receipt authority key is invalid");
  }
  const signedAt = authorityTimestamp(
    authority.signed_at,
    "prior profile artifact promote receipt authority signed_at",
  );
  const receiptGeneratedAt = authorityTimestamp(
    receipt.generated_at,
    "prior profile artifact promote receipt generated_at",
  );
  const validFrom = authorityTimestamp(
    key.valid_from,
    "prior profile artifact promote receipt authority key valid_from",
  );
  const validUntil = authorityTimestamp(
    key.valid_until,
    "prior profile artifact promote receipt authority key valid_until",
  );
  if (!Number.isFinite(now)
    || signedAt > now
    || signedAt < receiptGeneratedAt
    || validUntil <= validFrom
    || signedAt < validFrom
    || signedAt > validUntil) {
    fail("prior profile artifact promote receipt authority time is invalid");
  }
  let publicKey;
  let fingerprint;
  try {
    publicKey = createPublicKey(key.public_key_spki_pem);
    fingerprint = sha256Bytes(publicKey.export({
      type: "spki",
      format: "der",
    }));
  } catch {
    fail("prior profile artifact promote receipt authority key is invalid");
  }
  if (fingerprint !== authority.signer_fingerprint_sha256
    || !Buffer.isBuffer(signatureBytes)
    || signatureBytes.byteLength !== 64
    || !verifySignature(
      null,
      Buffer.from(stableJson(authority)),
      publicKey,
      signatureBytes,
    )) {
    fail("prior profile artifact promote receipt authority signature is invalid");
  }
  return Object.freeze({
    receipt: Object.freeze(receipt),
    receipt_bytes_sha256: receiptBytesSha256,
    receipt_authority_sha256: sha256Bytes(authorityBytes),
    receipt_signature_sha256: sha256Bytes(signatureBytes),
    receipt_trust_registry_sha256: registrySha256,
    receipt_signer_key_id: authority.signer_key_id,
    receipt_signer_fingerprint_sha256: fingerprint,
    receipt_authority_signed_at: authority.signed_at,
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

export function validateObservedChangeSetParameters(
  changeSet,
  expectedParameters,
) {
  if (!expectedParameters
    || typeof expectedParameters !== "object"
    || Array.isArray(expectedParameters)) {
    fail("expected CloudFormation change-set parameters are invalid");
  }
  const expected = Object.fromEntries(
    Object.entries(expectedParameters).map(([key, value]) => {
      if (!/^[A-Za-z0-9]+$/u.test(key)
        || value === undefined
        || value === null) {
        fail("expected CloudFormation change-set parameters are invalid");
      }
      return [key, String(value)];
    }),
  );
  const expectedKeys = Object.keys(expected).sort();
  const entries = changeSet?.Parameters;
  if (expectedKeys.length < 1
    || !Array.isArray(entries)
    || entries.length !== expectedKeys.length) {
    fail("observed CloudFormation change-set parameters are incomplete");
  }
  const observed = {};
  for (const entry of entries) {
    const entryKeys = Object.keys(entry ?? {});
    if (!entry
      || typeof entry !== "object"
      || Array.isArray(entry)
      || entryKeys.some((key) => ![
        "ParameterKey",
        "ParameterValue",
        "UsePreviousValue",
      ].includes(key))
      || !Object.hasOwn(entry, "ParameterKey")
      || !Object.hasOwn(entry, "ParameterValue")
      || Object.hasOwn(entry, "ResolvedValue")
      || (Object.hasOwn(entry, "UsePreviousValue")
        && entry.UsePreviousValue !== false)
      || typeof entry.ParameterKey !== "string"
      || typeof entry.ParameterValue !== "string"
      || !Object.hasOwn(expected, entry.ParameterKey)
      || Object.hasOwn(observed, entry.ParameterKey)) {
      fail("observed CloudFormation change-set parameters are ambiguous");
    }
    observed[entry.ParameterKey] = entry.ParameterValue;
  }
  if (stableJson(observed) !== stableJson(expected)) {
    fail("observed CloudFormation change-set parameters drifted");
  }
  return Object.freeze({
    expected_parameters: Object.freeze(expected),
    observed_parameters_sha256:
      jsonPostgresProductionParametersSha256(observed),
  });
}

function validateProfileArtifactChanges(changes, template) {
  if (!Array.isArray(changes) || changes.length < 1) {
    fail("profile artifact change set is empty");
  }
  const templateResources = new Set(Object.keys(template?.Resources ?? {}));
  const observed = new Set();
  for (const change of changes) {
    const expectedType = JSON_POSTGRES_PROFILE_ARTIFACT_RESOURCE_TYPES.get(
      change.logical_resource_id,
    );
    if (!templateResources.has(change.logical_resource_id)
      || change.action !== "Modify"
      || change.resource_type !== expectedType
      || change.replacement !== "False"
      || JSON.stringify(change.scope) !== JSON.stringify(["Properties"])) {
      fail("profile artifact change set contains an unapproved resource change");
    }
    observed.add(change.logical_resource_id);
  }
  if ([...JSON_POSTGRES_PROFILE_ARTIFACT_REQUIRED_FUNCTIONS].some(
    (logicalId) => !observed.has(logicalId),
  )) {
    fail("profile artifact change set is missing a required Lambda update");
  }
}

function profileArtifactChangeSetReviewMaterial(review) {
  return {
    purpose: JSON_POSTGRES_PROFILE_ARTIFACT_PURPOSE,
    profile_artifact_action: review.profile_artifact_action,
    profile_artifact_transition_sha256:
      review.profile_artifact_transition_sha256,
    stack_name: review.stack_name,
    change_set_type: review.change_set_type,
    change_set_id: review.change_set_id,
    template_sha256: review.template_sha256,
    parameters_sha256: review.parameters_sha256,
    expected_parameters: review.expected_parameters,
    observed_parameters_sha256: review.observed_parameters_sha256,
    ...(review.template_url == null
      ? {}
      : { template_url: review.template_url }),
    changes: review.changes,
  };
}

export function validateJsonPostgresProfileArtifactChangeSet(changeSet, {
  template,
  expectedParameters,
  parametersSha256,
  templateSha256,
  templateUrl = null,
  profileArtifactAction,
  profileArtifactTransitionSha256,
} = {}) {
  if (changeSet?.StackName !== JSON_POSTGRES_PRODUCTION_STACK
    || (changeSet?.ChangeSetType != null
      && changeSet.ChangeSetType !== "UPDATE")
    || typeof changeSet?.ChangeSetId !== "string"
    || changeSet.ChangeSetId.length === 0
    || !JSON_POSTGRES_PROFILE_ARTIFACT_ACTIONS.has(profileArtifactAction)
    || !SHA256.test(profileArtifactTransitionSha256 ?? "")
    || !SHA256.test(parametersSha256 ?? "")
    || !SHA256.test(templateSha256 ?? "")
    || (templateUrl !== null
      && !isVersionedCloudFormationS3TemplateUrl(templateUrl))) {
    fail("profile artifact change set binding is invalid");
  }
  const changes = normalizedChanges(changeSet);
  const parameterObservation = validateObservedChangeSetParameters(
    changeSet,
    expectedParameters,
  );
  if (parametersSha256
      !== jsonPostgresProductionParametersSha256(
        parameterObservation.expected_parameters,
      )
    || parameterObservation.observed_parameters_sha256
      !== parametersSha256) {
    fail("profile artifact change set parameter binding is invalid");
  }
  validateProfileArtifactChanges(changes, template);
  const reviewMaterial = profileArtifactChangeSetReviewMaterial({
    profile_artifact_action: profileArtifactAction,
    profile_artifact_transition_sha256:
      profileArtifactTransitionSha256,
    stack_name: JSON_POSTGRES_PRODUCTION_STACK,
    change_set_type: "UPDATE",
    change_set_id: changeSet.ChangeSetId,
    template_sha256: templateSha256,
    parameters_sha256: parametersSha256,
    ...parameterObservation,
    template_url: templateUrl,
    changes,
  });
  return Object.freeze({
    verdict: "PASS",
    ...reviewMaterial,
    change_count: changes.length,
    replacement_true_count: 0,
    reviewed_change_set_sha256: sha256(reviewMaterial),
  });
}

export function validateJsonPostgresProductionChangeSet(changeSet, {
  stackName,
  changeSetType,
  template,
  expectedParameters,
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
  const parameterObservation = validateObservedChangeSetParameters(
    changeSet,
    expectedParameters,
  );
  if (parametersSha256
      !== jsonPostgresProductionParametersSha256(
        parameterObservation.expected_parameters,
      )
    || parameterObservation.observed_parameters_sha256
      !== parametersSha256) {
    fail("production change set parameter binding is invalid");
  }
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
    ...parameterObservation,
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
  expectedParameters,
  parametersSha256,
  templateSha256,
  templateUrl = null,
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
  const templateResources = new Set(Object.keys(template?.Resources ?? {}));
  const parameterObservation = validateObservedChangeSetParameters(
    changeSet,
    expectedParameters,
  );
  if (parametersSha256
      !== jsonPostgresProductionParametersSha256(
        parameterObservation.expected_parameters,
      )
    || parameterObservation.observed_parameters_sha256
      !== parametersSha256) {
    fail("W15 production change set parameter binding is invalid");
  }
  const allowedAdds = new Set(JSON_POSTGRES_W15_ALLOWED_ADDED_RESOURCES);
  const allowedModifies =
    new Set(JSON_POSTGRES_W15_ALLOWED_MODIFIED_RESOURCES);
  const changes = normalizedChanges(changeSet);
  if (changes.length < 1) fail("W15 production change set is empty");
  for (const change of changes) {
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
    ...parameterObservation,
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
  projectionWorkerPacket = packet,
} = {}) {
  const parameters = normalizeJsonPostgresProductionStackParameters(stack);
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
    EnableProjectionWorker: projectionWorkerEnabled ? "true" : "false",
    ProjectionWorkerLagThresholdMs: "24",
    MonthlyCostCeilingKrw: "300000",
  })) {
    if (parameters[key] !== expected) fail(`production stack parameter ${key} drifted`);
  }
  if (!/^(?:CREATE|UPDATE)_COMPLETE$/u.test(stack?.StackStatus ?? "")) {
    fail("production stack is not complete");
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
          packet: projectionWorkerPacket,
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
    temporary_eni_allow_expected: eniBootstrapEnabled ? 2 : 0,
  });
}

function profileArtifactManifestSummary(manifest, manifestSha256, label) {
  validateJsonPostgresProductionDeploymentManifest(manifest);
  const profile = manifest.profile_photo_artifact;
  if (!SHA256.test(manifestSha256 ?? "")
    || !SHA1.test(manifest.source_sha ?? "")
    || !SHA1.test(manifest.source_tree ?? "")
    || !SHA256.test(manifest.artifact_sha256 ?? "")) {
    fail(`${label} production artifact manifest binding is invalid`);
  }
  return Object.freeze({
    source_sha: manifest.source_sha,
    source_tree: manifest.source_tree,
    artifact_sha256: manifest.artifact_sha256,
    artifact_manifest_sha256: manifestSha256,
    profile_generation_ref: profile.generation_ref,
    private_manifest_sha256: profile.private_manifest_sha256,
    profile_counts: Object.freeze({
      private_manifest_entry_count: profile.private_manifest_entry_count,
      injected_photo_entry_count: profile.injected_photo_entry_count,
      git_source_photo_entry_count: profile.git_source_photo_entry_count,
    }),
  });
}

export function normalizeJsonPostgresProductionStackParameters(stack) {
  const entries = stack?.Parameters;
  if (!Array.isArray(entries)
    || entries.length !== JSON_POSTGRES_PRODUCTION_PARAMETER_KEYS.size) {
    fail("production stack parameter inventory drifted");
  }
  const parameters = {};
  for (const entry of entries) {
    const entryKeys = Object.keys(entry ?? {});
    if (!entry
      || typeof entry !== "object"
      || Array.isArray(entry)
      || entryKeys.some((key) => ![
        "ParameterKey",
        "ParameterValue",
        "UsePreviousValue",
      ].includes(key))
      || !Object.hasOwn(entry, "ParameterKey")
      || !Object.hasOwn(entry, "ParameterValue")
      || Object.hasOwn(entry, "ResolvedValue")
      || (Object.hasOwn(entry, "UsePreviousValue")
        && entry.UsePreviousValue !== false)
      || typeof entry.ParameterKey !== "string"
      || typeof entry.ParameterValue !== "string"
      || !JSON_POSTGRES_PRODUCTION_PARAMETER_KEYS.has(entry.ParameterKey)
      || Object.hasOwn(parameters, entry.ParameterKey)) {
      fail("production stack parameter inventory drifted");
    }
    parameters[entry.ParameterKey] = entry.ParameterValue;
  }
  return Object.freeze(parameters);
}

function validatePriorProfileArtifactPromoteReceipt(authentication, {
  packet,
  current,
  baseline,
  target,
  baselineArtifactKey,
  targetArtifactKey,
  upload,
  approvalId,
} = {}) {
  const receipt = authentication?.receipt;
  const currentRuntimeGeneration = Number(current.RuntimeGeneration);
  if (receipt?.schema_version
      !== "law-firm-os.json-postgres-production-infrastructure-result.v1"
    || receipt.operation !== "execute-profile-artifact-change-set"
    || receipt.purpose !== JSON_POSTGRES_PROFILE_ARTIFACT_PURPOSE
    || receipt.outcome !== "PASS"
    || receipt.profile_artifact_action !== "promote"
    || receipt.source_sha !== packet.source_sha
    || receipt.source_tree !== packet.source_tree
    || receipt.packet_sha256 !== current.ExecutionPacketSha256
    || receipt.target_execution_packet_sha256
      !== current.ExecutionPacketSha256
    || receipt.target_runtime_generation !== currentRuntimeGeneration
    || receipt.target_parameters_sha256
      !== jsonPostgresProductionParametersSha256(current)
    || receipt.target_artifact_sha256 !== baseline.artifact_sha256
    || receipt.target_artifact_manifest_sha256
      !== baseline.artifact_manifest_sha256
    || receipt.target_artifact_key !== baselineArtifactKey
    || receipt.target_artifact_version !== current.ArtifactVersion
    || receipt.target_profile_generation_ref
      !== baseline.profile_generation_ref
    || receipt.target_private_manifest_sha256
      !== baseline.private_manifest_sha256
    || stableJson(receipt.target_profile_counts)
      !== stableJson(baseline.profile_counts)
    || receipt.target_approval_id_sha256
      !== sha256(current.BootstrapApprovalId)
    || sha256(approvalId) === receipt.target_approval_id_sha256
    || !SHA256.test(receipt.baseline_approval_id_sha256 ?? "")
    || sha256(approvalId) === receipt.baseline_approval_id_sha256
    || receipt.baseline_artifact_sha256 !== target.artifact_sha256
    || receipt.baseline_artifact_manifest_sha256
      !== target.artifact_manifest_sha256
    || receipt.baseline_artifact_key !== targetArtifactKey
    || receipt.baseline_artifact_version !== upload.artifact_version
    || receipt.baseline_profile_generation_ref
      !== target.profile_generation_ref
    || receipt.baseline_private_manifest_sha256
      !== target.private_manifest_sha256
    || stableJson(receipt.baseline_profile_counts)
      !== stableJson(target.profile_counts)
    || receipt.baseline_execution_packet_sha256 !== upload.packet_sha256
    || receipt.target_artifact_version_verified !== true
    || receipt.target_artifact_version_head_verified_count !== 1
    || receipt.target_artifact_server_side_encryption !== "aws:kms"
    || !SHA256.test(receipt.target_artifact_kms_key_ref_sha256 ?? "")
    || !SHA256.test(receipt.reviewed_change_set_sha256 ?? "")
    || receipt.active_successful_lambda_count !== 4
    || receipt.lambda_code_sha256_verified_count !== 4
    || receipt.runtime_generation_bound_lambda_count !== 4
    || receipt.production_traffic_enabled !== true
    || receipt.lambda_eni_bootstrap_enabled !== false
    || receipt.production_data_write_count !== 0
    || receipt.production_write_count !== 0
    || receipt.aws_mutation_count !== 1
    || !SHA256.test(receipt.profile_artifact_transition_sha256 ?? "")
    || !SHA256.test(receipt.approval_receipt_sha256 ?? "")
    || receipt.result_sha256
      !== jsonPostgresProductionInfrastructureResultSha256(receipt)) {
    fail("prior profile artifact promote receipt lineage is invalid");
  }
  return Object.freeze({
    prior_promote_execution_receipt_sha256: receipt.result_sha256,
    prior_promote_execution_receipt_bytes_sha256:
      authentication.receipt_bytes_sha256,
    prior_promote_execution_receipt_authority_sha256:
      authentication.receipt_authority_sha256,
    prior_promote_execution_receipt_signature_sha256:
      authentication.receipt_signature_sha256,
    prior_promote_execution_receipt_trust_registry_sha256:
      authentication.receipt_trust_registry_sha256,
    prior_promote_execution_receipt_signer_key_id:
      authentication.receipt_signer_key_id,
    prior_promote_execution_receipt_signer_fingerprint_sha256:
      authentication.receipt_signer_fingerprint_sha256,
    prior_promote_execution_receipt_authority_signed_at:
      authentication.receipt_authority_signed_at,
  });
}

export function buildJsonPostgresProfileArtifactTransition({
  profileArtifactAction,
  packet,
  baselineManifest,
  baselineManifestSha256,
  targetManifest,
  targetManifestSha256,
  artifactUploadEvidence,
  priorPromoteExecutionReceiptBytes = null,
  priorPromoteExecutionReceiptAuthorityBytes = null,
  priorPromoteExecutionReceiptSignatureBytes = null,
  priorPromoteExecutionReceiptTrustRegistryBytes = null,
  currentStack,
  trustRegistrySha256,
  approvalId,
  owner,
  reviewDate,
  expirationDate,
  runtimeGeneration,
} = {}) {
  if (!JSON_POSTGRES_PROFILE_ARTIFACT_ACTIONS.has(profileArtifactAction)) {
    fail("profile artifact action must be promote or rollback");
  }
  const baseline = profileArtifactManifestSummary(
    baselineManifest,
    baselineManifestSha256,
    "baseline",
  );
  const target = profileArtifactManifestSummary(
    targetManifest,
    targetManifestSha256,
    "target",
  );
  if (baseline.source_sha !== target.source_sha
    || baseline.source_tree !== target.source_tree
    || target.source_sha !== packet?.source_sha
    || target.source_tree !== packet?.source_tree
    || target.artifact_sha256 !== packet?.bindings?.artifact_sha256
    || target.artifact_manifest_sha256
      !== packet?.bindings?.artifact_manifest_sha256) {
    fail("profile artifact baseline and target source binding drifted");
  }
  if (baseline.artifact_sha256 === target.artifact_sha256
    || baseline.profile_generation_ref === target.profile_generation_ref
    || baseline.private_manifest_sha256 === target.private_manifest_sha256) {
    fail("profile artifact transition must change artifact and profile generation");
  }
  const baselineArtifactKey =
    `lawos-production/${packet.source_sha}/${baseline.artifact_sha256}.zip`;
  const targetArtifactKey =
    `lawos-production/${packet.source_sha}/${target.artifact_sha256}.zip`;
  const upload = artifactUploadEvidence;
  if (upload?.schema_version
      !== "law-firm-os.json-postgres-production-artifact-upload.v1"
    || upload.operation !== "upload-artifact"
    || upload.outcome !== "PASS"
    || upload.source_sha !== packet.source_sha
    || upload.source_tree !== packet.source_tree
    || !SHA256.test(upload.packet_sha256 ?? "")
    || (profileArtifactAction === "promote"
      && upload.packet_sha256 !== packet.packet_sha256)
    || upload.artifact_sha256 !== target.artifact_sha256
    || upload.artifact_key !== targetArtifactKey
    || !IMMUTABLE_ARTIFACT_VERSION.test(upload.artifact_version ?? "")
    || upload.artifact_version === "null"
    || upload.production_write_count !== 0
    || upload.result_sha256
      !== jsonPostgresProductionInfrastructureResultSha256(upload)) {
    fail("profile artifact upload evidence is invalid");
  }
  const current = normalizeJsonPostgresProductionStackParameters(currentStack);
  const projectionWorkerEnabled = current.EnableProjectionWorker === "true";
  if (!/^(?:CREATE|UPDATE)_COMPLETE$/u.test(currentStack?.StackStatus ?? "")
    || !["true", "false"].includes(current.EnableProjectionWorker)
    || current.ArtifactBucket !== packet.target.artifact_bucket_name
    || current.ArtifactKey !== baselineArtifactKey
    || current.SourceSha !== baseline.source_sha
    || current.SourceTree !== baseline.source_tree
    || current.ArtifactSha256 !== baseline.artifact_sha256
    || !IMMUTABLE_ARTIFACT_VERSION.test(current.ArtifactVersion ?? "")
    || current.ArtifactVersion === "null"
    || current.ExecutionPacketSha256 === packet.packet_sha256
    || !SHA256.test(current.ExecutionPacketSha256 ?? "")
    || !SHA256.test(current.OwnerTrustRegistrySha256 ?? "")
    || !String(current.BootstrapApprovalId ?? "")
    || !String(current.Owner ?? "")
    || !String(current.ReviewDate ?? "")
    || !String(current.ExpirationDate ?? "")
    || !String(current.AllowedOrigins ?? "")
    || !String(current.PasswordResetSesIdentityArn ?? "")
    || !String(current.PasswordResetFromEmail ?? "")
    || !packet.target.approved_tenant_ids?.includes(current.PrimaryTenantId)
    || !SHA256.test(trustRegistrySha256 ?? "")
    || !String(approvalId ?? "")
    || approvalId === current.BootstrapApprovalId
    || !String(owner ?? "")
    || !String(reviewDate ?? "")
    || !String(expirationDate ?? "")) {
    fail("profile artifact baseline stack binding drifted");
  }
  const priorInputs = [
    priorPromoteExecutionReceiptBytes,
    priorPromoteExecutionReceiptAuthorityBytes,
    priorPromoteExecutionReceiptSignatureBytes,
    priorPromoteExecutionReceiptTrustRegistryBytes,
  ];
  if (profileArtifactAction === "promote"
    && priorInputs.some((value) => value != null)) {
    fail("promote cannot consume prior profile artifact receipt authority");
  }
  const priorPromoteAuthentication = profileArtifactAction === "rollback"
    ? verifyJsonPostgresProfileArtifactPromoteReceiptAuthority({
        receiptBytes: priorPromoteExecutionReceiptBytes,
        authorityBytes: priorPromoteExecutionReceiptAuthorityBytes,
        signatureBytes: priorPromoteExecutionReceiptSignatureBytes,
        trustRegistryBytes:
          priorPromoteExecutionReceiptTrustRegistryBytes,
        expectedTrustRegistrySha256: current.OwnerTrustRegistrySha256,
        expectedSourceSha: packet.source_sha,
        expectedSourceTree: packet.source_tree,
      })
    : null;
  const baselinePacket = {
    ...packet,
    packet_sha256: current.ExecutionPacketSha256,
    bindings: {
      ...packet.bindings,
      artifact_sha256: baseline.artifact_sha256,
    },
  };
  let projectionWorkerPacket = baselinePacket;
  if (projectionWorkerEnabled) {
    let workerEvent;
    try {
      workerEvent = JSON.parse(current.ProjectionWorkerEventJson);
    } catch {
      fail("profile artifact projection worker event is invalid");
    }
    const match = new RegExp(
      `^program-input/([a-f0-9]{64})/w15-worker-event/`
        + `${packet.source_sha}/`,
      "u",
    ).exec(workerEvent?.key ?? "");
    if (!match) fail("profile artifact projection worker event is invalid");
    projectionWorkerPacket = {
      ...baselinePacket,
      packet_sha256: match[1],
    };
  }
  assertJsonPostgresProductionStack(currentStack, {
    packet: baselinePacket,
    artifactVersion: current.ArtifactVersion,
    trustRegistrySha256: current.OwnerTrustRegistrySha256,
    trafficEnabled: true,
    eniBootstrapEnabled: false,
    projectionWorkerEnabled,
    projectionWorkerPacket,
  });
  const previousRuntimeGeneration = Number(current.RuntimeGeneration);
  if (!Number.isSafeInteger(previousRuntimeGeneration)
    || previousRuntimeGeneration < 1
    || !Number.isSafeInteger(runtimeGeneration)
    || runtimeGeneration !== previousRuntimeGeneration + 1) {
    fail("profile artifact runtime generation must advance by exactly one");
  }
  const priorPromoteLineage = profileArtifactAction === "rollback"
    ? validatePriorProfileArtifactPromoteReceipt(
        priorPromoteAuthentication,
        {
          packet,
          current,
          baseline,
          target,
          baselineArtifactKey,
          targetArtifactKey,
          upload,
          approvalId,
        },
      )
    : null;
  const parameters = Object.freeze({
    ...current,
    ArtifactKey: targetArtifactKey,
    ArtifactVersion: upload.artifact_version,
    ArtifactSha256: target.artifact_sha256,
    OwnerTrustRegistrySha256: trustRegistrySha256,
    BootstrapApprovalId: approvalId,
    Owner: owner,
    ReviewDate: reviewDate,
    ExpirationDate: expirationDate,
    RuntimeGeneration: String(runtimeGeneration),
    ExecutionPacketSha256: packet.packet_sha256,
  });
  const changedParameters = Object.keys(parameters).filter(
    (key) => parameters[key] !== current[key],
  );
  if (changedParameters.some(
    (key) => !JSON_POSTGRES_PROFILE_ARTIFACT_CHANGED_PARAMETERS.has(key),
  )) {
    fail("profile artifact transition changed a preserved stack parameter");
  }
  const preservedParameters = Object.fromEntries(
    Object.entries(current).filter(
      ([key]) => !JSON_POSTGRES_PROFILE_ARTIFACT_CHANGED_PARAMETERS.has(key),
    ),
  );
  const allowedOrigins = current.AllowedOrigins.split(",")
    .map((value) => value.trim()).filter(Boolean);
  if (allowedOrigins.length < 1) {
    fail("profile artifact baseline origins are invalid");
  }
  const transitionMaterial = {
    profile_artifact_action: profileArtifactAction,
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    baseline_artifact_sha256: baseline.artifact_sha256,
    baseline_artifact_manifest_sha256:
      baseline.artifact_manifest_sha256,
    baseline_artifact_key: baselineArtifactKey,
    baseline_artifact_version: current.ArtifactVersion,
    baseline_profile_generation_ref: baseline.profile_generation_ref,
    baseline_private_manifest_sha256: baseline.private_manifest_sha256,
    baseline_profile_counts: baseline.profile_counts,
    target_artifact_sha256: target.artifact_sha256,
    target_artifact_manifest_sha256: target.artifact_manifest_sha256,
    target_artifact_key: targetArtifactKey,
    target_artifact_version: upload.artifact_version,
    target_profile_generation_ref: target.profile_generation_ref,
    target_private_manifest_sha256: target.private_manifest_sha256,
    target_profile_counts: target.profile_counts,
    target_artifact_upload_packet_sha256: upload.packet_sha256,
    target_artifact_upload_receipt_sha256: upload.result_sha256,
    ...(priorPromoteLineage ?? {}),
    baseline_execution_packet_sha256: current.ExecutionPacketSha256,
    target_execution_packet_sha256: packet.packet_sha256,
    baseline_owner_trust_registry_sha256:
      current.OwnerTrustRegistrySha256,
    target_owner_trust_registry_sha256: trustRegistrySha256,
    baseline_approval_id_sha256: sha256(current.BootstrapApprovalId),
    target_approval_id_sha256: sha256(approvalId),
    previous_runtime_generation: previousRuntimeGeneration,
    target_runtime_generation: runtimeGeneration,
    target_parameters_sha256:
      jsonPostgresProductionParametersSha256(parameters),
    preserved_parameter_sha256: sha256(preservedParameters),
    preserved_parameter_count: Object.keys(preservedParameters).length,
    production_traffic_enabled: true,
    lambda_eni_bootstrap_enabled: false,
    projection_worker_enabled: projectionWorkerEnabled,
    projection_worker_packet_sha256:
      projectionWorkerPacket.packet_sha256,
    projection_worker_event_sha256:
      sha256(current.ProjectionWorkerEventJson),
    allowed_origins_sha256: sha256(current.AllowedOrigins),
    allowed_origin_count: allowedOrigins.length,
    artifact_bucket_name: current.ArtifactBucket,
    program_input_bucket_name: current.ProgramInputBucketName,
    dms_bucket_name: current.DmsBucketName,
    primary_tenant_id_sha256: sha256(current.PrimaryTenantId),
    production_data_write_count: 0,
  };
  return Object.freeze({
    parameters,
    evidence: Object.freeze({
      ...transitionMaterial,
      profile_artifact_transition_sha256: sha256(transitionMaterial),
    }),
  });
}

export function assertJsonPostgresProfileArtifactTargetStack(stack, {
  transition,
} = {}) {
  const current = normalizeJsonPostgresProductionStackParameters(stack);
  if (!transition?.parameters || !transition?.evidence
    || !/^(?:CREATE|UPDATE)_COMPLETE$/u.test(stack?.StackStatus ?? "")
    || stableJson(current) !== stableJson(transition.parameters)
    || jsonPostgresProductionParametersSha256(current)
      !== transition.evidence.target_parameters_sha256) {
    fail("profile artifact target stack binding drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    stack_status: stack.StackStatus,
    artifact_version: current.ArtifactVersion,
    runtime_generation: Number(current.RuntimeGeneration),
    production_traffic_enabled: current.EnableProductionTraffic === "true",
    lambda_eni_bootstrap_enabled:
      current.EnableLambdaEniBootstrap === "true",
    projection_worker_enabled: current.EnableProjectionWorker === "true",
  });
}

export function assertJsonPostgresProfileArtifactReviewedChangeSet(review, {
  transition,
  template,
  uploadVersion,
} = {}) {
  const expected = transition?.evidence;
  if (!expected
    || uploadVersion?.target_artifact_version_verified !== true
    || uploadVersion.target_artifact_version_head_verified_count !== 1
    || uploadVersion.target_artifact_version
      !== expected?.target_artifact_version
    || uploadVersion.target_artifact_object_lock_mode !== "COMPLIANCE"
    || uploadVersion.target_artifact_server_side_encryption !== "aws:kms"
    || !SHA256.test(
      uploadVersion.target_artifact_kms_key_ref_sha256 ?? "",
    )
    || review?.schema_version
      !== "law-firm-os.json-postgres-production-reviewed-change-set.v1"
    || review.operation !== "create-profile-artifact-change-set"
    || review.purpose !== JSON_POSTGRES_PROFILE_ARTIFACT_PURPOSE
    || review.outcome !== "PASS"
    || review.stack_name !== JSON_POSTGRES_PRODUCTION_STACK
    || review.change_set_type !== "UPDATE"
    || review.parameters_sha256 !== expected.target_parameters_sha256
    || review.observed_parameters_sha256
      !== expected.target_parameters_sha256
    || stableJson(review.expected_parameters)
      !== stableJson(transition.parameters)
    || review.artifact_version !== expected.target_artifact_version
    || review.target_artifact_version_verified
      !== uploadVersion.target_artifact_version_verified
    || review.target_artifact_version_head_verified_count
      !== uploadVersion.target_artifact_version_head_verified_count
    || review.target_artifact_version !== uploadVersion.target_artifact_version
    || review.target_artifact_object_lock_mode
      !== uploadVersion.target_artifact_object_lock_mode
    || review.target_artifact_server_side_encryption
      !== uploadVersion.target_artifact_server_side_encryption
    || review.target_artifact_kms_key_ref_sha256
      !== uploadVersion.target_artifact_kms_key_ref_sha256
    || review.aws_mutation_count !== 1
    || review.production_write_count !== 0
    || Object.entries(expected).some(
      ([key, value]) => stableJson(review[key]) !== stableJson(value),
    )) {
    fail("reviewed profile artifact change set binding is invalid");
  }
  validateProfileArtifactChanges(review.changes, template);
  const material = profileArtifactChangeSetReviewMaterial(review);
  if (review.change_count !== review.changes.length
    || review.replacement_true_count !== 0
    || review.result_sha256
      !== jsonPostgresProductionInfrastructureResultSha256(review)
    || review.reviewed_change_set_sha256 !== sha256(material)) {
    fail("reviewed profile artifact change set receipt hash drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    profile_artifact_action: expected.profile_artifact_action,
    profile_artifact_transition_sha256:
      expected.profile_artifact_transition_sha256,
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
