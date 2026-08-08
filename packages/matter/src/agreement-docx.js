import { createHash } from "node:crypto";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

export const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const DOCX_GENERATOR_VERSION = "amic-matter-agreement-docx/1";

const A4_WIDTH_TWIPS = 11_906;
const A4_HEIGHT_TWIPS = 16_838;
const PAGE_MARGIN_TWIPS = 1_440;
const CONTENT_WIDTH_TWIPS = A4_WIDTH_TWIPS - PAGE_MARGIN_TWIPS * 2;
const LABEL_COLUMN_TWIPS = 2_708;
const VALUE_COLUMN_TWIPS = CONTENT_WIDTH_TWIPS - LABEL_COLUMN_TWIPS;
const FIXED_ZIP_DATE = 0x0021; // 1980-01-01, the earliest DOS ZIP date.
const FIXED_ZIP_TIME = 0;
const IDENTIFIER = /^[a-z][a-z0-9_]{0,63}$/;
const TEMPLATE_VERSION = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

function requiredString(value, field, { max = 240 } = {}) {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!text) throw new TypeError(`${field} is required`);
  if (text.length > max) throw new TypeError(`${field} is too long`);
  return text;
}

function identifier(value, field) {
  const text = requiredString(value, field, { max: 64 });
  if (!IDENTIFIER.test(text)) throw new TypeError(`${field} is invalid`);
  return text;
}

function templateVersion(value) {
  const text = requiredString(value, "template_version", { max: 64 });
  if (!TEMPLATE_VERSION.test(text)) throw new TypeError("template_version is invalid");
  return text;
}

function sanitizeText(value, field, { max = 4_000 } = {}) {
  const text = requiredString(value, field, { max }).replace(/\r\n?/g, "\n");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(text)) {
    throw new TypeError(`${field} includes unsupported control characters`);
  }
  return text;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalValue(value[key])]),
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function normalizeRun(run, mergeKeys) {
  if (!run || typeof run !== "object" || Array.isArray(run)) throw new TypeError("template run is invalid");
  const variants = ["literal", "merge_field"].filter((key) => run[key] !== undefined);
  if (variants.length !== 1) throw new TypeError("template run must have exactly one content source");
  if (run.literal !== undefined) return Object.freeze({ literal: sanitizeText(run.literal, "literal", { max: 2_000 }) });
  if (run.merge_field !== undefined) {
    const key = identifier(run.merge_field, "merge_field");
    if (!mergeKeys.has(key)) throw new TypeError(`merge field is not declared: ${key}`);
    return Object.freeze({ merge_field: key });
  }
}

function normalizeRuns(runs, mergeKeys, field = "runs") {
  if (!Array.isArray(runs) || runs.length === 0) throw new TypeError(`${field} is required`);
  return Object.freeze(runs.map((run) => normalizeRun(run, mergeKeys)));
}

function normalizeContent(content, mergeKeys, signerRoleIds) {
  if (!Array.isArray(content) || content.length === 0) throw new TypeError("content is required");
  const anchorKeys = new Set();
  const normalized = content.map((block) => {
    if (!block || typeof block !== "object" || Array.isArray(block)) throw new TypeError("template content block is invalid");
    if (block.type === "paragraph") {
      const style = block.style === undefined ? "body" : requiredString(block.style, "paragraph style", { max: 32 });
      if (!["title", "heading", "body"].includes(style)) throw new TypeError("paragraph style is invalid");
      return Object.freeze({ type: "paragraph", style, runs: normalizeRuns(block.runs, mergeKeys) });
    }
    if (block.type === "table") {
      if (!Array.isArray(block.rows) || block.rows.length === 0) throw new TypeError("table rows are required");
      const columnCount = block.rows[0]?.length;
      if (![1, 2].includes(columnCount)) throw new TypeError("table must have one or two columns");
      const rows = block.rows.map((row) => {
        if (!Array.isArray(row) || row.length !== columnCount) throw new TypeError("table rows must have equal column counts");
        return Object.freeze(row.map((cell) => normalizeRuns(cell, mergeKeys, "table cell")));
      });
      return Object.freeze({ type: "table", rows: Object.freeze(rows) });
    }
    if (block.type === "signature_anchor") {
      const signerRole = identifier(block.signer_role, "signer_role");
      const anchorId = identifier(block.anchor_id, "anchor_id");
      if (!signerRoleIds.has(signerRole)) throw new TypeError(`signature anchor references unknown signer role: ${signerRole}`);
      const key = `${signerRole}:${anchorId}`;
      if (anchorKeys.has(key)) throw new TypeError(`signature anchor is duplicated: ${key}`);
      anchorKeys.add(key);
      return Object.freeze({
        type: "signature_anchor",
        signer_role: signerRole,
        anchor_id: anchorId,
        label: sanitizeText(block.label ?? "서명", "signature label", { max: 80 }),
      });
    }
    throw new TypeError(`template content type is unsupported: ${String(block.type ?? "")}`);
  });
  if (anchorKeys.size === 0) throw new TypeError("approved template requires at least one signature anchor");
  return Object.freeze(normalized);
}

export function createApprovedDocumentTemplateVersion(input = {}) {
  if (input.status !== "approved") throw new TypeError("approved template status is required");
  const tenantId = requiredString(input.tenant_id, "tenant_id", { max: 128 });
  const templateId = identifier(input.template_id, "template_id");
  const version = templateVersion(input.template_version);
  const label = sanitizeText(input.label, "label", { max: 120 });
  if (!Array.isArray(input.merge_schema) || input.merge_schema.length === 0) throw new TypeError("merge_schema is required");
  const mergeKeys = new Set();
  const mergeSchema = input.merge_schema.map((field) => {
    const key = identifier(field?.key, "merge field key");
    if (mergeKeys.has(key)) throw new TypeError(`merge field is duplicated: ${key}`);
    mergeKeys.add(key);
    const maxLength = Number(field.max_length ?? 4_000);
    if (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > 20_000) throw new TypeError(`merge field max_length is invalid: ${key}`);
    return Object.freeze({ key, required: field.required !== false, max_length: maxLength });
  });
  if (!Array.isArray(input.signer_roles) || input.signer_roles.length === 0) throw new TypeError("signer_roles is required");
  const signerRoleIds = new Set();
  const signerRoles = input.signer_roles.map((role) => {
    const roleId = identifier(role?.role_id, "signer role");
    if (signerRoleIds.has(roleId)) throw new TypeError(`signer role is duplicated: ${roleId}`);
    signerRoleIds.add(roleId);
    return Object.freeze({ role_id: roleId, required: role.required !== false });
  });
  const content = normalizeContent(input.content, mergeKeys, signerRoleIds);
  const authoritative = {
    tenant_id: tenantId,
    template_id: templateId,
    template_version: version,
    label,
    merge_schema: mergeSchema,
    signer_roles: signerRoles,
    content,
    generator_version: DOCX_GENERATOR_VERSION,
  };
  const templateHash = sha256(canonicalJson(authoritative));
  const receipt = input.approval_receipt;
  const approvalReceipt = Object.freeze({
    receipt_id: requiredString(receipt?.receipt_id, "approval_receipt.receipt_id", { max: 160 }),
    approved_by_ref: requiredString(receipt?.approved_by_ref, "approval_receipt.approved_by_ref", { max: 160 }),
    approved_at: new Date(requiredString(receipt?.approved_at, "approval_receipt.approved_at", { max: 40 })).toISOString(),
    template_hash: receipt?.template_hash ? requiredString(receipt.template_hash, "approval_receipt.template_hash", { max: 64 }) : templateHash,
  });
  if (approvalReceipt.template_hash !== templateHash) throw new TypeError("approval receipt template hash does not match approved template");
  return freezeDeep({
    model_type: "MatterDocumentTemplateVersion",
    resource_id: `${templateId}:${version}`,
    ...authoritative,
    category: "document",
    status: "approved",
    approval_receipt: approvalReceipt,
    template_hash: templateHash,
    synthetic_only: input.synthetic_only === true,
    immutable: true,
    raw_template_body_included: false,
  });
}

export function canonicalizeAgreementInput(input = {}, { requireComplete = true } = {}) {
  const template = input.template;
  if (!template || template.status !== "approved" || !template.template_hash || !template.approval_receipt) {
    throw new TypeError("approved template version and approval receipt are required");
  }
  const mergeData = {};
  const supplied = input.merge_data && typeof input.merge_data === "object" && !Array.isArray(input.merge_data)
    ? input.merge_data
    : {};
  const allowed = new Set(template.merge_schema.map((field) => field.key));
  for (const key of Object.keys(supplied)) {
    if (!allowed.has(key)) throw new TypeError(`merge field is not declared: ${key}`);
  }
  for (const field of template.merge_schema) {
    const value = supplied[field.key];
    if (value === undefined || value === null || String(value).trim() === "") {
      if (requireComplete && field.required) throw new TypeError(`merge field is required: ${field.key}`);
      continue;
    }
    mergeData[field.key] = sanitizeText(value, `merge field ${field.key}`, { max: field.max_length });
  }
  const signerRefs = Array.isArray(input.signer_role_refs) ? input.signer_role_refs : [];
  const knownRoles = new Set(template.signer_roles.map((role) => role.role_id));
  const signerRoleRefs = [];
  const seenRoles = new Set();
  for (const ref of signerRefs) {
    const roleId = identifier(ref?.role_id, "signer role");
    if (!knownRoles.has(roleId)) throw new TypeError(`signer role is not declared: ${roleId}`);
    if (seenRoles.has(roleId)) throw new TypeError(`signer role is duplicated: ${roleId}`);
    seenRoles.add(roleId);
    signerRoleRefs.push(Object.freeze({
      role_id: roleId,
      party_ref: requiredString(ref?.party_ref, "party_ref", { max: 200 }),
    }));
  }
  if (requireComplete) {
    for (const role of template.signer_roles) {
      if (role.required && !seenRoles.has(role.role_id)) throw new TypeError(`signer role is required: ${role.role_id}`);
    }
  }
  const generatedAt = new Date(requiredString(input.generated_at, "generated_at", { max: 40 })).toISOString();
  const canonical = {
    tenant_id: requiredString(input.tenant_id, "tenant_id", { max: 128 }),
    matter_id: requiredString(input.matter_id, "matter_id", { max: 128 }),
    draft_id: requiredString(input.draft_id, "draft_id", { max: 128 }),
    title: sanitizeText(input.title ?? template.label, "title", { max: 240 }),
    template_id: template.template_id,
    template_version: template.template_version,
    template_hash: template.template_hash,
    merge_data: mergeData,
    signer_role_refs: signerRoleRefs.sort((left, right) => left.role_id.localeCompare(right.role_id)),
    generated_at: generatedAt,
  };
  return freezeDeep({ ...canonical, input_hash: sha256(canonicalJson(canonical)) });
}

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function deterministicCoreProperties({ title, generatedAt, inputHash }) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>AMIC OS</dc:creator><cp:lastModifiedBy>AMIC OS</cp:lastModifiedBy><dc:subject>승인된 Matter 문서 초안</dc:subject><cp:keywords>AMIC OS;${xmlEscape(inputHash)}</cp:keywords><dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(generatedAt)}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${xmlEscape(generatedAt)}</dcterms:modified><cp:revision>1</cp:revision></cp:coreProperties>`;
}

function normalizeZipTimestamps(input) {
  const bytes = Buffer.from(input);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("generated DOCX ZIP directory is invalid");
  const entryCount = bytes.readUInt16LE(eocd + 10);
  let cursor = bytes.readUInt32LE(eocd + 16);
  for (let index = 0; index < entryCount; index += 1) {
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error("generated DOCX ZIP entry is invalid");
    bytes.writeUInt16LE(FIXED_ZIP_TIME, cursor + 12);
    bytes.writeUInt16LE(FIXED_ZIP_DATE, cursor + 14);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    if (bytes.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("generated DOCX ZIP local entry is invalid");
    bytes.writeUInt16LE(FIXED_ZIP_TIME, localOffset + 10);
    bytes.writeUInt16LE(FIXED_ZIP_DATE, localOffset + 12);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return bytes;
}

function runText(run, mergeData) {
  if (run.literal !== undefined) return run.literal;
  return mergeData[run.merge_field] ?? "";
}

function paragraphForRuns(runs, mergeData, options = {}) {
  const textRuns = runs.map((run) => new TextRun({
    text: runText(run, mergeData),
    bold: options.bold === true,
    size: options.size ?? 21,
    font: "Arial",
  }));
  return new Paragraph({
    children: textRuns,
    alignment: options.alignment,
    spacing: { before: options.before ?? 0, after: options.after ?? 160, line: 320 },
    keepNext: options.keepNext === true,
  });
}

function renderBlock(block, mergeData) {
  if (block.type === "paragraph") {
    return paragraphForRuns(block.runs, mergeData, block.style === "title"
      ? { bold: true, size: 34, alignment: AlignmentType.CENTER, before: 120, after: 420, keepNext: true }
      : block.style === "heading"
        ? { bold: true, size: 25, before: 240, after: 160, keepNext: true }
        : {});
  }
  if (block.type === "table") {
    const columnCount = block.rows[0].length;
    const widths = columnCount === 1 ? [CONTENT_WIDTH_TWIPS] : [LABEL_COLUMN_TWIPS, VALUE_COLUMN_TWIPS];
    const border = { style: BorderStyle.SINGLE, size: 2, color: "B7C3D0" };
    return new Table({
      width: { size: CONTENT_WIDTH_TWIPS, type: WidthType.DXA },
      columnWidths: widths,
      layout: TableLayoutType.FIXED,
      rows: block.rows.map((row) => new TableRow({
        cantSplit: true,
        children: row.map((cell, index) => new TableCell({
          width: { size: widths[index], type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          borders: { top: border, bottom: border, left: border, right: border },
          shading: index === 0 && columnCount === 2
            ? { type: ShadingType.CLEAR, fill: "E8EEF4", color: "auto" }
            : { type: ShadingType.CLEAR, fill: "FFFFFF", color: "auto" },
          children: [paragraphForRuns(cell, mergeData, { bold: index === 0 && columnCount === 2, after: 0 })],
        })),
      })),
    });
  }
  return new Paragraph({
    children: [
      new TextRun({ text: `${block.label}: `, bold: true, size: 21, font: "Arial" }),
      new TextRun({ text: `amic-sign:${block.signer_role}:${block.anchor_id}`, color: "FFFFFF", size: 2, font: "Arial" }),
    ],
    spacing: { before: 420, after: 260 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "44546A", space: 8 } },
  });
}

function filenameFor(title, inputHash) {
  const stem = title
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001F]/gu, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "승인문서";
  return `${stem}-${inputHash.slice(0, 12)}.docx`;
}

export async function renderAgreementDocx(input = {}) {
  const canonical = canonicalizeAgreementInput(input);
  const template = input.template;
  const hiddenMetadata = new Paragraph({
    children: [new TextRun({ text: `amic-input:${canonical.input_hash}`, vanish: true, size: 2, font: "Arial" })],
    spacing: { before: 0, after: 0 },
  });
  const document = new Document({
    creator: "AMIC OS",
    title: canonical.title,
    subject: "승인된 Matter 문서 초안",
    description: "AMIC OS Matter 문서 자동작성 결과",
    lastModifiedBy: "AMIC OS",
    revision: 1,
    styles: {
      default: {
        document: { run: { font: "Arial", size: 21 }, paragraph: { spacing: { line: 320, after: 160 } } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: A4_WIDTH_TWIPS, height: A4_HEIGHT_TWIPS },
          margin: {
            top: PAGE_MARGIN_TWIPS,
            right: PAGE_MARGIN_TWIPS,
            bottom: PAGE_MARGIN_TWIPS,
            left: PAGE_MARGIN_TWIPS,
          },
        },
      },
      children: [...template.content.map((block) => renderBlock(block, canonical.merge_data)), hiddenMetadata],
    }],
  });
  const raw = await Packer.toBuffer(document, false, [{
    path: "docProps/core.xml",
    data: deterministicCoreProperties({
      title: canonical.title,
      generatedAt: canonical.generated_at,
      inputHash: canonical.input_hash,
    }),
  }]);
  const bytes = normalizeZipTimestamps(raw);
  const anchors = template.content
    .filter((block) => block.type === "signature_anchor")
    .map((block) => Object.freeze({
      signer_role: block.signer_role,
      anchor_id: block.anchor_id,
      marker: `amic-sign:${block.signer_role}:${block.anchor_id}`,
    }));
  return Object.freeze({
    bytes,
    sha256: sha256(bytes),
    byte_size: bytes.length,
    mime_type: DOCX_MIME_TYPE,
    filename: filenameFor(canonical.title, canonical.input_hash),
    generator_version: DOCX_GENERATOR_VERSION,
    template_id: template.template_id,
    template_version: template.template_version,
    template_hash: template.template_hash,
    input_hash: canonical.input_hash,
    signature_anchors: Object.freeze(anchors),
    document_bytes_included: false,
  });
}
