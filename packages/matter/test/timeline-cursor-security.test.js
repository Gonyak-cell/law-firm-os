import assert from "node:assert/strict";
import test from "node:test";
import { createMatterTimelineCursorAuthority } from "../src/timeline-cursor-authority.js";
import { buildMatterTimelineReadModel } from "../src/timeline-read-model.js";

const TENANT = "tenant-cursor-security";
const MATTER = "matter-cursor-security";
const authority = createMatterTimelineCursorAuthority({
  secret: "timeline-cursor-security-secret-at-least-32-bytes",
});

function event(event_id, hour, overrides = {}) {
  return {
    model_type: "MatterTimelineEvent",
    resource_id: event_id,
    event_id,
    tenant_id: TENANT,
    matter_id: MATTER,
    occurred_at: `2026-08-08T0${hour}:00:00.000Z`,
    type: "matter.test",
    title: event_id,
    ...overrides,
  };
}

function firstPage() {
  return buildMatterTimelineReadModel({
    entries: [event("event-003", 3), event("event-002", 2), event("event-001", 1)],
    actor: {},
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 1,
    cursorAuthority: authority,
  });
}

function mutatePayload(token, mutate) {
  const [prefix, encoded, signature] = token.split(".");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  mutate(payload);
  return `${prefix}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${signature}`;
}

test("커서 payload, sort, snapshot 또는 서명을 바꾸면 모두 거부한다", () => {
  const token = firstPage().page_info.next_cursor;
  for (const forged of [
    `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`,
    mutatePayload(token, (value) => { value.tenant_id = "tenant-forged"; }),
    mutatePayload(token, (value) => { value.matter_id = "matter-forged"; }),
    mutatePayload(token, (value) => { value.sort = "occurred_at_asc"; }),
    mutatePayload(token, (value) => { value.snapshot.event_id = "event-999"; }),
  ]) {
    assert.throws(() => buildMatterTimelineReadModel({
      entries: [],
      actor: {},
      tenant_id: TENANT,
      matter_id: MATTER,
      limit: 1,
      cursor: forged,
      cursorAuthority: authority,
    }), /cursor/u);
  }
});

test("첫 페이지 뒤 삽입은 snapshot 밖이며 정상 다음 페이지에 섞이지 않는다", () => {
  const first = firstPage();
  const second = buildMatterTimelineReadModel({
    entries: [event("event-004", 4), event("event-003", 3), event("event-002", 2), event("event-001", 1)],
    actor: {},
    tenant_id: TENANT,
    matter_id: MATTER,
    limit: 1,
    cursor: first.page_info.next_cursor,
    cursorAuthority: authority,
  });
  assert.deepEqual(second.visible_entries.map(({ event_id }) => event_id), ["event-002"]);
});

test("다른 authority 또는 다른 페이지 크기의 커서는 거부한다", () => {
  const token = firstPage().page_info.next_cursor;
  const otherAuthority = createMatterTimelineCursorAuthority({
    secret: "different-timeline-cursor-secret-at-least-32-bytes",
  });
  assert.throws(() => buildMatterTimelineReadModel({
    entries: [], actor: {}, tenant_id: TENANT, matter_id: MATTER, limit: 1,
    cursor: token, cursorAuthority: otherAuthority,
  }), /cursor/u);
  assert.throws(() => buildMatterTimelineReadModel({
    entries: [], actor: {}, tenant_id: TENANT, matter_id: MATTER, limit: 2,
    cursor: token, cursorAuthority: authority,
  }), /cursor/u);
});
