import assert from "node:assert/strict";
import test from "node:test";

import {
  LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION,
  createLeaveOccurrenceUploadTemplate,
  parseLeaveManualAdjustmentXlsx,
} from "../src/leave/accrual-service.js";
import { createXlsxBuffer } from "../src/leave/xlsx-export.js";

const HEADERS = [
  "template_version",
  LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION,
];
const COLUMNS = [
  "employee_id",
  "group_id",
  "policy_version_id",
  "direction",
  "amount_minutes",
  "valid_from",
  "expires_on",
  "memo",
  "source_document_id",
];

test("RC-005-C CSV and XLSX templates expose one versioned occurrence contract", () => {
  const csv = createLeaveOccurrenceUploadTemplate("csv");
  const xlsx = createLeaveOccurrenceUploadTemplate("xlsx");
  assert.equal(csv.template_version, LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION);
  assert.equal(xlsx.template_version, LEAVE_OCCURRENCE_UPLOAD_TEMPLATE_VERSION);
  assert.equal(Buffer.from(xlsx.content_base64, "base64").subarray(0, 2).toString("ascii"), "PK");
  assert.equal(xlsx.file_name.endsWith(".xlsx"), true);
});

test("RC-005-C edited XLSX rows round-trip with typed minutes", () => {
  const workbook = createXlsxBuffer({
    headers: HEADERS,
    rows: [COLUMNS, ["emp-1", "annual", "annual-v1", "credit", 480, "2026-07-15", "2027-07-14", "보정", "proof-1"]],
  });
  assert.deepEqual(parseLeaveManualAdjustmentXlsx(workbook.toString("base64")), [{
    employee_id: "emp-1",
    group_id: "annual",
    policy_version_id: "annual-v1",
    direction: "credit",
    amount_minutes: 480,
    valid_from: "2026-07-15",
    expires_on: "2027-07-14",
    memo: "보정",
    source_document_id: "proof-1",
  }]);
});

test("RC-005-C rejects malformed, oversized, excessive-row, and formula-bearing XLSX input", () => {
  assert.throws(() => parseLeaveManualAdjustmentXlsx(Buffer.from("not-xlsx").toString("base64")), /XLSX/);
  assert.throws(() => parseLeaveManualAdjustmentXlsx(Buffer.alloc(5 * 1024 * 1024 + 1).toString("base64")), /size/);
  const tooMany = createXlsxBuffer({ headers: HEADERS, rows: [COLUMNS, ...Array.from({ length: 5_001 }, () => ["emp"])] });
  assert.throws(() => parseLeaveManualAdjustmentXlsx(tooMany.toString("base64")), /5000 rows/);
  const formula = createXlsxBuffer({ headers: HEADERS, rows: [COLUMNS, ["=1+1", "annual", "annual-v1", "credit", 480, "2026-07-15", "", "보정", "proof-1"]] });
  assert.throws(() => parseLeaveManualAdjustmentXlsx(formula.toString("base64")), /formula/);
});
