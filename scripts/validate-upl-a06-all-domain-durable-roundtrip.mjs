import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

function run(command, args) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => resolveRun({ status, stdout, stderr }));
  });
}

const executed = await run("node", ["scripts/run-upl-a06-all-domain-durable-roundtrip-proof.mjs"]);
assert.equal(executed.status, 0, executed.stderr || executed.stdout);
const artifact = JSON.parse(readFileSync("artifacts/manual-qa/upl-a06-all-domain-durable-roundtrip-proof.json", "utf8"));

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
assert.ok(hrx.schema.migration_count >= 5);
assert.ok(hrx.schema.first_migration_results.every((migration) => migration.applied === true));
assert.ok(hrx.schema.second_migration_results.every((migration) => migration.applied === false));

console.log("UPL-A-06 all-domain durable roundtrip validator PASS");
