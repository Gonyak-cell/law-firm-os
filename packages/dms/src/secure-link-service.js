export function createSecureLink(input = {}) {
  if (!input.secure_link_id) throw new TypeError("secure_link_id is required");
  if (!input.expires_at) throw new TypeError("expires_at is required");
  return Object.freeze({
    model_type: "DmsSecureLink",
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    secure_link_id: input.secure_link_id,
    document_id: input.document_id,
    expires_at: input.expires_at,
    mfa_required: input.mfa_required !== false,
    watermark_required: input.watermark_required !== false,
    status: input.status ?? "active",
  });
}

export function validateSecureLinkAccess({ link, mfa_satisfied = false, now = new Date().toISOString() } = {}) {
  if (link.status !== "active") return Object.freeze({ outcome: "blocked", safe_error_code: "DMS_SECURE_LINK_INACTIVE" });
  if (new Date(now).getTime() > new Date(link.expires_at).getTime()) {
    return Object.freeze({ outcome: "blocked", safe_error_code: "DMS_SECURE_LINK_EXPIRED" });
  }
  if (link.mfa_required && !mfa_satisfied) {
    return Object.freeze({ outcome: "blocked", safe_error_code: "DMS_SECURE_LINK_MFA_REQUIRED" });
  }
  return Object.freeze({ outcome: "passed", watermark_required: link.watermark_required === true });
}
