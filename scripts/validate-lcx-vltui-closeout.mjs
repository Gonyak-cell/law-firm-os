#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function requireText(path, text) {
  assert.ok(read(path).includes(text), `${path} missing ${text}`);
}

const packagePath = "package.json";
const proofPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-closeout-proof.json";
const proofMdPath = "docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-closeout-proof.md";
const closeoutJsonPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-closeout-2026-06-29.json";
const closeoutMdPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-closeout-2026-06-29.md";
const mainReceiptPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-receipt-2026-06-29.json";
const planPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-tuw-plan-2026-06-29.md";
const gapLedgerPath = "docs/lazycodex/lcx-vault-app-current-ui-gap-ledger-2026-06-29.json";
const mvLinkPath = "docs/lazycodex/lcx-vltui-mv-link-acceptance-2026-06-29.md";
const claimBoundaryPath = "docs/lazycodex/lcx-vault-app-current-ui-claim-boundary-2026-06-29.json";

for (const path of [
  packagePath,
  proofPath,
  proofMdPath,
  closeoutJsonPath,
  closeoutMdPath,
  mainReceiptPath,
  planPath,
  gapLedgerPath,
  mvLinkPath,
  claimBoundaryPath
]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson(packagePath);
assert.equal(packageJson.scripts?.["lcx:vltui:closeout:proof"], "node scripts/run-lcx-vltui-closeout-proof.mjs");
assert.equal(packageJson.scripts?.["lcx:vltui:closeout:validate"], "node scripts/validate-lcx-vltui-closeout.mjs");

const proof = readJson(proofPath);
assert.equal(proof.schema_version, "law-firm-os.lazycodex.lcx_vltui.closeout_proof.v0.1");
assert.deepEqual(proof.tuw_ids, [
  "LCX-VLTUI-90.01",
  "LCX-VLTUI-90.02",
  "LCX-VLTUI-90.03",
  "LCX-VLTUI-90.04",
  "LCX-VLTUI-90.05",
  "LCX-VLTUI-90.06",
  "LCX-VLTUI-90.07"
]);
assert.equal(proof.verdict, "PASS");
assert.equal(proof.boundary.synthetic_route_interception_only, true);
assert.equal(proof.boundary.client_to_matter_handoff_mounted, true);
assert.equal(proof.boundary.matter_to_vault_workspace_mounted, true);
assert.equal(proof.boundary.vault_to_matter_lookup_mounted, true);
assert.equal(proof.boundary.people_profile_global_mounted, true);
assert.equal(proof.boundary.customer_document_import_executed, false);
assert.equal(proof.boundary.vault_document_mutation_executed, false);
assert.equal(proof.boundary.vault_document_write_enabled, false);
assert.equal(proof.boundary.provider_send_executed, false);
assert.equal(proof.boundary.owner_final_approval, false);
assert.equal(proof.boundary.production_ready, false);
assert.equal(proof.boundary.public_release, false);
assert.equal(proof.boundary.go_live_approved, false);

const cases = new Map(proof.cases.map((item) => [item.id, item]));
for (const id of [
  "client-to-matter-handoff",
  "matter-to-vault-workspace",
  "vault-to-matter-lookup",
  "people-profile-global"
]) {
  const row = cases.get(id);
  assert.ok(row, `${id} case missing`);
  assert.equal(row.passed, true, `${id} must pass`);
  assert.equal(row.api_error_count, 0, `${id} API errors must stay zero`);
  assert.equal(row.unexpected_write_count, 0, `${id} unexpected writes must stay zero`);
  assert.equal(row.console_errors.length, 0, `${id} console errors must stay zero`);
  assert.equal(row.page_errors.length, 0, `${id} page errors must stay zero`);
  assert.equal(row.forbidden_text_detected, false, `${id} must not leak forbidden text`);
  assert.equal(existsSync(row.screenshot), true, `${id} screenshot missing`);
  for (const check of row.checks) assert.equal(check.passed, true, `${id}:${check.id} failed`);
}

const closeout = readJson(closeoutJsonPath);
assert.equal(closeout.schema_version, "law-firm-os.lazycodex.lcx_vltui.closeout_receipt.v0.1");
assert.equal(closeout.status, "closeout-browser-verified");
assert.deepEqual(closeout.closed_tuws, proof.tuw_ids);
assert.equal(closeout.closeout_proof.verdict, "PASS");
assert.equal(closeout.closeout_proof.path, proofPath);
assert.equal(closeout.mv_link_acceptance.path, mvLinkPath);
assert.equal(closeout.mv_link_acceptance.status, "PASS");
for (const tuw of proof.tuw_ids) assert.equal(closeout.tuw_status[tuw], "implemented", `${tuw} must be implemented`);
assert.equal(closeout.claim_boundary.synthetic_route_interception_only, true);
assert.equal(closeout.claim_boundary.production_ready, false);
assert.equal(closeout.claim_boundary.public_release, false);
assert.equal(closeout.claim_boundary.production_go_live, false);
assert.equal(closeout.claim_boundary.owner_final_approval, false);
assert.equal(closeout.claim_boundary.customer_document_import_executed, false);
assert.equal(closeout.claim_boundary.vault_document_write_enabled, false);
assert.equal(closeout.claim_boundary.provider_send_executed, false);

for (const command of [
  "npm --workspace apps/web run test:ui",
  "node --test apps/api/test/cmp-r4-g6-crm-intake.test.js apps/api/test/profile-api.test.js",
  "npm --workspace apps/web run build",
  "npm run lcx:vltui:closeout:proof",
  "node scripts/validate-matter-desktop-no-public-release-claim.mjs",
  "git diff --check",
  "python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo \"$PWD\" --changed"
]) {
  assert.ok(closeout.verification_commands.some((item) => item.command === command && item.status.startsWith("PASS")), `${command} missing PASS receipt`);
}

const mainReceipt = readJson(mainReceiptPath);
assert.equal(mainReceipt.goal_status, "complete");
assert.ok(mainReceipt.implemented_tuws.some((item) => item.id === "LCX-VLTUI-90.01~90.07" && item.status === "closeout-browser-verified"));
assert.deepEqual(mainReceipt.next_slice, []);
assert.equal(mainReceipt.closeout_receipt, closeoutJsonPath);

const gapLedger = readJson(gapLedgerPath);
for (const row of gapLedger.rows.filter((item) => String(item.target_tuw ?? "").startsWith("LCX-VLTUI-90"))) {
  assert.equal(row.status, "implemented", `${row.id} must be implemented`);
  assert.equal(row.evidence, proofPath, `${row.id} evidence must point to closeout proof`);
}

for (const tuw of proof.tuw_ids) requireText(planPath, `| ${tuw} | implemented |`);
requireText(planPath, "| LCX-VLTUI-90 | Validation, evidence, release-boundary closeout | implemented |");
requireText(planPath, "LCX-VLTUI-90.01 through LCX-VLTUI-90.07: closeout completed locally by `docs/lazycodex/lcx-vault-app-current-ui-implementation-closeout-2026-06-29.md`.");
requireText(closeoutMdPath, "No production readiness, public release, go-live, owner final approval, customer document import, or Vault document-write enablement is claimed.");
requireText(claimBoundaryPath, "\"production_ready\": false");
requireText(mvLinkPath, "MV-LINK-024 sanitized release receipt");

console.log(JSON.stringify({
  verdict: "PASS",
  closed_tuws: proof.tuw_ids,
  proof: proofPath,
  closeout: closeoutJsonPath
}, null, 2));
