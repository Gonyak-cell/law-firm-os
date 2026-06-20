#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const errors = [];

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) =>
    Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])),
  );
}

const backlogPath = "docs/hrx-enterprise/roadmap-package/HRX_Roadmap_03_TUW_BACKLOG.csv";
const ledgerPath = "docs/hrx-enterprise/tuw-status-ledger.json";
const contractPath = "contracts/hrx-release-readiness.json";
const featureFlagsPath = "contracts/hrx-feature-flags.json";

assert(existsSync(resolve(root, backlogPath)), `${backlogPath}: missing`);
assert(existsSync(resolve(root, ledgerPath)), `${ledgerPath}: missing`);
assert(existsSync(resolve(root, contractPath)), `${contractPath}: missing`);
assert(existsSync(resolve(root, featureFlagsPath)), `${featureFlagsPath}: missing`);

const backlog = existsSync(resolve(root, backlogPath)) ? parseCsv(read(backlogPath)) : [];
const ledger = existsSync(resolve(root, ledgerPath)) ? JSON.parse(read(ledgerPath)) : { entries: [] };
const statusById = new Map((ledger.entries ?? []).map((entry) => [entry.id, entry]));
const openP0 = backlog
  .filter((row) => row.Severity === "P0")
  .filter((row) => statusById.get(row.ID)?.status !== "closed")
  .map((row) => row.ID);
assert(openP0.length === 0, `open P0 TUWs remain: ${openP0.join(", ")}`);

const flags = existsSync(resolve(root, featureFlagsPath)) ? JSON.parse(read(featureFlagsPath)) : {};
assert(flags.default_enabled === false, "HRX feature flags must default disabled");
for (const flag of flags.flags ?? []) {
  assert(flag.default_enabled === false, `${flag.flag}: default_enabled must remain false`);
}

const contract = existsSync(resolve(root, contractPath)) ? JSON.parse(read(contractPath)) : {};
assert(contract.claim_policy?.go_live_claim_allowed === false, "go-live claim must remain false");
assert(contract.claim_policy?.r4_claim_allowed === false, "R4 claim must remain false");
assert(contract.claim_policy?.owner_signoff_required === true, "owner sign-off must remain required");

if (errors.length > 0) {
  console.error("HRX launch blocker validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX launch blocker validation passed.");
console.log("open_p0_tuws: 0");
console.log("feature_flags_default_enabled: false");
console.log("go_live_claim_allowed: false");
