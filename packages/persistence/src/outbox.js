import { createOutboxEvent } from "./schema.js";

export function appendOutboxEvent(connection, input = {}) {
  if (!connection || typeof connection.insert !== "function") {
    throw new TypeError("Runtime Spine persistence connection is required");
  }
  return connection.insert("runtime_outbox_events", createOutboxEvent(input));
}

export function listPendingOutboxEvents(connection, { tenant_id } = {}) {
  if (!connection || typeof connection.select !== "function") {
    throw new TypeError("Runtime Spine persistence connection is required");
  }
  if (typeof tenant_id !== "string" || tenant_id.trim() === "") {
    throw new TypeError("tenant_id is required for outbox reads");
  }
  return connection.select("runtime_outbox_events", { tenant_id, status: "pending" });
}
