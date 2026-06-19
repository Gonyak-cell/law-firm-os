import { COMMERCIAL_RISK_CLAIMS } from "./states.js";
import { createCommercialServiceMatrix, createCommercialSyntheticFixtureMatrix } from "./service.js";

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}

export const COMMERCIAL_INTERFACE_ERROR_CODES = Object.freeze([
  "missing_context",
  "cross_tenant_release_access",
  "unverified_release",
  "missing_observability",
  "compliance_evidence_gap",
  "unsafe_deploy",
  "customer_plan_mismatch",
  "unknown_action",
]);

export const COMMERCIAL_INTERFACE_PUBLIC_EXPORTS = Object.freeze([
  "createCommercialInterfaceContract",
  "createCommercialServiceMatrix",
  "createCommercialSyntheticFixtureMatrix",
  "validateCommercialReadinessContract",
]);

export function createCommercialInterfaceContract() {
  const serviceMatrix = createCommercialServiceMatrix();
  const fixtureMatrix = createCommercialSyntheticFixtureMatrix();
  const invalidRequest = serviceMatrix.cross_tenant_denied;
  const deniedResponse = serviceMatrix.cross_tenant_denied;
  const reviewResponse = serviceMatrix.unverified_release;
  return freeze({
    schema_version: "law-firm-os.commercial-interface-contract.v0.1",
    descriptor_only: true,
    runtime_execution: false,
    public_export_map: {
      exports: COMMERCIAL_INTERFACE_PUBLIC_EXPORTS,
      public_exports_runtime_closed: true,
    },
    request_contract: {
      required_fields: ["tenant_id", "actor_tenant_id", "actor_role", "matter_trace_ref", "action", "idempotency_key"],
      optional_fields: ["release_verified", "observability_present", "compliance_evidence_present", "deploy_safe", "customer_plan_matches"],
      idempotency_scope: "tenant_matter_action",
      pagination_or_filtering_contract: "descriptor_only",
      writes_product_state: false,
    },
    response_contract: {
      fields: ["decision", "blocked_claims", "validation_errors", "audit_hint", "runtime_execution"],
      permission_decision_written: false,
      audit_event_written: false,
      runtime_receipt_emitted: false,
      unauthorized_data_omitted: true,
    },
    error_code_taxonomy: COMMERCIAL_INTERFACE_ERROR_CODES,
    permission_annotation: {
      permission_precheck_required: true,
      permission_decision_written: false,
      denied_response_codes: ["missing_context", "cross_tenant_release_access"],
      review_required_codes: COMMERCIAL_RISK_CLAIMS.filter((claim) => claim !== "cross_tenant_release_access"),
    },
    audit_annotation: {
      audit_hint_required: true,
      audit_hint_only: true,
      audit_event_written: false,
      writes_audit_event_now: false,
    },
    pagination_or_filtering_contract: {
      descriptor_only: true,
      allowed_filters: ["status", "decision", "risk_claim", "matter_trace_ref"],
      cursor_runtime_opened: false,
    },
    serialization_guard: {
      credential_or_secret_included: false,
      real_client_data_included: false,
      unauthorized_data_omitted: true,
      strips_permission_decision_body: true,
      strips_audit_event_body: true,
    },
    api_fixture: {
      synthetic_only: true,
      service_matrix: serviceMatrix,
      synthetic_fixture_matrix: fixtureMatrix,
      contract_test_descriptor: true,
      invalid_request_test_descriptor: true,
      denied_response_test_descriptor: true,
      integration_smoke_executes_runtime: false,
    },
    interface_test_matrix: {
      contract_test: {
        descriptor_only: true,
        request_contract_bound: true,
        response_contract_bound: true,
        runtime_execution: false,
      },
      invalid_request_test: {
        descriptor_only: true,
        decision: invalidRequest.permission_precheck,
        validation_errors: invalidRequest.validation_errors,
        writes_product_state: false,
        permission_decision_written: false,
        audit_event_written: false,
      },
      denied_response_test: {
        descriptor_only: true,
        denied_response_omits_unauthorized_data: true,
        decision: deniedResponse.permission_precheck,
        validation_errors: deniedResponse.validation_errors,
        runtime_receipt_emitted: false,
      },
      review_required_response_test: {
        descriptor_only: true,
        decision: reviewResponse.permission_precheck,
        validation_errors: reviewResponse.validation_errors,
        permission_decision_written: false,
        audit_event_written: false,
      },
    },
    hermes_api_evidence: {
      gate: "H29",
      emits_runtime_receipt: false,
      evidence_only: true,
    },
    claude_interface_prompt: {
      gate: "C29",
      read_only: true,
      promotes_claude_to_final_approval: false,
    },
    documentation_example: {
      synthetic_request: {
        tenant_id: "tenant-synthetic-alpha",
        actor_tenant_id: "tenant-synthetic-alpha",
        actor_role: "release_manager",
        matter_trace_ref: "matter-synthetic-release-readiness",
        action: "create_release_candidate",
        idempotency_key: "idem-synthetic-commercial-readiness",
      },
      synthetic_response: {
        decision: "allowed_descriptor",
        blocked_claims: [],
        runtime_execution: false,
      },
    },
    versioning_note: "v0.1 descriptor-only interface; runtime opening requires later human-approved closeout pack.",
    closeout_handoff: {
      next_interface_rows: "continue RP29.P03.M04 secondary workflow interface rows",
      runtime_opening_allowed: false,
    },
    downstream_consumer_note: "Downstream consumers may rely on descriptor shape only; no runtime API endpoint is opened.",
    command_rerun: {
      required_commands: ["npm run rp29:commercial:validate", "node --test packages/commercial/test/*.test.js"],
      deterministic_only: true,
    },
    no_write_attestation: {
      writes_product_state: false,
      permission_decision_written: false,
      audit_event_written: false,
      runtime_receipt_emitted: false,
      real_client_data_included: false,
      credential_or_secret_included: false,
    },
  });
}
