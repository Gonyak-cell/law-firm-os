import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { repoRoot } from "./people-overview-test-support.mjs";
import {
  openPeopleManagementPage,
  startPeopleManagementHarness,
} from "./people-management-test-support.mjs";

test("organization editor keeps a future change out of the current chart and verifies it as-of", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-042");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page, state } = await openPeopleManagementPage({
      ...harness,
      section: "people-org-chart",
    });
    const editor = page.locator("[data-hr-org-editor]");
    await editor.waitFor();
    await editor.getByLabel("구성원").selectOption("emp-1");
    await editor.getByLabel("직속 상급자").selectOption("emp-2");
    await editor.getByLabel("조직").selectOption("group_firm_leadership");
    await editor.getByLabel("적용일").fill("2026-08-01");
    await editor.getByRole("button", { name: "저장" }).click();
    const savedState = page.locator("[data-hr-workforce-local-state]");
    await savedState.waitFor();
    assert.match(await savedState.innerText(), /2026-08-01부터 적용될 변경으로 기록했습니다/);

    const scheduled = page.locator("[data-hr-org-scheduled-changes]");
    await scheduled.getByText("김아민", { exact: true }).waitFor();
    assert.match(await scheduled.innerText(), /Firm Leadership/);
    assert.equal(currentOrg(state.profiles.get("emp-1"), "2026-07-30"), "group_litigation");
    assert.equal(currentOrg(state.profiles.get("emp-1"), "2026-08-01"), "group_firm_leadership");

    const after = await page.evaluate(async () => {
      const response = await fetch("/api/hrx/org-chart?as_of=2026-08-01");
      return response.json();
    });
    assert.equal(
      after.employees.find((employee) => employee.employee_id === "emp-1").org_unit_id,
      "group_firm_leadership",
    );
    await page.screenshot({
      path: join(evidenceDir, "organization-current-and-scheduled.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("organization history resolves display names and fails closed for unmapped identifiers", async () => {
  const harness = await startPeopleManagementHarness();
  const evidenceDir = join(repoRoot, "artifacts/people-v2/PEO-TUW-042");
  await mkdir(evidenceDir, { recursive: true });
  try {
    const { page } = await openPeopleManagementPage({
      ...harness,
      section: "people-org-chart",
    });
    await page.route("**/api/hrx/org-chart", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          outcome: "ok",
          as_of: "2026-07-30",
          org_units: [
            { org_unit_id: "group_litigation", label: "Litigation", department: "org-department-1", parent_org_unit_id: "org_legal", member_count: 6 },
            { org_unit_id: "org-unit-must-not-render", label: "ORG-UNIT-MUST-NOT-RENDER 조직", department: "Legal", parent_org_unit_id: "org_legal", member_count: 0 },
            { org_unit_id: "org-unit-uuid", label: "550e8400-e29b-41d4-a716-446655440000", department: "Legal", parent_org_unit_id: "org_legal", member_count: 0 },
          ],
          employees: [
            { employee_id: "emp-1", display_name: "김아민", title: "파트너 변호사", org_unit_id: "group_litigation", org_unit_label: "Litigation", department: "송무", manager_employee_id: "", manager_display_name: "", direct_report_count: 1 },
            { employee_id: "emp-2", display_name: "이서윤", title: "변호사", org_unit_id: "group_litigation", org_unit_label: "Litigation", department: "자문", manager_employee_id: "emp-1", manager_display_name: "상급자 EMP-1", direct_report_count: 0 },
            { employee_id: "employee-id-must-not-render", display_name: "employee-id-must-not-render", title: "EMP-TITLE-1 관리자", org_unit_id: "group_litigation", org_unit_label: "Litigation", department: "송무", manager_employee_id: "", manager_display_name: "", direct_report_count: 0 },
            { employee_id: "emp-substring", display_name: "prefix EMP-SUBSTRING display", title: "구성원", org_unit_id: "group_litigation", org_unit_label: "Litigation", department: "송무", manager_employee_id: "", manager_display_name: "", direct_report_count: 0 },
            { employee_id: "emp-uuid", display_name: "550e8400-e29b-41d4-a716-446655440000", title: "구성원", org_unit_id: "group_litigation", org_unit_label: "Litigation", department: "송무", manager_employee_id: "", manager_display_name: "", direct_report_count: 0 },
            { employee_id: "emp-manager-raw", display_name: "EMP-MANAGER-RAW", title: "구성원", org_unit_id: "group_litigation", org_unit_label: "Litigation", department: "송무", manager_employee_id: "", manager_display_name: "", direct_report_count: 0 },
          ],
          reporting_lines: [],
          change_events: [
            {
              event_id: "history-known",
              object_id: "object-id-must-not-render",
              metadata: {
                employee_id: "emp-1",
                to_org_unit_id: "group_litigation",
                to_manager_employee_id: "emp-2",
              },
            },
            {
              event_id: "history-object-fallback",
              object_id: "emp-2",
              metadata: {
                to_org_unit_id: "org-unit-must-not-render",
                to_manager_employee_id: "manager-id-must-not-render",
              },
            },
            {
              event_id: "history-unresolved",
              object_id: "object-id-must-not-render-either",
              metadata: {
                employee_id: "employee-id-must-not-render",
                to_org_unit_id: "org-unit-must-not-render-either",
                to_manager_employee_id: "manager-id-must-not-render-either",
              },
            },
            {
              event_id: "history-substring-and-uuid",
              object_id: "emp-substring",
              metadata: {
                to_org_unit_id: "org-unit-uuid",
                to_manager_employee_id: "emp-manager-raw",
              },
            },
            {
              event_id: "history-uuid-employee",
              object_id: "emp-uuid",
              metadata: {
                to_org_unit_id: "group_litigation",
                to_manager_employee_id: "emp-1",
              },
            },
            {
              event_id: "history-raw-org-and-employee",
              object_id: "employee-id-must-not-render",
              metadata: {
                to_org_unit_id: "org-unit-must-not-render",
                to_manager_employee_id: "emp-1",
              },
            },
          ],
          scheduled_changes: [{
            profile_id: "scheduled-raw",
            effective_from: "2026-08-01",
            employee_id: "emp-scheduled-raw",
            employee_display_name: "employee-emp-scheduled-raw",
            org_unit_id: "org-unit-uuid",
            org_unit_label: "550e8400-e29b-41d4-a716-446655440000",
            manager_employee_id: "emp-manager-raw",
            manager_display_name: "user-emp-manager-raw",
          }],
          claim_boundary: { source_of_truth: "EmploymentProfile" },
        }),
      });
    });
    await page.reload({ waitUntil: "networkidle" });
    const currentText = await page.locator(".hr-org-grid").innerText();
    assert.match(currentText, /구성원 이름 확인 필요/);
    assert.match(currentText, /부서 확인 필요/);
    await page.screenshot({
      path: join(evidenceDir, "organization-current-labels-adversarial.png"),
      fullPage: true,
    });
    await page.getByLabel("구성원 검색").fill("김아민");

    const history = page.locator("[data-hr-org-change-history]");
    await history.getByText("구성원 이름 확인 필요", { exact: true }).first().waitFor();
    const text = await history.innerText();
    assert.match(text, /김아민/);
    assert.match(text, /이서윤/);
    assert.match(text, /Litigation/);
    assert.match(text, /조직 이름 확인 필요/);
    assert.ok((text.match(/구성원 이름 확인 필요/g) ?? []).length >= 3);
    assert.ok((text.match(/조직 이름 확인 필요/g) ?? []).length >= 3);
    assert.ok((text.match(/없음/g) ?? []).length >= 2);
    const rendered = await page.locator("body").innerText();
    for (const identifier of [
      "object-id-must-not-render",
      "org-unit-must-not-render",
      "ORG-UNIT-MUST-NOT-RENDER",
      "org-unit-uuid",
      "org-department-1",
      "employee-id-must-not-render",
      "EMP-TITLE-1",
      "emp-substring",
      "emp-uuid",
      "emp-manager-raw",
      "emp-scheduled-raw",
      "user-emp-manager-raw",
      "manager-id-must-not-render",
    ]) {
      const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      assert.doesNotMatch(rendered, new RegExp(escaped, "i"));
    }
    await page.screenshot({
      path: join(evidenceDir, "organization-history-display-labels.png"),
      fullPage: true,
    });
    await page.close();
  } finally {
    await harness.close();
  }
});

function currentOrg(profiles, asOf) {
  return [...profiles]
    .filter((profile) => profile.effective_from <= asOf)
    .filter((profile) => !profile.effective_to || profile.effective_to >= asOf)
    .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
    .at(-1)?.org_unit_id;
}
