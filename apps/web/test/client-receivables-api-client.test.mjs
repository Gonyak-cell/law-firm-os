import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchClientReceivables,
  getClientReceivablesRouteContext,
  patchClientFeeCommitment,
  reallocateClientReceivableDeposit
} from "../src/data/apiClient.js";

const TENANT = "tenant-client-receivables-adapter";
const CLIENT = "client-receivables-adapter";
const FEE = "fee-receivables-adapter";
const DEPOSIT = "bank-receivables-adapter";
const ALLOCATION = "allocation-receivables-adapter";

function installSession() {
  globalThis.__LAWOS_SESSION_CONTEXT__ = {
    schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
    state: "signed_in",
    session_ref: "session-client-receivables-adapter",
    source: "api_signed_session",
    actor_ref: "user-client-receivables-adapter",
    tenant_refs: { default: TENANT, client: TENANT },
    role_ids: ["finance_operator"],
    scopes: ["finance:ar:client_receivables:read"],
    review_state: "allow",
    expires_at: "2099-01-01T00:00:00.000Z"
  };
}

function removeSession() {
  delete globalThis.__LAWOS_SESSION_CONTEXT__;
}

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const boundary = {
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
  invoice_required: false,
  matter_required: false,
  production_ready_claim: false
};

function canonicalBody(overrides = {}) {
  return {
    request_id: "request-client-receivables-adapter",
    outcome: "passed",
    ui_state: null,
    safe_error_codes: [],
    audit_hint_ref: "ui_client_receivables_probe",
    basis: "fee_commitment_and_bank_deposit",
    basis_label: "수임료 약정·은행 입금 기준",
    currency: "KRW",
    as_of: "2026-07-31T00:00:00.000Z",
    total_receivables: 6_000_000,
    unknown_amount_count: 0,
    total_overpayment: 0,
    unallocated_amount: 0,
    unallocated_amount_basis: "same_as_total_overpayment",
    clients: [{ client_group_id: CLIENT, display_name: "한빛건설" }],
    ranking: [{
      rank: 1,
      client_group_id: CLIENT,
      display_name: "한빛건설",
      agreed_amount: 10_000_000,
      active_allocated_amount: 4_000_000,
      receivable_amount: 6_000_000,
      earliest_due_date: "2026-08-15"
    }],
    client_summaries: [{
      client_group_id: CLIENT,
      agreed_amount: 10_000_000,
      active_allocated_amount: 4_000_000,
      receivable_amount: 6_000_000,
      unknown_amount_count: 0,
      overpayment_amount: 0
    }],
    details: {
      fee_commitments: [{
        fee_commitment_id: FEE,
        client_group_id: CLIENT,
        agreed_amount: 10_000_000,
        active_allocated_amount: 4_000_000,
        receivable_amount: 6_000_000,
        due_date: "2026-08-15",
        accepted_at: "2026-07-01T00:00:00.000Z",
        status: "active",
        state_version: 2
      }],
      deposits: [{
        bank_transaction_id: DEPOSIT,
        client_group_id: CLIENT,
        gross_amount: 4_000_000,
        linked_refund_amount: 0,
        net_amount: 4_000_000,
        active_allocated_amount: 4_000_000,
        overpayment_amount: 0,
        occurred_at: "2026-07-10T00:00:00.000Z"
      }],
      allocations: [{
        client_deposit_allocation_id: ALLOCATION,
        client_group_id: CLIENT,
        bank_transaction_id: DEPOSIT,
        fee_commitment_id: FEE,
        allocated_amount: 4_000_000,
        reversed_amount: 0,
        active_amount: 4_000_000,
        allocation_source: "automatic",
        manual_lock: false,
        state_version: 3
      }]
    },
    reconciliation: {
      status: "passed",
      ranking_total: 6_000_000,
      commitment_detail_total: 6_000_000,
      client_summary_total: 6_000_000,
      overpayment_detail_total: 0
    },
    ...boundary,
    ...overrides
  };
}

function guardedBody(overrides = {}) {
  return {
    request_id: "request-client-receivables-guarded",
    outcome: "blocked",
    ui_state: "error",
    safe_error_codes: ["FINANCE_CLIENT_RECEIVABLES_UNAVAILABLE"],
    audit_hint_ref: "ui_client_receivables_probe",
    ...boundary,
    ...overrides
  };
}

test("signed route context is mandatory and rejects tenant disagreement", async (t) => {
  removeSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return response(canonicalBody());
  };
  assert.equal(getClientReceivablesRouteContext(), null);
  assert.equal((await fetchClientReceivables()).kind, "blocked");
  assert.equal(called, false);

  installSession();
  const routeContext = getClientReceivablesRouteContext();
  assert.equal(routeContext.tenant_id, TENANT);
  assert.equal(routeContext.permissionContext.principal.tenant_id, TENANT);
  globalThis.__LAWOS_SESSION_CONTEXT__.tenant_refs.client = "tenant-other";
  assert.equal(getClientReceivablesRouteContext(), null);
  assert.equal((await fetchClientReceivables()).kind, "blocked");
  assert.equal(called, false);

  installSession();
  globalThis.__LAWOS_SESSION_CONTEXT__.tenant_refs = { finance: TENANT };
  assert.equal(
    getClientReceivablesRouteContext(),
    null,
    "AR requires the signed Client/default tenant; finance-only is not a session-envelope domain"
  );
});

test("canonical GET uses one bounded route and projects the authorized Client directory", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const calls = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ input: String(input), init });
    return response(canonicalBody({
      raw_crm_payload: "must-not-project",
      reconciliation: {
        status: "passed",
        ranking_total: 6_000_000,
        commitment_detail_total: 6_000_000,
        client_summary_total: 6_000_000,
        overpayment_detail_total: 0,
        raw_memo: "reconciliation-secret-must-not-project"
      },
      clients: [{
        client_group_id: CLIENT,
        display_name: "한빛건설",
        party_id: "must-not-project"
      }]
    }));
  };
  const result = await fetchClientReceivables();
  assert.equal(result.kind, "data");
  assert.equal(result.status, 200);
  assert.deepEqual(result.clients, [{
    client_group_id: CLIENT,
    display_name: "한빛건설"
  }]);
  assert.equal(calls.length, 1);
  const url = new URL(calls[0].input, "http://lawos.test");
  assert.equal(url.pathname, "/api/finance/client-receivables");
  assert.equal(url.searchParams.get("tenant_id"), TENANT);
  assert.equal(url.searchParams.get("permission_ref"), "ui_client_receivables");
  assert.equal(url.searchParams.get("audit_hint_ref"), "ui_client_receivables_probe");
  assert.equal(url.searchParams.has("limit"), false);
  assert.equal(JSON.stringify(result).includes("must-not-project"), false);
  assert.deepEqual(result.reconciliation, {
    status: "passed",
    ranking_total: 6_000_000,
    commitment_detail_total: 6_000_000,
    client_summary_total: 6_000_000,
    overpayment_detail_total: 0
  });
  assert.equal(JSON.stringify(result).includes("reconciliation-secret"), false);
});

test("adapter distinguishes malformed, denied, partial, review and empty without leaking totals", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const queue = [
    response(canonicalBody({ raw_memo_included: true })),
    response(guardedBody({
      outcome: "denied",
      ui_state: "denied",
      safe_error_codes: ["FINANCE_UNAUTHORIZED_OMISSION"]
    }), 403),
    response(guardedBody({
      outcome: "partial",
      ui_state: "partial",
      safe_error_codes: ["FINANCE_CLIENT_RECEIVABLES_PARTIAL"]
    })),
    response(guardedBody({
      outcome: "review_required",
      ui_state: "review_required",
      safe_error_codes: ["FINANCE_CLIENT_RECEIVABLES_LIMIT_EXCEEDED"]
    })),
    response(canonicalBody({
      ui_state: "empty",
      total_receivables: 0,
      unknown_amount_count: 0,
      total_overpayment: 0,
      unallocated_amount: 0,
      ranking: [],
      client_summaries: [],
      details: { fee_commitments: [], deposits: [], allocations: [] },
      reconciliation: {
        status: "passed",
        ranking_total: 0,
        commitment_detail_total: 0,
        client_summary_total: 0,
        overpayment_detail_total: 0
      }
    }))
  ];
  globalThis.fetch = async () => queue.shift();
  const malformed = await fetchClientReceivables();
  const denied = await fetchClientReceivables();
  const partial = await fetchClientReceivables();
  const review = await fetchClientReceivables();
  const empty = await fetchClientReceivables();
  assert.deepEqual(
    [malformed.kind, denied.kind, partial.kind, review.kind, empty.uiState],
    ["error", "guarded", "partial", "guarded", "empty"]
  );
  assert.deepEqual(
    [denied.uiState, partial.uiState, review.uiState],
    ["denied", "partial", "review_required"]
  );
  for (const result of [denied, partial, review]) {
    assert.equal("total_receivables" in result, false);
    assert.equal("ranking" in result && result.ranking.length > 0, false);
  }
});

test("PATCH uses the model builder, validates target/version/replay and preserves non-JSON 409", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  const calls = [];
  let mode = "updated";
  globalThis.fetch = async (input, init) => {
    calls.push({ input: String(input), body: JSON.parse(init.body) });
    if (mode === "conflict") return new Response("conflict", { status: 409 });
    if (mode === "json-conflict") {
      return response({
        request_id: "request-fee-version-conflict",
        outcome: "blocked",
        ui_state: "blocked",
        items: [],
        safe_error_codes: ["FINANCE_FEE_COMMITMENT_VERSION_CONFLICT"],
        audit_hint_ref: "ui_client_receivables_probe",
        count_leak_prevented: true,
        production_ready_claim: false
      }, 409);
    }
    const request = JSON.parse(init.body);
    return response({
      request_id: "request-fee-mutation",
      outcome: mode === "replay" ? "idempotent_replay" : mode,
      item: {
        fee_commitment_id: FEE,
        tenant_id: TENANT,
        client_group_id: CLIENT,
        agreed_amount: 11_000_000,
        due_date: "2026-08-15",
        accepted_at: "2026-07-01T00:00:00.000Z",
        status: mode === "cancelled" ? "cancelled" : "active",
        state_version: request.expected_state_version + 1
      },
      safe_error_codes: [],
      audit_hint_ref: "ui_client_receivables_probe",
      idempotent_replay: mode === "replay",
      production_ready_claim: false
    });
  };
  const input = {
    operation: "edit",
    feeCommitmentId: FEE,
    expectedStateVersion: 2,
    changes: { agreedAmount: 11_000_000 },
    reason: "약정 금액 확정",
    idempotencyKey: "client_ar_update_stable_retry"
  };
  assert.equal((await patchClientFeeCommitment(input)).outcome, "updated");
  mode = "replay";
  assert.equal((await patchClientFeeCommitment(input)).idempotentReplay, true);
  assert.equal(calls[0].body.idempotency_key, calls[1].body.idempotency_key);
  assert.equal(calls[0].body.idempotency_key, input.idempotencyKey);
  assert.deepEqual(calls[0].body.changes, { agreed_amount: 11_000_000 });

  mode = "cancelled";
  const cancelled = await patchClientFeeCommitment({
    operation: "cancel",
    feeCommitmentId: FEE,
    expectedStateVersion: 2,
    reason: "수임 종료",
    idempotencyKey: "client_ar_cancel_stable_retry"
  });
  assert.equal(cancelled.outcome, "cancelled");
  assert.deepEqual(calls[2].body.changes, { status: "cancelled" });

  mode = "conflict";
  const conflict = await patchClientFeeCommitment(input);
  assert.equal(conflict.kind, "conflict");
  assert.equal(conflict.status, 409);
  assert.deepEqual(conflict.safeErrorCodes, ["INVALID_ERROR_RESPONSE"]);
  mode = "json-conflict";
  const jsonConflict = await patchClientFeeCommitment(input);
  assert.equal(jsonConflict.kind, "conflict");
  assert.equal(jsonConflict.status, 409);
  assert.deepEqual(
    jsonConflict.safeErrorCodes,
    ["FINANCE_FEE_COMMITMENT_VERSION_CONFLICT"]
  );
});

test("reallocation sends every expected allocation version and validates response binding", async (t) => {
  installSession();
  t.after(removeSession);
  const priorFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = priorFetch; });
  let captured;
  let mutation = {};
  globalThis.fetch = async (_input, init) => {
    captured = JSON.parse(init.body);
    const body = {
      request_id: "request-reallocation",
      outcome: "reallocated",
      item: {
        bank_transaction_id: DEPOSIT,
        active_allocated_amount: 3_500_000,
        unallocated_amount: 500_000
      },
      items: [
        {
          client_deposit_allocation_id: ALLOCATION,
          client_group_id: CLIENT,
          bank_transaction_id: DEPOSIT,
          fee_commitment_id: FEE,
          allocated_amount: 3_000_000,
          reversed_amount: 0,
          active_amount: 3_000_000,
          allocation_source: "manual",
          manual_lock: true,
          state_version: 4
        },
        {
          client_deposit_allocation_id: "allocation-second",
          client_group_id: CLIENT,
          bank_transaction_id: DEPOSIT,
          fee_commitment_id: "fee-second",
          allocated_amount: 500_000,
          reversed_amount: 0,
          active_amount: 500_000,
          allocation_source: "manual",
          manual_lock: true,
          state_version: 8
        }
      ],
      safe_error_codes: [],
      audit_hint_ref: "ui_client_receivables_probe",
      idempotent_replay: false,
      raw_source_payload_included: false,
      production_ready_claim: false
    };
    if (mutation.outcome) body.outcome = mutation.outcome;
    if (mutation.item) body.item = { ...body.item, ...mutation.item };
    if (mutation.first) body.items[0] = { ...body.items[0], ...mutation.first };
    return response(body);
  };
  const input = {
    bankTransactionId: DEPOSIT,
    clientGroupId: CLIENT,
    depositNetAmount: 4_000_000,
    expectedAllocations: [
      { clientDepositAllocationId: ALLOCATION, stateVersion: 3 },
      { clientDepositAllocationId: "allocation-second", stateVersion: 7 }
    ],
    targets: [
      { feeCommitmentId: FEE, activeAmount: 3_000_000 },
      { feeCommitmentId: "fee-second", activeAmount: 500_000 }
    ],
    reason: "복수 약정 배분 조정",
    idempotencyKey: "client_ar_reallocate_stable_retry"
  };
  const result = await reallocateClientReceivableDeposit(input);
  assert.equal(result.kind, "data");
  assert.deepEqual(captured.expected_allocations, [
    { client_deposit_allocation_id: ALLOCATION, state_version: 3 },
    { client_deposit_allocation_id: "allocation-second", state_version: 7 }
  ]);
  assert.equal(captured.targets.length, 2);
  assert.equal(captured.idempotency_key, "client_ar_reallocate_stable_retry");

  mutation = { outcome: "unchanged" };
  const unchanged = await reallocateClientReceivableDeposit(input);
  assert.equal(unchanged.kind, "data");
  assert.equal(unchanged.outcome, "unchanged");

  for (const hostile of [
    { first: { fee_commitment_id: "fee-wrong" } },
    { first: { client_group_id: "client-wrong" } },
    {
      first: {
        allocated_amount: 2_999_999,
        active_amount: 2_999_999
      }
    },
    { first: { state_version: 99 } },
    { item: { unallocated_amount: 499_999 } }
  ]) {
    mutation = hostile;
    const rejected = await reallocateClientReceivableDeposit(input);
    assert.equal(rejected.kind, "error", JSON.stringify(hostile));
    assert.equal(rejected.uiState, "error");
  }
});
