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
