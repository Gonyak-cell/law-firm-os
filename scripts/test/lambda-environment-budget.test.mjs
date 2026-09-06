import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assertLambdaEnvironmentBudget,
  resolveW15ApiEnvironment,
} from "../lib/lambda-environment-budget.mjs";
import { buildJsonPostgresProductionTemplate } from "../lib/json-postgres-production-infrastructure.mjs";
import { CLOUDFORMATION_NO_ECHO_PLACEHOLDER } from "../lib/cloudformation-template-transport.mjs";

function fixture(count, keyValueBytes, prefix = "ENV") {
  const result = Object.fromEntries(Array.from({ length: count }, (_, i) => [`${prefix}_${i}`, ""]));
  const keysBytes = Object.keys(result).reduce((sum, key) => sum + Buffer.byteLength(key), 0);
  result[`${prefix}_0`] = "x".repeat(keyValueBytes - keysBytes);
  return result;
}

test("regresses the 4190-byte rejected candidate and 3742-byte reduced candidate", () => {
  const baseline = fixture(54, 3346);
  assert.equal(assertLambdaEnvironmentBudget(baseline).size_bytes, 3671);
  const previous = { ...baseline, ...fixture(6, 483, "PHOTO") };
  assert.equal(Buffer.byteLength(JSON.stringify(previous)), 4190);
  assert.throws(() => assertLambdaEnvironmentBudget(previous), /4096 bytes \(4190 bytes\)/u);
  const reduced = { ...baseline, ...fixture(1, 65, "PHOTO") };
  assert.deepEqual(assertLambdaEnvironmentBudget(reduced), {
    variable_count: 55, size_bytes: 3742, key_value_bytes: 3411,
    maximum_bytes: 4096, headroom_bytes: 354,
  });
});

test("counts UTF-8 bytes and escaped JSON with an exact inclusive boundary", () => {
  const value = { AA: '한"\\' };
  const report = assertLambdaEnvironmentBudget(value);
  assert.equal(report.key_value_bytes, 7);
  assert.equal(report.size_bytes, Buffer.byteLength(JSON.stringify(value), "utf8"));
  assert.notEqual(report.size_bytes, JSON.stringify(value).length);
  assert.equal(assertLambdaEnvironmentBudget(fixture(1, 4089)).headroom_bytes, 0);
  assert.throws(() => assertLambdaEnvironmentBudget(fixture(1, 4090)), /exceeds/u);
});

test("rejects unresolved or malformed values without leaking their contents", () => {
  for (const value of [undefined, null, [], new Map(), new Date(), "secret", { AA: undefined }, { AA: 3 },
    { AA: { Ref: "secret" } }, { AA: CLOUDFORMATION_NO_ECHO_PLACEHOLDER },
    { AA: "{{resolve:secretsmanager:private-value}}" }, { "bad-key": "secret" }]) {
    assert.throws(() => assertLambdaEnvironmentBudget(value), (error) => {
      assert.doesNotMatch(error.message, /private-value|bad-key|secret/u);
      return true;
    });
  }
});

const parameters = {
  SourceSha: "new-source",
  EnableProjectionWorker: "false", EnableExternalReadProviders: "false",
  EnableAmicInternalUnsignedUpdateBroker: "false", EnableProductionTraffic: "true",
  EnableOutlookConversationWorker: "false",
  ClientOutlookM365ConfigSecretName: "/lawos/disabled/outlook/config",
  ClientOutlookCredentialSecretPrefix: "/lawos/disabled/outlook/credentials/",
};
function resolutionFixture() {
  return {
    variables: {
      SOURCE: { Ref: "SourceSha" },
      COMMON_BUCKET: { Ref: "DmsBucket" }, NEW_PHOTO_BUCKET: { Ref: "DmsBucket" },
      PHOTO_PREFIX: "approved-real-migration/member-photos",
      DISABLED: { "Fn::If": ["ExternalReadProvidersEnabled", { Ref: "Missing" }, ""] },
      OMITTED: { "Fn::If": ["OutlookConversationWorkerConfigured", "yes", { Ref: "AWS::NoValue" }] },
      CALLBACK: { "Fn::Sub": "${HttpApi.ApiEndpoint}/callback" },
      OWNER: { Ref: "AWS::AccountId" }, REGION: { Ref: "AWS::Region" },
    },
    liveVariables: { SOURCE: "old-source", COMMON_BUCKET: "existing-private-bucket", REMOVED: "old" },
    deployedVariables: { SOURCE: { Ref: "SourceSha" }, COMMON_BUCKET: { Ref: "DmsBucket" },
      NEW_PHOTO_BUCKET: { Ref: "DmsBucket" } },
    parameters, outputs: { ApiEndpoint: "https://example.invalid" },
    accountId: "111111111111", region: "ap-northeast-2",
  };
}

test("resolves candidate variables from current resource bindings and new parameters", () => {
  const result = resolveW15ApiEnvironment(resolutionFixture());
  assert.deepEqual(result, {
    SOURCE: "new-source", COMMON_BUCKET: "existing-private-bucket", NEW_PHOTO_BUCKET: "existing-private-bucket",
    PHOTO_PREFIX: "approved-real-migration/member-photos", DISABLED: "",
    CALLBACK: "https://example.invalid/callback", OWNER: "111111111111", REGION: "ap-northeast-2",
  });
});

test("installation signer is omitted when disabled and budgets only the resolved exact ARN", () => {
  const name = "LAWOS_INTERNAL_INSTALLATION_ATTESTATION_SECRET_ID";
  const arn = "arn:aws:secretsmanager:ap-northeast-2:770880870480:secret:/lawos/production/internal-installation/attestation-signer-AbCd12";
  const input = resolutionFixture();
  input.variables[name] = { "Fn::If": ["InternalInstallationAttestationConfigured",
    { Ref: "InternalInstallationAttestationSecretArn" }, { Ref: "AWS::NoValue" }] };
  input.parameters = { ...parameters, InternalInstallationAttestationSecretArn: "disabled" };
  const disabled = resolveW15ApiEnvironment(input);
  assert.equal(Object.hasOwn(disabled, name), false);
  input.parameters.InternalInstallationAttestationSecretArn = arn;
  const enabled = resolveW15ApiEnvironment(input);
  assert.equal(enabled[name], arn);
  assert.equal(assertLambdaEnvironmentBudget(enabled).size_bytes - assertLambdaEnvironmentBudget(disabled).size_bytes,
    Buffer.byteLength(name) + Buffer.byteLength(arn) + 6);
  for (const value of [undefined, "", "****", "{{resolve:secretsmanager:secret}}", arn + "*", arn + "\n", arn.replace("770880870480", "111111111111")]) {
    input.parameters.InternalInstallationAttestationSecretArn = value;
    assert.throws(() => resolveW15ApiEnvironment(input), /installation attestation reference is unresolved/u);
  }
  input.parameters.InternalInstallationAttestationSecretArn = arn;
  const remaining = assertLambdaEnvironmentBudget(enabled).headroom_bytes;
  input.variables.PADDING = "x".repeat(remaining - 13);
  assert.equal(assertLambdaEnvironmentBudget(resolveW15ApiEnvironment(input)).headroom_bytes, 0);
  input.variables.PADDING += "x";
  assert.throws(() => resolveW15ApiEnvironment(input), /exceeds 4096 bytes/u);
});

function noEchoFixture() {
  const input = resolutionFixture();
  input.parameters = { ...parameters, PasswordResetFromEmail: CLOUDFORMATION_NO_ECHO_PLACEHOLDER };
  input.variables.EMAIL_FROM = { Ref: "PasswordResetFromEmail" };
  input.deployedVariables.EMAIL_FROM = { Ref: "PasswordResetFromEmail" };
  input.liveVariables.EMAIL_FROM = "x@sample.test";
  return input;
}

test("resolves NoEcho UsePreviousValue from an unchanged deployed Ref and counts the real value", () => {
  const input = noEchoFixture();
  const resolved = resolveW15ApiEnvironment(input);
  assert.equal(resolved.EMAIL_FROM, input.liveVariables.EMAIL_FROM);
  const underestimated = { ...resolved, EMAIL_FROM: CLOUDFORMATION_NO_ECHO_PLACEHOLDER };
  assert.equal(assertLambdaEnvironmentBudget(resolved).size_bytes
    - Buffer.byteLength(JSON.stringify(underestimated)), 9);
});

test("rejects missing, changed, masked, or ambiguous NoEcho live bindings", () => {
  for (const mutate of [
    (input) => { delete input.liveVariables.EMAIL_FROM; },
    (input) => { input.deployedVariables.EMAIL_FROM = { Ref: "DifferentParameter" }; },
    (input) => { input.liveVariables.EMAIL_FROM = CLOUDFORMATION_NO_ECHO_PLACEHOLDER; },
    (input) => {
      input.variables.EMAIL_ALIAS = { Ref: "PasswordResetFromEmail" };
      input.deployedVariables.EMAIL_ALIAS = { Ref: "PasswordResetFromEmail" };
      input.liveVariables.EMAIL_ALIAS = "different@example.invalid";
    },
  ]) {
    const input = noEchoFixture();
    mutate(input);
    assert.throws(() => resolveW15ApiEnvironment(input), (error) => {
      assert.match(error.message, /unresolved|ambiguous|changed/u);
      assert.doesNotMatch(error.message, /sample|example|different|\*{4}/u);
      return true;
    });
  }
});

test("rejects unknown references, ambiguous live bindings, and unrecognized expressions", () => {
  for (const mutate of [
    (input) => { input.variables.NEW = { Ref: "Unknown" }; },
    (input) => { input.liveVariables.NEW_PHOTO_BUCKET = "different-bucket"; },
    (input) => { input.variables.NEW = { "Fn::Join": ["", []] }; },
    (input) => { input.variables.NEW = { "Fn::If": ["Unknown", "yes", "no"] }; },
    (input) => { input.variables.NEW = { "Fn::Sub": "${HttpApi.ApiEndpoint}/${Unknown}" }; },
    (input) => { input.parameters = { ...parameters, EnableProjectionWorker: undefined }; },
    (input) => { input.liveVariables = undefined; },
    (input) => { input.variables.NEW = "{{resolve:ssm:private-value}}"; },
    (input) => { input.variables.COMMON_BUCKET = { Ref: "ChangedBucket" }; },
    (input) => { input.deployedVariables.COMMON_BUCKET = { "Fn::GetAtt": ["DmsBucket", "Arn"] }; },
  ]) {
    const input = resolutionFixture();
    mutate(input);
    assert.throws(() => resolveW15ApiEnvironment(input), /unresolved|unsupported|ambiguous|unavailable|changed/u);
  }
});

test("resolves every variable in the current production API template", () => {
  const staging = JSON.parse(readFileSync("infra/lawos-private-staging/template.json", "utf8"));
  const template = buildJsonPostgresProductionTemplate(staging);
  const variables = template.Resources.ApiFunction.Properties.Environment.Variables;
  const allParameters = Object.fromEntries(Object.entries(template.Parameters)
    .map(([key, value]) => [key, String(value.Default ?? "fixture")]));
  const liveVariables = Object.fromEntries(Object.entries(variables)
    .filter(([key]) => !key.startsWith("LAWOS_MEMBER_PHOTO_"))
    .map(([key, value]) => [key, typeof value === "object" ? "fixture-resource" : value]));
  const resolved = resolveW15ApiEnvironment({
    variables, deployedVariables: variables, liveVariables, parameters: { ...allParameters, ...parameters },
    outputs: { ApiEndpoint: "https://example.invalid" },
    accountId: "111111111111", region: "ap-northeast-2",
  });
  assert.equal(resolved.LAWOS_MEMBER_PHOTO_S3_PREFIX, "approved-real-migration/member-photos");
  assert.ok(assertLambdaEnvironmentBudget(resolved).size_bytes <= 4096);
});
