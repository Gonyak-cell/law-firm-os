import { canonical, sha256, sorted } from "../../lib/outlook-release/primitives.mjs";
import { contract, hex, rollback, sourceIdentity } from "./outlook-release-fixtures.mjs";

const proof = (schema_version, proof_class, fields) => ({ schema_version, proof_class, ...sourceIdentity, ...fields });

export function authorizationProof(control) {
  return proof("amic-os.m365-authorization-proof.v1", "authorization", {
    authorization_ref: "change-ref:outlook-20260808-001",
    operator_ref: control.operator_ref,
    owner_ref: control.owner_ref,
    window_start_utc: control.window_start_utc,
    window_end_utc: control.window_end_utc,
    authorized_actions: ["m365_central_manifest_update", "static_dual_namespace_publish"],
    approved: true,
    approved_at_utc: "2026-08-08T00:15:00Z",
  });
}

export function pilotProof(receipt, groups) {
  const assignments = receipt.profiles.map((profile) => ({
    product_id: profile.product_id,
    group_refs: groups,
    assignment_count: profile.assignment_count,
    assignment_fingerprint_sha256: profile.assignment_fingerprint_sha256,
  }));
  return proof("amic-os.m365-pilot-assignment-proof.v1", "pilot_assignment", {
    groups,
    assignments,
    assignment_fingerprint_sha256: sha256(JSON.stringify(canonical(assignments))),
    observed_at_utc: "2026-08-08T00:30:00Z",
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

export function rollbackProof(control) {
  return proof("amic-os.m365-rollback-rehearsal-proof.v1", "rollback_rehearsal", {
    owner_ref: control.rollback_readback_owner_ref,
    rehearsed_at_utc: "2026-08-08T00:25:00Z",
    profiles: rollback.profiles.map((profile, index) => ({
      product_id: profile.product_id,
      rollback_manifest_sha256: profile.rollback_manifest_sha256,
      readback_sha256: index ? hex("c") : hex("b"),
      result: "pass",
    })),
    result: "pass",
  });
}

export function prerequisiteProofs({ authorizationHash, candidate, plan, planBinding }) {
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
      artifact_sha256: hex("3"), deployed_artifact_sha256: hex("3"), authorization_evidence_sha256: authorizationHash,
      function_name: contract.api.function_name, aws_account_id: contract.api.aws_account_id, region: contract.api.region,
      environment_before: { key_count: 3, keys_sha256: hex("4"), values_sha256: hex("5") },
      environment_after: { key_count: 3, keys_sha256: hex("4"), values_sha256: hex("5") },
      environment_preserved: true, mutation_count: 1, status: "deployed_readback_verified",
      observed_at_utc: "2026-08-08T00:45:00Z",
    }),
    additive_migrations: proof("amic-os.migration-readback-proof.v1", "additive_migrations", {
      artifact_sha256: migrationHash, applied_migrations_sha256: migrationHash, migration_ids: migrationIds,
      destructive_migrations: false, rollback_compatible: true, transaction_verified: true,
      status: "applied_readback_verified", observed_at_utc: "2026-08-08T00:40:00Z",
    }),
    graph_endpoint_and_secret_reference: proof("amic-os.graph-runtime-proof.v1", "graph_endpoint_and_secret_reference", {
      artifact_sha256: sha256(JSON.stringify(canonical(graphProjection))), endpoint_origin: graphProjection.endpoint_origin,
      secret_reference: graphSecret, delegated_scopes: graphScopes,
      delegated_scopes_sha256: sha256(JSON.stringify(graphScopes)), provider_readback: true,
      observed_at_utc: "2026-08-08T00:35:00Z", status: "verified",
    }),
    docusign_endpoint_and_secret_reference: proof("amic-os.docusign-runtime-proof.v1", "docusign_endpoint_and_secret_reference", {
      artifact_sha256: sha256(JSON.stringify(canonical(docuSignProjection))), ...docuSignProjection,
      provider_readback: true, observed_at_utc: "2026-08-08T00:36:00Z", status: "verified",
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
      artifact_sha256: candidate.inventory_sha256, authorization_evidence_sha256: authorizationHash,
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
  return proof("amic-os.m365-central-deployment-proof.v1", "central_deployment", {
    authorization_evidence_sha256: authorizationHash,
    static_proof_sha256: staticHash,
    pilot_assignment_fingerprint_sha256: control.pilot_assignment.fingerprint_sha256,
    operator_ref: control.operator_ref,
    owner_ref: control.owner_ref,
    window_start_utc: control.window_start_utc,
    window_end_utc: control.window_end_utc,
    mutation_count: receipt.mutation_count,
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
