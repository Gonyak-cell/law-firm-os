import assert from "node:assert/strict";
import test from "node:test";

import {
  LAWOS_CLIENT_OUTLOOK_INQUIRY_ENABLED_ENV,
  LAWOS_CLIENT_OUTLOOK_M365_CONFIG_SECRET_ID_ENV,
  LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED_ENV,
  LAWOS_CLIENT_OUTLOOK_PROVIDER_RUNTIME_ENABLED_ENV,
  resolveLambdaClientOutlookM365GraphConfig,
} from "../src/client-outlook-operational-runtime.js";
import {
  M365_GRAPH_REQUIRED_SCOPES,
} from "../../../packages/email-dms/src/m365-connection-model.js";

const REDIRECT_URI =
  "https://pilot.example.invalid/api/outlook/connection/callback";
const SECRET_ID = "/lawos/test/client-outlook/config";
const SECRET_CONFIG = Object.freeze({
  client_outlook: Object.freeze({
    tenant_id: "11111111-1111-4111-8111-111111111111",
    client_id: "22222222-2222-4222-8222-222222222222",
    client_secret: "client-outlook-secret-never-return",
    redirect_uris: Object.freeze([REDIRECT_URI]),
    state_encryption_key: Buffer.alloc(32, 7).toString("base64"),
    credential_secret_prefix: "/lawos/test/client-outlook/delegated",
  }),
});

function enabledEnv(overrides = {}) {
  return {
    AWS_REGION: "ap-northeast-2",
    [LAWOS_CLIENT_OUTLOOK_M365_CONFIG_SECRET_ID_ENV]: SECRET_ID,
    [LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED_ENV]: "true",
    [LAWOS_CLIENT_OUTLOOK_INQUIRY_ENABLED_ENV]: "true",
    [LAWOS_CLIENT_OUTLOOK_PROVIDER_RUNTIME_ENABLED_ENV]: "true",
    ...overrides,
  };
}

test("Client Outlook Lambda config keeps disabled flags local and rejects an impossible gate order", async () => {
  let secretCalls = 0;
  const secretsClient = {
    async send() {
      secretCalls += 1;
      throw new Error("disabled runtime must not resolve a secret");
    },
  };

  assert.equal(await resolveLambdaClientOutlookM365GraphConfig({
    env: {},
    secrets_client: secretsClient,
  }), null);

  const providerOff = await resolveLambdaClientOutlookM365GraphConfig({
    env: {
      [LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED_ENV]: "true",
      [LAWOS_CLIENT_OUTLOOK_INQUIRY_ENABLED_ENV]: "true",
    },
    secrets_client: secretsClient,
  });
  assert.deepEqual(providerOff, {
    feature_enabled: true,
    inquiry_feature_enabled: true,
    provider_runtime_enabled: false,
    allowed_redirect_uris: [],
    external_readiness: {},
  });
  assert.equal(secretCalls, 0);

  await assert.rejects(
    resolveLambdaClientOutlookM365GraphConfig({
      env: {
        [LAWOS_CLIENT_OUTLOOK_INQUIRY_ENABLED_ENV]: "true",
      },
    }),
    new RegExp(LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED_ENV),
  );
  await assert.rejects(
    resolveLambdaClientOutlookM365GraphConfig({
      env: {
        [LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED_ENV]: "yes",
      },
    }),
    new RegExp(`${LAWOS_CLIENT_OUTLOOK_M365_GRAPH_ENABLED_ENV} must be true or false`),
  );
});

test("Client Outlook Lambda config resolves its independent app secret and wires OAuth, Graph, and the credential vault", async () => {
  const secretCalls = [];
  const oauthFactoryCalls = [];
  const exchangeCalls = [];
  const clock = () => new Date("2026-08-03T09:00:00.000Z");
  const secretsClient = {
    async send(command) {
      secretCalls.push(command);
      assert.equal(command.constructor.name, "GetSecretValueCommand");
      assert.deepEqual(command.input, { SecretId: SECRET_ID });
      return { SecretString: JSON.stringify(SECRET_CONFIG) };
    },
  };
  const oauthClientFactory = (options) => {
    oauthFactoryCalls.push(options);
    return Object.freeze({
      authorizationUrl(input) {
        const url = new URL(
          "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize",
        );
        url.searchParams.set("state", input.state);
        url.searchParams.set("nonce", input.nonce);
        url.searchParams.set("code_challenge", input.code_challenge);
        return url.toString();
      },
      async exchange(input) {
        exchangeCalls.push(input);
        return Object.freeze({
          provider_subject_id: "entra-subject-client-outlook",
          mailbox_address: "pilot.user@amic.kr",
          access_token: "access-token-never-return-to-client",
          refresh_token: "refresh-token-never-return-to-client",
          expires_at: "2026-08-03T10:00:00.000Z",
          granted_scopes: Object.freeze([
            "openid",
            "profile",
            ...M365_GRAPH_REQUIRED_SCOPES,
          ]),
        });
      },
    });
  };
  const graphProvider = Object.freeze({
    async getMeMessageMime() {},
    async createMeCalendarEvent() {},
  });

  const config = await resolveLambdaClientOutlookM365GraphConfig({
    env: enabledEnv(),
    secrets_client: secretsClient,
    oauth_client_factory: oauthClientFactory,
    graph_provider: graphProvider,
    clock,
  });

  assert.equal(secretCalls.length, 1);
  assert.equal(config.feature_enabled, true);
  assert.equal(config.inquiry_feature_enabled, true);
  assert.equal(config.provider_runtime_enabled, true);
  assert.deepEqual(config.allowed_redirect_uris, [REDIRECT_URI]);
  assert.equal(config.credential_vault.provider, "aws-secrets-manager");
  assert.equal(typeof config.provider.getMeMessageMime, "function");
  assert.equal(typeof config.provider.createMeCalendarEvent, "function");
  assert.equal(typeof config.provider.beginDelegatedAuthorization, "function");
  assert.equal(typeof config.provider.completeDelegatedAuthorization, "function");
  assert.equal(typeof config.provider.revokeDelegatedCredential, "function");

  const principal = {
    tenant_id: "tenant_amic_matter_vault",
    user_id: "user_jwsuh",
    entra_subject_id: "entra-subject-client-outlook",
    redirect_uri: REDIRECT_URI,
  };
  const begun = await config.provider.beginDelegatedAuthorization(principal);
  const state = new URL(begun.authorization_url).searchParams.get("state");
  assert.equal(begun.pkce_used, true);
  assert.equal(begun.state_bound, true);
  assert.equal(typeof state, "string");
  assert.equal(state.includes(principal.entra_subject_id), false);
  assert.equal(oauthFactoryCalls.length, 1);
  assert.equal(
    oauthFactoryCalls[0].scope_profile,
    "client_outlook_addin",
  );
  assert.equal(
    oauthFactoryCalls[0].config.client_id,
    SECRET_CONFIG.client_outlook.client_id,
  );

  await assert.rejects(
    config.provider.completeDelegatedAuthorization({
      ...principal,
      entra_subject_id: "another-entra-subject",
      code: "authorization-code-must-not-be-used",
      state,
    }),
    /does not match the signed session/u,
  );
  assert.equal(exchangeCalls.length, 0);

  const completed = await config.provider.completeDelegatedAuthorization({
    ...principal,
    code: "authorization-code-once",
    state,
  });
  assert.equal(completed.authorization_attempt_consumed, true);
  assert.equal(completed.entra_subject_id, principal.entra_subject_id);
  assert.equal(completed.mailbox_address, "pilot.user@amic.kr");
  assert.deepEqual(completed.granted_scopes, M365_GRAPH_REQUIRED_SCOPES);
  assert.equal(exchangeCalls.length, 1);
  assert.equal(
    exchangeCalls[0].expected_subject_id,
    principal.entra_subject_id,
  );
  assert.equal(
    JSON.stringify(completed).includes("client-outlook-secret-never-return"),
    false,
  );
});

test("Client Outlook provider refuses the separate People calendar secret shape", async () => {
  await assert.rejects(
    resolveLambdaClientOutlookM365GraphConfig({
      env: enabledEnv(),
      secrets_client: {
        async send() {
          return {
            SecretString: JSON.stringify({
              people_outlook: SECRET_CONFIG.client_outlook,
            }),
          };
        },
      },
    }),
    /client_outlook secret configuration is required/u,
  );
});
