export function createRetentionPolicy(input = {}) {
  if (!input.retention_policy_id) throw new TypeError("retention_policy_id is required");
  if (!Number.isInteger(input.retain_until_epoch_ms)) throw new TypeError("retain_until_epoch_ms is required");
  return Object.freeze({
    model_type: "DmsRetentionPolicy",
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    retention_policy_id: input.retention_policy_id,
    document_id: input.document_id,
    retain_until_epoch_ms: input.retain_until_epoch_ms,
    disposition: input.disposition ?? "review_before_delete",
  });
}

export function assertRetentionAllowsDelete({ policy, nowEpochMs = Date.now() } = {}) {
  if (policy && nowEpochMs < policy.retain_until_epoch_ms) throw new Error("retention guard blocks delete");
  return true;
}
