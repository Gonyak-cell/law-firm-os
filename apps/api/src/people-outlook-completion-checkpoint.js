import {
  EMAIL_DMS_DOMAIN_DESCRIPTOR,
} from "../../../packages/email-dms/src/central-ledger.js";
import {
  createEmailDmsRepository,
} from "../../../packages/email-dms/src/repository.js";
import { createDomainSnapshot } from "../../../packages/persistence/src/domain-ledger.js";
import {
  applyCommittedStateVersions,
  createRecordRepositoryDomainSnapshot,
  flushDomainSnapshotToScopedLedger,
  materializeRecordRepositoryFromDomainLedger,
} from "../../../packages/persistence/src/record-domain-adapter.js";

const CHECKPOINT_RETRY_LIMIT = 3;
const CHECKPOINT_RETRYABLE_CODES = new Set([
  "23505",
  "40001",
  "40P01",
  "DOMAIN_BASELINE_CONFLICT",
  "DOMAIN_SHADOW_DIFFERENCE",
  "POSTGRES_UNIQUE_CONFLICT",
  "REPOSITORY_VERSION_CONFLICT",
]);

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function isRetryable(error) {
  return CHECKPOINT_RETRYABLE_CODES.has(error?.code)
    || CHECKPOINT_RETRYABLE_CODES.has(error?.safe_error_code);
}

export function createPostgresEmailDmsCompletionCheckpoint({
  ledger,
  workflow,
} = {}) {
  if (!ledger || typeof ledger.transaction !== "function") {
    throw new TypeError(
      "PostgreSQL domain ledger is required for the Email DMS completion checkpoint",
    );
  }
  const workflowName = requiredText(workflow, "completion workflow");
  if (!/^[a-z0-9-]+$/u.test(workflowName)) {
    throw new TypeError("completion workflow is invalid");
  }

  async function mutate(stage, { tenant_id, apply } = {}) {
    const tenantId = requiredText(tenant_id, "tenant_id");
    if (typeof apply !== "function") {
      throw new TypeError(`${workflowName} ${stage} checkpoint callback is required`);
    }

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await ledger.transaction({
          tenant_id: tenantId,
          domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
        }, async (tx) => {
          const baseline = createDomainSnapshot({
            tenant_id: tenantId,
            domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
            records: await tx.list(),
            idempotency_entries: await tx.listIdempotency(),
            audit_events: await tx.listAudit(),
          });
          const repository = await materializeRecordRepositoryFromDomainLedger({
            ledger: tx,
            descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
            tenant_id: tenantId,
            create_repository: createEmailDmsRepository,
          });
          try {
            const result = apply(repository);
            if (result && typeof result.then === "function") {
              throw new TypeError(
                `${workflowName} ${stage} checkpoint callback must be synchronous`,
              );
            }
            const source = applyCommittedStateVersions(
              createRecordRepositoryDomainSnapshot({
                descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
                repositories: [{
                  source_id: `${workflowName}-completion-${stage}`,
                  repository,
                }],
                tenant_id: tenantId,
              }).snapshot,
              baseline,
            );
            await flushDomainSnapshotToScopedLedger({
              tx,
              source,
              tenant_id: tenantId,
              domain_id: EMAIL_DMS_DOMAIN_DESCRIPTOR.domain_id,
              expected_baseline: baseline,
            });
            return result;
          } finally {
            repository.close();
          }
        });
      } catch (error) {
        if (!isRetryable(error) || attempt + 1 >= CHECKPOINT_RETRY_LIMIT) {
          throw error;
        }
      }
    }
  }

  return Object.freeze({
    kind: `postgres-${workflowName}-completion-checkpoint`,
    claim: (input) => mutate("claim", input),
    finalize: (input) => mutate("finalize", input),
    fail: (input) => mutate("fail", input),
  });
}

export function createPostgresPeopleOutlookCompletionCheckpoint({ ledger } = {}) {
  return createPostgresEmailDmsCompletionCheckpoint({
    ledger,
    workflow: "people-outlook",
  });
}
