import assert from "node:assert/strict";
import { createPublicKey } from "node:crypto";
import { withPostgresTransaction } from "../../packages/persistence/src/postgres/transaction.js";
import {
  canonicalizeJson, sha256Hex, validateRuntimeSafetyApprovalPayload,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import { validateAmicOsInternalWindowsStateReceipt } from "../validate-amic-os-internal-windows-state.mjs";
import { verifyAmicInternalManagedBootstrapReadback } from "./amic-os-internal-distribution-readback.mjs";

export const INTERNAL_INSTALLATION_AUTHORIZE_ACTION = "lawos-amic-internal-installation-authorize";
export const INTERNAL_INSTALLATION_REVOKE_ACTION = "lawos-amic-internal-installation-revoke";
export const INTERNAL_INSTALLATION_CONTROL_SCHEMA = "lawos.internal-unsigned-installation-control.v1";
const DATA_SCOPE = ["internal-unsigned-installation-authority"];
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const SHA1 = /^[0-9a-f]{40}$/u;
const COMMON = ["schema_version", "action", "environment", "tenant_id", "authorization_id",
  "executor_source_sha", "executor_source_tree"];
const AUTHORIZE = [...COMMON, "user_id", "entra_subject_id", "device_public_key_spki_pem",
  "device_key_fingerprint", "installed_receipt_sha256", "canary_id", "bootstrap_release",
  "bootstrap_marker", "installer_ref", "valid_from", "valid_until"];
const REVOKE = [...COMMON, "expected_release_authority_sha256", "revocation_id", "reason"];

function exact(value, fields, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} is not an object`);
  assert.deepEqual(Object.keys(value).sort(), [...fields].sort(), `${label} fields differ`);
}

function timestamp(value, label) {
  assert.equal(typeof value, "string", `${label} is not a timestamp`);
  assert.equal(new Date(value).toISOString(), value, `${label} is not canonical UTC`);
  return Date.parse(value);
}

export function internalUnsignedInstallationRequestSha256(request) {
  return sha256Hex(Buffer.from(`${canonicalizeJson(request)}\n`));
}

function validateRequest(request, config, action, now) {
  exact(request, action === INTERNAL_INSTALLATION_AUTHORIZE_ACTION ? AUTHORIZE : REVOKE, "control request");
  assert.equal(request.schema_version, INTERNAL_INSTALLATION_CONTROL_SCHEMA);
  assert.equal(request.action, action);
  assert.equal(request.environment, config.environment);
  assert.equal(request.executor_source_sha, config.executorSourceSha);
  assert.equal(request.executor_source_tree, config.executorSourceTree);
  for (const field of ["tenant_id", "authorization_id"]) assert.match(request[field] ?? "", ID, field);
  if (action === INTERNAL_INSTALLATION_REVOKE_ACTION) {
    assert.match(request.expected_release_authority_sha256 ?? "", SHA256);
    for (const field of ["revocation_id", "reason"]) assert.match(request[field] ?? "", ID, field);
    return;
  }
  for (const field of ["user_id", "entra_subject_id", "canary_id"]) assert.match(request[field] ?? "", ID, field);
  for (const field of ["device_key_fingerprint", "installed_receipt_sha256"]) {
    assert.match(request[field] ?? "", SHA256, field);
  }
  assert.equal(typeof request.device_public_key_spki_pem, "string");
  assert.ok(request.device_public_key_spki_pem.length <= 1024);
  const deviceKey = createPublicKey(request.device_public_key_spki_pem);
  assert.equal(deviceKey.asymmetricKeyType, "ed25519", "device key must be Ed25519");
  assert.equal(deviceKey.export({ type: "spki", format: "pem" }), request.device_public_key_spki_pem,
    "device key PEM is not canonical");
  assert.equal(sha256Hex(deviceKey.export({ type: "spki", format: "der" })), request.device_key_fingerprint,
    "device key fingerprint differs");
  const from = timestamp(request.valid_from, "valid_from");
  const until = timestamp(request.valid_until, "valid_until");
  assert.ok(from <= now && now < until && until - from <= 31 * 86400000, "grant validity window differs");
  assert.equal(request.bootstrap_release?.lawosTenantId, request.tenant_id, "bootstrap tenant differs");
  assert.ok(from >= timestamp(request.bootstrap_release.generatedAt, "bootstrap generatedAt")
    && until <= timestamp(request.bootstrap_release.expiresAt, "bootstrap expiresAt"),
  "grant escaped bootstrap validity window");
}

function verifyOwnerApproval(request, approval, config, now) {
  const receipt = JSON.parse(Buffer.from(approval?.receiptBytes ?? []));
  assert.deepEqual(receipt.data_scope, DATA_SCOPE, "owner data scope differs");
  assert.deepEqual(receipt.contact_scope, [], "owner contact scope differs");
  const verified = validateRuntimeSafetyApprovalPayload({
    registryBytes: approval.registryBytes, receiptBytes: approval.receiptBytes,
    signatureBytes: approval.signatureBytes, expectedRegistrySha256: config.expectedRegistrySha256,
    expectedRole: config.expectedRole, expectedAction: request.action, expectedEnvironment: config.environment,
    expectedPacketSha256: internalUnsignedInstallationRequestSha256(request),
    expectedSourceSha: config.executorSourceSha, expectedSourceTree: config.executorSourceTree,
    allowedDataScope: DATA_SCOPE, allowedContactScope: [], now,
  });
  assert.equal(verified.decision, "approved", "owner approval rejected");
  assert.ok(Date.parse(verified.signed_at) <= now && now < Date.parse(verified.expires_at),
    "owner approval is not currently active");
  return verified;
}

async function mutate(controlPool, operation, tenantId, payload, beforeWrite) {
  return withPostgresTransaction(controlPool, { tenant_id: tenantId, isolationLevel: "serializable" }, async (client) => {
    beforeWrite();
    const response = await client.query(
      `SELECT lawos_email_dms.${operation}($1::text, $2::jsonb) AS result`,
      [tenantId, JSON.stringify(payload)],
    );
    assert.equal(response.rows?.length, 1, "control authority response row count differs");
    const result = response.rows[0].result;
    const authorizing = operation === "authorize_internal_unsigned_release";
    exact(result, authorizing ? ["authorization_id", "release_authority_sha256", "authorized_at"]
      : ["authorization_id", "revocation_id", "revoked_at"], "control authority response");
    assert.equal(result.authorization_id, payload.authorization_id);
    assert.equal(authorizing ? result.release_authority_sha256 : result.revocation_id,
      authorizing ? payload.release_authority_sha256 : payload.revocation_id);
    assert.ok(Number.isFinite(Date.parse(authorizing ? result.authorized_at : result.revoked_at)));
    beforeWrite();
    return Object.freeze(result);
  });
}

// This is an operator-only executor; database EXECUTE grants enforce the control role.
export function createInternalUnsignedInstallationReleaseControl({
  controlPool, aws, bindings, cloudFrontDomain, trustedPublicKey, expectedPublicKeySha256,
  expectedRegistrySha256, expectedRole, environment, executorSourceSha, executorSourceTree,
  clock = Date.now,
} = {}) {
  assert.equal(typeof controlPool?.connect, "function", "control pool is required");
  for (const [value, pattern] of [[expectedRegistrySha256, SHA256], [expectedPublicKeySha256, SHA256],
    [executorSourceSha, SHA1], [executorSourceTree, SHA1], [expectedRole, ID], [environment, ID]]) {
    assert.match(value ?? "", pattern, "trusted control configuration differs");
  }
  assert.equal(typeof clock, "function");
  const config = Object.freeze({ expectedRegistrySha256, expectedRole, environment, executorSourceSha, executorSourceTree });
  const currentTime = () => {
    const value = Number(clock());
    assert.ok(Number.isFinite(value), "control clock is invalid");
    return value;
  };
  return Object.freeze({
    async authorize({ request: input, installedReceiptBytes, approval: approvalInput } = {}) {
      const request = structuredClone(input);
      const approval = Object.fromEntries(["registryBytes", "receiptBytes", "signatureBytes"]
        .map((key) => [key, Buffer.from(approvalInput?.[key] ?? [])]));
      const now = currentTime();
      validateRequest(request, config, INTERNAL_INSTALLATION_AUTHORIZE_ACTION, now);
      const owner = verifyOwnerApproval(request, approval, config, now);
      const bytes = Buffer.from(installedReceiptBytes ?? []);
      assert.ok(bytes.length > 0 && bytes.length <= 64 * 1024 * 1024, "installed receipt size differs");
      assert.equal(sha256Hex(bytes), request.installed_receipt_sha256, "installed receipt bytes differ");
      const installed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      const release = request.bootstrap_release;
      const receipt = validateAmicOsInternalWindowsStateReceipt(installed, {
        stage: "installed", canaryId: request.canary_id, version: release.version,
        sourceSha: release.sourceSha, sourceTree: release.sourceTree, installerSha256: request.installer_ref?.sha256,
      });
      assert.equal(receipt.passed, true, "Windows installed receipt failed");
      assert.ok(Date.parse(installed.captured_at_utc) >= Date.parse(release.generatedAt)
        && Date.parse(installed.captured_at_utc) <= Date.parse(owner.signed_at), "installed observation time differs");
      assert.equal(installed.observed.package_metadata.update_trust.public_key_spki_sha256,
        expectedPublicKeySha256, "installed update trust root differs");
      let markerBytes;
      const bootstrap = await verifyAmicInternalManagedBootstrapReadback({
        aws: {
          getObjectBody: async (args) => {
            const response = await aws.getObjectBody(args);
            if (args.key !== request.bootstrap_marker.key || args.versionId !== request.bootstrap_marker.version_id) {
              return response;
            }
            assert.equal(markerBytes, undefined, "bootstrap marker was read repeatedly");
            assert.ok(response.body?.byteLength <= 2 * 1024 * 1024, "bootstrap marker is unbounded");
            markerBytes = Buffer.from(response.body);
            return { ...response, body: markerBytes };
          },
          listObjectVersions: (args) => aws.listObjectVersions(args),
          probeAnonymousAccess: (args) => aws.probeAnonymousAccess(args),
        },
        bindings, bootstrapMarker: request.bootstrap_marker, expectedRelease: release,
        trustedPublicKey, expectedPublicKeySha256, cloudFrontDomain, now,
      });
      const envelope = JSON.parse(markerBytes);
      const manifest = JSON.parse(Buffer.from(envelope.document_base64, "base64"));
      assert.deepEqual(manifest.artifacts.installer, request.installer_ref, "approved installer reference differs");
      assert.equal(installed.observed.build_manifest_file.sha256, manifest.artifacts.build_manifest.sha256,
        "installed build manifest hash differs from signed bootstrap artifact");
      assert.equal(installed.observed.build_manifest_file.bytes, manifest.artifacts.build_manifest.bytes,
        "installed build manifest size differs from signed bootstrap artifact");
      assert.equal(installed.observed.package_metadata.build_manifest.sha256, installed.observed.build_manifest_file.sha256,
        "installed build manifest metadata hash differs from measured file");
      const grant = {
        tenant_id: request.tenant_id, authorization_id: request.authorization_id, user_id: request.user_id,
        entra_subject_id: request.entra_subject_id, device_key_fingerprint: request.device_key_fingerprint,
        installed_receipt_sha256: request.installed_receipt_sha256, app_id: release.appId,
        platform: release.platform, architecture: release.architecture, channel: "internal-unsigned",
        release_id: release.releaseId, release_sequence: release.releaseSequence, version: release.version,
        source_sha: release.sourceSha, source_tree: release.sourceTree,
        installer_sha256: request.installer_ref.sha256, installer_bytes: request.installer_ref.bytes,
        installer_version_id: request.installer_ref.version_id, bootstrap_marker_sha256: request.bootstrap_marker.sha256,
        owner_approval_sha256: owner.receipt_sha256, valid_from: request.valid_from, valid_until: request.valid_until,
      };
      grant.release_authority_sha256 = sha256Hex(canonicalizeJson(grant));
      const result = await mutate(controlPool, "authorize_internal_unsigned_release", request.tenant_id, grant, () => {
        const current = currentTime();
        validateRequest(request, config, INTERNAL_INSTALLATION_AUTHORIZE_ACTION, current);
        verifyOwnerApproval(request, approval, config, current);
      });
      return Object.freeze({ ...result, request_sha256: internalUnsignedInstallationRequestSha256(request),
        bootstrap_readback_sha256: bootstrap.receipt_sha256 });
    },
    async revoke({ request: input, approval: approvalInput } = {}) {
      const request = structuredClone(input);
      const approval = Object.fromEntries(["registryBytes", "receiptBytes", "signatureBytes"]
        .map((key) => [key, Buffer.from(approvalInput?.[key] ?? [])]));
      validateRequest(request, config, INTERNAL_INSTALLATION_REVOKE_ACTION, currentTime());
      const owner = verifyOwnerApproval(request, approval, config, currentTime());
      const payload = Object.fromEntries(["authorization_id", "expected_release_authority_sha256", "revocation_id", "reason"]
        .map((key) => [key, request[key]]));
      payload.owner_approval_sha256 = owner.receipt_sha256;
      return mutate(controlPool, "revoke_internal_unsigned_release", request.tenant_id, payload,
        () => verifyOwnerApproval(request, approval, config, currentTime()));
    },
  });
}
