#!/usr/bin/env node
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GuardedActionButton,
  GuardedActionRow,
  GuardedReceiptRow,
  GuardedStateNotice,
  GuardedStatusBadge
} from "../apps/web/src/components/GuardedState.js";
import {
  GUARDED_UI_PROOF_MD_PATH,
  GUARDED_UI_PROOF_PATH,
  GUARDED_UI_RECEIPT_MD_PATH,
  GUARDED_UI_RECEIPT_PATH,
  fileExists,
  markdownTable,
  readJson,
  readText,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
const component = readText("apps/web/src/components/GuardedState.js");
const globalUtility = readText("apps/web/src/components/GlobalUtilitySurface.jsx");
const testSource = readText("apps/web/test/lcx-full-guarded-ui.test.mjs");

assert.equal(packageJson.scripts?.["lcx:full:guarded-ui:validate"], "node scripts/validate-lcx-full-guarded-ui.mjs");
assert.equal(packageJson.scripts?.["lcx:full:guarded-ui-browser-proof"], "node scripts/run-lcx-full-guarded-ui-browser-proof.mjs");
for (const required of ["GuardedStatusBadge", "GuardedActionRow", "GuardedReceiptRow", "GuardedActionButton", "GuardedStateNotice"]) {
  assert.equal(component.includes(required), true, `${required} missing`);
  assert.equal(testSource.includes(required), true, `${required} test coverage missing`);
}
assert.equal(globalUtility.includes("GuardedStateNotice"), true, "GlobalUtilitySurface must adopt shared guarded notice");
assert.equal(globalUtility.includes("data-global-audit-required"), true, "audit data attr must be preserved");
assert.equal(globalUtility.includes("data-global-decision-required"), true, "decision data attr must be preserved");

const html = renderToStaticMarkup(
  React.createElement(
    "div",
    null,
    React.createElement(GuardedStatusBadge, { state: "provider_blocked" }),
    React.createElement(GuardedStateNotice, { state: "audit_required", dataAttrs: { "data-global-audit-required": "true" } }),
    React.createElement(GuardedReceiptRow, { kind: "provider", state: "provider_blocked" }),
    React.createElement(GuardedActionRow, { state: "owner_blocked" }),
    React.createElement(GuardedActionButton, { state: "write_disabled" })
  )
);
assert.match(html, /data-lcx-full-write-enabled="false"/);
assert.match(html, /data-lcx-full-receipt-kind="provider"/);
assert.match(html, /disabled=""/);

assert.equal(fileExists(GUARDED_UI_PROOF_PATH), true, "guarded UI browser proof is required");
assert.equal(fileExists(GUARDED_UI_PROOF_MD_PATH), true, "guarded UI markdown proof is required");
const proof = readJson(GUARDED_UI_PROOF_PATH);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_full.guarded_ui_browser_proof.v0.1");
assert.equal(proof.verdict, "PASS");
assert.equal(proof.routes.length >= 6, true);
for (const route of proof.routes) {
  assert.equal(route.forbidden_text_detected, false, `${route.id} forbidden text`);
  assert.equal(route.console_unexpected_errors.length, 0, `${route.id} unexpected console errors`);
  assert.equal(route.unexpected_http_failures.length, 0, `${route.id} unexpected HTTP failures`);
  assert.equal(route.page_errors.length, 0, `${route.id} page errors`);
}

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.guarded_ui_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-02.01", "LCX-FULL-02.02", "LCX-FULL-02.03", "LCX-FULL-02.04", "LCX-FULL-02.05"],
  verdict: "PASS",
  component_exports: ["GuardedStatusBadge", "GuardedActionRow", "GuardedReceiptRow", "GuardedActionButton", "GuardedStateNotice"],
  proof: GUARDED_UI_PROOF_PATH,
  route_count: proof.routes.length,
  boundary: {
    writes_enabled: false,
    owner_approval_claim: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(GUARDED_UI_RECEIPT_PATH, receipt);
writeText(
  GUARDED_UI_RECEIPT_MD_PATH,
  [
    "# LCX-FULL-02 Guarded UI Receipt",
    "",
    `Generated at: ${receipt.generated_at}`,
    "",
    "Verdict: PASS",
    "",
    markdownTable(receipt.component_exports.map((name) => ({ Component: name, Status: "covered" })), ["Component", "Status"]),
    "",
    `Browser proof: ${GUARDED_UI_PROOF_PATH}`,
    "",
    "## Boundary",
    "",
    "- Shared guarded UI components and route evidence keep writes disabled.",
    "- No owner approval, provider production write, production go-live, or public release claim is made."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: "PASS", receipt: GUARDED_UI_RECEIPT_PATH, proof: GUARDED_UI_PROOF_PATH }, null, 2));
