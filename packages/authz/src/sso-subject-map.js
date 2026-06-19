export const HRX_SSO_REQUIRED_CLAIMS = Object.freeze(["iss", "sub", "aud", "tenant_id"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim();
}

function stableUserId(issuer, subject) {
  return `user:${issuer.replace(/[^a-zA-Z0-9_-]/g, "_")}:${subject.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function mapHrxSsoSubjectToUser(claims = {}, config = {}) {
  for (const field of HRX_SSO_REQUIRED_CLAIMS) requiredString(claims, field);
  const issuer = requiredString(claims, "iss");
  const audience = requiredString(claims, "aud");
  if (Array.isArray(config.allowed_issuers) && !config.allowed_issuers.includes(issuer)) {
    return Object.freeze({ effect: "deny", reason: "hrx_sso_issuer_not_allowed", fail_closed: true });
  }
  if (Array.isArray(config.allowed_audiences) && !config.allowed_audiences.includes(audience)) {
    return Object.freeze({ effect: "deny", reason: "hrx_sso_audience_not_allowed", fail_closed: true });
  }
  const userId = optionalString(claims, "user_id") ?? stableUserId(issuer, requiredString(claims, "sub"));
  if (optionalString(claims, "employee_id") === userId) {
    return Object.freeze({ effect: "deny", reason: "hrx_sso_employee_user_conflation", fail_closed: true });
  }
  return Object.freeze({
    effect: "allow",
    tenant_id: requiredString(claims, "tenant_id"),
    mapped_object_type: "User",
    user_id: userId,
    external_subject: requiredString(claims, "sub"),
    issuer,
    audience,
    employee_id: null,
    employee_link_required: true,
    fail_closed: false,
  });
}
