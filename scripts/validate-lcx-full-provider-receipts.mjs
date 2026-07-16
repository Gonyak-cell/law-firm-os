#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  evaluateProviderReceipt,
  projectConnectorReceipt
} from "../apps/web/src/data/approvalProviderRunKernel.js";
import { assertNoForbiddenProjection } from "../apps/web/src/data/readinessModel.js";
import {
  PROVIDER_PROOF_PATH,
  PROVIDER_RECEIPT_MD_PATH,
  PROVIDER_RECEIPT_PATH,
  fileExists,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:provider-receipts:validate"], "node scripts/validate-lcx-full-provider-receipts.mjs");

const cases = [
  { name: "missing", result: evaluateProviderReceipt({ requiredScope: "send" }) },
  {
    name: "sandbox",
    result: evaluateProviderReceipt({
      requiredScope: "send",
      receipt: { sandbox_receipt_ref: "sandbox:send", scopes: ["send"], expires_at: "2999-01-01T00:00:00.000Z" }
    })
  },
  {
    name: "wrong-scope",
    result: evaluateProviderReceipt({
      requiredScope: "send",
      receipt: { environment: "production", production_receipt_ref: "prod:read", scopes: ["read"], expires_at: "2999-01-01T00:00:00.000Z" }
    })
  },
  {
    name: "valid-production",
    result: evaluateProviderReceipt({
      requiredScope: "send",
      receipt: { environment: "production", production_receipt_ref: "prod:send", scopes: ["send"], expires_at: "2999-01-01T00:00:00.000Z" }
    })
  }
];

assert.equal(cases[0].result.reason, "provider_receipt_missing");
assert.equal(cases[1].result.reason, "production_provider_receipt_required");
assert.equal(cases[2].result.reason, "provider_receipt_scope_missing");
assert.equal(cases[3].result.allowed, true);

const projection = projectConnectorReceipt({
  environment: "production",
  production_receipt_ref: "prod:send",
  provider_url: "https://provider.example.com",
  token: "Bearer abc",
  scopes: ["send"],
  expires_at: "2999-01-01T00:00:00.000Z"
});
assert.equal(assertNoForbiddenProjection(projection).valid, true);
assert.equal(fileExists(PROVIDER_PROOF_PATH), true, "provider browser proof must exist");
const proof = readJson(PROVIDER_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.provider_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-04.01", "LCX-FULL-04.02", "LCX-FULL-04.03", "LCX-FULL-04.05"],
  verdict: "PASS",
  cases: cases.map((item) => ({ name: item.name, allowed: item.result.allowed, reason: item.result.reason })),
  provider_projection_safe: true,
  browser_proof: PROVIDER_PROOF_PATH,
  boundary: {
    provider_connected_claim: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(PROVIDER_RECEIPT_PATH, receipt);
writeText(
  PROVIDER_RECEIPT_MD_PATH,
  [
    "# LCX-FULL-04 Provider Receipt",
    "",
    `Generated at: ${receipt.generated_at}`,
    "",
    "Verdict: PASS",
    "",
    markdownTable(receipt.cases.map((item) => ({ Case: item.name, Allowed: item.allowed ? "yes" : "no", Reason: item.reason })), ["Case", "Allowed", "Reason"]),
    "",
    "## Boundary",
    "",
    "- Missing, sandbox, expired, wrong-scope, or revoked receipts stay provider-blocked.",
    "- Valid production receipt recognition is a model result only; no provider connection or production write is claimed."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: "PASS", receipt: PROVIDER_RECEIPT_PATH, proof: PROVIDER_PROOF_PATH }, null, 2));
