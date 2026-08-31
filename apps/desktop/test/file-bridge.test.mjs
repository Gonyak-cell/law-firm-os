import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  FILE_BRIDGE_AUDIT_MAP,
  FILE_BRIDGE_CHANNELS,
  FileBridgeError,
  registerFileBridgeIpcHandlers
} from "../src/main/fileBridge.js";

test("file bridge suite keeps contract actions, channels, and audit map aligned", async () => {
  const contract = JSON.parse(await readFile(
    new URL("../../../contracts/desktop-file-bridge-contract.json", import.meta.url),
    "utf8"
  ));
  const allowedActionIds = contract.allowed_actions.map((action) => action.id).sort();

  assert.equal(contract.schema, "law-firm-os.desktop.file-bridge-contract.v0.6");
  assert.equal(contract.product, "amic-os");
  assert.deepEqual(allowedActionIds, [
    "attach_document_to_classic_outlook",
    "cancel_file_upload",
    "choose_file_for_upload",
    "clear_temp_cache",
    "file_bridge_status",
    "open_temp_preview",
    "precheck_file_upload",
    "resume_pending_uploads",
    "save_document_as",
    "upload_selected_file"
  ]);
  assert.deepEqual(Object.keys(FILE_BRIDGE_CHANNELS).sort(), [
    "attachDocumentToClassicOutlook",
    "cancelUpload",
    "chooseFileForUpload",
    "openDocumentPreview",
    "precheckUpload",
    "resumePendingUploads",
    "saveDocumentAs",
    "status",
    "uploadSelectedFile"
  ]);
  assert.equal(FILE_BRIDGE_AUDIT_MAP.precheck_file_upload.direction, "upload");
  assert.equal(FILE_BRIDGE_AUDIT_MAP.upload_selected_file.auditEvents.completed, "file_bridge.upload.completed");
  assert.equal(FILE_BRIDGE_AUDIT_MAP.resume_pending_uploads.auditEvents.completed, "file_bridge.upload.resume.completed");
  assert.equal(FILE_BRIDGE_AUDIT_MAP.save_document_as.label, "save-as");
  assert.equal(FILE_BRIDGE_AUDIT_MAP.save_document_as.auditEvents.saveFailed, "file_bridge.download.save-as.failed");
  assert.equal(FILE_BRIDGE_AUDIT_MAP.open_temp_preview.direction, "download");
  assert.equal(FILE_BRIDGE_AUDIT_MAP.attach_document_to_classic_outlook.direction, "download");
  assert.equal(contract.main_process_path_policy.maximum_retention_ms, 300000);
  assert.equal(contract.main_process_path_policy.renderer_visible, false);
});

test("file bridge IPC checks the approved sender, binds a renderer owner, and disposes every handler", async () => {
  const handlers = new Map();
  const ipcMain = {
    handle(channel, handler) {
      handlers.set(channel, handler);
    },
    removeHandler(channel) {
      handlers.delete(channel);
    }
  };
  const calls = [];
  const controller = Object.fromEntries(
    ["status", "precheckUpload", "chooseFileForUpload", "cancelUpload", "uploadSelectedFile", "resumePendingUploads", "saveDocumentAs", "openDocumentPreview", "attachDocumentToClassicOutlook"]
      .map((method) => [method, async (request, owner) => {
        calls.push({ method, request, owner });
        return { method };
      }])
  );
  const registration = registerFileBridgeIpcHandlers({
    ipcMain,
    controller,
    isTrustedSender: (event) => event?.senderFrame?.url === "matter-app://app/index.html"
  });
  const event = {
    sender: { id: 42 },
    senderFrame: { url: "matter-app://app/index.html", routingId: 7 }
  };

  assert.deepEqual([...registration.channels].sort(), Object.values(FILE_BRIDGE_CHANNELS).sort());
  assert.equal(handlers.size, Object.keys(FILE_BRIDGE_CHANNELS).length);
  assert.deepEqual(
    await handlers.get(FILE_BRIDGE_CHANNELS.precheckUpload)(event, { matterId: "matter_001" }),
    { method: "precheckUpload" }
  );
  assert.deepEqual(calls[0], {
    method: "precheckUpload",
    request: { matterId: "matter_001" },
    owner: { ownerId: "web-contents:42:frame:7" }
  });
  await assert.rejects(
    () => handlers.get(FILE_BRIDGE_CHANNELS.status)({
      sender: { id: 42 },
      senderFrame: { url: "https://untrusted.example", routingId: 7 }
    }),
    (error) => error instanceof FileBridgeError && error.code === "UNTRUSTED_RENDERER_IPC_SENDER"
  );

  registration.dispose();
  assert.equal(handlers.size, 0);
});

test("file bridge suite script includes lifecycle, save-as, cleanup, and source validators", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const command = packageJson.scripts["test:file-bridge"];

  assert.match(command, /file-upload-bridge\.test\.mjs/);
  assert.match(command, /file-save-as\.test\.mjs/);
  assert.match(command, /file-preview\.test\.mjs/);
  assert.match(command, /temp-preview-cleanup\.test\.mjs/);
  assert.match(command, /validate-desktop-file-bridge-contract\.mjs/);
  assert.match(command, /validate-matter-desktop-file-bridge\.mjs/);
});
