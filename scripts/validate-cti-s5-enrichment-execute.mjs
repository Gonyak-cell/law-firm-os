#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const GOAL_ID = "cti-s5-enrichment-execute";
const I12_REF = "I12-CTI-S5-ENRICHMENT-OWNER-APPROVAL-2026-07-06";
const I26_REF = "I26-CTI-REMAINING-EXECUTION-OMNIBUS-OWNER-APPROVAL-2026-07-06";
const LAUNCH_RECEIPT_JSON = join(ROOT, "docs/launch/cti-s5-enrichment-execute-receipt-2026-07-06.json");
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-s5-enrichment-execute");
const CROSSWALK_JSON = join(ROOT, "docs/launch/cti-s5-enrichment-execute-crosswalk-2026-07-06.json");

const findings = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function assert(condition, message, details = {}) {
  if (!condition) findings.push({ message, details });
}

const receipt = readJson(LAUNCH_RECEIPT_JSON);
const packet = readJson(join(CLOSEOUT_DIR, "packet.json"));
const commandEvidence = readJson(join(CLOSEOUT_DIR, "command-evidence.json"));
const review = readJson(join(CLOSEOUT_DIR, "claude-review-result.json"));
const inspection = readJson(join(CLOSEOUT_DIR, "construction-inspection.json"));
const crosswalk = readJson(CROSSWALK_JSON);

assert(receipt.goal_id === GOAL_ID, "launch receipt goal_id mismatch");
assert(packet.goal_id === GOAL_ID, "packet goal_id mismatch");
assert(receipt.approval_signature_refs?.includes(I12_REF), "I12 approval ref missing");
assert(receipt.approval_signature_refs?.includes(I26_REF), "I26 approval ref missing");
assert(receipt.lambda_receipt?.ok === true, "lambda receipt is not ok");
assert(receipt.lambda_receipt?.status === "PASS", "lambda receipt status is not PASS");
assert(receipt.lambda_receipt?.s5_g_validation?.pass === true, "S5-G did not pass");
assert(receipt.lambda_receipt?.staffing?.responsible_attorney_matter_count === 148, "responsible attorney matter count mismatch");
assert(receipt.lambda_receipt?.staffing?.kyt_accountant_not_attorney === true, "KYT accountant boundary missing");
assert(receipt.lambda_receipt?.staffing?.accounting_support_readback_count === 5, "KYT accounting support readback count mismatch");
assert(receipt.lambda_receipt?.party?.party_readback_count === 99, "party readback count mismatch");
assert(receipt.lambda_receipt?.contacts?.internal_user_email_contact_readback_count === 9, "internal contact readback count mismatch");
assert(receipt.lambda_receipt?.contacts?.phone_contact_source_available === false, "phone source unavailable boundary mismatch");
assert(receipt.lambda_receipt?.conflict_index?.client_conflict_index_readback_count === 99, "conflict index readback count mismatch");
assert(receipt.lambda_receipt?.finance_analytics?.finance_reference_readback_count === 148, "finance reference count mismatch");
assert(receipt.lambda_receipt?.finance_analytics?.analytics_reference_readback_count === 148, "analytics reference count mismatch");
assert(receipt.lambda_receipt?.boundary?.production_ready_claim === false, "production_ready claim must remain false");
assert(receipt.lambda_receipt?.boundary?.go_live_claim === false, "go-live claim must remain false");
assert(receipt.boundary?.plaintext_pii_committed === false, "plaintext PII committed boundary mismatch");
assert(receipt.boundary?.token_password_secret_value_committed === false, "secret/token/password committed boundary mismatch");
assert(packet.status === "s5_enrichment_execute_pass", "packet status mismatch");
assert(packet.verdict === "PASS", "packet verdict mismatch");
assert(commandEvidence.commands?.some((command) => command.command === "aws lambda invoke cti_s5_enrichment_execute" && command.exit_code === 0), "lambda invoke command evidence missing");
assert(review.verdict === "PASS", "review verdict mismatch");
assert(inspection.s5_g_pass === true, "construction inspection S5-G mismatch");
assert(crosswalk.tasks?.["S5-G"]?.status === "PASS", "crosswalk S5-G status mismatch");

function collectStringValues(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, output);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStringValues(item, output);
  }
  return output;
}

const receiptStringValues = collectStringValues(receipt);
assert(!receiptStringValues.some((value) => (
  /(initial_password|plaintext_password|reset_url|secret_value|session_token|LAWOS_VAULT_BRIDGE_TOKEN)/i.test(value)
)), "sensitive value marker leaked into receipt");

if (findings.length > 0) {
  console.error(JSON.stringify({ outcome: "failed", validator: "cti-s5-enrichment-execute", findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  outcome: "passed",
  validator: "cti-s5-enrichment-execute",
  status: packet.status,
  s5_g_pass: receipt.lambda_receipt.s5_g_validation.pass,
  production_ready_claim: receipt.lambda_receipt.boundary.production_ready_claim,
  go_live_claim: receipt.lambda_receipt.boundary.go_live_claim,
}, null, 2));
