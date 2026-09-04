import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("external read settings exposes one focused key-to-first-sync flow without secret echo", async () => {
  const [surface, utilities, shell] = await Promise.all([
    readFile(resolve(root, "src/components/ExternalReadProviderPanel.jsx"), "utf8"),
    readFile(resolve(root, "src/data/globalUtilities.js"), "utf8"),
    readFile(resolve(root, "src/components/GlobalUtilitySurface.jsx"), "utf8")
  ]);
  assert.match(utilities, /id: "settings-integrations"[\s\S]*label: "외부 데이터 연결"/);
  assert.match(shell, /<ExternalReadProviderPanel key=\{activeId\} \/>/);
  assert.match(surface, /연결 확인 및 저장/);
  assert.match(surface, /type="password"/);
  assert.match(surface, /fetchExternalReadFirstSync/);
  assert.match(surface, /fetchExternalReadLegalEntities/);
  assert.match(surface, /catalog\.legalEntities\.map/);
  assert.doesNotMatch(surface, /pattern="\[A-Za-z0-9\]/);
  assert.match(surface, /setApiKey\(""\)/);
  assert.match(surface, /최신 데이터 다시 읽기/);
  assert.match(surface, /검증 후 키 교체/);
  assert.match(surface, /연결 중지/);
  assert.match(surface, /연결 재개/);
  assert.match(surface, /비밀정보 정리 복구/);
  assert.match(surface, /연결과 키 폐기/);
  assert.match(surface, /checked=\{revokeConfirmed\}/);
  assert.match(surface, /setRotationKey\(""\)/);
  assert.match(surface, /fetchExternalReadLatestSync/);
  assert.doesNotMatch(surface, /Math\.random/);
  assert.doesNotMatch(surface, /credential_ref|secret_ref|공급자 URL/);
});
