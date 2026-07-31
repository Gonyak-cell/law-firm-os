import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { startPeopleOverviewHarness } from "./people-overview-test-support.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const artifactDir = resolve(repositoryRoot, "artifacts/people-v2/PEO-FIX-068-D-WEB-20260731");
const proofPath = resolve(artifactDir, "step-up-purpose-request-proof.json");

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

const SCENARIOS = Object.freeze([
  {
    id: "payroll-review",
    purpose: "payroll_export_review",
    method: "GET",
    path: "/api/hrx/payroll/periods",
    success: { outcome: "ok", workspace: { periods: [] } },
  },
  {
    id: "payroll-payment",
    purpose: "payroll_payment_processing",
    method: "POST",
    path: "/api/hrx/payroll/runs/run-1/payments/prepare",
    success: { outcome: "prepared", payment: { payment_batch_id: "batch-1" } },
  },
  {
    id: "payroll-filing",
    purpose: "payroll_filing_processing",
    method: "POST",
    path: "/api/hrx/payroll/runs/run-1/filings",
    success: { outcome: "created", filing: { filing_job_id: "filing-1" } },
  },
  {
    id: "payroll-statement-self",
    purpose: "payroll_statement_self_service",
    method: "GET",
    path: "/api/hrx/payroll/statements/self",
    success: { outcome: "ok", statements: [] },
  },
  {
    id: "payroll-year-end-processing",
    purpose: "payroll_year_end_processing",
    method: "POST",
    path: "/api/hrx/payroll/runs/run-1/year-end/collect",
    success: { outcome: "collected", year_end: { state: "draft" } },
  },
  {
    id: "payroll-year-end-review",
    purpose: "payroll_year_end_review",
    method: "POST",
    path: "/api/hrx/payroll/runs/run-1/year-end/review",
    success: { outcome: "reviewed", year_end: { state: "reviewed" } },
  },
]);

test("PEO-FIX-068-D binds each payroll browser retry to its allowlisted step-up purpose", async () => {
  const harness = await startPeopleOverviewHarness();
  const page = await harness.browser.newPage({ locale: "ko-KR", timezoneId: "Asia/Seoul" });
  const stepUpBodies = [];
  const routeAttempts = [];
  let forcedPurpose = null;

  try {
    await page.route("**/__step_up_purpose_test__.html", (route) => route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html lang=\"ko\"><body>급여 추가인증 목적 테스트</body></html>",
    }));
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path === "/api/auth/step-up" && request.method() === "POST") {
        const body = request.postDataJSON();
        stepUpBodies.push(body);
        return json(route, {
          outcome: "verified",
          step_up_token: `lawos_hrx_step_up_v1.${body.purpose}`,
          expires_at: "2026-07-31T23:59:59+09:00",
        });
      }

      const scenario = SCENARIOS.find((candidate) => candidate.path === path && candidate.method === request.method());
      if (!scenario) return json(route, { outcome: "not_found" }, 404);

      const token = request.headers()["x-lawos-hrx-step-up"] ?? null;
      routeAttempts.push({ id: scenario.id, purpose: scenario.purpose, token });
      if (forcedPurpose) {
        const purpose = forcedPurpose;
        forcedPurpose = null;
        return json(route, {
          outcome: "blocked",
          safe_error_code: "HRX_STEP_UP_REQUIRED",
          step_up_required: true,
          required_purpose: purpose,
          fail_closed: true,
        }, 403);
      }
      if (token !== `lawos_hrx_step_up_v1.${scenario.purpose}`) {
        return json(route, {
          outcome: "blocked",
          safe_error_code: "HRX_STEP_UP_REQUIRED",
          step_up_required: true,
          required_purpose: scenario.purpose,
          fail_closed: true,
        }, 403);
      }
      return json(route, scenario.success);
    });

    await page.goto(`${harness.baseUrl}/__step_up_purpose_test__.html`);
    const results = await page.evaluate(async (scenarios) => {
      const api = await import("/src/people/hrxApiClient.ts");
      const invoke = {
        "payroll-review": () => api.fetchHrxPayrollWorkspace(),
        "payroll-payment": () => api.prepareHrxPayrollPayment("run-1"),
        "payroll-filing": () => api.createHrxPayrollFiling("run-1", "withholding"),
        "payroll-statement-self": () => api.fetchHrxPayrollStatementsSelf(),
        "payroll-year-end-processing": () => api.collectHrxPayrollYearEnd("run-1"),
        "payroll-year-end-review": () => api.reviewHrxPayrollYearEnd("run-1"),
      };
      const observations = [];
      for (const scenario of scenarios) {
        window.sessionStorage.clear();
        const challenged = await invoke[scenario.id]();
        const verified = await api.requestHrxStepUpSession(scenario.purpose, "123456");
        const retried = await invoke[scenario.id]();
        observations.push({
          id: scenario.id,
          purpose: scenario.purpose,
          challengedKind: challenged.kind,
          requiredPurpose: challenged.requiredPurpose ?? null,
          verifiedKind: verified.kind,
          retriedKind: retried.kind,
        });
      }
      const rejected = await api.requestHrxStepUpSession("server_supplied_arbitrary", "123456");
      return { observations, rejected };
    }, SCENARIOS.map(({ id, purpose }) => ({ id, purpose })));

    assert.deepEqual(
      results.observations,
      SCENARIOS.map(({ id, purpose }) => ({
        id,
        purpose,
        challengedKind: "step_up_required",
        requiredPurpose: purpose,
        verifiedKind: "data",
        retriedKind: "data",
      })),
    );
    assert.deepEqual(
      stepUpBodies,
      SCENARIOS.map(({ purpose }) => ({ purpose, totp_code: "123456" })),
    );
    assert.equal(results.rejected.kind, "error");
    assert.equal(results.rejected.reason, "HRX_STEP_UP_PURPOSE_UNSUPPORTED");
    assert.equal(stepUpBodies.length, SCENARIOS.length, "an arbitrary client purpose must not reach the step-up endpoint");

    forcedPurpose = "server_supplied_arbitrary";
    const unsupportedResponse = await page.evaluate(async () => {
      window.sessionStorage.clear();
      const api = await import("/src/people/hrxApiClient.ts");
      return api.fetchHrxPayrollWorkspace();
    });
    assert.equal(unsupportedResponse.kind, "error");
    assert.equal(unsupportedResponse.reason, "HRX_STEP_UP_PURPOSE_UNSUPPORTED");

    forcedPurpose = "payroll_payment_processing";
    const mismatchedResponse = await page.evaluate(async () => {
      window.sessionStorage.clear();
      const api = await import("/src/people/hrxApiClient.ts");
      return api.fetchHrxPayrollWorkspace();
    });
    assert.equal(mismatchedResponse.kind, "error");
    assert.equal(mismatchedResponse.reason, "HRX_STEP_UP_PURPOSE_MISMATCH");

    for (const scenario of SCENARIOS) {
      assert.deepEqual(
        routeAttempts.filter((attempt) => attempt.id === scenario.id).slice(0, 2),
        [
          { id: scenario.id, purpose: scenario.purpose, token: null },
          { id: scenario.id, purpose: scenario.purpose, token: `lawos_hrx_step_up_v1.${scenario.purpose}` },
        ],
      );
    }

    const proof = {
      schema_version: "law-firm-os.people.payroll-step-up-purpose-web-proof.v1",
      captured_at: new Date().toISOString(),
      locale: "ko-KR",
      timezone: "Asia/Seoul",
      scenarios: results.observations,
      step_up_request_bodies: stepUpBodies,
      route_attempts: routeAttempts,
      arbitrary_client_purpose_rejected: results.rejected.reason,
      arbitrary_server_purpose_rejected: unsupportedResponse.reason,
      allowlisted_route_mismatch_rejected: mismatchedResponse.reason,
    };
    await mkdir(artifactDir, { recursive: true });
    await writeFile(proofPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  } finally {
    await page.close();
    await harness.close();
  }
});

test("PEO-FIX-068-D sends the selected payroll purpose from the rendered challenge", async () => {
  const harness = await startPeopleOverviewHarness();
  const page = await harness.browser.newPage({
    viewport: { width: 960, height: 480 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
  const requestBodies = [];

  try {
    await page.route("**/__step_up_challenge_test__.html", (route) => route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: "<!doctype html><html lang=\"ko\"><body><main id=\"root\"></main></body></html>",
    }));
    await page.route("**/api/auth/step-up", (route) => {
      const body = route.request().postDataJSON();
      requestBodies.push(body);
      return json(route, {
        outcome: "verified",
        step_up_token: `lawos_hrx_step_up_v1.${body.purpose}`,
        expires_at: "2026-07-31T23:59:59+09:00",
      });
    });
    await page.goto(`${harness.baseUrl}/__step_up_challenge_test__.html`);
    await page.evaluate(async () => {
      const [React, ReactDom, challengeModule] = await Promise.all([
        import("/node_modules/.vite/deps/react.js"),
        import("/node_modules/.vite/deps/react-dom_client.js"),
        import("/src/people/security/HrxStepUpChallenge.tsx"),
      ]);
      const react = React.default ?? React;
      const reactDom = ReactDom.default ?? ReactDom;
      const root = reactDom.createRoot(document.getElementById("root"));
      window.__renderPayrollStepUpChallenge = (purpose) => root.render(
        react.createElement(challengeModule.HrxStepUpChallenge, {
          purpose,
          onVerified: () => {
            document.body.dataset.verifiedPurpose = purpose;
          },
        }),
      );
    });

    for (const scenario of SCENARIOS) {
      await page.evaluate((purpose) => {
        document.body.dataset.verifiedPurpose = "";
        window.__renderPayrollStepUpChallenge(purpose);
      }, scenario.purpose);
      await page.getByLabel("6자리 확인 코드").fill("123456");
      if (scenario.id === "payroll-year-end-review") {
        await mkdir(artifactDir, { recursive: true });
        await page.screenshot({
          path: resolve(artifactDir, "year-end-review-step-up-challenge.png"),
          fullPage: true,
        });
      }
      await page.getByRole("button", { name: "확인", exact: true }).click();
      await page.waitForFunction((purpose) => document.body.dataset.verifiedPurpose === purpose, scenario.purpose);
    }

    assert.deepEqual(
      requestBodies,
      SCENARIOS.map(({ purpose }) => ({ purpose, totp_code: "123456" })),
    );
    await writeFile(
      resolve(artifactDir, "rendered-challenge-request-bodies.json"),
      `${JSON.stringify({
        schema_version: "law-firm-os.people.payroll-step-up-challenge-web-proof.v1",
        captured_at: new Date().toISOString(),
        locale: "ko-KR",
        timezone: "Asia/Seoul",
        request_bodies: requestBodies,
      }, null, 2)}\n`,
      "utf8",
    );
  } finally {
    await page.close();
    await harness.close();
  }
});
