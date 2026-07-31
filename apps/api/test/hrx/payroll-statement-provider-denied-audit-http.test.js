import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  PAYROLL_STATEMENT_PROVIDER_CALLBACK_PATH,
  PAYROLL_STATEMENT_PROVIDER_DENIED_AUDIT_ACTION,
  PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER,
} from "../../src/routes/hrx/payroll-statement-provider-callback.js";
import { startApiServer } from "../../src/server.js";

const TENANT = "tenant-provider-audit";
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

test("PEO-TUW-070 HTTP denials persist to the durable security audit without raw callback data", async () => {
  const root = await mkdtemp(join(tmpdir(), "lawos-payroll-provider-audit-"));
  const auditStorePath = join(root, "audit", "security-audit.ndjson");
  await mkdir(join(root, "audit"), { recursive: true });
  let verifierCalls = 0;
  const started = await startApiServer({
    port: 0,
    securityAuditStorePath: auditStorePath,
    payrollStatementProviderVerifier: {
      async verify(input) {
        verifierCalls += 1;
        if (input.headers["x-provider-signature"] !== "valid-test-signature") return { ok: false };
        return {
          ok: true,
          tenant_id: TENANT,
          provider_id: "payroll-delivery-provider",
          signature_material: "must-not-cross-pre-auth-boundary",
        };
      },
    },
  });
  const baseUrl = `http://${started.host}:${started.port}`;
  async function post(body, signature) {
    const result = await fetch(`${baseUrl}${PAYROLL_STATEMENT_PROVIDER_CALLBACK_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER]: TENANT,
        "x-provider-signature": signature,
      },
      body: JSON.stringify(body),
    });
    return { status: result.status, body: await result.json() };
  }
  async function postRaw(body, signature = "valid-test-signature") {
    const result = await fetch(`${baseUrl}${PAYROLL_STATEMENT_PROVIDER_CALLBACK_PATH}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PAYROLL_STATEMENT_PROVIDER_TENANT_HEADER]: TENANT,
        "x-provider-signature": signature,
      },
      body,
    });
    return { status: result.status, body: await result.json() };
  }
  try {
    const invalid = await post(BODY, "invalid-sensitive-signature");
    const mismatch = await post({ ...BODY, tenant_id: "tenant-crossed-sensitive" }, "valid-test-signature");
    const malformed = await postRaw('{"tenant_id":');
    const oversized = await postRaw(JSON.stringify({
      tenant_id: TENANT,
      padding: "sensitive-oversized-payload".repeat(3_000),
    }));
    assert.deepEqual(
      [
        invalid.status,
        invalid.body.safe_error_code,
        mismatch.status,
        mismatch.body.safe_error_code,
        malformed.status,
        malformed.body.safe_error_code,
        oversized.status,
        oversized.body.safe_error_code,
      ],
      [
        401,
        "HRX_PAYROLL_PROVIDER_SIGNATURE_INVALID",
        403,
        "HRX_PAYROLL_PROVIDER_TENANT_MISMATCH",
        400,
        "HRX_PAYROLL_PROVIDER_BODY_INVALID",
        413,
        "API_REQUEST_BODY_TOO_LARGE",
      ],
    );
    assert.equal(verifierCalls, 2);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }

  const rawAudit = await readFile(auditStorePath, "utf8");
  const events = rawAudit
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  assert.deepEqual(events.map((event) => event.action), [
    PAYROLL_STATEMENT_PROVIDER_DENIED_AUDIT_ACTION,
    PAYROLL_STATEMENT_PROVIDER_DENIED_AUDIT_ACTION,
    PAYROLL_STATEMENT_PROVIDER_DENIED_AUDIT_ACTION,
    PAYROLL_STATEMENT_PROVIDER_DENIED_AUDIT_ACTION,
  ]);
  assert.deepEqual(events.map((event) => event.details.safe_error_code), [
    "HRX_PAYROLL_PROVIDER_SIGNATURE_INVALID",
    "HRX_PAYROLL_PROVIDER_TENANT_MISMATCH",
    "HRX_PAYROLL_PROVIDER_BODY_INVALID",
    "API_REQUEST_BODY_TOO_LARGE",
  ]);
  assert.doesNotMatch(
    rawAudit,
    new RegExp([
      TENANT,
      "tenant-crossed-sensitive",
      "invalid-sensitive-signature",
      "employee-must-never-be-audited",
      "provider-event-sensitive",
      "provider-receipt-sensitive",
      "gross_krw",
      "9999999",
      "signature_material",
      "sensitive-oversized-payload",
    ].join("|")),
  );
});
