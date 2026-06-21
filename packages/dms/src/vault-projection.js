export function createSafeVaultProjection({ documents = [] } = {}) {
  return Object.freeze({
    items: Object.freeze(documents.map((document) => Object.freeze({
      document_id: document.document_id,
      matter_id: document.matter_id,
      title: document.title,
      status: document.status,
      privilege_label_id: document.privilege_label_id ?? null,
      legal_hold_id: document.legal_hold_id ?? null,
      raw_storage_path_included: false,
      document_bytes_included: false,
    }))),
    omitted_denied_count: null,
    count_leak_prevented: true,
  });
}
