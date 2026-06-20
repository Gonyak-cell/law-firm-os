export function serializeConflictMemo({ memo, principal = {}, object_acl = [] } = {}) {
  const allowed =
    object_acl.some(
      (entry) =>
        entry.resource_id === memo?.conflict_memo_id &&
        entry.principal_id === principal.user_id &&
        entry.effect === "allow",
    ) || principal.role_ids?.includes("conflict_reviewer");
  if (!allowed) {
    return Object.freeze({
      conflict_memo_id: memo?.conflict_memo_id ?? null,
      visible: false,
      body_included: false,
      count_leak_prevented: true,
      production_ready_claim: false,
    });
  }
  return Object.freeze({
    conflict_memo_id: memo.conflict_memo_id,
    tenant_id: memo.tenant_id,
    conflict_check_id: memo.conflict_check_id,
    summary: memo.summary,
    visible: true,
    body_included: true,
    body: memo.body,
    production_ready_claim: false,
  });
}
