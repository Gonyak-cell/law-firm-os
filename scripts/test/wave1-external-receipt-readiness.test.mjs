import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("Wave-1 external receipt readiness ledger is current and non-promoting", () => {
  execFileSync(process.execPath, ["scripts/validate-upl-c09-outlook-external-receipt.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/run-wave1-external-receipt-readiness.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/validate-wave1-external-receipt-readiness.mjs"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
});

test("C09 Outlook external receipt intake accepts only sanitized complete operator receipts", () => {
  const dir = mkdtempSync(join(tmpdir(), "lawos-c09-receipt-"));
  const receiptPath = join(dir, "receipt.json");
  const readinessPath = join(dir, "readiness.json");
  const readinessMdPath = join(dir, "readiness.md");
  const templatePath = join(dir, "template.json");
  writeFileSync(receiptPath, `${JSON.stringify({
    schema_version: "lawos.wave1.upl-c09.outlook-external-receipt.v1",
    row_id: "UPL-C-09",
    receipt_kind: "operator_sanitized_external_receipt",
    generated_at: "2026-07-03T00:00:00.000Z",
    environment: {
      mailbox_tier: "qa",
      qa_mailbox_used: true,
      production_write_claim: false,
    },
    entra: {
      tenant_ref: "tenant-hash-a1b2c3",
      app_registration_ref: "app-hash-d4e5f6",
      admin_consent_receipt_ref: "consent-ticket-12345",
      admin_consent_granted: true,
    },
    outlook_web: {
      taskpane_loaded: true,
      login_completed: true,
      smoke_receipt_ref: "outlook-web-smoke-12345",
    },
    outlook_new_desktop: {
      taskpane_loaded: true,
      login_completed: true,
      smoke_receipt_ref: "new-outlook-smoke-12345",
    },
    graph_provider: {
      provider: "microsoft-graph",
      runtime_executed: true,
      provider_request_id_hash: "0123456789abcdef0123456789abcdef",
      response_hash: "abcdef0123456789abcdef0123456789",
      token_material_returned: false,
      response_body_material_written: false,
    },
    feature_results: {
      email_file: { executed: true, response_hash: "11111111111111111111111111111111" },
      attachment_save: { executed: true, response_hash: "22222222222222222222222222222222" },
      sent_mail_task: { executed: true, response_hash: "33333333333333333333333333333333" },
      smart_alert_warning_only: {
        executed: true,
        response_hash: "44444444444444444444444444444444",
        warning_only: true,
        allow_event: true,
        send_blocked: false,
      },
    },
    safety: {
      email_body_material_written: false,
      attachment_byte_material_written: false,
      client_credential_material_written: false,
      token_material_written: false,
      production_write_claim: false,
    },
  }, null, 2)}\n`);

  execFileSync(process.execPath, ["scripts/validate-upl-c09-outlook-external-receipt.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      UPL_C09_OUTLOOK_EXTERNAL_RECEIPT_PATH: receiptPath,
      UPL_C09_OUTLOOK_EXTERNAL_RECEIPT_READINESS_PATH: readinessPath,
      UPL_C09_OUTLOOK_EXTERNAL_RECEIPT_READINESS_MD_PATH: readinessMdPath,
      UPL_C09_OUTLOOK_EXTERNAL_RECEIPT_TEMPLATE_PATH: templatePath,
    },
    stdio: "pipe",
  });
  const readiness = JSON.parse(readFileSync(readinessPath, "utf8"));
  assert.equal(readiness.status, "PASS_C09_OUTLOOK_EXTERNAL_RECEIPT");
  assert.equal(readiness.external_receipt_present, true);
  assert.equal(readiness.strict_pass_claim, true);
});
