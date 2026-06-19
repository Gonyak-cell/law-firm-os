export const SCIM_OPERATIONS = Object.freeze(["create", "update", "deprovision"]);

export function createScimDirectoryDescriptor(input = {}) {
  return Object.freeze({
    descriptor: "EnterpriseScimDirectoryDescriptor",
    tenant_scope_required: true,
    supported_operations: Object.freeze([...(input.supported_operations ?? SCIM_OPERATIONS)]),
    deprovision_disables_access: input.deprovision_disables_access ?? true,
    group_mapping_descriptor_only: true,
    dispatches_scim_runtime: false,
    consumes_scim_payload: false,
    stores_scim_token: false,
    exposes_scim_payload: false,
    exposes_secret_material: false,
    writes_product_state: false,
    customer_safe_errors_only: true,
    descriptor_only: true,
  });
}

export function validateScimDirectoryDescriptor(descriptor = createScimDirectoryDescriptor()) {
  const errors = [];
  if (descriptor.descriptor !== "EnterpriseScimDirectoryDescriptor") errors.push("SCIM descriptor type drift");
  if (descriptor.tenant_scope_required !== true) errors.push("SCIM tenant scope must be required");
  if (descriptor.deprovision_disables_access !== true) errors.push("SCIM deprovision must disable access");
  if (!Array.isArray(descriptor.supported_operations)) errors.push("SCIM operations must be an array");
  for (const operation of SCIM_OPERATIONS) {
    if (!descriptor.supported_operations?.includes(operation)) errors.push(`SCIM descriptor missing ${operation}`);
  }
  for (const flag of ["dispatches_scim_runtime", "consumes_scim_payload", "stores_scim_token", "exposes_scim_payload", "exposes_secret_material", "writes_product_state"]) {
    if (descriptor[flag] !== false) errors.push(`${flag} must remain false`);
  }
  if (descriptor.group_mapping_descriptor_only !== true) errors.push("SCIM group mapping must stay descriptor-only");
  if (descriptor.customer_safe_errors_only !== true) errors.push("SCIM errors must stay customer-safe");
  if (descriptor.descriptor_only !== true) errors.push("SCIM descriptor must remain descriptor-only");
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor });
}
