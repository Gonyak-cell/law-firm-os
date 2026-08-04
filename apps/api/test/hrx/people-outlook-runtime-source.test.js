import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import { createTestOnlyInMemoryOpaqueTokenVault } from "../../../../packages/integrations-core/src/outlook-token-vault.js";
import { createDurablePeopleOutlookStateAuthority } from "../../../../packages/integrations-core/src/people-outlook-connection.js";
import {
  createHrxRuntimeContext,
  handleHrxApiRequest,
} from "../../src/hrx-runtime-context.js";

const TENANT = "tenant-outlook-runtime";
const EMPLOYEE = "emp-outlook-runtime";
const USER = "user-outlook-runtime";
const NOW = "2026-07-30T00:30:00.000Z";

function repository() {
  return createInMemoryHrxRepository({
    employees: [{
      tenant_id: TENANT,
      employee_id: EMPLOYEE,
      display_name: "김변호사",
      status: "active",
    }],
    employee_user_links: [{
      tenant_id: TENANT,
      link_id: "link-outlook-runtime",
      employee_id: EMPLOYEE,
      user_id: USER,
      purpose: "login_mapping",
      source_ref: "test:outlook-runtime",
    }],
  });
}

function actor() {
  return {
    tenant_id: TENANT,
    actor_id: USER,
    actor_role: "staff",
    hrx_scopes: ["hrx.employee.read"],
    session_bound: true,
  };
}

function permissionContext() {
  return {
    principal: { user_id: USER, tenant_id: TENANT, role_ids: ["staff"] },
    rules: [
      { id: "employee-read", effect: "allow", action: "hrx.employee.read" },
      { id: "matter-read", effect: "allow", action: "matter:read" },
    ],
    object_acl: [],
  };
}

function matterContext() {
  return {
    repository: {
      list() {
        return [];
      },
    },
  };
}

function request(context, pathname, method = "GET", body = {}) {
  return handleHrxApiRequest({
    pathname,
    method,
    body,
    context,
    matterContext: matterContext(),
    requestContext: actor(),
    permissionContext: permissionContext(),
  });
}

function injectedOpaqueVault() {
  const base = createTestOnlyInMemoryOpaqueTokenVault({
    reference_prefix: "external-vault:",
  });
  return Object.freeze({
    ...base,
    durable: true,
    opaque_at_rest: true,
    test_only: false,
  });
}

function injectedOperationalConsentRepository() {
  let state = {
    schema_version: "outlook-consent-metadata.v1",
    records: [],
    audit_events: [],
  };
  return Object.freeze({
    durable: true,
    test_only: false,
    loadState() {
      return structuredClone(state);
    },
    replaceState(nextState) {
      state = structuredClone(nextState);
      return structuredClone(state);
    },
  });
}

function injectedOperationalIdentityRepository() {
  let state = {
    schema_version: "people-provider-identity.v1",
    records: [],
    audit_events: [],
    rebind_receipts: [],
  };
  return Object.freeze({
    durable: true,
    test_only: false,
    loadState() {
      return structuredClone(state);
    },
    replaceState(nextState) {
      state = structuredClone(nextState);
      return structuredClone(state);
    },
  });
}

function peopleFlags() {
  return {
    people_overview: true,
    people_member_brief: true,
    outlook_calendar: true,
    people_capacity: false,
  };
}

test("runtime auto-composes identity, consent, calendarView, cache, and privacy without an injected source", async (t) => {
  const vault = injectedOpaqueVault();
  const adapterCalls = [];
  const stateDirectory = mkdtempSync(join(tmpdir(), "lawos-outlook-runtime-state-"));
  t.after(() => rmSync(stateDirectory, { recursive: true, force: true }));
  const runtime = createHrxRuntimeContext({
    repository: repository(),
    seedRuntimeFixtures: false,
    clock: () => NOW,
    peopleFeatureFlags: peopleFlags(),
    peopleProviderIdentityRepository: injectedOperationalIdentityRepository(),
    outlookTokenVault: vault,
    outlookConsentRepository: injectedOperationalConsentRepository(),
    outlookStateAuthority: createDurablePeopleOutlookStateAuthority({
      filePath: join(stateDirectory, "outlook-oauth-state.json"),
    }),
    outlookCalendarViewAdapter: {
      async read(input) {
        adapterCalls.push(input);
        return {
          events: [{
            provider_event_id: "provider-event-must-not-leak",
            provider_series_id: "provider-series-must-not-leak",
            ical_uid: "ical-uid-must-not-leak",
            title: "고객 전략 회의",
            starts_at: "2026-07-30T01:00:00.000Z",
            ends_at: "2026-07-30T01:30:00.000Z",
            is_all_day: false,
            is_cancelled: false,
            sensitivity: "normal",
            show_as: "busy",
            is_organizer: false,
            attendee_type: "required",
            response_status: "accepted",
          }],
        };
      },
    },
    outlookSubjectAddressResolver({ provider_subject_id }) {
      assert.equal(provider_subject_id, "m365-subject-runtime");
      return "lawyer@example.test";
    },
  });
  assert.equal(runtime.outlookTokenVault, vault);
  assert.equal(runtime.peopleProviderIdentities.snapshot().repository.durable, true);
  assert.equal(runtime.outlookConsentService.repositoryState().durable, true);
  assert.ok(runtime.peopleOutlookCalendarSource);

  runtime.outlookConsentService.grant({
    tenant_id: TENANT,
    provider_identity_id: "provider-identity-runtime",
    consent_ref: "outlook-consent-runtime",
    grant_type: "delegated",
    scopes: ["Calendars.ReadBasic"],
    access_token: "discarded-by-external-vault",
    refresh_token: "discarded-by-external-vault",
    expires_at: "2026-07-30T02:30:00.000Z",
  });
  runtime.peopleProviderIdentities.connect({
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    provider_identity_id: "provider-identity-runtime",
    provider_subject_id: "m365-subject-runtime",
    consent_ref: "outlook-consent-runtime",
  });

  const first = runtime.peopleOutlookCalendarSource.read({
    tenant_id: TENANT,
    employee_ids: [EMPLOYEE],
    as_of: NOW,
    timezone: "Asia/Seoul",
  });
  assert.equal(first.state, "blocked");
  assert.equal(first.safe_error_code, "OUTLOOK_CALENDAR_REFRESH_PENDING");
  await runtime.peopleOutlookCalendarSource.whenIdle();

  const result = request(
    runtime,
    `/api/hrx/people/members/${EMPLOYEE}/daily-brief`,
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.source_status.find(({ source }) => source === "outlook").state, "ok");
  assert.deepEqual(
    result.body.data.required_meetings.map(({ title }) => title),
    ["고객 전략 회의"],
  );
  assert.equal(adapterCalls.length, 1);
  assert.match(adapterCalls[0].credential_ref, /^external-vault:/);
  assert.equal(adapterCalls[0].subject_address, "lawyer@example.test");
  const serialized = JSON.stringify({
    response: result,
    cache: runtime.outlookCalendarCache.snapshot(),
    vault: vault.snapshot(),
  });
  const serializedResponse = JSON.stringify(result);
  assert.equal(serialized.includes("discarded-by-external-vault"), false);
  assert.equal(serializedResponse.includes("provider-event-must-not-leak"), false);
  assert.equal(serializedResponse.includes("provider-series-must-not-leak"), false);
  assert.equal(serializedResponse.includes("ical-uid-must-not-leak"), false);
});

test("operational-style runtime without an injected opaque vault fails only Outlook closed", () => {
  const runtime = createHrxRuntimeContext({
    repository: repository(),
    seedRuntimeFixtures: false,
    clock: () => NOW,
    peopleFeatureFlags: peopleFlags(),
  });
  assert.equal(runtime.outlookTokenVault, null);
  assert.equal(runtime.outlookConsentService, null);
  assert.ok(runtime.peopleOutlookCalendarSource);

  const result = request(
    runtime,
    `/api/hrx/people/members/${EMPLOYEE}/daily-brief`,
  );
  assert.equal(result.status, 200);
  assert.equal(result.body.state, "partial");
  const outlook = result.body.source_status.find(({ source }) => source === "outlook");
  assert.equal(outlook.state, "blocked");
  assert.equal(outlook.safe_error_code, "OUTLOOK_TOKEN_VAULT_REQUIRED");
  assert.deepEqual(result.body.data.tasks, { time_bound: [], due_only: [], unscheduled: [] });

  const connection = request(
    runtime,
    `/api/hrx/people/members/${EMPLOYEE}/outlook-connection`,
  );
  assert.equal(connection.status, 200);
  assert.equal(connection.body.connection.connection_state, "reauthorization_required");
  assert.equal(connection.body.connection.safe_error_code, "OUTLOOK_TOKEN_VAULT_REQUIRED");
  const begin = request(
    runtime,
    `/api/hrx/people/members/${EMPLOYEE}/outlook-connection`,
    "POST",
    {
      action: "begin",
      idempotency_key: "people-outlook-begin-runtime-source-001",
    },
  );
  assert.equal(begin.status, 503);
  assert.equal(begin.body.safe_error_code, "OUTLOOK_TOKEN_VAULT_REQUIRED");
});
