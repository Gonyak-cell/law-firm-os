import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  buildClientDepositBankImportCommand,
  buildClientDepositClassificationAutoCommand,
  buildClientDepositClassificationReviewCommand,
  buildClientDepositOperationsModel,
  clientDepositImportPhaseLabel,
  clientDepositLinkLabel,
  clientDepositResultState,
  clientDepositRowStatusLabel,
  CLIENT_DEPOSIT_IMPORT_PHASE_COPY,
  CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS,
  CLIENT_DEPOSIT_LINK_COPY,
  resolveClientDepositSelection,
} from "../src/components/ClientDepositOperationsModel.js";

import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { renderSimpleTextPdf } from "../../../packages/billing/src/invoice-pdf-service.js";
import {
  createFinanceRuntimeContext,
  handleFinanceApiRequest,
  handleFinanceBankImport,
  handleFinanceBankImportPreview,
} from "../../../apps/api/src/finance-runtime-context.js";
import { createBankImportPreviewTokenAuthority } from "../../../apps/api/src/bank-import-preview-token.js";

const TENANT = "tenant-client-deposit-model";
const ACTOR = "user-client-deposit-model";
const ACCOUNT = "account-client-deposit-model";
const HASH = "a".repeat(64);
const ROUTE_CONTEXT = {
  tenant_id: TENANT,
  permission_ref: "perm-client-deposit-model",
  audit_hint_ref: "audit-client-deposit-model",
};

function bankClassificationId(tenantId, transactionId) {
  return `bank_classification_${createHash("sha256")
    .update(`${tenantId}|${transactionId}`)
    .digest("hex")
    .slice(0, 24)}`;
}

function permissionContext() {
  return {
    principal: {
      tenant_id: TENANT,
      user_id: ACTOR,
      role_ids: ["system_super_admin"],
      scopes: ["finance.bank.import", "finance.bank.read", "finance.bank.classify"],
    },
    rules: [{ id: "allow-client-deposit-model", effect: "allow", action: "*" }],
    object_acl: [],
  };
}

function bankTransactionFor(item, overrides = {}) {
  return {
    model_type: "BankTransaction",
    bank_transaction_id: item.bank_transaction_id,
    tenant_id: item.tenant_id ?? TENANT,
    account_ref: ACCOUNT,
    date: item.transaction_date,
    occurred_at: item.occurred_at,
    direction: item.transaction_direction,
    amount: item.amount,
    currency: item.currency,
    status: "posted",
    source_refs: [{ source_type: "xlsx", source_hash: HASH, row: 1 }],
    ...overrides,
  };
}

async function financeRoute({ runtime, pathname, method = "GET", query = {}, body = {}, requestId }) {
  return handleFinanceApiRequest({
    pathname,
    method,
    query,
    body,
    context: permissionContext(),
    requestId: requestId ?? `request-${method.toLowerCase()}-${pathname.replaceAll("/", "-")}`,
    runtime,
  });
}

function adapterWrite(routeResponse) {
  return {
    kind: "data",
    status: routeResponse.status,
    ...routeResponse.body,
  };
}

function actualPreviewFile() {
  const source = renderSimpleTextPdf([
    "2026/07/31",
    "inflow 1,500 13,700  bank transfer  Client C",
    "14:50:03",
  ]);
  return {
    filename: "bank-statement.pdf",
    mime_type: "application/pdf",
    byte_size: source.byteLength,
    content_base64: source.toString("base64"),
  };
}

function actualPreviewBody(preview, extra = {}) {
  return {
    request_id: "request-client-deposit-preview",
    outcome: "preview_ready",
    preview,
    safe_error_codes: [],
    audit_hint_ref: ROUTE_CONTEXT.audit_hint_ref,
    count_leak_prevented: true,
    production_ready_claim: false,
    ...extra,
  };
}

function adapterCollection(routeBody) {
  // This is the exact normalization performed by fetchFinanceCollection in
  // apps/web/src/data/apiClient.js.  Fields absent there must stay absent.
  return {
    kind: "data",
    requestId: routeBody.request_id,
    uiState: routeBody.ui_state,
    outcome: routeBody.outcome,
    item: routeBody.item ?? null,
    items: routeBody.items,
    summary: routeBody.summary ?? null,
    pageInfo: routeBody.page_info ?? null,
    safeErrorCodes: routeBody.safe_error_codes,
    auditHintRef: routeBody.audit_hint_ref,
    countLeakPrevented: routeBody.count_leak_prevented === true,
    permissionPrefilterApplied: routeBody.permission_prefilter_applied,
    unauthorizedCountIncluded: routeBody.unauthorized_count_included,
    rawSourcePayloadIncluded: routeBody.raw_source_payload_included,
    productionReadyClaim: routeBody.production_ready_claim === true,
  };
}

function classificationItem(overrides = {}) {
  return {
    model_type: "BankTransactionClassification",
    bank_transaction_classification_id: "bank-classification-model-1",
    tenant_id: TENANT,
    bank_transaction_id: "bank-inflow-model-1",
    account_ref: ACCOUNT,
    transaction_date: "2026-07-31",
    transaction_month: "2026-07",
    occurred_at: "2026-07-31T05:00:00.000Z",
    transaction_direction: "inflow",
    amount: 1_500,
    currency: "KRW",
    primary_type: "sales",
    category: "client_receipt",
    category_label: "고객 매출",
    client_group_id: "client-authorized-1",
    client_group_label: "한빛 법률사무소 고객",
    employee_id: null,
    matter_id: null,
    payroll_category: null,
    status: "confirmed",
    confidence: "high",
    classification_source: "automatic",
    rationale_code: "client_exact",
    manual_lock: false,
    refund_of_bank_transaction_id: null,
    rule_id: null,
    reviewed_by: null,
    reviewed_at: null,
    state_version: 1,
    source_metadata_included: false,
    raw_source_payload_included: false,
    credential_material_included: false,
    production_ready_claim: false,
    invoice_required: false,
    matter_required: false,
    ...overrides,
  };
}

function classificationRouteBody(items = [classificationItem()], extra = {}) {
  return {
    request_id: "request-client-deposit-classifications",
    outcome: "passed",
    items,
    summary: {
      transaction_count: items.length,
      confirmed_count: items.filter((item) => item.status === "confirmed").length,
      review_count: items.filter((item) => item.status !== "confirmed").length,
      categories: [],
      primary_types: [],
    },
    page_info: { returned_count: items.length, total_filtered_count: items.length, omitted_item_count: 0 },
    safe_error_codes: [],
    audit_hint_ref: ROUTE_CONTEXT.audit_hint_ref,
    count_leak_prevented: true,
    raw_source_payload_included: false,
    production_ready_claim: false,
    ...extra,
  };
}

function selectedRows(items = [classificationItem()]) {
  return buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(classificationRouteBody(items)),
    requestedTransactionId: items[0].bank_transaction_id,
  });
}

function actionRequest(overrides = {}) {
  return {
    ...ROUTE_CONTEXT,
    transactionId: "bank-inflow-model-1",
    expectedVersion: 1,
    idempotencyKey: "client-deposit-command-001",
    reason: "직원 확인",
    ...overrides,
  };
}

function classificationWriteResult(receiptOverrides = {}, resultOverrides = {}) {
  const receipt = {
    bank_transaction_id: "bank-inflow-model-1",
    bank_transaction_classification_id: "bank-classification-model-1",
    state_version: 2,
    category: "client_receipt",
    status: "confirmed",
    client_group_id: "client-authorized-2",
    refund_of_bank_transaction_id: null,
    idempotency_key: "client-deposit-command-001",
    request_fingerprint: HASH,
    raw_source_payload_included: false,
    production_ready_claim: false,
    ...receiptOverrides,
  };
  return {
    kind: "data",
    status: 200,
    outcome: "classified",
    idempotent_replay: false,
    idempotency_key: receipt.idempotency_key,
    request_fingerprint: receipt.request_fingerprint,
    raw_source_payload_included: false,
    production_ready_claim: false,
    item: { command_receipt: receipt },
    command_receipts: [receipt],
    ...resultOverrides,
  };
}

function actionModel({ request = actionRequest({ clientGroupId: "client-authorized-2" }), result = classificationWriteResult(), ...overrides } = {}) {
  return buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(classificationRouteBody([classificationItem()])),
    requestedTransactionId: "bank-inflow-model-1",
    authorizedTransactionIds: ["bank-inflow-model-1"],
    authorizedClientGroupIds: ["client-authorized-1", "client-authorized-2"],
    actionCommands: { manualLink: request },
    actionResults: { manualLink: result },
    ...overrides,
  });
}

test("실제 bank-import preview 응답으로 exact multipart 확정 payload를 만들고 preview_id 없이는 닫힌다", async () => {
  const repository = createFinanceRepository();
  const runtime = createFinanceRuntimeContext({
    repository,
    bankImportPreviewTokens: createBankImportPreviewTokenAuthority({
      secret: "client-deposit-model-preview-secret-material",
    }),
  });
  try {
    const file = actualPreviewFile();
    const common = { ...ROUTE_CONTEXT, account_ref: ACCOUNT, file };
    const previewResponse = await handleFinanceBankImportPreview({
      body: common,
      context: permissionContext(),
      requestId: "request-client-deposit-preview",
      runtime,
    });
    assert.equal(previewResponse.status, 200);
    assert.equal(previewResponse.body.outcome, "preview_ready");
    assert.match(previewResponse.body.preview.preview_id, /^bank_import_preview_/u);
    assert.equal(previewResponse.body.preview.confirmation_token_included, true);

    const routePreview = previewResponse.body.preview;
    const contract = {
      previewId: routePreview.preview_id,
      confirmationToken: routePreview.preview_confirmation_token,
      sourceFileSha256: routePreview.source_file_sha256,
      sourceManifestSha256: routePreview.preview_manifest_sha256,
      sourceType: routePreview.source_type,
      accountRef: routePreview.account_ref,
    };
    const command = buildClientDepositBankImportCommand({
      preview: contract,
      request: {
        ...ROUTE_CONTEXT,
        accountRef: ACCOUNT,
        sourceFileSha256: routePreview.source_file_sha256,
        previewManifestSha256: routePreview.preview_manifest_sha256,
        file,
        idempotencyKey: "client-bank-import-model-001",
      },
    });
    assert.deepEqual(command, {
      ...ROUTE_CONTEXT,
      account_ref: ACCOUNT,
      file,
      production_import_approved: true,
      preview_confirmation_token: routePreview.preview_confirmation_token,
      idempotency_key: "client-bank-import-model-001",
    });
    assert.equal("preview_id" in command, false);
    assert.equal("transactions" in command, false);
    for (const previewId of ["bank_import_preview_X", "not-canonical"]) {
      assert.equal(buildClientDepositBankImportCommand({
        preview: { ...contract, previewId },
        request: {
          ...ROUTE_CONTEXT,
          accountRef: ACCOUNT,
          sourceFileSha256: routePreview.source_file_sha256,
          previewManifestSha256: routePreview.preview_manifest_sha256,
          file,
          idempotencyKey: "client-bank-import-model-001",
        },
      }), null);
    }

    const importedResponse = await handleFinanceBankImport({
      body: {
        ...common,
        production_import_approved: true,
        preview_confirmation_token: routePreview.preview_confirmation_token,
        idempotency_key: "client-bank-import-model-001",
      },
      context: permissionContext(),
      requestId: "request-client-deposit-import",
      runtime,
    });
    assert.equal(importedResponse.status, 201, JSON.stringify(importedResponse.body));
    const adapterPreview = {
      kind: "data",
      adapter_capability: "finance-bank-import-preview-v1",
      ...actualPreviewBody(routePreview),
    };
    const modelImport = buildClientDepositOperationsModel({
      previewResult: adapterPreview,
      importRequest: {
        ...ROUTE_CONTEXT,
        accountRef: ACCOUNT,
        sourceFileSha256: routePreview.source_file_sha256,
        previewManifestSha256: routePreview.preview_manifest_sha256,
        file,
        idempotencyKey: "client-bank-import-model-001",
      },
      importResult: {
        kind: "data",
        status: importedResponse.status,
        outcome: importedResponse.body.outcome,
        item: importedResponse.body.item,
        transaction_count: importedResponse.body.transaction_count,
        confirmed_preview_id: importedResponse.body.confirmed_preview_id,
        idempotent_replay: importedResponse.body.idempotent_replay,
      },
    });
    assert.equal(modelImport.import.phase, "confirmed");
    assert.equal(modelImport.import.command.production_import_approved, true);

    const adapterMissing = buildClientDepositOperationsModel({
      previewResult: { kind: "data", ...actualPreviewBody(routePreview) },
    });
    assert.equal(adapterMissing.preview.state, "unavailable");
    assert.equal(adapterMissing.preview.canConfirm, undefined);
    assert.equal(adapterMissing.preview.integrationRequirement.id, CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS.bankImportPreviewAdapter.id);

    for (const previewId of ["", "not-a-preview"]) {
      const malformedAdapterPreview = buildClientDepositOperationsModel({
        previewResult: {
          kind: "data",
          adapter_capability: "finance-bank-import-preview-v1",
          ...actualPreviewBody({ ...routePreview, preview_id: previewId }),
        },
      });
      assert.equal(malformedAdapterPreview.preview.state, "error");
      assert.deepEqual(malformedAdapterPreview.preview.items, []);
    }
  } finally {
    repository.close();
  }
});

test("실제 client-deposits route 응답을 canonical shape로 통과시키고 unauthorized 행은 전체 차단한다", async () => {
  const seed = classificationItem();
  const repository = createFinanceRepository({
    seedRecords: [{
      model_type: "BankTransaction",
      bank_transaction_id: seed.bank_transaction_id,
      tenant_id: TENANT,
      account_ref: ACCOUNT,
      date: seed.transaction_date,
      occurred_at: seed.occurred_at,
      direction: seed.transaction_direction,
      amount: seed.amount,
      currency: seed.currency,
      status: "posted",
    }, seed],
  });
  const runtime = createFinanceRuntimeContext({
    repository,
    clientRecords: [{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: seed.client_group_id,
      display_name: seed.client_group_label,
      status: "active",
    }],
  });
  let routeResponse;
  try {
    routeResponse = await handleFinanceApiRequest({
      pathname: "/api/finance/client-deposits",
      method: "GET",
      query: ROUTE_CONTEXT,
      body: {},
      context: permissionContext(),
      requestId: "request-client-deposit-classifications",
      runtime,
    });
  } finally {
    repository.close();
  }
  assert.equal(routeResponse.status, 200, JSON.stringify(routeResponse.body));
  const routeBody = routeResponse.body;
  const model = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(routeBody),
    requestedTransactionId: seed.bank_transaction_id,
  });
  assert.equal(model.state, "data");
  assert.equal(model.rows[0].linkKind, "auto_exact");
  assert.equal(model.rows[0].amount, 1_500);
  assert.equal(JSON.stringify(model).includes("counterparty"), false);

  const missingCountProof = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection({ ...routeBody, count_leak_prevented: false }),
  });
  assert.equal(missingCountProof.state, "blocked");
  assert.deepEqual(missingCountProof.rows, []);

  const unauthorized = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(classificationRouteBody([
      classificationItem({ authorized: false }),
    ])),
  });
  assert.equal(unauthorized.state, "error");
  assert.deepEqual(unauthorized.rows, []);
  assert.equal(JSON.stringify(unauthorized).includes("1500"), false);
});

test("실제 auto handler 영수증을 선택 거래와 결속해 성공으로 표시한다", async () => {
  const seed = classificationItem({
    bank_transaction_classification_id: bankClassificationId(TENANT, "bank-inflow-model-1"),
  });
  const repository = createFinanceRepository({
    seedRecords: [bankTransactionFor(seed, { counterparty: seed.client_group_label }), seed],
  });
  const runtime = createFinanceRuntimeContext({
    repository,
    clientRecords: [{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: seed.client_group_id,
      display_name: seed.client_group_label,
      status: "active",
    }],
  });
  try {
    const readResponse = await financeRoute({
      runtime,
      pathname: "/api/finance/client-deposits",
      query: ROUTE_CONTEXT,
      requestId: "request-client-deposit-auto-read",
    });
    assert.equal(readResponse.status, 200, JSON.stringify(readResponse.body));
    const readResult = adapterCollection(readResponse.body);
    const readModel = buildClientDepositOperationsModel({
      classificationsResult: readResult,
      requestedTransactionId: seed.bank_transaction_id,
    });
    const request = actionRequest({
      idempotencyKey: "client-deposit-auto-real-001",
      reason: "자동 분류 재확인",
    });
    const command = buildClientDepositClassificationAutoCommand({ request });
    const writeResponse = await financeRoute({
      runtime,
      pathname: "/api/finance/bank-classifications/auto",
      method: "POST",
      body: command,
      requestId: "request-client-deposit-auto-write",
    });
    assert.equal(writeResponse.status, 200, JSON.stringify(writeResponse.body));
    const model = buildClientDepositOperationsModel({
      classificationsResult: readResult,
      requestedTransactionId: seed.bank_transaction_id,
      authorizedTransactionIds: [seed.bank_transaction_id],
      authorizedClientGroupIds: [seed.client_group_id],
      actionCommands: { auto: request },
      actionResults: { auto: adapterWrite(writeResponse) },
    });
    assert.equal(model.actions.auto.state, "data");
    assert.equal(model.actions.auto.response.selectedTransactionId, seed.bank_transaction_id);
    assert.equal(model.actions.auto.response.classificationId, seed.bank_transaction_classification_id);
  } finally {
    repository.close();
  }
});

test("실제 수동 연결·재연결 응답과 GET 결과가 manual_client_relinked를 보존한다", async () => {
  const seed = classificationItem({
    bank_transaction_classification_id: bankClassificationId(TENANT, "bank-inflow-model-1"),
    status: "review_required",
    confidence: "needs_review",
    classification_source: "automatic",
    rationale_code: "client_name_ambiguous",
    client_group_id: null,
    client_group_label: null,
  });
  const repository = createFinanceRepository({
    seedRecords: [bankTransactionFor(seed), seed],
  });
  const runtime = createFinanceRuntimeContext({
    repository,
    clientRecords: [
      { model_type: "ClientGroup", tenant_id: TENANT, client_group_id: "client-authorized-1", display_name: "첫 고객", status: "active" },
      { model_type: "ClientGroup", tenant_id: TENANT, client_group_id: "client-authorized-2", display_name: "두 번째 고객", status: "active" },
    ],
  });
  try {
    const firstRead = await financeRoute({
      runtime,
      pathname: "/api/finance/client-deposits",
      query: ROUTE_CONTEXT,
      requestId: "request-client-deposit-manual-read-1",
    });
    const firstReadResult = adapterCollection(firstRead.body);
    const firstModel = buildClientDepositOperationsModel({
      classificationsResult: firstReadResult,
      requestedTransactionId: seed.bank_transaction_id,
    });
    const firstRequest = actionRequest({
      clientGroupId: "client-authorized-1",
      expectedVersion: 1,
      idempotencyKey: "client-deposit-manual-real-001",
      reason: "첫 고객 연결",
    });
    const firstCommand = buildClientDepositClassificationReviewCommand({
      type: "manualLink",
      request: firstRequest,
      selected: firstModel.selectedRow,
      authorizedTransactionIds: firstModel.rows.map((row) => row.transactionId),
      authorizedClientGroupIds: ["client-authorized-1", "client-authorized-2"],
      visibleRows: firstModel.rows,
    });
    const firstWrite = await financeRoute({
      runtime,
      pathname: "/api/finance/bank-classifications/review",
      method: "POST",
      body: firstCommand,
      requestId: "request-client-deposit-manual-write-1",
    });
    assert.equal(firstWrite.status, 200, JSON.stringify(firstWrite.body));
    const firstActionModel = buildClientDepositOperationsModel({
      classificationsResult: firstReadResult,
      requestedTransactionId: seed.bank_transaction_id,
      authorizedTransactionIds: [seed.bank_transaction_id],
      authorizedClientGroupIds: ["client-authorized-1", "client-authorized-2"],
      actionCommands: { manualLink: firstRequest },
      actionResults: { manualLink: adapterWrite(firstWrite) },
    });
    assert.equal(firstActionModel.actions.manualLink.state, "data");

    const secondRead = await financeRoute({
      runtime,
      pathname: "/api/finance/client-deposits",
      query: ROUTE_CONTEXT,
      requestId: "request-client-deposit-manual-read-2",
    });
    const secondReadResult = adapterCollection(secondRead.body);
    const secondModel = buildClientDepositOperationsModel({
      classificationsResult: secondReadResult,
      requestedTransactionId: seed.bank_transaction_id,
    });
    const secondRequest = actionRequest({
      clientGroupId: "client-authorized-2",
      expectedVersion: 2,
      idempotencyKey: "client-deposit-manual-real-002",
      reason: "고객 재연결",
    });
    const secondCommand = buildClientDepositClassificationReviewCommand({
      type: "manualLink",
      request: secondRequest,
      selected: secondModel.selectedRow,
      authorizedTransactionIds: [seed.bank_transaction_id],
      authorizedClientGroupIds: ["client-authorized-1", "client-authorized-2"],
      visibleRows: secondModel.rows,
    });
    const secondWrite = await financeRoute({
      runtime,
      pathname: "/api/finance/bank-classifications/review",
      method: "POST",
      body: secondCommand,
      requestId: "request-client-deposit-manual-write-2",
    });
    assert.equal(secondWrite.status, 200, JSON.stringify(secondWrite.body));

    const finalRead = await financeRoute({
      runtime,
      pathname: "/api/finance/client-deposits",
      query: ROUTE_CONTEXT,
      requestId: "request-client-deposit-manual-read-final",
    });
    const finalModel = buildClientDepositOperationsModel({
      classificationsResult: adapterCollection(finalRead.body),
      requestedTransactionId: seed.bank_transaction_id,
    });
    assert.equal(finalModel.state, "data");
    assert.equal(finalModel.rows[0].linkKind, "manual");
    assert.equal(finalModel.rows[0].clientGroupId, "client-authorized-2");
  } finally {
    repository.close();
  }
});

test("실제 환불 연결 응답은 visible confirmed inflow 원거래와만 결속한다", async () => {
  const original = classificationItem({
    bank_transaction_id: "bank-original-real-refund",
    bank_transaction_classification_id: bankClassificationId(TENANT, "bank-original-real-refund"),
  });
  const refund = classificationItem({
    bank_transaction_id: "bank-refund-real",
    bank_transaction_classification_id: bankClassificationId(TENANT, "bank-refund-real"),
    transaction_direction: "outflow",
    amount: 500,
    category: "refund_reversal",
    category_label: "취소·환급",
    client_group_id: null,
    client_group_label: null,
    status: "review_required",
    confidence: "needs_review",
    classification_source: "automatic",
    rationale_code: "refund_link_required",
    manual_lock: false,
    refund_of_bank_transaction_id: null,
  });
  const repository = createFinanceRepository({
    seedRecords: [
      bankTransactionFor(original),
      bankTransactionFor(refund),
      original,
      refund,
    ],
  });
  const runtime = createFinanceRuntimeContext({
    repository,
    clientRecords: [{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: original.client_group_id,
      display_name: original.client_group_label,
      status: "active",
    }],
  });
  try {
    const read = await financeRoute({
      runtime,
      pathname: "/api/finance/client-deposits",
      query: ROUTE_CONTEXT,
      requestId: "request-client-deposit-refund-read",
    });
    const readResult = adapterCollection(read.body);
    const readModel = buildClientDepositOperationsModel({
      classificationsResult: readResult,
      requestedTransactionId: refund.bank_transaction_id,
    });
    const request = actionRequest({
      transactionId: refund.bank_transaction_id,
      expectedVersion: 1,
      refundOfTransactionId: original.bank_transaction_id,
      idempotencyKey: "client-deposit-refund-real-001",
      reason: "환불 확인",
    });
    const command = buildClientDepositClassificationReviewCommand({
      type: "refundLink",
      request,
      selected: readModel.selectedRow,
      authorizedTransactionIds: readModel.rows.map((row) => row.transactionId),
      authorizedClientGroupIds: [original.client_group_id],
      visibleRows: readModel.rows,
    });
    assert.ok(command, JSON.stringify({ rows: readModel.rows, request }));
    const write = await financeRoute({
      runtime,
      pathname: "/api/finance/bank-classifications/review",
      method: "POST",
      body: command,
      requestId: "request-client-deposit-refund-write",
    });
    assert.equal(write.status, 200, JSON.stringify(write.body));
    const actionModelResult = buildClientDepositOperationsModel({
      classificationsResult: readResult,
      requestedTransactionId: refund.bank_transaction_id,
      authorizedTransactionIds: readModel.rows.map((row) => row.transactionId),
      authorizedClientGroupIds: [original.client_group_id],
      actionCommands: { refundLink: request },
      actionResults: { refundLink: adapterWrite(write) },
    });
    assert.equal(actionModelResult.actions.refundLink.state, "data");
    assert.equal(actionModelResult.actions.refundLink.response.refundOfTransactionId, original.bank_transaction_id);
    assert.equal(actionModelResult.actions.refundLink.response.clientGroupId, original.client_group_id);
  } finally {
    repository.close();
  }
});

test("분류 명령은 실제 auto/review route payload이고 고객·거래 allowlist 밖 대상은 만들지 않는다", () => {
  const inflow = selectedRows().selectedRow;
  const outflow = selectedRows([classificationItem({
    bank_transaction_id: "bank-refund-model-1",
    bank_transaction_classification_id: "bank-classification-model-refund",
    transaction_direction: "outflow",
    category: "refund_reversal",
    category_label: "취소·환급",
    confidence: "reviewed",
    classification_source: "manual_review",
    rationale_code: "manual_refund_linked",
    manual_lock: true,
    refund_of_bank_transaction_id: "bank-inflow-model-1",
    state_version: 3,
  })]).selectedRow;
  const auto = buildClientDepositClassificationAutoCommand({ request: actionRequest() });
  assert.deepEqual(auto, {
    ...ROUTE_CONTEXT,
    idempotency_key: "client-deposit-command-001",
    bank_transaction_id: inflow.transactionId,
    expected_state_version: inflow.stateVersion,
  });
  const manual = buildClientDepositClassificationReviewCommand({
    type: "manualLink",
    request: actionRequest({ clientGroupId: "client-authorized-2" }),
    selected: inflow,
    authorizedTransactionIds: [inflow.transactionId],
    authorizedClientGroupIds: ["client-authorized-2"],
  });
  assert.deepEqual(manual, {
    ...ROUTE_CONTEXT,
    idempotency_key: "client-deposit-command-001",
    decisions: [{
      bank_transaction_id: inflow.transactionId,
      category: "client_receipt",
      client_group_id: "client-authorized-2",
      expected_state_version: inflow.stateVersion,
    }],
  });
  assert.equal(buildClientDepositClassificationReviewCommand({
    type: "manualLink",
    request: actionRequest({ clientGroupId: "not-authorized" }),
    selected: inflow,
    authorizedTransactionIds: [inflow.transactionId],
    authorizedClientGroupIds: ["client-authorized-2"],
  }), null);
  assert.equal(buildClientDepositClassificationReviewCommand({
    type: "refundLink",
    request: actionRequest({
      transactionId: outflow.transactionId,
      expectedVersion: outflow.stateVersion,
      refundOfTransactionId: outflow.transactionId,
    }),
    selected: outflow,
    authorizedTransactionIds: [outflow.transactionId],
    authorizedClientGroupIds: ["client-authorized-2"],
  }), null);
  const refund = buildClientDepositClassificationReviewCommand({
    type: "refundLink",
    request: actionRequest({
      transactionId: outflow.transactionId,
      expectedVersion: outflow.stateVersion,
      refundOfTransactionId: inflow.transactionId,
      idempotencyKey: "client-deposit-refund-001",
    }),
    selected: outflow,
    authorizedTransactionIds: [inflow.transactionId, outflow.transactionId],
    authorizedClientGroupIds: ["client-authorized-1"],
    visibleRows: [inflow, outflow],
  });
  assert.deepEqual(refund, {
    ...ROUTE_CONTEXT,
    idempotency_key: "client-deposit-refund-001",
    decisions: [{
      bank_transaction_id: outflow.transactionId,
      category: "refund_reversal",
      refund_of_bank_transaction_id: inflow.transactionId,
      expected_state_version: outflow.stateVersion,
    }],
  });
});

test("실제 classification write 응답은 selected ID·expected/new version·idempotency receipt 없이는 성공으로 표시하지 않는다", () => {
  const rows = classificationRouteBody([classificationItem()]);
  const request = actionRequest();
  const actualRouteResponse = {
    kind: "data",
    outcome: "classified",
    item: { created_count: 1, updated_count: 0, summary: {} },
    idempotent_replay: false,
  };
  const blocked = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(rows),
    requestedTransactionId: "bank-inflow-model-1",
    authorizedTransactionIds: ["bank-inflow-model-1"],
    authorizedClientGroupIds: ["client-authorized-2"],
    actionCommands: { manualLink: { ...request, clientGroupId: "client-authorized-2" } },
    actionResults: { manualLink: actualRouteResponse },
  });
  assert.equal(blocked.actions.manualLink.state, "blocked");
  assert.equal(blocked.actions.manualLink.response, null);
  assert.equal(blocked.actions.manualLink.integrationRequirement.id, CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS.classificationWriteBinding.id);

  const bound = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(rows),
    requestedTransactionId: "bank-inflow-model-1",
    authorizedTransactionIds: ["bank-inflow-model-1"],
    authorizedClientGroupIds: ["client-authorized-2"],
    actionCommands: { manualLink: { ...request, clientGroupId: "client-authorized-2" } },
    actionResults: {
      manualLink: {
        kind: "data",
        status: 200,
        outcome: "classified",
        idempotent_replay: false,
        idempotency_key: request.idempotencyKey,
        raw_source_payload_included: false,
        production_ready_claim: false,
        item: {
          command_receipt: {
            bank_transaction_id: "bank-inflow-model-1",
            bank_transaction_classification_id: "bank-classification-model-1",
            state_version: 2,
            category: "client_receipt",
            status: "confirmed",
            client_group_id: "client-authorized-2",
            refund_of_bank_transaction_id: null,
            idempotency_key: request.idempotencyKey,
            request_fingerprint: HASH,
            raw_source_payload_included: false,
            production_ready_claim: false,
          },
        },
        command_receipts: [{
          bank_transaction_id: "bank-inflow-model-1",
          bank_transaction_classification_id: "bank-classification-model-1",
          state_version: 2,
          category: "client_receipt",
          status: "confirmed",
          client_group_id: "client-authorized-2",
          refund_of_bank_transaction_id: null,
          idempotency_key: request.idempotencyKey,
          request_fingerprint: HASH,
          raw_source_payload_included: false,
          production_ready_claim: false,
        }],
        request_fingerprint: HASH,
      },
    },
  });
  assert.equal(bound.actions.manualLink.state, "data");
  assert.equal(bound.actions.manualLink.response.newVersion, 2);

  const mismatchedReceipt = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(rows),
    requestedTransactionId: "bank-inflow-model-1",
    authorizedTransactionIds: ["bank-inflow-model-1"],
    authorizedClientGroupIds: ["client-authorized-2"],
    actionCommands: { manualLink: { ...request, clientGroupId: "client-authorized-2" } },
    actionResults: {
      manualLink: {
        ...bound.actions.manualLink.response,
        kind: "data",
        outcome: "classified",
        idempotent_replay: false,
        idempotency_key: request.idempotencyKey,
        raw_source_payload_included: false,
        production_ready_claim: false,
        item: {
          command_receipt: {
            bank_transaction_id: "another",
            bank_transaction_classification_id: "bank-classification-model-1",
            state_version: 2,
            category: "client_receipt",
            status: "confirmed",
            client_group_id: "client-authorized-2",
            refund_of_bank_transaction_id: null,
            idempotency_key: request.idempotencyKey,
            request_fingerprint: HASH,
            raw_source_payload_included: false,
            production_ready_claim: false,
          },
        },
        command_receipts: [{
          bank_transaction_id: "another",
          bank_transaction_classification_id: "bank-classification-model-1",
          state_version: 2,
          category: "client_receipt",
          status: "confirmed",
          client_group_id: "client-authorized-2",
          refund_of_bank_transaction_id: null,
          idempotency_key: request.idempotencyKey,
          request_fingerprint: HASH,
          raw_source_payload_included: false,
          production_ready_claim: false,
        }],
        request_fingerprint: HASH,
      },
    },
  });
  assert.equal(mismatchedReceipt.actions.manualLink.state, "blocked");

  const reused = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(rows),
    requestedTransactionId: "bank-inflow-model-1",
    authorizedTransactionIds: ["bank-inflow-model-1"],
    authorizedClientGroupIds: ["client-authorized-1", "client-authorized-2"],
    actionCommands: {
      manualLink: { ...request, clientGroupId: "client-authorized-1" },
      rememberAlias: { ...request, clientGroupId: "client-authorized-2" },
    },
  });
  assert.equal(reused.actions.manualLink.state, "conflict");
  assert.equal(reused.actions.rememberAlias.state, "conflict");
});

test("환불·연결 명령은 거래 방향과 version/allowlist를 함께 확인한다", () => {
  const rows = [
    classificationItem(),
    classificationItem({
      bank_transaction_id: "bank-outflow-model-1",
      bank_transaction_classification_id: "bank-classification-model-outflow",
      transaction_direction: "outflow",
      category: "general_operating",
      category_label: "기타 운영비",
      client_group_id: null,
      client_group_label: null,
      rationale_code: "operating_outflow_fallback",
      confidence: "medium",
    }),
  ];
  const model = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(classificationRouteBody(rows)),
    requestedTransactionId: "bank-outflow-model-1",
    authorizedTransactionIds: rows.map((row) => row.bank_transaction_id),
    authorizedClientGroupIds: ["client-authorized-1"],
    actionCommands: {
      refundLink: {
        ...actionRequest({
          transactionId: "bank-outflow-model-1",
          expectedVersion: 1,
          refundOfTransactionId: "bank-inflow-model-1",
          idempotencyKey: "client-refund-command-001",
        }),
      },
    },
  });
  assert.equal(model.actions.refundLink.command.decisions[0].refund_of_bank_transaction_id, "bank-inflow-model-1");
  assert.equal(model.actions.refundLink.command.decisions[0].bank_transaction_id, "bank-outflow-model-1");
  assert.notEqual(model.actions.refundLink.command.decisions[0].refund_of_bank_transaction_id, model.actions.refundLink.command.decisions[0].bank_transaction_id);

  for (const invalidOrigin of [
    classificationItem({
      bank_transaction_id: "bank-outflow-origin-invalid",
      bank_transaction_classification_id: "bank-classification-outflow-origin-invalid",
      transaction_direction: "outflow",
      category: "refund_reversal",
      category_label: "취소·환급",
      client_group_id: null,
      client_group_label: null,
      status: "review_required",
      confidence: "needs_review",
      rationale_code: "refund_link_required",
    }),
    classificationItem({
      bank_transaction_id: "bank-review-origin-invalid",
      bank_transaction_classification_id: "bank-classification-review-origin-invalid",
      status: "review_required",
      confidence: "needs_review",
      client_group_id: null,
      client_group_label: null,
      rationale_code: "client_name_ambiguous",
    }),
    classificationItem({
      bank_transaction_id: "bank-cross-tenant-origin-invalid",
      bank_transaction_classification_id: "bank-classification-cross-tenant-origin-invalid",
      tenant_id: "tenant-other",
      status: "confirmed",
      confidence: "high",
      rationale_code: "client_exact",
    }),
  ]) {
    const invalid = buildClientDepositOperationsModel({
      classificationsResult: adapterCollection(classificationRouteBody([rows[0], rows[1], invalidOrigin])),
      requestedTransactionId: rows[1].bank_transaction_id,
      authorizedTransactionIds: [rows[0].bank_transaction_id, rows[1].bank_transaction_id, invalidOrigin.bank_transaction_id],
      authorizedClientGroupIds: ["client-authorized-1"],
      actionCommands: {
        refundLink: actionRequest({
          transactionId: rows[1].bank_transaction_id,
          expectedVersion: rows[1].state_version,
          refundOfTransactionId: invalidOrigin.bank_transaction_id,
          idempotencyKey: `client-refund-invalid-${invalidOrigin.bank_transaction_id}`,
        }),
      },
    });
    assert.equal(invalid.actions.refundLink.state, "error");
    assert.equal(invalid.actions.refundLink.command, null);
  }

  const hiddenOrigin = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(classificationRouteBody([rows[0], rows[1]])),
    requestedTransactionId: rows[1].bank_transaction_id,
    authorizedTransactionIds: [rows[0].bank_transaction_id, rows[1].bank_transaction_id, "bank-hidden-origin"],
    authorizedClientGroupIds: ["client-authorized-1"],
    actionCommands: {
      refundLink: actionRequest({
        transactionId: rows[1].bank_transaction_id,
        expectedVersion: rows[1].state_version,
        refundOfTransactionId: "bank-hidden-origin",
        idempotencyKey: "client-refund-hidden-origin-001",
      }),
    },
  });
  assert.equal(hiddenOrigin.actions.refundLink.state, "error");
  assert.equal(hiddenOrigin.actions.refundLink.command, null);

  const forgedSignedTenant = buildClientDepositClassificationReviewCommand({
    type: "refundLink",
    request: actionRequest({
      tenant_id: "tenant-other",
      transactionId: rows[1].bank_transaction_id,
      expectedVersion: rows[1].state_version,
      refundOfTransactionId: rows[0].bank_transaction_id,
      idempotencyKey: "client-refund-forged-tenant-001",
    }),
    selected: model.selectedRow,
    authorizedTransactionIds: rows.map((row) => row.bank_transaction_id),
    authorizedClientGroupIds: ["client-authorized-1"],
    visibleRows: model.rows,
  });
  assert.equal(forgedSignedTenant, null);
});

test("분류 영수증은 요청 context·분류·고객·환불 원거래와 정확히 일치해야 한다", () => {
  const valid = actionModel();
  assert.equal(valid.actions.manualLink.state, "data");

  for (const receiptOverrides of [
    { client_group_id: "client-other" },
    { category: "refund_reversal", refund_of_bank_transaction_id: "bank-other" },
    { bank_transaction_classification_id: "bank-classification-other" },
  ]) {
    const mismatched = actionModel({ result: classificationWriteResult(receiptOverrides) });
    assert.equal(mismatched.actions.manualLink.state, "blocked");
  }

  const multipleReceipts = actionModel({
    result: classificationWriteResult({}, {
      command_receipts: [
        classificationWriteResult().item.command_receipt,
        { ...classificationWriteResult().item.command_receipt, bank_transaction_id: "bank-other" },
      ],
    }),
  });
  assert.equal(multipleReceipts.actions.manualLink.state, "blocked");

  const topLevelUnsafe = actionModel({
    result: classificationWriteResult({}, {
      raw_source_payload_included: true,
      production_ready_claim: true,
    }),
  });
  assert.equal(topLevelUnsafe.actions.manualLink.state, "blocked");

  const impossibleClassificationOutcome = actionModel({
    result: classificationWriteResult({}, { outcome: "imported" }),
  });
  assert.equal(impossibleClassificationOutcome.actions.manualLink.state, "conflict");

  const forgedTenant = actionModel({
    request: actionRequest({
      tenant_id: "tenant-other",
      clientGroupId: "client-authorized-2",
    }),
    result: null,
  });
  assert.equal(forgedTenant.actions.manualLink.state, "error");
  assert.equal(forgedTenant.actions.manualLink.command, null);

  const forgedResultTenant = actionModel({
    result: classificationWriteResult({}, { tenant_id: "tenant-other" }),
  });
  assert.equal(forgedResultTenant.actions.manualLink.state, "blocked");
});

test("선택은 명시 거래만 허용하고 원본 상세 endpoint 부재는 unavailable로 표시한다", () => {
  const result = selectedRows();
  assert.equal(result.selectedTransactionId, "bank-inflow-model-1");
  const noSelection = buildClientDepositOperationsModel({ classificationsResult: adapterCollection(classificationRouteBody()) });
  assert.equal(noSelection.selectedTransactionId, null);
  assert.equal(noSelection.selectionIsExplicit, false);
  assert.equal(resolveClientDepositSelection("bank-hidden", ["bank-inflow-model-1"]), null);
  const hidden = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(classificationRouteBody()),
    requestedTransactionId: "bank-hidden",
  });
  assert.equal(hidden.requestedTransactionAvailable, false);
  assert.equal(JSON.stringify(hidden).includes("bank-hidden"), false);
  assert.equal(result.sourceDetail.state, "unavailable");
  assert.equal(result.sourceDetail.available, false);
  assert.equal(result.sourceDetail.integrationRequirement.id, CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS.sourceDetailAdapter.id);
  const ignored = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(classificationRouteBody()),
    requestedTransactionId: "bank-inflow-model-1",
    sourceDetailResult: { kind: "data", item: { bank_transaction_id: "bank-inflow-model-1", amount: 1_500 } },
  });
  assert.equal(ignored.sourceDetail.state, "unavailable");
  assert.equal(ignored.sourceDetailResultIgnored, true);
});

test("분류 모순은 자동·수동·환불 완료 라벨이 되지 않고 상태 문구는 고정된다", () => {
  const hostile = classificationItem({
    status: "review_required",
    confidence: "needs_review",
    client_group_id: null,
    rationale_code: "client_name_ambiguous",
  });
  const model = buildClientDepositOperationsModel({
    classificationsResult: adapterCollection(classificationRouteBody([hostile])),
  });
  assert.equal(model.rows[0].linkKind, "needs_review");
  assert.equal(clientDepositLinkLabel("unknown"), CLIENT_DEPOSIT_LINK_COPY.needs_review);
  assert.equal(clientDepositImportPhaseLabel("unknown"), CLIENT_DEPOSIT_IMPORT_PHASE_COPY.error);
  assert.equal(clientDepositRowStatusLabel("confirmed"), "반영됨");
  assert.equal(clientDepositResultState(null), "loading");
});
