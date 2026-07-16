import { createHash } from "node:crypto";

export const REPOSITORY_PORT_V2_VERSION = "law-firm-os.repository-port.v2";
export const REPOSITORY_PORT_V2_METHODS = Object.freeze([
  "read",
  "write",
  "transaction",
  "claimIdempotency",
  "appendAudit",
  "listAudit",
]);

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
  );
}

export function hashRepositoryRequest(value) {
  return createHash("sha256").update(JSON.stringify(canonicalValue(value ?? null))).digest("hex");
}

export function requireRepositoryTenantId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("tenant_id is required");
  }
  return value.trim();
}

export function normalizeRepositoryPortV2Record(input = {}) {
  const tenantId = requireRepositoryTenantId(input.tenant_id);
  const recordType = String(input.record_type ?? "").trim();
  const recordId = String(input.record_id ?? "").trim();
  const stateVersion = Number(input.state_version ?? 0);
  if (!recordType) throw new TypeError("record_type is required");
  if (!recordId) throw new TypeError("record_id is required");
  if (!Number.isSafeInteger(stateVersion) || stateVersion < 0) {
    throw new TypeError("state_version must be a non-negative integer");
  }
  return Object.freeze({
    tenant_id: tenantId,
    record_type: recordType,
    record_id: recordId,
    state_version: stateVersion,
    data: structuredClone(input.data ?? {}),
    created_at: input.created_at ?? null,
    updated_at: input.updated_at ?? null,
  });
}

export class RepositoryConflictError extends Error {
  constructor(message = "repository version conflict", details = {}) {
    super(message);
    this.name = "RepositoryConflictError";
    this.code = "LAWOS_REPOSITORY_CONFLICT";
    this.safe_error_code = "REPOSITORY_VERSION_CONFLICT";
    this.status = 409;
    this.retryable = false;
    Object.assign(this, details);
  }
}

export class RepositoryIdempotencyConflictError extends Error {
  constructor(message = "idempotency key reused with a different request", details = {}) {
    super(message);
    this.name = "RepositoryIdempotencyConflictError";
    this.code = "LAWOS_IDEMPOTENCY_CONFLICT";
    this.safe_error_code = "IDEMPOTENCY_KEY_REUSED";
    this.status = 409;
    this.retryable = false;
    Object.assign(this, details);
  }
}

export function assertRepositoryPortV2(port) {
  if (!port || port.contract_version !== REPOSITORY_PORT_V2_VERSION) {
    throw new TypeError(`repository must implement ${REPOSITORY_PORT_V2_VERSION}`);
  }
  for (const method of REPOSITORY_PORT_V2_METHODS) {
    if (typeof port[method] !== "function") throw new TypeError(`repository v2 method is required: ${method}`);
  }
  return port;
}
