import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

test("packaged renderer presents AWS runtime login and function smoke controls", async () => {
  const source = await readFile(resolve("src/renderer/offline.html"), "utf8");

  assert.match(source, /data-mater-desktop-app/);
  assert.match(source, /data-mater-login/);
  assert.match(source, /jwsuh@amic\.kr/);
  assert.match(source, /matter_vault_admin/);
  assert.match(source, /window\.materSession/);
  assert.match(source, /AWS temporary runtime connected/);
  assert.doesNotMatch(source, /MATTER_VAULT_R4_OPERATOR_TOKEN/);
  assert.doesNotMatch(source, /operatorToken/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
});
