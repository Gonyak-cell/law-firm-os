import { hashEventBody } from "../../audit/src/events.js";
import { appendFinanceAuditEvent } from "./finance-audit.js";
import {
  FEE_COMMITMENT_STATUSES,
  normalizeFeeCommitment,
} from "./fee-commitment-model.js";

export const FEE_COMMITMENT_COMMAND_ERROR_CODES = Object.freeze({
  idempotency_conflict: "FINANCE_IDEMPOTENCY_CONFLICT",
  active_exists: "FINANCE_FEE_COMMITMENT_ACTIVE_EXISTS",
  reference_invalid: "FINANCE_FEE_COMMITMENT_REFERENCE_INVALID",
  reference_unavailable: "FINANCE_FEE_COMMITMENT_REFERENCE_UNAVAILABLE",
});

const INACTIVE_STATUSES = new Set([
  "inactive",
  "archived",
  "deleted",
  "merged",
  "closed",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function commandError(code, message, status = 409) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = status;
  return error;
}

function assertReadableRepository(repository, label) {
  if (typeof repository?.get !== "function") {
    throw commandError(
      FEE_COMMITMENT_COMMAND_ERROR_CODES.reference_unavailable,
      `${label} repository is unavailable`,
      503,
    );
  }
}

function active(record) {
  return !INACTIVE_STATUSES.has(String(record?.status ?? "active").trim().toLowerCase());
}

function clientReferenceIds(clientGroup = {}) {
  return new Set([
    clientGroup.client_group_id,
    clientGroup.rp05_client_ref,
    clientGroup.primary_party_id,
    clientGroup.primary_entity_id,
    ...(clientGroup.member_party_ids ?? []),
    ...(clientGroup.member_entity_ids ?? []),
  ].filter(Boolean));
}

function validateClientAndOpportunity({
  masterDataRepository,
  crmRepository,
  commitment,
}) {
  assertReadableRepository(masterDataRepository, "Master Data");
  assertReadableRepository(crmRepository, "CRM");
  const clientGroup = masterDataRepository.get({
    tenant_id: commitment.tenant_id,
    model_type: "ClientGroup",
    client_group_id: commitment.client_group_id,
  });
  const opportunity = crmRepository.get({
    tenant_id: commitment.tenant_id,
    model_type: "Opportunity",
    opportunity_id: commitment.opportunity_id,
  });
  const clientPartyIds = new Set([
    clientGroup?.primary_party_id,
    ...(clientGroup?.member_party_ids ?? []),
  ].filter(Boolean));
  if (
    !clientGroup
    || !active(clientGroup)
    || !opportunity
    || !active(opportunity)
    || opportunity.stage === "closed_lost"
    || !clientPartyIds.has(opportunity.party_id)
  ) {
    throw commandError(
      FEE_COMMITMENT_COMMAND_ERROR_CODES.reference_invalid,
      "FeeCommitment client and Opportunity relationship is invalid",
    );
  }
  return Object.freeze({ clientGroup, opportunity });
}

function validateMatter({
  matterRepository,
  clientGroup,
  commitment,
  matterId = commitment.matter_id,
}) {
  if (!matterId) return null;
  assertReadableRepository(matterRepository, "Matter");
  const matter = matterRepository.get({
    tenant_id: commitment.tenant_id,
    model_type: "Matter",
    matter_id: matterId,
  });
  const matterClientIds = new Set([
    matter?.client_id,
    matter?.client_group_id,
    matter?.legal_client_party_id,
    matter?.billing_client_party_id,
  ].filter(Boolean));
  const allowedClientIds = clientReferenceIds(clientGroup);
  if (
    !matter
    || !active(matter)
    || ![...matterClientIds].some((id) => allowedClientIds.has(id))
  ) {
    throw commandError(
      FEE_COMMITMENT_COMMAND_ERROR_CODES.reference_invalid,
      "FeeCommitment Matter relationship is invalid",
    );
  }
  return matter;
}

function validateSourceFeeArrangement({
  repository,
  matterRepository,
  clientGroup,
  commitment,
}) {
  if (!commitment.source_fee_arrangement_id) return null;
  const source = repository.get({
    tenant_id: commitment.tenant_id,
    model_type: "FeeArrangement",
    fee_arrangement_id: commitment.source_fee_arrangement_id,
  });
  if (
    !source
    || !active(source)
    || (source.currency && source.currency !== commitment.currency)
    || (source.client_group_id && source.client_group_id !== commitment.client_group_id)
    || (source.matter_id && commitment.matter_id && source.matter_id !== commitment.matter_id)
  ) {
    throw commandError(
      FEE_COMMITMENT_COMMAND_ERROR_CODES.reference_invalid,
      "FeeCommitment source FeeArrangement relationship is invalid",
    );
  }
  if (source.matter_id) {
    validateMatter({
      matterRepository,
      clientGroup,
      commitment,
      matterId: source.matter_id,
    });
  }
  return source;
}

function requestFingerprint(commitment) {
  return hashEventBody({
    operation: "fee_commitment_create_v1",
    fee_commitment: {
      fee_commitment_id: commitment.fee_commitment_id,
      tenant_id: commitment.tenant_id,
      client_group_id: commitment.client_group_id,
      opportunity_id: commitment.opportunity_id,
      matter_id: commitment.matter_id,
      currency: commitment.currency,
      agreed_amount: commitment.agreed_amount,
      due_date: commitment.due_date,
      accepted_at: commitment.accepted_at,
      status: commitment.status,
      source_fee_arrangement_id: commitment.source_fee_arrangement_id,
      state_version: commitment.state_version,
      created_by: commitment.created_by,
      updated_by: commitment.updated_by,
      reason: commitment.reason,
    },
  });
}

function assertReplayMatches(replay, fingerprint) {
  if (
    replay.operation !== "fee_commitment_create"
    || replay.request_fingerprint !== fingerprint
  ) {
    throw commandError(
      FEE_COMMITMENT_COMMAND_ERROR_CODES.idempotency_conflict,
      "Idempotency key is already bound to another Finance request",
    );
  }
}

export function createFeeCommitment({
  repository,
  master_data_repository,
  crm_repository,
  matter_repository = null,
  fee_commitment,
  actor_id,
  idempotency_key,
} = {}) {
  if (
    typeof repository?.transaction !== "function"
    || typeof repository?.getIdempotency !== "function"
  ) {
    throw new TypeError("Finance repository is required");
  }
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const commitment = normalizeFeeCommitment({
    ...fee_commitment,
    model_type: "FeeCommitment",
    status: "active",
    state_version: 1,
    created_by: actorId,
    updated_by: actorId,
  });
  const fingerprint = requestFingerprint(commitment);
  const replay = repository.getIdempotency({
    tenant_id: commitment.tenant_id,
    idempotency_key: idempotencyKey,
  });
  if (replay) {
    assertReplayMatches(replay, fingerprint);
    return Object.freeze({ ...replay.response, idempotent_replay: true });
  }

  const { clientGroup } = validateClientAndOpportunity({
    masterDataRepository: master_data_repository,
    crmRepository: crm_repository,
    commitment,
  });
  validateMatter({
    matterRepository: matter_repository,
    clientGroup,
    commitment,
  });
  validateSourceFeeArrangement({
    repository,
    matterRepository: matter_repository,
    clientGroup,
    commitment,
  });

  return repository.transaction((tx) => {
    if (tx.get({
      tenant_id: commitment.tenant_id,
      model_type: "FeeCommitment",
      fee_commitment_id: commitment.fee_commitment_id,
    })) {
      throw commandError(
        FEE_COMMITMENT_COMMAND_ERROR_CODES.active_exists,
        "FeeCommitment ID already exists",
      );
    }
    const activeForOpportunity = tx
      .list({
        tenant_id: commitment.tenant_id,
        model_type: "FeeCommitment",
      })
      .find((record) => (
        record.opportunity_id === commitment.opportunity_id
        && record.status === "active"
      ));
    if (activeForOpportunity) {
      throw commandError(
        FEE_COMMITMENT_COMMAND_ERROR_CODES.active_exists,
        "An active FeeCommitment already exists for the Opportunity",
      );
    }
    const record = tx.create(commitment);
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: record.tenant_id,
        actor_id: actorId,
        action: "fee_commitment.create",
        object_type: "FeeCommitment",
        object_id: record.fee_commitment_id,
        idempotency_key: idempotencyKey,
        metadata: {
          client_group_id: record.client_group_id,
          opportunity_id: record.opportunity_id,
          matter_id: record.matter_id,
          source_fee_arrangement_id: record.source_fee_arrangement_id,
          agreed_amount_state: record.agreed_amount === null
            ? "not_entered"
            : record.agreed_amount === 0
              ? "zero"
              : "entered",
          reference_validation: "passed",
          raw_payload_included: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: "created",
      fee_commitment: record,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: record.tenant_id,
      idempotency_key: idempotencyKey,
      operation: "fee_commitment_create",
      request_fingerprint: fingerprint,
      response,
    });
    return response;
  });
}

export function listFeeCommitments({
  repository,
  tenant_id,
  client_group_id = null,
  opportunity_id = null,
  status = null,
} = {}) {
  if (typeof repository?.list !== "function") throw new TypeError("Finance repository is required");
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  if (client_group_id !== null) requiredString({ client_group_id }, "client_group_id");
  if (opportunity_id !== null) requiredString({ opportunity_id }, "opportunity_id");
  if (status !== null && !FEE_COMMITMENT_STATUSES.includes(status)) {
    throw new TypeError("FeeCommitment.status is invalid");
  }
  return Object.freeze(repository
    .list({ tenant_id: tenantId, model_type: "FeeCommitment" })
    .filter((record) => !client_group_id || record.client_group_id === client_group_id)
    .filter((record) => !opportunity_id || record.opportunity_id === opportunity_id)
    .filter((record) => !status || record.status === status)
    .sort((left, right) => (
      right.accepted_at.localeCompare(left.accepted_at)
      || left.fee_commitment_id.localeCompare(right.fee_commitment_id)
    )));
}
