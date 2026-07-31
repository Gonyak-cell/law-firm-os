import assert from "node:assert/strict";
import test from "node:test";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createSqlHrxRepository } from "../../../../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { createHrxPayrollRuntime, seedSyntheticPayrollRuntimeStore } from "../../src/hrx-payroll-runtime.js";
import { createHrxRuntimeContext } from "../../src/hrx-runtime-context.js";
import {
  PAYROLL_STATEMENT_PROVIDER_CALLBACK_PATH,
  PAYROLL_STATEMENT_PROVIDER_CALLBACK_POLICY,
  PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER,
} from "../../src/routes/hrx/payroll-statement-provider-callback.js";
import { startApiServer } from "../../src/server.js";

const TENANT = "tenant-payroll-provider-callback";
const NOW = "2026-07-15T04:00:00.000Z";

function createRuntime() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store, clock: () => NOW });
  for (const [index, displayName] of ["Provider Employee One", "Provider Employee Two"].entries()) {
    const employeeId = `provider-emp-${index + 1}`;
    repository.createEmployee({
      tenant_id: TENANT,
      employee_id: employeeId,
      display_name: displayName,
      status: "active",
    });
    repository.createEmploymentProfile({
      tenant_id: TENANT,
      profile_id: `profile-${employeeId}`,
      employee_id: employeeId,
      employment_type: "full_time",
      status: "active",
      title: "변호사",
      effective_from: "2026-01-01",
    });
  }
  seedSyntheticPayrollRuntimeStore(store, [TENANT], { clock: () => NOW });
  const payrollRuntime = createHrxPayrollRuntime({ store, clock: () => NOW });
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer" };
  const approver = { tenant_id: TENANT, actor_id: "payroll-approver" };
  const run = payrollRuntime.payrollRepository.listRuns(preparer)[0];
  payrollRuntime.inputSnapshotService.capture(preparer, { run_id: run.run_id });
  payrollRuntime.runService.preview(preparer, { run_id: run.run_id });
  const previewed = payrollRuntime.payrollRepository.getRun(preparer, { run_id: run.run_id });
  payrollRuntime.payrollRepository.transitionRun(approver, {
    run_id: run.run_id,
    status: "approved",
    expected_version: previewed.state_version,
    step_up_receipt_ref: "artifact:step-up/provider-callback-test",
    step_up_receipt_hash: "a".repeat(64),
  });
  const approved = payrollRuntime.payrollRepository.getRun(preparer, { run_id: run.run_id });
  payrollRuntime.payrollRepository.transitionRun(approver, {
    run_id: run.run_id,
    status: "closed",
    expected_version: approved.state_version,
  });
  return { store, payrollRuntime, runId: run.run_id };
}

async function post(baseUrl, body, headers = {}) {
  const response = await fetch(`${baseUrl}${PAYROLL_STATEMENT_PROVIDER_CALLBACK_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER]: TENANT,
      "x-provider-signature": "valid-test-signature",
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

test("PEO-TUW-070 provider callback uses signed auth, is idempotent, and blocks cross-tenant/out-of-order events", async () => {
  const { store, payrollRuntime, runId } = createRuntime();
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer" };
  await payrollRuntime.documentService.generate(preparer, { run_id: runId });
  const sent = await payrollRuntime.documentService.deliver(preparer, { run_id: runId, channel: "email" });
  const [first, second] = sent.receipts;
  const verifierCalls = [];
  const verifier = {
    async verify(input) {
      verifierCalls.push(input);
      if (input.headers["x-provider-signature"] !== "valid-test-signature") return { ok: false };
      return {
        ok: true,
        tenant_id: TENANT,
        provider_id: "lawos-delivery-sandbox",
      };
    },
  };
  const hrxRuntime = createHrxRuntimeContext({
    store,
    seedPayrollRuntime: false,
    seedRuntimeFixtures: false,
    peopleFeatureFlags: { payroll_statement_delivery: true },
  });
  const started = await startApiServer({
    port: 0,
    hrxRuntime,
    payrollStatementProviderVerifier: verifier,
  });
  const baseUrl = `http://${started.host}:${started.port}`;
  try {
    assert.deepEqual(
      [PAYROLL_STATEMENT_PROVIDER_CALLBACK_POLICY.authentication, PAYROLL_STATEMENT_PROVIDER_CALLBACK_POLICY.fail_closed],
      ["provider_signature", true],
    );
    const event = {
      tenant_id: TENANT,
      event: {
        provider_event_id: "http-provider-event-delivered-001",
        provider_receipt_ref: first.provider_receipt_ref,
        provider_event_state: "delivered",
        event_occurred_at: "2026-07-15T04:05:00.000Z",
      },
    };
    const invalid = await post(baseUrl, event, { "x-provider-signature": "invalid" });
    assert.deepEqual(
      [invalid.status, invalid.body.safe_error_code],
      [401, "HRX_PAYROLL_PROVIDER_SIGNATURE_INVALID"],
    );

    const crossed = await post(baseUrl, { ...event, tenant_id: "tenant-other" });
    assert.deepEqual(
      [crossed.status, crossed.body.safe_error_code],
      [403, "HRX_PAYROLL_PROVIDER_TENANT_MISMATCH"],
    );

    const delivered = await post(baseUrl, event);
    assert.deepEqual(
      [delivered.status, delivered.body.outcome, delivered.body.delivery_receipt.provider_result_state],
      [200, "applied", "delivered"],
    );
    assert.equal(delivered.body.payroll_amounts_included, false);
    assert.doesNotMatch(JSON.stringify(delivered.body), /gross|net_krw|deduction|employee_id/);
    const replay = await post(baseUrl, event);
    assert.deepEqual([replay.status, replay.body.outcome, replay.body.replayed], [200, "replayed", true]);

    const tooEarly = await post(baseUrl, {
      tenant_id: TENANT,
      event: {
        provider_event_id: "http-provider-event-read-too-early",
        provider_receipt_ref: second.provider_receipt_ref,
        provider_event_state: "read",
        event_occurred_at: "2026-07-15T04:06:00.000Z",
      },
    });
    assert.deepEqual(
      [tooEarly.status, tooEarly.body.safe_error_code],
      [409, "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER"],
    );
    assert.ok(verifierCalls.every((call) => Buffer.isBuffer(call.raw_body)));
    assert.equal(payrollRuntime.payrollRepository.listDeliveryProviderEvents(preparer).length, 1);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
    store.close();
  }
});

test("PEO-TUW-070 provider callback fails closed when no verifier is injected", async () => {
  const { store, payrollRuntime, runId } = createRuntime();
  const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer" };
  await payrollRuntime.documentService.generate(preparer, { run_id: runId });
  const sent = await payrollRuntime.documentService.deliver(preparer, {
    run_id: runId,
    channel: "email",
  });
  const hrxRuntime = createHrxRuntimeContext({
    store,
    seedPayrollRuntime: false,
    seedRuntimeFixtures: false,
    peopleFeatureFlags: { payroll_statement_delivery: true },
  });
  const started = await startApiServer({ port: 0, hrxRuntime });
  const baseUrl = `http://${started.host}:${started.port}`;
  try {
    const blocked = await post(baseUrl, {
      tenant_id: TENANT,
      event: {
        provider_event_id: "http-provider-event-without-verifier",
        provider_receipt_ref: sent.receipts[0].provider_receipt_ref,
        provider_event_state: "delivered",
        event_occurred_at: "2026-07-15T04:05:00.000Z",
      },
    });
    assert.deepEqual(
      [blocked.status, blocked.body.safe_error_code, blocked.body.fail_closed],
      [503, "HRX_PAYROLL_PROVIDER_VERIFIER_REQUIRED", true],
    );
    assert.equal(payrollRuntime.payrollRepository.listDeliveryProviderEvents(preparer).length, 0);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
    store.close();
  }
});
