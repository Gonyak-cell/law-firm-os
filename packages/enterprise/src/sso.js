export const SSO_PROTOCOLS = Object.freeze(["OIDC", "SAML"]);
export const MFA_FACTORS = Object.freeze(["totp", "webauthn", "recovery_code"]);

export function createSsoConnectionDescriptor(input = {}) {
  return Object.freeze({
    descriptor: "EnterpriseSsoConnectionDescriptor",
    tenant_scope_required: true,
    supported_protocols: Object.freeze([...(input.supported_protocols ?? SSO_PROTOCOLS)]),
    mfa_factors: Object.freeze([...(input.mfa_factors ?? MFA_FACTORS)]),
    admin_strong_auth_required: input.admin_strong_auth_required ?? true,
    jit_provisioning_runtime_opened: false,
    dispatches_sso_runtime: false,
    consumes_sso_assertion: false,
    stores_idp_secret: false,
    exposes_sso_assertion: false,
    exposes_secret_material: false,
    customer_safe_errors_only: true,
    descriptor_only: true,
  });
}

export function validateSsoConnectionDescriptor(descriptor = createSsoConnectionDescriptor()) {
  const errors = [];
  if (descriptor.descriptor !== "EnterpriseSsoConnectionDescriptor") errors.push("SSO descriptor type drift");
  if (descriptor.tenant_scope_required !== true) errors.push("SSO tenant scope must be required");
  if (descriptor.admin_strong_auth_required !== true) errors.push("admin actions must require strong auth");
  if (!Array.isArray(descriptor.supported_protocols) || !descriptor.supported_protocols.includes("OIDC") || !descriptor.supported_protocols.includes("SAML")) {
    errors.push("SSO descriptor must cover OIDC and SAML");
  }
  if (!Array.isArray(descriptor.mfa_factors) || descriptor.mfa_factors.length < 2) errors.push("MFA descriptor must include at least two factors");
  for (const flag of ["jit_provisioning_runtime_opened", "dispatches_sso_runtime", "consumes_sso_assertion", "stores_idp_secret", "exposes_sso_assertion", "exposes_secret_material"]) {
    if (descriptor[flag] !== false) errors.push(`${flag} must remain false`);
  }
  if (descriptor.customer_safe_errors_only !== true) errors.push("SSO errors must stay customer-safe");
  if (descriptor.descriptor_only !== true) errors.push("SSO descriptor must remain descriptor-only");
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), descriptor });
}
