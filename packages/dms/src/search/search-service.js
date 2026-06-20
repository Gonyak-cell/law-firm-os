import { filterMatterVaultSearchResults } from '../vault-permission-service.js';

export function searchMatterVault({ permission_decision_id, query, index_rows = [], allowed_document_ids = [] } = {}) {
  if (!query) throw new TypeError('query is required');
  return filterMatterVaultSearchResults({
    permission_decision_id,
    results: index_rows.filter((row) => String(row.title ?? row.document_id).toLowerCase().includes(String(query).toLowerCase())),
    allowed_document_ids,
  });
}
