#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createJsonPostgresAuthorityBundle } from "../packages/persistence/src/postgres/authority-bundle.js";
import {
  validateJsonPostgresSourceTransformResult,
} from "../apps/api/src/json-postgres-source-transform.js";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function options(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) throw new TypeError(`invalid option: ${key ?? ""}`);
    if (parsed[key.slice(2)] != null) throw new TypeError(`duplicate option: ${key}`);
    parsed[key.slice(2)] = value;
  }
  return parsed;
}

function required(value, name) {
  if (!value) throw new TypeError(`--${name} is required`);
  return value;
}

function cleanExactHead() {
  const status = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { encoding: "utf8" }).trim();
  if (status) throw new Error("authority bundle preparation requires a clean exact-head worktree");
  return Object.freeze({
    source_sha: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    source_tree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], { encoding: "utf8" }).trim(),
  });
}

const input = options(process.argv.slice(2));
const exactHead = cleanExactHead();
const inventory = readPrivateProgramJson(required(input.inventory, "inventory"), "source inventory");
const decisions = readPrivateProgramJson(required(input.decisions, "decisions"), "authority decisions");
const recordAuthority = readPrivateProgramJson(
  required(input["record-authority"], "record-authority"),
  "record authority manifest",
);
const recordTypeCatalog = readPrivateProgramJson(required(input.catalog, "catalog"), "record-type catalog");
const corpus = readPrivateProgramJson(required(input.corpus, "corpus"), "migration corpus");
const sourceTransformResult = readPrivateProgramJson(
  required(input["source-transform-result"], "source-transform-result"),
  "source transform result",
);
validateJsonPostgresSourceTransformResult(sourceTransformResult);
const baseManifest = input["base-manifest"]
  ? readPrivateProgramJson(input["base-manifest"], "base authority manifest")
  : null;
const outputDir = createPrivateProgramOutputDirectory(required(input["output-dir"], "output-dir"));
const bundle = await createJsonPostgresAuthorityBundle({
  inventory,
  decisions,
  recordTypeCatalog,
  corpus,
  baseManifest,
  sourceTransformResult,
  recordAuthority,
});
const outputs = {};
for (const [name, value] of Object.entries({
  "record-type-catalog": bundle.record_type_catalog,
  "field-crosswalk": bundle.field_crosswalk,
  "source-authority-manifest": bundle.authority_manifest,
  "migration-dry-run": bundle.migration_dry_run,
  reconciliation: bundle.reconciliation,
  ...(bundle.inventory_delta ? { "inventory-delta": bundle.inventory_delta } : {}),
  "authority-bundle-summary": {
    ...bundle.summary,
    ...exactHead,
  },
})) {
  outputs[name] = writePrivateProgramJson(resolve(outputDir, `${name}.json`), value);
}
process.stdout.write(`${JSON.stringify({
  verdict: bundle.summary.outcome,
  ready_for_owner_signature: bundle.summary.ready_for_owner_signature,
  source_sha: exactHead.source_sha,
  source_tree: exactHead.source_tree,
  bundle_sha256: bundle.summary.bundle_sha256,
  output_dir: outputDir,
  output_digests: Object.fromEntries(Object.entries(outputs).map(([name, value]) => [name, value.sha256])),
  safe_counts: bundle.summary.safe_counts,
  real_data_mutated: false,
  production_contacted: false,
  owner_approval_created: false,
}, null, 2)}\n`);
if (!bundle.summary.ready_for_owner_signature) process.exitCode = 2;
