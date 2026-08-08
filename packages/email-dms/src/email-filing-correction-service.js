import { randomUUID } from "node:crypto";
import {
  createEmailFilingCorrection,
  createOriginalEmailFilingPlacement,
  deriveEmailFilingPlacementChain,
  emailFilingCorrectionFingerprint,
} from "./email-filing-correction-model.js";
import {
  assertCorrectionAuthorityClaims,
  assertCorrectionClaim,
  correctionTrustError,
  requireCorrectionMatterAuthorization,
  resolveCorrectionPrincipal,
} from "./email-filing-correction-trust-boundary.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw correctionTrustError("EMAIL_FILING_CORRECTION_INVALID", `${field} is required`);
  }
  return value.trim();
}

function assertDependencies({ repository, original_filing_resolver: resolver, resolve_principal: principal, authorize_matter: authorize }) {
  if (typeof repository?.transaction !== "function") {
    throw new TypeError("correction repository.transaction is required");
  }
  if (typeof resolver?.resolve !== "function") {
    throw new TypeError("original_filing_resolver is required");
  }
  if (typeof principal !== "function") throw new TypeError("resolve_principal is required");
  if (typeof authorize !== "function") throw new TypeError("authorize_matter is required");
}

async function recordsFor(tx, original) {
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
  original_filing_resolver: originalResolver,
  resolve_principal: resolvePrincipal,
  authorize_matter: authorizeMatter,
  clock = () => new Date(),
  id_factory = randomUUID,
} = {}) {
  assertDependencies({
    repository,
    original_filing_resolver: originalResolver,
    resolve_principal: resolvePrincipal,
    authorize_matter: authorizeMatter,
  });
  if (typeof clock !== "function") throw new TypeError("correction clock is required");
  if (typeof id_factory !== "function") throw new TypeError("correction id_factory is required");

  async function authority(input) {
    const principal = await resolveCorrectionPrincipal(resolvePrincipal, input?.session);
    const original = await originalResolver.resolve({
      tenant_id: principal.tenant_id,
      email_thread_id: requiredString(input, "email_thread_id"),
    });
    assertCorrectionAuthorityClaims(input, original, principal);
    return { principal, original };
  }

  async function readProjection(input, projection) {
    const { principal, original } = await authority(input);
    return repository.transaction({ tenant_id: principal.tenant_id, read_only: true }, async (tx) => {
      const chain = deriveEmailFilingPlacementChain({
        original_filing: original,
        placements: await recordsFor(tx, original),
      });
      await requireCorrectionMatterAuthorization(authorizeMatter, {
        ...principal,
        matter_id: chain.current.matter_id,
        action: "email_filing_correction.read",
      });
      return projection(chain);
    });
  }

  return Object.freeze({
    currentPlacement: (input = {}) => readProjection(input, (chain) => chain.current),
    history: (input = {}) => readProjection(input, (chain) => chain.history),
    async correct(input = {}) {
      const { principal, original } = await authority(input);
      const idempotencyKey = requiredString(input, "idempotency_key");
      const targetMatterId = requiredString(input, "target_matter_id");
      return repository.transaction({ tenant_id: principal.tenant_id }, async (tx) => {
        const existingRecords = await recordsFor(tx, original);
        const before = deriveEmailFilingPlacementChain({
          original_filing: original,
          placements: existingRecords,
        });
        const existing = await tx.getIdempotency({
          tenant_id: original.tenant_id,
          idempotency_key: idempotencyKey,
        });
        const sourceMatterId = existing?.source_matter_id ?? before.current.matter_id;
        await requireCorrectionMatterAuthorization(authorizeMatter, {
          ...principal,
          matter_id: sourceMatterId,
          action: "email_filing_correction.source",
        });
        if (!existing && input.prior_placement_id !== before.current.placement_id) {
          throw correctionTrustError(
            "EMAIL_FILING_CORRECTION_STALE_PLACEMENT",
            "expected placement is no longer current",
          );
        }
        assertCorrectionClaim(input.source_matter_id, sourceMatterId);
        await requireCorrectionMatterAuthorization(authorizeMatter, {
          ...principal,
          matter_id: targetMatterId,
          action: "email_filing_correction.target",
        });
        const command = {
          ...original,
          source_matter_id: sourceMatterId,
          target_matter_id: targetMatterId,
          reason: input.reason,
          actor_id: principal.actor_id,
          idempotency_key: idempotencyKey,
          prior_placement_id: input.prior_placement_id,
        };
        const requestFingerprint = emailFilingCorrectionFingerprint(command);
        if (existing) {
          if (existing.request_fingerprint !== requestFingerprint) {
            throw correctionTrustError(
              "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT",
              "idempotency key was used with a different correction",
            );
          }
          const correction = existingRecords.find((event) => (
            event.correction_id === existing.correction_id
            && event.placement_id === existing.placement_id
          ));
          if (!correction) {
            throw correctionTrustError(
              "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT",
              "idempotency entry has no matching correction",
            );
          }
          return result("idempotent_replay", correction, before);
        }
        if (existingRecords.length === 0) {
          await tx.appendPlacement(createOriginalEmailFilingPlacement(original));
        }
        const occurredAt = clock();
        const correction = createEmailFilingCorrection({
          ...command,
          correction_id: id_factory(),
          occurred_at: occurredAt instanceof Date ? occurredAt.toISOString() : occurredAt,
        });
        await tx.appendPlacement(correction);
        await tx.appendAudit({
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
        const after = deriveEmailFilingPlacementChain({
          original_filing: original,
          placements: await recordsFor(tx, original),
        });
        return result("created", correction, after);
      });
    },
  });
}
