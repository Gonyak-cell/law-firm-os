#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const ARTIFACT_PATH = process.env.LAWOS_UPL_B13_ARTIFACT_JSON
  ?? "artifacts/manual-qa/upl-b13-popbill-sandbox-proof.json";
const ENV_PATH = ".env.popbill.local";

function read(path) {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function loadEnv(path) {
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

assert.equal(existsSync(resolve(ROOT, ARTIFACT_PATH)), true, `missing ${ARTIFACT_PATH}`);

const artifactText = read(ARTIFACT_PATH);
const artifact = JSON.parse(artifactText);
const env = { ...loadEnv(ENV_PATH), ...process.env };
const forbiddenTextPatterns = [
  /Bearer\s+[A-Za-z0-9._~+/-]{12,}/i,
  /sk-(?:ant|proj|live|test)?-[A-Za-z0-9_-]{12,}/i,
  /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  /(?:corpNum|corp_num|invoicerCorpNum|invoiceeCorpNum)\s*[:=]/i,
];

assert.equal(artifact.schema_version, "lawos.wave1.upl-b13.popbill-sandbox-proof.v1");
assert.equal(artifact.row_id, "UPL-B-13");
assert.equal(artifact.vendor, "popbill");
assert.equal(artifact.sandbox_mode, true);
assert.equal(artifact.strict_boundary.owner_vendor_decision, true);
assert.equal(artifact.strict_boundary.local_3_3_withholding_model_passed, true);
assert.equal(artifact.strict_boundary.external_tax_invoice_vendor_selected, true);
assert.equal(artifact.strict_boundary.production_tax_invoice_issued, false);
assert.equal(artifact.strict_boundary.raw_secret_written_to_artifact, false);
assert.equal(Object.hasOwn(artifact, "popbill_probe_results"), false, "artifact must not store raw Popbill probe results");
assert.equal(artifact.blocker && Object.hasOwn(artifact.blocker, "issue_error"), false, "blocker must not store raw Popbill issue error");
if (artifact.blocker && Object.hasOwn(artifact.blocker, "raw_issue_error_written")) {
  assert.equal(artifact.blocker.raw_issue_error_written, false);
}
assert.equal(forbiddenTextPatterns.some((pattern) => pattern.test(artifactText)), false, "artifact must not contain secret/token/raw-body/corp-number-shaped material");

for (const probe of Object.values(artifact.popbill_probe_results_summary ?? {})) {
  assert.equal(probe.response_body_written, false);
  assert.equal(typeof probe.response_hash, "string");
}

for (const key of ["POPBILL_LINK_ID", "POPBILL_SECRET_KEY"]) {
  const value = env[key];
  if (value && value.length >= 4) {
    assert.equal(artifactText.includes(value), false, `${key} leaked into ${ARTIFACT_PATH}`);
  }
}

const allowedStatuses = new Set([
  "READY_NEEDS_POPBILL_CORP_NUM",
  "READY_NEEDS_SANDBOX_ISSUE_APPROVAL",
  "PASS_POPBILL_SANDBOX_ROUNDTRIP",
  "BLOCKED_POPBILL_SANDBOX_ISSUE_FAILED",
]);
assert.equal(allowedStatuses.has(artifact.status), true, `unexpected Popbill sandbox status: ${artifact.status}`);

if (artifact.status === "PASS_POPBILL_SANDBOX_ROUNDTRIP") {
  assert.equal(artifact.strict_boundary.external_vendor_sandbox_roundtrip, true);
  assert.equal(artifact.strict_boundary.strict_pass_claim, true);
  assert.equal(typeof artifact.popbill_receipt.request_hash, "string");
  assert.equal(typeof artifact.popbill_receipt.response_hash, "string");
  assert.equal(artifact.popbill_receipt.provider, "popbill");
  assert.equal(artifact.popbill_receipt.environment, "test");
  assert.equal(artifact.popbill_receipt.raw_request_body_written, false);
  assert.equal(artifact.popbill_receipt.raw_response_body_written, false);
} else {
  assert.equal(artifact.strict_boundary.external_vendor_sandbox_roundtrip, false);
  assert.equal(artifact.strict_boundary.strict_pass_claim, false);
  assert.ok(artifact.blocker?.reason, "non-pass Popbill sandbox artifact must state blocker reason");
}

if (artifact.status !== "READY_NEEDS_POPBILL_CORP_NUM") {
  assert.equal(artifact.withholding_mapping.gross_amount, 1_000_000);
  assert.equal(artifact.withholding_mapping.withholding_rate, 0.033);
  assert.equal(artifact.withholding_mapping.total_withholding_amount, 33_000);
  assert.equal(artifact.withholding_mapping.net_payable_amount, 967_000);
  assert.equal(artifact.withholding_mapping.popbill_native_withholding_field, false);
  assert.equal(artifact.withholding_mapping.mapped_to_field, "remark3");
  assert.equal(typeof artifact.withholding_mapping.mapped_field_hash, "string");
  assert.equal(typeof artifact.vendor_payload_summary.request_hash, "string");
  assert.equal(typeof artifact.vendor_payload_summary.mgt_key_hash, "string");
  assert.equal(artifact.vendor_payload_summary.provider, "popbill");
  assert.equal(artifact.vendor_payload_summary.environment, "test");
  assert.equal(artifact.vendor_payload_summary.supply_cost_total, 1_000_000);
  assert.equal(artifact.vendor_payload_summary.tax_total, 100_000);
  assert.equal(artifact.vendor_payload_summary.total_amount, 1_100_000);
  assert.equal(artifact.vendor_payload_summary.raw_request_body_written, false);
  assert.equal(artifact.vendor_payload_summary.raw_corp_numbers_written, false);
}

console.log(`UPL-B-13 Popbill sandbox validator PASS (${artifact.status})`);
