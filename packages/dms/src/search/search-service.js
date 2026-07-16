import { filterMatterVaultSearchResults } from '../vault-permission-service.js';

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function queryTerms(query) {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

function fieldText(row, field) {
  if (field === "body_text") return row.body_searchable_text ?? "";
  if (field === "ocr_text") return row.ocr_searchable_text ?? "";
  return row[field] ?? "";
}

function matchVaultSearchRow(row, query) {
  const terms = queryTerms(query);
  if (terms.length === 0) {
    return { matched: true, match_fields: [], search_rank: 0 };
  }
  const fields = ["title", "document_id", "matter_id", "version_id", "body_text", "ocr_text"];
  const matchedFields = fields.filter((field) => {
    const haystack = normalizeSearchText(fieldText(row, field));
    return terms.every((term) => haystack.includes(term));
  });
  return {
    matched: matchedFields.length > 0,
    match_fields: matchedFields,
    search_rank: matchedFields.includes("title") ? 20 : matchedFields.includes("body_text") ? 10 : 5,
  };
}

export function searchMatterVault({ permission_decision_id, query, index_rows = [], allowed_document_ids = [] } = {}) {
  if (!permission_decision_id) throw new Error("permission decision required before Matter-Vault search");
  const matches = index_rows
    .map((row) => {
      const match = matchVaultSearchRow(row, query);
      return match.matched ? { ...row, match_fields: match.match_fields, search_rank: match.search_rank } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.search_rank - a.search_rank || String(a.title ?? a.document_id).localeCompare(String(b.title ?? b.document_id)));
  return filterMatterVaultSearchResults({
    permission_decision_id,
    results: matches,
    allowed_document_ids,
  });
}
