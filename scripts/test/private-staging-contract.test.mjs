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

test("private staging infrastructure contract is isolated and cost gated", () => {
  const result = validatePrivateStagingTemplate(fixture("template.json"));
  assert.equal(result.verdict, "PASS_WITH_OWNER_DELTA_REQUIRED");
  assert.equal(result.public_rds_count, 0);
  assert.equal(result.database_default_route_count, 0);
  assert.equal(result.lambda_function_url_count, 0);
  assert.deepEqual(result.iam_wildcard_allow_sids, ["LambdaVpcEniBootstrap"]);
  assert.deepEqual(result.kms_current_key_wildcard_allow_sids, ["EnableAccountIamAuthority", "AllowRegionalCloudWatchLogsEncryption"]);
  assert.equal(result.bootstrap_default_enabled, false);
});

test("artifact store contract permits only the isolated bucket and deny policy", () => {
  assert.equal(validateArtifactStoreTemplate(fixture("artifact-store-template.json")).verdict, "PASS");
});

test("cost estimate is below both the owner cap and stricter AWS budget", () => {
  const result = validatePrivateStagingCost(fixture("cost-estimate.json"));
  assert.equal(result.verdict, "PASS");
  assert.equal(result.total_monthly_estimate_usd, 90);
  assert.equal(result.total_monthly_estimate_krw, 135000);
});

test("public RDS and database default routes are rejected", () => {
  const publicRds = clone(fixture("template.json"));
  publicRds.Resources.Database.Properties.PubliclyAccessible = true;
  assert.throws(() => validatePrivateStagingTemplate(publicRds), /must not be publicly accessible/u);

  const dbRoute = clone(fixture("template.json"));
  dbRoute.Resources.BadDatabaseDefaultRoute = {
    Type: "AWS::EC2::Route",
    Properties: { DestinationCidrBlock: "0.0.0.0/0", RouteTableId: { Ref: "DbRouteTableA" }, GatewayId: { Ref: "InternetGateway" } },
  };
  assert.throws(() => validatePrivateStagingTemplate(dbRoute), /database route table/u);
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
  assert.throws(() => validatePrivateStagingTemplate(wildcard), /only IAM Allow with Resource/u);
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
  assert.throws(() => validatePrivateStagingTemplate(template), /KMS key policy may contain only/u);
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
});
