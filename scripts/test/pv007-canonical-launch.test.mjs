import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createDesktopBuildManifest,
  directoryDigest,
  serializeDesktopBuildManifest,
} from "../lib/matter-desktop-provenance.mjs";
import {
  DESKTOP_RELEASE_ARTIFACT_SCHEMA,
  desktopReleaseArtifactRelativeRoot,
} from "../lib/matter-desktop-release-paths.mjs";
import {
  assertCanonicalLaunchProcessState,
  classifyMatterProcesses,
  inspectCanonicalMacBundle,
  parseMatterProcessTable,
} from "../lib/matter-desktop-canonical-launch.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const VERSION = "0.1.17";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function write(target, body, mode) {
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, body);
  if (mode) chmodSync(target, mode);
  return target;
}

function withFixture(run) {
  const repoRoot = realpathSync(mkdtempSync(path.join(tmpdir(), "matter-pv007-")));
  try {
    const appBundlePath = path.join(repoRoot, "build outputs", "matter.app");
    const executablePath = write(
      path.join(appBundlePath, "Contents/MacOS/matter"),
      "#!/bin/sh\nexit 0\n",
      0o755,
    );
    const resourcesRoot = path.join(appBundlePath, "Contents/Resources");
    const rendererRoot = path.join(resourcesRoot, "app/src/renderer/web");
    write(path.join(rendererRoot, "index.html"), "<!doctype html><div id=\"root\"></div>\n");
    write(path.join(rendererRoot, "assets/index.js"), "console.log('forest');\n");
    const renderer = directoryDigest(rendererRoot);
    const manifest = createDesktopBuildManifest({
      version: VERSION,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      sourceDirty: false,
      renderer,
      channel: "internal",
      platform: "darwin",
      arch: "arm64",
      appId: "com.amic.matter.desktop.internal",
      builtAt: "2026-07-16T00:00:00.000Z",
    });
    const manifestBody = serializeDesktopBuildManifest(manifest);
    write(path.join(resourcesRoot, "matter-build-manifest.json"), manifestBody);
    write(path.join(appBundlePath, "Contents/Info.plist"), [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<plist version=\"1.0\"><dict>",
      "<key>CFBundleIdentifier</key><string>com.amic.matter.desktop.internal</string>",
      "<key>CFBundleShortVersionString</key><string>0.1.17</string>",
      "<key>CFBundleExecutable</key><string>matter</string>",
      "</dict></plist>",
      "",
    ].join("\n"));

    const releaseRoot = desktopReleaseArtifactRelativeRoot({
      version: VERSION,
      sourceSha: SOURCE_SHA,
      channel: "internal",
    });
    const stagedManifestPath = path.posix.join(
      releaseRoot,
      "mac/matter-internal-0.1.17-macos-build-manifest.json",
    );
    write(path.join(repoRoot, stagedManifestPath), manifestBody);
    const artifact = {
      id: "macos_build_manifest",
      path: stagedManifestPath,
      platform: "darwin",
      kind: "build_manifest",
      bytes: Buffer.byteLength(manifestBody),
      sha256: sha256(manifestBody),
    };
    const index = {
      schema_version: DESKTOP_RELEASE_ARTIFACT_SCHEMA,
      version: VERSION,
      source_sha: SOURCE_SHA,
      source_tree: SOURCE_TREE,
      source_dirty: false,
      channel: "internal",
      app_id: "com.amic.matter.desktop.internal",
      artifact_root: releaseRoot,
      renderer,
      generated_at: "2026-07-16T00:01:00.000Z",
      generic_build_paths_are_release_truth: false,
      public_release_claim: false,
      production_go_live_claim: false,
      artifacts: [artifact],
    };
    write(path.join(repoRoot, releaseRoot, "artifact-index.json"), `${JSON.stringify(index, null, 2)}\n`);
    write(path.join(repoRoot, releaseRoot, "checksums.sha256"), `${artifact.sha256}  ${artifact.path}\n`);

    return run({ repoRoot, appBundlePath, executablePath, rendererRoot });
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
}

test("PV-007 binds an absolute real app path to the exact staged manifest and renderer", () => withFixture((fixture) => {
  const result = inspectCanonicalMacBundle({
    repoRoot: fixture.repoRoot,
    appBundlePath: fixture.appBundlePath,
    expectedSourceSha: SOURCE_SHA,
    expectedChannel: "internal",
  });

  assert.equal(result.verdict, "PASS");
  assert.equal(result.app_bundle, fixture.appBundlePath);
  assert.equal(result.executable, fixture.executablePath);
  assert.equal(result.source_sha, SOURCE_SHA);
  assert.equal(result.renderer.file_count, 2);
  assert.equal(result.path_is_real, true);
  assert.equal(result.staged_manifest_equal, true);
}));

test("PV-007 rejects a wrong SHA, tampered renderer, or symlink app alias", () => withFixture((fixture) => {
  assert.throws(() => inspectCanonicalMacBundle({
    repoRoot: fixture.repoRoot,
    appBundlePath: fixture.appBundlePath,
    expectedSourceSha: "c".repeat(40),
    expectedChannel: "internal",
  }), /source SHA/i);

  write(path.join(fixture.rendererRoot, "assets/index.js"), "tampered\n");
  assert.throws(() => inspectCanonicalMacBundle({
    repoRoot: fixture.repoRoot,
    appBundlePath: fixture.appBundlePath,
    expectedSourceSha: SOURCE_SHA,
    expectedChannel: "internal",
  }), /renderer/i);

  const alias = path.join(fixture.repoRoot, "matter-alias.app");
  symlinkSync(fixture.appBundlePath, alias);
  assert.throws(() => inspectCanonicalMacBundle({
    repoRoot: fixture.repoRoot,
    appBundlePath: alias,
    expectedSourceSha: SOURCE_SHA,
    expectedChannel: "internal",
  }), /real path|symlink/i);
}));

test("PV-007 parses app paths with spaces and separates exact duplicates from other bundles", () => {
  const target = "/private/tmp/Law Firm OS/apps/desktop/dist/mac/matter.app/Contents/MacOS/matter";
  const processes = parseMatterProcessTable([
    `101 ${target} --disable-gpu`,
    `202 ${target}`,
    "303 /Applications/matter.app/Contents/MacOS/matter --inspect=0",
    "404 /private/tmp/Law Firm OS/apps/desktop/dist/mac/matter.app/Contents/Frameworks/matter Helper.app/Contents/MacOS/matter Helper",
    "505 /bin/zsh -lc unrelated",
    "606 /bin/zsh -lc echo /tmp/other/matter.app/Contents/MacOS/matter",
  ].join("\n"), {
    resolveExecutable: (pid) => new Map([
      [101, target],
      [202, target],
      [303, "/Applications/matter.app/Contents/MacOS/matter"],
      [404, "/private/tmp/Law Firm OS/apps/desktop/dist/mac/matter.app/Contents/Frameworks/matter Helper.app/Contents/MacOS/matter Helper"],
      [606, "/bin/zsh"],
    ]).get(pid) ?? null,
  });
  const classified = classifyMatterProcesses({ processes, targetExecutable: target });

  assert.deepEqual(classified.exact.map(({ pid }) => pid), [101, 202]);
  assert.deepEqual(classified.conflicts.map(({ pid }) => pid), [303]);
  assert.deepEqual(classified.ignored.map(({ pid }) => pid), [404, 505, 606]);
  assert.throws(
    () => assertCanonicalLaunchProcessState({ processes, targetExecutable: target }),
    /different matter bundle.*Applications\/matter\.app/i,
  );
});

test("PV-007 permits only exact-path duplicate termination when no other bundle is running", () => {
  const target = "/tmp/current/matter.app/Contents/MacOS/matter";
  const processes = parseMatterProcessTable(`701 ${target}\n702 ${target}\n`);
  const result = assertCanonicalLaunchProcessState({ processes, targetExecutable: target });

  assert.deepEqual(result.duplicate_pids, [701, 702]);
  assert.deepEqual(result.conflicting_pids, []);
});
