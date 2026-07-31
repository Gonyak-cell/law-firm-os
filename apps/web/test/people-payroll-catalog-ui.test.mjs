import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const artifactDir = resolve(repositoryRoot, "artifacts/people-v2/PEO-TUW-064");

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function fixture() {
  return {
    employees: [{ employee_id: "emp-1", display_name: "김아민", status: "active" }],
    items: [{
      item_id: "item-base",
      code: "BASE",
      display_name: "기본급",
      kind: "earning",
      tax_treatment: "taxable",
      value_mode: "fixed",
      calculation_order: 10,
      effective_from: "2026-01-01",
      effective_to: null,
      status: "active",
      state_version: 1,
    }],
    profiles: [],
    itemReads: 0,
    profileReads: 0,
    compensationReads: 0,
    profileCreates: 0,
    profileUpdates: 0,
    compensationRecords: null,
    compensationStepUp: false,
    profileStepUp: false,
    profileStepUpRequests: [],
    assignedAmount: null,
    deniedItems: false,
    deniedProfiles: false,
    errorItems: false,
    stepUpItems: false,
  };
}

async function openCatalog(harness, state = fixture()) {
  const page = await harness.browser.newPage({ viewport: { width: 1360, height: 960 } });
  await page.addInitScript(() => {
    window.__LAWOS_PEOPLE_FEATURE_FLAGS__ = {
      pay_rules_workspace: true,
      payroll_rule_publish: false,
    };
  });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === "/api/hrx/payroll/rules" && request.method() === "GET") {
      return json(route, { outcome: "ok", rules: [] });
    }
    if (path === "/api/hrx/payroll/minimum-wage" && request.method() === "GET") {
      return json(route, { outcome: "ok", standards: [] });
    }
    if (path === "/api/hrx/employees" && request.method() === "GET") {
      return json(route, { outcome: "ok", employees: state.employees });
    }
    if (path === "/api/hrx/compensation" && request.method() === "GET") {
      state.compensationReads += 1;
      assert.equal(url.searchParams.get("employee_id"), "emp-1");
      if (state.compensationStepUp && request.headers()["x-lawos-hrx-step-up"] !== "lawos_hrx_step_up_v1.compensation-browser-proof") {
        return json(route, {
          outcome: "blocked",
          safe_error_code: "HRX_STEP_UP_REQUIRED",
          step_up_required: true,
          required_purpose: "compensation_access",
          fail_closed: true,
        }, 403);
      }
      return json(route, {
        outcome: "ok",
        compensation_records: state.compensationRecords ?? [{
          compensation_id: "comp-emp-1-2026",
          employee_id: "emp-1",
          masked_compensation_ref: "compensation_ref_hash:7c2a22f4a1e0",
          encrypted_amount_ref_included: false,
          raw_amount_included: false,
          currency_ref: "KRW",
          effective_from: "2026-01-01",
          effective_to: null,
        }],
      });
    }
    if (path === "/api/auth/step-up" && request.method() === "POST") {
      const stepUpBody = request.postDataJSON();
      assert.equal(stepUpBody.totp_code, "123456");
      assert.equal(["payroll_export_review", "compensation_access"].includes(stepUpBody.purpose), true);
      return json(route, {
        outcome: "verified",
        step_up_token: stepUpBody.purpose === "compensation_access"
          ? "lawos_hrx_step_up_v1.compensation-browser-proof"
          : "lawos_hrx_step_up_v1.payroll-catalog-browser-proof",
        expires_at: "2026-07-31T23:59:59+09:00",
      });
    }
    if (path === "/api/hrx/payroll/items" && request.method() === "GET") {
      state.itemReads += 1;
      assert.equal(url.searchParams.get("include_inactive"), "true");
      if (state.stepUpItems && request.headers()["x-lawos-hrx-step-up"] !== "lawos_hrx_step_up_v1.payroll-catalog-browser-proof") {
        return json(route, {
          outcome: "blocked",
          safe_error_code: "HRX_STEP_UP_REQUIRED",
          step_up_required: true,
          required_purpose: "payroll_export_review",
          fail_closed: true,
        }, 403);
      }
      if (state.errorItems) {
        return json(route, { outcome: "error", safe_error_code: "HRX_PAYROLL_CATALOG_UNAVAILABLE" }, 503);
      }
      if (state.deniedItems) {
        return json(route, {
          outcome: "denied",
          ui_state: "denied",
          safe_error_codes: ["HRX_AUTHZ_DENIED"],
        }, 403);
      }
      return json(route, { outcome: "ok", items: state.items });
    }
    if (path === "/api/hrx/payroll/items" && request.method() === "POST") {
      const body = request.postDataJSON();
      const item = {
        ...body,
        code: body.code.toUpperCase(),
        effective_to: body.effective_to ?? null,
        state_version: 1,
      };
      state.items.push(item);
      return json(route, { outcome: "created", item }, 201);
    }
    if (path.startsWith("/api/hrx/payroll/items/") && request.method() === "PATCH") {
      const itemId = decodeURIComponent(path.split("/").at(-1));
      const body = request.postDataJSON();
      const index = state.items.findIndex((item) => item.item_id === itemId);
      assert.notEqual(index, -1);
      assert.equal(body.expected_version, state.items[index].state_version);
      state.items[index] = {
        ...state.items[index],
        ...body,
        state_version: state.items[index].state_version + 1,
      };
      return json(route, { outcome: "updated", item: state.items[index] });
    }
    if (path === "/api/hrx/payroll/profiles" && request.method() === "POST") {
      state.profileStepUpRequests.push(request.headers()["x-lawos-hrx-step-up"] ?? null);
      if (state.profileStepUp && request.headers()["x-lawos-hrx-step-up"] !== "lawos_hrx_step_up_v1.payroll-catalog-browser-proof") {
        return json(route, {
          outcome: "blocked",
          safe_error_code: "HRX_STEP_UP_REQUIRED",
          step_up_required: true,
          required_purpose: "payroll_export_review",
          fail_closed: true,
        }, 403);
      }
      state.profileCreates += 1;
      const body = request.postDataJSON();
      assert.equal(body.employee_id, "emp-1");
      assert.equal(body.pay_group_code, "KR-MONTHLY");
      assert.equal(body.compensation_ref, "compensation:comp-emp-1-2026");
      assert.deepEqual(body.deduction_input, {
        dependent_count: 0,
        income_tax_exempt: false,
        withholding_category: null,
        pension: { enrolled: false },
        health: { enrolled: false },
        employment_insurance: { enrolled: false },
      });
      const profile = {
        ...body,
        currency: "KRW",
        state_version: 1,
        assignments: [],
      };
      state.profiles.push(profile);
      return json(route, { outcome: "created", profile }, 201);
    }
    if (path.startsWith("/api/hrx/payroll/profiles/") && request.method() === "PATCH") {
      state.profileUpdates += 1;
      const profileId = decodeURIComponent(path.split("/").at(-1));
      const body = request.postDataJSON();
      const profile = state.profiles.find((candidate) => candidate.payroll_profile_id === profileId);
      assert.ok(profile);
      assert.equal(body.expected_version, profile.state_version);
      profile.status = body.status;
      profile.state_version += 1;
      return json(route, { outcome: "updated", profile });
    }
    if (path === "/api/hrx/payroll/profiles/emp-1" && request.method() === "GET") {
      state.profileReads += 1;
      assert.equal(url.searchParams.get("include_history"), "true");
      if (state.deniedProfiles) {
        return json(route, {
          outcome: "denied",
          ui_state: "denied",
          safe_error_codes: ["HRX_AUTHZ_DENIED"],
        }, 403);
      }
      return json(route, { outcome: "ok", profiles: state.profiles });
    }
    const assignmentMatch = path.match(/^\/api\/hrx\/payroll\/profiles\/([^/]+)\/assignments$/);
    if (assignmentMatch && request.method() === "POST") {
      const profileId = decodeURIComponent(assignmentMatch[1]);
      const body = request.postDataJSON();
      state.assignedAmount = body.amount_minor;
      const assignedItem = state.items.find((item) => item.item_id === body.item_id);
      assert.equal(body.effective_from >= assignedItem.effective_from, true);
      const assignment = {
        assignment_id: body.assignment_id,
        payroll_profile_id: profileId,
        employee_id: "emp-1",
        item_id: body.item_id,
        version: body.version,
        masked_compensation_ref: "compensation_ref_hash:8e499fef7fe2",
        encrypted_amount_ref_included: false,
        raw_amount_included: false,
        amount_minor: "RAW-WON-SENTINEL",
        encrypted_amount_ref: "ENCRYPTED-REF-SENTINEL",
        currency_ref: "Currency:KRW",
        effective_from: body.effective_from,
        effective_to: body.effective_to,
        status: "active",
      };
      const profile = state.profiles.find((candidate) => candidate.payroll_profile_id === profileId);
      profile.assignments = [assignment];
      return json(route, { outcome: "created", assignment }, 201);
    }
    return json(route, {});
  });
  await page.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-pay-rules`, { waitUntil: "networkidle" });
  await page.locator('[data-pay-rules-workspace="true"]').waitFor();
  return { page, state };
}

test("PEO-TUW-064 creates, updates, and retires payroll items with server readback", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openCatalog(harness);
    await page.getByRole("tab", { name: "급여 항목" }).click();
    await page.getByText("기본급", { exact: true }).waitFor();

    await page.getByRole("button", { name: "새 항목" }).click();
    const form = page.locator('[data-payroll-item-form="true"]');
    await form.getByLabel("항목 코드").fill("MEAL");
    await form.getByLabel("항목 이름").fill("식대");
    await form.getByLabel("세금 처리").selectOption("non_taxable");
    await form.getByLabel("시행일").fill("2026-08-01");
    await form.getByRole("button", { name: "항목 저장" }).click();
    await page.getByText("식대", { exact: true }).waitFor();
    assert.equal(state.itemReads >= 2, true);

    const row = page.locator("tr", { hasText: "MEAL" });
    await row.getByRole("button", { name: "수정" }).click();
    await form.getByLabel("항목 이름").fill("식대 지원");
    await form.getByRole("button", { name: "변경 저장" }).click();
    await page.getByText("식대 지원", { exact: true }).waitFor();

    const updatedRow = page.locator("tr", { hasText: "MEAL" });
    await updatedRow.getByRole("button", { name: "수정" }).click();
    await form.getByLabel("사용 상태").selectOption("inactive");
    await form.getByRole("button", { name: "변경 저장" }).click();
    await updatedRow.getByText("사용 중지", { exact: true }).waitFor();
    assert.equal(state.items.find((item) => item.code === "MEAL").status, "inactive");
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "payroll-items-desktop.png"), fullPage: true });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-064 creates an effective-dated profile, assigns an item, and only renders masked readback", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openCatalog(harness);
    state.items[0].effective_from = "2026-08-15";
    await page.getByRole("tab", { name: "구성원 급여" }).click();
    await page.getByText("등록된 급여 방식이 없습니다.", { exact: true }).waitFor();

    await page.getByRole("button", { name: "급여 방식 추가" }).click();
    const profileForm = page.locator('[data-payroll-profile-form="true"]');
    await profileForm.getByLabel("부양가족 수").fill("0");
    await profileForm.getByLabel("소득세 비과세").selectOption("no");
    await profileForm.getByLabel("국민연금 가입").selectOption("no");
    await profileForm.getByLabel("건강보험 가입").selectOption("no");
    await profileForm.getByLabel("고용보험 가입").selectOption("no");
    await profileForm.getByLabel("시행일").fill("2026-08-01");
    await profileForm.getByRole("button", { name: "급여 방식 저장" }).click();
    await page.locator('[data-payroll-profile-id]').waitFor();
    assert.equal(state.profileReads >= 2, true);

    await page.getByRole("button", { name: "항목 배정" }).click();
    const assignmentForm = page.locator('[data-payroll-assignment-form="true"]');
    assert.equal(await assignmentForm.getByLabel("시행일").inputValue(), "2026-08-15");
    await assignmentForm.getByLabel("금액(원)").fill("3250000");
    await assignmentForm.getByRole("button", { name: "항목 배정" }).click();
    const readback = page.locator('[data-payroll-amount-readback="masked"]');
    await readback.waitFor();
    assert.match(await readback.getAttribute("data-masked-compensation-ref"), /^compensation_ref_hash:/);
    assert.equal(await readback.textContent(), "금액 저장됨");
    assert.equal(await page.getByText("3250000", { exact: true }).count(), 0);
    assert.equal((await page.locator("body").innerText()).includes("RAW-WON-SENTINEL"), false);
    assert.equal((await page.locator("body").innerText()).includes("ENCRYPTED-REF-SENTINEL"), false);
    const serializedDom = await page.content();
    assert.equal(serializedDom.includes("RAW-WON-SENTINEL"), false);
    assert.equal(serializedDom.includes("ENCRYPTED-REF-SENTINEL"), false);
    assert.equal(state.assignedAmount, 3_250_000);
    assert.equal(state.profileReads >= 3, true);
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "payroll-profile-assignment-desktop.png"), fullPage: true });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-064 keeps item and profile permission failures distinct from empty data", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const itemState = fixture();
    itemState.deniedItems = true;
    const deniedItems = await openCatalog(harness, itemState);
    await deniedItems.page.getByRole("tab", { name: "급여 항목" }).click();
    await deniedItems.page.getByRole("alert").filter({ hasText: "급여 항목을 볼 권한이 없습니다." }).waitFor();
    assert.equal(await deniedItems.page.getByText("등록된 급여 항목이 없습니다.", { exact: true }).count(), 0);
    await deniedItems.page.close();

    const profileState = fixture();
    profileState.deniedProfiles = true;
    const deniedProfiles = await openCatalog(harness, profileState);
    await deniedProfiles.page.getByRole("tab", { name: "구성원 급여" }).click();
    await deniedProfiles.page.getByRole("alert").filter({ hasText: "구성원 급여정보를 볼 권한이 없습니다." }).waitFor();
    assert.equal(await deniedProfiles.page.getByText("등록된 급여 방식이 없습니다.", { exact: true }).count(), 0);
    await deniedProfiles.page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-064 blocks profile creation when no tenant compensation record is available", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const state = fixture();
    state.compensationRecords = [];
    const { page } = await openCatalog(harness, state);
    await page.getByRole("tab", { name: "구성원 급여" }).click();
    await page.getByRole("button", { name: "급여 방식 추가" }).click();
    await page.getByText("연결할 급여 기록이 없습니다. 먼저 구성원의 급여 기록을 등록해 주세요.", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "급여 방식 저장" }).isDisabled(), true);
    assert.equal(state.profileCreates, 0);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-064 requires explicit insurance and tax inputs before profile POST", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const state = fixture();
    const { page } = await openCatalog(harness, state);
    await page.getByRole("tab", { name: "구성원 급여" }).click();
    await page.getByRole("button", { name: "급여 방식 추가" }).click();
    const profileForm = page.locator('[data-payroll-profile-form="true"]');
    await profileForm.getByLabel("시행일").fill("2026-08-01");
    await profileForm.getByRole("button", { name: "급여 방식 저장" }).click();
    assert.equal(state.profileCreates, 0);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-064 wires profile deactivation through the PATCH API and readback", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const state = fixture();
    const { page } = await openCatalog(harness, state);
    await page.getByRole("tab", { name: "구성원 급여" }).click();
    await page.getByRole("button", { name: "급여 방식 추가" }).click();
    const profileForm = page.locator('[data-payroll-profile-form="true"]');
    await profileForm.getByLabel("부양가족 수").fill("0");
    await profileForm.getByLabel("소득세 비과세").selectOption("no");
    await profileForm.getByLabel("국민연금 가입").selectOption("no");
    await profileForm.getByLabel("건강보험 가입").selectOption("no");
    await profileForm.getByLabel("고용보험 가입").selectOption("no");
    await profileForm.getByLabel("시행일").fill("2026-08-01");
    await profileForm.getByRole("button", { name: "급여 방식 저장" }).click();
    const profile = page.locator('[data-payroll-profile-id]');
    await profile.waitFor();
    await profile.getByRole("button", { name: "급여 방식 중지" }).click();
    await profile.getByText(/사용 중지/).waitFor();
    assert.equal(state.profileUpdates, 1);
    assert.equal(state.profiles[0].status, "inactive");
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-064 completes additional verification before reading payroll catalog data", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const state = fixture();
    state.stepUpItems = true;
    const { page } = await openCatalog(harness, state);
    await page.getByRole("tab", { name: "급여 항목" }).click();
    await page.locator('[data-hrx-step-up-challenge="true"]').waitFor();
    assert.equal(await page.getByText("기본급", { exact: true }).count(), 0);
    await page.getByLabel("6자리 확인 코드").fill("123456");
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await page.getByText("기본급", { exact: true }).waitFor();
    assert.equal(state.itemReads, 2);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-064 completes compensation step-up before loading a bindable record", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const state = fixture();
    state.compensationStepUp = true;
    state.profileStepUp = true;
    const { page } = await openCatalog(harness, state);
    await page.getByRole("tab", { name: "구성원 급여" }).click();
    await page.getByRole("button", { name: "급여 방식 추가" }).click();
    await page.locator('[data-hrx-step-up-challenge="true"]').waitFor();
    await page.getByLabel("6자리 확인 코드").fill("123456");
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await page.getByText(/연결할 급여 기록/).waitFor();
    const profileForm = page.locator('[data-payroll-profile-form="true"]');
    await profileForm.getByLabel("부양가족 수").fill("0");
    await profileForm.getByLabel("소득세 비과세").selectOption("no");
    await profileForm.getByLabel("국민연금 가입").selectOption("no");
    await profileForm.getByLabel("건강보험 가입").selectOption("no");
    await profileForm.getByLabel("고용보험 가입").selectOption("no");
    await profileForm.getByLabel("시행일").fill("2026-08-01");
    await profileForm.getByRole("button", { name: "급여 방식 저장" }).click();
    await page.locator('[data-hrx-step-up-challenge="true"]').waitFor();
    assert.equal(state.profileCreates, 0);
    assert.equal(state.profileStepUpRequests[0], null);
    await page.getByLabel("6자리 확인 코드").fill("123456");
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await profileForm.getByRole("button", { name: "급여 방식 저장" }).click();
    await page.locator('[data-payroll-profile-id]').waitFor();
    assert.equal(state.profileCreates, 1);
    assert.equal(state.compensationReads >= 2, true);
    assert.equal(state.profileStepUpRequests[1], "lawos_hrx_step_up_v1.payroll-catalog-browser-proof");
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "payroll-profile-stepup-purpose-desktop.png"), fullPage: true });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-064 only offers assignment end for the current effective lineage", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const state = fixture();
    const dateKey = (offset = 0) => {
      const date = new Date();
      date.setDate(date.getDate() + offset);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };
    state.profiles = [{
      payroll_profile_id: "profile-history",
      employee_id: "emp-1",
      employment_type: "monthly",
      pay_group_code: "KR-MONTHLY",
      currency: "KRW",
      compensation_unit: "period",
      compensation_quantity: 1,
      effective_from: "2020-01-01",
      effective_to: null,
      status: "active",
      state_version: 1,
      assignments: [
        {
          assignment_id: "assignment-expired",
          payroll_profile_id: "profile-history",
          employee_id: "emp-1",
          item_id: "item-base",
          version: 1,
          masked_compensation_ref: "compensation_ref_hash:expired",
          encrypted_amount_ref_included: false,
          raw_amount_included: false,
          effective_from: "2020-01-01",
          effective_to: dateKey(-2),
          status: "active",
        },
        {
          assignment_id: "assignment-current",
          payroll_profile_id: "profile-history",
          employee_id: "emp-1",
          item_id: "item-base",
          version: 2,
          masked_compensation_ref: "compensation_ref_hash:current",
          encrypted_amount_ref_included: false,
          raw_amount_included: false,
          effective_from: dateKey(-1),
          effective_to: null,
          status: "active",
        },
        {
          assignment_id: "assignment-future",
          payroll_profile_id: "profile-history",
          employee_id: "emp-1",
          item_id: "item-base",
          version: 3,
          masked_compensation_ref: "compensation_ref_hash:future",
          encrypted_amount_ref_included: false,
          raw_amount_included: false,
          effective_from: dateKey(1),
          effective_to: null,
          status: "active",
        },
        {
          assignment_id: "assignment-superseded",
          payroll_profile_id: "profile-history",
          employee_id: "emp-1",
          item_id: "item-base",
          version: 4,
          masked_compensation_ref: "compensation_ref_hash:superseded",
          encrypted_amount_ref_included: false,
          raw_amount_included: false,
          effective_from: dateKey(-1),
          effective_to: null,
          status: "active",
        },
        {
          assignment_id: "assignment-superseded-tombstone",
          payroll_profile_id: "profile-history",
          employee_id: "emp-1",
          item_id: "item-base",
          version: 5,
          masked_compensation_ref: "compensation_ref_hash:superseded",
          encrypted_amount_ref_included: false,
          raw_amount_included: false,
          effective_from: dateKey(0),
          effective_to: null,
          status: "inactive",
        },
      ],
    }];
    const { page } = await openCatalog(harness, state);
    await page.getByRole("tab", { name: "구성원 급여" }).click();
    await page.locator('[data-payroll-assignment-id="assignment-current"]').waitFor();
    assert.equal(await page.getByRole("button", { name: "적용 종료" }).count(), 1);
    for (const assignmentId of ["assignment-expired", "assignment-future", "assignment-superseded", "assignment-superseded-tombstone"]) {
      assert.equal(
        await page.locator(`[data-payroll-assignment-id="${assignmentId}"]`).getByRole("button", { name: "적용 종료" }).count(),
        0,
        `${assignmentId} must not expose an end action`,
      );
    }
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-064 distinguishes a true empty catalog from a request failure", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const emptyState = fixture();
    emptyState.employees = [];
    emptyState.items = [];
    const empty = await openCatalog(harness, emptyState);
    await empty.page.getByRole("tab", { name: "급여 항목" }).click();
    await empty.page.getByText("등록된 급여 항목이 없습니다.", { exact: true }).waitFor();
    await empty.page.getByRole("tab", { name: "구성원 급여" }).click();
    await empty.page.getByText("등록된 구성원이 없습니다.", { exact: true }).waitFor();
    assert.equal(await empty.page.getByRole("alert").count(), 0);
    await empty.page.close();

    const errorState = fixture();
    errorState.errorItems = true;
    const failed = await openCatalog(harness, errorState);
    await failed.page.getByRole("tab", { name: "급여 항목" }).click();
    await failed.page.getByRole("alert").filter({ hasText: "급여 항목을 불러오지 못했습니다." }).waitFor();
    assert.equal(await failed.page.getByText("등록된 급여 항목이 없습니다.", { exact: true }).count(), 0);
    assert.equal(await failed.page.getByRole("button", { name: "새 항목" }).isDisabled(), true);
    await failed.page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-064 never renders a raw employee id when the display name is missing", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const state = fixture();
    state.employees = [
      { employee_id: "emp-1", status: "active" },
      { employee_id: "Emp-Case-42", display_name: "EMP-CASE-42 관리자", status: "active" },
      { employee_id: "emp-uuid", display_name: "담당자 550e8400-e29b-41d4-a716-446655440000", status: "active" },
      { employee_id: "emp-opaque", display_name: "담당자 user_opaque_2026", status: "active" },
    ];
    const { page } = await openCatalog(harness, state);
    await page.getByRole("tab", { name: "구성원 급여" }).click();

    const memberFilter = page.locator('[data-payroll-profile-member-filter="true"]');
    const employeeSelect = memberFilter.locator("select");
    await employeeSelect.waitFor();
    await employeeSelect.locator("option").first().waitFor({ state: "attached" });
    assert.deepEqual(
      await employeeSelect.locator("option").allTextContents(),
      ["구성원 이름 확인 필요", "구성원 이름 확인 필요", "구성원 이름 확인 필요", "구성원 이름 확인 필요"],
    );
    await page.getByRole("heading", { name: "구성원 이름 확인 필요", exact: true }).waitFor();

    const renderedText = await page.locator("body").innerText();
    for (const identifier of [
      "emp-1",
      "Emp-Case-42",
      "550e8400-e29b-41d4-a716-446655440000",
      "user_opaque_2026",
    ]) {
      assert.equal(renderedText.toLowerCase().includes(identifier.toLowerCase()), false);
    }
    assert.equal(renderedText.includes("구성원 이름 확인 필요"), true);
    const accessibleLabels = await page.locator("[aria-label]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? ""));
    assert.equal(accessibleLabels.some((label) => /emp-1|emp-case-42|550e8400|user_opaque_2026/i.test(label)), false);

    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "payroll-employee-identity-fallback.png"), fullPage: true });
    await page.close();
  } finally {
    await harness.close();
  }
});
