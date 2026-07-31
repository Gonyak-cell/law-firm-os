import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  buildClientInquiryModel,
  normalizeClientInquiryDetail,
  normalizeClientInquirySource,
  normalizeClientInquirySummary
} from "../src/components/ClientInquiryModel.js";
import {
  LAWOS_API_SESSION_STORAGE_KEY,
  LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
  LAWOS_SESSION_ENVELOPE_STORAGE_KEY,
  fetchCrmInquiryDetail,
  fetchCrmInquiryEvidenceContent,
  fetchCrmInquiries
} from "../src/data/apiClient.js";

const inquiry = (overrides = {}) => ({
  lead_id: "lead-visible",
  display_name: "계약 검토 문의",
  visible_status: "new",
  visible_status_label: "새 문의",
  source: "outlook_addin",
  received_at: "2026-07-31T01:00:00.000Z",
  assigned_user_id: null,
  next_action: "담당 변호사 지정",
  ...overrides
});

const evidence = (overrides = {}) => ({
  inquiry_email_evidence_id: "evidence-visible",
  received_at: "2026-07-31T01:00:00.000Z",
  subject: "계약 검토 요청",
  sender_display_name: "문의 발신자",
  capture_status: "captured",
  raw_content_included: false,
  mailbox_address_included: false,
  provider_message_identifiers_included: false,
  storage_object_identifiers_included: false,
  display_content_path: "/api/outlook/inquiries/evidence/evidence-visible/content?kind=display",
  original_content_path: "/api/outlook/inquiries/evidence/evidence-visible/content?kind=original",
  ...overrides
});

const detail = (overrides = {}) => ({
  ...inquiry(),
  consultations_access: "allowed",
  consultations: [{
    scheduled_start: "2026-08-01T01:00:00.000Z",
    scheduled_end: null,
    completed_at: null,
    timezone: "Asia/Seoul",
    subject: "초기 상담",
    outcome: null,
    next_action: "상담 준비",
    confidential: false,
    confidential_details_included: true,
    status: "scheduled"
  }],
  evidence: {
    access: "allowed",
    source_status: "complete",
    items: [evidence()],
    page_info: { returned_count: 1, omitted_item_count: null },
    count_leak_prevented: true
  },
  ...overrides
});

function listBody(items = [inquiry()], overrides = {}) {
  return {
    outcome: "passed",
    ui_state: items.length ? null : "empty",
    data_status: "complete",
    items,
    page_info: { returned_count: items.length, omitted_item_count: null },
    source_status: {
      crm_consultations: "complete",
      crm_leads: "complete",
      crm_opportunities: "complete"
    },
    permission_filter_applied: true,
    count_leak_prevented: true,
    safe_error_codes: [],
    ...overrides
  };
}

function detailBody(item = detail(), overrides = {}) {
  return {
    outcome: "passed",
    data_status: "complete",
    item,
    source_status: {
      crm_consultations: "complete",
      crm_leads: "complete",
      crm_opportunities: "complete",
      email_evidence: "complete"
    },
    permission_filter_applied: true,
    count_leak_prevented: true,
    safe_error_codes: [],
    ...overrides
  };
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test("문의 모델은 Outlook·직접 등록과 정규 상태만 안전하게 노출한다", () => {
  assert.equal(normalizeClientInquirySource("outlook_addin"), "outlook_addin");
  assert.equal(normalizeClientInquirySource("Manual"), "unknown");
  const outlook = normalizeClientInquirySummary(inquiry({ assigned: false }));
  const manual = normalizeClientInquirySummary(inquiry({ lead_id: "lead-manual", source: "manual", assigned: true, next_action: null }));
  assert.equal(outlook.sourceLabel, "Outlook");
  assert.equal(manual.sourceLabel, "직접 등록");
  assert.equal("assigned_user_id" in manual, false);
  assert.equal(normalizeClientInquirySummary(inquiry({ visible_status: "새 문의" })), null);
  assert.equal(normalizeClientInquirySummary(inquiry({ source: "imap" })), null);
});

test("문의 라우트는 requested ID가 있을 때만 상세를 열고 첫 레코드를 자동 선택하지 않는다", () => {
  const list = { kind: "data", outcome: "passed", items: [inquiry({ lead_id: "lead-one", assigned: false }), inquiry({ lead_id: "lead-two", assigned: true })] };
  const idle = buildClientInquiryModel({ inquiriesResult: list });
  assert.equal(idle.selectedInquiry, null);
  assert.equal(idle.requestedInquiryAvailable, null);
  const selected = buildClientInquiryModel({ inquiriesResult: list, requestedInquiryId: "lead-two" });
  assert.equal(selected.selectedInquiry.inquiryId, "lead-two");
  assert.equal(selected.detailState, "loading");
  const invalid = buildClientInquiryModel({ inquiriesResult: list, requestedInquiryId: "lead-hidden" });
  assert.equal(invalid.selectedInquiry, null);
  assert.equal(invalid.requestedInquiryAvailable, false);
});

test("상담·메일 증거는 보호 상담과 denied 빈 목록 계약을 지킨다", () => {
  const normalized = normalizeClientInquiryDetail(detail({ assigned: false }));
  assert.equal(normalized.consultations[0].subject, "초기 상담");
  assert.equal(normalized.evidence.items[0].evidenceId, "evidence-visible");
  const partialEvidence = normalizeClientInquiryDetail(detail({
    assigned: false,
    evidence: {
      ...detail().evidence,
      source_status: "partial"
    }
  }));
  assert.equal(partialEvidence.evidence.partial, true);
  const confidential = detail({ assigned: false, consultations: [{
    subject: "보호된 상담",
    outcome: null,
    next_action: null,
    confidential: true,
    confidential_details_included: false,
    scheduled_start: null,
    scheduled_end: null,
    completed_at: null,
    timezone: null,
    status: "scheduled"
  }] });
  assert.equal(normalizeClientInquiryDetail(confidential).consultations[0].subject, "보호된 상담");
  assert.equal(normalizeClientInquiryDetail(detail({ assigned: false,
    consultations_access: "denied",
    consultations: [detail().consultations[0]]
  })), null);
  assert.equal(normalizeClientInquiryDetail(detail({ assigned: false,
    evidence: {
      access: "denied",
      source_status: "permission_denied",
      items: [],
      page_info: { returned_count: null, omitted_item_count: null },
      count_leak_prevented: true
    }
  })).evidence.items.length, 0);
  assert.equal(normalizeClientInquiryDetail(detail({ assigned: false,
    evidence: {
      access: "denied",
      source_status: "permission_denied",
      items: [evidence()],
      page_info: { returned_count: null, omitted_item_count: null },
      count_leak_prevented: true
    }
  })), null);
});

test("문의 API는 서명된 권한 문맥과 canonical evidence content 경로를 사용한다", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const calls = [];
  const storage = memoryStorage();
  const expiresAt = "2099-01-01T00:00:00.000Z";
  storage.setItem(LAWOS_API_SESSION_STORAGE_KEY, JSON.stringify({
    token_type: "Bearer",
    session_token: "lawos_session_v1.client_inquiry_test",
    expires_at: expiresAt,
    session: {
      user_id: "user_client_inquiry",
      tenant_id: "tenant_client_inquiry"
    }
  }));
  storage.setItem(LAWOS_SESSION_ENVELOPE_STORAGE_KEY, JSON.stringify({
    schema_version: LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
    state: "signed_in",
    session_ref: "session_client_inquiry",
    source: "api_signed_session",
    actor_ref: "user_client_inquiry",
    tenant_refs: {
      default: "tenant_client_inquiry",
      client: "tenant_client_inquiry",
      matter: "tenant_client_inquiry",
      vault: "tenant_client_inquiry",
      crm: "tenant_client_inquiry"
    },
    role_ids: ["crm_operator"],
    scopes: ["crm.inquiry.read"],
    review_state: "allow",
    expires_at: expiresAt
  }));
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: storage
  });
  const displayText = "안전한 메일 본문";
  const displayBytes = new TextEncoder().encode(displayText);
  const displaySha = createHash("sha256").update(displayBytes).digest("hex");
  let returnedEvidenceId = "evidence-visible";
  let returnedMimeType = "text/plain; charset=utf-8";
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), "http://lawos.test");
    calls.push({ url, init });
    if (url.pathname === "/api/crm/inquiries") return response(listBody());
    if (url.pathname === "/api/crm/inquiries/lead-visible") return response(detailBody());
    if (url.pathname === "/api/outlook/inquiries/evidence/evidence-visible/content") {
      assert.equal(url.searchParams.get("kind"), "display");
      return response({
        outcome: "passed",
        safe_error_codes: [],
        item: {
          inquiry_email_evidence_id: returnedEvidenceId,
          object_kind: "sanitized_display",
          encoding: "utf8",
          content_text: displayText,
          content_base64: null,
          content_sha256: displaySha,
          byte_size: displayBytes.byteLength,
          mime_type: returnedMimeType,
          scan_status: "clean",
          raw_path_exposed: false,
          storage_pointer_ref_included: false,
          executable_preview_enabled: false,
          external_resources_loaded: false
        }
      });
    }
    throw new Error(`unexpected ${url.pathname}`);
  };
  try {
    const list = await fetchCrmInquiries({ ctx: "allow" });
    assert.equal(list.kind, "data");
    assert.equal(list.items[0].assigned_user_id, undefined);
    const selected = await fetchCrmInquiryDetail({ inquiryId: "lead-visible", ctx: "allow" });
    assert.equal(selected.item.lead_id, "lead-visible");
    const content = await fetchCrmInquiryEvidenceContent({ evidenceId: "evidence-visible", kind: "display", ctx: "allow" });
    assert.equal(content.item.contentText, displayText);
    returnedEvidenceId = "evidence-other";
    const mismatched = await fetchCrmInquiryEvidenceContent({ evidenceId: "evidence-visible", kind: "display", ctx: "allow" });
    assert.equal(mismatched.kind, "error");
    assert.equal(mismatched.item, null);
    returnedEvidenceId = "evidence-visible";
    returnedMimeType = "text/html; charset=utf-8";
    const htmlPreview = await fetchCrmInquiryEvidenceContent({ evidenceId: "evidence-visible", kind: "display", ctx: "allow" });
    assert.equal(htmlPreview.kind, "error");
    assert.equal(htmlPreview.item, null);
    assert.match(calls[0].url.search, /permission_ref=ui_cmp_g6_crm_inquiry_read/);
    assert.equal(calls[0].url.searchParams.get("tenant_id"), "tenant_client_inquiry");
    const authorizationHeader = Object.entries(calls[0].init.headers).find(([key]) => key.toLowerCase() === "authorization");
    assert.deepEqual(authorizationHeader, ["authorization", "Bearer lawos_session_v1.client_inquiry_test"]);
    const permissionHeader = Object.entries(calls[0].init.headers).find(([key]) => key.toLowerCase() === "x-lawos-permission-context");
    assert.ok(permissionHeader);
    const permissionContext = JSON.parse(permissionHeader[1]);
    assert.equal(permissionContext.principal.tenant_id, "tenant_client_inquiry");
    assert.equal(permissionContext.principal.user_id, "user_client_inquiry");
    assert.equal(permissionContext.principal.session_context_ref, "session_client_inquiry");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, "sessionStorage", originalStorage);
    else delete globalThis.sessionStorage;
  }
});

test("문의 목록의 partial은 보존하고 5xx는 guarded blocked로 오분류하지 않는다", async () => {
  const originalFetch = globalThis.fetch;
  let mode = "partial";
  globalThis.fetch = async () => mode === "partial"
    ? response(listBody([inquiry({ assigned_user_id: null })], { data_status: "partial" }))
    : response({ outcome: "error", safe_error_codes: ["INQUIRY_SOURCE_UNAVAILABLE"] }, 503);
  try {
    const partial = await fetchCrmInquiries({ ctx: "allow" });
    assert.equal(partial.kind, "data");
    assert.equal(partial.uiState, "partial");
    mode = "error";
    const unavailable = await fetchCrmInquiries({ ctx: "allow" });
    assert.equal(unavailable.kind, "error");
    assert.equal(unavailable.uiState, "error");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
