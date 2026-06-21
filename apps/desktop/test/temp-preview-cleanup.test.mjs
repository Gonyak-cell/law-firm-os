import assert from "node:assert/strict";
import test from "node:test";
import { TEMP_PREVIEW_SCOPE, TempPreviewError, createMemoryTempPreviewStorage, createTempPreviewManager } from "../src/main/tempPreview.js";

function allowedPermissionClient() {
  return {
    async precheckFileBridgeAction(request) {
      return { allowed: true, decisionId: `decision-${request.actionId}` };
    }
  };
}

function deniedPermissionClient() {
  return {
    async precheckFileBridgeAction() {
      return { allowed: false, reason: "preview_denied" };
    }
  };
}

function documentProvider(bytes = new Uint8Array([1, 2, 3])) {
  return {
    fetches: [],
    async fetchDocumentForPreview(request) {
      this.fetches.push(request);
      return { bytes };
    }
  };
}

test("temp preview files are scoped and time bounded", async () => {
  let currentTime = 1_000;
  const storage = createMemoryTempPreviewStorage();
  const provider = documentProvider();
  const manager = createTempPreviewManager({
    storage,
    now: () => currentTime,
    ttlMs: 50,
    createTempId: () => "preview-001",
    permissionClient: allowedPermissionClient(),
    documentProvider: provider
  });

  const result = await manager.openTempPreview({
    tenantIdHash: "tenant_hash_001",
    documentId: "doc_123",
    name: "motion.pdf"
  });

  assert.equal(result.state, "opened");
  assert.equal(result.preview.scope, TEMP_PREVIEW_SCOPE);
  assert.equal(result.preview.expiresAt, 1_050);
  assert.equal(result.preview.pathVisibleToRenderer, false);
  assert.equal(storage.snapshot().length, 1);
  assert.deepEqual(provider.fetches[0], {
    actionId: "open_temp_preview",
    documentId: "doc_123",
    matterId: undefined,
    tenantIdHash: "tenant_hash_001",
    permissionDecisionId: "decision-open_temp_preview"
  });

  currentTime = 1_051;
  const sweep = await manager.sweepExpiredPreviews();
  assert.equal(sweep.removed, 1);
  assert.equal(storage.snapshot().length, 0);
});

test("temp preview denied precheck does not create scoped file", async () => {
  const storage = createMemoryTempPreviewStorage();
  const manager = createTempPreviewManager({
    storage,
    createTempId: () => "preview-001",
    permissionClient: deniedPermissionClient()
  });

  await assert.rejects(
    () => manager.openTempPreview({ documentId: "doc_123" }),
    (error) => error instanceof TempPreviewError && error.code === "PERMISSION_DENIED"
  );

  assert.equal(storage.snapshot().length, 0);
});

test("temp preview cache is removed on logout tenant switch and app quit", async () => {
  let id = 0;
  const storage = createMemoryTempPreviewStorage();
  const provider = documentProvider();
  const manager = createTempPreviewManager({
    storage,
    createTempId: () => `preview-${++id}`,
    permissionClient: allowedPermissionClient(),
    documentProvider: provider
  });

  await manager.openTempPreview({ tenantIdHash: "tenant_a", documentId: "doc_logout" });
  assert.equal((await manager.handleLogout()).removed, 1);
  assert.equal(storage.snapshot().length, 0);

  await manager.openTempPreview({ tenantIdHash: "tenant_a", documentId: "doc_switch" });
  assert.equal((await manager.handleTenantSwitch()).removed, 1);
  assert.equal(storage.snapshot().length, 0);

  await manager.openTempPreview({ tenantIdHash: "tenant_a", documentId: "doc_quit" });
  assert.equal((await manager.handleAppQuit()).removed, 1);
  assert.equal(storage.snapshot().length, 0);
});

test("temp preview rejects renderer-supplied bytes before permission precheck creates a file", async () => {
  const storage = createMemoryTempPreviewStorage();
  const provider = documentProvider();
  const manager = createTempPreviewManager({
    storage,
    createTempId: () => "preview-001",
    permissionClient: allowedPermissionClient(),
    documentProvider: provider
  });

  await assert.rejects(
    () => manager.openTempPreview({ documentId: "doc_123", bytes: new Uint8Array([1, 2, 3]) }),
    (error) => error instanceof TempPreviewError && error.code === "RENDERER_FILE_BYTES_FORBIDDEN"
  );

  assert.equal(storage.snapshot().length, 0);
  assert.equal(provider.fetches.length, 0);
});
