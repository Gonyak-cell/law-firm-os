import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { FileBridgeError, createAtomicDocumentWriter, createFileBridgeController } from "../src/main/fileBridge.js";
import { OWNER_A, fakeDialog, inactiveTimer } from "./file-bridge-fixtures.mjs";

function saveAsHarness({ allowed = true, canceled = false, providerBytes = new Uint8Array([1, 2, 3]) } = {}) {
  const order = [];
  const fetches = [];
  const completions = [];
  const writes = [];
  const auditEvents = [];
  const dialog = fakeDialog();
  dialog.showSaveDialog = async (options) => {
    order.push("dialog");
    dialog.saveCalls.push(options);
    return canceled
      ? { canceled: true }
      : { canceled: false, filePath: resolve("test-output", "vault-export.pdf") };
  };
  const permissionClient = {
    async precheckFileBridgeAction(request) {
      order.push("precheck");
      return allowed
        ? { allowed: true, decisionId: `decision-${request.actionId}` }
        : { allowed: false, reason: "download_denied" };
    }
  };
  const controller = createFileBridgeController({
    dialog,
    permissionClient,
    auditLogger: { async record(event) { auditEvents.push(event); } },
    documentWriter: {
      async writeUserSelectedFile(payload) {
        order.push("writer");
        writes.push(payload);
      }
    },
    documentProvider: {
      async fetchDocumentForSave(payload) {
        order.push("provider");
        fetches.push(payload);
        return {
          bytes: providerBytes,
          operationId: "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          exactVersion: payload.exactVersion,
        };
      },
      async completeDocumentSave(payload) {
        order.push("complete");
        completions.push(payload);
        return { state: "delivered" };
      }
    },
    setTimeoutImpl: inactiveTimer
  });
  return { auditEvents, completions, controller, dialog, fetches, order, providerBytes, writes };
}

function saveRequest(overrides = {}) {
  return {
    userActivation: true,
    documentId: "doc_123",
    versionId: "version_123_7",
    fileObjectId: "file_object_123_7",
    sha256: createHash("sha256").update(new Uint8Array([1, 2, 3])).digest("hex"),
    byteSize: 3,
    mimeType: "application/pdf",
    matterId: "matter_123",
    suggestedName: "matter-summary.pdf",
    ...overrides
  };
}

test("save-document-as fetches bytes in main process before writing the user-selected path", async () => {
  const harness = saveAsHarness();
  const result = await harness.controller.saveDocumentAs(saveRequest(), OWNER_A);

  assert.deepEqual(harness.order, ["precheck", "dialog", "provider", "writer", "complete"]);
  assert.equal(harness.dialog.saveCalls[0].defaultPath, "matter-summary.pdf");
  assert.deepEqual(harness.fetches[0], {
    actionId: "save_document_as",
    documentId: "doc_123",
    matterId: "matter_123",
    exactVersion: {
      document_id: "doc_123",
      version_id: "version_123_7",
      file_object_id: "file_object_123_7",
      sha256: createHash("sha256").update(new Uint8Array([1, 2, 3])).digest("hex"),
      byte_size: 3,
      mime_type: "application/pdf",
    },
    permissionDecisionId: "decision-save_document_as"
  });
  assert.equal(harness.writes[0].filePath, resolve("test-output", "vault-export.pdf"));
  assert.equal(harness.writes[0].documentId, "doc_123");
  assert.equal(harness.writes[0].bytes, harness.providerBytes);
  assert.equal(harness.completions[0].operationId, "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(result.state, "saved");
  assert.equal(result.file.name, "vault-export.pdf");
  assert.equal(result.file.pathVisibleToRenderer, false);
  assert.equal(result.backendDownload.actionId, "save_document_as");
  assert.equal(result.backendDownload.versionId, "version_123_7");
  assert.equal(result.backendDownload.sha256, saveRequest().sha256);
  assert.equal(JSON.stringify(result).includes("test-output"), false);
  assert.equal(harness.auditEvents.some((event) => event.eventName === "file_bridge.download.save-as.completed"), true);
  harness.controller.dispose();
});

test("corporate save-as carries an exclusive workspace through precheck, transfer and completion", async () => {
  const harness = saveAsHarness();
  const request = saveRequest({ matterId: null, workspaceId: "workspace-corporate" });
  assert.equal((await harness.controller.saveDocumentAs(request, OWNER_A)).state, "saved");
  assert.equal(harness.fetches[0].matterId, null);
  assert.equal(harness.fetches[0].workspaceId, request.workspaceId);
  assert.equal(harness.completions[0].workspaceId, request.workspaceId);
  const count = harness.order.length;
  await assert.rejects(harness.controller.saveDocumentAs({ ...request, matterId: "matter-mixed" }, OWNER_A), { code: "INVALID_FILE_BRIDGE_BINDING" });
  assert.equal(harness.order.length, count);
  harness.controller.dispose();
  const cancelled = saveAsHarness({ canceled: true });
  assert.equal((await cancelled.controller.saveDocumentAs(request, OWNER_A)).state, "cancelled");
  assert.equal(cancelled.fetches.length, 0);
  assert.equal(cancelled.completions.length, 0);
  cancelled.controller.dispose();
});

test("save-document-as rejects renderer bytes and renderer-selected tenant before precheck or write", async () => {
  const harness = saveAsHarness();

  await assert.rejects(
    () => harness.controller.saveDocumentAs(saveRequest({ bytes: new Uint8Array([9, 9, 9]) }), OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "RENDERER_FILE_BYTES_FORBIDDEN"
  );
  await assert.rejects(
    () => harness.controller.saveDocumentAs(saveRequest({ tenantId: "renderer-tenant" }), OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "RENDERER_AUTHORITY_FIELD_FORBIDDEN"
  );

  assert.deepEqual(harness.order, []);
  assert.equal(harness.dialog.saveCalls.length, 0);
  assert.equal(harness.fetches.length, 0);
  assert.equal(harness.writes.length, 0);
  harness.controller.dispose();
});

test("save-document-as requires active user interaction and exact Matter/document binding", async () => {
  const harness = saveAsHarness();

  await assert.rejects(
    () => harness.controller.saveDocumentAs({
      documentId: "doc_123",
      versionId: "version_123_7",
      fileObjectId: "file_object_123_7",
      sha256: saveRequest().sha256,
      byteSize: 3,
      mimeType: "application/pdf",
      matterId: "matter_123"
    }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "USER_ACTIVATION_REQUIRED"
  );
  await assert.rejects(
    () => harness.controller.saveDocumentAs({
      userActivation: true,
      documentId: "doc_123",
      versionId: "version_123_7",
      fileObjectId: "file_object_123_7",
      sha256: saveRequest().sha256,
      byteSize: 3,
      mimeType: "application/pdf"
    }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "FILE_BRIDGE_BINDING_REQUIRED"
  );
  assert.deepEqual(harness.order, []);
  harness.controller.dispose();
});

test("save-document-as denied precheck does not open a save dialog", async () => {
  const harness = saveAsHarness({ allowed: false });

  await assert.rejects(
    () => harness.controller.saveDocumentAs(saveRequest(), OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "PERMISSION_DENIED"
  );

  assert.deepEqual(harness.order, ["precheck"]);
  assert.equal(harness.dialog.saveCalls.length, 0);
  assert.equal(harness.writes.length, 0);
  harness.controller.dispose();
});

test("save-document-as cancellation never writes a default path", async () => {
  const harness = saveAsHarness({ canceled: true });
  const result = await harness.controller.saveDocumentAs(saveRequest({ suggestedName: "default.pdf" }), OWNER_A);

  assert.deepEqual(harness.order, ["precheck", "dialog"]);
  assert.equal(result.state, "cancelled");
  assert.equal(harness.writes.length, 0);
  harness.controller.dispose();
});

test("atomic document writer replaces only the user-selected file and removes its private temp file", async () => {
  const root = await mkdtemp(join(tmpdir(), "amic-vault-save-as-"));
  try {
    const destination = join(root, "contract.pdf");
    const bytes = Buffer.from("verified exact bytes\n");
    const writer = createAtomicDocumentWriter();
    const result = await writer.writeUserSelectedFile({ filePath: destination, bytes });
    assert.deepEqual(result, { written: true, byteSize: bytes.byteLength });
    assert.deepEqual(await readFile(destination), bytes);
    assert.deepEqual(await readdir(root), ["contract.pdf"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
