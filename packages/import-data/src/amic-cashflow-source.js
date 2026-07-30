import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { DOMParser, onWarningStopParsing } from "@xmldom/xmldom";

const MAX_XLSX_ENTRIES = 128;
const MAX_XLSX_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_XLSX_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_XLSX_COMPRESSION_RATIO = 120;
const SEOUL_OFFSET = "+09:00";
const DEFAULT_ACCOUNT_REF = "amic-nh-operating";
export const MAX_AMIC_WORKBOOK_SOURCE_BYTES = 16 * 1024 * 1024;

function requiredString(value, field) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function integer(value, field) {
  const normalized = String(value ?? "").replaceAll(",", "").trim();
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new TypeError(`${field} must be a non-negative integer`);
  return parsed;
}

function parseXmlDocument(value, label) {
  const source = String(value ?? "");
  const lower = source.toLowerCase();
  if (lower.includes("<!doctype") || lower.includes("<!entity")) {
    throw new TypeError(`${label} XML declarations are not allowed`);
  }
  try {
    const document = new DOMParser({
      locator: false,
      onError: onWarningStopParsing,
    }).parseFromString(source, "application/xml");
    if (!document.documentElement) throw new TypeError("document element is missing");
    return document;
  } catch {
    throw new TypeError(`${label} XML is invalid`);
  }
}

function xmlText(node) {
  return Array.from(node?.getElementsByTagName("t") ?? [], (textNode) => textNode.textContent ?? "").join("");
}

function columnIndex(reference) {
  const letters = /^[A-Z]+/.exec(reference)?.[0];
  if (!letters) return 0;
  return [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function zipEntries(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 22) throw new TypeError("XLSX ZIP directory is missing");
  let endOffset = -1;
  for (let offset = Math.max(0, buffer.length - 65_557); offset <= buffer.length - 22; offset += 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) endOffset = offset;
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
    if (nextOffset > endOffset || localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new TypeError("XLSX ZIP local entry is invalid");
    }
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (!name || name.includes("\\") || name.startsWith("/") || name.split("/").includes("..") || entries.has(name)) {
      throw new TypeError("XLSX ZIP entry name is invalid");
    }
    if (uncompressedSize > MAX_XLSX_ENTRY_BYTES || totalBytes + uncompressedSize > MAX_XLSX_TOTAL_BYTES) {
      throw new TypeError("XLSX ZIP expanded size is invalid");
    }
    if (compressedSize > 0 && uncompressedSize / compressedSize > MAX_XLSX_COMPRESSION_RATIO) {
      throw new TypeError("XLSX ZIP compression ratio is invalid");
    }
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
    if (data.length !== uncompressedSize || totalBytes + data.length > MAX_XLSX_TOTAL_BYTES) {
      throw new TypeError("XLSX ZIP expanded size is invalid");
    }
    totalBytes += data.length;
    entries.set(name, data.toString("utf8"));
    offset = nextOffset;
  }
  return entries;
}

function parseSheetXml(sheet, sharedStrings) {
  const formulaCells = [];
  const document = parseXmlDocument(sheet, "XLSX worksheet");
  const rows = Array.from(document.getElementsByTagName("row"), (rowNode, rowIndex) => {
    const row = [];
    for (const cellNode of Array.from(rowNode.getElementsByTagName("c"))) {
      const reference = cellNode.getAttribute("r") || "A1";
      const type = cellNode.getAttribute("t") || null;
      const raw = cellNode.getElementsByTagName("v").item(0)?.textContent ?? "";
      const value = type === "inlineStr" ? xmlText(cellNode) : type === "s" ? sharedStrings[Number(raw)] ?? "" : raw;
      if (/^[=+@]/u.test(String(value).trimStart())) throw new TypeError("XLSX formula-like values are not allowed");
      const cellColumnIndex = columnIndex(reference);
      if (cellNode.getElementsByTagName("f").length > 0) {
        formulaCells.push(Object.freeze({ reference, row_index: rowIndex, column_index: cellColumnIndex }));
      }
      row[cellColumnIndex] = value;
    }
    return Object.freeze(row.map((value) => value ?? ""));
  });
  Object.defineProperty(rows, "formula_cells", {
    value: Object.freeze(formulaCells),
    enumerable: false,
  });
  return Object.freeze(rows);
}

function workbookSheetPaths(entries) {
  const workbook = entries.get("xl/workbook.xml");
  const relationships = entries.get("xl/_rels/workbook.xml.rels");
  if (!workbook || !relationships) throw new TypeError("XLSX workbook relationships are missing");
  const relationshipDocument = parseXmlDocument(relationships, "XLSX workbook relationships");
  const targets = new Map(
    Array.from(relationshipDocument.getElementsByTagName("Relationship"), (relationship) => {
      const id = relationship.getAttribute("Id");
      const target = relationship.getAttribute("Target");
      return [id, target];
    }).filter(([id, target]) => id && target),
  );
  const workbookDocument = parseXmlDocument(workbook, "XLSX workbook");
  return Array.from(workbookDocument.getElementsByTagName("sheet"), (sheet) => {
    const name = sheet.getAttribute("name");
    const relationId = sheet.getAttribute("r:id");
    const target = targets.get(relationId);
    const path = target?.startsWith("/") ? target.slice(1) : `xl/${target ?? ""}`.replaceAll("/../", "/");
    return [name, path];
  }).filter(([name, path]) => name && entries.has(path));
}

export function parseXlsxSheetsBuffer(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input ?? []);
  if (buffer.subarray(0, 2).toString("ascii") !== "PK") throw new TypeError("XLSX content must be a ZIP workbook");
  const entries = zipEntries(buffer);
  const shared = entries.get("xl/sharedStrings.xml");
  const sharedDocument = shared ? parseXmlDocument(shared, "XLSX shared strings") : null;
  const sharedStrings = sharedDocument
    ? Array.from(sharedDocument.getElementsByTagName("si"), (sharedString) => xmlText(sharedString))
    : [];
  return Object.freeze(Object.fromEntries(
    workbookSheetPaths(entries).map(([name, path]) => [name, Object.freeze(parseSheetXml(entries.get(path), sharedStrings))]),
  ));
}

function excelDate(value) {
  const normalized = String(value ?? "").trim();
  const direct = /^(\d{4})[-/.](\d{2})[-/.](\d{2})/.exec(normalized);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  const serial = Number(normalized);
  if (!Number.isFinite(serial)) throw new TypeError("transaction date is invalid");
  return new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000).toISOString().slice(0, 10);
}

function transactionFingerprint({ account_ref, date, direction, amount, balance_after }) {
  return createHash("sha256")
    .update([account_ref, date, direction, amount, balance_after].join("|"))
    .digest("hex");
}

function normalizedTransaction(input = {}) {
  const direction = input.direction === "입금" || input.direction === "inflow" ? "inflow" : input.direction === "출금" || input.direction === "outflow" ? "outflow" : null;
  if (!direction) throw new TypeError("transaction direction is invalid");
  const date = excelDate(input.date);
  const accountRef = requiredString(input.account_ref ?? DEFAULT_ACCOUNT_REF, "account_ref");
  const amount = integer(input.amount, "amount");
  const balanceAfter = integer(input.balance_after, "balance_after");
  const fingerprint = transactionFingerprint({ account_ref: accountRef, date, direction, amount, balance_after: balanceAfter });
  return Object.freeze({
    bank_transaction_id: `bank_tx_${fingerprint.slice(0, 24)}`,
    account_ref: accountRef,
    transaction_fingerprint: fingerprint,
    date,
    occurred_at: input.occurred_at ?? `${date}T12:00:00${SEOUL_OFFSET}`,
    time_precision: input.time_precision ?? "date",
    direction,
    amount,
    balance_after: balanceAfter,
    zero_amount_source_record: amount === 0,
    currency: "KRW",
    method: String(input.method ?? "").trim() || null,
    counterparty: String(input.counterparty ?? "").trim() || null,
    memo: String(input.memo ?? "").trim() || null,
    source_category: String(input.source_category ?? "").trim() || "미분류",
    classification_scope: input.classification_scope ?? "unreviewed",
    source_refs: Object.freeze((input.source_refs ?? []).map((ref) => Object.freeze({ ...ref }))),
  });
}

function headerIndex(rows) {
  const index = rows.findIndex((row) => String(row?.[0] ?? "").trim() === "거래일");
  if (index < 0) throw new TypeError("cashflow worksheet transaction header is missing");
  return index;
}

function rejectTransactionFormulaCells(rows, start, sheetName) {
  const formulaCell = rows.formula_cells?.find(({ row_index: rowIndex }) => rowIndex >= start);
  if (formulaCell) throw new TypeError(`${sheetName} transaction data contains a formula cell: ${formulaCell.reference}`);
}

export function parseAmicWorkbookSheets(sheets, { account_ref = DEFAULT_ACCOUNT_REF, source_hash = null } = {}) {
  const transactions = [];
  for (const [sheetName, direction] of [["입금내역", "inflow"], ["출금내역", "outflow"]]) {
    const rows = sheets?.[sheetName];
    if (!Array.isArray(rows)) throw new TypeError(`${sheetName} worksheet is missing`);
    const start = headerIndex(rows) + 1;
    rejectTransactionFormulaCells(rows, start, sheetName);
    rows.slice(start).forEach((row, index) => {
      if (!String(row?.[0] ?? "").trim()) return;
      transactions.push(normalizedTransaction({
        account_ref,
        date: row[0],
        direction,
        amount: row[4],
        balance_after: row[5],
        method: row[2],
        counterparty: row[1],
        source_category: row[3],
        classification_scope: "operating",
        source_refs: [{ source_type: "xlsx", source_hash, sheet: sheetName, row: start + index + 1 }],
      }));
    });
  }
  for (const [sheetName, classificationScope] of [["페트라브릿지", "petra_bridge"], ["차량대출", "vehicle_financing"]]) {
    const rows = sheets?.[sheetName];
    if (!Array.isArray(rows)) throw new TypeError(`${sheetName} worksheet is missing`);
    const start = headerIndex(rows) + 1;
    rejectTransactionFormulaCells(rows, start, sheetName);
    rows.slice(start).forEach((row, index) => {
      if (!String(row?.[0] ?? "").trim()) return;
      const detail = String(row[5] ?? "").split("|").map((part) => part.trim()).filter(Boolean);
      transactions.push(normalizedTransaction({
        account_ref,
        date: row[0],
        direction: row[1],
        amount: row[2],
        balance_after: row[3],
        method: detail[0],
        counterparty: detail[1],
        memo: detail.slice(2).join(" | "),
        source_category: sheetName,
        classification_scope: classificationScope,
        source_refs: [{ source_type: "xlsx", source_hash, sheet: sheetName, row: start + index + 1 }],
      }));
    });
  }
  return Object.freeze(transactions);
}

export function parseAmicWorkbookBuffer(buffer, options = {}) {
  return parseAmicWorkbookSheets(parseXlsxSheetsBuffer(buffer), options);
}

export function previewAmicWorkbookBuffer(
  input,
  {
    account_ref = DEFAULT_ACCOUNT_REF,
    existing_transactions = [],
  } = {},
) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input ?? []);
  if (buffer.length === 0) throw new TypeError("XLSX source file is required");
  if (buffer.length > MAX_AMIC_WORKBOOK_SOURCE_BYTES) {
    throw new RangeError("XLSX source file exceeds the preview byte budget");
  }
  const sourceFileSha256 = sha256(buffer);
  const transactions = parseAmicWorkbookBuffer(buffer, {
    account_ref,
    source_hash: sourceFileSha256,
  });
  if (transactions.length === 0 || transactions.length > 5_000) {
    throw new TypeError("XLSX preview must contain 1 to 5000 transactions");
  }

  const existingByFingerprint = new Map(
    existing_transactions
      .filter((transaction) => transaction?.transaction_fingerprint)
      .map((transaction) => [transaction.transaction_fingerprint, transaction]),
  );
  const firstPreviewTransactionByFingerprint = new Map();
  const items = transactions.map((transaction, index) => {
    const existing = existingByFingerprint.get(transaction.transaction_fingerprint);
    const earlierPreview = firstPreviewTransactionByFingerprint.get(transaction.transaction_fingerprint);
    const duplicateOf = existing?.bank_transaction_id ?? earlierPreview?.bank_transaction_id ?? null;
    if (!earlierPreview) {
      firstPreviewTransactionByFingerprint.set(transaction.transaction_fingerprint, transaction);
    }
    return Object.freeze({
      row_number: index + 1,
      status: duplicateOf ? "duplicate" : "new",
      bank_transaction_id: transaction.bank_transaction_id,
      duplicate_of_bank_transaction_id: duplicateOf,
      account_ref: transaction.account_ref,
      date: transaction.date,
      occurred_at: transaction.occurred_at,
      direction: transaction.direction,
      amount: transaction.amount,
      balance_after: transaction.balance_after,
      currency: transaction.currency,
      method: transaction.method,
      counterparty: transaction.counterparty,
      source_category: transaction.source_category,
      classification_scope: transaction.classification_scope,
      source_metadata_included: false,
      transaction_fingerprint_included: false,
      raw_source_payload_included: false,
    });
  });
  const newCount = items.filter((item) => item.status === "new").length;
  const duplicateCount = items.length - newCount;
  const previewManifestSha256 = sha256(Buffer.from(JSON.stringify({
    source_file_sha256: sourceFileSha256,
    account_ref,
    transactions: transactions.map((transaction) => ({
      bank_transaction_id: transaction.bank_transaction_id,
      transaction_fingerprint: transaction.transaction_fingerprint,
    })),
    duplicate_of_bank_transaction_ids: items.map((item) => item.duplicate_of_bank_transaction_id),
  })));
  return Object.freeze({
    preview_id: `bank_import_preview_${previewManifestSha256.slice(0, 24)}`,
    preview_manifest_sha256: previewManifestSha256,
    source_file_sha256: sourceFileSha256,
    account_ref,
    counts: Object.freeze({
      total: items.length,
      new: newCount,
      duplicate: duplicateCount,
      error: 0,
    }),
    items: Object.freeze(items),
    transactions,
    product_records_mutated: false,
    raw_source_payload_included: false,
  });
}

export function parseNhBankStatementText(text, { account_ref = DEFAULT_ACCOUNT_REF, source_hash = null } = {}) {
  const transactions = [];
  const pages = String(text ?? "").split("\f");
  pages.forEach((page, pageIndex) => {
    const lines = page.split(/\r?\n/);
    let block = null;
    const flush = () => {
      if (!block) return;
      const detailLine = block.lines.find((line) => /^\s*(입금|출금)\s+[\d,]+\s+[\d,]+/.test(line));
      const detail = detailLine?.match(/^\s*(입금|출금)\s+([\d,]+)\s+([\d,]+)\s*(.*)$/);
      const time = block.lines.map((line) => /\b(\d{2}:\d{2}:\d{2})\b/.exec(line)?.[1]).find(Boolean);
      if (!detail || !time) return;
      const columns = detail[4].trim().split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
      transactions.push(normalizedTransaction({
        account_ref,
        date: block.date,
        occurred_at: `${block.date.replaceAll("/", "-")}T${time}${SEOUL_OFFSET}`,
        time_precision: "second",
        direction: detail[1],
        amount: detail[2],
        balance_after: detail[3],
        method: columns[0],
        counterparty: columns[1],
        memo: columns.slice(2).join(" | "),
        classification_scope: "unreviewed",
        source_refs: [{ source_type: "pdf", source_hash, page: pageIndex + 1 }],
      }));
    };
    for (const line of lines) {
      const normalizedLine = line.trimStart();
      const candidateDate = normalizedLine.slice(0, 10);
      const date = candidateDate.length === 10
        && candidateDate[4] === "/"
        && candidateDate[7] === "/"
        && [...candidateDate.slice(0, 4), ...candidateDate.slice(5, 7), ...candidateDate.slice(8, 10)]
          .every((character) => character >= "0" && character <= "9")
        && (!normalizedLine[10] || normalizedLine[10].trim() === "")
        ? candidateDate
        : null;
      if (date) {
        flush();
        block = { date, lines: [] };
      } else if (block) {
        block.lines.push(line);
      }
    }
    flush();
  });
  return Object.freeze(transactions);
}

export function mergeCashflowTransactions(workbookTransactions = [], statementTransactions = []) {
  const merged = new Map(workbookTransactions.map((transaction) => [transaction.transaction_fingerprint, transaction]));
  let overlapCount = 0;
  for (const statement of statementTransactions) {
    const existing = merged.get(statement.transaction_fingerprint);
    if (!existing) {
      merged.set(statement.transaction_fingerprint, statement);
      continue;
    }
    overlapCount += 1;
    merged.set(statement.transaction_fingerprint, Object.freeze({
      ...existing,
      occurred_at: statement.occurred_at,
      time_precision: statement.time_precision,
      method: statement.method ?? existing.method,
      counterparty: statement.counterparty ?? existing.counterparty,
      memo: statement.memo ?? existing.memo,
      source_refs: Object.freeze([...existing.source_refs, ...statement.source_refs]),
    }));
  }
  const transactions = [...merged.values()].sort((left, right) => left.occurred_at.localeCompare(right.occurred_at));
  return Object.freeze({
    transactions: Object.freeze(transactions),
    overlap_count: overlapCount,
    statement_new_count: statementTransactions.length - overlapCount,
  });
}

export function summarizeCashflowTransactions(transactions = [], { month = null } = {}) {
  const rows = month ? transactions.filter((transaction) => transaction.date.startsWith(`${month}-`)) : [...transactions];
  const totalInflow = rows.filter((row) => row.direction === "inflow").reduce((sum, row) => sum + row.amount, 0);
  const totalOutflow = rows.filter((row) => row.direction === "outflow").reduce((sum, row) => sum + row.amount, 0);
  const latest = [...transactions].sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))[0] ?? null;
  return Object.freeze({
    transaction_count: rows.length,
    total_inflow: totalInflow,
    total_outflow: totalOutflow,
    net_movement: totalInflow - totalOutflow,
    current_balance: latest?.balance_after ?? null,
    latest_occurred_at: latest?.occurred_at ?? null,
    currency: "KRW",
  });
}

export function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}
