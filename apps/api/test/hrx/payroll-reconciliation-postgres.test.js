import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../../packages/dms/src/storage/local-storage-adapter.js";
import { createPostgresDmsUploadRuntime } from "../../../../packages/dms/src/postgres-upload-runtime.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import {
  createHrxDomainSnapshot,
  materializeHrxStoreFromPostgres,
} from "../../../../packages/hrx/src/postgres-store-v2.js";
import { createPayrollPaymentReconciliationScope } from "../../../../packages/hrx/src/payroll/payment-service.js";
import { createPayrollStepUpReceipt } from "../../../../packages/hrx/src/payroll/run-service.js";
import { HRX_PROVIDER_RECEIPT_SCHEMA_VERSION } from "../../../../packages/hrx/src/provider-receipt-contract.js";
import { createSqlHrxRepository } from "../../../../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { createPostgresDomainLedger } from "../../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  createHrxPayrollRuntime,
  seedSyntheticPayrollRuntimeStore,
} from "../../src/hrx-payroll-runtime.js";
import { createPostgresPayrollReconciliationCheckpoint } from "../../src/hrx-payroll-reconciliation-checkpoint.js";
import { createPostgresApiRuntimeAuthority } from "../../src/postgres-api-runtime-authority.js";
import { createApiServer } from "../../src/server.js";
import { createHrxStepUpAuthority } from "../../src/hrx-step-up-token.js";
import { signedStepUpHeader } from "../hrx-step-up-test-helper.js";

const TENANT = "tenant-payment-reconciliation-postgres";
const NOW = "2026-07-15T08:00:00.000Z";
const PREPARER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-preparer" });
const PAYROLL_APPROVER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-approver" });
const PAYMENT_APPROVER = Object.freeze({ tenant_id: TENANT, actor_id: "payment-approver" });
const PAYROLL_ARTIFACT_SECRET = "postgres-payment-reconciliation-test-artifact-secret";
const BANK_PROVIDER_ID = "seoul-bank-primary";
const BANK_BOUNDARY = Object.freeze({
  environment: "production",
  provider_kind: "bank",
  provider_id: BANK_PROVIDER_ID,
  provider_connection_ref: "provider:seoul-bank-primary/connection",
  credential_ref: "vault:seoul-bank-primary/credential",
  connection_state: "connected",
  allow_synthetic: false,
  maximum_attempts: 3,
});

function stepUp(batchId) {
  return createPayrollStepUpReceipt({
    receipt_ref: `artifact:step-up/payment/${batchId}`,
    actor_id: PAYMENT_APPROVER.actor_id,
    action: "payroll.payment.approve",
    object_id: batchId,
    issued_at: NOW,
    expires_at: "2026-07-15T08:05:00.000Z",
  });
}

async function importExportedPaymentBaseline(ledger) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    const hr = createSqlHrxRepository({ store, clock: () => NOW });
    for (const [employeeId, displayName] of [
      ["employee-payment-a", "Payment Employee A"],
      ["employee-payment-b", "Payment Employee B"],
    ]) {
      hr.createEmployee({
        tenant_id: TENANT,
        employee_id: employeeId,
        display_name: displayName,
        status: "active",
      });
      hr.createEmploymentProfile({
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
    const runtime = createHrxPayrollRuntime({ store, clock: () => NOW });
    const run = runtime.payrollRepository.listRuns(PREPARER)[0];
    runtime.inputSnapshotService.capture(PREPARER, { run_id: run.run_id });
    runtime.runService.preview(PREPARER, { run_id: run.run_id });
    const previewed = runtime.payrollRepository.getRun(PREPARER, { run_id: run.run_id });
    runtime.payrollRepository.transitionRun(PAYROLL_APPROVER, {
      run_id: run.run_id,
      status: "approved",
      expected_version: previewed.state_version,
      step_up_receipt_ref: "artifact:step-up/postgres-payment-run",
      step_up_receipt_hash: "a".repeat(64),
    });
    const approved = runtime.payrollRepository.getRun(PREPARER, { run_id: run.run_id });
    runtime.payrollRepository.transitionRun(PAYROLL_APPROVER, {
      run_id: run.run_id,
      status: "closed",
      expected_version: approved.state_version,
    });
    const prepared = runtime.paymentService.prepare(PREPARER, { run_id: run.run_id });
    runtime.paymentService.approve(PAYMENT_APPROVER, {
      payment_batch_id: prepared.batch.payment_batch_id,
      step_up_receipt: stepUp(prepared.batch.payment_batch_id),
    });
    const exported = await runtime.paymentService.exportBatch(PAYMENT_APPROVER, {
      payment_batch_id: prepared.batch.payment_batch_id,
    });
    await ledger.importSnapshot(createHrxDomainSnapshot({
      store,
      tenant_id: TENANT,
    }).snapshot);
    return Object.freeze({
      run_id: run.run_id,
      payment_batch_id: exported.batch.payment_batch_id,
      exported,
      scope: createPayrollPaymentReconciliationScope({
        batch: exported.batch,
        items: exported.items,
        mode: "initial",
      }),
    });
  } finally {
    store.close();
  }
}

function createBankPort(state, {
  delayMs = 0,
  outcome = "partial",
  recoveryLookup = false,
} = {}) {
  state.results ??= new Map();
  state.lookup_count ??= 0;
  const port = {
    async reconcile(input) {
      state.call_count += 1;
      state.requests.push(Object.freeze({
        idempotency_key: input.idempotency_key,
        payload_hash: input.payload_hash,
        request_hash: input.request_hash,
      }));
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      const targetItems = input.mode === "retry"
        ? input.bundle.items.filter((item) => item.state === "failed")
        : input.bundle.items;
      const [paid, ...failed] = targetItems;
      const result = Object.freeze({
        provider_receipt: Object.freeze({
          schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
          receipt_id: `bank-production-receipt-${input.request_hash.slice(0, 24)}`,
          tenant_id: input.context.tenant_id,
          provider_kind: "bank",
          provider_id: BANK_PROVIDER_ID,
          operation: "bulk_transfer_reconcile",
          idempotency_key: input.idempotency_key,
          payload_hash: input.payload_hash,
          state: "succeeded",
          requested_at: NOW,
          completed_at: NOW,
          provider_receipt_ref: `provider:seoul-bank-primary/${input.request_hash.slice(0, 24)}`,
          error_code: null,
        }),
        items: Object.freeze(outcome === "unknown"
          ? targetItems.map((item) => Object.freeze({
            employee_id: item.employee_id,
            state: "unknown",
          }))
          : [
            Object.freeze({
              employee_id: paid.employee_id,
              state: "paid",
              provider_receipt_ref: `provider:seoul-bank-primary/item-${paid.payment_item_id}`,
            }),
            ...failed.map((item) => Object.freeze({
              employee_id: item.employee_id,
              state: "failed",
              safe_error_code: "BANK_ACCOUNT_REJECTED",
            })),
          ]),
        reported_item_count: targetItems.length,
        reported_paid_total_krw: outcome === "unknown" ? 0 : paid.amount_krw,
      });
      state.results.set(input.idempotency_key, Object.freeze({
        payload_hash: input.payload_hash,
        request_hash: input.request_hash,
        result,
      }));
      return result;
    },
  };
  if (recoveryLookup) {
    Object.assign(port, {
      recovery_lookup: "read_only_by_idempotency_key",
      async lookup(input) {
        state.lookup_count += 1;
        const stored = state.results.get(input.idempotency_key);
        if (!stored) return null;
        assert.equal(stored.payload_hash, input.payload_hash);
        assert.equal(stored.request_hash, input.request_hash);
        return stored.result;
      },
    });
  }
  return Object.freeze(port);
}

function createAuthority({
  fixture,
  ledger,
  storage,
  bankPort,
  reconciliationLeaseMs,
}) {
  return createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage: storage,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage,
      sourceOnly: false,
    }),
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
    payrollProviders: Object.freeze({
      bankReconciliationPort: bankPort,
      providerBoundaries: Object.freeze({ bank: BANK_BOUNDARY }),
      ...(reconciliationLeaseMs ? { reconciliationLeaseMs } : {}),
    }),
  });
}

async function startServer(authority) {
  const principal = Object.freeze({
    user_id: PAYMENT_APPROVER.actor_id,
    tenant_id: TENANT,
    role_ids: Object.freeze(["security_admin", "hr_admin", "people_ops"]),
    scopes: Object.freeze(["hrx.payroll.payment.prepare"]),
    hrx_scopes: Object.freeze(["hrx.payroll.payment.prepare"]),
  });
  const sessionAuth = Object.freeze({
    capabilities: Object.freeze({}),
    async resolvePermissionContextFromHeaders() {
      return Object.freeze({
        ok: true,
        principal,
        context: Object.freeze({
          principal,
          rules: Object.freeze([{ id: "allow-payroll-reconciliation", effect: "allow", action: "*" }]),
          object_acl: Object.freeze([]),
        }),
      });
    },
  });
  const stepUpAuthority = createHrxStepUpAuthority({ now: () => NOW });
  const server = createApiServer({
    hrxRuntime: null,
    masterDataRuntime: null,
    matterRuntime: null,
    dmsRuntime: null,
    crmIntakeRuntime: null,
    financeRuntime: null,
    analyticsRuntime: null,
    aiRuntime: null,
    portalRuntime: null,
    uiReadinessRuntime: null,
    homeDashboardRuntime: null,
    enterpriseReadinessRuntime: null,
    requestRuntimeAuthority: authority,
    persistenceAuthority: "postgres-v2",
    sessionAuth,
    stepUpAuthority,
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return Object.freeze({
    server,
    base_url: `http://127.0.0.1:${server.address().port}`,
    step_up: signedStepUpHeader({
      tenant_id: TENANT,
      actor_id: PAYMENT_APPROVER.actor_id,
      purpose: "payroll_payment_processing",
      authority: stepUpAuthority,
      at: NOW,
    }),
  });
}

async function stopServer(server) {
  await new Promise((resolve) => server.close(resolve));
  server.closeAllConnections();
  server.closeIdleConnections();
}

async function reconcile(baseUrl, stepUp, batchId, body = {}, requestKey = null) {
  const response = await fetch(
    `${baseUrl}/api/hrx/payroll/payment-batches/${encodeURIComponent(batchId)}/reconcile`,
    {
      method: "POST",
      headers: {
        authorization: "Bearer postgres-payment-reconciliation-test",
        "content-type": "application/json",
        "x-lawos-hrx-step-up": stepUp,
        ...(requestKey ? { "idempotency-key": requestKey } : {}),
      },
      body: JSON.stringify(body),
    },
  );
  return Object.freeze({ status: response.status, body: await response.json() });
}

async function retryFailed(baseUrl, stepUp, batchId, body = {}, requestKey = null) {
  const response = await fetch(
    `${baseUrl}/api/hrx/payroll/payment-batches/${encodeURIComponent(batchId)}/retry-failed`,
    {
      method: "POST",
      headers: {
        authorization: "Bearer postgres-payment-reconciliation-test",
        "content-type": "application/json",
        "x-lawos-hrx-step-up": stepUp,
        ...(requestKey ? { "idempotency-key": requestKey } : {}),
      },
      body: JSON.stringify(body),
    },
  );
  return Object.freeze({ status: response.status, body: await response.json() });
}

test("PEO-TUW-068/069 concurrent PostgreSQL HTTP reconciliation claims before the bank call and replays after restart without provider recall", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 16 });
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const storage = createLocalStorageAdapter({ adapter_id: "postgres-payment-reconciliation-test" });
  const baseline = await importExportedPaymentBaseline(ledger);
  const bankState = { call_count: 0, requests: [] };
  const bankPort = createBankPort(bankState, { delayMs: 75 });
  const first = await startServer(createAuthority({ fixture, ledger, storage, bankPort }));
  let concurrentStatuses;
  try {
    const concurrent = await Promise.all([
      reconcile(first.base_url, first.step_up, baseline.payment_batch_id),
      reconcile(first.base_url, first.step_up, baseline.payment_batch_id),
    ]);
    concurrentStatuses = concurrent.map((result) => result.status).sort((left, right) => left - right);
    assert.deepEqual(
      concurrentStatuses,
      [200, 202],
      JSON.stringify(concurrent.map((result) => result.body)),
    );
    assert.equal(bankState.call_count, 1);
    assert.deepEqual(bankState.requests, [{
      idempotency_key: baseline.scope.idempotency_key,
      payload_hash: baseline.scope.payload_hash,
      request_hash: baseline.scope.payload_hash.slice("sha256:".length),
    }]);
  } finally {
    await stopServer(first.server);
  }

  const restarted = await startServer(createAuthority({ fixture, ledger, storage, bankPort }));
  try {
    const replay = await reconcile(restarted.base_url, restarted.step_up, baseline.payment_batch_id);
    assert.equal(replay.status, 200, JSON.stringify(replay.body));
    assert.equal(replay.body.outcome, "replayed");
    assert.equal(replay.body.payment.reconciliation_state, "partial_success");
    assert.equal(bankState.call_count, 1);
  } finally {
    await stopServer(restarted.server);
  }

  const records = await ledger.list({ tenant_id: TENANT, domain_id: "hrx" });
  const operations = records.filter((record) => record.record_type === "hrx_payroll_provider_operations");
  const batches = records.filter((record) => record.record_type === "hrx_payroll_payment_batches");
  const items = records.filter((record) => record.record_type === "hrx_payroll_payment_items");
  const payrollOutbox = records.filter((record) =>
    record.record_type === "hrx_payroll_outbox"
      && record.payload.event_type === "payroll.payment.reconciled");
  const settlementAuditActions = records
    .filter((record) => record.record_type === "hrx_audit_events")
    .map((record) => record.payload.action)
    .filter((action) => action === "hrx.payroll.payment_item.paid"
      || action === "hrx.payroll.payment_item.failed"
      || action === "hrx.payroll.payment_batch.reconciled"
      || action === "hrx.payroll.provider_operation.succeeded")
    .sort();
  const centralOutbox = await ledger.listOutbox({ tenant_id: TENANT, domain_id: "hrx" });
  assert.deepEqual(operations.map((record) => record.payload.state), ["succeeded"]);
  assert.ok(operations.every((record) =>
    /^[a-f0-9]{64}$/u.test(record.payload.result_payload_hash)
      && /^[a-f0-9]{64}$/u.test(record.payload.provider_response_hash)));
  assert.deepEqual(batches.map((record) => record.payload.state), ["reconciled"]);
  assert.deepEqual(items.map((record) => record.payload.state).sort(), ["failed", "paid"]);
  assert.equal(payrollOutbox.length, 1);
  assert.deepEqual(settlementAuditActions, [
    "hrx.payroll.payment_batch.reconciled",
    "hrx.payroll.payment_item.failed",
    "hrx.payroll.payment_item.paid",
    "hrx.payroll.provider_operation.succeeded",
  ]);
  assert.ok(centralOutbox.some((event) =>
    event.payload?.event_type === "hrx.payroll.provider_operation.succeeded"));
  assert.doesNotMatch(
    JSON.stringify(operations),
    /account_number|bank_code|account_holder|Payment Employee A|Payment Employee B/u,
  );
  t.diagnostic(JSON.stringify({
    scenario: "postgres_concurrent_http_and_restart_replay",
    concurrent_http_statuses: concurrentStatuses,
    bank_port_call_count: bankState.call_count,
    exact_provider_request: bankState.requests[0],
    provider_operation_state: operations[0].payload.state,
    payment_batch_state: batches[0].payload.state,
    payment_item_states: items.map((record) => record.payload.state).sort(),
    reconciliation_outbox_count: payrollOutbox.length,
    settlement_audit_actions: settlementAuditActions,
    account_fields_present: false,
  }));
});

test("PEO-FIX-068-B recovers the after-bank-return process-loss window through read-only receipt lookup without another effect", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const storage = createLocalStorageAdapter({ adapter_id: "postgres-payment-reconciliation-resume-test" });
  const baseline = await importExportedPaymentBaseline(ledger);
  const bankState = { call_count: 0, requests: [], lookup_count: 0 };
  const bankPort = createBankPort(bankState, { recoveryLookup: true });
  const checkpoint = createPostgresPayrollReconciliationCheckpoint({ ledger, clock: () => NOW });
  const reconciliationLeaseMs = 20;
  const localStore = await ledger.transaction({
    tenant_id: TENANT,
    domain_id: "hrx",
  }, (tx) => materializeHrxStoreFromPostgres({ ledger: tx, tenant_id: TENANT }));
  try {
    const localRuntime = createHrxPayrollRuntime({
      store: localStore,
      clock: () => NOW,
      bankReconciliationPort: bankPort,
      bankReconciliationCheckpoint: checkpoint,
      reconciliationLeaseMs,
      providerBoundaries: { bank: BANK_BOUNDARY },
    });
    const claim = localRuntime.paymentService.claimReconciliation(PAYMENT_APPROVER, {
      payment_batch_id: baseline.payment_batch_id,
      mode: "initial",
    });
    const durableClaim = await checkpoint.claim(PAYMENT_APPROVER, claim);
    assert.equal(durableClaim.should_execute, true);
    const providerResult = await bankPort.reconcile({
      context: PAYMENT_APPROVER,
      bundle: claim.plan.current,
      mode: "initial",
      ...claim.provider_request,
    });
    assert.equal(providerResult.provider_receipt.idempotency_key, claim.provider_request.idempotency_key);
    // Simulated process loss: the bank has returned, but neither stage nor fail is called.
  } finally {
    localStore.close();
  }
  assert.equal(bankState.call_count, 1);
  const beforeRestart = await ledger.list({ tenant_id: TENANT, domain_id: "hrx" });
  const inProgress = beforeRestart.find((record) =>
    record.record_type === "hrx_payroll_provider_operations");
  assert.equal(inProgress.payload.state, "in_progress");
  assert.equal(inProgress.payload.result_payload_json, null);
  await new Promise((resolve) => setTimeout(resolve, reconciliationLeaseMs + 20));

  const restarted = await startServer(createAuthority({
    fixture,
    ledger,
    storage,
    bankPort,
    reconciliationLeaseMs,
  }));
  try {
    const resumed = await reconcile(restarted.base_url, restarted.step_up, baseline.payment_batch_id);
    assert.equal(resumed.status, 200, JSON.stringify(resumed.body));
    assert.equal(resumed.body.payment.reconciliation_state, "partial_success");
    assert.equal(bankState.call_count, 1);
    assert.equal(bankState.lookup_count, 1);
    const afterRecovery = await ledger.list({ tenant_id: TENANT, domain_id: "hrx" });
    const operation = afterRecovery.find((record) =>
      record.record_type === "hrx_payroll_provider_operations");
    const recoveryAudit = afterRecovery.find((record) =>
      record.record_type === "hrx_audit_events"
        && record.payload.action === "hrx.payroll.provider_operation.unknown_reconciliation_required");
    assert.equal(operation.payload.state, "succeeded");
    assert.equal(recoveryAudit.payload.metadata_json.includes(baseline.scope.idempotency_key), true);
    assert.equal(recoveryAudit.payload.metadata_json.includes(baseline.scope.payload_hash.slice("sha256:".length)), true);
    t.diagnostic(JSON.stringify({
      scenario: "postgres_after_bank_return_before_stage_process_loss",
      pre_restart_operation_state: inProgress.payload.state,
      resumed_http_status: resumed.status,
      reconciliation_state: resumed.body.payment.reconciliation_state,
      bank_port_call_count: bankState.call_count,
      read_only_lookup_count: bankState.lookup_count,
      terminal_operation_state: operation.payload.state,
      manual_required_audit_present: true,
    }));
  } finally {
    await stopServer(restarted.server);
  }
});

test("PEO-FIX-068-B blocks blind bank recall and accepts only an explicit verified result when lookup is unavailable", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const storage = createLocalStorageAdapter({ adapter_id: "postgres-payment-reconciliation-manual-test" });
  const baseline = await importExportedPaymentBaseline(ledger);
  const bankState = { call_count: 0, requests: [] };
  const bankPort = createBankPort(bankState);
  const checkpoint = createPostgresPayrollReconciliationCheckpoint({ ledger });
  const reconciliationLeaseMs = 20;
  let providerResult;
  const localStore = await ledger.transaction({
    tenant_id: TENANT,
    domain_id: "hrx",
  }, (tx) => materializeHrxStoreFromPostgres({ ledger: tx, tenant_id: TENANT }));
  try {
    const localRuntime = createHrxPayrollRuntime({
      store: localStore,
      bankReconciliationPort: bankPort,
      bankReconciliationCheckpoint: checkpoint,
      reconciliationLeaseMs,
      providerBoundaries: { bank: BANK_BOUNDARY },
    });
    const claim = localRuntime.paymentService.claimReconciliation(PAYMENT_APPROVER, {
      payment_batch_id: baseline.payment_batch_id,
      mode: "initial",
    });
    assert.equal((await checkpoint.claim(PAYMENT_APPROVER, claim)).should_execute, true);
    providerResult = await bankPort.reconcile({
      context: PAYMENT_APPROVER,
      bundle: claim.plan.current,
      mode: "initial",
      ...claim.provider_request,
    });
    // Simulated process loss immediately after the effectful port returns.
  } finally {
    localStore.close();
  }
  await new Promise((resolve) => setTimeout(resolve, reconciliationLeaseMs + 20));

  const restarted = await startServer(createAuthority({
    fixture,
    ledger,
    storage,
    bankPort,
    reconciliationLeaseMs,
  }));
  try {
    const unknown = await reconcile(restarted.base_url, restarted.step_up, baseline.payment_batch_id);
    assert.equal(unknown.status, 409, JSON.stringify(unknown.body));
    assert.equal(unknown.body.outcome, "unknown_reconciliation_required");
    assert.equal(unknown.body.safe_error_code, "HRX_PAYROLL_RECONCILIATION_MANUAL_REQUIRED");
    assert.equal(unknown.body.effectful_retry_blocked, true);
    assert.equal(unknown.body.manual_reconciliation_required, true);
    assert.equal(bankState.call_count, 1);

    const recovered = await reconcile(
      restarted.base_url,
      restarted.step_up,
      baseline.payment_batch_id,
      {
        ...providerResult,
        confirm_unknown_reconciliation: true,
      },
    );
    assert.equal(recovered.status, 200, JSON.stringify(recovered.body));
    assert.equal(recovered.body.payment.reconciliation_state, "partial_success");
    assert.equal(bankState.call_count, 1);
    const records = await ledger.list({ tenant_id: TENANT, domain_id: "hrx" });
    const operation = records.find((record) =>
      record.record_type === "hrx_payroll_provider_operations");
    assert.equal(operation.payload.state, "succeeded");
    t.diagnostic(JSON.stringify({
      scenario: "postgres_no_lookup_manual_reconciliation",
      unknown_http_status: unknown.status,
      safe_error_code: unknown.body.safe_error_code,
      manual_http_status: recovered.status,
      bank_port_call_count: bankState.call_count,
      terminal_operation_state: operation.payload.state,
    }));
  } finally {
    await stopServer(restarted.server);
  }
});

test("PEO-FIX-068-B rejects a fourth unknown retry at the HTTP claim boundary before the bank port", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const storage = createLocalStorageAdapter({ adapter_id: "postgres-payment-reconciliation-retry-cap-test" });
  const baseline = await importExportedPaymentBaseline(ledger);
  const bankState = { call_count: 0, requests: [] };
  const bankPort = createBankPort(bankState, { outcome: "unknown" });
  const server = await startServer(createAuthority({ fixture, ledger, storage, bankPort }));
  try {
    const first = await reconcile(
      server.base_url,
      server.step_up,
      baseline.payment_batch_id,
      {},
      "http-unknown-reconciliation-attempt-1",
    );
    const second = await retryFailed(
      server.base_url,
      server.step_up,
      baseline.payment_batch_id,
      {},
      "http-unknown-reconciliation-attempt-2",
    );
    const third = await retryFailed(
      server.base_url,
      server.step_up,
      baseline.payment_batch_id,
      {},
      "http-unknown-reconciliation-attempt-3",
    );
    assert.deepEqual(
      [first.status, second.status, third.status],
      [200, 200, 200],
      JSON.stringify([first.body, second.body, third.body]),
    );
    assert.equal(bankState.call_count, 3);

    const fourth = await retryFailed(
      server.base_url,
      server.step_up,
      baseline.payment_batch_id,
      {},
      "http-unknown-reconciliation-attempt-4",
    );
    assert.equal(fourth.status, 409, JSON.stringify(fourth.body));
    assert.equal(
      fourth.body.safe_error_code,
      "HRX_PROVIDER_RETRY_LIMIT_EXCEEDED",
      JSON.stringify(fourth.body),
    );
    assert.equal(bankState.call_count, 3);

    const records = await ledger.list({ tenant_id: TENANT, domain_id: "hrx" });
    const items = records.filter((record) =>
      record.record_type === "hrx_payroll_payment_items");
    const operations = records.filter((record) =>
      record.record_type === "hrx_payroll_provider_operations");
    assert.ok(items.every((record) =>
      record.payload.attempt_count === 3
        && record.payload.provider_result_state === "unknown"));
    assert.equal(operations.length, 3);
    t.diagnostic(JSON.stringify({
      scenario: "postgres_http_unknown_retry_cap_before_provider",
      successful_http_statuses: [first.status, second.status, third.status],
      fourth_http_status: fourth.status,
      fourth_safe_error_code: fourth.body.safe_error_code,
      bank_port_call_count_before_fourth: 3,
      bank_port_call_count_after_fourth: bankState.call_count,
      item_attempt_counts: items.map((record) => record.payload.attempt_count),
      provider_operation_count: operations.length,
    }));
  } finally {
    await stopServer(server.server);
  }
});
