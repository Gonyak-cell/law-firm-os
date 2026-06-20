import { createHash } from "node:crypto";

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

export function hashHrxAuditEvent(event) {
  return createHash("sha256").update(stableStringify(event)).digest("hex");
}

export function attachHrxAuditHash({ event, previousHash = null } = {}) {
  if (!event || typeof event !== "object") throw new TypeError("event is required");
  const hashInput = { ...event, previous_hash: previousHash };
  return Object.freeze({
    ...event,
    previous_hash: previousHash,
    event_hash: hashHrxAuditEvent(hashInput),
  });
}

export function verifyHrxAuditHashChain(events = []) {
  let previousHash = null;
  for (const event of events) {
    const expected = attachHrxAuditHash({
      event: Object.fromEntries(Object.entries(event).filter(([key]) => key !== "previous_hash" && key !== "event_hash")),
      previousHash,
    });
    if (event.previous_hash !== previousHash || event.event_hash !== expected.event_hash) return false;
    previousHash = event.event_hash;
  }
  return true;
}
