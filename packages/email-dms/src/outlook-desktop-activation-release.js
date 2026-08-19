import {
  verifyOutlookDesktopReleaseTicket,
} from "./outlook-desktop-release-ticket-verifier.js";
import {
  fail,
  pureObject,
} from "./outlook-desktop-activation-primitives.js";
import { SHA256 } from "./outlook-desktop-activation-schema.js";

const ACTIVATION_TICKET_CODES = Object.freeze({
  bytes: "OUTLOOK_ACTIVATION_RELEASE_TICKET_BYTES_REQUIRED",
  canonical: "OUTLOOK_ACTIVATION_RELEASE_TICKET_CANONICAL_INVALID",
  expired: "OUTLOOK_ACTIVATION_RELEASE_TICKET_TIME_INVALID",
  json: "OUTLOOK_ACTIVATION_RELEASE_TICKET_JSON_INVALID",
  schema: "OUTLOOK_ACTIVATION_RELEASE_TICKET_INVALID",
  scope: "OUTLOOK_ACTIVATION_RELEASE_TICKET_SCOPE_MISMATCH",
  signature: "OUTLOOK_ACTIVATION_RELEASE_TICKET_SIGNATURE_INVALID",
  signatureFormat: "OUTLOOK_ACTIVATION_RELEASE_TICKET_SIGNATURE_FORMAT",
  signerExpired: "OUTLOOK_ACTIVATION_RELEASE_TICKET_SIGNER_EXPIRED",
  signerInvalid: "OUTLOOK_ACTIVATION_RELEASE_TICKET_SIGNER_INVALID",
  signerRevoked: "OUTLOOK_ACTIVATION_RELEASE_TICKET_SIGNER_REVOKED",
  signerUnknown: "OUTLOOK_ACTIVATION_RELEASE_TICKET_SIGNER_UNKNOWN",
  time: "OUTLOOK_ACTIVATION_RELEASE_TICKET_TIME_INVALID",
});

export function validateActivationRegistryTrust(registryTrust, approvedRelease) {
  const serial = registryTrust?.registrySerial ?? registryTrust?.registry?.registry_serial;
  if (!registryTrust?.registry?.keys
      || !SHA256.test(registryTrust.sha256 ?? "")
      || !Number.isSafeInteger(serial)
      || serial < 1) {
    fail(
      "OUTLOOK_ACTIVATION_TRUST_REGISTRY_INVALID",
      "a root-verified production trust registry is required",
    );
  }
  if (registryTrust.sha256 !== approvedRelease.trust_registry_sha256
      || serial !== approvedRelease.trust_registry_serial) {
    fail(
      "OUTLOOK_ACTIVATION_TRUST_REGISTRY_MISMATCH",
      "approved release does not bind the verified trust registry",
    );
  }
  return { registryTrust, serial };
}

export function verifyActivationReleaseTicket({
  approvedRelease,
  challengeExpiresAt,
  now,
  principal,
  registryTrust,
  signatureBytes,
  ticketBytes,
}) {
  const verified = verifyOutlookDesktopReleaseTicket({
    codes: ACTIVATION_TICKET_CODES,
    fail,
    now,
    registryTrust,
    signatureBytes,
    ticketBytes,
  });
  const { expiresAt, ticket } = verified;
  if (challengeExpiresAt > expiresAt) {
    fail(
      "OUTLOOK_ACTIVATION_RELEASE_TICKET_TIME_INVALID",
      "release ticket does not cover the challenge",
    );
  }
  if (ticket.platform !== "darwin"
      || ticket.arch !== "arm64"
      || ticket.channel !== "formal"
      || ticket.app_id !== "com.amic.matter.desktop") {
    fail(
      "OUTLOOK_ACTIVATION_RELEASE_TICKET_INVALID",
      "release ticket is not an exact darwin arm64 formal ticket",
    );
  }
  const bindings = {
    app_id: approvedRelease.app_id,
    approval_sha256: approvedRelease.approval_sha256,
    arch: approvedRelease.arch,
    build_manifest_sha256: approvedRelease.embedded_build_manifest_sha256,
    channel: approvedRelease.channel,
    entra_tenant_id: principal.entra_tenant_id,
    inner_artifact_bytes: approvedRelease.measured_inner_artifact_bytes,
    inner_artifact_sha256: approvedRelease.measured_inner_artifact_sha256,
    lawos_tenant_id: principal.lawos_tenant_id,
    platform: approvedRelease.platform,
    source_sha: approvedRelease.source_sha,
    source_tree: approvedRelease.source_tree,
    ticket_id: approvedRelease.release_ticket_id,
    version: approvedRelease.app_version,
  };
  if (Object.entries(bindings).some(([field, value]) => ticket[field] !== value)
      || approvedRelease.tenant_id !== principal.lawos_tenant_id
      || approvedRelease.release_ticket_sha256 !== verified.ticketSha256
      || approvedRelease.release_ticket_signature_sha256 !== verified.signatureSha256
      || Date.parse(approvedRelease.valid_until) > expiresAt) {
    fail(
      "OUTLOOK_ACTIVATION_RELEASE_TICKET_BINDING_MISMATCH",
      "release ticket bytes do not exactly bind the approved release and authenticated tenant",
    );
  }
  return {
    ...verified,
    ticket: pureObject(ticket),
  };
}
