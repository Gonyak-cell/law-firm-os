import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  CRM_INQUIRY_STATUSES,
  CRM_INQUIRY_STATUS_TRANSITIONS,
  CRM_LEAD_INQUIRY_ERROR_CODES,
  createCrmCoreLead,
  createCrmRuntimeRepository,
  createLead,
  transitionLeadInquiryStatus,
  validateCrmCoreRecord,
} from "../src/index.js";

const TENANT = "tenant_client_inquiry_t01";
const LEAD_ID = "lead_client_inquiry_t01";
const ACTOR = "user_client_inquiry_t01";
const RECEIVED_AT = "2026-07-30T08:55:00.000Z";

function leadInput(overrides = {}) {
  return {
    lead_id: LEAD_ID,
    tenant_id: TENANT,
    party_id: "party_client_inquiry_t01",
    display_name: "가나다 주식회사 자문 문의",
    status: "active",
    owner_user_id: ACTOR,
    inquiry_status: "new",
    source: "outlook_addin",
    received_at: RECEIVED_AT,
    next_action: "문의 확인",
    ...overrides,
  };
}

function createInquiry(repository, overrides = {}) {
  return createLead({
    repository,
    lead: leadInput(overrides),
    actor_id: ACTOR,
    idempotency_key: `create-${overrides.lead_id ?? LEAD_ID}`,
  }).lead;
}

function transition(repository, overrides = {}) {
  return transitionLeadInquiryStatus({
    repository,
    tenant_id: TENANT,
    lead_id: LEAD_ID,
    next_inquiry_status: "reviewing",
    expected_version: 1,
    next_action: "상담 일정 확인",
    reason: "문의 내용을 확인함",
    actor_id: ACTOR,
    idempotency_key: "transition-inquiry-1",
    clock: () => new Date("2026-07-30T09:00:00.000Z"),
    ...overrides,
  });
}

test("CL-P3-W02-T01 Lead 문의 필드를 정규화하고 기존 Outlook 경로를 canonical source로 바꾼다", () => {
  assert.deepEqual(CRM_INQUIRY_STATUSES, ["new", "reviewing", "closed"]);
  assert.deepEqual(CRM_INQUIRY_STATUS_TRANSITIONS, {
    new: ["reviewing", "closed"],
    reviewing: ["closed"],
    closed: ["reviewing"],
  });

  const lead = createCrmCoreLead({
    ...leadInput(),
    source: undefined,
    lead_source: "outlook",
    version: 1,
  });
  assert.equal(lead.inquiry_status, "new");
  assert.equal(lead.source, "outlook_addin");
  assert.equal(lead.received_at, RECEIVED_AT);
  assert.equal(lead.next_action, "문의 확인");
  assert.equal(lead.version, 1);
  assert.equal("lead_source" in lead, false);
  const { next_action: ignoredNextAction, ...withoutNextAction } = lead;
  assert.equal(ignoredNextAction, "문의 확인");
  assert.deepEqual(
    validateCrmCoreRecord("Lead", withoutNextAction).errors,
    ["missing_required_field:next_action"],
  );

  assert.throws(
    () => createCrmCoreLead(leadInput({ source: "background_scan" })),
    /Lead source must be one of/,
  );
  assert.throws(
    () => createCrmCoreLead(leadInput({ received_at: "2026-07-30" })),
    /explicit UTC offset/,
  );
  assert.throws(
    () => createCrmCoreLead(leadInput({ version: 0 })),
    /positive integer/,
  );
  assert.throws(
    () => createCrmCoreLead(leadInput({
      inquiry_status: "closed",
      next_action: "남아 있으면 안 됨",
    })),
    /cannot have next_action/,
  );
});

test("CL-P3-W02-T01 허용 전환은 version을 올리고 source·received_at을 보존하며 감사한다", () => {
  const repository = createCrmRuntimeRepository();
  createInquiry(repository);

  const reviewing = transition(repository);
  assert.equal(reviewing.outcome, "updated");
  assert.equal(reviewing.lead.inquiry_status, "reviewing");
  assert.equal(reviewing.lead.next_action, "상담 일정 확인");
  assert.equal(reviewing.lead.version, 2);

  const closed = transition(repository, {
    next_inquiry_status: "closed",
    expected_version: 2,
    next_action: null,
    reason: "의뢰 범위가 맞지 않아 종료",
    idempotency_key: "transition-inquiry-2",
    clock: () => new Date("2026-07-30T09:05:00.000Z"),
  });
  assert.equal(closed.lead.inquiry_status, "closed");
  assert.equal(closed.lead.next_action, null);
  assert.equal(closed.lead.version, 3);

  const reopened = transition(repository, {
    next_inquiry_status: "reviewing",
    expected_version: 3,
    next_action: "재검토 담당자 지정",
    reason: "의뢰인이 추가 자료를 보내 재검토",
    idempotency_key: "transition-inquiry-3",
    clock: () => new Date("2026-07-30T09:10:00.000Z"),
  });
  assert.equal(reopened.outcome, "reopened");
  assert.equal(reopened.lead.inquiry_status, "reviewing");
  assert.equal(reopened.lead.version, 4);
  assert.equal(reopened.lead.source, "outlook_addin");
  assert.equal(reopened.lead.received_at, RECEIVED_AT);

  const audits = repository.listAudit({
    tenant_id: TENANT,
    object_id: LEAD_ID,
  });
  assert.equal(audits.length, 4);
  assert.equal(audits.at(-1).action, "crm.inquiry.reopen");
  assert.deepEqual(audits.at(-1).metadata.before, {
    inquiry_status: "closed",
    version: 3,
    next_action_present: false,
    next_action_sha256: null,
  });
  assert.equal(audits.at(-1).metadata.after.inquiry_status, "reviewing");
  assert.equal(audits.at(-1).metadata.after.version, 4);
  assert.equal(JSON.stringify(audits).includes("재검토 담당자 지정"), false);
});

test("CL-P3-W02-T01 금지 전환과 stale version은 기록과 감사를 바꾸지 않는다", () => {
  const repository = createCrmRuntimeRepository();
  createInquiry(repository);
  transition(repository);
  const before = repository.snapshot();

  assert.throws(
    () => transition(repository, {
      next_inquiry_status: "new",
      expected_version: 2,
      next_action: "문의 확인",
      idempotency_key: "transition-forbidden",
    }),
    (error) => error.safe_error_code === CRM_LEAD_INQUIRY_ERROR_CODES.invalid_transition,
  );
  assert.throws(
    () => transition(repository, {
      next_inquiry_status: "closed",
      expected_version: 1,
      next_action: null,
      idempotency_key: "transition-stale",
    }),
    (error) => error.safe_error_code === CRM_LEAD_INQUIRY_ERROR_CODES.version_conflict,
  );
  assert.deepEqual(repository.snapshot(), before);
});

test("CL-P3-W02-T01 같은 command만 재생하고 같은 키의 다른 command는 409 충돌로 막는다", () => {
  const repository = createCrmRuntimeRepository();
  createInquiry(repository);
  const first = transition(repository);
  const auditCount = repository.listAudit({ tenant_id: TENANT }).length;
  const replay = transition(repository);
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(replay.lead, first.lead);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).length, auditCount);

  assert.throws(
    () => transition(repository, {
      next_action: "다른 다음 행동",
    }),
    (error) => error.safe_error_code === CRM_LEAD_INQUIRY_ERROR_CODES.idempotency_conflict,
  );
  assert.equal(repository.listAudit({ tenant_id: TENANT }).length, auditCount);
});

test("CL-P3-W02-T01 기존 중앙원장 Lead도 최초 전환에서 canonical 문의 필드로 승격한다", () => {
  const repository = createCrmRuntimeRepository({
    preserveSeedRecords: true,
    seedRecords: [{
      lead_id: LEAD_ID,
      tenant_id: TENANT,
      model_type: "Lead",
      party_id: "party_client_inquiry_t01",
      display_name: "기존 문의",
      status: "active",
      owner_user_id: ACTOR,
      lead_source: "outlook",
      created_at: RECEIVED_AT,
      updated_at: RECEIVED_AT,
    }],
  });
  const legacy = repository.get({
    tenant_id: TENANT,
    model_type: "Lead",
    lead_id: LEAD_ID,
  });
  assert.equal(legacy.version, undefined);

  const result = transition(repository);
  assert.equal(result.lead.inquiry_status, "reviewing");
  assert.equal(result.lead.source, "outlook_addin");
  assert.equal(result.lead.received_at, RECEIVED_AT);
  assert.equal(result.lead.next_action, "상담 일정 확인");
  assert.equal(result.lead.version, 2);
  assert.equal("lead_source" in result.lead, false);
});

test("CL-P3-W02-T01 전환·version·감사·멱등 기록은 저장소를 다시 열어도 유지된다", () => {
  const root = mkdtempSync(join(tmpdir(), "lawos-lead-inquiry-t01-"));
  const filePath = join(root, "crm.json");
  try {
    const repository = createCrmRuntimeRepository({ filePath });
    createInquiry(repository);
    transition(repository);
    repository.close();

    const reopened = createCrmRuntimeRepository({ filePath });
    const lead = reopened.get({
      tenant_id: TENANT,
      model_type: "Lead",
      lead_id: LEAD_ID,
    });
    assert.equal(lead.inquiry_status, "reviewing");
    assert.equal(lead.version, 2);
    assert.equal(reopened.listAudit({ tenant_id: TENANT }).length, 2);
    assert.equal(transition(reopened).idempotent_replay, true);
    assert.equal(reopened.listAudit({ tenant_id: TENANT }).length, 2);
    reopened.close();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
