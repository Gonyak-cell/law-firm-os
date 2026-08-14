import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA,
  WINDOWS_UPDATE_EXECUTION_MODE,
} from "../lib/windows-formal-update-admission.mjs";
import {
  WINDOWS_UPDATE_OPERATIONS,
} from "../lib/windows-formal-update-approval.mjs";
import {
  validateWindowsFormalUpdateRunnerPassReceipt,
} from "../lib/windows-formal-update-runner.mjs";
import {
  WINDOWS_UPDATE_PRIVATE_LOCATOR_SCHEMA,
  createWindowsFormalUpdateHandoffAwsCliAdapter,
  createWindowsFormalUpdateEncryptedBridge,
  createWindowsFormalUpdateHandoffFailureReceipt,
  decryptWindowsFormalUpdateEncryptedBridge,
  finalizeWindowsFormalUpdateConsumerReceipt,
  finalizeWindowsFormalUpdateHandoffReceipt,
  materializeWindowsFormalUpdatePrivateHandoff,
  parseWindowsFormalUpdatePrivateLocatorArtifactRefJson,
  parseWindowsFormalUpdatePrivateLocatorJson,
  persistWindowsFormalUpdateProviderCallState,
  purgeWindowsFormalUpdatePrivateRoots,
  readWindowsFormalUpdateHandoffProviderCallState,
  readWindowsFormalUpdateProviderCallState,
  reconcileWindowsFormalUpdateHandoffProviderCallState,
  transitionWindowsFormalUpdateHandoffProviderCallState,
  writeWindowsFormalUpdateHandoffReceipt,
  createWindowsFormalUpdateHandoffPreflightReceipt,
} from "../lib/windows-formal-update-handoff-consumer.mjs";

const NOW = Date.parse("2026-08-14T00:00:00.000Z");
const GENERATED_AT = "2026-08-13T00:00:00.000Z";
const RETAIN_UNTIL = "2027-08-14T00:00:00.000Z";
const ACCOUNT = "770880870480";
const REGION = "ap-northeast-2";
const BUCKET = "amic-lawos-private-release-artifacts";
const KMS_KEY_ARN = "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-2222-4333-8444-555555555555";
const WRAPPING_KMS_KEY_ARN = "arn:aws:kms:ap-northeast-2:770880870480:key/99999999-8888-4777-8666-555555555555";
const READER_ROLE_ARN = "arn:aws:iam::770880870480:role/lawos-windows-artifact-reader";
const SIGNER_CERTIFICATE_SHA1 = "A".repeat(40);
const PRIVATE_FILE_NAMES = {
  installer: "signed-installer.exe",
  build_manifest: "windows-build-manifest.json",
  native_package_qa: "formal-windows-package-qa.json",
  installed_tree_sbom: "windows-installed-tree-sbom.cdx.json",
};
const RUN_BINDING = `Gonyak-cell/law-firm-os:123456789:1:${"a".repeat(40)}:${"b".repeat(40)}`;

let cachedBridgeKeys;

function bridgeKeys() {
  if (!cachedBridgeKeys) {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 4096,
      publicExponent: 0x10001,
      publicKeyEncoding: { format: "der", type: "spki" },
      privateKeyEncoding: { format: "der", type: "pkcs8" },
    });
    cachedBridgeKeys = Object.freeze({
      publicKey,
      privateKey,
      publicKeyBase64: publicKey.toString("base64"),
      publicKeySha256: sha256(publicKey),
    });
  }
  return cachedBridgeKeys;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function checksum(digest) {
  return Buffer.from(digest, "hex").toString("base64");
}

function proof({ role, sourceSha, version, kind, bytes }) {
  const digest = sha256(bytes);
  const versionId = `immutable-${role}-${kind}-version-id`;
  const key = `windows/signed/v1/${sourceSha}/${version}/${role}/${kind}/sha256/${digest}/${PRIVATE_FILE_NAMES[kind]}`;
  const upload = {
    status: "PASS",
    artifact_sha256: digest,
    bytes: bytes.length,
    digest_verified: true,
    provider_checksum_sha256: checksum(digest),
  };
  const head = {
    status: "PASS",
    version_id: versionId,
    content_length: bytes.length,
    artifact_sha256_metadata: digest,
    server_side_encryption: "aws:kms",
    kms_key_arn: KMS_KEY_ARN,
    provider_checksum_sha256: checksum(digest),
    object_lock_mode: "COMPLIANCE",
    retain_until: RETAIN_UNTIL,
  };
  const get = {
    status: "PASS",
    version_id: versionId,
    content_length: bytes.length,
    sha256: digest,
    provider_checksum_sha256: checksum(digest),
    digest_verified: true,
    server_side_encryption: "aws:kms",
    kms_key_arn: KMS_KEY_ARN,
    object_lock_mode: "COMPLIANCE",
    retain_until: RETAIN_UNTIL,
  };
  return {
    sha256: digest,
    bytes: bytes.length,
    key,
    version_id: versionId,
    upload,
    head_readback: head,
    get_readback: get,
  };
}

function candidateFixture(role, files, { installedExecutableAliasesUninstaller = false } = {}) {
  const baseline = role === "baseline";
  const sourceSha = (baseline ? "1" : "2").repeat(40);
  const sourceTree = (baseline ? "3" : "4").repeat(40);
  const version = baseline ? "0.1.16" : "0.1.17";
  const installerPath = `${role}/matter-${version}.exe`;
  const installedExecutablePath = "./matter.exe";
  const uninstallerPath = "./Uninstall matter.exe";
  const installerBytes = Buffer.from(`${role}-${version}-signed-installer-private-bytes`);
  const installerSha256 = sha256(installerBytes);
  const installedExecutableBytes = baseline ? 64 : 65;
  const installedExecutableSha256 = (baseline ? "a" : "b").repeat(64);
  const uninstallerBytes = baseline ? 128 : 129;
  const uninstallerSha256 = (baseline ? "8" : "9").repeat(64);
  const installedTreeSha256 = (baseline ? "d" : "c").repeat(64);
  const nativeIdentitySha256 = (baseline ? "e" : "f").repeat(64);
  const installedTreeBytes = installedExecutableBytes + uninstallerBytes;
  const installedExecutableBindingPath = installedExecutableAliasesUninstaller
    ? uninstallerPath
    : installedExecutablePath;
  const installedExecutableBindingSha256 = installedExecutableAliasesUninstaller
    ? uninstallerSha256
    : installedExecutableSha256;
  const installedExecutableBindingBytes = installedExecutableAliasesUninstaller
    ? uninstallerBytes
    : installedExecutableBytes;
  const nativeSnapshot = {
    schema_version: "law-firm-os.windows-installed-tree-native-snapshot.v1",
    filesystem: "NTFS",
    content_sha256: installedTreeSha256,
    identity_sha256: nativeIdentitySha256,
    file_count: 2,
    directory_count: 1,
    bytes: installedTreeBytes,
    fixed_point_sequence: ["B0", "I1", "B1", "I2", "B2"],
    fixed_point_exact: true,
    equality_proof: "B0_I1_B1_I2_B2_PUBLIC_AND_PRIVATE_MANIFEST_EXACT_EQUALITY",
    phases: ["B0", "I1", "B1", "I2", "B2"].map((name) => ({
      name,
      content_sha256: installedTreeSha256,
      identity_sha256: nativeIdentitySha256,
      file_count: 2,
      directory_count: 1,
      bytes: installedTreeBytes,
    })),
  };
  const authenticode = passAuthenticodeFixture();
  const nativePackageQa = {
    schema_version: "law-firm-os.formal-windows-package-qa.v1",
    verdict: "PASS",
    native_verdict: "PASS",
    source: { revision: sourceSha, source_tree: sourceTree, source_dirty: false },
    package: {
      channel: "formal",
      app_id: "com.amic.matter.desktop",
      installer: { path: installerPath, sha256: installerSha256 },
      uninstaller: {
        path: uninstallerPath,
        sha256: uninstallerSha256,
        bytes: uninstallerBytes,
        installed_tree_path: uninstallerPath,
        installed_tree_sha256: uninstallerSha256,
        uninstaller_bytes: uninstallerBytes,
        authenticode,
        authenticode_valid: true,
        lock_mode: "FileShare.Read",
        denies_write_delete: true,
        process: { path_identity: "pid_executable_path", pid: baseline ? 8101 : 8102 },
        exit_code: 0,
      },
    },
    sbom: {
      schema_version: "law-firm-os.matter-desktop-installed-tree-sbom.v1",
      format: "CycloneDX",
      spec_version: "1.5",
      installed_tree_sha256: installedTreeSha256,
      installed_tree_file_count: 2,
      installed_tree_bytes: installedTreeBytes,
      native_identity_sha256: nativeIdentitySha256,
      native_directory_count: 1,
      native_fixed_point_sequence: ["B0", "I1", "B1", "I2", "B2"],
      native_fixed_point_exact: true,
      native_snapshot: nativeSnapshot,
    },
  };
  const installedTreeSbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    metadata: {
      component: {
        type: "application",
        name: "matter-desktop-windows-installed-tree",
        version,
        properties: [
          { name: "law-firm-os:schema-version", value: "law-firm-os.matter-desktop-installed-tree-sbom.v1" },
          { name: "law-firm-os:source-sha", value: sourceSha },
          { name: "law-firm-os:source-tree", value: sourceTree },
          { name: "law-firm-os:installer-sha256", value: installerSha256 },
          { name: "law-firm-os:native-snapshot-schema-version", value: nativeSnapshot.schema_version },
          { name: "law-firm-os:installed-tree-sha256", value: installedTreeSha256 },
          { name: "law-firm-os:native-identity-sha256", value: nativeIdentitySha256 },
          { name: "law-firm-os:installed-tree-file-count", value: String(nativeSnapshot.file_count) },
          { name: "law-firm-os:native-directory-count", value: String(nativeSnapshot.directory_count) },
          { name: "law-firm-os:installed-tree-bytes", value: String(nativeSnapshot.bytes) },
          { name: "law-firm-os:installed-executable-path", value: installedExecutableBindingPath },
          { name: "law-firm-os:installed-executable-sha256", value: installedExecutableBindingSha256 },
        ],
      },
    },
    components: [
      {
        type: "file",
        name: installedExecutablePath,
        hashes: [{ alg: "SHA-256", content: installedExecutableSha256.toUpperCase() }],
        properties: [{ name: "law-firm-os:file-bytes", value: String(installedExecutableBytes) }],
      },
      {
        type: "file",
        name: uninstallerPath,
        hashes: [{ alg: "SHA-256", content: uninstallerSha256.toUpperCase() }],
        properties: [{ name: "law-firm-os:file-bytes", value: String(uninstallerBytes) }],
      },
    ],
  };
  const buildManifest = {
    schema_version: "law-firm-os.matter-desktop-build-provenance.v1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    source_dirty: false,
    version,
    channel: "formal",
    app_id: "com.amic.matter.desktop",
    platform: "win32",
    arch: "x64",
    installer_sha256: installerSha256,
    installed_tree_sha256: installedTreeSha256,
    native_identity_sha256: nativeIdentitySha256,
  };
  const artifactBytes = {
    installer: installerBytes,
    build_manifest: Buffer.from(`${JSON.stringify(buildManifest, null, 2)}\n`),
    native_package_qa: Buffer.from(`${JSON.stringify(nativePackageQa, null, 2)}\n`),
    installed_tree_sbom: Buffer.from(`${JSON.stringify(installedTreeSbom, null, 2)}\n`),
  };
  const artifacts = Object.fromEntries(Object.entries(artifactBytes).map(([kind, bytes]) => [
    kind,
    proof({ role, sourceSha, version, kind, bytes }),
  ]));
  for (const [kind, record] of Object.entries(artifacts)) {
    files.set(`${record.key}\0${record.version_id}`, artifactBytes[kind]);
  }
  const installer = artifacts.installer;
  const receipt = {
    schema_version: "law-firm-os.windows-signed-artifact-private-handoff.v1",
    generated_at: GENERATED_AT,
    verdict: "PASS",
    candidate_role: role,
    source_sha: sourceSha,
    source_tree: sourceTree,
    version,
    installer_sha256: installer.sha256,
    installer_bytes: installer.bytes,
    installed_tree_sbom_sha256: artifacts.installed_tree_sbom.sha256,
    native_package_qa_sha256: artifacts.native_package_qa.sha256,
    build_manifest_sha256: artifacts.build_manifest.sha256,
    artifacts,
    storage: {
      provider: "aws_s3",
      account_id: ACCOUNT,
      region: REGION,
      bucket: BUCKET,
      key: installer.key,
      version_id: installer.version_id,
      versioning_enabled: true,
      ownership: "BucketOwnerEnforced",
      encryption: { mode: "aws:kms", kms_key_arn: KMS_KEY_ARN },
      immutability: { object_lock_mode: "COMPLIANCE", retain_until: RETAIN_UNTIL },
      upload: installer.upload,
      head_readback: installer.head_readback,
      get_readback: installer.get_readback,
    },
    claim_policy: {
      private_distribution: true,
      public_distribution: false,
      external_distribution: false,
      production_go_live: false,
    },
  };
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`);
  const receiptDigest = sha256(receiptBytes);
  const receiptLocator = {
    schema_version: "law-firm-os.windows-signed-artifact-private-handoff-locator.v1",
    account_id: ACCOUNT,
    region: REGION,
    bucket: BUCKET,
    key: `windows/signed/v1/${sourceSha}/${version}/${role}/private_handoff_receipt/sha256/${receiptDigest}/windows-signed-artifact-private-handoff.json`,
    version_id: `immutable-${role}-private-handoff-receipt-version-id`,
    sha256: receiptDigest,
    bytes: receiptBytes.length,
    provider_checksum_sha256: checksum(receiptDigest),
    server_side_encryption: "aws:kms",
    kms_key_arn: KMS_KEY_ARN,
    object_lock_mode: "COMPLIANCE",
    retain_until: RETAIN_UNTIL,
  };
  files.set(`${receiptLocator.key}\0${receiptLocator.version_id}`, receiptBytes);
  const metadataPath = `${role}/update.json`;
  const signaturePath = `${role}/update.sig`;
  return {
    identity: {
      sourceSha,
      sourceTree,
      version,
      installerSha256: installer.sha256,
      installerBytes: installer.bytes,
    },
    installedTree: {
      schema_version: nativeSnapshot.schema_version,
      content_sha256: nativeSnapshot.content_sha256,
      identity_sha256: nativeSnapshot.identity_sha256,
      file_count: nativeSnapshot.file_count,
      directory_count: nativeSnapshot.directory_count,
      bytes: nativeSnapshot.bytes,
      installed_executable_path: installedExecutableBindingPath,
      installed_executable_sha256: installedExecutableBindingSha256,
      installed_executable_bytes: installedExecutableBindingBytes,
    },
    input: { installer_path: installerPath, metadata_path: metadataPath, signature_path: signaturePath },
    locator: {
      source_sha: sourceSha,
      source_tree: sourceTree,
      version,
      private_handoff_locator: receiptLocator,
      materialized_paths: {
        installer: installerPath,
        build_manifest: `${role}/windows-build-manifest.json`,
        native_package_qa: `${role}/formal-windows-package-qa.json`,
        installed_tree_sbom: `${role}/windows-installed-tree-sbom.cdx.json`,
      },
      update_metadata: null,
      update_metadata_signature: null,
      release_manifest: null,
    },
  };
}

function governanceObject({ files, id, relativePath, bytes }) {
  const digest = sha256(bytes);
  const record = {
    relative_path: relativePath,
    key: `windows/governance/v1/${id}/sha256/${digest}/${path.posix.basename(relativePath)}`,
    version_id: `immutable-governance-${id}-version-id`,
    sha256: digest,
    bytes: bytes.length,
    provider_checksum_sha256: checksum(digest),
    object_lock_mode: "COMPLIANCE",
    retain_until: RETAIN_UNTIL,
  };
  files.set(`${record.key}\0${record.version_id}`, bytes);
  return record;
}

function fixture({ baseline: baselineOptions, target: targetOptions } = {}) {
  const files = new Map();
  const baseline = candidateFixture("baseline", files, baselineOptions);
  const target = candidateFixture("target", files, targetOptions);
  for (const candidate of [baseline, target]) {
    const role = candidate.identity.version === "0.1.16" ? "baseline" : "target";
    candidate.locator.release_manifest = governanceObject({
      files,
      id: `${role}-release-manifest`,
      relativePath: `${role}/release-manifest.json`,
      bytes: Buffer.from(`${JSON.stringify({
        version: candidate.identity.version,
        sourceSha: candidate.identity.sourceSha,
        sourceTree: candidate.identity.sourceTree,
        artifactSha256: candidate.identity.installerSha256,
        artifactBytes: candidate.identity.installerBytes,
      }, null, 2)}\n`),
    });
    candidate.locator.update_metadata = governanceObject({
      files,
      id: `${role}-metadata`,
      relativePath: candidate.input.metadata_path,
      bytes: Buffer.from(`${JSON.stringify({ role, signed: true }, null, 2)}\n`),
    });
    candidate.locator.update_metadata_signature = governanceObject({
      files,
      id: `${role}-metadata-signature`,
      relativePath: candidate.input.signature_path,
      bytes: Buffer.alloc(64, role === "baseline" ? 1 : 2),
    });
  }
  const executionInputBytes = Buffer.from(`${JSON.stringify({
    schema_version: WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA,
    execution_mode: WINDOWS_UPDATE_EXECUTION_MODE,
    automatic_update: false,
    baseline: baseline.input,
    target: target.input,
  }, null, 2)}\n`);
  const locator = {
    schema_version: WINDOWS_UPDATE_PRIVATE_LOCATOR_SCHEMA,
    account_id: ACCOUNT,
    region: REGION,
    reader_role_arn: READER_ROLE_ARN,
    bucket: BUCKET,
    kms_key_arn: KMS_KEY_ARN,
    candidates: { baseline: baseline.locator, target: target.locator },
    governance: {
      execution_input: governanceObject({ files, id: "execution-input", relativePath: "governance/execution-input.json", bytes: executionInputBytes }),
      approval_receipt: governanceObject({ files, id: "approval-receipt", relativePath: "governance/approval-receipt.json", bytes: Buffer.from("{\n  \"approved\": true\n}\n") }),
      approval_signature: governanceObject({ files, id: "approval-signature", relativePath: "governance/approval-receipt.json.sig", bytes: Buffer.alloc(64, 3) }),
    },
    claim_policy: {
      private_distribution: true,
      automatic_update: false,
      public_release: false,
      external_distribution: false,
      production_go_live: false,
    },
  };
  const raw = JSON.stringify(locator);
  return {
    baseline,
    target,
    files,
    locator,
    raw,
    rawSha256: sha256(Buffer.from(raw)),
  };
}

function liveResponse(object) {
  return {
    VersionId: object.version_id,
    ContentLength: object.bytes,
    ServerSideEncryption: "aws:kms",
    SSEKMSKeyId: KMS_KEY_ARN,
    ChecksumSHA256: object.provider_checksum_sha256,
    ObjectLockMode: "COMPLIANCE",
    ObjectLockRetainUntilDate: object.retain_until,
    Metadata: { "artifact-sha256": object.sha256 },
  };
}

function mockAws(input, { inspect = (value) => value, head = (value) => value, get = (value) => value, body = (value) => value } = {}) {
  const calls = [];
  return {
    calls,
    async inspectGovernance() {
      calls.push({ operation: "inspect" });
      return inspect({
        identity: { Account: ACCOUNT, Arn: `arn:aws:sts::${ACCOUNT}:assumed-role/lawos-windows-artifact-reader/test-session` },
        location: { LocationConstraint: REGION },
        versioning: { Status: "Enabled" },
        publicAccess: { PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true } },
        objectLock: { ObjectLockConfiguration: { ObjectLockEnabled: "Enabled" } },
        encryption: { ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "aws:kms", KMSMasterKeyID: KMS_KEY_ARN } }] } },
        ownership: { OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] } },
        kms: { KeyMetadata: { Arn: KMS_KEY_ARN, Enabled: true, KeyState: "Enabled" } },
      });
    },
    async headObject({ object }) {
      calls.push({ operation: "head", key: object.key, versionId: object.version_id });
      return head(liveResponse(object), object);
    },
    async getObject({ object, destination }) {
      calls.push({ operation: "get", key: object.key, versionId: object.version_id });
      const expected = input.files.get(`${object.key}\0${object.version_id}`);
      writeFileSync(destination, body(expected, object));
      return get(liveResponse(object), object);
    },
  };
}

function withDurableProviderState(aws, statePath, locatorSha256) {
  const beforeProviderCall = () => persistWindowsFormalUpdateProviderCallState({
    statePath,
    locatorSha256,
    runBinding: RUN_BINDING,
  });
  return {
    ...aws,
    inspectGovernance: async (...args) => {
      beforeProviderCall();
      return aws.inspectGovernance(...args);
    },
    headObject: async (...args) => {
      beforeProviderCall();
      return aws.headObject(...args);
    },
    getObject: async (...args) => {
      beforeProviderCall();
      return aws.getObject(...args);
    },
  };
}

function validated(input) {
  return parseWindowsFormalUpdatePrivateLocatorJson(input.raw, {
    expectedSha256: input.rawSha256,
    expectedReaderRoleArn: READER_ROLE_ARN,
    expectedBucket: BUCKET,
    expectedKmsKeyArn: KMS_KEY_ARN,
    now: NOW,
  });
}

function aggregateReceiptProof(input) {
  const [, , , sourceSha, sourceTree] = RUN_BINDING.split(":");
  const artifactRefInput = {
    schema_version: "law-firm-os.windows-formal-update-private-locator-artifact-ref.v1",
    producer_repository: "Gonyak-cell/law-firm-os",
    producer_workflow_ref: "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal.yml@refs/heads/main",
    producer_job: "seal-private-locator",
    producer_run_id: "123456789",
    producer_run_attempt: "1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_name: "windows-formal-update-private-locator-123456789-1",
    artifact_id: "987654321",
    artifact_digest: `sha256:${"c".repeat(64)}`,
    envelope_sha256: "d".repeat(64),
    private_locator_sha256: input.rawSha256,
    wrapping_public_key_sha256: "f".repeat(64),
  };
  const { ref, artifact_ref_sha256: artifactRefSha256 } = parseWindowsFormalUpdatePrivateLocatorArtifactRefJson(
    JSON.stringify(artifactRefInput),
    { expectedSourceSha: sourceSha, expectedSourceTree: sourceTree },
  );
  return {
    locator_source: {
      artifact_ref_sha256: artifactRefSha256,
      producer: {
        repository: ref.producer_repository,
        workflow_ref: ref.producer_workflow_ref,
        job: ref.producer_job,
        run_id: ref.producer_run_id,
        run_attempt: ref.producer_run_attempt,
        source_sha: ref.source_sha,
        source_tree: ref.source_tree,
      },
      artifact: {
        name: ref.artifact_name,
        id: ref.artifact_id,
        digest: ref.artifact_digest,
        envelope_sha256: ref.envelope_sha256,
        private_locator_sha256: ref.private_locator_sha256,
        wrapping_public_key_sha256: ref.wrapping_public_key_sha256,
      },
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
      preflight_cleanup: {
        actions_read_token_cleared: true,
        oidc_credentials_absent: true,
        source_root_removed: true,
      },
    },
    locator_decryption: {
      wrapping_key_arn: WRAPPING_KMS_KEY_ARN,
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
      aws_account_id: ACCOUNT,
      aws_region: REGION,
      role_arn: READER_ROLE_ARN,
      locator_unwrap_kms_key_arn: WRAPPING_KMS_KEY_ARN,
    },
  };
}

test("public aggregate locator ref is closed, source-bound, and carries no plaintext locator", () => {
  const ref = {
    schema_version: "law-firm-os.windows-formal-update-private-locator-artifact-ref.v1",
    producer_repository: "Gonyak-cell/law-firm-os",
    producer_workflow_ref: "Gonyak-cell/law-firm-os/.github/workflows/windows-formal-update-private-locator-seal.yml@refs/heads/main",
    producer_job: "seal-private-locator",
    producer_run_id: "123456789",
    producer_run_attempt: "1",
    source_sha: "a".repeat(40),
    source_tree: "b".repeat(40),
    artifact_name: "windows-formal-update-private-locator-123456789-1",
    artifact_id: "987654321",
    artifact_digest: `sha256:${"c".repeat(64)}`,
    envelope_sha256: "d".repeat(64),
    private_locator_sha256: "e".repeat(64),
    wrapping_public_key_sha256: "f".repeat(64),
  };
  const parsed = parseWindowsFormalUpdatePrivateLocatorArtifactRefJson(JSON.stringify(ref), {
    expectedSourceSha: ref.source_sha,
    expectedSourceTree: ref.source_tree,
  });
  assert.equal(parsed.ref.artifact_name, ref.artifact_name);
  assert.match(parsed.artifact_ref_sha256, /^[0-9a-f]{64}$/u);
  assert.doesNotMatch(JSON.stringify(parsed.ref), /bucket|windows\/signed\/v1|version_id/u);
  assert.throws(() => parseWindowsFormalUpdatePrivateLocatorArtifactRefJson(JSON.stringify({ ...ref, exact_s3_locator: "forbidden" }), {
    expectedSourceSha: ref.source_sha,
    expectedSourceTree: ref.source_tree,
  }), /artifact ref/u);
});

function passAuthenticodeFixture() {
  return {
    signer_certificate_sha256: "A".repeat(64),
    signer_eku_oids: ["1.3.6.1.5.5.7.3.3"],
    signer_issuer: "CN=LawOS Test Issuer",
    signer_not_after: "2030-01-01T00:00:00.000Z",
    signer_not_before: "2020-01-01T00:00:00.000Z",
    signer_public_key_algorithm_oid: "1.2.840.113549.1.1.1",
    signer_serial_number: "01",
    signer_signature_algorithm_oid: "1.2.840.113549.1.1.11",
    signer_subject: "CN=LawOS Test Signer",
    signer_thumbprint: SIGNER_CERTIFICATE_SHA1,
    signature_type: "Authenticode",
    status: "Valid",
    status_message: "Signature verified.",
    time_stamper_certificate_present: true,
    timestamp_certificate_sha256: "B".repeat(64),
    timestamp_eku_oids: ["1.3.6.1.5.5.7.3.8"],
    timestamp_issuer: "CN=LawOS Test Timestamp Issuer",
    timestamp_not_after: "2030-01-01T00:00:00.000Z",
    timestamp_not_before: "2020-01-01T00:00:00.000Z",
    timestamp_public_key_algorithm_oid: "1.2.840.113549.1.1.1",
    timestamp_serial_number: "02",
    timestamp_signature_algorithm_oid: "1.2.840.113549.1.1.11",
    timestamp_subject: "CN=LawOS Test Timestamp",
    timestamp_thumbprint: "B".repeat(40),
  };
}

function runnerPassReceiptFixture() {
  const candidate = (role) => {
    const prefix = role === "baseline" ? "1" : "2";
    const installedTreeSha256 = (role === "baseline" ? "3" : "4").repeat(64);
    return {
      artifact_sha256: prefix.repeat(64),
      installed_tree: {
        schema_version: "law-firm-os.windows-installed-tree-native-snapshot.v1",
        content_sha256: installedTreeSha256,
        identity_sha256: (role === "baseline" ? "5" : "6").repeat(64),
        file_count: 1,
        directory_count: 1,
        bytes: 128,
        installed_executable_path: "./matter.exe",
        installed_executable_sha256: installedTreeSha256,
        installed_executable_bytes: 64,
      },
      metadata_raw_sha256: (role === "baseline" ? "7" : "8").repeat(64),
      release_manifest_sha256: (role === "baseline" ? "9" : "a").repeat(64),
      signature_raw_sha256: (role === "baseline" ? "b" : "c").repeat(64),
      source_sha: (role === "baseline" ? "d" : "e").repeat(40),
      version: role === "baseline" ? "0.1.16" : "0.1.17",
    };
  };
  const candidates = { baseline: candidate("baseline"), target: candidate("target") };
  const approvalIds = WINDOWS_UPDATE_OPERATIONS.map((_, index) => String(index + 1).repeat(64));
  const operations = WINDOWS_UPDATE_OPERATIONS.slice(0, 5).map((operation, index) => ({
    approval_id_sha256: approvalIds[index],
    initiated_at: GENERATED_AT,
    operation,
  }));
  const launches = ["baseline", "target", "baseline"].map((role, index) => {
    const tree = candidates[role].installed_tree;
    const hostIdentity = ["f", "0", "9"][index];
    return {
      authenticode_valid: true,
      exact_bytes_verified: true,
      executable_sha256: tree.installed_executable_sha256,
      role,
      session_started: true,
      session_stopped: true,
      post_install_installed_tree: { ...tree, identity_sha256: hostIdentity.repeat(64) },
      prelaunch_installed_tree: { ...tree, identity_sha256: hostIdentity.repeat(64) },
      source_sha: candidates[role].source_sha,
      version: candidates[role].version,
    };
  });
  const auth = passAuthenticodeFixture();
  const uninstalls = ["target", "baseline"].map((role, index) => {
    const candidate = candidates[role];
    const operation = index === 0 ? "target_uninstall_for_rollback" : "final_uninstall";
    const treeSha = (role === "target" ? "c" : "d").repeat(64);
    return {
      approval_id_sha256: approvalIds[WINDOWS_UPDATE_OPERATIONS.indexOf(operation)],
      artifact_sha256: candidate.artifact_sha256,
      authenticode: auth,
      authenticode_valid: true,
      denies_write_delete: true,
      exit_code: 0,
      installed_tree_path: `./${role}/matter.exe`,
      installed_tree_sha256: treeSha,
      lock_mode: "FileShare.Read",
      metadata_raw_sha256: candidate.metadata_raw_sha256,
      operation,
      process: { path_identity: "pid_executable_path", pid: 1000 + index },
      release_manifest_sha256: candidate.release_manifest_sha256,
      role,
      signature_raw_sha256: candidate.signature_raw_sha256,
      source_sha: candidate.source_sha,
      uninstaller_bytes: 128 + index,
      uninstaller_sha256: treeSha,
      version: candidate.version,
    };
  });
  const receipt = {
    approval_bundle_sha256: "e".repeat(64),
    approval_signature_sha256: "f".repeat(64),
    approved_operations: [...WINDOWS_UPDATE_OPERATIONS],
    automatic_update: false,
    boundaries: {
      automatic_update: false,
      production_go_live_claim: false,
      provider_call_performed: false,
      public_release_claim: false,
    },
    candidates,
    failure_cleanup: { completed: true, initiated: false, required: false },
    generated_at: GENERATED_AT,
    launches,
    operations,
    residue_checks: [
      { active_session_count: 0, checkpoint: "target_uninstalled_before_baseline_rollback", entry_count: 0, executable_present: false, uninstaller_count: 0 },
      { active_session_count: 0, checkpoint: "final_uninstall", entry_count: 0, executable_present: false, uninstaller_count: 0 },
    ],
    schema_version: "law-firm-os.windows-operator-update-rollback-qa.v1",
    signer_certificate_sha1: SIGNER_CERTIFICATE_SHA1,
    source_runner: { source_sha: "a".repeat(40), source_tree: "b".repeat(40) },
    uninstalls,
    verdict: "PASS",
  };
  return Object.freeze({ receipt, expectedBinding: {
    approval_bundle_sha256: receipt.approval_bundle_sha256,
    signer_certificate_sha1: receipt.signer_certificate_sha1,
    candidates,
  } });
}

test("runner PASS validator rejects forged, incomplete, extra-operation, and approval-drift receipts", () => {
  const { receipt, expectedBinding } = runnerPassReceiptFixture();
  assert.equal(validateWindowsFormalUpdateRunnerPassReceipt(receipt, expectedBinding), true);
  assert.notEqual(
    receipt.candidates.baseline.installed_tree.identity_sha256,
    receipt.launches[0].post_install_installed_tree.identity_sha256,
  );
  assert.notEqual(
    receipt.launches[0].post_install_installed_tree.identity_sha256,
    receipt.launches[2].post_install_installed_tree.identity_sha256,
  );

  const forged = {
    schema_version: receipt.schema_version,
    verdict: "PASS",
    automatic_update: false,
    boundaries: receipt.boundaries,
  };
  assert.throws(() => validateWindowsFormalUpdateRunnerPassReceipt(forged, expectedBinding), /shape|receipt/u);

  const missingOperation = structuredClone(receipt);
  missingOperation.operations.splice(1, 1);
  assert.throws(() => validateWindowsFormalUpdateRunnerPassReceipt(missingOperation, expectedBinding), /operation count|shape/u);

  const extraOperation = structuredClone(receipt);
  extraOperation.operations.push({ ...extraOperation.operations.at(-1), operation: "failure_cleanup" });
  assert.throws(() => validateWindowsFormalUpdateRunnerPassReceipt(extraOperation, expectedBinding), /operation count|shape|out of order/u);

  const approvalDrift = structuredClone(receipt);
  approvalDrift.approval_bundle_sha256 = "0".repeat(64);
  assert.throws(() => validateWindowsFormalUpdateRunnerPassReceipt(approvalDrift, expectedBinding), /approval bundle/u);

  const candidateTreeDrift = structuredClone(receipt);
  candidateTreeDrift.candidates.baseline.installed_tree.content_sha256 = "0".repeat(64);
  assert.throws(() => validateWindowsFormalUpdateRunnerPassReceipt(candidateTreeDrift, expectedBinding), /installed_tree/u);

  const checkpointTreeDrift = structuredClone(receipt);
  checkpointTreeDrift.launches[0].post_install_installed_tree.installed_executable_bytes += 1;
  assert.throws(() => validateWindowsFormalUpdateRunnerPassReceipt(checkpointTreeDrift, expectedBinding), /installed tree/u);

  const checkpointIdentityDrift = structuredClone(receipt);
  checkpointIdentityDrift.launches[1].prelaunch_installed_tree.identity_sha256 = "7".repeat(64);
  assert.throws(() => validateWindowsFormalUpdateRunnerPassReceipt(checkpointIdentityDrift, expectedBinding), /installed tree/u);
});

async function materialize(input, aws) {
  const temp = mkdtempSync(path.join(tmpdir(), "lawos-windows-handoff-consumer-"));
  const artifactRoot = path.join(temp, "private-artifacts");
  const locatorArtifactRoot = path.join(temp, "locator-artifact");
  const receiptPath = path.join(temp, "sanitized-receipt.json");
  const expandedLocatorPath = path.join(temp, "expanded-locator.json");
  const providerCallStatePath = path.join(temp, "provider-call-state.json");
  const parsed = validated(input);
  writeWindowsFormalUpdateHandoffReceipt(receiptPath, createWindowsFormalUpdateHandoffPreflightReceipt({
    validated: parsed,
    locatorSha256: input.rawSha256,
    runBinding: RUN_BINDING,
    providerCallStatePath,
    now: NOW,
  }));
  const result = await materializeWindowsFormalUpdatePrivateHandoff({
    validated: parsed,
    artifactRoot,
    receiptPath,
    expandedLocatorPath,
    locatorSha256: input.rawSha256,
    runBinding: RUN_BINDING,
    providerCallStatePath,
    aws: withDurableProviderState(aws, providerCallStatePath, input.rawSha256),
    now: NOW,
  });
  Object.assign(result.receipt, aggregateReceiptProof(input));
  writeWindowsFormalUpdateHandoffReceipt(receiptPath, result.receipt, { replace: true });
  return {
    temp,
    artifactRoot,
    locatorArtifactRoot,
    receiptPath,
    expandedLocatorPath,
    providerCallStatePath,
    parsed,
    result,
  };
}

async function encryptedBridgeFixture() {
  const input = fixture();
  const run = await materialize(input, mockAws(input));
  const keys = bridgeKeys();
  const encryptedRoot = path.join(run.temp, "encrypted-bridge");
  const privateKeyPath = path.join(run.temp, "operator-private-key.pk8");
  writeFileSync(privateKeyPath, keys.privateKey, { mode: 0o600 });
  const bridge = createWindowsFormalUpdateEncryptedBridge({
    validated: run.result.validated,
    artifactRoot: run.artifactRoot,
    outputDir: encryptedRoot,
    wrappingPublicKeySpkiBase64: keys.publicKeyBase64,
    wrappingPublicKeySha256: keys.publicKeySha256,
    runBinding: RUN_BINDING,
    now: NOW,
  });
  return { input, run, keys, encryptedRoot, privateKeyPath, bridge };
}

test("protected consumer materializes every exact VersionId and retains no locator in sanitized evidence", async () => {
  const input = fixture();
  const aws = mockAws(input);
  const run = await materialize(input, aws);
  try {
    assert.equal(run.result.receipt.verdict, "PASS");
    assert.equal(run.result.receipt.state, "PENDING_CLEANUP");
    assert.equal(run.result.validated.objects.length, 19);
    assert.equal(aws.calls.filter(({ operation }) => operation === "head").length, 19);
    assert.equal(aws.calls.filter(({ operation }) => operation === "get").length, 19);
    for (const object of run.result.validated.objects) {
      assert.deepEqual(
        readFileSync(path.join(run.artifactRoot, ...object.relative_path.split("/"))),
        input.files.get(`${object.key}\0${object.version_id}`),
      );
      assert.ok(aws.calls.some((call) => call.operation === "head" && call.key === object.key && call.versionId === object.version_id));
      assert.ok(aws.calls.some((call) => call.operation === "get" && call.key === object.key && call.versionId === object.version_id));
    }
    const sanitized = readFileSync(run.receiptPath, "utf8");
    assert.doesNotMatch(sanitized, new RegExp(BUCKET, "u"));
    assert.doesNotMatch(sanitized, new RegExp(KMS_KEY_ARN.replaceAll("/", "\\/"), "u"));
    for (const object of run.result.validated.objects) {
      assert.equal(sanitized.includes(object.key), false);
      assert.equal(sanitized.includes(object.version_id), false);
    }
    const final = finalizeWindowsFormalUpdateHandoffReceipt({
      artifactRoot: run.artifactRoot,
      locatorArtifactRoot: run.locatorArtifactRoot,
      receiptPath: run.receiptPath,
      expandedLocatorPath: run.expandedLocatorPath,
      awsCredentialsPresent: false,
      oidcCredentialsPresent: false,
      runBinding: RUN_BINDING,
      providerCallStatePath: run.providerCallStatePath,
      bridgeEnvelopeSha256: "e".repeat(64),
      bridgeObjectCount: 19,
      now: NOW + 1_000,
    });
    assert.equal(final.state, "PENDING_OPERATOR");
    assert.equal(final.cleanup.aws_credentials_cleared, true);
    assert.equal(final.cleanup.oidc_credentials_cleared, true);
    assert.equal(final.cleanup.private_artifact_root_removed, true);
    assert.equal(final.cleanup.expanded_locator_removed, true);
    assert.equal(existsSync(run.artifactRoot), false);
  } finally {
    rmSync(run.temp, { recursive: true, force: true });
  }
});

test("provider-call state transition reads only the exact materialized receipt locator and run binding", async () => {
  const input = fixture();
  const run = await materialize(input, mockAws(input));
  try {
    assert.equal(readWindowsFormalUpdateHandoffProviderCallState({
      receiptPath: run.receiptPath,
      providerCallStatePath: run.providerCallStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), true);
    const original = readFileSync(run.receiptPath);
    for (const mutate of [
      (receipt) => { receipt.locator_sha256 = "0".repeat(64); },
      (receipt) => { receipt.run_binding_sha256 = "0".repeat(64); },
      (receipt) => { receipt.boundaries.extra = false; },
      (receipt) => { receipt.retrieval.full_body_sha256_verified = 18; },
      (receipt) => { receipt.objects[0].extra = false; },
      (receipt) => { receipt.objects[1].id = receipt.objects[0].id; },
      (receipt) => { receipt.objects.pop(); },
      (receipt) => { receipt.objects.push({ ...receipt.objects[0], id: "unexpected_object" }); },
      (receipt) => { [receipt.objects[0], receipt.objects[1]] = [receipt.objects[1], receipt.objects[0]]; },
      (receipt) => {
        receipt.objects.find(({ id }) => id === "baseline_installer").sha256 = "0".repeat(64);
      },
      (receipt) => {
        receipt.objects.find(({ id }) => id === "baseline_installer").bytes += 1;
      },
      (receipt) => {
        const baselinePath = receipt.objects.find(({ id }) => id === "baseline_installer").relative_path;
        receipt.objects.find(({ id }) => id === "target_installer").relative_path = baselinePath.toUpperCase();
      },
      (receipt) => { receipt.candidates.baseline.materialized.extra = {}; },
    ]) {
      const receipt = JSON.parse(original.toString("utf8"));
      mutate(receipt);
      writeFileSync(run.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
      assert.throws(() => readWindowsFormalUpdateHandoffProviderCallState({
        receiptPath: run.receiptPath,
        providerCallStatePath: run.providerCallStatePath,
        expectedLocatorSha256: input.rawSha256,
        runBinding: RUN_BINDING,
      }), /provider state receipt/u);
    }
    writeFileSync(run.receiptPath, original);
    assert.throws(() => readWindowsFormalUpdateHandoffProviderCallState({
      receiptPath: path.relative(process.cwd(), run.receiptPath),
      providerCallStatePath: run.providerCallStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), /path must be exact and absolute/u);

    writeFileSync(run.receiptPath, original);
    for (const currentProviderCallPerformed of [false, true]) {
      assert.equal(transitionWindowsFormalUpdateHandoffProviderCallState({
        currentProviderCallPerformed,
        receiptPath: run.receiptPath,
        providerCallStatePath: run.providerCallStatePath,
        expectedLocatorSha256: input.rawSha256,
        runBinding: RUN_BINDING,
      }), true);
    }
    assert.throws(() => transitionWindowsFormalUpdateHandoffProviderCallState({
      currentProviderCallPerformed: "false",
      receiptPath: run.receiptPath,
      providerCallStatePath: run.providerCallStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), /explicit boolean/u);

    const invalidEvenWhenCurrentTrue = JSON.parse(original.toString("utf8"));
    invalidEvenWhenCurrentTrue.objects[0].extra = false;
    writeFileSync(run.receiptPath, `${JSON.stringify(invalidEvenWhenCurrentTrue, null, 2)}\n`);
    assert.throws(() => transitionWindowsFormalUpdateHandoffProviderCallState({
      currentProviderCallPerformed: true,
      receiptPath: run.receiptPath,
      providerCallStatePath: run.providerCallStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), /provider state receipt/u);
  } finally {
    rmSync(run.temp, { recursive: true, force: true });
  }
});

test("durable provider marker reconciles every crash boundary without unauthenticated carryover", () => {
  const input = fixture();
  const parsed = validated(input);
  const temp = mkdtempSync(path.join(tmpdir(), "lawos-windows-provider-reconcile-"));
  try {
    const absentStatePath = path.join(temp, "absent-provider-state.json");
    const absentReceiptPath = path.join(temp, "absent-provider-receipt.json");
    const absentReceipt = createWindowsFormalUpdateHandoffPreflightReceipt({
      validated: parsed,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      providerCallStatePath: absentStatePath,
      now: NOW,
    });
    writeWindowsFormalUpdateHandoffReceipt(absentReceiptPath, absentReceipt);
    assert.equal(reconcileWindowsFormalUpdateHandoffProviderCallState({
      receiptPath: absentReceiptPath,
      statePath: absentStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      now: NOW,
    }).provider_call_performed, false);

    const forgedTrue = JSON.parse(readFileSync(absentReceiptPath, "utf8"));
    forgedTrue.boundaries.provider_call_performed = true;
    writeFileSync(absentReceiptPath, `${JSON.stringify(forgedTrue, null, 2)}\n`);
    assert.throws(() => reconcileWindowsFormalUpdateHandoffProviderCallState({
      receiptPath: absentReceiptPath,
      statePath: absentStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      now: NOW,
    }), /unauthenticated provider-call state/u);

    const durableStatePath = path.join(temp, "durable-provider-state.json");
    const staleReceiptPath = path.join(temp, "stale-provider-receipt.json");
    writeWindowsFormalUpdateHandoffReceipt(staleReceiptPath, createWindowsFormalUpdateHandoffPreflightReceipt({
      validated: parsed,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      providerCallStatePath: durableStatePath,
      now: NOW,
    }));
    assert.equal(persistWindowsFormalUpdateProviderCallState({
      statePath: durableStatePath,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), true);
    const reconciled = reconcileWindowsFormalUpdateHandoffProviderCallState({
      receiptPath: staleReceiptPath,
      statePath: durableStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      now: NOW,
    });
    assert.equal(reconciled.provider_call_performed, true);
    assert.equal(reconciled.receipt.verdict, "BLOCKED");
    assert.equal(reconciled.receipt.boundaries.provider_call_performed, true);
    assert.equal(readWindowsFormalUpdateProviderCallState({
      statePath: durableStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), true);
    assert.equal(createWindowsFormalUpdateHandoffFailureReceipt({
      error: Object.assign(new Error("local encrypt failure"), { code: "WINDOWS_HANDOFF_BRIDGE_FAILED" }),
      validated: parsed,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      providerCallStatePath: durableStatePath,
      now: NOW,
    }).boundaries.provider_call_performed, true);

    const interruptedStatePath = path.join(temp, "interrupted-provider-state.json");
    const missingReceiptPath = path.join(temp, "interrupted-provider-receipt.json");
    persistWindowsFormalUpdateProviderCallState({
      statePath: interruptedStatePath,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    });
    const interrupted = reconcileWindowsFormalUpdateHandoffProviderCallState({
      receiptPath: missingReceiptPath,
      statePath: interruptedStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      now: NOW,
    });
    assert.equal(interrupted.receipt.verdict, "FAIL");
    assert.equal(interrupted.receipt.state, "BLOCKED");
    assert.equal(interrupted.receipt.error_code, "WINDOWS_HANDOFF_PROVIDER_INTERRUPTED");
    assert.equal(interrupted.provider_call_performed, true);
    assert.equal(existsSync(interruptedStatePath), true);

    const truncatedReceiptPath = path.join(temp, "truncated-provider-receipt.json");
    writeFileSync(truncatedReceiptPath, '{"schema_version":');
    const recovered = reconcileWindowsFormalUpdateHandoffProviderCallState({
      receiptPath: truncatedReceiptPath,
      statePath: interruptedStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      now: NOW,
    });
    assert.equal(recovered.receipt.verdict, "FAIL");
    assert.equal(recovered.receipt.state, "BLOCKED");
    assert.equal(recovered.receipt.error_code, "WINDOWS_HANDOFF_PROVIDER_INTERRUPTED");
    assert.equal(recovered.provider_call_performed, true);
    assert.deepEqual(JSON.parse(readFileSync(truncatedReceiptPath, "utf8")), recovered.receipt);

    const unauthenticatedTruncatedReceiptPath = path.join(temp, "unauthenticated-truncated-receipt.json");
    writeFileSync(unauthenticatedTruncatedReceiptPath, '{"schema_version":');
    assert.throws(() => reconcileWindowsFormalUpdateHandoffProviderCallState({
      receiptPath: unauthenticatedTruncatedReceiptPath,
      statePath: absentStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      now: NOW,
    }), /not valid JSON/u);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("atomic provider and receipt residue recovery rejects unrelated filesystem entries", () => {
  const input = fixture();
  const parsed = validated(input);
  const temp = mkdtempSync(path.join(tmpdir(), "lawos-windows-atomic-residue-"));
  try {
    const linkedStatePath = path.join(temp, "linked-provider-state.json");
    persistWindowsFormalUpdateProviderCallState({
      statePath: linkedStatePath,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    });
    linkSync(linkedStatePath, `${linkedStatePath}.tmp`);
    assert.equal(lstatSync(linkedStatePath).nlink, 2);
    assert.equal(readWindowsFormalUpdateProviderCallState({
      statePath: linkedStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), true);
    assert.equal(existsSync(`${linkedStatePath}.tmp`), false);
    assert.equal(lstatSync(linkedStatePath).nlink, 1);

    const partialStatePath = path.join(temp, "partial-provider-state.json");
    writeFileSync(`${partialStatePath}.tmp`, '{"schema_version":');
    assert.equal(readWindowsFormalUpdateProviderCallState({
      statePath: partialStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), false);
    assert.equal(existsSync(partialStatePath), false);
    assert.equal(existsSync(`${partialStatePath}.tmp`), false);

    const symlinkStatePath = path.join(temp, "symlink-provider-state.json");
    const symlinkTargetPath = path.join(temp, "symlink-target.json");
    writeFileSync(symlinkTargetPath, "external");
    symlinkSync(symlinkTargetPath, `${symlinkStatePath}.tmp`);
    assert.throws(() => readWindowsFormalUpdateProviderCallState({
      statePath: symlinkStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), /not a legitimate regular sibling/u);
    assert.equal(lstatSync(`${symlinkStatePath}.tmp`).isSymbolicLink(), true);

    const externalStatePath = path.join(temp, "external-provider-state.json");
    persistWindowsFormalUpdateProviderCallState({
      statePath: externalStatePath,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    });
    const externalHardLinkPath = path.join(temp, "external-hard-link.json");
    writeFileSync(externalHardLinkPath, "external");
    linkSync(externalHardLinkPath, `${externalStatePath}.tmp`);
    assert.throws(() => readWindowsFormalUpdateProviderCallState({
      statePath: externalStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), /not a legitimate regular sibling|not paired with the exact target/u);
    assert.equal(lstatSync(`${externalStatePath}.tmp`).nlink, 2);
    assert.equal(lstatSync(externalStatePath).nlink, 1);

    const receiptStatePath = path.join(temp, "receipt-provider-state.json");
    const receiptPath = path.join(temp, "replace-provider-receipt.json");
    writeWindowsFormalUpdateHandoffReceipt(receiptPath, createWindowsFormalUpdateHandoffPreflightReceipt({
      validated: parsed,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      providerCallStatePath: receiptStatePath,
      now: NOW,
    }));
    persistWindowsFormalUpdateProviderCallState({
      statePath: receiptStatePath,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    });
    writeFileSync(`${receiptPath}.tmp`, '{"unpublished_replacement":true}\n');
    const reconciled = reconcileWindowsFormalUpdateHandoffProviderCallState({
      receiptPath,
      statePath: receiptStatePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      now: NOW,
    });
    assert.equal(reconciled.receipt.verdict, "BLOCKED");
    assert.equal(reconciled.provider_call_performed, true);
    assert.equal(existsSync(`${receiptPath}.tmp`), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("protected consumer rejects an installed-executable SBOM binding that aliases the uninstaller", async () => {
  const input = fixture({ target: { installedExecutableAliasesUninstaller: true } });
  const temp = mkdtempSync(path.join(tmpdir(), "lawos-windows-handoff-native-alias-"));
  const artifactRoot = path.join(temp, "private-artifacts");
  const receiptPath = path.join(temp, "sanitized-receipt.json");
  const expandedLocatorPath = path.join(temp, "expanded-locator.json");
  const providerCallStatePath = path.join(temp, "provider-call-state.json");
  try {
    const parsed = validated(input);
    writeWindowsFormalUpdateHandoffReceipt(receiptPath, createWindowsFormalUpdateHandoffPreflightReceipt({
      validated: parsed,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      providerCallStatePath,
      now: NOW,
    }));
    await assert.rejects(() => materializeWindowsFormalUpdatePrivateHandoff({
      validated: parsed,
      artifactRoot,
      receiptPath,
      expandedLocatorPath,
      locatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
      providerCallStatePath,
      aws: withDurableProviderState(mockAws(input), providerCallStatePath, input.rawSha256),
      now: NOW,
    }), /installed-executable SBOM binding/u);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("closed locator rejects extra fields, absent VersionIds, unversioned reads, and Windows path aliases before AWS", () => {
  for (const mutate of [
    (input) => { input.locator.extra = true; },
    (input) => { delete input.locator.governance.approval_receipt.version_id; },
    (input) => { input.locator.governance.approval_receipt.version_id = "null"; },
    (input) => { input.locator.candidates.target.materialized_paths.installer = input.locator.candidates.baseline.materialized_paths.installer.toUpperCase(); },
    (input) => { input.locator.governance.approval_receipt.retain_until = new Date(NOW + (365 * 24 * 60 * 60 * 1_000) - 1).toISOString(); },
    (input) => { input.locator.governance.approval_receipt.retain_until = new Date(NOW + (3650 * 24 * 60 * 60 * 1_000) + 1).toISOString(); },
  ]) {
    const input = fixture();
    mutate(input);
    input.raw = JSON.stringify(input.locator);
    input.rawSha256 = sha256(Buffer.from(input.raw));
    assert.throws(() => validated(input), /schema|VersionId|unique on Windows|retention/u);
  }
});

test("provider account, region, KMS, version, Object Lock, and retention drift fail closed and remove partial bytes", async (t) => {
  const cases = [
    ["account", { inspect: (provider) => ({ ...provider, identity: { ...provider.identity, Account: "000000000000" } }) }, /reader identity/u],
    ["region", { inspect: (provider) => ({ ...provider, location: { LocationConstraint: "us-east-1" } }) }, /bucket region/u],
    ["KMS", { head: (response) => ({ ...response, SSEKMSKeyId: `${KMS_KEY_ARN}-drift` }) }, /KMS binding/u],
    ["VersionId", { head: (response) => ({ ...response, VersionId: "latest-or-other-version" }) }, /VersionId differs/u],
    ["Object Lock", { get: (response) => ({ ...response, ObjectLockMode: "GOVERNANCE" }) }, /Object Lock mode/u],
    ["retention", { get: (response) => ({ ...response, ObjectLockRetainUntilDate: "2027-08-15T00:00:00.000Z" }) }, /retention differs/u],
  ];
  for (const [name, mutation, expected] of cases) {
    await t.test(name, async () => {
      const input = fixture();
      const temp = mkdtempSync(path.join(tmpdir(), "lawos-windows-handoff-drift-"));
      const artifactRoot = path.join(temp, "private-artifacts");
      const receiptPath = path.join(temp, "receipt.json");
      const expandedLocatorPath = path.join(temp, "expanded-locator.json");
      const providerCallStatePath = path.join(temp, "provider-call-state.json");
      try {
        const parsed = validated(input);
        writeWindowsFormalUpdateHandoffReceipt(receiptPath, createWindowsFormalUpdateHandoffPreflightReceipt({
          validated: parsed,
          locatorSha256: input.rawSha256,
          runBinding: RUN_BINDING,
          providerCallStatePath,
          now: NOW,
        }));
        await assert.rejects(() => materializeWindowsFormalUpdatePrivateHandoff({
          validated: parsed,
          artifactRoot,
          receiptPath,
          expandedLocatorPath,
          locatorSha256: input.rawSha256,
          runBinding: RUN_BINDING,
          providerCallStatePath,
          aws: withDurableProviderState(mockAws(input, mutation), providerCallStatePath, input.rawSha256),
          now: NOW,
        }), expected);
        assert.equal(existsSync(artifactRoot), false);
      } finally {
        rmSync(temp, { recursive: true, force: true });
      }
    });
  }
});

test("full GET body drift and execution-input locator drift fail before production-root admission", async (t) => {
  await t.test("body bytes", async () => {
    const input = fixture();
    const temp = mkdtempSync(path.join(tmpdir(), "lawos-windows-body-drift-"));
    const artifactRoot = path.join(temp, "private-artifacts");
    const receiptPath = path.join(temp, "receipt.json");
    const expandedLocatorPath = path.join(temp, "expanded-locator.json");
    const providerCallStatePath = path.join(temp, "provider-call-state.json");
    try {
      const parsed = validated(input);
      writeWindowsFormalUpdateHandoffReceipt(receiptPath, createWindowsFormalUpdateHandoffPreflightReceipt({
        validated: parsed,
        locatorSha256: input.rawSha256,
        runBinding: RUN_BINDING,
        providerCallStatePath,
        now: NOW,
      }));
      await assert.rejects(() => materializeWindowsFormalUpdatePrivateHandoff({
        validated: parsed,
        artifactRoot,
        receiptPath,
        expandedLocatorPath,
        locatorSha256: input.rawSha256,
        runBinding: RUN_BINDING,
        providerCallStatePath,
        aws: withDurableProviderState(
          mockAws(input, { body: () => Buffer.from("drifted-full-body") }),
          providerCallStatePath,
          input.rawSha256,
        ),
        now: NOW,
      }), /full GET body differs/u);
      assert.equal(existsSync(artifactRoot), false);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  await t.test("execution input", async () => {
    const input = fixture();
    const execution = input.locator.governance.execution_input;
    const bytes = Buffer.from(`${JSON.stringify({
      schema_version: WINDOWS_UPDATE_EXECUTION_INPUT_SCHEMA,
      execution_mode: WINDOWS_UPDATE_EXECUTION_MODE,
      automatic_update: false,
      baseline: { ...input.baseline.input, installer_path: "baseline/drifted.exe" },
      target: input.target.input,
    }, null, 2)}\n`);
    input.files.delete(`${execution.key}\0${execution.version_id}`);
    input.locator.governance.execution_input = governanceObject({ files: input.files, id: "execution-input-drift", relativePath: "governance/execution-input.json", bytes });
    input.raw = JSON.stringify(input.locator);
    input.rawSha256 = sha256(Buffer.from(input.raw));
    const temp = mkdtempSync(path.join(tmpdir(), "lawos-windows-input-drift-"));
    const artifactRoot = path.join(temp, "private-artifacts");
    const receiptPath = path.join(temp, "receipt.json");
    const expandedLocatorPath = path.join(temp, "expanded-locator.json");
    const providerCallStatePath = path.join(temp, "provider-call-state.json");
    try {
      const parsed = validated(input);
      writeWindowsFormalUpdateHandoffReceipt(receiptPath, createWindowsFormalUpdateHandoffPreflightReceipt({
        validated: parsed,
        locatorSha256: input.rawSha256,
        runBinding: RUN_BINDING,
        providerCallStatePath,
        now: NOW,
      }));
      await assert.rejects(() => materializeWindowsFormalUpdatePrivateHandoff({
        validated: parsed,
        artifactRoot,
        receiptPath,
        expandedLocatorPath,
        locatorSha256: input.rawSha256,
        runBinding: RUN_BINDING,
        providerCallStatePath,
        aws: withDurableProviderState(mockAws(input), providerCallStatePath, input.rawSha256),
        now: NOW,
      }), /paths differ from the private locator/u);
      assert.equal(existsSync(artifactRoot), false);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
});

test("OIDC reader encrypts all 19 admission objects and the no-OIDC operator restores exact bytes without locator disclosure", async () => {
  const setup = await encryptedBridgeFixture();
  const operatorRoot = path.join(setup.run.temp, "operator-private-artifacts");
  try {
    const envelopeText = readFileSync(path.join(setup.encryptedRoot, "envelope.json"), "utf8");
    assert.equal(setup.bridge.object_count, 19);
    assert.equal(setup.bridge.envelope.boundaries.plaintext_uploaded_to_github, false);
    assert.equal(setup.bridge.envelope.boundaries.exact_s3_locator_included, false);
    assert.equal(setup.bridge.envelope.boundaries.automatic_update, false);
    assert.equal(envelopeText.includes(BUCKET), false);
    assert.equal(envelopeText.includes(KMS_KEY_ARN), false);
    for (const object of setup.run.result.validated.objects) {
      assert.equal(envelopeText.includes(object.key), false);
      assert.equal(envelopeText.includes(object.version_id), false);
    }
    finalizeWindowsFormalUpdateHandoffReceipt({
      artifactRoot: setup.run.artifactRoot,
      locatorArtifactRoot: setup.run.locatorArtifactRoot,
      receiptPath: setup.run.receiptPath,
      expandedLocatorPath: setup.run.expandedLocatorPath,
      awsCredentialsPresent: false,
      oidcCredentialsPresent: false,
      runBinding: RUN_BINDING,
      providerCallStatePath: setup.run.providerCallStatePath,
      bridgeEnvelopeSha256: setup.bridge.envelope_sha256,
      bridgeObjectCount: 19,
      now: NOW + 500,
    });
    assert.equal(existsSync(setup.run.artifactRoot), false);
    const decrypted = decryptWindowsFormalUpdateEncryptedBridge({
      encryptedDir: setup.encryptedRoot,
      artifactRoot: operatorRoot,
      expectedEnvelopeSha256: setup.bridge.envelope_sha256,
      expectedLocatorSha256: setup.input.rawSha256,
      expectedWrappingPublicKeySha256: setup.keys.publicKeySha256,
      privateKeyPath: setup.privateKeyPath,
      runBinding: RUN_BINDING,
      now: NOW + 1_000,
    });
    assert.equal(decrypted.object_count, 19);
    assert.equal(decrypted.automatic_update, false);
    assert.equal(decrypted.public_release_claim, false);
    assert.equal(decrypted.external_distribution_claim, false);
    assert.equal(decrypted.production_go_live_claim, false);
    for (const object of setup.run.result.validated.objects) {
      assert.deepEqual(
        readFileSync(path.join(operatorRoot, ...object.relative_path.split("/"))),
        setup.input.files.get(`${object.key}\0${object.version_id}`),
      );
    }
    purgeWindowsFormalUpdatePrivateRoots(operatorRoot, setup.encryptedRoot);
    assert.equal(existsSync(operatorRoot), false);
    assert.equal(existsSync(setup.encryptedRoot), false);
  } finally {
    rmSync(setup.run.temp, { recursive: true, force: true });
  }
});

test("encrypted bridge rejects cross-run replay, locator drift, envelope extension, and ciphertext tampering before operator admission", async (t) => {
  await t.test("cross-run replay", async () => {
    const setup = await encryptedBridgeFixture();
    const operatorRoot = path.join(setup.run.temp, "operator-private-artifacts");
    try {
      assert.throws(() => decryptWindowsFormalUpdateEncryptedBridge({
        encryptedDir: setup.encryptedRoot,
        artifactRoot: operatorRoot,
        expectedEnvelopeSha256: setup.bridge.envelope_sha256,
        expectedLocatorSha256: setup.input.rawSha256,
        expectedWrappingPublicKeySha256: setup.keys.publicKeySha256,
        privateKeyPath: setup.privateKeyPath,
        runBinding: RUN_BINDING.replace(":1:", ":2:"),
        now: NOW + 1_000,
      }), /not bound to this workflow run/u);
      assert.equal(existsSync(operatorRoot), false);
    } finally {
      rmSync(setup.run.temp, { recursive: true, force: true });
    }
  });

  await t.test("locator digest drift", async () => {
    const setup = await encryptedBridgeFixture();
    const operatorRoot = path.join(setup.run.temp, "operator-private-artifacts");
    try {
      assert.throws(() => decryptWindowsFormalUpdateEncryptedBridge({
        encryptedDir: setup.encryptedRoot,
        artifactRoot: operatorRoot,
        expectedEnvelopeSha256: setup.bridge.envelope_sha256,
        expectedLocatorSha256: "f".repeat(64),
        expectedWrappingPublicKeySha256: setup.keys.publicKeySha256,
        privateKeyPath: setup.privateKeyPath,
        runBinding: RUN_BINDING,
        now: NOW + 1_000,
      }), /locator binding differs/u);
      assert.equal(existsSync(operatorRoot), false);
    } finally {
      rmSync(setup.run.temp, { recursive: true, force: true });
    }
  });

  await t.test("closed envelope extension", async () => {
    const setup = await encryptedBridgeFixture();
    const operatorRoot = path.join(setup.run.temp, "operator-private-artifacts");
    try {
      const envelopePath = path.join(setup.encryptedRoot, "envelope.json");
      const envelope = JSON.parse(readFileSync(envelopePath, "utf8"));
      envelope.latest_s3_version = "forbidden";
      const bytes = Buffer.from(`${JSON.stringify(envelope, null, 2)}\n`);
      writeFileSync(envelopePath, bytes);
      assert.throws(() => decryptWindowsFormalUpdateEncryptedBridge({
        encryptedDir: setup.encryptedRoot,
        artifactRoot: operatorRoot,
        expectedEnvelopeSha256: sha256(bytes),
        expectedLocatorSha256: setup.input.rawSha256,
        expectedWrappingPublicKeySha256: setup.keys.publicKeySha256,
        privateKeyPath: setup.privateKeyPath,
        runBinding: RUN_BINDING,
        now: NOW + 1_000,
      }), /exact closed schema/u);
      assert.equal(existsSync(operatorRoot), false);
    } finally {
      rmSync(setup.run.temp, { recursive: true, force: true });
    }
  });

  await t.test("ciphertext body tampering", async () => {
    const setup = await encryptedBridgeFixture();
    const operatorRoot = path.join(setup.run.temp, "operator-private-artifacts");
    try {
      const ciphertextPath = path.join(setup.encryptedRoot, setup.bridge.envelope.objects[0].ciphertext_file);
      const bytes = readFileSync(ciphertextPath);
      bytes[0] ^= 0xff;
      writeFileSync(ciphertextPath, bytes);
      assert.throws(() => decryptWindowsFormalUpdateEncryptedBridge({
        encryptedDir: setup.encryptedRoot,
        artifactRoot: operatorRoot,
        expectedEnvelopeSha256: setup.bridge.envelope_sha256,
        expectedLocatorSha256: setup.input.rawSha256,
        expectedWrappingPublicKeySha256: setup.keys.publicKeySha256,
        privateKeyPath: setup.privateKeyPath,
        runBinding: RUN_BINDING,
        now: NOW + 1_000,
      }), /ciphertext differs/u);
      assert.equal(existsSync(operatorRoot), false);
    } finally {
      rmSync(setup.run.temp, { recursive: true, force: true });
    }
  });

  await t.test("wrong operator private key", async () => {
    const setup = await encryptedBridgeFixture();
    const operatorRoot = path.join(setup.run.temp, "operator-private-artifacts");
    try {
      const wrong = generateKeyPairSync("rsa", {
        modulusLength: 4096,
        publicExponent: 0x10001,
        publicKeyEncoding: { format: "der", type: "spki" },
        privateKeyEncoding: { format: "der", type: "pkcs8" },
      });
      writeFileSync(setup.privateKeyPath, wrong.privateKey);
      assert.throws(() => decryptWindowsFormalUpdateEncryptedBridge({
        encryptedDir: setup.encryptedRoot,
        artifactRoot: operatorRoot,
        expectedEnvelopeSha256: setup.bridge.envelope_sha256,
        expectedLocatorSha256: setup.input.rawSha256,
        expectedWrappingPublicKeySha256: setup.keys.publicKeySha256,
        privateKeyPath: setup.privateKeyPath,
        runBinding: RUN_BINDING,
        now: NOW + 1_000,
      }), /private key is not the pinned/u);
      assert.equal(existsSync(operatorRoot), false);
    } finally {
      rmSync(setup.run.temp, { recursive: true, force: true });
    }
  });
});

test("final consumer receipt binds the stable PASS operator receipt and cleanup", async () => {
  const setup = await encryptedBridgeFixture();
  const operatorRoot = path.join(setup.run.temp, "operator-private-artifacts");
  const runnerReceiptPath = path.join(setup.run.temp, "operator-receipt.json");
  const finalReceiptPath = path.join(setup.run.temp, "final-consumer.json");
  try {
    finalizeWindowsFormalUpdateHandoffReceipt({
      artifactRoot: setup.run.artifactRoot,
      locatorArtifactRoot: setup.run.locatorArtifactRoot,
      receiptPath: setup.run.receiptPath,
      expandedLocatorPath: setup.run.expandedLocatorPath,
      awsCredentialsPresent: false,
      oidcCredentialsPresent: false,
      runBinding: RUN_BINDING,
      providerCallStatePath: setup.run.providerCallStatePath,
      bridgeEnvelopeSha256: setup.bridge.envelope_sha256,
      bridgeObjectCount: 19,
      now: NOW + 500,
    });
    decryptWindowsFormalUpdateEncryptedBridge({
      encryptedDir: setup.encryptedRoot,
      artifactRoot: operatorRoot,
      expectedEnvelopeSha256: setup.bridge.envelope_sha256,
      expectedLocatorSha256: setup.input.rawSha256,
      expectedWrappingPublicKeySha256: setup.keys.publicKeySha256,
      privateKeyPath: setup.privateKeyPath,
      runBinding: RUN_BINDING,
      now: NOW + 1_000,
    });
    const readerReceipt = JSON.parse(readFileSync(setup.run.receiptPath, "utf8"));
    const approvalProof = readerReceipt.objects.find(({ id }) => id === "approval_receipt");
    const approvalSignatureProof = readerReceipt.objects.find(({ id }) => id === "approval_signature");
    const runnerReceipt = structuredClone(runnerPassReceiptFixture().receipt);
    const candidates = Object.fromEntries(["baseline", "target"].map((role) => {
      const candidate = readerReceipt.candidates[role];
      return [role, {
        artifact_sha256: candidate.installer_sha256,
        installed_tree: setup.input[role].installedTree,
        metadata_raw_sha256: candidate.update_metadata_sha256,
        release_manifest_sha256: candidate.release_manifest_sha256,
        signature_raw_sha256: candidate.update_metadata_signature_sha256,
        source_sha: candidate.source_sha,
        version: candidate.version,
      }];
    }));
    runnerReceipt.candidates = candidates;
    runnerReceipt.launches = runnerReceipt.launches.map((launch) => ({
      ...launch,
      source_sha: candidates[launch.role].source_sha,
      version: candidates[launch.role].version,
      executable_sha256: candidates[launch.role].installed_tree.installed_executable_sha256,
      post_install_installed_tree: {
        ...candidates[launch.role].installed_tree,
        identity_sha256: (launch.role === "baseline" ? "1" : "2").repeat(64),
      },
      prelaunch_installed_tree: {
        ...candidates[launch.role].installed_tree,
        identity_sha256: (launch.role === "baseline" ? "1" : "2").repeat(64),
      },
    }));
    runnerReceipt.approval_bundle_sha256 = approvalProof.sha256;
    runnerReceipt.approval_signature_sha256 = approvalSignatureProof.sha256;
    const auth = passAuthenticodeFixture();
    const authenticodeSha256 = sha256(Buffer.from(canonicalJson(auth), "utf8"));
    runnerReceipt.signer_certificate_sha1 = auth.signer_thumbprint;
    for (const [index, role] of ["target", "baseline"].entries()) {
      const candidate = readerReceipt.candidates[role];
      assert.equal(candidate.uninstaller.authenticode_sha256, authenticodeSha256);
      Object.assign(runnerReceipt.uninstalls[index], {
        artifact_sha256: candidates[role].artifact_sha256,
        authenticode: auth,
        authenticode_valid: candidate.uninstaller.authenticode_valid,
        denies_write_delete: candidate.uninstaller.denies_write_delete,
        exit_code: candidate.uninstaller.exit_code,
        installed_tree_path: candidate.uninstaller.installed_tree_path,
        installed_tree_sha256: candidate.uninstaller.installed_tree_sha256,
        lock_mode: candidate.uninstaller.lock_mode,
        metadata_raw_sha256: candidates[role].metadata_raw_sha256,
        release_manifest_sha256: candidates[role].release_manifest_sha256,
        signature_raw_sha256: candidates[role].signature_raw_sha256,
        source_sha: candidates[role].source_sha,
        uninstaller_bytes: candidate.uninstaller.uninstaller_bytes,
        uninstaller_sha256: candidate.uninstaller.uninstaller_sha256,
        version: candidates[role].version,
        process: {
          ...runnerReceipt.uninstalls[index].process,
          path_identity: candidate.uninstaller.process_path_identity,
        },
      });
    }
    const [, , , sourceSha, sourceTree] = RUN_BINDING.split(":");
    runnerReceipt.source_runner = { source_sha: sourceSha, source_tree: sourceTree };
    writeFileSync(setup.run.receiptPath, `${JSON.stringify(readerReceipt, null, 2)}\n`);
    const runnerBytes = Buffer.from(`${JSON.stringify(runnerReceipt, null, 2)}\n`);
    writeFileSync(runnerReceiptPath, runnerBytes);
    const final = finalizeWindowsFormalUpdateConsumerReceipt({
      readerReceiptPath: setup.run.receiptPath,
      finalReceiptPath,
      runnerReceiptPath,
      artifactRoot: operatorRoot,
      locatorArtifactRoot: setup.run.locatorArtifactRoot,
      encryptedBridgeRoot: setup.encryptedRoot,
      expectedLocatorSha256: setup.input.rawSha256,
      expectedEnvelopeSha256: setup.bridge.envelope_sha256,
      runBinding: RUN_BINDING,
      awsCredentialsPresent: false,
      oidcCredentialsPresent: false,
      now: NOW + 1_500,
    });
    assert.equal(final.receipt.state, "PASS");
    assert.equal(final.receipt.runner_receipt_sha256, sha256(runnerBytes));
    assert.equal(final.receipt.cleanup.private_artifact_root_removed, true);
    assert.equal(final.receipt.cleanup.encrypted_bridge_root_removed, true);
    assert.equal(final.receipt.objects.length, 19);
  } finally {
    rmSync(setup.run.temp, { recursive: true, force: true });
  }
});

test("final consumer receipt rejects operator admission drift and still purges private roots", async () => {
  const setup = await encryptedBridgeFixture();
  const operatorRoot = path.join(setup.run.temp, "operator-private-artifacts");
  const runnerReceiptPath = path.join(setup.run.temp, "drifted-operator-receipt.json");
  const finalReceiptPath = path.join(setup.run.temp, "final-consumer.json");
  try {
    finalizeWindowsFormalUpdateHandoffReceipt({
      artifactRoot: setup.run.artifactRoot,
      locatorArtifactRoot: setup.run.locatorArtifactRoot,
      receiptPath: setup.run.receiptPath,
      expandedLocatorPath: setup.run.expandedLocatorPath,
      awsCredentialsPresent: false,
      oidcCredentialsPresent: false,
      runBinding: RUN_BINDING,
      providerCallStatePath: setup.run.providerCallStatePath,
      bridgeEnvelopeSha256: setup.bridge.envelope_sha256,
      bridgeObjectCount: 19,
      now: NOW + 500,
    });
    mkdirSync(operatorRoot, { mode: 0o700 });
    writeFileSync(path.join(operatorRoot, "private-byte"), "sensitive");
    const candidates = Object.fromEntries(["baseline", "target"].map((role) => [role, {
      artifact_sha256: role === "baseline"
        ? "f".repeat(64)
        : setup.run.result.validated.candidates[role].identity.installer_sha256,
      metadata_raw_sha256: setup.run.result.validated.candidates[role].identity.update_metadata_sha256,
      signature_raw_sha256: setup.run.result.validated.candidates[role].identity.update_metadata_signature_sha256,
      release_manifest_sha256: setup.run.result.validated.candidates[role].identity.release_manifest_sha256,
    }]));
    writeFileSync(runnerReceiptPath, `${JSON.stringify({
      schema_version: "law-firm-os.windows-operator-update-rollback-qa.v1",
      verdict: "PASS",
      automatic_update: false,
      candidates,
      boundaries: {
        provider_call_performed: false,
        automatic_update: false,
        public_release_claim: false,
        production_go_live_claim: false,
      },
    }, null, 2)}\n`);
    assert.throws(() => finalizeWindowsFormalUpdateConsumerReceipt({
      readerReceiptPath: setup.run.receiptPath,
      finalReceiptPath,
      runnerReceiptPath,
      artifactRoot: operatorRoot,
      locatorArtifactRoot: setup.run.locatorArtifactRoot,
      encryptedBridgeRoot: setup.encryptedRoot,
      expectedLocatorSha256: setup.input.rawSha256,
      expectedEnvelopeSha256: setup.bridge.envelope_sha256,
      runBinding: RUN_BINDING,
      awsCredentialsPresent: false,
      oidcCredentialsPresent: false,
      now: NOW + 1_500,
    }), /operator receipt failed|operator baseline (?:admission differs|Authenticode record is not bound)/u);
    assert.equal(existsSync(operatorRoot), false);
    assert.equal(existsSync(setup.encryptedRoot), false);
    assert.equal(existsSync(finalReceiptPath), false);
  } finally {
    rmSync(setup.run.temp, { recursive: true, force: true });
  }
});

test("AWS CLI adapter exposes only controls and exact-version read operations", async () => {
  const temp = mkdtempSync(path.join(tmpdir(), "lawos-windows-provider-adapter-"));
  const statePath = path.join(temp, "provider-call-state.json");
  const input = fixture();
  const calls = [];
  let providerCalls = 0;
  const execute = (_command, args) => {
    calls.push(args);
    return "{}";
  };
  const adapter = createWindowsFormalUpdateHandoffAwsCliAdapter({
    execute,
    onProviderCall: () => { providerCalls += 1; },
    providerCallState: { statePath, locatorSha256: input.rawSha256, runBinding: RUN_BINDING },
  });
  const locator = input.locator;
  const object = {
    key: "windows/governance/v1/test/sha256/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/test.json",
    version_id: "exact-version-id",
  };
  try {
    await adapter.inspectGovernance(locator);
    await adapter.headObject({ locator, object });
    await adapter.getObject({ locator, object, destination: "C:\\private\\body" });
    assert.equal(providerCalls, calls.length);
    assert.equal(readWindowsFormalUpdateProviderCallState({
      statePath,
      expectedLocatorSha256: input.rawSha256,
      runBinding: RUN_BINDING,
    }), true);
    const objectCalls = calls.filter((args) => ["head-object", "get-object"].includes(args[1]));
    assert.equal(objectCalls.length, 2);
    for (const args of objectCalls) {
      assert.equal(args[args.indexOf("--version-id") + 1], object.version_id);
      assert.equal(args[args.indexOf("--expected-bucket-owner") + 1], ACCOUNT);
      assert.equal(args[args.indexOf("--checksum-mode") + 1], "ENABLED");
    }
    assert.equal(calls.some((args) => /^(?:list|delete|put|copy)/u.test(args[1] ?? "")), false);
    assert.equal(calls.some((args) => args[0] === "s3"), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("AWS CLI adapter marks thrown KMS and S3 executions but not a locally invalid KMS request", async () => {
  const temp = mkdtempSync(path.join(tmpdir(), "lawos-windows-provider-failure-"));
  const statePath = path.join(temp, "provider-call-state.json");
  const input = fixture();
  const events = [];
  const adapter = createWindowsFormalUpdateHandoffAwsCliAdapter({
    onProviderCall: () => { events.push("provider"); },
    execute: (_command, args) => {
      assert.equal(readWindowsFormalUpdateProviderCallState({
        statePath,
        expectedLocatorSha256: input.rawSha256,
        runBinding: RUN_BINDING,
      }), true);
      events.push(`execute:${args[0]}:${args[1]}`);
      throw new Error("simulated AWS CLI failure");
    },
    providerCallState: { statePath, locatorSha256: input.rawSha256, runBinding: RUN_BINDING },
  });
  try {
    await assert.rejects(adapter.decrypt({
      keyArn: WRAPPING_KMS_KEY_ARN,
      encryptionAlgorithm: "RSAES_OAEP_SHA_256",
      ciphertext: Buffer.alloc(512, 1),
    }), /private AWS handoff read failed/u);
    assert.deepEqual(events, ["provider", "execute:kms:decrypt"]);

    events.length = 0;
    await assert.rejects(adapter.headObject({
      locator: input.locator,
      object: {
        key: `windows/governance/v1/test/sha256/${"a".repeat(64)}/test.json`,
        version_id: "exact-version-id",
      },
    }), /private AWS handoff read failed/u);
    assert.deepEqual(events, ["provider", "execute:s3api:head-object"]);

    const invalidStatePath = path.join(temp, "invalid-local-provider-state.json");
    const invalidEvents = [];
    const invalidAdapter = createWindowsFormalUpdateHandoffAwsCliAdapter({
      onProviderCall: () => { invalidEvents.push("provider"); },
      execute: () => {
        invalidEvents.push("execute");
        throw new Error("must not execute");
      },
      providerCallState: {
        statePath: invalidStatePath,
        locatorSha256: input.rawSha256,
        runBinding: RUN_BINDING,
      },
    });
    await assert.rejects(invalidAdapter.decrypt({
      keyArn: WRAPPING_KMS_KEY_ARN,
      encryptionAlgorithm: "RSAES_OAEP_SHA_256",
      ciphertext: Buffer.alloc(511, 1),
    }), /KMS unwrap request is invalid/u);
    assert.deepEqual(invalidEvents, []);
    assert.equal(existsSync(invalidStatePath), false);

    assert.throws(
      () => createWindowsFormalUpdateHandoffAwsCliAdapter({ onProviderCall: true }),
      /callback must be a function/u,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
