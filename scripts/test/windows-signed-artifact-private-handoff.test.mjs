import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  privateDecrypt,
  constants as cryptoConstants,
} from "node:crypto";
import {
  existsSync,
  linkSync,
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
  createDesktopBuildManifest,
  serializeDesktopBuildManifest,
} from "../lib/matter-desktop-provenance.mjs";
import {
  WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_SCHEMA,
  createWindowsSignedArtifactEncryptedBridge,
  decryptWindowsSignedArtifactEncryptedBridge,
  executeWindowsSignedArtifactPrivateHandoff,
  stageWindowsSignedArtifactHandoff,
  validateWindowsSignedArtifactHandoffBindings,
  validateWindowsSignedArtifactPrivateHandoffReceipt,
  verifyWindowsSignedArtifactEncryptedBridge,
} from "../lib/windows-signed-artifact-private-handoff.mjs";

const NOW = Date.parse("2026-08-14T00:00:00.000Z");
const SOURCE_SHA = "1".repeat(40);
const SOURCE_TREE = "2".repeat(40);
const VERSION = "0.1.17";
const ROLE = "target";
const ACCOUNT = "770880870480";
const REGION = "ap-northeast-2";
const BUCKET = "amic-lawos-private-release-artifacts";
const KMS_KEY_ARN = "arn:aws:kms:ap-northeast-2:770880870480:key/11111111-2222-4333-8444-555555555555";
const WRAPPING_KEY_ARN = "arn:aws:kms:ap-northeast-2:770880870480:key/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const UPLOADER_ROLE_ARN = "arn:aws:iam::770880870480:role/lawos-windows-artifact-uploader";
const RETAIN_UNTIL = "2027-08-14T00:00:00.000Z";
const FILE_NAMES = {
  installer: "signed-installer.exe",
  build_manifest: "windows-build-manifest.json",
  native_package_qa: "formal-windows-package-qa.json",
  installed_tree_sbom: "windows-installed-tree-sbom.cdx.json",
};
const NATIVE_CONTENT_SHA256 = "4".repeat(64);
const NATIVE_IDENTITY_SHA256 = "5".repeat(64);
const NATIVE_PHASES = ["B0", "I1", "B1", "I2", "B2"];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function checksum(bytes) {
  return createHash("sha256").update(bytes).digest("base64");
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function binding(overrides = {}) {
  return {
    account_id: ACCOUNT,
    region: REGION,
    uploader_role_arn: UPLOADER_ROLE_ARN,
    bucket: BUCKET,
    kms_key_arn: KMS_KEY_ARN,
    retain_until: RETAIN_UNTIL,
    ...overrides,
  };
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "lawos-windows-private-handoff-test-"));
  const source = path.join(root, "source");
  mkdirSync(source, { mode: 0o700 });
  const paths = Object.fromEntries(Object.entries(FILE_NAMES).map(([kind, name]) => [kind, path.join(source, name)]));
  writeFileSync(paths.installer, Buffer.from("signed-windows-installer-bytes"), { mode: 0o600 });
  const installerDigest = sha256(readFileSync(paths.installer));
  const buildManifest = createDesktopBuildManifest({
    version: VERSION,
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    sourceDirty: false,
    renderer: {
      sha256: "3".repeat(64),
      file_count: 1,
      algorithm: "sha256(sorted sha256 file manifest with ./ relative paths)",
    },
    channel: "formal",
    platform: "win32",
    arch: "x64",
    appId: "com.amic.matter.desktop",
    builtAt: "2026-08-13T00:00:00.000Z",
  });
  writeFileSync(paths.build_manifest, serializeDesktopBuildManifest(buildManifest), { mode: 0o600 });
  writeJson(paths.installed_tree_sbom, {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    metadata: {
      component: {
        version: VERSION,
        properties: [
          ["schema-version", "law-firm-os.matter-desktop-installed-tree-sbom.v1"],
          ["source-sha", SOURCE_SHA],
          ["source-tree", SOURCE_TREE],
          ["installer-sha256", installerDigest],
          ["installed-file-content-complete", "true"],
          ["installed-directory-identity-complete", "true"],
          ["native-snapshot-schema-version", "law-firm-os.windows-installed-tree-native-snapshot.v1"],
          ["native-filesystem", "NTFS"],
          ["native-directory-count", "1"],
          ["native-identity-sha256", NATIVE_IDENTITY_SHA256],
          ["native-fixed-point-sequence", "B0->I1->B1->I2->B2"],
          ["native-fixed-point-exact", "true"],
          ["reparse-point-count", "0"],
          ["alternate-data-stream-count", "0"],
          ["authenticode-valid", "true"],
        ].map(([name, value]) => ({ name: `law-firm-os:${name}`, value })),
      },
    },
  });
  const sbomDigest = sha256(readFileSync(paths.installed_tree_sbom));
  writeJson(paths.native_package_qa, {
    schema_version: "law-firm-os.formal-windows-package-qa.v1",
    verdict: "PASS",
    native_verdict: "PASS",
    source: { revision: SOURCE_SHA, source_tree: SOURCE_TREE, source_dirty: false },
    package: {
      channel: "formal",
      app_id: "com.amic.matter.desktop",
      installer: { path: `apps/desktop/dist/matter-${VERSION}-win-x64.exe`, sha256: installerDigest },
    },
    authenticode: {
      valid: true,
      signer_code_signing_eku_verified: true,
      timestamp_eku_verified: true,
    },
    sbom: {
      sha256: sbomDigest,
      installed_tree_sha256: NATIVE_CONTENT_SHA256,
      installed_tree_file_count: 1,
      installed_tree_bytes: 32,
      installed_binary_complete: true,
      installed_file_content_complete: true,
      installed_directory_identity_complete: true,
      native_snapshot_schema_version: "law-firm-os.windows-installed-tree-native-snapshot.v1",
      native_filesystem: "NTFS",
      native_directory_count: 1,
      native_identity_sha256: NATIVE_IDENTITY_SHA256,
      native_fixed_point_sequence: NATIVE_PHASES,
      native_fixed_point_exact: true,
      reparse_point_count: 0,
      alternate_data_stream_count: 0,
      authenticode_bound: true,
      native_snapshot: {
        schema_version: "law-firm-os.windows-installed-tree-native-snapshot.v1",
        filesystem: "NTFS",
        content_sha256: NATIVE_CONTENT_SHA256,
        identity_sha256: NATIVE_IDENTITY_SHA256,
        file_count: 1,
        directory_count: 1,
        bytes: 32,
        fixed_point_sequence: NATIVE_PHASES,
        fixed_point_exact: true,
        equality_proof: "B0_I1_B1_I2_B2_PUBLIC_AND_PRIVATE_MANIFEST_EXACT_EQUALITY",
        phases: NATIVE_PHASES.map((name) => ({
          name,
          content_sha256: NATIVE_CONTENT_SHA256,
          identity_sha256: NATIVE_IDENTITY_SHA256,
          file_count: 1,
          directory_count: 1,
          bytes: 32,
        })),
      },
    },
  });
  return { root, paths };
}

function wrappingKey() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 4096 });
  const spki = publicKey.export({ format: "der", type: "spki" });
  return {
    privateKey,
    publicKeySpkiBase64: spki.toString("base64"),
    publicKeySha256: sha256(spki),
  };
}

function decryptWrappedKey(privateKey, ciphertext) {
  return privateDecrypt({
    key: privateKey,
    padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256",
  }, ciphertext);
}

function mockAws() {
  const calls = [];
  const stored = new Map();
  let nextVersion = 0;
  return {
    calls,
    async inspectGovernance() {
      calls.push({ operation: "inspect" });
      return {
        identity: { Account: ACCOUNT, Arn: `arn:aws:sts::${ACCOUNT}:assumed-role/lawos-windows-artifact-uploader/session` },
        kms: { KeyMetadata: { Arn: KMS_KEY_ARN, Enabled: true, KeyState: "Enabled", KeyUsage: "ENCRYPT_DECRYPT", KeySpec: "SYMMETRIC_DEFAULT" } },
        location: { LocationConstraint: REGION },
        versioning: { Status: "Enabled" },
        publicAccess: { PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true } },
        objectLock: { ObjectLockConfiguration: { ObjectLockEnabled: "Enabled", Rule: { DefaultRetention: { Mode: "COMPLIANCE", Days: 365 } } } },
        encryption: { ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "aws:kms", KMSMasterKeyID: KMS_KEY_ARN } }] } },
        ownership: { OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] } },
      };
    },
    async putObject(input) {
      const bytes = readFileSync(input.bodyPath);
      calls.push({ operation: "put", key: input.key });
      assert.equal(input.expectedOwner, ACCOUNT);
      assert.equal(input.kmsKeyArn, KMS_KEY_ARN);
      assert.equal(input.retainUntil, RETAIN_UNTIL);
      assert.equal("ifNoneMatch" in input, false);
      assert.equal(input.byteSize, bytes.length);
      assert.equal(input.checksumSha256, checksum(bytes));
      const versionId = `immutable-version-${++nextVersion}`;
      stored.set(`${input.key}\0${versionId}`, { ...input, bytes, versionId });
      return { VersionId: versionId };
    },
    async headObject({ bucket, key, versionId, expectedOwner }) {
      calls.push({ operation: "head", bucket, key, versionId, expectedOwner });
      return response(stored.get(`${key}\0${versionId}`));
    },
    async getObject({ bucket, key, versionId, expectedOwner }) {
      calls.push({ operation: "get", bucket, key, versionId, expectedOwner });
      const object = stored.get(`${key}\0${versionId}`);
      return { ...response(object), body_sha256: sha256(object.bytes), body_bytes: object.bytes.length };
    },
  };
}

function response(object) {
  return {
    VersionId: object.versionId,
    ContentLength: object.bytes.length,
    ServerSideEncryption: "aws:kms",
    SSEKMSKeyId: KMS_KEY_ARN,
    ChecksumSHA256: object.checksumSha256,
    ObjectLockMode: "COMPLIANCE",
    ObjectLockRetainUntilDate: RETAIN_UNTIL,
    Metadata: object.metadata,
  };
}

test("signed Windows handoff encrypts the closed file set and fails closed on tamper", async () => {
  const input = fixture();
  const key = wrappingKey();
  const encrypted = path.join(input.root, "encrypted");
  const decrypted = path.join(input.root, "decrypted");
  const failed = path.join(input.root, "failed");
  try {
    const bridge = createWindowsSignedArtifactEncryptedBridge({
      paths: input.paths,
      outputDir: encrypted,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      candidateRole: ROLE,
      wrappingKeyArn: WRAPPING_KEY_ARN,
      wrappingPublicKeySpkiBase64: key.publicKeySpkiBase64,
      wrappingPublicKeySha256: key.publicKeySha256,
      generatedAt: "2026-08-14T00:00:00.000Z",
    });
    const envelope = verifyWindowsSignedArtifactEncryptedBridge({
      encryptedDir: encrypted,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      candidateRole: ROLE,
      wrappingKeyArn: WRAPPING_KEY_ARN,
      wrappingPublicKeySha256: key.publicKeySha256,
      expectedEnvelopeSha256: bridge.envelope_sha256,
    });
    assert.deepEqual(Object.values(envelope.artifacts).map(({ ciphertext_file }) => ciphertext_file), [
      "payload-01.enc", "payload-02.enc", "payload-03.enc", "payload-04.enc",
    ]);
    for (const plaintextName of Object.values(FILE_NAMES)) assert.equal(existsSync(path.join(encrypted, plaintextName)), false);
    const result = await decryptWindowsSignedArtifactEncryptedBridge({
      encryptedDir: encrypted,
      outputDir: decrypted,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      candidateRole: ROLE,
      wrappingKeyArn: WRAPPING_KEY_ARN,
      wrappingPublicKeySha256: key.publicKeySha256,
      expectedEnvelopeSha256: bridge.envelope_sha256,
      inspectWrappingKey: async () => ({
        Arn: WRAPPING_KEY_ARN,
        Enabled: true,
        KeyState: "Enabled",
        KeyUsage: "ENCRYPT_DECRYPT",
        KeySpec: "RSA_4096",
        EncryptionAlgorithms: ["RSAES_OAEP_SHA_256"],
      }),
      decryptDataKey: async ({ ciphertext }) => decryptWrappedKey(key.privateKey, ciphertext),
    });
    assert.equal(result.artifact_count, 4);
    for (const [kind, name] of Object.entries(FILE_NAMES)) {
      assert.equal(sha256(readFileSync(path.join(decrypted, name))), sha256(readFileSync(input.paths[kind])));
    }
    const firstCiphertext = path.join(encrypted, "payload-01.enc");
    writeFileSync(firstCiphertext, Buffer.from("tampered"));
    await assert.rejects(() => decryptWindowsSignedArtifactEncryptedBridge({
      encryptedDir: encrypted,
      outputDir: failed,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      candidateRole: ROLE,
      wrappingKeyArn: WRAPPING_KEY_ARN,
      wrappingPublicKeySha256: key.publicKeySha256,
      expectedEnvelopeSha256: bridge.envelope_sha256,
      inspectWrappingKey: async () => { throw new Error("must not acquire KMS after ciphertext tamper"); },
      decryptDataKey: async () => { throw new Error("must not decrypt"); },
    }), /ciphertext/u);
    assert.equal(existsSync(failed), false);
  } finally {
    rmSync(input.root, { recursive: true, force: true });
  }
});

test("private immutable handoff uploads four payloads plus one immutable private receipt", async () => {
  const input = fixture();
  const stage = path.join(input.root, "stage");
  const receiptPath = path.join(input.root, "private", "receipt.json");
  try {
    stageWindowsSignedArtifactHandoff({
      paths: input.paths,
      stagingDir: stage,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      candidateRole: ROLE,
    });
    const aws = mockAws();
    const result = await executeWindowsSignedArtifactPrivateHandoff({
      stagingDir: stage,
      receiptPath,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      candidateRole: ROLE,
      bindings: binding(),
      aws,
      now: NOW,
    });
    assert.equal(result.receipt.schema_version, WINDOWS_SIGNED_ARTIFACT_PRIVATE_HANDOFF_SCHEMA);
    assert.equal(validateWindowsSignedArtifactPrivateHandoffReceipt(result.receipt, { now: NOW }), result.receipt);
    assert.equal(Object.isFrozen(result.receipt.artifacts.installer), true);
    assert.equal(result.receipt_sha256, sha256(readFileSync(receiptPath)));
    assert.deepEqual(aws.calls.map(({ operation }) => operation), [
      "inspect",
      "put", "head", "get",
      "put", "head", "get",
      "put", "head", "get",
      "put", "head", "get",
      "put", "head", "get",
    ]);
    assert.match(result.receipt_locator.key, /\/private_handoff_receipt\/sha256\//u);
    assert.equal(result.receipt_locator.sha256, result.receipt_sha256);
    for (const record of Object.values(result.receipt.artifacts)) {
      assert.match(record.key, new RegExp(`^windows/signed/v1/${SOURCE_SHA}/${VERSION}/${ROLE}/`, "u"));
      assert.equal(record.head_readback.version_id, record.version_id);
      assert.equal(record.get_readback.version_id, record.version_id);
      assert.equal(record.get_readback.sha256, record.sha256);
    }
    const extra = structuredClone(result.receipt);
    extra.storage.secret_locator = "forbidden";
    assert.throws(() => validateWindowsSignedArtifactPrivateHandoffReceipt(extra, { now: NOW }), /closed schema/u);
    const shortened = structuredClone(result.receipt);
    shortened.storage.immutability.retain_until = "2027-08-13T23:59:59.999Z";
    for (const artifact of Object.values(shortened.artifacts)) {
      artifact.head_readback.retain_until = shortened.storage.immutability.retain_until;
      artifact.get_readback.retain_until = shortened.storage.immutability.retain_until;
    }
    shortened.storage.head_readback.retain_until = shortened.storage.immutability.retain_until;
    shortened.storage.get_readback.retain_until = shortened.storage.immutability.retain_until;
    assert.throws(() => validateWindowsSignedArtifactPrivateHandoffReceipt(shortened, { now: NOW }), /shorter than 365 days/u);
  } finally {
    rmSync(input.root, { recursive: true, force: true });
  }
});

test("private handoff rejects near-boundary retention, hard links, and bridge partial output", () => {
  assert.throws(
    () => validateWindowsSignedArtifactHandoffBindings(binding({ retain_until: "2027-08-13T23:59:59.999Z" }), { now: NOW }),
    /at least 365 days/u,
  );
  assert.doesNotThrow(() => validateWindowsSignedArtifactHandoffBindings(binding(), { now: NOW }));
  const input = fixture();
  const stage = path.join(input.root, "stage");
  const hardLink = path.join(input.root, "hard-linked-installer.exe");
  const parentLink = path.join(input.root, "linked-source");
  const failedBridge = path.join(input.root, "failed-bridge");
  const key = wrappingKey();
  try {
    linkSync(input.paths.installer, hardLink);
    assert.throws(() => stageWindowsSignedArtifactHandoff({
      paths: { ...input.paths, installer: hardLink },
      stagingDir: stage,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      candidateRole: ROLE,
    }), /hard-linked/u);
    assert.equal(existsSync(stage), false);
    rmSync(hardLink, { force: true });
    if (process.platform !== "win32") {
      symlinkSync(path.dirname(input.paths.installer), parentLink, "dir");
      assert.throws(() => stageWindowsSignedArtifactHandoff({
        paths: {
          ...input.paths,
          installer: path.join(parentLink, path.basename(input.paths.installer)),
        },
        stagingDir: stage,
        sourceSha: SOURCE_SHA,
        sourceTree: SOURCE_TREE,
        candidateRole: ROLE,
      }), /traverse a link/u);
      assert.equal(existsSync(stage), false);
      rmSync(parentLink, { force: true });
    }
    assert.throws(() => createWindowsSignedArtifactEncryptedBridge({
      paths: input.paths,
      outputDir: failedBridge,
      sourceSha: SOURCE_SHA,
      sourceTree: SOURCE_TREE,
      candidateRole: ROLE,
      wrappingKeyArn: WRAPPING_KEY_ARN,
      wrappingPublicKeySpkiBase64: key.publicKeySpkiBase64,
      wrappingPublicKeySha256: key.publicKeySha256,
      publicEncryptFn: () => { throw new Error("wrap failed"); },
    }), /wrap failed/u);
    assert.equal(existsSync(failedBridge), false);
  } finally {
    rmSync(input.root, { recursive: true, force: true });
  }
});
