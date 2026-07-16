#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  assertNoForbiddenProjection,
  projectReadinessRecord,
  redactLcxFullValue
} from "../apps/web/src/data/readinessModel.js";
import {
  REDACTION_RECEIPT_MD_PATH,
  REDACTION_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:redaction:validate"], "node scripts/validate-lcx-full-redaction.mjs");

const cases = [
  {
    name: "provider_url",
    input: { provider_url: "https://provider.example.com/raw" }
  },
  {
    name: "token",
    input: { nested: { access_token: "Bearer provider-token" } }
  },
  {
    name: "raw_rows",
    input: { raw_rows: [{ value: "sensitive" }] }
  },
  {
    name: "storage_pointer",
    input: { storage_pointer: "s3://bucket/document.pdf" }
  },
  {
    name: "document_bytes",
    input: { document_bytes: "abc123" }
  }
].map((item) => {
  const output = redactLcxFullValue(item.input);
  const safety = assertNoForbiddenProjection(output);
  assert.equal(safety.valid, true, `${item.name} redaction failed: ${safety.serialized}`);
  return { ...item, output };
});

const projection = projectReadinessRecord({
  id: "lcx-full-redaction-validator",
  feature_id: "client-data-enrichment",
  provider_url: "https://provider.example.com/raw",
  raw_rows: [{ token: "Bearer abc" }],
  blocked_claims: ["provider_receipt"]
});
assert.equal(assertNoForbiddenProjection(projection).valid, true);
assert.equal(projection.writes_enabled, false);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.redaction_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-01.04"],
  verdict: "PASS",
  case_count: cases.length,
  redacted_cases: cases.map((item) => ({ name: item.name, output: item.output })),
  boundary: {
    denied_private_fields_reach_ui_artifacts: false,
    provider_payload_included: false,
    raw_rows_included: false,
    storage_pointer_included: false,
    token_included: false
  }
};

writeJson(REDACTION_RECEIPT_PATH, receipt);
writeText(
  REDACTION_RECEIPT_MD_PATH,
  [
    "# LCX-FULL-01 Redaction Receipt",
    "",
    `Generated at: ${receipt.generated_at}`,
    "",
    "Verdict: PASS",
    "",
    markdownTable(cases.map((item) => ({ Case: item.name, Result: "redacted" })), ["Case", "Result"]),
    "",
    "## Boundary",
    "",
    "- Provider URLs, tokens, raw rows, storage pointers, and document bytes are not allowed into UI proof artifacts.",
    "- This receipt does not claim provider connection, owner approval, production go-live, or public release."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: "PASS", receipt: REDACTION_RECEIPT_PATH, case_count: receipt.case_count }, null, 2));
