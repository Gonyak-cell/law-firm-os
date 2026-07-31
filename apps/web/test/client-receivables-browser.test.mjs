import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const evidenceDir = resolve(
  process.env.CLIENT_AR_INTEGRATION_ARTIFACT_DIR
    ?? resolve(webRoot, "../../.omo/evidence/client-ar-web-integration")
);
const tenantId = "tenant-client-receivables-browser";
const clientOne = "client-receivables-browser-one";
const clientTwo = "client-receivables-browser-two";
const feeOne = "fee-receivables-browser-one";
const feeTwo = "fee-receivables-browser-two";
const depositId = "bank-receivables-browser";
const allocationOne = "allocation-receivables-browser-one";
const allocationTwo = "allocation-receivables-browser-two";

const boundary = {
  count_leak_prevented: true,
  permission_prefilter_applied: true,
  unauthorized_count_included: false,
  raw_bank_source_included: false,
  raw_source_payload_included: false,
  source_metadata_included: false,
  raw_account_included: false,
  raw_counterparty_included: false,
  raw_memo_included: false,
  transaction_fingerprint_included: false,
  bank_reference_included: false,
  credential_material_included: false,
  invoice_required: false,
  matter_required: false,
  production_ready_claim: false
};

async function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function fulfill(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body)
  });
}

function genericCollection(pathname) {
  return {
    request_id: `generic-${pathname.replace(/[^a-z0-9]+/giu, "-")}`,
    outcome: "passed",
    ui_state: "empty",
    item: null,
    items: [],
    page_info: {
      returned_count: 0,
      omitted_item_count: null,
      has_more: false,
      next_cursor: null
    },
    safe_error_codes: [],
    audit_hint_ref: "generic-client-receivables-browser",
    count_leak_prevented: true,
    permission_prefilter_applied: true,
    raw_source_payload_included: false,
    production_ready_claim: false
  };
}

function canonicalBody(state) {
  const activeFees = state.cancelled
    ? [{
      id: feeTwo,
      agreed: 5_000_000,
      allocated: 1_000_000,
      version: 5
    }]
    : [
      {
        id: feeOne,
        agreed: state.feeOneAmount,
        allocated: state.allocationOneAmount,
        version: state.feeOneVersion
      },
      { id: feeTwo, agreed: 5_000_000, allocated: 1_000_000, version: 5 }
    ];
  const allocations = state.cancelled
    ? [{
      id: allocationTwo,
      fee: feeTwo,
      amount: 1_000_000,
      version: state.allocationTwoVersion
    }]
    : [
      {
        id: allocationOne,
        fee: feeOne,
        amount: state.allocationOneAmount,
        version: state.allocationOneVersion
      },
      {
        id: allocationTwo,
        fee: feeTwo,
        amount: 1_000_000,
        version: state.allocationTwoVersion
      }
    ];
  const agreed = activeFees.reduce((sum, fee) => sum + fee.agreed, 0);
  const allocated = allocations.reduce((sum, row) => sum + row.amount, 0);
  const receivable = agreed - allocated;
  const overpayment = 6_000_000 - allocated;
  return {
    request_id: `request-client-receivables-browser-${state.reads}`,
    outcome: "passed",
    ui_state: null,
    safe_error_codes: [],
    audit_hint_ref: "ui_client_receivables_probe",
    basis: "fee_commitment_and_bank_deposit",
    basis_label: "수임료 약정·은행 입금 기준",
    currency: "KRW",
    as_of: "2026-07-31T00:00:00.000Z",
    total_receivables: receivable,
    unknown_amount_count: 0,
    total_overpayment: overpayment,
    unallocated_amount: overpayment,
    unallocated_amount_basis: "same_as_total_overpayment",
    clients: [
      { client_group_id: clientOne, display_name: "한빛건설" },
      { client_group_id: clientTwo, display_name: "새봄자문" }
    ],
    ranking: [{
      rank: 1,
      client_group_id: clientOne,
      display_name: "한빛건설",
      agreed_amount: agreed,
      active_allocated_amount: allocated,
      receivable_amount: receivable,
      earliest_due_date: "2026-08-15"
    }],
    client_summaries: [
      {
        client_group_id: clientOne,
        agreed_amount: agreed,
        active_allocated_amount: allocated,
        receivable_amount: receivable,
        unknown_amount_count: 0,
        overpayment_amount: overpayment
      },
      {
        client_group_id: clientTwo,
        agreed_amount: null,
        active_allocated_amount: 0,
        receivable_amount: null,
        unknown_amount_count: 0,
        overpayment_amount: 0
      }
    ],
    details: {
      fee_commitments: activeFees.map((fee, index) => ({
        fee_commitment_id: fee.id,
        client_group_id: clientOne,
        agreed_amount: fee.agreed,
        active_allocated_amount: fee.allocated,
        receivable_amount: fee.agreed - fee.allocated,
        due_date: index === 0 ? "2026-08-15" : "2026-08-31",
        accepted_at: `2026-07-0${index + 1}T00:00:00.000Z`,
        status: "active",
        state_version: fee.version
      })),
      deposits: [{
        bank_transaction_id: depositId,
        client_group_id: clientOne,
        gross_amount: 6_000_000,
        linked_refund_amount: 0,
        net_amount: 6_000_000,
        active_allocated_amount: allocated,
        overpayment_amount: overpayment,
        occurred_at: "2026-07-10T00:00:00.000Z"
      }],
      allocations: allocations.map((row) => ({
        client_deposit_allocation_id: row.id,
        client_group_id: clientOne,
        bank_transaction_id: depositId,
        fee_commitment_id: row.fee,
        allocated_amount: row.amount,
        reversed_amount: 0,
        active_amount: row.amount,
        allocation_source: state.reallocated ? "manual" : "automatic",
        manual_lock: state.reallocated,
        state_version: row.version
      }))
    },
    reconciliation: {
      status: "passed",
      ranking_total: receivable,
      commitment_detail_total: receivable,
      client_summary_total: receivable,
      overpayment_detail_total: overpayment
    },
    ...boundary
  };
}

function generationHarnessHtml(projected) {
  const fixture = JSON.stringify(projected).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="ko">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body>
    <button id="review-context" type="button">검토 권한으로 변경</button>
    <main id="root"></main>
    <script type="module">
      import React, { useCallback, useState } from "react";
      import { createRoot } from "react-dom/client";
      import "/src/styles.css";
      import { ClientReceivablesContainer } from "/src/components/ClientReceivablesContainer.jsx";
      const fixture = ${fixture};
      function Harness() {
        const [ctx, setCtx] = useState("allow");
        window.__setReviewContext = () => setCtx("review");
        const read = useCallback(({ ctx: nextCtx }) => (
          nextCtx === "allow"
            ? new Promise((resolve) => setTimeout(() => resolve(fixture), 240))
            : Promise.resolve({
              kind: "guarded",
              status: 200,
              outcome: "review_required",
              uiState: "review_required",
              safeErrorCodes: ["FINANCE_CLIENT_RECEIVABLES_LIMIT_EXCEEDED"],
              countLeakPrevented: true,
              permissionPrefilterApplied: true
            })
        ), []);
        return React.createElement(ClientReceivablesContainer, { ctx, readReceivables: read });
      }
      document.getElementById("review-context").addEventListener("click", () => window.__setReviewContext());
      createRoot(document.getElementById("root")).render(React.createElement(Harness));
    </script>
  </body>
</html>`;
}

function routeMutationHarnessHtml(projected) {
  const fixture = JSON.stringify(projected).replaceAll("<", "\\u003c");
  const firstClient = JSON.stringify(clientOne);
  const secondClient = JSON.stringify(clientTwo);
  return `<!doctype html>
<html lang="ko">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
  <body>
    <button id="route-change" type="button">다른 고객·권한 경로로 변경</button>
    <main id="root"></main>
    <script type="module">
      import React, { useCallback, useLayoutEffect, useState } from "react";
      import { createRoot } from "react-dom/client";
      import "/src/styles.css";
      import { ClientReceivablesContainer } from "/src/components/ClientReceivablesContainer.jsx";
      const fixture = ${fixture};
      window.__routeMutationReadCount = 0;
      function Harness() {
        const [route, setRoute] = useState({ ctx: "allow", clientId: ${firstClient} });
        window.__changeClientReceivablesRoute = () => setRoute({
          ctx: "review",
          clientId: ${secondClient},
        });
        window.__routeMutationState = route;
        useLayoutEffect(() => {
          window.__routeFirstCommitSnapshot = {
            ...route,
            dataCount: document.querySelectorAll(
              '[data-client-receivables-state="data"]',
            ).length,
            oldClientVisible: document.body.innerText.includes("한빛건설"),
          };
        }, [route]);
        const read = useCallback(({ ctx }) => {
          window.__routeMutationReadCount += 1;
          return Promise.resolve(ctx === "review" ? {
            kind: "guarded",
            status: 200,
            outcome: "review_required",
            uiState: "review_required",
            safeErrorCodes: ["FINANCE_REVIEW_REQUIRED"],
            countLeakPrevented: true,
            permissionPrefilterApplied: true,
          } : fixture);
        }, []);
        const patch = useCallback(() => new Promise((resolve) => {
          window.__resolveRouteMutation = () => resolve({
            kind: "data",
            status: 200,
            outcome: "updated",
            item: {
              fee_commitment_id: ${JSON.stringify(feeOne)},
              state_version: 3,
              status: "active",
            },
            idempotentReplay: false,
            safeErrorCodes: [],
            productionReadyClaim: false,
          });
        }), []);
        return React.createElement(ClientReceivablesContainer, {
          ctx: route.ctx,
          initialClientId: route.clientId,
          readReceivables: read,
          patchFeeCommitment: patch,
        });
      }
      document.getElementById("route-change").addEventListener(
        "click",
        () => window.__changeClientReceivablesRoute(),
      );
      createRoot(document.getElementById("root")).render(React.createElement(Harness));
    </script>
  </body>
</html>`;
}

test("CL-P5-W03-T02 canonical Client AR integration handles writes, late results, forbidden reads, and viewports", async (t) => {
  await mkdir(evidenceDir, { recursive: true });
  const state = {
    reads: 0,
    feeOneAmount: 10_000_000,
    feeOneVersion: 2,
    allocationOneAmount: 4_000_000,
    allocationOneVersion: 3,
    allocationTwoVersion: 7,
    reallocated: false,
    cancelled: false,
    delayNextPatch: true,
    failNextPatch: false,
    requests: [],
    patchKeys: []
  };
  const initialProjected = {
    ...canonicalBody(state),
    kind: "data",
    status: 200,
    uiState: null,
    safeErrorCodes: [],
    countLeakPrevented: true,
    permissionPrefilterApplied: true
  };
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true, hmr: false },
    plugins: [{
      name: "client-receivables-generation-harness",
      configureServer(vite) {
        vite.middlewares.use(async (request, response, next) => {
          const pathname = request.url?.split("?")[0];
          if (![
            "/__client-receivables-generation",
            "/__client-receivables-route-mutation"
          ].includes(pathname)) {
            next();
            return;
          }
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.end(await vite.transformIndexHtml(
            request.url,
            pathname === "/__client-receivables-generation"
              ? generationHarnessHtml(initialProjected)
              : routeMutationHarnessHtml(initialProjected)
          ));
        });
      }
    }]
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  t.after(async () => {
    await page.close();
    await browser.close();
    await server.close();
  });

  await page.addInitScript(({ tenant }) => {
    sessionStorage.setItem("lawos.api.session", JSON.stringify({
      token_type: "Bearer",
      session_token: "lawos_session_v1.client_receivables_browser",
      expires_at: "2099-01-01T00:00:00.000Z"
    }));
    sessionStorage.setItem("lawos.session.envelope", JSON.stringify({
      schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
      state: "signed_in",
      session_ref: "session-client-receivables-browser",
      source: "api_signed_session",
      actor_ref: "user-client-receivables-browser",
      tenant_refs: {
        default: tenant,
        client: tenant,
        matter: tenant,
        vault: tenant,
        crm: tenant
      },
      role_ids: ["finance_operator"],
      scopes: ["finance:ar:client_receivables:read"],
      review_state: "allow",
      expires_at: "2099-01-01T00:00:00.000Z"
    }));
  }, { tenant: tenantId });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postDataJSON?.() ?? null;
    state.requests.push({
      pathname: url.pathname,
      method: request.method(),
      body
    });
    if (url.pathname === "/api/finance/client-receivables") {
      state.reads += 1;
      return fulfill(route, canonicalBody(state));
    }
    if (
      url.pathname === `/api/finance/fee-commitments/${feeOne}`
      && request.method() === "PATCH"
    ) {
      state.patchKeys.push(body.idempotency_key);
      if (state.delayNextPatch) {
        state.delayNextPatch = false;
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 240));
      }
      if (state.failNextPatch) {
        state.failNextPatch = false;
        return fulfill(route, {
          request_id: "request-client-receivables-browser-retry",
          outcome: "blocked",
          ui_state: "error",
          safe_error_codes: ["FINANCE_RETRY_REQUIRED"],
          count_leak_prevented: true,
          production_ready_claim: false
        }, 503);
      }
      if (body.changes.status === "cancelled") {
        state.cancelled = true;
      } else {
        state.feeOneAmount = body.changes.agreed_amount;
        state.feeOneVersion += 1;
      }
      return fulfill(route, {
        request_id: "request-client-receivables-browser-patch",
        outcome: body.changes.status === "cancelled" ? "cancelled" : "updated",
        item: {
          fee_commitment_id: feeOne,
          tenant_id: tenantId,
          client_group_id: clientOne,
          agreed_amount: state.feeOneAmount,
          due_date: "2026-08-15",
          accepted_at: "2026-07-01T00:00:00.000Z",
          status: body.changes.status === "cancelled" ? "cancelled" : "active",
          state_version: body.expected_state_version + 1
        },
        safe_error_codes: [],
        audit_hint_ref: "ui_client_receivables_probe",
        idempotent_replay: false,
        production_ready_claim: false
      });
    }
    if (
      url.pathname === "/api/finance/client-deposit-allocations/reallocate"
      && request.method() === "POST"
    ) {
      state.reallocated = true;
      state.allocationOneAmount = body.targets.find(
        (row) => row.fee_commitment_id === feeOne
      ).active_amount;
      state.allocationOneVersion += 1;
      state.allocationTwoVersion += 1;
      return fulfill(route, {
        request_id: "request-client-receivables-browser-reallocate",
        outcome: "reallocated",
        item: {
          bank_transaction_id: depositId,
          active_allocated_amount: state.allocationOneAmount + 1_000_000,
          unallocated_amount: 5_000_000 - state.allocationOneAmount
        },
        items: [
          {
            client_deposit_allocation_id: allocationOne,
            client_group_id: clientOne,
            bank_transaction_id: depositId,
            fee_commitment_id: feeOne,
            allocated_amount: state.allocationOneAmount,
            reversed_amount: 0,
            active_amount: state.allocationOneAmount,
            allocation_source: "manual",
            manual_lock: true,
            state_version: state.allocationOneVersion
          },
          {
            client_deposit_allocation_id: allocationTwo,
            client_group_id: clientOne,
            bank_transaction_id: depositId,
            fee_commitment_id: feeTwo,
            allocated_amount: 1_000_000,
            reversed_amount: 0,
            active_amount: 1_000_000,
            allocation_source: "manual",
            manual_lock: true,
            state_version: state.allocationTwoVersion
          }
        ],
        safe_error_codes: [],
        audit_hint_ref: "ui_client_receivables_probe",
        idempotent_replay: false,
        raw_source_payload_included: false,
        production_ready_claim: false
      });
    }
    if (url.pathname === "/api/profile/me") {
      return fulfill(route, {
        request_id: "profile-client-receivables-browser",
        outcome: "passed",
        ui_state: null,
        item: {
          user_id: "user-client-receivables-browser",
          display_name: "테스트 사용자"
        },
        safe_error_codes: [],
        audit_hint_ref: "profile-client-receivables-browser-audit",
        count_leak_prevented: true,
        production_ready_claim: false
      });
    }
    return fulfill(route, genericCollection(url.pathname));
  });

  await page.goto(
    `http://127.0.0.1:${port}/?view=clients&ctx=allow&record_id=${clientOne}#client-billing`,
    { waitUntil: "networkidle" }
  );
  await page.waitForSelector('[data-client-receivables-state="data"]');
  const clientSelect = page.locator('[data-client-receivables-client-select="true"]');
  const feeSelect = page.locator('[data-client-receivables-fee-select="true"]');
  const depositSelect = page.locator('[data-client-receivables-deposit-select="true"]');
  assert.notEqual(await clientSelect.inputValue(), "");
  assert.equal(await feeSelect.inputValue(), "");
  assert.equal(await depositSelect.inputValue(), "");
  assert.equal(await page.locator('[data-client-receivables-action="create"]').count(), 0);
  assert.match(
    await page.locator('[data-client-receivables-engagement-create-notice="true"]').innerText(),
    /새 수임료 약정은 상담·수임 관리에서 수임을 확정할 때 함께 등록됩니다\./u
  );
  const forbiddenPaths = [
    "/api/crm/opportunities",
    "/api/finance/fee-commitments",
    "/api/finance/client-deposit-allocations",
    "/api/finance/invoices",
    "/api/finance/ar-aging"
  ];
  assert.equal(state.requests.some((request) => (
    forbiddenPaths.includes(request.pathname)
    && request.method() === "GET"
  )), false);
  assert.equal(state.requests.some((request) => (
    request.pathname === "/api/finance/fee-commitments"
    && request.method() === "POST"
  )), false);

  await page.getByRole("tab", { name: "미수금 있음", exact: true }).click();
  assert.equal(await page.locator('[role="tab"][aria-selected="true"]').innerText(), "미수금 있음");
  await page.getByRole("tab", { name: "전체", exact: true }).click();
  await page.getByLabel("수임료·미수금 고객 검색").fill("한빛");
  assert.equal(await page.locator('[data-client-receivables-client-row]').count(), 1);
  await page.getByLabel("수임료·미수금 고객 검색").fill("");
  await clientSelect.selectOption({ label: "한빛건설" });
  await feeSelect.selectOption({ index: 1 });

  await page.getByRole("button", { name: "약정 변경", exact: true }).click();
  let updateForm = page.locator('[data-client-receivables-update-form="true"]');
  await updateForm.locator('input[inputmode="numeric"]').fill("11000000");
  await updateForm.locator("textarea").fill("약정 금액 확정");
  const lateMutationRefresh = page.waitForResponse((response) => (
    new URL(response.url()).pathname === "/api/finance/client-receivables"
  ));
  await page.getByRole("button", { name: "약정 변경 저장", exact: true }).click();
  await clientSelect.selectOption({ label: "새봄자문" });
  await clientSelect.focus();
  await lateMutationRefresh;
  await page.waitForFunction(() => document.querySelector('[data-client-receivables-state="data"]'));
  assert.match(await page.locator('[data-client-receivables-detail="true"]').innerText(), /새봄자문/u);
  assert.equal(state.reads, 2, "late successful mutation must refresh the canonical read");
  assert.equal(state.feeOneAmount, 11_000_000);
  assert.equal(state.feeOneVersion, 3);
  assert.equal(
    await page.locator("[data-client-receivables-mutation]").count(),
    0,
    "late mutation must not attach its notice to the new selection"
  );
  assert.equal(
    await page.evaluate(() => document.activeElement
      ?.hasAttribute("data-client-receivables-mutation") ?? false),
    false,
    "late mutation must not move focus into an obsolete notice"
  );

  await clientSelect.selectOption({ label: "한빛건설" });
  await feeSelect.selectOption({ index: 1 });
  assert.match(
    await page.locator('[data-client-receivables-detail="true"]').innerText(),
    /11,000,000원[\s\S]*현재 변경 번호[\s\S]*3/u
  );
  await page.getByRole("button", { name: "약정 변경", exact: true }).click();
  updateForm = page.locator('[data-client-receivables-update-form="true"]');
  await updateForm.locator('input[inputmode="numeric"]').fill("12000000");
  await updateForm.locator("textarea").fill("약정 금액 확정");
  state.failNextPatch = true;
  const failedRetry = page.waitForResponse((response) => (
    new URL(response.url()).pathname === `/api/finance/fee-commitments/${feeOne}`
    && response.status() === 503
  ));
  await page.getByRole("button", { name: "약정 변경 저장", exact: true }).click();
  await failedRetry;
  await page.waitForSelector('[data-client-receivables-mutation="error"]');
  const updateRefresh = page.waitForResponse((response) => (
    new URL(response.url()).pathname === "/api/finance/client-receivables"
  ));
  await page.getByRole("button", { name: "약정 변경 저장", exact: true }).click();
  await updateRefresh;
  await page.waitForFunction(() => document.querySelector('[data-client-receivables-state="data"]'));
  assert.equal(state.patchKeys[1], state.patchKeys[2], "identical retry must reuse its idempotency key");
  assert.equal(state.reads, 3);
  await page.waitForSelector('[data-client-receivables-mutation="passed"]');
  await feeSelect.selectOption({ index: 2 });
  assert.equal(
    await page.locator("[data-client-receivables-mutation]").count(),
    0,
    "fee selection change must clear the previous mutation notice"
  );

  await feeSelect.selectOption({ index: 1 });
  await depositSelect.selectOption({ index: 1 });
  await page.getByRole("button", { name: "입금 배분", exact: true }).click();
  const reallocationForm = page.locator('[data-client-receivables-reallocation-form="true"]');
  await reallocationForm.locator('input[inputmode="numeric"]').fill("3000000");
  await reallocationForm.locator("textarea").fill("복수 약정 배분 조정");
  const reallocationRefresh = page.waitForResponse((response) => (
    new URL(response.url()).pathname === "/api/finance/client-receivables"
  ));
  await page.getByRole("button", { name: "입금 배분 저장", exact: true }).click();
  await reallocationRefresh;
  await page.waitForFunction(() => document.querySelector('[data-client-receivables-state="data"]'));
  const reallocationRequest = state.requests.find((request) => (
    request.pathname === "/api/finance/client-deposit-allocations/reallocate"
  ));
  assert.deepEqual(reallocationRequest.body.expected_allocations, [
    { client_deposit_allocation_id: allocationOne, state_version: 3 },
    { client_deposit_allocation_id: allocationTwo, state_version: 7 }
  ]);
  await page.waitForSelector('[data-client-receivables-mutation="passed"]');
  await depositSelect.selectOption("");
  assert.equal(
    await page.locator("[data-client-receivables-mutation]").count(),
    0,
    "deposit selection change must clear the previous mutation notice"
  );
  await depositSelect.selectOption({ index: 1 });

  for (const [width, height, filename] of [
    [1440, 1000, "client-receivables-integrated-1440.png"],
    [820, 980, "client-receivables-integrated-820.png"],
    [390, 844, "client-receivables-integrated-390.png"]
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(40);
    const overflow = await page.locator('[data-client-receivables-container="true"]').evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1
    );
    assert.equal(overflow, false, `${width}px horizontal overflow`);
    await page.screenshot({ path: join(evidenceDir, filename), fullPage: true });
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await feeSelect.selectOption({ index: 1 });
  await page.getByRole("button", { name: "약정 변경", exact: true }).click();
  updateForm = page.locator('[data-client-receivables-update-form="true"]');
  await updateForm.locator("textarea").fill("수임 종료");
  await updateForm.getByRole("checkbox", {
    name: "이 수임료 약정을 취소하는 경우 확인했습니다."
  }).check();
  const cancellationRefresh = page.waitForResponse((response) => (
    new URL(response.url()).pathname === "/api/finance/client-receivables"
  ));
  await page.getByRole("button", { name: "수임료 약정 취소", exact: true }).click();
  await cancellationRefresh;
  await page.waitForFunction(() => document.querySelector('[data-client-receivables-state="data"]'));
  const cancelRequest = state.requests.findLast((request) => (
    request.pathname === `/api/finance/fee-commitments/${feeOne}`
  ));
  assert.deepEqual(cancelRequest.body.changes, { status: "cancelled" });
  assert.equal(
    await page.locator('[data-client-receivables-status-tab="cancelled"]').count(),
    0,
    "active-only canonical read must not expose a dead cancelled-history tab"
  );
  assert.equal(
    await feeSelect.locator("option").count(),
    2,
    "cancelled commitment must disappear after the canonical refresh"
  );
  assert.equal(
    await page.locator('[data-client-receivables-mutation="passed"]').innerText(),
    "변경 사항을 저장했습니다."
  );

  const generationPage = await browser.newPage({ viewport: { width: 900, height: 800 } });
  await generationPage.goto(
    `http://127.0.0.1:${port}/__client-receivables-generation`,
    { waitUntil: "domcontentloaded" }
  );
  await generationPage.getByRole("button", { name: "검토 권한으로 변경" }).click();
  await generationPage.waitForSelector('[data-client-receivables-state="review_required"]');
  await generationPage.waitForTimeout(300);
  assert.equal(
    await generationPage.locator('[data-client-receivables-state="data"]').count(),
    0,
    "late allow read must not overwrite newer review state"
  );
  await generationPage.close();

  const routeMutationPage = await browser.newPage({ viewport: { width: 900, height: 800 } });
  await routeMutationPage.goto(
    `http://127.0.0.1:${port}/__client-receivables-route-mutation`,
    { waitUntil: "domcontentloaded" }
  );
  await routeMutationPage.waitForSelector('[data-client-receivables-state="data"]');
  const routeFeeSelect = routeMutationPage.locator(
    '[data-client-receivables-fee-select="true"]'
  );
  await routeFeeSelect.selectOption({ index: 1 });
  await routeMutationPage.getByRole("button", { name: "약정 변경", exact: true }).click();
  const routeUpdateForm = routeMutationPage.locator(
    '[data-client-receivables-update-form="true"]'
  );
  await routeUpdateForm.locator('input[inputmode="numeric"]').fill("11000000");
  await routeUpdateForm.locator("textarea").fill("경로 변경 중 약정 수정");
  await routeMutationPage.getByRole(
    "button",
    { name: "약정 변경 저장", exact: true }
  ).click();
  await routeMutationPage.getByRole(
    "button",
    { name: "다른 고객·권한 경로로 변경", exact: true }
  ).click();
  await routeMutationPage.waitForFunction(() => (
    window.__routeFirstCommitSnapshot?.ctx === "review"
  ));
  assert.deepEqual(
    await routeMutationPage.evaluate(() => window.__routeFirstCommitSnapshot),
    {
      ctx: "review",
      clientId: clientTwo,
      dataCount: 0,
      oldClientVisible: false
    },
    "permission downgrade must hide old allow data in the first committed frame"
  );
  await routeMutationPage.waitForSelector(
    '[data-client-receivables-state="review_required"]'
  );
  const routeReadCountBeforeResolve = await routeMutationPage.evaluate(
    () => window.__routeMutationReadCount
  );
  await routeMutationPage.evaluate(() => window.__resolveRouteMutation());
  await routeMutationPage.waitForFunction(
    (count) => window.__routeMutationReadCount > count,
    routeReadCountBeforeResolve
  );
  assert.equal(
    await routeMutationPage.locator("[data-client-receivables-mutation]").count(),
    0,
    "old route mutation must not attach a notice to the new route"
  );
  assert.deepEqual(
    await routeMutationPage.evaluate(() => window.__routeMutationState),
    { ctx: "review", clientId: clientTwo }
  );
  assert.equal(
    await routeMutationPage.evaluate(() => document.activeElement?.id),
    "route-change",
    "old route mutation must not steal focus from the new route control"
  );
  await routeMutationPage.close();

  const observables = {
    canonicalReadCount: state.reads,
    initialSelection: { client: clientOne, fee: null, deposit: null },
    patchIdempotencyKeysStable: state.patchKeys[1] === state.patchKeys[2],
    lateMutationIgnored: true,
    lateMutationCanonicalRefresh: true,
    lateMutationNoticeSuppressed: true,
    lateMutationFocusTheftAbsent: true,
    lateReadIgnored: true,
    routePermissionDowngradeFirstFrameFailClosed: true,
    routePropMutationCanonicalRefresh: true,
    routePropMutationNoticeSuppressed: true,
    routePropMutationFocusTheftAbsent: true,
    forbiddenGetPathsAbsent: true,
    directFeeCreateAbsent: true,
    cancelledTabAbsent: true,
    cancelledCommitmentRemovedAfterRefresh: true,
    cancellationSuccessNotice: "변경 사항을 저장했습니다.",
    reallocationExpectedAllocations: reallocationRequest.body.expected_allocations,
    viewportOverflow: { 1440: false, 820: false, 390: false }
  };
  await writeFile(
    join(evidenceDir, "client-receivables-browser-observables.json"),
    `${JSON.stringify(observables, null, 2)}\n`,
    "utf8"
  );
});
