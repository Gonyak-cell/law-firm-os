export function createRagEvidenceLedger(input = {}) {
  if (!input.ledger_id) throw new TypeError("ledger_id is required");
  const sources = Object.freeze(
    (input.sources ?? []).map((source) => {
      if (!source.document_id || !source.version_id || !source.citation_id) {
        throw new Error("RAG evidence source requires document_id, version_id, and citation_id");
      }
      return Object.freeze({
        document_id: source.document_id,
        version_id: source.version_id,
        citation_id: source.citation_id,
        permission_decision_id: source.permission_decision_id ?? null,
      });
    }),
  );
  return Object.freeze({
    model_type: "DmsRagEvidence",
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    ledger_id: input.ledger_id,
    sources,
    citation_source_validation: true,
  });
}
