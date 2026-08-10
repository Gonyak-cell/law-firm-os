import { createDomainSnapshot } from "../../../packages/persistence/src/domain-ledger.js";
import {
  applyCommittedStateVersions,
  createRecordRepositoryDomainSnapshot,
  flushDomainSnapshotToScopedLedger,
  materializeRecordRepositoryFromDomainLedger,
} from "../../../packages/persistence/src/record-domain-adapter.js";
import {
  createAuthenticatedTransactionBoundDomainLedger,
} from "../../../packages/persistence/src/postgres/domain-ledger.js";
import {
  assertEngagementDmsSession,
  engagementApprovalError,
} from "../../../packages/intake/src/engagement-approval-command.js";
import {
  engagementApprovalReplay,
  persistEngagementApproval,
} from "../../../packages/intake/src/engagement-approval-persistence.js";
import { INTAKE_DOMAIN_DESCRIPTOR } from "../../../packages/intake/src/central-ledger.js";
import { createIntakeRuntimeRepository } from "../../../packages/intake/src/runtime-repository.js";
import { matchesCanonicalPendingMetadataReceipt } from "../../../packages/dms/src/postgres-upload-runtime.js";

const DEFAULT_WAIT_MILLIS = 2_000;
const DEFAULT_POLL_MILLIS = 25;

function assertPendingMetadataReceipt(prepared, session, receipt) {
  assertEngagementDmsSession(prepared, session);
  if (session.state !== "provider_finalized"
      || session.metadata_committed_at !== null
      || session.provider_finalize_owner !== null
      || session.provider_finalize_token !== null
      || session.provider_finalize_lease_expires_at !== null
      || !matchesCanonicalPendingMetadataReceipt({ session, receipt })) {
    throw engagementApprovalError(
      "INTAKE_ENGAGEMENT_DMS_AUTHORITY_MISMATCH",
      "pending DMS metadata receipt does not match the engagement approval",
    );
  }
  return receipt;
}

async function mutateIntake({ tx, tenant_id, source_id, apply } = {}) {
  const baseline = createDomainSnapshot({
    tenant_id,
    domain_id: INTAKE_DOMAIN_DESCRIPTOR.domain_id,
    records: await tx.list(),
    idempotency_entries: await tx.listIdempotency(),
    audit_events: await tx.listAudit(),
  });
  const repository = await materializeRecordRepositoryFromDomainLedger({
    ledger: tx,
    descriptor: INTAKE_DOMAIN_DESCRIPTOR,
    tenant_id,
    create_repository: createIntakeRuntimeRepository,
  });
  try {
    const result = apply(repository);
    if (result && typeof result.then === "function") {
      throw new TypeError("Intake engagement checkpoint mutation must be synchronous");
    }
    const source = applyCommittedStateVersions(createRecordRepositoryDomainSnapshot({
      descriptor: INTAKE_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id, repository }],
      tenant_id,
    }).snapshot, baseline);
    await flushDomainSnapshotToScopedLedger({
      tx,
      source,
      tenant_id,
      domain_id: INTAKE_DOMAIN_DESCRIPTOR.domain_id,
      expected_baseline: baseline,
    });
    return result;
  } finally {
    repository.close();
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createPostgresIntakeEngagementCompletionCheckpoint({
  ledger,
  clock = () => new Date(),
  waitMillis = DEFAULT_WAIT_MILLIS,
  pollMillis = DEFAULT_POLL_MILLIS,
} = {}) {
  if (!ledger || typeof ledger.transaction !== "function") {
    throw new TypeError("PostgreSQL domain ledger is required for the Intake engagement checkpoint");
  }
  if (!Number.isSafeInteger(waitMillis) || waitMillis < 1
      || !Number.isSafeInteger(pollMillis) || pollMillis < 1) {
    throw new TypeError("Intake engagement checkpoint wait bounds are invalid");
  }

  async function read({ prepared } = {}) {
    return ledger.transaction({
      tenant_id: prepared.tenant_id,
      domain_id: INTAKE_DOMAIN_DESCRIPTOR.domain_id,
    }, async (tx) => {
      const repository = await materializeRecordRepositoryFromDomainLedger({
        ledger: tx,
        descriptor: INTAKE_DOMAIN_DESCRIPTOR,
        tenant_id: prepared.tenant_id,
        create_repository: createIntakeRuntimeRepository,
      });
      try {
        return engagementApprovalReplay(repository, prepared);
      } finally {
        repository.close();
      }
    });
  }

  async function beforeMetadata({ prepared, session, client, pending_metadata_receipt } = {}) {
    const receipt = assertPendingMetadataReceipt(
      prepared,
      session,
      pending_metadata_receipt,
    );
    const tx = await createAuthenticatedTransactionBoundDomainLedger({
      client,
      tenant_id: prepared.tenant_id,
      domain_id: INTAKE_DOMAIN_DESCRIPTOR.domain_id,
      clock,
    });
    return mutateIntake({
      tx,
      tenant_id: prepared.tenant_id,
      source_id: "intake-engagement-dms-before-metadata",
      apply: (repository) => persistEngagementApproval({
        repository,
        prepared,
        dms_upload: receipt,
        occurred_at: receipt.committed_at,
      }),
    });
  }

  async function finalizeWithoutDms({ prepared } = {}) {
    const occurredAt = new Date(clock()).toISOString();
    return ledger.transaction({
      tenant_id: prepared.tenant_id,
      domain_id: INTAKE_DOMAIN_DESCRIPTOR.domain_id,
    }, (tx) => mutateIntake({
      tx,
      tenant_id: prepared.tenant_id,
      source_id: "intake-engagement-no-document",
      apply: (repository) => persistEngagementApproval({
        repository,
        prepared,
        occurred_at: occurredAt,
      }),
    }));
  }

  async function wait({ prepared } = {}) {
    const deadline = Date.now() + waitMillis;
    while (Date.now() < deadline) {
      const replay = await read({ prepared });
      if (replay) return replay;
      await delay(Math.min(pollMillis, Math.max(1, deadline - Date.now())));
    }
    throw engagementApprovalError(
      "INTAKE_ENGAGEMENT_APPROVAL_PENDING",
      "engagement approval remains in progress",
      { retryable: true },
    );
  }

  return Object.freeze({
    kind: "postgres-intake-engagement-completion-checkpoint",
    read,
    before_metadata: beforeMetadata,
    finalize_without_dms: finalizeWithoutDms,
    wait,
  });
}
