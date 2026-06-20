export function createMatterVaultRetrievalEvidence(input = {}) {
  if (!input.retrieval_id || !input.permission_decision_id || !Array.isArray(input.sources)) {
    throw new TypeError("retrieval_id, permission_decision_id, and sources are required");
  }
  return Object.freeze({
    retrieval_id: input.retrieval_id,
    permission_decision_id: input.permission_decision_id,
    sources: Object.freeze(input.sources.map((source) => Object.freeze({
      document_id: source.document_id,
      version_id: source.version_id,
      citation_ref: source.citation_ref,
    }))),
    raw_prompt_included: false,
    document_bytes_included: false,
  });
}
