export function closeMatter({ repository, matter, blockers = [], actor_id, audit } = {}) {
  if (!actor_id) throw new TypeError("actor_id is required");
  const activeBlockers = blockers.filter((blocker) => blocker.status !== "resolved");
  if (activeBlockers.length > 0) {
    return Object.freeze({
      outcome: "blocked",
      safe_error_code: "MATTER_CLOSE_BLOCKERS_PRESENT",
      blocker_count: activeBlockers.length,
    });
  }
  const closed = repository.update(
    { tenant_id: matter.tenant_id, model_type: "Matter", matter_id: matter.matter_id },
    { status: "closed", closed_at: new Date().toISOString() },
  );
  audit?.append?.({
    tenant_id: closed.tenant_id,
    actor_id,
    action: "matter.close",
    object_type: "Matter",
    object_id: closed.matter_id,
    decision: "allow",
    reason: "matter_closed_no_blockers",
  });
  return Object.freeze({ outcome: "closed", matter: closed });
}
