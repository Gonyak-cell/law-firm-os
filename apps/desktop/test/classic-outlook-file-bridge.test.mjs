import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { FileBridgeError, createFileBridgeController } from "../src/main/fileBridge.js";
import { OWNER_A, fakeDialog, inactiveTimer } from "./file-bridge-fixtures.mjs";

const BYTES = Buffer.from("exact classic Outlook bytes\n");
const REQUEST_HANDLE = `classic-outlook-${"3".repeat(32)}`;

function request(overrides = {}) {
  return {
    userActivation: true,
    requestHandle: REQUEST_HANDLE,
    documentId: "document_001",
    versionId: "version_007",
    fileObjectId: "file_object_007",
    sha256: createHash("sha256").update(BYTES).digest("hex"),
    byteSize: BYTES.byteLength,
    mimeType: "application/pdf",
    matterId: "matter_001",
    suggestedName: "contract.pdf",
    ...overrides,
  };
}

function harness({ allowed = true } = {}) {
  const order = [];
  const providerFetches = [];
  const providerCompletions = [];
  const hostDeliveries = [];
  const releases = [];
  const auditEvents = [];
  const claim = Object.freeze({
    requestHandle: REQUEST_HANDLE,
    claimId: "claim-001",
    nonceSha256: "2".repeat(64),
    installationRefSha256: "4".repeat(64),
    composeTargetSha256: "5".repeat(64),
  });
  const controller = createFileBridgeController({
    dialog: fakeDialog(),
    setTimeoutImpl: inactiveTimer,
    permissionClient: {
      async precheckFileBridgeAction(input) {
        order.push("precheck");
        return allowed
          ? { allowed: true, decisionId: `decision-${input.actionId}` }
          : { allowed: false, reason: "attach_denied" };
      },
    },
    documentProvider: {
      async fetchDocumentForSave(input) {
        order.push("provider");
        providerFetches.push(input);
        return {
          bytes: BYTES,
          operationId: "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          operationKind: "attach_outlook",
          exactVersion: input.exactVersion,
          attachmentName: "contract.pdf",
        };
      },
      async completeDocumentSave(input) {
        order.push("complete");
        providerCompletions.push(input);
        return { state: "attached" };
      },
    },
    classicOutlookBridge: {
      claimRequest(requestHandle) {
        order.push("claim");
        assert.equal(requestHandle, REQUEST_HANDLE);
        return claim;
      },
      releaseClaim(input, options) {
        releases.push({ input, options });
        return true;
      },
      async deliverClaim(input, attachment) {
        order.push("host");
        hostDeliveries.push({ input, attachment });
        return {
          state: "attached",
          sha256: attachment.exactVersion.sha256,
          byteSize: attachment.bytes.byteLength,
        };
      },
    },
    auditLogger: { async record(event) { auditEvents.push(event); } },
  });
  return {
    auditEvents,
    controller,
    hostDeliveries,
    order,
    providerCompletions,
    providerFetches,
    releases,
  };
}

test("Classic Outlook attach keeps exact bytes in main and records attached only after the host ack", async () => {
  const state = harness();
  const result = await state.controller.attachDocumentToClassicOutlook(request(), OWNER_A);

  assert.deepEqual(state.order, ["precheck", "claim", "provider", "host", "complete"]);
  assert.equal(state.providerFetches[0].operationKind, "attach_outlook");
  assert.equal(state.providerFetches[0].requestNonceSha256, "2".repeat(64));
  assert.equal(state.providerFetches[0].installationRefSha256, "4".repeat(64));
  assert.equal(state.providerFetches[0].composeTargetSha256, "5".repeat(64));
  assert.equal(state.hostDeliveries[0].attachment.bytes, BYTES);
  assert.equal(state.providerCompletions[0].completionStage, "attached");
  assert.equal(result.state, "attached");
  assert.equal(result.sha256, request().sha256);
  assert.equal(result.pathVisibleToRenderer, false);
  assert.equal(result.rawBytesIncluded, false);
  assert.equal(JSON.stringify(result).includes("nonce"), false);
  assert.equal(JSON.stringify(result).includes("compose"), false);
  assert.equal(state.auditEvents.at(-1).eventName, "file_bridge.outlook-attach.completed");
  state.controller.dispose();
});

test("Classic Outlook attach requires explicit interaction and a live server permission decision", async () => {
  const state = harness({ allowed: false });
  await assert.rejects(
    () => state.controller.attachDocumentToClassicOutlook(request(), OWNER_A),
    (error) => error instanceof FileBridgeError && error.code === "PERMISSION_DENIED",
  );
  assert.deepEqual(state.order, ["precheck"]);

  const active = harness();
  await assert.rejects(
    () => active.controller.attachDocumentToClassicOutlook(
      request({ userActivation: false }),
      OWNER_A,
    ),
    (error) => error instanceof FileBridgeError && error.code === "USER_ACTIVATION_REQUIRED",
  );
  assert.deepEqual(active.order, []);
  state.controller.dispose();
  active.controller.dispose();
});

test("Classic Outlook attach rejects renderer bytes and renderer-selected authority before download", async () => {
  const state = harness();
  await assert.rejects(
    () => state.controller.attachDocumentToClassicOutlook(
      request({ bytes: Buffer.from("renderer") }),
      OWNER_A,
    ),
    (error) => error.code === "RENDERER_FILE_BYTES_FORBIDDEN",
  );
  await assert.rejects(
    () => state.controller.attachDocumentToClassicOutlook(
      request({ installationRefSha256: "9".repeat(64) }),
      OWNER_A,
    ),
    (error) => error.code === "RENDERER_AUTHORITY_FIELD_FORBIDDEN",
  );
  assert.deepEqual(state.order, []);
  state.controller.dispose();
});
