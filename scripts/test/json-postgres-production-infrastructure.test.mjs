import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import { SCHEMA_GOVERNANCE_TRUST_ANCHOR } from "../../packages/runtime-auth/src/external-release-trust-registry.js";
import {
  JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_BUCKET,
  JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_VALUE,
  JSON_POSTGRES_EXTERNAL_READ_CREDENTIAL_SECRET_PREFIX,
  JSON_POSTGRES_EXTERNAL_READ_PROVIDER_PACK_SECRET_NAME,
  JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
  JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
  JSON_POSTGRES_OUTLOOK_WORKER_RESOURCE_IDS,
  buildJsonPostgresProductionArtifactStoreTemplate,
  buildJsonPostgresProductionArtifactStoreWindowsHandoffBaselineTemplate,
  buildJsonPostgresProductionArtifactStoreWindowsHandoffV2Template,
  buildJsonPostgresProductionArtifactStoreWindowsHandoffV3Template,
  buildJsonPostgresProductionTemplate,
  classifyJsonPostgresProductionArtifactStoreWindowsHandoffTemplate,
  validateJsonPostgresProductionArtifactStoreTemplate,
  validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet,
  validateJsonPostgresProductionArtifactStoreWindowsHandoffLiveGovernance,
  validateJsonPostgresProductionCost,
  validateJsonPostgresProductionTemplate,
} from "../lib/json-postgres-production-infrastructure.mjs";

const reference = JSON.parse(readFileSync("infra/lawos-private-staging/template.json", "utf8"));

test("schema governance accepts an immutable local layer only on the direct-invoke admin", () => {
  const template = buildJsonPostgresProductionTemplate(reference);
  const parameter = template.Parameters.SchemaGovernanceLayerVersionArn;
  assert.equal(parameter.Default, "disabled");
  const pattern = new RegExp(parameter.AllowedPattern, "u");
  const arn = `arn:aws:lambda:ap-northeast-2:770880870480:layer:lawos-schema-governance-2026090601-${"a".repeat(64)}:1`;
  assert.equal(pattern.test(arn), true);
  assert.equal(pattern.test(arn.replace("2026090601", String(SCHEMA_GOVERNANCE_TRUST_ANCHOR.registry_serial))), true);
  assert.equal(pattern.test(arn.replace("2026090601", "2026090602")), true);
  for (const value of [arn.replace(":1", ":$LATEST"), arn.replace("770880870480", "111111111111"), arn.replace("ap-northeast-2", "us-east-1"), arn.replace("2026090601", "2026090600"), arn.replace("2026090601", String(SCHEMA_GOVERNANCE_TRUST_ANCHOR.registry_serial + 1))]) assert.equal(pattern.test(value), false);
  assert.deepEqual(template.Resources.AdminFunction.Properties.Layers["Fn::If"][1], [{ Ref: "SchemaGovernanceLayerVersionArn" }]);
  for (const mutate of [
    (copy) => { copy.Parameters.SchemaGovernanceLayerVersionArn.Default = arn; },
    (copy) => { copy.Parameters.SchemaGovernanceLayerVersionArn.AllowedPattern = ".*"; },
    (copy) => { copy.Resources.AdminFunction.Properties.Layers = [arn]; },
    (copy) => { copy.Resources.ApiFunction.Properties.Layers = [arn]; },
    (copy) => { copy.Resources.ProjectionWorkerFunction.Properties.Layers = [arn]; },
    (copy) => { copy.Resources.ProjectionAuditorFunction.Properties.Layers = [arn]; },
  ]) {
    const copy = structuredClone(template); mutate(copy);
    assert.throws(() => validateJsonPostgresProductionTemplate(copy), /schema governance layer/u);
  }
});

test("production member photos use their committed prefix with read-only API access", () => {
  const stagingEnv = reference.Resources.ApiFunction.Properties.Environment.Variables;
  assert.equal(stagingEnv.LAWOS_MEMBER_PHOTO_S3_PREFIX, "synthetic-member-photos");
  assert.deepEqual(reference.Resources.S3GatewayEndpoint.Properties.PolicyDocument.Statement
    .find(({ Sid }) => Sid === "ApiReadsCommittedMemberPhotos"), {
    Sid: "ApiReadsCommittedMemberPhotos",
    Effect: "Allow",
    Principal: { AWS: { "Fn::GetAtt": ["ApiExecutionRole", "Arn"] } },
    Action: ["s3:GetObject", "s3:GetObjectVersion"],
    Resource: { "Fn::Sub": "${DmsBucket.Arn}/synthetic-member-photos/objects/*" },
  });
  for (const field of ["BUCKET", "EXPECTED_BUCKET_OWNER", "REGION", "KMS_KEY_ID", "CREDENTIAL_REF"]) {
    assert.equal(Object.hasOwn(stagingEnv, `LAWOS_MEMBER_PHOTO_S3_${field}`), false);
    assert.ok(stagingEnv[`LAWOS_DMS_S3_${field}`]);
  }
  const template = buildJsonPostgresProductionTemplate(reference);
  const env = template.Resources.ApiFunction.Properties.Environment.Variables;
  assert.equal(env.LAWOS_DMS_S3_PREFIX, "lawos-dms");
  assert.equal(env.LAWOS_MEMBER_PHOTO_S3_PREFIX, "approved-real-migration/member-photos");
  for (const field of ["BUCKET", "EXPECTED_BUCKET_OWNER", "REGION", "KMS_KEY_ID", "CREDENTIAL_REF"]) {
    assert.equal(Object.hasOwn(env, `LAWOS_MEMBER_PHOTO_S3_${field}`), false);
    assert.ok(env[`LAWOS_DMS_S3_${field}`]);
  }
  const workerEnv = template.Resources.OutlookConversationWorkerFunction.Properties.Environment.Variables;
  assert.deepEqual(Object.keys(workerEnv).filter((key) => key.startsWith("LAWOS_MEMBER_PHOTO_S3_")), ["LAWOS_MEMBER_PHOTO_S3_PREFIX"]);
  const statements = template.Resources.ApiExecutionRole.Properties.Policies
    .flatMap((policy) => policy.PolicyDocument?.Statement ?? []);
  const photoRead = statements.find(({ Sid }) => Sid === "ReadCommittedMemberPhotos");
  assert.deepEqual(photoRead, {
    Sid: "ReadCommittedMemberPhotos",
    Effect: "Allow",
    Action: ["s3:GetObject", "s3:GetObjectVersion"],
    Resource: { "Fn::Sub": "${DmsBucket.Arn}/approved-real-migration/member-photos/objects/*" },
  });
  assert.equal(validateJsonPostgresProductionTemplate(template).verdict, "PASS");
  for (const mutate of [
    (copy) => { delete copy.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_DMS_S3_BUCKET; },
    (copy) => { copy.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_DMS_S3_EXPECTED_BUCKET_OWNER = "other-owner"; },
    (copy) => { copy.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_MEMBER_PHOTO_S3_BUCKET = { Ref: "DmsBucket" }; },
    (copy) => { delete copy.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_MEMBER_PHOTO_S3_PREFIX; },
    (copy) => { copy.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_MEMBER_PHOTO_S3_PREFIX = "lawos-dms"; },
    (copy) => { copy.Resources.S3GatewayEndpoint.Properties.PolicyDocument.Statement.find(({ Sid }) => Sid === "ApiReadsCommittedMemberPhotos").Principal = "*"; },
    (copy) => { copy.Resources.ApiExecutionRole.Properties.Policies[0].PolicyDocument.Statement.find(({ Sid }) => Sid === "ReadCommittedMemberPhotos").Action.push("s3:PutObject"); },
    (copy) => { copy.Resources.ApiExecutionRole.Properties.Policies[0].PolicyDocument.Statement.find(({ Sid }) => Sid === "ReadCommittedMemberPhotos").Resource = { "Fn::Sub": "${DmsBucket.Arn}/*" }; },
  ]) {
    const changed = structuredClone(template);
    mutate(changed);
    assert.throws(() => validateJsonPostgresProductionTemplate(changed), /member photo/u);
  }
});

test("production template derives the proven private topology without synthetic or public authority", () => {
  const template = buildJsonPostgresProductionTemplate(reference);
  const result = validateJsonPostgresProductionTemplate(template);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.private_subnet_count, 4);
  assert.equal(result.multi_az_rds_count, 1);
  assert.equal(result.object_lock_bucket_count, 2);
  assert.equal(result.production_traffic_enabled_by_default, false);
  assert.equal(result.external_read_providers_enabled_by_default, false);
  assert.equal(
    result.amic_internal_unsigned_update_broker_enabled_by_default,
    false,
  );
  assert.equal(result.external_read_secret_policy_count, 1);
  assert.match(result.template_sha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(template.Parameters.RuntimeGeneration, {
    Type: "Number",
    Default: 1,
    MinValue: 1,
  });
  assert.ok(template.Resources.ProductionKey);
  assert.ok(template.Resources.ProductionKeyAlias);
  assert.equal(template.Parameters.EnableExternalReadProviders.Default, "false");
  assert.equal(
    template.Parameters.ExternalReadProviderPackSecretName.AllowedValues[1],
    JSON_POSTGRES_EXTERNAL_READ_PROVIDER_PACK_SECRET_NAME,
  );
  assert.equal(
    template.Conditions.ExternalReadProvidersEnabled["Fn::Equals"][0].Ref,
    "EnableExternalReadProviders",
  );
  assert.equal(
    template.Resources.ExternalReadSecretsPolicy.Condition,
    "ExternalReadProvidersEnabled",
  );
  assert.deepEqual(
    template.Resources.ExternalReadSecretsPolicy.Properties.Roles,
    [{ Ref: "ApiExecutionRole" }],
  );
  assert.equal(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_EXTERNAL_READ_SECRET_PREFIX["Fn::If"][1],
    JSON_POSTGRES_EXTERNAL_READ_CREDENTIAL_SECRET_PREFIX,
  );
  assert.equal(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_EXTERNAL_READ_KMS_KEY_ARN["Fn::If"][1]["Fn::GetAtt"][0],
    "ProductionKey",
  );
  const externalPolicyStatements = template.Resources.ExternalReadSecretsPolicy
    .Properties.PolicyDocument.Statement;
  assert.deepEqual(
    externalPolicyStatements.find(
      ({ Sid }) => Sid === "UseTaggedExternalReadCredentialGenerations",
    ).Action,
    [
      "secretsmanager:GetSecretValue",
      "secretsmanager:PutSecretValue",
    ],
  );
  assert.deepEqual(
    externalPolicyStatements.find(
      ({ Sid }) => Sid === "CreateTaggedExternalReadCredentialGenerations",
    ).Condition.ArnEquals["secretsmanager:KmsKeyArn"],
    { "Fn::GetAtt": ["ProductionKey", "Arn"] },
  );
  assert.deepEqual(
    externalPolicyStatements.find(
      ({ Sid }) => Sid === "TagExternalReadCredentialPurposeOnly",
    ).Condition["ForAllValues:StringEquals"]["aws:TagKeys"],
    ["lawos-purpose"],
  );
  assert.deepEqual(
    externalPolicyStatements.find(
      ({ Sid }) => Sid === "ScheduleTaggedExternalReadCredentialDeletion",
    ).Condition,
    {
      StringEquals: {
        "aws:ResourceTag/lawos-purpose": [
          "external-read",
          "external-read-tombstone",
        ],
      },
      BoolIfExists: { "secretsmanager:ForceDeleteWithoutRecovery": "false" },
      NumericGreaterThanEquals: { "secretsmanager:RecoveryWindowInDays": "7" },
      NumericLessThanEquals: { "secretsmanager:RecoveryWindowInDays": "30" },
    },
  );
  assert.equal(
    externalPolicyStatements.find(
      ({ Sid }) => Sid === "DenyExternalReadCredentialForceDelete",
    ).Condition.Bool["secretsmanager:ForceDeleteWithoutRecovery"],
    "true",
  );
  assert.equal(template.Resources.StagingKey, undefined);
  assert.equal(template.Resources.StagingKeyAlias, undefined);
  assert.equal(
    JSON.parse(template.Resources.ProjectionDatabaseSecret.Properties.GenerateSecretString.SecretStringTemplate).username,
    "lawos_hrx_projection_writer",
  );
  assert.deepEqual(
    template.Resources.AdminFunction.Properties.Environment.Variables.LAWOS_PROJECTION_DATABASE_SECRET_ID,
    { Ref: "ProjectionDatabaseSecret" },
  );
  assert.equal(result.projection_auditor_function_count, 1);
  assert.equal(
    template.Resources.ProjectionAuditorFunction.Properties.MemorySize,
    2048,
  );
  assert.equal(result.projection_auditor_master_secret_read_count, 0);
  assert.equal(result.projection_auditor_database_write_secret_count, 0);
  assert.equal(result.projection_worker_function_count, 1);
  assert.equal(
    template.Resources.ProjectionWorkerFunction.Properties.MemorySize,
    2048,
  );
  assert.equal(result.projection_worker_master_secret_read_count, 0);
  assert.equal(result.projection_worker_schedule_enabled_by_default, false);
  assert.equal(
    template.Resources.ProjectionAuditorFunction.Properties.Environment.Variables
      .LAWOS_PROGRAM_EXECUTION_ROLE,
    "projection-auditor",
  );
  assert.equal(
    template.Resources.ProjectionAuditorFunction.Properties.Environment.Variables
      .LAWOS_MASTER_DATABASE_SECRET_ID,
    undefined,
  );
  assert.deepEqual(
    template.Resources.ProjectionAuditorFunction.Properties.Environment.Variables
      .LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID,
    { Ref: "ProjectionAuditorDatabaseSecret" },
  );
  assert.equal(
    template.Resources.ProjectionWorkerFunction.Properties.Environment.Variables
      .LAWOS_PROGRAM_EXECUTION_ROLE,
    "projection-writer",
  );
  assert.deepEqual(
    template.Resources.ProjectionWorkerFunction.Properties.Environment.Variables
      .LAWOS_PROJECTION_DATABASE_SECRET_ID,
    { Ref: "ProjectionDatabaseSecret" },
  );
  assert.equal(
    template.Resources.ProjectionWorkerFunction.Properties.Environment.Variables
      .LAWOS_MASTER_DATABASE_SECRET_ID,
    undefined,
  );
  assert.equal(
    template.Resources.ProjectionWorkerFunction.Properties.Environment.Variables
      .LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID,
    undefined,
  );
  assert.deepEqual(
    template.Resources.ProjectionWorkerSchedule.Properties.State,
    { "Fn::If": ["ProjectionWorkerEnabled", "ENABLED", "DISABLED"] },
  );
  assert.deepEqual(
    template.Resources.ProjectionWorkerExecutionRole.Properties.Policies[0]
      .PolicyDocument.Statement.find((item) =>
        item.Sid === "ReadImmutableProgramExecutionEvidence"),
    {
      Sid: "ReadImmutableProgramExecutionEvidence",
      Effect: "Allow",
      Action: "s3:GetObject",
      Resource: {
        "Fn::Sub": "${ProgramInputBucket.Arn}/program-execution/*",
      },
    },
  );
  for (const role of [
    template.Resources.AdminExecutionRole,
    template.Resources.ProjectionAuditorExecutionRole,
  ]) {
    assert.equal(
      role.Properties.Policies[0].PolicyDocument.Statement.some((item) =>
        item.Sid === "ReadImmutableProgramExecutionEvidence"),
      false,
    );
  }
  assert.equal(template.Parameters.EnableProjectionWorker.Default, "false");
  assert.equal(
    template.Parameters.HrxProjectionMappingObjectKey.Default,
    "disabled/hrx-projection-mapping.json",
  );
  assert.equal(
    template.Parameters.HrxProjectionValidationObjectKey.Default,
    "disabled/hrx-projection-validation.json",
  );
  assert.deepEqual(template.Parameters.ProjectionWorkerLagThresholdMs, {
    Type: "Number",
    Default: 24,
    AllowedValues: [24],
    Description:
      "Exact signed W15 outbox-lag acceptance threshold in milliseconds",
  });
  assert.deepEqual(
    template.Resources.ProjectionWorkerSchedule.Properties.Targets[0].Input,
    { Ref: "ProjectionWorkerEventJson" },
  );
  assert.deepEqual(
    template.Resources.ProjectionWorkerSchedule.Properties.Targets[0]
      .RetryPolicy,
    {
      MaximumEventAgeInSeconds: 900,
      MaximumRetryAttempts: 2,
    },
  );
  assert.deepEqual(
    template.Resources.ProjectionWorkerSchedule.Properties.Targets[0]
      .DeadLetterConfig,
    {
      Arn: {
        "Fn::GetAtt": ["ProjectionWorkerDeadLetterQueue", "Arn"],
      },
    },
  );
  assert.equal(
    template.Resources.ProjectionWorkerDeadLetterQueue.Properties
      .SqsManagedSseEnabled,
    true,
  );
  assert.equal(
    template.Resources.ProjectionWorkerDeadLetterQueue.Properties
      .MessageRetentionPeriod,
    1_209_600,
  );
  assert.deepEqual(
    template.Resources.ProjectionWorkerEventInvokeConfig.Properties,
    {
      DestinationConfig: {
        OnFailure: {
          Destination: {
            "Fn::GetAtt": ["ProjectionWorkerDeadLetterQueue", "Arn"],
          },
        },
      },
      FunctionName: { Ref: "ProjectionWorkerFunction" },
      MaximumEventAgeInSeconds: 900,
      MaximumRetryAttempts: 2,
      Qualifier: "$LATEST",
    },
  );
  assert.deepEqual(
    template.Resources.ProjectionWorkerDeadLetterQueuePolicy.Properties
      .PolicyDocument.Statement[0],
    {
      Sid: "AllowExactProjectionWorkerScheduleDeliveryFailures",
      Effect: "Allow",
      Principal: { Service: "events.amazonaws.com" },
      Action: "sqs:SendMessage",
      Resource: {
        "Fn::GetAtt": ["ProjectionWorkerDeadLetterQueue", "Arn"],
      },
      Condition: {
        ArnEquals: {
          "aws:SourceArn": {
            "Fn::GetAtt": ["ProjectionWorkerSchedule", "Arn"],
          },
        },
        StringEquals: {
          "aws:SourceAccount": { Ref: "AWS::AccountId" },
        },
      },
    },
  );
  assert.equal(
    template.Resources.ProjectionWorkerLagAlarm.Properties.Threshold.Ref,
    "ProjectionWorkerLagThresholdMs",
  );
  assert.equal(
    template.Resources.ProjectionWorkerDeadLetterAlarm.Properties.MetricName,
    "ApproximateNumberOfMessagesVisible",
  );
  assert.equal(
    template.Resources.ProjectionWorkerErrorAlarm.Properties.MetricName,
    "Errors",
  );
  assert.equal(
    template.Resources.ProjectionWorkerDeliveryFailureAlarm.Properties
      .MetricName,
    "FailedInvocations",
  );
  assert.deepEqual(
    template.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_IDENTITY_TENANT_ID,
    { Ref: "PrimaryTenantId" },
  );
  assert.equal(
    template.Resources.PasswordResetWorkerSchedule.Properties.ScheduleExpression,
    "rate(5 minutes)",
  );
  assert.equal(
    template.Parameters.EnableOutlookConversationWorker.Default,
    "false",
  );
  assert.deepEqual(
    template.Conditions.OutlookConversationWorkerEnabled,
    {
      "Fn::And": [
        { Condition: "ProductionTrafficEnabled" },
        { Condition: "OutlookConversationWorkerProvisioned" },
      ],
    },
  );
  assert.deepEqual(
    template.Conditions.OutlookConversationWorkerProvisioned,
    {
      "Fn::And": [
        { "Fn::Equals": [{ Ref: "EnableOutlookConversationWorker" }, "true"] },
        { Condition: "OutlookConversationWorkerConfigured" },
      ],
    },
  );
  assert.deepEqual(
    template.Conditions.OutlookConversationWorkerConfigured,
    {
      "Fn::And": [
        { "Fn::Not": [{ "Fn::Equals": [
          { Ref: "ClientOutlookM365ConfigSecretName" },
          JSON_POSTGRES_OUTLOOK_DISABLED_CONFIG_SECRET_NAME,
        ] }] },
        { "Fn::Not": [{ "Fn::Equals": [
          { Ref: "ClientOutlookCredentialSecretPrefix" },
          JSON_POSTGRES_OUTLOOK_DISABLED_CREDENTIAL_SECRET_PREFIX,
        ] }] },
      ],
    },
  );
  assert.deepEqual(
    template.Resources.OutlookConversationWorkerSchedule.Properties.State,
    {
      "Fn::If": ["OutlookConversationWorkerEnabled", "ENABLED", "DISABLED"],
    },
  );
  for (const logicalId of JSON_POSTGRES_OUTLOOK_WORKER_RESOURCE_IDS) {
    assert.equal(
      template.Resources[logicalId].Condition,
      "OutlookConversationWorkerProvisioned",
    );
  }
  assert.equal(
    template.Resources.MicrosoftEgressBrokerLambdaEndpoint.Condition,
    "OutlookConversationWorkerConfigured",
  );
  assert.equal(
    template.Outputs.OutlookConversationWorkerFunctionName.Condition,
    "OutlookConversationWorkerProvisioned",
  );
  assert.equal(
    template.Outputs.OutlookConversationWorkerDeadLetterQueueArn.Condition,
    "OutlookConversationWorkerProvisioned",
  );
  assert.deepEqual(
    JSON.parse(template.Resources.OutlookConversationWorkerSchedule.Properties.Targets[0].Input),
    { maintenance_action: "lawos_outlook_conversation_worker" },
  );
  assert.deepEqual(
    template.Resources.OutlookConversationWorkerSchedule.Properties.Targets[0].RetryPolicy,
    { MaximumEventAgeInSeconds: 900, MaximumRetryAttempts: 2 },
  );
  assert.equal(
    template.Resources.OutlookConversationWorkerFunction.Properties.Timeout,
    900,
  );
  assert.equal(
    template.Resources.OutlookConversationWorkerFunction.Properties.ReservedConcurrentExecutions,
    1,
  );
  assert.deepEqual(
    template.Resources.OutlookConversationWorkerSchedule.Properties.Targets[0].Arn,
    { "Fn::GetAtt": ["OutlookConversationWorkerFunction", "Arn"] },
  );
  assert.deepEqual(
    template.Resources.OutlookConversationWorkerSchedule.Properties.Targets[0].DeadLetterConfig,
    { Arn: { "Fn::GetAtt": ["OutlookConversationWorkerDeadLetterQueue", "Arn"] } },
  );
  assert.deepEqual(
    template.Resources.OutlookConversationWorkerInvokePermission.Properties.SourceArn,
    { "Fn::GetAtt": ["OutlookConversationWorkerSchedule", "Arn"] },
  );
  assert.deepEqual(
    template.Resources.OutlookConversationWorkerInvokePermission.Properties.FunctionName,
    { Ref: "OutlookConversationWorkerFunction" },
  );
  assert.equal(
    template.Resources.OutlookConversationWorkerDeadLetterQueue.Properties.MessageRetentionPeriod,
    1_209_600,
  );
  assert.deepEqual(
    template.Resources.OutlookConversationWorkerEventInvokeConfig.Properties.DestinationConfig,
    { OnFailure: { Destination: { "Fn::GetAtt": ["OutlookConversationWorkerDeadLetterQueue", "Arn"] } } },
  );
  assert.equal(
    template.Resources.OutlookConversationWorkerErrorAlarm.Properties.MetricName,
    "Errors",
  );
  assert.equal(
    template.Resources.OutlookConversationWorkerDeliveryFailureAlarm.Properties.MetricName,
    "FailedInvocations",
  );
  assert.equal(
    template.Resources.OutlookConversationWorkerDeadLetterAlarm.Properties.MetricName,
    "ApproximateNumberOfMessagesVisible",
  );
  const configuredOutlookEnvironment = (value) => ({
    "Fn::If": [
      "OutlookConversationWorkerConfigured",
      value,
      { Ref: "AWS::NoValue" },
    ],
  });
  assert.deepEqual(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_OUTLOOK_CONVERSATION_WORKER_SCHEDULE_ENABLED,
    configuredOutlookEnvironment({
      "Fn::If": ["OutlookConversationWorkerEnabled", "true", "false"],
    }),
  );
  assert.deepEqual(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED,
    configuredOutlookEnvironment({
      "Fn::If": ["OutlookConversationWorkerEnabled", "true", "false"],
    }),
  );
  assert.deepEqual(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_CLIENT_OUTLOOK_PROVIDER_RUNTIME_ENABLED,
    configuredOutlookEnvironment({
      "Fn::If": ["OutlookConversationWorkerEnabled", "true", "false"],
    }),
  );
  assert.deepEqual(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_CLIENT_OUTLOOK_M365_CONFIG_SECRET_ID,
    configuredOutlookEnvironment({ Ref: "ClientOutlookM365ConfigSecretName" }),
  );
  assert.deepEqual(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_GRAPH_NOTIFICATION_URL,
    configuredOutlookEnvironment({
      "Fn::Sub": "${HttpApi.ApiEndpoint}/api/outlook/graph/notifications",
    }),
  );
  assert.deepEqual(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_CLIENT_OUTLOOK_INQUIRY_ENABLED,
    configuredOutlookEnvironment("false"),
  );
  const apiStatements = template.Resources.ApiExecutionRole.Properties.Policies
    .flatMap((policy) => policy.PolicyDocument?.Statement ?? []);
  const brokerInvoke = apiStatements.find((item) =>
    item["Fn::If"]?.[1]?.Sid === "InvokeExactMicrosoftEgressBroker");
  assert.deepEqual(
    brokerInvoke["Fn::If"],
    [
      "OutlookConversationWorkerConfigured",
      {
        Sid: "InvokeExactMicrosoftEgressBroker",
        Effect: "Allow",
        Action: "lambda:InvokeFunction",
        Resource: {
          "Fn::Sub": "arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:lawos-microsoft-egress-prod",
        },
      },
      { Ref: "AWS::NoValue" },
    ],
  );
  assert.equal(
    template.Resources.MicrosoftEgressBrokerLambdaEndpoint.Properties
      .ServiceName["Fn::Sub"],
    "com.amazonaws.${AWS::Region}.lambda",
  );
  assert.deepEqual(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_HRX_RELATIONAL_PROJECTION_ENABLED,
    { "Fn::If": ["ProjectionWorkerEnabled", "true", "false"] },
  );
  assert.equal(
    template.Parameters.ProjectionWorkerEventJson.MaxLength,
    640,
  );
  assert.equal(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_HRX_RELATIONAL_PROJECTION_MAPPING_OBJECT_KEY,
    undefined,
  );
  assert.equal(
    template.Resources.ApiFunction.Properties.Environment.Variables
      .LAWOS_HRX_RELATIONAL_PROJECTION_VALIDATION_OBJECT_KEY,
    undefined,
  );
  assert.deepEqual(
    template.Resources.ApiExecutionRole.Properties.Policies[0]
      .PolicyDocument.Statement.find((item) =>
        item.Sid === "ReadExactHrxProjectionRuntimeInputs"),
    {
      Sid: "ReadExactHrxProjectionRuntimeInputs",
      Effect: "Allow",
      Action: ["s3:GetObjectVersion", "s3:GetObjectRetention"],
      Resource: [
        {
          "Fn::Sub":
            "${ProgramInputBucket.Arn}/program-input/${ExecutionPacketSha256}/w15-worker-event/${SourceSha}/*",
        },
        {
          "Fn::Sub":
            "${ProgramInputBucket.Arn}/${HrxProjectionMappingObjectKey}",
        },
        {
          "Fn::Sub":
            "${ProgramInputBucket.Arn}/${HrxProjectionValidationObjectKey}",
        },
      ],
    },
  );
  assert.equal(
    template.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_PASSWORD_RESET_TENANT_ID,
    undefined,
  );
  assert.deepEqual(
    template.Resources.S3GatewayEndpoint.Properties.PolicyDocument.Statement
      .find((item) =>
        item.Sid === "ExactProductionProgramInputsAndMigrationDmsOnly"),
    {
      Sid: "ExactProductionProgramInputsAndMigrationDmsOnly",
      Effect: "Allow",
      Principal: "*",
      Action: [
        "s3:GetBucketLocation",
        "s3:GetBucketObjectLockConfiguration",
        "s3:GetBucketVersioning",
        "s3:GetObject",
        "s3:GetObjectLegalHold",
        "s3:GetObjectRetention",
        "s3:GetObjectVersion",
        "s3:PutObject",
        "s3:PutObjectLegalHold",
        "s3:PutObjectRetention",
      ],
      Resource: [
        { "Fn::GetAtt": ["ProgramInputBucket", "Arn"] },
        { "Fn::Sub": "${ProgramInputBucket.Arn}/*" },
        { "Fn::GetAtt": ["DmsBucket", "Arn"] },
        { "Fn::Sub": "${DmsBucket.Arn}/approved-real-migration/*" },
      ],
    },
  );
});

test("production API binds the internal updater only through one complete disabled-default contract", () => {
  const template = buildJsonPostgresProductionTemplate(reference);
  const parameters = template.Parameters;
  const environment = template.Resources.ApiFunction.Properties.Environment
    .Variables;
  const configured = (parameter) => ({
    "Fn::If": [
      "AmicInternalUnsignedUpdateBrokerEnabled",
      { Ref: parameter },
      "",
    ],
  });

  assert.equal(parameters.EnableAmicInternalUnsignedUpdateBroker.Default, "false");
  assert.equal(
    parameters.AmicInternalUnsignedArtifactBucketName.Default,
    JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_BUCKET,
  );
  for (const name of [
    "AmicInternalUnsignedArtifactKmsKeyArn",
    "AmicInternalUnsignedCloudFrontDomain",
    "AmicInternalUnsignedCloudFrontKeyPairId",
    "AmicInternalUnsignedCloudFrontPrivateKeySecretArn",
    "AmicInternalUnsignedMetadataPublicKeySpkiBase64",
  ]) {
    assert.equal(
      parameters[name].Default,
      JSON_POSTGRES_AMIC_INTERNAL_UPDATE_DISABLED_VALUE,
    );
  }
  assert.equal(
    parameters.AmicInternalUnsignedCloudFrontPrivateKeySecretArn.NoEcho,
    undefined,
  );
  assert.deepEqual(
    template.Conditions.AmicInternalUnsignedUpdateBrokerEnabled,
    {
      "Fn::Equals": [
        { Ref: "EnableAmicInternalUnsignedUpdateBroker" },
        "true",
      ],
    },
  );
  assert.deepEqual(environment.LAWOS_AMIC_INTERNAL_UPDATE_ENABLED, {
    "Fn::If": [
      "AmicInternalUnsignedUpdateBrokerEnabled",
      "true",
      "false",
    ],
  });
  assert.deepEqual(environment.LAWOS_AMIC_INTERNAL_UPDATE_AWS_ACCOUNT_ID, {
    Ref: "AWS::AccountId",
  });
  for (const [name, parameter] of [
    ["LAWOS_AMIC_INTERNAL_UPDATE_BUCKET", "AmicInternalUnsignedArtifactBucketName"],
    ["LAWOS_AMIC_INTERNAL_UPDATE_KMS_KEY_ARN", "AmicInternalUnsignedArtifactKmsKeyArn"],
    ["LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_DOMAIN", "AmicInternalUnsignedCloudFrontDomain"],
    ["LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_KEY_PAIR_ID", "AmicInternalUnsignedCloudFrontKeyPairId"],
    ["LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_PRIVATE_KEY_SECRET_ARN", "AmicInternalUnsignedCloudFrontPrivateKeySecretArn"],
    ["LAWOS_AMIC_INTERNAL_UPDATE_ED25519_PUBLIC_KEY_SPKI_BASE64", "AmicInternalUnsignedMetadataPublicKeySpkiBase64"],
  ]) {
    assert.deepEqual(environment[name], configured(parameter));
  }
  const signerSecret = template.Resources.SecretsManagerEndpoint.Properties
    .PolicyDocument.Statement
    .find((item) => item.Sid === "ApiReadsExactRuntimeSecrets")
    .Resource.find((item) => item["Fn::If"]?.[0]
      === "AmicInternalUnsignedUpdateBrokerEnabled");
  assert.deepEqual(signerSecret, {
    "Fn::If": [
      "AmicInternalUnsignedUpdateBrokerEnabled",
      { Ref: "AmicInternalUnsignedCloudFrontPrivateKeySecretArn" },
      { Ref: "AWS::NoValue" },
    ],
  });
  const s3Read = template.Resources.S3GatewayEndpoint.Properties.PolicyDocument
    .Statement.find((item) => item["Fn::If"]?.[0]
      === "AmicInternalUnsignedUpdateBrokerEnabled");
  assert.deepEqual(s3Read, {
    "Fn::If": [
      "AmicInternalUnsignedUpdateBrokerEnabled",
      {
        Sid: "ApiReadsExactInternalUnsignedDistribution",
        Effect: "Allow",
        Principal: { AWS: { "Fn::GetAtt": ["ApiExecutionRole", "Arn"] } },
        Action: ["s3:GetObject", "s3:GetObjectVersion"],
        Resource: {
          "Fn::Sub":
            "arn:${AWS::Partition}:s3:::${AmicInternalUnsignedArtifactBucketName}/internal-unsigned/*",
        },
      },
      { Ref: "AWS::NoValue" },
    ],
  });
  assert.deepEqual(
    template.Outputs.AmicInternalUnsignedUpdateBrokerEnabled.Value,
    {
      "Fn::If": [
        "AmicInternalUnsignedUpdateBrokerEnabled",
        "true",
        "false",
      ],
    },
  );
});

test("production template fails closed on public RDS, synthetic content, wildcard IAM and default traffic", () => {
  for (const mutate of [
    (value) => { value.Resources.Database.Properties.PubliclyAccessible = true; },
    (value) => { value.Resources.AdminFunction.Properties.Description = "synthetic migration"; },
    (value) => {
      value.Resources.AdminExecutionRole.Properties.Policies[0].PolicyDocument.Statement.push({
        Sid: "BadWildcard", Effect: "Allow", Action: "s3:*", Resource: "*",
      });
    },
    (value) => { value.Parameters.EnableProductionTraffic.Default = "true"; },
    (value) => { value.Parameters.EnableExternalReadProviders.Default = "true"; },
    (value) => {
      value.Parameters.EnableAmicInternalUnsignedUpdateBroker.Default = "true";
    },
    (value) => {
      value.Rules.AmicInternalUpdateBrokerConfigurationIsClosed.Assertions[0]
        .AssertDescription = "weakened";
    },
    (value) => {
      value.Resources.ApiFunction.Properties.Environment.Variables
        .LAWOS_AMIC_INTERNAL_UPDATE_BUCKET["Fn::If"][0] =
        "ProductionTrafficEnabled";
    },
    (value) => {
      value.Resources.SecretsManagerEndpoint.Properties.PolicyDocument.Statement
        .find((item) => item.Sid === "ApiReadsExactRuntimeSecrets")
        .Resource = value.Resources.SecretsManagerEndpoint.Properties
          .PolicyDocument.Statement
          .find((item) => item.Sid === "ApiReadsExactRuntimeSecrets")
          .Resource.filter((item) => item["Fn::If"]?.[0]
            !== "AmicInternalUnsignedUpdateBrokerEnabled");
    },
    (value) => {
      value.Resources.S3GatewayEndpoint.Properties.PolicyDocument.Statement
        .find((item) => item["Fn::If"]?.[0]
          === "AmicInternalUnsignedUpdateBrokerEnabled")
        ["Fn::If"][1].Action.push("s3:ListBucket");
    },
    (value) => {
      value.Rules.ExternalReadProviderConfigurationIsClosed.Assertions[0]
        .AssertDescription = "weakened";
    },
    (value) => {
      value.Resources.ExternalReadSecretsPolicy.Properties.PolicyDocument.Statement
        .find((item) => item.Sid === "UseTaggedExternalReadCredentialGenerations")
        .Resource = "*";
    },
    (value) => {
      value.Resources.ExternalReadSecretsPolicy.Properties.PolicyDocument.Statement
        .find((item) => item.Sid === "CreateTaggedExternalReadCredentialGenerations")
        .Condition.ArnEquals["secretsmanager:KmsKeyArn"] = "*";
    },
    (value) => {
      value.Resources.ExternalReadSecretsPolicy.Properties.PolicyDocument.Statement
        .find((item) => item.Sid === "TagExternalReadCredentialPurposeOnly")
        .Condition["ForAllValues:StringEquals"]["aws:TagKeys"].push("unsafe-tag");
    },
    (value) => {
      value.Resources.ExternalReadSecretsPolicy.Properties.PolicyDocument.Statement
        .find((item) => item.Sid === "ScheduleTaggedExternalReadCredentialDeletion")
        .Condition.NumericGreaterThanEquals["secretsmanager:RecoveryWindowInDays"] = "0";
    },
    (value) => {
      value.Resources.ExternalReadSecretsPolicy.Properties.PolicyDocument.Statement
        .find((item) => item.Sid === "DenyExternalReadCredentialForceDelete")
        .Condition.Bool["secretsmanager:ForceDeleteWithoutRecovery"] = "false";
    },
    (value) => {
      value.Resources.SecretsManagerEndpoint.Properties.PolicyDocument.Statement
        .find((item) => item["Fn::If"]?.[0] === "ExternalReadProvidersEnabled")
        ["Fn::If"][1].Action.push("secretsmanager:RestoreSecret");
    },
    (value) => {
      value.Resources.AdminExecutionRole.Properties.Policies[0].PolicyDocument.Statement
        .find((item) => item.Sid === "ReadExactBootstrapSecrets").Resource =
        value.Resources.AdminExecutionRole.Properties.Policies[0].PolicyDocument.Statement
          .find((item) => item.Sid === "ReadExactBootstrapSecrets").Resource
          .filter((item) => item?.Ref !== "ProjectionDatabaseSecret");
    },
    (value) => {
      value.Resources.S3GatewayEndpoint.Properties.PolicyDocument.Statement
        .find((item) =>
          item.Sid === "ExactProductionProgramInputsAndMigrationDmsOnly")
        .Action.push("s3:DeleteObject");
    },
    (value) => {
      value.Resources.S3GatewayEndpoint.Properties.PolicyDocument.Statement
        .find((item) =>
          item.Sid === "ExactProductionProgramInputsAndMigrationDmsOnly")
        .Resource.pop();
    },
    (value) => {
      value.Resources.ProjectionAuditorExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement
        .find((item) => item.Sid === "ReadExactProjectionAuditorSecrets")
        .Resource.push({ Ref: "ProjectionDatabaseSecret" });
    },
    (value) => {
      value.Resources.ProjectionAuditorFunction.Properties.Environment.Variables
        .LAWOS_MASTER_DATABASE_SECRET_ID = {
          "Fn::GetAtt": ["Database", "MasterUserSecret.SecretArn"],
        };
    },
    (value) => {
      value.Resources.ProjectionAuditorFunction.Properties.MemorySize = 1024;
    },
    (value) => {
      value.Resources.ProjectionWorkerSchedule.Properties.State = "ENABLED";
    },
    (value) => {
      value.Resources.ProjectionWorkerFunction.Properties.Environment.Variables
        .LAWOS_MASTER_DATABASE_SECRET_ID = {
          "Fn::GetAtt": ["Database", "MasterUserSecret.SecretArn"],
        };
    },
    (value) => {
      value.Resources.ProjectionWorkerExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement
        .find((item) =>
          item.Sid === "ReadImmutableProgramExecutionEvidence")
        .Resource = { "Fn::Sub": "${ProgramInputBucket.Arn}/*" };
    },
    (value) => {
      value.Resources.ProjectionWorkerExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement
        .find((item) => item.Sid === "ReadExactProjectionWorkerSecrets")
        .Resource.push({ Ref: "ProjectionAuditorDatabaseSecret" });
    },
    (value) => {
      value.Resources.ProjectionWorkerSchedule.Properties.Targets[0]
        .RetryPolicy.MaximumRetryAttempts = 185;
    },
    (value) => {
      value.Resources.ProjectionWorkerEventInvokeConfig.Properties
        .MaximumRetryAttempts = 0;
    },
    (value) => {
      value.Resources.ProjectionWorkerDeadLetterQueuePolicy.Properties
        .PolicyDocument.Statement[0].Principal = "*";
    },
    (value) => {
      value.Resources.ProjectionWorkerExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement
        .find((item) =>
          item.Sid
            === "SendOnlyProjectionWorkerFailuresToExactDeadLetterQueue")
        .Resource = "*";
    },
    (value) => {
      value.Resources.ProjectionWorkerDeadLetterAlarm.Properties.MetricName =
        "NumberOfMessagesSent";
    },
    (value) => {
      value.Resources.ProjectionWorkerLagAlarm.Properties.Threshold = 60_000;
    },
    (value) => {
      value.Resources.OutlookConversationWorkerFunction.Properties.Timeout = 5;
    },
    (value) => {
      delete value.Resources.OutlookConversationWorkerFunction.Condition;
    },
    (value) => {
      delete value.Resources.MicrosoftEgressBrokerLambdaEndpoint.Condition;
    },
    (value) => {
      value.Outputs.OutlookConversationWorkerFunctionName.Condition =
        "OutlookConversationWorkerEnabled";
    },
    (value) => {
      value.Conditions.OutlookConversationWorkerProvisioned["Fn::And"].pop();
    },
    (value) => {
      value.Resources.ApiFunction.Properties.Environment.Variables
        .LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED = {
          "Fn::If": ["OutlookConversationWorkerEnabled", "true", "false"],
        };
    },
    (value) => {
      value.Resources.ApiExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement
        .find((item) => item["Fn::If"]?.[1]?.Sid
          === "InvokeExactMicrosoftEgressBroker")["Fn::If"][0] =
          "ProductionTrafficEnabled";
    },
    (value) => {
      value.Resources.SecretsManagerEndpoint.Properties.PolicyDocument.Statement
        .find((item) => item.Sid === "ApiReadsExactRuntimeSecrets")
        .Resource.find((item) => item["Fn::If"]?.[0]
          === "OutlookConversationWorkerConfigured")["Fn::If"][0] =
          "ProductionTrafficEnabled";
    },
    (value) => {
      value.Resources.PasswordResetWorkerSchedule.Properties.ScheduleExpression =
        "rate(1 minute)";
    },
    (value) => {
      value.Resources.OutlookConversationWorkerSchedule.Properties.Targets[0]
        .Arn = { "Fn::GetAtt": ["ApiFunction", "Arn"] };
    },
    (value) => {
      value.Resources.OutlookConversationWorkerDeadLetterQueuePolicy.Properties
        .PolicyDocument.Statement[0].Principal = "*";
    },
    (value) => {
      value.Resources.OutlookConversationWorkerDeadLetterAlarm.Properties
        .MetricName = "NumberOfMessagesSent";
    },
    (value) => {
      value.Resources.ApiExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement
        .find((item) =>
          item.Sid === "ReadExactHrxProjectionRuntimeInputs")
        .Resource[1] = {
          "Fn::Sub": "${ProgramInputBucket.Arn}/*",
        };
    },
    (value) => {
      value.Resources.ApiExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement
        .find((item) =>
          item.Sid === "ReadExactHrxProjectionRuntimeInputs")
        .Action = ["s3:GetObjectVersion"];
    },
  ]) {
    const template = buildJsonPostgresProductionTemplate(reference);
    mutate(template);
    assert.throws(() => validateJsonPostgresProductionTemplate(template));
  }
});

test("production artifact bootstrap store is private, immutable, versioned, and KMS bound", () => {
  const template = buildJsonPostgresProductionArtifactStoreTemplate();
  const result = validateJsonPostgresProductionArtifactStoreTemplate(template);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.resource_count, 8);
  assert.equal(result.object_lock_bucket_count, 1);
  assert.equal(result.public_resource_count, 0);
  assert.equal(result.deletion_deny_count, 1);
  assert.equal(result.github_oidc_role_count, 3);
  assert.equal(result.asymmetric_wrapping_key_count, 1);
  const unsafe = structuredClone(template);
  unsafe.Resources.ArtifactBucket.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy = false;
  assert.throws(
    () => validateJsonPostgresProductionArtifactStoreTemplate(unsafe),
    /governance drifted/u,
  );
});

test("production artifact store contracts isolated immutable signed-Windows handoff roles", () => {
  const template = buildJsonPostgresProductionArtifactStoreTemplate();
  const metadata = template.Metadata.windows_signed_artifact_handoff;
  assert.deepEqual(metadata, {
    schema_version: "law-firm-os.windows-signed-artifact-infrastructure.v3",
    aws_account_id: "770880870480",
    aws_region: "ap-northeast-2",
    repository: "Gonyak-cell/law-firm-os",
    oidc_audience: "sts.amazonaws.com",
    wrapping_key_spec: "RSA_4096",
    wrapping_key_usage: "ENCRYPT_DECRYPT",
    wrapping_encryption_algorithm: "RSAES_OAEP_SHA_256",
    wrapping_public_key_format: "DER_SPKI_BASE64",
    wrapping_public_key_fingerprint_algorithm: "SHA-256",
    object_prefix: "windows/signed/v1/",
    object_key_pattern:
      "windows/signed/v1/{source_sha}/{version}/{candidate_role}/{artifact_kind}/sha256/{artifact_sha256}/{filename}",
    uploader_environment: "windows-signed-artifact-handoff",
    uploader_workflow: "Windows Authenticode Package QA",
    uploader_workflow_ref:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-authenticode-package-qa.yml@refs/heads/main",
    uploader_job_workflow_ref:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-signed-artifact-private-handoff-oidc.yml@refs/heads/main",
    reader_environment: "windows-formal-update-rollback",
    reader_workflow: "Windows Formal Operator Update And Rollback QA",
    reader_workflow_ref:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-rollback-qa.yml@refs/heads/main",
    reader_job_workflow_ref:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-reader-oidc.yml@refs/heads/main",
    git_ref: "refs/heads/main",
    governance_prefix: "windows/governance/v1/",
    governance_key_pattern:
      "windows/governance/v1/{artifact_id}/sha256/{artifact_sha256}/{filename}",
    aggregate_locator_object_count: 19,
    aggregate_locator_signed_object_count: 10,
    aggregate_locator_governance_object_count: 9,
    aggregate_sealer_environment:
      "windows-formal-update-private-locator-seal",
    aggregate_sealer_workflow: "Windows Formal Update Private Locator Seal",
    aggregate_sealer_workflow_ref:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal.yml@refs/heads/main",
    aggregate_sealer_job_workflow_ref:
      "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal-oidc.yml@refs/heads/main",
    aggregate_sealer_job: "seal-private-locator",
    locator_wrapping_key_reuse: "WindowsSignedArtifactWrappingKey",
    locator_wrapping_algorithm: "RSAES_OAEP_SHA_256",
  });
  const wrappingKey = template.Resources.WindowsSignedArtifactWrappingKey;
  assert.equal(wrappingKey.DeletionPolicy, "Retain");
  assert.equal(wrappingKey.UpdateReplacePolicy, "Retain");
  assert.equal(wrappingKey.Properties.KeySpec, "RSA_4096");
  assert.equal(wrappingKey.Properties.KeyUsage, "ENCRYPT_DECRYPT");
  assert.equal(wrappingKey.Properties.EnableKeyRotation, undefined);

  const uploader = template.Resources.WindowsSignedArtifactUploaderRole.Properties;
  const reader = template.Resources.WindowsSignedArtifactReaderRole.Properties;
  const sealer = template.Resources.WindowsSignedArtifactLocatorSealerRole
    .Properties;
  for (const [role, environment, workflow, jobWorkflowRef, sid] of [
    [
      uploader,
      "windows-signed-artifact-handoff",
      "Windows Authenticode Package QA",
      "Gonyak-cell/law-firm-os/.github/workflows/windows-signed-artifact-private-handoff-oidc.yml@refs/heads/main",
      "GitHubOidcProtectedWindowsHandoffOnly",
    ],
    [
      reader,
      "windows-formal-update-rollback",
      "Windows Formal Operator Update And Rollback QA",
      "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-reader-oidc.yml@refs/heads/main",
      "GitHubOidcProtectedWindowsOperatorOnly",
    ],
    [
      sealer,
      "windows-formal-update-private-locator-seal",
      "Windows Formal Update Private Locator Seal",
      "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal-oidc.yml@refs/heads/main",
      "GitHubOidcProtectedWindowsLocatorSealOnly",
    ],
  ]) {
    assert.equal(role.MaxSessionDuration, 3600);
    assert.deepEqual(role.AssumeRolePolicyDocument.Statement[0], {
      Sid: sid,
      Effect: "Allow",
      Principal: {
        Federated: {
          "Fn::Sub":
            "arn:${AWS::Partition}:iam::770880870480:oidc-provider/token.actions.githubusercontent.com",
        },
      },
      Action: "sts:AssumeRoleWithWebIdentity",
      Condition: {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub":
            `repo:Gonyak-cell/law-firm-os:environment:${environment}`,
          "token.actions.githubusercontent.com:ref": "refs/heads/main",
          "token.actions.githubusercontent.com:workflow": workflow,
          "token.actions.githubusercontent.com:job_workflow_ref":
            jobWorkflowRef,
        },
      },
    });
  }

  const uploaderStatements = uploader.Policies[0].PolicyDocument.Statement;
  const readerStatements = reader.Policies[0].PolicyDocument.Statement;
  const sealerStatements = sealer.Policies[0].PolicyDocument.Statement;
  assert.deepEqual(
    uploaderStatements.find((item) =>
      item.Sid === "ReadWindowsSignedArtifactBucketGovernance")?.Action,
    [
      "s3:GetEncryptionConfiguration",
      "s3:GetBucketLocation",
      "s3:GetBucketObjectLockConfiguration",
      "s3:GetBucketOwnershipControls",
      "s3:GetBucketPublicAccessBlock",
      "s3:GetBucketVersioning",
    ],
  );
  assert.deepEqual(
    uploaderStatements.find((item) =>
      item.Sid === "ReadExactVersionedWindowsSignedArtifacts")?.Action,
    ["s3:GetObjectVersion", "s3:GetObjectRetention"],
  );
  for (const sid of [
    "UploadImmutableContentAddressedWindowsSignedArtifacts",
    "AuthorizeImmutableWindowsSignedArtifactRetentionHeaders",
  ]) {
    const condition = uploaderStatements.find((item) =>
      item.Sid === sid)?.Condition;
    assert.equal(
      condition.StringEquals["s3:object-lock-mode"],
      "COMPLIANCE",
    );
    assert.equal(
      condition.NumericGreaterThanEquals
        ["s3:object-lock-remaining-retention-days"],
      365,
    );
    assert.equal(
      condition.NumericLessThanEquals
        ["s3:object-lock-remaining-retention-days"],
      3650,
    );
  }
  assert.equal(
    uploaderStatements.find((item) => item.Action === "s3:PutObjectRetention")
      ?.Sid,
    "AuthorizeImmutableWindowsSignedArtifactRetentionHeaders",
  );
  const handoffBucketDenies = template.Resources.ArtifactBucketPolicy
    .Properties.PolicyDocument.Statement.filter((item) =>
      item.Sid.startsWith("DenyWindowsHandoff"));
  assert.deepEqual(handoffBucketDenies.map((item) => item.Sid), [
    "DenyWindowsHandoffMissingObjectLockMode",
    "DenyWindowsHandoffNonComplianceObjectLockMode",
    "DenyWindowsHandoffMissingRetentionDays",
    "DenyWindowsHandoffRetentionBelowMinimum",
    "DenyWindowsHandoffRetentionAboveMaximum",
  ]);
  for (const deny of handoffBucketDenies) {
    assert.equal(deny.Effect, "Deny");
    assert.equal(deny.Principal, "*");
    assert.deepEqual(
      deny.Action,
      ["s3:PutObject", "s3:PutObjectRetention"],
    );
    assert.deepEqual(
      deny.Resource,
      { "Fn::Sub": "${ArtifactBucket.Arn}/windows/signed/v1/*" },
    );
  }
  const governanceBucketDenies = template.Resources.ArtifactBucketPolicy
    .Properties.PolicyDocument.Statement.filter((item) =>
      item.Sid.startsWith("DenyWindowsGovernance"));
  assert.deepEqual(governanceBucketDenies.map((item) => item.Sid), [
    "DenyWindowsGovernanceMissingObjectLockMode",
    "DenyWindowsGovernanceNonComplianceObjectLockMode",
    "DenyWindowsGovernanceMissingRetentionDays",
    "DenyWindowsGovernanceRetentionBelowMinimum",
    "DenyWindowsGovernanceRetentionAboveMaximum",
  ]);
  for (const deny of governanceBucketDenies) {
    assert.equal(deny.Effect, "Deny");
    assert.equal(deny.Principal, "*");
    assert.deepEqual(
      deny.Action,
      ["s3:PutObject", "s3:PutObjectRetention"],
    );
    assert.deepEqual(
      deny.Resource,
      { "Fn::Sub": "${ArtifactBucket.Arn}/windows/governance/v1/*" },
    );
  }
  assert.deepEqual(
    readerStatements.find((item) =>
      item.Sid === "ReadExactVersionedWindowsSignedArtifacts")?.Action,
    ["s3:GetObjectVersion", "s3:GetObjectRetention"],
  );
  assert.deepEqual(
    readerStatements.find((item) =>
      item.Sid === "ReadExactVersionedWindowsGovernanceArtifacts"),
    {
      Sid: "ReadExactVersionedWindowsGovernanceArtifacts",
      Effect: "Allow",
      Action: ["s3:GetObjectVersion", "s3:GetObjectRetention"],
      Resource: {
        "Fn::Sub": "${ArtifactBucket.Arn}/windows/governance/v1/*",
      },
    },
  );
  assert.deepEqual(
    readerStatements.find((item) =>
      item.Sid === "DecryptExactWindowsSignedArtifactVersions"),
    {
      Sid: "DecryptExactWindowsSignedArtifactVersions",
      Effect: "Allow",
      Action: ["kms:Decrypt", "kms:GenerateDataKey"],
      Resource: { "Fn::GetAtt": ["ArtifactKey", "Arn"] },
      Condition: {
        StringEquals: {
          "kms:CallerAccount": "770880870480",
          "kms:ViaService": "s3.ap-northeast-2.amazonaws.com",
        },
      },
    },
  );
  assert.deepEqual(
    uploaderStatements.find((item) =>
      item.Sid === "UnwrapExactWindowsSignedArtifactEnvelope"),
    {
      Sid: "UnwrapExactWindowsSignedArtifactEnvelope",
      Effect: "Allow",
      Action: "kms:Decrypt",
      Resource: {
        "Fn::GetAtt": ["WindowsSignedArtifactWrappingKey", "Arn"],
      },
      Condition: {
        StringEquals: {
          "kms:EncryptionAlgorithm": "RSAES_OAEP_SHA_256",
        },
      },
    },
  );
  assert.deepEqual(
    readerStatements.find((item) =>
      item.Sid === "UnwrapExactWindowsUpdateLocator"),
    {
      Sid: "UnwrapExactWindowsUpdateLocator",
      Effect: "Allow",
      Action: "kms:Decrypt",
      Resource: {
        "Fn::GetAtt": ["WindowsSignedArtifactWrappingKey", "Arn"],
      },
      Condition: {
        StringEquals: {
          "kms:EncryptionAlgorithm": "RSAES_OAEP_SHA_256",
        },
      },
    },
  );
  assert.deepEqual(
    readerStatements.find((item) =>
      item.Sid === "ReadExactVersionedWindowsSignedArtifacts")?.Resource,
    { "Fn::Sub": "${ArtifactBucket.Arn}/windows/signed/v1/*" },
  );
  assert.deepEqual(
    sealerStatements.find((item) =>
      item.Sid === "ReadExactVersionedWindowsSignedArtifacts"),
    {
      Sid: "ReadExactVersionedWindowsSignedArtifacts",
      Effect: "Allow",
      Action: ["s3:GetObjectVersion", "s3:GetObjectRetention"],
      Resource: {
        "Fn::Sub": "${ArtifactBucket.Arn}/windows/signed/v1/*",
      },
    },
  );
  for (const sid of [
    "UploadImmutableContentAddressedWindowsGovernance",
    "AuthorizeImmutableWindowsGovernanceRetentionHeaders",
  ]) {
    const statement = sealerStatements.find((item) => item.Sid === sid);
    assert.deepEqual(statement.Resource, {
      "Fn::Sub": "${ArtifactBucket.Arn}/windows/governance/v1/*",
    });
    assert.equal(
      statement.Condition.StringEquals["s3:object-lock-mode"],
      "COMPLIANCE",
    );
    assert.equal(
      statement.Condition.NumericGreaterThanEquals
        ["s3:object-lock-remaining-retention-days"],
      365,
    );
    assert.equal(
      statement.Condition.NumericLessThanEquals
        ["s3:object-lock-remaining-retention-days"],
      3650,
    );
  }
  assert.deepEqual(
    sealerStatements.find((item) =>
      item.Sid === "ReadBackExactVersionedWindowsGovernance"),
    {
      Sid: "ReadBackExactVersionedWindowsGovernance",
      Effect: "Allow",
      Action: ["s3:GetObjectVersion", "s3:GetObjectRetention"],
      Resource: {
        "Fn::Sub": "${ArtifactBucket.Arn}/windows/governance/v1/*",
      },
    },
  );
  assert.deepEqual(
    sealerStatements.find((item) =>
      item.Sid === "UnwrapExactCandidateLocators"),
    {
      Sid: "UnwrapExactCandidateLocators",
      Effect: "Allow",
      Action: "kms:Decrypt",
      Resource: {
        "Fn::GetAtt": ["WindowsSignedArtifactWrappingKey", "Arn"],
      },
      Condition: {
        StringEquals: {
          "kms:EncryptionAlgorithm": "RSAES_OAEP_SHA_256",
        },
      },
    },
  );
  assert.deepEqual(
    sealerStatements.find((item) =>
      item.Sid === "UseExactArtifactKeyForGovernanceUploadAndReadback")
      ?.Action,
    ["kms:Decrypt", "kms:GenerateDataKey"],
  );
  for (const role of [uploader, reader, sealer]) {
    const statements = role.Policies[0].PolicyDocument.Statement;
    const actions = statements.flatMap((item) =>
      Array.isArray(item.Action) ? item.Action : [item.Action]);
    assert.equal(actions.some((action) => action.includes("*")), false);
    assert.equal(actions.includes("s3:GetObject"), false);
    assert.equal(actions.some((action) => action.startsWith("s3:List")), false);
    assert.equal(actions.some((action) => action.startsWith("s3:Delete")), false);
    assert.equal(actions.some((action) => action.startsWith("lambda:")), false);
    assert.equal(actions.some((action) =>
      /(?:Publish|CreateDeployment|UpdateAlias|CreateAlias)/u.test(action)), false);
  }
  assert.equal(
    readerStatements.filter((item) =>
      item.Resource?.["Fn::GetAtt"]?.[0]
        === "WindowsSignedArtifactWrappingKey").length,
    1,
  );
  assert.deepEqual(template.Outputs.WindowsSignedArtifactWrappingKeyArn, {
    Value: { "Fn::GetAtt": ["WindowsSignedArtifactWrappingKey", "Arn"] },
  });
  assert.deepEqual(template.Outputs.WindowsSignedArtifactWrappingKeyId, {
    Value: { Ref: "WindowsSignedArtifactWrappingKey" },
  });
  assert.equal(
    template.Outputs.WindowsSignedArtifactWrappingEncryptionAlgorithm.Value,
    "RSAES_OAEP_SHA_256",
  );
  assert.equal(
    template.Outputs.WindowsSignedArtifactWrappingPublicKeyFingerprintAlgorithm.Value,
    "SHA-256",
  );
  assert.equal(
    template.Outputs.WindowsSignedArtifactDefaultRetentionDays.Value,
    365,
  );
  assert.equal(
    template.Outputs.WindowsSignedArtifactGovernancePrefix.Value,
    "windows/governance/v1/",
  );
  assert.equal(
    template.Outputs.WindowsSignedArtifactGovernanceKeyPattern.Value,
    "windows/governance/v1/{artifact_id}/sha256/{artifact_sha256}/{filename}",
  );
  assert.deepEqual(
    template.Outputs.WindowsSignedArtifactLocatorSealRoleArn,
    {
      Value: {
        "Fn::GetAtt": ["WindowsSignedArtifactLocatorSealerRole", "Arn"],
      },
    },
  );
  assert.deepEqual(
    template.Outputs.WindowsSignedArtifactLocatorUnwrapKmsKeyArn,
    {
      Value: { "Fn::GetAtt": ["WindowsSignedArtifactWrappingKey", "Arn"] },
    },
  );
  assert.equal(
    template.Outputs.WindowsSignedArtifactUploaderJobWorkflowRef.Value,
    "Gonyak-cell/law-firm-os/.github/workflows/windows-signed-artifact-private-handoff-oidc.yml@refs/heads/main",
  );
  assert.equal(
    template.Outputs.WindowsSignedArtifactReaderJobWorkflowRef.Value,
    "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-reader-oidc.yml@refs/heads/main",
  );
  assert.equal(
    template.Outputs.WindowsSignedArtifactLocatorSealJobWorkflowRef.Value,
    "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal-oidc.yml@refs/heads/main",
  );
});

test("production signed-Windows infrastructure rejects trust, key, prefix, and privilege drift", () => {
  const mutations = [
    (value) => {
      value.Resources.WindowsSignedArtifactUploaderRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:aud"] = "example.invalid";
    },
    (value) => {
      value.Resources.WindowsSignedArtifactUploaderRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:sub"] = "repo:Gonyak-cell/law-firm-os:ref:refs/heads/main";
    },
    (value) => {
      value.Resources.WindowsSignedArtifactUploaderRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:ref"] = "refs/heads/release";
    },
    (value) => {
      value.Resources.WindowsSignedArtifactReaderRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:workflow"] =
          "Unreviewed Windows Workflow";
    },
    (value) => {
      value.Resources.WindowsSignedArtifactLocatorSealerRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:workflow"] =
          "Unreviewed Locator Workflow";
    },
    (value) => {
      delete value.Resources.WindowsSignedArtifactUploaderRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:job_workflow_ref"];
    },
    (value) => {
      value.Resources.WindowsSignedArtifactUploaderRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:job_workflow_ref"] =
          "Gonyak-cell/law-firm-os/.github/workflows/unreviewed.yml@refs/heads/main";
    },
    (value) => {
      delete value.Resources.WindowsSignedArtifactReaderRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:job_workflow_ref"];
    },
    (value) => {
      value.Resources.WindowsSignedArtifactReaderRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:job_workflow_ref"] =
          "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-reader-oidc.yml@refs/heads/release";
    },
    (value) => {
      delete value.Resources.WindowsSignedArtifactLocatorSealerRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:job_workflow_ref"];
    },
    (value) => {
      value.Resources.WindowsSignedArtifactLocatorSealerRole.Properties
        .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
        ["token.actions.githubusercontent.com:job_workflow_ref"] =
          "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal.yml@refs/heads/main";
    },
    (value) => {
      value.Resources.WindowsSignedArtifactReaderRole.Properties.MaxSessionDuration = 43_200;
    },
    (value) => {
      value.Resources.WindowsSignedArtifactUploaderRole.Properties.Policies[0]
        .PolicyDocument.Statement[0].Action.push("s3:ListBucket");
    },
    (value) => {
      value.Resources.WindowsSignedArtifactReaderRole.Properties.Policies[0]
        .PolicyDocument.Statement.find((item) =>
          item.Sid === "ReadExactVersionedWindowsSignedArtifacts")
        .Action.push("s3:GetObject");
    },
    (value) => {
      value.Resources.WindowsSignedArtifactReaderRole.Properties.Policies[0]
        .PolicyDocument.Statement.find((item) =>
          item.Sid === "DecryptExactWindowsSignedArtifactVersions")
        .Action = ["kms:Decrypt"];
    },
    (value) => {
      value.Resources.WindowsSignedArtifactReaderRole.Properties.Policies[0]
        .PolicyDocument.Statement.find((item) =>
          item.Sid === "ReadExactVersionedWindowsGovernanceArtifacts")
        .Resource = { "Fn::Sub": "${ArtifactBucket.Arn}/*" };
    },
    (value) => {
      value.Resources.WindowsSignedArtifactReaderRole.Properties.Policies[0]
        .PolicyDocument.Statement.find((item) =>
          item.Sid === "UnwrapExactWindowsUpdateLocator")
        .Condition.StringEquals["kms:EncryptionAlgorithm"] =
          "RSAES_OAEP_SHA_1";
    },
    (value) => {
      value.Resources.WindowsSignedArtifactLocatorSealerRole.Properties
        .Policies[0].PolicyDocument.Statement.push({
          Sid: "ListGovernance",
          Effect: "Allow",
          Action: "s3:ListBucketVersions",
          Resource: { "Fn::GetAtt": ["ArtifactBucket", "Arn"] },
        });
    },
    (value) => {
      value.Resources.WindowsSignedArtifactLocatorSealerRole.Properties
        .Policies[0].PolicyDocument.Statement.find((item) =>
          item.Sid === "UploadImmutableContentAddressedWindowsGovernance")
        .Resource = { "Fn::Sub": "${ArtifactBucket.Arn}/*" };
    },
    (value) => {
      value.Resources.WindowsSignedArtifactUploaderRole.Properties.Policies[0]
        .PolicyDocument.Statement.push({
          Sid: "DeleteUploadedArtifact",
          Effect: "Allow",
          Action: "s3:DeleteObjectVersion",
          Resource: { "Fn::Sub": "${ArtifactBucket.Arn}/windows/signed/v1/*" },
        });
    },
    (value) => {
      value.Resources.WindowsSignedArtifactUploaderRole.Properties.Policies[0]
        .PolicyDocument.Statement.push({
          Sid: "InvokeSomething",
          Effect: "Allow",
          Action: "lambda:InvokeFunction",
          Resource: "*",
        });
    },
    (value) => {
      value.Resources.WindowsSignedArtifactUploaderRole.Properties.Policies[0]
        .PolicyDocument.Statement.find((item) =>
          item.Sid === "ReadExactVersionedWindowsSignedArtifacts")
        .Resource = { "Fn::Sub": "${ArtifactBucket.Arn}/*" };
    },
    (value) => {
      value.Resources.WindowsSignedArtifactUploaderRole.Properties.Policies[0]
        .PolicyDocument.Statement.find((item) =>
          item.Sid === "UnwrapExactWindowsSignedArtifactEnvelope")
        .Condition.StringEquals["kms:EncryptionAlgorithm"] = "RSAES_OAEP_SHA_1";
    },
    (value) => {
      value.Resources.WindowsSignedArtifactWrappingKey.Properties.KeySpec = "RSA_2048";
    },
    (value) => {
      delete value.Resources.WindowsSignedArtifactUploaderRole.Properties
        .Policies[0].PolicyDocument.Statement.find((item) =>
          item.Sid === "UploadImmutableContentAddressedWindowsSignedArtifacts")
        .Condition.NumericGreaterThanEquals;
    },
    (value) => {
      value.Resources.WindowsSignedArtifactUploaderRole.Properties.Policies[0]
        .PolicyDocument.Statement.find((item) =>
          item.Sid === "AuthorizeImmutableWindowsSignedArtifactRetentionHeaders")
        .Condition.NumericLessThanEquals
        ["s3:object-lock-remaining-retention-days"] = 3651;
    },
    (value) => {
      value.Resources.ArtifactBucketPolicy.Properties.PolicyDocument.Statement =
        value.Resources.ArtifactBucketPolicy.Properties.PolicyDocument.Statement
          .filter((item) =>
            item.Sid !== "DenyWindowsHandoffMissingRetentionDays");
    },
    (value) => {
      value.Resources.ArtifactBucketPolicy.Properties.PolicyDocument.Statement
        .find((item) =>
          item.Sid === "DenyWindowsHandoffRetentionBelowMinimum")
        .Condition.NumericLessThan
        ["s3:object-lock-remaining-retention-days"] = 364;
    },
    (value) => {
      value.Resources.ArtifactBucketPolicy.Properties.PolicyDocument.Statement =
        value.Resources.ArtifactBucketPolicy.Properties.PolicyDocument.Statement
          .filter((item) =>
            item.Sid !== "DenyWindowsGovernanceMissingRetentionDays");
    },
    (value) => {
      value.Metadata.windows_signed_artifact_handoff.object_prefix = "windows/";
    },
    (value) => {
      delete value.Outputs.WindowsSignedArtifactUploaderRoleArn;
    },
  ];
  for (const mutate of mutations) {
    const template = buildJsonPostgresProductionArtifactStoreTemplate();
    mutate(template);
    assert.throws(() =>
      validateJsonPostgresProductionArtifactStoreTemplate(template));
  }
});

test("production signed-Windows artifact-store update classifies exact v1 through v4 states", () => {
  const baseline =
    buildJsonPostgresProductionArtifactStoreWindowsHandoffBaselineTemplate();
  assert.equal(
    baseline.Metadata.schema_version,
    "law-firm-os.json-postgres-production-artifact-store.v1",
  );
  assert.equal(
    baseline.Metadata.windows_signed_artifact_handoff,
    undefined,
  );
  assert.deepEqual(Object.keys(baseline.Resources).sort(), [
    "ArtifactBucket",
    "ArtifactBucketPolicy",
    "ArtifactKey",
    "ArtifactKeyAlias",
  ]);
  assert.deepEqual(Object.keys(baseline.Outputs).sort(), [
    "ArtifactBucketArn",
    "ArtifactBucketName",
    "ArtifactKmsKeyArn",
    "ExecutionPacketSha256",
    "SourceSha",
    "SourceTree",
  ]);
  assert.equal(
    buildJsonPostgresProductionArtifactStoreTemplate().Metadata.schema_version,
    "law-firm-os.json-postgres-production-artifact-store.v4",
  );
  const baselineState =
    classifyJsonPostgresProductionArtifactStoreWindowsHandoffTemplate(
      baseline,
    );
  assert.equal(baselineState.state, "legacy-v1");
  assert.match(baselineState.template_sha256, /^[0-9a-f]{64}$/u);
  const v2 =
    buildJsonPostgresProductionArtifactStoreWindowsHandoffV2Template();
  assert.equal(
    v2.Metadata.schema_version,
    "law-firm-os.json-postgres-production-artifact-store.v2",
  );
  assert.equal(
    v2.Metadata.windows_signed_artifact_handoff.schema_version,
    "law-firm-os.windows-signed-artifact-infrastructure.v1",
  );
  assert.equal(v2.Resources.WindowsSignedArtifactLocatorSealerRole, undefined);
  assert.equal(v2.Outputs.WindowsSignedArtifactGovernancePrefix, undefined);
  assert.equal(
    v2.Resources.WindowsSignedArtifactReaderRole.Properties.Policies[0]
      .PolicyDocument.Statement.some((item) =>
        item.Sid === "UnwrapExactWindowsUpdateLocator"),
    false,
  );
  assert.equal(
    classifyJsonPostgresProductionArtifactStoreWindowsHandoffTemplate(v2)
      .state,
    "windows-handoff-v2",
  );
  const v3 =
    buildJsonPostgresProductionArtifactStoreWindowsHandoffV3Template();
  assert.equal(
    v3.Metadata.schema_version,
    "law-firm-os.json-postgres-production-artifact-store.v3",
  );
  assert.equal(
    v3.Resources.WindowsSignedArtifactUploaderRole.Properties
      .AssumeRolePolicyDocument.Statement[0].Condition.StringEquals
      ["token.actions.githubusercontent.com:job_workflow_ref"],
    undefined,
  );
  assert.equal(
    v3.Outputs.WindowsSignedArtifactUploaderJobWorkflowRef,
    undefined,
  );
  assert.equal(
    classifyJsonPostgresProductionArtifactStoreWindowsHandoffTemplate(v3)
      .state,
    "windows-handoff-v3",
  );
  assert.equal(
    classifyJsonPostgresProductionArtifactStoreWindowsHandoffTemplate(
      buildJsonPostgresProductionArtifactStoreTemplate(),
    ).state,
    "windows-handoff-v4",
  );
  const drifted = structuredClone(baseline);
  drifted.Description = "unreviewed template";
  assert.throws(() =>
    classifyJsonPostgresProductionArtifactStoreWindowsHandoffTemplate(
      drifted,
    ));
});

test("production signed-Windows live governance rejects pre- and post-update drift", () => {
  const template = buildJsonPostgresProductionArtifactStoreTemplate();
  const keyId = "11111111-1111-4111-8111-111111111111";
  const keyArn = `arn:aws:kms:ap-northeast-2:770880870480:key/${keyId}`;
  const input = {
    template,
    outputs: { ArtifactKmsKeyArn: keyArn },
    artifactKmsKeyRef: "alias/lawos-production-artifacts",
    location: { LocationConstraint: "ap-northeast-2" },
    ownership: {
      OwnershipControls: {
        Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }],
      },
    },
    bucketPolicy:
      template.Resources.ArtifactBucketPolicy.Properties.PolicyDocument,
    expectedBucketPolicy: structuredClone(
      template.Resources.ArtifactBucketPolicy.Properties.PolicyDocument,
    ),
    artifactKeyPolicy: template.Resources.ArtifactKey.Properties.KeyPolicy,
    expectedArtifactKeyPolicy: structuredClone(
      template.Resources.ArtifactKey.Properties.KeyPolicy,
    ),
    artifactKey: {
      Arn: keyArn,
      KeyId: keyId,
      KeySpec: "SYMMETRIC_DEFAULT",
      KeyUsage: "ENCRYPT_DECRYPT",
      Enabled: true,
      KeyState: "Enabled",
      KeyManager: "CUSTOMER",
      Origin: "AWS_KMS",
      MultiRegion: false,
    },
    artifactKeyAliases: {
      Truncated: false,
      Aliases: [{
        AliasName: "alias/lawos-production-artifacts",
        TargetKeyId: keyId,
      }],
    },
    artifactKeyRotation: { KeyRotationEnabled: true },
  };
  assert.deepEqual(
    validateJsonPostgresProductionArtifactStoreWindowsHandoffLiveGovernance(
      input,
    ),
    {
      verdict: "PASS",
      deployment_state: "windows-handoff-v4",
      template_sha256:
        classifyJsonPostgresProductionArtifactStoreWindowsHandoffTemplate(
          template,
        ).template_sha256,
      bucket_location: "ap-northeast-2",
      bucket_owner_enforced: true,
      artifact_kms_alias: "alias/lawos-production-artifacts",
      artifact_kms_key_arn: keyArn,
      artifact_kms_key_rotation_enabled: true,
      live_governance_drift_count: 0,
    },
  );
  const v2Template =
    buildJsonPostgresProductionArtifactStoreWindowsHandoffV2Template();
  assert.equal(
    validateJsonPostgresProductionArtifactStoreWindowsHandoffLiveGovernance({
      ...input,
      template: v2Template,
      bucketPolicy:
        v2Template.Resources.ArtifactBucketPolicy.Properties.PolicyDocument,
      expectedBucketPolicy: structuredClone(
        v2Template.Resources.ArtifactBucketPolicy.Properties.PolicyDocument,
      ),
      artifactKeyPolicy: v2Template.Resources.ArtifactKey.Properties.KeyPolicy,
      expectedArtifactKeyPolicy: structuredClone(
        v2Template.Resources.ArtifactKey.Properties.KeyPolicy,
      ),
    }).deployment_state,
    "windows-handoff-v2",
  );
  const v3Template =
    buildJsonPostgresProductionArtifactStoreWindowsHandoffV3Template();
  assert.equal(
    validateJsonPostgresProductionArtifactStoreWindowsHandoffLiveGovernance({
      ...input,
      template: v3Template,
      bucketPolicy:
        v3Template.Resources.ArtifactBucketPolicy.Properties.PolicyDocument,
      expectedBucketPolicy: structuredClone(
        v3Template.Resources.ArtifactBucketPolicy.Properties.PolicyDocument,
      ),
      artifactKeyPolicy: v3Template.Resources.ArtifactKey.Properties.KeyPolicy,
      expectedArtifactKeyPolicy: structuredClone(
        v3Template.Resources.ArtifactKey.Properties.KeyPolicy,
      ),
    }).deployment_state,
    "windows-handoff-v3",
  );
  const baselineTemplate =
    buildJsonPostgresProductionArtifactStoreWindowsHandoffBaselineTemplate();
  assert.equal(
    validateJsonPostgresProductionArtifactStoreWindowsHandoffLiveGovernance({
      ...input,
      template: baselineTemplate,
      bucketPolicy:
        baselineTemplate.Resources.ArtifactBucketPolicy.Properties
          .PolicyDocument,
      expectedBucketPolicy: structuredClone(
        baselineTemplate.Resources.ArtifactBucketPolicy.Properties
          .PolicyDocument,
      ),
      artifactKeyPolicy:
        baselineTemplate.Resources.ArtifactKey.Properties.KeyPolicy,
      expectedArtifactKeyPolicy: structuredClone(
        baselineTemplate.Resources.ArtifactKey.Properties.KeyPolicy,
      ),
    }).deployment_state,
    "legacy-v1",
  );
  const mutations = [
    (value) => { value.location.LocationConstraint = "us-east-1"; },
    (value) => {
      value.ownership.OwnershipControls.Rules[0].ObjectOwnership =
        "ObjectWriter";
    },
    (value) => { value.bucketPolicy.Statement.pop(); },
    (value) => { value.artifactKeyPolicy.Statement[0].Action = "kms:Decrypt"; },
    (value) => { value.artifactKey.KeyState = "Disabled"; },
    (value) => {
      value.artifactKeyAliases.Aliases.push({
        AliasName: "alias/unreviewed",
        TargetKeyId: keyId,
      });
    },
    (value) => { value.artifactKeyRotation.KeyRotationEnabled = false; },
  ];
  for (const mutate of mutations) {
    const drifted = structuredClone(input);
    mutate(drifted);
    assert.throws(() =>
      validateJsonPostgresProductionArtifactStoreWindowsHandoffLiveGovernance(
        drifted,
      ));
  }
});

test("production signed-Windows artifact-store updates allow only exact v1, v2, or v3 to v4 changes", () => {
  const template = buildJsonPostgresProductionArtifactStoreTemplate();
  const templateSha256 =
    validateJsonPostgresProductionArtifactStoreTemplate(template)
      .template_sha256;
  const bucketPolicyChange = {
    ResourceChange: {
      Action: "Modify",
      LogicalResourceId: "ArtifactBucketPolicy",
      PhysicalResourceId: "lawos-prod-artifacts-770880870480",
      ResourceType: "AWS::S3::BucketPolicy",
      Replacement: "False",
      Scope: ["Properties"],
    },
  };
  const add = (LogicalResourceId, ResourceType) => ({
    ResourceChange: {
      Action: "Add",
      LogicalResourceId,
      ResourceType,
      Replacement: "False",
      Scope: [],
    },
  });
  const modifyRole = (LogicalResourceId, PhysicalResourceId) => ({
    ResourceChange: {
      Action: "Modify",
      LogicalResourceId,
      PhysicalResourceId,
      ResourceType: "AWS::IAM::Role",
      Replacement: "False",
      Scope: ["Properties"],
    },
  });
  const changeSet = {
    StackName: "lawos-production-artifact-store",
    ChangeSetType: "UPDATE",
    Status: "CREATE_COMPLETE",
    ExecutionStatus: "AVAILABLE",
    IncludeNestedStacks: false,
    Capabilities: ["CAPABILITY_NAMED_IAM"],
    ChangeSetId: "arn:aws:cloudformation:ap-northeast-2:770880870480:changeSet/windows-handoff/example",
    Changes: [bucketPolicyChange, ...[
      ["WindowsSignedArtifactLocatorSealerRole", "AWS::IAM::Role"],
      ["WindowsSignedArtifactWrappingKey", "AWS::KMS::Key"],
      ["WindowsSignedArtifactUploaderRole", "AWS::IAM::Role"],
      ["WindowsSignedArtifactReaderRole", "AWS::IAM::Role"],
    ].map(([logicalId, type]) => add(logicalId, type))],
  };
  const input = {
    templateSha256,
    parametersSha256: "a".repeat(64),
    actualParametersSha256: "a".repeat(64),
    baselineState: "legacy-v1",
  };
  const review =
    validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet(
      changeSet,
      input,
    );
  assert.equal(review.verdict, "PASS");
  assert.equal(
    review.purpose,
    "windows-signed-artifact-handoff-infrastructure",
  );
  assert.equal(review.baseline_state, "legacy-v1");
  assert.equal(review.change_count, 5);
  assert.equal(review.add_count, 4);
  assert.equal(review.modify_count, 1);
  assert.equal(review.remove_count, 0);
  assert.equal(review.replacement_true_count, 0);
  assert.match(review.reviewed_change_set_sha256, /^[0-9a-f]{64}$/u);

  const v2ChangeSet = {
    ...changeSet,
    Changes: [
      bucketPolicyChange,
      add("WindowsSignedArtifactLocatorSealerRole", "AWS::IAM::Role"),
      modifyRole(
        "WindowsSignedArtifactReaderRole",
        "lawos-production-windows-signed-operator-reader",
      ),
      modifyRole(
        "WindowsSignedArtifactUploaderRole",
        "lawos-production-windows-signed-uploader",
      ),
    ],
  };
  const v2Review =
    validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet(
      v2ChangeSet,
      { ...input, baselineState: "windows-handoff-v2" },
    );
  assert.equal(v2Review.baseline_state, "windows-handoff-v2");
  assert.equal(v2Review.change_count, 4);
  assert.equal(v2Review.add_count, 1);
  assert.equal(v2Review.modify_count, 3);

  const v3ChangeSet = {
    ...changeSet,
    Changes: [
      modifyRole(
        "WindowsSignedArtifactLocatorSealerRole",
        "lawos-production-windows-update-locator-sealer",
      ),
      modifyRole(
        "WindowsSignedArtifactReaderRole",
        "lawos-production-windows-signed-operator-reader",
      ),
      modifyRole(
        "WindowsSignedArtifactUploaderRole",
        "lawos-production-windows-signed-uploader",
      ),
    ],
  };
  const v3Review =
    validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet(
      v3ChangeSet,
      { ...input, baselineState: "windows-handoff-v3" },
    );
  assert.equal(v3Review.baseline_state, "windows-handoff-v3");
  assert.equal(v3Review.change_count, 3);
  assert.equal(v3Review.add_count, 0);
  assert.equal(v3Review.modify_count, 3);

  const mutations = [
    (value) => { value.StackName = "lawos-production"; },
    (value) => { value.ChangeSetType = "CREATE"; },
    (value) => { value.Status = "FAILED"; },
    (value) => { value.ExecutionStatus = "OBSOLETE"; },
    (value) => { value.IncludeNestedStacks = true; },
    (value) => { value.Capabilities = ["CAPABILITY_IAM"]; },
    (value) => { value.Changes[0].ResourceChange.Action = "Add"; },
    (value) => { value.Changes[1].ResourceChange.Action = "Modify"; },
    (value) => { value.Changes[0].ResourceChange.Action = "Remove"; },
    (value) => { value.Changes[0].ResourceChange.Replacement = "True"; },
    (value) => { value.Changes[0].ResourceChange.Scope = []; },
    (value) => { delete value.Changes[0].ResourceChange.PhysicalResourceId; },
    (value) => {
      value.Changes[0].ResourceChange.ResourceType = "AWS::IAM::Policy";
    },
    (value) => {
      value.Changes.push({
        ResourceChange: {
          Action: "Modify",
          LogicalResourceId: "ArtifactKey",
          ResourceType: "AWS::KMS::Key",
          Replacement: "False",
          Scope: ["Properties"],
        },
      });
    },
    (value) => { value.Changes.pop(); },
  ];
  for (const mutate of mutations) {
    const drifted = structuredClone(changeSet);
    mutate(drifted);
    assert.throws(() =>
      validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet(
        drifted,
        input,
      ));
  }
  assert.throws(() =>
    validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet(
      changeSet,
      { ...input, templateSha256: "b".repeat(64) },
    ));
  assert.throws(() =>
    validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet(
      changeSet,
      { ...input, parametersSha256: "not-a-digest" },
    ));
  assert.throws(() =>
    validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet(
      changeSet,
      { ...input, actualParametersSha256: "b".repeat(64) },
    ));
  assert.throws(() =>
    validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet(
      changeSet,
      { ...input, baselineState: "windows-handoff-v4" },
    ));
});

test("production runner gates, resumes, and verifies the signed-Windows artifact-store update", () => {
  const source = readFileSync(
    "scripts/run-json-postgres-production-infrastructure.mjs",
    "utf8",
  );
  assert.match(source, /"update-artifact-store-windows-handoff"/u);
  assert.match(
    source,
    /deployedArtifactStoreWindowsHandoffTemplate\(\)/u,
  );
  assert.match(
    source,
    /deployment\.state === "windows-handoff-v4"/u,
  );
  assert.match(
    source,
    /assertArtifactStoreWindowsHandoffBaseline\(stack, deployment\)/u,
  );
  assert.match(
    source,
    /createWindowsHandoffArtifactStoreChangeSet\(\s*baseline\.parameters,\s*baseline\.baseline_state/u,
  );
  assert.match(
    source,
    /executeWindowsHandoffArtifactStoreChangeSet\(review\)/u,
  );
  assert.match(
    source,
    /assertArtifactStoreWindowsHandoffState\(\s*updated,\s*alreadyApplied \? deployment : undefined,\s*\)/u,
  );
  assert.match(source, /"s3api", "get-bucket-policy"/u);
  assert.match(source, /"s3api", "get-bucket-location"/u);
  assert.match(source, /"s3api", "get-bucket-ownership-controls"/u);
  assert.match(source, /"kms", "list-aliases"/u);
  assert.match(source, /"kms", "get-key-rotation-status"/u);
  assert.equal(
    source.match(/"kms", "get-key-policy"/gu)?.length,
    2,
  );
  assert.match(source, /live_policy_drift_count: 0/u);
  assert.match(source, /live_governance_readback_count: 11/u);
  assert.match(source, /WindowsSignedArtifactLocatorSealerRole/u);
  assert.match(source, /aggregate_sealer:/u);
  assert.match(
    source,
    /aggregate_sealer_repository_secret_names:\s*\[\s*"WINDOWS_UPDATE_LOCATOR_ARTIFACT_READ_TOKEN",\s*\]/u,
  );
  assert.doesNotMatch(
    source,
    /aggregate_sealer_protected_secret_names:\s*\[\s*"WINDOWS_UPDATE_LOCATOR_ARTIFACT_READ_TOKEN"/u,
  );
  assert.match(source, /WindowsSignedArtifactLocatorUnwrapKmsKeyArn/u);
  assert.match(source, /WindowsSignedArtifactUploaderJobWorkflowRef/u);
  assert.match(source, /WindowsSignedArtifactReaderJobWorkflowRef/u);
  assert.match(source, /WindowsSignedArtifactLocatorSealJobWorkflowRef/u);
  assert.match(source, /oidc_job_workflow_refs:/u);
  assert.match(
    source,
    /validateJsonPostgresProductionArtifactStoreWindowsHandoffChangeSet/u,
  );
  assert.match(
    source,
    /wrapping_public_key_ceremony:[\s\S]*performed: false/u,
  );
  assert.match(
    source,
    /WINDOWS_UPDATE_LOCATOR_SEAL_ROLE_ARN[\s\S]*WINDOWS_UPDATE_LOCATOR_WRAPPING_KMS_KEY_ARN/u,
  );
  assert.match(
    source,
    /WINDOWS_UPDATE_READER_ROLE_ARN[\s\S]*WINDOWS_UPDATE_LOCATOR_WRAPPING_KMS_KEY_ARN/u,
  );
  assert.match(
    source,
    /already_applied: alreadyApplied/u,
  );
  assert.match(
    source,
    /aws_mutation_count: alreadyApplied \? 0 : 2,[\s\S]*production_write_count: 0/u,
  );
});

test("production cost model reconciles below the existing KRW 300000 owner ceiling", () => {
  const cost = JSON.parse(readFileSync("infra/lawos-production/cost-estimate.json", "utf8"));
  const result = validateJsonPostgresProductionCost(cost);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.total_monthly_estimate_krw, 273600);
  assert.equal(result.owner_cap_headroom_krw, 26400);
});

test("W15 rollback tooling disables the worker schedule without an ENI or traffic change", () => {
  const source = readFileSync(
    "scripts/run-json-postgres-production-infrastructure.mjs",
    "utf8",
  );
  assert.match(source, /"w15-create-worker-disable-change-set"/u);
  assert.match(source, /"w15-execute-worker-disable-change-set"/u);
  assert.match(source, /purpose: "w15-incremental-worker-disable"/u);
  assert.match(source, /EnableProjectionWorker: "false"/u);
  assert.match(source, /rule\.State !== "DISABLED"/u);
  assert.match(
    source,
    /temporary_eni_allow_count: 0,[\s\S]*production_write_count: 0/u,
  );
  assert.match(
    source,
    /ProjectionWorkerEventJson: serializedWorkerEventLocator/u,
  );
  assert.match(
    source,
    /const W15_WORKER_TOGGLE_CHANGE_IDS = new Set\(\[[\s\S]*"ApiExecutionRole",[\s\S]*"ApiFunction",[\s\S]*"ProjectionWorkerSchedule",[\s\S]*"ProjectionWorkerInvokePermission",[\s\S]*"ProjectionWorkerDeadLetterQueuePolicy",[\s\S]*"SecretsManagerEndpoint",[\s\S]*\]\)/u,
  );
  assert.equal(
    source.match(
      /assertReviewedChangeSubset\(\s*review,\s*W15_WORKER_TOGGLE_CHANGE_IDS,/gu,
    )?.length,
    4,
  );
  assert.doesNotMatch(
    source,
    /ProjectionWorkerEventJson: JSON\.stringify\(workerEvent\)/u,
  );
  assert.match(source, /inputKind: "w15-worker-event"/u);
  assert.match(
    source,
    /Buffer\.byteLength\(serializedWorkerEventLocator\) > 640/u,
  );
  assert.match(
    source,
    /const apiEnvironmentSizeBytes = assertLambdaEnvironmentBudget\(apiEnvironment\)\.size_bytes/u,
  );
  assert.match(
    source,
    /delete apiEnvironment\.LAWOS_HRX_RELATIONAL_PROJECTION_MAPPING_OBJECT_KEY/u,
  );
  assert.match(
    source,
    /delete apiEnvironment\.LAWOS_HRX_RELATIONAL_PROJECTION_VALIDATION_OBJECT_KEY/u,
  );
});

test("W15 worker event validation uses the closed source packet", () => {
  const source = readFileSync(
    "scripts/run-json-postgres-production-infrastructure.mjs",
    "utf8",
  );
  assert.match(
    source,
    /validateJsonPostgresW15ProjectionEvent\(workerEvent, \{\s+packet: packetSource,\s+artifactSha256: packet\.bindings\.artifact_sha256,\s+\}\);/u,
  );
  assert.doesNotMatch(
    source,
    /validateJsonPostgresW15ProjectionEvent\(workerEvent, \{\s+packet,\s+/u,
  );
});

test("production runner gates internal updater activation on live private infrastructure", () => {
  const source = readFileSync(
    "scripts/run-json-postgres-production-infrastructure.mjs",
    "utf8",
  );
  for (const operation of [
    "create-internal-update-broker-change-set",
    "execute-internal-update-broker-change-set",
    "verify-internal-update-broker",
  ]) {
    assert.match(source, new RegExp(`"${operation}"`, "u"));
  }
  assert.match(source, /assertInternalUpdateDistributionState\(binding\)/u);
  assert.match(source, /assertInternalUpdateApiEnvironment\(binding\)/u);
  assert.match(source, /"secretsmanager", "describe-secret"/u);
  assert.doesNotMatch(source, /"secretsmanager", "get-secret-value"/u);
  assert.match(
    source,
    /internalUpdateBinding: binding/u,
  );
});

test("W15 inventory bootstrap closes the pre-schema audit cycle without direct secret access", () => {
  const runner = readFileSync(
    "scripts/run-json-postgres-production-infrastructure.mjs",
    "utf8",
  );
  const createBranch = runner.slice(
    runner.indexOf('} else if (operation === "w15-create-change-set"'),
    runner.indexOf('} else if (operation === "w15-execute-change-set"'),
  );
  assert.match(runner, /cloudFormationParameterJsonArgs\(parameters\)/u);
  assert.doesNotMatch(runner, /cloudFormationParameterArgs\(parameters\)/u);
  assert.match(createBranch, /const parameters = \{\s+\.\.\.current,/u);
  for (const field of ["Owner", "ReviewDate", "ExpirationDate"]) {
    assert.doesNotMatch(
      createBranch,
      new RegExp(`${field}: input\\.`, "u"),
    );
  }
  assert.match(
    runner,
    /"w15-bootstrap-create-change-set"\)[\s\S]{0,3000}EnableExternalReadProviders: "false",[\s\S]{0,300}ExternalReadProviderPackSecretName:\s*JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,[\s\S]{0,300}ExternalReadProviderPackSha256:\s*JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256/u,
  );
  assert.match(
    runner,
    /w15BootstrapOperation[\s\S]{0,120}current\.EnableProjectionWorker !== "false"[\s\S]{0,180}cannot disable an active projection worker/u,
  );
  assert.match(
    runner,
    /sourceIsAncestor: gitIsAncestor\(sourceSha, originMainSha\)/u,
  );
  assert.doesNotMatch(
    runner,
    /sourceIsAncestor: isAncestor\(sourceSha, originMainSha\)/u,
  );
  for (const operation of [
    "w15-bootstrap-preflight",
    "w15-bootstrap-upload-artifact",
    "w15-bootstrap-create-change-set",
    "w15-bootstrap-execute-change-set",
    "w15-bootstrap-remove-eni-bootstrap",
    "w15-bootstrap-verify",
    "w15-bootstrap-invoke",
  ]) {
    assert.match(runner, new RegExp(`"${operation}"`, "u"));
  }
  assert.match(
    runner,
    /response\.safe_counts\?\.projection_data_write_count !== 0/u,
  );
  assert.match(
    runner,
    /response\.claims\?\.consumer_rollout_performed !== false/u,
  );

  const collector = readFileSync(
    "scripts/collect-json-postgres-w15-production-inventory.mjs",
    "utf8",
  );
  assert.doesNotMatch(collector, /get-secret-value/u);
  assert.doesNotMatch(collector, /createPostgresPool/u);
  assert.doesNotMatch(collector, /matter-readonly-auditor/u);
  assert.match(collector, /--invocation-response/u);
  assert.match(collector, /inventory_provenance_sha256/u);
});
