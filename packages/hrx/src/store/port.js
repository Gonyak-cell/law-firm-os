export const HRX_STORE_PORT_VERSION = "law-firm-os.hrx-store-port.v0.1";

export const HRX_STORE_REQUIRED_METHODS = Object.freeze(["query", "transaction", "migrate", "close"]);

export const HRX_DURABLE_CORE_TABLES = Object.freeze([
  "hrx_employees",
  "hrx_employment_profiles",
  "hrx_employee_user_links",
]);

export function assertHrxStorePort(store) {
  if (!store || typeof store !== "object") {
    throw new TypeError("HRX store port is required");
  }
  for (const method of HRX_STORE_REQUIRED_METHODS) {
    if (typeof store[method] !== "function") {
      throw new TypeError(`HRX store port missing method: ${method}`);
    }
  }
  return true;
}

export function assertHrxStoreReadyForCoreRuntime(store) {
  assertHrxStorePort(store);
  const capabilities = store.capabilities ?? {};
  if (capabilities.durable !== true) {
    throw new TypeError("HRX store must declare durable=true for core runtime");
  }
  for (const table of HRX_DURABLE_CORE_TABLES) {
    if (!capabilities.tables?.includes(table)) {
      throw new TypeError(`HRX store missing durable table: ${table}`);
    }
  }
  return true;
}
