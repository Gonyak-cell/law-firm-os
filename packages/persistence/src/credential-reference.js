export const SAFE_CREDENTIAL_METADATA_FIELDS = Object.freeze([
  "credential_provider",
  "credential_status",
  "credential_rev",
]);

export const OPAQUE_CREDENTIAL_REFERENCE_FIELD = "credential_ref";

const AWS_SECRETS_MANAGER_REFERENCE_PREFIX = "aws-secrets-manager:";
const AWS_SECRET_ID = /^[A-Za-z0-9/_+=.@-]{1,512}$/u;

function normalizedFieldName(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/gu, "$1_$2")
    .replace(/[^a-z0-9]+/giu, "_")
    .replace(/^_+|_+$/gu, "")
    .toLowerCase();
}

export function isSafeCredentialMetadataField(value) {
  return SAFE_CREDENTIAL_METADATA_FIELDS.includes(
    normalizedFieldName(value),
  );
}

export function isOpaqueCredentialReference(value) {
  if (typeof value !== "string") return false;
  const reference = value.trim();
  if (
    reference.length > 512
    || !reference.startsWith(AWS_SECRETS_MANAGER_REFERENCE_PREFIX)
  ) {
    return false;
  }
  return AWS_SECRET_ID.test(
    reference.slice(AWS_SECRETS_MANAGER_REFERENCE_PREFIX.length),
  );
}

export function isSafeCredentialPersistenceField(field, value) {
  const normalized = normalizedFieldName(field);
  return isSafeCredentialMetadataField(normalized)
    || (
      normalized === OPAQUE_CREDENTIAL_REFERENCE_FIELD
      && isOpaqueCredentialReference(value)
    );
}
