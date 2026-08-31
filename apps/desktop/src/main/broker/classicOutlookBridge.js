import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";

export const CLASSIC_OUTLOOK_ATTACH_REQUEST_CHANNEL =
  "desktop:classic-outlook-attach:requested";
export const CLASSIC_OUTLOOK_ATTACH_TTL_MS = 5 * 60 * 1000;
export const CLASSIC_OUTLOOK_PIPE_MAX_METADATA_BYTES = 16 * 1024;
export const CLASSIC_OUTLOOK_PIPE_MAX_RESPONSE_BYTES = 8 * 1024;
export const CLASSIC_OUTLOOK_PIPE_MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const ATTACH_MARKER = "--amic-outlook-attach";
const ARGUMENTS = Object.freeze({
  pipeToken: "--amic-outlook-pipe",
  nonceSha256: "--amic-outlook-nonce",
  requestId: "--amic-outlook-request",
  installationRefSha256: "--amic-outlook-installation",
  composeTargetSha256: "--amic-outlook-compose",
  expiresAt: "--amic-outlook-expires",
});
const HEX_128 = /^[a-f0-9]{32}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_REQUEST_HANDLE = /^classic-outlook-[a-f0-9]{32}$/u;
const SAFE_ATTACHMENT_NAME = /^[^\\/\u0000-\u001f\u007f]{1,240}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const PIPE_MAGIC = Buffer.from("AMICVLT1", "ascii");

export class ClassicOutlookBridgeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ClassicOutlookBridgeError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ClassicOutlookBridgeError(code, message);
}

function argumentValue(argv, name) {
  const prefix = `${name}=`;
  const values = argv
    .filter((value) => typeof value === "string" && value.startsWith(prefix))
    .map((value) => value.slice(prefix.length));
  return values.length === 1 ? values[0] : null;
}

function containsAttachMarker(argv) {
  return argv.some((value) => value === ATTACH_MARKER || value === `${ATTACH_MARKER}=1`);
}

export function parseClassicOutlookAttachInvocation(argv = [], {
  now = Date.now,
  platform = process.platform,
} = {}) {
  if (!Array.isArray(argv) || !containsAttachMarker(argv)) return null;
  if (platform !== "win32") {
    fail("CLASSIC_OUTLOOK_WINDOWS_REQUIRED", "Classic Outlook attachment invocation requires Windows");
  }
  const input = Object.fromEntries(
    Object.entries(ARGUMENTS).map(([key, name]) => [key, argumentValue(argv, name)]),
  );
  const expiresAt = Number(input.expiresAt);
  if (!HEX_128.test(input.pipeToken ?? "")
      || !SHA256.test(input.nonceSha256 ?? "")
      || !HEX_128.test(input.requestId ?? "")
      || !SHA256.test(input.installationRefSha256 ?? "")
      || !SHA256.test(input.composeTargetSha256 ?? "")
      || !Number.isSafeInteger(expiresAt)
      || expiresAt <= now()
      || expiresAt > now() + CLASSIC_OUTLOOK_ATTACH_TTL_MS) {
    fail("CLASSIC_OUTLOOK_INVOCATION_INVALID", "Classic Outlook attachment invocation is invalid or expired");
  }
  return Object.freeze({
    pipeToken: input.pipeToken,
    nonceSha256: input.nonceSha256,
    requestId: input.requestId,
    requestHandle: `classic-outlook-${input.requestId}`,
    installationRefSha256: input.installationRefSha256,
    composeTargetSha256: input.composeTargetSha256,
    expiresAt,
  });
}

function publicRequest(binding) {
  return Object.freeze({
    type: "classic_outlook_attach_request",
    request_handle: binding.requestHandle,
    expires_at: new Date(binding.expiresAt).toISOString(),
    source: "classic_outlook_compose",
    exact_version_required: true,
    raw_path_included: false,
    raw_bytes_included: false,
    token_material_returned: false,
  });
}

function normalizedExactVersion(value = {}) {
  const exact = Object.freeze({
    document_id: value.document_id,
    version_id: value.version_id,
    file_object_id: value.file_object_id,
    sha256: value.sha256,
    byte_size: Number(value.byte_size),
    mime_type: typeof value.mime_type === "string" ? value.mime_type.toLowerCase() : "",
  });
  if (!SAFE_ID.test(exact.document_id ?? "")
      || !SAFE_ID.test(exact.version_id ?? "")
      || !SAFE_ID.test(exact.file_object_id ?? "")
      || !SHA256.test(exact.sha256 ?? "")
      || !Number.isSafeInteger(exact.byte_size)
      || exact.byte_size < 1
      || exact.byte_size > CLASSIC_OUTLOOK_PIPE_MAX_DOCUMENT_BYTES
      || !MIME_TYPE.test(exact.mime_type)) {
    fail("CLASSIC_OUTLOOK_EXACT_VERSION_INVALID", "Classic Outlook exact version binding is invalid");
  }
  return exact;
}

function normalizedAttachment({ attachmentName, bytes, exactVersion }) {
  if (typeof attachmentName !== "string"
      || attachmentName !== attachmentName.normalize("NFC").trim()
      || !SAFE_ATTACHMENT_NAME.test(attachmentName)) {
    fail("CLASSIC_OUTLOOK_ATTACHMENT_NAME_INVALID", "Classic Outlook attachment name is invalid");
  }
  if (!Buffer.isBuffer(bytes) || bytes.byteLength !== exactVersion.byte_size) {
    fail("CLASSIC_OUTLOOK_ATTACHMENT_BYTES_INVALID", "Classic Outlook attachment bytes are invalid");
  }
  return Object.freeze({ attachmentName, bytes, exactVersion });
}

export function encodeClassicOutlookPipeFrame({ binding, attachmentName, exactVersion, bytes } = {}) {
  const exact = normalizedExactVersion(exactVersion);
  const attachment = normalizedAttachment({ attachmentName, bytes, exactVersion: exact });
  const metadata = Buffer.from(JSON.stringify({
    protocol_version: "amic-os-classic-outlook-attach.v1",
    request_id: binding.requestId,
    nonce_sha256: binding.nonceSha256,
    installation_ref_sha256: binding.installationRefSha256,
    compose_target_sha256: binding.composeTargetSha256,
    attachment_name: attachment.attachmentName,
    exact_version: exact,
  }), "utf8");
  if (metadata.byteLength < 1 || metadata.byteLength > CLASSIC_OUTLOOK_PIPE_MAX_METADATA_BYTES) {
    fail("CLASSIC_OUTLOOK_METADATA_INVALID", "Classic Outlook attachment metadata exceeds its boundary");
  }
  const header = Buffer.alloc(PIPE_MAGIC.byteLength + 4 + 8);
  PIPE_MAGIC.copy(header, 0);
  header.writeUInt32LE(metadata.byteLength, PIPE_MAGIC.byteLength);
  header.writeBigUInt64LE(BigInt(attachment.bytes.byteLength), PIPE_MAGIC.byteLength + 4);
  return Buffer.concat([header, metadata, attachment.bytes]);
}

function safeResponse(value, { binding, attachment }) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || value.protocol_version !== "amic-os-classic-outlook-attach.v1"
      || value.state !== "attached"
      || value.request_id !== binding.requestId
      || value.sha256 !== attachment.exactVersion.sha256
      || value.byte_size !== attachment.exactVersion.byte_size
      || value.attachment_name !== attachment.attachmentName) {
    fail("CLASSIC_OUTLOOK_HOST_ACK_INVALID", "Classic Outlook host acknowledgement is invalid");
  }
  return Object.freeze({
    state: "attached",
    requestId: binding.requestId,
    sha256: value.sha256,
    byteSize: value.byte_size,
    attachmentName: value.attachment_name,
    pathVisibleToRenderer: false,
    rawBytesIncluded: false,
    tokenMaterialReturned: false,
  });
}

function readPipeResponse(socket, { binding, attachment, timeoutMs }) {
  return new Promise((resolve, reject) => {
    let buffered = Buffer.alloc(0);
    let expectedLength = null;
    const cleanup = () => {
      socket.removeListener("data", onData);
      socket.removeListener("error", onError);
      socket.removeListener("close", onClose);
      socket.removeListener("timeout", onTimeout);
    };
    const finish = (error, value) => {
      cleanup();
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };
    const onError = () => finish(new ClassicOutlookBridgeError(
      "CLASSIC_OUTLOOK_PIPE_FAILED",
      "Classic Outlook pipe failed",
    ));
    const onClose = () => {
      if (expectedLength == null || buffered.byteLength < expectedLength + 4) onError();
    };
    const onTimeout = () => finish(new ClassicOutlookBridgeError(
      "CLASSIC_OUTLOOK_PIPE_TIMEOUT",
      "Classic Outlook pipe timed out",
    ));
    const onData = (chunk) => {
      buffered = Buffer.concat([buffered, Buffer.from(chunk)]);
      if (expectedLength == null && buffered.byteLength >= 4) {
        expectedLength = buffered.readUInt32LE(0);
        if (expectedLength < 2 || expectedLength > CLASSIC_OUTLOOK_PIPE_MAX_RESPONSE_BYTES) {
          finish(new ClassicOutlookBridgeError(
            "CLASSIC_OUTLOOK_HOST_ACK_INVALID",
            "Classic Outlook response length is invalid",
          ));
          return;
        }
      }
      if (expectedLength == null || buffered.byteLength < expectedLength + 4) return;
      try {
        const parsed = JSON.parse(buffered.subarray(4, 4 + expectedLength).toString("utf8"));
        finish(null, safeResponse(parsed, { binding, attachment }));
      } catch (error) {
        finish(error instanceof ClassicOutlookBridgeError
          ? error
          : new ClassicOutlookBridgeError(
            "CLASSIC_OUTLOOK_HOST_ACK_INVALID",
            "Classic Outlook response is not valid JSON",
          ));
      }
    };
    socket.setTimeout?.(timeoutMs);
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
    socket.once("timeout", onTimeout);
  });
}

export function createClassicOutlookPipeTransport({
  connectImpl = createConnection,
  timeoutMs = 2 * 60 * 1000,
} = {}) {
  return Object.freeze({
    async attach({ binding, attachmentName, exactVersion, bytes }) {
      const attachment = normalizedAttachment({
        attachmentName,
        exactVersion: normalizedExactVersion(exactVersion),
        bytes,
      });
      const frame = encodeClassicOutlookPipeFrame({
        binding,
        attachmentName: attachment.attachmentName,
        exactVersion: attachment.exactVersion,
        bytes: attachment.bytes,
      });
      const socket = connectImpl(`\\\\.\\pipe\\amic-os-vault-${binding.pipeToken}`);
      await new Promise((resolve, reject) => {
        const onError = () => reject(new ClassicOutlookBridgeError(
          "CLASSIC_OUTLOOK_PIPE_FAILED",
          "Classic Outlook pipe connection failed",
        ));
        socket.once("error", onError);
        socket.once("connect", () => {
          socket.removeListener("error", onError);
          resolve();
        });
      });
      const response = readPipeResponse(socket, { binding, attachment, timeoutMs });
      socket.write(frame);
      return response;
    },
  });
}

export function createClassicOutlookBridgeController({
  now = Date.now,
  platform = process.platform,
  transport = createClassicOutlookPipeTransport(),
  createClaimId = randomUUID,
  maxPendingRequests = 16,
} = {}) {
  const requests = new Map();
  let disposed = false;

  function purgeExpired() {
    const at = now();
    for (const [handle, entry] of requests) {
      if (entry.binding.expiresAt <= at) requests.delete(handle);
    }
  }

  function activeEntry(requestHandle) {
    if (disposed) fail("CLASSIC_OUTLOOK_BRIDGE_DISPOSED", "Classic Outlook bridge is unavailable");
    purgeExpired();
    if (!SAFE_REQUEST_HANDLE.test(String(requestHandle ?? ""))) {
      fail("CLASSIC_OUTLOOK_REQUEST_INVALID", "Classic Outlook request handle is invalid");
    }
    const entry = requests.get(requestHandle);
    if (!entry) fail("CLASSIC_OUTLOOK_REQUEST_UNAVAILABLE", "Classic Outlook request is unavailable or expired");
    return entry;
  }

  return Object.freeze({
    acceptArgv(argv = []) {
      if (!containsAttachMarker(argv)) return null;
      const binding = parseClassicOutlookAttachInvocation(argv, { now, platform });
      purgeExpired();
      if (requests.has(binding.requestHandle)) return publicRequest(binding);
      if (requests.size >= maxPendingRequests) {
        fail("CLASSIC_OUTLOOK_REQUEST_LIMIT_REACHED", "Too many Classic Outlook attachment requests are pending");
      }
      requests.set(binding.requestHandle, { binding, claimId: null });
      return publicRequest(binding);
    },
    pendingRequests() {
      purgeExpired();
      return Object.freeze([...requests.values()].map(({ binding }) => publicRequest(binding)));
    },
    claimRequest(requestHandle) {
      const entry = activeEntry(requestHandle);
      if (entry.claimId) fail("CLASSIC_OUTLOOK_REQUEST_IN_FLIGHT", "Classic Outlook request is already in progress");
      const claimId = createClaimId();
      entry.claimId = claimId;
      return Object.freeze({ ...entry.binding, claimId });
    },
    releaseClaim(claim, { consume = false } = {}) {
      const entry = requests.get(claim?.requestHandle);
      if (!entry || entry.claimId !== claim?.claimId) return false;
      if (consume) requests.delete(claim.requestHandle);
      else entry.claimId = null;
      return true;
    },
    async deliverClaim(claim, { attachmentName, exactVersion, bytes } = {}) {
      const entry = activeEntry(claim?.requestHandle);
      if (!entry.claimId || entry.claimId !== claim?.claimId) {
        fail("CLASSIC_OUTLOOK_CLAIM_INVALID", "Classic Outlook request claim is invalid");
      }
      try {
        return await transport.attach({
          binding: entry.binding,
          attachmentName,
          exactVersion,
          bytes,
        });
      } finally {
        requests.delete(claim.requestHandle);
      }
    },
    status() {
      purgeExpired();
      return Object.freeze({
        available: !disposed && platform === "win32",
        pendingRequestCount: requests.size,
        rawPathIncluded: false,
        rawBytesIncluded: false,
        tokenMaterialReturned: false,
      });
    },
    dispose() {
      disposed = true;
      requests.clear();
    },
  });
}
