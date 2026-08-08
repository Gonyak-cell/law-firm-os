import { randomUUID } from "node:crypto";
import {
  createEmailFilingCorrection,
  createOriginalEmailFilingPlacement,
  deriveEmailFilingPlacementChain,
  emailFilingCorrectionFingerprint,
  normalizeOriginalEmailFiling,
} from "./email-filing-correction-model.js";

function codedError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    code,
    safe_error_code: code,
    status,
  });
}

function assertRepository(repository) {
  for (const method of [
    "appendPlacement",
    "listPlacements",
    "getIdempotency",
    "recordIdempotency",
    "appendAudit",
    "transaction",
  ]) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError(`correction repository.${method} is required`);
    }
  }
}

function assertOriginalIdentity(input, original) {
  for (const field of [
    "tenant_id",
    "email_thread_id",
    "document_id",
    "mime_sha256",
    "original_receipt_id",
  ]) {
    if (input[field] !== original[field]) {
      throw codedError(
        "EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT",
        "correction does not match the immutable original filing",
      );
    }
  }
}

function recordsFor(tx, original) {
  return tx.listPlacements({
    tenant_id: original.tenant_id,
    email_thread_id: original.email_thread_id,
  });
}

function result(outcome, correction, chain) {
  return Object.freeze({
    outcome,
    correction,
    current_placement: chain.current,
    placement_history: chain.history,
  });
}

export function createEmailFilingCorrectionService({
  repository,
  clock = () => new Date(),
  id_factory = randomUUID,
  authorize_actor = () => true,
} = {}) {
  assertRepository(repository);
  if (typeof clock !== "function") throw new TypeError("correction clock is required");
  if (typeof id_factory !== "function") throw new TypeError("correction id_factory is required");
  if (typeof authorize_actor !== "function") throw new TypeError("correction authorize_actor is required");

  return Object.freeze({
    currentPlacement({ original_filing } = {}) {
      const original = normalizeOriginalEmailFiling(original_filing);
      return deriveEmailFilingPlacementChain({
        original_filing: original,
        placements: recordsFor(repository, original),
      }).current;
    },
    history({ original_filing } = {}) {
      const original = normalizeOriginalEmailFiling(original_filing);
      return deriveEmailFilingPlacementChain({
        original_filing: original,
        placements: recordsFor(repository, original),
      }).history;
    },
    correct(input = {}) {
      const original = normalizeOriginalEmailFiling(input.original_filing);
      assertOriginalIdentity(input, original);
      const requestFingerprint = emailFilingCorrectionFingerprint(input);
      if (authorize_actor({
        tenant_id: original.tenant_id,
        actor_id: input.actor_id.trim(),
        source_matter_id: input.source_matter_id.trim(),
        target_matter_id: input.target_matter_id.trim(),
      }) !== true) {
        throw codedError(
          "EMAIL_FILING_CORRECTION_ACTOR_DENIED",
          "actor is not allowed to correct this filing",
          403,
        );
      }
      return repository.transaction((tx) => {
        const existing = tx.getIdempotency({
          tenant_id: original.tenant_id,
          idempotency_key: input.idempotency_key,
        });
        const existingRecords = recordsFor(tx, original);
        const before = deriveEmailFilingPlacementChain({
          original_filing: original,
          placements: existingRecords,
        });
        if (existing) {
          if (existing.request_fingerprint !== requestFingerprint) {
            throw codedError(
              "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT",
              "idempotency key was used with a different correction",
            );
          }
          const correction = existingRecords.find((event) => (
            event.correction_id === existing.correction_id
          ));
          if (!correction || correction.placement_id !== existing.placement_id) {
            throw codedError(
              "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT",
              "idempotency entry has no matching correction",
            );
          }
          return result("idempotent_replay", correction, before);
        }
        if (
          input.prior_placement_id !== before.current.placement_id
          || input.source_matter_id !== before.current.matter_id
        ) {
          throw codedError(
            "EMAIL_FILING_CORRECTION_STALE_PLACEMENT",
            "expected placement is no longer current",
          );
        }
        if (existingRecords.length === 0) {
          tx.appendPlacement(createOriginalEmailFilingPlacement(original));
        }
        const occurredAt = clock();
        const correction = createEmailFilingCorrection({
          ...input,
          correction_id: id_factory(),
          occurred_at: occurredAt instanceof Date ? occurredAt.toISOString() : occurredAt,
        });
        tx.appendPlacement(correction);
        tx.appendAudit({
          event_id: `email-filing-correction:${correction.correction_id}`,
          tenant_id: correction.tenant_id,
          actor_id: correction.actor_id,
          action: "dms.email.filing.correct",
          object_type: "EmailFilingCorrection",
          object_id: correction.correction_id,
          decision: "allow",
          reason: "email_filing_placement_corrected",
          occurred_at: correction.occurred_at,
          metadata: Object.freeze({
            email_thread_id: correction.email_thread_id,
            original_receipt_id: correction.original_receipt_id,
            source_matter_id: correction.source_matter_id,
            target_matter_id: correction.target_matter_id,
            document_id: correction.document_id,
            mime_sha256: correction.mime_sha256,
            prior_placement_id: correction.prior_placement_id,
            placement_id: correction.placement_id,
            reason_hash: correction.reason_hash,
          }),
        });
        tx.recordIdempotency({
          tenant_id: correction.tenant_id,
          idempotency_key: correction.idempotency_key,
          request_fingerprint: correction.payload_fingerprint,
          correction_id: correction.correction_id,
          placement_id: correction.placement_id,
          created_at: correction.occurred_at,
        });
        const after = deriveEmailFilingPlacementChain({
          original_filing: original,
          placements: recordsFor(tx, original),
        });
        return result("created", correction, after);
      });
    },
  });
}
