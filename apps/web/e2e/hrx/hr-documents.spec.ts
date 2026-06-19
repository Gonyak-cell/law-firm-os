import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readWebFile(path) {
  return readFile(resolve(root, path), "utf8");
}

test("HR document workspace renders metadata and source refs without document body fields", async () => {
  const documents = await readWebFile("src/people/documents/HRDocumentWorkspace.tsx");
  const api = await readWebFile("src/people/hrxApiClient.ts");

  assert.match(documents, /fetchHrxDocuments/);
  assert.match(api, /\/api\/hrx\/documents/);
  assert.match(documents, /Source Ref/);
  assert.match(documents, /document\.source_ref/);
  assert.doesNotMatch(documents, /document\.body|document_body|content_text/);
});
