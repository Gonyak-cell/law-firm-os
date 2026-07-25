import assert from "node:assert/strict";
import test from "node:test";
import {
  CLOUDFORMATION_TEMPLATE_BODY_MAX_BYTES,
  buildVersionedS3TemplateUrl,
  cloudFormationParameterArgs,
  cloudFormationParameterJsonArgs,
  cloudFormationTemplateSha256,
  cloudFormationTemplateArgs,
  cloudFormationTemplateRequiresUrl,
  validateCloudFormationChangeSetTemplate,
} from "../lib/cloudformation-template-transport.mjs";

test("CloudFormation template transport uses TemplateBody only within the API limit", () => {
  assert.equal(
    cloudFormationTemplateRequiresUrl(
      CLOUDFORMATION_TEMPLATE_BODY_MAX_BYTES,
    ),
    false,
  );
  assert.equal(
    cloudFormationTemplateRequiresUrl(
      CLOUDFORMATION_TEMPLATE_BODY_MAX_BYTES + 1,
    ),
    true,
  );
  assert.deepEqual(
    cloudFormationTemplateArgs({
      templatePath: "/private/template.json",
      templateByteSize: CLOUDFORMATION_TEMPLATE_BODY_MAX_BYTES,
    }).args,
    ["--template-body", "file:///private/template.json"],
  );
  assert.throws(
    () => cloudFormationTemplateArgs({
      templatePath: "/private/template.json",
      templateByteSize: CLOUDFORMATION_TEMPLATE_BODY_MAX_BYTES + 1,
    }),
    /requires TemplateURL/u,
  );
});

test("CloudFormation oversized templates use an exact S3 object version URL", () => {
  const url = buildVersionedS3TemplateUrl({
    bucket: "lawos-private-rehearsal-artifacts-770880870480",
    region: "ap-northeast-2",
    key: `cloudformation-template/${"a".repeat(40)}/${"b".repeat(64)}.json`,
    versionId: "version/+?=exact",
  });
  const parsed = new URL(url);
  assert.equal(
    parsed.hostname,
    "lawos-private-rehearsal-artifacts-770880870480"
      + ".s3.ap-northeast-2.amazonaws.com",
  );
  assert.equal(parsed.searchParams.get("versionId"), "version/+?=exact");
  assert.deepEqual(
    cloudFormationTemplateArgs({
      templatePath: "/private/template.json",
      templateByteSize: CLOUDFORMATION_TEMPLATE_BODY_MAX_BYTES + 1,
      templateUrl: url,
    }).args,
    ["--template-url", url],
  );
  assert.throws(
    () => buildVersionedS3TemplateUrl({
      bucket: "Invalid_Bucket",
      region: "ap-northeast-2",
      key: "template.json",
      versionId: "version",
    }),
    /locator is invalid/u,
  );
});

test("CloudFormation change-set template body is the authoritative remote binding", () => {
  const template = {
    Resources: {
      ExactBucket: {
        Type: "AWS::S3::Bucket",
      },
    },
  };
  const expectedSha256 = cloudFormationTemplateSha256(template);
  assert.equal(
    validateCloudFormationChangeSetTemplate({
      response: { TemplateBody: template },
      expectedSha256,
    }).template_sha256,
    expectedSha256,
  );
  assert.equal(
    validateCloudFormationChangeSetTemplate({
      response: { TemplateBody: JSON.stringify(template) },
      expectedSha256,
    }).template_sha256,
    expectedSha256,
  );
  assert.throws(
    () => validateCloudFormationChangeSetTemplate({
      response: {
        TemplateBody: {
          ...template,
          Description: "drifted",
        },
      },
      expectedSha256,
    }),
    /template digest drifted/u,
  );
});

test("CloudFormation update parameters preserve hidden NoEcho values", () => {
  assert.deepEqual(
    cloudFormationParameterArgs([
      { key: "SourceSha", value: "a".repeat(40) },
      { key: "PasswordResetFromEmail", value: "****" },
    ]),
    [
      `ParameterKey=SourceSha,ParameterValue=${"a".repeat(40)}`,
      "ParameterKey=PasswordResetFromEmail,UsePreviousValue=true",
    ],
  );
  assert.deepEqual(
    cloudFormationParameterArgs({
      EnableLambdaEniBootstrap: "false",
      PasswordResetFromEmail: "****",
    }),
    [
      "ParameterKey=EnableLambdaEniBootstrap,ParameterValue=false",
      "ParameterKey=PasswordResetFromEmail,UsePreviousValue=true",
    ],
  );
  assert.throws(
    () => cloudFormationParameterArgs({
      "unsafe,key": "value",
    }),
    /parameter key is invalid/u,
  );
  assert.throws(
    () => cloudFormationParameterArgs({
      MissingValue: undefined,
    }),
    /has no value/u,
  );
});

test("CloudFormation JSON parameters preserve structured text as string values", () => {
  const workerEvent = JSON.stringify({
    mode: "incremental",
    nested: { values: ["alpha,beta", "(gamma)"] },
  });
  assert.deepEqual(
    JSON.parse(cloudFormationParameterJsonArgs({
      ProjectionWorkerEventJson: "{}",
      StructuredWorkerEvent: workerEvent,
      PasswordResetFromEmail: "****",
    })[0]),
    [
      {
        ParameterKey: "ProjectionWorkerEventJson",
        ParameterValue: "{}",
      },
      {
        ParameterKey: "StructuredWorkerEvent",
        ParameterValue: workerEvent,
      },
      {
        ParameterKey: "PasswordResetFromEmail",
        UsePreviousValue: true,
      },
    ],
  );
  assert.throws(
    () => cloudFormationParameterJsonArgs({ "unsafe,key": "value" }),
    /parameter key is invalid/u,
  );
  assert.throws(
    () => cloudFormationParameterJsonArgs({ MissingValue: null }),
    /has no value/u,
  );
  assert.throws(
    () => cloudFormationParameterJsonArgs({ MissingValue: undefined }),
    /has no value/u,
  );
});
