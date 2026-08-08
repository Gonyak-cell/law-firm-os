import { createHash } from "node:crypto";
import { LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT } from "../../packages/persistence/src/postgres/application-role.js";

export const PRIVATE_STAGING_ACCOUNT_ID = "770880870480";
export const PRIVATE_STAGING_REGION = "ap-northeast-2";
export const PRIVATE_STAGING_VPC_CIDR = "10.96.0.0/16";
export const PRIVATE_STAGING_S3_PREFIX_LIST_ID = "pl-78a54011";
export const PRIVATE_STAGING_COST_LIMIT_KRW = 300_000;
export const PRIVATE_STAGING_EFFECTIVE_BUDGET_USD = 100;
const PUBLIC_ROUTE_RATE_LIMIT = 0.04;
export const PRIVATE_STAGING_PUBLIC_ROUTE_BURST_LIMIT = 256;
export const PRIVATE_STAGING_CUT007_CONTROL_REQUEST_LIMIT = 96;
export const PRIVATE_STAGING_BROWSER_API_REQUEST_LIMIT = 128;
const PRIVATE_STAGING_CUT007_BURST_HEADROOM = 32;
const PUBLIC_ROUTE_LAMBDA_MEMORY_MIB = 1024;
const PUBLIC_ROUTE_LAMBDA_TIMEOUT_SECONDS = 5;
const PUBLIC_ROUTE_LAMBDA_RESERVED_CONCURRENCY = 32;
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
const ACTIVE_SYNTHETIC_PASSWORD_RECIPIENTS = Object.freeze([
  "jwsuh+lawos-staging-admin@amic.kr",
  "jwsuh+lawos-staging-attorney@amic.kr",
]);
const EXACT_LAMBDA_TRUST_SHA256 = "f3502e8666443cacc9bec965f5cc2886f9ed0e884c87714821fdc6872835efd0";
const EXACT_IAM_POLICY_SHA256 = Object.freeze({
  ApiExecutionRole: "1a7644d981858a88fe517a1121c29c4b0aeba093db7e6d9257841e8faa6e1b1c",
  AdminExecutionRole: "8873e2b36fd95105b336d6168a236a44ee53ad16d6e7ffc8d7ec148d2938ae6b",
});
const EXACT_ENI_BOOTSTRAP_INLINE_POLICY_SHA256 = "e3fb825de200108539c51b58b92f3f39713dbdaaf5bb1e6d9b908ddb09b0e815";
const EXACT_KMS_KEY_POLICY_SHA256 = "21a2577535bde578130fd7f1ae293a8300c1eb28d29bc949fcc75242b3aafc8b";
const EXACT_KMS_ALIAS_SHA256 = "a5c174930d14cbc3a40f51c04112fd55e4b27b4659f4aa17ca2e1d1e0117467d";
const EXACT_S3_ENDPOINT_POLICY_SHA256 = "fd69eaa070403f359a58fea72ba10b50f9ab2ee1cf4ba26fd666709814742801";
const EXACT_DMS_BUCKET_POLICY_SHA256 = "1be4582417ee8d76f4c09bbca1265830a66a95d0dfca305adc686504803556d3";
const EXACT_ARTIFACT_BUCKET_POLICY_SHA256 = "080473c4a6175765a0c5b8240584779ac6c772c50978299659e5f15fd2956023";
const EXACT_LAMBDA_PERMISSION_SHA256 = Object.freeze({
  HttpApiInvokePermission: "91b58aac2a5d78774ef523f7ef8116eb131522b7ba39a392ed4487a371d21360",
  PasswordResetWorkerInvokePermission: "2047607b7917b9429030004797f5617468e952b5b0ec5824232246935f27a2af",
  OutlookConversationWorkerInvokePermission: "14363d512329c21e79cc39f32f20fc5c67c1c757ed8dbd4f9c75c64b6a4ba29b",
});
const EXACT_SNS_TOPIC_POLICY_SHA256 = Object.freeze({
  CostAlertTopicPolicy: "792c5c428873525a9074b89b962facf01d8b040d023f803d01db7a09429817b8",
});

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
  "AWS::SNS::Topic",
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

function resourcePolicyEntries(resource) {
  if (resource.Type === "AWS::IAM::Role") {
    return (resource.Properties?.Policies ?? []).map((policy) => {
      const conditional = policy?.["Fn::If"];
      if (!Array.isArray(conditional)) return { policy, condition: null };
      return { policy: conditional[1], condition: conditional[0], disabled: conditional[2] };
    });
  }
  if (resource.Type === "AWS::IAM::Policy") return [{ policy: resource.Properties, condition: resource.Condition ?? null }];
  return [];
}

function resourceStatements(resource) {
  return resourcePolicyEntries(resource).flatMap(({ policy }) => policy?.PolicyDocument?.Statement ?? []);
}

function sortedStrings(values) {
  return [...values].map(String).sort();
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [value];
}

function validateIam(resources) {
  const iamResources = Object.entries(resources).filter(([, resource]) => String(resource.Type ?? "").startsWith("AWS::IAM::"));
  const expectedIamResources = ["AdminExecutionRole", "ApiExecutionRole"];
  assert(
    JSON.stringify(sortedStrings(iamResources.map(([logicalId]) => logicalId))) === JSON.stringify(expectedIamResources),
    "private staging contains an unexpected IAM policy-bearing resource",
  );
  for (const logicalId of ["ApiExecutionRole", "AdminExecutionRole"]) {
    const properties = resources[logicalId]?.Properties;
    assert(canonicalSha256(properties?.AssumeRolePolicyDocument) === EXACT_LAMBDA_TRUST_SHA256, `${logicalId} IAM trust policy contract drifted`);
    if (logicalId === "AdminExecutionRole") {
      const auditWrite = properties?.Policies?.[0]?.PolicyDocument?.Statement?.find(
        (statement) => statement.Sid === "WriteImmutableApprovalAudit",
      );
      assert(auditWrite, "AdminExecutionRole IAM policy must preserve the immutable approval-audit writer");
      assert(auditWrite.Action === "s3:PutObject", "approval-audit object write must grant only s3:PutObject");
      assert(
        JSON.stringify(sortedStrings(Object.keys(auditWrite?.Condition?.StringEquals ?? {}))) === JSON.stringify([
          "s3:object-lock-mode",
          "s3:x-amz-server-side-encryption",
          "s3:x-amz-server-side-encryption-aws-kms-key-id",
        ]),
        "approval-audit IAM Allow must use the supported S3 Object Lock mode condition key",
      );
      assert(
        JSON.stringify(auditWrite?.Condition?.Null) === JSON.stringify({ "s3:object-lock-retain-until-date": "false" }),
        "approval-audit IAM Allow must require the supported S3 Object Lock retain-until condition key",
      );
      const auditRetention = properties?.Policies?.[0]?.PolicyDocument?.Statement?.find(
        (statement) => statement.Sid === "WriteImmutableApprovalAuditRetention",
      );
      assert(
        auditRetention?.Action === "s3:PutObjectRetention"
          && JSON.stringify(auditRetention.Resource) === JSON.stringify(auditWrite.Resource),
        "approval-audit retention must use a separate exact-resource s3:PutObjectRetention Allow",
      );
      assert(
        JSON.stringify(auditRetention?.Condition) === JSON.stringify({
          StringEquals: { "s3:object-lock-mode": "COMPLIANCE" },
          Null: { "s3:object-lock-retain-until-date": "false" },
        }),
        "approval-audit retention Allow must use only supported action-specific Object Lock conditions",
      );
    }
    assert(canonicalSha256(properties?.Policies) === EXACT_IAM_POLICY_SHA256[logicalId], `${logicalId} IAM policy contract drifted`);
    const conditional = properties?.Policies?.[1]?.["Fn::If"];
    assert(Array.isArray(conditional) && conditional.length === 3, `${logicalId} temporary ENI policy must be a conditional inline policy`);
    assert(conditional[0] === "LambdaEniBootstrapEnabled", `${logicalId} temporary ENI policy must use LambdaEniBootstrapEnabled`);
    assert(canonicalSha256(conditional[1]) === EXACT_ENI_BOOTSTRAP_INLINE_POLICY_SHA256, `${logicalId} temporary ENI policy contract drifted`);
    assert(conditional[2]?.Ref === "AWS::NoValue", `${logicalId} temporary ENI policy disabled branch must remove the policy`);
  }
  assert(resources.LambdaVpcEniBootstrapPolicy == null, "temporary ENI policy must not be a conditionally absent external IAM resource");
  const wildcardAllows = [];
  for (const [logicalId, resource] of Object.entries(resources)) {
    if (resource.Type === "AWS::IAM::Role") {
      assert(!(resource.Properties?.ManagedPolicyArns?.length), `${logicalId} must not use managed policies`);
      assert(!String(resource.Properties?.RoleName ?? "").includes("prod"), `${logicalId} must not use a production role name`);
    }
    let functionCodeDenyCount = 0;
    for (const { policy, condition } of resourcePolicyEntries(resource)) {
      for (const statement of policy?.PolicyDocument?.Statement ?? []) {
        const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
        assert(!actions.includes("iam:PassRole") && !actions.includes("sts:AssumeRole"), `${logicalId} must not grant cross-role authority`);
        if (statement.Effect === "Allow" && arrayValue(statement.Resource).includes("*")) {
          wildcardAllows.push({
            logical_id: logicalId,
            sid: statement.Sid,
            actions: sortedStrings(actions),
            condition,
            statement_condition: statement.Condition ?? null,
          });
        }
        if (statement.Sid === "DenyFunctionCodeEc2Networking") {
          functionCodeDenyCount += 1;
          assert(statement.Effect === "Deny" && statement.Resource === "*", `${logicalId} function-code EC2 deny is malformed`);
          assert(JSON.stringify(statement.Condition).includes("lambda:SourceFunctionArn"), `${logicalId} function-code EC2 deny must use SourceFunctionArn`);
          assert(JSON.stringify(sortedStrings(actions)) === JSON.stringify(sortedStrings(LAMBDA_FUNCTION_CODE_DENY_ACTIONS)), `${logicalId} function-code EC2 deny action set drifted`);
        }
      }
    }
    if (resource.Type === "AWS::IAM::Role") assert(functionCodeDenyCount === 1, `${logicalId} must preserve exactly one function-code EC2 deny`);
  }
  assert(wildcardAllows.length === 2, "the only IAM Allows with Resource * must be the two conditional Lambda VPC ENI bootstrap policies");
  const eniWildcardAllows = wildcardAllows.filter((item) => item.sid === "LambdaVpcEniBootstrap");
  assert(JSON.stringify(sortedStrings(eniWildcardAllows.map((item) => item.logical_id))) === JSON.stringify(["AdminExecutionRole", "ApiExecutionRole"]), "unexpected IAM ENI wildcard Allow resource");
  assert(eniWildcardAllows.every((item) => item.condition === "LambdaEniBootstrapEnabled"), "temporary ENI bootstrap Allow must be true-only");
  assert(eniWildcardAllows.every((item) => JSON.stringify(item.actions) === JSON.stringify(sortedStrings(LAMBDA_VPC_ENI_ACTIONS))), "temporary ENI bootstrap action set drifted");
  return wildcardAllows;
}

function validateResourcePolicies(resources) {
  const lambdaPermissions = Object.entries(resources)
    .filter(([, resource]) => resource.Type === "AWS::Lambda::Permission");
  assert(
    JSON.stringify(sortedStrings(lambdaPermissions.map(([logicalId]) => logicalId)))
      === JSON.stringify(sortedStrings(Object.keys(EXACT_LAMBDA_PERMISSION_SHA256))),
    "private staging contains an unexpected Lambda resource policy",
  );
  for (const [logicalId, resource] of lambdaPermissions) {
    assert(
      canonicalSha256(resource.Properties) === EXACT_LAMBDA_PERMISSION_SHA256[logicalId],
      `${logicalId} Lambda resource policy contract drifted`,
    );
  }

  const topicPolicies = Object.entries(resources)
    .filter(([, resource]) => resource.Type === "AWS::SNS::TopicPolicy");
  assert(
    JSON.stringify(sortedStrings(topicPolicies.map(([logicalId]) => logicalId)))
      === JSON.stringify(sortedStrings(Object.keys(EXACT_SNS_TOPIC_POLICY_SHA256))),
    "private staging contains an unexpected SNS resource policy",
  );
  for (const [logicalId, resource] of topicPolicies) {
    assert(
      canonicalSha256(resource.Properties) === EXACT_SNS_TOPIC_POLICY_SHA256[logicalId],
      `${logicalId} SNS resource policy contract drifted`,
    );
  }
}

function validateNetwork(resources, template) {
  assert(template.Mappings?.Network?.Cidrs?.Vpc === PRIVATE_STAGING_VPC_CIDR, "private staging VPC CIDR drifted");
  assert(
    JSON.stringify(template.Mappings?.ServicePrefixLists) === JSON.stringify({
      [PRIVATE_STAGING_REGION]: { S3: PRIVATE_STAGING_S3_PREFIX_LIST_ID },
    }),
    "private staging S3 prefix-list mapping drifted",
  );
  assert(template.Mappings?.Network?.Cidrs?.PublicA == null, "private staging must not define a public subnet CIDR");
  for (const name of ["AppSubnetA", "AppSubnetB", "DbSubnetA", "DbSubnetB"]) {
    assert(resources[name]?.Properties?.MapPublicIpOnLaunch === false, `${name} must disable public IP assignment`);
  }
  const forbiddenTypes = new Set([
    "AWS::EC2::EIP",
    "AWS::EC2::InternetGateway",
    "AWS::EC2::NatGateway",
    "AWS::EC2::VPCGatewayAttachment",
  ]);
  for (const [logicalId, resource] of Object.entries(resources)) {
    assert(!forbiddenTypes.has(resource.Type), `${logicalId} introduces forbidden public or NAT networking`);
  }
  const defaultRoutes = Object.entries(resources).filter(([, resource]) =>
    resource.Type === "AWS::EC2::Route"
    && (resource.Properties?.DestinationCidrBlock === "0.0.0.0/0" || resource.Properties?.DestinationIpv6CidrBlock === "::/0"));
  assert(defaultRoutes.length === 0, "private staging must not contain an internet default route");
  const endpoints = Object.entries(resources).filter(([, resource]) => resource.Type === "AWS::EC2::VPCEndpoint");
  assert(endpoints.length === 3, "private staging must define exactly the S3, Secrets Manager, and SES endpoints");
  const s3 = resources.S3GatewayEndpoint?.Properties;
  assert(s3?.VpcEndpointType === "Gateway" && JSON.stringify(s3.ServiceName).includes(".s3"), "S3 gateway endpoint is required");
  assert(canonicalSha256(s3?.PolicyDocument) === EXACT_S3_ENDPOINT_POLICY_SHA256, "S3 gateway endpoint policy contract drifted");
  assert(JSON.stringify(s3.RouteTableIds) === JSON.stringify([{ Ref: "AppRouteTableA" }, { Ref: "AppRouteTableB" }]), "S3 gateway endpoint must attach only to application route tables");
  assert(JSON.stringify(s3.PolicyDocument).includes("${DmsBucket.Arn}/lawos-dms/*"), "S3 endpoint policy must remain confined to the staging DMS namespace");
  for (const [logicalId, serviceSuffix] of [["SecretsManagerEndpoint", ".secretsmanager"], ["SesApiEndpoint", ".email"]]) {
    const endpoint = resources[logicalId]?.Properties;
    assert(endpoint?.VpcEndpointType === "Interface", `${logicalId} must be an interface endpoint`);
    assert(endpoint?.PrivateDnsEnabled === true, `${logicalId} private DNS is required`);
    assert(JSON.stringify(endpoint?.ServiceName).includes(serviceSuffix), `${logicalId} service name drifted`);
    assert(JSON.stringify(endpoint?.SubnetIds) === JSON.stringify([{ Ref: "AppSubnetA" }, { Ref: "AppSubnetB" }]), `${logicalId} must span both private application subnets`);
    assert(JSON.stringify(endpoint?.SecurityGroupIds).includes("ServiceEndpointSecurityGroup"), `${logicalId} must use the service endpoint security group`);
  }
  const lambdaEgress = resources.LambdaSecurityGroup?.Properties?.SecurityGroupEgress;
  const endpointEgress = resources.ServiceEndpointSecurityGroup?.Properties?.SecurityGroupEgress;
  assert(Array.isArray(lambdaEgress) && lambdaEgress.length === 0, "Lambda security group must not have inline or public egress");
  assert(Array.isArray(endpointEgress) && endpointEgress.length === 0, "service endpoint security group must not have outbound rules");
  const serviceIngress = resources.ServiceEndpointIngressFromLambda?.Properties;
  assert(serviceIngress?.FromPort === 443 && serviceIngress?.ToPort === 443, "service endpoints must accept TLS only");
  assert(JSON.stringify(serviceIngress?.SourceSecurityGroupId).includes("LambdaSecurityGroup"), "service endpoint ingress must originate from the Lambda security group");
  const serviceEgress = resources.LambdaEgressToServiceEndpoints?.Properties;
  assert(serviceEgress?.FromPort === 443 && serviceEgress?.ToPort === 443, "Lambda service endpoint egress must be TLS only");
  assert(JSON.stringify(serviceEgress?.DestinationSecurityGroupId).includes("ServiceEndpointSecurityGroup"), "Lambda TLS egress must target the service endpoint security group");
  const s3EgressResource = resources.LambdaEgressToS3Gateway;
  const s3Egress = s3EgressResource?.Properties;
  assert(s3EgressResource?.Type === "AWS::EC2::SecurityGroupEgress", "Lambda S3 gateway egress rule is required");
  assert(s3Egress?.FromPort === 443 && s3Egress?.ToPort === 443 && s3Egress?.IpProtocol === "tcp", "Lambda S3 gateway egress must be TLS only");
  assert(
    JSON.stringify(s3Egress?.GroupId) === JSON.stringify({ "Fn::GetAtt": ["LambdaSecurityGroup", "GroupId"] }),
    "Lambda S3 gateway egress must originate from the Lambda security group",
  );
  assert(
    JSON.stringify(s3Egress?.DestinationPrefixListId) === JSON.stringify({
      "Fn::FindInMap": ["ServicePrefixLists", { Ref: "AWS::Region" }, "S3"],
    }),
    "Lambda S3 gateway egress must target the approved regional S3 prefix list",
  );
  assert(
    s3Egress?.CidrIp == null && s3Egress?.CidrIpv6 == null && s3Egress?.DestinationSecurityGroupId == null,
    "Lambda S3 gateway egress must not use CIDR or security-group destinations",
  );
  const ingress = resources.DatabaseIngressFromLambda?.Properties;
  assert(ingress?.FromPort === 5432 && ingress?.ToPort === 5432, "database ingress must be PostgreSQL only");
  assert(refName(ingress?.SourceSecurityGroupId) === null, "database ingress must use a security-group attribute, not CIDR or plain Ref");
  assert(JSON.stringify(ingress?.SourceSecurityGroupId).includes("LambdaSecurityGroup"), "database ingress must originate from the Lambda security group");
  assert(ingress?.CidrIp == null && ingress?.CidrIpv6 == null, "database ingress must not be CIDR-based");
}

function validateDatabase(resources) {
  const inventory = Object.entries(resources).filter(([, resource]) => resource.Type === "AWS::RDS::DBInstance");
  assert(inventory.length === 1 && inventory[0][0] === "Database", "private staging must contain exactly one approved RDS instance");
  for (const [logicalId, resource] of inventory) {
    const database = resource.Properties;
    assert(database?.PubliclyAccessible === false, `${logicalId} RDS must not be publicly accessible`);
    assert(database?.StorageEncrypted === true, `${logicalId} RDS storage encryption is required`);
    assert(database?.DeletionProtection === true, `${logicalId} RDS deletion protection is required`);
    assert(database?.BackupRetentionPeriod >= 7, `${logicalId} RDS must retain at least seven days of PITR backups`);
    assert(database?.MultiAZ === false, `${logicalId} cost-bounded staging plan expects the approved Single-AZ exception`);
    assert(database?.DBInstanceClass === "db.t4g.micro", `${logicalId} RDS class exceeds or differs from the approved cost model`);
    assert(database?.AllocatedStorage === "20" && database?.StorageType === "gp3", `${logicalId} RDS storage differs from the approved cost model`);
    assert(database?.ManageMasterUserPassword === true, `${logicalId} RDS master credential must be managed by Secrets Manager`);
    assert((database?.EnableCloudwatchLogsExports ?? []).includes("postgresql"), `${logicalId} PostgreSQL audit log export is required`);
  }
  const parameters = resources.DatabaseParameterGroup?.Properties?.Parameters;
  assert(parameters?.["rds.force_ssl"] === "1", "RDS must force TLS");
  assert(parameters?.log_connections === "1" && parameters?.log_disconnections === "1", "RDS connection audit logging is required");
  assert(
    parameters?.log_statement === "none"
      && parameters?.log_min_duration_statement === "-1"
      && parameters?.log_min_error_statement === "panic"
      && parameters?.log_parameter_max_length_on_error === "0",
    "RDS query logging must not record application role passwords or error parameters",
  );
  return Object.freeze({
    private_rds_count: inventory.filter(([, resource]) => resource.Properties?.PubliclyAccessible === false).length,
    public_rds_count: inventory.filter(([, resource]) => resource.Properties?.PubliclyAccessible === true).length,
  });
}

function validateLambdas(resources) {
  assert(!Object.values(resources).some((resource) => resource.Type === "AWS::Lambda::Url"), "Lambda Function URLs are forbidden");
  for (const [logicalId, expectedRole, expectedHandler, expectedLogGroup] of [
    ["ApiFunction", "ApiExecutionRole", "apps/api/src/lambda.handler", "ApiLogGroup"],
    ["AdminFunction", "AdminExecutionRole", "apps/api/src/private-staging-admin-lambda.handler", "AdminLogGroup"],
  ]) {
    const fn = resources[logicalId]?.Properties;
    assert(fn?.Handler === expectedHandler, `${logicalId} handler drifted`);
    assert(fn?.Code?.S3ObjectVersion?.Ref === "ArtifactVersion", `${logicalId} must use the immutable artifact version`);
    assert(JSON.stringify(fn?.Role).includes(expectedRole), `${logicalId} must use its dedicated role`);
    assert(JSON.stringify(resources[logicalId]?.DependsOn) === JSON.stringify([expectedLogGroup]), `${logicalId} must rely on its embedded role policy without an unresolved external dependency`);
    assert(JSON.stringify(fn?.VpcConfig?.SubnetIds) === JSON.stringify([{ Ref: "AppSubnetA" }, { Ref: "AppSubnetB" }]), `${logicalId} must attach to both private application subnets`);
    assert(JSON.stringify(fn?.VpcConfig?.SecurityGroupIds).includes("LambdaSecurityGroup"), `${logicalId} must use the dedicated Lambda security group`);
  }
  const api = resources.ApiFunction?.Properties;
  assert(api?.MemorySize === PUBLIC_ROUTE_LAMBDA_MEMORY_MIB, "API Lambda memory differs from the cost-bound exception");
  assert(api?.Timeout === PUBLIC_ROUTE_LAMBDA_TIMEOUT_SECONDS, "API Lambda timeout differs from the cost-bound exception");
  assert(api?.ReservedConcurrentExecutions === PUBLIC_ROUTE_LAMBDA_RESERVED_CONCURRENCY, "API Lambda concurrency differs from the cost-bound exception");
  assert(
    LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT === PUBLIC_ROUTE_LAMBDA_RESERVED_CONCURRENCY * 2,
    "PostgreSQL role connection capacity must preserve one full Lambda deployment-overlap margin",
  );
  assert(resources.AdminFunction?.Properties?.ReservedConcurrentExecutions === 1, "Admin Lambda concurrency must remain one");
  const env = resources.ApiFunction.Properties.Environment.Variables;
  assert(env.LAWOS_RUNTIME_PROFILE === "operational", "API must use the operational profile");
  assert(env.LAWOS_PERSISTENCE_AUTHORITY === "postgres-v2", "API must use postgres-v2 authority");
  assert(env.LAWOS_STAFF_AUTHORITY === "internal-password", "API must use internal-password staff authority");
  assert(env.LAWOS_HRX_STEP_UP_ROOT_SECRET_ID?.Ref === "HrxStepUpRootSecret", "API HRX step-up root must use the exact secret reference");
  assert(env.LAWOS_RUNTIME_GENERATION?.Ref === "RuntimeGeneration", "API runtime generation must be an exact stack parameter reference");
  assert(env.LAWOS_POSTGRES_SSL_MODE === "verify-full", "API must use TLS verify-full");
  assert(env.LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY === "sesv2", "API must deliver password setup through SES v2");
  assert(env.LAWOS_AUTH_PASSWORD_RESET_EMAIL_REGION?.Ref === "AWS::Region", "password reset SES region must follow the stack region");
  assert(env.LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM?.Ref === "PasswordResetFromEmail", "password reset sender must come from a parameter reference");
  assert(env.LAWOS_AUTH_PASSWORD_RESET_BASE_URL?.["Fn::Sub"] === "${HttpApi.ApiEndpoint}/api/auth/password-reset/confirm", "password reset confirmation URL must use the exact staging API endpoint");
  assert(env.LAWOS_AUTH_PASSWORD_RESET_OPEN_BASE_URL?.["Fn::Sub"] === "${HttpApi.ApiEndpoint}/api/auth/password-reset/open", "password reset open URL must use the exact staging API endpoint");
  assert(env.LAWOS_DMS_S3_DEFAULT_RETENTION_DAYS === "7", "committed staging DMS objects must receive seven-day provider retention");
  for (const key of Object.keys(env)) {
    assert(!/ENTRA|OIDC/u.test(key), `${key} is forbidden in internal-password staging`);
    assert(!/(JSON|STORE_PATH|FILE_CURRENT|DUAL_WRITE)/u.test(key), `${key} would re-enable a legacy persistence path`);
  }
  for (const [key, value] of Object.entries(env)) {
    if (/SECRET_ID$/u.test(key)) {
      assert(value && typeof value === "object", `${key} must be a resource reference`);
      continue;
    }
    if (/(PASSWORD(?!_RESET)|SECRET(?!_ID)|TOKEN|DATABASE_URL|POSTGRES_URL$)/u.test(key)) {
      throw new Error(`API environment must not contain secret material: ${key}`);
    }
  }
  const adminEnv = resources.AdminFunction.Properties.Environment.Variables;
  assert(adminEnv.LAWOS_RUNTIME_PROFILE === "operational", "admin Lambda must use the operational profile");
  assert(adminEnv.LAWOS_PERSISTENCE_AUTHORITY === "postgres-v2", "admin Lambda must use postgres-v2 authority");
  assert(adminEnv.LAWOS_STAFF_AUTHORITY === "internal-password", "admin Lambda must use internal-password staff authority");
  assert(adminEnv.LAWOS_RUNTIME_GENERATION?.Ref === "RuntimeGeneration", "admin runtime generation must be an exact stack parameter reference");
  assert(adminEnv.LAWOS_DATA_SCOPE === "synthetic-only", "admin Lambda must remain synthetic-only");
  assert(adminEnv.LAWOS_OWNER_TRUST_REGISTRY_SHA256?.Ref === "OwnerTrustRegistrySha256", "admin Lambda must pin the exact owner trust registry digest");
  assert(adminEnv.LAWOS_APPROVAL_AUDIT_BUCKET?.Ref === "DmsBucket", "admin Lambda approval claims must use the exact staging audit bucket");
  assert(JSON.stringify(adminEnv.LAWOS_STAGING_KMS_KEY_ARN).includes("StagingKey"), "admin Lambda approval claims must use the exact staging KMS key");
  for (const [key, parameter] of [
    ["LAWOS_BOOTSTRAP_APPROVAL_ID", "BootstrapApprovalId"],
    ["LAWOS_CUT005_APPROVAL_ID", "Cut005ApprovalId"],
    ["LAWOS_CUT006_APPROVAL_ID", "Cut006ApprovalId"],
    ["LAWOS_CUT007_APPROVAL_ID", "Cut007ApprovalId"],
  ]) assert(adminEnv[key]?.Ref === parameter, `${key} must be an exact deployment parameter reference`);
  for (const key of Object.keys(adminEnv)) {
    assert(!/ENTRA|OIDC/u.test(key), `${key} is forbidden in internal-password staging`);
    assert(!/(JSON|STORE_PATH|FILE_CURRENT|DUAL_WRITE)/u.test(key), `${key} would re-enable a legacy persistence path`);
  }
}

function validateSecretsAndInternalAuth(resources, template) {
  const serialized = JSON.stringify(template);
  assert(!/entra/iu.test(serialized), "private staging template must not contain an Entra dependency");
  const explicitSecrets = Object.entries(resources).filter(([, resource]) => resource.Type === "AWS::SecretsManager::Secret");
  assert(explicitSecrets.length === 7, "private staging must keep exactly seven explicit staging secrets after Entra removal");
  assert(resources.EntraConfigSecret == null, "Entra configuration secret is forbidden");
  const expectedSecrets = [
    "ApplicationDatabaseSecret",
    "TenantContextSecret",
    "SessionSecret",
    "HrxStepUpRootSecret",
    "PayrollArtifactSecret",
    "ProviderCredentialReferenceSecret",
    "SyntheticManifestSecret",
  ];
  assert(JSON.stringify(sortedStrings(explicitSecrets.map(([name]) => name))) === JSON.stringify(sortedStrings(expectedSecrets)), "staging secret inventory drifted");
  const runtimeSecretRefs = resourceStatements(resources.ApiExecutionRole)
    .find((statement) => statement.Sid === "ReadExactRuntimeSecrets")?.Resource ?? [];
  assert(runtimeSecretRefs.some((resource) => resource?.Ref === "HrxStepUpRootSecret"), "API role must read the exact HRX step-up root secret");
  assert(template.Parameters?.PasswordResetFromEmail?.NoEcho === true, "password reset sender parameter must be hidden from stack output");
  assert(String(template.Parameters?.PasswordResetSesIdentityArn?.AllowedPattern ?? "").includes("ses:ap-northeast-2"), "SES identity parameter must remain region-bound");
  const apiStatements = resourceStatements(resources.ApiExecutionRole);
  const send = apiStatements.find((statement) => statement.Sid === "SendSyntheticPasswordSetupEmail");
  const exactSesConditions = {
    "ForAllValues:StringLike": { "ses:Recipients": ACTIVE_SYNTHETIC_PASSWORD_RECIPIENTS },
    Null: { "ses:Recipients": "false" },
  };
  assert(send?.Effect === "Allow", "API role SES statement is required");
  assert(JSON.stringify(sortedStrings(Array.isArray(send?.Action) ? send.Action : [send?.Action])) === JSON.stringify(["ses:SendEmail"]), "API role SES action must be only ses:SendEmail");
  assert(JSON.stringify(send?.Resource) === JSON.stringify({ Ref: "PasswordResetSesIdentityArn" }), "API role SES authority must bind the exact verified sender identity ARN");
  assert(JSON.stringify(send?.Condition) === JSON.stringify(exactSesConditions), "API role SES authority must restrict every active synthetic recipient");
  assert(JSON.stringify(resources.ApiFunction?.Properties?.Environment?.Variables?.LAWOS_AUTH_PASSWORD_RESET_EMAIL_IDENTITY_ARN) === JSON.stringify({ Ref: "PasswordResetSesIdentityArn" }), "API deployment must retain the configured verified SES identity inventory");
  const sesEndpointPolicy = resources.SesApiEndpoint?.Properties?.PolicyDocument;
  assert(JSON.stringify(sesEndpointPolicy) === JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Sid: "SyntheticPasswordSetupOnly",
      Effect: "Allow",
      Principal: "*",
      Action: "ses:SendEmail",
      Resource: "*",
    }],
  }), "SES endpoint policy must be the exact condition-free ses:SendEmail and Resource * exception");
  const syntheticManifest = JSON.parse(resources.SyntheticManifestSecret?.Properties?.SecretString ?? "null");
  assert(syntheticManifest?.schema_version === "law-firm-os.synthetic-staging-manifest.v2", "synthetic manifest must use purpose-bound schema v2");
  assert((syntheticManifest?.tenant_ids ?? []).length === 6, "synthetic manifest must isolate CUT-005, CUT-006, and CUT-007 across six tenants");
  const purposeTenantIds = ["cut005", "cut006", "cut007"].flatMap((purpose) => syntheticManifest?.purpose_tenants?.[purpose] ?? []);
  assert(purposeTenantIds.length === 6 && new Set(purposeTenantIds).size === 6, "synthetic purpose tenants must be distinct");
}

function validateCostControls(resources) {
  const route = resources.HttpApiDefaultRoute;
  const stage = resources.HttpApiStage?.Properties?.DefaultRouteSettings;
  assert(route?.Properties?.AuthorizationType === "NONE" && route?.Properties?.RouteKey === "$default", "public staging route shape drifted");
  const exception = route?.Metadata?.LawOSPublicRouteException;
  assert(exception?.scope === "synthetic-only-private-staging" && exception?.enforcement === "template-bound-rate-timeout-concurrency-and-monthly-worst-case-cost", "public route lacks the exact cost-bound exception");
  assert(stage?.ThrottlingRateLimit === PUBLIC_ROUTE_RATE_LIMIT && stage?.ThrottlingBurstLimit === PRIVATE_STAGING_PUBLIC_ROUTE_BURST_LIMIT, "public route throttle exceeds or differs from the cost-bound exception");
  assert(
    PRIVATE_STAGING_CUT007_CONTROL_REQUEST_LIMIT
      + PRIVATE_STAGING_BROWSER_API_REQUEST_LIMIT
      + PRIVATE_STAGING_CUT007_BURST_HEADROOM
      <= PRIVATE_STAGING_PUBLIC_ROUTE_BURST_LIMIT,
    "CUT-007 request budgets exceed the approved public-route burst envelope",
  );
  const budget = resources.MonthlyCostBudget?.Properties?.Budget;
  assert(budget?.BudgetLimit?.Amount === 100 && budget?.BudgetLimit?.Unit === "USD", "private staging monthly AWS budget must remain USD 100");
  assert(budget?.BudgetType === "COST" && budget?.TimeUnit === "MONTHLY", "private staging cost budget cadence drifted");
  assert(JSON.stringify(budget?.CostFilters).includes("user:environment$lawos-staging"), "private staging budget must be scoped to the staging environment tag");
  const notifications = resources.MonthlyCostBudget?.Properties?.NotificationsWithSubscribers ?? [];
  assert(notifications.some(({ Notification: item }) => item?.NotificationType === "ACTUAL" && item?.Threshold === 80), "80 percent actual cost alert is required");
  assert(notifications.some(({ Notification: item }) => item?.NotificationType === "FORECASTED" && item?.Threshold === 100), "100 percent forecasted cost alert is required");
  for (const notification of notifications) {
    const emailSubscribers = (notification.Subscribers ?? []).filter((subscriber) => subscriber?.SubscriptionType === "EMAIL");
    assert(
      emailSubscribers.length === 1 && emailSubscribers[0]?.Address?.Ref === "PasswordResetFromEmail",
      "every cost alert must directly notify the exact synthetic staging mailbox",
    );
  }
  assert(resources.CostAlertTopic?.Type === "AWS::SNS::Topic", "private staging cost alert topic is required");
  assert(resources.PasswordResetWorkerSchedule?.Properties?.ScheduleExpression === "rate(5 minutes)", "password-reset worker cadence exceeds the cost-bound schedule");
  assert(resources.PasswordResetWorkerSchedule?.Properties?.State === "ENABLED", "password-reset worker schedule must remain enabled");
  const passwordResetTargets = resources.PasswordResetWorkerSchedule?.Properties?.Targets ?? [];
  const passwordResetInput = JSON.parse(passwordResetTargets[0]?.Input ?? "null");
  assert(passwordResetTargets.length === 1
    && passwordResetInput?.maintenance_action === "lawos_password_reset_worker"
    && Object.keys(passwordResetInput).length === 1,
  "password-reset worker event must use the Lambda maintenance-action envelope");
  const outlookWorker = resources.OutlookConversationWorkerSchedule?.Properties;
  const outlookTargets = outlookWorker?.Targets ?? [];
  const outlookInput = JSON.parse(outlookTargets[0]?.Input ?? "null");
  assert(outlookWorker?.ScheduleExpression === "rate(1 minute)",
    "Outlook conversation worker cadence must remain bounded");
  assert(JSON.stringify(outlookWorker?.State)
    === JSON.stringify({
      "Fn::If": ["OutlookConversationWorkerEnabled", "ENABLED", "DISABLED"],
    }), "Outlook conversation worker must remain disabled-safe");
  assert(outlookTargets.length === 1
    && outlookInput?.maintenance_action
      === "lawos_outlook_conversation_worker"
    && Object.keys(outlookInput).length === 1,
  "Outlook conversation worker event must use the exact maintenance-action envelope");
  assert(outlookTargets[0]?.RetryPolicy?.MaximumEventAgeInSeconds === 300
    && outlookTargets[0]?.RetryPolicy?.MaximumRetryAttempts === 2,
  "Outlook conversation worker retry policy drifted");
}

function validateDms(resources) {
  const bucketPolicies = Object.entries(resources).filter(([, resource]) => resource.Type === "AWS::S3::BucketPolicy");
  assert(bucketPolicies.length === 1 && bucketPolicies[0][0] === "DmsBucketPolicy", "private staging contains an unexpected S3 bucket policy");
  const bucket = resources.DmsBucket?.Properties;
  assert(bucket?.VersioningConfiguration?.Status === "Enabled", "DMS bucket versioning is required");
  assert(bucket?.ObjectLockEnabled === true, "DMS bucket Object Lock is required");
  assert(bucket?.ObjectLockConfiguration?.ObjectLockEnabled === "Enabled", "DMS Object Lock configuration is required");
  assert(bucket?.ObjectLockConfiguration?.Rule == null, "bucket-wide default retention would prevent staged-object cleanup; retention must begin after commit");
  assert(Object.values(bucket?.PublicAccessBlockConfiguration ?? {}).every((value) => value === true), "DMS public access must be fully blocked");
  assert(JSON.stringify(bucket?.BucketEncryption).includes("aws:kms"), "DMS SSE-KMS is required");
  const policy = resources.DmsBucketPolicy?.Properties?.PolicyDocument;
  assert(canonicalSha256(policy) === EXACT_DMS_BUCKET_POLICY_SHA256, "DMS bucket policy contract drifted");
  const auditDeleteDeny = (policy?.Statement ?? []).find((statement) => statement.Sid === "DenyApprovalAuditDeletion");
  assert(auditDeleteDeny?.Effect === "Deny" && JSON.stringify(auditDeleteDeny?.Resource).includes("approval-audit/*"), "immutable approval-audit deletion deny is required");
}

function validateKms(resources) {
  const kmsResources = Object.entries(resources).filter(([, resource]) => String(resource.Type ?? "").startsWith("AWS::KMS::"));
  assert(
    JSON.stringify(sortedStrings(kmsResources.map(([logicalId]) => logicalId))) === JSON.stringify(["StagingKey", "StagingKeyAlias"]),
    "private staging contains an unexpected KMS authority resource",
  );
  assert(resources.StagingKey?.Type === "AWS::KMS::Key", "staging KMS key type drifted");
  assert(resources.StagingKeyAlias?.Type === "AWS::KMS::Alias" && canonicalSha256(resources.StagingKeyAlias.Properties) === EXACT_KMS_ALIAS_SHA256, "staging KMS alias contract drifted");
  const statements = resources.StagingKey?.Properties?.KeyPolicy?.Statement ?? [];
  assert(canonicalSha256(resources.StagingKey?.Properties?.KeyPolicy) === EXACT_KMS_KEY_POLICY_SHA256, "KMS key policy contract drifted");
  const wildcardAllows = statements.filter((statement) => statement.Effect === "Allow" && arrayValue(statement.Resource).includes("*"));
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
  const inlineTemplateByteSize = Buffer.byteLength(JSON.stringify(template));
  assert(inlineTemplateByteSize <= 51_200, "minified CloudFormation template exceeds the inline API limit");
  const bytes = JSON.stringify(template).toLowerCase();
  for (const marker of PROTECTED_RESOURCE_MARKERS) assert(!bytes.includes(marker), `protected resource marker appears in template: ${marker}`);
  const resources = template.Resources ?? {};
  assert(Object.keys(resources).length > 0, "CloudFormation resources are required");
  assert(template.Parameters?.EnableLambdaEniBootstrap?.Default === "false", "ENI bootstrap must default off");
  assert(template.Parameters?.EnableOutlookConversationWorker?.Default === "false",
    "Outlook conversation worker must default off");
  assert(JSON.stringify(template.Conditions?.OutlookConversationWorkerEnabled)
    === JSON.stringify({
      "Fn::Equals": [{ Ref: "EnableOutlookConversationWorker" }, "true"],
    }), "Outlook conversation worker condition drifted");
  assert(template.Parameters?.ArtifactVersion?.Default == null, "immutable artifact version must be supplied explicitly");
  assert(template.Parameters?.OwnerTrustRegistrySha256?.Default == null, "owner trust registry digest must be supplied explicitly");
  for (const parameter of ["BootstrapApprovalId", "Cut005ApprovalId", "Cut006ApprovalId", "Cut007ApprovalId"]) {
    assert(template.Parameters?.[parameter]?.Default == null, `${parameter} must be explicitly supplied for the exact deployment target`);
  }
  validateNetwork(resources, template);
  const rdsInventory = validateDatabase(resources);
  validateLambdas(resources);
  validateSecretsAndInternalAuth(resources, template);
  validateDms(resources);
  validateCostControls(resources);
  const kmsWildcardAllows = validateKms(resources);
  const wildcardAllows = validateIam(resources);
  validateResourcePolicies(resources);
  validateTags(resources);
  return Object.freeze({
    verdict: "PASS_WITH_OWNER_DELTA_REQUIRED",
    resource_count: Object.keys(resources).length,
    inline_template_byte_size: inlineTemplateByteSize,
    protected_resource_marker_count: 0,
    private_rds_count: rdsInventory.private_rds_count,
    public_rds_count: rdsInventory.public_rds_count,
    database_default_route_count: 0,
    internet_gateway_count: 0,
    nat_gateway_count: 0,
    public_subnet_count: 0,
    interface_endpoint_count: 2,
    lambda_function_url_count: 0,
    iam_wildcard_allow_count: wildcardAllows.length,
    iam_wildcard_allow_sids: wildcardAllows.map((item) => item.sid),
    kms_current_key_wildcard_allow_count: kmsWildcardAllows.length,
    kms_current_key_wildcard_allow_sids: kmsWildcardAllows.map((item) => item.Sid),
    owner_delta_required: true,
    owner_delta_reasons: Object.freeze([
      "AWS Lambda VPC ENI bootstrap actions require Resource * until function ENIs are active",
      "AWS KMS key-policy Resource * denotes only the current staging KMS key but conflicts with the literal wildcard prohibition",
      "AWS SES VPC endpoint policy requires the approved condition-free Resource * exception; private endpoint DNS, subnets, and security groups confine transport while the API role binds the exact sender identity ARN and recipients",
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
  const policy = resources.ArtifactBucketPolicy?.Properties;
  assert(canonicalSha256(policy) === EXACT_ARTIFACT_BUCKET_POLICY_SHA256, "artifact bucket policy contract drifted");
  assert(policy?.Bucket?.Ref === "ArtifactBucket", "artifact bucket policy must bind the exact artifact bucket");
  const statements = policy?.PolicyDocument?.Statement ?? [];
  assert(statements.length === 1 && statements[0]?.Sid === "DenyInsecureTransport" && statements[0]?.Effect === "Deny", "artifact bucket policy must contain only the TLS deny");
  assert(statements[0]?.Condition?.Bool?.["aws:SecureTransport"] === "false", "artifact bucket policy TLS condition drifted");
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
  assert(!(cost.line_items ?? []).some((item) => /NAT Gateway|Public IPv4/iu.test(String(item.service))), "cost model must not contain removed public networking");
  assert((cost.line_items ?? []).some((item) => item.service === "AWS PrivateLink interface endpoints" && Number(item.quantity) === 2920), "cost model must include two interface endpoints across two availability zones");
  const envelope = cost.enforced_public_route_envelope;
  assert(envelope?.authorization === "explicit-synthetic-staging-cost-bound-exception", "public route cost exception is missing");
  assert(envelope.hours_per_month === 730 && envelope.throttling_rate_per_second === PUBLIC_ROUTE_RATE_LIMIT && envelope.throttling_burst_limit === PRIVATE_STAGING_PUBLIC_ROUTE_BURST_LIMIT, "public route cost rate model drifted");
  assert(envelope.lambda_memory_gib === PUBLIC_ROUTE_LAMBDA_MEMORY_MIB / 1024 && envelope.lambda_timeout_seconds === PUBLIC_ROUTE_LAMBDA_TIMEOUT_SECONDS && envelope.lambda_reserved_concurrency === PUBLIC_ROUTE_LAMBDA_RESERVED_CONCURRENCY, "public route Lambda cost model drifted");
  const monthlyRequests = envelope.hours_per_month * 3600 * envelope.throttling_rate_per_second
    + envelope.throttling_burst_limit;
  const monthlyGbSeconds = monthlyRequests * envelope.lambda_timeout_seconds * envelope.lambda_memory_gib;
  assert(Math.abs(monthlyRequests - envelope.monthly_request_ceiling) < 0.001, "public route monthly request ceiling is not derived from the enforced throttle");
  assert(Math.abs(monthlyGbSeconds - envelope.monthly_lambda_gb_second_ceiling) < 0.001, "public route Lambda duration ceiling is not derived from the enforced controls");
  const compute = monthlyGbSeconds * Number(envelope.lambda_compute_unit_price_usd);
  const api = monthlyRequests / 1_000_000 * Number(envelope.api_gateway_unit_price_usd_per_million);
  const lambdaRequests = monthlyRequests / 1_000_000 * Number(envelope.lambda_request_unit_price_usd_per_million);
  assert(Math.abs(compute - Number(envelope.lambda_compute_ceiling_usd)) < 0.001, "public route Lambda compute ceiling drifted");
  assert(Math.abs(api - Number(envelope.api_gateway_ceiling_usd)) < 0.001 && Math.abs(lambdaRequests - Number(envelope.lambda_request_ceiling_usd)) < 0.001, "public route request ceiling drifted");
  const requestDriven = compute + api + lambdaRequests + Number(envelope.metrics_and_logs_ceiling_usd);
  assert(requestDriven <= Number(envelope.lambda_api_logs_ceiling_usd) && Number(envelope.all_variable_services_ceiling_usd) === 12.75, "public route variable-service ceiling is incomplete");
  const worker = cost.password_reset_worker_envelope;
  assert(worker?.schedule === "rate(5 minutes)" && worker.monthly_invocation_ceiling === 8760, "password-reset worker cadence model drifted");
  const workerGbSeconds = worker.monthly_invocation_ceiling * worker.lambda_timeout_seconds * worker.lambda_memory_gib;
  const workerCost = workerGbSeconds * Number(worker.lambda_compute_unit_price_usd)
    + worker.monthly_invocation_ceiling / 1_000_000 * Number(worker.lambda_request_unit_price_usd_per_million)
    + Number(worker.metrics_and_logs_ceiling_usd);
  assert(workerGbSeconds === worker.monthly_lambda_gb_second_ceiling && workerCost <= Number(worker.worker_ceiling_usd), "password-reset worker cost ceiling drifted");
  assert((cost.line_items ?? []).some((item) => item.service === "AWS Lambda password-reset worker" && Number(item.monthly_estimate_usd) === Number(worker.worker_ceiling_usd)), "password-reset worker line item is missing");
  const fixedBaseline = Number(cost.subtotal_monthly_usd) - Number(envelope.all_variable_services_ceiling_usd);
  assert(fixedBaseline + Number(envelope.all_variable_services_ceiling_usd) + Number(cost.contingency_monthly_usd) === Number(cost.total_monthly_estimate_usd), "enforced cost envelope does not reconcile to the total");
  assert(PRIVATE_STAGING_EFFECTIVE_BUDGET_USD - cost.total_monthly_estimate_usd >= 0.5, "enforced cost envelope lacks minimum budget headroom");
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
