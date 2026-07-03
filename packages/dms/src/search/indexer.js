function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeXmlEntities(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function printableText(bytes) {
  if (bytes === undefined || bytes === null) return "";
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes), "utf8");
  return normalizeSearchText(buffer.toString("utf8"));
}

function ocrSidecarText(value) {
  if (Array.isArray(value)) return normalizeSearchText(value.join(" "));
  if (value && typeof value === "object") {
    if (Array.isArray(value.pages)) return normalizeSearchText(value.pages.map((page) => page?.text ?? page).join(" "));
    return normalizeSearchText(value.text);
  }
  return normalizeSearchText(value);
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
    ocr_runtime_executed: true,
    ocr_provider: "lawos_sidecar_ocr_v1",
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
    extractor: extracted.extractor,
    ocr_extractor: ocr.extractor,
    search_backend: "sqlite_fts5_ready",
    body_searchable_text: extracted.text.toLowerCase(),
    ocr_searchable_text: ocr.text.toLowerCase(),
    searchable_text: searchableText,
    raw_text_included: false,
    storage_pointer_ref_included: false,
  });
}
