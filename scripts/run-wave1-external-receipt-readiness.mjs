#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const ROOT = process.cwd();
const ARTIFACT_JSON = join(ROOT, "artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.json");
const ARTIFACT_MD = join(ROOT, "artifacts/manual-qa/wave1-external-receipt-readiness-2026-07-03.md");
const MATRIX_PATH = "artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md";

const ENV_KEYS = Object.freeze({
  "UPL-C-09": Object.freeze([
    "OUTLOOK_ADDIN_MANIFEST_URL",
    "MICROSOFT_TENANT_ID",
    "AZURE_TENANT_ID",
    "ENTRA_CLIENT_ID",
    "MICROSOFT_CLIENT_ID",
    "GRAPH_CLIENT_ID",
  ]),
  "UPL-B-13": Object.freeze([
    "B13_TAX_INVOICE_VENDOR",
    "TAX_INVOICE_VENDOR",
    "TAX_INVOICE_SANDBOX_URL",
    "TAX_INVOICE_SANDBOX_API_KEY",
    "POPBILL_LINK_ID",
    "POPBILL_SECRET_KEY",
    "POPBILL_CORP_NUM",
    "POPBILL_TEST_MODE",
    "POPBILL_ALLOW_SANDBOX_ISSUE",
  ]),
});

const EXPECTED_OPEN_ROWS = Object.freeze({
  "UPL-B-13": "PARTIAL",
  "UPL-C-09": "BLOCKED",
  "UPL-C-10": "PARTIAL",
  "UPL-C-11": "PARTIAL",
  "UPL-C-12": "PARTIAL",
  "UPL-E-04": "PARTIAL",
});

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function loadEnvFile(path) {
  if (!existsSync(resolve(ROOT, path))) return {};
  return Object.fromEntries(
    read(path)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return index === -1 ? null : [line.slice(0, index), line.slice(index + 1)];
      })
      .filter(Boolean),
  );
}

function fileState(path) {
  return Object.freeze({ path, exists: existsSync(resolve(ROOT, path)) });
}

function matrixSnapshot() {
  const matrix = read(MATRIX_PATH);
  const rows = matrix
    .split("\n")
    .filter((line) => /^\| UPL-/.test(line))
    .map((line) => {
      const [, row_id, strict_status, evidence] = line.split("|").map((cell) => cell.trim());
      return Object.freeze({ row_id, strict_status, evidence });
    });
  const counts = rows.reduce((acc, row) => {
    acc[row.strict_status] = (acc[row.strict_status] ?? 0) + 1;
    return acc;
  }, {});
  return Object.freeze({
    path: MATRIX_PATH,
    total: rows.length,
    counts,
    open_rows: rows.filter((row) => row.strict_status !== "PASS"),
  });
}

function envPresence(rowId) {
  const fileEnv = rowId === "UPL-B-13" ? loadEnvFile(".env.popbill.local") : {};
  const merged = { ...fileEnv, ...process.env };
  return Object.freeze(
    Object.fromEntries(ENV_KEYS[rowId].map((key) => [key, Boolean(merged[key])])),
  );
}

function localProofs() {
  const a12Path = "artifacts/manual-qa/upl-a12-local-model-gateway-proof.json";
  const d16Path = "artifacts/manual-qa/d16-hrx-ai-rag-browser-2026-07-03.json";
  const c09Path = "docs/lazycodex/evidence/matter-web/artifacts/upl-c09-c12-outlook-addin-browser-proof.json";
  const c09ExternalPath = "artifacts/manual-qa/upl-c09-outlook-external-receipt-readiness.json";
  const b13Path = "artifacts/manual-qa/upl-b13-withholding-proof.json";
  const b13PopbillPath = "artifacts/manual-qa/upl-b13-popbill-sandbox-proof.json";
  const a12 = fileState(a12Path).exists ? readJson(a12Path) : null;
  const d16 = fileState(d16Path).exists ? readJson(d16Path) : null;
  const c09 = fileState(c09Path).exists ? readJson(c09Path) : null;
  const c09External = fileState(c09ExternalPath).exists ? readJson(c09ExternalPath) : null;
  const b13 = fileState(b13Path).exists ? readJson(b13Path) : null;
  const b13Popbill = fileState(b13PopbillPath).exists ? readJson(b13PopbillPath) : null;
  return Object.freeze({
    "UPL-A-12": Object.freeze({
      source_files: Object.freeze([
        fileState("packages/hrx/src/ai/model-gateway.js"),
        fileState("packages/hrx/src/ai/model-provider-registry.js"),
        fileState("apps/api/src/routes/hrx/ai.js"),
      ]),
      local_model_gateway_receipt: Object.freeze({
        path: a12Path,
        exists: Boolean(a12),
        status: a12?.status ?? null,
        provider: a12?.provider_receipt?.provider ?? null,
        model: a12?.provider_receipt?.model ?? null,
        external_call_made: a12?.provider_receipt?.external_call_made === true,
        review_queue_item_created: typeof a12?.review_queue_receipt?.review_id === "string",
        audit_event_created: typeof a12?.audit_receipt?.event_id === "string",
      }),
      inherited_local_d16_rag_browser_receipt: Object.freeze({
        path: d16Path,
        exists: Boolean(d16),
        passed: d16?.passed === true,
        check_count: Array.isArray(d16?.checks) ? d16.checks.length : 0,
      }),
    }),
    "UPL-C-09": Object.freeze({
      source_files: Object.freeze([
        fileState("apps/addin/manifest.xml"),
        fileState("apps/addin/src/main.jsx"),
        fileState("apps/api/src/outlook-addin-runtime-context.js"),
      ]),
      local_addin_browser_receipt: Object.freeze({
        path: c09Path,
        exists: Boolean(c09),
        passed: c09?.pass === true,
        provider_runtime_executed: c09?.external_receipt_boundary?.provider_runtime_executed === true,
        entra_admin_consent_receipt_present: c09?.external_receipt_boundary?.entra_admin_consent_receipt_present === true,
        outlook_web_smoke_receipt_present: c09?.external_receipt_boundary?.outlook_web_smoke_receipt_present === true,
        outlook_new_desktop_smoke_receipt_present: c09?.external_receipt_boundary?.outlook_new_desktop_smoke_receipt_present === true,
        msal_bridge_initialized: c09?.msal_bridge_probe?.initialized === true,
        msal_bridge_provider_runtime_executed: c09?.msal_bridge_probe?.provider_runtime_executed === true,
        msal_bridge_token_material_returned: c09?.msal_bridge_probe?.token_material_returned === true,
        on_message_send_handler_associated: c09?.handler_probe?.associated_actions?.includes("onMessageSendHandler") === true,
        on_message_send_handler_completed_allow_event: c09?.handler_probe?.completed_payload?.allowEvent === true,
      }),
      external_receipt_intake: Object.freeze({
        path: c09ExternalPath,
        exists: Boolean(c09External),
        status: c09External?.status ?? null,
        external_receipt_present: c09External?.external_receipt_present === true,
        strict_pass_claim: c09External?.strict_pass_claim === true,
        entra_admin_consent_receipt_present: c09External?.external_runtime?.entra_admin_consent_receipt_present === true,
        outlook_web_smoke_receipt_present: c09External?.external_runtime?.outlook_web_smoke_receipt_present === true,
        outlook_new_desktop_smoke_receipt_present: c09External?.external_runtime?.outlook_new_desktop_smoke_receipt_present === true,
        provider_runtime_executed: c09External?.external_runtime?.provider_runtime_executed === true,
        qa_mailbox_used: c09External?.external_runtime?.qa_mailbox_used === true,
        production_write_claim: c09External?.external_runtime?.production_write_claim === true,
        token_or_secret_material_written: c09External?.safety?.token_or_secret_material_written === true,
        body_or_attachment_material_written: c09External?.safety?.body_or_attachment_material_written === true,
      }),
    }),
    "UPL-B-13": Object.freeze({
      source_files: Object.freeze([fileState("packages/billing/src/tax-invoice-service.js")]),
      local_withholding_receipt: Object.freeze({
        path: b13Path,
        exists: Boolean(b13),
        status: b13?.status ?? null,
        local_3_3_withholding_model_passed: b13?.strict_boundary?.local_3_3_withholding_model_passed === true,
        external_tax_invoice_vendor_selected: b13?.strict_boundary?.external_tax_invoice_vendor_selected === true,
        external_vendor_sandbox_roundtrip: b13?.strict_boundary?.external_vendor_sandbox_roundtrip === true,
      }),
      popbill_sandbox_receipt: Object.freeze({
        path: b13PopbillPath,
        exists: Boolean(b13Popbill),
        status: b13Popbill?.status ?? null,
        sandbox_mode: b13Popbill?.sandbox_mode === true,
        credential_fingerprint_present: Boolean(
          b13Popbill?.credential_fingerprint?.link_id_hash &&
            b13Popbill?.credential_fingerprint?.secret_key_hash,
        ),
        external_vendor_sandbox_roundtrip: b13Popbill?.strict_boundary?.external_vendor_sandbox_roundtrip === true,
        strict_pass_claim: b13Popbill?.strict_boundary?.strict_pass_claim === true,
        production_tax_invoice_issued: b13Popbill?.strict_boundary?.production_tax_invoice_issued === true,
        prepared_request_hash_present: typeof b13Popbill?.vendor_payload_summary?.request_hash === "string",
        withholding_payload_mapping_present: b13Popbill?.withholding_mapping?.mapped_to_field === "remark3",
        blocker_reason: b13Popbill?.blocker?.reason ?? null,
      }),
    }),
  });
}

function readinessRows(matrix, proofs) {
  const statusFor = (rowId) => matrix.open_rows.find((row) => row.row_id === rowId)?.strict_status ?? "PASS";
  const b13PopbillRoundtrip = proofs["UPL-B-13"].popbill_sandbox_receipt.external_vendor_sandbox_roundtrip === true;
  const c09ExternalPass = proofs["UPL-C-09"].external_receipt_intake.status === "PASS_C09_OUTLOOK_EXTERNAL_RECEIPT";
  return Object.freeze([
    Object.freeze({
      row_id: "UPL-C-09",
      current_status: statusFor("UPL-C-09"),
      local_state: "Add-in manifest, taskpane shell, local browser proof, filing, attachment save, sent-mail task, code-side MSAL bridge, code-side OnMessageSend handler, and warning-only Smart Alerts proof exist.",
      credential_presence: envPresence("UPL-C-09"),
      external_receipts_required: Object.freeze([
        "Outlook web taskpane load and login smoke receipt",
        "new Outlook desktop taskpane load and login smoke receipt",
        "Entra app registration or admin-consent receipt",
        "provider runtime receipt proving M365/Graph execution",
        "sanitized external receipt JSON validated by scripts/validate-upl-c09-outlook-external-receipt.mjs",
      ]),
      external_receipt_present: c09ExternalPass,
      strict_pass_claim: c09ExternalPass,
      inherited_rows: Object.freeze(["UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"]),
      local_proof: proofs["UPL-C-09"],
    }),
    Object.freeze({
      row_id: "UPL-B-13",
      current_status: statusFor("UPL-B-13"),
      local_state: "Local Korean business-income 3.3 percent withholding model passes, Popbill is selected, and local Popbill sandbox credentials/business number are staged without production issuance.",
      credential_presence: envPresence("UPL-B-13"),
      external_receipts_required: Object.freeze([
        "Popbill test certificate setup confirmation",
        "POPBILL_ALLOW_SANDBOX_ISSUE=1 operator approval in .env.popbill.local",
        "external tax-invoice issue roundtrip receipt id",
        "sanitized request/response hash proving no production tax issuance claim",
      ]),
      external_receipt_present: b13PopbillRoundtrip,
      strict_pass_claim: b13PopbillRoundtrip,
      inherited_rows: Object.freeze([]),
      local_proof: proofs["UPL-B-13"],
    }),
  ]);
}

function commandPlan() {
  return Object.freeze([
    Object.freeze({
      row_id: "UPL-C-09",
      before_external_run: "Provide Outlook add-in manifest URL, Entra tenant/client/admin-consent evidence, and access to Outlook web plus new Outlook desktop runtime.",
      local_readiness_command: "node scripts/run-upl-c09-c12-outlook-addin-browser-proof.mjs && node scripts/validate-upl-c09-c12-outlook-addin.mjs",
      external_receipt_command_to_add_or_run: "operator Outlook web/new desktop taskpane smoke with Entra consent receipt attached to artifacts/manual-qa",
      external_receipt_validator: "node scripts/validate-upl-c09-outlook-external-receipt.mjs",
    }),
    Object.freeze({
      row_id: "UPL-B-13",
      before_external_run: "Record owner vendor decision and provide selected vendor sandbox endpoint/API key outside the repo.",
      local_readiness_command: "node scripts/run-upl-b13-withholding-proof.mjs && node scripts/validate-upl-b13-withholding.mjs",
      external_receipt_command_to_add_or_run: "node scripts/run-upl-b13-tax-invoice-sandbox-proof.mjs",
    }),
  ]);
}

function checks({ matrix, proofs, rows }) {
  const openRowMap = Object.fromEntries(matrix.open_rows.map((row) => [row.row_id, row.strict_status]));
  return Object.freeze([
    Object.freeze({ id: "matrix-has-70-rows", passed: matrix.total === 70 }),
    Object.freeze({
      id: "matrix-open-rows-match-current-strict-boundary",
      passed: Object.entries(EXPECTED_OPEN_ROWS).every(([rowId, status]) => openRowMap[rowId] === status) &&
        matrix.open_rows.length === Object.keys(EXPECTED_OPEN_ROWS).length,
      evidence: Object.freeze({ open_rows: openRowMap }),
    }),
    Object.freeze({
      id: "a12-local-model-gateway-proof-present",
      passed: proofs["UPL-A-12"].source_files.every((file) => file.exists) &&
        proofs["UPL-A-12"].inherited_local_d16_rag_browser_receipt.passed === true &&
        proofs["UPL-A-12"].local_model_gateway_receipt.status === "PASS" &&
        proofs["UPL-A-12"].local_model_gateway_receipt.external_call_made === true &&
        proofs["UPL-A-12"].local_model_gateway_receipt.review_queue_item_created === true &&
        proofs["UPL-A-12"].local_model_gateway_receipt.audit_event_created === true,
    }),
    Object.freeze({
      id: "c09-local-addin-proof-present-but-provider-runtime-missing",
      passed: proofs["UPL-C-09"].source_files.every((file) => file.exists) &&
        proofs["UPL-C-09"].local_addin_browser_receipt.passed === true &&
        proofs["UPL-C-09"].local_addin_browser_receipt.provider_runtime_executed === false &&
        proofs["UPL-C-09"].external_receipt_intake.exists === true &&
        proofs["UPL-C-09"].external_receipt_intake.status === "READY_NEEDS_OUTLOOK_EXTERNAL_RECEIPT" &&
        proofs["UPL-C-09"].external_receipt_intake.production_write_claim === false &&
        proofs["UPL-C-09"].external_receipt_intake.token_or_secret_material_written === false &&
        proofs["UPL-C-09"].external_receipt_intake.body_or_attachment_material_written === false,
    }),
    Object.freeze({
      id: "b13-local-withholding-proof-present-but-sandbox-missing",
      passed: proofs["UPL-B-13"].source_files.every((file) => file.exists) &&
        proofs["UPL-B-13"].local_withholding_receipt.local_3_3_withholding_model_passed === true &&
        proofs["UPL-B-13"].local_withholding_receipt.external_vendor_sandbox_roundtrip === false,
    }),
    Object.freeze({
      id: "no-strict-pass-claim-for-external-blockers",
      passed: rows.every((row) => row.strict_pass_claim === false && row.external_receipt_present === false),
    }),
  ]);
}

const matrix = matrixSnapshot();
const proofs = localProofs();
const rows = readinessRows(matrix, proofs);
const receiptChecks = checks({ matrix, proofs, rows });
const artifact = Object.freeze({
  schema_version: "lawos.wave1.external-receipt-readiness.v1",
  generated_at: new Date().toISOString(),
  status: receiptChecks.every((check) => check.passed) ? "PASS_EXTERNAL_RECEIPT_READINESS_LEDGER" : "FAIL",
  strict_completion_claim: false,
  production_ready_claim: false,
  matrix_snapshot: matrix,
  closed_local_model_rows: Object.freeze([
    Object.freeze({
      row_id: "UPL-A-12",
      status: "PASS",
      artifact: proofs["UPL-A-12"].local_model_gateway_receipt.path,
      provider: proofs["UPL-A-12"].local_model_gateway_receipt.provider,
      model: proofs["UPL-A-12"].local_model_gateway_receipt.model,
      inherited_closed_rows: Object.freeze(["UPL-D-16"]),
    }),
  ]),
  external_blocker_rows: rows,
  inherited_partial_rows: Object.freeze(["UPL-C-10", "UPL-C-11", "UPL-C-12", "UPL-E-04"]),
  command_plan: commandPlan(),
  checks: receiptChecks,
});

function rowMarkdownDetails(row) {
  if (row.row_id === "UPL-C-09") {
    const addinReceipt = row.local_proof.local_addin_browser_receipt;
    return [
      `MSAL bridge initialized: ${addinReceipt.msal_bridge_initialized}`,
      `MSAL bridge provider runtime executed: ${addinReceipt.msal_bridge_provider_runtime_executed}`,
      `OnMessageSend handler associated: ${addinReceipt.on_message_send_handler_associated}`,
      `OnMessageSend handler completed allowEvent: ${addinReceipt.on_message_send_handler_completed_allow_event}`,
      `Provider runtime executed: ${addinReceipt.provider_runtime_executed}`,
      `External receipt intake: ${row.local_proof.external_receipt_intake.status}`,
      `External receipt present: ${row.local_proof.external_receipt_intake.external_receipt_present}`,
    ];
  }
  if (row.row_id !== "UPL-B-13") return [];
  const popbillReceipt = row.local_proof.popbill_sandbox_receipt;
  return [
    `Prepared Popbill request hash present: ${popbillReceipt.prepared_request_hash_present}`,
    `3.3% withholding payload mapping present: ${popbillReceipt.withholding_payload_mapping_present}`,
    `Production tax invoice issued: ${popbillReceipt.production_tax_invoice_issued}`,
  ];
}

mkdirSync(dirname(ARTIFACT_JSON), { recursive: true });
writeFileSync(ARTIFACT_JSON, `${JSON.stringify(artifact, null, 2)}\n`);
writeFileSync(
  ARTIFACT_MD,
  [
    "# Wave-1 External Receipt Readiness",
    "",
    `Status: ${artifact.status}`,
    "",
    "This is a blocker/readiness receipt, not a Wave-1 completion claim.",
    "",
    "## Current Matrix",
    "",
    `- PASS: ${matrix.counts.PASS ?? 0}`,
    `- PARTIAL: ${matrix.counts.PARTIAL ?? 0}`,
    `- BLOCKED: ${matrix.counts.BLOCKED ?? 0}`,
    `- FAIL: ${matrix.counts.FAIL ?? 0}`,
    "",
    "## External Blockers",
    "",
    ...rows.flatMap((row) => [
      `### ${row.row_id} (${row.current_status})`,
      "",
      row.local_state,
      "",
      ...rowMarkdownDetails(row),
      ...(rowMarkdownDetails(row).length > 0 ? [""] : []),
      "Required external receipts:",
      ...row.external_receipts_required.map((item) => `- ${item}`),
      "",
      `Strict PASS claimed: ${row.strict_pass_claim}`,
      "",
    ]),
    "## Closed Local Model Rows",
    "",
    ...artifact.closed_local_model_rows.map((item) => `- ${item.row_id}: ${item.artifact} (${item.provider}/${item.model})`),
    "",
    "## Commands",
    "",
    ...artifact.command_plan.map((item) => `- ${item.row_id}: ${item.local_readiness_command}`),
    ...artifact.command_plan
      .filter((item) => item.external_receipt_validator)
      .map((item) => `- ${item.row_id} external receipt validator: ${item.external_receipt_validator}`),
    "",
  ].join("\n"),
);

if (artifact.status !== "PASS_EXTERNAL_RECEIPT_READINESS_LEDGER") {
  throw new Error(`Wave-1 external receipt readiness failed: ${ARTIFACT_JSON}`);
}

console.log(`Wave-1 external receipt readiness PASS -> ${ARTIFACT_JSON}`);
