import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertDesktopFormalBuildProvenance,
  readDesktopBuildSourceIdentity,
} from "../lib/matter-desktop-provenance.mjs";

const SOURCE_SHA = "a38a63f8bcc0bedae5d038027cb2de7148cd6129";
const SOURCE_TREE = "3da21d6486a0577abb90a084988de3eb6888a189";

function identity(overrides = {}) {
  return {
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: false,
    sourceBranch: "main",
    ...overrides,
  };
}

function formalGate(overrides = {}) {
  return assertDesktopFormalBuildProvenance({
    releaseChannel: "formal",
    sourceIdentity: identity(),
    expectedSourceSha: SOURCE_SHA,
    ...overrides,
  });
}

test("PV-003 leaves internal builds outside the formal clean-SHA gate", () => {
  const result = assertDesktopFormalBuildProvenance({
    releaseChannel: "internal",
    sourceIdentity: identity({ sourceDirty: true, sourceBranch: "codex/local-work" }),
  });

  assert.equal(result.enforced, false);
  assert.equal(result.verdict, "NOT_APPLICABLE");
});

test("PV-003 permits clean exact-SHA formal builds only from release-authorized refs", () => {
  for (const sourceBranch of [
    "main",
    "integration/forest-v0.1.17",
    "release/forest-v0.1.17",
    "",
  ]) {
    const result = formalGate({ sourceIdentity: identity({ sourceBranch }) });
    assert.equal(result.enforced, true);
    assert.equal(result.verdict, "PASS");
    assert.equal(result.source_sha, SOURCE_SHA);
    assert.equal(result.source_branch, sourceBranch || "DETACHED");
  }
});

test("PV-003 rejects a dirty formal worktree before artifact generation", () => {
  assert.throws(
    () => formalGate({ sourceIdentity: identity({ sourceDirty: true }) }),
    /formal build blocked: Git worktree is dirty/,
  );
});

test("PV-003 rejects missing, abbreviated, or mismatched expected SHAs", () => {
  assert.throws(
    () => formalGate({ expectedSourceSha: undefined }),
    /MATTER_DESKTOP_EXPECTED_SOURCE_SHA must be a full 40-character Git SHA/,
  );
  assert.throws(
    () => formalGate({ expectedSourceSha: "a38a63f8" }),
    /MATTER_DESKTOP_EXPECTED_SOURCE_SHA must be a full 40-character Git SHA/,
  );
  assert.throws(
    () => formalGate({ expectedSourceSha: "0000000000000000000000000000000000000000" }),
    /formal build blocked: HEAD .* does not match expected source SHA/,
  );
});

test("PV-003 rejects formal builds from non-release branches", () => {
  for (const sourceBranch of [
    "codex/forest-v0.1.16-release-20260713",
    "feature/payroll",
    "integration/forest-latest",
    "release/forest-v0.1",
  ]) {
    assert.throws(
      () => formalGate({ sourceIdentity: identity({ sourceBranch }) }),
      new RegExp(`formal build blocked: branch .* is not release-authorized`),
    );
  }
});

test("PV-003 source identity records clean, dirty, branch, and detached states", () => {
  const repo = mkdtempSync(path.join(tmpdir(), "matter-pv003-git-"));
  const git = (args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
  try {
    git(["init", "-b", "main"]);
    git(["config", "user.name", "Matter Test"]);
    git(["config", "user.email", "matter-test@example.invalid"]);
    const receiptPath = path.join(repo, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md");
    mkdirSync(path.dirname(receiptPath), { recursive: true });
    writeFileSync(path.join(repo, "README.md"), "matter\n");
    writeFileSync(receiptPath, "receipt\n");
    git(["add", "."]);
    git(["commit", "-m", "fixture"]);

    const clean = readDesktopBuildSourceIdentity(repo);
    assert.equal(clean.sourceBranch, "main");
    assert.equal(clean.sourceDirty, false);

    writeFileSync(receiptPath, "generated receipt\n");
    const receiptOnly = readDesktopBuildSourceIdentity(repo);
    assert.equal(receiptOnly.sourceDirty, false);
    assert.deepEqual(receiptOnly.ignoredEvidenceDirtyPaths, [
      "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md",
    ]);

    writeFileSync(path.join(repo, "dirty.txt"), "dirty\n");
    const dirty = readDesktopBuildSourceIdentity(repo);
    assert.equal(dirty.sourceDirty, true);
    assert.deepEqual(dirty.sourceDirtyPaths, ["dirty.txt"]);
    rmSync(path.join(repo, "dirty.txt"));
    git(["checkout", "--", "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md"]);

    git(["checkout", "--detach"]);
    assert.equal(readDesktopBuildSourceIdentity(repo).sourceBranch, "");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
