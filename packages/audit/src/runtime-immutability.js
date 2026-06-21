export function assertRuntimeAuditImmutable(event = {}) {
  if (!Object.isFrozen(event)) throw new Error("runtime audit event must be immutable");
  if (!event.event_hash || event.hash_algorithm !== "sha256") throw new Error("runtime audit event must keep sha256 hash");
  return true;
}

export function denyRuntimeAuditMutation() {
  throw new Error("runtime audit events are append-only; use correction events");
}
