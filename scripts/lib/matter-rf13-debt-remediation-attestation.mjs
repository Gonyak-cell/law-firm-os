import { createHash } from "node:crypto";

import {
  canonicalizeJson,
  validateRuntimeSafetyApprovalPayload,
} from "./runtime-safety-approval-contract.mjs";

export const RF13_COMPLETION_PACKET_SCHEMA = "law-firm-os.rf13-dist.goal-completion-packet.v1";
export const RF13_COMPLETION_ATTESTOR_ROLE = "rf13_evidence_attestor";
export const RF13_COMPLETION_ACTION = "lawos-rf13-dist-goal-completion";
export const RF13_COMPLETION_ENVIRONMENT = "release";

const SHA256 = /^[0-9a-f]{64}$/u;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function fail(code, message) {
  const error = new Error(message);
  error.name = "Rf13CompletionAttestationError";
  error.code = code;
  throw error;
}

function canonicalDigest(value) {
  return sha256(Buffer.from(canonicalizeJson(value)));
}

export function serializeRf13CompletionPacket(packet) {
  if (packet?.schema_version !== RF13_COMPLETION_PACKET_SCHEMA) {
    fail("RF13_COMPLETION_PACKET_INVALID", "completion packet schema is invalid");
  }
  return Buffer.from(canonicalizeJson(packet));
}

export function buildRf13CompletionPacket({ manifest, outcomes }) {
  const rfd010 = outcomes.get("RFD-TUW-010");
  if (!rfd010?.candidate_valid || !SHA256.test(rfd010.evidence_sha256 ?? "")) {
    fail("RF13_COMPLETION_PACKET_INCOMPLETE", "completion packet requires the canonical RFD-TUW-010 source seal");
  }
  const units = manifest.units.filter((unit) => unit.status === "COMPLETE").map((unit) => {
    const outcome = outcomes.get(unit.id);
    if (!outcome?.candidate_valid || !SHA256.test(outcome.evidence_sha256 ?? "")) {
      fail("RF13_COMPLETION_PACKET_INCOMPLETE", "completion packet requires one validated receipt for every TUW");
    }
    return Object.freeze({
      id: unit.id,
      evidence_sha256: outcome.evidence_sha256,
      observations_sha256: canonicalDigest(outcome.observations),
      producers: Object.freeze(outcome.producers.map((producer) => Object.freeze({ ...producer }))),
      implementation_dependencies: Object.freeze(
        outcome.implementation_dependencies.map((dependency) => Object.freeze({ ...dependency })),
      ),
    });
  });
  return Object.freeze({
    schema_version: RF13_COMPLETION_PACKET_SCHEMA,
    goal_id: manifest.goal_id,
    plan_sha256: manifest.plan.sha256,
    source: Object.freeze({
      sha: manifest.source.head_sha,
      tree: manifest.source.tree_sha,
      manifest_sha256: manifest.source.source_manifest_sha256,
      fingerprint_sha256: manifest.source.working_tree_sha256,
      dirty: manifest.source.source_dirty,
    }),
    rfd010: Object.freeze({
      canonical_validator_pass: rfd010.canonical_validator_pass,
      evidence_sha256: rfd010.evidence_sha256,
      producers: Object.freeze(rfd010.producers.map((producer) => Object.freeze({ ...producer }))),
      release_authority_status: rfd010.rfd010_release_authority_status,
    }),
    units: Object.freeze(units),
  });
}

export function hashRf13CompletionPacket(packet) {
  return sha256(serializeRf13CompletionPacket(packet));
}

export function validateRf13CompletionAttestation(packet, attestation = {}) {
  const packetSha256 = hashRf13CompletionPacket(packet);
  let validation;
  try {
    validation = validateRuntimeSafetyApprovalPayload({
      registryBytes: attestation.registryBytes,
      receiptBytes: attestation.receiptBytes,
      signatureBytes: attestation.signatureBytes,
      expectedRegistrySha256: attestation.expectedRegistrySha256,
      expectedRole: RF13_COMPLETION_ATTESTOR_ROLE,
      expectedAction: RF13_COMPLETION_ACTION,
      expectedEnvironment: RF13_COMPLETION_ENVIRONMENT,
      expectedPacketSha256: packetSha256,
      expectedSourceSha: packet.source.sha,
      expectedSourceTree: packet.source.tree,
      allowedDataScope: [],
      allowedContactScope: [],
      now: attestation.now,
    });
  } catch {
    fail("RF13_COMPLETION_ATTESTATION_INVALID", "completion requires a valid externally pinned attestor signature");
  }
  if (validation.decision !== "approved") {
    fail("RF13_COMPLETION_ATTESTATION_REJECTED", "the trusted completion attestor did not approve the exact packet");
  }
  return Object.freeze({
    packet_sha256: packetSha256,
    registry_sha256: validation.registry_sha256,
    approval_receipt_sha256: validation.receipt_sha256,
    approval_id: validation.approval_id,
  });
}
