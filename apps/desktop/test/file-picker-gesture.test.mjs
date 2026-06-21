import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FileBridgeError, createFileBridgeController } from "../src/main/fileBridge.js";
import { assertNoRendererDocumentBytes, pickAllowedRequestFields } from "../src/shared/rendererBytePolicy.js";

function fakeDialog(filePath = "/Users/example/Documents/pleading.pdf") {
  return {
    calls: [],
    async showOpenDialog(options) {
      this.calls.push(options);
      return { canceled: false, filePaths: [filePath] };
    }
  };
}

function allowedPermissionClient() {
  return {
    async precheckFileBridgeAction(request) {
      return { allowed: true, decisionId: `decision-${request.actionId}` };
    }
  };
}

test("file picker is blocked without a user gesture", async () => {
  const dialog = fakeDialog();
  const controller = createFileBridgeController({ dialog, createHandleId: () => "handle-001" });

  await assert.rejects(
    () => controller.chooseFileForUpload({ reason: "silent-startup" }),
    (error) => error instanceof FileBridgeError && error.code === "USER_GESTURE_REQUIRED"
  );

  assert.equal(dialog.calls.length, 0);
});

test("file picker opens only after a scoped gesture token", async () => {
  const dialog = fakeDialog();
  const controller = createFileBridgeController({
    dialog,
    permissionClient: allowedPermissionClient(),
    createHandleId: () => "handle-001"
  });
  const result = await controller.chooseFileForUpload({
    userGesture: true,
    gestureToken: "gesture:click:123"
  });

  assert.equal(dialog.calls.length, 1);
  assert.deepEqual(dialog.calls[0].properties, ["openFile"]);
  assert.equal(result.state, "selected");
  assert.equal(result.file.handleId, "handle-001");
  assert.equal(result.file.name, "pleading.pdf");
  assert.equal(result.file.pathVisibleToRenderer, false);
  assert.equal(controller.getSelectedHandleForTest("handle-001").filePath, undefined);
  assert.equal(controller.getSelectedHandleForTest("handle-001").name, "pleading.pdf");
});

test("preload file bridge exposes only allowlisted trusted gesture command", async () => {
  const preloadSource = await readFile(new URL("../src/preload/fileBridge.js", import.meta.url), "utf8");

  assert.match(preloadSource, /PRELOAD_CHANNEL_ALLOWLIST/);
  assert.match(preloadSource, /sanitizeChooseFileForUploadRequest/);
  assert.match(preloadSource, /sanitizeSaveDocumentAsRequest/);
  assert.match(preloadSource, /isTrusted !== true/);
  assert.match(preloadSource, /TRUSTED_GESTURE_TYPES/);
  assert.doesNotMatch(preloadSource, /ipcRenderer\.send/);
  assert.doesNotMatch(preloadSource, /localStorage|sessionStorage|indexedDB/);
});

test("renderer byte policy blocks file bytes and keeps only allowlisted bridge fields", () => {
  assert.throws(
    () => assertNoRendererDocumentBytes({ documentId: "doc_123", documentBytes: new Uint8Array([1]) }),
    /Renderer-supplied document bytes are forbidden/
  );

  assert.deepEqual(
    pickAllowedRequestFields(
      { documentId: "doc_123", matterId: "matter_123", ignored: "drop-me", suggestedName: "matter.pdf" },
      ["documentId", "matterId", "suggestedName"]
    ),
    { documentId: "doc_123", matterId: "matter_123", suggestedName: "matter.pdf" }
  );
});
