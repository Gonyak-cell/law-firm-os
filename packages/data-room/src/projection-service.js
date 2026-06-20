export function createDataRoomDocumentProjection({ tenant_id, matter_id, data_room_id, source_document_refs = [] } = {}) {
  if (!tenant_id || !matter_id || !data_room_id) throw new TypeError('tenant_id, matter_id, and data_room_id are required');
  return Object.freeze({
    model_type: 'DataRoomProjection',
    tenant_id,
    matter_id,
    data_room_id,
    source_document_refs: Object.freeze(source_document_refs.map((ref) => Object.freeze({ ...ref }))),
    projection_only: true,
    document_bytes_included: false,
    internal_memo_excluded: true,
  });
}
