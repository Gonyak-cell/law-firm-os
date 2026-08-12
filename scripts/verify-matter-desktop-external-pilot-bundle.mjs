import assert from "node:assert/strict";
import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { EXTERNAL_PILOT_UPDATE_SCHEMA } from "../apps/desktop/src/main/updates.js";
import {
  TRUST_REGISTRY_SCHEMA_VERSION,
  verifyDetachedReceipt,
} from "./lib/external-release-trust.mjs";
import { resolveExternalPilotTrustRegistry } from "./lib/matter-desktop-external-pilot-trust.mjs";

const SHA256 = /^[0-9a-f]{64}$/u;
const CHECKSUM_LINE = /^([0-9a-f]{64})  ([A-Za-z0-9][A-Za-z0-9._/-]*)$/u;
const RELEASE_SCHEMA = "law-firm-os.matter-desktop-external-pilot-release.v1";
const TENANT_CONFIG_SCHEMA = "law-firm-os.matter-desktop-tenant-config.v1";
const EXTERNAL_RELEASE_RECEIPT_SCHEMA = "law-firm-os.external-release-receipt.v0.2";
const VERIFICATION_CLOSURE_SCHEMA = "law-firm-os.matter-desktop-external-pilot-verification-closure.v1";
const EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE = "macos_external_pilot_publication_approval";
const WINDOWS_BLOCKER = "WINDOWS_AUTHENTICODE_AND_NATIVE_SMOKE_REQUIRED";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function externalPilotBindingSha256(manifest) {
  return sha256(Buffer.from(JSON.stringify({
    pilot_id: manifest.pilot_id,
    lawos_tenant_id: manifest.lawos_tenant_id,
    entra_tenant_id: manifest.entra_tenant_id,
    source_sha: manifest.source_candidate.source_sha,
    source_tree: manifest.source_candidate.source_tree,
    version: manifest.version,
  }), "utf8"));
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function exactKeys(value, keys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} keys must match the schema`);
}

function validateVerificationClosure(closure, label = "verification closure") {
  exactKeys(closure, [
    "schema_version",
    "launcher_sha256",
    "node_executable",
    "node_sha256",
    "prepare_cli_sha256",
    "generator_sha256",
    "verifier_sha256",
    "trust_resolver_sha256",
    "trust_helper_sha256",
    "updates_sha256",
    "release_paths_sha256",
    "provenance_sha256",
  ], label);
  assert.equal(closure.schema_version, VERIFICATION_CLOSURE_SCHEMA);
  assert.equal(isAbsolute(closure.node_executable ?? ""), true, `${label}.node_executable must be absolute`);
  for (const [key, value] of Object.entries(closure)) {
    if (key.endsWith("_sha256")) assert.match(value ?? "", SHA256, `${label}.${key} is invalid`);
  }
  return closure;
}

function checkedRoot(bundleDir) {
  const candidate = resolve(bundleDir);
  assert.equal(existsSync(candidate), true, "external-pilot bundle does not exist");
  assert.equal(lstatSync(candidate).isSymbolicLink(), false, "external-pilot bundle cannot be a symlink");
  const root = realpathSync(candidate);
  assert.equal(statSync(root).isDirectory(), true, "external-pilot bundle must be a directory");
  return root;
}

function checkedPath(root, relativePath) {
  assert.equal(isAbsolute(relativePath), false, `bundle path must be relative: ${relativePath}`);
  const normalized = relativePath.replaceAll("\\", "/");
  assert.equal(normalized, relativePath, `bundle path must use POSIX separators: ${relativePath}`);
  assert.equal(normalized.split("/").includes(".."), false, `bundle path cannot traverse: ${relativePath}`);
  const candidate = resolve(root, normalized);
  const rel = relative(root, candidate);
  assert.equal(rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel), false, `bundle path escapes root: ${relativePath}`);
  assert.equal(existsSync(candidate), true, `bundle file is missing: ${relativePath}`);
  assert.equal(lstatSync(candidate).isSymbolicLink(), false, `bundle file cannot be a symlink: ${relativePath}`);
  assert.equal(statSync(candidate).isFile(), true, `bundle path must be a regular file: ${relativePath}`);
  return candidate;
}

function bundleFiles(root, directory = root) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = resolve(directory, entry.name);
    assert.equal(entry.isSymbolicLink(), false, `bundle cannot contain a symlink: ${relative(root, target)}`);
    if (entry.isDirectory()) files.push(...bundleFiles(root, target));
    else {
      assert.equal(entry.isFile(), true, `bundle cannot contain a special file: ${relative(root, target)}`);
      files.push(relative(root, target).split(sep).join("/"));
    }
  }
  return files;
}

function parseChecksums(source) {
  assert.equal(source.endsWith("\n"), true, "checksums.sha256 must end with a newline");
  const entries = new Map();
  for (const line of source.trimEnd().split("\n")) {
    const match = line.match(CHECKSUM_LINE);
    assert.ok(match, `invalid checksum line: ${line}`);
    const [, digest, relativePath] = match;
    assert.equal(["checksums.sha256", "checksums.sig"].includes(relativePath), false, "checksum list cannot contain itself or its signature");
    assert.equal(entries.has(relativePath), false, `duplicate checksum path: ${relativePath}`);
    entries.set(relativePath, digest);
  }
  return entries;
}

function requiredEntry(entries, relativePath) {
  const digest = entries.get(relativePath);
  assert.match(digest ?? "", SHA256, `missing checksum entry: ${relativePath}`);
  return digest;
}

function verifyDetached(publicKey, bytes, signature, label) {
  assert.equal(signature.length, 64, `${label} signature must be a 64-byte Ed25519 signature`);
  assert.equal(
    verifySignature(null, bytes, publicKey, signature),
    true,
    `${label} Ed25519 signature is invalid`,
  );
}

function canonicalTime(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.equal(new Date(value).toISOString(), value, `${label} must be a canonical ISO timestamp`);
  return Date.parse(value);
}

export function verifyExternalPilotBundle({
  bundleDir,
  expectedKeySha256,
  verificationClosure,
  testOnlyTrustRoot = null,
  now = Date.now(),
}) {
  assert.match(expectedKeySha256 ?? "", SHA256, "expected signing public-key SHA-256 is required");
  validateVerificationClosure(verificationClosure, "trusted launcher verification closure");
  const trustRegistry = resolveExternalPilotTrustRegistry({ testOnlyTrustRoot, now });
  const root = checkedRoot(bundleDir);
  const publicKeyBytes = readFileSync(checkedPath(root, "signing-public-key.pem"));
  const publicKey = createPublicKey(publicKeyBytes);
  assert.equal(publicKey.asymmetricKeyType, "ed25519", "bundle signing key must be Ed25519");
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  assert.equal(sha256(publicKeyDer), expectedKeySha256, "bundle signing key does not match the out-of-band fingerprint");

  const checksumBytes = readFileSync(checkedPath(root, "checksums.sha256"));
  const checksumSignature = readFileSync(checkedPath(root, "checksums.sig"));
  verifyDetached(publicKey, checksumBytes, checksumSignature, "checksum manifest");
  const entries = parseChecksums(checksumBytes.toString("utf8"));
  assert.equal(requiredEntry(entries, "signing-public-key.pem"), sha256(publicKeyBytes));
  const listedBundleFiles = bundleFiles(root);
  assert.equal(
    listedBundleFiles.some((relativePath) => /\.(?:cjs|js|mjs)$/u.test(relativePath)),
    false,
    "release bundle cannot contain executable verifier code",
  );
  assert.deepEqual(
    listedBundleFiles.sort(),
    [...entries.keys(), "checksums.sha256", "checksums.sig"].sort(),
    "bundle contains unsigned or unlisted files",
  );

  for (const [relativePath, expectedDigest] of entries) {
    const bytes = readFileSync(checkedPath(root, relativePath));
    assert.equal(sha256(bytes), expectedDigest, `checksum mismatch: ${relativePath}`);
  }

  const requiredPaths = [
    "release-manifest.json",
    "update-metadata.json",
    "update-metadata.sig",
    "tenant-config.json",
    "tenant-config.sig",
    "sbom.cdx.json",
    "THIRD-PARTY-NOTICES.txt",
    "LICENSES.chromium.html",
    "INSTALL.md",
    "ROLLBACK.md",
    "trusted-verifier-reference.json",
    "approval-receipt.json",
    "approval-receipt.sig",
    "approval-receipt-ref.json",
    "trust-registry-reference.json",
    "macos-artifact-checksums.sha256",
    "macos-artifact-checksums.sig",
    "macos-distribution-receipt.json",
    "macos-distribution-receipt.sig",
    "macos-distribution-receipt-ref.json",
    "WINDOWS-BLOCKER.json",
    "provenance/package-lock.json",
    "provenance/desktop-package.json",
  ];
  requiredPaths.forEach((relativePath) => requiredEntry(entries, relativePath));

  const manifestBytes = readFileSync(checkedPath(root, "release-manifest.json"));
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.schema_version, RELEASE_SCHEMA);
  assert.equal(manifest.status, "publication_ready_not_published");
  assert.equal(manifest.distribution_channel, "external-pilot");
  assert.equal(manifest.app_identity?.strategy, "reuse-formal-notarized-candidate");
  assert.equal(manifest.app_identity?.app_id, manifest.source_candidate?.app_id);
  assert.equal(manifest.source_candidate?.channel, "formal");
  assert.equal(manifest.source_candidate?.bytes_preserved, true);
  assert.equal(
    requiredEntry(entries, "provenance/package-lock.json"),
    manifest.source_candidate?.package_lock_sha256,
  );
  assert.equal(
    requiredEntry(entries, "provenance/desktop-package.json"),
    manifest.source_candidate?.desktop_package_sha256,
  );
  assert.equal(Object.hasOwn(manifest, "tenant_id"), false, "legacy tenant_id is forbidden");
  assert.equal(typeof manifest.lawos_tenant_id, "string");
  assert.equal(typeof manifest.entra_tenant_id, "string");
  assert.equal(manifest.approval?.verification, "trusted_detached_receipt");
  assert.equal(manifest.approval?.scope, "named-macos-external-pilot");
  const approvedAt = canonicalTime(manifest.approval.issued_at, "approval.issued_at");
  const approvalExpiresAt = canonicalTime(manifest.approval.expires_at, "approval.expires_at");
  assert.ok(approvedAt <= now && approvalExpiresAt > now, "named-pilot approval is not currently active");
  assert.equal(manifest.publication?.approved, true);
  assert.equal(typeof manifest.publication?.destination, "string");
  assert.ok(manifest.publication.destination.length > 0);
  assert.equal(manifest.publication?.audience, "named-pilot-only");
  assert.ok(["https:", "s3:"].includes(new URL(manifest.publication.destination).protocol));
  assert.equal(manifest.publication?.performed, false);
  assert.equal(manifest.macos_artifact_publication_approved, true);
  assert.equal(manifest.external_pilot_go_live_claim, false);
  assert.equal(manifest.global_release_readiness_claim, false);
  assert.equal(manifest.publication_performed, false);
  assert.equal(manifest.signing?.algorithm, "ed25519");
  assert.equal(manifest.signing?.public_key_sha256, expectedKeySha256);
  assert.equal(manifest.signing?.trusted_external_verifier?.delivery, "out-of-band-or-preinstalled");
  validateVerificationClosure(
    manifest.signing?.trusted_external_verifier?.closure,
    "release manifest verification closure",
  );
  assert.deepEqual(
    manifest.signing.trusted_external_verifier.closure,
    verificationClosure,
    "actual preflight verification closure does not match the signed release manifest",
  );
  assert.equal(manifest.signing?.trusted_external_verifier?.bundled_executable, false);
  assert.equal(manifest.signing?.trust_registry?.schema_version, TRUST_REGISTRY_SCHEMA_VERSION);
  assert.equal(manifest.signing?.trust_registry?.sha256, trustRegistry.sha256);
  assert.equal(manifest.signing?.trust_registry?.included_in_bundle, false);
  assert.equal(manifest.signing?.trust_registry?.bundle_reference_is_trust_root, false);
  assert.equal(manifest.signing?.trust_registry?.caller_supplied_registry_authority, false);
  assert.equal(manifest.signing?.trust_registry?.production_trust_root_required, true);
  const verifierReference = JSON.parse(readFileSync(checkedPath(root, "trusted-verifier-reference.json")));
  assert.deepEqual(verifierReference, {
    delivery: "out-of-band-or-preinstalled",
    closure: verificationClosure,
    executable_verifier_in_bundle: false,
    bundle_reference_is_trust_root: false,
    pre_execution_digest_check_required: true,
  });
  assert.deepEqual(
    JSON.parse(readFileSync(checkedPath(root, "trust-registry-reference.json"))),
    {
      schema_version: TRUST_REGISTRY_SCHEMA_VERSION,
      sha256: trustRegistry.sha256,
      included_in_bundle: false,
      bundle_reference_is_trust_root: false,
      caller_supplied_registry_authority: false,
      production_trust_root_required: true,
    },
  );
  for (const field of [
    "public_release_claim",
    "production_go_live_claim",
    "app_store_distribution_claim",
    "microsoft_store_distribution_claim",
  ]) assert.equal(manifest[field], false, `${field} must remain false`);
  assert.equal(manifest.windows?.status, "BLOCKED");
  assert.equal(manifest.windows?.blocker_code, WINDOWS_BLOCKER);
  assert.equal(manifest.windows?.artifacts_included, false);
  assert.equal(manifest.windows?.authenticode_verified, false);
  assert.equal(manifest.windows?.native_install_smoke_verified, false);

  const windowsBlocker = JSON.parse(readFileSync(checkedPath(root, "WINDOWS-BLOCKER.json")));
  assert.equal(windowsBlocker.status, "BLOCKED");
  assert.equal(windowsBlocker.blocker_code, WINDOWS_BLOCKER);
  assert.equal(windowsBlocker.windows_artifacts_included, false);

  const approvalRef = JSON.parse(readFileSync(checkedPath(root, "approval-receipt-ref.json")));
  assert.deepEqual(approvalRef, manifest.approval.receipt_ref);
  const approvalReceiptBytes = readFileSync(checkedPath(root, "approval-receipt.json"));
  const approvalReceipt = JSON.parse(approvalReceiptBytes);
  verifyDetachedReceipt({
    rootDir: root,
    receiptRef: approvalRef,
    receiptBytes: approvalReceiptBytes,
    receipt: approvalReceipt,
    registry: trustRegistry,
    expectedReceiptType: EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE,
    expectedReceiptSource: "release_owner",
    expectedPilotId: manifest.pilot_id,
    expectedLawosTenantId: manifest.lawos_tenant_id,
    expectedEntraTenantId: manifest.entra_tenant_id,
    expectedSourceSha: manifest.source_candidate.source_sha,
    expectedSourceTree: manifest.source_candidate.source_tree,
    expectedVersion: manifest.version,
    expectedRole: "release_owner",
    expectedOperation: EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE,
    expectedArtifactSha256: manifest.source_candidate.artifact_index_sha256,
    expectedBindingSha256: externalPilotBindingSha256(manifest),
    now,
  });
  exactKeys(approvalReceipt, [
    "schema_version",
    "receipt_type",
    "receipt_source",
    "verdict",
    "key_id",
    "issued_at",
    "expires_at",
    "pilot_id",
    "lawos_tenant_id",
    "entra_tenant_id",
    "source_sha",
    "source_tree",
    "version",
    "artifact_sha256",
    "binding_sha256",
    "role",
    "operation",
    "approval",
  ], "external-pilot approval receipt");
  assert.equal(approvalReceipt.schema_version, EXTERNAL_RELEASE_RECEIPT_SCHEMA);
  assert.equal(approvalReceipt.verdict, "APPROVED");
  assert.equal(approvalReceipt.key_id, manifest.approval.key_id);
  assert.equal(approvalReceipt.pilot_id, manifest.pilot_id);
  assert.equal(approvalReceipt.lawos_tenant_id, manifest.lawos_tenant_id);
  assert.equal(approvalReceipt.entra_tenant_id, manifest.entra_tenant_id);
  assert.equal(approvalReceipt.source_sha, manifest.source_candidate.source_sha);
  assert.equal(approvalReceipt.source_tree, manifest.source_candidate.source_tree);
  assert.equal(approvalReceipt.version, manifest.version);
  assert.equal(approvalReceipt.artifact_sha256, manifest.source_candidate.artifact_index_sha256);
  assert.equal(approvalReceipt.binding_sha256, externalPilotBindingSha256(manifest));
  assert.equal(approvalReceipt.role, "release_owner");
  assert.equal(approvalReceipt.operation, EXTERNAL_PILOT_APPROVAL_RECEIPT_TYPE);
  assert.equal(approvalReceipt.issued_at, manifest.approval.issued_at);
  assert.equal(approvalReceipt.expires_at, manifest.approval.expires_at);
  exactKeys(approvalReceipt.approval, [
    "approval_id",
    "scope",
    "firm_id",
    "distribution_channel",
    "app_id",
    "publication_destination",
    "audience",
    "artifact_index_sha256",
    "tenant_config_sha256",
    "release_signing_key_id",
    "release_signing_public_key_sha256",
    "verification_closure",
  ], "external-pilot approval scope");
  assert.equal(approvalReceipt.approval.approval_id, manifest.approval.approval_id);
  assert.equal(approvalReceipt.approval.scope, manifest.approval.scope);
  assert.equal(approvalReceipt.approval.firm_id, manifest.firm_id);
  assert.equal(approvalReceipt.approval.distribution_channel, manifest.distribution_channel);
  assert.equal(approvalReceipt.approval.app_id, manifest.app_identity.app_id);
  assert.equal(approvalReceipt.approval.publication_destination, manifest.publication.destination);
  assert.equal(approvalReceipt.approval.audience, manifest.publication.audience);
  assert.equal(approvalReceipt.approval.artifact_index_sha256, manifest.source_candidate.artifact_index_sha256);
  assert.equal(approvalReceipt.approval.tenant_config_sha256, manifest.tenant_configuration.sha256);
  assert.equal(approvalReceipt.approval.release_signing_key_id, manifest.signing.key_id);
  assert.equal(approvalReceipt.approval.release_signing_public_key_sha256, manifest.signing.public_key_sha256);
  assert.deepEqual(approvalReceipt.approval.verification_closure, verificationClosure);

  const tenantConfigBytes = readFileSync(checkedPath(root, "tenant-config.json"));
  const tenantConfigSignature = readFileSync(checkedPath(root, "tenant-config.sig"));
  verifyDetached(publicKey, tenantConfigBytes, tenantConfigSignature, "tenant configuration");
  const tenantConfig = JSON.parse(tenantConfigBytes);
  assert.equal(tenantConfig.schema_version, TENANT_CONFIG_SCHEMA);
  assert.equal(tenantConfig.pilot_id, manifest.pilot_id);
  assert.equal(tenantConfig.firm_id, manifest.firm_id);
  assert.equal(Object.hasOwn(tenantConfig, "tenant_id"), false, "legacy tenant_id is forbidden");
  assert.equal(tenantConfig.lawos_tenant_id, manifest.lawos_tenant_id);
  assert.equal(tenantConfig.entra_tenant_id, manifest.entra_tenant_id);
  assert.equal(sha256(tenantConfigBytes), manifest.tenant_configuration.sha256);
  const runtimeEndpoint = new URL(tenantConfig.runtime_endpoint);
  assert.equal(runtimeEndpoint.protocol, "https:", "tenant runtime endpoint must use HTTPS");
  const configIssuedAt = canonicalTime(tenantConfig.issued_at, "tenant config issued_at");
  const configExpiresAt = canonicalTime(tenantConfig.expires_at, "tenant config expires_at");
  assert.ok(configIssuedAt <= now && configExpiresAt > now, "tenant configuration is not currently active");
  assert.ok(configExpiresAt <= approvalExpiresAt, "tenant configuration outlives named-pilot approval");

  const updateMetadataBytes = readFileSync(checkedPath(root, "update-metadata.json"));
  const updateMetadata = JSON.parse(updateMetadataBytes);
  const updateSignature = readFileSync(checkedPath(root, "update-metadata.sig"));
  verifyDetached(
    publicKey,
    Buffer.from(canonicalJson(updateMetadata)),
    updateSignature,
    "update metadata",
  );
  exactKeys(updateMetadata, [
    "schemaVersion",
    "version",
    "channel",
    "pilotId",
    "lawosTenantId",
    "entraTenantId",
    "appId",
    "keyId",
    "sourceSha",
    "sourceTree",
    "artifactFilename",
    "artifactSha256",
    "artifactBytes",
    "tenantConfigSha256",
    "releaseManifestSha256",
    "generatedAt",
    "expiresAt",
    "approvalId",
    "approvalExpiresAt",
  ], "external-pilot update metadata");
  assert.equal(updateMetadata.schemaVersion, EXTERNAL_PILOT_UPDATE_SCHEMA);
  assert.equal(updateMetadata.channel, "external-pilot");
  assert.equal(updateMetadata.pilotId, manifest.pilot_id);
  assert.equal(updateMetadata.lawosTenantId, manifest.lawos_tenant_id);
  assert.equal(updateMetadata.entraTenantId, manifest.entra_tenant_id);
  assert.equal(updateMetadata.keyId, manifest.signing.key_id);
  assert.equal(updateMetadata.version, manifest.version);
  assert.equal(updateMetadata.appId, manifest.app_identity.app_id);
  assert.equal(updateMetadata.tenantConfigSha256, manifest.tenant_configuration.sha256);
  assert.equal(updateMetadata.releaseManifestSha256, sha256(manifestBytes));
  assert.equal(updateMetadata.sourceSha, manifest.source_candidate.source_sha);
  assert.equal(updateMetadata.sourceTree, manifest.source_candidate.source_tree);
  assert.equal(updateMetadata.approvalId, manifest.approval.approval_id);
  assert.equal(updateMetadata.approvalExpiresAt, manifest.approval.expires_at);
  const updateGeneratedAt = canonicalTime(updateMetadata.generatedAt, "update metadata generatedAt");
  const updateExpiresAt = canonicalTime(updateMetadata.expiresAt, "update metadata expiresAt");
  assert.ok(updateGeneratedAt <= now && updateExpiresAt > now, "update metadata is not currently active");
  assert.ok(updateExpiresAt <= approvalExpiresAt, "update metadata outlives signed approval");
  assert.match(updateMetadata.artifactSha256 ?? "", SHA256);

  assert.ok(Array.isArray(manifest.artifacts) && manifest.artifacts.length >= 4);
  for (const artifact of manifest.artifacts) {
    assert.equal(requiredEntry(entries, artifact.path), artifact.sha256);
    assert.equal(statSync(checkedPath(root, artifact.path)).size, artifact.bytes);
  }
  assert.ok(Array.isArray(manifest.bundle_contents) && manifest.bundle_contents.length > 0);
  for (const artifact of manifest.bundle_contents) {
    assert.equal(requiredEntry(entries, artifact.path), artifact.sha256);
    assert.equal(statSync(checkedPath(root, artifact.path)).size, artifact.bytes);
  }
  const updateArtifact = manifest.artifacts.find((artifact) => artifact.id === "macos_zip_archive");
  const dmgArtifact = manifest.artifacts.find((artifact) => artifact.id === "macos_dmg_image");
  assert.ok(updateArtifact, "release manifest is missing macOS ZIP update artifact");
  assert.ok(dmgArtifact, "release manifest is missing macOS DMG artifact");
  assert.equal(updateMetadata.artifactFilename, updateArtifact.path);
  assert.equal(updateMetadata.artifactSha256, updateArtifact.sha256);
  assert.equal(updateMetadata.artifactBytes, updateArtifact.bytes);

  const macosArtifactChecksumBytes = readFileSync(checkedPath(root, "macos-artifact-checksums.sha256"));
  verifyDetached(
    publicKey,
    macosArtifactChecksumBytes,
    readFileSync(checkedPath(root, "macos-artifact-checksums.sig")),
    "macOS artifact checksums",
  );
  assert.equal(
    macosArtifactChecksumBytes.toString("utf8"),
    `${dmgArtifact.sha256}  ${dmgArtifact.path.split("/").at(-1)}\n${updateArtifact.sha256}  ${updateArtifact.path.split("/").at(-1)}\n`,
    "macOS artifact checksums do not bind the preserved DMG and ZIP bytes",
  );
  const macosReceiptBytes = readFileSync(checkedPath(root, "macos-distribution-receipt.json"));
  const macosReceipt = JSON.parse(macosReceiptBytes);
  const macosReceiptRef = JSON.parse(readFileSync(checkedPath(root, "macos-distribution-receipt-ref.json")));
  assert.equal(manifest.macos?.distribution_receipt_path, "macos-distribution-receipt.json");
  assert.equal(manifest.macos?.distribution_receipt_ref_path, "macos-distribution-receipt-ref.json");
  assert.equal(manifest.macos?.distribution_receipt_signature_path, "macos-distribution-receipt.sig");
  assert.deepEqual(macosReceiptRef, {
    path: "macos-distribution-receipt.json",
    sha256: sha256(macosReceiptBytes),
    signature_ref: {
      path: "macos-distribution-receipt.sig",
      sha256: sha256(readFileSync(checkedPath(root, "macos-distribution-receipt.sig"))),
    },
  });
  verifyDetachedReceipt({
    rootDir: root,
    receiptRef: macosReceiptRef,
    receiptBytes: macosReceiptBytes,
    receipt: macosReceipt,
    registry: trustRegistry,
    expectedReceiptType: "macos_distribution_artifacts",
    expectedReceiptSource: "release_pipeline",
    expectedPilotId: manifest.pilot_id,
    expectedLawosTenantId: manifest.lawos_tenant_id,
    expectedEntraTenantId: manifest.entra_tenant_id,
    expectedSourceSha: manifest.source_candidate.source_sha,
    expectedSourceTree: manifest.source_candidate.source_tree,
    expectedVersion: manifest.version,
    expectedRole: "release_pipeline",
    expectedOperation: "macos_distribution_artifacts",
    expectedArtifactSha256: dmgArtifact.sha256,
    expectedBindingSha256: externalPilotBindingSha256(manifest),
    now,
  });
  exactKeys(macosReceipt, [
    "schema_version",
    "receipt_type",
    "receipt_source",
    "verdict",
    "key_id",
    "issued_at",
    "expires_at",
    "pilot_id",
    "lawos_tenant_id",
    "entra_tenant_id",
    "source_sha",
    "source_tree",
    "version",
    "artifact_sha256",
    "binding_sha256",
    "role",
    "operation",
    "distribution_channel",
    "signing",
    "artifacts",
    "claim_policy",
  ], "macOS distribution receipt");
  assert.equal(macosReceipt.schema_version, EXTERNAL_RELEASE_RECEIPT_SCHEMA);
  assert.equal(macosReceipt.receipt_type, "macos_distribution_artifacts");
  assert.equal(macosReceipt.receipt_source, "release_pipeline");
  assert.equal(macosReceipt.verdict, "PASS");
  assert.equal(macosReceipt.key_id, manifest.signing.key_id);
  assert.equal(macosReceipt.pilot_id, manifest.pilot_id);
  assert.equal(Object.hasOwn(macosReceipt, "tenant_id"), false, "legacy tenant_id is forbidden");
  assert.equal(macosReceipt.lawos_tenant_id, manifest.lawos_tenant_id);
  assert.equal(macosReceipt.entra_tenant_id, manifest.entra_tenant_id);
  assert.equal(macosReceipt.source_sha, manifest.source_candidate.source_sha);
  assert.equal(macosReceipt.source_tree, manifest.source_candidate.source_tree);
  assert.equal(macosReceipt.version, manifest.version);
  assert.equal(macosReceipt.artifact_sha256, dmgArtifact.sha256);
  assert.equal(macosReceipt.binding_sha256, externalPilotBindingSha256(manifest));
  assert.equal(macosReceipt.role, "release_pipeline");
  assert.equal(macosReceipt.operation, "macos_distribution_artifacts");
  const receiptIssuedAt = canonicalTime(macosReceipt.issued_at, "macOS receipt issued_at");
  const receiptExpiresAt = canonicalTime(macosReceipt.expires_at, "macOS receipt expires_at");
  assert.ok(receiptIssuedAt <= now && receiptExpiresAt > now, "macOS receipt is not currently active");
  assert.ok(receiptExpiresAt <= approvalExpiresAt, "macOS receipt outlives signed approval");
  assert.ok(receiptExpiresAt <= configExpiresAt, "macOS receipt outlives signed tenant configuration");
  assert.equal(macosReceipt.distribution_channel, "external-pilot");
  for (const field of ["developer_id", "notarized", "stapled", "gatekeeper_accepted"]) {
    assert.equal(macosReceipt.signing?.[field], true);
  }
  assert.equal(
    macosReceipt.signing?.notarization_ticket_ref,
    `${dmgArtifact.path}#stapled-notarization-ticket`,
  );
  assert.equal(macosReceipt.signing?.artifact_checksums_algorithm, "ed25519");
  assert.equal(macosReceipt.signing?.artifact_checksums_key_id, manifest.signing.key_id);
  assert.equal(macosReceipt.signing?.artifact_checksums_signature_path, "macos-artifact-checksums.sig");
  assert.deepEqual(macosReceipt.artifacts?.package, {
    path: dmgArtifact.path,
    sha256: dmgArtifact.sha256,
    kind: "notarized_stapled_dmg",
  });
  assert.deepEqual(macosReceipt.artifacts?.checksums, {
    path: "macos-artifact-checksums.sha256",
    sha256: sha256(macosArtifactChecksumBytes),
  });
  assert.equal(macosReceipt.claim_policy?.macos_artifact_gate_only, true);
  assert.equal(macosReceipt.claim_policy?.external_pilot_go_live_approved, false);
  assert.equal(macosReceipt.claim_policy?.public_release_claim, false);
  assert.equal(macosReceipt.claim_policy?.production_go_live_claim, false);

  const sbom = JSON.parse(readFileSync(checkedPath(root, "sbom.cdx.json")));
  assert.equal(sbom.bomFormat, "CycloneDX");
  assert.equal(sbom.specVersion, "1.5");
  assert.ok(sbom.components.some((component) => component.name === "electron"));
  assert.ok(sbom.components.some((component) => component.name === "unpdf"));
  assert.deepEqual(macosReceipt.artifacts?.sbom, {
    path: "sbom.cdx.json",
    sha256: sha256(readFileSync(checkedPath(root, "sbom.cdx.json"))),
  });

  return {
    verdict: "PASS",
    bundle_root: root,
    pilot_id: manifest.pilot_id,
    firm_id: manifest.firm_id,
    lawos_tenant_id: manifest.lawos_tenant_id,
    entra_tenant_id: manifest.entra_tenant_id,
    version: manifest.version,
    app_id: manifest.app_identity.app_id,
    distribution_channel: manifest.distribution_channel,
    signing_public_key_sha256: expectedKeySha256,
    checksum_entries_verified: entries.size,
    source_candidate_bytes_preserved: true,
    macos_artifact_publication_ready: true,
    publication_ready: true,
    publication_performed: false,
    external_pilot_go_live_claim: false,
    global_release_readiness_claim: false,
    windows_status: "BLOCKED",
    windows_blocker_code: WINDOWS_BLOCKER,
    public_release_claim: false,
    production_go_live_claim: false,
    app_store_distribution_claim: false,
    microsoft_store_distribution_claim: false,
  };
}

function cliArguments(argv) {
  const args = [...argv];
  function take(flag, message) {
    const index = args.indexOf(flag);
    assert.notEqual(index, -1, message);
    const value = args[index + 1];
    assert.ok(value && !value.startsWith("--"), `${flag} value is required`);
    args.splice(index, 2);
    return value;
  }
  const bundleDir = take("--bundle", "--bundle is required; never execute a verifier from inside a release bundle");
  const expectedKeySha256 = take("--expected-key-sha256", "--expected-key-sha256 is required");
  const verificationClosure = validateVerificationClosure({
    schema_version: VERIFICATION_CLOSURE_SCHEMA,
    launcher_sha256: take("--expected-launcher-sha256", "--expected-launcher-sha256 is required"),
    node_executable: take("--node-executable", "--node-executable is required"),
    node_sha256: take("--expected-node-sha256", "--expected-node-sha256 is required"),
    prepare_cli_sha256: take("--expected-prepare-cli-sha256", "--expected-prepare-cli-sha256 is required"),
    generator_sha256: take("--expected-generator-sha256", "--expected-generator-sha256 is required"),
    verifier_sha256: take("--expected-verifier-sha256", "--expected-verifier-sha256 is required"),
    trust_resolver_sha256: take("--expected-trust-resolver-sha256", "--expected-trust-resolver-sha256 is required"),
    trust_helper_sha256: take("--expected-trust-helper-sha256", "--expected-trust-helper-sha256 is required"),
    updates_sha256: take("--expected-updates-sha256", "--expected-updates-sha256 is required"),
    release_paths_sha256: take("--expected-release-paths-sha256", "--expected-release-paths-sha256 is required"),
    provenance_sha256: take("--expected-provenance-sha256", "--expected-provenance-sha256 is required"),
  }, "trusted launcher verification closure");
  assert.deepEqual(args, [], "unknown verifier arguments");
  return { bundleDir, expectedKeySha256, verificationClosure };
}

export function runExternalPilotVerification(argv) {
  return verifyExternalPilotBundle(cliArguments(argv));
}

const invokedPath = process.argv[1] && existsSync(process.argv[1]) ? realpathSync(process.argv[1]) : null;
if (invokedPath === realpathSync(fileURLToPath(import.meta.url))) {
  process.stderr.write("UNSUPPORTED_DIRECT_ENTRY: use the trusted external-pilot launcher\n");
  process.exitCode = 1;
}
