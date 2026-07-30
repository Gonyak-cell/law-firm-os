import assert from "node:assert/strict";
import test from "node:test";
import { createCrmRuntimeRepository } from "../../../packages/crm/src/runtime-repository.js";
import {
  createInquiryEvidenceStorageService,
} from "../../../packages/email-dms/src/inquiry-evidence-storage-service.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import {
  createLocalStorageAdapter,
} from "../../../packages/dms/src/storage/local-storage-adapter.js";
import {
  createMasterDataRepository,
} from "../../../packages/master-data/src/repository.js";
import {
  OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES,
  createOutlookInquiryRegistrationService,
} from "../src/outlook-inquiry-registration-service.js";

const TENANT = "tenant_outlook_inquiry_registration";
const ACTOR = "user_outlook_inquiry_registration";
const SUBJECT = "entra_outlook_inquiry_registration";
const NOW = "2026-07-30T09:00:00.000Z";

function mime(messageId = "<registration-001@example.invalid>") {
  return Buffer.from([
    "From: Synthetic Sender <sender@example.invalid>",
    "To: Intake <intake@example.invalid>",
    "Subject: 신규 상담 요청",
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    "합성 문의 본문",
    "",
  ].join("\r\n"));
}

function message(restMessageId) {
  const suffix = restMessageId.replace(/[^a-z0-9]/giu, "-");
  return {
    mailbox_address: "intake-user@example.invalid",
    mime_bytes: mime(`<${suffix}@example.invalid>`),
    immutable_message_id: `immutable-${suffix}`,
    internet_message_id: `<${suffix}@example.invalid>`,
    provider_request_id: `request-${suffix}`,
    message_metadata: {
      conversation_id: `conversation-${suffix}`,
      internet_message_id: `<${suffix}@example.invalid>`,
      subject: "신규 상담 요청",
      sender: {
        display_name: "합성 문의자",
        address: "sender@example.invalid",
      },
      recipients: [{
        display_name: "접수",
        address: "intake-user@example.invalid",
        recipient_type: "to",
      }],
      received_at: "2026-07-30T08:55:00.000Z",
      has_attachments: false,
    },
  };
}

function fixture({ checkpoint } = {}) {
  const emailDmsRepository = createEmailDmsRepository();
  const masterDataRepository = createMasterDataRepository();
  const crmRepository = createCrmRuntimeRepository();
  const storage = createLocalStorageAdapter({
    adapter_id: "outlook-inquiry-registration-test",
  });
  const evidenceStorageService = createInquiryEvidenceStorageService({
    repository: emailDmsRepository,
    storage,
    scanner: {
      async scan() {
        return { status: "clean" };
      },
    },
    retention_policy_id: "retention_inquiry_email",
    retention_policy_ref: "retention:inquiry-email",
    kms_key_ref: "alias/lawos-synthetic-email-dms",
    clock: () => new Date(NOW),
  });
  let mailCalls = 0;
  const service = createOutlookInquiryRegistrationService({
    emailDmsRepository,
    masterDataRepository,
    crmRepository,
    evidenceStorageService,
    mailPort: {
      async getOwnMessageMime(input) {
        mailCalls += 1;
        assert.equal(input.tenant_id, TENANT);
        assert.equal(input.user_id, ACTOR);
        assert.equal(input.entra_subject_id, SUBJECT);
        return message(input.rest_message_id);
      },
    },
    clock: () => new Date(NOW),
    checkpoint,
  });
  return {
    service,
    emailDmsRepository,
    masterDataRepository,
    crmRepository,
    get mail_calls() {
      return mailCalls;
    },
  };
}

function command(overrides = {}) {
  return {
    tenant_id: TENANT,
    actor_id: ACTOR,
    entra_subject_id: SUBJECT,
    action: "new",
    rest_message_id: "rest-registration-001",
    idempotency_key: "register-rest-registration-001",
    ...overrides,
  };
}

function counts(value) {
  return {
    party: value.masterDataRepository.list({
      tenant_id: TENANT,
      model_type: "Party",
    }).length,
    lead: value.crmRepository.list({
      tenant_id: TENANT,
      model_type: "Lead",
    }).length,
    evidence: value.emailDmsRepository.list({
      tenant_id: TENANT,
      model_type: "InquiryEmailEvidence",
    }).length,
    files: value.emailDmsRepository.list({
      tenant_id: TENANT,
      model_type: "InquiryEvidenceFileObject",
    }).length,
  };
}

test("VC-CL-INQ-002,003 새 문의를 Party·Lead·원본 증거 각 한 번만 만들고 같은 클릭을 그대로 재생한다", async () => {
  const value = fixture();
  const first = await value.service.register(command());
  assert.equal(first.outcome, "registered");
  assert.equal(first.capture_status, "complete");
  assert.deepEqual(first.created, {
    evidence: true,
    party: true,
    lead: true,
  });
  assert.deepEqual(counts(value), {
    party: 1,
    lead: 1,
    evidence: 1,
    files: 2,
  });

  const replay = await value.service.register(command());
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.process_id, first.process_id);
  assert.equal(replay.party_id, first.party_id);
  assert.equal(replay.lead_id, first.lead_id);
  assert.equal(
    replay.inquiry_email_evidence_id,
    first.inquiry_email_evidence_id,
  );
  assert.deepEqual(counts(value), {
    party: 1,
    lead: 1,
    evidence: 1,
    files: 2,
  });
  assert.equal(value.mail_calls, 1);
  const evidence = value.emailDmsRepository.get({
    tenant_id: TENANT,
    model_type: "InquiryEmailEvidence",
    inquiry_email_evidence_id: first.inquiry_email_evidence_id,
  });
  assert.equal(evidence.lead_id, first.lead_id);
  assert.equal(evidence.capture_status, "complete");
});

for (const failedStep of [
  "message_resolved",
  "evidence_stored",
  "party_resolved",
  "lead_resolved",
]) {
  test(`CL-P3-W01-T04 ${failedStep} 뒤 실패해도 재실행은 완료된 단계를 중복 생성하지 않는다`, async () => {
    let failed = false;
    const value = fixture({
      async checkpoint(step) {
        if (!failed && step === failedStep) {
          failed = true;
          throw new Error(`synthetic failure after ${step}`);
        }
      },
    });
    await assert.rejects(
      value.service.register(command()),
      new RegExp(`synthetic failure after ${failedStep}`, "u"),
    );
    const afterFailure = counts(value);
    assert.equal(
      afterFailure.party,
      ["party_resolved", "lead_resolved"].includes(failedStep)
        ? 1
        : 0,
    );
    assert.equal(
      afterFailure.lead,
      failedStep === "lead_resolved" ? 1 : 0,
    );
    assert.equal(
      afterFailure.evidence,
      failedStep === "message_resolved" ? 0 : 1,
    );
    assert.equal(
      afterFailure.files,
      failedStep === "message_resolved" ? 0 : 2,
    );

    const recovered = await value.service.register(command());
    assert.equal(recovered.outcome, "registered");
    assert.equal(recovered.idempotent_replay, true);
    assert.deepEqual(counts(value), {
      party: 1,
      lead: 1,
      evidence: 1,
      files: 2,
    });
    const process = value.emailDmsRepository.getIdempotency({
      tenant_id: TENANT,
      idempotency_key:
        value.emailDmsRepository.snapshot().idempotency
          .find((entry) => (
            entry.operation === "outlook_inquiry_registration"
          )).idempotency_key,
    });
    assert.equal(process.response.outcome, "registered");
    assert.equal(process.response.completed_step, "evidence_linked");
  });
}

test("VC-CL-INQ-004 기존 문의 연결은 새 Party·Lead 없이 증거만 해당 Lead에 연결한다", async () => {
  const value = fixture();
  const party = value.masterDataRepository.create({
    model_type: "Party",
    party_id: "party_existing_inquiry",
    tenant_id: TENANT,
    party_type: "organization",
    display_name: "기존 문의 고객",
    status: "active",
    owner_user_id: ACTOR,
  });
  value.crmRepository.create({
    model_type: "Lead",
    lead_id: "lead_existing_inquiry",
    tenant_id: TENANT,
    party_id: party.party_id,
    display_name: "기존 문의",
    status: "active",
    owner_user_id: ACTOR,
  });
  const result = await value.service.register(command({
    action: "link_existing",
    existing_lead_id: "lead_existing_inquiry",
    idempotency_key: "link-rest-registration-001",
  }));
  assert.equal(result.idempotent_replay, false);
  assert.equal(result.lead_id, "lead_existing_inquiry");
  assert.equal(result.party_id, "party_existing_inquiry");
  assert.deepEqual(result.created, {
    evidence: true,
    party: false,
    lead: false,
  });
  assert.deepEqual(counts(value), {
    party: 1,
    lead: 1,
    evidence: 1,
    files: 2,
  });
});

test("CL-P3-W01-T04 발신자 이메일이 기존 Person과 정확히 같으면 기존 Party를 재사용한다", async () => {
  const value = fixture();
  value.masterDataRepository.transaction((tx) => {
    tx.create({
      model_type: "Party",
      party_id: "party_existing_sender",
      tenant_id: TENANT,
      party_type: "person",
      display_name: "기존 문의자",
      status: "active",
      owner_user_id: ACTOR,
    });
    tx.create({
      model_type: "Entity",
      entity_id: "entity_existing_sender",
      tenant_id: TENANT,
      entity_kind: "person",
      display_name: "기존 문의자",
      status: "active",
      owner_user_id: ACTOR,
    });
    tx.create({
      model_type: "Person",
      person_id: "person_existing_sender",
      tenant_id: TENANT,
      party_id: "party_existing_sender",
      entity_id: "entity_existing_sender",
      display_name: "기존 문의자",
      email: "SENDER@example.invalid",
      status: "active",
      owner_user_id: ACTOR,
    });
  });
  const result = await value.service.register(command({
    idempotency_key: "register-existing-sender",
  }));
  assert.equal(result.party_id, "party_existing_sender");
  assert.equal(result.created.party, false);
  assert.equal(result.created.lead, true);
  assert.equal(result.idempotent_replay, false);
  assert.equal(counts(value).party, 1);
});

test("CL-P3-W01-T04 같은 요청키를 다른 메시지에 재사용하면 두 번째 Graph·증거 생성을 시작하지 않는다", async () => {
  const value = fixture();
  await value.service.register(command());
  await assert.rejects(
    value.service.register(command({
      rest_message_id: "rest-registration-002",
    })),
    (error) => (
      error.safe_error_code
        === OUTLOOK_INQUIRY_REGISTRATION_ERROR_CODES.idempotency_conflict
    ),
  );
  assert.equal(value.mail_calls, 1);
  assert.deepEqual(counts(value), {
    party: 1,
    lead: 1,
    evidence: 1,
    files: 2,
  });
});
