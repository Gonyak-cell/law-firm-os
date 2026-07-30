function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cellReference(columnIndex, rowIndex) {
  let value = columnIndex + 1;
  let column = "";
  while (value > 0) {
    value -= 1;
    column = String.fromCharCode(65 + (value % 26)) + column;
    value = Math.floor(value / 26);
  }
  return `${column}${rowIndex + 1}`;
}

function worksheetXml(headers, rows) {
  const values = [headers, ...rows];
  const sheetRows = values.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const reference = cellReference(columnIndex, rowIndex);
      if (typeof value === "number" && Number.isFinite(value)) {
        return `<c r="${reference}"${rowIndex === 0 ? ' s="1"' : ""} t="n"><v>${value}</v></c>`;
      }
      return `<c r="${reference}"${rowIndex === 0 ? ' s="1"' : ""} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const widthColumns = headers.map((header, index) => {
    const width = Math.min(36, Math.max(12, String(header).length * 2 + 2, ...rows.map((row) => String(row[index] ?? "").length + 2)));
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${widthColumns}</cols><sheetData>${sheetRows}</sheetData><autoFilter ref="A1:${cellReference(headers.length - 1, Math.max(0, rows.length))}"/></worksheet>`;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipStore(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const data = Buffer.from(file.contents, "utf8");
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(33, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

export function createXlsxBuffer({
  headers = [],
  rows = [],
  sheetName = "휴가 사용 내역",
  worksheets = null,
} = {}) {
  const sheets = worksheets ?? [{ headers, rows, sheetName }];
  if (!Array.isArray(sheets) || sheets.length === 0) throw new TypeError("XLSX worksheets are required");
  for (const sheet of sheets) {
    if (!Array.isArray(sheet.headers) || sheet.headers.length === 0) throw new TypeError("XLSX headers are required");
    if (!Array.isArray(sheet.rows)) throw new TypeError("XLSX rows must be an array");
    if (typeof sheet.sheetName !== "string" || sheet.sheetName.trim() === "") throw new TypeError("XLSX sheet name is required");
  }
  if (new Set(sheets.map((sheet) => sheet.sheetName)).size !== sheets.length) {
    throw new TypeError("XLSX sheet names must be unique");
  }
  const worksheetOverrides = sheets.map((_, index) => (
    `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  )).join("");
  const workbookSheets = sheets.map((sheet, index) => (
    `<sheet name="${escapeXml(sheet.sheetName)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
  )).join("");
  const worksheetRelationships = sheets.map((_, index) => (
    `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
  )).join("");
  const files = [
    {
      name: "[Content_Types].xml",
      contents: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${worksheetOverrides}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      contents: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      name: "xl/workbook.xml",
      contents: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      contents: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${worksheetRelationships}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    {
      name: "xl/styles.xml",
      contents: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>',
    },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      contents: worksheetXml(sheet.headers, sheet.rows),
    })),
  ];
  return zipStore(files);
}

function decodeXml(value) {
  return String(value ?? "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function zipEntries(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) throw new TypeError("XLSX ZIP directory is missing");
  const endSignature = 0x06054b50;
  let endOffset = -1;
  for (let offset = Math.max(0, buffer.length - 65_557); offset <= buffer.length - 22; offset += 1) {
    if (buffer.readUInt32LE(offset) === endSignature) endOffset = offset;
  }
  if (endOffset < 0) throw new TypeError("XLSX ZIP directory is missing");
  const count = buffer.readUInt16LE(endOffset + 10);
  if (count <= 0 || count > MAX_XLSX_ENTRIES) throw new TypeError("XLSX ZIP entry count is invalid");
  let offset = buffer.readUInt32LE(endOffset + 16);
  if (offset < 0 || offset >= endOffset) throw new TypeError("XLSX ZIP directory offset is invalid");
  const entries = new Map();
  let totalBytes = 0;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > endOffset || buffer.readUInt32LE(offset) !== 0x02014b50) throw new TypeError("XLSX ZIP entry is invalid");
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (nextOffset > endOffset || localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new TypeError("XLSX ZIP local entry is invalid");
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (!name || name.includes("\\") || name.startsWith("/") || name.split("/").includes("..") || entries.has(name)) throw new TypeError("XLSX ZIP entry name is invalid");
    if (uncompressedSize > MAX_XLSX_ENTRY_BYTES || totalBytes + uncompressedSize > MAX_XLSX_TOTAL_BYTES) throw new TypeError("XLSX ZIP expanded size is invalid");
    if (compressedSize > 0 && uncompressedSize / compressedSize > MAX_XLSX_COMPRESSION_RATIO) throw new TypeError("XLSX ZIP compression ratio is invalid");
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > buffer.length) throw new TypeError("XLSX ZIP entry data is invalid");
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let data;
    try {
      data = method === 0 ? compressed : method === 8 ? inflateRawSync(compressed, { maxOutputLength: MAX_XLSX_ENTRY_BYTES + 1 }) : null;
    } catch {
      throw new TypeError("XLSX ZIP entry could not be expanded safely");
    }
    if (!data) throw new TypeError(`XLSX compression method is not supported: ${method}`);
    if (data.length !== uncompressedSize || data.length > MAX_XLSX_ENTRY_BYTES || totalBytes + data.length > MAX_XLSX_TOTAL_BYTES) throw new TypeError("XLSX ZIP expanded size is invalid");
    totalBytes += data.length;
    entries.set(name, data.toString("utf8"));
    offset = nextOffset;
  }
  return entries;
}

function columnIndex(reference) {
  const letters = /^[A-Z]+/.exec(reference)?.[0];
  if (!letters) return 0;
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function xmlText(fragment) {
  return decodeXml([...String(fragment).matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => match[1]).join(""));
}

export function parseXlsxBuffer(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input ?? []);
  if (buffer.subarray(0, 2).toString("ascii") !== "PK") throw new TypeError("XLSX content must be a ZIP workbook");
  const entries = zipEntries(buffer);
  const sheet = entries.get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new TypeError("XLSX first worksheet is missing");
  if (/<f(?:\s|>)/i.test(sheet)) throw new TypeError("XLSX formula cells are not allowed");
  const shared = entries.get("xl/sharedStrings.xml");
  const sharedStrings = shared ? [...shared.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map((match) => xmlText(match[1])) : [];
  return Object.freeze([...sheet.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const reference = /\br="([A-Z]+\d+)"/.exec(attributes)?.[1] ?? "A1";
      const type = /\bt="([^"]+)"/.exec(attributes)?.[1] ?? null;
      const raw = /<v>([\s\S]*?)<\/v>/.exec(cellMatch[2])?.[1] ?? "";
      const value = type === "inlineStr" ? xmlText(cellMatch[2]) : type === "s" ? sharedStrings[Number(raw)] ?? "" : decodeXml(raw);
      row[columnIndex(reference)] = value;
    }
    return Object.freeze(row.map((value) => value ?? ""));
  }));
}
import { inflateRawSync } from "node:zlib";

const MAX_XLSX_ENTRIES = 64;
const MAX_XLSX_ENTRY_BYTES = 8 * 1024 * 1024;
const MAX_XLSX_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_XLSX_COMPRESSION_RATIO = 100;
