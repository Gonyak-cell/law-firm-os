import assert from "node:assert/strict";
import test from "node:test";
import {
  AMIC_INTERNAL_DISTRIBUTION_PREFIX,
  AMIC_INTERNAL_DISTRIBUTION_OWNER_ID,
  AMIC_INTERNAL_DISTRIBUTION_REPOSITORY_ID,
  AMIC_INTERNAL_DISTRIBUTION_SCHEMA,
  AMIC_INTERNAL_PUBLISH_ENVIRONMENT,
  AMIC_INTERNAL_READBACK_ENVIRONMENT,
  buildAmicInternalDistributionTemplate,
  validateAmicInternalDistributionTemplate,
} from "../lib/amic-os-internal-distribution-infrastructure.mjs";

test("internal-unsigned distribution stack is private, versioned, logged, OAC-only, and signed-URL gated", () => {
  const template = buildAmicInternalDistributionTemplate();
  const result = validateAmicInternalDistributionTemplate(template);
  assert.equal(result.verdict, "PASS");
  assert.equal(result.schema_version, AMIC_INTERNAL_DISTRIBUTION_SCHEMA);
  assert.equal(result.private_artifact_bucket_count, 1);
  assert.equal(result.access_log_bucket_count, 1);
  assert.equal(result.cloudfront_oac_count, 1);
  assert.equal(result.trusted_key_group_count, 1);
  assert.equal(result.github_oidc_role_count, 2);
  assert.equal(result.runtime_download_broker_policy_count, 1);
  assert.equal(result.disabled_mode_has_aws_authority, false);
  assert.equal(result.public_artifact_access, false);
  assert.equal(result.long_lived_aws_credentials_required, false);
  assert.match(result.template_sha256, /^[0-9a-f]{64}$/u);

  const resources = template.Resources;
  assert.deepEqual(
    resources.Distribution.Properties.DistributionConfig.Enabled,
    { "Fn::If": ["DistributionEnabled", true, false] },
  );
  assert.equal(resources.PublisherRole.Condition, "DistributionEnabled");
  assert.equal(resources.ReadbackRole.Condition, "DistributionEnabled");
  assert.equal(resources.RuntimeDownloadBrokerPolicy.Condition, "DistributionEnabled");
  assert.equal(template.Outputs.PublisherRoleArn.Condition, "DistributionEnabled");
  assert.equal(template.Outputs.ReadbackRoleArn.Condition, "DistributionEnabled");
  assert.equal(
    template.Outputs.RuntimeDownloadBrokerPolicyArn.Condition,
    "DistributionEnabled",
  );
  assert.equal(resources.ArtifactBucket.DeletionPolicy, "Retain");
  assert.equal(resources.ArtifactBucket.UpdateReplacePolicy, "Retain");
  assert.equal(resources.ArtifactBucket.Properties.VersioningConfiguration.Status, "Enabled");
  assert.equal(
    resources.ArtifactBucket.Properties.ObjectLockConfiguration.Rule.DefaultRetention.Mode,
    "COMPLIANCE",
  );
  assert.equal(
    resources.ArtifactBucket.Properties.LoggingConfiguration.DestinationBucketName.Ref,
    "AccessLogBucket",
  );
  assert.equal(
    resources.ArtifactBucketPolicy.Properties.PolicyDocument.Statement.some(
      ({ Sid }) => Sid === "DenyMissingComplianceRetainUntil",
    ),
    true,
  );
  const conditionalControlWrite =
    resources.ArtifactBucketPolicy.Properties.PolicyDocument.Statement.find(
      ({ Sid }) => Sid === "DenyUnconditionalControlWrites",
    );
  assert.deepEqual(conditionalControlWrite.Condition.Null, {
    "s3:if-match": "true",
    "s3:if-none-match": "true",
  });
  assert.equal(
    resources.OriginAccessControl.Properties.OriginAccessControlConfig.SigningBehavior,
    "always",
  );
  assert.equal(
    resources.ArtifactKey.Properties.KeyPolicy.Statement.find(
      ({ Sid }) => Sid === "AllowCloudFrontOacForInternalUnsignedPrefix",
    ).Action,
    "kms:Decrypt",
  );
  assert.deepEqual(
    resources.Distribution.Properties.DistributionConfig.DefaultCacheBehavior.TrustedKeyGroups,
    [{ Ref: "ViewerKeyGroup" }],
  );
  assert.equal(
    resources.Distribution.Properties.DistributionConfig.CacheBehaviors[0].PathPattern,
    `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}channel/*`,
  );
});

test("CloudFront prefix-scoped KMS decrypt uses object encryption context rather than a bucket key", () => {
  const template = buildAmicInternalDistributionTemplate();
  const resources = template.Resources;
  const encryption = resources.ArtifactBucket.Properties.BucketEncryption
    .ServerSideEncryptionConfiguration[0];
  assert.equal(encryption.BucketKeyEnabled, false);
  const grant = resources.ArtifactKey.Properties.KeyPolicy.Statement.find(
    ({ Sid }) => Sid === "AllowCloudFrontOacForInternalUnsignedPrefix",
  );
  assert.equal(grant.Action, "kms:Decrypt");
  assert.deepEqual(grant.Condition.StringLike["kms:EncryptionContext:aws:s3:arn"], {
    "Fn::Sub": `arn:\${AWS::Partition}:s3:::\${ArtifactBucketName}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
  });
  encryption.BucketKeyEnabled = true;
  assert.throws(() => validateAmicInternalDistributionTemplate(template), /template drifted/u);
});

test("publisher can describe only its artifact key directly while cryptographic use remains S3-only", () => {
  const statements = buildAmicInternalDistributionTemplate().Resources.PublisherRole
    .Properties.Policies[0].PolicyDocument.Statement;
  const inspection = statements.filter(({ Action }) =>
    (Array.isArray(Action) ? Action : [Action]).includes("kms:DescribeKey"));
  assert.deepEqual(inspection, [{
    Sid: "InspectInternalUnsignedArtifactKey",
    Effect: "Allow",
    Action: "kms:DescribeKey",
    Resource: { "Fn::GetAtt": ["ArtifactKey", "Arn"] },
  }]);
  const crypto = statements.find(({ Sid }) => Sid === "EncryptAndReadbackInternalUnsignedArtifacts");
  assert.deepEqual(crypto.Action, ["kms:Decrypt", "kms:GenerateDataKey"]);
  assert.deepEqual(crypto.Condition.StringEquals["kms:ViaService"], {
    "Fn::Sub": "s3.${AWS::Region}.${AWS::URLSuffix}",
  });
});

test("runtime download broker is attached to one explicit API role with read-only exact-scope access", () => {
  const template = buildAmicInternalDistributionTemplate();
  const policy = template.Resources.RuntimeDownloadBrokerPolicy.Properties;
  assert.deepEqual(policy.Roles, [{ Ref: "RuntimeDownloadBrokerRoleName" }]);
  const statements = policy.PolicyDocument.Statement;
  const objectRead = statements.find(({ Sid }) => Sid === "ReadOnlyInternalUnsignedObjects");
  assert.deepEqual(objectRead.Action, ["s3:GetObject", "s3:GetObjectVersion"]);
  assert.equal(
    objectRead.Resource["Fn::Sub"],
    `\${ArtifactBucket.Arn}/${AMIC_INTERNAL_DISTRIBUTION_PREFIX}*`,
  );
  const secretRead = statements.find(
    ({ Sid }) => Sid === "ReadOnlyCloudFrontViewerSigningSecret",
  );
  assert.deepEqual(
    secretRead.Action,
    ["secretsmanager:DescribeSecret", "secretsmanager:GetSecretValue"],
  );
  assert.deepEqual(secretRead.Resource, { Ref: "CloudFrontPrivateKeySecretArn" });
  const actions = statements.flatMap(({ Action }) => Array.isArray(Action) ? Action : [Action]);
  assert.equal(actions.some((action) => /:(?:List|Put|Delete|Update|Create)/u.test(action)), false);
  assert.equal(actions.includes("kms:Encrypt"), false);
  assert.deepEqual(template.Outputs.RuntimeDownloadBrokerPolicyArn.Value, {
    Ref: "RuntimeDownloadBrokerPolicy",
  });
  assert.deepEqual(template.Outputs.CloudFrontPublicKeyId.Value, { Ref: "ViewerPublicKey" });
});

test("internal-unsigned publisher and independent reader use disjoint exact GitHub OIDC environments", () => {
  const resources = buildAmicInternalDistributionTemplate().Resources;
  const publisher = resources.PublisherRole.Properties;
  const reader = resources.ReadbackRole.Properties;
  const publisherClaims = publisher.AssumeRolePolicyDocument.Statement[0].Condition.StringEquals;
  const readerClaims = reader.AssumeRolePolicyDocument.Statement[0].Condition.StringEquals;
  assert.equal(
    publisherClaims["token.actions.githubusercontent.com:sub"],
    `repo:Gonyak-cell/law-firm-os:environment:${AMIC_INTERNAL_PUBLISH_ENVIRONMENT}`,
  );
  assert.equal(
    readerClaims["token.actions.githubusercontent.com:sub"],
    `repo:Gonyak-cell/law-firm-os:environment:${AMIC_INTERNAL_READBACK_ENVIRONMENT}`,
  );
  assert.equal(
    publisherClaims["token.actions.githubusercontent.com:job_workflow_ref"],
    "Gonyak-cell/law-firm-os/.github/workflows/amic-os-internal-unsigned-publisher.yml@refs/heads/main",
  );
  assert.equal(
    Object.hasOwn(publisherClaims, "token.actions.githubusercontent.com:workflow"),
    false,
  );
  assert.equal(
    readerClaims["token.actions.githubusercontent.com:job_workflow_ref"],
    "Gonyak-cell/law-firm-os/.github/workflows/amic-os-internal-unsigned-readback.yml@refs/heads/main",
  );
  assert.equal(Object.hasOwn(readerClaims, "token.actions.githubusercontent.com:workflow"), false);
  for (const claims of [publisherClaims, readerClaims]) {
    assert.equal(
      claims["token.actions.githubusercontent.com:repository_id"],
      AMIC_INTERNAL_DISTRIBUTION_REPOSITORY_ID,
    );
    assert.equal(
      claims["token.actions.githubusercontent.com:repository_owner_id"],
      AMIC_INTERNAL_DISTRIBUTION_OWNER_ID,
    );
  }
  const readerActions = reader.Policies[0].PolicyDocument.Statement.flatMap(({ Action }) =>
    Array.isArray(Action) ? Action : [Action]);
  const readerHistory = reader.Policies[0].PolicyDocument.Statement.find(
    ({ Sid }) => Sid === "ListOnlyBaselineAndChannelVersionHistory",
  );
  assert.deepEqual(readerHistory.Condition.StringLike["s3:prefix"], [
    `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}baseline/*`,
    `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}channel/*`,
  ]);
  assert.equal(readerActions.includes("s3:ListBucketVersions"), true);
  assert.equal(readerActions.some((action) => action.startsWith("s3:Put")), false);
  assert.equal(readerActions.some((action) => action.startsWith("s3:Delete")), false);
  const publisherActions = publisher.Policies[0].PolicyDocument.Statement.flatMap(({ Action }) =>
    Array.isArray(Action) ? Action : [Action]);
  assert.equal(publisherActions.includes("s3:GetBucketLogging"), true);
  assert.equal(publisherActions.includes("s3:ListBucketVersions"), true);
  assert.equal(publisherActions.includes("s3:ListBucket"), false);
  const publisherHistory = publisher.Policies[0].PolicyDocument.Statement.find(
    ({ Sid }) => Sid === "ListOnlyBaselineAndChannelVersionHistory",
  );
  assert.deepEqual(publisherHistory.Condition.StringLike["s3:prefix"], [
    `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}baseline/*`,
    `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}channel/*`,
  ]);
  assert.equal(publisherActions.includes("kms:DescribeKey"), true);
  assert.equal(publisherActions.includes("s3:PutObject"), true);
  assert.equal(publisherActions.some((action) => action.startsWith("s3:Delete")), false);
});

test("internal-unsigned distribution validator rejects public access, unsigned origin access, or role broadening", () => {
  const publicBucket = structuredClone(buildAmicInternalDistributionTemplate());
  publicBucket.Resources.ArtifactBucket.Properties.PublicAccessBlockConfiguration.RestrictPublicBuckets = false;
  assert.throws(
    () => validateAmicInternalDistributionTemplate(publicBucket),
    /template drifted/u,
  );

  const unsignedOrigin = structuredClone(buildAmicInternalDistributionTemplate());
  unsignedOrigin.Resources.OriginAccessControl.Properties.OriginAccessControlConfig.SigningBehavior = "never";
  assert.throws(
    () => validateAmicInternalDistributionTemplate(unsignedOrigin),
    /template drifted/u,
  );

  const broadReader = structuredClone(buildAmicInternalDistributionTemplate());
  broadReader.Resources.ReadbackRole.Properties.Policies[0].PolicyDocument.Statement.push({
    Sid: "ForbiddenWrite",
    Effect: "Allow",
    Action: "s3:PutObject",
    Resource: "*",
  });
  assert.throws(
    () => validateAmicInternalDistributionTemplate(broadReader),
    /template drifted/u,
  );

  const broadBroker = structuredClone(buildAmicInternalDistributionTemplate());
  broadBroker.Resources.RuntimeDownloadBrokerPolicy.Properties.PolicyDocument.Statement.push({
    Sid: "ForbiddenList",
    Effect: "Allow",
    Action: "s3:ListBucket",
    Resource: "*",
  });
  assert.throws(
    () => validateAmicInternalDistributionTemplate(broadBroker),
    /template drifted/u,
  );
});
