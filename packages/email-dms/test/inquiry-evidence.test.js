import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  inquiryEmailEvidenceId,
  inquiryEvidenceFileObjectId,
  normalizeInquiryEmailEvidence,
  normalizeInquiryEvidenceFileObject,
} from "../src/inquiry-evidence-model.js";
import {
  INQUIRY_EVIDENCE_STORAGE_ERROR_CODES,
  createInquiryEvidenceStorageService,
} from "../src/inquiry-evidence-storage-service.js";
import {
  EMAIL_DMS_DOMAIN_DESCRIPTOR,
  createEmailDmsDomainSnapshot,
} from "../src/central-ledger.js";
import { createEmailDmsRepository } from "../src/repository.js";
import { createCrmRuntimeRepository } from "../../crm/src/runtime-repository.js";
import { createMasterDataRepository } from "../../master-data/src/repository.js";
import { handleOutlookAddinApiRequest } from "../../../apps/api/src/outlook-addin-runtime-context.js";
import {
  createLocalStorageAdapter,
} from "../../dms/src/storage/local-storage-adapter.js";

const TENANT = "tenant_inquiry_evidence_test";
const MAILBOX = "Synthetic.Intake@Example.Invalid";
const INTERNET_MESSAGE_ID = "<Inquiry-001@Example.Invalid>";
const GRAPH_MESSAGE_ID = "AQMkADAwATM3ZmYAZS00SyntheticImmutable";
const CAPTURED_AT = "2026-07-30T07:00:00.000Z";
const MIME_SHA256 = "a".repeat(64);
const DISPLAY_SHA256 = "b".repeat(64);
const STORAGE_MIME = Buffer.from([
  "From: Synthetic Sender <sender@example.invalid>",
  "To: Intake <synthetic.intake@example.invalid>",
  "Subject: Synthetic storage inquiry",
  `Message-ID: ${INTERNET_MESSAGE_ID}`,
  "MIME-Version: 1.0",
  "Content-Type: multipart/mixed; boundary=\"lawos-boundary\"",
  "",
  "--lawos-boundary",
  "Content-Type: text/html; charset=utf-8",
  "Content-Transfer-Encoding: 8bit",
  "",
  "<p>안녕하세요. 상담을 요청합니다.</p>",
  "<script>alert('xss-must-not-enter-display')</script>",
  "<img src=x onerror=\"alert('xss')\">",
  "--lawos-boundary",
  "Content-Type: application/pdf; name=\"synthetic.pdf\"",
  "Content-Disposition: attachment; filename=\"synthetic.pdf\"",
  "Content-Transfer-Encoding: base64",
  "",
  Buffer.from("%PDF-1.4 synthetic attachment").toString("base64"),
  "--lawos-boundary--",
  "",
].join("\r\n"));

function storageInput(overrides = {}) {
  return {
    tenant_id: TENANT,
    mailbox_address: MAILBOX,
    captured_by: "user_inquiry_capture",
    idempotency_key: "capture-storage-inquiry-001",
    mime_bytes: STORAGE_MIME,
    graph_immutable_message_id: GRAPH_MESSAGE_ID,
    message_metadata: {
      internet_message_id: INTERNET_MESSAGE_ID,
      conversation_id: "conversation_storage_inquiry_001",
      subject: "합성 저장 문의",
      sender: {
        display_name: "합성 문의자",
        address: "sender@example.invalid",
      },
      recipients: [{
        recipient_type: "to",
        display_name: "접수",
        address: MAILBOX,
      }],
      received_at: "2026-07-30T06:58:00.000Z",
    },
    ...overrides,
  };
}

function cleanScanner(calls = []) {
  return {
    async scan(input) {
      calls.push({
        object_kind: input.object_kind,
        sha256: createHash("sha256")
          .update(input.bytes)
          .digest("hex"),
      });
      return { status: "clean" };
    },
  };
}

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

test("CL-P3-W01-T03 원본 MIME와 일반 텍스트 표시 사본을 서로 다른 DMS 객체로 저장하고 해시·보존·민감 조회를 검증한다", async () => {
  const repository = createEmailDmsRepository();
  const localStorage = createLocalStorageAdapter({
    adapter_id: "inquiry-evidence-test",
  });
  const governanceCalls = [];
  const storage = Object.freeze({
    ...localStorage,
    capabilities: Object.freeze({
      ...localStorage.capabilities,
      provider_retention: true,
    }),
    async setObjectRetention(input) {
      governanceCalls.push({
        operation: "retention",
        ...input,
      });
      return { applied: true };
    },
    async setObjectLegalHold(input) {
      governanceCalls.push({
        operation: "legal_hold",
        ...input,
      });
      return { applied: true };
    },
  });
  const scanCalls = [];
  const service = createInquiryEvidenceStorageService({
    repository,
    storage,
    scanner: cleanScanner(scanCalls),
    retention_policy_id: "retention_inquiry_email",
    retention_policy_ref: "retention:inquiry-email",
    retention_days: 2_555,
    kms_key_ref: "alias/lawos-synthetic-email-dms",
    clock: () => new Date(CAPTURED_AT),
  });
  try {
    const stored = await service.storeMessageEvidence(storageInput({
      legal_hold_state: "held",
    }));
    assert.equal(stored.outcome, "stored");
    assert.equal(stored.file_objects.length, 2);
    assert.equal(stored.governance.provider_retention_applied, true);
    assert.equal(stored.governance.provider_legal_hold_applied, true);
    assert.deepEqual(
      scanCalls.map((entry) => entry.object_kind),
      ["original_mime", "sanitized_display"],
    );
    assert.equal(
      governanceCalls.filter(
        (entry) => entry.operation === "retention",
      ).length,
      2,
    );
    assert.equal(
      governanceCalls.filter(
        (entry) => entry.operation === "legal_hold",
      ).length,
      2,
    );
    assert.equal(
      governanceCalls.every(
        (entry) => entry.tenant_id === TENANT,
      ),
      true,
    );
    assert.equal(
      stored.evidence.mime_sha256,
      createHash("sha256").update(STORAGE_MIME).digest("hex"),
    );
    assert.equal(stored.evidence.attachment_manifest.length, 1);
    assert.equal(
      stored.evidence.attachment_manifest[0].file_name,
      "synthetic.pdf",
    );
    assert.equal(
      stored.evidence.attachment_manifest[0].mime_type,
      "application/pdf",
    );
    assert.equal(
      stored.file_objects.every(
        (item) => item.storage_pointer_ref.startsWith("vault://"),
      ),
      true,
    );
    assert.equal(
      stored.file_objects.every(
        (item) => item.legal_hold_state === "held",
      ),
      true,
    );

    const display = await service.readEvidenceContent({
      tenant_id: TENANT,
      inquiry_email_evidence_id:
        stored.evidence.inquiry_email_evidence_id,
      object_kind: "sanitized_display",
      actor_id: "user_inquiry_capture",
      request_id: "request-read-display-001",
    });
    const displayText = display.bytes.toString("utf8");
    assert.match(displayText, /안녕하세요\. 상담을 요청합니다\./u);
    assert.equal(display.mime_type, "text/plain; charset=utf-8");
    assert.equal(displayText.includes("<script"), false);
    assert.equal(displayText.includes("onerror"), false);
    assert.equal(displayText.includes("javascript:"), false);

    const original = await service.readEvidenceContent({
      tenant_id: TENANT,
      inquiry_email_evidence_id:
        stored.evidence.inquiry_email_evidence_id,
      object_kind: "original_mime",
      actor_id: "user_inquiry_capture",
      request_id: "request-read-original-001",
    });
    assert.equal(original.bytes.equals(STORAGE_MIME), true);
    assert.equal(original.sha256, stored.evidence.mime_sha256);

    const replay = await service.storeMessageEvidence(storageInput({
      legal_hold_state: "held",
    }));
    assert.equal(replay.outcome, "idempotent_replay");
    assert.equal(replay.idempotent_replay, true);
    assert.equal(repository.list({ tenant_id: TENANT }).length, 3);

    const persisted = JSON.stringify(repository.snapshot());
    assert.equal(
      persisted.includes("xss-must-not-enter-display"),
      false,
    );
    assert.equal(persisted.includes("상담을 요청합니다"), false);
    assert.equal(persisted.includes("Content-Type:"), false);
    const readAudits = repository.listAudit({
      tenant_id: TENANT,
      object_id: stored.evidence.inquiry_email_evidence_id,
    }).filter((event) => (
      event.event_type
      === "inquiry.email_evidence.sensitive_read"
    ));
    assert.equal(readAudits.length, 2);
    assert.equal(
      JSON.stringify(readAudits).includes(
        "xss-must-not-enter-display",
      ),
      false,
    );
  } finally {
    repository.close();
  }
});

test("CL-P3-W01-T03 악성 MIME는 원본만 격리 보관하고 표시 사본과 열람을 차단한다", async () => {
  const repository = createEmailDmsRepository();
  const storage = createLocalStorageAdapter({
    adapter_id: "inquiry-quarantine-test",
  });
  const service = createInquiryEvidenceStorageService({
    repository,
    storage,
    scanner: {
      async scan({ object_kind }) {
        return {
          status:
            object_kind === "original_mime"
              ? "quarantined"
              : "clean",
        };
      },
    },
    retention_policy_id: "retention_inquiry_email",
    retention_policy_ref: "retention:inquiry-email",
    kms_key_ref: "alias/lawos-synthetic-email-dms",
    clock: () => new Date(CAPTURED_AT),
  });
  try {
    const result = await service.storeMessageEvidence(storageInput({
      idempotency_key: "capture-quarantined-inquiry-001",
    }));
    assert.equal(result.outcome, "quarantined");
    assert.equal(result.evidence.capture_status, "failed");
    assert.equal(result.evidence.display_file_object_id, null);
    assert.equal(result.file_objects.length, 1);
    assert.equal(result.file_objects[0].scan_status, "quarantined");
    assert.equal(repository.list({ tenant_id: TENANT }).length, 2);
    await assert.rejects(
      service.readEvidenceContent({
        tenant_id: TENANT,
        inquiry_email_evidence_id:
          result.evidence.inquiry_email_evidence_id,
        object_kind: "original_mime",
        actor_id: "user_inquiry_capture",
        request_id: "request-read-quarantined-001",
      }),
      (error) => (
        error.status === 423
        && error.safe_error_code
          === INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.quarantined
      ),
    );
    await assert.rejects(
      service.readEvidenceContent({
        tenant_id: TENANT,
        inquiry_email_evidence_id:
          result.evidence.inquiry_email_evidence_id,
        object_kind: "sanitized_display",
        actor_id: "user_inquiry_capture",
        request_id: "request-read-missing-display-001",
      }),
      (error) => (
        error.status === 404
        && error.safe_error_code
          === INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.not_found
      ),
    );
  } finally {
    repository.close();
  }
});

test("CL-P3-W01-T03 같은 메시지 ID의 다른 MIME와 검사기 없는 저장은 제품 기록을 만들지 않고 차단한다", async () => {
  const repository = createEmailDmsRepository();
  const storage = createLocalStorageAdapter({
    adapter_id: "inquiry-storage-negative-test",
  });
  const service = createInquiryEvidenceStorageService({
    repository,
    storage,
    scanner: cleanScanner(),
    retention_policy_id: "retention_inquiry_email",
    retention_policy_ref: "retention:inquiry-email",
    kms_key_ref: "alias/lawos-synthetic-email-dms",
    clock: () => new Date(CAPTURED_AT),
  });
  const unavailableRepository = createEmailDmsRepository();
  const unavailable = createInquiryEvidenceStorageService({
    repository: unavailableRepository,
    storage: createLocalStorageAdapter({
      adapter_id: "inquiry-storage-no-scanner-test",
    }),
    retention_policy_id: "retention_inquiry_email",
    retention_policy_ref: "retention:inquiry-email",
    kms_key_ref: "alias/lawos-synthetic-email-dms",
    clock: () => new Date(CAPTURED_AT),
  });
  const mismatchedKmsRepository = createEmailDmsRepository();
  const localS3Shape = createLocalStorageAdapter({
    adapter_id: "inquiry-storage-kms-test",
  });
  const mismatchedKms = createInquiryEvidenceStorageService({
    repository: mismatchedKmsRepository,
    storage: Object.freeze({
      ...localS3Shape,
      provider: "s3",
      kms_key_ref: "alias/another-key",
    }),
    scanner: cleanScanner(),
    retention_policy_id: "retention_inquiry_email",
    retention_policy_ref: "retention:inquiry-email",
    kms_key_ref: "alias/lawos-synthetic-email-dms",
    clock: () => new Date(CAPTURED_AT),
  });
  try {
    await service.storeMessageEvidence(storageInput());
    await assert.rejects(
      service.storeMessageEvidence(storageInput({
        idempotency_key: "capture-storage-content-conflict",
        mime_bytes: Buffer.concat([
          STORAGE_MIME,
          Buffer.from("\r\nChanged content"),
        ]),
      })),
      (error) => (
        error.safe_error_code
        === INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.content_conflict
      ),
    );
    assert.equal(repository.list({ tenant_id: TENANT }).length, 3);

    await assert.rejects(
      unavailable.storeMessageEvidence(storageInput({
        idempotency_key: "capture-no-scanner",
      })),
      (error) => (
        error.status === 503
        && error.safe_error_code
          === INQUIRY_EVIDENCE_STORAGE_ERROR_CODES
            .scanner_unavailable
      ),
    );
    assert.equal(
      unavailable.production_ready_claim,
      false,
    );

    await assert.rejects(
      mismatchedKms.storeMessageEvidence(storageInput({
        idempotency_key: "capture-mismatched-kms",
      })),
      (error) => (
        error.status === 503
        && error.safe_error_code
          === INQUIRY_EVIDENCE_STORAGE_ERROR_CODES
            .storage_unavailable
      ),
    );
    assert.equal(
      mismatchedKmsRepository.list({ tenant_id: TENANT }).length,
      0,
    );
  } finally {
    repository.close();
    unavailableRepository.close();
    mismatchedKmsRepository.close();
  }
});

test("VC-CL-INQ-001 Outlook 문의 버튼을 누르지 않으면 읽기 초기화 후에도 어떤 문의·증거·처리 영수증도 만들지 않는다", async () => {
  const emailDmsRepository = createEmailDmsRepository();
  const masterDataRepository = createMasterDataRepository();
  const crmRepository = createCrmRuntimeRepository();
  const runtime = {
    emailDmsRuntime: { repository: emailDmsRepository },
    crmIntakeRuntime: {
      crmRepository,
      masterDataRepository,
    },
  };
  const context = {
    principal: {
      tenant_id: TENANT,
      user_id: "user_inquiry_no_capture",
      entra_subject_id: "subject_inquiry_no_capture",
      role_ids: ["lawos_staff"],
    },
    rules: [
      {
        id: "outlook-bootstrap-read",
        effect: "allow",
        action_prefix: "outlook:addin:",
      },
      {
        id: "crm-inquiry-read",
        effect: "allow",
        action_prefix: "crm:inquiry:",
      },
    ],
    object_acl: [],
  };
  const snapshot = () => ({
    email_dms: emailDmsRepository.snapshot(),
    master_data: masterDataRepository.snapshot(),
    crm: crmRepository.snapshot(),
  });
  const before = snapshot();
  assert.deepEqual(before.email_dms.records, []);
  assert.deepEqual(before.email_dms.idempotency, []);
  assert.deepEqual(before.email_dms.audit_events, []);
  assert.deepEqual(before.master_data.records, []);
  assert.deepEqual(before.master_data.idempotency, []);
  assert.deepEqual(before.master_data.audit_events, []);
  assert.deepEqual(before.crm.records, []);
  assert.deepEqual(before.crm.idempotency, []);
  assert.deepEqual(before.crm.audit_events, []);

  try {
    const bootstrap = await handleOutlookAddinApiRequest({
      pathname: "/api/outlook/bootstrap",
      method: "GET",
      query: { tenant_id: TENANT },
      context,
      requestId: "request-inquiry-no-capture-bootstrap",
      runtime,
    });
    assert.equal(bootstrap.status, 200);
    assert.equal(bootstrap.body.outcome, "passed");

    const inquiries = await handleOutlookAddinApiRequest({
      pathname: "/api/outlook/inquiries",
      method: "GET",
      query: { tenant_id: TENANT },
      context,
      requestId: "request-inquiry-no-capture-list",
      runtime,
    });
    assert.equal(inquiries.status, 200);
    assert.deepEqual(inquiries.body.items, []);
    assert.equal(inquiries.body.omitted_count, 0);

    const after = snapshot();
    assert.deepEqual(after, before);
    assert.equal(
      emailDmsRepository.list({
        tenant_id: TENANT,
        model_type: "InquiryEmailEvidence",
      }).length,
      0,
    );
    assert.equal(
      emailDmsRepository.list({
        tenant_id: TENANT,
        model_type: "InquiryEvidenceFileObject",
      }).length,
      0,
    );
    assert.equal(
      masterDataRepository.list({
        tenant_id: TENANT,
        model_type: "Party",
      }).length,
      0,
    );
    assert.equal(
      crmRepository.list({
        tenant_id: TENANT,
        model_type: "Lead",
      }).length,
      0,
    );
  } finally {
    emailDmsRepository.close();
    masterDataRepository.close();
    crmRepository.close();
  }
});
