import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import * as packageTrust from "@law-firm-os/runtime-auth/external-release-trust";

export const now = Date.parse("2026-08-17T00:00:00Z");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function writeBytes(root, relativePath, bytes) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  return Object.freeze({ path: target, sha256: sha256(bytes) });
}

export function syntheticTrustFixture(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "lawos-shared-trust-unit-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const rootKeyPair = generateKeyPairSync("ed25519");
  const leafKeyPair = generateKeyPairSync("ed25519");
  const scope = Object.freeze({
    receipt_type: "unit_receipt",
    receipt_source: "unit_test",
    pilot_id: "unit-pilot",
    lawos_tenant_id: "lawos-unit",
    entra_tenant_id: "11111111-1111-4111-8111-111111111111",
    source_sha: "1".repeat(40),
    source_tree: "2".repeat(40),
    version: "1.0.0",
    role: "unit_role",
    operation: "unit_operation",
    artifact_sha256: "3".repeat(64),
    binding_sha256: "4".repeat(64),
  });
  const registry = {
    schema_version: packageTrust.TRUST_REGISTRY_SCHEMA_VERSION,
    registry_serial: 7,
    generated_at: "2026-08-16T00:00:00Z",
    keys: [{
      key_id: "unit-leaf-001",
      algorithm: "Ed25519",
      public_key_spki_pem: leafKeyPair.publicKey.export({ type: "spki", format: "pem" }),
      valid_from: "2026-01-01T00:00:00Z",
      valid_until: "2027-01-01T00:00:00Z",
      revoked_at: null,
      allowed_receipt_sources: [scope.receipt_source],
      allowed_receipt_types: [scope.receipt_type],
      allowed_pilot_ids: [scope.pilot_id],
      allowed_lawos_tenant_ids: [scope.lawos_tenant_id],
      allowed_entra_tenant_ids: [scope.entra_tenant_id],
      allowed_source_shas: [scope.source_sha],
      allowed_source_trees: [scope.source_tree],
      allowed_versions: [scope.version],
      allowed_roles: [scope.role],
      allowed_operations: [scope.operation],
      allowed_artifact_sha256s: [scope.artifact_sha256],
      allowed_binding_sha256s: [scope.binding_sha256],
    }],
  };
  const registryBytes = Buffer.from(`${JSON.stringify(registry)}\n`, "utf8");
  const rootPublicKeyBytes = rootKeyPair.publicKey.export({ type: "spki", format: "pem" });
  const rootPublicKeyRef = writeBytes(root, "config/external-release/root-public-key.spki.pem", rootPublicKeyBytes);
  const registryRef = writeBytes(root, "config/external-release/trust-registry.json", registryBytes);
  const registrySignatureBytes = sign(null, registryBytes, rootKeyPair.privateKey);
  const registrySignatureRef = writeBytes(root, "config/external-release/trust-registry.json.sig", registrySignatureBytes);
  const testOnlyPolicy = Object.freeze({
    schema_version: packageTrust.TRUST_ROOT_POLICY_SCHEMA_VERSION,
    configured: true,
    installation_root: path.join(root, "config/external-release"),
    root_public_key_path: rootPublicKeyRef.path,
    root_public_key_spki_sha256: sha256(rootKeyPair.publicKey.export({ type: "spki", format: "der" })),
    registry_installation_path: registryRef.path,
    registry_sha256: registryRef.sha256,
    registry_signature_installation_path: registrySignatureRef.path,
    registry_signature_sha256: registrySignatureRef.sha256,
    registry_serial: registry.registry_serial,
    root_signed_registry_required: true,
    test_only: true,
  });
  return Object.freeze({ root, leafKeyPair, scope, testOnlyPolicy });
}
