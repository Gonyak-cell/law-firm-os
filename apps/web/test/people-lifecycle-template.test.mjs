import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./people-overview-test-support.mjs";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";

test("lifecycle board shows the fixed template version, due dates, dependencies, and retry state", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-046");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage({
      ...harness,
      section: "people-lifecycle",
      prepareState(current) {
        current.onboarding.push({
          onboarding_id: "onb-template-2",
          employee_id: "emp-1",
          start_date: "2026-08-15",
          template_ref: { template_id: "lawyer-onboarding", version: "1", role_key: "lawyer" },
          document_refs: [],
          tasks: [{
            task_id: "welcome",
            title: "업무 시작 안내",
            owner_role: "people_ops",
            due_on: "2026-08-15",
            required: true,
            depends_on_task_ids: [],
            status: "pending",
            attempt_count: 0,
          }],
        });
        current.offboarding.push({
          offboarding_id: "off-template-2",
          employee_id: "emp-2",
          separation_date: "2026-09-30",
          state: "open",
          template_ref: { template_id: "lawyer-offboarding", version: "1", role_key: "lawyer" },
          tasks: [{
            task_id: "documents",
            title: "퇴사 자료 확인",
            owner_role: "people_ops",
            due_on: "2026-09-25",
            required: true,
            depends_on_task_ids: [],
            status: "pending",
            attempt_count: 0,
          }],
          access_revocations: [{ revoked: false, confirmation_ref: null }],
          document_returns: [{ returned: false }],
          legal_hold_checks: [{ clear: true }],
          matter_reassignments: [],
          handover_items: [],
          operational_close: {
            source_state: "ok",
            ready: false,
            blockers: [{ code: "offboarding_readiness_incomplete" }],
            evidence_count: 0,
          },
        });
      },
    });
    await page.getByText(/기준 v1/).first().waitFor();
    await page.getByText("선행 업무 1건", { exact: true }).waitFor();
    const lifecycle = page.locator("#people-lifecycle");
    const targetName = lifecycle.getByText("이서윤", { exact: true }).first();
    const secondTargetName = lifecycle.getByText("김아민", { exact: true }).first();
    await targetName.waitFor();
    await secondTargetName.waitFor();
    const lifecycleRows = lifecycle.locator(".lifecycle-task-row");
    const rowTexts = await lifecycleRows.allTextContents();
    assert.ok(rowTexts.length >= 7);
    assert.ok(rowTexts.every((text) => text.includes("김아민") || text.includes("이서윤")));

    const accountRow = page.locator(".lifecycle-task-row").filter({ hasText: "업무 계정 설정" });
    assert.equal(await accountRow.getByRole("button", { name: "완료", exact: true }).isDisabled(), true);
    const documentsRow = page.locator(".lifecycle-task-row").filter({ hasText: "입사 서류 확인" });
    await documentsRow.getByRole("button", { name: "완료", exact: true }).click();
    await accountRow.getByRole("button", { name: "완료", exact: true }).waitFor({ state: "visible" });
    assert.equal(await accountRow.getByRole("button", { name: "완료", exact: true }).isDisabled(), false);

    const handoverRow = page.locator(".lifecycle-task-row").filter({ hasText: "담당 사건 인수인계" });
    await handoverRow.getByRole("button", { name: "다시 시도", exact: true }).click();
    assert.equal(state.offboarding[0].tasks[0].status, "pending");
    assert.equal(state.offboarding[0].tasks[0].attempt_count, 2);
    await page.getByText("대기", { exact: true }).last().waitFor();

    await page.screenshot({
      path: join(evidenceDir, "versioned-lifecycle-tasks-and-retry.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const menuButton = page.getByRole("button", { name: "업무 메뉴", exact: true });
    if (await menuButton.getAttribute("aria-expanded") === "true") await menuButton.click();
    await page.locator("[data-context-sidebar]").waitFor({ state: "hidden" });
    for (const name of [targetName, secondTargetName]) {
      await name.scrollIntoViewIfNeeded();
      assert.equal(await name.evaluate((element) => element.scrollWidth <= element.clientWidth), true);
      assert.equal(await name.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const topElement = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        return bounds.left >= 0
          && bounds.right <= window.innerWidth
          && Boolean(topElement && (topElement === element || topElement.contains(element) || element.contains(topElement)));
      }), true);
    }
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
      true,
    );
    await page.screenshot({
      path: join(evidenceDir, "lifecycle-target-name-390.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("lifecycle board uses generic target labels when roster names are not authorized", async () => {
  const harness = await startPeopleManagementHarness();
  try {
    const { page } = await openPeopleManagementPage({
      ...harness,
      section: "people-lifecycle",
      lifecycleRosterVisible: false,
    });
    const lifecycle = page.locator("#people-lifecycle");
    await lifecycle.getByText("신규 구성원", { exact: true }).first().waitFor();
    await lifecycle.getByText(/퇴사 예정 구성원/).first().waitFor();
    assert.equal(await lifecycle.getByText("김아민", { exact: true }).count(), 0);
    assert.equal(await lifecycle.getByText("이서윤", { exact: true }).count(), 0);
    await page.close();
  } finally {
    await harness.close();
  }
});
