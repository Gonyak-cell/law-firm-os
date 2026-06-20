export function applyPrivilegeLabel({ repository, document, label, actor_id } = {}) {
  const record = repository.upsert({
    model_type: "DmsPrivilegeLabel",
    tenant_id: document.tenant_id,
    matter_id: document.matter_id,
    label_id: label.label_id,
    document_id: document.document_id,
    privilege_class: label.privilege_class ?? "privileged",
    confidentiality: label.confidentiality ?? "confidential",
    applied_by: actor_id,
  });
  repository.update(
    { tenant_id: document.tenant_id, model_type: "DmsDocument", document_id: document.document_id },
    { privilege_label_id: record.label_id, privileged: true, confidentiality: record.confidentiality },
  );
  return record;
}

export function filterPrivilegedForSearch({ documents = [], includePrivileged = false } = {}) {
  return Object.freeze(documents.filter((document) => includePrivileged || document.privileged !== true));
}
