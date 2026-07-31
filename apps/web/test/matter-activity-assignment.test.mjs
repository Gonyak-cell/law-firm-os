import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMatterActivity,
  patchMatterActivity,
} from "../src/data/apiClient.js";
import { buildMatterTaskAssigneeOptions } from "../src/data/matterAssigneeDisplay.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function captureRequest(callback, responseBody) {
  const originalFetch = globalThis.fetch;
  let captured = null;
  globalThis.fetch = async (input, init) => {
    captured = { input, init, body: JSON.parse(init.body) };
    return jsonResponse(responseBody);
  };
  try {
    await callback();
    return captured;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("Matter 업무 담당자 선택기는 이름과 직책을 표시하고 저장 값은 user_id로 유지한다", () => {
  const options = buildMatterTaskAssigneeOptions(
    {
      kind: "data",
      team: [
        {
          user_id: "user-owner",
          display_name: "김민호",
          title: "대표 변호사",
          role: "responsible_attorney",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: true,
        },
        {
          user_id: "user-assignee-2",
          display_name: "이서준",
          title: "변호사",
          role: "associate",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: true,
        },
        {
          user_id: "user-assignee-3",
          display_name: "이서준",
          title: "변호사",
          role: "associate",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: true,
        },
        {
          user_id: "user-assignee-4",
          display_name: "iam-user-1",
          role: "associate",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: true,
        },
        {
          user_id: "user-opaque-name",
          employee_id: "emp-opaque-name",
          member_id: "member-opaque-name",
          display_name: "aad-object-42",
          title: "지원 변호사",
          role: "associate",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: true,
        },
        {
          user_id: "user-opaque-title",
          employee_id: "emp-opaque-title",
          member_id: "member-opaque-title",
          display_name: "박지원",
          title: "object-id-42",
          role: "associate",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: true,
        },
        {
          user_id: "user-embedded-42",
          employee_id: "emp-embedded-42",
          member_id: "member-embedded-42",
          display_name: "검토자 (USER-EMBEDDED-42)",
          title: "변호사",
          role: "associate",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: true,
        },
        {
          user_id: "user-uuid-title",
          employee_id: "emp-uuid-title",
          member_id: "member-uuid-title",
          display_name: "최지원",
          title: "담당 123e4567-e89b-42d3-a456-426614174000",
          role: "associate",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: true,
        },
        {
          user_id: "lee",
          employee_id: "employee-leena",
          member_id: "member-leena",
          display_name: "Leena Kim",
          title: "Foreign Attorney",
          role: "associate",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: true,
        },
        {
          user_id: "user-terminated",
          display_name: "퇴사자",
          role: "associate",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: false,
        },
        {
          user_id: "user-stale",
          display_name: "오래된 담당자",
          role: "associate",
          status: "active",
          valid_to: "2020-01-01T00:00:00.000Z",
          identity_resolution_state: "resolved",
          assignment_eligible: false,
        },
      ],
    },
    {
      owner_user_id: "user-owner",
      owner_display_name: "김민호",
    },
  );
  const markup = renderToStaticMarkup(createElement(
    "select",
    { "aria-label": "업무 담당자" },
    options.map((option) => createElement(
      "option",
      { key: option.userId, value: option.userId },
      `${option.label} (${option.roleLabel})`,
    )),
  ));
  const visibleText = [...markup.matchAll(/<option[^>]*>([^<]*)<\/option>/g)]
    .map((match) => match[1])
    .join(" ");

  assert.match(visibleText, /김민호 \(대표 변호사\)/);
  assert.match(visibleText, /이서준 \(변호사 · 동명이인 1\)/);
  assert.match(visibleText, /이서준 \(변호사 · 동명이인 2\)/);
  assert.match(visibleText, /담당자 이름 확인 필요 \(Matter 구성원\)/);
  assert.match(visibleText, /담당자 이름 확인 필요 \(지원 변호사\)/);
  assert.match(visibleText, /박지원 \(Matter 구성원\)/);
  assert.match(visibleText, /최지원 \(Matter 구성원\)/);
  assert.match(visibleText, /Leena Kim \(Foreign Attorney\)/);
  assert.doesNotMatch(visibleText, /user-owner|user-assignee|user-opaque|user-embedded|aad-object-42|object-id-42/);
  assert.doesNotMatch(visibleText, /123e4567-e89b-42d3-a456-426614174000/);
  assert.doesNotMatch(visibleText, /iam-user-1|퇴사자|오래된 담당자/);
  assert.match(markup, /value="user-assignee-2"/);
});

test("Matter 담당자 선택기는 담당자 없는 owner와 비활성·만료·미확인 구성원을 후보로 만들지 않는다", () => {
  const options = buildMatterTaskAssigneeOptions(
    {
      kind: "data",
      team: [
        {
          user_id: "user-inactive",
          display_name: "퇴사한 책임자",
          role: "responsible_attorney",
          status: "inactive",
          identity_resolution_state: "resolved",
          assignment_eligible: false,
        },
        {
          user_id: "user-unresolved",
          display_name: "연결 미확인",
          role: "associate",
          status: "active",
          identity_resolution_state: "unresolved",
          assignment_eligible: false,
        },
      ],
    },
    { owner_user_id: "user-missing-owner", owner_display_name: "이름이 남은 이전 책임자" },
  );

  assert.deepEqual(options, []);
});

test("Matter owner 라벨은 비권위 matter owner_display_name으로 대체하지 않는다", () => {
  const options = buildMatterTaskAssigneeOptions(
    {
      kind: "data",
      team: [
        {
          user_id: "user-owner",
          display_name: null,
          role: "responsible_attorney",
          status: "active",
          identity_resolution_state: "resolved",
          assignment_eligible: true,
        },
      ],
    },
    {
      owner_user_id: "user-owner",
      owner_display_name: "이전 담당 변호사",
    },
  );

  assert.deepEqual(options, [
    {
      userId: "user-owner",
      label: "담당자 이름 확인 필요",
      roleLabel: "책임 변호사",
    },
  ]);
});

test("Matter 업무 생성 API payload keeps assigned_to_user_id", async () => {
  const captured = await captureRequest(
    () => createMatterActivity({
      matterId: "matter-assignment-1",
      activityType: "task",
      title: "오늘 준비서면",
      dueAt: "2026-07-31T09:00:00.000Z",
      assignedToUserId: "user-assignee-1",
    }),
    { outcome: "created", item: { activity_id: "task-1", activity_type: "task" } },
  );

  assert.equal(captured.input, "/api/matters/matter-assignment-1/activities");
  assert.equal(captured.init.method, "POST");
  assert.equal(captured.body.activity.assigned_to_user_id, "user-assignee-1");
  assert.equal("assigned_to" in captured.body.activity, false);
});

test("Matter 업무 수정 API payload keeps the selected assignee", async () => {
  const captured = await captureRequest(
    () => patchMatterActivity({
      matterId: "matter-assignment-1",
      activityId: "task-1",
      patch: {
        status: "in_progress",
        assigned_to_user_id: "user-assignee-2",
      },
    }),
    { outcome: "updated", item: { activity_id: "task-1", activity_type: "task" } },
  );

  assert.equal(captured.input, "/api/matters/matter-assignment-1/activities/task-1");
  assert.equal(captured.init.method, "PATCH");
  assert.deepEqual(captured.body.patch, {
    status: "in_progress",
    assigned_to_user_id: "user-assignee-2",
  });
});
