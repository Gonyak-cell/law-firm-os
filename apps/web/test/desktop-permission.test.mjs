import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

async function readWebFile(relativePath) {
  return readFile(resolve(webRoot, relativePath), "utf8");
}

test("desktop denied state hides matter row counts, snippets, citations, and metadata", async () => {
  const deniedSource = await readWebFile("src/components/DesktopDeniedState.jsx");
  const mattersSource = await readWebFile("src/components/MattersSurface.jsx");
  const vaultSource = await readWebFile("src/components/VaultSurface.jsx");

  assert.match(deniedSource, /접근 권한이 없습니다/);
  assert.match(deniedSource, /권한이 있는 정보만 표시됩니다/);
  assert.match(mattersSource, /<DesktopDeniedState \/>/);
  assert.match(vaultSource, /<DesktopDeniedState \/>/);
  assert.match(mattersSource, /result\.uiState === "denied"/);
  assert.match(vaultSource, /result\.uiState === "denied"/);
  assert.doesNotMatch(deniedSource, /row counts|snippets|citations|document metadata/i);
  assert.doesNotMatch(deniedSource, /matter_id|document_id|current_version_id|legal_hold_id|storage_pointer/);
});
