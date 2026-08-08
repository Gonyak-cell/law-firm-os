import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMatterRepository } from "../src/repository.js";
import {
  buildMatterTimelineReadModel,
} from "../src/timeline-read-model.js";
import { createMatterTimelineCursorAuthority } from "../src/timeline-cursor-authority.js";

const TENANT = "tenant-001";
const MATTER = "matter-001";
const CURSOR_SECRET = "timeline-test-secret-that-is-at-least-32-bytes";
const cursorAuthority = createMatterTimelineCursorAuthority({ secret: CURSOR_SECRET });

function entry(eventId, occurredAt, overrides = {}) {
  return {
    event_id: eventId,
    tenant_id: TENANT,
    matter_id: MATTER,
    occurred_at: occurredAt,
    type: "matter.event",
    title: eventId,
    ...overrides,
  };
}

test("최근 활동은 occurred_at과 event_id 내림차순으로 최대 제한만 반환한다", () => {
  // Given
  const entries = Array.from({ length: 24 }, (_, index) => entry(
    `event-${String(index).padStart(2, "0")}`,
    index < 2 ? "2026-08-08T03:00:00.000Z" : `2026-08-08T02:${String(index).padStart(2, "0")}:00.000Z`,
  ));

  // When
  const result = buildMatterTimelineReadModel({
    entries,
    actor: {},
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 99,
    cursorAuthority,
  });

  // Then
  assert.equal(result.visible_entries.length, 20);
  assert.deepEqual(result.visible_entries.slice(0, 2).map(({ event_id }) => event_id), [
    "event-01",
    "event-00",
  ]);
  assert.deepEqual(result.page_info, {
    limit: 20,
    has_more: true,
    next_cursor: result.page_info.next_cursor,
  });
  assert.equal(typeof result.page_info.next_cursor, "string");
  assert.equal(result.page_info.next_cursor.includes("event-"), false);
});

test("키셋 커서는 첫 페이지 뒤에 새 이벤트가 들어와도 다음 페이지를 안정적으로 유지한다", () => {
  // Given
  const entries = [
    entry("event-005", "2026-08-08T05:00:00.000Z"),
    entry("event-004", "2026-08-08T04:00:00.000Z"),
    entry("event-003", "2026-08-08T03:00:00.000Z"),
    entry("event-002", "2026-08-08T02:00:00.000Z"),
    entry("event-001", "2026-08-08T01:00:00.000Z"),
  ];
  const first = buildMatterTimelineReadModel({
    entries,
    actor: {},
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 2,
    cursorAuthority,
  });

  // When
  const second = buildMatterTimelineReadModel({
    entries: [entry("event-006", "2026-08-08T06:00:00.000Z"), ...entries],
    actor: {},
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 2,
    cursor: first.page_info.next_cursor,
    cursorAuthority,
  });

  // Then
  assert.deepEqual(first.visible_entries.map(({ event_id }) => event_id), ["event-005", "event-004"]);
  assert.deepEqual(second.visible_entries.map(({ event_id }) => event_id), ["event-003", "event-002"]);
  assert.equal(second.visible_entries.some(({ event_id }) => event_id === "event-006"), false);
});

test("같은 시각의 event_id 정렬과 커서는 같은 이진 순서를 사용한다", () => {
  // Given
  const entries = [
    entry("event-Z", "2026-08-08T03:00:00.000Z"),
    entry("event-a", "2026-08-08T03:00:00.000Z"),
    entry("event-0", "2026-08-08T03:00:00.000Z"),
  ];
  const first = buildMatterTimelineReadModel({
    entries,
    actor: {},
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 1,
    cursorAuthority,
  });

  // When
  const second = buildMatterTimelineReadModel({
    entries,
    actor: {},
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 1,
    cursor: first.page_info.next_cursor,
    cursorAuthority,
  });

  // Then
  assert.deepEqual(first.visible_entries.map(({ event_id }) => event_id), ["event-a"]);
  assert.deepEqual(second.visible_entries.map(({ event_id }) => event_id), ["event-Z"]);
});

test("권한과 tenant/Matter 필터는 페이지 계산 전에 적용되고 거부 건수는 반환하지 않는다", () => {
  // Given
  const entries = [
    entry("visible-002", "2026-08-08T02:00:00.000Z", { title: "  한 줄\n제목  " }),
    entry("denied-999", "2026-08-08T09:00:00.000Z", { required_scope: "matter:secret" }),
    entry("foreign-tenant", "2026-08-08T08:00:00.000Z", { tenant_id: "tenant-foreign" }),
    entry("foreign-matter", "2026-08-08T07:00:00.000Z", { matter_id: "matter-foreign" }),
    entry("visible-001", "2026-08-08T01:00:00.000Z"),
  ];

  // When
  const result = buildMatterTimelineReadModel({
    entries,
    actor: { scopes: [] },
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 2,
  });

  // Then
  assert.deepEqual(result.visible_entries.map(({ event_id }) => event_id), ["visible-002", "visible-001"]);
  assert.equal(result.visible_entries[0].title, "한 줄 제목");
  assert.deepEqual(result.page_info, { limit: 2, has_more: false, next_cursor: null });
  assert.equal(result.omitted_entry_count, null);
  assert.equal(result.count_leak_prevented, true);
  assert.equal("denied_count" in result, false);
  assert.equal("total_count" in result, false);
});

test("다른 Matter의 커서는 현재 활동 페이지에 사용할 수 없다", () => {
  // Given
  const first = buildMatterTimelineReadModel({
    entries: [entry("event-002", "2026-08-08T02:00:00.000Z"), entry("event-001", "2026-08-08T01:00:00.000Z")],
    actor: {},
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 1,
    cursorAuthority,
  });

  // When / Then
  assert.throws(() => buildMatterTimelineReadModel({
    entries: [],
    actor: {},
    tenant_id: TENANT,
    matter_id: "matter-002",
    limit: 1,
    cursor: first.page_info.next_cursor,
    cursorAuthority,
  }), /cursor/u);
});

test("지속 저장소를 다시 열어도 같은 활동 순서와 커서를 읽는다", () => {
  // Given
  const filePath = join(mkdtempSync(join(tmpdir(), "lawos-timeline-read-")), "matter.json");
  const firstRepository = createMatterRepository({ filePath });
  for (const event of [
    entry("event-003", "2026-08-08T03:00:00.000Z"),
    entry("event-002", "2026-08-08T02:00:00.000Z"),
    entry("event-001", "2026-08-08T01:00:00.000Z"),
  ]) {
    firstRepository.upsert({ ...event, model_type: "MatterTimelineEvent", resource_id: event.event_id });
  }
  const beforeRestart = buildMatterTimelineReadModel({
    entries: firstRepository.list({ tenant_id: TENANT, matter_id: MATTER, model_type: "MatterTimelineEvent" }),
    actor: {},
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 1,
    cursorAuthority,
  });

  // When
  const restartedRepository = createMatterRepository({ filePath });
  const afterRestart = buildMatterTimelineReadModel({
    entries: restartedRepository.list({ tenant_id: TENANT, matter_id: MATTER, model_type: "MatterTimelineEvent" }),
    actor: {},
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 1,
    cursor: beforeRestart.page_info.next_cursor,
    cursorAuthority: createMatterTimelineCursorAuthority({ secret: CURSOR_SECRET }),
  });

  // Then
  assert.deepEqual(beforeRestart.visible_entries.map(({ event_id }) => event_id), ["event-003"]);
  assert.deepEqual(afterRestart.visible_entries.map(({ event_id }) => event_id), ["event-002"]);
});
