import { createHash } from "node:crypto";
import {
  JSON_POSTGRES_REHEARSAL_READONLY_ROLE,
} from "./json-postgres-rehearsal-execution.mjs";

export const JSON_POSTGRES_REHEARSAL_INFRASTRUCTURE_VERSION =
  "law-firm-os.json-postgres-rehearsal-infrastructure.v1";
export const JSON_POSTGRES_REHEARSAL_ARTIFACT_STORE_VERSION =
  "law-firm-os.json-postgres-rehearsal-artifact-store.v1";
export const JSON_POSTGRES_REHEARSAL_COST_CEILING_KRW = 300_000;
export const JSON_POSTGRES_REHEARSAL_INCREMENTAL_COST_CEILING_KRW = 15_000;
export const JSON_POSTGRES_REHEARSAL_ENI_ACTIONS = Object.freeze([
  "ec2:CreateNetworkInterface",
  "ec2:DescribeNetworkInterfaces",
  "ec2:DescribeSubnets",
  "ec2:DeleteNetworkInterface",
  "ec2:AssignPrivateIpAddresses",
  "ec2:UnassignPrivateIpAddresses",
]);

const ENI_DENY_ACTIONS = Object.freeze([
  ...JSON_POSTGRES_REHEARSAL_ENI_ACTIONS.slice(0, 4),
  "ec2:DetachNetworkInterface",
  ...JSON_POSTGRES_REHEARSAL_ENI_ACTIONS.slice(4),
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
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function fail(message) {
  throw new Error(message);
}

export function classifyJsonPostgresRehearsalHostTemplate({
  deployedTemplate,
  localBaseTemplate,
  rehearsalTemplate,
  hasW12,
} = {}) {
  if (!deployedTemplate || !localBaseTemplate || !rehearsalTemplate
    || typeof hasW12 !== "boolean") {
    fail("private rehearsal host template classification input is invalid");
  }
  const retainedResourceIds = [
    "RehearsalAdminLogGroup",
    "RehearsalApplicationDatabaseSecret",
    "RehearsalDmsBucket",
    "RehearsalProgramInputBucket",
    "RehearsalTenantContextSecret",
  ];
  const retainedParameterIds = [
    "W12DmsBucketName",
    "W12ProgramInputBucketName",
  ];
  const normalizedDeployed = clone(deployedTemplate);
  let retainedResourceImported = false;
  if (!hasW12 && retainedResourceIds.every((logicalId) =>
    Object.hasOwn(normalizedDeployed.Resources ?? {}, logicalId))) {
    for (const logicalId of retainedResourceIds) {
      if (sha256(normalizedDeployed.Resources[logicalId])
        !== sha256(rehearsalTemplate.Resources?.[logicalId])) {
        fail("retained private rehearsal resource drifted");
      }
      delete normalizedDeployed.Resources[logicalId];
    }
    for (const parameterId of retainedParameterIds) {
      if (sha256(normalizedDeployed.Parameters?.[parameterId])
        !== sha256(rehearsalTemplate.Parameters?.[parameterId])) {
        fail("retained private rehearsal parameter drifted");
      }
      delete normalizedDeployed.Parameters[parameterId];
    }
    if (Object.keys(normalizedDeployed.Parameters ?? {})
      .some((key) => key.startsWith("W12")
        || key === "EnableW12LambdaEniBootstrap")
      || Object.keys(normalizedDeployed.Resources ?? {})
        .some((key) => key.startsWith("Rehearsal"))) {
      fail("partial private rehearsal import drifted");
    }
    retainedResourceImported = true;
  }
  const deployedSha256 = sha256(deployedTemplate);
  const normalizedDeployedSha256 = sha256(normalizedDeployed);
  const currentSha256 = sha256(
    hasW12 ? rehearsalTemplate : localBaseTemplate,
  );
  if (normalizedDeployedSha256 === currentSha256) {
    return Object.freeze({
      deployed_template_sha256: deployedSha256,
      expected_template_sha256: currentSha256,
      legacy_identity_tenant_rebind_required: false,
      retained_resource_imported: retainedResourceImported,
    });
  }
  if (hasW12) {
    fail("existing private staging template drifted");
  }
  const legacy = clone(localBaseTemplate);
  const variables =
    legacy.Resources?.ApiFunction?.Properties?.Environment?.Variables;
  if (!variables
    || typeof variables.LAWOS_IDENTITY_TENANT_ID !== "string"
    || Object.hasOwn(variables, "LAWOS_PASSWORD_RESET_TENANT_ID")) {
    fail("private staging identity tenant transition contract drifted");
  }
  variables.LAWOS_PASSWORD_RESET_TENANT_ID =
    variables.LAWOS_IDENTITY_TENANT_ID;
  delete variables.LAWOS_IDENTITY_TENANT_ID;
  if (sha256(legacy) !== normalizedDeployedSha256) {
    fail("existing private staging template drifted");
  }
  return Object.freeze({
    deployed_template_sha256: deployedSha256,
    expected_template_sha256: currentSha256,
    legacy_identity_tenant_rebind_required: true,
    retained_resource_imported: retainedResourceImported,
  });
}

function rehearsalTags() {
  return [
    { Key: "environment", Value: "lawos-staging" },
    { Key: "program", Value: "lawos-private-rehearsal" },
    { Key: "system", Value: "lawos" },
    { Key: "owner", Value: { Ref: "Owner" } },
    { Key: "review", Value: { Ref: "ReviewDate" } },
    { Key: "expiration", Value: { Ref: "ExpirationDate" } },
  ];
}

function immutableBucket({
  nameRef,
  keyLogicalId,
  nameTag,
  retentionDays = 365,
} = {}) {
  return {
    Type: "AWS::S3::Bucket",
    DeletionPolicy: "Retain",
    UpdateReplacePolicy: "Retain",
    Properties: {
      BucketName: { Ref: nameRef },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [{
          BucketKeyEnabled: true,
          ServerSideEncryptionByDefault: {
            KMSMasterKeyID: { "Fn::GetAtt": [keyLogicalId, "Arn"] },
            SSEAlgorithm: "aws:kms",
          },
        }],
      },
      ObjectLockEnabled: true,
      ObjectLockConfiguration: {
        ObjectLockEnabled: "Enabled",
        Rule: {
          DefaultRetention: { Mode: "COMPLIANCE", Days: retentionDays },
        },
      },
      OwnershipControls: {
        Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: { Status: "Enabled" },
      Tags: [
        { Key: "Name", Value: nameTag },
        ...rehearsalTags(),
      ],
    },
  };
}

function immutableBucketPolicy({
  bucketLogicalId,
  keyLogicalId,
  deletionSid,
} = {}) {
  return {
    Type: "AWS::S3::BucketPolicy",
    Properties: {
      Bucket: { Ref: bucketLogicalId },
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "DenyInsecureTransport",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:*",
            Resource: [
              { "Fn::GetAtt": [bucketLogicalId, "Arn"] },
              { "Fn::Sub": `\${${bucketLogicalId}.Arn}/*` },
            ],
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          },
          {
            Sid: "DenyWrongEncryption",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:PutObject",
            Resource: { "Fn::Sub": `\${${bucketLogicalId}.Arn}/*` },
            Condition: {
              StringNotEquals: {
                "s3:x-amz-server-side-encryption": "aws:kms",
              },
            },
          },
          {
            Sid: "DenyWrongKmsKey",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:PutObject",
            Resource: { "Fn::Sub": `\${${bucketLogicalId}.Arn}/*` },
            Condition: {
              StringNotEquals: {
                "s3:x-amz-server-side-encryption-aws-kms-key-id": {
                  "Fn::GetAtt": [keyLogicalId, "Arn"],
                },
              },
            },
          },
          {
            Sid: deletionSid,
            Effect: "Deny",
            Principal: "*",
            Action: ["s3:DeleteObject", "s3:DeleteObjectVersion"],
            Resource: { "Fn::Sub": `\${${bucketLogicalId}.Arn}/*` },
          },
        ],
      },
    },
  };
}

export function buildJsonPostgresRehearsalArtifactStoreTemplate() {
  const template = {
    AWSTemplateFormatVersion: "2010-09-09",
    Description:
      "Immutable private exact-head artifact store for LawOS W12 real-data rehearsal.",
    Metadata: {
      schema_version: JSON_POSTGRES_REHEARSAL_ARTIFACT_STORE_VERSION,
      monthly_cost_ceiling_krw: JSON_POSTGRES_REHEARSAL_COST_CEILING_KRW,
      incremental_cost_ceiling_krw:
        JSON_POSTGRES_REHEARSAL_INCREMENTAL_COST_CEILING_KRW,
      data_scope: "code-artifact-only",
    },
    Parameters: {
      ArtifactBucketName: {
        Type: "String",
        AllowedPattern:
          "^lawos-private-rehearsal-artifacts-[0-9]{12}$",
      },
      Owner: {
        Type: "String",
        AllowedPattern: "^[A-Za-z0-9._@+-]{1,128}$",
      },
      ReviewDate: {
        Type: "String",
        AllowedPattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
      },
      ExpirationDate: {
        Type: "String",
        AllowedPattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
      },
    },
    Resources: {},
    Outputs: {},
  };
  template.Resources.RehearsalArtifactKey = {
    Type: "AWS::KMS::Key",
    DeletionPolicy: "Retain",
    UpdateReplacePolicy: "Retain",
    Properties: {
      Description: "LawOS W12 exact-head artifact encryption key",
      EnableKeyRotation: true,
      KeyPolicy: {
        Version: "2012-10-17",
        Statement: [{
          Sid: "EnableAccountIamAuthority",
          Effect: "Allow",
          Principal: {
            AWS: {
              "Fn::Sub":
                "arn:${AWS::Partition}:iam::${AWS::AccountId}:root",
            },
          },
          Action: "kms:*",
          Resource: "*",
        }],
      },
      PendingWindowInDays: 30,
      Tags: rehearsalTags(),
    },
  };
  template.Resources.RehearsalArtifactKeyAlias = {
    Type: "AWS::KMS::Alias",
    Properties: {
      AliasName: "alias/lawos-private-rehearsal-artifacts",
      TargetKeyId: { Ref: "RehearsalArtifactKey" },
    },
  };
  template.Resources.RehearsalArtifactBucket = immutableBucket({
    nameRef: "ArtifactBucketName",
    keyLogicalId: "RehearsalArtifactKey",
    nameTag: "lawos-private-rehearsal-artifacts",
  });
  template.Resources.RehearsalArtifactBucketPolicy = immutableBucketPolicy({
    bucketLogicalId: "RehearsalArtifactBucket",
    keyLogicalId: "RehearsalArtifactKey",
    deletionSid: "DenyArtifactDeletion",
  });
  template.Outputs.ArtifactBucketName = {
    Value: { Ref: "RehearsalArtifactBucket" },
  };
  template.Outputs.ArtifactBucketArn = {
    Value: { "Fn::GetAtt": ["RehearsalArtifactBucket", "Arn"] },
  };
  template.Outputs.ArtifactKmsKeyArn = {
    Value: { "Fn::GetAtt": ["RehearsalArtifactKey", "Arn"] },
  };
  return template;
}

export function validateJsonPostgresRehearsalArtifactStoreTemplate(
  template,
) {
  if (template?.Metadata?.schema_version
      !== JSON_POSTGRES_REHEARSAL_ARTIFACT_STORE_VERSION
    || template.Metadata.monthly_cost_ceiling_krw
      !== JSON_POSTGRES_REHEARSAL_COST_CEILING_KRW
    || template.Metadata.incremental_cost_ceiling_krw
      !== JSON_POSTGRES_REHEARSAL_INCREMENTAL_COST_CEILING_KRW
    || template.Metadata.data_scope !== "code-artifact-only") {
    fail("rehearsal artifact-store metadata drifted");
  }
  const resources = template.Resources ?? {};
  if (JSON.stringify(Object.keys(resources).sort()) !== JSON.stringify([
    "RehearsalArtifactBucket",
    "RehearsalArtifactBucketPolicy",
    "RehearsalArtifactKey",
    "RehearsalArtifactKeyAlias",
  ].sort())) {
    fail("rehearsal artifact-store resource set drifted");
  }
  const bucket = resources.RehearsalArtifactBucket?.Properties;
  if (!bucket
    || bucket.ObjectLockEnabled !== true
    || bucket.ObjectLockConfiguration?.Rule?.DefaultRetention?.Mode
      !== "COMPLIANCE"
    || bucket.ObjectLockConfiguration?.Rule?.DefaultRetention?.Days < 365
    || bucket.VersioningConfiguration?.Status !== "Enabled"
    || bucket.BucketEncryption?.ServerSideEncryptionConfiguration?.[0]
      ?.ServerSideEncryptionByDefault?.SSEAlgorithm !== "aws:kms"
    || Object.values(bucket.PublicAccessBlockConfiguration ?? {})
      .some((value) => value !== true)) {
    fail("rehearsal artifact bucket governance drifted");
  }
  const policy = resources.RehearsalArtifactBucketPolicy?.Properties
    ?.PolicyDocument?.Statement ?? [];
  if (!policy.some((item) => item.Sid === "DenyArtifactDeletion")
    || policy.some((item) => item.Effect === "Allow")) {
    fail("rehearsal artifact bucket policy drifted");
  }
  const key = resources.RehearsalArtifactKey?.Properties;
  if (key?.EnableKeyRotation !== true
    || key.KeyPolicy?.Statement?.length !== 1
    || key.KeyPolicy.Statement[0]?.Sid !== "EnableAccountIamAuthority"
    || key.KeyPolicy.Statement[0]?.Action !== "kms:*"
    || key.KeyPolicy.Statement[0]?.Resource !== "*") {
    fail("rehearsal artifact KMS authority drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    template_sha256: sha256(template),
    resource_count: 4,
    object_lock_bucket_count: 1,
    public_resource_count: 0,
    deletion_deny_count: 1,
    monthly_cost_ceiling_krw:
      JSON_POSTGRES_REHEARSAL_COST_CEILING_KRW,
  });
}

export function jsonPostgresRehearsalCombinedTemplateSha256({
  artifactStoreTemplate,
  rehearsalTemplate,
} = {}) {
  validateJsonPostgresRehearsalArtifactStoreTemplate(artifactStoreTemplate);
  validateJsonPostgresRehearsalTemplate(rehearsalTemplate);
  return sha256({
    artifact_store: artifactStoreTemplate,
    rehearsal: rehearsalTemplate,
  });
}

function rehearsalRole() {
  return {
    Type: "AWS::IAM::Role",
    Properties: {
      AssumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [{
          Effect: "Allow",
          Principal: { Service: "lambda.amazonaws.com" },
          Action: "sts:AssumeRole",
        }],
      },
      Description: "Direct-invoke least-privilege LawOS W12 real-data rehearsal role",
      Policies: [
        {
          PolicyName: "lawos-private-rehearsal-admin-runtime",
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "WriteExactRehearsalLogGroup",
                Effect: "Allow",
                Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
                Resource: {
                  "Fn::Sub": "arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/lawos-private-staging-w12-admin:*",
                },
              },
              {
                Sid: "ReadExactRehearsalSecrets",
                Effect: "Allow",
                Action: "secretsmanager:GetSecretValue",
                Resource: [
                  { "Fn::GetAtt": ["Database", "MasterUserSecret.SecretArn"] },
                  { Ref: "RehearsalApplicationDatabaseSecret" },
                  { Ref: "RehearsalTenantContextSecret" },
                ],
              },
              {
                Sid: "PopulateExactRehearsalApplicationSecret",
                Effect: "Allow",
                Action: "secretsmanager:PutSecretValue",
                Resource: { Ref: "RehearsalApplicationDatabaseSecret" },
              },
              {
                Sid: "UseExactStagingKey",
                Effect: "Allow",
                Action: [
                  "kms:Decrypt",
                  "kms:Encrypt",
                  "kms:GenerateDataKey",
                  "kms:DescribeKey",
                ],
                Resource: { "Fn::GetAtt": ["StagingKey", "Arn"] },
              },
              {
                Sid: "ReadExactRehearsalInputBucketState",
                Effect: "Allow",
                Action: [
                  "s3:GetBucketLocation",
                  "s3:GetBucketObjectLockConfiguration",
                  "s3:GetBucketVersioning",
                ],
                Resource: { "Fn::GetAtt": ["RehearsalProgramInputBucket", "Arn"] },
              },
              {
                Sid: "ReadExactImmutableRehearsalInputs",
                Effect: "Allow",
                Action: [
                  "s3:GetObjectVersion",
                  "s3:GetObjectLegalHold",
                  "s3:GetObjectRetention",
                ],
                Resource: { "Fn::Sub": "${RehearsalProgramInputBucket.Arn}/program-input/*" },
              },
              {
                Sid: "WriteImmutableRehearsalEvidence",
                Effect: "Allow",
                Action: "s3:PutObject",
                Resource: [
                  { "Fn::Sub": "${RehearsalProgramInputBucket.Arn}/program-approval-audit/*" },
                  { "Fn::Sub": "${RehearsalProgramInputBucket.Arn}/program-execution/*" },
                ],
                Condition: {
                  StringEquals: {
                    "s3:x-amz-server-side-encryption": "aws:kms",
                    "s3:x-amz-server-side-encryption-aws-kms-key-id": {
                      "Fn::GetAtt": ["StagingKey", "Arn"],
                    },
                    "s3:object-lock-mode": "COMPLIANCE",
                  },
                  Null: { "s3:object-lock-retain-until-date": "false" },
                },
              },
              {
                Sid: "SetImmutableRehearsalEvidenceRetention",
                Effect: "Allow",
                Action: "s3:PutObjectRetention",
                Resource: [
                  { "Fn::Sub": "${RehearsalProgramInputBucket.Arn}/program-approval-audit/*" },
                  { "Fn::Sub": "${RehearsalProgramInputBucket.Arn}/program-execution/*" },
                ],
              },
              {
                Sid: "OperateExactRehearsalDmsObjects",
                Effect: "Allow",
                Action: [
                  "s3:GetObject",
                  "s3:GetObjectVersion",
                  "s3:GetObjectLegalHold",
                  "s3:GetObjectRetention",
                  "s3:PutObject",
                  "s3:PutObjectLegalHold",
                  "s3:PutObjectRetention",
                ],
                Resource: {
                  "Fn::Sub":
                    "${RehearsalDmsBucket.Arn}/approved-real-rehearsal/*",
                },
              },
              {
                Sid: "DenyFunctionCodeEc2Networking",
                Effect: "Deny",
                Action: [...ENI_DENY_ACTIONS],
                Resource: "*",
                Condition: {
                  ArnEquals: {
                    "lambda:SourceFunctionArn": {
                      "Fn::Sub": "arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:lawos-private-staging-w12-admin",
                    },
                  },
                },
              },
            ],
          },
        },
        {
          "Fn::If": [
            "W12LambdaEniBootstrapEnabled",
            {
              PolicyName: "lawos-private-rehearsal-lambda-vpc-eni-bootstrap-temporary",
              PolicyDocument: {
                Version: "2012-10-17",
                Statement: [{
                  Sid: "LambdaVpcEniBootstrap",
                  Effect: "Allow",
                  Action: [...JSON_POSTGRES_REHEARSAL_ENI_ACTIONS],
                  Resource: "*",
                }],
              },
            },
            { Ref: "AWS::NoValue" },
          ],
        },
      ],
      RoleName: "lawos-private-staging-w12-admin-role",
      Tags: rehearsalTags(),
    },
  };
}

function rehearsalProgramInputBucket() {
  return immutableBucket({
    nameRef: "W12ProgramInputBucketName",
    keyLogicalId: "StagingKey",
    nameTag: "lawos-private-rehearsal-program-input",
  });
}

function rehearsalProgramInputBucketPolicy() {
  return immutableBucketPolicy({
    bucketLogicalId: "RehearsalProgramInputBucket",
    keyLogicalId: "StagingKey",
    deletionSid: "DenyRehearsalInputAndEvidenceDeletion",
  });
}

export function buildJsonPostgresRehearsalTemplate(privateStagingTemplate) {
  if (!privateStagingTemplate
    || typeof privateStagingTemplate !== "object"
    || Array.isArray(privateStagingTemplate)) {
    throw new TypeError("private-staging reference template is required");
  }
  const template = clone(privateStagingTemplate);
  template.Description =
    "Approval-gated LawOS W12 real-data rehearsal isolated in a dedicated database and role.";
  template.Metadata = {
    schema_version: JSON_POSTGRES_REHEARSAL_INFRASTRUCTURE_VERSION,
    monthly_cost_ceiling_krw: JSON_POSTGRES_REHEARSAL_COST_CEILING_KRW,
    incremental_cost_ceiling_krw: JSON_POSTGRES_REHEARSAL_INCREMENTAL_COST_CEILING_KRW,
    operational_authority: "postgres-v2",
    data_scope: "approved-real-manifest",
    database_isolation: "lawos_rehearsal",
    production_resource_mutation: false,
    external_email_delivery: false,
  };
  template.Parameters.W12ExecutionPacketSha256 = {
    Type: "String",
    AllowedPattern: "^[0-9a-f]{64}$",
  };
  template.Parameters.W12SourceSha = {
    Type: "String",
    AllowedPattern: "^[0-9a-f]{40}$",
  };
  template.Parameters.W12SourceTree = {
    Type: "String",
    AllowedPattern: "^[0-9a-f]{40}$",
  };
  template.Parameters.W12ArtifactBucket = {
    Type: "String",
    AllowedPattern:
      "^lawos-private-rehearsal-artifacts-[0-9]{12}$",
  };
  template.Parameters.W12ArtifactKey = {
    Type: "String",
    AllowedPattern: "^program-artifact/[0-9a-f]{40}/[0-9a-f]{64}\\.zip$",
  };
  template.Parameters.W12ArtifactVersion = {
    Type: "String",
    MinLength: 1,
    MaxLength: 1024,
  };
  template.Parameters.W12ArtifactSha256 = {
    Type: "String",
    AllowedPattern: "^[0-9a-f]{64}$",
  };
  template.Parameters.W12OwnerTrustRegistrySha256 = {
    Type: "String",
    AllowedPattern: "^[0-9a-f]{64}$",
  };
  template.Parameters.W12ApprovalId = {
    Type: "String",
    AllowedPattern: "^[A-Za-z0-9._:-]{8,200}$",
  };
  template.Parameters.W12ProgramInputBucketName = {
    Type: "String",
    AllowedPattern: "^lawos-private-rehearsal-input-[0-9]{12}$",
  };
  template.Parameters.W12DmsBucketName = {
    Type: "String",
    AllowedPattern: "^lawos-private-rehearsal-dms-[0-9]{12}$",
  };
  template.Parameters.EnableW12LambdaEniBootstrap = {
    Type: "String",
    Default: "false",
    AllowedValues: ["true", "false"],
  };
  template.Conditions.W12LambdaEniBootstrapEnabled = {
    "Fn::Equals": [{ Ref: "EnableW12LambdaEniBootstrap" }, "true"],
  };

  const resources = template.Resources;
  resources.RehearsalApplicationDatabaseSecret = {
    Type: "AWS::SecretsManager::Secret",
    DeletionPolicy: "Retain",
    UpdateReplacePolicy: "Retain",
    Properties: {
      Description: "Dedicated least-privilege LawOS W12 rehearsal database credential",
      GenerateSecretString: {
        ExcludeCharacters: "\"'@/\\",
        GenerateStringKey: "password",
        PasswordLength: 48,
        SecretStringTemplate:
          "{\"username\":\"lawos_rehearsal_app\",\"configuration_state\":\"pending_admin_bootstrap\"}",
      },
      KmsKeyId: { "Fn::GetAtt": ["StagingKey", "Arn"] },
      Name: "/lawos/private-rehearsal/postgres/application",
      Tags: rehearsalTags(),
    },
  };
  resources.RehearsalTenantContextSecret = {
    Type: "AWS::SecretsManager::Secret",
    DeletionPolicy: "Retain",
    UpdateReplacePolicy: "Retain",
    Properties: {
      Description: "Dedicated authenticated tenant-context HMAC secret for LawOS W12 rehearsal",
      GenerateSecretString: {
        ExcludePunctuation: true,
        GenerateStringKey: "tenant_context_secret",
        PasswordLength: 48,
        SecretStringTemplate:
          "{\"schema_version\":\"law-firm-os.tenant-context-secret.v1\"}",
      },
      KmsKeyId: { "Fn::GetAtt": ["StagingKey", "Arn"] },
      Name: "/lawos/private-rehearsal/postgres/tenant-context",
      Tags: rehearsalTags(),
    },
  };
  resources.RehearsalProgramInputBucket = rehearsalProgramInputBucket();
  resources.RehearsalProgramInputBucketPolicy =
    rehearsalProgramInputBucketPolicy();
  resources.RehearsalDmsBucket = immutableBucket({
    nameRef: "W12DmsBucketName",
    keyLogicalId: "StagingKey",
    nameTag: "lawos-private-rehearsal-dms",
  });
  resources.RehearsalDmsBucketPolicy = immutableBucketPolicy({
    bucketLogicalId: "RehearsalDmsBucket",
    keyLogicalId: "StagingKey",
    deletionSid: "DenyRehearsalDmsDeletion",
  });
  resources.RehearsalAdminExecutionRole = rehearsalRole();
  resources.RehearsalAdminLogGroup = {
    Type: "AWS::Logs::LogGroup",
    DeletionPolicy: "Retain",
    UpdateReplacePolicy: "Retain",
    Properties: {
      KmsKeyId: { "Fn::GetAtt": ["StagingKey", "Arn"] },
      LogGroupName: "/aws/lambda/lawos-private-staging-w12-admin",
      RetentionInDays: 365,
      Tags: rehearsalTags(),
    },
  };
  resources.RehearsalAdminFunction = {
    Type: "AWS::Lambda::Function",
    DependsOn: ["RehearsalAdminLogGroup"],
    Properties: {
      Architectures: ["arm64"],
      Code: {
        S3Bucket: { Ref: "W12ArtifactBucket" },
        S3Key: { Ref: "W12ArtifactKey" },
        S3ObjectVersion: { Ref: "W12ArtifactVersion" },
      },
      Description: "Direct-invoke exact-packet LawOS W12 real-data rehearsal",
      Environment: {
        Variables: {
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
          LAWOS_ADMIN_DATABASE_NAME: "lawos",
          LAWOS_APPLICATION_DATABASE_SECRET_ID: {
            Ref: "RehearsalApplicationDatabaseSecret",
          },
          LAWOS_APPROVAL_AUDIT_BUCKET: {
            Ref: "RehearsalProgramInputBucket",
          },
          LAWOS_AWS_ACCOUNT_ID: { Ref: "AWS::AccountId" },
          LAWOS_DATABASE_HOST: {
            "Fn::GetAtt": ["Database", "Endpoint.Address"],
          },
          LAWOS_DATABASE_NAME: "lawos_rehearsal",
          LAWOS_DATABASE_PORT: {
            "Fn::GetAtt": ["Database", "Endpoint.Port"],
          },
          LAWOS_DATA_SCOPE: "approved-real-manifest",
          LAWOS_DEPLOYMENT_ARTIFACT_SHA256: {
            Ref: "W12ArtifactSha256",
          },
          LAWOS_DEPLOYMENT_COMMIT: { Ref: "W12SourceSha" },
          LAWOS_DEPLOYMENT_TREE: { Ref: "W12SourceTree" },
          LAWOS_EXECUTION_PACKET_SHA256: { Ref: "W12ExecutionPacketSha256" },
          LAWOS_MASTER_DATABASE_SECRET_ID: {
            "Fn::GetAtt": ["Database", "MasterUserSecret.SecretArn"],
          },
          LAWOS_OWNER_TRUST_REGISTRY_SHA256: {
            Ref: "W12OwnerTrustRegistrySha256",
          },
          LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
          LAWOS_POSTGRES_SSL_MODE: "verify-full",
          LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: {
            Ref: "RehearsalTenantContextSecret",
          },
          LAWOS_PROGRAM_INPUT_BUCKET: {
            Ref: "RehearsalProgramInputBucket",
          },
          LAWOS_PROGRAM_INPUT_KMS_KEY_ARN: {
            "Fn::GetAtt": ["StagingKey", "Arn"],
          },
          LAWOS_RUNTIME_PROFILE: "operational",
          LAWOS_STAFF_AUTHORITY: "internal-password",
          LAWOS_W12_APPROVAL_ID: { Ref: "W12ApprovalId" },
          NODE_EXTRA_CA_CERTS: "/var/task/certs/global-bundle.pem",
        },
      },
      FunctionName: "lawos-private-staging-w12-admin",
      Handler: "apps/api/src/json-postgres-program-admin-lambda.handler",
      KmsKeyArn: { "Fn::GetAtt": ["StagingKey", "Arn"] },
      MemorySize: 1024,
      ReservedConcurrentExecutions: 1,
      Role: { "Fn::GetAtt": ["RehearsalAdminExecutionRole", "Arn"] },
      Runtime: "nodejs22.x",
      Timeout: 900,
      VpcConfig: {
        Ipv6AllowedForDualStack: false,
        SecurityGroupIds: [{
          "Fn::GetAtt": ["LambdaSecurityGroup", "GroupId"],
        }],
        SubnetIds: [{ Ref: "AppSubnetA" }, { Ref: "AppSubnetB" }],
      },
      Tags: rehearsalTags(),
    },
  };
  resources.RehearsalReadonlyAuditInvokePermission = {
    Type: "AWS::Lambda::Permission",
    Properties: {
      Action: "lambda:InvokeFunction",
      FunctionName: { Ref: "RehearsalAdminFunction" },
      Principal: {
        "Fn::Sub":
          `arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/`
          + JSON_POSTGRES_REHEARSAL_READONLY_ROLE,
      },
    },
  };

  resources.SecretsManagerEndpoint.Properties.PolicyDocument.Statement.push({
    Sid: "W12AdminReadsExactRehearsalSecrets",
    Effect: "Allow",
    Principal: "*",
    Action: [
      "secretsmanager:GetSecretValue",
      "secretsmanager:PutSecretValue",
    ],
    Resource: [
      { "Fn::GetAtt": ["Database", "MasterUserSecret.SecretArn"] },
      { Ref: "RehearsalApplicationDatabaseSecret" },
      { Ref: "RehearsalTenantContextSecret" },
    ],
  });
  resources.S3GatewayEndpoint.Properties.PolicyDocument.Statement.push({
    Sid: "ExactW12RehearsalInputsAndDmsOnly",
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
      { "Fn::GetAtt": ["RehearsalProgramInputBucket", "Arn"] },
      { "Fn::Sub": "${RehearsalProgramInputBucket.Arn}/*" },
      { "Fn::GetAtt": ["RehearsalDmsBucket", "Arn"] },
      {
        "Fn::Sub":
          "${RehearsalDmsBucket.Arn}/approved-real-rehearsal/*",
      },
    ],
  });
  template.Outputs.RehearsalAdminFunctionArn = {
    Value: { "Fn::GetAtt": ["RehearsalAdminFunction", "Arn"] },
  };
  template.Outputs.RehearsalApplicationDatabaseSecretArn = {
    Value: { Ref: "RehearsalApplicationDatabaseSecret" },
  };
  template.Outputs.RehearsalTenantContextSecretArn = {
    Value: { Ref: "RehearsalTenantContextSecret" },
  };
  template.Outputs.RehearsalProgramInputBucketName = {
    Value: { Ref: "RehearsalProgramInputBucket" },
  };
  template.Outputs.RehearsalDmsBucketName = {
    Value: { Ref: "RehearsalDmsBucket" },
  };
  template.Outputs.W12ExecutionPacketSha256 = {
    Value: { Ref: "W12ExecutionPacketSha256" },
  };
  template.Outputs.W12SourceSha = { Value: { Ref: "W12SourceSha" } };
  template.Outputs.W12SourceTree = {
    Value: { Ref: "W12SourceTree" },
  };
  template.Outputs.W12ArtifactSha256 = {
    Value: { Ref: "W12ArtifactSha256" },
  };
  return template;
}

function roleStatements(role) {
  return (role?.Properties?.Policies ?? []).flatMap((policy) =>
    policy?.PolicyDocument?.Statement
      ?? policy?.["Fn::If"]?.[1]?.PolicyDocument?.Statement
      ?? []);
}

function containsWildcardAction(action) {
  const actions = Array.isArray(action) ? action : [action];
  return actions.some((item) =>
    typeof item === "string" && (item === "*" || item.endsWith(":*")));
}

export function validateJsonPostgresRehearsalTemplate(template) {
  if (template?.Metadata?.schema_version
      !== JSON_POSTGRES_REHEARSAL_INFRASTRUCTURE_VERSION
    || template.Metadata.monthly_cost_ceiling_krw
      !== JSON_POSTGRES_REHEARSAL_COST_CEILING_KRW
    || template.Metadata.incremental_cost_ceiling_krw
      !== JSON_POSTGRES_REHEARSAL_INCREMENTAL_COST_CEILING_KRW
    || template.Metadata.operational_authority !== "postgres-v2"
    || template.Metadata.data_scope !== "approved-real-manifest"
    || template.Metadata.database_isolation !== "lawos_rehearsal"
    || template.Metadata.production_resource_mutation !== false
    || template.Metadata.external_email_delivery !== false) {
    fail("private rehearsal template metadata drifted");
  }
  const resources = template.Resources ?? {};
  if (Object.values(resources).filter((item) => item.Type === "AWS::RDS::DBInstance").length !== 1
    || Object.values(resources).filter((item) => item.Type === "AWS::EC2::VPC").length !== 1
    || resources.Database?.Properties?.PubliclyAccessible !== false) {
    fail("private rehearsal must reuse the existing private staging VPC and RDS");
  }
  for (const logicalId of [
    "RehearsalProgramInputBucket",
    "RehearsalDmsBucket",
  ]) {
    const bucket = resources[logicalId]?.Properties;
    if (!bucket
      || bucket.ObjectLockEnabled !== true
      || bucket.ObjectLockConfiguration?.Rule?.DefaultRetention?.Mode
        !== "COMPLIANCE"
      || bucket.ObjectLockConfiguration?.Rule?.DefaultRetention?.Days < 365
      || bucket.VersioningConfiguration?.Status !== "Enabled"
      || bucket.BucketEncryption?.ServerSideEncryptionConfiguration?.[0]
        ?.ServerSideEncryptionByDefault?.SSEAlgorithm !== "aws:kms"
      || Object.values(bucket.PublicAccessBlockConfiguration ?? {})
        .some((value) => value !== true)) {
      fail("private rehearsal immutable bucket drifted");
    }
  }
  const fn = resources.RehearsalAdminFunction?.Properties;
  if (!fn
    || fn.Handler !== "apps/api/src/json-postgres-program-admin-lambda.handler"
    || fn.FunctionName !== "lawos-private-staging-w12-admin"
    || fn.ReservedConcurrentExecutions !== 1
    || fn.Environment?.Variables?.LAWOS_DATABASE_NAME !== "lawos_rehearsal"
    || fn.Environment?.Variables?.LAWOS_ADMIN_DATABASE_NAME !== "lawos"
    || fn.Environment?.Variables?.LAWOS_DATA_SCOPE !== "approved-real-manifest"
    || fn.Environment?.Variables?.LAWOS_PERSISTENCE_AUTHORITY !== "postgres-v2"
    || fn.Environment?.Variables?.LAWOS_POSTGRES_SSL_MODE !== "verify-full"
    || fn.Code?.S3Bucket?.Ref !== "W12ArtifactBucket"
    || fn.Code?.S3Key?.Ref !== "W12ArtifactKey"
    || fn.Code?.S3ObjectVersion?.Ref !== "W12ArtifactVersion"
    || fn.Environment?.Variables?.LAWOS_DEPLOYMENT_COMMIT?.Ref
      !== "W12SourceSha"
    || fn.Environment?.Variables?.LAWOS_DEPLOYMENT_TREE?.Ref
      !== "W12SourceTree"
    || fn.Environment?.Variables?.LAWOS_DEPLOYMENT_ARTIFACT_SHA256?.Ref
      !== "W12ArtifactSha256"
    || fn.VpcConfig?.SubnetIds?.length !== 2
    || fn.VpcConfig?.SecurityGroupIds?.length !== 1) {
    fail("private rehearsal direct-invoke Lambda drifted");
  }
  const readbackPermission =
    resources.RehearsalReadonlyAuditInvokePermission;
  if (readbackPermission?.Type !== "AWS::Lambda::Permission"
    || readbackPermission.Properties?.Action !== "lambda:InvokeFunction"
    || readbackPermission.Properties?.FunctionName?.Ref
      !== "RehearsalAdminFunction"
    || readbackPermission.Properties?.Principal?.["Fn::Sub"]
      !== `arn:\${AWS::Partition}:iam::\${AWS::AccountId}:role/`
        + JSON_POSTGRES_REHEARSAL_READONLY_ROLE
    || readbackPermission.Properties?.SourceArn != null
    || readbackPermission.Properties?.PrincipalOrgID != null) {
    fail("private rehearsal read-only audit invocation drifted");
  }
  const role = resources.RehearsalAdminExecutionRole;
  const statements = roleStatements(role);
  const bootstrap = statements.find((item) => item.Sid === "LambdaVpcEniBootstrap");
  const deny = statements.find((item) => item.Sid === "DenyFunctionCodeEc2Networking");
  const evidenceWriter = statements
    .find((item) => item.Sid === "WriteImmutableRehearsalEvidence");
  const evidenceRetention = statements
    .find((item) => item.Sid === "SetImmutableRehearsalEvidenceRetention");
  const evidenceResources = [
    { "Fn::Sub": "${RehearsalProgramInputBucket.Arn}/program-approval-audit/*" },
    { "Fn::Sub": "${RehearsalProgramInputBucket.Arn}/program-execution/*" },
  ];
  if (role?.Properties?.RoleName !== "lawos-private-staging-w12-admin-role"
    || JSON.stringify(bootstrap?.Action)
      !== JSON.stringify(JSON_POSTGRES_REHEARSAL_ENI_ACTIONS)
    || bootstrap?.Resource !== "*"
    || JSON.stringify(deny?.Action) !== JSON.stringify(ENI_DENY_ACTIONS)
    || deny?.Effect !== "Deny"
    || deny?.Resource !== "*"
    || evidenceWriter?.Action !== "s3:PutObject"
    || evidenceRetention?.Action !== "s3:PutObjectRetention"
    || JSON.stringify(evidenceWriter?.Resource)
      !== JSON.stringify(evidenceResources)
    || JSON.stringify(evidenceRetention?.Resource)
      !== JSON.stringify(evidenceResources)
    || evidenceRetention?.Condition != null
    || evidenceWriter?.Condition?.StringEquals
      ?.["s3:x-amz-server-side-encryption"] !== "aws:kms"
    || evidenceWriter?.Condition?.StringEquals
      ?.["s3:object-lock-mode"] !== "COMPLIANCE"
    || evidenceWriter?.Condition?.Null
      ?.["s3:object-lock-retain-until-date"] !== "false"
    || statements.some((item) => item.Effect === "Allow"
      && containsWildcardAction(item.Action))
    || statements.some((item) => JSON.stringify(item).match(/\bses:/iu))) {
    fail("private rehearsal least-privilege role drifted");
  }
  const applicationSecret = JSON.parse(
    resources.RehearsalApplicationDatabaseSecret?.Properties
      ?.GenerateSecretString?.SecretStringTemplate ?? "{}",
  );
  if (applicationSecret.username !== "lawos_rehearsal_app"
    || applicationSecret.configuration_state !== "pending_admin_bootstrap") {
    fail("private rehearsal application role secret drifted");
  }
  const endpointStatements =
    resources.S3GatewayEndpoint?.Properties?.PolicyDocument?.Statement ?? [];
  const endpoint = endpointStatements
    .find((item) => item.Sid === "ExactW12RehearsalInputsAndDmsOnly");
  const endpointActions = [
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
  ];
  const endpointResources = [
    { "Fn::GetAtt": ["RehearsalProgramInputBucket", "Arn"] },
    { "Fn::Sub": "${RehearsalProgramInputBucket.Arn}/*" },
    { "Fn::GetAtt": ["RehearsalDmsBucket", "Arn"] },
    {
      "Fn::Sub":
        "${RehearsalDmsBucket.Arn}/approved-real-rehearsal/*",
    },
  ];
  if (!endpoint
    || endpoint.Principal !== "*"
    || endpoint.Condition != null
    || JSON.stringify(endpoint.Action) !== JSON.stringify(endpointActions)
    || JSON.stringify(endpoint.Resource) !== JSON.stringify(endpointResources)) {
    fail("private rehearsal S3 endpoint policy drifted");
  }
  const secretEndpoint =
    resources.SecretsManagerEndpoint?.Properties?.PolicyDocument?.Statement
      ?.find((item) => item.Sid === "W12AdminReadsExactRehearsalSecrets");
  if (!secretEndpoint
    || secretEndpoint.Principal !== "*"
    || secretEndpoint.Condition != null
    || JSON.stringify(secretEndpoint.Action) !== JSON.stringify([
      "secretsmanager:GetSecretValue",
      "secretsmanager:PutSecretValue",
    ])
    || JSON.stringify(secretEndpoint.Resource) !== JSON.stringify([
      { "Fn::GetAtt": ["Database", "MasterUserSecret.SecretArn"] },
      { Ref: "RehearsalApplicationDatabaseSecret" },
      { Ref: "RehearsalTenantContextSecret" },
    ])) {
    fail("private rehearsal Secrets Manager endpoint policy drifted");
  }
  const serialized = JSON.stringify({
    Metadata: template.Metadata,
    Parameters: Object.fromEntries(Object.entries(template.Parameters)
      .filter(([key]) => key.startsWith("W12") || key === "EnableW12LambdaEniBootstrap")),
    Conditions: {
      W12LambdaEniBootstrapEnabled:
        template.Conditions?.W12LambdaEniBootstrapEnabled,
    },
    Resources: Object.fromEntries(Object.entries(resources)
      .filter(([key]) => key.startsWith("Rehearsal")
        || ["S3GatewayEndpoint", "SecretsManagerEndpoint"].includes(key))),
    Outputs: Object.fromEntries(Object.entries(template.Outputs ?? {})
      .filter(([key]) => key.startsWith("Rehearsal") || key.startsWith("W12"))),
  });
  if (/PubliclyAccessible":true|public-read|matter-prod|amic-vault/iu.test(serialized)) {
    fail("private rehearsal template contains public or protected production material");
  }
  return Object.freeze({
    verdict: "PASS",
    template_sha256: sha256(template),
    incremental_resource_count: 10,
    new_vpc_count: 0,
    new_rds_instance_count: 0,
    isolated_database_count: 1,
    distinct_application_role_count: 1,
    object_lock_input_bucket_count: 2,
    external_email_allow_count: 0,
    public_resource_count: 0,
    production_resource_mutation_count: 0,
    monthly_cost_ceiling_krw: JSON_POSTGRES_REHEARSAL_COST_CEILING_KRW,
    incremental_cost_ceiling_krw:
      JSON_POSTGRES_REHEARSAL_INCREMENTAL_COST_CEILING_KRW,
  });
}

export function buildJsonPostgresRehearsalStackParameters({
  existingParameters,
  sourceSha,
  sourceTree,
  artifactSha256,
  artifactBucketName,
  artifactKey,
  artifactVersion,
  executionPacketSha256,
  trustRegistrySha256,
  approvalId,
  programInputBucketName,
  dmsBucketName,
  enableExistingLambdaEniBootstrap = false,
  enableW12LambdaEniBootstrap,
} = {}) {
  const parameters = {
    ...existingParameters,
    W12SourceSha: sourceSha,
    W12SourceTree: sourceTree,
    W12ArtifactBucket: artifactBucketName,
    W12ArtifactKey: artifactKey,
    W12ArtifactSha256: artifactSha256,
    W12ArtifactVersion: artifactVersion,
    W12ExecutionPacketSha256: executionPacketSha256,
    W12OwnerTrustRegistrySha256: trustRegistrySha256,
    W12ApprovalId: approvalId,
    W12ProgramInputBucketName: programInputBucketName,
    W12DmsBucketName: dmsBucketName,
    EnableLambdaEniBootstrap:
      enableExistingLambdaEniBootstrap ? "true" : "false",
    EnableW12LambdaEniBootstrap:
      enableW12LambdaEniBootstrap ? "true" : "false",
  };
  return Object.freeze(Object.entries(parameters)
    .map(([key, value]) => Object.freeze({ key, value: String(value) }))
    .sort((left, right) => left.key.localeCompare(right.key)));
}
