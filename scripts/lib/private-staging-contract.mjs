import { createHash } from "node:crypto";

export const PRIVATE_STAGING_ACCOUNT_ID = "770880870480";
export const PRIVATE_STAGING_REGION = "ap-northeast-2";
export const PRIVATE_STAGING_VPC_CIDR = "10.96.0.0/16";
export const PRIVATE_STAGING_COST_LIMIT_KRW = 300_000;
export const PRIVATE_STAGING_EFFECTIVE_BUDGET_USD = 100;
export const LAMBDA_VPC_ENI_ACTIONS = Object.freeze([
  "ec2:CreateNetworkInterface",
  "ec2:DescribeNetworkInterfaces",
  "ec2:DescribeSubnets",
  "ec2:DeleteNetworkInterface",
  "ec2:AssignPrivateIpAddresses",
  "ec2:UnassignPrivateIpAddresses",
]);
const LAMBDA_FUNCTION_CODE_DENY_ACTIONS = Object.freeze([
  ...LAMBDA_VPC_ENI_ACTIONS,
  "ec2:DetachNetworkInterface",
]);

const PROTECTED_RESOURCE_MARKERS = Object.freeze([
  "amic-vault-staging",
  "matter-lawos-api-staging",
  "matter-lawos-api-prod-lambda-role",
  "matter-prod-deploy-admin",
  "matter-cutover-operator",
]);
const REQUIRED_TAG_KEYS = Object.freeze(["environment", "system", "owner", "review", "expiration"]);
const TAGGED_TYPES = new Set([
  "AWS::ApiGatewayV2::Api",
  "AWS::ApiGatewayV2::Stage",
  "AWS::CloudWatch::Alarm",
  "AWS::EC2::EIP",
  "AWS::EC2::InternetGateway",
  "AWS::EC2::NatGateway",
  "AWS::EC2::RouteTable",
  "AWS::EC2::SecurityGroup",
  "AWS::EC2::Subnet",
  "AWS::EC2::VPC",
  "AWS::EC2::VPCEndpoint",
  "AWS::IAM::Role",
  "AWS::KMS::Key",
  "AWS::Lambda::Function",
  "AWS::Logs::LogGroup",
  "AWS::RDS::DBInstance",
  "AWS::RDS::DBParameterGroup",
  "AWS::RDS::DBSubnetGroup",
  "AWS::S3::Bucket",
  "AWS::SecretsManager::Secret",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalSha256(value) {
  return sha256Hex(stableJson(value));
}

function tagMap(tags) {
  if (Array.isArray(tags)) return new Map(tags.map((tag) => [tag.Key, tag.Value]));
  if (tags && typeof tags === "object") return new Map(Object.entries(tags));
  return new Map();
}

function refName(value) {
  return value?.Ref ?? null;
}

function resourceStatements(resource) {
  if (resource.Type === "AWS::IAM::Role") {
    return (resource.Properties?.Policies ?? []).flatMap((policy) => policy.PolicyDocument?.Statement ?? []);
  }
  if (resource.Type === "AWS::IAM::Policy") return resource.Properties?.PolicyDocument?.Statement ?? [];
  return [];
}

function sortedStrings(values) {
  return [...values].map(String).sort();
}

function validateIam(resources) {
  const wildcardAllows = [];
  for (const [logicalId, resource] of Object.entries(resources)) {
    if (resource.Type === "AWS::IAM::Role") {
      assert(!(resource.Properties?.ManagedPolicyArns?.length), `${logicalId} must not use managed policies`);
      assert(!String(resource.Properties?.RoleName ?? "").includes("prod"), `${logicalId} must not use a production role name`);
    }
    for (const statement of resourceStatements(resource)) {
      const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
      assert(!actions.includes("iam:PassRole") && !actions.includes("sts:AssumeRole"), `${logicalId} must not grant cross-role authority`);
      if (statement.Effect === "Allow" && statement.Resource === "*") {
        wildcardAllows.push({ logical_id: logicalId, sid: statement.Sid, actions: sortedStrings(actions) });
      }
      if (statement.Sid === "DenyFunctionCodeEc2Networking") {
        assert(statement.Effect === "Deny" && statement.Resource === "*", `${logicalId} function-code EC2 deny is malformed`);
        assert(JSON.stringify(statement.Condition).includes("lambda:SourceFunctionArn"), `${logicalId} function-code EC2 deny must use SourceFunctionArn`);
        assert(JSON.stringify(sortedStrings(actions)) === JSON.stringify(sortedStrings(LAMBDA_FUNCTION_CODE_DENY_ACTIONS)), `${logicalId} function-code EC2 deny action set drifted`);
      }
    }
  }
  assert(wildcardAllows.length === 1, "the only IAM Allow with Resource * must be the temporary Lambda VPC ENI bootstrap policy");
  assert(wildcardAllows[0].logical_id === "LambdaVpcEniBootstrapPolicy", "unexpected IAM wildcard Allow resource");
  assert(wildcardAllows[0].sid === "LambdaVpcEniBootstrap", "temporary ENI bootstrap Sid drifted");
  assert(JSON.stringify(wildcardAllows[0].actions) === JSON.stringify(sortedStrings(LAMBDA_VPC_ENI_ACTIONS)), "temporary ENI bootstrap action set drifted");
  const bootstrap = resources.LambdaVpcEniBootstrapPolicy;
  assert(bootstrap?.Condition === "LambdaEniBootstrapEnabled", "temporary ENI policy must be conditional");
  return wildcardAllows;
}

function validateNetwork(resources, template) {
  assert(template.Mappings?.Network?.Cidrs?.Vpc === PRIVATE_STAGING_VPC_CIDR, "private staging VPC CIDR drifted");
  for (const name of ["PublicSubnetA", "AppSubnetA", "AppSubnetB", "DbSubnetA", "DbSubnetB"]) {
    assert(resources[name]?.Properties?.MapPublicIpOnLaunch === false, `${name} must disable public IP assignment`);
  }
  const dbRouteTables = new Set(["DbRouteTableA", "DbRouteTableB"]);
  const defaultRoutes = Object.entries(resources).filter(([, resource]) =>
    resource.Type === "AWS::EC2::Route"
    && (resource.Properties?.DestinationCidrBlock === "0.0.0.0/0" || resource.Properties?.DestinationIpv6CidrBlock === "::/0"));
  for (const [logicalId, route] of defaultRoutes) {
    assert(!dbRouteTables.has(refName(route.Properties?.RouteTableId)), `${logicalId} exposes a database route table`);
  }
  assert(defaultRoutes.length === 3, "only public and application route tables may have default routes");
  const ingress = resources.DatabaseIngressFromLambda?.Properties;
  assert(ingress?.FromPort === 5432 && ingress?.ToPort === 5432, "database ingress must be PostgreSQL only");
  assert(refName(ingress?.SourceSecurityGroupId) === null, "database ingress must use a security-group attribute, not CIDR or plain Ref");
  assert(JSON.stringify(ingress?.SourceSecurityGroupId).includes("LambdaSecurityGroup"), "database ingress must originate from the Lambda security group");
  assert(ingress?.CidrIp == null && ingress?.CidrIpv6 == null, "database ingress must not be CIDR-based");
}

function validateDatabase(resources) {
  const database = resources.Database?.Properties;
  assert(database?.PubliclyAccessible === false, "RDS must not be publicly accessible");
  assert(database?.StorageEncrypted === true, "RDS storage encryption is required");
  assert(database?.DeletionProtection === true, "RDS deletion protection is required");
  assert(database?.BackupRetentionPeriod >= 7, "RDS must retain at least seven days of PITR backups");
  assert(database?.MultiAZ === false, "this cost-bounded staging plan expects the approved Single-AZ exception");
  assert(database?.DBInstanceClass === "db.t4g.micro", "RDS class exceeds or differs from the approved cost model");
  assert(database?.AllocatedStorage === "20" && database?.StorageType === "gp3", "RDS storage differs from the approved cost model");
  assert(database?.ManageMasterUserPassword === true, "RDS master credential must be managed by Secrets Manager");
  assert((database?.EnableCloudwatchLogsExports ?? []).includes("postgresql"), "PostgreSQL audit log export is required");
  const parameters = resources.DatabaseParameterGroup?.Properties?.Parameters;
  assert(parameters?.["rds.force_ssl"] === "1", "RDS must force TLS");
  assert(parameters?.log_connections === "1" && parameters?.log_disconnections === "1", "RDS connection audit logging is required");
}

function validateLambdas(resources) {
  assert(!Object.values(resources).some((resource) => resource.Type === "AWS::Lambda::Url"), "Lambda Function URLs are forbidden");
  for (const [logicalId, expectedRole, expectedHandler] of [
    ["ApiFunction", "ApiExecutionRole", "apps/api/src/lambda.handler"],
    ["AdminFunction", "AdminExecutionRole", "apps/api/src/private-staging-admin-lambda.handler"],
  ]) {
    const fn = resources[logicalId]?.Properties;
    assert(fn?.Handler === expectedHandler, `${logicalId} handler drifted`);
    assert(JSON.stringify(fn?.Role).includes(expectedRole), `${logicalId} must use its dedicated role`);
    assert(JSON.stringify(fn?.VpcConfig?.SubnetIds) === JSON.stringify([{ Ref: "AppSubnetA" }, { Ref: "AppSubnetB" }]), `${logicalId} must attach to both private application subnets`);
    assert(JSON.stringify(fn?.VpcConfig?.SecurityGroupIds).includes("LambdaSecurityGroup"), `${logicalId} must use the dedicated Lambda security group`);
  }
  const env = resources.ApiFunction.Properties.Environment.Variables;
  assert(env.LAWOS_RUNTIME_PROFILE === "operational", "API must use the operational profile");
  assert(env.LAWOS_PERSISTENCE_AUTHORITY === "postgres-v2", "API must use postgres-v2 authority");
  assert(env.LAWOS_POSTGRES_SSL_MODE === "verify-full", "API must use TLS verify-full");
  assert(env.LAWOS_DMS_S3_DEFAULT_RETENTION_DAYS === "7", "committed staging DMS objects must receive seven-day provider retention");
  for (const [key, value] of Object.entries(env)) {
    if (/SECRET_ID$/u.test(key)) {
      assert(value && typeof value === "object", `${key} must be a resource reference`);
      continue;
    }
    if (/(PASSWORD|SECRET(?!_ID)|TOKEN|DATABASE_URL|POSTGRES_URL$)/u.test(key)) {
      throw new Error(`API environment must not contain secret material: ${key}`);
    }
  }
}

function validateDms(resources) {
  const bucket = resources.DmsBucket?.Properties;
  assert(bucket?.VersioningConfiguration?.Status === "Enabled", "DMS bucket versioning is required");
  assert(bucket?.ObjectLockEnabled === true, "DMS bucket Object Lock is required");
  assert(bucket?.ObjectLockConfiguration?.ObjectLockEnabled === "Enabled", "DMS Object Lock configuration is required");
  assert(bucket?.ObjectLockConfiguration?.Rule == null, "bucket-wide default retention would prevent staged-object cleanup; retention must begin after commit");
  assert(Object.values(bucket?.PublicAccessBlockConfiguration ?? {}).every((value) => value === true), "DMS public access must be fully blocked");
  assert(JSON.stringify(bucket?.BucketEncryption).includes("aws:kms"), "DMS SSE-KMS is required");
}

function validateKms(resources) {
  const statements = resources.StagingKey?.Properties?.KeyPolicy?.Statement ?? [];
  const wildcardAllows = statements.filter((statement) => statement.Effect === "Allow" && statement.Resource === "*");
  assert(wildcardAllows.length === 2, "KMS key policy may contain only the account-authority and exact log-encryption current-key wildcard Allows");
  const account = wildcardAllows.find((statement) => statement.Sid === "EnableAccountIamAuthority");
  assert(account?.Action === "kms:*", "KMS account IAM authority statement drifted");
  assert(JSON.stringify(account?.Principal).includes(":root"), "KMS account IAM authority must remain in this AWS account");
  const logs = wildcardAllows.find((statement) => statement.Sid === "AllowRegionalCloudWatchLogsEncryption");
  assert(JSON.stringify(logs?.Principal).includes("logs.${AWS::Region}.amazonaws.com"), "KMS log encryption principal drifted");
  assert(JSON.stringify(logs?.Condition).includes("/aws/lambda/lawos-private-staging-*"), "KMS log encryption context must remain LawOS private staging only");
  return wildcardAllows;
}

function validateTags(resources) {
  for (const [logicalId, resource] of Object.entries(resources)) {
    if (!TAGGED_TYPES.has(resource.Type)) continue;
    const tags = tagMap(resource.Properties?.Tags);
    for (const key of REQUIRED_TAG_KEYS) assert(tags.has(key), `${logicalId} is missing the ${key} tag`);
    assert(tags.get("environment") === "lawos-staging", `${logicalId} environment tag drifted`);
    assert(tags.get("system") === "lawos", `${logicalId} system tag drifted`);
  }
}

export function validatePrivateStagingTemplate(template) {
  assert(template && typeof template === "object" && !Array.isArray(template), "CloudFormation template is required");
  const bytes = JSON.stringify(template).toLowerCase();
  for (const marker of PROTECTED_RESOURCE_MARKERS) assert(!bytes.includes(marker), `protected resource marker appears in template: ${marker}`);
  const resources = template.Resources ?? {};
  assert(Object.keys(resources).length > 0, "CloudFormation resources are required");
  assert(template.Parameters?.EnableLambdaEniBootstrap?.Default === "false", "ENI bootstrap must default off");
  validateNetwork(resources, template);
  validateDatabase(resources);
  validateLambdas(resources);
  validateDms(resources);
  const kmsWildcardAllows = validateKms(resources);
  validateTags(resources);
  const wildcardAllows = validateIam(resources);
  return Object.freeze({
    verdict: "PASS_WITH_OWNER_DELTA_REQUIRED",
    resource_count: Object.keys(resources).length,
    protected_resource_marker_count: 0,
    public_rds_count: 0,
    database_default_route_count: 0,
    lambda_function_url_count: 0,
    iam_wildcard_allow_count: wildcardAllows.length,
    iam_wildcard_allow_sids: wildcardAllows.map((item) => item.sid),
    kms_current_key_wildcard_allow_count: kmsWildcardAllows.length,
    kms_current_key_wildcard_allow_sids: kmsWildcardAllows.map((item) => item.Sid),
    owner_delta_required: true,
    owner_delta_reasons: Object.freeze([
      "AWS Lambda VPC ENI bootstrap actions require Resource * until function ENIs are active",
      "AWS KMS key-policy Resource * denotes only the current staging KMS key but conflicts with the literal wildcard prohibition",
    ]),
    bootstrap_default_enabled: false,
  });
}

export function validateArtifactStoreTemplate(template) {
  const resources = template?.Resources ?? {};
  assert(Object.keys(resources).every((key) => ["ArtifactBucket", "ArtifactBucketPolicy"].includes(key)), "artifact stack contains an unexpected resource");
  const bucket = resources.ArtifactBucket?.Properties;
  assert(bucket?.VersioningConfiguration?.Status === "Enabled", "artifact bucket versioning is required");
  assert(Object.values(bucket?.PublicAccessBlockConfiguration ?? {}).every((value) => value === true), "artifact bucket public access must be blocked");
  assert(JSON.stringify(bucket?.BucketEncryption).includes("AES256"), "artifact bucket encryption is required");
  validateTags(resources);
  return Object.freeze({ verdict: "PASS", resource_count: Object.keys(resources).length });
}

export function validatePrivateStagingCost(cost) {
  assert(cost?.monthly_cost_limit_krw === PRIVATE_STAGING_COST_LIMIT_KRW, "owner KRW cost cap drifted");
  assert(cost?.effective_aws_budget_limit_usd === PRIVATE_STAGING_EFFECTIVE_BUDGET_USD, "effective AWS budget cap drifted");
  const sum = (cost?.line_items ?? []).reduce((total, item) => total + Number(item.monthly_estimate_usd), 0);
  assert(Math.abs(sum - Number(cost.subtotal_monthly_usd)) < 0.05, "cost subtotal does not match line items");
  assert(Number(cost.total_monthly_estimate_usd) === Number(cost.subtotal_monthly_usd) + Number(cost.contingency_monthly_usd), "cost total does not match subtotal and contingency");
  assert(cost.total_monthly_estimate_usd <= PRIVATE_STAGING_EFFECTIVE_BUDGET_USD, "estimated AWS monthly cost exceeds the effective USD budget");
  assert(cost.total_monthly_estimate_krw_at_planning_rate <= PRIVATE_STAGING_COST_LIMIT_KRW, "estimated monthly cost exceeds the owner KRW cap");
  assert(cost.creation_gate === "PASS", "cost creation gate is not PASS");
  return Object.freeze({
    verdict: "PASS",
    subtotal_monthly_usd: cost.subtotal_monthly_usd,
    contingency_monthly_usd: cost.contingency_monthly_usd,
    total_monthly_estimate_usd: cost.total_monthly_estimate_usd,
    total_monthly_estimate_krw: cost.total_monthly_estimate_krw_at_planning_rate,
    effective_budget_headroom_usd: PRIVATE_STAGING_EFFECTIVE_BUDGET_USD - cost.total_monthly_estimate_usd,
    owner_cap_headroom_krw: PRIVATE_STAGING_COST_LIMIT_KRW - cost.total_monthly_estimate_krw_at_planning_rate,
  });
}
