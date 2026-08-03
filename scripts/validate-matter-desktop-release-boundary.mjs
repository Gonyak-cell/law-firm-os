#!/usr/bin/env node

// Compatibility entrypoint. The legacy implementation trusted Markdown PASS
// strings and internal artifacts; only the structured formal boundary may now
// authorize RFD-TUW-012.
import { readFileSync } from "node:fs";
import path from "node:path";
import { readDesktopBuildSourceIdentity } from "./lib/matter-desktop-provenance.mjs";
import {
  readDesktopReleaseArtifactStage,
  requireDesktopReleaseArtifact,
} from "./lib/matter-desktop-release-paths.mjs";
import { main } from "./validate-matter-desktop-macos-release-boundary.mjs";

const argv = process.argv.slice(2);

function valueFor(flag) {
  const inline = argv.find((argument) => argument.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

function assertShaScopedReceipt() {
  const receiptPath = valueFor("--receipt");
  if (!receiptPath) return null;
  const repoRoot = path.resolve(valueFor("--repo-root") ?? process.cwd());
  const source = readDesktopBuildSourceIdentity(repoRoot);
  const desktopPackage = JSON.parse(readFileSync(path.join(repoRoot, "apps/desktop/package.json"), "utf8"));
  const stage = readDesktopReleaseArtifactStage({
    repoRoot,
    version: desktopPackage.version,
    sourceSha: source.sourceSha,
    channel: "formal",
  });
  const stagedReceipt = requireDesktopReleaseArtifact(stage.index, "macos_release_boundary_receipt");
  if (path.resolve(receiptPath) !== path.resolve(repoRoot, stagedReceipt.path)) throw new Error("SHA_SCOPED_RECEIPT_REQUIRED");
  const releaseManifestPath = valueFor("--release-manifest");
  if (!releaseManifestPath || path.resolve(releaseManifestPath) !== path.join(stage.artifactRoot, "release-manifest.json")) throw new Error("SHA_SCOPED_RELEASE_MANIFEST_REQUIRED");
  const receipt = JSON.parse(readFileSync(path.resolve(receiptPath), "utf8"));
  const stagedDmg = requireDesktopReleaseArtifact(stage.index, "macos_dmg_image");
  const stagedBuildManifest = requireDesktopReleaseArtifact(stage.index, "macos_build_manifest");
  if (receipt?.artifacts?.disk_image?.sha256 !== stagedDmg.sha256 || receipt?.artifacts?.disk_image?.bytes !== stagedDmg.bytes) throw new Error("STAGED_DMG_RECEIPT_MISMATCH");
  if (receipt?.build_manifest?.sha256 !== stagedBuildManifest.sha256 || receipt?.build_manifest?.bytes !== stagedBuildManifest.bytes) throw new Error("STAGED_BUILD_MANIFEST_RECEIPT_MISMATCH");
  return stage;
}

try {
  const shaScopedStage = assertShaScopedReceipt();
  process.exitCode = main(argv, { shaScopedStage });
} catch {
  process.stderr.write(`${JSON.stringify({
    validator: "matter-desktop-macos-release-boundary",
    verdict: "FAIL",
    code: "SHA_SCOPED_RECEIPT_REQUIRED",
    message: "final validation requires the exact SHA-scoped structured receipt (details redacted)",
    details: {},
  })}\n`);
  process.exitCode = 1;
}
