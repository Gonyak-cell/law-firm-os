#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { chmod, lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  deriveJsonPostgresInventoryContentSha256,
  inventoryJsonPostgresSources,
} from "../packages/persistence/src/postgres/source-inventory.js";
import {
  createJsonPostgresAdjudicationRecommendations,
} from "../packages/persistence/src/postgres/source-adjudication.js";
import {
  createJsonPostgresSourceLocatorManifest,
} from "../packages/persistence/src/postgres/source-locator-manifest.js";
import {
  classifyJsonPostgresSourceReadInventory,
  createJsonPostgresSourceReadDelta,
  validateJsonPostgresSourceReadPacket,
  verifyJsonPostgresSourceReadApproval,
} from "../packages/persistence/src/postgres/source-read-contract.js";
import {
  readPrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function optional(name) {
  return process.argv.includes(name) ? option(name) : null;
}

async function outsideWorktreeFile(path) {
  const root = await realpath(process.cwd());
  const target = resolve(path);
  let parent = dirname(target);
  while (true) {
    try {
      parent = await realpath(parent);
      break;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      parent = dirname(parent);
    }
  }
  const rel = relative(root, target);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error("inventory output must remain outside the worktree");
  try {
    if ((await lstat(target)).isSymbolicLink()) throw new Error("inventory output must not be a symlink");
    throw new Error("inventory output already exists");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await chmod(dirname(target), 0o700);
  return target;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

const home = homedir();
const outputOption = option("--output");
const locatorOutputOption = option("--locator-output");
const adjudicationOutputOption = option("--adjudication-output");
const deltaOutputOption = option("--delta-output");
const authorityManifestPath = optional("--authority-manifest");
const authorityManifest = authorityManifestPath
  ? readPrivateProgramJson(authorityManifestPath, "authority manifest")
  : null;
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("real-data source inventory requires a clean exact-head worktree");
}
const approvedPacket = readPrivateProgramJson(
  option("--source-read-packet"),
  "source-read packet",
);
const approvedInventory = readPrivateProgramJson(
  option("--approved-inventory"),
  "approved source inventory",
);
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
validateJsonPostgresSourceReadPacket(approvedPacket, {
  sourceSha,
  sourceTree,
});
if (deriveJsonPostgresInventoryContentSha256(approvedInventory)
    !== approvedPacket.inventory_content_sha256) {
  throw new Error("approved source inventory does not match the packet");
}
verifyJsonPostgresSourceReadApproval({
  packet: approvedPacket,
  sourceSha,
  sourceTree,
  inventoryContentSha256: approvedPacket.inventory_content_sha256,
  trustRegistryPath: option("--registry"),
  trustRegistrySha256: option("--registry-sha256"),
  approvalReceiptPath: option("--approval"),
});
const output = await outsideWorktreeFile(outputOption);
const locatorOutput = await outsideWorktreeFile(locatorOutputOption);
const adjudicationOutput = await outsideWorktreeFile(
  adjudicationOutputOption,
);
const deltaOutput = await outsideWorktreeFile(deltaOutputOption);
const configuredSources = [
  { ref: "runtime-primary", path: `${home}/Library/Application Support/LawFirmOS/runtime-stores` },
  { ref: "runtime-desktop", path: `${home}/Library/Application Support/@law-firm-os/desktop/runtime-stores` },
  { ref: "runtime-electron", path: `${home}/Library/Application Support/Electron/runtime-stores` },
  {
    ref: "local-backups",
    path: `${home}/lawos-backups`,
    parse_json: false,
    adjudication_json: true,
    candidate_mode: "backup",
  },
  { ref: "packaged-lawos-user-data", path: `${home}/Library/Application Support/matter/runtime-stores` },
  {
    ref: "registered-account-source",
    path: resolve("docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json"),
    single_file: true,
  },
  {
    ref: "registered-roster-source",
    path: resolve("docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json"),
    single_file: true,
  },
];
const byRef = new Map(configuredSources.map((source) => [source.ref, source]));
if (approvedPacket.approved_root_refs.some((ref) => !byRef.has(ref))) {
  throw new Error("source-read approval contains an unknown root reference");
}
const authorizedSources = approvedPacket.approved_root_refs.map((ref) => byRef.get(ref));
const privateLocators = [];
const report = await inventoryJsonPostgresSources({
  roots: authorizedSources.filter((source) => !source.single_file),
  files: authorizedSources
    .filter((source) => source.single_file)
    .map(({ single_file: ignored, ...source }) => source),
  authorityManifest,
  approvedInventoryContentSha256:
    approvedPacket.inventory_content_sha256,
  onSourceLocator: async (locator) => privateLocators.push(locator),
});
const inventoryState = classifyJsonPostgresSourceReadInventory(
  approvedPacket,
  report.inventory_content_sha256,
);
const { inventory_drifted: inventoryDrifted } = inventoryState;
const bytes = `${JSON.stringify(report, null, 2)}\n`;
await writeFile(output, bytes, { flag: "wx", mode: 0o600 });
await chmod(output, 0o600);
const locatorManifest = createJsonPostgresSourceLocatorManifest({
  inventory: report,
  locators: privateLocators,
});
await writeFile(locatorOutput, `${JSON.stringify(locatorManifest, null, 2)}\n`, {
  flag: "wx",
  mode: 0o600,
});
await chmod(locatorOutput, 0o600);
const locatorManifestSha256 = locatorManifest.locator_manifest_sha256;
let recommendations = null;
let inventoryDelta = null;
if (!inventoryDrifted) {
  recommendations =
    createJsonPostgresAdjudicationRecommendations({
      inventory: report,
      approvedInventoryContentSha256:
        approvedPacket.inventory_content_sha256,
    });
  await writeFile(
    adjudicationOutput,
    `${JSON.stringify(recommendations, null, 2)}\n`,
    { flag: "wx", mode: 0o600 },
  );
  await chmod(adjudicationOutput, 0o600);
} else {
  inventoryDelta = createJsonPostgresSourceReadDelta({
    packet: approvedPacket,
    approvedInventory,
    observedInventory: report,
  });
  await writeFile(
    deltaOutput,
    `${JSON.stringify(inventoryDelta, null, 2)}\n`,
    { flag: "wx", mode: 0o600 },
  );
  await chmod(deltaOutput, 0o600);
}
process.stdout.write(`${JSON.stringify({
  verdict: inventoryState.verdict,
  output,
  inventory_sha256: report.inventory_sha256,
  source_count: report.sources.length,
  classification_counts: report.classification_counts,
  field_count: report.field_contract.field_count,
  disposition_counts: report.field_contract.disposition_counts,
  reconciliation: report.reconciliation,
  private_locator_output: locatorOutput,
  private_locator_manifest_sha256: locatorManifestSha256,
  adjudication_contract_sha256:
    report.adjudication_contract?.adjudication_contract_sha256 ?? null,
  adjudication_output: inventoryDrifted ? null : adjudicationOutput,
  adjudication_recommendation_sha256:
    recommendations?.recommendation_sha256 ?? null,
  adjudication_safe_counts: recommendations?.safe_counts ?? null,
  inventory_delta_output: inventoryDrifted ? deltaOutput : null,
  inventory_delta_sha256: inventoryDelta?.delta_sha256 ?? null,
  approved_inventory_content_sha256: approvedPacket.inventory_content_sha256,
  observed_inventory_content_sha256: report.inventory_content_sha256,
  inventory_drifted: inventoryDrifted,
  owner_adjudication_required: inventoryState.owner_adjudication_required,
  raw_value_returned: false,
  real_data_mutated: false,
}, null, 2)}\n`);
if (inventoryDrifted) process.exitCode = 2;
