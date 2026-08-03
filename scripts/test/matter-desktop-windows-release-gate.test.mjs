import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBlockedWindowsSigningAuthorityReceipt,
  evaluateWindowsReleaseGate,
  validateWindowsSigningAuthorityReceipt,
} from "../lib/matter-desktop-windows-release-gate.mjs";
import {
  WINDOWS_UNINSTALL_CONTRACT,
  WINDOWS_UNINSTALL_INVENTORY_SCHEMA,
  createWindowsNativeQaPowerShellAdapter,
  validateWindowsUninstallEvidence,
} from "../lib/matter-desktop-windows-native-qa.mjs";

const SOURCE_SHA = "1".repeat(40);
const SOURCE_TREE = "2".repeat(40);
const INSTALLER_SHA = "3".repeat(64);
const EXECUTABLE_SHA = "4".repeat(64);
const VERSION = "0.1.17";
const RELEASE_ID = "matter-desktop-v0.1.17-rfd-tuw-013";
const NOW = Date.parse("2026-07-31T12:00:00.000Z");
const SIGNER = Object.freeze({
  thumbprint_sha1: "A".repeat(40),
  subject: "CN=AMIC Law Firm, O=AMIC Law Firm, C=KR",
  issuer: "CN=Example Code Signing CA, O=Example CA, C=US",
  team_equivalent: "AMIC Law Firm",
});

function blockedAuthority(overrides = {}) {
  return {
    ...buildBlockedWindowsSigningAuthorityReceipt({
      receiptId: "rfd-tuw-013-blocked-authority",
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      releaseId: RELEASE_ID,
      version: VERSION,
    }),
    ...overrides,
  };
}

function approvedAuthority(overrides = {}) {
  const base = {
    schema_version: "law-firm-os.rfd-tuw-013.windows-signing-authority.v1",
    receipt_id: "rfd-tuw-013-approved-authority",
    status: "APPROVED",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    release: { id: RELEASE_ID, version: VERSION, channel: "formal" },
    artifact_sha256: { installer: INSTALLER_SHA },
    signer: { ...SIGNER },
    authorization: {
      recorded_by_human: true,
      approval_reference: "approval:windows-release-RFD-TUW-013",
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
  return { ...base, ...overrides };
}

function signature(role, artifactSha256, overrides = {}) {
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
    ...overrides,
  };
}

function unsigned(role, artifactSha256) {
  return signature(role, artifactSha256, {
    status: "NotSigned",
    status_message: "No signature present.",
    signature_type: "None",
    signer_certificate_present: false,
    time_stamper_certificate_present: false,
    signer_thumbprint: null,
    signer_subject: null,
    signer_issuer: null,
    signer_team_equivalent: null,
  });
}

function decision({
  nativeQa = "PASS",
  signatures = [
    signature("installer", INSTALLER_SHA),
    signature("installed_executable", EXECUTABLE_SHA),
  ],
  authorityReceipt = approvedAuthority(),
  version = VERSION,
} = {}) {
  return evaluateWindowsReleaseGate({
    nativeQa,
    signatures,
    authorityReceipt,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    releaseId: RELEASE_ID,
    version,
    installerSha256: INSTALLER_SHA,
    installedExecutableSha256: EXECUTABLE_SHA,
    now: NOW,
  });
}

test("unsigned native PASS remains independent and becomes only BLOCKED_BY_AUTHORITY", () => {
  const result = decision({
    signatures: [unsigned("installer", INSTALLER_SHA), unsigned("installed_executable", EXECUTABLE_SHA)],
    authorityReceipt: blockedAuthority(),
  });
  assert.deepEqual(result, {
    native_qa: "PASS",
    windows_release: "BLOCKED_BY_AUTHORITY",
    reason_code: "AUTHENTICODE_SIGNATURE_ABSENT",
    signature_state: "UNSIGNED",
    signer_binding: null,
  });
});

test("HashMismatch, NotTrusted, UnknownError, and mixed signatures are hard failures", () => {
  for (const status of ["HashMismatch", "NotTrusted", "UnknownError"]) {
    const result = decision({
      signatures: [
        signature("installer", INSTALLER_SHA, { status }),
        unsigned("installed_executable", EXECUTABLE_SHA),
      ],
      authorityReceipt: blockedAuthority(),
    });
    assert.equal(result.windows_release, "FAIL");
    assert.notEqual(result.reason_code, "AUTHENTICODE_SIGNATURE_ABSENT");
  }
  assert.equal(decision({
    signatures: [signature("installer", INSTALLER_SHA), unsigned("installed_executable", EXECUTABLE_SHA)],
    authorityReceipt: blockedAuthority(),
  }).windows_release, "FAIL");
});

test("release PASS binds fingerprint, subject, issuer, team equivalent, and exact artifact", () => {
  const result = decision();
  assert.equal(result.windows_release, "PASS");
  assert.deepEqual(result.signer_binding, {
    thumbprint_sha1: SIGNER.thumbprint_sha1,
    subject: SIGNER.subject,
    issuer: SIGNER.issuer,
    team_equivalent: SIGNER.team_equivalent,
    timestamp_verified: true,
    authority_receipt_id: "rfd-tuw-013-approved-authority",
  });
  for (const [field, value] of [
    ["signer_thumbprint", "B".repeat(40)],
    ["signer_subject", "CN=Arbitrary Publisher, O=Arbitrary Publisher, C=US"],
    ["signer_issuer", "CN=Arbitrary Issuer, O=Arbitrary Issuer, C=US"],
    ["signer_team_equivalent", "Arbitrary Publisher"],
  ]) {
    const resultWithArbitrarySigner = decision({
      signatures: [
        signature("installer", INSTALLER_SHA, { [field]: value }),
        signature("installed_executable", EXECUTABLE_SHA, { [field]: value }),
      ],
    });
    assert.equal(resultWithArbitrarySigner.windows_release, "FAIL");
    assert.equal(resultWithArbitrarySigner.reason_code, "AUTHENTICODE_SIGNER_BINDING_FAILED");
  }
  assert.equal(decision({
    signatures: [
      signature("installer", "9".repeat(64)),
      signature("installed_executable", EXECUTABLE_SHA),
    ],
  }).reason_code, "AUTHENTICODE_ARTIFACT_BINDING_FAILED");
});

test("native failure cannot be hidden by valid signing", () => {
  const result = decision({ nativeQa: "FAIL" });
  assert.equal(result.native_qa, "FAIL");
  assert.equal(result.windows_release, "FAIL");
  assert.equal(result.reason_code, "NATIVE_QA_NOT_PASSING");
});

test("stale SHA, version, expiry, and historical v0.1.0 authority receipts are rejected", () => {
  const options = {
    expectedSourceSha: SOURCE_SHA,
    expectedSourceTree: SOURCE_TREE,
    expectedReleaseId: RELEASE_ID,
    expectedVersion: VERSION,
    expectedInstallerSha256: INSTALLER_SHA,
    now: NOW,
  };
  for (const [mutate, code] of [
    [(value) => { value.source_sha = "9".repeat(40); }, "AUTHORITY_SOURCE_MISMATCH"],
    [(value) => { value.release = { ...value.release, version: "0.1.0" }; }, "RELEASE_BINDING_MISMATCH"],
    [(value) => { value.authorization = { ...value.authorization, expires_at: "2026-07-31T11:30:00.000Z" }; }, "AUTHORITY_NOT_CURRENT"],
    [(value) => { value.schema_version = "law-firm-os.matter-desktop-windows-authenticode-approval-intake.v0.1"; }, "AUTHORITY_SCHEMA_MISMATCH"],
  ]) {
    const value = approvedAuthority();
    mutate(value);
    assert.throws(() => validateWindowsSigningAuthorityReceipt(value, options), (error) => error.code === code);
  }
});

function uninstallState(phase) {
  const shortcuts = WINDOWS_UNINSTALL_CONTRACT.shortcut_scopes.flatMap((scope) => (
    WINDOWS_UNINSTALL_CONTRACT.shortcut_names.map((name) => ({
      scope,
      name,
      present: false,
      target_in_install_directory: false,
    }))
  ));
  return {
    schema_version: WINDOWS_UNINSTALL_INVENTORY_SCHEMA,
    contract_schema_version: WINDOWS_UNINSTALL_CONTRACT.schema_version,
    phase,
    install_directory: phase === "before" ? {
      present: true,
      file_count: 3,
      files: [
        { relative_path: "matter.exe", bytes: 10, sha256: "1".repeat(64) },
        { relative_path: "Uninstall matter.exe", bytes: 11, sha256: "2".repeat(64) },
        { relative_path: "resources/matter-build-manifest.json", bytes: 12, sha256: "3".repeat(64) },
      ],
    } : { present: false, file_count: 0, files: [] },
    shortcuts,
    services: [],
    registry: [],
    update_residue: WINDOWS_UNINSTALL_CONTRACT.update_residue_locations.map(({ id }) => ({ id, present: false })),
    inspection_errors: [],
  };
}

test("native PowerShell adapter uses deterministic injected execution without Windows or signing calls", () => {
  const calls = [];
  const fakeExecFileSync = (binary, args, options) => {
    calls.push({ binary, args, env: options.env });
    if (options.env.MATTER_WINDOWS_QA_FILE) {
      return JSON.stringify(signature("installer", INSTALLER_SHA));
    }
    return JSON.stringify(uninstallState("before"));
  };
  const adapter = createWindowsNativeQaPowerShellAdapter({ execFileSync: fakeExecFileSync });
  const signatureRecord = adapter.inspectAuthenticode("C:/qa/matter.exe", "installer");
  const state = adapter.collectUninstallState({ installDir: "C:/qa/matter", phase: "before" });
  assert.equal(signatureRecord.role, "installer");
  assert.equal(state.phase, "before");
  assert.equal(calls.length, 2);
  assert.equal(calls.every(({ binary }) => binary === "powershell.exe"), true);
  assert.equal(calls.every(({ args }) => args.includes("-NonInteractive")), true);
  assert.match(calls[0].args.at(-1), /Get-AuthenticodeSignature/u);
  assert.match(calls[1].args.at(-1), /Get-CimInstance Win32_Service/u);
  assert.doesNotMatch(calls[1].args.at(-1), /SilentlyContinue/u);
  for (const errorCode of [
    "shortcut_inspection_failed",
    "service_inspection_failed",
    "registry_enumeration_failed",
    "registry_property_inspection_failed",
    "update_residue_inspection_failed",
  ]) assert.match(calls[1].args.at(-1), new RegExp(errorCode, "u"));
});

test("native inspection errors fail closed instead of becoming zero residue", () => {
  for (const errorCode of [
    "shortcut_inspection_failed",
    "service_inspection_failed",
    "registry_enumeration_failed",
    "registry_property_inspection_failed",
    "update_residue_inspection_failed",
  ]) {
    const after = uninstallState("after");
    after.inspection_errors = [errorCode];
    assert.throws(
      () => validateWindowsUninstallEvidence({ before: uninstallState("before"), after }),
      (error) => error.code === "NATIVE_INSPECTION_FAILED",
    );
  }
});

test("full uninstall evidence rejects residual file, shortcut, service, registry, and update state", () => {
  const valid = validateWindowsUninstallEvidence({ before: uninstallState("before"), after: uninstallState("after") });
  assert.equal(valid.install_directory_removed, true);
  const mutations = [
    [(value) => { value.install_directory = { ...uninstallState("before").install_directory }; }, "INSTALL_DIRECTORY_RESIDUE"],
    [(value) => { value.shortcuts[0].present = true; }, "SHORTCUT_RESIDUE"],
    [(value) => { value.services.push({ name: "matter", display_name: "matter", path_in_install_directory: true }); }, "SERVICE_RESIDUE"],
    [(value) => { value.registry.push({ hive: "hkcu", key: "matter", display_name_matches: true, install_location_matches: true }); }, "REGISTRY_RESIDUE"],
    [(value) => { value.update_residue[0].present = true; }, "UPDATE_RESIDUE"],
  ];
  for (const [mutate, code] of mutations) {
    const after = uninstallState("after");
    mutate(after);
    assert.throws(() => validateWindowsUninstallEvidence({ before: uninstallState("before"), after }), (error) => error.code === code);
  }
});

test("uninstall inventory cannot omit a declared shortcut scope or update location", () => {
  const shortcutInventory = uninstallState("after");
  shortcutInventory.shortcuts[0] = { ...shortcutInventory.shortcuts[1] };
  assert.throws(
    () => validateWindowsUninstallEvidence({ before: uninstallState("before"), after: shortcutInventory }),
    (error) => error.code === "SHORTCUT_INVENTORY_MISMATCH",
  );

  const updateInventory = uninstallState("after");
  updateInventory.update_residue[0] = { ...updateInventory.update_residue[1] };
  assert.throws(
    () => validateWindowsUninstallEvidence({ before: uninstallState("before"), after: updateInventory }),
    (error) => error.code === "UPDATE_INVENTORY_MISMATCH",
  );
});
