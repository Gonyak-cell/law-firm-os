function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function createOrganizationService({ repository } = {}) {
  if (!repository || typeof repository.create !== "function") throw new TypeError("Organization service requires repository");

  return Object.freeze({
    create(input) {
      const registrationNumber = normalize(input.registration_number);
      if (registrationNumber) {
        const duplicate = repository
          .list({ tenant_id: input.tenant_id, model_type: "Organization" })
          .find(
            (organization) =>
              organization.organization_id !== input.organization_id &&
              normalize(organization.registration_number) === registrationNumber,
          );
        if (duplicate) {
          const error = new Error("Organization registration_number must be unique per tenant");
          error.safe_error_code = "MASTER_DATA_ORGANIZATION_IDENTIFIER_DUPLICATE";
          throw error;
        }
      }
      return repository.create({ ...input, model_type: "Organization" });
    },
  });
}
