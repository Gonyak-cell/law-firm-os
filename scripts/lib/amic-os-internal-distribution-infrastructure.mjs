import { createHash } from "node:crypto";

export const AMIC_INTERNAL_DISTRIBUTION_SCHEMA =
  "law-firm-os.amic-internal-unsigned-distribution-stack.v1";
export const AMIC_INTERNAL_DISTRIBUTION_PREFIX = "internal-unsigned/";
export const AMIC_INTERNAL_DISTRIBUTION_REPOSITORY = "Gonyak-cell/law-firm-os";
export const AMIC_INTERNAL_DISTRIBUTION_REPOSITORY_ID = "1273994742";
export const AMIC_INTERNAL_DISTRIBUTION_OWNER_ID = "212459168";
export const AMIC_INTERNAL_DISTRIBUTION_REF = "refs/heads/main";
export const AMIC_INTERNAL_PUBLISH_ENVIRONMENT = "amic-os-internal-unsigned-publish";
export const AMIC_INTERNAL_READBACK_ENVIRONMENT = "amic-os-internal-unsigned-readback";

const PUBLISH_WORKFLOW =
  "Gonyak-cell/law-firm-os/.github/workflows/amic-os-internal-unsigned-publisher.yml@refs/heads/main";
const READBACK_WORKFLOW =
  "Gonyak-cell/law-firm-os/.github/workflows/amic-os-internal-unsigned-readback.yml@refs/heads/main";

function stableJson(value) {
  if (Array.isArray(value)) return value.map(stableJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableJson(value[key])]),
    );
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(stableJson(value))).digest("hex");
}

function tags(purpose) {
  return [
    { Key: "environment", Value: "lawos-production" },
    { Key: "system", Value: "amic-os" },
    { Key: "purpose", Value: purpose },
    { Key: "owner", Value: { Ref: "Owner" } },
    { Key: "review", Value: { Ref: "ReviewDate" } },
  ];
}

function publicAccessBlock() {
  return {
    BlockPublicAcls: true,
    BlockPublicPolicy: true,
    IgnorePublicAcls: true,
    RestrictPublicBuckets: true,
  };
}

function oidcTrust({ environment, workflow, reusable, sid }) {
  const workflowClaim = reusable
    ? "token.actions.githubusercontent.com:job_workflow_ref"
    : "token.actions.githubusercontent.com:workflow";
  return {
    Version: "2012-10-17",
    Statement: [{
      Sid: sid,
      Effect: "Allow",
      Principal: { Federated: { Ref: "GitHubOidcProviderArn" } },
      Action: "sts:AssumeRoleWithWebIdentity",
      Condition: {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub":
            `repo:${AMIC_INTERNAL_DISTRIBUTION_REPOSITORY}:environment:${environment}`,
          "token.actions.githubusercontent.com:environment": environment,
          "token.actions.githubusercontent.com:repository":
            AMIC_INTERNAL_DISTRIBUTION_REPOSITORY,
          "token.actions.githubusercontent.com:repository_id":
            AMIC_INTERNAL_DISTRIBUTION_REPOSITORY_ID,
          "token.actions.githubusercontent.com:repository_owner_id":
            AMIC_INTERNAL_DISTRIBUTION_OWNER_ID,
          "token.actions.githubusercontent.com:ref": AMIC_INTERNAL_DISTRIBUTION_REF,
          [workflowClaim]: workflow,
        },
      },
    }],
  };
}

function bucketGovernanceStatement() {
  return {
    Sid: "ReadInternalDistributionBucketGovernance",
    Effect: "Allow",
    Action: [
      "s3:GetBucketLocation",
      "s3:GetBucketLogging",
      "s3:GetBucketObjectLockConfiguration",
      "s3:GetBucketOwnershipControls",
      "s3:GetBucketPublicAccessBlock",
      "s3:GetBucketVersioning",
      "s3:GetEncryptionConfiguration",
    ],
    Resource: { "Fn::GetAtt": ["ArtifactBucket", "Arn"] },
  };
}

function exactVersionReadStatement() {
  return {
    Sid: "ReadExactInternalDistributionObjectVersions",
    Effect: "Allow",
    Action: ["s3:GetObjectAttributes", "s3:GetObjectRetention", "s3:GetObjectVersion"],
    Resource: {
      "Fn::Sub": `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
    },
  };
}

function controlHistoryReadStatement(sid) {
  return {
    Sid: sid,
    Effect: "Allow",
    Action: "s3:ListBucketVersions",
    Resource: { "Fn::GetAtt": ["ArtifactBucket", "Arn"] },
    Condition: {
      StringLike: {
        "s3:prefix": [
          `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}baseline/*`,
          `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}channel/*`,
        ],
      },
    },
  };
}

function artifactKmsStatement(actions, sid) {
  return {
    Sid: sid,
    Effect: "Allow",
    Action: actions,
    Resource: { "Fn::GetAtt": ["ArtifactKey", "Arn"] },
    Condition: {
      StringEquals: {
        "kms:CallerAccount": { Ref: "AWS::AccountId" },
        "kms:ViaService": { "Fn::Sub": "s3.${AWS::Region}.${AWS::URLSuffix}" },
      },
    },
  };
}

function githubOidcRole({ roleName, environment, workflow, reusable = false, description, statements }) {
  return {
    Type: "AWS::IAM::Role",
    Condition: "DistributionEnabled",
    Properties: {
      RoleName: roleName,
      Description: description,
      MaxSessionDuration: 3600,
      AssumeRolePolicyDocument: oidcTrust({
        environment,
        workflow,
        reusable,
        sid: environment === AMIC_INTERNAL_PUBLISH_ENVIRONMENT
          ? "GitHubOidcInternalUnsignedPublishOnly"
          : "GitHubOidcInternalUnsignedReadbackOnly",
      }),
      Policies: [{
        PolicyName: `${roleName}-least-privilege`,
        PolicyDocument: { Version: "2012-10-17", Statement: statements },
      }],
      Tags: tags(environment),
    },
  };
}

export function buildAmicInternalDistributionTemplate() {
  return {
    AWSTemplateFormatVersion: "2010-09-09",
    Description:
      "Private, versioned, signed-URL AMIC OS internal-unsigned distribution with exact GitHub OIDC roles.",
    Metadata: {
      schema_version: AMIC_INTERNAL_DISTRIBUTION_SCHEMA,
      data_scope: "installer-and-sanitized-release-evidence-only",
      distribution: "private",
      authenticode_status: "not_signed",
      public_release_allowed: false,
      artifact_prefix: AMIC_INTERNAL_DISTRIBUTION_PREFIX,
      source_repository: AMIC_INTERNAL_DISTRIBUTION_REPOSITORY,
      source_ref: AMIC_INTERNAL_DISTRIBUTION_REF,
      metadata_signature: "ed25519-detached-exact-bytes",
      viewer_authorization: "cloudfront-trusted-key-group-signed-url",
      origin_authorization: "cloudfront-oac-sigv4-always",
    },
    Parameters: {
      ArtifactBucketName: {
        Type: "String",
        AllowedPattern: "^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$",
      },
      AccessLogBucketName: {
        Type: "String",
        AllowedPattern: "^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$",
      },
      CloudFrontPublicKeyPem: {
        Type: "String",
        Description: "Public half of the separately held CloudFront signed-URL key pair.",
      },
      CloudFrontPrivateKeySecretArn: {
        Type: "String",
        NoEcho: true,
        AllowedPattern:
          "^arn:(aws|aws-us-gov|aws-cn):secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[A-Za-z0-9/_+=.@-]+$",
        Description: "Dedicated Secrets Manager ARN holding only the CloudFront viewer-signing private key.",
      },
      CloudFrontPrivateKeySecretKmsKeyArn: {
        Type: "String",
        NoEcho: true,
        AllowedPattern:
          "^arn:(aws|aws-us-gov|aws-cn):kms:[a-z0-9-]+:[0-9]{12}:key/[0-9a-f-]{36}$",
      },
      RuntimeDownloadBrokerRoleName: {
        Type: "String",
        AllowedPattern: "^[A-Za-z0-9+=,.@_-]{1,64}$",
        Description: "Existing API execution role that receives only the download-broker read policy.",
      },
      GitHubOidcProviderArn: {
        Type: "String",
        AllowedPattern:
          "^arn:(aws|aws-us-gov|aws-cn):iam::[0-9]{12}:oidc-provider/token\\.actions\\.githubusercontent\\.com$",
      },
      MetadataSigningSecretArn: {
        Type: "String",
        NoEcho: true,
        AllowedPattern:
          "^arn:(aws|aws-us-gov|aws-cn):secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[A-Za-z0-9/_+=.@-]+$",
      },
      MetadataSigningSecretKmsKeyArn: {
        Type: "String",
        NoEcho: true,
        AllowedPattern:
          "^arn:(aws|aws-us-gov|aws-cn):kms:[a-z0-9-]+:[0-9]{12}:key/[0-9a-f-]{36}$",
      },
      EnableDistribution: {
        Type: "String",
        AllowedValues: ["false", "true"],
        Default: "false",
      },
      Owner: { Type: "String", MinLength: 1, MaxLength: 80 },
      ReviewDate: {
        Type: "String",
        AllowedPattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
      },
    },
    Conditions: {
      DistributionEnabled: { "Fn::Equals": [{ Ref: "EnableDistribution" }, "true"] },
    },
    Resources: {
      ArtifactKey: {
        Type: "AWS::KMS::Key",
        DeletionPolicy: "Retain",
        UpdateReplacePolicy: "Retain",
        Properties: {
          Description: "AMIC OS internal-unsigned distribution objects",
          EnableKeyRotation: true,
          PendingWindowInDays: 30,
          KeyPolicy: {
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "EnableAccountIamAuthority",
                Effect: "Allow",
                Principal: {
                  AWS: { "Fn::Sub": "arn:${AWS::Partition}:iam::${AWS::AccountId}:root" },
                },
                Action: "kms:*",
                Resource: "*",
              },
              {
                Sid: "AllowCloudFrontOacForInternalUnsignedPrefix",
                Effect: "Allow",
                Principal: { Service: "cloudfront.amazonaws.com" },
                Action: "kms:Decrypt",
                Resource: "*",
                Condition: {
                  StringEquals: { "AWS:SourceAccount": { Ref: "AWS::AccountId" } },
                  ArnLike: {
                    "AWS:SourceArn": {
                      "Fn::Sub": "arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/*",
                    },
                  },
                  StringLike: {
                    "kms:EncryptionContext:aws:s3:arn": {
                      "Fn::Sub":
                        `arn:\${AWS::Partition}:s3:::\${ArtifactBucketName}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
                    },
                  },
                },
              },
            ],
          },
          Tags: tags("internal-unsigned-artifact-encryption"),
        },
      },
      ArtifactKeyAlias: {
        Type: "AWS::KMS::Alias",
        Properties: {
          AliasName: "alias/amic-os-internal-unsigned-artifacts",
          TargetKeyId: { Ref: "ArtifactKey" },
        },
      },
      AccessLogBucket: {
        Type: "AWS::S3::Bucket",
        DeletionPolicy: "Retain",
        UpdateReplacePolicy: "Retain",
        Properties: {
          BucketName: { Ref: "AccessLogBucketName" },
          BucketEncryption: {
            ServerSideEncryptionConfiguration: [{
              ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" },
            }],
          },
          LifecycleConfiguration: {
            Rules: [{
              Id: "RetainAccessLogsForOneYear",
              Status: "Enabled",
              ExpirationInDays: 365,
              NoncurrentVersionExpiration: { NoncurrentDays: 365 },
            }],
          },
          OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] },
          PublicAccessBlockConfiguration: publicAccessBlock(),
          VersioningConfiguration: { Status: "Enabled" },
          Tags: tags("internal-unsigned-access-logs"),
        },
      },
      AccessLogBucketPolicy: {
        Type: "AWS::S3::BucketPolicy",
        Properties: {
          Bucket: { Ref: "AccessLogBucket" },
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "DenyInsecureLogTransport",
                Effect: "Deny",
                Principal: "*",
                Action: "s3:*",
                Resource: [
                  { "Fn::GetAtt": ["AccessLogBucket", "Arn"] },
                  { "Fn::Sub": "${AccessLogBucket.Arn}/*" },
                ],
                Condition: { Bool: { "aws:SecureTransport": "false" } },
              },
              {
                Sid: "AllowArtifactBucketServerAccessLogs",
                Effect: "Allow",
                Principal: { Service: "logging.s3.amazonaws.com" },
                Action: "s3:PutObject",
                Resource: {
                  "Fn::Sub": "${AccessLogBucket.Arn}/s3-access/${AWS::AccountId}/*",
                },
                Condition: {
                  StringEquals: { "aws:SourceAccount": { Ref: "AWS::AccountId" } },
                  ArnLike: {
                    "aws:SourceArn": { "Fn::Sub": "arn:${AWS::Partition}:s3:::${ArtifactBucketName}" },
                  },
                },
              },
            ],
          },
        },
      },
      ArtifactBucket: {
        Type: "AWS::S3::Bucket",
        DeletionPolicy: "Retain",
        UpdateReplacePolicy: "Retain",
        DependsOn: "AccessLogBucketPolicy",
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
          LoggingConfiguration: {
            DestinationBucketName: { Ref: "AccessLogBucket" },
            LogFilePrefix: { "Fn::Sub": "s3-access/${AWS::AccountId}/" },
          },
          ObjectLockEnabled: true,
          ObjectLockConfiguration: {
            ObjectLockEnabled: "Enabled",
            Rule: { DefaultRetention: { Mode: "COMPLIANCE", Days: 365 } },
          },
          OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] },
          PublicAccessBlockConfiguration: publicAccessBlock(),
          VersioningConfiguration: { Status: "Enabled" },
          Tags: tags("internal-unsigned-private-artifacts"),
        },
      },
      OriginAccessControl: {
        Type: "AWS::CloudFront::OriginAccessControl",
        Properties: {
          OriginAccessControlConfig: {
            Name: { "Fn::Sub": "amic-os-internal-unsigned-${AWS::AccountId}" },
            Description: "SigV4-only access to the private internal-unsigned S3 origin",
            OriginAccessControlOriginType: "s3",
            SigningBehavior: "always",
            SigningProtocol: "sigv4",
          },
        },
      },
      ViewerPublicKey: {
        Type: "AWS::CloudFront::PublicKey",
        Properties: {
          PublicKeyConfig: {
            CallerReference: { "Fn::Sub": "amic-os-internal-unsigned-${AWS::StackId}" },
            Comment: "Public key for short-lived authenticated internal download URLs",
            EncodedKey: { Ref: "CloudFrontPublicKeyPem" },
            Name: { "Fn::Sub": "amic-os-internal-unsigned-${AWS::AccountId}" },
          },
        },
      },
      ViewerKeyGroup: {
        Type: "AWS::CloudFront::KeyGroup",
        Properties: {
          KeyGroupConfig: {
            Comment: "Only trusted signed URLs may read internal-unsigned objects",
            Items: [{ Ref: "ViewerPublicKey" }],
            Name: { "Fn::Sub": "amic-os-internal-unsigned-${AWS::AccountId}" },
          },
        },
      },
      ImmutableArtifactCachePolicy: {
        Type: "AWS::CloudFront::CachePolicy",
        Properties: {
          CachePolicyConfig: {
            Name: { "Fn::Sub": "amic-os-internal-immutable-${AWS::AccountId}" },
            Comment: "Content-addressed internal artifacts only",
            DefaultTTL: 86400,
            MaxTTL: 31536000,
            MinTTL: 1,
            ParametersInCacheKeyAndForwardedToOrigin: {
              CookiesConfig: { CookieBehavior: "none" },
              EnableAcceptEncodingBrotli: false,
              EnableAcceptEncodingGzip: false,
              HeadersConfig: { HeaderBehavior: "none" },
              QueryStringsConfig: { QueryStringBehavior: "none" },
            },
          },
        },
      },
      ChannelIndexCachePolicy: {
        Type: "AWS::CloudFront::CachePolicy",
        Properties: {
          CachePolicyConfig: {
            Name: { "Fn::Sub": "amic-os-internal-channel-${AWS::AccountId}" },
            Comment: "Never cache mutable signed channel pointers",
            DefaultTTL: 0,
            MaxTTL: 0,
            MinTTL: 0,
            ParametersInCacheKeyAndForwardedToOrigin: {
              CookiesConfig: { CookieBehavior: "none" },
              EnableAcceptEncodingBrotli: false,
              EnableAcceptEncodingGzip: false,
              HeadersConfig: { HeaderBehavior: "none" },
              QueryStringsConfig: { QueryStringBehavior: "none" },
            },
          },
        },
      },
      DownloadResponseHeadersPolicy: {
        Type: "AWS::CloudFront::ResponseHeadersPolicy",
        Properties: {
          ResponseHeadersPolicyConfig: {
            Name: { "Fn::Sub": "amic-os-internal-download-${AWS::AccountId}" },
            Comment: "Non-browser execution and strict transport boundary",
            SecurityHeadersConfig: {
              ContentSecurityPolicy: {
                ContentSecurityPolicy: "default-src 'none'; frame-ancestors 'none'",
                Override: true,
              },
              ContentTypeOptions: { Override: true },
              FrameOptions: { FrameOption: "DENY", Override: true },
              ReferrerPolicy: { ReferrerPolicy: "no-referrer", Override: true },
              StrictTransportSecurity: {
                AccessControlMaxAgeSec: 63072000,
                IncludeSubdomains: true,
                Override: true,
                Preload: true,
              },
            },
          },
        },
      },
      Distribution: {
        Type: "AWS::CloudFront::Distribution",
        Properties: {
          DistributionConfig: {
            Comment: "AMIC OS managed internal-unsigned downloads only",
            Enabled: { "Fn::If": ["DistributionEnabled", true, false] },
            HttpVersion: "http2and3",
            IPV6Enabled: false,
            Origins: [{
              DomainName: { "Fn::GetAtt": ["ArtifactBucket", "RegionalDomainName"] },
              Id: "internal-unsigned-s3-origin",
              OriginAccessControlId: { Ref: "OriginAccessControl" },
              S3OriginConfig: { OriginAccessIdentity: "" },
            }],
            DefaultCacheBehavior: {
              AllowedMethods: ["GET", "HEAD"],
              CachedMethods: ["GET", "HEAD"],
              CachePolicyId: { Ref: "ImmutableArtifactCachePolicy" },
              Compress: false,
              ResponseHeadersPolicyId: { Ref: "DownloadResponseHeadersPolicy" },
              TargetOriginId: "internal-unsigned-s3-origin",
              TrustedKeyGroups: [{ Ref: "ViewerKeyGroup" }],
              ViewerProtocolPolicy: "https-only",
            },
            CacheBehaviors: [{
              AllowedMethods: ["GET", "HEAD"],
              CachedMethods: ["GET", "HEAD"],
              CachePolicyId: { Ref: "ChannelIndexCachePolicy" },
              Compress: false,
              PathPattern: `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}channel/*`,
              ResponseHeadersPolicyId: { Ref: "DownloadResponseHeadersPolicy" },
              TargetOriginId: "internal-unsigned-s3-origin",
              TrustedKeyGroups: [{ Ref: "ViewerKeyGroup" }],
              ViewerProtocolPolicy: "https-only",
            }],
            PriceClass: "PriceClass_100",
            ViewerCertificate: {
              CloudFrontDefaultCertificate: true,
              MinimumProtocolVersion: "TLSv1.2_2021",
            },
          },
          Tags: tags("internal-unsigned-private-distribution"),
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
                Condition: {
                  StringNotEquals: { "s3:x-amz-server-side-encryption": "aws:kms" },
                },
              },
              {
                Sid: "DenyWrongKmsKey",
                Effect: "Deny",
                Principal: "*",
                Action: "s3:PutObject",
                Resource: { "Fn::Sub": "${ArtifactBucket.Arn}/*" },
                Condition: {
                  StringNotEquals: {
                    "s3:x-amz-server-side-encryption-aws-kms-key-id": {
                      "Fn::GetAtt": ["ArtifactKey", "Arn"],
                    },
                  },
                },
              },
              {
                Sid: "DenyDeleteInternalUnsignedObjects",
                Effect: "Deny",
                Principal: "*",
                Action: ["s3:DeleteObject", "s3:DeleteObjectVersion"],
                Resource: {
                  "Fn::Sub": `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
                },
              },
              {
                Sid: "DenyUnconditionalControlWrites",
                Effect: "Deny",
                Principal: "*",
                Action: "s3:PutObject",
                Resource: [
                  {
                    "Fn::Sub": `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}baseline/*`,
                  },
                  {
                    "Fn::Sub": `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}channel/*`,
                  },
                ],
                Condition: {
                  Null: {
                    "s3:if-match": "true",
                    "s3:if-none-match": "true",
                  },
                },
              },
              {
                Sid: "DenyMissingComplianceRetention",
                Effect: "Deny",
                Principal: "*",
                Action: ["s3:PutObject", "s3:PutObjectRetention"],
                Resource: {
                  "Fn::Sub": `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
                },
                Condition: { Null: { "s3:object-lock-mode": "true" } },
              },
              {
                Sid: "DenyMissingComplianceRetainUntil",
                Effect: "Deny",
                Principal: "*",
                Action: ["s3:PutObject", "s3:PutObjectRetention"],
                Resource: {
                  "Fn::Sub": `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
                },
                Condition: { Null: { "s3:object-lock-retain-until-date": "true" } },
              },
              {
                Sid: "DenyNonComplianceRetention",
                Effect: "Deny",
                Principal: "*",
                Action: ["s3:PutObject", "s3:PutObjectRetention"],
                Resource: {
                  "Fn::Sub": `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
                },
                Condition: {
                  StringNotEquals: { "s3:object-lock-mode": "COMPLIANCE" },
                },
              },
              {
                Sid: "AllowOnlyThisCloudFrontDistributionRead",
                Effect: "Allow",
                Principal: { Service: "cloudfront.amazonaws.com" },
                Action: "s3:GetObject",
                Resource: {
                  "Fn::Sub": `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
                },
                Condition: {
                  StringEquals: {
                    "AWS:SourceArn": {
                      "Fn::Sub":
                        "arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${Distribution}",
                    },
                  },
                },
              },
            ],
          },
        },
      },
      PublisherRole: githubOidcRole({
        roleName: "amic-os-internal-unsigned-publisher",
        environment: AMIC_INTERNAL_PUBLISH_ENVIRONMENT,
        workflow: PUBLISH_WORKFLOW,
        reusable: true,
        description: "Exact-main GitHub OIDC publisher for private AMIC OS unsigned artifacts",
        statements: [
          bucketGovernanceStatement(),
          controlHistoryReadStatement("ListOnlyBaselineAndChannelVersionHistory"),
          {
            Sid: "PublishImmutableInternalUnsignedObjects",
            Effect: "Allow",
            Action: ["s3:PutObject", "s3:PutObjectRetention", "s3:PutObjectTagging"],
            Resource: {
              "Fn::Sub": `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
            },
            Condition: {
              StringEquals: {
                "s3:x-amz-server-side-encryption": "aws:kms",
                "s3:x-amz-server-side-encryption-aws-kms-key-id": {
                  "Fn::GetAtt": ["ArtifactKey", "Arn"],
                },
                "s3:object-lock-mode": "COMPLIANCE",
              },
              Null: { "s3:object-lock-retain-until-date": "false" },
              NumericGreaterThanEquals: {
                "s3:object-lock-remaining-retention-days": 365,
              },
              NumericLessThanEquals: {
                "s3:object-lock-remaining-retention-days": 3650,
              },
            },
          },
          exactVersionReadStatement(),
          artifactKmsStatement(
            ["kms:Decrypt", "kms:DescribeKey", "kms:GenerateDataKey"],
            "EncryptAndReadbackInternalUnsignedArtifacts",
          ),
          {
            Sid: "ReadDedicatedEd25519MetadataSigningSecret",
            Effect: "Allow",
            Action: ["secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue"],
            Resource: { Ref: "MetadataSigningSecretArn" },
          },
          {
            Sid: "DecryptDedicatedEd25519MetadataSigningSecret",
            Effect: "Allow",
            Action: "kms:Decrypt",
            Resource: { Ref: "MetadataSigningSecretKmsKeyArn" },
            Condition: {
              StringEquals: {
                "kms:ViaService": { "Fn::Sub": "secretsmanager.${AWS::Region}.${AWS::URLSuffix}" },
              },
            },
          },
        ],
      }),
      ReadbackRole: githubOidcRole({
        roleName: "amic-os-internal-unsigned-readback",
        environment: AMIC_INTERNAL_READBACK_ENVIRONMENT,
        workflow: READBACK_WORKFLOW,
        reusable: true,
        description: "Isolated exact-VersionId verifier for private AMIC OS unsigned artifacts",
        statements: [
          bucketGovernanceStatement(),
          controlHistoryReadStatement("ListOnlyBaselineAndChannelVersionHistory"),
          exactVersionReadStatement(),
          artifactKmsStatement("kms:Decrypt", "DecryptExactInternalUnsignedObjectVersions"),
        ],
      }),
      RuntimeDownloadBrokerPolicy: {
        Type: "AWS::IAM::ManagedPolicy",
        Condition: "DistributionEnabled",
        Properties: {
          Description:
            "Read-only runtime policy for authenticated AMIC OS internal download capability issuance",
          ManagedPolicyName: "amic-os-internal-unsigned-download-broker",
          Roles: [{ Ref: "RuntimeDownloadBrokerRoleName" }],
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "ReadOnlyInternalUnsignedObjects",
                Effect: "Allow",
                Action: ["s3:GetObject", "s3:GetObjectVersion"],
                Resource: {
                  "Fn::Sub": `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
                },
              },
              artifactKmsStatement(
                "kms:Decrypt",
                "DecryptOnlyInternalUnsignedObjectsThroughS3",
              ),
              {
                Sid: "ReadOnlyCloudFrontViewerSigningSecret",
                Effect: "Allow",
                Action: ["secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue"],
                Resource: { Ref: "CloudFrontPrivateKeySecretArn" },
              },
              {
                Sid: "DecryptOnlyCloudFrontViewerSigningSecret",
                Effect: "Allow",
                Action: "kms:Decrypt",
                Resource: { Ref: "CloudFrontPrivateKeySecretKmsKeyArn" },
                Condition: {
                  StringEquals: {
                    "kms:ViaService": {
                      "Fn::Sub": "secretsmanager.${AWS::Region}.${AWS::URLSuffix}",
                    },
                  },
                },
              },
            ],
          },
        },
      },
    },
    Outputs: {
      ArtifactBucketName: { Value: { Ref: "ArtifactBucket" } },
      ArtifactKeyArn: { Value: { "Fn::GetAtt": ["ArtifactKey", "Arn"] } },
      CloudFrontDistributionId: { Value: { Ref: "Distribution" } },
      CloudFrontDomainName: { Value: { "Fn::GetAtt": ["Distribution", "DomainName"] } },
      CloudFrontKeyGroupId: { Value: { Ref: "ViewerKeyGroup" } },
      CloudFrontPublicKeyId: { Value: { Ref: "ViewerPublicKey" } },
      PublisherRoleArn: {
        Condition: "DistributionEnabled",
        Value: { "Fn::GetAtt": ["PublisherRole", "Arn"] },
      },
      ReadbackRoleArn: {
        Condition: "DistributionEnabled",
        Value: { "Fn::GetAtt": ["ReadbackRole", "Arn"] },
      },
      RuntimeDownloadBrokerPolicyArn: {
        Condition: "DistributionEnabled",
        Value: { Ref: "RuntimeDownloadBrokerPolicy" },
      },
    },
  };
}

export function validateAmicInternalDistributionTemplate(template) {
  const expected = buildAmicInternalDistributionTemplate();
  if (JSON.stringify(stableJson(template)) !== JSON.stringify(stableJson(expected))) {
    throw new Error("AMIC internal distribution template drifted from its closed contract");
  }
  const resources = template.Resources;
  const bucket = resources.ArtifactBucket.Properties;
  const distribution = resources.Distribution.Properties.DistributionConfig;
  const bucketStatements = resources.ArtifactBucketPolicy.Properties.PolicyDocument.Statement;
  if (bucket.VersioningConfiguration?.Status !== "Enabled"
      || bucket.ObjectLockConfiguration?.Rule?.DefaultRetention?.Mode !== "COMPLIANCE"
      || bucket.BucketEncryption?.ServerSideEncryptionConfiguration?.[0]
        ?.ServerSideEncryptionByDefault?.SSEAlgorithm !== "aws:kms"
      || JSON.stringify(bucket.PublicAccessBlockConfiguration) !== JSON.stringify(publicAccessBlock())
      || !bucket.LoggingConfiguration
      || distribution.DefaultCacheBehavior?.TrustedKeyGroups?.length !== 1
      || distribution.DefaultCacheBehavior?.ViewerProtocolPolicy !== "https-only"
      || resources.OriginAccessControl.Properties.OriginAccessControlConfig.SigningBehavior !== "always"
      || resources.OriginAccessControl.Properties.OriginAccessControlConfig.SigningProtocol !== "sigv4"
      || resources.ArtifactKey.Properties.KeyPolicy.Statement.find(
        ({ Sid }) => Sid === "AllowCloudFrontOacForInternalUnsignedPrefix",
      )?.Action !== "kms:Decrypt"
      || bucketStatements.filter(({ Effect }) => Effect === "Allow").length !== 1
      || bucketStatements.find(({ Effect }) => Effect === "Allow")?.Principal?.Service
        !== "cloudfront.amazonaws.com"
      || JSON.stringify(template).match(/public-read|AllUsers|AuthenticatedUsers/iu)) {
    throw new Error("AMIC internal distribution security boundary drifted");
  }
  const publisherTrust = resources.PublisherRole.Properties.AssumeRolePolicyDocument.Statement[0];
  const readerTrust = resources.ReadbackRole.Properties.AssumeRolePolicyDocument.Statement[0];
  const publisherClaims = publisherTrust.Condition.StringEquals;
  const readerClaims = readerTrust.Condition.StringEquals;
  const brokerPolicy = resources.RuntimeDownloadBrokerPolicy.Properties.PolicyDocument.Statement;
  const brokerActions = brokerPolicy.flatMap(({ Action }) =>
    Array.isArray(Action) ? Action : [Action]);
  if (publisherClaims["token.actions.githubusercontent.com:sub"]
        !== `repo:${AMIC_INTERNAL_DISTRIBUTION_REPOSITORY}:environment:${AMIC_INTERNAL_PUBLISH_ENVIRONMENT}`
      || readerClaims["token.actions.githubusercontent.com:sub"]
        !== `repo:${AMIC_INTERNAL_DISTRIBUTION_REPOSITORY}:environment:${AMIC_INTERNAL_READBACK_ENVIRONMENT}`
      || publisherClaims["token.actions.githubusercontent.com:job_workflow_ref"] !== PUBLISH_WORKFLOW
      || Object.hasOwn(publisherClaims, "token.actions.githubusercontent.com:workflow")
      || readerClaims["token.actions.githubusercontent.com:job_workflow_ref"] !== READBACK_WORKFLOW
      || Object.hasOwn(readerClaims, "token.actions.githubusercontent.com:workflow")
      || resources.PublisherRole.Condition !== "DistributionEnabled"
      || resources.ReadbackRole.Condition !== "DistributionEnabled"
      || resources.RuntimeDownloadBrokerPolicy.Condition !== "DistributionEnabled"
      || template.Outputs.PublisherRoleArn.Condition !== "DistributionEnabled"
      || template.Outputs.ReadbackRoleArn.Condition !== "DistributionEnabled"
      || template.Outputs.RuntimeDownloadBrokerPolicyArn.Condition !== "DistributionEnabled"
      || [publisherClaims, readerClaims].some((claims) =>
        claims["token.actions.githubusercontent.com:repository_id"]
          !== AMIC_INTERNAL_DISTRIBUTION_REPOSITORY_ID
        || claims["token.actions.githubusercontent.com:repository_owner_id"]
          !== AMIC_INTERNAL_DISTRIBUTION_OWNER_ID)
      || resources.PublisherRole.Properties.Policies[0].PolicyDocument.Statement.some(
        ({ Action }) => (Array.isArray(Action) ? Action : [Action]).some((item) => item.startsWith("s3:Delete")),
      )
      || resources.ReadbackRole.Properties.Policies[0].PolicyDocument.Statement.some(
        ({ Action }) => (Array.isArray(Action) ? Action : [Action]).some((item) => ["s3:PutObject", "s3:DeleteObject"].includes(item)),
      )
      || brokerActions.some((action) => action.startsWith("s3:List")
        || action.startsWith("s3:Put")
        || action.startsWith("s3:Delete")
        || action.startsWith("kms:Encrypt")
        || action.startsWith("secretsmanager:Put")
        || action.startsWith("secretsmanager:Delete"))
      || brokerPolicy.find(({ Sid }) => Sid === "ReadOnlyInternalUnsignedObjects")?.Resource
        ?.['Fn::Sub'] !== `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`
      || resources.RuntimeDownloadBrokerPolicy.Properties.Roles?.[0]?.Ref
        !== "RuntimeDownloadBrokerRoleName") {
    throw new Error("AMIC internal distribution OIDC least-privilege boundary drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    schema_version: AMIC_INTERNAL_DISTRIBUTION_SCHEMA,
    template_sha256: sha256(template),
    resource_count: Object.keys(resources).length,
    private_artifact_bucket_count: 1,
    access_log_bucket_count: 1,
    cloudfront_oac_count: 1,
    trusted_key_group_count: 1,
    github_oidc_role_count: 2,
    runtime_download_broker_policy_count: 1,
    disabled_mode_has_aws_authority: false,
    public_artifact_access: false,
    long_lived_aws_credentials_required: false,
  });
}
