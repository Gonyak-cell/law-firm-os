import assert from "node:assert/strict";
import test from "node:test";

import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import {
  M365_GRAPH_ERROR_CODES,
} from "../../../packages/email-dms/src/m365-graph-connection-service.js";
import {
  createEmailDmsRepository,
} from "../../../packages/email-dms/src/repository.js";
import {
  createCrmRuntimeRepository,
  createLead,
  scheduleCrmConsultation,
  transitionLeadInquiryStatus,
  updateCrmConsultation,
} from "../../../packages/crm/src/index.js";
import {
  handleCrmIntakeApiRequest,
} from "../src/crm-intake-runtime-context.js";

const TENANT = "tenant_outlook_consultation_api";
const USER = "user_outlook_consultation_api";
const SUBJECT = "entra_subject_outlook_consultation_api";
const LEAD_ID = "lead_outlook_consultation_api";
const PARTY_ID = "party_outlook_consultation_api";
const WEB_LINK_PREFIX =
  "https://outlook.office.com/calendar/item/";

function permissionContext({ allowed = true, tenant_id = TENANT } = {}) {
  return {
    principal: {
      ok: true,
      source: "api-signed-session",
      header_only_trust_allowed: false,
      tenant_id,
      user_id: USER,
      entra_subject_id: SUBJECT,
      role_ids: ["lawos_staff"],
    },
    rules: allowed
      ? [{
          id: "crm-consultation-calendar-create",
          effect: "allow",
          action_prefix: "crm:consultation:",
        }]
      : [],
    object_acl: [],
  };
}

function scheduledConsultation(repository) {
  createLead({
    repository,
    lead: {
      lead_id: LEAD_ID,
      tenant_id: TENANT,
      party_id: PARTY_ID,
      display_name: "비공개 고객 이름",
      status: "active",
      owner_user_id: USER,
      source: "manual",
      received_at: "2026-07-30T08:00:00.000Z",
      next_action: "문의 확인",
    },
    actor_id: USER,
    idempotency_key: "create-outlook-consultation-lead",
  });
  transitionLeadInquiryStatus({
    repository,
    tenant_id: TENANT,
    lead_id: LEAD_ID,
    next_inquiry_status: "reviewing",
    expected_version: 1,
    next_action: "상담 일정 확인",
    reason: "문의 확인",
    actor_id: USER,
    idempotency_key: "review-outlook-consultation-lead",
  });
  return scheduleCrmConsultation({
    repository,
    tenant_id: TENANT,
    lead_id: LEAD_ID,
    consultation: {
      subject: "비공개 고객 이름의 상담 내용",
      scheduled_start: "2026-08-01T10:00:00+09:00",
      scheduled_end: "2026-08-01T11:00:00+09:00",
      timezone: "Asia/Seoul",
      next_action: "상담 준비",
    },
    expected_inquiry_version: 2,
    reason: "상담 예약",
    actor_id: USER,
    idempotency_key: "schedule-outlook-consultation",
  }).activity;
}

function emailDmsRepository({
  granted_scopes = M365_GRAPH_REQUIRED_SCOPES,
  expires_at = "2026-08-30T08:00:00.000Z",
} = {}) {
  return createEmailDmsRepository({
    seedRecords: [{
      model_type: "M365Connection",
      m365_connection_id: m365ConnectionId({
        tenant_id: TENANT,
        user_id: USER,
      }),
      tenant_id: TENANT,
      user_id: USER,
      entra_subject_id: SUBJECT,
      mailbox_address_hash: hashMailboxAddress(
        "calendar-user@example.invalid",
      ),
      credential_ref:
        "aws-secrets-manager:synthetic/outlook-consultation-api",
      granted_scopes: [...granted_scopes],
      consented_at: "2026-07-30T08:00:00.000Z",
      expires_at,
      revoked_at: null,
      state_version: 1,
    }],
  });
}

function fixture({
  feature_enabled = true,
  provider_runtime_enabled = true,
  crm_repository = null,
} = {}) {
  const baseCrmRepository =
    crm_repository ?? createCrmRuntimeRepository();
  const activity = scheduledConsultation(baseCrmRepository);
  const events = new Map();
  const providerInputs = [];
  let providerCalls = 0;
  const m365GraphConfig = {
    feature_enabled,
    provider_runtime_enabled,
    clock: () => new Date("2026-07-30T09:00:00.000Z"),
    credential_vault: {
      referenceForGeneration({
        entra_subject_id,
        credential_generation,
      }) {
        return `aws-secrets-manager:synthetic/outlook-consultation-api/${entra_subject_id}/${credential_generation}`;
      },
      async resolveDelegatedCredential() {
        return {
          access_token:
            "outlook-consultation-access-token-never-return",
          refresh_token:
            "outlook-consultation-refresh-token-never-return",
          mailbox_address: "calendar-user@example.invalid",
          refresh_profile: "client",
          refresh_profile_proof: "c".repeat(43),
          expires_at: "2026-08-30T08:00:00.000Z",
          granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
        };
      },
      async storeDelegatedCredential() {
        throw new Error("unexpected credential refresh in consultation test");
      },
      async deleteDelegatedCredential() {},
    },
    provider: {
      async createMeCalendarEvent(input) {
        providerCalls += 1;
        providerInputs.push(structuredClone({
          ...input,
          credential: null,
        }));
        assert.equal(input.mailbox_scope, "me");
        if (!events.has(input.transaction_id)) {
          const eventNumber = events.size + 1;
          events.set(input.transaction_id, {
            event_id: `graph-event-${eventNumber}`,
            web_link: `${WEB_LINK_PREFIX}graph-event-${eventNumber}`,
          });
        }
        return {
          ...events.get(input.transaction_id),
          provider_request_id:
            `provider-request-${providerCalls}`,
        };
      },
    },
  };
  return {
    activity,
    baseCrmRepository,
    events,
    providerInputs,
    m365GraphConfig,
    get provider_calls() {
      return providerCalls;
    },
    runtime(crmRepository = baseCrmRepository) {
      return {
        crmRepository,
        emailDmsRuntime: {
          repository: emailDmsRepository(),
        },
        m365GraphConfig,
      };
    },
  };
}

function request({
  activityId,
  runtime,
  body = {},
  context = permissionContext(),
  requestId = "request-outlook-consultation-api",
} = {}) {
  return handleCrmIntakeApiRequest({
    pathname:
      `/api/crm/consultations/${encodeURIComponent(activityId)}/outlook-event`,
    method: "POST",
    query: {},
    body: {
      tenant_id: TENANT,
      permission_ref: "perm:crm:consultation:calendar",
      audit_hint_ref: "audit:crm:consultation:calendar",
      expected_version: 1,
      reason: "Outlook 일정 만들기 버튼을 누름",
      idempotency_key: "outlook-consultation-create-1",
      ...body,
    },
    context,
    requestId,
    runtime,
  });
}

test("CRM Outlook 일정 refresh도 outer request compensator를 전달한다", async () => {
  const value = fixture();
  const failures = [];
  const postCommitActions = [];
  const currentRef =
    "aws-secrets-manager:synthetic/outlook-consultation-api";
  const nextRef = `${currentRef}/${SUBJECT}/m365-connection-state-2`;
  const refreshedExpiresAt = "2026-07-30T11:00:00.000Z";
  const credentials = new Map([[currentRef, {
    access_token: "expiring-calendar-access-token",
    refresh_token: "expiring-calendar-refresh-token",
    mailbox_address: "calendar-user@example.invalid",
    refresh_profile: "client",
    refresh_profile_proof: "c".repeat(43),
    expires_at: "2026-07-30T09:00:30.000Z",
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
  }]]);
  const runtime = {
    crmRepository: value.baseCrmRepository,
    emailDmsRuntime: {
      repository: emailDmsRepository({
        expires_at: "2026-07-30T09:00:30.000Z",
      }),
      request_failure_compensator: {
        register(action) {
          failures.push(action);
        },
        registerPostCommit(action) {
          postCommitActions.push(action);
        },
      },
    },
    m365GraphConfig: {
      ...value.m365GraphConfig,
      credential_vault: {
        referenceForGeneration({
          entra_subject_id,
          credential_generation,
        }) {
          return `${currentRef}/${entra_subject_id}/${credential_generation}`;
        },
        async resolveDelegatedCredential({ credential_ref }) {
          if (!credentials.has(credential_ref)) {
            throw Object.assign(new Error("credential not found"), {
              name: "ResourceNotFoundException",
            });
          }
          return structuredClone(credentials.get(credential_ref));
        },
        async storeDelegatedCredential({
          credential_ref,
          credential_generation,
          token_bundle,
        }) {
          assert.equal(credential_ref, undefined);
          assert.equal(credential_generation, "m365-connection-state-2");
          credentials.set(nextRef, structuredClone(token_bundle));
          return nextRef;
        },
        async deleteDelegatedCredential({ credential_ref }) {
          credentials.delete(credential_ref);
        },
      },
      provider: {
        ...value.m365GraphConfig.provider,
        async refreshDelegatedCredential({ credential }) {
          return {
            expires_at: refreshedExpiresAt,
            token_bundle: {
              ...credential,
              access_token: "rotated-calendar-access-token",
              refresh_token: "rotated-calendar-refresh-token",
              refresh_profile_proof: "r".repeat(43),
              expires_at: refreshedExpiresAt,
            },
          };
        },
      },
    },
  };

  const response = await request({
    activityId: value.activity.crm_activity_id,
    runtime,
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(failures.length, 0);
  assert.equal(postCommitActions.length, 1);
  const stored = runtime.emailDmsRuntime.repository.list({
    tenant_id: TENANT,
    model_type: "M365Connection",
  })[0];
  assert.equal(stored.credential_ref, nextRef);
  assert.deepEqual(stored.pending_vault_cleanup_refs, [currentRef]);
});

test("VC-CL-CON-002 / CL-P3-W02-T04 사용자가 누른 일정 생성은 재클릭해도 Graph event 한 건만 보존한다", async () => {
  const value = fixture();
  assert.equal(value.provider_calls, 0);
  assert.equal(value.events.size, 0);

  const first = await request({
    activityId: value.activity.crm_activity_id,
    runtime: value.runtime(),
  });
  assert.equal(first.status, 201);
  assert.equal(first.body.outcome, "outlook_event_created");
  assert.equal(first.body.provider_call_executed, true);
  assert.equal(first.body.item.outlook_calendar.state, "linked");
  assert.equal(
    first.body.item.outlook_calendar.web_link,
    `${WEB_LINK_PREFIX}graph-event-1`,
  );
  assert.equal(
    first.body.item.outlook_calendar.automatic_sync_enabled,
    false,
  );
  assert.equal(
    first.body.item.outlook_calendar
      .provider_event_identifier_included,
    false,
  );

  const replay = await request({
    activityId: value.activity.crm_activity_id,
    runtime: value.runtime(),
    body: {
      idempotency_key: "outlook-consultation-create-2",
    },
    requestId: "request-outlook-consultation-api-replay",
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(replay.body.provider_call_executed, false);
  assert.equal(value.provider_calls, 1);
  assert.equal(value.events.size, 1);
  assert.equal(
    replay.body.item.outlook_calendar.web_link,
    first.body.item.outlook_calendar.web_link,
  );
  const conflictingReplay = await request({
    activityId: value.activity.crm_activity_id,
    runtime: value.runtime(),
    body: {
      reason: "같은 요청키에 다른 사유",
    },
    requestId: "request-outlook-consultation-api-conflict",
  });
  assert.equal(conflictingReplay.status, 409);
  assert.equal(value.provider_calls, 1);
  assert.equal(value.events.size, 1);

  assert.deepEqual(value.providerInputs[0].event, {
    subject: "법률 상담",
    start_at: "2026-08-01T01:00:00.000Z",
    end_at: "2026-08-01T02:00:00.000Z",
    time_zone: "UTC",
    sensitivity: "private",
    show_as: "busy",
  });
  const responseText = JSON.stringify([first.body, replay.body]);
  assert.equal(
    value.providerInputs[0].event.subject.includes("비공개 고객 이름"),
    false,
  );
  assert.equal(
    responseText.includes(value.providerInputs[0].transaction_id),
    false,
  );
  assert.equal(responseText.includes("access-token"), false);
  assert.equal(responseText.includes("refresh-token"), false);

  const stored = value.baseCrmRepository.get({
    tenant_id: TENANT,
    model_type: "CRMActivity",
    crm_activity_id: value.activity.crm_activity_id,
  });
  assert.equal(stored.version, 2);
  assert.equal(
    stored.outlook_event_id,
    "graph-event-1",
  );
  assert.equal(
    stored.outlook_event_transaction_id,
    value.providerInputs[0].transaction_id,
  );
  assert.equal(
    stored.outlook_event_web_link,
    first.body.item.outlook_calendar.web_link,
  );

  updateCrmConsultation({
    repository: value.baseCrmRepository,
    tenant_id: TENANT,
    activity_id: value.activity.crm_activity_id,
    expected_version: 2,
    field_updates: {
      scheduled_start: "2026-08-01T10:30:00+09:00",
      scheduled_end: "2026-08-01T11:30:00+09:00",
      timezone: "Asia/Seoul",
    },
    reason: "앱에서 상담 시간을 변경함",
    actor_id: USER,
    idempotency_key: "outlook-consultation-reschedule",
  });
  const changedSchedule = await request({
    activityId: value.activity.crm_activity_id,
    runtime: value.runtime(),
    body: {
      expected_version: 3,
      idempotency_key: "outlook-consultation-create-3",
    },
    requestId: "request-outlook-consultation-api-changed-schedule",
  });
  assert.equal(changedSchedule.status, 200);
  assert.equal(
    changedSchedule.body.item.outlook_calendar.state,
    "update_required",
  );
  assert.equal(changedSchedule.body.provider_call_executed, false);
  assert.equal(value.provider_calls, 1);
});

test("CL-P3-W02-T04 Graph 연동이 꺼지면 제품 상태와 provider 호출 없이 명시적으로 차단한다", async () => {
  const value = fixture({ feature_enabled: false });
  const before = value.baseCrmRepository.snapshot();
  const response = await request({
    activityId: value.activity.crm_activity_id,
    runtime: value.runtime(),
  });

  assert.equal(response.status, 503);
  assert.deepEqual(
    response.body.safe_error_codes,
    [M365_GRAPH_ERROR_CODES.feature_disabled],
  );
  assert.equal(value.provider_calls, 0);
  assert.equal(value.events.size, 0);
  assert.deepEqual(value.baseCrmRepository.snapshot(), before);
});

test("CL-P3-W02-T04 권한·version·provider 식별값 입력은 Graph 호출 전에 fail-closed로 막는다", async () => {
  const value = fixture();
  const runtime = value.runtime();
  const denied = await request({
    activityId: value.activity.crm_activity_id,
    runtime,
    context: permissionContext({ allowed: false }),
  });
  assert.equal(denied.status, 403);

  const stale = await request({
    activityId: value.activity.crm_activity_id,
    runtime,
    body: {
      expected_version: 2,
      idempotency_key: "outlook-consultation-stale",
    },
  });
  assert.equal(stale.status, 409);

  const injected = await request({
    activityId: value.activity.crm_activity_id,
    runtime,
    body: {
      event_id: "client-supplied-event",
      idempotency_key: "outlook-consultation-injected",
    },
  });
  assert.equal(injected.status, 400);

  const otherTenant = await request({
    activityId: value.activity.crm_activity_id,
    runtime,
    body: {
      tenant_id: "tenant_other",
      idempotency_key: "outlook-consultation-other-tenant",
    },
  });
  assert.equal(otherTenant.status, 403);
  assert.equal(value.provider_calls, 0);
  assert.equal(value.events.size, 0);
});

test("VC-CL-CON-002 / CL-P3-W02-T04 Graph 성공 뒤 로컬 저장 실패를 재실행하면 같은 transaction ID로 같은 event를 복구한다", async () => {
  const value = fixture();
  let failOnce = true;
  const flakyRepository = Object.freeze({
    ...value.baseCrmRepository,
    transaction(fn) {
      if (failOnce) {
        failOnce = false;
        throw Object.assign(
          new Error("synthetic CRM persistence failure"),
          {
            safe_error_code: "CRM_STORAGE_WRITE_FAILED",
            status: 503,
          },
        );
      }
      return value.baseCrmRepository.transaction(fn);
    },
  });
  const runtime = value.runtime(flakyRepository);
  const first = await request({
    activityId: value.activity.crm_activity_id,
    runtime,
    requestId: "request-outlook-consultation-write-failure",
  });
  assert.equal(first.status, 503);
  assert.equal(value.provider_calls, 1);
  assert.equal(value.events.size, 1);
  assert.equal(
    value.baseCrmRepository.get({
      tenant_id: TENANT,
      model_type: "CRMActivity",
      crm_activity_id: value.activity.crm_activity_id,
    }).outlook_event_id,
    null,
  );

  const recovered = await request({
    activityId: value.activity.crm_activity_id,
    runtime,
    requestId: "request-outlook-consultation-write-retry",
  });
  assert.equal(recovered.status, 201);
  assert.equal(value.provider_calls, 2);
  assert.equal(value.events.size, 1);
  assert.equal(
    value.providerInputs[0].transaction_id,
    value.providerInputs[1].transaction_id,
  );
  assert.equal(
    value.baseCrmRepository.get({
      tenant_id: TENANT,
      model_type: "CRMActivity",
      crm_activity_id: value.activity.crm_activity_id,
    }).outlook_event_id,
    "graph-event-1",
  );
});
