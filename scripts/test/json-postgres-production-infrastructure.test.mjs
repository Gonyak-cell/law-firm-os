import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJsonPostgresProductionArtifactStoreTemplate,
  buildJsonPostgresProductionTemplate,
  validateJsonPostgresProductionArtifactStoreTemplate,
  validateJsonPostgresProductionCost,
  validateJsonPostgresProductionTemplate,
} from "../lib/json-postgres-production-infrastructure.mjs";

const reference = JSON.parse(readFileSync("infra/lawos-private-staging/template.json", "utf8"));

test("production template derives the proven private topology without synthetic or public authority", () => {
  const template = buildJsonPostgresProductionTemplate(reference);
  const result = validateJsonPostgresProductionTemplate(template);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.private_subnet_count, 4);
  assert.equal(result.multi_az_rds_count, 1);
  assert.equal(result.object_lock_bucket_count, 2);
  assert.equal(result.production_traffic_enabled_by_default, false);
  assert.match(result.template_sha256, /^[0-9a-f]{64}$/u);
  assert.deepEqual(template.Parameters.RuntimeGeneration, {
    Type: "Number",
    Default: 1,
    MinValue: 1,
  });
  assert.ok(template.Resources.ProductionKey);
  assert.ok(template.Resources.ProductionKeyAlias);
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
  assert.equal(result.resource_count, 4);
  assert.equal(result.object_lock_bucket_count, 1);
  assert.equal(result.public_resource_count, 0);
  assert.equal(result.deletion_deny_count, 1);
  const unsafe = structuredClone(template);
  unsafe.Resources.ArtifactBucket.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy = false;
  assert.throws(
    () => validateJsonPostgresProductionArtifactStoreTemplate(unsafe),
    /governance drifted/u,
  );
});

test("production cost model reconciles below the existing KRW 300000 owner ceiling", () => {
  const cost = JSON.parse(readFileSync("infra/lawos-production/cost-estimate.json", "utf8"));
  const result = validateJsonPostgresProductionCost(cost);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.total_monthly_estimate_krw, 269100);
  assert.equal(result.owner_cap_headroom_krw, 30900);
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
    /const W15_WORKER_TOGGLE_CHANGE_IDS = new Set\(\[\s*"ProjectionWorkerSchedule",\s*"ProjectionWorkerInvokePermission",\s*"ProjectionWorkerDeadLetterQueuePolicy",\s*\]\)/u,
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
});

test("W15 inventory bootstrap closes the pre-schema audit cycle without direct secret access", () => {
  const runner = readFileSync(
    "scripts/run-json-postgres-production-infrastructure.mjs",
    "utf8",
  );
  assert.match(runner, /cloudFormationParameterJsonArgs\(parameters\)/u);
  assert.doesNotMatch(runner, /cloudFormationParameterArgs\(parameters\)/u);
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
