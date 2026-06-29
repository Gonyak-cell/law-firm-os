#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const contractPath = "docs/lazycodex/lcx-vltui-01-vault-bridge-contract-2026-06-29.json";
const receiptPath = "docs/lazycodex/lcx-vltui-01-vault-bridge-contract-receipt-2026-06-29.json";
const ladderPath = "docs/lazycodex/lcx-vltui-mv-link-acceptance-2026-06-29.md";
const planPath = "docs/lazycodex/lcx-vault-app-current-ui-implementation-tuw-plan-2026-06-29.md";
const apiTestPath = "apps/api/test/matter-vault-bridge-api.test.js";

function read(path) {
  return readFileSync(path, "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

for (const path of [contractPath, receiptPath, ladderPath, planPath, apiTestPath, "package.json"]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const packageJson = readJson("package.json");
assert.equal(
  packageJson.scripts?.["lcx:vltui:bridge:validate"],
  "node scripts/validate-lcx-vltui-bridge-contract.mjs"
);

const contract = readJson(contractPath);
const receipt = readJson(receiptPath);
const ladder = read(ladderPath);
const plan = read(planPath);
const apiTest = read(apiTestPath);
const serializedContract = JSON.stringify(contract);

assert.equal(contract.schema, "law-firm-os.lazycodex.lcx-vltui.vault_bridge_contract.v0.1");
assert.equal(receipt.schema, "law-firm-os.lazycodex.lcx-vltui.vault_bridge_contract_receipt.v0.1");
assert.equal(contract.status, "contract_implemented_sanitized");
assert.equal(receipt.status, "source_and_contract_implemented");

for (const tuw of ["LCX-VLTUI-01.02", "LCX-VLTUI-01.03", "LCX-VLTUI-01.04", "LCX-VLTUI-01.05", "LCX-VLTUI-01.06"]) {
  assert.equal(contract.implemented_tuws.includes(tuw), true, `${tuw} missing from contract`);
  assert.equal(receipt.implemented_tuws.includes(tuw), true, `${tuw} missing from receipt`);
  assert.equal(plan.includes(tuw), true, `${tuw} missing from plan`);
  assert.equal(ladder.includes(tuw), true, `${tuw} missing from ladder`);
}

assert.deepEqual(contract.law_firm_os_bridge.endpoints, [
  "GET /api/matters/vault-bridge/status",
  "GET /api/matters/vault-bridge/matter-lookup",
  "POST /api/matters/vault-bridge/upload-preflight",
  "POST /api/matters/vault-bridge/clients/upsert",
  "POST /api/matters/vault-bridge/matters/upsert"
]);
assert.deepEqual(contract.vault_app_contract.endpoints, [
  "GET /v1/integrations/matter-app/status",
  "GET /v1/integrations/matter-app/matter-lookup"
]);

const stateById = new Map(contract.status_state_map.map((row) => [row.id, row]));
for (const id of ["unconfigured", "vault_projection_only", "stale_projection", "denied", "matter_app_api_ready"]) {
  assert.equal(stateById.has(id), true, `missing state ${id}`);
}
assert.equal(stateById.get("unconfigured").source_available, false);
assert.equal(stateById.get("unconfigured").may_call_law_bridge_upserts, false);
assert.equal(stateById.get("vault_projection_only").safe_reason, "dev_test_projection_only");
assert.equal(stateById.get("vault_projection_only").upload_authoritative, false);
assert.equal(stateById.get("stale_projection").safe_reason, "stale_projection");
assert.equal(stateById.get("stale_projection").may_call_law_bridge_upserts, false);
assert.equal(stateById.get("denied").safe_reason, "permission_denied_or_ethical_wall");
assert.equal(stateById.get("denied").may_call_law_bridge_upserts, false);
assert.equal(stateById.get("matter_app_api_ready").may_call_law_bridge_upserts, true);
assert.equal(stateById.get("matter_app_api_ready").upload_authoritative, true);

const negativeCaseIds = new Set(contract.negative_cases.map((row) => row.id));
for (const id of [
  "law_bridge_token_missing",
  "law_bridge_bearer_missing_or_wrong",
  "matter_app_api_base_url_missing",
  "stale_source_timestamp",
  "matter_projection_mismatch"
]) {
  assert.equal(negativeCaseIds.has(id), true, `missing negative case ${id}`);
}
for (const negativeCase of contract.negative_cases) {
  assert.equal(negativeCase.write_capable_state, false, `${negativeCase.id} must not be write capable`);
}

assert.equal(contract.synthetic_upsert_handshake.client.idempotencyKeyHash.length > 0, true);
assert.equal(contract.synthetic_upsert_handshake.client.clientId.length > 0, true);
assert.equal(contract.synthetic_upsert_handshake.matter.matterAppMatterId.length > 0, true);
assert.equal(contract.synthetic_upsert_handshake.matter.sourceRevision.length > 0, true);
assert.equal(contract.synthetic_upsert_handshake.matter.sourceUpdatedAt.length > 0, true);
assert.equal(contract.synthetic_upsert_handshake.expected_replay.client_duplicate_create_count, 0);
assert.equal(contract.synthetic_upsert_handshake.expected_replay.matter_duplicate_create_count, 0);
assert.equal(contract.synthetic_upsert_handshake.expected_replay.idempotent_replay, true);

for (const key of [
  "production_ready",
  "public_release",
  "production_go_live",
  "owner_final_approval",
  "vault_document_write_enabled",
  "customer_document_import_executed",
  "onedrive_cutover_executed",
  "secret_material_recorded"
]) {
  assert.equal(contract.claim_boundary[key], false, `${key} must remain false`);
}
for (const key of [
  "no_customer_documents",
  "no_raw_document_text",
  "no_ocr_excerpt",
  "no_object_key",
  "no_cookie",
  "no_secret_value",
  "receipts_reference_paths_and_counts_only"
]) {
  assert.equal(contract.sanitization[key], true, `${key} must remain true`);
}

for (const forbidden of ["Bearer ", "sk-", "cookie=", "BEGIN PRIVATE KEY", "production_ready\":true"]) {
  assert.equal(serializedContract.includes(forbidden), false, `contract includes forbidden marker ${forbidden}`);
}

for (const marker of [
  "Vault bridge rejects missing bearer auth and invalid canonical upsert payloads",
  "MATTER_VAULT_BRIDGE_BLOCKED",
  "MATTER_API_VALIDATION_ERROR",
  "count_leak_prevented",
  "production_ready_claim"
]) {
  assert.equal(apiTest.includes(marker), true, `API test missing ${marker}`);
}

for (const marker of [
  "MV-LINK-017",
  "MV-LINK-018",
  "MV-LINK-019",
  "MV-LINK-020",
  "MV-LINK-021",
  "MV-LINK-022",
  "MV-LINK-023",
  "MV-LINK-024"
]) {
  assert.equal(ladder.includes(marker), true, `ladder missing ${marker}`);
}

console.log(JSON.stringify({
  lcx_vltui_bridge_contract: "pass",
  implemented_tuws: receipt.implemented_tuws,
  states: [...stateById.keys()]
}, null, 2));
