import assert from "node:assert/strict";
import test from "node:test";
import {
  LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
  reverseMatterOpsPaymentAllocation
} from "../src/data/apiClient.js";
import {
  createPaymentReversalController,
  fetchPaymentReversalSurfaces,
  PAYMENT_REVERSAL_REFRESH_FAILURE_MESSAGE
} from "../src/components/matter-small-firm/paymentReversalController.js";

const allocation = {
  payment_id: "payment-controller-1",
  payment_allocation_id: "allocation-controller-1"
};

function createStateLog() {
  const log = [];
  return {
    log,
    onPending(value) {
      log.push(["pending", value]);
    },
    onResult(value) {
      log.push(["result", value]);
    },
    onPaymentMatchCleared() {
      log.push(["match-cleared"]);
    }
  };
}

test("controller construction fails fast when a required collaborator is missing", () => {
  const dependencies = {
    reversePayment() {},
    refreshPaymentSurfaces() {},
    onPending() {},
    onResult() {},
    onPaymentMatchCleared() {}
  };
  for (const name of Object.keys(dependencies)) {
    const missing = { ...dependencies };
    delete missing[name];
    assert.throws(
      () => createPaymentReversalController(missing),
      new RegExp(`requires ${name}`)
    );
  }
  assert.throws(
    () => fetchPaymentReversalSurfaces({ matterId: "matter-controller-1", ctx: "allow" }),
    /requires fetchPayments/
  );
});

test("ordinary reversal failure keeps the persisted-refresh boundary untouched", async () => {
  const state = createStateLog();
  const reverseCalls = [];
  let refreshCalls = 0;
  const failure = { kind: "error", message: "처리하지 못했습니다." };
  const controller = createPaymentReversalController({
    reversePayment: async (input) => {
      reverseCalls.push(input);
      return failure;
    },
    refreshPaymentSurfaces: async () => {
      refreshCalls += 1;
      return { kind: "data" };
    },
    ...state
  });

  const result = await controller.execute({
    matterId: "matter-controller-1",
    allocation,
    reason: "실패 검증",
    ctx: "allow"
  });

  assert.equal(result, failure);
  assert.equal(refreshCalls, 0);
  assert.equal(reverseCalls.length, 1);
  assert.deepEqual(state.log, [
    ["pending", true],
    ["result", null],
    ["result", failure],
    ["pending", false]
  ]);
});

test("persisted reversal with reload failure reports the exact recovery message", async () => {
  const state = createStateLog();
  const refreshCalls = [];
  const reloadFailure = {
    kind: "error",
    safeErrorCodes: ["MATTER_OPS_RUNTIME_UNAVAILABLE"]
  };
  const controller = createPaymentReversalController({
    reversePayment: async () => ({ kind: "data", item: { payment_id: allocation.payment_id } }),
    refreshPaymentSurfaces: async (...args) => {
      refreshCalls.push(args);
      return reloadFailure;
    },
    ...state
  });

  const result = await controller.execute({
    matterId: "matter-controller-1",
    allocation,
    reason: "중복 배정 정정"
  });

  assert.deepEqual(result, {
    ...reloadFailure,
    kind: "error",
    persisted: true,
    message: PAYMENT_REVERSAL_REFRESH_FAILURE_MESSAGE
  });
  assert.deepEqual(refreshCalls, [["matter-controller-1", allocation.payment_id]]);
  assert.deepEqual(state.log, [
    ["pending", true],
    ["result", null],
    ["result", result],
    ["pending", false]
  ]);
});

test("successful reversal refreshes once, clears the stale match, and returns the mutation result", async () => {
  const state = createStateLog();
  const mutation = { kind: "data", item: { payment_id: allocation.payment_id } };
  const refreshCalls = [];
  const refreshCollaborator = (name) => async ({ matterId, ctx }) => {
    refreshCalls.push({ name, matterId, ctx });
    return { kind: "data", items: [] };
  };
  const controller = createPaymentReversalController({
    reversePayment: async () => mutation,
    refreshPaymentSurfaces: async (matterId, paymentId) => {
      assert.equal(paymentId, allocation.payment_id);
      await fetchPaymentReversalSurfaces({
        matterId,
        ctx: "allow",
        fetchPayments: refreshCollaborator("payments"),
        fetchDetail: refreshCollaborator("detail"),
        fetchCloseout: refreshCollaborator("closeout"),
        fetchTimeBilling: refreshCollaborator("timeBilling")
      });
      return {
        kind: "data",
        item: { payment_id: allocation.payment_id, unapplied_amount: 100000 }
      };
    },
    ...state
  });

  const result = await controller.execute({
    matterId: "matter-controller-1",
    allocation,
    reason: "중복 배정 정정"
  });

  assert.equal(result, mutation);
  assert.deepEqual(refreshCalls, [
    { name: "payments", matterId: "matter-controller-1", ctx: "allow" },
    { name: "detail", matterId: "matter-controller-1", ctx: "allow" },
    { name: "closeout", matterId: "matter-controller-1", ctx: "allow" },
    { name: "timeBilling", matterId: "matter-controller-1", ctx: "allow" }
  ]);
  assert.deepEqual(state.log, [
    ["pending", true],
    ["result", null],
    ["match-cleared"],
    ["result", mutation],
    ["pending", false]
  ]);
});

test("retries preserve the allocation-derived wire idempotency and reversal IDs", async () => {
  const state = createStateLog();
  const originalFetch = globalThis.fetch;
  const originalSessionContext = globalThis.__LAWOS_SESSION_CONTEXT__;
  const requests = [];
  globalThis.__LAWOS_SESSION_CONTEXT__ = {
    schema_version: LAWOS_SESSION_ENVELOPE_SCHEMA_VERSION,
    state: "signed_in",
    session_ref: "session-controller-wire",
    source: "controller-wire-test",
    actor_ref: "actor-controller-wire",
    tenant_refs: { matter: "tenant-controller-wire" },
    role_ids: ["matter_runtime_user"],
    scopes: [],
    review_state: "allow"
  };
  globalThis.fetch = async (input, init = {}) => {
    const attempt = requests.length + 1;
    requests.push({
      url: String(input),
      method: init.method,
      body: JSON.parse(init.body)
    });
    return new Response(JSON.stringify({
      outcome: attempt === 1 ? "failed" : "updated",
      ui_state: attempt === 1 ? "error" : "ready",
      item: { payment_id: allocation.payment_id },
      safe_error_codes: attempt === 1 ? ["MATTER_OPS_RUNTIME_UNAVAILABLE"] : []
    }), {
      status: attempt === 1 ? 503 : 200,
      headers: { "content-type": "application/json" }
    });
  };
  const controller = createPaymentReversalController({
    reversePayment: reverseMatterOpsPaymentAllocation,
    refreshPaymentSurfaces: async () => ({ kind: "data", item: { payment_id: allocation.payment_id } }),
    ...state
  });

  try {
    const firstResult = await controller.execute({
      matterId: "matter-controller-1",
      allocation,
      reason: "실패 검증"
    });
    const secondResult = await controller.execute({
      matterId: "matter-controller-1",
      allocation,
      reason: "중복 배정 정정"
    });
    assert.equal(firstResult.kind, "error");
    assert.equal(secondResult.kind, "data");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSessionContext === undefined) delete globalThis.__LAWOS_SESSION_CONTEXT__;
    else globalThis.__LAWOS_SESSION_CONTEXT__ = originalSessionContext;
  }

  assert.equal(requests.length, 2);
  assert.equal(requests[0].method, "POST");
  assert.equal(requests[1].method, "POST");
  assert.equal(requests[0].body.idempotency_key, "matter_ops_payment_allocation_reversal_allocation_controller_1");
  assert.equal(requests[0].body.reversal_payment_allocation_id, "payment_allocation_reversal_ui_allocation_controller_1");
  assert.equal(requests[1].body.idempotency_key, requests[0].body.idempotency_key);
  assert.equal(requests[1].body.reversal_payment_allocation_id, requests[0].body.reversal_payment_allocation_id);
  assert.equal(requests[0].body.reason, "실패 검증");
  assert.equal(requests[1].body.reason, "중복 배정 정정");
  assert.equal("reversalKey" in requests[1].body, false);
});
