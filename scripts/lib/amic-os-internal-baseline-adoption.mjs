import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { verifyInternalUnsignedInstallationAttestation } from "../../packages/runtime-auth/src/internal-unsigned-installation-attestation.js";
import { canonicalizeUpdateMetadata } from "../../apps/desktop/src/main/updates.js";
import { validateRuntimeSafetyApprovalPayload } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { validateAmicOsInternalWindowsStateReceipt } from "../validate-amic-os-internal-windows-state.mjs";
import { amicInternalManagedBootstrapScopeKey, validateAmicInternalDistributionRelease } from "./amic-os-internal-distribution-publication.mjs";

export const AMIC_INTERNAL_BASELINE_ADOPTION_SCHEMA = "law-firm-os.amic-internal-baseline-adoption.v1";
export const AMIC_INTERNAL_BASELINE_ADOPTION_ACTION = "lawos-amic-internal-baseline-adopt";
const VERIFIED = new WeakSet();
const SHA256 = /^[a-f0-9]{64}$/u;
const SHA1 = /^[a-f0-9]{40}$/u;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;

export const amicAdoptionCanonicalBytes = (value) => Buffer.from(`${canonicalizeUpdateMetadata(value)}\n`);
export const amicAdoptionSha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exact = (value, fields, label) => {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} is not an object`);
  assert.deepEqual(Object.keys(value).sort(), [...fields].sort(), `${label} schema differs`);
};
const iso = (value) => {
  assert.equal(typeof value, "string");
  assert.equal(new Date(value).toISOString(), value, "timestamp is not canonical UTC");
  return Date.parse(value);
};
const currentWindow = (value, now, maximumAge) => {
  const issued = iso(value.generated_at ?? value.generatedAt);
  const expires = iso(value.expires_at ?? value.expiresAt);
  assert.ok(issued <= now && expires > now && expires > issued, "authority or request expired or not active");
  assert.ok(expires - issued <= maximumAge, "authority or request lifetime exceeds limit");
};
function frozen(value) {
  for (const nested of Object.values(value)) if (nested && typeof nested === "object") frozen(nested);
  return Object.freeze(value);
}

export function validateAmicInternalBaselineAdoptionRequest(value, { now = Date.now() } = {}) {
  const request = structuredClone(value);
  exact(request, ["schema_version", "adoptionId", "executorSourceSha", "executorSourceTree", "bootstrapRelease", "bootstrapMarker", "installationId", "installedReceiptSha256", "canaryId", "approvalRef", "generatedAt", "expiresAt", "environment", "retention"], "adoption request");
  assert.equal(request.schema_version, AMIC_INTERNAL_BASELINE_ADOPTION_SCHEMA);
  for (const key of ["adoptionId", "canaryId", "approvalRef"]) assert.match(request[key], ID);
  assert.match(request.installationId, INSTALLATION_ID, "server-issued installation ID is required");
  assert.match(request.executorSourceSha, SHA1);
  assert.match(request.executorSourceTree, SHA1);
  assert.match(request.installedReceiptSha256, SHA256);
  assert.ok(["lawos-production", "synthetic-test"].includes(request.environment));
  currentWindow(request, now, 90 * 60 * 1000);
  exact(request.retention, ["bootstrapRetainUntil", "controlRetainUntil"], "adoption retention");
  assert.ok(iso(request.retention.bootstrapRetainUntil) >= iso(request.bootstrapRelease.expiresAt),
    "original artifact retention does not cover bootstrap validity");
  const controlRetention = iso(request.retention.controlRetainUntil);
  assert.equal(controlRetention % 1000, 0);
  assert.ok(controlRetention - now >= 365 * 86400000 && controlRetention - now <= 3650 * 86400000,
    "new adoption controls require 365 to 3650 days retention");
  validateAmicInternalDistributionRelease(request.bootstrapRelease, { now, publicationMode: "managed-bootstrap" });
  exact(request.bootstrapMarker, ["kind", "key", "version_id", "sha256", "bytes"], "bootstrap marker");
  assert.equal(request.bootstrapMarker.kind, "managed_bootstrap_marker");
  assert.equal(request.bootstrapMarker.key, amicInternalManagedBootstrapScopeKey(request.bootstrapRelease));
  assert.match(request.bootstrapMarker.version_id, /^[A-Za-z0-9][A-Za-z0-9._+=/-]{0,1023}$/u);
  assert.notEqual(request.bootstrapMarker.version_id, "null");
  assert.match(request.bootstrapMarker.sha256, SHA256);
  assert.ok(Number.isSafeInteger(request.bootstrapMarker.bytes) && request.bootstrapMarker.bytes > 0 && request.bootstrapMarker.bytes <= 2 * 1024 * 1024);
  return frozen(request);
}

export function verifyAmicInternalAdoptionAttestation(envelope, { request, publicKey, publicKeySha256, keyId, now }) {
  const document = verifyInternalUnsignedInstallationAttestation({ envelope, publicKey,
    expectedPublicKeySha256: publicKeySha256, expectedKeyId: keyId,
    adoptionId: request.adoptionId, requestSha256: amicAdoptionSha256(amicAdoptionCanonicalBytes(request)),
    installationId: request.installationId, now });
  const installation = document.installation;
  const expected = { installation_id: request.installationId, tenant_id: request.bootstrapRelease.lawosTenantId,
    app_id: request.bootstrapRelease.appId, platform: request.bootstrapRelease.platform,
    architecture: request.bootstrapRelease.architecture, release_id: request.bootstrapRelease.releaseId,
    release_sequence: request.bootstrapRelease.releaseSequence, version: request.bootstrapRelease.version,
    source_sha: request.bootstrapRelease.sourceSha, source_tree: request.bootstrapRelease.sourceTree,
    bootstrap_marker_sha256: request.bootstrapMarker.sha256, installed_receipt_sha256: request.installedReceiptSha256,
    status: "active", retired_at: null, release_trusted: true };
  for (const [field, value] of Object.entries(expected)) assert.equal(installation[field], value, `installation authority binding differs: ${field}`);
  return frozen(document);
}

function verifyAdoption({
  request: candidate, attestation, installedReceiptBytes, ownerApprovalReceiptBytes,
  ownerApprovalSignatureBytes, ownerRegistryBytes, ownerRegistrySha256,
  authorityPublicKey, authorityPublicKeySha256, authorityKeyId,
  now = Date.now,
} = {}, requireInstalledReceipt = true) {
  assert.equal(typeof now, "function");
  attestation = structuredClone(attestation);
  ownerApprovalReceiptBytes = Buffer.from(ownerApprovalReceiptBytes ?? []);
  ownerApprovalSignatureBytes = Buffer.from(ownerApprovalSignatureBytes ?? []);
  ownerRegistryBytes = Buffer.from(ownerRegistryBytes ?? []);
  const request = validateAmicInternalBaselineAdoptionRequest(candidate, { now: now() });
  const requestSha256 = amicAdoptionSha256(amicAdoptionCanonicalBytes(request));
  const attestationSha256 = amicAdoptionSha256(amicAdoptionCanonicalBytes(attestation));
  const trust = { request, publicKey: authorityPublicKey, publicKeySha256: authorityPublicKeySha256, keyId: authorityKeyId };
  const document = verifyAmicInternalAdoptionAttestation(attestation, { ...trust, now: now() });
  const packetSha256 = amicAdoptionSha256(amicAdoptionCanonicalBytes({ request, attestation_sha256: attestationSha256 }));
  const scope = [`managed-bootstrap:${request.bootstrapMarker.sha256}`, `installation:${request.installationId}`, `installed-receipt:${request.installedReceiptSha256}`];
  const rawApproval = JSON.parse(Buffer.from(ownerApprovalReceiptBytes).toString("utf8"));
  assert.deepEqual(rawApproval.data_scope, scope, "owner approval scope differs");
  assert.deepEqual(rawApproval.contact_scope, []);
  assert.equal(rawApproval.approval_id, request.approvalRef);
  const approvalOptions = { registryBytes: ownerRegistryBytes, receiptBytes: ownerApprovalReceiptBytes,
    signatureBytes: ownerApprovalSignatureBytes, expectedRegistrySha256: ownerRegistrySha256,
    expectedRole: "owner", expectedAction: AMIC_INTERNAL_BASELINE_ADOPTION_ACTION,
    expectedEnvironment: request.environment, expectedPacketSha256: packetSha256,
    expectedSourceSha: request.executorSourceSha, expectedSourceTree: request.executorSourceTree,
    allowedDataScope: scope, allowedContactScope: [] };
  const owner = validateRuntimeSafetyApprovalPayload({ ...approvalOptions, now: now() });
  const assertOwnerTime = (at) => {
    assert.ok(iso(owner.signed_at) >= iso(document.generated_at) && iso(owner.signed_at) <= at,
      "owner approval predates installation authority or is from the future");
    assert.ok(iso(owner.expires_at) > at && iso(owner.expires_at) <= iso(request.expiresAt),
      "owner approval expired or exceeds request expiry");
  };
  assertOwnerTime(now());
  if (!requireInstalledReceipt) return Object.freeze({ request, requestSha256, attestationSha256,
    ownerApprovalSha256: owner.receipt_sha256, installation: document.installation });
  const receiptBytes = Buffer.from(installedReceiptBytes ?? []);
  assert.ok(receiptBytes.length > 0 && receiptBytes.length <= 16 * 1024 * 1024, "installed receipt size invalid");
  assert.equal(amicAdoptionSha256(receiptBytes), request.installedReceiptSha256, "installed receipt digest differs");
  const installed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(receiptBytes));
  assert.ok(iso(installed.captured_at_utc) <= iso(document.generated_at), "installed receipt is from the future");
  const checked = validateAmicOsInternalWindowsStateReceipt(installed, { stage: "installed", canaryId: request.canaryId,
    version: request.bootstrapRelease.version, sourceSha: request.bootstrapRelease.sourceSha,
    sourceTree: request.bootstrapRelease.sourceTree, installerSha256: document.installation.installer_sha256 });
  assert.equal(checked.passed, true, "Windows installed receipt is not a passing measurement");
  const approved = {
    request, requestSha256, attestationSha256, ownerApprovalSha256: owner.receipt_sha256,
    installation: document.installation,
    assertActive(at = now()) {
      validateAmicInternalBaselineAdoptionRequest(request, { now: at });
      verifyAmicInternalAdoptionAttestation(attestation, { ...trust, now: at });
      validateRuntimeSafetyApprovalPayload({ ...approvalOptions, now: at });
      assertOwnerTime(at);
    },
    async assertCurrent(authority) {
      approved.assertActive();
      assert.equal(typeof authority?.readAttestation, "function", "current server installation authority is required");
      const freshEnvelope = await authority.readAttestation({ adoption_id: request.adoptionId, request_sha256: requestSha256, installation_id: request.installationId });
      const fresh = verifyAmicInternalAdoptionAttestation(freshEnvelope, { ...trust, now: now() });
      assert.ok(iso(fresh.generated_at) >= iso(document.generated_at), "current authority snapshot moved backwards");
      const stable = ({ authority_snapshot_at: _observedAt, ...value }) => value;
      assert.deepEqual(stable(fresh.installation), stable(document.installation), "current installation state or release authority changed");
      approved.assertActive();
    },
  };
  VERIFIED.add(approved);
  return Object.freeze(approved);
}

export function validateAmicInternalBaselineAdoptionAuthorization(options) {
  return verifyAdoption(options, false);
}

export function verifyAmicInternalBaselineAdoption(options) {
  return verifyAdoption(options, true);
}

export function assertVerifiedAmicInternalBaselineAdoption(value, { now = Date.now() } = {}) {
  assert.ok(VERIFIED.has(value), "verified owner approval and current signed installation authority are required");
  value.assertActive(now);
  return value;
}

export function parseAmicInternalAdoptionBundle(base64, environment, { now = Date.now } = {}) {
  const decode = (value, label, maximum = 64 * 1024) => {
    assert.equal(typeof value, "string", `${label} must be base64`);
    assert.ok(value.length <= Math.ceil(maximum / 3) * 4, `${label} exceeds input limit`);
    const bytes = Buffer.from(value, "base64");
    assert.ok(bytes.length > 0 && bytes.length <= maximum && bytes.toString("base64") === value, `${label} is not canonical base64`);
    return bytes;
  };
  const bundle = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decode(base64, "adoption bundle")));
  exact(bundle, ["request", "attestation", "ownerApprovalReceipt", "ownerApprovalSignatureBase64", "installedReceiptRef", "retainUntil"], "adoption bundle");
  const options = {
    request: bundle.request, attestation: bundle.attestation,
    ownerApprovalReceiptBytes: Buffer.from(JSON.stringify(bundle.ownerApprovalReceipt)),
    ownerApprovalSignatureBytes: decode(bundle.ownerApprovalSignatureBase64, "owner approval signature", 64),
    ownerRegistryBytes: decode(environment.AMIC_INTERNAL_OWNER_REGISTRY_B64, "owner trust registry"),
    ownerRegistrySha256: environment.AMIC_INTERNAL_OWNER_REGISTRY_SHA256,
    authorityPublicKey: { key: decode(environment.AMIC_INTERNAL_AUTHORITY_PUBLIC_KEY_SPKI_B64, "installation authority public key"), format: "der", type: "spki" },
    authorityPublicKeySha256: environment.AMIC_INTERNAL_AUTHORITY_PUBLIC_KEY_SHA256,
    authorityKeyId: environment.AMIC_INTERNAL_AUTHORITY_KEY_ID, now,
  };
  const approved = validateAmicInternalBaselineAdoptionAuthorization(options);
  assert.equal(bundle.retainUntil, approved.request.retention.controlRetainUntil);
  const ref = bundle.installedReceiptRef;
  exact(ref, ["kind", "key", "version_id", "sha256", "bytes"], "installed receipt reference");
  assert.equal(ref.kind, "windows_installed_receipt");
  assert.equal(ref.key, `internal-unsigned/baseline/adoption-inputs/${approved.requestSha256}/installed.json`, "installed receipt escaped its request scope");
  assert.match(ref.version_id, /^[A-Za-z0-9][A-Za-z0-9._+=/-]{0,1023}$/u);
  assert.notEqual(ref.version_id, "null");
  assert.equal(ref.sha256, approved.request.installedReceiptSha256);
  assert.ok(Number.isSafeInteger(ref.bytes) && ref.bytes > 0 && ref.bytes <= 16 * 1024 * 1024);
  assert.equal(approved.request.environment, "lawos-production", "protected adoption cannot use synthetic authority");
  assert.equal(approved.request.approvalRef, environment.APPROVAL_REF, "owner approval reference differs");
  return { bundle: frozen(bundle), options, approved };
}

export async function readAmicInternalAdoptionInstalledReceipt({ aws, bindings, bundle }) {
  const ref = bundle.installedReceiptRef;
  const input = { bucket: bindings.bucket, key: ref.key, versionId: ref.version_id, expectedOwner: bindings.accountId };
  const check = (response) => {
    assert.equal(response.VersionId, ref.version_id);
    assert.equal(Number(response.ContentLength), ref.bytes);
    assert.equal(response.ServerSideEncryption, "aws:kms");
    assert.equal(response.SSEKMSKeyId, bindings.kmsKeyArn);
    assert.equal(response.ChecksumSHA256, Buffer.from(ref.sha256, "hex").toString("base64"));
    assert.equal(response.ObjectLockMode, "COMPLIANCE");
    assert.equal(new Date(response.ObjectLockRetainUntilDate).toISOString(), bundle.retainUntil);
    assert.equal(response.Metadata?.["artifact-sha256"], ref.sha256);
    assert.equal(response.Metadata?.["artifact-kind"], ref.kind);
  };
  check(await aws.headObject(input));
  const response = await aws.getObjectBody(input);
  check(response);
  const bytes = Buffer.from(response.body ?? []);
  assert.equal(bytes.length, ref.bytes);
  assert.equal(amicAdoptionSha256(bytes), ref.sha256, "immutable installed receipt body differs");
  return bytes;
}

export function createAmicInternalAdoptionAuthorityReader({ apiBaseUrl, sessionToken, fetch = globalThis.fetch } = {}) {
  // This operation is bound to the canonical production API; a dispatch input cannot redirect the session token.
  assert.equal(apiBaseUrl, "https://9mg4liadm6.execute-api.ap-northeast-2.amazonaws.com");
  assert.ok(typeof sessionToken === "string" && sessionToken.length >= 16 && sessionToken.length <= 16 * 1024 && !/\s/u.test(sessionToken), "current signed session is required");
  return Object.freeze({
    async readAttestation(input) {
      const response = await fetch(`${apiBaseUrl}/api/desktop/internal-updates/baseline-adoption-attestation`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify(input),
      });
      assert.equal(response.status, 200, "current installation authority request failed");
      assert.match(response.headers.get("content-type") ?? "", /^application\/json(?:;|$)/iu);
      const reader = response.body?.getReader();
      assert.ok(reader, "current installation authority has no bounded response");
      let bytes = Buffer.alloc(0);
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          assert.ok(bytes.length + part.value.length <= 32 * 1024, "current installation authority response too large");
          bytes = Buffer.concat([bytes, part.value]);
        }
      } finally { await reader.cancel(); }
      const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      exact(value, ["request_id", "outcome", "attestation", "safe_error_codes", "token_material_returned", "production_ready_claim"], "current installation response");
      assert.equal(value.outcome, "attested");
      assert.deepEqual(value.safe_error_codes, []);
      assert.equal(value.token_material_returned, false);
      assert.equal(value.production_ready_claim, false);
      return value.attestation;
    },
  });
}
