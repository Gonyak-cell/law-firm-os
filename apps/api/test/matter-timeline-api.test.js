import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createMatterTimelineCursorAuthority } from "../../../packages/matter/src/timeline-cursor-authority.js";
import { handleMatterApiRequest } from "../src/matter-runtime-context.js";

const TENANT = "tenant-timeline-api";
const MATTER = "matter-timeline-api";
const query = {
  tenant_id: TENANT,
  permission_ref: "permission-timeline-api",
  audit_hint_ref: "audit-timeline-api",
};
const context = {
  principal: { user_id: "actor-timeline-api", tenant_id: TENANT, scopes: [] },
  rules: [{ id: "allow-timeline-api", effect: "allow", action: "matter:timeline:read" }],
  object_acl: [],
};

function runtime() {
  const repository = createMatterRepository();
  for (let number = 1; number <= 5; number += 1) {
    const eventId = `event-00${number}`;
    repository.upsert({
      model_type: "MatterTimelineEvent",
      resource_id: eventId,
      event_id: eventId,
      tenant_id: TENANT,
      matter_id: MATTER,
      occurred_at: `2026-08-08T0${number}:00:00.000Z`,
      type: "matter.test",
      title: eventId,
    });
  }
  repository.upsert({
    model_type: "MatterTimelineEvent",
    resource_id: "event-denied",
    event_id: "event-denied",
    tenant_id: TENANT,
    matter_id: MATTER,
    occurred_at: "2026-08-08T09:00:00.000Z",
    type: "matter.secret",
    title: "denied",
    required_scope: "matter:secret",
  });
  return {
    repository,
    timelineCursorAuthority: createMatterTimelineCursorAuthority({
      secret: "matter-timeline-api-secret-at-least-32-bytes",
    }),
  };
}

async function read(runtimeValue, overrides = {}, requestId = "request-timeline-api") {
  return handleMatterApiRequest({
    pathname: `/api/matters/${MATTER}/timeline`,
    method: "GET",
    query: { ...query, ...overrides },
    context,
    requestId,
    runtime: runtimeValue,
  });
}

test("generic Matter timeline은 limit/cursor를 전달하고 정상 다음 페이지를 반환한다", async () => {
  const runtimeValue = runtime();
  const first = await read(runtimeValue, { limit: "2" }, "request-first");
  const second = await read(runtimeValue, {
    limit: "2",
    cursor: first.body.item.page_info.next_cursor,
  }, "request-second");

  assert.equal(first.status, 200);
  assert.deepEqual(first.body.item.visible_entries.map(({ event_id }) => event_id), ["event-005", "event-004"]);
  assert.deepEqual(second.body.item.visible_entries.map(({ event_id }) => event_id), ["event-003", "event-002"]);
  assert.deepEqual(second.body.item.page_info, {
    limit: 2,
    has_more: true,
    next_cursor: second.body.item.page_info.next_cursor,
  });
  assert.equal("denied_count" in first.body.item, false);
  assert.equal("total_count" in first.body.item, false);
});

test("generic Matter timeline 기본 제한은 shared model의 8과 일치한다", async () => {
  const response = await read(runtime());
  assert.equal(response.status, 200);
  assert.equal(response.body.item.page_info.limit, 8);
});

test("generic Matter timeline은 변조 cursor를 400으로 닫는다", async () => {
  const runtimeValue = runtime();
  const first = await read(runtimeValue, { limit: "2" });
  const token = first.body.item.page_info.next_cursor;
  const response = await read(runtimeValue, {
    limit: "2",
    cursor: `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`,
  });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body.safe_error_codes, ["MATTER_API_VALIDATION_ERROR"]);
});
