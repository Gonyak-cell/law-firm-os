import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PAYROLL_CAPABILITY_LEDGER } from "../../../packages/hrx/test/payroll-capability-ledger.fixture.js";
import { extractPayrollCapabilityInventory } from "../../../scripts/extract-payroll-capabilities.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function source(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

test("PY-UI-001/002 replaces the export placeholder with the persisted payroll workspace", async () => {
  const [peopleHome, workspace, client, styles] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/payroll/PayrollBoundaryPanel.tsx"),
    source("src/people/hrxApiClient.ts"),
    source("src/styles.css")
  ]);

  assert.match(peopleHome, /currentSection === "people-payroll"[\s\S]{0,160}<PayrollBoundaryPanel/);
  assert.match(workspace, /data-payroll-runtime="true"/);
  assert.match(workspace, /fetchHrxPayrollWorkspace/);
  assert.match(workspace, /captureHrxPayrollRun/);
  assert.match(workspace, /previewHrxPayrollRun/);
  assert.match(workspace, /approveHrxPayrollRun/);
  assert.match(workspace, /closeHrxPayrollRun/);
  assert.match(workspace, /resolveHrxPayrollIssue/);
  assert.match(workspace, /data-payroll-operation="payment"/);
  assert.match(workspace, /data-payroll-operation="filing"/);
  assert.match(workspace, /prepareHrxPayrollPayment/);
  assert.match(workspace, /approveHrxPayrollPayment/);
  assert.match(workspace, /exportHrxPayrollPayment/);
  assert.match(workspace, /reconcileHrxPayrollPayment/);
  assert.match(workspace, /retryFailedHrxPayrollPayment/);
  assert.match(workspace, /실패 또는 미확인 건 다시 처리/);
  assert.match(workspace, /data-payroll-payment-item/);
  assert.match(workspace, /paymentFailedCount/);
  assert.match(workspace, /paymentUnknownCount/);
  assert.doesNotMatch(workspace, /tokenized_account_ref|account_number|content_base64|atob\(/);
  assert.match(workspace, /createHrxPayrollFiling/);
  assert.match(workspace, /validateHrxPayrollFiling/);
  assert.match(workspace, /submitHrxPayrollFiling/);
  assert.match(workspace, /correctHrxPayrollFiling/);
  assert.match(workspace, /\["year_end", "연말정산"\]/);
  assert.match(workspace, /collectHrxPayrollYearEnd/);
  assert.match(workspace, /calculateHrxPayrollYearEnd/);
  assert.match(workspace, /reviewHrxPayrollYearEnd/);
  assert.match(workspace, /자료 수집/);
  assert.match(workspace, /정산 계산/);
  assert.match(workspace, /검토 승인/);
  assert.match(workspace, /receiptRef\.split\("\/"\)\.at\(-1\)\?\.slice\(0, 12\)/);
  assert.match(workspace, /작성자와 다른 승인자만 승인할 수 있습니다/);
  assert.match(workspace, /createPortal\(/);
  assert.match(workspace, /role="dialog"/);
  assert.match(workspace, /event\.key === "Escape"/);
  assert.match(workspace, /급여기간/);
  assert.match(workspace, /지급총액/);
  assert.match(workspace, /실지급/);
  assert.doesNotMatch(workspace, /내보내기 전용|계산 처리는 아직 구현되지 않았습니다|지급 처리는 아직 구현되지 않았습니다|외부 급여 서비스/);

  for (const route of ["periods", "snapshot", "preview", "approve", "close", "issues"]) assert.match(client, new RegExp(`/api/hrx/payroll/[\\s\\S]{0,220}${route}`));
  for (const action of ["collect", "calculate", "review"]) assert.match(client, new RegExp(`year-end/${action}`));
  assert.match(styles, /\.payroll-table th,[\s\S]{0,100}height: 44px/);
  assert.match(styles, /\.payroll-operation-table th,[\s\S]{0,100}height: 44px/);
  assert.match(styles, /\.payroll-provider-state\.failed[\s\S]{0,100}var\(--am-danger\)/);
  assert.match(styles, /\.payroll-period-facts > span,[\s\S]{0,500}white-space: nowrap/);
  assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.payroll-toolbar[\s\S]*flex-direction: column/);
});

test("PY-UI-003/004 keeps employee detail source-bound and compact", async () => {
  const workspace = await source("src/people/payroll/PayrollBoundaryPanel.tsx");
  assert.match(workspace, /detailLines/);
  assert.match(workspace, /formula_code/);
  assert.match(workspace, /detailSnapshot/);
  assert.match(workspace, /source_refs/);
  assert.match(workspace, /detailAdjustments/);
  assert.match(workspace, /detailIssues/);
  assert.doesNotMatch(workspace, /input_json|encrypted_amount_ref|bank_account/);
});

test("PY-LABEL-003 renders human payroll labels and never renders opaque actor identifiers", async () => {
  const workspace = await source("src/people/payroll/PayrollBoundaryPanel.tsx");
  assert.match(workspace, /humanEmployeeLabel/);
  assert.match(workspace, /approvedActorLabel/);
  assert.match(workspace, /approved_by_actor_display_name/);
  assert.match(workspace, /approved_by_actor_id/);
  assert.match(workspace, /isHumanLabel\(value, \[actorId\]\)/);
  assert.match(workspace, /actor_display_name/);
  assert.match(workspace, /승인자 이름 확인 필요/);
  assert.match(workspace, /담당자 이름 확인 필요/);
  assert.doesNotMatch(workspace, /\{text\(selectedRun, "approved_by_actor_id"\)\}/);
  assert.doesNotMatch(workspace, /text\(event, "actor_id"\)/);
});

test("PY-DOC-001/003/004 exposes one compact statement workspace for generate, export, delivery, and self download", async () => {
  const [peopleHome, workspace, client] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/payroll/PayrollStatementWorkspace.tsx"),
    source("src/people/hrxApiClient.ts"),
  ]);
  assert.match(peopleHome, /currentSection === "people-pay-statement"[\s\S]{0,180}<PayrollStatementWorkspace/);
  assert.match(workspace, /generateHrxPayrollStatements/);
  assert.match(workspace, /exportHrxPayrollRegister/);
  assert.match(workspace, /deliveryChannel/);
  assert.match(workspace, /value="email"/);
  assert.match(workspace, /value="message"/);
  assert.match(workspace, /value="self_service"/);
  assert.match(workspace, /fetchHrxPayrollStatementsSelf/);
  assert.match(workspace, /readHrxPayrollStatement/);
  assert.match(workspace, /revokeHrxPayrollStatement/);
  assert.match(workspace, /deliveryStatus/);
  assert.match(workspace, /발송 접수/);
  assert.match(workspace, /발송 실패/);
  assert.match(workspace, /실패 건 재처리/);
  assert.match(workspace, /deliveryAttemptLabel/);
  assert.match(workspace, /\$\{attempts\}회 시도/);
  assert.match(workspace, /급여명세서 철회 확인/);
  assert.match(workspace, /providerDeliveryEnabled/);
  assert.match(workspace, /이메일·메시지 전달 서비스가 연결되지 않았습니다/);
  assert.match(workspace, /HrxStepUpChallenge/);
  assert.match(workspace, /selfOnly \? "급여명세서가 없습니다\."/);
  assert.doesNotMatch(workspace, /gross_krw|deduction_krw|net_krw|account_number/);
  for (const route of ["statements", "deliver", "export", "download"]) assert.match(client, new RegExp(`/api/hrx/payroll/[\\s\\S]{0,300}${route}`));
});

test("PEO-TUW-060 maps every active payroll UI client action to an audited API capability", async () => {
  const inventory = await extractPayrollCapabilityInventory();
  const client = await source("src/people/hrxApiClient.ts");
  const mappedFunctions = new Set(PAYROLL_CAPABILITY_LEDGER.flatMap((entry) => entry.client_function ?? []));
  const surfaceMap = new Map();
  for (const entry of PAYROLL_CAPABILITY_LEDGER) {
    for (const surface of entry.ui_surfaces) {
      const functions = surfaceMap.get(surface) ?? [];
      functions.push(entry.client_function);
      surfaceMap.set(surface, functions);
    }
  }
  const ledgerSurfaces = [...surfaceMap]
    .map(([surface, clientFunctions]) => ({
      surface,
      client_functions: [...new Set(clientFunctions.filter(Boolean))].sort(),
    }))
    .sort((left, right) => left.surface.localeCompare(right.surface));

  assert.deepEqual(
    inventory.surface_actions,
    ledgerSurfaces,
    "reachable People payroll UI actions and audited ledger surfaces must be exactly equal",
  );
  assert.deepEqual(
    [...mappedFunctions].sort(),
    inventory.client_functions,
    "all payroll client exports must map to exactly one or more audited capabilities",
  );
  for (const surface of inventory.surface_actions) {
    for (const clientFunction of surface.client_functions) {
      assert.match(client, new RegExp(`export async function ${clientFunction}\\b`));
    }
  }
});
