import assert from "node:assert/strict";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import {
  FINANCE_API_ERROR_CODES,
  createFinanceRuntimeContext,
  handleFinanceApiRequest,
} from "../src/finance-runtime-context.js";
import {
  runFinanceBankClassificationAuto,
  runFinanceBankClassificationReview,
  runFinanceBankImport,
} from "../src/finance-bank-boundary.js";

const TENANT = "tenant_rfd_tuw_031";
const ACTOR = "actor_rfd_tuw_031";
const COMMON = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "permission_rfd_tuw_031",
  audit_hint_ref: "audit_rfd_tuw_031",
});
const CLIENT = Object.freeze({
  model_type: "ClientGroup",
  client_group_id: "client_rfd_tuw_031",
  display_name: "등록 고객",
  status: "active",
});
const EMPLOYEE = Object.freeze({
  employee_id: "employee_rfd_tuw_031",
  display_name: "홍길동",
  title: "스태프",
  aliases: ["RFD031"],
  status: "active",
});
const ALLOW_CONTEXT = Object.freeze({
  principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["partner"] },
  rules: [{ id: "allow_rfd_tuw_031", effect: "allow", action: "*" }],
  object_acl: [],
});
const DENY_CONTEXT = Object.freeze({
  principal: { user_id: "denied_rfd_tuw_031", tenant_id: TENANT, role_ids: ["staff"] },
  rules: [],
  object_acl: [],
});

function transaction(id, overrides = {}) {
  return {
    bank_transaction_id: id,
    account_ref: "rfd031-operating",
    transaction_fingerprint: id === "bank-unmatched" ? "b".repeat(64) : "c".repeat(64),
    date: "2026-08-01",
    occurred_at: "2026-08-01T09:00:00.000Z",
    time_precision: "second",
    direction: "inflow",
    amount: 125000,
    balance_after: 500000,
    currency: "KRW",
    method: "bank_transfer",
    counterparty: "알 수 없는 입금",
    memo: "RFD031 fixture",
    source_category: "미분류",
    classification_scope: "unreviewed",
    source_refs: [{ source_type: "bank_csv", source_hash: "d".repeat(64), row: 1 }],
    ...overrides,
  };
}

function bankImportBody(overrides = {}) {
  const {
    bank_import_batch: batchOverrides = {},
    transactions: transactionOverrides,
    ...topLevelOverrides
  } = overrides;
  const transactions = transactionOverrides ?? [transaction("bank-unmatched")];
  return {
    ...COMMON,
    idempotency_key: "bank-import-rfd-tuw-031",
    bank_import_batch: {
      bank_import_batch_id: "batch-rfd-tuw-031",
      tenant_id: TENANT,
      source_manifest_hash: "a".repeat(64),
      account_ref: "rfd031-operating",
      transaction_count: transactions.length,
      overlap_count: 0,
      source_count: transactions.length,
      production_import_approved: true,
      ...batchOverrides,
    },
    transactions,
    ...topLevelOverrides,
  };
}

function runtimeFor(repository) {
  return createFinanceRuntimeContext({
    repository,
    clientRecords: [CLIENT],
    employees: [EMPLOYEE],
  });
}

function apiImportRequest(body = bankImportBody()) {
  return {
    pathname: "/api/finance/bank-imports",
    method: "POST",
    body,
    context: ALLOW_CONTEXT,
    requestId: "request-rfd-tuw-031-import",
  };
}

test("RFD-TUW-031 direct boundary preserves provenance, append-only import, and replay", () => {
  const repository = createFinanceRepository();
  const body = bankImportBody();
  const first = runFinanceBankImport({
    repository,
    body,
    actor_id: ACTOR,
    idempotency_key: body.idempotency_key,
  });
  const afterFirst = repository.snapshot();
  const replay = runFinanceBankImport({
    repository,
    body,
    actor_id: ACTOR,
    idempotency_key: body.idempotency_key,
  });

  assert.equal(first.transaction_count, 1);
  assert.equal(first.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.deepEqual(repository.snapshot(), afterFirst);
  assert.equal(first.bank_import_batch.source_manifest_hash, "a".repeat(64));
  const imported = repository.list({ tenant_id: TENANT, model_type: "BankTransaction" })[0];
  assert.deepEqual(imported.source_refs, body.transactions[0].source_refs);
  assert.equal(imported.raw_source_payload_included, false);
  assert.equal(imported.automatic_revenue_recognition_applied, false);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Payment" }).length, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Invoice" }).length, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Revenue" }).length, 0);
  assert.equal(repository.listAudit({ tenant_id: TENANT })[0].action, "bank.transaction.batch.import");
});

test("RFD-TUW-031 malformed provenance and automatic-attribution attempts fail without writes", () => {
  const repository = createFinanceRepository();
  const malformed = bankImportBody({
    bank_import_batch: { source_manifest_hash: "not-a-sha" },
  });
  const beforeMalformed = repository.snapshot();
  assert.throws(
    () => runFinanceBankImport({ repository, body: malformed, actor_id: ACTOR, idempotency_key: "malformed-provenance" }),
    /source_manifest_hash must be a SHA-256 digest/,
  );
  assert.deepEqual(repository.snapshot(), beforeMalformed);

  const attributed = bankImportBody({
    idempotency_key: "automatic-attribution",
    transactions: [transaction("bank-auto-attribution", { matter_id: "matter-forbidden" })],
  });
  const beforeAttributed = repository.snapshot();
  assert.throws(
    () => runFinanceBankImport({ repository, body: attributed, actor_id: ACTOR, idempotency_key: attributed.idempotency_key }),
    /separate reviewed classification workflow/,
  );
  assert.deepEqual(repository.snapshot(), beforeAttributed);

  const duplicate = bankImportBody({
    idempotency_key: "duplicate-fingerprint",
    transactions: [
      transaction("bank-duplicate-a", { transaction_fingerprint: "e".repeat(64) }),
      transaction("bank-duplicate-b", { transaction_fingerprint: "e".repeat(64) }),
    ],
  });
  const beforeDuplicate = repository.snapshot();
  assert.throws(
    () => runFinanceBankImport({ repository, body: duplicate, actor_id: ACTOR, idempotency_key: duplicate.idempotency_key }),
    /fingerprints must be unique within a batch/,
  );
  assert.deepEqual(repository.snapshot(), beforeDuplicate);
});

test("RFD-TUW-031 auto classification and reviewed reclassification keep unmatched revenue at zero", () => {
  const repository = createFinanceRepository();
  const runtime = runtimeFor(repository);
  const body = bankImportBody();
  runFinanceBankImport({ repository, body, actor_id: ACTOR, idempotency_key: body.idempotency_key });

  const auto = runFinanceBankClassificationAuto({
    repository,
    runtime,
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "auto-rfd-tuw-031",
  });
  assert.equal(auto.summary.transaction_count, 1);
  assert.equal(auto.summary.confirmed_count, 1);
  const proposed = repository.list({ tenant_id: TENANT, model_type: "BankTransactionClassification" })[0];
  assert.equal(proposed.category, "other_inflow");
  assert.equal(proposed.revenue_effect, "none");
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Payment" }).length, 0);

  const reviewed = runFinanceBankClassificationReview({
    repository,
    runtime,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: "bank-unmatched",
      category: "client_receipt",
      client_group_id: CLIENT.client_group_id,
      remember_match: true,
    }],
    actor_id: ACTOR,
    idempotency_key: "review-rfd-tuw-031",
  });
  assert.equal(reviewed.result.updated_count, 1);
  assert.equal(reviewed.result.rule_count, 1);
  assert.equal(reviewed.confirmedPayments.length, 1);
  assert.equal(reviewed.confirmedPayments[0].allocation_status, "unallocated");
  assert.equal(reviewed.confirmedPayments[0].revenue_effect, "none_until_allocated");
  const classification = repository.list({ tenant_id: TENANT, model_type: "BankTransactionClassification" })[0];
  assert.equal(classification.classification_source, "manual_review");
  assert.equal(classification.revenue_effect, "candidate_only");
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Revenue" }).length, 0);
  assert.deepEqual(
    repository.listAudit({ tenant_id: TENANT }).map((event) => event.action),
    [
      "bank.transaction.batch.import",
      "bank.transaction.classification.auto",
      "bank.transaction.classification.review",
      "payment.import",
    ],
  );

  const afterReview = repository.snapshot();
  const replay = runFinanceBankClassificationReview({
    repository,
    runtime,
    tenant_id: TENANT,
    decisions: [{
      bank_transaction_id: "bank-unmatched",
      category: "client_receipt",
      client_group_id: CLIENT.client_group_id,
      remember_match: true,
    }],
    actor_id: ACTOR,
    idempotency_key: "review-rfd-tuw-031",
  });
  assert.equal(replay.result.idempotent_replay, true);
  assert.deepEqual(repository.snapshot(), afterReview);
});

test("RFD-TUW-031 API boundary preserves auth, safe malformed errors, and idempotent replay", async () => {
  const repository = createFinanceRepository();
  const runtime = runtimeFor(repository);
  const request = apiImportRequest();
  const first = await handleFinanceApiRequest({ ...request, runtime });
  assert.equal(first.status, 201);
  assert.equal(first.body.item.source_manifest_hash, undefined);
  assert.equal(first.body.raw_source_payload_included, false);
  const afterFirst = repository.snapshot();
  const replay = await handleFinanceApiRequest({ ...request, runtime, requestId: "request-rfd-tuw-031-replay" });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.deepEqual(repository.snapshot(), afterFirst);

  const malformedRequest = apiImportRequest(bankImportBody({
    idempotency_key: "api-malformed-provenance",
    bank_import_batch: { source_manifest_hash: "invalid" },
  }));
  const beforeMalformed = repository.snapshot();
  const malformed = await handleFinanceApiRequest({ ...malformedRequest, runtime, requestId: "request-rfd-tuw-031-malformed" });
  assert.equal(malformed.status, 400);
  assert.deepEqual(malformed.body.safe_error_codes, [FINANCE_API_ERROR_CODES.validation_error]);
  assert.deepEqual(repository.snapshot(), beforeMalformed);

  const duplicateRequest = apiImportRequest(bankImportBody({
    idempotency_key: "api-duplicate-fingerprint",
    bank_import_batch: { bank_import_batch_id: "batch-rfd-tuw-031-duplicate", transaction_count: 2 },
    transactions: [
      transaction("api-duplicate-a", { transaction_fingerprint: "e".repeat(64) }),
      transaction("api-duplicate-b", { transaction_fingerprint: "e".repeat(64) }),
    ],
  }));
  const beforeDuplicate = repository.snapshot();
  const duplicate = await handleFinanceApiRequest({ ...duplicateRequest, runtime, requestId: "request-rfd-tuw-031-duplicate" });
  assert.equal(duplicate.status, 400);
  assert.deepEqual(duplicate.body.safe_error_codes, [FINANCE_API_ERROR_CODES.validation_error]);
  assert.deepEqual(repository.snapshot(), beforeDuplicate);

  const denied = await handleFinanceApiRequest({
    ...request,
    context: DENY_CONTEXT,
    requestId: "request-rfd-tuw-031-denied",
    runtime,
    body: bankImportBody({ idempotency_key: "denied-import" }),
  });
  assert.equal(denied.status, 403);
  assert.deepEqual(denied.body.items, []);
  assert.equal(denied.body.count_leak_prevented, true);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BankImportBatch" }).length, 1);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).filter((event) => event.decision === "deny").length, 1);

  const missingTenant = await handleFinanceApiRequest({
    ...request,
    requestId: "request-rfd-tuw-031-missing-tenant",
    runtime,
    body: {
      ...request.body,
      tenant_id: undefined,
      bank_import_batch: { ...request.body.bank_import_batch, tenant_id: undefined },
    },
  });
  assert.equal(missingTenant.status, 400);
  assert.deepEqual(missingTenant.body.safe_error_codes, [FINANCE_API_ERROR_CODES.tenant_required]);
});

test("RFD-TUW-031 API classification and reclassification preserve review history and no auto-revenue", async () => {
  const repository = createFinanceRepository();
  const runtime = runtimeFor(repository);
  const imported = await handleFinanceApiRequest({ ...apiImportRequest(), runtime });
  assert.equal(imported.status, 201);

  const auto = await handleFinanceApiRequest({
    pathname: "/api/finance/bank-classifications/auto",
    method: "POST",
    body: {
      ...COMMON,
      idempotency_key: "api-auto-rfd-tuw-031",
    },
    context: ALLOW_CONTEXT,
    requestId: "request-rfd-tuw-031-auto",
    runtime,
  });
  assert.equal(auto.status, 200);
  assert.equal(auto.body.item.summary.categories[0].category, "other_inflow");

  const reviewRequest = {
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    body: {
      ...COMMON,
      idempotency_key: "api-review-rfd-tuw-031",
      decisions: [{
        bank_transaction_id: "bank-unmatched",
        category: "client_receipt",
        client_group_id: CLIENT.client_group_id,
        remember_match: true,
      }],
    },
    context: ALLOW_CONTEXT,
    requestId: "request-rfd-tuw-031-review",
    runtime,
  };
  const reviewed = await handleFinanceApiRequest(reviewRequest);
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.item.payment_count, 1);
  assert.equal(reviewed.body.item.payments[0].allocation_status, "unallocated");
  assert.equal(reviewed.body.item.payments[0].revenue_effect, "none_until_allocated");
  const replay = await handleFinanceApiRequest({ ...reviewRequest, requestId: "request-rfd-tuw-031-review-replay" });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Payment" }).length, 1);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Revenue" }).length, 0);
  assert.deepEqual(
    repository.listAudit({ tenant_id: TENANT }).map((event) => event.action),
    [
      "bank.transaction.batch.import",
      "bank.transaction.classification.auto",
      "bank.transaction.classification.review",
      "payment.import",
    ],
  );
});

test("RFD-TUW-031 read-only smoke uses sanitized bank reads and does not mutate product rows", async () => {
  const repository = createFinanceRepository();
  const runtime = runtimeFor(repository);
  const body = bankImportBody();
  runFinanceBankImport({ repository, body, actor_id: ACTOR, idempotency_key: body.idempotency_key });
  const beforeRecords = repository.snapshot().records;

  const query = {
    ...COMMON,
  };
  const transactions = await handleFinanceApiRequest({
    pathname: "/api/finance/bank-transactions",
    method: "GET",
    query,
    context: ALLOW_CONTEXT,
    requestId: "request-rfd-tuw-031-read-transactions",
    runtime,
  });
  const classifications = await handleFinanceApiRequest({
    pathname: "/api/finance/bank-classifications",
    method: "GET",
    query,
    context: ALLOW_CONTEXT,
    requestId: "request-rfd-tuw-031-read-classifications",
    runtime,
  });
  assert.equal(transactions.status, 200);
  assert.equal(classifications.status, 200);
  assert.equal(transactions.body.items[0].source_refs, undefined);
  assert.equal(transactions.body.items[0].transaction_fingerprint, undefined);
  assert.deepEqual(repository.snapshot().records, beforeRecords);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Payment" }).length, 0);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "Revenue" }).length, 0);
});
