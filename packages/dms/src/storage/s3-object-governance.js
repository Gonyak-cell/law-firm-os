import {
  GetObjectLegalHoldCommand,
  GetObjectRetentionCommand,
  PutObjectLegalHoldCommand,
  PutObjectRetentionCommand,
} from "@aws-sdk/client-s3";
import { assertTenantId } from "./storage-adapter.js";

function codedError(message, code) {
  return Object.assign(new Error(message), { code });
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function isObjectGovernanceUnset(error) {
  return error?.name === "NoSuchObjectLockConfiguration"
    || error?.Code === "NoSuchObjectLockConfiguration"
    || error?.code === "NoSuchObjectLockConfiguration";
}

export function createS3ObjectGovernance({
  client,
  common,
  keyFor,
  statObject,
  objectLockEnabled,
  defaultRetentionDays,
  clock,
} = {}) {
  async function ensureDefaultRetention(key, versionId) {
    if (defaultRetentionDays == null) return false;
    let retention = null;
    try {
      retention = await client.send(new GetObjectRetentionCommand({
        ...common,
        Key: key,
        VersionId: versionId ?? undefined,
      }));
    } catch (error) {
      if (!isObjectGovernanceUnset(error)) throw error;
    }
    if (retention?.Retention?.RetainUntilDate) return false;
    const now = new Date(clock());
    if (!Number.isFinite(now.getTime())) throw new TypeError("S3 adapter clock returned an invalid timestamp");
    const retainUntil = new Date(now.getTime() + defaultRetentionDays * 24 * 60 * 60 * 1000);
    await client.send(new PutObjectRetentionCommand({
      ...common,
      Key: key,
      VersionId: versionId ?? undefined,
      Retention: { Mode: "GOVERNANCE", RetainUntilDate: retainUntil },
    }));
    return true;
  }

  async function activeRetention(key, versionId) {
    let retention = null;
    try {
      retention = await client.send(new GetObjectRetentionCommand({
        ...common,
        Key: key,
        VersionId: versionId ?? undefined,
      }));
    } catch (error) {
      if (!isObjectGovernanceUnset(error)) throw error;
    }
    const mode = retention?.Retention?.Mode;
    const retainUntil = retention?.Retention?.RetainUntilDate;
    const now = new Date(clock()).getTime();
    if (!Number.isFinite(now)) throw new TypeError("S3 adapter clock returned an invalid timestamp");
    const retainUntilTime = retainUntil ? new Date(retainUntil).getTime() : NaN;
    return ["GOVERNANCE", "COMPLIANCE"].includes(mode)
      && Number.isFinite(retainUntilTime)
      && retainUntilTime > now;
  }

  function assertObjectLock() {
    if (!objectLockEnabled) {
      throw codedError("S3 Object Lock is not enabled for this adapter", "DMS_PROVIDER_RETENTION_NOT_CONFIGURED");
    }
  }

  async function currentVersion({ tenant_id, object_id }) {
    const receipt = await statObject({ tenant_id, object_id });
    if (!receipt) throw codedError("committed object was not found", "DMS_COMMITTED_OBJECT_NOT_FOUND");
    return receipt;
  }

  async function setObjectLegalHold({ tenant_id, object_id, status = "ON" } = {}) {
    assertObjectLock();
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const legalHoldStatus = String(status).toUpperCase();
    if (!["ON", "OFF"].includes(legalHoldStatus)) throw new TypeError("legal hold status must be ON or OFF");
    const current = await currentVersion({ tenant_id: tenantId, object_id: objectId });
    await client.send(new PutObjectLegalHoldCommand({
      ...common,
      Key: keyFor({ tenant_id: tenantId, object_id: objectId }),
      VersionId: current.version_id ?? undefined,
      LegalHold: { Status: legalHoldStatus },
    }));
    return Object.freeze({ status: legalHoldStatus, version_id: current.version_id });
  }

  async function getObjectLegalHold({ tenant_id, object_id } = {}) {
    assertObjectLock();
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const current = await currentVersion({ tenant_id: tenantId, object_id: objectId });
    let response = null;
    try {
      response = await client.send(new GetObjectLegalHoldCommand({
        ...common,
        Key: keyFor({ tenant_id: tenantId, object_id: objectId }),
        VersionId: current.version_id ?? undefined,
      }));
    } catch (error) {
      if (!isObjectGovernanceUnset(error)) throw error;
    }
    return Object.freeze({ status: response?.LegalHold?.Status ?? "OFF", version_id: current.version_id });
  }

  async function setObjectRetention({ tenant_id, object_id, retain_until, mode = "GOVERNANCE" } = {}) {
    assertObjectLock();
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const retainUntil = new Date(requireString(retain_until, "retain_until"));
    const retentionMode = String(mode).toUpperCase();
    if (!Number.isFinite(retainUntil.getTime())) throw new TypeError("retain_until is invalid");
    if (!["GOVERNANCE", "COMPLIANCE"].includes(retentionMode)) throw new TypeError("retention mode is invalid");
    const current = await currentVersion({ tenant_id: tenantId, object_id: objectId });
    await client.send(new PutObjectRetentionCommand({
      ...common,
      Key: keyFor({ tenant_id: tenantId, object_id: objectId }),
      VersionId: current.version_id ?? undefined,
      Retention: { Mode: retentionMode, RetainUntilDate: retainUntil },
    }));
    return Object.freeze({ mode: retentionMode, retain_until: retainUntil.toISOString(), version_id: current.version_id });
  }

  async function getObjectRetention({ tenant_id, object_id } = {}) {
    assertObjectLock();
    const tenantId = assertTenantId(tenant_id);
    const objectId = requireString(object_id, "object_id");
    const current = await currentVersion({ tenant_id: tenantId, object_id: objectId });
    let response = null;
    try {
      response = await client.send(new GetObjectRetentionCommand({
        ...common,
        Key: keyFor({ tenant_id: tenantId, object_id: objectId }),
        VersionId: current.version_id ?? undefined,
      }));
    } catch (error) {
      if (!isObjectGovernanceUnset(error)) throw error;
    }
    return Object.freeze({
      mode: response?.Retention?.Mode ?? null,
      retain_until: response?.Retention?.RetainUntilDate?.toISOString?.() ?? null,
      version_id: current.version_id,
    });
  }

  return Object.freeze({
    ensureDefaultRetention,
    activeRetention,
    setObjectLegalHold,
    getObjectLegalHold,
    setObjectRetention,
    getObjectRetention,
  });
}
