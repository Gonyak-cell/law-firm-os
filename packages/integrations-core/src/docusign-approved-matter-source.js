export const DOCUSIGN_APPROVED_DOCUMENT_AUTHORITY_BLOCKED = "DOCUSIGN_APPROVED_DOCUMENT_AUTHORITY_BLOCKED";

export function createApprovedMatterBuilderSourceResolver() {
  return async function resolveApprovedMatterBuilderSource() {
    throw Object.assign(
      new Error("Approved Matter document authority is awaiting its corrected contract"),
      {
        safe_error_code: DOCUSIGN_APPROVED_DOCUMENT_AUTHORITY_BLOCKED,
        status: 503,
        retryable: false,
      },
    );
  };
}
