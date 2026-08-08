import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createFileStorageAdapter } from "../src/storage/file-storage-adapter.js";
import { createLocalStorageAdapter } from "../src/storage/local-storage-adapter.js";
import { DMS_STORAGE_OBJECT_TOO_LARGE, sha256Hex } from "../src/storage/storage-adapter.js";

const TENANT = "tenant-bounded-reader";

async function assertExactAndOverflow(storage, prefix) {
  const exact = Buffer.from("12345678");
  const oversized = Buffer.from("123456789");
  storage.putObject({ tenant_id: TENANT, object_id: `${prefix}-exact`, bytes: exact });
  storage.putObject({ tenant_id: TENANT, object_id: `${prefix}-oversized`, bytes: oversized });

  const observed = await storage.readObjectBounded({
    tenant_id: TENANT,
    object_id: `${prefix}-exact`,
    max_bytes: exact.byteLength,
  });
  assert.equal(observed.byte_size, exact.byteLength);
  assert.equal(observed.sha256, sha256Hex(exact));
  assert.equal(observed.bytes.toString(), exact.toString());

  await assert.rejects(storage.readObjectBounded({
    tenant_id: TENANT,
    object_id: `${prefix}-oversized`,
    max_bytes: exact.byteLength,
  }), (error) => error.code === DMS_STORAGE_OBJECT_TOO_LARGE);
}

test("local bounded reader accepts exact limit and rejects max plus one", async () => {
  await assertExactAndOverflow(createLocalStorageAdapter({ adapter_id: "local-bounded" }), "local");
});

test("file bounded reader accepts exact limit and rejects descriptor before streaming max plus one", async (t) => {
  const rootPath = mkdtempSync(path.join(os.tmpdir(), "lawos-file-bounded-"));
  t.after(() => rmSync(rootPath, { recursive: true, force: true }));
  await assertExactAndOverflow(createFileStorageAdapter({ adapter_id: "file-bounded", rootPath }), "file");
});
