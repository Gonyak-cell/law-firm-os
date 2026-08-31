import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  TEMP_PREVIEW_DIRECTORY,
  TEMP_PREVIEW_CLEANUP_RETRY_MS,
  TEMP_PREVIEW_SCOPE,
  TempPreviewError,
  createFileSystemTempPreviewStorage,
  createMemoryTempPreviewStorage,
  createTempPreviewManager,
  previewExtensionForMimeType,
} from "../src/main/tempPreview.js";

const OWNER_A = "web-contents:1:frame:0";
const OWNER_B = "web-contents:2:frame:0";
const PDF_MIME = "application/pdf";

function inactiveTimer() {
  return { unref() {} };
}

async function memoryManager(overrides = {}) {
  const storage = overrides.storage ?? createMemoryTempPreviewStorage();
  const manager = createTempPreviewManager({
    storage,
    ttlMs: 50,
    createTempId: () => "11111111-1111-4111-8111-111111111111",
    setTimeoutImpl: inactiveTimer,
    ...overrides,
  });
  await manager.initialize();
  return { manager, storage };
}

test("temp preview stages main-process bytes with an owner and never returns a native path", async () => {
  let currentTime = 1_000;
  const opened = [];
  const { manager, storage } = await memoryManager({
    now: () => currentTime,
    openPreview: async (nativePath) => {
      opened.push(nativePath);
      return "";
    },
  });

  const staged = await manager.stageTempPreview({
    bytes: new Uint8Array([1, 2, 3]),
    name: "motion.pdf",
    ownerId: OWNER_A,
    documentId: "doc_123",
    versionId: "version_7",
    mimeType: PDF_MIME,
  });
  const result = await manager.openStagedPreview({ tempId: staged.tempId, ownerId: OWNER_A });

  assert.equal(result.scope, TEMP_PREVIEW_SCOPE);
  assert.equal(result.expiresAt, 1_050);
  assert.equal(result.pathVisibleToRenderer, false);
  assert.equal(Object.hasOwn(result, "nativePath"), false);
  assert.equal(JSON.stringify(result).includes("memory://"), false);
  assert.deepEqual(opened, ["memory://11111111-1111-4111-8111-111111111111"]);
  assert.equal(storage.snapshot()[0].byteSize, 3);

  currentTime = 1_051;
  assert.deepEqual(await manager.sweepExpiredPreviews(), { removed: 1 });
  assert.equal(storage.snapshot().length, 0);
});

test("temp preview enforces owner, supported type, and expiration before opening", async () => {
  let currentTime = 1_000;
  let openCount = 0;
  const { manager, storage } = await memoryManager({
    now: () => currentTime,
    openPreview: async () => {
      openCount += 1;
      return "";
    },
  });
  const staged = await manager.stageTempPreview({
    bytes: new Uint8Array([1]),
    name: "motion.pdf",
    ownerId: OWNER_A,
    documentId: "doc_123",
    versionId: "version_7",
    mimeType: PDF_MIME,
  });

  await assert.rejects(
    () => manager.openStagedPreview({ tempId: staged.tempId, ownerId: OWNER_B }),
    (error) => error instanceof TempPreviewError && error.code === "TEMP_PREVIEW_OWNER_MISMATCH",
  );
  await assert.rejects(
    () => manager.stageTempPreview({
      bytes: new Uint8Array([1]),
      name: "archive.zip",
      ownerId: OWNER_A,
      documentId: "doc_123",
      versionId: "version_7",
      mimeType: "application/zip",
    }),
    (error) => error instanceof TempPreviewError && error.code === "TEMP_PREVIEW_TYPE_UNSUPPORTED",
  );
  currentTime = 1_051;
  await assert.rejects(
    () => manager.openStagedPreview({ tempId: staged.tempId, ownerId: OWNER_A }),
    (error) => error instanceof TempPreviewError && error.code === "TEMP_PREVIEW_EXPIRED",
  );
  assert.equal(openCount, 0);
  assert.equal(storage.snapshot().length, 0);
});

test("temp preview cache is removed on login cache clear, logout, tenant switch, and app quit", async () => {
  let id = 0;
  const { manager, storage } = await memoryManager({
    createTempId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
  });
  const stage = () => manager.stageTempPreview({
    bytes: new Uint8Array([1]),
    name: "motion.pdf",
    ownerId: OWNER_A,
    documentId: "doc_123",
    versionId: `version_${id + 1}`,
    mimeType: PDF_MIME,
  });

  await stage();
  assert.equal((await manager.clear()).removed, 1);
  await stage();
  assert.equal((await manager.handleLogout()).removed, 1);
  await stage();
  assert.equal((await manager.handleTenantSwitch()).removed, 1);
  await stage();
  assert.equal((await manager.handleAppQuit()).removed, 1);
  assert.equal(storage.snapshot().length, 0);
});

test("temp preview cleanup retains ownership and retries when a native app temporarily locks the file", async () => {
  let locked = true;
  const scheduled = [];
  const storage = {
    async initialize() {},
    async createScopedTempFile(entry) {
      return {
        tempId: entry.tempId,
        name: entry.name,
        scope: TEMP_PREVIEW_SCOPE,
        nativePath: "/protected/preview.pdf",
      };
    },
    async removeTempFile() {
      if (locked) {
        const error = new Error("locked");
        error.code = "EPERM";
        throw error;
      }
    },
    async clear() {},
    clearSync() {},
  };
  const manager = createTempPreviewManager({
    storage,
    createTempId: () => "44444444-4444-4444-8444-444444444444",
    setTimeoutImpl(callback, delay) {
      scheduled.push({ callback, delay });
      return { unref() {} };
    },
    clearTimeoutImpl() {},
  });
  await manager.initialize();
  const staged = await manager.stageTempPreview({
    bytes: Buffer.from("verified"),
    name: "motion.pdf",
    ownerId: OWNER_A,
    documentId: "doc_123",
    versionId: "version_7",
    mimeType: PDF_MIME,
  });

  await assert.rejects(
    () => manager.removeTempPreview({ tempId: staged.tempId, reason: "ttl_expired" }),
    { code: "EPERM" },
  );
  assert.equal(manager.snapshotForTest().length, 1);
  assert.equal(scheduled.at(-1).delay, TEMP_PREVIEW_CLEANUP_RETRY_MS);

  locked = false;
  scheduled.at(-1).callback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(manager.snapshotForTest().length, 0);
});

test("filesystem preview storage wipes crash residue, uses private modes, and deletes only its owned root", async () => {
  const basePath = await mkdtemp(join(tmpdir(), "amic-os-preview-test-"));
  const ownedRoot = join(basePath, TEMP_PREVIEW_DIRECTORY);
  const unrelatedPath = join(basePath, "keep-me.txt");
  try {
    await mkdir(ownedRoot, { mode: 0o700 });
    await writeFile(join(ownedRoot, "crash-residue.pdf"), "old");
    await writeFile(unrelatedPath, "keep");
    const storage = createFileSystemTempPreviewStorage({ basePath });
    const manager = createTempPreviewManager({
      storage,
      createTempId: () => "22222222-2222-4222-8222-222222222222",
      setTimeoutImpl: inactiveTimer,
    });

    await manager.initialize();
    await assert.rejects(() => readFile(join(ownedRoot, "crash-residue.pdf")), { code: "ENOENT" });
    if (process.platform !== "win32") {
      assert.equal((await lstat(ownedRoot)).mode & 0o777, 0o700);
    }
    await manager.stageTempPreview({
      bytes: Buffer.from("verified"),
      name: "motion.pdf",
      ownerId: OWNER_A,
      documentId: "doc_123",
      versionId: "version_7",
      mimeType: PDF_MIME,
    });
    const nativePath = join(ownedRoot, "22222222-2222-4222-8222-222222222222.pdf");
    assert.deepEqual(await readFile(nativePath), Buffer.from("verified"));
    if (process.platform !== "win32") {
      assert.equal((await lstat(nativePath)).mode & 0o777, 0o600);
    }

    manager.dispose();
    await assert.rejects(() => lstat(ownedRoot), { code: "ENOENT" });
    assert.equal(String(await readFile(unrelatedPath)), "keep");
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});

test("filesystem preview storage refuses a symbolic-link owned root", async (t) => {
  if (process.platform === "win32") return t.skip("symbolic-link setup requires platform privileges on Windows");
  const basePath = await mkdtemp(join(tmpdir(), "amic-os-preview-link-test-"));
  const targetPath = await mkdtemp(join(tmpdir(), "amic-os-preview-link-target-"));
  const ownedRoot = join(basePath, TEMP_PREVIEW_DIRECTORY);
  try {
    const { symlink } = await import("node:fs/promises");
    await symlink(targetPath, ownedRoot);
    const storage = createFileSystemTempPreviewStorage({ basePath });
    await assert.rejects(
      () => storage.initialize(),
      (error) => error instanceof TempPreviewError && error.code === "TEMP_PREVIEW_ROOT_UNSAFE",
    );
  } finally {
    await rm(basePath, { recursive: true, force: true });
    await rm(targetPath, { recursive: true, force: true });
  }
});

test("preview MIME mapping is a fixed allowlist", () => {
  assert.equal(previewExtensionForMimeType("application/pdf"), ".pdf");
  assert.equal(previewExtensionForMimeType("APPLICATION/PDF"), ".pdf");
  assert.equal(previewExtensionForMimeType("application/zip"), null);
  assert.equal(previewExtensionForMimeType("../application/pdf"), null);
});
