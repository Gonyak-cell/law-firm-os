#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = process.cwd();
const RECEIPT_PATH = resolvePath(
  process.env.UPL_C09_OUTLOOK_EXTERNAL_RECEIPT_PATH ??
    "artifacts/manual-qa/upl-c09-outlook-external-receipt.json",
);
const ARTIFACT_JSON = resolvePath(
  process.env.UPL_C09_OUTLOOK_EXTERNAL_RECEIPT_READINESS_PATH ??
    "artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.json",
);
const ARTIFACT_MD = resolvePath(
  process.env.UPL_C09_OUTLOOK_EXTERNAL_RECEIPT_READINESS_MD_PATH ??
    "artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.md",
);
const TEMPLATE_PATH = resolvePath(
  process.env.UPL_C09_OUTLOOK_EXTERNAL_RECEIPT_TEMPLATE_PATH ??
    "artifacts/manual-qa/upl-c09-outlook-external-receipt.template.json",
);

const ROWS_CLOSED_BY_C09_EXTERNAL_RECEIPT = Object.freeze([
  "UPL-C-09",
  "UPL-C-10",
  "UPL-C-11",
  "UPL-C-12",
  "UPL-E-04",
]);
const FEATURE_RESULT_KEYS = Object.freeze([
  "email_file",
  "attachment_save",
  "sent_mail_task",
  "smart_alert_warning_only",
]);
const FORBIDDEN_RECEIPT_PATTERNS = Object.freeze([
  /Bearer\s+[A-Za-z0-9._~+/-]{12,}/i,
  /sk-(?:ant|proj|live|test)?-[A-Za-z0-9_-]{12,}/i,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  /(?:access_token|refresh_token|id_token|client_secret|clientSecret|SecretKey|POPBILL_SECRET_KEY|ANTHROPIC_API_KEY|LAWOS_MODEL_GATEWAY_API_KEY)\s*[:=]/i,
  /(?:email_body|attachment_bytes|document_bytes|raw_body|raw_response)\s*[:=]/i,
]);

function resolvePath(path) {
  return resolve(ROOT, path);
}

function rel(path) {
  return path.startsWith(`${ROOT}/`) ? path.slice(ROOT.length + 1) : path;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length >= 6;
}

function hashLike(value) {
  return typeof value === "string" && /^[a-f0-9]{16,128}$/i.test(value.trim());
}

function providerRefPresent(section) {
  return nonEmptyString(section?.provider_request_id) ||
    hashLike(section?.provider_request_id_hash) ||
    hashLike(section?.response_hash);
}

function featureExecutedWithRef(results, key) {
  const result = results?.[key];
  return result?.executed === true && providerRefPresent(result);
}

function containsForbiddenMaterial(text) {
  return FORBIDDEN_RECEIPT_PATTERNS.some((pattern) => pattern.test(text));
}

function writeTemplateIfMissing() {
  if (existsSync(TEMPLATE_PATH)) return;
  mkdirSync(dirname(TEMPLATE_PATH), { recursive: true });
  writeFileSync(
    TEMPLATE_PATH,
    `${JSON.stringify(
      {
        schema_version: "lawos.wave1.upl-c09.outlook-external-receipt.v1",
        row_id: "UPL-C-09",
        receipt_kind: "operator_sanitized_external_receipt",
        generated_at: "REPLACE_WITH_ISO_TIMESTAMP",
        environment: {
          mailbox_tier: "qa",
          qa_mailbox_used: false,
          production_write_claim: false,
        },
        entra: {
          tenant_ref: "",
          app_registration_ref: "",
          admin_consent_receipt_ref: "",
          admin_consent_granted: false,
        },
        outlook_web: {
          taskpane_loaded: false,
          login_completed: false,
          smoke_receipt_ref: "",
        },
        outlook_new_desktop: {
          taskpane_loaded: false,
          login_completed: false,
          smoke_receipt_ref: "",
        },
        graph_provider: {
          provider: "microsoft-graph",
          runtime_executed: false,
          provider_request_id: "",
          provider_request_id_hash: "",
          response_hash: "",
          token_material_returned: false,
          response_body_material_written: false,
        },
        feature_results: {
          email_file: { executed: false, provider_request_id: "", response_hash: "" },
          attachment_save: { executed: false, provider_request_id: "", response_hash: "" },
          sent_mail_task: { executed: false, provider_request_id: "", response_hash: "" },
          smart_alert_warning_only: {
            executed: false,
            provider_request_id: "",
            response_hash: "",
            warning_only: false,
            allow_event: false,
            send_blocked: true,
          },
        },
        safety: {
          email_body_material_written: false,
          attachment_byte_material_written: false,
          client_credential_material_written: false,
          token_material_written: false,
          production_write_claim: false,
        },
      },
      null,
      2,
    )}\n`,
  );
}

function check(id, passed, evidence = undefined) {
  return Object.freeze({ id, passed: passed === true, ...(evidence === undefined ? {} : { evidence }) });
}

function validateReceipt(receipt, receiptText) {
  const checks = [
    check("schema-version", receipt.schema_version === "lawos.wave1.upl-c09.outlook-external-receipt.v1"),
    check("row-id", receipt.row_id === "UPL-C-09"),
    check("qa-mailbox-used", receipt.environment?.qa_mailbox_used === true || receipt.environment?.mailbox_tier === "qa"),
    check("no-production-write-claim", receipt.environment?.production_write_claim === false && receipt.safety?.production_write_claim === false),
    check("entra-admin-consent-present", Boolean(
      nonEmptyString(receipt.entra?.tenant_ref) &&
        nonEmptyString(receipt.entra?.app_registration_ref) &&
        nonEmptyString(receipt.entra?.admin_consent_receipt_ref) &&
        receipt.entra?.admin_consent_granted === true,
    )),
    check("outlook-web-taskpane-login-smoke", Boolean(
      receipt.outlook_web?.taskpane_loaded === true &&
        receipt.outlook_web?.login_completed === true &&
        nonEmptyString(receipt.outlook_web?.smoke_receipt_ref),
    )),
    check("outlook-new-desktop-taskpane-login-smoke", Boolean(
      receipt.outlook_new_desktop?.taskpane_loaded === true &&
        receipt.outlook_new_desktop?.login_completed === true &&
        nonEmptyString(receipt.outlook_new_desktop?.smoke_receipt_ref),
    )),
    check("graph-provider-runtime-receipt", Boolean(
      receipt.graph_provider?.provider === "microsoft-graph" &&
        receipt.graph_provider?.runtime_executed === true &&
        providerRefPresent(receipt.graph_provider),
    )),
    ...FEATURE_RESULT_KEYS.map((key) => check(`${key}-executed-with-provider-ref`, featureExecutedWithRef(receipt.feature_results, key))),
    check("smart-alert-warning-only", Boolean(
      receipt.feature_results?.smart_alert_warning_only?.warning_only === true &&
        receipt.feature_results?.smart_alert_warning_only?.allow_event === true &&
        receipt.feature_results?.smart_alert_warning_only?.send_blocked === false,
    )),
    check("no-provider-token-material", Boolean(
      receipt.graph_provider?.token_material_returned === false &&
        receipt.safety?.token_material_written === false &&
        receipt.safety?.client_credential_material_written === false,
    )),
    check("no-body-or-attachment-material", Boolean(
      receipt.graph_provider?.response_body_material_written === false &&
        receipt.safety?.email_body_material_written === false &&
        receipt.safety?.attachment_byte_material_written === false,
    )),
    check("receipt-text-has-no-secret-shaped-material", containsForbiddenMaterial(receiptText) === false),
    check("no-wave-completion-overclaim", receipt.strict_completion_claim !== true && receipt.production_ready_claim !== true),
  ];
  const passed = checks.every((item) => item.passed);
  return Object.freeze({
    schema_version: "lawos.wave1.upl-c09.outlook-external-receipt-readiness.v1",
    generated_at: new Date().toISOString(),
    row_id: "UPL-C-09",
    status: passed ? "PASS_C09_OUTLOOK_EXTERNAL_RECEIPT" : "FAIL_C09_OUTLOOK_EXTERNAL_RECEIPT",
    receipt_path: rel(RECEIPT_PATH),
    template_path: rel(TEMPLATE_PATH),
    external_receipt_present: true,
    strict_pass_claim: passed,
    closes_rows_when_matrix_is_updated: ROWS_CLOSED_BY_C09_EXTERNAL_RECEIPT,
    external_runtime: {
      entra_admin_consent_receipt_present: receipt.entra?.admin_consent_granted === true,
      outlook_web_smoke_receipt_present: receipt.outlook_web?.taskpane_loaded === true && receipt.outlook_web?.login_completed === true,
      outlook_new_desktop_smoke_receipt_present: receipt.outlook_new_desktop?.taskpane_loaded === true && receipt.outlook_new_desktop?.login_completed === true,
      provider_runtime_executed: receipt.graph_provider?.runtime_executed === true,
      graph_provider_ref_present: providerRefPresent(receipt.graph_provider),
      qa_mailbox_used: receipt.environment?.qa_mailbox_used === true || receipt.environment?.mailbox_tier === "qa",
      production_write_claim: receipt.environment?.production_write_claim === true || receipt.safety?.production_write_claim === true,
    },
    safety: {
      token_or_secret_material_written: receipt.graph_provider?.token_material_returned === true ||
        receipt.safety?.token_material_written === true ||
        receipt.safety?.client_credential_material_written === true,
      body_or_attachment_material_written: receipt.graph_provider?.response_body_material_written === true ||
        receipt.safety?.email_body_material_written === true ||
        receipt.safety?.attachment_byte_material_written === true,
      forbidden_text_detected: containsForbiddenMaterial(receiptText),
    },
    feature_results: Object.fromEntries(
      FEATURE_RESULT_KEYS.map((key) => [key, {
        executed: receipt.feature_results?.[key]?.executed === true,
        provider_ref_present: providerRefPresent(receipt.feature_results?.[key]),
      }]),
    ),
    checks,
  });
}

function missingReceiptArtifact() {
  return Object.freeze({
    schema_version: "lawos.wave1.upl-c09.outlook-external-receipt-readiness.v1",
    generated_at: new Date().toISOString(),
    row_id: "UPL-C-09",
    status: "READY_NEEDS_OUTLOOK_EXTERNAL_RECEIPT",
    receipt_path: rel(RECEIPT_PATH),
    template_path: rel(TEMPLATE_PATH),
    external_receipt_present: false,
    strict_pass_claim: false,
    closes_rows_when_matrix_is_updated: ROWS_CLOSED_BY_C09_EXTERNAL_RECEIPT,
    required_external_receipt_fields: [
      "Entra tenant/app/admin consent receipt ref",
      "Outlook web taskpane load plus login smoke receipt",
      "new Outlook desktop taskpane load plus login smoke receipt",
      "Graph/M365 provider request id or response hash",
      "email file, attachment save, sent-mail task, Smart Alert warning-only results",
      "QA mailbox/sandbox proof and no production write claim",
      "No token, client secret, email body, or attachment bytes",
    ],
    external_runtime: {
      entra_admin_consent_receipt_present: false,
      outlook_web_smoke_receipt_present: false,
      outlook_new_desktop_smoke_receipt_present: false,
      provider_runtime_executed: false,
      graph_provider_ref_present: false,
      qa_mailbox_used: false,
      production_write_claim: false,
    },
    safety: {
      token_or_secret_material_written: false,
      body_or_attachment_material_written: false,
      forbidden_text_detected: false,
    },
    checks: [
      check("external-receipt-not-present", true, { expected_path: rel(RECEIPT_PATH) }),
      check("strict-pass-not-claimed-without-external-receipt", true),
    ],
  });
}

function writeArtifact(artifact) {
  mkdirSync(dirname(ARTIFACT_JSON), { recursive: true });
  writeFileSync(ARTIFACT_JSON, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(
    ARTIFACT_MD,
    [
      "# UPL-C-09 Outlook External Receipt Intake",
      "",
      `Status: ${artifact.status}`,
      "",
      `- Receipt path: ${artifact.receipt_path}`,
      `- Template path: ${artifact.template_path}`,
      `- External receipt present: ${artifact.external_receipt_present}`,
      `- Strict PASS claimed: ${artifact.strict_pass_claim}`,
      `- Provider runtime executed: ${artifact.external_runtime.provider_runtime_executed}`,
      `- Outlook web smoke: ${artifact.external_runtime.outlook_web_smoke_receipt_present}`,
      `- New Outlook desktop smoke: ${artifact.external_runtime.outlook_new_desktop_smoke_receipt_present}`,
      `- Entra consent: ${artifact.external_runtime.entra_admin_consent_receipt_present}`,
      `- Token/secret material written: ${artifact.safety.token_or_secret_material_written}`,
      `- Body/attachment material written: ${artifact.safety.body_or_attachment_material_written}`,
      "",
      "Rows this receipt can close after the strict matrix is updated:",
      ...artifact.closes_rows_when_matrix_is_updated.map((row) => `- ${row}`),
      "",
    ].join("\n"),
  );
}

writeTemplateIfMissing();

let artifact;
if (!existsSync(RECEIPT_PATH)) {
  artifact = missingReceiptArtifact();
} else {
  const receiptText = readFileSync(RECEIPT_PATH, "utf8");
  artifact = validateReceipt(readJson(RECEIPT_PATH), receiptText);
}

writeArtifact(artifact);

assert.equal(
  ["READY_NEEDS_OUTLOOK_EXTERNAL_RECEIPT", "PASS_C09_OUTLOOK_EXTERNAL_RECEIPT"].includes(artifact.status),
  true,
  `${artifact.status}: ${ARTIFACT_JSON}`,
);
console.log(`UPL-C-09 Outlook external receipt intake ${artifact.status} -> ${rel(ARTIFACT_JSON)}`);
