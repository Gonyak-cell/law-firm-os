#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import {
  conditionalGlobalItems,
  globalUtilityItems,
  legacyGlobalRoutes,
  resolveGlobalShortcut
} from "../apps/web/src/data/globalUtilities.js";

function read(path) {
  return readFileSync(path, "utf8");
}

function requireText(path, text) {
  assert.match(read(path), new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${path} missing ${text}`);
}

const planPath = "docs/lazycodex/global-ia/lcx-global-ia-tuw-plan-2026-06-29.md";
const ledgerPath = "docs/lazycodex/global-ia/lcx-global-ia-execution-ledger-2026-06-29.json";
const appPath = "apps/web/src/App.jsx";
const shellPath = "apps/web/src/components/Shell.jsx";
const surfacePath = "apps/web/src/components/GlobalUtilitySurface.jsx";
const catalogPath = "apps/web/src/data/globalUtilities.js";
const profilePath = "apps/web/src/components/UserProfileSurface.jsx";
const stylesPath = "apps/web/src/styles.css";

for (const path of [planPath, ledgerPath, appPath, shellPath, surfacePath, catalogPath, profilePath, stylesPath]) {
  assert.equal(existsSync(path), true, `${path} is required`);
}

const ledger = JSON.parse(read(ledgerPath));
assert.equal(ledger.claim_boundary.production_ready, false);
assert.equal(ledger.claim_boundary.production_deployed, false);
assert.equal(ledger.claim_boundary.go_live_approved, false);

const immediateIds = globalUtilityItems.map((item) => item.id);
assert.deepEqual(immediateIds, ["messages", "notifications", "requests", "reports", "settings", "esign"]);
assert.deepEqual(conditionalGlobalItems.map((item) => item.id), ["calendar", "finance", "data-import", "policies"]);

for (const label of [
  "메시지 전송",
  "메시지 자동화",
  "메시지 템플릿",
  "공지사항",
  "Matter 대화",
  "출퇴근 누락 알림",
  "회사 알림 설정",
  "요청 관리",
  "승인 대기함",
  "강제 승인/거절",
  "비용 처리 요청",
  "증명서 발급 요청",
  "Home 대시보드",
  "People 실시간 리포트",
  "Client 보고서",
  "Matter 분석",
  "회사 설정",
  "권한",
  "보안",
  "연동",
  "결제",
  "지원",
  "고급 옵션",
  "태그 관리",
  "전자계약 전송",
  "전자계약 템플릿",
  "서명 진행 상태"
]) {
  assert.ok(
    globalUtilityItems.some((item) => item.sections.some((section) => section.label === label)),
    `immediate global section missing ${label}`
  );
}

for (const { view, section, targetView, targetSection } of legacyGlobalRoutes) {
  const resolved = resolveGlobalShortcut(view, section);
  assert.equal(resolved.view, targetView, `${view}#${section} did not resolve to ${targetView}`);
  assert.equal(resolved.section, targetSection, `${view}#${section} did not resolve to ${targetSection}`);
}

requireText(appPath, "isGlobalUtilityView(view)");
requireText(appPath, "resolveGlobalShortcut(nextView, section)");
requireText(shellPath, "data-global-sidebar-nav");
requireText(shellPath, "isLegacyGlobalRoute(\"people\", child.section)");
requireText(shellPath, "view: \"reports\", section: \"reports-home-dashboard\"");
requireText(shellPath, "view: \"requests\", section: \"requests-review-inbox\"");
requireText(shellPath, "view: \"messages\", section: \"messages-matter-channel\"");
requireText(shellPath, "view: \"data-import\", section: \"data-import-client\"");
requireText(profilePath, "view: \"finance\", section: \"finance-expenses\"");
requireText(surfacePath, "data-global-utility-surface");
requireText(surfacePath, "data-global-decision-required");
requireText(stylesPath, ".global-utility-layer");
requireText(stylesPath, "background: var(--am-surface);");

console.log(JSON.stringify({
  verdict: "PASS",
  program_id: "LCX-GIA",
  immediate_global_surfaces: immediateIds,
  conditional_global_surfaces: conditionalGlobalItems.map((item) => item.id),
  legacy_route_count: legacyGlobalRoutes.length,
  production_ready: ledger.claim_boundary.production_ready,
  go_live_approved: ledger.claim_boundary.go_live_approved
}, null, 2));
