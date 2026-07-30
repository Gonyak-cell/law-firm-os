import assert from "node:assert/strict";
import test from "node:test";
import { createFinanceRepository } from "../../../packages/billing/src/finance-repository.js";
import { parseAmicWorkbookBuffer } from "../../../packages/import-data/src/index.js";
import { createXlsxBuffer } from "../../../packages/hrx/src/leave/xlsx-export.js";
import {
  createFinanceRuntimeContext,
} from "../src/finance-runtime-context.js";
import {
  MATTER_VAULT_REGISTERED_TENANT_ID,
  findRegisteredAccountByEmail,
  highestPrivilegeRegisteredAccount,
} from "../src/matter-vault-account-registry.js";
import { startApiServer } from "../src/server.js";
import { apiSessionHeaders } from "./helpers/session.js";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ACCOUNT_REF = "account-client-preview";

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

function workbookBuffer() {
  return createXlsxBuffer({
    worksheets: Object.entries(sheets).map(([name, rows]) => ({
      sheetName: name,
      headers: rows[0],
      rows: rows.slice(1),
    })),
  });
}

async function withServer(financeRepository, callback) {
  const started = await startApiServer({
    port: 0,
    financeRuntime: createFinanceRuntimeContext({ repository: financeRepository }),
  });
  try {
    return await callback(`http://${started.host}:${started.port}`);
  } finally {
    await new Promise((resolve) => started.server.close(resolve));
  }
}

function previewForm(file, { mimeType = XLSX_MIME, fileName = "입출금내역.xlsx" } = {}) {
  const body = new FormData();
  body.set("tenant_id", MATTER_VAULT_REGISTERED_TENANT_ID);
  body.set("permission_ref", "perm-client-bank-preview");
  body.set("audit_hint_ref", "audit-client-bank-preview");
  body.set("account_ref", ACCOUNT_REF);
  body.set("file", new Blob([file], { type: mimeType }), fileName);
  return body;
}

async function postPreview(baseUrl, account, form) {
  const headers = await apiSessionHeaders(baseUrl, account);
  const response = await fetch(`${baseUrl}/api/finance/bank-imports/preview`, {
    method: "POST",
    headers,
    body: form,
  });
  return { status: response.status, body: await response.json() };
}

test("CL-P1-W01-T01 authorized XLSX preview reports file hash, account, new and duplicate rows without importing", async () => {
  const workbook = workbookBuffer();
  const parsed = parseAmicWorkbookBuffer(workbook, {
    account_ref: ACCOUNT_REF,
    source_hash: "a".repeat(64),
  });
  const repository = createFinanceRepository({
    seedRecords: [{
      ...parsed[0],
      model_type: "BankTransaction",
      tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
      bank_import_batch_id: "seed-bank-import",
    }],
  });
  const beforeTransactions = repository.list({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    model_type: "BankTransaction",
  }).length;

  await withServer(repository, async (baseUrl) => {
    const response = await postPreview(
      baseUrl,
      highestPrivilegeRegisteredAccount(),
      previewForm(workbook),
    );
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.outcome, "preview_ready");
    assert.match(response.body.preview.source_file_sha256, /^[a-f0-9]{64}$/u);
    assert.match(response.body.preview.preview_manifest_sha256, /^[a-f0-9]{64}$/u);
    assert.equal(response.body.preview.account_ref, ACCOUNT_REF);
    assert.deepEqual(response.body.preview.counts, {
      total: 4,
      new: 3,
      duplicate: 1,
      error: 0,
    });
    assert.equal(response.body.preview.items[0].status, "duplicate");
    assert.equal(response.body.preview.items[0].transaction_fingerprint, undefined);
    assert.equal(response.body.preview.items[0].source_refs, undefined);
    assert.equal(response.body.preview.confirmation_token_included, false);
    assert.equal(response.body.preview.product_records_mutated, false);
  });

  assert.equal(repository.list({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    model_type: "BankTransaction",
  }).length, beforeTransactions);
  assert.equal(repository.list({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    model_type: "BankImportBatch",
  }).length, 0);
});

test("CL-P1-W01-T01 XLSX preview fails closed for staff, malformed workbooks, and misleading file types", async () => {
  const repository = createFinanceRepository();
  const staff = findRegisteredAccountByEmail("yjlee@amic.kr");
  assert.ok(staff);
  await withServer(repository, async (baseUrl) => {
    const denied = await postPreview(baseUrl, staff, previewForm(workbookBuffer()));
    assert.equal(denied.status, 403);
    assert.deepEqual(denied.body.safe_error_codes, ["FINANCE_UNAUTHORIZED_OMISSION"]);
    assert.deepEqual(denied.body.items, []);

    const malformed = await postPreview(
      baseUrl,
      highestPrivilegeRegisteredAccount(),
      previewForm(Buffer.from("not-an-xlsx")),
    );
    assert.equal(malformed.status, 400);
    assert.deepEqual(malformed.body.safe_error_codes, ["FINANCE_SOURCE_FILE_INVALID"]);
    assert.deepEqual(malformed.body.preview.counts, {
      total: 0,
      new: 0,
      duplicate: 0,
      error: 1,
    });

    const misleading = await postPreview(
      baseUrl,
      highestPrivilegeRegisteredAccount(),
      previewForm(workbookBuffer(), { mimeType: "text/plain" }),
    );
    assert.equal(misleading.status, 400);
    assert.deepEqual(misleading.body.safe_error_codes, ["FINANCE_SOURCE_FILE_INVALID"]);
  });
  assert.equal(repository.list({
    tenant_id: MATTER_VAULT_REGISTERED_TENANT_ID,
    model_type: "BankTransaction",
  }).length, 0);
});
