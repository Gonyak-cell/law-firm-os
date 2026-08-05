import { createHash } from "node:crypto";
import {
  assertStagedStorageAdapter,
  sha256Hex,
} from "../../dms/src/storage/storage-adapter.js";
import {
  inquiryEmailEvidenceId,
  inquiryEvidenceFileObjectId,
  normalizeInquiryEmailEvidence,
  normalizeInquiryEvidenceFileObject,
} from "./inquiry-evidence-model.js";

export const INQUIRY_EVIDENCE_STORAGE_ERROR_CODES = Object.freeze({
  content_conflict: "INQUIRY_EVIDENCE_CONTENT_CONFLICT",
  governance_failed: "INQUIRY_EVIDENCE_GOVERNANCE_FAILED",
  hash_mismatch: "INQUIRY_EVIDENCE_HASH_MISMATCH",
  invalid_mime: "INQUIRY_EVIDENCE_MIME_INVALID",
  not_found: "INQUIRY_EVIDENCE_NOT_FOUND",
  quarantined: "INQUIRY_EVIDENCE_QUARANTINED",
  scanner_unavailable: "INQUIRY_EVIDENCE_SCANNER_UNAVAILABLE",
  storage_unavailable: "INQUIRY_EVIDENCE_STORAGE_UNAVAILABLE",
});

const DEFAULT_MAX_MIME_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_DISPLAY_BYTES = 2 * 1024 * 1024;
const DEFAULT_RETENTION_DAYS = 2_555;
const MAX_MIME_DEPTH = 12;
const MAX_MIME_PARTS = 1_000;

function serviceError(code, message, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: code,
    status,
  });
}

function requiredString(value, field, maxLength = 2048) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > maxLength) {
    throw new TypeError(`${field} is required`);
  }
  return text;
}

function validInstant(value, field) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new TypeError(`${field} must be a valid instant`);
  }
  return parsed.toISOString();
}

function timestamp(clock) {
  return validInstant(clock(), "clock");
}

function positiveInteger(value, fallback, field) {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
  return resolved;
}

function mimeBytes(value, maxBytes) {
  const bytes = Buffer.isBuffer(value)
    ? Buffer.from(value)
    : value instanceof Uint8Array
      ? Buffer.from(value)
      : null;
  if (!bytes || bytes.byteLength === 0 || bytes.byteLength > maxBytes) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.invalid_mime,
      "Inquiry email MIME is missing or exceeds the allowed size",
      400,
    );
  }
  if (bytes.includes(0)) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.invalid_mime,
      "Inquiry email MIME contains invalid bytes",
      400,
    );
  }
  return bytes;
}

function splitHeaderBody(bytes) {
  const crlf = bytes.indexOf(Buffer.from("\r\n\r\n"));
  const lf = crlf < 0 ? bytes.indexOf(Buffer.from("\n\n")) : -1;
  const index = crlf >= 0 ? crlf : lf;
  const separatorLength = crlf >= 0 ? 4 : 2;
  if (index < 1 || index > 256 * 1024) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.invalid_mime,
      "Inquiry email MIME headers are invalid",
      400,
    );
  }
  return {
    headerText: bytes.subarray(0, index).toString("latin1"),
    body: bytes.subarray(index + separatorLength),
  };
}

function parseHeaders(headerText) {
  const unfolded = headerText
    .replace(/\r?\n[ \t]+/gu, " ")
    .split(/\r?\n/gu);
  if (unfolded.length > 2_000) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.invalid_mime,
      "Inquiry email MIME has too many headers",
      400,
    );
  }
  const headers = new Map();
  for (const line of unfolded) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (!/^[a-z0-9-]+$/u.test(name)) continue;
    headers.set(
      name,
      headers.has(name) ? `${headers.get(name)}, ${value}` : value,
    );
  }
  return headers;
}

function headerParameter(value, name) {
  if (typeof value !== "string") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const extended = value.match(
    new RegExp(`(?:^|;)\\s*${escaped}\\*\\s*=\\s*(?:UTF-8'')?([^;]+)`, "iu"),
  );
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim().replace(/^"|"$/gu, ""));
    } catch {}
  }
  const match = value.match(
    new RegExp(`(?:^|;)\\s*${escaped}\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))`, "iu"),
  );
  return (match?.[1] ?? match?.[2] ?? "").trim() || null;
}

function contentType(headers) {
  const raw = headers.get("content-type") ?? "text/plain; charset=us-ascii";
  const mediaType = raw.split(";", 1)[0].trim().toLowerCase();
  return Object.freeze({
    media_type: /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/u.test(mediaType)
      ? mediaType
      : "application/octet-stream",
    boundary: headerParameter(raw, "boundary"),
    charset: headerParameter(raw, "charset"),
    name: headerParameter(raw, "name"),
  });
}

function decodeHeaderWord(value) {
  if (typeof value !== "string") return "";
  return value.replace(
    /=\?([^?]+)\?([bq])\?([^?]*)\?=/giu,
    (_, charset, encoding, encoded) => {
      try {
        const bytes = encoding.toLowerCase() === "b"
          ? Buffer.from(encoded, "base64")
          : Buffer.from(
            encoded
              .replace(/_/gu, " ")
              .replace(/=([a-f0-9]{2})/giu, (match, hex) =>
                String.fromCharCode(Number.parseInt(hex, 16))),
            "latin1",
          );
        return decodeText(bytes, charset);
      } catch {
        return "";
      }
    },
  );
}

function safeFileName(value, fallback) {
  const decoded = decodeHeaderWord(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f/\\]/gu, "_")
    .replace(/\s+/gu, " ")
    .trim();
  return (decoded || fallback).slice(0, 255);
}

function decodeTransfer(body, encoding) {
  const transfer = String(encoding ?? "7bit").trim().toLowerCase();
  if (transfer === "base64") {
    const encoded = body.toString("latin1").replace(/\s+/gu, "");
    if (
      encoded.length % 4 === 1
      || !/^[a-z0-9+/]*={0,2}$/iu.test(encoded)
    ) {
      throw serviceError(
        INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.invalid_mime,
        "Inquiry email MIME contains invalid base64",
        400,
      );
    }
    return Buffer.from(encoded, "base64");
  }
  if (transfer === "quoted-printable") {
    const decoded = body
      .toString("latin1")
      .replace(/=\r?\n/gu, "")
      .replace(/=([a-f0-9]{2})/giu, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16)));
    return Buffer.from(decoded, "latin1");
  }
  if (["7bit", "8bit", "binary", ""].includes(transfer)) {
    return Buffer.from(body);
  }
  throw serviceError(
    INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.invalid_mime,
    "Inquiry email MIME transfer encoding is not supported",
    400,
  );
}

function decodeText(bytes, charset = "utf-8") {
  const aliases = new Map([
    ["utf8", "utf-8"],
    ["us-ascii", "windows-1252"],
    ["ascii", "windows-1252"],
    ["ks_c_5601-1987", "euc-kr"],
    ["ks_c_5601-1989", "euc-kr"],
  ]);
  const normalized = String(charset || "utf-8")
    .trim()
    .toLowerCase();
  const encoding = aliases.get(normalized) ?? normalized;
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
}

function decodeHtmlEntities(value) {
  const named = new Map([
    ["amp", "&"],
    ["lt", "<"],
    ["gt", ">"],
    ["quot", "\""],
    ["apos", "'"],
    ["nbsp", " "],
  ]);
  return value.replace(
    /&(?:#(\d+)|#x([a-f0-9]+)|([a-z]+));/giu,
    (match, decimal, hexadecimal, name) => {
      const point = decimal
        ? Number.parseInt(decimal, 10)
        : hexadecimal
          ? Number.parseInt(hexadecimal, 16)
          : null;
      if (
        point !== null
        && Number.isSafeInteger(point)
        && point >= 0
        && point <= 0x10ffff
        && !(point >= 0xd800 && point <= 0xdfff)
      ) {
        return String.fromCodePoint(point);
      }
      return named.get(String(name ?? "").toLowerCase()) ?? match;
    },
  );
}

function htmlToPlainText(value) {
  const withoutActiveContent = value
    .replace(
      /<(script|style|noscript|template|svg|math|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1\s*>/giu,
      " ",
    )
    .replace(
      /<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/giu,
      "\n",
    )
    .replace(/<[^>]*>/gu, " ");
  return decodeHtmlEntities(withoutActiveContent)
    .replace(/[<>]/gu, (character) => character === "<" ? "‹" : "›");
}

function normalizeDisplayText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\r\n?/gu, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, "")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{4,}/gu, "\n\n\n")
    .trim();
}

function truncateUtf8(value, maxBytes) {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.byteLength <= maxBytes) return value;
  return new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, maxBytes))
    .replace(/\uFFFD$/u, "")
    .trimEnd();
}

function splitMultipart(body, boundary) {
  const safeBoundary = requiredString(boundary, "MIME boundary", 200);
  if (/[\u0000-\u001f\u007f]/u.test(safeBoundary)) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.invalid_mime,
      "Inquiry email MIME boundary is invalid",
      400,
    );
  }
  const marker = `--${safeBoundary}`;
  const closing = `${marker}--`;
  const lines = body.toString("latin1").split(/\r?\n/gu);
  const parts = [];
  let current = null;
  for (const line of lines) {
    if (line === marker || line === closing) {
      if (current) {
        parts.push(Buffer.from(current.join("\r\n"), "latin1"));
      }
      current = line === closing ? null : [];
      if (line === closing) break;
      continue;
    }
    if (current) current.push(line);
  }
  return parts;
}

function attachmentId({ index, file_name, mime_type, byte_size }) {
  return `attachment_${createHash("sha256")
    .update(JSON.stringify({ index, file_name, mime_type, byte_size }))
    .digest("hex")
    .slice(0, 24)}`;
}

function collectMimeParts(bytes, state, depth = 0) {
  if (depth > MAX_MIME_DEPTH || state.part_count >= MAX_MIME_PARTS) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.invalid_mime,
      "Inquiry email MIME nesting exceeds the allowed limit",
      400,
    );
  }
  state.part_count += 1;
  const { headerText, body } = splitHeaderBody(bytes);
  const headers = parseHeaders(headerText);
  const type = contentType(headers);
  if (type.media_type.startsWith("multipart/")) {
    if (!type.boundary) {
      throw serviceError(
        INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.invalid_mime,
        "Multipart inquiry email is missing its boundary",
        400,
      );
    }
    for (const part of splitMultipart(body, type.boundary)) {
      collectMimeParts(part, state, depth + 1);
    }
    return;
  }

  const decoded = decodeTransfer(
    body,
    headers.get("content-transfer-encoding"),
  );
  const disposition = headers.get("content-disposition") ?? "";
  const dispositionType = disposition.split(";", 1)[0]
    .trim()
    .toLowerCase();
  const fileName = headerParameter(disposition, "filename")
    ?? type.name;
  const attachment =
    dispositionType === "attachment"
    || Boolean(fileName)
    || !type.media_type.startsWith("text/");
  if (attachment) {
    const manifest = {
      file_name: safeFileName(
        fileName,
        `첨부파일-${state.attachments.length + 1}`,
      ),
      byte_size: decoded.byteLength,
      mime_type: type.media_type,
    };
    state.attachments.push(Object.freeze({
      attachment_id: attachmentId({
        index: state.attachments.length,
        ...manifest,
      }),
      ...manifest,
      sha256: sha256Hex(decoded),
    }));
    return;
  }
  if (type.media_type === "text/plain") {
    const bounded = decoded.subarray(
      0,
      state.max_text_source_bytes,
    );
    state.plain.push(normalizeDisplayText(
      decodeText(bounded, type.charset),
    ));
  } else if (type.media_type === "text/html") {
    const bounded = decoded.subarray(
      0,
      state.max_text_source_bytes,
    );
    state.html.push(normalizeDisplayText(
      htmlToPlainText(decodeText(bounded, type.charset)),
    ));
  }
}

function addressLabel(value) {
  const address = requiredString(value?.address, "email address", 320)
    .toLowerCase();
  const displayName =
    typeof value?.display_name === "string"
    && value.display_name.trim()
      ? value.display_name.trim().slice(0, 200)
      : null;
  return displayName ? `${displayName} <${address}>` : address;
}

export function createSafeInquiryDisplayCopy({
  mime_bytes,
  message_metadata,
  max_display_bytes = DEFAULT_MAX_DISPLAY_BYTES,
} = {}) {
  const maxDisplayBytes = positiveInteger(
    max_display_bytes,
    DEFAULT_MAX_DISPLAY_BYTES,
    "max_display_bytes",
  );
  const state = {
    part_count: 0,
    plain: [],
    html: [],
    attachments: [],
    max_text_source_bytes: Math.min(
      maxDisplayBytes * 4,
      8 * 1024 * 1024,
    ),
  };
  collectMimeParts(mime_bytes, state);
  const body = state.plain.find(Boolean)
    ?? state.html.find(Boolean)
    ?? "표시할 본문이 없습니다.";
  const recipients = Array.isArray(message_metadata?.recipients)
    ? message_metadata.recipients
    : [];
  const header = [
    `제목: ${String(message_metadata?.subject ?? "").trim()}`,
    `보낸 사람: ${addressLabel(message_metadata?.sender)}`,
    `받는 사람: ${recipients.map(addressLabel).join(", ") || "-"}`,
    `받은 시각: ${validInstant(
      message_metadata?.received_at,
      "received_at",
    )}`,
  ].join("\n");
  const text = truncateUtf8(
    normalizeDisplayText(`${header}\n\n${body}`),
    maxDisplayBytes,
  );
  const bytes = Buffer.from(text, "utf8");
  return Object.freeze({
    bytes,
    text,
    mime_type: "text/plain; charset=utf-8",
    sha256: sha256Hex(bytes),
    byte_size: bytes.byteLength,
    attachment_manifest: Object.freeze(state.attachments),
    active_content_preserved: false,
    external_resources_loaded: false,
  });
}

function assertRepository(repository) {
  for (const method of [
    "create",
    "get",
    "list",
    "recordIdempotency",
    "getIdempotency",
    "appendAudit",
    "transaction",
  ]) {
    if (typeof repository?.[method] !== "function") {
      throw new TypeError("Email DMS repository is required");
    }
  }
}

function assertScanner(scanner) {
  if (typeof scanner?.scan !== "function") {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.scanner_unavailable,
      "Inquiry email malware scanning is not configured",
      503,
    );
  }
}

async function scanBytes(scanner, input) {
  let result;
  try {
    result = await scanner.scan(input);
  } catch {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.scanner_unavailable,
      "Inquiry email malware scanning failed",
      503,
    );
  }
  const status = result?.status;
  if (!["clean", "quarantined", "failed"].includes(status)) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.scanner_unavailable,
      "Inquiry email malware scanner returned an invalid result",
      503,
    );
  }
  return status;
}

function safeReceipt(receipt) {
  return Object.freeze({
    sha256: receipt.sha256,
    byte_size: receipt.byte_size,
    mime_type: receipt.mime_type,
    raw_path_exposed: false,
    bytes_exposed: false,
  });
}

function assertReceipt(receipt, expectedSha256, expectedSize) {
  if (
    receipt?.sha256 !== expectedSha256
    || Number(receipt?.byte_size) !== expectedSize
    || typeof receipt?.storage_pointer_ref !== "string"
    || !receipt.storage_pointer_ref.startsWith("vault://")
  ) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.hash_mismatch,
      "Stored inquiry email evidence did not pass digest verification",
      502,
    );
  }
}

function evidenceReference(tenantId, evidenceId) {
  return {
    tenant_id: tenantId,
    model_type: "InquiryEmailEvidence",
    inquiry_email_evidence_id: evidenceId,
  };
}

function fileReference(tenantId, fileObjectId) {
  return {
    tenant_id: tenantId,
    model_type: "InquiryEvidenceFileObject",
    inquiry_evidence_file_object_id: fileObjectId,
  };
}

function existingCapture(repository, tenantId, evidenceId, mimeSha256) {
  const evidence = repository.get(
    evidenceReference(tenantId, evidenceId),
  );
  if (!evidence) return null;
  if (
    evidence.mime_sha256
    && evidence.mime_sha256 !== mimeSha256
  ) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.content_conflict,
      "The same inquiry email identity has different MIME content",
    );
  }
  const fileObjects = repository.list({
    tenant_id: tenantId,
    model_type: "InquiryEvidenceFileObject",
    inquiry_email_evidence_id: evidenceId,
  });
  const original = fileObjects.find(
    (item) => item.object_kind === "original_mime",
  );
  const display = fileObjects.find(
    (item) => item.object_kind === "sanitized_display",
  );
  if (
    !original
    || original.inquiry_evidence_file_object_id
      !== evidence.mime_file_object_id
    || original.sha256 !== evidence.mime_sha256
    || (
      evidence.capture_status !== "failed"
      && (
        !display
        || display.inquiry_evidence_file_object_id
          !== evidence.display_file_object_id
      )
    )
  ) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.hash_mismatch,
      "Stored inquiry evidence records do not reconcile",
      502,
    );
  }
  return Object.freeze({
    outcome:
      evidence.capture_status === "failed"
        ? "quarantined"
        : "idempotent_replay",
    evidence,
    file_objects: Object.freeze(fileObjects),
    idempotent_replay: true,
    raw_content_included: false,
    production_ready_claim: false,
  });
}

function governanceDeadline(capturedAt, retentionDays) {
  return new Date(
    Date.parse(capturedAt) + retentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
}

async function applyProviderGovernance({
  storage,
  tenantId,
  objectIds,
  retainUntil,
  legalHoldState,
}) {
  if (storage.capabilities.provider_retention !== true) {
    return Object.freeze({
      provider_retention_applied: false,
      provider_legal_hold_applied: false,
      release_blocked: true,
    });
  }
  if (
    typeof storage.setObjectRetention !== "function"
    || (
      legalHoldState === "held"
      && typeof storage.setObjectLegalHold !== "function"
    )
  ) {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.governance_failed,
      "Inquiry evidence storage governance is not configured",
      503,
    );
  }
  try {
    for (const objectId of objectIds) {
      await storage.setObjectRetention({
        tenant_id: tenantId,
        object_id: objectId,
        retain_until: retainUntil,
        mode: "GOVERNANCE",
      });
      if (legalHoldState === "held") {
        await storage.setObjectLegalHold({
          tenant_id: tenantId,
          object_id: objectId,
          status: "ON",
        });
      }
    }
  } catch {
    throw serviceError(
      INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.governance_failed,
      "Inquiry evidence retention or legal hold could not be applied",
      503,
    );
  }
  return Object.freeze({
    provider_retention_applied: true,
    provider_legal_hold_applied: legalHoldState === "held",
    release_blocked: false,
  });
}

async function cleanupStaged(storage, tenantId, sessionId, objectIds) {
  for (const objectId of objectIds) {
    try {
      await storage.deleteOrphan({
        tenant_id: tenantId,
        session_id: sessionId,
        object_id: objectId,
      });
    } catch {}
  }
}

function storageSessionId(idempotencyKey) {
  return `inquiry-evidence:${createHash("sha256")
    .update(idempotencyKey)
    .digest("hex")}`;
}

function auditId(prefix, value) {
  return `${prefix}:${createHash("sha256")
    .update(value)
    .digest("hex")}`;
}

function safeMessageMetadata(input) {
  const metadata = input.message_metadata ?? input;
  return Object.freeze({
    graph_immutable_message_id:
      input.graph_immutable_message_id
      ?? input.immutable_message_id,
    internet_message_id:
      input.internet_message_id
      ?? metadata.internet_message_id,
    conversation_id: metadata.conversation_id ?? null,
    subject: metadata.subject ?? "",
    sender: metadata.sender,
    recipients: metadata.recipients ?? [],
    received_at: metadata.received_at,
  });
}

export function createInquiryEvidenceStorageService({
  repository,
  storage,
  scanner,
  retention_policy_id = "retention_inquiry_email_7y",
  retention_policy_ref = retention_policy_id,
  retention_days = DEFAULT_RETENTION_DAYS,
  kms_key_ref,
  clock = () => new Date(),
  max_mime_bytes = DEFAULT_MAX_MIME_BYTES,
  max_display_bytes = DEFAULT_MAX_DISPLAY_BYTES,
} = {}) {
  assertRepository(repository);
  let stagedStorage;
  try {
    stagedStorage = assertStagedStorageAdapter(storage);
  } catch {
    stagedStorage = null;
  }
  const maxMimeBytes = positiveInteger(
    max_mime_bytes,
    DEFAULT_MAX_MIME_BYTES,
    "max_mime_bytes",
  );
  const maxDisplayBytes = positiveInteger(
    max_display_bytes,
    DEFAULT_MAX_DISPLAY_BYTES,
    "max_display_bytes",
  );
  const retentionDays = positiveInteger(
    retention_days,
    DEFAULT_RETENTION_DAYS,
    "retention_days",
  );

  async function storeMessageEvidence(input = {}) {
    if (!stagedStorage) {
      throw serviceError(
        INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.storage_unavailable,
        "Inquiry evidence storage is not configured",
        503,
      );
    }
    assertScanner(scanner);
    const tenantId = requiredString(input.tenant_id, "tenant_id");
    const actorId = requiredString(
      input.captured_by ?? input.actor_id,
      "captured_by",
    );
    const mailboxAddress = requiredString(
      input.mailbox_address,
      "mailbox_address",
      320,
    );
    const metadata = safeMessageMetadata(input);
    const evidenceId = inquiryEmailEvidenceId({
      tenant_id: tenantId,
      mailbox_address: mailboxAddress,
      internet_message_id: metadata.internet_message_id,
      graph_immutable_message_id:
        metadata.graph_immutable_message_id,
    });
    const originalId = inquiryEvidenceFileObjectId({
      tenant_id: tenantId,
      inquiry_email_evidence_id: evidenceId,
      object_kind: "original_mime",
    });
    const displayId = inquiryEvidenceFileObjectId({
      tenant_id: tenantId,
      inquiry_email_evidence_id: evidenceId,
      object_kind: "sanitized_display",
    });
    const bytes = mimeBytes(input.mime_bytes, maxMimeBytes);
    const originalSha256 = sha256Hex(bytes);
    const replay = existingCapture(
      repository,
      tenantId,
      evidenceId,
      originalSha256,
    );
    if (replay) return replay;

    const idempotencyKey = requiredString(
      input.idempotency_key ?? `capture:${evidenceId}`,
      "idempotency_key",
    );
    const prior = repository.getIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
    });
    if (prior) {
      if (
        prior.response?.inquiry_email_evidence_id !== evidenceId
        || prior.response?.mime_sha256 !== originalSha256
      ) {
        throw serviceError(
          INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.content_conflict,
          "Inquiry evidence request key was already used for other content",
        );
      }
      const replayed = existingCapture(
        repository,
        tenantId,
        evidenceId,
        originalSha256,
      );
      if (!replayed) {
        throw serviceError(
          INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.hash_mismatch,
          "Inquiry evidence replay record is incomplete",
          502,
        );
      }
      return replayed;
    }

    const capturedAt = timestamp(clock);
    const legalHoldState = input.legal_hold_state ?? "none";
    if (!["none", "held"].includes(legalHoldState)) {
      throw new TypeError("legal_hold_state is invalid");
    }
    const policyId = requiredString(
      input.retention_policy_id ?? retention_policy_id,
      "retention_policy_id",
    );
    const policyRef = requiredString(
      input.retention_policy_ref ?? retention_policy_ref,
      "retention_policy_ref",
    );
    const kmsKeyRef = requiredString(
      input.kms_key_ref ?? kms_key_ref,
      "kms_key_ref",
      1024,
    );
    if (
      stagedStorage.provider === "s3"
      && stagedStorage.kms_key_ref !== kmsKeyRef
    ) {
      throw serviceError(
        INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.storage_unavailable,
        "Inquiry evidence S3 storage is not bound to the configured KMS key",
        503,
      );
    }
    const sessionId = storageSessionId(idempotencyKey);
    const stagedIds = [];
    let originalReceipt;
    try {
      originalReceipt = await stagedStorage.stageObject({
        tenant_id: tenantId,
        session_id: sessionId,
        object_id: originalId,
        bytes,
        content_type: "message/rfc822",
        expected_sha256: originalSha256,
      });
      stagedIds.push(originalId);
      if (
        originalReceipt.sha256 !== originalSha256
        || Number(originalReceipt.byte_size) !== bytes.byteLength
      ) {
        throw serviceError(
          INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.hash_mismatch,
          "Staged inquiry email MIME failed digest verification",
          502,
        );
      }
      const originalScanStatus = await scanBytes(scanner, {
        bytes,
        content_type: "message/rfc822",
        object_kind: "original_mime",
      });
      if (originalScanStatus === "quarantined") {
        const committed = await stagedStorage.finalizeObject({
          tenant_id: tenantId,
          session_id: sessionId,
          object_id: originalId,
        });
        assertReceipt(committed, originalSha256, bytes.byteLength);
        const retainUntil = governanceDeadline(
          capturedAt,
          retentionDays,
        );
        const governance = await applyProviderGovernance({
          storage: stagedStorage,
          tenantId,
          objectIds: [originalId],
          retainUntil,
          legalHoldState,
        });
        const evidence = normalizeInquiryEmailEvidence({
          model_type: "InquiryEmailEvidence",
          inquiry_email_evidence_id: evidenceId,
          tenant_id: tenantId,
          mailbox_address: mailboxAddress,
          lead_id: null,
          ...metadata,
          mime_file_object_id: originalId,
          mime_sha256: originalSha256,
          mime_byte_size: bytes.byteLength,
          display_file_object_id: null,
          attachment_manifest: [],
          capture_status: "failed",
          retention_policy_ref: policyRef,
          legal_hold_state: legalHoldState,
          captured_by: actorId,
          captured_at: capturedAt,
        });
        const original = normalizeInquiryEvidenceFileObject({
          model_type: "InquiryEvidenceFileObject",
          inquiry_evidence_file_object_id: originalId,
          tenant_id: tenantId,
          inquiry_email_evidence_id: evidenceId,
          object_kind: "original_mime",
          storage_pointer_ref: committed.storage_pointer_ref,
          sha256: committed.sha256,
          byte_size: Number(committed.byte_size),
          mime_type: "message/rfc822",
          scan_status: "quarantined",
          retention_policy_id: policyId,
          legal_hold_state: legalHoldState,
          kms_key_ref: kmsKeyRef,
          created_by: actorId,
          created_at: capturedAt,
        });
        repository.transaction((tx) => {
          tx.create(evidence);
          tx.create(original);
          tx.recordIdempotency({
            tenant_id: tenantId,
            idempotency_key: idempotencyKey,
            operation: "capture_inquiry_email_evidence",
            response: {
              inquiry_email_evidence_id: evidenceId,
              mime_sha256: originalSha256,
              outcome: "quarantined",
            },
            created_at: capturedAt,
          });
          tx.appendAudit({
            tenant_id: tenantId,
            event_id: auditId(
              "inquiry.evidence.quarantined",
              idempotencyKey,
            ),
            event_type: "inquiry.email_evidence.quarantined",
            actor_id: actorId,
            object_type: "InquiryEmailEvidence",
            object_id: evidenceId,
            payload: {
              mime_sha256: originalSha256,
              mime_byte_size: bytes.byteLength,
              scan_status: "quarantined",
              provider_retention_applied:
                governance.provider_retention_applied,
              raw_content_included: false,
            },
            created_at: capturedAt,
          });
        });
        return Object.freeze({
          outcome: "quarantined",
          evidence,
          file_objects: Object.freeze([original]),
          storage_receipts: Object.freeze({
            original: safeReceipt(committed),
            display: null,
          }),
          governance,
          idempotent_replay: false,
          raw_content_included: false,
          production_ready_claim: false,
        });
      }
      if (originalScanStatus !== "clean") {
        throw serviceError(
          INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.scanner_unavailable,
          "Inquiry email malware scan did not complete",
          503,
        );
      }

      const display = createSafeInquiryDisplayCopy({
        mime_bytes: bytes,
        message_metadata: metadata,
        max_display_bytes: maxDisplayBytes,
      });
      const displayScanStatus = await scanBytes(scanner, {
        bytes: display.bytes,
        content_type: display.mime_type,
        object_kind: "sanitized_display",
      });
      if (displayScanStatus !== "clean") {
        throw serviceError(
          INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.scanner_unavailable,
          "Inquiry email display copy scan did not complete",
          503,
        );
      }
      const stagedDisplay = await stagedStorage.stageObject({
        tenant_id: tenantId,
        session_id: sessionId,
        object_id: displayId,
        bytes: display.bytes,
        content_type: display.mime_type,
        expected_sha256: display.sha256,
      });
      stagedIds.push(displayId);
      if (
        stagedDisplay.sha256 !== display.sha256
        || Number(stagedDisplay.byte_size) !== display.byte_size
      ) {
        throw serviceError(
          INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.hash_mismatch,
          "Staged inquiry display copy failed digest verification",
          502,
        );
      }

      const committedOriginal = await stagedStorage.finalizeObject({
        tenant_id: tenantId,
        session_id: sessionId,
        object_id: originalId,
      });
      const committedDisplay = await stagedStorage.finalizeObject({
        tenant_id: tenantId,
        session_id: sessionId,
        object_id: displayId,
      });
      assertReceipt(
        committedOriginal,
        originalSha256,
        bytes.byteLength,
      );
      assertReceipt(
        committedDisplay,
        display.sha256,
        display.byte_size,
      );
      const originalDigest = await stagedStorage.digestObject({
        tenant_id: tenantId,
        object_id: originalId,
      });
      const displayDigest = await stagedStorage.digestObject({
        tenant_id: tenantId,
        object_id: displayId,
      });
      if (
        originalDigest?.sha256 !== originalSha256
        || Number(originalDigest?.byte_size) !== bytes.byteLength
        || displayDigest?.sha256 !== display.sha256
        || Number(displayDigest?.byte_size) !== display.byte_size
      ) {
        throw serviceError(
          INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.hash_mismatch,
          "Committed inquiry evidence failed independent digest readback",
          502,
        );
      }
      const retainUntil = governanceDeadline(
        capturedAt,
        retentionDays,
      );
      const governance = await applyProviderGovernance({
        storage: stagedStorage,
        tenantId,
        objectIds: [originalId, displayId],
        retainUntil,
        legalHoldState,
      });
      const originalFileObject = normalizeInquiryEvidenceFileObject({
        model_type: "InquiryEvidenceFileObject",
        inquiry_evidence_file_object_id: originalId,
        tenant_id: tenantId,
        inquiry_email_evidence_id: evidenceId,
        object_kind: "original_mime",
        storage_pointer_ref: committedOriginal.storage_pointer_ref,
        sha256: originalSha256,
        byte_size: bytes.byteLength,
        mime_type: "message/rfc822",
        scan_status: "clean",
        retention_policy_id: policyId,
        legal_hold_state: legalHoldState,
        kms_key_ref: kmsKeyRef,
        created_by: actorId,
        created_at: capturedAt,
      });
      const displayFileObject = normalizeInquiryEvidenceFileObject({
        model_type: "InquiryEvidenceFileObject",
        inquiry_evidence_file_object_id: displayId,
        tenant_id: tenantId,
        inquiry_email_evidence_id: evidenceId,
        object_kind: "sanitized_display",
        storage_pointer_ref: committedDisplay.storage_pointer_ref,
        sha256: display.sha256,
        byte_size: display.byte_size,
        mime_type: display.mime_type,
        scan_status: "clean",
        retention_policy_id: policyId,
        legal_hold_state: legalHoldState,
        kms_key_ref: kmsKeyRef,
        created_by: actorId,
        created_at: capturedAt,
      });
      const evidence = normalizeInquiryEmailEvidence({
        model_type: "InquiryEmailEvidence",
        inquiry_email_evidence_id: evidenceId,
        tenant_id: tenantId,
        mailbox_address: mailboxAddress,
        lead_id: null,
        ...metadata,
        mime_file_object_id: originalId,
        mime_sha256: originalSha256,
        mime_byte_size: bytes.byteLength,
        display_file_object_id: displayId,
        attachment_manifest: display.attachment_manifest,
        capture_status: "pending_link",
        retention_policy_ref: policyRef,
        legal_hold_state: legalHoldState,
        captured_by: actorId,
        captured_at: capturedAt,
      });
      repository.transaction((tx) => {
        tx.create(evidence);
        tx.create(originalFileObject);
        tx.create(displayFileObject);
        tx.recordIdempotency({
          tenant_id: tenantId,
          idempotency_key: idempotencyKey,
          operation: "capture_inquiry_email_evidence",
          response: {
            inquiry_email_evidence_id: evidenceId,
            mime_sha256: originalSha256,
            outcome: "stored",
          },
          created_at: capturedAt,
        });
        tx.appendAudit({
          tenant_id: tenantId,
          event_id: auditId(
            "inquiry.evidence.stored",
            idempotencyKey,
          ),
          event_type: "inquiry.email_evidence.stored",
          actor_id: actorId,
          object_type: "InquiryEmailEvidence",
          object_id: evidenceId,
          payload: {
            mime_sha256: originalSha256,
            mime_byte_size: bytes.byteLength,
            display_sha256: display.sha256,
            display_byte_size: display.byte_size,
            attachment_count: display.attachment_manifest.length,
            provider_retention_applied:
              governance.provider_retention_applied,
            provider_legal_hold_applied:
              governance.provider_legal_hold_applied,
            raw_content_included: false,
          },
          created_at: capturedAt,
        });
      });
      return Object.freeze({
        outcome: "stored",
        evidence,
        file_objects: Object.freeze([
          originalFileObject,
          displayFileObject,
        ]),
        storage_receipts: Object.freeze({
          original: safeReceipt(committedOriginal),
          display: safeReceipt(committedDisplay),
        }),
        governance,
        idempotent_replay: false,
        raw_content_included: false,
        production_ready_claim: false,
      });
    } catch (error) {
      await cleanupStaged(
        stagedStorage,
        tenantId,
        sessionId,
        stagedIds,
      );
      throw error;
    }
  }

  async function readEvidenceContent(input = {}) {
    if (!stagedStorage) {
      throw serviceError(
        INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.storage_unavailable,
        "Inquiry evidence storage is not configured",
        503,
      );
    }
    const tenantId = requiredString(input.tenant_id, "tenant_id");
    const actorId = requiredString(input.actor_id, "actor_id");
    const evidenceId = requiredString(
      input.inquiry_email_evidence_id,
      "inquiry_email_evidence_id",
    );
    const objectKind =
      input.object_kind === "original_mime"
        ? "original_mime"
        : input.object_kind === "sanitized_display"
          ? "sanitized_display"
          : null;
    if (!objectKind) {
      throw new TypeError("object_kind is invalid");
    }
    const evidence = repository.get(
      evidenceReference(tenantId, evidenceId),
    );
    if (!evidence) {
      throw serviceError(
        INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.not_found,
        "Inquiry email evidence was not found",
        404,
      );
    }
    const fileObjectId = objectKind === "original_mime"
      ? evidence.mime_file_object_id
      : evidence.display_file_object_id;
    const fileObject = fileObjectId
      ? repository.get(fileReference(tenantId, fileObjectId))
      : null;
    if (!fileObject) {
      throw serviceError(
        INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.not_found,
        "Inquiry email evidence content was not found",
        404,
      );
    }
    if (fileObject.scan_status !== "clean") {
      throw serviceError(
        INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.quarantined,
        "Inquiry email evidence is quarantined and cannot be opened",
        423,
      );
    }
    const stored = await stagedStorage.getObject({
      tenant_id: tenantId,
      object_id: fileObjectId,
    });
    const bytes = Buffer.from(stored.bytes);
    const digest = sha256Hex(bytes);
    if (
      digest !== fileObject.sha256
      || bytes.byteLength !== fileObject.byte_size
    ) {
      throw serviceError(
        INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.hash_mismatch,
        "Inquiry evidence changed after storage",
        502,
      );
    }
    const readAt = timestamp(clock);
    const requestId = requiredString(
      input.request_id,
      "request_id",
    );
    const audit = repository.appendAudit({
      tenant_id: tenantId,
      event_id: auditId(
        "inquiry.evidence.sensitive-read",
        `${requestId}:${actorId}:${evidenceId}:${objectKind}`,
      ),
      event_type: "inquiry.email_evidence.sensitive_read",
      actor_id: actorId,
      object_type: "InquiryEmailEvidence",
      object_id: evidenceId,
      payload: {
        object_kind: objectKind,
        content_sha256: digest,
        content_byte_size: bytes.byteLength,
        permission_decision_ref: sha256Hex(
          Buffer.from(requestId),
        ),
        raw_content_included: false,
      },
      created_at: readAt,
    });
    return Object.freeze({
      inquiry_email_evidence_id: evidenceId,
      object_kind: objectKind,
      bytes,
      sha256: digest,
      byte_size: bytes.byteLength,
      mime_type: fileObject.mime_type,
      scan_status: "clean",
      audit_event_id: audit.event_id,
      raw_path_exposed: false,
      storage_pointer_ref_included: false,
      production_ready_claim: false,
    });
  }

  return Object.freeze({
    storeMessageEvidence,
    readEvidenceContent,
    automatic_mailbox_scan_enabled: false,
    general_delete_enabled: false,
    raw_path_exposed: false,
    production_ready_claim: false,
  });
}
