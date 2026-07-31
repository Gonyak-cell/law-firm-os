import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import {
  createFinanceRuntimeContext,
  handleFinanceApiRequest,
} from "../src/finance-runtime-context.js";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  highestPrivilegeRegisteredAccount,
} from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const TENANT = "tenant-client-deposit-api";
const ACTOR = "user-client-deposit-api";
const QUERY = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "perm-client-deposit-api",
  audit_hint_ref: "audit-client-deposit-api",
});
const FINANCE_IDEMPOTENCY_CONFLICT = "FINANCE_IDEMPOTENCY_CONFLICT";

function permissionContext({ tenantId = TENANT, objectAcl = [] } = {}) {
  return {
    principal: {
      user_id: ACTOR,
      tenant_id: tenantId,
      role_ids: ["system_super_admin"],
    },
    rules: [{ id: "allow-client-deposit-api", effect: "allow", action: "*" }],
    object_acl: objectAcl,
  };
}

function transaction(id, {
  tenantId = TENANT,
  direction = "inflow",
  amount = 1_000_000,
  counterparty = "원본 거래처 비공개",
  sourceHash = "a".repeat(64),
} = {}) {
  return {
    model_type: "BankTransaction",
    bank_transaction_id: id,
    tenant_id: tenantId,
    account_ref: "raw-account-number-secret",
    transaction_fingerprint: createHash("sha256").update(id).digest("hex"),
    date: "2026-07-31",
    occurred_at: "2026-07-31T09:00:00+09:00",
    direction,
    amount,
    balance_after: 99_000_000,
    currency: "KRW",
    counterparty,
    memo: "raw-bank-memo-secret",
    source_category: direction === "inflow" ? "입금" : "고객 환불",
    classification_scope: "unreviewed",
    source_refs: [{
      source_type: "xlsx",
      source_hash: sourceHash,
      sheet: "입금내역",
      row: 7,
    }],
    status: "posted",
  };
}

function classificationId(tenantId, transactionId) {
  const digest = createHash("sha256")
    .update(`${tenantId}|${transactionId}`)
    .digest("hex")
    .slice(0, 24);
  return `bank_classification_${digest}`;
}

function classification(bankTransaction, {
  category = "client_receipt",
  clientGroupId = "client-a",
  status = "confirmed",
  stateVersion = 1,
  rationaleCode = "client_exact",
  classificationSource = "automatic",
  confidence = status === "confirmed" ? "high" : "needs_review",
  refundOf = null,
} = {}) {
  return {
    model_type: "BankTransactionClassification",
    bank_transaction_classification_id: classificationId(
      bankTransaction.tenant_id,
      bankTransaction.bank_transaction_id,
    ),
    tenant_id: bankTransaction.tenant_id,
    bank_transaction_id: bankTransaction.bank_transaction_id,
    transaction_date: bankTransaction.date,
    transaction_month: bankTransaction.date.slice(0, 7),
    transaction_direction: bankTransaction.direction,
    amount: bankTransaction.amount,
    currency: "KRW",
    primary_type: category === "client_receipt" ? "sales" : "non_operating",
    category,
    category_label: category === "client_receipt" ? "고객 매출" : "기타 입금",
    client_group_id: clientGroupId,
    status,
    confidence,
    classification_source: classificationSource,
    rationale_code: rationaleCode,
    manual_lock: false,
    refund_of_bank_transaction_id: refundOf,
    state_version: stateVersion,
  };
}

function runtimeWith(records, clientRecords = [], employees = []) {
  const repository = createFinanceRepository({ seedRecords: records });
  return {
    repository,
    runtime: createFinanceRuntimeContext({
      repository,
      clientRecords,
      employees,
    }),
  };
}

async function request({
  runtime,
  pathname,
  method = "GET",
  query = QUERY,
  body = {},
  context = permissionContext(),
  requestId = "request-client-deposit-api",
}) {
  return handleFinanceApiRequest({
    pathname,
    method,
    query,
    body,
    context,
    requestId,
    runtime,
  });
}

test("client deposit list/detail prefilter ACLs and expose only bank-safe source references", async () => {
  const visible = transaction("bank-visible");
  const hidden = transaction("bank-hidden", {
    counterparty: "숨은 주민등록번호 000000-0000000",
  });
  hidden.occurred_at = null;
  hidden.amount = "malformed-hidden-amount";
  const hiddenClient = transaction("bank-hidden-client");
  hiddenClient.occurred_at = null;
  hiddenClient.amount = "malformed-hidden-client-amount";
  const nonDeposit = transaction("bank-non-deposit", {
    direction: "outflow",
  });
  const otherTenant = transaction("bank-other-tenant", {
    tenantId: "tenant-other",
  });
  const { repository, runtime } = runtimeWith(
    [
      visible,
      hidden,
      hiddenClient,
      nonDeposit,
      otherTenant,
      classification(visible),
      classification(hidden),
      classification(hiddenClient, { clientGroupId: "client-b" }),
      classification(nonDeposit, {
        category: "salary_payment",
        clientGroupId: null,
      }),
      classification(otherTenant),
    ],
    [
      {
        model_type: "ClientGroup",
        tenant_id: TENANT,
        client_group_id: "client-a",
        display_name: "허용 고객",
        status: "active",
      },
      {
        model_type: "ClientGroup",
        tenant_id: TENANT,
        client_group_id: "client-b",
        display_name: "차단 고객",
        status: "active",
      },
    ],
  );
  const context = permissionContext({
    objectAcl: [
      {
        id: "deny-hidden-deposit",
        effect: "deny",
        principal_id: ACTOR,
        resource_id: hidden.bank_transaction_id,
        action: "*",
      },
      {
        id: "deny-client-b",
        effect: "deny",
        principal_id: ACTOR,
        resource_id: "client-b",
        action: "*",
      },
    ],
  });

  const list = await request({
    runtime,
    pathname: "/api/finance/client-deposits",
    context,
  });
  assert.equal(list.status, 200);
  assert.equal(list.body.permission_prefilter_applied, true);
  assert.equal(list.body.count_leak_prevented, true);
  assert.equal(list.body.unauthorized_count_included, false);
  assert.deepEqual(
    list.body.items.map((item) => item.bank_transaction_id),
    [visible.bank_transaction_id],
  );
  assert.equal(list.body.page_info.omitted_item_count, null);
  assert.deepEqual(
    list.body.supported_commands.map((item) => [item.command, item.path]),
    [
      ["auto_classify", "/api/finance/bank-classifications/auto"],
      ["manual_client_link", "/api/finance/bank-classifications/review"],
      ["refund_link", "/api/finance/bank-classifications/review"],
    ],
  );
  const options = await request({
    runtime,
    pathname: "/api/finance/bank-classification-options",
    context,
  });
  assert.equal(options.status, 200);
  assert.deepEqual(
    options.body.item.clients.map((client) => client.client_group_id),
    ["client-a"],
  );
  const deniedClientFilter = await request({
    runtime,
    pathname: "/api/finance/client-deposits",
    query: { ...QUERY, client_group_id: "client-b" },
    context,
  });
  assert.equal(deniedClientFilter.status, 403);
  assert.deepEqual(
    deniedClientFilter.body.safe_error_codes,
    ["FINANCE_UNAUTHORIZED_OMISSION"],
  );

  const detail = await request({
    runtime,
    pathname: `/api/finance/client-deposits/${visible.bank_transaction_id}`,
    context,
  });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.item.source_file_sha256, "a".repeat(64));
  assert.equal(detail.body.item.source_row_number, 7);
  assert.match(detail.body.item.bank_reference_hash, /^[a-f0-9]{64}$/u);
  assert.deepEqual(
    {
      date: detail.body.item.transaction_date,
      direction: detail.body.item.transaction_direction,
      amount: detail.body.item.amount,
      currency: detail.body.item.currency,
    },
    {
      date: "2026-07-31",
      direction: "inflow",
      amount: 1_000_000,
      currency: "KRW",
    },
  );
  const serialized = JSON.stringify(detail.body);
  for (const secret of [
    "raw-account-number-secret",
    "원본 거래처 비공개",
    "raw-bank-memo-secret",
    "source_refs",
    "balance_after",
  ]) {
    assert.equal(serialized.includes(secret), false, secret);
  }
  assert.equal(detail.body.item.transaction_fingerprint, undefined);
  const nonDepositDetail = await request({
    runtime,
    pathname:
      `/api/finance/client-deposits/${nonDeposit.bank_transaction_id}`,
    context,
  });
  assert.equal(nonDepositDetail.status, 404);
  assert.equal(nonDepositDetail.body.item, null);
  const hiddenClientDetail = await request({
    runtime,
    pathname:
      `/api/finance/client-deposits/${hiddenClient.bank_transaction_id}`,
    context,
  });
  assert.equal(hiddenClientDetail.status, 404);
  assert.equal(hiddenClientDetail.body.item, null);

  const hiddenDetail = await request({
    runtime,
    pathname: `/api/finance/client-deposits/${hidden.bank_transaction_id}`,
    context,
  });
  const missingWithSameAcl = await request({
    runtime,
    pathname: "/api/finance/client-deposits/bank-missing",
    context: permissionContext({
      objectAcl: [{
        id: "deny-missing-deposit",
        effect: "deny",
        principal_id: ACTOR,
        resource_id: "bank-missing",
        action: "*",
      }],
    }),
  });
  assert.equal(hiddenDetail.status, 403);
  assert.equal(missingWithSameAcl.status, 403);
  assert.deepEqual(
    hiddenDetail.body.safe_error_codes,
    missingWithSameAcl.body.safe_error_codes,
  );
  assert.deepEqual(hiddenDetail.body.items, []);

  const crossTenant = await request({
    runtime,
    pathname: "/api/finance/client-deposits",
    query: { ...QUERY, tenant_id: "tenant-other" },
    context,
  });
  assert.equal(crossTenant.status, 403);
  assert.deepEqual(crossTenant.body.items, []);
  repository.close();
});

test("targeted auto/manual/refund commands bind transaction, version, key, and fingerprint", async () => {
  const ambiguous = transaction("bank-ambiguous", {
    counterparty: "한빛",
  });
  const manual = transaction("bank-manual");
  const unauthorized = transaction("bank-unauthorized");
  const original = transaction("bank-original", { amount: 3_000_000 });
  const refund = transaction("bank-refund", {
    direction: "outflow",
    amount: 1_000_000,
  });
  const records = [
    ambiguous,
    manual,
    unauthorized,
    original,
    refund,
    classification(ambiguous, {
      category: "other_inflow",
      clientGroupId: null,
      status: "review_required",
      rationaleCode: "client_name_ambiguous",
    }),
    classification(manual, {
      category: "other_inflow",
      clientGroupId: null,
      status: "review_required",
      rationaleCode: "no_registered_client_match",
    }),
    classification(unauthorized, {
      category: "other_inflow",
      clientGroupId: null,
      status: "review_required",
      rationaleCode: "no_registered_client_match",
    }),
    classification(original),
    classification(refund, {
      category: "refund_reversal",
      clientGroupId: null,
      status: "review_required",
      rationaleCode: "refund_link_required",
    }),
  ];
  const clients = [
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-a",
      display_name: "새봄",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-b",
      display_name: "한빛",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-c",
      display_name: "한빛",
      status: "active",
    },
  ];
  const { repository, runtime } = runtimeWith(records, clients);

  const automaticBody = {
    ...QUERY,
    bank_transaction_id: ambiguous.bank_transaction_id,
    expected_state_version: 1,
    idempotency_key: "client-auto-ambiguous-001",
  };
  const automatic = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/auto",
    method: "POST",
    query: {},
    body: automaticBody,
  });
  assert.equal(automatic.status, 200, JSON.stringify(automatic.body));
  assert.deepEqual(
    {
      transaction: automatic.body.item.command_receipt.bank_transaction_id,
      version: automatic.body.item.command_receipt.state_version,
      category: automatic.body.item.command_receipt.category,
      status: automatic.body.item.command_receipt.status,
      client: automatic.body.item.command_receipt.client_group_id,
      key: automatic.body.item.command_receipt.idempotency_key,
    },
    {
      transaction: ambiguous.bank_transaction_id,
      version: 2,
      category: "other_inflow",
      status: "review_required",
      client: null,
      key: automaticBody.idempotency_key,
    },
  );
  assert.match(
    automatic.body.item.command_receipt.request_fingerprint,
    /^[a-f0-9]{64}$/u,
  );
  const automaticReplay = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/auto",
    method: "POST",
    query: {},
    body: automaticBody,
  });
  assert.equal(automaticReplay.body.outcome, "idempotent_replay");
  assert.deepEqual(
    automaticReplay.body.item.command_receipt,
    automatic.body.item.command_receipt,
  );
  const automaticConflict = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/auto",
    method: "POST",
    query: {},
    body: { ...automaticBody, expected_state_version: 2 },
  });
  assert.equal(automaticConflict.status, 409);
  assert.deepEqual(
    automaticConflict.body.safe_error_codes,
    [FINANCE_IDEMPOTENCY_CONFLICT],
  );

  const manualBody = {
    ...QUERY,
    idempotency_key: "client-manual-link-001",
    decisions: [{
      bank_transaction_id: manual.bank_transaction_id,
      category: "client_receipt",
      client_group_id: "client-a",
      expected_state_version: 1,
    }],
  };
  const linked = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: manualBody,
  });
  assert.equal(linked.status, 200, JSON.stringify(linked.body));
  assert.deepEqual(
    {
      transaction: linked.body.item.command_receipt.bank_transaction_id,
      version: linked.body.item.command_receipt.state_version,
      client: linked.body.item.command_receipt.client_group_id,
      key: linked.body.item.command_receipt.idempotency_key,
    },
    {
      transaction: manual.bank_transaction_id,
      version: 2,
      client: "client-a",
      key: manualBody.idempotency_key,
    },
  );
  const manualReplay = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: manualBody,
  });
  assert.equal(manualReplay.body.outcome, "idempotent_replay");
  assert.deepEqual(
    manualReplay.body.item.command_receipt,
    linked.body.item.command_receipt,
  );
  const manualConflict = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...manualBody,
      decisions: [{
        ...manualBody.decisions[0],
        client_group_id: "client-b",
      }],
    },
  });
  assert.equal(manualConflict.status, 409);
  assert.deepEqual(
    manualConflict.body.safe_error_codes,
    [FINANCE_IDEMPOTENCY_CONFLICT],
  );
  const stale = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...manualBody,
      idempotency_key: "client-manual-stale-001",
    },
  });
  assert.equal(stale.status, 409);
  assert.deepEqual(
    stale.body.safe_error_codes,
    ["FINANCE_BANK_CLASSIFICATION_VERSION_CONFLICT"],
  );

  const unauthorizedContext = permissionContext({
    objectAcl: [{
      id: "deny-client-b-link",
      effect: "deny",
      principal_id: ACTOR,
      resource_id: "client-b",
      action: "*",
    }],
  });
  const unauthorizedLink = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    context: unauthorizedContext,
    body: {
      ...QUERY,
      idempotency_key: "client-unauthorized-link-001",
      decisions: [{
        bank_transaction_id: unauthorized.bank_transaction_id,
        category: "client_receipt",
        client_group_id: "client-b",
        expected_state_version: 1,
      }],
    },
  });
  assert.equal(unauthorizedLink.status, 404);
  assert.equal(unauthorizedLink.body.item, null);

  const selfRefund = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...QUERY,
      idempotency_key: "client-self-refund-001",
      decisions: [{
        bank_transaction_id: refund.bank_transaction_id,
        category: "refund_reversal",
        refund_of_bank_transaction_id: refund.bank_transaction_id,
        expected_state_version: 1,
      }],
    },
  });
  assert.equal(selfRefund.status, 409);
  assert.deepEqual(
    selfRefund.body.safe_error_codes,
    ["FINANCE_REFUND_ORIGINAL_INVALID"],
  );
  const unauthorizedRefundClient = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    context: unauthorizedContext,
    body: {
      ...QUERY,
      idempotency_key: "client-unauthorized-refund-001",
      decisions: [{
        bank_transaction_id: refund.bank_transaction_id,
        category: "refund_reversal",
        refund_of_bank_transaction_id: original.bank_transaction_id,
        client_group_id: "client-b",
        expected_state_version: 1,
      }],
    },
  });
  assert.equal(unauthorizedRefundClient.status, 404);
  assert.equal(unauthorizedRefundClient.body.item, null);
  const crossClientRefund = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...QUERY,
      idempotency_key: "client-cross-refund-001",
      decisions: [{
        bank_transaction_id: refund.bank_transaction_id,
        category: "refund_reversal",
        refund_of_bank_transaction_id: original.bank_transaction_id,
        client_group_id: "client-b",
        expected_state_version: 1,
      }],
    },
  });
  assert.equal(crossClientRefund.status, 409);
  assert.deepEqual(
    crossClientRefund.body.safe_error_codes,
    ["FINANCE_REFUND_CLIENT_MISMATCH"],
  );
  const linkedRefund = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...QUERY,
      idempotency_key: "client-refund-link-001",
      decisions: [{
        bank_transaction_id: refund.bank_transaction_id,
        category: "refund_reversal",
        refund_of_bank_transaction_id: original.bank_transaction_id,
        expected_state_version: 1,
      }],
    },
  });
  assert.equal(linkedRefund.status, 200, JSON.stringify(linkedRefund.body));
  assert.deepEqual(
    {
      transaction:
        linkedRefund.body.item.command_receipt.bank_transaction_id,
      version: linkedRefund.body.item.command_receipt.state_version,
      client: linkedRefund.body.item.command_receipt.client_group_id,
      original:
        linkedRefund.body.item.command_receipt
          .refund_of_bank_transaction_id,
      key: linkedRefund.body.item.command_receipt.idempotency_key,
    },
    {
      transaction: refund.bank_transaction_id,
      version: 2,
      client: "client-a",
      original: original.bank_transaction_id,
      key: "client-refund-link-001",
    },
  );
  repository.close();
});

test("bulk auto classifies only source- and Client-authorized transactions", async () => {
  const visible = transaction("bank-bulk-visible", {
    counterparty: "허용 고객",
  });
  const deniedBank = transaction("bank-bulk-bank-denied", {
    counterparty: "허용 고객",
  });
  const deniedClient = transaction("bank-bulk-client-denied", {
    counterparty: "차단 고객",
  });
  const clients = [
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-allowed",
      display_name: "허용 고객",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-denied",
      display_name: "차단 고객",
      status: "active",
    },
  ];
  const { repository, runtime } = runtimeWith(
    [visible, deniedBank, deniedClient],
    clients,
  );
  const response = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/auto",
    method: "POST",
    query: {},
    context: permissionContext({
      objectAcl: [
        {
          id: "deny-bulk-bank-read",
          effect: "deny",
          principal_id: ACTOR,
          resource_id: deniedBank.bank_transaction_id,
          action: "finance:bank_transaction:read",
        },
        {
          id: "deny-bulk-client-read",
          effect: "deny",
          principal_id: ACTOR,
          resource_id: "client-denied",
          action: "analytics:client:read",
        },
      ],
    }),
    body: {
      ...QUERY,
      idempotency_key: "bulk-authorized-only-001",
    },
  });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(response.body.item.created_count, 1);
  assert.equal(response.body.item.summary.transaction_count, 1);
  assert.deepEqual(
    response.body.command_receipts.map((receipt) => (
      receipt.bank_transaction_id
    )),
    [visible.bank_transaction_id],
  );
  assert.deepEqual(
    repository.list({
      tenant_id: TENANT,
      model_type: "BankTransactionClassification",
    }).map((record) => record.bank_transaction_id),
    [visible.bank_transaction_id],
  );
  repository.close();
});

test("bulk auto keeps exact object ACL denies at the collection gate", async () => {
  const denied = transaction("bank-bulk-exact-denied");
  const { repository, runtime } = runtimeWith([denied]);
  const response = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/auto",
    method: "POST",
    query: {},
    context: permissionContext({
      objectAcl: [{
        id: "deny-bulk-exact",
        effect: "deny",
        principal_id: ACTOR,
        resource_id: denied.bank_transaction_id,
        action: "*",
      }],
    }),
    body: {
      ...QUERY,
      idempotency_key: "bulk-exact-denied-001",
    },
  });
  assert.equal(response.status, 403);
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: "BankTransactionClassification",
  }).length, 0);
  assert.equal(repository.snapshot().idempotency.length, 0);
  repository.close();
});

test("deposit reads and classification options use source-correct ACL actions", async () => {
  const visible = transaction("bank-acl-visible");
  const deniedClassification = transaction("bank-acl-classification");
  const deniedClient = transaction("bank-acl-client");
  const clientRecords = [
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-a",
      display_name: "허용 고객",
      status: "active",
    },
    {
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-b",
      display_name: "차단 고객",
      status: "active",
    },
  ];
  const employees = [
    {
      employee_id: "employee-visible",
      display_name: "허용 직원",
      status: "active",
      aliases: ["ALLOW"],
    },
    {
      employee_id: "employee-hidden",
      display_name: "차단 직원",
      status: "active",
      aliases: ["HIDE"],
    },
  ];
  const { repository, runtime } = runtimeWith(
    [
      visible,
      deniedClassification,
      deniedClient,
      classification(visible),
      classification(deniedClassification),
      classification(deniedClient, { clientGroupId: "client-b" }),
    ],
    clientRecords,
    employees,
  );
  const context = permissionContext({
    objectAcl: [
      {
        id: "deny-classification-read",
        effect: "deny",
        principal_id: ACTOR,
        resource_id: classificationId(
          TENANT,
          deniedClassification.bank_transaction_id,
        ),
        action: "finance:bank_classification:read",
      },
      {
        id: "deny-canonical-client-read",
        effect: "deny",
        principal_id: ACTOR,
        resource_id: "client-b",
        action: "analytics:client:read",
      },
      {
        id: "deny-canonical-employee-read",
        effect: "deny",
        principal_id: ACTOR,
        resource_id: "employee-hidden",
        action: "hrx.employee.read",
      },
    ],
  });
  const list = await request({
    runtime,
    pathname: "/api/finance/client-deposits",
    context,
  });
  assert.equal(list.status, 200);
  assert.deepEqual(
    list.body.items.map((item) => item.bank_transaction_id),
    [visible.bank_transaction_id],
  );
  const deniedDetail = await request({
    runtime,
    pathname:
      `/api/finance/client-deposits/${deniedClassification.bank_transaction_id}`,
    context,
  });
  assert.equal(deniedDetail.status, 404);
  const options = await request({
    runtime,
    pathname: "/api/finance/bank-classification-options",
    context,
  });
  assert.equal(options.status, 200);
  assert.deepEqual(
    options.body.item.clients.map((client) => client.client_group_id),
    ["client-a"],
  );
  assert.deepEqual(
    options.body.item.employees.map((employee) => employee.employee_id),
    ["employee-visible"],
  );
  repository.close();
});

test("targeted auto does not return a manually locked denied Client receipt", async () => {
  const source = transaction("bank-locked-hidden-client", {
    counterparty: "허용 제안 고객",
  });
  const locked = classification(source, {
    clientGroupId: "client-hidden",
    classificationSource: "manual_review",
  });
  locked.manual_lock = true;
  const { repository, runtime } = runtimeWith(
    [source, locked],
    [
      {
        model_type: "ClientGroup",
        tenant_id: TENANT,
        client_group_id: "client-hidden",
        display_name: "숨은 고객",
        status: "active",
      },
      {
        model_type: "ClientGroup",
        tenant_id: TENANT,
        client_group_id: "client-visible",
        display_name: "허용 제안 고객",
        status: "active",
      },
    ],
  );
  const before = repository.snapshot();
  const response = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/auto",
    method: "POST",
    query: {},
    context: permissionContext({
      objectAcl: [{
        id: "deny-locked-client",
        effect: "deny",
        principal_id: ACTOR,
        resource_id: "client-hidden",
        action: "analytics:client:read",
      }],
    }),
    body: {
      ...QUERY,
      idempotency_key: "locked-client-denied-001",
      bank_transaction_id: source.bank_transaction_id,
      expected_state_version: 1,
    },
  });
  assert.equal(response.status, 404);
  assert.equal(response.body.item, null);
  assert.deepEqual(repository.snapshot(), before);
  repository.close();
});

test("review requires versions before manual, refund, or mixed mutation", async () => {
  const manual = transaction("bank-version-manual");
  const refund = transaction("bank-version-refund", {
    direction: "outflow",
    amount: 100_000,
  });
  const original = transaction("bank-version-original", {
    amount: 500_000,
  });
  const { repository, runtime } = runtimeWith(
    [
      manual,
      refund,
      original,
      classification(original, { clientGroupId: "client-a" }),
    ],
    [{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-a",
      display_name: "고객 A",
      status: "active",
    }],
  );
  const manualWithoutVersion = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...QUERY,
      idempotency_key: "manual-version-missing-001",
      decisions: [{
        bank_transaction_id: manual.bank_transaction_id,
        category: "client_receipt",
        client_group_id: "client-a",
      }],
    },
  });
  assert.equal(manualWithoutVersion.status, 400);
  const refundWithoutVersion = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...QUERY,
      idempotency_key: "refund-version-missing-001",
      decisions: [{
        bank_transaction_id: refund.bank_transaction_id,
        category: "refund_reversal",
        refund_of_bank_transaction_id: original.bank_transaction_id,
      }],
    },
  });
  assert.equal(refundWithoutVersion.status, 400);
  const mixedMissingVersion = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...QUERY,
      idempotency_key: "mixed-version-missing-001",
      decisions: [
        {
          bank_transaction_id: manual.bank_transaction_id,
          category: "client_receipt",
          client_group_id: "client-a",
          expected_state_version: 0,
        },
        {
          bank_transaction_id: refund.bank_transaction_id,
          category: "refund_reversal",
          refund_of_bank_transaction_id: original.bank_transaction_id,
        },
      ],
    },
  });
  assert.equal(mixedMissingVersion.status, 400);
  const stale = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...QUERY,
      idempotency_key: "manual-version-stale-001",
      decisions: [{
        bank_transaction_id: manual.bank_transaction_id,
        category: "client_receipt",
        client_group_id: "client-a",
        expected_state_version: 9,
      }],
    },
  });
  assert.equal(stale.status, 409);
  assert.deepEqual(
    stale.body.safe_error_codes,
    ["FINANCE_BANK_CLASSIFICATION_VERSION_CONFLICT"],
  );
  assert.deepEqual(
    repository.list({
      tenant_id: TENANT,
      model_type: "BankTransactionClassification",
    }).map((record) => record.bank_transaction_id),
    [original.bank_transaction_id],
  );
  repository.close();
});

test("refund replay is stable after original reclassification and reauthorizes output", async () => {
  const original = transaction("bank-replay-original", {
    amount: 500_000,
  });
  const refund = transaction("bank-replay-refund", {
    direction: "outflow",
    amount: 100_000,
  });
  const { repository, runtime } = runtimeWith(
    [
      original,
      refund,
      classification(original, { clientGroupId: "client-a" }),
    ],
    [{
      model_type: "ClientGroup",
      tenant_id: TENANT,
      client_group_id: "client-a",
      display_name: "고객 A",
      status: "active",
    }],
  );
  const refundBody = {
    ...QUERY,
    idempotency_key: "refund-stable-replay-001",
    decisions: [{
      bank_transaction_id: refund.bank_transaction_id,
      category: "refund_reversal",
      refund_of_bank_transaction_id: original.bank_transaction_id,
      expected_state_version: 0,
    }],
  };
  const first = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: refundBody,
  });
  assert.equal(first.status, 200, JSON.stringify(first.body));
  const reclassified = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...QUERY,
      idempotency_key: "refund-original-reclassified-001",
      decisions: [{
        bank_transaction_id: original.bank_transaction_id,
        category: "other_inflow",
        expected_state_version: 1,
      }],
    },
  });
  assert.equal(reclassified.status, 200);
  const replay = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: refundBody,
  });
  assert.equal(replay.status, 200, JSON.stringify(replay.body));
  assert.equal(replay.body.outcome, "idempotent_replay");
  assert.equal(replay.body.idempotent_replay, true);
  assert.equal(
    replay.body.item.command_receipt.refund_of_bank_transaction_id,
    original.bank_transaction_id,
  );
  const changedPayload = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    body: {
      ...refundBody,
      decisions: [{
        ...refundBody.decisions[0],
        client_group_id: "client-a",
      }],
    },
  });
  assert.equal(changedPayload.status, 409);
  assert.deepEqual(
    changedPayload.body.safe_error_codes,
    [FINANCE_IDEMPOTENCY_CONFLICT],
  );
  const deniedReplay = await request({
    runtime,
    pathname: "/api/finance/bank-classifications/review",
    method: "POST",
    query: {},
    context: permissionContext({
      objectAcl: [{
        id: "deny-replay-client",
        effect: "deny",
        principal_id: ACTOR,
        resource_id: "client-a",
        action: "analytics:client:read",
      }],
    }),
    body: refundBody,
  });
  assert.equal(deniedReplay.status, 404);
  assert.equal(deniedReplay.body.item, null);
  assert.deepEqual(deniedReplay.body.items, []);
  repository.close();
});

test("client deposit pagination retrieves an authorized 501st row", async () => {
  const records = [];
  for (let index = 0; index < 501; index += 1) {
    const source = transaction(
      `bank-page-${String(index).padStart(3, "0")}`,
    );
    records.push(
      source,
      classification(source, {
        category: "other_inflow",
        clientGroupId: null,
      }),
    );
  }
  const { repository, runtime } = runtimeWith(records);
  const first = await request({
    runtime,
    pathname: "/api/finance/client-deposits",
    query: { ...QUERY, limit: "500" },
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.items.length, 500);
  assert.equal(first.body.page_info.has_more, true);
  assert.equal(typeof first.body.page_info.next_cursor, "string");
  const second = await request({
    runtime,
    pathname: "/api/finance/client-deposits",
    query: {
      ...QUERY,
      limit: "500",
      cursor: first.body.page_info.next_cursor,
    },
  });
  assert.equal(second.status, 200);
  assert.equal(second.body.items.length, 1);
  assert.equal(second.body.page_info.has_more, false);
  assert.equal(second.body.page_info.next_cursor, null);
  assert.equal(new Set([
    ...first.body.items,
    ...second.body.items,
  ].map((item) => item.bank_transaction_id)).size, 501);
  const invalidCursor = await request({
    runtime,
    pathname: "/api/finance/client-deposits",
    query: { ...QUERY, cursor: "not-a-cursor" },
  });
  assert.equal(invalidCursor.status, 400);
  const unbounded = await request({
    runtime,
    pathname: "/api/finance/client-deposits",
    query: { ...QUERY, limit: "501" },
  });
  assert.equal(unbounded.status, 400);
  repository.close();
});

test("client deposit read audit contains only safe identifiers and flags", async () => {
  const source = transaction("bank-safe-audit");
  const { repository, runtime } = runtimeWith([
    source,
    classification(source, {
      category: "other_inflow",
      clientGroupId: null,
    }),
  ]);
  const detail = await request({
    runtime,
    pathname: `/api/finance/client-deposits/${source.bank_transaction_id}`,
  });
  assert.equal(detail.status, 200);
  const event = repository.listAudit({ tenant_id: TENANT }).find(
    (candidate) => (
      candidate.action === "finance:bank_transaction:read"
      && candidate.object_type === "client_deposit"
    ),
  );
  assert.ok(event);
  assert.equal(event.metadata.raw_source_payload_included, false);
  assert.equal(event.metadata.raw_account_included, false);
  assert.equal(event.metadata.raw_counterparty_included, false);
  assert.equal(event.metadata.raw_memo_included, false);
  const serialized = JSON.stringify(event);
  assert.equal(serialized.includes("raw-account-number-secret"), false);
  assert.equal(serialized.includes("원본 거래처 비공개"), false);
  assert.equal(serialized.includes("raw-bank-memo-secret"), false);
  repository.close();
});

test("client bank import confirmation remains mandatory before mutation", async () => {
  const { repository, runtime } = runtimeWith([]);
  const response = await request({
    runtime,
    pathname: "/api/finance/bank-imports",
    method: "POST",
    query: {},
    body: {
      ...QUERY,
      account_ref: "bank-account-safe-ref",
      idempotency_key: "client-import-no-preview-001",
      production_import_approved: true,
    },
  });
  assert.equal(response.status, 400);
  assert.deepEqual(
    response.body.safe_error_codes,
    ["FINANCE_PREVIEW_CONFIRMATION_REQUIRED"],
  );
  assert.equal(repository.snapshot().records.length, 0);
  repository.close();
});

test("client deposit routes require a signed tenant-bound session", async () => {
  const account = highestPrivilegeRegisteredAccount();
  const source = transaction("bank-signed-session", {
    tenantId: MATTER_VAULT_REGISTERED_TENANT_ID,
  });
  const { repository, runtime } = runtimeWith([
    source,
    classification(source, {
      category: "other_inflow",
      clientGroupId: null,
      status: "review_required",
      rationaleCode: "no_registered_client_match",
    }),
  ]);
  const started = await startApiServer({ port: 0, financeRuntime: runtime });
  const baseUrl = `http://${started.host}:${started.port}`;
  const path = `/api/finance/client-deposits?tenant_id=${encodeURIComponent(MATTER_VAULT_REGISTERED_TENANT_ID)}&permission_ref=perm-signed-deposit&audit_hint_ref=audit-signed-deposit`;
  try {
    const unsigned = await fetch(`${baseUrl}${path}`);
    assert.equal(unsigned.status, 401);

    const headers = await apiSessionHeaders(baseUrl, account);
    const signed = await fetch(`${baseUrl}${path}`, { headers });
    assert.equal(signed.status, 200);
    const signedBody = await signed.json();
    assert.equal(signedBody.items[0].bank_transaction_id, source.bank_transaction_id);

    const crossTenant = await fetch(
      `${baseUrl}/api/finance/client-deposits?tenant_id=tenant-other&permission_ref=perm-signed-deposit&audit_hint_ref=audit-signed-deposit`,
      { headers },
    );
    assert.equal(crossTenant.status, 403);
    const crossTenantBody = await crossTenant.json();
    assert.deepEqual(crossTenantBody.items, []);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
    repository.close();
  }
});
