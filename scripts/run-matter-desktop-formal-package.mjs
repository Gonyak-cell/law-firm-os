#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const FORMAL_PACKAGE_REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
export const FORMAL_PACKAGE_PLAN_SCHEMA = "law-firm-os.matter-desktop-formal-package-plan.v1";

export const FORMAL_PACKAGE_PLAN_STEP_IDS = Object.freeze([
  "pv003-current-source",
  "desktop-smoke-tests",
  "desktop-file-bridge-tests",
  "desktop-file-bridge-contract",
  "desktop-file-bridge-implementation",
  "pv001-version",
  "pv002-provenance",
  "pv004-channels",
  "pv005-source",
  "build-macos",
  "build-windows",
  "build-windows-installer",
  "public-renderer-pii",
  "private-data-boundary",
  "pv006-source",
  "pv006-bundle",
  "stage-release-artifacts",
  "pv005-package",
  "assemble-formal-release",
  "formal-release-bundle",
  "no-public-release-claim",
]);

const FORBIDDEN_PLAN_TEXT = Object.freeze([
  /(?:^|[^a-z])aws(?:[^a-z]|$)/iu,
  /deploy/iu,
  /deployed[-:]?api/iu,
  /remote[-:]?smoke/iu,
  /operator[-:]?token/iu,
  /password/iu,
  /reset/iu,
  /confirm/iu,
  /credential/iu,
  /notar/iu,
  /(?:^|[^a-z])sign(?:[^a-z]|$)/iu,
  /MATTER_DESKTOP_SIGN/iu,
  /MATTER_NOTARY/iu,
  /APPLE_ID/iu,
  /CSC_[A-Z_]+/iu,
]);

const FORBIDDEN_SHELL_TEXT = /(?:&&|\|\||[;&|<>]|\$\(|`)/u;
const SIMPLE_ID = /^[a-z0-9][a-z0-9-]*$/u;
const ALLOWED_STEP_ENV_KEYS = new Set(["MATTER_DESKTOP_RELEASE_CHANNEL"]);
const AUTHORITY_ENV_PATTERNS = Object.freeze([
  /^AWS_/iu,
  /^MATTER_(?:OPERATOR|R4_OPERATOR|DESKTOP_OPERATOR|DEPLOY|REMOTE|API|CUTOVER)_/iu,
  /^(?:OPERATOR|DEPLOY|REMOTE)_/iu,
  /^MATTER_DESKTOP_AUTHENTICODE/iu,
  /^https?_proxy$/iu,
  /^(?:ELECTRON_BUILDER_OFFLINE|SIGNTOOL_TIMEOUT|CSC_FOR_PULL_REQUEST|CSC_IDENTITY_AUTO_DISCOVERY)$/iu,
  /^MATTER_DESKTOP_SIGN/iu,
  /^MATTER_DESKTOP_NOTAR/iu,
  /^MATTER_NOTARY/iu,
  /^CSC_/iu,
  /^WIN_CSC_/iu,
  /^APPLE_/u,
  /^(?:KEYCHAIN|CERTIFICATE|SIGNING)_/iu,
  /^npm_config_(?:csc|win_csc|apple|notary|sign)/iu,
  /^AZURE_(?:TENANT_ID|CLIENT_ID|CLIENT_SECRET|KEY_VAULT|SIGN)/iu,
]);

const EXPECTED_STEP_ARGV = Object.freeze({
  "pv003-current-source": ["scripts/validate-pv003-clean-sha-build-gate.mjs", "--current"],
  "desktop-smoke-tests": ["--test"],
  "desktop-file-bridge-tests": ["--test"],
  "desktop-file-bridge-contract": ["scripts/validate-desktop-file-bridge-contract.mjs"],
  "desktop-file-bridge-implementation": ["scripts/validate-matter-desktop-file-bridge.mjs"],
  "pv001-version": ["scripts/validate-pv001-desktop-version.mjs", "--package"],
  "pv002-provenance": ["scripts/validate-pv002-build-manifest.mjs", "--package"],
  "pv004-channels": ["scripts/validate-pv004-desktop-channels.mjs", "--source"],
  "pv005-source": ["scripts/validate-pv005-release-artifact-paths.mjs", "--source"],
  "build-macos": ["scripts/build-matter-desktop-mac.mjs"],
  "build-windows": ["scripts/build-matter-desktop-win.mjs"],
  "build-windows-installer": ["scripts/build-matter-desktop-win-installer.mjs"],
  "public-renderer-pii": ["scripts/validate-public-renderer-no-hrx-roster-pii.mjs"],
  "private-data-boundary": ["scripts/validate-matter-desktop-private-data-boundary.mjs"],
  "pv006-source": ["scripts/validate-pv006-legacy-assets.mjs", "--source"],
  "pv006-bundle": ["scripts/validate-pv006-legacy-assets.mjs", "--bundle"],
  "stage-release-artifacts": ["scripts/stage-matter-desktop-release-artifacts.mjs"],
  "pv005-package": ["scripts/validate-pv005-release-artifact-paths.mjs", "--package"],
  "assemble-formal-release": ["scripts/release-matter-desktop-formal.mjs"],
  "formal-release-bundle": ["scripts/validate-matter-desktop-formal-release-bundle.mjs"],
  "no-public-release-claim": ["scripts/validate-matter-desktop-no-public-release-claim.mjs"],
});

function freezeStep(step) {
  return Object.freeze({
    ...step,
    argv: Object.freeze([...step.argv]),
    env: Object.freeze({ ...(step.env ?? {}) }),
  });
}

function nodeStep(nodePath, id, script, args = [], options = {}) {
  return freezeStep({
    id,
    argv: [nodePath, script, ...args],
    cwd: options.cwd ?? "root",
    env: options.env ?? {},
  });
}

function desktopTestFiles(repoRoot) {
  const testRoot = path.join(repoRoot, "apps/desktop/test");
  if (!existsSync(testRoot)) throw new Error(`desktop test root is missing: ${testRoot}`);
  return readdirSync(testRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
    .map((entry) => `test/${entry.name}`)
    .sort();
}

function formalEnv() {
  return { MATTER_DESKTOP_RELEASE_CHANNEL: "formal" };
}

function isAuthorityEnvironmentKey(key) {
  return AUTHORITY_ENV_PATTERNS.some((pattern) => pattern.test(key));
}

export function sanitizeFormalPackageEnvironment(overrides = {}) {
  return Object.fromEntries(
    Object.entries({ ...process.env, ...overrides })
      .filter(([key]) => !isAuthorityEnvironmentKey(key)),
  );
}

export function buildFormalPackagePlan({ repoRoot = FORMAL_PACKAGE_REPO_ROOT, nodePath = process.execPath } = {}) {
  const desktopSmokeTests = desktopTestFiles(repoRoot);
  const fileBridgeTests = [
    "test/file-bridge.test.mjs",
    "test/file-picker-gesture.test.mjs",
    "test/file-upload-bridge.test.mjs",
    "test/file-save-as.test.mjs",
    "test/temp-preview-cleanup.test.mjs",
  ];
  const plan = [
    nodeStep(nodePath, "pv003-current-source", "scripts/validate-pv003-clean-sha-build-gate.mjs", ["--current"], { env: formalEnv() }),
    freezeStep({ id: "desktop-smoke-tests", argv: [nodePath, "--test", ...desktopSmokeTests], cwd: "apps/desktop", env: {} }),
    freezeStep({ id: "desktop-file-bridge-tests", argv: [nodePath, "--test", ...fileBridgeTests], cwd: "apps/desktop", env: {} }),
    nodeStep(nodePath, "desktop-file-bridge-contract", "scripts/validate-desktop-file-bridge-contract.mjs"),
    nodeStep(nodePath, "desktop-file-bridge-implementation", "scripts/validate-matter-desktop-file-bridge.mjs"),
    nodeStep(nodePath, "pv001-version", "scripts/validate-pv001-desktop-version.mjs", ["--package"]),
    nodeStep(nodePath, "pv002-provenance", "scripts/validate-pv002-build-manifest.mjs", ["--package"]),
    nodeStep(nodePath, "pv004-channels", "scripts/validate-pv004-desktop-channels.mjs", ["--source"]),
    nodeStep(nodePath, "pv005-source", "scripts/validate-pv005-release-artifact-paths.mjs", ["--source"]),
    nodeStep(nodePath, "build-macos", "scripts/build-matter-desktop-mac.mjs", [], { env: formalEnv() }),
    nodeStep(nodePath, "build-windows", "scripts/build-matter-desktop-win.mjs", [], { env: formalEnv() }),
    nodeStep(nodePath, "build-windows-installer", "scripts/build-matter-desktop-win-installer.mjs", [], { env: formalEnv() }),
    nodeStep(nodePath, "public-renderer-pii", "scripts/validate-public-renderer-no-hrx-roster-pii.mjs"),
    nodeStep(nodePath, "private-data-boundary", "scripts/validate-matter-desktop-private-data-boundary.mjs", [
      "apps/desktop/src/renderer/web",
      "apps/web/dist",
    ]),
    nodeStep(nodePath, "pv006-source", "scripts/validate-pv006-legacy-assets.mjs", ["--source"]),
    nodeStep(nodePath, "pv006-bundle", "scripts/validate-pv006-legacy-assets.mjs", ["--bundle"], { env: formalEnv() }),
    nodeStep(nodePath, "stage-release-artifacts", "scripts/stage-matter-desktop-release-artifacts.mjs", [], { env: formalEnv() }),
    nodeStep(nodePath, "pv005-package", "scripts/validate-pv005-release-artifact-paths.mjs", ["--package"], { env: formalEnv() }),
    nodeStep(nodePath, "assemble-formal-release", "scripts/release-matter-desktop-formal.mjs", [], { env: formalEnv() }),
    nodeStep(nodePath, "formal-release-bundle", "scripts/validate-matter-desktop-formal-release-bundle.mjs"),
    nodeStep(nodePath, "no-public-release-claim", "scripts/validate-matter-desktop-no-public-release-claim.mjs"),
  ];
  return Object.freeze(plan);
}

function lifecycleHookNames(scripts) {
  return [
    "prematter-desktop:formal-package",
    "postmatter-desktop:formal-package",
    "prematter-desktop:formal-release",
    "postmatter-desktop:formal-release",
  ]
    .filter((name) => Object.prototype.hasOwnProperty.call(scripts, name));
}

export function validateFormalPackagePlan(plan, {
  rootScripts = undefined,
  repoRoot = FORMAL_PACKAGE_REPO_ROOT,
  nodePath = process.execPath,
} = {}) {
  if (!Array.isArray(plan) || plan.length === 0) throw new Error("formal package plan must be a non-empty array");
  const ids = plan.map((step) => step?.id);
  if (JSON.stringify(ids) !== JSON.stringify(FORMAL_PACKAGE_PLAN_STEP_IDS)) {
    throw new Error(`formal package plan step order is invalid: ${JSON.stringify(ids)}`);
  }
  const seen = new Set();
  for (const step of plan) {
    if (!step || !SIMPLE_ID.test(step.id) || seen.has(step.id)) throw new Error("formal package plan has duplicate or invalid step ids");
    seen.add(step.id);
    if (!Array.isArray(step.argv) || step.argv.length < 2 || step.argv.some((value) => typeof value !== "string")) {
      throw new Error(`formal package plan step ${step.id} must use argv arrays`);
    }
    if (step.argv[0] !== nodePath) {
      throw new Error(`formal package plan step ${step.id} must invoke a pinned Node executable`);
    }
    const expectedArgs = EXPECTED_STEP_ARGV[step.id];
    if (!expectedArgs || expectedArgs.some((value, index) => step.argv[index + 1] !== value)) {
      throw new Error(`formal package plan step ${step.id} does not invoke its declared validator/builder`);
    }
    if (!["root", "apps/desktop"].includes(step.cwd)) throw new Error(`formal package plan step ${step.id} has an invalid cwd`);
    if (!step.env || typeof step.env !== "object" || Array.isArray(step.env)) throw new Error(`formal package plan step ${step.id} has invalid env`);
    const undeclaredEnvKeys = Object.keys(step.env).filter((key) => !ALLOWED_STEP_ENV_KEYS.has(key));
    if (undeclaredEnvKeys.length > 0 || Object.keys(step.env).some(isAuthorityEnvironmentKey)) {
      throw new Error(`formal package plan step ${step.id} has undeclared or authority environment keys`);
    }
    if (step.argv.some((value) => FORBIDDEN_SHELL_TEXT.test(value))) throw new Error(`formal package plan step ${step.id} contains shell syntax`);
    const authorityText = JSON.stringify({
      id: step.id,
      executable: step.argv[0],
      command: step.argv.slice(1, 3),
      cwd: step.cwd,
      env: step.env,
    });
    if (FORBIDDEN_PLAN_TEXT.some((pattern) => pattern.test(authorityText))) {
      throw new Error(`formal package plan step ${step.id} crosses a prohibited authority boundary`);
    }
    if (step.argv.includes("npm") || step.argv.some((value) => value.includes("npm"))) {
      throw new Error(`formal package plan step ${step.id} must not invoke npm lifecycle scripts`);
    }
  }
  const stageIndex = ids.indexOf("stage-release-artifacts");
  const packageIndex = ids.indexOf("pv005-package");
  const releaseIndex = ids.indexOf("assemble-formal-release");
  const bundleIndex = ids.indexOf("formal-release-bundle");
  if (!(stageIndex < packageIndex && packageIndex < releaseIndex && releaseIndex < bundleIndex)) {
    throw new Error("formal package plan must stage before PV005 package validation before local release assembly before bundle validation");
  }
  if (rootScripts) {
    const hooks = lifecycleHookNames(rootScripts);
    if (hooks.length > 0) throw new Error(`formal package cannot run root lifecycle hooks: ${hooks.join(", ")}`);
  }
  const canonicalPlan = buildFormalPackagePlan({ repoRoot, nodePath });
  for (let index = 0; index < plan.length; index += 1) {
    const actual = plan[index];
    const expected = canonicalPlan[index];
    if (actual.cwd !== expected.cwd
      || JSON.stringify(actual.argv) !== JSON.stringify(expected.argv)
      || JSON.stringify(actual.env) !== JSON.stringify(expected.env)) {
      throw new Error(`formal package plan step ${actual.id} does not match its exact declared argv/cwd/env signature`);
    }
  }
  return Object.freeze({
    schema_version: FORMAL_PACKAGE_PLAN_SCHEMA,
    step_count: plan.length,
    step_ids: Object.freeze([...ids]),
    stage_index: stageIndex,
    pv005_package_index: packageIndex,
    release_index: releaseIndex,
    bundle_index: bundleIndex,
  });
}

function resolveCwd(repoRoot, cwd) {
  return path.resolve(repoRoot, cwd === "root" ? "." : cwd);
}

export function runFormalPackagePlan({ repoRoot = FORMAL_PACKAGE_REPO_ROOT, plan = buildFormalPackagePlan({ repoRoot }) } = {}) {
  const rootPackage = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  validateFormalPackagePlan(plan, { rootScripts: rootPackage.scripts ?? {}, repoRoot });
  for (const step of plan) {
    const result = spawnSync(step.argv[0], step.argv.slice(1), {
      cwd: resolveCwd(repoRoot, step.cwd),
      env: sanitizeFormalPackageEnvironment(step.env),
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`formal package step ${step.id} failed with exit code ${result.status ?? "signal"}`);
    }
  }
  return { verdict: "PASS", schema_version: FORMAL_PACKAGE_PLAN_SCHEMA, step_count: plan.length };
}

export function usage() {
  return "usage: node scripts/run-matter-desktop-formal-package.mjs";
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  if (process.argv.length !== 2) {
    console.error(usage());
    process.exit(2);
  }
  try {
    console.log(JSON.stringify(runFormalPackagePlan(), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
