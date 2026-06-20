import assert from "node:assert/strict";
import test from "node:test";
import { createMatterVaultPermissionEnvelope, filterMatterVaultSearchResults } from "../src/index.js";

test("Matter-Vault permission envelope and search guard require permission before search", () => {
  const envelope = createMatterVaultPermissionEnvelope({
    tenant_id: "tenant-mv",
    matter_id: "matter-mv",
    vault_workspace_id: "workspace-mv",
    actor_id: "user-mv",
    permission_decision_id: "decision-mv",
  });
  assert.equal(envelope.inherited_from_matter, true);
  assert.throws(() => filterMatterVaultSearchResults({ results: [] }), /permission decision/);
  const filtered = filterMatterVaultSearchResults({
    permission_decision_id: envelope.permission_decision_id,
    allowed_document_ids: ["doc-allowed"],
    results: [{ document_id: "doc-allowed" }, { document_id: "doc-denied" }],
  });
  assert.deepEqual(filtered.results.map((result) => result.document_id), ["doc-allowed"]);
  assert.equal(filtered.omitted_result_count, null);
});
