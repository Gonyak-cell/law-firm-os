import { createHash } from "node:crypto";

const SHA256 = /^[0-9a-f]{64}$/u;
const AUDIT_BINDING_DOMAIN = "law-firm-os.outlook-desktop-release-audit-event.v1";
export const OUTLOOK_DESKTOP_FINAL_ARTIFACT_MAX_BYTES = 8_589_934_592;

function databaseTime(value, field, fail) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    fail("RELEASE_ARTIFACT_BINDING_MISMATCH", `${field} is invalid`);
  }
  return parsed.getTime();
}

function auditBindingSha256(row, occurredAt) {
  const values = [
    AUDIT_BINDING_DOMAIN, row.approval_audit_tenant_id,
    row.approval_audit_event_id, row.approval_audit_release_artifact_id,
    row.approval_audit_event_type, row.approval_audit_release_ticket_sha256,
    row.approval_audit_final_artifact_sha256,
    row.approval_audit_approval_sha256, String(occurredAt),
  ];
  const material = values.map((value) => (
    `${Buffer.byteLength(value, "utf8")}:${value}`
  )).join("");
  return createHash("sha256").update(material).digest("hex");
}

export function assertApprovedOutlookDesktopReleaseArtifact({
  fail,
  now,
  registryTrust,
  row,
  verified,
}) {
  if (row.revoked_at != null) fail("RELEASE_ARTIFACT_REVOKED", "approved release artifact is revoked");
  const time = (value, field) => databaseTime(value, field, fail);
  const validFrom = time(row.valid_from, "artifact.valid_from");
  const validUntil = time(row.valid_until, "artifact.valid_until");
  const approvedAt = time(row.approved_at, "artifact.approved_at");
  if (now < validFrom || now >= validUntil) {
    fail("RELEASE_NOT_APPROVED", "approved release artifact is outside its validity interval");
  }
  const ticket = verified.ticket;
  const bindings = {
    tenant_id: ticket.lawos_tenant_id,
    release_ticket_id: ticket.ticket_id,
    release_ticket_key_id: ticket.key_id,
    platform: ticket.platform,
    channel: ticket.channel,
    app_version: ticket.version,
    app_id: ticket.app_id,
    arch: ticket.arch,
    source_sha: ticket.source_sha,
    source_tree: ticket.source_tree,
    embedded_build_manifest_sha256: ticket.build_manifest_sha256,
    embedded_inner_artifact_sha256: ticket.inner_artifact_sha256,
    embedded_inner_artifact_bytes: String(ticket.inner_artifact_bytes),
    embedded_release_ticket_sha256: verified.ticketSha256,
    embedded_release_ticket_signature_sha256: verified.signatureSha256,
    approval_sha256: ticket.approval_sha256,
    trust_registry_sha256: registryTrust.sha256,
    trust_registry_serial: String(registryTrust.registrySerial),
    signature_algorithm: "Ed25519",
  };
  if (Object.entries(bindings).some(([field, value]) => String(row[field]) !== value)
      || time(row.ticket_issued_at, "artifact.ticket_issued_at") !== verified.issuedAt
      || time(row.ticket_expires_at, "artifact.ticket_expires_at") !== verified.expiresAt) {
    fail("RELEASE_ARTIFACT_BINDING_MISMATCH", "approved artifact does not exactly bind the signed release ticket");
  }
  if (!SHA256.test(row.final_artifact_sha256) || !/^\d+$/u.test(String(row.final_artifact_bytes))
      || BigInt(row.final_artifact_bytes) < 1n
      || BigInt(row.final_artifact_bytes) > BigInt(OUTLOOK_DESKTOP_FINAL_ARTIFACT_MAX_BYTES)
      || row.macos_signature_valid !== true || row.macos_notarized !== true
      || row.macos_stapled !== true || row.macos_gatekeeper_status !== "accepted"
      || !/^[A-Z0-9]{10}$/u.test(row.macos_team_id) || !SHA256.test(row.macos_certificate_sha256)
      || !SHA256.test(row.macos_technical_evidence_sha256)
      || row.windows_authenticode_status !== "not_applicable") {
    fail("RELEASE_ARTIFACT_BINDING_MISMATCH", "approved macOS artifact lacks exact technical release evidence");
  }
  const certificateFrom = time(row.macos_certificate_valid_from, "artifact.macos_certificate_valid_from");
  const certificateUntil = time(row.macos_certificate_valid_until, "artifact.macos_certificate_valid_until");
  const evidenceObserved = time(row.macos_evidence_observed_at, "artifact.macos_evidence_observed_at");
  const evidenceExpires = time(row.macos_evidence_expires_at, "artifact.macos_evidence_expires_at");
  if (evidenceObserved < certificateFrom || evidenceObserved >= certificateUntil
      || approvedAt < certificateFrom || approvedAt >= certificateUntil
      || evidenceObserved > approvedAt || approvedAt < verified.issuedAt
      || approvedAt > validFrom) {
    fail("RELEASE_ARTIFACT_BINDING_MISMATCH", "artifact chronology exceeds its signed macOS evidence");
  }
  if (now < certificateFrom || now >= certificateUntil || now < evidenceObserved || now >= evidenceExpires) {
    fail("RELEASE_ARTIFACT_EVIDENCE_EXPIRED", "approved macOS technical evidence is not currently valid");
  }
  if (certificateFrom > validFrom || validUntil > certificateUntil
      || validFrom < verified.issuedAt || validUntil > evidenceExpires
      || validUntil > verified.expiresAt) {
    fail("RELEASE_ARTIFACT_BINDING_MISMATCH", "artifact validity exceeds its macOS technical evidence");
  }
  if (row.approval_audit_event_id == null) {
    fail("RELEASE_ARTIFACT_AUDIT_REQUIRED", "approved artifact requires one immutable approval audit event");
  }
  const audit = {
    approval_audit_event_type: "approved",
    approval_audit_tenant_id: row.tenant_id,
    approval_audit_release_artifact_id: row.release_artifact_id,
    approval_audit_release_ticket_sha256: verified.ticketSha256,
    approval_audit_final_artifact_sha256: row.final_artifact_sha256,
    approval_audit_approval_sha256: row.approval_sha256,
  };
  const auditOccurredAt = time(row.approval_audit_occurred_at, "audit.occurred_at");
  if (!SHA256.test(row.approval_audit_event_binding_sha256)
      || Object.entries(audit).some(([field, value]) => row[field] !== value)
      || auditOccurredAt !== approvedAt
      || row.approval_audit_event_binding_sha256 !== auditBindingSha256(row, auditOccurredAt)) {
    fail("RELEASE_ARTIFACT_AUDIT_MISMATCH", "approval audit does not exactly bind the approved artifact state");
  }
}
