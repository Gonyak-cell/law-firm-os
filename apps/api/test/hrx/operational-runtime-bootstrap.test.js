import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createInMemoryHrxMetricsSink } from "../../../../packages/hrx/src/observability.js";
import { createOffboardingSourceVersion } from "../../../../packages/hrx/src/offboarding-evidence.js";
import { createOffboardingCase } from "../../../../packages/hrx/src/offboarding.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createSqlHrxRepository } from "../../../../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { createDurablePeopleOutlookStateAuthority } from "../../../../packages/integrations-core/src/people-outlook-connection.js";
import { createDurablePeopleProviderIdentityRepository } from "../../../../packages/integrations-core/src/people-provider-identity.js";
import {
  createDurableOutlookConsentRepository,
  createTestOnlyInMemoryOpaqueTokenVault,
} from "../../../../packages/integrations-core/src/outlook-token-vault.js";
import {
  createDefaultHrxRuntime,
  resolvePeopleFeatureFlagsFromEnv,
} from "../../src/server.js";
import { handleHrxApiRequest } from "../../src/hrx-runtime-context.js";

const TENANT = "tenant-a";
const ACTOR = "user-hrx-001";
const PAYROLL_SECRET = "operational-runtime-bootstrap-payroll-secret";
const OUTLOOK_EXPIRES_AT = "2099-07-31T00:00:00.000Z";
const TERMINATION_DELIVERY_AT = "2026-07-31T09:00:00.000Z";

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function durableStore() {
  const directory = mkdtempSync(join(tmpdir(), "lawos-people-bootstrap-"));
  return {
    directory,
    store: createFileHrxStore({ filePath: join(directory, "hrx-store.json") }),
  };
}

function seedMember(store) {
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store });
  repository.createEmployee({
    tenant_id: TENANT,
    employee_id: "emp-001",
    display_name: "Ari Kim",
    status: "active",
  });
  repository.createEmploymentProfile({
    tenant_id: TENANT,
    profile_id: "profile-emp-001",
    employee_id: "emp-001",
    employment_type: "full_time",
    status: "active",
    title: "People Operations Lead",
    org_unit_id: "group_people_ops",
    effective_from: "2026-06-20",
  });
  repository.createEmployeeUserLink({
    tenant_id: TENANT,
    link_id: "link-emp-001",
    employee_id: "emp-001",
    user_id: ACTOR,
    purpose: "login_mapping",
    source_ref: "test:operational-runtime-bootstrap",
  });
}

function operationalOpaqueVault() {
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

function permissionContext() {
  return {
    principal: {
      tenant_id: TENANT,
      user_id: ACTOR,
      role_ids: ["staff"],
    },
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

function peopleRequest(runtime, pathname, actorRole, method = "GET", body = {}) {
  return handleHrxApiRequest({
    pathname,
    method,
    body,
    context: runtime,
    matterContext: matterContext(),
    requestContext: {
      tenant_id: TENANT,
      actor_id: ACTOR,
      actor_role: actorRole,
      hrx_scopes: ["hrx.employee.read"],
      session_bound: true,
    },
    permissionContext: permissionContext(),
  });
}

function lifecycleRequest(runtime, pathname, method = "GET", body = {}) {
  return handleHrxApiRequest({
    pathname,
    method,
    body,
    context: runtime,
    matterContext: matterContext(),
    requestContext: {
      tenant_id: TENANT,
      actor_id: "user-people-ops-reviewer",
      actor_role: "hr_admin",
      hrx_scopes: ["hrx.lifecycle.read", "hrx.lifecycle.write"],
      session_bound: true,
    },
  });
}

function installOperationalOffboarding(runtime, offboardingId) {
  const offboarding = createOffboardingCase({
    tenant_id: TENANT,
    offboarding_id: offboardingId,
    employee_id: "emp-001",
    separation_date: "2026-07-31",
    state: "open",
    leave_reconciliation_status: "approved_and_synced",
    leave_reconciliation_evidence_ref: `PayrollProviderReceipt:${offboardingId}`,
    access_revocations: [{
      system_ref: "IdP:core",
      revoked: false,
      confirmation_ref: null,
    }],
  });
  runtime.durableCollections.offboardingCases.insert(offboarding);
  runtime.offboardingCases.push(offboarding);
  return offboarding;
}

function installPendingTerminationDelivery(runtime, offboardingId) {
  const previewReconciliationId = `leave-preview-${offboardingId}`;
  const outboxEventId = `leave-outbox-${offboardingId}`;
  const payload = {
    offboarding_id: offboardingId,
    totals: { unused_minutes: 480 },
    raw_compensation_amount_included: false,
  };
  const offboarding = createOffboardingCase({
    tenant_id: TENANT,
    offboarding_id: offboardingId,
    employee_id: "emp-001",
    separation_date: "2026-07-31",
    state: "open",
    leave_reconciliation_status: "approved_pending_sync",
  });
  runtime.durableCollections.offboardingCases.insert(offboarding);
  runtime.offboardingCases.push(offboarding);
  runtime.leaveManagementStore.query("insert", {
    table: "hrx_leave_termination_reconciliations",
    row: {
      tenant_id: TENANT,
      reconciliation_id: `leave-execute-${offboardingId}`,
      employee_id: "emp-001",
      termination_date: "2026-07-31",
      snapshot_hash: "termination-snapshot-hash",
      state: "approved_pending_sync",
      result_json: JSON.stringify({
        offboarding_id: offboardingId,
        payroll_outbox_event_id: outboxEventId,
        sync_state: "pending",
      }),
      idempotency_key: `termination-execute:${offboardingId}`,
      created_at: TERMINATION_DELIVERY_AT,
      approved_at: TERMINATION_DELIVERY_AT,
      mode: "execute",
      source_version: "termination-source-version",
      preview_reconciliation_id: previewReconciliationId,
      approved_by_actor_id: "user-people-ops-reviewer",
      executed_by_actor_id: "user-people-ops-operator",
      completed_at: null,
    },
  });
  runtime.leaveManagementStore.query("insert", {
    table: "hrx_leave_sync_outbox",
    row: {
      tenant_id: TENANT,
      outbox_event_id: outboxEventId,
      aggregate_type: "LeaveTerminationReconciliation",
      aggregate_id: previewReconciliationId,
      event_type: "leave.termination.payroll_reconciliation_requested",
      payload_json: JSON.stringify(payload),
      idempotency_key: `termination:${offboardingId}:payroll-outbox`,
      state: "pending",
      attempt_count: 0,
      available_at: TERMINATION_DELIVERY_AT,
      delivered_at: null,
      provider_receipt_ref: null,
      last_error_code: null,
      updated_at: TERMINATION_DELIVERY_AT,
      created_at: TERMINATION_DELIVERY_AT,
    },
  });
  return {
    outboxEventId,
    providerReceipt: {
      schema_version: "law-firm-os.hrx.provider-receipt.v0.1",
      receipt_id: `payroll-receipt-${offboardingId}`,
      tenant_id: TENANT,
      provider_kind: "payroll",
      provider_id: "payroll-authority",
      operation: "payroll.termination.reconciliation",
      idempotency_key: `termination:${offboardingId}:payroll-outbox:payroll`,
      payload_hash: `sha256:${createHash("sha256").update(stableStringify(payload)).digest("hex")}`,
      state: "succeeded",
      requested_at: TERMINATION_DELIVERY_AT,
      completed_at: TERMINATION_DELIVERY_AT,
      provider_receipt_ref: `PayrollProviderReceipt:${offboardingId}`,
      error_code: null,
    },
  };
}

test("createDefaultHrxRuntime consumes the same VITE_LAWOS People flags as web and keeps defaults off", () => {
  const off = durableStore();
  const on = durableStore();
  try {
    seedMember(off.store);
    seedMember(on.store);
    const offRuntime = createDefaultHrxRuntime({
      store: off.store,
      runtimeProfile: "operational",
      env: {},
      payrollArtifactSecret: PAYROLL_SECRET,
      compensationKeyMaterial: PAYROLL_SECRET,
    });
    assert.equal(
      peopleRequest(offRuntime, "/api/hrx/people/team-operations", "people_ops").status,
      404,
    );
    assert.equal(
      peopleRequest(offRuntime, "/api/hrx/people/members/emp-001/daily-brief", "staff").status,
      404,
    );

    const sink = createInMemoryHrxMetricsSink();
    const env = {
      VITE_LAWOS_PEOPLE_OVERVIEW: "true",
      VITE_LAWOS_PEOPLE_MEMBER_BRIEF: "true",
    };
    const onRuntime = createDefaultHrxRuntime({
      store: on.store,
      runtimeProfile: "operational",
      env,
      peopleMetricsSink: sink,
      payrollArtifactSecret: PAYROLL_SECRET,
      compensationKeyMaterial: PAYROLL_SECRET,
    });
    assert.equal(onRuntime.peopleFeatureFlags.people_overview, true);
    assert.equal(onRuntime.peopleFeatureFlags.people_member_brief, true);
    assert.equal(
      peopleRequest(onRuntime, "/api/hrx/people/team-operations", "people_ops").status,
      200,
    );
    assert.equal(
      peopleRequest(onRuntime, "/api/hrx/people/members/emp-001/daily-brief", "staff").status,
      200,
    );
    assert.deepEqual(
      sink.list({ tenant_id: TENANT, metric_name: "people.feature.request_count" })
        .map(({ tags }) => tags.feature),
      ["people_overview", "people_member_brief"],
    );

    const resolved = resolvePeopleFeatureFlagsFromEnv(env);
    assert.equal(resolved.people_overview, "true");
    assert.equal(resolved.people_member_brief, "true");
    assert.equal(resolved.outlook_calendar, undefined);
  } finally {
    off.store.close();
    on.store.close();
    rmSync(off.directory, { recursive: true, force: true });
    rmSync(on.directory, { recursive: true, force: true });
  }
});

test("createDefaultHrxRuntime operational Outlook ports complete consent and calendar read without raw token exposure", async () => {
  const value = durableStore();
  try {
    seedMember(value.store);
    const vault = operationalOpaqueVault();
    const peopleProviderIdentityRepository =
      createDurablePeopleProviderIdentityRepository({
        filePath: join(value.directory, "outlook-provider-identities.json"),
      });
    const outlookConsentRepository = createDurableOutlookConsentRepository({
      filePath: join(value.directory, "outlook-consent.json"),
    });
    const outlookStateAuthorityA = createDurablePeopleOutlookStateAuthority({
      filePath: join(value.directory, "outlook-oauth-state.json"),
    });
    const outlookStateAuthorityB = createDurablePeopleOutlookStateAuthority({
      filePath: join(value.directory, "outlook-oauth-state.json"),
    });
    const adapterCalls = [];
    let exchangeCount = 0;
    const runtimeOptions = {
      store: value.store,
      runtimeProfile: "operational",
      clock: () => "2026-07-31T00:00:00.000Z",
      env: {
        VITE_LAWOS_PEOPLE_OVERVIEW: "true",
        VITE_LAWOS_PEOPLE_MEMBER_BRIEF: "true",
        VITE_LAWOS_OUTLOOK_CALENDAR: "true",
      },
      payrollArtifactSecret: PAYROLL_SECRET,
      compensationKeyMaterial: PAYROLL_SECRET,
      peopleProviderIdentityRepository,
      outlookTokenVault: vault,
      outlookConsentRepository,
      outlookCalendarViewAdapter: {
        async read(input) {
          adapterCalls.push(input);
          return {
            events: [{
              provider_event_id: "provider-event-private",
              title: "필수 운영 회의",
              starts_at: `${input.date}T01:00:00.000Z`,
              ends_at: `${input.date}T01:30:00.000Z`,
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
      outlookOauthPort: {
        begin() {
          return {
            state_ref: "outlook-state-operational",
            authorize_url: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
          };
        },
        exchange() {
          exchangeCount += 1;
          return {
            grant_type: "delegated",
            scopes: ["Calendars.ReadBasic"],
            access_token: "test-access-token-not-for-production",
            refresh_token: "test-refresh-token-not-for-production",
            expires_at: OUTLOOK_EXPIRES_AT,
            key_version: "v1",
            provider_subject_id: "m365-subject-operational",
          };
        },
        resolveSubjectAddress() {
          return "lawyer@example.test";
        },
      },
    };
    assert.throws(
      () => createDefaultHrxRuntime(runtimeOptions),
      (error) => error?.safe_error_code === "OUTLOOK_OAUTH_DURABLE_STATE_REQUIRED",
    );
    const runtimeA = createDefaultHrxRuntime({
      ...runtimeOptions,
      outlookStateAuthority: outlookStateAuthorityA,
    });
    const runtimeB = createDefaultHrxRuntime({
      ...runtimeOptions,
      outlookStateAuthority: outlookStateAuthorityB,
    });
    assert.equal(runtimeA.outlookStateAuthority, outlookStateAuthorityA);
    assert.equal(runtimeB.outlookStateAuthority, outlookStateAuthorityB);

    const connectionPath = "/api/hrx/people/members/emp-001/outlook-connection";
    const begun = peopleRequest(runtimeA, connectionPath, "staff", "POST", {
      action: "begin",
      idempotency_key: "people-outlook-begin-operational-001",
    });
    assert.equal(begun.status, 200);
    assert.equal(begun.body.connection.connection_state, "consent_pending");
    const completionPath = "/api/hrx/people/me/outlook-connection/complete";
    const legacyCompletion = peopleRequest(
      runtimeB,
      connectionPath,
      "staff",
      "POST",
      {
        action: "complete",
        authorization_code: "outlook-authorization-code",
        state_ref: "outlook-state-operational",
      },
    );
    assert.equal(legacyCompletion.status, 400);
    assert.equal(
      legacyCompletion.body.safe_error_code,
      "OUTLOOK_CONNECTION_ACTION_INVALID",
    );
    const completed = peopleRequest(runtimeB, completionPath, "staff", "POST", {
      authorization_code: "outlook-authorization-code",
      state_ref: "outlook-state-operational",
    });
    assert.equal(completed.status, 200);
    assert.equal(completed.body.employee_id, "emp-001");
    assert.equal(completed.body.connection.connection_state, "connected");
    const replayed = peopleRequest(runtimeA, completionPath, "staff", "POST", {
      authorization_code: "outlook-authorization-code-replay",
      state_ref: "outlook-state-operational",
    });
    assert.equal(replayed.status, 400);
    assert.equal(replayed.body.safe_error_code, "OUTLOOK_OAUTH_STATE_INVALID");
    assert.equal(exchangeCount, 1);

    const briefPath = "/api/hrx/people/members/emp-001/daily-brief";
    const pending = peopleRequest(runtimeB, briefPath, "staff");
    assert.equal(
      pending.body.source_status.find(({ source }) => source === "outlook").state,
      "blocked",
    );
    await runtimeB.peopleOutlookCalendarSource.whenIdle();
    const connected = peopleRequest(runtimeB, briefPath, "staff");
    assert.equal(
      connected.body.source_status.find(({ source }) => source === "outlook").state,
      "ok",
    );
    assert.deepEqual(
      connected.body.data.required_meetings.map(({ title }) => title),
      ["필수 운영 회의"],
    );
    assert.equal(adapterCalls.length, 1);
    assert.equal(adapterCalls[0].date, "2026-07-31");
    assert.match(adapterCalls[0].credential_ref, /^external-vault:/u);
    const serialized = JSON.stringify({
      response: connected.body,
      cache: runtimeB.outlookCalendarCache.snapshot(),
      vault: vault.snapshot(),
    });
    assert.equal(serialized.includes("test-access-token-not-for-production"), false);
    assert.equal(serialized.includes("test-refresh-token-not-for-production"), false);
    assert.equal(JSON.stringify(connected.body).includes("provider-event-private"), false);
  } finally {
    value.store.close();
    rmSync(value.directory, { recursive: true, force: true });
  }
});

test("createDefaultHrxRuntime passes authoritative offboarding access state and fails closed without it", () => {
  const blockedValue = durableStore();
  const connectedValue = durableStore();
  try {
    seedMember(blockedValue.store);
    seedMember(connectedValue.store);
    const blockedRuntime = createDefaultHrxRuntime({
      store: blockedValue.store,
      runtimeProfile: "operational",
      env: {},
      payrollArtifactSecret: PAYROLL_SECRET,
      compensationKeyMaterial: PAYROLL_SECRET,
    });
    const blockedCase = installOperationalOffboarding(
      blockedRuntime,
      "off-bootstrap-no-access-source",
    );
    const blocked = lifecycleRequest(
      blockedRuntime,
      `/api/hrx/lifecycle/offboarding/${blockedCase.offboarding_id}/close`,
      "POST",
    );
    assert.equal(blocked.status, 503);
    assert.equal(
      blocked.body.safe_error_code,
      "HRX_OFFBOARDING_ACCESS_SOURCE_UNAVAILABLE",
    );

    const evidenceRef = "AccessAuthority:off-bootstrap-connected:IdP:core";
    const sourceVersion = createOffboardingSourceVersion({
      system_ref: "IdP:core",
      revoked: true,
      confirmation_ref: evidenceRef,
    });
    const offboardingAccessSource = Object.freeze({
      read({ tenant_id, offboarding_id, employee_id, system_ref }) {
        return {
          tenant_id,
          offboarding_id,
          employee_id,
          system_ref,
          revoked: true,
          evidence_ref: evidenceRef,
          access_source_version: sourceVersion,
        };
      },
    });
    const connectedRuntime = createDefaultHrxRuntime({
      store: connectedValue.store,
      runtimeProfile: "operational",
      env: {},
      payrollArtifactSecret: PAYROLL_SECRET,
      compensationKeyMaterial: PAYROLL_SECRET,
      offboardingAccessSource,
    });
    assert.equal(connectedRuntime.offboardingAccessSource, offboardingAccessSource);
    const connectedCase = installOperationalOffboarding(
      connectedRuntime,
      "off-bootstrap-connected",
    );
    const evidencePath =
      `/api/hrx/lifecycle/offboarding/${connectedCase.offboarding_id}/evidence`;
    const accessEvidence = lifecycleRequest(
      connectedRuntime,
      evidencePath,
      "POST",
      {
        category: "access_revocation",
        subject_ref: "IdP:core",
        evidence_ref: evidenceRef,
        source_version: sourceVersion,
        valid_until: "2099-12-31T23:59:59.000Z",
      },
    );
    assert.equal(accessEvidence.status, 201);
    assert.equal(accessEvidence.body.receipt.source_version, sourceVersion);
    const leaveEvidence = lifecycleRequest(
      connectedRuntime,
      evidencePath,
      "POST",
      {
        category: "leave_reconciliation",
        subject_ref: "emp-001",
        evidence_ref: `PayrollProviderReceipt:${connectedCase.offboarding_id}`,
        valid_until: "2099-12-31T23:59:59.000Z",
      },
    );
    assert.equal(leaveEvidence.status, 201);

    const closed = lifecycleRequest(
      connectedRuntime,
      `/api/hrx/lifecycle/offboarding/${connectedCase.offboarding_id}/close`,
      "POST",
    );
    assert.equal(closed.status, 200);
    assert.equal(closed.body.offboarding.state, "closed");
    assert.deepEqual(closed.body.account_revocation.revoked_link_ids, [
      "link-emp-001",
    ]);
    const closeAudit = connectedRuntime.audit.list({ tenant_id: TENANT })
      .find((event) =>
        event.action === "hrx.offboarding.close" &&
        event.object_id === connectedCase.offboarding_id);
    assert.equal(
      closeAudit.metadata.access_source_versions[
        "access_revocation:IdP:core"
      ],
      sourceVersion,
    );
  } finally {
    blockedValue.store.close();
    connectedValue.store.close();
    rmSync(blockedValue.directory, { recursive: true, force: true });
    rmSync(connectedValue.directory, { recursive: true, force: true });
  }
});

test("createDefaultHrxRuntime operational profile rejects synthetic payroll secrets and providers", () => {
  const runtimeStore = durableStore();
  try {
    assert.throws(
      () => createDefaultHrxRuntime({
        store: runtimeStore.store,
        runtimeProfile: "operational",
        env: {},
        payrollProviders: {
          allowSyntheticArtifactSecret: true,
          allowSyntheticProviders: true,
        },
      }),
      /payroll artifact encryption requires at least 32 bytes of injected secret material/u,
    );
    const runtime = createDefaultHrxRuntime({
      store: runtimeStore.store,
      runtimeProfile: "operational",
      env: { VITE_LAWOS_OUTLOOK_CALENDAR: "true" },
      payrollArtifactSecret: PAYROLL_SECRET,
      compensationKeyMaterial: PAYROLL_SECRET,
      payrollProviders: {
        allowSyntheticArtifactSecret: true,
        allowSyntheticProviders: true,
      },
    });
    assert.equal(runtime.payrollRuntime.provider_mode, "external-required");
    assert.equal(runtime.payrollRuntime.bankReconciliationPort, null);
    assert.equal(runtime.peopleFeatureFlags.people_overview, false);
    assert.equal(runtime.outlookTokenVault, null);
    assert.equal(
      runtime.peopleOutlookCalendarSource.read({
        tenant_id: TENANT,
        employee_ids: ["emp-001"],
        as_of: "2026-07-31",
      }).safe_error_code,
      "OUTLOOK_TOKEN_VAULT_REQUIRED",
    );
  } finally {
    runtimeStore.store.close();
    rmSync(runtimeStore.directory, { recursive: true, force: true });
  }
});

test("createDefaultHrxRuntime passes an authoritative payroll leave provider to termination evidence recording", () => {
  const runtimeStore = durableStore();
  try {
    seedMember(runtimeStore.store);
    const runtime = createDefaultHrxRuntime({
      store: runtimeStore.store,
      runtimeProfile: "operational",
      env: {},
      payrollArtifactSecret: PAYROLL_SECRET,
      compensationKeyMaterial: PAYROLL_SECRET,
      leaveIntegrationProviders: {
        payroll: {
          operational_authority: true,
          provider_id: "payroll-authority",
        },
      },
      leaveIntegrationProviderEnabled: { payroll: true },
    });
    const delivery = installPendingTerminationDelivery(
      runtime,
      "off-bootstrap-payroll-evidence",
    );

    const result = runtime.leaveTerminationService.recordPayrollDelivery(
      {
        tenant_id: TENANT,
        actor_id: "user-people-ops-operator",
      },
      {
        outbox_event_id: delivery.outboxEventId,
        provider_receipt: delivery.providerReceipt,
      },
    );

    assert.equal(result.state, "approved_and_synced");
    const offboarding = runtime.leaveManagementStore.query("selectOne", {
      table: "hrx_offboarding_cases",
      where: {
        tenant_id: TENANT,
        offboarding_id: "off-bootstrap-payroll-evidence",
      },
    });
    assert.equal(
      offboarding.leave_reconciliation_status,
      "approved_and_synced",
    );
    assert.equal(
      offboarding.leave_reconciliation_evidence_ref,
      "PayrollProviderReceipt:off-bootstrap-payroll-evidence",
    );
  } finally {
    runtimeStore.store.close();
    rmSync(runtimeStore.directory, { recursive: true, force: true });
  }
});
