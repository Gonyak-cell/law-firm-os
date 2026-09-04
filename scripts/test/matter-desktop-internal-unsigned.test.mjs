import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  auditInternalUnsignedPackagePaths,
  assertInternalUnsignedPackage,
  assertInternalUnsignedPackagePaths,
  createInternalUnsignedBuilderEnvironment,
  createInternalUnsignedUpdateTrustManifest,
  listInternalUnsignedPackageFiles,
} from "../lib/matter-desktop-internal-unsigned.mjs";

const MARKER = "resources/matter-internal-unsigned-release.json";
const TRUST = "resources/matter-internal-update-trust.json";

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

test("internal-unsigned builder embeds only a canonical Ed25519 public trust anchor", () => {
  const { publicKey } = generateKeyPairSync("ed25519");
  const encoded = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const manifest = createInternalUnsignedUpdateTrustManifest({
    MATTER_INTERNAL_UPDATE_PUBLIC_KEY_SPKI_BASE64: encoded,
  });
  assert.equal(manifest.key_id, "matter-internal-update-key-v1");
  assert.equal(manifest.public_key_spki_base64, encoded);
  assert.equal(manifest.private_key_material_included, false);
  assert.equal(manifest.public_release_allowed, false);
  assert.throws(
    () => createInternalUnsignedUpdateTrustManifest({}),
    /canonical Ed25519 public-key SPKI/u,
  );
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
  assert.throws(
    () => createInternalUnsignedUpdateTrustManifest({
      MATTER_INTERNAL_UPDATE_PUBLIC_KEY_SPKI_BASE64:
        rsa.publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    }),
    /must be Ed25519/u,
  );
});

test("internal-unsigned package path audit accepts an app without local runtime or seed data", () => {
  const result = assertInternalUnsignedPackagePaths([
    "matter.exe",
    MARKER,
    TRUST,
    "resources/matter-build-manifest.json",
    "resources/app/src/main/main.js",
    "resources/app/src/renderer/web/index.html",
    "resources/classic-outlook/AMIC.OS.Vault.Outlook.dll",
  ]);

  assert.equal(result.valid, true);
  assert.equal(result.file_count, 7);
  assert.equal(result.bundled_local_api, false);
  assert.equal(result.registration_seed_included, false);
});

test("internal-unsigned package path audit rejects opaque archives, runtime, private data, and credentials", () => {
  const result = auditInternalUnsignedPackagePaths([
    MARKER,
    TRUST,
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
    () => assertInternalUnsignedPackagePaths([
      MARKER,
      TRUST,
      "resources/app/runtime/apps/api/src/server.js",
    ]),
    /LOCAL_API_RUNTIME_INCLUDED/,
  );
});

test("internal-unsigned package file listing rejects symlinks and produces portable paths", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-internal-package-"));
  try {
    await mkdir(path.join(root, "resources"), { recursive: true });
    await writeFile(path.join(root, "matter.exe"), "fixture");
    await writeFile(path.join(root, MARKER), "{}\n");
    await writeFile(path.join(root, TRUST), "{}\n");

    assert.deepEqual(await listInternalUnsignedPackageFiles(root), [
      "matter.exe",
      MARKER,
      TRUST,
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
    await writeFile(path.join(root, TRUST), "{}\n");
    const sourcePath = path.join(privateRoot, "registration.json");
    await writeFile(
      sourcePath,
      '{"tenant_id":"tenant-private","users":[{"display_name":"Private Person","email":"private@example.test","user_id":"user-private"}]}\n',
    );
    await writeFile(
      path.join(root, "resources", "app", "assets", "renamed-public.json"),
      '{"tenant_id":"tenant-private","users":[{"display_name":"Private Person","email":"private@example.test","user_id":"user-private"}]}\n',
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
    assert.equal(result.private_source_protected_value_count, 4);
    assert.equal(result.private_source_value_match_count, 0);
    assert.equal(result.private_source_value_scan, "verified");
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("internal-unsigned package content audit rejects protected values repackaged into different bytes", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "amic-os-internal-package-values-"));
  const privateRoot = await mkdtemp(path.join(tmpdir(), "amic-os-private-source-values-"));
  try {
    await mkdir(path.join(root, "resources", "app", "assets"), { recursive: true });
    await writeFile(path.join(root, "matter.exe"), "fixture-executable");
    await writeFile(path.join(root, MARKER), "{}\n");
    await writeFile(path.join(root, TRUST), "{}\n");
    const sourcePath = path.join(privateRoot, "registration.json");
    await writeFile(
      sourcePath,
      '{"tenant_id":"tenant-private","users":[{"display_name":"Private Person","email":"private@example.test","user_id":"user-private"}]}\n',
    );
    await writeFile(
      path.join(root, "resources", "app", "assets", "repacked-public.bin"),
      Buffer.concat([Buffer.alloc(65_530, 0x78), Buffer.from("Private Person")]),
    );

    await assert.rejects(
      assertInternalUnsignedPackage({
        rootPath: root,
        privateSourcePaths: { registrationSeed: sourcePath },
      }),
      (error) => {
        assert.match(
          error.message,
          /registrationSeed:resources\/app\/assets\/repacked-public\.bin:1/u,
        );
        assert.equal(error.message.includes("Private Person"), false);
        assert.equal(error.message.includes("private@example.test"), false);
        assert.equal(error.message.includes("tenant-private"), false);
        return true;
      },
    );
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
    assert.match(source, /createInternalUnsignedUpdateTrustManifest/u);
  }
  assert.match(packageBuilder, /includeLocalRuntime: !formalRelease && !internalUnsignedDistribution/u);
  assert.match(packageBuilder, /explicit private Windows build receipt path/u);
  assert.match(installerBuilder, /createInternalUnsignedBuilderEnvironment/u);
  assert.match(installerBuilder, /require a Windows host for native NotSigned verification/u);
  assert.match(installerBuilder, /explicit private Windows build receipt path/u);
  assert.match(installerBuilder, /explicit private Windows build result path/u);
  assert.match(installerBuilder, /MATTER_DESKTOP_WINDOWS_BUILD_RESULT_PATH/u);
  assert.match(installerBuilder, /runAfterUnsignedMatterDesktopTechnicalCandidateInspection/u);
  assert.match(installerBuilder, /windows_authenticode_not_signed_verified/u);
});

test("public-repository Windows QA builds internal-unsigned but uploads synthetic evidence only", async () => {
  const repoRoot = path.resolve(import.meta.dirname, "../..");
  const [workflow, privacyGate] = await Promise.all([
    readFile(
      path.join(repoRoot, ".github", "workflows", "windows-dashboard-package-qa.yml"),
      "utf8",
    ),
    readFile(
      path.join(repoRoot, "scripts", "validate-public-renderer-no-hrx-roster-pii.mjs"),
      "utf8",
    ),
  ]);

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
  assert.match(workflow, /Create an ephemeral public update trust anchor for synthetic package QA/u);
  assert.match(workflow, /generateKeyPairSync\('ed25519'\)/u);
  assert.match(workflow, /MATTER_INTERNAL_UPDATE_PUBLIC_KEY_SPKI_BASE64=\$publicKey/u);
  assert.match(workflow, /Run value-based roster, registration, and photo privacy gate/u);
  assert.match(workflow, /npm run public-renderer:pii:validate/u);
  assert.match(workflow, /apps\/api\/src\/hrx-member-photos\/\*\*/u);
  assert.match(workflow, /matter-vault-user-registration-seed\.json/u);
  assert.match(workflow, /validate-public-renderer-no-hrx-roster-pii\.mjs/u);
  assert.match(privacyGate, /matter-vault-user-registration-seed\.json/u);
  assert.match(privacyGate, /registrationProtectedKeys/u);
  assert.match(privacyGate, /registration_account_count/u);
  assert.match(privacyGate, /protected_values_printed: false/u);
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
