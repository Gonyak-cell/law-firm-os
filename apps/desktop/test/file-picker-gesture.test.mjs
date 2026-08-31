import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { FileBridgeError, createFileBridgeController } from "../src/main/fileBridge.js";
import { assertNoRendererDocumentBytes, pickAllowedRequestFields } from "../src/shared/rendererBytePolicy.js";
import {
  OWNER_A,
  OWNER_B,
  allowedPermissionClient,
  fakeDialog,
  inactiveTimer,
  regularStat
} from "./file-bridge-fixtures.mjs";

function controllerForPicker(options = {}) {
  return createFileBridgeController({
    dialog: options.dialog ?? fakeDialog(),
    permissionClient: options.permissionClient ?? allowedPermissionClient(),
    createPreflightId: () => "file-preflight-001",
    createHandleId: () => "file-handle-001",
    lstatImpl: async () => regularStat(),
    setTimeoutImpl: inactiveTimer
  });
}

test("file picker is blocked without a live browser user activation", async () => {
  const dialog = fakeDialog();
  const controller = controllerForPicker({ dialog });
  const preflight = await controller.precheckUpload({ matterId: "matter_001" }, OWNER_A);

  await assert.rejects(
    () => controller.chooseFileForUpload({ preflightId: preflight.preflightId }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "USER_ACTIVATION_REQUIRED"
  );

  assert.equal(dialog.openCalls.length, 0);
  assert.equal(controller.lifecycleSnapshotForTest().preflightCount, 1);
  controller.dispose();
});

test("file picker opens only after a server-bound preflight and returns metadata without a path", async () => {
  const dialog = fakeDialog();
  const controller = controllerForPicker({ dialog });
  const preflight = await controller.precheckUpload({
    matterId: "matter_001",
    workspaceId: "workspace_001"
  }, OWNER_A);
  const result = await controller.chooseFileForUpload({
    preflightId: preflight.preflightId,
    userActivation: true
  }, OWNER_A);

  assert.equal(dialog.openCalls.length, 1);
  assert.deepEqual(dialog.openCalls[0].properties, ["openFile"]);
  assert.equal(result.state, "selected");
  assert.equal(result.file.handleId, "file-handle-001");
  assert.equal(result.file.name, "settlement.xlsx");
  assert.equal(result.file.size, 4096);
  assert.equal(result.file.mimeType, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal(result.file.pathVisibleToRenderer, false);
  assert.equal(JSON.stringify(result).includes("test-fixtures"), false);
  assert.deepEqual(controller.lifecycleSnapshotForTest(), {
    preflightCount: 0,
    selectedHandleCount: 1,
    uploadFlightCount: 0,
    disposed: false
  });
  controller.dispose();
});

test("preflight ownership cannot be transferred to another renderer", async () => {
  const dialog = fakeDialog();
  const controller = controllerForPicker({ dialog });
  const preflight = await controller.precheckUpload({ matterId: "matter_001" }, OWNER_A);

  await assert.rejects(
    () => controller.chooseFileForUpload({
      preflightId: preflight.preflightId,
      userActivation: true
    }, OWNER_B),
    (error) => error instanceof FileBridgeError && error.code === "PREFLIGHT_OWNER_MISMATCH"
  );

  assert.equal(dialog.openCalls.length, 0);
  controller.dispose();
});

test("active preload exposes only the AMIC file bridge allowlist and checks navigator user activation", async () => {
  const activePreload = await readFile(new URL("../src/preload/session.cjs", import.meta.url), "utf8");
  const sourcePreload = await readFile(new URL("../src/preload/fileBridge.js", import.meta.url), "utf8");

  for (const source of [activePreload, sourcePreload]) {
    assert.match(source, /FILE_BRIDGE_CHANNEL_ALLOWLIST/);
    assert.match(source, /navigator\?\.userActivation\?\.isActive !== true/);
    assert.match(source, /contextBridge\.exposeInMainWorld\("amicFileBridge"/);
    assert.doesNotMatch(source, /contextBridge\.exposeInMainWorld\("materFileBridge"/);
    assert.doesNotMatch(source, /ipcRenderer\.send/);
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB/);
  }
  assert.doesNotMatch(sourcePreload, /tenantId|actorId|idempotencyKey|filePath|absolutePath/);
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
