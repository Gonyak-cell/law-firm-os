import assert from "node:assert/strict";
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

const TENANT = MATTER_VAULT_REGISTERED_TENANT_ID;
const OTHER_TENANT = "tenant-client-receivables-other";
const ACCOUNT = highestPrivilegeRegisteredAccount();
const ACTOR = ACCOUNT.user_id;
const ACTION = "finance:ar:client_receivables:read";
const QUERY = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "perm-client-receivables",
  audit_hint_ref: "audit-client-receivables",
});

function client(clientGroupId, displayName, overrides = {}) {
  return {
    model_type: "ClientGroup",
    tenant_id: TENANT,
    client_group_id: clientGroupId,
    display_name: displayName,
    status: "active",
    ...overrides,
  };
}

function feeCommitment(
  feeCommitmentId,
  clientGroupId,
  agreedAmount,
  overrides = {},
) {
  return {
    model_type: "FeeCommitment",
    fee_commitment_id: feeCommitmentId,
    tenant_id: TENANT,
    client_group_id: clientGroupId,
    opportunity_id: `raw-opportunity-secret-${feeCommitmentId}`,
    matter_id: null,
    currency: "KRW",
    agreed_amount: agreedAmount,
    due_date: agreedAmount === null ? null : "2026-08-15",
    accepted_at: "2026-07-30T10:00:00+09:00",
    status: "active",
    source_fee_arrangement_id: null,
    state_version: 1,
    created_by: ACTOR,
    updated_by: ACTOR,
    reason: "수임 확정",
    ...overrides,
  };
}

function confirmedDeposit(
  bankTransactionId,
  clientGroupId,
  amount,
  occurredAt,
) {
  const classificationId = `classification-${bankTransactionId}`;
  return [
    {
      model_type: "BankTransaction",
      bank_transaction_id: bankTransactionId,
      tenant_id: TENANT,
      transaction_fingerprint: `raw-fingerprint-secret-${bankTransactionId}`,
      account_ref: "raw-account-secret",
      counterparty: "raw-counterparty-secret",
      memo: "raw-memo-secret",
      source_refs: [{
        source_type: "xlsx",
        source_hash: "a".repeat(64),
        row: 7,
      }],
      credential_material: "raw-credential-secret",
      date: occurredAt.slice(0, 10),
      occurred_at: occurredAt,
      direction: "inflow",
      amount,
      currency: "KRW",
      status: "posted",
    },
    {
      model_type: "BankTransactionClassification",
      bank_transaction_classification_id: classificationId,
      bank_transaction_id: bankTransactionId,
      tenant_id: TENANT,
      client_group_id: clientGroupId,
      transaction_date: occurredAt.slice(0, 10),
      transaction_direction: "inflow",
      amount,
      currency: "KRW",
      category: "client_receipt",
      status: "confirmed",
    },
  ];
}

function allocation(
  allocationId,
  clientGroupId,
  bankTransactionId,
  feeCommitmentId,
  amount,
  overrides = {},
) {
  return {
    model_type: "ClientDepositAllocation",
    client_deposit_allocation_id: allocationId,
    tenant_id: TENANT,
    client_group_id: clientGroupId,
    bank_transaction_id: bankTransactionId,
    bank_transaction_classification_id:
      `classification-${bankTransactionId}`,
    fee_commitment_id: feeCommitmentId,
    currency: "KRW",
    allocated_amount: amount,
    reversed_amount: 0,
    allocation_source: "automatic",
    manual_lock: false,
    state_version: 1,
    allocated_at: "2026-07-31T12:00:00+09:00",
    created_by: ACTOR,
    updated_by: ACTOR,
    reason: "납부기한 순 자동 배분",
    ...overrides,
  };
}

function permissionContext({ tenantId = TENANT, rules, objectAcl = [] } = {}) {
  return {
    principal: {
      user_id: ACTOR,
      tenant_id: tenantId,
      role_ids: ["system_super_admin"],
    },
    rules: rules ?? [{
      id: "allow-client-receivables",
      effect: "allow",
      action: "*",
    }],
    object_acl: objectAcl,
  };
}

function runtimeWith(records = [], clientRecords = []) {
  const repository = createFinanceRepository({ seedRecords: records });
  return {
    repository,
    runtime: createFinanceRuntimeContext({ repository, clientRecords }),
  };
}

function request({
  runtime,
  query = QUERY,
  context = permissionContext(),
  requestId = "request-client-receivables",
}) {
  return handleFinanceApiRequest({
    pathname: "/api/finance/client-receivables",
    method: "GET",
    query,
    context,
    requestId,
    runtime,
  });
}

function ordering(body) {
  return {
    clients: body.clients.map(({ client_group_id }) => client_group_id),
    ranking: body.ranking.map(({ client_group_id }) => client_group_id),
    summaries:
      body.client_summaries.map(({ client_group_id }) => client_group_id),
    commitments: body.details.fee_commitments.map(
      ({ fee_commitment_id }) => fee_commitment_id,
    ),
    deposits: body.details.deposits.map(
      ({ bank_transaction_id }) => bank_transaction_id,
    ),
    allocations: body.details.allocations.map(
      ({ client_deposit_allocation_id }) => client_deposit_allocation_id,
    ),
  };
}

test("CL-P5-W03-T02 canonical read covers five AR scenarios without Invoice or Matter", async () => {
  const clients = [
    client("client-a-unpaid", "가 미납"),
    client("client-b-partial", "나 일부 납부"),
    client("client-c-unknown", "다 금액 미입력"),
    client("client-d-overpaid", "라 초과 입금"),
    client("client-e-settled", "마 정산 완료"),
  ];
  const records = [
    feeCommitment("fee-a-unpaid", "client-a-unpaid", 10_000_000, {
      state_version: 3,
    }),
    feeCommitment(
      "fee-a-cancelled-history",
      "client-a-unpaid",
      99_000_000,
      { status: "cancelled", state_version: 4 },
    ),
    feeCommitment("fee-b-partial", "client-b-partial", 10_000_000),
    ...confirmedDeposit(
      "bank-b-partial",
      "client-b-partial",
      4_000_000,
      "2026-07-30T09:00:00+09:00",
    ),
    allocation(
      "allocation-b-partial",
      "client-b-partial",
      "bank-b-partial",
      "fee-b-partial",
      4_000_000,
    ),
    feeCommitment("fee-c-unknown", "client-c-unknown", null),
    feeCommitment("fee-d-overpaid", "client-d-overpaid", 5_000_000),
    ...confirmedDeposit(
      "bank-d-overpaid",
      "client-d-overpaid",
      7_000_000,
      "2026-07-31T09:00:00+09:00",
    ),
    allocation(
      "allocation-d-overpaid",
      "client-d-overpaid",
      "bank-d-overpaid",
      "fee-d-overpaid",
      5_000_000,
    ),
    feeCommitment("fee-e-settled", "client-e-settled", 3_000_000),
    ...confirmedDeposit(
      "bank-e-settled",
      "client-e-settled",
      3_000_000,
      "2026-07-29T09:00:00+09:00",
    ),
    allocation(
      "allocation-e-settled",
      "client-e-settled",
      "bank-e-settled",
      "fee-e-settled",
      3_000_000,
    ),
  ];
  const first = runtimeWith([...records].reverse(), [...clients].reverse());
  const second = runtimeWith(records, clients);
  try {
    const response = await request({ runtime: first.runtime });
    const replayedOrder = await request({
      runtime: second.runtime,
      requestId: "request-client-receivables-order",
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.outcome, "passed");
    assert.equal(response.body.ui_state, null);
    assert.equal(response.body.total_receivables, 16_000_000);
    assert.equal(response.body.unknown_amount_count, 1);
    assert.equal(response.body.total_overpayment, 2_000_000);
    assert.equal(
      response.body.unallocated_amount,
      response.body.total_overpayment,
    );
    assert.equal(
      response.body.unallocated_amount_basis,
      "same_as_total_overpayment",
    );
    assert.deepEqual(
      response.body.ranking.map((row) => [
        row.rank,
        row.client_group_id,
        row.receivable_amount,
      ]),
      [
        [1, "client-a-unpaid", 10_000_000],
        [2, "client-b-partial", 6_000_000],
      ],
    );
    assert.deepEqual(
      response.body.clients,
      clients.map(({ client_group_id, display_name }) => ({
        client_group_id,
        display_name,
      })),
    );
    assert.equal(response.body.details.fee_commitments.length, 5);
    assert.equal(
      response.body.details.fee_commitments.some(
        ({ fee_commitment_id }) => (
          fee_commitment_id === "fee-a-cancelled-history"
        ),
      ),
      false,
    );
    assert.deepEqual(
      response.body.details.fee_commitments.find(
        ({ fee_commitment_id }) => fee_commitment_id === "fee-a-unpaid",
      ),
      {
        fee_commitment_id: "fee-a-unpaid",
        client_group_id: "client-a-unpaid",
        agreed_amount: 10_000_000,
        active_allocated_amount: 0,
        receivable_amount: 10_000_000,
        amount_status: "금액 확인",
        due_date: "2026-08-15",
        accepted_at: "2026-07-30T10:00:00+09:00",
        status: "active",
        state_version: 3,
      },
    );
    assert.deepEqual(ordering(response.body), ordering(replayedOrder.body));
    assert.equal(response.body.invoice_required, false);
    assert.equal(response.body.matter_required, false);
    assert.equal(
      first.repository.list({ tenant_id: TENANT, model_type: "Invoice" })
        .length,
      0,
    );
    for (const [field, expected] of Object.entries({
      count_leak_prevented: true,
      permission_prefilter_applied: true,
      unauthorized_count_included: false,
      raw_bank_source_included: false,
      raw_source_payload_included: false,
      source_metadata_included: false,
      raw_account_included: false,
      raw_counterparty_included: false,
      raw_memo_included: false,
      transaction_fingerprint_included: false,
      bank_reference_included: false,
      credential_material_included: false,
      production_ready_claim: false,
    })) {
      assert.equal(response.body[field], expected, field);
    }
    const serialized = JSON.stringify(response.body);
    for (const secret of [
      "raw-opportunity-secret",
      "raw-fingerprint-secret",
      "raw-account-secret",
      "raw-counterparty-secret",
      "raw-memo-secret",
      "raw-credential-secret",
      "source_refs",
      "opportunity_id",
    ]) {
      assert.equal(serialized.includes(secret), false, secret);
    }
    for (const forbiddenKey of ["invoice_id", "matter_id"]) {
      assert.equal(
        serialized.includes(`"${forbiddenKey}":`),
        false,
        forbiddenKey,
      );
    }
    const event = first.repository.listAudit({ tenant_id: TENANT }).find(
      (candidate) => (
        candidate.action === ACTION
        && candidate.object_type === "client_receivables"
        && candidate.decision === "allow"
      ),
    );
    assert.ok(event);
    assert.equal(event.metadata.sensitive_read_audit_required, true);
    assert.equal(event.metadata.permission_prefilter_applied, true);
    assert.equal(event.metadata.raw_source_payload_included, false);
    assert.equal(event.metadata.raw_account_included, false);
    assert.equal(event.metadata.raw_counterparty_included, false);
    assert.equal(event.metadata.raw_memo_included, false);
    assert.equal(event.metadata.transaction_fingerprint_included, false);
    assert.equal(
      JSON.stringify(event).includes("raw-opportunity-secret"),
      false,
    );
  } finally {
    first.repository.close();
    second.repository.close();
  }
});

test("ClientGroup ACL prefilter excludes malformed unauthorized rows before normalization and count", async () => {
  const visible = client("client-visible", "허용 고객");
  const pending = client("client-pending", "검토 중 고객", {
    status: "pending",
  });
  let hiddenFieldReadCount = 0;
  const hidden = client("client-hidden", "unused-hidden-name", {
    member_party_ids: ["raw-hidden-party-secret"],
  });
  Object.defineProperties(hidden, {
    status: {
      enumerable: true,
      get() {
        hiddenFieldReadCount += 1;
        throw new Error("raw-hidden-status-coercion-secret");
      },
    },
    display_name: {
      enumerable: true,
      get() {
        hiddenFieldReadCount += 1;
        throw new Error("raw-hidden-name-coercion-secret");
      },
    },
  });
  const hiddenFee = feeCommitment(
    "fee-hidden",
    "client-hidden",
    "raw-hidden-amount-secret",
  );
  const hiddenBank = {
    model_type: "BankTransaction",
    bank_transaction_id: "bank-hidden",
    tenant_id: TENANT,
    transaction_fingerprint: "raw-hidden-fingerprint-secret",
    occurred_at: "not-an-instant",
    direction: "inflow",
    amount: "raw-hidden-bank-amount-secret",
    currency: "USD",
    status: "posted",
  };
  const hiddenClassification = {
    model_type: "BankTransactionClassification",
    bank_transaction_classification_id: "classification-bank-hidden",
    bank_transaction_id: "bank-hidden",
    tenant_id: TENANT,
    client_group_id: "client-hidden",
    transaction_direction: "inflow",
    amount: "raw-hidden-classification-secret",
    currency: "USD",
    category: "client_receipt",
    status: "confirmed",
  };
  const { repository, runtime } = runtimeWith([
    feeCommitment("fee-visible", "client-visible", 1_000_000),
    feeCommitment("fee-pending", "client-pending", 7_000_000),
    hiddenFee,
    hiddenBank,
    hiddenClassification,
    allocation(
      "allocation-hidden",
      "client-hidden",
      "bank-hidden",
      "fee-hidden",
      "raw-hidden-allocation-secret",
    ),
  ], [visible, pending, hidden]);
  try {
    const response = await request({
      runtime,
      context: permissionContext({
        objectAcl: [{
          id: "deny-hidden-client",
          effect: "deny",
          principal_id: ACTOR,
          resource_id: "client-hidden",
          action: "analytics:client:read",
        }],
      }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.total_receivables, 1_000_000);
    assert.deepEqual(response.body.clients, [{
      client_group_id: "client-visible",
      display_name: "허용 고객",
    }]);
    assert.deepEqual(
      response.body.client_summaries.map(({ client_group_id }) => (
        client_group_id
      )),
      ["client-visible"],
    );
    assert.equal(response.body.unauthorized_count_included, false);
    assert.equal(Object.hasOwn(response.body, "omitted_count"), false);
    assert.equal(hiddenFieldReadCount, 0);
    const serialized = JSON.stringify(response.body);
    for (const secret of [
      "client-hidden",
      "client-pending",
      "fee-pending",
      "raw-hidden-status-coercion-secret",
      "raw-hidden-name-coercion-secret",
      "raw-hidden-party-secret",
      "raw-hidden-amount-secret",
      "raw-hidden-bank-amount-secret",
      "raw-hidden-classification-secret",
      "raw-hidden-allocation-secret",
      "raw-hidden-fingerprint-secret",
    ]) {
      assert.equal(serialized.includes(secret), false, secret);
    }
  } finally {
    repository.close();
  }
});

test("global deny and tenant mismatch return the same no-total safe boundary", async () => {
  const { repository, runtime } = runtimeWith([], [
    client("client-denied", "차단 고객"),
  ]);
  try {
    const globalDeny = await request({
      runtime,
      context: permissionContext({
        rules: [
          {
            id: "deny-client-receivables",
            effect: "deny",
            action: ACTION,
          },
          {
            id: "allow-other",
            effect: "allow",
            action: "*",
          },
        ],
      }),
    });
    const crossTenant = await request({
      runtime,
      query: { ...QUERY, tenant_id: OTHER_TENANT },
      requestId: "request-client-receivables-cross-tenant",
    });
    for (const response of [globalDeny, crossTenant]) {
      assert.equal(response.status, 403);
      assert.equal(response.body.ui_state, "denied");
      assert.deepEqual(
        response.body.safe_error_codes,
        ["FINANCE_UNAUTHORIZED_OMISSION"],
      );
      assert.equal(response.body.count_leak_prevented, true);
      assert.equal(response.body.permission_prefilter_applied, true);
      assert.equal(response.body.unauthorized_count_included, false);
      assert.equal(Object.hasOwn(response.body, "total_receivables"), false);
      assert.equal(Object.hasOwn(response.body, "clients"), false);
      assert.equal(Object.hasOwn(response.body, "details"), false);
    }
    assert.equal(
      repository.listAudit({ tenant_id: OTHER_TENANT }).length,
      0,
    );
    assert.ok(repository.listAudit({ tenant_id: TENANT }).some(
      (event) => (
        event.action === ACTION
        && event.reason === "finance_signed_tenant_mismatch"
      ),
    ));
  } finally {
    repository.close();
  }
});

test("complete zero is empty while authorized corruption is an error without fabricated zero", async () => {
  const empty = runtimeWith([], [client("client-empty", "빈 고객")]);
  const broken = runtimeWith([
    feeCommitment(
      "fee-broken",
      "client-broken",
      "raw-authorized-invalid-amount",
    ),
  ], [client("client-broken", "손상 고객")]);
  try {
    const emptyResponse = await request({
      runtime: empty.runtime,
      requestId: "request-client-receivables-empty",
    });
    assert.equal(emptyResponse.status, 200);
    assert.equal(emptyResponse.body.ui_state, "empty");
    assert.equal(emptyResponse.body.total_receivables, 0);
    assert.equal(emptyResponse.body.unknown_amount_count, 0);
    assert.equal(emptyResponse.body.total_overpayment, 0);
    assert.equal(emptyResponse.body.unallocated_amount, 0);
    assert.deepEqual(emptyResponse.body.details, {
      fee_commitments: [],
      deposits: [],
      allocations: [],
    });
    assert.deepEqual(emptyResponse.body.clients, [{
      client_group_id: "client-empty",
      display_name: "빈 고객",
    }]);

    const errorResponse = await request({
      runtime: broken.runtime,
      requestId: "request-client-receivables-error",
    });
    assert.equal(errorResponse.status, 503);
    assert.equal(errorResponse.body.ui_state, "error");
    assert.deepEqual(
      errorResponse.body.safe_error_codes,
      ["FINANCE_CLIENT_RECEIVABLES_UNAVAILABLE"],
    );
    assert.equal(
      JSON.stringify(errorResponse.body).includes(
        "raw-authorized-invalid-amount",
      ),
      false,
    );
    for (const field of [
      "total_receivables",
      "unknown_amount_count",
      "total_overpayment",
      "unallocated_amount",
      "clients",
      "ranking",
      "client_summaries",
      "details",
      "reconciliation",
    ]) {
      assert.equal(Object.hasOwn(errorResponse.body, field), false, field);
    }
  } finally {
    empty.repository.close();
    broken.repository.close();
  }
});

test("bounded overflow returns review without truncation or partial totals", async () => {
  const clients = Array.from({ length: 501 }, (_, index) => client(
    `client-overflow-${String(index).padStart(3, "0")}`,
    `고객 ${String(index).padStart(3, "0")}`,
  ));
  const { repository, runtime } = runtimeWith([], clients);
  try {
    const response = await request({
      runtime,
      requestId: "request-client-receivables-overflow",
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.outcome, "review_required");
    assert.equal(response.body.ui_state, "review_required");
    assert.deepEqual(
      response.body.safe_error_codes,
      ["FINANCE_CLIENT_RECEIVABLES_LIMIT_EXCEEDED"],
    );
    assert.notEqual(response.body.ui_state, "partial");
    for (const field of [
      "total_receivables",
      "unknown_amount_count",
      "total_overpayment",
      "unallocated_amount",
      "clients",
      "ranking",
      "client_summaries",
      "details",
      "reconciliation",
    ]) {
      assert.equal(Object.hasOwn(response.body, field), false, field);
    }
    assert.ok(repository.listAudit({ tenant_id: TENANT }).some(
      (event) => (
        event.action === ACTION
        && event.decision === "review_required"
      ),
    ));
  } finally {
    repository.close();
  }
});

test("HTTP route requires signed authoritative tenant and ignores forged permission headers", async () => {
  const { repository, runtime } = runtimeWith([
    feeCommitment("fee-signed", "client-signed", 2_000_000),
  ], [client("client-signed", "서명 고객")]);
  const started = await startApiServer({ port: 0, financeRuntime: runtime });
  const baseUrl = `http://${started.host}:${started.port}`;
  const path = `/api/finance/client-receivables?tenant_id=${encodeURIComponent(TENANT)}&permission_ref=perm-signed-receivables&audit_hint_ref=audit-signed-receivables`;
  try {
    const unsigned = await fetch(`${baseUrl}${path}`);
    assert.equal(unsigned.status, 401);

    const signedHeaders = await apiSessionHeaders(baseUrl, ACCOUNT);
    const forged = await fetch(`${baseUrl}${path}`, {
      headers: {
        ...signedHeaders,
        "x-lawos-permission-context": JSON.stringify({
          principal: {
            user_id: "forged-user",
            tenant_id: OTHER_TENANT,
          },
          rules: [{ id: "forged-deny", effect: "deny", action: "*" }],
          object_acl: [],
        }),
      },
    });
    assert.equal(forged.status, 200);
    const forgedBody = await forged.json();
    assert.deepEqual(forgedBody.clients, [{
      client_group_id: "client-signed",
      display_name: "서명 고객",
    }]);

    const crossTenant = await fetch(
      `${baseUrl}/api/finance/client-receivables?tenant_id=${encodeURIComponent(OTHER_TENANT)}&permission_ref=perm-signed-receivables&audit_hint_ref=audit-signed-receivables`,
      { headers: signedHeaders },
    );
    assert.equal(crossTenant.status, 403);
    const crossTenantBody = await crossTenant.json();
    assert.equal(
      Object.hasOwn(crossTenantBody, "total_receivables"),
      false,
    );

    const missingTenant = await fetch(
      `${baseUrl}/api/finance/client-receivables?permission_ref=perm-signed-receivables&audit_hint_ref=audit-signed-receivables`,
      { headers: signedHeaders },
    );
    assert.equal(missingTenant.status, 400);
    const missingTenantBody = await missingTenant.json();
    assert.equal(missingTenantBody.ui_state, "error");
    assert.equal(
      Object.hasOwn(missingTenantBody, "total_receivables"),
      false,
    );
    assert.equal(
      repository.listAudit({ tenant_id: OTHER_TENANT }).length,
      0,
    );
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
    repository.close();
  }
});
