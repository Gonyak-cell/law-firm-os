import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  auditInternalUnsignedPackagePaths,
  assertInternalUnsignedPackage,
  assertInternalUnsignedPackagePaths,
  createInternalUnsignedBuilderEnvironment,
  listInternalUnsignedPackageFiles,
} from "../lib/matter-desktop-internal-unsigned.mjs";

const MARKER = "resources/matter-internal-unsigned-release.json";

test("internal-unsigned builder disables identity discovery and rejects every signing input", () => {
  assert.deepEqual(createInternalUnsignedBuilderEnvironment({ PATH: "/tools" }), {
    PATH: "/tools",
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
  });
  assert.deepEqual(createInternalUnsignedBuilderEnvironment({
    PATH: "/tools",
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
  }), {
    PATH: "/tools",
    CSC_IDENTITY_AUTO_DISCOVERY: "false",
  });
  for (const name of [
    "CSC_LINK",
    "CSC_KEY_PASSWORD",
    "WIN_CSC_LINK",
    "WIN_CSC_KEY_PASSWORD",
    "SIGNTOOL_PATH",
    "MATTER_DESKTOP_AUTHENTICODE",
  ]) {
    assert.throws(
      () => createInternalUnsignedBuilderEnvironment({ [name]: "configured" }),
      new RegExp(name, "u"),
    );
  }
  assert.throws(
    () => createInternalUnsignedBuilderEnvironment({ CSC_IDENTITY_AUTO_DISCOVERY: "true" }),
    /disable signing identity auto-discovery/u,
  );
});

test("internal-unsigned package path audit accepts an app without local runtime or seed data", () => {
  const result = assertInternalUnsignedPackagePaths([
    "matter.exe",
    MARKER,
    "resources/matter-build-manifest.json",
    "resources/app/src/main/main.js",
    "resources/app/src/renderer/web/index.html",
    "resources/classic-outlook/AMIC.OS.Vault.Outlook.dll",
  ]);

  assert.equal(result.valid, true);
  assert.equal(result.file_count, 6);
  assert.equal(result.bundled_local_api, false);
  assert.equal(result.registration_seed_included, false);
});

test("internal-unsigned package path audit rejects opaque archives, runtime, private data, and credentials", () => {
  const result = auditInternalUnsignedPackagePaths([
    MARKER,
    "resources/app.asar",
    "resources/app/runtime/apps/api/src/server.js",
    "resources/app/src/hrx-member-roster-source-of-truth.json",
    "resources/app/src/hrx-member-contact-source-of-truth.json",
    "resources/app/src/hrx-member-photos/member.png",
    "resources/app/src/matter-vault-user-registration-seed.json",
    "resources/app/.env.production",
    "resources/app/signing-key.pfx",
  ]);

  assert.equal(result.valid, false);
  assert.equal(result.forbidden_path_count, 8);
  assert.equal(result.bundled_local_api, true);
  assert.equal(result.roster_included, true);
  assert.equal(result.contacts_included, true);
  assert.equal(result.photos_included, true);
  assert.equal(result.registration_seed_included, true);
  assert.equal(result.credential_file_included, true);
  assert.equal(result.private_key_file_included, true);
  assert.equal(result.opaque_asar_included, true);
  assert.deepEqual(result.findings.map(({ code }) => code), [
    "OPAQUE_ASAR_NOT_SCANNABLE",
    "CREDENTIAL_FILE_INCLUDED",
    "LOCAL_API_RUNTIME_INCLUDED",
    "PRIVATE_KEY_FILE_INCLUDED",
    "PRIVATE_CONTACTS_INCLUDED",
    "PRIVATE_PHOTOS_INCLUDED",
    "PRIVATE_ROSTER_INCLUDED",
    "REGISTRATION_SEED_INCLUDED",
  ]);
  assert.throws(
    () => assertInternalUnsignedPackagePaths([MARKER, "resources/app/runtime/apps/api/src/server.js"]),
    /LOCAL_API_RUNTIME_INCLUDED/,
  );
});

test("internal-unsigned package file listing rejects symlinks and produces portable paths", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-internal-package-"));
  try {
    await mkdir(path.join(root, "resources"), { recursive: true });
    await writeFile(path.join(root, "matter.exe"), "fixture");
    await writeFile(path.join(root, MARKER), "{}\n");

    assert.deepEqual(await listInternalUnsignedPackageFiles(root), [
      "matter.exe",
      MARKER,
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("internal-unsigned package content audit rejects renamed roster, contact, photo, or seed bytes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-internal-package-content-"));
  const privateRoot = await mkdtemp(path.join(tmpdir(), "amic-os-private-source-content-"));
  try {
    await mkdir(path.join(root, "resources", "app", "assets"), { recursive: true });
    await writeFile(path.join(root, "matter.exe"), "fixture-executable");
    await writeFile(path.join(root, MARKER), "{}\n");
    const sourcePath = path.join(privateRoot, "registration.json");
    await writeFile(sourcePath, '{"registered_user":"private"}\n');
    await writeFile(
      path.join(root, "resources", "app", "assets", "renamed-public.json"),
      '{"registered_user":"private"}\n',
    );

    await assert.rejects(
      assertInternalUnsignedPackage({
        rootPath: root,
        privateSourcePaths: { registrationSeed: sourcePath },
      }),
      /registrationSeed:resources\/app\/assets\/renamed-public\.json/u,
    );
    await writeFile(
      path.join(root, "resources", "app", "assets", "renamed-public.json"),
      '{"public_fixture":true}\n',
    );
    const result = await assertInternalUnsignedPackage({
      rootPath: root,
      privateSourcePaths: { registrationSeed: sourcePath },
    });
    assert.equal(result.valid, true);
    assert.equal(result.private_source_file_count, 1);
    assert.equal(result.private_source_digest_count, 1);
    assert.equal(result.private_source_content_match_count, 0);
    assert.equal(result.private_source_content_scan, "verified");
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("both Windows builders wire the internal-unsigned provenance and private-data gates", async () => {
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const packageBuilder = await readFile(
    path.join(repoRoot, "scripts", "build-matter-desktop-win.mjs"),
    "utf8",
  );
  const installerBuilder = await readFile(
    path.join(repoRoot, "scripts", "build-matter-desktop-win-installer.mjs"),
    "utf8",
  );

  for (const source of [packageBuilder, installerBuilder]) {
    assert.match(source, /assertDesktopInternalUnsignedBuildProvenance/u);
    assert.match(source, /await assertInternalUnsignedPackage/u);
    assert.match(source, /desktopLocalApiSourcePaths/u);
    assert.match(source, /DESKTOP_INTERNAL_UNSIGNED_MARKER_NAME/u);
  }
  assert.match(packageBuilder, /includeLocalRuntime: !formalRelease && !internalUnsignedDistribution/u);
  assert.match(packageBuilder, /explicit private Windows build receipt path/u);
  assert.match(installerBuilder, /createInternalUnsignedBuilderEnvironment/u);
  assert.match(installerBuilder, /require a Windows host for native NotSigned verification/u);
  assert.match(installerBuilder, /explicit private Windows build receipt path/u);
  assert.match(installerBuilder, /runAfterUnsignedMatterDesktopTechnicalCandidateInspection/u);
  assert.match(installerBuilder, /windows_authenticode_not_signed_verified/u);
});

test("public-repository Windows QA builds internal-unsigned but uploads synthetic evidence only", async () => {
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const workflow = await readFile(
    path.join(repoRoot, ".github", "workflows", "windows-dashboard-package-qa.yml"),
    "utf8",
  );

  assert.match(
    workflow,
    /actions\/checkout@11bd71901bbe5b1630ceea73d27597364c9af683/u,
  );
  assert.match(
    workflow,
    /actions\/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020/u,
  );
  assert.match(
    workflow,
    /actions\/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02/u,
  );
  assert.match(workflow, /MATTER_DESKTOP_DISTRIBUTION_PROFILE: internal-unsigned/u);
  assert.match(workflow, /MATTER_DESKTOP_RELEASE_CHANNEL: internal/u);
  assert.match(workflow, /CSC_IDENTITY_AUTO_DISCOVERY: "false"/u);
  assert.match(workflow, /scripts\/validate-amic-os-vault-single-install-source\.mjs/u);
  assert.match(workflow, /scripts\/validate-matter-desktop-file-bridge\.mjs/u);
  assert.match(
    workflow,
    /"MATTER_DESKTOP_EXPECTED_SOURCE_SHA=\$sourceSha" \| Out-File -FilePath \$env:GITHUB_ENV/u,
  );
  assert.match(
    workflow,
    /"MATTER_DESKTOP_EXPECTED_SOURCE_TREE=\$sourceTree" \| Out-File -FilePath \$env:GITHUB_ENV/u,
  );
  assert.match(workflow, /MATTER_DASHBOARD_PACKAGE_QA_ARTIFACT_DIR: \$\{\{ runner\.temp \}\}/u);
  assert.match(workflow, /name: Upload synthetic-only Windows QA evidence/u);
  assert.doesNotMatch(workflow, /Upload internal Windows installer evidence/u);
  assert.doesNotMatch(workflow, /apps\/desktop\/dist\/.*win-x64\.exe/u);
  assert.doesNotMatch(workflow, /apps\/desktop\/dist\/.*\.blockmap/u);
});
