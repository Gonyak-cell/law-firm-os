import { existsSync, lstatSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  validateMacosReleaseBoundaryLive,
} from "./matter-desktop-macos-release-boundary.mjs";
import { validateDesktopBuildManifest } from "./matter-desktop-provenance.mjs";
import {
  exactKeys,
  fail,
  canonicalExistingFile,
  readJsonFile,
  validateFileDescriptor,
} from "./matter-rollback-io.mjs";

function canonicalDirectory(candidate, label) {
  if (typeof candidate !== "string" || !isAbsolute(candidate)) {
    fail("MATTER_ROLLBACK_PATH", `${label} must be absolute`);
  }
  const path = resolve(candidate);
  if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !statSync(path).isDirectory()
    || realpathSync(path) !== path) {
    fail("MATTER_ROLLBACK_PATH", `${label} must be a canonical non-symlink directory`);
  }
  return path;
}

function inside(root, candidate, label, { directory = false } = {}) {
  const path = directory
    ? canonicalDirectory(candidate, label)
    : typeof candidate === "string"
      ? canonicalExistingFile(candidate, label)
      : validateFileDescriptor(candidate, label).path;
  const rel = relative(root, path);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail("MATTER_ROLLBACK_PATH", `${label} must remain inside the declared release root`);
  }
  return path;
}

function json(descriptor, label) {
  return readJsonFile(validateFileDescriptor(descriptor, label).path, label).value;
}

export function acquireMatterRollbackMacosLiveValidation(manifest, {
  now = Date.now(),
  notaryProfile = process.env.MATTER_NOTARY_KEYCHAIN_PROFILE,
} = {}) {
  exactKeys(manifest.desktop, ["platform", "archive", "release_evidence"], "manifest desktop");
  if (manifest.desktop.platform !== "macos") {
    fail("MATTER_ROLLBACK_PLATFORM", "RFD-TUW-017 live authority only supports macOS");
  }
  const evidence = manifest.desktop.release_evidence;
  exactKeys(evidence, [
    "checkpoint_id", "repo_root", "receipt", "approved_intake", "build_manifest", "release_manifest",
    "dist_receipt", "application_path", "disk_image_path", "windows_native_qa",
  ], "RFD-TUW-012 release evidence");
  if (evidence.checkpoint_id !== "RFD-TUW-012" || evidence.windows_native_qa !== null) {
    fail("MATTER_ROLLBACK_RELEASE_EVIDENCE", "macOS rollback requires the RFD-TUW-012 native boundary");
  }
  const releaseRoot = canonicalDirectory(evidence.repo_root, "RFD-TUW-012 release root");
  const receiptDescriptor = validateFileDescriptor(evidence.receipt, "RFD-TUW-012 receipt");
  const manifestPath = inside(releaseRoot, evidence.build_manifest, "RFD-TUW-012 build manifest");
  const appPath = inside(releaseRoot, evidence.application_path, "RFD-TUW-012 application", { directory: true });
  const dmgPath = inside(releaseRoot, evidence.disk_image_path, "RFD-TUW-012 disk image");
  const stageRoot = canonicalDirectory(dirname(appPath), "RFD-TUW-012 SHA-scoped release stage");
  for (const [descriptor, label] of [
    [evidence.receipt, "RFD-TUW-012 receipt"],
    [evidence.approved_intake, "RFD-TUW-012 approved intake"],
    [evidence.release_manifest, "RFD-TUW-012 release manifest"],
  ]) inside(stageRoot, descriptor, label);
  const receipt = json(evidence.receipt, "RFD-TUW-012 receipt");
  let buildManifest;
  try {
    buildManifest = validateDesktopBuildManifest(json(evidence.build_manifest, "RFD-TUW-012 build manifest"));
  } catch {
    fail("MATTER_ROLLBACK_RELEASE_EVIDENCE", "RFD-TUW-012 build manifest failed canonical validation");
  }
  let liveValidation;
  try {
    liveValidation = validateMacosReleaseBoundaryLive(receipt, {
      repoRoot: releaseRoot,
      manifest: buildManifest,
      manifestPath,
      appPath,
      dmgPath,
      approval: json(evidence.approved_intake, "RFD-TUW-012 approved intake"),
      releaseManifest: json(evidence.release_manifest, "RFD-TUW-012 release manifest"),
      receiptFileSha256: receiptDescriptor.sha256,
      expectedSourceSha: manifest.source.sha,
      expectedSourceTree: manifest.source.tree,
      expectedReleaseRoot: relative(releaseRoot, stageRoot).split(sep).join("/"),
      notaryProfile,
      sourceDirty: false,
      now: new Date(now).toISOString(),
    });
  } catch {
    fail("MATTER_ROLLBACK_RELEASE_EVIDENCE", "same-process native RFD-TUW-012 validation failed");
  }
  return liveValidation;
}

export function acquireMatterRollbackPacketMacosLiveValidations(packet, options = {}) {
  return Object.freeze({
    current_b: acquireMatterRollbackMacosLiveValidation(packet.current_b.manifest, options),
    target_a: acquireMatterRollbackMacosLiveValidation(packet.target_a.manifest, options),
  });
}
