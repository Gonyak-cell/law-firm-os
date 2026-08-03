import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const operations = await readFile(new URL("../src/components/matter-small-firm/MatterOperationsSurface.jsx", import.meta.url), "utf8");
const detail = await readFile(new URL("../src/components/matter-small-firm/MatterDetailTabs.jsx", import.meta.url), "utf8");
const matters = await readFile(new URL("../src/components/MattersSurface.jsx", import.meta.url), "utf8");

test("[TUW-30][TUW-31] quick time entry validates positive minutes and the screen separates weekly time from missing entries", () => {
  assert.match(operations, /data-matter-quick-time-entry="true"/);
  assert.match(operations, /type="number" min="1" step="1"/);
  assert.match(operations, /!Number\.isFinite\(duration\) \|\| duration <= 0/);
  assert.match(operations, /\["time", "내 시간"\]/);
  assert.match(operations, /\["missing", "누락"\]/);
  assert.match(matters, /createMatterOpsTimeEntry/);
});

test("[TUW-34][TUW-35][TUW-36] Matter detail reuses the existing WIP, invoice, payment, and AR command panel", () => {
  assert.match(detail, /activeTab === "billing"/);
  assert.match(detail, /result=\{billingStateResult\}/);
  assert.match(detail, /\{billingPanel\}/);
  for (const handler of ["onGenerateWip", "onCreatePreBill", "onIssueInvoice", "onImportPayment", "onMatchPayment"]) {
    assert.match(matters, new RegExp(`${handler}=`));
  }
  assert.match(operations, /\["wip", "청구 대기"\]/);
  assert.match(operations, /\["ar", "미수금"\]/);
});

test("[TUW-37][TUW-38][TUW-39][TUW-40] today queues, closeout blockers, archive view, and weekly CSV share operational rows", () => {
  assert.match(operations, /payload\.lanes\.flatMap/);
  assert.match(detail, /detail\.close_blockers/);
  assert.match(operations, /\["archived", "보관"\]/);
  assert.match(operations, /data-matter-weekly-review="true"/);
  assert.match(operations, /onClick=\{onDownloadReport\}/);
  assert.match(matters, /fetchMatterOpsReportCsv/);
  assert.match(matters, /restoreMatterOpsMatter/);
});
