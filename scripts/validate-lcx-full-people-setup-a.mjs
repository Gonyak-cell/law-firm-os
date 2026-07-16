#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildPeopleReadinessCatalog,
  configurePeopleSetupRows
} from "../apps/web/src/data/peopleWorkflowKernel.js";
import {
  PEOPLE_SETUP_PROOF_PATH,
  PEOPLE_SETUP_RECEIPT_MD_PATH,
  PEOPLE_SETUP_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:people-setup-a:validate"], "node scripts/validate-lcx-full-people-setup-a.mjs");
assert.equal(packageJson.scripts?.["lcx:full:people-setup-browser-proof"], "node scripts/run-lcx-full-people-setup-browser-proof.mjs");
const proof = readJson(PEOPLE_SETUP_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const catalog = buildPeopleReadinessCatalog();
const setup = configurePeopleSetupRows();

assert.equal(catalog.catalog_state, "derived_from_people_feature_catalog");
assert.ok(catalog.total_features >= 70);
assert.ok(catalog.state_counts.setup_required >= 1);
assert.equal(catalog.count_source_hard_coded, false);
assert.equal(setup.setup_state, "configured");
assert.equal(setup.rows.length >= 6, true);
assert.equal(setup.payroll_calculation_claim, false);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.people_setup_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-14.01", "LCX-FULL-14.02", "LCX-FULL-14.03", "LCX-FULL-14.04", "LCX-FULL-14.05"],
  verdict: "PASS",
  browser_proof: PEOPLE_SETUP_PROOF_PATH,
  catalog_state: catalog.catalog_state,
  catalog_total_features: catalog.total_features,
  setup_state: setup.setup_state,
  configured_sections: setup.rows.map((row) => row.section_ref),
  boundary: {
    count_source_hard_coded: false,
    payroll_calculation_claim: false,
    payroll_disbursement_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(PEOPLE_SETUP_RECEIPT_PATH, receipt);
writeText(
  PEOPLE_SETUP_RECEIPT_MD_PATH,
  `# LCX-FULL-14 People Setup Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable([{ Check: "catalog", Result: catalog.catalog_state }, { Check: "features", Result: String(catalog.total_features) }, { Check: "setup rows", Result: setup.setup_state }, { Check: "time/leave", Result: "hrx:ui:validate required" }], ["Check", "Result"])}\n\nBoundary: People setup rows are configured/testable; no payroll calculation, payroll disbursement, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: PEOPLE_SETUP_RECEIPT_PATH }, null, 2));
