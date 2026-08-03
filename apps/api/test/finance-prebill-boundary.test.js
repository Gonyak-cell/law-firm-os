import assert from "node:assert/strict";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import {
  FINANCE_API_ERROR_CODES,
  createFinanceRuntimeContext,
  handleFinancePreBillApprove,
} from "../src/finance-runtime-context.js";
import {
  FinancePreBillApprovalValidationError,
  classifyPreBillApprovalError,
  mapPreBillApprovalDomainError,
  parsePreBillApprovalInput,
} from "../src/finance-prebill-boundary.js";

const TENANT = "tenant_rfd_tuw_030";
const ACTOR = "actor_rfd_tuw_030";
const COMMON = Object.freeze({
  tenant_id: TENANT,
  permission_ref: "permission_rfd_tuw_030",
  audit_hint_ref: "audit_rfd_tuw_030",
});
const CONTEXT = Object.freeze({
  principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["partner"] },
  rules: [{ id: "allow_rfd_tuw_030", effect: "allow", action: "*" }],
  object_acl: [],
});

function adjustment(overrides = {}) {
  return {
    adjustment_id: "adjustment_rfd_tuw_030",
    prebill_id: "prebill_rfd_tuw_030",
    adjustment_type: "write_down",
    amount: 25,
    reason_code: "partner_write_down",
    ...overrides,
  };
}

function approvalBody(overrides = {}) {
  return {
    ...COMMON,
    idempotency_key: "idempotency_rfd_tuw_030",
    prebill_id: "prebill_rfd_tuw_030",
    adjustment: adjustment(),
    ...overrides,
  };
}

function prebillSeed(overrides = {}) {
  return {
    model_type: "PreBill",
    prebill_id: "prebill_rfd_tuw_030",
    tenant_id: TENANT,
    matter_id: "matter_rfd_tuw_030",
    wip_snapshot_id: "snapshot_rfd_tuw_030",
    partner_reviewer_id: ACTOR,
    currency: "KRW",
    status: "partner_review_required",
    total_amount: 100,
    adjustments_total: 0,
    adjustment_total: 0,
    ...overrides,
  };
}

test("RFD-TUW-030 parser normalizes the approved adjustment shape", () => {
  const parsed = parsePreBillApprovalInput(approvalBody({
    prebill_id: " prebill_rfd_tuw_030 ",
    adjustment: adjustment({
      adjustment_id: " adjustment_rfd_tuw_030 ",
      prebill_id: " prebill_rfd_tuw_030 ",
      reason_code: " partner_write_down ",
    }),
  }));
  assert.deepEqual(parsed, {
    adjustment_id: "adjustment_rfd_tuw_030",
    tenant_id: TENANT,
    prebill_id: "prebill_rfd_tuw_030",
    adjustment_type: "write_down",
    amount: 25,
    reason_code: "partner_write_down",
  });
  assert.equal(Object.isFrozen(parsed), true);
});

test("RFD-TUW-030 parser rejects malformed, nested, and unknown inputs", () => {
  const cases = [
    ["missing adjustment", approvalBody({ adjustment: undefined }), "adjustment must be an object"],
    ["null adjustment", approvalBody({ adjustment: null }), "adjustment must be an object"],
    ["array adjustment", approvalBody({ adjustment: [] }), "adjustment must be an object"],
    ["missing outer PreBill id", approvalBody({ prebill_id: "" }), "prebill_id is required"],
    ["missing nested PreBill id", approvalBody({ adjustment: adjustment({ prebill_id: "" }) }), "prebill_id is required"],
    ["nested PreBill mismatch", approvalBody({ adjustment: adjustment({ prebill_id: "other-prebill" }) }), "adjustment prebill_id must match prebill_id"],
    ["unknown adjustment field", approvalBody({ adjustment: adjustment({ total_amount: 1 }) }), "adjustment contains unsupported fields"],
    ["nested unknown object", approvalBody({ adjustment: adjustment({ metadata: { amount: 1 } }) }), "adjustment contains unsupported fields"],
    ["unsupported type", approvalBody({ adjustment: adjustment({ adjustment_type: "write_off" }) }), "adjustment_type must be write_down"],
    ["non-finite amount", approvalBody({ adjustment: adjustment({ amount: Number.NaN }) }), "adjustment amount must be a finite number"],
    ["missing reason", approvalBody({ adjustment: adjustment({ reason_code: " " }) }), "reason_code is required"],
  ];
  for (const [label, body, message] of cases) {
    assert.throws(
      () => parsePreBillApprovalInput(body),
      (error) => error instanceof FinancePreBillApprovalValidationError && error.message === message,
      label,
    );
  }
});

test("RFD-TUW-030 classifier exposes only the approved safe domain messages", () => {
  const safe = [
    [new FinancePreBillApprovalValidationError("adjustment_unsupported_fields"), "adjustment contains unsupported fields"],
    [new Error("adjustment amount must be positive"), "adjustment amount must be positive"],
    [new Error("adjustment amount exceeds PreBill remaining amount"), "adjustment amount exceeds PreBill remaining amount"],
    [new Error("PreBill not found"), "PreBill not found"],
    [new Error("PreBill linked to an Invoice is immutable"), "PreBill linked to an Invoice is immutable"],
    [new Error("idempotency_key is required"), "idempotency_key is required"],
    [new Error("invalid PreBill transition: rejected -> approve_without_adjustment"), "PreBill cannot be approved from its current status"],
    [{ message: "PreBill not found", status: 500 }, "PreBill not found"],
  ];
  for (const [error, message] of safe) assert.equal(classifyPreBillApprovalError(error), message);
  for (const error of [
    new Error("SENTINEL_INTERNAL_REPOSITORY_MESSAGE"),
    new Error("invalid PreBill transition: rejected -> reject"),
    null,
  ]) {
    assert.equal(classifyPreBillApprovalError(error), null);
  }
  const unknownTyped = new FinancePreBillApprovalValidationError("SENTINEL_REPOSITORY_SECRET");
  unknownTyped.message = "SENTINEL_REPOSITORY_SECRET";
  assert.equal(classifyPreBillApprovalError(unknownTyped), "PreBill request is invalid");
});

test("RFD-TUW-030 mapper preserves safe status/code/message and hides unknown errors", () => {
  const safe = mapPreBillApprovalDomainError(new Error("PreBill not found"));
  assert.equal(safe.status, 400);
  assert.equal(safe.code, FINANCE_API_ERROR_CODES.validation_error);
  assert.equal(safe.message, "PreBill not found");

  assert.equal(mapPreBillApprovalDomainError(new Error("SENTINEL_INTERNAL_REPOSITORY_MESSAGE")), null);
});

test("RFD-TUW-030 API parser mutation guard rejects forged nested input with no write", () => {
  const repository = createFinanceRepository({ seedRecords: [prebillSeed()] });
  const runtime = createFinanceRuntimeContext({ repository });
  const before = repository.snapshot();
  const response = handleFinancePreBillApprove({
    body: approvalBody({ adjustment: adjustment({ total_amount: 1 }) }),
    context: CONTEXT,
    requestId: "request-forged",
    runtime,
  });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body.safe_error_codes, [FINANCE_API_ERROR_CODES.validation_error]);
  assert.equal(response.body.message, "adjustment contains unsupported fields");
  assert.deepEqual(repository.snapshot(), before);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 0);
});

test("RFD-TUW-030 API redacts prototype-key, symbol, and non-string typed repository errors", () => {
  const hostileCodes = ["constructor", "toString", "__proto__", Symbol("SENTINEL_SYMBOL"), 42, null, { toString: () => "SENTINEL_OBJECT" }];
  for (const [index, code] of hostileCodes.entries()) {
    const repository = createFinanceRepository({ seedRecords: [prebillSeed()] });
    const failingRepository = Object.freeze({
      ...repository,
      getIdempotency() {
        throw new FinancePreBillApprovalValidationError(code);
      },
    });
    const runtime = createFinanceRuntimeContext({ repository: failingRepository });
    const before = repository.snapshot();
    const response = handleFinancePreBillApprove({
      body: approvalBody(),
      context: CONTEXT,
      requestId: `request-typed-hostile-${index}`,
      runtime,
    });
    assert.equal(response.status, 400, String(code));
    assert.equal(response.body.request_id, `request-typed-hostile-${index}`);
    assert.equal(response.body.outcome, "blocked");
    assert.deepEqual(response.body.items, []);
    assert.deepEqual(response.body.safe_error_codes, [FINANCE_API_ERROR_CODES.validation_error]);
    assert.equal(response.body.audit_hint_ref, COMMON.audit_hint_ref);
    assert.equal(response.body.ui_state, "blocked");
    assert.equal(response.body.count_leak_prevented, true);
    assert.equal(response.body.production_ready_claim, false);
    assert.equal(response.body.code, FINANCE_API_ERROR_CODES.validation_error);
    assert.equal(response.body.message, "PreBill request is invalid");
    assert.doesNotMatch(JSON.stringify(response.body), /SENTINEL/u);
    assert.deepEqual(repository.snapshot(), before);
    assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 0);
  }
});

test("RFD-TUW-030 API preserves trimmed adjustment result and durable write", () => {
  const repository = createFinanceRepository({ seedRecords: [prebillSeed()] });
  const runtime = createFinanceRuntimeContext({ repository });
  const response = handleFinancePreBillApprove({
    body: approvalBody({
      adjustment: adjustment({
        adjustment_id: " adjustment_rfd_tuw_030_trimmed ",
        prebill_id: " prebill_rfd_tuw_030 ",
        reason_code: " partner_write_down ",
      }),
    }),
    context: CONTEXT,
    requestId: "request-created",
    runtime,
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.outcome, "approved");
  assert.equal(response.body.item.status, "partner_approved");
  assert.equal(response.body.item.total_amount, 75);
  assert.equal(response.body.adjustment.adjustment_id, "adjustment_rfd_tuw_030_trimmed");
  assert.equal(response.body.adjustment.reason_code, "partner_write_down");
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "BillingAdjustment" }).length, 1);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).at(-1).action, "prebill.adjustment.approve");
});
