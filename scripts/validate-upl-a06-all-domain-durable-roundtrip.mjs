import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const artifact = JSON.parse(readFileSync("artifacts/manual-qa/upl-a06-all-domain-durable-roundtrip-proof.json", "utf8"));
const matrix = readFileSync("artifacts/manual-qa/wave1-70-tuw-strict-verification-2026-07-03.md", "utf8");

const expectedDomains = [
  "hrx",
  "master_data",
  "matter",
  "dms",
  "crm",
  "intake",
  "crm_master_data",
  "finance",
  "analytics",
  "ai_governance",
  "client_portal",
  "ui_readiness",
  "enterprise_readiness",
];

assert.equal(artifact.row_id, "UPL-A-06");
assert.equal(artifact.status, "PASS");
assert.equal(artifact.domain_count, expectedDomains.length);
assert.deepEqual(artifact.expected_domains, expectedDomains);
assert.equal(artifact.owner_db_decision_boundary.local_wave1_owner_boundary_closed, true);
assert.equal(artifact.owner_db_decision_boundary.external_production_database_decision_claim, false);
assert.equal(artifact.owner_db_decision_boundary.production_ready_claim, false);

for (const domain of expectedDomains) {
  const result = artifact.domains.find((item) => item.domain === domain);
  assert.ok(result, `missing domain ${domain}`);
  assert.equal(result.durable, true, `${domain} durable`);
  assert.equal(result.first_read_present, true, `${domain} first read`);
  assert.equal(result.second_read_present, true, `${domain} second read`);
  assert.equal(result.hash_stable_after_reopen, true, `${domain} hash stable`);
  assert.equal(result.store_file.exists, true, `${domain} store file exists`);
  assert.ok(result.store_file.bytes > 0, `${domain} store file has bytes`);
}

const hrx = artifact.domains.find((item) => item.domain === "hrx");
assert.equal(hrx.schema.migration_count, 5);
assert.ok(hrx.schema.first_migration_results.every((migration) => migration.applied === true));
assert.ok(hrx.schema.second_migration_results.every((migration) => migration.applied === false));
assert.match(
  matrix,
  /\| UPL-A-06 \| PASS \| All-domain durable migration roundtrip proof covers 13 local Wave-1 stores/,
);

console.log("UPL-A-06 all-domain durable roundtrip validator PASS");
