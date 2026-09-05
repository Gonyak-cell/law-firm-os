import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as signBytes,
  verify as verifyBytes,
} from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import {
  INTERNAL_UNSIGNED_UPDATE_CHANNEL,
  INTERNAL_UPDATE_KEY_ID,
  assertInternalUnsignedRevocationsDocument,
  assertInternalUnsignedRollbackDocument,
  canonicalizeUpdateMetadata,
  signInternalUnsignedRevocationsBytes,
  signInternalUnsignedRollbackBytes,
  signUpdateMetadataBytes,
  verifyAndParseInternalUnsignedRevocationsBytes,
  verifyAndParseUpdateMetadataBytes,
} from "../../apps/desktop/src/main/updates.js";
import { AMIC_INTERNAL_DISTRIBUTION_PREFIX } from "./amic-os-internal-distribution-infrastructure.mjs";
import { validateDesktopBuildManifest } from "./matter-desktop-provenance.mjs";
import { createWindowsSignedArtifactAwsCliAdapter } from "./windows-signed-artifact-private-handoff.mjs";

export const AMIC_INTERNAL_RELEASE_MANIFEST_SCHEMA =
  "law-firm-os.amic-internal-unsigned-release-manifest.v1";
export const AMIC_INTERNAL_CHANNEL_DOCUMENT_SCHEMA =
  "law-firm-os.amic-internal-unsigned-channel.v2";
export const AMIC_INTERNAL_CHANNEL_ENVELOPE_SCHEMA =
  "law-firm-os.amic-internal-unsigned-channel-envelope.v1";
export const AMIC_INTERNAL_PUBLICATION_RECEIPT_SCHEMA =
  "law-firm-os.amic-internal-unsigned-publication-receipt.v1";
export const AMIC_INTERNAL_BASELINE_DOCUMENT_SCHEMA =
  "law-firm-os.amic-internal-unsigned-baseline.v1";
export const AMIC_INTERNAL_BASELINE_ENVELOPE_SCHEMA =
  "law-firm-os.amic-internal-unsigned-baseline-envelope.v1";
export const AMIC_INTERNAL_BASELINE_PUBLICATION_RECEIPT_SCHEMA =
  "law-firm-os.amic-internal-unsigned-baseline-publication-receipt.v1";
export const AMIC_INTERNAL_METADATA_SIGNING_SECRET_SCHEMA =
  "law-firm-os.amic-internal-unsigned-metadata-signing-secret.v1";
export const AMIC_INTERNAL_PROVENANCE_SCHEMA =
  "law-firm-os.amic-internal-unsigned-build-provenance.v1";
export const AMIC_INTERNAL_MANAGED_BOOTSTRAP_MANIFEST_SCHEMA =
  "law-firm-os.amic-internal-unsigned-managed-bootstrap-manifest.v1";
export const AMIC_INTERNAL_MANAGED_BOOTSTRAP_ENVELOPE_SCHEMA =
  "law-firm-os.amic-internal-unsigned-managed-bootstrap-envelope.v1";
export const AMIC_INTERNAL_MANAGED_BOOTSTRAP_RECEIPT_SCHEMA =
  "law-firm-os.amic-internal-unsigned-managed-bootstrap-publication-receipt.v1";
export const AMIC_INTERNAL_MANAGED_BOOTSTRAP_PREFIX =
  `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}baseline/managed-bootstrap/`;
export const AMIC_INTERNAL_MANAGED_BOOTSTRAP_BOUNDARIES = Object.freeze({
  publication_mode: "managed-bootstrap",
  delivery_mode: "authenticated-owner-mediated",
  installation_registered: false,
  update_authorization_published: false,
  channel_pointer_published: false,
  rollback_authorization_published: false,
  runtime_discoverable: false,
  public_release_allowed: false,
});

const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const BUCKET = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/u;
const VERSION_ID = /^[A-Za-z0-9][A-Za-z0-9._+=/-]{0,1023}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const RELEASE_FIELDS = Object.freeze([
  "appId",
  "architecture",
  "expiresAt",
  "generatedAt",
  "installationId",
  "keyId",
  "lawosTenantId",
  "platform",
  "predecessor",
  "releaseId",
  "releaseSequence",
  "sourceSha",
  "sourceTree",
  "version",
]);
const RELEASE_PREDECESSOR_FIELDS = Object.freeze([
  "releaseId",
  "sourceSha",
  "sourceTree",
  "version",
]);
const DISTRIBUTION_BINDING_FIELDS = Object.freeze([
  "accessLogBucket",
  "accountId",
  "bucket",
  "kmsKeyArn",
  "region",
  "retainUntil",
]);
const CONTENT_TYPES = Object.freeze({
  installer: "application/vnd.microsoft.portable-executable",
  build_manifest: "application/json",
  sbom: "application/vnd.cyclonedx+json",
  provenance: "application/json",
  release_manifest: "application/json",
  release_manifest_signature: "application/octet-stream",
  update_metadata: "application/json",
  update_metadata_signature: "application/octet-stream",
  revocations: "application/json",
  revocations_signature: "application/octet-stream",
  rollback: "application/json",
  rollback_signature: "application/octet-stream",
  rollback_target_metadata: "application/json",
  rollback_target_metadata_signature: "application/octet-stream",
  channel_document: "application/json",
  channel_signature: "application/octet-stream",
  channel_pointer: "application/json",
  baseline_marker: "application/json",
  managed_bootstrap_marker: "application/json",
});
const PROVENANCE_FIELDS = Object.freeze([
  "app_id",
  "authenticode_status",
  "build_manifest_sha256",
  "build_result_sha256",
  "credentials_included",
  "distribution_profile",
  "generated_at",
  "github_release_installer_asset_allowed",
  "installer_bytes",
  "installer_sha256",
  "internal_unsigned_privacy_audit",
  "private_source_content_match_count",
  "private_source_digest_count",
  "private_source_file_count",
  "public_release",
  "real_contact_seed_included",
  "real_photo_seed_included",
  "real_registration_seed_included",
  "ref",
  "release_id",
  "release_sequence",
  "repository",
  "run_attempt",
  "run_id",
  "runner_environment",
  "sbom_sha256",
  "schema_version",
  "source_sha",
  "source_tree",
  "version",
  "workflow_ref",
]);
const PUBLISH_WORKFLOW_REF =
  "Gonyak-cell/law-firm-os/.github/workflows/amic-os-internal-unsigned-publish.yml@refs/heads/main";
const PREDECESSOR_ENVELOPE_FIELDS = Object.freeze({
  baseline: Object.freeze([
    "baseline_marker_written_after_all_object_readbacks",
    "channel_pointer_published",
    "document_base64",
    "document_sha256",
    "key_id",
    "public_release_allowed",
    "rollback_authorization_published",
    "runtime_discoverable",
    "schema_version",
    "signature_base64",
    "signature_sha256",
  ]),
  channel: Object.freeze([
    "channel_pointer_moved_after_all_object_readbacks",
    "document_base64",
    "document_object",
    "document_sha256",
    "key_id",
    "public_release_allowed",
    "schema_version",
    "signature_base64",
    "signature_object",
    "signature_sha256",
  ]),
});
const PREDECESSOR_DOCUMENT_FIELDS = Object.freeze({
  baseline: Object.freeze([
    "app_id",
    "architecture",
    "channel",
    "channel_pointer_published",
    "expires_at",
    "generated_at",
    "installation_id",
    "key_id",
    "lawos_tenant_id",
    "platform",
    "publication_mode",
    "public_release_allowed",
    "release_id",
    "release_manifest",
    "release_manifest_signature",
    "release_sequence",
    "rollback_authorization_published",
    "runtime_discoverable",
    "schema_version",
    "source_sha",
    "source_tree",
    "update_metadata",
    "update_metadata_signature",
    "version",
  ]),
  channel: Object.freeze([
    "app_id",
    "architecture",
    "channel",
    "expires_at",
    "generated_at",
    "installation_id",
    "key_id",
    "lawos_tenant_id",
    "platform",
    "public_release_allowed",
    "release_id",
    "release_manifest",
    "release_manifest_signature",
    "release_sequence",
    "revocations",
    "revocations_signature",
    "rollback",
    "rollback_signature",
    "rollback_target_metadata",
    "rollback_target_metadata_signature",
    "schema_version",
    "source_sha",
    "source_tree",
    "update_metadata",
    "update_metadata_signature",
    "version",
  ]),
});

function canonicalBytes(value) {
  return Buffer.from(`${canonicalizeUpdateMetadata(value)}\n`);
}

function digestBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseAmicInternalMetadataSigningSecret(value) {
  let document;
  try {
    document = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new TypeError("metadata signing secret is not valid JSON");
  }
  assert.deepEqual(
    Object.keys(document ?? {}).sort(),
    ["key_id", "private_key_pkcs8_pem", "schema_version"],
    "metadata signing secret must use the exact closed schema",
  );
  assert.equal(document.schema_version, AMIC_INTERNAL_METADATA_SIGNING_SECRET_SCHEMA);
  assert.equal(document.key_id, INTERNAL_UPDATE_KEY_ID);
  assert.equal(typeof document.private_key_pkcs8_pem, "string");
  const privateKey = createPrivateKey(document.private_key_pkcs8_pem);
  assert.equal(privateKey.asymmetricKeyType, "ed25519", "metadata signing secret must hold an Ed25519 private key");
  return Object.freeze({ keyId: document.key_id, privateKey });
}

export function createAmicInternalDistributionAwsCliAdapter({
  region,
  fetchImpl = globalThis.fetch,
} = {}) {
  const base = createWindowsSignedArtifactAwsCliAdapter({ region });
  function awsJson(args) {
    try {
      return JSON.parse(execFileSync("aws", [
        ...args,
        "--region", region,
        "--no-cli-pager",
        "--output", "json",
      ], {
        encoding: "utf8",
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      }));
    } catch {
      throw new Error("AWS CLI internal distribution governance read failed");
    }
  }
  return Object.freeze({
    ...base,
    async inspectGovernance(bindings) {
      const governance = await base.inspectGovernance(bindings);
      return Object.freeze({
        ...governance,
        logging: awsJson([
          "s3api",
          "get-bucket-logging",
          "--bucket", bindings.bucket,
          "--expected-bucket-owner", bindings.account_id,
        ]),
      });
    },
    async readMetadataSigningSecret(secretArn) {
      let output;
      try {
        output = execFileSync("aws", [
          "secretsmanager",
          "get-secret-value",
          "--secret-id", secretArn,
          "--query", "SecretString",
          "--output", "text",
          "--region", region,
          "--no-cli-pager",
        ], {
          encoding: "utf8",
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe"],
          maxBuffer: 1024 * 1024,
        });
      } catch {
        throw new Error("AWS Secrets Manager metadata signing key read failed");
      }
      return parseAmicInternalMetadataSigningSecret(output.trim());
    },
    async listObjectVersions({ bucket, prefix, expectedOwner }) {
      return awsJson([
        "s3api",
        "list-object-versions",
        "--bucket", bucket,
        "--prefix", prefix,
        "--max-items", "100",
        "--expected-bucket-owner", expectedOwner,
      ]);
    },
    async getObjectBody({ bucket, key, versionId, expectedOwner }) {
      const temporaryRoot = await mkdtemp(join(tmpdir(), "amic-os-internal-readback-"));
      const bodyPath = join(temporaryRoot, "body");
      try {
        const response = awsJson([
          "s3api",
          "get-object",
          "--bucket", bucket,
          "--key", key,
          "--version-id", versionId,
          "--expected-bucket-owner", expectedOwner,
          "--checksum-mode", "ENABLED",
          bodyPath,
        ]);
        const stat = await lstat(bodyPath);
        assert.equal(stat.isSymbolicLink(), false, "AWS S3 readback body cannot be a symlink");
        assert.equal(stat.isFile(), true, "AWS S3 readback body must be a regular file");
        assert.ok(Number.isSafeInteger(stat.size) && stat.size > 0, "AWS S3 readback body size is invalid");
        const body = await readFile(bodyPath);
        assert.equal(body.byteLength, stat.size, "AWS S3 readback body changed while being read");
        return Object.freeze({ ...response, body });
      } finally {
        await rm(temporaryRoot, { recursive: true, force: true });
      }
    },
    async probeAnonymousAccess({ bucket, region: expectedRegion, cloudFrontDomain, key }) {
      assert.equal(typeof fetchImpl, "function", "anonymous-access probe requires fetch");
      assert.match(bucket ?? "", BUCKET, "anonymous-access probe bucket is invalid");
      assert.equal(expectedRegion, region, "anonymous-access probe region differs");
      assert.match(
        cloudFrontDomain ?? "",
        /^d[a-z0-9]{3,62}\.cloudfront\.net$/u,
        "anonymous-access probe CloudFront domain is invalid",
      );
      assert.ok(
        typeof key === "string" && key.startsWith(AMIC_INTERNAL_DISTRIBUTION_PREFIX),
        "anonymous-access probe key escaped its prefix",
      );
      const objectPath = key.split("/").map(encodeURIComponent).join("/");
      const request = async (url) => {
        const response = await fetchImpl(url, {
          method: "HEAD",
          redirect: "manual",
          credentials: "omit",
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal: AbortSignal.timeout(15_000),
        });
        return response.status;
      };
      const [s3Status, cloudFrontStatus] = await Promise.all([
        request(`https://${bucket}.s3.${region}.amazonaws.com/${objectPath}`),
        request(`https://${cloudFrontDomain}/${objectPath}`),
      ]);
      return Object.freeze({ s3_status: s3Status, cloudfront_status: cloudFrontStatus });
    },
  });
}

export function sanitizeAmicInternalPublicationReceipt(receipt) {
  assert.equal(receipt?.schema_version, AMIC_INTERNAL_PUBLICATION_RECEIPT_SCHEMA);
  assert.equal(receipt?.state, "PASS");
  return Object.freeze({
    schema_version: "law-firm-os.amic-internal-unsigned-publication-public-receipt.v1",
    state: "PASS",
    publication_mode: "successor",
    release_id: receipt.release_id,
    release_sequence: receipt.release_sequence,
    version: receipt.version,
    source_sha: receipt.source_sha,
    source_tree: receipt.source_tree,
    object_count: receipt.object_count,
    channel_pointer_key_sha256: digestBytes(Buffer.from(receipt.channel_pointer.key)),
    channel_pointer_version_id_sha256: digestBytes(
      Buffer.from(receipt.channel_pointer.version_id),
    ),
    channel_pointer_sha256: receipt.channel_pointer.sha256,
    exact_head_readback_complete: receipt.exact_head_readback_complete,
    exact_get_readback_complete: receipt.exact_get_readback_complete,
    rollback_target_artifact_readback_complete:
      receipt.rollback_target_artifact_readback_complete,
    predecessor_control_kind: receipt.predecessor_control_kind,
    rollback_target_metadata_renewed: receipt.rollback_target_metadata_renewed,
    channel_pointer_moved_last: receipt.channel_pointer_moved_last,
    authenticode_status: receipt.authenticode_status,
    private_distribution: receipt.private_distribution,
    public_installer_uploaded: receipt.public_installer_uploaded,
    github_release_installer_asset_allowed: receipt.github_release_installer_asset_allowed,
    raw_bucket_included: false,
    raw_object_key_included: false,
    raw_version_id_included: false,
    raw_secret_included: false,
    private_receipt_sha256: receipt.receipt_sha256,
  });
}

export function sanitizeAmicInternalBaselinePublicationReceipt(receipt) {
  assert.equal(receipt?.schema_version, AMIC_INTERNAL_BASELINE_PUBLICATION_RECEIPT_SCHEMA);
  assert.equal(receipt?.state, "PASS");
  return Object.freeze({
    schema_version: "law-firm-os.amic-internal-unsigned-baseline-publication-public-receipt.v1",
    state: "PASS",
    publication_mode: "baseline",
    release_id: receipt.release_id,
    release_sequence: receipt.release_sequence,
    version: receipt.version,
    source_sha: receipt.source_sha,
    source_tree: receipt.source_tree,
    object_count: receipt.object_count,
    baseline_marker_key_sha256: digestBytes(Buffer.from(receipt.baseline_marker.key)),
    baseline_marker_version_id_sha256: digestBytes(
      Buffer.from(receipt.baseline_marker.version_id),
    ),
    baseline_marker_sha256: receipt.baseline_marker.sha256,
    exact_head_readback_complete: receipt.exact_head_readback_complete,
    exact_get_readback_complete: receipt.exact_get_readback_complete,
    channel_history_absent_before_publication:
      receipt.channel_history_absent_before_publication,
    channel_pointer_published: false,
    rollback_authorization_published: false,
    runtime_discoverable: false,
    authenticode_status: receipt.authenticode_status,
    private_distribution: receipt.private_distribution,
    public_installer_uploaded: receipt.public_installer_uploaded,
    github_release_installer_asset_allowed: receipt.github_release_installer_asset_allowed,
    raw_bucket_included: false,
    raw_object_key_included: false,
    raw_version_id_included: false,
    raw_secret_included: false,
    private_receipt_sha256: receipt.receipt_sha256,
  });
}

export function sanitizeAmicInternalManagedBootstrapPublicationReceipt(receipt) {
  assert.equal(receipt?.schema_version, AMIC_INTERNAL_MANAGED_BOOTSTRAP_RECEIPT_SCHEMA);
  assert.equal(receipt?.state, "PASS");
  assert.equal(receipt.object_count, 7);
  assert.equal(receipt.exact_head_readback_complete, true);
  assert.equal(receipt.exact_get_readback_complete, true);
  for (const [field, value] of Object.entries(AMIC_INTERNAL_MANAGED_BOOTSTRAP_BOUNDARIES)) {
    assert.equal(receipt[field], value, `bootstrap receipt boundary differs: ${field}`);
  }
  return Object.freeze({
    schema_version: "law-firm-os.amic-internal-unsigned-managed-bootstrap-publication-public-receipt.v1",
    state: "PASS",
    ...AMIC_INTERNAL_MANAGED_BOOTSTRAP_BOUNDARIES,
    release_id: receipt.release_id,
    release_sequence: receipt.release_sequence,
    version: receipt.version,
    source_sha: receipt.source_sha,
    source_tree: receipt.source_tree,
    object_count: receipt.object_count,
    managed_bootstrap_marker_sha256: receipt.managed_bootstrap_marker.sha256,
    exact_head_readback_complete: receipt.exact_head_readback_complete,
    exact_get_readback_complete: receipt.exact_get_readback_complete,
    authenticode_status: receipt.authenticode_status,
    private_distribution: true,
    public_installer_uploaded: false,
    github_release_installer_asset_allowed: false,
    raw_bucket_included: false,
    raw_object_key_included: false,
    raw_version_id_included: false,
    raw_secret_included: false,
    private_receipt_sha256: receipt.receipt_sha256,
  });
}

async function fileRecord(path, kind) {
  const stat = await lstat(path);
  assert.equal(stat.isSymbolicLink(), false, `${kind} cannot be a symbolic link`);
  assert.equal(stat.isFile(), true, `${kind} must be a regular file`);
  assert.ok(stat.size > 0, `${kind} cannot be empty`);
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return Object.freeze({
    kind,
    path,
    filename: basename(path),
    sha256: digest.digest("hex"),
    bytes: stat.size,
    content_type: CONTENT_TYPES[kind],
  });
}

function validateBindings(bindings, now) {
  exactObject(bindings, DISTRIBUTION_BINDING_FIELDS, "distribution bindings");
  assert.match(bindings?.accountId ?? "", /^[0-9]{12}$/u, "AWS account id is invalid");
  assert.match(bindings?.region ?? "", /^[a-z]{2}(?:-gov)?-[a-z]+-\d$/u, "AWS region is invalid");
  assert.match(bindings?.bucket ?? "", BUCKET, "artifact bucket name is invalid");
  assert.match(bindings?.accessLogBucket ?? "", BUCKET, "access log bucket name is invalid");
  assert.match(
    bindings?.kmsKeyArn ?? "",
    new RegExp(`^arn:aws:kms:${bindings.region}:${bindings.accountId}:key/[0-9a-f-]{36}$`, "u"),
    "artifact KMS key ARN is invalid",
  );
  assert.equal(new Date(bindings.retainUntil).toISOString(), bindings.retainUntil);
  assert.equal(Date.parse(bindings.retainUntil) % 1000, 0, "artifact retention must use whole UTC seconds");
  const retentionDays = (Date.parse(bindings.retainUntil) - now) / (24 * 60 * 60 * 1000);
  assert.ok(retentionDays >= 365 && retentionDays <= 3650, "artifact retention must be 365 to 3650 days");
  return Object.freeze({ ...bindings });
}

export function validateAmicInternalDistributionBindings(bindings, { now = Date.now() } = {}) {
  return validateBindings(bindings, now);
}

function validateRelease(release, now, publicationMode = "successor") {
  assert.ok(["baseline", "successor", "managed-bootstrap"].includes(publicationMode),
    "publication mode is invalid");
  const managedBootstrap = publicationMode === "managed-bootstrap";
  exactObject(release, managedBootstrap
    ? RELEASE_FIELDS.filter((field) => !["installationId", "predecessor"].includes(field))
    : RELEASE_FIELDS, "release document");
  assert.match(release?.releaseId ?? "", IDENTIFIER, "release id is invalid");
  assert.match(release?.version ?? "", VERSION, "release version is invalid");
  assert.match(release?.lawosTenantId ?? "", IDENTIFIER, "tenant id is invalid");
  assert.equal(release?.appId, "com.amic.matter.desktop.internal");
  assert.equal(release?.keyId, INTERNAL_UPDATE_KEY_ID);
  assert.match(release?.sourceSha ?? "", GIT_OBJECT, "source SHA is invalid");
  assert.match(release?.sourceTree ?? "", GIT_OBJECT, "source tree is invalid");
  assert.equal(release?.platform, "win32");
  assert.equal(release?.architecture, "x64");
  assert.ok(Number.isSafeInteger(release?.releaseSequence) && release.releaseSequence > 0);
  if (!managedBootstrap) {
    assert.match(release?.installationId ?? "", IDENTIFIER, "installation id is invalid");
    exactObject(release.predecessor, RELEASE_PREDECESSOR_FIELDS, "release predecessor");
    assert.match(release.predecessor.releaseId ?? "", IDENTIFIER, "predecessor release id is invalid");
    assert.match(release.predecessor.version ?? "", VERSION, "predecessor version is invalid");
    assert.match(release.predecessor.sourceSha ?? "", GIT_OBJECT, "predecessor source SHA is invalid");
    assert.match(release.predecessor.sourceTree ?? "", GIT_OBJECT, "predecessor source tree is invalid");
  }
  assert.equal(new Date(release.generatedAt).toISOString(), release.generatedAt);
  assert.equal(new Date(release.expiresAt).toISOString(), release.expiresAt);
  assert.ok(Date.parse(release.generatedAt) <= now, "release metadata is not active yet");
  assert.ok(Date.parse(release.expiresAt) > now, "release metadata is expired");
  assert.ok(Date.parse(release.expiresAt) - Date.parse(release.generatedAt)
    <= 31 * 24 * 60 * 60 * 1000, "release metadata lifetime exceeds 31 days");
  return Object.freeze({
    ...release,
    ...(managedBootstrap ? {} : { predecessor: Object.freeze({ ...release.predecessor }) }),
  });
}

export function validateAmicInternalDistributionRelease(release, {
  now = Date.now(), publicationMode = "successor",
} = {}) {
  return validateRelease(release, now, publicationMode);
}

function sbomPropertyMap(sbom) {
  const properties = sbom?.metadata?.component?.properties;
  assert.ok(Array.isArray(properties), "SBOM protected properties are missing");
  const result = Object.create(null);
  for (const property of properties) {
    assert.equal(typeof property?.name, "string", "SBOM property name is invalid");
    assert.equal(typeof property?.value, "string", "SBOM property value is invalid");
    assert.equal(result[property.name], undefined, `SBOM property is duplicated: ${property.name}`);
    result[property.name] = property.value;
  }
  return result;
}

function validateProvenance({ provenance, release, sourceRecords, now }) {
  assert.deepEqual(Object.keys(provenance ?? {}).sort(), [...PROVENANCE_FIELDS].sort(),
    "provenance must use the exact closed schema");
  assert.equal(provenance.schema_version, AMIC_INTERNAL_PROVENANCE_SCHEMA);
  assert.equal(new Date(provenance.generated_at).toISOString(), provenance.generated_at);
  assert.ok(Date.parse(provenance.generated_at) <= now, "provenance is not active yet");
  assert.ok(now - Date.parse(provenance.generated_at) <= 31 * 24 * 60 * 60 * 1000,
    "provenance is stale");
  assert.equal(provenance.source_sha, release.sourceSha);
  assert.equal(provenance.source_tree, release.sourceTree);
  assert.equal(provenance.version, release.version);
  assert.equal(provenance.release_id, release.releaseId);
  assert.equal(provenance.release_sequence, release.releaseSequence);
  assert.equal(provenance.app_id, release.appId);
  assert.equal(provenance.installer_sha256, sourceRecords.installer.sha256);
  assert.equal(provenance.installer_bytes, sourceRecords.installer.bytes);
  assert.equal(provenance.build_manifest_sha256, sourceRecords.build_manifest.sha256);
  assert.equal(provenance.sbom_sha256, sourceRecords.sbom.sha256);
  assert.match(provenance.build_result_sha256 ?? "", SHA256);
  assert.equal(provenance.distribution_profile, "internal-unsigned");
  assert.equal(provenance.authenticode_status, "NotSigned");
  assert.equal(provenance.internal_unsigned_privacy_audit, true);
  assert.ok(Number.isSafeInteger(provenance.private_source_file_count)
    && provenance.private_source_file_count >= 0);
  assert.ok(Number.isSafeInteger(provenance.private_source_digest_count)
    && provenance.private_source_digest_count >= 0);
  assert.equal(provenance.private_source_content_match_count, 0);
  assert.equal(provenance.real_contact_seed_included, false);
  assert.equal(provenance.real_photo_seed_included, false);
  assert.equal(provenance.real_registration_seed_included, false);
  assert.equal(provenance.credentials_included, false);
  assert.equal(provenance.public_release, false);
  assert.equal(provenance.github_release_installer_asset_allowed, false);
  assert.equal(provenance.repository, "Gonyak-cell/law-firm-os");
  assert.equal(provenance.ref, "refs/heads/main");
  assert.equal(provenance.workflow_ref, PUBLISH_WORKFLOW_REF);
  assert.match(provenance.run_id ?? "", /^[1-9][0-9]*$/u);
  assert.match(provenance.run_attempt ?? "", /^[1-9][0-9]*$/u);
  assert.equal(provenance.runner_environment, "github-hosted");
}

function validateGovernance(governance, bindings) {
  const publicAccess = governance?.publicAccess?.PublicAccessBlockConfiguration;
  const encryptionRule = governance?.encryption?.ServerSideEncryptionConfiguration?.Rules?.[0];
  const encryption = encryptionRule?.ApplyServerSideEncryptionByDefault;
  const logging = governance?.logging?.LoggingEnabled;
  assert.equal(governance?.identity?.Account, bindings.accountId, "AWS caller account differs");
  assert.equal(governance?.location?.LocationConstraint, bindings.region, "artifact bucket region differs");
  assert.equal(governance?.versioning?.Status, "Enabled", "artifact bucket versioning is disabled");
  assert.deepEqual(publicAccess, {
    BlockPublicAcls: true,
    BlockPublicPolicy: true,
    IgnorePublicAcls: true,
    RestrictPublicBuckets: true,
  }, "artifact bucket public access block is incomplete");
  assert.equal(
    governance?.objectLock?.ObjectLockConfiguration?.ObjectLockEnabled,
    "Enabled",
    "artifact bucket Object Lock is disabled",
  );
  assert.equal(encryption?.SSEAlgorithm, "aws:kms", "artifact bucket is not SSE-KMS encrypted");
  assert.equal(encryption?.KMSMasterKeyID, bindings.kmsKeyArn, "artifact bucket KMS key differs");
  assert.equal(encryptionRule?.BucketKeyEnabled ?? false, false,
    "artifact bucket keys must be disabled for prefix-scoped CloudFront decrypt");
  assert.deepEqual(
    governance?.ownership?.OwnershipControls?.Rules,
    [{ ObjectOwnership: "BucketOwnerEnforced" }],
    "artifact bucket ownership control differs",
  );
  assert.equal(logging?.TargetBucket, bindings.accessLogBucket, "artifact bucket access logging differs");
  assert.match(logging?.TargetPrefix ?? "", /^s3-access\//u, "artifact access log prefix is invalid");
}

function contentAddressedKey(release, record) {
  return [
    AMIC_INTERNAL_DISTRIBUTION_PREFIX.replace(/\/$/u, ""),
    release.platform,
    release.architecture,
    release.version,
    release.sourceSha,
    record.sha256,
    record.filename,
  ].join("/");
}

function generatedRecord(kind, filename, bytes) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.byteLength > 0, `${kind} bytes are required`);
  return Object.freeze({
    kind,
    filename,
    bytes: bytes.byteLength,
    sha256: digestBytes(bytes),
    content_type: CONTENT_TYPES[kind],
    body: bytes,
  });
}

function signedDocument(value, privateKey, kind, filename, signatureKind, signatureFilename) {
  const body = canonicalBytes(value);
  const signature = signBytes(null, body, privateKey);
  return Object.freeze({
    document: generatedRecord(kind, filename, body),
    signature: generatedRecord(signatureKind, signatureFilename, signature),
  });
}

async function materializeGeneratedRecord(root, record) {
  const path = join(root, record.filename);
  await writeFile(path, record.body, { flag: "wx", mode: 0o600, flush: true });
  return Object.freeze({ ...record, path });
}

function validateProviderReadback({ response, expected, versionId, bindings, label }) {
  const checksum = Buffer.from(expected.sha256, "hex").toString("base64");
  assert.equal(response?.VersionId, versionId, `${label} VersionId differs`);
  assert.equal(Number(response?.ContentLength), expected.bytes, `${label} byte count differs`);
  assert.equal(response?.ServerSideEncryption, "aws:kms", `${label} encryption differs`);
  assert.equal(response?.SSEKMSKeyId, bindings.kmsKeyArn, `${label} KMS key differs`);
  assert.equal(response?.ChecksumSHA256, checksum, `${label} provider checksum differs`);
  assert.equal(response?.ObjectLockMode, "COMPLIANCE", `${label} Object Lock mode differs`);
  assert.equal(
    new Date(response?.ObjectLockRetainUntilDate).toISOString(),
    bindings.retainUntil,
    `${label} retention differs`,
  );
  assert.equal(response?.Metadata?.["artifact-sha256"], expected.sha256, `${label} metadata digest differs`);
}

function parseCanonicalJsonBytes(bytes, label) {
  let source;
  try { source = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error(`${label} is not valid UTF-8`); }
  assert.equal(source.includes("\0"), false, `${label} contains a NUL byte`);
  let value;
  try { value = JSON.parse(source); }
  catch { throw new Error(`${label} is not valid JSON`); }
  assert.deepEqual(Buffer.from(bytes), canonicalBytes(value), `${label} is not canonical JSON`);
  return value;
}

function decodeCanonicalBase64(value, label) {
  assert.equal(typeof value, "string", `${label} is not base64 text`);
  const bytes = Buffer.from(value, "base64");
  assert.ok(bytes.byteLength > 0 && bytes.toString("base64") === value, `${label} is not canonical base64`);
  return bytes;
}

function exactObject(value, fields, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} is not an object`);
  assert.deepEqual(Object.keys(value).sort(), [...fields].sort(), `${label} schema differs`);
  return value;
}

function rollbackTargetIdentity(metadata) {
  const { generatedAt: _generatedAt, expiresAt: _expiresAt, ...identity } = metadata;
  return identity;
}

function assertRevocationSuperset(current, predecessor) {
  assert.ok(current.revision > predecessor.revision,
    "revocation revision must advance from the active predecessor");
  for (const releaseId of predecessor.revokedReleaseIds) {
    assert.ok(current.revokedReleaseIds.includes(releaseId),
      "revoked release cannot be removed by a successor");
  }
  for (const digest of predecessor.revokedArtifactSha256s) {
    assert.ok(current.revokedArtifactSha256s.includes(digest),
      "revoked artifact cannot be removed by a successor");
  }
}

function assertHistoricalObjectRef(value, expectedKind, label) {
  exactObject(value, ["bytes", "key", "kind", "sha256", "version_id"], label);
  assert.equal(value.kind, expectedKind, `${label} kind differs`);
  assert.ok(value.key.startsWith(AMIC_INTERNAL_DISTRIBUTION_PREFIX), `${label} key escaped its prefix`);
  assert.match(value.sha256, SHA256, `${label} digest is invalid`);
  assert.match(value.version_id, VERSION_ID, `${label} VersionId is invalid`);
  assert.ok(Number.isSafeInteger(value.bytes) && value.bytes > 0, `${label} byte count is invalid`);
  return value;
}

async function readHistoricalObject({ aws, bindings, ref, expectedKind, retainThrough, label }) {
  assertHistoricalObjectRef(ref, expectedKind, label);
  const response = await aws.getObjectBody({
    bucket: bindings.bucket,
    key: ref.key,
    versionId: ref.version_id,
    expectedOwner: bindings.accountId,
  });
  assert.equal(response?.VersionId, ref.version_id, `${label} VersionId differs`);
  assert.equal(Number(response?.ContentLength), ref.bytes, `${label} byte count differs`);
  assert.equal(response?.ServerSideEncryption, "aws:kms", `${label} encryption differs`);
  assert.equal(response?.SSEKMSKeyId, bindings.kmsKeyArn, `${label} KMS key differs`);
  assert.equal(
    response?.ChecksumSHA256,
    Buffer.from(ref.sha256, "hex").toString("base64"),
    `${label} provider checksum differs`,
  );
  assert.equal(response?.ObjectLockMode, "COMPLIANCE", `${label} Object Lock mode differs`);
  assert.ok(
    Date.parse(response?.ObjectLockRetainUntilDate) >= retainThrough,
    `${label} retention expires before successor rollback`,
  );
  assert.equal(response?.Metadata?.["artifact-sha256"], ref.sha256, `${label} metadata digest differs`);
  assert.equal(response?.Metadata?.["artifact-kind"], expectedKind, `${label} metadata kind differs`);
  const body = Buffer.from(response?.body ?? []);
  assert.equal(body.byteLength, ref.bytes, `${label} body is partial`);
  assert.equal(digestBytes(body), ref.sha256, `${label} body digest differs`);
  return body;
}

async function latestScopedObjectRef({ aws, bindings, key, expectedKind }) {
  const response = await aws.listObjectVersions({
    bucket: bindings.bucket,
    prefix: key,
    expectedOwner: bindings.accountId,
  });
  const versions = Array.isArray(response?.Versions) ? response.Versions : [];
  const deleteMarkers = Array.isArray(response?.DeleteMarkers) ? response.DeleteMarkers : [];
  assert.equal(
    [...versions, ...deleteMarkers].every((entry) => entry?.Key === key),
    true,
    "successor scope listing escaped its exact key",
  );
  const latest = [...versions, ...deleteMarkers].filter((entry) => entry?.IsLatest === true);
  if (latest.length === 0 && versions.length === 0 && deleteMarkers.length === 0) return null;
  assert.equal(latest.length, 1, "successor scope has no unique latest object version");
  assert.equal(deleteMarkers.includes(latest[0]), false, "successor scope latest object is a delete marker");
  assert.match(latest[0].VersionId ?? "", VERSION_ID, "successor scope VersionId is invalid");
  const head = await aws.headObject({
    bucket: bindings.bucket,
    key,
    versionId: latest[0].VersionId,
    expectedOwner: bindings.accountId,
  });
  const sha = head?.Metadata?.["artifact-sha256"];
  const etag = head?.ETag;
  assert.match(sha ?? "", SHA256, "successor scope object digest is invalid");
  assert.match(etag ?? "", /^"[0-9a-f]{32}(?:-[1-9][0-9]*)?"$/u,
    "successor scope object ETag is invalid");
  assert.equal(head?.Metadata?.["artifact-kind"], expectedKind, "successor scope object kind differs");
  return Object.freeze({
    kind: expectedKind,
    key,
    version_id: latest[0].VersionId,
    sha256: sha,
    bytes: Number(head.ContentLength),
    etag,
  });
}

async function verifySuccessorPredecessorControl({
  aws,
  bindings,
  release,
  rollback,
  privateKey,
  now,
}) {
  assert.ok(aws?.listObjectVersions && aws?.getObjectBody,
    "successor predecessor-control adapter is incomplete");
  const channelKey = amicInternalChannelScopeKey(release);
  const baselineKey = amicInternalBaselineScopeKey(release);
  const channelRef = await latestScopedObjectRef({
    aws,
    bindings,
    key: channelKey,
    expectedKind: "channel_pointer",
  });
  const baselineRef = channelRef ? null : await latestScopedObjectRef({
    aws,
    bindings,
    key: baselineKey,
    expectedKind: "baseline_marker",
  });
  const controlKind = channelRef ? "channel" : "baseline";
  const controlRef = channelRef ?? baselineRef;
  assert.ok(controlRef, "successor scope has no established predecessor control");
  const controlBytes = await readHistoricalObject({
    aws,
    bindings,
    ref: {
      kind: controlRef.kind,
      key: controlRef.key,
      version_id: controlRef.version_id,
      sha256: controlRef.sha256,
      bytes: controlRef.bytes,
    },
    expectedKind: controlRef.kind,
    retainThrough: Date.parse(rollback.expiresAt),
    label: `${controlKind} predecessor control`,
  });
  const envelope = exactObject(
    parseCanonicalJsonBytes(controlBytes, `${controlKind} predecessor control`),
    PREDECESSOR_ENVELOPE_FIELDS[controlKind],
    `${controlKind} predecessor control`,
  );
  assert.equal(
    envelope.schema_version,
    controlKind === "baseline"
      ? AMIC_INTERNAL_BASELINE_ENVELOPE_SCHEMA
      : AMIC_INTERNAL_CHANNEL_ENVELOPE_SCHEMA,
  );
  assert.equal(envelope.key_id, release.keyId);
  assert.equal(envelope.public_release_allowed, false);
  if (controlKind === "baseline") {
    assert.equal(envelope.baseline_marker_written_after_all_object_readbacks, true);
    assert.equal(envelope.channel_pointer_published, false);
    assert.equal(envelope.rollback_authorization_published, false);
    assert.equal(envelope.runtime_discoverable, false);
  } else {
    assert.equal(envelope.channel_pointer_moved_after_all_object_readbacks, true);
  }
  const documentBytes = decodeCanonicalBase64(envelope.document_base64, `${controlKind} predecessor document`);
  const signatureBytes = decodeCanonicalBase64(envelope.signature_base64, `${controlKind} predecessor signature`);
  assert.equal(digestBytes(documentBytes), envelope.document_sha256);
  assert.equal(digestBytes(signatureBytes), envelope.signature_sha256);
  const publicKey = createPublicKey(privateKey);
  assert.equal(
    signatureBytes.byteLength === 64 && verifyBytes(null, documentBytes, publicKey, signatureBytes),
    true,
    `${controlKind} predecessor signature is invalid`,
  );
  const document = exactObject(
    parseCanonicalJsonBytes(documentBytes, `${controlKind} predecessor document`),
    PREDECESSOR_DOCUMENT_FIELDS[controlKind],
    `${controlKind} predecessor document`,
  );
  assert.equal(document.schema_version, controlKind === "baseline"
    ? AMIC_INTERNAL_BASELINE_DOCUMENT_SCHEMA
    : AMIC_INTERNAL_CHANNEL_DOCUMENT_SCHEMA);
  assert.equal(document.channel, INTERNAL_UNSIGNED_UPDATE_CHANNEL);
  assert.equal(document.lawos_tenant_id, release.lawosTenantId);
  assert.equal(document.installation_id, release.installationId);
  assert.equal(document.app_id, release.appId);
  assert.equal(document.key_id, release.keyId);
  assert.equal(document.platform, release.platform);
  assert.equal(document.architecture, release.architecture);
  assert.equal(document.release_id, release.predecessor.releaseId);
  assert.equal(document.version, release.predecessor.version);
  assert.equal(document.source_sha, release.predecessor.sourceSha);
  assert.equal(document.source_tree, release.predecessor.sourceTree);
  assert.equal(new Date(document.generated_at).toISOString(), document.generated_at,
    "predecessor control generated_at is invalid");
  assert.equal(new Date(document.expires_at).toISOString(), document.expires_at,
    "predecessor control expires_at is invalid");
  assert.ok(Date.parse(document.generated_at) <= now,
    "predecessor control is not active yet");
  assert.ok(Date.parse(document.expires_at) > Date.parse(document.generated_at)
      && Date.parse(document.expires_at) - Date.parse(document.generated_at)
        <= 31 * 24 * 60 * 60 * 1000,
  "predecessor control validity window is invalid");
  const updateMetadataRef = assertHistoricalObjectRef(
    document.update_metadata,
    "update_metadata",
    "predecessor update metadata",
  );
  const updateSignatureRef = assertHistoricalObjectRef(
    document.update_metadata_signature,
    "update_metadata_signature",
    "predecessor update metadata signature",
  );
  const [metadataBytes, metadataSignature] = await Promise.all([
    readHistoricalObject({
      aws,
      bindings,
      ref: updateMetadataRef,
      expectedKind: "update_metadata",
      retainThrough: Date.parse(rollback.expiresAt),
      label: "predecessor update metadata",
    }),
    readHistoricalObject({
      aws,
      bindings,
      ref: updateSignatureRef,
      expectedKind: "update_metadata_signature",
      retainThrough: Date.parse(rollback.expiresAt),
      label: "predecessor update metadata signature",
    }),
  ]);
  const verified = verifyAndParseUpdateMetadataBytes({
    metadataBytes,
    signatureBytes: metadataSignature,
    trustedKeyId: release.keyId,
    trustedPublicKeys: { [release.keyId]: publicKey },
  });
  assert.equal(verified.valid, true, `predecessor update metadata failed: ${verified.reason}`);
  assert.deepEqual(
    rollbackTargetIdentity(verified.metadata),
    rollbackTargetIdentity(rollback.targetMetadata),
    "rollback target identity is not the active predecessor",
  );
  assert.ok(Date.parse(verified.metadata.generatedAt) <= now,
    "predecessor update metadata is not active yet");
  assert.ok(Date.parse(rollback.targetMetadata.generatedAt) <= now,
    "renewed rollback target metadata is not active yet");
  assert.ok(Date.parse(rollback.targetMetadata.expiresAt) > now,
    "renewed rollback target metadata is expired");
  assert.ok(
    Date.parse(rollback.targetMetadata.generatedAt) >= Date.parse(verified.metadata.generatedAt),
    "renewed rollback target metadata regressed its issue time",
  );

  let predecessorRevocations = null;
  if (controlKind === "channel") {
    const revocationsRef = assertHistoricalObjectRef(
      document.revocations,
      "revocations",
      "predecessor revocations",
    );
    const revocationsSignatureRef = assertHistoricalObjectRef(
      document.revocations_signature,
      "revocations_signature",
      "predecessor revocations signature",
    );
    const [revocationBytes, revocationSignatureBytes] = await Promise.all([
      readHistoricalObject({
        aws,
        bindings,
        ref: revocationsRef,
        expectedKind: "revocations",
        retainThrough: Date.parse(rollback.expiresAt),
        label: "predecessor revocations",
      }),
      readHistoricalObject({
        aws,
        bindings,
        ref: revocationsSignatureRef,
        expectedKind: "revocations_signature",
        retainThrough: Date.parse(rollback.expiresAt),
        label: "predecessor revocations signature",
      }),
    ]);
    const verifiedRevocations = verifyAndParseInternalUnsignedRevocationsBytes({
      revocationBytes,
      signatureBytes: revocationSignatureBytes,
      trustedKeyId: release.keyId,
      trustedPublicKeys: { [release.keyId]: publicKey },
    });
    assert.equal(verifiedRevocations.valid, true,
      `predecessor revocations failed: ${verifiedRevocations.reason}`);
    assert.equal(verifiedRevocations.revocations.lawosTenantId, release.lawosTenantId,
      "predecessor revocation tenant differs");
    assert.equal(verifiedRevocations.revocations.appId, release.appId,
      "predecessor revocation app differs");
    assert.ok(Date.parse(verifiedRevocations.revocations.generatedAt) <= now,
      "predecessor revocations are not active yet");
    predecessorRevocations = verifiedRevocations.revocations;
  }
  return Object.freeze({
    control_kind: controlKind,
    control_etag: controlRef.etag,
    predecessor_revocations: predecessorRevocations,
    rollback_target_metadata_renewed:
      verified.metadataSha256 !== rollback.targetMetadataSha256,
    verified: true,
  });
}

export async function verifyAmicInternalRollbackTargetArtifact({
  aws,
  bindings,
  rollback,
  now = Date.now(),
} = {}) {
  assert.ok(aws?.headObject && aws?.getObject, "rollback target readback adapter is incomplete");
  const target = assertInternalUnsignedRollbackDocument(rollback).targetMetadata;
  assert.ok(Date.parse(rollback.generatedAt) <= now, "rollback authorization is not active yet");
  assert.ok(Date.parse(rollback.expiresAt) > now, "rollback authorization is expired");
  assert.ok(Date.parse(target.generatedAt) <= now,
    "rollback target metadata is not active yet");
  assert.ok(Date.parse(target.expiresAt) > now,
    "rollback target metadata is expired");
  const expectedMetadata = {
    "artifact-sha256": target.artifactSha256,
    "artifact-kind": "installer",
    "source-sha": target.sourceSha,
    "source-tree": target.sourceTree,
    "release-id": target.releaseId,
  };
  const validate = (response, label) => {
    assert.equal(response?.VersionId, target.artifactVersionId, `${label} VersionId differs`);
    assert.equal(Number(response?.ContentLength), target.artifactBytes, `${label} byte count differs`);
    assert.equal(response?.ServerSideEncryption, "aws:kms", `${label} encryption differs`);
    assert.equal(response?.SSEKMSKeyId, bindings.kmsKeyArn, `${label} KMS key differs`);
    assert.equal(
      response?.ChecksumSHA256,
      Buffer.from(target.artifactSha256, "hex").toString("base64"),
      `${label} provider checksum differs`,
    );
    assert.equal(response?.ObjectLockMode, "COMPLIANCE", `${label} Object Lock mode differs`);
    const retainedUntil = Date.parse(response?.ObjectLockRetainUntilDate);
    assert.ok(
      Number.isFinite(retainedUntil) && retainedUntil >= Date.parse(rollback.expiresAt),
      `${label} retention expires before the rollback authorization`,
    );
    assert.deepEqual(response?.Metadata, expectedMetadata, `${label} metadata differs`);
  };
  const request = {
    bucket: bindings.bucket,
    key: target.artifactObjectKey,
    versionId: target.artifactVersionId,
    expectedOwner: bindings.accountId,
  };
  const head = await aws.headObject(request);
  validate(head, "rollback target HEAD");
  const get = await aws.getObject(request);
  validate(get, "rollback target GET");
  assert.equal(get.body_bytes, target.artifactBytes, "rollback target GET byte count differs");
  assert.equal(get.body_sha256, target.artifactSha256, "rollback target GET digest differs");
  return Object.freeze({
    artifact_sha256: target.artifactSha256,
    artifact_bytes: target.artifactBytes,
    exact_head_readback: true,
    exact_get_readback: true,
  });
}

async function uploadExact({
  aws,
  bindings,
  release,
  record,
  key = contentAddressedKey(release, record),
  ifMatch = null,
  ifNoneMatch = null,
}) {
  const checksumSha256 = Buffer.from(record.sha256, "hex").toString("base64");
  const metadata = {
    "artifact-sha256": record.sha256,
    "artifact-kind": record.kind,
    "source-sha": release.sourceSha,
    "source-tree": release.sourceTree,
    "release-id": release.releaseId,
  };
  const upload = await aws.putObject({
    bucket: bindings.bucket,
    key,
    bodyPath: record.path,
    byteSize: record.bytes,
    contentType: record.content_type,
    checksumSha256,
    kmsKeyArn: bindings.kmsKeyArn,
    retainUntil: bindings.retainUntil,
    expectedOwner: bindings.accountId,
    metadata,
    ifMatch,
    ifNoneMatch,
  });
  assert.match(upload?.VersionId ?? "", VERSION_ID, `${record.kind} upload returned no VersionId`);
  assert.notEqual(upload.VersionId, "null", `${record.kind} upload VersionId is not immutable`);
  const head = await aws.headObject({
    bucket: bindings.bucket,
    key,
    versionId: upload.VersionId,
    expectedOwner: bindings.accountId,
  });
  validateProviderReadback({
    response: head,
    expected: record,
    versionId: upload.VersionId,
    bindings,
    label: `${record.kind} HEAD`,
  });
  assert.deepEqual(head.Metadata, metadata, `${record.kind} HEAD metadata differs`);
  const get = await aws.getObject({
    bucket: bindings.bucket,
    key,
    versionId: upload.VersionId,
    expectedOwner: bindings.accountId,
  });
  validateProviderReadback({
    response: get,
    expected: record,
    versionId: upload.VersionId,
    bindings,
    label: `${record.kind} GET`,
  });
  assert.deepEqual(get.Metadata, metadata, `${record.kind} GET metadata differs`);
  assert.equal(get.body_bytes, record.bytes, `${record.kind} GET byte count differs`);
  assert.equal(get.body_sha256, record.sha256, `${record.kind} GET digest differs`);
  return Object.freeze({
    kind: record.kind,
    filename: record.filename,
    content_type: record.content_type,
    sha256: record.sha256,
    bytes: record.bytes,
    key,
    version_id: upload.VersionId,
    exact_head_readback: true,
    exact_get_readback: true,
  });
}

function safeObjectRef(object) {
  return Object.freeze({
    kind: object.kind,
    key: object.key,
    version_id: object.version_id,
    sha256: object.sha256,
    bytes: object.bytes,
  });
}

export function amicInternalChannelScopeKey(release) {
  const tenant = digestBytes(Buffer.from(release.lawosTenantId)).slice(0, 32);
  const installation = digestBytes(Buffer.from(release.installationId)).slice(0, 32);
  return `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}channel/${tenant}/${installation}/win32/x64/current.json`;
}

export function amicInternalBaselineScopeKey(release) {
  const tenant = digestBytes(Buffer.from(release.lawosTenantId)).slice(0, 32);
  const installation = digestBytes(Buffer.from(release.installationId)).slice(0, 32);
  return `${AMIC_INTERNAL_DISTRIBUTION_PREFIX}baseline/${tenant}/${installation}/win32/x64/established.json`;
}

export function amicInternalManagedBootstrapScopeKey(release) {
  assert.match(release?.lawosTenantId ?? "", IDENTIFIER, "bootstrap tenant id is invalid");
  assert.match(release?.releaseId ?? "", IDENTIFIER, "bootstrap release id is invalid");
  const tenant = digestBytes(Buffer.from(release.lawosTenantId)).slice(0, 32);
  const packageId = digestBytes(Buffer.from(release.releaseId)).slice(0, 32);
  return `${AMIC_INTERNAL_MANAGED_BOOTSTRAP_PREFIX}${tenant}/${packageId}/win32/x64/prepared.json`;
}

async function assertManagedBootstrapIsUnpublished({ aws, bindings, release }) {
  assert.equal(typeof aws?.listObjectVersions, "function", "bootstrap scope-list adapter is incomplete");
  const key = amicInternalManagedBootstrapScopeKey(release);
  const history = await aws.listObjectVersions({
    bucket: bindings.bucket, prefix: key, expectedOwner: bindings.accountId,
  });
  assert.ok(history && typeof history === "object" && !Array.isArray(history), "bootstrap history is invalid");
  assert.notEqual(history?.IsTruncated, true, "bootstrap history is incomplete");
  assert.equal(history?.NextToken, undefined, "bootstrap history is incomplete");
  for (const field of ["Versions", "DeleteMarkers"]) {
    assert.ok(history?.[field] === undefined || Array.isArray(history[field]), "bootstrap history is invalid");
    assert.equal((history?.[field] ?? []).length, 0, "bootstrap package already has immutable history");
  }
}

async function assertBaselineScopeIsUninitialized({ aws, bindings, release }) {
  assert.equal(typeof aws?.listObjectVersions, "function", "baseline scope-list adapter is incomplete");
  const keys = [amicInternalChannelScopeKey(release), amicInternalBaselineScopeKey(release)];
  for (const key of keys) {
    const response = await aws.listObjectVersions({
      bucket: bindings.bucket,
      prefix: key,
      expectedOwner: bindings.accountId,
    });
    const entries = [
      ...(Array.isArray(response?.Versions) ? response.Versions : []),
      ...(Array.isArray(response?.DeleteMarkers) ? response.DeleteMarkers : []),
    ];
    assert.equal(entries.every((entry) => entry?.Key === key), true, "baseline scope listing escaped its exact key");
    assert.equal(entries.length, 0, `baseline scope already has immutable history: ${key}`);
  }
  return true;
}

export async function executeAmicInternalDistributionPublication(options) {
  return executePublication(options);
}

export async function executeAmicInternalManagedBootstrapAdoption({
  aws, bindings, adoption, authority, privateKey, trustedPublicKey,
  expectedPublicKeySha256, cloudFrontDomain, now = Date.now(),
} = {}) {
  const { assertVerifiedAmicInternalBaselineAdoption } = await import("./amic-os-internal-baseline-adoption.mjs");
  const approved = assertVerifiedAmicInternalBaselineAdoption(adoption, { now });
  const { readAmicInternalManagedBootstrapArtifacts } = await import("./amic-os-internal-distribution-readback.mjs");
  assert.equal(bindings.retainUntil, approved.request.retention.controlRetainUntil);
  const source = await readAmicInternalManagedBootstrapArtifacts({
    aws, bindings: { ...bindings, retainUntil: approved.request.retention.bootstrapRetainUntil }, bootstrapMarker: approved.request.bootstrapMarker,
    expectedRelease: approved.request.bootstrapRelease, trustedPublicKey,
    expectedPublicKeySha256, cloudFrontDomain, now,
  });
  assert.equal(source.artifacts.installer.sha256, approved.installation.installer_sha256);
  assert.equal(source.artifacts.installer.bytes, approved.installation.installer_bytes);
  assert.equal(source.artifacts.installer.version_id, approved.installation.installer_version_id);
  const release = {
    ...approved.request.bootstrapRelease,
    installationId: approved.installation.installation_id,
    predecessor: Object.fromEntries(["releaseId", "version", "sourceSha", "sourceTree"]
      .map((key) => [key, approved.request.bootstrapRelease[key]])),
  };
  const signingKey = privateKey?.type === "private" ? privateKey : createPrivateKey(privateKey);
  assert.equal(digestBytes(createPublicKey(signingKey).export({ type: "spki", format: "der" })),
    expectedPublicKeySha256, "adoption signing key is not the pinned bootstrap key");
  // A current server read must agree with the owner-approved lease and state immediately before writing.
  await approved.assertCurrent(authority);
  const root = await mkdtemp(join(tmpdir(), "amic-os-bootstrap-adoption-"));
  try {
    const names = { installer: `AMIC-OS-internal-${release.version}-win-x64.exe`,
      build_manifest: "matter-build-manifest.json", sbom: "sbom.cdx.json", provenance: "provenance.json" };
    const artifactPaths = {};
    for (const [kind, body] of Object.entries(source.artifactBodies)) {
      artifactPaths[kind] = join(root, names[kind]);
      await writeFile(artifactPaths[kind], body, { flag: "wx", mode: 0o600, flush: true });
    }
    const receipt = await executePublication({ aws, bindings, release, artifactPaths,
      privateKey: signingKey, publicationMode: "baseline", now }, source.artifacts, () => approved.assertCurrent(authority));
    const { receipt_sha256: _originalDigest, ...material } = receipt;
    const adopted = { ...material, adoption_request_sha256: approved.requestSha256,
      installation_attestation_sha256: approved.attestationSha256,
      owner_approval_sha256: approved.ownerApprovalSha256,
      executor_source_sha: approved.request.executorSourceSha,
      executor_source_tree: approved.request.executorSourceTree,
      managed_bootstrap_marker_sha256: approved.request.bootstrapMarker.sha256,
      reused_artifact_count: 4, new_object_count: 5 };
    return Object.freeze({ ...adopted, receipt_sha256: digestBytes(canonicalBytes(adopted)) });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function executePublication({
  aws,
  bindings,
  release,
  artifactPaths,
  revocations,
  rollback,
  privateKey,
  publicationMode = "successor",
  now = Date.now(),
}, adoptedArtifacts = null, assertAdoptionCurrent = null) {
  assert.ok(aws?.inspectGovernance && aws?.putObject && aws?.headObject && aws?.getObject,
    "AWS distribution adapter is incomplete");
  assert.ok(["baseline", "successor", "managed-bootstrap"].includes(publicationMode), "publication mode is invalid");
  const safeBindings = validateBindings(bindings, now);
  const safeRelease = validateRelease(release, now, publicationMode);
  if (publicationMode !== "successor") {
    assert.equal(revocations, undefined, `${publicationMode} publication cannot include revocations`);
    assert.equal(rollback, undefined, `${publicationMode} publication cannot include rollback authorization`);
  } else {
    assertInternalUnsignedRevocationsDocument(revocations);
    assertInternalUnsignedRollbackDocument(rollback);
    assert.ok(Date.parse(revocations.generatedAt) <= now, "revocation document is not active yet");
    assert.ok(Date.parse(revocations.expiresAt) > now, "revocation document is expired");
    assert.equal(revocations.lawosTenantId, safeRelease.lawosTenantId, "revocation tenant differs");
    assert.equal(revocations.appId, safeRelease.appId, "revocation app differs");
    assert.equal(revocations.keyId, safeRelease.keyId, "revocation key differs");
    assert.equal(rollback.fromReleaseId, safeRelease.releaseId, "rollback source release differs");
    assert.equal(rollback.fromVersion, safeRelease.version, "rollback source version differs");
    assert.equal(rollback.fromSourceSha, safeRelease.sourceSha, "rollback source SHA differs");
    assert.equal(rollback.fromSourceTree, safeRelease.sourceTree, "rollback source tree differs");
    assert.equal(rollback.lawosTenantId, safeRelease.lawosTenantId, "rollback tenant differs");
    assert.equal(rollback.installationId, safeRelease.installationId, "rollback installation differs");
    assert.equal(rollback.appId, safeRelease.appId, "rollback app differs");
    assert.equal(rollback.keyId, safeRelease.keyId, "rollback key differs");
    assert.equal(rollback.revocationRevision, revocations.revision, "rollback revocation revision differs");
    assert.equal(rollback.targetReleaseId, safeRelease.predecessor.releaseId, "rollback target release differs");
    assert.equal(rollback.targetVersion, safeRelease.predecessor.version, "rollback target version differs");
    assert.equal(rollback.targetSourceSha, safeRelease.predecessor.sourceSha, "rollback target SHA differs");
    assert.equal(rollback.targetSourceTree, safeRelease.predecessor.sourceTree, "rollback target tree differs");
  }
  const signingKey = privateKey?.type === "private" ? privateKey : createPrivateKey(privateKey);
  assert.equal(signingKey.asymmetricKeyType, "ed25519", "metadata signing key must be Ed25519");
  assert.deepEqual(Object.keys(artifactPaths ?? {}).sort(), [
    "build_manifest",
    "installer",
    "provenance",
    "sbom",
  ]);
  const governance = await aws.inspectGovernance({
    account_id: safeBindings.accountId,
    region: safeBindings.region,
    bucket: safeBindings.bucket,
    kms_key_arn: safeBindings.kmsKeyArn,
    access_log_bucket: safeBindings.accessLogBucket,
  });
  validateGovernance(governance, safeBindings);
  let predecessorControl = null;
  if (publicationMode === "managed-bootstrap") {
    await assertManagedBootstrapIsUnpublished({ aws, bindings: safeBindings, release: safeRelease });
  } else if (publicationMode === "baseline") {
    await assertBaselineScopeIsUninitialized({ aws, bindings: safeBindings, release: safeRelease });
  } else {
    predecessorControl = await verifySuccessorPredecessorControl({
      aws,
      bindings: safeBindings,
      release: safeRelease,
      rollback,
      privateKey: signingKey,
      now,
    });
    if (predecessorControl.predecessor_revocations) {
      assertRevocationSuperset(revocations, predecessorControl.predecessor_revocations);
    }
    assert.equal(revocations.revokedReleaseIds.includes(safeRelease.releaseId), false,
      "current release cannot be listed as revoked");
    assert.equal(revocations.revokedReleaseIds.includes(rollback.targetReleaseId), false,
      "rollback target release cannot be listed as revoked");
    assert.equal(
      revocations.revokedArtifactSha256s.includes(rollback.targetArtifactSha256),
      false,
      "rollback target artifact cannot be listed as revoked",
    );
    await verifyAmicInternalRollbackTargetArtifact({
      aws,
      bindings: safeBindings,
      rollback,
      now,
    });
  }

  const generatedRoot = await mkdtemp(join(tmpdir(), "amic-os-internal-publication-"));
  try {
    const sourceRecords = {};
    for (const kind of ["installer", "build_manifest", "sbom", "provenance"]) {
      sourceRecords[kind] = await fileRecord(artifactPaths[kind], kind);
    }
    assert.equal(
      sourceRecords.installer.filename,
      `AMIC-OS-internal-${safeRelease.version}-win-x64.exe`,
      "installer filename is not the internal-unsigned identity",
    );
    const buildManifest = validateDesktopBuildManifest(
      JSON.parse(await readFile(sourceRecords.build_manifest.path, "utf8")),
    );
    assert.equal(buildManifest.source_sha, safeRelease.sourceSha, "build manifest source SHA differs");
    assert.equal(buildManifest.source_tree, safeRelease.sourceTree, "build manifest source tree differs");
    assert.equal(buildManifest.source_dirty, false, "build manifest source is dirty");
    assert.equal(buildManifest.version, safeRelease.version, "build manifest version differs");
    assert.equal(buildManifest.platform, "win32", "build manifest platform differs");
    assert.equal(buildManifest.arch, "x64", "build manifest architecture differs");
    assert.equal(buildManifest.app_id, safeRelease.appId, "build manifest app identity differs");
    const sbom = JSON.parse(await readFile(sourceRecords.sbom.path, "utf8"));
    assert.equal(sbom.bomFormat, "CycloneDX", "SBOM is not CycloneDX");
    const [sbomMajor, sbomMinor] = String(sbom.specVersion ?? "").split(".").map(Number);
    assert.ok(sbomMajor === 1 && Number.isInteger(sbomMinor) && sbomMinor >= 5,
      "SBOM spec is older than 1.5");
    assert.ok(Array.isArray(sbom.components) && sbom.components.length > 0,
      "SBOM components are missing");
    const sbomProperties = sbomPropertyMap(sbom);
    const expectedSbomProperties = {
      "law-firm-os:app-id": safeRelease.appId,
      "law-firm-os:authenticode-status": "not_signed",
      "law-firm-os:credentials-included": "false",
      "law-firm-os:distribution": "private",
      "law-firm-os:installer-bytes": String(sourceRecords.installer.bytes),
      "law-firm-os:installer-sha256": sourceRecords.installer.sha256,
      "law-firm-os:internal-unsigned-privacy-audit": "true",
      "law-firm-os:public-release-allowed": "false",
      "law-firm-os:real-contact-seed-included": "false",
      "law-firm-os:real-photo-seed-included": "false",
      "law-firm-os:real-registration-seed-included": "false",
      "law-firm-os:source-sha": safeRelease.sourceSha,
      "law-firm-os:source-tree": safeRelease.sourceTree,
      "law-firm-os:version": safeRelease.version,
    };
    for (const [name, value] of Object.entries(expectedSbomProperties)) {
      assert.equal(sbomProperties[name], value, `SBOM protected binding differs: ${name}`);
    }
    const installerComponent = sbom.components.filter(
      (component) => component?.["bom-ref"] === `urn:sha256:${sourceRecords.installer.sha256}`,
    );
    assert.equal(installerComponent.length, 1, "SBOM exact installer component is missing or duplicated");
    assert.equal(installerComponent[0].type, "file");
    assert.deepEqual(installerComponent[0].hashes, [{
      alg: "SHA-256",
      content: sourceRecords.installer.sha256.toUpperCase(),
    }]);
    const provenance = JSON.parse(await readFile(sourceRecords.provenance.path, "utf8"));
    validateProvenance({ provenance, release: safeRelease, sourceRecords, now });
    if (publicationMode === "successor") {
      assert.equal(
        revocations.revokedArtifactSha256s.includes(sourceRecords.installer.sha256),
        false,
        "current installer cannot be listed as revoked",
      );
    }

    if (assertAdoptionCurrent) await assertAdoptionCurrent();
    const uploaded = {};
    for (const kind of ["installer", "build_manifest", "sbom", "provenance"]) {
      if (adoptedArtifacts) {
        const ref = adoptedArtifacts[kind];
        assert.equal(ref.sha256, sourceRecords[kind].sha256, "adopted artifact body changed");
        assert.equal(ref.bytes, sourceRecords[kind].bytes, "adopted artifact length changed");
        uploaded[kind] = { ...ref, filename: sourceRecords[kind].filename };
      } else {
        uploaded[kind] = await uploadExact({
          aws, bindings: safeBindings, release: safeRelease, record: sourceRecords[kind],
        });
      }
    }

    const releaseManifest = {
      schema_version: publicationMode === "managed-bootstrap"
        ? AMIC_INTERNAL_MANAGED_BOOTSTRAP_MANIFEST_SCHEMA
        : AMIC_INTERNAL_RELEASE_MANIFEST_SCHEMA,
      release_id: safeRelease.releaseId,
      release_sequence: safeRelease.releaseSequence,
      version: safeRelease.version,
      channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
      lawos_tenant_id: safeRelease.lawosTenantId,
      app_id: safeRelease.appId,
      platform: safeRelease.platform,
      architecture: safeRelease.architecture,
      source_sha: safeRelease.sourceSha,
      source_tree: safeRelease.sourceTree,
      ...(publicationMode === "managed-bootstrap" ? {
        ...AMIC_INTERNAL_MANAGED_BOOTSTRAP_BOUNDARIES,
        key_id: safeRelease.keyId,
      } : {
        installation_id: safeRelease.installationId,
        predecessor: {
          release_id: safeRelease.predecessor.releaseId,
          version: safeRelease.predecessor.version,
          source_sha: safeRelease.predecessor.sourceSha,
          source_tree: safeRelease.predecessor.sourceTree,
        },
      }),
      generated_at: safeRelease.generatedAt,
      expires_at: safeRelease.expiresAt,
      artifacts: Object.fromEntries(Object.entries(uploaded).map(([kind, value]) => [
        kind,
        safeObjectRef(value),
      ])),
      authenticode_status: "not_signed",
      distribution: "private",
      managed_device_only: true,
      public_release_allowed: false,
      real_contact_seed_included: false,
      real_photo_seed_included: false,
      real_registration_seed_included: false,
      credentials_included: false,
    };
    const releaseSigned = signedDocument(
      releaseManifest,
      signingKey,
      "release_manifest",
      publicationMode === "managed-bootstrap" ? "managed-bootstrap-manifest.json" : "release-manifest.json",
      "release_manifest_signature",
      publicationMode === "managed-bootstrap" ? "managed-bootstrap-manifest.sig" : "release-manifest.sig",
    );
    for (const [kind, source] of Object.entries(releaseSigned)) {
      const record = await materializeGeneratedRecord(generatedRoot, source);
      uploaded[record.kind] = await uploadExact({
        aws,
        bindings: safeBindings,
        release: safeRelease,
        record,
      });
    }

    if (publicationMode === "managed-bootstrap") {
      const envelope = {
        schema_version: AMIC_INTERNAL_MANAGED_BOOTSTRAP_ENVELOPE_SCHEMA,
        ...AMIC_INTERNAL_MANAGED_BOOTSTRAP_BOUNDARIES,
        key_id: safeRelease.keyId,
        document_base64: releaseSigned.document.body.toString("base64"),
        signature_base64: releaseSigned.signature.body.toString("base64"),
        document_object: safeObjectRef(uploaded.release_manifest),
        signature_object: safeObjectRef(uploaded.release_manifest_signature),
        bootstrap_marker_written_after_all_object_readbacks: true,
      };
      const record = await materializeGeneratedRecord(generatedRoot,
        generatedRecord("managed_bootstrap_marker", "prepared.json", canonicalBytes(envelope)));
      const marker = await uploadExact({
        aws, bindings: safeBindings, release: safeRelease, record,
        key: amicInternalManagedBootstrapScopeKey(safeRelease), ifNoneMatch: "*",
      });
      uploaded.managed_bootstrap_marker = marker;
      const receipt = {
        schema_version: AMIC_INTERNAL_MANAGED_BOOTSTRAP_RECEIPT_SCHEMA,
        state: "PASS",
        ...AMIC_INTERNAL_MANAGED_BOOTSTRAP_BOUNDARIES,
        release_id: safeRelease.releaseId,
        release_sequence: safeRelease.releaseSequence,
        version: safeRelease.version,
        source_sha: safeRelease.sourceSha,
        source_tree: safeRelease.sourceTree,
        managed_bootstrap_marker: safeObjectRef(marker),
        object_count: Object.keys(uploaded).length,
        objects: Object.fromEntries(Object.entries(uploaded).map(([kind, value]) => [kind, safeObjectRef(value)])),
        exact_head_readback_complete: true,
        exact_get_readback_complete: true,
        authenticode_status: "not_signed",
        private_distribution: true,
        public_installer_uploaded: false,
        github_release_installer_asset_allowed: false,
        raw_secret_included: false,
      };
      return Object.freeze({ ...receipt, receipt_sha256: digestBytes(canonicalBytes(receipt)) });
    }

    const updateMetadata = {
      schemaVersion: "law-firm-os.matter-desktop-internal-unsigned-update.v2",
      releaseId: safeRelease.releaseId,
      version: safeRelease.version,
      channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
      lawosTenantId: safeRelease.lawosTenantId,
      installationId: safeRelease.installationId,
      appId: safeRelease.appId,
      keyId: safeRelease.keyId,
      sourceSha: safeRelease.sourceSha,
      sourceTree: safeRelease.sourceTree,
      predecessorReleaseId: safeRelease.predecessor.releaseId,
      predecessorVersion: safeRelease.predecessor.version,
      predecessorSourceSha: safeRelease.predecessor.sourceSha,
      predecessorSourceTree: safeRelease.predecessor.sourceTree,
      releaseSequence: safeRelease.releaseSequence,
      platform: safeRelease.platform,
      architecture: safeRelease.architecture,
      artifactFilename: uploaded.installer.filename,
      artifactObjectKey: uploaded.installer.key,
      artifactSha256: uploaded.installer.sha256,
      artifactBytes: uploaded.installer.bytes,
      artifactVersionId: uploaded.installer.version_id,
      releaseManifestSha256: uploaded.release_manifest.sha256,
      authenticodeStatus: "not_signed",
      distribution: "private",
      managedDeviceOnly: true,
      publicReleaseAllowed: false,
      generatedAt: safeRelease.generatedAt,
      expiresAt: safeRelease.expiresAt,
    };
    const updateSigned = signUpdateMetadataBytes(updateMetadata, signingKey);
    const updateRecords = [
      generatedRecord("update_metadata", "update-metadata.json", updateSigned.metadataBytes),
      generatedRecord("update_metadata_signature", "update-metadata.sig", updateSigned.signatureBytes),
    ];
    for (const source of updateRecords) {
      const record = await materializeGeneratedRecord(generatedRoot, source);
      uploaded[record.kind] = await uploadExact({ aws, bindings: safeBindings, release: safeRelease, record });
    }

    if (publicationMode === "baseline") {
      const baselineDocument = {
        schema_version: AMIC_INTERNAL_BASELINE_DOCUMENT_SCHEMA,
        publication_mode: "baseline",
        channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
        lawos_tenant_id: safeRelease.lawosTenantId,
        installation_id: safeRelease.installationId,
        app_id: safeRelease.appId,
        key_id: safeRelease.keyId,
        platform: safeRelease.platform,
        architecture: safeRelease.architecture,
        release_id: safeRelease.releaseId,
        release_sequence: safeRelease.releaseSequence,
        version: safeRelease.version,
        source_sha: safeRelease.sourceSha,
        source_tree: safeRelease.sourceTree,
        generated_at: safeRelease.generatedAt,
        expires_at: safeRelease.expiresAt,
        release_manifest: safeObjectRef(uploaded.release_manifest),
        release_manifest_signature: safeObjectRef(uploaded.release_manifest_signature),
        update_metadata: safeObjectRef(uploaded.update_metadata),
        update_metadata_signature: safeObjectRef(uploaded.update_metadata_signature),
        channel_pointer_published: false,
        rollback_authorization_published: false,
        runtime_discoverable: false,
        public_release_allowed: false,
      };
      const baselineBytes = canonicalBytes(baselineDocument);
      const baselineSignature = signBytes(null, baselineBytes, signingKey);
      const baselineEnvelope = {
        schema_version: AMIC_INTERNAL_BASELINE_ENVELOPE_SCHEMA,
        key_id: safeRelease.keyId,
        document_base64: baselineBytes.toString("base64"),
        signature_base64: baselineSignature.toString("base64"),
        document_sha256: digestBytes(baselineBytes),
        signature_sha256: digestBytes(baselineSignature),
        baseline_marker_written_after_all_object_readbacks: true,
        channel_pointer_published: false,
        rollback_authorization_published: false,
        runtime_discoverable: false,
        public_release_allowed: false,
      };
      const markerSource = generatedRecord(
        "baseline_marker",
        "established.json",
        canonicalBytes(baselineEnvelope),
      );
      const markerRecord = await materializeGeneratedRecord(generatedRoot, markerSource);
      if (assertAdoptionCurrent) await assertAdoptionCurrent();
      const baselineMarker = await uploadExact({
        aws,
        bindings: safeBindings,
        release: safeRelease,
        record: markerRecord,
        key: amicInternalBaselineScopeKey(safeRelease),
        ifNoneMatch: "*",
      });
      uploaded.baseline_marker = baselineMarker;
      const receipt = {
        schema_version: AMIC_INTERNAL_BASELINE_PUBLICATION_RECEIPT_SCHEMA,
        state: "PASS",
        publication_mode: "baseline",
        release_id: safeRelease.releaseId,
        release_sequence: safeRelease.releaseSequence,
        version: safeRelease.version,
        source_sha: safeRelease.sourceSha,
        source_tree: safeRelease.sourceTree,
        baseline_marker: safeObjectRef(baselineMarker),
        object_count: Object.keys(uploaded).length,
        objects: Object.fromEntries(
          Object.entries(uploaded).map(([kind, value]) => [kind, safeObjectRef(value)]),
        ),
        exact_head_readback_complete: true,
        exact_get_readback_complete: true,
        channel_history_absent_before_publication: true,
        channel_pointer_published: false,
        rollback_authorization_published: false,
        runtime_discoverable: false,
        authenticode_status: "not_signed",
        private_distribution: true,
        public_installer_uploaded: false,
        github_release_installer_asset_allowed: false,
        raw_secret_included: false,
      };
      return Object.freeze({
        ...receipt,
        receipt_sha256: digestBytes(canonicalBytes(receipt)),
      });
    }

    const revocationSigned = signInternalUnsignedRevocationsBytes(revocations, signingKey);
    const revocationRecords = [
      generatedRecord("revocations", "revocations.json", revocationSigned.revocationBytes),
      generatedRecord("revocations_signature", "revocations.sig", revocationSigned.signatureBytes),
    ];
    for (const source of revocationRecords) {
      const record = await materializeGeneratedRecord(generatedRoot, source);
      uploaded[record.kind] = await uploadExact({ aws, bindings: safeBindings, release: safeRelease, record });
    }

    const rollbackSigned = signInternalUnsignedRollbackBytes(rollback, signingKey);
    const rollbackRecords = [
      generatedRecord("rollback", "rollback.json", rollbackSigned.rollbackBytes),
      generatedRecord("rollback_signature", "rollback.sig", rollbackSigned.signatureBytes),
    ];
    for (const source of rollbackRecords) {
      const record = await materializeGeneratedRecord(generatedRoot, source);
      uploaded[record.kind] = await uploadExact({ aws, bindings: safeBindings, release: safeRelease, record });
    }
    const rollbackTargetSigned = signUpdateMetadataBytes(
      rollback.targetMetadata,
      signingKey,
    );
    assert.equal(
      rollbackTargetSigned.metadataSha256,
      rollback.targetMetadataSha256,
      "rollback target metadata hash differs",
    );
    const rollbackTargetRecords = [
      generatedRecord(
        "rollback_target_metadata",
        "rollback-target-update-metadata.json",
        rollbackTargetSigned.metadataBytes,
      ),
      generatedRecord(
        "rollback_target_metadata_signature",
        "rollback-target-update-metadata.sig",
        rollbackTargetSigned.signatureBytes,
      ),
    ];
    for (const source of rollbackTargetRecords) {
      const record = await materializeGeneratedRecord(generatedRoot, source);
      uploaded[record.kind] = await uploadExact({
        aws,
        bindings: safeBindings,
        release: safeRelease,
        record,
      });
    }

    const channelDocument = {
      schema_version: AMIC_INTERNAL_CHANNEL_DOCUMENT_SCHEMA,
      channel: INTERNAL_UNSIGNED_UPDATE_CHANNEL,
      lawos_tenant_id: safeRelease.lawosTenantId,
      installation_id: safeRelease.installationId,
      app_id: safeRelease.appId,
      platform: safeRelease.platform,
      architecture: safeRelease.architecture,
      release_id: safeRelease.releaseId,
      release_sequence: safeRelease.releaseSequence,
      version: safeRelease.version,
      source_sha: safeRelease.sourceSha,
      source_tree: safeRelease.sourceTree,
      key_id: safeRelease.keyId,
      generated_at: safeRelease.generatedAt,
      expires_at: safeRelease.expiresAt,
      release_manifest: safeObjectRef(uploaded.release_manifest),
      release_manifest_signature: safeObjectRef(uploaded.release_manifest_signature),
      update_metadata: safeObjectRef(uploaded.update_metadata),
      update_metadata_signature: safeObjectRef(uploaded.update_metadata_signature),
      revocations: safeObjectRef(uploaded.revocations),
      revocations_signature: safeObjectRef(uploaded.revocations_signature),
      rollback: safeObjectRef(uploaded.rollback),
      rollback_signature: safeObjectRef(uploaded.rollback_signature),
      rollback_target_metadata: safeObjectRef(uploaded.rollback_target_metadata),
      rollback_target_metadata_signature:
        safeObjectRef(uploaded.rollback_target_metadata_signature),
      public_release_allowed: false,
    };
    const channelSigned = signedDocument(
      channelDocument,
      signingKey,
      "channel_document",
      "channel.json",
      "channel_signature",
      "channel.sig",
    );
    for (const source of Object.values(channelSigned)) {
      const record = await materializeGeneratedRecord(generatedRoot, source);
      uploaded[record.kind] = await uploadExact({ aws, bindings: safeBindings, release: safeRelease, record });
    }
    const channelEnvelope = {
      schema_version: AMIC_INTERNAL_CHANNEL_ENVELOPE_SCHEMA,
      key_id: safeRelease.keyId,
      document_base64: channelSigned.document.body.toString("base64"),
      signature_base64: channelSigned.signature.body.toString("base64"),
      document_sha256: channelSigned.document.sha256,
      signature_sha256: channelSigned.signature.sha256,
      document_object: safeObjectRef(uploaded.channel_document),
      signature_object: safeObjectRef(uploaded.channel_signature),
      channel_pointer_moved_after_all_object_readbacks: true,
      public_release_allowed: false,
    };
    const pointerSource = generatedRecord(
      "channel_pointer",
      "current.json",
      canonicalBytes(channelEnvelope),
    );
    const pointerRecord = await materializeGeneratedRecord(generatedRoot, pointerSource);
    const channelPointer = await uploadExact({
      aws,
      bindings: safeBindings,
      release: safeRelease,
      record: pointerRecord,
      key: amicInternalChannelScopeKey(safeRelease),
      ifMatch: predecessorControl.control_kind === "channel"
        ? predecessorControl.control_etag
        : null,
      ifNoneMatch: predecessorControl.control_kind === "baseline" ? "*" : null,
    });
    uploaded.channel_pointer = channelPointer;

    const receipt = {
      schema_version: AMIC_INTERNAL_PUBLICATION_RECEIPT_SCHEMA,
      state: "PASS",
      publication_mode: "successor",
      release_id: safeRelease.releaseId,
      release_sequence: safeRelease.releaseSequence,
      version: safeRelease.version,
      source_sha: safeRelease.sourceSha,
      source_tree: safeRelease.sourceTree,
      channel_pointer: safeObjectRef(channelPointer),
      object_count: Object.keys(uploaded).length,
      objects: Object.fromEntries(Object.entries(uploaded).map(([kind, value]) => [kind, safeObjectRef(value)])),
      exact_head_readback_complete: true,
      exact_get_readback_complete: true,
      rollback_target_artifact_readback_complete: true,
      predecessor_control_kind: predecessorControl.control_kind,
      rollback_target_metadata_renewed:
        predecessorControl.rollback_target_metadata_renewed,
      channel_pointer_moved_last: true,
      authenticode_status: "not_signed",
      private_distribution: true,
      public_installer_uploaded: false,
      github_release_installer_asset_allowed: false,
      raw_secret_included: false,
    };
    return Object.freeze({
      ...receipt,
      receipt_sha256: digestBytes(canonicalBytes(receipt)),
    });
  } finally {
    await rm(generatedRoot, { recursive: true, force: true });
  }
}
