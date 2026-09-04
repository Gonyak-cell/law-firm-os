import assert from "node:assert/strict";
import test from "node:test";
import {
  AMIC_PRIVATE_BOOTSTRAP_PACKET_INPUT_VERSION,
  createAmicPrivateBootstrapPhotoStorageAdapterId,
  discoverAmicPrivateBootstrapProductionTarget,
  validateAmicPrivateBootstrapGitState,
  validateAmicPrivateBootstrapS3Controls,
  validateAmicPrivateBootstrapPacketInput,
  verifyAmicPrivateBootstrapAwsCaller,
} from "../lib/amic-private-bootstrap-production.mjs";

function discovery() {
  const account = "770880870480";
  const region = "ap-northeast-2";
  const bucket = "lawos-private-member-photos-prod";
  const keyId = "11111111-2222-3333-4444-555555555555";
  const keyArn = `arn:aws:kms:${region}:${account}:key/${keyId}`;
  const databaseArn =
    `arn:aws:secretsmanager:${region}:${account}:secret:/lawos/production/postgres/application-AbCdEf`;
  const tenantArn =
    `arn:aws:secretsmanager:${region}:${account}:secret:/lawos/production/postgres/tenant-context-GhIjKl`;
  return {
    expectedAccount: account,
    expectedRegion: region,
    expectedStack: "lawos-production",
    stack: {
      StackName: "lawos-production",
      StackId:
        `arn:aws:cloudformation:${region}:${account}:stack/lawos-production/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`,
      StackStatus: "UPDATE_COMPLETE",
      Parameters: [
        { ParameterKey: "DmsBucketName", ParameterValue: bucket },
        { ParameterKey: "SourceSha", ParameterValue: "a".repeat(40) },
        { ParameterKey: "SourceTree", ParameterValue: "b".repeat(40) },
        { ParameterKey: "ExecutionPacketSha256", ParameterValue: "c".repeat(64) },
      ],
      Outputs: [
        { OutputKey: "DmsBucketName", OutputValue: bucket },
        { OutputKey: "ProgramInputKmsKeyArn", OutputValue: keyArn },
        { OutputKey: "ExternalReadProvidersEnabled", OutputValue: "false" },
      ],
    },
    resources: [
      {
        LogicalResourceId: "ApplicationDatabaseSecret",
        PhysicalResourceId: databaseArn,
        ResourceType: "AWS::SecretsManager::Secret",
        ResourceStatus: "CREATE_COMPLETE",
      },
      {
        LogicalResourceId: "TenantContextSecret",
        PhysicalResourceId: tenantArn,
        ResourceType: "AWS::SecretsManager::Secret",
        ResourceStatus: "CREATE_COMPLETE",
      },
      {
        LogicalResourceId: "DmsBucket",
        PhysicalResourceId: bucket,
        ResourceType: "AWS::S3::Bucket",
        ResourceStatus: "CREATE_COMPLETE",
      },
      {
        LogicalResourceId: "ProductionKey",
        PhysicalResourceId: keyId,
        ResourceType: "AWS::KMS::Key",
        ResourceStatus: "CREATE_COMPLETE",
      },
    ],
    databaseSecret: {
      ARN: databaseArn,
      Name: "/lawos/production/postgres/application",
    },
    tenantContextSecret: {
      ARN: tenantArn,
      Name: "/lawos/production/postgres/tenant-context",
    },
    kms: {
      KeyMetadata: {
        AWSAccountId: account,
        Arn: keyArn,
        KeyId: keyId,
      },
    },
  };
}

function target() {
  return {
    aws_account: "770880870480",
    aws_region: "ap-northeast-2",
    database_secret_ref: "lawos/production/postgres-url",
    tenant_context_secret_ref: "lawos/production/postgres-tenant-context",
    photo_bucket_name: "lawos-private-member-photos-prod",
    photo_expected_bucket_owner: "770880870480",
    photo_kms_key_arn:
      "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-2222-3333-4444-555555555555",
    photo_prefix: "amic-private-bootstrap/member-photos",
    bucket_versioning_required: true,
    bucket_owner_enforced: true,
    public_access_block_required: true,
    server_side_encryption: "aws:kms",
  };
}

function controls() {
  const production = target();
  return {
    target: production,
    location: { LocationConstraint: production.aws_region },
    versioning: { Status: "Enabled" },
    publicAccessBlock: {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    },
    encryption: {
      ServerSideEncryptionConfiguration: {
        Rules: [{
          ApplyServerSideEncryptionByDefault: {
            SSEAlgorithm: "aws:kms",
            KMSMasterKeyID: production.photo_kms_key_arn,
          },
          BucketKeyEnabled: true,
        }],
      },
    },
    ownership: {
      OwnershipControls: {
        Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }],
      },
    },
    kms: {
      KeyMetadata: {
        AWSAccountId: production.aws_account,
        Arn: production.photo_kms_key_arn,
        Enabled: true,
        KeyState: "Enabled",
        KeyUsage: "ENCRYPT_DECRYPT",
        Origin: "AWS_KMS",
        KeyManager: "CUSTOMER",
      },
    },
  };
}

test("operator packet input is closed, non-synthetic, and derives one stable adapter id", () => {
  const input = {
    schema_version: AMIC_PRIVATE_BOOTSTRAP_PACKET_INPUT_VERSION,
    packet_id: "amic-private-bootstrap-production-001",
    environment: "lawos-production",
    negative_tenant_id: "tenant-negative-control",
    production_target: target(),
  };
  assert.deepEqual(validateAmicPrivateBootstrapPacketInput(input), input);
  assert.equal(
    createAmicPrivateBootstrapPhotoStorageAdapterId(target()),
    createAmicPrivateBootstrapPhotoStorageAdapterId(target()),
  );
  assert.throws(
    () => validateAmicPrivateBootstrapPacketInput({
      ...input,
      environment: "synthetic-test",
    }),
    (error) => error?.code === "AMIC_PRIVATE_BOOTSTRAP_INPUT",
  );
  assert.throws(
    () => validateAmicPrivateBootstrapPacketInput({
      ...input,
      extra: true,
    }),
    (error) => error?.code === "AMIC_PRIVATE_BOOTSTRAP_INPUT",
  );
});

test("operator git gate requires clean exact origin/main for production", () => {
  const state = {
    status: "",
    sourceSha: "a".repeat(40),
    sourceTree: "b".repeat(40),
    originMain: "a".repeat(40),
    environment: "lawos-production",
  };
  assert.equal(validateAmicPrivateBootstrapGitState(state).clean, true);
  for (const drift of [
    { status: " M source.js" },
    { originMain: "c".repeat(40) },
    { sourceTree: "not-a-tree" },
  ]) {
    assert.throws(
      () => validateAmicPrivateBootstrapGitState({ ...state, ...drift }),
      (error) => error?.code === "AMIC_PRIVATE_BOOTSTRAP_GIT_STATE",
    );
  }
});

test("AWS caller must be the exact signed account and cutover role", () => {
  const receipt = verifyAmicPrivateBootstrapAwsCaller({
    target: target(),
    identity: {
      Account: "770880870480",
      Arn: "arn:aws:sts::770880870480:assumed-role/matter-cutover-operator/private-bootstrap",
    },
  });
  assert.equal(receipt.verified, true);
  assert.equal(receipt.account, "770880870480");
  assert.equal(receipt.role, "matter-cutover-operator");
  assert.equal(receipt.raw_arn_returned, false);
  assert.doesNotMatch(
    JSON.stringify(receipt),
    /arn:aws:sts|private-bootstrap/u,
  );
});

test("AWS caller rejects account and role drift", () => {
  for (const identity of [{
    Account: "123456789012",
    Arn: "arn:aws:sts::123456789012:assumed-role/matter-cutover-operator/session",
  }, {
    Account: "770880870480",
    Arn: "arn:aws:sts::770880870480:assumed-role/matter-prod-deploy-admin/session",
  }]) {
    assert.throws(
      () => verifyAmicPrivateBootstrapAwsCaller({ identity, target: target() }),
      (error) => error?.code === "AMIC_PRIVATE_BOOTSTRAP_AWS_CALLER",
    );
  }
});

test("S3 and KMS control readback closes without raw infrastructure identifiers", () => {
  const receipt = validateAmicPrivateBootstrapS3Controls(controls());
  assert.deepEqual(receipt, {
    bucket_ref_sha256: receipt.bucket_ref_sha256,
    kms_key_ref_sha256: receipt.kms_key_ref_sha256,
    region: "ap-northeast-2",
    versioning_enabled: true,
    public_access_blocked: true,
    bucket_owner_enforced: true,
    default_encryption: "aws:kms",
    bucket_key_enabled: true,
    kms_key_enabled: true,
    verified: true,
    raw_bucket_returned: false,
    raw_kms_key_returned: false,
  });
  assert.doesNotMatch(
    JSON.stringify(receipt),
    /lawos-private-member-photos-prod|arn:aws:kms/u,
  );
});

test("S3 and KMS readback fails closed on every material control drift", () => {
  const cases = [
    (value) => { value.location.LocationConstraint = "us-east-1"; },
    (value) => { value.versioning.Status = "Suspended"; },
    (value) => {
      value.publicAccessBlock.PublicAccessBlockConfiguration.RestrictPublicBuckets = false;
    },
    (value) => {
      value.encryption.ServerSideEncryptionConfiguration.Rules[0]
        .ApplyServerSideEncryptionByDefault.SSEAlgorithm = "AES256";
    },
    (value) => {
      value.encryption.ServerSideEncryptionConfiguration.Rules[0]
        .BucketKeyEnabled = false;
    },
    (value) => {
      value.ownership.OwnershipControls.Rules[0].ObjectOwnership = "ObjectWriter";
    },
    (value) => { value.kms.KeyMetadata.Enabled = false; },
    (value) => { value.kms.KeyMetadata.KeyManager = "AWS"; },
  ];
  for (const mutate of cases) {
    const value = controls();
    mutate(value);
    assert.throws(
      () => validateAmicPrivateBootstrapS3Controls(value),
      (error) => error?.code === "AMIC_PRIVATE_BOOTSTRAP_S3_CONTROLS",
    );
  }
});

test("production discovery binds exact stack resources without reading secret values", () => {
  const discovered = discoverAmicPrivateBootstrapProductionTarget(discovery());
  assert.equal(discovered.aws_account, "770880870480");
  assert.equal(discovered.aws_region, "ap-northeast-2");
  assert.equal(discovered.photo_bucket_name, "lawos-private-member-photos-prod");
  assert.equal(
    discovered.photo_prefix,
    "approved-real-migration/member-photos",
  );
  assert.match(discovered.database_secret_ref, /^arn:aws:secretsmanager:/u);
  assert.match(discovered.tenant_context_secret_ref, /^arn:aws:secretsmanager:/u);
});

test("production discovery rejects stack, resource, secret, and output drift", () => {
  const cases = [
    (value) => { value.stack.StackStatus = "UPDATE_IN_PROGRESS"; },
    (value) => { value.resources[0].ResourceType = "AWS::SSM::Parameter"; },
    (value) => { value.databaseSecret.DeletedDate = "2026-09-04T00:00:00Z"; },
    (value) => { value.stack.Outputs[0].OutputValue = "wrong-bucket"; },
    (value) => { value.stack.Outputs[2].OutputValue = "true"; },
    (value) => { value.kms.KeyMetadata.KeyId = "wrong-key"; },
  ];
  for (const mutate of cases) {
    const value = discovery();
    mutate(value);
    assert.throws(
      () => discoverAmicPrivateBootstrapProductionTarget(value),
      (error) => String(error?.code ?? "").startsWith(
        "AMIC_PRIVATE_BOOTSTRAP_AWS_",
      ),
    );
  }
});
