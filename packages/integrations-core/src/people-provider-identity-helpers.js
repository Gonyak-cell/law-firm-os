import {
  PEOPLE_PROVIDER,
  clonePeopleProviderValue,
  normalizePeopleProviderIdentityRecord,
  optionalPeopleProviderId,
  peopleProviderFailure,
  peopleProviderIdentityKey,
  requiredPeopleProviderId,
} from "./people-provider-identity-state.js";

const failure = peopleProviderFailure;
const requiredId = requiredPeopleProviderId;
const optionalId = optionalPeopleProviderId;
const normalizeRecord = normalizePeopleProviderIdentityRecord;

export function publicRecord(record) {
  return Object.freeze(clonePeopleProviderValue(record));
}

export function publicAuditEvent(event) {
  return Object.freeze(clonePeopleProviderValue(event));
}

export function assertConnectable({ state, tenantId, employeeId, provider, providerSubjectId, allowHistoricalRebind = false }) {
  const active = state.records.filter((record) => record.connection_state === "connected");
  if (active.some((record) => (
    record.tenant_id === tenantId
    && record.employee_id === employeeId
    && record.provider === provider
  ))) {
    throw failure("PEOPLE_PROVIDER_EMPLOYEE_ALREADY_CONNECTED", "Employee already has an active provider identity");
  }
  if (active.some((record) => (
    record.tenant_id === tenantId
    && record.provider === provider
    && record.provider_subject_id === providerSubjectId
  ))) {
    throw failure("PEOPLE_PROVIDER_SUBJECT_ALREADY_CONNECTED", "Provider subject is already connected");
  }
  let latestSubjectRecord = null;
  for (const record of state.records) {
    if (
      record.tenant_id !== tenantId
      || record.provider !== provider
      || record.provider_subject_id !== providerSubjectId
    ) continue;
    // `records` is the durable append order. Wall-clock values can move
    // backwards across provider callbacks and must not rewrite ownership.
    latestSubjectRecord = record;
  }
  if (latestSubjectRecord && latestSubjectRecord.employee_id !== employeeId && !allowHistoricalRebind) {
    throw failure(
      "PEOPLE_PROVIDER_SUBJECT_REBIND_REQUIRED",
      "Provider subject was previously linked to another employee and requires explicit rebind approval",
    );
  }
}

export function buildConnectedRecord(input, {
  state,
  tenantId,
  employeeId,
  provider,
  providerSubjectId,
  consentRef,
  connectedAt,
  rebindFromProviderIdentityId = null,
  rebindApprovalRef = null,
}) {
  const providerIdentityId = requiredId(
    input.provider_identity_id
      ?? `provider-identity:${tenantId}:${employeeId}:${state.records.length + 1}`,
    "provider_identity_id",
  );
  if (state.records.some((record) => (
    peopleProviderIdentityKey(record.tenant_id, record.provider_identity_id)
    === peopleProviderIdentityKey(tenantId, providerIdentityId)
  ))) {
    throw failure("PEOPLE_PROVIDER_IDENTITY_DUPLICATE", "Provider identity id must be unique within a tenant");
  }
  return normalizeRecord({
    provider_identity_id: providerIdentityId,
    tenant_id: tenantId,
    employee_id: employeeId,
    provider,
    provider_subject_id: providerSubjectId,
    connection_state: "connected",
    consent_ref: consentRef,
    connected_at: connectedAt,
    disconnected_at: null,
    rebind_from_provider_identity_id: rebindFromProviderIdentityId,
    rebind_approval_ref: rebindApprovalRef,
  });
}

export function sameRebindRequest(receipt, {
  tenantId,
  sourceProviderIdentityId,
  employeeId,
  providerSubjectId,
  consentRef,
  requestedProviderIdentityId,
  approvedByActorId,
  reason,
}) {
  return receipt.tenant_id === tenantId
    && receipt.source_provider_identity_id === sourceProviderIdentityId
    && receipt.target_employee_id === employeeId
    && receipt.provider_subject_id === providerSubjectId
    && receipt.consent_ref === consentRef
    && receipt.requested_provider_identity_id === requestedProviderIdentityId
    && receipt.approved_by_actor_id === approvedByActorId
    && receipt.reason === reason;
}

export function replayTarget({ state, tenantId, replay }) {
  const replayRecord = state.records.find((record) => (
    record.tenant_id === tenantId
    && record.provider_identity_id === replay.target_provider_identity_id
  ));
  if (!replayRecord) {
    throw failure(
      "PEOPLE_PROVIDER_REBIND_RECEIPT_INVALID",
      "Rebind receipt target was not found in its tenant",
    );
  }
  return replayRecord;
}

export { PEOPLE_PROVIDER, optionalId };
