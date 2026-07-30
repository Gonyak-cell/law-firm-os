import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CRM_CONSULTATION_ERROR_CODES,
  createCrmRuntimeRepository,
  createLead,
  normalizeCrmActivityFields,
  scheduleCrmConsultation,
  transitionLeadInquiryStatus,
  updateCrmConsultation,
} from "../src/index.js";

const TENANT = "tenant_client_consultation_t03";
const LEAD_ID = "lead_client_consultation_t03";
const PARTY_ID = "party_client_consultation_t03";
const ACTOR = "user_client_consultation_t03";
const SCHEDULED_START = "2026-08-01T10:00:00+09:00";
const SCHEDULED_END = "2026-08-01T11:00:00+09:00";

function prepareReviewingInquiry(repository, {
  lead_id = LEAD_ID,
  party_id = PARTY_ID,
} = {}) {
  createLead({
    repository,
    lead: {
      lead_id,
      tenant_id: TENANT,
      party_id,
      display_name: "가나다 주식회사 상담 문의",
      status: "active",
      owner_user_id: ACTOR,
      source: "outlook_addin",
      received_at: "2026-07-30T08:55:00.000Z",
      next_action: "문의 확인",
    },
    actor_id: ACTOR,
    idempotency_key: `create-${lead_id}`,
  });
  return transitionLeadInquiryStatus({
    repository,
    tenant_id: TENANT,
    lead_id,
    next_inquiry_status: "reviewing",
    expected_version: 1,
    next_action: "상담 일정 확인",
    reason: "문의 내용을 확인함",
    actor_id: ACTOR,
    idempotency_key: `review-${lead_id}`,
    clock: () => new Date("2026-07-30T09:00:00.000Z"),
  }).lead;
}

function schedule(repository, overrides = {}) {
  const {
    consultation: consultationOverrides = {},
    ...commandOverrides
  } = overrides;
  return scheduleCrmConsultation({
    repository,
    tenant_id: TENANT,
    lead_id: LEAD_ID,
    consultation: {
      subject: "초기 상담",
      scheduled_start: SCHEDULED_START,
      scheduled_end: SCHEDULED_END,
      timezone: "Asia/Seoul",
      next_action: "상담 준비",
      ...consultationOverrides,
    },
    expected_inquiry_version: 2,
    reason: "의뢰인과 상담 일정을 확정함",
    actor_id: ACTOR,
    idempotency_key: "schedule-consultation-1",
    clock: () => new Date("2026-07-30T09:10:00.000Z"),
    ...commandOverrides,
  });
}

function update(repository, activityId, overrides = {}) {
  return updateCrmConsultation({
    repository,
    tenant_id: TENANT,
    activity_id: activityId,
    expected_version: 1,
    field_updates: {
      scheduled_start: "2026-08-01T10:30:00+09:00",
      scheduled_end: "2026-08-01T11:30:00+09:00",
      timezone: "Asia/Seoul",
    },
    reason: "의뢰인 요청으로 상담 시간을 변경함",
    actor_id: ACTOR,
    idempotency_key: "update-consultation-1",
    clock: () => new Date("2026-07-30T09:20:00.000Z"),
    ...overrides,
  });
}

test("VC-CL-CON-001 / CL-P3-W02-T03 상담 시각은 명시된 오프셋을 UTC로 저장하고 IANA 시간대를 검증한다", () => {
  const fields = normalizeCrmActivityFields({
    activity_kind: "consultation",
    activity_type: "meeting",
    lead_id: LEAD_ID,
    scheduled_start: SCHEDULED_START,
    scheduled_end: SCHEDULED_END,
    timezone: "Asia/Seoul",
    next_action: "상담 준비",
  });
  assert.equal(fields.scheduled_start, "2026-08-01T01:00:00.000Z");
  assert.equal(fields.scheduled_end, "2026-08-01T02:00:00.000Z");
  assert.equal(fields.timezone, "Asia/Seoul");
  assert.equal(fields.version, 1);

  const midnightBoundary = normalizeCrmActivityFields({
    activity_kind: "consultation",
    activity_type: "meeting",
    lead_id: LEAD_ID,
    scheduled_start: "2026-08-01T00:15:00+09:00",
    scheduled_end: "2026-08-01T01:15:00+09:00",
    timezone: "Asia/Seoul",
  });
  assert.equal(
    midnightBoundary.scheduled_start,
    "2026-07-31T15:15:00.000Z",
  );
  assert.equal(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: midnightBoundary.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(midnightBoundary.scheduled_start)),
    "2026-08-01",
  );

  assert.throws(
    () => normalizeCrmActivityFields({
      ...fields,
      activity_type: "meeting",
      timezone: "Korea/Invalid",
    }),
    /valid IANA timezone/,
  );
  assert.throws(
    () => normalizeCrmActivityFields({
      ...fields,
      activity_type: "meeting",
      scheduled_end: fields.scheduled_start,
    }),
    /must be after scheduled_start/,
  );
  assert.throws(
    () => normalizeCrmActivityFields({
      ...fields,
      activity_type: "meeting",
      outcome: "상담 결과",
    }),
    /outcome requires completed_at/,
  );
  assert.throws(
    () => normalizeCrmActivityFields({
      ...fields,
      activity_type: "meeting",
      completed_at: "2026-08-01T02:00:00.000Z",
    }),
    /requires outcome/,
  );
});

test("VC-CL-CON-001 / CL-P3-W02-T03 확인 중 문의에 상담을 예약하고 Lead와 Activity version을 함께 올린다", () => {
  const repository = createCrmRuntimeRepository();
  prepareReviewingInquiry(repository);

  const result = schedule(repository);
  assert.equal(result.outcome, "scheduled");
  assert.equal(result.activity.activity_kind, "consultation");
  assert.equal(result.activity.activity_type, "meeting");
  assert.equal(result.activity.lead_id, LEAD_ID);
  assert.equal(result.activity.party_id, PARTY_ID);
  assert.equal(result.activity.scheduled_start, "2026-08-01T01:00:00.000Z");
  assert.equal(result.activity.scheduled_end, "2026-08-01T02:00:00.000Z");
  assert.equal(result.activity.timezone, "Asia/Seoul");
  assert.equal(result.activity.version, 1);
  assert.equal(result.lead.version, 3);
  assert.equal(result.lead.next_action, "상담 준비");
  assert.equal("matter_id" in result.activity, false);

  const audit = repository.listAudit({
    tenant_id: TENANT,
    object_id: result.activity.crm_activity_id,
  }).at(-1);
  assert.equal(audit.action, "crm.consultation.scheduled");
  assert.equal(audit.metadata.consultation.raw_consultation_content_included, false);
  assert.equal(JSON.stringify(audit).includes("초기 상담"), false);
});

test("VC-CL-CON-001 / CL-P3-W02-T03 같은 예약은 재생하고 같은 키의 다른 요청은 상태 변경 없이 막는다", () => {
  const repository = createCrmRuntimeRepository();
  prepareReviewingInquiry(repository);
  const first = schedule(repository);
  const beforeReplay = repository.snapshot();

  const replay = schedule(repository);
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(replay.activity, first.activity);
  assert.deepEqual(repository.snapshot(), beforeReplay);

  assert.throws(
    () => schedule(repository, {
      consultation: {
        scheduled_end: "2026-08-01T11:30:00+09:00",
      },
    }),
    (error) => (
      error.safe_error_code
      === CRM_CONSULTATION_ERROR_CODES.idempotency_conflict
    ),
  );
  assert.deepEqual(repository.snapshot(), beforeReplay);
});

test("VC-CL-CON-001 / CL-P3-W02-T03 stale 문의·미확인 문의·중복 미완료 상담은 원자적으로 거부한다", () => {
  const repository = createCrmRuntimeRepository();
  prepareReviewingInquiry(repository);
  const beforeStale = repository.snapshot();
  assert.throws(
    () => schedule(repository, {
      expected_inquiry_version: 1,
      idempotency_key: "schedule-stale",
    }),
    (error) => (
      error.safe_error_code
      === CRM_CONSULTATION_ERROR_CODES.inquiry_version_conflict
    ),
  );
  assert.deepEqual(repository.snapshot(), beforeStale);

  schedule(repository);
  const beforeDuplicate = repository.snapshot();
  assert.throws(
    () => schedule(repository, {
      expected_inquiry_version: 3,
      idempotency_key: "schedule-duplicate",
    }),
    (error) => (
      error.safe_error_code
      === CRM_CONSULTATION_ERROR_CODES.active_consultation_exists
    ),
  );
  assert.deepEqual(repository.snapshot(), beforeDuplicate);

  const anotherRepository = createCrmRuntimeRepository();
  createLead({
    repository: anotherRepository,
    lead: {
      lead_id: LEAD_ID,
      tenant_id: TENANT,
      party_id: PARTY_ID,
      display_name: "미확인 문의",
      status: "active",
      owner_user_id: ACTOR,
      source: "manual",
      received_at: "2026-07-30T08:55:00.000Z",
    },
    actor_id: ACTOR,
    idempotency_key: "create-unreviewed",
  });
  const beforeInvalidState = anotherRepository.snapshot();
  assert.throws(
    () => schedule(anotherRepository, {
      expected_inquiry_version: 1,
      idempotency_key: "schedule-unreviewed",
    }),
    (error) => (
      error.safe_error_code
      === CRM_CONSULTATION_ERROR_CODES.inquiry_state_invalid
    ),
  );
  assert.deepEqual(anotherRepository.snapshot(), beforeInvalidState);

  const engagementRepository = createCrmRuntimeRepository();
  prepareReviewingInquiry(engagementRepository);
  engagementRepository.create({
    model_type: "Opportunity",
    opportunity_id: "opportunity_consultation_already_reviewing",
    tenant_id: TENANT,
    lead_id: LEAD_ID,
    party_id: PARTY_ID,
    display_name: "이미 시작된 수임 검토",
    stage: "qualified",
    status: "active",
    owner_user_id: ACTOR,
  });
  const beforeEngagementReview = engagementRepository.snapshot();
  assert.throws(
    () => schedule(engagementRepository, {
      idempotency_key: "schedule-after-engagement-review",
    }),
    (error) => (
      error.safe_error_code
      === CRM_CONSULTATION_ERROR_CODES.inquiry_state_invalid
    ),
  );
  assert.deepEqual(
    engagementRepository.snapshot(),
    beforeEngagementReview,
  );
});

test("VC-CL-CON-001 / CL-P3-W02-T03 상담을 변경·완료하면 Activity와 Lead의 다음 행동을 버전과 함께 갱신한다", () => {
  const repository = createCrmRuntimeRepository();
  prepareReviewingInquiry(repository);
  const scheduled = schedule(repository);
  const activityId = scheduled.activity.crm_activity_id;

  const rescheduled = update(repository, activityId);
  assert.equal(rescheduled.outcome, "updated");
  assert.equal(rescheduled.activity.scheduled_start, "2026-08-01T01:30:00.000Z");
  assert.equal(rescheduled.activity.scheduled_end, "2026-08-01T02:30:00.000Z");
  assert.equal(rescheduled.activity.version, 2);
  assert.equal(rescheduled.lead, null);
  const beforeReplay = repository.snapshot();
  const replay = update(repository, activityId);
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(replay.activity, rescheduled.activity);
  assert.deepEqual(repository.snapshot(), beforeReplay);
  assert.throws(
    () => update(repository, activityId, {
      field_updates: {
        scheduled_start: "2026-08-01T10:30:00+09:00",
        scheduled_end: "2026-08-01T12:00:00+09:00",
        timezone: "Asia/Seoul",
      },
    }),
    (error) => (
      error.safe_error_code
      === CRM_CONSULTATION_ERROR_CODES.idempotency_conflict
    ),
  );
  assert.deepEqual(repository.snapshot(), beforeReplay);

  const completed = update(repository, activityId, {
    expected_version: 2,
    field_updates: {
      completed_at: "2026-08-01T11:35:00+09:00",
      outcome: "수임 조건과 이해충돌 확인 절차를 안내함",
      next_action: "수임 여부 검토",
    },
    reason: "상담을 완료하고 후속 조치를 기록함",
    idempotency_key: "complete-consultation-1",
    clock: () => new Date("2026-08-01T02:36:00.000Z"),
  });
  assert.equal(completed.outcome, "completed");
  assert.equal(completed.activity.completed_at, "2026-08-01T02:35:00.000Z");
  assert.equal(completed.activity.version, 3);
  assert.equal(completed.lead.next_action, "수임 여부 검토");
  assert.equal(completed.lead.version, 4);

  const audit = repository.listAudit({
    tenant_id: TENANT,
    object_id: activityId,
  }).at(-1);
  assert.equal(audit.action, "crm.consultation.completed");
  assert.equal(audit.metadata.raw_consultation_content_included, false);
  assert.equal(
    JSON.stringify(audit).includes("수임 조건과 이해충돌 확인 절차"),
    false,
  );
});

test("VC-CL-CON-001 / CL-P3-W02-T03 완료 상담은 불변이며 stale·무효 변경은 기록을 남기지 않는다", () => {
  const repository = createCrmRuntimeRepository();
  prepareReviewingInquiry(repository);
  const scheduled = schedule(repository);
  const activityId = scheduled.activity.crm_activity_id;
  const beforeConfidentialChange = repository.snapshot();
  assert.throws(
    () => update(repository, activityId, {
      field_updates: { confidential: true },
      idempotency_key: "confidential-without-permission",
    }),
    (error) => (
      error.safe_error_code
      === CRM_CONSULTATION_ERROR_CODES.update_invalid
    ),
  );
  assert.deepEqual(repository.snapshot(), beforeConfidentialChange);
  update(repository, activityId, {
    field_updates: {
      completed_at: "2026-08-01T11:05:00+09:00",
      outcome: "상담 완료",
      next_action: "수임 여부 검토",
    },
    reason: "상담 완료",
    idempotency_key: "complete-consultation",
  });
  const completedSnapshot = repository.snapshot();

  assert.throws(
    () => update(repository, activityId, {
      expected_version: 2,
      field_updates: {
        scheduled_start: "2026-08-01T12:00:00+09:00",
        scheduled_end: "2026-08-01T13:00:00+09:00",
      },
      idempotency_key: "change-completed",
    }),
    (error) => (
      error.safe_error_code
      === CRM_CONSULTATION_ERROR_CODES.update_invalid
    ),
  );
  assert.throws(
    () => update(repository, activityId, {
      expected_version: 1,
      field_updates: { next_action: "다른 다음 행동" },
      idempotency_key: "stale-update",
    }),
    (error) => (
      error.safe_error_code
      === CRM_CONSULTATION_ERROR_CODES.version_conflict
    ),
  );
  assert.throws(
    () => update(repository, activityId, {
      expected_version: 2,
      field_updates: { next_action: "수임 여부 검토" },
      idempotency_key: "no-effect-update",
    }),
    (error) => (
      error.safe_error_code
      === CRM_CONSULTATION_ERROR_CODES.update_invalid
    ),
  );
  assert.deepEqual(repository.snapshot(), completedSnapshot);
});

test("VC-CL-CON-001 / CL-P3-W02-T03 비밀 상담과 멱등 기록은 파일 저장소를 다시 열어도 원문 없이 유지된다", () => {
  const root = mkdtempSync(join(tmpdir(), "lawos-consultation-t03-"));
  const filePath = join(root, "crm.json");
  try {
    const repository = createCrmRuntimeRepository({ filePath });
    prepareReviewingInquiry(repository);
    const first = schedule(repository, {
      consultation: {
        confidential: true,
        subject: "비밀 상담 제목",
        next_action: "비밀 후속 행동",
      },
      permission_ref: "perm:crm:consultation:secret",
    });
    const activityId = first.activity.crm_activity_id;
    repository.close();

    const reopened = createCrmRuntimeRepository({ filePath });
    const stored = reopened.get({
      tenant_id: TENANT,
      model_type: "CRMActivity",
      crm_activity_id: activityId,
    });
    assert.equal(stored.confidential, true);
    assert.equal(stored.version, 1);
    assert.equal(
      schedule(reopened, {
        consultation: {
          confidential: true,
          subject: "비밀 상담 제목",
          next_action: "비밀 후속 행동",
        },
        permission_ref: "perm:crm:consultation:secret",
      }).idempotent_replay,
      true,
    );
    const audits = reopened.listAudit({ tenant_id: TENANT });
    assert.equal(JSON.stringify(audits).includes("비밀 상담 제목"), false);
    assert.equal(JSON.stringify(audits).includes("비밀 후속 행동"), false);
    reopened.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
