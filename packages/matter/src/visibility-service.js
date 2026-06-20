function canViewMatter(matter, actor = {}) {
  if (matter.silent === true) return false;
  if (matter.hidden_from_actor === true) return false;
  if (!matter.required_scope) return true;
  return Array.isArray(actor.scopes) && actor.scopes.includes(matter.required_scope);
}

export function filterVisibleMatters({ matters = [], actor = {} } = {}) {
  return Object.freeze({
    matters: Object.freeze(
      matters
        .filter((matter) => canViewMatter(matter, actor))
        .map((matter) =>
          Object.freeze({
            matter_id: matter.matter_id,
            matter_number: matter.matter_number ?? null,
            title: matter.title,
            status: matter.status,
            client_id: matter.client_id ?? matter.legal_client_party_id ?? null,
          }),
        ),
    ),
    omitted_matter_count: null,
    silent_omission_enforced: true,
  });
}
