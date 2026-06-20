export function filterSearchResultsByAcl({ results = [], principal = {}, object_acl = [] } = {}) {
  const allowed = [];
  for (const result of results) {
    const denied = object_acl.some(
      (entry) => entry.effect === "deny" && entry.principal_id === principal.user_id && entry.resource_id === result.document_id,
    );
    const allowedByAcl = object_acl.some(
      (entry) => entry.effect === "allow" && entry.principal_id === principal.user_id && entry.resource_id === result.document_id,
    );
    if (!denied && (allowedByAcl || principal.role_ids?.includes("dms_reader"))) allowed.push(result);
  }
  return Object.freeze({
    results: Object.freeze(allowed),
    omitted_result_count: null,
    count_leak_prevented: true,
  });
}
