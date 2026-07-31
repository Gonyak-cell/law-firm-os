import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function source(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

test("LV-07 mounts receipt-backed integration status in the existing usage screen", async () => {
  const [peopleHome, usage, requestPage, deliveryState, client, styles] = await Promise.all([
    source("src/people/PeopleHome.tsx"),
    source("src/people/leave/LeaveUsagePage.tsx"),
    source("src/people/leave/LeaveRequestPage.tsx"),
    source("src/people/leave/providerDeliveryState.ts"),
    source("src/people/hrxApiClient.ts"),
    source("src/styles.css"),
  ]);
  assert.match(peopleHome, /<LeaveUsagePage canExport=\{canExportLeaveReport\} canProcessIntegrations=\{canManageLeavePolicy\}/);
  assert.match(usage, /data-leave-integration-status="true"/);
  assert.match(usage, /retryHrxLeaveIntegrationDeadLetter/);
  assert.match(usage, /number\(integrationSummary, "dead_lettered"\)/);
  assert.match(usage, /className="leave-integration-retry"/);
  assert.match(usage, /visibleIntegrationRows/);
  assert.match(usage, /dead_letter as Row \| null, "state"\) === "open"/);
  assert.match(usage, /hasIntegrationActivity/);
  assert.match(usage, /data-delivery-result-state=\{resultState\}/);
  assert.match(usage, /providerDeliveryLabel\(resultState\)/);
  assert.match(usage, /integrationCreatedAt\(row\)/);
  assert.match(usage, /INTEGRATION_STATE_LABELS\[text\(row, "state"\)\]/);
  assert.doesNotMatch(usage, /provider_receipt_ref|payload_json|recipient_token/);
  assert.doesNotMatch(usage, /연결됨/);
  assert.doesNotMatch(usage, /일정·출퇴근·급여·알림의 전달 확인 상태|외부 공급자는 전달 확인값이 기록되기 전까지 완료로 표시하지 않으며|아직 처리할 휴가 연동 이벤트가 없습니다/);
  assert.match(usage, /pending_sync/);
  for (const label of ["처리 대기", "발송됨", "전달 확인", "열람 확인", "실패", "확인 필요"]) {
    assert.match(deliveryState, new RegExp(label));
  }
  assert.match(deliveryState, /providerKind === "notification"/);
  assert.match(client, /requestJson\("\/api\/hrx\/leave\/integrations"\)/);
  assert.match(client, /requestJson\("\/api\/hrx\/leave\/integrations\/process"/);
  assert.match(client, /\/api\/hrx\/leave\/integrations\/dead-letters\/\$\{encodeURIComponent\(deadLetterId\)\}\/retry/);
  assert.match(requestPage, /cancelled_after_approval/);
  assert.match(requestPage, /승인 휴가 취소/);
  assert.match(styles, /\.leave-integration-status/);
  assert.match(styles, /\.leave-integration-summary\s*\{[\s\S]{0,220}display: flex;/);
  assert.match(styles, /\.leave-integration-row-meta\s*\{[\s\S]{0,160}flex-wrap: wrap/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.leave-integration-head,[\s\S]*flex-direction: column/);
});
