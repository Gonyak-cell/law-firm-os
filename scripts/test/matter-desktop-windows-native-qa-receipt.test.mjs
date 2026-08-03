import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
  buildBlockedWindowsSigningAuthorityReceipt,
  evaluateWindowsReleaseGate,
} from "../lib/matter-desktop-windows-release-gate.mjs";
import {
  DESKTOP_RENDERER_DIGEST_ALGORITHM,
  createDesktopBuildManifest,
  desktopReleaseChannelConfig,
} from "../lib/matter-desktop-provenance.mjs";
import {
  WINDOWS_UNINSTALL_CONTRACT,
  WINDOWS_UNINSTALL_INVENTORY_SCHEMA,
  validateWindowsUninstallEvidence,
} from "../lib/matter-desktop-windows-native-qa.mjs";
import {
  buildDesktopArtifactPrivacyCorpus,
  createWindowsInstallerNativePrivacyReceipt,
  createWindowsInstallerPrivacyBuilderReceipt,
  inspectDesktopArtifactBytes,
  inspectExpandedDesktopArtifact,
  validateWindowsInstallerNativePrivacyEvidence,
  validateWindowsInstallerNativePrivacyReceipt,
  validateWindowsInstallerPrivacyBuilderEvidence,
} from "../lib/matter-desktop-artifact-privacy.mjs";
import {
  readValidatedWindowsNativeQaPassReceipt,
  validateWindowsNativeQaReceipt,
} from "../validate-matter-desktop-windows-native-qa-receipt.mjs";

const SCRIPT_PATH = fileURLToPath(new URL("../validate-matter-desktop-windows-native-qa-receipt.mjs", import.meta.url));
const RUNNER_PATH = fileURLToPath(new URL("../run-formal-windows-package-qa.mjs", import.meta.url));
const WORKFLOW_PATH = fileURLToPath(new URL("../../.github/workflows/windows-formal-package-qa.yml", import.meta.url));
const SOURCE_SHA = "1".repeat(40);
const SOURCE_TREE = "2".repeat(40);
const VERSION = "0.1.17";
const RELEASE_ID = "matter-desktop-v0.1.17-rfd-tuw-013";
const NOW = Date.parse("2026-07-31T12:00:00.000Z");
const SIGNER = Object.freeze({
  thumbprint_sha1: "A".repeat(40),
  subject: "CN=AMIC Law Firm, O=AMIC Law Firm, C=KR",
  issuer: "CN=Example Code Signing CA, O=Example CA, C=US",
  team_equivalent: "AMIC Law Firm",
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function write(root, name, value) {
  const filePath = path.join(root, name);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, typeof value === "string" || Buffer.isBuffer(value)
    ? value
    : `${JSON.stringify(value, null, 2)}\n`);
  return filePath;
}

function fileDescriptor(root, filePath) {
  return {
    path: path.relative(root, filePath).split(path.sep).join("/"),
    sha256: sha256(readFileSync(filePath)),
    bytes: statSync(filePath).size,
  };
}

function reference(root, filePath, receiptId) {
  return {
    path: path.relative(root, filePath).split(path.sep).join("/"),
    sha256: sha256(readFileSync(filePath)),
    ...(receiptId ? { receipt_id: receiptId } : {}),
  };
}

function tempRoot(testContext) {
  const root = mkdtempSync(path.join(tmpdir(), "rfd013-receipt-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function uninstallState(phase, executableRecord = { sha256: "a".repeat(64), bytes: 1 }) {
  return {
    schema_version: WINDOWS_UNINSTALL_INVENTORY_SCHEMA,
    contract_schema_version: WINDOWS_UNINSTALL_CONTRACT.schema_version,
    phase,
    install_directory: phase === "before" ? {
      present: true,
      file_count: 3,
      files: [
        { relative_path: "matter.exe", bytes: executableRecord.bytes, sha256: executableRecord.sha256 },
        { relative_path: "Uninstall matter.exe", bytes: 1, sha256: "b".repeat(64) },
        { relative_path: "resources/matter-build-manifest.json", bytes: 1, sha256: "c".repeat(64) },
      ],
    } : { present: false, file_count: 0, files: [] },
    shortcuts: WINDOWS_UNINSTALL_CONTRACT.shortcut_scopes.flatMap((scope) => (
      WINDOWS_UNINSTALL_CONTRACT.shortcut_names.map((name) => ({ scope, name, present: false, target_in_install_directory: false }))
    )),
    services: [],
    registry: [],
    update_residue: WINDOWS_UNINSTALL_CONTRACT.update_residue_locations.map(({ id }) => ({ id, present: false })),
    inspection_errors: [],
  };
}

function unsigned(role, artifactSha256) {
  return {
    role,
    artifact_sha256: artifactSha256,
    status: "NotSigned",
    status_message: "No signature present.",
    signature_type: "None",
    signer_certificate_present: false,
    time_stamper_certificate_present: false,
    signer_thumbprint: null,
    signer_subject: null,
    signer_issuer: null,
    signer_team_equivalent: null,
  };
}

function signed(role, artifactSha256) {
  return {
    role,
    artifact_sha256: artifactSha256,
    status: "Valid",
    status_message: "Signature verified.",
    signature_type: "Authenticode",
    signer_certificate_present: true,
    time_stamper_certificate_present: true,
    signer_thumbprint: SIGNER.thumbprint_sha1,
    signer_subject: SIGNER.subject,
    signer_issuer: SIGNER.issuer,
    signer_team_equivalent: SIGNER.team_equivalent,
  };
}

function promoteToSignedPass(value) {
  const authorityReceipt = {
    schema_version: "law-firm-os.rfd-tuw-013.windows-signing-authority.v1",
    receipt_id: "rfd-tuw-013-approved-authority",
    status: "APPROVED",
    source_sha: value.options.expectedSourceSha,
    source_tree: value.options.expectedSourceTree,
    release: { id: RELEASE_ID, version: VERSION, channel: "formal" },
    artifact_sha256: { installer: value.options.expectedInstallerSha256 },
    signer: { ...SIGNER },
    authorization: {
      recorded_by_human: true,
      approval_reference: "approval:rfd-tuw-013-signed-review-fixture",
      authorized_at: "2026-07-31T11:00:00.000Z",
      expires_at: "2026-08-01T11:00:00.000Z",
    },
    boundary: {
      signing_execution_allowed: true,
      windows_release_signing_approved: true,
      secrets_recorded: false,
    },
    reason_codes: [],
  };
  writeFileSync(value.authorityReceiptPath, `${JSON.stringify(authorityReceipt, null, 2)}\n`);
  const signatures = [
    signed("installer", value.options.expectedInstallerSha256),
    signed("installed_executable", value.options.expectedUnpackedExecutableSha256),
  ];
  const decision = evaluateWindowsReleaseGate({
    nativeQa: "PASS",
    signatures,
    authorityReceipt,
    sourceSha: value.options.expectedSourceSha,
    sourceTree: value.options.expectedSourceTree,
    releaseId: RELEASE_ID,
    version: VERSION,
    installerSha256: value.options.expectedInstallerSha256,
    installedExecutableSha256: value.options.expectedUnpackedExecutableSha256,
    now: NOW,
  });
  value.options.authorityReceipt = authorityReceipt;
  value.receipt.windows_release = decision.windows_release;
  value.receipt.reason_code = decision.reason_code;
  value.receipt.authenticode = {
    authority_receipt: reference(value.root, value.authorityReceiptPath, authorityReceipt.receipt_id),
    signatures,
    signature_state: decision.signature_state,
    signer_binding: decision.signer_binding,
  };
  value.receipt.boundaries.authenticode_claim = true;
  return value;
}

function initializeFixtureRepository(root) {
  write(root, ".gitignore", "apps/desktop/dist/\nevidence/\n");
  write(root, "apps/desktop/package.json", { name: "@law-firm-os/desktop", version: VERSION });
  write(root, "source.txt", "source\n");
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.name", "RFD013 Test"], { cwd: root });
  execFileSync("git", ["config", "user.email", "rfd013@example.invalid"], { cwd: root });
  execFileSync("git", ["add", ".gitignore", "apps/desktop/package.json", "source.txt"], { cwd: root });
  execFileSync("git", ["commit", "-qm", "fixture"], { cwd: root });
  return {
    sourceSha: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    sourceTree: execFileSync("git", ["rev-parse", "HEAD^{tree}"], { cwd: root, encoding: "utf8" }).trim(),
  };
}

function fixture(testContext, { blockedArtifact = false, gitBacked = !blockedArtifact } = {}) {
  const root = tempRoot(testContext);
  const sourceIdentity = gitBacked
    ? initializeFixtureRepository(root)
    : { sourceSha: SOURCE_SHA, sourceTree: SOURCE_TREE };
  const installerPath = write(root, `apps/desktop/dist/matter-${VERSION}-win-x64.exe`, "installer bytes");
  const blockmapPath = write(root, `apps/desktop/dist/matter-${VERSION}-win-x64.exe.blockmap`, "blockmap bytes");
  const packageZipPath = write(root, `apps/desktop/dist/win/matter-${VERSION}-win32-x64-unsigned.zip`, "package zip bytes");
  const installerManifestPath = write(root, `apps/desktop/dist/win/matter-${VERSION}-win-installer-manifest.json`, "installer manifest bytes");
  const installerManifestSignaturePath = write(root, `apps/desktop/dist/win/matter-${VERSION}-win-installer-manifest.json.sig`, "installer signature bytes");
  const executablePath = write(root, "apps/desktop/dist/win-unpacked/matter.exe", "executable bytes");
  const windowsBuildReceiptPath = write(root, "docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md", "Windows build receipt\n");
  const manifest = createDesktopBuildManifest({
    version: VERSION,
    sourceSha: sourceIdentity.sourceSha,
    sourceTree: sourceIdentity.sourceTree,
    sourceDirty: false,
    renderer: { sha256: "3".repeat(64), file_count: 1, algorithm: DESKTOP_RENDERER_DIGEST_ALGORITHM },
    channel: "formal",
    platform: "win32",
    arch: "x64",
    appId: desktopReleaseChannelConfig("formal").appId,
    requestedRuntimeMode: "none",
    effectiveRuntimeMode: "none",
    runtimeIncluded: false,
    runtimeDataClass: "none",
    nonDistributable: false,
    distributable: true,
    builtAt: "2026-07-31T12:00:00.000Z",
  });
  const buildManifestPath = write(root, `apps/desktop/dist/win/matter-${VERSION}-win-build-manifest.json`, manifest);
  const embeddedBuildManifestPath = write(root, "apps/desktop/dist/win-unpacked/resources/matter-build-manifest.json", manifest);
  const installerSha256 = sha256(readFileSync(installerPath));
  const executableSha256 = sha256(readFileSync(executablePath));
  const executableBytes = statSync(executablePath).size;
  const authorityReceipt = buildBlockedWindowsSigningAuthorityReceipt({
    receiptId: "rfd-tuw-013-blocked-authority",
    sourceSha: sourceIdentity.sourceSha,
    sourceTree: sourceIdentity.sourceTree,
    releaseId: RELEASE_ID,
    version: VERSION,
  });
  const authorityReceiptPath = write(root, "evidence/authority.json", authorityReceipt);
  const common = {
    schema_version: WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
    receipt_id: blockedArtifact ? "rfd-tuw-013-local-blocked" : "rfd-tuw-013-native-pass",
    tuw_id: "RFD-TUW-013",
    generated_at: "2026-07-31T12:00:00.000Z",
    release: { id: RELEASE_ID, version: VERSION, channel: "formal" },
    source: { revision: sourceIdentity.sourceSha, source_tree: sourceIdentity.sourceTree, source_dirty: blockedArtifact },
    screenshots: [],
    boundaries: {
      native_windows_executed: !blockedArtifact,
      public_release_claim: false,
      production_go_live_claim: false,
      historical_receipt_accepted: false,
      certificate_secret_recorded: false,
      authenticode_claim: false,
    },
  };
  if (blockedArtifact) {
    const receipt = {
      ...common,
      native_qa: "BLOCKED_BY_ARTIFACT",
      windows_release: "BLOCKED_BY_AUTHORITY",
      reason_code: "CURRENT_EXACT_SHA_NATIVE_EXECUTION_ABSENT",
      package: null,
      runtime: null,
      identity: null,
      scenarios: null,
      parity: null,
      uninstall: null,
      authenticode: {
        authority_receipt: reference(root, authorityReceiptPath, authorityReceipt.receipt_id),
        signatures: null,
        signature_state: "NOT_EXECUTED",
        signer_binding: null,
      },
      diagnostics: null,
    };
    return {
      root,
      receipt,
      receiptPath: write(root, "evidence/blocked-receipt.json", receipt),
      options: {
        repoRoot: root,
        authorityReceipt,
        authorityReceiptPath,
        expectedSourceSha: sourceIdentity.sourceSha,
        expectedSourceTree: sourceIdentity.sourceTree,
        expectedVersion: VERSION,
        expectedReleaseId: RELEASE_ID,
        expectedNativeQa: "BLOCKED_BY_ARTIFACT",
        now: NOW,
      },
    };
  }

  const inventory = {
    schema_version: "law-firm-os.rfd-tuw-013.windows-uninstall-evidence.v1",
    contract: WINDOWS_UNINSTALL_CONTRACT,
    before: uninstallState("before", { sha256: executableSha256, bytes: executableBytes }),
    after: uninstallState("after"),
  };
  const inventoryPath = write(root, "evidence/inventory.json", inventory);
  const uninstallSummary = validateWindowsUninstallEvidence(inventory);
  const signatures = [unsigned("installer", installerSha256), unsigned("installed_executable", executableSha256)];
  const releaseDecision = evaluateWindowsReleaseGate({
    nativeQa: "PASS",
    signatures,
    authorityReceipt,
    sourceSha: sourceIdentity.sourceSha,
    sourceTree: sourceIdentity.sourceTree,
    releaseId: RELEASE_ID,
    version: VERSION,
    installerSha256,
    installedExecutableSha256: executableSha256,
    now: NOW,
  });
  const scenarios = Object.fromEntries([
    "nsis_install_completed",
    "forest_login_rendered",
    "signed_in",
    "restart_session_restored",
    "nsis_uninstall_completed",
    "full_install_directory_removed",
    "declared_shortcuts_removed",
    "declared_services_removed",
    "declared_registry_removed",
    "declared_update_residue_removed",
  ].map((name) => [name, true]));
  const receipt = {
    ...common,
    native_qa: "PASS",
    windows_release: releaseDecision.windows_release,
    reason_code: releaseDecision.reason_code,
    package: {
      release_root: "apps/desktop/dist",
      installer: fileDescriptor(root, installerPath),
      blockmap: fileDescriptor(root, blockmapPath),
      package_zip: fileDescriptor(root, packageZipPath),
      installer_manifest: fileDescriptor(root, installerManifestPath),
      installer_manifest_signature: fileDescriptor(root, installerManifestSignaturePath),
      unpacked_executable: fileDescriptor(root, executablePath),
      installed_executable: {
        path_kind: "isolated_native_install",
        sha256: executableSha256,
        bytes: executableBytes,
        matches_unpacked: true,
      },
      build_manifest: fileDescriptor(root, buildManifestPath),
      embedded_build_manifest: fileDescriptor(root, embeddedBuildManifestPath),
      windows_build_receipt: fileDescriptor(root, windowsBuildReceiptPath),
      release_artifact_sha256: [...new Set([
        installerSha256,
        sha256(readFileSync(blockmapPath)),
        sha256(readFileSync(packageZipPath)),
        sha256(readFileSync(installerManifestPath)),
        sha256(readFileSync(installerManifestSignaturePath)),
        sha256(readFileSync(buildManifestPath)),
        sha256(readFileSync(windowsBuildReceiptPath)),
      ])].sort(),
    },
    runtime: { topology: "thin-client" },
    identity: { synthetic_only: true },
    scenarios,
    parity: {
      installed_executable_matches_unpacked: true,
      source_sha_matches_manifest: true,
      source_tree_matches_manifest: true,
    },
    uninstall: { inventory: reference(root, inventoryPath), summary: uninstallSummary },
    authenticode: {
      authority_receipt: reference(root, authorityReceiptPath, authorityReceipt.receipt_id),
      signatures,
      signature_state: releaseDecision.signature_state,
      signer_binding: releaseDecision.signer_binding,
    },
    screenshots: [{ path: "screen.png", sha256: "d".repeat(64) }],
    diagnostics: { page_error_count: 0, console_error_count: 0 },
  };
  const receiptPath = write(root, "evidence/receipt.json", receipt);
  return {
    root,
    receipt,
    receiptPath,
    installerPath,
    blockmapPath,
    packageZipPath,
    installerManifestPath,
    installerManifestSignaturePath,
    executablePath,
    buildManifestPath,
    embeddedBuildManifestPath,
    windowsBuildReceiptPath,
    inventoryPath,
    authorityReceiptPath,
    manifest,
    options: {
      repoRoot: root,
      authorityReceipt,
      authorityReceiptPath,
      inventory,
      inventoryPath,
      expectedSourceSha: sourceIdentity.sourceSha,
      expectedSourceTree: sourceIdentity.sourceTree,
      expectedVersion: VERSION,
      expectedReleaseId: RELEASE_ID,
      expectedNativeQa: "PASS",
      expectedInstallerSha256: installerSha256,
      expectedUnpackedExecutableSha256: executableSha256,
      installerPath,
      blockmapPath,
      packageZipPath,
      installerManifestPath,
      installerManifestSignaturePath,
      unpackedExecutablePath: executablePath,
      buildManifestPath,
      embeddedBuildManifestPath,
      windowsBuildReceiptPath,
      now: NOW,
    },
  };
}

async function privacyCorpus(root) {
  const sourceRoot = path.join(root, "artifacts/privacy-sources");
  const privateEmail = "strict-native-private-contact@example.invalid";
  const rosterSourcePath = write(root, "artifacts/privacy-sources/roster.json", {
    tenant_id: "strict-native-private-tenant",
    members: [{
      display_name: "Strict Native Private Person",
      employee_id: "strict-native-private-employee",
      work_email: privateEmail,
    }],
  });
  const contactSourcePath = write(root, "artifacts/privacy-sources/contact.json", {
    contacts: [{ work_email: privateEmail, mobile_phone: "+82-10-9000-0130" }],
  });
  const registrationSeedSourcePath = write(root, "artifacts/privacy-sources/registration.json", {
    tenant_id: "strict-native-private-tenant",
    users: [{ user_id: "strict-native-private-user", clientSecret: "strict-native-private-secret" }],
  });
  const photoSourcePath = path.join(sourceRoot, "photos");
  write(root, "artifacts/privacy-sources/photos/private.png", Buffer.from([0, 1, 3, 0, 7]));
  return buildDesktopArtifactPrivacyCorpus({
    repoRoot: root,
    rosterSourcePath,
    contactSourcePath,
    registrationSeedSourcePath,
    photoSourcePath,
    env: {},
  });
}

test("current unsigned native PASS receipt validates independently as authority-blocked", (testContext) => {
  const value = fixture(testContext);
  assert.deepEqual(validateWindowsNativeQaReceipt(value.receipt, value.options), {
    native_qa: "PASS",
    windows_release: "BLOCKED_BY_AUTHORITY",
    source_sha: value.options.expectedSourceSha,
    version: VERSION,
    installer_sha256: value.options.expectedInstallerSha256,
    signer_authority: "BLOCKED_BY_AUTHORITY",
    installed_file_count: 3,
    authoritative_execution: true,
  });
});

test("canonical strict reader derives current source, version, authority, inventory, and package paths", (testContext) => {
  const value = fixture(testContext);
  const receiptPath = write(value.root, "artifacts/rfd-tuw-013-windows-native-qa.json", value.receipt);
  const read = readValidatedWindowsNativeQaPassReceipt({ receiptPath, repoRoot: value.root, now: NOW });
  assert.equal(read.receipt.receipt_id, value.receipt.receipt_id);
  assert.equal(read.reference.path, "artifacts/rfd-tuw-013-windows-native-qa.json");
  assert.equal(read.reference.sha256, sha256(readFileSync(receiptPath)));
  assert.equal(read.reference.bytes, statSync(receiptPath).size);
  assert.equal(read.result.native_qa, "PASS");
  assert.equal(read.result.authoritative_execution, true);
  assert.equal(read.validationOptions.expectedSourceSha, value.options.expectedSourceSha);
  assert.equal(read.validationOptions.expectedSourceTree, value.options.expectedSourceTree);
  assert.equal(read.validationOptions.expectedVersion, VERSION);
  assert.equal(path.relative(read.validationOptions.repoRoot, read.validationOptions.authorityReceiptPath), "evidence/authority.json");
  assert.equal(path.relative(read.validationOptions.repoRoot, read.validationOptions.inventoryPath), "evidence/inventory.json");
  assert.equal(path.relative(read.validationOptions.repoRoot, read.validationOptions.installerPath), `apps/desktop/dist/matter-${VERSION}-win-x64.exe`);
  assert.equal(path.relative(read.validationOptions.repoRoot, read.validationOptions.unpackedExecutablePath), "apps/desktop/dist/win-unpacked/matter.exe");
});

test("native privacy completion validates the raw strict receipt and rejects hash, schema, and missing-file drift", async (testContext) => {
  const value = fixture(testContext);
  const corpus = await privacyCorpus(value.root);
  const sourcePayloadPath = path.dirname(value.executablePath);
  write(value.root, "apps/desktop/dist/win-unpacked/resources/app/index.js", "export const ready = true;\n");
  const sourcePayloadInspection = await inspectExpandedDesktopArtifact({
    rootPath: sourcePayloadPath,
    buildManifest: value.manifest,
    corpus,
    displayBase: value.root,
  });
  const byteInspection = await inspectDesktopArtifactBytes({
    artifactPath: value.installerPath,
    artifactKind: "nsis_installer",
    corpus,
    displayBase: value.root,
  });
  const artifact = {
    id: "windows_installer",
    kind: "nsis_installer",
    sha256: byteInspection.artifact_sha256,
    bytes: byteInspection.artifact_bytes,
  };
  const builderReceipt = createWindowsInstallerPrivacyBuilderReceipt({
    receiptId: "RFD007-strict-native-builder",
    artifact,
    buildManifest: value.manifest,
    byteInspection,
    sourcePayloadInspection,
  });
  const builderReceiptPath = write(
    value.root,
    `apps/desktop/dist/matter-${VERSION}-win-x64.exe.privacy-builder.json`,
    builderReceipt,
  );
  const builderValidation = await validateWindowsInstallerPrivacyBuilderEvidence({
    receipt: builderReceipt,
    artifact,
    artifactPath: value.installerPath,
    buildManifest: value.manifest,
    sourcePayloadPath,
    corpus,
    displayBase: value.root,
    embeddedBuildManifestPath: "resources/matter-build-manifest.json",
  });
  const installedRoot = path.join(value.root, "evidence/native-installed");
  cpSync(sourcePayloadPath, installedRoot, { recursive: true });
  const installedRootInspection = await inspectExpandedDesktopArtifact({
    rootPath: installedRoot,
    buildManifest: value.manifest,
    corpus,
    displayBase: value.root,
  });
  const nativeQaReceiptPath = write(
    value.root,
    "artifacts/rfd-tuw-013-windows-native-qa.json",
    value.receipt,
  );
  readValidatedWindowsNativeQaPassReceipt({ receiptPath: nativeQaReceiptPath, repoRoot: value.root, now: NOW });
  const nativeReceipt = createWindowsInstallerNativePrivacyReceipt({
    receiptId: "RFD013-strict-native-privacy",
    artifact,
    builderReceiptPath,
    installedRootInspection,
    nativeQaReceiptPath,
    now: NOW,
    repoRoot: value.root,
    uninstallResidueCount: 0,
  });
  const nativeValidation = validateWindowsInstallerNativePrivacyEvidence({
    receipt: nativeReceipt,
    artifact,
    repoRoot: value.root,
    installedRootInspection,
    builderValidation,
    now: NOW,
  });
  assert.equal(validateWindowsInstallerNativePrivacyReceipt(nativeReceipt, {
    artifact,
    builderReceipt,
    expectedSourceSha: value.options.expectedSourceSha,
    expectedSourceTree: value.options.expectedSourceTree,
    validation: nativeValidation,
  }), nativeReceipt);
  assert.deepEqual(Object.keys(nativeReceipt.native_qa_receipt).sort(), [
    "bytes", "path", "receipt_id", "schema_version", "sha256",
  ]);
  assert.equal(nativeReceipt.native_qa_receipt.path, "artifacts/rfd-tuw-013-windows-native-qa.json");

  const strictBytes = readFileSync(nativeQaReceiptPath);
  writeFileSync(nativeQaReceiptPath, Buffer.concat([strictBytes, Buffer.from(" ")]));
  assert.throws(() => validateWindowsInstallerNativePrivacyEvidence({
    receipt: nativeReceipt,
    artifact,
    repoRoot: value.root,
    installedRootInspection,
    builderValidation,
    now: NOW,
  }), (error) => error.code === "EVIDENCE_HASH_MISMATCH");
  writeFileSync(nativeQaReceiptPath, strictBytes);

  const wrongSchema = {
    ...nativeReceipt,
    native_qa_receipt: {
      ...nativeReceipt.native_qa_receipt,
      schema_version: "law-firm-os.rfd-tuw-013.windows-native-qa.v0",
    },
  };
  assert.throws(() => validateWindowsInstallerNativePrivacyEvidence({
    receipt: wrongSchema,
    artifact,
    repoRoot: value.root,
    installedRootInspection,
    builderValidation,
    now: NOW,
  }), (error) => error.code === "EVIDENCE_REFERENCE_INVALID");

  rmSync(nativeQaReceiptPath);
  assert.throws(() => validateWindowsInstallerNativePrivacyEvidence({
    receipt: nativeReceipt,
    artifact,
    repoRoot: value.root,
    installedRootInspection,
    builderValidation,
    now: NOW,
  }), (error) => error.code === "EVIDENCE_FILE_MISSING");
});

test("current local non-execution is truthful BLOCKED_BY_ARTIFACT and never reused as PASS", (testContext) => {
  const value = fixture(testContext, { blockedArtifact: true });
  const result = validateWindowsNativeQaReceipt(value.receipt, value.options);
  assert.equal(result.native_qa, "BLOCKED_BY_ARTIFACT");
  assert.equal(result.windows_release, "BLOCKED_BY_AUTHORITY");
  assert.equal(result.authoritative_execution, false);
  assert.throws(() => validateWindowsNativeQaReceipt(value.receipt, { ...value.options, expectedNativeQa: "PASS" }), (error) => error.code === "NATIVE_QA_STATE_MISMATCH");
  const injectedPassClaim = { ...value.receipt, installed_tree_privacy_status: "PASS" };
  assert.throws(
    () => validateWindowsNativeQaReceipt(injectedPassClaim, value.options),
    (error) => error.code === "SCHEMA_KEYS_MISMATCH",
  );
});

test("sanitized native execution failure validates only as non-authoritative FAIL", (testContext) => {
  const value = fixture(testContext, { blockedArtifact: true });
  const receipt = {
    ...value.receipt,
    receipt_id: "rfd-tuw-013-native-fail",
    native_qa: "FAIL",
    windows_release: "FAIL",
    reason_code: "WINDOWS_NATIVE_QA_EXECUTION_FAILED",
    source: { ...value.receipt.source, source_dirty: false },
    authenticode: {
      authority_receipt: null,
      signatures: null,
      signature_state: "FAILED_OR_INCOMPLETE",
      signer_binding: null,
    },
    diagnostics: { page_error_count: 0, console_error_count: 0, execution_error_count: 1 },
    boundaries: { ...value.receipt.boundaries, native_windows_executed: true },
  };
  const result = validateWindowsNativeQaReceipt(receipt, {
    repoRoot: value.root,
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedVersion: VERSION,
    expectedReleaseId: RELEASE_ID,
    expectedNativeQa: "FAIL",
  });
  assert.deepEqual(result, {
    native_qa: "FAIL",
    windows_release: "FAIL",
    source_sha: SOURCE_SHA,
    version: VERSION,
    native_windows_executed: true,
    authoritative_execution: false,
  });
  assert.throws(
    () => validateWindowsNativeQaReceipt(receipt, {
      repoRoot: value.root,
      expectedSourceSha: SOURCE_SHA,
      expectedSourceTree: SOURCE_TREE,
      expectedVersion: VERSION,
      expectedReleaseId: RELEASE_ID,
      expectedNativeQa: "PASS",
    }),
    (error) => error.code === "NATIVE_QA_STATE_MISMATCH",
  );
});

test("stale SHA/version and dated v0.1.0 receipt schemas are rejected", (testContext) => {
  const value = fixture(testContext);
  for (const [mutate, code] of [
    [(receipt) => { receipt.source.revision = "9".repeat(40); }, "SOURCE_BINDING_MISMATCH"],
    [(receipt) => { receipt.release.version = "0.1.0"; }, "RELEASE_BINDING_MISMATCH"],
    [(receipt) => { receipt.schema_version = "law-firm-os.formal-windows-package-qa.v1"; }, "RECEIPT_SCHEMA_MISMATCH"],
  ]) {
    const receipt = structuredClone(value.receipt);
    mutate(receipt);
    assert.throws(() => validateWindowsNativeQaReceipt(receipt, value.options), (error) => error.code === code);
  }
});

test("native PASS rejects false parity, historical paths, missing bytes, and source-manifest drift", (testContext) => {
  const value = promoteToSignedPass(fixture(testContext));
  assert.equal(validateWindowsNativeQaReceipt(value.receipt, value.options).windows_release, "PASS");
  const falseParity = structuredClone(value.receipt);
  falseParity.parity.source_tree_matches_manifest = false;
  assert.throws(
    () => validateWindowsNativeQaReceipt(falseParity, value.options),
    (error) => error.code === "PACKAGE_PARITY_MISMATCH",
  );

  const historicalPath = structuredClone(value.receipt);
  historicalPath.package.installer.path = "apps/desktop/dist/matter-0.1.0-win-x64.exe";
  assert.throws(
    () => validateWindowsNativeQaReceipt(historicalPath, value.options),
    (error) => error.code === "PACKAGE_ARTIFACT_BINDING_MISMATCH",
  );

  const historicalInstallerPath = write(value.root, "apps/desktop/dist/matter-0.1.0-win-x64.exe", "historical installer bytes");
  assert.throws(
    () => validateWindowsNativeQaReceipt(value.receipt, { ...value.options, installerPath: historicalInstallerPath }),
    (error) => error.code === "CANONICAL_ARTIFACT_PATH_MISMATCH",
  );

  const historicalVersion = structuredClone(value.receipt);
  historicalVersion.release.version = "0.1.0";
  assert.throws(
    () => validateWindowsNativeQaReceipt(historicalVersion, { ...value.options, expectedVersion: "0.1.0" }),
    (error) => error.code === "CURRENT_VERSION_BINDING_MISMATCH",
  );

  rmSync(value.executablePath);
  assert.throws(
    () => validateWindowsNativeQaReceipt(value.receipt, value.options),
    (error) => error.code === "ARTIFACT_FILE_MISSING",
  );
});

test("native PASS rejects a valid v2 manifest bound to a different source tree", (testContext) => {
  const value = fixture(testContext);
  const driftedManifest = {
    ...JSON.parse(readFileSync(value.buildManifestPath, "utf8")),
    source_tree: "9".repeat(40),
  };
  writeFileSync(value.buildManifestPath, `${JSON.stringify(driftedManifest, null, 2)}\n`);
  writeFileSync(value.embeddedBuildManifestPath, `${JSON.stringify(driftedManifest, null, 2)}\n`);
  assert.throws(
    () => validateWindowsNativeQaReceipt(value.receipt, value.options),
    (error) => error.code === "BUILD_MANIFEST_SOURCE_MISMATCH",
  );
});

test("independent canonical build timestamps may differ but no authority manifest field may drift", (testContext) => {
  const value = fixture(testContext);
  const embedded = JSON.parse(readFileSync(value.embeddedBuildManifestPath, "utf8"));
  embedded.built_at = "2026-07-31T12:00:01.000Z";
  writeFileSync(value.embeddedBuildManifestPath, `${JSON.stringify(embedded, null, 2)}\n`);
  value.receipt.package.embedded_build_manifest = fileDescriptor(value.root, value.embeddedBuildManifestPath);
  assert.equal(validateWindowsNativeQaReceipt(value.receipt, value.options).native_qa, "PASS");

  embedded.renderer = { ...embedded.renderer, sha256: "8".repeat(64) };
  writeFileSync(value.embeddedBuildManifestPath, `${JSON.stringify(embedded, null, 2)}\n`);
  value.receipt.package.embedded_build_manifest = fileDescriptor(value.root, value.embeddedBuildManifestPath);
  assert.throws(
    () => validateWindowsNativeQaReceipt(value.receipt, value.options),
    (error) => error.code === "BUILD_MANIFEST_PARITY_MISMATCH",
  );
});

test("native PASS independently rejects a dirty current source tree", (testContext) => {
  const value = fixture(testContext);
  write(value.root, "artifacts/generated-receipt.json", "{}\n");
  assert.equal(validateWindowsNativeQaReceipt(value.receipt, value.options).native_qa, "PASS");
  write(value.root, "unexpected-source.txt", "dirty\n");
  assert.throws(
    () => validateWindowsNativeQaReceipt(value.receipt, value.options),
    (error) => error.code === "CURRENT_SOURCE_BINDING_MISMATCH",
  );
});

test("parameterized CLI validates exact source, version, installer, inventory, and authority without Windows calls", (testContext) => {
  const value = fixture(testContext, { gitBacked: true });
  const reportPath = path.join(value.root, "validation.json");
  const result = spawnSync(process.execPath, [
    SCRIPT_PATH,
    "--receipt", value.receiptPath,
    "--authority", value.authorityReceiptPath,
    "--inventory", value.inventoryPath,
    "--installer", value.installerPath,
    "--blockmap", value.blockmapPath,
    "--package-zip", value.packageZipPath,
    "--installer-manifest", value.installerManifestPath,
    "--installer-manifest-signature", value.installerManifestSignaturePath,
    "--unpacked-executable", value.executablePath,
    "--build-manifest", value.buildManifestPath,
    "--embedded-build-manifest", value.embeddedBuildManifestPath,
    "--windows-build-receipt", value.windowsBuildReceiptPath,
    "--source-sha", value.options.expectedSourceSha,
    "--source-tree", value.options.expectedSourceTree,
    "--version", VERSION,
    "--release-id", RELEASE_ID,
    "--expected-native-qa", "PASS",
    "--report", reportPath,
  ], { cwd: value.root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).verdict, "PASS");
  assert.equal(JSON.parse(readFileSync(reportPath, "utf8")).native_qa, "PASS");
});

test("Windows workflow validates the exact downloaded package tree before uploading receipts", () => {
  const workflow = readFileSync(WORKFLOW_PATH, "utf8");
  const upload = workflow.indexOf("name: Upload exact formal Windows package input");
  const remove = workflow.indexOf("name: Remove local build output before artifact QA");
  const download = workflow.indexOf("name: Download exact formal Windows package input");
  const verify = workflow.indexOf("name: Verify downloaded package bytes");
  const nativeQa = workflow.indexOf("name: Run native install, login, leave, payroll, restart, and uninstall QA");
  const receiptUpload = workflow.indexOf("name: Upload Windows QA evidence");
  assert.equal([upload, remove, download, verify, nativeQa, receiptUpload].every((index) => index >= 0), true);
  assert.equal(upload < remove && remove < download && download < verify && verify < nativeQa && nativeQa < receiptUpload, true);
  assert.match(workflow, /Get-FileHash -LiteralPath \$file -Algorithm SHA256/u);
  for (const flag of [
    "--installer",
    "--blockmap",
    "--package-zip",
    "--installer-manifest",
    "--installer-manifest-signature",
    "--unpacked-executable",
    "--build-manifest",
    "--embedded-build-manifest",
    "--windows-build-receipt",
  ]) {
    assert.match(workflow, new RegExp(flag, "u"));
  }
});

test("Windows runner self-validates strict receipt and emits canonical RF13 authority references", () => {
  const runner = readFileSync(RUNNER_PATH, "utf8");
  assert.match(runner, /readValidatedWindowsNativeQaPassReceipt\(\{/u);
  assert.match(runner, /rfd013_receipt: canonicalReceiptReference\(RFD013_RECEIPT_PATH, rfd013Receipt\)/u);
  assert.match(runner, /authority_receipt: canonicalReceiptReference\(AUTHORITY_RECEIPT_PATH, authorityReceipt\)/u);
  assert.match(runner, /bytes: statSync\(filePath\)\.size/u);
  assert.match(runner, /INSTALLER_PRIVACY_BUILDER_RECEIPT_PATH = `\$\{INSTALLER_PATH\}\.privacy-builder\.json`/u);
  const strictValidation = runner.indexOf("readValidatedWindowsNativeQaPassReceipt({");
  const privacyCreation = runner.indexOf("createWindowsInstallerNativePrivacyReceipt({", strictValidation);
  const privacyValidation = runner.indexOf("validateWindowsInstallerNativePrivacyEvidence({", privacyCreation);
  const privacyWrite = runner.indexOf("writeJson(RF13_NATIVE_PRIVACY_RECEIPT_PATH", privacyCreation);
  assert.equal(
    strictValidation >= 0
      && strictValidation < privacyCreation
      && privacyCreation < privacyValidation
      && privacyValidation < privacyWrite,
    true,
  );
  assert.match(runner, /installedRootPrivacyInspection = await inspectExpandedDesktopArtifact/u);
  assert.match(runner, /validateWindowsInstallerPrivacyBuilderEvidence\(\{/u);
  assert.match(runner, /builderReceiptPath: INSTALLER_PRIVACY_BUILDER_RECEIPT_PATH/u);
  assert.match(runner, /nativeQaReceiptPath: RFD013_RECEIPT_PATH/u);
  assert.doesNotMatch(runner, /nativeQaValidationOptions/u);
  assert.match(runner, /builderValidation: installerPrivacyBuilderValidation/u);
  assert.match(runner, /rmSync\(RF13_NATIVE_PRIVACY_RECEIPT_PATH, \{ force: true \}\)/u);
  assert.match(runner, /uninstallResidueCount,/u);
});
