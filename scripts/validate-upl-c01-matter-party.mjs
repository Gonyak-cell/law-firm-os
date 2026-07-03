#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function exists(path) {
  return statSync(new URL(`../${path}`, import.meta.url)).isFile();
}

const matterPartyService = read("packages/matter/src/matter-party-service.js");
const matterIndex = read("packages/matter/src/index.js");
const matterRuntime = read("apps/api/src/matter-runtime-context.js");
const apiClient = read("apps/web/src/data/apiClient.js");
const mattersSurface = read("apps/web/src/components/MattersSurface.jsx");
const apiTest = read("apps/api/test/cmp-r4-g4-matter.test.js");
const runtimeTest = read("packages/matter/test/runtime-services.test.js");
const uiProofScript = read("scripts/run-lcx-vltui-matter-sections-proof.mjs");
const proofScript = read("scripts/run-upl-c01-matter-party-proof.mjs");
const proof = JSON.parse(read("artifacts/manual-qa/upl-c01-matter-party-proof.json"));
const uiProof = JSON.parse(read("docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-matter-sections-proof.json"));

assert.match(matterPartyService, /export function registerMatterParty/);
assert.match(matterPartyService, /export function listMatterParties/);
assert.match(matterPartyService, /CONFLICT_SUBJECT_ROLES/);
assert.match(matterPartyService, /retroactive_entry/);
assert.match(matterPartyService, /raw_contact_values_included: false/);
assert.match(matterIndex, /export \* from "\.\/matter-party-service\.js"/);
assert.match(matterRuntime, /handleMatterPartyRegister/);
assert.match(matterRuntime, /handleMatterPartyList/);
assert.match(matterRuntime, /matterPartiesMatch/);
assert.match(matterRuntime, /\/parties/);
assert.match(matterRuntime, /adverse_parties/);
assert.match(apiClient, /export function registerMatterParty/);
assert.match(apiClient, /\/api\/matters\/\$\{encodeURIComponent\(matterId\)\}\/parties/);
assert.match(apiClient, /matterParties: body\.matter_parties/);
assert.match(apiClient, /adverseParties: body\.adverse_parties/);
assert.match(mattersSurface, /data-matter-adverse-party-form="true"/);
assert.match(mattersSurface, /data-matter-adverse-party-list="true"/);
assert.match(mattersSurface, /소급 입력/);
assert.match(mattersSurface, /handleRegisterAdverseParty/);
assert.match(apiTest, /G4 Matter adverse party registration is idempotent and visible on detail/);
assert.match(runtimeTest, /MatterParty runtime stores adverse parties with model_type filter visibility/);
assert.match(proofScript, /adverse-party-registers-retroactive-conflict-subject/);
assert.match(uiProofScript, /adverse-party-retroactive-registration-visible/);
assert.equal(exists("docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-screenshots/lcx-vltui-06-adverse-party-proof.png"), true);

assert.equal(proof.contract_ref, "UPL-C-01");
assert.equal(proof.verdict, "PASS");
for (const check of proof.checks) assert.equal(check.passed, true, check.id);
assert.equal(proof.observed.created.status, 201);
assert.equal(proof.observed.created.item.display_name, "상대방 주식회사");
assert.equal(proof.observed.created.item.party_role, "adverse_party");
assert.equal(proof.observed.created.item.conflict_subject, true);
assert.equal(proof.observed.created.item.retroactive_entry, true);
assert.equal(proof.observed.created.item.raw_contact_values_included, false);
assert.equal(proof.observed.replay.outcome, "idempotent_replay");
assert.equal(proof.observed.listed.count, 1);
assert.equal(proof.observed.detail.adverse_party_count, 1);
assert.equal(proof.observed.command.adverse_parties[0].display_name, "상대방 주식회사");
assert.equal(proof.observed.audit.actions.includes("matter.party.registered"), true);

assert.equal(uiProof.verdict, "PASS");
const uiCase = uiProof.cases[0];
assert.equal(uiCase.checks.some((check) => check.id === "adverse-party-retroactive-registration-visible" && check.passed === true), true);
assert.equal(
  uiCase.writes.some(
    (write) =>
      write.kind === "matter_adverse_party" &&
      write.audit_hint_ref === "ui_upl_c01_matter_party_write_probe" &&
      write.actor_id === "user_lcx_vltui_session",
  ),
  true,
);
assert.match(uiCase.adverse_party_screenshot, /lcx-vltui-06-adverse-party-proof\.png/);

console.log("UPL-C-01 Matter adverse party validation passed.");
console.log("proof: artifacts/manual-qa/upl-c01-matter-party-proof.json");
