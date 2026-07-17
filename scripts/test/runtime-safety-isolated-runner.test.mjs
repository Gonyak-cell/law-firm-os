import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inspectRuntimeSafetyCheckout } from "../lib/runtime-safety-dependency-materialization.mjs";
import { runRuntimeSafetyTuw, validateRuntimeSafetyCommand } from "../lib/runtime-safety-isolated-runner.mjs";

function git(repo, ...args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "lawos-isolated-runner-"));
  const repo = join(root, "repo");
  execFileSync("mkdir", [repo]);
  git(repo, "init", "-q");
  git(repo, "config", "user.email", "fixture@example.invalid");
  git(repo, "config", "user.name", "Fixture");
  writeFileSync(join(repo, "package.json"), `${JSON.stringify({ name: "fixture", version: "1.0.0" })}\n`);
  writeFileSync(join(repo, "package-lock.json"), `${JSON.stringify({ name: "fixture", version: "1.0.0", lockfileVersion: 3, requires: true, packages: { "": { name: "fixture", version: "1.0.0" } } }, null, 2)}\n`);
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "fixture");
  const head = git(repo, "rev-parse", "HEAD");
  const tree = git(repo, "rev-parse", "HEAD^{tree}");
  const dependencyReceipt = inspectRuntimeSafetyCheckout({ repo, targetSourceSha: head, targetTree: tree });
  const row = {
    tuw_id: "RS-GOV-001",
    selector: "command",
    env: { CI: "1", TZ: "UTC" },
    parser: "ordered-process-results-v1",
    timeout_ms: 1_000,
    commands: [["node", "-e", "console.log('pass')"]],
  };
  return { root, repo, head, tree, dependencyReceipt, row, outputDir: join(root, "raw-output") };
}

async function expectCode(code, promise) {
  await assert.rejects(promise, (error) => error.code === code);
}

test("isolated runner executes one hash-bound TUW and writes raw output outside Git", async () => {
  const f = fixture();
  const receipt = await runRuntimeSafetyTuw({
    row: f.row,
    checkout: f.repo,
    targetSourceSha: f.head,
    targetTree: f.tree,
    toolchainSha: f.head,
    dependencyReceipt: f.dependencyReceipt,
    outputDir: f.outputDir,
  });
  assert.equal(receipt.claims.verified, true);
  assert.equal(receipt.results[0].exit_code, 0);
});

test("isolated runner rejects timeout, secret output, skipped PostgreSQL, and prohibited commands", async () => {
  let f = fixture();
  await expectCode("RUNNER_TIMEOUT", runRuntimeSafetyTuw({ ...f, checkout: f.repo, targetSourceSha: f.head, targetTree: f.tree, toolchainSha: f.head, dependencyReceipt: f.dependencyReceipt, outputDir: f.outputDir, row: { ...f.row, timeout_ms: 20, commands: [["node", "-e", "setTimeout(() => {}, 10000)"]] } }));
  f = fixture();
  await expectCode("RUNNER_SECRET_OUTPUT", runRuntimeSafetyTuw({ ...f, checkout: f.repo, targetSourceSha: f.head, targetTree: f.tree, toolchainSha: f.head, dependencyReceipt: f.dependencyReceipt, outputDir: f.outputDir, row: { ...f.row, commands: [["node", "-e", "console.log('api_key=not-safe')"]] } }));
  f = fixture();
  await expectCode("RUNNER_POSTGRES_SKIPPED", runRuntimeSafetyTuw({ ...f, checkout: f.repo, targetSourceSha: f.head, targetTree: f.tree, toolchainSha: f.head, dependencyReceipt: f.dependencyReceipt, outputDir: f.outputDir, requiredPostgres: true, row: { ...f.row, commands: [["node", "-e", "console.log('# SKIP postgres')"]] } }));
  assert.throws(() => validateRuntimeSafetyCommand(["aws", "sts", "get-caller-identity"], { tuwId: "RS-GOV-001" }), (error) => error.code === "RUNNER_PROHIBITED_COMMAND");
  assert.throws(() => validateRuntimeSafetyCommand(["curl", "https://example.com"], { tuwId: "RS-GOV-001" }), (error) => error.code === "RUNNER_PROHIBITED_COMMAND");
});

test("isolated runner refuses dirty checkout and drifted dependency receipt", async () => {
  let f = fixture();
  writeFileSync(join(f.repo, "dirty.txt"), "dirty\n");
  await expectCode("DEPENDENCY_DIRTY_CHECKOUT", runRuntimeSafetyTuw({ ...f, checkout: f.repo, targetSourceSha: f.head, targetTree: f.tree, toolchainSha: f.head, dependencyReceipt: f.dependencyReceipt, outputDir: f.outputDir }));
  f = fixture();
  await expectCode("RUNNER_DEPENDENCY_RECEIPT", runRuntimeSafetyTuw({ ...f, checkout: f.repo, targetSourceSha: f.head, targetTree: f.tree, toolchainSha: f.head, dependencyReceipt: { ...f.dependencyReceipt, lockfile_sha256: "0".repeat(64) }, outputDir: f.outputDir }));
});
