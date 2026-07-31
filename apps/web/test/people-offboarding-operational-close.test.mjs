import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./people-overview-test-support.mjs";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";

test("offboarding UI explains Matter blockers and shows linked-account revocation after close", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-047");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage({
      ...harness,
      section: "people-lifecycle",
    });
    const targetRoster = page.locator('[data-hr-workforce-density="compact"]');
    await targetRoster.getByRole("button", { name: "퇴사예정", exact: true }).click();
    const targetName = targetRoster.getByText("김아민", { exact: true });
    await targetName.waitFor();
    assert.equal(await targetName.evaluate((element) => element.scrollWidth <= element.clientWidth), true);
    const closeRow = page.locator(".lifecycle-task-row").filter({ hasText: "퇴사 정리" }).last();
    const closeButton = closeRow.getByRole("button", { name: "종료", exact: true });

    await closeRow.getByText("담당 사건 재배정 필요 / 최신 처리 확인 필요", { exact: true }).waitFor();
    assert.equal(await closeButton.isDisabled(), true);
    await page.screenshot({
      path: join(evidenceDir, "matter-blockers-before-close.png"),
      fullPage: true,
    });

    const handoverRow = page.locator(".lifecycle-task-row").filter({ hasText: "담당 사건 인수인계" });
    await handoverRow.getByRole("button", { name: "다시 시도", exact: true }).click();
    state.offboarding[0].operational_close = {
      source_state: "ok",
      ready: true,
      blockers: [],
      evidence_count: 6,
    };
    state.offboarding[0].access_revocations = [{ revoked: true, confirmation_ref: "AccessReceipt:001" }];
    state.offboarding[0].matter_reassignments = [{ reassigned: true, reassigned_to_employee_id: "emp-2" }];
    state.offboarding[0].handover_items = [{ completed: true }];
    await handoverRow.getByRole("button", { name: "완료", exact: true }).click();

    await closeRow.getByText("종료 전 확인 완료. 처리 확인 6건", { exact: true }).waitFor();
    assert.equal(await closeButton.isDisabled(), false);
    await closeButton.click();

    await page.getByText("퇴사 정리를 종료하고 연결 계정 1개를 해제했습니다", { exact: true }).waitFor();
    await closeRow.getByText("종료 / 종료 가능", { exact: true }).waitFor();
    assert.equal(
      state.requestLog.some((entry) =>
        entry.method === "POST" &&
        entry.pathname === "/api/hrx/lifecycle/offboarding/off-template-1/close"),
      true,
    );

    await page.screenshot({
      path: join(evidenceDir, "matter-handover-evidence-and-account-revocation.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await harness.close();
  }
});
