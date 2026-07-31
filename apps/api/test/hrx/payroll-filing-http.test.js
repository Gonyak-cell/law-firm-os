import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createDefaultHrxRuntime, startApiServer } from "../../src/server.js";
import { findRegisteredAccountByEmail } from "../../src/matter-vault-account-registry.js";
import { apiSessionHeaders } from "../helpers/session.js";
import { signedStepUpHeader } from "../hrx-step-up-test-helper.js";
import { HRX_PROVIDER_RECEIPT_SCHEMA_VERSION } from "../../../../packages/hrx/src/provider-receipt-contract.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT_ID = "tenant_amic_matter_vault";
const ACTOR_ID = "user_amic_jwsuh";
const PROVIDER_NOW = "2026-07-31T00:00:00.000Z";

function filingProviderReceipt(request, state) {
  return {
    schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
    receipt_id: `filing-http-${request.filing_job_id}-${state}`,
    tenant_id: request.tenant_id,
    provider_kind: "filing",
    provider_id: "synthetic-filing-sandbox",
    operation: `filing.${request.filing_kind}`,
    idempotency_key: request.idempotency_key,
    payload_hash: request.payload_hash,
    state,
    requested_at: PROVIDER_NOW,
    completed_at: state === "pending" ? null : PROVIDER_NOW,
    provider_receipt_ref: state === "succeeded"
      ? `provider:sandbox/filing/${request.filing_job_id}`
      : null,
    error_code: state === "failed" ? "SANDBOX_REJECTED" : null,
  };
}

async function transitionSeedRunToClosed(runtime) {
  const preparer = { tenant_id: TENANT_ID, actor_id: ACTOR_ID };
  const approver = {
    ...preparer,
    step_up_verified: true,
    step_up_purpose: "payroll_export_review",
  };
  const runId = runtime.payrollRuntime.payrollRepository.listRuns(preparer)[0].run_id;
  for (const [action, context] of [
    ["snapshot", preparer],
    ["preview", preparer],
    ["approve", approver],
    ["close", approver],
  ]) {
    const result = await runtime.payrollRuntimeRoute.handle({
      method: "POST",
      context,
      params: { action, run_id: runId },
      body: {},
    });
    assert.equal(result.status, 200, `${action}: ${JSON.stringify(result.body)}`);
  }
  return runId;
}

async function filingRequestHeaders(baseUrl) {
  const account = findRegisteredAccountByEmail("jwsuh@amic.kr");
  assert.ok(account);
  return {
    ...(await apiSessionHeaders(baseUrl, account)),
    "content-type": "application/json",
    "x-lawos-tenant-id": TENANT_ID,
    "x-lawos-actor-id": ACTOR_ID,
    "x-lawos-actor-role": "security_admin,hr_admin,people_ops",
    "x-lawos-hrx-scopes": "hrx.payroll.preview,hrx.payroll.approve,hrx.payroll.export,hrx.payroll.filing.prepare",
    "x-lawos-hrx-step-up": signedStepUpHeader({
      tenant_id: TENANT_ID,
      actor_id: ACTOR_ID,
      purpose: "payroll_filing_processing",
    }),
  };
}

test("PEO-068 HTTP rejects caller-supplied filing records and returns metadata-only canonical filing", async (t) => {
  const runtime = createDefaultHrxRuntime();
  const runId = await transitionSeedRunToClosed(runtime);
  const started = await startApiServer({ port: 0, hrxRuntime: runtime });
  const baseUrl = `http://${started.host}:${started.port}`;
  t.after(async () => {
    await new Promise((resolve) => started.server.close(resolve));
    runtime.leaveManagementStore?.close?.();
  });

  const headers = await filingRequestHeaders(baseUrl);
  const target = `${baseUrl}/api/hrx/payroll/runs/${encodeURIComponent(runId)}/filings`;

  const injectedResponse = await fetch(target, {
    method: "POST",
    headers,
    body: JSON.stringify({
      filing_kind: "social_insurance",
      records: [{ employee_id: "emp-swapped", gross_krw: 1 }],
    }),
  });
  const injectedBody = await injectedResponse.json();
  assert.equal(injectedResponse.status, 400, JSON.stringify(injectedBody));
  assert.equal(injectedBody.safe_error_code, "HRX_PAYROLL_FILING_RECORDS_FORBIDDEN");

  const canonicalResponse = await fetch(target, {
    method: "POST",
    headers,
    body: JSON.stringify({ filing_kind: "social_insurance" }),
  });
  const canonicalBody = await canonicalResponse.json();
  assert.equal(canonicalResponse.status, 200, JSON.stringify(canonicalBody));
  assert.equal(canonicalBody.outcome, "created");
  assert.equal(canonicalBody.filing.run_id, runId);
  assert.match(canonicalBody.filing.package_hash, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(canonicalBody.filing, "records"), false);
  assert.doesNotMatch(
    JSON.stringify(canonicalBody),
    /gross_krw|deduction_krw|net_krw|resident_registration|bank_account|tax_base/,
  );
});

test("PEO-069 HTTP rejects a filing when a line is inserted after the payroll close anchor", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "lawos-filing-http-"));
  const store = createFileHrxStore({ filePath: join(directory, "hrx.json") });
  const runtime = createDefaultHrxRuntime({ store });
  const runId = await transitionSeedRunToClosed(runtime);
  const context = { tenant_id: TENANT_ID, actor_id: ACTOR_ID };
  const bundle = runtime.payrollRuntime.payrollRepository.getRunBundle(context, { run_id: runId });
  assert.match(bundle.run.filing_source_hash, /^[a-f0-9]{64}$/);
  store.query("insert", {
    table: "hrx_payroll_line_items",
    row: {
      tenant_id: TENANT_ID,
      line_item_id: "line-post-close-http-injection",
      result_id: bundle.results[0].result_id,
      item_kind: "employer_contribution",
      item_code: "INJECTED_EMPLOYER_CONTRIBUTION",
      formula_code: "UNTRUSTED_POST_CLOSE",
      rule_version_id: null,
      amount_krw: 999_999,
      quantity_minutes: null,
      metadata_json: "{}",
      created_at: "2026-07-31T00:00:00.000Z",
    },
  });

  const started = await startApiServer({ port: 0, hrxRuntime: runtime });
  const baseUrl = `http://${started.host}:${started.port}`;
  t.after(async () => {
    await new Promise((resolve) => started.server.close(resolve));
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const response = await fetch(
    `${baseUrl}/api/hrx/payroll/runs/${encodeURIComponent(runId)}/filings`,
    {
      method: "POST",
      headers: await filingRequestHeaders(baseUrl),
      body: JSON.stringify({ filing_kind: "social_insurance" }),
    },
  );
  const body = await response.json();
  assert.equal(response.status, 409, JSON.stringify(body));
  assert.equal(body.safe_error_code, "HRX_PAYROLL_FILING_SOURCE_HASH_MISMATCH");
  assert.equal(
    runtime.payrollRuntime.payrollRepository.listFilingJobs(context, { run_id: runId }).length,
    0,
  );
});

test("PEO-069 HTTP blocks a pre-047 pending filing before polling the provider", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "lawos-filing-legacy-http-"));
  let submitCalls = 0;
  let statusCalls = 0;
  const providerPort = {
    async submit(request) {
      submitCalls += 1;
      return filingProviderReceipt(request, "pending");
    },
    async status(request) {
      statusCalls += 1;
      return filingProviderReceipt(request, "succeeded");
    },
  };
  const originalStore = createFileHrxStore({ filePath: join(directory, "original.json") });
  const originalRuntime = createDefaultHrxRuntime({
    store: originalStore,
    payrollProviders: { filingProviderPort: providerPort },
  });
  const runId = await transitionSeedRunToClosed(originalRuntime);
  const preparer = { tenant_id: TENANT_ID, actor_id: ACTOR_ID };
  const approver = {
    ...preparer,
    step_up_verified: true,
    step_up_purpose: "payroll_filing_processing",
  };
  const created = await originalRuntime.payrollRuntimeRoute.handle({
    method: "POST",
    context: preparer,
    params: { action: "filing-create", run_id: runId },
    body: { filing_kind: "social_insurance" },
  });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const filingJobId = created.body.filing.filing_job_id;
  assert.equal((await originalRuntime.payrollRuntimeRoute.handle({
    method: "POST",
    context: preparer,
    params: { action: "filing-validate", filing_job_id: filingJobId },
    body: {},
  })).status, 200);
  const pending = await originalRuntime.payrollRuntimeRoute.handle({
    method: "POST",
    context: approver,
    params: { action: "filing-submit", filing_job_id: filingJobId },
    body: {},
  });
  assert.equal(pending.status, 200, JSON.stringify(pending.body));
  assert.equal(pending.body.submission.job.state, "submitted");
  assert.deepEqual([submitCalls, statusCalls], [1, 0]);

  const legacyState = originalStore.snapshot();
  legacyState.tables.hrx_payroll_runs
    .find((run) => run.run_id === runId).filing_source_hash = null;
  originalStore.close();
  const upgradedStore = createFileHrxStore({
    filePath: join(directory, "upgraded.json"),
    initialState: legacyState,
  });
  const upgradedRuntime = createDefaultHrxRuntime({
    store: upgradedStore,
    payrollProviders: { filingProviderPort: providerPort },
  });
  const started = await startApiServer({ port: 0, hrxRuntime: upgradedRuntime });
  const baseUrl = `http://${started.host}:${started.port}`;
  t.after(async () => {
    await new Promise((resolve) => started.server.close(resolve));
    upgradedStore.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const response = await fetch(
    `${baseUrl}/api/hrx/payroll/filings/${encodeURIComponent(filingJobId)}/submit`,
    {
      method: "POST",
      headers: await filingRequestHeaders(baseUrl),
      body: "{}",
    },
  );
  const body = await response.json();
  assert.equal(response.status, 409, JSON.stringify(body));
  assert.equal(body.safe_error_code, "HRX_PAYROLL_FILING_SOURCE_VERIFICATION_REQUIRED");
  assert.deepEqual([submitCalls, statusCalls], [1, 0]);
  assert.equal(
    upgradedRuntime.payrollRuntime.payrollRepository
      .getFilingJob(preparer, { filing_job_id: filingJobId }).state,
    "submitted",
  );
});
