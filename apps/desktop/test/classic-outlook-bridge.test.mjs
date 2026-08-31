import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import {
  ClassicOutlookBridgeError,
  createClassicOutlookBridgeController,
  createClassicOutlookPipeTransport,
  encodeClassicOutlookPipeFrame,
  parseClassicOutlookAttachInvocation,
} from "../src/main/broker/classicOutlookBridge.js";

const NOW = Date.parse("2026-08-29T09:00:00.000Z");
const EXACT = Object.freeze({
  document_id: "document_001",
  version_id: "version_007",
  file_object_id: "file_object_007",
  sha256: "a".repeat(64),
  byte_size: 3,
  mime_type: "application/pdf",
});
const ARGV = Object.freeze([
  "matter.exe",
  "--amic-outlook-attach",
  `--amic-outlook-pipe=${"1".repeat(32)}`,
  `--amic-outlook-nonce=${"2".repeat(64)}`,
  `--amic-outlook-request=${"3".repeat(32)}`,
  `--amic-outlook-installation=${"4".repeat(64)}`,
  `--amic-outlook-compose=${"5".repeat(64)}`,
  `--amic-outlook-expires=${NOW + 60_000}`,
]);

test("Classic Outlook invocation accepts only a short-lived Windows click request", () => {
  const parsed = parseClassicOutlookAttachInvocation(ARGV, {
    now: () => NOW,
    platform: "win32",
  });
  assert.equal(parsed.requestHandle, `classic-outlook-${"3".repeat(32)}`);
  assert.equal(parsed.pipeToken, "1".repeat(32));
  assert.equal(parsed.nonceSha256, "2".repeat(64));

  assert.throws(
    () => parseClassicOutlookAttachInvocation(ARGV, { now: () => NOW, platform: "darwin" }),
    (error) => error instanceof ClassicOutlookBridgeError
      && error.code === "CLASSIC_OUTLOOK_WINDOWS_REQUIRED",
  );
  assert.throws(
    () => parseClassicOutlookAttachInvocation(
      ARGV.map((value) => value.startsWith("--amic-outlook-expires=")
        ? `--amic-outlook-expires=${NOW - 1}`
        : value),
      { now: () => NOW, platform: "win32" },
    ),
    (error) => error.code === "CLASSIC_OUTLOOK_INVOCATION_INVALID",
  );
});

test("Classic Outlook controller keeps pipe secrets private and consumes a host-confirmed request once", async () => {
  const calls = [];
  const controller = createClassicOutlookBridgeController({
    now: () => NOW,
    platform: "win32",
    createClaimId: () => "claim-001",
    transport: {
      async attach(input) {
        calls.push(input);
        return {
          state: "attached",
          requestId: input.binding.requestId,
          sha256: input.exactVersion.sha256,
          byteSize: input.bytes.byteLength,
          attachmentName: input.attachmentName,
          pathVisibleToRenderer: false,
          rawBytesIncluded: false,
          tokenMaterialReturned: false,
        };
      },
    },
  });
  const request = controller.acceptArgv(ARGV);
  assert.deepEqual(Object.keys(request).sort(), [
    "exact_version_required",
    "expires_at",
    "raw_bytes_included",
    "raw_path_included",
    "request_handle",
    "source",
    "token_material_returned",
    "type",
  ]);
  assert.equal(JSON.stringify(request).includes("1".repeat(32)), false);
  assert.equal(JSON.stringify(request).includes("2".repeat(64)), false);

  const claim = controller.claimRequest(request.request_handle);
  const result = await controller.deliverClaim(claim, {
    attachmentName: "contract.pdf",
    exactVersion: EXACT,
    bytes: Buffer.from([1, 2, 3]),
  });
  assert.equal(result.state, "attached");
  assert.equal(calls[0].binding.composeTargetSha256, "5".repeat(64));
  assert.equal(controller.status().pendingRequestCount, 0);
  assert.throws(
    () => controller.claimRequest(request.request_handle),
    (error) => error.code === "CLASSIC_OUTLOOK_REQUEST_UNAVAILABLE",
  );
});

test("Classic Outlook frame is length-bound and the transport validates the exact host ack", async () => {
  const binding = parseClassicOutlookAttachInvocation(ARGV, {
    now: () => NOW,
    platform: "win32",
  });
  const frame = encodeClassicOutlookPipeFrame({
    binding,
    attachmentName: "contract.pdf",
    exactVersion: EXACT,
    bytes: Buffer.from([1, 2, 3]),
  });
  assert.equal(frame.subarray(0, 8).toString("ascii"), "AMICVLT1");
  const metadataLength = frame.readUInt32LE(8);
  assert.equal(frame.readBigUInt64LE(12), 3n);
  const metadata = JSON.parse(frame.subarray(20, 20 + metadataLength).toString("utf8"));
  assert.equal(metadata.nonce_sha256, "2".repeat(64));
  assert.equal(metadata.exact_version.version_id, EXACT.version_id);

  class FakeSocket extends EventEmitter {
    setTimeout() {}
    write(value) {
      this.written = value;
      const body = Buffer.from(JSON.stringify({
        protocol_version: "amic-os-classic-outlook-attach.v1",
        state: "attached",
        request_id: binding.requestId,
        sha256: EXACT.sha256,
        byte_size: EXACT.byte_size,
        attachment_name: "contract.pdf",
      }));
      const response = Buffer.alloc(4 + body.byteLength);
      response.writeUInt32LE(body.byteLength, 0);
      body.copy(response, 4);
      queueMicrotask(() => this.emit("data", response));
      return true;
    }
    destroy() { this.destroyed = true; }
  }
  const socket = new FakeSocket();
  const transport = createClassicOutlookPipeTransport({
    connectImpl(pipePath) {
      assert.equal(pipePath, `\\\\.\\pipe\\amic-os-vault-${"1".repeat(32)}`);
      queueMicrotask(() => socket.emit("connect"));
      return socket;
    },
  });
  const result = await transport.attach({
    binding,
    attachmentName: "contract.pdf",
    exactVersion: EXACT,
    bytes: Buffer.from([1, 2, 3]),
  });
  assert.equal(result.state, "attached");
  assert.equal(socket.destroyed, true);
  assert.equal(socket.written.subarray(0, 8).toString("ascii"), "AMICVLT1");
});
