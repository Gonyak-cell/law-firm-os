import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const artifactDir = resolve(repositoryRoot, "artifacts/people-v2/PEO-TUW-070");
const stepUpArtifactDir = resolve(repositoryRoot, "artifacts/people-v2/PEO-FIX-068-D-WEB-20260731");

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

const run = Object.freeze({
  run_id: "run-2026-07",
  period_id: "period-2026-07",
  run_type: "regular",
  status: "closed",
  state_version: 5,
});

const employees = Object.freeze([
  { employee_id: "emp-1", display_name: "김아민" },
  { employee_id: "emp-2", display_name: "박로펌" },
  { employee_id: "emp-3", display_name: "이담당" },
]);

function deliveryReceipt(statementId, state, attemptCount = 1) {
  return {
    delivery_receipt_id: `delivery-${statementId}`,
    statement_id: statementId,
    channel: "email",
    state: ["delivered", "read"].includes(state) ? state === "read" ? "viewed" : "delivered" : state === "failed" ? "failed" : "queued",
    provider_result_state: state,
    safe_error_code: state === "failed" ? "SANDBOX_REJECTED" : null,
    attempt_count: attemptCount,
    provider_receipt_ref: ["sent", "delivered", "read"].includes(state) ? `provider:sandbox/delivery/${statementId}` : null,
    created_at: "2026-08-05T09:00:00+09:00",
    last_attempt_at: "2026-08-05T09:01:00+09:00",
    delivered_at: ["delivered", "read"].includes(state) ? "2026-08-05T09:02:00+09:00" : null,
    viewed_at: state === "read" ? "2026-08-05T09:10:00+09:00" : null,
    failed_at: state === "failed" ? "2026-08-05T09:01:00+09:00" : null,
  };
}

function statement(employeeId, providerState) {
  const statementId = `statement-${employeeId}`;
  const mainState = providerState === "read" ? "viewed" : providerState === "delivered" ? "delivered" : "generated";
  return {
    statement_id: statementId,
    run_id: run.run_id,
    employee_id: employeeId,
    template_id: "statement-template-v1",
    document_hash: "a".repeat(64),
    state: mainState,
    state_version: 2,
    generated_at: "2026-08-05T09:00:00+09:00",
    delivered_at: ["delivered", "read"].includes(providerState) ? "2026-08-05T09:02:00+09:00" : null,
    viewed_at: providerState === "read" ? "2026-08-05T09:10:00+09:00" : null,
    revoked_at: null,
    delivery_receipts: [deliveryReceipt(statementId, providerState)],
  };
}

async function openAdmin(harness, {
  providerEnabled = true,
  viewport = { width: 1360, height: 940 },
  employeeRoster = employees,
  statementRows,
} = {}) {
  const state = {
    deliveryCalls: [],
    revokeCalls: [],
    statements: statementRows ?? [
      {
        ...statement("emp-1", "sent"),
        state: "delivered",
        delivered_at: "2026-08-05T09:02:00+09:00",
        delivery_receipts: [
          deliveryReceipt("statement-emp-1", "sent"),
          {
            ...deliveryReceipt("statement-emp-1", "delivered"),
            delivery_receipt_id: "self-statement-emp-1",
            channel: "self_service",
          },
        ],
      },
      statement("emp-2", "failed"),
      statement("emp-3", "delivered"),
    ],
  };
  const page = await harness.browser.newPage({ viewport });
  await page.addInitScript((enabled) => {
    window.__LAWOS_PEOPLE_FEATURE_FLAGS__ = {
      payroll_statement_delivery: enabled,
    };
  }, providerEnabled);
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/hrx/payroll/periods" && request.method() === "GET") {
      return json(route, {
        outcome: "ok",
        workspace: {
          periods: [{
            period_id: "period-2026-07",
            period_code: "2026-07",
            period_start: "2026-07-01",
            period_end: "2026-07-31",
            cutoff_at: "2026-07-31T18:00:00+09:00",
            pay_date: "2026-08-05",
            status: "closed",
            runs: [run],
          }],
          production_ready_claim: false,
        },
      });
    }
    if (path === "/api/hrx/payroll/runs/run-2026-07" && request.method() === "GET") {
      return json(route, {
        outcome: "ok",
        bundle: {
          run,
          employees: employeeRoster,
          totals: {},
          snapshots: [],
          line_items: [],
          issues: [],
          adjustments: [],
          statements: state.statements,
          payment_batches: [],
          filings: [],
          audit_history: [],
        },
      });
    }
    if (path === "/api/hrx/payroll/runs/run-2026-07/statements" && request.method() === "GET") {
      return json(route, { outcome: "ok", statements: state.statements });
    }
    if (path === "/api/hrx/payroll/runs/run-2026-07/statements/deliver" && request.method() === "POST") {
      const body = request.postDataJSON();
      state.deliveryCalls.push(body);
      if (body.channel === "email") {
        state.statements = state.statements.map((row) => row.employee_id === "emp-2"
          ? {
              ...statement("emp-2", "delivered"),
              delivery_receipts: [deliveryReceipt("statement-emp-2", "delivered", 2)],
            }
          : row);
      } else {
        state.statements = state.statements.map((row) => ({
          ...row,
          state: row.state === "generated" ? "delivered" : row.state,
          delivered_at: row.delivered_at ?? "2026-08-05T09:02:00+09:00",
          delivery_receipts: [
            ...row.delivery_receipts,
            {
              ...deliveryReceipt(row.statement_id, "delivered"),
              delivery_receipt_id: `self-${row.statement_id}`,
              channel: "self_service",
            },
          ],
        }));
      }
      return json(route, {
        outcome: "delivered",
        delivery: {
          overall_state: "delivered",
          delivered_count: state.statements.length,
          retry_count: body.channel === "email" ? 1 : 0,
          production_ready_claim: false,
        },
      });
    }
    const revokeMatch = path.match(/^\/api\/hrx\/payroll\/statements\/([^/]+)\/revoke$/);
    if (revokeMatch && request.method() === "POST") {
      const statementId = decodeURIComponent(revokeMatch[1]);
      state.revokeCalls.push(statementId);
      state.statements = state.statements.map((row) => row.statement_id === statementId
        ? {
            ...row,
            state: "revoked",
            state_version: row.state_version + 1,
            revoked_at: "2026-08-05T10:00:00+09:00",
            delivery_receipts: row.delivery_receipts.map((receipt) => ({ ...receipt, state: "revoked" })),
          }
        : row);
      return json(route, {
        outcome: "revoked",
        statement: state.statements.find((row) => row.statement_id === statementId),
      });
    }
    return json(route, {});
  });
  await page.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-pay-statement`, { waitUntil: "networkidle" });
  return { page, state };
}

async function openSelf(harness, { stepUp = false } = {}) {
  const own = {
    ...statement("emp-1", "read"),
    delivery_receipts: [{
      ...deliveryReceipt("statement-emp-1", "read"),
      delivery_receipt_id: "self-statement-emp-1",
      channel: "self_service",
      provider_receipt_ref: null,
      safe_error_code: null,
    }],
  };
  const state = {
    selfHeaders: [],
    stepUpBodies: [],
  };
  const page = await harness.browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/step-up" && request.method() === "POST") {
      const body = request.postDataJSON();
      state.stepUpBodies.push(body);
      return json(route, {
        outcome: "verified",
        step_up_token: "lawos_hrx_step_up_v1.statement-self-browser-proof",
        expires_at: "2026-07-31T23:59:59+09:00",
      });
    }
    if (path === "/api/hrx/payroll/periods") {
      return json(route, { outcome: "denied", safe_error_code: "HRX_AUTHZ_DENIED" }, 403);
    }
    if (path === "/api/hrx/payroll/statements/self") {
      state.selfHeaders.push(request.headers()["x-lawos-hrx-step-up"] ?? null);
      if (stepUp && request.headers()["x-lawos-hrx-step-up"] !== "lawos_hrx_step_up_v1.statement-self-browser-proof") {
        return json(route, {
          outcome: "blocked",
          safe_error_code: "HRX_STEP_UP_REQUIRED",
          step_up_required: true,
          required_purpose: "payroll_statement_self_service",
          fail_closed: true,
        }, 403);
      }
      return json(route, { outcome: "ok", statements: [own] });
    }
    return json(route, {});
  });
  await page.goto(`${harness.baseUrl}/?view=people&ctx=allow#people-pay-statement`, { waitUntil: "networkidle" });
  return { page, state };
}

test("PEO-TUW-070 keeps accepted, failed, and delivered statement states distinct and retries failed rows", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openAdmin(harness);
    await page.getByLabel("전달 방법").selectOption("email");
    assert.equal(await page.getByText("발송 접수", { exact: true }).count(), 1);
    assert.equal(await page.getByText("발송 실패", { exact: true }).count(), 1);
    assert.equal(await page.getByText("도달", { exact: true }).count(), 1);
    assert.equal(await page.getByText("1회 시도", { exact: true }).count(), 3);
    assert.equal(await page.getByText("₩", { exact: false }).count(), 0);
    const sentRow = page.locator('[data-payroll-statement="emp-1"]');
    assert.equal((await sentRow.locator("td").nth(4).textContent())?.trim(), "-");
    assert.equal((await sentRow.locator("td").nth(5).textContent())?.trim(), "-");
    await page.getByLabel("전달 방법").selectOption("self_service");
    assert.equal((await sentRow.locator("td").nth(4).textContent())?.trim(), "2026-08-05");
    await page.getByLabel("전달 방법").selectOption("email");
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "statement-admin-delivery-desktop.png"), fullPage: true });

    await page.getByRole("button", { name: "실패 건 재처리" }).click();
    await page.locator('[data-payroll-statement="emp-2"]').getByText("도달", { exact: true }).waitFor();
    assert.equal(await page.locator('[data-payroll-statement="emp-2"]').getByText("2회 시도", { exact: true }).count(), 1);
    assert.deepEqual(state.deliveryCalls, [{ channel: "email" }]);
    assert.equal(await page.locator('[data-payroll-statement="emp-1"]').getByText("발송 접수", { exact: true }).count(), 1);
    await page.screenshot({ path: resolve(artifactDir, "statement-admin-failed-only-retry.png"), fullPage: true });

    await page.getByRole("button", { name: "김아민 급여명세서 철회" }).click();
    await page.getByRole("alertdialog", { name: "급여명세서 철회 확인" }).waitFor();
    assert.equal(await page.getByText("철회하면 LawOS 명세서함에서 더 이상 열 수 없습니다. 이미 이메일·메시지로 전달된 파일은 회수되지 않습니다.", { exact: true }).count(), 1);
    await page.getByRole("button", { name: "철회 확인" }).click();
    await page.locator('[data-payroll-statement="emp-1"]').getByText("철회", { exact: true }).first().waitFor();
    assert.deepEqual(state.revokeCalls, ["statement-emp-1"]);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-FIX-068-D fails closed for missing and identifier-shaped authoritative display names", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const adversarialStatements = [
      ["emp-2", "emp-2"],
      ["emp-3", "employee-3"],
      ["emp-4", "550e8400-e29b-41d4-a716-446655440000"],
      ["emp-5", ""],
      ["emp-6", "EMP-6 급여 담당"],
      ["emp-7", "급여 550e8400-e29b-41d4-a716-446655440000 기록"],
    ];
    const { page } = await openAdmin(harness, {
      employeeRoster: adversarialStatements.map(([employee_id, display_name]) => ({ employee_id, display_name })),
      statementRows: adversarialStatements.map(([employee_id]) => ({
        ...statement(employee_id, "failed"),
        display_name: "급여 명세서가 제공한 가짜 이름",
      })),
    });

    for (const [employeeId] of adversarialStatements) {
      const row = page.locator(`[data-payroll-statement="${employeeId}"]`);
      assert.equal((await row.locator("td").first().textContent())?.trim(), "구성원 이름 확인 필요");
      assert.equal(await row.getByRole("button", { name: "구성원 이름 확인 필요 급여명세서 철회" }).count(), 1);
    }
    assert.equal(await page.getByText("급여 명세서가 제공한 가짜 이름", { exact: true }).count(), 0);
    const visibleText = await page.locator("body").innerText();
    for (const [employeeId, identifierName] of adversarialStatements) {
      assert.doesNotMatch(visibleText, new RegExp(employeeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      if (identifierName) assert.doesNotMatch(visibleText, new RegExp(identifierName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    const accessibleLabels = await page.locator("[aria-label]").evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-label") ?? "").join("\n"));
    for (const [employeeId, identifierName] of adversarialStatements) {
      assert.doesNotMatch(accessibleLabels, new RegExp(employeeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      if (identifierName) assert.doesNotMatch(accessibleLabels, new RegExp(identifierName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-070 keeps delivery state, retry count, and revoke action in the mobile viewport and keyboard reachable", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page } = await openAdmin(harness, {
      viewport: { width: 390, height: 844 },
    });
    await page.getByLabel("전달 방법").selectOption("email");
    const row = page.locator('[data-payroll-statement="emp-1"]');
    const status = row.getByText("발송 접수", { exact: true });
    const attempt = row.getByText("1회 시도", { exact: true });
    const revoke = page.getByRole("button", { name: "김아민 급여명세서 철회" });
    for (const target of [status, attempt, revoke]) {
      await target.waitFor();
      const box = await target.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= 390, `mobile control is outside viewport: ${JSON.stringify(box)}`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await revoke.focus();
    assert.equal(await revoke.evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("Enter");
    await page.getByRole("alertdialog", { name: "급여명세서 철회 확인" }).waitFor();
    const cancel = page.getByRole("button", { name: "취소" });
    await cancel.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.getByRole("alertdialog", { name: "급여명세서 철회 확인" }).count(), 0);
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "statement-admin-delivery-mobile.png"), fullPage: true });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-070 shows only the signed-in member statement in the self-service view", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page } = await openSelf(harness);
    assert.equal(await page.getByText("내 명세서", { exact: true }).count(), 1);
    assert.equal(await page.getByText("열람", { exact: true }).count(), 2);
    assert.equal(await page.getByText("박로펌", { exact: true }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "급여명세서 다운로드" }).count(), 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "statement-self-mobile.png"), fullPage: true });
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-FIX-068-D requests the self-service purpose before showing a member statement", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openSelf(harness, { stepUp: true });
    await page.locator('[data-hrx-step-up-challenge="true"]').waitFor();
    assert.equal(
      await page.getByText("내 급여명세서를 확인하려면 6자리 확인 코드를 입력하세요.", { exact: true }).count(),
      1,
    );
    await mkdir(stepUpArtifactDir, { recursive: true });
    await page.screenshot({
      path: resolve(stepUpArtifactDir, "statement-self-purpose-challenge.png"),
      fullPage: true,
    });
    await page.getByLabel("6자리 확인 코드").fill("123456");
    await page.getByRole("button", { name: "확인", exact: true }).click();
    await page.getByText("내 명세서", { exact: true }).waitFor();

    assert.deepEqual(state.stepUpBodies, [{
      purpose: "payroll_statement_self_service",
      totp_code: "123456",
    }]);
    assert.deepEqual(state.selfHeaders, [
      null,
      "lawos_hrx_step_up_v1.statement-self-browser-proof",
    ]);
    await page.close();
  } finally {
    await harness.close();
  }
});

test("PEO-TUW-070 keeps external delivery off independently while allowing the internal statement inbox", async () => {
  const harness = await startPeopleOverviewHarness();
  try {
    const { page, state } = await openAdmin(harness, {
      providerEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    assert.equal(await page.getByText("이메일·메시지 전달 서비스가 연결되지 않았습니다. 내 명세서함 게시는 계속 사용할 수 있습니다.", { exact: true }).count(), 1);
    assert.equal(await page.getByRole("option", { name: "이메일 (연결 필요)" }).evaluate((option) => option.disabled), true);
    assert.equal(await page.getByRole("option", { name: "메시지 (연결 필요)" }).evaluate((option) => option.disabled), true);
    await page.getByRole("button", { name: "명세서함에 게시" }).click();
    assert.deepEqual(state.deliveryCalls, [{ channel: "self_service" }]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false);
    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({ path: resolve(artifactDir, "statement-provider-off-mobile.png"), fullPage: true });
    await page.close();
  } finally {
    await harness.close();
  }
});
