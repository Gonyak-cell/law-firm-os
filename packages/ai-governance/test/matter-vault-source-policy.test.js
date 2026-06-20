import assert from "node:assert/strict";
import test from "node:test";
import { createMatterVaultRetrievalEvidence, filterMatterVaultSourcesForAi } from "../src/index.js";

test("Matter-Vault AI source policy excludes unauthorized and un-inherited privileged sources", () => {
  const filtered = filterMatterVaultSourcesForAi({
    permission_decision_id: "decision-ai",
    visible_document_ids: ["doc-1", "doc-2"],
    candidate_sources: [
      { document_id: "doc-1", version_id: "v1", citation_ref: "c1" },
      { document_id: "doc-2", version_id: "v2", citation_ref: "c2", privileged: true },
      { document_id: "doc-3", version_id: "v3", citation_ref: "c3" },
    ],
  });
  assert.deepEqual(filtered.sources.map((source) => source.document_id), ["doc-1"]);
  const evidence = createMatterVaultRetrievalEvidence({
    retrieval_id: "retrieval-ai",
    permission_decision_id: "decision-ai",
    sources: filtered.sources,
  });
  assert.equal(evidence.document_bytes_included, false);
});
