import assert from "node:assert/strict";
import test from "node:test";

import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { createInMemoryHrxRepository } from "../../../packages/hrx/src/repository.js";
import {
  PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX,
} from "../../../packages/email-dms/src/people-outlook-connection-model.js";
import {
  LAWOS_PEOPLE_OUTLOOK_M365_CONFIG_SECRET_ID_ENV,
  createPeopleOutlookOperationalRuntimeFactory,
  createPeopleOutlookOperationalRuntimeFactoryFromSecretReference,
  resolveLambdaPeopleOutlookRuntimeFactory,
} from "../src/people-outlook-operational-runtime.js";
import {
  createHrxRuntimeContext,
  handleHrxApiRequest,
} from "../src/hrx-runtime-context.js";
import {
  LAWOS_M365_CONFIG_SECRET_ID_ENV,
} from "../src/aws-secret-reference.js";
import {
  MICROSOFT_EGRESS_REDIRECT_URIS,
} from "../src/microsoft-egress-broker-transport.js";
import {
  isPeopleOutlookOAuthState,
} from "../src/people-outlook-oauth-callback.js";

const TENANT = "tenant-people-outlook-operational";
const EMPLOYEE = "emp-jwsuh";
const USER = "user-jwsuh";
const NOW = Date.parse("2026-08-03T00:30:00.000Z");
const ACCESS_TOKEN = "operational-access-token-never-persist";
const REFRESH_TOKEN = "operational-refresh-token-never-persist";
const CLIENT_SECRET = "people-outlook-client-secret-never-return";

function brokerTransport(calendarViewList = async () => ({ events: [] })) {
  return Object.freeze({
    async oauthJwksGet() {
      throw new Error("OAuth signing keys are outside this test");
    },
    async oauthTokenExchange() {
      throw new Error("OAuth exchange is outside this test");
    },
    async oauthTokenRefresh() {
      throw new Error("OAuth refresh is outside this test");
    },
    graphCalendarViewList: calendarViewList,
  });
}

function dependencies({
  expiresAt = "2026-08-03T01:30:00.000Z",
  refreshResult = null,
  refreshError = null,
} = {}) {
  let exchangeInput;
  let exchangeCount = 0;
  let refreshCount = 0;
  const oauthClient = {
    authorizationUrl({ state, code_challenge, nonce, login_hint }) {
      assert.equal(isPeopleOutlookOAuthState(state), true);
      assert.match(code_challenge, /^[A-Za-z0-9_-]{43}$/u);
      assert.match(nonce, /^[A-Za-z0-9_-]{43}$/u);
      const url = new URL(
        "https://login.microsoftonline.com/11111111-1111-4111-8111-111111111111/oauth2/v2.0/authorize",
      );
      url.searchParams.set("state", state);
      url.searchParams.set("login_hint", login_hint);
      return url.toString();
    },
    async exchange(input) {
      exchangeCount += 1;
      exchangeInput = input;
      return {
        provider_subject_id: "entra-subject-jwsuh",
        mailbox_address: "jwsuh@amic.kr",
        access_token: ACCESS_TOKEN,
        refresh_token: REFRESH_TOKEN,
        expires_at: expiresAt,
        granted_scopes: [
          "openid",
          "profile",
          "email",
          "offline_access",
          "Calendars.ReadBasic",
        ],
      };
    },
    async refresh() {
      refreshCount += 1;
      if (refreshError) throw refreshError;
      if (refreshResult) return structuredClone(refreshResult);
      throw new Error("refresh should not run for an unexpired pilot token");
    },
  };
  return {
    oauthClient,
    exchangeCount: () => exchangeCount,
    exchangeInput: () => exchangeInput,
    refreshCount: () => refreshCount,
  };
}

test("operational People Outlook stores only an encrypted DB credential, reads calendarView, and deletes the credential on disconnect", async () => {
  const repository = createEmailDmsRepository();
  const ports = dependencies();
  const graphCalls = [];
  const factory = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 7).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    clock: () => NOW,
    microsoft_egress_transport: brokerTransport(async (input) => {
      graphCalls.push(input);
      return {
        events: [{
          id: "graph-required-meeting",
          subject: "필수 참석 회의",
          start: { dateTime: "2026-08-03T10:00:00", timeZone: "Asia/Seoul" },
          end: { dateTime: "2026-08-03T10:30:00", timeZone: "Asia/Seoul" },
          isAllDay: false,
          isCancelled: false,
          sensitivity: "normal",
          showAs: "busy",
          isOrganizer: false,
          responseStatus: { response: "accepted" },
          attendees: [{
            type: "required",
            status: { response: "accepted" },
            emailAddress: { address: "jwsuh@amic.kr" },
          }],
          iCalUId: "required-meeting-ical",
          type: "singleInstance",
        }, {
          id: "graph-optional-meeting",
          subject: "선택 참석 회의",
          start: { dateTime: "2026-08-03T11:00:00", timeZone: "Asia/Seoul" },
          end: { dateTime: "2026-08-03T11:30:00", timeZone: "Asia/Seoul" },
          isAllDay: false,
          isCancelled: false,
          sensitivity: "normal",
          showAs: "busy",
          isOrganizer: false,
          responseStatus: { response: "accepted" },
          attendees: [{
            type: "optional",
            status: { response: "accepted" },
            emailAddress: { address: "jwsuh@amic.kr" },
          }],
          iCalUId: "optional-meeting-ical",
          type: "singleInstance",
        }],
        page_count: 1,
        provider_request_ids: ["people-calendar-request-001"],
      };
    }),
  });
  const runtime = factory({ repository });
  const principal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };

  const begun = runtime.connections.begin(principal);
  assert.equal(begun.connection_state, "consent_pending");
  const pending = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];
  assert.match(pending.oauth_state_hash, /^scrypt:[a-f0-9]{64}$/u);
  assert.match(pending.oauth_verifier_ciphertext, /^v1\./u);
  assert.equal(JSON.stringify(pending).includes(begun.state_ref), false);

  const connected = await runtime.connections.complete({
    ...principal,
    authorization_code: "0.ABC_operational-code-20260803",
    state_ref: begun.state_ref,
  });
  assert.equal(connected.connection_state, "connected");
  assert.match(ports.exchangeInput().code_verifier, /^[A-Za-z0-9_-]{43}$/u);
  const replayed = await runtime.connections.complete({
    ...principal,
    authorization_code: "0.ABC_operational-code-20260803",
    state_ref: begun.state_ref,
  });
  assert.equal(replayed.connection_state, "connected");
  assert.equal(ports.exchangeCount(), 1);
  const persisted = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];
  assert.match(
    persisted.credential_envelope,
    new RegExp(`^${PEOPLE_OUTLOOK_CREDENTIAL_ENVELOPE_PREFIX.replaceAll(".", "\\.")}`),
  );
  assert.equal(persisted.credential_encrypted_at_rest, true);
  assert.equal(persisted.oauth_verifier_ciphertext, null);
  const persistedText = JSON.stringify(repository.snapshot());
  for (const secret of [
    ACCESS_TOKEN,
    REFRESH_TOKEN,
    "jwsuh@amic.kr",
    ports.exchangeInput().code_verifier,
  ]) {
    assert.equal(persistedText.includes(secret), false);
  }

  const source = await runtime.calendarSource.read({
    tenant_id: TENANT,
    employee_ids: [EMPLOYEE],
    as_of: "2026-08-03",
    timezone: "Asia/Seoul",
  });
  assert.equal(source.state, "ok");
  assert.deepEqual(
    source.events_by_employee_id[EMPLOYEE].map((event) => event.attendee_type),
    ["required", "optional"],
  );
  assert.equal(graphCalls.length, 1);
  assert.equal(graphCalls[0].access_token, ACCESS_TOKEN);
  assert.equal(graphCalls[0].timezone, "Asia/Seoul");
  assert.match(graphCalls[0].start_date_time, /^2026-08-03T00:00:00/u);
  assert.match(graphCalls[0].end_date_time, /^2026-08-04T00:00:00/u);
  assert.equal(Object.hasOwn(graphCalls[0], "url"), false);
  assert.equal(Object.hasOwn(graphCalls[0], "headers"), false);

  const disconnected = await runtime.connections.disconnect(principal);
  assert.equal(disconnected.connection_state, "not_connected");
  const revoked = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];
  assert.equal(revoked.credential_envelope, null);
  assert.equal(revoked.credential_encrypted_at_rest, false);
});

test("local fallback claims identical People Outlook completion before one broker exchange", async () => {
  const repository = createEmailDmsRepository();
  const ports = dependencies();
  let releaseExchange;
  let markExchangeStarted;
  const exchangeReleased = new Promise((resolve) => {
    releaseExchange = resolve;
  });
  const exchangeStarted = new Promise((resolve) => {
    markExchangeStarted = resolve;
  });
  const factory = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 14).toString("base64"),
    },
    oauth_client: {
      ...ports.oauthClient,
      async exchange(input) {
        const exchanged = await ports.oauthClient.exchange(input);
        markExchangeStarted();
        await exchangeReleased;
        return exchanged;
      },
    },
    microsoft_egress_transport: brokerTransport(),
    clock: () => NOW,
  });
  const runtime = factory({ repository });
  const principal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };
  const authorizationCode = "0.ABC_concurrent-operational-code-20260804";
  const begun = runtime.connections.begin(principal);

  const first = runtime.connections.complete({
    ...principal,
    authorization_code: authorizationCode,
    state_ref: begun.state_ref,
  });
  await exchangeStarted;
  const concurrentRuntime = factory({ repository });
  const secondError = await concurrentRuntime.connections.complete({
    ...principal,
    authorization_code: authorizationCode,
    state_ref: begun.state_ref,
  }).then(() => null, (error) => error);
  const claimedSnapshot = repository.snapshot();

  assert.equal(secondError?.safe_error_code, "OUTLOOK_AUTHORIZATION_IN_PROGRESS");
  assert.equal(secondError?.status, 409);
  assert.equal(ports.exchangeCount(), 1);
  assert.equal(claimedSnapshot.records[0].connection_state, "reauthorization_required");
  assert.equal(claimedSnapshot.records[0].state_version, 2);
  assert.equal(claimedSnapshot.records[0].oauth_state_hash, null);
  assert.equal(claimedSnapshot.records[0].oauth_verifier_ciphertext, null);
  const completionClaim = claimedSnapshot.idempotency.find(
    ({ operation }) => operation === "people.outlook.authorization.consuming",
  );
  assert.equal(
    completionClaim?.operation,
    "people.outlook.authorization.consuming",
  );
  const claimedText = JSON.stringify(claimedSnapshot);
  for (const secret of [
    authorizationCode,
    begun.state_ref,
    ACCESS_TOKEN,
    REFRESH_TOKEN,
    "jwsuh@amic.kr",
    CLIENT_SECRET,
  ]) {
    assert.equal(claimedText.includes(secret), false);
  }

  releaseExchange();
  const connected = await first;
  assert.equal(connected.connection_state, "connected");
  assert.equal(ports.exchangeCount(), 1);
  const replayed = await runtime.connections.complete({
    ...principal,
    authorization_code: authorizationCode,
    state_ref: begun.state_ref,
  });
  assert.equal(replayed.connection_state, "connected");
  assert.equal(ports.exchangeCount(), 1);
  assert.equal(repository.snapshot().records[0].state_version, 3);
});

test("operational People Outlook fails closed when durable completion is required without a checkpoint", () => {
  const ports = dependencies();
  const factory = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 19).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    microsoft_egress_transport: brokerTransport(),
    clock: () => NOW,
  });
  assert.throws(
    () => factory({
      repository: createEmailDmsRepository(),
      require_durable_completion: true,
    }),
    /Durable People Outlook completion checkpoint is required/u,
  );
});

test("operational People Outlook refreshes once and re-encrypts rotated tokens", async () => {
  const rotatedAccessToken = "rotated-access-token-never-persist";
  const rotatedRefreshToken = "rotated-refresh-token-never-persist";
  const ports = dependencies({
    expiresAt: "2026-08-03T00:30:30.000Z",
    refreshResult: {
      access_token: rotatedAccessToken,
      refresh_token: rotatedRefreshToken,
      expires_at: "2026-08-03T02:30:00.000Z",
      granted_scopes: [
        "openid",
        "profile",
        "email",
        "offline_access",
        "Calendars.ReadBasic",
      ],
    },
  });
  const repository = createEmailDmsRepository();
  const graphAuthorizations = [];
  const runtime = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 12).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    microsoft_egress_transport: brokerTransport(async (input) => {
      graphAuthorizations.push(input.access_token);
      return { events: [], page_count: 1, provider_request_ids: [] };
    }),
    clock: () => NOW,
  })({ repository });
  const principal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };
  const begun = runtime.connections.begin(principal);
  await runtime.connections.complete({
    ...principal,
    authorization_code: "0.ABC_operational-code-20260803",
    state_ref: begun.state_ref,
  });

  const input = {
    tenant_id: TENANT,
    employee_ids: [EMPLOYEE],
    as_of: "2026-08-03",
    timezone: "Asia/Seoul",
  };
  assert.equal((await runtime.calendarSource.read(input)).state, "ok");
  assert.equal((await runtime.calendarSource.read(input)).state, "ok");
  assert.equal(ports.refreshCount(), 1);
  assert.deepEqual(graphAuthorizations, [
    rotatedAccessToken,
    rotatedAccessToken,
  ]);
  const snapshot = JSON.stringify(repository.snapshot());
  for (const secret of [
    ACCESS_TOKEN,
    REFRESH_TOKEN,
    rotatedAccessToken,
    rotatedRefreshToken,
  ]) {
    assert.equal(snapshot.includes(secret), false);
  }
});

test("operational People Outlook clears encrypted tokens when Microsoft requires reauthorization", async () => {
  const refreshError = Object.assign(
    new Error("provider detail must not persist"),
    {
      status: 401,
      safe_error_code: "OUTLOOK_PROVIDER_REJECTED",
    },
  );
  const ports = dependencies({
    expiresAt: "2026-08-03T00:30:30.000Z",
    refreshError,
  });
  const repository = createEmailDmsRepository();
  let graphCallCount = 0;
  const runtime = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 13).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    microsoft_egress_transport: brokerTransport(async () => {
      graphCallCount += 1;
      throw new Error("Graph should not run after rejected refresh");
    }),
    clock: () => NOW,
  })({ repository });
  const principal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };
  const begun = runtime.connections.begin(principal);
  await runtime.connections.complete({
    ...principal,
    authorization_code: "0.ABC_operational-code-20260803",
    state_ref: begun.state_ref,
  });
  const source = await runtime.calendarSource.read({
    tenant_id: TENANT,
    employee_ids: [EMPLOYEE],
    as_of: "2026-08-03",
    timezone: "Asia/Seoul",
  });
  const record = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];

  assert.equal(source.state, "blocked");
  assert.equal(source.safe_error_code, "OUTLOOK_PROVIDER_REJECTED");
  assert.equal(ports.refreshCount(), 1);
  assert.equal(graphCallCount, 0);
  assert.equal(record.connection_state, "reauthorization_required");
  assert.equal(record.credential_envelope, null);
  assert.equal(record.credential_encrypted_at_rest, false);
  assert.equal(JSON.stringify(repository.snapshot()).includes(refreshError.message), false);
});

test("operational People Outlook rejects a callback for another signed account", async () => {
  const repository = createEmailDmsRepository();
  const ports = dependencies();
  const factory = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 8).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    microsoft_egress_transport: brokerTransport(async () => {
      throw new Error("Graph should not run");
    }),
    clock: () => NOW,
  });
  const runtime = factory({ repository });
  const begun = runtime.connections.begin({
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  });
  await assert.rejects(
    runtime.connections.complete({
      tenant_id: TENANT,
      employee_id: EMPLOYEE,
      user_id: "user-other",
      session_email: "other@amic.kr",
      can_manage: true,
      authorization_code: "0.ABC_operational-code-20260803",
      state_ref: begun.state_ref,
    }),
    (error) => error.safe_error_code === "OUTLOOK_ACCOUNT_MISMATCH",
  );
  assert.equal(
    repository.list({
      tenant_id: TENANT,
      model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
    })[0].credential_envelope,
    null,
  );
  assert.equal(ports.exchangeCount(), 0);
});

test("operational People Outlook rebinds an expired same-email record before a migrated user begins authorization", () => {
  const repository = createEmailDmsRepository();
  const ports = dependencies();
  const runtime = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 22).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    microsoft_egress_transport: brokerTransport(),
    clock: () => NOW,
  })({ repository });
  const legacyPrincipal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };
  const begun = runtime.connections.begin(legacyPrincipal);
  const pending = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];
  assert.throws(
    () => runtime.connections.begin({
      ...legacyPrincipal,
      user_id: "user-jwsuh-after-password-reset",
    }),
    (error) => error.safe_error_code === "OUTLOOK_ACCOUNT_MISMATCH",
  );
  repository.update({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
    people_outlook_connection_id: pending.people_outlook_connection_id,
  }, {
    ...pending,
    oauth_expires_at: new Date(NOW - 1).toISOString(),
  });

  const migrated = runtime.connections.begin({
    ...legacyPrincipal,
    user_id: "user-jwsuh-after-password-reset",
  });
  assert.equal(migrated.connection_state, "consent_pending");
  const rebound = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];
  assert.equal(rebound.user_id, "user-jwsuh-after-password-reset");
  assert.equal(rebound.session_email_hash, pending.session_email_hash);
  assert.equal(rebound.state_version, 3);
  assert.equal(rebound.oauth_expires_at, new Date(NOW + 10 * 60 * 1000).toISOString());
  const audit = repository.listAudit({
    tenant_id: TENANT,
    object_id: rebound.people_outlook_connection_id,
  });
  const rebindAudit = audit.find(
    ({ event_type }) => event_type === "people.outlook.connection.principal.rebound",
  );
  assert.equal(rebindAudit?.payload?.principal_rebound, true);
  assert.equal(rebindAudit?.payload?.previous_user_id, USER);
  assert.equal(rebindAudit?.payload?.credential_material_included, false);
  assert.deepEqual(
    audit.map(({ event_type }) => event_type),
    [
      "people.outlook.authorization.started",
      "people.outlook.connection.principal.rebound",
      "people.outlook.authorization.started",
    ],
  );
  assert.equal(JSON.stringify(repository.snapshot()).includes(begun.state_ref), false);
});

test("operational People Outlook rejects email, subject, and active-credential principal rebinding", async () => {
  const repository = createEmailDmsRepository();
  const ports = dependencies();
  const runtime = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 23).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    microsoft_egress_transport: brokerTransport(),
    clock: () => NOW,
  })({ repository });
  const connectedPrincipal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };
  const begun = runtime.connections.begin(connectedPrincipal);
  await runtime.connections.complete({
    ...connectedPrincipal,
    authorization_code: "0.ABC_rebind-guard-code-20260804",
    state_ref: begun.state_ref,
  });

  assert.throws(
    () => runtime.connections.begin({
      ...connectedPrincipal,
      user_id: "user-jwsuh-active-credential",
    }),
    (error) => error.safe_error_code === "OUTLOOK_ACCOUNT_MISMATCH",
  );

  const connected = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];
  repository.update({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
    people_outlook_connection_id: connected.people_outlook_connection_id,
  }, {
    ...connected,
    connection_state: "reauthorization_required",
    credential_envelope: null,
    credential_expires_at: null,
    safe_error_code: "OUTLOOK_REAUTHORIZATION_REQUIRED",
  });
  for (const candidate of [
    {
      user_id: "user-jwsuh-email-mismatch",
      session_email: "other@amic.kr",
    },
    {
      user_id: "user-jwsuh-subject-mismatch",
      session_email: "jwsuh@amic.kr",
      entra_subject_id: "entra-subject-other",
    },
  ]) {
    assert.throws(
      () => runtime.connections.begin({
        ...connectedPrincipal,
        ...candidate,
      }),
      (error) => error.safe_error_code === "OUTLOOK_ACCOUNT_MISMATCH",
    );
  }
  const current = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];
  assert.equal(current.connection_state, "reauthorization_required");
  assert.equal(current.user_id, USER);
  assert.equal(current.credential_envelope, null);
  assert.equal(ports.exchangeCount(), 1);
});

test("operational People Outlook permits same-email rebinding before disconnecting an inactive record", async () => {
  const repository = createEmailDmsRepository();
  const ports = dependencies();
  const runtime = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 24).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    microsoft_egress_transport: brokerTransport(),
    clock: () => NOW,
  })({ repository });
  const legacyPrincipal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };
  runtime.connections.begin(legacyPrincipal);
  const pending = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];
  repository.update({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
    people_outlook_connection_id: pending.people_outlook_connection_id,
  }, {
    ...pending,
    connection_state: "reauthorization_required",
    credential_envelope: null,
    credential_expires_at: null,
    oauth_state_hash: null,
    oauth_nonce_hash: null,
    oauth_verifier_ciphertext: null,
    oauth_expires_at: null,
    safe_error_code: "OUTLOOK_REAUTHORIZATION_REQUIRED",
  });

  const disconnected = await runtime.connections.disconnect({
    ...legacyPrincipal,
    user_id: "user-jwsuh-after-password-reset",
  });
  assert.equal(disconnected.connection_state, "not_connected");
  const revoked = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];
  assert.equal(revoked.user_id, "user-jwsuh-after-password-reset");
  assert.equal(revoked.connection_state, "revoked");
  assert.equal(revoked.credential_envelope, null);
  assert.deepEqual(
    repository.listAudit({
      tenant_id: TENANT,
      object_id: revoked.people_outlook_connection_id,
    }).map(({ event_type }) => event_type),
    [
      "people.outlook.authorization.started",
      "people.outlook.connection.principal.rebound",
      "people.outlook.connection.disconnected",
    ],
  );
});

test("operational People Outlook rejects tenant and state mismatches before broker exchange", async () => {
  const repository = createEmailDmsRepository();
  const ports = dependencies();
  const runtime = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 15).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    microsoft_egress_transport: brokerTransport(),
    clock: () => NOW,
  })({ repository });
  const principal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };
  const begun = runtime.connections.begin(principal);
  const wrongState = `${begun.state_ref.slice(0, -1)}${
    begun.state_ref.endsWith("A") ? "B" : "A"
  }`;

  await assert.rejects(
    runtime.connections.complete({
      ...principal,
      state_ref: wrongState,
      authorization_code: "0.ABC_wrong-state-code-20260804",
    }),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  await assert.rejects(
    runtime.connections.complete({
      ...principal,
      tenant_id: `${TENANT}-other`,
      state_ref: begun.state_ref,
      authorization_code: "0.ABC_wrong-tenant-code-20260804",
    }),
    (error) => error.safe_error_code === "OUTLOOK_OAUTH_STATE_INVALID",
  );
  assert.equal(ports.exchangeCount(), 0);
  assert.equal(repository.snapshot().records[0].connection_state, "consent_pending");
});

test("operational People Outlook clears a consumed claim after Microsoft account mismatch", async () => {
  const repository = createEmailDmsRepository();
  const ports = dependencies();
  const runtime = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 20).toString("base64"),
    },
    oauth_client: {
      ...ports.oauthClient,
      async exchange(input) {
        return {
          ...await ports.oauthClient.exchange(input),
          mailbox_address: "different-account@amic.kr",
        };
      },
    },
    microsoft_egress_transport: brokerTransport(),
    clock: () => NOW,
  })({ repository });
  const principal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };
  const begun = runtime.connections.begin(principal);
  const error = await runtime.connections.complete({
    ...principal,
    state_ref: begun.state_ref,
    authorization_code: "0.ABC_wrong-provider-account-code-20260804",
  }).then(() => null, (value) => value);

  assert.equal(error?.safe_error_code, "OUTLOOK_ACCOUNT_MISMATCH");
  assert.equal(error?.status, 403);
  assert.equal(ports.exchangeCount(), 1);
  const failed = repository.snapshot().records[0];
  assert.equal(failed.connection_state, "reauthorization_required");
  assert.equal(failed.safe_error_code, "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED");
  assert.equal(failed.state_version, 3);
  assert.equal(failed.credential_envelope, null);
  assert.equal(failed.oauth_state_hash, null);
  assert.equal(failed.oauth_verifier_ciphertext, null);
  const serialized = JSON.stringify(repository.snapshot());
  assert.equal(serialized.includes("different-account@amic.kr"), false);
  assert.equal(serialized.includes(ACCESS_TOKEN), false);
  assert.equal(serialized.includes(REFRESH_TOKEN), false);
});

test("operational People Outlook clears a consumed claim after durable finalize failure", async () => {
  const repository = createEmailDmsRepository();
  const ports = dependencies();
  const completionCheckpoint = Object.freeze({
    claim({ apply }) {
      return Promise.resolve(repository.transaction(apply));
    },
    finalize() {
      throw new Error(`simulated persistence failure ${ACCESS_TOKEN}`);
    },
    fail({ apply }) {
      return Promise.resolve(repository.transaction(apply));
    },
  });
  const runtime = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 21).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    microsoft_egress_transport: brokerTransport(),
    clock: () => NOW,
  })({
    repository,
    completion_checkpoint: completionCheckpoint,
    require_durable_completion: true,
  });
  const principal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };
  const begun = runtime.connections.begin(principal);
  const error = await runtime.connections.complete({
    ...principal,
    state_ref: begun.state_ref,
    authorization_code: "0.ABC_finalize-failure-code-20260804",
  }).then(() => null, (value) => value);

  assert.equal(error?.safe_error_code, "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED");
  assert.equal(error?.status, 409);
  assert.equal(error?.message.includes(ACCESS_TOKEN), false);
  assert.equal(ports.exchangeCount(), 1);
  const failed = repository.snapshot().records[0];
  assert.equal(failed.connection_state, "reauthorization_required");
  assert.equal(failed.safe_error_code, "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED");
  assert.equal(failed.state_version, 3);
  assert.equal(failed.credential_envelope, null);
  assert.equal(JSON.stringify(repository.snapshot()).includes(ACCESS_TOKEN), false);
});

test("encrypted People Outlook credentials are bound to their DB identity context", async () => {
  const repository = createEmailDmsRepository();
  const ports = dependencies();
  let graphCallCount = 0;
  const runtime = createPeopleOutlookOperationalRuntimeFactory({
    config: {
      tenant_id: "11111111-1111-4111-8111-111111111111",
      client_id: "22222222-2222-4222-8222-222222222222",
      client_secret: CLIENT_SECRET,
      redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
      state_encryption_key: Buffer.alloc(32, 9).toString("base64"),
    },
    oauth_client: ports.oauthClient,
    microsoft_egress_transport: brokerTransport(async () => {
      graphCallCount += 1;
      throw new Error("Graph must not receive a credential from another context");
    }),
    clock: () => NOW,
  })({ repository });
  const principal = {
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  };
  const begun = runtime.connections.begin(principal);
  await runtime.connections.complete({
    ...principal,
    authorization_code: "0.ABC_operational-code-20260803",
    state_ref: begun.state_ref,
  });
  const record = repository.list({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
  })[0];
  repository.update({
    tenant_id: TENANT,
    model_type: PEOPLE_OUTLOOK_CONNECTION_MODEL_TYPE,
    people_outlook_connection_id: record.people_outlook_connection_id,
  }, {
    ...record,
    user_id: "user-context-tampered",
  });

  const source = await runtime.calendarSource.read({
    tenant_id: TENANT,
    employee_ids: [EMPLOYEE],
    as_of: "2026-08-03",
    timezone: "Asia/Seoul",
  });
  assert.equal(source.state, "blocked");
  assert.equal(source.safe_error_code, "OUTLOOK_CREDENTIAL_BINDING_INVALID");
  assert.equal(graphCallCount, 0);
});

test("People Outlook reuses an existing readable Entra config Secret without Secrets writes", async () => {
  const commands = [];
  const secretId = "/lawos/production/entra/config";
  const factory = await createPeopleOutlookOperationalRuntimeFactoryFromSecretReference({
    env: {
      AWS_REGION: "ap-northeast-2",
      [LAWOS_PEOPLE_OUTLOOK_M365_CONFIG_SECRET_ID_ENV]: secretId,
      [LAWOS_M365_CONFIG_SECRET_ID_ENV]: "/lawos/production/shared-m365/config",
    },
    secrets_client: {
      async send(command) {
        commands.push(command);
        return {
          SecretString: JSON.stringify({
            tenant_id: "11111111-1111-4111-8111-111111111111",
            client_id: "33333333-3333-4333-8333-333333333333",
            redirect_uris: ["matter://auth/callback"],
            conditional_access_auth_context_id: "c1",
            people_outlook: {
              client_id: "22222222-2222-4222-8222-222222222222",
              client_secret: CLIENT_SECRET,
              redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
              state_encryption_key: Buffer.alloc(32, 10).toString("base64"),
            },
          }),
        };
      },
    },
    microsoft_egress_transport: brokerTransport(),
    clock: () => NOW,
  });
  const runtime = factory({ repository: createEmailDmsRepository() });
  const begun = runtime.connections.begin({
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    user_id: USER,
    session_email: "jwsuh@amic.kr",
    can_manage: true,
  });
  const authorizeUrl = new URL(begun.authorize_url);

  assert.equal(authorizeUrl.searchParams.get("client_id"),
    "22222222-2222-4222-8222-222222222222");
  const scopes = authorizeUrl.searchParams.get("scope").split(" ");
  assert.equal(scopes.includes("Calendars.ReadBasic"), true);
  assert.equal(scopes.includes("Calendars.ReadWrite"), false);
  assert.equal(scopes.includes("Mail.Read"), false);
  assert.equal(
    authorizeUrl.searchParams.get("redirect_uri"),
    MICROSOFT_EGRESS_REDIRECT_URIS.people,
  );
  assert.deepEqual(
    commands.map((command) => command.constructor.name),
    ["GetSecretValueCommand"],
  );
  assert.equal(commands[0].input.SecretId, secretId);
});

test("People Outlook falls back to the shared M365 JSON Secret", async () => {
  const commands = [];
  const secretId = "/lawos/production/m365/config";
  const factory = await createPeopleOutlookOperationalRuntimeFactoryFromSecretReference({
    env: {
      AWS_REGION: "ap-northeast-2",
      [LAWOS_M365_CONFIG_SECRET_ID_ENV]: secretId,
    },
    secrets_client: {
      async send(command) {
        commands.push(command);
        return {
          SecretString: JSON.stringify({
            tenant_id: "11111111-1111-4111-8111-111111111111",
            people_outlook: {
              client_id: "22222222-2222-4222-8222-222222222222",
              client_secret: CLIENT_SECRET,
              redirect_uri: MICROSOFT_EGRESS_REDIRECT_URIS.people,
              state_encryption_key: Buffer.alloc(32, 10).toString("base64"),
            },
            client_outlook: {
              configured_separately: true,
            },
          }),
        };
      },
    },
    microsoft_egress_transport: brokerTransport(),
    clock: () => NOW,
  });

  assert.equal(typeof factory, "function");
  assert.equal(commands.length, 1);
  assert.deepEqual(commands[0].input, { SecretId: secretId });
});

test("Lambda Outlook bootstrap is disabled cleanly and fails closed when enabled without config", async () => {
  assert.equal(await resolveLambdaPeopleOutlookRuntimeFactory({
    env: { VITE_LAWOS_OUTLOOK_CALENDAR: "false" },
  }), null);
  await assert.rejects(
    resolveLambdaPeopleOutlookRuntimeFactory({
      env: { VITE_LAWOS_OUTLOOK_CALENDAR: "true" },
    }),
    new RegExp(LAWOS_PEOPLE_OUTLOOK_M365_CONFIG_SECRET_ID_ENV),
  );
});

test("HRX routes await operational connection and calendar ports without changing synchronous test ports", async () => {
  const hrxRepository = createInMemoryHrxRepository({
    employees: [{
      tenant_id: TENANT,
      employee_id: EMPLOYEE,
      display_name: "서주원",
      status: "active",
    }],
    employee_user_links: [{
      tenant_id: TENANT,
      link_id: "link-jwsuh-outlook-operational",
      employee_id: EMPLOYEE,
      user_id: USER,
      purpose: "login_mapping",
      source_ref: "test:people-outlook-operational",
    }],
  });
  const publicConnection = Object.freeze({
    provider: "microsoft_graph",
    connection_state: "connected",
    can_manage: true,
    delegated_scope: "Calendars.ReadBasic",
    connected_at: "2026-08-03T00:00:00.000Z",
    expires_at: "2026-08-03T01:30:00.000Z",
    safe_error_code: null,
  });
  const runtime = createHrxRuntimeContext({
    repository: hrxRepository,
    seedRuntimeFixtures: false,
    clock: () => new Date(NOW).toISOString(),
    peopleTimezone: "Asia/Seoul",
    peopleFeatureFlags: {
      people_overview: true,
      people_member_brief: true,
      outlook_calendar: true,
    },
    peopleOutlookConnections: {
      status() {
        return publicConnection;
      },
      async begin(input) {
        assert.equal(input.session_email, "jwsuh@amic.kr");
        return publicConnection;
      },
      async complete() {
        return publicConnection;
      },
      async disconnect() {
        return { ...publicConnection, connection_state: "not_connected" };
      },
    },
    peopleOutlookCalendarSource: {
      async read({ employee_ids }) {
        return {
          state: "ok",
          events_by_employee_id: {
            [employee_ids[0]]: [{
              provider_event_id: "async-required-meeting",
              title: "필수 참석 회의",
              starts_at: "2026-08-03T01:00:00.000Z",
              ends_at: "2026-08-03T01:30:00.000Z",
              attendee_type: "required",
              response_status: "accepted",
              is_cancelled: false,
              sensitivity: "normal",
              show_as: "busy",
            }],
          },
          connection_state_by_employee_id: {
            [employee_ids[0]]: publicConnection,
          },
          last_success_at: "2026-08-03T00:29:00.000Z",
          stale_after: "2026-08-03T00:34:00.000Z",
          safe_error_code: null,
        };
      },
    },
  });
  const requestContext = {
    tenant_id: TENANT,
    actor_id: USER,
    actor_role: "staff",
    hrx_scopes: ["hrx.employee.read"],
    session_bound: true,
    email: "jwsuh@amic.kr",
  };
  const permissionContext = {
    principal: { user_id: USER, tenant_id: TENANT, role_ids: ["staff"] },
    rules: [
      { id: "employee-read", effect: "allow", action: "hrx.employee.read" },
      { id: "matter-read", effect: "allow", action: "matter:read" },
    ],
    object_acl: [],
  };
  const connectionPending = handleHrxApiRequest({
    pathname: `/api/hrx/people/members/${EMPLOYEE}/outlook-connection`,
    method: "POST",
    body: {
      action: "begin",
      idempotency_key: "people-outlook-begin-async-source-001",
    },
    context: runtime,
    requestContext,
    permissionContext,
  });
  assert.equal(typeof connectionPending.then, "function");
  assert.equal(
    (await connectionPending).body.connection.connection_state,
    "connected",
  );

  const dailyPending = handleHrxApiRequest({
    pathname: `/api/hrx/people/members/${EMPLOYEE}/daily-brief`,
    method: "GET",
    context: runtime,
    matterContext: {
      repository: {
        list() {
          return [];
        },
      },
    },
    requestContext,
    permissionContext,
  });
  assert.equal(typeof dailyPending.then, "function");
  const daily = await dailyPending;
  assert.equal(daily.status, 200);
  assert.deepEqual(
    daily.body.data.required_meetings.map(({ title }) => title),
    ["필수 참석 회의"],
  );
});

test("HRX self completion resolves one active EmployeeUserLink and rejects client identity authority", () => {
  const hrxRepository = createInMemoryHrxRepository({
    employees: [{
      tenant_id: TENANT,
      employee_id: EMPLOYEE,
      display_name: "서주원",
      status: "active",
    }],
    employee_user_links: [{
      tenant_id: TENANT,
      link_id: "link-jwsuh-outlook-self-complete",
      employee_id: EMPLOYEE,
      user_id: USER,
      purpose: "login_mapping",
      source_ref: "test:people-outlook-self-complete",
    }],
  });
  const completionInputs = [];
  const runtime = createHrxRuntimeContext({
    repository: hrxRepository,
    seedRuntimeFixtures: false,
    peopleFeatureFlags: { outlook_calendar: true },
    peopleOutlookConnections: {
      complete(input) {
        completionInputs.push(input);
        return {
          provider: "microsoft_graph",
          connection_state: "connected",
          can_manage: true,
          delegated_scope: "Calendars.ReadBasic",
          connected_at: "2026-08-03T00:30:00.000Z",
          expires_at: "2026-08-03T01:30:00.000Z",
          safe_error_code: null,
        };
      },
    },
  });
  const authorizationCode = "0.ABC_self-complete-code-20260804";
  const stateRef = "lawos_people_outlook_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG";
  const request = (
    body,
    pathname = "/api/hrx/people/me/outlook-connection/complete",
  ) => handleHrxApiRequest({
    pathname,
    method: "POST",
    body,
    context: runtime,
    requestContext: {
      tenant_id: TENANT,
      actor_id: USER,
      actor_role: "staff",
      hrx_scopes: ["hrx.employee.read"],
      session_bound: true,
      email: "jwsuh@amic.kr",
    },
    permissionContext: {
      principal: { user_id: USER, tenant_id: TENANT, role_ids: ["staff"] },
      rules: [{ id: "employee-read", effect: "allow", action: "hrx.employee.read" }],
      object_acl: [],
    },
  });

  const completed = request({
    authorization_code: authorizationCode,
    state_ref: stateRef,
  });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.employee_id, EMPLOYEE);
  assert.equal(completionInputs.length, 1);
  assert.equal(completionInputs[0].tenant_id, TENANT);
  assert.equal(completionInputs[0].employee_id, EMPLOYEE);
  assert.equal(completionInputs[0].user_id, USER);
  assert.equal(completionInputs[0].session_email, "jwsuh@amic.kr");
  assert.equal(completionInputs[0].authorization_code, authorizationCode);
  assert.equal(completionInputs[0].state_ref, stateRef);
  const publicText = JSON.stringify({
    response: completed,
    audit: runtime.audit.list({ tenant_id: TENANT }),
  });
  for (const secret of [authorizationCode, stateRef, "jwsuh@amic.kr", CLIENT_SECRET]) {
    assert.equal(publicText.includes(secret), false);
  }

  for (const body of [
    { authorization_code: authorizationCode, state_ref: stateRef, employee_id: "emp-forged" },
    { authorization_code: authorizationCode, state_ref: stateRef, tenant_id: "tenant-forged" },
    { authorization_code: authorizationCode, state_ref: stateRef, user_id: "user-forged" },
  ]) {
    const blocked = request(body);
    assert.equal(blocked.status, 400);
    assert.equal(
      blocked.body.safe_error_code,
      "OUTLOOK_OAUTH_IDENTITY_INPUT_FORBIDDEN",
    );
  }
  const secretBlocked = request({
    authorization_code: authorizationCode,
    state_ref: stateRef,
    client_secret: CLIENT_SECRET,
  });
  assert.equal(secretBlocked.status, 400);
  assert.equal(secretBlocked.body.safe_error_code, "OUTLOOK_OAUTH_BOUNDARY_INVALID");
  for (const malformedBody of [
    null,
    {
      authorization_code: authorizationCode,
      state_ref: stateRef,
      callback_url: "https://attacker.invalid/callback",
    },
  ]) {
    const malformed = request(malformedBody);
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.safe_error_code, "OUTLOOK_OAUTH_CALLBACK_INVALID");
  }
  const legacyCompletionBlocked = request({
    action: "complete",
    authorization_code: authorizationCode,
    state_ref: stateRef,
  }, `/api/hrx/people/members/${EMPLOYEE}/outlook-connection`);
  assert.equal(legacyCompletionBlocked.status, 400);
  assert.equal(
    legacyCompletionBlocked.body.safe_error_code,
    "OUTLOOK_CONNECTION_ACTION_INVALID",
  );
  assert.equal(completionInputs.length, 1);
});

test("HRX self completion fails closed for missing, ambiguous, or unsigned employee links", () => {
  const employee = (employeeId) => ({
    tenant_id: TENANT,
    employee_id: employeeId,
    display_name: employeeId,
    status: "active",
  });
  const link = (employeeId, suffix) => ({
    tenant_id: TENANT,
    link_id: `link-jwsuh-${suffix}`,
    employee_id: employeeId,
    user_id: USER,
    purpose: "login_mapping",
    source_ref: "test:people-outlook-self-complete-fail-closed",
  });
  const request = ({
    employees,
    links,
    sessionBound = true,
    actorId = USER,
    ambiguousLinkRead = false,
  }) => {
    const repository = createInMemoryHrxRepository({
      employees,
      employee_user_links: ambiguousLinkRead ? links.slice(0, 1) : links,
    });
    const runtimeRepository = ambiguousLinkRead
      ? Object.freeze({
          ...repository,
          listEmployeeUserLinks(query = {}) {
            if (query.tenant_id === TENANT && query.user_id === USER) {
              return Object.freeze(links.map((value) => Object.freeze({ ...value })));
            }
            return repository.listEmployeeUserLinks(query);
          },
        })
      : repository;
    const runtime = createHrxRuntimeContext({
      repository: runtimeRepository,
      seedRuntimeFixtures: false,
      peopleFeatureFlags: { outlook_calendar: true },
      peopleOutlookConnections: {
        complete() {
          throw new Error("completion must not run without one signed employee link");
        },
      },
    });
    return handleHrxApiRequest({
      pathname: "/api/hrx/people/me/outlook-connection/complete",
      method: "POST",
      body: {
        authorization_code: "0.ABC_fail-closed-code-20260804",
        state_ref: "lawos_people_outlook_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG",
      },
      context: runtime,
      requestContext: {
        tenant_id: TENANT,
        actor_id: actorId,
        actor_role: "staff",
        hrx_scopes: ["hrx.employee.read"],
        session_bound: sessionBound,
        email: "jwsuh@amic.kr",
      },
      permissionContext: {
        principal: { user_id: actorId, tenant_id: TENANT, role_ids: ["staff"] },
        rules: [{ id: "employee-read", effect: "allow", action: "hrx.employee.read" }],
        object_acl: [],
      },
    });
  };

  const missing = request({ employees: [employee(EMPLOYEE)], links: [] });
  assert.equal(missing.status, 403);
  assert.equal(missing.body.safe_error_code, "HRX_SELF_SERVICE_EMPLOYEE_REQUIRED");

  const wrongUser = request({
    employees: [employee(EMPLOYEE)],
    links: [link(EMPLOYEE, "one")],
    actorId: "user-other",
  });
  assert.equal(wrongUser.status, 403);
  assert.equal(wrongUser.body.safe_error_code, "HRX_SELF_SERVICE_EMPLOYEE_REQUIRED");

  const ambiguous = request({
    employees: [employee(EMPLOYEE), employee("emp-jwsuh-second")],
    links: [link(EMPLOYEE, "one"), link("emp-jwsuh-second", "two")],
    ambiguousLinkRead: true,
  });
  assert.equal(ambiguous.status, 409);
  assert.equal(ambiguous.body.safe_error_code, "HRX_SELF_SERVICE_EMPLOYEE_AMBIGUOUS");

  const unsigned = request({
    employees: [employee(EMPLOYEE)],
    links: [link(EMPLOYEE, "one")],
    sessionBound: false,
  });
  assert.equal(unsigned.status, 403);
  assert.equal(unsigned.body.safe_error_code, "HRX_SIGNED_SESSION_REQUIRED");
});
