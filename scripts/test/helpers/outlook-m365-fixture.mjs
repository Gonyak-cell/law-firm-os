import {
  staticReleaseProjection, validateProtectedRollbackEvidence,
} from "../../lib/outlook-release-gates.mjs";
import {
  authorizationProof, centralProof, goLiveProof, hostProof, monitoringProof, pilotProof,
  prerequisiteProofs, propagationProof, rollbackProof,
} from "./m365-proof-values.mjs";
import {
  awaitingM365Receipt, baseline, contract, hex, m365Options, releaseCandidate, releaseContextFor,
  rollback, sourceIdentity, staticPlanFor,
} from "./outlook-release-fixtures.mjs";
import { createProtectedFixtureRoot, trustedRoot, writeProtectedJson } from "./protected-fixture.mjs";
import { createRollbackEvidenceFixture } from "./rollback-evidence-fixture.mjs";

const evidence = (binding) => ({ evidence_ref: binding.evidence_ref, evidence_sha256: binding.evidence_sha256 });

function populateReadbacks(receipt, candidate, plan) {
  receipt.operations = receipt.profiles.map((profile) => {
    const distribution = contract.m365.production_distribution.profiles
      .find(({ product_id }) => product_id === profile.product_id);
    return {
      product_id: profile.product_id, operation_type: distribution.central_operation_type,
      operation_ref: `operation-ref:${profile.profile}-20260808`, result: "success",
    };
  });
  receipt.static_readbacks = receipt.profiles.map((profile) => {
    const staticProfile = plan.profiles.find(({ product_id }) => product_id === profile.product_id);
    const artifact = candidate.profile_artifacts.find(({ product_id }) => product_id === profile.product_id);
    return {
      product_id: profile.product_id, result: "exact_hash", http_status: 200,
      target_prefix: staticProfile.target_prefix, inventory_sha256: staticProfile.inventory_sha256,
      taskpane_html_sha256: artifact.taskpane_html_sha256, bundle_sha256: profile.bundle_sha256,
      source_locations: profile.source_locations,
    };
  });
  receipt.readbacks = receipt.profiles.map((profile) => ({
    product_id: profile.product_id, version: contract.release_version,
    manifest_sha256: profile.candidate_manifest_sha256, deployment_mode: "fixed",
    source_locations: profile.source_locations, assignment_count: profile.assignment_count,
    assignment_fingerprint_sha256: profile.assignment_fingerprint_sha256,
    distribution_role: profile.distribution_role, assignment_state: profile.assignment_state,
    production_user_visible: profile.production_user_visible, assign_to_everyone: profile.assign_to_everyone,
    enabled: true,
  }));
}

async function writeControls(root, receipt, restored, authorizedActions) {
  const control = receipt.execution_control;
  control.operator_ref = "operator-ref:release-engineer-01";
  control.owner_ref = "owner-ref:outlook-release-01";
  control.window_start_utc = "2026-08-08T00:00:00Z";
  control.window_end_utc = "2026-08-08T04:00:00Z";
  control.monitoring_criteria = ["two-source-one-visible-readback-exact", "provider-error-rate-below-threshold"];
  control.abort_criteria = ["manifest-readback-drift", "provider-error-rate-threshold-breached"];
  control.rollback_readback_owner_ref = "owner-ref:rollback-readback-01";
  const authorization = await writeProtectedJson(root, "controls/authorization.json", authorizationProof(control, authorizedActions));
  const groups = ["group-ref:outlook-pilot-nine"];
  const pilotValue = pilotProof(receipt, groups);
  const pilot = await writeProtectedJson(root, "controls/pilot-assignment.json", pilotValue);
  const monitoring = await writeProtectedJson(root, "controls/monitoring-plan.json", monitoringProof(control));
  const rehearsal = await writeProtectedJson(root, "controls/rollback-rehearsal.json", rollbackProof(control, restored));
  control.authorization_evidence = evidence(authorization);
  control.pilot_assignment = {
    ...evidence(pilot), groups, fingerprint_sha256: pilotValue.assignment_fingerprint_sha256,
    eligible_principal_fingerprint_sha256: pilotValue.eligible_principal_fingerprint_sha256,
    excluded_principal_fingerprint_sha256: pilotValue.excluded_principal_fingerprint_sha256,
  };
  control.monitoring_evidence = evidence(monitoring);
  control.rollback_rehearsal_evidence = evidence(rehearsal);
  return { authorization, pilot, monitoring, rehearsal };
}

async function writePrerequisites(root, receipt, candidate, plan, planBinding, controls) {
  const proofs = prerequisiteProofs({
    authorizationHash: controls.authorization.evidence_sha256,
    candidate,
    control: receipt.execution_control,
    plan,
    planBinding,
  });
  for (const name of contract.m365.required_prerequisites) {
    const binding = await writeProtectedJson(root, `prerequisites/${name}.json`, proofs[name]);
    receipt.prerequisites[name] = {
      status: "verified", artifact_sha256: proofs[name].artifact_sha256, ...evidence(binding), ...sourceIdentity,
    };
  }
  return proofs;
}

async function writePropagation(root, receipt) {
  for (const profile of receipt.profiles) {
    for (const hour of contract.m365.propagation_observation_hours) {
      const observed = new Date(Date.UTC(2026, 7, 8, 2 + hour)).toISOString();
      const entry = {
        product_id: profile.product_id, hour, result: "exact_readback", version: contract.release_version,
        manifest_sha256: profile.candidate_manifest_sha256,
        assignment_count: profile.assignment_count, assignment_state: profile.assignment_state,
        assignment_fingerprint_sha256: profile.assignment_fingerprint_sha256,
        distribution_role: profile.distribution_role, production_user_visible: profile.production_user_visible,
        assign_to_everyone: profile.assign_to_everyone,
        observed_at_utc: observed,
      };
      const binding = await writeProtectedJson(root, `runtime/propagation/${profile.profile}-${hour}.json`, propagationProof(entry));
      receipt.propagation_observations.push({ ...entry, ...evidence(binding) });
    }
  }
}

async function writeHosts(root, receipt) {
  const versions = {
    "classic-outlook-windows": "16.0.19328.20158", "new-outlook-windows": "20260801001.12",
    "outlook-macos": "16.101.2", owa: "Exchange-Online-2026.08",
  };
  for (const profile of receipt.profiles.filter(({ production_user_visible }) => production_user_visible)) {
    for (const host of contract.m365.required_host_evidence) {
      const entry = {
        product_id: profile.product_id, host, executed: true, result: "pass",
        manifest_sha256: profile.candidate_manifest_sha256, bundle_sha256: profile.bundle_sha256,
        scenarios: [...contract.m365.required_common_host_scenarios, ...contract.m365.required_profile_scenarios[profile.profile]],
        host_version: versions[host], observed_at_utc: "2026-08-11T03:00:00Z",
        accessibility_check: "pass", host_dom_manipulation: false,
      };
      const binding = await writeProtectedJson(root, `runtime/hosts/${profile.profile}-${host}.json`, hostProof(entry));
      receipt.host_evidence.push({ ...entry, evidence_kind: "real_outlook_host", ...evidence(binding) });
    }
  }
}

export async function completedM365Fixture({ authorizedActions } = {}) {
  const hashes = { "matter-full": hex("1"), "inquiry-only": hex("2") };
  const root = await createProtectedFixtureRoot();
  const rollbackFixture = await createRollbackEvidenceFixture(root, baseline, rollback);
  const releaseContext = releaseContextFor(rollbackFixture);
  const candidate = releaseCandidate(hashes, releaseContext);
  const receipt = awaitingM365Receipt(hashes, rollbackFixture);
  const plan = staticPlanFor(hashes, releaseContext);
  const planBinding = await writeProtectedJson(root, "plans/static-plan.json", plan);
  const protectedEvidence = trustedRoot(root);
  const restored = validateProtectedRollbackEvidence(
    rollbackFixture.rollback, rollbackFixture.baseline, contract, protectedEvidence,
  );
  receipt.status = "deployment_verified";
  receipt.authorization_ref = "change-ref:outlook-20260808-001";
  receipt.mutation_count = 2;
  const controls = await writeControls(root, receipt, restored, authorizedActions);
  await writePrerequisites(root, receipt, candidate, plan, planBinding, controls);
  receipt.static_release = staticReleaseProjection(plan, planBinding.evidence_sha256);
  populateReadbacks(receipt, candidate, plan);
  const staticBinding = receipt.prerequisites.static_release;
  const central = await writeProtectedJson(root, "central/deployment.json", centralProof(
    receipt, receipt.execution_control, controls.authorization.evidence_sha256, staticBinding.evidence_sha256,
  ));
  receipt.execution_control.central_deployment_evidence = evidence(central);
  await writePropagation(root, receipt);
  await writeHosts(root, receipt);
  receipt.claims = {
    central_deployment_verified: true, propagation_verified: true,
    real_outlook_verified: true, go_live_approved: false,
  };
  const options = m365Options(hashes, protectedEvidence, {
    ...rollbackFixture, releaseCandidate: candidate, releaseContext,
  });
  return {
    root, hashes, candidate, plan, receipt, protectedEvidence, restored,
    baseline: rollbackFixture.baseline, rollback: rollbackFixture.rollback, options,
  };
}

export async function approveGoLive(fixture) {
  const { receipt, root } = fixture;
  receipt.status = "go_live_approved";
  receipt.claims.go_live_approved = true;
  receipt.go_live_approval_ref = "go-live-ref:outlook-20260812-001";
  const binding = await writeProtectedJson(root, "controls/go-live-approval.json", goLiveProof(receipt, receipt.execution_control));
  receipt.execution_control.go_live_evidence = evidence(binding);
  return fixture;
}
