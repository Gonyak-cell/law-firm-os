export function checkoutDocument({ repository, tenant_id, document_id, actor_id, now = new Date().toISOString() } = {}) {
  const existing = repository
    .list({ tenant_id, model_type: "DmsLock", document_id })
    .find((lock) => lock.status === "checked_out");
  if (existing && existing.actor_id !== actor_id) throw new Error("Document is already checked out by another editor");
  const lock = {
    model_type: "DmsLock",
    tenant_id,
    matter_id: "lock",
    lock_id: `lock:${document_id}`,
    document_id,
    actor_id,
    status: "checked_out",
    checked_out_at: now,
  };
  return repository.upsert(lock);
}

export function checkinDocument({ repository, tenant_id, document_id, actor_id } = {}) {
  const lock = repository.get({ tenant_id, model_type: "DmsLock", lock_id: `lock:${document_id}` });
  if (!lock || lock.actor_id !== actor_id) throw new Error("Document check-in requires current editor");
  return repository.update({ tenant_id, model_type: "DmsLock", lock_id: lock.lock_id }, { status: "checked_in" });
}
