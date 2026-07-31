import {
  PEOPLE_PROVIDER,
  PEOPLE_PROVIDER_IDENTITY_STATE_SCHEMA_VERSION,
  normalizePeopleProviderIdentityRecord,
  optionalPeopleProviderId,
  peopleProviderFailure,
  requiredPeopleProviderId,
  requiredPeopleProviderReason,
} from "./people-provider-identity-state.js";
import {
  assertConnectable,
  buildConnectedRecord,
  publicAuditEvent,
  publicRecord,
} from "./people-provider-identity-helpers.js";

const requiredId = requiredPeopleProviderId;
const optionalId = optionalPeopleProviderId;
const requiredReason = requiredPeopleProviderReason;
const failure = peopleProviderFailure;
const normalizeRecord = normalizePeopleProviderIdentityRecord;

export function createPeopleProviderIdentityOperations({ context }) {
  function connect(input = {}) {
    const tenantId = requiredId(input.tenant_id, "tenant_id");
    const employeeTenantId = requiredId(input.employee_tenant_id ?? tenantId, "employee_tenant_id");
    const employeeId = requiredId(input.employee_id, "employee_id");
    const providerSubjectId = requiredId(input.provider_subject_id, "provider_subject_id");
    const consentRef = requiredId(input.consent_ref, "consent_ref");
    const provider = input.provider ?? PEOPLE_PROVIDER;
    if (provider !== PEOPLE_PROVIDER) throw failure("PEOPLE_PROVIDER_UNSUPPORTED", "Only Microsoft Graph is supported");
    if (employeeTenantId !== tenantId) {
      throw failure("PEOPLE_PROVIDER_CROSS_TENANT", "Employee and provider identity tenants must match");
    }
    if (Object.hasOwn(input, "email") || Object.hasOwn(input, "mail")) {
      throw failure("PEOPLE_PROVIDER_EMAIL_AUTHORITY_FORBIDDEN", "Email must not be used as provider identity authority");
    }
    assertConnectable({
      state: context.state,
      tenantId,
      employeeId,
      provider,
      providerSubjectId,
    });
    const connectedAt = String(context.clock());
    const record = buildConnectedRecord(input, {
      state: context.state,
      tenantId,
      employeeId,
      provider,
      providerSubjectId,
      consentRef,
      connectedAt,
    });
    const auditEvent = context.nextAuditEvent({
      action: "people.provider_identity.connected",
      tenant_id: tenantId,
      employee_id: employeeId,
      provider_identity_id: record.provider_identity_id,
      actor_id: optionalId(input.actor_id, "actor_id"),
      occurred_at: connectedAt,
    });
    context.commit({
      ...context.state,
      records: [...context.state.records, record],
      audit_events: [...context.state.audit_events, auditEvent],
    });
    return publicRecord(record);
  }

  function disconnect({ tenant_id, provider_identity_id, actor_id = null, reason = null } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    const providerIdentityId = requiredId(provider_identity_id, "provider_identity_id");
    const record = context.state.records.find((candidate) => (
      candidate.tenant_id === tenantId
      && candidate.provider_identity_id === providerIdentityId
    ));
    if (!record) throw failure("PEOPLE_PROVIDER_IDENTITY_NOT_FOUND", "Provider identity was not found");
    if (record.connection_state === "disconnected") return publicRecord(record);
    const disconnectedAt = String(context.clock());
    const nextRecord = normalizeRecord({
      ...record,
      connection_state: "disconnected",
      disconnected_at: disconnectedAt,
    });
    const auditEvent = context.nextAuditEvent({
      action: "people.provider_identity.disconnected",
      tenant_id: tenantId,
      employee_id: record.employee_id,
      provider_identity_id: record.provider_identity_id,
      actor_id: optionalId(actor_id, "actor_id"),
      reason: reason == null ? null : requiredReason(reason),
      occurred_at: disconnectedAt,
    });
    context.commit({
      ...context.state,
      records: context.state.records.map((candidate) => (
        candidate.tenant_id === tenantId && candidate.provider_identity_id === providerIdentityId
          ? nextRecord
          : candidate
      )),
      audit_events: [...context.state.audit_events, auditEvent],
    });
    return publicRecord(nextRecord);
  }

  function get({ tenant_id, employee_id } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    const employeeId = requiredId(employee_id, "employee_id");
    const record = context.state.records.find((candidate) => (
      candidate.connection_state === "connected"
      && candidate.tenant_id === tenantId
      && candidate.employee_id === employeeId
      && candidate.provider === PEOPLE_PROVIDER
    ));
    return record ? publicRecord(record) : null;
  }

  function history({ tenant_id, employee_id = null, provider_subject_id = null } = {}) {
    const tenantId = requiredId(tenant_id, "tenant_id");
    const employeeId = optionalId(employee_id, "employee_id");
    const providerSubjectId = optionalId(provider_subject_id, "provider_subject_id");
    return Object.freeze(
      context.state.records
        .filter((record) => record.tenant_id === tenantId)
        .filter((record) => !employeeId || record.employee_id === employeeId)
        .filter((record) => !providerSubjectId || record.provider_subject_id === providerSubjectId)
        .map(publicRecord),
    );
  }

  function snapshot() {
    return Object.freeze({
      schema_version: PEOPLE_PROVIDER_IDENTITY_STATE_SCHEMA_VERSION,
      repository: Object.freeze({
        durable: context.stateRepository.durable === true,
        test_only: context.stateRepository.test_only === true,
      }),
      records: Object.freeze(context.state.records.map(publicRecord)),
      audit_events: Object.freeze(context.state.audit_events.map(publicAuditEvent)),
      rebind_receipts: Object.freeze(context.state.rebind_receipts.map((receipt) => Object.freeze({ ...receipt }))),
    });
  }

  return Object.freeze({ connect, disconnect, get, history, snapshot });
}
