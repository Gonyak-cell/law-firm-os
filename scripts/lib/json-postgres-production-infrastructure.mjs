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
  template.Parameters.RuntimeGeneration = {
    Type: "Number",
    Default: 1,
    MinValue: 1,
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
  template.Parameters.PasswordResetSesIdentityArn.Description = "Verified SES identity allowed to send individual production password setup messages";
  resources.PayrollArtifactSecret.Properties.Description = "Production payroll artifact key";
  for (const item of resources.SecretsManagerEndpoint.Properties.PolicyDocument.Statement) {
    if (Array.isArray(item.Resource)) {
      item.Resource = item.Resource.filter((resource) => resource?.Ref !== "SyntheticManifestSecret");
      if (item.Sid === "AdminBootstrapsExactSecrets") {
        item.Resource.push({ Ref: "ProjectionDatabaseSecret" });
      }
    }
  }
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
  const apiEmail = statement(apiRole, "SendSyntheticPasswordSetupEmail");
  apiEmail.Sid = "SendIndividualRegisteredPasswordSetupEmail";
  apiEmail.Action = "ses:SendEmail";
  apiEmail.Resource = { Ref: "PasswordResetSesIdentityArn" };
  apiEmail.Condition = {
    StringEquals: { "ses:FromAddress": { Ref: "PasswordResetFromEmail" } },
  };

  const adminRole = resources.AdminExecutionRole;
  const readSecrets = statement(adminRole, "ReadExactBootstrapSecrets");
  readSecrets.Resource = [
    { "Fn::GetAtt": ["Database", "MasterUserSecret.SecretArn"] },
    { Ref: "ApplicationDatabaseSecret" },
    { Ref: "ProjectionDatabaseSecret" },
    { Ref: "TenantContextSecret" },
  ];
  const populateSecrets = statement(adminRole, "PopulateExactApplicationSecret");
  populateSecrets.Sid = "PopulateExactDatabaseSecrets";
  populateSecrets.Resource = [
    { Ref: "ApplicationDatabaseSecret" },
    { Ref: "ProjectionDatabaseSecret" },
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
    LAWOS_PROGRAM_INPUT_BUCKET: { Ref: "ProgramInputBucket" },
    LAWOS_PROGRAM_INPUT_KMS_KEY_ARN: { "Fn::GetAtt": ["ProductionKey", "Arn"] },
    LAWOS_RUNTIME_PROFILE: "operational",
    LAWOS_RUNTIME_GENERATION: { Ref: "RuntimeGeneration" },
    LAWOS_STAFF_AUTHORITY: "internal-password",
    NODE_EXTRA_CA_CERTS: "/var/task/certs/global-bundle.pem",
  };

  const api = resources.ApiFunction;
  const apiEnv = api.Properties.Environment.Variables;
  api.Properties.Description = "Exact-main LawOS production API with PostgreSQL-only authority";
  apiEnv.LAWOS_DATA_SCOPE = "approved-real-manifest";
  apiEnv.LAWOS_DMS_S3_DEFAULT_RETENTION_DAYS = "365";
  apiEnv.LAWOS_IDENTITY_TENANT_ID = { Ref: "PrimaryTenantId" };
  apiEnv.LAWOS_AUTH_PASSWORD_RESET_TTL_MS = "900000";
  delete apiEnv.LAWOS_OWNER_INSTRUCTION_SHA256;
  delete apiEnv.LAWOS_SYNTHETIC_MANIFEST_SECRET_ID;
  resources.PasswordResetWorkerSchedule.Properties.Description = "Drains durable individual production password-reset jobs";
  resources.PasswordResetWorkerSchedule.Properties.State = {
    "Fn::If": ["ProductionTrafficEnabled", "ENABLED", "DISABLED"],
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

  resources.ApiLogGroup.Properties.RetentionInDays = 365;
  resources.AdminLogGroup.Properties.RetentionInDays = 365;
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
    || resources.ProjectionDatabaseSecret.Properties?.GenerateSecretString?.SecretStringTemplate
      !== "{\"username\":\"lawos_hrx_projection_writer\",\"configuration_state\":\"pending_admin_bootstrap\"}"
    || resources.AdminFunction?.Properties?.Environment?.Variables?.LAWOS_PROJECTION_DATABASE_SECRET_ID?.Ref
      !== "ProjectionDatabaseSecret"
    || resources.ApiFunction?.Properties?.Environment?.Variables?.LAWOS_PERSISTENCE_AUTHORITY !== "postgres-v2"
    || resources.ApiFunction?.Properties?.Environment?.Variables?.LAWOS_RUNTIME_PROFILE !== "operational") {
    fail("production Lambda authority contract drifted");
  }
  const outputs = template.Outputs ?? {};
  if (outputs.DatabaseIdentifier?.Value?.Ref !== "Database"
    || outputs.DatabaseEndpointAddress?.Value?.["Fn::GetAtt"]?.[0] !== "Database"
    || outputs.DatabaseSubnetGroupName?.Value?.Ref !== "DatabaseSubnetGroup"
    || outputs.DatabaseSecurityGroupId?.Value?.Ref !== "DatabaseSecurityGroup"
    || outputs.AdminFunctionName?.Value?.Ref !== "AdminFunction"
    || outputs.ApiFunctionName?.Value?.Ref !== "ApiFunction"
    || outputs.DmsBucketName?.Value?.Ref !== "DmsBucket"
    || resources.AdminFunction?.Properties?.Environment?.Variables?.LAWOS_DATABASE_IDENTIFIER?.Ref !== "Database") {
    fail("production DR/runtime outputs drifted");
  }
  const roles = [resources.ApiExecutionRole, resources.AdminExecutionRole];
  if (roles.some((role) => !role) || resources.ApiExecutionRole.Properties.RoleName === resources.AdminExecutionRole.Properties.RoleName) {
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
  if (temporaryEniAllowCount !== 2 || sourceFunctionDenyCount !== 2) {
    fail("production ENI bootstrap or explicit Deny contract is incomplete");
  }
  if (resources.HttpApi.Properties.DisableExecuteApiEndpoint?.["Fn::If"]?.[2] !== true
    || resources.PasswordResetWorkerSchedule.Properties.State?.["Fn::If"]?.[2] !== "DISABLED") {
    fail("production traffic must default disabled");
  }
  const adminSecretResources = statement(resources.AdminExecutionRole, "ReadExactBootstrapSecrets")?.Resource ?? [];
  const endpointAdminSecretResources = resources.SecretsManagerEndpoint?.Properties?.PolicyDocument?.Statement
    ?.find((item) => item.Sid === "AdminBootstrapsExactSecrets")?.Resource ?? [];
  if (![adminSecretResources, endpointAdminSecretResources].every((items) =>
    items.some((item) => item?.Ref === "ProjectionDatabaseSecret"))) {
    fail("projection writer secret is not bound to the exact admin authority");
  }
  const projectionSecretWrites = statement(resources.AdminExecutionRole, "PopulateExactDatabaseSecrets")?.Resource ?? [];
  if (!Array.isArray(projectionSecretWrites)
    || projectionSecretWrites.length !== 2
    || !projectionSecretWrites.some((item) => item?.Ref === "ProjectionDatabaseSecret")) {
    fail("projection writer secret update authority drifted");
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
