import assert from "node:assert/strict";
import test from "node:test";

import {
  autoClassifyClientDeposit,
  confirmClientDepositBankImport,
  encodeClientDepositBankFile,
  fetchClientDepositDetail,
  fetchClientDeposits,
  getClientDepositRouteContext,
  previewClientDepositBankImport,
  reviewClientDepositClassification
} from "../src/data/apiClient.js";
import {
  buildClientDepositOperationsModel,
  CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS
} from "../src/components/ClientDepositOperationsModel.js";

const TENANT = "tenant-client-deposit-adapter";
const TRANSACTION = "bank-client-deposit-adapter-1";
const CLASSIFICATION = "bank-classification-adapter-1";
const CLIENT = "client-adapter-1";
const HASH = "a".repeat(64);
const PREVIEW_ID = `bank_import_preview_${"b".repeat(24)}`;

function sessionStorageFixture() {
  const values = new Map([[
    "lawos.api.session",
    JSON.stringify({
      session_token: "lawos_session_v1.client_deposit_adapter",
      expires_at: "2099-01-01T00:00:00.000Z"
    })
  ]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function installSession() {
  globalThis.sessionStorage = sessionStorageFixture();
  globalThis.__LAWOS_SESSION_CONTEXT__ = {
    schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
    state: "signed_in",
    session_ref: "session-client-deposit-adapter",
    source: "api_signed_session",
    actor_ref: "user-client-deposit-adapter",
    tenant_refs: {
      default: TENANT,
      client: TENANT
    },
    role_ids: ["system_super_admin"],
    scopes: ["finance.bank.read", "finance.bank.classify", "finance.bank.import"],
    review_state: "allow",
    expires_at: "2099-01-01T00:00:00.000Z"
  };
}

function removeSession() {
  delete globalThis.sessionStorage;
  delete globalThis.__LAWOS_SESSION_CONTEXT__;
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function supportedCommands() {
  const responseBindingFields = [
    "bank_transaction_id",
    "bank_transaction_classification_id",
    "state_version",
    "client_group_id",
    "refund_of_bank_transaction_id",
    "idempotency_key",
    "request_fingerprint"
  ];
  return [
    {
      command: "auto_classify",
      method: "POST",
      path: "/api/finance/bank-classifications/auto",
      required_body_fields: ["tenant_id", "bank_transaction_id", "expected_state_version"],
      response_binding_fields: responseBindingFields
    },
    {
      command: "manual_client_link",
      method: "POST",
      path: "/api/finance/bank-classifications/review",
      required_body_fields: ["tenant_id", "decisions[].bank_transaction_id"],
      response_binding_fields: responseBindingFields
    },
    {
      command: "refund_link",
      method: "POST",
      path: "/api/finance/bank-classifications/review",
      required_body_fields: ["tenant_id", "decisions[].refund_of_bank_transaction_id"],
      response_binding_fields: responseBindingFields
    }
  ];
}

function depositItem(overrides = {}) {
  return {
    model_type: "ClientDeposit",
    resource_id: TRANSACTION,
    tenant_id: TENANT,
    bank_transaction_id: TRANSACTION,
    bank_transaction_classification_id: CLASSIFICATION,
    transaction_date: "2026-07-31",
    occurred_at: "2026-07-31T05:00:00.000Z",
    transaction_direction: "inflow",
    amount: 1_500_000,
    currency: "KRW",
    category: "client_receipt",
    category_label: "고객 매출",
    primary_type: "sales",
    client_group_id: CLIENT,
    client_group_label: "한빛 제조",
    status: "confirmed",
    confidence: "high",
    classification_source: "automatic",
    rationale_code: "client_exact",
    manual_lock: false,
    refund_of_bank_transaction_id: null,
    state_version: 3,
    source_type: "xlsx",
    source_file_sha256: HASH,
    source_row_number: 4,
    source_page_number: null,
    bank_reference_hash: "c".repeat(64),
    available_commands: ["auto_classify", "manual_client_link"],
    source_metadata_included: false,
    raw_source_payload_included: false,
    raw_account_included: false,
    raw_counterparty_included: false,
    raw_memo_included: false,
    transaction_fingerprint_included: false,
    credential_material_included: false,
    production_ready_claim: false,
    ...overrides
  };
}

function listBody(items = [depositItem()], extra = {}) {
  return {
    request_id: "request-client-deposit-adapter-list",
    outcome: "passed",
    ui_state: items.length ? null : "empty",
    items,
    supported_commands: supportedCommands(),
    page_info: {
      returned_count: items.length,
      omitted_item_count: null,
      has_more: false,
      next_cursor: null
    },
    safe_error_codes: [],
    audit_hint_ref: "ui_client_deposit_operations_probe",
    permission_prefilter_applied: true,
    count_leak_prevented: true,
    unauthorized_count_included: false,
    raw_source_payload_included: false,
    production_ready_claim: false,
    ...extra
  };
}

function detailBody(item = depositItem(), extra = {}) {
  const { items, page_info, ...body } = listBody([item], extra);
  return { ...body, item };
}

function sourceFile(name, type, bytes = [1, 2, 3, 4]) {
  const buffer = Uint8Array.from(bytes).buffer;
  return {
    name,
    type,
    size: buffer.byteLength,
    arrayBuffer: async () => buffer
  };
}

function previewBody({ duplicate = false, sourceType = "xlsx" } = {}) {
  const status = duplicate ? "duplicate" : "new";
  return {
    request_id: "request-client-deposit-adapter-preview",
    outcome: "preview_ready",
    preview: {
      preview_id: PREVIEW_ID,
      preview_manifest_sha256: "d".repeat(64),
      source_file_sha256: HASH,
      source_type: sourceType,
      account_ref: "운영계좌",
      counts: {
        total: 1,
        new: duplicate ? 0 : 1,
        duplicate: duplicate ? 1 : 0,
        error: 0
      },
      items: [{
        row_number: 1,
        status,
        source_type: sourceType,
        bank_transaction_id: TRANSACTION,
        duplicate_of_bank_transaction_id: duplicate ? TRANSACTION : null,
        account_ref: "raw-account-must-not-project",
        date: "2026-07-31",
        occurred_at: "2026-07-31T05:00:00.000Z",
        direction: "inflow",
        amount: 1_500_000,
        balance_after: 2_000_000,
        currency: "KRW",
        method: "raw-method-must-not-project",
        counterparty: "raw-counterparty-must-not-project",
        source_metadata_included: false,
        transaction_fingerprint_included: false,
        raw_source_payload_included: false
      }],
      preview_confirmation_token: "preview-confirmation-secret-boundary",
      confirmation_expires_at: "2099-01-01T00:00:00.000Z",
      confirmation_token_included: true,
      product_records_mutated: false,
      raw_source_payload_included: false
    },
    safe_error_codes: [],
    audit_hint_ref: "ui_client_deposit_operations_probe",
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function receipt(overrides = {}) {
  return {
    bank_transaction_id: TRANSACTION,
    bank_transaction_classification_id: CLASSIFICATION,
    state_version: 4,
    category: "client_receipt",
    status: "confirmed",
    client_group_id: CLIENT,
    refund_of_bank_transaction_id: null,
    idempotency_key: "client-deposit-command-adapter-001",
    request_fingerprint: HASH,
    raw_source_payload_included: false,
    production_ready_claim: false,
    ...overrides
  };
}

function commandBody(receiptValue = receipt(), extra = {}) {
  return {
    request_id: "request-client-deposit-adapter-command",
    outcome: "classified",
    item: { command_receipt: receiptValue },
    command_receipts: [receiptValue],
    idempotency_key: receiptValue.idempotency_key,
    request_fingerprint: receiptValue.request_fingerprint,
    idempotent_replay: false,
    safe_error_codes: [],
    audit_hint_ref: "ui_client_deposit_operations_probe",
    raw_source_payload_included: false,
    production_ready_claim: false,
    ...extra
  };
}

test("public integration registry marks the implemented deposit adapters available", () => {
  for (const integration of Object.values(CLIENT_DEPOSIT_INTEGRATION_REQUIREMENTS)) {
    assert.equal(integration.status, "available", integration.id);
  }
});

test("client-deposits adapter requires one matching signed client/default tenant", async (t) => {
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return response(listBody());
  };
  const missing = await fetchClientDeposits();
  assert.equal(missing.kind, "blocked");
  assert.equal(called, false);

  installSession();
  globalThis.__LAWOS_SESSION_CONTEXT__.tenant_refs.client = "tenant-other";
  assert.equal(getClientDepositRouteContext(), null);
  const mismatch = await fetchClientDeposits();
  assert.equal(mismatch.kind, "blocked");
  assert.equal(called, false);
});

test("list/detail adapters preserve cursor and project only safe deposit fields", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const calls = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input: String(input), init });
    const url = new URL(String(input), "http://lawos.test");
    return response(url.pathname.endsWith(`/${TRANSACTION}`)
      ? detailBody({ ...depositItem(), counterparty: "should-never-project", invoice_id: "invoice-forbidden", matter_id: "matter-forbidden" })
      : listBody([{ ...depositItem(), counterparty: "should-never-project", invoice_id: "invoice-forbidden", matter_id: "matter-forbidden" }], {
        page_info: {
          returned_count: 1,
          omitted_item_count: null,
          has_more: true,
          next_cursor: "cursor-safe-2"
        }
      }));
  };

  const listed = await fetchClientDeposits({
    from: "2026-07-01",
    direction: "inflow",
    limit: 1,
    cursor: "cursor-safe-1"
  });
  assert.equal(listed.kind, "data");
  assert.deepEqual(listed.pageInfo, {
    returnedCount: 1,
    omittedItemCount: null,
    hasMore: true,
    nextCursor: "cursor-safe-2"
  });
  assert.match(calls[0].input, /cursor=cursor-safe-1/u);
  assert.equal(JSON.stringify(listed).includes("should-never-project"), false);
  assert.equal(JSON.stringify(listed).includes("invoice"), false);
  assert.equal(JSON.stringify(listed).includes("matter"), false);

  const detail = await fetchClientDepositDetail({
    transactionId: TRANSACTION,
    expectedClassificationId: CLASSIFICATION
  });
  assert.equal(detail.kind, "data");
  assert.equal(detail.item.source_row_number, 4);
  assert.equal(detail.item.bank_reference_hash, "c".repeat(64));
  assert.equal(JSON.stringify(detail).includes("should-never-project"), false);

  const model = buildClientDepositOperationsModel({
    classificationsResult: listed,
    requestedTransactionId: TRANSACTION
  });
  assert.equal(model.state, "data");
  assert.equal(model.selectedRow.transactionId, TRANSACTION);
});

test("list adapter fails closed on tenant, ACL proof, or raw-source contradictions", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const bodies = [
    listBody([depositItem({ tenant_id: "tenant-other" })]),
    listBody([depositItem()], { permission_prefilter_applied: false }),
    listBody([depositItem({ raw_memo_included: true })])
  ];
  globalThis.fetch = async () => response(bodies.shift());
  for (const expected of ["tenant", "acl", "raw"]) {
    const result = await fetchClientDeposits();
    assert.equal(result.kind, "error", expected);
    assert.deepEqual(result.items, [], expected);
  }
});

test("zero-row partial remains partial with safe source codes", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  globalThis.fetch = async () => response(listBody([], {
    outcome: "partial",
    ui_state: "partial",
    safe_error_codes: ["SOURCE_PARTIAL"]
  }));

  const result = await fetchClientDeposits();

  assert.equal(result.kind, "partial");
  assert.equal(result.uiState, "partial");
  assert.deepEqual(result.items, []);
  assert.deepEqual(result.safeErrorCodes, ["SOURCE_PARTIAL"]);
  const model = buildClientDepositOperationsModel({
    classificationsResult: result
  });
  assert.equal(model.state, "partial");
  assert.deepEqual(model.rows, []);
});

test("non-JSON HTTP errors preserve status and guarded kind", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const responses = [409, 403, 503].map((status) => new Response("<html>error</html>", {
    status,
    headers: { "content-type": "text/html" }
  }));
  globalThis.fetch = async () => responses.shift();

  const conflict = await fetchClientDeposits();
  const denied = await fetchClientDeposits();
  const unavailable = await fetchClientDeposits();

  assert.deepEqual(
    [conflict.kind, conflict.status, conflict.uiState],
    ["conflict", 409, "conflict"]
  );
  assert.deepEqual(
    [denied.kind, denied.status, denied.uiState],
    ["guarded", 403, "denied"]
  );
  assert.deepEqual(
    [unavailable.kind, unavailable.status, unavailable.uiState],
    ["error", 503, "error"]
  );
  for (const result of [conflict, denied, unavailable]) {
    assert.deepEqual(result.safeErrorCodes, ["INVALID_ERROR_RESPONSE"]);
    assert.notEqual(result.status, 0);
  }
  globalThis.fetch = async () => {
    throw new TypeError("transport unavailable");
  };
  const transport = await fetchClientDeposits();
  assert.equal(transport.status, 0);
  assert.deepEqual(transport.safeErrorCodes, ["NETWORK_ERROR"]);
});

test("XLSX/PDF preview sends metadata plus base64 only and projects duplicate-safe rows", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const payloads = [];
  const bodies = [previewBody(), previewBody({ duplicate: true, sourceType: "pdf" })];
  globalThis.fetch = async (_input, init) => {
    payloads.push(JSON.parse(init.body));
    return response(bodies.shift());
  };
  const xlsx = sourceFile(
    "transactions.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  const pdf = sourceFile("statement.pdf", "application/pdf", [37, 80, 68, 70]);
  const encodedXlsx = await encodeClientDepositBankFile(xlsx);
  const encodedPdf = await encodeClientDepositBankFile(pdf);
  assert.equal(encodedXlsx.content_base64, "AQIDBA==");
  assert.equal(encodedPdf.content_base64, "JVBERg==");

  const first = await previewClientDepositBankImport({
    file: xlsx,
    accountRef: "운영계좌"
  });
  const duplicate = await previewClientDepositBankImport({
    file: pdf,
    accountRef: "운영계좌"
  });
  assert.equal(first.adapter_capability, "finance-bank-import-preview-v1");
  assert.equal(first.preview.items[0].amount, 1_500_000);
  assert.equal(duplicate.preview.counts.duplicate, 1);
  assert.equal(JSON.stringify(first).includes("raw-counterparty"), false);
  for (const payload of payloads) {
    assert.deepEqual(Object.keys(payload).sort(), [
      "account_ref",
      "audit_hint_ref",
      "file",
      "permission_ref",
      "tenant_id"
    ]);
    assert.equal("transactions" in payload, false);
    assert.equal("matter_id" in payload, false);
    assert.equal("invoice_id" in payload, false);
    assert.deepEqual(Object.keys(payload.file).sort(), [
      "byte_size",
      "content_base64",
      "filename",
      "mime_type"
    ]);
  }
  const duplicateModel = buildClientDepositOperationsModel({
    previewResult: duplicate
  });
  assert.equal(duplicateModel.preview.duplicateFile, true);
  assert.equal(duplicateModel.canConfirmImport, false);
});

test("pre-encoded preview and confirm reject malformed or oversized files before fetch", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return response(previewBody());
  };
  const valid = await encodeClientDepositBankFile(sourceFile(
    "transactions.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ));
  const accepted = await previewClientDepositBankImport({
    file: valid,
    accountRef: "운영계좌"
  });
  assert.equal(accepted.kind, "data");
  assert.equal(fetchCount, 1);

  const invalidFiles = [
    {
      filename: "payload.exe",
      mime_type: "application/x-msdownload",
      byte_size: 4,
      content_base64: "AQIDBA=="
    },
    { ...valid, mime_type: "application/pdf" },
    { ...valid, content_base64: "@@@@" },
    { ...valid, content_base64: "AB==" },
    { ...valid, byte_size: 3 },
    { ...valid, byte_size: (16 * 1024 * 1024) + 1 }
  ];
  for (const [index, file] of invalidFiles.entries()) {
    const result = await previewClientDepositBankImport({
      file,
      accountRef: "운영계좌"
    });
    assert.equal(result.kind, "error", `invalid preview file ${index}`);
    assert.deepEqual(result.safeErrorCodes, ["SOURCE_FILE_INVALID"]);
  }
  assert.equal(fetchCount, 1);

  const route = getClientDepositRouteContext();
  const invalidConfirm = await confirmClientDepositBankImport({
    command: {
      tenant_id: route.tenant_id,
      permission_ref: route.permission_ref,
      audit_hint_ref: route.audit_hint_ref,
      account_ref: "운영계좌",
      file: { ...valid, content_base64: "@@@@" },
      production_import_approved: true,
      preview_confirmation_token: "preview-confirmation-secret-boundary",
      idempotency_key: "client-deposit-import-invalid-file"
    },
    expectedPreview: { previewId: PREVIEW_ID, counts: { new: 1 } }
  });
  assert.equal(invalidConfirm.kind, "error");
  assert.deepEqual(invalidConfirm.safeErrorCodes, ["INVALID_COMMAND"]);
  assert.equal(fetchCount, 1);
});

test("confirm adapter accepts created/replay binding and exposes 409 as retryable conflict", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const file = await encodeClientDepositBankFile(sourceFile(
    "transactions.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ));
  const route = getClientDepositRouteContext();
  const command = {
    tenant_id: route.tenant_id,
    permission_ref: route.permission_ref,
    audit_hint_ref: route.audit_hint_ref,
    account_ref: "운영계좌",
    file,
    production_import_approved: true,
    preview_confirmation_token: "preview-confirmation-secret-boundary",
    idempotency_key: "client-deposit-import-adapter-001"
  };
  const imported = {
    request_id: "request-import",
    outcome: "created",
    item: {
      model_type: "BankImportBatch",
      bank_import_batch_id: "batch-adapter-1",
      tenant_id: TENANT,
      preview_id: PREVIEW_ID,
      source_file_sha256: HASH,
      source_type: "xlsx",
      account_ref: "운영계좌",
      transaction_count: 1,
      source_hashes_included: false,
      raw_source_payload_included: false,
      credential_material_included: false,
      production_ready_claim: false
    },
    transaction_count: 1,
    confirmed_preview_id: PREVIEW_ID,
    safe_error_codes: [],
    idempotent_replay: false,
    confirmation_token_included: false,
    raw_source_payload_included: false,
    production_ready_claim: false
  };
  const conflict = {
    request_id: "request-import-conflict",
    outcome: "blocked",
    ui_state: "blocked",
    safe_error_codes: ["FINANCE_IDEMPOTENCY_CONFLICT"],
    production_ready_claim: false
  };
  const bodies = [
    [imported, 201],
    [{ ...imported, outcome: "idempotent_replay", idempotent_replay: true }, 200],
    [conflict, 409]
  ];
  globalThis.fetch = async () => {
    const [body, status] = bodies.shift();
    return response(body, status);
  };
  const expectedPreview = { previewId: PREVIEW_ID, counts: { new: 1 } };
  const created = await confirmClientDepositBankImport({ command, expectedPreview });
  const replay = await confirmClientDepositBankImport({ command, expectedPreview });
  const collided = await confirmClientDepositBankImport({ command, expectedPreview });
  assert.equal(created.outcome, "created");
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(replay.idempotentReplay, true);
  assert.equal(collided.kind, "conflict");
  assert.equal(collided.uiState, "conflict");
});

test("auto/manual/refund adapters require one receipt bound to transaction, ACL selection, and version", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const route = getClientDepositRouteContext();
  const baseCommand = {
    tenant_id: route.tenant_id,
    permission_ref: route.permission_ref,
    audit_hint_ref: route.audit_hint_ref,
    idempotency_key: "client-deposit-command-adapter-001"
  };
  const binding = {
    tenant_id: TENANT,
    selected_transaction_id: TRANSACTION,
    selected_classification_id: CLASSIFICATION,
    expected_state_version: 3,
    expected_category: "client_receipt",
    expected_status: "confirmed",
    expected_client_group_id: CLIENT,
    expected_refund_of_bank_transaction_id: null
  };
  const autoCommand = {
    ...baseCommand,
    bank_transaction_id: TRANSACTION,
    expected_state_version: 3
  };
  const manualCommand = {
    ...baseCommand,
    decisions: [{
      bank_transaction_id: TRANSACTION,
      category: "client_receipt",
      client_group_id: CLIENT,
      expected_state_version: 3
    }]
  };
  const refundTransaction = "bank-refund-adapter-1";
  const refundClassification = "bank-classification-refund-adapter-1";
  const refundReceipt = receipt({
    bank_transaction_id: refundTransaction,
    bank_transaction_classification_id: refundClassification,
    category: "refund_reversal",
    refund_of_bank_transaction_id: TRANSACTION
  });
  const refundCommand = {
    ...baseCommand,
    decisions: [{
      bank_transaction_id: refundTransaction,
      category: "refund_reversal",
      refund_of_bank_transaction_id: TRANSACTION,
      expected_state_version: 3
    }]
  };
  const refundBinding = {
    ...binding,
    selected_transaction_id: refundTransaction,
    selected_classification_id: refundClassification,
    expected_category: "refund_reversal",
    expected_refund_of_bank_transaction_id: TRANSACTION
  };
  const bodies = [
    commandBody(),
    commandBody(),
    commandBody(refundReceipt),
    commandBody(receipt({ bank_transaction_id: "bank-hidden-other" })),
    commandBody(receipt({ state_version: 2 }))
  ];
  globalThis.fetch = async () => response(bodies.shift());

  const auto = await autoClassifyClientDeposit({
    command: autoCommand,
    binding
  });
  const manual = await reviewClientDepositClassification({
    command: manualCommand,
    binding
  });
  const refund = await reviewClientDepositClassification({
    command: refundCommand,
    binding: refundBinding
  });
  const mismatchedAcl = await reviewClientDepositClassification({
    command: manualCommand,
    binding
  });
  const staleVersion = await reviewClientDepositClassification({
    command: manualCommand,
    binding
  });
  assert.equal(auto.kind, "data");
  assert.equal(manual.kind, "data");
  assert.equal(refund.kind, "data");
  assert.equal(refund.command_receipts[0].refund_of_bank_transaction_id, TRANSACTION);
  assert.equal(mismatchedAcl.kind, "blocked");
  assert.equal(staleVersion.kind, "blocked");
  assert.equal(JSON.stringify(manual).includes("invoice"), false);
  assert.equal(JSON.stringify(manual).includes("matter"), false);
});
