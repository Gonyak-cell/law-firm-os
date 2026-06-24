import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("packaged renderer presents user-facing connection login and feature checks", async () => {
  const source = await readFile(new URL("../src/renderer/offline.html", import.meta.url), "utf8");

  assert.match(source, /data-matter-desktop-app/);
  assert.match(source, /data-login-email/);
  assert.match(source, /data-login-password/);
  assert.match(source, /data-matter-login/);
  assert.match(source, /window\.matterSession/);
  assert.doesNotMatch(source, /data-account-select|data-reset-token|data-reset-request|data-reset-confirm|새 비밀번호|재설정 토큰/);
  assert.match(source, /matter_vault_admin/);
  assert.match(source, /작업공간 연결됨/);
  assert.match(source, /기능 확인/);
  assert.doesNotMatch(source, /AWS temporary runtime connected|Function smoke|Dashboard smoke|Admin smoke|Runtime unavailable/);
  assert.doesNotMatch(source, /MATTER_VAULT_R4_OPERATOR_TOKEN/);
  assert.doesNotMatch(source, /operatorToken/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
});
