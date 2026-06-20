export const HRX_STORE_PORT_VERSION = "law-firm-os.hrx-store-port.v0.1";

export const HRX_STORE_REQUIRED_METHODS = Object.freeze(["query", "transaction", "migrate", "close"]);

export const HRX_DURABLE_CORE_TABLES = Object.freeze([
  "hrx_employees",
  "hrx_employment_profiles",
  "hrx_employee_user_links",
]);

export const HRX_DURABLE_WORKFLOW_TABLES = Object.freeze([
  "hrx_documents",
  "hrx_leave_balance_entries",
  "hrx_leave_requests",
  "hrx_audit_events",
  "hrx_ai_review_items",
  "hrx_ai_source_chunks",
  "hrx_analytics_snapshots",
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

export function assertHrxStoreReadyForWorkflowRuntime(store) {
  assertHrxStoreReadyForCoreRuntime(store);
  for (const table of HRX_DURABLE_WORKFLOW_TABLES) {
    if (!store.capabilities?.tables?.includes(table)) {
      throw new TypeError(`HRX store missing durable table: ${table}`);
    }
  }
  return true;
}
