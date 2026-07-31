import {
  HRX_DOMAIN_ID,
  createHrxOperationalDomainSnapshot,
  getHrxMaterializedBaseline,
  materializeHrxStoreFromPostgres,
} from "../../../packages/hrx/src/postgres-store-v2.js";
import {
  HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED,
  createPayrollRepository,
} from "../../../packages/hrx/src/payroll/repository.js";
import { hashDomainValue } from "../../../packages/persistence/src/domain-ledger.js";
import { flushDomainSnapshotToScopedLedger } from "../../../packages/persistence/src/record-domain-adapter.js";

const CHECKPOINT_RETRY_LIMIT = 3;
const CHECKPOINT_RETRYABLE_CODES = new Set([
  "23505",
  "40001",
  "40P01",
  "DOMAIN_BASELINE_CONFLICT",
  "HRX_POSTGRES_BASELINE_CONFLICT",
  "POSTGRES_UNIQUE_CONFLICT",
  "REPOSITORY_VERSION_CONFLICT",
]);

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function requiredHash(value, name) {
  const hash = requiredText(value, name);
  if (!/^[a-f0-9]{64}$/u.test(hash)) throw new TypeError(`${name} must be a SHA-256 hash`);
  return hash;
}

function checkpointContext(context = {}) {
  return Object.freeze({
    tenant_id: requiredText(context.tenant_id, "tenant_id"),
    actor_id: requiredText(context.actor_id, "actor_id"),
  });
}

function isRetryable(error) {
  return CHECKPOINT_RETRYABLE_CODES.has(error?.code)
    || CHECKPOINT_RETRYABLE_CODES.has(error?.safe_error_code);
}

export function createPostgresPayrollReconciliationCheckpoint({
  ledger,
  clock,
} = {}) {
  if (!ledger || typeof ledger.transaction !== "function") {
    throw new TypeError("PostgreSQL domain ledger is required for the payroll reconciliation checkpoint");
  }

  async function mutate(contextInput, {
    action,
    idempotency_key: idempotencyKey,
    request_hash: requestHash,
    result_hash: resultHash = null,
    apply,
  }) {
    const context = checkpointContext(contextInput);
    const key = requiredText(idempotencyKey, "idempotency_key");
    const requestDigest = requiredHash(requestHash, "request_hash");
    if (resultHash != null) requiredHash(resultHash, "result_hash");
    if (typeof apply !== "function") throw new TypeError("checkpoint mutation callback is required");
    const centralKey = `payroll-bank-reconciliation:${action}:${hashDomainValue({
      tenant_id: context.tenant_id,
      idempotency_key: key,
      request_hash: requestDigest,
      result_hash: resultHash,
    })}`;

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await ledger.transaction({
          tenant_id: context.tenant_id,
          domain_id: HRX_DOMAIN_ID,
        }, async (tx) => {
          const store = await materializeHrxStoreFromPostgres({
            ledger: tx,
            tenant_id: context.tenant_id,
          });
          try {
            const repository = createPayrollRepository({
              store,
              ...(clock ? { clock } : {}),
            });
            const result = apply(repository, context);
            const baseline = getHrxMaterializedBaseline(store);
            const source = createHrxOperationalDomainSnapshot({
              store,
              tenant_id: context.tenant_id,
              request_context: {
                method: "POST",
                pathname: `/__checkpoint/hrx/payroll/bank-reconciliation/${action}`,
                actor_id: context.actor_id,
                idempotency_key: centralKey,
                request_target_hash: hashDomainValue({ action, key_hash: hashDomainValue(key) }),
                request_body_hash: hashDomainValue({
                  request_hash: requestDigest,
                  result_hash: resultHash,
                }),
              },
            });
            await flushDomainSnapshotToScopedLedger({
              tx,
              source,
              tenant_id: context.tenant_id,
              domain_id: HRX_DOMAIN_ID,
              expected_baseline: baseline,
            });
            return result;
          } finally {
            store.close();
          }
        });
      } catch (error) {
        if (!isRetryable(error) || attempt + 1 >= CHECKPOINT_RETRY_LIMIT) throw error;
      }
    }
  }

  async function claim(context, claimInput = {}) {
    const request = claimInput.provider_request ?? {};
    return mutate(context, {
      action: "claim",
      idempotency_key: request.idempotency_key,
      request_hash: request.request_hash,
      apply(repository, scopedContext) {
        return repository.beginProviderOperation(scopedContext, {
          provider_kind: "bank",
          operation: "bulk_transfer_reconcile",
          idempotency_key: requiredText(request.idempotency_key, "idempotency_key"),
          request_hash: requiredHash(request.request_hash, "request_hash"),
          maximum_attempts: Number(
            claimInput.maximum_attempts
            ?? claimInput.operation?.maximum_attempts
            ?? 3,
          ),
        });
      },
    });
  }

  async function expire(context, claimInput = {}) {
    const request = claimInput.provider_request ?? {};
    return mutate(context, {
      action: "manual-required",
      idempotency_key: request.idempotency_key,
      request_hash: request.request_hash,
      result_hash: hashDomainValue({
        state: "unknown",
        safe_error_code: HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED,
      }),
      apply(repository, scopedContext) {
        return repository.expirePaymentReconciliationClaim(scopedContext, {
          idempotency_key: requiredText(request.idempotency_key, "idempotency_key"),
          request_hash: requiredHash(request.request_hash, "request_hash"),
          lease_duration_ms: Number(claimInput.lease_duration_ms ?? 15 * 60 * 1000),
        });
      },
    });
  }

  async function stage(context, claimInput = {}, validated = {}) {
    const request = claimInput.provider_request ?? {};
    return mutate(context, {
      action: "stage",
      idempotency_key: request.idempotency_key,
      request_hash: request.request_hash,
      result_hash: validated.result_payload_hash,
      apply(repository, scopedContext) {
        const current = repository.getProviderOperation(scopedContext, {
          provider_kind: "bank",
          idempotency_key: requiredText(request.idempotency_key, "idempotency_key"),
        });
        if (!current) {
          const error = new Error("Durable bank reconciliation claim is missing");
          error.safe_error_code = "HRX_PAYROLL_NOT_FOUND";
          error.status = 404;
          throw error;
        }
        return repository.stagePaymentReconciliationResult(scopedContext, {
          provider_kind: "bank",
          idempotency_key: request.idempotency_key,
          request_hash: requiredHash(request.request_hash, "request_hash"),
          provider_receipt_id: requiredText(validated.receipt?.receipt_id, "provider_receipt_id"),
          provider_response_hash: requiredHash(validated.provider_response_hash, "provider_response_hash"),
          result_payload: validated.result_payload,
          result_payload_hash: requiredHash(validated.result_payload_hash, "result_payload_hash"),
          expected_version: current.state_version,
        });
      },
    });
  }

  async function fail(context, claimInput = {}, error) {
    const request = claimInput.provider_request ?? {};
    return mutate(context, {
      action: "unknown",
      idempotency_key: request.idempotency_key,
      request_hash: request.request_hash,
      result_hash: hashDomainValue({
        safe_error_code: HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED,
      }),
      apply(repository, scopedContext) {
        const current = repository.getProviderOperation(scopedContext, {
          provider_kind: "bank",
          idempotency_key: requiredText(request.idempotency_key, "idempotency_key"),
        });
        if (!current || current.state !== "in_progress") {
          return Object.freeze({ operation: current ?? null, idempotent_replay: true });
        }
        return repository.completeProviderOperation(scopedContext, {
          provider_kind: "bank",
          idempotency_key: request.idempotency_key,
          state: "unknown",
          safe_error_code: HRX_PAYMENT_RECONCILIATION_MANUAL_REQUIRED,
          expected_version: current.state_version,
        });
      },
    });
  }

  return Object.freeze({
    kind: "postgres-payroll-bank-reconciliation-checkpoint",
    claim,
    expire,
    stage,
    fail,
  });
}
