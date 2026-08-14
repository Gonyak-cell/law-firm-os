import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, statSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  PRODUCTION_TRUST_ROOT_POLICY,
  verifyDetachedReceipt,
  verifyProductionTrustedRegistry,
  verifyTrustedRegistry,
} from "../lib/external-release-trust.mjs";
import { CANONICAL_CONTRACT_SHA256, main, validateExternalReleaseReadiness } from "../validate-external-release-readiness.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.env.NODE_ENV = "test";
const contractBytes = readFileSync(path.join(repoRoot, "contracts/external-release-readiness-contract.json"));
const RECEIPT_SCHEMA_VERSION = "law-firm-os.external-release-receipt.v0.2";
const INTERNAL_PROVISIONING_RECEIPT_SCHEMA_VERSION = "law-firm-os.external-tenant-provisioning-receipt.v1";

test("canonical readiness contract constant matches the exact current bytes", () => {
  assert.equal(hash(contractBytes), CANONICAL_CONTRACT_SHA256);
});

function hash(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function writeBytes(root, relativePath, bytes) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  return { path: relativePath, sha256: hash(bytes) };
}

function writeJson(root, relativePath, value) {
  return writeBytes(root, relativePath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

function writeSignedJson(root, relativePath, value, keyPair) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const receiptRef = writeBytes(root, relativePath, bytes);
  const signatureRef = writeBytes(root, `${relativePath}.sig`, sign(null, bytes, keyPair.privateKey));
  return { ...receiptRef, signature_ref: signatureRef };
}

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ exited: true, code: child.exitCode, signal: child.signalCode, error: null });
  }
  return new Promise((resolve) => {
    let settled = false;
    let timer;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("exit", onExit);
      child.off("error", onError);
      resolve(result);
    };
    const onExit = (code, signal) => finish({ exited: true, code, signal, error: null });
    const onError = (error) => finish({ exited: true, code: child.exitCode, signal: child.signalCode, error });
    child.once("exit", onExit);
    child.once("error", onError);
    timer = setTimeout(() => finish({ exited: false, code: null, signal: null, error: null }), timeoutMs);
  });
}

async function cleanupRaceChild(child, { signalIfWaiting = false } = {}) {
  if (!child) return { exited: true, code: null, signal: null, error: null, forced: false };
  if (signalIfWaiting && child.exitCode === null && child.signalCode === null && child.connected) {
    try {
      child.send("cleanup", () => {});
    } catch {
      // The child may have exited between the state check and send.
    }
  }
  let result = await waitForChildExit(child, 2_000);
  let forced = false;
  if (!result.exited) {
    forced = true;
    child.kill("SIGTERM");
    result = await waitForChildExit(child, 1_000);
  }
  if (!result.exited) {
    child.kill("SIGKILL");
    result = await waitForChildExit(child, 1_000);
  }
  return { ...result, forced };
}

function bindingSha256({ pilot_id, lawos_tenant_id, entra_tenant_id, source_sha, source_tree, version }) {
  return hash(Buffer.from(JSON.stringify({ pilot_id, lawos_tenant_id, entra_tenant_id, source_sha, source_tree, version }), "utf8"));
}

function receiptBase({ receipt_type, receipt_source, pilot_id, source_sha, source_tree, lawos_tenant_id = null, entra_tenant_id = null, version, verdict = "PASS", key_id = "release-evidence-key-001", role = receipt_source, operation = receipt_type }) {
  return {
    schema_version: RECEIPT_SCHEMA_VERSION,
    receipt_type,
    receipt_source,
    verdict,
    key_id,
    issued_at: "2026-08-12T01:30:00Z",
    expires_at: "2026-12-31T23:59:59Z",
    pilot_id,
    ...(lawos_tenant_id ? { lawos_tenant_id } : {}),
    ...(entra_tenant_id ? { entra_tenant_id } : {}),
    source_sha,
    source_tree,
    version,
    artifact_sha256: "b".repeat(64),
    binding_sha256: bindingSha256({ pilot_id, lawos_tenant_id, entra_tenant_id, source_sha, source_tree, version }),
    role,
    operation,
  };
}

const WINDOWS_SIGNER_CERTIFICATE_SHA1 = "A".repeat(40);

function windowsUninstallerAuthenticode() {
  return {
    status: "Valid",
    status_message: "Signature verified.",
    signature_type: "Authenticode",
    time_stamper_certificate_present: true,
    signer_subject: "CN=AMIC Law",
    signer_issuer: "CN=SSL.com Code Signing CA",
    signer_serial_number: "01AB",
    signer_thumbprint: WINDOWS_SIGNER_CERTIFICATE_SHA1,
    signer_certificate_sha256: "C".repeat(64),
    signer_not_before: "2026-01-01T00:00:00.000Z",
    signer_not_after: "2027-01-01T00:00:00.000Z",
    signer_public_key_algorithm_oid: "1.2.840.113549.1.1.1",
    signer_signature_algorithm_oid: "1.2.840.113549.1.1.11",
    signer_eku_oids: ["1.3.6.1.5.5.7.3.3"],
    timestamp_subject: "CN=SSL.com Timestamp Responder",
    timestamp_issuer: "CN=SSL.com Timestamp CA",
    timestamp_serial_number: "02CD",
    timestamp_thumbprint: "B".repeat(40),
    timestamp_certificate_sha256: "D".repeat(64),
    timestamp_not_before: "2026-01-01T00:00:00.000Z",
    timestamp_not_after: "2030-01-01T00:00:00.000Z",
    timestamp_public_key_algorithm_oid: "1.2.840.113549.1.1.1",
    timestamp_signature_algorithm_oid: "1.2.840.113549.1.1.11",
    timestamp_eku_oids: ["1.3.6.1.5.5.7.3.8"],
  };
}

function makeWindowsCandidateEvidence(root, candidate) {
  const installerBytes = Buffer.from(`signed-${candidate.role}-windows-installer`);
  const installerRef = writeBytes(root, `windows/${candidate.role}/matter-${candidate.version}.exe`, installerBytes);
  const executableSha256 = candidate.role === "baseline" ? "1".repeat(64) : "2".repeat(64);
  const installedTreeFileBytes = 25;
  const installedExecutablePath = "./matter.exe";
  const uninstallerPath = "./Uninstall matter.exe";
  const uninstallerSha256 = candidate.role === "baseline" ? "7".repeat(64) : "8".repeat(64);
  const uninstallerBytes = candidate.role === "baseline" ? 31 : 32;
  const nativeIdentitySha256 = candidate.role === "baseline" ? "3".repeat(64) : "4".repeat(64);
  const installedTreeEntries = [
    { path: installedExecutablePath, sha256: executableSha256, bytes: installedTreeFileBytes },
    { path: uninstallerPath, sha256: uninstallerSha256, bytes: uninstallerBytes },
  ].sort((left, right) => Buffer.compare(Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8")));
  const installedTreeBytes = installedTreeEntries.reduce((sum, entry) => sum + entry.bytes, 0);
  const installedTreeSha256 = hash(Buffer.from(installedTreeEntries.map((entry) => `${entry.sha256} ${entry.bytes} ${entry.path}\n`).join("")));
  const nativeSnapshot = {
    schema_version: "law-firm-os.windows-installed-tree-native-snapshot.v1",
    filesystem: "NTFS",
    content_sha256: installedTreeSha256,
    identity_sha256: nativeIdentitySha256,
    file_count: installedTreeEntries.length,
    directory_count: 1,
    bytes: installedTreeBytes,
    fixed_point_sequence: ["B0", "I1", "B1", "I2", "B2"],
    fixed_point_exact: true,
    equality_proof: "B0_I1_B1_I2_B2_PUBLIC_AND_PRIVATE_MANIFEST_EXACT_EQUALITY",
    phases: ["B0", "I1", "B1", "I2", "B2"].map((name) => ({
      name,
      content_sha256: installedTreeSha256,
      identity_sha256: nativeIdentitySha256,
      file_count: installedTreeEntries.length,
      directory_count: 1,
      bytes: installedTreeBytes,
    })),
  };
  const installedTree = {
    schema_version: nativeSnapshot.schema_version,
    content_sha256: nativeSnapshot.content_sha256,
    identity_sha256: nativeSnapshot.identity_sha256,
    file_count: nativeSnapshot.file_count,
    directory_count: nativeSnapshot.directory_count,
    bytes: nativeSnapshot.bytes,
    installed_executable_path: installedExecutablePath,
    installed_executable_sha256: executableSha256,
    installed_executable_bytes: installedTreeFileBytes,
  };
  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: `urn:uuid:${candidate.role === "baseline" ? "11111111-1111-5111-8111-111111111111" : "22222222-2222-5222-8222-222222222222"}`,
    version: 1,
    metadata: {
      timestamp: "2026-08-12T01:10:00.000Z",
      component: {
        type: "application",
        name: "matter-desktop-windows-installed-tree",
        version: candidate.version,
        properties: [
          { name: "law-firm-os:schema-version", value: "law-firm-os.matter-desktop-installed-tree-sbom.v1" },
          { name: "law-firm-os:source-sha", value: candidate.source_sha },
          { name: "law-firm-os:source-tree", value: candidate.source_tree },
          { name: "law-firm-os:installer-sha256", value: installerRef.sha256 },
          { name: "law-firm-os:packaged-executable-sha256", value: executableSha256 },
          { name: "law-firm-os:installed-executable-sha256", value: executableSha256 },
          { name: "law-firm-os:installed-executable-path", value: installedExecutablePath },
          { name: "law-firm-os:installed-tree-sha256", value: installedTreeSha256 },
          { name: "law-firm-os:installed-tree-file-count", value: String(installedTreeEntries.length) },
          { name: "law-firm-os:installed-tree-bytes", value: String(installedTreeBytes) },
          { name: "law-firm-os:installed-file-content-complete", value: "true" },
          { name: "law-firm-os:installed-directory-identity-complete", value: "true" },
          { name: "law-firm-os:native-snapshot-schema-version", value: "law-firm-os.windows-installed-tree-native-snapshot.v1" },
          { name: "law-firm-os:native-filesystem", value: "NTFS" },
          { name: "law-firm-os:native-directory-count", value: "1" },
          { name: "law-firm-os:native-identity-sha256", value: nativeIdentitySha256 },
          { name: "law-firm-os:native-fixed-point-sequence", value: "B0->I1->B1->I2->B2" },
          { name: "law-firm-os:native-fixed-point-exact", value: "true" },
          { name: "law-firm-os:dependency-inventory-complete", value: "false" },
          { name: "law-firm-os:dependency-inventory-scope", value: "direct-runtime-declarations" },
          { name: "law-firm-os:reparse-point-count", value: "0" },
          { name: "law-firm-os:alternate-data-stream-count", value: "0" },
          { name: "law-firm-os:authenticode-valid", value: "true" },
          { name: "law-firm-os:signer-certificate-sha1", value: WINDOWS_SIGNER_CERTIFICATE_SHA1 },
          { name: "law-firm-os:timestamp-certificate-sha1s", value: "B".repeat(40) },
        ],
      },
    },
    components: installedTreeEntries.map((entry) => ({
      type: "file",
      name: entry.path,
      hashes: [{ alg: "SHA-256", content: entry.sha256.toUpperCase() }],
      properties: [{ name: "law-firm-os:file-bytes", value: String(entry.bytes) }],
    })),
  };
  const sbomRef = writeJson(root, `windows/${candidate.role}/installed-tree-sbom.cdx.json`, sbom);
  const qa = {
    schema_version: "law-firm-os.formal-windows-package-qa.v1",
    generated_at: "2026-08-12T01:11:00.000Z",
    verdict: "PASS",
    native_verdict: "PASS",
    source: { revision: candidate.source_sha, source_tree: candidate.source_tree, source_dirty: false },
    package: {
      channel: "formal",
      app_id: "com.amic.matter.desktop",
      installer: { path: `matter-${candidate.version}.exe`, sha256: installerRef.sha256 },
      uninstaller: {
        path: uninstallerPath,
        sha256: uninstallerSha256,
        bytes: uninstallerBytes,
        installed_tree_path: uninstallerPath,
        installed_tree_sha256: uninstallerSha256,
        uninstaller_bytes: uninstallerBytes,
        authenticode: windowsUninstallerAuthenticode(),
        authenticode_valid: true,
        lock_mode: "FileShare.Read",
        denies_write_delete: true,
        process: { pid: candidate.role === "baseline" ? 8101 : 8102, path_identity: "pid_executable_path" },
        exit_code: 0,
      },
      build_manifest_embedded: true,
      formal_marker_embedded: true,
      formal_local_api_default_disabled: true,
    },
    scenarios: {
      nsis_install_completed: true,
      forest_login_rendered: true,
      signed_in: true,
      leave_rendered: true,
      payroll_rendered: true,
      restart_session_restored: true,
      nsis_uninstall_completed: true,
    },
    authenticode: {
      valid: true,
      expected_signer_certificate_sha1: WINDOWS_SIGNER_CERTIFICATE_SHA1,
      signer: { thumbprint: WINDOWS_SIGNER_CERTIFICATE_SHA1 },
      timestamps: [{ thumbprint: "B".repeat(40) }, { thumbprint: "B".repeat(40) }],
      signer_code_signing_eku_verified: true,
      timestamp_eku_verified: true,
    },
    sbom: {
      schema_version: "law-firm-os.matter-desktop-installed-tree-sbom.v1",
      format: "CycloneDX",
      spec_version: "1.5",
      sha256: sbomRef.sha256,
      installed_tree_sha256: installedTreeSha256,
      installed_tree_file_count: installedTreeEntries.length,
      installed_tree_bytes: installedTreeBytes,
      post_runtime_tree_sha256: installedTreeSha256,
      post_runtime_native_identity_sha256: nativeIdentitySha256,
      post_runtime_byte_identical: true,
      installed_binary_complete: true,
      installed_file_content_complete: true,
      installed_directory_identity_complete: true,
      native_snapshot_schema_version: "law-firm-os.windows-installed-tree-native-snapshot.v1",
      native_filesystem: "NTFS",
      native_directory_count: 1,
      native_identity_sha256: nativeIdentitySha256,
      native_fixed_point_sequence: ["B0", "I1", "B1", "I2", "B2"],
      native_fixed_point_exact: true,
      native_snapshot: nativeSnapshot,
      reparse_point_count: 0,
      alternate_data_stream_count: 0,
      hard_link_count: 0,
      authenticode_bound: true,
    },
    boundaries: {
      real_employee_write: false,
      production_runtime_used: false,
      aws_write: false,
      public_release_claim: false,
      production_go_live_claim: false,
      authenticode_claim: true,
    },
  };
  const qaRef = writeJson(root, `windows/${candidate.role}/native-package-qa.json`, qa);
  const buildManifest = {
    schema_version: "law-firm-os.matter-desktop-build-provenance.v1",
    source_sha: candidate.source_sha,
    source_tree: candidate.source_tree,
    source_dirty: false,
    version: candidate.version,
    channel: "formal",
    app_id: "com.amic.matter.desktop",
    platform: "win32",
    arch: "x64",
    public_release_claim: false,
    production_go_live_claim: false,
  };
  const buildManifestRef = writeJson(root, `windows/${candidate.role}/build-manifest.json`, buildManifest);
  const kmsKeyArn = "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-2222-4333-8444-555555555555";
  const retainUntil = "2030-01-01T00:00:00.000Z";
  const objectProof = (kind, ref) => {
    const bytes = readFileSync(path.join(root, ref.path));
    const versionId = `${candidate.role}-${kind}-immutable-version-id`;
    const providerChecksumSha256 = createHash("sha256").update(bytes).digest("base64");
    return {
      sha256: ref.sha256,
      bytes: bytes.length,
      key: `windows-signed-artifacts/v1/${candidate.source_sha}/${candidate.version}/${candidate.role}/${kind}/sha256/${ref.sha256}/${path.basename(ref.path)}`,
      version_id: versionId,
      upload: { status: "PASS", artifact_sha256: ref.sha256, bytes: bytes.length, digest_verified: true, provider_checksum_sha256: providerChecksumSha256 },
      head_readback: {
        status: "PASS",
        version_id: versionId,
        content_length: bytes.length,
        artifact_sha256_metadata: ref.sha256,
        server_side_encryption: "aws:kms",
        kms_key_arn: kmsKeyArn,
        provider_checksum_sha256: providerChecksumSha256,
        object_lock_mode: "COMPLIANCE",
        retain_until: retainUntil,
      },
      get_readback: {
        status: "PASS",
        version_id: versionId,
        content_length: bytes.length,
        sha256: ref.sha256,
        provider_checksum_sha256: providerChecksumSha256,
        digest_verified: true,
        server_side_encryption: "aws:kms",
        kms_key_arn: kmsKeyArn,
        object_lock_mode: "COMPLIANCE",
        retain_until: retainUntil,
      },
    };
  };
  const handoffArtifacts = {
    installer: objectProof("installer", installerRef),
    build_manifest: objectProof("build_manifest", buildManifestRef),
    native_package_qa: objectProof("native_package_qa", qaRef),
    installed_tree_sbom: objectProof("installed_tree_sbom", sbomRef),
  };
  const handoff = {
    schema_version: "law-firm-os.windows-signed-artifact-private-handoff.v1",
    generated_at: "2026-08-12T01:12:00.000Z",
    verdict: "PASS",
    candidate_role: candidate.role,
    source_sha: candidate.source_sha,
    source_tree: candidate.source_tree,
    version: candidate.version,
    installer_sha256: installerRef.sha256,
    installer_bytes: installerBytes.length,
    build_manifest_sha256: buildManifestRef.sha256,
    installed_tree_sbom_sha256: sbomRef.sha256,
    native_package_qa_sha256: qaRef.sha256,
    artifacts: handoffArtifacts,
    storage: {
      provider: "aws_s3",
      account_id: "770880870480",
      region: "ap-northeast-2",
      bucket: "amic-lawos-private-release-artifacts",
      key: handoffArtifacts.installer.key,
      version_id: handoffArtifacts.installer.version_id,
      versioning_enabled: true,
      ownership: "BucketOwnerEnforced",
      encryption: { mode: "aws:kms", kms_key_arn: kmsKeyArn },
      immutability: { object_lock_mode: "COMPLIANCE", retain_until: retainUntil },
      upload: handoffArtifacts.installer.upload,
      head_readback: handoffArtifacts.installer.head_readback,
      get_readback: handoffArtifacts.installer.get_readback,
    },
    claim_policy: { private_distribution: true, public_distribution: false, external_distribution: false, production_go_live: false },
  };
  const handoffRef = writeJson(root, `windows/${candidate.role}/private-handoff.json`, handoff);
  const releaseManifest = {
    version: candidate.version,
    sourceSha: candidate.source_sha,
    sourceTree: candidate.source_tree,
    artifactSha256: installerRef.sha256,
    artifactBytes: installerBytes.length,
  };
  const releaseManifestRef = writeJson(root, `windows/${candidate.role}/release-manifest.json`, releaseManifest);
  return {
    candidate: {
      role: candidate.role,
      source_sha: candidate.source_sha,
      source_tree: candidate.source_tree,
      version: candidate.version,
      artifact_sha256: installerRef.sha256,
      artifact_bytes: installerBytes.length,
      build_manifest_sha256: buildManifestRef.sha256,
      release_manifest_sha256: releaseManifestRef.sha256,
      runner_installed_executable_sha256: executableSha256,
      artifacts: {
        installer: installerRef,
        build_manifest: buildManifestRef,
        installed_tree_sbom: sbomRef,
        native_package_qa: qaRef,
        private_handoff: handoffRef,
        release_manifest: releaseManifestRef,
      },
    },
    installerRef,
    sbom,
    sbomRef,
    qa,
    qaRef,
    handoff,
    handoffRef,
    executableSha256,
    uninstallerPath,
    uninstallerSha256,
    uninstallerBytes,
    installedTree,
    nativeSnapshot,
    buildManifest,
    buildManifestRef,
    releaseManifest,
    releaseManifestRef,
  };
}

function makeCompleteFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "lawos-external-release-"));
  writeBytes(root, "contracts/external-release-readiness-contract.json", contractBytes);
  const keyPair = generateKeyPairSync("ed25519");
  const updateKeyPair = generateKeyPairSync("ed25519");
  const rootKeyPair = generateKeyPairSync("ed25519");
  const sourceSha = "a".repeat(40);
  const sourceTree = "d".repeat(40);
  const pilotId = "pilot-law-firm-001";
  const lawosTenantId = "lawos-law-firm-001";
  const entraTenantId = "11111111-2222-4333-8444-555555555555";
  const version = "1.2.3";
  const packageBytes = Buffer.from("not-a-real-dmg-test-fixture");
  const packageSha256 = hash(packageBytes);
  const issuer = `https://login.microsoftonline.com/${entraTenantId}/v2.0`;
  const oidcConfigVersion = "oidc-config-v1";
  const windowsBaseline = makeWindowsCandidateEvidence(root, {
    role: "baseline",
    source_sha: "9".repeat(40),
    source_tree: "8".repeat(40),
    version: "1.2.2",
  });
  const windowsTarget = makeWindowsCandidateEvidence(root, {
    role: "target",
    source_sha: sourceSha,
    source_tree: sourceTree,
    version,
  });
  const windowsUpdateOperations = [
    "baseline_install",
    "target_update",
    "target_uninstall_for_rollback",
    "baseline_rollback",
    "final_uninstall",
    "failure_cleanup",
  ];
  const updateTenantConfigSha256 = "5".repeat(64);
  const updateReleaseManifestSha256s = {
    baseline: windowsBaseline.releaseManifestRef.sha256,
    target: windowsTarget.releaseManifestRef.sha256,
  };
  const updatePublicKeySpkiSha256 = hash(updateKeyPair.publicKey.export({ type: "spki", format: "der" }));
  const updateRunnerSource = { source_sha: "6".repeat(40), source_tree: "7".repeat(40), source_dirty: false };
  const allowedReceiptTypes = [
    "api_artifact_deployment",
    "tenant_provisioning_adapter",
    "tenant_pinned_runtime_binding",
    "multi_tenant_runtime_review",
    "m365_consent_deployment_visibility",
    "macos_distribution_artifacts",
    "windows_distribution_update_rollback",
    "operations_support_rollback",
    "backup_restore_rehearsal",
    "legal_owner_approval",
  ];
  const registry = {
    schema_version: "law-firm-os.external-release-trust-registry.v1",
    registry_serial: 1,
    generated_at: "2026-08-12T01:00:00Z",
    keys: [{
      key_id: "release-evidence-key-001",
      algorithm: "Ed25519",
      public_key_spki_pem: keyPair.publicKey.export({ type: "spki", format: "pem" }),
      valid_from: "2020-01-01T00:00:00Z",
      valid_until: "2030-01-01T00:00:00Z",
      revoked_at: null,
      allowed_receipt_sources: ["release_pipeline", "internal_provisioning_adapter", "external_provider", "independent_runtime_review", "microsoft_365_provider", "operations_owner", "legal_owner"],
      allowed_receipt_types: allowedReceiptTypes,
      allowed_pilot_ids: [pilotId],
      allowed_lawos_tenant_ids: [lawosTenantId],
      allowed_entra_tenant_ids: [entraTenantId],
      allowed_source_shas: [sourceSha, windowsBaseline.candidate.source_sha, updateRunnerSource.source_sha],
      allowed_source_trees: [sourceTree, windowsBaseline.candidate.source_tree, updateRunnerSource.source_tree],
      allowed_versions: [version, windowsBaseline.candidate.version],
      allowed_roles: ["release_pipeline", "internal_provisioning_adapter", "external_provider", "independent_runtime_review", "microsoft_365_provider", "operations_owner", "legal_owner"],
      allowed_operations: ["api_artifact_deployment", "tenant_provisioning_adapter", "tenant_runtime_binding", "m365_consent_deployment_visibility", "macos_distribution_artifacts", "windows_distribution_update_rollback", "operations_support_rollback", "backup_restore_rehearsal", "legal_owner_approval"],
      allowed_artifact_sha256s: ["b".repeat(64), packageSha256, windowsBaseline.candidate.artifact_sha256, windowsTarget.candidate.artifact_sha256],
      allowed_binding_sha256s: [bindingSha256({ pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version })],
    }, {
      key_id: "amic-law-update-key-v1",
      algorithm: "Ed25519",
      public_key_spki_pem: updateKeyPair.publicKey.export({ type: "spki", format: "pem" }),
      valid_from: "2020-01-01T00:00:00Z",
      valid_until: "2030-01-01T00:00:00Z",
      revoked_at: null,
      allowed_receipt_sources: ["windows_operator"],
      allowed_receipt_types: ["windows_operator_update_rollback_approval"],
      allowed_pilot_ids: [pilotId],
      allowed_lawos_tenant_ids: [lawosTenantId],
      allowed_entra_tenant_ids: [entraTenantId],
      allowed_source_shas: [windowsBaseline.candidate.source_sha, windowsTarget.candidate.source_sha],
      allowed_source_trees: [windowsBaseline.candidate.source_tree, windowsTarget.candidate.source_tree],
      allowed_versions: [windowsBaseline.candidate.version, windowsTarget.candidate.version],
      allowed_roles: ["baseline", "target"],
      allowed_operations: windowsUpdateOperations,
      allowed_artifact_sha256s: [windowsBaseline.candidate.artifact_sha256, windowsTarget.candidate.artifact_sha256],
      allowed_binding_sha256s: [updateTenantConfigSha256, updateReleaseManifestSha256s.baseline, updateReleaseManifestSha256s.target],
    }],
  };
  const registryRef = writeSignedJson(root, "trust/registry.json", registry, rootKeyPair);
  const rootPublicKeyRef = writeBytes(root, "trust/root-public-key.spki.pem", rootKeyPair.publicKey.export({ type: "spki", format: "pem" }));
  const testOnlyTrustRoot = {
    schema_version: "law-firm-os.external-release-trust-root-policy.v1",
    configured: true,
    installation_root: root,
    root_public_key_path: rootPublicKeyRef.path,
    root_public_key_spki_sha256: hash(rootKeyPair.publicKey.export({ type: "spki", format: "der" })),
    registry_installation_path: registryRef.path,
    registry_sha256: registryRef.sha256,
    registry_signature_installation_path: registryRef.signature_ref.path,
    registry_signature_sha256: registryRef.signature_ref.sha256,
    registry_serial: registry.registry_serial,
    root_signed_registry_required: true,
    test_only: true,
  };

  const configRef = writeJson(root, "evidence/tenant-config.json", {
    LAWOS_IDENTITY_TENANT_ID: lawosTenantId,
    LAWOS_DATABASE_TENANT_ID: lawosTenantId,
    config_version: oidcConfigVersion,
    resolved_oidc: { tenant_id: entraTenantId, issuer, protected: true },
  });
  const apiReceipt = receiptBase({ receipt_type: "api_artifact_deployment", receipt_source: "release_pipeline", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version, operation: "api_artifact_deployment" });
  apiReceipt.artifact_sha256 = "b".repeat(64);
  apiReceipt.deployment = {
    status: "DEPLOYED",
    target: "matter-lawos-api-pilot",
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: apiReceipt.artifact_sha256,
    binding_sha256: apiReceipt.binding_sha256,
    version,
    deployed_at: "2026-08-12T01:00:00Z",
    deployment_receipt_id: "deploy-api-001",
  };

  const manifestRef = writeJson(root, "evidence/tenant-manifest.json", {
    schema_version: "law-firm-os.external-tenant-provisioning.v1",
    tenant: {
      tenant_id: lawosTenantId,
      deployment: {
        identity_tenant_id: lawosTenantId,
        database_tenant_id: lawosTenantId,
        federated_tenant_id: entraTenantId,
        staff_auth_authority: "entra-oidc",
      },
    },
  });

  const internalProvisioningReceipt = {
    schema_version: INTERNAL_PROVISIONING_RECEIPT_SCHEMA_VERSION,
    outcome: "completed",
    tenant_ref: `tenant_sha256:${hash(Buffer.from(lawosTenantId, "utf8"))}`,
    manifest_ref: `manifest_sha256:${manifestRef.sha256}`,
    request_ref: `request_sha256:${"2".repeat(64)}`,
    deployment_mode: "tenant-pinned",
    staff_auth_authority: "entra-oidc",
    federated_directory_configured: true,
    member_count: 1,
    member_refs: [`member_sha256:${"3".repeat(64)}`],
    prebound_federated_member_count: 1,
    reset_required_member_count: 0,
    runtime_binding: {
      separate_deployment_required: true,
      identity_authority_pinned: true,
      database_authority_pinned: true,
      shared_multi_tenant_runtime: false,
    },
    authentication_material_returned: false,
    pii_returned: false,
    production_ready_claim: false,
  };
  const internalProvisioningRef = writeJson(root, "receipts/internal-provisioning.json", internalProvisioningReceipt);
  const provisioningReceipt = receiptBase({ receipt_type: "tenant_provisioning_adapter", receipt_source: "internal_provisioning_adapter", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version, operation: "tenant_provisioning_adapter" });
  provisioningReceipt.internal_receipt_schema_version = INTERNAL_PROVISIONING_RECEIPT_SCHEMA_VERSION;
  provisioningReceipt.internal_receipt_ref = internalProvisioningRef;
  provisioningReceipt.manifest_schema_version = "law-firm-os.external-tenant-provisioning.v1";
  provisioningReceipt.manifest_ref = manifestRef;
  provisioningReceipt.provisioning = {
    status: "PROVISIONED",
    namespace: "law-firm-001",
    provisioned_at: "2026-08-12T01:01:00Z",
    provisioning_receipt_id: "tenant-provision-001",
  };

  const runtimeReceipt = receiptBase({ receipt_type: "tenant_pinned_runtime_binding", receipt_source: "external_provider", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version, operation: "tenant_runtime_binding" });
  runtimeReceipt.runtime = {
    binding_mode: "tenant_pinned",
    identity_tenant_id: lawosTenantId,
    database_tenant_id: lawosTenantId,
    federated_tenant_id: entraTenantId,
    issuer,
    config_ref: configRef,
    resolved_oidc_config_version: oidcConfigVersion,
    resolved_oidc_config_sha256: configRef.sha256,
    resolved_oidc_config_protected: true,
    safe_tenant_projection: {
      lawos_tenant_id: lawosTenantId,
      entra_tenant_id: entraTenantId,
      deployment_mode: "tenant-pinned",
      staff_auth_authority: "entra-oidc",
    },
    deployment_receipt_id: "tenant-runtime-deploy-001",
    deployed_at: "2026-08-12T01:02:00Z",
  };

  const m365Receipt = receiptBase({ receipt_type: "m365_consent_deployment_visibility", receipt_source: "microsoft_365_provider", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version });
  m365Receipt.product_id = "8f3cc90d-56dd-4c1c-b9c2-0a1100500101";
  m365Receipt.consent = { status: "GRANTED", scopes_match: true, scope_sha256: "c".repeat(64) };
  m365Receipt.deployment = { status: "ENABLED", assignment_fingerprint_sha256: "d".repeat(64) };
  m365Receipt.visibility = {
    positive: { status: "VISIBLE", population: "included", principal_ref: "included-principal-hash", observed_at: "2026-08-12T01:04:00Z" },
    negative: { status: "NOT_VISIBLE", population: "excluded", principal_ref: "excluded-principal-hash", observed_at: "2026-08-12T01:05:00Z" },
  };

  const packageRef = writeBytes(root, "artifacts/matter-pilot.dmg", packageBytes);
  const checksumsRef = writeBytes(root, "artifacts/checksums.sha256", Buffer.from(`${packageRef.sha256}  matter-pilot.dmg\n`));
  const sbomRef = writeJson(root, "artifacts/sbom.cdx.json", { bomFormat: "CycloneDX", specVersion: "1.5", components: [{ type: "library", name: "lawos-fixture", version: "1.0.0" }] });
  const macReceipt = receiptBase({ receipt_type: "macos_distribution_artifacts", receipt_source: "release_pipeline", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version });
  macReceipt.artifact_sha256 = packageRef.sha256;
  macReceipt.signing = { developer_id: true, notarized: true, stapled: true, gatekeeper_accepted: true, notarization_ticket_ref: "notary-ticket-001" };
  macReceipt.artifacts = { package: { ...packageRef, kind: "dmg" }, checksums: checksumsRef, sbom: sbomRef };

  const updateApprovalAuthorizations = Object.fromEntries(windowsUpdateOperations.map((operation, index) => [operation, {
    operation,
    approval_id: `AMIC-WIN-${String(index + 1).padStart(3, "0")}`,
    approved: true,
    expires_at: "2026-12-31T23:59:59.000Z",
  }]));
  const updateApproval = {
    schema_version: "law-firm-os.windows-operator-update-rollback-approval.v1",
    receipt_type: "windows_operator_update_rollback_approval",
    verdict: "APPROVED",
    issued_at: "2026-08-12T01:15:00.000Z",
    expires_at: "2026-12-31T23:59:59.000Z",
    pilot_id: pilotId,
    lawos_tenant_id: lawosTenantId,
    entra_tenant_id: entraTenantId,
    app_id: "com.amic.matter.desktop",
    metadata_approval_id: "AMIC-WIN-METADATA-001",
    tenant_config_sha256: updateTenantConfigSha256,
    authenticode_signer_certificate_sha1: WINDOWS_SIGNER_CERTIFICATE_SHA1,
    update_key: { key_id: "amic-law-update-key-v1", public_key_spki_sha256: updatePublicKeySpkiSha256 },
    candidates: {
      baseline: {
        source_sha: windowsBaseline.candidate.source_sha,
        source_tree: windowsBaseline.candidate.source_tree,
        version: windowsBaseline.candidate.version,
        artifact_sha256: windowsBaseline.candidate.artifact_sha256,
        artifact_bytes: windowsBaseline.candidate.artifact_bytes,
        release_manifest_sha256: updateReleaseManifestSha256s.baseline,
      },
      target: {
        source_sha: windowsTarget.candidate.source_sha,
        source_tree: windowsTarget.candidate.source_tree,
        version: windowsTarget.candidate.version,
        artifact_sha256: windowsTarget.candidate.artifact_sha256,
        artifact_bytes: windowsTarget.candidate.artifact_bytes,
        release_manifest_sha256: updateReleaseManifestSha256s.target,
      },
    },
    authorizations: updateApprovalAuthorizations,
  };
  const updateApprovalBytes = Buffer.from(`${JSON.stringify(updateApproval, null, 2)}\n`);
  const updateApprovalRef = writeBytes(root, "windows/update-rollback-approval.json", updateApprovalBytes);
  const updateApprovalSignatureRef = writeBytes(root, "windows/update-rollback-approval.json.sig", sign(null, updateApprovalBytes, updateKeyPair.privateKey));
  const makeUpdateMaterial = (role, evidence) => {
    const metadata = {
      schemaVersion: "law-firm-os.matter-desktop-external-pilot-update.v2",
      version: evidence.candidate.version,
      channel: "external-pilot",
      pilotId,
      lawosTenantId,
      entraTenantId,
      appId: "com.amic.matter.desktop",
      keyId: updateApproval.update_key.key_id,
      sourceSha: evidence.candidate.source_sha,
      sourceTree: evidence.candidate.source_tree,
      artifactFilename: path.posix.basename(evidence.installerRef.path),
      artifactSha256: evidence.candidate.artifact_sha256,
      artifactBytes: evidence.candidate.artifact_bytes,
      tenantConfigSha256: updateTenantConfigSha256,
      releaseManifestSha256: evidence.releaseManifestRef.sha256,
      generatedAt: "2026-08-12T01:16:00.000Z",
      expiresAt: updateApproval.expires_at,
      approvalId: updateApproval.metadata_approval_id,
      approvalExpiresAt: updateApproval.expires_at,
    };
    const metadataBytes = Buffer.from(`${JSON.stringify(metadata)}\n`, "utf8");
    const metadataRef = writeBytes(root, `windows/${role}/update-metadata.json`, metadataBytes);
    const signatureRef = writeBytes(root, `windows/${role}/update-metadata.sig`, sign(null, metadataBytes, updateKeyPair.privateKey));
    evidence.candidate.update_metadata_sha256 = metadataRef.sha256;
    evidence.candidate.update_metadata_signature_sha256 = signatureRef.sha256;
    evidence.candidate.artifacts.update_metadata = metadataRef;
    evidence.candidate.artifacts.update_metadata_signature = signatureRef;
    return { metadata, metadataRef, signatureRef };
  };
  const baselineUpdate = makeUpdateMaterial("baseline", windowsBaseline);
  const targetUpdate = makeUpdateMaterial("target", windowsTarget);
  const updateExecutionInput = {
    schema_version: "law-firm-os.windows-operator-update-rollback-input.v2",
    execution_mode: "independently-approved-operator-signed-nsis",
    automatic_update: false,
    baseline: {
      installer_path: windowsBaseline.installerRef.path,
      metadata_path: baselineUpdate.metadataRef.path,
      signature_path: baselineUpdate.signatureRef.path,
    },
    target: {
      installer_path: windowsTarget.installerRef.path,
      metadata_path: targetUpdate.metadataRef.path,
      signature_path: targetUpdate.signatureRef.path,
    },
  };
  const updateExecutionInputRef = writeJson(root, "windows/update-rollback-execution-input.json", updateExecutionInput);
  const runnerLaunch = (role, evidence, identitySha256) => {
    const observedTree = { ...evidence.installedTree, identity_sha256: identitySha256 };
    return {
      role,
      version: evidence.candidate.version,
      source_sha: evidence.candidate.source_sha,
      executable_sha256: evidence.executableSha256,
      post_install_installed_tree: observedTree,
      prelaunch_installed_tree: { ...observedTree },
      authenticode_valid: true,
      exact_bytes_verified: true,
      session_started: true,
      session_stopped: true,
    };
  };
  const updateRunner = {
    schema_version: "law-firm-os.windows-operator-update-rollback-qa.v1",
    generated_at: "2026-08-12T01:28:00.000Z",
    verdict: "PASS",
    automatic_update: false,
    approval_bundle_sha256: updateApprovalRef.sha256,
    approval_signature_sha256: updateApprovalSignatureRef.sha256,
    signer_certificate_sha1: WINDOWS_SIGNER_CERTIFICATE_SHA1,
    source_runner: { source_sha: updateRunnerSource.source_sha, source_tree: updateRunnerSource.source_tree },
    operations: windowsUpdateOperations.slice(0, 5).map((operation, index) => ({
      operation,
      approval_id_sha256: hash(Buffer.from(updateApprovalAuthorizations[operation].approval_id)),
      initiated_at: `2026-08-12T01:${20 + index}:00.000Z`,
    })),
    launches: [
      runnerLaunch("baseline", windowsBaseline, "a".repeat(64)),
      runnerLaunch("target", windowsTarget, "b".repeat(64)),
      runnerLaunch("baseline", windowsBaseline, "e".repeat(64)),
    ],
    uninstalls: [
      {
        operation: "target_uninstall_for_rollback",
        approval_id_sha256: hash(Buffer.from(updateApprovalAuthorizations.target_uninstall_for_rollback.approval_id)),
        role: "target",
        version: windowsTarget.candidate.version,
        source_sha: windowsTarget.candidate.source_sha,
        artifact_sha256: windowsTarget.candidate.artifact_sha256,
        metadata_raw_sha256: targetUpdate.metadataRef.sha256,
        signature_raw_sha256: targetUpdate.signatureRef.sha256,
        release_manifest_sha256: windowsTarget.releaseManifestRef.sha256,
        installed_tree_path: windowsTarget.uninstallerPath,
        installed_tree_sha256: windowsTarget.uninstallerSha256,
        uninstaller_sha256: windowsTarget.uninstallerSha256,
        uninstaller_bytes: windowsTarget.uninstallerBytes,
        authenticode: windowsUninstallerAuthenticode(),
        authenticode_valid: true,
        lock_mode: "FileShare.Read",
        denies_write_delete: true,
        process: { pid: 9101, path_identity: "pid_executable_path" },
        exit_code: 0,
      },
      {
        operation: "final_uninstall",
        approval_id_sha256: hash(Buffer.from(updateApprovalAuthorizations.final_uninstall.approval_id)),
        role: "baseline",
        version: windowsBaseline.candidate.version,
        source_sha: windowsBaseline.candidate.source_sha,
        artifact_sha256: windowsBaseline.candidate.artifact_sha256,
        metadata_raw_sha256: baselineUpdate.metadataRef.sha256,
        signature_raw_sha256: baselineUpdate.signatureRef.sha256,
        release_manifest_sha256: windowsBaseline.releaseManifestRef.sha256,
        installed_tree_path: windowsBaseline.uninstallerPath,
        installed_tree_sha256: windowsBaseline.uninstallerSha256,
        uninstaller_sha256: windowsBaseline.uninstallerSha256,
        uninstaller_bytes: windowsBaseline.uninstallerBytes,
        authenticode: windowsUninstallerAuthenticode(),
        authenticode_valid: true,
        lock_mode: "FileShare.Read",
        denies_write_delete: true,
        process: { pid: 9102, path_identity: "pid_executable_path" },
        exit_code: 0,
      },
    ],
    residue_checks: [
      { checkpoint: "target_uninstalled_before_baseline_rollback", executable_present: false, uninstaller_count: 0, entry_count: 0, active_session_count: 0 },
      { checkpoint: "final_uninstall", executable_present: false, uninstaller_count: 0, entry_count: 0, active_session_count: 0 },
    ],
    failure_cleanup: { required: false, initiated: false, completed: true },
    boundaries: { provider_call_performed: false, automatic_update: false, public_release_claim: false, production_go_live_claim: false },
    candidates: {
      baseline: {
        version: windowsBaseline.candidate.version,
        source_sha: windowsBaseline.candidate.source_sha,
        artifact_sha256: windowsBaseline.candidate.artifact_sha256,
        installed_tree: windowsBaseline.installedTree,
        metadata_raw_sha256: baselineUpdate.metadataRef.sha256,
        signature_raw_sha256: baselineUpdate.signatureRef.sha256,
        release_manifest_sha256: windowsBaseline.releaseManifestRef.sha256,
      },
      target: {
        version: windowsTarget.candidate.version,
        source_sha: windowsTarget.candidate.source_sha,
        artifact_sha256: windowsTarget.candidate.artifact_sha256,
        installed_tree: windowsTarget.installedTree,
        metadata_raw_sha256: targetUpdate.metadataRef.sha256,
        signature_raw_sha256: targetUpdate.signatureRef.sha256,
        release_manifest_sha256: windowsTarget.releaseManifestRef.sha256,
      },
    },
    approved_operations: windowsUpdateOperations,
  };
  const updateRunnerRef = writeJson(root, "windows/update-rollback-runner.json", updateRunner);
  const consumerMaterialized = (evidence, update) => ({
    installer: { relative_path: evidence.installerRef.path, sha256: evidence.installerRef.sha256, bytes: readFileSync(path.join(root, evidence.installerRef.path)).length },
    build_manifest: { relative_path: evidence.buildManifestRef.path, sha256: evidence.buildManifestRef.sha256, bytes: readFileSync(path.join(root, evidence.buildManifestRef.path)).length },
    native_package_qa: { relative_path: evidence.qaRef.path, sha256: evidence.qaRef.sha256, bytes: readFileSync(path.join(root, evidence.qaRef.path)).length },
    installed_tree_sbom: { relative_path: evidence.sbomRef.path, sha256: evidence.sbomRef.sha256, bytes: readFileSync(path.join(root, evidence.sbomRef.path)).length },
    release_manifest: { relative_path: evidence.releaseManifestRef.path, sha256: evidence.releaseManifestRef.sha256, bytes: readFileSync(path.join(root, evidence.releaseManifestRef.path)).length },
    update_metadata: { relative_path: update.metadataRef.path, sha256: update.metadataRef.sha256, bytes: readFileSync(path.join(root, update.metadataRef.path)).length },
    update_metadata_signature: { relative_path: update.signatureRef.path, sha256: update.signatureRef.sha256, bytes: readFileSync(path.join(root, update.signatureRef.path)).length },
  });
  const baselineMaterialized = consumerMaterialized(windowsBaseline, baselineUpdate);
  const targetMaterialized = consumerMaterialized(windowsTarget, targetUpdate);
  const consumerCandidate = (evidence, update, materialized) => ({
    source_sha: evidence.candidate.source_sha,
    source_tree: evidence.candidate.source_tree,
    version: evidence.candidate.version,
    release_manifest_sha256: evidence.releaseManifestRef.sha256,
    release_manifest_bytes: materialized.release_manifest.bytes,
    update_metadata_sha256: update.metadataRef.sha256,
    update_metadata_bytes: materialized.update_metadata.bytes,
    update_metadata_signature_sha256: update.signatureRef.sha256,
    update_metadata_signature_bytes: materialized.update_metadata_signature.bytes,
    installer_sha256: evidence.installerRef.sha256,
    installer_bytes: materialized.installer.bytes,
    build_manifest_sha256: evidence.buildManifestRef.sha256,
    build_manifest_bytes: materialized.build_manifest.bytes,
    installed_tree: evidence.installedTree,
    native_snapshot: evidence.nativeSnapshot,
    uninstaller: {
      installed_tree_path: evidence.uninstallerPath,
      installed_tree_sha256: evidence.uninstallerSha256,
      uninstaller_sha256: evidence.uninstallerSha256,
      uninstaller_bytes: evidence.uninstallerBytes,
      authenticode_sha256: hash(Buffer.from(canonicalJson(evidence.qa.package.uninstaller.authenticode))),
      authenticode_valid: true,
      lock_mode: "FileShare.Read",
      denies_write_delete: true,
      process_path_identity: "pid_executable_path",
      exit_code: 0,
    },
    materialized,
  });
  const consumerObject = (id, ref) => ({
    id,
    relative_path: ref.path,
    sha256: ref.sha256,
    bytes: readFileSync(path.join(root, ref.path)).length,
    exact_version_head_verified: true,
    exact_version_get_verified: true,
    full_body_sha256_verified: true,
    object_lock_compliance_verified: true,
    retention_verified: true,
  });
  const privateConsumerLocatorSha256 = hash(Buffer.from("windows-private-locator"));
  const privateConsumerExpandedLocatorSha256 = hash(Buffer.from("windows-expanded-private-locator"));
  const privateConsumerProducer = {
    repository: "Gonyak-cell/law-firm-os",
    workflow_ref: "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal.yml@refs/heads/main",
    job: "seal-private-locator",
    run_id: "1001",
    run_attempt: "1",
    source_sha: updateRunnerSource.source_sha,
    source_tree: updateRunnerSource.source_tree,
  };
  const privateConsumerArtifact = {
    name: "windows-formal-update-private-locator-1001-1",
    id: "9001",
    digest: `sha256:${hash(Buffer.from("aggregate-locator-artifact-archive"))}`,
    envelope_sha256: hash(Buffer.from("aggregate-locator-envelope")),
    private_locator_sha256: privateConsumerLocatorSha256,
    wrapping_public_key_sha256: hash(Buffer.from("aggregate-locator-rsa-4096-public-key")),
  };
  const privateConsumerArtifactRef = {
    schema_version: "law-firm-os.windows-formal-update-private-locator-artifact-ref.v1",
    producer_repository: privateConsumerProducer.repository,
    producer_workflow_ref: privateConsumerProducer.workflow_ref,
    producer_job: privateConsumerProducer.job,
    producer_run_id: privateConsumerProducer.run_id,
    producer_run_attempt: privateConsumerProducer.run_attempt,
    source_sha: privateConsumerProducer.source_sha,
    source_tree: privateConsumerProducer.source_tree,
    artifact_name: privateConsumerArtifact.name,
    artifact_id: privateConsumerArtifact.id,
    artifact_digest: privateConsumerArtifact.digest,
    envelope_sha256: privateConsumerArtifact.envelope_sha256,
    private_locator_sha256: privateConsumerArtifact.private_locator_sha256,
    wrapping_public_key_sha256: privateConsumerArtifact.wrapping_public_key_sha256,
  };
  const privateConsumerArtifactRefSha256 = hash(Buffer.from(canonicalJson(privateConsumerArtifactRef)));
  const privateConsumerRunBindingSha256 = hash(Buffer.from(`Gonyak-cell/law-firm-os:${privateConsumerProducer.run_id}:${privateConsumerProducer.run_attempt}:${privateConsumerProducer.source_sha}:${privateConsumerProducer.source_tree}`));
  const privateConsumerBridgeSha256 = hash(Buffer.from("windows-current-run-encrypted-bridge"));
  const privateConsumerUnwrapKmsKeyArn = "arn:aws:kms:ap-northeast-2:770880870480:key/99999999-8888-4777-8666-555555555555";
  const privateConsumer = {
    schema_version: "law-firm-os.windows-formal-update-private-consumer.v1",
    generated_at: "2026-08-12T01:29:00.000Z",
    verdict: "PASS",
    state: "PASS",
    locator_sha256: privateConsumerLocatorSha256,
    expanded_locator_sha256: privateConsumerExpandedLocatorSha256,
    run_binding_sha256: privateConsumerRunBindingSha256,
    locator_source: {
      artifact_ref_sha256: privateConsumerArtifactRefSha256,
      producer: privateConsumerProducer,
      artifact: privateConsumerArtifact,
      verification: {
        token_permission: "actions:read",
        run_metadata_verified: true,
        job_metadata_verified: true,
        artifact_metadata_verified: true,
        raw_archive_digest_verified: true,
        exact_file_set_verified: true,
        envelope_verified: true,
        ciphertext_verified: true,
      },
      preflight_cleanup: { actions_read_token_cleared: true, oidc_credentials_absent: true, source_root_removed: true },
    },
    locator_decryption: {
      wrapping_key_arn: privateConsumerUnwrapKmsKeyArn,
      key_wrap_algorithm: "RSAES_OAEP_SHA_256",
      content_encryption_algorithm: "AES-256-GCM",
      envelope_aad_verified: true,
      ciphertext_sha256_verified: true,
      kms_key_id_verified: true,
      aes_gcm_authenticated: true,
      private_locator_sha256_verified: true,
      private_locator_bytes_verified: true,
      plaintext_persisted: false,
    },
    reader: {
      isolated_oidc_job: true,
      aws_account_id: "770880870480",
      aws_region: "ap-northeast-2",
      role_arn: "arn:aws:iam::770880870480:role/lawos-windows-artifact-reader",
      locator_unwrap_kms_key_arn: privateConsumerUnwrapKmsKeyArn,
    },
    candidates: {
      baseline: consumerCandidate(windowsBaseline, baselineUpdate, baselineMaterialized),
      target: consumerCandidate(windowsTarget, targetUpdate, targetMaterialized),
    },
    objects: [
      consumerObject("baseline_private_handoff_receipt", windowsBaseline.handoffRef),
      consumerObject("baseline_installer", windowsBaseline.installerRef),
      consumerObject("baseline_build_manifest", windowsBaseline.buildManifestRef),
      consumerObject("baseline_native_package_qa", windowsBaseline.qaRef),
      consumerObject("baseline_installed_tree_sbom", windowsBaseline.sbomRef),
      consumerObject("baseline_release_manifest", windowsBaseline.releaseManifestRef),
      consumerObject("baseline_update_metadata", baselineUpdate.metadataRef),
      consumerObject("baseline_update_metadata_signature", baselineUpdate.signatureRef),
      consumerObject("target_private_handoff_receipt", windowsTarget.handoffRef),
      consumerObject("target_installer", windowsTarget.installerRef),
      consumerObject("target_build_manifest", windowsTarget.buildManifestRef),
      consumerObject("target_native_package_qa", windowsTarget.qaRef),
      consumerObject("target_installed_tree_sbom", windowsTarget.sbomRef),
      consumerObject("target_release_manifest", windowsTarget.releaseManifestRef),
      consumerObject("target_update_metadata", targetUpdate.metadataRef),
      consumerObject("target_update_metadata_signature", targetUpdate.signatureRef),
      consumerObject("execution_input", updateExecutionInputRef),
      consumerObject("approval_receipt", updateApprovalRef),
      consumerObject("approval_signature", updateApprovalSignatureRef),
    ],
    retrieval: {
      expected_object_count: 19,
      exact_version_head_verified: 19,
      exact_version_get_verified: 19,
      full_body_sha256_verified: 19,
      object_lock_compliance_verified: 19,
      retention_verified: 19,
    },
    cleanup: {
      aws_credentials_cleared: true,
      oidc_credentials_cleared: true,
      private_artifact_root_removed: true,
      expanded_locator_removed: true,
      locator_artifact_root_removed: true,
      encrypted_bridge_root_removed: true,
    },
    bridge: { envelope_sha256: privateConsumerBridgeSha256, object_count: 19, current_run_bound: true },
    runner_receipt_sha256: updateRunnerRef.sha256,
    boundaries: {
      provider_call_performed: true,
      exact_s3_locator_recorded: false,
      plaintext_uploaded_to_github: false,
      automatic_update: false,
      public_release_claim: false,
      external_distribution_claim: false,
      production_go_live_claim: false,
    },
  };
  const privateConsumerRef = writeJson(root, "windows/private-handoff-consumer.json", privateConsumer);
  const windowsReceipt = receiptBase({ receipt_type: "windows_distribution_update_rollback", receipt_source: "release_pipeline", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version });
  windowsReceipt.artifact_sha256 = windowsTarget.candidate.artifact_sha256;
  windowsReceipt.candidates = { baseline: windowsBaseline.candidate, target: windowsTarget.candidate };
  windowsReceipt.signing = {
    authenticode_valid: true,
    same_signer_required: true,
    signer_certificate_sha1: WINDOWS_SIGNER_CERTIFICATE_SHA1,
    signer_code_signing_eku_verified: true,
    timestamp_eku_verified: true,
  };
  windowsReceipt.runner_source = updateRunnerSource;
  windowsReceipt.update_approval = {
    bundle_sha256: updateApprovalRef.sha256,
    signature_sha256: updateApprovalSignatureRef.sha256,
  };
  windowsReceipt.private_consumer = {
    receipt_sha256: privateConsumerRef.sha256,
    locator_sha256: privateConsumerLocatorSha256,
    expanded_locator_sha256: privateConsumerExpandedLocatorSha256,
    run_binding_sha256: privateConsumerRunBindingSha256,
    locator_source_artifact_ref_sha256: privateConsumerArtifactRefSha256,
    locator_source_run_id: privateConsumerProducer.run_id,
    locator_source_run_attempt: privateConsumerProducer.run_attempt,
    locator_source_artifact_name: privateConsumerArtifact.name,
    locator_source_artifact_id: privateConsumerArtifact.id,
    locator_source_artifact_digest: privateConsumerArtifact.digest,
    locator_source_envelope_sha256: privateConsumerArtifact.envelope_sha256,
    locator_source_wrapping_public_key_sha256: privateConsumerArtifact.wrapping_public_key_sha256,
    locator_unwrap_kms_key_arn: privateConsumerUnwrapKmsKeyArn,
    reader_role_arn: privateConsumer.reader.role_arn,
    bridge_envelope_sha256: privateConsumerBridgeSha256,
  };
  windowsReceipt.artifacts = {
    private_handoff_consumer: privateConsumerRef,
    update_rollback_execution_input: updateExecutionInputRef,
    update_rollback_runner: updateRunnerRef,
    update_rollback_approval: updateApprovalRef,
    update_rollback_approval_signature: updateApprovalSignatureRef,
  };
  windowsReceipt.claim_policy = {
    provider_calls_made_by_validator: false,
    public_release_claim: false,
    external_distribution_claim: false,
    production_go_live_claim: false,
  };

  const operationsReceipt = receiptBase({ receipt_type: "operations_support_rollback", receipt_source: "operations_owner", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version });
  operationsReceipt.owners = { monitoring_owner: "ops-monitoring-owner", support_owner: "ops-support-owner", rollback_owner: "ops-rollback-owner" };
  operationsReceipt.runbooks = { monitoring: "runbook:monitoring:001", support: "runbook:support:001", rollback: "runbook:rollback:001" };
  operationsReceipt.incident_channel = "support-channel:law-firm-001";
  operationsReceipt.observed_at = "2026-08-12T01:07:00Z";

  const backupReceipt = receiptBase({ receipt_type: "backup_restore_rehearsal", receipt_source: "release_pipeline", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version });
  backupReceipt.rehearsal = { status: "PASS", backup_ref: "backup-rehearsal-001", expected_state_sha256: "e".repeat(64), restored_state_sha256: "e".repeat(64), exact_restore: true, rpo_seconds: 60, rto_seconds: 300, approved_threshold_ref: "threshold-approval:001", started_at: "2026-08-12T01:08:00Z", finished_at: "2026-08-12T01:12:00Z" };

  const legalReceipt = receiptBase({ receipt_type: "legal_owner_approval", receipt_source: "legal_owner", pilot_id: pilotId, lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, source_sha: sourceSha, source_tree: sourceTree, version, verdict: "APPROVED" });
  legalReceipt.approval = { decision: "APPROVED", owner: "legal-owner-ref-001", approval_ref: "approval:legal-owner:001", scope_ref: "scope:law-firm-pilot:001", received_at: "2026-08-12T01:13:00Z" };

  const refs = {
    api: writeSignedJson(root, "receipts/api.json", apiReceipt, keyPair),
    provisioning: writeSignedJson(root, "receipts/provisioning.json", provisioningReceipt, keyPair),
    runtime: writeSignedJson(root, "receipts/runtime.json", runtimeReceipt, keyPair),
    m365: writeSignedJson(root, "receipts/m365.json", m365Receipt, keyPair),
    mac: writeSignedJson(root, "receipts/mac.json", macReceipt, keyPair),
    windows: writeSignedJson(root, "receipts/windows.json", windowsReceipt, keyPair),
    operations: writeSignedJson(root, "receipts/operations.json", operationsReceipt, keyPair),
    backup: writeSignedJson(root, "receipts/backup.json", backupReceipt, keyPair),
    legal: writeSignedJson(root, "receipts/legal.json", legalReceipt, keyPair),
  };
  const input = {
    schema_version: "law-firm-os.external-release-readiness-input.v0.3",
    tenant_identity_schema_version: "law-firm-os.external-tenant-identity.v1",
    status: "READY_FOR_EXTERNAL_PILOT_REVIEW",
    release: { source_sha: sourceSha, source_tree: sourceTree, version, release_channel: "external_pilot" },
    pilot: { pilot_id: pilotId, law_firm_name: "Example Law Firm", lawos_tenant_id: lawosTenantId, entra_tenant_id: entraTenantId, environment: "external_pilot" },
    runtime_assumptions: {
      current_runtime_mode: "single_tenant_env_binding",
      tenant_environment_variable: "LAWOS_IDENTITY_TENANT_ID",
      database_tenant_environment_variable: "LAWOS_DATABASE_TENANT_ID",
      federated_tenant_source: "resolved_oidc_protected_config",
      issuer_strategy: "https://login.microsoftonline.com/{entra_tenant_id}/v2.0",
      provisioning_receipt_alone_satisfies_runtime_binding: false,
    },
    gates: {
      api_artifact_deployment: { receipt_ref: refs.api },
      tenant_provisioning: { provisioning_receipt_ref: refs.provisioning, runtime_binding_receipt_ref: refs.runtime },
      m365_consent_deployment_visibility: { receipt_ref: refs.m365 },
      macos_distribution: { receipt_ref: refs.mac },
      windows_distribution_update_rollback: { receipt_ref: refs.windows },
      operations_support_rollback: { receipt_ref: refs.operations },
      backup_restore_rehearsal: { receipt_ref: refs.backup },
      legal_owner_approval: { receipt_ref: refs.legal },
    },
  };
  const inputRef = writeJson(root, "input.json", input);
  return { root, input, inputRef, refs, sourceSha, sourceTree, version, pilotId, lawosTenantId, entraTenantId, runtimeReceipt, m365Receipt, windowsReceipt, windowsBaseline, windowsTarget, updateApproval, updateApprovalRef, updateApprovalSignatureRef, baselineUpdate, targetUpdate, updateExecutionInput, updateExecutionInputRef, updateRunner, updateRunnerRef, privateConsumer, privateConsumerRef, keyPair, updateKeyPair, rootKeyPair, registry, registryRef, testOnlyTrustRoot };
}

function installRootSignedRegistry(fixture, registry, relativePath) {
  const registryRef = writeSignedJson(fixture.root, relativePath, registry, fixture.rootKeyPair);
  fixture.registry = registry;
  fixture.registryRef = registryRef;
  fixture.testOnlyTrustRoot = {
    ...fixture.testOnlyTrustRoot,
    registry_installation_path: registryRef.path,
    registry_sha256: registryRef.sha256,
    registry_signature_installation_path: registryRef.signature_ref.path,
    registry_signature_sha256: registryRef.signature_ref.sha256,
    registry_serial: registry.registry_serial,
  };
  return registryRef;
}

function installedRegistry(fixture, now = Date.parse("2026-08-12T02:00:00Z")) {
  return verifyProductionTrustedRegistry({ testOnlyPolicy: fixture.testOnlyTrustRoot, now });
}

function verifyApiReceipt(fixture, options = {}) {
  const receiptRef = options.receiptRef ?? fixture.refs.api;
  return verifyDetachedReceipt({
    rootDir: fixture.root,
    receiptRef,
    ...(options.receiptBytes === undefined ? {} : { receiptBytes: options.receiptBytes }),
    ...(options.receipt === undefined ? {} : { receipt: options.receipt }),
    registry: options.registry ?? installedRegistry(fixture).registryTrust,
    expectedReceiptType: "api_artifact_deployment",
    expectedReceiptSource: "release_pipeline",
    expectedPilotId: fixture.pilotId,
    expectedLawosTenantId: fixture.lawosTenantId,
    expectedEntraTenantId: fixture.entraTenantId,
    expectedSourceSha: fixture.sourceSha,
    expectedSourceTree: fixture.sourceTree,
    expectedVersion: fixture.version,
    expectedRole: "release_pipeline",
    expectedOperation: "api_artifact_deployment",
    expectedArtifactSha256: "b".repeat(64),
    expectedBindingSha256: bindingSha256({ pilot_id: fixture.pilotId, lawos_tenant_id: fixture.lawosTenantId, entra_tenant_id: fixture.entraTenantId, source_sha: fixture.sourceSha, source_tree: fixture.sourceTree, version: fixture.version }),
    now: options.now ?? Date.parse("2026-08-12T02:00:00Z"),
  });
}

function validateFixture(fixture, inputPath = fixture.inputRef.path, options = {}) {
  return validateExternalReleaseReadiness({
    rootDir: fixture.root,
    inputPath,
    contractPath: "contracts/external-release-readiness-contract.json",
    testOnlyTrustRoot: options.testOnlyTrustRoot ?? fixture.testOnlyTrustRoot,
  });
}

test("complete named pilot matrix requires signed exact bytes and distinct LawOS/Entra IDs", () => {
  const fixture = makeCompleteFixture();
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "PASS", JSON.stringify(report.findings));
  assert.equal(report.readiness, "READY_FOR_EXTERNAL_PILOT_REVIEW");
  assert.equal(report.findings.length, 0);
  assert.equal(report.pilot.lawos_tenant_id, fixture.lawosTenantId);
  assert.equal(report.pilot.entra_tenant_id, fixture.entraTenantId);
  assert.notEqual(report.pilot.lawos_tenant_id, report.pilot.entra_tenant_id);
  assert.equal(report.boundary.detached_receipt_signatures_required, true);
  assert.equal(report.boundary.external_pilot_distribution_approved_by_validator, false);
  assert.equal(report.boundary.provider_calls_made_by_validator, false);
});

test("signed macOS receipt artifact digest is the exact DMG byte digest", () => {
  const fixture = makeCompleteFixture();
  const receipt = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.mac.path), "utf8"));
  assert.equal(receipt.artifact_sha256, receipt.artifacts.package.sha256);

  receipt.artifact_sha256 = "b".repeat(64);
  fixture.refs.mac = writeSignedJson(fixture.root, "receipts/mac-wrong-artifact.json", receipt, fixture.keyPair);
  fixture.input.gates.macos_distribution.receipt_ref = fixture.refs.mac;
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.gates.find((gate) => gate.gate_id === "macos_distribution")?.state, "invalid");
  assert.ok(report.findings.some((finding) => finding.code === "MAC_RECEIPT_ARTIFACT_SHA256_MISMATCH"));
});

function validateWindowsMutation(mutate, expectedCode) {
  const fixture = makeCompleteFixture();
  const receipt = structuredClone(fixture.windowsReceipt);
  mutate({ fixture, receipt });
  fixture.refs.windows = writeSignedJson(fixture.root, `receipts/windows-${expectedCode.toLowerCase()}.json`, receipt, fixture.keyPair);
  fixture.input.gates.windows_distribution_update_rollback.receipt_ref = fixture.refs.windows;
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.gates.find((gate) => gate.gate_id === "windows_distribution_update_rollback")?.state, "invalid");
  assert.ok(report.findings.some((finding) => finding.code === expectedCode), JSON.stringify(report.findings));
}

function bindPrivateConsumer(fixture, receipt, consumer, name) {
  const ref = writeJson(fixture.root, `windows/private-consumer-${name}.json`, consumer);
  receipt.private_consumer = {
    receipt_sha256: ref.sha256,
    locator_sha256: consumer.locator_sha256,
    expanded_locator_sha256: consumer.expanded_locator_sha256,
    run_binding_sha256: consumer.run_binding_sha256,
    locator_source_artifact_ref_sha256: consumer.locator_source.artifact_ref_sha256,
    locator_source_run_id: consumer.locator_source.producer.run_id,
    locator_source_run_attempt: consumer.locator_source.producer.run_attempt,
    locator_source_artifact_name: consumer.locator_source.artifact.name,
    locator_source_artifact_id: consumer.locator_source.artifact.id,
    locator_source_artifact_digest: consumer.locator_source.artifact.digest,
    locator_source_envelope_sha256: consumer.locator_source.artifact.envelope_sha256,
    locator_source_wrapping_public_key_sha256: consumer.locator_source.artifact.wrapping_public_key_sha256,
    locator_unwrap_kms_key_arn: consumer.locator_decryption.wrapping_key_arn,
    reader_role_arn: consumer.reader.role_arn,
    bridge_envelope_sha256: consumer.bridge.envelope_sha256,
  };
  receipt.artifacts.private_handoff_consumer = ref;
}

test("Windows readiness rejects signer, SBOM, handoff, operation, rollback-byte, and residue drift", () => {
  validateWindowsMutation(({ receipt }) => {
    receipt.signing.signer_certificate_sha1 = "C".repeat(40);
  }, "WINDOWS_QA_SIGNER_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const sbom = structuredClone(fixture.windowsTarget.sbom);
    sbom.metadata.component.properties.find(({ name }) => name === "law-firm-os:installed-file-content-complete").value = "false";
    receipt.candidates.target.artifacts.installed_tree_sbom = writeJson(fixture.root, "windows/target/sbom-drift.json", sbom);
  }, "WINDOWS_SBOM_BINDING_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const sbom = structuredClone(fixture.windowsTarget.sbom);
    sbom.components[0].properties = {};
    receipt.candidates.target.artifacts.installed_tree_sbom = writeJson(fixture.root, "windows/target/sbom-malformed-component-properties.json", sbom);
  }, "WINDOWS_SBOM_FILE_COMPONENT_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const sbom = structuredClone(fixture.windowsTarget.sbom);
    const installedExecutablePath = sbom.metadata.component.properties.find(({ name }) => name === "law-firm-os:installed-executable-path").value;
    sbom.components.find(({ name }) => name === installedExecutablePath).hashes = {};
    receipt.candidates.target.artifacts.installed_tree_sbom = writeJson(fixture.root, "windows/target/sbom-malformed-executable-hashes.json", sbom);
  }, "WINDOWS_SBOM_EXECUTABLE_BINDING_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const handoff = structuredClone(fixture.windowsTarget.handoff);
    handoff.artifacts.installer.head_readback.content_length += 1;
    receipt.candidates.target.artifacts.private_handoff = writeJson(fixture.root, "windows/target/handoff-drift.json", handoff);
  }, "WINDOWS_HANDOFF_CONTENT_LENGTH_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const handoff = structuredClone(fixture.windowsTarget.handoff);
    const substitutedChecksum = Buffer.alloc(32, 7).toString("base64");
    handoff.artifacts.build_manifest.upload.provider_checksum_sha256 = substitutedChecksum;
    handoff.artifacts.build_manifest.head_readback.provider_checksum_sha256 = substitutedChecksum;
    handoff.artifacts.build_manifest.get_readback.provider_checksum_sha256 = substitutedChecksum;
    receipt.candidates.target.artifacts.private_handoff = writeJson(fixture.root, "windows/target/provider-checksum-substitution.json", handoff);
  }, "WINDOWS_HANDOFF_PROVIDER_CHECKSUM_CONTENT_MISMATCH");

  validateWindowsMutation(({ receipt }) => {
    receipt.candidates.target.artifacts.build_manifest = null;
  }, "WINDOWS_CANDIDATE_ARTIFACT_MISSING");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    [runner.operations[0], runner.operations[1]] = [runner.operations[1], runner.operations[0]];
    receipt.artifacts.update_rollback_runner = writeJson(fixture.root, "windows/update-sequence-drift.json", runner);
  }, "WINDOWS_UPDATE_OPERATION_SEQUENCE_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.launches[2].executable_sha256 = "9".repeat(64);
    receipt.artifacts.update_rollback_runner = writeJson(fixture.root, "windows/rollback-byte-drift.json", runner);
  }, "WINDOWS_ROLLBACK_EXECUTABLE_BYTE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.residue_checks[1].entry_count = 1;
    receipt.artifacts.update_rollback_runner = writeJson(fixture.root, "windows/residue-drift.json", runner);
  }, "WINDOWS_UPDATE_RESIDUE_PRESENT");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.operations[1].approval_id_sha256 = runner.operations[0].approval_id_sha256;
    receipt.artifacts.update_rollback_runner = writeJson(fixture.root, "windows/approval-id-reuse.json", runner);
  }, "WINDOWS_UPDATE_APPROVAL_ID_REUSED");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.source_runner.source_sha = "5".repeat(40);
    receipt.artifacts.update_rollback_runner = writeJson(fixture.root, "windows/runner-source-substitution.json", runner);
  }, "WINDOWS_UPDATE_RUNNER_SOURCE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.source_runner.source_sha = "5".repeat(40);
    receipt.runner_source.source_sha = runner.source_runner.source_sha;
    receipt.artifacts.update_rollback_runner = writeJson(fixture.root, "windows/coordinated-runner-source-substitution.json", runner);
  }, "WINDOWS_CANDIDATE_TRUST_SCOPE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const forgedSignatureRef = writeBytes(fixture.root, "windows/forged-update-approval.sig", Buffer.alloc(64, 9));
    const runner = structuredClone(fixture.updateRunner);
    runner.approval_signature_sha256 = forgedSignatureRef.sha256;
    receipt.update_approval.signature_sha256 = forgedSignatureRef.sha256;
    receipt.artifacts.update_rollback_approval_signature = forgedSignatureRef;
    receipt.artifacts.update_rollback_runner = writeJson(fixture.root, "windows/forged-approval-signature-runner.json", runner);
  }, "WINDOWS_UPDATE_APPROVAL_SIGNATURE_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const approval = structuredClone(fixture.updateApproval);
    approval.update_key.key_id = "unregistered-update-key-001";
    const bytes = Buffer.from(`${JSON.stringify(approval, null, 2)}\n`);
    const approvalRef = writeBytes(fixture.root, "windows/unregistered-update-key-approval.json", bytes);
    const signatureRef = writeBytes(fixture.root, "windows/unregistered-update-key-approval.json.sig", sign(null, bytes, fixture.updateKeyPair.privateKey));
    const runner = structuredClone(fixture.updateRunner);
    runner.approval_bundle_sha256 = approvalRef.sha256;
    runner.approval_signature_sha256 = signatureRef.sha256;
    receipt.update_approval = { bundle_sha256: approvalRef.sha256, signature_sha256: signatureRef.sha256 };
    receipt.artifacts.update_rollback_runner = writeJson(fixture.root, "windows/unregistered-update-key-runner.json", runner);
    receipt.artifacts.update_rollback_approval = approvalRef;
    receipt.artifacts.update_rollback_approval_signature = signatureRef;
  }, "WINDOWS_UPDATE_APPROVAL_TRUST_SCOPE_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const approval = structuredClone(fixture.updateApproval);
    approval.metadata_approval_id = "AMIC-WIN-METADATA-SUBSTITUTE-002";
    const bytes = Buffer.from(`${JSON.stringify(approval, null, 2)}\n`);
    const approvalRef = writeBytes(fixture.root, "windows/update-approval-substitution.json", bytes);
    const signatureRef = writeBytes(fixture.root, "windows/update-approval-substitution.json.sig", sign(null, bytes, fixture.updateKeyPair.privateKey));
    receipt.update_approval = { bundle_sha256: approvalRef.sha256, signature_sha256: signatureRef.sha256 };
    receipt.artifacts.update_rollback_approval = approvalRef;
    receipt.artifacts.update_rollback_approval_signature = signatureRef;
  }, "WINDOWS_UPDATE_APPROVAL_SCOPE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const qa = structuredClone(fixture.windowsTarget.qa);
    qa.sbom.post_runtime_tree_sha256 = "0".repeat(64);
    receipt.candidates.target.artifacts.native_package_qa = writeJson(fixture.root, "windows/target/post-runtime-tree-drift.json", qa);
  }, "WINDOWS_QA_POST_RUNTIME_TREE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const qa = structuredClone(fixture.windowsTarget.qa);
    qa.sbom.alternate_data_stream_count = 1;
    receipt.candidates.target.artifacts.native_package_qa = writeJson(fixture.root, "windows/target/alternate-data-stream.json", qa);
  }, "WINDOWS_QA_ALTERNATE_DATA_STREAM_INVALID");
});

test("Windows readiness rejects a final private-consumer receipt without exact object verification", () => {
  validateWindowsMutation(({ fixture, receipt }) => {
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.objects[5].exact_version_get_verified = false;
    bindPrivateConsumer(fixture, receipt, consumer, "object-get-unverified");
  }, "WINDOWS_PRIVATE_CONSUMER_OBJECT_VERIFICATION_INVALID");
});

test("Windows readiness rejects unlocked or replaceable uninstaller execution evidence", () => {
  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.uninstalls[0].lock_mode = "FileShare.ReadWrite";
    runner.uninstalls[0].denies_write_delete = false;
    const runnerRef = writeJson(fixture.root, "windows/unlocked-uninstaller-runner.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "unlocked-uninstaller-runner");
  }, "WINDOWS_UPDATE_UNINSTALLER_LOCK_INVALID");
});

test("Windows readiness rejects locked-uninstaller path, hash, byte, and SBOM-component substitutions", () => {
  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.uninstalls[0].installed_tree_path = "./subdir/Uninstall matter.exe";
    const runnerRef = writeJson(fixture.root, "windows/uninstaller-path-substitution.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "uninstaller-path-substitution");
  }, "WINDOWS_UPDATE_UNINSTALLER_CONSUMER_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.uninstalls[0].installed_tree_sha256 = "f".repeat(64);
    runner.uninstalls[0].uninstaller_sha256 = "f".repeat(64);
    const runnerRef = writeJson(fixture.root, "windows/uninstaller-hash-substitution.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "uninstaller-hash-substitution");
  }, "WINDOWS_UPDATE_UNINSTALLER_CONSUMER_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.uninstalls[0].uninstaller_bytes += 1;
    const runnerRef = writeJson(fixture.root, "windows/uninstaller-byte-substitution.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "uninstaller-byte-substitution");
  }, "WINDOWS_UPDATE_UNINSTALLER_CONSUMER_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const sbom = structuredClone(fixture.windowsTarget.sbom);
    const component = sbom.components.find(({ name }) => name === fixture.windowsTarget.uninstallerPath);
    component.hashes[0].content = "F".repeat(64);
    receipt.candidates.target.artifacts.installed_tree_sbom = writeJson(fixture.root, "windows/target/uninstaller-component-substitution.json", sbom);
  }, "WINDOWS_QA_UNINSTALLER_SBOM_BINDING_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const sbom = structuredClone(fixture.windowsTarget.sbom);
    const component = structuredClone(sbom.components.find(({ name }) => name === fixture.windowsTarget.uninstallerPath));
    component.name = "./uninstall matter.exe";
    sbom.components.push(component);
    receipt.candidates.target.artifacts.installed_tree_sbom = writeJson(fixture.root, "windows/target/uninstaller-case-alias.json", sbom);
  }, "WINDOWS_SBOM_FILE_PATH_DUPLICATE");
});

test("Windows readiness rejects summary-only or substituted native fixed-point evidence", () => {
  validateWindowsMutation(({ fixture, receipt }) => {
    const qa = structuredClone(fixture.windowsTarget.qa);
    delete qa.sbom.native_snapshot.phases;
    receipt.candidates.target.artifacts.native_package_qa = writeJson(fixture.root, "windows/target/native-phases-missing.json", qa);
  }, "WINDOWS_QA_NATIVE_SNAPSHOT_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const qa = structuredClone(fixture.windowsTarget.qa);
    qa.sbom.native_snapshot.phases[2].identity_sha256 = "f".repeat(64);
    receipt.candidates.target.artifacts.native_package_qa = writeJson(fixture.root, "windows/target/native-phase-substitution.json", qa);
  }, "WINDOWS_QA_NATIVE_SNAPSHOT_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.candidates.target.native_snapshot.phases[3].bytes += 1;
    bindPrivateConsumer(fixture, receipt, consumer, "consumer-native-phase-substitution");
  }, "WINDOWS_PRIVATE_CONSUMER_NATIVE_SNAPSHOT_INVALID");
});

test("Windows readiness rejects aggregate locator source, decryption, and preflight-cleanup substitutions", () => {
  validateWindowsMutation(({ fixture, receipt }) => {
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.locator_source.verification.raw_archive_digest_verified = false;
    bindPrivateConsumer(fixture, receipt, consumer, "locator-archive-unverified");
  }, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_VERIFICATION_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.locator_source.preflight_cleanup.actions_read_token_cleared = false;
    bindPrivateConsumer(fixture, receipt, consumer, "locator-token-not-cleared");
  }, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_PREFLIGHT_CLEANUP_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.locator_decryption.aes_gcm_authenticated = false;
    bindPrivateConsumer(fixture, receipt, consumer, "locator-decryption-unauthenticated");
  }, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_DECRYPTION_INVALID");

  validateWindowsMutation(({ fixture, receipt }) => {
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.locator_decryption.plaintext_persisted = true;
    bindPrivateConsumer(fixture, receipt, consumer, "locator-plaintext-persisted");
  }, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_PLAINTEXT_PERSISTED");

  validateWindowsMutation(({ fixture, receipt }) => {
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.locator_source.producer.source_sha = "5".repeat(40);
    const source = consumer.locator_source;
    source.artifact_ref_sha256 = hash(Buffer.from(canonicalJson({
      schema_version: "law-firm-os.windows-formal-update-private-locator-artifact-ref.v1",
      producer_repository: source.producer.repository,
      producer_workflow_ref: source.producer.workflow_ref,
      producer_job: source.producer.job,
      producer_run_id: source.producer.run_id,
      producer_run_attempt: source.producer.run_attempt,
      source_sha: source.producer.source_sha,
      source_tree: source.producer.source_tree,
      artifact_name: source.artifact.name,
      artifact_id: source.artifact.id,
      artifact_digest: source.artifact.digest,
      envelope_sha256: source.artifact.envelope_sha256,
      private_locator_sha256: source.artifact.private_locator_sha256,
      wrapping_public_key_sha256: source.artifact.wrapping_public_key_sha256,
    })));
    consumer.run_binding_sha256 = hash(Buffer.from(`${source.producer.repository}:${source.producer.run_id}:${source.producer.run_attempt}:${source.producer.source_sha}:${source.producer.source_tree}`));
    bindPrivateConsumer(fixture, receipt, consumer, "locator-runner-source-substitution");
  }, "WINDOWS_PRIVATE_CONSUMER_LOCATOR_BINDING_INVALID");
});

test("Windows readiness rejects a final private-consumer receipt with uncleared credentials or private roots", () => {
  validateWindowsMutation(({ fixture, receipt }) => {
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.cleanup.oidc_credentials_cleared = false;
    consumer.cleanup.encrypted_bridge_root_removed = false;
    bindPrivateConsumer(fixture, receipt, consumer, "cleanup-incomplete");
  }, "WINDOWS_PRIVATE_CONSUMER_CLEANUP_INVALID");
});

test("Windows readiness binds runner candidates and launch checkpoints to the exact installed tree", () => {
  validateWindowsMutation(({ fixture, receipt }) => {
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.candidates.target.installed_tree.installed_executable_bytes += 1;
    bindPrivateConsumer(fixture, receipt, consumer, "consumer-installed-tree-byte-substitution");
  }, "WINDOWS_PRIVATE_CONSUMER_INSTALLED_TREE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.candidates.target.installed_tree.identity_sha256 = "f".repeat(64);
    bindPrivateConsumer(fixture, receipt, consumer, "consumer-installed-tree-identity-substitution");
  }, "WINDOWS_PRIVATE_CONSUMER_INSTALLED_TREE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.candidates.target.installed_tree.content_sha256 = "f".repeat(64);
    const runnerRef = writeJson(fixture.root, "windows/runner-candidate-tree-substitution.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "runner-candidate-tree-substitution");
  }, "WINDOWS_UPDATE_RUNNER_INSTALLED_TREE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.candidates.target.installed_tree.identity_sha256 = "f".repeat(64);
    const runnerRef = writeJson(fixture.root, "windows/runner-candidate-identity-substitution.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "runner-candidate-identity-substitution");
  }, "WINDOWS_UPDATE_RUNNER_INSTALLED_TREE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.candidates.target.installed_tree.installed_executable_path = "./subdir/matter.exe";
    const runnerRef = writeJson(fixture.root, "windows/runner-candidate-executable-path-substitution.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "runner-candidate-executable-path-substitution");
  }, "WINDOWS_UPDATE_RUNNER_INSTALLED_TREE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.launches[1].post_install_installed_tree.bytes += 1;
    const runnerRef = writeJson(fixture.root, "windows/runner-post-install-tree-substitution.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "runner-post-install-tree-substitution");
  }, "WINDOWS_UPDATE_LAUNCH_INSTALLED_TREE_MISMATCH");

  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.launches[2].prelaunch_installed_tree.identity_sha256 = "f".repeat(64);
    const runnerRef = writeJson(fixture.root, "windows/runner-prelaunch-identity-substitution.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "runner-prelaunch-identity-substitution");
  }, "WINDOWS_UPDATE_LAUNCH_INSTALLED_TREE_IDENTITY_MISMATCH");
});

test("Windows readiness rejects a well-formed runner metadata digest substitution", () => {
  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.candidates.target.metadata_raw_sha256 = "a".repeat(64);
    const runnerRef = writeJson(fixture.root, "windows/runner-metadata-digest-substitution.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "runner-metadata-digest-substitution");
  }, "WINDOWS_UPDATE_METADATA_DIGEST_MISMATCH");
});

test("Windows readiness rejects a well-formed runner metadata-signature digest substitution", () => {
  validateWindowsMutation(({ fixture, receipt }) => {
    const runner = structuredClone(fixture.updateRunner);
    runner.candidates.target.signature_raw_sha256 = "a".repeat(64);
    const runnerRef = writeJson(fixture.root, "windows/runner-signature-digest-substitution.json", runner);
    receipt.artifacts.update_rollback_runner = runnerRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    bindPrivateConsumer(fixture, receipt, consumer, "runner-signature-digest-substitution");
  }, "WINDOWS_UPDATE_METADATA_SIGNATURE_DIGEST_MISMATCH");
});

test("Windows readiness rejects a signed approval manifest digest that differs from exact immutable manifest bytes", () => {
  validateWindowsMutation(({ fixture, receipt }) => {
    const approval = structuredClone(fixture.updateApproval);
    approval.candidates.baseline.release_manifest_sha256 = "a".repeat(64);
    const approvalBytes = Buffer.from(`${JSON.stringify(approval, null, 2)}\n`);
    const approvalRef = writeBytes(fixture.root, "windows/approval-manifest-digest-substitution.json", approvalBytes);
    const approvalSignatureRef = writeBytes(fixture.root, "windows/approval-manifest-digest-substitution.json.sig", sign(null, approvalBytes, fixture.updateKeyPair.privateKey));
    const runner = structuredClone(fixture.updateRunner);
    runner.approval_bundle_sha256 = approvalRef.sha256;
    runner.approval_signature_sha256 = approvalSignatureRef.sha256;
    runner.candidates.baseline.release_manifest_sha256 = approval.candidates.baseline.release_manifest_sha256;
    const runnerRef = writeJson(fixture.root, "windows/runner-manifest-digest-substitution.json", runner);
    receipt.update_approval = { bundle_sha256: approvalRef.sha256, signature_sha256: approvalSignatureRef.sha256 };
    receipt.artifacts.update_rollback_execution_input = fixture.updateExecutionInputRef;
    receipt.artifacts.update_rollback_runner = runnerRef;
    receipt.artifacts.update_rollback_approval = approvalRef;
    receipt.artifacts.update_rollback_approval_signature = approvalSignatureRef;
    const consumer = structuredClone(fixture.privateConsumer);
    consumer.runner_receipt_sha256 = runnerRef.sha256;
    consumer.objects.find(({ id }) => id === "approval_receipt").sha256 = approvalRef.sha256;
    consumer.objects.find(({ id }) => id === "approval_receipt").bytes = approvalBytes.length;
    consumer.objects.find(({ id }) => id === "approval_receipt").relative_path = approvalRef.path;
    consumer.objects.find(({ id }) => id === "approval_signature").sha256 = approvalSignatureRef.sha256;
    consumer.objects.find(({ id }) => id === "approval_signature").bytes = readFileSync(path.join(fixture.root, approvalSignatureRef.path)).length;
    consumer.objects.find(({ id }) => id === "approval_signature").relative_path = approvalSignatureRef.path;
    bindPrivateConsumer(fixture, receipt, consumer, "approval-manifest-digest-substitution");
  }, "WINDOWS_UPDATE_APPROVAL_MANIFEST_DIGEST_MISMATCH");
});

test("Windows readiness trust key must authorize both nested candidates", () => {
  const fixture = makeCompleteFixture();
  const registry = JSON.parse(readFileSync(path.join(fixture.root, fixture.registryRef.path), "utf8"));
  registry.keys[0].allowed_source_shas = [fixture.sourceSha];
  installRootSignedRegistry(fixture, registry, "trust/registry-target-only.json");
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "WINDOWS_CANDIDATE_TRUST_SCOPE_MISMATCH"));
});

test("production policy stays import.meta-rooted and unconfigured without accepting environment authority", () => {
  assert.equal(PRODUCTION_TRUST_ROOT_POLICY.configured, false);
  assert.equal(PRODUCTION_TRUST_ROOT_POLICY.root_public_key_spki_sha256, null);
  assert.equal(PRODUCTION_TRUST_ROOT_POLICY.registry_sha256, null);
  assert.equal(PRODUCTION_TRUST_ROOT_POLICY.registry_signature_sha256, null);
  assert.equal(PRODUCTION_TRUST_ROOT_POLICY.registry_serial, null);
  assert.equal(PRODUCTION_TRUST_ROOT_POLICY.installation_root, `${path.join(repoRoot, "config/external-release")}${path.sep}`);
  assert.equal(PRODUCTION_TRUST_ROOT_POLICY.root_public_key_path, path.join(repoRoot, "config/external-release/root-public-key.spki.pem"));
  assert.equal(PRODUCTION_TRUST_ROOT_POLICY.registry_installation_path, path.join(repoRoot, "config/external-release/trust-registry.json"));
  assert.equal(PRODUCTION_TRUST_ROOT_POLICY.registry_signature_installation_path, path.join(repoRoot, "config/external-release/trust-registry.json.sig"));
  const previous = process.env.LAWOS_EXTERNAL_RELEASE_TRUST_ROOT;
  process.env.LAWOS_EXTERNAL_RELEASE_TRUST_ROOT = makeCompleteFixture().root;
  try {
    assert.throws(() => verifyProductionTrustedRegistry(), (error) => error?.code === "TRUST_ROOT_NOT_CONFIGURED");
  } finally {
    if (previous === undefined) delete process.env.LAWOS_EXTERNAL_RELEASE_TRUST_ROOT;
    else process.env.LAWOS_EXTERNAL_RELEASE_TRUST_ROOT = previous;
  }
});

test("test-only production bootstrap verifies raw signed registry bytes and returns the registry used for receipt scope", () => {
  const fixture = makeCompleteFixture();
  const productionTrust = installedRegistry(fixture);
  assert.equal(productionTrust.registry, productionTrust.registryTrust.registry);
  assert.equal(productionTrust.sha256, fixture.registryRef.sha256);
  assert.equal(productionTrust.registrySignatureSha256, fixture.registryRef.signature_ref.sha256);
  assert.equal(productionTrust.registrySerial, 1);
  assert.equal(Object.isFrozen(productionTrust.registry), true);
  assert.equal(Object.isFrozen(productionTrust.registry.keys[0]), true);
  const verification = verifyApiReceipt(fixture, { registry: productionTrust.registryTrust });
  assert.equal(verification.valid, true);
  assert.equal(verification.receipt.receipt_type, "api_artifact_deployment");

  const restrictedRegistry = structuredClone(fixture.registry);
  restrictedRegistry.keys[0].allowed_operations = ["legal_owner_approval"];
  installRootSignedRegistry(fixture, restrictedRegistry, "trust/restricted-registry.json");
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "TRUSTED_KEY_SCOPE_MISMATCH"));
});

test("production bootstrap rejects caller overrides and non-test policy injection", () => {
  const fixture = makeCompleteFixture();
  assert.throws(() => verifyProductionTrustedRegistry({
    rootDir: fixture.root,
    registryPath: fixture.registryRef.path,
    registrySha256: fixture.registryRef.sha256,
  }), (error) => error?.code === "TRUST_ROOT_OVERRIDE_FORBIDDEN");
  assert.throws(() => verifyProductionTrustedRegistry({
    testOnlyPolicy: { ...fixture.testOnlyTrustRoot, unexpected: true },
  }), (error) => error?.code === "TEST_TRUST_ROOT_FORBIDDEN");
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assert.throws(() => verifyProductionTrustedRegistry({ testOnlyPolicy: fixture.testOnlyTrustRoot }), (error) => error?.code === "TEST_TRUST_ROOT_FORBIDDEN");
  } finally {
    process.env.NODE_ENV = previousNodeEnv;
  }
});

test("production bootstrap rejects registry, signature, root, and serial tampering", () => {
  const registryTamper = makeCompleteFixture();
  writeFileSync(path.join(registryTamper.root, registryTamper.registryRef.path), `${readFileSync(path.join(registryTamper.root, registryTamper.registryRef.path), "utf8")} `);
  assert.throws(() => installedRegistry(registryTamper), (error) => error?.code === "TRUST_REGISTRY_HASH_MISMATCH");

  const signatureTamper = makeCompleteFixture();
  writeFileSync(path.join(signatureTamper.root, signatureTamper.registryRef.signature_ref.path), Buffer.alloc(64, 7));
  assert.throws(() => installedRegistry(signatureTamper), (error) => error?.code === "TRUST_REGISTRY_SIGNATURE_HASH_MISMATCH");

  const invalidSignature = makeCompleteFixture();
  const otherRoot = generateKeyPairSync("ed25519");
  const registryBytes = readFileSync(path.join(invalidSignature.root, invalidSignature.registryRef.path));
  const invalidSignatureRef = writeBytes(invalidSignature.root, "trust/invalid-registry.sig", sign(null, registryBytes, otherRoot.privateKey));
  invalidSignature.testOnlyTrustRoot = {
    ...invalidSignature.testOnlyTrustRoot,
    registry_signature_installation_path: invalidSignatureRef.path,
    registry_signature_sha256: invalidSignatureRef.sha256,
  };
  assert.throws(() => installedRegistry(invalidSignature), (error) => error?.code === "TRUST_REGISTRY_SIGNATURE_INVALID");

  const encodedSignature = makeCompleteFixture();
  const rawSignature = readFileSync(path.join(encodedSignature.root, encodedSignature.registryRef.signature_ref.path));
  const encodedSignatureRef = writeBytes(encodedSignature.root, "trust/encoded-registry.sig", Buffer.from(rawSignature.toString("base64"), "utf8"));
  encodedSignature.testOnlyTrustRoot = {
    ...encodedSignature.testOnlyTrustRoot,
    registry_signature_installation_path: encodedSignatureRef.path,
    registry_signature_sha256: encodedSignatureRef.sha256,
  };
  assert.throws(() => installedRegistry(encodedSignature), (error) => error?.code === "TRUST_REGISTRY_SIGNATURE_FORMAT");

  const rootSwap = makeCompleteFixture();
  writeFileSync(path.join(rootSwap.root, rootSwap.testOnlyTrustRoot.root_public_key_path), otherRoot.publicKey.export({ type: "spki", format: "pem" }));
  assert.throws(() => installedRegistry(rootSwap), (error) => error?.code === "TRUST_ROOT_KEY_DIGEST_MISMATCH");

  const replay = makeCompleteFixture();
  replay.testOnlyTrustRoot = { ...replay.testOnlyTrustRoot, registry_serial: 2 };
  assert.throws(() => installedRegistry(replay), (error) => error?.code === "TRUST_REGISTRY_ROLLBACK");
});

test("production bootstrap rejects symlink installations and private-key PEM inputs", () => {
  const rootLink = makeCompleteFixture();
  const linkedRoot = path.join(path.dirname(rootLink.root), `${path.basename(rootLink.root)}-link`);
  symlinkSync(rootLink.root, linkedRoot);
  rootLink.testOnlyTrustRoot = {
    ...rootLink.testOnlyTrustRoot,
    installation_root: linkedRoot,
    root_public_key_path: path.join(linkedRoot, "trust/root-public-key.spki.pem"),
    registry_installation_path: path.join(linkedRoot, "trust/registry.json"),
    registry_signature_installation_path: path.join(linkedRoot, "trust/registry.json.sig"),
  };
  assert.throws(() => installedRegistry(rootLink), (error) => error?.code === "TRUST_ROOT_INVALID");

  const registryLink = makeCompleteFixture();
  const registryTarget = path.join(registryLink.root, registryLink.registryRef.path);
  const registryCopy = writeBytes(registryLink.root, "trust/registry-copy.json", readFileSync(registryTarget));
  unlinkSync(registryTarget);
  symlinkSync(path.join(registryLink.root, registryCopy.path), registryTarget);
  assert.throws(() => installedRegistry(registryLink), (error) => error?.code === "TRUST_SYMLINK_FORBIDDEN");

  const signatureLink = makeCompleteFixture();
  const signatureTarget = path.join(signatureLink.root, signatureLink.registryRef.signature_ref.path);
  const signatureCopy = writeBytes(signatureLink.root, "trust/registry-signature-copy.sig", readFileSync(signatureTarget));
  unlinkSync(signatureTarget);
  symlinkSync(path.join(signatureLink.root, signatureCopy.path), signatureTarget);
  assert.throws(() => installedRegistry(signatureLink), (error) => error?.code === "TRUST_SYMLINK_FORBIDDEN");

  const rootKeyLink = makeCompleteFixture();
  const rootKeyTarget = path.join(rootKeyLink.root, rootKeyLink.testOnlyTrustRoot.root_public_key_path);
  const rootKeyCopy = writeBytes(rootKeyLink.root, "trust/root-public-key-copy.pem", readFileSync(rootKeyTarget));
  unlinkSync(rootKeyTarget);
  symlinkSync(path.join(rootKeyLink.root, rootKeyCopy.path), rootKeyTarget);
  assert.throws(() => installedRegistry(rootKeyLink), (error) => error?.code === "TRUST_SYMLINK_FORBIDDEN");

  const pathEscape = makeCompleteFixture();
  const outsideRoot = mkdtempSync(path.join(tmpdir(), "lawos-external-release-outside-"));
  const outsideKey = writeBytes(outsideRoot, "root-public-key.pem", pathEscape.rootKeyPair.publicKey.export({ type: "spki", format: "pem" }));
  pathEscape.testOnlyTrustRoot = { ...pathEscape.testOnlyTrustRoot, root_public_key_path: path.join(outsideRoot, outsideKey.path) };
  assert.throws(() => installedRegistry(pathEscape), (error) => error?.code === "TRUST_PATH_ESCAPE");

  const privateRoot = makeCompleteFixture();
  writeFileSync(path.join(privateRoot.root, privateRoot.testOnlyTrustRoot.root_public_key_path), privateRoot.rootKeyPair.privateKey.export({ type: "pkcs8", format: "pem" }));
  assert.throws(() => installedRegistry(privateRoot), (error) => error?.code === "TRUST_ROOT_KEY_INVALID");

  const privateLeaf = makeCompleteFixture();
  const privateLeafRegistry = structuredClone(privateLeaf.registry);
  privateLeafRegistry.keys[0].public_key_spki_pem = privateLeaf.keyPair.privateKey.export({ type: "pkcs8", format: "pem" });
  installRootSignedRegistry(privateLeaf, privateLeafRegistry, "trust/private-leaf-registry.json");
  assert.throws(() => installedRegistry(privateLeaf), (error) => error?.code === "TRUST_REGISTRY_KEY_INVALID");
});

test("trusted snapshots reject hardlinks and cross-role file identity reuse", () => {
  const hardlinkedRoot = makeCompleteFixture();
  const rootKeyTarget = path.join(hardlinkedRoot.root, hardlinkedRoot.testOnlyTrustRoot.root_public_key_path);
  linkSync(rootKeyTarget, path.join(hardlinkedRoot.root, "trust/root-public-key-hardlink.pem"));
  assert.throws(() => installedRegistry(hardlinkedRoot), (error) => error?.code === "TRUST_HARDLINK_FORBIDDEN");

  const reusedRootFile = makeCompleteFixture();
  reusedRootFile.testOnlyTrustRoot = {
    ...reusedRootFile.testOnlyTrustRoot,
    registry_installation_path: reusedRootFile.testOnlyTrustRoot.root_public_key_path,
    registry_signature_installation_path: reusedRootFile.testOnlyTrustRoot.root_public_key_path,
  };
  assert.throws(() => installedRegistry(reusedRootFile), (error) => error?.code === "TRUST_ROOT_POLICY_INVALID");

  const reusedReceiptFile = makeCompleteFixture();
  const receiptRef = {
    ...reusedReceiptFile.refs.api,
    signature_ref: {
      path: reusedReceiptFile.refs.api.path,
      sha256: reusedReceiptFile.refs.api.sha256,
    },
  };
  assert.throws(() => verifyApiReceipt(reusedReceiptFile, { receiptRef }), (error) => error?.code === "TRUST_RECEIPT_FILE_REUSE");

  const hardlinkedReceipt = makeCompleteFixture();
  linkSync(
    path.join(hardlinkedReceipt.root, hardlinkedReceipt.refs.api.path),
    path.join(hardlinkedReceipt.root, "receipts/api-hardlink.json"),
  );
  assert.throws(() => verifyApiReceipt(hardlinkedReceipt), (error) => error?.code === "TRUST_HARDLINK_FORBIDDEN");
});

test("production bootstrap rejects root-as-leaf and duplicate leaf SPKI reuse", () => {
  const rootAsLeaf = makeCompleteFixture();
  const rootAsLeafRegistry = structuredClone(rootAsLeaf.registry);
  rootAsLeafRegistry.keys[0].public_key_spki_pem = rootAsLeaf.rootKeyPair.publicKey.export({ type: "spki", format: "pem" });
  installRootSignedRegistry(rootAsLeaf, rootAsLeafRegistry, "trust/root-as-leaf-registry.json");
  assert.throws(() => installedRegistry(rootAsLeaf), (error) => error?.code === "TRUST_REGISTRY_ROOT_KEY_REUSE");

  const duplicateLeaf = makeCompleteFixture();
  const duplicateLeafRegistry = structuredClone(duplicateLeaf.registry);
  duplicateLeafRegistry.keys.push({ ...structuredClone(duplicateLeafRegistry.keys[0]), key_id: "release-evidence-key-002" });
  installRootSignedRegistry(duplicateLeaf, duplicateLeafRegistry, "trust/duplicate-leaf-registry.json");
  assert.throws(() => installedRegistry(duplicateLeaf), (error) => error?.code === "TRUST_REGISTRY_DUPLICATE_LEAF_KEY");
});

test("detached receipt parses and authorizes only its internally read signed byte snapshot", () => {
  const fixture = makeCompleteFixture();
  const receiptBytes = readFileSync(path.join(fixture.root, fixture.refs.api.path));
  const substitutedReceipt = { ...JSON.parse(receiptBytes), pilot_id: "pilot-other-firm-002" };
  assert.throws(() => verifyApiReceipt(fixture, { receiptBytes, receipt: substitutedReceipt }), (error) => error?.code === "TRUST_RECEIPT_SNAPSHOT_MISMATCH");
  const substitutedBytes = Buffer.from(`${JSON.stringify(substitutedReceipt, null, 2)}\n`);
  assert.throws(() => verifyApiReceipt(fixture, { receiptBytes: substitutedBytes }), (error) => error?.code === "TRUST_RECEIPT_SNAPSHOT_MISMATCH");
  const verified = verifyApiReceipt(fixture);
  assert.deepEqual(verified.receipt, JSON.parse(receiptBytes));
  assert.equal(verified.receipt_bytes.equals(receiptBytes), true);
});

test("detached receipt file races never authorize bytes outside the pinned snapshot", async () => {
  const fixture = makeCompleteFixture();
  const receiptPath = path.join(fixture.root, fixture.refs.api.path);
  const goodBytes = readFileSync(receiptPath);
  const badReceipt = { ...JSON.parse(goodBytes), pilot_id: "pilot-evil-firm-01" };
  const goodRef = writeBytes(fixture.root, "race/good.json", goodBytes);
  const badRef = writeBytes(fixture.root, "race/bad.json", Buffer.from(`${JSON.stringify(badReceipt, null, 2)}\n`));
  const child = spawn(process.execPath, ["-e", `
    const fs = require("node:fs");
    fs.copyFileSync(${JSON.stringify(path.join(fixture.root, badRef.path))}, ${JSON.stringify(receiptPath)});
    process.send("bad-ready");
    process.once("message", () => {
      try {
        const end = Date.now() + 500;
        while (Date.now() < end) {
          fs.copyFileSync(${JSON.stringify(path.join(fixture.root, goodRef.path))}, ${JSON.stringify(receiptPath)});
          fs.copyFileSync(${JSON.stringify(path.join(fixture.root, badRef.path))}, ${JSON.stringify(receiptPath)});
        }
      } finally {
        if (process.connected) process.disconnect();
      }
    });
  `], { stdio: ["ignore", "ignore", "ignore", "ipc"] });
  let raceStarted = false;
  let completed = false;
  let childResult;
  try {
    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("message", resolve);
    });
    assert.throws(() => verifyApiReceipt(fixture), (error) => error?.code === "TRUST_RECEIPT_HASH_MISMATCH");
    child.send("race");
    raceStarted = true;
    let observations = 0;
    const end = Date.now() + 350;
    while (Date.now() < end) {
      try {
        const verification = verifyApiReceipt(fixture);
        assert.equal(verification.receipt.pilot_id, fixture.pilotId);
      } catch (error) {
        assert.ok(["TRUST_FILE_CHANGED", "TRUST_FILE_INVALID", "TRUST_RECEIPT_HASH_MISMATCH", "TRUST_RECEIPT_JSON_INVALID"].includes(error?.code), error?.code);
      }
      observations += 1;
    }
    assert.ok(observations > 0);
    completed = true;
  } finally {
    childResult = await cleanupRaceChild(child, { signalIfWaiting: !raceStarted });
    writeFileSync(receiptPath, goodBytes);
  }
  assert.equal(completed, true);
  assert.equal(childResult.error, null);
  assert.equal(childResult.forced, false);
  assert.equal(childResult.code, 0);
  assert.equal(childResult.signal, null);
  assert.equal(verifyApiReceipt(fixture).receipt.pilot_id, fixture.pilotId);
});

test("macOS checksum and SBOM races never authorize unpinned file bytes", async () => {
  const fixture = makeCompleteFixture();
  const macReceipt = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.mac.path), "utf8"));
  const checksumsPath = path.join(fixture.root, macReceipt.artifacts.checksums.path);
  const sbomPath = path.join(fixture.root, macReceipt.artifacts.sbom.path);
  const goodChecksums = readFileSync(checksumsPath);
  const goodSbom = readFileSync(sbomPath);
  const badChecksumsRef = writeBytes(fixture.root, "race/bad-checksums.sha256", Buffer.from(`${"0".repeat(64)}  matter-pilot.dmg\n`));
  const goodChecksumsRef = writeBytes(fixture.root, "race/good-checksums.sha256", goodChecksums);
  const badSbomRef = writeJson(fixture.root, "race/bad-sbom.json", { bomFormat: "SPDX", components: [{ type: "library", name: "untrusted" }] });
  const goodSbomRef = writeBytes(fixture.root, "race/good-sbom.json", goodSbom);
  const child = spawn(process.execPath, ["-e", `
    const fs = require("node:fs");
    fs.copyFileSync(${JSON.stringify(path.join(fixture.root, badChecksumsRef.path))}, ${JSON.stringify(checksumsPath)});
    fs.copyFileSync(${JSON.stringify(path.join(fixture.root, badSbomRef.path))}, ${JSON.stringify(sbomPath)});
    process.send("bad-ready");
    process.once("message", () => {
      try {
        const end = Date.now() + 500;
        while (Date.now() < end) {
          fs.copyFileSync(${JSON.stringify(path.join(fixture.root, goodChecksumsRef.path))}, ${JSON.stringify(checksumsPath)});
          fs.copyFileSync(${JSON.stringify(path.join(fixture.root, goodSbomRef.path))}, ${JSON.stringify(sbomPath)});
          fs.copyFileSync(${JSON.stringify(path.join(fixture.root, badChecksumsRef.path))}, ${JSON.stringify(checksumsPath)});
          fs.copyFileSync(${JSON.stringify(path.join(fixture.root, badSbomRef.path))}, ${JSON.stringify(sbomPath)});
        }
      } finally {
        if (process.connected) process.disconnect();
      }
    });
  `], { stdio: ["ignore", "ignore", "ignore", "ipc"] });
  let raceStarted = false;
  let completed = false;
  let childResult;
  try {
    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("message", resolve);
    });
    const badReport = validateFixture(fixture);
    assert.equal(badReport.gates.find((gate) => gate.gate_id === "macos_distribution")?.state, "invalid");
    assert.ok(badReport.findings.some((finding) => finding.code === "RECEIPT_SHA256_MISMATCH"));
    child.send("race");
    raceStarted = true;
    let observations = 0;
    const end = Date.now() + 350;
    while (Date.now() < end) {
      const report = validateFixture(fixture);
      const macGate = report.gates.find((gate) => gate.gate_id === "macos_distribution");
      if (macGate?.state === "verified") assert.equal(report.verdict, "PASS");
      else assert.ok(report.findings.some((finding) => ["TRUST_FILE_CHANGED", "TRUST_FILE_INVALID", "RECEIPT_SHA256_MISMATCH"].includes(finding.code)), JSON.stringify(report.findings));
      observations += 1;
    }
    assert.ok(observations > 0);
    completed = true;
  } finally {
    childResult = await cleanupRaceChild(child, { signalIfWaiting: !raceStarted });
    writeFileSync(checksumsPath, goodChecksums);
    writeFileSync(sbomPath, goodSbom);
  }
  assert.equal(completed, true);
  assert.equal(childResult.error, null);
  assert.equal(childResult.forced, false);
  assert.equal(childResult.code, 0);
  assert.equal(childResult.signal, null);
  assert.equal(validateFixture(fixture).verdict, "PASS");
});

test("template remains blocked and distinguishes technical, provider, operations, and legal gaps", () => {
  const report = validateExternalReleaseReadiness({ rootDir: repoRoot, inputPath: "docs/launch/external-release/external-release-readiness-input.template.json" });
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.readiness, "BLOCKED_PENDING_EXTERNAL_INPUTS");
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_ROOT_NOT_CONFIGURED"));
  assert.ok(report.findings.some((finding) => finding.code === "TENANT_RUNTIME_BINDING_REQUIRED"));
  assert.equal(report.technical_proof.pending_gate_count, 4);
  assert.equal(report.external_provider_inputs.pending_gate_count, 2);
  assert.equal(report.human_operations_inputs.pending_gate_count, 1);
  assert.equal(report.human_legal_inputs.pending_gate_count, 1);
});

test("receipt file presence does not pass when bytes, signatures, or semantic fields drift", () => {
  const fixture = makeCompleteFixture();
  writeFileSync(path.join(fixture.root, "receipts/api.json"), Buffer.from("{}\n"));
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "RECEIPT_SHA256_MISMATCH"));

  const emptyReceiptRef = writeJson(fixture.root, "receipts/api-empty.json", {});
  fixture.input.gates.api_artifact_deployment.receipt_ref = emptyReceiptRef;
  writeJson(fixture.root, "input.json", fixture.input);
  const semanticReport = validateFixture(fixture);
  assert.ok(semanticReport.findings.some((finding) => finding.code === "RECEIPT_REQUIRED_FIELDS_MISSING"));
  assert.ok(semanticReport.findings.some((finding) => finding.code === "TRUST_SIGNATURE_REQUIRED"));
});

test("tenant provisioning alone cannot pass the single-tenant runtime boundary", () => {
  const fixture = makeCompleteFixture();
  fixture.input.gates.tenant_provisioning.runtime_binding_receipt_ref = null;
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "TENANT_RUNTIME_BINDING_REQUIRED"));
  const tenantGate = report.gates.find((gate) => gate.gate_id === "tenant_provisioning");
  assert.equal(tenantGate.slots.find((slot) => slot.slot === "provisioning").state, "verified");
  assert.equal(tenantGate.slots.find((slot) => slot.slot === "runtime_binding").state, "pending_external");
  assert.equal(report.boundary.provisioning_receipt_alone_passes_runtime, false);
});

test("separately reviewed multi-tenant runtime receipt is the explicit alternative", () => {
  const fixture = makeCompleteFixture();
  const multiTenantReceipt = receiptBase({ receipt_type: "multi_tenant_runtime_review", receipt_source: "independent_runtime_review", pilot_id: fixture.pilotId, lawos_tenant_id: fixture.lawosTenantId, entra_tenant_id: fixture.entraTenantId, source_sha: fixture.sourceSha, source_tree: fixture.sourceTree, version: fixture.version, verdict: "APPROVED", operation: "tenant_runtime_binding" });
  multiTenantReceipt.runtime = {
    binding_mode: "multi_tenant",
    review_status: "APPROVED",
    issuer_validation_strategy: "per_request_tenant_and_issuer_validation",
    isolation_negative_tests: "PASS",
    independent_review_ref: "review:runtime-isolation:001",
    reviewed_by: "security-reviewer-001",
    reviewed_at: "2026-08-12T01:20:00Z",
  };
  fixture.refs.runtime = writeSignedJson(fixture.root, "receipts/runtime-multi.json", multiTenantReceipt, fixture.keyPair);
  fixture.input.gates.tenant_provisioning.runtime_binding_receipt_ref = fixture.refs.runtime;
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "PASS");
  assert.equal(report.gates.find((gate) => gate.gate_id === "tenant_provisioning").state, "verified");
});

test("M365 positive and negative visibility are both required", () => {
  const fixture = makeCompleteFixture();
  fixture.m365Receipt.visibility.negative.status = "VISIBLE";
  fixture.refs.m365 = writeSignedJson(fixture.root, "receipts/m365-drift.json", fixture.m365Receipt, fixture.keyPair);
  fixture.input.gates.m365_consent_deployment_visibility.receipt_ref = fixture.refs.m365;
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "M365_NEGATIVE_VISIBILITY_STATUS"));
});

test("LawOS/Entra namespace swap and omission fail closed without legacy fallback", () => {
  const swapped = makeCompleteFixture();
  swapped.input.pilot.lawos_tenant_id = swapped.entraTenantId;
  swapped.input.pilot.entra_tenant_id = swapped.lawosTenantId;
  writeJson(swapped.root, "input.json", swapped.input);
  const swapReport = validateFixture(swapped);
  assert.equal(swapReport.verdict, "FAIL");
  assert.ok(swapReport.findings.some((finding) => finding.code === "NAMED_PILOT_FIELD_INVALID"));

  const omitted = makeCompleteFixture();
  delete omitted.input.pilot.entra_tenant_id;
  writeJson(omitted.root, "input.json", omitted.input);
  const omissionReport = validateFixture(omitted);
  assert.equal(omissionReport.verdict, "FAIL");
  assert.ok(omissionReport.findings.some((finding) => finding.code === "NAMED_PILOT_FIELD_INVALID"));

  const mixedReceipt = makeCompleteFixture();
  mixedReceipt.m365Receipt.lawos_tenant_id = mixedReceipt.lawosTenantId;
  delete mixedReceipt.m365Receipt.entra_tenant_id;
  mixedReceipt.refs.m365 = writeSignedJson(mixedReceipt.root, "receipts/m365-mixed.json", mixedReceipt.m365Receipt, mixedReceipt.keyPair);
  mixedReceipt.input.gates.m365_consent_deployment_visibility.receipt_ref = mixedReceipt.refs.m365;
  writeJson(mixedReceipt.root, "input.json", mixedReceipt.input);
  const mixedReport = validateFixture(mixedReceipt);
  assert.equal(mixedReport.verdict, "FAIL");
  assert.ok(mixedReport.findings.some((finding) => finding.code === "TENANT_ID_NAMESPACE_INVALID"));
});

test("receipt trust root rejects forged source/verdict, changed signature/public key, untrusted key, and scope mismatch", () => {
  const forged = makeCompleteFixture();
  const forgedApi = { ...forged.input.gates.api_artifact_deployment.receipt_ref };
  const forgedReceipt = {
    ...JSON.parse(readFileSync(path.join(forged.root, forgedApi.path), "utf8")),
    receipt_source: "operations_owner",
    verdict: "APPROVED",
  };
  forged.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(forged.root, "receipts/api-forged.json", forgedReceipt, forged.keyPair);
  writeJson(forged.root, "input.json", forged.input);
  const forgedReport = validateFixture(forged);
  assert.ok(forgedReport.findings.some((finding) => finding.code === "RECEIPT_SOURCE"));
  assert.ok(forgedReport.findings.some((finding) => finding.code === "RECEIPT_VERDICT_NOT_PASS"));

  const changedSignature = makeCompleteFixture();
  const changedSigBytes = Buffer.from("x".repeat(64));
  const changedSigRef = writeBytes(changedSignature.root, "receipts/api.json.sig", changedSigBytes);
  changedSignature.input.gates.api_artifact_deployment.receipt_ref.signature_ref = changedSigRef;
  writeJson(changedSignature.root, "input.json", changedSignature.input);
  const changedSignatureReport = validateFixture(changedSignature);
  assert.ok(changedSignatureReport.findings.some((finding) => finding.code.startsWith("TRUST_SIGNATURE") || finding.code === "TRUST_RECEIPT_HASH_MISMATCH"));

  const changedPublicKey = makeCompleteFixture();
  const otherKey = generateKeyPairSync("ed25519");
  const changedRegistry = JSON.parse(readFileSync(path.join(changedPublicKey.root, changedPublicKey.registryRef.path), "utf8"));
  changedRegistry.keys[0].public_key_spki_pem = otherKey.publicKey.export({ type: "spki", format: "pem" });
  installRootSignedRegistry(changedPublicKey, changedRegistry, "trust/registry-mutated.json");
  const changedPublicKeyReport = validateFixture(changedPublicKey);
  assert.ok(changedPublicKeyReport.findings.some((finding) => finding.code.startsWith("TRUST_SIGNATURE") || finding.code === "TRUST_REGISTRY_HASH_MISMATCH"));

  const untrusted = makeCompleteFixture();
  const untrustedReceipt = { ...JSON.parse(readFileSync(path.join(untrusted.root, untrusted.refs.api.path), "utf8")), key_id: "untrusted-key" };
  untrusted.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(untrusted.root, "receipts/api-untrusted.json", untrustedReceipt, untrusted.keyPair);
  writeJson(untrusted.root, "input.json", untrusted.input);
  const untrustedReport = validateFixture(untrusted);
  assert.ok(untrustedReport.findings.some((finding) => finding.code === "TRUSTED_KEY_NOT_FOUND"));

  const scope = makeCompleteFixture();
  const scopeReceipt = { ...JSON.parse(readFileSync(path.join(scope.root, scope.refs.api.path), "utf8")), pilot_id: "pilot-other-firm-002" };
  scope.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(scope.root, "receipts/api-scope.json", scopeReceipt, scope.keyPair);
  writeJson(scope.root, "input.json", scope.input);
  const scopeReport = validateFixture(scope);
  assert.ok(scopeReport.findings.some((finding) => finding.code === "PILOT_ID_MISMATCH"));
  assert.ok(scopeReport.findings.some((finding) => finding.code === "TRUST_RECEIPT_SCOPE_MISMATCH"));

  const keyScope = makeCompleteFixture();
  const keyScopeRegistry = JSON.parse(readFileSync(path.join(keyScope.root, keyScope.registryRef.path), "utf8"));
  keyScopeRegistry.keys[0].allowed_pilot_ids = ["pilot-other-firm-002"];
  installRootSignedRegistry(keyScope, keyScopeRegistry, "trust/registry-scope.json");
  const keyScopeReport = validateFixture(keyScope);
  assert.ok(keyScopeReport.findings.some((finding) => finding.code === "TRUSTED_KEY_SCOPE_MISMATCH"));

  const sourceScope = makeCompleteFixture();
  const sourceScopeRegistry = JSON.parse(readFileSync(path.join(sourceScope.root, sourceScope.registryRef.path), "utf8"));
  sourceScopeRegistry.keys[0].allowed_source_trees = ["f".repeat(40)];
  installRootSignedRegistry(sourceScope, sourceScopeRegistry, "trust/registry-source-scope.json");
  const sourceScopeReport = validateFixture(sourceScope);
  assert.ok(sourceScopeReport.findings.some((finding) => finding.code === "TRUSTED_KEY_SCOPE_MISMATCH"));

  const missingRegistry = makeCompleteFixture();
  const missingRegistryReport = validateExternalReleaseReadiness({ rootDir: missingRegistry.root, inputPath: missingRegistry.inputRef.path, contractPath: "contracts/external-release-readiness-contract.json" });
  assert.ok(missingRegistryReport.findings.some((finding) => finding.code === "TRUST_ROOT_NOT_CONFIGURED"));
});

test("receipt trust timestamps reject impossible calendar dates", () => {
  const fixture = makeCompleteFixture();
  const api = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.api.path), "utf8"));
  api.issued_at = "2026-02-30T01:30:00Z";
  fixture.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(fixture.root, "receipts/api-impossible-date.json", api, fixture.keyPair);
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_TIMESTAMP_INVALID"));
});

test("signed receipt replay cannot cross the exact LawOS tenant namespace", () => {
  const fixture = makeCompleteFixture();
  const replayReceipt = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.api.path), "utf8"));
  replayReceipt.lawos_tenant_id = "lawos-other-002";
  const replayRegistry = JSON.parse(readFileSync(path.join(fixture.root, fixture.registryRef.path), "utf8"));
  replayRegistry.keys[0].allowed_lawos_tenant_ids.push("lawos-other-002");
  installRootSignedRegistry(fixture, replayRegistry, "trust/registry-replay-scope.json");
  fixture.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(fixture.root, "receipts/api-cross-tenant-replay.json", replayReceipt, fixture.keyPair);
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_RECEIPT_TENANT_SCOPE_MISMATCH"));
});

test("detached receipt expiry rejects the exact now boundary", () => {
  const fixture = makeCompleteFixture();
  const now = Date.parse("2026-08-12T02:00:00Z");
  const receipt = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.api.path), "utf8"));
  receipt.expires_at = "2026-08-12T02:00:00Z";
  const receiptRef = writeSignedJson(fixture.root, "receipts/api-expiry-equality.json", receipt, fixture.keyPair);
  const registry = verifyTrustedRegistry({ rootDir: fixture.root, registryPath: fixture.registryRef.path, registrySha256: fixture.registryRef.sha256, now });
  const receiptBytes = readFileSync(path.join(fixture.root, receiptRef.path));
  assert.throws(() => verifyDetachedReceipt({
    rootDir: fixture.root,
    receiptRef,
    receiptBytes,
    receipt,
    registry,
    expectedReceiptType: "api_artifact_deployment",
    expectedReceiptSource: "release_pipeline",
    expectedPilotId: fixture.pilotId,
    expectedLawosTenantId: fixture.lawosTenantId,
    expectedEntraTenantId: fixture.entraTenantId,
    expectedSourceSha: fixture.sourceSha,
    expectedSourceTree: fixture.sourceTree,
    expectedVersion: fixture.version,
    expectedRole: "release_pipeline",
    expectedOperation: "api_artifact_deployment",
    expectedArtifactSha256: receipt.artifact_sha256,
    expectedBindingSha256: receipt.binding_sha256,
    now,
  }), (error) => error?.code === "TRUST_RECEIPT_TIME_INVALID");
});

test("detached receipt validation rejects invalid clocks before expiry checks", () => {
  const fixture = makeCompleteFixture();
  const expiredReceipt = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.api.path), "utf8"));
  expiredReceipt.issued_at = "2020-01-02T00:00:00Z";
  expiredReceipt.expires_at = "2021-01-01T00:00:00Z";
  const expiredReceiptRef = writeSignedJson(fixture.root, "receipts/api-expired.json", expiredReceipt, fixture.keyPair);
  for (const now of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1]) {
    assert.throws(() => verifyApiReceipt(fixture, { now, receiptRef: expiredReceiptRef }), (error) => error?.code === "TRUST_VALIDATION_CLOCK_INVALID");
  }
  assert.equal(verifyApiReceipt(fixture).valid, true);
  assert.throws(
    () => verifyApiReceipt(fixture, { now: Date.parse("2026-08-12T02:00:00Z"), receiptRef: expiredReceiptRef }),
    (error) => error?.code === "TRUST_RECEIPT_TIME_INVALID",
  );
});

test("trusted registry validation rejects invalid clocks before registry time checks", () => {
  const fixture = makeCompleteFixture();
  for (const now of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1]) {
    assert.throws(() => verifyTrustedRegistry({
      rootDir: fixture.root,
      registryPath: fixture.registryRef.path,
      registrySha256: fixture.registryRef.sha256,
      now,
    }), (error) => error?.code === "TRUST_VALIDATION_CLOCK_INVALID");
    assert.throws(() => installedRegistry(fixture, now), (error) => error?.code === "TRUST_VALIDATION_CLOCK_INVALID");
  }
  assert.equal(installedRegistry(fixture).registry.registry_serial, 1);
});

test("trusted registry generated_at cannot be in the future", () => {
  const fixture = makeCompleteFixture();
  const futureRegistry = JSON.parse(readFileSync(path.join(fixture.root, fixture.registryRef.path), "utf8"));
  futureRegistry.generated_at = "2026-08-13T00:00:00Z";
  const futureRegistryRef = writeJson(fixture.root, "trust/registry-future-generated.json", futureRegistry);
  assert.throws(() => verifyTrustedRegistry({
    rootDir: fixture.root,
    registryPath: futureRegistryRef.path,
    registrySha256: futureRegistryRef.sha256,
    now: Date.parse("2026-08-12T23:59:59Z"),
  }), (error) => error?.code === "TRUST_REGISTRY_TIME_INVALID");
});

test("normal production validation rejects a caller-minted registry even when legacy options are supplied", () => {
  const fixture = makeCompleteFixture();
  const report = validateExternalReleaseReadiness({
    rootDir: fixture.root,
    inputPath: fixture.inputRef.path,
    trustRegistryPath: fixture.registryRef.path,
    trustRegistrySha256: fixture.registryRef.sha256,
  });
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "TRUST_ROOT_NOT_CONFIGURED"));
  assert.equal(report.boundary.trusted_receipt_registry_supplied, false);
  assert.throws(() => main(["--root", fixture.root, "--input", fixture.inputRef.path, "--trust-registry", fixture.registryRef.path, "--trust-registry-sha256", fixture.registryRef.sha256]), /unknown argument/);
});

test("canonical contract hash rejects an empty or drifted caller contract", () => {
  const fixture = makeCompleteFixture();
  writeFileSync(path.join(fixture.root, "contracts/external-release-readiness-contract.json"), Buffer.from("{}\n"));
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "CANONICAL_CONTRACT_HASH_MISMATCH"));
  assert.ok(report.findings.some((finding) => finding.code === "CONTRACT_SHAPE_INVALID"));
});

test("ancestor symlink receipt paths fail closed", () => {
  const fixture = makeCompleteFixture();
  symlinkSync(path.join(fixture.root, "receipts"), path.join(fixture.root, "linked-receipts"));
  fixture.input.gates.api_artifact_deployment.receipt_ref = {
    ...fixture.refs.api,
    path: "linked-receipts/api.json",
    signature_ref: { ...fixture.refs.api.signature_ref, path: "linked-receipts/api.json.sig" },
  };
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "FILE_REFERENCE_SYMLINK"));
});

test("nested deployment timestamps and authority receipt bindings are strict", () => {
  const timestampFixture = makeCompleteFixture();
  const api = JSON.parse(readFileSync(path.join(timestampFixture.root, timestampFixture.refs.api.path), "utf8"));
  api.deployment.deployed_at = "2026-02-30T01:00:00Z";
  timestampFixture.input.gates.api_artifact_deployment.receipt_ref = writeSignedJson(timestampFixture.root, "receipts/api-impossible-deployment-date.json", api, timestampFixture.keyPair);
  writeJson(timestampFixture.root, "input.json", timestampFixture.input);
  const timestampReport = validateFixture(timestampFixture);
  assert.ok(timestampReport.findings.some((finding) => finding.code === "DEPLOYMENT_TIMESTAMP_INVALID"));

  const missingFixture = makeCompleteFixture();
  const operations = JSON.parse(readFileSync(path.join(missingFixture.root, missingFixture.refs.operations.path), "utf8"));
  delete operations.source_tree;
  delete operations.entra_tenant_id;
  missingFixture.input.gates.operations_support_rollback.receipt_ref = writeSignedJson(missingFixture.root, "receipts/operations-missing-bindings.json", operations, missingFixture.keyPair);
  writeJson(missingFixture.root, "input.json", missingFixture.input);
  const missingReport = validateFixture(missingFixture);
  assert.ok(missingReport.findings.some((finding) => finding.code === "RECEIPT_REQUIRED_FIELDS_MISSING"));
  assert.ok(missingReport.findings.some((finding) => finding.code === "TENANT_ID_NAMESPACE_INVALID"));
});

test("provisioning adapter reconciles internal manifest digest and bytes", () => {
  const fixture = makeCompleteFixture();
  const internal = JSON.parse(readFileSync(path.join(fixture.root, "receipts/internal-provisioning.json"), "utf8"));
  internal.manifest_ref = `manifest_sha256:${"f".repeat(64)}`;
  const internalRef = writeJson(fixture.root, "receipts/internal-provisioning-mismatch.json", internal);
  const provisioning = JSON.parse(readFileSync(path.join(fixture.root, fixture.refs.provisioning.path), "utf8"));
  provisioning.internal_receipt_ref = internalRef;
  fixture.input.gates.tenant_provisioning.provisioning_receipt_ref = writeSignedJson(fixture.root, "receipts/provisioning-manifest-mismatch.json", provisioning, fixture.keyPair);
  writeJson(fixture.root, "input.json", fixture.input);
  const report = validateFixture(fixture);
  assert.equal(report.verdict, "FAIL");
  assert.ok(report.findings.some((finding) => finding.code === "INTERNAL_PROVISIONING_MANIFEST_REF_MISMATCH"));
});

test("validator reports are atomically rewritten with private mode", () => {
  const fixture = makeCompleteFixture();
  mkdirSync(path.join(fixture.root, "reports"), { recursive: true });
  const reportPath = path.join(fixture.root, "reports/readiness.json");
  const markdownPath = path.join(fixture.root, "reports/readiness.md");
  writeFileSync(reportPath, "old\n");
  writeFileSync(markdownPath, "old\n");
  chmodSync(reportPath, 0o644);
  chmodSync(markdownPath, 0o644);
  const exitCode = main(["--root", fixture.root, "--input", fixture.inputRef.path, "--report", "reports/readiness.json", "--report-md", "reports/readiness.md"]);
  assert.equal(exitCode, 1);
  assert.equal(statSync(reportPath).mode & 0o777, 0o600);
  assert.equal(statSync(markdownPath).mode & 0o777, 0o600);
});

test("CLI rejects a symlink --root before creating any report target", () => {
  const fixture = makeCompleteFixture();
  const rootLink = path.join(fixture.root, "root-link");
  symlinkSync(fixture.root, rootLink);
  const reportDirectory = path.join(fixture.root, "reports-never-created");
  const reportPath = "reports-never-created/readiness.json";
  assert.throws(() => execFileSync(process.execPath, [
    path.join(repoRoot, "scripts/validate-external-release-readiness.mjs"),
    "--root",
    rootLink,
    "--input",
    fixture.inputRef.path,
    "--report",
    reportPath,
  ], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), (error) => error.status !== 0);
  assert.equal(existsSync(reportDirectory), false);
});
