import assert from "node:assert/strict";
import test from "node:test";
import {
  FILE_BRIDGE_MAX_UPLOAD_BYTES,
  FILE_BRIDGE_MAX_DOWNLOAD_BYTES,
  FileBridgeError,
  createFileBridgeController
} from "../src/main/fileBridge.js";
import {
  OWNER_A,
  OWNER_B,
  TEST_FILE_PATH,
  allowedPermissionClient,
  fakeDialog,
  inactiveTimer,
  precheckAndChoose,
  regularStat
} from "./file-bridge-fixtures.mjs";

function uploadHarness({
  allowed = true,
  fileStat = regularStat(),
  openedStat = fileStat,
  uploadProvider,
  now = () => 1000,
  preflightTtlMs,
  handleTtlMs
} = {}) {
  const order = [];
  const auditEvents = [];
  const permissionChecks = [];
  const dialog = fakeDialog();
  const permissionClient = {
    async precheckFileBridgeAction(request) {
      order.push("precheck");
      permissionChecks.push(request);
      return allowed
        ? {
          allowed: true,
          operationId: "server-operation-001",
          maxUploadBytes: FILE_BRIDGE_MAX_UPLOAD_BYTES
        }
        : { allowed: false, reason: "not_matter_member" };
    }
  };
  const originalShowOpenDialog = dialog.showOpenDialog.bind(dialog);
  dialog.showOpenDialog = async (options) => {
    order.push("dialog");
    return originalShowOpenDialog(options);
  };
  const streams = [];
  const openedFiles = [];
  const createOpenedFile = () => {
    const openedFile = {
      closed: false,
      async stat() {
        if (this.closed) throw Object.assign(new Error("file closed"), { code: "EBADF" });
        return openedStat;
      },
      createReadStream(options) {
        assert.deepEqual(options, { autoClose: true, start: 0 });
        const stream = {
          destroyed: false,
          destroy() {
            this.destroyed = true;
            openedFile.closed = true;
          },
        };
        streams.push(stream);
        return stream;
      },
      async close() {
        this.closed = true;
      }
    };
    openedFiles.push(openedFile);
    return openedFile;
  };
  const openedFile = createOpenedFile();
  let openCount = 0;
  const controller = createFileBridgeController({
    dialog,
    permissionClient,
    auditLogger: { async record(event) { auditEvents.push(event); } },
    uploadProvider,
    createPreflightId: () => "file-preflight-001",
    createHandleId: () => "file-handle-001",
    lstatImpl: async () => fileStat,
    openImpl: async (filePath, flags) => {
      assert.equal(filePath, TEST_FILE_PATH);
      assert.equal(flags, "r");
      openCount += 1;
      return openCount === 1 ? openedFile : createOpenedFile();
    },
    now,
    setTimeoutImpl: inactiveTimer,
    preflightTtlMs,
    handleTtlMs
  });
  return {
    auditEvents,
    controller,
    dialog,
    openedFile,
    openedFiles,
    order,
    permissionChecks,
    get stream() { return streams[0]; },
    streams,
  };
}

test("upload preflight precedes the native picker and derives authority only from bound Matter fields", async () => {
  const harness = uploadHarness();
  const result = await precheckAndChoose(harness.controller);

  assert.deepEqual(harness.order, ["precheck", "dialog"]);
  assert.deepEqual(harness.permissionChecks[0], {
    actionId: "precheck_file_upload",
    permission: "file_bridge.upload",
    matterId: "matter_001",
    workspaceId: "workspace_001",
    folderId: null,
    documentId: undefined
  });
  assert.equal(result.state, "selected");
  assert.equal(result.file.handleId, "file-handle-001");
  assert.equal(result.backendUpload.preflightId, "file-preflight-001");
  assert.equal(result.backendUpload.pathVisibleToRenderer, false);
  assert.equal(JSON.stringify(result).includes(TEST_FILE_PATH), false);
  assert.equal(harness.auditEvents.some((event) => event.eventName === "file_bridge.upload.permission_precheck.allowed"), true);
  assert.equal(harness.auditEvents.some((event) => event.eventName === "file_bridge.upload.picker.selected"), true);
  harness.controller.dispose();
});

test("denied upload preflight does not open the native picker", async () => {
  const harness = uploadHarness({ allowed: false });

  await assert.rejects(
    () => harness.controller.precheckUpload({ matterId: "matter_001" }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "PERMISSION_DENIED"
  );

  assert.deepEqual(harness.order, ["precheck"]);
  assert.equal(harness.dialog.openCalls.length, 0);
  assert.equal(harness.auditEvents.some((event) => event.eventName === "file_bridge.upload.permission_precheck.denied"), true);
  harness.controller.dispose();
});

test("upload preflight rejects renderer bytes and renderer-selected authority before the server call", async () => {
  const harness = uploadHarness();

  await assert.rejects(
    () => harness.controller.precheckUpload({
      matterId: "matter_001",
      bytes: new Uint8Array([1, 2, 3])
    }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "RENDERER_FILE_BYTES_FORBIDDEN"
  );
  await assert.rejects(
    () => harness.controller.precheckUpload({
      matterId: "matter_001",
      tenantId: "renderer-tenant"
    }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "RENDERER_AUTHORITY_FIELD_FORBIDDEN"
  );

  assert.deepEqual(harness.order, []);
  assert.equal(harness.permissionChecks.length, 0);
  harness.controller.dispose();
});

test("cancel clears only the opaque handle and never deletes the user's file", async () => {
  const harness = uploadHarness();
  const selected = await precheckAndChoose(harness.controller);

  await assert.rejects(
    () => harness.controller.cancelUpload({ handleId: selected.file.handleId }, OWNER_B),
    (error) => error instanceof FileBridgeError && error.code === "HANDLE_OWNER_MISMATCH"
  );
  const result = await harness.controller.cancelUpload({ handleId: selected.file.handleId }, OWNER_A);

  assert.deepEqual(result, {
    state: "cancelled",
    handleId: "file-handle-001",
    userFileDeleted: false
  });
  assert.equal(harness.controller.lifecycleSnapshotForTest().selectedHandleCount, 0);
  harness.controller.dispose();
});

test("upload streams from a re-opened stable file and returns only an exact safe receipt", async () => {
  const uploads = [];
  let unchangedAfterStreamClose = false;
  const harness = uploadHarness({
    uploadProvider: {
      async uploadSelectedFile(payload) {
        uploads.push(payload);
        const verificationStream = await payload.openStream();
        verificationStream.destroy();
        await payload.assertUnchanged();
        unchangedAfterStreamClose = true;
        return {
          state: "uploaded",
          requestId: "request-001",
          documentId: "document-001",
          versionId: "version-001",
          fileObjectId: "file-object-001",
          sha256: "a".repeat(64),
          byteSize: 4096,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          auditEventId: "audit-001",
          filePath: TEST_FILE_PATH,
          bytes: "must-not-return"
        };
      }
    }
  });
  const selected = await precheckAndChoose(harness.controller);
  const receipt = await harness.controller.uploadSelectedFile({ handleId: selected.file.handleId }, OWNER_A);

  assert.equal(uploads.length, 1);
  assert.equal(uploads[0].stream, harness.stream);
  assert.equal(typeof uploads[0].openStream, "function");
  assert.equal(typeof uploads[0].assertUnchanged, "function");
  assert.equal(unchangedAfterStreamClose, true);
  assert.equal(uploads[0].matterId, "matter_001");
  assert.equal(uploads[0].workspaceId, "workspace_001");
  assert.equal(uploads[0].operationId, "server-operation-001");
  assert.equal(receipt.state, "uploaded");
  assert.equal(receipt.documentId, "document-001");
  assert.equal(receipt.versionId, "version-001");
  assert.equal(receipt.sha256, "a".repeat(64));
  assert.equal(receipt.pathVisibleToRenderer, false);
  assert.equal(JSON.stringify(receipt).includes(TEST_FILE_PATH), false);
  assert.equal(JSON.stringify(receipt).includes("must-not-return"), false);
  assert.equal(harness.stream.destroyed, true);
  assert.equal(harness.openedFile.closed, true);
  assert.equal(harness.openedFiles.every((file) => file.closed), true);
  assert.equal(harness.controller.lifecycleSnapshotForTest().selectedHandleCount, 0);
  harness.controller.dispose();
});

test("concurrent upload requests share one main-process file stream and one Vault commit", async () => {
  let releaseUpload;
  let markUploadEntered;
  let uploadCalls = 0;
  const uploadEntered = new Promise((resolve) => { markUploadEntered = resolve; });
  const uploadRelease = new Promise((resolve) => { releaseUpload = resolve; });
  const exactReceipt = {
    state: "uploaded",
    requestId: "request-concurrent-001",
    documentId: "document-concurrent-001",
    versionId: "version-concurrent-001",
    fileObjectId: "file-object-concurrent-001",
    sha256: "c".repeat(64),
    byteSize: 4096,
    mimeType: "application/pdf",
    auditEventId: "audit-concurrent-001",
  };
  const harness = uploadHarness({
    uploadProvider: {
      async uploadSelectedFile(payload) {
        uploadCalls += 1;
        assert.equal(payload.stream, harness.stream);
        markUploadEntered();
        await uploadRelease;
        return exactReceipt;
      },
    },
  });
  const selected = await precheckAndChoose(harness.controller);
  const request = { handleId: selected.file.handleId };

  const first = harness.controller.uploadSelectedFile(request, OWNER_A);
  await uploadEntered;
  const second = harness.controller.uploadSelectedFile(request, OWNER_A);
  await assert.rejects(
    () => harness.controller.cancelUpload(request, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "HANDLE_IN_FLIGHT",
  );
  assert.equal(harness.controller.lifecycleSnapshotForTest().uploadFlightCount, 1);

  releaseUpload();
  const [firstReceipt, secondReceipt] = await Promise.all([first, second]);

  assert.deepEqual(firstReceipt, secondReceipt);
  assert.equal(uploadCalls, 1);
  assert.equal(harness.auditEvents.filter((event) => (
    event.eventName === "file_bridge.upload.started"
  )).length, 1);
  assert.equal(harness.auditEvents.filter((event) => (
    event.eventName === "file_bridge.upload.completed"
  )).length, 1);
  assert.equal(harness.stream.destroyed, true);
  assert.equal(harness.openedFile.closed, true);
  assert.equal(harness.controller.lifecycleSnapshotForTest().selectedHandleCount, 0);
  assert.equal(harness.controller.lifecycleSnapshotForTest().uploadFlightCount, 0);
  harness.controller.dispose();
});

test("pending upload resume accepts no renderer state and returns no path, filename, or bytes", async () => {
  let resumeCalls = 0;
  const harness = uploadHarness({
    uploadProvider: {
      async uploadSelectedFile() { throw new Error("unexpected upload"); },
      async resumePendingUploads() {
        resumeCalls += 1;
        return [{
          state: "processing",
          operationId: "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          matterId: "matter_001",
          stage: "scanning",
          retryAfterMs: 500,
          sha256: "b".repeat(64),
          byteSize: 4096,
          mimeType: "application/pdf",
          exactReadbackVerified: false,
          filePath: TEST_FILE_PATH,
          filename: "client-contract.pdf",
          bytes: "must-not-return",
        }];
      },
    },
  });
  await assert.rejects(
    () => harness.controller.resumePendingUploads({
      operationId: "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "RESUME_REQUEST_INVALID",
  );
  assert.equal(resumeCalls, 0);

  const [receipt] = await harness.controller.resumePendingUploads({}, OWNER_A);
  assert.equal(resumeCalls, 1);
  assert.equal(receipt.state, "processing");
  assert.equal(receipt.operationId, "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(receipt.pathVisibleToRenderer, false);
  assert.equal(receipt.rawBytesIncluded, false);
  assert.equal(receipt.filenameIncluded, false);
  const serialized = JSON.stringify(receipt);
  assert.equal(serialized.includes(TEST_FILE_PATH), false);
  assert.equal(serialized.includes("client-contract.pdf"), false);
  assert.equal(serialized.includes("must-not-return"), false);
  assert.equal(harness.auditEvents.some((event) => (
    event.eventName === "file_bridge.upload.resume.completed"
  )), true);
  harness.controller.dispose();
});

test("file identity replacement is detected before any upload bytes are handed off", async () => {
  let uploadCalls = 0;
  const harness = uploadHarness({
    openedStat: regularStat({ ino: 99 }),
    uploadProvider: {
      async uploadSelectedFile() {
        uploadCalls += 1;
      }
    }
  });
  const selected = await precheckAndChoose(harness.controller);

  await assert.rejects(
    () => harness.controller.uploadSelectedFile({ handleId: selected.file.handleId }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "SELECTED_FILE_CHANGED"
  );

  assert.equal(uploadCalls, 0);
  assert.equal(harness.controller.lifecycleSnapshotForTest().selectedHandleCount, 0);
  harness.controller.dispose();
});

for (const scenario of [
  {
    name: "symbolic link",
    fileStat: regularStat({ isSymbolicLink: () => true }),
    code: "SELECTED_FILE_TYPE_NOT_ALLOWED"
  },
  {
    name: "directory",
    fileStat: regularStat({ isFile: () => false }),
    code: "SELECTED_FILE_TYPE_NOT_ALLOWED"
  },
  {
    name: "oversized file",
    fileStat: regularStat({ size: FILE_BRIDGE_MAX_UPLOAD_BYTES + 1 }),
    code: "SELECTED_FILE_TOO_LARGE"
  }
]) {
  test(`native picker rejects ${scenario.name} without creating an upload handle`, async () => {
    const harness = uploadHarness({ fileStat: scenario.fileStat });
    const preflight = await harness.controller.precheckUpload({ matterId: "matter_001" }, OWNER_A);

    await assert.rejects(
      () => harness.controller.chooseFileForUpload({
        preflightId: preflight.preflightId,
        userActivation: true
      }, OWNER_A),
      (error) => error instanceof FileBridgeError && error.code === scenario.code
    );

    assert.equal(harness.controller.lifecycleSnapshotForTest().selectedHandleCount, 0);
    harness.controller.dispose();
  });
}

test("preflight and selected handles expire by bounded TTL and dispose clears all remaining state", async () => {
  let currentTime = 1000;
  const harness = uploadHarness({
    now: () => currentTime,
    preflightTtlMs: 10,
    handleTtlMs: 20
  });
  const first = await harness.controller.precheckUpload({ matterId: "matter_001" }, OWNER_A);
  currentTime = 1011;
  await assert.rejects(
    () => harness.controller.chooseFileForUpload({
      preflightId: first.preflightId,
      userActivation: true
    }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "PREFLIGHT_EXPIRED"
  );

  currentTime = 1020;
  const selected = await precheckAndChoose(harness.controller);
  currentTime = 1041;
  await assert.rejects(
    () => harness.controller.cancelUpload({ handleId: selected.file.handleId }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "HANDLE_EXPIRED"
  );

  currentTime = 1050;
  await precheckAndChoose(harness.controller);
  harness.controller.dispose();
  assert.deepEqual(harness.controller.lifecycleSnapshotForTest(), {
    preflightCount: 0,
    selectedHandleCount: 0,
    uploadFlightCount: 0,
    disposed: true
  });
  await assert.rejects(
    () => harness.controller.precheckUpload({ matterId: "matter_001" }, OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "FILE_BRIDGE_DISPOSED"
  );
});

test("active bridge status does not claim upload readiness before transport wiring", () => {
  const controller = createFileBridgeController({
    dialog: fakeDialog(),
    permissionClient: allowedPermissionClient(),
    setTimeoutImpl: inactiveTimer
  });

  assert.deepEqual(controller.status(), {
    state: "available",
    bridgeExposed: true,
    nativePickerAvailable: true,
    preflightAvailable: true,
    uploadAvailable: false,
    uploadReady: false,
    uploadResumeAvailable: false,
    downloadAvailable: false,
    downloadReady: false,
    previewAvailable: false,
    previewReady: false,
    classicOutlookAttachAvailable: false,
    classicOutlookAttachReady: false,
    maxUploadBytes: FILE_BRIDGE_MAX_UPLOAD_BYTES,
    maxDownloadBytes: FILE_BRIDGE_MAX_DOWNLOAD_BYTES,
    preflightTtlMs: 60000,
    handleTtlMs: 300000,
    pathVisibleToRenderer: false,
    fileBytesVisibleToRenderer: false
  });
  controller.dispose();
});
