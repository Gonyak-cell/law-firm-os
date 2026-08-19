import { generateKeyPairSync, sign } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { verifyProductionTrustedRegistry } from "../../../../scripts/lib/external-release-trust.mjs";
import {
  ACTIVATION_NOW,
  canonicalBytes,
  hash,
  publicKeySpki,
} from "./outlook-desktop-activation-crypto-fixture.js";

function registryKey({
  approvedRelease,
  keyId,
  operation,
  pair,
  pilotId,
  pilotPolicy,
  principal,
  receiptSource,
  receiptType,
  role,
  signerScope,
}) {
  return {
    algorithm: "Ed25519",
    allowed_artifact_sha256s: [role === "desktop-release-approver"
      ? approvedRelease.measured_inner_artifact_sha256
      : approvedRelease.registered_final_artifact_sha256],
    allowed_binding_sha256s: [approvedRelease.embedded_build_manifest_sha256],
    allowed_entra_tenant_ids: [principal.entra_tenant_id],
    allowed_lawos_tenant_ids: [principal.lawos_tenant_id],
    allowed_operations: [operation],
    allowed_pilot_ids: [pilotId],
    allowed_receipt_sources: [receiptSource],
    allowed_receipt_types: [receiptType],
    allowed_roles: [role],
    allowed_source_shas: [approvedRelease.source_sha],
    allowed_source_trees: [approvedRelease.source_tree],
    allowed_versions: [approvedRelease.app_version],
    key_id: keyId,
    public_key_spki_pem: pair.publicKey.export({ type: "spki", format: "pem" }),
    revoked_at: null,
    valid_from: "2026-08-01T00:00:00.000Z",
    valid_until: "2026-09-01T00:00:00.000Z",
    ...(signerScope ? {
      allowed_activation_modes: ["operator_controlled_macos_v1"],
      allowed_activation_operator_scopes: [signerScope],
      allowed_entra_subjects: [principal.entra_subject],
      allowed_lawos_user_ids: [principal.lawos_user_id],
      allowed_owner_principal_ids: [pilotPolicy.owner_principal_id],
      allowed_policy_revisions: [pilotPolicy.policy_revision],
      allowed_release_artifact_ids: [approvedRelease.release_artifact_id],
      allowed_release_ticket_ids: [approvedRelease.release_ticket_id],
      allowed_release_ticket_sha256s: [approvedRelease.release_ticket_sha256],
      allowed_release_ticket_signature_sha256s: [
        approvedRelease.release_ticket_signature_sha256,
      ],
      allowed_roster_sha256s: [pilotPolicy.roster_sha256],
    } : {}),
  };
}

export function installActivationRegistry(t, {
  approvedRelease,
  keys,
  mutateRegistry,
  pilotPolicy,
  principal,
}) {
  const root = mkdtempSync(path.join(tmpdir(), "lawos-activation-registry-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const trustDir = path.join(root, "trust");
  mkdirSync(trustDir);
  const rootPair = generateKeyPairSync("ed25519");
  const registry = {
    generated_at: "2026-08-16T11:00:00.000Z",
    keys: [
      registryKey({
        approvedRelease,
        keyId: "release-key-2026-01",
        operation: "approve-outlook-desktop-release",
        pair: keys.release,
        pilotId: "amic-os-outlook",
        pilotPolicy,
        principal,
        receiptSource: "law-firm-os.desktop-release",
        receiptType: "outlook-desktop-release-ticket",
        role: "desktop-release-approver",
      }),
      registryKey({
        approvedRelease,
        keyId: "activation-operator-key-2026-01",
        operation: "authorize-outlook-desktop-activation",
        pair: keys.operator,
        pilotId: pilotPolicy.pilot_id,
        pilotPolicy,
        principal,
        receiptSource: "law-firm-os.outlook-desktop-activation",
        receiptType: "outlook-desktop-operator-activation",
        role: "outlook-desktop-activation-operator",
        signerScope: "operator_controlled_macos_v1:jwsuh_canary",
      }),
    ],
    registry_serial: 15,
    schema_version: "law-firm-os.external-release-trust-registry.v1",
  };
  mutateRegistry?.(registry);
  const registryBytes = canonicalBytes(registry);
  const registrySignature = sign(null, registryBytes, rootPair.privateKey);
  writeFileSync(path.join(trustDir, "root.spki.pem"), rootPair.publicKey.export({
    type: "spki",
    format: "pem",
  }));
  writeFileSync(path.join(trustDir, "registry.json"), registryBytes);
  writeFileSync(path.join(trustDir, "registry.json.sig"), registrySignature);
  return verifyProductionTrustedRegistry({
    now: ACTIVATION_NOW,
    testOnlyPolicy: {
      configured: true,
      installation_root: root,
      registry_installation_path: "trust/registry.json",
      registry_serial: registry.registry_serial,
      registry_sha256: hash(registryBytes),
      registry_signature_installation_path: "trust/registry.json.sig",
      registry_signature_sha256: hash(registrySignature),
      root_public_key_path: "trust/root.spki.pem",
      root_public_key_spki_sha256: hash(publicKeySpki(rootPair)),
      root_signed_registry_required: true,
      schema_version: "law-firm-os.external-release-trust-root-policy.v1",
      test_only: true,
    },
  });
}
