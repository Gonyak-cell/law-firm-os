import { hashEventBody } from "../../audit/src/events.js";
import { appendFinanceAuditEvent } from "./finance-audit.js";
import {
  FEE_COMMITMENT_STATUSES,
  normalizeFeeCommitment,
} from "./fee-commitment-model.js";

export const FEE_COMMITMENT_COMMAND_ERROR_CODES = Object.freeze({
  idempotency_conflict: "FINANCE_IDEMPOTENCY_CONFLICT",
  active_exists: "FINANCE_FEE_COMMITMENT_ACTIVE_EXISTS",
  invalid_state: "FINANCE_FEE_COMMITMENT_INVALID_STATE",
  not_found: "FINANCE_FEE_COMMITMENT_NOT_FOUND",
  reference_invalid: "FINANCE_FEE_COMMITMENT_REFERENCE_INVALID",
  reference_unavailable: "FINANCE_FEE_COMMITMENT_REFERENCE_UNAVAILABLE",
  version_conflict: "FINANCE_FEE_COMMITMENT_VERSION_CONFLICT",
});

export const FEE_COMMITMENT_WARNING_CODES = Object.freeze({
  fee_arrangement_amount_mismatch: "FEE_COMMITMENT_FEE_ARRANGEMENT_AMOUNT_MISMATCH",
  fee_arrangement_missing: "FEE_COMMITMENT_FEE_ARRANGEMENT_MISSING",
});

const FEE_COMMITMENT_MUTABLE_FIELDS = Object.freeze([
  "agreed_amount",
  "due_date",
  "matter_id",
  "source_fee_arrangement_id",
  "status",
]);

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

function updateRequestFingerprint({
  tenant_id,
  fee_commitment_id,
  expected_state_version,
  changes,
  actor_id,
  reason,
}) {
  return hashEventBody({
    operation: "fee_commitment_update_v1",
    tenant_id,
    fee_commitment_id,
    expected_state_version,
    changes,
    actor_id,
    reason,
  });
}

function assertReplayMatches(replay, fingerprint, operation = "fee_commitment_create") {
  if (
    replay.operation !== operation
    || replay.request_fingerprint !== fingerprint
  ) {
    throw commandError(
      FEE_COMMITMENT_COMMAND_ERROR_CODES.idempotency_conflict,
      "Idempotency key is already bound to another Finance request",
    );
  }
}

function feeArrangementAmount(feeArrangement) {
  if (!feeArrangement) return null;
  const whole = (value) => (
    typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
      ? value
      : null
  );
  const type = feeArrangement.type ?? feeArrangement.arrangement_type;
  if (type === "fixed" || type === "fixed_fee") {
    return whole(feeArrangement.fixed_fee_amount);
  }
  if (type === "retainer") return whole(feeArrangement.retainer_amount);
  if (type === "success_fee" || type === "upfront_success" || type === "success") {
    const upfront = whole(feeArrangement.upfront_fee_amount);
    const success = whole(feeArrangement.success_fee_amount);
    const total = upfront === null || success === null ? null : upfront + success;
    return Number.isSafeInteger(total) ? total : null;
  }
  return null;
}

export function compareFeeCommitmentToFeeArrangement({
  repository,
  fee_commitment,
} = {}) {
  if (typeof repository?.get !== "function") throw new TypeError("Finance repository is required");
  if (!fee_commitment?.source_fee_arrangement_id) {
    return Object.freeze({
      status: "not_linked",
      fee_arrangement_id: null,
      fee_commitment_amount: fee_commitment?.agreed_amount ?? null,
      fee_arrangement_amount: null,
      warning_code: null,
      warning_message: null,
    });
  }
  const feeArrangement = repository.get({
    tenant_id: fee_commitment.tenant_id,
    model_type: "FeeArrangement",
    fee_arrangement_id: fee_commitment.source_fee_arrangement_id,
  });
  if (!feeArrangement) {
    return Object.freeze({
      status: "source_missing",
      fee_arrangement_id: fee_commitment.source_fee_arrangement_id,
      fee_commitment_amount: fee_commitment.agreed_amount,
      fee_arrangement_amount: null,
      warning_code: FEE_COMMITMENT_WARNING_CODES.fee_arrangement_missing,
      warning_message: "연결된 청구 설정을 확인할 수 없습니다",
    });
  }
  const arrangementAmount = feeArrangementAmount(feeArrangement);
  if (fee_commitment.agreed_amount === null) {
    return Object.freeze({
      status: "commitment_amount_missing",
      fee_arrangement_id: feeArrangement.fee_arrangement_id,
      fee_commitment_amount: null,
      fee_arrangement_amount: arrangementAmount,
      warning_code: null,
      warning_message: null,
    });
  }
  if (arrangementAmount === null) {
    return Object.freeze({
      status: "not_comparable",
      fee_arrangement_id: feeArrangement.fee_arrangement_id,
      fee_commitment_amount: fee_commitment.agreed_amount,
      fee_arrangement_amount: null,
      warning_code: null,
      warning_message: null,
    });
  }
  const matches = fee_commitment.agreed_amount === arrangementAmount;
  return Object.freeze({
    status: matches ? "match" : "mismatch",
    fee_arrangement_id: feeArrangement.fee_arrangement_id,
    fee_commitment_amount: fee_commitment.agreed_amount,
    fee_arrangement_amount: arrangementAmount,
    warning_code: matches
      ? null
      : FEE_COMMITMENT_WARNING_CODES.fee_arrangement_amount_mismatch,
    warning_message: matches ? null : "청구 설정과 금액이 다릅니다",
  });
}

export function presentFeeCommitment({ repository, fee_commitment } = {}) {
  return Object.freeze({
    ...fee_commitment,
    fee_arrangement_comparison: compareFeeCommitmentToFeeArrangement({
      repository,
      fee_commitment,
    }),
  });
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

export function updateFeeCommitment({
  repository,
  master_data_repository,
  crm_repository,
  matter_repository = null,
  tenant_id,
  fee_commitment_id,
  expected_state_version,
  changes,
  reason,
  actor_id,
  idempotency_key,
} = {}) {
  if (
    typeof repository?.transaction !== "function"
    || typeof repository?.getIdempotency !== "function"
  ) {
    throw new TypeError("Finance repository is required");
  }
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const feeCommitmentId = requiredString({ fee_commitment_id }, "fee_commitment_id");
  const actorId = requiredString({ actor_id }, "actor_id");
  const idempotencyKey = requiredString({ idempotency_key }, "idempotency_key");
  const changeReason = requiredString({ reason }, "reason");
  if (
    typeof expected_state_version !== "number"
    || !Number.isSafeInteger(expected_state_version)
    || expected_state_version < 1
  ) {
    throw new TypeError("expected_state_version must be a positive integer");
  }
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
    throw new TypeError("changes must be an object");
  }
  const changeFields = Object.keys(changes);
  if (changeFields.length === 0) throw new TypeError("at least one change is required");
  const unsupported = changeFields.filter(
    (field) => !FEE_COMMITMENT_MUTABLE_FIELDS.includes(field),
  );
  if (unsupported.length > 0) {
    throw new TypeError(`FeeCommitment fields are immutable: ${unsupported.join(", ")}`);
  }
  if (changes.status !== undefined && changes.status !== "cancelled") {
    throw new TypeError("FeeCommitment status can only be changed to cancelled");
  }
  if (changes.status === "cancelled" && changeFields.length !== 1) {
    throw new TypeError("FeeCommitment cancellation cannot be combined with other changes");
  }
  const fingerprint = updateRequestFingerprint({
    tenant_id: tenantId,
    fee_commitment_id: feeCommitmentId,
    expected_state_version,
    changes,
    actor_id: actorId,
    reason: changeReason,
  });
  const replay = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (replay) {
    assertReplayMatches(replay, fingerprint, "fee_commitment_update");
    return Object.freeze({ ...replay.response, idempotent_replay: true });
  }
  const current = repository.get({
    tenant_id: tenantId,
    model_type: "FeeCommitment",
    fee_commitment_id: feeCommitmentId,
  });
  if (!current) {
    throw commandError(
      FEE_COMMITMENT_COMMAND_ERROR_CODES.not_found,
      "FeeCommitment was not found",
      404,
    );
  }
  if (current.state_version !== expected_state_version) {
    throw commandError(
      FEE_COMMITMENT_COMMAND_ERROR_CODES.version_conflict,
      "FeeCommitment state version is stale",
    );
  }
  if (current.status !== "active") {
    throw commandError(
      FEE_COMMITMENT_COMMAND_ERROR_CODES.invalid_state,
      "Only an active FeeCommitment can be changed",
    );
  }
  const candidate = normalizeFeeCommitment({
    ...current,
    ...changes,
    state_version: current.state_version + 1,
    updated_by: actorId,
    reason: changeReason,
  });
  const changedFields = FEE_COMMITMENT_MUTABLE_FIELDS.filter(
    (field) => current[field] !== candidate[field],
  );
  if (changedFields.length === 0) throw new TypeError("FeeCommitment changes have no effect");

  const { clientGroup } = validateClientAndOpportunity({
    masterDataRepository: master_data_repository,
    crmRepository: crm_repository,
    commitment: candidate,
  });
  validateMatter({
    matterRepository: matter_repository,
    clientGroup,
    commitment: candidate,
  });
  validateSourceFeeArrangement({
    repository,
    matterRepository: matter_repository,
    clientGroup,
    commitment: candidate,
  });

  return repository.transaction((tx) => {
    const locked = tx.get({
      tenant_id: tenantId,
      model_type: "FeeCommitment",
      fee_commitment_id: feeCommitmentId,
    });
    if (locked?.state_version !== expected_state_version) {
      throw commandError(
        FEE_COMMITMENT_COMMAND_ERROR_CODES.version_conflict,
        "FeeCommitment state version changed before commit",
      );
    }
    if (locked.status !== "active") {
      throw commandError(
        FEE_COMMITMENT_COMMAND_ERROR_CODES.invalid_state,
        "Only an active FeeCommitment can be changed",
      );
    }
    const updated = tx.update(
      {
        tenant_id: tenantId,
        model_type: "FeeCommitment",
        fee_commitment_id: feeCommitmentId,
      },
      candidate,
    );
    const operation = updated.status === "cancelled" ? "cancelled" : "updated";
    const before = Object.freeze({
      state_version: locked.state_version,
      status: locked.status,
      agreed_amount: locked.agreed_amount,
      due_date: locked.due_date,
      matter_id: locked.matter_id,
      source_fee_arrangement_id: locked.source_fee_arrangement_id,
    });
    const after = Object.freeze({
      state_version: updated.state_version,
      status: updated.status,
      agreed_amount: updated.agreed_amount,
      due_date: updated.due_date,
      matter_id: updated.matter_id,
      source_fee_arrangement_id: updated.source_fee_arrangement_id,
    });
    const comparison = compareFeeCommitmentToFeeArrangement({
      repository: tx,
      fee_commitment: updated,
    });
    const auditEvent = appendFinanceAuditEvent({
      repository: tx,
      event: {
        tenant_id: updated.tenant_id,
        actor_id: actorId,
        action: `fee_commitment.${operation === "cancelled" ? "cancel" : "update"}`,
        object_type: "FeeCommitment",
        object_id: updated.fee_commitment_id,
        idempotency_key: idempotencyKey,
        reason: changeReason,
        metadata: {
          changed_fields: changedFields,
          before,
          after,
          fee_arrangement_comparison_status: comparison.status,
          raw_payload_included: false,
        },
      },
    });
    const response = Object.freeze({
      outcome: operation,
      fee_commitment: updated,
      fee_arrangement_comparison: comparison,
      audit_event: auditEvent,
      idempotent_replay: false,
    });
    tx.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "fee_commitment_update",
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
