import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { verifyProductionTrustedRegistry } from "../../../../scripts/lib/external-release-trust.mjs";

export const RELEASE_TRUST_NOW = Date.parse("2026-08-16T12:00:00.000Z");

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function auditBindingSha256(event) {
  const values = [
    "law-firm-os.outlook-desktop-release-audit-event.v1",
    event.tenant_id,
    event.event_id,
    event.release_artifact_id,
    event.event_type,
    event.release_ticket_sha256,
    event.final_artifact_sha256,
    event.approval_sha256,
    String(new Date(event.occurred_at).getTime()),
  ];
  const material = values.map((value) => (
    `${Buffer.byteLength(value, "utf8")}:${value}`
  )).join("");
  return sha256(material);
}

export async function releaseTrustFixture({
  artifactBytes = Buffer.from("formal macOS inner artifact bytes\n"),
  ticket: ticketOverrides = {},
  keyPair = generateKeyPairSync("ed25519"),
  registry,
  row: rowOverrides = {},
  input: inputOverrides = {},
  rows,
} = {}) {
  const ticket = {
    app_id: "com.amic.matter.desktop",
    approval_sha256: "5".repeat(64),
    arch: "arm64",
    build_manifest_sha256: "3".repeat(64),
    channel: "formal",
    entra_tenant_id: "11111111-2222-4333-8444-555555555555",
    expires_at: "2026-08-18T10:00:00.000Z",
    inner_artifact_bytes: artifactBytes.length,
    inner_artifact_sha256: sha256(artifactBytes),
    issued_at: "2026-08-16T10:00:00.000Z",
    key_id: "release-key-2026-01",
    lawos_tenant_id: "tenant_amic",
    operation: "approve-outlook-desktop-release",
    pilot_id: "amic-os-outlook",
    platform: "darwin",
    receipt_source: "law-firm-os.desktop-release",
    receipt_type: "outlook-desktop-release-ticket",
    role: "desktop-release-approver",
    schema_version: "law-firm-os.outlook-desktop-release-ticket.v1",
    source_sha: "1".repeat(40),
    source_tree: "2".repeat(40),
    ticket_id: "odrt_formal_macos_0_1_27_arm64",
    version: "0.1.27",
    ...ticketOverrides,
  };
  const ticketBytes = Buffer.from(`${JSON.stringify(ticket)}\n`);
  const signatureBytes = sign(null, ticketBytes, keyPair.privateKey);
  const ticketSha256 = sha256(ticketBytes);
  const signatureSha256 = sha256(signatureBytes);
  const registrySha256 = registry?.sha256 ?? "6".repeat(64);
  const registrySerial = registry?.registrySerial ?? 7;
  const row = {
    release_artifact_id: "odra_formal_macos_0_1_27_arm64",
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
    embedded_release_ticket_sha256: ticketSha256,
    embedded_release_ticket_signature_sha256: signatureSha256,
    final_artifact_sha256: "7".repeat(64),
    final_artifact_bytes: "62914560",
    approval_sha256: ticket.approval_sha256,
    trust_registry_sha256: registrySha256,
    trust_registry_serial: String(registrySerial),
    signature_algorithm: "Ed25519",
    macos_team_id: "ABCDE12345",
    macos_certificate_sha256: "8".repeat(64),
    macos_certificate_valid_from: "2026-08-01T00:00:00.000Z",
    macos_certificate_valid_until: "2026-09-01T00:00:00.000Z",
    macos_signature_valid: true,
    macos_notarized: true,
    macos_stapled: true,
    macos_gatekeeper_status: "accepted",
    macos_technical_evidence_sha256: "9".repeat(64),
    macos_evidence_observed_at: "2026-08-16T09:00:00.000Z",
    macos_evidence_expires_at: "2026-08-18T10:00:00.000Z",
    windows_authenticode_status: "not_applicable",
    ticket_issued_at: ticket.issued_at,
    ticket_expires_at: ticket.expires_at,
    approved_at: "2026-08-16T10:00:00.000Z",
    valid_from: "2026-08-16T10:00:00.000Z",
    valid_until: "2026-08-18T10:00:00.000Z",
    revoked_at: null,
    approval_audit_event_id: "release-audit-approved-1",
    approval_audit_event_type: "approved",
    approval_audit_tenant_id: ticket.lawos_tenant_id,
    approval_audit_release_artifact_id: "odra_formal_macos_0_1_27_arm64",
    approval_audit_release_ticket_sha256: ticketSha256,
    approval_audit_final_artifact_sha256: "7".repeat(64),
    approval_audit_approval_sha256: ticket.approval_sha256,
    approval_audit_event_binding_sha256: null,
    approval_audit_occurred_at: "2026-08-16T10:00:00.000Z",
    ...rowOverrides,
  };
  if (!("approval_audit_event_binding_sha256" in rowOverrides)
      && row.approval_audit_event_id != null) {
    row.approval_audit_event_binding_sha256 = auditBindingSha256({
      tenant_id: row.approval_audit_tenant_id,
      event_id: row.approval_audit_event_id,
      release_artifact_id: row.approval_audit_release_artifact_id,
      event_type: row.approval_audit_event_type,
      release_ticket_sha256: row.approval_audit_release_ticket_sha256,
      final_artifact_sha256: row.approval_audit_final_artifact_sha256,
      approval_sha256: row.approval_audit_approval_sha256,
      occurred_at: row.approval_audit_occurred_at,
    });
  }
  const queries = [];
  const database = {
    async query(statement, values) {
      queries.push({ statement: String(statement), values });
      return { rows: rows ?? [row] };
    },
  };
  const input = {
    app_id: ticket.app_id,
    arch: ticket.arch,
    build_manifest_sha256: ticket.build_manifest_sha256,
    channel: ticket.channel,
    entra_tenant_id: ticket.entra_tenant_id,
    platform: ticket.platform,
    signature_bytes: signatureBytes,
    source_sha: ticket.source_sha,
    source_tree: ticket.source_tree,
    tenant_id: ticket.lawos_tenant_id,
    ticket_bytes: ticketBytes,
    version: ticket.version,
    ...inputOverrides,
  };
  return {
    artifactBytes,
    database,
    input,
    keyPair,
    queries,
    registry,
    row,
    signatureBytes,
    ticket,
    ticketBytes,
  };
}

export function installRootSignedRegistry(root, item, {
  key: keyOverrides = {},
  secondsPrecision = true,
} = {}) {
  const rootKeyPair = generateKeyPairSync("ed25519");
  const time = (value) => secondsPrecision ? value.replace(".000Z", "Z") : value;
  const key = {
    key_id: item.ticket.key_id,
    algorithm: "Ed25519",
    public_key_spki_pem: item.keyPair.publicKey.export({ type: "spki", format: "pem" }),
    valid_from: time("2026-08-01T00:00:00.000Z"),
    valid_until: time("2026-09-01T00:00:00.000Z"),
    revoked_at: null,
    allowed_receipt_sources: [item.ticket.receipt_source],
    allowed_receipt_types: [item.ticket.receipt_type],
    allowed_pilot_ids: [item.ticket.pilot_id],
    allowed_lawos_tenant_ids: [item.ticket.lawos_tenant_id],
    allowed_entra_tenant_ids: [item.ticket.entra_tenant_id],
    allowed_source_shas: [item.ticket.source_sha],
    allowed_source_trees: [item.ticket.source_tree],
    allowed_versions: [item.ticket.version],
    allowed_roles: [item.ticket.role],
    allowed_operations: [item.ticket.operation],
    allowed_artifact_sha256s: [item.ticket.inner_artifact_sha256],
    allowed_binding_sha256s: [item.ticket.build_manifest_sha256],
    ...keyOverrides,
  };
  const registryValue = {
    schema_version: "law-firm-os.external-release-trust-registry.v1",
    registry_serial: 7,
    generated_at: time("2026-08-16T09:00:00.000Z"),
    keys: [key],
  };
  const registryBytes = Buffer.from(`${JSON.stringify(registryValue)}\n`);
  const registrySignature = sign(null, registryBytes, rootKeyPair.privateKey);
  const rootPublicKey = rootKeyPair.publicKey.export({ type: "spki", format: "pem" });
  mkdirSync(path.join(root, "trust"), { recursive: true });
  writeFileSync(path.join(root, "trust/root.spki.pem"), rootPublicKey);
  writeFileSync(path.join(root, "trust/registry.json"), registryBytes);
  writeFileSync(path.join(root, "trust/registry.json.sig"), registrySignature);
  const policy = {
    schema_version: "law-firm-os.external-release-trust-root-policy.v1",
    configured: true,
    installation_root: root,
    root_public_key_path: "trust/root.spki.pem",
    root_public_key_spki_sha256: sha256(rootKeyPair.publicKey.export({ type: "spki", format: "der" })),
    registry_installation_path: "trust/registry.json",
    registry_sha256: sha256(registryBytes),
    registry_signature_installation_path: "trust/registry.json.sig",
    registry_signature_sha256: sha256(registrySignature),
    registry_serial: registryValue.registry_serial,
    root_signed_registry_required: true,
    test_only: true,
  };
  return verifyProductionTrustedRegistry({ testOnlyPolicy: policy, now: RELEASE_TRUST_NOW });
}

export async function attachArtifactSnapshot(t, item, { bytes = item.artifactBytes } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "lawos-release-snapshot-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(path.join(root, "artifact.bin"), bytes, { mode: 0o600 });
  const { readOutlookDesktopReleaseArtifactSnapshot } = await import(
    "../../src/outlook-desktop-release-artifact-snapshot.js"
  );
  item.input.artifact_snapshot = readOutlookDesktopReleaseArtifactSnapshot({
    rootDir: root,
    artifactPath: "artifact.bin",
    expectedUid: process.getuid(),
    expectedGid: process.getgid(),
    expectedMode: 0o600,
  });
  return item.input.artifact_snapshot;
}
