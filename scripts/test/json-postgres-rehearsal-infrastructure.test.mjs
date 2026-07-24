import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
import {
  JSON_POSTGRES_REHEARSAL_ENI_ACTIONS,
  buildJsonPostgresRehearsalArtifactStoreTemplate,
  buildJsonPostgresRehearsalStackParameters,
  buildJsonPostgresRehearsalTemplate,
  classifyJsonPostgresRehearsalHostTemplate,
  validateJsonPostgresRehearsalArtifactStoreTemplate,
  validateJsonPostgresRehearsalTemplate,
} from "../lib/json-postgres-rehearsal-infrastructure.mjs";

const reference = JSON.parse(
  readFileSync("infra/lawos-private-staging/template.json", "utf8"),
);

function builtTemplate() {
  return buildJsonPostgresRehearsalTemplate(reference);
}

test("W12 host classification permits only the exact legacy tenant-key rename", () => {
  const legacy = structuredClone(reference);
  const variables =
    legacy.Resources.ApiFunction.Properties.Environment.Variables;
  variables.LAWOS_PASSWORD_RESET_TENANT_ID =
    variables.LAWOS_IDENTITY_TENANT_ID;
  delete variables.LAWOS_IDENTITY_TENANT_ID;
  const classified = classifyJsonPostgresRehearsalHostTemplate({
    deployedTemplate: legacy,
    localBaseTemplate: reference,
    rehearsalTemplate: builtTemplate(),
    hasW12: false,
  });
  assert.equal(
    classified.legacy_identity_tenant_rebind_required,
    true,
  );

  const drifted = structuredClone(legacy);
  drifted.Resources.ApiFunction.Properties.Timeout = 29;
  assert.throws(
    () => classifyJsonPostgresRehearsalHostTemplate({
      deployedTemplate: drifted,
      localBaseTemplate: reference,
      rehearsalTemplate: builtTemplate(),
      hasW12: false,
    }),
    /template drifted/u,
  );
});

test("W12 host classification accepts only the exact retained-resource import checkpoint", () => {
  const imported = structuredClone(reference);
  const rehearsal = builtTemplate();
  for (const key of [
    "W12ProgramInputBucketName",
    "W12DmsBucketName",
  ]) {
    imported.Parameters[key] = structuredClone(rehearsal.Parameters[key]);
  }
  for (const key of [
    "RehearsalAdminLogGroup",
    "RehearsalProgramInputBucket",
    "RehearsalDmsBucket",
    "RehearsalApplicationDatabaseSecret",
    "RehearsalTenantContextSecret",
  ]) {
    imported.Resources[key] = structuredClone(rehearsal.Resources[key]);
  }
  const classified = classifyJsonPostgresRehearsalHostTemplate({
    deployedTemplate: imported,
    localBaseTemplate: reference,
    rehearsalTemplate: rehearsal,
    hasW12: false,
  });
  assert.equal(classified.retained_resource_imported, true);

  imported.Resources.RehearsalDmsBucket.Properties
    .PublicAccessBlockConfiguration.BlockPublicPolicy = false;
  assert.throws(() => classifyJsonPostgresRehearsalHostTemplate({
    deployedTemplate: imported,
    localBaseTemplate: reference,
    rehearsalTemplate: rehearsal,
    hasW12: false,
  }), /retained private rehearsal resource drifted/u);
});

test("W12 rehearsal reuses the private staging topology with an isolated database role and immutable input bucket", () => {
  const template = builtTemplate();
  const result = validateJsonPostgresRehearsalTemplate(template);

  assert.equal(result.verdict, "PASS");
  assert.equal(result.new_vpc_count, 0);
  assert.equal(result.new_rds_instance_count, 0);
  assert.equal(result.isolated_database_count, 1);
  assert.equal(result.distinct_application_role_count, 1);
  assert.equal(result.object_lock_input_bucket_count, 2);
  assert.equal(result.external_email_allow_count, 0);
  assert.equal(result.public_resource_count, 0);
  assert.equal(result.production_resource_mutation_count, 0);
  assert.match(result.template_sha256, /^[0-9a-f]{64}$/u);

  assert.equal(
    template.Resources.RehearsalAdminFunction.Properties.Environment.Variables
      .LAWOS_DATABASE_NAME,
    "lawos_rehearsal",
  );
  assert.equal(
    JSON.parse(
      template.Resources.RehearsalApplicationDatabaseSecret.Properties
        .GenerateSecretString.SecretStringTemplate,
    ).username,
    "lawos_rehearsal_app",
  );
  assert.equal(
    JSON.stringify(template.Resources.RehearsalAdminExecutionRole)
      .includes("ses:"),
    false,
  );
  const evidenceStatements =
    template.Resources.RehearsalAdminExecutionRole.Properties.Policies[0]
      .PolicyDocument.Statement;
  const evidenceWriter = evidenceStatements
    .find((item) => item.Sid === "WriteImmutableRehearsalEvidence");
  const evidenceRetention = evidenceStatements
    .find((item) => item.Sid === "SetImmutableRehearsalEvidenceRetention");
  assert.equal(evidenceWriter.Action, "s3:PutObject");
  assert.equal(evidenceRetention.Action, "s3:PutObjectRetention");
  assert.deepEqual(evidenceRetention.Resource, evidenceWriter.Resource);
  assert.deepEqual(evidenceRetention.Condition, {
    StringEquals: { "s3:object-lock-mode": "COMPLIANCE" },
    Null: { "s3:object-lock-retain-until-date": "false" },
  });
  assert.equal(
    Object.keys(evidenceRetention.Condition.StringEquals)
      .some((key) => key.includes("server-side-encryption")),
    false,
  );
  const roleTags =
    template.Resources.RehearsalAdminExecutionRole.Properties.Tags;
  assert.equal(
    roleTags.find((tag) => tag.Key === "environment").Value,
    "lawos-staging",
  );
  assert.equal(
    roleTags.find((tag) => tag.Key === "program").Value,
    "lawos-private-rehearsal",
  );
});

test("W12 rehearsal stack parameters enable the existing ENI bootstrap only when explicitly required", () => {
  const base = {
    ArtifactBucket: "lawos-private-staging-artifacts-770880870480",
    ArtifactKey: "lawos-private-staging/exact.zip",
    EnableLambdaEniBootstrap: "true",
  };
  const input = {
    existingParameters: base,
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    artifactSha256: "c".repeat(64),
    artifactBucketName:
      "lawos-private-rehearsal-artifacts-770880870480",
    artifactKey: `program-artifact/${"a".repeat(40)}/${"c".repeat(64)}.zip`,
    artifactVersion: "immutable-version",
    executionPacketSha256: "d".repeat(64),
    trustRegistrySha256: "e".repeat(64),
    approvalId: "LAWOS-W12-APPROVAL",
    programInputBucketName: "lawos-private-rehearsal-input-770880870480",
    dmsBucketName: "lawos-private-rehearsal-dms-770880870480",
  };
  const enabled = Object.fromEntries(
    buildJsonPostgresRehearsalStackParameters({
      ...input,
      enableExistingLambdaEniBootstrap: true,
      enableW12LambdaEniBootstrap: true,
    }).map(({ key, value }) => [key, value]),
  );
  const disabled = Object.fromEntries(
    buildJsonPostgresRehearsalStackParameters({
      ...input,
      enableW12LambdaEniBootstrap: false,
    }).map(({ key, value }) => [key, value]),
  );

  assert.equal(enabled.EnableLambdaEniBootstrap, "true");
  assert.equal(enabled.EnableW12LambdaEniBootstrap, "true");
  assert.equal(enabled.SourceSha, undefined);
  assert.equal(
    enabled.W12ArtifactBucket,
    "lawos-private-rehearsal-artifacts-770880870480",
  );
  assert.equal(disabled.EnableLambdaEniBootstrap, "false");
  assert.equal(disabled.EnableW12LambdaEniBootstrap, "false");
});

test("W12 code artifacts use a separate private KMS and Object Lock store", () => {
  const template = buildJsonPostgresRehearsalArtifactStoreTemplate();
  const result = validateJsonPostgresRehearsalArtifactStoreTemplate(template);

  assert.equal(result.verdict, "PASS");
  assert.equal(result.resource_count, 4);
  assert.equal(result.object_lock_bucket_count, 1);
  assert.equal(result.public_resource_count, 0);
  assert.equal(result.deletion_deny_count, 1);
  assert.equal(
    template.Resources.RehearsalArtifactKeyAlias.Properties.AliasName,
    "alias/lawos-private-rehearsal-artifacts",
  );
  const unsafe = structuredClone(template);
  unsafe.Resources.RehearsalArtifactBucket.Properties
    .PublicAccessBlockConfiguration.BlockPublicPolicy = false;
  assert.throws(
    () => validateJsonPostgresRehearsalArtifactStoreTemplate(unsafe),
    /governance/u,
  );
});

test("W12 rehearsal fails closed on public infrastructure, email authority, wildcard actions and ENI drift", () => {
  for (const mutate of [
    (value) => {
      value.Resources.Database.Properties.PubliclyAccessible = true;
    },
    (value) => {
      value.Resources.RehearsalProgramInputBucket.Properties
        .PublicAccessBlockConfiguration.BlockPublicPolicy = false;
    },
    (value) => {
      value.Resources.RehearsalAdminExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement.push({
          Sid: "UnapprovedEmail",
          Effect: "Allow",
          Action: "ses:SendEmail",
          Resource: "*",
        });
    },
    (value) => {
      value.Resources.RehearsalAdminExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement.push({
          Sid: "UnapprovedWildcard",
          Effect: "Allow",
          Action: "s3:*",
          Resource: "*",
        });
    },
    (value) => {
      value.Resources.RehearsalAdminExecutionRole.Properties.Policies[1]
        ["Fn::If"][1].PolicyDocument.Statement[0].Action =
        [...JSON_POSTGRES_REHEARSAL_ENI_ACTIONS, "ec2:ModifyNetworkInterfaceAttribute"];
    },
    (value) => {
      value.Resources.RehearsalAdminExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement
        .find((item) => item.Sid === "DenyFunctionCodeEc2Networking").Effect =
        "Allow";
    },
    (value) => {
      value.Resources.RehearsalAdminExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement
        .find((item) => item.Sid === "WriteImmutableRehearsalEvidence")
        .Action = ["s3:PutObject", "s3:DeleteObject"];
    },
    (value) => {
      value.Resources.RehearsalAdminExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement
        .find((item) =>
          item.Sid === "SetImmutableRehearsalEvidenceRetention")
        .Condition.StringEquals["s3:x-amz-server-side-encryption"] =
          "aws:kms";
    },
  ]) {
    const template = builtTemplate();
    mutate(template);
    assert.throws(() => validateJsonPostgresRehearsalTemplate(template));
  }
});
