import {
  createHash,
  timingSafeEqual,
  verify as verifySignature,
} from "node:crypto";

import { assertStrictUtcTimestamp } from "../../runtime-auth/src/external-release-trust.js";
import { OUTLOOK_DESKTOP_RELEASE_ARTIFACT_MAX_BYTES } from "./outlook-desktop-release-artifact-snapshot.js";

export const OUTLOOK_DESKTOP_RELEASE_TICKET_SCHEMA =
  "law-firm-os.outlook-desktop-release-ticket.v1";
export const OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES = 16_384;

export const OUTLOOK_DESKTOP_RELEASE_TICKET_ERROR_CODES = Object.freeze({
  bytes: "RELEASE_TICKET_TOO_LARGE",
  canonical: "RELEASE_TICKET_CANONICAL_INVALID",
  expired: "RELEASE_TICKET_EXPIRED",
  json: "RELEASE_TICKET_JSON_INVALID",
  schema: "RELEASE_TICKET_SCHEMA_INVALID",
  scope: "RELEASE_TICKET_SCOPE_MISMATCH",
  signature: "RELEASE_TICKET_SIGNATURE_INVALID",
  signatureFormat: "RELEASE_TICKET_SIGNATURE_FORMAT",
  signerExpired: "RELEASE_TICKET_SIGNER_EXPIRED",
  signerInvalid: "RELEASE_TICKET_SIGNER_INVALID",
  signerRevoked: "RELEASE_TICKET_SIGNER_REVOKED",
  signerUnknown: "RELEASE_TICKET_SIGNER_UNKNOWN",
  time: "RELEASE_TICKET_TIME_INVALID",
});

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const ENTRA_TENANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const APPLY = Reflect.apply;
const TYPED_ARRAY_BYTE_LENGTH = Object.getOwnPropertyDescriptor(
  Object.getPrototypeOf(Uint8Array.prototype),
  "byteLength",
).get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;
const TICKET_KEYS = Object.freeze([
  "app_id", "approval_sha256", "arch", "build_manifest_sha256", "channel",
  "entra_tenant_id", "expires_at", "inner_artifact_bytes", "inner_artifact_sha256",
  "issued_at", "key_id", "lawos_tenant_id", "operation", "pilot_id", "platform",
  "receipt_source", "receipt_type", "role", "schema_version", "source_sha",
  "source_tree", "ticket_id", "version",
]);

function time(value, field, codes, fail) {
  try {
    assertStrictUtcTimestamp(value, field);
    return Date.parse(value);
  } catch {
    fail(codes.time, `${field} must be a canonical RFC 3339 UTC timestamp`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function snapshotOutlookDesktopBytes(value, {
  code,
  fail,
  maxBytes,
  message,
  minBytes = 1,
}) {
  let byteLength;
  try {
    if (Buffer.isBuffer(value)) byteLength = APPLY(TYPED_ARRAY_BYTE_LENGTH, value, []);
  } catch {
    byteLength = undefined;
  }
  if (!Number.isSafeInteger(byteLength) || byteLength < minBytes || byteLength > maxBytes) {
    fail(code, message);
  }
  const ownedBytes = Buffer.alloc(byteLength);
  try {
    APPLY(UINT8_ARRAY_SET, ownedBytes, [value]);
  } catch {
    fail(code, message);
  }
  return ownedBytes;
}

function snapshotTicketBytes(ticketBytes, codes, fail) {
  return snapshotOutlookDesktopBytes(ticketBytes, {
    code: codes.bytes,
    fail,
    maxBytes: OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES,
    message: `release ticket must contain 1-${OUTLOOK_DESKTOP_RELEASE_TICKET_MAX_BYTES} bytes`,
  });
}

function requireScope(key, ticket, codes, fail) {
  const scopes = [
    ["allowed_receipt_sources", ticket.receipt_source],
    ["allowed_receipt_types", ticket.receipt_type],
    ["allowed_pilot_ids", ticket.pilot_id],
    ["allowed_lawos_tenant_ids", ticket.lawos_tenant_id],
    ["allowed_entra_tenant_ids", ticket.entra_tenant_id],
    ["allowed_source_shas", ticket.source_sha],
    ["allowed_source_trees", ticket.source_tree],
    ["allowed_versions", ticket.version],
    ["allowed_roles", ticket.role],
    ["allowed_operations", ticket.operation],
    ["allowed_artifact_sha256s", ticket.inner_artifact_sha256],
    ["allowed_binding_sha256s", ticket.build_manifest_sha256],
  ];
  if (scopes.some(([field, value]) => !Array.isArray(key[field]) || !key[field].includes(value))) {
    fail(codes.scope, "trusted signer scope does not authorize the release ticket");
  }
}

function parseOwnedTicketBytes(ownedTicketBytes, codes, fail, now) {
  let ticket;
  try {
    ticket = JSON.parse(ownedTicketBytes.toString("utf8"));
  } catch {
    fail(codes.json, "release ticket must contain valid JSON");
  }
  if (ticket === null || typeof ticket !== "object" || Array.isArray(ticket)
      || Object.keys(ticket).sort().join("\0") !== [...TICKET_KEYS].sort().join("\0")) {
    fail(codes.schema, "release ticket fields do not match the closed schema");
  }
  if (TICKET_KEYS.some((key) => key === "inner_artifact_bytes"
    ? !Number.isSafeInteger(ticket[key])
    : typeof ticket[key] !== "string")) {
    fail(codes.schema, "release ticket fields must use their closed scalar types");
  }
  const canonical = Object.fromEntries([...TICKET_KEYS].sort().map((key) => [key, ticket[key]]));
  const canonicalBytes = Buffer.from(`${JSON.stringify(canonical)}\n`);
  if (ownedTicketBytes.length !== canonicalBytes.length
      || !timingSafeEqual(ownedTicketBytes, canonicalBytes)) {
    fail(codes.canonical, "release ticket bytes are not canonical JSON");
  }
  if (ticket.schema_version !== OUTLOOK_DESKTOP_RELEASE_TICKET_SCHEMA
      || !IDENTIFIER.test(ticket.ticket_id) || !IDENTIFIER.test(ticket.key_id)
      || !IDENTIFIER.test(ticket.lawos_tenant_id) || !ENTRA_TENANT.test(ticket.entra_tenant_id)
      || ticket.receipt_source !== "law-firm-os.desktop-release"
      || ticket.receipt_type !== "outlook-desktop-release-ticket"
      || ticket.pilot_id !== "amic-os-outlook" || ticket.role !== "desktop-release-approver"
      || ticket.operation !== "approve-outlook-desktop-release"
      || ticket.lawos_tenant_id === ticket.entra_tenant_id || ticket.channel !== "formal"
      || ticket.app_id !== "com.amic.matter.desktop" || !VERSION.test(ticket.version)
      || !["darwin", "win32"].includes(ticket.platform)
      || !(ticket.platform === "darwin" ? ["arm64", "x64"].includes(ticket.arch) : ticket.arch === "x64")
      || !SHA1.test(ticket.source_sha) || !SHA1.test(ticket.source_tree)
      || !SHA256.test(ticket.build_manifest_sha256) || !SHA256.test(ticket.inner_artifact_sha256)
      || !SHA256.test(ticket.approval_sha256) || ticket.inner_artifact_bytes < 1
      || ticket.inner_artifact_bytes > OUTLOOK_DESKTOP_RELEASE_ARTIFACT_MAX_BYTES) {
    fail(codes.schema, "release ticket identity or digest fields are invalid");
  }
  for (const field of ["receipt_source", "receipt_type", "pilot_id", "role", "operation"]) {
    if (!IDENTIFIER.test(ticket[field])) fail(codes.schema, `release ticket ${field} is invalid`);
  }
  const issuedAt = time(ticket.issued_at, "issued_at", codes, fail);
  const expiresAt = time(ticket.expires_at, "expires_at", codes, fail);
  if (issuedAt > now || expiresAt <= issuedAt || expiresAt <= now) {
    fail(codes.expired, "release ticket is not currently valid");
  }
  return { expiresAt, issuedAt, ticket: Object.freeze(ticket) };
}

export function parseOutlookDesktopReleaseTicket({
  codes = OUTLOOK_DESKTOP_RELEASE_TICKET_ERROR_CODES,
  fail,
  now,
  ticketBytes,
}) {
  return parseOwnedTicketBytes(snapshotTicketBytes(ticketBytes, codes, fail), codes, fail, now);
}

export function verifyOutlookDesktopReleaseTicket({
  codes = OUTLOOK_DESKTOP_RELEASE_TICKET_ERROR_CODES,
  fail,
  now,
  registryTrust,
  signatureBytes,
  ticketBytes,
  ...unsupported
}) {
  if (Object.keys(unsupported).length !== 0) {
    fail(codes.schema, "release ticket verification input has unsupported fields");
  }
  const ownedTicketBytes = snapshotTicketBytes(ticketBytes, codes, fail);
  const ownedSignatureBytes = snapshotOutlookDesktopBytes(signatureBytes, {
    code: codes.signatureFormat,
    fail,
    maxBytes: 64,
    message: "release ticket signature must contain exactly 64 raw Ed25519 bytes",
    minBytes: 64,
  });
  const resolved = parseOwnedTicketBytes(ownedTicketBytes, codes, fail, now);
  const key = registryTrust?.registry?.keys?.find(
    ({ key_id: keyId }) => keyId === resolved.ticket.key_id,
  );
  if (!key) fail(codes.signerUnknown, "release ticket signer is not present in the production trust registry");
  if (key.algorithm !== "Ed25519") fail(codes.signerInvalid, "release ticket signer must use Ed25519");
  if (key.revoked_at != null) fail(codes.signerRevoked, "release ticket signer is revoked");
  const validFrom = time(key.valid_from, "key.valid_from", codes, fail);
  const validUntil = time(key.valid_until, "key.valid_until", codes, fail);
  if (now < validFrom || now >= validUntil
      || resolved.issuedAt < validFrom || resolved.issuedAt >= validUntil) {
    fail(codes.signerExpired, "release ticket signer is outside its validity interval");
  }
  requireScope(key, resolved.ticket, codes, fail);
  let signatureValid = false;
  try {
    signatureValid = verifySignature(
      null,
      ownedTicketBytes,
      key.public_key_spki_pem,
      ownedSignatureBytes,
    );
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    fail(codes.signature, "release ticket signature is invalid");
  }
  return {
    ...resolved,
    key,
    signatureSha256: sha256(ownedSignatureBytes),
    ticketSha256: sha256(ownedTicketBytes),
  };
}
