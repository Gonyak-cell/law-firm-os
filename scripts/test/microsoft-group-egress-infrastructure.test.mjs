import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const templateUrl = new URL(
  "../../infra/lawos-production/microsoft-group-egress-template.json",
  import.meta.url,
);
const outlookWorkflowUrl = new URL(
  "../../.github/workflows/outlook-addin-validation.yml",
  import.meta.url,
);

async function template() {
  return JSON.parse(await readFile(templateUrl, "utf8"));
}

function nestedObjects(value, result = []) {
  if (!value || typeof value !== "object") return result;
  if (!Array.isArray(value)) result.push(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    nestedObjects(child, result);
  }
  return result;
}

function containsGlobalWildcard(value) {
  if (value === "*") return true;
  if (!value || typeof value !== "object") return false;
  return (Array.isArray(value) ? value : Object.values(value))
    .some(containsGlobalWildcard);
}

function prohibitedResourceType(type) {
  return type === "AWS::Lambda::Url"
    || type === "AWS::Lambda::Permission"
    || type === "AWS::Lambda::EventSourceMapping"
    || type === "AWS::Lambda::EventInvokeConfig"
    || type === "AWS::Events::Rule"
    || type.startsWith("AWS::ApiGateway::")
    || type.startsWith("AWS::ApiGatewayV2::");
}

test("dedicated group controller is exact, private, and mutation-disabled by default", async () => {
  const value = await template();
  const resources = value.Resources;
  const fn = resources.MicrosoftGroupEgressFunction.Properties;

  assert.equal(fn.FunctionName, "lawos-microsoft-group-egress-prod");
  assert.equal(fn.Runtime, "nodejs22.x");
  assert.equal(fn.Handler, "lambda.handler");
  assert.equal(fn.ReservedConcurrentExecutions, 1);
  assert.equal(fn.Timeout, 120);
  assert.equal(fn.MemorySize, 256);
  assert.deepEqual(fn.Architectures, ["x86_64"]);
  assert.equal(
    fn.Environment.Variables.LAWOS_MICROSOFT_GROUP_EGRESS_PROVIDER_ENABLED.Ref,
    "ProviderMutationEnabled",
  );
  assert.equal(value.Parameters.ProviderMutationEnabled.Default, "false");
  assert.deepEqual(value.Parameters.ProviderMutationEnabled.AllowedValues, ["false", "true"]);
  assert.deepEqual(
    fn.Environment.Variables.LAWOS_MICROSOFT_GROUP_EGRESS_CREDENTIAL_SECRET_ARN,
    { "Fn::GetAtt": ["MicrosoftGroupEgressCredentialSecret", "Arn"] },
  );
  const resourceEntries = Object.entries(resources);
  assert.deepEqual(
    resourceEntries.filter(([, resource]) => prohibitedResourceType(resource.Type)),
    [],
  );
  assert.deepEqual(
    resourceEntries
      .filter(([, resource]) => resource.Type === "AWS::Lambda::Function")
      .map(([logicalId]) => logicalId),
    ["MicrosoftGroupEgressFunction"],
  );
  assert.equal(fn.DeadLetterConfig, undefined);
});

test("controller role reads one secret and has no database, Lambda, queue, bucket, or event permissions", async () => {
  const value = await template();
  const resources = value.Resources;
  const statements = nestedObjects(resources)
    .filter((value) => Object.hasOwn(value, "Effect") && Object.hasOwn(value, "Action"));
  const secretRead = statements.find((statement) => statement.Sid === "ReadExactAppCredential");

  assert.deepEqual(secretRead.Action, ["secretsmanager:GetSecretValue"]);
  assert.deepEqual(secretRead.Resource, {
    "Fn::GetAtt": ["MicrosoftGroupEgressCredentialSecret", "Arn"],
  });
  assert.equal(
    statements.some((statement) => containsGlobalWildcard(statement.Resource)),
    false,
  );
  const actions = statements.flatMap((statement) => (
    Array.isArray(statement.Action) ? statement.Action : [statement.Action]
  ));
  assert.deepEqual(new Set(actions), new Set([
    "sts:AssumeRole",
    "logs:CreateLogStream",
    "logs:PutLogEvents",
    "secretsmanager:GetSecretValue",
  ]));
  assert.equal(
    JSON.stringify(statements).includes("lawos-microsoft-egress-prod"),
    false,
  );
  assert.doesNotMatch(
    JSON.stringify(statements),
    /(?:rds|rds-db|s3|lambda:Invoke|sqs|events:|dynamodb|ssm:)/iu,
  );
  assert.equal(containsGlobalWildcard(["arn:aws:logs:fixed", "*"]), true);
  assert.equal(containsGlobalWildcard({ "Fn::If": ["Condition", "*", "fixed"] }), true);
  assert.equal(prohibitedResourceType("AWS::Lambda::Url"), true);
  assert.equal(prohibitedResourceType("AWS::ApiGatewayV2::Api"), true);
});

test("template enforces production account and region and uses fixed authority parameters", async () => {
  const value = await template();
  assert.deepEqual(value.Rules.ExactProductionTarget.Assertions, [
    {
      Assert: { "Fn::Equals": [{ Ref: "AWS::AccountId" }, "770880870480"] },
      AssertDescription: "Deploy only in AWS account 770880870480.",
    },
    {
      Assert: { "Fn::Equals": [{ Ref: "AWS::Region" }, "ap-northeast-2"] },
      AssertDescription: "Deploy only in ap-northeast-2.",
    },
  ]);
  for (const name of [
    "MicrosoftTenantId",
    "MicrosoftGroupId",
    "AllowedPrincipalIdsJson",
    "ArtifactBucketName",
    "ArtifactObjectKey",
    "ArtifactObjectVersion",
    "AlarmTopicArn",
  ]) {
    assert.equal(Object.hasOwn(value.Parameters[name], "Default"), false, name);
  }
  const variables = value.Resources.MicrosoftGroupEgressFunction.Properties
    .Environment.Variables;
  assert.deepEqual(variables.LAWOS_MICROSOFT_GROUP_EGRESS_TENANT_ID, { Ref: "MicrosoftTenantId" });
  assert.deepEqual(variables.LAWOS_MICROSOFT_GROUP_EGRESS_GROUP_ID, { Ref: "MicrosoftGroupId" });
  assert.deepEqual(
    variables.LAWOS_MICROSOFT_GROUP_EGRESS_ALLOWED_PRINCIPAL_IDS_JSON,
    { Ref: "AllowedPrincipalIdsJson" },
  );
});

test("synchronous controller has actionable errors, throttles, and duration alarms", async () => {
  const value = await template();
  for (const [logicalId, metricName] of [
    ["MicrosoftGroupEgressErrorsAlarm", "Errors"],
    ["MicrosoftGroupEgressThrottlesAlarm", "Throttles"],
    ["MicrosoftGroupEgressDurationAlarm", "Duration"],
  ]) {
    const alarm = value.Resources[logicalId];
    assert.equal(alarm.Type, "AWS::CloudWatch::Alarm");
    assert.equal(alarm.Properties.Namespace, "AWS/Lambda");
    assert.equal(alarm.Properties.MetricName, metricName);
    assert.deepEqual(alarm.Properties.Dimensions, [{
      Name: "FunctionName",
      Value: { Ref: "MicrosoftGroupEgressFunction" },
    }]);
    assert.deepEqual(alarm.Properties.AlarmActions, [{ Ref: "AlarmTopicArn" }]);
    assert.equal(alarm.Properties.TreatMissingData, "notBreaching");
  }
});

test("Outlook CI triggers on group-egress changes and runs its closed test suite", async () => {
  const workflow = await readFile(outlookWorkflowUrl, "utf8");
  assert.equal(
    [...workflow.matchAll(/- "apps\/microsoft-group-egress-controller\/\*\*"/gu)].length,
    2,
  );
  assert.equal(
    [...workflow.matchAll(
      /- "infra\/lawos-production\/microsoft-group-egress-template\.json"/gu,
    )].length,
    2,
  );
  assert.match(
    workflow,
    /name: Microsoft group egress controller and infrastructure tests[\s\S]*apps\/microsoft-group-egress-controller\/\*\.test\.mjs[\s\S]*scripts\/test\/microsoft-group-egress-artifact\.test\.mjs[\s\S]*scripts\/test\/microsoft-group-egress-builder\.test\.mjs[\s\S]*scripts\/test\/microsoft-group-egress-infrastructure\.test\.mjs/u,
  );
});
