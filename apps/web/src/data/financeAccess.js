export const HOME_FINANCE_SECTION_SCOPES = Object.freeze({
  "home-finance-overview": Object.freeze(["analytics.finance.read"]),
  "home-finance-monthly": Object.freeze(["analytics.finance.read"]),
  "home-finance-clients": Object.freeze(["analytics.finance.read"]),
  "home-finance-cashflow": Object.freeze(["finance.bank.read"]),
  "home-finance-time": Object.freeze(["finance.time.write"]),
  "home-finance-expenses": Object.freeze(["finance.expense.write"]),
  "home-finance-billing": Object.freeze(["finance.billing.write", "finance.payment.write", "finance.export"]),
  "home-finance-ar": Object.freeze(["analytics.finance.read"]),
});

function collectScopeArrays(record, arrays, visited) {
  if (!record || typeof record !== "object" || visited.has(record)) return;
  visited.add(record);
  if (Array.isArray(record.scopes)) arrays.push(record.scopes);
  for (const key of ["session", "principal", "account", "user", "tenant_membership"]) {
    collectScopeArrays(record[key], arrays, visited);
  }
}

function hasSystemFinancePrivilege(record, visited = new Set()) {
  if (!record || typeof record !== "object" || visited.has(record)) return false;
  visited.add(record);
  if (record.highest_privilege === true) return true;
  if (Array.isArray(record.role_ids) && record.role_ids.includes("system_super_admin")) return true;
  return ["session", "principal", "account", "user", "tenant_membership"]
    .some((key) => hasSystemFinancePrivilege(record[key], visited));
}

export function explicitFinanceScopes(records = []) {
  const arrays = [];
  const visited = new Set();
  for (const record of records) collectScopeArrays(record, arrays, visited);
  if (arrays.length === 0) return null;
  return new Set(arrays.flat().filter((scope) => typeof scope === "string"));
}

export function canAccessFinanceScope(records = [], requiredScopes = []) {
  if (records.some((record) => hasSystemFinancePrivilege(record))) return true;
  const scopes = explicitFinanceScopes(records);
  if (scopes === null) return true;
  return requiredScopes.some((scope) => scopes.has(scope));
}

export function canAccessHomeFinanceSection(records = [], section) {
  return canAccessFinanceScope(records, HOME_FINANCE_SECTION_SCOPES[section] ?? []);
}
