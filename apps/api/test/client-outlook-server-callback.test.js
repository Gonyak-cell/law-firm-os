import assert from "node:assert/strict";
import test from "node:test";

import { M365_GRAPH_REQUIRED_SCOPES } from "../../../packages/email-dms/src/m365-connection-model.js";
import { M365_GRAPH_CALLBACK_MODES } from "../../../packages/email-dms/src/m365-graph-connection-service.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { createClientOutlookM365GraphConfig } from "../src/client-outlook-operational-runtime.js";
import { MICROSOFT_EGRESS_REDIRECT_URIS } from "../src/microsoft-egress-broker-transport.js";
import { runWithRequestFailureCompensation } from "../src/postgres-api-runtime-authority.js";
import { createApiServer } from "../src/server.js";

const AUTHORIZATION_CODE = "0.ABC_client-outlook-code";
const REDIRECT_URI = MICROSOFT_EGRESS_REDIRECT_URIS.client;
const PRINCIPAL = Object.freeze({
  tenant_id: "tenant_callback_server_complete",
  user_id: "user_callback_server_complete",
  entra_subject_id: "subject_callback_server_complete",
  redirect_uri: REDIRECT_URI,
});

async function createCallbackFixture({ failAfterCommand = false } = {}) {
  const repository = createEmailDmsRepository();
  const credentials = new Map();
  const runtimeAuthorityTenants = [];
  const verifiedPrincipals = [];
  let exchangeCount = 0;
  let now = new Date("2026-08-06T01:00:00.000Z");
  const graphConfig = createClientOutlookM365GraphConfig({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: "callback-test-secret-never-return",
      redirect_uris: [REDIRECT_URI],
      state_encryption_key: Buffer.alloc(32, 19).toString("base64"),
      credential_secret_prefix: "/lawos/test/client-outlook/delegated",
    },
    flags: {
      feature_enabled: true,
      inquiry_feature_enabled: true,
      provider_runtime_enabled: true,
    },
    credential_vault: {
      async storeDelegatedCredential({ credential_ref, token_bundle }) {
        const reference = credential_ref ?? "aws-secrets-manager:test/client-outlook";
        credentials.set(reference, structuredClone(token_bundle));
        return reference;
      },
      async resolveDelegatedCredential({ credential_ref }) {
        return structuredClone(credentials.get(credential_ref));
      },
      async deleteDelegatedCredential({ credential_ref }) {
        credentials.delete(credential_ref);
      },
    },
    oauth_client_factory: () => ({
      authorizationUrl({ state }) {
        const url = new URL("https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize");
        url.searchParams.set("state", state);
        return url.toString();
      },
      async exchange() {
        exchangeCount += 1;
        return {
          provider_subject_id: PRINCIPAL.entra_subject_id,
          mailbox_address: "pilot.user@amic.kr",
          access_token: "callback-access-token-never-return",
          refresh_token: "callback-refresh-token-never-return",
          refresh_profile: "client",
          refresh_profile_proof: "C".repeat(43),
          expires_at: new Date(now.getTime() + 60 * 60_000).toISOString(),
          granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
        };
      },
      async refresh() {},
    }),
    graph_provider: {},
    microsoft_egress_transport: { async oauthJwksGet() {} },
    clock: () => now,
  });
  const server = createApiServer({
    emailDmsRuntime: { repository },
    m365GraphConfig: graphConfig,
    sessionAuth: {
      async resolvePermissionContextFromHeaders() {
        return { ok: false, authorization_present: false };
      },
      async verifyOutlookCallbackPrincipal(input) {
        verifiedPrincipals.push(structuredClone(input));
        return input.tenant_id === PRINCIPAL.tenant_id
          && input.user_id === PRINCIPAL.user_id
          && input.entra_subject_id === PRINCIPAL.entra_subject_id
          ? { ok: true }
          : { ok: false, status: 403 };
      },
    },
    requestRuntimeAuthority: {
      capabilities: Object.freeze({ provider: "callback-test" }),
      async run({ tenant_id, command }) {
        runtimeAuthorityTenants.push(tenant_id);
        return runWithRequestFailureCompensation(async (
          requestFailureCompensator,
        ) => {
          const result = await command({
            emailDmsRuntime: {
              repository,
              request_failure_compensator: requestFailureCompensator,
            },
          });
          if (failAfterCommand) {
            throw Object.assign(new Error("synthetic outer domain flush failure"), {
              safe_error_code: "DOMAIN_BASELINE_CONFLICT",
            });
          }
          return result;
        });
      },
    },
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    repository,
    graphConfig,
    runtimeAuthorityTenants,
    verifiedPrincipals,
    get exchangeCount() { return exchangeCount; },
    get credentialCount() { return credentials.size; },
    setNow(value) { now = new Date(value); },
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    async close() {
      server.closeAllConnections?.();
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

async function beginAuthorization(graphConfig) {
  const started = await graphConfig.provider.beginDelegatedAuthorization({
    ...PRINCIPAL,
    callback_mode: M365_GRAPH_CALLBACK_MODES.server_complete,
  });
  return new URL(started.authorization_url).searchParams.get("state");
}

function callbackUrl(fixture, state) {
  const callback = new URL("/api/outlook/connection/callback", fixture.baseUrl);
  callback.search = new URLSearchParams({ code: AUTHORIZATION_CODE, state }).toString();
  return callback;
}

function repositoryConnectionStatus(repository) {
  const [connection] = repository.list({
    tenant_id: PRINCIPAL.tenant_id,
    model_type: "M365Connection",
  });
  return connection?.revoked_at ? "revoked" : connection ? "connected" : "not_connected";
}

test("Client Outlook HTTPS callback completes on the server and safely replays", async () => {
  const fixture = await createCallbackFixture();
  try {
    const state = await beginAuthorization(fixture.graphConfig);
    const callback = callbackUrl(fixture, state);
    const response = await fetch(callback, { redirect: "manual" });
    const location = response.headers.get("location");

    assert.equal(response.status, 302);
    assert.equal(new URL(location).hash, "#status=connected");
    assert.equal(location.includes(AUTHORIZATION_CODE), false);
    assert.equal(location.includes(state), false);
    assert.equal(fixture.exchangeCount, 1);
    assert.equal(repositoryConnectionStatus(fixture.repository), "connected");
    assert.deepEqual(fixture.runtimeAuthorityTenants, [PRINCIPAL.tenant_id]);
    assert.equal(fixture.verifiedPrincipals.length, 1);

    const replay = await fetch(callback, { redirect: "manual" });
    assert.equal(replay.status, 302);
    assert.equal(new URL(replay.headers.get("location")).hash, "#status=connected");
    assert.equal(fixture.exchangeCount, 1);
    assert.deepEqual(fixture.runtimeAuthorityTenants, [PRINCIPAL.tenant_id, PRINCIPAL.tenant_id]);
    assert.equal(fixture.verifiedPrincipals.length, 2);
  } finally {
    await fixture.close();
  }
});

test("Client Outlook 서버 callback은 바깥 domain flush 실패 시 새 credential을 정리한다", async () => {
  const fixture = await createCallbackFixture({ failAfterCommand: true });
  try {
    const state = await beginAuthorization(fixture.graphConfig);
    const response = await fetch(callbackUrl(fixture, state), {
      redirect: "manual",
    });

    assert.equal(response.status, 500);
    assert.equal(fixture.exchangeCount, 1);
    assert.equal(fixture.credentialCount, 0);
  } finally {
    await fixture.close();
  }
});

test("Client Outlook callback keeps mode-less legacy state on messageParent completion", async () => {
  const fixture = await createCallbackFixture();
  try {
    const started = await fixture.graphConfig.provider.beginDelegatedAuthorization(PRINCIPAL);
    const state = new URL(started.authorization_url).searchParams.get("state");
    const response = await fetch(callbackUrl(fixture, state), { redirect: "manual" });
    const fragment = new URLSearchParams(new URL(response.headers.get("location")).hash.slice(1));

    assert.equal(started.callback_mode, M365_GRAPH_CALLBACK_MODES.legacy);
    assert.equal(response.status, 302);
    assert.equal(fragment.get("code"), AUTHORIZATION_CODE);
    assert.equal(fragment.get("state"), state);
    assert.equal(fragment.has("status"), false);
    assert.equal(fixture.exchangeCount, 0);
    assert.deepEqual(fixture.runtimeAuthorityTenants, []);
    assert.deepEqual(fixture.verifiedPrincipals, []);
  } finally {
    await fixture.close();
  }
});

test("Client Outlook HTTPS callback rejects invalid and expired state before exchange", async () => {
  const fixture = await createCallbackFixture();
  try {
    const state = await beginAuthorization(fixture.graphConfig);
    fixture.setNow("2026-08-06T01:11:00.000Z");
    const expiredResponse = await fetch(callbackUrl(fixture, state), { redirect: "manual" });
    const invalidResponse = await fetch(callbackUrl(fixture, "v1.invalid.invalid.invalid"), {
      redirect: "manual",
    });

    assert.equal(new URL(expiredResponse.headers.get("location")).hash, "#status=failed");
    assert.equal(new URL(invalidResponse.headers.get("location")).hash, "#status=failed");
    assert.equal(fixture.exchangeCount, 0);
    assert.deepEqual(fixture.runtimeAuthorityTenants, []);
    assert.equal(repositoryConnectionStatus(fixture.repository), "not_connected");
    assert.equal(expiredResponse.headers.get("location").includes(AUTHORIZATION_CODE), false);
    assert.equal(invalidResponse.headers.get("location").includes("v1.invalid"), false);
  } finally {
    await fixture.close();
  }
});
