import { generateKeyPairSync } from "node:crypto";

import { createOutlookDesktopActivationContract } from "../../src/outlook-desktop-activation-contract.js";
import {
  ACTIVATION_NOW,
  ACTIVATION_NOW_ISO,
  OPERATOR_RECEIPT_EXPIRES_AT,
  hash,
  publicKeySpki,
  signedReceipt,
  signedTicket,
} from "./outlook-desktop-activation-crypto-fixture.js";
import { installActivationRegistry } from "./outlook-desktop-activation-registry-fixture.js";

export {
  ACTIVATION_NOW,
  ACTIVATION_NOW_ISO,
  OPERATOR_RECEIPT_EXPIRES_AT,
  canonicalBytes,
  hash,
  signedReceipt,
  signedTicket,
} from "./outlook-desktop-activation-crypto-fixture.js";

export function receiptBindings(request) {
  return {
    activation_id: request.activation_id,
    activation_mode: request.activation_mode,
    approved_release: request.approved_release,
    authenticated_principal: request.authenticated_principal,
    candidate_device: request.candidate_device,
    hardware_key_attested: request.hardware_key_attested,
    local_measurement_evidence_sha256: request.local_measurement_evidence_sha256,
    mdm_attested: request.mdm_attested,
    pilot_policy: request.pilot_policy,
    remote_app_attested: request.remote_app_attested,
  };
}

export async function activationFixture(t, { mutateRegistry } = {}) {
  const keys = {
    device: generateKeyPairSync("ed25519"),
    operator: generateKeyPairSync("ed25519"),
    release: generateKeyPairSync("ed25519"),
  };
  const artifactBytes = Buffer.from("formal macOS arm64 inner artifact\n");
  const finalBytes = Buffer.from("formal macOS arm64 final dmg\n");
  const principal = {
    entra_subject: "entra-subject-jwsuh-canary-01",
    entra_tenant_id: "11111111-2222-4333-8444-555555555555",
    lawos_tenant_id: "tenant_amic",
    lawos_user_id: "user_jwsuh_canary",
  };
  const pilotPolicy = {
    owner_principal_id: "owner_release_2026_08",
    pilot_id: "jwsuh_canary",
    policy_revision: "jwsuh_canary_2026-08-17.r1",
    roster_sha256: hash(Buffer.from("jwsuh canary exact roster\n")),
  };
  const approvedRelease = {
    app_id: "com.amic.matter.desktop",
    app_version: "0.1.27",
    approval_sha256: hash(Buffer.from("release approval receipt\n")),
    arch: "arm64",
    channel: "formal",
    embedded_build_manifest_sha256: hash(Buffer.from("canonical build manifest\n")),
    macos_code_directory_sha256: hash(Buffer.from("CodeDirectory bytes\n")),
    macos_designated_requirement_sha256: hash(Buffer.from("designated requirement bytes\n")),
    macos_team_id: "ABCDE12345",
    macos_technical_evidence_sha256: hash(Buffer.from("macOS technical evidence\n")),
    measured_inner_artifact_bytes: artifactBytes.length,
    measured_inner_artifact_sha256: hash(artifactBytes),
    platform: "darwin",
    registered_final_artifact_bytes: finalBytes.length,
    registered_final_artifact_sha256: hash(finalBytes),
    release_artifact_id: "odra_formal_macos_0_1_27_arm64",
    release_ticket_id: "odrt_formal_macos_0_1_27_arm64",
    release_ticket_sha256: "0".repeat(64),
    release_ticket_signature_sha256: "0".repeat(64),
    source_sha: hash(Buffer.from("source commit\n"), "sha1"),
    source_tree: hash(Buffer.from("source tree\n"), "sha1"),
    tenant_id: principal.lawos_tenant_id,
    trust_registry_serial: 15,
    trust_registry_sha256: "0".repeat(64),
    valid: true,
    valid_until: "2026-08-16T13:00:00.000Z",
  };
  const releaseTicket = {
    app_id: approvedRelease.app_id,
    approval_sha256: approvedRelease.approval_sha256,
    arch: approvedRelease.arch,
    build_manifest_sha256: approvedRelease.embedded_build_manifest_sha256,
    channel: approvedRelease.channel,
    entra_tenant_id: principal.entra_tenant_id,
    expires_at: approvedRelease.valid_until,
    inner_artifact_bytes: approvedRelease.measured_inner_artifact_bytes,
    inner_artifact_sha256: approvedRelease.measured_inner_artifact_sha256,
    issued_at: "2026-08-16T11:50:00.000Z",
    key_id: "release-key-2026-01",
    lawos_tenant_id: principal.lawos_tenant_id,
    operation: "approve-outlook-desktop-release",
    pilot_id: "amic-os-outlook",
    platform: approvedRelease.platform,
    receipt_source: "law-firm-os.desktop-release",
    receipt_type: "outlook-desktop-release-ticket",
    role: "desktop-release-approver",
    schema_version: "law-firm-os.outlook-desktop-release-ticket.v1",
    source_sha: approvedRelease.source_sha,
    source_tree: approvedRelease.source_tree,
    ticket_id: approvedRelease.release_ticket_id,
    version: approvedRelease.app_version,
  };
  const item = { keys };
  const ticketSignature = signedTicket(item, releaseTicket);
  approvedRelease.release_ticket_sha256 = hash(ticketSignature.release_ticket_bytes);
  approvedRelease.release_ticket_signature_sha256 = hash(
    ticketSignature.release_ticket_signature_bytes,
  );
  const registry = installActivationRegistry(t, {
    approvedRelease,
    keys,
    mutateRegistry,
    pilotPolicy,
    principal,
  });
  approvedRelease.trust_registry_sha256 = registry.sha256;
  const deviceSpki = publicKeySpki(keys.device);
  const issue_input = {
    approved_release: approvedRelease,
    authenticated_principal: principal,
    candidate_device: {
      continuity_key_fingerprint_sha256: hash(deviceSpki),
      continuity_public_key_spki: deviceSpki.toString("base64"),
    },
    pilot_policy: pilotPolicy,
  };
  const contract = createOutlookDesktopActivationContract({
    testOnlyNow: ACTIVATION_NOW,
    testOnlyRandomBytes(size) {
      return Buffer.alloc(size, size === 32 ? 0x5a : 0x41);
    },
    testOnlyVerifiedRegistry: registry,
  });
  const challenge = contract.issueChallenge(issue_input);
  const request = {
    activation_binding_sha256: challenge.activation_binding_sha256,
    activation_id: challenge.activation_id,
    activation_mode: challenge.activation_mode,
    approved_release: challenge.approved_release,
    authenticated_principal: challenge.authenticated_principal,
    candidate_device: challenge.candidate_device,
    challenge_nonce_base64url: challenge.challenge_nonce_base64url,
    hardware_key_attested: false,
    local_measurement_evidence_sha256: challenge.local_measurement_evidence_sha256,
    mdm_attested: false,
    pilot_policy: challenge.pilot_policy,
    remote_app_attested: false,
  };
  const receipt = {
    activation_binding_sha256: challenge.activation_binding_sha256,
    bindings: receiptBindings(request),
    challenge_nonce_sha256: challenge.challenge_nonce_sha256,
    expires_at: OPERATOR_RECEIPT_EXPIRES_AT,
    issued_at: ACTIVATION_NOW_ISO,
    key_id: "activation-operator-key-2026-01",
    local_measurement_evidence_sha256: request.local_measurement_evidence_sha256,
    operation: "authorize-outlook-desktop-activation",
    operator_local_package_verified: true,
    production_ready_claim: false,
    receipt_source: "law-firm-os.outlook-desktop-activation",
    receipt_type: "outlook-desktop-operator-activation",
    schema_version: "lawos.outlook-desktop-operator-activation.v1",
    signer_role: "outlook-desktop-activation-operator",
    signer_scope: "operator_controlled_macos_v1:jwsuh_canary",
  };
  Object.assign(item, {
    approvedRelease,
    challenge,
    contract,
    issue_input,
    pilotPolicy,
    principal,
    receipt,
    registry,
    releaseTicket,
    request,
    ...signedReceipt(item, receipt),
    ...ticketSignature,
  });
  item.verification_input = {
    activation_request: request,
    issued_challenge: challenge,
    operator_receipt_bytes: item.operator_receipt_bytes,
    operator_receipt_signature_bytes: item.operator_receipt_signature_bytes,
    release_ticket_bytes: item.release_ticket_bytes,
    release_ticket_signature_bytes: item.release_ticket_signature_bytes,
  };
  return item;
}
