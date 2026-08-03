import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertRfd010ReleaseCandidateInput,
  cleanupRfd010GitObjectSnapshot,
  markRfd010ReceiptSnapshotDrift,
  materializeRfd010GitObjectSnapshot,
  preflightRfd010ReleaseCandidate,
  rfd010SnapshotManifestPath,
  validateRfd010GitObjectSnapshot,
  validateRfd010PersistedReceiptFile,
  validateRfd010Receipt,
} from "../lib/rfd010-release-candidate.mjs";

const VERSION = "0.1.17";
const ROOT_PACKAGE = {
  name: "law-firm-os",
  version: VERSION,
  private: true,
};
const DESKTOP_PACKAGE = {
  name: "@law-firm-os/desktop",
  version: VERSION,
  private: true,
};

function git(repo, args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

function makeRepo({ branch = "main", desktopVersion = VERSION, rootVersion = VERSION } = {}) {
  const repo = mkdtempSync(path.join(tmpdir(), "rfd010-repo-"));
  git(repo, ["init", "-b", branch]);
  git(repo, ["config", "user.name", "RFD010 Test"]);
  git(repo, ["config", "user.email", "rfd010@example.invalid"]);
  mkdirSync(path.join(repo, "apps/desktop"), { recursive: true });
  writeFileSync(path.join(repo, "package.json"), `${JSON.stringify({ ...ROOT_PACKAGE, version: rootVersion }, null, 2)}\n`);
  writeFileSync(path.join(repo, "apps/desktop/package.json"), `${JSON.stringify({ ...DESKTOP_PACKAGE, version: desktopVersion }, null, 2)}\n`);
  writeFileSync(path.join(repo, "package-lock.json"), `${JSON.stringify({
    name: "law-firm-os",
    version: rootVersion,
    lockfileVersion: 3,
    packages: {
      "": { name: "law-firm-os", version: rootVersion },
      "apps/desktop": { name: "@law-firm-os/desktop", version: desktopVersion },
    },
  }, null, 2)}\n`);
  writeFileSync(path.join(repo, ".gitignore"), ".omo/\n");
  writeFileSync(path.join(repo, "README.md"), "rfd010 fixture\n");
  git(repo, ["add", "."]);
  git(repo, ["commit", "-m", "fixture"]);
  return repo;
}

function candidate(repo, overrides = {}) {
  const sourceSha = git(repo, ["rev-parse", "HEAD"]);
  const sourceTree = git(repo, ["rev-parse", "HEAD^{tree}"]);
  return {
    repoRoot: repo,
    expectedSourceSha: sourceSha,
    expectedSourceTree: sourceTree,
    version: VERSION,
    releaseId: `matter-desktop-v${VERSION}`,
    tag: `matter-desktop-v${VERSION}`,
    channel: "formal",
    ...overrides,
  };
}

function releaseRoot(repo, sourceSha, version = VERSION) {
  return path.join(repo, "apps/desktop/dist/releases", version, sourceSha, "formal");
}

function tarOctal(value, width) {
  const text = value.toString(8).padStart(width - 1, "0");
  return `${text}\0`;
}

function makeTarArchive({ name, bytes = Buffer.alloc(0), type = "0", mode = 0o644, linkname = "" }) {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, "utf8");
  header.write(tarOctal(mode, 8), 100, 8, "ascii");
  header.write(tarOctal(0, 8), 108, 8, "ascii");
  header.write(tarOctal(0, 8), 116, 8, "ascii");
  header.write(tarOctal(bytes.length, 12), 124, 12, "ascii");
  header.write(tarOctal(0, 12), 136, 12, "ascii");
  header.fill(0x20, 148, 156);
  header[156] = type.charCodeAt(0);
  header.write(linkname, 157, 100, "utf8");
  header.write("ustar\0", 257, 6, "ascii");
  header.write("00", 263, 2, "ascii");
  let checksum = 0;
  for (const value of header) checksum += value;
  header.write(tarOctal(checksum, 8), 148, 8, "ascii");
  const payload = Buffer.concat([bytes, Buffer.alloc((512 - (bytes.length % 512)) % 512)]);
  return Buffer.concat([header, payload, Buffer.alloc(1024)]);
}

function makeArchiveGitShim(archivePath) {
  const shimRoot = mkdtempSync(path.join(tmpdir(), "rfd010-archive-shim-"));
  const realGit = execFileSync("sh", ["-lc", "command -v git"], { encoding: "utf8" }).trim();
  const shimPath = path.join(shimRoot, "git");
  writeFileSync(shimPath, `#!/bin/sh
set -u
if [ "\${1:-}" = "archive" ]; then
  cp "$RFD010_FAKE_ARCHIVE" "$4"
  exit 0
fi
exec "$RFD010_REAL_GIT" "$@"
`);
  chmodSync(shimPath, 0o755);
  return {
    shimRoot,
    env: {
      PATH: `${shimRoot}:${process.env.PATH}`,
      RFD010_REAL_GIT: realGit,
      RFD010_FAKE_ARCHIVE: archivePath,
    },
  };
}

function invokeCli(repo, output, envOverrides = {}) {
  const script = path.resolve(import.meta.dirname, "../prepare-rfd010-release-candidate.mjs");
  const args = candidate(repo);
  try {
    execFileSync(process.execPath, [
      script,
      "--repo-root", repo,
      "--expected-sha", args.expectedSourceSha,
      "--expected-tree", args.expectedSourceTree,
      "--version", args.version,
      "--release-id", args.releaseId,
      "--tag", args.tag,
      "--channel", args.channel,
      "--output", output,
    ], {
      cwd: path.resolve(import.meta.dirname, "../.."),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...envOverrides },
    });
    return { status: 0 };
  } catch (error) {
    return { status: error.status ?? -1, stderr: String(error.stderr ?? "") };
  }
}

function makeGitMutationShim(repo, triggerStatusCount) {
  const shimRoot = mkdtempSync(path.join(tmpdir(), "rfd010-git-shim-"));
  const realGit = execFileSync("sh", ["-lc", "command -v git"], { encoding: "utf8" }).trim();
  const shimPath = path.join(shimRoot, "git");
  writeFileSync(shimPath, `#!/bin/sh
set -u
if [ "\${1:-}" = "status" ] && [ "\${2:-}" = "--porcelain=v1" ]; then
  count=0
  if [ -f "$RFD010_STATUS_COUNTER" ]; then count=$(cat "$RFD010_STATUS_COUNTER"); fi
  count=$((count + 1))
  printf '%s' "$count" > "$RFD010_STATUS_COUNTER"
  "$RFD010_REAL_GIT" "$@"
  result=$?
  if [ "$count" -eq "$RFD010_TRIGGER" ]; then printf '\n# injected source drift\n' >> "$RFD010_REPO/README.md"; fi
  exit "$result"
fi
exec "$RFD010_REAL_GIT" "$@"
`);
  chmodSync(shimPath, 0o755);
  return {
    shimRoot,
    env: {
      PATH: `${shimRoot}:${process.env.PATH}`,
      RFD010_REAL_GIT: realGit,
      RFD010_STATUS_COUNTER: path.join(shimRoot, "status-count"),
      RFD010_TRIGGER: String(triggerStatusCount),
      RFD010_REPO: repo,
    },
  };
}

function makeCheckpointHook(checkpoint) {
  const hookRoot = mkdtempSync(path.join(tmpdir(), "rfd010-checkpoint-hook-"));
  const hookPath = path.join(hookRoot, "checkpoint.sh");
  writeFileSync(hookPath, `#!/bin/sh
set -eu
if [ "\${1:-}" = "$RFD010_CHECKPOINT" ]; then
  printf '\\n# checkpoint %s\\n' "$1" >> "$2/README.md"
fi
`);
  chmodSync(hookPath, 0o755);
  return {
    hookRoot,
    env: {
      RFD010_TEST_CHECKPOINT_HOOK: hookPath,
      RFD010_CHECKPOINT: checkpoint,
    },
  };
}

function makeTreeWritable(root) {
  if (!existsSync(root)) return;
  const info = lstatSync(root);
  if (info.isDirectory() && !info.isSymbolicLink()) {
    for (const entry of readdirSync(root)) makeTreeWritable(path.join(root, entry));
    chmodSync(root, 0o700);
  } else if (!info.isSymbolicLink()) {
    chmodSync(root, 0o600);
  }
}

function preserveReceiptCapabilities(value, source) {
  Object.defineProperty(value, "candidateSnapshot", {
    value: value.candidateSnapshot ?? source.candidateSnapshot,
    enumerable: false,
    configurable: false,
  });
  Object.defineProperty(value, "sourcePrecondition", {
    value: source.sourcePrecondition,
    enumerable: false,
    configurable: false,
  });
  return value;
}

function cleanUp(repo) {
  rmSync(repo, { recursive: true, force: true });
}

test("RFD010 clean injected repository passes local checks and defers external authority", () => {
  const repo = makeRepo();
  try {
    const before = {
      head: git(repo, ["rev-parse", "HEAD"]),
      tree: git(repo, ["rev-parse", "HEAD^{tree}"]),
      status: git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]),
    };
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.verdict, "PASS");
    assert.equal(receipt.checks.diff_check.status, "PASS");
    assert.equal(receipt.checks.status_empty.status, "PASS");
    assert.equal(receipt.checks.head_matches_expected_sha.status, "PASS");
    assert.equal(receipt.checks.tree_matches_expected_tree.status, "PASS");
    assert.equal(receipt.checks.package_versions_consistent.status, "PASS");
    assert.equal(receipt.checks.formal_artifact_root.status, "PASS");
    assert.equal(receipt.checks.artifact_root_collision.status, "PASS");
    assert.equal(receipt.external_authority.remote_fetch.status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(receipt.external_authority.remote_tag_collision.status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(receipt.external_authority.github_asset_collision.status, "DEFERRED_EXTERNAL_AUTHORITY");
    for (const operation of ["commit", "push", "pull_request", "merge"]) {
      assert.equal(receipt.execution[operation].status, "NOT_EXECUTED");
      assert.equal(receipt.execution[operation].receipt_bound, true);
    }
    assert.deepEqual({
      head: git(repo, ["rev-parse", "HEAD"]),
      tree: git(repo, ["rev-parse", "HEAD^{tree}"]),
      status: git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]),
    }, before);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 committed candidate diff-check rejects trailing whitespace in the Git object", () => {
  const repo = makeRepo();
  try {
    writeFileSync(path.join(repo, "README.md"), `${readFileSync(path.join(repo, "README.md"), "utf8")}committed trailing space \n`);
    git(repo, ["add", "README.md"]);
    git(repo, ["commit", "-m", "committed trailing whitespace"]);
    assert.equal(git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]), "");
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.checks.status_empty.status, "PASS");
    assert.equal(receipt.checks.diff_check.status, "BLOCKED");
    assert.equal(receipt.checks.diff_check.reason_code, "diff_check_failed");
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(validateRfd010Receipt(receipt), receipt);
    const repeat = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.deepEqual({
      verdict: repeat.verdict,
      diff_check: repeat.checks.diff_check,
      status_empty: repeat.checks.status_empty,
    }, {
      verdict: receipt.verdict,
      diff_check: receipt.checks.diff_check,
      status_empty: receipt.checks.status_empty,
    });
    cleanupRfd010GitObjectSnapshot(repeat.candidateSnapshot);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 merge-resolution whitespace is checked against every parent", () => {
  const repo = makeRepo();
  let receipt;
  try {
    git(repo, ["checkout", "-b", "merge-feature"]);
    writeFileSync(path.join(repo, "README.md"), "feature side\n");
    git(repo, ["add", "README.md"]);
    git(repo, ["commit", "-m", "feature side"]);
    git(repo, ["checkout", "main"]);
    writeFileSync(path.join(repo, "README.md"), "main side\n");
    git(repo, ["add", "README.md"]);
    git(repo, ["commit", "-m", "main side"]);
    assert.throws(() => git(repo, ["merge", "merge-feature"]));
    writeFileSync(path.join(repo, "README.md"), "merge result with whitespace \n");
    git(repo, ["add", "README.md"]);
    git(repo, ["commit", "-m", "merge resolution"]);
    const parents = git(repo, ["rev-list", "--parents", "-n", "1", "HEAD"]).split(/\s+/);
    assert.equal(parents.length, 3);
    const sha = parents[0];
    assert.doesNotThrow(() => execFileSync("git", ["diff-tree", "--check", "--root", "-r", "--no-commit-id", sha, "--"], {
      cwd: repo,
      stdio: "ignore",
    }));
    assert.throws(() => execFileSync("git", ["diff-tree", "--check", "--root", "-r", "--no-commit-id", "-m", sha, "--"], {
      cwd: repo,
      stdio: "ignore",
    }));
    receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.checks.status_empty.status, "PASS");
    assert.equal(receipt.checks.diff_check.status, "BLOCKED");
    assert.equal(receipt.checks.diff_check.reason_code, "diff_check_failed");
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(validateRfd010Receipt(receipt), receipt);
    const repeat = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.deepEqual({
      verdict: repeat.verdict,
      diff_check: repeat.checks.diff_check,
      status_empty: repeat.checks.status_empty,
    }, {
      verdict: receipt.verdict,
      diff_check: receipt.checks.diff_check,
      status_empty: receipt.checks.status_empty,
    });
    cleanupRfd010GitObjectSnapshot(repeat.candidateSnapshot);
  } finally {
    if (receipt?.candidateSnapshot) cleanupRfd010GitObjectSnapshot(receipt.candidateSnapshot);
    cleanUp(repo);
  }
});

test("RFD010 clean two-parent merge remains a deterministic PASS control", () => {
  const repo = makeRepo();
  let receipt;
  try {
    git(repo, ["checkout", "-b", "merge-feature"]);
    writeFileSync(path.join(repo, "feature.txt"), "feature\n");
    git(repo, ["add", "feature.txt"]);
    git(repo, ["commit", "-m", "feature file"]);
    git(repo, ["checkout", "main"]);
    writeFileSync(path.join(repo, "main.txt"), "main\n");
    git(repo, ["add", "main.txt"]);
    git(repo, ["commit", "-m", "main file"]);
    git(repo, ["merge", "--no-ff", "merge-feature", "-m", "clean merge"]);
    assert.equal(git(repo, ["rev-list", "--parents", "-n", "1", "HEAD"]).split(/\s+/).length, 3);
    receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.checks.diff_check.status, "PASS");
    assert.equal(receipt.checks.status_empty.status, "PASS");
    assert.equal(receipt.verdict, "PASS");
    assert.equal(validateRfd010Receipt(receipt), receipt);
  } finally {
    if (receipt?.candidateSnapshot) cleanupRfd010GitObjectSnapshot(receipt.candidateSnapshot);
    cleanUp(repo);
  }
});

test("RFD010 clean octopus merge checks every parent and remains a PASS control", () => {
  const repo = makeRepo();
  let receipt;
  try {
    git(repo, ["checkout", "-b", "octopus-a"]);
    writeFileSync(path.join(repo, "octopus-a.txt"), "a\n");
    git(repo, ["add", "octopus-a.txt"]);
    git(repo, ["commit", "-m", "octopus a"]);
    git(repo, ["checkout", "main"]);
    git(repo, ["checkout", "-b", "octopus-b"]);
    writeFileSync(path.join(repo, "octopus-b.txt"), "b\n");
    git(repo, ["add", "octopus-b.txt"]);
    git(repo, ["commit", "-m", "octopus b"]);
    git(repo, ["checkout", "main"]);
    git(repo, ["merge", "--no-ff", "octopus-a", "octopus-b", "-m", "clean octopus"]);
    assert.equal(git(repo, ["rev-list", "--parents", "-n", "1", "HEAD"]).split(/\s+/).length, 4);
    receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.checks.diff_check.status, "PASS");
    assert.equal(receipt.checks.status_empty.status, "PASS");
    assert.equal(receipt.verdict, "PASS");
    assert.equal(validateRfd010Receipt(receipt), receipt);
  } finally {
    if (receipt?.candidateSnapshot) cleanupRfd010GitObjectSnapshot(receipt.candidateSnapshot);
    cleanUp(repo);
  }
});

test("RFD010 arbitrary or mismatched authority PASS cannot bind the candidate", () => {
  const repo = makeRepo();
  try {
    const input = candidate(repo);
    const arbitrary = preflightRfd010ReleaseCandidate({
      ...input,
      authoritativeReceipt: {
        checks: {
          remote_fetch: { status: "PASS" },
          remote_tag_collision: { status: "PASS" },
          github_asset_collision: { status: "PASS" },
        },
      },
    });
    assert.equal(arbitrary.checks.authoritative_receipt.status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(arbitrary.external_authority.remote_fetch.status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(arbitrary.summary.release_ready, false);

    const mismatched = preflightRfd010ReleaseCandidate({
      ...input,
      authoritativeReceipt: {
        schema_version: "untrusted-authority",
        candidate: { source_sha: "f".repeat(40), version: "9.9.9" },
        checks: { remote_fetch: { status: "PASS" } },
      },
    });
    assert.equal(mismatched.checks.authoritative_receipt.status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(mismatched.external_authority.github_asset_collision.status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(mismatched.summary.release_ready, false);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 supplied authority remains deferred to the trusted validator", () => {
  const repo = makeRepo();
  try {
    const input = candidate(repo);
    const receipt = preflightRfd010ReleaseCandidate({
      ...input,
      authoritativeReceipt: {
        schema_version: "untrusted-authority",
        candidate: input,
        signature: { verified: true, value: "self-authenticated" },
        checks: {
          remote_fetch: { status: "PASS" },
          remote_tag_collision: { status: "PASS" },
          github_asset_collision: { status: "PASS" },
        },
      },
    });
    assert.equal(receipt.checks.authoritative_receipt.status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(receipt.external_authority.remote_fetch.status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(receipt.external_authority.remote_tag_collision.status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(receipt.external_authority.github_asset_collision.status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(receipt.release_authority_status, "DEFERRED_EXTERNAL_AUTHORITY");
    assert.equal(receipt.summary.release_ready, false);
    assert.equal(validateRfd010Receipt(receipt), receipt);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 receipt validator rejects tampered authority, readiness, execution, and mutation claims", () => {
  const repo = makeRepo();
  try {
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    for (const tamper of [
      (value) => ({ ...value, unexpected_root_key: true }),
      (value) => {
        const { generated_at, ...withoutGeneratedAt } = value;
        return withoutGeneratedAt;
      },
      (value) => ({ ...value, mode: "network_and_mutating" }),
      (value) => ({ ...value, external_authority: { ...value.external_authority, remote_fetch: { status: "PASS" } } }),
      (value) => ({ ...value, external_authority: { ...value.external_authority, remote_fetch: { status: "BLOCKED" } } }),
      (value) => ({
        ...value,
        external_authority: Object.fromEntries(Object.entries(value.external_authority).map(([key, result]) => [
          key,
          { ...result, reason_code: "arbitrary_deferred_reason" },
        ])),
      }),
      (value) => ({
        ...value,
        observed: { ...value.observed, authoritative_receipt_supplied: false },
        checks: { ...value.checks, authoritative_receipt: { status: "DEFERRED_EXTERNAL_AUTHORITY", reason_code: "separate_authority_validator_required" } },
        external_authority: Object.fromEntries(Object.entries(value.external_authority).map(([key, result]) => [
          key,
          { ...result, reason_code: "separate_authority_validator_required" },
        ])),
      }),
      (value) => ({ ...value, summary: { ...value.summary, release_ready: true } }),
      (value) => ({
        ...value,
        checks: { ...value.checks, status_empty: { status: "BLOCKED", reason_code: "worktree_dirty" } },
        summary: { ...value.summary, local_blocking_check_count: 1 },
      }),
      (value) => ({
        ...value,
        checks: { ...value.checks, status_empty: { status: "BLOCKED", reason_code: "worktree_dirty", dirty_entry_count: 1 } },
        observed: { ...value.observed, dirty_entry_count: 1, source_dirty: false },
        errors: [
          ...value.errors,
          { check: "status_empty", code: "worktree_dirty", message: "working tree is not clean" },
        ],
        summary: { ...value.summary, local_blocking_check_count: 1 },
        verdict: "BLOCKED",
        local_verdict: "BLOCKED",
      }),
      (value) => ({
        ...value,
        checks: { ...value.checks, status_empty: { status: "BLOCKED", reason_code: "diff_check_failed" } },
        errors: [
          ...value.errors,
          { check: "status_empty", code: "diff_check_failed", message: "whitespace error was found by diff check" },
        ],
        summary: { ...value.summary, local_blocking_check_count: 1 },
        verdict: "BLOCKED",
        local_verdict: "BLOCKED",
      }),
      (value) => ({
        ...value,
        checks: { ...value.checks, package_versions_consistent: { status: "BLOCKED", reason_code: "package_unavailable" } },
        errors: [
          ...value.errors,
          { check: "package_versions_consistent", code: "package_unavailable", message: "package metadata could not be inspected locally" },
        ],
        summary: { ...value.summary, local_blocking_check_count: 1 },
        verdict: "BLOCKED",
        local_verdict: "BLOCKED",
      }),
      (value) => ({
        ...value,
        observed: { ...value.observed, source_dirty: true },
      }),
      (value) => ({ ...value, execution: { ...value.execution, commit: { status: "PASS", receipt_bound: false } } }),
      (value) => ({ ...value, mutation_guard: { ...value.mutation_guard, commit: true } }),
      (value) => ({ ...value, summary: { ...value.summary, external_deferred_check_count: 0 } }),
      (value) => {
        const { status_empty, ...checks } = value.checks;
        return { ...value, checks };
      },
      (value) => ({
        ...value,
        input: { ...value.input, expected_source_sha: "f".repeat(40) },
      }),
      (value) => ({
        ...value,
        checks: { ...value.checks, status_empty: { status: "DEFERRED_EXTERNAL_AUTHORITY", reason_code: "no_authoritative_receipt" } },
      }),
      (value) => ({
        ...value,
        observed: { ...value.observed, dirty_entry_count: 1 },
      }),
    ]) {
      assert.throws(() => validateRfd010Receipt(tamper(receipt)), /RFD010 (?:receipt|external authority)/);
    }
    assert.equal(validateRfd010Receipt(receipt), receipt);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 receipt validator rejects calendar and producer-impossible formal states", () => {
  const repo = makeRepo();
  try {
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    const tamperCases = [
      ["calendar-invalid timestamp", (value) => ({ ...value, generated_at: "2026-02-31T12:00:00.000Z" })],
      ["formal not-required branch", (value) => ({
        ...value,
        checks: { ...value.checks, release_authorized_branch: { status: "PASS", not_required: true } },
      })],
      ["formal null branch observation", (value) => ({
        ...value,
        observed: { ...value.observed, source_branch: null },
      })],
      ["lockfile unavailable with versions", (value) => ({
        ...value,
        checks: { ...value.checks, lockfile_versions_bound: { status: "BLOCKED", reason_code: "lockfile_unavailable" } },
        errors: [...value.errors, {
          check: "lockfile_versions_bound",
          code: "lockfile_unavailable",
          message: "package lockfile is missing",
        }],
        verdict: "BLOCKED",
        local_verdict: "BLOCKED",
        summary: { ...value.summary, local_blocking_check_count: value.summary.local_blocking_check_count + 1 },
      })],
      ["requested channel alias drift", (value) => ({
        ...value,
        input: { ...value.input, requested_channel: "unknown-alias" },
      })],
      ["formal artifact-root check drift", (value) => ({
        ...value,
        checks: {
          ...value.checks,
          formal_artifact_root: { ...value.checks.formal_artifact_root, relative_path: "apps/desktop/dist/releases/wrong" },
        },
      })],
    ];
    for (const [label, tamper] of tamperCases) {
      assert.throws(() => validateRfd010Receipt(tamper(receipt)), /RFD010/, label);
    }
    assert.equal(validateRfd010Receipt(receipt), receipt);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 receipt validator recomputes sealed snapshot and enforces conditional observations", () => {
  const repo = makeRepo();
  try {
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    const tamperCases = [
      ["snapshot digest", (value) => ({
        ...value,
        observed: { ...value.observed, candidate_snapshot_manifest_sha256: "0".repeat(64) },
      })],
      ["snapshot count", (value) => ({
        ...value,
        observed: { ...value.observed, candidate_snapshot_file_count: value.observed.candidate_snapshot_file_count + 1 },
      })],
      ["snapshot root", (value) => ({
        ...value,
        observed: { ...value.observed, candidate_snapshot_relative_root: "apps/desktop/dist/releases/wrong" },
      })],
      ["artifact absolute root", (value) => ({
        ...value,
        observed: { ...value.observed, artifact_root_absolute: null },
      })],
      ["source timestamp omitted", (value) => ({
        ...value,
        observed: { ...value.observed, source_status_observed_at: null },
      })],
      ["source timestamp malformed", (value) => ({
        ...value,
        observed: { ...value.observed, source_status_observed_at: "2026-02-31T12:00:00.000Z" },
      })],
      ["sealed manifest bytes", (value) => ({
        ...value,
        candidateSnapshot: {
          ...value.candidateSnapshot,
          manifest: { ...value.candidateSnapshot.manifest, sha256: "0".repeat(64) },
        },
      })],
      ["sealed file count", (value) => ({
        ...value,
        candidateSnapshot: {
          ...value.candidateSnapshot,
          file_count: value.candidateSnapshot.file_count + 1,
        },
      })],
    ];
    for (const [label, tamper] of tamperCases) {
      const forged = preserveReceiptCapabilities(tamper(receipt), receipt);
      assert.throws(() => validateRfd010Receipt(forged), /RFD010/, label);
    }
    assert.equal(validateRfd010Receipt(receipt), receipt);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 dirty worktree is blocked without exposing dirty paths or mutating refs", () => {
  const repo = makeRepo();
  try {
    const beforeHead = git(repo, ["rev-parse", "HEAD"]);
    const beforeTree = git(repo, ["rev-parse", "HEAD^{tree}"]);
    writeFileSync(path.join(repo, "dirty.txt"), "dirty\n");
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.status_empty.status, "BLOCKED");
    assert.equal(receipt.checks.status_empty.reason_code, "worktree_dirty");
    assert.equal(receipt.observed.dirty_entry_count, 1);
    assert.equal(JSON.stringify(receipt).includes("dirty.txt"), false);
    assert.equal(git(repo, ["rev-parse", "HEAD"]), beforeHead);
    assert.equal(git(repo, ["rev-parse", "HEAD^{tree}"]), beforeTree);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 catches SHA/tree/version drift", () => {
  const repo = makeRepo({ desktopVersion: "0.1.16" });
  try {
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo, {
      expectedSourceSha: "a".repeat(40),
      expectedSourceTree: "b".repeat(40),
      version: VERSION,
    }));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.head_matches_expected_sha.reason_code, "source_sha_mismatch");
    assert.equal(receipt.checks.tree_matches_expected_tree.reason_code, "source_tree_mismatch");
    assert.equal(receipt.checks.package_versions_consistent.reason_code, "package_version_mismatch");
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 binds the top-level package-lock version as well as workspace entries", () => {
  const repo = makeRepo();
  try {
    const lockfilePath = path.join(repo, "package-lock.json");
    const lockfile = JSON.parse(readFileSync(lockfilePath, "utf8"));
    lockfile.version = "9.9.9";
    writeFileSync(lockfilePath, `${JSON.stringify(lockfile, null, 2)}\n`);
    git(repo, ["add", "package-lock.json"]);
    git(repo, ["commit", "-m", "drift lockfile owner version"]);
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.observed.lockfile_version, "9.9.9");
    assert.equal(receipt.observed.lockfile_root_version, VERSION);
    assert.equal(receipt.checks.lockfile_versions_bound.reason_code, "lockfile_version_mismatch");
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 exact local tag collision is detected read-only", () => {
  const repo = makeRepo();
  try {
    const tag = `matter-desktop-v${VERSION}`;
    git(repo, ["tag", tag]);
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.local_tag_collision.status, "BLOCKED");
    assert.equal(receipt.checks.local_tag_collision.reason_code, "local_tag_exists");
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 local release-manifest ID collision blocks a different SHA root", () => {
  const repo = makeRepo();
  try {
    const oldSha = "c".repeat(40);
    const root = releaseRoot(repo, oldSha);
    mkdirSync(root, { recursive: true });
    writeFileSync(path.join(root, "release-manifest.json"), `${JSON.stringify({
      release_id: `matter-desktop-v${VERSION}`,
      github_release_tag: `matter-desktop-v${VERSION}`,
      version: VERSION,
      source_sha: oldSha,
      source_tree: "e".repeat(40),
      source_dirty: false,
      channel: "formal",
      artifact_root: `apps/desktop/dist/releases/${VERSION}/${oldSha}/formal`,
      artifacts: [],
    }, null, 2)}\n`);
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.local_release_manifest_collision.status, "BLOCKED");
    assert.equal(receipt.checks.local_release_manifest_collision.reason_code, "release_manifest_id_collision");
    assert.equal(receipt.checks.artifact_root_collision.status, "PASS");
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 malformed or incomplete local manifests fail closed", () => {
  const repo = makeRepo();
  try {
    const manifestRoot = path.join(repo, "apps/desktop/dist/release-history");
    mkdirSync(manifestRoot, { recursive: true });
    writeFileSync(path.join(manifestRoot, "release-manifest.json"), "{\"release_id\":\"only-id\"}\n");
    writeFileSync(path.join(manifestRoot, "artifact-index.json"), "not-json\n");
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.local_release_manifest_collision.status, "BLOCKED");
    assert.equal(receipt.checks.local_release_manifest_collision.reason_code, "manifest_unavailable");
    assert.equal(receipt.summary.release_ready, false);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 existing formal artifact root/file is a collision", () => {
  const repo = makeRepo();
  try {
    const sourceSha = git(repo, ["rev-parse", "HEAD"]);
    const root = releaseRoot(repo, sourceSha);
    mkdirSync(root, { recursive: true });
    writeFileSync(path.join(root, "artifact-index.json"), "{}\n");
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.artifact_root_collision.status, "BLOCKED");
    assert.equal(receipt.checks.artifact_root_collision.reason_code, "artifact_root_exists");
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 duplicate artifact IDs and paths are rejected", () => {
  const repo = makeRepo();
  try {
    const sourceSha = git(repo, ["rev-parse", "HEAD"]);
    const root = `apps/desktop/dist/releases/${VERSION}/${sourceSha}/formal`;
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo, {
      artifacts: [
        { id: "macos_zip_archive", path: `${root}/macos.zip` },
        { id: "macos_zip_archive", path: `${root}/macos.zip` },
      ],
    }));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.artifact_records_unique.status, "BLOCKED");
    assert.equal(receipt.checks.artifact_records_unique.reason_code, "artifact_records_conflict");
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 same version with a different SHA gets a distinct root but default release ID still collides", () => {
  const repo = makeRepo();
  try {
    const currentSha = git(repo, ["rev-parse", "HEAD"]);
    const otherSha = "d".repeat(40);
    const oldRoot = releaseRoot(repo, otherSha);
    mkdirSync(oldRoot, { recursive: true });
    writeFileSync(path.join(oldRoot, "release-manifest.json"), `${JSON.stringify({
      release_id: `matter-desktop-v${VERSION}`,
      github_release_tag: `matter-desktop-v${VERSION}`,
      version: VERSION,
      source_sha: otherSha,
      source_tree: "e".repeat(40),
      source_dirty: false,
      channel: "formal",
      artifact_root: `apps/desktop/dist/releases/${VERSION}/${otherSha}/formal`,
      artifacts: [],
    }, null, 2)}\n`);
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo, { expectedSourceSha: currentSha }));
    assert.equal(receipt.checks.artifact_root_collision.status, "PASS");
    assert.equal(receipt.checks.local_release_manifest_collision.status, "BLOCKED");
    assert.equal(receipt.checks.local_release_manifest_collision.reason_code, "release_manifest_id_collision");
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 exact candidate artifact-root reservations collide across release identities", () => {
  const repo = makeRepo();
  try {
    const sourceSha = git(repo, ["rev-parse", "HEAD"]);
    const sourceTree = git(repo, ["rev-parse", "HEAD^{tree}"]);
    const relativeRoot = `apps/desktop/dist/releases/${VERSION}/${sourceSha}/formal`;
    const historyRoot = path.join(repo, "apps/desktop/dist/release-history");
    mkdirSync(historyRoot, { recursive: true });
    writeFileSync(path.join(historyRoot, "release-manifest.json"), `${JSON.stringify({
      release_id: "legacy-release-id",
      github_release_tag: "legacy-release-tag",
      version: VERSION,
      source_sha: sourceSha,
      source_tree: sourceTree,
      source_dirty: false,
      channel: "formal",
      artifact_root: relativeRoot,
      artifacts: [],
    }, null, 2)}\n`);
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.local_release_manifest_collision.status, "BLOCKED");
    assert.equal(receipt.checks.local_release_manifest_collision.reason_code, "release_manifest_artifact_root_collision");
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 abbreviated SHA is blocked and input assertion remains sanitized", () => {
  const repo = makeRepo();
  try {
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo, {
      expectedSourceSha: git(repo, ["rev-parse", "--short", "HEAD"]),
    }));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.errors.some((error) => error.code === "invalid_expected_source_sha"), true);
    assert.throws(
      () => assertRfd010ReleaseCandidateInput(candidate(repo, { expectedSourceSha: "deadbeef" })),
      /expected source SHA must be a full Git object ID/,
    );
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 rejects tags that fail git check-ref-format component rules", () => {
  const repo = makeRepo();
  try {
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo, {
      tag: `matter-desktop//v${VERSION}`,
      releaseId: `matter-desktop//v${VERSION}`,
    }));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.local_tag_collision.status, "BLOCKED");
    assert.equal(receipt.checks.local_tag_collision.reason_code, "invalid_tag");
    assert.throws(
      () => assertRfd010ReleaseCandidateInput(candidate(repo, {
        tag: `matter-desktop//v${VERSION}`,
        releaseId: `matter-desktop//v${VERSION}`,
      })),
      /safe release identifier/,
    );
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 rejects a tracked dist symlink that resolves outside the repository", () => {
  const repo = makeRepo();
  const outside = mkdtempSync(path.join(tmpdir(), "rfd010-outside-"));
  try {
    mkdirSync(path.join(outside, "releases"), { recursive: true });
    mkdirSync(path.join(repo, "apps/desktop"), { recursive: true });
    symlinkSync(outside, path.join(repo, "apps/desktop/dist"), "dir");
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.artifact_root_collision.status, "BLOCKED");
    assert.equal(receipt.checks.artifact_root_collision.reason_code, "artifact_root_symlink");
    assert.equal(receipt.summary.release_ready, false);
  } finally {
    cleanUp(repo);
    rmSync(outside, { recursive: true, force: true });
  }
});

test("RFD010 rejects a symlinked artifact file even when its target is outside the repository", () => {
  const repo = makeRepo();
  const outside = mkdtempSync(path.join(tmpdir(), "rfd010-outside-file-"));
  try {
    const sourceSha = git(repo, ["rev-parse", "HEAD"]);
    const root = releaseRoot(repo, sourceSha);
    mkdirSync(root, { recursive: true });
    const outsideFile = path.join(outside, "payload.zip");
    writeFileSync(outsideFile, "outside\n");
    const relativeArtifactPath = `apps/desktop/dist/releases/${VERSION}/${sourceSha}/formal/payload.zip`;
    symlinkSync(outsideFile, path.join(root, "payload.zip"));
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo, {
      artifacts: [{ id: "payload", path: relativeArtifactPath }],
    }));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.artifact_file_collision.status, "BLOCKED");
    assert.equal(receipt.checks.artifact_file_collision.reason_code, "artifact_path_symlink");
  } finally {
    cleanUp(repo);
    rmSync(outside, { recursive: true, force: true });
  }
});

test("RFD010 unauthorized branch is blocked without a branch/path leak", () => {
  const repo = makeRepo({ branch: "feature/rfd010-test" });
  try {
    const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.release_authorized_branch.reason_code, "unauthorized_branch");
    assert.equal(JSON.stringify(receipt).includes("feature/rfd010-test"), false);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 CLI writes an honest blocked receipt while leaving refs untouched", () => {
  const repo = makeRepo();
  try {
    const sourceSha = git(repo, ["rev-parse", "HEAD"]);
    const sourceTree = git(repo, ["rev-parse", "HEAD^{tree}"]);
    writeFileSync(path.join(repo, "dirty.txt"), "dirty\n");
    const beforeHead = git(repo, ["rev-parse", "HEAD"]);
    const beforeStatus = git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]);
    const beforeRefs = git(repo, ["for-each-ref", "--format=%(refname)=%(objectname)", "refs/heads", "refs/tags"]);
    const script = path.resolve(import.meta.dirname, "../prepare-rfd010-release-candidate.mjs");
    const output = path.join(repo, ".omo/evidence/rfd010-release-candidate/receipt.json");
    let resultError;
    try {
      execFileSync(process.execPath, [
        script,
        "--repo-root", repo,
        "--expected-sha", sourceSha,
        "--expected-tree", sourceTree,
        "--version", VERSION,
        "--release-id", `matter-desktop-v${VERSION}`,
        "--tag", `matter-desktop-v${VERSION}`,
        "--channel", "formal",
        "--output", output,
      ], { cwd: path.resolve(import.meta.dirname, "../.."), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      resultError = error;
    }
    assert.equal(resultError?.status, 2);
    const receipt = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.status_empty.reason_code, "worktree_dirty");
    assert.equal(receipt.evidence_write.performed, true);
    assert.equal(receipt.evidence_write.source_status_unchanged, null);
    assert.equal(receipt.mutation_guard.evidence_write_by_cli, true);
    assert.equal(receipt.mutation_guard.source_files_changed, false);
    assert.equal(git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]), beforeStatus);
    assert.equal(git(repo, ["rev-parse", "HEAD"]), beforeHead);
    assert.equal(git(repo, ["for-each-ref", "--format=%(refname)=%(objectname)", "refs/heads", "refs/tags"]), beforeRefs);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 CLI seals a clean immutable candidate without claiming origin stability after write", () => {
  const repo = makeRepo();
  const output = path.join(repo, ".omo/evidence/rfd010-release-candidate/clean.json");
  try {
    const result = invokeCli(repo, output);
    assert.equal(result.status, 0);
    const receipt = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(receipt.verdict, "PASS");
    assert.equal(receipt.checks.candidate_snapshot.status, "PASS");
    assert.equal(receipt.observed.candidate_snapshot_read_only, true);
    assert.equal(receipt.evidence_write.performed, true);
    assert.equal(receipt.evidence_write.source_status_unchanged, null);
    assert.equal(receipt.mutation_guard.source_files_changed, false);
    assert.equal(existsSync(rfd010SnapshotManifestPath(output)), true);
    const persistedRoundTrip = validateRfd010PersistedReceiptFile(output, { repoRoot: repo });
    assert.equal(persistedRoundTrip.verdict, "PASS");
    // The persisted JSON intentionally redacts the private sealed-snapshot
    // capability. Direct validation of a detached object must fail closed;
    // the official file validator above reopens the canonical manifest and
    // re-materializes the Git object before attaching a same-process binding.
    assert.throws(() => validateRfd010Receipt(receipt), /sealed snapshot capability is missing/);
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 persisted receipt copies require their canonical sealed manifest and reject tampering", () => {
  const repo = makeRepo();
  const output = path.join(repo, ".omo/evidence/rfd010-release-candidate/clean.json");
  const copied = path.join(repo, ".omo/evidence/rfd010-release-candidate/copied.json");
  try {
    assert.equal(invokeCli(repo, output).status, 0);
    writeFileSync(copied, readFileSync(output));
    assert.throws(
      () => validateRfd010PersistedReceiptFile(copied, { repoRoot: repo }),
      /sealed snapshot manifest is missing/,
    );
    writeFileSync(rfd010SnapshotManifestPath(copied), readFileSync(rfd010SnapshotManifestPath(output)));
    assert.equal(validateRfd010PersistedReceiptFile(copied, { repoRoot: repo }).verdict, "PASS");
    const tampered = JSON.parse(readFileSync(copied, "utf8"));
    tampered.observed.candidate_snapshot_file_count += 1;
    writeFileSync(copied, `${JSON.stringify(tampered, null, 2)}\n`);
    assert.throws(
      () => validateRfd010PersistedReceiptFile(copied, { repoRoot: repo }),
      /RFD010/,
    );
  } finally {
    cleanUp(repo);
  }
});

test("RFD010 Git-object materializer preserves safe symlinks and rejects escaping targets", () => {
  const safeRepo = makeRepo();
  let safeSnapshot;
  try {
    symlinkSync("README.md", path.join(safeRepo, "README-link"));
    git(safeRepo, ["add", "README-link"]);
    git(safeRepo, ["commit", "-m", "safe symlink"]);
    const input = candidate(safeRepo);
    safeSnapshot = materializeRfd010GitObjectSnapshot({
      repoRoot: input.repoRoot,
      expectedSourceSha: input.expectedSourceSha,
      expectedSourceTree: input.expectedSourceTree,
      version: input.version,
      channel: input.channel,
    });
    const symlinkMember = safeSnapshot.manifest.members.find((member) => member.path === "README-link");
    assert.deepEqual(symlinkMember, { path: "README-link", kind: "symlink", mode: 0, target: "README.md" });
    assert.equal(validateRfd010GitObjectSnapshot(safeSnapshot).manifest_sha256, safeSnapshot.manifest_sha256);
  } finally {
    if (safeSnapshot) cleanupRfd010GitObjectSnapshot(safeSnapshot);
    cleanUp(safeRepo);
  }

  const escapingRepo = makeRepo();
  try {
    symlinkSync("../../outside", path.join(escapingRepo, "escaping-link"));
    git(escapingRepo, ["add", "escaping-link"]);
    git(escapingRepo, ["commit", "-m", "escaping symlink"]);
    const input = candidate(escapingRepo);
    assert.throws(() => materializeRfd010GitObjectSnapshot({
      repoRoot: input.repoRoot,
      expectedSourceSha: input.expectedSourceSha,
      expectedSourceTree: input.expectedSourceTree,
      version: input.version,
      channel: input.channel,
    }), /snapshot_manifest_mismatch/);
  } finally {
    cleanUp(escapingRepo);
  }
});

test("RFD010 rejects archive path traversal before extraction and preserves an existing candidate", () => {
  const repo = makeRepo();
  const fakeArchive = path.join(mkdtempSync(path.join(tmpdir(), "rfd010-fake-archive-")), "malicious.tar");
  const shim = makeArchiveGitShim(fakeArchive);
  const parent = mkdtempSync(path.join(tmpdir(), "rfd010-candidate-parent-"));
  let snapshot;
  const originalPath = process.env.PATH;
  try {
    const input = candidate(repo);
    writeFileSync(fakeArchive, makeTarArchive({
      name: "../README.md",
      bytes: Buffer.from("rfd010 fixture\n"),
    }));
    Object.assign(process.env, shim.env);
    assert.throws(() => materializeRfd010GitObjectSnapshot({
      repoRoot: input.repoRoot,
      expectedSourceSha: input.expectedSourceSha,
      expectedSourceTree: input.expectedSourceTree,
      version: input.version,
      channel: input.channel,
    }), /snapshot_manifest_mismatch/);
    process.env.PATH = originalPath;

    const duplicateMember = makeTarArchive({
      name: "README.md",
      bytes: Buffer.from("rfd010 fixture\n"),
    });
    writeFileSync(fakeArchive, Buffer.concat([
      duplicateMember.subarray(0, -1024),
      duplicateMember.subarray(0, -1024),
      Buffer.alloc(1024),
    ]));
    Object.assign(process.env, shim.env);
    assert.throws(() => materializeRfd010GitObjectSnapshot({
      repoRoot: input.repoRoot,
      expectedSourceSha: input.expectedSourceSha,
      expectedSourceTree: input.expectedSourceTree,
      version: input.version,
      channel: input.channel,
    }), /snapshot_manifest_mismatch/);
    process.env.PATH = originalPath;

    const validArchive = execFileSync("git", ["archive", "--format=tar", input.expectedSourceSha], {
      cwd: repo,
      encoding: "buffer",
    });
    const orphanPax = makeTarArchive({
      name: "orphan-pax",
      type: "x",
      bytes: Buffer.from("18 path=README.md\n"),
    });
    writeFileSync(fakeArchive, Buffer.concat([
      validArchive.subarray(0, -1024),
      orphanPax,
    ]));
    Object.assign(process.env, shim.env);
    assert.throws(() => materializeRfd010GitObjectSnapshot({
      repoRoot: input.repoRoot,
      expectedSourceSha: input.expectedSourceSha,
      expectedSourceTree: input.expectedSourceTree,
      version: input.version,
      channel: input.channel,
    }), /snapshot_manifest_mismatch/);
    process.env.PATH = originalPath;

    snapshot = materializeRfd010GitObjectSnapshot({
      repoRoot: input.repoRoot,
      expectedSourceSha: input.expectedSourceSha,
      expectedSourceTree: input.expectedSourceTree,
      version: input.version,
      channel: input.channel,
      snapshotParent: parent,
    });
    const priorDigest = snapshot.manifest_sha256;
    assert.throws(() => materializeRfd010GitObjectSnapshot({
      repoRoot: input.repoRoot,
      expectedSourceSha: input.expectedSourceSha,
      expectedSourceTree: input.expectedSourceTree,
      version: input.version,
      channel: input.channel,
      snapshotParent: parent,
    }), /snapshot_manifest_mismatch/);
    assert.equal(validateRfd010GitObjectSnapshot(snapshot).manifest_sha256, priorDigest);
    assert.equal(lstatSync(snapshot.root).isDirectory(), true);
    const candidateParent = path.join(parent, input.version, input.expectedSourceSha);
    assert.deepEqual(readdirSync(candidateParent).filter((name) => name.startsWith(".rfd010-")), []);
  } finally {
    process.env.PATH = originalPath;
    if (snapshot) {
      assert.equal(cleanupRfd010GitObjectSnapshot({ ...snapshot, cleanup_root: parent }), false);
      makeTreeWritable(parent);
      rmSync(parent, { recursive: true, force: true });
    } else {
      rmSync(parent, { recursive: true, force: true });
    }
    rmSync(shim.shimRoot, { recursive: true, force: true });
    cleanUp(repo);
  }
});

test("RFD010 cleanup requires the private owned-candidate capability and preserves unrelated temp state", () => {
  const repo = makeRepo();
  const unrelated = mkdtempSync(path.join(tmpdir(), "rfd010-unrelated-temp-"));
  let snapshot;
  try {
    const input = candidate(repo);
    snapshot = materializeRfd010GitObjectSnapshot({
      repoRoot: input.repoRoot,
      expectedSourceSha: input.expectedSourceSha,
      expectedSourceTree: input.expectedSourceTree,
      version: input.version,
      channel: input.channel,
    });
    const forged = { ...snapshot, cleanup_root: unrelated };
    assert.equal(cleanupRfd010GitObjectSnapshot(forged), false);
    assert.equal(existsSync(unrelated), true);
    assert.equal(existsSync(snapshot.root), true);
    assert.equal(cleanupRfd010GitObjectSnapshot(snapshot), true);
    assert.equal(existsSync(snapshot.root), false);
    assert.equal(existsSync(unrelated), true);
  } finally {
    if (snapshot && existsSync(snapshot.root)) cleanupRfd010GitObjectSnapshot(snapshot);
    makeTreeWritable(unrelated);
    rmSync(unrelated, { recursive: true, force: true });
    cleanUp(repo);
  }
});

test("RFD010 CLI rejects source drift injected before immutable snapshot seal", () => {
  const repo = makeRepo();
  const output = path.join(repo, ".omo/evidence/rfd010-release-candidate/race.json");
  const shim = makeGitMutationShim(repo, 2);
  try {
    const result = invokeCli(repo, output, shim.env);
    assert.equal(result.status, 2);
    assert.equal(existsSync(output), true);
    const receipt = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(receipt.verdict, "BLOCKED");
    assert.equal(receipt.checks.status_empty.reason_code, "source_state_changed");
    const status = git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]);
    assert.match(status, /README\.md/);
    assert.equal(readFileSync(path.join(repo, "README.md"), "utf8").includes("injected source drift"), true);
  } finally {
    rmSync(shim.shimRoot, { recursive: true, force: true });
    cleanUp(repo);
  }
});

test("RFD010 CLI checkpoints turn every publication interleaving into a RED receipt", () => {
  for (const checkpoint of ["after_preflight", "before_evidence_rename", "after_evidence_rename", "before_return"]) {
    const repo = makeRepo();
    const output = path.join(repo, `.omo/evidence/rfd010-release-candidate/checkpoint-${checkpoint}.json`);
    const hook = makeCheckpointHook(checkpoint);
    try {
      const result = invokeCli(repo, output, hook.env);
      assert.equal(result.status, 2, checkpoint);
      const receipt = JSON.parse(readFileSync(output, "utf8"));
      assert.equal(receipt.verdict, "BLOCKED", checkpoint);
      assert.equal(receipt.local_verdict, "BLOCKED", checkpoint);
      assert.equal(receipt.checks.status_empty.reason_code, "source_state_changed", checkpoint);
      assert.equal(receipt.observed.source_dirty, true, checkpoint);
      assert.equal(receipt.observed.source_status_scope, "post_snapshot_checkpoint", checkpoint);
      assert.match(receipt.observed.source_status_observed_at, /^\d{4}-\d{2}-\d{2}T/);
      assert.equal(receipt.mutation_guard.source_files_changed, true, checkpoint);
      assert.equal(receipt.evidence_write.performed, true, checkpoint);
      assert.equal(receipt.summary.release_ready, false, checkpoint);
      assert.equal(receipt.verdict === "PASS" && receipt.observed.source_dirty === false, false, checkpoint);
      assert.throws(() => validateRfd010Receipt(receipt), /sealed snapshot capability is missing/, checkpoint);
      assert.equal(readFileSync(path.join(repo, "README.md"), "utf8").includes(`# checkpoint ${checkpoint}`), true);
    } finally {
      rmSync(hook.hookRoot, { recursive: true, force: true });
      cleanUp(repo);
    }
  }
});

test("RFD010 sealed candidate remains immutable after origin changes", () => {
  const postSealPoints = [
    "origin_after_seal_before_receipt",
    "origin_after_receipt_before_write",
    "origin_after_write",
    "origin_before_return",
  ];
  for (const point of postSealPoints) {
    const repo = makeRepo();
    let snapshot;
    try {
      const receipt = preflightRfd010ReleaseCandidate(candidate(repo));
      snapshot = receipt.candidateSnapshot;
      assert.equal(receipt.verdict, "PASS", point);
      assert.ok(snapshot?.root);
      writeFileSync(path.join(repo, "README.md"), `origin mutation at ${point}\n`);
      assert.equal(validateRfd010GitObjectSnapshot(snapshot).manifest_sha256, snapshot.manifest_sha256);
      assert.equal(validateRfd010Receipt(receipt), receipt);
      if (point === "origin_before_return") {
        const candidateReadme = path.join(snapshot.root, "README.md");
        chmodSync(snapshot.artifact_root, 0o755);
        writeFileSync(path.join(snapshot.artifact_root, "candidate-only.bin"), "candidate mutation\n");
        assert.throws(() => validateRfd010GitObjectSnapshot(snapshot), /snapshot_manifest_mismatch/);
        rmSync(path.join(snapshot.artifact_root, "candidate-only.bin"), { force: true });
        chmodSync(snapshot.artifact_root, 0o555);
        assert.equal(validateRfd010GitObjectSnapshot(snapshot).manifest_sha256, snapshot.manifest_sha256);
        chmodSync(candidateReadme, 0o544);
        assert.throws(() => validateRfd010GitObjectSnapshot(snapshot), /snapshot_manifest_mismatch/);
        chmodSync(candidateReadme, 0o444);
        assert.equal(validateRfd010GitObjectSnapshot(snapshot).manifest_sha256, snapshot.manifest_sha256);
        chmodSync(candidateReadme, 0o644);
        writeFileSync(candidateReadme, "candidate mutation after seal\n");
        assert.throws(() => validateRfd010GitObjectSnapshot(snapshot), /snapshot_manifest_mismatch/);
        const diagnostic = markRfd010ReceiptSnapshotDrift(receipt);
        assert.equal(diagnostic.verdict, "BLOCKED");
        assert.equal(validateRfd010Receipt(diagnostic), diagnostic);
      }
    } finally {
      if (snapshot) cleanupRfd010GitObjectSnapshot(snapshot);
      cleanUp(repo);
    }
  }
});

test("RFD010 CLI rejects tracked, traversed, and symlinked output paths before writing source", () => {
  const scenarios = [
    {
      name: "tracked package",
      output: (repo) => path.join(repo, "package.json"),
      setup: () => {},
      cleanup: () => {},
    },
    {
      name: "path traversal",
      output: (repo) => path.join(repo, ".omo/evidence/rfd010-release-candidate/../package.json"),
      setup: () => {},
      cleanup: () => {},
    },
    {
      name: "symlinked parent",
      output: (repo) => path.join(repo, ".omo/evidence/rfd010-release-candidate/receipt.json"),
      setup: (repo) => {
        const outside = mkdtempSync(path.join(tmpdir(), "rfd010-output-parent-"));
        symlinkSync(outside, path.join(repo, ".omo"), "dir");
        return outside;
      },
      cleanup: (outside) => rmSync(outside, { recursive: true, force: true }),
    },
    {
      name: "symlinked target",
      output: (repo) => path.join(repo, ".omo/evidence/rfd010-release-candidate/receipt.json"),
      setup: (repo) => {
        const outputRoot = path.join(repo, ".omo/evidence/rfd010-release-candidate");
        mkdirSync(outputRoot, { recursive: true });
        const target = path.join(repo, "package.json");
        symlinkSync(target, path.join(outputRoot, "receipt.json"));
        return undefined;
      },
      cleanup: () => {},
    },
    {
      name: "hardlinked tracked package",
      output: (repo) => path.join(repo, ".omo/evidence/rfd010-release-candidate/receipt.json"),
      setup: (repo) => {
        const outputRoot = path.join(repo, ".omo/evidence/rfd010-release-candidate");
        mkdirSync(outputRoot, { recursive: true });
        linkSync(path.join(repo, "package.json"), path.join(outputRoot, "receipt.json"));
        return undefined;
      },
      cleanup: () => {},
    },
  ];
  for (const scenario of scenarios) {
    const repo = makeRepo();
    let setupResult;
    try {
      setupResult = scenario.setup(repo);
      const packageBefore = readFileSync(path.join(repo, "package.json"), "utf8");
      const before = {
        head: git(repo, ["rev-parse", "HEAD"]),
        tree: git(repo, ["rev-parse", "HEAD^{tree}"]),
        status: git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]),
        refs: git(repo, ["for-each-ref", "--format=%(refname)=%(objectname)", "refs/heads", "refs/tags"]),
      };
      const result = invokeCli(repo, scenario.output(repo));
      assert.equal(result.status, 2, scenario.name);
      assert.equal(readFileSync(path.join(repo, "package.json"), "utf8"), packageBefore, scenario.name);
      assert.deepEqual({
        head: git(repo, ["rev-parse", "HEAD"]),
        tree: git(repo, ["rev-parse", "HEAD^{tree}"]),
        status: git(repo, ["status", "--porcelain=v1", "--untracked-files=all"]),
        refs: git(repo, ["for-each-ref", "--format=%(refname)=%(objectname)", "refs/heads", "refs/tags"]),
      }, before, scenario.name);
    } finally {
      scenario.cleanup(setupResult);
      cleanUp(repo);
    }
  }
});
