import { isDurableStoreConflict } from "../../persistence/src/durable-file.js";
import {
  normalizePeopleProviderRebindReceipt,
  optionalPeopleProviderId,
  peopleProviderFailure,
  requiredPeopleProviderId,
  requiredPeopleProviderReason,
} from "./people-provider-identity-state.js";
import {
  assertConnectable,
  buildConnectedRecord,
  publicRecord,
  replayTarget,
  sameRebindRequest,
} from "./people-provider-identity-helpers.js";

const MAX_REBIND_COMMIT_ATTEMPTS = 2;
const requiredId = requiredPeopleProviderId;
const optionalId = optionalPeopleProviderId;
const requiredReason = requiredPeopleProviderReason;
const failure = peopleProviderFailure;
const normalizeRebindReceipt = normalizePeopleProviderRebindReceipt;

export function createPeopleProviderIdentityRebindOperation({ context }) {
  return function rebind(input = {}) {
    const tenantId = requiredId(input.tenant_id, "tenant_id");
    const employeeTenantId = requiredId(input.employee_tenant_id ?? tenantId, "employee_tenant_id");
    if (tenantId !== employeeTenantId) {
      throw failure("PEOPLE_PROVIDER_CROSS_TENANT", "Employee and provider identity tenants must match");
    }
    if (Object.hasOwn(input, "email") || Object.hasOwn(input, "mail")) {
      throw failure("PEOPLE_PROVIDER_EMAIL_AUTHORITY_FORBIDDEN", "Email must not be used as provider identity authority");
    }
    const sourceProviderIdentityId = requiredId(input.source_provider_identity_id, "source_provider_identity_id");
    const employeeId = requiredId(input.employee_id, "employee_id");
    const consentRef = requiredId(input.consent_ref, "consent_ref");
    const approvalRef = requiredId(input.rebind_approval_ref, "rebind_approval_ref");
    const approvedByActorId = requiredId(input.approved_by_actor_id, "approved_by_actor_id");
    const reason = requiredReason(input.reason);
    const requestedProviderIdentityId = optionalId(input.provider_identity_id, "provider_identity_id");
    let lastConflict = null;

    for (let attempt = 0; attempt < MAX_REBIND_COMMIT_ATTEMPTS; attempt += 1) {
      const source = context.state.records.find((record) => (
        record.tenant_id === tenantId
        && record.provider_identity_id === sourceProviderIdentityId
      ));
      if (!source) throw failure("PEOPLE_PROVIDER_IDENTITY_NOT_FOUND", "Provider identity was not found");
      if (source.connection_state !== "disconnected") {
        throw failure("PEOPLE_PROVIDER_REBIND_SOURCE_ACTIVE", "Provider identity must be disconnected before rebind");
      }
      if (source.employee_id === employeeId) {
        throw failure("PEOPLE_PROVIDER_REBIND_NOT_REQUIRED", "Reconnect the same employee without a rebind approval");
      }
      const replay = context.state.rebind_receipts.find((receipt) => (
        receipt.tenant_id === tenantId && receipt.rebind_approval_ref === approvalRef
      ));
      if (replay) {
        if (!sameRebindRequest(replay, {
          tenantId,
          sourceProviderIdentityId,
          employeeId,
          providerSubjectId: source.provider_subject_id,
          consentRef,
          requestedProviderIdentityId,
          approvedByActorId,
          reason,
        })) {
          throw failure(
            "PEOPLE_PROVIDER_REBIND_APPROVAL_REUSED",
            "Rebind approval reference was already used for another request",
          );
        }
        return publicRecord(replayTarget({ state: context.state, tenantId, replay }));
      }

      assertConnectable({
        state: context.state,
        tenantId,
        employeeId,
        provider: source.provider,
        providerSubjectId: source.provider_subject_id,
        allowHistoricalRebind: true,
      });
      const connectedAt = String(context.clock());
      const record = buildConnectedRecord(input, {
        state: context.state,
        tenantId,
        employeeId,
        provider: source.provider,
        providerSubjectId: source.provider_subject_id,
        consentRef,
        connectedAt,
        rebindFromProviderIdentityId: source.provider_identity_id,
        rebindApprovalRef: approvalRef,
      });
      const auditEvent = context.nextAuditEvent({
        action: "people.provider_identity.rebound",
        tenant_id: tenantId,
        employee_id: employeeId,
        provider_identity_id: record.provider_identity_id,
        actor_id: approvedByActorId,
        reason,
        rebind_approval_ref: approvalRef,
        occurred_at: connectedAt,
      });
      const receipt = normalizeRebindReceipt({
        tenant_id: tenantId,
        rebind_approval_ref: approvalRef,
        source_provider_identity_id: source.provider_identity_id,
        target_provider_identity_id: record.provider_identity_id,
        target_employee_id: employeeId,
        provider_subject_id: source.provider_subject_id,
        consent_ref: consentRef,
        requested_provider_identity_id: requestedProviderIdentityId,
        approved_by_actor_id: approvedByActorId,
        reason,
        occurred_at: connectedAt,
      });
      try {
        context.commit({
          ...context.state,
          records: [...context.state.records, record],
          audit_events: [...context.state.audit_events, auditEvent],
          rebind_receipts: [...context.state.rebind_receipts, receipt],
        });
        return publicRecord(record);
      } catch (error) {
        if (!isDurableStoreConflict(error)) throw error;
        lastConflict = error;
      }
    }
    throw lastConflict;
  };
}
