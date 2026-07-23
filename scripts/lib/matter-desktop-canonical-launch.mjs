import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";
import {
  desktopReleaseChannelConfig,
  directoryDigest,
  validateDesktopBuildManifest,
} from "./matter-desktop-provenance.mjs";
import {
  readDesktopReleaseArtifactStage,
  requireDesktopReleaseArtifact,
} from "./matter-desktop-release-paths.mjs";

const GIT_OBJECT_PATTERN = /^[0-9a-f]{40}$/;
const MAC_EXECUTABLE_SUFFIX = path.join("Contents", "MacOS", "matter");
const BUILD_MANIFEST_SUFFIX = path.join("Contents", "Resources", "matter-build-manifest.json");
const RENDERER_SUFFIX = path.join("Contents", "Resources", "app", "src", "renderer", "web");
const INFO_PLIST_SUFFIX = path.join("Contents", "Info.plist");
const PLIST_TEXT_ENTITIES = Object.freeze({ "&amp;": "&", "&lt;": "<", "&gt;": ">" });

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function plistString(source, key) {
  const match = source.match(new RegExp(`<key>\\s*${key}\\s*</key>\\s*<string>([^<]+)</string>`));
  assert.ok(match, `Info.plist is missing ${key}`);
  return match[1].replace(/&(?:amp|lt|gt);/g, (entity) => PLIST_TEXT_ENTITIES[entity]);
}

export function inspectCanonicalMacBundle({
  repoRoot,
  appBundlePath,
  expectedSourceSha,
  expectedChannel = "internal",
}) {
  assert.ok(path.isAbsolute(repoRoot ?? ""), "repoRoot must be absolute");
  assert.ok(path.isAbsolute(appBundlePath ?? ""), "app bundle path must be absolute");
  assert.equal(path.resolve(appBundlePath), appBundlePath, "app bundle path must be normalized and exact");
  assert.match(expectedSourceSha ?? "", GIT_OBJECT_PATTERN, "expected source SHA must be a full 40-character Git SHA");
  const channel = desktopReleaseChannelConfig(expectedChannel);

  assert.equal(existsSync(appBundlePath), true, `app bundle is missing: ${appBundlePath}`);
  assert.equal(lstatSync(appBundlePath).isSymbolicLink(), false, "app bundle path must be a real path, not a symlink");
  assert.equal(realpathSync(appBundlePath), appBundlePath, "app bundle path must resolve to the exact real path");
  assert.equal(statSync(appBundlePath).isDirectory(), true, "app bundle path must be a directory");

  const executablePath = path.join(appBundlePath, MAC_EXECUTABLE_SUFFIX);
  const manifestPath = path.join(appBundlePath, BUILD_MANIFEST_SUFFIX);
  const rendererPath = path.join(appBundlePath, RENDERER_SUFFIX);
  const infoPlistPath = path.join(appBundlePath, INFO_PLIST_SUFFIX);
  for (const requiredPath of [executablePath, manifestPath, rendererPath, infoPlistPath]) {
    assert.equal(existsSync(requiredPath), true, `canonical app file is missing: ${requiredPath}`);
  }
  assert.equal(statSync(executablePath).isFile(), true, "canonical executable must be a file");
  assert.notEqual(statSync(executablePath).mode & 0o111, 0, "canonical executable must be executable");

  const manifestBody = readFileSync(manifestPath);
  const manifest = validateDesktopBuildManifest(JSON.parse(manifestBody));
  assert.equal(manifest.source_sha, expectedSourceSha, "canonical app source SHA mismatch");
  assert.equal(manifest.source_dirty, false, "canonical app source must be clean");
  assert.equal(manifest.channel, channel.channel, "canonical app channel mismatch");
  assert.equal(manifest.app_id, channel.appId, "canonical app ID mismatch");
  assert.equal(manifest.platform, "darwin", "canonical Mac app manifest platform mismatch");

  const infoPlist = readFileSync(infoPlistPath, "utf8");
  assert.equal(plistString(infoPlist, "CFBundleIdentifier"), manifest.app_id, "Info.plist app ID mismatch");
  assert.equal(plistString(infoPlist, "CFBundleShortVersionString"), manifest.version, "Info.plist version mismatch");
  assert.equal(plistString(infoPlist, "CFBundleExecutable"), "matter", "Info.plist executable mismatch");

  const renderer = directoryDigest(rendererPath);
  assert.deepEqual(renderer, manifest.renderer, "canonical app renderer does not match its build manifest");

  const stage = readDesktopReleaseArtifactStage({
    repoRoot,
    version: manifest.version,
    sourceSha: expectedSourceSha,
    channel: manifest.channel,
  });
  assert.equal(stage.index.source_tree, manifest.source_tree, "release index source tree mismatch");
  assert.equal(stage.index.app_id, manifest.app_id, "release index app ID mismatch");
  assert.deepEqual(stage.index.renderer, manifest.renderer, "release index renderer mismatch");
  const stagedManifest = requireDesktopReleaseArtifact(stage.index, "macos_build_manifest");
  const stagedManifestBody = readFileSync(path.join(repoRoot, stagedManifest.path));
  assert.equal(sha256(manifestBody), stagedManifest.sha256, "packaged manifest SHA does not match staged release truth");
  assert.deepEqual(manifestBody, stagedManifestBody, "packaged and staged build manifests differ");

  return {
    verdict: "PASS",
    app_bundle: appBundlePath,
    executable: executablePath,
    process_executable: executablePath,
    path_is_real: true,
    manifest_path: manifestPath,
    artifact_index: stage.indexPath,
    source_sha: manifest.source_sha,
    source_tree: manifest.source_tree,
    source_dirty: manifest.source_dirty,
    version: manifest.version,
    channel: manifest.channel,
    app_id: manifest.app_id,
    renderer: manifest.renderer,
    staged_manifest_equal: true,
    public_release_claim: false,
    production_go_live_claim: false,
  };
}

export function darwinProcessExecutable(pid) {
  try {
    const output = execFileSync("lsof", ["-a", "-p", String(pid), "-d", "txt", "-Fn"], { encoding: "utf8" });
    return output.split(/\r?\n/).find((line) => line.startsWith("n/"))?.slice(1) ?? null;
  } catch {
    return null;
  }
}

export function parseMatterProcessTable(source, { resolveExecutable } = {}) {
  return String(source ?? "")
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(/^\s*(\d+)\s+(.+?)\s*$/);
      if (!match) return [];
      const pid = Number(match[1]);
      const command = match[2];
      const hinted = command.includes("matter.app/Contents/MacOS/matter");
      const processExecutable = hinted && resolveExecutable
        ? resolveExecutable(pid, command)
        : command;
      const executableMatch = processExecutable?.match(/^(.+?matter\.app\/Contents\/MacOS\/matter)$/);
      return [{
        pid,
        command,
        matter_executable: executableMatch ? path.resolve(executableMatch[1]) : null,
      }];
    });
}

export function classifyMatterProcesses({ processes, targetExecutable }) {
  assert.ok(path.isAbsolute(targetExecutable ?? ""), "target executable must be absolute");
  const exactTarget = path.resolve(targetExecutable);
  const result = { exact: [], conflicts: [], ignored: [] };
  for (const processRecord of processes ?? []) {
    if (!processRecord.matter_executable) result.ignored.push(processRecord);
    else if (path.resolve(processRecord.matter_executable) === exactTarget) result.exact.push(processRecord);
    else result.conflicts.push(processRecord);
  }
  return result;
}

export function assertCanonicalLaunchProcessState({ processes, targetExecutable }) {
  const classified = classifyMatterProcesses({ processes, targetExecutable });
  if (classified.conflicts.length > 0) {
    throw new Error(`different matter bundle already running: ${classified.conflicts.map(({ matter_executable }) => matter_executable).join(", ")}`);
  }
  return {
    duplicate_pids: classified.exact.map(({ pid }) => pid),
    conflicting_pids: [],
  };
}
