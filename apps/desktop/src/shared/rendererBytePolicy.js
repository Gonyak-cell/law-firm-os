export const RENDERER_DOCUMENT_BYTE_FIELDS = Object.freeze([
  "bytes",
  "fileBytes",
  "documentBytes",
  "content",
  "blob",
  "arrayBuffer"
]);

function defaultRendererDocumentByteError(field) {
  return new Error(`Renderer-supplied document bytes are forbidden on the matter file bridge: ${field}`);
}

export function rendererDocumentByteField(request = {}) {
  if (!request || typeof request !== "object") return null;
  return RENDERER_DOCUMENT_BYTE_FIELDS.find((field) => Object.prototype.hasOwnProperty.call(request, field)) ?? null;
}

export function assertNoRendererDocumentBytes(request = {}, createError = defaultRendererDocumentByteError) {
  const field = rendererDocumentByteField(request);
  if (field) throw createError(field);
}

export function pickAllowedRequestFields(request = {}, allowedFields = []) {
  if (!request || typeof request !== "object") return {};

  const payload = {};
  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(request, field) && request[field] !== undefined) {
      payload[field] = request[field];
    }
  }
  return payload;
}
