#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  LCX_FULL_MODEL_DECLARATIONS,
  LCX_FULL_SAFE_READINESS_FIXTURES,
  assertNoForbiddenProjection,
  transitionReadinessState,
  validateLcxFullReadinessModel
} from "../apps/web/src/data/readinessModel.js";
import {
  STATE_MODEL_RECEIPT_MD_PATH,
  STATE_MODEL_RECEIPT_PATH,
  markdownTable,
  readJson,
  readText,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
const apiClient = readText("apps/web/src/data/apiClient.js");
const traceability = readText("docs/lazycodex/lcx-full-implementation-tuw-traceability-2026-06-30.md");
const validation = validateLcxFullReadinessModel();
const transitions = [
  { from: "not_configured", to: "configured", expected: true },
  { from: "configured", to: "approval_requested", expected: false },
  { from: "preflight_passed", to: "owner_approved", expected: false },
  { from: "owner_approved", to: "provider_receipt_recorded", expected: true },
  { from: "owner_approved", to: "execution_requested", expected: false }
].map((item) => ({ ...item, result: transitionReadinessState(item) }));

assert.equal(validation.valid, true, validation.errors.join("\n"));
assert.equal(Object.keys(LCX_FULL_MODEL_DECLARATIONS).length, 7);
assert.equal(apiClient.includes("from \"./readinessModel.js\""), true, "apiClient must re-export readiness model");
assert.equal(packageJson.scripts?.["lcx:full:state-model:validate"], "node scripts/validate-lcx-full-state-model.mjs");
assert.equal(traceability.includes("not_configured"), true, "traceability must include claim ladder states");
assert.equal(traceability.includes("approval_requested"), true, "traceability must include approval ladder");
assert.equal(traceability.includes("audited"), true, "traceability must include audit ladder");

for (const transition of transitions) {
  assert.equal(transition.result.allowed, transition.expected, `${transition.from} -> ${transition.to}`);
}
for (const fixture of LCX_FULL_SAFE_READINESS_FIXTURES) {
  assert.equal(assertNoForbiddenProjection(fixture).valid, true, `${fixture.id} must be safe`);
}

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.state_model_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-01.01", "LCX-FULL-01.02", "LCX-FULL-01.03", "LCX-FULL-01.05"],
  verdict: "PASS",
  model_names: Object.keys(LCX_FULL_MODEL_DECLARATIONS),
  transitions,
  fixture_count: LCX_FULL_SAFE_READINESS_FIXTURES.length,
  boundary: {
    writes_enabled_by_model: false,
    owner_approval_claim: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(STATE_MODEL_RECEIPT_PATH, receipt);
writeText(
  STATE_MODEL_RECEIPT_MD_PATH,
  [
    "# LCX-FULL-01 State Model Receipt",
    "",
    `Generated at: ${receipt.generated_at}`,
    "",
    "Verdict: PASS",
    "",
    markdownTable(
      transitions.map((transition) => ({
        From: transition.from,
        To: transition.to,
        Allowed: transition.result.allowed ? "yes" : "no",
        Reason: transition.result.reason
      })),
      ["From", "To", "Allowed", "Reason"]
    ),
    "",
    "## Boundary",
    "",
    "- Shared model only; no writes are enabled.",
    "- Owner approval, provider production write, production go-live, and public release claims remain false."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: "PASS", receipt: STATE_MODEL_RECEIPT_PATH, model_count: receipt.model_names.length }, null, 2));
