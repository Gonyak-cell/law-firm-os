import assert from "node:assert/strict";
import test from "node:test";
import {
  inquiryEmailEvidenceId,
  inquiryEvidenceFileObjectId,
  normalizeInquiryEmailEvidence,
  normalizeInquiryEvidenceFileObject,
} from "../src/inquiry-evidence-model.js";
import {
  EMAIL_DMS_DOMAIN_DESCRIPTOR,
  createEmailDmsDomainSnapshot,
} from "../src/central-ledger.js";
import { createEmailDmsRepository } from "../src/repository.js";

const TENANT = "tenant_inquiry_evidence_test";
const MAILBOX = "Synthetic.Intake@Example.Invalid";
const INTERNET_MESSAGE_ID = "<Inquiry-001@Example.Invalid>";
const GRAPH_MESSAGE_ID = "AQMkADAwATM3ZmYAZS00SyntheticImmutable";
const CAPTURED_AT = "2026-07-30T07:00:00.000Z";
const MIME_SHA256 = "a".repeat(64);
const DISPLAY_SHA256 = "b".repeat(64);

function ids() {
  const inquiryEmailEvidenceIdValue = inquiryEmailEvidenceId({
    tenant_id: TENANT,
    mailbox_address: MAILBOX,
    internet_message_id: INTERNET_MESSAGE_ID,
    graph_immutable_message_id: GRAPH_MESSAGE_ID,
  });
  return {
    evidence: inquiryEmailEvidenceIdValue,
    original: inquiryEvidenceFileObjectId({
      tenant_id: TENANT,
      inquiry_email_evidence_id: inquiryEmailEvidenceIdValue,
      object_kind: "original_mime",
    }),
    display: inquiryEvidenceFileObjectId({
      tenant_id: TENANT,
      inquiry_email_evidence_id: inquiryEmailEvidenceIdValue,
      object_kind: "sanitized_display",
    }),
  };
}

function fileObject(objectKind, overrides = {}) {
  const evidenceIds = ids();
  const original = objectKind === "original_mime";
  return {
    model_type: "InquiryEvidenceFileObject",
    inquiry_evidence_file_object_id:
      original ? evidenceIds.original : evidenceIds.display,
    tenant_id: TENANT,
    inquiry_email_evidence_id: evidenceIds.evidence,
    object_kind: objectKind,
    storage_pointer_ref:
      `vault://email-dms-test/${original ? "original" : "display"}-opaque`,
    sha256: original ? MIME_SHA256 : DISPLAY_SHA256,
    byte_size: original ? 812 : 206,
    mime_type: original ? "message/rfc822" : "text/html; charset=utf-8",
    scan_status: "clean",
    retention_policy_id: "retention_inquiry_email",
    legal_hold_state: "none",
    kms_key_ref: "kms-key-ref:email-dms-test",
    created_by: "user_inquiry_capture",
    created_at: CAPTURED_AT,
    ...overrides,
  };
}

function evidence(overrides = {}) {
  const evidenceIds = ids();
  return {
    model_type: "InquiryEmailEvidence",
    inquiry_email_evidence_id: evidenceIds.evidence,
    tenant_id: TENANT,
    mailbox_address: MAILBOX,
    lead_id: "lead_inquiry_001",
    graph_immutable_message_id: GRAPH_MESSAGE_ID,
    internet_message_id: INTERNET_MESSAGE_ID,
    conversation_id: "conversation_inquiry_001",
    mime_file_object_id: evidenceIds.original,
    mime_sha256: MIME_SHA256,
    mime_byte_size: 812,
    subject: "합성 신규 문의",
    sender: {
      display_name: "합성 문의자",
      address: "Sender@Example.Invalid",
    },
    recipients: [{
      recipient_type: "to",
      display_name: "접수",
      address: MAILBOX,
    }],
    received_at: "2026-07-30T06:58:00.000Z",
    display_file_object_id: evidenceIds.display,
    attachment_manifest: [{
      attachment_id: "attachment_001",
      file_name: "synthetic.pdf",
      byte_size: 120,
      mime_type: "application/pdf",
    }],
    capture_status: "complete",
    retention_policy_ref: "retention_inquiry_email",
    legal_hold_state: "none",
    captured_by: "user_inquiry_capture",
    captured_at: CAPTURED_AT,
    ...overrides,
  };
}

test("CL-P3-W01-T01 문의 메일 증거 ID·메일함·메타데이터·원본 파일 경계를 정규화한다", () => {
  const normalizedEvidence = normalizeInquiryEmailEvidence(evidence());
  const original = normalizeInquiryEvidenceFileObject(
    fileObject("original_mime"),
  );
  const display = normalizeInquiryEvidenceFileObject(
    fileObject("sanitized_display"),
  );

  assert.equal(
    normalizedEvidence.mailbox_address,
    "synthetic.intake@example.invalid",
  );
  assert.equal(
    normalizedEvidence.internet_message_id,
    "<inquiry-001@example.invalid>",
  );
  assert.equal(normalizedEvidence.mime_file_object_id, original.inquiry_evidence_file_object_id);
  assert.equal(normalizedEvidence.display_file_object_id, display.inquiry_evidence_file_object_id);
  assert.equal(original.immutable_original, true);
  assert.equal(display.immutable_original, false);
  assert.equal(original.bytes_included, false);
  assert.equal(normalizedEvidence.raw_content_included, false);
  assert.equal(
    inquiryEmailEvidenceId({
      tenant_id: TENANT,
      mailbox_address: "synthetic.intake@example.invalid",
      internet_message_id: "<inquiry-001@example.invalid>",
    }),
    normalizedEvidence.inquiry_email_evidence_id,
  );

  assert.throws(
    () => normalizeInquiryEmailEvidence({
      ...evidence(),
      mime_bytes: Buffer.from("must not persist"),
    }),
    /cannot be stored/,
  );
  assert.throws(
    () => normalizeInquiryEmailEvidence({
      ...evidence(),
      inquiry_email_evidence_id: "forged-evidence-id",
    }),
    /does not match/,
  );
  assert.throws(
    () => normalizeInquiryEmailEvidence({
      ...evidence(),
      lead_id: null,
    }),
    /requires lead_id/,
  );
  assert.throws(
    () => normalizeInquiryEvidenceFileObject({
      ...fileObject("original_mime"),
      storage_pointer_ref: "s3://raw-bucket/private/message.eml",
    }),
    /opaque committed DMS vault reference/,
  );
});

test("CL-P3-W01-T01 Email DMS repository는 세 모델만 보존하고 raw bytes·token·일반 삭제를 열지 않는다", () => {
  const repository = createEmailDmsRepository();
  try {
    repository.transaction((tx) => {
      tx.create(fileObject("original_mime"));
      tx.create(fileObject("sanitized_display"));
      tx.create(evidence());
      tx.recordIdempotency({
        tenant_id: TENANT,
        idempotency_key: "capture-inquiry-001",
        operation: "capture_inquiry_email_evidence",
        response: { inquiry_email_evidence_id: ids().evidence },
      });
      tx.appendAudit({
        tenant_id: TENANT,
        event_id: "audit-inquiry-evidence-001",
        event_type: "inquiry.email_evidence.registered",
        actor_id: "user_inquiry_capture",
        object_type: "InquiryEmailEvidence",
        object_id: ids().evidence,
        payload: {
          mime_sha256: MIME_SHA256,
          raw_content_included: false,
        },
        created_at: CAPTURED_AT,
      });
    });
    assert.equal(repository.list({ tenant_id: TENANT }).length, 3);
    assert.equal(repository.list({
      tenant_id: TENANT,
      model_type: "InquiryEvidenceFileObject",
    }).length, 2);
    assert.equal(typeof repository.delete, "undefined");
    assert.throws(
      () => repository.create({
        model_type: "DmsDocument",
        tenant_id: TENANT,
        document_id: "must-not-enter-email-dms",
      }),
      /unsupported Email DMS model_type/,
    );
    assert.throws(
      () => repository.appendAudit({
        tenant_id: TENANT,
        event_id: "audit-with-token",
        access_token: "must-not-persist",
      }),
      /rejected secret/,
    );
  } finally {
    repository.close();
  }
});

test("CL-P3-W01-T01 Email DMS 중앙원장은 메일 중복 키와 증거·원본·CRM Lead 관계를 등록한다", () => {
  const repository = createEmailDmsRepository({
    seedRecords: [
      fileObject("original_mime"),
      fileObject("sanitized_display"),
      evidence(),
    ],
  });
  try {
    const result = createEmailDmsDomainSnapshot({
      repositories: [{ source_id: "email-dms-file-v1", repository }],
      tenant_id: TENANT,
    });
    assert.equal(EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id, "email-dms");
    assert.equal(result.inventory.reconciliation.invariant_passed, true);
    assert.equal(
      result.inventory.reconciliation.inquiry_email_evidence_count,
      1,
    );
    assert.equal(
      result.inventory.reconciliation.inquiry_evidence_file_object_count,
      2,
    );
    const evidenceRecord = result.snapshot.records.find(
      (record) => record.record_type === "InquiryEmailEvidence",
    );
    assert.match(evidenceRecord.unique_key, /^mailbox-message:[a-f0-9]{64}$/u);
    assert.equal(
      result.inventory.external_reference_count,
      1,
    );
    assert.equal(
      result.inventory.reference_rules.includes(
        "InquiryEmailEvidence.lead_id->crm.Lead",
      ),
      true,
    );
    assert.equal(
      evidenceRecord.references.filter((reference) => (
        reference.target_record_type === "InquiryEvidenceFileObject"
      )).length,
      2,
    );
  } finally {
    repository.close();
  }
});
