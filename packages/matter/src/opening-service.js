import { createMatter } from "./model.js";
import { appendMatterAuditEvent } from "./audit.js";
import { assertMatterOpeningIntakeDependency } from "./intake-dependency-guard.js";
import { reserveMatterCode, upsertMatterClient } from "./canonical-identity-service.js";
import { reserveMatterNumber } from "./numbering-service.js";

function compact(value) {
  return String(value ?? "").trim();
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function validateClearance(clearance = {}, tenantId) {
  for (const field of ["clearance_token_id", "intake_request_id", "conflict_check_id", "engagement_id", "snapshot_hash"]) {
    requiredString(clearance, field);
  }
  if (clearance.tenant_id !== tenantId) throw new Error("Matter opening clearance tenant mismatch");
  if (clearance.token_state === "expired" || clearance.token_state === "stale") throw new Error("Matter opening clearance token is stale");
  if (clearance.outcome === "blocked" || clearance.blocked_claims?.length > 0) throw new Error("Matter opening clearance has blocked claims");
}

export function openMatterTransaction({
  repository,
  matter,
  clearance_token,
  matter_number_seed,
  idempotency_key,
  client,
  require_canonical_matter_code = false,
  dms,
  billing,
  actor_id,
} = {}) {
  requiredString({ actor_id }, "actor_id");
  requiredString({ idempotency_key }, "idempotency_key");
  validateClearance(clearance_token, matter?.tenant_id);
  assertMatterOpeningIntakeDependency({
    ...matter,
    intake_request_id: clearance_token.intake_request_id,
    clearance_token_id: clearance_token.clearance_token_id,
  });
  const replay = repository.getIdempotency({ tenant_id: matter.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });

  return repository.transaction((tx) => {
    const canonicalClient = client
      ? upsertMatterClient({
          repository: tx,
          client: {
            ...client,
            tenant_id: matter.tenant_id,
            client_id: client.client_id ?? matter.client_id ?? matter.legal_client_party_id,
            created_by: client.created_by ?? actor_id,
            created_at: client.created_at ?? matter.created_at,
            updated_by: client.updated_by ?? actor_id,
            updated_at: client.updated_at ?? matter.updated_at ?? matter.created_at,
            source_revision: client.source_revision ?? matter.source_revision,
          },
          idempotency_key: `${idempotency_key}:client`,
        }).client
      : null;
    const hasMatterCodeContext = Boolean(
      compact(matter.matter_code)
        || (
          compact(matter.matter_type_english)
          && compact(matter.matter_detail_type_korean)
          && (canonicalClient || compact(matter.client_short_name))
        ),
    );
    const codeReservation = require_canonical_matter_code || hasMatterCodeContext
      ? reserveMatterCode({
          repository: tx,
          tenant_id: matter.tenant_id,
          matter_id: matter.matter_id,
          matter_code: matter.matter_code,
          client_short_name: canonicalClient?.client_short_name ?? matter.client_short_name,
          matter_type_english: matter.matter_type_english,
          matter_detail_type_korean: matter.matter_detail_type_korean,
          idempotency_key: `${idempotency_key}:matter-code`,
        })
      : null;
    const numberReservation = reserveMatterNumber({
      repository: tx,
      tenant_id: matter.tenant_id,
      matter_number_seed,
      idempotency_key: `${idempotency_key}:number`,
      matter_number: matter.matter_number,
    });
    const record = createMatter({
      ...matter,
      client_id: canonicalClient?.client_id ?? matter.client_id ?? matter.legal_client_party_id,
      client_display_name: canonicalClient?.client_display_name ?? matter.client_display_name,
      status: matter.status ?? "opening",
      matter_code: codeReservation?.matter_code ?? matter.matter_code ?? null,
      matter_number: numberReservation.matter_number,
    });
    const persisted = tx.create({
      ...record,
      model_type: "Matter",
      matter_code: codeReservation?.matter_code ?? record.matter_code ?? null,
      client_display_name: canonicalClient?.client_display_name ?? record.client_display_name ?? null,
      matter_type_english: matter.matter_type_english ?? record.matter_type_english ?? null,
      matter_detail_type_korean: matter.matter_detail_type_korean ?? record.matter_detail_type_korean ?? null,
      source_revision: matter.source_revision ?? record.source_revision ?? null,
      matter_number: numberReservation.matter_number,
      legal_client_party_id: matter.legal_client_party_id ?? record.client_id,
      billing_client_party_id: matter.billing_client_party_id ?? matter.legal_client_party_id ?? record.client_id,
      clearance_token_id: clearance_token.clearance_token_id,
      intake_request_id: clearance_token.intake_request_id,
      engagement_id: clearance_token.engagement_id,
      conflict_check_id: clearance_token.conflict_check_id,
      clearance_snapshot_hash: clearance_token.snapshot_hash,
    });
    const dmsWorkspace = dms?.createWorkspace?.({ tenant_id: persisted.tenant_id, matter_id: persisted.matter_id });
    const billingProfile = billing?.createMatterLedger?.({ tenant_id: persisted.tenant_id, matter_id: persisted.matter_id });
    if (dms && !dmsWorkspace) throw new Error("DMS workspace creation failed");
    if (billing && !billingProfile) throw new Error("Billing ledger creation failed");
    const audit = appendMatterAuditEvent({
      repository: tx,
      event: {
        event_id: `matter_opened:${persisted.tenant_id}:${persisted.matter_id}`,
        tenant_id: persisted.tenant_id,
        actor_id,
        action: "matter.open",
        object_type: "Matter",
        object_id: persisted.matter_id,
        decision: "allow",
        reason: "matter_opened_with_clearance",
        metadata: { matter_number: persisted.matter_number, matter_code: persisted.matter_code ?? null, idempotency_key },
      },
    });
    const response = Object.freeze({
      outcome: "created",
      matter: persisted,
      dms_workspace: dmsWorkspace ?? null,
      billing_ledger: billingProfile ?? null,
      audit_event: audit,
      idempotent_replay: false,
    });
    tx.recordIdempotency({ tenant_id: persisted.tenant_id, idempotency_key, operation: "matter_opening", response });
    return response;
  });
}
