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
  assert.match(pending.oauth_state_hash, /^sha256:[a-f0-9]{64}$/u);
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
  assert.equal(authorizeUrl.searchParams.get("scope").includes("Calendars.ReadBasic"), true);
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
    body: { action: "begin" },
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
