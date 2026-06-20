import { createDmsFileObject } from "./model.js";

export function createFileObjectRecord(input = {}) {
  const record = createDmsFileObject({
    ...input,
    storage_pointer_ref: input.storage_pointer_ref,
    sha256: input.sha256,
    byte_size: input.byte_size,
    mime_type: input.mime_type,
  });
  return Object.freeze({
    ...record,
    raw_path_exposed: false,
    bytes_included: false,
  });
}

export function serializeFileObjectSafe(fileObject = {}) {
  const { storage_pointer_ref: _storagePointerRef, raw_path: _rawPath, local_path: _localPath, ...safe } = fileObject;
  return Object.freeze({
    ...safe,
    storage_pointer_ref_included: false,
    raw_path_exposed: false,
    bytes_included: false,
  });
}
