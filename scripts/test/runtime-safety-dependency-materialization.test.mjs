import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { inspectRuntimeSafetyCheckout } from "../lib/runtime-safety-dependency-materialization.mjs";

function git(repo, ...args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

function fixture() {
  const repo = mkdtempSync(join(tmpdir(), "lawos-dependency-checkout-"));
  git(repo, "init", "-q");
  git(repo, "config", "user.email", "fixture@example.invalid");
  git(repo, "config", "user.name", "Fixture");
  writeFileSync(join(repo, "package.json"), `${JSON.stringify({ name: "fixture", version: "1.0.0", lockfileVersion: 3 })}\n`);
  writeFileSync(join(repo, "package-lock.json"), `${JSON.stringify({ name: "fixture", version: "1.0.0", lockfileVersion: 3, requires: true, packages: { "": { name: "fixture", version: "1.0.0" } } }, null, 2)}\n`);
  git(repo, "add", "package.json", "package-lock.json");
  git(repo, "commit", "-qm", "fixture");
  return { repo, head: git(repo, "rev-parse", "HEAD"), tree: git(repo, "rev-parse", "HEAD^{tree}") };
}

function expectCode(code, run) {
  assert.throws(run, (error) => error.code === code);
}

test("dependency inspection binds exact checkout, tree, and lockfile", () => {
  const f = fixture();
  const receipt = inspectRuntimeSafetyCheckout({ repo: f.repo, targetSourceSha: f.head, targetTree: f.tree });
  assert.equal(receipt.target_source_sha, f.head);
  assert.equal(receipt.target_tree, f.tree);
  assert.match(receipt.lockfile_sha256, /^[0-9a-f]{64}$/);
});

test("dependency inspection rejects wrong checkout, wrong tree, dirty checkout, and lock drift", () => {
  let f = fixture();
  expectCode("DEPENDENCY_WRONG_CHECKOUT", () => inspectRuntimeSafetyCheckout({ repo: f.repo, targetSourceSha: "0".repeat(40) }));
  f = fixture();
  expectCode("DEPENDENCY_WRONG_TREE", () => inspectRuntimeSafetyCheckout({ repo: f.repo, targetSourceSha: f.head, targetTree: "0".repeat(40) }));
  f = fixture();
  writeFileSync(join(f.repo, "dirty.txt"), "dirty\n");
  expectCode("DEPENDENCY_DIRTY_CHECKOUT", () => inspectRuntimeSafetyCheckout({ repo: f.repo, targetSourceSha: f.head }));
  f = fixture();
  git(f.repo, "update-index", "--assume-unchanged", "package-lock.json");
  writeFileSync(join(f.repo, "package-lock.json"), "{}\n");
  expectCode("DEPENDENCY_LOCK_DRIFT", () => inspectRuntimeSafetyCheckout({ repo: f.repo, targetSourceSha: f.head }));
});

test("dependency inspection rejects shared or symlinked node_modules", () => {
  const f = fixture();
  symlinkSync(f.repo, join(f.repo, "node_modules"));
  expectCode("DEPENDENCY_NODE_MODULES_REUSE", () => inspectRuntimeSafetyCheckout({ repo: f.repo, targetSourceSha: f.head }));
});
