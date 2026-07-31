import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { renderSimpleTextPdf } from "../../../billing/src/invoice-pdf-service.js";
import { createLocalStorageAdapter } from "../../../dms/src/storage/local-storage-adapter.js";
import {
  assertHrxProviderReceiptForOperation,
  createHrxSandboxProviderOperationBoundary,
} from "../provider-receipt-contract.js";
import { createXlsxBuffer } from "../leave/xlsx-export.js";

export const PAYROLL_STATEMENT_TEMPLATE_VERSION = "forest-payroll-statement-v1";
export const PAYROLL_STATEMENT_TEMPLATE_SCHEMA = Object.freeze({
  schema_version: "law-firm-os.hrx.payroll-statement.v0.1",
  fields: Object.freeze(["company", "period", "employee", "earnings", "deductions", "gross", "net", "pay_date"]),
  currency: "KRW",
  immutable_after_publish: true,
});

const CSV_HEADERS = Object.freeze(["period", "employee_id", "employee", "gross_krw", "deduction_krw", "net_krw"]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function safeError(message, code, status = 400) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = status;
  return error;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function createEncryptedPayrollArtifactVault({
  storage = createLocalStorageAdapter({ adapter_id: "hrx-payroll-vault" }),
  secret,
  allowSyntheticSecret = false,
} = {}) {
  const keyMaterial = secret ?? (allowSyntheticSecret ? randomBytes(32) : null);
  if (!(typeof keyMaterial === "string" || Buffer.isBuffer(keyMaterial)) || Buffer.byteLength(keyMaterial) < 32) {
    throw new TypeError("payroll artifact encryption requires at least 32 bytes of injected secret material");
  }
  if (!["putObject", "getObject", "statObject"].every((method) => typeof storage?.[method] === "function")) {
    throw new TypeError("payroll artifact storage must support putObject, getObject, and statObject");
  }
  const key = createHash("sha256").update(keyMaterial).digest();
  return Object.freeze({
    async put({ tenant_id, object_id, bytes, content_type }) {
      const plain = Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(bytes ?? "");
      const iv = randomBytes(12);
      const aad = Buffer.from(`${tenant_id}:${object_id}`, "utf8");
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(aad);
      const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
      const encrypted = Buffer.from(JSON.stringify({
        schema_version: "law-firm-os.hrx.payroll-artifact-envelope.v0.1",
        iv: iv.toString("base64url"),
        tag: cipher.getAuthTag().toString("base64url"),
        ciphertext: ciphertext.toString("base64url"),
      }), "utf8");
      const receipt = await storage.putObject({ tenant_id, object_id, bytes: encrypted, content_type: "application/vnd.law-firm-os.encrypted+json" });
      return Object.freeze({ document_ref: receipt.storage_pointer_ref, document_hash: hash(plain), byte_size: plain.byteLength, content_type });
    },
    async get({ tenant_id, object_id }) {
      const stored = await storage.getObject({ tenant_id, object_id });
      const envelope = JSON.parse(stored.bytes.toString("utf8"));
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64url"));
      decipher.setAAD(Buffer.from(`${tenant_id}:${object_id}`, "utf8"));
      decipher.setAuthTag(Buffer.from(envelope.tag, "base64url"));
      return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64url")), decipher.final()]);
    },
    async stat({ tenant_id, object_id }) {
      return storage.statObject({ tenant_id, object_id });
    },
  });
}

function statementObjectId(statement) {
  return `payroll/${statement.run_id}/${statement.employee_id}/${statement.document_hash}.pdf`;
}

function deliveryReceiptView(receipt, { includeProviderEvidence = false } = {}) {
  return Object.freeze({
    delivery_receipt_id: receipt.delivery_receipt_id,
    statement_id: receipt.statement_id,
    channel: receipt.channel,
    state: receipt.state,
    provider_result_state: receipt.provider_result_state ?? "queued",
    provider_id: includeProviderEvidence ? receipt.provider_id ?? null : null,
    provider_receipt_id: includeProviderEvidence ? receipt.provider_receipt_id ?? null : null,
    safe_error_code: includeProviderEvidence ? receipt.safe_error_code ?? null : null,
    attempt_count: receipt.attempt_count ?? 0,
    provider_receipt_ref: includeProviderEvidence ? receipt.provider_receipt_ref ?? null : null,
    created_at: receipt.created_at,
    last_attempt_at: receipt.last_attempt_at ?? null,
    delivered_at: receipt.delivered_at,
    viewed_at: receipt.viewed_at,
    failed_at: receipt.failed_at,
  });
}

function statementView(statement, { deliveryReceipts = [], includeProviderEvidence = false } = {}) {
  return Object.freeze({
    statement_id: statement.statement_id,
    run_id: statement.run_id,
    employee_id: statement.employee_id,
    template_id: statement.template_id,
    document_hash: statement.document_hash,
    state: statement.state,
    state_version: statement.state_version,
    generated_at: statement.generated_at,
    delivered_at: statement.delivered_at,
    viewed_at: statement.viewed_at,
    revoked_at: statement.revoked_at,
    delivery_receipts: Object.freeze(deliveryReceipts.map((receipt) => deliveryReceiptView(receipt, {
      includeProviderEvidence,
    }))),
  });
}

export function createPayrollDocumentService({
  repository,
  store,
  artifactVault = createEncryptedPayrollArtifactVault({ allowSyntheticSecret: true }),
  deliveryPort = null,
  providerBoundary = createHrxSandboxProviderOperationBoundary("delivery"),
  providerDeliveryEnabled = true,
  clock = () => new Date().toISOString(),
} = {}) {
  if (!repository || !store) throw new TypeError("payroll document service requires repository and store");

  function requireClosedBundle(context, runId) {
    const bundle = repository.getRunBundle(context, { run_id: runId });
    if (!bundle) throw safeError("Payroll run not found", "HRX_PAYROLL_NOT_FOUND", 404);
    if (bundle.run.status !== "closed") throw safeError("Closed payroll run is required", "HRX_PAYROLL_RUN_NOT_CLOSED", 409);
    return bundle;
  }

  function render(context, runId, employeeId) {
    const bundle = requireClosedBundle(context, runId);
    const result = bundle.results.find((row) => row.employee_id === employeeId);
    if (!result) throw safeError("Payroll statement not found", "HRX_PAYROLL_STATEMENT_NOT_FOUND", 404);
    const period = repository.getPeriod(context, { period_id: bundle.run.period_id });
    const employee = store.query("selectOne", { table: "hrx_employees", where: { tenant_id: context.tenant_id, employee_id: employeeId } });
    const items = bundle.line_items.filter((row) => row.result_id === result.result_id);
    const bytes = renderSimpleTextPdf([
      "Law Firm OS Payroll Statement",
      `Period: ${period.period_code}`,
      `Employee: ${employee?.display_name ?? employeeId} (${employeeId})`,
      `Pay date: ${period.pay_date}`,
      `Gross KRW: ${result.gross_krw}`,
      ...items.filter((row) => row.item_kind === "earning").map((row) => `Earning ${row.item_code}: ${row.amount_krw}`),
      ...items.filter((row) => row.item_kind === "deduction").map((row) => `Deduction ${row.item_code}: ${row.amount_krw}`),
      `Deductions KRW: ${result.deduction_krw}`,
      `Net KRW: ${result.net_krw}`,
      `Run: ${bundle.run.run_id}`,
    ]);
    return Object.freeze({ bytes, document_hash: hash(bytes), bundle, period, result, employee, items });
  }

  async function generate(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const bundle = requireClosedBundle(context, runId);
    const templates = repository.listStatementTemplates(context, { status: "published" });
    const template = input.template_id
      ? repository.getStatementTemplate(context, { template_id: input.template_id })
      : templates[0];
    if (!template || template.status !== "published") throw safeError("Published payroll statement template is required", "HRX_PAYROLL_TEMPLATE_STATE_INVALID", 409);
    const existing = new Map(repository.listStatements(context, { run_id: runId }).map((row) => [row.employee_id, row]));
    const statements = [];
    for (const result of bundle.results) {
      if (existing.has(result.employee_id)) {
        statements.push(existing.get(result.employee_id));
        continue;
      }
      const rendered = render(context, runId, result.employee_id);
      const artifact = await artifactVault.put({
        tenant_id: context.tenant_id,
        object_id: `payroll/${runId}/${result.employee_id}/${rendered.document_hash}.pdf`,
        bytes: rendered.bytes,
        content_type: "application/pdf",
      });
      statements.push(repository.createStatement(context, {
        run_id: runId,
        employee_id: result.employee_id,
        template_id: template.template_id,
        document_ref: artifact.document_ref,
        document_hash: rendered.document_hash,
        generated_at: bundle.run.closed_at ?? clock(),
      }));
    }
    return Object.freeze({
      run_id: runId,
      template_id: template.template_id,
      generated_count: statements.length - existing.size,
      statement_count: statements.length,
      statements: Object.freeze(statements.map((statement) => statementView(statement))),
      production_ready_claim: false,
    });
  }

  function list(context, input = {}) {
    return Object.freeze(repository.listStatements(context, input).map((statement) => statementView(statement, {
      deliveryReceipts: repository.listDeliveryReceipts(context, { statement_id: statement.statement_id }),
      includeProviderEvidence: true,
    })));
  }

  async function exportRegister(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const format = requiredString(input, "format").toLowerCase();
    if (!["csv", "xlsx"].includes(format)) throw new TypeError("format must be csv or xlsx");
    const bundle = requireClosedBundle(context, runId);
    const period = repository.getPeriod(context, { period_id: bundle.run.period_id });
    const employees = new Map(store.query("select", { table: "hrx_employees", where: { tenant_id: context.tenant_id } }).map((row) => [row.employee_id, row]));
    const rows = bundle.results.map((result) => [
      period.period_code,
      result.employee_id,
      employees.get(result.employee_id)?.display_name ?? result.employee_id,
      result.gross_krw,
      result.deduction_krw,
      result.net_krw,
    ]);
    const bytes = format === "csv"
      ? Buffer.from(`\uFEFF${[CSV_HEADERS, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`, "utf8")
      : createXlsxBuffer({ headers: CSV_HEADERS, rows, sheetName: "급여대장" });
    const totals = bundle.results.reduce((sum, row) => ({ gross_krw: sum.gross_krw + row.gross_krw, deduction_krw: sum.deduction_krw + row.deduction_krw, net_krw: sum.net_krw + row.net_krw }), { gross_krw: 0, deduction_krw: 0, net_krw: 0 });
    const artifactHash = hash(bytes);
    const artifact = await artifactVault.put({ tenant_id: context.tenant_id, object_id: `payroll/${runId}/register-${artifactHash}.${format}`, bytes, content_type: format === "csv" ? "text/csv;charset=utf-8" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return Object.freeze({
      run_id: runId,
      format,
      filename: `${period.period_code}-payroll-register.${format}`,
      mime_type: artifact.content_type,
      sha256: artifactHash,
      row_count: rows.length,
      totals: Object.freeze(totals),
      content_base64: bytes.toString("base64"),
      production_ready_claim: false,
    });
  }

  function applyDeliveryProviderReceipt(context, statement, receipt, providerReceipt, {
    providerStatusPoll = false,
  } = {}) {
    const providerEvidence = {
      expected_version: receipt.state_version,
      provider_id: providerReceipt.provider_id,
      provider_receipt_id: providerReceipt.receipt_id,
      attempt_started_at: providerReceipt.requested_at,
      provider_status_poll: providerStatusPoll,
    };
    if (providerReceipt.state === "succeeded" && providerReceipt.delivery_state === "sent") {
      receipt = repository.recordDeliveryProviderResult(context, {
        delivery_receipt_id: receipt.delivery_receipt_id,
        provider_result_state: "sent",
        provider_receipt_ref: providerReceipt.provider_receipt_ref,
        receipt_hash: providerReceipt.payload_hash.slice(7),
        ...providerEvidence,
      });
    } else if (providerReceipt.state === "succeeded") {
      receipt = repository.transitionDeliveryReceipt(context, {
        delivery_receipt_id: receipt.delivery_receipt_id,
        state: "delivered",
        provider_receipt_ref: providerReceipt.provider_receipt_ref,
        receipt_hash: providerReceipt.payload_hash.slice(7),
        ...providerEvidence,
      });
      if (statement.state === "generated") {
        statement = repository.transitionStatement(context, {
          statement_id: statement.statement_id,
          state: "delivered",
          expected_version: statement.state_version,
        });
      }
      if (providerReceipt.delivery_state === "read") {
        receipt = repository.transitionDeliveryReceipt(context, {
          delivery_receipt_id: receipt.delivery_receipt_id,
          state: "viewed",
          expected_version: receipt.state_version,
        });
        if (statement.state === "delivered") {
          statement = repository.transitionStatement(context, {
            statement_id: statement.statement_id,
            state: "viewed",
            expected_version: statement.state_version,
          });
        }
      }
    } else if (providerReceipt.state === "failed") {
      receipt = repository.transitionDeliveryReceipt(context, {
        delivery_receipt_id: receipt.delivery_receipt_id,
        state: "failed",
        safe_error_code: "HRX_PAYROLL_PROVIDER_REPORTED_FAILED",
        ...providerEvidence,
      });
    } else {
      receipt = repository.recordDeliveryProviderResult(context, {
        delivery_receipt_id: receipt.delivery_receipt_id,
        provider_result_state: providerReceipt.delivery_state,
        receipt_hash: providerReceipt.payload_hash.slice(7),
        ...providerEvidence,
      });
    }
    return { statement, receipt };
  }

  function recordDeliveryProviderStatusIssue(context, receipt, safeErrorCode) {
    return repository.recordDeliveryProviderResult(context, {
      delivery_receipt_id: receipt.delivery_receipt_id,
      provider_result_state: "unknown",
      expected_version: receipt.state_version,
      safe_error_code: safeErrorCode,
      provider_id: receipt.provider_id,
      provider_receipt_id: receipt.provider_receipt_id,
      provider_status_poll: true,
    });
  }

  async function deliver(context, input = {}) {
    const runId = requiredString(input, "run_id");
    const channel = requiredString(input, "channel");
    if (!["email", "message", "self_service"].includes(channel)) throw new TypeError("channel is unsupported");
    const providerChannel = channel !== "self_service";
    if (providerChannel && !providerDeliveryEnabled) {
      throw safeError("Payroll statement provider delivery is disabled", "HRX_PAYROLL_STATEMENT_DELIVERY_DISABLED", 409);
    }
    if (providerChannel && !deliveryPort?.send) {
      throw safeError("Authoritative payroll statement delivery provider is required", "HRX_PAYROLL_DELIVERY_PROVIDER_REQUIRED", 503);
    }
    const statements = repository.listStatements(context, { run_id: runId });
    const results = [];
    let skippedRevokedCount = 0;
    let retryCount = 0;
    const maximumAttempts = Number.isSafeInteger(providerBoundary?.maximum_attempts)
      && providerBoundary.maximum_attempts > 0
      ? providerBoundary.maximum_attempts
      : 3;
    for (let statement of statements) {
      if (statement.state === "revoked") {
        skippedRevokedCount += 1;
        continue;
      }
      let receipt = repository.listDeliveryReceipts(context, { statement_id: statement.statement_id, channel })[0];
      if (!receipt) receipt = repository.createDeliveryReceipt(context, { statement_id: statement.statement_id, channel });
      let retrying = false;
      let attemptStartedAt = null;
      if (receipt.state === "failed") {
        if (providerChannel && receipt.attempt_count >= maximumAttempts) {
          results.push(receipt);
          continue;
        }
        attemptStartedAt = clock();
        receipt = repository.transitionDeliveryReceipt(context, {
          delivery_receipt_id: receipt.delivery_receipt_id,
          state: "queued",
          expected_version: receipt.state_version,
          attempt_started_at: attemptStartedAt,
        });
        retrying = true;
        retryCount += 1;
      }
      if (channel === "self_service") {
        if (receipt.state === "queued") {
          receipt = repository.transitionDeliveryReceipt(context, {
            delivery_receipt_id: receipt.delivery_receipt_id,
            state: "delivered",
            expected_version: receipt.state_version,
            provider_id: "lawos-internal",
            provider_receipt_id: `internal-${statement.statement_id}`,
            provider_receipt_ref: `provider:internal/payroll-statement/${statement.statement_id}`,
            receipt_hash: statement.document_hash,
          });
          if (statement.state === "generated") {
            statement = repository.transitionStatement(context, {
              statement_id: statement.statement_id,
              state: "delivered",
              expected_version: statement.state_version,
            });
          }
        }
        results.push(receipt);
        continue;
      }
      if (["delivered", "viewed"].includes(receipt.state)
        || (receipt.attempt_count > 0 && receipt.provider_result_state === "sent")) {
        results.push(receipt);
        continue;
      }
      const payloadHash = `sha256:${hash(Buffer.from(JSON.stringify({ statement_id: statement.statement_id, document_hash: statement.document_hash, channel })) )}`;
      const providerRequest = {
        tenant_id: context.tenant_id,
        statement_id: statement.statement_id,
        employee_id: statement.employee_id,
        channel,
        document_hash: statement.document_hash,
        payload_hash: payloadHash,
        idempotency_key: `${statement.statement_id}:${channel}:${statement.document_hash}`,
      };

      if (!retrying && receipt.attempt_count > 0 && ["queued", "unknown"].includes(receipt.provider_result_state)) {
        if (!receipt.provider_receipt_id || typeof deliveryPort.status !== "function") {
          receipt = recordDeliveryProviderStatusIssue(
            context,
            receipt,
            "HRX_PAYROLL_PROVIDER_STATUS_REQUIRED",
          );
          results.push(receipt);
          continue;
        }
        let providerStatusInput;
        try {
          providerStatusInput = await deliveryPort.status({
            ...providerRequest,
            provider_receipt_id: receipt.provider_receipt_id,
          });
        } catch {
          receipt = recordDeliveryProviderStatusIssue(
            context,
            receipt,
            "HRX_PAYROLL_PROVIDER_STATUS_UNAVAILABLE",
          );
          results.push(receipt);
          continue;
        }
        let providerStatus;
        try {
          providerStatus = assertHrxProviderReceiptForOperation(
            providerStatusInput,
            {
              boundary: providerBoundary,
              tenant_id: context.tenant_id,
              operation: `statement.${channel}`,
              idempotency_key: providerRequest.idempotency_key,
              payload_hash: payloadHash,
              attempt_count: receipt.attempt_count,
            },
          ).receipt;
        } catch {
          receipt = recordDeliveryProviderStatusIssue(
            context,
            receipt,
            "HRX_PAYROLL_PROVIDER_STATUS_INVALID",
          );
          results.push(receipt);
          continue;
        }
        ({ statement, receipt } = applyDeliveryProviderReceipt(
          context,
          statement,
          receipt,
          providerStatus,
          { providerStatusPoll: true },
        ));
        results.push(receipt);
        continue;
      }

      if (receipt.attempt_count >= maximumAttempts) {
        results.push(receipt);
        continue;
      }
      attemptStartedAt ??= clock();
      let providerReceiptInput;
      try {
        providerReceiptInput = await deliveryPort.send(providerRequest);
      } catch {
        receipt = repository.transitionDeliveryReceipt(context, {
          delivery_receipt_id: receipt.delivery_receipt_id,
          state: "failed",
          expected_version: receipt.state_version,
          safe_error_code: "HRX_PAYROLL_PROVIDER_REQUEST_FAILED",
          attempt_started_at: attemptStartedAt,
        });
        results.push(receipt);
        continue;
      }
      let providerReceipt;
      try {
        providerReceipt = assertHrxProviderReceiptForOperation(
          providerReceiptInput,
          {
            boundary: providerBoundary,
            tenant_id: context.tenant_id,
            operation: `statement.${channel}`,
            idempotency_key: providerRequest.idempotency_key,
            payload_hash: payloadHash,
            attempt_count: receipt.attempt_count + 1,
          },
        ).receipt;
      } catch {
        receipt = repository.transitionDeliveryReceipt(context, {
          delivery_receipt_id: receipt.delivery_receipt_id,
          state: "failed",
          expected_version: receipt.state_version,
          safe_error_code: "HRX_PAYROLL_PROVIDER_RECEIPT_INVALID",
          attempt_started_at: attemptStartedAt,
        });
        results.push(receipt);
        continue;
      }
      ({ statement, receipt } = applyDeliveryProviderReceipt(
        context,
        statement,
        receipt,
        providerReceipt,
      ));
      results.push(receipt);
    }
    const counts = Object.freeze({
      queued_count: results.filter((row) => row.provider_result_state === "queued").length,
      sent_count: results.filter((row) => row.provider_result_state === "sent").length,
      delivered_count: results.filter((row) => row.provider_result_state === "delivered").length,
      read_count: results.filter((row) => row.provider_result_state === "read").length,
      failed_count: results.filter((row) => row.provider_result_state === "failed").length,
      unknown_count: results.filter((row) => row.provider_result_state === "unknown").length,
    });
    const completedCount = counts.delivered_count + counts.read_count;
    const overallState = counts.failed_count > 0
      ? completedCount + counts.sent_count > 0 ? "partial" : "failed"
      : counts.unknown_count > 0
        ? "unknown"
        : counts.queued_count > 0
          ? "queued"
          : counts.sent_count > 0
            ? "sent"
            : completedCount === results.length && results.length > 0
              ? "delivered"
              : "empty";
    return Object.freeze({
      run_id: runId,
      channel,
      overall_state: overallState,
      requested_count: results.length,
      skipped_revoked_count: skippedRevokedCount,
      retry_count: retryCount,
      ...counts,
      receipts: Object.freeze(results.map((row) => deliveryReceiptView(row, { includeProviderEvidence: true }))),
      production_ready_claim: false,
    });
  }

  function selfList(context, input = {}) {
    const employeeId = requiredString(input, "employee_id");
    return Object.freeze(repository.listStatements(context, { employee_id: employeeId })
      .filter((row) => ["delivered", "viewed"].includes(row.state))
      .map((statement) => statementView(statement, {
        deliveryReceipts: repository.listDeliveryReceipts(context, { statement_id: statement.statement_id }),
      })));
  }

  function ingestProviderStatus(context, input = {}) {
    const result = repository.applyDeliveryProviderEvent(context, input);
    return Object.freeze({
      outcome: result.replayed ? "replayed" : "applied",
      replayed: result.replayed,
      provider_event: Object.freeze({
        provider_event_id: result.event.provider_event_id,
        provider_event_state: result.event.provider_event_state,
        event_occurred_at: result.event.event_occurred_at,
      }),
      delivery_receipt: deliveryReceiptView(result.receipt, { includeProviderEvidence: true }),
      statement: Object.freeze({
        statement_id: result.statement.statement_id,
        state: result.statement.state,
        state_version: result.statement.state_version,
        delivered_at: result.statement.delivered_at,
        viewed_at: result.statement.viewed_at,
        revoked_at: result.statement.revoked_at,
      }),
      raw_payload_included: false,
      payroll_amounts_included: false,
      production_ready_claim: false,
    });
  }

  async function read(context, input = {}) {
    const statementId = requiredString(input, "statement_id");
    const employeeId = requiredString(input, "employee_id");
    let statement = repository.getStatement(context, { statement_id: statementId });
    if (!statement || statement.employee_id !== employeeId || !["delivered", "viewed"].includes(statement.state)) {
      throw safeError("Payroll statement not found", "HRX_PAYROLL_STATEMENT_NOT_FOUND", 404);
    }
    let bytes;
    const objectId = statementObjectId(statement);
    try {
      bytes = await artifactVault.get({ tenant_id: context.tenant_id, object_id: objectId });
    } catch {
      const rendered = render(context, statement.run_id, statement.employee_id);
      if (rendered.document_hash !== statement.document_hash) throw safeError("Payroll statement integrity check failed", "HRX_PAYROLL_STATEMENT_INTEGRITY", 409);
      await artifactVault.put({ tenant_id: context.tenant_id, object_id: objectId, bytes: rendered.bytes, content_type: "application/pdf" });
      bytes = rendered.bytes;
    }
    if (hash(bytes) !== statement.document_hash) throw safeError("Payroll statement integrity check failed", "HRX_PAYROLL_STATEMENT_INTEGRITY", 409);
    if (statement.state === "delivered") statement = repository.transitionStatement(context, { statement_id: statement.statement_id, state: "viewed", expected_version: statement.state_version });
    const selfReceipt = repository.listDeliveryReceipts(context, { statement_id: statement.statement_id, channel: "self_service" })[0];
    if (selfReceipt?.state === "delivered") repository.transitionDeliveryReceipt(context, { delivery_receipt_id: selfReceipt.delivery_receipt_id, state: "viewed", expected_version: selfReceipt.state_version });
    const issuedAt = clock();
    return Object.freeze({
      statement: statementView(statement, {
        deliveryReceipts: repository.listDeliveryReceipts(context, { statement_id: statement.statement_id }),
      }),
      filename: `${statement.run_id}-${statement.employee_id}.pdf`,
      mime_type: "application/pdf",
      content_base64: bytes.toString("base64"),
      download_token_ref: `token:payroll-statement/${statement.statement_id}/${hash(Buffer.from(`${statement.state_version}:${issuedAt}`))}`,
      expires_at: new Date(Date.parse(issuedAt) + 5 * 60_000).toISOString(),
      production_ready_claim: false,
    });
  }

  function revoke(context, input = {}) {
    let statement = repository.getStatement(context, { statement_id: requiredString(input, "statement_id") });
    if (!statement) throw safeError("Payroll statement not found", "HRX_PAYROLL_STATEMENT_NOT_FOUND", 404);
    if (statement.state !== "revoked") {
      statement = repository.transitionStatement(context, {
        statement_id: statement.statement_id,
        state: "revoked",
        expected_version: statement.state_version,
      });
    }
    for (const receipt of repository.listDeliveryReceipts(context, { statement_id: statement.statement_id })) {
      if (receipt.state !== "revoked") {
        repository.transitionDeliveryReceipt(context, {
          delivery_receipt_id: receipt.delivery_receipt_id,
          state: "revoked",
          expected_version: receipt.state_version,
        });
      }
    }
    return statementView(statement, {
      deliveryReceipts: repository.listDeliveryReceipts(context, { statement_id: statement.statement_id }),
      includeProviderEvidence: true,
    });
  }

  return Object.freeze({ generate, list, exportRegister, deliver, ingestProviderStatus, selfList, read, revoke });
}

export { createEncryptedPayrollArtifactVault };
