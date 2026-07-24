#!/usr/bin/env node
import { join } from "node:path";
import {
  createJsonPostgresRehearsalTarget,
} from "./lib/json-postgres-rehearsal-execution.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new TypeError(`${name} is required`);
  }
  return value;
}

const corpus = readPrivateProgramJson(
  option("--corpus"),
  "migration corpus",
);
const target = createJsonPostgresRehearsalTarget({
  approvedTenantIds: [corpus.tenant_id],
});
const outputDir = createPrivateProgramOutputDirectory(
  option("--output-dir"),
);
const output = writePrivateProgramJson(
  join(outputDir, "w12-rehearsal-target.json"),
  target,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  target_ref: target.target_ref,
  approved_tenant_count: target.approved_tenant_ids.length,
  monthly_cost_ceiling_krw: target.monthly_cost_ceiling_krw,
  target_path: output.path,
  target_file_sha256: output.sha256,
  aws_contacted: false,
  postgres_mutated: false,
  pii_returned: false,
}, null, 2)}\n`);
