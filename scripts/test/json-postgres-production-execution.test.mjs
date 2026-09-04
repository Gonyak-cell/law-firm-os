import assert from "node:assert/strict";
import test from "node:test";
import {
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
  JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
} from "../lib/json-postgres-production-infrastructure.mjs";
import {
  JSON_POSTGRES_PRODUCTION_ACCOUNT,
  JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK,
  JSON_POSTGRES_PRODUCTION_STACK,
  JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY,
  JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY,
  assertJsonPostgresArtifactBucketState,
  assertJsonPostgresArtifactStoreBinding,
  assertJsonPostgresProductionCaller,
  assertJsonPostgresProductionStack,
  buildJsonPostgresArtifactStoreParameters,
  buildJsonPostgresProductionStackParameters,
  createJsonPostgresProductionWorkerEventLocator,
  jsonPostgresProductionCombinedTemplateSha256,
  jsonPostgresProductionParametersSha256,
  validateJsonPostgresProductionChangeSet,
  validateJsonPostgresW15ProductionChangeSet,
  validateJsonPostgresW15WorkerObservability,
} from "../lib/json-postgres-production-execution.mjs";

function packet() {
  return {
    source_sha: "a".repeat(40),
    source_tree: "b".repeat(40),
    packet_sha256: "c".repeat(64),
    bindings: {
      artifact_sha256: "d".repeat(64),
    },
    target: {
      artifact_bucket_name: "lawos-prod-artifacts-770880870480",
      artifact_kms_key_ref: "alias/lawos-production-artifacts",
      program_input_bucket_name: "lawos-prod-program-input-770880870480",
      program_input_expected_bucket_owner:
        JSON_POSTGRES_PRODUCTION_ACCOUNT,
      dms_bucket_name: "lawos-prod-dms-770880870480",
      approved_tenant_ids: ["tenant-approved"],
    },
  };
}

function disabledExternalReadParameters() {
  return [
    { ParameterKey: "EnableExternalReadProviders", ParameterValue: "false" },
    {
      ParameterKey: "ExternalReadProviderPackSecretName",
      ParameterValue: JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
    },
    {
      ParameterKey: "ExternalReadProviderPackSha256",
      ParameterValue: JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
    },
  ];
}

test("production caller must use the exact role chain", () => {
  assert.equal(assertJsonPostgresProductionCaller({
    Account: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    Arn: `arn:aws:sts::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:assumed-role/matter-prod-deploy-admin/codex`,
  }).role, "matter-prod-deploy-admin");
  assert.equal(assertJsonPostgresProductionCaller({
    Account: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    Arn: `arn:aws:sts::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:assumed-role/matter-cutover-operator/codex`,
  }, { role: "matter-cutover-operator" }).role, "matter-cutover-operator");
  assert.throws(() => assertJsonPostgresProductionCaller({
    Account: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    Arn: `arn:aws:iam::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:role/AdministratorAccess`,
  }), /exact assumed role/u);
  assert.throws(() => assertJsonPostgresProductionCaller({
    Account: JSON_POSTGRES_PRODUCTION_ACCOUNT,
    Arn: `arn:aws:sts::${JSON_POSTGRES_PRODUCTION_ACCOUNT}:assumed-role/matter-prod-deploy-admin/codex`,
  }, { role: "matter-cutover-operator" }), /matter-cutover-operator/u);
});

test("production stack parameters preserve exact packet, tenant, traffic and ENI boundaries", () => {
  const value = packet();
  assert.deepEqual(buildJsonPostgresArtifactStoreParameters({
    packet: value,
    owner: "lawos-owner",
    reviewDate: "2026-07-23",
  }), {
    ArtifactBucketName: "lawos-prod-artifacts-770880870480",
    SourceSha: "a".repeat(40),
    SourceTree: "b".repeat(40),
    ExecutionPacketSha256: "c".repeat(64),
    Owner: "lawos-owner",
    ReviewDate: "2026-07-23",
  });
  const parameters = buildJsonPostgresProductionStackParameters({
    packet: value,
    artifactVersion: "version-1",
    trustRegistrySha256: "e".repeat(64),
    approvalId: "approval-1",
    owner: "lawos-owner",
    reviewDate: "2026-07-23",
    expirationDate: "2027-07-23",
    allowedOrigins: ["https://lawos.example"],
    passwordResetSesIdentityArn: "arn:aws:ses:ap-northeast-2:770880870480:identity/lawos.example",
    passwordResetFromEmail: "no-reply@lawos.example",
    primaryTenantId: "tenant-approved",
    runtimeGeneration: 1,
    enableLambdaEniBootstrap: true,
  });
  assert.equal(parameters.EnableProductionTraffic, "false");
  assert.equal(parameters.EnableLambdaEniBootstrap, "true");
  assert.equal(parameters.EnableExternalReadProviders, "false");
  assert.equal(
    parameters.ExternalReadProviderPackSecretName,
    JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
  );
  assert.equal(
    parameters.ExternalReadProviderPackSha256,
    JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
  );
  assert.equal(parameters.EnableProjectionWorker, "false");
  assert.equal(parameters.ProjectionWorkerEventJson, "{}");
  assert.equal(
    parameters.HrxProjectionMappingObjectKey,
    JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY,
  );
  assert.equal(
    parameters.HrxProjectionValidationObjectKey,
    JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY,
  );
  assert.equal(parameters.ProjectionWorkerLagThresholdMs, "24");
  assert.equal(parameters.MonthlyCostCeilingKrw, "300000");
  assert.throws(() => buildJsonPostgresProductionStackParameters({
    ...parameters,
    packet: value,
    primaryTenantId: "tenant-unapproved",
  }), /primary tenant/u);
});

test("W15 worker event uses a compact exact immutable program-input locator", () => {
  const value = packet();
  value.target.program_input_expected_bucket_owner =
    JSON_POSTGRES_PRODUCTION_ACCOUNT;
  const digest = "f".repeat(64);
  const key =
    `program-input/${value.packet_sha256}/w15-worker-event/`
    + `${value.source_sha}/${digest}.json`;
  const locator = createJsonPostgresProductionWorkerEventLocator({
    packet: value,
    key,
    versionId: "worker-event-version-001",
    sha256: digest,
    byteSize: 8234,
  });
  assert.equal(locator.key, key);
  assert.equal(locator.byte_size, 8234);
  assert.ok(Buffer.byteLength(JSON.stringify(locator)) < 4096);
  for (const overrides of [
    { key: `program-input/${value.packet_sha256}/other/${digest}.json` },
    { versionId: "null" },
    { sha256: "not-a-digest" },
    { byteSize: 0 },
  ]) {
    assert.throws(
      () => createJsonPostgresProductionWorkerEventLocator({
        packet: value,
        key,
        versionId: "worker-event-version-001",
        sha256: digest,
        byteSize: 8234,
        ...overrides,
      }),
      /worker event locator/u,
    );
  }
});

test("production change-set review rejects removals and unsafe replacements", () => {
  const template = { Resources: { ApiFunction: {}, Database: {} } };
  const base = {
    StackName: JSON_POSTGRES_PRODUCTION_STACK,
    ChangeSetId: "change-set-1",
    Changes: [
      { ResourceChange: { Action: "Add", LogicalResourceId: "ApiFunction", ResourceType: "AWS::Lambda::Function", Replacement: "False" } },
      { ResourceChange: { Action: "Add", LogicalResourceId: "Database", ResourceType: "AWS::RDS::DBInstance", Replacement: "False" } },
    ],
  };
  const result = validateJsonPostgresProductionChangeSet(base, {
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    changeSetType: "CREATE",
    template,
    parametersSha256: "a".repeat(64),
    templateSha256: "b".repeat(64),
  });
  assert.equal(result.change_count, 2);
  assert.throws(() => validateJsonPostgresProductionChangeSet({
    ...base,
    ChangeSetType: "UPDATE",
  }, {
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    changeSetType: "CREATE",
    template,
    parametersSha256: "a".repeat(64),
    templateSha256: "b".repeat(64),
  }), /binding is invalid/u);
  const unsafe = structuredClone(base);
  unsafe.ChangeSetType = "UPDATE";
  unsafe.Changes[0].ResourceChange.Action = "Remove";
  assert.throws(() => validateJsonPostgresProductionChangeSet(unsafe, {
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    changeSetType: "UPDATE",
    template,
    parametersSha256: "a".repeat(64),
    templateSha256: "b".repeat(64),
  }), /may not add or remove/u);
  const replacement = structuredClone(base);
  replacement.Changes[1].ResourceChange.Replacement = "True";
  assert.throws(() => validateJsonPostgresProductionChangeSet(replacement, {
    stackName: JSON_POSTGRES_PRODUCTION_STACK,
    changeSetType: "CREATE",
    template,
    parametersSha256: "a".repeat(64),
    templateSha256: "b".repeat(64),
  }), /unapproved replacement/u);
  const versionedTemplateUrl =
    "https://lawos-production-artifacts-770880870480"
    + ".s3.ap-northeast-2.amazonaws.com/cloudformation-template/exact.json"
    + "?versionId=version-1";
  const versionBound = { ...base };
  assert.equal(
    validateJsonPostgresProductionChangeSet(versionBound, {
      stackName: JSON_POSTGRES_PRODUCTION_STACK,
      changeSetType: "CREATE",
      template,
      parametersSha256: "a".repeat(64),
      templateSha256: "b".repeat(64),
      templateUrl: versionedTemplateUrl,
    }).template_url,
    versionedTemplateUrl,
  );
  assert.throws(
    () => validateJsonPostgresProductionChangeSet(versionBound, {
      stackName: JSON_POSTGRES_PRODUCTION_STACK,
      changeSetType: "CREATE",
      template,
      parametersSha256: "a".repeat(64),
      templateSha256: "b".repeat(64),
      templateUrl: versionedTemplateUrl.split("?")[0],
    }),
    /binding is invalid/u,
  );
  assert.equal(JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK, "lawos-production-artifact-store");
});

test("W15 update review permits only bounded projection additions and exact supporting modifications", () => {
  const template = {
    Resources: {
      ApiFunction: {},
      ProjectionWorkerExecutionRole: {},
      ProjectionWorkerDeadLetterAlarm: {},
      ProjectionWorkerDeadLetterQueue: {},
      ProjectionWorkerDeadLetterQueuePolicy: {},
      ProjectionWorkerDeliveryFailureAlarm: {},
      ProjectionWorkerErrorAlarm: {},
      ProjectionWorkerEventInvokeConfig: {},
      ProjectionWorkerFunction: {},
      ProjectionWorkerSchedule: {},
      ProjectionWorkerInvokePermission: {},
      ProjectionWorkerLagAlarm: {},
      ExternalReadSecretsPolicy: {},
      Database: {},
    },
  };
  const changeSet = {
    StackName: JSON_POSTGRES_PRODUCTION_STACK,
    ChangeSetType: "UPDATE",
    ChangeSetId: "w15-change-set-1",
    Parameters: disabledExternalReadParameters(),
    Changes: [
      {
        ResourceChange: {
          Action: "Modify",
          LogicalResourceId: "ApiFunction",
          ResourceType: "AWS::Lambda::Function",
          Replacement: "False",
        },
      },
      ...[
        ["ExternalReadSecretsPolicy", "AWS::IAM::Policy", "False"],
        ["ProjectionWorkerExecutionRole", "AWS::IAM::Role", "False"],
        ["ProjectionWorkerDeadLetterAlarm", "AWS::CloudWatch::Alarm", "False"],
        ["ProjectionWorkerDeadLetterQueue", "AWS::SQS::Queue", "False"],
        [
          "ProjectionWorkerDeadLetterQueuePolicy",
          "AWS::SQS::QueuePolicy",
          "False",
        ],
        [
          "ProjectionWorkerDeliveryFailureAlarm",
          "AWS::CloudWatch::Alarm",
          "False",
        ],
        ["ProjectionWorkerErrorAlarm", "AWS::CloudWatch::Alarm", "False"],
        [
          "ProjectionWorkerEventInvokeConfig",
          "AWS::Lambda::EventInvokeConfig",
          "False",
        ],
        ["ProjectionWorkerFunction", "AWS::Lambda::Function", "False"],
        ["ProjectionWorkerLagAlarm", "AWS::CloudWatch::Alarm", "False"],
        ["ProjectionWorkerSchedule", "AWS::Events::Rule", "Conditional"],
        [
          "ProjectionWorkerInvokePermission",
          "AWS::Lambda::Permission",
          "Conditional",
        ],
      ].map(([LogicalResourceId, ResourceType, Replacement]) => ({
        ResourceChange: {
          Action: "Add",
          LogicalResourceId,
          ResourceType,
          Replacement,
        },
      })),
    ],
  };
  const reviewed = validateJsonPostgresW15ProductionChangeSet(changeSet, {
    template,
    parametersSha256: "a".repeat(64),
    templateSha256: "b".repeat(64),
  });
  assert.equal(reviewed.add_count, 12);
  assert.equal(reviewed.modify_count, 1);
  assert.equal(reviewed.external_read_providers_enabled, false);
  const database = structuredClone(changeSet);
  database.Changes.push({
    ResourceChange: {
      Action: "Modify",
      LogicalResourceId: "Database",
      ResourceType: "AWS::RDS::DBInstance",
      Replacement: "False",
    },
  });
  assert.throws(
    () => validateJsonPostgresW15ProductionChangeSet(database, {
      template,
      parametersSha256: "a".repeat(64),
      templateSha256: "b".repeat(64),
    }),
    /unapproved resource change/u,
  );
  const enabled = structuredClone(changeSet);
  enabled.Parameters.find((entry) =>
    entry.ParameterKey === "EnableExternalReadProviders").ParameterValue =
      "true";
  assert.throws(
    () => validateJsonPostgresW15ProductionChangeSet(enabled, {
      template,
      parametersSha256: "a".repeat(64),
      templateSha256: "b".repeat(64),
    }),
    /must keep external providers disabled/u,
  );
  const absent = structuredClone(changeSet);
  absent.Parameters = [];
  assert.throws(
    () => validateJsonPostgresW15ProductionChangeSet(absent, {
      template,
      parametersSha256: "a".repeat(64),
      templateSha256: "b".repeat(64),
    }),
    /provider parameters are ambiguous/u,
  );
  const inherited = structuredClone(changeSet);
  const inheritedFlag = inherited.Parameters.find((entry) =>
    entry.ParameterKey === "EnableExternalReadProviders");
  delete inheritedFlag.ParameterValue;
  inheritedFlag.UsePreviousValue = true;
  assert.throws(
    () => validateJsonPostgresW15ProductionChangeSet(inherited, {
      template,
      parametersSha256: "a".repeat(64),
      templateSha256: "b".repeat(64),
    }),
    /provider parameters are ambiguous/u,
  );
  const replacement = structuredClone(changeSet);
  replacement.Changes[1].ResourceChange.Replacement = "True";
  assert.throws(
    () => validateJsonPostgresW15ProductionChangeSet(replacement, {
      template,
      parametersSha256: "a".repeat(64),
      templateSha256: "b".repeat(64),
    }),
    /unapproved resource change/u,
  );
});

test("W15 worker observability binds delivery and execution retries to one empty encrypted DLQ", () => {
  const ruleArn =
    "arn:aws:events:ap-northeast-2:770880870480:"
    + "rule/lawos-production-projection-worker";
  const functionArn =
    "arn:aws:lambda:ap-northeast-2:770880870480:"
    + "function:lawos-production-projection-worker";
  const queueArn =
    "arn:aws:sqs:ap-northeast-2:770880870480:"
    + "lawos-production-projection-worker-dead-letter";
  const queueUrl =
    "https://sqs.ap-northeast-2.amazonaws.com/770880870480/"
    + "lawos-production-projection-worker-dead-letter";
  const observation = {
    rule: {
      Name: "lawos-production-projection-worker",
      Arn: ruleArn,
    },
    targets: {
      Targets: [{
        Id: "lawos-production-projection-worker",
        Arn: functionArn,
        RetryPolicy: {
          MaximumEventAgeInSeconds: 900,
          MaximumRetryAttempts: 2,
        },
        DeadLetterConfig: { Arn: queueArn },
      }],
    },
    invokeConfig: {
      FunctionArn: `${functionArn}:$LATEST`,
      MaximumEventAgeInSeconds: 900,
      MaximumRetryAttempts: 2,
      DestinationConfig: {
        OnFailure: { Destination: queueArn },
      },
    },
    queueUrl,
    queueAttributes: {
      Attributes: {
        QueueArn: queueArn,
        SqsManagedSseEnabled: "true",
        MessageRetentionPeriod: "1209600",
        ApproximateNumberOfMessages: "0",
        ApproximateNumberOfMessagesNotVisible: "0",
        Policy: JSON.stringify({
          Statement: [{
            Sid: "AllowExactProjectionWorkerScheduleDeliveryFailures",
            Effect: "Allow",
            Principal: { Service: "events.amazonaws.com" },
            Action: "sqs:SendMessage",
            Resource: queueArn,
            Condition: {
              ArnEquals: { "aws:SourceArn": ruleArn },
              StringEquals: {
                "aws:SourceAccount": JSON_POSTGRES_PRODUCTION_ACCOUNT,
              },
            },
          }],
        }),
      },
    },
    alarms: {
      MetricAlarms: [
        {
          AlarmName: "lawos-production-projection-worker-errors",
          Namespace: "AWS/Lambda",
          MetricName: "Errors",
          Threshold: 1,
          Dimensions: [{
            Name: "FunctionName",
            Value: "lawos-production-projection-worker",
          }],
          StateValue: "OK",
        },
        {
          AlarmName:
            "lawos-production-projection-worker-delivery-failures",
          Namespace: "AWS/Events",
          MetricName: "FailedInvocations",
          Threshold: 1,
          Dimensions: [{
            Name: "RuleName",
            Value: "lawos-production-projection-worker",
          }],
          StateValue: "INSUFFICIENT_DATA",
        },
        {
          AlarmName: "lawos-production-projection-worker-dead-letter",
          Namespace: "AWS/SQS",
          MetricName: "ApproximateNumberOfMessagesVisible",
          Threshold: 1,
          Dimensions: [{
            Name: "QueueName",
            Value: "lawos-production-projection-worker-dead-letter",
          }],
          StateValue: "OK",
        },
        {
          AlarmName: "lawos-production-projection-worker-lag",
          Namespace: "LawOS/W15",
          MetricName: "OutboxLagMilliseconds",
          Threshold: 24,
          Dimensions: [{
            Name: "Worker",
            Value: "relational-projection",
          }],
          StateValue: "OK",
        },
      ],
    },
  };
  assert.equal(
    validateJsonPostgresW15WorkerObservability(observation).verdict,
    "PASS",
  );
  const unsafeQueue = structuredClone(observation);
  unsafeQueue.queueAttributes.Attributes.Policy = JSON.stringify({
    Statement: [{
      ...JSON.parse(observation.queueAttributes.Attributes.Policy)
        .Statement[0],
      Principal: "*",
    }],
  });
  assert.throws(
    () => validateJsonPostgresW15WorkerObservability(unsafeQueue),
    /retry or dead-letter runtime drifted/u,
  );
  const alarmed = structuredClone(observation);
  alarmed.alarms.MetricAlarms[0].StateValue = "ALARM";
  assert.throws(
    () => validateJsonPostgresW15WorkerObservability(alarmed),
    /alarm state or contract drifted/u,
  );
});

test("artifact bucket and production stack observations are exact and fail closed", () => {
  const value = packet();
  const keyArn = "arn:aws:kms:ap-northeast-2:770880870480:key/key-1";
  const exactStoreOutputs = {
    ArtifactBucketName: value.target.artifact_bucket_name,
    ArtifactKmsKeyArn: keyArn,
    SourceSha: value.source_sha,
    SourceTree: value.source_tree,
    ExecutionPacketSha256: value.packet_sha256,
  };
  assert.equal(assertJsonPostgresArtifactStoreBinding({
    packet: value,
    outputs: exactStoreOutputs,
    sourceTreeMatches: true,
  }).exact_packet_binding, true);
  const ancestorStoreOutputs = {
    ...exactStoreOutputs,
    SourceSha: "e".repeat(40),
    SourceTree: "f".repeat(40),
    ExecutionPacketSha256: "1".repeat(64),
  };
  assert.equal(assertJsonPostgresArtifactStoreBinding({
    packet: value,
    outputs: ancestorStoreOutputs,
    sourceIsAncestor: true,
    sourceTreeMatches: true,
  }).reused_ancestor_store, true);
  assert.throws(() => assertJsonPostgresArtifactStoreBinding({
    packet: value,
    outputs: ancestorStoreOutputs,
    sourceIsAncestor: false,
    sourceTreeMatches: true,
  }), /binding drifted/u);
  assert.throws(() => assertJsonPostgresArtifactStoreBinding({
    packet: value,
    outputs: { ...exactStoreOutputs, ExecutionPacketSha256: "2".repeat(64) },
    sourceIsAncestor: true,
    sourceTreeMatches: true,
  }), /binding drifted/u);
  assert.equal(assertJsonPostgresArtifactBucketState({
    packet: value,
    expectedKmsKeyArn: keyArn,
    versioning: { Status: "Enabled" },
    publicAccess: { PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    } },
    objectLock: { ObjectLockConfiguration: {
      ObjectLockEnabled: "Enabled",
      Rule: { DefaultRetention: { Mode: "COMPLIANCE", Days: 365 } },
    } },
    encryption: { ServerSideEncryptionConfiguration: {
      Rules: [{
        ApplyServerSideEncryptionByDefault: {
          SSEAlgorithm: "aws:kms",
          KMSMasterKeyID: keyArn,
        },
      }],
    } },
  }).verdict, "PASS");
  const stack = {
    StackStatus: "CREATE_COMPLETE",
    Parameters: Object.entries({
      SourceSha: value.source_sha,
      SourceTree: value.source_tree,
      ArtifactSha256: value.bindings.artifact_sha256,
      ArtifactVersion: "v1",
      OwnerTrustRegistrySha256: "e".repeat(64),
      ExecutionPacketSha256: value.packet_sha256,
      ProgramInputBucketName: value.target.program_input_bucket_name,
      DmsBucketName: value.target.dms_bucket_name,
      EnableProductionTraffic: "false",
      EnableLambdaEniBootstrap: "false",
      EnableExternalReadProviders: "false",
      ExternalReadProviderPackSecretName:
        JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SECRET_NAME,
      ExternalReadProviderPackSha256:
        JSON_POSTGRES_EXTERNAL_READ_DISABLED_PACK_SHA256,
      EnableProjectionWorker: "false",
      ProjectionWorkerEventJson: "{}",
      HrxProjectionMappingObjectKey:
        JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY,
      HrxProjectionValidationObjectKey:
        JSON_POSTGRES_DISABLED_HRX_VALIDATION_OBJECT_KEY,
      ProjectionWorkerLagThresholdMs: "24",
      MonthlyCostCeilingKrw: "300000",
    }).map(([ParameterKey, ParameterValue]) => ({ ParameterKey, ParameterValue })),
    Outputs: [{
      OutputKey: "ExternalReadProvidersEnabled",
      OutputValue: "false",
    }],
  };
  assert.equal(assertJsonPostgresProductionStack(stack, {
    packet: value,
    artifactVersion: "v1",
    trustRegistrySha256: "e".repeat(64),
  }).temporary_eni_allow_expected, 0);
  const providerEnabledStack = structuredClone(stack);
  providerEnabledStack.Outputs[0].OutputValue = "true";
  assert.throws(
    () => assertJsonPostgresProductionStack(providerEnabledStack, {
      packet: value,
      artifactVersion: "v1",
      trustRegistrySha256: "e".repeat(64),
    }),
    /external provider output drifted/u,
  );
  const trafficStack = structuredClone(stack);
  trafficStack.Parameters.find((entry) =>
    entry.ParameterKey === "EnableProductionTraffic").ParameterValue = "true";
  const goLive = assertJsonPostgresProductionStack(trafficStack, {
    packet: value,
    artifactVersion: "v1",
    trustRegistrySha256: "e".repeat(64),
    trafficEnabled: true,
  });
  assert.equal(goLive.traffic_enabled, true);
  assert.equal(goLive.temporary_eni_allow_expected, 0);
  const workerStack = structuredClone(trafficStack);
  const workerParameters = Object.fromEntries(
    workerStack.Parameters.map((entry) => [
      entry.ParameterKey,
      entry,
    ]),
  );
  workerParameters.EnableProjectionWorker.ParameterValue = "true";
  const workerEventSha256 = "9".repeat(64);
  workerParameters.ProjectionWorkerEventJson.ParameterValue =
    JSON.stringify({
      schema_version:
        "law-firm-os.immutable-program-input-locator.v1",
      bucket: value.target.program_input_bucket_name,
      key:
        `program-input/${value.packet_sha256}/w15-worker-event/`
        + `${value.source_sha}/${workerEventSha256}.json`,
      version_id: "worker-event-version-1",
      expected_bucket_owner:
        value.target.program_input_expected_bucket_owner,
      sha256: workerEventSha256,
      byte_size: 512,
    });
  workerParameters.HrxProjectionMappingObjectKey.ParameterValue =
    "program-input/exact/mapping.json";
  workerParameters.HrxProjectionValidationObjectKey.ParameterValue =
    "program-input/exact/validation.json";
  assert.equal(assertJsonPostgresProductionStack(workerStack, {
    packet: value,
    artifactVersion: "v1",
    trustRegistrySha256: "e".repeat(64),
    trafficEnabled: true,
    projectionWorkerEnabled: true,
  }).traffic_enabled, true);
  workerParameters.HrxProjectionMappingObjectKey.ParameterValue =
    JSON_POSTGRES_DISABLED_HRX_MAPPING_OBJECT_KEY;
  assert.throws(
    () => assertJsonPostgresProductionStack(workerStack, {
      packet: value,
      artifactVersion: "v1",
      trustRegistrySha256: "e".repeat(64),
      trafficEnabled: true,
      projectionWorkerEnabled: true,
    }),
    /projection runtime input binding drifted/u,
  );
});

test("combined template and parameter digests are deterministic", () => {
  assert.equal(
    jsonPostgresProductionCombinedTemplateSha256({
      artifactStoreTemplate: { b: 2 },
      productionTemplate: { a: 1 },
    }),
    jsonPostgresProductionCombinedTemplateSha256({
      productionTemplate: { a: 1 },
      artifactStoreTemplate: { b: 2 },
    }),
  );
  assert.equal(
    jsonPostgresProductionParametersSha256({ b: 2, a: 1 }),
    jsonPostgresProductionParametersSha256({ a: 1, b: 2 }),
  );
});
