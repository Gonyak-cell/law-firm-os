import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
  sign,
} from "node:crypto";
import test from "node:test";
import {
  INTERNAL_UNSIGNED_CLOUDFRONT_SIGNER_SECRET_SCHEMA,
  INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH,
  createAwsInternalUnsignedUpdateBroker,
  createDisabledInternalUnsignedUpdateBroker,
  handleInternalUnsignedUpdateBrokerApiRequest,
  resolveInternalUnsignedUpdateBrokerFromEnv,
} from "../src/internal-unsigned-update-broker.js";
import {
  OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE,
  OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
  parseOutlookDesktopAutoconnectRoster,
} from "../src/outlook-desktop-entitlement.js";
import { createApiServer } from "../src/server.js";

const NOW = Date.parse("2026-09-04T05:00:00.000Z");
const TENANT_ID = "tenant-amic-internal";
const USER_ID = "user-amic-internal";
const INSTALLATION_ID = "odi_aaaaaaaaaaaaaaaaaaaa";
const ACCOUNT_ID = "770880870480";
const REGION = "ap-northeast-2";
const KMS_KEY_ARN = `arn:aws:kms:${REGION}:${ACCOUNT_ID}:key/12345678-1234-1234-1234-123456789012`;
const BUCKET = "amic-os-internal-artifacts-770880870480";
const DOMAIN = "d111111abcdef8.cloudfront.net";
const KEY_PAIR_ID = "K1234567890";
const VERSION_ID = "version-001";

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(canonicalValue(value))}\n`);
}

function sha256(bytes) {
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

function ref(kind, bytes, suffix = `${kind}.json`) {
  return Object.freeze({
    kind,
    key: `internal-unsigned/win32/x64/0.1.33/${"2".repeat(40)}/${sha256(bytes)}/${suffix}`,
    version_id: VERSION_ID,
    sha256: sha256(bytes),
    bytes: bytes.byteLength,
  });
}

function fixture({ tamperMetadata = false, channelTenantId = TENANT_ID } = {}) {
  const metadataKeys = generateKeyPairSync("ed25519");
  const cloudFrontKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const placeholderDocument = canonicalBytes({ fixture: "document" });
  const placeholderSignature = Buffer.alloc(64, 7);
  const releaseManifest = ref("release_manifest", placeholderDocument, "release-manifest.json");
  const releaseManifestSignature = ref(
    "release_manifest_signature",
    placeholderSignature,
    "release-manifest.sig",
  );
  const revocations = ref("revocations", placeholderDocument, "revocations.json");
  const revocationsSignature = ref(
    "revocations_signature",
    placeholderSignature,
    "revocations.sig",
  );
  const artifactBytes = Buffer.from("synthetic internal unsigned installer");
  const artifactSha256 = sha256(artifactBytes);
  const updateMetadata = {
    schemaVersion: "law-firm-os.matter-desktop-internal-unsigned-update.v2",
    releaseId: "release-0.1.33",
    version: "0.1.33",
    channel: "internal-unsigned",
    lawosTenantId: TENANT_ID,
    installationId: INSTALLATION_ID,
    appId: "com.amic.matter.desktop.internal",
    keyId: "matter-internal-update-key-v1",
    sourceSha: "2".repeat(40),
    sourceTree: "3".repeat(40),
    predecessorReleaseId: "release-0.1.32",
    predecessorVersion: "0.1.32",
    predecessorSourceSha: "4".repeat(40),
    predecessorSourceTree: "5".repeat(40),
    releaseSequence: 33,
    platform: "win32",
    architecture: "x64",
    artifactFilename: "AMIC-OS-internal-0.1.33-win-x64.exe",
    artifactObjectKey: [
      "internal-unsigned",
      "win32",
      "x64",
      "0.1.33",
      "2".repeat(40),
      artifactSha256,
      "AMIC-OS-internal-0.1.33-win-x64.exe",
    ].join("/"),
    artifactSha256,
    artifactBytes: artifactBytes.byteLength,
    artifactVersionId: "artifact-version-001",
    releaseManifestSha256: releaseManifest.sha256,
    authenticodeStatus: "not_signed",
    distribution: "private",
    managedDeviceOnly: true,
    publicReleaseAllowed: false,
    generatedAt: "2026-09-04T04:55:00.000Z",
    expiresAt: "2026-09-11T04:55:00.000Z",
  };
  const metadataBytes = canonicalBytes(updateMetadata);
  const metadataSignature = sign(null, metadataBytes, metadataKeys.privateKey);
  const updateMetadataRef = ref("update_metadata", metadataBytes, "update-metadata.json");
  const updateMetadataSignatureRef = ref(
    "update_metadata_signature",
    metadataSignature,
    "update-metadata.sig",
  );
  const rollbackTargetArtifactBytes = Buffer.from("synthetic previous internal installer");
  const rollbackTargetArtifactSha256 = sha256(rollbackTargetArtifactBytes);
  const rollbackTargetMetadata = {
    ...updateMetadata,
    releaseId: updateMetadata.predecessorReleaseId,
    version: updateMetadata.predecessorVersion,
    sourceSha: updateMetadata.predecessorSourceSha,
    sourceTree: updateMetadata.predecessorSourceTree,
    predecessorReleaseId: "release-0.1.31",
    predecessorVersion: "0.1.31",
    predecessorSourceSha: "6".repeat(40),
    predecessorSourceTree: "7".repeat(40),
    releaseSequence: 32,
    artifactFilename: "AMIC-OS-internal-0.1.32-win-x64.exe",
    artifactSha256: rollbackTargetArtifactSha256,
    artifactBytes: rollbackTargetArtifactBytes.byteLength,
    artifactVersionId: "artifact-version-rollback-001",
  };
  rollbackTargetMetadata.artifactObjectKey = [
    "internal-unsigned",
    rollbackTargetMetadata.platform,
    rollbackTargetMetadata.architecture,
    rollbackTargetMetadata.version,
    rollbackTargetMetadata.sourceSha,
    rollbackTargetMetadata.artifactSha256,
    rollbackTargetMetadata.artifactFilename,
  ].join("/");
  const rollbackTargetMetadataBytes = canonicalBytes(rollbackTargetMetadata);
  const rollbackTargetMetadataSignature = sign(
    null,
    rollbackTargetMetadataBytes,
    metadataKeys.privateKey,
  );
  const rollbackTargetMetadataRef = ref(
    "rollback_target_metadata",
    rollbackTargetMetadataBytes,
    "rollback-target-update-metadata.json",
  );
  const rollbackTargetMetadataSignatureRef = ref(
    "rollback_target_metadata_signature",
    rollbackTargetMetadataSignature,
    "rollback-target-update-metadata.sig",
  );
  const rollbackDocument = {
    schemaVersion: "law-firm-os.matter-desktop-internal-unsigned-rollback.v2",
    rollbackId: "rollback-release-0.1.33-to-0.1.32-001",
    channel: "internal-unsigned",
    lawosTenantId: TENANT_ID,
    installationId: INSTALLATION_ID,
    appId: updateMetadata.appId,
    keyId: updateMetadata.keyId,
    fromReleaseId: updateMetadata.releaseId,
    fromVersion: updateMetadata.version,
    fromSourceSha: updateMetadata.sourceSha,
    fromSourceTree: updateMetadata.sourceTree,
    targetReleaseId: rollbackTargetMetadata.releaseId,
    targetVersion: rollbackTargetMetadata.version,
    targetSourceSha: rollbackTargetMetadata.sourceSha,
    targetSourceTree: rollbackTargetMetadata.sourceTree,
    targetArtifactSha256: rollbackTargetMetadata.artifactSha256,
    targetArtifactVersionId: rollbackTargetMetadata.artifactVersionId,
    targetMetadata: rollbackTargetMetadata,
    targetMetadataSha256: sha256(rollbackTargetMetadataBytes),
    revocationRevision: 1,
    reasonCode: "operator_verified_regression",
    generatedAt: "2026-09-04T04:55:00.000Z",
    expiresAt: "2026-09-04T05:55:00.000Z",
  };
  const rollbackBytes = canonicalBytes(rollbackDocument);
  const rollbackSignatureBytes = sign(null, rollbackBytes, metadataKeys.privateKey);
  const rollback = ref("rollback", rollbackBytes, "rollback.json");
  const rollbackSignature = ref(
    "rollback_signature",
    rollbackSignatureBytes,
    "rollback.sig",
  );
  const channel = {
    schema_version: "law-firm-os.amic-internal-unsigned-channel.v2",
    channel: "internal-unsigned",
    lawos_tenant_id: channelTenantId,
    installation_id: INSTALLATION_ID,
    app_id: "com.amic.matter.desktop.internal",
    platform: "win32",
    architecture: "x64",
    release_id: updateMetadata.releaseId,
    release_sequence: updateMetadata.releaseSequence,
    version: updateMetadata.version,
    source_sha: updateMetadata.sourceSha,
    source_tree: updateMetadata.sourceTree,
    key_id: updateMetadata.keyId,
    generated_at: updateMetadata.generatedAt,
    expires_at: updateMetadata.expiresAt,
    release_manifest: releaseManifest,
    release_manifest_signature: releaseManifestSignature,
    update_metadata: updateMetadataRef,
    update_metadata_signature: updateMetadataSignatureRef,
    revocations,
    revocations_signature: revocationsSignature,
    rollback,
    rollback_signature: rollbackSignature,
    rollback_target_metadata: rollbackTargetMetadataRef,
    rollback_target_metadata_signature: rollbackTargetMetadataSignatureRef,
    public_release_allowed: false,
  };
  const channelBytes = canonicalBytes(channel);
  const channelSignature = sign(null, channelBytes, metadataKeys.privateKey);
  const channelDocumentRef = ref("channel_document", channelBytes, "channel.json");
  const channelSignatureRef = ref("channel_signature", channelSignature, "channel.sig");
  const envelope = {
    schema_version: "law-firm-os.amic-internal-unsigned-channel-envelope.v1",
    key_id: "matter-internal-update-key-v1",
    document_base64: channelBytes.toString("base64"),
    signature_base64: channelSignature.toString("base64"),
    document_sha256: sha256(channelBytes),
    signature_sha256: sha256(channelSignature),
    document_object: channelDocumentRef,
    signature_object: channelSignatureRef,
    channel_pointer_moved_after_all_object_readbacks: true,
    public_release_allowed: false,
  };
  const pointerBytes = canonicalBytes(envelope);
  const objects = new Map([
    ["channel_pointer", { bytes: pointerBytes, kind: "channel_pointer" }],
    [updateMetadataRef.key, {
      bytes: tamperMetadata
        ? Buffer.concat([metadataBytes.subarray(0, -2), Buffer.from(" \n")])
        : metadataBytes,
      kind: "update_metadata",
    }],
    [updateMetadataSignatureRef.key, {
      bytes: metadataSignature,
      kind: "update_metadata_signature",
    }],
    [rollback.key, { bytes: rollbackBytes, kind: "rollback" }],
    [rollbackSignature.key, {
      bytes: rollbackSignatureBytes,
      kind: "rollback_signature",
    }],
    [rollbackTargetMetadataRef.key, {
      bytes: rollbackTargetMetadataBytes,
      kind: "rollback_target_metadata",
    }],
    [rollbackTargetMetadataSignatureRef.key, {
      bytes: rollbackTargetMetadataSignature,
      kind: "rollback_target_metadata_signature",
    }],
  ]);
  const s3Commands = [];
  const s3Client = {
    async send(command) {
      s3Commands.push(command);
      const input = command.input;
      const kind = input.Key.endsWith("/current.json") ? "channel_pointer" : input.Key;
      const object = objects.get(kind);
      if (!object) throw new Error("not found");
      const { bytes, kind: expectedKind } = object;
      return {
        Body: { async transformToByteArray() { return bytes; } },
        ContentLength: bytes.byteLength,
        ChecksumSHA256: Buffer.from(sha256(bytes), "hex").toString("base64"),
        ServerSideEncryption: "aws:kms",
        SSEKMSKeyId: KMS_KEY_ARN,
        VersionId: input.VersionId,
        Metadata: {
          "artifact-kind": expectedKind,
          "artifact-sha256": sha256(bytes),
        },
      };
    },
  };
  const secretsCommands = [];
  const privateKeyPem = cloudFrontKeys.privateKey.export({ type: "pkcs8", format: "pem" });
  const secretsClient = {
    async send(command) {
      secretsCommands.push(command);
      return {
        SecretString: JSON.stringify({
          schema_version: INTERNAL_UNSIGNED_CLOUDFRONT_SIGNER_SECRET_SCHEMA,
          key_pair_id: KEY_PAIR_ID,
          private_key_pem: privateKeyPem,
        }),
      };
    },
  };
  const broker = createAwsInternalUnsignedUpdateBroker({
    region: REGION,
    accountId: ACCOUNT_ID,
    bucket: BUCKET,
    kmsKeyArn: KMS_KEY_ARN,
    cloudFrontDomain: DOMAIN,
    cloudFrontKeyPairId: KEY_PAIR_ID,
    cloudFrontPrivateKeySecretArn:
      `arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:amic/internal/update/signer-AbCdEf`,
    metadataPublicKey: metadataKeys.publicKey,
    s3Client,
    secretsClient,
    now: () => NOW,
  });
  return { broker, s3Commands, secretsCommands };
}

test("trusted current installation receives only short-lived CloudFront capabilities", async () => {
  const { broker, s3Commands, secretsCommands } = fixture();
  const result = await handleInternalUnsignedUpdateBrokerApiRequest({
    pathname: INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH,
    method: "POST",
    principal: { tenant_id: TENANT_ID, user_id: USER_ID },
    installation: { installation_id: INSTALLATION_ID, status: "active" },
    runtime: broker,
    requestId: "request-001",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.outcome, "authorized");
  assert.equal(result.body.release_id, "release-0.1.33");
  assert.equal(result.body.version, "0.1.33");
  assert.deepEqual(Object.keys(result.body.downloads).sort(), [
    "artifact",
    "revocations",
    "revocations_signature",
    "rollback",
    "rollback_signature",
    "rollback_target_artifact",
    "rollback_target_metadata",
    "rollback_target_metadata_signature",
    "update_metadata",
    "update_metadata_signature",
  ]);
  for (const download of Object.values(result.body.downloads)) {
    const url = new URL(download.url);
    assert.equal(url.origin, `https://${DOMAIN}`);
    assert.equal(url.searchParams.get("Key-Pair-Id"), KEY_PAIR_ID);
    assert.equal(url.searchParams.has("Signature"), true);
    assert.equal(url.searchParams.has("Expires"), true);
    assert.match(download.sha256, /^[0-9a-f]{64}$/u);
    assert.equal(Number.isSafeInteger(download.bytes), true);
    assert.equal(download.url.includes(BUCKET), false);
  }
  assert.equal(result.body.expires_at, "2026-09-04T05:05:00.000Z");
  assert.equal(result.body.raw_s3_location_returned, false);
  assert.equal(result.body.aws_credentials_returned, false);
  assert.equal(result.body.private_key_material_returned, false);
  assert.equal(JSON.stringify(result.body).includes(privateKeyNeedle()), false);
  assert.equal(s3Commands.length, 7);
  assert.equal(s3Commands[0].input.VersionId, undefined);
  assert.equal(s3Commands[1].input.VersionId, VERSION_ID);
  assert.equal(secretsCommands.length, 1);
  assert.equal(secretsCommands[0].input.VersionStage, "AWSCURRENT");
});

function privateKeyNeedle() {
  return "PRIVATE KEY";
}

test("channel or object tampering fails closed without returning a signed URL", async () => {
  for (const options of [
    { channelTenantId: "tenant-other" },
    { tamperMetadata: true },
  ]) {
    const { broker } = fixture(options);
    const result = await handleInternalUnsignedUpdateBrokerApiRequest({
      pathname: INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH,
      method: "POST",
      principal: { tenant_id: TENANT_ID, user_id: USER_ID },
      installation: { installation_id: INSTALLATION_ID, status: "active" },
      runtime: broker,
      requestId: "request-denied",
    });
    assert.equal(result.status, 503);
    assert.equal(result.body.outcome, "blocked");
    assert.equal(result.body.signed_url_returned, false);
    assert.equal(httpHostnames(result.body).includes(DOMAIN), false);
  }
});

test("broker stays disabled by default and rejects untrusted installations", async () => {
  assert.equal(resolveInternalUnsignedUpdateBrokerFromEnv({ env: {} }).configured, false);
  const disabled = await handleInternalUnsignedUpdateBrokerApiRequest({
    pathname: INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH,
    method: "POST",
    principal: { tenant_id: TENANT_ID, user_id: USER_ID },
    installation: { installation_id: INSTALLATION_ID, status: "active" },
    runtime: createDisabledInternalUnsignedUpdateBroker(),
    requestId: "request-disabled",
  });
  assert.equal(disabled.status, 503);
  assert.deepEqual(disabled.body.safe_error_codes, ["INTERNAL_UPDATE_DISTRIBUTION_DISABLED"]);

  const { broker } = fixture();
  const untrusted = await handleInternalUnsignedUpdateBrokerApiRequest({
    pathname: INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH,
    method: "POST",
    principal: { tenant_id: TENANT_ID, user_id: USER_ID },
    installation: { installation_id: INSTALLATION_ID, status: "retired" },
    runtime: broker,
    requestId: "request-untrusted",
  });
  assert.equal(untrusted.status, 403);
  assert.deepEqual(untrusted.body.safe_error_codes, [
    "INTERNAL_UPDATE_INSTALLATION_BINDING_REQUIRED",
  ]);
});

test("enabled environment requires a valid pinned Ed25519 public key", () => {
  assert.throws(() => resolveInternalUnsignedUpdateBrokerFromEnv({
    env: { LAWOS_AMIC_INTERNAL_UPDATE_ENABLED: "true" },
  }), /metadata public key configuration is invalid/u);
});

test("broker configuration pins KMS and signer secret to the configured region and account", () => {
  const metadataKeys = generateKeyPairSync("ed25519");
  const publicKey = metadataKeys.publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const base = {
    LAWOS_AMIC_INTERNAL_UPDATE_ENABLED: "true",
    AWS_REGION: REGION,
    LAWOS_AMIC_INTERNAL_UPDATE_AWS_ACCOUNT_ID: ACCOUNT_ID,
    LAWOS_AMIC_INTERNAL_UPDATE_BUCKET: BUCKET,
    LAWOS_AMIC_INTERNAL_UPDATE_KMS_KEY_ARN: KMS_KEY_ARN,
    LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_DOMAIN: DOMAIN,
    LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_KEY_PAIR_ID: KEY_PAIR_ID,
    LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_PRIVATE_KEY_SECRET_ARN:
      `arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:amic/internal/update/signer-AbCdEf`,
    LAWOS_AMIC_INTERNAL_UPDATE_ED25519_PUBLIC_KEY_SPKI_BASE64: publicKey,
  };
  assert.throws(() => resolveInternalUnsignedUpdateBrokerFromEnv({
    env: {
      ...base,
      LAWOS_AMIC_INTERNAL_UPDATE_KMS_KEY_ARN:
        `arn:aws:kms:us-east-1:${ACCOUNT_ID}:key/12345678-1234-1234-1234-123456789012`,
    },
  }), /configuration is invalid/u);
  assert.throws(() => resolveInternalUnsignedUpdateBrokerFromEnv({
    env: {
      ...base,
      LAWOS_AMIC_INTERNAL_UPDATE_CLOUDFRONT_PRIVATE_KEY_SECRET_ARN:
        `arn:aws:secretsmanager:${REGION}:000000000000:secret:amic/internal/update/signer-AbCdEf`,
    },
  }), /configuration is invalid/u);
});

test("real HTTP dispatch re-reads trusted installation before invoking the broker", async (t) => {
  const { broker, s3Commands } = fixture();
  const subjectId = "subject-amic-internal";
  const principal = Object.freeze({
    tenant_id: TENANT_ID,
    user_id: USER_ID,
    entra_subject_id: subjectId,
    scopes: Object.freeze([OUTLOOK_DESKTOP_AUTOCONNECT_REQUIRED_SCOPE]),
  });
  const context = Object.freeze({
    principal,
    rules: Object.freeze([{ id: "allow-update", effect: "allow", action: "*" }]),
    object_acl: Object.freeze([]),
  });
  const roster = parseOutlookDesktopAutoconnectRoster({
    schema_version: OUTLOOK_DESKTOP_AUTOCONNECT_ROSTER_SCHEMA_VERSION,
    roster_version: "internal-update-test-v1",
    entries: Array.from({ length: 10 }, (_, index) => ({
      tenant_id: TENANT_ID,
      user_id: index === 0 ? USER_ID : `user-amic-internal-${index}`,
      entra_subject_id: index === 0 ? subjectId : `subject-amic-internal-${index}`,
      enabled: true,
    })),
  });
  let trusted = Object.freeze({
    installation_id: INSTALLATION_ID,
    status: "active",
    state_version: 1,
    lease_expires_at: "2026-09-05T05:00:00.000Z",
    retired_at: null,
    release_trusted: true,
    authority_snapshot_at: "2026-09-04T05:00:00.000Z",
  });
  let installationReads = 0;
  const server = createApiServer({
    internalUnsignedUpdateBroker: broker,
    outlookDesktopRuntime: Object.freeze({
      entitlement_roster: roster,
      installation_service: Object.freeze({
        async readTrustedCurrent() {
          installationReads += 1;
          return trusted;
        },
      }),
    }),
    sessionAuth: {
      capabilities: {},
      async resolvePermissionContextFromHeaders(headers) {
        if (!headers.authorization) return { ok: false, status: 401 };
        return {
          ok: true,
          principal,
          context,
          token_payload: { surface: "desktop" },
        };
      },
    },
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const allowed = await fetch(`${baseUrl}${INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH}`, {
    method: "POST",
    headers: { authorization: "Bearer signed-desktop-session" },
  });
  assert.equal(allowed.status, 200, await allowed.text());
  assert.equal(installationReads, 1);
  assert.equal(s3Commands.length, 7);

  trusted = null;
  const denied = await fetch(`${baseUrl}${INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH}`, {
    method: "POST",
    headers: { authorization: "Bearer signed-desktop-session" },
  });
  const deniedBody = await denied.json();
  assert.equal(denied.status, 403);
  assert.deepEqual(deniedBody.safe_error_codes, [
    "OUTLOOK_DESKTOP_TRUSTED_INSTALLATION_REQUIRED",
  ]);
  assert.equal(installationReads, 2);
  assert.equal(s3Commands.length, 7);

  const unauthenticated = await fetch(
    `${baseUrl}${INTERNAL_UNSIGNED_UPDATE_AUTHORIZE_PATH}`,
    { method: "POST" },
  );
  assert.equal(unauthenticated.status, 401);
  assert.equal(installationReads, 2);
});
