import assert from "node:assert/strict";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { renderSimpleTextPdf } from "../../../packages/billing/src/invoice-pdf-service.js";
import { createBankImportPreviewTokenAuthority } from "../src/bank-import-preview-token.js";
import {
  createFinanceRuntimeContext,
  handleFinanceBankImport,
  handleFinanceBankImportPreview,
} from "../src/finance-runtime-context.js";

const TENANT = "tenant-bank-confirmation";
const ACTOR = "user-bank-confirmation";
const ACCOUNT = "account-bank-confirmation";

function permissionContext() {
  return {
    principal: {
      tenant_id: TENANT,
      user_id: ACTOR,
      role_ids: ["system_super_admin"],
      scopes: ["finance.bank.import", "finance.bank.read"],
    },
    rules: [{ id: "allow-bank-confirmation", effect: "allow", action: "*" }],
    object_acl: [],
  };
}

function sourceFile() {
  const statement = renderSimpleTextPdf([
    "2026/07/28",
    "inflow 1,500 13,700  bank transfer  Client C",
    "14:50:03",
  ]);
  return {
    filename: "bank-statement.pdf",
    mime_type: "application/pdf",
    byte_size: statement.byteLength,
    content_base64: statement.toString("base64"),
  };
}

test("CL-P1-W01-T03 an expired confirmation only replays its already-bound request", async () => {
  let now = Date.parse("2026-07-30T01:00:00.000Z");
  const repository = createFinanceRepository();
  const runtime = createFinanceRuntimeContext({
    repository,
    bankImportPreviewTokens: createBankImportPreviewTokenAuthority({
      secret: "bank-confirmation-expiry-test-secret-material",
      now: () => now,
    }),
  });
  const common = {
    tenant_id: TENANT,
    permission_ref: "perm-bank-confirmation",
    audit_hint_ref: "audit-bank-confirmation",
    account_ref: ACCOUNT,
    file: sourceFile(),
  };
  const preview = await handleFinanceBankImportPreview({
    body: common,
    context: permissionContext(),
    requestId: "request-bank-preview",
    runtime,
  });
  assert.equal(preview.status, 200);
  const confirm = {
    ...common,
    production_import_approved: true,
    idempotency_key: "bank-confirmation-expiry",
    preview_confirmation_token: preview.body.preview.preview_confirmation_token,
  };
  const first = await handleFinanceBankImport({
    body: confirm,
    context: permissionContext(),
    requestId: "request-bank-confirm",
    runtime,
  });
  assert.equal(first.status, 201);

  now += 10 * 60 * 1000;
  const replay = await handleFinanceBankImport({
    body: confirm,
    context: permissionContext(),
    requestId: "request-bank-confirm-replay",
    runtime,
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.outcome, "idempotent_replay");

  const expiredNewRequest = await handleFinanceBankImport({
    body: { ...confirm, idempotency_key: "bank-confirmation-expired-new" },
    context: permissionContext(),
    requestId: "request-bank-confirm-expired-new",
    runtime,
  });
  assert.equal(expiredNewRequest.status, 410);
  assert.deepEqual(
    expiredNewRequest.body.safe_error_codes,
    ["FINANCE_PREVIEW_CONFIRMATION_EXPIRED"],
  );
});
