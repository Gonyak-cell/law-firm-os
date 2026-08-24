import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectOutlookProductionAwsInventory,
  sha256,
} from "../collect-outlook-production-aws-inventory.mjs";
import {
  PROJECTION_AUDITOR_REQUIRED_ENV_KEYS,
  expectedFunctionIdentity,
  nonCodeStableProjection,
} from "../lib/outlook-production-aws-inventory-contract.mjs";
import { projectFunction } from "../lib/outlook-production-aws-inventory-projection.mjs";

export const NOW = "2026-08-16T03:00:00.000Z";
export const ACCOUNT = "770880870480";
export const FUNCTIONS = ["lawos-production-admin", "lawos-production-api", "lawos-production-projection-auditor", "matter-lawos-api-prod"];
export const EXPECTED_FUNCTIONS = FUNCTIONS;
export const EXPECTED_READ_ONLY_OPERATIONS = new Set([
  "sts:get-caller-identity", "lambda:get-function", "lambda:get-function-configuration", "lambda:get-function-concurrency", "lambda:list-provisioned-concurrency-configs", "lambda:get-function-event-invoke-config", "lambda:get-function-url-config", "lambda:list-tags", "logs:filter-log-events", "cloudwatch:get-metric-statistics", "cloudwatch:describe-alarms", "rds:describe-db-instances", "rds:describe-db-clusters", "cloudformation:get-template", "apigatewayv2:get-api", "apigatewayv2:get-routes", "apigatewayv2:get-integrations", "apigatewayv2:get-stages", "cloudfront:get-distribution-config", "events:describe-rule", "events:list-targets-by-rule",
]);
export const AUDITOR_ROLE_ARN = `arn:aws:iam::${ACCOUNT}:role/lawos-production-projection-auditor-role`;
export const AUDITOR_ENV_KEYS = [
  "LAWOS_APPROVAL_AUDIT_BUCKET", "LAWOS_AWS_ACCOUNT_ID", "LAWOS_DATABASE_HOST", "LAWOS_DATABASE_IDENTIFIER", "LAWOS_DATABASE_NAME", "LAWOS_DATABASE_PORT",
  "LAWOS_DEPLOYMENT_ARTIFACT_SHA256", "LAWOS_DEPLOYMENT_COMMIT", "LAWOS_DEPLOYMENT_TREE", "LAWOS_EXECUTION_PACKET_SHA256", "LAWOS_OWNER_TRUST_REGISTRY_SHA256",
  "LAWOS_PERSISTENCE_AUTHORITY", "LAWOS_POSTGRES_SSL_MODE", "LAWOS_POSTGRES_TENANT_CONTEXT_SECRET_ID", "LAWOS_PROJECTION_AUDITOR_DATABASE_SECRET_ID",
  "LAWOS_PROGRAM_EXECUTION_ROLE", "LAWOS_PROGRAM_INPUT_BUCKET", "LAWOS_PROGRAM_INPUT_KMS_KEY_ARN", "LAWOS_RUNTIME_PROFILE", "NODE_EXTRA_CA_CERTS",
];
export const CODE_BYTES = Buffer.from("UEsDBAoAAAAAAIhkEF2GYA9nCQAAAAkAAAALABwAcGF5bG9hZC50eH RVVAkAA0A+gWpAPoFqdXgLAAEE9QEAAAQUAAAAcGF5bG9hZFxuUEsBAh4DCgAAAAAAiGQQXYZgD2cJAAAACQAAAAsAGAAAAAAAAQAAAKSBAAAAAHBheWxvYWQudHh0VVQFAANAPoFqdXgLAAEE9QEAAAQUAAAAUEsFBgAAAAABAAEAUQAAAE4AAAAAAA==".replaceAll(" ", ""), "base64");
export const CODE_SHA = sha256(CODE_BYTES, { encoding: "base64" });
export const CODE_SHA256_BASE64 = CODE_SHA;
export const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
export const TEST_ROLLBACK_PARENT = await mkdtemp(path.join(os.tmpdir(), "outlook-collector-fixtures-"));
test.after(async () => rm(TEST_ROLLBACK_PARENT, { recursive: true, force: true }));

export function nonCanonicalCodeSha(value) {
  const lastIndex = value.length - 2;
  const canonicalIndex = BASE64_ALPHABET.indexOf(value[lastIndex]);
  const nonCanonicalIndex = (canonicalIndex & 0b110000) | 0b000001;
  return `${value.slice(0, lastIndex)}${BASE64_ALPHABET[nonCanonicalIndex]}=`;
}

export function task3StateWithTwoSecurityGroups() {
  const configuration = {
    FunctionArn: "arn:aws:lambda:ap-northeast-2:770880870480:function:lawos-production-projection-auditor",
    FunctionName: "lawos-production-projection-auditor",
    Role: AUDITOR_ROLE_ARN,
    Runtime: "nodejs22.x",
    Handler: "apps/api/src/json-postgres-program-admin-lambda.handler",
    CodeSha256: CODE_SHA,
    CodeSize: 32,
    RevisionId: "R0",
    LastModified: NOW,
    State: "Active",
    LastUpdateStatus: "Successful",
    Timeout: 900,
    MemorySize: 2048,
    EphemeralStorage: { Size: 512 },
    Architectures: ["arm64"],
    VpcConfig: { VpcId: "vpc-task3", SubnetIds: ["subnet-a", "subnet-b"], SecurityGroupIds: ["sg-a", "sg-b"], Ipv6AllowedForDualStack: false },
    Environment: { Variables: Object.fromEntries(PROJECTION_AUDITOR_REQUIRED_ENV_KEYS.map((key) => [key, "fixture"])) },
    PackageType: "Zip",
    Version: "$LATEST",
    SigningProfileVersionArn: "arn:aws:signer:ap-northeast-2:770880870480:/signing-profiles/task3",
    SigningJobArn: "arn:aws:signer:ap-northeast-2:770880870480:/signing-jobs/task3",
  };
  const projected = projectFunction({
    name: configuration.FunctionName,
    getFunctionResponse: { Configuration: configuration, Code: { Location: "https://example.test/code" } },
    configurationResponse: configuration,
    expectedKeyInfo: { logical_id: "ProjectionAuditorFunction", complete: true, expected_keys: [...PROJECTION_AUDITOR_REQUIRED_ENV_KEYS] },
    directInvoke: { status: "NOT_CONFIGURED", error_code: null, function_url_present: false, auth_type: null, url_stripped: true },
    tags: { status: "PASS", error_code: null, key_count: 0, presence: {} },
    logs: { status: "PASS", error_code: null, complete: true, event_count: 0, first_event_at: null, last_event_at: null, first_failure_at: null, classes: [], request_ids: [] },
    metrics: [{ metric_name: "Errors", status: "PASS", error_code: null, datapoint_count: 0, datapoints: [] }, { metric_name: "Invocations", status: "PASS", error_code: null, datapoint_count: 0, datapoints: [] }],
    rollbackCode: { status: "NOT_REQUESTED", error_code: null, path: null, manifest_path: null, bytes: null, zip_sha256: null, code_sha256_base64: null, matches_code_sha256: null },
    reservedConcurrency: 1,
    provisionedConcurrency: [],
  });
  return {
    revision_id: projected.revision_id,
    code_sha256_base64: projected.config_stable_projection.code_sha256_base64,
    configuration_fingerprint_sha256: projected.configuration_fingerprint_sha256,
    non_code_configuration_fingerprint_sha256: projected.non_code_configuration_fingerprint_sha256,
    config_stable_projection: projected.config_stable_projection,
    non_code_configuration: nonCodeStableProjection(projected.config_stable_projection),
    state: projected.state,
    last_update_status: projected.last_update_status,
  };
}

export function requestTarget(request) {
  const index = request.args.findIndex((value) => value === "--function-name");
  return index >= 0 ? request.args[index + 1] : null;
}

export function responseFor(request, overrides = {}) {
  const target = requestTarget(request);
  const operation = `${request.service}:${request.operation}`;
  const identity = target ? expectedFunctionIdentity(target) : null;
  if (overrides[operation]) return typeof overrides[operation] === "function" ? overrides[operation](request) : overrides[operation];
  if (operation === "sts:get-caller-identity") return { Account: ACCOUNT, Arn: "arn:aws:sts::770880870480:assumed-role/matter-readonly-auditor/fixture-session", UserId: "AIDA" };
  if (operation === "cloudformation:get-template") {
    return {
      TemplateBody: JSON.stringify({
        Resources: Object.fromEntries(FUNCTIONS.map((name) => [name.replaceAll("-", "").replace(/^./, (value) => value.toUpperCase()), {
          Type: "AWS::Lambda::Function",
          Properties: { FunctionName: name, Environment: { Variables: Object.fromEntries((name === "lawos-production-projection-auditor" ? AUDITOR_ENV_KEYS : ["LAWOS_RUNTIME_PROFILE", "LAWOS_PERSISTENCE_AUTHORITY"]).map((key) => [key, { Ref: key }])) } },
        }])),
      }),
    };
  }
  if (operation === "lambda:get-function") return {
    Configuration: { FunctionName: target, FunctionArn: identity.function_arn, Runtime: identity.runtime, Role: identity.role_arn, Handler: identity.handler, CodeSha256: CODE_SHA, CodeSize: 1000, RevisionId: `rev-${target}`, LastModified: NOW, State: "Active", LastUpdateStatus: "Successful", Architectures: [identity.architecture], PackageType: identity.package_type },
    Code: { Location: "https://example.test/presigned?X-Amz-Signature=do-not-hash" },
  };
  if (operation === "lambda:get-function-configuration") return {
    FunctionName: target,
    FunctionArn: identity.function_arn,
    Runtime: identity.runtime,
    Role: identity.role_arn,
    Handler: identity.handler,
    CodeSha256: CODE_SHA,
    CodeSize: 1000,
    RevisionId: `rev-${target}`,
    LastModified: NOW,
    State: "Active",
    LastUpdateStatus: "Successful",
    Timeout: 30,
    MemorySize: 1024,
    Architectures: [identity.architecture],
    PackageType: identity.package_type,
    Environment: { Variables: Object.fromEntries((target === "lawos-production-projection-auditor" ? AUDITOR_ENV_KEYS : ["LAWOS_RUNTIME_PROFILE", "LAWOS_DATABASE_PASSWORD", "LAWOS_PERSISTENCE_AUTHORITY"]).map((key) => [key, key === "LAWOS_DATABASE_PASSWORD" ? "synthetic-password" : "fixture-value"])) },
  };
  if (operation === "lambda:get-function-url-config") {
    if (target !== "matter-lawos-api-prod") return Object.assign(new Error("ResourceNotFoundException"), { code: "AWS_RESOURCE_NOT_FOUND" });
    return { FunctionUrl: `https://${target}.lambda-url.example.test/`, AuthType: "AWS_IAM" };
  }
  if (operation === "lambda:get-function-concurrency") return { ReservedConcurrentExecutions: 10 };
  if (operation === "lambda:list-provisioned-concurrency-configs") return { ProvisionedConcurrencyConfigs: [] };
  if (operation === "lambda:list-tags") return { Tags: { Environment: "production" } };
  if (operation === "logs:filter-log-events") return { events: [
    { eventId: "benign", timestamp: Date.parse("2026-08-16T02:59:00.000Z"), message: "INIT_REPORT Init Duration: 1 ms PostgreSQL connection established" },
    { eventId: "failure", timestamp: Date.parse("2026-08-16T02:58:00.000Z"), message: "REPORT RequestId: req-1 ERROR: LAWOS_RUNTIME_PREFLIGHT_FAILED" },
  ] };
  if (operation === "cloudwatch:get-metric-statistics") return { Datapoints: [{ Timestamp: NOW, Sum: 0 }] };
  if (operation === "cloudwatch:describe-alarms") return { MetricAlarms: [{ AlarmName: "lawos-api-health", StateValue: "OK", StateUpdatedTimestamp: NOW }] };
  if (operation === "rds:describe-db-instances") return { DBInstances: [{ DBInstanceIdentifier: "lawos-db", DBInstanceStatus: "available", Engine: "postgres", EngineVersion: "16" }] };
  if (operation === "rds:describe-db-clusters") return { DBClusters: [] };
  if (operation === "apigatewayv2:get-api") return { ApiId: "http-api-1", ProtocolType: "HTTP", ApiEndpoint: "https://http-api.example.test" };
  if (operation === "apigatewayv2:get-routes") return { Items: [{ RouteKey: "POST /api/health", Target: "integrations/api" }] };
  if (operation === "apigatewayv2:get-integrations") return { Items: [{ IntegrationId: "api", IntegrationUri: "arn:aws:lambda:ap-northeast-2:770880870480:function:lawos-production-api" }] };
  if (operation === "apigatewayv2:get-stages") return { Items: [{ StageName: "$default", AutoDeploy: true }] };
  if (operation === "cloudfront:get-distribution-config") return { DistributionConfig: { Enabled: true, DefaultCacheBehavior: { TargetOriginId: "legacy-origin", ForwardedValues: {} }, CacheBehaviors: { Items: [{ PathPattern: "/api*", TargetOriginId: "legacy-origin" }] }, Origins: { Items: [{ Id: "legacy-origin", DomainName: "legacy.example.test" }], Quantity: 1 }, Logging: { Enabled: true } } };
  if (operation === "events:describe-rule") return { Name: "lawos-five-minute", State: "ENABLED", ScheduleExpression: "rate(5 minutes)" };
  if (operation === "events:list-targets-by-rule") return { Targets: [{ Id: "target-1", Arn: "arn:aws:lambda:ap-northeast-2:770880870480:function:lawos-production-api", RetryPolicy: { MaximumEventAgeInSeconds: 3600, MaximumRetryAttempts: 2 } }] };
  if (operation === "lambda:get-function-event-invoke-config") return { FunctionName: target, MaximumEventAgeInSeconds: 3600, MaximumRetryAttempts: 2 };
  throw new Error(`fixture missing ${operation}`);
}

export function fakeExecutor(calls, overrides = {}) {
  const failSts = overrides?.failSts === true;
  const responseOverrides = failSts ? {} : overrides;
  return async (request) => {
    calls.push(request);
    if (failSts && request.service === "sts") {
      const error = new Error("The SSO session associated with this profile has expired");
      error.code = "AWS_SSO_SESSION_EXPIRED";
      throw error;
    }
    const response = responseFor(request, responseOverrides);
    if (response instanceof Error) throw response;
    return response;
  };
}

export async function collectFixture({ calls = [], overrides = {}, ...options } = {}) {
  return collectOutlookProductionAwsInventory({
    profile: "matter-readonly-auditor",
    region: "ap-northeast-2",
    observedAt: NOW,
    execute: fakeExecutor(calls, overrides),
    functions: FUNCTIONS,
    cloudformationStacks: ["lawos-production"],
    httpApiId: "http-api-1",
    cloudfrontDistributionId: "distribution-1",
    eventbridgeRuleName: "lawos-five-minute",
    rdsIdentifiers: ["lawos-db"],
    rollbackDir: path.join(TEST_ROLLBACK_PARENT, "rollback"),
    download: async () => CODE_BYTES,
    ...options,
  });
}

export function authorityWithObservedSecretKey(request) {
  const response = responseFor(request);
  const template = JSON.parse(response.TemplateBody);
  for (const resource of Object.values(template.Resources)) {
    if (resource?.Properties?.FunctionName === "lawos-production-projection-auditor") continue;
    if (resource?.Type === "AWS::Lambda::Function") resource.Properties.Environment.Variables.LAWOS_DATABASE_PASSWORD = { Ref: "DatabasePassword" };
  }
  return { TemplateBody: JSON.stringify(template) };
}
