export function filterMatterVaultSourcesForAi({ permission_decision_id, candidate_sources = [], visible_document_ids = [] } = {}) {
  if (!permission_decision_id) throw new Error("permission decision required before AI retrieval");
  const visible = new Set(visible_document_ids);
  const sources = candidate_sources
    .filter((source) => visible.has(source.document_id))
    .filter((source) => source.privileged !== true || source.privilege_label_inherited === true)
    .map((source) => Object.freeze({
      document_id: source.document_id,
      version_id: source.version_id,
      citation_ref: source.citation_ref,
      raw_text_included: false,
    }));
  return Object.freeze({
    sources: Object.freeze(sources),
    unauthorized_source_excluded: true,
    privileged_source_guarded: true,
    count_leak_prevented: true,
  });
}
