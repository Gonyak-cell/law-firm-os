import { evaluatePermission } from "../../../../packages/authz/src/index.js";

export function simulatePermissionReadOnly({ principal, resource, action, rules = [], objectAcl = [] } = {}) {
  const decision = evaluatePermission({ principal, resource, action, rules, objectAcl });
  return Object.freeze({
    decision,
    read_only: true,
    writes_product_state: false,
    production_ready_claim: false,
  });
}
