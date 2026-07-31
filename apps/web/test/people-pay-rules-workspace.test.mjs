import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const artifactDir = resolve(repositoryRoot, "artifacts/people-v2/PEO-TUW-067");
const labelEvidenceDir = resolve(repositoryRoot, ".omo/evidence/pay-rules-impact-labels-rendered");

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function assertCriticalValueIsNotClipped(locator, expectedText) {
  await locator.waitFor();
  const state = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const parentRect = element.parentElement?.getBoundingClientRect() ?? element.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    const textRect = range.getBoundingClientRect();
    return {
      text: element.textContent?.trim(),
      visible: element.getClientRects().length > 0,
      whiteSpace: style.whiteSpace,
      textOverflow: style.textOverflow,
      clipsOverflow: ["hidden", "clip"].includes(style.overflowX) || ["hidden", "clip"].includes(style.overflowY),
      insideCell: textRect.left >= parentRect.left - 1
        && textRect.right <= parentRect.right + 1
        && textRect.top >= parentRect.top - 1
        && textRect.bottom <= parentRect.bottom + 1,
    };
  });
  assert.equal(state.text, expectedText);
  assert.equal(state.visible, true);
  assert.notEqual(state.whiteSpace, "nowrap");
  assert.notEqual(state.textOverflow, "ellipsis");
  assert.equal(state.clipsOverflow, false);
  assert.equal(state.insideCell, true);
}

function minimumWageRow() {
  return {
    rule_version_id: "minimum-wage-2026",
    rule_kind: "minimum_wage",
    version_code: "KR-2026",
    effective_from: "2026-01-01",
    effective_to: "2026-12-31",
    source_document_hash: "b87d3570ff339e04747d7835228e20c2faeffa7c9fbcdfe79d719e6ed096a30d",
    approval_state: "published",
    created_by_actor_id: "legal-author",
    reviewed_by_actor_id: "legal-reviewer",
    published_by_actor_id: "payroll-approver",
    state_version: 3,
    standard: {
      schema_version: "law-firm-os.hrx.minimum-wage.v1",
      standard_id: "kr-minimum-wage-2026",
      version_code: "KR-2026",
      jurisdiction: "KR",
      effective_from: "2026-01-01",
      effective_to: "2026-12-31",
      hourly_minimum_krw: 10_320,
      monthly_conversion_minutes: 12_540,
      monthly_minimum_krw: 2_156_880,
      rounding_mode: "nearest",
      included_item_codes: ["BASE"],
      excluded_item_codes: ["HOLIDAY", "NIGHT", "OVERTIME"],
      source_document_ref: "document:moel/minimum-wage-notice-2025-47",
      source_document_hash: "b87d3570ff339e04747d7835228e20c2faeffa7c9fbcdfe79d719e6ed096a30d",
      legal_review_state: "approved",
      legal_review_ref: "provider:sandbox/legal/minimum-wage-2026",
      fixture_only: true,
    },
  };
}

function pendingMinimumWageRow() {
  const row = minimumWageRow();
  return {
    ...row,
    approval_state: "draft",
    workflow_state: "pending",
    reviewed_by_actor_id: null,
    published_by_actor_id: null,
    state_version: 1,
    standard: {
      ...row.standard,
      legal_review_state: "pending",
      legal_review_ref: null,
      fixture_only: false,
    },
  };
}

function impact(masked = false, adversarial = false) {
  const common = {
    standard: {
      standard_id: "kr-minimum-wage-2026",
      version_code: "KR-2026",
      effective_from: "2026-01-01",
      effective_to: "2026-12-31",
      source_document_hash: "b87d3570ff339e04747d7835228e20c2faeffa7c9fbcdfe79d719e6ed096a30d",
      legal_review_state: "approved",
    },
    below_candidate_count: 1,
    review_required_count: 1,
    legal_determination: false,
    production_ready_claim: false,
  };
  if (masked) {
    return {
      ...common,
      impacts: [
        { display_name: "구성원 1", result_state: "below_candidate", is_below_candidate: true, legal_determination: false },
        { display_name: "구성원 2", result_state: "review_required", is_below_candidate: null, legal_determination: false },
      ],
    };
  }
  if (adversarial) {
    const labels = [
      ["emp-email", "user-email", "lawyer@example.com"],
      ["emp-uuid", "user-uuid", "550e8400-e29b-41d4-a716-446655440000"],
      ["emp-hex", "user-hex", "0123456789abcdef0123456789abcdef"],
      ["emp-opaque", "user-opaque", "opaque-9f2a4c7b8d1e"],
      ["case-42", "user-case-42", "EMP-CASE-42"],
      ["emp-exact", "user-exact", "EMP-EXACT"],
      ["emp-user-exact", "user-exact", "USER-EXACT"],
      ["kim", "user-kim", "Kim Min"],
      ["park", "user-park", "Park Jiyoon"],
      ["lee", "lee", "Leena Kim"],
    ];
    return {
      ...common,
      below_candidate_count: 0,
      review_required_count: 0,
      impacts: labels.map(([employee_id, user_id, display_name]) => ({
        employee_id,
        user_id,
        display_name,
        contractual_minutes: 12_540,
        included_wage_krw: 2_200_000,
        required_wage_krw: 2_156_880,
        effective_hourly_krw: 10_526,
        gap_krw: 43_120,
        is_below_candidate: false,
        result_state: "meets_or_above",
        unknown_item_codes: [],
        legal_determination: false,
      })),
    };
  }
  return {
    ...common,
    impacts: [
      {
        display_name: "서지원",
        contractual_minutes: 12_540,
        included_wage_krw: 2_100_000,
        required_wage_krw: 2_156_880,
        effective_hourly_krw: 10_048,
        gap_krw: -56_880,
        is_below_candidate: true,
        result_state: "below_candidate",
        unknown_item_codes: [],
        legal_determination: false,
      },
      {
        display_name: "김양태",
        contractual_minutes: 12_540,
        included_wage_krw: 2_200_000,
        required_wage_krw: 2_156_880,
        effective_hourly_krw: 10_526,
        gap_krw: 43_120,
        is_below_candidate: null,
        result_state: "review_required",
        unknown_item_codes: ["NEW_ALLOWANCE"],
        legal_determination: false,
      },
    ],
  };
}

async function openPayRules(harness, {
  workspaceEnabled = true,
  publishEnabled = true,
  minimumWageState = "published",
  canLegalApprove = true,
  masked = false,
  adversarial = false,
  viewport = { width: 1360, height: 960 },
  locale = "ko-KR",
  timezoneId = "Asia/Seoul",
} = {}) {
  const state = {
    allowanceRules: [],
    minimumWageStandards: minimumWageState === "empty"
      ? []
      : [minimumWageState === "pending" ? pendingMinimumWageRow() : minimumWageRow()],
    selfReviewBlocked: true,
    createBodies: [],
    publishAttempts: 0,
    legalApprovalAttempts: 0,
    legalReviewBodies: [],
  };
  const page = await harness.browser.newPage({ viewport, locale, timezoneId });
  await page.addInitScript(({ workspaceEnabled: workspace, publishEnabled: publish }) => {
    window.__LAWOS_PEOPLE_FEATURE_FLAGS__ = {
      pay_rules_workspace: workspace,
      payroll_rule_publish: publish,
    };
  }, { workspaceEnabled, publishEnabled });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/hrx/payroll/rules" && request.method() === "GET") {
      return json(route, { outcome: "ok", rules: state.allowanceRules });
    }
    if (path === "/api/hrx/payroll/rules" && request.method() === "POST") {
      const body = request.postDataJSON();
      state.createBodies.push(body);
      assert.deepEqual(Object.keys(body.rules.segment_rates).sort(), ["holiday", "night", "overtime", "weekly_holiday"]);
      assert.equal(Object.hasOwn(body.rules, "javascript"), false);
      const row = {
        rule_version_id: "allowance-2026-h2",
        rule_kind: "payroll_earnings",
        version_code: body.version_code,
        effective_from: body.effective_from,
        effective_to: body.effective_to,
        source_document_hash: body.source_document_hash,
        approval_state: "draft",
        state_version: 1,
        rules: body.rules,
      };
      state.allowanceRules = [row];
      return json(route, { outcome: "created", rule: row }, 201);
    }
    if (path === "/api/hrx/payroll/rules/allowance-2026-h2/review" && request.method() === "POST") {
      if (state.selfReviewBlocked) {
        return json(route, { outcome: "blocked", safe_error_code: "HRX_PAYROLL_SELF_APPROVAL" }, 403);
      }
      state.allowanceRules[0] = { ...state.allowanceRules[0], approval_state: "reviewed", state_version: 2 };
      return json(route, { outcome: "reviewed", rule: state.allowanceRules[0] });
    }
    if (path === "/api/hrx/payroll/rules/allowance-2026-h2/publish" && request.method() === "POST") {
      state.publishAttempts += 1;
      if (!request.headers()["x-lawos-hrx-step-up"]) {
        return json(route, {
          outcome: "blocked",
          safe_error_code: "HRX_STEP_UP_REQUIRED",
          step_up_required: true,
          required_purpose: "payroll_export_review",
          fail_closed: true,
        }, 403);
      }
      state.allowanceRules[0] = { ...state.allowanceRules[0], approval_state: "published", state_version: 3 };
      return json(route, { outcome: "published", rule: state.allowanceRules[0] });
    }
    if (path === "/api/auth/step-up" && request.method() === "POST") {
      assert.deepEqual(request.postDataJSON(), { purpose: "payroll_export_review", totp_code: "123456" });
      return json(route, {
        outcome: "verified",
        step_up_token: "lawos_hrx_step_up_v1.synthetic-browser-proof",
        expires_at: "2026-07-30T23:59:59+09:00",
      });
    }
    if (path === "/api/hrx/payroll/minimum-wage" && request.method() === "GET") {
      return json(route, {
        outcome: "ok",
        standards: state.minimumWageStandards,
        permissions: { can_legal_approve: canLegalApprove },
      });
    }
    if (path === "/api/hrx/payroll/minimum-wage" && request.method() === "POST") {
      const body = request.postDataJSON();
      state.createBodies.push(body);
      assert.equal(body.standard.legal_review_state, "pending");
      assert.equal(body.standard.legal_review_ref, null);
      const row = {
        ...pendingMinimumWageRow(),
        rule_version_id: "minimum-wage-created",
        version_code: body.standard.version_code,
        effective_from: body.standard.effective_from,
        effective_to: body.standard.effective_to,
        source_document_hash: body.standard.source_document_hash,
        created_by_actor_id: "minimum-wage-author",
        standard: body.standard,
      };
      state.minimumWageStandards = [row];
      return json(route, { outcome: "created", standard: row }, 201);
    }
    if (path === "/api/hrx/payroll/minimum-wage/minimum-wage-created/legal-approve" && request.method() === "POST") {
      state.legalApprovalAttempts += 1;
      state.legalReviewBodies.push(request.postDataJSON());
      if (!canLegalApprove) {
        return json(route, { outcome: "blocked", safe_error_code: "HRX_MINIMUM_WAGE_LEGAL_REVIEW_SCOPE_REQUIRED", fail_closed: true }, 403);
      }
      if (!publishEnabled) {
        return json(route, { outcome: "blocked", safe_error_code: "HRX_PAYROLL_RULE_PUBLISH_DISABLED", fail_closed: true }, 403);
      }
      if (!request.headers()["x-lawos-hrx-step-up"]) {
        return json(route, {
          outcome: "blocked",
          safe_error_code: "HRX_STEP_UP_REQUIRED",
          step_up_required: true,
          required_purpose: "payroll_export_review",
          fail_closed: true,
        }, 403);
      }
      const current = state.minimumWageStandards[0];
      const body = request.postDataJSON();
      state.minimumWageStandards[0] = {
        ...current,
        workflow_state: "legal_approved",
        state_version: 2,
        standard: {
          ...current.standard,
          legal_review_state: "approved",
          legal_review_ref: body.legal_review_ref,
        },
      };
      return json(route, { outcome: "legal_approved", standard: state.minimumWageStandards[0] });
    }
    if (path === "/api/hrx/payroll/minimum-wage/minimum-wage-created/review" && request.method() === "POST") {
      state.minimumWageStandards[0] = {
        ...state.minimumWageStandards[0],
        workflow_state: "reviewed",
        approval_state: "reviewed",
        state_version: 3,
      };
      return json(route, { outcome: "reviewed", standard: state.minimumWageStandards[0] });
    }
    if (path === "/api/hrx/payroll/minimum-wage/minimum-wage-created/publish" && request.method() === "POST") {
      state.publishAttempts += 1;
      if (!request.headers()["x-lawos-hrx-step-up"]) {
        return json(route, {
          outcome: "blocked",
          safe_error_code: "HRX_STEP_UP_REQUIRED",
          step_up_required: true,
          required_purpose: "payroll_export_review",
          fail_closed: true,
        }, 403);
      }
      state.minimumWageStandards[0] = {
        ...state.minimumWageStandards[0],
        workflow_state: "published",
        approval_state: "published",
        state_version: 4,
      };
      return json(route, { outcome: "published", standard: state.minimumWageStandards[0] });
    }
    if (path === "/api/hrx/payroll/minimum-wage/preview" && request.method() === "POST") {
      assert.deepEqual(request.postDataJSON(), { as_of: "2026-07-30" });
      return json(route, { outcome: "review_required", impact: impact(masked, adversarial) });
    }
    return json(route, {});
  });
  await page.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-pay-rules`, { waitUntil: "networkidle" });
  return { page, state };
}

test("PEO-TUW-067 creates a bounded version and enforces self-review, step-up, and publication", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openPayRules(harness);
    await page.locator('[data-pay-rules-workspace="true"]').waitFor();
    await page.getByRole("button", { name: "새 버전" }).click();
    await page.getByLabel("버전 이름").fill("ALLOWANCE-2026-H2");
    await page.getByLabel("시행일").fill("2026-07-01");
    await page.getByLabel("종료일").fill("2026-12-31");
    await page.getByLabel("근거 문서 SHA-256").fill("a".repeat(64));
    await page.getByRole("button", { name: "초안 저장" }).click();
    await page.getByText("ALLOWANCE-2026-H2", { exact: true }).waitFor();
    assert.equal(state.createBodies.length, 1);

    await page.getByRole("button", { name: "검토 완료" }).click();
    await page.getByText("작성자와 다른 검토자가 필요합니다.", { exact: true }).waitFor();
    state.selfReviewBlocked = false;
    await page.getByRole("button", { name: "검토 완료" }).click();
    await page.getByText("검토 완료", { exact: true }).waitFor();

    await page.getByRole("button", { name: "적용 시작" }).click();
    await page.locator('[data-hrx-step-up-challenge="true"]').waitFor();
    await page.getByLabel("6자리 확인 코드").fill("123456");
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await page.getByText("현재 적용", { exact: true }).waitFor();
    assert.equal(state.publishAttempts, 2);
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "pay-rules-transition-desktop.png"), fullPage: true });
    await page.getByRole("tab", { name: "최저임금 기준" }).click();
    await page.getByText("법률 검토 완료", { exact: true }).waitFor();
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-067 moves a new minimum wage standard through legal approval, payroll review, and publication", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openPayRules(harness, { minimumWageState: "empty" });
    await page.getByRole("tab", { name: "최저임금 기준" }).click();
    await page.getByRole("button", { name: "새 기준" }).click();
    await page.getByRole("button", { name: "검토 전 기준 저장" }).click();
    await page.getByText("법률 검토 전", { exact: true }).waitFor();

    await page.getByLabel("법률 검토 근거").fill("document:legal/minimum-wage-2026");
    await page.getByRole("button", { name: "법률 검토 승인" }).click();
    await page.locator('[data-hrx-step-up-challenge="true"]').waitFor();
    await page.getByLabel("6자리 확인 코드").fill("123456");
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await page.getByText("법률 검토 완료", { exact: true }).waitFor();
    await assertCriticalValueIsNotClipped(
      page.locator(".pay-rules-minimum-wage-table .pay-rules-effective-period"),
      "2026-01-01 ~ 2026-12-31",
    );
    assert.equal(state.legalApprovalAttempts, 2);
    assert.deepEqual(state.legalReviewBodies.at(-1), {
      expected_version: 1,
      legal_review_ref: "document:legal/minimum-wage-2026",
    });
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "minimum-wage-legal-approved-desktop.png"), fullPage: true });

    await page.getByRole("button", { name: "급여 검토 완료" }).click();
    await page.getByText("검토 완료", { exact: true }).waitFor();
    await page.getByRole("button", { name: "적용 시작" }).click();
    await page.getByText("현재 적용", { exact: true }).waitFor();
    assert.equal(state.publishAttempts, 1);
    assert.equal(state.minimumWageStandards[0].workflow_state, "published");
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-067 shows legal-review permission and feature-switch boundaries before mutation", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const unauthorized = await openPayRules(harness, { minimumWageState: "pending", canLegalApprove: false });
    await unauthorized.page.getByRole("tab", { name: "최저임금 기준" }).click();
    await unauthorized.page.getByText("법률 검토 권한 없음", { exact: true }).waitFor();
    assert.equal(await unauthorized.page.getByRole("button", { name: "법률 검토 승인" }).count(), 0);
    assert.equal(unauthorized.state.legalApprovalAttempts, 0);
    await unauthorized.page.close();

    const disabled = await openPayRules(harness, { minimumWageState: "pending", publishEnabled: false });
    await disabled.page.getByRole("tab", { name: "최저임금 기준" }).click();
    const disabledAction = disabled.page.getByRole("button", { name: "법률 검토 승인" });
    await disabledAction.waitFor();
    assert.equal(await disabledAction.isDisabled(), true);
    assert.equal(disabled.state.legalApprovalAttempts, 0);
    await disabled.page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-067 shows calculation rationale, redacts amounts, and stays usable on mobile", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const visible = await openPayRules(harness, { viewport: { width: 390, height: 844 } });
    await visible.page.getByRole("tab", { name: "최저임금 기준" }).click();
    const minimumWageTableWrap = visible.page.locator(".pay-rules-minimum-wage-table").locator("..");
    assert.equal(await minimumWageTableWrap.evaluate((element) => element.scrollWidth > element.clientWidth), true);
    await minimumWageTableWrap.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    assert.equal(await visible.page.locator(".pay-rules-minimum-wage-table td:last-child").isVisible(), true);
    await visible.page.getByRole("button", { name: "구성원별 확인" }).click();
    await visible.page.getByText("미달 가능", { exact: true }).last().waitFor();
    const firstResult = visible.page.locator('[data-impact-state="below_candidate"]');
    await firstResult.locator("summary").focus();
    await visible.page.keyboard.press("Enter");
    await firstResult.getByText("포함 임금", { exact: true }).waitFor();
    await assertCriticalValueIsNotClipped(
      visible.page.locator(".pay-rules-impact-summary").getByText("KR-2026", { exact: true }),
      "KR-2026",
    );
    await assertCriticalValueIsNotClipped(
      visible.page.locator(".pay-rules-impact-summary").getByText("표시", { exact: true }),
      "표시",
    );
    await visible.page.getByText("서지원", { exact: true }).waitFor();
    assert.equal(await visible.page.getByText("emp-1", { exact: true }).count(), 0);
    assert.equal(await visible.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await mkdir(artifactDir, { recursive: true });
    await firstResult.scrollIntoViewIfNeeded();
    await visible.page.screenshot({ path: resolve(artifactDir, "minimum-wage-impact-mobile.png"), fullPage: false });
    await visible.page.close();

    const hidden = await openPayRules(harness, { masked: true });
    await hidden.page.getByRole("tab", { name: "최저임금 기준" }).click();
    await hidden.page.getByRole("button", { name: "구성원별 확인" }).click();
    await hidden.page.getByText("금액 보기 권한 없음", { exact: true }).first().waitFor();
    assert.equal(await hidden.page.getByText("금액 보기 권한 없음", { exact: true }).count(), 2);
    await hidden.page.getByText("구성원 1", { exact: true }).waitFor();
    assert.equal(await hidden.page.getByText("emp-1", { exact: true }).count(), 0);
    await hidden.page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-FIX-UI-B PayRules impact DOM and accessible summaries fail closed for identifier labels", async () => {
  const harness = await startPeopleOverviewHarness();
  const unsafeLabels = [
    "lawyer@example.com",
    "550e8400-e29b-41d4-a716-446655440000",
    "0123456789abcdef0123456789abcdef",
    "opaque-9f2a4c7b8d1e",
    "EMP-CASE-42",
    "EMP-EXACT",
    "USER-EXACT",
  ];
  try {
    const { page } = await openPayRules(harness, { adversarial: true });
    await page.getByRole("tab", { name: "최저임금 기준" }).click();
    await page.getByRole("button", { name: "구성원별 확인" }).click();
    const list = page.locator(".pay-rules-impact-list");
    await list.locator("summary").first().waitFor();
    const visibleText = await list.innerText();
    const accessibleSummaries = await list.locator("summary").evaluateAll((nodes) => nodes.map((node) => ({
      text: node.textContent?.trim() ?? "",
      ariaLabel: node.getAttribute("aria-label") ?? "",
      title: node.getAttribute("title") ?? "",
    })));
    const accessibleText = JSON.stringify(accessibleSummaries);
    for (const unsafeLabel of unsafeLabels) {
      assert.equal(visibleText.includes(unsafeLabel), false, `unsafe visible label leaked: ${unsafeLabel}`);
      assert.equal(accessibleText.includes(unsafeLabel), false, `unsafe accessible label leaked: ${unsafeLabel}`);
    }
    for (const safeLabel of ["Kim Min", "Park Jiyoon", "Leena Kim"]) {
      assert.equal(await list.locator("summary").filter({ hasText: safeLabel }).count(), 1, `${safeLabel} should remain visible`);
      assert.equal(await list.getByLabel(new RegExp(safeLabel)).count(), 1, `${safeLabel} should remain in the accessibility tree`);
    }
    assert.equal(await list.locator("summary").count(), 10);
    await mkdir(labelEvidenceDir, { recursive: true });
    const screenshot = resolve(labelEvidenceDir, "pay-rules-impact-labels.png");
    const receipt = resolve(labelEvidenceDir, "pay-rules-impact-labels.json");
    await page.screenshot({ path: screenshot, fullPage: true });
    await writeFile(receipt, `${JSON.stringify({
      scenario: "PEO-FIX-UI-B minimum-wage impact identifier-shaped display names",
      unsafe_labels_absent_from_visible_dom: unsafeLabels.every((label) => !visibleText.includes(label)),
      unsafe_labels_absent_from_accessible_summaries: unsafeLabels.every((label) => !accessibleText.includes(label)),
      preserved_names: ["Kim Min", "Park Jiyoon", "Leena Kim"],
      summary_count: accessibleSummaries.length,
      screenshot,
    }, null, 2)}\n`, "utf8");
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-067 returns to the existing review panel when its independent flag is off", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page } = await openPayRules(harness, { workspaceEnabled: false });
    assert.equal(await page.locator('[data-pay-rules-workspace="true"]').count(), 0);
    await page.locator('[data-people-feature-state="people-pay-rules"]').waitFor();
    await page.getByText("검토 필요", { exact: true }).waitFor();
    await page.close();
  } finally {
    await harness.close();
  }
});
