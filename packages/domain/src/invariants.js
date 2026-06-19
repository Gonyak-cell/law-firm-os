export function assertSameTenant(...records) {
  const tenantIds = records.filter(Boolean).map((record) => record.tenant_id);
  if (new Set(tenantIds).size > 1) {
    throw new Error("Cross-tenant relationship is forbidden");
  }
  return true;
}

export function assertMatterBelongsToClient(matter, client) {
  assertSameTenant(matter, client);
  if (matter.client_id !== client.client_id) {
    throw new Error("Matter client_id must reference the canonical Client");
  }
  return true;
}

export function assertDocumentReferenceIsMatterTraced(documentReference, matter) {
  assertSameTenant(documentReference, matter);
  if (!documentReference.dms_owned) {
    throw new Error("DocumentReference must remain DMS-owned");
  }
  if (documentReference.matter_id !== matter.matter_id) {
    throw new Error("DocumentReference must be traceable to Matter");
  }
  return true;
}
