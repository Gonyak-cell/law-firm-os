import {
  createFinanceDomainSnapshot,
} from "../../../../packages/billing/src/central-ledger.js";
import {
  createFinanceRepository,
} from "../../../../packages/billing/src/finance-repository.js";
import {
  CRM_DOMAIN_DESCRIPTOR,
} from "../../../../packages/crm/src/central-ledger.js";
import {
  createCrmRuntimeRepository,
} from "../../../../packages/crm/src/runtime-repository.js";
import {
  createEmailDmsDomainSnapshot,
} from "../../../../packages/email-dms/src/central-ledger.js";
import {
  inquiryEmailEvidenceId,
  inquiryEvidenceFileObjectId,
} from "../../../../packages/email-dms/src/inquiry-evidence-model.js";
import {
  createEmailDmsRepository,
} from "../../../../packages/email-dms/src/repository.js";
import {
  runHrxMigrations,
} from "../../../../packages/hrx/src/migrations/index.js";
import {
  createHrxDomainSnapshot,
} from "../../../../packages/hrx/src/postgres-store-v2.js";
import {
  createFileHrxStore,
} from "../../../../packages/hrx/src/store/file-store.js";
import {
  MASTER_DATA_DOMAIN_DESCRIPTOR,
} from "../../../../packages/master-data/src/central-ledger.js";
import {
  createMasterDataRepository,
} from "../../../../packages/master-data/src/repository.js";
import {
  createRecordRepositoryDomainSnapshot,
} from "../../../../packages/persistence/src/record-domain-adapter.js";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
} from "../../src/matter-vault-account-registry.js";

export const CLIENT_MIGRATION_TENANT =
  MATTER_VAULT_REGISTERED_TENANT_ID;
export const CLIENT_MIGRATION_ACTOR = "user_amic_jwsuh";
export const CLIENT_MIGRATION_CLIENT_GROUP_ID =
  "client_group_migration_t03";
export const CLIENT_MIGRATION_PARTY_ID =
  "party_migration_t03";

export function clientOperationSources() {
  const tenantId = CLIENT_MIGRATION_TENANT;
  const actorId = CLIENT_MIGRATION_ACTOR;
  const clientGroupId = CLIENT_MIGRATION_CLIENT_GROUP_ID;
  const partyId = CLIENT_MIGRATION_PARTY_ID;
  const opportunityId = "opportunity_migration_t03";
  const workflowId = "engagement_workflow_migration_t03";
  const crmRepository = createCrmRuntimeRepository({
    seedRecords: [
      {
        model_type: "Lead",
        tenant_id: tenantId,
        lead_id: "lead_migration_t03",
        opportunity_id: opportunityId,
        party_id: partyId,
        client_group_id: clientGroupId,
        display_name: "마이그레이션 합성 문의",
        inquiry_status: "new",
        source: "manual",
        received_at: "2026-07-31T00:00:00.000Z",
        next_action: "문의 확인",
        status: "active",
        owner_user_id: actorId,
        version: 1,
      },
      {
        model_type: "Opportunity",
        tenant_id: tenantId,
        opportunity_id: opportunityId,
        lead_id: "lead_migration_t03",
        party_id: partyId,
        display_name: "마이그레이션 합성 수임 기회",
        stage: "qualified",
        engagement_decision: "pending",
        status: "active",
        owner_user_id: actorId,
      },
      {
        model_type: "CRMActivity",
        tenant_id: tenantId,
        crm_activity_id: "crm_activity_migration_t03",
        lead_id: "lead_migration_t03",
        opportunity_id: opportunityId,
        party_id: partyId,
        activity_type: "note",
        subject: "합성 마이그레이션 메모",
        confidential: false,
        status: "active",
        owner_user_id: actorId,
        version: 1,
      },
      {
        model_type: "EngagementDecisionProcess",
        resource_id: workflowId,
        engagement_workflow_id: workflowId,
        tenant_id: tenantId,
        lead_id: "lead_migration_t03",
        opportunity_id: opportunityId,
        party_id: partyId,
        decision: "pending",
        prior_decision: "pending",
        engagement_decision_version: 1,
        workflow_status: "in_progress",
        workflow_version: 1,
        required_steps: ["decision_recorded"],
        completed_steps: [],
        current_step: "decision_recorded",
        failure_count: 0,
      },
      {
        model_type: "Proposal",
        tenant_id: tenantId,
        proposal_id: "proposal_non_client_migration_t03",
        opportunity_id: opportunityId,
        party_id: partyId,
        fee_estimate_ref: "fee-estimate:synthetic",
        display_name: "비대상 제안서",
        status: "active",
        proposal_status: "draft",
        owner_user_id: actorId,
      },
    ],
  });
  const financeRepository = createFinanceRepository({
    seedRecords: [
      {
        model_type: "BankImportBatch",
        bank_import_batch_id: "bank_batch_migration_t03",
        tenant_id: tenantId,
        source_manifest_hash: "b".repeat(64),
        account_ref: "bank_account_migration_t03",
        transaction_count: 1,
        status: "reconciled",
      },
      {
        model_type: "BankTransaction",
        bank_transaction_id: "bank_transaction_migration_t03",
        tenant_id: tenantId,
        bank_import_batch_id: "bank_batch_migration_t03",
        transaction_fingerprint: "c".repeat(64),
        account_ref: "bank_account_migration_t03",
        date: "2026-07-31",
        occurred_at: "2026-07-31T00:05:00.000Z",
        direction: "inflow",
        amount: 12_000_000,
        balance_after: 12_000_000,
        currency: "KRW",
        status: "posted",
      },
      {
        model_type: "BankTransactionClassification",
        bank_transaction_classification_id:
          "bank_classification_migration_t03",
        tenant_id: tenantId,
        bank_transaction_id: "bank_transaction_migration_t03",
        account_ref: "bank_account_migration_t03",
        transaction_direction: "inflow",
        transaction_date: "2026-07-31",
        transaction_month: "2026-07",
        amount: 12_000_000,
        currency: "KRW",
        primary_type: "sales",
        category: "client_receipt",
        client_group_id: clientGroupId,
        status: "confirmed",
      },
      {
        model_type: "BankClassificationRule",
        bank_classification_rule_id: "bank_rule_migration_t03",
        tenant_id: tenantId,
        client_group_id: clientGroupId,
        match_field: "counterparty",
        normalized_match_value: "마이그레이션합성고객",
        category: "client_receipt",
        primary_type: "sales",
        priority: 100,
        status: "active",
        created_by: actorId,
        raw_source_payload_included: false,
      },
      {
        model_type: "FeeCommitment",
        tenant_id: tenantId,
        fee_commitment_id: "fee_commitment_migration_t03",
        client_group_id: clientGroupId,
        opportunity_id: opportunityId,
        currency: "KRW",
        agreed_amount: 12_000_000,
        due_date: "2026-08-31",
        accepted_at: "2026-07-31T00:10:00.000Z",
        status: "active",
        state_version: 1,
        created_by: actorId,
        updated_by: actorId,
        reason: "합성 이전 검증",
      },
      {
        model_type: "ClientDepositAllocation",
        client_deposit_allocation_id:
          "client_deposit_allocation_migration_t03",
        tenant_id: tenantId,
        client_group_id: clientGroupId,
        bank_transaction_id: "bank_transaction_migration_t03",
        bank_transaction_classification_id:
          "bank_classification_migration_t03",
        fee_commitment_id: "fee_commitment_migration_t03",
        currency: "KRW",
        allocated_amount: 7_000_000,
        reversed_amount: 0,
        refund_reversed_amount: 0,
        adjustment_reversed_amount: 0,
        allocation_source: "automatic",
        manual_lock: false,
        status: "active",
        state_version: 1,
        allocated_at: "2026-07-31T00:15:00.000Z",
        created_by: actorId,
        updated_by: actorId,
        reason: "합성 입금 배분",
      },
    ],
  });
  const evidenceBase = {
    tenant_id: tenantId,
    mailbox_address: "migration@example.invalid",
    internet_message_id: "<migration-t03@example.invalid>",
    graph_immutable_message_id: "immutable-migration-t03",
  };
  const evidenceId = inquiryEmailEvidenceId(evidenceBase);
  const originalId = inquiryEvidenceFileObjectId({
    tenant_id: tenantId,
    inquiry_email_evidence_id: evidenceId,
    object_kind: "original_mime",
  });
  const displayId = inquiryEvidenceFileObjectId({
    tenant_id: tenantId,
    inquiry_email_evidence_id: evidenceId,
    object_kind: "sanitized_display",
  });
  const commonFile = {
    model_type: "InquiryEvidenceFileObject",
    tenant_id: tenantId,
    inquiry_email_evidence_id: evidenceId,
    scan_status: "clean",
    retention_policy_id: "retention-migration-t03",
    legal_hold_state: "none",
    kms_key_ref: "kms-key-ref:migration-t03",
    created_by: actorId,
    created_at: "2026-07-31T00:25:00.000Z",
  };
  const emailDmsRepository = createEmailDmsRepository({
    seedRecords: [
      {
        model_type: "M365Connection",
        tenant_id: tenantId,
        m365_connection_id: "m365_connection_migration_t03",
        user_id: actorId,
        entra_subject_id: "entra_subject_migration_t03",
        mailbox_address_hash: "a".repeat(64),
        credential_ref:
          "aws-secrets-manager:synthetic/client-migration-t03",
        granted_scopes: [
          "Mail.Read",
          "Calendars.ReadWrite",
          "offline_access",
        ],
        consented_at: "2026-07-31T00:00:00.000Z",
        expires_at: "2026-08-31T00:00:00.000Z",
        state_version: 1,
      },
      {
        ...commonFile,
        inquiry_evidence_file_object_id: originalId,
        object_kind: "original_mime",
        storage_pointer_ref:
          "vault://migration-t03/original-001",
        sha256: "d".repeat(64),
        byte_size: 900,
        mime_type: "message/rfc822",
      },
      {
        ...commonFile,
        inquiry_evidence_file_object_id: displayId,
        object_kind: "sanitized_display",
        storage_pointer_ref:
          "vault://migration-t03/display-001",
        sha256: "e".repeat(64),
        byte_size: 240,
        mime_type: "text/html; charset=utf-8",
      },
      {
        model_type: "InquiryEmailEvidence",
        inquiry_email_evidence_id: evidenceId,
        ...evidenceBase,
        lead_id: "lead_migration_t03",
        conversation_id: "conversation-migration-t03",
        mime_file_object_id: originalId,
        mime_sha256: "d".repeat(64),
        mime_byte_size: 900,
        subject: "Synthetic migration inquiry",
        sender: { address: "sender@example.invalid" },
        recipients: [{
          address: "migration@example.invalid",
          type: "to",
        }],
        received_at: "2026-07-31T00:20:00.000Z",
        display_file_object_id: displayId,
        attachment_manifest: [],
        capture_status: "complete",
        retention_policy_ref: "retention-migration-t03",
        legal_hold_state: "none",
        captured_by: actorId,
        captured_at: "2026-07-31T00:25:00.000Z",
      },
    ],
  });
  try {
    return Object.freeze([
      createRecordRepositoryDomainSnapshot({
        descriptor: CRM_DOMAIN_DESCRIPTOR,
        repositories: [{
          source_id: "client-operations-crm",
          repository: crmRepository,
        }],
        tenant_id: tenantId,
      }).snapshot,
      createFinanceDomainSnapshot({
        repositories: [{
          source_id: "client-operations-finance",
          repository: financeRepository,
        }],
        tenant_id: tenantId,
      }).snapshot,
      createEmailDmsDomainSnapshot({
        repositories: [{
          source_id: "client-operations-email-dms",
          repository: emailDmsRepository,
        }],
        tenant_id: tenantId,
      }).snapshot,
    ]);
  } finally {
    crmRepository.close();
    financeRepository.close();
    emailDmsRepository.close();
  }
}

export async function importClientDirectory(ledger) {
  const repository = createMasterDataRepository({
    seedRecords: [
      {
        model_type: "Party",
        tenant_id: CLIENT_MIGRATION_TENANT,
        party_id: CLIENT_MIGRATION_PARTY_ID,
        party_type: "organization",
        display_name: "마이그레이션 합성 고객",
        status: "active",
        owner_user_id: CLIENT_MIGRATION_ACTOR,
      },
      {
        model_type: "ClientGroup",
        tenant_id: CLIENT_MIGRATION_TENANT,
        client_group_id: CLIENT_MIGRATION_CLIENT_GROUP_ID,
        display_name: "마이그레이션 합성 고객",
        member_party_ids: [CLIENT_MIGRATION_PARTY_ID],
        primary_party_id: CLIENT_MIGRATION_PARTY_ID,
        status: "active",
        owner_user_id: CLIENT_MIGRATION_ACTOR,
      },
    ],
  });
  try {
    await ledger.importSnapshot(
      createRecordRepositoryDomainSnapshot({
        descriptor: MASTER_DATA_DOMAIN_DESCRIPTOR,
        repositories: [{
          source_id: "client-operations-master-data",
          repository,
        }],
        tenant_id: CLIENT_MIGRATION_TENANT,
      }).snapshot,
    );
  } finally {
    repository.close();
  }
}

export async function importHrxBaseline(ledger) {
  const store = createFileHrxStore();
  try {
    runHrxMigrations(store);
    await ledger.importSnapshot(
      createHrxDomainSnapshot({
        store,
        tenant_id: CLIENT_MIGRATION_TENANT,
      }).snapshot,
    );
  } finally {
    store.close();
  }
}
