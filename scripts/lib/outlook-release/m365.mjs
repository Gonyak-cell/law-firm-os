import { validateM365Envelope } from "./m365-base.mjs";
import { validateM365CentralDeployment } from "./m365-central.mjs";
import { validateAwaitingControls, validateExecutedControls } from "./m365-controls.mjs";
import { validateVerifiedPrerequisite } from "./m365-prerequisites.mjs";
import { validateM365Runtime } from "./m365-runtime.mjs";

function validateAwaitingReceipt(receipt, prerequisites) {
  validateAwaitingControls(receipt.execution_control);
  const pending = Object.entries(prerequisites).filter(([, item]) => item.status !== "pending");
  if (pending.length || receipt.authorization_ref != null || receipt.go_live_approval_ref != null
    || receipt.mutation_count !== 0 || receipt.static_release != null || receipt.operations.length
    || receipt.static_readbacks.length || receipt.readbacks.length || receipt.propagation_observations.length
    || receipt.host_evidence.length || Object.values(receipt.claims).some(Boolean)) {
    throw new Error("awaiting M365 receipt overclaims external execution or verification");
  }
  return { status: receipt.status, external_mutation_performed: false, blocked_external: true };
}

export function validateM365ReleaseReceipt(receipt, options) {
  const envelope = validateM365Envelope(receipt, options);
  if (receipt.status === "awaiting_authorized_deployment") {
    return validateAwaitingReceipt(receipt, envelope.prerequisites);
  }
  if (!["pilot_deployed", "propagation_observing", "deployment_verified", "go_live_approved"].includes(receipt.status)
    || receipt.mutation_count !== 2) throw new Error("executed M365 receipt status or mutation count is invalid");
  const pending = Object.entries(envelope.prerequisites).filter(([, item]) => item.status !== "verified");
  if (pending.length) throw new Error(`executed M365 receipt has pending prerequisites: ${pending.map(([name]) => name).join(", ")}`);
  const controlProofs = validateExecutedControls(receipt.execution_control, {
    store: options.protectedEvidence,
    identity: options.expectedSourceIdentity,
    receipt,
    rollback: options.rollback,
  });
  if (receipt.authorization_ref !== controlProofs.authorization.proof.authorization_ref) {
    throw new Error("M365 authorization_ref is not bound to protected authorization evidence");
  }
  const sourceLocations = Object.fromEntries(options.contract.profiles.map((profile) => [
    profile.profile,
    options.candidateManifestProjections?.[profile.profile]?.form_source_locations,
  ]));
  const proofContext = {
    store: options.protectedEvidence,
    identity: options.expectedSourceIdentity,
    contract: options.contract,
    releaseCandidate: options.releaseCandidate,
    releaseContext: options.releaseContext,
    sourceLocations,
    authorizationHash: controlProofs.authorization.loaded.evidence_sha256,
  };
  const prerequisiteProofs = Object.fromEntries(Object.entries(envelope.prerequisites).map(([name, packet]) => [
    name,
    validateVerifiedPrerequisite(name, packet, proofContext),
  ]));
  const staticProof = prerequisiteProofs.static_release;
  validateM365CentralDeployment(receipt, options, {
    ...receipt.execution_control,
    authorization_evidence: receipt.execution_control.authorization_evidence,
  }, staticProof);
  validateM365Runtime(receipt, options, receipt.execution_control);
  if (receipt.status === "pilot_deployed"
    && (receipt.claims.propagation_verified || receipt.claims.real_outlook_verified || receipt.claims.go_live_approved)) {
    throw new Error("pilot_deployed status must not overclaim later verification gates");
  }
  if (receipt.status === "propagation_observing" && receipt.claims.go_live_approved) {
    throw new Error("propagation_observing status must not overclaim go-live");
  }
  return {
    status: receipt.status,
    external_mutation_performed: true,
    central_deployment_verified: true,
    propagation_verified: receipt.claims.propagation_verified === true,
    real_outlook_verified: receipt.claims.real_outlook_verified === true,
    go_live_approved: receipt.claims.go_live_approved === true,
  };
}
