import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPeopleImplementationInventory,
  PEOPLE_LEDGER_REPLAY_COMMAND
} from "./lib/people-implementation-inventory.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const ledgerPath = path.join(repoRoot, "artifacts/people-v2/PEO-TUW-001/implementation-ledger.json");
const shouldWrite = process.argv.includes("--write");
const INVENTORY_SEMANTICS = Object.freeze({
  route_variant: "Static PeopleHome props plus a complete classified allow/exclude list define the route-reachable client surface.",
  renderer_import_graph_superset: "All transitive HRX client imports owned by the mounted renderer; individual controls may narrow reachability."
});

function git(...args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sourceFingerprint(relativePaths) {
  const payload = [...new Set(relativePaths)]
    .sort()
    .map((relativePath) => `${relativePath}\0${readFileSync(path.join(repoRoot, relativePath), "utf8")}`)
    .join("\0");
  return sha256(payload);
}

function observedRawArgv() {
  const scriptPath = path.relative(repoRoot, path.resolve(process.argv[1])).split(path.sep).join("/");
  return [path.basename(process.execPath), scriptPath, ...process.argv.slice(2)];
}

function currentGap(route, priorGap) {
  if (route === "people-close") {
    return "Dedicated payroll close precheck workspace is implemented and remains hidden behind the reviewed feature flag when disabled.";
  }
  if (route === "people-pay-rules") {
    return "Dedicated allowance and minimum-wage workspace is implemented and remains hidden behind the reviewed feature flag when disabled.";
  }
  return priorGap;
}

const prior = JSON.parse(readFileSync(ledgerPath, "utf8"));
const priorByRoute = new Map(prior.routes.map((entry) => [entry.route, entry]));
const inventory = await buildPeopleImplementationInventory(repoRoot);
const headSha = git("rev-parse", "HEAD");
const baseSha = git("merge-base", "HEAD", "origin/main");
const branch = git("branch", "--show-current");

const routes = inventory.routes.map((runtimeEntry) => {
  const priorEntry = priorByRoute.get(runtimeEntry.route);
  if (!priorEntry) throw new Error(`Missing manual ledger metadata for ${runtimeEntry.route}`);
  return {
    ...priorEntry,
    ...runtimeEntry,
    implementation_state: runtimeEntry.catalog_implementation_state,
    gap: currentGap(runtimeEntry.route, priorEntry.gap)
  };
});

const manualClaims = {
  classification: prior.classification,
  inventory_semantics: INVENTORY_SEMANTICS,
  routes: routes.map((entry) => ({
    route: entry.route,
    implementation_state: entry.implementation_state,
    domain_sources: entry.domain_sources,
    test_sources: entry.test_sources,
    gap: entry.gap
  }))
};
const evidenceSourceFiles = routes.flatMap((entry) => [...entry.domain_sources, ...entry.test_sources]);
const sourceFiles = [...new Set([...inventory.source_files, ...evidenceSourceFiles])].sort();
const rawArgv = observedRawArgv();
const ledger = {
  schema_version: "lawos.people-implementation-ledger.v2",
  source_sha: headSha,
  captured_at: new Date().toISOString(),
  scope: prior.scope,
  classification: prior.classification,
  inventory_semantics: INVENTORY_SEMANTICS,
  provenance: {
    branch,
    base_sha: baseSha,
    head_sha: headSha,
    head_semantics: "captured_pre_generation_head",
    raw_argv: rawArgv,
    raw_argv_sha256: sha256(stableJson(rawArgv)),
    replay_command: PEOPLE_LEDGER_REPLAY_COMMAND,
    replay_command_sha256: inventory.replay_command_sha256,
    inventory_sha256: inventory.inventory_sha256,
    manual_claims_sha256: sha256(stableJson(manualClaims)),
    runtime_source_fingerprint_sha256: inventory.source_fingerprint_sha256,
    source_fingerprint_sha256: sourceFingerprint(sourceFiles),
    source_files: sourceFiles
  },
  sidebar_routes: {
    enabled: inventory.enabled_route_ids,
    disabled: inventory.disabled_route_ids
  },
  disabled_routes: inventory.disabled_routes,
  routes
};

const output = `${JSON.stringify(ledger, null, 2)}\n`;
if (shouldWrite) {
  const temporaryPath = `${ledgerPath}.${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, output);
    renameSync(temporaryPath, ledgerPath);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
  process.stdout.write(`wrote ${path.relative(repoRoot, ledgerPath)}\n`);
} else {
  process.stdout.write(output);
}
