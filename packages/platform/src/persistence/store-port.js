export const PLATFORM_PERSISTENCE_PORT_VERSION = "law-firm-os.platform-persistence-port.v0.1";

export const PLATFORM_PERSISTENCE_REQUIRED_METHODS = Object.freeze(["query", "transaction", "migrate", "close"]);

function requireText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function assertRuntimePersistenceStore(store, { bounded_context: boundedContext = "runtime", requiredTables = [] } = {}) {
  requireText(boundedContext, "bounded_context");
  if (!store || typeof store !== "object" || store instanceof Map) {
    throw new TypeError(`${boundedContext} runtime requires a durable persistence store object`);
  }
  for (const method of PLATFORM_PERSISTENCE_REQUIRED_METHODS) {
    if (typeof store[method] !== "function") {
      throw new TypeError(`${boundedContext} persistence store missing method: ${method}`);
    }
  }
  const capabilities = store.capabilities ?? {};
  if (capabilities.durable !== true) throw new TypeError(`${boundedContext} persistence store must declare durable=true`);
  if (capabilities.migrations !== true) throw new TypeError(`${boundedContext} persistence store must support migrations`);
  if (capabilities.transactions !== true) throw new TypeError(`${boundedContext} persistence store must support transactions`);
  for (const table of requiredTables) {
    if (!capabilities.tables?.includes(table)) {
      throw new TypeError(`${boundedContext} persistence store missing table: ${table}`);
    }
  }
  return true;
}

export function createRuntimePersistenceDescriptor({ store, bounded_context: boundedContext, requiredTables = [] } = {}) {
  assertRuntimePersistenceStore(store, { bounded_context: boundedContext, requiredTables });
  return Object.freeze({
    port_version: PLATFORM_PERSISTENCE_PORT_VERSION,
    bounded_context: boundedContext,
    store_kind: store.kind ?? "unknown",
    durable: true,
    migrations: true,
    transactions: true,
    required_tables: Object.freeze([...requiredTables]),
  });
}
