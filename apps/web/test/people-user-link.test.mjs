import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./people-overview-test-support.mjs";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";

test("employee profile links and revokes a login account with readback and duplicate protection", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-041");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage(harness);
    await page.getByRole("button", { name: "김아민", exact: true }).click();
    await page.getByRole("tab", { name: "프로필" }).click();
    const section = page.locator("[data-people-user-links]");
    await section.waitFor();
    const accountSelect = section.getByLabel("연결할 로그인 계정");
    await accountSelect.selectOption({ label: "김아민 · amin@example.test" });
    state.links.push({
      link_id: "link-race",
      employee_id: "emp-2",
      user_id: "iam-user-1",
      purpose: "login_mapping",
    });
    await section.getByRole("button", { name: "계정 연결" }).click();
    await section.getByText("이미 다른 구성원에게 연결된 로그인 계정입니다.", { exact: true }).waitFor();
    assert.equal(await accountSelect.inputValue(), "");
    assert.doesNotMatch(await section.textContent(), /iam-user-1/);
    assert.doesNotMatch(await accountSelect.evaluate((element) => element.outerHTML), /iam-user-1/);
    await page.screenshot({
      path: join(evidenceDir, "employee-login-account-duplicate-safe.png"),
      fullPage: true,
    });
    state.links = state.links.filter((link) => link.link_id !== "link-race");

    await accountSelect.selectOption({ label: "김아민 · amin@example.test" });
    await section.getByRole("button", { name: "계정 연결" }).click();
    await section.getByText("로그인 계정 연결됨", { exact: true }).waitFor();
    assert.equal(await section.getByText("iam-user-1", { exact: true }).count(), 0);
    assert.doesNotMatch(await section.textContent(), /iam-user-1/);
    assert.equal(await section.locator('[data-people-user-link-state="connected"]').count(), 1);
    assert.equal(state.links.length, 1);
    const createIndex = state.requestLog.findIndex(
      (entry) => entry.pathname === "/api/hrx/employee-user-links" && entry.method === "POST",
    );
    assert.ok(
      state.requestLog.slice(createIndex + 1).some(
        (entry) => entry.pathname === "/api/hrx/employee-user-links" && entry.method === "GET",
      ),
    );
    await page.screenshot({
      path: join(evidenceDir, "employee-login-account-linked.png"),
      fullPage: true,
    });

    await section.getByRole("button", { name: "연결 해제" }).click();
    await section.getByText("연결된 로그인 계정 없음", { exact: true }).waitFor();
    assert.equal(state.links.length, 0);
    await page.close();
  } finally {
    await harness.close();
  }
});
