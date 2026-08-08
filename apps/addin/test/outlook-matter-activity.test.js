import assert from "node:assert/strict";
import test from "node:test";
import {
  OUTLOOK_ACTIVITY_REFRESH_OPERATIONS,
  loadOutlookMatterActivity,
  shouldRefreshOutlookMatterActivity,
} from "../src/outlook-matter-activity.js";

test("Matter가 선택되지 않은 초기 화면은 최근 활동 API를 호출하지 않는다", async () => {
  // Given
  let requestCount = 0;

  // When
  const result = await loadOutlookMatterActivity({
    matterId: "",
    requestJson: async () => {
      requestCount += 1;
    },
  });

  // Then
  assert.equal(requestCount, 0);
  assert.deepEqual(result, {
    status: "idle",
    matter_id: null,
    rows: [],
    page_info: null,
    requested: false,
  });
});

test("최근 활동은 제한과 커서를 전달하고 한 줄 안전 행과 다음 커서만 노출한다", async () => {
  // Given
  const paths = [];

  // When
  const result = await loadOutlookMatterActivity({
    matterId: "matter/001",
    limit: 4,
    cursor: "opaque+/=cursor",
    requestJson: async (path) => {
      paths.push(path);
      return {
        denied_count: 17,
        item: {
          visible_entries: [{
            event_id: "event-001",
            occurred_at: "2026-08-08T02:03:04.000Z",
            type: "outlook.email.filed",
            title: "  계약\n검토 완료  ",
            source_ref: "document:full:reference",
            raw_audit_payload: { secret: true },
          }],
          omitted_entry_count: 17,
          count_leak_prevented: true,
          page_info: { limit: 4, has_more: true, next_cursor: "next-opaque" },
        },
      };
    },
  });

  // Then
  assert.deepEqual(paths, [
    "/api/outlook/matters/matter%2F001/timeline?limit=4&cursor=opaque%2B%2F%3Dcursor",
  ]);
  assert.deepEqual(result, {
    status: "ready",
    matter_id: "matter/001",
    rows: [{
      event_id: "event-001",
      occurred_at: "2026-08-08T02:03:04.000Z",
      type: "outlook.email.filed",
      title: "계약 검토 완료",
      source_ref: "document:full:reference",
    }],
    page_info: { limit: 4, has_more: true, next_cursor: "next-opaque" },
    requested: true,
  });
  assert.equal("denied_count" in result, false);
  assert.equal("omitted_entry_count" in result, false);
});

test("지원되는 작업은 성공한 경우에만 최근 활동 새로고침을 예약한다", () => {
  // Given
  const operations = Object.values(OUTLOOK_ACTIVITY_REFRESH_OPERATIONS);

  // When
  const successful = operations.map((operation) => (
    shouldRefreshOutlookMatterActivity({ operation, succeeded: true })
  ));
  const failed = operations.map((operation) => (
    shouldRefreshOutlookMatterActivity({ operation, succeeded: false })
  ));

  // Then
  assert.deepEqual(operations, [
    "email_filing",
    "attachment_filing",
    "filing_correction",
    "task_write",
    "time_draft_write",
    "document_write",
    "signature_write",
  ]);
  assert.deepEqual(successful, operations.map(() => true));
  assert.deepEqual(failed, operations.map(() => false));
  assert.equal(shouldRefreshOutlookMatterActivity({ operation: "bootstrap", succeeded: true }), false);
});
