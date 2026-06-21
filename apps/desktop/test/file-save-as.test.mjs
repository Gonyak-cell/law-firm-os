import assert from "node:assert/strict";
import test from "node:test";
import { FileBridgeError, createFileBridgeController } from "../src/main/fileBridge.js";

function saveAsHarness({ allowed = true, canceled = false, providerBytes = new Uint8Array([1, 2, 3]) } = {}) {
  const order = [];
  const fetches = [];
  const writes = [];
  const auditEvents = [];
  const dialog = {
    calls: [],
    async showSaveDialog(options) {
      order.push("dialog");
      this.calls.push(options);
      return canceled ? { canceled: true } : { canceled: false, filePath: "/Users/example/Downloads/mater-export.pdf" };
    }
  };
  const permissionClient = {
    async precheckFileBridgeAction(request) {
      order.push("precheck");
      return allowed
        ? { allowed: true, decisionId: `decision-${request.actionId}` }
        : { allowed: false, reason: "download_denied" };
    }
  };
  const auditLogger = {
    async record(event) {
      auditEvents.push(event);
    }
  };
  const documentWriter = {
    async writeUserSelectedFile(payload) {
      order.push("writer");
      writes.push(payload);
    }
  };
  const documentProvider = {
    async fetchDocumentForSave(payload) {
      order.push("provider");
      fetches.push(payload);
      return { bytes: providerBytes };
    }
  };

  const controller = createFileBridgeController({
    dialog,
    permissionClient,
    auditLogger,
    documentWriter,
    documentProvider
  });

  return { auditEvents, controller, dialog, fetches, order, providerBytes, writes };
}

test("save-document-as fetches bytes in main process before writing user-selected path", async () => {
  const harness = saveAsHarness();
  const result = await harness.controller.saveDocumentAs({
    userGesture: true,
    gestureToken: "gesture:click:save",
    documentId: "doc_123",
    matterId: "matter_123",
    tenantIdHash: "tenant_hash_001",
    suggestedName: "matter-summary.pdf"
  });

  assert.deepEqual(harness.order, ["precheck", "dialog", "provider", "writer"]);
  assert.equal(harness.dialog.calls[0].defaultPath, "matter-summary.pdf");
  assert.deepEqual(harness.fetches[0], {
    actionId: "save_document_as",
    documentId: "doc_123",
    matterId: "matter_123",
    tenantIdHash: "tenant_hash_001",
    permissionDecisionId: "decision-save_document_as"
  });
  assert.equal(harness.writes[0].filePath, "/Users/example/Downloads/mater-export.pdf");
  assert.equal(harness.writes[0].documentId, "doc_123");
  assert.equal(harness.writes[0].bytes, harness.providerBytes);
  assert.equal(result.state, "saved");
  assert.equal(result.file.name, "mater-export.pdf");
  assert.equal(result.file.pathVisibleToRenderer, false);
  assert.equal(result.backendDownload.actionId, "save_document_as");
  assert.equal(result.backendDownload.permissionDecisionId, "decision-save_document_as");
  assert.equal(JSON.stringify(result).includes("/Users/example"), false);
  assert.equal(harness.auditEvents.some((event) => event.eventName === "file_bridge.download.save-as.completed"), true);
});

test("save-document-as rejects renderer-supplied bytes before precheck dialog or write", async () => {
  const harness = saveAsHarness();

  await assert.rejects(
    () =>
      harness.controller.saveDocumentAs({
        userGesture: true,
        gestureToken: "gesture:click:save",
        documentId: "doc_123",
        bytes: new Uint8Array([9, 9, 9])
      }),
    (error) => error instanceof FileBridgeError && error.code === "RENDERER_FILE_BYTES_FORBIDDEN"
  );

  assert.deepEqual(harness.order, []);
  assert.equal(harness.dialog.calls.length, 0);
  assert.equal(harness.fetches.length, 0);
  assert.equal(harness.writes.length, 0);
});

test("save-document-as denied precheck does not open save dialog or write default path", async () => {
  const harness = saveAsHarness({ allowed: false });

  await assert.rejects(
    () =>
      harness.controller.saveDocumentAs({
        userGesture: true,
        gestureToken: "gesture:click:save",
        documentId: "doc_123"
      }),
    (error) => error instanceof FileBridgeError && error.code === "PERMISSION_DENIED"
  );

  assert.deepEqual(harness.order, ["precheck"]);
  assert.equal(harness.dialog.calls.length, 0);
  assert.equal(harness.writes.length, 0);
});

test("save-document-as cancelled dialog does not write default path silently", async () => {
  const harness = saveAsHarness({ canceled: true });
  const result = await harness.controller.saveDocumentAs({
    userGesture: true,
    gestureToken: "gesture:click:save",
    documentId: "doc_123",
    suggestedName: "default.pdf"
  });

  assert.deepEqual(harness.order, ["precheck", "dialog"]);
  assert.equal(result.state, "cancelled");
  assert.equal(harness.writes.length, 0);
});
