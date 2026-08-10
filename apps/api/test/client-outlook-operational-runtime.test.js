import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
import {
  M365_GRAPH_CALLBACK_MODES,
} from "../../../packages/email-dms/src/m365-graph-connection-service.js";
import {
  MICROSOFT_EGRESS_REDIRECT_URIS,
} from "../src/microsoft-egress-broker-transport.js";
import {
  LAWOS_M365_CONFIG_SECRET_ID_ENV,
} from "../src/aws-secret-reference.js";

const REDIRECT_URI = MICROSOFT_EGRESS_REDIRECT_URIS.client;
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
const BROKER_TRANSPORT = Object.freeze({
  async oauthJwksGet() {},
  async oauthTokenExchange() {},
  async oauthTokenRefresh() {},
  async graphCalendarEventCreate() {},
  async graphMailMessageExport() {},
});
const CLIENT_REFRESH_PROOF = "C".repeat(43);
const ROTATED_CLIENT_REFRESH_PROOF = "R".repeat(43);

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
    office_sso_provider: null,
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
  const refreshCalls = [];
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
          refresh_profile: "client",
          refresh_profile_proof: CLIENT_REFRESH_PROOF,
          expires_at: "2026-08-03T10:00:00.000Z",
          granted_scopes: Object.freeze([
            "openid",
            "profile",
            ...M365_GRAPH_REQUIRED_SCOPES,
          ]),
        });
      },
      async refresh(input) {
        refreshCalls.push(input);
        return Object.freeze({
          access_token: "rotated-access-token-never-return-to-client",
          refresh_token: "rotated-refresh-token-never-return-to-client",
          refresh_profile: "client",
          refresh_profile_proof: ROTATED_CLIENT_REFRESH_PROOF,
          expires_at: "2026-08-03T11:00:00.000Z",
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
    env: enabledEnv({
      [LAWOS_M365_CONFIG_SECRET_ID_ENV]: "/lawos/test/shared-m365/config",
    }),
    secrets_client: secretsClient,
    oauth_client_factory: oauthClientFactory,
    graph_provider: graphProvider,
    microsoft_egress_transport: BROKER_TRANSPORT,
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
  assert.equal(typeof config.provider.createOwnMessageSubscription, "function");
  assert.equal(typeof config.provider.listOwnMessageDelta, "function");
  assert.equal(typeof config.provider.beginDelegatedAuthorization, "function");
  assert.equal(typeof config.provider.completeDelegatedAuthorization, "function");
  assert.equal(typeof config.provider.revokeDelegatedCredential, "function");
  assert.equal(
    typeof config.office_sso_provider.verifyAccessToken,
    "function",
  );
  assert.deepEqual(config.office_sso_provider.public_config, {
    tenant_id: SECRET_CONFIG.client_outlook.tenant_id,
    client_id: SECRET_CONFIG.client_outlook.client_id,
    api_scope: `api://${SECRET_CONFIG.client_outlook.client_id}/access_as_user`,
    callback_uri: REDIRECT_URI,
  });
  assert.equal(
    JSON.stringify(config.office_sso_provider.public_config)
      .includes(SECRET_CONFIG.client_outlook.client_secret),
    false,
  );

  const principal = {
    tenant_id: "tenant_amic_matter_vault",
    user_id: "user_jwsuh",
    entra_subject_id: "entra-subject-client-outlook",
    redirect_uri: REDIRECT_URI,
    callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
  };
  const begun = await config.provider.beginDelegatedAuthorization(principal);
  const state = new URL(begun.authorization_url).searchParams.get("state");
  assert.equal(begun.pkce_used, true);
  assert.equal(begun.state_bound, true);
  assert.equal(
    begun.callback_mode,
    M365_GRAPH_CALLBACK_MODES.server_complete,
  );
  assert.equal(
    begun.attempt_ref,
    createHash("sha256").update(state).digest("hex"),
  );
  assert.equal(typeof state, "string");
  assert.equal(state.includes(principal.entra_subject_id), false);
  assert.equal(oauthFactoryCalls.length, 1);
  assert.equal(
    oauthFactoryCalls[0].scope_profile,
    "client_outlook_addin",
  );
  assert.equal(
    oauthFactoryCalls[0].microsoft_egress_transport,
    BROKER_TRANSPORT,
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

  assert.deepEqual(
    config.provider.resolveDelegatedAuthorizationState({
      state,
      redirect_uri: REDIRECT_URI,
    }),
    {
      tenant_id: principal.tenant_id,
      user_id: principal.user_id,
      entra_subject_id: principal.entra_subject_id,
      redirect_uri: REDIRECT_URI,
      callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
    },
  );

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
  assert.equal(completed.token_bundle.refresh_profile, "client");
  assert.equal(
    completed.token_bundle.refresh_profile_proof,
    CLIENT_REFRESH_PROOF,
  );
  const refreshed = await config.provider.refreshDelegatedCredential({
    credential: {
      ...completed.token_bundle,
      mailbox_address: completed.mailbox_address,
    },
  });
  assert.deepEqual(refreshCalls, [{
    refresh_token: "refresh-token-never-return-to-client",
    refresh_profile: "client",
    refresh_profile_proof: CLIENT_REFRESH_PROOF,
  }]);
  assert.equal(
    refreshed.token_bundle.access_token,
    "rotated-access-token-never-return-to-client",
  );
  assert.equal(
    refreshed.token_bundle.refresh_profile_proof,
    ROTATED_CLIENT_REFRESH_PROOF,
  );
});

test("Client Outlook Lambda config falls back to the shared M365 JSON Secret", async () => {
  const secretCalls = [];
  const env = enabledEnv({
    [LAWOS_M365_CONFIG_SECRET_ID_ENV]: SECRET_ID,
  });
  delete env[LAWOS_CLIENT_OUTLOOK_M365_CONFIG_SECRET_ID_ENV];

  const config = await resolveLambdaClientOutlookM365GraphConfig({
    env,
    secrets_client: {
      async send(command) {
        secretCalls.push(command);
        return { SecretString: JSON.stringify(SECRET_CONFIG) };
      },
    },
    microsoft_egress_transport: BROKER_TRANSPORT,
  });

  assert.equal(secretCalls.length, 1);
  assert.deepEqual(secretCalls[0].input, { SecretId: SECRET_ID });
  assert.equal(config.feature_enabled, true);
  assert.equal(config.inquiry_feature_enabled, true);
  assert.equal(config.provider_runtime_enabled, true);
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

  await assert.rejects(
    resolveLambdaClientOutlookM365GraphConfig({
      env: enabledEnv(),
      secrets_client: {
        async send() {
          return {
            SecretString: JSON.stringify({
              client_outlook: {
                ...SECRET_CONFIG.client_outlook,
                redirect_uris: [
                  "https://example.invalid/api/outlook/connection/callback",
                ],
              },
            }),
          };
        },
      },
      microsoft_egress_transport: BROKER_TRANSPORT,
    }),
    /redirect_uris must match the client broker profile/u,
  );
});

test("10인 내부 파일럿은 People과 Client가 같은 Entra 앱 ID를 사용해도 Client scope profile을 유지한다", async () => {
  const resolved = await resolveLambdaClientOutlookM365GraphConfig({
    env: enabledEnv(),
    secrets_client: {
      async send() {
        return {
          SecretString: JSON.stringify({
            ...SECRET_CONFIG,
            people_outlook: {
              client_id: SECRET_CONFIG.client_outlook.client_id.toUpperCase(),
            },
          }),
        };
      },
    },
    microsoft_egress_transport: BROKER_TRANSPORT,
  });

  assert.equal(resolved.provider.provider, "microsoft-graph-delegated");
  assert.equal(
    resolved.office_sso_provider.public_config.client_id,
    SECRET_CONFIG.client_outlook.client_id,
  );
  const begun = await resolved.provider.beginDelegatedAuthorization({
    tenant_id: "tenant_amic_matter_vault",
    user_id: "user_jwsuh",
    entra_subject_id: "entra-subject-client-outlook",
    redirect_uri: REDIRECT_URI,
  });
  const authorizeUrl = new URL(begun.authorization_url);
  const scopes = authorizeUrl.searchParams.get("scope").split(" ");
  assert.equal(
    authorizeUrl.searchParams.get("client_id"),
    SECRET_CONFIG.client_outlook.client_id,
  );
  assert.equal(scopes.includes("Calendars.ReadWrite"), true);
  assert.equal(scopes.includes("Mail.Read"), true);
  assert.equal(scopes.includes("Calendars.ReadBasic"), false);
});
