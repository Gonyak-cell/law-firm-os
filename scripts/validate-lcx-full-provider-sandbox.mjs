#!/usr/bin/env node
import assert from "node:assert/strict";
import { evaluateProviderReceipt, projectConnectorReceipt } from "../apps/web/src/data/approvalProviderRunKernel.js";
import { readJson } from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:provider-sandbox:validate"], "node scripts/validate-lcx-full-provider-sandbox.mjs");

const sandbox = projectConnectorReceipt({
  sandbox_receipt_ref: "sandbox:mail",
  scopes: ["send"],
  expires_at: "2999-01-01T00:00:00.000Z"
});
const productionCheck = evaluateProviderReceipt({ receipt: sandbox, requiredScope: "send", productionRequired: true });
const sandboxCheck = evaluateProviderReceipt({ receipt: sandbox, requiredScope: "send", productionRequired: false });

assert.equal(sandbox.receipt_state, "sandbox_recorded");
assert.equal(productionCheck.allowed, false);
assert.equal(productionCheck.reason, "production_provider_receipt_required");
assert.equal(sandboxCheck.allowed, true);

console.log(JSON.stringify({
  verdict: "PASS",
  sandbox_receipt_state: sandbox.receipt_state,
  production_check: productionCheck.reason,
  boundary: {
    sandbox_receipt_treated_as_production: false,
    provider_connected_claim: false,
    provider_production_write_claim: false
  }
}, null, 2));
