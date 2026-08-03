import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  RF13_DIST_CANARY_RECEIPT_SCHEMA,
  RF13_DIST_GATE_RECEIPT_SCHEMAS,
  RF13_DIST_MANIFEST_SCHEMA,
  RF13_DIST_PRIVACY_MEMBER_SCHEMA,
  RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
  RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA,
  evidenceReferenceForFile,
} from "../../lib/rf13-dist-contract.mjs";
import { HUMAN_AUTHORITY_RECEIPT_SCHEMA } from "../../lib/rf13-dist-authority-contract.mjs";
import { FORMAL_DEPLOYED_API_RESTART_CAPABILITY_SCHEMA } from "../../lib/formal-deployed-api-restart-contract.mjs";
import {
  WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
  WINDOWS_SIGNING_AUTHORITY_SCHEMA,
} from "../../lib/matter-desktop-windows-release-gate.mjs";

export const RF13_DIST_FIXTURE_SOURCE_SHA = "a".repeat(40);
export const RF13_DIST_FIXTURE_SOURCE_TREE = "b".repeat(40);
export const RF13_DIST_FIXTURE_VERSION = "1.2.3";

const RENDERER_ALGORITHM = "sha256(sorted sha256 file manifest with ./ relative paths)";
const ARTIFACT_SPECS = [
  ["macos_build_manifest", "mac/matter-1.2.3-macos-build-manifest.json", "darwin", "build_manifest"],
  ["macos_dmg_image", "mac/matter-1.2.3-macos.dmg", "darwin", "dmg_image"],
  ["macos_zip_archive", "mac/matter-1.2.3-macos.zip", "darwin", "zip_archive"],
  ["macos_build_receipt", "receipts/macos-build.md", "darwin", "receipt"],
  ["macos_release_boundary_receipt", "mac/matter-1.2.3-macos-release-boundary.json", "darwin", "receipt"],
  ["windows_build_manifest", "win/matter-1.2.3-win-build-manifest.json", "win32", "build_manifest"],
  ["windows_installer", "win/matter-1.2.3-win-x64.exe", "win32", "nsis_installer"],
  ["windows_installer_blockmap", "win/matter-1.2.3-win-x64.exe.blockmap", "win32", "installer_blockmap"],
  ["windows_installer_manifest", "win/matter-1.2.3-win-installer-manifest.json", "win32", "installer_manifest"],
  ["windows_manifest_signature", "win/matter-1.2.3-win-installer-manifest.json.sig", "win32", "detached_receipt_signature"],
  ["windows_package_zip", "win/matter-1.2.3-win32-x64-unsigned.zip", "win32", "unsigned_package_zip"],
  ["windows_build_receipt", "receipts/windows-build.md", "win32", "receipt"],
];

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(root, relativePath, value) {
  const absolute = path.join(root, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`);
  return evidenceReferenceForFile(root, relativePath);
}

function writeBytes(root, relativePath, value) {
  const absolute = path.join(root, relativePath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, value);
}

export function writeHandwrittenHumanAuthority(root, evidenceRoot, {
  receiptFile,
  receiptId,
  releaseId,
  environment,
  action,
  sourceSha,
  sourceTree,
  artifactSha256,
  releaseScope,
  canaryUserCount,
  nonce,
} = {}) {
  const signaturePath = `${evidenceRoot}/${receiptFile}.sig`;
  const signature = Buffer.alloc(64, action === "canary_acceptance" ? 0x18 : 0x19);
  writeBytes(root, signaturePath, signature);
  chmodSync(path.join(root, signaturePath), 0o600);
  const receiptPath = `${evidenceRoot}/${receiptFile}.json`;
  const reference = writeJson(root, receiptPath, {
    schema_version: HUMAN_AUTHORITY_RECEIPT_SCHEMA,
    receipt_id: receiptId,
    release_id: releaseId,
    environment,
    action,
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: [...artifactSha256].sort(),
    release_scope: releaseScope,
    canary_user_count: canaryUserCount,
    issued_at: "2026-07-31T00:00:00.000Z",
    expires_at: "2027-07-31T00:00:00.000Z",
    nonce,
    template: false,
    signature: {
      algorithm: "Ed25519",
      key_id: "rf13_release_owner_unapproved",
      fingerprint_sha256: digest("unapproved RF13 release owner public key"),
      signature_sha256: digest(signature),
      path: signaturePath,
    },
  });
  chmodSync(path.join(root, receiptPath), 0o600);
  return reference;
}

function writeCanonicalJson(root, relativePath, value) {
  const reference = writeJson(root, relativePath, value);
  return {
    ...reference,
    bytes: readFileSync(path.join(root, relativePath)).length,
    schema_version: value.schema_version,
    receipt_id: value.receipt_id,
  };
}

function artifactIds(artifacts, platform) {
  return artifacts.filter((artifact) => !platform || artifact.platform === platform).map(({ id }) => id).sort();
}

function cleanShaReceipt(sourceSha, sourceTree) {
  const entrypoints = [
    "scripts/build-matter-desktop-mac.mjs",
    "scripts/build-matter-desktop-win.mjs",
    "scripts/build-matter-desktop-win-installer.mjs",
    "scripts/release-matter-desktop-formal.mjs",
  ];
  return {
    verdict: "PASS",
    mode: "current",
    protected_entrypoints: entrypoints,
    protected_entrypoint_count: entrypoints.length,
    formal_bypass_count: 0,
    structural_contracts: entrypoints.map((relativePath) => ({
      relative_path: relativePath,
      gate_invocation: "top_level",
      formal_channel_binding: "canonical_channel_policy",
      no_mutation_before_gate: true,
      preflight_max_lines: 120,
    })),
    allowed_refs: ["main", "integration/forest-v<semver>", "release/forest-v<semver>", "DETACHED exact SHA"],
    gate: {
      enforced: true,
      verdict: "PASS",
      source_sha: sourceSha,
      source_branch: "main",
      ignored_evidence_dirty_paths: [],
    },
    source_identity: {
      sha: sourceSha,
      tree: sourceTree,
      branch: "main",
      dirty: false,
      dirty_paths: [],
      ignored_generated_evidence_paths: [],
    },
  };
}

function windowsUpstream(root, evidenceRoot, status, artifactHashes, installerSha256, sourceSha, sourceTree) {
  const approved = status === "PASS";
  const releaseId = "matter-desktop-v1.2.3-rfd-tuw-013";
  const thumbprintSha1 = "A".repeat(40);
  const authority = {
    schema_version: WINDOWS_SIGNING_AUTHORITY_SCHEMA,
    receipt_id: approved ? "RFD013-WINDOWS-AUTHORITY-APPROVED" : "RFD013-WINDOWS-AUTHORITY-BLOCKED",
    status: approved ? "APPROVED" : "BLOCKED_BY_AUTHORITY",
    source_sha: sourceSha,
    source_tree: sourceTree,
    release: { id: releaseId, version: RF13_DIST_FIXTURE_VERSION, channel: "formal" },
    artifact_sha256: { installer: approved ? installerSha256 : null },
    signer: approved ? {
      thumbprint_sha1: thumbprintSha1,
      subject: "CN=Matter Release",
      issuer: "CN=Matter Test CA",
      team_equivalent: "AMIC",
    } : null,
    authorization: approved ? {
      recorded_by_human: true,
      approval_reference: "approval:rfd013-windows-release",
      authorized_at: "2026-07-30T00:00:00.000Z",
      expires_at: "2026-08-31T00:00:00.000Z",
    } : { recorded_by_human: false, approval_reference: null, authorized_at: null, expires_at: null },
    boundary: approved ? {
      signing_execution_allowed: true,
      windows_release_signing_approved: true,
      secrets_recorded: false,
    } : {
      signing_execution_allowed: false,
      windows_release_signing_approved: false,
      secrets_recorded: false,
    },
    reason_codes: approved ? [] : ["NO_APPROVED_SIGNING_AUTHORITY_RECEIPT"],
  };
  const authorityRef = writeCanonicalJson(root, `${evidenceRoot}/rfd013-windows-authority.json`, authority);
  const strictReceipt = {
    schema_version: WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
    receipt_id: `RFD013-WINDOWS-NATIVE-${approved ? "SIGNED" : "UNSIGNED"}`,
    native_qa: "PASS",
    windows_release: status,
    reason_code: approved ? null : "AUTHENTICODE_SIGNATURE_ABSENT",
    source: {
      revision: sourceSha,
      source_tree: sourceTree,
      source_dirty: false,
    },
    release: { id: releaseId, version: RF13_DIST_FIXTURE_VERSION, channel: "formal" },
    package: { installer: { sha256: installerSha256 }, release_artifact_sha256: artifactHashes },
    authenticode: {
      authority_receipt: { path: authorityRef.path, sha256: authorityRef.sha256, receipt_id: authorityRef.receipt_id },
      signature_state: approved ? "SIGNED_APPROVED" : "UNSIGNED",
      signer_binding: approved ? { thumbprint_sha1: thumbprintSha1, authority_receipt_id: authority.receipt_id } : null,
    },
    boundaries: {
      native_windows_executed: true,
      historical_receipt_accepted: false,
      certificate_secret_recorded: false,
      authenticode_claim: approved,
    },
  };
  return {
    authorityRef,
    strictRef: writeCanonicalJson(root, `${evidenceRoot}/rfd-tuw-013-windows-native-qa.json`, strictReceipt),
    fingerprint: approved ? digest(thumbprintSha1) : null,
  };
}

function monitoring() {
  const actions = ["home_read", "matter_read", "people_read", "time_entry_read", "billing_read"];
  return {
    duration_minutes: 15,
    five_xx_count: 0,
    timeout_count: 0,
    consecutive_core_read_failures: 0,
    login_failure_count: 0,
    tenant_exposure_count: 0,
    write_integrity_failure_count: 0,
    uncertain_write_result_count: 0,
    signature_or_hash_mismatch_count: 0,
    latency_actions: actions.map((action, index) => ({
      action,
      baseline_median_ms: 100 + index,
      samples_ms: [105, 98, 101, 99, 102],
      recheck_after_minutes: 5,
      recheck_samples_ms: [103, 100, 99, 101, 102],
    })),
  };
}

function canaryChecks() {
  return Object.fromEntries([
    "isolated_profile_install",
    "health",
    "login",
    "home",
    "matter",
    "people",
    "time_billing",
    "restart",
  ].map((key) => [key, "PASS"]));
}

function deployedApiAuthority() {
  return {
    capability_schema_version: "law-firm-os.formal-deployed-api-authority-capability.v1",
    receipt_sha256: digest("rfd015 receipt"),
    api_endpoint_sha256: digest("rfd015 endpoint"),
    api_artifact_sha256: digest("rfd015 api artifact"),
    manifest_sha256: digest("rfd015 manifest"),
    executed_package_sha256: digest("rfd015 executed package"),
    transcript_sha256: digest("rfd015 transcript"),
    package_qa_receipt_sha256: digest("rfd015 package QA receipt"),
    package_qa_transcript_sha256: digest("rfd015 package QA transcript"),
    package_qa_privacy_corpus_sha256: digest("rfd015 package QA privacy corpus"),
    authority_sha256: digest("rfd015 authority"),
  };
}

function restartAuthority() {
  const deployed = deployedApiAuthority();
  return {
    capability_schema_version: FORMAL_DEPLOYED_API_RESTART_CAPABILITY_SCHEMA,
    restart_receipt_sha256: digest("rfd016 restart receipt"),
    api_endpoint_sha256: deployed.api_endpoint_sha256,
    rfd015_receipt_sha256: deployed.receipt_sha256,
    rfd015_capability_schema_version: deployed.capability_schema_version,
    rfd015_authority_sha256: deployed.authority_sha256,
    rfd015_api_artifact_sha256: deployed.api_artifact_sha256,
    rfd015_manifest_sha256: deployed.manifest_sha256,
    rfd015_executed_package_sha256: deployed.executed_package_sha256,
    rfd015_transcript_sha256: deployed.transcript_sha256,
    rfd015_package_qa_receipt_sha256: deployed.package_qa_receipt_sha256,
    rfd015_package_qa_transcript_sha256: deployed.package_qa_transcript_sha256,
    rfd015_package_qa_privacy_corpus_sha256: deployed.package_qa_privacy_corpus_sha256,
  };
}

export function buildReleaseFixture(testContext, {
  windowsReleaseStatus = "BLOCKED_BY_AUTHORITY",
  artifactBodies = {},
  archiveMembers = {},
  sourceSha = RF13_DIST_FIXTURE_SOURCE_SHA,
  sourceTree = RF13_DIST_FIXTURE_SOURCE_TREE,
} = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "rf13-dist-"));
  testContext.after(() => rmSync(root, { recursive: true, force: true }));
  const artifactRoot = `apps/desktop/dist/releases/${RF13_DIST_FIXTURE_VERSION}/${sourceSha}/formal`;
  const artifacts = ARTIFACT_SPECS.map(([id, suffix, platform, kind]) => {
    const artifactPath = `${artifactRoot}/${suffix}`;
    const defaultBody = id === "macos_release_boundary_receipt"
      ? `${JSON.stringify({
        schema_version: "law-firm-os.matter-desktop-macos-release-boundary.v2",
        checkpoint_id: "RFD-TUW-012",
        verdict: "TEST_ONLY",
      }, null, 2)}\n`
      : `artifact:${id}\n`;
    const body = Buffer.from(artifactBodies[id] ?? defaultBody);
    const absolute = path.join(root, artifactPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, body);
    return { id, path: artifactPath, platform, kind, bytes: body.length, sha256: digest(body) };
  });
  const byId = new Map(artifacts.map((artifact) => [artifact.id, artifact]));
  const index = {
    schema_version: "law-firm-os.matter-desktop-release-artifacts.v1",
    version: RF13_DIST_FIXTURE_VERSION,
    source_sha: sourceSha,
    source_tree: sourceTree,
    source_dirty: false,
    channel: "formal",
    app_id: "com.amic.matter.desktop",
    artifact_root: artifactRoot,
    renderer: { sha256: "d".repeat(64), file_count: 5, algorithm: RENDERER_ALGORITHM },
    generated_at: "2026-07-31T00:00:00.000Z",
    generic_build_paths_are_release_truth: false,
    public_release_claim: false,
    production_go_live_claim: false,
    artifacts,
  };
  const indexRef = writeJson(root, `${artifactRoot}/artifact-index.json`, index);
  writeFileSync(
    path.join(root, artifactRoot, "checksums.sha256"),
    `${artifacts.map((artifact) => `${artifact.sha256}  ${artifact.path}`).join("\n")}\n`,
  );

  const evidenceRoot = `${artifactRoot}/evidence`;
  const privacyMembers = artifacts.filter(({ id }) => id !== "windows_installer").map((artifact) => {
    const archive = ["zip_archive", "dmg_image", "unsigned_package_zip"].includes(artifact.kind);
    const buildHash = byId.get(artifact.platform === "darwin" ? "macos_build_manifest" : "windows_build_manifest").sha256;
    const memberPath = archive ? `${evidenceRoot}/members-${artifact.id}.json` : null;
    const members = structuredClone(archiveMembers[artifact.id]
      ?? [{ path: "payload.bin", type: "file", sha256: digest(`payload:${artifact.id}`), bytes: 1 }]);
    const memberRef = archive ? writeJson(root, memberPath, {
      schema_version: "law-firm-os.matter-desktop-member-manifest.v1",
      source_sha: sourceSha,
      source_tree: sourceTree,
      build_manifest_sha256: buildHash,
      channel: "formal",
      requested_runtime_mode: "none",
      effective_runtime_mode: "none",
      runtime_included: false,
      runtime_data_class: "none",
      non_distributable: false,
      distributable: true,
      members,
    }) : null;
    return {
      artifact_id: artifact.id,
      receipt: writeJson(root, `${evidenceRoot}/privacy-${artifact.id}.json`, {
        schema_version: RF13_DIST_PRIVACY_MEMBER_SCHEMA,
        receipt_id: `RFD018-PRIVACY-${artifact.id}`,
        gate: "privacy",
        status: "PASS",
        source_sha: sourceSha,
        source_tree: sourceTree,
        artifact_id: artifact.id,
        artifact_kind: artifact.kind,
        artifact_sha256: artifact.sha256,
        artifact_bytes: artifact.bytes,
        build_manifest_sha256: buildHash,
        runtime_mode: "none",
        scan_method: archive ? "container_bytes_and_expanded_members" : "artifact_bytes",
        expanded_scan_verdict: archive ? "PASS" : "NOT_APPLICABLE",
        finding_count: 0,
        scanned_member_count: archive ? members.length : 1,
        member_manifest_path: memberPath,
        member_manifest_sha256: memberRef?.sha256 ?? null,
        container_byte_verdict: "PASS",
        container_byte_finding_count: 0,
        container_raw_uninspected_count: archive ? 1 : 0,
        inspection_method: artifact.kind === "dmg_image" ? "dmg_readonly_mount" : archive ? "zip_extract" : "artifact_bytes",
        omitted_member_count: 0,
        uninspected_archive_count: 0,
        executed: true,
        authoritative: true,
        template: false,
      }),
    };
  });
  const directoryId = "windows_package_directory";
  const windowsBuildManifestSha256 = byId.get("windows_build_manifest").sha256;
  const directoryMemberPath = `${evidenceRoot}/members-${directoryId}.json`;
  const directoryMemberRef = writeJson(root, directoryMemberPath, {
    schema_version: "law-firm-os.matter-desktop-member-manifest.v1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    build_manifest_sha256: windowsBuildManifestSha256,
    channel: "formal",
    requested_runtime_mode: "none",
    effective_runtime_mode: "none",
    runtime_included: false,
    runtime_data_class: "none",
    non_distributable: false,
    distributable: true,
    members: [{ path: "matter.exe", type: "file", sha256: digest("expanded Windows package executable"), bytes: 1 }],
  });
  const directoryMemberBytes = readFileSync(path.join(root, directoryMemberPath)).length;
  privacyMembers.push({
    artifact_id: directoryId,
    receipt: writeJson(root, `${evidenceRoot}/privacy-${directoryId}.json`, {
      schema_version: RF13_DIST_PRIVACY_MEMBER_SCHEMA,
      receipt_id: "RFD018-PRIVACY-windows-package-directory",
      gate: "privacy",
      status: "PASS",
      source_sha: sourceSha,
      source_tree: sourceTree,
      artifact_id: directoryId,
      artifact_kind: "expanded_directory",
      artifact_sha256: directoryMemberRef.sha256,
      artifact_bytes: directoryMemberBytes,
      build_manifest_sha256: windowsBuildManifestSha256,
      runtime_mode: "none",
      scan_method: "expanded_members",
      expanded_scan_verdict: "PASS",
      finding_count: 0,
      scanned_member_count: 1,
      member_manifest_path: directoryMemberPath,
      member_manifest_sha256: directoryMemberRef.sha256,
      container_byte_verdict: "NOT_APPLICABLE",
      container_byte_finding_count: 0,
      container_raw_uninspected_count: 0,
      inspection_method: "expanded_tree_snapshot",
      omitted_member_count: 0,
      uninspected_archive_count: 0,
      executed: true,
      authoritative: true,
      template: false,
    }),
  });

  const gateIds = {
    clean_sha: artifactIds(artifacts),
    macos_release: ["macos_dmg_image"],
    windows_native_qa: artifactIds(artifacts, "win32"),
    windows_release: artifactIds(artifacts, "win32"),
    exact_source_api: ["macos_dmg_image", "macos_zip_archive"],
    login: ["macos_dmg_image", "macos_zip_archive"],
    restart: ["macos_dmg_image", "macos_zip_archive"],
    rollback: ["macos_dmg_image", "macos_zip_archive"],
  };
  const gates = {
    privacy: { status: "PASS", index: null, members: privacyMembers, reason_code: null },
    clean_sha: {
      status: "PASS",
      artifact_ids: gateIds.clean_sha,
      receipt: writeJson(root, `${evidenceRoot}/clean-sha-gate.json`, cleanShaReceipt(sourceSha, sourceTree)),
      reason_code: null,
    },
  };
  let windowsStrictRef;
  for (const [gate, ids] of Object.entries(gateIds).filter(([gate]) => gate !== "clean_sha")) {
    const status = gate === "windows_release" ? windowsReleaseStatus : "PASS";
    const hashes = ids.map((id) => byId.get(id).sha256).sort();
    let receipt;
    if (gate === "windows_release") {
      const upstream = windowsUpstream(
        root,
        evidenceRoot,
        status,
        hashes,
        byId.get("windows_installer").sha256,
        sourceSha,
        sourceTree,
      );
      windowsStrictRef = upstream.strictRef;
      receipt = {
        schema_version: RF13_DIST_GATE_RECEIPT_SCHEMAS[gate],
        receipt_id: `RFD018-${gate}`,
        gate,
        status,
        source_sha: sourceSha,
        source_tree: sourceTree,
        artifact_sha256: hashes,
        decision_evaluated: true,
        native_qa_executed: true,
        signing_execution: status === "PASS",
        approved_certificate_fingerprint_sha256: upstream.fingerprint,
        rfd013_receipt: upstream.strictRef,
        authority_receipt: upstream.authorityRef,
        authoritative: true,
        template: false,
      };
    } else if (gate === "exact_source_api" || gate === "login" || gate === "restart") {
      receipt = {
        schema_version: RF13_DIST_GATE_RECEIPT_SCHEMAS[gate],
        receipt_id: `RFD018-${gate}`,
        gate,
        status,
        source_sha: sourceSha,
        source_tree: sourceTree,
        artifact_sha256: hashes,
        authority: gate === "restart" ? restartAuthority() : deployedApiAuthority(),
        executed: true,
        authoritative: true,
        template: false,
      };
    } else {
      receipt = {
        schema_version: RF13_DIST_GATE_RECEIPT_SCHEMAS[gate],
        receipt_id: `RFD018-${gate}`,
        gate,
        status,
        source_sha: sourceSha,
        source_tree: sourceTree,
        artifact_sha256: hashes,
        executed: true,
        authoritative: true,
        template: false,
      };
    }
    gates[gate] = {
      status,
      artifact_ids: ids,
      receipt: writeJson(root, `${evidenceRoot}/${gate}.json`, receipt),
      reason_code: null,
    };
  }

  const installer = byId.get("windows_installer");
  const payloadDigest = digest("members:windows-installer-source-payload");
  const builderReceiptPath = `${evidenceRoot}/matter-${RF13_DIST_FIXTURE_VERSION}-win-x64.exe.privacy-builder.json`;
  const builderReceipt = {
    schema_version: RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
    receipt_id: "RFD018-PRIVACY-windows-installer-builder",
    gate: "privacy",
    status: "PENDING_NATIVE",
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_id: installer.id,
    artifact_sha256: installer.sha256,
    artifact_bytes: installer.bytes,
    scan_method: "container_bytes_and_source_payload",
    finding_count: 0,
    source_payload_member_count: 3,
    omitted_member_count: 0,
    uninspected_archive_count: 1,
    source_payload_manifest_sha256: payloadDigest,
    native_completion_required: true,
    executed: true,
    authoritative: true,
    template: false,
  };
  const canonicalBuilderRef = writeCanonicalJson(root, builderReceiptPath, builderReceipt);
  privacyMembers.push({
    artifact_id: installer.id,
    builder_receipt: { path: canonicalBuilderRef.path, sha256: canonicalBuilderRef.sha256 },
    native_receipt: writeJson(root, `${evidenceRoot}/rf13-dist-windows-installer-native-privacy-receipt.json`, {
      schema_version: RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA,
      receipt_id: "RFD018-PRIVACY-windows-installer-native",
      gate: "windows_installer_privacy_completion",
      status: "PASS",
      source_sha: sourceSha,
      source_tree: sourceTree,
      artifact_id: installer.id,
      installer_sha256: installer.sha256,
      builder_receipt: canonicalBuilderRef,
      native_qa_receipt: windowsStrictRef,
      source_payload_manifest_sha256: payloadDigest,
      source_payload_member_count: 3,
      installed_root_member_manifest_sha256: digest("members:windows-installer-native-root"),
      installed_root_member_count: 4,
      scan_method: "native_installed_tree_shared_corpus",
      finding_count: 0,
      omitted_member_count: 0,
      uninspected_archive_count: 0,
      uninstall_residue_count: 0,
      executed: true,
      authoritative: true,
      template: false,
    }),
  });
  const indexedPrivacyReference = (reference) => ({
    path: reference.path,
    sha256: reference.sha256,
    bytes: readFileSync(path.join(root, reference.path)).length,
  });
  const privacyIndexMembers = privacyMembers.map((member) => (
    member.artifact_id === "windows_installer"
      ? {
        artifact_id: member.artifact_id,
        status: "PENDING_NATIVE",
        builder_receipt: indexedPrivacyReference(member.builder_receipt),
      }
      : {
        artifact_id: member.artifact_id,
        status: "PASS",
        receipt: indexedPrivacyReference(member.receipt),
      }
  )).sort((left, right) => left.artifact_id.localeCompare(right.artifact_id, "en"));
  gates.privacy.index = writeJson(root, `${evidenceRoot}/privacy-index.json`, {
    schema_version: "law-firm-os.rfd-tuw-007.staged-privacy-evidence.v1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    channel: "formal",
    corpus_sha256: digest("RFD007 fixture privacy corpus"),
    status: "PENDING_WINDOWS_NATIVE",
    members: privacyIndexMembers,
  });

  const dmg = byId.get("macos_dmg_image");
  const canaryAuthority = writeHandwrittenHumanAuthority(root, evidenceRoot, {
    receiptFile: "canary-authority",
    receiptId: "RFD018-CANARY-AUTHORITY",
    releaseId: `RF13-DIST-${RF13_DIST_FIXTURE_VERSION}-${sourceSha}`,
    environment: "canary",
    action: "canary_acceptance",
    sourceSha,
    sourceTree,
    artifactSha256: [dmg.sha256],
    releaseScope: "macos_canary",
    canaryUserCount: 2,
    nonce: "RFD018-CANARY-NONCE-0001",
  });
  const canaryReceipt = {
    schema_version: RF13_DIST_CANARY_RECEIPT_SCHEMA,
    receipt_id: "RFD018-CANARY-RECEIPT",
    status: "PASS",
    template: false,
    source_sha: sourceSha,
    source_tree: sourceTree,
    macos_artifact_sha256: dmg.sha256,
    observation_mode: "authoritative_canary",
    user_count: 2,
    checks: canaryChecks(),
    monitoring: monitoring(),
    rollback_trigger: { triggered: false, codes: [], source: "authoritative_observation" },
    evidence: { authority_receipt: canaryAuthority },
    boundary: {
      monitor_read_only: true,
      network_contacted_by_monitor: true,
      mutation_executed_by_monitor: false,
      identities_recorded: false,
      private_hashes_recorded: false,
      real_canary_executed_by_monitor: true,
    },
    reason_codes: [],
  };
  gates.canary = {
    status: "PASS",
    artifact_ids: ["macos_dmg_image"],
    receipt: writeJson(root, `${evidenceRoot}/canary.json`, canaryReceipt),
    reason_code: null,
  };

  const manifest = {
    schema_version: RF13_DIST_MANIFEST_SCHEMA,
    manifest_id: "RF13-DIST",
    status: "PASS",
    template: false,
    source: { sha: sourceSha, tree: sourceTree, dirty: false },
    release: {
      version: RF13_DIST_FIXTURE_VERSION,
      channel: "formal",
      app_id: "com.amic.matter.desktop",
      artifact_root: artifactRoot,
      release_index: indexRef,
    },
    artifacts: structuredClone(artifacts),
    gates,
    claims: {
      rf13_dist_complete: true,
      macos_external_distribution_ready: true,
      windows_external_distribution_ready: windowsReleaseStatus === "PASS",
      production_go_live: false,
    },
    production_authority_receipt: null,
    boundary: {
      validator_read_only: true,
      network_contacted_by_validator: false,
      mutation_executed_by_validator: false,
      historical_internal_rf13_accepted: false,
      identities_recorded: false,
      private_hashes_recorded: false,
    },
    sealed_at: "2026-07-31T00:30:00.000Z",
    reason_codes: [],
  };
  return { root, artifactRoot, artifacts, manifest, canaryReceipt, evidenceRoot };
}
