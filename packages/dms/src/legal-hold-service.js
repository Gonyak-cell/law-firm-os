export function applyLegalHold({ repository, document, hold_id, actor_id, reason } = {}) {
  const hold = repository.upsert({
    model_type: "DmsLegalHold",
    tenant_id: document.tenant_id,
    matter_id: document.matter_id,
    legal_hold_id: hold_id,
    document_id: document.document_id,
    actor_id,
    reason,
    status: "active",
  });
  repository.update(
    { tenant_id: document.tenant_id, model_type: "DmsDocument", document_id: document.document_id },
    { legal_hold_id: hold.legal_hold_id, status: "held" },
  );
  return hold;
}

export function assertCanDeleteHeldObject({ repository, tenant_id, document_id } = {}) {
  const hold = repository
    .list({ tenant_id, model_type: "DmsLegalHold" })
    .find((item) => item.document_id === document_id && item.status === "active");
  if (hold) throw new Error("held object delete blocked");
  return true;
}
