import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_PRECEDENT_INDEX_VERSION,
  buildOutlookPrecedentDeepLink,
  createOutlookPrecedentReadinessRequest,
  createOutlookPrecedentSearchRequest,
  parseOutlookPrecedentReadiness,
  projectOutlookPrecedentDisplay,
  sanitizeOutlookPrecedentSearchResponse,
} from "../src/outlook-precedent-search.js";

const FINGERPRINT = "a".repeat(64);
const MATTER = "matter-current";
const READY_BODY = {
  request_id: "request-precedent-ready-001",
  outcome: "passed",
  runtime_ready: true,
  authoritative: true,
  index_version: OUTLOOK_PRECEDENT_INDEX_VERSION,
  authority_fingerprint: FINGERPRINT,
  safe_error_codes: [],
  production_ready_claim: false,
};

function response(items, overrides = {}) {
  return {
    request_id: "request-precedent-search-001",
    outcome: "passed",
    items,
    next_cursor: null,
    page_info: { returned_count: items.length, has_more: false },
    safe_error_codes: [],
    count_leak_prevented: true,
    raw_body_included: false,
    storage_pointer_ref_included: false,
    index_version: OUTLOOK_PRECEDENT_INDEX_VERSION,
    index_stale: false,
    authoritative: true,
    production_ready_claim: false,
    ...overrides,
  };
}

function internalItem(overrides = {}) {
  return {
    source_id: "source-internal-001",
    source_kind: "internal_matter_document",
    title: "손해배상 내부 검토",
    snippet: "손해배상 범위와 fiduciary duty 분석",
    source_matter_id: "matter-prior-001",
    document_id: "document-prior-001",
    version_id: "version-prior-001",
    citation: null,
    source_reference: null,
    source_url: `?view=vault&matter_id=matter-prior-001&document_id=document-prior-001&document_version_id=version-prior-001&document_sha256=${"b".repeat(64)}#vault-search-documents`,
    search_rank: "0.61000000",
    match_fields: ["title", "body"],
    content_sha256: "b".repeat(64),
    index_version: OUTLOOK_PRECEDENT_INDEX_VERSION,
    index_stale: false,
    raw_body_included: false,
    storage_pointer_ref_included: false,
    ...overrides,
  };
}

function caseItem(overrides = {}) {
  return {
    source_id: "source-case-001",
    source_kind: "case_law_document",
    title: "대법원 계약책임 판결",
    snippet: "계약책임과 손해배상 판시",
    source_matter_id: "matter-case-001",
    document_id: "document-case-001",
    version_id: "version-case-001",
    citation: {
      court: "대법원",
      case_number: "2025다54321",
      decision_date: "2026-06-11",
    },
    source_reference: "대법원 2026. 6. 11. 선고 2025다54321 판결",
    source_url: "https://glaw.scourt.go.kr/precedent/2025da54321",
    search_rank: "0.52000000",
    match_fields: ["metadata"],
    content_sha256: "c".repeat(64),
    index_version: OUTLOOK_PRECEDENT_INDEX_VERSION,
    index_stale: false,
    raw_body_included: false,
    storage_pointer_ref_included: false,
    ...overrides,
  };
}

test("readiness request is exact and readiness parsing is authoritative-only", () => {
  assert.deepEqual(createOutlookPrecedentReadinessRequest({ matterId: MATTER }), {
    method: "GET",
    matter_id: MATTER,
    path: `/api/outlook/precedents/readiness?matter_id=${encodeURIComponent(MATTER)}`,
  });
  assert.equal(createOutlookPrecedentReadinessRequest({ matterId: " matter-current" }), null);
  assert.deepEqual(parseOutlookPrecedentReadiness(READY_BODY), READY_BODY);
  for (const body of [
    { ...READY_BODY, authoritative: false },
    { ...READY_BODY, runtime_ready: false },
    { ...READY_BODY, authority_fingerprint: "not-a-digest" },
    { ...READY_BODY, safe_error_codes: ["OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE"] },
  ]) {
    assert.throws(
      () => parseOutlookPrecedentReadiness(body),
      (error) => [
        "OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE",
        "OUTLOOK_PRECEDENT_READINESS_INVALID",
      ].includes(error.safe_error_code),
    );
  }
  assert.throws(
    () => parseOutlookPrecedentReadiness({ ...READY_BODY, safe_error_codes: ["PRECEDENT_INDEX_STALE"] }),
    (error) => error.safe_error_code === "PRECEDENT_INDEX_STALE",
  );
});

test("search request normalizes bounded text, keeps the exact Matter, and only forwards opaque cursor", () => {
  const request = createOutlookPrecedentSearchRequest({
    readiness: READY_BODY,
    matterId: MATTER,
    query: "  손해\u0000배상\u3000범위  ",
    limit: 20,
    cursor: "opaque.cursor_token-001",
  });
  assert.equal(request.method, "GET");
  assert.equal(request.query, "손해 배상 범위");
  assert.equal(request.matter_id, MATTER);
  assert.equal(request.limit, 20);
  assert.equal(request.cursor, "opaque.cursor_token-001");
  assert.equal(
    request.path,
    `/api/outlook/precedents?q=${encodeURIComponent(request.query)}&matter_id=${encodeURIComponent(MATTER)}&limit=20&cursor=${encodeURIComponent(request.cursor)}`,
  );
  assert.equal(createOutlookPrecedentSearchRequest({ ...request, readiness: null }), null);
  for (const input of [
    { query: "a" },
    { query: "x".repeat(201) },
    { query: "valid query", matterId: "matter current" },
    { query: "valid query", limit: 21 },
    { query: "valid query", cursor: "opaque cursor" },
  ]) assert.equal(createOutlookPrecedentSearchRequest({ readiness: READY_BODY, matterId: MATTER, ...input }), null);
});

test("response projection keeps backend order/cursor and only safe metadata", () => {
  const first = internalItem();
  const second = caseItem();
  const cursor = "opaque.next.cursor-002";
  const result = sanitizeOutlookPrecedentSearchResponse(
    response([first, second], {
      next_cursor: cursor,
      page_info: { returned_count: 2, has_more: true },
    }),
    { matterId: MATTER },
  );
  assert.deepEqual(result.items.map(({ source_id }) => source_id), [first.source_id, second.source_id]);
  assert.equal(result.next_cursor, cursor);
  assert.deepEqual(result.page_info, { returned_count: 2, has_more: true });
  assert.equal(result.items[0].source_url, first.source_url);
  assert.deepEqual(result.items[1].citation, second.citation);
  assert.equal("search_rank" in result.items[0], false);
  assert.equal("match_fields" in result.items[0], false);
  assert.throws(
    () => sanitizeOutlookPrecedentSearchResponse(response([first])),
    (error) => error.safe_error_code === "OUTLOOK_PRECEDENT_MATTER_REQUIRED",
  );
});

test("unsafe, stale, incomplete, and non-canonical responses fail closed", () => {
  const unsafe = [
    [internalItem({ raw_body: "must-not-return" })],
    [internalItem({ storage_pointer_ref: "s3://must-not-return" })],
    [internalItem({ denied_count: 1 })],
  ];
  for (const items of unsafe) {
    assert.throws(
      () => sanitizeOutlookPrecedentSearchResponse(response(items), { matterId: MATTER }),
      (error) => error.safe_error_code === "OUTLOOK_PRECEDENT_RESPONSE_INVALID",
    );
  }
  assert.throws(
    () => sanitizeOutlookPrecedentSearchResponse(response([internalItem()], { index_stale: true }), { matterId: MATTER }),
    (error) => error.safe_error_code === "PRECEDENT_INDEX_STALE",
  );
  assert.throws(
    () => sanitizeOutlookPrecedentSearchResponse({ safe_error_codes: ["OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE"] }, { matterId: MATTER }),
    (error) => error.safe_error_code === "OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE",
  );
  assert.throws(
    () => sanitizeOutlookPrecedentSearchResponse({ safe_error_codes: ["PRECEDENT_INDEX_STALE"] }, { matterId: MATTER }),
    (error) => error.safe_error_code === "PRECEDENT_INDEX_STALE",
  );
  assert.throws(
    () => sanitizeOutlookPrecedentSearchResponse(response([internalItem()], {
      index_version: "lawos-precedent-fts-v1",
    }), { matterId: MATTER }),
    (error) => error.safe_error_code === "PRECEDENT_INDEX_STALE",
  );
  assert.throws(
    () => sanitizeOutlookPrecedentSearchResponse(response([caseItem({
      citation: { court: "대법원", case_number: "2025다54321" },
    })]), { matterId: MATTER }),
    (error) => error.safe_error_code === "OUTLOOK_PRECEDENT_RESPONSE_INVALID",
  );
  for (const source_url of [
    "https://user:password@glaw.scourt.go.kr/case",
    "https://other.example/case#fragment",
    "javascript:alert(1)",
  ]) assert.throws(
    () => sanitizeOutlookPrecedentSearchResponse(response([caseItem({ source_url })]), { matterId: MATTER }),
    (error) => error.safe_error_code === "OUTLOOK_PRECEDENT_RESPONSE_INVALID",
  );
  const { index_stale: omittedStaleFlag, ...missingStaleFlag } = response([internalItem()]);
  assert.throws(
    () => sanitizeOutlookPrecedentSearchResponse(missingStaleFlag, { matterId: MATTER }),
    (error) => error.safe_error_code === "OUTLOOK_PRECEDENT_RESPONSE_INVALID",
  );
  assert.throws(
    () => sanitizeOutlookPrecedentSearchResponse(response([internalItem({ source_matter_id: MATTER })]), { matterId: MATTER }),
    (error) => error.safe_error_code === "OUTLOOK_PRECEDENT_RESPONSE_INVALID",
  );
  assert.throws(
    () => sanitizeOutlookPrecedentSearchResponse(response([internalItem()], {
      page_info: { returned_count: 1, has_more: false, denied_count: 4 },
    }), { matterId: MATTER }),
    (error) => error.safe_error_code === "OUTLOOK_PRECEDENT_RESPONSE_INVALID",
  );
});

test("deep links are restricted and display keeps a one-line label plus complete copyable detail", () => {
  const internal = sanitizeOutlookPrecedentSearchResponse(response([internalItem()]), { matterId: MATTER }).items[0];
  const precedentCase = sanitizeOutlookPrecedentSearchResponse(response([caseItem()]), { matterId: MATTER }).items[0];
  assert.equal(sanitizeOutlookPrecedentSearchResponse(response([caseItem({
    source_url: "https://other.example/case/2026-001",
  })]), { matterId: MATTER }).items[0].source_url, "https://other.example/case/2026-001");
  assert.equal(buildOutlookPrecedentDeepLink(internal), internal.source_url);
  assert.equal(buildOutlookPrecedentDeepLink(precedentCase), `?view=vault&matter_id=matter-case-001&document_id=document-case-001&document_version_id=version-case-001&document_sha256=${"c".repeat(64)}#vault-search-documents`);
  assert.notEqual(
    buildOutlookPrecedentDeepLink(precedentCase),
    buildOutlookPrecedentDeepLink({
      ...precedentCase,
      version_id: "version-case-002",
      content_sha256: "d".repeat(64),
    }),
  );
  assert.throws(
    () => buildOutlookPrecedentDeepLink({ ...internal, source_url: "javascript:alert(1)" }),
    (error) => error.safe_error_code === "OUTLOOK_PRECEDENT_DEEP_LINK_INVALID",
  );
  const display = projectOutlookPrecedentDisplay(precedentCase);
  assert.equal(display.one_line, "대법원 계약책임 판결 · matter-case-001");
  assert.equal(display.copyable.source_id, precedentCase.source_id);
  assert.equal(display.copyable.source_matter_id, precedentCase.source_matter_id);
  assert.equal(display.copyable.document_id, precedentCase.document_id);
  assert.equal(display.copyable.version_id, precedentCase.version_id);
  assert.deepEqual(display.copyable.citation, precedentCase.citation);
  assert.equal(display.copyable.source_url, precedentCase.source_url);
  assert.equal(display.copyable.deep_link, `?view=vault&matter_id=matter-case-001&document_id=document-case-001&document_version_id=version-case-001&document_sha256=${"c".repeat(64)}#vault-search-documents`);
  assert.equal("search_rank" in display.copyable, false);
  assert.equal("match_fields" in display.copyable, false);
});
