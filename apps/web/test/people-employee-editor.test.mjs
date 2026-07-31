import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./people-overview-test-support.mjs";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";

async function fillCreateForm(page, { employeeId, displayName, email = "" }) {
  const drawer = page.locator('[data-people-employee-editor="create"]');
  await drawer.getByLabel("구성원 번호").fill(employeeId);
  await drawer.getByLabel("표시 이름").fill(displayName);
  if (email) await drawer.getByLabel("업무용 이메일").fill(email);
  return drawer;
}

test("employee create and edit wait for server readback, while duplicate errors preserve input", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-039");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage(harness);
    await page.locator("[data-people-employee-create]").click();
    const createDrawer = await fillCreateForm(page, {
      employeeId: "emp-new",
      displayName: "박새로",
      email: "new@example.test",
    });
    await createDrawer.getByRole("button", { name: "저장", exact: true }).click();
    await page.getByText("구성원 등록 완료", { exact: true }).waitFor();
    assert.equal(state.employees.find((employee) => employee.employee_id === "emp-new")?.display_name, "박새로");
    const createIndex = state.requestLog.findIndex(
      (entry) => entry.pathname === "/api/hrx/employees" && entry.method === "POST",
    );
    assert.ok(
      state.requestLog.slice(createIndex + 1).some(
        (entry) => entry.pathname === "/api/hrx/employees/emp-new" && entry.method === "GET",
      ),
    );
    assert.ok(
      state.requestLog.slice(createIndex + 1).some(
        (entry) => entry.pathname === "/api/hrx/employees" && entry.method === "GET",
      ),
    );
    await page.getByRole("button", { name: "상세 패널 닫기" }).click();
    await page.locator('[data-people-detail-panel="open"]').waitFor({ state: "detached" });

    await page.getByRole("button", { name: "김아민 수정" }).click();
    const editDrawer = page.locator('[data-people-employee-editor="edit"]');
    await editDrawer.getByLabel("표시 이름").fill("김아민 변호사");
    await editDrawer.getByRole("button", { name: "저장", exact: true }).click();
    await page.getByText("구성원 수정 완료", { exact: true }).waitFor();
    assert.equal(state.employees.find((employee) => employee.employee_id === "emp-1")?.display_name, "김아민 변호사");
    await page.getByRole("button", { name: "상세 패널 닫기" }).click();
    await page.locator('[data-people-detail-panel="open"]').waitFor({ state: "detached" });

    await page.locator("[data-people-employee-create]").click();
    const duplicateDrawer = await fillCreateForm(page, {
      employeeId: "emp-1",
      displayName: "중복 입력 보존",
    });
    await duplicateDrawer.getByRole("button", { name: "저장", exact: true }).click();
    const duplicateError = duplicateDrawer.locator("[data-people-employee-editor-error]");
    await duplicateError.waitFor();
    assert.match(await duplicateError.innerText(), /이미 사용 중인 구성원 번호입니다/);
    assert.equal(await page.getByText("구성원 수정 완료", { exact: true }).count(), 0);
    assert.equal(await duplicateDrawer.getByLabel("구성원 번호").inputValue(), "emp-1");
    assert.equal(await duplicateDrawer.getByLabel("표시 이름").inputValue(), "중복 입력 보존");
    await page.screenshot({
      path: join(evidenceDir, "employee-editor-duplicate-preserves-input.png"),
      fullPage: true,
    });
    await duplicateDrawer.getByRole("button", { name: "취소", exact: true }).click();
    await duplicateDrawer.waitFor({ state: "detached" });
    assert.equal(await page.locator("[data-hr-workforce-local-state]").count(), 0);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("employee editor explains permission denial without clearing the form", async () => {
  const harness = await startPeopleManagementHarness();
  try {
    const { page } = await openPeopleManagementPage({ ...harness, denyWrites: true });
    await page.locator("[data-people-employee-create]").click();
    const drawer = await fillCreateForm(page, {
      employeeId: "emp-denied",
      displayName: "권한 확인",
    });
    await drawer.getByRole("button", { name: "저장", exact: true }).click();
    const error = drawer.locator("[data-people-employee-editor-error]");
    await error.waitFor();
    assert.match(await error.innerText(), /구성원을 저장할 권한이 없습니다/);
    assert.equal(await drawer.getByLabel("표시 이름").inputValue(), "권한 확인");
    await page.close();
  } finally {
    await harness.close();
  }
});
