import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, existsSync, realpathSync } from "node:fs";
import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  INTERNAL_UNSIGNED_UPDATE_CHANNEL,
  INTERNAL_UPDATE_KEY_ID,
  assertInternalUnsignedRevocationsDocument,
  assertInternalUnsignedRollbackDocument,
  canonicalizeUpdateMetadata,
} from "../../apps/desktop/src/main/updates.js";
import {
  DESKTOP_INTERNAL_UNSIGNED_DISTRIBUTION_PROFILE,
  assertPathOutsideWorktree,
  validateDesktopBuildManifest,
} from "./matter-desktop-provenance.mjs";
import {
  AMIC_INTERNAL_PROVENANCE_SCHEMA,
  validateAmicInternalDistributionBindings,
  validateAmicInternalDistributionRelease,
} from "./amic-os-internal-distribution-publication.mjs";

export const AMIC_INTERNAL_PREFLIGHT_RECEIPT_SCHEMA =
  "law-firm-os.amic-internal-unsigned-publication-preflight.v1";
const SHA256 = /^[0-9a-f]{64}$/u;
const PUBLISH_WORKFLOW_REF =
  "Gonyak-cell/law-firm-os/.github/workflows/amic-os-internal-unsigned-publish.yml@refs/heads/main";
const OUTPUT_FILES = Object.freeze({
  bindings: "bindings.json",
  build_manifest: "matter-build-manifest.json",
  provenance: "provenance.json",
  receipt: "preflight-receipt.json",
  release: "release.json",
  revocations: "revocations.json",
  rollback: "rollback.json",
  sbom: "sbom.cdx.json",
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalBytes(value) {
  return Buffer.from(`${canonicalizeUpdateMetadata(value)}\n`);
}

function parseJson(bytes, label) {
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new Error(`${label} is not valid UTF-8`); }
  assert.equal(text.includes("\0"), false, `${label} contains a NUL byte`);
  try { return JSON.parse(text); }
  catch { throw new Error(`${label} is not valid JSON`); }
}

function parseBase64Json(value, label) {
  assert.equal(typeof value, "string", `${label} is not base64 text`);
  const bytes = Buffer.from(value, "base64");
  assert.ok(bytes.byteLength > 0 && bytes.byteLength <= 64 * 1024,
    `${label} exceeds the bounded input size`);
  assert.equal(bytes.toString("base64"), value, `${label} is not canonical base64`);
  return parseJson(bytes, label);
}

async function regularFileRecord(filePath, label, { capture = false } = {}) {
  const resolved = path.resolve(filePath);
  const before = await lstat(resolved);
  assert.equal(before.isSymbolicLink(), false, `${label} cannot be a symbolic link`);
  assert.equal(before.isFile(), true, `${label} must be a regular file`);
  assert.equal(before.nlink, 1, `${label} cannot be hard-linked`);
  assert.ok(Number.isSafeInteger(before.size) && before.size > 0, `${label} byte count is invalid`);
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(resolved)) digest.update(chunk);
  const after = await lstat(resolved);
  assert.equal(after.isSymbolicLink(), false, `${label} became a symbolic link`);
  assert.equal(after.isFile(), true, `${label} changed type`);
  assert.equal(after.dev, before.dev, `${label} device changed while hashing`);
  assert.equal(after.ino, before.ino, `${label} inode changed while hashing`);
  assert.equal(after.size, before.size, `${label} size changed while hashing`);
  assert.equal(after.mtimeMs, before.mtimeMs, `${label} changed while hashing`);
  const record = {
    path: resolved,
    bytes: before.size,
    sha256: digest.digest("hex"),
  };
  if (capture) {
    assert.ok(before.size <= 64 * 1024 * 1024, `${label} exceeds the bounded capture size`);
    const body = await readFile(resolved);
    assert.equal(body.byteLength, before.size, `${label} changed while being captured`);
    assert.equal(sha256(body), record.sha256, `${label} digest changed while being captured`);
    record.body = body;
  }
  return Object.freeze(record);
}

function validateRunner(runner, sourceSha) {
  assert.deepEqual(Object.keys(runner ?? {}).sort(), [
    "environment",
    "ref",
    "repository",
    "runAttempt",
    "runId",
    "sha",
    "workflowRef",
  ].sort(), "publication runner binding differs");
  assert.equal(runner.repository, "Gonyak-cell/law-firm-os");
  assert.equal(runner.ref, "refs/heads/main");
  assert.equal(runner.sha, sourceSha);
  assert.equal(runner.workflowRef, PUBLISH_WORKFLOW_REF);
  assert.equal(runner.environment, "github-hosted");
  assert.match(String(runner.runId ?? ""), /^[1-9][0-9]*$/u);
  assert.match(String(runner.runAttempt ?? ""), /^[1-9][0-9]*$/u);
  return runner;
}

function validateBuildResult(result, release) {
  assert.equal(result?.verdict, "PASS");
  assert.equal(result?.installer, `apps/desktop/dist/AMIC-OS-internal-${release.version}-win-x64.exe`);
  assert.match(result?.installer_sha256 ?? "", SHA256);
  assert.ok(Number.isSafeInteger(result?.installer_bytes) && result.installer_bytes > 0);
  assert.equal(result?.release_channel, "internal");
  assert.equal(result?.app_id, release.appId);
  assert.equal(result?.distribution_profile, DESKTOP_INTERNAL_UNSIGNED_DISTRIBUTION_PROFILE);
  assert.equal(result?.installer_source_sha, release.sourceSha);
  assert.equal(result?.installer_source_tree, release.sourceTree);
  assert.equal(result?.installer_source_dirty, false);
  assert.equal(result?.installer_internal_unsigned_marker, true);
  assert.equal(result?.windows_authenticode_signing, false);
  assert.equal(result?.windows_authenticode_not_signed_verified, true);
  assert.equal(result?.windows_authenticode_signature_verified, false);
  assert.equal(result?.windows_authenticode_timestamp_verified, false);
  assert.equal(result?.windows_authenticode_signer_certificate_sha1, null);
  assert.equal(result?.windows_authenticode_signer, null);
  assert.deepEqual(result?.windows_authenticode_timestamps, []);
  const privacy = result?.internal_unsigned_privacy_audit;
  assert.equal(privacy?.valid, true);
  assert.equal(privacy?.finding_count, 0);
  assert.equal(privacy?.forbidden_path_count, 0);
  assert.deepEqual(privacy?.findings, []);
  for (const field of [
    "bundled_local_api",
    "contacts_included",
    "credential_file_included",
    "opaque_asar_included",
    "photos_included",
    "private_key_file_included",
    "registration_seed_included",
    "roster_included",
  ]) assert.equal(privacy?.[field], false, `privacy audit ${field} differs`);
  assert.equal(privacy?.private_source_content_match_count, 0);
  assert.equal(privacy?.private_source_content_scan, "verified");
  return result;
}

function bindSbom(raw, { release, installer, buildManifest }) {
  assert.equal(raw?.bomFormat, "CycloneDX", "dependency SBOM is not CycloneDX");
  const [major, minor] = String(raw?.specVersion ?? "").split(".").map(Number);
  assert.ok(major === 1 && Number.isInteger(minor) && minor >= 5, "dependency SBOM spec is older than 1.5");
  assert.ok(Array.isArray(raw.components) && raw.components.length > 0, "dependency SBOM has no components");
  const sbom = structuredClone(raw);
  sbom.metadata ??= {};
  sbom.metadata.component ??= {
    type: "application",
    name: "@law-firm-os/desktop",
    version: release.version,
  };
  const existing = Array.isArray(sbom.metadata.component.properties)
    ? sbom.metadata.component.properties
    : [];
  for (const property of existing) {
    assert.equal(typeof property?.name, "string", "dependency SBOM property name is invalid");
    assert.equal(typeof property?.value, "string", "dependency SBOM property value is invalid");
  }
  const boundProperties = [
    ["law-firm-os:app-id", release.appId],
    ["law-firm-os:authenticode-status", "not_signed"],
    ["law-firm-os:credentials-included", "false"],
    ["law-firm-os:distribution", "private"],
    ["law-firm-os:installer-bytes", String(installer.bytes)],
    ["law-firm-os:installer-sha256", installer.sha256],
    ["law-firm-os:internal-unsigned-privacy-audit", "true"],
    ["law-firm-os:public-release-allowed", "false"],
    ["law-firm-os:real-contact-seed-included", "false"],
    ["law-firm-os:real-photo-seed-included", "false"],
    ["law-firm-os:real-registration-seed-included", "false"],
    ["law-firm-os:source-sha", release.sourceSha],
    ["law-firm-os:source-tree", release.sourceTree],
    ["law-firm-os:version", release.version],
  ].map(([name, value]) => ({ name, value }));
  const reserved = new Set(boundProperties.map(({ name }) => name));
  assert.equal(existing.some(({ name }) => reserved.has(name)), false, "dependency SBOM shadows a protected binding");
  sbom.metadata.component.properties = [...existing, ...boundProperties]
    .sort((left, right) => left.name.localeCompare(right.name));
  const installerRef = `urn:sha256:${installer.sha256}`;
  assert.equal(sbom.components.some((component) => component?.["bom-ref"] === installerRef), false);
  sbom.components.push({
    type: "file",
    "bom-ref": installerRef,
    name: path.basename(installer.path),
    hashes: [{ alg: "SHA-256", content: installer.sha256.toUpperCase() }],
    properties: [
      { name: "law-firm-os:file-bytes", value: String(installer.bytes) },
      { name: "law-firm-os:authenticode-status", value: "not_signed" },
    ],
  });
  sbom.metadata.timestamp = buildManifest.built_at;
  return sbom;
}

async function writePrivateJson(root, name, value) {
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  const filePath = path.join(root, name);
  await writeFile(filePath, bytes, { flag: "wx", mode: 0o600 });
  return Object.freeze({ path: filePath, bytes: bytes.byteLength, sha256: sha256(bytes) });
}

async function writePrivateBytes(root, name, bytes) {
  const filePath = path.join(root, name);
  await writeFile(filePath, bytes, { flag: "wx", mode: 0o600 });
  return Object.freeze({ path: filePath, bytes: bytes.byteLength, sha256: sha256(bytes) });
}

export async function prepareAmicInternalUnsignedPublication({
  repoRoot,
  outputDir,
  buildResultPath,
  rawSbomPath,
  releaseBase64,
  revocationsBase64,
  rollbackBase64,
  publicationMode = "successor",
  bindings,
  runner,
  now = Date.now(),
} = {}) {
  assert.ok(["baseline", "successor"].includes(publicationMode), "publication mode is invalid");
  const root = realpathSync(repoRoot);
  const output = assertPathOutsideWorktree({
    repoRoot: root,
    candidate: outputDir,
    label: "internal-unsigned publication preflight output",
  });
  assert.equal(existsSync(output), false, "publication preflight output must be new");
  const safeBindings = validateAmicInternalDistributionBindings(bindings, { now });
  const release = validateAmicInternalDistributionRelease(
    parseBase64Json(releaseBase64, "release document"),
    { now },
  );
  const revocations = publicationMode === "successor"
    ? assertInternalUnsignedRevocationsDocument(
      parseBase64Json(revocationsBase64, "revocation document"),
    )
    : undefined;
  const rollback = publicationMode === "successor"
    ? assertInternalUnsignedRollbackDocument(
      parseBase64Json(rollbackBase64, "rollback authorization"),
    )
    : undefined;
  if (publicationMode === "baseline") {
    assert.equal(revocationsBase64, undefined, "baseline preflight cannot include revocations");
    assert.equal(rollbackBase64, undefined, "baseline preflight cannot include rollback authorization");
  }
  validateRunner(runner, release.sourceSha);
  if (publicationMode === "successor") {
    for (const document of [revocations, rollback]) {
      assert.ok(Date.parse(document.generatedAt) <= now, "signed input is not active yet");
      assert.ok(Date.parse(document.expiresAt) > now, "signed input is expired");
    }
    assert.equal(revocations.channel, INTERNAL_UNSIGNED_UPDATE_CHANNEL);
    assert.equal(revocations.lawosTenantId, release.lawosTenantId);
    assert.equal(revocations.appId, release.appId);
    assert.equal(revocations.keyId, INTERNAL_UPDATE_KEY_ID);
    assert.equal(revocations.revokedReleaseIds.includes(release.releaseId), false);
    assert.equal(rollback.fromReleaseId, release.releaseId);
    assert.equal(rollback.fromVersion, release.version);
    assert.equal(rollback.fromSourceSha, release.sourceSha);
    assert.equal(rollback.fromSourceTree, release.sourceTree);
    assert.equal(rollback.lawosTenantId, release.lawosTenantId);
    assert.equal(rollback.installationId, release.installationId);
    assert.equal(rollback.appId, release.appId);
    assert.equal(rollback.keyId, release.keyId);
    assert.equal(rollback.revocationRevision, revocations.revision);
    assert.equal(rollback.targetReleaseId, release.predecessor.releaseId);
    assert.equal(rollback.targetVersion, release.predecessor.version);
    assert.equal(rollback.targetSourceSha, release.predecessor.sourceSha);
    assert.equal(rollback.targetSourceTree, release.predecessor.sourceTree);
  }

  const buildResultRecord = await regularFileRecord(buildResultPath, "Windows build result", { capture: true });
  const buildResult = validateBuildResult(
    parseJson(buildResultRecord.body, "Windows build result"),
    release,
  );
  const expectedInstaller = path.join(
    root,
    "apps",
    "desktop",
    "dist",
    `AMIC-OS-internal-${release.version}-win-x64.exe`,
  );
  assert.equal(path.resolve(root, buildResult.installer), expectedInstaller);
  const installer = await regularFileRecord(expectedInstaller, "internal-unsigned installer");
  assert.equal(installer.sha256, buildResult.installer_sha256);
  assert.equal(installer.bytes, buildResult.installer_bytes);
  const expectedBuildManifest = path.join(
    root,
    "apps",
    "desktop",
    "dist",
    "win-unpacked",
    "resources",
    "matter-build-manifest.json",
  );
  assert.equal(path.resolve(root, buildResult.installer_build_manifest), expectedBuildManifest);
  const buildManifestRecord = await regularFileRecord(
    expectedBuildManifest,
    "Windows build manifest",
    { capture: true },
  );
  const buildManifest = validateDesktopBuildManifest(
    parseJson(buildManifestRecord.body, "Windows build manifest"),
  );
  assert.equal(buildManifest.version, release.version);
  assert.equal(buildManifest.source_sha, release.sourceSha);
  assert.equal(buildManifest.source_tree, release.sourceTree);
  assert.equal(buildManifest.source_dirty, false);
  assert.equal(buildManifest.channel, "internal");
  assert.equal(buildManifest.platform, "win32");
  assert.equal(buildManifest.arch, "x64");
  assert.equal(buildManifest.app_id, release.appId);

  const rawSbomRecord = await regularFileRecord(rawSbomPath, "dependency SBOM", { capture: true });
  const sbom = bindSbom(
    parseJson(rawSbomRecord.body, "dependency SBOM"),
    { release, installer, buildManifest },
  );

  let created = false;
  try {
    await mkdir(output, { recursive: false, mode: 0o700 });
    created = true;
    const files = {};
    files.bindings = await writePrivateJson(output, OUTPUT_FILES.bindings, safeBindings);
    files.build_manifest = await writePrivateBytes(
      output,
      OUTPUT_FILES.build_manifest,
      buildManifestRecord.body,
    );
    files.release = await writePrivateJson(output, OUTPUT_FILES.release, release);
    if (publicationMode === "successor") {
      files.revocations = await writePrivateJson(output, OUTPUT_FILES.revocations, revocations);
      files.rollback = await writePrivateJson(output, OUTPUT_FILES.rollback, rollback);
    }
    files.sbom = await writePrivateJson(output, OUTPUT_FILES.sbom, sbom);
    const provenance = {
      schema_version: AMIC_INTERNAL_PROVENANCE_SCHEMA,
      generated_at: new Date(now).toISOString(),
      source_sha: release.sourceSha,
      source_tree: release.sourceTree,
      version: release.version,
      release_id: release.releaseId,
      release_sequence: release.releaseSequence,
      app_id: release.appId,
      installer_sha256: installer.sha256,
      installer_bytes: installer.bytes,
      build_result_sha256: buildResultRecord.sha256,
      build_manifest_sha256: files.build_manifest.sha256,
      sbom_sha256: files.sbom.sha256,
      distribution_profile: DESKTOP_INTERNAL_UNSIGNED_DISTRIBUTION_PROFILE,
      authenticode_status: "NotSigned",
      internal_unsigned_privacy_audit: true,
      private_source_file_count: buildResult.internal_unsigned_privacy_audit.private_source_file_count,
      private_source_digest_count: buildResult.internal_unsigned_privacy_audit.private_source_digest_count,
      private_source_content_match_count: 0,
      real_contact_seed_included: false,
      real_photo_seed_included: false,
      real_registration_seed_included: false,
      credentials_included: false,
      public_release: false,
      github_release_installer_asset_allowed: false,
      repository: runner.repository,
      ref: runner.ref,
      workflow_ref: runner.workflowRef,
      run_id: String(runner.runId),
      run_attempt: String(runner.runAttempt),
      runner_environment: runner.environment,
    };
    files.provenance = await writePrivateJson(output, OUTPUT_FILES.provenance, provenance);
    const receiptBody = {
      schema_version: AMIC_INTERNAL_PREFLIGHT_RECEIPT_SCHEMA,
      state: "PASS",
      publication_mode: publicationMode,
      release_id: release.releaseId,
      release_sequence: release.releaseSequence,
      version: release.version,
      source_sha: release.sourceSha,
      source_tree: release.sourceTree,
      installer_sha256: installer.sha256,
      installer_bytes: installer.bytes,
      build_manifest_sha256: files.build_manifest.sha256,
      sbom_sha256: files.sbom.sha256,
      provenance_sha256: files.provenance.sha256,
      revocation_revision: revocations?.revision ?? null,
      rollback_id: rollback?.rollbackId ?? null,
      output_file_count: publicationMode === "baseline" ? 6 : 8,
      authenticode_status: "not_signed",
      privacy_audit: "verified",
      real_seed_included: false,
      credentials_included: false,
      public_release_allowed: false,
    };
    files.receipt = await writePrivateJson(output, OUTPUT_FILES.receipt, receiptBody);
    return Object.freeze({
      ...receiptBody,
      receipt_sha256: files.receipt.sha256,
      installer_path: installer.path,
      paths: Object.freeze(Object.fromEntries(
        Object.entries(files).map(([kind, record]) => [kind, record.path]),
      )),
    });
  } catch (error) {
    if (created) await rm(output, { recursive: true, force: true });
    throw error;
  }
}
