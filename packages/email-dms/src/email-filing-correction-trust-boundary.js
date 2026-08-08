function codedError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    code,
    safe_error_code: code,
    status,
  });
}

export function correctionTrustError(code, message, status = 409) {
  return codedError(code, message, status);
}

export function assertCorrectionClaim(claim, expected) {
  if (claim !== undefined && claim !== expected) {
    throw codedError(
      "EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT",
      "correction claims conflict with persisted authority",
    );
  }
}

export function assertCorrectionAuthorityClaims(input, original, principal) {
  assertCorrectionClaim(input.tenant_id, principal.tenant_id);
  assertCorrectionClaim(input.actor_id, principal.actor_id);
  assertCorrectionClaim(input.email_thread_id, original.email_thread_id);
  assertCorrectionClaim(input.document_id, original.document_id);
  assertCorrectionClaim(input.mime_sha256, original.mime_sha256);
  assertCorrectionClaim(input.original_receipt_id, original.original_receipt_id);
  assertCorrectionClaim(input.original_actor_id, original.actor_id);
  if (input.original_filing !== undefined) {
    for (const field of [
      "tenant_id", "email_thread_id", "document_id", "mime_sha256",
      "original_receipt_id", "matter_id", "actor_id", "occurred_at",
    ]) {
      assertCorrectionClaim(input.original_filing?.[field], original[field]);
    }
  }
}

export async function resolveCorrectionPrincipal(resolvePrincipal, session) {
  let value;
  try {
    value = await resolvePrincipal({ session });
  } catch {
    value = null;
  }
  if (
    typeof value?.tenant_id !== "string"
    || value.tenant_id.trim() === ""
    || typeof value?.actor_id !== "string"
    || value.actor_id.trim() === ""
  ) {
    throw codedError(
      "EMAIL_FILING_CORRECTION_PRINCIPAL_DENIED",
      "authenticated principal is required",
      403,
    );
  }
  return Object.freeze({
    tenant_id: value.tenant_id.trim(),
    actor_id: value.actor_id.trim(),
  });
}

export async function requireCorrectionMatterAuthorization(authorizeMatter, request) {
  let allowed = false;
  try {
    allowed = await authorizeMatter(request);
  } catch {
    allowed = false;
  }
  if (allowed !== true) {
    throw codedError(
      "EMAIL_FILING_CORRECTION_ACTOR_DENIED",
      "actor is not allowed to access this filing",
      403,
    );
  }
}
