import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const capabilityIds = ["read", "upload", "download", "attach", "work", "governance", "audit"];

function serverProjection(allowedIds = capabilityIds) {
  return {
    schema_version: "law-firm-os.vault-capability-projection.v1",
    source: "server-derived",
    authoritative: true,
    provider_state: "ready",
    tenant_binding_state: "bound",
    user_binding_state: "bound",
    authority_ref_present: true,
    denied_by_default: true,
    client_must_not_infer_from_roles: true,
    token_material_returned: false,
    raw_policy_returned: false,
    role_names_returned: false,
    capabilities: capabilityIds.map((id) => ({
      id,
      allowed: allowedIds.includes(id),
      decision: allowedIds.includes(id) ? "allow" : "deny",
      safe_reason_code: allowedIds.includes(id) ? null : "VAULT_CAPABILITY_NOT_GRANTED"
    }))
  };
}

test("Vault navigation and direct routes use only validated server capability projections", async () => {
  const server = await createServer({
    configFile: false,
    root: webRoot,
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    logLevel: "error"
  });
  try {
    const capabilitiesModule = await server.ssrLoadModule("/src/data/vaultCapabilities.js");
    const { projectVaultAuditEvent } = await server.ssrLoadModule("/src/data/apiClient.js");
    const { buildContextualNavigation } = await server.ssrLoadModule("/src/components/Shell.jsx");
    const { vaultPreviewRequest, vaultSaveAsRequest, vaultSectionAllowed } = await server.ssrLoadModule("/src/components/VaultSurface.jsx");
    const allAllowed = capabilitiesModule.normalizeVaultCapabilityProjection(serverProjection());
    const readOnly = capabilitiesModule.normalizeVaultCapabilityProjection(serverProjection(["read"]));
    const forged = capabilitiesModule.normalizeVaultCapabilityProjection({
      authoritative: true,
      capabilities: capabilityIds.map((id) => ({ id, allowed: true, decision: "allow" }))
    });

    assert.equal(capabilitiesModule.vaultCapabilityAllowed(allAllowed, "attach"), true);
    assert.equal(capabilitiesModule.vaultCapabilityAllowed(forged, "read"), false);
    assert.equal(forged.state, "unavailable");
    assert.equal(vaultSectionAllowed("vault-files", readOnly), true);
    assert.equal(vaultSectionAllowed("vault-upload", readOnly), false);
    assert.equal(vaultSectionAllowed("vault-records", readOnly), false);
    const exactDocument = {
      matter_id: "matter-001",
      document_id: "document-001",
      current_version_id: "version-007",
      current_file_object_id: "file-object-007",
      latest_sha256: "a".repeat(64),
      current_byte_size: 4096,
      current_mime_type: "application/pdf",
      filename: "contract.pdf",
    };
    assert.deepEqual(vaultSaveAsRequest(exactDocument), {
      matterId: "matter-001",
      documentId: "document-001",
      versionId: "version-007",
      fileObjectId: "file-object-007",
      sha256: "a".repeat(64),
      byteSize: 4096,
      mimeType: "application/pdf",
      suggestedName: "contract.pdf",
    });
    assert.deepEqual(vaultPreviewRequest(exactDocument), vaultSaveAsRequest(exactDocument));
    assert.equal(vaultPreviewRequest({ ...exactDocument, current_mime_type: "application/zip" }), null);
    assert.equal(vaultSaveAsRequest({
      matter_id: "matter-001",
      document_id: "document-001",
      current_version_id: "version-007",
      latest_sha256: "a".repeat(64),
    }), null);

    const safeAudit = projectVaultAuditEvent({
      event_id: "event-vault-001",
      action: "dms:document:read",
      decision: "allow",
      occurred_at: "2026-08-29T00:00:00.000Z",
      tenant_id: "tenant-must-not-reach-renderer-state",
      actor_id: "actor-must-not-reach-renderer-state",
      raw_path: "/private/vault/document.pdf",
      storage_locator: "s3://private-vault/key",
      metadata: { access_token: "secret-token", returned_count: 7 },
      before: { document_bytes: "secret-before" },
      after: { document_bytes: "secret-after" }
    });
    assert.deepEqual(safeAudit, {
      event_id: "event-vault-001",
      action: "dms:document:read",
      decision: "allow",
      occurred_at: "2026-08-29T00:00:00.000Z"
    });
    assert.equal(JSON.stringify(safeAudit).includes("secret"), false);
    assert.equal(projectVaultAuditEvent({
      event_id: "event-vault-002",
      action: "dms:document:read",
      decision: "allow",
      occurred_at: "not-an-instant"
    }), null);
    assert.equal(projectVaultAuditEvent({
      event_id: "event-vault-003",
      action: "dms:document:read",
      decision: "unknown",
      occurred_at: "2026-08-29T00:00:00.000Z"
    }), null);

    const readOnlyNavigation = buildContextualNavigation({ vaultCapabilities: readOnly }).vault;
    assert.deepEqual(readOnlyNavigation.items.map((group) => group.groupId), ["vault-documents", "vault-search"]);
    assert.deepEqual(readOnlyNavigation.items.flatMap((group) => group.children.map((item) => item.section)), [
      "vault-home",
      "vault-files",
      "vault-recent",
      "vault-favorites",
      "vault-search-all",
      "vault-search-recent",
      "vault-search-saved"
    ]);

    const unavailableNavigation = buildContextualNavigation().vault;
    assert.deepEqual(unavailableNavigation.items.map((group) => group.groupId), ["vault-documents"]);
    assert.deepEqual(unavailableNavigation.items[0].children.map((item) => item.section), ["vault-home"]);
  } finally {
    await server.close();
  }
});
