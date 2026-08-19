import { createHash, sign } from "node:crypto";

export const ACTIVATION_NOW = Date.parse("2026-08-16T12:00:00.000Z");
export const ACTIVATION_NOW_ISO = new Date(ACTIVATION_NOW).toISOString();
export const OPERATOR_RECEIPT_EXPIRES_AT = "2026-08-16T12:05:00.000Z";

export function hash(bytes, algorithm = "sha256") {
  return createHash(algorithm).update(bytes).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

export function canonicalBytes(value) {
  return Buffer.from(`${JSON.stringify(canonical(value))}\n`);
}

export function publicKeySpki(pair) {
  return pair.publicKey.export({ type: "spki", format: "der" });
}

export function signedReceipt(item, receipt) {
  const operator_receipt_bytes = canonicalBytes(receipt);
  return {
    operator_receipt_bytes,
    operator_receipt_signature_bytes: sign(
      null,
      operator_receipt_bytes,
      item.keys.operator.privateKey,
    ),
  };
}

export function signedTicket(item, ticket) {
  const release_ticket_bytes = canonicalBytes(ticket);
  return {
    release_ticket_bytes,
    release_ticket_signature_bytes: sign(
      null,
      release_ticket_bytes,
      item.keys.release.privateKey,
    ),
  };
}
