export const DMS_DOCUMENT_ID_MAX_LENGTH = 512;

export function parseExactDmsDocumentId(value, field = "document_id") {
  if (
    typeof value !== "string"
    || value.length === 0
    || value.length > DMS_DOCUMENT_ID_MAX_LENGTH
    || value !== value.trim()
    || /\p{Cc}/u.test(value)
  ) {
    throw new TypeError(`${field} is invalid`);
  }
  return value;
}

export function parseExactDmsDocumentIdSingleton(values, field = "filed_document_ids") {
  if (!Array.isArray(values) || values.length !== 1) {
    throw new TypeError(`${field} must contain exactly one document ID`);
  }
  return Object.freeze([parseExactDmsDocumentId(values[0], `${field}[0]`)]);
}
