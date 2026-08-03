#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { _electron as electron } from "playwright";
import {
  directoryDigest,
  readDesktopBuildSourceIdentity,
  sha256File,
} from "./lib/matter-desktop-provenance.mjs";
import {
  FORMAL_PACKAGE_LOOPBACK_QA_LIMITATION,
  FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA,
  FORMAL_PACKAGE_LOOPBACK_QA_TUW,
  FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA,
  assertFormalPackageManifest,
  formalPackageLoopbackFileReference,
  formalPackageLaunchEnvironment,
  observeFormalQaExternalRequests,
  readFormalPackageLoopbackNativeQaReceipt,
  redactFormalPackageDiagnostic,
  runFormalPackageMatterScenario,
  startFormalPackageLoopbackApi,
  validateFormalPackageLoopbackNativeQaCapability,
  writeFormalPackageLoopbackQaReceipt,
  writeFormalPackageLoopbackTranscript,
} from "./lib/formal-package-loopback-qa.mjs";
import {
  WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
  buildBlockedWindowsSigningAuthorityReceipt,
  evaluateWindowsReleaseGate,
  validateWindowsSigningAuthorityReceipt,
} from "./lib/matter-desktop-windows-release-gate.mjs";
import {
  WINDOWS_UNINSTALL_CONTRACT,
  createWindowsNativeQaPowerShellAdapter,
  validateWindowsUninstallEvidence,
} from "./lib/matter-desktop-windows-native-qa.mjs";
import {
  buildDesktopArtifactPrivacyCorpus,
  createWindowsInstallerNativePrivacyReceipt,
  desktopBuildManifestSha256,
  desktopArtifactPrivacyCorpusSha256,
  expandedDesktopArtifactDescriptor,
  inspectExpandedDesktopArtifact,
  validateDesktopArtifactPrivacyEvidence,
  validateRf13DistPrivacyMemberReceipt,
  validateWindowsInstallerNativePrivacyEvidence,
  validateWindowsInstallerNativePrivacyReceipt,
  validateWindowsInstallerPrivacyBuilderEvidence,
} from "./lib/matter-desktop-artifact-privacy.mjs";
import { readValidatedWindowsNativeQaPassReceipt } from "./validate-matter-desktop-windows-native-qa-receipt.mjs";
import { claimFormalPackageLoopbackNativeLauncher } from "./lib/formal-package-loopback-launcher.mjs";

let launcherCapability;
try {
  launcherCapability = claimFormalPackageLoopbackNativeLauncher({ platform: "windows" });
} catch {
  process.stderr.write('{"verdict":"BLOCKED","code":"LAUNCHER_REQUIRED"}\n');
  process.exit(2);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPECTED_SOURCE_SHA = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA;
const VERSION = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8")).version;
const RELEASE_ID = process.env.MATTER_DESKTOP_RELEASE_ID ?? `matter-desktop-v${VERSION}-rfd-tuw-013`;
const INSTALLER_PATH = path.join(ROOT, `apps/desktop/dist/matter-${VERSION}-win-x64.exe`);
const BLOCKMAP_PATH = `${INSTALLER_PATH}.blockmap`;
const PACKAGE_ROOT = path.join(ROOT, `apps/desktop/dist/win/matter-${VERSION}-win32-x64`);
const PACKAGE_ZIP_PATH = path.join(ROOT, `apps/desktop/dist/win/matter-${VERSION}-win32-x64-unsigned.zip`);
const INSTALLER_DESCRIPTOR_PATH = path.join(ROOT, `apps/desktop/dist/win/matter-${VERSION}-win-installer-manifest.json`);
const INSTALLER_DESCRIPTOR_SIGNATURE_PATH = `${INSTALLER_DESCRIPTOR_PATH}.sig`;
const PACKAGE_RESOURCES = path.join(PACKAGE_ROOT, "resources");
const PACKAGE_MANIFEST_PATH = path.join(ROOT, `apps/desktop/dist/win/matter-${VERSION}-win-build-manifest.json`);
const PACKAGE_EMBEDDED_MANIFEST_PATH = path.join(PACKAGE_RESOURCES, "matter-build-manifest.json");
const PACKAGE_RENDERER_ROOT = path.join(PACKAGE_RESOURCES, "app/src/renderer/web");
const PACKAGE_RUNTIME_ROOT = path.join(PACKAGE_RESOURCES, "app/runtime");
const UNPACKED_EXECUTABLE = path.join(ROOT, "apps/desktop/dist/win-unpacked/matter.exe");
const UNPACKED_RESOURCES = path.join(ROOT, "apps/desktop/dist/win-unpacked/resources");
const UNPACKED_MANIFEST_RELATIVE_PATH = "resources/matter-build-manifest.json";
const UNPACKED_MANIFEST_PATH = path.join(path.dirname(UNPACKED_EXECUTABLE), UNPACKED_MANIFEST_RELATIVE_PATH);
const UNPACKED_RUNTIME_ROOT = path.join(UNPACKED_RESOURCES, "app/runtime");
const FORMAL_MARKER_PATH = path.join(UNPACKED_RESOURCES, "matter-formal-release.json");
const WINDOWS_BUILD_RECEIPT_PATH = path.join(ROOT, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md");
const ARTIFACT_DIR = path.resolve(process.env.MATTER_FORMAL_WINDOWS_QA_ARTIFACT_DIR
  ?? path.join(ROOT, "artifacts", "manual-qa", "formal-windows-package"));
const RECEIPT_PATH = path.join(ARTIFACT_DIR, "formal-windows-package-qa.json");
const RECEIPT_CANDIDATE_PATH = `${RECEIPT_PATH}.${process.pid}.candidate`;
const TRANSCRIPT_PATH = path.join(ARTIFACT_DIR, "formal-windows-package-qa-transcript.json");
const RFD013_RECEIPT_PATH = path.join(ARTIFACT_DIR, "rfd-tuw-013-windows-native-qa.json");
const AUTHORITY_RECEIPT_PATH = path.join(ARTIFACT_DIR, "windows-signing-authority.json");
const UNINSTALL_INVENTORY_PATH = path.join(ARTIFACT_DIR, "windows-uninstall-inventory.json");
const RF13_NATIVE_GATE_RECEIPT_PATH = path.join(ARTIFACT_DIR, "rf13-dist-windows-native-qa-receipt.json");
const RF13_RELEASE_GATE_RECEIPT_PATH = path.join(ARTIFACT_DIR, "rf13-dist-windows-release-decision-receipt.json");
const PACKAGE_DIRECTORY_PRIVACY_RECEIPT_PATH = `${PACKAGE_ROOT}.privacy.json`;
const PACKAGE_ZIP_PRIVACY_RECEIPT_PATH = `${PACKAGE_ZIP_PATH}.privacy.json`;
const PACKAGE_PRIVACY_ARTIFACT_ROOT = "apps/desktop/dist/win/privacy";
const INSTALLER_PRIVACY_BUILDER_RECEIPT_PATH = `${INSTALLER_PATH}.privacy-builder.json`;
const RF13_NATIVE_PRIVACY_RECEIPT_PATH = path.join(ARTIFACT_DIR, "rf13-dist-windows-installer-native-privacy-receipt.json");
const WINDOWS_RELEASE_MEMBER_PATHS = [
  PACKAGE_ZIP_PATH,
  INSTALLER_DESCRIPTOR_PATH,
  INSTALLER_DESCRIPTOR_SIGNATURE_PATH,
  PACKAGE_MANIFEST_PATH,
  WINDOWS_BUILD_RECEIPT_PATH,
  INSTALLER_PATH,
  BLOCKMAP_PATH,
];
const nativeAdapter = createWindowsNativeQaPowerShellAdapter();
let processInvocationCount = 0;
let packageLaunchCount = 0;

function invokeNative(executable, args, options = {}) {
  processInvocationCount += 1;
  return execFileSync(executable, args, options);
}

function invokeNativeAdapter(method, ...args) {
  processInvocationCount += 1;
  return nativeAdapter[method](...args);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function sha256Text(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function repositoryRelative(filePath) {
  const relative = path.relative(ROOT, filePath);
  assert.equal(relative.startsWith("..") || path.isAbsolute(relative), false, "Windows QA evidence must remain inside the repository");
  return relative.split(path.sep).join("/");
}

function evidenceReference(filePath, receiptId) {
  return {
    path: repositoryRelative(filePath),
    sha256: sha256File(filePath),
    ...(receiptId ? { receipt_id: receiptId } : {}),
  };
}

function canonicalReceiptReference(filePath, receipt) {
  return {
    path: repositoryRelative(filePath),
    sha256: sha256File(filePath),
    bytes: statSync(filePath).size,
    schema_version: receipt.schema_version,
    receipt_id: receipt.receipt_id,
  };
}

function packageFileDescriptor(filePath) {
  return {
    path: repositoryRelative(filePath),
    sha256: sha256File(filePath),
    bytes: statSync(filePath).size,
  };
}

function packagedUrl(rendererIndex, section, view = "people") {
  const url = new URL(pathToFileURL(rendererIndex));
  url.searchParams.set("desktop", "1");
  url.searchParams.set("locale", "ko");
  url.searchParams.set("view", view);
  url.searchParams.set("ctx", "allow");
  url.hash = section;
  return url.href;
}

async function waitUntil(predicate, message, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(message);
}

function installPackage(installDir) {
  invokeNative(INSTALLER_PATH, ["/S", `/D=${installDir}`], {
    stdio: "inherit",
    windowsHide: true,
  });
  const executablePath = path.join(installDir, "matter.exe");
  assert.equal(existsSync(executablePath), true, `installed executable missing: ${executablePath}`);
  const uninstallerName = readdirSync(installDir).find((name) => /^uninstall.*\.exe$/iu.test(name));
  assert.ok(uninstallerName, "NSIS uninstaller is required");
  return {
    executablePath,
    uninstallerPath: path.join(installDir, uninstallerName),
    resourcesPath: path.join(installDir, "resources"),
  };
}

async function findProductPage(app) {
  await app.firstWindow({ timeout: 45_000 });
  for (let attempt = 0; attempt < 90; attempt += 1) {
    for (const page of app.windows()) {
      const ready = await page.locator("[data-login-form='email-password'], [data-product-axis-nav]").count().catch(() => 0);
      if (ready) return page;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Formal Windows product window did not become ready");
}

async function launchFormalApp({ executablePath, rendererIndex, baseUrl, userDataPath, envPath, observePage }) {
  const app = await electron.launch({
    executablePath,
    args: ["--disable-gpu"],
    env: formalPackageLaunchEnvironment({
      baseEnv: process.env,
      baseUrl,
      userDataPath,
      envPath,
    }),
    timeout: 45_000,
  });
  processInvocationCount += 1;
  packageLaunchCount += 1;
  const observedPages = new WeakSet();
  const observe = (targetPage) => {
    if (observedPages.has(targetPage)) return;
    observedPages.add(targetPage);
    observePage?.(targetPage);
  };
  app.on("window", observe);
  for (const targetPage of app.windows()) observe(targetPage);
  const page = await findProductPage(app);
  observe(page);
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const initialUrl = new URL(page.url());
  assert.equal(path.resolve(fileURLToPath(initialUrl)), path.resolve(rendererIndex));
  return { app, page };
}

async function login(page, account) {
  await page.locator("[data-login-email]").fill(account.email);
  await page.locator("[data-login-password]").fill(account.local_dev.synthetic_token);
  await page.locator("[data-login-form='email-password'] button[type='submit']").click();
  await page.waitForFunction(() => new URL(window.location.href).searchParams.get("view") === "home", null, { timeout: 20_000 });
  await page.locator("[data-product-axis-nav]").waitFor({ state: "visible", timeout: 20_000 });
  await page.locator(".post-login-splash").waitFor({ state: "detached", timeout: 10_000 });
  const session = await page.evaluate(() => window.matterSession?.status?.());
  assert.equal(session?.state, "signed_in");
  assert.equal(session?.user_id, account.user_id);
  assert.equal(session?.display_name, account.display_name);
  return session;
}

async function navigate(page, rendererIndex, section, view = "people") {
  await page.evaluate((url) => window.location.assign(url), packagedUrl(rendererIndex, section, view));
  await page.waitForLoadState("domcontentloaded");
}

async function activateStepUp(page, runtime) {
  const purpose = "payroll_export_review";
  const totp = runtime.stepUpAuthority.generateTotp({
    tenant_id: runtime.fixture.tenant_id,
    actor_id: runtime.account.user_id,
    purpose,
  });
  const response = await page.evaluate(async ({ purposeValue, totpCode }) => {
    const result = await window.matterSession.api({
      path: "/api/auth/step-up",
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purpose: purposeValue, totp_code: totpCode }),
    });
    return { status: Number(result?.http_status ?? result?.status ?? 0), token: result?.body?.step_up_token ?? "" };
  }, { purposeValue: purpose, totpCode: totp });
  assert.equal(response.status, 200);
  assert.match(response.token, /^lawos_hrx_step_up_v1\./u);
  await page.evaluate((token) => window.sessionStorage.setItem("lawos_hrx_step_up_token", token), response.token);
}

async function screenshot(page, name, selector) {
  const target = page.locator(selector);
  await target.waitFor({ state: "visible", timeout: 20_000 });
  const filePath = path.join(ARTIFACT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false, animations: "disabled", caret: "hide" });
  return {
    name,
    ...formalPackageLoopbackFileReference(filePath, { rootPath: ARTIFACT_DIR, scope: "evidence" }),
  };
}

assert.equal(process.platform, "win32", "formal Windows package QA must run on Windows");
assert.match(EXPECTED_SOURCE_SHA ?? "", /^[0-9a-f]{40}$/u, "MATTER_DESKTOP_EXPECTED_SOURCE_SHA is required");
const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
assert.equal(sourceIdentity.sourceSha, EXPECTED_SOURCE_SHA, "formal QA HEAD does not match expected source SHA");
assert.equal(sourceIdentity.sourceDirty, false, `formal QA source is dirty: ${sourceIdentity.sourceDirtyPaths.join(", ")}`);
for (const requiredPath of [
  INSTALLER_PATH,
  BLOCKMAP_PATH,
  PACKAGE_MANIFEST_PATH,
  PACKAGE_EMBEDDED_MANIFEST_PATH,
  PACKAGE_RENDERER_ROOT,
  UNPACKED_MANIFEST_PATH,
  FORMAL_MARKER_PATH,
  UNPACKED_EXECUTABLE,
  PACKAGE_DIRECTORY_PRIVACY_RECEIPT_PATH,
  PACKAGE_ZIP_PRIVACY_RECEIPT_PATH,
  INSTALLER_PRIVACY_BUILDER_RECEIPT_PATH,
  ...WINDOWS_RELEASE_MEMBER_PATHS,
]) assert.equal(existsSync(requiredPath), true, `missing QA prerequisite: ${path.relative(ROOT, requiredPath)}`);
assert.equal(existsSync(PACKAGE_RUNTIME_ROOT), false, "formal package must not bundle a local runtime");
assert.equal(existsSync(UNPACKED_RUNTIME_ROOT), false, "formal installer must not bundle a local runtime");

const packageManifest = readJson(PACKAGE_MANIFEST_PATH);
const packageEmbeddedManifest = readJson(PACKAGE_EMBEDDED_MANIFEST_PATH);
const unpackedManifest = readJson(UNPACKED_MANIFEST_PATH);
assertFormalPackageManifest(packageManifest, {
  expectedSourceSha: EXPECTED_SOURCE_SHA,
  expectedSourceTree: sourceIdentity.sourceTree,
  expectedPlatform: "win32",
  expectedVersion: VERSION,
});
assertFormalPackageManifest(unpackedManifest, {
  expectedSourceSha: EXPECTED_SOURCE_SHA,
  expectedSourceTree: sourceIdentity.sourceTree,
  expectedPlatform: "win32",
  expectedVersion: VERSION,
});
assert.deepEqual(packageEmbeddedManifest, packageManifest, "packaged and external Windows manifests differ");
assert.equal(readJson(FORMAL_MARKER_PATH).local_api_default, "disabled");
const packageRenderer = directoryDigest(PACKAGE_RENDERER_ROOT);
const unpackedRenderer = directoryDigest(path.join(UNPACKED_RESOURCES, "app/src/renderer/web"));
assert.deepEqual(packageRenderer, unpackedRenderer);
assert.deepEqual(packageRenderer, packageManifest.renderer);
assert.deepEqual(unpackedRenderer, unpackedManifest.renderer);
const primaryArtifactSha256 = sha256File(INSTALLER_PATH);
const manifestSha256 = sha256File(UNPACKED_MANIFEST_PATH);
const transcriptStartedAt = new Date().toISOString();
const privacyCorpus = await buildDesktopArtifactPrivacyCorpus({ repoRoot: ROOT, env: process.env });
const privacyCorpusSha256 = desktopArtifactPrivacyCorpusSha256(privacyCorpus);
const packageDirectoryPrivacyReceipt = readJson(PACKAGE_DIRECTORY_PRIVACY_RECEIPT_PATH);
const packageDirectoryPrivacyInspection = await inspectExpandedDesktopArtifact({
  rootPath: PACKAGE_ROOT,
  buildManifest: packageManifest,
  corpus: privacyCorpus,
  displayBase: ROOT,
});
const packageDirectoryPrivacyArtifact = expandedDesktopArtifactDescriptor({
  id: "windows_package_directory",
  inspection: packageDirectoryPrivacyInspection,
});
const packageDirectoryPrivacyValidation = await validateDesktopArtifactPrivacyEvidence({
  receipt: packageDirectoryPrivacyReceipt,
  artifact: packageDirectoryPrivacyArtifact,
  artifactPath: PACKAGE_ROOT,
  artifactRoot: PACKAGE_PRIVACY_ARTIFACT_ROOT,
  buildManifest: packageManifest,
  corpus: privacyCorpus,
  repoRoot: ROOT,
  displayBase: ROOT,
});
validateRf13DistPrivacyMemberReceipt(packageDirectoryPrivacyReceipt, {
  artifact: packageDirectoryPrivacyArtifact,
  artifactRoot: PACKAGE_PRIVACY_ARTIFACT_ROOT,
  expectedBuildManifestSha256: desktopBuildManifestSha256(packageManifest),
  expectedSourceSha: sourceIdentity.sourceSha,
  expectedSourceTree: sourceIdentity.sourceTree,
  repoRoot: ROOT,
  validation: packageDirectoryPrivacyValidation,
});
const packageZipPrivacyReceipt = readJson(PACKAGE_ZIP_PRIVACY_RECEIPT_PATH);
const packageZipPrivacyArtifact = {
  id: "windows_package_zip",
  kind: "unsigned_package_zip",
  sha256: sha256File(PACKAGE_ZIP_PATH),
  bytes: statSync(PACKAGE_ZIP_PATH).size,
};
const packageZipPrivacyValidation = await validateDesktopArtifactPrivacyEvidence({
  receipt: packageZipPrivacyReceipt,
  artifact: packageZipPrivacyArtifact,
  artifactPath: PACKAGE_ZIP_PATH,
  artifactRoot: PACKAGE_PRIVACY_ARTIFACT_ROOT,
  expectedRootName: path.basename(PACKAGE_ROOT),
  buildManifest: packageManifest,
  corpus: privacyCorpus,
  repoRoot: ROOT,
  displayBase: ROOT,
});
validateRf13DistPrivacyMemberReceipt(packageZipPrivacyReceipt, {
  artifact: packageZipPrivacyArtifact,
  artifactRoot: PACKAGE_PRIVACY_ARTIFACT_ROOT,
  expectedBuildManifestSha256: desktopBuildManifestSha256(packageManifest),
  expectedSourceSha: sourceIdentity.sourceSha,
  expectedSourceTree: sourceIdentity.sourceTree,
  repoRoot: ROOT,
  validation: packageZipPrivacyValidation,
});
assert.equal(
  packageDirectoryPrivacyReceipt.member_manifest_sha256,
  packageZipPrivacyReceipt.member_manifest_sha256,
  "formal Windows package directory and ZIP member digests differ",
);

const authorityReceipt = process.env.MATTER_WINDOWS_AUTHORITY_RECEIPT
  ? readJson(path.resolve(process.env.MATTER_WINDOWS_AUTHORITY_RECEIPT))
  : buildBlockedWindowsSigningAuthorityReceipt({
      receiptId: `rfd-tuw-013-${sourceIdentity.sourceSha.slice(0, 12)}-blocked`,
      sourceSha: sourceIdentity.sourceSha,
      sourceTree: sourceIdentity.sourceTree,
      releaseId: RELEASE_ID,
      version: VERSION,
      reasonCodes: [
        "NO_APPROVED_SIGNING_AUTHORITY_RECEIPT",
        "PROVIDER_NOT_SELECTED",
        "CERTIFICATE_NOT_PROCURED",
        "SIGNING_EXECUTION_NOT_ALLOWED",
      ],
    });
const releaseArtifactSha256 = [...new Set(WINDOWS_RELEASE_MEMBER_PATHS.map(sha256File))].sort();
const userDataPath = mkdtempSync(path.join(tmpdir(), "matter-formal-windows-userdata-"));
const installDir = mkdtempSync(path.join(process.env.RUNNER_TEMP ?? tmpdir(), "matter-formal-install-"));
const envPath = path.join(userDataPath, "empty.env");
writeFileSync(envPath, "", "utf8");

let runtime;
let app;
let page;
let installed;
let uninstallCompleted = false;
const pageErrors = [];
const consoleErrors = [];
const externalRequestGroups = [];
const screenshots = [];
let initialSession;
let restoredSession;
let desktopRuntime;
let matterScenario;
let uninstallEvidence;
let uninstallSummary;
let installerAuthenticode;
let installedExecutableAuthenticode;
let installedExecutableSha256;
let installedExecutableBytes;
let installerPrivacyArtifact;
let installerPrivacyBuilderReceipt;
let installerPrivacyBuilderValidation;
let installedRootPrivacyInspection;
try {
  validateWindowsSigningAuthorityReceipt(authorityReceipt, {
    expectedSourceSha: sourceIdentity.sourceSha,
    expectedSourceTree: sourceIdentity.sourceTree,
    expectedReleaseId: RELEASE_ID,
    expectedVersion: VERSION,
    expectedInstallerSha256: primaryArtifactSha256,
  });
  runtime = await startFormalPackageLoopbackApi({
    repoRoot: ROOT,
    stateRoot: path.join(userDataPath, "loopback-api"),
    expectedSourceSha: EXPECTED_SOURCE_SHA,
    expectedSourceTree: sourceIdentity.sourceTree,
  });
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  repositoryRelative(ARTIFACT_DIR);
  for (const generatedPath of [
    RECEIPT_CANDIDATE_PATH,
    TRANSCRIPT_PATH,
    RFD013_RECEIPT_PATH,
    AUTHORITY_RECEIPT_PATH,
    UNINSTALL_INVENTORY_PATH,
    RF13_NATIVE_GATE_RECEIPT_PATH,
    RF13_RELEASE_GATE_RECEIPT_PATH,
    RF13_NATIVE_PRIVACY_RECEIPT_PATH,
  ]) rmSync(generatedPath, { force: true });
  writeJson(AUTHORITY_RECEIPT_PATH, authorityReceipt);
  installerPrivacyArtifact = {
    id: "windows_installer",
    kind: "nsis_installer",
    sha256: primaryArtifactSha256,
    bytes: statSync(INSTALLER_PATH).size,
  };
  installerPrivacyBuilderReceipt = readJson(INSTALLER_PRIVACY_BUILDER_RECEIPT_PATH);
  installerPrivacyBuilderValidation = await validateWindowsInstallerPrivacyBuilderEvidence({
    receipt: installerPrivacyBuilderReceipt,
    artifact: installerPrivacyArtifact,
    artifactPath: INSTALLER_PATH,
    buildManifest: unpackedManifest,
    sourcePayloadPath: path.dirname(UNPACKED_EXECUTABLE),
    corpus: privacyCorpus,
    displayBase: ROOT,
    embeddedBuildManifestPath: UNPACKED_MANIFEST_RELATIVE_PATH,
  });
  installed = installPackage(installDir);
  const installedManifestPath = path.join(installed.resourcesPath, "matter-build-manifest.json");
  const installedMarkerPath = path.join(installed.resourcesPath, "matter-formal-release.json");
  const rendererIndex = path.join(installed.resourcesPath, "app/src/renderer/web/index.html");
  assert.equal(existsSync(installedManifestPath), true);
  assert.equal(existsSync(installedMarkerPath), true);
  assert.equal(existsSync(path.join(installed.resourcesPath, "app/runtime")), false);
  assert.deepEqual(readJson(installedManifestPath), unpackedManifest);
  assert.equal(directoryDigest(path.dirname(rendererIndex)).sha256, unpackedManifest.renderer.sha256);
  installedRootPrivacyInspection = await inspectExpandedDesktopArtifact({
    rootPath: installDir,
    buildManifest: unpackedManifest,
    corpus: privacyCorpus,
    displayBase: ROOT,
  });
  installedExecutableSha256 = sha256File(installed.executablePath);
  installedExecutableBytes = statSync(installed.executablePath).size;
  assert.equal(installedExecutableSha256, sha256File(UNPACKED_EXECUTABLE), "installed executable bytes differ from the packaged executable");
  installerAuthenticode = invokeNativeAdapter("inspectAuthenticode", INSTALLER_PATH, "installer");
  installedExecutableAuthenticode = invokeNativeAdapter("inspectAuthenticode", installed.executablePath, "installed_executable");

  const attachDiagnostics = (targetPage) => {
    targetPage.on("pageerror", (error) => pageErrors.push(redactFormalPackageDiagnostic(error)));
    targetPage.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(redactFormalPackageDiagnostic(message.text()));
    });
    externalRequestGroups.push(observeFormalQaExternalRequests(targetPage, runtime.baseUrl));
  };

  ({ app, page } = await launchFormalApp({
    executablePath: installed.executablePath,
    rendererIndex,
    baseUrl: runtime.baseUrl,
    userDataPath,
    envPath,
    observePage: attachDiagnostics,
  }));
  await page.locator("[data-login-screen='forest-split'][data-login-intro='complete']").waitFor({ state: "visible", timeout: 30_000 });
  screenshots.push(await screenshot(page, "01-windows-formal-login", "[data-login-screen='forest-split']"));
  initialSession = await login(page, runtime.account);
  desktopRuntime = await page.evaluate(() => window.matterSession?.runtime?.());
  assert.equal(desktopRuntime?.baseUrl, runtime.baseUrl);
  assert.equal(desktopRuntime?.mode, "production-auth-http");
  assert.equal(desktopRuntime?.operatorRuntimeConfigured, false);
  assert.equal(desktopRuntime?.operatorTokenMaterialExposed, false);

  await page.locator("[data-profile-trigger='true']").click();
  const profile = page.locator("[data-user-profile-surface='my-profile']");
  await profile.waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => document.querySelector("[data-user-profile-surface='my-profile']")?.getAttribute("data-profile-api-state") !== "loading", null, { timeout: 20_000 });
  assert.equal(await profile.getAttribute("data-profile-api-state"), "populated");
  assert.equal(await profile.getAttribute("data-profile-member"), runtime.fixture.roster.members[0].employee_id);
  screenshots.push(await screenshot(page, "02-windows-formal-synthetic-profile", "[data-user-profile-surface='my-profile']"));

  matterScenario = await runFormalPackageMatterScenario({
    page,
    runtime,
    navigate: (section, view) => navigate(page, rendererIndex, section, view),
    capture: (name, selector) => screenshot(page, `windows-${name}`, selector),
  });
  screenshots.push(...matterScenario.screenshots);

  await navigate(page, rendererIndex, "people-leave-usage");
  const leave = page.locator("#people-leave-usage");
  await leave.waitFor({ state: "visible", timeout: 20_000 });
  assert.match(await leave.innerText(), /휴가 사용 내역/u);
  screenshots.push(await screenshot(page, "07-windows-formal-leave", "#people-leave-usage"));

  await activateStepUp(page, runtime);
  await navigate(page, rendererIndex, "people-payroll");
  const payroll = page.locator("#people-payroll");
  await payroll.waitFor({ state: "visible", timeout: 20_000 });
  await payroll.locator(".payroll-summary-strip").waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await payroll.locator(".live-data-error").count(), 0);
  screenshots.push(await screenshot(page, "08-windows-formal-payroll", "#people-payroll"));

  await app.close();
  app = null;
  ({ app, page } = await launchFormalApp({
    executablePath: installed.executablePath,
    rendererIndex,
    baseUrl: runtime.baseUrl,
    userDataPath,
    envPath,
    observePage: attachDiagnostics,
  }));
  restoredSession = await page.evaluate(() => window.matterSession?.status?.());
  assert.equal(restoredSession?.state, "signed_in");
  assert.equal(restoredSession?.user_id, runtime.account.user_id);
  assert.equal(restoredSession?.display_name, runtime.account.display_name);
  await page.locator("[data-product-axis-nav]").waitFor({ state: "visible", timeout: 20_000 });
  await navigate(page, rendererIndex, "matter-work", "matters");
  await page.getByText("[RFD-014] package-created task", { exact: true }).first().waitFor({ state: "visible", timeout: 20_000 });
  screenshots.push(await screenshot(page, "09-windows-formal-restart-matter", '[data-matter-small-firm-screen="matter-work"]'));
  await app.close();
  app = null;

  const uninstallBefore = invokeNativeAdapter("collectUninstallState", { installDir, phase: "before" });
  invokeNative(installed.uninstallerPath, ["/S"], { stdio: "inherit", windowsHide: true });
  await waitUntil(() => !existsSync(installDir), "Windows uninstall did not remove the full install directory").catch(() => {});
  const uninstallAfter = invokeNativeAdapter("collectUninstallState", { installDir, phase: "after" });
  uninstallEvidence = {
    schema_version: "law-firm-os.rfd-tuw-013.windows-uninstall-evidence.v1",
    contract: WINDOWS_UNINSTALL_CONTRACT,
    before: uninstallBefore,
    after: uninstallAfter,
  };
  writeJson(UNINSTALL_INVENTORY_PATH, uninstallEvidence);
  uninstallSummary = validateWindowsUninstallEvidence(uninstallEvidence);
  uninstallCompleted = true;

  const externalRequests = externalRequestGroups.flat();
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(externalRequests, []);
  const releaseDecision = evaluateWindowsReleaseGate({
    nativeQa: "PASS",
    signatures: [installerAuthenticode, installedExecutableAuthenticode],
    authorityReceipt,
    sourceSha: sourceIdentity.sourceSha,
    sourceTree: sourceIdentity.sourceTree,
    releaseId: RELEASE_ID,
    version: VERSION,
    installerSha256: primaryArtifactSha256,
    installedExecutableSha256,
  });
  const authenticodeValid = releaseDecision.windows_release === "PASS";
  const rfd013Receipt = {
    schema_version: WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
    receipt_id: `rfd-tuw-013-${sourceIdentity.sourceSha.slice(0, 12)}-windows-native-qa`,
    tuw_id: "RFD-TUW-013",
    generated_at: new Date().toISOString(),
    native_qa: "PASS",
    windows_release: releaseDecision.windows_release,
    reason_code: releaseDecision.reason_code,
    release: { id: RELEASE_ID, version: VERSION, channel: "formal" },
    source: {
      revision: sourceIdentity.sourceSha,
      source_tree: sourceIdentity.sourceTree,
      source_dirty: false,
    },
    package: {
      release_root: repositoryRelative(path.join(ROOT, "apps/desktop/dist")),
      installer: packageFileDescriptor(INSTALLER_PATH),
      blockmap: packageFileDescriptor(BLOCKMAP_PATH),
      package_zip: packageFileDescriptor(PACKAGE_ZIP_PATH),
      installer_manifest: packageFileDescriptor(INSTALLER_DESCRIPTOR_PATH),
      installer_manifest_signature: packageFileDescriptor(INSTALLER_DESCRIPTOR_SIGNATURE_PATH),
      unpacked_executable: packageFileDescriptor(UNPACKED_EXECUTABLE),
      installed_executable: {
        path_kind: "isolated_native_install",
        sha256: installedExecutableSha256,
        bytes: installedExecutableBytes,
        matches_unpacked: installedExecutableSha256 === sha256File(UNPACKED_EXECUTABLE),
      },
      build_manifest: packageFileDescriptor(PACKAGE_MANIFEST_PATH),
      embedded_build_manifest: packageFileDescriptor(UNPACKED_MANIFEST_PATH),
      windows_build_receipt: packageFileDescriptor(WINDOWS_BUILD_RECEIPT_PATH),
      release_artifact_sha256: releaseArtifactSha256,
    },
    runtime: {
      mode: desktopRuntime.mode,
      topology: "thin-client",
      base_url_kind: "isolated_loopback_nonpackaged",
      operator_token_used: false,
    },
    identity: {
      synthetic_only: true,
      user_id: initialSession.user_id,
      employee_id: runtime.fixture.roster.members[0].employee_id,
    },
    scenarios: {
      nsis_install_completed: true,
      forest_login_rendered: true,
      signed_in: true,
      profile_populated: true,
      ...matterScenario.scenarios,
      leave_rendered: true,
      payroll_rendered: true,
      restart_session_restored: restoredSession.state === "signed_in",
      nsis_uninstall_completed: uninstallCompleted,
      full_install_directory_removed: uninstallSummary.install_directory_removed,
      declared_shortcuts_removed: uninstallSummary.shortcuts_removed,
      declared_services_removed: uninstallSummary.services_removed,
      declared_registry_removed: uninstallSummary.registry_removed,
      declared_update_residue_removed: uninstallSummary.update_residue_removed,
    },
    parity: {
      installed_executable_matches_unpacked: installedExecutableSha256 === sha256File(UNPACKED_EXECUTABLE),
      source_sha_matches_manifest: unpackedManifest.source_sha === sourceIdentity.sourceSha,
      source_tree_matches_manifest: unpackedManifest.source_tree === sourceIdentity.sourceTree,
    },
    uninstall: {
      inventory: evidenceReference(UNINSTALL_INVENTORY_PATH),
      summary: uninstallSummary,
    },
    authenticode: {
      authority_receipt: evidenceReference(AUTHORITY_RECEIPT_PATH, authorityReceipt.receipt_id),
      signatures: [installerAuthenticode, installedExecutableAuthenticode],
      signature_state: releaseDecision.signature_state,
      signer_binding: releaseDecision.signer_binding,
    },
    screenshots,
    diagnostics: {
      page_error_count: pageErrors.length,
      console_error_count: consoleErrors.length,
    },
    boundaries: {
      native_windows_executed: true,
      public_release_claim: false,
      production_go_live_claim: false,
      historical_receipt_accepted: false,
      certificate_secret_recorded: false,
      authenticode_claim: authenticodeValid,
    },
  };
  writeJson(RFD013_RECEIPT_PATH, rfd013Receipt);
  readValidatedWindowsNativeQaPassReceipt({
    receiptPath: RFD013_RECEIPT_PATH,
    repoRoot: ROOT,
  });
  const uninstallResidueCount = [
    uninstallSummary.install_directory_removed,
    uninstallSummary.shortcuts_removed,
    uninstallSummary.services_removed,
    uninstallSummary.registry_removed,
    uninstallSummary.update_residue_removed,
  ].filter((removed) => removed !== true).length;
  const nativePrivacyReceipt = createWindowsInstallerNativePrivacyReceipt({
    receiptId: `rfd-tuw-013-${sourceIdentity.sourceSha.slice(0, 12)}-windows-installer-native-privacy`,
    artifact: installerPrivacyArtifact,
    builderReceiptPath: INSTALLER_PRIVACY_BUILDER_RECEIPT_PATH,
    installedRootInspection: installedRootPrivacyInspection,
    nativeQaReceiptPath: RFD013_RECEIPT_PATH,
    repoRoot: ROOT,
    uninstallResidueCount,
  });
  const prewriteNativePrivacyValidation = validateWindowsInstallerNativePrivacyEvidence({
    receipt: nativePrivacyReceipt,
    artifact: installerPrivacyArtifact,
    repoRoot: ROOT,
    installedRootInspection: installedRootPrivacyInspection,
    builderValidation: installerPrivacyBuilderValidation,
  });
  validateWindowsInstallerNativePrivacyReceipt(nativePrivacyReceipt, {
    artifact: installerPrivacyArtifact,
    builderReceipt: installerPrivacyBuilderReceipt,
    expectedSourceSha: sourceIdentity.sourceSha,
    expectedSourceTree: sourceIdentity.sourceTree,
    validation: prewriteNativePrivacyValidation,
  });
  writeJson(RF13_NATIVE_PRIVACY_RECEIPT_PATH, nativePrivacyReceipt);
  const persistedNativePrivacyReceipt = readJson(RF13_NATIVE_PRIVACY_RECEIPT_PATH);
  const windowsInstallerPrivacyValidation = validateWindowsInstallerNativePrivacyEvidence({
    receipt: persistedNativePrivacyReceipt,
    artifact: installerPrivacyArtifact,
    repoRoot: ROOT,
    installedRootInspection: installedRootPrivacyInspection,
    builderValidation: installerPrivacyBuilderValidation,
  });
  validateWindowsInstallerNativePrivacyReceipt(persistedNativePrivacyReceipt, {
    artifact: installerPrivacyArtifact,
    builderReceipt: installerPrivacyBuilderReceipt,
    expectedSourceSha: sourceIdentity.sourceSha,
    expectedSourceTree: sourceIdentity.sourceTree,
    validation: windowsInstallerPrivacyValidation,
  });
  writeJson(RF13_NATIVE_GATE_RECEIPT_PATH, {
    schema_version: "law-firm-os.rf13-dist.windows-native-qa-receipt.v1",
    receipt_id: `rf13-dist-windows-native-${sourceIdentity.sourceSha.slice(0, 12)}`,
    gate: "windows_native_qa",
    status: "PASS",
    source_sha: sourceIdentity.sourceSha,
    source_tree: sourceIdentity.sourceTree,
    artifact_sha256: releaseArtifactSha256,
    executed: true,
    authoritative: true,
    template: false,
  });
  if (releaseDecision.windows_release !== "FAIL") {
    writeJson(RF13_RELEASE_GATE_RECEIPT_PATH, {
      schema_version: "law-firm-os.rf13-dist.windows-release-decision-receipt.v1",
      receipt_id: `rf13-dist-windows-release-${sourceIdentity.sourceSha.slice(0, 12)}`,
      gate: "windows_release",
      status: releaseDecision.windows_release,
      source_sha: sourceIdentity.sourceSha,
      source_tree: sourceIdentity.sourceTree,
      artifact_sha256: releaseArtifactSha256,
      decision_evaluated: true,
      native_qa_executed: true,
      signing_execution: releaseDecision.windows_release === "PASS",
      approved_certificate_fingerprint_sha256: releaseDecision.windows_release === "PASS"
        ? sha256Text(releaseDecision.signer_binding.thumbprint_sha1)
        : null,
      rfd013_receipt: canonicalReceiptReference(RFD013_RECEIPT_PATH, rfd013Receipt),
      authority_receipt: canonicalReceiptReference(AUTHORITY_RECEIPT_PATH, authorityReceipt),
      authoritative: true,
      template: false,
    });
  }
  if (releaseDecision.windows_release === "FAIL") {
    throw new Error(`Windows release gate failed: ${releaseDecision.reason_code}`);
  }
  const installerReference = formalPackageLoopbackFileReference(INSTALLER_PATH, { rootPath: ROOT, scope: "repository" });
  const blockmapReference = formalPackageLoopbackFileReference(BLOCKMAP_PATH, { rootPath: ROOT, scope: "repository" });
  const packageZipReference = formalPackageLoopbackFileReference(PACKAGE_ZIP_PATH, { rootPath: ROOT, scope: "repository" });
  const manifestReference = formalPackageLoopbackFileReference(UNPACKED_MANIFEST_PATH, { rootPath: ROOT, scope: "repository" });
  const unpackedExecutableReference = formalPackageLoopbackFileReference(UNPACKED_EXECUTABLE, { rootPath: ROOT, scope: "repository" });
  const privacyReceiptReferences = [
    formalPackageLoopbackFileReference(PACKAGE_DIRECTORY_PRIVACY_RECEIPT_PATH, { rootPath: ROOT, scope: "repository" }),
    formalPackageLoopbackFileReference(PACKAGE_ZIP_PRIVACY_RECEIPT_PATH, { rootPath: ROOT, scope: "repository" }),
    formalPackageLoopbackFileReference(INSTALLER_PRIVACY_BUILDER_RECEIPT_PATH, { rootPath: ROOT, scope: "repository" }),
    formalPackageLoopbackFileReference(RF13_NATIVE_PRIVACY_RECEIPT_PATH, { rootPath: ARTIFACT_DIR, scope: "evidence" }),
  ].sort((left, right) => (left.sha256 < right.sha256 ? -1 : left.sha256 > right.sha256 ? 1 : 0));
  const requestRows = runtime.requests.snapshot();
  const execution = {
    classification: "ACTUAL_NATIVE_RUNNER",
    runner_capability: "native-windows-nsis",
    process_invocation_count: processInvocationCount,
    package_launch_count: packageLaunchCount,
    adapter_invocation_count: matterScenario.adapter_invocation_count,
  };
  const transcript = {
    schema_version: FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA,
    tuw_id: FORMAL_PACKAGE_LOOPBACK_QA_TUW,
    platform: "windows",
    started_at: transcriptStartedAt,
    finished_at: new Date().toISOString(),
    source: {
      revision: sourceIdentity.sourceSha,
      source_tree: sourceIdentity.sourceTree,
    },
    artifacts: {
      package_artifact_sha256: primaryArtifactSha256,
      executed_package_sha256: installedExecutableSha256,
      executed_member_digest_sha256: installedRootPrivacyInspection.member_manifest_sha256,
      manifest_sha256: manifestSha256,
      privacy_receipt_sha256s: privacyReceiptReferences.map(({ sha256 }) => sha256),
    },
    runtime: {
      base_url: runtime.baseUrl,
      mode: desktopRuntime.mode,
      topology: "thin-client",
      health_source_sha: runtime.health.body.source_revision,
    },
    execution,
    requests: requestRows,
    screenshots: screenshots.map(({ bytes, name, path: filePath, sha256 }, index) => ({
      sequence: index + 1,
      name,
      path: filePath,
      sha256,
      bytes,
    })),
    diagnostics: {
      page_errors: pageErrors,
      console_errors: consoleErrors,
      external_requests: externalRequests,
      aws_request_count: 0,
    },
  };
  writeFormalPackageLoopbackTranscript(TRANSCRIPT_PATH, transcript, {
    platform: "windows",
    sourceSha: sourceIdentity.sourceSha,
    sourceTree: sourceIdentity.sourceTree,
    artifactSha256: primaryArtifactSha256,
    executedPackageSha256: installedExecutableSha256,
    manifestSha256,
    executedMemberDigestSha256: installedRootPrivacyInspection.member_manifest_sha256,
    privacyReceiptSha256s: privacyReceiptReferences.map(({ sha256 }) => sha256),
  });
  const transcriptReference = formalPackageLoopbackFileReference(TRANSCRIPT_PATH, {
    rootPath: ARTIFACT_DIR,
    scope: "evidence",
  });
  const receipt = {
    schema_version: FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA,
    tuw_id: FORMAL_PACKAGE_LOOPBACK_QA_TUW,
    platform: "windows",
    generated_at: new Date().toISOString(),
    verdict: releaseDecision.windows_release === "PASS"
      ? "PASS"
      : releaseDecision.windows_release === "BLOCKED_BY_AUTHORITY" ? "BLOCKED_AUTHENTICODE" : "FAIL",
    native_verdict: "PASS",
    evidence_scope: "local_exact_source_loopback_only",
    source: {
      revision: sourceIdentity.sourceSha,
      source_tree: sourceIdentity.sourceTree,
      source_dirty: false,
      renderer: unpackedRenderer,
    },
    bindings: {
      package_artifact: installerReference,
      executed_package: {
        kind: "windows_nsis_installed_executable",
        member_path: "isolated-native-install/matter.exe",
        sha256: installedExecutableSha256,
        bytes: installedExecutableBytes,
        member_digest_sha256: installedRootPrivacyInspection.member_manifest_sha256,
      },
      package_manifest: {
        ...manifestReference,
        embedded_member_path: "resources/matter-build-manifest.json",
        source_sha: unpackedManifest.source_sha,
        source_tree: unpackedManifest.source_tree,
        renderer_sha256: unpackedManifest.renderer.sha256,
      },
      loopback_api: {
        source_sha: runtime.source_sha,
        source_tree: runtime.source_tree,
        health_source_sha: runtime.health.body.source_revision,
        fixture_id: runtime.fixture.fixture_id,
      },
      runner_transcript: transcriptReference,
      artifact_privacy: {
        corpus_sha256: privacyCorpusSha256,
        receipts: privacyReceiptReferences,
      },
      all_source_sha_equal: unpackedManifest.source_sha === runtime.source_sha && runtime.source_sha === sourceIdentity.sourceSha,
    },
    package: {
      channel: unpackedManifest.channel,
      app_id: unpackedManifest.app_id,
      artifacts: [
        { role: "installer", ...installerReference },
        { role: "blockmap", ...blockmapReference },
        { role: "package_zip", ...packageZipReference },
        { role: "unpacked_executable", ...unpackedExecutableReference },
        { role: "manifest", ...manifestReference },
      ],
      thin_client: unpackedManifest.policy.thin_client,
      runtime_data_mode: unpackedManifest.effective_runtime_mode,
      runtime_data_class: unpackedManifest.runtime_data_class,
      bundled_local_api_present: false,
      private_local_runtime_present: false,
      operator_token_present: false,
      formal_local_api_default_disabled: true,
      nsis_install_completed: true,
      nsis_uninstall_completed: uninstallCompleted,
    },
    runtime: {
      mode: desktopRuntime.mode,
      topology: "thin-client",
      base_url: runtime.baseUrl,
      base_url_kind: "isolated_loopback_nonpackaged",
      api_profile: "local-dev-synthetic-only",
      operator_token_used: false,
      secret_env_injection_count: 0,
      external_network_request_count: externalRequests.length,
      aws_request_count: 0,
      health_status: runtime.health.status,
    },
    fixture: matterScenario.fixture,
    scenarios: {
      nsis_install_completed: true,
      forest_login_rendered: true,
      signed_in: true,
      profile_populated: true,
      ...matterScenario.scenarios,
      leave_rendered: true,
      payroll_rendered: true,
      restart_session_restored: restoredSession.state === "signed_in",
      nsis_uninstall_completed: uninstallCompleted,
    },
    action_evidence: matterScenario.action_evidence,
    authenticode: {
      valid: authenticodeValid,
      blocker: authenticodeValid ? null : releaseDecision.reason_code,
    },
    screenshots,
    diagnostics: {
      page_error_count: pageErrors.length,
      console_error_count: consoleErrors.length,
      external_request_count: externalRequests.length,
    },
    execution,
    boundaries: {
      private_local_runtime_used: false,
      real_employee_write: false,
      staging_runtime_used: false,
      production_runtime_used: false,
      aws_write: false,
      staging_evidence: false,
      production_evidence: false,
      deployment_evidence: false,
      public_release_claim: false,
      production_go_live_claim: false,
      authenticode_claim: authenticodeValid,
      windows_native_claim: true,
      limitation: FORMAL_PACKAGE_LOOPBACK_QA_LIMITATION,
    },
  };
  const expectedReceipt = {
    expectedPlatform: "windows",
    expectedSourceSha: EXPECTED_SOURCE_SHA,
    expectedSourceTree: sourceIdentity.sourceTree,
    expectedArtifactSha256: primaryArtifactSha256,
    expectedExecutedPackageSha256: installedExecutableSha256,
    expectedManifestSha256: manifestSha256,
  };
  writeFormalPackageLoopbackQaReceipt(RECEIPT_CANDIDATE_PATH, receipt, expectedReceipt, { launcherCapability });
  const nativeValidation = readFormalPackageLoopbackNativeQaReceipt(RECEIPT_CANDIDATE_PATH, {
    launcherCapability,
    repositoryRoot: ROOT,
    evidenceRoot: ARTIFACT_DIR,
    expectedPrivacyCorpusSha256: privacyCorpusSha256,
    privacyValidations: {
      windows_package_directory: packageDirectoryPrivacyValidation,
      windows_package_zip: packageZipPrivacyValidation,
      windows_installer: windowsInstallerPrivacyValidation,
    },
    ...expectedReceipt,
  });
  validateFormalPackageLoopbackNativeQaCapability(nativeValidation, {
    platform: "windows",
    source_sha: EXPECTED_SOURCE_SHA,
    source_tree: sourceIdentity.sourceTree,
    artifact_sha256: primaryArtifactSha256,
    executed_package_sha256: installedExecutableSha256,
    manifest_sha256: manifestSha256,
    privacy_corpus_sha256: privacyCorpusSha256,
    native_verdict: "PASS",
  });
  renameSync(RECEIPT_CANDIDATE_PATH, RECEIPT_PATH);
  process.stdout.write(`${JSON.stringify({
    verdict: receipt.verdict,
    native_verdict: receipt.native_verdict,
    receipt: path.relative(ROOT, RECEIPT_PATH),
    source_sha: receipt.source.revision,
    artifact_sha256: receipt.bindings.package_artifact.sha256,
    people_count: receipt.fixture.people_count,
    scenarios: receipt.scenarios,
    authenticode: {
      valid: receipt.authenticode.valid,
      blocker: receipt.authenticode.blocker,
    },
    screenshots: screenshots.length,
    evidence_scope: receipt.evidence_scope,
  }, null, 2)}\n`);
} catch (error) {
  rmSync(RF13_NATIVE_PRIVACY_RECEIPT_PATH, { force: true });
  if (!existsSync(RFD013_RECEIPT_PATH)) {
    writeJson(RFD013_RECEIPT_PATH, {
      schema_version: WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
      receipt_id: `rfd-tuw-013-${sourceIdentity.sourceSha.slice(0, 12)}-windows-native-fail`,
      tuw_id: "RFD-TUW-013",
      generated_at: new Date().toISOString(),
      native_qa: "FAIL",
      windows_release: "FAIL",
      reason_code: "WINDOWS_NATIVE_QA_EXECUTION_FAILED",
      release: { id: RELEASE_ID, version: VERSION, channel: "formal" },
      source: {
        revision: sourceIdentity.sourceSha,
        source_tree: sourceIdentity.sourceTree,
        source_dirty: false,
      },
      package: null,
      runtime: null,
      identity: null,
      scenarios: null,
      parity: null,
      uninstall: null,
      authenticode: {
        authority_receipt: null,
        signatures: null,
        signature_state: "FAILED_OR_INCOMPLETE",
        signer_binding: null,
      },
      screenshots: [],
      diagnostics: {
        page_error_count: pageErrors.length,
        console_error_count: consoleErrors.length,
        execution_error_count: 1,
      },
      boundaries: {
        native_windows_executed: Boolean(installed),
        public_release_claim: false,
        production_go_live_claim: false,
        historical_receipt_accepted: false,
        certificate_secret_recorded: false,
        authenticode_claim: false,
      },
    });
  }
  throw error;
} finally {
  if (app) await app.close().catch(() => {});
  await runtime?.close().catch(() => {});
  rmSync(RECEIPT_CANDIDATE_PATH, { force: true });
  rmSync(userDataPath, { recursive: true, force: true });
  if (uninstallCompleted) rmSync(installDir, { recursive: true, force: true });
}
