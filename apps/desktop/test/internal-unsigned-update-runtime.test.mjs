import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import test from "node:test";
import {
  INTERNAL_UNSIGNED_UPDATE_IPC_CHANNELS,
  INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
  INTERNAL_UNSIGNED_UPDATE_TRUST_SCHEMA,
  createEncryptedFileInternalUnsignedUpdateStateStore,
  createInternalUnsignedUpdateRuntime,
  parseInternalUnsignedUpdateTrust,
  registerInternalUnsignedUpdateIpcHandlers,
} from "../src/main/internal-unsigned-update-runtime.js";
import { createFileSystemInternalUnsignedUpdateStaging } from "../src/main/internal-unsigned-update-staging.js";
import {
  INTERNAL_UNSIGNED_REVOCATION_SCHEMA,
  INTERNAL_UNSIGNED_ROLLBACK_SCHEMA,
  INTERNAL_UNSIGNED_UPDATE_SCHEMA,
  INTERNAL_UPDATE_KEY_ID,
  signInternalUnsignedRevocationsBytes,
  signInternalUnsignedRollbackBytes,
  signUpdateMetadataBytes,
} from "../src/main/updates.js";

const NOW = Date.parse("2026-09-04T05:00:00.000Z");
const DOMAIN = "d111111abcdef8.cloudfront.net";
const keys = generateKeyPairSync("ed25519");

function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function httpHostnames(value, result = []) {
  if (typeof value === "string") {
    try {
      const parsed = new URL(value);
      if (["http:", "https:"].includes(parsed.protocol)) result.push(parsed.hostname);
    } catch {
      // Non-URL response strings are expected here.
    }
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) httpHostnames(item, result);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) httpHostnames(item, result);
  }
  return result;
}

function trust() {
  return parseInternalUnsignedUpdateTrust({
    schema_version: INTERNAL_UNSIGNED_UPDATE_TRUST_SCHEMA,
    key_id: INTERNAL_UPDATE_KEY_ID,
    public_key_spki_base64: keys.publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    private_key_material_included: false,
    public_release_allowed: false,
  });
}

function build(version, sourceSha, sourceTree) {
  return Object.freeze({
    schema_version: "law-firm-os.matter-desktop-build-provenance.v1",
    product_name: "matter",
    package_name: "@law-firm-os/desktop",
    version,
    source_sha: sourceSha,
    source_tree: sourceTree,
    source_dirty: false,
    renderer: { sha256: "9".repeat(64), file_count: 1, algorithm: "sha256-tree-v1" },
    channel: "internal",
    platform: "win32",
    arch: "x64",
    app_id: "com.amic.matter.desktop.internal",
    built_at: "2026-09-04T04:00:00.000Z",
    public_release_claim: false,
    production_go_live_claim: false,
  });
}

function metadata({
  version,
  releaseId,
  sequence,
  sourceSha,
  sourceTree,
  artifactBytes,
  predecessor,
}) {
  const artifactSha256 = digest(artifactBytes);
  const artifactFilename = `AMIC-OS-internal-${version}-win-x64.exe`;
  return {
    schemaVersion: INTERNAL_UNSIGNED_UPDATE_SCHEMA,
    releaseId,
    version,
    channel: "internal-unsigned",
    lawosTenantId: "tenant-amic-internal",
    installationId: "odi_aaaaaaaaaaaaaaaaaaaa",
    appId: "com.amic.matter.desktop.internal",
    keyId: INTERNAL_UPDATE_KEY_ID,
    sourceSha,
    sourceTree,
    predecessorReleaseId: predecessor.releaseId,
    predecessorVersion: predecessor.version,
    predecessorSourceSha: predecessor.sourceSha,
    predecessorSourceTree: predecessor.sourceTree,
    releaseSequence: sequence,
    platform: "win32",
    architecture: "x64",
    artifactFilename,
    artifactObjectKey: [
      "internal-unsigned", "win32", "x64", version, sourceSha, artifactSha256,
      artifactFilename,
    ].join("/"),
    artifactSha256,
    artifactBytes: artifactBytes.byteLength,
    artifactVersionId: `artifact-version-${sequence}`,
    releaseManifestSha256: "c".repeat(64),
    authenticodeStatus: "not_signed",
    distribution: "private",
    managedDeviceOnly: true,
    publicReleaseAllowed: false,
    generatedAt: "2026-09-04T04:00:00.000Z",
    expiresAt: "2026-09-11T04:00:00.000Z",
  };
}

function signedRelease(input) {
  const update = metadata(input);
  const signedMetadata = signUpdateMetadataBytes(update, keys.privateKey);
  const signedRevocations = signInternalUnsignedRevocationsBytes({
    schemaVersion: INTERNAL_UNSIGNED_REVOCATION_SCHEMA,
    revocationId: "amic-os-internal-revocations-0001",
    revision: 1,
    channel: "internal-unsigned",
    lawosTenantId: update.lawosTenantId,
    appId: update.appId,
    keyId: INTERNAL_UPDATE_KEY_ID,
    revokedReleaseIds: [],
    revokedArtifactSha256s: [],
    generatedAt: "2026-09-04T04:00:00.000Z",
    expiresAt: "2026-09-11T04:00:00.000Z",
  }, keys.privateKey);
  return { update, signedMetadata, signedRevocations, artifactBytes: input.artifactBytes };
}

function response(bytes) {
  const headers = new Map([
    ["content-length", String(bytes.byteLength)],
  ]);
  return {
    status: 200,
    redirected: false,
    headers: { get(name) { return headers.get(String(name).toLowerCase()) ?? null; } },
    body: Readable.from([bytes.subarray(0, Math.ceil(bytes.byteLength / 2)), bytes.subarray(Math.ceil(bytes.byteLength / 2))]),
  };
}

function brokerFixture(release, { rollbackTarget = null, rollbackOverrides = {} } = {}) {
  const rollbackAuthorization = rollbackTarget ? {
    schemaVersion: INTERNAL_UNSIGNED_ROLLBACK_SCHEMA,
    rollbackId: `${release.update.releaseId}-to-${rollbackTarget.update.releaseId}-rollback-001`,
    channel: release.update.channel,
    lawosTenantId: release.update.lawosTenantId,
    installationId: release.update.installationId,
    appId: release.update.appId,
    keyId: release.update.keyId,
    fromReleaseId: release.update.releaseId,
    fromVersion: release.update.version,
    fromSourceSha: release.update.sourceSha,
    fromSourceTree: release.update.sourceTree,
    targetReleaseId: rollbackTarget.update.releaseId,
    targetVersion: rollbackTarget.update.version,
    targetSourceSha: rollbackTarget.update.sourceSha,
    targetSourceTree: rollbackTarget.update.sourceTree,
    targetArtifactSha256: rollbackTarget.update.artifactSha256,
    targetArtifactVersionId: rollbackTarget.update.artifactVersionId,
    targetMetadata: rollbackTarget.update,
    targetMetadataSha256: rollbackTarget.signedMetadata.metadataSha256,
    revocationRevision: 1,
    reasonCode: "operator_verified_regression",
    generatedAt: "2026-09-04T04:30:00.000Z",
    expiresAt: "2026-09-04T06:00:00.000Z",
    ...rollbackOverrides,
  } : null;
  const signedRollback = rollbackAuthorization
    ? signInternalUnsignedRollbackBytes(rollbackAuthorization, keys.privateKey)
    : null;
  const objects = {
    artifact: release.artifactBytes,
    update_metadata: release.signedMetadata.metadataBytes,
    update_metadata_signature: release.signedMetadata.signatureBytes,
    revocations: release.signedRevocations.revocationBytes,
    revocations_signature: release.signedRevocations.signatureBytes,
    rollback: signedRollback?.rollbackBytes ?? Buffer.from("{}\n"),
    rollback_signature: signedRollback?.signatureBytes ?? Buffer.alloc(64, 1),
    rollback_target_metadata:
      rollbackTarget?.signedMetadata.metadataBytes ?? Buffer.from("{}\n"),
    rollback_target_metadata_signature:
      rollbackTarget?.signedMetadata.signatureBytes ?? Buffer.alloc(64, 2),
    rollback_target_artifact:
      rollbackTarget?.artifactBytes ?? Buffer.from("previous-installer"),
  };
  const downloads = Object.fromEntries(Object.entries(objects).map(([kind, bytes]) => [kind, {
    url: `https://${DOMAIN}/internal-unsigned/${kind}?Expires=1788498600&Signature=signed-${kind}&Key-Pair-Id=K123`,
    sha256: digest(bytes),
    bytes: bytes.byteLength,
    version_id: kind === "artifact"
      ? release.update.artifactVersionId
      : kind === "rollback_target_artifact" && rollbackTarget
        ? rollbackTarget.update.artifactVersionId
        : `version-${kind}`,
  }]));
  return {
    authorization: {
      schema_version: "law-firm-os.amic-internal-unsigned-download-authorization.v1",
      outcome: "authorized",
      release_id: release.update.releaseId,
      release_sequence: release.update.releaseSequence,
      version: release.update.version,
      expires_at: "2026-09-04T05:05:00.000Z",
      downloads,
      authorization_receipt_sha256: "d".repeat(64),
      raw_s3_location_returned: false,
      aws_credentials_returned: false,
      private_key_material_returned: false,
      public_release_allowed: false,
      http_status: 200,
    },
    fetch: async (url) => {
      const kind = new URL(url).pathname.split("/").at(-1);
      assert.ok(objects[kind], `unexpected download ${kind}`);
      return response(objects[kind]);
    },
    rollbackId: rollbackAuthorization?.rollbackId ?? null,
  };
}

function replaceBrokerObject(broker, kind, bytes) {
  return {
    ...broker,
    authorization: {
      ...broker.authorization,
      downloads: {
        ...broker.authorization.downloads,
        [kind]: {
          ...broker.authorization.downloads[kind],
          bytes: bytes.byteLength,
          sha256: digest(bytes),
        },
      },
    },
    fetch: async (url) => new URL(url).pathname.split("/").at(-1) === kind
      ? response(bytes)
      : broker.fetch(url),
  };
}

function memoryStateStore() {
  let value = null;
  return {
    async load() { return value == null ? null : structuredClone(value); },
    async save(next) { value = structuredClone(next); return structuredClone(value); },
    snapshot() { return value == null ? null : structuredClone(value); },
  };
}

test("trust manifest accepts only the pinned public Ed25519 key", () => {
  assert.equal(trust().publicKey.asymmetricKeyType, "ed25519");
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
  assert.throws(() => parseInternalUnsignedUpdateTrust({
    schema_version: INTERNAL_UNSIGNED_UPDATE_TRUST_SCHEMA,
    key_id: INTERNAL_UPDATE_KEY_ID,
    public_key_spki_base64: rsa.publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    private_key_material_included: false,
    public_release_allowed: false,
  }), /must be Ed25519/u);
  assert.throws(() => parseInternalUnsignedUpdateTrust({
    schema_version: INTERNAL_UNSIGNED_UPDATE_TRUST_SCHEMA,
    key_id: INTERNAL_UPDATE_KEY_ID,
    public_key_spki_base64: keys.publicKey.export({ type: "spki", format: "der" }).toString("base64"),
    private_key_material_included: true,
    public_release_allowed: false,
  }), /trust manifest is invalid/u);
});

test("runtime bootstraps a non-discoverable baseline from its signed successor proof", async (t) => {
  const source32 = "2".repeat(40);
  const tree32 = "3".repeat(40);
  const release32 = signedRelease({
    version: "0.1.32",
    releaseId: "amic-os-internal-0.1.32",
    sequence: 32,
    sourceSha: source32,
    sourceTree: tree32,
    artifactBytes: Buffer.from("installed-release-0.1.32"),
    predecessor: {
      releaseId: "amic-os-internal-0.1.31",
      version: "0.1.31",
      sourceSha: "0".repeat(40),
      sourceTree: "1".repeat(40),
    },
  });
  const source33 = "4".repeat(40);
  const tree33 = "5".repeat(40);
  const release33 = signedRelease({
    version: "0.1.33",
    releaseId: "amic-os-internal-0.1.33",
    sequence: 33,
    sourceSha: source33,
    sourceTree: tree33,
    artifactBytes: Buffer.from("streamed-installer-release-0.1.33"),
    predecessor: {
      releaseId: release32.update.releaseId,
      version: release32.update.version,
      sourceSha: release32.update.sourceSha,
      sourceTree: release32.update.sourceTree,
    },
  });
  const broker = brokerFixture(release33, { rollbackTarget: release32 });
  const stateStore = memoryStateStore();
  const root = await mkdtemp(join(tmpdir(), "amic-update-runtime-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  let opened = 0;
  const staging = createFileSystemInternalUnsignedUpdateStaging({
    basePath: root,
    openInstaller: async () => { opened += 1; return ""; },
  });
  let authorizationCalls = 0;
  const requestedKinds = [];
  const runtime = createInternalUnsignedUpdateRuntime({
    build: build("0.1.32", source32, tree32),
    trust: trust(),
    authorize: async () => {
      authorizationCalls += 1;
      return broker.authorization;
    },
    stateStore,
    staging,
    fetchImpl: (url) => {
      requestedKinds.push(new URL(url).pathname.split("/").at(-1));
      return broker.fetch(url);
    },
    now: () => NOW,
  });
  assert.equal((await runtime.initialize()).state, "baseline_required");
  const available = await runtime.check();
  assert.equal(available.state, "update_available");
  assert.equal(available.available_version, "0.1.33");
  assert.equal(available.signed_url_returned, false);
  assert.equal(available.local_path_returned, false);
  assert.deepEqual(httpHostnames(available), []);
  assert.equal(authorizationCalls, 1);
  assert.equal(
    stateStore.snapshot().current.metadata_base64,
    release32.signedMetadata.metadataBytes.toString("base64"),
  );
  assert.deepEqual(requestedKinds.sort(), [
    "revocations",
    "revocations_signature",
    "rollback",
    "rollback_signature",
    "rollback_target_metadata",
    "rollback_target_metadata_signature",
    "update_metadata",
    "update_metadata_signature",
  ]);
  await assert.rejects(
    () => runtime.stage(),
    (error) => error?.code === "INTERNAL_UPDATE_USER_ACTIVATION_REQUIRED",
  );
  const staged = await runtime.stage({ userActivation: true });
  assert.equal(staged.state, "staged");
  assert.match(staged.stage_id, /^[a-f0-9-]{36}$/u);
  assert.equal(staged.artifact_sha256, release33.update.artifactSha256);
  assert.equal(staged.local_path_returned, false);
  await assert.rejects(
    () => runtime.open({ stageId: staged.stage_id, confirmed: true }),
    (error) => error?.code === "INTERNAL_UPDATE_OPERATOR_CONFIRMATION_REQUIRED",
  );
  const openedStatus = await runtime.open({
    stageId: staged.stage_id,
    confirmed: true,
    userActivation: true,
  });
  assert.equal(openedStatus.state, "installer_opened_pending_restart");
  assert.equal(opened, 1);
  assert.equal(stateStore.snapshot().pending.metadata_base64, release33.signedMetadata.metadataBytes.toString("base64"));

  const nextStaging = createFileSystemInternalUnsignedUpdateStaging({ basePath: root });
  const restarted = createInternalUnsignedUpdateRuntime({
    build: build("0.1.33", source33, tree33),
    trust: trust(),
    authorize: async () => broker.authorization,
    stateStore,
    staging: nextStaging,
    fetchImpl: (url) => broker.fetch(url),
    now: () => NOW,
  });
  const promoted = await restarted.initialize();
  assert.equal(promoted.state, "installed_build_matched_pending");
  assert.equal(promoted.operation, "update");
  assert.equal(stateStore.snapshot().pending, null);
  assert.equal(stateStore.snapshot().current.metadata_base64, release33.signedMetadata.metadataBytes.toString("base64"));
  assert.equal(stateStore.snapshot().previous.metadata_base64, release32.signedMetadata.metadataBytes.toString("base64"));
  const current = await restarted.check();
  assert.equal(current.state, "up_to_date");
  assert.equal(current.rollback_available, true);
  assert.equal(current.rollback_version, "0.1.32");
  await assert.rejects(
    () => restarted.stageRollback(),
    (error) => error?.code === "INTERNAL_UPDATE_USER_ACTIVATION_REQUIRED",
  );
  const rollbackStaged = await restarted.stageRollback({ userActivation: true });
  assert.equal(rollbackStaged.state, "rollback_staged");
  assert.equal(rollbackStaged.operation, "rollback");
  assert.equal(rollbackStaged.available_version, "0.1.32");
  await restarted.open({
    stageId: rollbackStaged.stage_id,
    confirmed: true,
    userActivation: true,
  });
  assert.equal(stateStore.snapshot().pending_operation.direction, "rollback");
  assert.equal(stateStore.snapshot().pending_operation.rollback_id, broker.rollbackId);

  const rollbackRestarted = createInternalUnsignedUpdateRuntime({
    build: build("0.1.32", source32, tree32),
    trust: trust(),
    authorize: async () => broker.authorization,
    stateStore,
    staging: createFileSystemInternalUnsignedUpdateStaging({ basePath: root }),
    fetchImpl: (url) => broker.fetch(url),
    now: () => NOW,
  });
  const rollbackPromoted = await rollbackRestarted.initialize();
  assert.equal(rollbackPromoted.state, "installed_build_matched_pending");
  assert.equal(rollbackPromoted.operation, "rollback");
  assert.equal(stateStore.snapshot().pending, null);
  assert.equal(stateStore.snapshot().previous, null);
  assert.deepEqual(stateStore.snapshot().used_rollback_ids, [broker.rollbackId]);
  assert.equal(
    stateStore.snapshot().current.metadata_base64,
    release32.signedMetadata.metadataBytes.toString("base64"),
  );
});

test("runtime leaves no baseline state when successor proof validation fails", async (t) => {
  const source32 = "2".repeat(40);
  const tree32 = "3".repeat(40);
  const release32 = signedRelease({
    version: "0.1.32",
    releaseId: "amic-os-internal-0.1.32",
    sequence: 32,
    sourceSha: source32,
    sourceTree: tree32,
    artifactBytes: Buffer.from("installed-release-0.1.32"),
    predecessor: {
      releaseId: "amic-os-internal-0.1.31",
      version: "0.1.31",
      sourceSha: "0".repeat(40),
      sourceTree: "1".repeat(40),
    },
  });
  const release33 = signedRelease({
    version: "0.1.33",
    releaseId: "amic-os-internal-0.1.33",
    sequence: 33,
    sourceSha: "4".repeat(40),
    sourceTree: "5".repeat(40),
    artifactBytes: Buffer.from("streamed-installer-release-0.1.33"),
    predecessor: {
      releaseId: release32.update.releaseId,
      version: release32.update.version,
      sourceSha: release32.update.sourceSha,
      sourceTree: release32.update.sourceTree,
    },
  });
  const validBroker = brokerFixture(release33, { rollbackTarget: release32 });
  const invalidSignature = Buffer.from(release32.signedMetadata.signatureBytes);
  invalidSignature[0] ^= 0xff;
  const revokedBaseline = signInternalUnsignedRevocationsBytes({
    schemaVersion: INTERNAL_UNSIGNED_REVOCATION_SCHEMA,
    revocationId: "amic-os-internal-revocations-0002",
    revision: 1,
    channel: release33.update.channel,
    lawosTenantId: release33.update.lawosTenantId,
    appId: release33.update.appId,
    keyId: release33.update.keyId,
    revokedReleaseIds: [release32.update.releaseId],
    revokedArtifactSha256s: [],
    generatedAt: "2026-09-04T04:00:00.000Z",
    expiresAt: "2026-09-11T04:00:00.000Z",
  }, keys.privateKey);
  const revokedBroker = replaceBrokerObject(
    replaceBrokerObject(validBroker, "revocations", revokedBaseline.revocationBytes),
    "revocations_signature",
    revokedBaseline.signatureBytes,
  );
  const cases = [
    {
      name: "installed source does not match the signed target",
      broker: validBroker,
      installedBuild: build("0.1.32", "6".repeat(40), tree32),
      code: "INTERNAL_UPDATE_BASELINE_MISMATCH",
    },
    {
      name: "rollback revocation revision differs",
      broker: brokerFixture(release33, {
        rollbackTarget: release32,
        rollbackOverrides: { revocationRevision: 2 },
      }),
      installedBuild: build("0.1.32", source32, tree32),
      code: "INTERNAL_UPDATE_BASELINE_AUTHORIZATION_MISMATCH",
    },
    {
      name: "rollback target signature is invalid",
      broker: replaceBrokerObject(
        validBroker,
        "rollback_target_metadata_signature",
        invalidSignature,
      ),
      installedBuild: build("0.1.32", source32, tree32),
      code: "INTERNAL_UPDATE_BASELINE_PROOF_INVALID",
    },
    {
      name: "signed revocations include the baseline",
      broker: revokedBroker,
      installedBuild: build("0.1.32", source32, tree32),
      code: "INTERNAL_UPDATE_BASELINE_REVOKED",
    },
  ];
  for (const scenario of cases) {
    await t.test(scenario.name, async (subtest) => {
      const stateStore = memoryStateStore();
      const root = await mkdtemp(join(tmpdir(), "amic-update-invalid-baseline-"));
      subtest.after(() => rm(root, { recursive: true, force: true }));
      const runtime = createInternalUnsignedUpdateRuntime({
        build: scenario.installedBuild,
        trust: trust(),
        authorize: async () => scenario.broker.authorization,
        stateStore,
        staging: createFileSystemInternalUnsignedUpdateStaging({ basePath: root }),
        fetchImpl: (url) => scenario.broker.fetch(url),
        now: () => NOW,
      });
      assert.equal((await runtime.initialize()).state, "baseline_required");
      await assert.rejects(
        () => runtime.check(),
        (error) => error?.code === scenario.code,
      );
      assert.equal(stateStore.snapshot(), null);
    });
  }
});

test("runtime blocks another rollback before download when consumed rollback history is full", async (t) => {
  const source32 = "2".repeat(40);
  const tree32 = "3".repeat(40);
  const release32 = signedRelease({
    version: "0.1.32",
    releaseId: "amic-os-internal-0.1.32",
    sequence: 32,
    sourceSha: source32,
    sourceTree: tree32,
    artifactBytes: Buffer.from("installed-release-0.1.32"),
    predecessor: {
      releaseId: "amic-os-internal-0.1.31",
      version: "0.1.31",
      sourceSha: "0".repeat(40),
      sourceTree: "1".repeat(40),
    },
  });
  const source33 = "4".repeat(40);
  const tree33 = "5".repeat(40);
  const release33 = signedRelease({
    version: "0.1.33",
    releaseId: "amic-os-internal-0.1.33",
    sequence: 33,
    sourceSha: source33,
    sourceTree: tree33,
    artifactBytes: Buffer.from("installed-release-0.1.33"),
    predecessor: {
      releaseId: release32.update.releaseId,
      version: release32.update.version,
      sourceSha: release32.update.sourceSha,
      sourceTree: release32.update.sourceTree,
    },
  });
  const broker = brokerFixture(release33, { rollbackTarget: release32 });
  const record = (release) => ({
    metadata_base64: release.signedMetadata.metadataBytes.toString("base64"),
    signature_base64: release.signedMetadata.signatureBytes.toString("base64"),
  });
  const usedRollbackIds = Array.from(
    { length: 64 },
    (_, index) => `consumed-rollback-${String(index).padStart(2, "0")}`,
  );
  const stateStore = memoryStateStore();
  await stateStore.save({
    schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
    current: record(release33),
    previous: record(release32),
    pending: null,
    pending_operation: null,
    used_rollback_ids: usedRollbackIds,
  });
  const root = await mkdtemp(join(tmpdir(), "amic-update-history-full-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const requestedKinds = [];
  const runtime = createInternalUnsignedUpdateRuntime({
    build: build("0.1.33", source33, tree33),
    trust: trust(),
    authorize: async () => broker.authorization,
    stateStore,
    staging: createFileSystemInternalUnsignedUpdateStaging({ basePath: root }),
    fetchImpl: async (url) => {
      requestedKinds.push(new URL(url).pathname.split("/").at(-1));
      return broker.fetch(url);
    },
    now: () => NOW,
  });
  assert.equal((await runtime.initialize()).state, "ready");
  await assert.rejects(
    () => runtime.check(),
    (error) => error?.code === "INTERNAL_UPDATE_ROLLBACK_HISTORY_FULL",
  );
  assert.deepEqual(requestedKinds.sort(), [
    "revocations",
    "revocations_signature",
    "update_metadata",
    "update_metadata_signature",
  ]);

  const pendingStateStore = memoryStateStore();
  await pendingStateStore.save({
    schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
    current: record(release33),
    previous: record(release32),
    pending: record(release32),
    pending_operation: {
      direction: "rollback",
      rollback_id: broker.rollbackId,
      rollback_sha256: "f".repeat(64),
    },
    used_rollback_ids: usedRollbackIds,
  });
  const restarted = createInternalUnsignedUpdateRuntime({
    build: build("0.1.32", source32, tree32),
    trust: trust(),
    authorize: async () => broker.authorization,
    stateStore: pendingStateStore,
    staging: createFileSystemInternalUnsignedUpdateStaging({ basePath: root }),
    fetchImpl: (url) => broker.fetch(url),
    now: () => NOW,
  });
  await assert.rejects(
    () => restarted.initialize(),
    (error) => error?.code === "INTERNAL_UPDATE_ROLLBACK_HISTORY_FULL",
  );
  assert.equal(pendingStateStore.snapshot().used_rollback_ids.length, 64);
});

test("encrypted update state store round-trips the closed state without plaintext", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "amic-update-state-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const filePath = join(root, "state.json");
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(`encrypted:${value}`),
    decryptString: (value) => value.toString().replace(/^encrypted:/u, ""),
  };
  const store = createEncryptedFileInternalUnsignedUpdateStateStore({ filePath, safeStorage });
  const value = {
    schema_version: INTERNAL_UNSIGNED_UPDATE_STATE_SCHEMA,
    current: {
      metadata_base64: Buffer.from("{}\n").toString("base64"),
      signature_base64: Buffer.alloc(64, 1).toString("base64"),
    },
    previous: null,
    pending: null,
    pending_operation: null,
    used_rollback_ids: [],
  };
  await store.save(value);
  assert.deepEqual(await store.load(), value);
  const raw = await readFile(filePath, "utf8");
  assert.equal(raw.includes(value.current.metadata_base64), false);
  assert.equal(raw.includes("metadata_base64"), false);
});

test("IPC projection rejects untrusted senders and never returns download authority", async () => {
  const handlers = new Map();
  const ipcMain = {
    handle(channel, handler) { handlers.set(channel, handler); },
    removeHandler(channel) { handlers.delete(channel); },
  };
  const runtime = {
    enabled: true,
    status: () => ({ state: "ready", enabled: true }),
    check: async () => ({
      state: "update_available",
      enabled: true,
      url: "https://d111111abcdef8.cloudfront.net/private",
    }),
    stage: async () => ({ state: "staged", enabled: true }),
    stageRollback: async () => ({ state: "rollback_staged", enabled: true }),
    open: async () => ({ state: "installer_opened_pending_restart", enabled: true }),
    discard: async () => ({ state: "ready", enabled: true }),
  };
  const registration = registerInternalUnsignedUpdateIpcHandlers({
    ipcMain,
    runtime,
    isTrustedSender: (event) => event?.trusted === true,
  });
  const denied = await handlers.get(INTERNAL_UNSIGNED_UPDATE_IPC_CHANNELS.check)({ trusted: false });
  assert.equal(denied.safe_error_code, "INTERNAL_UPDATE_UNTRUSTED_RENDERER");
  assert.equal(denied.signed_url_returned, false);
  const rollback = await handlers.get(INTERNAL_UNSIGNED_UPDATE_IPC_CHANNELS.stageRollback)(
    { trusted: true },
    { userActivation: true },
  );
  assert.equal(rollback.state, "rollback_staged");
  registration.dispose();
  assert.equal(handlers.size, 0);
});
