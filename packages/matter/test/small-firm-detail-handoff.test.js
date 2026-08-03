import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import * as matterPackage from "@law-firm-os/matter";
import {
  buildMatterCoverage,
  buildMatterDetail,
  buildMatterSummary,
  buildMatterTimeline,
  handoffMatter,
  recordMatterMeeting,
  selectMatterNextAction,
} from "../src/small-firm-detail-service.js";
import { createMatterRepository } from "../src/repository.js";
import { createSmallFirmMatterWorkService } from "../src/small-firm-work-service.js";

const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/matter-small-firm-foundation.fixture.json", import.meta.url), "utf8"),
);
const tenant_id = fixture.tenant_id;
const now = fixture.as_of;
const timezone = fixture.timezone;

function scoped(row) {
  return { tenant_id, ...row };
}

function durableRepository(prefix = "lawos-matter-detail-") {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  return createMatterRepository({ filePath: join(directory, "matter.json") });
}

function matterInput(overrides = {}) {
  return {
    model_type: "Matter",
    tenant_id,
    matter_id: "matter-handoff",
    client_id: "client-handoff",
    title: "[QA] 인수인계 사건",
    status: "open",
    created_by: "person-01",
    created_at: now,
    permission_envelope_id: "permission-handoff",
    audit_trace_id: "audit-handoff",
    owner_user_id: "person-03",
    backup_user_id: "person-07",
    ...overrides,
  };
}

function taskInput(overrides = {}) {
  return {
    model_type: "MatterTask",
    tenant_id,
    matter_id: "matter-handoff",
    task_id: "task-handoff-open",
    title: "[QA] 인수인계 업무",
    status: "todo",
    created_by: "person-01",
    assigned_to: "person-03",
    due_at: "2026-07-31T09:00:00.000Z",
    created_at: now,
    ...overrides,
  };
}

function memberInput(userId, overrides = {}) {
  return {
    model_type: "MatterMember",
    tenant_id,
    matter_id: "matter-handoff",
    member_id: `member-${userId}`,
    user_id: userId,
    role: "responsible_attorney",
    status: "active",
    ...overrides,
  };
}

function personInput(userId, overrides = {}) {
  return {
    model_type: "Person",
    resource_id: userId,
    person_id: userId,
    user_id: userId,
    tenant_id,
    status: "active",
    ...overrides,
  };
}

test("[TUW-16] 12개 사건 요약은 담당·백업·다음 기한·다음 행동을 원장에서 계산한다", () => {
  const summaries = fixture.matters.map((matter) => buildMatterSummary({
    matter: scoped(matter),
    tasks: fixture.tasks.map(scoped),
    calendar_events: fixture.calendar_events.map(scoped),
    members: fixture.people.map(scoped),
    now,
    timezone,
  }));

  assert.equal(summaries.length, 12);
  for (const [index, summary] of summaries.entries()) {
    assert.equal(summary.owner_user_id, fixture.matters[index].owner_id);
    assert.equal(summary.backup_user_id, fixture.matters[index].backup_user_id);
  }
  const matterThree = summaries.find((summary) => summary.matter_id === "matter-003");
  assert.equal(matterThree.next_deadline.event_id, "event-001");
  assert.equal(matterThree.next_action.source_id, "task-001");
  assert.equal(matterThree.next_action.timing, "overdue");
  const matterOne = summaries.find((summary) => summary.matter_id === "matter-001");
  assert.equal(matterOne.next_deadline, null);
  assert.equal(matterOne.next_action.title, "다음 행동 없음");
});

test("[TUW-17] next action은 초과 업무, 오늘 기한, 향후 업무 순으로 결정된다", () => {
  const base = {
    tenant_id,
    matter_id: "matter-next",
    now,
    timezone,
  };
  const tasks = [
    scoped({ task_id: "task-future", matter_id: "matter-next", title: "향후 업무", status: "open", due_at: "2026-08-02" }),
    scoped({ task_id: "task-overdue", matter_id: "matter-next", title: "초과 업무", status: "open", due_at: "2026-07-29T09:00:00.000Z" }),
  ];
  const calendar_events = [
    scoped({ event_id: "event-today", matter_id: "matter-next", title: "오늘 기한", status: "scheduled", starts_at: "2026-07-30T05:00:00.000Z" }),
  ];

  assert.equal(selectMatterNextAction({ ...base, tasks, calendar_events }).source_id, "task-overdue");
  assert.equal(selectMatterNextAction({ ...base, tasks: tasks.slice(0, 1), calendar_events }).source_id, "event-today");
  assert.equal(selectMatterNextAction({ ...base, tasks: tasks.slice(0, 1), calendar_events: [] }).source_id, "task-future");
  assert.equal(selectMatterNextAction({ ...base, tasks: [], calendar_events: [] }).action_type, "none");
});

test("[TUW-18] 담당 없음·담당만·담당과 백업·담당 부재 coverage가 구분된다", () => {
  const people = fixture.people.map(scoped);
  const event = scoped({
    event_id: "event-coverage",
    matter_id: "matter-coverage",
    title: "7일 내 기한",
    starts_at: "2026-08-02T02:00:00.000Z",
    status: "scheduled",
  });
  const coverage = (matter, options = {}) => buildMatterCoverage({
    matter: scoped({ matter_id: "matter-coverage", title: "Coverage", status: "open", ...matter }),
    members: people,
    calendar_events: options.calendar_events ?? [],
    absences: options.absences ?? [],
    now,
    timezone,
  });

  assert.equal(coverage({}).coverage_state, "unassigned");
  assert.equal(coverage({ owner_id: "person-03" }).coverage_state, "owner_only");
  assert.equal(
    coverage({ owner_id: "person-03", backup_user_id: "person-07" }).coverage_state,
    "owner_and_backup",
  );
  const absent = coverage(
    { owner_id: "person-03" },
    {
      calendar_events: [event],
      absences: [
        scoped({
          person_id: "person-03",
          starts_at: "2026-07-30T00:00:00.000Z",
          ends_at: "2026-08-01T23:59:59.000Z",
        }),
      ],
    },
  );
  assert.equal(absent.coverage_state, "owner_absent");
  assert.equal(absent.backup_attention, true);
  assert.equal(absent.backup_required, true);
});

test("[TUW-19] 인수인계 replay는 담당과 미완료 업무를 한 번만 바꾸고 audit 한 건을 남긴다", () => {
  const repository = durableRepository();
  repository.create(matterInput());
  repository.create(memberInput("person-04"));
  repository.create(personInput("person-08"));
  repository.create(taskInput());
  repository.create(taskInput({
    task_id: "task-handoff-done",
    title: "[QA] 완료 업무",
    status: "done",
    completed_at: "2026-07-29T09:00:00.000Z",
  }));

  const command = {
    repository,
    tenant_id,
    matter_id: "matter-handoff",
    actor_id: "person-01",
    new_owner_user_id: "person-04",
    new_backup_user_id: "person-08",
    note: "휴가 기간 사건 진행 사항 인수인계",
    idempotency_key: "handoff-001",
    occurred_at: "2026-07-30T01:00:00.000Z",
  };
  const workService = createSmallFirmMatterWorkService({
    repository,
    clock: () => now,
  });
  const myWork = (actorId) => workService.listTaskQueue({
    tenant_id,
    actor_id: actorId,
    saved_view: "my_work",
    as_of: now,
    time_zone: timezone,
  });
  assert.deepEqual(myWork("person-03").items.map((item) => item.id), ["task-handoff-open"]);
  assert.equal(myWork("person-04").count, 0);

  const first = handoffMatter(command);
  const replay = handoffMatter(command);

  assert.equal(first.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(first.matter.owner_user_id, "person-04");
  assert.equal(first.matter.responsible_lawyer, "person-04");
  assert.equal(first.matter.backup_user_id, "person-08");
  assert.equal(
    repository.get({ tenant_id, model_type: "Matter", matter_id: "matter-handoff" }).owner_user_id,
    "person-04",
  );
  assert.equal(
    repository.get({ tenant_id, model_type: "MatterTask", task_id: "task-handoff-open" }).assigned_to,
    "person-04",
  );
  assert.equal(
    repository.get({ tenant_id, model_type: "MatterTask", task_id: "task-handoff-done" }).assigned_to,
    "person-03",
  );
  assert.equal(myWork("person-03").count, 0);
  assert.deepEqual(myWork("person-04").items.map((item) => item.id), ["task-handoff-open"]);
  assert.equal(repository.listAudit({ tenant_id }).filter((event) => event.action === "matter.handoff").length, 1);
  assert.equal(
    repository.list({ tenant_id, matter_id: "matter-handoff", model_type: "MatterTimelineEvent" }).length,
    1,
  );
  assert.throws(
    () => handoffMatter({ ...command, note: "같은 키의 다른 요청" }),
    (error) => error.safe_error_code === "IDEMPOTENCY_CONFLICT",
  );
});

test("[TUW-19][BOUNDARY] 알 수 없거나 비활성인 담당·백업은 어떤 원장도 바꾸기 전에 거부된다", () => {
  const repository = durableRepository();
  repository.create(matterInput());
  repository.create(taskInput());
  repository.create(memberInput("person-active-owner"));
  repository.create(memberInput("person-inactive-owner", { status: "paused" }));
  repository.create(personInput("person-active-backup"));
  repository.create(personInput("person-inactive-backup", { status: "inactive" }));
  const before = repository.snapshot();
  const invalidCommands = [
    {
      idempotency_key: "handoff-unknown-owner",
      new_owner_user_id: "person-unknown-owner",
      new_backup_user_id: "person-active-backup",
      invalid_role: "owner",
    },
    {
      idempotency_key: "handoff-inactive-owner",
      new_owner_user_id: "person-inactive-owner",
      new_backup_user_id: "person-active-backup",
      invalid_role: "owner",
    },
    {
      idempotency_key: "handoff-unknown-backup",
      new_owner_user_id: "person-active-owner",
      new_backup_user_id: "person-unknown-backup",
      invalid_role: "backup",
    },
    {
      idempotency_key: "handoff-inactive-backup",
      new_owner_user_id: "person-active-owner",
      new_backup_user_id: "person-inactive-backup",
      invalid_role: "backup",
    },
  ];

  for (const { invalid_role: invalidRole, ...references } of invalidCommands) {
    assert.throws(
      () => handoffMatter({
        repository,
        tenant_id,
        matter_id: "matter-handoff",
        actor_id: "person-01",
        note: "잘못된 담당자 참조",
        occurred_at: "2026-07-30T01:00:00.000Z",
        ...references,
      }),
      (error) =>
        error.safe_error_code === "MATTER_HANDOFF_ASSIGNEE_INVALID"
        && error.invalid_references.some(({ role }) => role === invalidRole),
    );
    assert.deepEqual(repository.snapshot(), before);
  }
});

test("[TUW-19][BOUNDARY] 백업을 생략해도 현재 백업이 미등록·비활성이면 원장을 바꾸지 않는다", () => {
  for (const currentBackup of [
    { user_id: "person-unknown-backup" },
    { user_id: "person-inactive-backup", status: "inactive" },
  ]) {
    const repository = durableRepository();
    repository.create(matterInput({ backup_user_id: currentBackup.user_id }));
    repository.create(taskInput());
    repository.create(memberInput("person-active-owner"));
    if (currentBackup.status) {
      repository.create(personInput(currentBackup.user_id, { status: currentBackup.status }));
    }
    const before = repository.snapshot();

    assert.throws(
      () => handoffMatter({
        repository,
        tenant_id,
        matter_id: "matter-handoff",
        actor_id: "person-01",
        new_owner_user_id: "person-active-owner",
        note: "현재 백업 담당 유지",
        idempotency_key: `handoff-retain-${currentBackup.user_id}`,
        occurred_at: "2026-07-30T01:00:00.000Z",
      }),
      (error) =>
        error.safe_error_code === "MATTER_HANDOFF_ASSIGNEE_INVALID"
        && error.invalid_references.some(({ role, reference_id: referenceId }) =>
          role === "backup" && referenceId === currentBackup.user_id),
    );
    assert.deepEqual(repository.snapshot(), before);
  }
});

test("[TUW-19][BOUNDARY] 담당만 변경하면 검증된 현재 백업을 유지한다", () => {
  const repository = durableRepository();
  repository.create(matterInput());
  repository.create(taskInput());
  repository.create(memberInput("person-active-owner"));
  repository.create(personInput("person-07"));

  const result = handoffMatter({
    repository,
    tenant_id,
    matter_id: "matter-handoff",
    actor_id: "person-01",
    new_owner_user_id: "person-active-owner",
    note: "현재 백업 담당 유지",
    idempotency_key: "handoff-retain-valid-backup",
    occurred_at: "2026-07-30T01:00:00.000Z",
  });

  assert.equal(result.matter.owner_user_id, "person-active-owner");
  assert.equal(result.matter.backup_user_id, "person-07");
  assert.equal(
    repository.get({ tenant_id, model_type: "Matter", matter_id: "matter-handoff" }).backup_user_id,
    "person-07",
  );
  assert.equal(
    repository.get({ tenant_id, model_type: "MatterTask", task_id: "task-handoff-open" }).assigned_to,
    "person-active-owner",
  );
  assert.equal(repository.listAudit({ tenant_id }).filter((event) => event.action === "matter.handoff").length, 1);
  assert.equal(
    repository.list({ tenant_id, matter_id: "matter-handoff", model_type: "MatterTimelineEvent" }).length,
    1,
  );
});

test("[TUW-19][PUBLIC] modern null 백업은 legacy 값보다 우선해 원자적으로 해제되고 replay된다", () => {
  const repository = durableRepository();
  repository.create(matterInput());
  repository.create(taskInput());
  repository.create(memberInput("person-active-owner"));
  repository.create(personInput("person-08"));
  const command = {
    repository,
    tenant_id,
    matter_id: "matter-handoff",
    actor_id: "person-01",
    new_owner_user_id: "person-active-owner",
    new_backup_user_id: null,
    backup_user_id: "person-08",
    note: "백업 담당 명시적 해제",
    idempotency_key: "handoff-clear-modern-null",
    occurred_at: "2026-07-30T01:00:00.000Z",
  };

  const first = matterPackage.handoffMatter(command);
  const afterFirst = repository.snapshot();
  const replay = matterPackage.handoffMatter(command);

  assert.equal(first.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(first.matter.backup_user_id, null);
  assert.equal(
    repository.get({ tenant_id, model_type: "Matter", matter_id: "matter-handoff" }).backup_user_id,
    null,
  );
  assert.equal(
    repository.get({ tenant_id, model_type: "MatterTask", task_id: "task-handoff-open" }).assigned_to,
    "person-active-owner",
  );
  assert.equal(repository.listAudit({ tenant_id }).filter((event) => event.action === "matter.handoff").length, 1);
  assert.equal(
    repository.list({ tenant_id, matter_id: "matter-handoff", model_type: "MatterTimelineEvent" }).length,
    1,
  );
  assert.deepEqual(repository.snapshot(), afterFirst);
});

test("[TUW-20] 사건 상세 DTO는 정확히 5개 탭으로 같은 사건 record만 묶는다", () => {
  const matter = scoped(fixture.matters.find((row) => row.matter_id === "matter-003"));
  const detailInput = {
    matter,
    tasks: [
      ...fixture.tasks.map(scoped),
      scoped({
        task_id: "task-internal",
        matter_id: "matter-003",
        title: "내부 제한 업무",
        status: "todo",
        due_at: "2026-08-20T09:00:00.000Z",
        required_scope: "matter:internal",
      }),
    ],
    calendar_events: fixture.calendar_events.map(scoped),
    activities: [
      scoped({ activity_id: "activity-in", matter_id: "matter-003", activity_type: "note", title: "같은 사건 메모", created_at: now }),
      scoped({ activity_id: "activity-out", matter_id: "matter-004", activity_type: "note", title: "다른 사건 메모", created_at: now }),
    ],
    timeline_events: [
      scoped({
        event_id: "timeline-internal",
        matter_id: "matter-003",
        type: "matter.followup.internal_note",
        title: "내부 메모",
        occurred_at: "2026-07-30T05:00:00.000Z",
        required_scope: "matter:internal",
        safe_summary: { safe_excerpt: "권한 있는 사용자만 보는 메타데이터" },
      }),
    ],
    documents: [
      scoped({ document_id: "document-in", matter_id: "matter-003", title: "같은 사건 문서" }),
      scoped({
        document_id: "document-internal",
        matter_id: "matter-003",
        title: "내부 제한 문서",
        required_scope: "matter:internal",
      }),
      scoped({ document_id: "document-out", matter_id: "matter-004", title: "다른 사건 문서" }),
    ],
    time_entries: fixture.time_entries.map(scoped),
    wip: fixture.wip.map(scoped),
    invoices: fixture.invoices.map(scoped),
    members: fixture.people.map(scoped),
    now,
    timezone,
  };
  const detail = buildMatterDetail(detailInput);

  assert.deepEqual(
    detail.tabs.map((tab) => tab.id),
    ["overview", "work_deadlines", "contact_history", "documents", "time_billing"],
  );
  for (const tab of detail.tabs) assert.equal(tab.count, detail.tab_data[tab.id].length);
  assert.equal(detail.tab_data.documents.length, 1);
  assert.equal(detail.tab_data.contact_history.some(({ source_id }) => source_id === "timeline-internal"), false);
  assert.equal(detail.tab_data.work_deadlines.some(({ source_id }) => source_id === "task-internal"), false);
  assert.match(detail.tab_data.documents[0].deep_link, /matter-003/);
  for (const items of Object.values(detail.tab_data).slice(1)) {
    for (const item of items) {
      if (item.matter_id) assert.equal(item.matter_id, "matter-003");
    }
  }
  const internalDetail = buildMatterDetail({
    ...detailInput,
    viewer: { scopes: ["matter:internal"] },
  });
  assert.equal(
    internalDetail.tab_data.contact_history.find(({ source_id }) => source_id === "timeline-internal")
      .safe_summary.safe_excerpt,
    "권한 있는 사용자만 보는 메타데이터",
  );
  assert.equal(
    internalDetail.tab_data.work_deadlines.some(({ source_id }) => source_id === "task-internal"),
    true,
  );
  assert.equal(
    internalDetail.tab_data.documents.some(({ source_id }) => source_id === "document-internal"),
    true,
  );
});

test("[TUW-21] 통합 타임라인은 source를 중복 없이 newest-first로 정렬하고 type과 경계를 지킨다", () => {
  const input = {
    tenant_id,
    matter_id: "matter-timeline",
    tasks: [
      scoped({ task_id: "timeline-task", matter_id: "matter-timeline", title: "업무", status: "todo", created_at: "2026-07-30T01:00:00.000Z" }),
    ],
    calendar_events: [
      scoped({ event_id: "timeline-event", matter_id: "matter-timeline", title: "기한", starts_at: "2026-07-30T02:00:00.000Z" }),
    ],
    notes: [
      scoped({ note_id: "timeline-note", matter_id: "matter-timeline", title: "메모", created_at: "2026-07-30T03:00:00.000Z" }),
      scoped({ note_id: "timeline-other", matter_id: "other-matter", title: "다른 사건", created_at: "2026-07-30T05:00:00.000Z" }),
      { tenant_id: "other-tenant", note_id: "timeline-cross-tenant", matter_id: "matter-timeline", title: "다른 테넌트", created_at: "2026-07-30T06:00:00.000Z" },
    ],
    messages: [
      scoped({ message_id: "timeline-message", matter_id: "matter-timeline", title: "메시지", created_at: "2026-07-30T04:00:00.000Z" }),
    ],
    timeline_events: [
      scoped({
        event_id: "timeline-projection-task",
        matter_id: "matter-timeline",
        source_object_id: "timeline-task",
        type: "task",
        title: "업무 projection",
        occurred_at: "2026-07-30T01:00:00.000Z",
      }),
      scoped({
        event_id: "timeline-internal-note",
        matter_id: "matter-timeline",
        type: "matter.followup.internal_note",
        title: "내부 메모",
        occurred_at: "2026-07-30T05:00:00.000Z",
        required_scope: "matter:internal",
        safe_summary: { safe_excerpt: "내부 사건 진행 메타데이터" },
      }),
    ],
  };
  const timeline = buildMatterTimeline(input);

  assert.equal(timeline.count, 4);
  assert.deepEqual(
    timeline.items.map((item) => item.source_id),
    ["timeline-message", "timeline-note", "timeline-event", "timeline-task"],
  );
  assert.deepEqual(
    buildMatterTimeline({ ...input, type: "note" }).items.map((item) => item.source_id),
    ["timeline-note"],
  );
  const internalTimeline = buildMatterTimeline({
    ...input,
    granted_scopes: ["matter:internal"],
  });
  assert.equal(internalTimeline.count, 5);
  assert.equal(internalTimeline.items[0].source_id, "timeline-internal-note");
  assert.equal(internalTimeline.items[0].safe_summary.safe_excerpt, "내부 사건 진행 메타데이터");
  assert.equal(buildMatterTimeline({
    ...input,
    granted_scopes: "matter:internal",
  }).items.some(({ source_id }) => source_id === "timeline-internal-note"), false);
});

test("[TUW-21][DEDUPE] 같은 raw id의 다른 activity type은 보존하고 같은 source projection만 합친다", () => {
  const timeline = buildMatterTimeline({
    tenant_id,
    matter_id: "matter-timeline-collision",
    activities: [
      scoped({
        activity_id: "shared-activity-id",
        matter_id: "matter-timeline-collision",
        activity_type: "meeting",
        title: "회의 원본",
        occurred_at: "2026-07-30T01:00:00.000Z",
      }),
      scoped({
        activity_id: "shared-activity-id",
        matter_id: "matter-timeline-collision",
        activity_type: "client_call",
        title: "통화 원본",
        occurred_at: "2026-07-30T02:00:00.000Z",
      }),
    ],
    timeline_events: [
      scoped({
        event_id: "meeting-projection",
        matter_id: "matter-timeline-collision",
        source_object_id: "shared-activity-id",
        type: "meeting",
        title: "회의 projection",
        occurred_at: "2026-07-30T03:00:00.000Z",
      }),
    ],
  });

  assert.equal(timeline.count, 2);
  assert.deepEqual(timeline.items.map(({ type }) => type), ["meeting", "client_call"]);
  assert.equal(timeline.items.filter(({ type }) => type === "meeting").length, 1);
});

test("[TUW-25][AUTHZ] ops:read만 가진 projection은 표식이 누락된 internal_note도 노출하지 않는다", () => {
  const input = {
    tenant_id,
    matter_id: "matter-internal-projection",
    granted_scopes: ["matter:ops:read"],
    timeline_events: [
      scoped({
        event_id: "internal-note-without-required-scope",
        matter_id: "matter-internal-projection",
        type: "matter.followup.internal_note",
        title: "내부 전략 메모",
        occurred_at: "2026-07-30T03:00:00.000Z",
        metadata: { author_user_id: "person-03" },
        content: "외부에 노출되면 안 되는 내용",
        safe_summary: { safe_excerpt: "내부 메타데이터" },
      }),
    ],
  };

  const operationsOnly = buildMatterTimeline(input);
  assert.equal(operationsOnly.count, 0);
  const internal = buildMatterTimeline({
    ...input,
    granted_scopes: ["matter:ops:read", "matter:internal"],
  });
  assert.equal(internal.count, 1);
  assert.equal(internal.items[0].safe_summary.safe_excerpt, "내부 메타데이터");
});

test("[TUW-22] 회의 기록은 같은 사건의 후속 MatterTask만 연결하고 타임라인에 한 번 나타난다", () => {
  const repository = durableRepository();
  repository.create(matterInput());
  repository.create(taskInput({ task_id: "task-meeting-follow-up" }));
  repository.create(taskInput({
    matter_id: "matter-other",
    task_id: "task-other-matter",
    title: "다른 사건 업무",
  }));
  const command = {
    repository,
    tenant_id,
    matter_id: "matter-handoff",
    actor_id: "person-03",
    idempotency_key: "meeting-001",
    meeting: {
      meeting_id: "meeting-001",
      title: "의뢰인 진행 회의",
      attendee_ids: ["person-03", "person-07"],
      decisions: ["금요일까지 자료를 검토한다"],
      follow_up_task_ids: ["task-meeting-follow-up"],
      occurred_at: "2026-07-30T04:00:00.000Z",
    },
  };
  const first = recordMatterMeeting(command);
  const replay = recordMatterMeeting(command);
  const timeline = buildMatterTimeline({
    tenant_id,
    matter_id: "matter-handoff",
    activities: repository.list({ tenant_id, matter_id: "matter-handoff", model_type: "MatterActivity" }),
    timeline_events: repository.list({ tenant_id, matter_id: "matter-handoff", model_type: "MatterTimelineEvent" }),
  });

  assert.equal(first.meeting.capture_mode, "manual_metadata");
  assert.deepEqual(first.meeting.follow_up_task_ids, ["task-meeting-follow-up"]);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(timeline.count, 1);
  assert.equal(timeline.items[0].type, "meeting");
  assert.throws(
    () => recordMatterMeeting({
      ...command,
      idempotency_key: "meeting-cross-scope",
      meeting: {
        ...command.meeting,
        meeting_id: "meeting-cross-scope",
        follow_up_task_ids: ["task-other-matter"],
      },
    }),
    (error) => error.safe_error_code === "MEETING_FOLLOW_UP_TASK_SCOPE_MISMATCH",
  );
});

test("[TUW-22][VALIDATION] decisions=[] 회의는 write, audit, idempotency 전에 4xx로 거부된다", () => {
  const repository = durableRepository();
  repository.create(matterInput());
  const before = repository.snapshot();

  assert.throws(
    () => recordMatterMeeting({
      repository,
      tenant_id,
      matter_id: "matter-handoff",
      actor_id: "person-03",
      idempotency_key: "meeting-empty-decisions",
      meeting: {
        meeting_id: "meeting-empty-decisions",
        title: "결정 없는 회의",
        attendee_ids: ["person-03"],
        decisions: [],
        occurred_at: "2026-07-30T04:00:00.000Z",
      },
    }),
    (error) =>
      error.status === 400
      && error.safe_error_code === "MEETING_DECISIONS_REQUIRED",
  );
  assert.deepEqual(repository.snapshot(), before);
  assert.equal(repository.listAudit({ tenant_id }).length, 0);
  assert.equal(repository.getIdempotency({
    tenant_id,
    idempotency_key: "meeting-empty-decisions",
  }), undefined);
});

test("[BOUNDARY] detail read models reject tenantless and cross-tenant rows, including members and absences", () => {
  const matter_id = "matter-boundary";
  const excluded = (row) => [
    { ...row },
    { ...row, tenant_id: "tenant-other" },
  ];
  const detail = buildMatterDetail({
    matter: scoped({
      matter_id,
      title: "Boundary Matter",
      status: "open",
      owner_user_id: "person-owner",
    }),
    tasks: excluded({
      task_id: "task-excluded",
      matter_id,
      title: "제외 업무",
      status: "todo",
      due_at: "2026-07-29T09:00:00.000Z",
    }),
    calendar_events: excluded({
      event_id: "event-excluded",
      matter_id,
      title: "제외 기한",
      status: "scheduled",
      starts_at: "2026-07-30T09:00:00.000Z",
    }),
    activities: excluded({
      activity_id: "activity-excluded",
      matter_id,
      title: "제외 활동",
      created_at: "2026-07-30T09:00:00.000Z",
    }),
    notes: excluded({
      note_id: "note-excluded",
      matter_id,
      title: "제외 메모",
      created_at: "2026-07-30T09:00:00.000Z",
    }),
    messages: excluded({
      message_id: "message-excluded",
      matter_id,
      title: "제외 메시지",
      created_at: "2026-07-30T09:00:00.000Z",
    }),
    timeline_events: excluded({
      event_id: "timeline-excluded",
      matter_id,
      title: "제외 타임라인",
      occurred_at: "2026-07-30T09:00:00.000Z",
    }),
    documents: excluded({ document_id: "document-excluded", matter_id, title: "제외 문서" }),
    time_entries: excluded({ entry_id: "time-excluded", matter_id, title: "제외 시간" }),
    wip: excluded({ wip_id: "wip-excluded", matter_id, title: "제외 WIP" }),
    invoices: excluded({ invoice_id: "invoice-excluded", matter_id, title: "제외 송장" }),
    payments: excluded({ payment_id: "payment-excluded", matter_id, title: "제외 결제" }),
    members: [scoped({ user_id: "person-owner", display_name: "담당자" })],
    absences: excluded({
      person_id: "person-owner",
      starts_at: "2026-07-30T00:00:00.000Z",
      ends_at: "2026-07-30T23:59:59.000Z",
    }),
    now,
    timezone,
  });

  assert.deepEqual(
    detail.tabs.map((tab) => [tab.id, tab.count]),
    [
      ["overview", 1],
      ["work_deadlines", 0],
      ["contact_history", 0],
      ["documents", 0],
      ["time_billing", 0],
    ],
  );
  assert.equal(detail.summary.next_action.action_type, "none");
  assert.equal(detail.summary.coverage.owner_absent_today, false);
  assert.equal(buildMatterTimeline({
    tenant_id,
    matter_id,
    entries: excluded({
      event_id: "timeline-direct-excluded",
      matter_id,
      title: "제외 타임라인",
      occurred_at: "2026-07-30T09:00:00.000Z",
    }),
  }).count, 0);
  assert.equal(buildMatterCoverage({
    matter: scoped({ matter_id, title: "Boundary Matter", status: "open" }),
    members: excluded({
      matter_id,
      user_id: "person-tenantless-owner",
      role: "owner",
      status: "active",
    }),
    now,
    timezone,
  }).coverage_state, "unassigned");
});

test("[BOUNDARY] detail mutations require durable persistence and reject timezone-less timestamps before writes", () => {
  assert.throws(() => handoffMatter({}), /durable repository/);
  assert.throws(
    () => handoffMatter({ repository: createMatterRepository() }),
    /durable repository/,
  );
  assert.throws(() => recordMatterMeeting({}), /durable repository/);
  assert.throws(
    () => recordMatterMeeting({ repository: createMatterRepository() }),
    /durable repository/,
  );
  const orphanRepository = durableRepository();
  assert.throws(
    () => recordMatterMeeting({
      repository: orphanRepository,
      tenant_id,
      matter_id: "missing-matter",
      actor_id: "person-01",
      idempotency_key: "meeting-orphan",
      meeting: {
        meeting_id: "meeting-orphan",
        title: "orphan boundary",
        attendee_ids: ["person-01"],
        occurred_at: "2026-07-30T10:00:00.000Z",
      },
    }),
    /Matter not found/,
  );
  assert.deepEqual(orphanRepository.snapshot().records, []);

  const repository = durableRepository();
  repository.create(matterInput());
  repository.create(taskInput({ task_id: "task-timezone" }));
  const before = repository.snapshot();
  assert.throws(
    () => recordMatterMeeting({
      repository,
      tenant_id,
      matter_id: "matter-handoff",
      actor_id: "person-01",
      idempotency_key: "meeting-tenantless-input",
      meeting: {
        tenant_id: undefined,
        meeting_id: "meeting-tenantless-input",
        title: "tenant boundary",
        attendee_ids: ["person-01"],
        occurred_at: "2026-07-30T10:00:00.000Z",
      },
    }),
    (error) => error.safe_error_code === "MATTER_SCOPE_MISMATCH",
  );
  assert.throws(
    () => handoffMatter({
      repository,
      tenant_id,
      matter_id: "matter-handoff",
      actor_id: "person-01",
      new_owner_user_id: "person-04",
      note: "timezone boundary",
      idempotency_key: "handoff-timezone-less",
      occurred_at: "2026-07-30T10:00:00",
    }),
    /ISO timestamp with timezone/,
  );
  assert.throws(
    () => recordMatterMeeting({
      repository,
      tenant_id,
      matter_id: "matter-handoff",
      actor_id: "person-01",
      idempotency_key: "meeting-timezone-less",
      meeting: {
        meeting_id: "meeting-timezone-less",
        title: "timezone boundary",
        attendee_ids: ["person-01"],
        follow_up_task_ids: ["task-timezone"],
        occurred_at: "2026-07-30T10:00:00",
      },
    }),
    /ISO timestamp with timezone/,
  );
  assert.deepEqual(repository.snapshot(), before);
  assert.throws(
    () => buildMatterSummary({
      matter: matterInput(),
      now: "2026-07-30T10:00:00",
    }),
    /ISO timestamp with timezone/,
  );
});

test("[BARREL] @law-firm-os/matter exports detail and operations contracts", () => {
  for (const exportName of [
    "buildMatterDetail",
    "handoffMatter",
    "recordMatterMeeting",
    "buildTodayOperations",
    "restoreArchivedMatter",
  ]) {
    assert.equal(typeof matterPackage[exportName], "function", `${exportName} must be public`);
  }
});
