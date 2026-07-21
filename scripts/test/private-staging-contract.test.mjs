import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  validateArtifactStoreTemplate,
  validatePrivateStagingCost,
  validatePrivateStagingTemplate,
} from "../lib/private-staging-contract.mjs";

function fixture(path) {
  return JSON.parse(readFileSync(new URL(`../../infra/lawos-private-staging/${path}`, import.meta.url), "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function resolvedRolePolicies(template, logicalId, eniBootstrapEnabled) {
  return template.Resources[logicalId].Properties.Policies.flatMap((policy) => {
    const conditional = policy?.["Fn::If"];
    if (!conditional) return [policy];
    const selected = eniBootstrapEnabled ? conditional[1] : conditional[2];
    return selected?.Ref === "AWS::NoValue" ? [] : [selected];
  });
}

test("private staging infrastructure contract is isolated and cost gated", () => {
  const result = validatePrivateStagingTemplate(fixture("template.json"));
  assert.equal(result.verdict, "PASS_WITH_OWNER_DELTA_REQUIRED");
  assert.equal(result.public_rds_count, 0);
  assert.equal(result.database_default_route_count, 0);
  assert.equal(result.internet_gateway_count, 0);
  assert.equal(result.nat_gateway_count, 0);
  assert.equal(result.public_subnet_count, 0);
  assert.equal(result.interface_endpoint_count, 2);
  assert.equal(result.lambda_function_url_count, 0);
  assert.equal(result.iam_wildcard_allow_count, 2);
  assert.deepEqual(result.iam_wildcard_allow_sids, ["LambdaVpcEniBootstrap", "LambdaVpcEniBootstrap"]);
  assert.deepEqual(result.kms_current_key_wildcard_allow_sids, ["EnableAccountIamAuthority", "AllowRegionalCloudWatchLogsEncryption"]);
  assert.equal(result.bootstrap_default_enabled, false);
  assert.ok(result.inline_template_byte_size > 0 && result.inline_template_byte_size <= 51_200);

  const unversioned = clone(fixture("template.json"));
  delete unversioned.Resources.ApiFunction.Properties.Code.S3ObjectVersion;
  assert.throws(() => validatePrivateStagingTemplate(unversioned), /immutable artifact version/u);
});

test("Lambda ENI bootstrap is an embedded true-only role policy with resolvable dependencies", () => {
  const template = fixture("template.json");
  assert.equal(template.Resources.LambdaVpcEniBootstrapPolicy, undefined);

  for (const [roleId, runtimePolicyName] of [
    ["ApiExecutionRole", "lawos-private-staging-api-runtime"],
    ["AdminExecutionRole", "lawos-private-staging-admin-runtime"],
  ]) {
    const enabled = resolvedRolePolicies(template, roleId, true);
    const disabled = resolvedRolePolicies(template, roleId, false);
    assert.deepEqual(enabled.map((policy) => policy.PolicyName), [
      runtimePolicyName,
      "lawos-private-staging-lambda-vpc-eni-bootstrap-temporary",
    ]);
    assert.deepEqual(disabled.map((policy) => policy.PolicyName), [runtimePolicyName]);
    assert.deepEqual(enabled[1].PolicyDocument.Statement[0], {
      Sid: "LambdaVpcEniBootstrap",
      Effect: "Allow",
      Action: [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DescribeSubnets",
        "ec2:DeleteNetworkInterface",
        "ec2:AssignPrivateIpAddresses",
        "ec2:UnassignPrivateIpAddresses",
      ],
      Resource: "*",
    });
  }

  assert.deepEqual(template.Resources.ApiFunction.DependsOn, ["ApiLogGroup"]);
  assert.deepEqual(template.Resources.AdminFunction.DependsOn, ["AdminLogGroup"]);

  const residual = clone(template);
  residual.Resources.ApiExecutionRole.Properties.Policies[1]["Fn::If"][2] = residual.Resources.ApiExecutionRole.Properties.Policies[1]["Fn::If"][1];
  assert.throws(() => validatePrivateStagingTemplate(residual), /disabled branch|IAM policy contract/u);

  const wrongCondition = clone(template);
  wrongCondition.Resources.ApiExecutionRole.Properties.Policies[1]["Fn::If"][0] = "SomeOtherCondition";
  assert.throws(() => validatePrivateStagingTemplate(wrongCondition), /LambdaEniBootstrapEnabled|IAM policy contract/u);

  const missingDeny = clone(template);
  missingDeny.Resources.ApiExecutionRole.Properties.Policies[0].PolicyDocument.Statement = missingDeny.Resources.ApiExecutionRole.Properties.Policies[0].PolicyDocument.Statement.filter((statement) => statement.Sid !== "DenyFunctionCodeEc2Networking");
  assert.throws(() => validatePrivateStagingTemplate(missingDeny), /function-code EC2 deny|IAM policy contract/u);
});

test("artifact store contract permits only the isolated bucket and deny policy", () => {
  assert.equal(validateArtifactStoreTemplate(fixture("artifact-store-template.json")).verdict, "PASS");

  const broadened = clone(fixture("artifact-store-template.json"));
  broadened.Resources.ArtifactBucketPolicy.Properties.PolicyDocument.Statement.push({
    Sid: "AllowExternalRead",
    Effect: "Allow",
    Principal: { AWS: "arn:aws:iam::111122223333:root" },
    Action: "s3:GetObject",
    Resource: { "Fn::Sub": "${ArtifactBucket.Arn}/*" },
  });
  assert.throws(() => validateArtifactStoreTemplate(broadened), /artifact bucket policy/u);

  const wrongBucket = clone(fixture("artifact-store-template.json"));
  wrongBucket.Resources.ArtifactBucketPolicy.Properties.Bucket = "unapproved-bucket";
  assert.throws(() => validateArtifactStoreTemplate(wrongBucket), /artifact bucket policy/u);
});

test("cost estimate is below both the owner cap and stricter AWS budget", () => {
  const result = validatePrivateStagingCost(fixture("cost-estimate.json"));
  assert.equal(result.verdict, "PASS");
  assert.equal(result.total_monthly_estimate_usd, 98);
  assert.equal(result.total_monthly_estimate_krw, 147000);
});

test("public RDS and database default routes are rejected", () => {
  const publicRds = clone(fixture("template.json"));
  publicRds.Resources.Database.Properties.PubliclyAccessible = true;
  assert.throws(() => validatePrivateStagingTemplate(publicRds), /must not be publicly accessible/u);

  const dbRoute = clone(fixture("template.json"));
  dbRoute.Resources.BadDatabaseDefaultRoute = {
    Type: "AWS::EC2::Route",
    Properties: { DestinationCidrBlock: "0.0.0.0/0", RouteTableId: { Ref: "DbRouteTableA" }, NatGatewayId: "nat-forbidden" },
  };
  assert.throws(() => validatePrivateStagingTemplate(dbRoute), /internet default route/u);
});

test("internet gateways, NAT, Entra, and legacy persistence authority are rejected", () => {
  const internet = clone(fixture("template.json"));
  internet.Resources.InternetGateway = { Type: "AWS::EC2::InternetGateway", Properties: { Tags: [] } };
  assert.throws(() => validatePrivateStagingTemplate(internet), /forbidden public or NAT networking/u);

  const entra = clone(fixture("template.json"));
  entra.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_ENTRA_OIDC_CONFIG_SECRET_ID = { Ref: "SessionSecret" };
  assert.throws(() => validatePrivateStagingTemplate(entra), /ENTRA/u);

  const jsonStore = clone(fixture("template.json"));
  jsonStore.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_RUNTIME_STORE_PATH = "/tmp/runtime-stores";
  assert.throws(() => validatePrivateStagingTemplate(jsonStore), /legacy persistence path/u);
});

test("private service endpoints and internal password authority are mandatory", () => {
  const endpoint = clone(fixture("template.json"));
  endpoint.Resources.SecretsManagerEndpoint.Properties.PrivateDnsEnabled = false;
  assert.throws(() => validatePrivateStagingTemplate(endpoint), /private DNS/u);

  const wrongPrefixList = clone(fixture("template.json"));
  wrongPrefixList.Mappings.ServicePrefixLists["ap-northeast-2"].S3 = "pl-unapproved";
  assert.throws(() => validatePrivateStagingTemplate(wrongPrefixList), /S3 prefix-list mapping/u);

  const publicS3Egress = clone(fixture("template.json"));
  delete publicS3Egress.Resources.LambdaEgressToS3Gateway.Properties.DestinationPrefixListId;
  publicS3Egress.Resources.LambdaEgressToS3Gateway.Properties.CidrIp = "0.0.0.0/0";
  assert.throws(() => validatePrivateStagingTemplate(publicS3Egress), /approved regional S3 prefix list|must not use CIDR/u);

  const auth = clone(fixture("template.json"));
  auth.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_STAFF_AUTHORITY = "entra-oidc";
  assert.throws(() => validatePrivateStagingTemplate(auth), /internal-password/u);
});

test("role reuse, managed policies, and unrelated wildcard Allows are rejected", () => {
  const roleReuse = clone(fixture("template.json"));
  roleReuse.Resources.ApiExecutionRole.Properties.RoleName = "matter-lawos-api-prod-lambda-role";
  assert.throws(() => validatePrivateStagingTemplate(roleReuse), /protected resource marker/u);

  const managed = clone(fixture("template.json"));
  managed.Resources.ApiExecutionRole.Properties.ManagedPolicyArns = ["arn:aws:iam::aws:policy/AdministratorAccess"];
  assert.throws(() => validatePrivateStagingTemplate(managed), /managed policies/u);

  const wildcard = clone(fixture("template.json"));
  wildcard.Resources.ApiExecutionRole.Properties.Policies[0].PolicyDocument.Statement.push({
    Sid: "BadWildcard",
    Effect: "Allow",
    Action: "s3:GetObject",
    Resource: "*",
  });
  assert.throws(() => validatePrivateStagingTemplate(wildcard), /IAM policy contract|only IAM Allow with Resource/u);

  const arrayWildcard = clone(fixture("template.json"));
  arrayWildcard.Resources.ApiExecutionRole.Properties.Policies[0].PolicyDocument.Statement.push({
    Sid: "ArrayWildcard",
    Effect: "Allow",
    Action: ["s3:GetObject"],
    Resource: ["*"],
  });
  assert.throws(() => validatePrivateStagingTemplate(arrayWildcard), /IAM policy contract|only IAM Allow/u);

  const broadenedTrust = clone(fixture("template.json"));
  broadenedTrust.Resources.ApiExecutionRole.Properties.AssumeRolePolicyDocument.Statement[0].Principal.Service = [
    "lambda.amazonaws.com",
    "ec2.amazonaws.com",
  ];
  assert.throws(() => validatePrivateStagingTemplate(broadenedTrust), /IAM trust policy contract/u);

  const extraRole = clone(fixture("template.json"));
  extraRole.Resources.UnreviewedRole = {
    Type: "AWS::IAM::Role",
    Properties: {
      AssumeRolePolicyDocument: broadenedTrust.Resources.ApiExecutionRole.Properties.AssumeRolePolicyDocument,
      Policies: [],
    },
  };
  assert.throws(() => validatePrivateStagingTemplate(extraRole), /unexpected IAM policy-bearing resource/u);

  const extraLambdaGrant = clone(fixture("template.json"));
  extraLambdaGrant.Resources.UnreviewedInvokePermission = {
    Type: "AWS::Lambda::Permission",
    Properties: {
      Action: "lambda:InvokeFunction",
      FunctionName: { Ref: "AdminFunction" },
      Principal: "s3.amazonaws.com",
    },
  };
  assert.throws(() => validatePrivateStagingTemplate(extraLambdaGrant), /unexpected Lambda resource policy/u);

  const attachedManagedPolicy = clone(fixture("template.json"));
  attachedManagedPolicy.Resources.UnreviewedManagedPolicy = {
    Type: "AWS::IAM::ManagedPolicy",
    Properties: {
      Roles: [{ Ref: "ApiExecutionRole" }],
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [{ Effect: "Allow", Action: "s3:*", Resource: "*" }],
      },
    },
  };
  assert.throws(() => validatePrivateStagingTemplate(attachedManagedPolicy), /unexpected IAM policy-bearing resource/u);

  const broadenedTopicGrant = clone(fixture("template.json"));
  broadenedTopicGrant.Resources.CostAlertTopicPolicy.Properties.PolicyDocument.Statement[0].Principal = "*";
  assert.throws(() => validatePrivateStagingTemplate(broadenedTopicGrant), /SNS resource policy contract/u);
});

test("KMS wildcard semantics remain confined to the current staging key", () => {
  const template = clone(fixture("template.json"));
  template.Resources.StagingKey.Properties.KeyPolicy.Statement.push({
    Sid: "BadKmsWildcard",
    Effect: "Allow",
    Principal: { AWS: "*" },
    Action: "kms:Decrypt",
    Resource: "*",
  });
  assert.throws(() => validatePrivateStagingTemplate(template), /KMS key policy/u);

  const arrayWildcard = clone(fixture("template.json"));
  arrayWildcard.Resources.StagingKey.Properties.KeyPolicy.Statement[0].Resource = ["*"];
  assert.throws(() => validatePrivateStagingTemplate(arrayWildcard), /KMS key policy/u);

  const extraStatement = clone(fixture("template.json"));
  extraStatement.Resources.StagingKey.Properties.KeyPolicy.Statement.push({
    Sid: "ExternalDecrypt",
    Effect: "Allow",
    Principal: { AWS: "arn:aws:iam::111122223333:root" },
    Action: "kms:Decrypt",
    Resource: "*",
  });
  assert.throws(() => validatePrivateStagingTemplate(extraStatement), /KMS key policy/u);

  const extraKey = clone(fixture("template.json"));
  extraKey.Resources.UnreviewedKey = clone(extraKey.Resources.StagingKey);
  assert.throws(() => validatePrivateStagingTemplate(extraKey), /unexpected KMS authority resource/u);
});

test("owner approval claims require exact immutable S3 and admin IAM bindings", () => {
  const unsupportedObjectLockKeys = clone(fixture("template.json"));
  const auditWrite = unsupportedObjectLockKeys.Resources.AdminExecutionRole.Properties.Policies[0].PolicyDocument.Statement
    .find((statement) => statement.Sid === "WriteImmutableApprovalAudit");
  auditWrite.Condition.StringEquals["s3:x-amz-object-lock-mode"] = auditWrite.Condition.StringEquals["s3:object-lock-mode"];
  delete auditWrite.Condition.StringEquals["s3:object-lock-mode"];
  auditWrite.Condition.Null["s3:x-amz-object-lock-retain-until-date"] = auditWrite.Condition.Null["s3:object-lock-retain-until-date"];
  delete auditWrite.Condition.Null["s3:object-lock-retain-until-date"];
  assert.throws(() => validatePrivateStagingTemplate(unsupportedObjectLockKeys), /supported S3 Object Lock/u);

  const combinedActions = clone(fixture("template.json"));
  combinedActions.Resources.AdminExecutionRole.Properties.Policies[0].PolicyDocument.Statement
    .find((statement) => statement.Sid === "WriteImmutableApprovalAudit").Action = ["s3:PutObject", "s3:PutObjectRetention"];
  assert.throws(() => validatePrivateStagingTemplate(combinedActions), /grant only s3:PutObject/u);

  const missingRetentionAllow = clone(fixture("template.json"));
  missingRetentionAllow.Resources.AdminExecutionRole.Properties.Policies[0].PolicyDocument.Statement =
    missingRetentionAllow.Resources.AdminExecutionRole.Properties.Policies[0].PolicyDocument.Statement
      .filter((statement) => statement.Sid !== "WriteImmutableApprovalAuditRetention");
  assert.throws(() => validatePrivateStagingTemplate(missingRetentionAllow), /separate exact-resource/u);

  const missingDeleteDeny = clone(fixture("template.json"));
  missingDeleteDeny.Resources.DmsBucketPolicy.Properties.PolicyDocument.Statement = missingDeleteDeny.Resources.DmsBucketPolicy.Properties.PolicyDocument.Statement.filter((statement) => statement.Sid !== "DenyApprovalAuditDeletion");
  assert.throws(() => validatePrivateStagingTemplate(missingDeleteDeny), /DMS bucket policy/u);

  const extraBucketPolicy = clone(fixture("template.json"));
  extraBucketPolicy.Resources.UnreviewedBucketPolicy = clone(extraBucketPolicy.Resources.DmsBucketPolicy);
  assert.throws(() => validatePrivateStagingTemplate(extraBucketPolicy), /unexpected S3 bucket policy/u);

  const missingAuditWrite = clone(fixture("template.json"));
  missingAuditWrite.Resources.AdminExecutionRole.Properties.Policies[0].PolicyDocument.Statement = missingAuditWrite.Resources.AdminExecutionRole.Properties.Policies[0].PolicyDocument.Statement.filter((statement) => statement.Sid !== "WriteImmutableApprovalAudit");
  assert.throws(() => validatePrivateStagingTemplate(missingAuditWrite), /AdminExecutionRole IAM policy/u);

  const unpinnedRegistry = clone(fixture("template.json"));
  delete unpinnedRegistry.Resources.AdminFunction.Properties.Environment.Variables.LAWOS_OWNER_TRUST_REGISTRY_SHA256;
  assert.throws(() => validatePrivateStagingTemplate(unpinnedRegistry), /trust registry/u);

  const endpointDrift = clone(fixture("template.json"));
  endpointDrift.Resources.S3GatewayEndpoint.Properties.PolicyDocument.Statement[0].Resource.pop();
  assert.throws(() => validatePrivateStagingTemplate(endpointDrift), /S3 gateway endpoint policy/u);
});

test("the RDS gate inventories every instance and rejects extras", () => {
  const extraPublic = clone(fixture("template.json"));
  extraPublic.Resources.ExtraDatabase = clone(extraPublic.Resources.Database);
  extraPublic.Resources.ExtraDatabase.Properties.DBInstanceIdentifier = "lawos-private-staging-extra";
  extraPublic.Resources.ExtraDatabase.Properties.PubliclyAccessible = true;
  assert.throws(() => validatePrivateStagingTemplate(extraPublic), /exactly one approved RDS/u);

  const extraPrivate = clone(fixture("template.json"));
  extraPrivate.Resources.ExtraDatabase = clone(extraPrivate.Resources.Database);
  extraPrivate.Resources.ExtraDatabase.Properties.DBInstanceIdentifier = "lawos-private-staging-extra";
  assert.throws(() => validatePrivateStagingTemplate(extraPrivate), /exactly one approved RDS/u);

  const unsafeLogStatementTemplate = clone(fixture("template.json"));
  unsafeLogStatementTemplate.Resources.DatabaseParameterGroup.Properties.Parameters.log_statement = "ddl";
  assert.throws(() => validatePrivateStagingTemplate(unsafeLogStatementTemplate), /must not record application role passwords/u);
});

test("secret-looking Lambda environment values are rejected", () => {
  const template = clone(fixture("template.json"));
  template.Resources.ApiFunction.Properties.Environment.Variables.LAWOS_DATABASE_URL = "postgresql://user:password@example/lawos";
  assert.throws(() => validatePrivateStagingTemplate(template), /secret material/u);
});

test("every taggable staging surface requires owner, review, and expiration tags", () => {
  const template = clone(fixture("template.json"));
  template.Resources.S3GatewayEndpoint.Properties.Tags = [];
  assert.throws(() => validatePrivateStagingTemplate(template), /S3GatewayEndpoint is missing the environment tag/u);
});

test("cost increases over the effective budget are rejected", () => {
  const cost = clone(fixture("cost-estimate.json"));
  cost.line_items[0].monthly_estimate_usd += 20;
  cost.subtotal_monthly_usd += 20;
  cost.total_monthly_estimate_usd += 20;
  cost.total_monthly_estimate_krw_at_planning_rate += 30000;
  assert.throws(() => validatePrivateStagingCost(cost), /effective USD budget/u);

  const unbounded = clone(fixture("cost-estimate.json"));
  unbounded.enforced_public_route_envelope.throttling_rate_per_second = 10;
  assert.throws(() => validatePrivateStagingCost(unbounded), /cost rate model/u);

  const noActionableRecipient = clone(fixture("template.json"));
  noActionableRecipient.Resources.MonthlyCostBudget.Properties.NotificationsWithSubscribers[0].Subscribers =
    noActionableRecipient.Resources.MonthlyCostBudget.Properties.NotificationsWithSubscribers[0].Subscribers
      .filter((subscriber) => subscriber.SubscriptionType !== "EMAIL");
  assert.throws(() => validatePrivateStagingTemplate(noActionableRecipient), /directly notify/u);
});
