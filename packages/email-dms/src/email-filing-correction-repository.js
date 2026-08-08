import { createDurableJsonStateController } from "../../persistence/src/durable-file.js";
import { assertNoDmsPersistedSecrets } from "../../dms/src/persistence-guard.js";
import { normalizeEmailFilingPlacementEvent } from "./email-filing-correction-model.js";

const EMPTY_STATE = Object.freeze({ placements: [], idempotency: [], audit_events: [] });

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function normalizeState(input = EMPTY_STATE) {
  return {
    placements: (input.placements ?? []).map((event) => {
      assertNoDmsPersistedSecrets(event, "email_filing_placement");
      return normalizeEmailFilingPlacementEvent(event);
    }),
    idempotency: (input.idempotency ?? []).map((entry) => {
      assertNoDmsPersistedSecrets(entry, "email_filing_correction_idempotency");
      return Object.freeze({
        tenant_id: String(entry.tenant_id),
        idempotency_key: String(entry.idempotency_key),
        request_fingerprint: String(entry.request_fingerprint),
        correction_id: String(entry.correction_id),
        placement_id: String(entry.placement_id),
        created_at: String(entry.created_at),
      });
    }),
    audit_events: (input.audit_events ?? []).map((event) => {
      assertNoDmsPersistedSecrets(event, "email_filing_correction_audit");
      return Object.freeze({ ...event });
    }),
  };
}

export function createEmailFilingCorrectionRepository({
  filePath,
  read_state,
  write_state,
} = {}) {
  let closed = false;
  let transactionDepth = 0;
  const controller = createDurableJsonStateController({
    filePath,
    defaultValue: EMPTY_STATE,
    normalizeValue: normalizeState,
    readState: read_state,
    writeState: write_state,
  });
  let state = controller.value;
  const placements = new Map();
  const idempotency = new Map();
  const audits = new Map();

  function assertOpen() {
    if (closed) throw new Error("Email filing correction repository is closed");
  }

  function hydrate(next) {
    placements.clear();
    idempotency.clear();
    audits.clear();
    for (const event of next.placements) {
      placements.set(`${event.tenant_id}:${event.placement_id}`, clone(event));
    }
    for (const entry of next.idempotency) {
      idempotency.set(`${entry.tenant_id}:${entry.idempotency_key}`, clone(entry));
    }
    for (const event of next.audit_events) {
      audits.set(`${event.tenant_id}:${event.event_id}`, clone(event));
    }
  }

  function currentState() {
    return {
      placements: [...placements.values()],
      idempotency: [...idempotency.values()],
      audit_events: [...audits.values()],
    };
  }

  function persist() {
    if (!filePath || transactionDepth > 0) return;
    try {
      controller.commit(currentState());
      state = controller.value;
    } catch (error) {
      try {
        state = controller.reload().value;
        hydrate(state);
        error.durable_store_reloaded = true;
      } catch {
        hydrate(state);
      }
      throw error;
    }
  }

  hydrate(state);

  const repository = {
    durable: Boolean(filePath),
    appendPlacement(input) {
      assertOpen();
      assertNoDmsPersistedSecrets(input, "email_filing_placement");
      const event = normalizeEmailFilingPlacementEvent(input);
      const key = `${event.tenant_id}:${event.placement_id}`;
      if (placements.has(key)) throw new Error(`placement already exists: ${event.placement_id}`);
      if ([...placements.values()].some((value) => (
        value.tenant_id === event.tenant_id
        && (
          value.correction_id === event.correction_id
          || value.idempotency_key === event.idempotency_key
          || (event.prior_placement_id && value.prior_placement_id === event.prior_placement_id)
          || (event.event_kind === "original" && value.event_kind === "original" && value.email_thread_id === event.email_thread_id)
        )
      ))) {
        throw new Error("placement uniqueness conflict");
      }
      placements.set(key, clone(event));
      persist();
      return event;
    },
    listPlacements(query = {}) {
      assertOpen();
      return Object.freeze([...placements.values()]
        .filter((event) => !query.tenant_id || event.tenant_id === query.tenant_id)
        .filter((event) => !query.email_thread_id || event.email_thread_id === query.email_thread_id)
        .map((event) => Object.freeze(clone(event))));
    },
    getIdempotency(ref = {}) {
      assertOpen();
      return Object.freeze(clone(idempotency.get(`${ref.tenant_id}:${ref.idempotency_key}`)));
    },
    recordIdempotency(input = {}) {
      assertOpen();
      assertNoDmsPersistedSecrets(input, "email_filing_correction_idempotency");
      const key = `${input.tenant_id}:${input.idempotency_key}`;
      if (idempotency.has(key)) throw new Error("idempotency key already exists");
      const entry = Object.freeze({
        tenant_id: input.tenant_id,
        idempotency_key: input.idempotency_key,
        request_fingerprint: input.request_fingerprint,
        correction_id: input.correction_id,
        placement_id: input.placement_id,
        created_at: input.created_at,
      });
      idempotency.set(key, clone(entry));
      persist();
      return entry;
    },
    appendAudit(input = {}) {
      assertOpen();
      assertNoDmsPersistedSecrets(input, "email_filing_correction_audit");
      const key = `${input.tenant_id}:${input.event_id}`;
      if (audits.has(key)) throw new Error("audit event already exists");
      const event = Object.freeze(clone(input));
      audits.set(key, clone(event));
      persist();
      return event;
    },
    listAudit(query = {}) {
      assertOpen();
      return Object.freeze([...audits.values()]
        .filter((event) => !query.tenant_id || event.tenant_id === query.tenant_id)
        .filter((event) => !query.object_id || event.object_id === query.object_id)
        .map((event) => Object.freeze(clone(event))));
    },
    transaction(fn) {
      assertOpen();
      if (typeof fn !== "function") throw new TypeError("transaction callback is required");
      const before = normalizeState(currentState());
      const entryDepth = transactionDepth;
      transactionDepth += 1;
      try {
        const result = fn(repository);
        if (result && typeof result.then === "function") {
          throw new TypeError("Email filing correction transactions must be synchronous");
        }
        transactionDepth = entryDepth;
        persist();
        return result;
      } catch (error) {
        if (!error?.durable_store_reloaded) hydrate(before);
        transactionDepth = entryDepth;
        throw error;
      } finally {
        transactionDepth = entryDepth;
      }
    },
    snapshot() {
      assertOpen();
      return Object.freeze(clone(currentState()));
    },
    close() {
      closed = true;
    },
  };

  return Object.freeze(repository);
}
