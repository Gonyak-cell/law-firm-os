function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createHrxLegalRiskWorkflow(input = {}) {
  const privilegeFlag = input.privilege_flag === true;
  if (privilegeFlag && !input.privilege_basis_ref) throw new TypeError("privilege_basis_ref is required when privilege_flag is true");
  if ((privilegeFlag || input.matter_id) && !input.audit_ref) {
    throw new TypeError("audit_ref is required for privileged legal risk or Matter link");
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    legal_risk_id: requiredString(input, "legal_risk_id"),
    risk_event_id: requiredString(input, "risk_event_id"),
    legal_owner_id: requiredString(input, "legal_owner_id"),
    privilege_flag: privilegeFlag,
    privilege_basis_ref: input.privilege_basis_ref ?? null,
    matter_id: input.matter_id ?? null,
    audit_ref: input.audit_ref ?? null,
    status: input.status ?? "review",
  });
}

export function markHrxLegalRiskPrivileged(workflow = {}, input = {}) {
  const current = createHrxLegalRiskWorkflow(workflow);
  return createHrxLegalRiskWorkflow({
    ...current,
    privilege_flag: true,
    privilege_basis_ref: requiredString(input, "privilege_basis_ref"),
    audit_ref: requiredString(input, "audit_ref"),
  });
}
