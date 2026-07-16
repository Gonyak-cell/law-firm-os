import assert from "node:assert/strict";
import test from "node:test";
import { readLambdaEnvironmentWithSsoAutoLogin } from "../lib/aws-sso-lambda-env.mjs";

test("readLambdaEnvironmentWithSsoAutoLogin retries Lambda env read after automatic SSO login", () => {
  const calls = [];
  const spawnSync = (command, args) => {
    calls.push([command, ...args].join(" "));
    if (args[0] === "lambda" && calls.length === 1) {
      return { status: 255, stderr: "Error loading SSO Token: Token has expired", stdout: "" };
    }
    if (args[0] === "sso") {
      return { status: 0, stderr: "", stdout: "" };
    }
    return {
      status: 0,
      stderr: "",
      stdout: JSON.stringify({
        LAWOS_VAULT_BRIDGE_TOKEN: "token-from-lambda",
        LAWOS_DEPLOYMENT_COMMIT: "commit-sha"
      })
    };
  };

  const result = readLambdaEnvironmentWithSsoAutoLogin({
    awsProfile: "matter-prod-deploy-admin",
    awsRegion: "ap-northeast-2",
    lambdaFunctionName: "matter-lawos-api-prod",
    ssoLoginProfile: "amic-vault-staging-admin",
    env: {},
    spawnSync,
    loginStdio: "pipe"
  });

  assert.equal(result.error, "");
  assert.equal(result.values.LAWOS_VAULT_BRIDGE_TOKEN, "token-from-lambda");
  assert.equal(result.ssoLogin.attempted, true);
  assert.equal(result.ssoLogin.status, 0);
  assert.deepEqual(calls, [
    "aws lambda get-function-configuration --function-name matter-lawos-api-prod --query Environment.Variables --output json",
    "aws sso login --profile amic-vault-staging-admin",
    "aws lambda get-function-configuration --function-name matter-lawos-api-prod --query Environment.Variables --output json"
  ]);
});

test("readLambdaEnvironmentWithSsoAutoLogin can leave SSO login manual when disabled", () => {
  const calls = [];
  const spawnSync = (command, args) => {
    calls.push([command, ...args].join(" "));
    return { status: 255, stderr: "Error loading SSO Token: Token has expired", stdout: "" };
  };

  const result = readLambdaEnvironmentWithSsoAutoLogin({
    awsProfile: "matter-prod-deploy-admin",
    awsRegion: "ap-northeast-2",
    lambdaFunctionName: "matter-lawos-api-prod",
    ssoLoginProfile: "amic-vault-staging-admin",
    env: {},
    spawnSync,
    autoLogin: false,
    loginStdio: "pipe"
  });

  assert.equal(result.code, "AWS_SSO_SESSION_EXPIRED");
  assert.equal(result.ssoLogin.attempted, false);
  assert.equal(calls.length, 1);
});
