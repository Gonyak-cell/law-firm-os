#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { privateStagingPacketSha256, validatePrivateStagingExactHeadPacket } from "./lib/private-staging-exact-head-authority.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(...args) {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function privateFile(candidate, name) {
  const input = resolve(candidate);
  if (!existsSync(input) || lstatSync(input).isSymbolicLink()) throw new Error(`${name} must be an existing non-symlink file`);
  const path = realpathSync(input);
  if (!statSync(path).isFile() || (statSync(path).mode & 0o077) !== 0) throw new Error(`${name} must be mode 0600`);
  const rel = relative(realpathSync(process.cwd()), path);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error(`${name} must remain outside the worktree`);
  return path;
}

function outputDirectory(candidate) {
  const root = realpathSync(process.cwd());
  const input = resolve(candidate);
  let parent = input;
  while (!existsSync(parent)) parent = dirname(parent);
  const path = resolve(realpathSync(parent), relative(parent, input));
  const rel = relative(root, path);
  if (!(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))) throw new Error("gate output must remain outside the worktree");
  if (existsSync(path) && lstatSync(path).isSymbolicLink()) throw new Error("gate output cannot be a symlink");
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
  return path;
}

function tapCounts(output) {
  const read = (label) => Number(output.match(new RegExp(`^# ${label} (\\d+)$`, "mu"))?.[1] ?? 0);
  return { pass_count: read("pass"), fail_count: read("fail"), skipped_count: read("skipped") };
}

function runGate(id, command, args, timeoutMs = 30 * 60 * 1000, cwd = process.cwd()) {
  const startedAt = new Date().toISOString();
  const completed = spawnSync(command, args, {
    cwd,
    env: { ...process.env, CI: "1", PATH: `/opt/homebrew/opt/node@22/bin:${process.env.PATH}` },
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    timeout: timeoutMs,
  });
  const finishedAt = new Date(Math.max(Date.now(), Date.parse(startedAt) + 1)).toISOString();
  const stdout = completed.stdout ?? "";
  const stderr = completed.stderr ?? "";
  const result = {
    id,
    command: [command, ...args].join(" "),
    started_at: startedAt,
    finished_at: finishedAt,
    exit_code: completed.status ?? 255,
    signal_count: completed.signal ? 1 : 0,
    stdout_sha256: sha256(stdout),
    stderr_sha256: sha256(stderr),
    ...tapCounts(`${stdout}\n${stderr}`),
  };
  process.stdout.write(`${JSON.stringify({ gate: id, exit_code: result.exit_code, pass_count: result.pass_count, fail_count: result.fail_count, skipped_count: result.skipped_count })}\n`);
  if (completed.error || completed.status !== 0) {
    const tail = `${stdout}\n${stderr}`.split("\n").slice(-40).join("\n");
    process.stderr.write(`${tail}\n`);
    throw Object.assign(new Error(`local gate failed: ${id}`), { gateResult: result });
  }
  return Object.freeze(result);
}

function createExactHeadTestClone(sourceSha) {
  const path = mkdtempSync(join(tmpdir(), "lawos-private-staging-package-suite-"));
  execFileSync("git", ["clone", "--quiet", "--no-hardlinks", "--no-checkout", process.cwd(), path], { cwd: process.cwd(), stdio: "ignore" });
  execFileSync("git", ["checkout", "--quiet", "--detach", sourceSha], { cwd: path, stdio: "ignore" });
  if (execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: path, encoding: "utf8" }).trim()) throw new Error("exact-head package test clone is dirty");
  return path;
}

function testFiles(root) {
  return readdirSync(root, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, "en"))
    .flatMap((entry) => {
      const path = `${root}/${entry.name}`;
      if (entry.isDirectory()) return testFiles(path);
      return entry.name.endsWith(".test.js") ? [path] : [];
    });
}

const startedAt = new Date().toISOString();
const sourceSha = git("rev-parse", "HEAD^{commit}");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("local gates require a clean exact-head worktree");

const packetPath = privateFile(option("--packet"), "exact-head packet");
const packet = JSON.parse(readFileSync(packetPath, "utf8"));
const packetValidation = validatePrivateStagingExactHeadPacket(packet, {
  sourceSha,
  sourceTree,
  baseMainSha: git("rev-parse", "origin/main^{commit}"),
  baseMainTree: git("rev-parse", "origin/main^{tree}"),
});
const artifactManifestPath = privateFile(option("--artifact-manifest"), "artifact manifest");
const artifactManifest = JSON.parse(readFileSync(artifactManifestPath, "utf8"));
if (artifactManifest.source_sha !== sourceSha || artifactManifest.source_tree !== sourceTree || artifactManifest.artifact_sha256 !== packet.artifact_sha256 || sha256(readFileSync(artifactManifest.artifact_path)) !== packet.artifact_sha256) throw new Error("artifact manifest/archive exact-head binding failed");
const syntheticIdentityPath = privateFile(option("--synthetic-identity-manifest"), "synthetic identity manifest");
if (sha256(readFileSync(syntheticIdentityPath)) !== packet.synthetic_identity_manifest_sha256) throw new Error("synthetic identity digest mismatch");
const outputDir = outputDirectory(option("--output-dir"));
const reproductionDir = outputDirectory(resolve(outputDir, "artifact-reproduction"));
const apiTests = testFiles("apps/api/test");
const deploymentOnlyWebTests = Object.freeze([
  "apps/web/test/matter-profile-browser.test.mjs",
]);
const allWebTests = readdirSync("apps/web/test", { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
  .map((entry) => `apps/web/test/${entry.name}`)
  .sort();
for (const path of deploymentOnlyWebTests) {
  if (!allWebTests.includes(path)) throw new Error(`deployment-only web test is missing: ${path}`);
}
const webTests = allWebTests.filter((path) => !deploymentOnlyWebTests.includes(path));
const criticalTests = [
  "apps/api/test/persistence-authority.test.js",
  "apps/api/test/postgres-vault-dms-api.test.js",
  "apps/api/test/private-staging-admin-lambda.test.js",
  "apps/api/test/private-staging-cut006.test.js",
  "apps/api/test/private-staging-cut007-flow.test.js",
  "apps/api/test/private-staging-cut007-readback.test.js",
  "apps/api/test/private-staging-synthetic-baseline.test.js",
  "apps/api/test/session-auth-api.test.js",
  "apps/api/test/staff-auth-authority.test.js",
  "packages/hrx/test/postgres-store-v2.test.js",
  "packages/persistence/test/json-postgres-migration.test.js",
  "packages/persistence/test/private-staging-cut005.test.js",
  "packages/persistence/test/source-inventory.test.js",
  "packages/runtime-auth/test/postgres-identity-directory.test.js",
  "scripts/test/private-staging-artifact.test.mjs",
  "scripts/test/private-staging-aws-execution.test.mjs",
  "scripts/test/private-staging-browser-smoke.test.mjs",
  "scripts/test/private-staging-contract.test.mjs",
  "scripts/test/private-staging-exact-head-authority.test.mjs",
  "scripts/test/private-staging-execution-receipt.test.mjs",
  "scripts/test/private-staging-internal-auth-contract.test.mjs",
];
const results = [];
results.push(runGate("private-staging-infrastructure-contract", "npm", ["run", "private-staging:validate"]));
results.push(runGate("private-staging-internal-auth-contract", "npm", ["run", "private-staging:auth:validate"]));
const critical = runGate("json-postgres-private-staging-critical", "node", ["--test", "--test-concurrency=1", ...criticalTests], 30 * 60 * 1000);
if (critical.skipped_count !== 0) throw new Error("critical JSON-to-PostgreSQL/private-staging suite contains an unexplained skip");
results.push(critical);
const packageTestClone = createExactHeadTestClone(sourceSha);
try {
  results.push(runGate("repository-package-dependencies", "npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], 30 * 60 * 1000, packageTestClone));
  results.push(runGate("repository-package-suite", "npm", ["test"], 60 * 60 * 1000, packageTestClone));
} finally {
  rmSync(packageTestClone, { recursive: true, force: true });
}
results.push(runGate("api-suite", "node", ["--test", "--test-concurrency=1", ...apiTests], 45 * 60 * 1000));
const webUi = runGate("web-ui-suite", "node", ["--test", "--test-concurrency=1", ...webTests], 30 * 60 * 1000);
if (webUi.skipped_count !== 0) throw new Error("web UI suite contains an unexplained skip");
results.push(webUi);
results.push(runGate("web-production-build", "npm", ["run", "build"]));
results.push(runGate("artifact-reproduction", "node", [
  "scripts/build-private-staging-artifact.mjs",
  "--source-sha", sourceSha,
  "--source-tree", sourceTree,
  "--synthetic-identity-manifest", syntheticIdentityPath,
  "--output-dir", reproductionDir,
], 30 * 60 * 1000));
const reproducedManifestPath = resolve(reproductionDir, `lawos-private-staging-${sourceSha}.manifest.json`);
const reproducedManifest = JSON.parse(readFileSync(reproducedManifestPath, "utf8"));
if (reproducedManifest.artifact_sha256 !== packet.artifact_sha256 || reproducedManifest.artifact_entries_sha256 !== artifactManifest.artifact_entries_sha256) throw new Error("artifact reproduction digest differs from the approved exact artifact");
if (git("status", "--porcelain=v1", "--untracked-files=all")) throw new Error("local gates changed the exact-head worktree");
if (git("rev-parse", "bb78de346bda77c4d6b66a32fd811d4c9dcd0958^{tree}") !== "e4e0258f8c9fc97160b349eb08c757f98dbde36a") throw new Error("PR #172 adjudication tree binding drifted");
execFileSync("git", ["merge-base", "--is-ancestor", "bb78de346bda77c4d6b66a32fd811d4c9dcd0958", "HEAD"], { cwd: process.cwd(), stdio: "ignore" });

const finishedAt = new Date(Math.max(Date.now(), Date.parse(startedAt) + 1)).toISOString();
const summary = {
  schema_version: "law-firm-os.private-staging.local-gates.v1",
  execution_state: "PASS",
  source_sha: sourceSha,
  source_tree: sourceTree,
  base_main_sha: packet.base_main_sha,
  base_main_tree: packet.base_main_tree,
  artifact_sha256: packet.artifact_sha256,
  packet_sha256: privateStagingPacketSha256(packet),
  started_at: startedAt,
  finished_at: finishedAt,
  profile: "source-local-node22",
  command_count: results.length,
  pass_count: results.reduce((total, result) => total + result.pass_count, 0),
  fail_count: results.reduce((total, result) => total + result.fail_count, 0),
  skipped_count: results.reduce((total, result) => total + result.skipped_count, 0),
  pr_172_tree_reused: true,
  source_clean_before: true,
  source_clean_after: true,
  artifact_reproduced: true,
  artifact_entries_sha256: artifactManifest.artifact_entries_sha256,
  deployment_only_web_tests: deploymentOnlyWebTests,
  deployment_browser_gate: "CUT-007 exact-source Forest browser smoke",
  real_data_count: 0,
  aws_mutation_count: 0,
  results,
};
const summaryPath = resolve(outputDir, `local-gates-${sourceSha}.json`);
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, { flag: "wx", mode: 0o600 });
chmodSync(summaryPath, 0o600);
process.stdout.write(`${JSON.stringify({ verdict: "PASS", summary_path: summaryPath, summary_sha256: sha256(readFileSync(summaryPath)), command_count: summary.command_count, pass_count: summary.pass_count, fail_count: 0, artifact_reproduced: true, aws_mutation_count: 0 }, null, 2)}\n`);
