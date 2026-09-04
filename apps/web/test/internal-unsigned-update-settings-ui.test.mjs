import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hash = "a".repeat(64);
const receipt = "b".repeat(64);
let viteServer;
let InternalUnsignedUpdatePanel;
let InternalUnsignedUpdateView;

test.before(async () => {
  viteServer = await createServer({
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: "custom",
    logLevel: "error"
  });
  ({ InternalUnsignedUpdatePanel, InternalUnsignedUpdateView } = await viteServer.ssrLoadModule(
    "/src/components/InternalUnsignedUpdatePanel.jsx"
  ));
});

test.after(async () => {
  await viteServer?.close();
});

function render(status, stageId = null) {
  return renderToStaticMarkup(React.createElement(InternalUnsignedUpdateView, {
    status,
    stageId,
    onCheck() {},
    onStage() {},
    onStageRollback() {},
    onOpen() {},
    onDiscard() {}
  }));
}

test("internal unsigned update is mounted only inside the existing integrations settings surface", async () => {
  const shell = await readFile(resolve(root, "src/components/GlobalUtilitySurface.jsx"), "utf8");
  assert.match(shell, /<ExternalReadProviderPanel key=\{activeId\} \/>[\s\S]*<InternalUnsignedUpdatePanel \/>/);
  assert.equal(renderToStaticMarkup(React.createElement(InternalUnsignedUpdatePanel, { bridge: null })), "");
});

test("update candidate shows only safe verification facts and requires explicit staging", () => {
  const html = render({
    state: "update_available",
    enabled: true,
    version: "0.1.31",
    available_version: "0.1.32",
    artifact_bytes: 12_582_912,
    artifact_sha256: hash,
    receipt_sha256: receipt
  });
  assert.match(html, /현재 버전[\s\S]*0\.1\.31/);
  assert.match(html, /대상 버전[\s\S]*0\.1\.32/);
  assert.match(html, /12 MB/);
  assert.match(html, /aaaaaaaaaaaa…/);
  assert.match(html, /bbbbbbbbbbbb…/);
  assert.match(html, /업데이트 파일 받기/);
  assert.doesNotMatch(html, new RegExp(hash));
  assert.doesNotMatch(html, /(?:href|src)="https?:\/\//);
  assert.doesNotMatch(html, /Users\/|AppData|\\\\/);
});

test("rollback and staged states require separate human actions and explain the Windows warning", () => {
  const rollback = render({
    state: "up_to_date",
    enabled: true,
    version: "0.1.32",
    rollback_available: true,
    rollback_version: "0.1.31"
  });
  assert.match(rollback, /이전 검증 버전 0\.1\.31/);
  assert.match(rollback, /롤백 권한은 한 번만/);
  assert.match(rollback, /이전 검증 버전 준비/);

  const staged = render({
    state: "rollback_staged",
    enabled: true,
    version: "0.1.32",
    available_version: "0.1.31",
    artifact_sha256: hash,
    receipt_sha256: receipt,
    windows_warning_expected: true
  }, "11111111-1111-4111-8111-111111111111");
  assert.match(staged, /Windows에서 게시자를 확인할 수 없다는 경고/);
  assert.match(staged, /게시자 경고를 확인하고 설치 파일 열기/);
  assert.match(staged, /준비한 파일 지우기/);
});

test("pending restart gives a bounded recovery action instead of automatic installation", () => {
  const html = render({
    state: "installer_opened_pending_restart",
    enabled: true,
    version: "0.1.31",
    available_version: "0.1.32",
    operation: "update",
    automatic_installation: false
  });
  assert.match(html, /설치를 끝낸 뒤 AMIC OS를 다시 시작/);
  assert.match(html, /설치를 취소했을 때만 대기 상태 지우기/);
  assert.doesNotMatch(html, /업데이트 파일 받기/);
});

test("full rollback history is presented as an administrator repair boundary", () => {
  const html = render({
    state: "blocked",
    enabled: true,
    version: "0.1.32",
    safe_error_code: "INTERNAL_UPDATE_ROLLBACK_HISTORY_FULL"
  });
  assert.match(html, /사용한 복구 권한 기록이 가득 차/);
  assert.match(html, /관리자 점검이 필요/);
  assert.match(html, /업데이트 확인/);
  assert.doesNotMatch(html, /이전 검증 버전 준비/);
});

test("a successor baseline proof failure is explained without exposing distribution details", () => {
  const html = render({
    state: "blocked",
    enabled: true,
    version: "0.1.32",
    safe_error_code: "INTERNAL_UPDATE_BASELINE_PROOF_INVALID"
  });
  assert.match(html, /서명된 기준 자료를 확인할 수 없어/);
  assert.match(html, /업데이트 확인/);
  assert.doesNotMatch(html, /CloudFront|VersionId|rollback_target/i);
  assert.doesNotMatch(html, /(?:href|src)="https?:\/\//i);
});
