import assert from "node:assert/strict";
import test from "node:test";
import { FileBridgeError, createFileBridgeController } from "../src/main/fileBridge.js";

function uploadHarness({ allowed = true } = {}) {
  const order = [];
  const auditEvents = [];
  const permissionChecks = [];
  const dialog = {
    calls: [],
    async showOpenDialog(options) {
      order.push("dialog");
      this.calls.push(options);
      return { canceled: false, filePaths: ["/Users/example/Documents/settlement.xlsx"] };
    }
  };
  const permissionClient = {
    async precheckFileBridgeAction(request) {
      order.push("precheck");
      permissionChecks.push(request);
      return allowed
        ? { allowed: true, decisionId: "decision-upload-001" }
        : { allowed: false, reason: "not_matter_member" };
    }
  };
  const auditLogger = {
    async record(event) {
      auditEvents.push(event);
    }
  };
  const controller = createFileBridgeController({
    dialog,
    permissionClient,
    auditLogger,
    createHandleId: () => "upload-handle-001"
  });

  return { auditEvents, controller, dialog, order, permissionChecks };
}

test("choose-file-for-upload returns backend metadata only after permission precheck and user selection", async () => {
  const harness = uploadHarness();
  const result = await harness.controller.chooseFileForUpload({
    userGesture: true,
    gestureToken: "gesture:click:upload",
    matterId: "matter_123",
    tenantIdHash: "tenant_hash_001"
  });

  assert.deepEqual(harness.order, ["precheck", "dialog"]);
  assert.equal(harness.permissionChecks[0].actionId, "choose_file_for_upload");
  assert.equal(harness.permissionChecks[0].permission, "file_bridge.upload");
  assert.equal(result.state, "selected");
  assert.equal(result.file.handleId, "upload-handle-001");
  assert.equal(result.file.name, "settlement.xlsx");
  assert.equal(result.backendUpload.handleId, "upload-handle-001");
  assert.equal(result.backendUpload.permissionDecisionId, "decision-upload-001");
  assert.equal(result.backendUpload.pathVisibleToRenderer, false);
  assert.equal(JSON.stringify(result).includes("/Users/example"), false);
  assert.equal(harness.auditEvents.some((event) => event.eventName === "file_bridge.upload.permission_precheck.allowed"), true);
  assert.equal(harness.auditEvents.some((event) => event.eventName === "file_bridge.upload.picker.selected"), true);
});

test("choose-file-for-upload denied precheck does not open picker or return metadata", async () => {
  const harness = uploadHarness({ allowed: false });

  await assert.rejects(
    () =>
      harness.controller.chooseFileForUpload({
        userGesture: true,
        gestureToken: "gesture:click:upload",
        matterId: "matter_123"
      }),
    (error) => error instanceof FileBridgeError && error.code === "PERMISSION_DENIED"
  );

  assert.deepEqual(harness.order, ["precheck"]);
  assert.equal(harness.dialog.calls.length, 0);
  assert.equal(harness.auditEvents.some((event) => event.eventName === "file_bridge.upload.permission_precheck.denied"), true);
});

test("choose-file-for-upload rejects renderer-supplied bytes before precheck or picker", async () => {
  const harness = uploadHarness();

  await assert.rejects(
    () =>
      harness.controller.chooseFileForUpload({
        userGesture: true,
        gestureToken: "gesture:click:upload",
        matterId: "matter_123",
        bytes: new Uint8Array([1, 2, 3])
      }),
    (error) => error instanceof FileBridgeError && error.code === "RENDERER_FILE_BYTES_FORBIDDEN"
  );

  assert.deepEqual(harness.order, []);
  assert.equal(harness.permissionChecks.length, 0);
  assert.equal(harness.dialog.calls.length, 0);
});
