import { createHash } from "node:crypto";

export const RUNTIME_ID_PREFIXES = Object.freeze({
  tenant: "ten",
  client: "cli",
  matter: "mat",
  employee: "emp",
  document: "doc",
  auditEvent: "aud",
  idempotency: "idem",
  outbox: "out",
  runtimeRecord: "rec"
});

export function createStableRuntimeId({ type, tenantId, seed } = {}) {
  const prefix = RUNTIME_ID_PREFIXES[type];
  if (!prefix) throw new TypeError(`unknown runtime id type: ${type}`);
  if (typeof tenantId !== "string" || tenantId.trim() === "") throw new TypeError("tenantId is required");
  if (typeof seed !== "string" || seed.trim() === "") throw new TypeError("stable id seed is required");
  const digest = createHash("sha256").update(`${type}:${tenantId}:${seed}`).digest("hex").slice(0, 20);
  return `${prefix}_${digest}`;
}

export function assertStableRuntimeId(value, type) {
  const prefix = RUNTIME_ID_PREFIXES[type];
  if (!prefix) throw new TypeError(`unknown runtime id type: ${type}`);
  if (typeof value !== "string" || !value.startsWith(`${prefix}_`)) {
    throw new TypeError(`runtime id must use ${prefix}_ prefix`);
  }
  return true;
}
