import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { FileBridgeError, createFileBridgeController } from "../src/main/fileBridge.js";
import { OWNER_A, fakeDialog, inactiveTimer } from "./file-bridge-fixtures.mjs";

const EXACT_BYTES = new Uint8Array([1, 2, 3]);

function previewRequest(overrides = {}) {
  return {
    userActivation: true,
    matterId: "matter_123",
    documentId: "doc_123",
    versionId: "version_123_7",
    fileObjectId: "file_object_123_7",
    sha256: createHash("sha256").update(EXACT_BYTES).digest("hex"),
    byteSize: EXACT_BYTES.byteLength,
    mimeType: "application/pdf",
    suggestedName: "matter-summary.pdf",
    ...overrides,
  };
}

function previewHarness({
  allowed = true,
  providerBytes = EXACT_BYTES,
  openError = null,
} = {}) {
  const order = [];
  const auditEvents = [];
  const fetches = [];
  const completions = [];
  const staged = [];
  const removed = [];
  let disposed = false;
  const previewManager = {
    async stageTempPreview(request) {
      order.push("stage");
      staged.push(request);
      return {
        tempId: "11111111-1111-4111-8111-111111111111",
        name: request.name,
        scope: "amic-os-vault-preview",
        expiresAt: 1_000,
        pathVisibleToRenderer: false,
      };
    },
    async openStagedPreview(request) {
      order.push("open");
      if (openError) {
        const error = new Error(openError);
        error.code = "TEMP_PREVIEW_OPEN_FAILED";
        throw error;
      }
      return {
        tempId: request.tempId,
        name: "matter-summary.pdf",
        scope: "amic-os-vault-preview",
        expiresAt: 1_000,
        pathVisibleToRenderer: false,
      };
    },
    async removeTempPreview(request) {
      order.push("remove");
      removed.push(request);
      return true;
    },
    dispose() {
      disposed = true;
    },
  };
  const controller = createFileBridgeController({
    dialog: fakeDialog(),
    permissionClient: {
      async precheckFileBridgeAction(request) {
        order.push("precheck");
        return allowed
          ? { allowed: true, decisionId: `decision-${request.actionId}` }
          : { allowed: false, reason: "preview_denied" };
      },
    },
    documentProvider: {
      async fetchDocumentForSave(request) {
        order.push("provider");
        fetches.push(request);
        return {
          bytes: providerBytes,
          operationId: "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          exactVersion: request.exactVersion,
          attachmentName: "provider-name.pdf",
        };
      },
      async completeDocumentSave(request) {
        order.push("complete");
        completions.push(request);
        return { state: "delivered" };
      },
    },
    previewManager,
    auditLogger: {
      async record(event) {
        auditEvents.push(event);
      },
    },
    setTimeoutImpl: inactiveTimer,
  });
  return {
    auditEvents,
    completions,
    controller,
    disposed: () => disposed,
    fetches,
    order,
    removed,
    staged,
  };
}

test("corporate preview retains its workspace binding through protected staging and completion", async () => {
  const harness = previewHarness();
  const request = { ...previewRequest(), matterId: null, workspaceId: "workspace-corporate" };
  assert.equal((await harness.controller.openDocumentPreview(request, OWNER_A)).state, "opened");
  assert.equal(harness.fetches[0].workspaceId, request.workspaceId);
  assert.equal(harness.completions[0].workspaceId, request.workspaceId);
  await assert.rejects(harness.controller.openDocumentPreview({ ...request, matterId: "matter-mixed" }, OWNER_A), { code: "INVALID_FILE_BRIDGE_BINDING" });
  assert.equal(harness.staged.length, 1);
  harness.controller.dispose();
});

test("open-document-preview verifies and opens one exact Vault version without exposing bytes or paths", async () => {
  const harness = previewHarness();
  const result = await harness.controller.openDocumentPreview(previewRequest(), OWNER_A);

  assert.deepEqual(harness.order, ["precheck", "provider", "stage", "open", "complete"]);
  assert.equal(harness.fetches[0].actionId, "open_temp_preview");
  assert.equal(harness.fetches[0].documentId, "doc_123");
  assert.equal(harness.fetches[0].exactVersion.version_id, "version_123_7");
  assert.equal(harness.staged[0].ownerId, OWNER_A.ownerId);
  assert.equal(harness.staged[0].bytes, EXACT_BYTES);
  assert.equal(harness.completions[0].operationId, "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(result.state, "opened");
  assert.equal(result.preview.pathVisibleToRenderer, false);
  assert.equal(result.backendDownload.sha256, previewRequest().sha256);
  assert.equal(JSON.stringify(result).includes("nativePath"), false);
  assert.equal(JSON.stringify(result).includes("[1,2,3]"), false);
  assert.equal(
    harness.auditEvents.some((event) => event.eventName === "file_bridge.preview.opened"),
    true,
  );
  assert.deepEqual(harness.controller.status(), {
    ...harness.controller.status(),
    previewAvailable: true,
    previewReady: true,
  });

  harness.controller.dispose();
  assert.equal(harness.disposed(), true);
});

test("open-document-preview rejects changed provider bytes before staging or delivery acknowledgement", async () => {
  const harness = previewHarness({ providerBytes: new Uint8Array([9, 9, 9]) });

  await assert.rejects(
    () => harness.controller.openDocumentPreview(previewRequest(), OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "DOCUMENT_PROVIDER_HASH_MISMATCH",
  );
  assert.deepEqual(harness.order, ["precheck", "provider"]);
  assert.equal(harness.staged.length, 0);
  assert.equal(harness.completions.length, 0);
  assert.equal(
    harness.auditEvents.some((event) => (
      event.eventName === "file_bridge.preview.failed"
      && event.reason === "DOCUMENT_PROVIDER_HASH_MISMATCH"
    )),
    true,
  );
  harness.controller.dispose();
});

test("open-document-preview is explicit, server-authorized, and removes a staged file on open failure", async () => {
  const denied = previewHarness({ allowed: false });
  await assert.rejects(
    () => denied.controller.openDocumentPreview(previewRequest(), OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(denied.order, ["precheck"]);
  denied.controller.dispose();

  const inactive = previewHarness();
  await assert.rejects(
    () => inactive.controller.openDocumentPreview(previewRequest({ userActivation: false }), OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "USER_ACTIVATION_REQUIRED",
  );
  assert.deepEqual(inactive.order, []);
  await assert.rejects(
    () => inactive.controller.openDocumentPreview(previewRequest({ bytes: EXACT_BYTES }), OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "RENDERER_FILE_BYTES_FORBIDDEN",
  );
  assert.deepEqual(inactive.order, []);
  inactive.controller.dispose();

  const failed = previewHarness({ openError: "No application is registered" });
  await assert.rejects(
    () => failed.controller.openDocumentPreview(previewRequest(), OWNER_A),
    (error) => error.code === "TEMP_PREVIEW_OPEN_FAILED",
  );
  assert.deepEqual(failed.order, ["precheck", "provider", "stage", "open", "remove"]);
  assert.deepEqual(failed.removed, [{
    tempId: "11111111-1111-4111-8111-111111111111",
    reason: "preview_failed",
  }]);
  assert.equal(failed.completions.length, 0);
  failed.controller.dispose();
});
