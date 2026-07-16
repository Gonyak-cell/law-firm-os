#!/usr/bin/env node
import assert from "node:assert/strict";
import { createPeopleGovernancePacket } from "../apps/web/src/data/peopleWorkflowKernel.js";
import {
  PEOPLE_GOVERNANCE_PROOF_PATH,
  PEOPLE_GOVERNANCE_RECEIPT_MD_PATH,
  PEOPLE_GOVERNANCE_RECEIPT_PATH,
  markdownTable,
  readJson,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const packageJson = readJson("package.json");
assert.equal(packageJson.scripts?.["lcx:full:people-governance:validate"], "node scripts/validate-lcx-full-people-governance.mjs");
assert.equal(packageJson.scripts?.["lcx:full:people-governance-browser-proof"], "node scripts/run-lcx-full-people-governance-browser-proof.mjs");
const proof = readJson(PEOPLE_GOVERNANCE_PROOF_PATH);
assert.equal(proof.verdict, "PASS");

const blockedPacket = createPeopleGovernancePacket();
const readyPacket = createPeopleGovernancePacket({
  connectedAppProviderReceipt: {
    environment: "production",
    production_receipt_ref: "provider:receipt:people-connected-app",
    scopes: ["people.connected-app.write"],
    expires_at: "2999-01-01T00:00:00.000Z"
  }
});

assert.equal(blockedPacket.approval_type_state, "configured");
assert.equal(blockedPacket.permission_action_state, "owner-audit-required");
assert.equal(blockedPacket.field_policy_state, "sensitive-field-guarded");
assert.equal(blockedPacket.connected_app_state, "provider-blocked");
assert.equal(readyPacket.connected_app_state, "request-ready");
assert.equal(blockedPacket.direct_permission_mutation_performed, false);
assert.equal(blockedPacket.sensitive_field_exposed, false);

const receipt = {
  schema_version: "law-firm-os.lazycodex.lcx_full.people_governance_receipt.v0.1",
  generated_at: new Date().toISOString(),
  tuw_ids: ["LCX-FULL-15.01", "LCX-FULL-15.02", "LCX-FULL-15.03", "LCX-FULL-15.04", "LCX-FULL-15.05"],
  verdict: "PASS",
  browser_proof: PEOPLE_GOVERNANCE_PROOF_PATH,
  approval_type_state: blockedPacket.approval_type_state,
  permission_action_state: blockedPacket.permission_action_state,
  field_policy_state: blockedPacket.field_policy_state,
  connected_app_missing_provider_state: blockedPacket.connected_app_state,
  connected_app_ready_state: readyPacket.connected_app_state,
  boundary: {
    direct_permission_mutation_performed: false,
    sensitive_field_exposed: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(PEOPLE_GOVERNANCE_RECEIPT_PATH, receipt);
writeText(
  PEOPLE_GOVERNANCE_RECEIPT_MD_PATH,
  `# LCX-FULL-15 People Governance Receipt\n\nGenerated at: ${receipt.generated_at}\n\nVerdict: PASS\n\n${markdownTable([{ Check: "approval types", Result: blockedPacket.approval_type_state }, { Check: "permissions", Result: blockedPacket.permission_action_state }, { Check: "field policy", Result: blockedPacket.field_policy_state }, { Check: "connected app missing provider", Result: blockedPacket.connected_app_state }, { Check: "connected app request", Result: readyPacket.connected_app_state }], ["Check", "Result"])}\n\nBoundary: People governance is approval/audit/provider gated; no direct permission mutation, sensitive field exposure, provider production write, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: "PASS", receipt: PEOPLE_GOVERNANCE_RECEIPT_PATH }, null, 2));
