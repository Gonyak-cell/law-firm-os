import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  MICROSOFT_GROUP_EGRESS_SOURCE_PATHS,
  validateMicrosoftGroupEgressArtifactEntries,
  validateMicrosoftGroupEgressArtifactManifest,
} from "../lib/microsoft-group-egress-artifact.mjs";

const REPOSITORY = fileURLToPath(new URL("../../", import.meta.url));
const BUILDER = fileURLToPath(
  new URL("../build-microsoft-group-egress-artifact.mjs", import.meta.url),
);

function command(commandName, args, cwd) {
  return execFileSync(commandName, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function fixture() {
  const sandbox = mkdtempSync(join(tmpdir(), "lawos-group-egress-builder-test-"));
  const repository = join(sandbox, "repository");
  mkdirSync(repository, { mode: 0o700 });
  for (const sourcePath of MICROSOFT_GROUP_EGRESS_SOURCE_PATHS) {
    const target = join(repository, sourcePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(join(REPOSITORY, sourcePath)));
    chmodSync(target, 0o644);
  }
  command("git", ["init", "-q"], repository);
  command("git", ["config", "user.email", "group-egress-test@invalid"], repository);
  command("git", ["config", "user.name", "Group Egress Test"], repository);
  command("git", ["add", "--", "apps/microsoft-group-egress-controller"], repository);
  command("git", ["commit", "-qm", "fixture"], repository);
  return {
    sandbox,
    repository,
    sourceSha: command("git", ["rev-parse", "HEAD"], repository),
    sourceTree: command("git", ["rev-parse", "HEAD^{tree}"], repository),
  };
}

function runBuilder(value, outputDir, {
  cwd = value.repository,
  sourceSha = value.sourceSha,
  sourceTree = value.sourceTree,
  env = {},
} = {}) {
  return spawnSync(process.execPath, [
    BUILDER,
    "--source-sha",
    sourceSha,
    "--source-tree",
    sourceTree,
    "--output-dir",
    outputDir,
  ], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
    maxBuffer: 16 * 1024 * 1024,
  });
}

function mode(path) {
  return statSync(path).mode & 0o777;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

test("nested cwd cannot redirect artifacts back inside the Git repository", () => {
  const value = fixture();
  try {
    mkdirSync(join(value.repository, "scripts"), { mode: 0o755 });
    const outputDir = join(value.repository, "scripts", "nested-output");
    const result = runBuilder(value, outputDir, {
      cwd: join(value.repository, "apps"),
    });

    assert.notEqual(result.status, 0);
    assert.equal(existsSync(outputDir), false);
    assert.match(result.stderr, /outside the repository/u);
  } finally {
    rmSync(value.sandbox, { recursive: true, force: true });
  }
});

test("pre-existing output is rejected without changing its mode or contents", () => {
  const value = fixture();
  try {
    const outputDir = join(value.sandbox, "caller-owned");
    mkdirSync(outputDir, { mode: 0o755 });
    chmodSync(outputDir, 0o755);
    const result = runBuilder(value, outputDir);

    assert.notEqual(result.status, 0);
    assert.equal(mode(outputDir), 0o755);
    assert.deepEqual(readdirSync(outputDir), []);
    assert.match(result.stderr, /must not already exist/u);
  } finally {
    rmSync(value.sandbox, { recursive: true, force: true });
  }
});

test("identity drift and dirty source fail before an output directory exists", () => {
  const value = fixture();
  try {
    for (const [name, overrides] of [
      ["sha-drift", { sourceSha: "a".repeat(40) }],
      ["tree-drift", { sourceTree: "b".repeat(40) }],
    ]) {
      const outputDir = join(value.sandbox, name);
      const result = runBuilder(value, outputDir, overrides);
      assert.notEqual(result.status, 0);
      assert.equal(existsSync(outputDir), false);
      assert.match(result.stderr, /source identity drifted/u);
    }

    const dirtyPath = join(
      value.repository,
      MICROSOFT_GROUP_EGRESS_SOURCE_PATHS[0],
    );
    writeFileSync(dirtyPath, Buffer.concat([
      readFileSync(dirtyPath),
      Buffer.from("\n// dirty fixture\n"),
    ]));
    const outputDir = join(value.sandbox, "dirty");
    const result = runBuilder(value, outputDir);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(outputDir), false);
    assert.match(result.stderr, /clean exact-head worktree/u);
  } finally {
    rmSync(value.sandbox, { recursive: true, force: true });
  }
});

test("real ZIP builds are closed, source-bound, privately owned, and reproducible", () => {
  const value = fixture();
  try {
    const first = runBuilder(value, join(value.sandbox, "output-one"), {
      env: { TZ: "UTC" },
    });
    const second = runBuilder(value, join(value.sandbox, "output-two"), {
      env: { TZ: "Pacific/Honolulu" },
    });
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);

    const firstReceipt = JSON.parse(first.stdout);
    const secondReceipt = JSON.parse(second.stdout);
    assert.equal(firstReceipt.artifact_sha256, secondReceipt.artifact_sha256);
    assert.equal(firstReceipt.manifest_sha256, secondReceipt.manifest_sha256);
    assert.equal(
      sha256(readFileSync(firstReceipt.artifact_path)),
      firstReceipt.artifact_sha256,
    );
    assert.equal(mode(dirname(firstReceipt.artifact_path)), 0o700);
    assert.equal(mode(firstReceipt.artifact_path), 0o600);
    assert.equal(mode(firstReceipt.manifest_path), 0o600);

    const entries = command(
      "unzip",
      ["-Z1", firstReceipt.artifact_path],
      value.repository,
    ).split("\n");
    assert.equal(validateMicrosoftGroupEgressArtifactEntries(entries).entry_count, 10);
    const manifest = JSON.parse(readFileSync(firstReceipt.manifest_path, "utf8"));
    assert.equal(validateMicrosoftGroupEgressArtifactManifest(manifest).verdict, "PASS");
    const embedded = JSON.parse(command(
      "unzip",
      ["-p", firstReceipt.artifact_path, "deployment-manifest.json"],
      value.repository,
    ));
    assert.deepEqual(embedded, manifest);
    for (const source of manifest.sources) {
      const blob = execFileSync(
        "git",
        ["cat-file", "blob", `${value.sourceSha}:${source.source_path}`],
        { cwd: value.repository, encoding: null },
      );
      assert.equal(source.sha256, sha256(blob));
      assert.equal(source.byte_size, blob.byteLength);
    }
  } finally {
    rmSync(value.sandbox, { recursive: true, force: true });
  }
});
