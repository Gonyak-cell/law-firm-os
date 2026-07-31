import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import {
  openPeopleOverviewPage,
  peopleOperationsEnvelope,
  repoRoot,
  startPeopleOverviewHarness,
} from "./people-overview-test-support.mjs";

test("overview renders safe member labels in visible text and timeline ARIA while preserving identity attributes", async () => {
  const envelope = peopleOperationsEnvelope();
  const [legitimateMember, unsafeMember] = envelope.data.team_members;
  legitimateMember.member = {
    ...legitimateMember.member,
    employee_id: "lee",
    display_name: "Leena Kim",
  };
  unsafeMember.member = {
    ...unsafeMember.member,
    employee_id: "emp-email",
    display_name: "lawyer@example.com",
  };
  envelope.data.workload_stage1.rows[0] = {
    ...envelope.data.workload_stage1.rows[0],
    employee_id: "lee",
    display_name: "Leena Kim",
  };
  envelope.data.workload_stage1.rows[1] = {
    ...envelope.data.workload_stage1.rows[1],
    employee_id: "emp-email",
    display_name: "lawyer@example.com",
  };
  envelope.data.action_queues.today_tasks.rows[0].employee_id = "emp-uuid";
  envelope.data.action_queues.today_tasks.rows[0].display_name = "550e8400-e29b-41d4-a716-446655440000";
  envelope.data.action_queues.today_tasks.rows[1].employee_id = "emp-hex";
  envelope.data.action_queues.today_tasks.rows[1].display_name = "0123456789abcdef0123456789abcdef";
  envelope.data.action_queues.time_record_confirmation.rows[0].employee_id = "emp-token";
  envelope.data.action_queues.time_record_confirmation.rows[0].display_name = "opaque-9f2a4c7b8d1e";
  envelope.data.deadline_staffing.items[0].attorneys = [{
    employee_id: "emp-structured",
    display_name: "담당 employee-emp-structured-42",
  }];

  const harness = await startPeopleOverviewHarness();
  const evidenceDir = join(repoRoot, ".omo/evidence");
  const evidencePath = join(evidenceDir, "people-overview-labels-rendered.json");
  const screenshotPath = join(evidenceDir, "people-overview-labels-rendered.png");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const page = await openPeopleOverviewPage({
      ...harness,
      teamOperationsResponse: envelope,
      peopleCapacityEnabled: true,
      capacityRows: [
        {
          employee_id: "emp-code",
          display_name: "ABC-42",
          state: "available",
          scheduled_minutes: 480,
          calendar_reserved_minutes: 60,
          approved_leave_minutes: 0,
          calendar_leave_overlap_minutes: 0,
          occupied_minutes: 60,
          remaining_minutes: 420,
          overbooked_minutes: 0,
          evidence: { calendar: [], leave: [] },
        },
        {
          employee_id: "lee",
          display_name: "Leena Kim",
          state: "available",
          scheduled_minutes: 480,
          calendar_reserved_minutes: 0,
          approved_leave_minutes: 0,
          calendar_leave_overlap_minutes: 0,
          occupied_minutes: 0,
          remaining_minutes: 480,
          overbooked_minutes: 0,
          evidence: { calendar: [], leave: [] },
        },
      ],
    });
    try {
      await page.locator(".people-operations-overview").waitFor();

      const timelineRow = page.locator('[data-people-timeline-member="emp-email"]');
      await timelineRow.waitFor();
      assert.equal(await timelineRow.getByText("구성원 이름 확인 필요", { exact: true }).count(), 1);
      const timelineMemberButton = timelineRow.locator(".people-timeline-member");
      assert.doesNotMatch(await timelineMemberButton.innerText(), /lawyer@example\.com|emp-email/);
      const timelineBlock = timelineRow.locator(".people-timeline-block").first();
      assert.doesNotMatch(await timelineBlock.getAttribute("aria-label"), /lawyer@example\.com|emp-email/);
      assert.equal(await page.locator('[data-people-timeline-member="lee"] .people-timeline-member').getByText("Leena Kim", { exact: true }).count(), 1);

      const workload = page.locator("#people-workload-stage-one .people-workload-list");
      assert.equal(await workload.getByText("구성원 이름 확인 필요", { exact: true }).count(), 1);
      assert.equal(await workload.getByText("Leena Kim", { exact: true }).count(), 1);

      const capacity = page.locator('[data-people-capacity="true"]');
      assert.equal(await capacity.getByText("구성원 이름 확인 필요", { exact: true }).count(), 1);
      assert.equal(await capacity.getByText("Leena Kim", { exact: true }).count(), 1);

      const actionQueues = page.locator("#people-action-queues");
      const actionQueueText = await actionQueues.innerText();
      assert.doesNotMatch(actionQueueText, /550e8400|0123456789abcdef|opaque-9f2a4c7b8d1e|emp-(uuid|hex|token)/i);
      assert.equal(await actionQueues.getByText("변론기일", { exact: true }).count(), 1);

      const staffing = page.locator("#people-deadline-staffing");
      assert.doesNotMatch(await staffing.innerText(), /employee-emp-structured-42|emp-structured/);

      const bodyText = await page.locator("body").innerText();
      assert.doesNotMatch(bodyText, /lawyer@example\.com|550e8400|0123456789abcdef|opaque-9f2a4c7b8d1e|employee-emp-structured-42/);
      assert.match(bodyText, /Leena Kim/);
      assert.equal(await page.locator('[data-people-timeline-member="emp-email"]').count(), 1);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const screenshotSha256 = createHash("sha256").update(await readFile(screenshotPath)).digest("hex");
      await writeFile(evidencePath, `${JSON.stringify({
        schema_version: "lawos.people-v2.overview-labels-rendered-evidence.v1",
        invocation: "node --test apps/web/test/people-overview-labels-rendered.test.mjs",
        scenario: "adversarial member names across action queues, timeline text and ARIA, workload, capacity, and staffing",
        observables: {
          unsafe_labels_replaced: true,
          legitimate_leena_kim_preserved: true,
          timeline_aria_excludes_email_and_employee_id: true,
          identity_attribute_preserved: await page.locator('[data-people-timeline-member="emp-email"]').count() === 1,
        },
        screenshot: {
          path: ".omo/evidence/people-overview-labels-rendered.png",
          sha256: screenshotSha256,
        },
      }, null, 2)}\n`);
    } finally {
      await page.close();
    }
  } finally {
    await harness.close();
  }
});
