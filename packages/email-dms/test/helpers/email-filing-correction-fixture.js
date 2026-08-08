export const TENANT_ID = "tenant-outm20";
export const THREAD_ID = "email-thread-outm20";
export const DOCUMENT_ID = "doc:email-thread-outm20:original-mime";
export const MIME_SHA256 = "a".repeat(64);
export const RECEIPT_ID = "receipt-outm20";
export const MATTER_A = "matter-a";
export const MATTER_B = "matter-b";
export const MATTER_C = "matter-c";

export function originalFiling(overrides = {}) {
  return Object.freeze({
    tenant_id: TENANT_ID,
    email_thread_id: THREAD_ID,
    document_id: DOCUMENT_ID,
    mime_sha256: MIME_SHA256,
    original_receipt_id: RECEIPT_ID,
    matter_id: MATTER_A,
    actor_id: "user-original-filer",
    occurred_at: "2026-08-08T01:00:00.000Z",
    ...overrides,
  });
}

export function correctionInput(overrides = {}) {
  return {
    original_filing: originalFiling(),
    tenant_id: TENANT_ID,
    email_thread_id: THREAD_ID,
    document_id: DOCUMENT_ID,
    mime_sha256: MIME_SHA256,
    original_receipt_id: RECEIPT_ID,
    source_matter_id: MATTER_A,
    target_matter_id: MATTER_B,
    reason: "담당 Matter 정정",
    actor_id: "user-corrector",
    idempotency_key: "outm20-correction-a-to-b",
    prior_placement_id: null,
    ...overrides,
  };
}
