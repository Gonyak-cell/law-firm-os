import { classifyAuditAction } from "./runtime-taxonomy.js";

export const REQUIRED_RUNTIME_AUDIT_CATEGORIES = Object.freeze(["read", "write", "permission", "export"]);

export function scanRuntimeRouteAuditCoverage(routes = []) {
  const covered = new Set();
  const missing = [];
  for (const route of routes) {
    if (route.audit_required !== true) {
      missing.push({ route: route.route, reason: "audit_required_false" });
      continue;
    }
    if (!route.audit_action) {
      missing.push({ route: route.route, reason: "audit_action_missing" });
      continue;
    }
    covered.add(classifyAuditAction(route.audit_action));
  }
  const missingCategories = REQUIRED_RUNTIME_AUDIT_CATEGORIES.filter((category) => !covered.has(category));
  return Object.freeze({
    ok: missing.length === 0 && missingCategories.length === 0,
    covered_categories: Object.freeze([...covered].sort()),
    missing: Object.freeze(missing),
    missing_categories: Object.freeze(missingCategories)
  });
}
