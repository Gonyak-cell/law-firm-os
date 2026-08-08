function durableRows(state) {
  const document = state?.document;
  const version = state?.versions?.find((entry) => entry.version_id === document?.current_version_id)
    ?? state?.version;
  const fileObject = state?.file_objects?.find((entry) => entry.file_object_id === version?.file_object_id)
    ?? state?.file_object;
  return { document, version, fileObject };
}

export function assertProviderIntegrityState(state) {
  const { document, version, fileObject } = durableRows(state);
  const integrity = state?.provider_integrity;
  const fileMime = fileObject?.mime_type ?? fileObject?.content_type;
  const providerMime = integrity?.mime_type ?? integrity?.content_type;
  if (
    !document
    || !version
    || !fileObject
    || !integrity
    || integrity.object_id !== fileObject.object_id
    || integrity.sha256 !== fileObject.sha256
    || !Number.isSafeInteger(fileObject.byte_size)
    || !Number.isSafeInteger(integrity.byte_size)
    || integrity.byte_size !== fileObject.byte_size
    || (providerMime !== undefined && providerMime !== fileMime)
  ) throw new Error("email filing provider object authority is missing or conflicts with durable metadata");
  return Object.freeze({ document, version, fileObject });
}

export function durableMimeRows(state) {
  return durableRows(state);
}
