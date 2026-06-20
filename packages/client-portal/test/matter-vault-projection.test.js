import assert from "node:assert/strict";
import test from "node:test";
import { createMatterVaultPortalProjection } from "../src/index.js";

test("Matter-Vault portal projection publishes projection-only visible document ids", () => {
  const projection = createMatterVaultPortalProjection({
    tenant_id: "tenant-mv",
    matter_id: "matter-mv",
    permission_decision_id: "decision-portal",
    source_document_ids: ["doc-visible", "doc-internal", "doc-privileged"],
    internal_memo_ids: ["doc-internal"],
    privileged_document_ids: ["doc-privileged"],
  });
  assert.deepEqual(projection.visible_document_ids, ["doc-visible"]);
  assert.equal(projection.projection_only, true);
  assert.equal(projection.document_bytes_included, false);
});
