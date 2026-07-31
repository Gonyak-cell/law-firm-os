import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./people-overview-test-support.mjs";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";

async function fillEmployeeDrawer(page, employeeId, displayName) {
  const drawer = page.locator('[data-people-employee-editor="create"]');
  await drawer.getByLabel("구성원 번호").fill(employeeId);
  await drawer.getByLabel("표시 이름").fill(displayName);
  await drawer.getByRole("button", { name: "저장", exact: true }).click();
}

test("registration defaults to direct entry, keeps planned entry separate, and preserves candidate data", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-043");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage({
      ...harness,
      section: "people-recruiting",
    });
    const direct = page.locator('[data-people-registration-mode="direct"]');
    await direct.waitFor();
    assert.equal(await page.locator('[data-people-registration-mode="candidate"]').count(), 0);
    assert.equal(await page.locator("#people-candidate-portal").count(), 0);
    assert.equal(await page.getByText("지원자를 선택하세요.", { exact: true }).count(), 0);
    assert.equal(await page.getByText(/채용 KPI/).count(), 0);

    await direct.getByRole("button", { name: "구성원 정보 입력" }).click();
    await fillEmployeeDrawer(page, "emp-direct", "정다온");
    await direct.getByText("구성원 등록 완료", { exact: true }).waitFor();
    assert.equal(state.employees.some((employee) => employee.employee_id === "emp-direct"), true);
    await page.screenshot({
      path: join(evidenceDir, "registration-direct-default.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "입사 예정", exact: true }).click();
    const planned = page.locator('[data-people-registration-mode="planned"]');
    await planned.getByLabel("입사일").fill("2026-08-15");
    await planned.getByLabel("직위").fill("어소시에이트 변호사");
    await planned.getByRole("button", { name: "입사 예정 구성원 입력" }).click();
    await fillEmployeeDrawer(page, "emp-planned", "최하람");
    await planned.getByText("입사 예정 구성원 등록 완료", { exact: true }).waitFor();
    const plannedProfile = state.profiles.get("emp-planned")?.[0];
    assert.equal(plannedProfile?.effective_from, "2026-08-15");
    assert.equal(plannedProfile?.status, "future");
    await page.screenshot({
      path: join(evidenceDir, "registration-planned.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "채용 절차", exact: true }).click();
    const candidate = page.locator('[data-people-registration-mode="candidate"]');
    await candidate.getByRole("cell", { name: "기존 채용 건", exact: true }).waitFor();
    assert.equal(await page.locator("#people-candidate-portal").count(), 0);
    assert.equal(await page.getByText("지원자를 선택하세요.", { exact: true }).count(), 0);
    assert.equal(await candidate.getByLabel("공고명").inputValue(), "");
    assert.equal(
      await candidate.getByRole("button", { name: "채용 절차 시작", exact: true }).isDisabled(),
      true,
    );
    await candidate.getByText(
      "채용 자료 연계 필요: 승인·동의·문서·보상·일정 연계를 설정한 뒤 시작할 수 있습니다.",
      { exact: true },
    ).waitFor();
    await candidate.getByText("동의 유효", { exact: true }).waitFor();
    await candidate.getByText(/동의 2027-07-30/).waitFor();
    await candidate.getByText(/보관 2028-07-30/).waitFor();
    const candidateText = await candidate.textContent();
    assert.doesNotMatch(candidateText, /Vault:offer-letter:new|CompPackage:new|Vault:consent:new|Vault:offer-existing|CompPackage:offer-existing/);
    assert.equal(await candidate.locator('[name="offer_document_ref"]').count(), 0);
    assert.equal(await candidate.locator('[name="compensation_ref"]').count(), 0);
    assert.equal(await candidate.locator('[name="consent_evidence_ref"]').count(), 0);
    assert.equal(await candidate.getByText("raw resume", { exact: true }).count(), 0);
    await page.screenshot({
      path: join(evidenceDir, "registration-candidate-existing-data.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await harness.close();
  }
});
