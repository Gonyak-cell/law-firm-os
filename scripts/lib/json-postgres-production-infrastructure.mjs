import { createHash } from "node:crypto";

export const JSON_POSTGRES_PRODUCTION_INFRASTRUCTURE_VERSION = "law-firm-os.json-postgres-production-infrastructure.v1";
export const JSON_POSTGRES_PRODUCTION_ARTIFACT_STORE_VERSION = "law-firm-os.json-postgres-production-artifact-store.v1";
export const JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW = 300_000;
export const JSON_POSTGRES_PRODUCTION_BUDGET_USD = 190;
export const JSON_POSTGRES_PRODUCTION_ENI_ACTIONS = Object.freeze([
  "ec2:CreateNetworkInterface",
  "ec2:DescribeNetworkInterfaces",
  "ec2:DescribeSubnets",
  "ec2:DeleteNetworkInterface",
  "ec2:AssignPrivateIpAddresses",
  "ec2:UnassignPrivateIpAddresses",
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function replaceStrings(value) {
  if (Array.isArray(value)) return value.map(replaceStrings);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceStrings(item)]));
  }
  if (typeof value !== "string") return value;
  return value
    .replaceAll("lawos-private-staging", "lawos-production")
    .replaceAll("lawos-staging", "lawos-production")
    .replaceAll("private staging", "production")
    .replaceAll("Private staging", "Production")
    .replaceAll("staging", "production")
    .replaceAll("Staging", "Production");
}

function statement(role, sid) {
  return role.Properties.Policies[0].PolicyDocument.Statement.find((item) => item.Sid === sid);
}

function tags() {
  return [
    { Key: "Name", Value: "lawos-production-program-input" },
    { Key: "environment", Value: "lawos-production" },
    { Key: "system", Value: "lawos" },
    { Key: "owner", Value: { Ref: "Owner" } },
    { Key: "review", Value: { Ref: "ReviewDate" } },
  ];
}

export function buildJsonPostgresProductionArtifactStoreTemplate() {
  return {
    AWSTemplateFormatVersion: "2010-09-09",
    Description: "Immutable private artifact store for exact-head LawOS production deployments.",
    Metadata: {
      schema_version: JSON_POSTGRES_PRODUCTION_ARTIFACT_STORE_VERSION,
      monthly_cost_ceiling_krw: JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW,
      data_scope: "code-artifact-only",
    },
    Parameters: {
      ArtifactBucketName: {
        Type: "String",
        AllowedPattern: "^lawos-prod-artifacts-[0-9]{12}$",
      },
      SourceSha: { Type: "String", AllowedPattern: "^[0-9a-f]{40}$" },
      SourceTree: { Type: "String", AllowedPattern: "^[0-9a-f]{40}$" },
      ExecutionPacketSha256: { Type: "String", AllowedPattern: "^[0-9a-f]{64}$" },
      Owner: { Type: "String", AllowedPattern: "^[A-Za-z0-9._@+-]{1,128}$" },
      ReviewDate: { Type: "String", AllowedPattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
    },
    Resources: {
      ArtifactKey: {
        Type: "AWS::KMS::Key",
        DeletionPolicy: "Retain",
        UpdateReplacePolicy: "Retain",
        Properties: {
          Description: "LawOS production exact-head artifact encryption key",
          EnableKeyRotation: true,
          KeyPolicy: {
            Version: "2012-10-17",
            Statement: [{
              Sid: "EnableAccountIamAuthority",
              Effect: "Allow",
              Principal: { AWS: { "Fn::Sub": "arn:${AWS::Partition}:iam::${AWS::AccountId}:root" } },
              Action: "kms:*",
              Resource: "*",
            }],
          },
          PendingWindowInDays: 30,
          Tags: [
            { Key: "Name", Value: "lawos-production-artifacts" },
            { Key: "environment", Value: "lawos-production" },
            { Key: "system", Value: "lawos" },
            { Key: "owner", Value: { Ref: "Owner" } },
            { Key: "review", Value: { Ref: "ReviewDate" } },
          ],
        },
      },
      ArtifactKeyAlias: {
        Type: "AWS::KMS::Alias",
        Properties: {
          AliasName: "alias/lawos-production-artifacts",
          TargetKeyId: { Ref: "ArtifactKey" },
        },
      },
      ArtifactBucket: {
        Type: "AWS::S3::Bucket",
        DeletionPolicy: "Retain",
        UpdateReplacePolicy: "Retain",
        Properties: {
          BucketName: { Ref: "ArtifactBucketName" },
          BucketEncryption: {
            ServerSideEncryptionConfiguration: [{
              BucketKeyEnabled: true,
              ServerSideEncryptionByDefault: {
                KMSMasterKeyID: { "Fn::GetAtt": ["ArtifactKey", "Arn"] },
                SSEAlgorithm: "aws:kms",
              },
            }],
          },
          ObjectLockEnabled: true,
          ObjectLockConfiguration: {
            ObjectLockEnabled: "Enabled",
            Rule: { DefaultRetention: { Mode: "COMPLIANCE", Days: 365 } },
          },
          OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] },
          PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
          },
          VersioningConfiguration: { Status: "Enabled" },
          Tags: [
            { Key: "Name", Value: "lawos-production-artifacts" },
            { Key: "environment", Value: "lawos-production" },
            { Key: "system", Value: "lawos" },
            { Key: "owner", Value: { Ref: "Owner" } },
            { Key: "review", Value: { Ref: "ReviewDate" } },
          ],
        },
      },
      ArtifactBucketPolicy: {
        Type: "AWS::S3::BucketPolicy",
        Properties: {
          Bucket: { Ref: "ArtifactBucket" },
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "DenyInsecureTransport",
                Effect: "Deny",
                Principal: "*",
                Action: "s3:*",
                Resource: [
                  { "Fn::GetAtt": ["ArtifactBucket", "Arn"] },
                  { "Fn::Sub": "${ArtifactBucket.Arn}/*" },
                ],
                Condition: { Bool: { "aws:SecureTransport": "false" } },
              },
              {
                Sid: "DenyWrongEncryption",
                Effect: "Deny",
                Principal: "*",
                Action: "s3:PutObject",
                Resource: { "Fn::Sub": "${ArtifactBucket.Arn}/*" },
                Condition: { StringNotEquals: { "s3:x-amz-server-side-encryption": "aws:kms" } },
              },
              {
                Sid: "DenyWrongKmsKey",
                Effect: "Deny",
                Principal: "*",
                Action: "s3:PutObject",
                Resource: { "Fn::Sub": "${ArtifactBucket.Arn}/*" },
                Condition: {
                  StringNotEquals: {
                    "s3:x-amz-server-side-encryption-aws-kms-key-id": { "Fn::GetAtt": ["ArtifactKey", "Arn"] },
                  },
                },
              },
              {
                Sid: "DenyArtifactDeletion",
                Effect: "Deny",
                Principal: "*",
                Action: ["s3:DeleteObject", "s3:DeleteObjectVersion"],
                Resource: { "Fn::Sub": "${ArtifactBucket.Arn}/*" },
              },
            ],
          },
        },
      },
    },
    Outputs: {
      ArtifactBucketName: { Value: { Ref: "ArtifactBucket" } },
      ArtifactBucketArn: { Value: { "Fn::GetAtt": ["ArtifactBucket", "Arn"] } },
      ArtifactKmsKeyArn: { Value: { "Fn::GetAtt": ["ArtifactKey", "Arn"] } },
      SourceSha: { Value: { Ref: "SourceSha" } },
      SourceTree: { Value: { Ref: "SourceTree" } },
      ExecutionPacketSha256: { Value: { Ref: "ExecutionPacketSha256" } },
    },
  };
}

export function validateJsonPostgresProductionArtifactStoreTemplate(template) {
  if (template?.Metadata?.schema_version !== JSON_POSTGRES_PRODUCTION_ARTIFACT_STORE_VERSION
    || template?.Metadata?.monthly_cost_ceiling_krw !== JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW
    || template?.Metadata?.data_scope !== "code-artifact-only") {
    fail("production artifact store metadata drifted");
  }
  const resources = template.Resources ?? {};
  if (JSON.stringify(Object.keys(resources).sort())
    !== JSON.stringify(["ArtifactBucket", "ArtifactBucketPolicy", "ArtifactKey", "ArtifactKeyAlias"].sort())) {
    fail("production artifact store resource set drifted");
  }
  const bucket = resources.ArtifactBucket?.Properties;
  if (!bucket
    || bucket.ObjectLockEnabled !== true
    || bucket.ObjectLockConfiguration?.Rule?.DefaultRetention?.Mode !== "COMPLIANCE"
    || bucket.ObjectLockConfiguration?.Rule?.DefaultRetention?.Days < 365
    || bucket.VersioningConfiguration?.Status !== "Enabled"
    || bucket.BucketEncryption?.ServerSideEncryptionConfiguration?.[0]?.ServerSideEncryptionByDefault?.SSEAlgorithm !== "aws:kms"
    || Object.values(bucket.PublicAccessBlockConfiguration ?? {}).some((value) => value !== true)) {
    fail("production artifact bucket governance drifted");
  }
  const key = resources.ArtifactKey?.Properties;
  const statements = key?.KeyPolicy?.Statement ?? [];
  if (key?.EnableKeyRotation !== true
    || statements.length !== 1
    || statements[0]?.Sid !== "EnableAccountIamAuthority"
    || statements[0]?.Action !== "kms:*"
    || statements[0]?.Resource !== "*"
    || JSON.stringify(statements[0]?.Principal)
      !== JSON.stringify({ AWS: { "Fn::Sub": "arn:${AWS::Partition}:iam::${AWS::AccountId}:root" } })) {
    fail("production artifact KMS authority drifted");
  }
  const bucketPolicy = resources.ArtifactBucketPolicy?.Properties?.PolicyDocument?.Statement ?? [];
  if (!bucketPolicy.some((item) => item.Sid === "DenyArtifactDeletion")
    || bucketPolicy.some((item) => item.Effect === "Allow")
    || JSON.stringify(template).match(/public-read|PubliclyAccessible/iu)) {
    fail("production artifact bucket policy drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    template_sha256: sha256(template),
    resource_count: 4,
    object_lock_bucket_count: 1,
    public_resource_count: 0,
    deletion_deny_count: 1,
    monthly_cost_ceiling_krw: JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW,
  });
}

function programInputBucket() {
  return {
    Type: "AWS::S3::Bucket",
    DeletionPolicy: "Retain",
    UpdateReplacePolicy: "Retain",
    Properties: {
      BucketName: { Ref: "ProgramInputBucketName" },
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [{
          BucketKeyEnabled: true,
          ServerSideEncryptionByDefault: {
            KMSMasterKeyID: { "Fn::GetAtt": ["ProductionKey", "Arn"] },
            SSEAlgorithm: "aws:kms",
          },
        }],
      },
      ObjectLockEnabled: true,
      ObjectLockConfiguration: {
        ObjectLockEnabled: "Enabled",
        Rule: { DefaultRetention: { Mode: "COMPLIANCE", Days: 365 } },
      },
      OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: { Status: "Enabled" },
      Tags: tags(),
    },
  };
}

function programInputBucketPolicy() {
  return {
    Type: "AWS::S3::BucketPolicy",
    Properties: {
      Bucket: { Ref: "ProgramInputBucket" },
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "DenyInsecureTransport",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:*",
            Resource: [
              { "Fn::GetAtt": ["ProgramInputBucket", "Arn"] },
              { "Fn::Sub": "${ProgramInputBucket.Arn}/*" },
            ],
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          },
          {
            Sid: "DenyWrongEncryption",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:PutObject",
            Resource: { "Fn::Sub": "${ProgramInputBucket.Arn}/*" },
            Condition: { StringNotEquals: { "s3:x-amz-server-side-encryption": "aws:kms" } },
          },
          {
            Sid: "DenyWrongKmsKey",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:PutObject",
            Resource: { "Fn::Sub": "${ProgramInputBucket.Arn}/*" },
            Condition: {
              StringNotEquals: {
                "s3:x-amz-server-side-encryption-aws-kms-key-id": { "Fn::GetAtt": ["ProductionKey", "Arn"] },
              },
            },
          },
          {
            Sid: "DenyProgramEvidenceDeletion",
            Effect: "Deny",
            Principal: "*",
            Action: ["s3:DeleteObject", "s3:DeleteObjectVersion"],
            Resource: [
              { "Fn::Sub": "${ProgramInputBucket.Arn}/program-approval-audit/*" },
              { "Fn::Sub": "${ProgramInputBucket.Arn}/program-execution/*" },
            ],
          },
        ],
      },
    },
  };
}

export function buildJsonPostgresProductionTemplate(stagingTemplate) {
  if (!stagingTemplate || typeof stagingTemplate !== "object" || Array.isArray(stagingTemplate)) {
    throw new TypeError("private-staging reference template is required");
  }
  const template = replaceStrings(clone(stagingTemplate));
  template.Description = "Approval-gated LawOS production PostgreSQL authority, immutable program inputs, and S3 Object Lock DMS.";
  delete template.Parameters.Cut005ApprovalId;
  delete template.Parameters.Cut006ApprovalId;
  delete template.Parameters.Cut007ApprovalId;
  delete template.Parameters.OwnerInstructionSha256;
  template.Parameters.ArtifactKey.AllowedPattern = "^lawos-production/[0-9a-f]{40}/[0-9a-f]{64}\\.zip$";
  template.Parameters.ExecutionPacketSha256 = { Type: "String", AllowedPattern: "^[0-9a-f]{64}$" };
  template.Parameters.ProgramInputBucketName = {
    Type: "String",
    AllowedPattern: "^lawos-prod-program-input-[0-9]{12}$",
  };
  template.Parameters.DmsBucketName = {
    Type: "String",
    AllowedPattern: "^lawos-prod-dms-[0-9]{12}$",
  };
  template.Parameters.PrimaryTenantId = {
    Type: "String",
    AllowedPattern: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$",
  };
  template.Parameters.ClientOutlookM365ConfigSecretName = {
    Type: "String",
    Default: "/lawos/disabled/outlook/config",
    AllowedPattern: "^/lawos/[A-Za-z0-9/_+=.@-]{1,240}$",
    Description: "Same-account Secrets Manager name for the Client Outlook provider configuration",
  };
  template.Parameters.ClientOutlookCredentialSecretPrefix = {
    Type: "String",
    Default: "/lawos/disabled/outlook/credentials/",
    AllowedPattern: "^/lawos/[A-Za-z0-9/_+=.@-]{1,230}/$",
    Description: "Same-account Secrets Manager name prefix for owner-bound delegated credentials",
  };
  template.Parameters.RuntimeGeneration = {
    Type: "Number",
    Default: 1,
    MinValue: 1,
  };
  template.Parameters.ProjectionWorkerEventJson = {
    Type: "String",
    Default: "{}",
    MaxLength: 640,
    Description:
      "Exact immutable W15 worker-event locator; schedule remains disabled until approved rollout",
  };
  template.Parameters.EnableProjectionWorker = {
    Type: "String",
    Default: "false",
    AllowedValues: ["true", "false"],
  };
  template.Parameters.HrxProjectionMappingObjectKey = {
    Type: "String",
    Default: "disabled/hrx-projection-mapping.json",
    MaxLength: 512,
    AllowedPattern: "^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$",
  };
  template.Parameters.HrxProjectionValidationObjectKey = {
    Type: "String",
    Default: "disabled/hrx-projection-validation.json",
    MaxLength: 512,
    AllowedPattern: "^[A-Za-z0-9][A-Za-z0-9._/-]{0,511}$",
  };
  template.Parameters.ProjectionWorkerLagThresholdMs = {
    Type: "Number",
    Default: 24,
    AllowedValues: [24],
    Description:
      "Exact signed W15 outbox-lag acceptance threshold in milliseconds",
  };
  template.Parameters.EnableProductionTraffic = {
    Type: "String",
    Default: "false",
    AllowedValues: ["true", "false"],
  };
  template.Parameters.MonthlyCostCeilingKrw = {
    Type: "Number",
    Default: JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW,
    AllowedValues: [JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW],
  };
  template.Conditions.ProductionTrafficEnabled = {
    "Fn::Equals": [{ Ref: "EnableProductionTraffic" }, "true"],
  };
  template.Conditions.ProjectionWorkerEnabled = {
    "Fn::Equals": [{ Ref: "EnableProjectionWorker" }, "true"],
  };
  template.Conditions.OutlookConversationWorkerConfigured = {
    "Fn::And": [
      { "Fn::Not": [{ "Fn::Equals": [
        { Ref: "ClientOutlookM365ConfigSecretName" },
        "/lawos/disabled/outlook/config",
      ] }] },
      { "Fn::Not": [{ "Fn::Equals": [
        { Ref: "ClientOutlookCredentialSecretPrefix" },
        "/lawos/disabled/outlook/credentials/",
      ] }] },
    ],
  };
  template.Conditions.OutlookConversationWorkerEnabled = {
    "Fn::And": [
      { Condition: "ProductionTrafficEnabled" },
      { "Fn::Equals": [{ Ref: "EnableOutlookConversationWorker" }, "true"] },
      { Condition: "OutlookConversationWorkerConfigured" },
    ],
  };
  template.Mappings.Network.Cidrs = {
    Vpc: "10.97.0.0/16",
    AppA: "10.97.10.0/24",
    AppB: "10.97.11.0/24",
    DbA: "10.97.20.0/24",
    DbB: "10.97.21.0/24",
  };
  const resources = template.Resources;
  resources.ProductionKey = resources.StagingKey;
  resources.ProductionKeyAlias = resources.StagingKeyAlias;
  delete resources.StagingKey;
  delete resources.StagingKeyAlias;
  delete resources.SyntheticManifestSecret;
  resources.ProjectionDatabaseSecret = clone(resources.ApplicationDatabaseSecret);
  resources.ProjectionDatabaseSecret.Properties.Description = "Structured least-privilege LawOS HRX relational projection writer credential";
  resources.ProjectionDatabaseSecret.Properties.GenerateSecretString.SecretStringTemplate =
    "{\"username\":\"lawos_hrx_projection_writer\",\"configuration_state\":\"pending_admin_bootstrap\"}";
  resources.ProjectionDatabaseSecret.Properties.Name = "/lawos/production/postgres/hrx-projection-writer";
  resources.ProjectionAuditorDatabaseSecret = clone(resources.ApplicationDatabaseSecret);
  resources.ProjectionAuditorDatabaseSecret.Properties.Description = "Structured read-only LawOS HRX relational projection auditor credential";
  resources.ProjectionAuditorDatabaseSecret.Properties.GenerateSecretString.SecretStringTemplate =
    "{\"username\":\"lawos_hrx_projection_auditor\",\"configuration_state\":\"pending_admin_bootstrap\"}";
  resources.ProjectionAuditorDatabaseSecret.Properties.Name = "/lawos/production/postgres/hrx-projection-auditor";
  template.Parameters.PasswordResetSesIdentityArn.Description = "Verified SES identity allowed to send individual production password setup messages";
  resources.PayrollArtifactSecret.Properties.Description = "Production payroll artifact key";
  const outlookConfigSecretArn = {
    "Fn::Sub": "arn:${AWS::Partition}:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${ClientOutlookM365ConfigSecretName}-*",
  };
  const outlookCredentialSecretArn = {
    "Fn::Sub": "arn:${AWS::Partition}:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${ClientOutlookCredentialSecretPrefix}*",
  };
  for (const item of resources.SecretsManagerEndpoint.Properties.PolicyDocument.Statement) {
    if (Array.isArray(item.Resource)) {
      item.Resource = item.Resource.filter((resource) => resource?.Ref !== "SyntheticManifestSecret");
      if (item.Sid === "ApiReadsExactRuntimeSecrets") {
        item.Resource.push(clone(outlookConfigSecretArn));
        item.Resource.push(clone(outlookCredentialSecretArn));
      }
      if (item.Sid === "AdminBootstrapsExactSecrets") {
        item.Resource.push({ Ref: "ProjectionDatabaseSecret" });
        item.Resource.push({ Ref: "ProjectionAuditorDatabaseSecret" });
      }
    }
  }
  resources.MicrosoftEgressBrokerLambdaEndpoint = clone(
    resources.SecretsManagerEndpoint,
  );
  resources.MicrosoftEgressBrokerLambdaEndpoint.Properties.ServiceName = {
    "Fn::Sub": "com.amazonaws.${AWS::Region}.lambda",
  };
  resources.MicrosoftEgressBrokerLambdaEndpoint.Properties.PolicyDocument = {
    Version: "2012-10-17",
    Statement: [{
      Sid: "InvokeExactMicrosoftEgressBroker",
      Effect: "Allow",
      Principal: { AWS: { "Fn::GetAtt": ["ApiExecutionRole", "Arn"] } },
      Action: "lambda:InvokeFunction",
      Resource: {
        "Fn::Sub": "arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:lawos-microsoft-egress-prod",
      },
    }],
  };
  resources.MicrosoftEgressBrokerLambdaEndpoint.Properties.Tags[0].Value =
    "lawos-production-microsoft-egress-lambda";
  resources.SecretsManagerEndpoint.Properties.PolicyDocument.Statement.push({
    Sid: "ProjectionAuditorReadsExactSecrets",
    Effect: "Allow",
    Principal: {
      AWS: { "Fn::GetAtt": ["ProjectionAuditorExecutionRole", "Arn"] },
    },
    Action: "secretsmanager:GetSecretValue",
    Resource: [
      { Ref: "ProjectionAuditorDatabaseSecret" },
      { Ref: "TenantContextSecret" },
    ],
  });
  resources.SecretsManagerEndpoint.Properties.PolicyDocument.Statement.push({
    Sid: "ProjectionWorkerReadsExactSecrets",
    Effect: "Allow",
    Principal: {
      AWS: { "Fn::GetAtt": ["ProjectionWorkerExecutionRole", "Arn"] },
    },
    Action: "secretsmanager:GetSecretValue",
    Resource: [
      { Ref: "ProjectionDatabaseSecret" },
      { Ref: "TenantContextSecret" },
    ],
  });
  resources.HttpApiDefaultRoute.Metadata.LawOSPublicRouteException = {
    scope: "production-internal-password-entry",
    reason: "first-use password setup and login must be reachable only after the signed go-live traffic gate",
    enforcement: "traffic-default-disabled rate timeout concurrency and monthly cost controls",
  };

  resources.Database.Properties = {
    ...resources.Database.Properties,
    AllocatedStorage: "20",
    AutoMinorVersionUpgrade: true,
    BackupRetentionPeriod: 35,
    DBInstanceClass: "db.t4g.micro",
    DBInstanceIdentifier: "lawos-production-postgres",
    DeletionProtection: true,
    DeleteAutomatedBackups: false,
    MaxAllocatedStorage: 100,
    MultiAZ: true,
    PreferredBackupWindow: "17:00-17:30",
    PreferredMaintenanceWindow: "sun:18:00-sun:18:30",
    PubliclyAccessible: false,
    StorageEncrypted: true,
    StorageType: "gp3",
  };
  resources.Database.DeletionPolicy = "Snapshot";
  resources.Database.UpdateReplacePolicy = "Snapshot";
  resources.DmsBucket.Properties.BucketName = { Ref: "DmsBucketName" };
  resources.DmsBucket.Properties.ObjectLockConfiguration = {
    ObjectLockEnabled: "Enabled",
    Rule: { DefaultRetention: { Mode: "GOVERNANCE", Days: 365 } },
  };
  resources.ProgramInputBucket = programInputBucket();
  resources.ProgramInputBucketPolicy = programInputBucketPolicy();

  const apiRole = resources.ApiExecutionRole;
  statement(apiRole, "ReadExactRuntimeSecrets").Resource.push(
    clone(outlookConfigSecretArn),
    clone(outlookCredentialSecretArn),
  );
  apiRole.Properties.Policies.find((policy) => policy.PolicyDocument)
    .PolicyDocument.Statement.push({
      Sid: "InvokeExactMicrosoftEgressBroker",
      Effect: "Allow",
      Action: "lambda:InvokeFunction",
      Resource: {
        "Fn::Sub": "arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:lawos-microsoft-egress-prod",
      },
    });
  const apiEmail = statement(apiRole, "SendSyntheticPasswordSetupEmail");
  apiEmail.Sid = "SendIndividualRegisteredPasswordSetupEmail";
  apiEmail.Action = "ses:SendEmail";
  apiEmail.Resource = { Ref: "PasswordResetSesIdentityArn" };
  apiEmail.Condition = {
    StringEquals: { "ses:FromAddress": { Ref: "PasswordResetFromEmail" } },
  };
  apiRole.Properties.Policies[0].PolicyDocument.Statement.splice(-1, 0, {
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
  });

  const adminRole = resources.AdminExecutionRole;
  const readSecrets = statement(adminRole, "ReadExactBootstrapSecrets");
  readSecrets.Resource = [
    { "Fn::GetAtt": ["Database", "MasterUserSecret.SecretArn"] },
    { Ref: "ApplicationDatabaseSecret" },
    { Ref: "ProjectionDatabaseSecret" },
    { Ref: "ProjectionAuditorDatabaseSecret" },
    { Ref: "TenantContextSecret" },
  ];
  const populateSecrets = statement(adminRole, "PopulateExactApplicationSecret");
  populateSecrets.Sid = "PopulateExactDatabaseSecrets";
  populateSecrets.Resource = [
    { Ref: "ApplicationDatabaseSecret" },
    { Ref: "ProjectionDatabaseSecret" },
    { Ref: "ProjectionAuditorDatabaseSecret" },
  ];
  const writeAudit = statement(adminRole, "WriteImmutableApprovalAudit");
  writeAudit.Resource = [
    { "Fn::Sub": "${ProgramInputBucket.Arn}/program-approval-audit/*" },
    { "Fn::Sub": "${ProgramInputBucket.Arn}/program-execution/*" },
  ];
  const writeRetention = statement(adminRole, "WriteImmutableApprovalAuditRetention");
  writeRetention.Resource = writeAudit.Resource;
  const adminStatements = adminRole.Properties.Policies[0].PolicyDocument.Statement;
  adminStatements.splice(adminStatements.length - 1, 0,
    {
      Sid: "ReadExactImmutableProgramInputs",
      Effect: "Allow",
      Action: ["s3:GetObjectVersion", "s3:GetObjectLegalHold", "s3:GetObjectRetention"],
      Resource: { "Fn::Sub": "${ProgramInputBucket.Arn}/*" },
    },
    {
      Sid: "ReadExactProgramInputBucketState",
      Effect: "Allow",
      Action: ["s3:GetBucketLocation", "s3:GetBucketObjectLockConfiguration", "s3:GetBucketVersioning"],
      Resource: { "Fn::GetAtt": ["ProgramInputBucket", "Arn"] },
    },
    {
      Sid: "OperateExactProductionDmsObjects",
      Effect: "Allow",
      Action: [
        "s3:GetObject", "s3:GetObjectVersion", "s3:GetObjectLegalHold", "s3:GetObjectRetention",
        "s3:PutObject", "s3:PutObjectLegalHold", "s3:PutObjectRetention",
      ],
      Resource: { "Fn::Sub": "${DmsBucket.Arn}/approved-real-migration/*" },
    },
  );

  const admin = resources.AdminFunction;
  admin.Properties.Description = "Direct-invoke, exact-packet LawOS real-data migration and production bootstrap";
  admin.Properties.Handler = "apps/api/src/json-postgres-program-admin-lambda.handler";
  admin.Properties.Timeout = 900;
  admin.Properties.ReservedConcurrentExecutions = 1;
  admin.Properties.Environment.Variables = {
    LAWOS_APPLICATION_DATABASE_SECRET_ID: { Ref: "ApplicationDatabaseSecret" },
    LAWOS_APPROVAL_AUDIT_BUCKET: { Ref: "ProgramInputBucket" },
    LAWOS_AWS_ACCOUNT_ID: { Ref: "AWS::AccountId" },
    LAWOS_DATABASE_HOST: { "Fn::GetAtt": ["Database", "Endpoint.Address"] },
    LAWOS_DATABASE_IDENTIFIER: { Ref: "Database" },
    LAWOS_DATABASE_NAME: "lawos",
    LAWOS_DATABASE_PORT: { "Fn::GetAtt": ["Database", "Endpoint.Port"] },
    LAWOS_DEPLOYMENT_ARTIFACT_SHA256: { Ref: "ArtifactSha256" },
    LAWOS_DEPLOYMENT_COMMIT: { Ref: "SourceSha" },
    LAWOS_DEPLOYMENT_TREE: { Ref: "SourceTree" },
    LAWOS_EXECUTION_PACKET_SHA256: { Ref: "ExecutionPacketSha256" },
    LAWOS_MASTER_DATABASE_SECRET_ID: { "Fn::GetAtt": ["Database", "MasterUserSecret.SecretArn"] },
    LAWOS_OWNER_TRUST_REGISTRY_SHA256: { Ref: "OwnerTrustRegistrySha256" },
    LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
    LAWOS_POSTGRES_SSL_MODE: "verify-full",
    LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: { Ref: "TenantContextSecret" },
    LAWOS_PROJECTION_DATABASE_SECRET_ID: { Ref: "ProjectionDatabaseSecret" },
    LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID: {
      Ref: "ProjectionAuditorDatabaseSecret",
    },
    LAWOS_PROGRAM_INPUT_BUCKET: { Ref: "ProgramInputBucket" },
    LAWOS_PROGRAM_INPUT_KMS_KEY_ARN: { "Fn::GetAtt": ["ProductionKey", "Arn"] },
    LAWOS_RUNTIME_PROFILE: "operational",
    LAWOS_RUNTIME_GENERATION: { Ref: "RuntimeGeneration" },
    LAWOS_STAFF_AUTHORITY: "internal-password",
    NODE_EXTRA_CA_CERTS: "/var/task/certs/global-bundle.pem",
  };

  resources.ProjectionAuditorLogGroup = clone(resources.AdminLogGroup);
  resources.ProjectionAuditorLogGroup.Properties.LogGroupName =
    "/aws/lambda/lawos-production-projection-auditor";
  resources.ProjectionAuditorExecutionRole = {
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
      Description:
        "Dedicated LawOS production read-only HRX projection auditor role",
      Policies: [
        {
          PolicyName: "lawos-production-projection-auditor-runtime",
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "WriteExactProjectionAuditorLogGroup",
                Effect: "Allow",
                Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
                Resource: {
                  "Fn::Sub":
                    "arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/lawos-production-projection-auditor:*",
                },
              },
              {
                Sid: "ReadExactProjectionAuditorSecrets",
                Effect: "Allow",
                Action: "secretsmanager:GetSecretValue",
                Resource: [
                  { Ref: "ProjectionAuditorDatabaseSecret" },
                  { Ref: "TenantContextSecret" },
                ],
              },
              {
                Sid: "ReadExactProjectionProgramInputs",
                Effect: "Allow",
                Action: [
                  "s3:GetObjectVersion",
                  "s3:GetObjectLegalHold",
                  "s3:GetObjectRetention",
                ],
                Resource: { "Fn::Sub": "${ProgramInputBucket.Arn}/*" },
              },
              {
                Sid: "ReadProjectionProgramInputBucketState",
                Effect: "Allow",
                Action: [
                  "s3:GetBucketLocation",
                  "s3:GetBucketObjectLockConfiguration",
                  "s3:GetBucketVersioning",
                ],
                Resource: { "Fn::GetAtt": ["ProgramInputBucket", "Arn"] },
              },
              {
                Sid: "WriteImmutableProjectionValidationEvidence",
                Effect: "Allow",
                Action: ["s3:PutObject", "s3:PutObjectRetention"],
                Resource: [
                  {
                    "Fn::Sub":
                      "${ProgramInputBucket.Arn}/program-approval-audit/*",
                  },
                  {
                    "Fn::Sub":
                      "${ProgramInputBucket.Arn}/program-execution/*",
                  },
                ],
              },
              {
                Sid: "UseExactProductionKeyForProjectionAudit",
                Effect: "Allow",
                Action: [
                  "kms:Decrypt",
                  "kms:Encrypt",
                  "kms:GenerateDataKey",
                  "kms:DescribeKey",
                ],
                Resource: { "Fn::GetAtt": ["ProductionKey", "Arn"] },
              },
              {
                Sid: "DenyFunctionCodeEc2Networking",
                Effect: "Deny",
                Action: [
                  "ec2:CreateNetworkInterface",
                  "ec2:DescribeNetworkInterfaces",
                  "ec2:DescribeSubnets",
                  "ec2:DeleteNetworkInterface",
                  "ec2:DetachNetworkInterface",
                  "ec2:AssignPrivateIpAddresses",
                  "ec2:UnassignPrivateIpAddresses",
                ],
                Resource: "*",
                Condition: {
                  ArnEquals: {
                    "lambda:SourceFunctionArn": {
                      "Fn::Sub":
                        "arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:lawos-production-projection-auditor",
                    },
                  },
                },
              },
            ],
          },
        },
        {
          "Fn::If": [
            "LambdaEniBootstrapEnabled",
            {
              PolicyName:
                "lawos-production-projection-auditor-vpc-eni-bootstrap-temporary",
              PolicyDocument: {
                Version: "2012-10-17",
                Statement: [{
                  Sid: "LambdaVpcEniBootstrap",
                  Effect: "Allow",
                  Action: JSON_POSTGRES_PRODUCTION_ENI_ACTIONS,
                  Resource: "*",
                }],
              },
            },
            { Ref: "AWS::NoValue" },
          ],
        },
      ],
      RoleName: "lawos-production-projection-auditor-role",
      Tags: tags(),
    },
  };
  resources.ProjectionAuditorFunction = {
    Type: "AWS::Lambda::Function",
    DependsOn: ["ProjectionAuditorLogGroup"],
    Properties: {
      Architectures: ["arm64"],
      Code: clone(admin.Properties.Code),
      Description:
        "Direct-invoke read-only LawOS HRX relational projection auditor",
      Environment: {
        Variables: {
          LAWOS_APPROVAL_AUDIT_BUCKET: { Ref: "ProgramInputBucket" },
          LAWOS_AWS_ACCOUNT_ID: { Ref: "AWS::AccountId" },
          LAWOS_DATABASE_HOST: {
            "Fn::GetAtt": ["Database", "Endpoint.Address"],
          },
          LAWOS_DATABASE_IDENTIFIER: { Ref: "Database" },
          LAWOS_DATABASE_NAME: "lawos",
          LAWOS_DATABASE_PORT: {
            "Fn::GetAtt": ["Database", "Endpoint.Port"],
          },
          LAWOS_DEPLOYMENT_ARTIFACT_SHA256: { Ref: "ArtifactSha256" },
          LAWOS_DEPLOYMENT_COMMIT: { Ref: "SourceSha" },
          LAWOS_DEPLOYMENT_TREE: { Ref: "SourceTree" },
          LAWOS_EXECUTION_PACKET_SHA256: { Ref: "ExecutionPacketSha256" },
          LAWOS_OWNER_TRUST_REGISTRY_SHA256: {
            Ref: "OwnerTrustRegistrySha256",
          },
          LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
          LAWOS_POSTGRES_SSL_MODE: "verify-full",
          LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID: {
            Ref: "TenantContextSecret",
          },
          LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID: {
            Ref: "ProjectionAuditorDatabaseSecret",
          },
          LAWOS_PROGRAM_EXECUTION_ROLE: "projection-auditor",
          LAWOS_PROGRAM_INPUT_BUCKET: { Ref: "ProgramInputBucket" },
          LAWOS_PROGRAM_INPUT_KMS_KEY_ARN: {
            "Fn::GetAtt": ["ProductionKey", "Arn"],
          },
          LAWOS_RUNTIME_PROFILE: "operational",
          NODE_EXTRA_CA_CERTS: "/var/task/certs/global-bundle.pem",
        },
      },
      FunctionName: "lawos-production-projection-auditor",
      Handler: "apps/api/src/json-postgres-program-admin-lambda.handler",
      KmsKeyArn: { "Fn::GetAtt": ["ProductionKey", "Arn"] },
      MemorySize: 2048,
      ReservedConcurrentExecutions: 1,
      Role: {
        "Fn::GetAtt": ["ProjectionAuditorExecutionRole", "Arn"],
      },
      Runtime: "nodejs22.x",
      Timeout: 900,
      VpcConfig: clone(admin.Properties.VpcConfig),
      Tags: tags(),
    },
  };
  resources.ProjectionWorkerLogGroup = clone(resources.ProjectionAuditorLogGroup);
  resources.ProjectionWorkerLogGroup.Properties.LogGroupName =
    "/aws/lambda/lawos-production-projection-worker";
  resources.ProjectionWorkerExecutionRole = clone(
    resources.ProjectionAuditorExecutionRole,
  );
  resources.ProjectionWorkerExecutionRole.Properties.Description =
    "Dedicated LawOS production HRX incremental projection writer role";
  resources.ProjectionWorkerExecutionRole.Properties.RoleName =
    "lawos-production-projection-worker-role";
  const workerPolicies =
    resources.ProjectionWorkerExecutionRole.Properties.Policies;
  workerPolicies[0].PolicyName =
    "lawos-production-projection-worker-runtime";
  for (const item of workerPolicies[0].PolicyDocument.Statement) {
    if (item.Sid === "WriteExactProjectionAuditorLogGroup") {
      item.Sid = "WriteExactProjectionWorkerLogGroup";
      item.Resource = {
        "Fn::Sub":
          "arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/lawos-production-projection-worker:*",
      };
    } else if (item.Sid === "ReadExactProjectionAuditorSecrets") {
      item.Sid = "ReadExactProjectionWorkerSecrets";
      item.Resource = [
        { Ref: "ProjectionDatabaseSecret" },
        { Ref: "TenantContextSecret" },
      ];
    } else if (item.Sid === "ReadExactProjectionProgramInputs") {
      item.Sid = "ReadExactProjectionWorkerProgramInputs";
    } else if (item.Sid === "ReadProjectionProgramInputBucketState") {
      item.Sid = "ReadProjectionWorkerProgramInputBucketState";
    } else if (item.Sid === "WriteImmutableProjectionValidationEvidence") {
      item.Sid = "WriteImmutableProjectionWorkerEvidence";
    } else if (item.Sid === "UseExactProductionKeyForProjectionAudit") {
      item.Sid = "UseExactProductionKeyForProjectionWorker";
    } else if (item.Sid === "DenyFunctionCodeEc2Networking") {
      item.Condition.ArnEquals["lambda:SourceFunctionArn"] = {
        "Fn::Sub":
          "arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:lawos-production-projection-worker",
      };
    }
  }
  workerPolicies[0].PolicyDocument.Statement.push({
    Sid: "ReadImmutableProgramExecutionEvidence",
    Effect: "Allow",
    Action: "s3:GetObject",
    Resource: {
      "Fn::Sub": "${ProgramInputBucket.Arn}/program-execution/*",
    },
  });
  workerPolicies[0].PolicyDocument.Statement.push({
    Sid: "SendOnlyProjectionWorkerFailuresToExactDeadLetterQueue",
    Effect: "Allow",
    Action: "sqs:SendMessage",
    Resource: {
      "Fn::GetAtt": ["ProjectionWorkerDeadLetterQueue", "Arn"],
    },
  });
  workerPolicies[1]["Fn::If"][1].PolicyName =
    "lawos-production-projection-worker-vpc-eni-bootstrap-temporary";
  resources.ProjectionWorkerFunction = clone(resources.ProjectionAuditorFunction);
  resources.ProjectionWorkerFunction.DependsOn = ["ProjectionWorkerLogGroup"];
  resources.ProjectionWorkerFunction.Properties.Description =
    "Exact-packet LawOS HRX incremental projection worker; disabled by default";
  resources.ProjectionWorkerFunction.Properties.FunctionName =
    "lawos-production-projection-worker";
  resources.ProjectionWorkerFunction.Properties.Role = {
    "Fn::GetAtt": ["ProjectionWorkerExecutionRole", "Arn"],
  };
  const workerEnvironment =
    resources.ProjectionWorkerFunction.Properties.Environment.Variables;
  delete workerEnvironment.LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID;
  workerEnvironment.LAWOS_PROJECTION_DATABASE_SECRET_ID = {
    Ref: "ProjectionDatabaseSecret",
  };
  workerEnvironment.LAWOS_PROGRAM_EXECUTION_ROLE = "projection-writer";
  resources.ProjectionWorkerDeadLetterQueue = {
    Type: "AWS::SQS::Queue",
    Properties: {
      MessageRetentionPeriod: 1_209_600,
      QueueName: "lawos-production-projection-worker-dead-letter",
      SqsManagedSseEnabled: true,
      Tags: clone(resources.ProjectionWorkerLogGroup.Properties.Tags),
    },
  };
  resources.ProjectionWorkerSchedule = {
    Type: "AWS::Events::Rule",
    Properties: {
      Description:
        "W15 HRX incremental projection worker; enabled only after signed backfill acceptance",
      Name: "lawos-production-projection-worker",
      ScheduleExpression: "rate(5 minutes)",
      State: {
        "Fn::If": ["ProjectionWorkerEnabled", "ENABLED", "DISABLED"],
      },
      Targets: [{
        Arn: { "Fn::GetAtt": ["ProjectionWorkerFunction", "Arn"] },
        DeadLetterConfig: {
          Arn: {
            "Fn::GetAtt": ["ProjectionWorkerDeadLetterQueue", "Arn"],
          },
        },
        Id: "lawos-production-projection-worker",
        Input: { Ref: "ProjectionWorkerEventJson" },
        RetryPolicy: {
          MaximumEventAgeInSeconds: 900,
          MaximumRetryAttempts: 2,
        },
      }],
    },
  };
  resources.ProjectionWorkerDeadLetterQueuePolicy = {
    Type: "AWS::SQS::QueuePolicy",
    Properties: {
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [{
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
        }],
      },
      Queues: [{ Ref: "ProjectionWorkerDeadLetterQueue" }],
    },
  };
  resources.ProjectionWorkerEventInvokeConfig = {
    Type: "AWS::Lambda::EventInvokeConfig",
    Properties: {
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
  };
  resources.ProjectionWorkerInvokePermission = {
    Type: "AWS::Lambda::Permission",
    Properties: {
      Action: "lambda:InvokeFunction",
      FunctionName: { Ref: "ProjectionWorkerFunction" },
      Principal: "events.amazonaws.com",
      SourceArn: { "Fn::GetAtt": ["ProjectionWorkerSchedule", "Arn"] },
    },
  };
  const workerAlarmTags = clone(resources.ApiErrorAlarm.Properties.Tags);
  resources.ProjectionWorkerErrorAlarm = {
    Type: "AWS::CloudWatch::Alarm",
    Properties: {
      AlarmDescription:
        "LawOS W15 projection worker function execution errors",
      AlarmName: "lawos-production-projection-worker-errors",
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      Dimensions: [{
        Name: "FunctionName",
        Value: { Ref: "ProjectionWorkerFunction" },
      }],
      EvaluationPeriods: 1,
      MetricName: "Errors",
      Namespace: "AWS/Lambda",
      Period: 300,
      Statistic: "Sum",
      Threshold: 1,
      TreatMissingData: "notBreaching",
      Tags: workerAlarmTags,
    },
  };
  resources.ProjectionWorkerDeliveryFailureAlarm = {
    Type: "AWS::CloudWatch::Alarm",
    Properties: {
      AlarmDescription:
        "LawOS W15 projection worker EventBridge delivery failures",
      AlarmName: "lawos-production-projection-worker-delivery-failures",
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      Dimensions: [{
        Name: "RuleName",
        Value: { Ref: "ProjectionWorkerSchedule" },
      }],
      EvaluationPeriods: 1,
      MetricName: "FailedInvocations",
      Namespace: "AWS/Events",
      Period: 300,
      Statistic: "Sum",
      Threshold: 1,
      TreatMissingData: "notBreaching",
      Tags: clone(workerAlarmTags),
    },
  };
  const apiEnvironment =
    resources.ApiFunction.Properties.Environment.Variables;
  apiEnvironment.LAWOS_AWS_ACCOUNT_ID = { Ref: "AWS::AccountId" };
  apiEnvironment.LAWOS_EXECUTION_PACKET_SHA256 = {
    Ref: "ExecutionPacketSha256",
  };
  apiEnvironment.LAWOS_HRX_RELATIONAL_PROJECTION_ENABLED = {
    "Fn::If": ["ProjectionWorkerEnabled", "true", "false"],
  };
  apiEnvironment.LAWOS_HRX_RELATIONAL_PROJECTION_EVENT_LOCATOR = {
    Ref: "ProjectionWorkerEventJson",
  };
  apiEnvironment.LAWOS_PROGRAM_INPUT_BUCKET = {
    Ref: "ProgramInputBucket",
  };
  apiEnvironment.LAWOS_PROGRAM_INPUT_KMS_KEY_ARN = {
    "Fn::GetAtt": ["ProductionKey", "Arn"],
  };
  resources.ProjectionWorkerDeadLetterAlarm = {
    Type: "AWS::CloudWatch::Alarm",
    Properties: {
      AlarmDescription:
        "LawOS W15 projection worker dead-letter queue is non-empty",
      AlarmName: "lawos-production-projection-worker-dead-letter",
      ComparisonOperator: "GreaterThanOrEqualToThreshold",
      Dimensions: [{
        Name: "QueueName",
        Value: {
          "Fn::GetAtt": ["ProjectionWorkerDeadLetterQueue", "QueueName"],
        },
      }],
      EvaluationPeriods: 1,
      MetricName: "ApproximateNumberOfMessagesVisible",
      Namespace: "AWS/SQS",
      Period: 300,
      Statistic: "Maximum",
      Threshold: 1,
      TreatMissingData: "notBreaching",
      Tags: clone(workerAlarmTags),
    },
  };
  resources.ProjectionWorkerLagAlarm = {
    Type: "AWS::CloudWatch::Alarm",
    Properties: {
      AlarmDescription:
        "LawOS W15 projection worker exceeds the signed outbox-lag threshold",
      AlarmName: "lawos-production-projection-worker-lag",
      ComparisonOperator: "GreaterThanThreshold",
      Dimensions: [{
        Name: "Worker",
        Value: "relational-projection",
      }],
      EvaluationPeriods: 1,
      MetricName: "OutboxLagMilliseconds",
      Namespace: "LawOS/W15",
      Period: 300,
      Statistic: "Maximum",
      Threshold: { Ref: "ProjectionWorkerLagThresholdMs" },
      TreatMissingData: "notBreaching",
      Tags: clone(workerAlarmTags),
    },
  };

  const api = resources.ApiFunction;
  const apiEnv = api.Properties.Environment.Variables;
  api.Properties.Description = "Exact-main LawOS production API with PostgreSQL-only authority";
  apiEnv.LAWOS_DATA_SCOPE = "approved-real-manifest";
  apiEnv.LAWOS_DMS_S3_DEFAULT_RETENTION_DAYS = "365";
  apiEnv.LAWOS_IDENTITY_TENANT_ID = { Ref: "PrimaryTenantId" };
  apiEnv.LAWOS_GRAPH_NOTIFICATION_URL = {
    "Fn::Sub": "${HttpApi.ApiEndpoint}/api/outlook/graph/notifications",
  };
  apiEnv.LAWOS_CLIENT_OUTLOOK_M365_CONFIG_SECRET_ID = {
    Ref: "ClientOutlookM365ConfigSecretName",
  };
  apiEnv.LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED = {
    "Fn::If": ["OutlookConversationWorkerEnabled", "true", "false"],
  };
  apiEnv.LAWOS_CLIENT_OUTLOOK_PROVIDER_RUNTIME_ENABLED = {
    "Fn::If": ["OutlookConversationWorkerEnabled", "true", "false"],
  };
  apiEnv.LAWOS_CLIENT_OUTLOOK_INQUIRY_ENABLED = "false";
  apiEnv.LAWOS_AUTH_PASSWORD_RESET_TTL_MS = "900000";
  delete apiEnv.LAWOS_OWNER_INSTRUCTION_SHA256;
  delete apiEnv.LAWOS_SYNTHETIC_MANIFEST_SECRET_ID;
  resources.PasswordResetWorkerSchedule.Properties.Description = "Drains durable individual production password-reset jobs";
  resources.PasswordResetWorkerSchedule.Properties.ScheduleExpression = "rate(1 minute)";
  resources.PasswordResetWorkerSchedule.Properties.State = {
    "Fn::If": ["ProductionTrafficEnabled", "ENABLED", "DISABLED"],
  };
  resources.OutlookConversationWorkerSchedule.Properties.Description =
    "Drains durable production Outlook conversation jobs after explicit provider enablement";
  resources.OutlookConversationWorkerSchedule.Properties.ScheduleExpression =
    "rate(1 minute)";
  resources.OutlookConversationWorkerSchedule.Properties.State = {
    "Fn::If": ["OutlookConversationWorkerEnabled", "ENABLED", "DISABLED"],
  };
  resources.HttpApi.Properties.Description = "LawOS production API; disabled until signed go-live activation";
  resources.HttpApi.Properties.DisableExecuteApiEndpoint = {
    "Fn::If": ["ProductionTrafficEnabled", false, true],
  };
  resources.HttpApiStage.Properties.DefaultRouteSettings.ThrottlingRateLimit = 5;
  resources.HttpApiStage.Properties.DefaultRouteSettings.ThrottlingBurstLimit = 50;
  const endpointStatement = resources.SesApiEndpoint.Properties.PolicyDocument.Statement[0];
  endpointStatement.Sid = "ProductionIndividualPasswordSetupOnly";
  endpointStatement.Principal = { AWS: { "Fn::Sub": "arn:${AWS::Partition}:iam::${AWS::AccountId}:root" } };
  endpointStatement.Action = "ses:SendEmail";
  endpointStatement.Resource = "*";
  endpointStatement.Condition = {
    StringEquals: { "aws:SourceVpc": { Ref: "Vpc" } },
  };
  resources.S3GatewayEndpoint.Properties.PolicyDocument.Statement.push({
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
  });

  resources.ApiLogGroup.Properties.RetentionInDays = 365;
  resources.AdminLogGroup.Properties.RetentionInDays = 365;
  resources.ProjectionAuditorLogGroup.Properties.RetentionInDays = 365;
  resources.ProjectionWorkerLogGroup.Properties.RetentionInDays = 365;
  resources.MonthlyCostBudget.Properties.Budget.BudgetLimit.Amount = JSON_POSTGRES_PRODUCTION_BUDGET_USD;
  resources.MonthlyCostBudget.Properties.Budget.BudgetName = "lawos-production-monthly";
  resources.MonthlyCostBudget.Properties.Budget.CostFilters.TagKeyValue = ["user:environment$lawos-production"];
  template.Metadata = {
    schema_version: JSON_POSTGRES_PRODUCTION_INFRASTRUCTURE_VERSION,
    monthly_cost_ceiling_krw: JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW,
    operational_authority: "postgres-v2",
    json_fallback: false,
    dual_write: false,
    offline_capability: "rejected",
    production_traffic_default: false,
  };
  template.Outputs.ProgramInputBucketName = { Value: { Ref: "ProgramInputBucket" } };
  template.Outputs.ProgramInputKmsKeyArn = { Value: { "Fn::GetAtt": ["ProductionKey", "Arn"] } };
  template.Outputs.ExecutionPacketSha256 = { Value: { Ref: "ExecutionPacketSha256" } };
  template.Outputs.ProjectionDatabaseSecretArn = { Value: { Ref: "ProjectionDatabaseSecret" } };
  template.Outputs.ProjectionAuditorDatabaseSecretArn = {
    Value: { Ref: "ProjectionAuditorDatabaseSecret" },
  };
  template.Outputs.ProjectionAuditorFunctionName = {
    Value: { Ref: "ProjectionAuditorFunction" },
  };
  template.Outputs.ProjectionWorkerFunctionName = {
    Value: { Ref: "ProjectionWorkerFunction" },
  };
  template.Outputs.ProjectionWorkerScheduleName = {
    Value: { Ref: "ProjectionWorkerSchedule" },
  };
  template.Outputs.ProjectionWorkerDeadLetterQueueArn = {
    Value: {
      "Fn::GetAtt": ["ProjectionWorkerDeadLetterQueue", "Arn"],
    },
  };
  template.Outputs.DatabaseIdentifier = { Value: { Ref: "Database" } };
  template.Outputs.DatabaseEndpointAddress = { Value: { "Fn::GetAtt": ["Database", "Endpoint.Address"] } };
  template.Outputs.DatabaseSubnetGroupName = { Value: { Ref: "DatabaseSubnetGroup" } };
  template.Outputs.DatabaseSecurityGroupId = { Value: { Ref: "DatabaseSecurityGroup" } };
  template.Outputs.AdminFunctionName = { Value: { Ref: "AdminFunction" } };
  template.Outputs.ApiFunctionName = { Value: { Ref: "ApiFunction" } };
  template.Outputs.HttpApiId = { Value: { Ref: "HttpApi" } };
  template.Outputs.DmsBucketName = { Value: { Ref: "DmsBucket" } };
  template.Outputs.ProductionTrafficEnabled = {
    Value: { "Fn::If": ["ProductionTrafficEnabled", "true", "false"] },
  };
  return template;
}

function policyStatements(role) {
  return (role?.Properties?.Policies ?? []).flatMap((policy) =>
    policy?.PolicyDocument?.Statement
    ?? policy?.["Fn::If"]?.[1]?.PolicyDocument?.Statement
    ?? []);
}

export function validateJsonPostgresProductionTemplate(template) {
  if (!template || typeof template !== "object" || Array.isArray(template)) fail("production template is required");
  const serialized = JSON.stringify(template);
  if (/synthetic|lawos-private-staging|amic-vault|matter-lawos-api-prod/iu.test(serialized)) {
    fail("production template contains staging, synthetic, or protected-resource material");
  }
  if (Buffer.byteLength(serialized) > 1_000_000) fail("production template exceeds the CloudFormation template URL limit");
  if (template.Metadata?.schema_version !== JSON_POSTGRES_PRODUCTION_INFRASTRUCTURE_VERSION
    || template.Metadata?.monthly_cost_ceiling_krw !== JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW
    || template.Metadata?.operational_authority !== "postgres-v2"
    || template.Metadata?.json_fallback !== false
    || template.Metadata?.dual_write !== false
    || template.Metadata?.offline_capability !== "rejected"
    || template.Metadata?.production_traffic_default !== false) {
    fail("production template authority metadata drifted");
  }
  if (template.Parameters?.EnableLambdaEniBootstrap?.Default !== "false"
    || template.Parameters?.EnableProductionTraffic?.Default !== "false"
    || template.Parameters?.RuntimeGeneration?.Type !== "Number"
    || template.Parameters?.RuntimeGeneration?.Default !== 1
    || template.Parameters?.RuntimeGeneration?.MinValue !== 1
    || template.Parameters?.MonthlyCostCeilingKrw?.Default !== JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW) {
    fail("production safety parameters drifted");
  }
  const resources = template.Resources ?? {};
  const forbiddenNetwork = Object.values(resources).filter((resource) =>
    ["AWS::EC2::InternetGateway", "AWS::EC2::NatGateway", "AWS::EC2::EIP"].includes(resource.Type));
  if (forbiddenNetwork.length > 0) fail("production template creates public routing");
  const subnets = Object.values(resources).filter((resource) => resource.Type === "AWS::EC2::Subnet");
  if (subnets.length !== 4 || subnets.some((resource) => resource.Properties.MapPublicIpOnLaunch !== false)) {
    fail("production subnets must all be private");
  }
  const database = resources.Database?.Properties;
  if (!database || database.PubliclyAccessible !== false || database.MultiAZ !== true
    || database.DeletionProtection !== true || database.StorageEncrypted !== true
    || database.BackupRetentionPeriod < 35 || database.DeleteAutomatedBackups !== false) {
    fail("production RDS durability or private-network contract drifted");
  }
  for (const logicalId of ["DmsBucket", "ProgramInputBucket"]) {
    const bucket = resources[logicalId]?.Properties;
    if (!bucket || bucket.ObjectLockEnabled !== true
      || bucket.VersioningConfiguration?.Status !== "Enabled"
      || bucket.BucketEncryption?.ServerSideEncryptionConfiguration?.[0]?.ServerSideEncryptionByDefault?.SSEAlgorithm !== "aws:kms"
      || Object.values(bucket.PublicAccessBlockConfiguration ?? {}).some((value) => value !== true)) {
      fail(`${logicalId} governance contract drifted`);
    }
  }
  if (resources.AdminFunction?.Properties?.Handler !== "apps/api/src/json-postgres-program-admin-lambda.handler"
    || resources.AdminFunction?.Properties?.ReservedConcurrentExecutions !== 1
    || !resources.ProjectionDatabaseSecret
    || !resources.ProjectionAuditorDatabaseSecret
    || resources.ProjectionDatabaseSecret.Properties?.GenerateSecretString?.SecretStringTemplate
      !== "{\"username\":\"lawos_hrx_projection_writer\",\"configuration_state\":\"pending_admin_bootstrap\"}"
    || resources.ProjectionAuditorDatabaseSecret.Properties?.GenerateSecretString?.SecretStringTemplate
      !== "{\"username\":\"lawos_hrx_projection_auditor\",\"configuration_state\":\"pending_admin_bootstrap\"}"
    || resources.AdminFunction?.Properties?.Environment?.Variables?.LAWOS_PROJECTION_DATABASE_SECRET_ID?.Ref
      !== "ProjectionDatabaseSecret"
    || resources.AdminFunction?.Properties?.Environment?.Variables?.LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID?.Ref
      !== "ProjectionAuditorDatabaseSecret"
    || resources.ProjectionAuditorFunction?.Properties?.Handler
      !== "apps/api/src/json-postgres-program-admin-lambda.handler"
    || resources.ProjectionAuditorFunction?.Properties?.MemorySize !== 2048
    || resources.ProjectionAuditorFunction?.Properties?.ReservedConcurrentExecutions
      !== 1
    || resources.ProjectionAuditorFunction?.Properties?.Environment?.Variables
      ?.LAWOS_PROGRAM_EXECUTION_ROLE !== "projection-auditor"
    || resources.ProjectionAuditorFunction?.Properties?.Environment?.Variables
      ?.LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID?.Ref
      !== "ProjectionAuditorDatabaseSecret"
    || resources.ProjectionAuditorFunction?.Properties?.Environment?.Variables
      ?.LAWOS_MASTER_DATABASE_SECRET_ID != null
    || resources.ProjectionAuditorFunction?.Properties?.Environment?.Variables
      ?.LAWOS_PROJECTION_DATABASE_SECRET_ID != null
    || resources.ProjectionWorkerFunction?.Properties?.Handler
      !== "apps/api/src/json-postgres-program-admin-lambda.handler"
    || resources.ProjectionWorkerFunction?.Properties?.MemorySize !== 2048
    || resources.ProjectionWorkerFunction?.Properties?.ReservedConcurrentExecutions
      !== 1
    || resources.ProjectionWorkerFunction?.Properties?.Environment?.Variables
      ?.LAWOS_PROGRAM_EXECUTION_ROLE !== "projection-writer"
    || resources.ProjectionWorkerFunction?.Properties?.Environment?.Variables
      ?.LAWOS_PROJECTION_DATABASE_SECRET_ID?.Ref
      !== "ProjectionDatabaseSecret"
    || resources.ProjectionWorkerFunction?.Properties?.Environment?.Variables
      ?.LAWOS_MASTER_DATABASE_SECRET_ID != null
    || resources.ProjectionWorkerFunction?.Properties?.Environment?.Variables
      ?.LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID != null
    || resources.ApiFunction?.Properties?.Environment?.Variables?.LAWOS_PERSISTENCE_AUTHORITY !== "postgres-v2"
    || resources.ApiFunction?.Properties?.Environment?.Variables?.LAWOS_RUNTIME_PROFILE !== "operational"
    || resources.ApiFunction?.Properties?.Environment?.Variables
      ?.LAWOS_HRX_RELATIONAL_PROJECTION_ENABLED?.["Fn::If"]?.[0]
      !== "ProjectionWorkerEnabled"
    || resources.ApiFunction?.Properties?.Environment?.Variables
      ?.LAWOS_HRX_RELATIONAL_PROJECTION_EVENT_LOCATOR?.Ref
      !== "ProjectionWorkerEventJson"
    || resources.ApiFunction?.Properties?.Environment?.Variables
      ?.LAWOS_HRX_RELATIONAL_PROJECTION_MAPPING_OBJECT_KEY != null
    || resources.ApiFunction?.Properties?.Environment?.Variables
      ?.LAWOS_HRX_RELATIONAL_PROJECTION_VALIDATION_OBJECT_KEY != null
    || resources.ApiFunction?.Properties?.Environment?.Variables
      ?.LAWOS_EXECUTION_PACKET_SHA256?.Ref
      !== "ExecutionPacketSha256") {
    fail("production Lambda authority contract drifted");
  }
  const outputs = template.Outputs ?? {};
  if (outputs.DatabaseIdentifier?.Value?.Ref !== "Database"
    || outputs.DatabaseEndpointAddress?.Value?.["Fn::GetAtt"]?.[0] !== "Database"
    || outputs.DatabaseSubnetGroupName?.Value?.Ref !== "DatabaseSubnetGroup"
    || outputs.DatabaseSecurityGroupId?.Value?.Ref !== "DatabaseSecurityGroup"
    || outputs.AdminFunctionName?.Value?.Ref !== "AdminFunction"
    || outputs.ProjectionAuditorFunctionName?.Value?.Ref
      !== "ProjectionAuditorFunction"
    || outputs.ProjectionWorkerFunctionName?.Value?.Ref
      !== "ProjectionWorkerFunction"
    || outputs.ProjectionWorkerScheduleName?.Value?.Ref
      !== "ProjectionWorkerSchedule"
    || outputs.ProjectionWorkerDeadLetterQueueArn?.Value
      ?.["Fn::GetAtt"]?.[0] !== "ProjectionWorkerDeadLetterQueue"
    || outputs.ApiFunctionName?.Value?.Ref !== "ApiFunction"
    || outputs.DmsBucketName?.Value?.Ref !== "DmsBucket"
    || resources.AdminFunction?.Properties?.Environment?.Variables?.LAWOS_DATABASE_IDENTIFIER?.Ref !== "Database") {
    fail("production DR/runtime outputs drifted");
  }
  const roles = [
    resources.ApiExecutionRole,
    resources.AdminExecutionRole,
    resources.ProjectionAuditorExecutionRole,
    resources.ProjectionWorkerExecutionRole,
  ];
  if (roles.some((role) => !role)
    || new Set(roles.map((role) => role.Properties.RoleName)).size
      !== roles.length) {
    fail("production Lambda roles must be present and separate");
  }
  let temporaryEniAllowCount = 0;
  let sourceFunctionDenyCount = 0;
  for (const role of roles) {
    for (const item of role.Properties.Policies ?? []) {
      const conditional = item?.["Fn::If"];
      if (conditional) {
        if (conditional[0] !== "LambdaEniBootstrapEnabled") fail("unexpected conditional IAM policy");
        const allow = conditional[1]?.PolicyDocument?.Statement?.[0];
        if (allow?.Effect !== "Allow"
          || allow?.Resource !== "*"
          || JSON.stringify(allow.Action) !== JSON.stringify(JSON_POSTGRES_PRODUCTION_ENI_ACTIONS)) {
          fail("temporary ENI bootstrap policy drifted");
        }
        temporaryEniAllowCount += 1;
      }
    }
    for (const item of policyStatements(role)) {
      if (item.Sid === "DenyFunctionCodeEc2Networking"
        && item.Effect === "Deny"
        && item.Resource === "*"
        && item.Condition?.ArnEquals?.["lambda:SourceFunctionArn"]) {
        sourceFunctionDenyCount += 1;
      }
      if (item.Effect === "Allow"
        && item.Resource === "*"
        && item.Sid !== "LambdaVpcEniBootstrap") {
        fail(`unapproved IAM wildcard Allow: ${item.Sid ?? "unnamed"}`);
      }
    }
  }
  if (temporaryEniAllowCount !== 4 || sourceFunctionDenyCount !== 4) {
    fail("production ENI bootstrap or explicit Deny contract is incomplete");
  }
  const brokerArn =
    "arn:${AWS::Partition}:lambda:${AWS::Region}:${AWS::AccountId}:function:lawos-microsoft-egress-prod";
  const brokerInvoke = policyStatements(resources.ApiExecutionRole)
    .find(({ Sid }) => Sid === "InvokeExactMicrosoftEgressBroker");
  const runtimeSecrets = policyStatements(resources.ApiExecutionRole)
    .find(({ Sid }) => Sid === "ReadExactRuntimeSecrets")?.Resource ?? [];
  const endpointRuntimeSecrets = resources.SecretsManagerEndpoint?.Properties
    ?.PolicyDocument?.Statement?.find(
      ({ Sid }) => Sid === "ApiReadsExactRuntimeSecrets",
    )?.Resource ?? [];
  const expectedOutlookSecretArns = [
    "arn:${AWS::Partition}:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${ClientOutlookM365ConfigSecretName}-*",
    "arn:${AWS::Partition}:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${ClientOutlookCredentialSecretPrefix}*",
  ];
  const brokerEndpoint = resources.MicrosoftEgressBrokerLambdaEndpoint
    ?.Properties;
  const brokerEndpointStatement = brokerEndpoint?.PolicyDocument
    ?.Statement?.[0];
  if (brokerInvoke?.Action !== "lambda:InvokeFunction"
    || brokerInvoke.Resource?.["Fn::Sub"] !== brokerArn
    || !expectedOutlookSecretArns.every((arn) => runtimeSecrets.some(
      (resource) => resource?.["Fn::Sub"] === arn,
    ))
    || !expectedOutlookSecretArns.every((arn) => endpointRuntimeSecrets.some(
      (resource) => resource?.["Fn::Sub"] === arn,
    ))
    || brokerEndpoint?.ServiceName?.["Fn::Sub"]
      !== "com.amazonaws.${AWS::Region}.lambda"
    || brokerEndpoint?.VpcEndpointType !== "Interface"
    || brokerEndpointStatement?.Principal?.AWS?.["Fn::GetAtt"]?.[0]
      !== "ApiExecutionRole"
    || brokerEndpointStatement?.Action !== "lambda:InvokeFunction"
    || brokerEndpointStatement?.Resource?.["Fn::Sub"] !== brokerArn) {
    fail("production Outlook provider composition drifted");
  }
  if (resources.HttpApi.Properties.DisableExecuteApiEndpoint?.["Fn::If"]?.[2] !== true
    || resources.PasswordResetWorkerSchedule.Properties.ScheduleExpression !== "rate(1 minute)"
    || resources.PasswordResetWorkerSchedule.Properties.State?.["Fn::If"]?.[2] !== "DISABLED"
    || template.Parameters?.EnableOutlookConversationWorker?.Default !== "false"
    || JSON.stringify(template.Conditions?.OutlookConversationWorkerEnabled)
      !== JSON.stringify({
        "Fn::And": [
          { Condition: "ProductionTrafficEnabled" },
          { "Fn::Equals": [{ Ref: "EnableOutlookConversationWorker" }, "true"] },
          { Condition: "OutlookConversationWorkerConfigured" },
        ],
      })
    || JSON.stringify(template.Conditions?.OutlookConversationWorkerConfigured)
      !== JSON.stringify({
        "Fn::And": [
          { "Fn::Not": [{ "Fn::Equals": [
            { Ref: "ClientOutlookM365ConfigSecretName" },
            "/lawos/disabled/outlook/config",
          ] }] },
          { "Fn::Not": [{ "Fn::Equals": [
            { Ref: "ClientOutlookCredentialSecretPrefix" },
            "/lawos/disabled/outlook/credentials/",
          ] }] },
        ],
      })
    || resources.OutlookConversationWorkerSchedule?.Properties?.ScheduleExpression
      !== "rate(1 minute)"
    || resources.OutlookConversationWorkerSchedule?.Properties?.State
      ?.["Fn::If"]?.[2] !== "DISABLED"
    || JSON.parse(resources.OutlookConversationWorkerSchedule?.Properties
      ?.Targets?.[0]?.Input ?? "null")?.maintenance_action
      !== "lawos_outlook_conversation_worker"
    || resources.OutlookConversationWorkerSchedule?.Properties?.Targets?.[0]
      ?.RetryPolicy?.MaximumEventAgeInSeconds !== 300
    || resources.OutlookConversationWorkerSchedule?.Properties?.Targets?.[0]
      ?.RetryPolicy?.MaximumRetryAttempts !== 2
    || resources.OutlookConversationWorkerInvokePermission?.Properties?.Principal
      !== "events.amazonaws.com"
    || resources.OutlookConversationWorkerInvokePermission?.Properties?.FunctionName?.Ref
      !== "ApiFunction"
    || resources.OutlookConversationWorkerInvokePermission?.Properties?.SourceArn
      ?.["Fn::GetAtt"]?.[0] !== "OutlookConversationWorkerSchedule"
    || resources.ApiFunction?.Properties?.Environment?.Variables
      ?.LAWOS_OUTLOOK_CONVERSATION_WORKER_SCHEDULE_ENABLED
      ?.["Fn::If"]?.[2] !== "false"
    || resources.ApiFunction?.Properties?.Environment?.Variables
      ?.LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED
      ?.["Fn::If"]?.[0] !== "OutlookConversationWorkerEnabled"
    || resources.ApiFunction?.Properties?.Environment?.Variables
      ?.LAWOS_CLIENT_OUTLOOK_PROVIDER_RUNTIME_ENABLED
      ?.["Fn::If"]?.[0] !== "OutlookConversationWorkerEnabled"
    || resources.ApiFunction?.Properties?.Environment?.Variables
      ?.LAWOS_CLIENT_OUTLOOK_M365_CONFIG_SECRET_ID?.Ref
      !== "ClientOutlookM365ConfigSecretName"
    || resources.ApiFunction?.Properties?.Environment?.Variables
      ?.LAWOS_GRAPH_NOTIFICATION_URL?.["Fn::Sub"]
      !== "${HttpApi.ApiEndpoint}/api/outlook/graph/notifications"
    || template.Parameters?.EnableProjectionWorker?.Default !== "false"
    || template.Parameters?.ProjectionWorkerEventJson?.MaxLength !== 640
    || template.Parameters?.HrxProjectionMappingObjectKey?.Default
      !== "disabled/hrx-projection-mapping.json"
    || template.Parameters?.HrxProjectionMappingObjectKey?.MaxLength
      !== 512
    || template.Parameters?.HrxProjectionValidationObjectKey?.Default
      !== "disabled/hrx-projection-validation.json"
    || template.Parameters?.HrxProjectionValidationObjectKey?.MaxLength
      !== 512
    || template.Parameters?.ProjectionWorkerLagThresholdMs?.Default !== 24
    || JSON.stringify(
      template.Parameters?.ProjectionWorkerLagThresholdMs?.AllowedValues,
    ) !== JSON.stringify([24])
    || JSON.stringify(template.Conditions?.ProjectionWorkerEnabled)
      !== JSON.stringify({
        "Fn::Equals": [{ Ref: "EnableProjectionWorker" }, "true"],
      })
    || JSON.stringify(resources.ProjectionWorkerSchedule?.Properties?.State)
      !== JSON.stringify({
        "Fn::If": ["ProjectionWorkerEnabled", "ENABLED", "DISABLED"],
      })
    || resources.ProjectionWorkerSchedule?.Properties?.Targets?.[0]?.Input?.Ref
      !== "ProjectionWorkerEventJson"
    || resources.ProjectionWorkerSchedule?.Properties?.Targets?.[0]
      ?.RetryPolicy?.MaximumEventAgeInSeconds !== 900
    || resources.ProjectionWorkerSchedule?.Properties?.Targets?.[0]
      ?.RetryPolicy?.MaximumRetryAttempts !== 2
    || resources.ProjectionWorkerSchedule?.Properties?.Targets?.[0]
      ?.DeadLetterConfig?.Arn?.["Fn::GetAtt"]?.[0]
      !== "ProjectionWorkerDeadLetterQueue"
    || resources.ProjectionWorkerEventInvokeConfig?.Properties
      ?.FunctionName?.Ref !== "ProjectionWorkerFunction"
    || resources.ProjectionWorkerEventInvokeConfig?.Properties
      ?.Qualifier !== "$LATEST"
    || resources.ProjectionWorkerEventInvokeConfig?.Properties
      ?.MaximumEventAgeInSeconds !== 900
    || resources.ProjectionWorkerEventInvokeConfig?.Properties
      ?.MaximumRetryAttempts !== 2
    || resources.ProjectionWorkerEventInvokeConfig?.Properties
      ?.DestinationConfig?.OnFailure?.Destination
      ?.["Fn::GetAtt"]?.[0] !== "ProjectionWorkerDeadLetterQueue"
    || resources.ProjectionWorkerInvokePermission?.Properties?.Principal
      !== "events.amazonaws.com"
    || resources.ProjectionWorkerInvokePermission?.Properties?.FunctionName?.Ref
      !== "ProjectionWorkerFunction"
    || resources.ProjectionWorkerInvokePermission?.Properties?.SourceArn
      ?.["Fn::GetAtt"]?.[0] !== "ProjectionWorkerSchedule") {
    fail("production traffic must default disabled");
  }
  const apiProjectionRead = statement(
    resources.ApiExecutionRole,
    "ReadExactHrxProjectionRuntimeInputs",
  );
  if (apiProjectionRead?.Effect !== "Allow"
    || JSON.stringify(apiProjectionRead?.Action)
      !== JSON.stringify(["s3:GetObjectVersion", "s3:GetObjectRetention"])
    || JSON.stringify(apiProjectionRead?.Resource)
      !== JSON.stringify([
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
      ])) {
    fail("production API relational projection input authority drifted");
  }
  const adminSecretResources = statement(resources.AdminExecutionRole, "ReadExactBootstrapSecrets")?.Resource ?? [];
  const endpointAdminSecretResources = resources.SecretsManagerEndpoint?.Properties?.PolicyDocument?.Statement
    ?.find((item) => item.Sid === "AdminBootstrapsExactSecrets")?.Resource ?? [];
  if (![adminSecretResources, endpointAdminSecretResources].every((items) =>
    ["ProjectionDatabaseSecret", "ProjectionAuditorDatabaseSecret"]
      .every((logicalId) => items.some((item) => item?.Ref === logicalId)))) {
    fail("projection database secrets are not bound to the exact admin authority");
  }
  const projectionSecretWrites = statement(resources.AdminExecutionRole, "PopulateExactDatabaseSecrets")?.Resource ?? [];
  if (!Array.isArray(projectionSecretWrites)
    || projectionSecretWrites.length !== 3
    || !["ProjectionDatabaseSecret", "ProjectionAuditorDatabaseSecret"]
      .every((logicalId) =>
        projectionSecretWrites.some((item) => item?.Ref === logicalId))) {
    fail("projection database secret update authority drifted");
  }
  const auditorStatements = policyStatements(
    resources.ProjectionAuditorExecutionRole,
  );
  const auditorSecretRead = auditorStatements.find((item) =>
    item.Sid === "ReadExactProjectionAuditorSecrets");
  const auditorEvidenceWrite = auditorStatements.find((item) =>
    item.Sid === "WriteImmutableProjectionValidationEvidence");
  if (JSON.stringify(auditorSecretRead?.Action)
      !== JSON.stringify("secretsmanager:GetSecretValue")
    || JSON.stringify(auditorSecretRead?.Resource)
      !== JSON.stringify([
        { Ref: "ProjectionAuditorDatabaseSecret" },
        { Ref: "TenantContextSecret" },
      ])
    || auditorStatements.some((item) =>
      JSON.stringify(item.Action).includes("secretsmanager:PutSecretValue"))
    || JSON.stringify(auditorEvidenceWrite?.Action)
      !== JSON.stringify(["s3:PutObject", "s3:PutObjectRetention"])
    || auditorStatements.some((item) =>
      JSON.stringify(item.Resource).includes("ProjectionDatabaseSecret")
      || JSON.stringify(item.Resource).includes("MasterUserSecret"))) {
    fail("projection auditor AWS authority is not independently read-only");
  }
  const endpointAuditor = resources.SecretsManagerEndpoint?.Properties
    ?.PolicyDocument?.Statement?.find((item) =>
      item.Sid === "ProjectionAuditorReadsExactSecrets");
  if (endpointAuditor?.Principal?.AWS?.["Fn::GetAtt"]?.[0]
      !== "ProjectionAuditorExecutionRole"
    || endpointAuditor.Action !== "secretsmanager:GetSecretValue"
    || JSON.stringify(endpointAuditor.Resource)
      !== JSON.stringify([
        { Ref: "ProjectionAuditorDatabaseSecret" },
        { Ref: "TenantContextSecret" },
      ])) {
    fail("projection auditor Secrets Manager endpoint authority drifted");
  }
  const workerStatements = policyStatements(
    resources.ProjectionWorkerExecutionRole,
  );
  const workerSecretRead = workerStatements.find((item) =>
    item.Sid === "ReadExactProjectionWorkerSecrets");
  const workerEvidenceWrite = workerStatements.find((item) =>
    item.Sid === "WriteImmutableProjectionWorkerEvidence");
  const workerEvidenceRead = workerStatements.find((item) =>
    item.Sid === "ReadImmutableProgramExecutionEvidence");
  const workerDeadLetterWrite = workerStatements.find((item) =>
    item.Sid === "SendOnlyProjectionWorkerFailuresToExactDeadLetterQueue");
  if (JSON.stringify(workerSecretRead?.Action)
      !== JSON.stringify("secretsmanager:GetSecretValue")
    || JSON.stringify(workerSecretRead?.Resource)
      !== JSON.stringify([
        { Ref: "ProjectionDatabaseSecret" },
        { Ref: "TenantContextSecret" },
      ])
    || workerStatements.some((item) =>
      JSON.stringify(item.Action).includes("secretsmanager:PutSecretValue"))
    || JSON.stringify(workerEvidenceWrite?.Action)
      !== JSON.stringify(["s3:PutObject", "s3:PutObjectRetention"])
    || workerEvidenceRead?.Action !== "s3:GetObject"
    || JSON.stringify(workerEvidenceRead?.Resource)
      !== JSON.stringify({
        "Fn::Sub": "${ProgramInputBucket.Arn}/program-execution/*",
      })
    || workerDeadLetterWrite?.Action !== "sqs:SendMessage"
    || workerDeadLetterWrite?.Resource?.["Fn::GetAtt"]?.[0]
      !== "ProjectionWorkerDeadLetterQueue"
    || workerStatements.some((item) =>
      JSON.stringify(item.Resource).includes("ProjectionAuditorDatabaseSecret")
      || JSON.stringify(item.Resource).includes("MasterUserSecret"))) {
    fail("projection worker AWS authority exceeds incremental projection scope");
  }
  const deadLetterQueue = resources.ProjectionWorkerDeadLetterQueue?.Properties;
  const deadLetterPolicy = resources.ProjectionWorkerDeadLetterQueuePolicy
    ?.Properties;
  const deadLetterStatement = deadLetterPolicy?.PolicyDocument?.Statement?.[0];
  if (deadLetterQueue?.QueueName
      !== "lawos-production-projection-worker-dead-letter"
    || deadLetterQueue?.SqsManagedSseEnabled !== true
    || deadLetterQueue?.MessageRetentionPeriod !== 1_209_600
    || JSON.stringify(deadLetterPolicy?.Queues)
      !== JSON.stringify([{ Ref: "ProjectionWorkerDeadLetterQueue" }])
    || deadLetterStatement?.Effect !== "Allow"
    || deadLetterStatement?.Principal?.Service !== "events.amazonaws.com"
    || deadLetterStatement?.Action !== "sqs:SendMessage"
    || deadLetterStatement?.Resource?.["Fn::GetAtt"]?.[0]
      !== "ProjectionWorkerDeadLetterQueue"
    || deadLetterStatement?.Condition?.ArnEquals?.["aws:SourceArn"]
      ?.["Fn::GetAtt"]?.[0] !== "ProjectionWorkerSchedule"
    || deadLetterStatement?.Condition?.StringEquals?.["aws:SourceAccount"]
      ?.Ref !== "AWS::AccountId") {
    fail("projection worker dead-letter authority drifted");
  }
  const workerAlarms = [
    [
      resources.ProjectionWorkerErrorAlarm,
      "lawos-production-projection-worker-errors",
      "AWS/Lambda",
      "Errors",
      "FunctionName",
      "ProjectionWorkerFunction",
    ],
    [
      resources.ProjectionWorkerDeliveryFailureAlarm,
      "lawos-production-projection-worker-delivery-failures",
      "AWS/Events",
      "FailedInvocations",
      "RuleName",
      "ProjectionWorkerSchedule",
    ],
    [
      resources.ProjectionWorkerDeadLetterAlarm,
      "lawos-production-projection-worker-dead-letter",
      "AWS/SQS",
      "ApproximateNumberOfMessagesVisible",
      "QueueName",
      "ProjectionWorkerDeadLetterQueue",
    ],
  ];
  for (const [
    alarm,
    alarmName,
    namespace,
    metricName,
    dimensionName,
    logicalId,
  ]
    of workerAlarms) {
    const dimension = alarm?.Properties?.Dimensions?.[0];
    const reference = dimension?.Value?.Ref
      ?? dimension?.Value?.["Fn::GetAtt"]?.[0];
    if (alarm?.Type !== "AWS::CloudWatch::Alarm"
      || alarm.Properties?.AlarmName !== alarmName
      || alarm.Properties?.Namespace !== namespace
      || alarm.Properties?.MetricName !== metricName
      || alarm.Properties?.Threshold !== 1
      || dimension?.Name !== dimensionName
      || reference !== logicalId) {
      fail("projection worker failure observability drifted");
    }
  }
  const lagAlarm = resources.ProjectionWorkerLagAlarm;
  if (lagAlarm?.Type !== "AWS::CloudWatch::Alarm"
    || lagAlarm.Properties?.AlarmName
      !== "lawos-production-projection-worker-lag"
    || lagAlarm.Properties?.Namespace !== "LawOS/W15"
    || lagAlarm.Properties?.MetricName !== "OutboxLagMilliseconds"
    || lagAlarm.Properties?.Threshold?.Ref
      !== "ProjectionWorkerLagThresholdMs"
    || JSON.stringify(lagAlarm.Properties?.Dimensions)
      !== JSON.stringify([{
        Name: "Worker",
        Value: "relational-projection",
      }])) {
    fail("projection worker lag observability drifted");
  }
  const endpointWorker = resources.SecretsManagerEndpoint?.Properties
    ?.PolicyDocument?.Statement?.find((item) =>
      item.Sid === "ProjectionWorkerReadsExactSecrets");
  if (endpointWorker?.Principal?.AWS?.["Fn::GetAtt"]?.[0]
      !== "ProjectionWorkerExecutionRole"
    || endpointWorker.Action !== "secretsmanager:GetSecretValue"
    || JSON.stringify(endpointWorker.Resource)
      !== JSON.stringify([
        { Ref: "ProjectionDatabaseSecret" },
        { Ref: "TenantContextSecret" },
      ])) {
    fail("projection worker Secrets Manager endpoint authority drifted");
  }
  const productionInputEndpoint =
    resources.S3GatewayEndpoint?.Properties?.PolicyDocument?.Statement
      ?.find((item) =>
        item.Sid === "ExactProductionProgramInputsAndMigrationDmsOnly");
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
    { "Fn::GetAtt": ["ProgramInputBucket", "Arn"] },
    { "Fn::Sub": "${ProgramInputBucket.Arn}/*" },
    { "Fn::GetAtt": ["DmsBucket", "Arn"] },
    { "Fn::Sub": "${DmsBucket.Arn}/approved-real-migration/*" },
  ];
  if (!productionInputEndpoint
    || productionInputEndpoint.Effect !== "Allow"
    || productionInputEndpoint.Principal !== "*"
    || productionInputEndpoint.Condition != null
    || JSON.stringify(productionInputEndpoint.Action)
      !== JSON.stringify(endpointActions)
    || JSON.stringify(productionInputEndpoint.Resource)
      !== JSON.stringify(endpointResources)) {
    fail("production S3 endpoint program-input or migration-DMS authority drifted");
  }
  const digest = sha256(template);
  return Object.freeze({
    verdict: "PASS",
    template_sha256: digest,
    resource_count: Object.keys(resources).length,
    template_byte_size: Buffer.byteLength(serialized),
    private_subnet_count: subnets.length,
    public_resource_count: 0,
    private_rds_count: 1,
    multi_az_rds_count: 1,
    object_lock_bucket_count: 2,
    temporary_eni_allow_policy_count: temporaryEniAllowCount,
    source_function_explicit_deny_count: sourceFunctionDenyCount,
    projection_auditor_function_count: 1,
    projection_auditor_master_secret_read_count: 0,
    projection_auditor_database_write_secret_count: 0,
    projection_worker_function_count: 1,
    projection_worker_master_secret_read_count: 0,
    projection_worker_schedule_enabled_by_default: false,
    production_traffic_enabled_by_default: false,
    monthly_cost_ceiling_krw: JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW,
  });
}

export function validateJsonPostgresProductionCost(cost = {}) {
  if (cost.schema_version !== "law-firm-os.json-postgres-production-cost.v1"
    || cost.monthly_cost_ceiling_krw !== JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW
    || cost.planning_exchange_rate_krw_per_usd !== 1500
    || !Array.isArray(cost.line_items)) {
    fail("production cost model schema drifted");
  }
  const subtotal = cost.line_items.reduce((total, item) => total + Number(item.monthly_estimate_usd), 0);
  const totalUsd = subtotal + Number(cost.contingency_monthly_usd);
  const totalKrw = Math.ceil(totalUsd * cost.planning_exchange_rate_krw_per_usd);
  if (Math.abs(subtotal - Number(cost.subtotal_monthly_usd)) > 0.01
    || Math.abs(totalUsd - Number(cost.total_monthly_estimate_usd)) > 0.01
    || totalKrw !== cost.total_monthly_estimate_krw
    || totalKrw > JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW
    || cost.aws_budget_limit_usd !== JSON_POSTGRES_PRODUCTION_BUDGET_USD
    || cost.within_owner_krw_cap !== true) {
    fail("production cost model does not reconcile within the owner ceiling");
  }
  return Object.freeze({
    verdict: "PASS",
    total_monthly_estimate_usd: totalUsd,
    total_monthly_estimate_krw: totalKrw,
    owner_cap_headroom_krw: JSON_POSTGRES_PRODUCTION_COST_CEILING_KRW - totalKrw,
  });
}
