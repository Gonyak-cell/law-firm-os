import {
  docusignFailure,
  docusignRequiredSha256,
  docusignRequiredText,
  normalizeDocusignAnchors,
  normalizeDocusignDocument,
  normalizeDocusignRecipient,
} from "./docusign-envelope-model.js";

export function normalizeDocusignAuthorityBinding(input = {}) {
  return Object.freeze({
    tenant_id: docusignRequiredText(input.tenant_id, "authority_binding.tenant_id"),
    matter_id: docusignRequiredText(input.matter_id, "authority_binding.matter_id"),
    workspace_id: docusignRequiredText(input.workspace_id, "authority_binding.workspace_id"),
    artifact_id: docusignRequiredText(input.artifact_id, "authority_binding.artifact_id"),
    document_id: docusignRequiredText(input.document_id, "authority_binding.document_id"),
    version_id: docusignRequiredText(input.version_id, "authority_binding.version_id"),
    sha256: docusignRequiredSha256(input.sha256, "authority_binding.sha256"),
    approval_receipt_ref: docusignRequiredText(input.approval_receipt_ref, "authority_binding.approval_receipt_ref"),
  });
}

export function bindApprovedDocusignSource({ binding, source } = {}) {
  const authority = normalizeDocusignAuthorityBinding(binding);
  const document = normalizeDocusignDocument(source?.document);
  const compared = {
    artifact_id: document.artifact_id,
    document_id: document.document_id,
    version_id: document.version_id,
    sha256: document.sha256,
    workspace_id: document.workspace_id,
    approval_receipt_ref: document.approval_receipt_ref,
  };
  for (const [field, actual] of Object.entries(compared)) {
    if (actual !== authority[field]) {
      throw docusignFailure("DOCUSIGN_APPROVED_SOURCE_MISMATCH", "Approved document authority did not match", 409);
    }
  }
  const sourceAuthority = normalizeDocusignAuthorityBinding(source?.authority);
  for (const field of ["tenant_id", "matter_id", "workspace_id", "artifact_id", "document_id", "version_id", "sha256", "approval_receipt_ref"]) {
    if (sourceAuthority[field] !== authority[field]) {
      throw docusignFailure("DOCUSIGN_APPROVED_SOURCE_MISMATCH", "Approved source authority did not match", 409);
    }
  }
  const recipients = Object.freeze((source?.recipients ?? []).map(normalizeDocusignRecipient));
  if (recipients.length === 0) throw new TypeError("recipients are required");
  const roles = new Set(recipients.map((recipient) => recipient.role));
  if (roles.size !== recipients.length) throw new TypeError("recipient roles must be unique");
  const anchorManifest = normalizeDocusignAnchors(source?.anchor_manifest);
  for (const role of roles) {
    if (!anchorManifest.anchors.some((anchor) => anchor.role === role)) throw new TypeError(`signature anchor is required for role ${role}`);
  }
  return Object.freeze({ authority, document, recipients, anchor_manifest: anchorManifest });
}
