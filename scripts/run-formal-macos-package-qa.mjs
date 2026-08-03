#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
  redactFormalPackageDiagnostic,
  runFormalPackageMatterScenario,
  startFormalPackageLoopbackApi,
  readFormalPackageLoopbackLivePrivacyValidations,
  readFormalPackageLoopbackNativeQaReceipt,
  validateFormalPackageLoopbackNativeQaCapability,
  writeFormalPackageLoopbackQaReceipt,
  writeFormalPackageLoopbackTranscript,
} from "./lib/formal-package-loopback-qa.mjs";
import {
  buildDesktopArtifactPrivacyCorpus,
  createRf13DistPrivacyMemberReceipt,
  desktopArtifactPrivacyCorpusSha256,
  inspectDmgDesktopArtifact,
  inspectExpandedDesktopArtifact,
  inspectZipDesktopArtifact,
  writeDesktopArtifactPrivacyJson,
} from "./lib/matter-desktop-artifact-privacy.mjs";
import { claimFormalPackageLoopbackNativeLauncher } from "./lib/formal-package-loopback-launcher.mjs";
import {
  assertFormalPackageRendererUrl,
  formalPackageRendererUrl,
} from "./lib/formal-package-renderer-url.mjs";

let launcherCapability;
try {
  launcherCapability = claimFormalPackageLoopbackNativeLauncher({ platform: "macos" });
} catch {
  process.stderr.write('{"verdict":"BLOCKED","code":"LAUNCHER_REQUIRED"}\n');
  process.exit(2);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPECTED_SOURCE_SHA = process.env.MATTER_DESKTOP_EXPECTED_SOURCE_SHA;
const VERSION = JSON.parse(readFileSync(path.join(ROOT, "apps/desktop/package.json"), "utf8")).version;
const MAC_MANIFEST_PATH = path.join(ROOT, `apps/desktop/dist/mac/matter-${VERSION}-macos-build-manifest.json`);
const DMG_PATH = path.join(ROOT, `apps/desktop/dist/mac/matter-${VERSION}-macos.dmg`);
const ZIP_PATH = path.join(ROOT, `apps/desktop/dist/mac/matter-${VERSION}-macos.zip`);
const ARTIFACT_DIR = path.resolve(process.env.MATTER_FORMAL_MAC_QA_ARTIFACT_DIR
  ?? path.join(ROOT, "workbook/forest-v0.1.17-integration-evidence/QA-005"));
const RECEIPT_PATH = path.join(ARTIFACT_DIR, "formal-macos-package-qa.json");
const RECEIPT_CANDIDATE_PATH = `${RECEIPT_PATH}.${process.pid}.candidate`;
const TRANSCRIPT_PATH = path.join(ARTIFACT_DIR, "formal-macos-package-qa-transcript.json");
const PRIVACY_ARTIFACT_ROOT = path.join(ARTIFACT_DIR, "rfd-tuw-014-privacy");
const PRIVACY_EVIDENCE_DIR = path.join(PRIVACY_ARTIFACT_ROOT, "evidence");
let processInvocationCount = 0;
let packageLaunchCount = 0;

function invokeNative(executable, args) {
  processInvocationCount += 1;
  return execFileSync(executable, args);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function repositoryRelative(filePath) {
  const relative = path.relative(ROOT, filePath);
  assert.equal(relative.startsWith("..") || path.isAbsolute(relative), false, "formal macOS evidence must remain inside the repository");
  return relative.split(path.sep).join("/");
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
  throw new Error("Formal macOS product window did not become ready");
}

async function launchFormalApp({ executablePath, baseUrl, userDataPath, envPath, observePage }) {
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  const initialUrl = assertFormalPackageRendererUrl(page.url());
  assert.equal(initialUrl.protocol, "matter-app:");
  assert.equal(initialUrl.hostname, "app");
  assert.equal(initialUrl.pathname, "/index.html");
  assert.equal(initialUrl.searchParams.get("desktop"), "1");
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

async function navigate(page, section, view = "people") {
  await page.evaluate((url) => window.location.assign(url), formalPackageRendererUrl(section, view));
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

function mountFormalDmg(mountRoot) {
  invokeNative("/usr/bin/hdiutil", ["attach", "-readonly", "-nobrowse", "-noautoopen", "-mountpoint", mountRoot, DMG_PATH]);
  const appNames = readdirSync(mountRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"))
    .map((entry) => entry.name);
  assert.equal(appNames.length, 1, "formal DMG must contain exactly one top-level app bundle");
  const appBundle = path.join(mountRoot, appNames[0]);
  const resources = path.join(appBundle, "Contents/Resources");
  return Object.freeze({
    appBundle,
    memberPath: appNames[0],
    executable: path.join(appBundle, "Contents/MacOS/matter"),
    resources,
    manifest: path.join(resources, "matter-build-manifest.json"),
    rendererRoot: path.join(resources, "app/src/renderer/web"),
    rendererIndex: path.join(resources, "app/src/renderer/web/index.html"),
    formalMarker: path.join(resources, "matter-formal-release.json"),
    bundledRuntimeRoot: path.join(resources, "app/runtime"),
  });
}

function verifyDistribution(appBundle) {
  invokeNative("/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=2", appBundle]);
  invokeNative("/usr/sbin/spctl", ["--assess", "--type", "execute", "--verbose=4", appBundle]);
  invokeNative("/usr/bin/xcrun", ["stapler", "validate", appBundle]);
  invokeNative("/usr/bin/codesign", ["--verify", "--verbose=2", DMG_PATH]);
  invokeNative("/usr/bin/xcrun", ["stapler", "validate", DMG_PATH]);
  invokeNative("/usr/sbin/spctl", ["--assess", "--type", "install", "--verbose=4", DMG_PATH]);
  invokeNative("/usr/bin/hdiutil", ["verify", DMG_PATH]);
  return {
    app_codesign: "pass",
    app_gatekeeper: "pass",
    app_stapler: "pass",
    dmg_codesign: "pass",
    dmg_gatekeeper: "pass",
    dmg_stapler: "pass",
    dmg_image: "pass",
  };
}

assert.equal(process.platform, "darwin", "formal macOS package QA must run on macOS");
assert.match(EXPECTED_SOURCE_SHA ?? "", /^[0-9a-f]{40}$/u, "MATTER_DESKTOP_EXPECTED_SOURCE_SHA is required");
const sourceIdentity = readDesktopBuildSourceIdentity(ROOT);
assert.equal(sourceIdentity.sourceSha, EXPECTED_SOURCE_SHA, "formal QA HEAD does not match expected source SHA");
assert.equal(sourceIdentity.sourceDirty, false, `formal QA source is dirty: ${sourceIdentity.sourceDirtyPaths.join(", ")}`);
for (const requiredPath of [
  MAC_MANIFEST_PATH,
  DMG_PATH,
  ZIP_PATH,
]) assert.equal(existsSync(requiredPath), true, `missing QA prerequisite: ${path.relative(ROOT, requiredPath)}`);
const primaryArtifactSha256 = sha256File(DMG_PATH);
const transcriptStartedAt = new Date().toISOString();
const privacyCorpus = await buildDesktopArtifactPrivacyCorpus({ repoRoot: ROOT, env: process.env });
const privacyCorpusSha256 = desktopArtifactPrivacyCorpusSha256(privacyCorpus);
const mountRoot = mkdtempSync(path.join(tmpdir(), "matter-formal-macos-dmg-"));
let mounted;
let macManifest;
let macRenderer;
let mountedMemberDigestSha256;
let executedPackageSha256;
let privacyReceiptReferences;
let privacyValidations;
let privacyArtifactRootRelative;
const manifestSha256 = sha256File(MAC_MANIFEST_PATH);

const userDataPath = mkdtempSync(path.join(tmpdir(), "matter-formal-macos-qa-"));
const envPath = path.join(userDataPath, "empty.env");
writeFileSync(envPath, "", "utf8");

let runtime;
let app;
let page;
const pageErrors = [];
const consoleErrors = [];
const externalRequestGroups = [];
const screenshots = [];
let initialSession;
let restoredSession;
let desktopRuntime;
let matterScenario;
try {
  runtime = await startFormalPackageLoopbackApi({
    repoRoot: ROOT,
    stateRoot: path.join(userDataPath, "loopback-api"),
    expectedSourceSha: EXPECTED_SOURCE_SHA,
    expectedSourceTree: sourceIdentity.sourceTree,
  });
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  repositoryRelative(ARTIFACT_DIR);
  mkdirSync(PRIVACY_EVIDENCE_DIR, { recursive: true });
  privacyArtifactRootRelative = repositoryRelative(PRIVACY_ARTIFACT_ROOT);
  for (const generatedPath of [RECEIPT_CANDIDATE_PATH, TRANSCRIPT_PATH]) {
    rmSync(generatedPath, { force: true });
  }
  mounted = mountFormalDmg(mountRoot);
  for (const requiredPath of [
    mounted.executable,
    mounted.rendererIndex,
    mounted.formalMarker,
    mounted.manifest,
  ]) assert.equal(existsSync(requiredPath), true, `missing mounted DMG member: ${path.relative(mountRoot, requiredPath)}`);
  assert.equal(existsSync(mounted.bundledRuntimeRoot), false, "formal DMG app must not bundle a local runtime");
  assert.equal(sha256File(DMG_PATH), primaryArtifactSha256, "formal DMG changed while mounted");
  macManifest = readJson(MAC_MANIFEST_PATH);
  const packagedManifest = readJson(mounted.manifest);
  assertFormalPackageManifest(macManifest, {
    expectedSourceSha: EXPECTED_SOURCE_SHA,
    expectedSourceTree: sourceIdentity.sourceTree,
    expectedPlatform: "darwin",
    expectedVersion: VERSION,
  });
  assert.deepEqual(packagedManifest, macManifest, "embedded and external macOS manifests differ");
  assert.deepEqual(readFileSync(mounted.manifest), readFileSync(MAC_MANIFEST_PATH), "embedded and external macOS manifest bytes differ");
  assert.equal(readJson(mounted.formalMarker).local_api_default, "disabled");
  macRenderer = directoryDigest(mounted.rendererRoot);
  assert.deepEqual(macRenderer, macManifest.renderer);
  executedPackageSha256 = sha256File(mounted.executable);
  const expandedPrivacyInspection = await inspectExpandedDesktopArtifact({
    rootPath: mounted.appBundle,
    buildManifest: macManifest,
    corpus: privacyCorpus,
    displayBase: ROOT,
  });
  mountedMemberDigestSha256 = expandedPrivacyInspection.member_manifest_sha256;
  const dmgArtifact = {
    id: "macos_dmg",
    kind: "dmg_image",
    sha256: primaryArtifactSha256,
    bytes: statSync(DMG_PATH).size,
  };
  const zipArtifact = {
    id: "macos_zip",
    kind: "zip_archive",
    sha256: sha256File(ZIP_PATH),
    bytes: statSync(ZIP_PATH).size,
  };
  const zipPrivacyInspection = await inspectZipDesktopArtifact({
    artifactPath: ZIP_PATH,
    expectedRootName: mounted.memberPath,
    expectedExpandedInspection: expandedPrivacyInspection,
    buildManifest: macManifest,
    corpus: privacyCorpus,
    displayBase: ROOT,
  });
  const dmgPrivacyInspection = await inspectDmgDesktopArtifact({
    artifactPath: DMG_PATH,
    expectedRootName: mounted.memberPath,
    expectedExpandedInspection: expandedPrivacyInspection,
    buildManifest: macManifest,
    corpus: privacyCorpus,
    displayBase: ROOT,
  });
  const privacySidecars = [];
  for (const [artifact, inspection] of [
    [dmgArtifact, dmgPrivacyInspection],
    [zipArtifact, zipPrivacyInspection],
  ]) {
    const memberManifestPath = path.join(PRIVACY_EVIDENCE_DIR, `members-${artifact.id}.json`);
    const memberWrite = await writeDesktopArtifactPrivacyJson(memberManifestPath, expandedPrivacyInspection.member_manifest);
    assert.equal(memberWrite.sha256, mountedMemberDigestSha256);
    const privacyReceipt = createRf13DistPrivacyMemberReceipt({
      receiptId: `rfd-tuw-014-${sourceIdentity.sourceSha.slice(0, 12)}-${artifact.id}-privacy`,
      artifact,
      buildManifest: macManifest,
      inspection,
      memberManifestPath: `${privacyArtifactRootRelative}/evidence/members-${artifact.id}.json`,
    });
    const privacyReceiptPath = path.join(PRIVACY_EVIDENCE_DIR, `privacy-${artifact.id}.json`);
    await writeDesktopArtifactPrivacyJson(privacyReceiptPath, privacyReceipt);
    privacySidecars.push(formalPackageLoopbackFileReference(privacyReceiptPath, {
      rootPath: ARTIFACT_DIR,
      scope: "evidence",
    }));
  }
  privacyReceiptReferences = privacySidecars.sort((left, right) => (
    left.sha256 < right.sha256 ? -1 : left.sha256 > right.sha256 ? 1 : 0
  ));
  const attachDiagnostics = (targetPage) => {
    targetPage.on("pageerror", (error) => pageErrors.push(redactFormalPackageDiagnostic(error)));
    targetPage.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(redactFormalPackageDiagnostic(message.text()));
    });
    externalRequestGroups.push(observeFormalQaExternalRequests(targetPage, runtime.baseUrl));
  };

  ({ app, page } = await launchFormalApp({
    executablePath: mounted.executable,
    baseUrl: runtime.baseUrl,
    userDataPath,
    envPath,
    observePage: attachDiagnostics,
  }));
  await page.locator("[data-login-screen='forest-split'][data-login-intro='complete']").waitFor({ state: "visible", timeout: 30_000 });
  screenshots.push(await screenshot(page, "01-formal-login", "[data-login-screen='forest-split']"));
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
  const profileText = await profile.innerText();
  for (const expected of [runtime.account.display_name, runtime.account.email, runtime.fixture.roster.members[0].title]) {
    assert.match(profileText, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")));
  }
  screenshots.push(await screenshot(page, "02-formal-synthetic-profile", "[data-user-profile-surface='my-profile']"));

  matterScenario = await runFormalPackageMatterScenario({
    page,
    runtime,
    navigate: (section, view) => navigate(page, section, view),
    capture: (name, selector) => screenshot(page, name, selector),
  });
  screenshots.push(...matterScenario.screenshots);

  await navigate(page, "people-leave-usage");
  const leave = page.locator("#people-leave-usage");
  await leave.waitFor({ state: "visible", timeout: 20_000 });
  assert.match(await leave.innerText(), /휴가 사용 내역/u);
  screenshots.push(await screenshot(page, "07-formal-leave", "#people-leave-usage"));

  await activateStepUp(page, runtime);
  await navigate(page, "people-payroll");
  const payroll = page.locator("#people-payroll");
  await payroll.waitFor({ state: "visible", timeout: 20_000 });
  await payroll.locator(".payroll-summary-strip").waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await payroll.locator(".live-data-error").count(), 0);
  screenshots.push(await screenshot(page, "08-formal-payroll", "#people-payroll"));

  await app.close();
  app = null;
  ({ app, page } = await launchFormalApp({
    executablePath: mounted.executable,
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
  await navigate(page, "matter-work", "matters");
  await page.getByText("[RFD-014] package-created task", { exact: true }).first().waitFor({ state: "visible", timeout: 20_000 });
  screenshots.push(await screenshot(page, "09-formal-restart-matter", '[data-matter-small-firm-screen="matter-work"]'));
  await app.close();
  app = null;

  const externalRequests = externalRequestGroups.flat();
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(externalRequests, []);
  const distribution = verifyDistribution(mounted.appBundle);
  assert.equal(sha256File(DMG_PATH), primaryArtifactSha256, "formal DMG changed after execution");
  assert.equal(sha256File(mounted.executable), executedPackageSha256, "mounted executable changed after execution");
  const postExecutionMountedInspection = await inspectExpandedDesktopArtifact({
    rootPath: mounted.appBundle,
    buildManifest: macManifest,
    corpus: privacyCorpus,
    displayBase: ROOT,
  });
  assert.equal(
    postExecutionMountedInspection.member_manifest_sha256,
    mountedMemberDigestSha256,
    "mounted DMG app members changed during execution",
  );
  const dmgReference = formalPackageLoopbackFileReference(DMG_PATH, { rootPath: ROOT, scope: "repository" });
  const zipReference = formalPackageLoopbackFileReference(ZIP_PATH, { rootPath: ROOT, scope: "repository" });
  const manifestReference = formalPackageLoopbackFileReference(MAC_MANIFEST_PATH, { rootPath: ROOT, scope: "repository" });
  const requestRows = runtime.requests.snapshot();
  const execution = {
    classification: "ACTUAL_NATIVE_RUNNER",
    runner_capability: "native-macos-dmg",
    process_invocation_count: processInvocationCount,
    package_launch_count: packageLaunchCount,
    adapter_invocation_count: matterScenario.adapter_invocation_count,
  };
  const transcript = {
    schema_version: FORMAL_PACKAGE_LOOPBACK_TRANSCRIPT_SCHEMA,
    tuw_id: FORMAL_PACKAGE_LOOPBACK_QA_TUW,
    platform: "macos",
    started_at: transcriptStartedAt,
    finished_at: new Date().toISOString(),
    source: {
      revision: sourceIdentity.sourceSha,
      source_tree: sourceIdentity.sourceTree,
    },
    artifacts: {
      package_artifact_sha256: primaryArtifactSha256,
      executed_package_sha256: executedPackageSha256,
      executed_member_digest_sha256: mountedMemberDigestSha256,
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
    platform: "macos",
    sourceSha: sourceIdentity.sourceSha,
    sourceTree: sourceIdentity.sourceTree,
    artifactSha256: primaryArtifactSha256,
    executedPackageSha256,
    manifestSha256,
    executedMemberDigestSha256: mountedMemberDigestSha256,
    privacyReceiptSha256s: privacyReceiptReferences.map(({ sha256 }) => sha256),
  });
  const transcriptReference = formalPackageLoopbackFileReference(TRANSCRIPT_PATH, {
    rootPath: ARTIFACT_DIR,
    scope: "evidence",
  });
  const receipt = {
    schema_version: FORMAL_PACKAGE_LOOPBACK_QA_SCHEMA,
    tuw_id: FORMAL_PACKAGE_LOOPBACK_QA_TUW,
    platform: "macos",
    generated_at: new Date().toISOString(),
    verdict: "PASS",
    native_verdict: "PASS",
    evidence_scope: "local_exact_source_loopback_only",
    source: {
      revision: sourceIdentity.sourceSha,
      source_tree: sourceIdentity.sourceTree,
      source_dirty: false,
      renderer: macRenderer,
    },
    bindings: {
      package_artifact: dmgReference,
      executed_package: {
        kind: "macos_dmg_member_executable",
        member_path: `${mounted.memberPath}/Contents/MacOS/matter`,
        sha256: executedPackageSha256,
        bytes: statSync(mounted.executable).size,
        member_digest_sha256: mountedMemberDigestSha256,
      },
      package_manifest: {
        ...manifestReference,
        embedded_member_path: `${mounted.memberPath}/Contents/Resources/matter-build-manifest.json`,
        source_sha: macManifest.source_sha,
        source_tree: macManifest.source_tree,
        renderer_sha256: macManifest.renderer.sha256,
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
      all_source_sha_equal: macManifest.source_sha === runtime.source_sha && runtime.source_sha === sourceIdentity.sourceSha,
    },
    package: {
      channel: macManifest.channel,
      app_id: macManifest.app_id,
      bundle_member_path: mounted.memberPath,
      artifacts: [
        { role: "dmg", ...dmgReference },
        { role: "zip", ...zipReference },
        { role: "manifest", ...manifestReference },
      ],
      thin_client: macManifest.policy.thin_client,
      runtime_data_mode: macManifest.effective_runtime_mode,
      runtime_data_class: macManifest.runtime_data_class,
      bundled_local_api_present: false,
      private_local_runtime_present: false,
      operator_token_present: false,
      formal_local_api_default_disabled: true,
      distribution,
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
      forest_login_rendered: true,
      signed_in: true,
      profile_populated: true,
      ...matterScenario.scenarios,
      leave_rendered: true,
      payroll_rendered: true,
      restart_session_restored: restoredSession.state === "signed_in",
    },
    action_evidence: matterScenario.action_evidence,
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
      windows_native_claim: false,
      authenticode_claim: false,
      limitation: FORMAL_PACKAGE_LOOPBACK_QA_LIMITATION,
    },
    authenticode: null,
  };
  const expectedReceipt = {
    expectedPlatform: "macos",
    expectedSourceSha: EXPECTED_SOURCE_SHA,
    expectedSourceTree: sourceIdentity.sourceTree,
    expectedArtifactSha256: primaryArtifactSha256,
    expectedExecutedPackageSha256: executedPackageSha256,
    expectedManifestSha256: manifestSha256,
  };
  writeFormalPackageLoopbackQaReceipt(RECEIPT_CANDIDATE_PATH, receipt, expectedReceipt, { launcherCapability });
  privacyValidations = await readFormalPackageLoopbackLivePrivacyValidations(RECEIPT_CANDIDATE_PATH, {
    launcherCapability,
    repositoryRoot: ROOT,
    evidenceRoot: ARTIFACT_DIR,
    expectedPlatform: "macos",
    expectedPrivacyArtifactRoot: privacyArtifactRootRelative,
    corpus: privacyCorpus,
    executedRootPath: mounted.appBundle,
  });
  const nativeValidation = readFormalPackageLoopbackNativeQaReceipt(RECEIPT_CANDIDATE_PATH, {
    launcherCapability,
    repositoryRoot: ROOT,
    evidenceRoot: ARTIFACT_DIR,
    executedPackagePath: mounted.executable,
    expectedPrivacyArtifactRoot: privacyArtifactRootRelative,
    expectedPrivacyCorpusSha256: privacyCorpusSha256,
    privacyValidations,
    ...expectedReceipt,
  });
  validateFormalPackageLoopbackNativeQaCapability(nativeValidation, {
    platform: "macos",
    source_sha: EXPECTED_SOURCE_SHA,
    source_tree: sourceIdentity.sourceTree,
    artifact_sha256: primaryArtifactSha256,
    executed_package_sha256: executedPackageSha256,
    manifest_sha256: manifestSha256,
    privacy_corpus_sha256: privacyCorpusSha256,
    verdict: "PASS",
  });
  renameSync(RECEIPT_CANDIDATE_PATH, RECEIPT_PATH);
  process.stdout.write(`${JSON.stringify({
    verdict: receipt.verdict,
    native_verdict: receipt.native_verdict,
    receipt: repositoryRelative(RECEIPT_PATH),
    source_sha: receipt.source.revision,
    artifact_sha256: receipt.bindings.package_artifact.sha256,
    people_count: receipt.fixture.people_count,
    scenarios: receipt.scenarios,
    screenshots: screenshots.length,
    evidence_scope: receipt.evidence_scope,
  }, null, 2)}\n`);
} finally {
  if (app) await app.close().catch(() => {});
  await runtime?.close().catch(() => {});
  rmSync(RECEIPT_CANDIDATE_PATH, { force: true });
  rmSync(userDataPath, { recursive: true, force: true });
  if (mounted) invokeNative("/usr/bin/hdiutil", ["detach", mountRoot]);
  rmSync(mountRoot, { recursive: true, force: true });
}
