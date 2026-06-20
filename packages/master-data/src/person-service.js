export function createPersonService({ repository } = {}) {
  if (!repository || typeof repository.create !== "function") throw new TypeError("Person service requires repository");

  function duplicateEmailWarnings(input = {}) {
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (!email) return [];
    return repository
      .list({ tenant_id: input.tenant_id, model_type: "Person" })
      .filter((person) => person.person_id !== input.person_id)
      .filter((person) => typeof person.email === "string" && person.email.trim().toLowerCase() === email)
      .map((person) => ({
        code: "MASTER_DATA_DUPLICATE_EMAIL_REVIEW",
        person_id: person.person_id,
        email,
      }));
  }

  return Object.freeze({
    create(input) {
      const warnings = duplicateEmailWarnings(input);
      const person = repository.create({ ...input, model_type: "Person" });
      return Object.freeze({ person, warnings: Object.freeze(warnings) });
    },
    duplicateEmailWarnings,
  });
}
