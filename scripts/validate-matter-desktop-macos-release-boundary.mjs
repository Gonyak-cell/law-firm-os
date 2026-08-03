#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  MACOS_RELEASE_BOUNDARY_SCHEMA,
  MACOS_RELEASE_CHECKPOINT,
  MacosReleaseBoundaryError,
  collectMacosReleaseBoundaryReceipt,
  createMacosReleaseBoundaryPlan,
  createRf13DistMacosReleaseSidecar,
  sha256,
  validateMacosReleaseApproval,
  validateMacosReleaseBoundaryLive,
} from "./lib/matter-desktop-macos-release-boundary.mjs";

const USAGE = [
  "Usage:",
  "  node scripts/validate-matter-desktop-macos-release-boundary.mjs --plan [--output PATH]",
  "  node scripts/validate-matter-desktop-macos-release-boundary.mjs --collect --approval-intake PATH",
  "    --app-notary-request-id UUID --dmg-notary-request-id UUID [--output PATH]",
  "  node scripts/validate-matter-desktop-macos-release-boundary.mjs --receipt PATH",
  "    --approval-intake PATH --release-manifest PATH [--source-sha SHA] [--source-tree TREE]",
  "    [--dist-sidecar PATH --dist-receipt-id ID]",
  "Optional exact-artifact overrides: --repo-root PATH --manifest PATH --app PATH --dmg PATH.",
  "Collection runs verification/status commands only; it never signs, submits, or staples an artifact.",
  "Authoritative --receipt validation must use scripts/validate-matter-desktop-release-boundary.mjs.",
].join("\n");

function fail(code, message, details = {}) {
  throw new MacosReleaseBoundaryError(code, message, details);
}

function optionValue(argv, index, inlineValue, flag) {
  const value = inlineValue ?? argv[index + 1];
  if (!value || value.startsWith("--")) fail("INVALID_ARGUMENT", `${flag} requires a value`);
  return value;
}

function parseArgs(argv) {
  const options = { mode: argv.length ? undefined : "plan" };
  const valueFlags = new Map([
    ["--repo-root", "repoRoot"],
    ["--manifest", "manifestPath"],
    ["--app", "appPath"],
    ["--dmg", "dmgPath"],
    ["--approval-intake", "approvalPath"],
    ["--release-manifest", "releaseManifestPath"],
    ["--receipt", "receiptPath"],
    ["--output", "outputPath"],
    ["--source-sha", "expectedSourceSha"],
    ["--source-tree", "expectedSourceTree"],
    ["--app-notary-request-id", "appNotaryRequestId"],
    ["--dmg-notary-request-id", "dmgNotaryRequestId"],
    ["--dist-sidecar", "distSidecarPath"],
    ["--dist-receipt-id", "distReceiptId"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (["--plan", "--collect"].includes(argument)) {
      const mode = argument.slice(2);
      if (options.mode && options.mode !== mode) fail("INVALID_ARGUMENT", "select exactly one macOS boundary mode");
      options.mode = mode;
      continue;
    }
    const equalsIndex = argument.indexOf("=");
    const flag = equalsIndex === -1 ? argument : argument.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : argument.slice(equalsIndex + 1);
    const key = valueFlags.get(flag);
    if (!key) fail("INVALID_ARGUMENT", "unknown macOS release-boundary option");
    const value = optionValue(argv, index, inlineValue, flag);
    options[key] = value;
    if (inlineValue === undefined) index += 1;
    if (flag === "--receipt") {
      if (options.mode && options.mode !== "validate") fail("INVALID_ARGUMENT", "--receipt cannot be combined with another mode");
      options.mode = "validate";
    }
  }
  options.mode ??= "plan";
  return options;
}

function readJson(filePath, code, label) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    fail(code, `${label} must be readable structured JSON`);
  }
}

function git(repoRoot, args, fallback = "") {
  try {
    return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return fallback;
  }
}

function sourceIdentity(repoRoot) {
  const sourceSha = git(repoRoot, ["rev-parse", "HEAD"]);
  const sourceTree = git(repoRoot, ["rev-parse", "HEAD^{tree}"]);
  if (!/^[0-9a-f]{40}$/u.test(sourceSha) || !/^[0-9a-f]{40}$/u.test(sourceTree)) fail("SOURCE_IDENTITY_UNAVAILABLE", "repository source identity could not be resolved");
  return {
    sourceSha,
    sourceTree,
    sourceDirty: Boolean(git(repoRoot, ["status", "--porcelain", "--untracked-files=all"])),
  };
}

function repoRootFrom(options) {
  const candidate = path.resolve(options.repoRoot ?? git(process.cwd(), ["rev-parse", "--show-toplevel"], process.cwd()));
  if (!existsSync(path.join(candidate, "apps/desktop/package.json"))) fail("REPO_ROOT_INVALID", "repository root does not contain the desktop package");
  return candidate;
}

function defaultPaths(repoRoot, options) {
  const desktopPackage = readJson(path.join(repoRoot, "apps/desktop/package.json"), "DESKTOP_PACKAGE_INVALID", "desktop package");
  const prefix = `matter-${desktopPackage.version}`;
  return {
    version: desktopPackage.version,
    manifestPath: path.resolve(options.manifestPath ?? path.join(repoRoot, "apps/desktop/dist/mac", `${prefix}-macos-build-manifest.json`)),
    appPath: path.resolve(options.appPath ?? path.join(repoRoot, "apps/desktop/dist/mac/matter.app")),
    dmgPath: path.resolve(options.dmgPath ?? path.join(repoRoot, "apps/desktop/dist/mac", `${prefix}-macos.dmg`)),
    outputPath: path.resolve(options.outputPath ?? path.join(repoRoot, "apps/desktop/dist/mac", `${prefix}-macos-release-boundary.json`)),
  };
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return Boolean(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function writeJson(filePath, value, { repoRoot, allowedRoots }) {
  const target = path.resolve(filePath);
  if (!allowedRoots.map((root) => path.resolve(root)).some((root) => inside(root, target))) fail("OUTPUT_PATH_OUTSIDE_ALLOWED_ROOT", "macOS boundary output must remain in its exact evidence or artifact root");
  const parent = path.dirname(target);
  let cursor = repoRoot;
  const relativeParent = path.relative(repoRoot, parent);
  if (relativeParent === ".." || relativeParent.startsWith(`..${path.sep}`) || path.isAbsolute(relativeParent)) fail("OUTPUT_PATH_OUTSIDE_REPO", "macOS boundary output must remain inside the repository");
  for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    if (existsSync(cursor)) {
      const stats = lstatSync(cursor);
      if (stats.isSymbolicLink() || !stats.isDirectory()) fail("OUTPUT_PARENT_UNSAFE", "macOS boundary output parent must be a real directory");
    } else {
      mkdirSync(cursor, { mode: 0o700 });
    }
  }
  if (existsSync(target)) {
    const stats = lstatSync(target);
    if (stats.isSymbolicLink() || !stats.isFile()) fail("OUTPUT_TARGET_UNSAFE", "macOS boundary output target must be a regular non-symlink file");
  }
  const temporary = path.join(parent, `.${path.basename(target)}.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function buildPlan(repoRoot, paths, options, identity) {
  const blockers = [];
  let exactFormalManifest = false;
  if (identity.sourceDirty) blockers.push({ code: "CLEAN_EXACT_SOURCE_REQUIRED", category: "artifact" });
  if (!existsSync(paths.manifestPath)) {
    blockers.push({ code: "FORMAL_BUILD_MANIFEST_MISSING", category: "artifact" });
  } else {
    try {
      const manifest = readJson(paths.manifestPath, "FORMAL_BUILD_MANIFEST_INVALID", "formal build manifest");
      if (manifest.channel !== "formal" || manifest.source_dirty !== false || manifest.source_sha !== identity.sourceSha || manifest.source_tree !== identity.sourceTree) {
        blockers.push({ code: "CLEAN_EXACT_FORMAL_ARTIFACT_REQUIRED", category: "artifact" });
      } else {
        exactFormalManifest = true;
      }
    } catch {
      blockers.push({ code: "FORMAL_BUILD_MANIFEST_INVALID", category: "artifact" });
    }
  }
  if (exactFormalManifest) {
    if (!existsSync(paths.appPath)) blockers.push({ code: "FORMAL_APP_BUNDLE_MISSING", category: "artifact" });
    if (!existsSync(paths.dmgPath)) blockers.push({ code: "FORMAL_DMG_MISSING", category: "artifact" });
  } else {
    blockers.push({ code: "FORMAL_ARTIFACT_SET_UNAVAILABLE", category: "artifact" });
  }
  if (!options.approvalPath || !existsSync(path.resolve(options.approvalPath))) {
    blockers.push({ code: "APPROVED_INTAKE_MISSING", category: "authority" });
  } else {
    try {
      validateMacosReleaseApproval(readJson(path.resolve(options.approvalPath), "APPROVAL_JSON_INVALID", "approved intake"), {
        expectedSourceSha: identity.sourceSha,
        expectedSourceTree: identity.sourceTree,
      });
    } catch {
      blockers.push({ code: "APPROVED_INTAKE_INVALID", category: "authority" });
    }
  }
  if (!options.appNotaryRequestId || !options.dmgNotaryRequestId) blockers.push({ code: "NOTARY_REQUEST_IDS_MISSING", category: "artifact" });
  return createMacosReleaseBoundaryPlan({
    sourceSha: identity.sourceSha,
    sourceTree: identity.sourceTree,
    sourceDirty: identity.sourceDirty,
    blockers,
  });
}

function summary(receipt, receiptPath, releaseBoundaryAuthorized, validation) {
  return {
    validator: "matter-desktop-macos-release-boundary",
    schema_version: MACOS_RELEASE_BOUNDARY_SCHEMA,
    checkpoint_id: MACOS_RELEASE_CHECKPOINT,
    verdict: releaseBoundaryAuthorized ? "PASS" : receipt.verdict,
    receipt_path: receiptPath,
    source_sha: receipt.source.source_sha,
    source_tree: receipt.source.source_tree,
    application_sha256: receipt.artifacts.application.sha256,
    disk_image_sha256: receipt.artifacts.disk_image.sha256,
    certificate_fingerprint: receipt.signing_identity.certificate_fingerprint,
    team_id: receipt.signing_identity.team_id,
    validation_scope: releaseBoundaryAuthorized ? "strict_sha_scoped_release_boundary" : "read_only_probe_receipt",
    release_boundary_authorized: releaseBoundaryAuthorized,
    command_count_executed: validation?.command_count_executed ?? receipt.execution.command_count_executed,
    probe_sequence_sha256: validation?.live_probe_sequence_sha256 ?? receipt.execution.sequence_sha256,
    artifact_mutation: false,
    signing_executed: false,
    notarization_submission_executed: false,
    public_release_claim: false,
    production_go_live_claim: false,
    owner_approval_claim: false,
  };
}

export function run(options = {}, { shaScopedStage } = {}) {
  const repoRoot = repoRootFrom(options);
  const paths = defaultPaths(repoRoot, options);
  const identity = sourceIdentity(repoRoot);
  if (options.mode === "plan") {
    const plan = buildPlan(repoRoot, paths, options, identity);
    if (options.outputPath) writeJson(path.resolve(options.outputPath), plan, { repoRoot, allowedRoots: [path.join(repoRoot, ".omo/evidence")] });
    return { result: plan, exitCode: plan.verdict === "READY_FOR_READ_ONLY_PROBE" ? 0 : 2 };
  }
  const expectedSourceSha = options.expectedSourceSha ?? identity.sourceSha;
  const expectedSourceTree = options.expectedSourceTree ?? identity.sourceTree;
  if (options.mode === "collect") {
    if (!options.approvalPath) fail("APPROVAL_REQUIRED", "--approval-intake is required for live collection");
    if (!options.appNotaryRequestId || !options.dmgNotaryRequestId) fail("NOTARY_REQUEST_ID_REQUIRED", "both sanitized notary request ids are required for live collection");
    const approval = readJson(path.resolve(options.approvalPath), "APPROVAL_JSON_INVALID", "approved intake");
    const receipt = collectMacosReleaseBoundaryReceipt({
      repoRoot,
      manifestPath: paths.manifestPath,
      appPath: paths.appPath,
      dmgPath: paths.dmgPath,
      approval,
      appNotaryRequestId: options.appNotaryRequestId,
      dmgNotaryRequestId: options.dmgNotaryRequestId,
      notaryProfile: process.env.MATTER_NOTARY_KEYCHAIN_PROFILE,
      expectedSourceSha,
      expectedSourceTree,
      sourceDirty: identity.sourceDirty,
    });
    writeJson(paths.outputPath, receipt, { repoRoot, allowedRoots: [path.join(repoRoot, ".omo/evidence"), path.join(repoRoot, "apps/desktop/dist/mac")] });
    return { result: summary(receipt, path.relative(repoRoot, paths.outputPath).split(path.sep).join("/"), false), exitCode: 0 };
  }
  if (options.mode === "validate") {
    if (!options.receiptPath || !options.approvalPath || !options.releaseManifestPath) fail("STRUCTURED_INPUT_REQUIRED", "PASS validation requires --receipt, --approval-intake, and --release-manifest JSON inputs");
    const receiptAbsolute = path.resolve(options.receiptPath);
    let receiptBody;
    try {
      receiptBody = readFileSync(receiptAbsolute);
    } catch {
      fail("RECEIPT_READ_FAILED", "structured macOS receipt could not be read");
    }
    let receipt;
    try {
      receipt = JSON.parse(receiptBody.toString("utf8"));
    } catch {
      fail("LEGACY_MARKDOWN_REJECTED", "legacy Markdown or invalid JSON can never authorize macOS release PASS");
    }
    if (!shaScopedStage) fail("SHA_SCOPED_AUTHORITY_REQUIRED", "authoritative validation must run through the SHA-scoped compatibility entrypoint");
    const approval = readJson(path.resolve(options.approvalPath), "APPROVAL_JSON_INVALID", "approved intake");
    const releaseManifest = readJson(path.resolve(options.releaseManifestPath), "RELEASE_MANIFEST_JSON_INVALID", "release manifest");
    const manifest = readJson(paths.manifestPath, "FORMAL_BUILD_MANIFEST_INVALID", "formal build manifest");
    const validation = validateMacosReleaseBoundaryLive(receipt, {
      repoRoot,
      manifest,
      manifestPath: paths.manifestPath,
      appPath: paths.appPath,
      dmgPath: paths.dmgPath,
      approval,
      releaseManifest,
      receiptFileSha256: sha256(receiptBody),
      expectedSourceSha,
      expectedSourceTree,
      expectedReleaseRoot: shaScopedStage.relativeRoot,
      notaryProfile: process.env.MATTER_NOTARY_KEYCHAIN_PROFILE,
      sourceDirty: identity.sourceDirty,
    });
    const result = summary(receipt, path.relative(repoRoot, receiptAbsolute).split(path.sep).join("/"), true, validation);
    if (Boolean(options.distSidecarPath) !== Boolean(options.distReceiptId)) fail("DIST_SIDECAR_ARGUMENT_MISMATCH", "--dist-sidecar and --dist-receipt-id must be supplied together");
    if (options.distSidecarPath) {
      const sidecarPath = path.resolve(options.distSidecarPath);
      writeJson(sidecarPath, createRf13DistMacosReleaseSidecar(validation, { receiptId: options.distReceiptId }), { repoRoot, allowedRoots: [shaScopedStage.artifactRoot] });
      result.dist_sidecar_path = path.relative(repoRoot, sidecarPath).split(path.sep).join("/");
    }
    return { result, exitCode: 0 };
  }
  fail("INVALID_MODE", "macOS release-boundary mode is invalid");
}

export function main(argv = process.argv.slice(2), context = {}) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    const { result, exitCode } = run(options, context);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return exitCode;
  } catch (error) {
    const safe = error instanceof MacosReleaseBoundaryError;
    process.stderr.write(`${JSON.stringify({
      validator: "matter-desktop-macos-release-boundary",
      verdict: "FAIL",
      code: safe ? error.code : "MACOS_RELEASE_BOUNDARY_FAILED",
      message: safe ? error.message : "macOS release-boundary validation failed (details redacted)",
      details: safe ? error.details : {},
    })}\n`);
    return 1;
  }
}

function canonicalPath(filePath) {
  try {
    return realpathSync(filePath);
  } catch {
    return null;
  }
}

const executablePath = process.argv[1];
if (executablePath && canonicalPath(executablePath) === canonicalPath(fileURLToPath(import.meta.url))) process.exitCode = main();
