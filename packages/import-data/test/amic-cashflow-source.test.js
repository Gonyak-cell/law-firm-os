import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_AMIC_WORKBOOK_SOURCE_BYTES,
  mergeCashflowTransactions,
  parseAmicWorkbookSheets,
  parseNhBankStatementText,
  parseXlsxSheetsBuffer,
  previewAmicWorkbookBuffer,
  summarizeCashflowTransactions,
} from "../src/index.js";
import { createXlsxBuffer } from "../../hrx/src/leave/xlsx-export.js";

const sheets = {
  입금내역: [
    ["입금 내역"],
    ["거래일", "거래처/기록", "거래내용", "구분", "입금액", "거래후잔액", "월"],
    ["2026-07-02", "고객 A", "실시간이체", "매출", "1000", "11000", "2026-07"],
  ],
  출금내역: [
    ["출금 내역"],
    ["거래일", "거래처/기록", "거래내용", "구분", "출금액", "거래후잔액", "월"],
    ["2026-07-03", "공급자 B", "자동이체", "관리비", "300", "10700", "2026-07"],
  ],
  페트라브릿지: [
    ["별도 관리"],
    ["거래일", "구분", "금액", "거래후잔액", "월", "거래내용/기록"],
    ["2026-07-04", "입금", "2000", "12700", "2026-07", "인터넷당행 | 파트너"],
  ],
  차량대출: [
    ["별도 관리"],
    ["거래일", "구분", "금액", "거래후잔액", "월", "거래내용/기록"],
    ["2026-07-05", "출금", "500", "12200", "2026-07", "자동이체 | 금융사"],
  ],
};

const statementText = `
              2026/07/06
                          입금 1,500                13,700 실시간이체                    고객 C
                09:30:00
              2026/07/03
                          출금 300                  10,700 자동이체                     공급자 B
                10:00:00
`;

function cashflowWorkbookBuffer(sourceSheets = sheets) {
  return createXlsxBuffer({
    worksheets: Object.entries(sourceSheets).map(([name, rows]) => ({
      sheetName: name,
      headers: rows[0],
      rows: rows.slice(1),
    })),
  });
}

test("AMIC cashflow XLSX parsing rejects formula-like worksheet values", () => {
  const workbook = createXlsxBuffer({
    sheetName: "입금내역",
    headers: ["입금 내역"],
    rows: [["=1+1"]],
  });
  assert.throws(() => parseXlsxSheetsBuffer(workbook), /formula-like values/);
});

test("AMIC cashflow XLSX parsing rejects document type declarations", () => {
  const workbook = createXlsxBuffer({
    sheetName: "입금내역",
    headers: ["입금 내역"],
    rows: [["값"]],
  });
  const worksheetStart = workbook.indexOf("<worksheet");
  assert.notEqual(worksheetStart, -1);
  Buffer.from("<!DOCTYPE").copy(workbook, worksheetStart);
  assert.throws(() => parseXlsxSheetsBuffer(workbook), /XML declarations are not allowed/);
});

test("AMIC cashflow import allows summary formulas but rejects formulas in transaction rows", () => {
  const withFormulaCells = (rows, formulaCells) => {
    const copy = rows.map((row) => [...row]);
    Object.defineProperty(copy, "formula_cells", {
      value: Object.freeze(formulaCells),
      enumerable: false,
    });
    return copy;
  };
  const summaryFormulaSheets = {
    ...sheets,
    페트라브릿지: withFormulaCells(sheets.페트라브릿지, [{ reference: "B1", row_index: 0, column_index: 1 }]),
  };
  assert.equal(parseAmicWorkbookSheets(summaryFormulaSheets).length, 4);

  const transactionFormulaSheets = {
    ...sheets,
    입금내역: withFormulaCells(sheets.입금내역, [{ reference: "E3", row_index: 2, column_index: 4 }]),
  };
  assert.throws(() => parseAmicWorkbookSheets(transactionFormulaSheets), /transaction data contains a formula cell: E3/);
});

test("AMIC cashflow sources normalize operating and non-operating rows without auto-attributing revenue", () => {
  const transactions = parseAmicWorkbookSheets(sheets, { source_hash: "workbook-hash" });
  assert.equal(transactions.length, 4);
  assert.deepEqual(transactions.map((row) => row.classification_scope), [
    "operating",
    "operating",
    "petra_bridge",
    "vehicle_financing",
  ]);
  assert.equal(transactions[2].source_category, "페트라브릿지");
  assert.equal(transactions.every((row) => row.currency === "KRW"), true);
});

test("AMIC cashflow sources preserve a zero-amount source row without changing cash totals", () => {
  const withOpeningMarker = {
    ...sheets,
    입금내역: [...sheets.입금내역, ["2026-01-13", "신규", "신규", "기타", "0", "0", "2026-01"]],
  };
  const transactions = parseAmicWorkbookSheets(withOpeningMarker);
  const marker = transactions.find((row) => row.amount === 0);
  assert.equal(marker.zero_amount_source_record, true);
  assert.equal(summarizeCashflowTransactions(transactions).total_inflow, 3000);
});

test("NH statement rows enrich workbook overlaps and add only unseen transactions", () => {
  const workbook = parseAmicWorkbookSheets(sheets, { source_hash: "workbook-hash" });
  const statement = parseNhBankStatementText(statementText, { source_hash: "statement-hash" });
  const merged = mergeCashflowTransactions(workbook, statement);
  assert.equal(statement.length, 2);
  assert.equal(merged.overlap_count, 1);
  assert.equal(merged.statement_new_count, 1);
  assert.equal(merged.transactions.length, 5);
  const overlap = merged.transactions.find((row) => row.amount === 300);
  assert.equal(overlap.time_precision, "second");
  assert.equal(overlap.source_refs.length, 2);
});

test("cashflow summaries keep total cash movement separate from classification", () => {
  const workbook = parseAmicWorkbookSheets(sheets);
  const statement = parseNhBankStatementText(statementText);
  const { transactions } = mergeCashflowTransactions(workbook, statement);
  assert.deepEqual(summarizeCashflowTransactions(transactions, { month: "2026-07" }), {
    transaction_count: 5,
    total_inflow: 4500,
    total_outflow: 800,
    net_movement: 3700,
    current_balance: 13700,
    latest_occurred_at: "2026-07-06T09:30:00+09:00",
    currency: "KRW",
  });
});

test("CL-P1-W01-T01 XLSX preview returns deterministic hashes and new or duplicate row counts without writing records", () => {
  const workbook = cashflowWorkbookBuffer();
  const first = previewAmicWorkbookBuffer(workbook, {
    account_ref: "account-client-preview",
  });
  assert.match(first.source_file_sha256, /^[a-f0-9]{64}$/u);
  assert.match(first.preview_manifest_sha256, /^[a-f0-9]{64}$/u);
  assert.match(first.preview_id, /^bank_import_preview_[a-f0-9]{24}$/u);
  assert.deepEqual(first.counts, { total: 4, new: 4, duplicate: 0, error: 0 });
  assert.equal(first.items.every((item) => item.raw_source_payload_included === false), true);
  assert.equal(first.items.every((item) => item.transaction_fingerprint_included === false), true);
  assert.equal(first.product_records_mutated, false);

  const replay = previewAmicWorkbookBuffer(workbook, {
    account_ref: "account-client-preview",
    existing_transactions: [{
      ...first.transactions[0],
      bank_transaction_id: "persisted-bank-transaction",
    }],
  });
  assert.equal(replay.source_file_sha256, first.source_file_sha256);
  assert.notEqual(replay.preview_id, first.preview_id);
  assert.deepEqual(replay.counts, { total: 4, new: 3, duplicate: 1, error: 0 });
  assert.equal(replay.items[0].status, "duplicate");
  assert.equal(replay.items[0].duplicate_of_bank_transaction_id, "persisted-bank-transaction");
});

test("CL-P1-W01-T01 XLSX preview rejects empty and oversized sources before parsing", () => {
  assert.throws(
    () => previewAmicWorkbookBuffer(Buffer.alloc(0)),
    /source file is required/,
  );
  assert.throws(
    () => previewAmicWorkbookBuffer(Buffer.alloc(MAX_AMIC_WORKBOOK_SOURCE_BYTES + 1)),
    /byte budget/,
  );
});
