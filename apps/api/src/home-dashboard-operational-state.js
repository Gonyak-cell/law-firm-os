import { createHash } from "node:crypto";
import { createAnalyticsRepository } from "../../../packages/analytics/src/runtime-repository.js";
import { stableJsonStringify } from "../../../packages/persistence/src/durable-file.js";

export const HOME_OPERATIONAL_STATE_SCHEMA_VERSION = "law-firm-os.home-operational-state.v1";

const DECISION_MODEL = "HomeOperationalDecision";
const OUTBOX_MODEL = "HomeOperationalOutboxEvent";
const OWNER_MODULE = "home-dashboard";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function assertAppendOnly(current, next, field) {
  if (!Array.isArray(next) || next.length < current.length) throw new Error(`Home operational ${field} is append-only`);
  for (let index = 0; index < current.length; index += 1) {
    if (stableJsonStringify(current[index]) !== stableJsonStringify(next[index])) throw new Error(`Home operational ${field} history cannot be rewritten`);
  }
}

function validateState(state) {
  const decisionKeys = new Set();
  for (const decision of state.decisions) {
    if (!decision?.tenant_id || !decision?.storage_key || !decision?.idempotency_key) throw new TypeError("Home decision tenant/version contract is incomplete");
    if (decision.storage_key !== `${decision.tenant_id}:${decision.idempotency_key}`) throw new TypeError("Home decision tenant storage key is invalid");
    if (!Number.isSafeInteger(decision.state_version) || decision.state_version < 1) throw new TypeError("Home decision state_version is invalid");
    if (decisionKeys.has(decision.storage_key)) throw new TypeError("Home decision storage_key is duplicated");
    decisionKeys.add(decision.storage_key);
  }
  for (const [field, idField] of [["audit_events", "audit_event_id"], ["outbox_events", "outbox_event_id"]]) {
    const ids = new Set();
    for (const event of state[field]) {
      if (!event?.tenant_id || !event?.[idField] || event.raw_payload_included !== false) throw new TypeError(`Home operational ${field} contract is incomplete`);
      if (ids.has(event[idField])) throw new TypeError(`Home operational ${field} id is duplicated`);
      ids.add(event[idField]);
    }
  }
}

function hydrate(repository) {
  const decisionRows = repository.list({ model_type: DECISION_MODEL });
  const outboxRows = repository.list({ model_type: OUTBOX_MODEL });
  const auditRows = repository.listAudit().filter((event) =>
    event.owner_module === OWNER_MODULE || event.payload?.home_operational_event);
  const allRows = [...decisionRows, ...outboxRows, ...auditRows];
  const state = {
    schema_version: HOME_OPERATIONAL_STATE_SCHEMA_VERSION,
    state_version: allRows.reduce((maximum, row) => Math.max(maximum, row.commit_version ?? 0), 0),
    decisions: decisionRows.map((row) => clone(row.payload)),
    audit_events: auditRows.map((row) => clone(
      row.payload?.home_operational_event
        ? { ...row.payload.home_operational_event, raw_payload_included: false }
        : row.payload,
    )),
    outbox_events: outboxRows.map((row) => clone(row.payload)),
  };
  validateState(state);
  return state;
}

function operationalRecord({ model_type, id, tenant_id, payload, commit_version }) {
  return {
    model_type,
    id,
    tenant_id,
    payload: clone(payload),
    commit_version,
    owner_module: OWNER_MODULE,
    dispatches_analytics_runtime: false,
    writes_audit_event: model_type !== OUTBOX_MODEL,
    production_ready_claim: false,
  };
}

export function createHomeDashboardOperationalState({ repository, filePath } = {}) {
  const operationalRepository = repository ?? createAnalyticsRepository({ filePath });
  let state = hydrate(operationalRepository);

  return Object.freeze({
    get generation() {
      return state.state_version;
    },
    snapshot() {
      return Object.freeze(clone(state));
    },
    commit({ decisions, audit_events, outbox_events } = {}) {
      assertAppendOnly(state.decisions, decisions, "decisions");
      assertAppendOnly(state.audit_events, audit_events, "audit_events");
      assertAppendOnly(state.outbox_events, outbox_events, "outbox_events");
      const next = {
        schema_version: HOME_OPERATIONAL_STATE_SCHEMA_VERSION,
        state_version: state.state_version + 1,
        decisions: clone(decisions),
        audit_events: clone(audit_events),
        outbox_events: clone(outbox_events),
      };
      validateState(next);
      operationalRepository.transaction((tx) => {
        for (const decision of next.decisions.slice(state.decisions.length)) {
          tx.create(operationalRecord({
            model_type: DECISION_MODEL,
            id: `home-decision:${decision.storage_key}`,
            tenant_id: decision.tenant_id,
            payload: decision,
            commit_version: next.state_version,
          }));
        }
        for (const event of next.audit_events.slice(state.audit_events.length)) {
          const safeEvent = clone(event);
          delete safeEvent.raw_payload_included;
          tx.appendAudit({
            event_id: `home:${event.audit_event_id}`,
            tenant_id: event.tenant_id,
            action: event.action,
            actor_id: event.actor_id,
            object_type: event.object_type,
            object_id: event.object_id,
            owner_module: OWNER_MODULE,
            payload: {
              imported_event_hash: createHash("sha256").update(stableJsonStringify(event)).digest("hex"),
              source_payload_included: false,
              home_operational_event: clone(safeEvent),
            },
            created_at: event.created_at,
            commit_version: next.state_version,
            raw_payload_included: false,
            production_ready_claim: false,
          });
        }
        for (const event of next.outbox_events.slice(state.outbox_events.length)) {
          tx.create(operationalRecord({
            model_type: OUTBOX_MODEL,
            id: `home-outbox:${event.outbox_event_id}`,
            tenant_id: event.tenant_id,
            payload: event,
            commit_version: next.state_version,
          }));
        }
      });
      state = next;
      return Object.freeze(clone(next));
    },
    reload() {
      state = hydrate(operationalRepository);
      return Object.freeze(clone(state));
    },
  });
}
