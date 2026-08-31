import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";

const SHA256 = /^[a-f0-9]{64}$/u;
const OPERATION_ID = /^vaultop_[a-f0-9]{32}$/u;
const DEFAULT_LEASE_MS = 30_000;
const ownerByRepository = new WeakMap();

export class VaultOperationOwnerError extends Error {
  constructor(safeErrorCode, message, status = 409, details = {}) {
    super(message);
    this.name = "VaultOperationOwnerError";
    this.code = `LAWOS_${safeErrorCode}`;
    this.safe_error_code = safeErrorCode;
    this.status = status;
    Object.assign(this, details);
  }
}

function requiredText(value, field) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function ownerKey({ tenantId, operationId }) {
  return `${tenantId}\u001f${operationId}`;
}

function claimKey({ operationId, leaseEpoch }) {
  return `amic-os-vault-operation-owner:${operationId}:${leaseEpoch}`;
}

function conflict(message = "Vault operation owner binding changed") {
  return new VaultOperationOwnerError(
    "VAULT_OPERATION_IDEMPOTENCY_CONFLICT",
    message,
    409,
  );
}

/**
 * One operation owner is registered before provider I/O. The in-process promise
 * makes duplicate callers share the canonical result, while Repository Port v2
 * makes a different API process fail closed before provider I/O. A bounded
 * lease epoch permits recovery after an owner process disappears.
 */
export function createVaultOperationOwner({
  repository = null,
  now = Date.now,
  leaseMs = DEFAULT_LEASE_MS,
} = {}) {
  if (repository != null && typeof repository.claimIdempotency !== "function") {
    throw new TypeError("Vault operation owner repository must support claimIdempotency");
  }
  if (typeof now !== "function"
      || !Number.isSafeInteger(leaseMs)
      || leaseMs < 1_000
      || leaseMs > 5 * 60_000) {
    throw new TypeError("Vault operation owner lease is invalid");
  }
  const inFlight = new Map();

  function run({
    tenantId,
    operationId,
    requestFingerprint,
    operation,
  } = {}) {
    const tenant = requiredText(tenantId, "tenantId");
    if (!OPERATION_ID.test(operationId ?? "")) {
      throw new TypeError("operationId is invalid");
    }
    if (!SHA256.test(requestFingerprint ?? "")) {
      throw new TypeError("requestFingerprint is invalid");
    }
    if (typeof operation !== "function") {
      throw new TypeError("Vault operation callback is required");
    }
    const key = ownerKey({ tenantId: tenant, operationId });
    const current = inFlight.get(key);
    if (current) {
      if (current.requestFingerprint !== requestFingerprint) throw conflict();
      return current.promise;
    }

    const startedAt = now();
    if (!Number.isFinite(startedAt)) throw new TypeError("Vault operation owner clock is invalid");
    const leaseEpoch = Math.floor(startedAt / leaseMs);
    const leaseExpiresAt = (leaseEpoch + 1) * leaseMs;
    const promise = (async () => {
      if (repository) {
        let claimed;
        try {
          claimed = await repository.claimIdempotency({
            tenant_id: tenant,
            key: claimKey({ operationId, leaseEpoch }),
            request_hash: requestFingerprint,
            response: Object.freeze({
              schema_version: "law-firm-os.vault-operation-owner.v1",
              state: "claimed",
              lease_epoch: leaseEpoch,
              lease_expires_at: new Date(leaseExpiresAt).toISOString(),
              operation_ref_sha256: hashDomainValue({ operation_id: operationId }),
              source_bytes_included: false,
            }),
            created_at: new Date(startedAt).toISOString(),
          });
        } catch (error) {
          if (error?.safe_error_code === "IDEMPOTENCY_KEY_REUSED"
              || error?.code === "LAWOS_IDEMPOTENCY_CONFLICT") {
            throw conflict();
          }
          throw error;
        }
        if (claimed?.replayed === true) {
          throw new VaultOperationOwnerError(
            "VAULT_OPERATION_IN_PROGRESS",
            "Another API process owns this Vault operation",
            409,
            {
              retryable: true,
              retry_after_ms: Math.max(250, leaseExpiresAt - now()),
            },
          );
        }
      }
      return operation();
    })();
    const flight = Object.freeze({ requestFingerprint, promise });
    inFlight.set(key, flight);
    void promise.finally(() => {
      if (inFlight.get(key) === flight) inFlight.delete(key);
    }).catch(() => undefined);
    return promise;
  }

  return Object.freeze({
    authority: repository ? "repository-port-v2" : "process-single-flight",
    lease_ms: leaseMs,
    run,
    inFlightCountForTest() {
      return inFlight.size;
    },
  });
}

export function vaultOperationOwnerForRuntime(runtime) {
  if (typeof runtime?.operation_owner?.run === "function") {
    return runtime.operation_owner;
  }
  const repository = runtime?.repository;
  if (!repository || typeof repository !== "object") {
    throw new VaultOperationOwnerError(
      "VAULT_OPERATION_OWNER_UNAVAILABLE",
      "Vault operation owner is unavailable",
      503,
    );
  }
  let owner = ownerByRepository.get(repository);
  if (!owner) {
    owner = createVaultOperationOwner({
      repository: typeof repository.claimIdempotency === "function"
        ? repository
        : null,
    });
    ownerByRepository.set(repository, owner);
  }
  return owner;
}
