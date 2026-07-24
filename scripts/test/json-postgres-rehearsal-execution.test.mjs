import assert from "node:assert/strict";
import test from "node:test";
import {
  JSON_POSTGRES_REHEARSAL_ARTIFACT_BUCKET,
  JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
  JSON_POSTGRES_REHEARSAL_STACK,
  assertJsonPostgresRehearsalEniAuthority,
  assertJsonPostgresRehearsalBucketState,
  assertJsonPostgresRehearsalCaller,
  assertJsonPostgresRehearsalLambda,
  assertJsonPostgresRehearsalStack,
  buildJsonPostgresRehearsalArtifactStoreParameters,
  createJsonPostgresRehearsalTarget,
  createJsonPostgresImmutableInputLocator,
  jsonPostgresRehearsalParametersSha256,
  validateJsonPostgresRehearsalChangeSet,
} from "../lib/json-postgres-rehearsal-execution.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const ARTIFACT_SHA = "c".repeat(64);
const PACKET_SHA = "d".repeat(64);
const REGISTRY_SHA = "e".repeat(64);

function packet() {
  return {
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    bindings: { artifact_sha256: ARTIFACT_SHA },
    target: {
      artifact_bucket_name:
        "lawos-private-rehearsal-artifacts-770880870480",
      program_input_bucket_name:
        "lawos-private-rehearsal-input-770880870480",
      dms_bucket_name: "lawos-private-rehearsal-dms-770880870480",
    },
  };
}

test("W12 target is deterministic, private, isolated and cost bounded", () => {
  const target = createJsonPostgresRehearsalTarget({
    approvedTenantIds: ["tenant_amic"],
  });
  assert.equal(target.artifact_bucket_name, JSON_POSTGRES_REHEARSAL_ARTIFACT_BUCKET);
  assert.equal(target.isolated, true);
  assert.equal(target.production, false);
  assert.equal(target.public_access, false);
  assert.equal(target.tls_mode, "verify-full");
  assert.equal(target.monthly_cost_ceiling_krw, 300000);
  assert.equal(target.dms_bucket_name, "lawos-private-rehearsal-dms-770880870480");
  assert.equal(
    target.program_input_bucket_name,
    "lawos-private-rehearsal-input-770880870480",
  );
});

test("W12 caller and artifact-store change set are exact-role and add-only", () => {
  const caller = assertJsonPostgresRehearsalCaller({
    Account: "770880870480",
    Arn: "arn:aws:sts::770880870480:assumed-role/matter-staging-admin/session",
  });
  assert.equal(caller.role, "matter-staging-admin");
  assert.throws(() => assertJsonPostgresRehearsalCaller({
    Account: "770880870480",
    Arn: "arn:aws:sts::770880870480:assumed-role/matter-prod-deploy-admin/session",
  }));

  const parameters = buildJsonPostgresRehearsalArtifactStoreParameters({
    owner: "law-firm-os-owner",
    reviewDate: "2026-07-24",
    expirationDate: "2026-08-31",
  });
  const review = validateJsonPostgresRehearsalChangeSet({
    StackName: JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
    ChangeSetId: "change-set-id",
    Changes: [{
      ResourceChange: {
        Action: "Add",
        LogicalResourceId: "RehearsalArtifactBucket",
        ResourceType: "AWS::S3::Bucket",
        Replacement: "False",
        Scope: [],
      },
    }],
  }, {
    stackName: JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
    changeSetType: "CREATE",
    phase: "artifact-store",
    templateSha256: "d".repeat(64),
    parametersSha256: jsonPostgresRehearsalParametersSha256(parameters),
  });
  assert.equal(review.verdict, "PASS");
  const unknown = {
    StackName: JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
    ChangeSetId: "unknown-change-set",
    Changes: [{
      ResourceChange: {
        Action: "Add",
        LogicalResourceId: "RehearsalArtifactUnexpectedRole",
        ResourceType: "AWS::IAM::Role",
        Replacement: "False",
        Scope: [],
      },
    }],
  };
  assert.throws(() => validateJsonPostgresRehearsalChangeSet(unknown, {
    stackName: JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
    changeSetType: "CREATE",
    phase: "artifact-store",
    templateSha256: "d".repeat(64),
    parametersSha256: jsonPostgresRehearsalParametersSha256(parameters),
  }));
  assert.throws(() => validateJsonPostgresRehearsalChangeSet({
    ...unknown,
    ChangeSetType: "UPDATE",
  }, {
    stackName: JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
    changeSetType: "CREATE",
    phase: "artifact-store",
    templateSha256: "d".repeat(64),
    parametersSha256: jsonPostgresRehearsalParametersSha256(parameters),
  }), /binding is invalid/u);

  const versionedTemplateUrl =
    "https://lawos-private-rehearsal-artifacts-770880870480"
    + ".s3.ap-northeast-2.amazonaws.com/cloudformation-template/exact.json"
    + "?versionId=version-1";
  const versionBound = structuredClone(unknown);
  versionBound.Changes[0].ResourceChange.LogicalResourceId =
    "RehearsalArtifactBucket";
  assert.equal(
    validateJsonPostgresRehearsalChangeSet(versionBound, {
      stackName: JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
      changeSetType: "CREATE",
      phase: "artifact-store",
      templateSha256: "d".repeat(64),
      parametersSha256: jsonPostgresRehearsalParametersSha256(parameters),
      templateUrl: versionedTemplateUrl,
    }).template_url,
    versionedTemplateUrl,
  );
  assert.throws(
    () => validateJsonPostgresRehearsalChangeSet(versionBound, {
      stackName: JSON_POSTGRES_REHEARSAL_ARTIFACT_STACK,
      changeSetType: "CREATE",
      phase: "artifact-store",
      templateSha256: "d".repeat(64),
      parametersSha256: jsonPostgresRehearsalParametersSha256(parameters),
      templateUrl: versionedTemplateUrl.split("?")[0],
    }),
    /binding is invalid/u,
  );
});

test("W12 change-set review allows the exact one-time identity tenant rebind only when declared", () => {
  const changeSet = {
    StackName: JSON_POSTGRES_REHEARSAL_STACK,
    ChangeSetId: "change-set-identity-rebind",
    Changes: [{
      ResourceChange: {
        Action: "Modify",
        LogicalResourceId: "ApiFunction",
        ResourceType: "AWS::Lambda::Function",
        Replacement: "False",
        Scope: ["Properties"],
      },
    }, {
      ResourceChange: {
        Action: "Add",
        LogicalResourceId: "RehearsalAdminFunction",
        ResourceType: "AWS::Lambda::Function",
        Replacement: "False",
        Scope: [],
      },
    }],
  };
  const options = {
    stackName: JSON_POSTGRES_REHEARSAL_STACK,
    changeSetType: "UPDATE",
    phase: "enable-eni",
    templateSha256: "d".repeat(64),
    parametersSha256: "e".repeat(64),
    allowIdentityTenantRebind: true,
  };
  assert.equal(
    validateJsonPostgresRehearsalChangeSet(
      changeSet,
      options,
    ).identity_tenant_rebind,
    true,
  );
  assert.throws(
    () => validateJsonPostgresRehearsalChangeSet(changeSet, {
      ...options,
      allowIdentityTenantRebind: false,
    }),
    /unapproved delta/u,
  );
  assert.throws(
    () => validateJsonPostgresRehearsalChangeSet({
      ...changeSet,
      Changes: changeSet.Changes.slice(1),
    }, options),
    /identity tenant rebind/u,
  );
});

test("W12 immutable bucket state rejects public, mutable and wrong-key storage", () => {
  const expected = {
    bucketName: JSON_POSTGRES_REHEARSAL_ARTIFACT_BUCKET,
    expectedBucketName: JSON_POSTGRES_REHEARSAL_ARTIFACT_BUCKET,
    expectedKmsKeyArn: "arn:aws:kms:ap-northeast-2:770880870480:key/key-id",
    versioning: { Status: "Enabled" },
    publicAccess: {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      },
    },
    objectLock: {
      ObjectLockConfiguration: {
        ObjectLockEnabled: "Enabled",
        Rule: { DefaultRetention: { Mode: "COMPLIANCE", Days: 365 } },
      },
    },
    encryption: {
      ServerSideEncryptionConfiguration: [{
        ApplyServerSideEncryptionByDefault: {
          SSEAlgorithm: "aws:kms",
          KMSMasterKeyID:
            "arn:aws:kms:ap-northeast-2:770880870480:key/key-id",
        },
      }],
    },
  };
  assert.equal(
    assertJsonPostgresRehearsalBucketState(expected).object_lock_enabled,
    true,
  );
  const unsafe = structuredClone(expected);
  unsafe.publicAccess.PublicAccessBlockConfiguration.BlockPublicPolicy = false;
  assert.throws(() => assertJsonPostgresRehearsalBucketState(unsafe));
});

test("W12 deployed stack, Lambda and locator remain exact and non-production", () => {
  const stack = {
    StackStatus: "UPDATE_COMPLETE",
    Parameters: Object.entries({
      W12SourceSha: SOURCE_SHA,
      W12SourceTree: SOURCE_TREE,
      W12ArtifactBucket:
        "lawos-private-rehearsal-artifacts-770880870480",
      W12ArtifactKey:
        `program-artifact/${SOURCE_SHA}/${ARTIFACT_SHA}.zip`,
      W12ArtifactVersion: "immutable-version",
      W12ArtifactSha256: ARTIFACT_SHA,
      W12ExecutionPacketSha256: PACKET_SHA,
      W12OwnerTrustRegistrySha256: REGISTRY_SHA,
      W12ApprovalId: "LAWOS-W12-APPROVAL",
      W12ProgramInputBucketName:
        "lawos-private-rehearsal-input-770880870480",
      W12DmsBucketName:
        "lawos-private-rehearsal-dms-770880870480",
      EnableLambdaEniBootstrap: "false",
      EnableW12LambdaEniBootstrap: "false",
    }).map(([ParameterKey, ParameterValue]) => ({
      ParameterKey,
      ParameterValue,
    })),
  };
  assert.equal(assertJsonPostgresRehearsalStack(stack, {
    packet: packet(),
    artifactVersion: "immutable-version",
    trustRegistrySha256: REGISTRY_SHA,
    approvalId: "LAWOS-W12-APPROVAL",
  }).verdict, "PASS");
  const configuration = {
    FunctionName: "lawos-private-staging-w12-admin",
    State: "Active",
    LastUpdateStatus: "Successful",
    Runtime: "nodejs22.x",
    Architectures: ["arm64"],
    Role:
      "arn:aws:iam::770880870480:role/lawos-private-staging-w12-admin-role",
    CodeSha256: Buffer.from(ARTIFACT_SHA, "hex").toString("base64"),
    VpcConfig: {
      VpcId: "vpc-private",
      SubnetIds: ["subnet-a", "subnet-b"],
      SecurityGroupIds: ["sg-private"],
    },
    Environment: {
      Variables: {
        LAWOS_DATABASE_NAME: "lawos_rehearsal",
        LAWOS_ADMIN_DATABASE_NAME: "lawos",
        LAWOS_DATA_SCOPE: "approved-real-manifest",
        LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
        LAWOS_POSTGRES_SSL_MODE: "verify-full",
        LAWOS_RUNTIME_PROFILE: "operational",
        LAWOS_STAFF_AUTHORITY: "internal-password",
        LAWOS_DEPLOYMENT_COMMIT: SOURCE_SHA,
        LAWOS_DEPLOYMENT_TREE: SOURCE_TREE,
        LAWOS_DEPLOYMENT_ARTIFACT_SHA256: ARTIFACT_SHA,
        LAWOS_EXECUTION_PACKET_SHA256: PACKET_SHA,
      },
    },
  };
  assert.equal(assertJsonPostgresRehearsalLambda(configuration, {
    packet: packet(),
    expectedVpcId: "vpc-private",
  }).external_email_authority_count, 0);
  const unsafe = structuredClone(configuration);
  unsafe.Environment.Variables.LAWOS_JSON_FALLBACK = "true";
  assert.throws(() => assertJsonPostgresRehearsalLambda(unsafe, {
    packet: packet(),
    expectedVpcId: "vpc-private",
  }));
  const locator = createJsonPostgresImmutableInputLocator({
    bucket: "lawos-private-rehearsal-input-770880870480",
    key: `program-input/${PACKET_SHA}/authorization/packet`,
    versionId: "immutable-version",
    expectedBucketOwner: "770880870480",
    sha256: ARTIFACT_SHA,
    byteSize: 42,
  });
  assert.equal(locator.expected_bucket_owner, "770880870480");
});

test("W12 final role has one runtime policy, no ENI allow and one source-function deny", () => {
  const runtime = {
    Statement: [{
      Sid: "DenyFunctionCodeEc2Networking",
      Effect: "Deny",
      Action: ["ec2:CreateNetworkInterface"],
      Resource: "*",
      Condition: {
        ArnEquals: {
          "lambda:SourceFunctionArn":
            "arn:aws:lambda:ap-northeast-2:770880870480:function:lawos-private-staging-w12-admin",
        },
      },
    }],
  };
  assert.equal(assertJsonPostgresRehearsalEniAuthority({
    policyNames: ["lawos-private-rehearsal-admin-runtime"],
    policyDocuments: [runtime],
  }).temporary_eni_allow_count, 0);
  const unsafe = structuredClone(runtime);
  unsafe.Statement.push({
    Effect: "Allow",
    Action: ["ec2:DescribeSubnets"],
    Resource: "*",
  });
  assert.throws(() => assertJsonPostgresRehearsalEniAuthority({
    policyNames: ["lawos-private-rehearsal-admin-runtime"],
    policyDocuments: [unsafe],
  }));
});
