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
import { canonicalizeAgreementInput } from "./agreement-input.js";
import {
  DOCX_GENERATOR_VERSION,
  DOCX_MIME_TYPE,
  hashValue,
} from "./document-builder-values.js";
import { parseApprovedDocumentTemplateVersion } from "./document-template-authority.js";

const PAGE = Object.freeze({ width: 11_906, height: 16_838, margin: 1_440 });
const CONTENT_WIDTH = PAGE.width - PAGE.margin * 2;
const FIXED_ZIP_DATE = 0x0021;

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function coreProperties({ title, generatedAt, inputHash }) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>AMIC OS</dc:creator><cp:lastModifiedBy>AMIC OS</cp:lastModifiedBy><dc:subject>승인된 Matter 문서 초안</dc:subject><cp:keywords>AMIC OS;${xmlEscape(inputHash)}</cp:keywords><dcterms:created xsi:type="dcterms:W3CDTF">${xmlEscape(generatedAt)}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${xmlEscape(generatedAt)}</dcterms:modified><cp:revision>1</cp:revision></cp:coreProperties>`;
}

function normalizeZipTimestamps(input) {
  const bytes = Buffer.from(input);
  let eocd = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65_557); offset -= 1) {
    if (bytes.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  }
  if (eocd < 0) throw new Error("generated DOCX ZIP directory is invalid");
  const count = bytes.readUInt16LE(eocd + 10);
  let cursor = bytes.readUInt32LE(eocd + 16);
  for (let index = 0; index < count; index += 1) {
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error("generated DOCX ZIP entry is invalid");
    bytes.writeUInt16LE(0, cursor + 12);
    bytes.writeUInt16LE(FIXED_ZIP_DATE, cursor + 14);
    const local = bytes.readUInt32LE(cursor + 42);
    if (bytes.readUInt32LE(local) !== 0x04034b50) throw new Error("generated DOCX ZIP local entry is invalid");
    bytes.writeUInt16LE(0, local + 10);
    bytes.writeUInt16LE(FIXED_ZIP_DATE, local + 12);
    cursor += 46 + bytes.readUInt16LE(cursor + 28) + bytes.readUInt16LE(cursor + 30) + bytes.readUInt16LE(cursor + 32);
  }
  return bytes;
}

function paragraph(runs, mergeData, options = {}) {
  return new Paragraph({
    children: runs.map((run) => new TextRun({
      text: run.literal ?? mergeData[run.merge_field] ?? "",
      bold: options.bold === true,
      size: options.size ?? 21,
      font: "Arial",
    })),
    alignment: options.alignment,
    spacing: { before: options.before ?? 0, after: options.after ?? 160, line: 320 },
    keepNext: options.keepNext === true,
  });
}

function renderBlock(block, mergeData) {
  if (block.type === "paragraph") {
    const options = block.style === "title"
      ? { bold: true, size: 34, alignment: AlignmentType.CENTER, before: 120, after: 420, keepNext: true }
      : block.style === "heading"
        ? { bold: true, size: 25, before: 240, after: 160, keepNext: true }
        : {};
    return paragraph(block.runs, mergeData, options);
  }
  if (block.type === "table") {
    const count = block.rows[0].length;
    const widths = count === 1 ? [CONTENT_WIDTH] : [2_708, CONTENT_WIDTH - 2_708];
    const border = { style: BorderStyle.SINGLE, size: 2, color: "B7C3D0" };
    return new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: widths,
      layout: TableLayoutType.FIXED,
      rows: block.rows.map((row) => new TableRow({
        cantSplit: true,
        children: row.map((cell, index) => new TableCell({
          width: { size: widths[index], type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          borders: { top: border, bottom: border, left: border, right: border },
          shading: { type: ShadingType.CLEAR, fill: index === 0 && count === 2 ? "E8EEF4" : "FFFFFF", color: "auto" },
          children: [paragraph(cell, mergeData, { bold: index === 0 && count === 2, after: 0 })],
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
  const stem = title.normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001F]/gu, "_")
    .replace(/\s+/g, " ").trim().slice(0, 80) || "승인문서";
  return `${stem}-${inputHash.slice(0, 12)}.docx`;
}

export async function renderAgreementDocx(input = {}) {
  const template = parseApprovedDocumentTemplateVersion(input.template, { persisted: true });
  const canonical = canonicalizeAgreementInput({ ...input, template });
  const hidden = new Paragraph({
    children: [new TextRun({ text: `amic-input:${canonical.input_hash}`, vanish: true, size: 2, font: "Arial" })],
    spacing: { before: 0, after: 0 },
  });
  const document = new Document({
    creator: "AMIC OS", title: canonical.title, subject: "승인된 Matter 문서 초안",
    description: "AMIC OS Matter 문서 자동작성 결과", lastModifiedBy: "AMIC OS", revision: 1,
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 21 },
          paragraph: { spacing: { line: 320, after: 160 } },
        },
      },
    },
    sections: [{
      properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: { top: PAGE.margin, right: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin } } },
      children: [...template.content.map((block) => renderBlock(block, canonical.merge_data)), hidden],
    }],
  });
  const raw = await Packer.toBuffer(document, false, [{
    path: "docProps/core.xml",
    data: coreProperties({ title: canonical.title, generatedAt: canonical.generated_at, inputHash: canonical.input_hash }),
  }]);
  const bytes = normalizeZipTimestamps(raw);
  return Object.freeze({
    bytes,
    contains_document_bytes: true,
    sha256: hashValue(bytes),
    byte_size: bytes.length,
    mime_type: DOCX_MIME_TYPE,
    filename: filenameFor(canonical.title, canonical.input_hash),
    generator_version: DOCX_GENERATOR_VERSION,
    template_id: template.template_id,
    template_version: template.template_version,
    template_hash: template.template_hash,
    input_hash: canonical.input_hash,
    signature_anchors: Object.freeze(template.content.filter((block) => block.type === "signature_anchor").map((block) => Object.freeze({
      signer_role: block.signer_role,
      anchor_id: block.anchor_id,
      marker: `amic-sign:${block.signer_role}:${block.anchor_id}`,
    }))),
  });
}
