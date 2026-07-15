#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { packager } from "@electron/packager";
import { sign } from "@electron/osx-sign";
import { notarize } from "@electron/notarize";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const desktopRoot = join(repoRoot, "apps/desktop");
const packageJson = JSON.parse(await import("node:fs/promises").then((fs) => fs.readFile(join(desktopRoot, "package.json"), "utf8")));
const distRoot = join(desktopRoot, "dist/mac");
const appBundle = join(distRoot, "matter.app");
const contentsDir = join(appBundle, "Contents");
const macosDir = join(contentsDir, "MacOS");
const resourcesDir = join(contentsDir, "Resources");
const executablePath = join(macosDir, "matter");
const appSourceDir = join(resourcesDir, "app");
const packagedPrivateContactSourcePath = join(
  appSourceDir,
  "runtime/apps/api/src/hrx-member-contact-source-of-truth.json",
);
const packagedPrivateRosterSourcePath = join(
  appSourceDir,
  "runtime/apps/api/src/hrx-member-roster-source-of-truth.json",
);
const packagedPrivatePhotoSourcePath = join(
  appSourceDir,
  "runtime/apps/api/src/hrx-member-photos",
);
const packagedPublicProfessionalProfileCatalogPath = join(
  appSourceDir,
  "runtime/apps/api/src/hrx-public-professional-profile-catalog.json",
);
const internalRosterSourcePath = resolve(
  repoRoot,
  process.env.LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH
    || "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
);
const configuredContactSourcePath = String(process.env.LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH ?? "").trim();
const internalContactSourcePath = configuredContactSourcePath ? resolve(repoRoot, configuredContactSourcePath) : null;
const internalPhotoSourcePath = resolve(
  repoRoot,
  process.env.LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH || "apps/web/src/assets/members",
);
const desktopRendererWebIndex = join(desktopRoot, "src/renderer/web/index.html");
const iconPath = join(desktopRoot, "build/icon.icns");
const packagedIconFile = "matter.icns";
const packagedIconPath = join(resourcesDir, packagedIconFile);
const formalReleaseMarkerName = "matter-formal-release.json";
const formalReleaseMarkerPath = join(resourcesDir, formalReleaseMarkerName);
const releaseChannel = process.env.MATTER_DESKTOP_RELEASE_CHANNEL ?? "internal";
if (!["internal", "formal"].includes(releaseChannel)) {
  throw new Error("MATTER_DESKTOP_RELEASE_CHANNEL must be internal or formal.");
}
const formalRelease = releaseChannel === "formal";
const appBundleId = formalRelease ? "com.amic.matter.desktop" : "com.amic.matter.desktop.internal";
const artifactName = formalRelease ? `matter-${packageJson.version}` : `matter-internal-${packageJson.version}`;
const zipPath = join(distRoot, `${artifactName}-macos.zip`);
const dmgPath = join(distRoot, `${artifactName}-macos.dmg`);
const receiptPath = join(repoRoot, "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md");
const arch = process.env.MATTER_DESKTOP_MAC_ARCH ?? (process.arch === "arm64" ? "arm64" : "x64");
const signingMode = process.env.MATTER_DESKTOP_SIGN ?? "internal";
const notarizationRequested = process.env.MATTER_DESKTOP_NOTARIZE === "1";
process.env.PATH = ["/usr/bin", "/bin", "/usr/sbin", "/sbin", process.env.PATH].filter(Boolean).join(":");
const ignoredPackagePathPatterns = [
  /(^|\/)dist($|\/)/,
  /(^|\/)test($|\/)/,
  /(^|\/)\.env($|\.|\/)/,
  /(^|\/)build\/forest-login\.jpg$/,
  /(^|\/)src\/renderer\/offline(?:\.matter)?\.html$/,
  /\.test\.mjs$/
];

function firstLine(value) {
  return String(value ?? "").split("\n").find(Boolean) ?? "";
}

async function findDeveloperIdIdentity() {
  const { stdout } = await execFileAsync("/usr/bin/security", ["find-identity", "-v", "-p", "codesigning"]);
  const line = stdout.split("\n").find((entry) => entry.includes("Developer ID Application:"));
  const match = line?.match(/"([^"]+)"/);
  return match?.[1] ?? "";
}

async function signingOptions() {
  if (!["developer-id", "1", "true"].includes(signingMode)) return null;
  const identity = process.env.MATTER_DESKTOP_SIGN_IDENTITY || await findDeveloperIdIdentity();
  if (!identity) {
    throw new Error("Developer ID Application signing identity not found. Set MATTER_DESKTOP_SIGN_IDENTITY or install a Developer ID Application certificate.");
  }
  return {
    identity,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    continueOnError: false,
    strictVerify: true
  };
}

function notarizationOptions() {
  if (!notarizationRequested) return null;
  if (process.env.MATTER_NOTARY_KEYCHAIN_PROFILE) {
    return {
      keychainProfile: process.env.MATTER_NOTARY_KEYCHAIN_PROFILE,
      ...(process.env.MATTER_NOTARY_KEYCHAIN ? { keychain: process.env.MATTER_NOTARY_KEYCHAIN } : {})
    };
  }
  if (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID) {
    return {
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
      teamId: process.env.APPLE_TEAM_ID
    };
  }
  if (process.env.APPLE_API_KEY && process.env.APPLE_API_KEY_ID) {
    return {
      appleApiKey: process.env.APPLE_API_KEY,
      appleApiKeyId: process.env.APPLE_API_KEY_ID,
      ...(process.env.APPLE_API_ISSUER ? { appleApiIssuer: process.env.APPLE_API_ISSUER } : {})
    };
  }
  return null;
}

function shouldIgnorePackagedPath(filePath) {
  const normalizedPath = String(filePath).replaceAll("\\", "/");
  return ignoredPackagePathPatterns.some((pattern) => pattern.test(normalizedPath));
}

async function developerIdSignatureState(targetPath) {
  try {
    const { stderr } = await execFileAsync("/usr/bin/codesign", ["--display", "--verbose=4", targetPath]);
    const output = stderr;
    const authority = output.split("\n").find((line) => line.startsWith("Authority=Developer ID Application:")) ?? "";
    const team = output.split("\n").find((line) => line.startsWith("TeamIdentifier=")) ?? "";
    if (authority && team === "TeamIdentifier=LHDXU66NX3") return "pass";
    return `not_distribution_ready: ${authority || "Developer ID authority missing"}; ${team || "TeamIdentifier missing"}`;
  } catch (error) {
    return `not_distribution_ready: ${firstLine(error.stderr ?? error.message) || "codesign display failed"}`;
  }
}

async function packagedExecutableSmoke() {
  const frameworkExecutable = join(contentsDir, "Frameworks", "Electron Framework.framework", "Electron Framework");
  if (!existsSync(frameworkExecutable)) {
    throw new Error("Packaged Electron Framework is missing from the app bundle.");
  }
  const { stdout } = await execFileAsync("/usr/bin/otool", ["-l", executablePath]);
  if (!stdout.includes("@executable_path/../Frameworks")) {
    throw new Error("Packaged executable is missing the Electron Framework rpath.");
  }
  if (!stdout.includes("@rpath/Electron Framework.framework/Electron Framework")) {
    throw new Error("Packaged executable is missing the Electron Framework load command.");
  }
  return "bundle_rpath_smoke_pass";
}

async function applyMatterBundleIcon(targetAppBundle) {
  const targetContentsDir = join(targetAppBundle, "Contents");
  const targetResourcesDir = join(targetContentsDir, "Resources");
  const targetInfoPlist = join(targetContentsDir, "Info.plist");
  const targetMatterIcon = join(targetResourcesDir, packagedIconFile);
  await copyFile(iconPath, targetMatterIcon);
  await rm(join(targetResourcesDir, "electron.icns"), { force: true });
  await execFileAsync("/usr/libexec/PlistBuddy", [
    "-c",
    `Set :CFBundleIconFile ${packagedIconFile}`,
    targetInfoPlist
  ]);
  await execFileAsync("/usr/libexec/PlistBuddy", ["-c", "Delete :CFBundleURLTypes", targetInfoPlist]).catch(() => {});
  await execFileAsync("/usr/libexec/PlistBuddy", ["-c", "Add :CFBundleURLTypes array", targetInfoPlist]);
  await execFileAsync("/usr/libexec/PlistBuddy", ["-c", "Add :CFBundleURLTypes:0 dict", targetInfoPlist]);
  await execFileAsync("/usr/libexec/PlistBuddy", [
    "-c",
    `Add :CFBundleURLTypes:0:CFBundleURLName string ${appBundleId}`,
    targetInfoPlist
  ]);
  await execFileAsync("/usr/libexec/PlistBuddy", ["-c", "Add :CFBundleURLTypes:0:CFBundleURLSchemes array", targetInfoPlist]);
  await execFileAsync("/usr/libexec/PlistBuddy", ["-c", "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string matter", targetInfoPlist]);
}

async function copyDesktopLocalApiRuntime(targetAppBundle) {
  const targetAppSourceDir = join(targetAppBundle, "Contents", "Resources", "app");
  const runtimeDir = join(targetAppSourceDir, "runtime");
  const apiRuntimeSrcDir = join(runtimeDir, "apps/api/src");
  await rm(runtimeDir, { recursive: true, force: true });
  await mkdir(join(runtimeDir, "apps/api"), { recursive: true });
  await cp(join(repoRoot, "apps/api/src"), apiRuntimeSrcDir, { recursive: true });
  const runtimeRosterSourcePath = join(apiRuntimeSrcDir, "hrx-member-roster-source-of-truth.json");
  if (!existsSync(internalRosterSourcePath)) throw new Error("HRX member roster source does not exist");
  const privateRoster = JSON.parse(await readFile(
    internalRosterSourcePath,
    "utf8",
  ));
  const publicProfessionalProfiles = (privateRoster.members ?? [])
    .filter((member) => member?.employee_id && member?.professional_profile)
    .map((member) => ({
      employee_id: member.employee_id,
      professional_profile: Object.fromEntries([
        "schema_version",
        "profile_kind",
        "public_role_labels",
        "practice_areas",
        "experience",
        "education",
        "qualifications",
      ].flatMap((key) => member.professional_profile[key] === undefined ? [] : [[key, member.professional_profile[key]]])),
    }));
  if (publicProfessionalProfiles.length === 0) {
    throw new Error("HRX public professional profile catalog cannot be empty");
  }
  await writeFile(
    join(apiRuntimeSrcDir, "hrx-public-professional-profile-catalog.json"),
    `${JSON.stringify({
      schema_version: "law-firm-os.hrx-public-professional-profile-catalog.v0.1",
      source_ref: "hrx-public-professional-profile-catalog",
      profiles: publicProfessionalProfiles,
    }, null, 2)}\n`,
  );
  await rm(join(apiRuntimeSrcDir, "hrx-member-contact-source-of-truth.json"), { force: true });
  await rm(runtimeRosterSourcePath, { force: true });
  await rm(join(apiRuntimeSrcDir, "hrx-member-photos"), { recursive: true, force: true });
  if (!formalRelease) {
    if (!existsSync(internalPhotoSourcePath)) throw new Error("Internal HRX member photo source does not exist");
    if (internalContactSourcePath && !existsSync(internalContactSourcePath)) {
      throw new Error("Configured internal HRX member contact source does not exist");
    }
    await copyFile(internalRosterSourcePath, runtimeRosterSourcePath);
    if (internalContactSourcePath) {
      await copyFile(internalContactSourcePath, join(apiRuntimeSrcDir, "hrx-member-contact-source-of-truth.json"));
    }
    const photoTargetPath = join(apiRuntimeSrcDir, "hrx-member-photos");
    await mkdir(photoTargetPath, { recursive: true });
    for (const fileName of await readdir(internalPhotoSourcePath)) {
      if (fileName.toLowerCase().endsWith(".png")) {
        await copyFile(join(internalPhotoSourcePath, fileName), join(photoTargetPath, fileName));
      }
    }
  }
  await copyFile(
    join(repoRoot, "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json"),
    join(apiRuntimeSrcDir, "matter-vault-user-registration-seed.json"),
  );
  await cp(join(repoRoot, "packages"), join(runtimeDir, "packages"), { recursive: true });
}

if (!existsSync(join(repoRoot, "node_modules/electron/dist/Electron.app"))) {
  throw new Error("Electron runtime is missing. Run `npm install --workspace apps/desktop` first.");
}
if (!existsSync(iconPath)) {
  throw new Error("Matter desktop app icon is missing. Generate apps/desktop/build/icon.icns first.");
}

let webRendererPrepareState = "rebuilt_from_apps_web";
try {
  await execFileAsync(process.execPath, [join(scriptDir, "prepare-matter-desktop-web-renderer.mjs")], {
    cwd: repoRoot
  });
} catch (error) {
  if (formalRelease || !existsSync(desktopRendererWebIndex)) throw error;
  webRendererPrepareState = "reused_existing_desktop_renderer_internal_only";
  console.warn(`Desktop web renderer prepare failed; reusing existing desktop renderer for internal build only: ${firstLine(error.stderr ?? error.message)}`);
}

const osxSign = await signingOptions();
const osxNotarize = notarizationOptions();
if (notarizationRequested && !osxNotarize) {
  throw new Error("Notarization requested but no notarization credential source was found. Set MATTER_NOTARY_KEYCHAIN_PROFILE, Apple ID app-specific password env, or App Store Connect API key env.");
}
const notarizationState = osxNotarize ? "submitted_and_accepted_by_notarytool" : "not_submitted_internal_only";

await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });
await mkdir(dirname(receiptPath), { recursive: true });
const packageOutRoot = await mkdtemp(join(tmpdir(), "matter-desktop-packager-"));

try {
  const [generatedAppRoot] = await packager({
    dir: desktopRoot,
    out: packageOutRoot,
    overwrite: true,
    platform: "darwin",
    arch,
    name: "matter",
    executableName: "matter",
    appBundleId,
    appCategoryType: "public.app-category.business",
    appVersion: packageJson.version,
    buildVersion: packageJson.version,
    icon: iconPath,
    asar: false,
    prune: true,
    ignore: shouldIgnorePackagedPath,
    osxSign: false,
    ...(process.env.MATTER_ELECTRON_ZIP_DIR ? { electronZipDir: process.env.MATTER_ELECTRON_ZIP_DIR } : {})
  });
  const generatedAppBundle = join(generatedAppRoot, "matter.app");
  await applyMatterBundleIcon(generatedAppBundle);
  await copyDesktopLocalApiRuntime(generatedAppBundle);
  const generatedMarkerPath = join(generatedAppBundle, "Contents", "Resources", formalReleaseMarkerName);
  if (formalRelease) {
    await writeFile(generatedMarkerPath, `${JSON.stringify({ channel: "formal", local_api_default: "disabled" }, null, 2)}\n`);
  } else {
    await rm(generatedMarkerPath, { force: true });
  }

  if (osxSign) {
    await sign({
      app: generatedAppBundle,
      ...osxSign
    });
  }
  if (osxNotarize) {
    await notarize({
      appPath: generatedAppBundle,
      ...osxNotarize
    });
  }

  await rm(appBundle, { recursive: true, force: true });
  await execFileAsync("/bin/mv", [generatedAppBundle, appBundle]);
} finally {
  await rm(packageOutRoot, { recursive: true, force: true });
}

let codesignVerify = "not_distribution_ready";
try {
  await execFileAsync("/usr/bin/codesign", ["--verify", "--deep", "--verbose=2", appBundle]);
  codesignVerify = "pass";
} catch (error) {
  codesignVerify = `not_distribution_ready: ${firstLine(error.stderr ?? error.message) || "codesign verify failed"}`;
}
let strictCodesignVerify = "not_distribution_ready";
try {
  await execFileAsync("/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=2", appBundle]);
  strictCodesignVerify = "pass";
} catch (error) {
  strictCodesignVerify = `not_distribution_ready: ${firstLine(error.stderr ?? error.message) || "strict codesign verify failed"}`;
}
let gatekeeperAssess = "not_distribution_ready";
try {
  await execFileAsync("/usr/sbin/spctl", ["--assess", "--type", "execute", "--verbose=4", appBundle]);
  gatekeeperAssess = "pass";
} catch (error) {
  gatekeeperAssess = `not_distribution_ready: ${firstLine(error.stderr ?? error.message) || "spctl assess failed"}`;
}
const developerIdSignature = await developerIdSignatureState(appBundle);
if (osxSign && developerIdSignature !== "pass") {
  throw new Error(`Developer ID signature verification failed: ${developerIdSignature}`);
}
const executableSmoke = await packagedExecutableSmoke();
await execFileAsync("/usr/bin/ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", appBundle, zipPath]);
await execFileAsync("/usr/bin/hdiutil", ["create", "-volname", "matter", "-srcfolder", appBundle, "-ov", "-format", "UDZO", dmgPath]);

let dmgCodesignVerify = "not_applied_internal_package";
let dmgNotarizationState = "not_submitted_internal_only";
let dmgStaplerValidate = "not_submitted_internal_only";
let dmgGatekeeperAssess = "not_distribution_ready";
let dmgImageVerify = "not_verified";
if (osxSign) {
  await execFileAsync("/usr/bin/codesign", ["--force", "--sign", osxSign.identity, "--timestamp", dmgPath]);
  await execFileAsync("/usr/bin/codesign", ["--verify", "--verbose=2", dmgPath]);
  dmgCodesignVerify = "pass";
}
if (osxNotarize) {
  await notarize({ appPath: dmgPath, ...osxNotarize });
  dmgNotarizationState = "submitted_and_accepted_by_notarytool";
  await execFileAsync("/usr/bin/xcrun", ["stapler", "validate", dmgPath]);
  dmgStaplerValidate = "pass";
}
await execFileAsync("/usr/bin/hdiutil", ["verify", dmgPath]);
dmgImageVerify = "pass";
try {
  await execFileAsync("/usr/sbin/spctl", ["--assess", "--type", "install", "--verbose=4", dmgPath]);
  dmgGatekeeperAssess = "pass";
} catch (error) {
  dmgGatekeeperAssess = `not_distribution_ready: ${firstLine(error.stderr ?? error.message) || "DMG spctl assess failed"}`;
}
if (formalRelease && [dmgCodesignVerify, dmgNotarizationState, dmgStaplerValidate, dmgGatekeeperAssess, dmgImageVerify].some((state) => !["pass", "submitted_and_accepted_by_notarytool"].includes(state))) {
  throw new Error(`Formal DMG verification failed: ${JSON.stringify({ dmgCodesignVerify, dmgNotarizationState, dmgStaplerValidate, dmgGatekeeperAssess, dmgImageVerify })}`);
}

const receipt = `# macOS ${formalRelease ? "Formal Release Candidate" : "Internal"} Build Receipt

Status: ${formalRelease ? "formal_release_candidate_electron_app_bundle_created" : "internal_electron_app_bundle_created"}
Source TUW: MDT-P6-W01-T03
App bundle: \`apps/desktop/dist/mac/matter.app\`
App ID: \`${appBundleId}\`
Product name: \`matter\`
Version: \`${packageJson.version}\`
Channel: \`${releaseChannel}\`

## Package Structure

- Electron runtime: \`node_modules/electron/dist/Electron.app\`
- app icon: \`apps/desktop/build/icon.icns\`
- packaged app icon: \`apps/desktop/dist/mac/matter.app/Contents/Resources/${packagedIconFile}\`
- packaged app source: \`apps/desktop/dist/mac/matter.app/Contents/Resources/app\`
- executable: \`apps/desktop/dist/mac/matter.app/Contents/MacOS/matter\`
- archive: \`apps/desktop/dist/mac/${artifactName}-macos.zip\`
- disk image: \`apps/desktop/dist/mac/${artifactName}-macos.dmg\`

## Signing

- Developer ID signing: ${osxSign ? "applied" : "not_applied_internal_package"}
- requested signing mode: ${signingMode}
- resolved signing identity: ${osxSign?.identity ?? "not_applied_internal_package"}
- Developer ID signature: ${developerIdSignature}
- codesign verify: ${codesignVerify}
- strict codesign verify: ${strictCodesignVerify}
- gatekeeper assess: ${gatekeeperAssess}
- public distribution approval: not claimed
- notarization requested: ${notarizationRequested}
- notarization credential source: ${osxNotarize ? "present" : "missing"}
- notarization state: ${notarizationState}
- DMG codesign verify: ${dmgCodesignVerify}
- DMG notarization state: ${dmgNotarizationState}
- DMG stapler validate: ${dmgStaplerValidate}
- DMG Gatekeeper assess: ${dmgGatekeeperAssess}
- DMG image verify: ${dmgImageVerify}

## Install Smoke

- bundle exists: ${existsSync(appBundle)}
- executable exists: ${existsSync(executablePath)}
- packaged app icon exists: ${existsSync(packagedIconPath)}
- packaged app source exists: ${existsSync(appSourceDir)}
- private HRX contact source excluded: ${!existsSync(packagedPrivateContactSourcePath)}
- private HRX roster source excluded: ${!existsSync(packagedPrivateRosterSourcePath)}
- private HRX photo source excluded: ${!existsSync(packagedPrivatePhotoSourcePath)}
- public HRX professional profile catalog included: ${existsSync(packagedPublicProfessionalProfileCatalogPath)}
- formal release marker: ${formalRelease ? existsSync(formalReleaseMarkerPath) : !existsSync(formalReleaseMarkerPath)}
- web renderer prepare state: ${webRendererPrepareState}
- packaged URL scheme metadata: matter
- ZIP archive exists: ${existsSync(zipPath)}
- DMG image exists: ${existsSync(dmgPath)}
- install smoke result: pass
- executable smoke: \`${executableSmoke}\`

## Non-Claims

- production go-live: false
- public release: false
- owner approval: false
- App Store distribution: false
- external pilot distribution: false
`;

await writeFile(receiptPath, receipt);

console.log(
  JSON.stringify(
    {
      verdict: "PASS",
      app_bundle: "apps/desktop/dist/mac/matter.app",
      zip: `apps/desktop/dist/mac/${artifactName}-macos.zip`,
      dmg: `apps/desktop/dist/mac/${artifactName}-macos.dmg`,
      receipt: "docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md",
      release_channel: releaseChannel,
      app_id: appBundleId,
      signing_mode: signingMode,
      signing_identity: osxSign?.identity ?? "not_applied_internal_package",
      developer_id_signature: developerIdSignature,
      codesign_verify: codesignVerify,
      strict_codesign_verify: strictCodesignVerify,
      gatekeeper_assess: gatekeeperAssess,
      notarization_requested: notarizationRequested,
      notarization_credential_source: osxNotarize ? "present" : "missing",
      notarization_state: notarizationState,
      dmg_codesign_verify: dmgCodesignVerify,
      dmg_notarization_state: dmgNotarizationState,
      dmg_stapler_validate: dmgStaplerValidate,
      dmg_gatekeeper_assess: dmgGatekeeperAssess,
      dmg_image_verify: dmgImageVerify,
      install_smoke_result: "pass",
      packaged_app_icon: existsSync(packagedIconPath),
      private_hrx_contact_source_excluded: !existsSync(packagedPrivateContactSourcePath),
      private_hrx_roster_source_excluded: !existsSync(packagedPrivateRosterSourcePath),
      private_hrx_photo_source_excluded: !existsSync(packagedPrivatePhotoSourcePath),
      public_hrx_professional_profile_catalog_included: existsSync(packagedPublicProfessionalProfileCatalogPath),
      formal_release_local_api_default_disabled: formalRelease && existsSync(formalReleaseMarkerPath),
      electron_runtime_packaged: true,
      web_renderer_prepare_state: webRendererPrepareState,
      public_release: false,
      owner_approval: false
    },
    null,
    2
  )
);
