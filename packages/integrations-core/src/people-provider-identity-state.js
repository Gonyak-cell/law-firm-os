export const PEOPLE_PROVIDER = "microsoft_graph";
export const PEOPLE_PROVIDER_IDENTITY_STATE_SCHEMA_VERSION = "people-provider-identity.v1";

const SAFE_ID = /^[A-Za-z0-9._:-]{1,200}$/;

export function peopleProviderIdentityKey(tenantId, providerIdentityId) {
  return `${tenantId}\u0000${providerIdentityId}`;
}

export function requiredPeopleProviderId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value.trim())) {
    throw new TypeError(`${field} must be a safe identifier`);
  }
  return value.trim();
}

export function optionalPeopleProviderId(value, field) {
  return value == null ? null : requiredPeopleProviderId(value, field);
}

export function requiredPeopleProviderReason(value, field = "reason") {
  if (typeof value !== "string" || value.trim().length < 3 || value.trim().length > 500) {
    throw new TypeError(`${field} must be between 3 and 500 characters`);
  }
  return value.trim();
}

export function peopleProviderFailure(code, message) {
  const error = new Error(message);
  error.safe_error_code = code;
  return error;
}

export function clonePeopleProviderValue(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function emptyPeopleProviderIdentityState() {
  return {
    schema_version: PEOPLE_PROVIDER_IDENTITY_STATE_SCHEMA_VERSION,
    records: [],
    audit_events: [],
    rebind_receipts: [],
  };
}

export function normalizePeopleProviderIdentityRecord(input = {}) {
  const tenantId = requiredPeopleProviderId(input.tenant_id, "tenant_id");
  const employeeId = requiredPeopleProviderId(input.employee_id, "employee_id");
  const provider = input.provider ?? PEOPLE_PROVIDER;
  if (provider !== PEOPLE_PROVIDER) {
    throw peopleProviderFailure("PEOPLE_PROVIDER_UNSUPPORTED", "Only Microsoft Graph is supported");
  }
  const connectionState = input.connection_state ?? "connected";
  if (!["connected", "disconnected"].includes(connectionState)) {
    throw new TypeError("connection_state must be connected or disconnected");
  }
  const connectedAt = String(input.connected_at ?? "");
  if (!Number.isFinite(Date.parse(connectedAt))) {
    throw new TypeError("connected_at must be an ISO timestamp");
  }
  const disconnectedAt = input.disconnected_at == null ? null : String(input.disconnected_at);
  if (connectionState === "disconnected" && !Number.isFinite(Date.parse(disconnectedAt))) {
    throw new TypeError("disconnected_at must be an ISO timestamp for disconnected identities");
  }
  if (connectionState === "connected" && disconnectedAt !== null) {
    throw new TypeError("connected identities must not have disconnected_at");
  }
  return {
    provider_identity_id: requiredPeopleProviderId(input.provider_identity_id, "provider_identity_id"),
    tenant_id: tenantId,
    employee_id: employeeId,
    provider,
    provider_subject_id: requiredPeopleProviderId(input.provider_subject_id, "provider_subject_id"),
    connection_state: connectionState,
    consent_ref: requiredPeopleProviderId(input.consent_ref, "consent_ref"),
    connected_at: connectedAt,
    disconnected_at: disconnectedAt,
    rebind_from_provider_identity_id: optionalPeopleProviderId(
      input.rebind_from_provider_identity_id,
      "rebind_from_provider_identity_id",
    ),
    rebind_approval_ref: optionalPeopleProviderId(input.rebind_approval_ref, "rebind_approval_ref"),
  };
}

export function normalizePeopleProviderAuditEvent(input = {}) {
  const occurredAt = String(input.occurred_at ?? "");
  if (!Number.isFinite(Date.parse(occurredAt))) {
    throw new TypeError("audit occurred_at must be an ISO timestamp");
  }
  return {
    audit_event_id: requiredPeopleProviderId(input.audit_event_id, "audit_event_id"),
    action: requiredPeopleProviderId(input.action, "action"),
    tenant_id: requiredPeopleProviderId(input.tenant_id, "tenant_id"),
    employee_id: requiredPeopleProviderId(input.employee_id, "employee_id"),
    provider_identity_id: requiredPeopleProviderId(input.provider_identity_id, "provider_identity_id"),
    actor_id: optionalPeopleProviderId(input.actor_id, "actor_id"),
    reason: input.reason == null ? null : requiredPeopleProviderReason(input.reason),
    rebind_approval_ref: optionalPeopleProviderId(input.rebind_approval_ref, "rebind_approval_ref"),
    occurred_at: occurredAt,
  };
}

export function normalizePeopleProviderRebindReceipt(input = {}) {
  const occurredAt = String(input.occurred_at ?? "");
  if (!Number.isFinite(Date.parse(occurredAt))) {
    throw new TypeError("rebind receipt occurred_at must be an ISO timestamp");
  }
  return {
    tenant_id: requiredPeopleProviderId(input.tenant_id, "tenant_id"),
    rebind_approval_ref: requiredPeopleProviderId(input.rebind_approval_ref, "rebind_approval_ref"),
    source_provider_identity_id: requiredPeopleProviderId(
      input.source_provider_identity_id,
      "source_provider_identity_id",
    ),
    target_provider_identity_id: requiredPeopleProviderId(
      input.target_provider_identity_id,
      "target_provider_identity_id",
    ),
    target_employee_id: requiredPeopleProviderId(input.target_employee_id, "target_employee_id"),
    provider_subject_id: requiredPeopleProviderId(input.provider_subject_id, "provider_subject_id"),
    consent_ref: requiredPeopleProviderId(input.consent_ref, "consent_ref"),
    requested_provider_identity_id: optionalPeopleProviderId(
      input.requested_provider_identity_id,
      "requested_provider_identity_id",
    ),
    approved_by_actor_id: requiredPeopleProviderId(input.approved_by_actor_id, "approved_by_actor_id"),
    reason: requiredPeopleProviderReason(input.reason),
    occurred_at: occurredAt,
  };
}

export function normalizePeopleProviderIdentityState(input) {
  const value = input && typeof input === "object" ? input : emptyPeopleProviderIdentityState();
  const state = {
    ...emptyPeopleProviderIdentityState(),
    ...clonePeopleProviderValue(value),
    schema_version: PEOPLE_PROVIDER_IDENTITY_STATE_SCHEMA_VERSION,
    records: (value.records ?? []).map(normalizePeopleProviderIdentityRecord),
    audit_events: (value.audit_events ?? []).map(normalizePeopleProviderAuditEvent),
    rebind_receipts: (value.rebind_receipts ?? []).map(normalizePeopleProviderRebindReceipt),
  };
  const identityIds = new Set();
  const consentKeys = new Set();
  const auditIds = new Set();
  const rebindKeys = new Set();
  const activeEmployees = new Set();
  const activeSubjects = new Set();
  for (const record of state.records) {
    const identityKey = peopleProviderIdentityKey(record.tenant_id, record.provider_identity_id);
    if (identityIds.has(identityKey)) {
      throw peopleProviderFailure("PEOPLE_PROVIDER_IDENTITY_DUPLICATE", "Provider identity id must be unique");
    }
    identityIds.add(identityKey);
    const consentKey = `${record.tenant_id}\u0000${record.consent_ref}`;
    if (consentKeys.has(consentKey)) {
      throw peopleProviderFailure("PEOPLE_PROVIDER_CONSENT_DUPLICATE", "Consent reference must be tenant-unique");
    }
    consentKeys.add(consentKey);
    if (record.connection_state !== "connected") continue;
    const employeeKey = `${record.tenant_id}\u0000${record.provider}\u0000${record.employee_id}`;
    const subjectKey = `${record.tenant_id}\u0000${record.provider}\u0000${record.provider_subject_id}`;
    if (activeEmployees.has(employeeKey)) {
      throw peopleProviderFailure(
        "PEOPLE_PROVIDER_EMPLOYEE_ALREADY_CONNECTED",
        "Employee already has an active provider identity",
      );
    }
    if (activeSubjects.has(subjectKey)) {
      throw peopleProviderFailure(
        "PEOPLE_PROVIDER_SUBJECT_ALREADY_CONNECTED",
        "Provider subject is already connected",
      );
    }
    activeEmployees.add(employeeKey);
    activeSubjects.add(subjectKey);
  }
  for (const event of state.audit_events) {
    if (auditIds.has(event.audit_event_id)) {
      throw peopleProviderFailure("PEOPLE_PROVIDER_AUDIT_DUPLICATE", "Provider identity audit id must be unique");
    }
    auditIds.add(event.audit_event_id);
  }
  for (const receipt of state.rebind_receipts) {
    const key = `${receipt.tenant_id}\u0000${receipt.rebind_approval_ref}`;
    if (rebindKeys.has(key)) {
      throw peopleProviderFailure(
        "PEOPLE_PROVIDER_REBIND_APPROVAL_REUSED",
        "Rebind approval reference must be tenant-unique",
      );
    }
    rebindKeys.add(key);
    const source = state.records.find((record) => (
      record.provider_identity_id === receipt.source_provider_identity_id
      && record.tenant_id === receipt.tenant_id
    ));
    const target = state.records.find((record) => (
      record.provider_identity_id === receipt.target_provider_identity_id
      && record.tenant_id === receipt.tenant_id
    ));
    if (
      !source
      || !target
      || target.employee_id !== receipt.target_employee_id
      || target.provider_subject_id !== receipt.provider_subject_id
      || target.consent_ref !== receipt.consent_ref
      || (
        receipt.requested_provider_identity_id !== null
        && target.provider_identity_id !== receipt.requested_provider_identity_id
      )
      || target.rebind_from_provider_identity_id !== source.provider_identity_id
      || target.rebind_approval_ref !== receipt.rebind_approval_ref
    ) {
      throw peopleProviderFailure(
        "PEOPLE_PROVIDER_REBIND_RECEIPT_INVALID",
        "Rebind receipt must match its tenant-scoped source and target identities",
      );
    }
  }
  return state;
}
