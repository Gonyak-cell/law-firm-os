import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("packaged renderer presents AWS runtime auth gate and apps web product handoff", async () => {
  const source = await readFile(new URL("../src/renderer/offline.html", import.meta.url), "utf8");

  assert.match(source, /data-matter-desktop-app/);
  assert.match(source, /data-reset-request/);
  assert.match(source, /data-reset-confirm/);
  assert.match(source, /data-matter-login/);
  assert.match(source, /productUiTarget/);
  assert.match(source, /web\/index\.html\?desktop=1&view=home&data=live&ctx=allow&splash=1/);
  assert.match(source, /handoffToProductUi/);
  assert.match(source, /window\.matterSession/);
  assert.match(source, /jwsuh@amic\.kr/);
  assert.match(source, /matter_vault_admin/);
  assert.match(source, /AWS temporary runtime connected/);
  assert.doesNotMatch(source, /MATTER_VAULT_R4_OPERATOR_TOKEN/);
  assert.doesNotMatch(source, /operatorToken/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
});
