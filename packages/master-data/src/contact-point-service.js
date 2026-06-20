export function createContactPointService({ repository } = {}) {
  if (!repository || typeof repository.create !== "function") throw new TypeError("ContactPoint service requires repository");

  return Object.freeze({
    create(input) {
      if (input.verified === true && input.verification_status && input.verification_status !== "verified") {
        throw new TypeError("verified ContactPoint must use verification_status=verified");
      }
      if (input.is_primary === true) {
        const duplicatePrimary = repository
          .list({ tenant_id: input.tenant_id, model_type: "ContactPoint" })
          .find(
            (contact) =>
              contact.contact_point_id !== input.contact_point_id &&
              contact.owner_entity_id === input.owner_entity_id &&
              contact.contact_type === input.contact_type &&
              contact.is_primary === true,
          );
        if (duplicatePrimary) {
          const error = new Error("Only one primary ContactPoint is allowed per owner/contact type");
          error.safe_error_code = "MASTER_DATA_CONTACT_POINT_PRIMARY_DUPLICATE";
          throw error;
        }
      }
      return repository.create({ ...input, model_type: "ContactPoint" });
    },
  });
}
