import { createHash } from "node:crypto";
import {
  isVersionedCloudFormationS3TemplateUrl,
} from "./cloudformation-template-transport.mjs";

export const JSON_POSTGRES_REHEARSAL_ACCOUNT = "770880870480";
export const JSON_POSTGRES_REHEARSAL_REGION = "ap-northeast-2";
export const JSON_POSTGRES_REHEARSAL_PROFILE = "matter-staging-admin";
export const JSON_POSTGRES_REHEARSAL_READONLY_ROLE =
  "matter-readonly-auditor";
export const JSON_POSTGRES_REHEARSAL_STACK = "lawos-private-staging";
export const JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK =
  "lawos-private-rehearsal-artifact-store";
export const JSON_POSTGRES_REHEARSAL_ARTIFACT_BUCKET =
  "lawos-private-rehearsal-artifacts-770880870480";
export const JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET =
  "lawos-private-rehearsal-input-770880870480";
export const JSON_POSTGRES_REHEARSAL_DMS_BUCKET =
  "lawos-private-rehearsal-dms-770880870480";
export const JSON_POSTGRES_REHEARSAL_FUNCTION =
  "lawos-private-staging-w12-admin";
export const JSON_POSTGRES_REHEARSAL_ROLE =
  "lawos-private-staging-w12-admin-role";
export const JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW = 162_630;
export const JSON_POSTGRES_REHEARSAL_ARTIFACT_PREFIX = "program-artifact";

const SHA256 = /^[0-9a-f]{64}$/u;
const LEGACY_ENVIRONMENT_KEY =
  /(?:JSON|STORE_PATH|FILE_CURRENT|DUAL_WRITE|OFFLINE|MEMORY_FALLBACK)/u;
const SAFE_CONDITIONAL_REPLACEMENT = new Set([
  "PasswordResetWorkerInvokePermission",
]);
const W12_ARTIFACT_STORE_RESOURCES = new Set([
  "RehearsalArtifactBucket",
  "RehearsalArtifactBucketPolicy",
  "RehearsalArtifactKey",
  "RehearsalArtifactKeyAlias",
]);
const W12_ADDITIONS = new Set([
  "RehearsalAdminExecutionRole",
  "RehearsalAdminFunction",
  "RehearsalAdminLogGroup",
  "RehearsalReadonlyAuditInvokePermission",
  "RehearsalApplicationDatabaseSecret",
  "RehearsalDmsBucket",
  "RehearsalDmsBucketPolicy",
  "RehearsalProgramInputBucket",
  "RehearsalProgramInputBucketPolicy",
  "RehearsalTenantContextSecret",
]);
const W12_INITIAL_MODIFICATIONS = new Set([
  "HttpApiIntegration",
  "PasswordResetWorkerInvokePermission",
  "PasswordResetWorkerSchedule",
  "S3GatewayEndpoint",
  "SecretsManagerEndpoint",
]);
const W12_DYNAMIC_DEPENDENCIES = Object.freeze({
  HttpApiIntegration: Object.freeze({
    resource_type: "AWS::ApiGatewayV2::Integration",
    property: "IntegrationUri",
    requires_recreation: "Never",
    causing_entity: "ApiFunction.Arn",
    replacement: "False",
  }),
  PasswordResetWorkerInvokePermission: Object.freeze({
    resource_type: "AWS::Lambda::Permission",
    property: "SourceArn",
    requires_recreation: "Always",
    causing_entity: "PasswordResetWorkerSchedule.Arn",
    replacement: "Conditional",
  }),
  PasswordResetWorkerSchedule: Object.freeze({
    resource_type: "AWS::Events::Rule",
    property: "Targets",
    requires_recreation: "Never",
    causing_entity: "ApiFunction.Arn",
    replacement: "False",
  }),
});
const W12_BOOTSTRAP_REMOVAL_MODIFICATIONS = new Set([
  "RehearsalAdminExecutionRole",
  "RehearsalAdminFunction",
]);
const EXISTING_LAMBDA_BOOTSTRAP_MODIFICATIONS = new Set([
  "AdminExecutionRole",
  "AdminFunction",
  "ApiExecutionRole",
  "ApiFunction",
  "HttpApiIntegration",
  "PasswordResetWorkerInvokePermission",
  "PasswordResetWorkerSchedule",
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex");
}

function fail(message) {
  throw new Error(message);
}

export function isJsonPostgresRehearsalHostStackComplete(status) {
  return /^(?:CREATE|UPDATE|IMPORT)_COMPLETE$/u.test(status ?? "");
}

export function createJsonPostgresRehearsalTarget({
  approvedTenantIds,
} = {}) {
  const target = {
    target_ref: "lawos-private-rehearsal",
    aws_account: JSON_POSTGRES_REHEARSAL_ACCOUNT,
    aws_region: JSON_POSTGRES_REHEARSAL_REGION,
    artifact_bucket_ref:
      "bucket:lawos-private-rehearsal-artifacts",
    artifact_bucket_name: JSON_POSTGRES_REHEARSAL_ARTIFACT_BUCKET,
    artifact_expected_bucket_owner: JSON_POSTGRES_REHEARSAL_ACCOUNT,
    artifact_kms_key_ref:
      "alias/lawos-private-rehearsal-artifacts",
    artifact_object_lock_enabled: true,
    artifact_versioning_enabled: true,
    artifact_public_access_blocked: true,
    database_secret_ref:
      "/lawos/private-rehearsal/postgres/application",
    tenant_context_secret_ref:
      "/lawos/private-rehearsal/postgres/tenant-context",
    dms_bucket_ref: "bucket:lawos-private-rehearsal-dms",
    dms_bucket_name: JSON_POSTGRES_REHEARSAL_DMS_BUCKET,
    dms_prefix: "approved-real-rehearsal",
    dms_kms_key_ref: "alias/lawos-private-staging",
    dms_expected_bucket_owner: JSON_POSTGRES_REHEARSAL_ACCOUNT,
    dms_default_retention_days: 365,
    dms_object_lock_enabled: true,
    dms_versioning_enabled: true,
    dms_public_access_blocked: true,
    program_input_bucket_ref:
      "bucket:lawos-private-rehearsal-input",
    program_input_bucket_name:
      JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
    program_input_expected_bucket_owner:
      JSON_POSTGRES_REHEARSAL_ACCOUNT,
    program_input_kms_key_ref: "alias/lawos-private-staging",
    program_input_object_lock_enabled: true,
    program_input_versioning_enabled: true,
    program_input_public_access_blocked: true,
    approved_tenant_ids: [...new Set(approvedTenantIds ?? [])].sort(),
    backup_target_ref: "backup:lawos-private-rehearsal",
    isolated: true,
    production: false,
    public_access: false,
    tls_mode: "verify-full",
    monthly_cost_ceiling_krw: 300_000,
  };
  if (target.approved_tenant_ids.length < 1
    || target.approved_tenant_ids.some((tenantId) =>
      !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(tenantId)
      || /^tenant_lawos_staging_/u.test(tenantId)
      || tenantId === "*")) {
    fail("W12 target tenant set is invalid");
  }
  return Object.freeze(target);
}

export function assertJsonPostgresRehearsalCaller(identity = {}) {
  if (identity.Account !== JSON_POSTGRES_REHEARSAL_ACCOUNT
    || !new RegExp(
      `^arn:aws:sts::${JSON_POSTGRES_REHEARSAL_ACCOUNT}:assumed-role/${JSON_POSTGRES_REHEARSAL_PROFILE}/[^/]+$`,
      "u",
    ).test(identity.Arn ?? "")) {
    fail("AWS caller is outside the exact W12 staging role/account");
  }
  return Object.freeze({
    account: identity.Account,
    role: JSON_POSTGRES_REHEARSAL_PROFILE,
    caller_arn_sha256: sha256(identity.Arn),
  });
}

export function buildJsonPostgresRehearsalArtifactStoreParameters({
  owner,
  reviewDate,
  expirationDate,
} = {}) {
  if (!/^[A-Za-z0-9._@+-]{1,128}$/u.test(owner ?? "")
    || !/^\d{4}-\d{2}-\d{2}$/u.test(reviewDate ?? "")
    || !/^\d{4}-\d{2}-\d{2}$/u.test(expirationDate ?? "")) {
    fail("W12 artifact-store stack parameters are invalid");
  }
  return Object.freeze({
    ArtifactBucketName: JSON_POSTGRES_REHEARSAL_ARTIFACT_BUCKET,
    Owner: owner,
    ReviewDate: reviewDate,
    ExpirationDate: expirationDate,
  });
}

function normalizedChanges(changeSet = {}) {
  return (changeSet.Changes ?? []).map((entry) => {
    const change = entry.ResourceChange ?? {};
    return {
      action: change.Action,
      logical_resource_id: change.LogicalResourceId,
      resource_type: change.ResourceType,
      replacement: change.Replacement ?? "False",
      scope: [...(change.Scope ?? [])].sort(),
    };
  }).sort((left, right) =>
    left.logical_resource_id.localeCompare(right.logical_resource_id, "en"));
}

function assertExactW12DynamicDependencies(changeSet) {
  for (const entry of changeSet.Changes ?? []) {
    const change = entry.ResourceChange ?? {};
    const expected = W12_DYNAMIC_DEPENDENCIES[
      change.LogicalResourceId
    ];
    if (!expected) continue;
    const details = change.Details ?? [];
    const detail = details[0];
    if (change.Action !== "Modify"
      || change.ResourceType !== expected.resource_type
      || (change.Replacement ?? "False") !== expected.replacement
      || details.length !== 1
      || detail?.Target?.Attribute !== "Properties"
      || detail.Target.Name !== expected.property
      || detail.Target.RequiresRecreation !== expected.requires_recreation
      || detail.Evaluation !== "Dynamic"
      || detail.ChangeSource !== "ResourceAttribute"
      || detail.CausingEntity !== expected.causing_entity) {
      fail("W12 dynamic dependency delta drifted");
    }
  }
}

export function validateJsonPostgresRehearsalChangeSet(changeSet, {
  stackName,
  changeSetType,
  phase,
  templateSha256,
  parametersSha256,
  templateUrl = null,
  allowIdentityTenantRebind = false,
  existingLambdaEniBootstrapTransition = false,
} = {}) {
  if (![JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
    JSON_POSTGRES_REHEARSAL_STACK].includes(stackName)
    || changeSet?.StackName !== stackName
    || (changeSet?.ChangeSetType != null
      && changeSet.ChangeSetType !== changeSetType)
    || typeof changeSet?.ChangeSetId !== "string"
    || changeSet.ChangeSetId.length === 0
    || !["CREATE", "UPDATE"].includes(changeSetType)
    || !["artifact-store", "enable-eni", "remove-eni"].includes(phase)
    || !SHA256.test(templateSha256 ?? "")
    || !SHA256.test(parametersSha256 ?? "")
    || typeof allowIdentityTenantRebind !== "boolean"
    || typeof existingLambdaEniBootstrapTransition !== "boolean"
    || (templateUrl !== null
      && !isVersionedCloudFormationS3TemplateUrl(templateUrl))) {
    fail("W12 change set binding is invalid");
  }
  if (phase === "enable-eni") {
    assertExactW12DynamicDependencies(changeSet);
  }
  const changes = normalizedChanges(changeSet);
  if (changes.length < 1) fail("W12 change set is empty");
  for (const change of changes) {
    if (change.replacement === "True"
      || (change.replacement === "Conditional"
        && !SAFE_CONDITIONAL_REPLACEMENT.has(
          change.logical_resource_id,
        ))) {
      fail("W12 change set contains an unapproved replacement");
    }
    if (phase === "artifact-store") {
      if (changeSetType !== "CREATE" || change.action !== "Add"
        || !W12_ARTIFACT_STORE_RESOURCES.has(change.logical_resource_id)) {
        fail("W12 artifact-store change set may only add exact resources");
      }
      continue;
    }
    if (changeSetType !== "UPDATE") {
      fail("W12 rehearsal resources require an update to the staging stack");
    }
    if (phase === "enable-eni") {
      const allowed = change.action === "Add"
        ? W12_ADDITIONS
        : change.action === "Modify"
          ? new Set([
              ...W12_INITIAL_MODIFICATIONS,
              ...(allowIdentityTenantRebind ? ["ApiFunction"] : []),
              ...(existingLambdaEniBootstrapTransition
                ? EXISTING_LAMBDA_BOOTSTRAP_MODIFICATIONS
                : []),
            ])
          : null;
      if (!allowed?.has(change.logical_resource_id)) {
        fail("W12 enable-ENI change set contains an unapproved delta");
      }
    } else {
      const allowed = new Set([
        ...W12_BOOTSTRAP_REMOVAL_MODIFICATIONS,
        ...(existingLambdaEniBootstrapTransition
          ? EXISTING_LAMBDA_BOOTSTRAP_MODIFICATIONS
          : []),
      ]);
      if (change.action !== "Modify"
        || !allowed.has(change.logical_resource_id)) {
        fail("W12 ENI removal change set contains an unapproved delta");
      }
    }
  }
  const identityTenantChanges = changes.filter((change) =>
    change.logical_resource_id === "ApiFunction");
  if ((allowIdentityTenantRebind && (
    phase !== "enable-eni"
    || identityTenantChanges.length !== 1
    || identityTenantChanges[0].action !== "Modify"
    || !identityTenantChanges[0].scope.includes("Properties")
  )) || (!allowIdentityTenantRebind
    && !existingLambdaEniBootstrapTransition
    && identityTenantChanges.length !== 0)) {
    fail("W12 identity tenant rebind change set drifted");
  }
  const review = {
    stack_name: stackName,
    change_set_type: changeSetType,
    phase,
    change_set_id: changeSet.ChangeSetId,
    template_sha256: templateSha256,
    parameters_sha256: parametersSha256,
    ...(templateUrl === null ? {} : { template_url: templateUrl }),
    identity_tenant_rebind: allowIdentityTenantRebind,
    existing_lambda_eni_bootstrap_transition:
      existingLambdaEniBootstrapTransition,
    changes,
  };
  return Object.freeze({
    verdict: "PASS",
    ...review,
    change_count: changes.length,
    replacement_true_count: 0,
    reviewed_change_set_sha256: sha256(review),
  });
}

export function assertJsonPostgresRehearsalBucketState({
  bucketName,
  expectedBucketName,
  expectedKmsKeyArn,
  versioning,
  publicAccess,
  objectLock,
  encryption,
} = {}) {
  const blocked = publicAccess?.PublicAccessBlockConfiguration ?? {};
  const encryptionRule = encryption?.ServerSideEncryptionConfiguration
    ?.Rules?.[0]?.ApplyServerSideEncryptionByDefault;
  const retention = objectLock?.ObjectLockConfiguration?.Rule
    ?.DefaultRetention;
  if (bucketName !== expectedBucketName
    || versioning?.Status !== "Enabled"
    || Object.keys(blocked).length !== 4
    || !Object.values(blocked).every(Boolean)
    || objectLock?.ObjectLockConfiguration?.ObjectLockEnabled !== "Enabled"
    || retention?.Mode !== "COMPLIANCE"
    || Number(retention?.Days) < 365
    || encryptionRule?.SSEAlgorithm !== "aws:kms"
    || encryptionRule?.KMSMasterKeyID !== expectedKmsKeyArn) {
    fail("W12 immutable bucket state drifted");
  }
  return Object.freeze({
    bucket_name_sha256: sha256(bucketName),
    versioning_enabled: true,
    public_access_blocked: true,
    object_lock_enabled: true,
    sse_kms_enabled: true,
  });
}

function parameterMap(stack) {
  return Object.fromEntries(
    (stack?.Parameters ?? []).map(({ ParameterKey, ParameterValue }) => [
      ParameterKey,
      ParameterValue,
    ]),
  );
}

export function assertJsonPostgresRehearsalStack(stack, {
  packet,
  artifactVersion,
  trustRegistrySha256,
  approvalId,
  existingEniBootstrapEnabled = false,
  eniBootstrapEnabled = false,
} = {}) {
  const parameters = parameterMap(stack);
  const artifactKey =
    `${JSON_POSTGRES_REHEARSAL_ARTIFACT_PREFIX}/${packet.source_sha}/`
    + `${packet.bindings.artifact_sha256}.zip`;
  const expected = {
    W12SourceSha: packet.source_sha,
    W12SourceTree: packet.source_tree,
    W12ArtifactBucket: packet.target.artifact_bucket_name,
    W12ArtifactKey: artifactKey,
    W12ArtifactVersion: artifactVersion,
    W12ArtifactSha256: packet.bindings.artifact_sha256,
    W12ExecutionPacketSha256: packet.packet_sha256,
    W12OwnerTrustRegistrySha256: trustRegistrySha256,
    W12ApprovalId: approvalId,
    W12ProgramInputBucketName: packet.target.program_input_bucket_name,
    W12DmsBucketName: packet.target.dms_bucket_name,
    EnableLambdaEniBootstrap:
      existingEniBootstrapEnabled ? "true" : "false",
    EnableW12LambdaEniBootstrap: eniBootstrapEnabled ? "true" : "false",
  };
  for (const [key, value] of Object.entries(expected)) {
    if (parameters[key] !== value) {
      fail(`W12 stack parameter ${key} drifted`);
    }
  }
  if (!/^(?:CREATE|UPDATE)_COMPLETE$/u.test(stack?.StackStatus ?? "")) {
    fail("W12 host staging stack is not complete");
  }
  return Object.freeze({
    verdict: "PASS",
    stack_status: stack.StackStatus,
    isolated_rehearsal_binding_count: Object.keys(expected).length,
    existing_lambda_eni_bootstrap_enabled:
      existingEniBootstrapEnabled,
    w12_lambda_eni_bootstrap_enabled: eniBootstrapEnabled,
  });
}

export function assertJsonPostgresRehearsalLambda(configuration, {
  packet,
  expectedVpcId,
} = {}) {
  const environment = configuration?.Environment?.Variables ?? {};
  const expectedCodeSha256 = Buffer
    .from(packet.bindings.artifact_sha256, "hex")
    .toString("base64");
  if (configuration?.FunctionName !== JSON_POSTGRES_REHEARSAL_FUNCTION
    || configuration.State !== "Active"
    || configuration.LastUpdateStatus !== "Successful"
    || configuration.Runtime !== "nodejs22.x"
    || !configuration.Architectures?.includes("arm64")
    || !String(configuration.Role ?? "").endsWith(
      `/lawos-private-staging-w12-admin-role`,
    )
    || configuration.CodeSha256 !== expectedCodeSha256
    || configuration.VpcConfig?.VpcId !== expectedVpcId
    || configuration.VpcConfig?.SubnetIds?.length !== 2
    || configuration.VpcConfig?.SecurityGroupIds?.length !== 1
    || environment.LAWOS_DATABASE_NAME !== "lawos_rehearsal"
    || environment.LAWOS_ADMIN_DATABASE_NAME !== "lawos"
    || environment.LAWOS_DATA_SCOPE !== "approved-real-manifest"
    || environment.LAWOS_PERSISTENCE_AUTHORITY !== "postgres-v2"
    || environment.LAWOS_POSTGRES_SSL_MODE !== "verify-full"
    || environment.LAWOS_RUNTIME_PROFILE !== "operational"
    || environment.LAWOS_STAFF_AUTHORITY !== "internal-password"
    || environment.LAWOS_DEPLOYMENT_COMMIT !== packet.source_sha
    || environment.LAWOS_DEPLOYMENT_TREE !== packet.source_tree
    || environment.LAWOS_DEPLOYMENT_ARTIFACT_SHA256
      !== packet.bindings.artifact_sha256
    || environment.LAWOS_EXECUTION_PACKET_SHA256 !== packet.packet_sha256
    || Object.keys(environment).some((key) =>
      LEGACY_ENVIRONMENT_KEY.test(key))
    || Object.keys(environment).some((key) => key.includes("SES"))) {
    fail("W12 rehearsal Lambda exact deployment binding drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    active_successful_count: 1,
    vpc_attached_count: 1,
    external_email_authority_count: 0,
    legacy_environment_key_count: 0,
  });
}

export function assertJsonPostgresRehearsalEniAuthority({
  policyNames,
  policyDocuments,
} = {}) {
  if (JSON.stringify(policyNames) !== JSON.stringify([
    "lawos-private-rehearsal-admin-runtime",
  ]) || !Array.isArray(policyDocuments)
    || policyDocuments.length !== 1) {
    fail("W12 rehearsal role contains an unexpected inline policy");
  }
  const statements = policyDocuments.flatMap((document) =>
    document?.Statement ?? []);
  const temporaryAllows = statements.filter((statement) => {
    const actions = new Set(
      Array.isArray(statement.Action)
        ? statement.Action
        : [statement.Action],
    );
    return statement.Effect === "Allow"
      && statement.Resource === "*"
      && [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DescribeSubnets",
        "ec2:DeleteNetworkInterface",
        "ec2:AssignPrivateIpAddresses",
        "ec2:UnassignPrivateIpAddresses",
      ].some((action) => actions.has(action));
  });
  const explicitDenies = statements.filter((statement) =>
    statement.Sid === "DenyFunctionCodeEc2Networking"
      && statement.Effect === "Deny"
      && statement.Resource === "*"
      && statement.Condition?.ArnEquals?.["lambda:SourceFunctionArn"]);
  if (temporaryAllows.length !== 0 || explicitDenies.length !== 1) {
    fail("W12 rehearsal Lambda ENI authority removal failed");
  }
  return Object.freeze({
    verdict: "PASS",
    temporary_eni_allow_count: 0,
    source_function_explicit_deny_count: 1,
  });
}

export function createJsonPostgresImmutableInputLocator({
  bucket,
  key,
  versionId,
  expectedBucketOwner,
  sha256: digest,
  byteSize,
} = {}) {
  if (bucket !== JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET
    || !key?.startsWith("program-input/")
    || key.split("/").includes("..")
    || !versionId
    || versionId === "null"
    || expectedBucketOwner !== JSON_POSTGRES_REHEARSAL_ACCOUNT
    || !SHA256.test(digest ?? "")
    || !Number.isSafeInteger(byteSize)
    || byteSize < 1) {
    fail("W12 immutable program input locator is invalid");
  }
  return Object.freeze({
    schema_version: "law-firm-os.immutable-program-input-locator.v1",
    bucket,
    key,
    version_id: versionId,
    expected_bucket_owner: expectedBucketOwner,
    sha256: digest,
    byte_size: byteSize,
  });
}

export function jsonPostgresRehearsalParametersSha256(parameters) {
  const object = Array.isArray(parameters)
    ? Object.fromEntries(parameters.map(({ key, value }) => [key, value]))
    : parameters;
  return sha256(object);
}

export function jsonPostgresRehearsalResultSha256(value = {}) {
  const { result_sha256: ignored, ...material } = value;
  return sha256(material);
}
