import assert from "node:assert/strict";
import test from "node:test";
import {
  JSON_POSTGRES_PRODUCTION_ACCOUNT,
  JSON_POSTGRES_PRODUCTION_ARTIFACT_STACK,
  JSON_POSTGRES_PRODUCTION_STACK,
  assertJsonPostgresArtifactBucketState,
  assertJsonPostgresProductionCaller,
  assertJsonPostgresProductionStack,
  buildJsonPostgresArtifactStoreParameters,
  buildJsonPostgresProductionStackParameters,
  jsonPostgresProductionCombinedTemplateSha256,
  jsonPostgresProductionParametersSha256,
  validateJsonPostgresProductionChangeSet,
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
      dms_bucket_name: "lawos-prod-dms-770880870480",
      approved_tenant_ids: ["tenant-approved"],
    },
  };
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
  assert.equal(parameters.MonthlyCostCeilingKrw, "300000");
  assert.throws(() => buildJsonPostgresProductionStackParameters({
    ...parameters,
    packet: value,
    primaryTenantId: "tenant-unapproved",
  }), /primary tenant/u);
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

test("artifact bucket and production stack observations are exact and fail closed", () => {
  const value = packet();
  const keyArn = "arn:aws:kms:ap-northeast-2:770880870480:key/key-1";
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
    encryption: { ServerSideEncryptionConfiguration: [{
      ApplyServerSideEncryptionByDefault: {
        SSEAlgorithm: "aws:kms",
        KMSMasterKeyID: keyArn,
      },
    }] },
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
      MonthlyCostCeilingKrw: "300000",
    }).map(([ParameterKey, ParameterValue]) => ({ ParameterKey, ParameterValue })),
  };
  assert.equal(assertJsonPostgresProductionStack(stack, {
    packet: value,
    artifactVersion: "v1",
    trustRegistrySha256: "e".repeat(64),
  }).temporary_eni_allow_expected, 0);
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
