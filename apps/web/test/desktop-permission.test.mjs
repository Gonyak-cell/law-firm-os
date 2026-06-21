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

  assert.match(deniedSource, /No row counts, snippets, citations, or document metadata are shown/);
  assert.match(mattersSource, /<DesktopDeniedState resource="matter workspace" \/>/);
  assert.match(vaultSource, /<DesktopDeniedState resource="document workspace" \/>/);
  assert.match(mattersSource, /\{!denied && \(/);
  assert.match(vaultSource, /\{!denied && \(/);
  assert.doesNotMatch(deniedSource, /matter_id|document_id|current_version_id|legal_hold_id|storage_pointer/);
});
