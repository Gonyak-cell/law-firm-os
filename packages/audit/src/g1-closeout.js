import { createHash } from "node:crypto";
import { verifyHashChain } from "./append-only-ledger.js";

export const G1_AUDIT_CLOSEOUT_TUW_IDS = Object.freeze([
  "LFOS-G1-W01-T013",
  "LFOS-G1-W01-T014",
  "LFOS-G1-W01-T016"
]);

export function verifyTenantAuditHashChain({ ledger = null, tenant_id, events = null } = {}) {
  if (!tenant_id) {
    return {
      ok: false,
      reason: "tenant_id_required",
      tamper_evident: true,
      tuw_ids: ["LFOS-G1-W01-T013"]
    };
  }

  const tenantEvents = events
    ? events.filter((event) => event.tenant_id === tenant_id)
    : ledger.list({ tenant_id });
  const verification = verifyHashChain(tenantEvents);

  return {
    ...verification,
    tenant_id,
    checked: verification.checked ?? tenantEvents.length,
    tamper_evident: true,
    tuw_ids: ["LFOS-G1-W01-T013"]
  };
}

export function exportTenantAuditEvents({ ledger = null, tenant_id, principal = {}, events = null, generated_at = null } = {}) {
  if (!tenant_id) {
    return {
      ok: false,
      reason: "tenant_id_required",
      status_code: 400,
      tuw_ids: ["LFOS-G1-W01-T014"]
    };
  }

  if (principal.tenant_id && principal.tenant_id !== tenant_id) {
    return {
      ok: false,
      reason: "export_tenant_mismatch",
      status_code: 403,
      tenant_id,
      principal_tenant_id: principal.tenant_id,
      tuw_ids: ["LFOS-G1-W01-T014"]
    };
  }

  const scopedEvents = events
    ? events.filter((event) => event.tenant_id === tenant_id)
    : ledger.list({ tenant_id });
  const chain = verifyTenantAuditHashChain({ tenant_id, events: scopedEvents });

  if (!chain.ok) {
    return {
      ok: false,
      reason: "hash_chain_verification_failed",
      status_code: 409,
      tenant_id,
      chain,
      tuw_ids: ["LFOS-G1-W01-T014"]
    };
  }

  const exportEvents = scopedEvents.map((event) => ({
    event_id: event.event_id,
    sequence_number: event.sequence_number,
    tenant_id: event.tenant_id,
    occurred_at: event.occurred_at,
    received_at: event.received_at,
    actor: event.actor,
    action: event.action,
    object: event.object,
    outcome: event.outcome,
    decision: event.decision,
    reason_code: event.reason_code,
    request_id: event.request_id,
    matter_id: event.matter_id ?? null,
    document_version_id: event.document_version_id ?? null,
    permission_decision_id: event.permission_decision_id ?? null,
    previous_event_hash: event.previous_event_hash,
    event_hash: event.event_hash,
    payload_classification: event.payload_classification,
    payload_digest: event.payload_digest
  }));

  return {
    ok: true,
    status_code: 200,
    export_id: createExportId({ tenant_id, events: exportEvents }),
    tenant_id,
    event_count: exportEvents.length,
    payload_policy: "metadata_only_export",
    chain,
    events: exportEvents,
    custody_receipt: {
      tenant_id,
      generated_at: generated_at ?? new Date().toISOString(),
      event_count: exportEvents.length,
      chain_verified: true,
      export_hash: createExportId({ tenant_id, events: exportEvents })
    },
    tuw_ids: ["LFOS-G1-W01-T014"]
  };
}

export function createG1TrustFoundationCloseout({
  pr_stack = [],
  validations = [],
  audit_evidence = {},
  permission_evidence = {},
  human_review_disposition = "pending",
  generated_at = null
} = {}) {
  const validationsPassed = validations.length > 0 && validations.every((validation) =>
    validation.ok === true || validation.status === "pass"
  );
  const prStateRecorded = pr_stack.length > 0 && pr_stack.every((pr) => pr.number || pr.branch);
  const auditReady = audit_evidence.hash_chain_verified === true && audit_evidence.tenant_export_verified === true;
  const permissionReady =
    permission_evidence.permission_controls_validated === true &&
    permission_evidence.admin_simulator_verified === true;

  return {
    status: validationsPassed && prStateRecorded && auditReady && permissionReady
      ? "implementation_evidence_ready"
      : "evidence_incomplete",
    generated_at: generated_at ?? new Date().toISOString(),
    g1_runtime_readiness_claim: "open",
    self_merge_allowed: false,
    human_review_disposition,
    command_output_recorded: validations.length > 0,
    pr_state_recorded: prStateRecorded,
    human_review_recorded: Boolean(human_review_disposition),
    gate_evidence: {
      durable_audit_verified: auditReady,
      permission_controls_verified: permissionReady,
      validations_passed: validationsPassed
    },
    pr_stack,
    validations,
    tuw_ids: ["LFOS-G1-W01-T016"]
  };
}

function createExportId({ tenant_id, events }) {
  const seed = JSON.stringify({
    tenant_id,
    event_ids: events.map((event) => event.event_id),
    event_hashes: events.map((event) => event.event_hash)
  });
  return `audit_export_${createHash("sha256").update(seed).digest("hex").slice(0, 24)}`;
}
