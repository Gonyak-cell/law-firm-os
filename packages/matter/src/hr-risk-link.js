const BLOCKED_CLIENT_FIELDS = Object.freeze(["client_id", "client_name", "client_secret", "matter_summary"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createHrxMatterRiskLink(input = {}) {
  for (const field of BLOCKED_CLIENT_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`HR risk Matter link must not include ${field}`);
  }
  if (input.privilege_flag === true && !input.audit_ref) {
    throw new TypeError("audit_ref is required for privileged HR risk Matter link");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    link_id: requiredString(input, "link_id"),
    risk_event_id: requiredString(input, "risk_event_id"),
    matter_id: requiredString(input, "matter_id"),
    privilege_flag: input.privilege_flag === true,
    audit_ref: requiredString(input, "audit_ref"),
  });
}
