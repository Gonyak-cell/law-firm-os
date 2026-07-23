export const DMS_SEARCH_INDEX_LIMITS = Object.freeze({
  source_bytes: 16 * 1024 * 1024,
  body_characters: 1_000_000,
  ocr_characters: 1_000_000,
});

const XML_TEXT_ENTITIES = Object.freeze({
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
});

function inputLimitError(label) {
  const error = new TypeError(`${label} exceeds the DMS search indexing limit`);
  error.safe_error_code = "DMS_SEARCH_INDEX_INPUT_TOO_LARGE";
  error.status = 413;
  return error;
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXmlEntities(value) {
  return String(value ?? "").replace(
    /&(?:amp|lt|gt|quot|apos);/g,
    (entity) => XML_TEXT_ENTITIES[entity],
  );
}

function printableText(bytes) {
  if (bytes === undefined || bytes === null) return "";
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes), "utf8");
  if (buffer.byteLength > DMS_SEARCH_INDEX_LIMITS.source_bytes) throw inputLimitError("document source bytes");
  const text = normalizeSearchText(buffer.toString("utf8"));
  if (text.length > DMS_SEARCH_INDEX_LIMITS.body_characters) throw inputLimitError("document searchable text");
  return text;
}

function ocrSidecarText(value) {
  let text;
  if (Array.isArray(value)) text = normalizeSearchText(value.join(" "));
  if (value && typeof value === "object") {
    text = Array.isArray(value.pages)
      ? normalizeSearchText(value.pages.map((page) => page?.text ?? page).join(" "))
      : normalizeSearchText(value.text);
  }
  text ??= normalizeSearchText(value);
  if (text.length > DMS_SEARCH_INDEX_LIMITS.ocr_characters) throw inputLimitError("OCR sidecar text");
  return text;
}

export function extractSearchableDocumentText({ bytes, mime_type, filename } = {}) {
  const rawText = printableText(bytes);
  const mime = String(mime_type ?? "").toLowerCase();
  const name = String(filename ?? "").toLowerCase();
  if (!rawText) {
    return Object.freeze({ text: "", extractor: "empty", character_count: 0 });
  }
  if (mime.includes("officedocument.wordprocessingml.document") || name.endsWith(".docx")) {
    const xmlRuns = [...rawText.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/g)].map((match) => decodeXmlEntities(match[1]));
    const text = normalizeSearchText(xmlRuns.length > 0 ? xmlRuns.join(" ") : rawText.replace(/<[^>]+>/g, " "));
    return Object.freeze({ text, extractor: "docx_ooxml_text", character_count: text.length });
  }
  if (mime.includes("pdf") || name.endsWith(".pdf")) {
    const text = normalizeSearchText(rawText.replace(/\\\(/g, "(").replace(/\\\)/g, ")"));
    return Object.freeze({ text, extractor: "pdf_printable_text", character_count: text.length });
  }
  return Object.freeze({ text: rawText, extractor: "plain_text", character_count: rawText.length });
}

export function extractOcrSearchableText({ mime_type, filename, ocr_text } = {}) {
  const mime = String(mime_type ?? "").toLowerCase();
  const name = String(filename ?? "").toLowerCase();
  const text = ocrSidecarText(ocr_text);
  if (!text || (!mime.includes("pdf") && !name.endsWith(".pdf"))) {
    return Object.freeze({
      text: "",
      extractor: "ocr_not_available",
      character_count: 0,
      ocr_runtime_executed: false,
      ocr_provider: null,
    });
  }
  return Object.freeze({
    text,
    extractor: "pdf_ocr_sidecar_text",
    character_count: text.length,
    ocr_runtime_executed: false,
    ocr_provider: "caller_supplied_ocr_sidecar",
  });
}

export function createSearchIndexEnvelope({ document, version, file_object, bytes, ocr_text, extracted_text_ref, privilege } = {}) {
  if (!document?.document_id) throw new TypeError("document is required");
  const versionId = version?.version_id ?? document.current_version_id;
  const extracted = extractSearchableDocumentText({
    bytes,
    mime_type: file_object?.mime_type ?? document.mime_type,
    filename: file_object?.filename ?? document.filename ?? document.title,
  });
  const ocr = extractOcrSearchableText({
    ocr_text,
    mime_type: file_object?.mime_type ?? document.mime_type,
    filename: file_object?.filename ?? document.filename ?? document.title,
  });
  const bodyIndexed = extracted.text.length > 0 || ocr.text.length > 0;
  const indexedFields = ["title", "matter_id", "version_id"];
  if (extracted.text.length > 0) indexedFields.push("body_text");
  if (ocr.text.length > 0) indexedFields.push("ocr_text");
  const searchableText = normalizeSearchText([
    document.title,
    document.document_id,
    document.matter_id,
    versionId,
    extracted.text,
    ocr.text,
  ].join(" ")).toLowerCase();
  return Object.freeze({
    model_type: "DmsSearchIndex",
    tenant_id: document.tenant_id,
    matter_id: document.matter_id,
    index_id: `idx:${document.document_id}`,
    document_id: document.document_id,
    version_id: versionId,
    title: document.title,
    extracted_text_ref: extracted_text_ref ?? (bodyIndexed ? `text:${versionId}` : null),
    ocr_result_ref: ocr.text ? `ocr:${versionId}` : null,
    privilege_label_id: privilege?.label_id ?? document.privilege_label_id ?? null,
    indexed_fields: Object.freeze(indexedFields),
    body_text_indexed: bodyIndexed,
    body_character_count: extracted.character_count,
    ocr_text_indexed: ocr.text.length > 0,
    ocr_character_count: ocr.character_count,
    ocr_runtime_executed: ocr.ocr_runtime_executed,
    ocr_provider: ocr.ocr_provider,
    indexed_at: version?.created_at ?? document.created_at ?? new Date().toISOString(),
    extractor: extracted.extractor,
    ocr_extractor: ocr.extractor,
    search_backend: "json_substring_search",
    body_searchable_text: extracted.text.toLowerCase(),
    ocr_searchable_text: ocr.text.toLowerCase(),
    searchable_text: searchableText,
    raw_text_included: false,
    storage_pointer_ref_included: false,
  });
}
