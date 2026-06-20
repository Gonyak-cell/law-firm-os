import { canMutateHrxObjectUnderLegalHold } from "./legal-hold.js";
import { canPurgeHrxRecord, createHrxRetentionPolicy } from "./retention.js";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function matchingPolicy(record, policies) {
  return policies.find((policy) => policy.tenant_id === record.tenant_id && policy.object_type === record.object_type);
}

export function runHrxRetentionJob({ tenant_id, records = [], policies = [], legal_holds = [], as_of } = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const asOf = requiredString({ as_of }, "as_of");
  const normalizedPolicies = policies.map(createHrxRetentionPolicy);
  return Object.freeze({
    tenant_id: tenantId,
    as_of: asOf,
    decisions: Object.freeze(
      records
        .filter((record) => record.tenant_id === tenantId)
        .map((record) => {
          const policy = matchingPolicy(record, normalizedPolicies);
          if (!policy) {
            return Object.freeze({
              object_type: record.object_type,
              object_id: record.object_id,
              allowed: false,
              reason: "retention_policy_missing",
            });
          }
          const recordLegalHolds = legal_holds.filter(
            (hold) =>
              hold.tenant_id === tenantId &&
              hold.object_type === record.object_type &&
              hold.object_id === record.object_id,
          );
          const purgeDecision = canPurgeHrxRecord({ policy, legal_holds: recordLegalHolds, as_of: asOf });
          const mutationDecision = canMutateHrxObjectUnderLegalHold({
            tenant_id: tenantId,
            object_type: record.object_type,
            object_id: record.object_id,
            mutation: "purge",
            legal_holds: recordLegalHolds,
          });
          const allowed = purgeDecision.allowed === true && mutationDecision.allowed === true;
          return Object.freeze({
            object_type: record.object_type,
            object_id: record.object_id,
            policy_id: policy.policy_id,
            allowed,
            reason: allowed ? "purge_allowed" : mutationDecision.allowed === false ? mutationDecision.reason : purgeDecision.reason,
            hold_id: mutationDecision.hold_id ?? purgeDecision.hold_id ?? null,
          });
        }),
    ),
  });
}
