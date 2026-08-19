import assert from "node:assert/strict";
import test from "node:test";

import {
  CLIENT_ID,
  CLIENT_SECRET,
  GROUP_ID,
  PRINCIPAL_ID,
  SECOND_PRINCIPAL_ID,
  TENANT_ID,
  assertSafeEnvelope,
  envelope,
  group,
  json,
  memberRequest,
  targetRequest,
  tokenResponse,
} from "./test-fixtures.mjs";
import {
  EXPECTED_FUNCTION_ARN,
  FUNCTION_NAME,
  createMicrosoftGroupEgressLambda,
} from "./lambda.mjs";

const SECRET_ARN = [
  "arn:aws:secretsmanager:ap-northeast-2:770880870480:secret:",
  "lawos/production/microsoft-group-egress/app-credential-AbCd12",
].join("");

function runtimeEnv(overrides = {}) {
  return {
    AWS_REGION: "ap-northeast-2",
    AWS_LAMBDA_FUNCTION_NAME: FUNCTION_NAME,
    LAWOS_MICROSOFT_GROUP_EGRESS_PROVIDER_ENABLED: "false",
    LAWOS_MICROSOFT_GROUP_EGRESS_TENANT_ID: TENANT_ID,
    LAWOS_MICROSOFT_GROUP_EGRESS_GROUP_ID: GROUP_ID,
    LAWOS_MICROSOFT_GROUP_EGRESS_ALLOWED_PRINCIPAL_IDS_JSON:
      JSON.stringify([PRINCIPAL_ID, SECOND_PRINCIPAL_ID]),
    LAWOS_MICROSOFT_GROUP_EGRESS_CREDENTIAL_SECRET_ARN: SECRET_ARN,
    ...overrides,
  };
}

function lambdaContext(overrides = {}) {
  return {
    functionName: FUNCTION_NAME,
    functionVersion: "$LATEST",
    invokedFunctionArn: EXPECTED_FUNCTION_ARN,
    memoryLimitInMB: "256",
    ...overrides,
  };
}

class FakeGetSecretValueCommand {
  constructor(input) {
    this.input = input;
  }
}

function runtime({ env, fetch_impl, secret_response, secret_error } = {}) {
  const secretCalls = [];
  const secretClient = {
    async send(command) {
      secretCalls.push(command.input);
      if (secret_error) throw secret_error;
      return secret_response ?? {
        ARN: SECRET_ARN,
        VersionStages: ["AWSCURRENT"],
        SecretString: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
      };
    },
  };
  return {
    handler: createMicrosoftGroupEgressLambda({
      env: env ?? runtimeEnv(),
      fetch_impl,
      secret_client: secretClient,
      get_secret_value_command: FakeGetSecretValueCommand,
    }),
    secretCalls,
  };
}

test("read-only direct invocation resolves only the fixed AWSCURRENT secret", async () => {
  const calls = [];
  const { handler, secretCalls } = runtime({
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1 ? tokenResponse() : json(group());
    },
  });

  const result = await handler(
    envelope("group.target.inspect", targetRequest()),
    lambdaContext(),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(secretCalls, [{
    SecretId: SECRET_ARN,
    VersionStage: "AWSCURRENT",
  }]);
  assert.equal(calls.length, 2);
  assertSafeEnvelope(assert, result);
});

test("provider mutation is disabled by default before secret or network access", async () => {
  let fetchCalls = 0;
  const { handler, secretCalls } = runtime({
    fetch_impl: async () => { fetchCalls += 1; return tokenResponse(); },
  });

  const result = await handler(
    envelope("group.member.add", memberRequest()),
    lambdaContext(),
  );

  assert.deepEqual(result, {
    contract_version: "lawos.microsoft-group-egress.v1",
    operation: "group.member.add",
    ok: false,
    status: 503,
    error: { code: "PROVIDER_DISABLED" },
  });
  assert.equal(secretCalls.length, 0);
  assert.equal(fetchCalls, 0);
  assertSafeEnvelope(assert, result);
});

test("wrong account, region, function, qualifier, or memory fails before provider access", async () => {
  const cases = [
    [runtimeEnv({ AWS_REGION: "us-east-1" }), lambdaContext()],
    [runtimeEnv({ AWS_LAMBDA_FUNCTION_NAME: "lawos-microsoft-egress-prod" }), lambdaContext()],
    [runtimeEnv(), lambdaContext({ invokedFunctionArn: EXPECTED_FUNCTION_ARN.replace("770880870480", "000000000000") })],
    [runtimeEnv(), lambdaContext({ invokedFunctionArn: `${EXPECTED_FUNCTION_ARN}:live` })],
    [runtimeEnv(), lambdaContext({ functionVersion: "1" })],
    [runtimeEnv(), lambdaContext({ memoryLimitInMB: "512" })],
  ];
  for (const [env, context] of cases) {
    let fetchCalls = 0;
    const { handler, secretCalls } = runtime({
      env,
      fetch_impl: async () => { fetchCalls += 1; return tokenResponse(); },
    });
    const result = await handler(
      envelope("group.target.inspect", targetRequest()),
      context,
    );
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "CONTROLLER_UNAVAILABLE");
    assert.equal(secretCalls.length, 0);
    assert.equal(fetchCalls, 0);
    assertSafeEnvelope(assert, result);
  }
});

test("raw credential environment and noncanonical authority configuration fail closed", () => {
  for (const override of [
    { LAWOS_MICROSOFT_GROUP_EGRESS_CLIENT_SECRET: CLIENT_SECRET },
    { LAWOS_MICROSOFT_GROUP_EGRESS_ACCESS_TOKEN: "must-not-exist" },
    { LAWOS_MICROSOFT_GROUP_EGRESS_TENANT_ID: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA" },
    { LAWOS_MICROSOFT_GROUP_EGRESS_ALLOWED_PRINCIPAL_IDS_JSON: ` ${JSON.stringify([PRINCIPAL_ID])}` },
    { LAWOS_MICROSOFT_GROUP_EGRESS_CREDENTIAL_SECRET_ARN: "secret-ref:wrong" },
  ]) {
    assert.throws(
      () => runtime({ env: runtimeEnv(override), fetch_impl: async () => tokenResponse() }),
      /configuration is invalid/u,
    );
  }
});

test("secret drift, malformed material, and resolver failures never leak", async () => {
  const output = [];
  const original = { error: console.error, log: console.log, warn: console.warn };
  console.error = (...values) => output.push(values);
  console.log = (...values) => output.push(values);
  console.warn = (...values) => output.push(values);
  try {
    const cases = [
      { secret_response: { ARN: SECRET_ARN.replace("AbCd12", "Wrong1"), VersionStages: ["AWSCURRENT"], SecretString: "{}" } },
      { secret_response: { ARN: SECRET_ARN, VersionStages: ["AWSPREVIOUS"], SecretString: "{}" } },
      { secret_response: { ARN: SECRET_ARN, VersionStages: ["AWSCURRENT"], SecretBinary: Buffer.from("{}") } },
      { secret_response: { ARN: SECRET_ARN, VersionStages: ["AWSCURRENT"], SecretString: "{" } },
      { secret_error: new Error(`resolver leaked ${CLIENT_SECRET}`) },
    ];
    for (const options of cases) {
      let fetchCalls = 0;
      const { handler } = runtime({
        ...options,
        fetch_impl: async () => { fetchCalls += 1; return tokenResponse(); },
      });
      const result = await handler(
        envelope("group.target.inspect", targetRequest()),
        lambdaContext(),
      );
      assert.equal(result.ok, false);
      assert.equal(result.error.code, "CREDENTIAL_UNAVAILABLE");
      assert.equal(fetchCalls, 0);
      assertSafeEnvelope(assert, result, output);
    }
  } finally {
    console.error = original.error;
    console.log = original.log;
    console.warn = original.warn;
  }
  assert.deepEqual(output, []);
});
