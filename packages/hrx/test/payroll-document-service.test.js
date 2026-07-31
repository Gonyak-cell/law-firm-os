import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStorageAdapter } from "../../dms/src/storage/local-storage-adapter.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import {
  PAYROLL_STATEMENT_TEMPLATE_SCHEMA,
  PAYROLL_STATEMENT_TEMPLATE_VERSION,
  createEncryptedPayrollArtifactVault,
  createPayrollDocumentService,
} from "../src/payroll/document-service.js";
import { createPayrollDataHash, createPayrollRepository } from "../src/payroll/repository.js";
import { HRX_PROVIDER_RECEIPT_SCHEMA_VERSION } from "../src/provider-receipt-contract.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-payroll-document";
const NOW = "2026-07-15T04:00:00.000Z";
const PREPARER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-preparer" });
const APPROVER = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-approver" });
const HASH = "a".repeat(64);

function createRuntime({ clock = () => NOW } = {}) {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const hr = createSqlHrxRepository({ store, clock });
  for (const [employee_id, display_name] of [["emp-001", "Employee One"], ["emp-002", "Employee Two"]]) {
    hr.createEmployee({ tenant_id: TENANT, employee_id, display_name, status: "active" });
  }
  let sequence = 0;
  const repository = createPayrollRepository({ store, clock, idFactory: (prefix) => `${prefix}-${++sequence}` });
  let period = repository.createPeriod(PREPARER, { period_id: "period-2026-07", period_code: "2026-07", period_start: "2026-07-01", period_end: "2026-07-31", cutoff_at: NOW, pay_date: "2026-08-05" });
  period = repository.transitionPeriod(PREPARER, { period_id: period.period_id, status: "open", expected_version: period.state_version });
  let run = repository.createRun(PREPARER, { run_id: "run-2026-07", period_id: period.period_id });
  for (const [index, employeeId] of ["emp-001", "emp-002"].entries()) {
    const snapshot = repository.createInputSnapshot(PREPARER, { snapshot_id: `snapshot-${index + 1}`, run_id: run.run_id, employee_id: employeeId, source_refs: [{ kind: "attendance", ref: `artifact:attendance/${employeeId}`, hash: HASH }], payable_minutes: 9_600 });
    const gross = 4_000_000 + index * 1_000_000;
    const deduction = 500_000 + index * 100_000;
    const result = repository.createEmployeeResult(PREPARER, { result_id: `result-${index + 1}`, run_id: run.run_id, employee_id: employeeId, input_snapshot_id: snapshot.snapshot_id, gross_krw: gross, deduction_krw: deduction, net_krw: gross - deduction });
    repository.addLineItem(PREPARER, { result_id: result.result_id, item_kind: "earning", item_code: "BASE", formula_code: "MONTHLY_BASE_V1", amount_krw: gross });
    repository.addLineItem(PREPARER, { result_id: result.result_id, item_kind: "deduction", item_code: "SYNTHETIC_DEDUCTION", formula_code: "SYNTHETIC_DEDUCTION_V1", amount_krw: deduction });
  }
  const snapshots = repository.getRunBundle(PREPARER, { run_id: run.run_id }).snapshots;
  run = repository.transitionRun(PREPARER, { run_id: run.run_id, status: "snapshot_ready", snapshot_hash: createPayrollDataHash(snapshots), expected_version: run.state_version });
  run = repository.transitionRun(PREPARER, { run_id: run.run_id, status: "previewed", result_hash: createPayrollDataHash(repository.getRunBundle(PREPARER, { run_id: run.run_id }).results), expected_version: run.state_version });
  run = repository.transitionRun(APPROVER, { run_id: run.run_id, status: "approved", expected_version: run.state_version, step_up_receipt_ref: "artifact:step-up/payroll-document", step_up_receipt_hash: HASH });
  run = repository.transitionRun(APPROVER, { run_id: run.run_id, status: "closed", expected_version: run.state_version });
  let template = repository.createStatementTemplate(PREPARER, { template_id: "statement-template-v1", version_code: PAYROLL_STATEMENT_TEMPLATE_VERSION, schema: PAYROLL_STATEMENT_TEMPLATE_SCHEMA });
  template = repository.publishStatementTemplate(APPROVER, { template_id: template.template_id, expected_version: template.state_version });
  return { store, repository, run, template };
}

function providerDeliveryReceipt(request, state = "succeeded", deliveryState = null, {
  requestedAt = NOW,
  completedAt = requestedAt,
} = {}) {
  return {
    schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
    receipt_id: `receipt-${request.statement_id}`,
    tenant_id: request.tenant_id,
    provider_kind: "delivery",
    provider_id: "sandbox-payroll-delivery",
    operation: `statement.${request.channel}`,
    idempotency_key: request.idempotency_key,
    payload_hash: request.payload_hash,
    state,
    requested_at: requestedAt,
    completed_at: state === "pending" ? null : completedAt,
    provider_receipt_ref: state === "succeeded" ? `provider:sandbox/${request.statement_id}` : null,
    error_code: state === "failed" ? "SANDBOX_REJECTED" : null,
    ...(deliveryState ? { delivery_state: deliveryState } : {}),
  };
}

function sandboxDelivery(state = "succeeded", deliveryState = null) {
  return Object.freeze({
    async send(request) {
      return providerDeliveryReceipt(request, state, deliveryState);
    },
  });
}

test("PY-DOC-001/002 generates versioned encrypted PDF statements and regenerates the same bytes after storage restart", async () => {
  const { store, repository, run } = createRuntime();
  const storage = createLocalStorageAdapter({ adapter_id: "payroll-document-test" });
  const service = createPayrollDocumentService({ repository, store, artifactVault: createEncryptedPayrollArtifactVault({ storage, secret: "test-secret-material-with-at-least-32-bytes" }), clock: () => NOW });
  const generated = await service.generate(PREPARER, { run_id: run.run_id });
  assert.deepEqual([generated.statement_count, generated.generated_count], [2, 2]);
  assert.equal((await service.generate(PREPARER, { run_id: run.run_id })).generated_count, 0);
  const first = repository.getStatement(PREPARER, { statement_id: generated.statements[0].statement_id });
  assert.match(first.document_ref, /^vault:\/\/payroll-document-test\//);
  const encrypted = storage.getObject({ tenant_id: TENANT, object_id: `payroll/${run.run_id}/${first.employee_id}/${first.document_hash}.pdf` }).bytes.toString("utf8");
  assert.doesNotMatch(encrypted, /4000000|Employee One|%PDF/);
  assert.equal(repository.getStatementTemplate(PREPARER, { template_id: first.template_id }).status, "published");
  store.close();
});

test("PY-DOC-003 exports CSV/XLSX with totals equal to the closed run", async () => {
  const { store, repository, run } = createRuntime();
  const service = createPayrollDocumentService({ repository, store, clock: () => NOW });
  const csv = await service.exportRegister(PREPARER, { run_id: run.run_id, format: "csv" });
  const xlsx = await service.exportRegister(PREPARER, { run_id: run.run_id, format: "xlsx" });
  assert.deepEqual(csv.totals, { gross_krw: 9_000_000, deduction_krw: 1_100_000, net_krw: 7_900_000 });
  assert.deepEqual(xlsx.totals, csv.totals);
  assert.equal(csv.row_count, 2);
  assert.match(Buffer.from(csv.content_base64, "base64").toString("utf8"), /emp-001,Employee One,4000000,500000,3500000/);
  assert.equal(Buffer.from(xlsx.content_base64, "base64").subarray(0, 2).toString("utf8"), "PK");
  store.close();
});

test("PY-DOC-004/005 requires provider receipts, prevents cross-employee reads, and records self-service views", async () => {
  const { store, repository, run } = createRuntime();
  const pending = createPayrollDocumentService({ repository, store, deliveryPort: sandboxDelivery("pending"), clock: () => NOW });
  await pending.generate(PREPARER, { run_id: run.run_id });
  const queued = await pending.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  assert.equal(queued.delivered_count, 0);
  assert.ok(queued.receipts.every((row) => row.state === "queued"));
  const statusRequired = await pending.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  assert.equal(statusRequired.overall_state, "unknown");
  assert.ok(statusRequired.receipts.every((row) =>
    row.attempt_count === 1
      && row.provider_result_state === "unknown"
      && row.safe_error_code === "HRX_PAYROLL_PROVIDER_STATUS_REQUIRED"));

  const service = createPayrollDocumentService({ repository, store, deliveryPort: sandboxDelivery("succeeded"), clock: () => NOW });
  const delivered = await service.deliver(PREPARER, { run_id: run.run_id, channel: "self_service" });
  assert.equal(delivered.delivered_count, 2);
  const statements = service.selfList({ tenant_id: TENANT, actor_id: "employee-1" }, { employee_id: "emp-001" });
  assert.equal(statements.length, 1);
  const read = await service.read({ tenant_id: TENANT, actor_id: "employee-1" }, { employee_id: "emp-001", statement_id: statements[0].statement_id });
  assert.equal(Buffer.from(read.content_base64, "base64").subarray(0, 8).toString("utf8"), "%PDF-1.4");
  assert.equal(read.statement.state, "viewed");
  assert.ok(Date.parse(read.expires_at) > Date.parse(NOW));
  await assert.rejects(service.read({ tenant_id: TENANT, actor_id: "employee-2" }, { employee_id: "emp-002", statement_id: statements[0].statement_id }), (error) => error.safe_error_code === "HRX_PAYROLL_STATEMENT_NOT_FOUND" && error.status === 404);
  service.revoke(PREPARER, { statement_id: statements[0].statement_id });
  assert.equal(service.selfList({ tenant_id: TENANT, actor_id: "employee-1" }, { employee_id: "emp-001" }).length, 0);
  await assert.rejects(
    service.read({ tenant_id: TENANT, actor_id: "employee-1" }, { employee_id: "emp-001", statement_id: statements[0].statement_id }),
    (error) => error.safe_error_code === "HRX_PAYROLL_STATEMENT_NOT_FOUND" && error.status === 404,
  );
  store.close();
});

test("PEO-TUW-070 keeps provider acceptance separate from delivery and does not resend an accepted request", async () => {
  const { store, repository, run } = createRuntime();
  const calls = [];
  const service = createPayrollDocumentService({
    repository,
    store,
    deliveryPort: {
      async send(request) {
        calls.push(request);
        return providerDeliveryReceipt(request, "succeeded", "sent");
      },
    },
    clock: () => NOW,
  });
  await service.generate(PREPARER, { run_id: run.run_id });
  const accepted = await service.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  assert.deepEqual(
    [accepted.overall_state, accepted.sent_count, accepted.delivered_count, accepted.read_count, accepted.failed_count],
    ["sent", 2, 0, 0, 0],
  );
  assert.ok(accepted.receipts.every((receipt) => receipt.state === "queued" && receipt.provider_result_state === "sent" && receipt.attempt_count === 1));
  assert.ok(service.list(PREPARER, { run_id: run.run_id }).every((statement) => statement.state === "generated"));
  assert.equal(service.selfList({ tenant_id: TENANT, actor_id: "employee-1" }, { employee_id: "emp-001" }).length, 0);
  const replay = await service.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  assert.deepEqual([replay.sent_count, replay.retry_count, calls.length], [2, 0, 2]);
  assert.doesNotMatch(JSON.stringify(service.list(PREPARER, { run_id: run.run_id })), /4000000|5000000|3500000|4400000|account_number/);
  store.close();
});

test("PEO-TUW-070 retries only failed deliveries with the same idempotency key and preserves delivered rows", async () => {
  const { store, repository, run } = createRuntime();
  const calls = [];
  const attempts = new Map();
  const service = createPayrollDocumentService({
    repository,
    store,
    deliveryPort: {
      async send(request) {
        calls.push(request);
        const count = (attempts.get(request.statement_id) ?? 0) + 1;
        attempts.set(request.statement_id, count);
        if (request.employee_id === "emp-002" && count === 1) {
          return providerDeliveryReceipt(request, "failed", "failed");
        }
        return providerDeliveryReceipt(request, "succeeded", "delivered");
      },
    },
    clock: () => NOW,
  });
  const generated = await service.generate(PREPARER, { run_id: run.run_id });
  const first = await service.deliver(PREPARER, { run_id: run.run_id, channel: "message" });
  assert.deepEqual(
    [first.overall_state, first.delivered_count, first.failed_count, first.retry_count],
    ["partial", 1, 1, 0],
  );
  const deliveredBefore = first.receipts.find((receipt) => receipt.provider_result_state === "delivered");
  const failedBefore = first.receipts.find((receipt) => receipt.provider_result_state === "failed");
  assert.equal(failedBefore.safe_error_code, "HRX_PAYROLL_PROVIDER_REPORTED_FAILED");

  const second = await service.deliver(PREPARER, { run_id: run.run_id, channel: "message" });
  assert.deepEqual(
    [second.overall_state, second.delivered_count, second.failed_count, second.retry_count, calls.length],
    ["delivered", 2, 0, 1, 3],
  );
  const deliveredAfter = second.receipts.find((receipt) => receipt.delivery_receipt_id === deliveredBefore.delivery_receipt_id);
  const retriedAfter = second.receipts.find((receipt) => receipt.delivery_receipt_id === failedBefore.delivery_receipt_id);
  assert.deepEqual(
    [deliveredAfter.attempt_count, retriedAfter.attempt_count],
    [1, 2],
  );
  const failedCalls = calls.filter((request) => request.employee_id === "emp-002");
  assert.equal(failedCalls.length, 2);
  assert.equal(failedCalls[0].idempotency_key, failedCalls[1].idempotency_key);
  assert.equal(service.list(PREPARER, { run_id: run.run_id }).every((statement) => statement.state === "delivered"), true);

  const revokedId = generated.statements.find((statement) => statement.employee_id === "emp-001").statement_id;
  const revoked = service.revoke(PREPARER, { statement_id: revokedId });
  assert.equal(revoked.state, "revoked");
  assert.equal(revoked.delivery_receipts.every((receipt) => receipt.state === "revoked"), true);
  await assert.rejects(
    service.read({ tenant_id: TENANT, actor_id: "employee-1" }, { employee_id: "emp-001", statement_id: revokedId }),
    (error) => error.safe_error_code === "HRX_PAYROLL_STATEMENT_NOT_FOUND",
  );
  store.close();
});

test("PEO-TUW-070 isolates transport and receipt-contract failures per recipient with distinct safe codes", async () => {
  const { store, repository, run } = createRuntime();
  const calls = [];
  const attempts = new Map();
  const service = createPayrollDocumentService({
    repository,
    store,
    deliveryPort: {
      async send(request) {
        calls.push(request);
        const attempt = (attempts.get(request.employee_id) ?? 0) + 1;
        attempts.set(request.employee_id, attempt);
        if (request.employee_id === "emp-001" && attempt === 1) {
          throw new Error("private provider transport detail");
        }
        if (request.employee_id === "emp-001" && attempt === 2) return {};
        return providerDeliveryReceipt(request, "succeeded", "delivered");
      },
    },
    clock: () => NOW,
  });
  await service.generate(PREPARER, { run_id: run.run_id });

  const first = await service.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  assert.deepEqual(
    [first.overall_state, first.failed_count, first.delivered_count, calls.length],
    ["partial", 1, 1, 2],
  );
  const transportFailed = first.receipts.find((receipt) => receipt.provider_result_state === "failed");
  assert.deepEqual(
    [transportFailed.attempt_count, transportFailed.safe_error_code],
    [1, "HRX_PAYROLL_PROVIDER_REQUEST_FAILED"],
  );

  const second = await service.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  const contractFailed = second.receipts.find((receipt) =>
    receipt.delivery_receipt_id === transportFailed.delivery_receipt_id);
  assert.deepEqual(
    [
      second.overall_state,
      contractFailed.state,
      contractFailed.attempt_count,
      contractFailed.safe_error_code,
      calls.length,
    ],
    ["partial", "failed", 2, "HRX_PAYROLL_PROVIDER_RECEIPT_INVALID", 3],
  );

  const delivered = await service.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  const retried = delivered.receipts.find((receipt) =>
    receipt.delivery_receipt_id === transportFailed.delivery_receipt_id);
  assert.deepEqual(
    [delivered.overall_state, retried.state, retried.attempt_count, delivered.retry_count],
    ["delivered", "delivered", 3, 1],
  );
  const failedRecipientCalls = calls.filter((request) => request.employee_id === "emp-001");
  assert.equal(failedRecipientCalls.length, 3);
  assert.ok(failedRecipientCalls.every((request) =>
    request.idempotency_key === failedRecipientCalls[0].idempotency_key));
  assert.doesNotMatch(JSON.stringify(service.list(PREPARER, { run_id: run.run_id })), /private provider transport detail/);
  store.close();
});

test("PEO-TUW-070 polls pending provider receipts without sending again or consuming another attempt", async () => {
  const { store, repository, run } = createRuntime();
  const sendCalls = [];
  const statusCalls = [];
  const service = createPayrollDocumentService({
    repository,
    store,
    deliveryPort: {
      async send(request) {
        sendCalls.push(request);
        return providerDeliveryReceipt(request, "pending", "queued");
      },
      async status(request) {
        statusCalls.push(request);
        return providerDeliveryReceipt(request, "succeeded", "delivered");
      },
    },
    clock: () => NOW,
  });
  await service.generate(PREPARER, { run_id: run.run_id });

  const pending = await service.deliver(PREPARER, { run_id: run.run_id, channel: "message" });
  assert.deepEqual(
    [pending.overall_state, pending.queued_count, pending.retry_count],
    ["queued", 2, 0],
  );
  assert.ok(pending.receipts.every((receipt) => receipt.attempt_count === 1));

  const delivered = await service.deliver(PREPARER, { run_id: run.run_id, channel: "message" });
  assert.deepEqual(
    [
      delivered.overall_state,
      delivered.delivered_count,
      delivered.retry_count,
      sendCalls.length,
      statusCalls.length,
    ],
    ["delivered", 2, 0, 2, 2],
  );
  assert.ok(delivered.receipts.every((receipt) =>
    receipt.attempt_count === 1 && receipt.provider_receipt_id));
  assert.ok(statusCalls.every((request) => request.provider_receipt_id));
  store.close();
});

test("PEO-TUW-070 enforces the provider retry limit before calling the provider and keeps failure evidence intact", async () => {
  const { store, repository, run } = createRuntime();
  const calls = [];
  const service = createPayrollDocumentService({
    repository,
    store,
    deliveryPort: {
      async send(request) {
        calls.push(request);
        return providerDeliveryReceipt(request, "failed", "failed");
      },
    },
    clock: () => NOW,
  });
  await service.generate(PREPARER, { run_id: run.run_id });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const failed = await service.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
    assert.equal(failed.failed_count, 2);
    assert.ok(failed.receipts.every((receipt) => receipt.attempt_count === attempt));
  }
  const callsAtLimit = calls.length;
  const exhausted = await service.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  assert.deepEqual(
    [exhausted.overall_state, exhausted.failed_count, exhausted.retry_count],
    ["failed", 2, 0],
  );
  assert.equal(calls.length, callsAtLimit);
  assert.ok(repository.listDeliveryReceipts(PREPARER, { channel: "email" }).every((receipt) =>
    receipt.state === "failed"
      && receipt.attempt_count === 3
      && receipt.safe_error_code === "HRX_PAYROLL_PROVIDER_REPORTED_FAILED"));
  store.close();
});

test("PEO-TUW-070 external delivery kill switch is independent from the internal statement inbox", async () => {
  const { store, repository, run } = createRuntime();
  let providerCalls = 0;
  const service = createPayrollDocumentService({
    repository,
    store,
    providerDeliveryEnabled: false,
    deliveryPort: {
      async send(request) {
        providerCalls += 1;
        return providerDeliveryReceipt(request, "succeeded", "delivered");
      },
    },
    clock: () => NOW,
  });
  await service.generate(PREPARER, { run_id: run.run_id });
  await assert.rejects(
    service.deliver(PREPARER, { run_id: run.run_id, channel: "email" }),
    (error) => error.safe_error_code === "HRX_PAYROLL_STATEMENT_DELIVERY_DISABLED",
  );
  assert.equal(providerCalls, 0);
  const internal = await service.deliver(PREPARER, { run_id: run.run_id, channel: "self_service" });
  assert.deepEqual([internal.overall_state, internal.delivered_count], ["delivered", 2]);
  store.close();
});

test("PEO-TUW-070 signed provider events advance sent to delivered to read exactly once", async () => {
  const { store, repository, run } = createRuntime();
  const service = createPayrollDocumentService({
    repository,
    store,
    deliveryPort: sandboxDelivery("succeeded", "sent"),
    clock: () => NOW,
  });
  await service.generate(PREPARER, { run_id: run.run_id });
  const sent = await service.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  const target = sent.receipts.find((receipt) => receipt.statement_id === sent.receipts[0].statement_id) ?? sent.receipts[0];
  const deliveredInput = {
    provider_event_id: "provider-event-delivered-001",
    provider_id: target.provider_id,
    provider_receipt_ref: target.provider_receipt_ref,
    provider_event_state: "delivered",
    payload_hash: "d".repeat(64),
    event_occurred_at: "2026-07-15T13:01:00.000+09:00",
  };
  const delivered = service.ingestProviderStatus(
    { tenant_id: TENANT, actor_id: `provider:${target.provider_id}` },
    deliveredInput,
  );
  assert.deepEqual(
    [delivered.outcome, delivered.delivery_receipt.provider_result_state, delivered.statement.state],
    ["applied", "delivered", "delivered"],
  );
  assert.equal(delivered.payroll_amounts_included, false);
  assert.doesNotMatch(JSON.stringify(delivered), /gross|net_krw|deduction|employee_id/);

  const replay = service.ingestProviderStatus(
    { tenant_id: TENANT, actor_id: `provider:${target.provider_id}` },
    deliveredInput,
  );
  assert.deepEqual([replay.outcome, replay.replayed], ["replayed", true]);
  assert.throws(
    () => service.ingestProviderStatus(
      { tenant_id: TENANT, actor_id: `provider:${target.provider_id}` },
      { ...deliveredInput, payload_hash: "e".repeat(64) },
    ),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_CONFLICT" && error.status === 409,
  );
  assert.throws(
    () => service.ingestProviderStatus(
      { tenant_id: TENANT, actor_id: `provider:${target.provider_id}` },
      {
        ...deliveredInput,
        provider_event_id: "provider-event-read-stale-time",
        provider_event_state: "read",
        payload_hash: "0".repeat(64),
        event_occurred_at: "2026-07-15T04:00:30.000Z",
      },
    ),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER" && error.status === 409,
  );
  service.ingestProviderStatus(
    { tenant_id: TENANT, actor_id: `provider:${target.provider_id}` },
    {
      ...deliveredInput,
      provider_event_id: "provider-event-delivered-002",
      payload_hash: "9".repeat(64),
      event_occurred_at: "2026-07-15T03:02:00.000-01:00",
    },
  );
  assert.throws(
    () => service.ingestProviderStatus(
      { tenant_id: TENANT, actor_id: `provider:${target.provider_id}` },
      {
        ...deliveredInput,
        provider_event_id: "provider-event-read-offset-stale",
        provider_event_state: "read",
        payload_hash: "8".repeat(64),
        event_occurred_at: "2026-07-15T04:01:30.000Z",
      },
    ),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER" && error.status === 409,
  );

  const read = service.ingestProviderStatus(
    { tenant_id: TENANT, actor_id: `provider:${target.provider_id}` },
    {
      ...deliveredInput,
      provider_event_id: "provider-event-read-001",
      provider_event_state: "read",
      payload_hash: "f".repeat(64),
      event_occurred_at: "2026-07-15T04:03:00.000Z",
    },
  );
  assert.deepEqual(
    [read.delivery_receipt.provider_result_state, read.delivery_receipt.state, read.statement.state],
    ["read", "viewed", "viewed"],
  );
  assert.equal(repository.listDeliveryProviderEvents(PREPARER, {
    delivery_receipt_id: target.delivery_receipt_id,
  }).length, 3);
  const providerAudits = repository.listAuditEvents(PREPARER)
    .filter((event) => event.action.startsWith("hrx.payroll.delivery.provider_event."));
  assert.equal(providerAudits.length, 3);
  assert.ok(providerAudits.every((event) => JSON.parse(event.metadata_json).raw_payload_included === false));
  assert.throws(
    () => service.ingestProviderStatus(
      { tenant_id: TENANT, actor_id: `provider:${target.provider_id}` },
      {
        ...deliveredInput,
        provider_event_id: "provider-event-failed-after-read",
        provider_event_state: "failed",
        payload_hash: "7".repeat(64),
        event_occurred_at: "2026-07-15T04:04:00.000Z",
      },
    ),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER" && error.status === 409,
  );
  store.close();
});

test("PEO-TUW-070 applies an asynchronous provider failure exactly once and retries only that channel", async () => {
  const { store, repository, run } = createRuntime();
  const calls = [];
  const attempts = new Map();
  const service = createPayrollDocumentService({
    repository,
    store,
    deliveryPort: {
      async send(request) {
        calls.push(request);
        const attempt = (attempts.get(request.statement_id) ?? 0) + 1;
        attempts.set(request.statement_id, attempt);
        return providerDeliveryReceipt(
          request,
          "succeeded",
          attempt === 1 ? "sent" : "delivered",
        );
      },
    },
    clock: () => NOW,
  });
  await service.generate(PREPARER, { run_id: run.run_id });
  const sent = await service.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  const [target] = sent.receipts;
  await service.deliver(PREPARER, { run_id: run.run_id, channel: "self_service" });
  const statementBefore = repository.getStatement(PREPARER, { statement_id: target.statement_id });
  const selfBefore = repository.listDeliveryReceipts(PREPARER, {
    statement_id: target.statement_id,
    channel: "self_service",
  })[0];
  const failureInput = {
    provider_event_id: "provider-event-failed-async-001",
    provider_id: target.provider_id,
    provider_receipt_ref: target.provider_receipt_ref,
    provider_event_state: "failed",
    payload_hash: "6".repeat(64),
    event_occurred_at: "2026-07-15T04:01:00.000Z",
  };

  const failed = service.ingestProviderStatus(PREPARER, failureInput);
  assert.deepEqual(
    [
      failed.delivery_receipt.state,
      failed.delivery_receipt.provider_result_state,
      failed.delivery_receipt.safe_error_code,
      failed.delivery_receipt.attempt_count,
      failed.statement.state,
    ],
    ["failed", "failed", "HRX_PAYROLL_PROVIDER_REPORTED_FAILED", 1, statementBefore.state],
  );
  assert.equal(failed.delivery_receipt.failed_at, failureInput.event_occurred_at);
  assert.deepEqual(
    repository.listDeliveryReceipts(PREPARER, {
      statement_id: target.statement_id,
      channel: "self_service",
    })[0],
    selfBefore,
  );
  assert.equal(service.ingestProviderStatus(PREPARER, failureInput).outcome, "replayed");

  const retried = await service.deliver(PREPARER, { run_id: run.run_id, channel: "email" });
  const targetAfter = retried.receipts.find((receipt) => receipt.delivery_receipt_id === target.delivery_receipt_id);
  assert.deepEqual(
    [targetAfter.state, targetAfter.provider_result_state, targetAfter.attempt_count, retried.retry_count],
    ["delivered", "delivered", 2, 1],
  );
  const targetCalls = calls.filter((request) => request.statement_id === target.statement_id);
  assert.equal(targetCalls.length, 2);
  assert.equal(targetCalls[0].idempotency_key, targetCalls[1].idempotency_key);
  const oldFailureReplay = service.ingestProviderStatus(PREPARER, failureInput);
  assert.deepEqual(
    [
      oldFailureReplay.outcome,
      oldFailureReplay.delivery_receipt.state,
      oldFailureReplay.delivery_receipt.provider_result_state,
    ],
    ["replayed", "delivered", "delivered"],
  );
  assert.throws(
    () => service.ingestProviderStatus(PREPARER, {
      ...failureInput,
      provider_event_id: "provider-event-failed-after-delivered",
      payload_hash: "5".repeat(64),
      event_occurred_at: "2026-07-15T04:02:00.000Z",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER" && error.status === 409,
  );
  store.close();
});

test("PEO-TUW-070 compares callback time with the provider request start rather than the later local response time", async () => {
  const responseRecordedAt = "2026-07-15T04:00:10.000Z";
  const { store, repository, run } = createRuntime({ clock: () => responseRecordedAt });
  const service = createPayrollDocumentService({
    repository,
    store,
    deliveryPort: {
      async send(request) {
        return providerDeliveryReceipt(request, "succeeded", "sent", {
          requestedAt: NOW,
          completedAt: "2026-07-15T04:00:01.000Z",
        });
      },
    },
    clock: () => responseRecordedAt,
  });
  await service.generate(PREPARER, { run_id: run.run_id });
  const sent = await service.deliver(PREPARER, { run_id: run.run_id, channel: "message" });
  const [acceptedTarget, rejectedTarget] = sent.receipts;
  const persisted = repository.getDeliveryReceipt(PREPARER, {
    delivery_receipt_id: acceptedTarget.delivery_receipt_id,
  });
  assert.deepEqual(
    [persisted.attempt_started_at, persisted.last_attempt_at],
    [NOW, responseRecordedAt],
  );

  const accepted = service.ingestProviderStatus(PREPARER, {
    provider_event_id: "provider-event-after-request-before-response",
    provider_id: acceptedTarget.provider_id,
    provider_receipt_ref: acceptedTarget.provider_receipt_ref,
    provider_event_state: "delivered",
    payload_hash: "4".repeat(64),
    event_occurred_at: "2026-07-15T04:00:05.000Z",
  });
  assert.equal(accepted.delivery_receipt.provider_result_state, "delivered");
  assert.throws(
    () => service.ingestProviderStatus(PREPARER, {
      provider_event_id: "provider-event-before-request",
      provider_id: rejectedTarget.provider_id,
      provider_receipt_ref: rejectedTarget.provider_receipt_ref,
      provider_event_state: "delivered",
      payload_hash: "3".repeat(64),
      event_occurred_at: "2026-07-15T03:59:59.999Z",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER" && error.status === 409,
  );
  store.close();
});

test("PEO-TUW-070 provider event ingestion rejects cross-tenant, wrong-provider, unknown, out-of-order, and revoked transitions", async () => {
  const { store, repository, run } = createRuntime();
  const service = createPayrollDocumentService({
    repository,
    store,
    deliveryPort: sandboxDelivery("succeeded", "sent"),
    clock: () => NOW,
  });
  await service.generate(PREPARER, { run_id: run.run_id });
  const sent = await service.deliver(PREPARER, { run_id: run.run_id, channel: "message" });
  const [first, second] = sent.receipts;
  const base = {
    provider_event_id: "provider-event-negative-001",
    provider_id: first.provider_id,
    provider_receipt_ref: first.provider_receipt_ref,
    provider_event_state: "delivered",
    payload_hash: "1".repeat(64),
    event_occurred_at: "2026-07-15T04:03:00.000Z",
  };
  assert.throws(
    () => service.ingestProviderStatus({ tenant_id: "tenant-other", actor_id: "provider:sandbox-payroll-delivery" }, base),
    (error) => error.safe_error_code === "HRX_PAYROLL_NOT_FOUND" && error.status === 404,
  );
  assert.throws(
    () => service.ingestProviderStatus(PREPARER, { ...base, provider_id: "other-delivery-provider" }),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_ID_MISMATCH" && error.status === 403,
  );
  assert.throws(
    () => service.ingestProviderStatus(PREPARER, { ...base, provider_event_state: "unknown" }),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_STATE_UNKNOWN" && error.status === 400,
  );
  assert.throws(
    () => service.ingestProviderStatus(PREPARER, {
      ...base,
      provider_event_id: "provider-event-before-send",
      event_occurred_at: "2026-07-15T03:59:59.999Z",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER" && error.status === 409,
  );
  assert.throws(
    () => service.ingestProviderStatus(PREPARER, {
      ...base,
      provider_event_id: "provider-event-future-time",
      event_occurred_at: "2099-01-01T00:00:00.000Z",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_TIME_INVALID" && error.status === 409,
  );
  assert.throws(
    () => service.ingestProviderStatus(PREPARER, {
      ...base,
      provider_event_id: "provider-event-read-too-early",
      provider_receipt_ref: second.provider_receipt_ref,
      provider_event_state: "read",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER" && error.status === 409,
  );

  service.ingestProviderStatus(PREPARER, base);
  assert.throws(
    () => service.ingestProviderStatus(PREPARER, {
      ...base,
      provider_event_id: "provider-event-regression",
      provider_event_state: "sent",
      payload_hash: "2".repeat(64),
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER" && error.status === 409,
  );
  service.revoke(PREPARER, { statement_id: first.statement_id });
  assert.throws(
    () => service.ingestProviderStatus(PREPARER, {
      ...base,
      provider_event_id: "provider-event-after-revoke",
      provider_event_state: "read",
      payload_hash: "3".repeat(64),
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_DELIVERY_REVOKED" && error.status === 409,
  );
  assert.equal(repository.listDeliveryProviderEvents(PREPARER).length, 1);
  store.close();
});
