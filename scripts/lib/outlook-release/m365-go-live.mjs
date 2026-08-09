import { m365CompletionMillis } from "./m365-base.mjs";
import { concreteText, sha256 } from "./primitives.mjs";
import { assertProofBase } from "./proof-common.mjs";
import { readProtectedJsonProof } from "./protected-evidence.mjs";

export function validateM365GoLive(receipt, options, context) {
  const { controls, hosts, propagation } = context;
  if ((receipt.status === "go_live_approved") !== (receipt.claims.go_live_approved === true)) {
    throw new Error("go-live status and claim must advance together");
  }
  if (receipt.status !== "go_live_approved") {
    if (receipt.go_live_approval_ref != null || controls.go_live_evidence != null) {
      throw new Error("go-live evidence is not allowed before go_live_approved status");
    }
    return null;
  }
  const loaded = readProtectedJsonProof(options.protectedEvidence, controls.go_live_evidence, "go_live_approval");
  const proof = loaded.proof;
  assertProofBase(proof, "amic-os.m365-go-live-approval-proof.v1", "go_live_approval", options.expectedSourceIdentity, [
    "approval_ref", "approved_at_utc", "central_deployment_evidence_sha256", "host_evidence_set_sha256",
    "monitoring_evidence_sha256", "owner_ref", "propagation_evidence_set_sha256", "result",
    "rollback_rehearsal_evidence_sha256",
  ]);
  const propagationHash = sha256(JSON.stringify(propagation.map(({ evidence_sha256 }) => evidence_sha256).sort()));
  const hostHash = sha256(JSON.stringify(hosts.map(({ evidence_sha256 }) => evidence_sha256).sort()));
  if (receipt.claims.propagation_verified !== true || receipt.claims.real_outlook_verified !== true
    || proof.approval_ref !== receipt.go_live_approval_ref || proof.owner_ref !== controls.owner_ref
    || proof.central_deployment_evidence_sha256 !== controls.central_deployment_evidence.evidence_sha256
    || proof.monitoring_evidence_sha256 !== controls.monitoring_evidence.evidence_sha256
    || proof.rollback_rehearsal_evidence_sha256 !== controls.rollback_rehearsal_evidence.evidence_sha256
    || proof.propagation_evidence_set_sha256 !== propagationHash || proof.host_evidence_set_sha256 !== hostHash
    || proof.result !== "approved") throw new Error("go-live approval proof is incomplete or evidence-unbound");
  concreteText(receipt.go_live_approval_ref, "go_live_approval_ref");
  const completedAt = m365CompletionMillis(proof.approved_at_utc, "go-live approval", context.validationCutoff);
  const requiredAt = Math.max(
    context.centralObservedAt, context.monitoringObservedAt, context.rollbackObservedAt,
    ...propagation.map((item) => item.completedAt), ...hosts.map((item) => item.completedAt),
  );
  if (completedAt < requiredAt) throw new Error("go-live approval precedes required evidence");
  return { ...loaded, completedAt };
}
