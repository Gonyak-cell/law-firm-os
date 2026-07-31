import {
  assertOperationalPeopleProviderIdentityRepository,
  assertPeopleProviderIdentityRepository,
  createDurablePeopleProviderIdentityRepository,
  createTestPeopleProviderIdentityRepository,
} from "./people-provider-identity-repository.js";
import {
  normalizePeopleProviderAuditEvent,
  normalizePeopleProviderIdentityState,
} from "./people-provider-identity-state.js";
import { createPeopleProviderIdentityOperations } from "./people-provider-identity-operations.js";
import { createPeopleProviderIdentityRebindOperation } from "./people-provider-identity-rebind.js";

const normalizeState = normalizePeopleProviderIdentityState;
const normalizeAuditEvent = normalizePeopleProviderAuditEvent;

export function createPeopleProviderIdentityRegistryImpl({
  repository = createTestPeopleProviderIdentityRepository(),
  records,
  audit_events,
  rebind_receipts,
  clock = () => new Date().toISOString(),
  operational = false,
} = {}) {
  const stateRepository = operational
    ? assertOperationalPeopleProviderIdentityRepository(repository)
    : assertPeopleProviderIdentityRepository(repository);
  const repositoryState = stateRepository.loadState();
  let state = normalizeState(
    records || audit_events || rebind_receipts
      ? {
        ...repositoryState,
        records: records ?? repositoryState.records,
        audit_events: audit_events ?? repositoryState.audit_events,
        rebind_receipts: rebind_receipts ?? repositoryState.rebind_receipts,
      }
      : repositoryState,
  );

  function commit(nextState) {
    const normalized = normalizeState(nextState);
    try {
      stateRepository.replaceState(normalized);
      state = normalized;
    } catch (error) {
      state = normalizeState(stateRepository.loadState());
      throw error;
    }
  }

  function nextAuditEvent({
    action,
    tenant_id,
    employee_id,
    provider_identity_id,
    actor_id = null,
    reason = null,
    rebind_approval_ref = null,
    occurred_at,
  }) {
    let sequence = state.audit_events.length + 1;
    let auditEventId = `provider-identity-audit:${sequence}`;
    const existingIds = new Set(state.audit_events.map(({ audit_event_id }) => audit_event_id));
    while (existingIds.has(auditEventId)) auditEventId = `provider-identity-audit:${++sequence}`;
    return normalizeAuditEvent({
      audit_event_id: auditEventId,
      action,
      tenant_id,
      employee_id,
      provider_identity_id,
      actor_id,
      reason,
      rebind_approval_ref,
      occurred_at,
    });
  }

  const context = {
    get state() {
      return state;
    },
    stateRepository,
    clock,
    commit,
    nextAuditEvent,
  };
  const operations = createPeopleProviderIdentityOperations({ context });
  const rebind = createPeopleProviderIdentityRebindOperation({ context });
  return Object.freeze({ ...operations, rebind });
}
