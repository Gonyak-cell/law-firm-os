import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../../../packages/dms/src/storage/local-storage-adapter.js";
import { createPostgresDmsUploadRuntime } from "../../../../packages/dms/src/postgres-upload-runtime.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createSqlHrxRepository } from "../../../../packages/hrx/src/repository-sql.js";
import { createHrxDomainSnapshot } from "../../../../packages/hrx/src/postgres-store-v2.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { createPostgresDomainLedger } from "../../../../packages/persistence/src/postgres/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  createHrxPayrollRuntime,
  seedSyntheticPayrollRuntimeStore,
} from "../../src/hrx-payroll-runtime.js";
import {
  PAYROLL_STATEMENT_PROVIDER_CALLBACK_PATH,
  PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER,
} from "../../src/routes/hrx/payroll-statement-provider-callback.js";
import { createPostgresApiRuntimeAuthority } from "../../src/postgres-api-runtime-authority.js";
import { createApiServer } from "../../src/server.js";

const TENANT = "tenant-payroll-provider-callback-postgres";
const NOW = "2026-07-15T04:00:00.000Z";
const PROVIDER_ID = "lawos-delivery-sandbox";
const PAYROLL_ARTIFACT_SECRET = "postgres-payroll-provider-callback-test-secret";

async function importSentStatementBaseline(ledger) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    const repository = createSqlHrxRepository({ store, clock: () => NOW });
    repository.createEmployee({
      tenant_id: TENANT,
      employee_id: "provider-postgres-employee",
      display_name: "Provider PostgreSQL Employee",
      status: "active",
    });
    repository.createEmploymentProfile({
      tenant_id: TENANT,
      profile_id: "provider-postgres-profile",
      employee_id: "provider-postgres-employee",
      employment_type: "full_time",
      status: "active",
      title: "변호사",
      effective_from: "2026-01-01",
    });
    seedSyntheticPayrollRuntimeStore(store, [TENANT], { clock: () => NOW });
    const runtime = createHrxPayrollRuntime({ store, clock: () => NOW });
    const preparer = { tenant_id: TENANT, actor_id: "payroll-preparer" };
    const approver = { tenant_id: TENANT, actor_id: "payroll-approver" };
    const run = runtime.payrollRepository.listRuns(preparer)[0];
    runtime.inputSnapshotService.capture(preparer, { run_id: run.run_id });
    runtime.runService.preview(preparer, { run_id: run.run_id });
    const previewed = runtime.payrollRepository.getRun(preparer, { run_id: run.run_id });
    runtime.payrollRepository.transitionRun(approver, {
      run_id: run.run_id,
      status: "approved",
      expected_version: previewed.state_version,
      step_up_receipt_ref: "artifact:step-up/provider-postgres-callback-test",
      step_up_receipt_hash: "a".repeat(64),
    });
    const approved = runtime.payrollRepository.getRun(preparer, { run_id: run.run_id });
    runtime.payrollRepository.transitionRun(approver, {
      run_id: run.run_id,
      status: "closed",
      expected_version: approved.state_version,
    });
    await runtime.documentService.generate(preparer, { run_id: run.run_id });
    const emailDelivery = await runtime.documentService.deliver(preparer, {
      run_id: run.run_id,
      channel: "email",
    });
    const messageDelivery = await runtime.documentService.deliver(preparer, {
      run_id: run.run_id,
      channel: "message",
    });
    const [receipt] = emailDelivery.receipts;
    const [messageReceipt] = messageDelivery.receipts;
    assert.deepEqual(
      [
        receipt.provider_id,
        receipt.provider_result_state,
        messageReceipt.provider_id,
        messageReceipt.provider_result_state,
      ],
      [PROVIDER_ID, "sent", PROVIDER_ID, "sent"],
    );
    await ledger.importSnapshot(createHrxDomainSnapshot({
      store,
      tenant_id: TENANT,
    }).snapshot);
    return Object.freeze({
      run_id: run.run_id,
      statement_id: receipt.statement_id,
      delivery_receipt_id: receipt.delivery_receipt_id,
      provider_receipt_ref: receipt.provider_receipt_ref,
      failed_delivery_receipt_id: messageReceipt.delivery_receipt_id,
      failed_provider_receipt_ref: messageReceipt.provider_receipt_ref,
    });
  } finally {
    store.close();
  }
}

function createAuthority({ fixture, ledger, storage }) {
  return createPostgresApiRuntimeAuthority({
    ledger,
    dmsStorage: storage,
    dmsUploadRuntime: createPostgresDmsUploadRuntime({
      pool: fixture.appPool,
      storage,
      sourceOnly: false,
    }),
    payrollArtifactSecret: PAYROLL_ARTIFACT_SECRET,
  });
}

async function startCallbackServer(authority) {
  const authorityState = { run_count: 0 };
  const measuredAuthority = Object.freeze({
    ...authority,
    async run(input) {
      authorityState.run_count += 1;
      return authority.run(input);
    },
  });
  const verifier = Object.freeze({
    async verify(input) {
      return input.headers["x-provider-signature"] === "valid-postgres-signature"
        ? { ok: true, tenant_id: TENANT, provider_id: PROVIDER_ID }
        : { ok: false };
    },
  });
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
    requestRuntimeAuthority: measuredAuthority,
    payrollStatementProviderVerifier: verifier,
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return Object.freeze({
    server,
    base_url: `http://127.0.0.1:${server.address().port}`,
    authority_run_count: () => authorityState.run_count,
  });
}

async function stopServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

async function postCallback(baseUrl, body, { signature = "valid-postgres-signature" } = {}) {
  const response = await fetch(`${baseUrl}${PAYROLL_STATEMENT_PROVIDER_CALLBACK_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      [PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER]: TENANT,
      "x-provider-signature": signature,
    },
    body: JSON.stringify(body),
  });
  return Object.freeze({
    status: response.status,
    body: await response.json(),
  });
}

function eventBody({
  provider_event_id,
  provider_receipt_ref,
  provider_event_state,
  event_occurred_at,
}) {
  return {
    tenant_id: TENANT,
    event: {
      provider_event_id,
      provider_receipt_ref,
      provider_event_state,
      event_occurred_at,
    },
  };
}

test("PEO-TUW-070 PostgreSQL callback survives rematerialization and preserves replay/conflict/order rules", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  const storage = createLocalStorageAdapter({
    adapter_id: "postgres-payroll-provider-callback-test",
  });
  const baseline = await importSentStatementBaseline(ledger);
  const deliveredEvent = eventBody({
    provider_event_id: "postgres-provider-event-delivered-001",
    provider_receipt_ref: baseline.provider_receipt_ref,
    provider_event_state: "delivered",
    event_occurred_at: "2026-07-15T04:05:00.000Z",
  });
  const failedEvent = eventBody({
    provider_event_id: "postgres-provider-event-failed-001",
    provider_receipt_ref: baseline.failed_provider_receipt_ref,
    provider_event_state: "failed",
    event_occurred_at: "2026-07-15T04:05:30.000Z",
  });

  const firstAuthority = createAuthority({ fixture, ledger, storage });
  const firstServer = await startCallbackServer(firstAuthority);
  try {
    const invalidSignature = await postCallback(firstServer.base_url, deliveredEvent, {
      signature: "invalid-postgres-signature",
    });
    assert.deepEqual(
      [invalidSignature.status, invalidSignature.body.safe_error_code, firstServer.authority_run_count()],
      [401, "HRX_PAYROLL_PROVIDER_SIGNATURE_INVALID", 0],
    );
    const concurrent = await Promise.all([
      postCallback(firstServer.base_url, deliveredEvent),
      postCallback(firstServer.base_url, deliveredEvent),
    ]);
    assert.deepEqual(
      concurrent.map((result) => result.status).sort(),
      [200, 200],
      JSON.stringify(concurrent.map((result) => result.body)),
    );
    assert.deepEqual(
      concurrent.map((result) => result.body.outcome).sort(),
      ["applied", "replayed"],
    );
    assert.ok(concurrent.every((result) => result.body.delivery_receipt.provider_result_state === "delivered"));
    assert.equal(firstServer.authority_run_count(), 2);
    const failed = await postCallback(firstServer.base_url, failedEvent);
    assert.equal(failed.status, 200, JSON.stringify(failed.body));
    assert.deepEqual(
      [
        failed.body.outcome,
        failed.body.delivery_receipt.state,
        failed.body.delivery_receipt.provider_result_state,
        failed.body.delivery_receipt.safe_error_code,
        failed.body.delivery_receipt.attempt_count,
      ],
      ["applied", "failed", "failed", "HRX_PAYROLL_PROVIDER_REPORTED_FAILED", 1],
    );
    assert.equal(firstServer.authority_run_count(), 3);
  } finally {
    await stopServer(firstServer.server);
  }

  const restartedAuthority = createAuthority({ fixture, ledger, storage });
  const restartedServer = await startCallbackServer(restartedAuthority);
  try {
    const replayed = await postCallback(restartedServer.base_url, deliveredEvent);
    assert.equal(replayed.status, 200, JSON.stringify(replayed.body));
    assert.deepEqual(
      [
        replayed.status,
        replayed.body.outcome,
        replayed.body.replayed,
        replayed.body.delivery_receipt.provider_result_state,
      ],
      [200, "replayed", true, "delivered"],
    );
    const failedReplay = await postCallback(restartedServer.base_url, failedEvent);
    assert.equal(failedReplay.status, 200, JSON.stringify(failedReplay.body));
    assert.deepEqual(
      [
        failedReplay.body.outcome,
        failedReplay.body.replayed,
        failedReplay.body.delivery_receipt.state,
        failedReplay.body.delivery_receipt.safe_error_code,
      ],
      ["replayed", true, "failed", "HRX_PAYROLL_PROVIDER_REPORTED_FAILED"],
    );

    const conflictingEventId = await postCallback(
      restartedServer.base_url,
      eventBody({
        provider_event_id: deliveredEvent.event.provider_event_id,
        provider_receipt_ref: baseline.provider_receipt_ref,
        provider_event_state: "delivered",
        event_occurred_at: "2026-07-15T04:05:01.000Z",
      }),
    );
    assert.deepEqual(
      [conflictingEventId.status, conflictingEventId.body.safe_error_code],
      [409, "HRX_PAYROLL_PROVIDER_EVENT_CONFLICT"],
    );

    const regressed = await postCallback(
      restartedServer.base_url,
      eventBody({
        provider_event_id: "postgres-provider-event-regression-001",
        provider_receipt_ref: baseline.provider_receipt_ref,
        provider_event_state: "accepted",
        event_occurred_at: "2026-07-15T04:06:00.000Z",
      }),
    );
    assert.deepEqual(
      [regressed.status, regressed.body.safe_error_code],
      [409, "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER"],
    );

    const read = await postCallback(
      restartedServer.base_url,
      eventBody({
        provider_event_id: "postgres-provider-event-read-001",
        provider_receipt_ref: baseline.provider_receipt_ref,
        provider_event_state: "read",
        event_occurred_at: "2026-07-15T04:07:00.000Z",
      }),
    );
    assert.equal(read.status, 200, JSON.stringify(read.body));
    assert.deepEqual(
      [
        read.status,
        read.body.outcome,
        read.body.delivery_receipt.provider_result_state,
      ],
      [200, "applied", "read"],
    );
  } finally {
    await stopServer(restartedServer.server);
  }

  const rematerializedAuthority = createAuthority({ fixture, ledger, storage });
  const persisted = await rematerializedAuthority.run({
    tenant_id: TENANT,
    request_context: {
      method: "GET",
      pathname: "/api/hrx/payroll/provider-callbacks/statement-delivery/persistence-check",
    },
    command(runtimes) {
      const context = { tenant_id: TENANT, actor_id: "persistence-check" };
      return {
        events: runtimes.hrxRuntime.payrollRuntime.payrollRepository
          .listDeliveryProviderEvents(context, {
            delivery_receipt_id: baseline.delivery_receipt_id,
          }),
        receipt: runtimes.hrxRuntime.payrollRuntime.payrollRepository
          .getDeliveryReceipt(context, {
            delivery_receipt_id: baseline.delivery_receipt_id,
          }),
        statement: runtimes.hrxRuntime.payrollRuntime.payrollRepository
          .getStatement(context, {
            statement_id: baseline.statement_id,
          }),
        failed_events: runtimes.hrxRuntime.payrollRuntime.payrollRepository
          .listDeliveryProviderEvents(context, {
            delivery_receipt_id: baseline.failed_delivery_receipt_id,
          }),
        failed_receipt: runtimes.hrxRuntime.payrollRuntime.payrollRepository
          .getDeliveryReceipt(context, {
            delivery_receipt_id: baseline.failed_delivery_receipt_id,
          }),
      };
    },
  });
  assert.deepEqual(
    persisted.events.map((event) => [
      event.provider_event_id,
      event.provider_event_state,
    ]),
    [
      ["postgres-provider-event-delivered-001", "delivered"],
      ["postgres-provider-event-read-001", "read"],
    ],
  );
  assert.deepEqual(
    [
      persisted.receipt.state,
      persisted.receipt.provider_result_state,
      persisted.statement.state,
    ],
    ["viewed", "read", "viewed"],
  );
  assert.deepEqual(
    persisted.failed_events.map((event) => [
      event.provider_event_id,
      event.provider_event_state,
    ]),
    [["postgres-provider-event-failed-001", "failed"]],
  );
  assert.deepEqual(
    [
      persisted.failed_receipt.state,
      persisted.failed_receipt.provider_result_state,
      persisted.failed_receipt.safe_error_code,
      persisted.failed_receipt.attempt_count,
      persisted.statement.state,
    ],
    ["failed", "failed", "HRX_PAYROLL_PROVIDER_REPORTED_FAILED", 1, "viewed"],
  );
});
