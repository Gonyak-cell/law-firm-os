import { canonical, sha256, sorted } from "../../lib/outlook-release/primitives.mjs";
import {
  PRODUCT_IDS, REQUIRED_MUTATION_ACTIONS, ROLLBACK_ASSIGNMENT_RESTORE_POLICY,
} from "../../lib/outlook-release/constants.mjs";
import { contract, hex, sourceIdentity } from "./outlook-release-fixtures.mjs";

const proof = (schema_version, proof_class, fields) => ({ schema_version, proof_class, ...sourceIdentity, ...fields });

export function authorizationProof(control, authorizedActions = REQUIRED_MUTATION_ACTIONS) {
  return proof("amic-os.m365-authorization-proof.v3", "authorization", {
    authorization_ref: "change-ref:outlook-20260808-001",
    operator_ref: control.operator_ref,
    owner_ref: control.owner_ref,
    window_start_utc: control.window_start_utc,
    window_end_utc: control.window_end_utc,
    authorized_actions: [...authorizedActions],
    pilot_group_fingerprint_sha256: sha256(JSON.stringify(sorted(control.pilot_assignment.groups))),
    eligible_principal_fingerprint_sha256: control.pilot_assignment.eligible_principal_fingerprint_sha256,
    excluded_principal_fingerprint_sha256: control.pilot_assignment.excluded_principal_fingerprint_sha256,
    roster_file_sha256: control.pilot_assignment.roster_file_sha256,
    roster_email_fingerprint_sha256: control.pilot_assignment.roster_email_fingerprint_sha256,
    approved: true,
    approved_at_utc: "2026-08-08T00:15:00Z",
  });
}

function authorizationFields(control, authorizationHash) {
  return {
    authorization_evidence_sha256: authorizationHash,
    authorization_ref: "change-ref:outlook-20260808-001",
    operator_ref: control.operator_ref,
    owner_ref: control.owner_ref,
    window_start_utc: control.window_start_utc,
    window_end_utc: control.window_end_utc,
  };
}

export function pilotProof(receipt, groups, observedAtUtc = "2026-08-08T00:30:00Z", roster = {
  file_sha256: hex("a"), email_fingerprint_sha256: hex("b"),
}) {
  const assignments = receipt.profiles.map((profile) => ({
    product_id: profile.product_id,
    group_refs: profile.production_user_visible ? groups : [],
    distribution_role: profile.distribution_role,
    assignment_state: profile.assignment_state,
    production_user_visible: profile.production_user_visible,
    assign_to_everyone: profile.assign_to_everyone,
    assignment_count: profile.assignment_count,
    assignment_fingerprint_sha256: profile.assignment_fingerprint_sha256,
  }));
  const distribution = contract.m365.production_distribution;
  const eligiblePrincipalRefs = Array.from(
    { length: distribution.eligible_user_count },
    (_, index) => `entra-object-ref:${String(index + 1).padStart(2, "0")}`,
  );
  const excludedPrincipalRefs = Array.from(
    { length: distribution.excluded_user_count },
    (_, index) => `entra-object-ref:excluded-${String(index + 1).padStart(2, "0")}`,
  );
  return proof("amic-os.m365-pilot-assignment-proof.v4", "pilot_assignment", {
    groups,
    assignments,
    direct_membership_readbacks: groups.map((groupRef) => ({
      group_ref: groupRef,
      provider: "microsoft_entra",
      membership_scope: "direct_members_only",
      direct_member_principal_refs: eligiblePrincipalRefs,
      direct_member_fingerprint_sha256: sha256(JSON.stringify(sorted(eligiblePrincipalRefs))),
      nested_group_count: 0,
      result: "exact_provider_readback",
    })),
    eligible_principal_refs: eligiblePrincipalRefs,
    excluded_principal_refs: excludedPrincipalRefs,
    eligible_user_count: distribution.eligible_user_count,
    excluded_user_count: distribution.excluded_user_count,
    roster_file_sha256: roster.file_sha256,
    roster_email_fingerprint_sha256: roster.email_fingerprint_sha256,
    assign_to_everyone: distribution.assign_to_everyone,
    max_visible_addins_per_user: distribution.max_visible_addins_per_user,
    assignment_overlap_count: distribution.assignment_overlap_count,
    eligible_principal_fingerprint_sha256: sha256(JSON.stringify(sorted(eligiblePrincipalRefs))),
    excluded_principal_fingerprint_sha256: sha256(JSON.stringify(sorted(excludedPrincipalRefs))),
    assignment_fingerprint_sha256: sha256(JSON.stringify(canonical(assignments))),
    observed_at_utc: observedAtUtc,
    status: "verified",
  });
}

export function assignmentSafetyProof(
  pilot, pilotEvidenceSha256, currentAssignmentOverrides = {},
  observedAtUtc = "2026-08-08T00:31:00Z",
) {
  const currentAssignments = pilot.assignments.map((target) => {
    const override = currentAssignmentOverrides[target.product_id] ?? {};
    const groupRefs = override.group_refs ?? target.group_refs;
    return {
      product_id: target.product_id,
      group_refs: groupRefs,
      assignment_count: groupRefs.length,
      assignment_fingerprint_sha256: sha256(JSON.stringify(canonical(groupRefs))),
      assign_to_everyone: override.assign_to_everyone ?? target.assign_to_everyone,
    };
  });
  const targets = new Map(pilot.assignments.map((assignment) => [assignment.product_id, assignment]));
  const requiredCorrectionActions = [];
  const currentByProductId = new Map(currentAssignments.map((assignment) => [assignment.product_id, assignment]));
  for (const productId of [PRODUCT_IDS[1], PRODUCT_IDS[0]]) {
    const current = currentByProductId.get(productId);
    const target = targets.get(productId);
    if (current.assign_to_everyone !== target.assign_to_everyone) {
      requiredCorrectionActions.push({
        action: "disable_assign_to_everyone", product_id: current.product_id,
        target_assignment_fingerprint_sha256: target.assignment_fingerprint_sha256,
      });
    }
    if (JSON.stringify(sorted(current.group_refs)) !== JSON.stringify(sorted(target.group_refs))) {
      requiredCorrectionActions.push({
        action: "replace_group_assignments", product_id: current.product_id,
        target_assignment_fingerprint_sha256: target.assignment_fingerprint_sha256,
      });
    }
  }
  return proof("amic-os.m365-assignment-safety-proof.v1", "assignment_safety", {
    pilot_assignment_evidence_sha256: pilotEvidenceSha256,
    provider_readback: true,
    current_assignments: currentAssignments,
    target_assignments: pilot.assignments,
    correction_required: requiredCorrectionActions.length > 0,
    required_correction_actions: requiredCorrectionActions,
    rollback_assignment_policy: ROLLBACK_ASSIGNMENT_RESTORE_POLICY,
    unsafe_assignment_preservation_allowed: false,
    observed_at_utc: observedAtUtc,
    status: "verified",
  });
}

export function monitoringProof(control) {
  return proof("amic-os.m365-monitoring-plan-proof.v1", "monitoring_plan", {
    owner_ref: control.owner_ref,
    criteria: control.monitoring_criteria,
    abort_criteria: control.abort_criteria,
    approved_at_utc: "2026-08-08T00:20:00Z",
    status: "approved",
  });
}

export function rollbackProof(control, restored, assignmentSafetyHash, targetAssignments) {
  return proof("amic-os.m365-rollback-rehearsal-proof.v2", "rollback_rehearsal", {
    owner_ref: control.rollback_readback_owner_ref,
    assignment_safety_evidence_sha256: assignmentSafetyHash,
    assignment_restore_policy: ROLLBACK_ASSIGNMENT_RESTORE_POLICY,
    target_assignments: targetAssignments,
    unsafe_assignment_preservation_allowed: false,
    rehearsed_at_utc: "2026-08-08T00:32:00Z",
    profiles: restored.profiles.map((profile) => ({
      ...profile,
      readback_sha256: sha256(JSON.stringify(canonical(profile))),
      result: "pass",
    })),
    result: "pass",
  });
}

export function prerequisiteProofs({ authorizationHash, candidate, control, plan, planBinding }) {
  const authorized = authorizationFields(control, authorizationHash);
  const migrationIds = ["001-outlook-dms", "002-graph-subscriptions", "003-filing-corrections"];
  const migrationHash = sha256(JSON.stringify(sorted(migrationIds)));
  const graphScopes = sorted(contract.client_outlook_graph_connection_scopes);
  const graphSecret = "secretsmanager://amic-os/outlook-graph-provider";
  const graphProjection = {
    delegated_scopes: graphScopes,
    endpoint_origin: "https://graph.microsoft.com/v1.0",
    secret_reference: graphSecret,
  };
  const docuSignProjection = {
    endpoint_origin: "https://demo.docusign.net/restapi",
    integration_key_fingerprint_sha256: hex("4"),
    secret_reference: "secretsmanager://amic-os/docusign-provider",
  };
  return {
    api_release: proof("amic-os.api-deployment-proof.v1", "api_release", {
      artifact_sha256: hex("3"), deployed_artifact_sha256: hex("3"), ...authorized,
      function_name: contract.api.function_name, aws_account_id: contract.api.aws_account_id, region: contract.api.region,
      environment_before: { key_count: 3, keys_sha256: hex("4"), values_sha256: hex("5") },
      environment_after: { key_count: 3, keys_sha256: hex("4"), values_sha256: hex("5") },
      environment_preserved: true, mutation_count: 1, status: "deployed_readback_verified",
      observed_at_utc: "2026-08-08T00:45:00Z",
    }),
    additive_migrations: proof("amic-os.migration-readback-proof.v1", "additive_migrations", {
      artifact_sha256: migrationHash, applied_migrations_sha256: migrationHash, migration_ids: migrationIds,
      destructive_migrations: false, rollback_compatible: true, transaction_verified: true,
      mutation_count: 1, ...authorized,
      status: "applied_readback_verified", observed_at_utc: "2026-08-08T00:40:00Z",
    }),
    graph_endpoint_and_secret_reference: proof("amic-os.graph-runtime-proof.v1", "graph_endpoint_and_secret_reference", {
      artifact_sha256: sha256(JSON.stringify(canonical(graphProjection))), endpoint_origin: graphProjection.endpoint_origin,
      secret_reference: graphSecret, delegated_scopes: graphScopes,
      delegated_scopes_sha256: sha256(JSON.stringify(graphScopes)), provider_readback: true,
      mutation_count: 1, ...authorized, observed_at_utc: "2026-08-08T00:35:00Z", status: "verified",
    }),
    docusign_endpoint_and_secret_reference: proof("amic-os.docusign-runtime-proof.v1", "docusign_endpoint_and_secret_reference", {
      artifact_sha256: sha256(JSON.stringify(canonical(docuSignProjection))), ...docuSignProjection,
      mutation_count: 1, ...authorized, provider_readback: true,
      observed_at_utc: "2026-08-08T00:36:00Z", status: "verified",
    }),
    approved_template_runtime: proof("amic-os.template-runtime-proof.v1", "approved_template_runtime", {
      artifact_sha256: hex("6"), template_inventory_sha256: hex("6"), runtime_readback_sha256: hex("7"),
      record_count: 4, observed_at_utc: "2026-08-08T00:37:00Z", status: "verified",
    }),
    precedent_index_runtime: proof("amic-os.precedent-runtime-proof.v1", "precedent_index_runtime", {
      artifact_sha256: hex("8"), index_inventory_sha256: hex("8"), runtime_readback_sha256: hex("9"),
      record_count: 12, observed_at_utc: "2026-08-08T00:38:00Z", status: "verified",
    }),
    static_release: proof("amic-os.static-deployment-proof.v1", "static_release", {
      artifact_sha256: candidate.inventory_sha256, ...authorized,
      plan_evidence: planBinding, mutation_count: 2, observed_at_utc: "2026-08-08T00:50:00Z",
      profiles: plan.profiles.map((profile) => ({
        product_id: profile.product_id, target_prefix: profile.target_prefix,
        inventory_sha256: profile.inventory_sha256, readback_inventory_sha256: profile.inventory_sha256,
        result: "exact_readback",
      })),
      status: "deployed_readback_verified",
    }),
  };
}

export function centralProof(receipt, control, authorizationHash, staticHash) {
  const operations = new Map(receipt.operations.map((operation) => [operation.product_id, operation]));
  const readbacks = new Map(receipt.readbacks.map((readback) => [readback.product_id, readback]));
  const inquiryOperation = operations.get(PRODUCT_IDS[1]);
  const matterOperation = operations.get(PRODUCT_IDS[0]);
  const inquiryReadback = readbacks.get(PRODUCT_IDS[1]);
  const matterReadback = readbacks.get(PRODUCT_IDS[0]);
  const transition = [
    {
      action: "disable_assign_to_everyone", product_id: PRODUCT_IDS[1],
      operation_ref: inquiryOperation.operation_ref, result: "success",
      assignment_fingerprint_sha256: null, principal_fingerprint_sha256: null, readback_sha256: null,
    },
    {
      action: "replace_group_assignments", product_id: PRODUCT_IDS[1],
      operation_ref: inquiryOperation.operation_ref, result: "success",
      assignment_fingerprint_sha256: inquiryReadback.assignment_fingerprint_sha256,
      principal_fingerprint_sha256: null, readback_sha256: null,
    },
    {
      action: "verify_zero_assignment_readback", product_id: PRODUCT_IDS[1],
      operation_ref: inquiryOperation.operation_ref, result: "exact_readback",
      assignment_fingerprint_sha256: inquiryReadback.assignment_fingerprint_sha256,
      principal_fingerprint_sha256: null,
      readback_sha256: sha256(JSON.stringify(canonical(inquiryReadback))),
    },
    {
      action: "replace_group_assignments", product_id: PRODUCT_IDS[0],
      operation_ref: matterOperation.operation_ref, result: "success",
      assignment_fingerprint_sha256: matterReadback.assignment_fingerprint_sha256,
      principal_fingerprint_sha256: control.pilot_assignment.eligible_principal_fingerprint_sha256,
      readback_sha256: null,
    },
    {
      action: "verify_exact_roster_readback", product_id: PRODUCT_IDS[0],
      operation_ref: matterOperation.operation_ref, result: "exact_readback",
      assignment_fingerprint_sha256: matterReadback.assignment_fingerprint_sha256,
      principal_fingerprint_sha256: control.pilot_assignment.eligible_principal_fingerprint_sha256,
      readback_sha256: sha256(JSON.stringify(canonical(matterReadback))),
    },
  ].map((step, index) => ({
    ...step, sequence: index + 1, observed_at_utc: `2026-08-08T00:${55 + index}:00Z`,
  }));
  return proof("amic-os.m365-central-deployment-proof.v3", "central_deployment", {
    ...authorizationFields(control, authorizationHash),
    static_proof_sha256: staticHash,
    pilot_assignment_evidence_sha256: control.pilot_assignment.evidence_sha256,
    pilot_assignment_fingerprint_sha256: control.pilot_assignment.fingerprint_sha256,
    assignment_safety_evidence_sha256: control.assignment_safety_evidence.evidence_sha256,
    operator_ref: control.operator_ref,
    owner_ref: control.owner_ref,
    window_start_utc: control.window_start_utc,
    window_end_utc: control.window_end_utc,
    mutation_count: receipt.mutation_count,
    assignment_transition: transition,
    operations: receipt.operations,
    static_readbacks: receipt.static_readbacks,
    readbacks: receipt.readbacks,
    observed_at_utc: "2026-08-08T01:00:00Z",
    result: "verified",
  });
}

export function propagationProof(entry) {
  return proof("amic-os.m365-propagation-proof.v1", "propagation_observation", entry);
}

export function hostProof(entry) {
  return proof("amic-os.real-outlook-host-proof.v1", "real_outlook_host", entry);
}

export function goLiveProof(receipt, control) {
  return proof("amic-os.m365-go-live-approval-proof.v1", "go_live_approval", {
    approval_ref: "go-live-ref:outlook-20260812-001", owner_ref: control.owner_ref,
    central_deployment_evidence_sha256: control.central_deployment_evidence.evidence_sha256,
    monitoring_evidence_sha256: control.monitoring_evidence.evidence_sha256,
    rollback_rehearsal_evidence_sha256: control.rollback_rehearsal_evidence.evidence_sha256,
    propagation_evidence_set_sha256: sha256(JSON.stringify(receipt.propagation_observations.map(({ evidence_sha256 }) => evidence_sha256).sort())),
    host_evidence_set_sha256: sha256(JSON.stringify(receipt.host_evidence.map(({ evidence_sha256 }) => evidence_sha256).sort())),
    approved_at_utc: "2026-08-12T02:00:00Z", result: "approved",
  });
}
