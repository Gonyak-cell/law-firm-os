import assert from "node:assert/strict";
import test from "node:test";
import {
  PAYROLL_STATEMENT_PROVIDER_CALLBACK_POLICY,
  PAYROLL_STATEMENT_PROVIDER_DENIED_AUDIT_ACTION,
  PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER,
  handlePayrollStatementProviderCallback,
  verifyPayrollStatementProviderCallback,
} from "../../src/routes/hrx/payroll-statement-provider-callback.js";

const TENANT = "tenant-provider-audit";
const PROVIDER = "payroll-delivery-provider";
const HEADERS = Object.freeze({
  [PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER]: TENANT,
  "x-provider-signature": "sensitive-signature-material",
});
const BODY = Object.freeze({
  tenant_id: TENANT,
  employee_id: "employee-must-never-be-audited",
  gross_krw: 9_999_999,
  event: Object.freeze({
    provider_event_id: "provider-event-sensitive",
    provider_receipt_ref: "provider-receipt-sensitive",
    provider_event_state: "delivered",
    event_occurred_at: "2026-07-15T04:05:00.000Z",
  }),
});

function verifiedResult(overrides = {}) {
  return {
    ok: true,
    tenant_id: TENANT,
    provider_id: PROVIDER,
    signature_material: "must-not-cross-pre-auth-boundary",
    employee_id: "must-not-cross-pre-auth-boundary",
    ...overrides,
  };
}

function auditCollector() {
  const events = [];
  return {
    events,
    sink: {
      async append(event) {
        events.push(event);
      },
    },
  };
}

function guardedError(safeErrorCode, status) {
  const error = new Error("sensitive provider failure detail");
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

test("PEO-TUW-070 pre-auth returns only verified tenant/provider claims", async () => {
  const { events, sink } = auditCollector();
  const result = await verifyPayrollStatementProviderCallback({
    headers: HEADERS,
    body: BODY,
    rawBody: Buffer.from(JSON.stringify(BODY)),
    verifier: {
      async verify() {
        return verifiedResult();
      },
    },
    audit: sink,
    requestId: "request-provider-pre-auth",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.verified, {
    tenant_id: TENANT,
    provider_id: PROVIDER,
  });
  assert.deepEqual(Object.keys(result.verified).sort(), ["provider_id", "tenant_id"]);
  assert.equal(events.length, 0);
});

test("PEO-TUW-070 signature and tenant denials write hash-only security audit events", async () => {
  const { events, sink } = auditCollector();
  const invalidSignature = await verifyPayrollStatementProviderCallback({
    headers: HEADERS,
    body: BODY,
    rawBody: Buffer.from(JSON.stringify(BODY)),
    verifier: {
      async verify() {
        return { ok: false, provider_id: "untrusted-provider-claim" };
      },
    },
    audit: sink,
    requestId: "request-invalid-signature",
  });
  assert.deepEqual(
    [invalidSignature.ok, invalidSignature.response.status, invalidSignature.response.body.safe_error_code],
    [false, 401, "HRX_PAYROLL_PROVIDER_SIGNATURE_INVALID"],
  );

  const tenantMismatch = await verifyPayrollStatementProviderCallback({
    headers: HEADERS,
    body: { ...BODY, tenant_id: "tenant-crossed" },
    verifier: {
      async verify() {
        return verifiedResult();
      },
    },
    audit: sink,
    requestId: "request-tenant-mismatch",
  });
  assert.deepEqual(
    [tenantMismatch.ok, tenantMismatch.response.status, tenantMismatch.response.body.safe_error_code],
    [false, 403, "HRX_PAYROLL_PROVIDER_TENANT_MISMATCH"],
  );

  assert.deepEqual(events.map((event) => event.safe_error_code), [
    "HRX_PAYROLL_PROVIDER_SIGNATURE_INVALID",
    "HRX_PAYROLL_PROVIDER_TENANT_MISMATCH",
  ]);
  for (const event of events) {
    assert.equal(event.action, PAYROLL_STATEMENT_PROVIDER_DENIED_AUDIT_ACTION);
    assert.equal(event.policy_id, PAYROLL_STATEMENT_PROVIDER_CALLBACK_POLICY.id);
    assert.equal(event.raw_payload_included, false);
    assert.equal(event.payroll_amounts_included, false);
    assert.equal(event.employee_identifier_included, false);
    assert.equal(event.mutation_applied, false);
    assert.match(event.provider_event_identifier_hash, /^[a-f0-9]{64}$/);
    assert.match(event.provider_receipt_identifier_hash, /^[a-f0-9]{64}$/);
  }
  assert.equal(events[0].provider_identifier_hash, null);
  assert.match(events[1].provider_identifier_hash, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(
    JSON.stringify(events),
    /sensitive-signature-material|employee-must-never-be-audited|provider-event-sensitive|provider-receipt-sensitive|gross_krw|9999999|signature_material/,
  );
});

test("PEO-TUW-070 wrong provider, out-of-order, and revoked denials are audited without payload data", async () => {
  const { events, sink } = auditCollector();
  const cases = [
    ["HRX_PAYROLL_PROVIDER_ID_MISMATCH", 403],
    ["HRX_PAYROLL_PROVIDER_EVENT_OUT_OF_ORDER", 409],
    ["HRX_PAYROLL_DELIVERY_REVOKED", 409],
  ];
  for (const [safeErrorCode, status] of cases) {
    const result = await handlePayrollStatementProviderCallback({
      headers: HEADERS,
      body: BODY,
      rawBody: Buffer.from(JSON.stringify(BODY)),
      verified: { tenant_id: TENANT, provider_id: PROVIDER },
      audit: sink,
      requestId: `request-${safeErrorCode.toLowerCase()}`,
      runtime: {
        payrollRuntime: {
          documentService: {
            ingestProviderStatus() {
              throw guardedError(safeErrorCode, status);
            },
          },
        },
      },
    });
    assert.deepEqual([result.status, result.body.safe_error_code], [status, safeErrorCode]);
  }

  assert.deepEqual(events.map((event) => event.safe_error_code), cases.map(([safeErrorCode]) => safeErrorCode));
  assert.ok(events.every((event) => event.mutation_applied === false));
  assert.doesNotMatch(
    JSON.stringify(events),
    /sensitive provider failure detail|employee-must-never-be-audited|provider-event-sensitive|provider-receipt-sensitive|gross_krw|9999999/,
  );
});

test("PEO-TUW-070 denied-audit failure closes before runtime mutation", async () => {
  let runtimeMutationCalled = false;
  const result = await handlePayrollStatementProviderCallback({
    headers: HEADERS,
    body: { ...BODY, tenant_id: "tenant-crossed" },
    rawBody: Buffer.from(JSON.stringify(BODY)),
    verifier: {
      async verify() {
        return verifiedResult();
      },
    },
    audit: {
      async append() {
        throw new Error("audit storage unavailable");
      },
    },
    requestId: "request-audit-failure",
    runtime: {
      payrollRuntime: {
        documentService: {
          ingestProviderStatus() {
            runtimeMutationCalled = true;
          },
        },
      },
    },
  });

  assert.deepEqual(
    [result.status, result.body.safe_error_code, result.body.fail_closed],
    [503, "HRX_PAYROLL_PROVIDER_AUDIT_UNAVAILABLE", true],
  );
  assert.equal(runtimeMutationCalled, false);
  assert.doesNotMatch(JSON.stringify(result.body), /audit storage unavailable|tenant-crossed/);
});
