import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { M365_GRAPH_REQUIRED_SCOPES } from "../../../packages/email-dms/src/m365-connection-model.js";
import { M365_GRAPH_CALLBACK_MODES } from "../../../packages/email-dms/src/m365-graph-connection-service.js";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";

const TENANT = "tenant_outlook_connection_api";
const USER = "user_outlook_connection_api";
const SUBJECT = "entra_subject_outlook_connection_api";
const REDIRECT_URI =
  "https://app.example.invalid/api/outlook/connection/callback";

function permissionContext({ allowed = true, subject = SUBJECT } = {}) {
  return {
    principal: {
      ok: true,
      source: "api-signed-session",
      header_only_trust_allowed: false,
      tenant_id: TENANT,
      user_id: USER,
      entra_subject_id: subject,
      role_ids: ["lawos_staff"],
    },
    rules: allowed
      ? [{
        id: "outlook-connection-manage",
        effect: "allow",
        action_prefix: "outlook:connection:",
      }]
      : [],
    object_acl: [],
  };
}

function graphConfig() {
  const credentials = new Map();
  const calls = [];
  let completionCount = 0;
  let authorizationCount = 0;
  return {
    calls,
    get completion_count() {
      return completionCount;
    },
    config: {
      feature_enabled: true,
      provider_runtime_enabled: true,
      allowed_redirect_uris: [REDIRECT_URI],
      clock: () => new Date("2026-07-30T06:00:00.000Z"),
      external_readiness: {},
      credential_vault: {
        referenceForGeneration({
          entra_subject_id,
          credential_generation,
        }) {
          return `aws-secrets-manager:synthetic/outlook-connection-api/${entra_subject_id}/${credential_generation}`;
        },
        async storeDelegatedCredential({
          token_bundle,
          credential_ref,
          credential_generation,
          entra_subject_id,
        }) {
          const reference = credential_ref
            ?? this.referenceForGeneration({
              entra_subject_id,
              credential_generation,
            });
          if (!credentials.has(reference)) {
            credentials.set(reference, structuredClone(token_bundle));
          }
          return reference;
        },
        async resolveDelegatedCredential({ credential_ref }) {
          if (!credentials.has(credential_ref)) {
            throw Object.assign(new Error("credential not found"), {
              name: "ResourceNotFoundException",
            });
          }
          return structuredClone(credentials.get(credential_ref));
        },
        async deleteDelegatedCredential({ credential_ref }) {
          calls.push("credential_deleted");
          credentials.delete(credential_ref);
        },
      },
      provider: {
        async beginDelegatedAuthorization(input) {
          authorizationCount += 1;
          const state = authorizationCount === 1
            ? "api-test-state"
            : `api-test-state-${authorizationCount}`;
          return {
            authorization_url:
              `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?state=${state}`,
            attempt_ref: createHash("sha256").update(state).digest("hex"),
            callback_mode: input.callback_mode,
            expires_at: "2026-07-30T06:10:00.000Z",
            pkce_used: true,
            state_bound: true,
          };
        },
        async completeDelegatedAuthorization() {
          completionCount += 1;
          return {
            authorization_attempt_consumed: true,
            entra_subject_id: SUBJECT,
            mailbox_address: "api.synthetic@example.invalid",
            granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
            consented_at: "2026-07-30T06:00:00.000Z",
            expires_at: "2026-08-30T06:00:00.000Z",
            token_bundle: {
              access_token: "api-test-access-token-never-return",
              refresh_token: "api-test-refresh-token-never-return",
              refresh_profile: "client",
              refresh_profile_proof: "c".repeat(43),
              expires_at: "2026-08-30T06:00:00.000Z",
              granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
            },
          };
        },
        async revokeDelegatedCredential() {
          calls.push("provider_revoked");
          return { revoked: true };
        },
      },
    },
  };
}

async function request({
  pathname,
  method,
  query = {},
  body = {},
  headers = {},
  context = permissionContext(),
  runtime,
}) {
  return handleOutlookAddinApiRequest({
    pathname,
    method,
    query,
    body,
    headers,
    context,
    requestId: `req_${method}_${pathname}`,
    runtime,
  });
}

test("CL-P3-W00-T01 Outlook 연결 API는 PKCE 시작·본인 연결·조회·provider 우선 해제를 안전하게 처리한다", async () => {
  const repository = createEmailDmsRepository();
  const graph = graphConfig();
  const runtime = {
    emailDmsRuntime: { repository },
    m365GraphConfig: graph.config,
  };

  const before = await request({
    pathname: "/api/outlook/connection",
    method: "GET",
    query: { tenant_id: TENANT },
    runtime,
  });
  assert.equal(before.status, 200);
  assert.equal(before.body.item.connection.status, "not_connected");
  assert.equal(before.body.item.release_readiness.status, "blocked");

  const authorize = await request({
    pathname: "/api/outlook/connection/authorize",
    method: "POST",
    body: {
      actor_id: USER,
      tenant_id: TENANT,
      redirect_uri: REDIRECT_URI,
    },
    headers: {
      "x-lawos-outlook-callback-mode": M365_GRAPH_CALLBACK_MODES.server_complete,
    },
    runtime,
  });
  assert.equal(authorize.status, 200);
  assert.equal(authorize.body.outcome, "authorization_started");
  assert.equal(authorize.body.item.pkce_used, true);
  assert.equal(
    authorize.body.item.callback_mode,
    M365_GRAPH_CALLBACK_MODES.server_complete,
  );

  const pendingAttempt = await request({
    pathname: "/api/outlook/connection",
    method: "GET",
    query: { attempt_ref: authorize.body.item.attempt_ref },
    runtime,
  });
  assert.equal(
    pendingAttempt.body.item.authorization_attempt.status,
    "pending",
  );

  const callback = await request({
    pathname: "/api/outlook/connection/complete",
    method: "POST",
    body: {
      actor_id: USER,
      tenant_id: TENANT,
      code: "api-test-code",
      state: "api-test-state",
      redirect_uri: REDIRECT_URI,
    },
    runtime,
  });
  assert.equal(callback.status, 200);
  assert.equal(callback.body.outcome, "connected");
  assert.equal(callback.body.item.connection.status, "connected");
  const callbackText = JSON.stringify(callback.body);
  assert.equal(callbackText.includes("api-test-access-token"), false);
  assert.equal(callbackText.includes("api-test-refresh-token"), false);
  assert.equal(callbackText.includes("credential_ref"), false);

  const callbackReplay = await request({
    pathname: "/api/outlook/connection/complete",
    method: "POST",
    body: {
      tenant_id: TENANT,
      code: "api-test-code-must-not-be-reused",
      state: "api-test-state",
      redirect_uri: REDIRECT_URI,
    },
    runtime,
  });
  assert.equal(callbackReplay.status, 200);
  assert.equal(callbackReplay.body.item.replayed, true);
  assert.equal(graph.completion_count, 1);

  const completedAttempt = await request({
    pathname: "/api/outlook/connection",
    method: "GET",
    query: { attempt_ref: authorize.body.item.attempt_ref },
    runtime,
  });
  assert.equal(
    completedAttempt.body.item.authorization_attempt.status,
    "complete",
  );

  const secondAuthorize = await request({
    pathname: "/api/outlook/connection/authorize",
    method: "POST",
    body: {
      tenant_id: TENANT,
      redirect_uri: REDIRECT_URI,
    },
    headers: {
      "x-lawos-outlook-callback-mode": M365_GRAPH_CALLBACK_MODES.server_complete,
    },
    runtime,
  });
  const secondAttempt = await request({
    pathname: "/api/outlook/connection",
    method: "GET",
    query: { attempt_ref: secondAuthorize.body.item.attempt_ref },
    runtime,
  });
  assert.equal(secondAttempt.body.item.connection.status, "connected");
  assert.equal(
    secondAttempt.body.item.authorization_attempt.status,
    "pending",
  );

  const publicCallback = await request({
    pathname: "/api/outlook/connection/callback",
    method: "GET",
    query: {
      tenant_id: TENANT,
      code: "api-test-code",
      state: "api-test-state",
      redirect_uri: REDIRECT_URI,
    },
    runtime,
  });
  assert.equal(publicCallback.status, 404);
  assert.deepEqual(
    publicCallback.body.safe_error_codes,
    ["OUTLOOK_ADDIN_NOT_FOUND"],
  );

  const connected = await request({
    pathname: "/api/outlook/connection",
    method: "GET",
    runtime,
  });
  assert.equal(connected.body.item.connection.state_version, 1);
  assert.equal(connected.body.item.shared_mailbox_enabled, false);
  assert.equal(
    connected.body.item.automatic_mailbox_scan_enabled,
    false,
  );

  const deleted = await request({
    pathname: "/api/outlook/connection",
    method: "DELETE",
    query: {
      expected_state_version: "1",
      reason: "사용자 연결 해제",
    },
    runtime,
  });
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.outcome, "disconnected");
  assert.equal(deleted.body.item.connection.status, "revoked");
  assert.deepEqual(graph.calls, ["provider_revoked"]);

  const cleanupRetry = await request({
    pathname: "/api/outlook/connection",
    method: "DELETE",
    query: {
      expected_state_version: "1",
      reason: "사용자 연결 해제 재시도",
    },
    runtime,
  });
  assert.equal(cleanupRetry.status, 200);
  assert.equal(cleanupRetry.body.outcome, "already_disconnected");
  assert.deepEqual(graph.calls, [
    "provider_revoked",
    "credential_deleted",
    "credential_deleted",
  ]);
});

test("CL-P3-W00-T01 Outlook 연결 API는 권한·tenant·Entra subject 누락을 fail-closed로 처리한다", async () => {
  const runtime = {
    emailDmsRuntime: { repository: createEmailDmsRepository() },
    m365GraphConfig: graphConfig().config,
  };
  const denied = await request({
    pathname: "/api/outlook/connection",
    method: "GET",
    context: permissionContext({ allowed: false }),
    runtime,
  });
  assert.equal(denied.status, 403);
  assert.equal(
    denied.body.safe_error_codes[0],
    "OUTLOOK_ADDIN_PERMISSION_DENIED",
  );

  const crossTenant = await request({
    pathname: "/api/outlook/connection",
    method: "GET",
    query: { tenant_id: "tenant-forged" },
    runtime,
  });
  assert.equal(crossTenant.status, 403);
  assert.equal(
    crossTenant.body.safe_error_codes[0],
    "M365_CONNECTION_TENANT_MISMATCH",
  );

  const noEntra = await request({
    pathname: "/api/outlook/connection",
    method: "GET",
    context: permissionContext({ subject: null }),
    runtime,
  });
  assert.equal(noEntra.status, 403);
  assert.equal(
    noEntra.body.safe_error_codes[0],
    "M365_ENTRA_SESSION_REQUIRED",
  );
});

test("Client Outlook 연결 완료는 POST body만 받고 잘못된 callback 입력을 재사용하지 않는다", async () => {
  const runtime = {
    emailDmsRuntime: { repository: createEmailDmsRepository() },
    m365GraphConfig: graphConfig().config,
  };

  const missingCode = await request({
    pathname: "/api/outlook/connection/complete",
    method: "POST",
    body: {
      tenant_id: TENANT,
      state: "api-test-state",
      redirect_uri: REDIRECT_URI,
    },
    runtime,
  });
  assert.equal(missingCode.status, 400);
  assert.equal(
    missingCode.body.safe_error_codes[0],
    "M365_CONNECTION_VALIDATION_ERROR",
  );
  assert.equal(JSON.stringify(missingCode.body).includes("token"), false);

  const queryOnly = await request({
    pathname: "/api/outlook/connection/complete",
    method: "POST",
    query: {
      tenant_id: TENANT,
      code: "query-code-must-not-be-read",
      state: "query-state-must-not-be-read",
      redirect_uri: REDIRECT_URI,
    },
    runtime,
  });
  assert.equal(queryOnly.status, 400);
  assert.equal(JSON.stringify(queryOnly.body).includes("query-code"), false);

  const extraField = await request({
    pathname: "/api/outlook/connection/complete",
    method: "POST",
    body: {
      code: "api-test-code",
      state: "api-test-state",
      redirect_uri: REDIRECT_URI,
      access_token: "caller-supplied-token-must-be-rejected",
    },
    runtime,
  });
  assert.equal(extraField.status, 400);
  assert.equal(
    extraField.body.safe_error_codes[0],
    "M365_CONNECTION_VALIDATION_ERROR",
  );
  assert.equal(
    JSON.stringify(extraField.body).includes("caller-supplied-token"),
    false,
  );

  const authorizeExtraField = await request({
    pathname: "/api/outlook/connection/authorize",
    method: "POST",
    body: {
      redirect_uri: REDIRECT_URI,
      client_secret: "caller-supplied-secret-must-be-rejected",
    },
    runtime,
  });
  assert.equal(authorizeExtraField.status, 400);
  assert.equal(
    authorizeExtraField.body.safe_error_codes[0],
    "M365_CONNECTION_VALIDATION_ERROR",
  );
  assert.equal(
    JSON.stringify(authorizeExtraField.body).includes("caller-supplied-secret"),
    false,
  );

  const forgedTenant = await request({
    pathname: "/api/outlook/connection/complete",
    method: "POST",
    body: {
      tenant_id: "tenant-forged",
      code: "forged-code",
      state: "forged-state",
      redirect_uri: REDIRECT_URI,
    },
    runtime,
  });
  assert.equal(forgedTenant.status, 403);
  assert.equal(
    forgedTenant.body.safe_error_codes[0],
    "M365_CONNECTION_TENANT_MISMATCH",
  );
});
