import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

test("CL-P1-W01-T02 desktop and import runtimes pin the in-process PDF extractor", async () => {
  const [desktop, importData, lock, unpdf] = await Promise.all([
    readJson("../../apps/desktop/package.json"),
    readJson("../../packages/import-data/package.json"),
    readJson("../../package-lock.json"),
    import("unpdf"),
  ]);

  assert.equal(desktop.dependencies?.unpdf, "1.8.0");
  assert.equal(importData.dependencies?.unpdf, "1.8.0");
  assert.equal(lock.packages?.["node_modules/unpdf"]?.version, "1.8.0");
  assert.equal(lock.packages?.["node_modules/unpdf"]?.license, "MIT");
  assert.equal(lock.packages?.["node_modules/unpdf"]?.engines?.node, ">=22");
  assert.equal(typeof unpdf.getDocumentProxy, "function");
});
