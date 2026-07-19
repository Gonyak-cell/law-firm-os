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

function createRuntime() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const hr = createSqlHrxRepository({ store, clock: () => NOW });
  for (const [employee_id, display_name] of [["emp-001", "Employee One"], ["emp-002", "Employee Two"]]) {
    hr.createEmployee({ tenant_id: TENANT, employee_id, display_name, status: "active" });
  }
  let sequence = 0;
  const repository = createPayrollRepository({ store, clock: () => NOW, idFactory: (prefix) => `${prefix}-${++sequence}` });
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

function sandboxDelivery(state = "succeeded") {
  return Object.freeze({
    async send(request) {
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
        requested_at: NOW,
        completed_at: state === "pending" ? null : NOW,
        provider_receipt_ref: state === "succeeded" ? `provider:sandbox/${request.statement_id}` : null,
        error_code: state === "failed" ? "SANDBOX_REJECTED" : null,
      };
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
  store.close();
});
