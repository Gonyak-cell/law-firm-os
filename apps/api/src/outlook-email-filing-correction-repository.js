import { normalizeEmailFilingPlacementEvent } from "../../../packages/email-dms/src/email-filing-correction-model.js";
import { correctionTrustError } from "../../../packages/email-dms/src/email-filing-correction-trust-boundary.js";
import {
  CORRECTION_PLACEMENT_MODEL,
  appendCorrectionProjection,
  correctionAuditRecord,
} from "./outlook-email-filing-correction-projection.js";
import { correctionProjectionConflict } from "./outlook-email-filing-correction-projection-validation.js";

const TRANSACTION_TAILS = new WeakMap();

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function requireDependencies(repository, resolveDocumentBinding) {
  for (const method of [
    "appendAudit", "create", "get", "getIdempotency", "list",
    "listAudit", "recordIdempotency", "transaction",
  ]) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`Matter repository.${method} is required`);
    }
  }
  if (typeof resolveDocumentBinding !== "function") {
    throw new TypeError("correction resolve_document_binding is required");
  }
}

function placementRecords(repository, { tenant_id, email_thread_id } = {}) {
  return repository.list({ tenant_id, model_type: CORRECTION_PLACEMENT_MODEL })
    .filter((record) => !email_thread_id || record.email_thread_id === email_thread_id)
    .map((record) => normalizeEmailFilingPlacementEvent({
      ...record,
      model_type: record.event_model_type,
    }));
}

function placementVersion(events) {
  return JSON.stringify(events
    .map((event) => [event.placement_id, event.payload_fingerprint])
    .sort((left, right) => left[0].localeCompare(right[0])));
}

function serialize(repository, execute) {
  const prior = TRANSACTION_TAILS.get(repository) ?? Promise.resolve();
  const current = prior.then(execute, execute);
  TRANSACTION_TAILS.set(repository, current.then(() => undefined, () => undefined));
  return current;
}

function transactionView(options, starting, stagedPlacements, stagedAudits) {
  return Object.freeze({
    listPlacements(query = {}) {
      return Object.freeze([...starting, ...stagedPlacements]
        .filter((event) => event.tenant_id === query.tenant_id)
        .filter((event) => !query.email_thread_id
          || event.email_thread_id === query.email_thread_id));
    },
    getIdempotency(ref = {}) {
      const event = [...starting, ...stagedPlacements].find((candidate) => (
        candidate.event_kind === "correction"
        && candidate.tenant_id === ref.tenant_id
        && candidate.idempotency_key === ref.idempotency_key
      ));
      return event ? Object.freeze({
        tenant_id: event.tenant_id,
        idempotency_key: event.idempotency_key,
        request_fingerprint: event.payload_fingerprint,
        correction_id: event.correction_id,
        placement_id: event.placement_id,
        source_matter_id: event.source_matter_id,
        created_at: event.occurred_at,
      }) : undefined;
    },
    appendPlacement(input) {
      if (options.read_only === true) throw new TypeError("read-only correction transaction");
      const event = normalizeEmailFilingPlacementEvent(input);
      const all = [...starting, ...stagedPlacements];
      if (all.some((value) => value.tenant_id === event.tenant_id && (
        value.placement_id === event.placement_id
        || value.correction_id === event.correction_id
        || value.idempotency_key === event.idempotency_key
        || (event.prior_placement_id && value.prior_placement_id === event.prior_placement_id)
        || (event.event_kind === "original" && value.event_kind === "original"
          && value.email_thread_id === event.email_thread_id)
      ))) throw correctionProjectionConflict();
      stagedPlacements.push(event);
      return event;
    },
    appendAudit(input) {
      if (options.read_only === true) throw new TypeError("read-only correction transaction");
      stagedAudits.push(Object.freeze(clone(input)));
      return input;
    },
  });
}

function commit(repository, tenantId, starting, placements, audits, resolveBinding) {
  repository.transaction((writer) => {
    const fresh = placementRecords(writer, { tenant_id: tenantId });
    if (placementVersion(fresh) !== placementVersion(starting)) {
      throw correctionTrustError(
        "EMAIL_FILING_CORRECTION_STALE_PLACEMENT",
        "expected placement is no longer current",
      );
    }
    const projections = new Map();
    for (const event of placements) {
      writer.create({
        ...event,
        event_model_type: event.model_type,
        model_type: CORRECTION_PLACEMENT_MODEL,
        resource_id: event.placement_id,
        matter_id: event.target_matter_id,
      });
      if (event.event_kind === "correction") {
        projections.set(
          event.correction_id,
          appendCorrectionProjection(writer, event, resolveBinding(event)),
        );
      }
    }
    for (const audit of audits) {
      const projection = projections.get(audit.object_id);
      if (audit.object_type === "EmailFilingCorrection" && !projection) {
        throw correctionProjectionConflict();
      }
      writer.appendAudit(projection
        ? correctionAuditRecord(audit, projection.contract)
        : audit);
    }
  });
}

export function createMatterBackedEmailFilingCorrectionRepository({
  repository,
  resolve_document_binding: resolveDocumentBinding,
} = {}) {
  requireDependencies(repository, resolveDocumentBinding);
  return Object.freeze({
    durable: repository.durable === true,
    transaction(options = {}, fn) {
      if (typeof fn !== "function") throw new TypeError("transaction callback is required");
      const tenantId = String(options.tenant_id ?? "").trim();
      if (!tenantId) throw new TypeError("transaction tenant_id is required");
      return serialize(repository, async () => {
        const starting = placementRecords(repository, { tenant_id: tenantId });
        const stagedPlacements = [];
        const stagedAudits = [];
        const result = await fn(transactionView(
          options,
          starting,
          stagedPlacements,
          stagedAudits,
        ));
        if (
          options.read_only !== true
          && (stagedPlacements.length > 0 || stagedAudits.length > 0)
        ) {
          commit(
            repository,
            tenantId,
            starting,
            stagedPlacements,
            stagedAudits,
            resolveDocumentBinding,
          );
        }
        return result;
      });
    },
  });
}
