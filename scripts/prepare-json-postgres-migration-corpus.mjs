#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  compileJsonPostgresMigrationCorpus,
  createJsonPostgresSourceTransformPlan,
} from "../apps/api/src/json-postgres-source-transform.js";
import {
  validateJsonPostgresSourceReadPacket,
  verifyJsonPostgresSourceReadApproval,
} from "../packages/persistence/src/postgres/source-read-contract.js";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const INPUT_VERSION = "law-firm-os.json-postgres-source-transform-input.v1";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function closedObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  const extras = Object.keys(value).filter((key) => !keys.includes(key));
  if (extras.length > 0) throw new TypeError(`${label} contains unsupported fields: ${extras.join(",")}`);
}

if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("migration corpus preparation requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const inventory = readPrivateProgramJson(option("--inventory"), "safe source inventory");
const locatorManifest = readPrivateProgramJson(option("--locator-manifest"), "private source locator manifest");
const transformInput = readPrivateProgramJson(option("--transform-input"), "private source transform input");
const sourceReadPacket = readPrivateProgramJson(option("--source-read-packet"), "source-read packet");
closedObject(transformInput, [
  "schema_version",
  "transform_set_ref",
  "tenant_id",
  "approved_root_refs",
  "account_only_user_ids",
  "decisions",
], "source transform input");
if (transformInput.schema_version !== INPUT_VERSION) throw new TypeError("source transform input schema is invalid");
validateJsonPostgresSourceReadPacket(sourceReadPacket, {
  sourceSha,
  sourceTree,
  inventoryContentSha256: inventory.inventory_content_sha256,
});
verifyJsonPostgresSourceReadApproval({
  packet: sourceReadPacket,
  sourceSha,
  sourceTree,
  inventoryContentSha256: inventory.inventory_content_sha256,
  trustRegistryPath: option("--registry"),
  trustRegistrySha256: option("--registry-sha256"),
  approvalReceiptPath: option("--approval"),
});
if (transformInput.approved_root_refs.some((rootRef) =>
  !sourceReadPacket.approved_root_refs.includes(rootRef))) {
  throw new Error("source transform requests a root outside the approved source-read packet");
}
const transformPlan = createJsonPostgresSourceTransformPlan({
  inventory,
  locatorManifest,
  transformSetRef: transformInput.transform_set_ref,
  tenantId: transformInput.tenant_id,
  approvedRootRefs: transformInput.approved_root_refs,
  accountOnlyUserIds: transformInput.account_only_user_ids,
  decisions: transformInput.decisions,
});
const compiled = await compileJsonPostgresMigrationCorpus({
  inventory,
  locatorManifest,
  transformPlan,
});
const outputDir = createPrivateProgramOutputDirectory(option("--output-dir"));
const planOutput = writePrivateProgramJson(
  join(outputDir, "source-transform-plan.json"),
  transformPlan,
);
const corpusOutput = writePrivateProgramJson(
  join(outputDir, "migration-corpus.json"),
  compiled.corpus,
);
const resultOutput = writePrivateProgramJson(
  join(outputDir, "source-transform-result.json"),
  {
    ...compiled.result,
    source_sha: sourceSha,
    source_tree: sourceTree,
    source_read_packet_sha256: validateJsonPostgresSourceReadPacket(sourceReadPacket).packet_sha256,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  transform_sha256: compiled.result.result_sha256,
  source_transform_plan_sha256: transformPlan.transform_sha256,
  migration_manifest_sha256: compiled.corpus.manifest_sha256,
  source_transform_plan_path: planOutput.path,
  source_transform_plan_file_sha256: planOutput.sha256,
  migration_corpus_path: corpusOutput.path,
  migration_corpus_file_sha256: corpusOutput.sha256,
  result_path: resultOutput.path,
  result_file_sha256: resultOutput.sha256,
  safe_counts: compiled.result.safe_counts,
  raw_source_path_returned: false,
  raw_secret_returned: false,
  source_mutated: false,
  postgres_mutated: false,
  production_contacted: false,
}, null, 2)}\n`);
