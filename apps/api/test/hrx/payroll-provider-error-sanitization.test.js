import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultHrxRuntime, startApiServer } from "../../src/server.js";
import { createHrxPayrollRuntimeRoute } from "../../src/routes/hrx/payroll-runtime.js";
import { findRegisteredAccountByEmail } from "../../src/matter-vault-account-registry.js";
import { apiSessionHeaders } from "../helpers/session.js";
import { signedStepUpHeader } from "../hrx-step-up-test-helper.js";

const TENANT_ID = "tenant_amic_matter_vault";
const ACTOR_ID = "user_amic_jwsuh";
const PROVIDER_SECRETS = Object.freeze([
  "tax_identifier 880101-1234567",
  "bank_account 110-123-456789",
  "provider_payload bearer payroll-live-token",
]);

function providerFailure(index) {
  const error = new Error(PROVIDER_SECRETS[index]);
  error.provider_payload = {
    tax_identifier: "880101-1234567",
    account_number: "110-123-456789",
    authorization: "bearer payroll-live-token",
  };
  return error;
}

function proxySymbolTrap(error) {
  return new Proxy(error, {
    get(target, property, receiver) {
      if (typeof property === "symbol") return true;
      return Reflect.get(target, property, receiver);
    },
  });
}

async function call(route, context, action, params = {}, body = {}, method = "POST") {
  return route.handle({ method, context, params: { action, ...params }, body });
}

async function prepareProviderFailures(runtime) {
  const preparer = { tenant_id: TENANT_ID, actor_id: ACTOR_ID };
  const payrollApprover = {
    tenant_id: TENANT_ID,
    actor_id: "payroll-approver",
    step_up_verified: true,
    step_up_purpose: "payroll_export_review",
  };
  const paymentApprover = {
    tenant_id: TENANT_ID,
    actor_id: "payment-approver",
    step_up_verified: true,
    step_up_purpose: "payroll_payment_processing",
  };
  const route = runtime.payrollRuntimeRoute;
  const runId = runtime.payrollRuntime.payrollRepository.listRuns(preparer)[0].run_id;
  for (const [action, context] of [
    ["snapshot", preparer],
    ["preview", preparer],
    ["approve", payrollApprover],
    ["close", payrollApprover],
  ]) {
    const result = await call(route, context, action, { run_id: runId });
    assert.equal(result.status, 200, `${action}: ${JSON.stringify(result.body)}`);
  }

  const generated = await call(route, preparer, "statements-generate", { run_id: runId });
  assert.equal(generated.status, 200, JSON.stringify(generated.body));

  const prepared = await call(route, preparer, "payment-prepare", { run_id: runId });
  assert.equal(prepared.status, 200, JSON.stringify(prepared.body));
  const paymentBatchId = prepared.body.payment.batch.payment_batch_id;
  const approved = await call(route, paymentApprover, "payment-approve", {
    payment_batch_id: paymentBatchId,
  });
  assert.equal(approved.status, 200, JSON.stringify(approved.body));
  const exported = await call(route, preparer, "payment-export", {
    payment_batch_id: paymentBatchId,
  });
  assert.equal(exported.status, 200, JSON.stringify(exported.body));

  const created = await call(
    route,
    preparer,
    "filing-create",
    { run_id: runId },
    { filing_kind: "withholding" },
  );
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const filingJobId = created.body.filing.filing_job_id;
  const validated = await call(route, preparer, "filing-validate", { filing_job_id: filingJobId });
  assert.equal(validated.status, 200, JSON.stringify(validated.body));
  return { preparer, runId, paymentBatchId, filingJobId };
}

async function payrollHeaders(baseUrl) {
  const account = findRegisteredAccountByEmail("jwsuh@amic.kr");
  assert.ok(account);
  return {
    ...(await apiSessionHeaders(baseUrl, account)),
    "content-type": "application/json",
    "x-lawos-tenant-id": TENANT_ID,
    "x-lawos-actor-id": ACTOR_ID,
    "x-lawos-actor-role": "security_admin,hr_admin,people_ops",
    "x-lawos-hrx-scopes": [
      "hrx.payroll.statement.manage",
      "hrx.payroll.payment.prepare",
      "hrx.payroll.filing.submit",
    ].join(","),
  };
}

function withStepUp(headers, purpose) {
  return {
    ...headers,
    "x-lawos-hrx-step-up": signedStepUpHeader({
      tenant_id: TENANT_ID,
      actor_id: ACTOR_ID,
      purpose,
    }),
  };
}

test("payroll route allows only typed public errors and never serializes exception text", async () => {
  const untrusted = providerFailure(0);
  untrusted.safe_error_code = "PROVIDER_TAX_IDENTIFIER_880101_1234567";
  untrusted.status = 418;
  const publicDomain = providerFailure(1);
  publicDomain.safe_error_code = "HRX_PAYROLL_FILING_NOT_FOUND";
  publicDomain.status = 404;
  const route = createHrxPayrollRuntimeRoute({
    store: {},
    runtime: {
      documentService: {
        async generate() {
          throw untrusted;
        },
      },
      itemCatalog: {
        list() {
          throw providerFailure(2);
        },
      },
      filingService: {
        validate() {
          throw publicDomain;
        },
      },
    },
  });

  const statement = await call(route, { tenant_id: TENANT_ID, actor_id: ACTOR_ID }, "statements-generate", {
    run_id: "run-sensitive",
  });
  assert.deepEqual(
    [statement.status, statement.body.safe_error_code, statement.body.reason],
    [
      503,
      "HRX_PAYROLL_STATEMENT_PROVIDER_UNAVAILABLE",
      "급여명세서 연동을 일시적으로 사용할 수 없습니다.",
    ],
  );

  const filing = await call(route, { tenant_id: TENANT_ID, actor_id: ACTOR_ID }, "filing-validate", {
    filing_job_id: "filing-missing",
  });
  assert.deepEqual(
    [filing.status, filing.body.safe_error_code, filing.body.reason],
    [
      404,
      "HRX_PAYROLL_FILING_NOT_FOUND",
      "요청한 급여 정보를 찾을 수 없습니다.",
    ],
  );
  const internal = await call(
    route,
    { tenant_id: TENANT_ID, actor_id: ACTOR_ID },
    "items",
    {},
    {},
    "GET",
  );
  assert.deepEqual(
    [internal.status, internal.body.safe_error_code, internal.body.reason],
    [500, "HRX_PAYROLL_RUNTIME_ERROR", "급여 요청을 처리할 수 없습니다."],
  );
  assert.doesNotMatch(
    JSON.stringify({ statement: statement.body, filing: filing.body, internal: internal.body }),
    /880101-1234567|110-123-456789|payroll-live-token|PROVIDER_TAX_IDENTIFIER|provider_payload/i,
  );
});

test("payroll route never treats external throwable markers as internal rematerialization", async () => {
  const publicCode = "HRX_POSTGRES_BASELINE_CONFLICT";
  const proxyError = providerFailure(0);
  proxyError.safe_error_code = publicCode;
  proxyError.status = 409;
  const ordinaryError = providerFailure(1);
  ordinaryError.safe_error_code = publicCode;
  ordinaryError.status = 409;
  const thenable = {
    then() {},
    safe_error_code: publicCode,
    status: 409,
    message: PROVIDER_SECRETS[2],
    provider_payload: { authorization: "bearer payroll-live-token" },
  };
  const cases = [
    { name: "proxy-symbol-trap", throwable: proxySymbolTrap(proxyError), expectedStatus: 409, expectedCode: publicCode },
    { name: "ordinary-error", throwable: ordinaryError, expectedStatus: 409, expectedCode: publicCode },
    { name: "thenable", throwable: thenable, expectedStatus: 409, expectedCode: publicCode },
    {
      name: "primitive",
      throwable: PROVIDER_SECRETS[2],
      expectedStatus: 500,
      expectedCode: "HRX_PAYROLL_RUNTIME_ERROR",
    },
  ];

  const results = {};
  for (const { name, throwable, expectedStatus, expectedCode } of cases) {
    const route = createHrxPayrollRuntimeRoute({
      store: {},
      runtime: {
        itemCatalog: {
          list() {
            throw throwable;
          },
        },
      },
    });
    const result = await call(
      route,
      { tenant_id: TENANT_ID, actor_id: ACTOR_ID },
      "items",
      {},
      {},
      "GET",
    );
    assert.deepEqual(
      [result.status, result.body.outcome, result.body.safe_error_code],
      [expectedStatus, "blocked", expectedCode],
      name,
    );
    results[name] = result.body;
  }

  assert.doesNotMatch(
    JSON.stringify(results),
    /880101-1234567|110-123-456789|payroll-live-token|tax_identifier|bank_account|provider_payload|authorization|bearer/i,
  );
});

test("payroll HTTP provider failures keep filing, payment, statement responses and audits secret-free", async (t) => {
  const runtime = createDefaultHrxRuntime({
    peopleFeatureFlags: { payroll_statement_delivery: true },
    payrollProviders: {
      deliveryPort: {
        async send() {
          throw providerFailure(0);
        },
      },
      bankReconciliationPort: {
        async reconcile() {
          throw proxySymbolTrap(providerFailure(1));
        },
      },
      filingProviderPort: {
        async submit() {
          throw providerFailure(2);
        },
      },
    },
  });
  const prepared = await prepareProviderFailures(runtime);
  const started = await startApiServer({ port: 0, hrxRuntime: runtime });
  const baseUrl = `http://${started.host}:${started.port}`;
  t.after(async () => {
    await new Promise((resolve) => started.server.close(resolve));
    runtime.leaveManagementStore?.close?.();
  });
  const headers = await payrollHeaders(baseUrl);
  async function post(pathname, purpose, body = {}) {
    const response = await fetch(`${baseUrl}${pathname}`, {
      method: "POST",
      headers: withStepUp(headers, purpose),
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }

  const statement = await post(
    `/api/hrx/payroll/runs/${encodeURIComponent(prepared.runId)}/statements/deliver`,
    "payroll_export_review",
    { channel: "email" },
  );
  const payment = await post(
    `/api/hrx/payroll/payment-batches/${encodeURIComponent(prepared.paymentBatchId)}/reconcile`,
    "payroll_payment_processing",
  );
  const filing = await post(
    `/api/hrx/payroll/filings/${encodeURIComponent(prepared.filingJobId)}/submit`,
    "payroll_filing_processing",
  );

  assert.deepEqual(
    [
      statement.status,
      statement.body.delivery.overall_state,
      statement.body.delivery.receipts[0].safe_error_code,
      payment.status,
      payment.body.safe_error_code,
      payment.body.reason,
      filing.status,
      filing.body.safe_error_code,
      filing.body.reason,
    ],
    [
      200,
      "failed",
      "HRX_PAYROLL_PROVIDER_REQUEST_FAILED",
      503,
      "HRX_PAYROLL_PAYMENT_PROVIDER_UNAVAILABLE",
      "급여 지급 연동을 일시적으로 사용할 수 없습니다.",
      503,
      "HRX_PAYROLL_FILING_PROVIDER_UNAVAILABLE",
      "급여 신고 연동을 일시적으로 사용할 수 없습니다.",
    ],
  );

  const paymentBundle = runtime.payrollRuntime.paymentService.bundle(
    prepared.preparer,
    prepared.paymentBatchId,
  );
  assert.equal(paymentBundle.batch.state, "exported");
  assert.equal(paymentBundle.items.every((item) => item.state === "exported"), true);
  const bankOperations = runtime.payrollRuntime.payrollRepository.listProviderOperations(
    prepared.preparer,
    { provider_kind: "bank" },
  );
  assert.deepEqual(
    bankOperations.map(({ state, safe_error_code: safeErrorCode }) => [state, safeErrorCode]),
    [["unknown", "HRX_PAYROLL_RECONCILIATION_MANUAL_REQUIRED"]],
  );

  const payrollAudit = runtime.payrollRuntime.payrollRepository.listAuditEvents(prepared.preparer);
  const routeAudit = runtime.audit.list({ tenant_id: TENANT_ID });
  const serialized = JSON.stringify({
    responses: [statement.body, payment.body, filing.body],
    audit: { payroll: payrollAudit, route: routeAudit },
  });
  assert.equal(
    payrollAudit.some((event) => [
      "hrx.payroll.delivery.failed",
      "hrx.payroll.provider_operation.unknown",
    ].includes(event.action)),
    true,
  );
  assert.doesNotMatch(
    serialized,
    /880101-1234567|110-123-456789|payroll-live-token|tax_identifier|bank_account|provider_payload|authorization|bearer/i,
  );
});
