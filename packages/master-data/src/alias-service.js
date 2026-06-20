function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function createPartyAliasService({ repository } = {}) {
  if (!repository || typeof repository.create !== "function") throw new TypeError("Party alias service requires repository");

  return Object.freeze({
    create(input) {
      return repository.create({ ...input, model_type: "PartyAlias" });
    },
    search({ tenant_id, query, locale, alias_type } = {}) {
      const needle = normalize(query);
      return Object.freeze(
        repository
          .list({ tenant_id, model_type: "PartyAlias" })
          .filter((alias) => !locale || alias.locale === locale)
          .filter((alias) => !alias_type || alias.alias_type === alias_type)
          .filter((alias) => normalize(alias.alias_value).includes(needle) || normalize(alias.normalized_alias_key).includes(needle)),
      );
    },
  });
}
