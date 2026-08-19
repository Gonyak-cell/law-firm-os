import { auditBindingSha256 } from "./outlook-desktop-release-trust-fixture.js";

export const ARTIFACT_COLUMNS = [
  "tenant_id", "release_artifact_id", "release_ticket_id", "release_ticket_key_id",
  "platform", "channel", "app_version", "app_id", "arch", "source_sha", "source_tree",
  "embedded_build_manifest_sha256", "embedded_inner_artifact_sha256",
  "embedded_inner_artifact_bytes", "embedded_release_ticket_sha256",
  "embedded_release_ticket_signature_sha256", "final_artifact_sha256", "final_artifact_bytes",
  "approval_sha256", "trust_registry_sha256", "trust_registry_serial", "signature_algorithm",
  "macos_team_id", "macos_certificate_sha256", "macos_certificate_valid_from",
  "macos_certificate_valid_until", "macos_signature_valid", "macos_notarized",
  "macos_stapled", "macos_gatekeeper_status", "macos_technical_evidence_sha256",
  "macos_evidence_observed_at", "macos_evidence_expires_at", "windows_authenticode_status",
  "ticket_issued_at", "ticket_expires_at", "approved_at", "valid_from", "valid_until",
];

export function releaseArtifact(suffix = "1", overrides = {}) {
  return {
    tenant_id: "tenant-release-a",
    release_artifact_id: `release-artifact-${suffix}`,
    release_ticket_id: `release-ticket-${suffix}`,
    release_ticket_key_id: "release-key-2026-01",
    platform: "darwin",
    channel: "formal",
    app_version: `0.1.${26 + Number(suffix)}`,
    app_id: "com.amic.matter.desktop",
    arch: "arm64",
    source_sha: suffix.repeat(40).slice(0, 40),
    source_tree: String(Number(suffix) + 1).repeat(40).slice(0, 40),
    embedded_build_manifest_sha256: "3".repeat(63) + suffix,
    embedded_inner_artifact_sha256: "4".repeat(63) + suffix,
    embedded_inner_artifact_bytes: 52_428_800,
    embedded_release_ticket_sha256: "5".repeat(63) + suffix,
    embedded_release_ticket_signature_sha256: "6".repeat(63) + suffix,
    final_artifact_sha256: "7".repeat(63) + suffix,
    final_artifact_bytes: 62_914_560,
    approval_sha256: "8".repeat(63) + suffix,
    trust_registry_sha256: "9".repeat(63) + suffix,
    trust_registry_serial: 7,
    signature_algorithm: "Ed25519",
    macos_team_id: "ABCDE12345",
    macos_certificate_sha256: "a".repeat(63) + suffix,
    macos_certificate_valid_from: "2026-08-01T00:00:00.000Z",
    macos_certificate_valid_until: "2026-09-01T00:00:00.000Z",
    macos_signature_valid: true,
    macos_notarized: true,
    macos_stapled: true,
    macos_gatekeeper_status: "accepted",
    macos_technical_evidence_sha256: "b".repeat(63) + suffix,
    macos_evidence_observed_at: "2026-08-16T09:00:00.000Z",
    macos_evidence_expires_at: "2026-08-18T10:00:00.000Z",
    windows_authenticode_status: "not_applicable",
    ticket_issued_at: "2026-08-16T10:00:00.000Z",
    ticket_expires_at: "2026-08-18T10:00:00.000Z",
    approved_at: "2026-08-16T10:00:00.000Z",
    valid_from: "2026-08-16T10:00:00.000Z",
    valid_until: "2026-08-18T10:00:00.000Z",
    ...overrides,
  };
}

export function insertReleaseArtifact(client, value) {
  return client.query(
    `INSERT INTO lawos_email_dms.outlook_desktop_release_artifacts
       (${ARTIFACT_COLUMNS.join(", ")})
     VALUES (${ARTIFACT_COLUMNS.map((_, index) => `$${index + 1}`).join(", ")})`,
    ARTIFACT_COLUMNS.map((column) => value[column]),
  );
}

export function insertReleaseAudit(client, value) {
  return client.query(
    `INSERT INTO lawos_email_dms.outlook_desktop_release_trust_audit_events
       (tenant_id, event_id, release_artifact_id, event_type,
        release_ticket_sha256, final_artifact_sha256, approval_sha256,
        event_binding_sha256, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      value.tenant_id, value.event_id, value.release_artifact_id, value.event_type,
      value.release_ticket_sha256, value.final_artifact_sha256, value.approval_sha256,
      value.event_binding_sha256, value.occurred_at,
    ],
  );
}

export function releaseAudit(eventType = "approved", overrides = {}) {
  const artifact = releaseArtifact();
  const event = {
    tenant_id: artifact.tenant_id,
    event_id: `release-audit-${eventType}-1`,
    release_artifact_id: artifact.release_artifact_id,
    event_type: eventType,
    release_ticket_sha256: artifact.embedded_release_ticket_sha256,
    final_artifact_sha256: artifact.final_artifact_sha256,
    approval_sha256: artifact.approval_sha256,
    event_binding_sha256: null,
    occurred_at: eventType === "approved" ? artifact.approved_at : "2026-08-16T12:00:00.000Z",
    ...overrides,
  };
  if (!("event_binding_sha256" in overrides)) {
    event.event_binding_sha256 = auditBindingSha256(event);
  }
  return event;
}
